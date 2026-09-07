import { CheckCircle2, Loader2, Lock, Pencil, Printer, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { printResultSheet } from "@/lib/print-results";
import { useSiteSettings } from "@/lib/site";
import { sortGroups, useResultFilters } from "./filters";
import { fetchEntries, positionText, type ResultEntry } from "@/lib/results";
import { colorOf, useTeamColors } from "@/lib/team-colors";
import { fetchPenalties, penaltyFor, penaltyIndex } from "@/lib/penalties";
import { supabase } from "@/lib/supabase";

function useEntries(status: "enrolled" | "draft" | "published" | "all") {
  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setEntries(await fetchEntries(status === "all" ? undefined : status));
    setLoading(false);
  };


  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`entries-${status}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "result_entries" }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return { entries, loading, reload: load };
}

function teamTotals(entries: ResultEntry[]) {
  const map = new Map<string, number>();
  for (const e of entries) {
    const name = e.teams?.name ?? "—";
    map.set(name, (map.get(name) ?? 0) + e.points);
  }
  return [...map.entries()]
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);
}

function groupByProgram(entries: ResultEntry[]) {
  const map = new Map<string, { code: string; name: string; category?: string; rows: ResultEntry[] }>();
  for (const e of entries) {
    const code = e.programs?.code ?? "—";
    const g = map.get(code) ?? {
      code,
      name: e.programs?.name ?? "",
      category: e.programs?.category ?? "",
      rows: [],
    };
    g.rows.push(e);
    map.set(code, g);
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
}

/** Minus marks per team, kept live so totals always show the deduction. */
export function usePenaltyIndex() {
  const [index, setIndex] = useState<Map<string, number>>(new Map());

  const load = async () => setIndex(penaltyIndex(await fetchPenalties()));

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`penalties-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_penalties" }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return index;
}

function TotalsStrip({ rows }: { rows: { name: string; points: number }[] }) {
  const penalties = usePenaltyIndex();
  const colors = useTeamColors();
  if (rows.length === 0) return null;
  const net = rows.map((r) => {
    const minus = penaltyFor(penalties, r.name);
    return { ...r, minus, total: r.points - minus };
  });
  const grand = net.reduce((s, r) => s + r.total, 0);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {net.map((t, i) => (
        <div key={t.name} className="panel p-4">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ background: colorOf(colors, i, t.name) }}
          />
          <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{t.name}</p>
          <p className="text-3xl font-semibold">{t.total}</p>
          {t.minus > 0 && (
            <p className="mt-1 text-xs text-destructive">
              {t.points} − {t.minus} minus marks
            </p>
          )}
        </div>
      ))}
      <div className="panel flex flex-col items-center border-primary/40 bg-primary/5 p-4 text-center sm:col-span-2 lg:col-span-4">
        <span className="inline-block size-2.5 rounded-full bg-primary" />
        <p className="mt-2 text-xs uppercase tracking-wide text-primary">Grand total</p>
        <p className="text-3xl font-semibold text-primary">{grand}</p>
      </div>
    </div>
  );
}



/** Manual override of position, grade and points for one programme. */
function EditProgramDialog({
  group,
  onSaved,
}: {
  group: { code: string; name: string; rows: ResultEntry[] };
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, { position: string; grade: string; points: string }>>({});
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft(
      Object.fromEntries(
        group.rows.map((r) => [
          r.id,
          {
            position: r.position != null ? String(r.position) : "",
            grade: r.grade ?? "",
            points: String(r.points ?? 0),
          },
        ]),
      ),
    );
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    for (const [id, v] of Object.entries(draft)) {
      const { error } = await supabase
        .from("result_entries")
        .update({
          position: v.position === "" ? null : Number(v.position),
          grade: v.grade.trim() === "" ? null : v.grade.trim().toUpperCase(),
          points: Number(v.points) || 0,
        })
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setOpen(false);
    toast.success(`${group.code} updated`);
    onSaved();
  };

  return (
    <>
      <Button size="sm" variant="ghost" onClick={start} title="Edit manually">
        <Pencil className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit {group.code} — {group.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {group.rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">
                  {r.students?.name
                    ? `${r.students.name} (${r.teams?.short_name || r.teams?.name || "—"})`
                    : (r.teams?.name ?? "—")}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Position
                    <Input
                      className="mt-1 h-8 text-xs"
                      value={draft[r.id]?.position ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [r.id]: { ...d[r.id]!, position: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Grade
                    <Input
                      className="mt-1 h-8 text-xs"
                      value={draft[r.id]?.grade ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [r.id]: { ...d[r.id]!, grade: e.target.value } }))
                      }
                    />
                  </label>
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Points
                    <Input
                      className="mt-1 h-8 text-xs"
                      value={draft[r.id]?.points ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [r.id]: { ...d[r.id]!, points: e.target.value } }))
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProgramRows({
  groups,
  action,
  actionLabel,
  backAction,
  backLabel,
  onSaved,
}: {
  groups: ReturnType<typeof groupByProgram>;
  action: (code: string, rows: ResultEntry[]) => void;
  actionLabel: string;
  backAction?: (code: string, rows: ResultEntry[]) => void;
  backLabel?: string;
  onSaved?: () => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {groups.map((g) => (
        <li key={g.code} className="px-4 py-3 text-sm">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-40 flex-1">
              <p className="font-medium">
                <span className="font-mono text-xs text-muted-foreground">{g.code}</span> {g.name}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                {g.rows
                  .filter((r) => r.position || r.grade)
                  .sort((a, b) => (a.position ?? 9) - (b.position ?? 9))
                  .map((r) => {
                    const teamStr = r.teams?.short_name || r.teams?.name;
                    const nameStr = r.students?.name
                      ? `${r.students.name}${teamStr ? ` (${teamStr})` : ""}`
                      : (r.teams?.name ?? "—");
                    return (
                      <span key={r.id} className="rounded-full bg-muted px-2 py-0.5 font-medium">
                        {r.position ? `${positionText(r.position)} · ` : ""}
                        {nameStr}
                        {r.grade ? ` · Grade ${r.grade}` : ""} · {r.points} pts
                      </span>
                    );
                  })}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <EditProgramDialog group={g} onSaved={() => onSaved?.()} />
              {backAction && (
                <Button size="sm" variant="ghost" onClick={() => backAction(g.code, g.rows)}>
                  <Undo2 className="mr-1 size-4" />
                  {backLabel ?? "Back"}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => action(g.code, g.rows)}>
                {actionLabel}
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}


export function DraftPage() {
  const { entries: drafts, loading, reload } = useEntries("draft");
  const { settings } = useSiteSettings();
  const [published, setPublished] = useState<ResultEntry[]>([]);

  useEffect(() => {
    void fetchEntries("published").then(setPublished);
  }, [drafts.length]);

  const combined = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of [...published, ...drafts]) {
      const name = e.teams?.name ?? "—";
      map.set(name, (map.get(name) ?? 0) + e.points);
    }
    return [...map.entries()]
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points);
  }, [published, drafts]);

  const setStatus = async (ids: string[], status: string, message: string) => {
    const patch: Record<string, unknown> = { status };
    if (status === "published") patch["published_at"] = new Date().toISOString();
    const { error } = await supabase.from("result_entries").update(patch).in("id", ids);
    if (error) toast.error(error.message);
    else toast.success(message);
    void reload();
  };

  const { filtered, sort, node: filterBar } = useResultFilters(drafts);
  const groups = sortGroups(groupByProgram(filtered), sort);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Published + draft totals</h2>
        <p className="text-sm text-muted-foreground">
          What each team's total becomes once every draft below is published.
        </p>
      </div>
      <TotalsStrip rows={combined} />
      <div className="panel p-4">{filterBar}</div>


      <section className="panel overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 bg-muted/60 px-4 py-2">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide">Drafts</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={groups.length === 0}
              onClick={() =>
                printResultSheet(groups, {
                  title: `${settings.fest_name} · Draft results`,
                  mode: "both",
                  logoUrl: settings.logo_url,
                })
              }
            >
              <Printer className="mr-1 size-4" /> Print results
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={groups.length === 0}
              onClick={() =>
                printResultSheet(groups, {
                  title: `${settings.fest_name} · Winners`,
                  mode: "winners",
                  logoUrl: settings.logo_url,
                })
              }
            >
              <Printer className="mr-1 size-4" /> Print 1st–3rd
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={groups.length === 0}
              onClick={() =>
                printResultSheet(groups, {
                  title: `${settings.fest_name} · Grades`,
                  mode: "grades",
                  logoUrl: settings.logo_url,
                })
              }
            >
              <Printer className="mr-1 size-4" /> Print grades
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={drafts.length === 0}
              onClick={() =>
                void setStatus(drafts.map((d) => d.id), "enrolled", "Moved back to Enrolled")
              }
            >
              <Undo2 className="mr-1 size-4" /> All to Enrolled
            </Button>
            <Button
              size="sm"
              disabled={drafts.length === 0}
              onClick={() =>
                void setStatus(drafts.map((d) => d.id), "published", "All drafts published")
              }
            >
              <CheckCircle2 className="mr-1 size-4" /> Publish all
            </Button>
          </div>
        </header>
        {loading ? (
          <div className="p-6 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No draft result yet.</p>
        ) : (
          <ProgramRows
            groups={groups}
            actionLabel="Publish"
            backLabel="To Enrolled"
            onSaved={() => void reload()}
            backAction={(code, rows) =>
              void setStatus(rows.map((r) => r.id), "enrolled", `${code} moved to Enrolled`)
            }
            action={(code, rows) =>
              void setStatus(rows.map((r) => r.id), "published", `${code} published`)
            }
          />

        )}
      </section>
    </div>
  );
}

export function PublishedPage() {
  const { entries, loading, reload } = useEntries("published");
  const { settings } = useSiteSettings();
  const totals = teamTotals(entries);
  const { filtered, sort, node: filterBar } = useResultFilters(entries);
  const groups = sortGroups(groupByProgram(filtered), sort);


  const setStatus = async (ids: string[], status: string, message: string) => {
    const { error } = await supabase.from("result_entries").update({ status }).in("id", ids);
    if (error) toast.error(error.message);
    else toast.success(message);
    void reload();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Published totals</h2>
        <p className="text-sm text-muted-foreground">
          Official team points from every published programme.
        </p>
      </div>
      <TotalsStrip rows={totals} />
      <div className="panel p-4">{filterBar}</div>


      <section className="panel overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 bg-muted/60 px-4 py-2">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
            Published programmes
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={groups.length === 0}
              onClick={() =>
                printResultSheet(groups, {
                  title: `${settings.fest_name} · Published results`,
                  mode: "both",
                  logoUrl: settings.logo_url,
                })
              }
            >
              <Printer className="mr-1 size-4" /> Print results
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={groups.length === 0}
              onClick={() =>
                printResultSheet(groups, {
                  title: `${settings.fest_name} · Winners`,
                  mode: "winners",
                  logoUrl: settings.logo_url,
                })
              }
            >
              <Printer className="mr-1 size-4" /> Print 1st–3rd
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={groups.length === 0}
              onClick={() =>
                printResultSheet(groups, {
                  title: `${settings.fest_name} · Grades`,
                  mode: "grades",
                  logoUrl: settings.logo_url,
                })
              }
            >
              <Printer className="mr-1 size-4" /> Print grades
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={entries.length === 0}
              onClick={() =>
                void setStatus(entries.map((e) => e.id), "draft", "Everything moved back to Draft")
              }
            >
              All to Draft
            </Button>
          </div>
        </header>
        {loading ? (
          <div className="p-6 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Nothing published yet.</p>
        ) : (
          <ProgramRows
            groups={groups}
            actionLabel="Back to Draft"
            onSaved={() => void reload()}
            action={(code, rows) =>
              void setStatus(rows.map((r) => r.id), "draft", `${code} moved to Draft`)
            }
          />
        )}
      </section>
    </div>
  );
}

const TOTAL_PASSCODE = "987654";

function PasscodeGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() === TOTAL_PASSCODE) onUnlock();
    else toast.error("Wrong passcode");
  };
  return (
    <form onSubmit={submit} className="panel mx-auto mt-6 max-w-sm space-y-4 p-6 text-center">
      <Lock className="mx-auto size-7 text-primary" />
      <div>
        <h2 className="font-display text-lg font-semibold">Protected page</h2>
        <p className="text-sm text-muted-foreground">
          Enter the passcode to view the overall totals.
        </p>
      </div>
      <Input
        type="password"
        inputMode="numeric"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Passcode"
        className="text-center tracking-[0.4em]"
      />
      <Button type="submit" className="w-full">
        Unlock
      </Button>
    </form>
  );
}

export function TotalEnrolledPage() {
  const [unlocked, setUnlocked] = useState(false);
  const { entries, loading } = useEntries("all");
  const { filtered, sort, node: filterBar } = useResultFilters(entries);

  const teams = teamTotals(filtered);
  const students = useMemo(() => {
    const map = new Map<
      string,
      { name: string; adno: string; team: string; cls: string; points: number }
    >();
    for (const e of filtered) {
      if (!e.student_id || !e.students) continue;
      const cur = map.get(e.student_id) ?? {
        name: e.students.name,
        adno: e.students.adno,
        team: e.teams?.short_name || e.teams?.name || "—",
        cls: e.students.class ?? "—",
        points: 0,
      };
      cur.points += e.points;
      map.set(e.student_id, cur);
    }
    const list = [...map.values()];
    switch (sort) {
      case "team":
        return list.sort((a, b) => a.team.localeCompare(b.team) || b.points - a.points);
      case "code":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list.sort((a, b) => b.points - a.points);
    }
  }, [filtered, sort]);

  if (!unlocked) return <PasscodeGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Total enrolled</h2>
        <p className="text-sm text-muted-foreground">
          Overall standings counted from every mark — enrolled, draft and published together.
        </p>
      </div>
      <div className="panel p-4">{filterBar}</div>

      {loading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <TotalsStrip rows={teams} />

          <section className="panel overflow-hidden">
            <header className="bg-muted/60 px-4 py-2 text-sm font-semibold uppercase tracking-wide">
              Students
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Ad.No</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Team</th>
                    <th className="p-3">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((s, i) => (
                    <tr key={s.adno}>
                      <td className="p-3 text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-mono text-xs">{s.adno}</td>
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3">{s.cls}</td>
                      <td className="p-3">{s.team}</td>
                      <td className="p-3 font-semibold">{s.points}</td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No marks yet.
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
