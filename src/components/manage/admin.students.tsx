import { ImageOff, ImagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BulkImport } from "@/components/admin/BulkImport";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusDot } from "@/components/StatusDot";
import {
  countOf,
  fetchFestRules,
  limitBreaches,
  limitFor,
  studentStatus,
  type LimitRow,
} from "@/lib/fest-rules";
import { chunkedWrite, pick } from "@/lib/sheet";
import { CATEGORIES, fetchAll, supabase, type Category, type Student, type Team } from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";
import { useTaxonomy } from "@/lib/taxonomy";



type AssignedRow = {
  code: string;
  name: string;
  type: string;
  event_date: string | null;
  event_time: string | null;
  stage: string | null;
};

export function StudentsPage() {
  const { categories, types } = useTaxonomy();
  const [rows, setRows] = useState<Student[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [team, setTeam] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Partial<Student> | null>(null);
  const [detail, setDetail] = useState<{ student: Student; programs: AssignedRow[] } | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState<{ done: number; total: number } | null>(null);
  const [limits, setLimits] = useState<LimitRow[]>([]);
  const [counts, setCounts] = useState<Record<string, Record<string, number>>>({});

  const load = async () => {
    const [s, t, a, rules] = await Promise.all([
      fetchAll<Student>("students", "*", { column: "name" }),
      fetchAll<Team>("teams", "id,name,captain,vice_captain,vice_captain2", { column: "name" }),
      fetchAll<unknown>("assignments", "student_id, programs(type)"),
      fetchFestRules(),
    ]);
    setRows(s);
    setTeams(t);
    setLimits(rules.limits);
    const map: Record<string, Record<string, number>> = {};
    type AssignRow = { student_id: string; programs: { type: string } | { type: string }[] | null };
    for (const row of ((a ?? []) as unknown as AssignRow[])) {
      const rec = Array.isArray(row.programs) ? row.programs[0] : row.programs;
      const type = rec?.type ?? "";
      if (!type) continue;
      const bucket = map[row.student_id] ?? {};
      bucket[type] = (bucket[type] ?? 0) + 1;
      map[row.student_id] = bucket;
    }

    setCounts(map);
  };
  useEffect(() => {
    void load();
  }, []);

  useRealtime(["students", "assignments", "programs", "teams", "category_limits", "categories", "category_items"], () => void load());

  const statusOf = (s: Student) =>
    studentStatus(counts[s.id] ?? {}, limitFor(limits, s.category));

  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "—";



  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (q && !`${r.adno} ${r.name}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (category !== "all" && r.category !== category) return false;
        if (team !== "all" && r.team_id !== team) return false;
        return true;
      }),
    [rows, q, category, team],
  );

  const save = async (): Promise<void> => {
    if (!editing?.adno || !editing.name) {
      toast.error("Ad.No and name are required");
      return;
    }
    const payload = {
      adno: editing.adno.trim(),
      name: editing.name.trim(),
      class: editing.class || null,
      category: editing.category ?? null,
      team_id: editing.team_id ?? null,
      photo_url: editing.photo_url ?? null,
    };
    const { error } = editing.id
      ? await supabase.from("students").update(payload).eq("id", editing.id)
      : await supabase.from("students").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  const remove = async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} student(s)?`)) return;
    const { error } = await supabase.from("students").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelected([]);
    toast.success("Deleted");
    void load();
  };

  const openDetail = async (student: Student) => {
    const { data } = await supabase
      .from("assignments")
      .select("programs(code,name,type), program_id")
      .eq("student_id", student.id);
    const ids = (data ?? []).map((d) => (d as { program_id: string }).program_id);
    const { data: tt } = ids.length
      ? await supabase.from("timetable").select("*").in("program_id", ids)
      : { data: [] };
    const programs: AssignedRow[] = (data ?? []).map((d) => {
      const rec = d as unknown as {
        program_id: string;
        programs: { code: string; name: string; type: string } | null;
      };
      const sched = (tt ?? []).find(
        (x) => (x as { program_id: string }).program_id === rec.program_id,
      ) as { event_date: string; event_time: string | null; stage: string | null } | undefined;
      return {
        code: rec.programs?.code ?? "",
        name: rec.programs?.name ?? "",
        type: rec.programs?.type ?? "",
        event_date: sched?.event_date ?? null,
        event_time: sched?.event_time ?? null,
        stage: sched?.stage ?? null,
      };
    });
    setDetail({ student, programs });
  };

  /** Clear the photo of every selected student (bulk photo delete). */
  const removePhotos = async (ids: string[]): Promise<void> => {
    const targets = rows.filter((r) => ids.includes(r.id) && r.photo_url);
    if (!targets.length) {
      toast.error("None of the selected students have a photo");
      return;
    }
    if (!window.confirm(`Remove ${targets.length} photo(s)?`)) return;
    setPhotoBusy({ done: 0, total: targets.length });
    let done = 0;
    for (const student of targets) {
      const path = decodeURIComponent((student.photo_url ?? "").split("/student-photos/")[1] ?? "");
      if (path) await supabase.storage.from("student-photos").remove([path]);
      await supabase.from("students").update({ photo_url: null }).eq("id", student.id);
      done += 1;
      setPhotoBusy({ done, total: targets.length });
    }
    setPhotoBusy(null);
    toast.success(`${done} photo(s) removed`);
    void load();
  };

  const uploadPhotos = async (files: FileList) => {
    let ok = 0;
    const all = Array.from(files);
    setPhotoBusy({ done: 0, total: all.length });
    for (const file of all) {
      const adno = file.name.replace(/\.[^.]+$/, "").trim();
      const student = rows.find((r) => r.adno.toLowerCase() === adno.toLowerCase());
      if (!student) continue;
      const path = `${student.adno}-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("student-photos").upload(path, file, {
        upsert: true,
      });
      if (error) continue;
      const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
      await supabase.from("students").update({ photo_url: data.publicUrl }).eq("id", student.id);
      ok += 1;
      setPhotoBusy((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
    }
    setPhotoBusy(null);
    toast.success(`${ok} photo(s) linked by Ad.No`);
    void load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageHeading title="Students" />
          <p className="text-sm text-muted-foreground">{rows.length} students registered</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadPhotos(e.target.files)}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => photoRef.current?.click()}
          >
            <ImagePlus className="size-4" /> Bulk photos (file name = Ad.No)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={selected.length === 0 || photoBusy !== null}
            onClick={() => removePhotos(selected)}
          >
            <ImageOff className="size-4" /> Delete photos ({selected.length})
          </Button>
          {photoBusy && (
            <div className="flex items-center gap-2">
              <Progress
                value={Math.round((photoBusy.done / Math.max(1, photoBusy.total)) * 100)}
                className="h-2 w-28"
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {photoBusy.done} / {photoBusy.total}
              </span>
            </div>
          )}
          <BulkImport
            templateName="students"
            templateRow={{
              AdNo: "1001",
              Name: "Student Name",
              Class: "1",
              Category: "Uoola",
              Team: "Team A",
              PhotoURL: "",
            }}
            onRows={async (sheet, onProgress) => {
              const failed: string[] = [];
              const payload = sheet.flatMap((r) => {
                const adno = pick(r, "adno", "admissionno", "admno");
                const name = pick(r, "name", "studentname");
                if (!adno || !name) {
                  failed.push("missing adno/name");
                  return [];
                }
                const tname = pick(r, "team", "group");
                const found = teams.find((t) => t.name.toLowerCase() === tname.toLowerCase());
                const rawCat = pick(r, "category").toLowerCase().replace(/^kulliy+a$/i, "kulliyya").replace(/^general$/i, "kulliyya");
                return [
                  {
                    adno,
                    name,
                    class: pick(r, "class") || null,
                    category: (CATEGORIES.find((c) => c.toLowerCase() === rawCat) ??
                      null) as Category | null,
                    team_id: found?.id ?? null,
                    photo_url: pick(r, "photourl", "photo") || null,
                  },
                ];
              });
              const result = await chunkedWrite(
                payload,
                (batch) => supabase.from("students").upsert(batch, { onConflict: "adno" }),
                onProgress,
              );
              await load();
              return { ok: result.ok, failed: [...failed, ...result.failed] };
            }}
          />
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setEditing({ adno: "", name: "", category: "Uoola" })}
          >
            <Plus className="size-4" /> Add student
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search Ad.No or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={team} onValueChange={setTeam}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => remove(selected)}
          >
            <Trash2 className="size-4" /> Delete {selected.length}
          </Button>
        )}
      </div>

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">
                <Checkbox
                  checked={selected.length > 0 && selected.length === filtered.length}
                  onCheckedChange={(v) => setSelected(v ? filtered.map((r) => r.id) : [])}
                />
              </th>
              <th className="p-3">Photo</th>
              <th className="p-3">Ad.No</th>
              <th className="p-3">Name</th>
              <th className="p-3">Class</th>
              <th className="p-3">Category</th>
              <th className="p-3">Team</th>
              <th className="p-3">Programmes</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3">
                  <Checkbox
                    checked={selected.includes(r.id)}
                    onCheckedChange={(v) =>
                      setSelected((s) => (v ? [...s, r.id] : s.filter((i) => i !== r.id)))
                    }
                  />
                </td>
                <td className="p-3">
                  {r.photo_url ? (
                    <img
                      src={r.photo_url}
                      alt={r.name}
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs">
                      {r.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="p-3 font-mono">{r.adno}</td>
                <td className="p-3 font-medium">
                  <span className="flex items-center gap-2">
                    <StatusDot status={statusOf(r)} />
                    {r.name}
                  </span>
                </td>

                <td className="p-3">{r.class ?? "—"}</td>
                <td className="p-3">
                  <Badge variant="secondary">{r.category ?? "—"}</Badge>
                </td>
                <td className="p-3">{teamName(r.team_id)}</td>
                <td className="p-3">
                  <Button variant="link" size="sm" onClick={() => openDetail(r)}>
                    View
                  </Button>
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove([r.id])}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit student" : "New student"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ad.No</Label>
              <Input
                value={editing?.adno ?? ""}
                onChange={(e) => setEditing({ ...editing, adno: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={editing?.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Input
                value={editing?.class ?? ""}
                onChange={(e) => setEditing({ ...editing, class: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={editing?.category ?? "Uoola"}
                onValueChange={(v) => setEditing({ ...editing, category: v as Category })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Team</Label>
              <Select
                value={editing?.team_id ?? "none"}
                onValueChange={(v) => setEditing({ ...editing, team_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Photo URL</Label>
              <Input
                value={editing?.photo_url ?? ""}
                onChange={(e) => setEditing({ ...editing, photo_url: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save}>Save student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detail && <StatusDot status={statusOf(detail.student)} />}
              {detail?.student.name} · {detail?.student.adno}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <DetailStatus
              student={detail.student}
              counts={counts[detail.student.id] ?? {}}
              limits={limits}
            />
          )}
          <div className="-mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
            {detail?.programs.length === 0 && (
              <p className="text-sm text-muted-foreground">No programmes assigned yet.</p>
            )}
            {detail?.programs.map((p) => (
              <div key={p.code} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">
                  <span className="font-mono text-muted-foreground">{p.code}</span> · {p.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.type} · {p.event_date ?? "date TBA"}{" "}
                  {p.event_time ? p.event_time.slice(0, 5) : ""} · {p.stage ?? "stage TBA"}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Banner at the top of the programmes dialog: rule violations, or a clean bill. */
function DetailStatus({
  student,
  counts,
  limits,
}: {
  student: Student;
  counts: Record<string, number>;
  limits: LimitRow[];
}) {
  const limit = limitFor(limits, student.category);
  const status = studentStatus(counts, limit);

  if (status.tone !== "red") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
        <StatusDot status={status} />
        No violation of rules — {status.label}
      </div>
    );
  }

  const violations = limitBreaches(counts, limit);
  if (limit) {
    const stageMin = limit.stage_min || 0;
    const nonStageMin = limit.nonstage_min || 0;
    const stage = countOf(counts, "Stage");
    const nonStage = countOf(counts, "Non-stage");
    if (stageMin > 0 && stage < stageMin)
      violations.push(`Stage minimum not reached — ${stage}/${stageMin}`);
    if (nonStageMin > 0 && nonStage < nonStageMin)
      violations.push(`Non-stage minimum not reached — ${nonStage}/${nonStageMin}`);
  }

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
      <p className="flex items-center gap-2 font-medium">
        <StatusDot status={status} />
        Rule {violations.length > 1 ? "violations" : "violation"}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-7 text-xs">
        {violations.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
    </div>
  );
}
