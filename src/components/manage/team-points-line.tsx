import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useRealtime } from "@/hooks/use-realtime";
import { type PublicResultRow } from "@/lib/results";
import { colorOf, useTeamColors } from "@/lib/team-colors";
import { supabase } from "@/lib/supabase";
import { teamRpc } from "@/lib/team-auth";

type Point = Record<string, string | number>;

/**
 * Cumulative team points as programmes get published — one line per team so the
 * race between teams is readable at a glance.
 */
export function TeamPointsLineChart({
  title = "Points progress",
  subtitle = "Cumulative points as each programme result is published.",
  onlyTeam,
  source = "all",
}: {
  title?: string;
  subtitle?: string;
  /** Limit the chart to a single team (used on the team overview). */
  onlyTeam?: string | null;
  /** "team" reads only the signed-in team's own published results. */
  source?: "all" | "team";
}) {
  const [teams, setTeams] = useState<string[]>([]);
  const [data, setData] = useState<Point[] | null>(null);
  const colors = useTeamColors();

  const load = useCallback(async () => {
    let raw: PublicResultRow[] = [];
    if (source === "team") {
      try {
        raw = (await teamRpc<PublicResultRow[]>("team_results")) ?? [];
      } catch {
        raw = [];
      }
      raw = raw.map((r) => ({ ...r, team_short: "Points", team_name: "Points" }));
    } else {
      const { data: rows } = await supabase.rpc("published_results");
      raw = (rows as PublicResultRow[] | null) ?? [];
    }
    const list = raw.filter((r) => (r.points ?? 0) > 0);

    const names = [...new Set(list.map((r) => r.team_short?.trim() || r.team_name || "—"))]
      .filter((n) => !onlyTeam || n === onlyTeam)
      .sort();

    // Group by programme, ordered by the code so the x-axis reads like the fest order.
    const codes = [...new Set(list.map((r) => r.program_code))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );

    const running = new Map<string, number>(names.map((n) => [n, 0]));
    const series: Point[] = [];
    for (const code of codes) {
      for (const r of list.filter((x) => x.program_code === code)) {
        const key = r.team_short?.trim() || r.team_name || "—";
        if (!running.has(key)) continue;
        running.set(key, (running.get(key) ?? 0) + (r.points ?? 0));
      }
      series.push({ code, ...Object.fromEntries(running) });
    }

    setTeams(names);
    setData(series);
  }, [onlyTeam, source]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["result_entries", "teams"], () => void load());

  return (
    <section className="panel p-4 sm:p-5">
      <div>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-4 h-64 w-full">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="code" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  fontSize: 12,
                }}
              />
              {teams.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
              {teams.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={colorOf(colors, i, name)}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {data ? "No published points yet." : "Loading…"}
          </div>
        )}
      </div>
    </section>
  );
}
