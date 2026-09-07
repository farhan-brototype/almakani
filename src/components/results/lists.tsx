import { Download, Eye, Loader2, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResultFilters } from "@/components/results/filters";
import { useRealtime } from "@/hooks/use-realtime";
import { fetchEntries, positionText, type ResultEntry } from "@/lib/results";
import { exportExcel, parseSheetFile, pick } from "@/lib/sheet";
import { fetchAll, supabase, type Program, type Student } from "@/lib/supabase";
import { useTaxonomy } from "@/lib/taxonomy";



export function StudentMarksPage() {
  const { types } = useTaxonomy();
  const [students, setStudents] = useState<(Student & { teams?: { name: string } | null })[]>([]);
  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [mode, setMode] = useState<"published" | "total">("published");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, list] = await Promise.all([
      fetchAll<Student>("students", "*, teams(name)", { column: "name" }),
      fetchEntries(),
    ]);
    setStudents(s);
    setEntries(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["result_entries", "students", "teams"], () => void load());


  const byStudent = useMemo(() => {
    const map = new Map<string, ResultEntry[]>();
    for (const e of entries) {
      if (!e.student_id) continue;
      const arr = map.get(e.student_id) ?? [];
      arr.push(e);
      map.set(e.student_id, arr);
    }
    return map;
  }, [entries]);

  const { node: filterNode, cls, team, category, sort } = useResultFilters(entries);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const teamName = (s: Student & { teams?: { name: string } | null }) => s.teams?.name ?? "";
    return students
      .map((s) => {
        const list = byStudent.get(s.id) ?? [];
        const scoped = filter === "all" ? list : list.filter((e) => e.programs?.type === filter);
        const counted = mode === "published" ? scoped.filter((e) => e.status === "published") : scoped;
        const points = counted.reduce((sum, e) => sum + e.points, 0);
        const marks = scoped.reduce((sum, e) => sum + Number(e.total ?? 0), 0);
        const recent = Math.max(
          0,
          ...scoped.map((e) => new Date(e.updated_at ?? e.created_at).getTime() || 0),
        );
        return { student: s, list, points, marks, recent, count: scoped.length };
      })
      .filter(
        (r) =>
          (!needle ||
            r.student.name.toLowerCase().includes(needle) ||
            r.student.adno.toLowerCase().includes(needle)) &&
          (cls === "all" || r.student.class === cls) &&
          (team === "all" || teamName(r.student) === team) &&
          (category === "all" || r.student.category === category),
      )
      .sort((a, b) => {
        switch (sort) {
          case "points":
            return b.points - a.points || a.student.name.localeCompare(b.student.name);
          case "team":
            return (
              teamName(a.student).localeCompare(teamName(b.student)) ||
              a.student.name.localeCompare(b.student.name)
            );
          case "recent":
            return b.recent - a.recent;
          default:
            return a.student.adno.localeCompare(b.student.adno, undefined, { numeric: true });
        }
      });
  }, [students, byStudent, filter, mode, q, cls, team, category, sort]);

  const detailRows = detail ? (byStudent.get(detail) ?? []) : [];
  const detailStudent = students.find((s) => s.id === detail);

  const detailCounted = useMemo(
    () => (mode === "published" ? detailRows.filter((e) => e.status === "published") : detailRows),
    [detailRows, mode],
  );

  const detailByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of detailCounted) {
      const t = e.programs?.type ?? "Other";
      map.set(t, (map.get(t) ?? 0) + (e.points ?? 0));
    }
    const ordered = [...types.filter((t) => map.has(t)), ...[...map.keys()].filter((t) => !types.includes(t))];
    return ordered.map((t) => ({ type: t, points: map.get(t) ?? 0 }));
  }, [detailCounted, types]);

  const detailTotal = detailByType.reduce((s, t) => s + t.points, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          className="flex-1"
          placeholder="Search student or Ad.No"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", ...types].map((t) => (
              <SelectItem key={t} value={t}>
                {t === "all" ? "All programmes" : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mode} onValueChange={(v) => setMode(v as "published" | "total")}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="published">Published marks</SelectItem>
            <SelectItem value="total">Total marks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filterNode}

      {loading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Ad.No</th>
                <th className="p-3">Student</th>
                <th className="p-3">Team</th>
                <th className="p-3">Programmes</th>
                <th className="p-3">Marks</th>
                <th className="p-3">{mode === "published" ? "Points (published)" : "Points (total)"}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.student.id}>
                  <td className="p-3 font-mono text-xs">{r.student.adno}</td>
                  <td className="p-3 font-medium">{r.student.name}</td>
                  <td className="p-3">
                    {(r.student as { teams?: { name: string } | null }).teams?.name ?? "—"}
                  </td>
                  <td className="p-3">{r.count}</td>
                  <td className="p-3 font-mono">{r.marks}</td>
                  <td className="p-3 font-semibold">{r.points}</td>
                  <td className="p-3 text-right">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`View programmes of ${r.student.name}`}
                      onClick={() => setDetail(r.student.id)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No student matches this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {mode === "published" ? "Published points" : "Total points"}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {detailByType.map((t) => (
                <span key={t.type}>
                  <span className="text-muted-foreground">{t.type}:</span>{" "}
                  <span className="font-semibold">{t.points}</span>
                </span>
              ))}
              {detailByType.length === 0 && (
                <span className="text-muted-foreground">No points yet.</span>
              )}
              <span className="text-primary">
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-semibold">{detailTotal}</span>
              </span>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            {detailRows.map((e) => (
              <li key={e.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">
                  <span className="font-mono text-xs text-muted-foreground">
                    {e.programs?.code}
                  </span>{" "}
                  {e.programs?.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.programs?.type} · {positionText(e.position)} · Grade {e.grade ?? "—"} ·{" "}
                  {e.total}/{e.max_total} marks · {e.points} points · {e.status}
                </p>
              </li>
            ))}
            {detailRows.length === 0 && (
              <li className="text-muted-foreground">No result entry for this student yet.</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ProgramResultsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [schemes, setSchemes] = useState<{ id: string; code: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkScheme, setBulkScheme] = useState("");

  const load = useCallback(async () => {
    const [{ data: p }, list, { data: gs }] = await Promise.all([
      supabase.from("programs").select("*").order("code"),
      fetchEntries(),
      supabase.from("grading_schemes").select("id,code,name").order("code"),
    ]);
    setPrograms((p as Program[]) ?? []);
    setSchemes((gs as { id: string; code: string; name: string }[]) ?? []);
    setEntries(list);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["result_entries", "programs", "teams"], () => void load());

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return programs
      .map((p) => {
        const list = entries.filter((e) => e.program_id === p.id);
        const statuses = new Set(list.map((e) => e.status));
        const state = statuses.has("published")
          ? "Published"
          : statuses.has("draft")
            ? "Drafted"
            : statuses.has("enrolled")
              ? "Enrolled"
              : "—";
        const teams = new Map<string, number>();
        for (const e of list) {
          const name = e.teams?.short_name || e.teams?.name || "—";
          teams.set(name, (teams.get(name) ?? 0) + e.points);
        }
        return { program: p, state, teams: [...teams.entries()] };
      })
      .filter((r) => (status === "all" ? true : r.state === status))
      .filter(
        (r) =>
          !needle ||
          r.program.code.toLowerCase().includes(needle) ||
          r.program.name.toLowerCase().includes(needle),
      );
  }, [programs, entries, status, q]);

  const applyScheme = async (schemeId: string | null) => {
    if (selected.length === 0) {
      toast.error("Select at least one programme");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("programs")
      .update({ grading_scheme_id: schemeId })
      .in("id", selected);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    for (const id of selected) await supabase.rpc("recalc_program_results", { p_program_id: id });
    toast.success(`Grading updated for ${selected.length} programme(s)`);
    setSelected([]);
    await load();
  };

  const downloadNames = () => {
    if (programs.length === 0) {
      toast.error("No programme to download");
      return;
    }
    exportExcel(
      "programme-names",
      programs.map((p) => ({ Code: p.code, Programme: p.name })),
      "Programmes",
    );
  };

  const importMarks = async (file: File) => {
    setBusy(true);
    try {
      const parsed = await parseSheetFile(file);
      const students = await fetchAll<{ id: string; adno: string; team_id: string | null }>(
        "students",
        "id,adno,team_id",
      );
      const studentAdnoIndex = new Map(students.map((s) => [s.adno.toLowerCase(), s]));
      const touched = new Set<string>();

      let ok = 0;
      const failures: string[] = [];

      for (let i = 0; i < parsed.length; i += 1) {
        const row = parsed[i]!;
        const code = pick(row, "code", "programme code", "program code");
        const nameKey = pick(row, "programme", "program", "name");
        const program = programs.find(
          (p) =>
            p.code.toLowerCase() === code.toLowerCase() ||
            (nameKey && p.name.toLowerCase() === nameKey.toLowerCase()),
        );
        if (!program) {
          failures.push(`Row ${i + 2}: unknown programme`);
          continue;
        }
        const adno = pick(row, "adno", "ad no", "admission number");
        const student = studentAdnoIndex.get(adno.toLowerCase());
        if (!student) {
          failures.push(`Row ${i + 2}: unknown Ad.No ${adno}`);
          continue;
        }
        const m1 = pick(row, "mark1", "mark 1", "mark", "point", "points");
        const m2 = pick(row, "mark2", "mark 2");
        const payload = {
          program_id: program.id,
          student_id: student.id,
          team_id: student.team_id,
          is_group: false,
          mark1: m1 === "" ? null : Number(m1),
          mark2: m2 === "" ? null : Number(m2),
          max_total: m2 === "" ? 10 : 20,
        };
        const existing = entries.find(
          (e) => e.program_id === program.id && e.student_id === student.id,
        );
        const { error } = existing
          ? await supabase.from("result_entries").update(payload).eq("id", existing.id)
          : await supabase.from("result_entries").insert({ ...payload, status: "enrolled" });
        if (error) failures.push(`Row ${i + 2}: ${error.message}`);
        else {
          ok += 1;
          touched.add(program.id);
        }
      }
      for (const id of touched) {
        await supabase.rpc("recalc_program_results", { p_program_id: id });
      }
      if (failures.length) toast.error(`${failures.length} rows failed — ${failures[0]}`);
      if (ok) toast.success(`${ok} marks imported`);
      setImportOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          className="flex-1"
          placeholder="Search programme code or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "Enrolled", "Drafted", "Published", "—"].map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : s === "—" ? "Not started" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2" onClick={downloadNames}>
          <Download className="size-4" /> Programme names
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
          <Upload className="size-4" /> Upload marks
        </Button>
      </div>

      <div className="panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          {selected.length > 0
            ? `${selected.length} programme(s) selected`
            : "Tick programmes to bulk-assign a grading code"}
        </p>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
          <Select value={bulkScheme} onValueChange={setBulkScheme}>
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="Grading code" />
            </SelectTrigger>
            <SelectContent>
              {schemes.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.code} · {g.name}
                </SelectItem>
              ))}
              {schemes.length === 0 && (
                <SelectItem value="none" disabled>
                  No grading scheme yet
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            disabled={busy || !bulkScheme || selected.length === 0}
            onClick={() => void applyScheme(bulkScheme)}
          >
            Apply to selected
          </Button>
          <Button
            variant="outline"
            disabled={busy || selected.length === 0}
            onClick={() => void applyScheme(null)}
          >
            Clear grading
          </Button>
        </div>
      </div>

      {loading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">
                  <Checkbox
                    checked={rows.length > 0 && selected.length === rows.length}
                    onCheckedChange={(v) =>
                      setSelected(v ? rows.map((r) => r.program.id) : [])
                    }
                  />
                </th>
                <th className="p-3">Code</th>
                <th className="p-3">Programme</th>
                <th className="p-3">Type</th>
                <th className="p-3">Grading</th>
                <th className="p-3">Status</th>
                <th className="p-3">Team points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.program.id}>
                  <td className="p-3">
                    <Checkbox
                      checked={selected.includes(r.program.id)}
                      onCheckedChange={(v) =>
                        setSelected((prev) =>
                          v
                            ? [...prev, r.program.id]
                            : prev.filter((id) => id !== r.program.id),
                        )
                      }
                    />
                  </td>
                  <td className="p-3 font-mono text-xs">{r.program.code}</td>
                  <td className="p-3 font-medium">{r.program.name}</td>
                  <td className="p-3">{r.program.type}</td>
                  <td className="p-3 text-xs">
                    {schemes.find((g) => g.id === r.program.grading_scheme_id)?.code ?? "—"}
                  </td>
                  <td className="p-3">{r.state}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {r.teams.map(([team, pts]) => (
                        <span key={team} className="rounded-full bg-muted px-2 py-0.5">
                          {team}: {pts}
                        </span>
                      ))}
                      {r.teams.length === 0 && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No programme matches this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload marks</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Columns: <span className="font-mono">code</span> (or{" "}
            <span className="font-mono">programme</span>), <span className="font-mono">adno</span>,{" "}
            <span className="font-mono">mark1</span>, optional{" "}
            <span className="font-mono">mark2</span>.
          </p>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importMarks(file);
            }}
          />
          {busy && <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
