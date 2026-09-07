import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Loader2, Medal, Radio, Search, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ManageTabs } from "@/components/ManageTabs";
import { PublicShell } from "@/components/PublicShell";
import { TeamPointsChart } from "@/components/manage/team-points-chart";
import { TeamPointsTotals } from "@/components/manage/team-points-totals";
import { TeamPodium } from "@/components/results/team-podium";
import { EnrolledPage } from "@/components/results/enrolled";
import { ProgramResultsPage, StudentMarksPage } from "@/components/results/lists";
import { MinusMarksPage } from "@/components/results/minus-marks";
import {
  DraftPage,
  PublishedPage,
  TotalEnrolledPage,
  usePenaltyIndex,
} from "@/components/results/stages";
import { penaltyFor } from "@/lib/penalties";
import { GradingSection } from "@/components/manage/admin.grading";

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
import { FEST } from "@/config";
import { useRealtime } from "@/hooks/use-realtime";
import { useAppSession } from "@/hooks/use-session";
import {
  fetchPublicResults,
  positionText,
  totalsByTeam,
  type PublicResultRow,
  type TeamResultRow,
} from "@/lib/results";
import { colorOf, useTeamColors } from "@/lib/team-colors";
import { teamRpc } from "@/lib/team-auth";
import { useSiteSettings } from "@/lib/site";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: `Results — ${FEST.name}` },
      {
        name: "description",
        content: `Published positions, grades and team points of ${FEST.name} at ${FEST.college}.`,
      },
      { property: "og:title", content: `Results — ${FEST.name}` },
      { property: "og:description", content: `Positions, grades and team points of ${FEST.name}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResultsPage,
});

type Group = {
  program_id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  rows: PublicResultRow[];
};

function Avatar({
  url,
  label,
  size = "size-16",
}: {
  url: string | null;
  label: string;
  size?: string;
}) {
  if (url)
    return (
      <img
        src={url}
        alt={label}
        loading="lazy"
        className={`${size} rounded-full object-cover ring-2 ring-primary/30`}
      />
    );
  return (
    <span
      className={`${size} flex items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary`}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

const MEDAL = ["text-amber-500", "text-slate-400", "text-amber-700"];

/** "First with A" / "First without" / "Grade A" for grade-only entries. */
function placeLabel(r: PublicResultRow): string {
  const place = r.position && r.position <= 3 ? positionText(r.position) : null;
  if (place) return `${place}${r.grade ? ` with ${r.grade}` : " without"}`;
  return r.grade ? `Grade ${r.grade}` : "—";
}

function ResultsPage() {
  const { role } = useAppSession();
  const { settings } = useSiteSettings();
  const [rows, setRows] = useState<PublicResultRow[]>([]);
  const [teamRows, setTeamRows] = useState<TeamResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(role === "admin" ? "overview" : "teams");
  /** Set once the visitor picks a tab, so the role check never overrides them. */
  const picked = useRef(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [detail, setDetail] = useState<Group | null>(null);
  const [studentDetail, setStudentDetail] = useState<string | null>(null);

  useEffect(() => {
    if (picked.current) return;
    setTab(role === "admin" ? "overview" : "teams");
  }, [role]);


  const load = useCallback(async () => {
    setRows(await fetchPublicResults());
    if (role === "team") {
      try {
        setTeamRows(await teamRpc<TeamResultRow[]>("team_results"));
      } catch {
        setTeamRows([]);
      }
    }
    setLoading(false);
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["result_entries", "students", "teams", "programs"], () => void load());


  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const r of rows) {
      if (type !== "all" && r.type !== type) continue;
      if (category !== "all" && r.category !== category) continue;
      const needle = q.trim().toLowerCase();
      if (
        needle &&
        ![r.program_code, r.program_name, r.student_name ?? "", r.team_name ?? ""].some((v) =>
          v.toLowerCase().includes(needle),
        )
      )
        continue;
      const g = map.get(r.program_id) ?? {
        program_id: r.program_id,
        code: r.program_code,
        name: r.program_name,
        type: r.type,
        category: r.category,
        rows: [],
      };
      g.rows.push(r);
      map.set(r.program_id, g);
    }
    return [...map.values()]
      .map((g) => ({ ...g, rows: g.rows.sort((a, b) => (a.position ?? 9) - (b.position ?? 9)) }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [rows, q, type, category]);

  const penalties = usePenaltyIndex();
  const teamColors = useTeamColors();
  const teamTotals = useMemo(
    () =>
      totalsByTeam(rows)
        .map((t) => ({ ...t, points: t.points - penaltyFor(penalties, t.name) }))
        .sort((a, b) => b.points - a.points),
    [rows, penalties],
  );
  const types = useMemo(() => [...new Set(rows.map((r) => r.type))].sort(), [rows]);
  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(),
    [rows],
  );

  // Team tier: individual points of their own students (group items excluded).
  const myStudents = useMemo(() => {
    const map = new Map<string, { name: string; photo: string | null; points: number; adno: string }>();
    for (const r of teamRows) {
      if (r.is_group || !r.student_id) continue;
      const cur = map.get(r.student_id) ?? {
        name: r.student_name ?? "—",
        photo: r.photo_url,
        adno: r.adno ?? "",
        points: 0,
      };
      cur.points += r.points ?? 0;
      map.set(r.student_id, cur);
    }
    return [...map.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.points - a.points);
  }, [teamRows]);

  const tabs = [
    // Non-admins see Team Points first, then the programme results.
    ...(role === "admin" ? [] : [{ id: "teams", label: "Team Points" }]),
    { id: "overview", label: "Results" },
    ...(role === "team" ? [{ id: "mine", label: "My Students" }] : []),
    ...(role === "admin"
      ? [
          { id: "dashboard", label: "Dashboard" },
          { id: "students", label: "Students" },
          { id: "programmes", label: "Programmes" },
          { id: "enrolled", label: "Enrolled" },
          { id: "draft", label: "Draft" },
          { id: "published", label: "Published" },
          { id: "total", label: "Total Enrolled" },
          { id: "minus", label: "Minus Marks" },
          { id: "grading", label: "Grading & Points" },
        ]
      : []),
  ];

  const adminPanel =
    role === "admin" ? (
      <div className="mt-6">
        {tab === "dashboard" && (
          <>
            <TeamPointsTotals />
            <TeamPointsChart />
          </>
        )}
        {tab === "students" && <StudentMarksPage />}
        {tab === "programmes" && <ProgramResultsPage />}
        {tab === "enrolled" && <EnrolledPage />}
        {tab === "draft" && <DraftPage />}
        {tab === "published" && <PublishedPage />}
        {tab === "total" && <TotalEnrolledPage />}
        {tab === "minus" && <MinusMarksPage />}
        {tab === "grading" && <GradingSection />}
      </div>
    ) : null;

  const isAdminTab = [
    "dashboard",
    "students",
    "programmes",
    "enrolled",
    "draft",
    "published",
    "total",
    "minus",
    "grading",
  ].includes(tab);


  return (
    <PublicShell
      title="Results"
      subtitle="Positions, grades and the running points table of the fest."
    >
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <ManageTabs tabs={tabs} value={tab} onChange={(v) => { picked.current = true; setTab(v); }} className="mx-0 max-w-none px-0 pt-0" />
          <Button asChild className="gap-2">
            <Link to="/live">
              <Radio className="size-4" /> Live Result
            </Link>
          </Button>
        </div>

        {isAdminTab ? (
          adminPanel
        ) : loading ? (
          <Loader2 className="mx-auto mt-16 size-6 animate-spin text-muted-foreground" />
        ) : tab === "teams" ? (
          <div className="mt-6">
            <TeamPodium teams={teamTotals} colors={teamColors} grand={settings.grand_results} />

          </div>
        ) : tab === "mine" ? (
          <div className="panel mt-6 divide-y divide-border">
            {myStudents.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No individual points published for your team yet.
              </p>
            )}
            {myStudents.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-4">
                <Avatar url={s.photo} label={s.name} size="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">{s.adno}</span>
                </span>
                <span className="text-lg font-semibold">{s.points}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Programmes of ${s.name}`}
                  onClick={() => setStudentDetail(s.id)}
                >
                  <Eye className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search programme, student or team"
                  className="pl-9"
                />
              </div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-40">
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
            </div>

            {groups.length === 0 ? (
              <p className="panel mt-6 p-10 text-center text-sm text-muted-foreground">
                No published results yet.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {groups.map((g) => {
                  const podium = g.rows.filter((r) => (r.position ?? 9) <= 3);
                  return (
                    <article key={g.program_id} className="panel space-y-4 p-5">
                      <header className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-lg font-semibold">
                            <span className="font-mono text-xs text-muted-foreground">{g.code}</span>{" "}
                            {g.name}
                          </p>
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">
                            {g.type} · {g.category}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Detailed results of ${g.name}`}
                          onClick={() => setDetail(g)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </header>

                      <div className="grid grid-cols-3 gap-2">
                        {podium.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setDetail(g)}
                            className="flex flex-col items-center gap-2 rounded-xl p-2 text-center transition-colors hover:bg-muted/60"
                          >
                            <Avatar
                              url={r.photo_url}
                              label={r.student_name ?? r.team_name ?? "?"}
                            />
                            <Medal
                              className={`size-4 ${MEDAL[(r.position ?? 1) - 1] ?? "text-muted-foreground"}`}
                            />
                            <span className="line-clamp-2 text-xs font-medium">
                              {r.student_name ?? r.team_name ?? "—"}
                            </span>
                            {r.student_name && (
                              <span className="text-[11px] font-semibold text-primary">
                                {r.team_short || r.team_name || "—"}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {placeLabel(r)}
                            </span>
                          </button>
                        ))}
                        {podium.length === 0 && (
                          <p className="col-span-3 text-sm text-muted-foreground">
                            No positions declared.
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}


              </div>
            )}
          </>
        )}
      </section>

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail?.code} · {detail?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {detail?.type} · {detail?.category}
          </p>
          <ul className="mt-2 space-y-2">
            {detail?.rows
              .filter((r) => (r.position && r.position <= 3) || r.grade || (r.points ?? 0) > 0)
              .map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Avatar
                  url={r.photo_url}
                  label={r.student_name ?? r.team_name ?? "?"}
                  size="size-10"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {r.student_name
                      ? `${r.student_name} (${r.team_short || r.team_name || "—"})`
                      : (r.team_name ?? "—")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {[r.adno ? `Ad.No: ${r.adno}` : null, r.team_name ? `Team: ${r.team_name}` : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </span>
                <span className="text-right text-xs">
                  <span className="block font-medium">{placeLabel(r)}</span>
                  {r.points > 0 && (
                    <span className="block text-muted-foreground">{r.points} pts</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(studentDetail)} onOpenChange={(o) => !o && setStudentDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {myStudents.find((s) => s.id === studentDetail)?.name ?? "Student"}
            </DialogTitle>
          </DialogHeader>
          <ul className="space-y-2">
            {teamRows
              .filter((r) => r.student_id === studentDetail)
              .map((r) => (
                <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.program_code}
                    </span>{" "}
                    {r.program_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.type} · {r.category} · {positionText(r.position)} · Grade {r.grade ?? "—"} ·{" "}
                    {r.points} pts
                  </p>
                </li>
              ))}
            {teamRows.filter((r) => r.student_id === studentDetail).length === 0 && (
              <li className="text-sm text-muted-foreground">No programmes yet.</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-7xl px-4 pb-10">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="size-3.5" /> Points update automatically as the admin publishes
          results.
        </p>
      </div>
    </PublicShell>
  );
}
