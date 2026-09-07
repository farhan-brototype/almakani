import { CalendarClock, ClipboardList, Megaphone, Users } from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { useCallback, useEffect, useState } from "react";

import { teamRpc } from "@/lib/team-auth";
import { countByType, type TeamAssignment, type TeamStudent } from "@/lib/team-data";
import type { Announcement } from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";
import { TeamPointsChart } from "@/components/manage/team-points-chart";
import { TeamPointsTotals } from "@/components/manage/team-points-totals";



export function TeamDashboard() {
  const [students, setStudents] = useState<TeamStudent[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const load = useCallback(async () => {
    {
      try {
        const [s, a, u] = await Promise.all([
          teamRpc<TeamStudent[]>("team_students"),
          teamRpc<TeamAssignment[]>("team_assignments"),
          teamRpc<Announcement[]>("team_unread"),
        ]);
        setStudents(s);
        setAssignments(a);
        setAnnouncements(u);
      } catch {
        /* handled by layout redirect */
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(
    ["students", "assignments", "programs", "announcements", "teams"],
    () => void load(),
  );

  const all = students.flatMap((s) => s.programs);
  const cards = [
    { label: "Our students", value: students.length, to: "/team/students", icon: Users },
    { label: "Entries made", value: assignments.length, to: "/team/assign", icon: ClipboardList },
    {
      label: "Stage entries",
      value: countByType(all, "Stage"),
      to: "/team/overview",
      icon: CalendarClock,
    },
    {
      label: "Non-stage entries",
      value: countByType(all, "Non-stage"),
      to: "/team/overview",
      icon: CalendarClock,
    },
    {
      label: "Group entries",
      value: countByType(all, "Group"),
      to: "/team/overview",
      icon: CalendarClock,
    },
    {
      label: "Unread notices",
      value: announcements.length,
      to: "/team/announcements",
      icon: Megaphone,
    },
  ];

  return (
    <div>
      <PageHeading title="Team Dashboard" />


      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="panel p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {c.label}
              </span>
              <c.icon className="size-4 text-accent-foreground" />
            </div>
            <p className="mt-3 text-3xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <TeamPointsTotals />
        <TeamPointsChart />
      </div>
    </div>
  );
}
