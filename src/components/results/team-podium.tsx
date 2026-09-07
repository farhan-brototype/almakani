import { confetti } from "@tsparticles/confetti";
import { Trophy } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { colorOf, type TeamColorMap } from "@/lib/team-colors";

export type PodiumTeam = { name: string; points: number };

const GRAND_LABELS = ["Winners", "Runner Up", "Third", "Fourth", "Fifth", "Sixth"];
const PLAIN_LABELS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];

function rankLabel(index: number, grand: boolean) {
  const list = grand ? GRAND_LABELS : PLAIN_LABELS;
  return list[index] ?? `#${index + 1}`;
}

/** Two corner bursts — same recipe as the reference celebration. */
export function celebrate() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  void confetti({ particleCount: 300, spread: 90, origin: { x: 1, y: 0.9 } });
  void confetti({ particleCount: 300, spread: 90, origin: { x: 0, y: 0.9 } });
}

/**
 * Public team points view: grand total on top, then a podium
 * (2nd · 1st · 3rd · 4th) and the remaining teams as a ranked list.
 */
export function TeamPodium({
  teams,
  colors,
  grand,
}: {
  teams: PodiumTeam[];
  colors: TeamColorMap;
  grand: boolean;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (!grand || fired.current || teams.length === 0) return;
    fired.current = true;
    celebrate();
  }, [grand, teams.length]);

  if (teams.length === 0) {
    return (
      <p className="panel p-6 text-center text-sm text-muted-foreground">
        No published results yet.
      </p>
    );
  }

  const total = teams.reduce((s, t) => s + t.points, 0);
  const podium = teams.slice(0, 4);
  const rest = teams.slice(4);
  // Visual order on the podium: 2nd, 1st, 3rd, 4th.
  const order = [1, 0, 2, 3].filter((i) => i < podium.length);
  const heights = ["h-32 sm:h-44", "h-24 sm:h-32", "h-20 sm:h-26", "h-16 sm:h-20"];

  return (
    <div className="space-y-6">
      <div className="panel flex flex-col items-center gap-1 border-primary/40 bg-primary/5 p-6 text-center">
        <Trophy className="size-6 text-primary" aria-hidden />
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Grand total</p>
        <p className="text-4xl font-semibold text-primary sm:text-5xl">{total}</p>
        <p className="text-xs text-muted-foreground">points published so far</p>
      </div>

      <div className="panel p-4 sm:p-6">
        <div className="flex items-end justify-center gap-2 sm:gap-4">
          {order.map((idx) => {
            const t = podium[idx]!;
            const color = colorOf(colors, idx, t.name);
            return (
              <div key={t.name} className="flex w-full max-w-[9rem] flex-col items-center">
                <span
                  className="mb-2 size-3 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="line-clamp-2 text-center text-sm font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.points} pts</span>
                <div
                  className={cn(
                    "mt-2 flex w-full items-center justify-center rounded-t-xl border border-b-0 border-border/60 px-2 text-center",
                    heights[idx],
                  )}
                  style={{ backgroundColor: `${color}22`, borderColor: color }}
                >
                  <span
                    className="font-display text-xs font-semibold uppercase tracking-wide sm:text-sm"
                    style={{ color }}
                  >
                    {rankLabel(idx, grand)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {rest.length > 0 && (
        <div className="panel divide-y divide-border">
          {rest.map((t, i) => (
            <div key={t.name} className="flex items-center gap-3 p-4">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: colorOf(colors, i + 4, t.name) }}
                aria-hidden
              />
              <span className="w-20 text-xs uppercase tracking-wide text-muted-foreground">
                {rankLabel(i + 4, grand)}
              </span>
              <span className="flex-1 font-medium">{t.name}</span>
              <span className="text-lg font-semibold">{t.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
