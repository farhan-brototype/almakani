import { Printer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRealtime } from "@/hooks/use-realtime";
import { printScheduleSheet, type ScheduleSection } from "@/lib/print-schedule";
import { useSiteSettings } from "@/lib/site";
import { supabase, type TimetableRow } from "@/lib/supabase";
import { FEST } from "@/config";

type Mode = "judge" | "stage" | "program" | "date";

const MODES: { id: Mode; label: string }[] = [
  { id: "judge", label: "By judge" },
  { id: "stage", label: "By stage" },
  { id: "program", label: "By programme" },
  { id: "date", label: "Whole schedule" },
];

const dayText = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const byTime = (a: TimetableRow, b: TimetableRow) =>
  a.event_date.localeCompare(b.event_date) ||
  (a.event_time ?? "").localeCompare(b.event_time ?? "");

const judgesOf = (r: TimetableRow) =>
  [r.judge1, r.judge2].map((j) => (j ?? "").trim()).filter(Boolean);

/** Printable schedule sheets: per judge, per stage, per programme or per date. */
export function SchedulePrintPage() {
  const { settings } = useSiteSettings();
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [mode, setMode] = useState<Mode>("judge");
  const [judge, setJudge] = useState("all");
  const [stage, setStage] = useState("all");
  const [program, setProgram] = useState("all");
  const [date, setDate] = useState("all");
  const [showJudges, setShowJudges] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("timetable")
      .select("*, programs(code,name,category,type)")
      .order("event_date")
      .order("event_time");
    setRows((data as TimetableRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(["timetable", "programs"], () => void load());

  const judges = useMemo(
    () => [...new Set(rows.flatMap(judgesOf))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const stages = useMemo(
    () =>
      [...new Set(rows.map((r) => (r.stage ?? "").trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [rows],
  );
  const programs = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows)
      if (r.programs?.code) map.set(r.programs.code, r.programs.name ?? r.programs.code);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);
  const dates = useMemo(
    () => [...new Set(rows.map((r) => r.event_date))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  /** Rows left after the date filter, which applies to every mode. */
  const dated = useMemo(
    () => rows.filter((r) => date === "all" || r.event_date === date).sort(byTime),
    [rows, date],
  );

  const sections = useMemo<ScheduleSection[]>(() => {
    const suffix = date === "all" ? "All dates" : dayText(date);
    if (mode === "judge") {
      const names = judge === "all" ? judges : judges.filter((j) => j === judge);
      return names.map((name) => ({
        title: `Judge · ${name}`,
        subtitle: suffix,
        rows: dated.filter((r) => judgesOf(r).includes(name)),
      }));
    }
    if (mode === "stage") {
      const names = stage === "all" ? stages : stages.filter((s) => s === stage);
      const list: ScheduleSection[] = names.map((name) => ({
        title: `Stage · ${name}`,
        subtitle: suffix,
        rows: dated.filter((r) => (r.stage ?? "").trim() === name),
      }));
      const noStage = dated.filter((r) => !(r.stage ?? "").trim());
      if (stage === "all" && noStage.length)
        list.push({ title: "Stage not set", subtitle: suffix, rows: noStage });
      return list;
    }
    if (mode === "program") {
      const rowsFor =
        program === "all" ? dated : dated.filter((r) => r.programs?.code === program);
      return [
        {
          title: program === "all" ? "Programmes in schedule order" : `Programme · ${program}`,
          subtitle: suffix,
          rows: rowsFor,
        },
      ];
    }
    return dates
      .filter((d) => date === "all" || d === date)
      .map((d) => ({
        title: dayText(d),
        rows: dated.filter((r) => r.event_date === d),
      }));
  }, [mode, judge, judges, stage, stages, program, dated, dates, date]);

  const total = sections.reduce((n, s) => n + s.rows.length, 0);

  const print = () => {
    if (!total) {
      toast.error("Nothing to print for these filters");
      return;
    }
    const ok = printScheduleSheet(sections, {
      title: `${settings.fest_name || FEST.name} — Schedule`,
      // The judge sheet always names the judge, that is the point of the page.
      showJudges: mode === "judge" ? true : showJudges,
      logoUrl: settings.logo_url,
      pageBreakPerSection: mode !== "program",
    });
    if (!ok) toast.error("Allow pop-ups to open the print sheet");
  };

  return (
    <div>
      <PageHeading title="Print schedule" />
      <p className="text-sm text-muted-foreground">
        Choose what to print. Judge sheets and stage sheets start on a new page each.
      </p>

      <div className="panel mt-5 space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <Button
              key={m.id}
              size="sm"
              variant={mode === m.id ? "default" : "outline"}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
          {mode === "judge" && (
            <div className="space-y-1.5">
              <Label>Judge</Label>
              <Select value={judge} onValueChange={setJudge}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Judge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All judges (one page each)</SelectItem>
                  {judges.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "stage" && (
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages (one page each)</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "program" && (
            <div className="space-y-1.5">
              <Label>Programme</Label>
              <Select value={program} onValueChange={setProgram}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All programmes</SelectItem>
                  {programs.map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {code} · {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Select value={date} onValueChange={setDate}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                {dates.map((d) => (
                  <SelectItem key={d} value={d}>
                    {dayText(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2 pb-2">
            <Checkbox
              id="show-judges"
              checked={mode === "judge" ? true : showJudges}
              disabled={mode === "judge"}
              onCheckedChange={(v) => setShowJudges(Boolean(v))}
            />
            <Label htmlFor="show-judges" className="text-sm font-normal">
              Add judge names
            </Label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button className="gap-2" onClick={print}>
            <Printer className="size-4" /> Print
          </Button>
          <span className="text-xs text-muted-foreground">
            {sections.filter((s) => s.rows.length > 0).length} page(s) · {total} programme(s)
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {sections
          .filter((s) => s.rows.length > 0)
          .map((s) => (
            <section key={s.title} className="panel overflow-hidden">
              <header className="flex items-center gap-2 bg-muted/60 px-4 py-2">
                <h2 className="truncate font-display text-sm font-semibold uppercase tracking-wide">
                  {s.title}
                </h2>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {s.rows.length} items
                </span>
              </header>
              <ul className="divide-y divide-border">
                {s.rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      {dayText(r.event_date)} · {r.event_time?.slice(0, 5) ?? "--:--"}
                    </span>
                    <span className="font-mono text-xs">{r.programs?.code}</span>
                    <span className="truncate font-medium">{r.programs?.name}</span>
                    <span className="text-xs text-muted-foreground">{r.stage ?? "Stage TBA"}</span>
                    {(mode === "judge" || showJudges) && judgesOf(r).length > 0 && (
                      <span className="text-xs text-primary">{judgesOf(r).join(", ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        {total === 0 && (
          <p className="panel p-8 text-center text-muted-foreground">
            Nothing matches these filters.
          </p>
        )}
      </div>
    </div>
  );
}
