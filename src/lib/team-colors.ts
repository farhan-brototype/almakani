import { useCallback, useEffect, useState } from "react";

import { useRealtime } from "@/hooks/use-realtime";
import { teamColor } from "./results";
import { supabase } from "./supabase";

/**
 * Single source of truth for team colours: whatever the admin picked in
 * Settings > Team accounts is what every chart, dot and total uses.
 */
export type TeamColorMap = Map<string, string>;

const norm = (v: string) => v.trim().toLowerCase();

let cache: TeamColorMap = new Map();

/** Set once the colour column turns out to be missing, so we stop re-querying. */
let colorColumnMissing = false;
/** Shared in-flight request, so simultaneous mounts hit the API only once. */
let inflight: Promise<TeamColorMap> | null = null;

async function load(): Promise<TeamColorMap> {
  const map: TeamColorMap = new Map();
  const { data, error } = await supabase.from("teams").select("name,short_name,color");
  if (error) {
    // team-colours.sql not run yet — fall back to the default palette silently.
    colorColumnMissing = true;
    cache = map;
    return map;
  }
  for (const t of (data as { name: string; short_name: string | null; color: string | null }[]) ?? []) {
    if (!t.color) continue;
    map.set(norm(t.name), t.color);
    if (t.short_name?.trim()) map.set(norm(t.short_name), t.color);
  }
  cache = map;
  return map;
}

export function fetchTeamColors(): Promise<TeamColorMap> {
  if (colorColumnMissing) return Promise.resolve(new Map());
  inflight ??= load().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Admin colour when set, otherwise the old letter/index palette. */
export function colorOf(map: TeamColorMap, index: number, name?: string | null): string {
  if (name) {
    const hit = map.get(norm(name));
    if (hit) return hit;
  }
  return teamColor(index, name);
}

/** Live map of team colours, refreshed whenever the teams table changes. */
export function useTeamColors(): TeamColorMap {
  const [map, setMap] = useState<TeamColorMap>(cache);

  const load = useCallback(async () => {
    setMap(await fetchTeamColors());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["teams"], () => void load());

  return map;
}
