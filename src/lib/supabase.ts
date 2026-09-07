import { createClient } from "@supabase/supabase-js";

import { SUPABASE_KEY_FALLBACK, SUPABASE_URL_FALLBACK } from "@/config";
import { trackedFetch } from "@/lib/progress";

const url = (import.meta.env["VITE_SUPABASE_URL"] as string) || SUPABASE_URL_FALLBACK;
const key =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string) ||
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string) ||
  SUPABASE_KEY_FALLBACK;

export const supabaseConfigured = !url.includes("YOUR-PROJECT-ID") && !key.startsWith("YOUR-");

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "artsfest-auth" },
  global: { fetch: trackedFetch },
});

export const CATEGORIES = ["Aliya", "Thanawiyya", "Thaniya", "Uoola", "Kulliyya"] as const;
export const PROGRAM_TYPES = ["Stage", "Non-stage", "Sports", "Group"] as const;
export const ENTRY_MODES = ["individual", "group", "team"] as const;
export type EntryMode = (typeof ENTRY_MODES)[number];
export const STATUSES = ["upcoming", "completed", "pending"] as const;

export type Category = (typeof CATEGORIES)[number];
export type ProgramType = (typeof PROGRAM_TYPES)[number];

export type Program = {
  id: string;
  code: string;
  name: string;
  type: ProgramType;
  category: Category;
  candidates: number;
  status: string;
  allowed_classes: string | null;
  entry_mode?: EntryMode | null;
  group_count?: number | null;
  group_size?: number | null;
  grading_scheme_id?: string | null;
};

/** How many candidate slots a team must fill for a programme. */
export const slotsFor = (p: Pick<Program, "candidates" | "entry_mode" | "group_count" | "group_size">) => {
  if (p.entry_mode === "team") return 0;
  if (p.entry_mode === "group")
    return Math.max(1, p.group_count || 1) * Math.max(1, p.group_size || 1);
  return Math.max(1, p.candidates || 1);
};

/**
 * Label for one candidate slot: "G1 - C1" for group programmes (so each group
 * is visible), plain "Candidate n" otherwise.
 */
export const slotLabel = (
  p: Pick<Program, "entry_mode" | "group_count" | "group_size">,
  index: number,
) => {
  if (p.entry_mode !== "group") return `Candidate ${index + 1}`;
  const size = Math.max(1, p.group_size || 1);
  return `G${Math.floor(index / size) + 1} - C${(index % size) + 1}`;
};

export const entryModeLabel = (p: Pick<Program, "entry_mode" | "group_count" | "group_size" | "candidates">) => {
  if (p.entry_mode === "team") return "Team entry";
  if (p.entry_mode === "group")
    return `${Math.max(1, p.group_count || 1)} group(s) of ${Math.max(1, p.group_size || 1)}`;
  return `${Math.max(1, p.candidates || 1)} candidate(s)`;
};

export type Team = {
  id: string;
  name: string;
  username?: string;
  short_name?: string | null;
  color?: string | null;
  captain?: string | null;
  vice_captain?: string | null;
  vice_captain2?: string | null;
};

/** Preset team colours offered in the admin panel. */
export const TEAM_COLORS = [
  { name: "Red", hex: "#DC2626" },
  { name: "Blue", hex: "#2563EB" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Brown", hex: "#92400E" },
] as const;

export const isHexColor = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v.trim());

export type Student = {
  id: string;
  adno: string;
  name: string;
  class: string | null;
  category: Category | null;
  team_id: string | null;
  photo_url: string | null;
};

export type TimetableRow = {
  id: string;
  program_id: string;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  stage: string | null;
  /** Optional judge names — admin panel only, never shown publicly. */
  judge1?: string | null;
  judge2?: string | null;
  completed: boolean;

  programs?: Pick<Program, "code" | "name" | "category" | "type" | "entry_mode" | "group_count" | "group_size" | "candidates"> | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
};

const PAGE = 1000;

type Ordering = { column: string; ascending?: boolean };

type PageResult = { data: unknown; error: { message: string } | null; count?: number | null };
type Pageable = { range: (from: number, to: number) => PromiseLike<PageResult> };

/**
 * PostgREST caps a plain select at 1000 rows. Fetch every row in 1000-row
 * pages so admin panels never silently drop entries made by teams. The first
 * page also asks for an exact count, so the remaining pages can be fetched in
 * parallel instead of one-by-one — much faster on big tables.
 *
 * `build()` must return a fresh query (with `{ count: "exact" }`) each call.
 */
export async function fetchAllRows<T>(build: () => Pageable): Promise<T[]> {
  const first = await build().range(0, PAGE - 1);
  if (first.error) throw new Error(first.error.message);
  const head = (first.data as T[] | null) ?? [];
  if (head.length < PAGE) return head;

  const total = first.count ?? null;
  if (total != null) {
    const starts: number[] = [];
    for (let from = PAGE; from < total; from += PAGE) starts.push(from);
    const rest = await Promise.all(
      starts.map(async (from) => {
        const { data, error } = await build().range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        return (data as T[] | null) ?? [];
      }),
    );
    return head.concat(...rest);
  }

  // No count available — fall back to sequential paging.
  const out = [...head];
  for (let from = PAGE; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data as T[] | null) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Fetch every row of a table (no filters) in parallel pages. */
export async function fetchAll<T>(table: string, columns = "*", order?: Ordering): Promise<T[]> {
  return fetchAllRows<T>(() => {
    const q = supabase.from(table).select(columns, { count: "exact" });
    return (order ? q.order(order.column, { ascending: order.ascending ?? true }) : q) as unknown as Pageable;
  });
}


