import { supabase } from "./supabase";

export type CategoryRow = { name: string; is_general: boolean; sort: number };
export type ItemKind = "Individual" | "Group";
export type CategoryItem = { id: string; name: string; kind: ItemKind; sort: number };
export type LimitRow = {
  category: string;
  stage_limit: number;
  nonstage_limit: number;
  stage_unlimited: boolean;
  nonstage_unlimited: boolean;
  sports_limit: number;
  sports_unlimited: boolean;
  arts_max: number;
  arts_min: number;
  stage_min: number;
  nonstage_min: number;
  min_total: number;
  min_items: string[];
  group_limit?: number;
};

export type FestRules = {
  categories: CategoryRow[];
  items: CategoryItem[];
  limits: LimitRow[];
};

export async function fetchFestRules(): Promise<FestRules> {
  const [{ data: c }, { data: i }, { data: l }] = await Promise.all([
    supabase.from("categories").select("*").order("sort"),
    supabase.from("category_items").select("*").order("sort"),
    supabase.from("category_limits").select("*").order("category"),
  ]);
  return {
    categories: (c as CategoryRow[]) ?? [],
    items: (i as CategoryItem[]) ?? [],
    limits: (l as LimitRow[]) ?? [],
  };
}

export type StatusTone = "red" | "yellow" | "green" | "grey";
export type StudentStatus = { tone: StatusTone; label: string };

/**
 * Programme types and categories are admin-typed text, so "Non-Stage",
 * "non stage" and "Non-stage" must all match the same limit row.
 */
export const normKey = (v: string): string => v.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Count for a type, matched loosely so spelling never breaks a limit. */
export const countOf = (counts: Record<string, number>, type: string): number => {
  const want = normKey(type);
  let total = 0;
  for (const [k, v] of Object.entries(counts)) if (normKey(k) === want) total += v;
  return total;
};

/** The limit row for a category, matched loosely. */
export const limitFor = (limits: LimitRow[], category: string | null | undefined): LimitRow | undefined =>
  limits.find((l) => normKey(l.category) === normKey(category ?? ""));

/** Per-type maximums held in one limit row. */
export function typeCaps(limit: LimitRow): { type: string; max: number }[] {
  const caps: { type: string; max: number }[] = [];
  if (!limit.stage_unlimited && limit.stage_limit > 0)
    caps.push({ type: "Stage", max: limit.stage_limit });
  if (!limit.nonstage_unlimited && limit.nonstage_limit > 0)
    caps.push({ type: "Non-stage", max: limit.nonstage_limit });
  if (!limit.sports_unlimited && limit.sports_limit > 0)
    caps.push({ type: "Sports", max: limit.sports_limit });
  return caps;
}

/** Every rule the given counts break — empty when the student is inside the rules. */
export function limitBreaches(
  counts: Record<string, number>,
  limit: LimitRow | undefined,
): string[] {
  if (!limit) return [];
  const out: string[] = [];
  for (const cap of typeCaps(limit)) {
    const used = countOf(counts, cap.type);
    if (used > cap.max) out.push(`${cap.type} limit crossed — ${used} of max ${cap.max}`);
  }
  const arts = countOf(counts, "Stage") + countOf(counts, "Non-stage");
  if (limit.arts_max > 0 && arts > limit.arts_max)
    out.push(`Arts limit crossed — ${arts} of max ${limit.arts_max}`);

  return out;
}

/**
 * Traffic light for a student's programme entries.
 *  red    — a maximum is crossed, or a minimum is not reached yet
 *  green  — every limited item is full
 *  yellow — above the minimum but still has room (under rule)
 */
export function studentStatus(
  counts: Record<string, number>,
  limit: LimitRow | undefined,
): StudentStatus {
  if (!limit) return { tone: "yellow", label: "Within the rules" };

  const breaches = limitBreaches(counts, limit);
  if (breaches.length > 0) return { tone: "red", label: breaches[0]! };

  const stage = countOf(counts, "Stage");
  const nonStage = countOf(counts, "Non-stage");
  const sports = countOf(counts, "Sports");
  const arts = stage + nonStage;

  const stageMin = limit.stage_min || 0;
  const nonStageMin = limit.nonstage_min || 0;

  if (stageMin > 0 && stage < stageMin)
    return { tone: "red", label: `Stage minimum not reached — ${stage}/${stageMin}` };
  if (nonStageMin > 0 && nonStage < nonStageMin)
    return { tone: "red", label: `Non-stage minimum not reached — ${nonStage}/${nonStageMin}` };

  const caps = typeCaps(limit);
  const artsFull = limit.arts_max > 0 ? arts >= limit.arts_max : false;
  const stageFull = limit.stage_unlimited ? false : stage >= limit.stage_limit;
  const nonStageFull = limit.nonstage_unlimited ? false : nonStage >= limit.nonstage_limit;
  const sportsFull =
    limit.sports_unlimited || limit.sports_limit <= 0 ? true : sports >= limit.sports_limit;

  if (artsFull || (caps.length > 0 && stageFull && nonStageFull && sportsFull))
    return { tone: "green", label: `Full — ${arts} arts programmes` };
  return {
    tone: "yellow",
    label: `Under rule — ${arts} arts${limit.arts_max ? ` of max ${limit.arts_max}` : ""}`,
  };
}

export const countsFromTypes = (types: string[]): Record<string, number> =>
  types.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});


export type TypeStatus = {
  type: string;
  used: number;
  max: number | null;
  tone: StatusTone;
  label: string;
};

/** Cap and minimum held in the limit row for one programme type. */
function ruleFor(type: string, limit: LimitRow | undefined): { max: number | null; min: number } {
  if (!limit) return { max: null, min: 0 };
  switch (normKey(type)) {
    case "stage":
      return {
        max: limit.stage_unlimited || limit.stage_limit <= 0 ? null : limit.stage_limit,
        min: limit.stage_min || 0,
      };
    case "nonstage":
      return {
        max: limit.nonstage_unlimited || limit.nonstage_limit <= 0 ? null : limit.nonstage_limit,
        min: limit.nonstage_min || 0,
      };
    case "sports":
      return {
        max: limit.sports_unlimited || limit.sports_limit <= 0 ? null : limit.sports_limit,
        min: 0,
      };
    case "group": {
      const cap = limit.group_limit ?? 0;
      return { max: cap > 0 && cap < 999 ? cap : null, min: 0 };
    }
    default:
      return { max: null, min: 0 };
  }
}

/** Traffic light for one programme type of one student. */
export function typeStatus(
  type: string,
  counts: Record<string, number>,
  limit: LimitRow | undefined,
): TypeStatus {
  const used = countOf(counts, type);

  const { max, min } = ruleFor(type, limit);
  if (max !== null && used > max)
    return { type, used, max, tone: "red", label: `${type} limit crossed — ${used} of max ${max}` };
  if (min > 0 && used < min)
    return {
      type,
      used,
      max,
      tone: "red",
      label: `${type} minimum not reached — ${used}/${min}`,
    };
  if (max === null)
    return { type, used, max, tone: "grey", label: `${type} — ${used}, no limit` };
  if (used >= max) return { type, used, max, tone: "green", label: `${type} full — ${used}/${max}` };
  return { type, used, max, tone: "yellow", label: `${type} — ${used} of max ${max}` };
}

/** Informational row: programmes of an unlimited (general) category such as Kulliyya. */
export function infoStatus(label: string, used: number): TypeStatus {
  return { type: label, used, max: null, tone: "grey", label: `${label} — ${used}, no limit` };
}
