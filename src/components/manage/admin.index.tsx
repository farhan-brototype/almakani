import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  Megaphone,
  Users,
  UsersRound,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { useCallback, useEffect, useState } from "react";

import { PageHeading } from "@/components/PageHeading";
import { TeamPointsChart } from "@/components/manage/team-points-chart";
import { TeamPointsTotals } from "@/components/manage/team-points-totals";
import { TeamPointsLineChart } from "@/components/manage/team-points-line";
import { supabase } from "@/lib/supabase";


type Counts = {
  programs: number;
  students: number;
  teams: number;
  timetable: number;
  completed: number;
  assignments: number;
  announcements: number;
  entryOpen: boolean;
};

export function Dashboard() {
  const [c, setC] = useState<Counts | null>(null);

  const load = useCallback(async () => {
    const count = async (table: string, filter?: (q: never) => unknown) => {
      void filter;
      const { count: n } = await supabase.from(table).select("*", { count: "exact", head: true });
      return n ?? 0;
    };
    {
      const [programs, students, teams, timetable, assignments, announcements] = await Promise.all([
        count("programs"),
        count("students"),
        count("teams"),
        count("timetable"),
        count("assignments"),
        count("announcements"),
      ]);
      const { count: completed } = await supabase
        .from("timetable")
        .select("*", { count: "exact", head: true })
        .eq("completed", true);
      const { data: settings } = await supabase
        .from("fest_settings")
        .select("entry_open")
        .eq("id", 1)
        .maybeSingle();
      setC({
        programs,
        students,
        teams,
        timetable,
        assignments,
        announcements,
        completed: completed ?? 0,
        entryOpen: Boolean(settings?.entry_open),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(
    ["programs", "students", "teams", "timetable", "assignments", "announcements", "fest_settings"],
    () => void load(),
  );

  const cards = [
    { label: "Programmes", value: c?.programs, icon: ListChecks, to: "/admin/programmes" },
    { label: "Students", value: c?.students, icon: Users, to: "/admin/students" },
    { label: "Scheduled items", value: c?.timetable, icon: CalendarClock, to: "/admin/timetable" },
    { label: "Completed", value: c?.completed, icon: CheckCircle2, to: "/admin/overview" },
    { label: "Assignments", value: c?.assignments, icon: ClipboardList, to: "/admin/assigning" },
    { label: "Teams", value: c?.teams, icon: UsersRound, to: "/admin/accounts" },
    {
      label: "Announcements",
      value: c?.announcements,
      icon: Megaphone,
      to: "/admin/announcements",
    },
  ];

  return (
    <div>
      <PageHeading title="Dashboard" />
      <p className="mt-1 text-sm text-muted-foreground">
        A short summary of every section of the panel.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="panel p-4 transition hover:border-accent">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {card.label}
              </span>
              <card.icon className="size-4 text-accent-foreground" />
            </div>
            <p className="mt-3 text-3xl font-semibold">{card.value ?? "—"}</p>
          </div>
        ))}
        <div className="panel p-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Programme entry
          </span>
          <p className="mt-3 text-2xl font-semibold">
            {c ? (c.entryOpen ? "Open" : "Closed") : "—"}
          </p>
          <span className="mt-2 inline-block text-xs text-muted-foreground">
            Change in Fest Control
          </span>
        </div>
      </div>

      <div className="mt-6">
        <TeamPointsTotals />
        <TeamPointsChart />
        <TeamPointsLineChart />
      </div>
    </div>
  );
}
