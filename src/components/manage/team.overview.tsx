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
import { supabase, type TimetableRow } from "@/lib/supabase";
import { teamRpc } from "@/lib/team-auth";
import { TeamOwnChart } from "@/components/manage/team-own-chart";
import { TeamPointsLineChart } from "@/components/manage/team-points-line";
import type { TeamStudent } from "@/lib/team-data";
import { PageHeading } from "@/components/PageHeading";


export function TeamOverview() {
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [students, setStudents] = useState<TeamStudent[]>([]);
  const [q, setQ] = useState("");
  const [day, setDay] = useState("all");
  const [detail, setDetail] = useState<TimetableRow | null>(null);

  const load = useCallback(async () => {
    {
      const { data } = await supabase
        .from("timetable")
        .select("*, programs(code,name,category,type)")
        .order("event_date")
        .order("event_time");
      setRows((data as TimetableRow[]) ?? []);
      try {
        setStudents(await teamRpc<TeamStudent[]>("team_students"));
      } catch {
        setStudents([]);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["timetable", "programs", "assignments", "students"], () => void load());

  const ourCandidates = useMemo(() => {
    const map = new Map<string, { adno: string; name: string; class: string | null }[]>();
    for (const s of students) {
      for (const p of s.programs) {
        const list = map.get(p.code) ?? [];
        list.push({ adno: s.adno, name: s.name, class: s.class });
        map.set(p.code, list);
      }
    }
    return map;
  }, [students]);

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
    for (const list of map.values())
      list.sort((a, b) => Number(a.completed) - Number(b.completed));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows, q, day]);

  const detailList = detail ? (ourCandidates.get(detail.programs?.code ?? "") ?? []) : [];

  return (
    <div>
      <PageHeading title="Overview" />
      <p className="text-sm text-muted-foreground">
        Full fest schedule with your own candidates highlighted.
      </p>

      <div className="mt-5">
        <TeamOwnChart />
      </div>

      <div className="mt-5">
        <TeamPointsLineChart
          source="team"
          title="Your points progress"
          subtitle="Your team's cumulative points as results are published."
        />
      </div>

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

      <div className="mt-5 space-y-6">
        {groups.map(([date, list]) => (
          <section key={date} className="panel overflow-hidden">
            <header className="bg-muted/60 px-4 py-2 text-sm font-semibold uppercase tracking-wide">
              {new Date(date).toDateString()}
            </header>
            <ul className="divide-y divide-border">
              {list.map((r) => {
                const ours = ourCandidates.get(r.programs?.code ?? "") ?? [];
                return (
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
                          <span className="text-xs text-muted-foreground">{r.stage ?? "TBA"}</span>
                          <Badge variant={r.completed ? "default" : "outline"}>
                            {r.completed ? "Completed" : "Pending"}
                          </Badge>
                          {ours.length > 0 && (
                            <Badge variant="outline" className="border-primary text-primary">
                              {ours.length} of ours
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        aria-label="View our candidates"
                        onClick={() => setDetail(r)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
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
          {detailList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your team has no candidates in this programme yet.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {detailList.map((c) => (
                <li key={c.adno} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{c.adno}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.class}</span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
