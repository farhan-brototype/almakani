import { Eye, FileDown, Loader2, Search, Sheet } from "lucide-react";
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
import {
  CATEGORIES,
  PROGRAM_TYPES,
  entryModeLabel,
  slotsFor,
  supabase,
  type Program,
} from "@/lib/supabase";
import { exportExcel, exportPdf } from "@/lib/sheet";
import { useAppSession } from "@/hooks/use-session";
import { teamRpc } from "@/lib/team-auth";
import type { TeamAssignment, TeamStudent } from "@/lib/team-data";
import { PageHeading } from "@/components/PageHeading";
import { useTaxonomy } from "@/lib/taxonomy";
import {
  deadlineRank,
  fetchEntryWindows,
  formatDeadline,
  windowForProgram,
  type EntryWindows,
} from "@/lib/entry-windows";


export function TeamAssign() {
  const { categories, types } = useTaxonomy();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [students, setStudents] = useState<TeamStudent[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [entryOpen, setEntryOpen] = useState(true);
  const [loading, setLoading] = useState(true);
const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [saving, setSaving] = useState("");
  const [detail, setDetail] = useState<Program | null>(null);
  const [sort, setSort] = useState("deadline");
  const [entryWindows, setEntryWindows] = useState<EntryWindows>({ windows: [], links: [] });
  /** Re-render every minute so a passing deadline closes the row live. */
  const [, setTick] = useState(0);
  const { team } = useAppSession();
  const teamName = team?.name ?? "Our team";

  const load = useCallback(async () => {
    const [{ data: p }, { data: s }, ew] = await Promise.all([
      supabase.from("programs").select("*").order("code"),
      supabase.from("fest_settings").select("entry_open").eq("id", 1).maybeSingle(),
      fetchEntryWindows(),
    ]);
    setPrograms((p as Program[]) ?? []);
    setEntryWindows(ew);
    setEntryOpen(Boolean((s as { entry_open?: boolean } | null)?.entry_open ?? true));
    try {
      const [st, as] = await Promise.all([
        teamRpc<TeamStudent[]>("team_students"),
        teamRpc<TeamAssignment[]>("team_assignments"),
      ]);
      setStudents(st);
      setAssignments(as);
    } catch {
      /* layout handles auth */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(
    ["assignments", "programs", "fest_settings", "entry_windows", "entry_window_programs"],
    load,
  );

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  /** Deadline + open state for a programme, from its random group or its item. */
  const windowOf = useCallback(
    (p: Program) => windowForProgram(p, entryWindows),
    [entryWindows],
  );

  const studentAdnoMap = useMemo(
    () => new Map(students.map((s) => [s.adno.toLowerCase(), s])),
    [students],
  );

  const studentByAdno = useCallback(
    (adno: string) => studentAdnoMap.get(adno.trim().toLowerCase()),
    [studentAdnoMap],
  );

  const assignmentsByProgram = useMemo(() => {
    const map = new Map<string, Array<TeamAssignment | undefined>>();
    for (const a of assignments) {
      const list = map.get(a.program_id) ?? [];
      // slot_index may be missing on older rows: fall back to the first free box
      let slot = typeof a.slot_index === "number" && a.slot_index >= 0 ? a.slot_index : -1;
      if (slot < 0 || list[slot]) {
        slot = 0;
        while (list[slot]) slot += 1;
      }
      list[slot] = a;
      map.set(a.program_id, list);
    }
    return map;
  }, [assignments]);

  const slotList = useCallback(
    (programId: string) => assignmentsByProgram.get(programId) ?? [],
    [assignmentsByProgram],
  );

const filtered = useMemo(
    () =>
      programs.filter((p) => {
        if (q.trim()) {
          const needle = q.trim().toLowerCase();
          const programmeHit = `${p.code} ${p.name}`.toLowerCase().includes(needle);
          const studentHit = slotList(p.id).some((a) =>
            `${a?.adno ?? ""} ${a?.name ?? ""}`.toLowerCase().includes(needle),
          );
          if (!programmeHit && !studentHit) return false;
        }
        if (type !== "all" && p.type !== type) return false;
        if (category !== "all" && p.category !== category) return false;
        return true;
      }),
    [programs, q, type, category, slotList],
  );

  const visible = useMemo(() => {
    const rows = [...filtered];
    if (sort === "deadline")
      rows.sort(
        (a, b) =>
          deadlineRank(windowOf(a).deadline) - deadlineRank(windowOf(b).deadline) ||
          a.code.localeCompare(b.code),
      );
    else if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name));
    else rows.sort((a, b) => a.code.localeCompare(b.code));
    return rows;
  }, [filtered, sort, windowOf]);

  const exportRows = useCallback(
    () =>
      filtered.map((p) => {
        const list = slotList(p.id);
        const isTeam = p.entry_mode === "team";
        return {
          Code: p.code,
          Programme: p.name,
          Type: p.type,
          Category: p.category,
          Entry: entryModeLabel(p),
          "Ad.No": isTeam ? "—" : list.map((a) => a?.adno ?? "").join("\n") || "—",
          Candidates: isTeam ? teamName : list.map((a) => a?.name ?? "").join("\n") || "—",
        };
      }),
    [filtered, slotList, teamName],
  );

  const downloadExcel = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast.error("Nothing to export");
      return;
    }
    exportExcel("my-programme-entries", rows, "Entries");
  };

  const downloadPdf = () => {
    const rows = exportRows();
    if (!rows.length) {
      toast.error("Nothing to export");
      return;
    }
    exportPdf(
      "my-programme-entries",
      `${teamName} — Programme entries`,
      ["Code", "Programme", "Type", "Category", "Entry", "Ad.No", "Candidates"],
      rows.map((r) => [
        r.Code,
        r.Programme,
        r.Type,
        r.Category,
        r.Entry,
        r["Ad.No"],
        r.Candidates,
      ]),
      { boldColumns: [5], monoColumns: [5], columnWidths: { 5: 22 } },
    );
  };

  const setSlot = async (program: Program, index: number, raw: string) => {
    const value = raw.trim();
    const current = slotList(program.id)[index];
    const key = `${program.id}:${index}`;
    setSaving(key);
    try {
      if (current) await teamRpc("team_unassign", { p_assignment_id: current.id });
      if (value) {
        if (!studentByAdno(value)) throw new Error(`Ad.No ${value} is not in your team`);
        try {
          await teamRpc("team_assign", {
            p_program_code: program.code,
            p_adno: value,
            p_slot_index: index,
          });
        } catch (err) {
          // database not migrated yet: fall back to the older signature
          const msg = err instanceof Error ? err.message : "";
          if (!/p_slot_index|function|schema cache/i.test(msg)) throw err;
          await teamRpc("team_assign", { p_program_code: program.code, p_adno: value });
        }
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
      await load();
    } finally {
      setSaving("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeading title="Programme Assigning" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadExcel}>
            <Sheet className="size-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadPdf}>
            <FileDown className="size-4" /> PDF
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {entryOpen
          ? "Entry is open. Fill a candidate column with the student's Ad.No."
          : "Entry is currently closed by the admin."}
      </p>

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
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deadline">Deadline ahead</SelectItem>
            <SelectItem value="code">Programme code</SelectItem>
            <SelectItem value="name">Programme name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading programmes…
        </p>
      )}

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Programme</th>
              <th className="px-2 py-2">Candidates</th>
              <th className="w-12 px-2 py-2 text-right">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((p) => {
              const slots = slotsFor(p);
              const win = windowOf(p);
              const canEnter = entryOpen && win.open;
              const groupSize = Math.max(1, p.group_size || 1);
              const list = slotList(p.id);
              return (
                <tr key={p.id} className="align-top hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold">
                        {p.code}
                      </span>
                      <span className="text-sm font-semibold">{p.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{p.type}</Badge>
                      <Badge variant="outline">{p.category}</Badge>
                      <Badge variant="outline">{entryModeLabel(p)}</Badge>
                      {p.allowed_classes && (
                        <Badge variant="outline">class {p.allowed_classes} only</Badge>
                      )}
                      {win.window && (
                        <Badge variant={win.open ? "outline" : "destructive"}>
                          {win.open
                            ? `Closes ${formatDeadline(win.deadline)}`
                            : win.deadline
                              ? `Closed · ${formatDeadline(win.deadline)}`
                              : "Entry closed"}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    {p.entry_mode === "team" ? (
                      <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Team entry · </span>
                        <span className="font-semibold">{teamName}</span>
                      </div>
                    ) : (
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: slots }, (_, i) => {
                        const a = list[i];
                        const key = `${p.id}:${i}`;
                        return (
                          <div key={i}>
                            <Input
                              key={`${key}:${a?.adno ?? ""}`}
                              defaultValue={a?.adno ?? ""}
                              placeholder={
                                p.entry_mode === "group"
                                  ? `G${Math.floor(i / groupSize) + 1} - C${(i % groupSize) + 1}`
                                  : `#${i + 1}`
                              }
                              disabled={!canEnter || saving === key}
                              className="h-8 w-24 font-mono text-xs"
                              onBlur={(e) => {
                                if (e.target.value.trim() === (a?.adno ?? "")) return;
                                void setSlot(p, i, e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                            />
                            <p className="mt-0.5 max-w-24 truncate text-[10px] text-muted-foreground">
                              {a?.name ?? "\u00a0"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDetail(p)} title="View">
                      <Eye className="size-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={3} className="p-10 text-center text-muted-foreground">
                  No programmes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {detail?.code} · {detail?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {detail &&
              slotList(detail.id).map((a, i) => {
                if (!a) return null;
                const s = studentByAdno(a.adno);
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                      {i + 1}
                    </span>
                    {s?.photo_url ? (
                      <img
                        src={s.photo_url}
                        alt={s.name}
                        className="size-10 rounded-full object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Ad.No {a.adno} · Class {s?.class ?? "—"} · {s?.category ?? "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            {detail && slotList(detail.id).length === 0 && (
              <p className="text-sm text-muted-foreground">No candidates entered yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
