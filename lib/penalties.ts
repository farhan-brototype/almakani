import { supabase } from "./supabase";

export type Penalty = {
  id: string;
  team_id: string;
  points: number;
  remark: string | null;
  created_at: string;
  published?: boolean;
  published_at?: string | null;
  teams?: { name: string; short_name: string | null } | null;
};

const WITH_PUBLISHED =
  "id,team_id,points,remark,created_at,published,published_at,teams(name,short_name)";
const LEGACY = "id,team_id,points,remark,created_at,teams(name,short_name)";

/**
 * Minus marks given to teams.
 * By default only *published* deductions are returned, so drafts never change
 * any total. Pass `{ includeDrafts: true }` on the admin page.
 * Returns [] when the table is not there yet, and falls back to the legacy
 * columns when the `published` column has not been added yet.
 */
export async function fetchPenalties(
  options: { includeDrafts?: boolean } = {},
): Promise<Penalty[]> {
  try {
    const { data, error } = await supabase
      .from("team_penalties")
      .select(WITH_PUBLISHED)
      .order("created_at", { ascending: false });
    if (!error) {
      const list = (data as unknown as Penalty[]) ?? [];
      return options.includeDrafts ? list : list.filter((p) => p.published === true);
    }
    // Column not there yet — treat every row as published.
    const { data: legacy, error: legacyError } = await supabase
      .from("team_penalties")
      .select(LEGACY)
      .order("created_at", { ascending: false });
    if (legacyError) return [];
    return ((legacy as unknown as Penalty[]) ?? []).map((p) => ({ ...p, published: true }));
  } catch {
    return [];
  }
}

/** Deducted points keyed by both team name and short name, so any label matches. */
export function penaltyIndex(list: Penalty[]): Map<string, number> {
  const map = new Map<string, number>();
  const add = (key: string | null | undefined, points: number) => {
    const k = key?.trim();
    if (!k) return;
    map.set(k, (map.get(k) ?? 0) + points);
  };
  for (const p of list) {
    const points = Number(p.points) || 0;
    add(p.teams?.name, points);
    add(p.teams?.short_name, points);
    add(p.team_id, points);
  }
  return map;
}

export const penaltyFor = (index: Map<string, number>, ...keys: (string | null | undefined)[]) => {
  for (const k of keys) {
    const v = k ? index.get(k.trim()) : undefined;
    if (v) return v;
  }
  return 0;
};
