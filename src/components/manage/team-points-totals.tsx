import { useCallback, useEffect, useState } from "react";

import { useRealtime } from "@/hooks/use-realtime";
import { fetchPenalties, penaltyFor, penaltyIndex } from "@/lib/penalties";
import { type PublicResultRow } from "@/lib/results";
import { colorOf, useTeamColors } from "@/lib/team-colors";
import { supabase } from "@/lib/supabase";

type Row = { name: string; short: string | null; points: number; minus: number; total: number };

/** Published team points with minus marks deducted — shown on the admin dashboard. */
export function TeamPointsTotals() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const colors = useTeamColors();

  const load = useCallback(async () => {
    const [{ data: results }, { data: teams }, penalties] = await Promise.all([
      supabase.rpc("published_results"),
      supabase.from("teams").select("id,name,short_name").order("name"),
      fetchPenalties(),
    ]);
    const index = penaltyIndex(penalties);
    const totals = new Map<string, { name: string; short: string | null; points: number }>();
    for (const t of (teams as { id: string; name: string; short_name: string | null }[]) ?? []) {
      totals.set(t.name, { name: t.name, short: t.short_name, points: 0 });
    }
    for (const r of (results as PublicResultRow[] | null) ?? []) {
      const name = r.team_name || r.team_short || "—";
      const cur = totals.get(name) ?? { name, short: r.team_short ?? null, points: 0 };
      cur.points += r.points ?? 0;
      totals.set(name, cur);
    }
    setRows(
      [...totals.values()]
        .map((t) => {
          const minus = penaltyFor(index, t.name, t.short);
          return { ...t, minus, total: t.points - minus };
        })
        .sort((a, b) => b.total - a.total),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["result_entries", "teams", "team_penalties"], () => void load());

  const grand = (rows ?? []).reduce((s, r) => s + r.total, 0);

  return (
    <section className="mb-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold">Team points</h2>
          <p className="text-xs text-muted-foreground">
            Published totals with minus marks already deducted.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Grand total {grand} pts</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(rows ?? []).map((t, i) => (
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
        {rows !== null && rows.length > 0 && (
          <div className="panel flex flex-col items-center border-primary/40 bg-primary/5 p-4 text-center sm:col-span-2 lg:col-span-4">
            <span className="inline-block size-2.5 rounded-full bg-primary" />
            <p className="mt-2 text-xs uppercase tracking-wide text-primary">Grand total</p>
            <p className="text-3xl font-semibold text-primary">{grand}</p>
          </div>
        )}
        {rows === null && (
          <p className="panel p-4 text-sm text-muted-foreground">Loading team points…</p>
        )}
      </div>
    </section>
  );
}
