import { Eye, Search } from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { fetchAllRows, supabase, type TimetableRow } from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";


type AssignRow = {
  id: string;
  program_id: string;
  students: { adno: string; name: string; class: string | null } | null;
  teams: { name: string } | null;
};

export function OverviewPage() {
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [assignments, setAssignments] = useState<AssignRow[]>([]);
  const [q, setQ] = useState("");
  const [day, setDay] = useState("all");
  const [detail, setDetail] = useState<TimetableRow | null>(null);

  const load = useCallback(async () => {
    const [tt, as] = await Promise.all([
        supabase
          .from("timetable")
          .select("*, programs(code,name,category,type)")
          .order("event_date")
          .order("event_time"),
        fetchAllRows<AssignRow>(() =>
          supabase
            .from("assignments")
            .select("id, program_id, students(adno,name,class), teams(name)", { count: "exact" })
            .order("id") as never,
        ).then((data) => ({ data })),
      ]);
    setRows((tt.data as TimetableRow[]) ?? []);
    setAssignments((as.data as unknown as AssignRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["timetable", "assignments", "programs", "students", "teams"], () => void load());

  const days = useMemo(
    () => [...new Set(rows.map((r) => r.event_date))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const groups = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (day !== "all" && r.event_date !== day) return false;
      if (!q) return true;
      return `${r.programs?.code ?? ""} ${r.programs?.name ?? ""} ${r.stage ?? ""}`
        .toLowerCase()
        .includes(q.toLowerCase());
    });
    const map = new Map<string, TimetableRow[]>();
    for (const r of filtered) {
      const list = map.get(r.event_date) ?? [];
      list.push(r);
      map.set(r.event_date, list);
    }
    // completed programmes always sink to the bottom of their day
    for (const list of map.values())
      list.sort((a, b) => Number(a.completed) - Number(b.completed));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows, q, day]);

  const done = rows.filter((r) => r.completed).length;

  const byTeam = useMemo(() => {
    if (!detail) return [] as [string, AssignRow[]][];
    const map = new Map<string, AssignRow[]>();
    for (const a of assignments.filter((x) => x.program_id === detail.program_id)) {
      const key = a.teams?.name ?? "Unassigned team";
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [assignments, detail]);

  return (
    <div>
      <PageHeading title="Overview" />
      <p className="text-sm text-muted-foreground">
        {done} completed · {rows.length - done} pending of {rows.length} scheduled items
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search programme or stage"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            {days.map((d) => (
              <SelectItem key={d} value={d}>
                {new Date(d).toDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 space-y-6">
        {groups.map(([date, list]) => (
          <section key={date} className="panel overflow-hidden">
            <header className="flex items-center justify-between gap-2 bg-muted/60 px-4 py-2">
              <h2 className="truncate font-display text-sm font-semibold uppercase tracking-wide">
                {new Date(date).toDateString()}
              </h2>
              <span className="shrink-0 text-xs text-muted-foreground">{list.length} items</span>
            </header>
            <ul className="divide-y divide-border">
              {list.map((r) => (
                <li key={r.id} className="px-4 py-3 text-sm">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {r.event_time?.slice(0, 5) ?? "--:--"}
                        </span>
                        <span className="font-mono text-xs">{r.programs?.code}</span>
                        <span className="truncate font-medium">{r.programs?.name}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{r.programs?.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {r.stage ?? "Stage TBA"}
                        </span>
                        <Badge variant={r.completed ? "default" : "outline"}>
                          {r.completed ? "Completed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      aria-label="View candidates"
                      onClick={() => setDetail(r)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && (
          <p className="panel p-8 text-center text-muted-foreground">Nothing scheduled yet.</p>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {detail?.programs?.code} · {detail?.programs?.name}
            </DialogTitle>
          </DialogHeader>
          {byTeam.length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidates assigned yet.</p>
          ) : (
            <div className="space-y-4">
              {byTeam.map(([team, list]) => (
                <div key={team}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {team} · {list.length}
                  </p>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {list.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <span className="font-mono text-xs text-muted-foreground">
                          {a.students?.adno}
                        </span>
                        <span className="flex-1 truncate">{a.students?.name}</span>
                        <span className="text-xs text-muted-foreground">{a.students?.class}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
