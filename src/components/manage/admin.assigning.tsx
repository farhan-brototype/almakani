import { Eye, FileDown, FileSpreadsheet, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { useRealtime } from "@/hooks/use-realtime";
import { fetchFestRules, limitBreaches, limitFor, type LimitRow } from "@/lib/fest-rules";
import { exportExcel, exportPdf, type Row } from "@/lib/sheet";
import { PageHeading } from "@/components/PageHeading";
import { useTaxonomy } from "@/lib/taxonomy";
import {
  CATEGORIES,
  PROGRAM_TYPES,
  fetchAll,
  slotLabel,
  slotsFor,
  supabase,
  type Program,
  type Student,
  type Team,
} from "@/lib/supabase";


type Assignment = {
  id: string;
  program_id: string;
  student_id: string;
  team_id: string | null;
  slot_index?: number | null;
};

export function AssigningPage() {
  const { categories, types } = useTaxonomy();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [detail, setDetail] = useState<Program | null>(null);
  const [saving, setSaving] = useState("");
  const [limits, setLimits] = useState<LimitRow[]>([]);
  const [crossing, setCrossing] = useState<{
    program: Program;
    team: Team;
    index: number;
    value: string;
    student: Student;
    breaches: string[];
  } | null>(null);

  const load = useCallback(async () => {
    const [p, s, t, a] = await Promise.all([
      fetchAll<Program>("programs", "*", { column: "code" }),
      fetchAll<Student>("students", "*", { column: "adno" }),
      fetchAll<Team>("teams", "id,name,captain,vice_captain,vice_captain2", { column: "name" }),
      fetchAll<Assignment>("assignments", "*", { column: "created_at" }),
    ]);
    setPrograms(p);
    setStudents(s);
    setTeams(t);
    setAssignments(a);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const rules = await fetchFestRules();
      setLimits(rules.limits);
    })();
  }, []);
  useRealtime(["assignments", "programs", "students", "teams"], load);

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const programTypeById = useMemo(
    () => new Map(programs.map((p) => [p.id, p.type])),
    [programs],
  );

  const studentOf = useCallback((id: string) => studentById.get(id), [studentById]);

  /** Programme-type counts per student, computed once per data change. */
  const countsByStudent = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const a of assignments) {
      if (!a.student_id) continue;
      const type = programTypeById.get(a.program_id);
      if (!type) continue;
      let rec = map.get(a.student_id);
      if (!rec) {
        rec = {};
        map.set(a.student_id, rec);
      }
      rec[type] = (rec[type] ?? 0) + 1;
    }
    return map;
  }, [assignments, programTypeById]);

  /** How many programmes of each type a student is already entered in. */
  const countsOf = useCallback(
    (studentId: string, skipAssignmentId?: string) => {
      const base = countsByStudent.get(studentId) ?? {};
      if (!skipAssignmentId) return base;
      const skipped = assignments.find((a) => a.id === skipAssignmentId);
      const type = skipped ? programTypeById.get(skipped.program_id) : undefined;
      if (!type || skipped?.student_id !== studentId) return base;
      return { ...base, [type]: Math.max(0, (base[type] ?? 0) - 1) };
    },
    [assignments, countsByStudent, programTypeById],
  );

  const limitOf = useCallback(
    (student: Student | undefined) =>
      student ? limitFor(limits, student.category) : undefined,
    [limits],
  );

  /** Students who already sit above one of their category maximums. */
  const overLimit = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (limitBreaches(countsByStudent.get(s.id) ?? {}, limitOf(s)).length > 0) set.add(s.id);
    }
    return set;
  }, [students, countsByStudent, limitOf]);

  /** assignments grouped by programme + team, in slot order */
  const assignmentsBySlot = useMemo(() => {
    const map = new Map<string, Array<Assignment | undefined>>();
    for (const a of assignments) {
      const key = `${a.program_id}|${a.team_id ?? ""}`;
      const list = map.get(key) ?? [];
      let slot = typeof a.slot_index === "number" && a.slot_index >= 0 ? a.slot_index : -1;
      if (slot < 0 || list[slot]) {
        slot = 0;
        while (list[slot]) slot += 1;
      }
      list[slot] = a;
      map.set(key, list);
    }
    return map;
  }, [assignments]);

  const assignmentsByProgram = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) map.set(a.program_id, (map.get(a.program_id) ?? 0) + 1);
    return map;
  }, [assignments]);

  const slotList = useCallback(
    (programId: string, teamId: string) => assignmentsBySlot.get(`${programId}|${teamId}`) ?? [],
    [assignmentsBySlot],
  );


  const visibleTeams = useMemo(
    () => (teamFilter === "all" ? teams : teams.filter((t) => t.id === teamFilter)),
    [teams, teamFilter],
  );

const filteredPrograms = useMemo(
    () =>
      programs.filter((p) => {
        if (q.trim()) {
          const needle = q.trim().toLowerCase();
          const programmeHit = `${p.code} ${p.name}`.toLowerCase().includes(needle);
          const studentHit = assignments
            .filter((a) => a.program_id === p.id)
            .some((a) => {
              const s = studentOf(a.student_id);
              return `${s?.adno ?? ""} ${s?.name ?? ""}`.toLowerCase().includes(needle);
            });
          if (!programmeHit && !studentHit) return false;
        }
        if (type !== "all" && p.type !== type) return false;
        if (category !== "all" && p.category !== category) return false;
        return true;
      }),
    [programs, q, type, category, assignments, studentOf],
  );

  /** Write one slot: empty clears it, a valid Ad.No replaces it. */
  const setSlot = async (
    program: Program,
    team: Team,
    index: number,
    raw: string,
    allowCrossing = false,
  ) => {
    const current = slotList(program.id, team.id)[index];
    const value = raw.trim();
    const key = `${program.id}:${team.id}:${index}`;
    setSaving(key);
    try {
      if (!value) {
        if (current) {
          const { error } = await supabase.from("assignments").delete().eq("id", current.id);
          if (error) throw new Error(error.message);
        }
      } else {
        const student = students.find((s) => s.adno.toLowerCase() === value.toLowerCase());
        if (!student) throw new Error(`No student with Ad.No ${value}`);
        if (student.team_id !== team.id) throw new Error(`${student.name} belongs to another team`);
        const generalProgram = (program.category ?? "").toLowerCase() === "kulliyya";
        if (!generalProgram && student.category !== program.category)
          throw new Error(
            `${student.name} is ${student.category ?? "uncategorised"} — ${program.code} is a ${program.category} programme`,
          );
        if (program.allowed_classes && (student.class ?? "") !== program.allowed_classes)
          throw new Error(`${program.code} is only for class ${program.allowed_classes}`);
        const duplicate = assignments.some(
          (a) => a.program_id === program.id && a.student_id === student.id && a.id !== current?.id,
        );
        if (duplicate) throw new Error(`${student.name} is already in ${program.code}`);

        if (!allowCrossing) {
          const next = countsOf(student.id, current?.id);
          next[program.type] = (next[program.type] ?? 0) + 1;
          const breaches = limitBreaches(next, limitOf(student));
          if (breaches.length > 0) {
            setCrossing({ program, team, index, value, student, breaches });
            setSaving("");
            return;
          }
        }
        const base = current
          ? { student_id: student.id, team_id: team.id }
          : { program_id: program.id, student_id: student.id, team_id: team.id };
        const write = async (payload: Record<string, unknown>) =>
          current
            ? await supabase.from("assignments").update(payload).eq("id", current.id)
            : await supabase.from("assignments").insert(payload);
        let { error } = await write({ ...base, slot_index: index });
        // database not migrated yet: retry without the slot column
        if (error && /slot_index/i.test(error.message)) ({ error } = await write(base));
        if (error) throw new Error(error.message);

      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
      await load();
    } finally {
      setSaving("");
    }
  };

  /** Wide export: one row per programme × team, one column per candidate slot. */
  const maxSlots = useMemo(
    () => Math.max(1, ...filteredPrograms.map(slotsFor)),
    [filteredPrograms],
  );

  const exportRows = (): Row[] =>
    filteredPrograms.flatMap((p) =>
      visibleTeams.map((t) => {
        const list = slotList(p.id, t.id);
        const row: Row = {
          Code: p.code,
          Programme: p.name,
          Type: p.type,
          Category: p.category,
          Team: t.name,
        };
        for (let i = 0; i < maxSlots; i += 1) {
          const a = list[i];
          row[`Candidate ${i + 1}`] = a ? (studentOf(a.student_id)?.adno ?? "") : "";
        }
        return row;
      }),
    );

  const exportPdfNow = () => {
    const columns = [
      "Code",
      "Programme",
      "Category",
      "Team",
      ...Array.from({ length: maxSlots }, (_, i) => `C${i + 1}`),
    ];
    const body = exportRows().map((r) => [
      String(r["Code"] ?? ""),
      String(r["Programme"] ?? ""),
      String(r["Category"] ?? ""),
      String(r["Team"] ?? ""),
      ...Array.from({ length: maxSlots }, (_, i) => String(r[`Candidate ${i + 1}`] ?? "")),
    ]);
    exportPdf("assignments", "Programme Assignments", columns, body);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageHeading title="Assigning" />
          <p className="text-sm text-muted-foreground">
            {assignments.length} candidate entries across {programs.length} programmes · live
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportExcel("assignments", exportRows(), "Assignments")}
          >
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportPdfNow}>
            <FileDown className="size-4" /> PDF
          </Button>
        </div>
      </div>

<div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search programme code, name, student or Ad.No"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
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
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-36">
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
      </div>

      {loading && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading assignments…
        </p>
      )}

      <div className="mt-4 space-y-5">
        {filteredPrograms.map((p) => {
          const slots = Math.max(1, slotsFor(p));
          return (
            <section key={p.id} className="panel overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/50 px-4 py-2.5">
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-semibold">
                  {p.code}
                </span>
                <h2 className="font-display text-sm font-semibold">{p.name}</h2>
                <Badge variant="secondary">{p.type}</Badge>
                <Badge variant="outline">{p.category}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {slots} candidate slot{slots > 1 ? "s" : ""} per team
                </span>
              </header>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-40 px-4 py-2">Team</th>
                      {Array.from({ length: slots }, (_, i) => (
                        <th key={i} className="px-2 py-2 whitespace-nowrap">
                          {slotLabel(p, i)}
                        </th>
                      ))}
                      <th className="w-12 px-2 py-2 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleTeams.map((t) => {
                      const list = slotList(p.id, t.id);
                      return (
                        <tr key={t.id} className="align-top hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{t.name}</td>
                          {p.entry_mode === "team" ? (
                            <td className="px-2 py-2" colSpan={slots}>
                              <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs">
                                <span className="text-muted-foreground">Team entry · </span>
                                <span className="font-semibold">{t.name}</span>
                              </div>
                            </td>
                          ) : (
                          Array.from({ length: slots }, (_, i) => {
                            const a = list[i];
                            const s = a ? studentOf(a.student_id) : undefined;
                            const key = `${p.id}:${t.id}:${i}`;
                            return (
                              <td key={i} className="px-2 py-2">
                                <Input
                                  defaultValue={s?.adno ?? ""}
                                  key={`${key}:${s?.adno ?? ""}`}
                                  placeholder="Ad.No"
                                  className={`h-8 w-28 font-mono text-xs ${
                                    s && overLimit.has(s.id)
                                      ? "border-destructive text-destructive focus-visible:ring-destructive"
                                      : ""
                                  }`}
                                  data-slot-input=""
                                  aria-invalid={Boolean(s && overLimit.has(s.id))}
                                  disabled={saving === key}
                                  onBlur={(e) => {
                                    if (e.target.value.trim() === (s?.adno ?? "")) return;
                                    void setSlot(p, t, i, e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") e.currentTarget.blur();
                                  }}
                                />
                                <p className="mt-0.5 max-w-28 truncate text-[10px] text-muted-foreground">
                                  {s?.name ?? "\u00a0"}
                                </p>
                              </td>
                            );
                           })
                          )}
                          <td className="px-2 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View candidates (all teams)"
                              onClick={() => setDetail(p)}
                            >
                              <Eye className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        {!loading && filteredPrograms.length === 0 && (
          <p className="panel p-10 text-center text-muted-foreground">No programmes found.</p>
        )}
      </div>

      <Dialog open={Boolean(crossing)} onOpenChange={(v) => !v && setCrossing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Limit crossed</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Adding <span className="font-semibold">{crossing?.student.name}</span> ({crossing?.student.adno}) to{" "}
              <span className="font-semibold">{crossing?.program.code}</span> goes past the{" "}
              {crossing?.student.category ?? "category"} rules:
            </p>
            <ul className="space-y-1 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {crossing?.breaches.map((b) => <li key={b}>• {b}</li>)}
            </ul>
            <p className="text-xs text-muted-foreground">
              Teams cannot cross a limit. As an admin you may allow it — the student will be
              flagged red everywhere.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCrossing(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const c = crossing;
                  setCrossing(null);
                  if (c) void setSlot(c.program, c.team, c.index, c.value, true);
                }}
              >
                Add anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {detail?.code} · {detail?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {detail &&
              teams
                .map((team) => {
                  const list = slotList(detail.id, team.id).filter(
                    (a): a is Assignment => Boolean(a && studentOf(a.student_id)),
                  );
                  if (list.length === 0) return null;
                  return (
                    <div key={team.id}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                        {team.name} · {list.length} candidate(s)
                      </p>
                      <ul className="divide-y divide-border rounded-lg border border-border">
                        {list.map((a) => {
                          const s = studentOf(a.student_id);
                          return (
                            <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                              {s?.photo_url ? (
                                <img
                                  src={s.photo_url}
                                  alt={s.name}
                                  className="size-8 rounded-full object-cover"
                                />
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{s?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Ad.No {s?.adno} · Class {s?.class ?? "—"} · {s?.category ?? "—"}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })
                .filter(Boolean)}
            {detail &&
              (assignmentsByProgram.get(detail.id) ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">No candidates assigned from any team yet.</p>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
