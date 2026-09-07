import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getTeamSession, teamRpc } from "@/lib/team-auth";
import { useRealtime } from "@/hooks/use-realtime";
import type { PublicResultRow } from "@/lib/results";
import { colorOf, useTeamColors } from "@/lib/team-colors";

type Slice = { name: string; points: number };

/** Only the logged-in team's own candidates and their published points. */
export function TeamOwnChart() {
  const [data, setData] = useState<Slice[] | null>(null);
  const colors = useTeamColors();
  /** Bars use the team's own colour picked by the admin. */
  const barColor = colorOf(colors, 0, getTeamSession()?.team?.name);

  const load = useCallback(async () => {
    {
      try {
        const rows = await teamRpc<PublicResultRow[]>("team_results");
        const totals = new Map<string, number>();
        for (const r of rows ?? []) {
          const key = r.student_name || r.program_code || "—";
          totals.set(key, (totals.get(key) ?? 0) + (r.points ?? 0));
        }
        setData(
          [...totals.entries()]
            .map(([name, points]) => ({ name, points }))
            .filter((d) => d.points > 0)
            .sort((a, b) => b.points - a.points)
            .slice(0, 10),
        );
      } catch {
        setData([]);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["result_entries"], () => void load());

  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="font-display text-base font-semibold">Our points</h2>
      <p className="text-xs text-muted-foreground">
        Published points earned by your own candidates.
      </p>
      <div className="mt-4 h-64 w-full">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-18} textAnchor="end" height={56} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="points" radius={[10, 10, 4, 4]} maxBarSize={48}>
                {data.map((d) => (
                  <Cell key={d.name} fill={barColor} />
                ))}
              </Bar>
            </BarChart>
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
