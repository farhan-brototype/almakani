import { Search } from "lucide-react";
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
import { StatusDot } from "@/components/StatusDot";
import {
  countsFromTypes,
  fetchFestRules,
  infoStatus,
  limitFor,
  studentStatus,
  typeStatus,
  type LimitRow,
} from "@/lib/fest-rules";
import { teamRpc } from "@/lib/team-auth";
import { type TeamStudent } from "@/lib/team-data";
import { PageHeading } from "@/components/PageHeading";
import { useTaxonomy } from "@/lib/taxonomy";
import { useRealtime } from "@/hooks/use-realtime";



export function OurStudents() {
  const { categories, types } = useTaxonomy();
  const [students, setStudents] = useState<TeamStudent[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [detail, setDetail] = useState<TeamStudent | null>(null);
  const [limits, setLimits] = useState<LimitRow[]>([]);

  const load = useCallback(async () => {
    try {
      setStudents(await teamRpc<TeamStudent[]>("team_students"));
    } catch {
      setStudents([]);
    }
    setLimits((await fetchFestRules()).limits);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(
    ["students", "assignments", "programs", "category_limits", "categories", "category_items"],
    () => void load(),
  );


  const statusOf = (s: TeamStudent) =>
    studentStatus(
      countsFromTypes(s.programs.map((p) => p.type)),
      limitFor(limits, s.category),
    );



  /** One traffic light per programme type, plus an unlimited Kulliyya row. */
  const typeRows = (s: TeamStudent) => {
    const counts = countsFromTypes(s.programs.map((p) => p.type));
    const limit = limitFor(limits, s.category);
    const rows = types.map((t) => typeStatus(t, counts, limit));
    const kulliyya = s.programs.filter((p) => (p.category ?? "").toLowerCase() === "kulliyya").length;
    rows.push(infoStatus("Kulliyya", kulliyya));
    return rows;
  };

  const filtered = useMemo(
    () =>
      students.filter((s) => {
        if (q && !`${s.adno} ${s.name}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (category !== "all" && s.category !== category) return false;
        return true;
      }),
    [students, q, category],
  );

  return (
    <div>
      <PageHeading title="Our Students" />
      <p className="text-sm text-muted-foreground">{students.length} students in your team</p>

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
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <article key={s.id} className="panel p-4">
            <div className="flex items-center gap-3">
              {s.photo_url ? (
                <img src={s.photo_url} alt={s.name} className="size-12 rounded-full object-cover" />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-full bg-muted text-sm">
                  {s.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  <StatusDot status={statusOf(s)} />
                  <span className="truncate">{s.name}</span>
                </p>

                <p className="font-mono text-xs text-muted-foreground">
                  {s.adno} · class {s.class ?? "—"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{s.category ?? "—"}</Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              {typeRows(s).map((r) => (
                <span key={r.type} className="flex items-center gap-1.5" title={r.label}>
                  <StatusDot status={r} />
                  <span className="truncate text-muted-foreground">{r.type}</span>
                  <span className="ml-auto font-medium tabular-nums">
                    {r.used}
                    {r.max !== null ? `/${r.max}` : ""}
                  </span>
                </span>
              ))}
            </div>
            <Button variant="link" size="sm" className="mt-2 px-0" onClick={() => setDetail(s)}>
              View programmes
            </Button>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="panel p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">
            No students found.
          </p>
        )}
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {detail?.name} · {detail?.adno}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {detail?.programs.length === 0 && (
              <p className="text-sm text-muted-foreground">No programmes entered yet.</p>
            )}
            {detail?.programs.map((p) => (
              <div
                key={`${p.code}-${p.event_date}`}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <p className="font-medium">
                  <span className="font-mono text-muted-foreground">{p.code}</span> · {p.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.type} · {p.category} · {p.event_date ?? "date TBA"}{" "}
                  {p.event_time ? p.event_time.slice(0, 5) : ""} · {p.stage ?? "stage TBA"} ·{" "}
                  {p.completed ? "Completed" : "Pending"}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
