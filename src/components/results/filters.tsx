import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResultEntry } from "@/lib/results";

export type ResultSort = "code" | "points" | "team" | "recent";

export const SORT_LABELS: Record<ResultSort, string> = {
  code: "Programme code",
  points: "Points (high → low)",
  team: "Team name",
  recent: "Recently updated",
};

/** Class + team + category filtering and sorting shared by every result stage. */
export function useResultFilters(entries: ResultEntry[]) {
  const [cls, setCls] = useState("all");
  const [team, setTeam] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<ResultSort>("code");

  const classes = useMemo(
    () =>
      [...new Set(entries.map((e) => e.students?.class).filter((c): c is string => Boolean(c)))].sort(
        (a, b) => a.localeCompare(b, undefined, { numeric: true }),
      ),
    [entries],
  );

  const teams = useMemo(
    () =>
      [...new Set(entries.map((e) => e.teams?.name).filter((t): t is string => Boolean(t)))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [entries],
  );

  const categories = useMemo(
    () =>
      [
        ...new Set(
          entries
            .map((e) => e.programs?.category ?? e.students?.category)
            .filter((c): c is string => Boolean(c)),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (cls === "all" || e.students?.class === cls) &&
          (team === "all" || e.teams?.name === team) &&
          (category === "all" ||
            e.programs?.category === category ||
            (!e.programs?.category && e.students?.category === category)),
      ),
    [entries, cls, team, category],
  );

  const node = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Class</Label>
        <Select value={cls} onValueChange={setCls}>

          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Team</Label>
        <Select value={team} onValueChange={setTeam}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
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
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sort by</Label>
        <Select value={sort} onValueChange={(v) => setSort(v as ResultSort)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as ResultSort[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return { filtered, sort, node, cls, team, category };

}

export type ProgramGroup = { code: string; name: string; category?: string; rows: ResultEntry[] };

export function sortGroups(groups: ProgramGroup[], sort: ResultSort): ProgramGroup[] {
  const list = [...groups];
  const points = (g: ProgramGroup) => g.rows.reduce((s, r) => s + r.points, 0);
  const topTeam = (g: ProgramGroup) =>
    [...g.rows]
      .map((r) => r.teams?.name ?? "")
      .sort((a, b) => a.localeCompare(b))[0] ?? "";
  const recent = (g: ProgramGroup) =>
    Math.max(...g.rows.map((r) => new Date(r.updated_at ?? r.created_at).getTime() || 0));

  switch (sort) {
    case "points":
      return list.sort((a, b) => points(b) - points(a) || a.code.localeCompare(b.code));
    case "team":
      return list.sort((a, b) => topTeam(a).localeCompare(topTeam(b)) || a.code.localeCompare(b.code));
    case "recent":
      return list.sort((a, b) => recent(b) - recent(a));
    default:
      return list.sort((a, b) => a.code.localeCompare(b.code));
  }
}
