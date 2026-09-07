import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Eye, Loader2, Radio, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FEST } from "@/config";
import { useAppSession } from "@/hooks/use-session";
import { useSiteSettings, refreshSiteSettings } from "@/lib/site";
import { fetchLiveResults, type PublicResultRow } from "@/lib/results";
import { supabase } from "@/lib/supabase";

const FEST_LOGO = "/almakani-logo.png";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: `Live Results — ${FEST.name}` },
      {
        name: "description",
        content: `Watch ${FEST.name} results as the announcer publishes them, position by position.`,
      },
      { property: "og:title", content: `Live Results — ${FEST.name}` },
      { property: "og:description", content: `Live result announcements of ${FEST.name}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

type Reveal = {
  program_id: string;
  show_details: boolean;
  show_first: boolean;
  show_others: boolean;
  show_second: boolean;
  show_third: boolean;
  show_all_grades: boolean;
  revealed_grades: string[];
};

type LiveGroup = {
  program_id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  rows: PublicResultRow[];
  allPublished: boolean;
  updated: string;
};

function Photo({ row, size = "size-14" }: { row: PublicResultRow; size?: string }) {
  if (row.photo_url) {
    return (
      <img
        src={row.photo_url}
        alt={row.student_name ?? "Winner"}
        loading="lazy"
        className={`${size} shrink-0 rounded-full object-cover ring-2 ring-primary/30`}
      />
    );
  }
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary`}
    >
      {(row.student_name ?? row.team_name ?? "?").slice(0, 1)}
    </span>
  );
}

const PLACE = {
  1: { label: "First", ring: "ring-amber-500", bg: "from-amber-400/20", pad: "sm:-translate-y-3", size: "size-28" },
  2: { label: "Second", ring: "ring-slate-400", bg: "from-slate-400/15", pad: "", size: "size-24" },
  3: { label: "Third", ring: "ring-orange-700/60", bg: "from-orange-700/15", pad: "", size: "size-24" },
} as const;

/** Fixed podium slot — always occupies its space; shows a quiet placeholder until revealed. */
function StageSlot({
  row,
  place,
  revealed,
  compact = false,
}: {
  row: PublicResultRow | null;
  place: 1 | 2 | 3;
  revealed: boolean;
  compact?: boolean;
}) {
  const meta = PLACE[place];
  const photo = compact ? "size-16" : meta.size;
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b ${meta.bg} to-transparent p-4 text-center ring-1 ring-border ${meta.pad}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {meta.label}
      </span>
      {row && revealed ? (
        <>
          <span className={`rounded-full ring-4 ${meta.ring}`}>
            <Photo row={row} size={photo} />
          </span>
          <p className="text-base font-semibold leading-tight">
            {row.student_name ?? row.team_name ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.team_name ?? row.team_short ?? "—"}
          </p>
          {row.grade && (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              Grade {row.grade}
            </span>
          )}
        </>
      ) : (
        <>
          <span
            className={`${photo} flex items-center justify-center rounded-full border border-dashed border-border text-muted-foreground`}
          >
            <Trophy className="size-5" />
          </span>
          <p className="text-xs text-muted-foreground">Awaiting announcement</p>
        </>
      )}
    </div>
  );
}

/** The fixed, designed stage layout shown to the public. */
function LiveStage({ group, rev }: { group: LiveGroup | null; rev: Reveal | undefined }) {
  const at = (p: number) => group?.rows.find((r) => r.position === p) ?? null;
  const first = at(1);
  const second = at(2);
  const third = at(3);
  const gradeOnly =
    group?.rows.filter((r) => (r.position == null || r.position > 3) && r.grade) ?? [];
  const showGrades = (id: string) => !!rev?.show_all_grades || (rev?.revealed_grades ?? []).includes(id);

  return (
    <div className="flex min-h-[60vh] flex-col">
      {/* Programme header — always in the upper position */}
      <div className="text-center">
        {group ? (
          rev?.show_details ? (
            <>
              <p className="text-2xl font-semibold tracking-tight sm:text-4xl">
                <span className="font-mono text-base text-muted-foreground">{group.code}</span>{" "}
                {group.name}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground sm:text-sm">
                {group.category} Category
              </p>
            </>
          ) : (
            <p className="text-lg font-semibold text-muted-foreground">
              Results will be announcing soon
            </p>
          )
        ) : (
          <p className="text-lg font-semibold text-muted-foreground">
            Results will be announcing soon
          </p>
        )}
      </div>

      <div className="my-4 h-px w-full bg-border/60" />

      {/* Places — First centered (largest), Second & Third beneath */}
      {group && rev?.show_details ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex justify-center">
            <StageSlot row={first} place={1} revealed={!!rev?.show_first} />
          </div>
          <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
            <StageSlot row={second} place={2} revealed={!!rev?.show_second} />
            <StageSlot row={third} place={3} revealed={!!rev?.show_third} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-muted-foreground">
          Keep this page open — new results appear automatically.
        </div>
      )}

      {/* Grade-only — smaller cards beneath the places */}
      {group && rev?.show_details && gradeOnly.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Grade only
          </p>
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
            {gradeOnly.map((r) =>
              showGrades(r.id) ? (
                <div
                  key={r.id}
                  className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 p-3 text-center ring-1 ring-border"
                >
                  <Photo row={r} size="size-12" />
                  <p className="text-sm font-medium leading-tight">
                    {r.student_name ?? r.team_name ?? "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.team_short || r.team_name || "—"}
                  </p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    Grade {r.grade}
                  </span>
                </div>
              ) : (
                <div
                  key={r.id}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground"
                >
                  <Trophy className="size-4" />
                  Grade only
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LivePage() {
  const { role } = useAppSession();
  const isAdmin = role === "admin";
  const { settings } = useSiteSettings();
  const liveOn = settings.live_enabled;

  const [rows, setRows] = useState<PublicResultRow[]>([]);
  const [reveals, setReveals] = useState<Record<string, Reveal>>({});
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState<string[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    const [live, { data: rev }] = await Promise.all([
      fetchLiveResults(),
      supabase.from("live_reveals").select("*"),
    ]);
    setRows(live);
    const map: Record<string, Reveal> = {};
    for (const r of (rev as Reveal[]) ?? []) {
      map[r.program_id] = {
        ...r,
        revealed_grades: (r as { revealed_grades?: string[] }).revealed_grades ?? [],
      };
    }
    setReveals(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`live-results-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "result_entries" }, () =>
        void load(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "live_reveals" }, () =>
        void load(),
      )
      .subscribe();
    // Safety-net poll: stays correct even if the socket drops.
    const poll = setInterval(() => void load(), 4000);
    return () => {
      void supabase.removeChannel(channel);
      clearInterval(poll);
      for (const t of Object.values(timers.current)) clearTimeout(t);
    };
  }, [load]);

  const groups = useMemo<LiveGroup[]>(() => {
    const map = new Map<string, LiveGroup>();
    // Only show draft results — published ones belong on the results page, not here.
    for (const r of rows.filter((r) => r.status === "draft" || !r.status)) {
      const g = map.get(r.program_id) ?? {
        program_id: r.program_id,
        code: r.program_code,
        name: r.program_name,
        type: r.type,
        category: r.category,
        rows: [],
        allPublished: false,
        updated: r.updated_at ?? "",
      };
      g.rows.push(r);
      if ((r.updated_at ?? "") > g.updated) g.updated = r.updated_at ?? "";
      map.set(r.program_id, g);
    }
    return [...map.values()]
      .map((g) => ({ ...g, rows: g.rows.sort((a, b) => (a.position ?? 9) - (b.position ?? 9)) }))
      .sort((a, b) => b.updated.localeCompare(a.updated));
  }, [rows]);

  /** A programme is fully revealed when name + every present place + every grade is shown. */
  const isComplete = useCallback(
    (g: LiveGroup) => {
      const rev = reveals[g.program_id];
      if (!rev?.show_details) return false;
      const hasFirst = g.rows.some((r) => r.position === 1);
      const hasSecond = g.rows.some((r) => r.position === 2);
      const hasThird = g.rows.some((r) => r.position === 3);
      if (hasFirst && !rev.show_first) return false;
      if (hasSecond && !rev.show_second) return false;
      if (hasThird && !rev.show_third) return false;
      const gradeOnly = g.rows.filter((r) => (r.position == null || r.position > 3) && r.grade);
      if (rev.show_all_grades) return true;
      return gradeOnly.every((r) => rev.revealed_grades.includes(r.id));
    },
    [reveals],
  );

  // Auto-advance: once fully revealed, hold 3s then hide from both views.
  useEffect(() => {
    for (const g of groups) {
      const id = g.program_id;
      if (isComplete(g) && !finished.includes(id) && !timers.current[id]) {
        timers.current[id] = setTimeout(() => {
          setFinished((prev) => (prev.includes(id) ? prev : [...prev, id]));
          delete timers.current[id];
        }, 3000);
      }
      // If it became incomplete again (announcer toggled something off), re-show it.
      if (!isComplete(g) && finished.includes(id)) {
        setFinished((prev) => prev.filter((x) => x !== id));
      }
    }
    return () => {
      // only clear timers for programmes that are no longer complete
    };
  }, [groups, isComplete, finished]);

  const toggleLive = async (next: boolean) => {
    const { error } = await supabase
      .from("fest_settings")
      .update({ live_enabled: next })
      .eq("id", 1);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshSiteSettings();
    toast.success(next ? "Live results are ON" : "Live results are OFF");
  };

  const upsert = async (programId: string, patch: Partial<Reveal>) => {
    const current = reveals[programId];
    // Optimistic local update so the button responds instantly.
    setReveals((prev) => ({
      ...prev,
      [programId]: { ...(current as Reveal), ...patch, program_id: programId } as Reveal,
    }));
    const { error } = await supabase
      .from("live_reveals")
      .upsert({ program_id: programId, ...patch }, { onConflict: "program_id" });
    if (error) {
      toast.error(error.message);
      void load();
    }
  };

  const toggle = (programId: string, field: keyof Reveal) => {
    const current = reveals[programId];
    const next = !current?.[field];
    void upsert(programId, { [field]: next } as Partial<Reveal>);
  };

  const toggleGrade = async (programId: string, rowId: string) => {
    const current = reveals[programId] ?? {
      program_id: programId,
      show_details: false,
      show_first: false,
      show_others: false,
      show_second: false,
      show_third: false,
      show_all_grades: false,
      revealed_grades: [],
    };
    const has = current.revealed_grades.includes(rowId);
    const next = has
      ? current.revealed_grades.filter((x) => x !== rowId)
      : [...current.revealed_grades, rowId];
    void upsert(programId, { revealed_grades: next, show_all_grades: false });
  };

  // Programmes visible on the public stage (revealed name, not yet finished).
  const visibleForPublic = groups.filter(
    (g) => reveals[g.program_id]?.show_details && !finished.includes(g.program_id),
  );
  const current = visibleForPublic[0] ?? null;

  // ---- Chrome-free full-screen layout ----
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const TopBar = (
    <div className="flex items-center justify-between px-4 py-3 sm:px-8 sm:py-4">
      <img
        src={settings.logo_url || FEST_LOGO}
        alt="Al Makani"
        className="h-10 w-auto object-contain sm:h-12"
      />
      <Link
        to="/"
        className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium ring-1 ring-border transition-colors hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
        Home
      </Link>
    </div>
  );

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        {TopBar}
        <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-8">
          {/* Live toggle */}
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-base font-semibold">Live results</p>
              <p className="text-xs text-muted-foreground">
                {liveOn
                  ? "ON — visitors see the stage until you reveal."
                  : "OFF — visitors see “There is no results scheduled now”."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{liveOn ? "On" : "Off"}</span>
              <Switch
                checked={liveOn}
                aria-label="Toggle live results"
                onCheckedChange={(v) => void toggleLive(v)}
              />
            </div>
          </div>

          {/* Stage preview (what the public sees right now) */}
          <div className="panel mt-4 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Stage preview
            </p>
            {liveOn ? (
              <LiveStage group={current} rev={current ? reveals[current.program_id] : undefined} />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Radio className="size-6" />
                There is no results scheduled now
              </div>
            )}
          </div>

          {/* Announcer board */}
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Radio className="size-4 text-primary" /> Announcer board — reveal each part with the
            eye buttons.
          </div>

          {groups.filter((g) => !finished.includes(g.program_id)).length === 0 && (
            <p className="panel mt-3 p-6 text-center text-sm text-muted-foreground">
              Nothing to announce — move some results to Draft first.
            </p>
          )}

          <div className="mt-3 space-y-4">
            {groups
              .filter((g) => !finished.includes(g.program_id))
              .map((g) => {
                const rev = reveals[g.program_id];
                const first = g.rows.filter((r) => r.position === 1);
                const second = g.rows.filter((r) => r.position === 2);
                const third = g.rows.filter((r) => r.position === 3);
                const gradeOnly = g.rows.filter(
                  (r) => (r.position == null || r.position > 3) && r.grade,
                );
                const revGrades = rev?.revealed_grades ?? [];
                const gradeShown = (id: string) => !!rev?.show_all_grades || revGrades.includes(id);
                return (
                  <article
                    key={g.program_id}
                    className="panel space-y-3 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-semibold">
                          <span className="font-mono text-xs text-muted-foreground">{g.code}</span>{" "}
                          {g.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {g.category} Category · Draft
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={rev?.show_details ? "default" : "outline"}
                        className="gap-2"
                        onClick={() => toggle(g.program_id, "show_details")}
                      >
                        {rev?.show_details ? <Check className="size-4" /> : <Eye className="size-4" />}
                        Programme
                      </Button>
                    </div>

                    {/* First */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {first.map((r) => (
                          <span key={r.id} className="flex items-center gap-2 text-sm">
                            <Photo row={r} size="size-10" />
                            <span>
                              <span className="font-medium">
                                {r.student_name ?? r.team_name ?? "—"}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                First · {r.grade ?? "—"} · {r.team_short || r.team_name || "—"}
                              </span>
                            </span>
                          </span>
                        ))}
                        {first.length === 0 && (
                          <span className="text-xs text-muted-foreground">No first place yet</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={rev?.show_first ? "default" : "outline"}
                        className="gap-2"
                        onClick={() => toggle(g.program_id, "show_first")}
                      >
                        {rev?.show_first ? <Check className="size-4" /> : <Eye className="size-4" />}
                        First
                      </Button>
                    </div>

                    {/* Second */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {second.map((r) => (
                          <span key={r.id} className="flex items-center gap-2 text-sm">
                            <Photo row={r} size="size-9" />
                            <span>
                              <span className="font-medium">
                                {r.student_name ?? r.team_name ?? "—"}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                Second · {r.grade ?? "—"} · {r.team_short || r.team_name || "—"}
                              </span>
                            </span>
                          </span>
                        ))}
                        {second.length === 0 && (
                          <span className="text-xs text-muted-foreground">No second place yet</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={rev?.show_second ? "default" : "outline"}
                        className="gap-2"
                        onClick={() => toggle(g.program_id, "show_second")}
                      >
                        {rev?.show_second ? <Check className="size-4" /> : <Eye className="size-4" />}
                        Second
                      </Button>
                    </div>

                    {/* Third */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {third.map((r) => (
                          <span key={r.id} className="flex items-center gap-2 text-sm">
                            <Photo row={r} size="size-9" />
                            <span>
                              <span className="font-medium">
                                {r.student_name ?? r.team_name ?? "—"}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                Third · {r.grade ?? "—"} · {r.team_short || r.team_name || "—"}
                              </span>
                            </span>
                          </span>
                        ))}
                        {third.length === 0 && (
                          <span className="text-xs text-muted-foreground">No third place yet</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={rev?.show_third ? "default" : "outline"}
                        className="gap-2"
                        onClick={() => toggle(g.program_id, "show_third")}
                      >
                        {rev?.show_third ? <Check className="size-4" /> : <Eye className="size-4" />}
                        Third
                      </Button>
                    </div>

                    {/* Grade-only list */}
                    {gradeOnly.length > 0 && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            Grade only ({gradeOnly.length})
                          </p>
                          <Button
                            size="sm"
                            variant={rev?.show_all_grades ? "default" : "outline"}
                            className="gap-2"
                            onClick={() =>
                              toggle(g.program_id, "show_all_grades")
                            }
                          >
                            {rev?.show_all_grades ? (
                              <Check className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                            Reveal all grades
                          </Button>
                        </div>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {gradeOnly.map((r) => (
                            <li
                              key={r.id}
                              className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2"
                            >
                              <span className="flex items-center gap-2 text-sm">
                                <Photo row={r} size="size-8" />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">
                                    {r.student_name ?? r.team_name ?? "—"}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    Grade {r.grade} · {r.team_short || r.team_name || "—"}
                                  </span>
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => void toggleGrade(g.program_id, r.id)}
                                className={`flex size-8 items-center justify-center rounded-full ring-1 transition-colors ${
                                  gradeShown(r.id)
                                    ? "bg-primary text-primary-foreground ring-primary"
                                    : "bg-background text-muted-foreground ring-border"
                                }`}
                                aria-label={gradeShown(r.id) ? "Hide grade" : "Reveal grade"}
                              >
                                {gradeShown(r.id) ? (
                                  <Check className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
        </main>
      </div>
    );
  }

  // ---- Public / team full-screen stage ----
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {TopBar}
      <main className="flex flex-1 flex-col justify-center px-4 pb-16 sm:px-8">
        {!liveOn ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Radio className="size-8 text-muted-foreground" />
            <p className="text-lg font-semibold">
              There is no results scheduled now
            </p>
            <p className="text-sm text-muted-foreground">
              Check back when the announcer goes live.
            </p>
          </div>
        ) : current ? (
          <LiveStage group={current} rev={reveals[current.program_id]} />
        ) : (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Radio className="size-8 animate-pulse text-primary" />
            <p className="text-lg font-semibold">Results will be announcing soon</p>
            <p className="text-sm text-muted-foreground">
              Keep this page open — new results appear automatically.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
