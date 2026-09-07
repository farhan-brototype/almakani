import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Eye, MapPin, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ManageTabs } from "@/components/ManageTabs";
import { TimetablePage } from "@/components/manage/admin.timetable";
import { SchedulePrintPage } from "@/components/manage/admin.timetable-print";
import { PublicShell } from "@/components/PublicShell";
import { useAppSession } from "@/hooks/use-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRealtime } from "@/hooks/use-realtime";
import { fetchAll, supabase, type Program, type Student, type Team, type TimetableRow } from "@/lib/supabase";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule & Stage Timetable" },
      {
        name: "description",
        content:
          "Live schedule and stage timetable of the arts fest — dates, times, stages and completion status.",
      },
      { property: "og:title", content: "Schedule" },
      {
        property: "og:description",
        content: "Live schedule and stage timetable of the arts fest.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SchedulePage,
});

type Assignment = {
  id: string;
  program_id: string;
  student_id: string;
  team_id: string | null;
};

function formatTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  if (!h || !m) return t;
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${m} ${ampm}`;
}

function SchedulePage() {
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("overview");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [day, setDay] = useState<string>("today");
  const [detail, setDetail] = useState<TimetableRow | null>(null);

  const load = useCallback(async () => {
    const [{ data: tt }, { data: pg }, { data: s }, { data: t }, { data: a }] = await Promise.all([
      supabase
        .from("timetable")
        .select("*, programs(code,name,category,type,entry_mode,group_count,group_size,candidates)")
        .order("event_date")
        .order("event_time"),
      supabase.from("programs").select("*").order("code"),
      fetchAll<Student>("students", "*", { column: "adno" }).then((data) => ({ data })),
      supabase.from("teams").select("id,name,short_name").order("name"),
      fetchAll<Assignment>("assignments", "id,program_id,student_id,team_id", { column: "id" }).then(
        (data) => ({ data }),
      ),
    ]);
    setRows((tt as TimetableRow[]) ?? []);
    setPrograms((pg as Program[]) ?? []);
    setStudents((s as Student[]) ?? []);
    setTeams((t as Team[]) ?? []);
    setAssignments((a as Assignment[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["timetable", "programs", "assignments", "students", "teams"], load);

  const today = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  const days = useMemo(
    () => [...new Set(rows.map((r) => r.event_date))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const activeDay = useMemo(() => {
    if (day !== "today") return day;
    if (days.includes(today)) return today;
    return days[0] ?? "";
  }, [day, days, today]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const p = r.programs;
        const text = `${p?.code ?? ""} ${p?.name ?? ""} ${r.stage ?? ""}`.toLowerCase();
        if (q && !text.includes(q.toLowerCase())) return false;
        if (day !== "all" && r.event_date !== activeDay) return false;
        if (status === "completed" && !r.completed) return false;
        if (status === "pending" && r.completed) return false;
        return true;
      }),
    [rows, q, status, day, activeDay],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, TimetableRow[]>();
    for (const row of filtered) {
      const list = map.get(row.event_date) ?? [];
      list.push(row);
      map.set(row.event_date, list);
    }
    for (const list of map.values())
      list.sort((a, b) => Number(a.completed) - Number(b.completed));
    const rank = (d: string) => (d === today ? 0 : d > today ? 1 : 2);
    return [...map.entries()].sort(([a], [b]) =>
      rank(a) - rank(b) || (rank(a) === 2 ? b.localeCompare(a) : a.localeCompare(b)),
    );
  }, [filtered, today]);

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const studentOf = useCallback((id: string) => studentById.get(id), [studentById]);
  const teamOf = useCallback((id: string | null) => (id ? teamById.get(id) : undefined), [teamById]);

  const { role, team: sessionTeam } = useAppSession();
  const isAdmin = role === "admin";
  const isTeam = role === "team";
  const myTeamId = sessionTeam?.id ?? null;

  /** For admin: all candidates grouped by team */
  const adminDetailByTeam = useMemo(() => {
    if (!detail) return [];
    const map = new Map<string, { teamName: string; entries: { a: Assignment; s: Student | undefined }[] }>();
    for (const a of assignments) {
      if (a.program_id !== detail.program_id) continue;
      const s = studentOf(a.student_id);
      const t = teamOf(a.team_id);
      const key = t?.name ?? "Unknown team";
      if (!map.has(key)) map.set(key, { teamName: key, entries: [] });
      map.get(key)!.entries.push({ a, s });
    }
    return [...map.entries()].map(([, v]) => v);
  }, [detail, assignments, studentOf, teamOf]);

  /** For team users: only their own team's candidates */
  const myDetailCandidates = useMemo(() => {
    if (!detail || !myTeamId) return [];
    return assignments
      .filter((a) => a.program_id === detail.program_id && a.team_id === myTeamId)
      .map((a) => ({ a, s: studentOf(a.student_id) }));
  }, [detail, assignments, myTeamId, studentOf]);

  return (
    <PublicShell
      title="Schedule"
      subtitle="Stage timetable, timings and completion status of every programme."
    >
      {isAdmin && (
        <ManageTabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "manage", label: "Time Table" },
            { id: "print", label: "Print" },
          ]}
          value={tab}
          onChange={setTab}
        />
      )}
      {isAdmin && (tab === "manage" || tab === "print") ? (
        <div className="mx-auto max-w-7xl px-4 py-8">
          {tab === "print" ? <SchedulePrintPage /> : <TimetablePage />}
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-10">

          <div className="mb-6 grid grid-cols-2 gap-3 sm:flex sm:flex-row">
            <div className="relative col-span-2 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search programme, code or stage"
                className="rounded-full pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="rounded-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Upcoming</SelectItem>
              </SelectContent>
            </Select>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger className="col-span-2 rounded-full sm:w-48">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today / first day</SelectItem>
                <SelectItem value="all">All dates</SelectItem>
                {days.map((d) => (
                  <SelectItem key={d} value={d}>
                    {new Date(d).toLocaleDateString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    {d === today && " · Today"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            {/* Date sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-6 space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Jump to date</p>
                <div className="flex flex-wrap gap-2 lg:flex-col">
                  {days.map((d) => {
                    const active = activeDay === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDay(d)}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card hover:bg-muted/60"
                        }`}
                      >
                        <span className={`flex size-9 flex-col items-center justify-center rounded-xl text-[10px] font-bold ${
                          active ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          <span>{new Date(d).getDate()}</span>
                          <span className="uppercase">{new Date(d).toLocaleDateString(undefined, { month: "short" })}</span>
                        </span>
                        <span className="text-sm font-medium">
                          {new Date(d).toLocaleDateString(undefined, { weekday: "long" })}
                        </span>
                        {d === today && (
                          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            Today
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {days.length === 0 && (
                    <p className="text-sm text-muted-foreground">No dates scheduled.</p>
                  )}
                </div>
              </div>
            </aside>

            {/* Main schedule */}
            <div>
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              ) : grouped.length === 0 ? (
                <p className="panel p-12 text-center text-muted-foreground">
                  No programmes match your search yet.
                </p>
              ) : (
                <div className="space-y-8">
                  {grouped.map(([date, list], gi) => (
                    <section
                      key={date}
                      className="animate-rise"
                      style={{ animationDelay: `${gi * 60}ms` }}
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <span className="stage-gradient flex size-11 flex-col items-center justify-center rounded-2xl text-primary-foreground">
                          <span className="text-sm font-bold leading-none">
                            {new Date(date).getDate()}
                          </span>
                          <span className="text-[9px] uppercase leading-none">
                            {new Date(date).toLocaleDateString(undefined, { month: "short" })}
                          </span>
                        </span>
                        <div>
                          <h2 className="font-display text-lg font-semibold">
                            {new Date(date).toLocaleDateString(undefined, {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {list.length} programmes
                            {date === today && (
                              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                                Today
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {list.map((r) => (
                          <article key={r.id} className="panel panel-hover flex gap-3 p-4">
                            <span
                              className={`mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold tracking-wide shadow-sm ring-1 ring-inset ${
                                r.completed
                                  ? "bg-success/15 text-success ring-success/30"
                                  : "stage-gradient text-primary-foreground ring-white/20"
                              }`}
                              title={`Programme code ${r.programs?.code}`}
                            >
                              {r.programs?.code}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate font-display text-sm font-semibold">
                                {r.programs?.name}
                              </h3>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                {(r.event_time || r.end_time) && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-medium">
                                    <Clock className="size-3" />
                                    {formatTime(r.event_time)}
                                    {r.end_time && ` – ${formatTime(r.end_time)}`}
                                  </span>
                                )}
                                {r.stage && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="size-3" /> {r.stage}
                                  </span>
                                )}
                                <Badge variant="secondary" className="rounded-full">
                                  {r.programs?.type}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              {r.completed ? (
                                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-success/15 px-2 text-[10px] font-semibold text-success">
                                  <CheckCircle2 className="size-3" /> Done
                                </span>
                              ) : (
                                <span className="inline-flex h-6 items-center rounded-full bg-warning/20 px-2 text-[10px] font-semibold text-warning-foreground">
                                  Upcoming
                                </span>
                              )}
                              {(isAdmin || isTeam) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  aria-label="View candidates"
                                  onClick={() => setDetail(r)}
                                >
                                  <Eye className="size-4" />
                                </Button>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {detail?.programs?.code} · {detail?.programs?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {detail?.programs?.type} · {detail?.programs?.category}
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {(detail?.event_time || detail?.end_time) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
                <Clock className="size-3" />
                {formatTime(detail?.event_time ?? null)}
                {detail?.end_time && ` – ${formatTime(detail.end_time)}`}
              </span>
            )}
            {detail?.stage && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
                <MapPin className="size-3" /> {detail.stage}
              </span>
            )}
          </div>

          {/* Admin: show all teams' candidates grouped by team */}
          {isAdmin && (
            <div className="space-y-4">
              {adminDetailByTeam.length === 0 ? (
                <p className="text-sm text-muted-foreground">No candidates assigned yet.</p>
              ) : (
                adminDetailByTeam.map(({ teamName, entries }) => (
                  <div key={teamName}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      {teamName} · {entries.length} candidate(s)
                    </p>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {entries.map(({ a, s }) => (
                        <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                          {s?.photo_url ? (
                            <img src={s.photo_url} alt={s.name} className="size-8 rounded-full object-cover" />
                          ) : (
                            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {(s?.name ?? "?").slice(0, 1)}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{s?.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              Ad.No {s?.adno ?? "—"} · Class {s?.class ?? "—"}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Team users: show only their team's candidates */}
          {isTeam && (
            <div className="space-y-2">
              {myDetailCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Your team has no candidates in this programme yet.</p>
              ) : (
                myDetailCandidates.map(({ a, s }) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    {s?.photo_url ? (
                      <img src={s.photo_url} alt={s.name} className="size-10 rounded-full object-cover ring-2 ring-primary/20" />
                    ) : (
                      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {(s?.name ?? "?").slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        Ad.No {s?.adno ?? "—"} · Class {s?.class ?? "—"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PublicShell>
  );
}
