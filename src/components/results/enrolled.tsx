import { Loader2, Save, Search, SendHorizonal } from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  fetchEntries,
  fetchGroupTypes,
  isGroupProgram,
  positionText,
  type ResultEntry,
} from "@/lib/results";
import { interleaveByTeam, orderCandidates } from "@/lib/judge-order";
import { sortGroups, useResultFilters } from "./filters";
import { colorOf, useTeamColors } from "@/lib/team-colors";
import { supabase, type Program } from "@/lib/supabase";

type Candidate = {
  key: string;
  student_id: string | null;
  team_id: string | null;
  label: string;
  sub: string;
  mark1: string;
  mark2: string;
  manual: boolean;
  position: string;
  grade: string;
  entry?: ResultEntry;
};

export function EnrolledPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [groupTypes, setGroupTypes] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [programId, setProgramId] = useState("");
  const [columns, setColumns] = useState(1);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPrograms = useCallback(async () => {
    const [{ data: p }, gt] = await Promise.all([
      supabase.from("programs").select("*").order("code"),
      fetchGroupTypes(),
    ]);
    setPrograms((p as Program[]) ?? []);
    setGroupTypes(gt);
  }, []);

  useEffect(() => {
    void loadPrograms();
  }, [loadPrograms]);

  useRealtime(["programs", "category_items", "assignments"], () => void loadPrograms());

  const program = programs.find((p) => p.id === programId) ?? null;
  const grouped = program ? isGroupProgram(program, groupTypes) : false;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return programs
      .filter((p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, programs]);

  const loadProgram = async (id: string) => {
    setLoading(true);
    setProgramId(id);
    const picked = programs.find((p) => p.id === id);
    const isGroup = picked ? isGroupProgram(picked, groupTypes) : false;

    const loadAssigns = async () => {
      const withSlot = await supabase
        .from("assignments")
        .select("student_id, team_id, slot_index, students(adno,name), teams(name,short_name)")
        .eq("program_id", id);
      if (!withSlot.error) return withSlot;
      return await supabase
        .from("assignments")
        .select("student_id, team_id, students(adno,name), teams(name,short_name)")
        .eq("program_id", id);
    };

    const [{ data: assigns }, { data: cfg }, { data: existing }] = await Promise.all([
      loadAssigns(),
      supabase.from("program_mark_config").select("*").eq("program_id", id).maybeSingle(),
      supabase
        .from("result_entries")
        .select("*, students(adno,name,photo_url,class,category), teams(name,short_name)")
        .eq("program_id", id),
    ]);

    const cols = (cfg as { columns?: number } | null)?.columns ?? 1;
    setColumns(cols);
    const list = (existing as unknown as ResultEntry[]) ?? [];
    setEntries(list);

    type A = {
      student_id: string;
      team_id: string | null;
      slot_index?: number | null;
      students: { adno: string; name: string } | null;
      teams: { name: string; short_name: string | null } | null;
    };
    const all = (assigns as unknown as A[]) ?? [];

    let built: Candidate[] = [];
    if (isGroup) {
      // One row per group, exactly as the judgement sheet splits them, so two
      // groups of the same team are never merged into a single row.
      const size = Math.max(1, picked?.group_size || 0) || 1;
      const perTeam = new Map<string, A[]>();
      for (const a of all) {
        if (!a.team_id) continue;
        const arr = perTeam.get(a.team_id) ?? [];
        arr.push(a);
        perTeam.set(a.team_id, arr);
      }
      type GroupRow = { team: string; team_id: string; index: number; members: A[]; name: string };
      const groupRows: GroupRow[] = [];
      for (const [team_id, entries] of [...perTeam.entries()].sort((a, b) =>
        (a[1][0]?.teams?.short_name || a[1][0]?.teams?.name || "—").localeCompare(
          b[1][0]?.teams?.short_name || b[1][0]?.teams?.name || "—",
        ),
      )) {
        const sorted = [...entries].sort(
          (x, y) => (x.slot_index ?? 0) - (y.slot_index ?? 0),
        );
        const buckets = new Map<number, A[]>();
        sorted.forEach((e, i) => {
          const slot = typeof e.slot_index === "number" && e.slot_index >= 0 ? e.slot_index : i;
          const g = size > 1 ? Math.floor(slot / size) : i;
          const arr = buckets.get(g) ?? [];
          arr.push(e);
          buckets.set(g, arr);
        });
        [...buckets.entries()]
          .sort((a, b) => a[0] - b[0])
          .forEach(([, members], idx) => {
            groupRows.push({
              team: members[0]?.teams?.short_name || members[0]?.teams?.name || "—",
              team_id,
              index: idx,
              members,
              name: members[0]?.teams?.name ?? "Team",
            });
          });
      }
      const multi = groupRows.filter((g) => g.team_id).length > perTeam.size;
      built = interleaveByTeam(picked?.code ?? "", groupRows).map((g) => {
        const leader = multi ? (g.members[0]?.student_id ?? null) : null;
        const entry = list.find((e) =>
          leader ? e.student_id === leader : e.team_id === g.team_id && !e.student_id,
        );
        return {
          key: `${g.team_id}:${g.index}`,
          student_id: leader,
          team_id: g.team_id,
          label: multi ? `${g.name} · Group ${g.index + 1}` : g.name,
          sub:
            g.members
              .map((m) => m.students?.adno ?? "")
              .filter(Boolean)
              .join(", ") || `${g.members.length} members`,
          mark1: entry?.mark1 != null ? String(entry.mark1) : "",
          mark2: entry?.mark2 != null ? String(entry.mark2) : "",
          manual: entry?.manual_override ?? false,
          position: entry?.position != null ? String(entry.position) : "none",
          grade: entry?.grade ?? "none",
          ...(entry ? { entry } : {}),
        };
      });

    } else {
      const ordered = orderCandidates(picked?.code ?? "", 
        all.map((a) => ({
          adno: a.students?.adno ?? "",
          student: a.students?.name ?? "",
          team: a.teams?.short_name || a.teams?.name || "—",
          source: a,
        })),
      );
      built = ordered.map(({ source: a }) => {
        const entry = list.find((e) => e.student_id === a.student_id);
        return {
          key: a.student_id,
          student_id: a.student_id,
          team_id: a.team_id,
          label: a.students?.name ?? "—",
          sub: `${a.students?.adno ?? ""} · ${a.teams?.short_name || a.teams?.name || "—"}`,
          mark1: entry?.mark1 != null ? String(entry.mark1) : "",
          mark2: entry?.mark2 != null ? String(entry.mark2) : "",
          manual: entry?.manual_override ?? false,
          position: entry?.position != null ? String(entry.position) : "none",
          grade: entry?.grade ?? "none",
          ...(entry ? { entry } : {}),
        };
      });
    }
    setRows(built);
    setLoading(false);
  };

  const patch = (key: string, field: "mark1" | "mark2" | "position" | "grade", value: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const patchManual = (key: string, value: boolean) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, manual: value } : r)));

  const saveColumns = async (cols: number) => {
    setColumns(cols);
    if (!programId) return;
    await supabase
      .from("program_mark_config")
      .upsert({ program_id: programId, columns: cols }, { onConflict: "program_id" });
  };

  const save = async () => {
    if (!programId || !program) return;
    setSaving(true);
    const maxTotal = columns === 2 ? 20 : 10;
    for (const r of rows) {
      const mark1 = r.mark1 === "" ? null : Number(r.mark1);
      const mark2 = columns === 2 ? (r.mark2 === "" ? null : Number(r.mark2)) : null;
      const payload = {
        program_id: programId,
        team_id: r.team_id,
        student_id: r.student_id,
        is_group: grouped,
        mark1,
        mark2,
        max_total: maxTotal,
        manual_override: r.manual,
        ...(r.manual
          ? {
              position: r.position === "none" ? null : Number(r.position),
              grade: r.grade === "none" ? null : r.grade,
            }
          : {}),
      };
      const existing = entries.find((e) =>
        r.student_id ? e.student_id === r.student_id : e.team_id === r.team_id && !e.student_id,
      );
      const { error } = existing
        ? await supabase.from("result_entries").update(payload).eq("id", existing.id)
        : await supabase.from("result_entries").insert({ ...payload, status: "enrolled" });
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }
    const { error: rpcError } = await supabase.rpc("recalc_program_results", {
      p_program_id: programId,
    });
    if (rpcError) {
      toast.error(rpcError.message);
      setSaving(false);
      return;
    }
    toast.success("Marks saved — positions and grades applied");
    await loadProgram(programId);
    setSaving(false);
  };

  const moveToDraft = async () => {
    if (!programId) return;
    const { error } = await supabase
      .from("result_entries")
      .update({ status: "draft" })
      .eq("program_id", programId)
      .eq("status", "enrolled");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Moved to Draft");
    await loadProgram(programId);
  };

  return (
    <div className="space-y-5">
      <div className="panel space-y-3 p-4">
        <Label>Programme code or name</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Type a code, e.g. A101"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {matches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {matches.map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant="outline"
                onClick={() => {
                  setQuery("");
                  void loadProgram(m.id);
                }}
              >
                {m.code} · {m.name}
              </Button>
            ))}
          </div>
        )}
        {program && (
          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">
                {program.code} · {program.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {program.type} · {program.category} · {grouped ? "Group scoring" : "Individual"}
              </p>
            </div>
            <div className="w-40 space-y-1.5">
              <Label>Mark columns</Label>
              <Select value={String(columns)} onValueChange={(v) => void saveColumns(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">One (out of 10)</SelectItem>
                  <SelectItem value="2">Two (out of 20)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {loading && <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />}

      {program && !loading && (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">{grouped ? "Team" : "Candidate"}</th>
                  <th className="p-3">Mark 1 /10</th>
                  {columns === 2 && <th className="p-3">Mark 2 /10</th>}
                  <th className="p-3">Total</th>
                  <th className="p-3">Manual</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Grade</th>
                  <th className="p-3">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="p-3">
                      <p className="font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.sub}</p>
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step="0.5"
                        className="w-24"
                        value={r.mark1}
                        onChange={(e) => patch(r.key, "mark1", e.target.value)}
                      />
                    </td>
                    {columns === 2 && (
                      <td className="p-3">
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          step="0.5"
                          className="w-24"
                          value={r.mark2}
                          onChange={(e) => patch(r.key, "mark2", e.target.value)}
                        />
                      </td>
                    )}
                    <td className="p-3 font-mono">
                      {r.entry ? `${r.entry.total}/${r.entry.max_total}` : "—"}
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={r.manual}
                        onChange={(e) => patchManual(r.key, e.target.checked)}
                        aria-label={`Manual override for ${r.label}`}
                      />
                    </td>
                    <td className="p-3">
                      {r.manual ? (
                        <Select
                          value={r.position}
                          onValueChange={(v) => patch(r.key, "position", v)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No rank</SelectItem>
                            <SelectItem value="1">First</SelectItem>
                            <SelectItem value="2">Second</SelectItem>
                            <SelectItem value="3">Third</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        positionText(r.entry?.position ?? null)
                      )}
                    </td>
                    <td className="p-3">
                      {r.manual ? (
                        <Select value={r.grade} onValueChange={(v) => patch(r.key, "grade", v)}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No grade</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        (r.entry?.grade ?? "—")
                      )}
                    </td>
                    <td className="p-3 font-semibold">{r.entry?.points ?? 0}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      No candidate is assigned to this programme yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {rows.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border p-3">
              <Button variant="outline" className="gap-2" onClick={() => void moveToDraft()}>
                <SendHorizonal className="size-4" /> Move to Draft
              </Button>
              <Button className="gap-2" disabled={saving} onClick={() => void save()}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save marks
              </Button>
            </div>
          )}
        </div>
      )}

      <EnrolledList />
    </div>
  );
}

/** Every programme currently in the "enrolled" stage with each team's points. */
function EnrolledList() {
  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const teamColors = useTeamColors();

  const load = async () => {
    setEntries(await fetchEntries("enrolled"));
    setLoading(false);
  };
  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`enrolled-list-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "result_entries" }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const { filtered, sort, node: filterBar } = useResultFilters(entries);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: string; rows: ResultEntry[]; teams: Map<string, number> }
    >();
    for (const e of filtered) {
      const code = e.programs?.code ?? "—";
      const g = map.get(code) ?? {
        code,
        name: e.programs?.name ?? "",
        rows: [] as ResultEntry[],
        teams: new Map<string, number>(),
      };
      const team = e.teams?.short_name || e.teams?.name || "—";
      g.rows.push(e);
      g.teams.set(team, (g.teams.get(team) ?? 0) + e.points);
      map.set(code, g);
    }
    return sortGroups([...map.values()], sort) as {
      code: string;
      name: string;
      rows: ResultEntry[];
      teams: Map<string, number>;
    }[];
  }, [filtered, sort]);

  const toDraft = async (code: string) => {
    const ids = entries.filter((e) => e.programs?.code === code).map((e) => e.id);
    const { error } = await supabase
      .from("result_entries")
      .update({ status: "draft" })
      .in("id", ids);
    if (error) toast.error(error.message);
    else toast.success(`${code} moved to Draft`);
    void load();
  };

  return (
    <section className="panel overflow-hidden">
      <header className="flex items-center justify-between bg-muted/60 px-4 py-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
          Enrolled list
        </h2>
        {groups.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const { error } = await supabase
                .from("result_entries")
                .update({ status: "draft" })
                .eq("status", "enrolled");
              if (error) toast.error(error.message);
              else toast.success("All enrolled results moved to Draft");
              void load();
            }}
          >
            Draft all
          </Button>
        )}
      </header>
      <div className="border-b border-border p-4">{filterBar}</div>
      {loading ? (
        <div className="p-6 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Nothing enrolled yet — enter marks above.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {groups.map((g) => (
            <li key={g.code} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-40 flex-1">
                <p className="font-medium">
                  <span className="font-mono text-xs text-muted-foreground">{g.code}</span> {g.name}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {[...g.teams.entries()].map(([team, pts], idx) => {
                    const color = colorOf(teamColors, idx, team);
                    return (
                      <span
                        key={team}
                        className="rounded-full border px-2 py-0.5"
                        style={{
                          backgroundColor: `${color}22`,
                          borderColor: `${color}44`,
                          color,
                        }}
                      >
                        {team}: {pts}
                      </span>
                    );
                  })}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => void toDraft(g.code)}>
                To Draft
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
