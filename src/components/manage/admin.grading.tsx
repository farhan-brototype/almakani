import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useRealtime } from "@/hooks/use-realtime";
import { supabase, type Program } from "@/lib/supabase";

export type GradingScheme = {
  id: string;
  code: string;
  name: string;
  grade_count: number;
  grade_a_percent: number;
  grade_b_percent: number;
  grade_c_percent: number;
  grade_a_points: number;
  grade_b_points: number;
  grade_c_points: number;
  pos1_points: number;
  pos2_points: number;
  pos3_points: number;
};

type ProgramRow = Program & { grading_scheme_id: string | null };

const NUM = (v: string) => Math.max(0, Number(v) || 0);

const BLANK: Omit<GradingScheme, "id"> = {
  code: "",
  name: "",
  grade_count: 2,
  grade_a_percent: 80,
  grade_b_percent: 60,
  grade_c_percent: 40,
  grade_a_points: 5,
  grade_b_points: 3,
  grade_c_points: 1,
  pos1_points: 5,
  pos2_points: 3,
  pos3_points: 1,
};

/**
 * Grading schemes: an admin creates a named/coded grading system (how many
 * grades, their minimum percentages and points, plus position points) and then
 * attaches that code to any programme. A programme's results use its scheme.
 */
export function GradingSection() {
  const [schemes, setSchemes] = useState<GradingScheme[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Omit<GradingScheme, "id"> & { id?: string }>({ ...BLANK });
  const [programId, setProgramId] = useState("");
  const [schemeId, setSchemeId] = useState("");
  const [columns, setColumns] = useState("1");
  const [cfg, setCfg] = useState<Record<string, number>>({});
  const [attaching, setAttaching] = useState(false);
  const [attachPct, setAttachPct] = useState(0);
  const [attachNote, setAttachNote] = useState("");

  const load = useCallback(async () => {
    const [{ data: gs }, { data: p }, { data: pmc }] = await Promise.all([
      supabase.from("grading_schemes").select("*").order("code"),
      supabase.from("programs").select("*").order("code"),
      supabase.from("program_mark_config").select("program_id,columns"),
    ]);
    setSchemes((gs as GradingScheme[]) ?? []);
    setPrograms((p as ProgramRow[]) ?? []);
    const map: Record<string, number> = {};
    for (const row of (pmc as { program_id: string; columns: number }[]) ?? [])
      map[row.program_id] = row.columns;
    setCfg(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["grading_schemes", "programs", "program_mark_config"], () => void load());

  const patch = (v: Partial<GradingScheme>) => setDraft((old) => ({ ...old, ...v }));

  const saveScheme = async () => {
    const code = draft.code.trim();
    if (!code) {
      toast.error("Enter a grading code first.");
      return;
    }
    setSaving(true);
    const payload = {
      code,
      name: draft.name.trim() || code,
      grade_count: draft.grade_count,
      grade_a_percent: draft.grade_a_percent,
      grade_b_percent: draft.grade_b_percent,
      grade_c_percent: draft.grade_c_percent,
      grade_a_points: draft.grade_a_points,
      grade_b_points: draft.grade_b_points,
      grade_c_points: draft.grade_c_points,
      pos1_points: draft.pos1_points,
      pos2_points: draft.pos2_points,
      pos3_points: draft.pos3_points,
    };
    const { error } = draft.id
      ? await supabase.from("grading_schemes").update(payload).eq("id", draft.id)
      : await supabase.from("grading_schemes").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft({ ...BLANK });
    await load();
    await supabase.rpc("recalc_all_results");
    toast.success("Grading system saved and results recalculated.");
  };

  const removeScheme = async (id: string) => {
    const { error } = await supabase.from("grading_schemes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (draft.id === id) setDraft({ ...BLANK });
    await load();
    toast.success("Grading system deleted.");
  };

  const assign = async () => {
    if (!programId) {
      toast.error("Pick a programme first.");
      return;
    }
    setAttaching(true);
    setAttachPct(15);
    setAttachNote("Applying grading system…");
    try {
      const { error } = await supabase
        .from("programs")
        .update({ grading_scheme_id: schemeId || null })
        .eq("id", programId);
      if (error) throw new Error(error.message);
      setAttachPct(50);
      setAttachNote("Recalculating results…");
      const { error: rpcError } = await supabase.rpc("recalc_program_results", {
        p_program_id: programId,
      });
      if (rpcError) throw new Error(rpcError.message);
      setAttachPct(85);
      setAttachNote("Refreshing…");
      await load();
      setAttachPct(100);
      toast.success(schemeId ? "Grading system attached." : "Grading system removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply grading system");
    } finally {
      setAttaching(false);
      setAttachPct(0);
      setAttachNote("");
    }
  };

  const saveColumns = async () => {
    if (!programId) {
      toast.error("Pick a programme first.");
      return;
    }
    const n = Math.min(2, Math.max(1, Number(columns) || 1));
    const { error } = await supabase
      .from("program_mark_config")
      .upsert({ program_id: programId, columns: n }, { onConflict: "program_id" });
    if (error) {
      toast.error(error.message);
      return;
    }
    setCfg((old) => ({ ...old, [programId]: n }));
    toast.success("Mark columns updated.");
  };

  if (loading) {
    return (
      <section className="panel flex items-center gap-2 p-5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading grading systems…
      </section>
    );
  }

  const gradeRows = [
    { key: "A", pct: "grade_a_percent", pts: "grade_a_points" },
    { key: "B", pct: "grade_b_percent", pts: "grade_b_points" },
    { key: "C", pct: "grade_c_percent", pts: "grade_c_points" },
  ].slice(0, draft.grade_count) as {
    key: string;
    pct: keyof GradingScheme;
    pts: keyof GradingScheme;
  }[];

  const byId = new Map(schemes.map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      <section className="panel space-y-4 p-5">
        <div>
          <h2 className="font-display text-base font-semibold">Grading &amp; points</h2>
          <p className="text-xs text-muted-foreground">
            Build a grading system with a code, choose how many grades it uses, their minimum
            percentages and points, and the points for first, second and third place. Attach the
            code to a programme below — that programme is then scored with this system.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Grading code</Label>
            <Input
              value={draft.code}
              placeholder="e.g. G10"
              onChange={(e) => patch({ code: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={draft.name}
              placeholder="e.g. High value stage"
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Grades used</Label>
            <Select
              value={String(draft.grade_count)}
              onValueChange={(v) => patch({ grade_count: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No grade</SelectItem>
                <SelectItem value="1">A only</SelectItem>
                <SelectItem value="2">A and B</SelectItem>
                <SelectItem value="3">A, B and C</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gradeRows.map((g) => (
            <div key={g.key} className="rounded-xl border border-border p-3">
              <p className="mb-2 text-xs font-semibold">Grade {g.key}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">From %</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(draft[g.pct] ?? 0)}
                    onChange={(e) =>
                      patch({ [g.pct]: NUM(e.target.value) } as Partial<GradingScheme>)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Points</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(draft[g.pts] ?? 0)}
                    onChange={(e) =>
                      patch({ [g.pts]: NUM(e.target.value) } as Partial<GradingScheme>)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ["First place points", "pos1_points"],
            ["Second place points", "pos2_points"],
            ["Third place points", "pos3_points"],
          ] as [string, keyof GradingScheme][]).map(([label, key]) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <Input
                type="number"
                min={0}
                value={String(draft[key] ?? 0)}
                onChange={(e) => patch({ [key]: NUM(e.target.value) } as Partial<GradingScheme>)}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" disabled={saving} onClick={() => void saveScheme()}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : draft.id ? (
              <Save className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {draft.id ? "Update grading system" : "Add grading system"}
          </Button>
          {draft.id && (
            <Button variant="outline" onClick={() => setDraft({ ...BLANK })}>
              Cancel
            </Button>
          )}
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h3 className="text-sm font-semibold">Saved grading systems</h3>
        {schemes.length === 0 && (
          <p className="text-xs text-muted-foreground">No grading systems yet.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {schemes.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {s.code} · {s.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.grade_count === 0
                    ? "No grades"
                    : `${["A", "B", "C"].slice(0, s.grade_count).join(", ")} grades`}{" "}
                  · A {s.grade_a_percent}
                  %/{s.grade_a_points}p
                  {s.grade_count > 1 ? ` · B ${s.grade_b_percent}%/${s.grade_b_points}p` : ""}
                  {s.grade_count > 2 ? ` · C ${s.grade_c_percent}%/${s.grade_c_points}p` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Places: {s.pos1_points} / {s.pos2_points} / {s.pos3_points}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Programmes:{" "}
                  {programs
                    .filter((p) => p.grading_scheme_id === s.id)
                    .map((p) => p.code)
                    .join(", ") || "none"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" onClick={() => setDraft({ ...s })}>
                  Edit
                </Button>
                <Button size="icon" variant="ghost" onClick={() => void removeScheme(s.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h3 className="text-sm font-semibold">Attach to a programme</h3>
        <p className="text-xs text-muted-foreground">
          Pick a programme, choose its grading code, and set how many mark columns it is judged on.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1 space-y-1.5">
            <Label className="text-xs">Programme</Label>
            <Select
              value={programId}
              onValueChange={(v) => {
                setProgramId(v);
                setColumns(String(cfg[v] ?? 1));
                setSchemeId(programs.find((p) => p.id === v)?.grading_scheme_id ?? "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select programme" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-52 space-y-1.5">
            <Label className="text-xs">Grading code</Label>
            <Select value={schemeId} onValueChange={setSchemeId}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                {schemes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} · {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2" disabled={attaching} onClick={() => void assign()}>
            {attaching && <Loader2 className="size-4 animate-spin" />}
            {attaching ? "Applying…" : "Attach"}
          </Button>
          <div className="w-28 space-y-1.5">
            <Label className="text-xs">Mark columns</Label>
            <Select value={columns} onValueChange={setColumns}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" disabled={attaching} onClick={() => void saveColumns()}>
            Apply columns
          </Button>
        </div>
        {attaching && (
          <div className="flex items-center gap-2">
            <Progress value={attachPct} className="h-2 w-40" />
            <span className="text-xs tabular-nums text-muted-foreground">
              {attachNote || "Working…"}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {programs
            .filter((p) => p.grading_scheme_id)
            .map((p) => (
              <span key={p.id} className="rounded-full bg-muted px-3 py-1 text-xs">
                {p.code} → {byId.get(p.grading_scheme_id!)?.code ?? "—"}
              </span>
            ))}
        </div>
      </section>
    </div>
  );
}
