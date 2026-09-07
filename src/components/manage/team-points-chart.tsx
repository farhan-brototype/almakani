import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supabase } from "@/lib/supabase";
import { useRealtime } from "@/hooks/use-realtime";
import { type PublicResultRow } from "@/lib/results";
import { colorOf, useTeamColors } from "@/lib/team-colors";

type Slice = { name: string; points: number };

/** Published points per team — one distinctly coloured bar for every team. */
export function TeamPointsChart({
  title = "Team points",
  subtitle = "Live totals from published results.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [data, setData] = useState<Slice[] | null>(null);
  const colors = useTeamColors();

  const load = useCallback(async () => {
    {
      const [{ data: rows }, { data: teams }] = await Promise.all([
        supabase.rpc("published_results"),
        supabase.from("teams").select("name,short_name").order("name"),
      ]);
      const totals = new Map<string, number>();
      for (const t of (teams as { name: string; short_name: string | null }[]) ?? []) {
        totals.set(t.short_name?.trim() || t.name, 0);
      }
      for (const r of (rows as PublicResultRow[] | null) ?? []) {
        const key = r.team_short?.trim() || r.team_name || "—";
        totals.set(key, (totals.get(key) ?? 0) + (r.points ?? 0));
      }
      setData([...totals.entries()].map(([name, points]) => ({ name, points })));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["result_entries", "teams"], () => void load());

  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {data && (
          <span className="text-xs text-muted-foreground">
            Grand total {data.reduce((a, b) => a + b.points, 0)} pts
          </span>
        )}
      </div>
      <div className="mt-4 h-64 w-full">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="points" radius={[10, 10, 4, 4]} maxBarSize={64}>
                {data.map((d, i) => (
                  <Cell key={d.name} fill={colorOf(colors, i, d.name)} />
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
