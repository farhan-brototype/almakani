import { fetchAllRows, supabase, type Program } from "./supabase";

export type EntryStatus = "enrolled" | "draft" | "published";

export type MarkSettings = {
  id: number;
  grade_a_percent: number;
  grade_b_percent: number;
  grade_c_percent: number;
  grade_a_points: number;
  grade_b_points: number;
  grade_c_points: number;
  pos1_points: number;
  pos2_points: number;
  pos3_points: number;
};

export type ProgramMarkConfig = {
  program_id: string;
  columns: number;
  grade_a_percent: number | null;
  grade_b_percent: number | null;
  grade_c_percent: number | null;
};

export type ResultEntry = {
  id: string;
  program_id: string;
  team_id: string | null;
  student_id: string | null;
  is_group: boolean;
  mark1: number | null;
  mark2: number | null;
  total: number;
  max_total: number;
  percent: number;
  position: number | null;
  grade: string | null;
  points: number;
  status: EntryStatus;
  manual_override: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  programs?: { code: string; name: string; type: string; category: string } | null;
  students?: {
    adno: string;
    name: string;
    photo_url: string | null;
    class: string | null;
    category: string | null;
  } | null;
  teams?: { name: string; short_name: string | null } | null;
};

/** Row shape returned by published_results() / live_results(). */
export type PublicResultRow = {
  id: string;
  program_id: string;
  program_code: string;
  program_name: string;
  type: string;
  category: string;
  status?: EntryStatus;
  position: number | null;
  grade: string | null;
  points: number;
  total?: number;
  max_total?: number;
  percent?: number;
  is_group: boolean;
  adno: string | null;
  student_name: string | null;
  photo_url: string | null;
  team_id: string | null;
  team_name: string | null;
  team_short: string | null;
  published_at?: string | null;
  updated_at?: string | null;
};

export type TeamResultRow = {
  id: string;
  program_code: string;
  program_name: string;
  type: string;
  category: string;
  position: number | null;
  grade: string | null;
  points: number;
  total: number;
  max_total: number;
  is_group: boolean;
  student_id: string | null;
  adno: string | null;
  student_name: string | null;
  photo_url: string | null;
};

export const ENTRY_SELECT =
  "*, programs(code,name,type,category), students(adno,name,photo_url,class,category), teams(name,short_name)";

export async function fetchMarkSettings(): Promise<MarkSettings> {
  const { data } = await supabase.from("mark_settings").select("*").eq("id", 1).maybeSingle();
  return (data as MarkSettings) ?? {
    id: 1,
    grade_a_percent: 80,
    grade_b_percent: 60,
    grade_c_percent: 40,
    grade_a_points: 5,
    grade_b_points: 3,
    grade_c_points: 1,
    pos1_points: 5,
    pos2_points: 3,
    pos3_points: 1,
  };
}

export async function fetchEntries(status?: EntryStatus): Promise<ResultEntry[]> {
  const data = await fetchAllRows<ResultEntry>(() => {
    const q = supabase.from("result_entries").select(ENTRY_SELECT, { count: "exact" }).order("id");
    return (status ? q.eq("status", status) : q) as never;
  });
  return data.sort((a, b) => {
    const c = (a.programs?.code ?? "").localeCompare(b.programs?.code ?? "");
    return c !== 0 ? c : (a.position ?? 99) - (b.position ?? 99);
  });
}

export async function fetchPublicResults(): Promise<PublicResultRow[]> {
  const { data } = await supabase.rpc("published_results");
  return (data as PublicResultRow[]) ?? [];
}

export async function fetchLiveResults(): Promise<PublicResultRow[]> {
  const { data } = await supabase.rpc("live_results");
  return (data as PublicResultRow[]) ?? [];
}

/** Group programmes (and General category) score for the team, not the student. */
export function isGroupProgram(program: Pick<Program, "type" | "category">, groupTypes: Set<string>) {
  return groupTypes.has((program.type ?? "").toLowerCase()) || program.category === "Kulliyya";
}

export async function fetchGroupTypes(): Promise<Set<string>> {
  const { data } = await supabase.from("category_items").select("name,kind");
  return new Set(
    ((data as { name: string; kind: string }[]) ?? [])
      .filter((i) => i.kind === "Group")
      .map((i) => i.name.toLowerCase()),
  );
}

export const TEAM_COLORS = [
  "hsl(221 83% 53%)",
  "hsl(0 72% 51%)",
  "hsl(25 55% 33%)",
  "hsl(45 93% 47%)",
  "hsl(271 76% 53%)",
  "hsl(190 90% 40%)",
];

/** Fixed brand colours per team letter — A blue, B red, C brown, D yellow. */
export const TEAM_LETTER_COLORS: Record<string, string> = {
  a: "hsl(221 83% 53%)",
  b: "hsl(0 72% 51%)",
  c: "hsl(25 55% 33%)",
  d: "hsl(45 93% 47%)",
};

/** Pull the team letter out of names like "Team A", "TEAM-B", "A" or "C Team". */
export function teamLetter(name?: string | null): string | null {
  if (!name) return null;
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const tokens = cleaned.split(" ").filter((t) => t !== "team");
  const letter = tokens.find((t) => t.length === 1 && t >= "a" && t <= "z");
  return letter ?? null;
}

export function teamColor(index: number, name?: string | null): string {
  const letter = teamLetter(name);
  if (letter && TEAM_LETTER_COLORS[letter]) return TEAM_LETTER_COLORS[letter]!;
  return TEAM_COLORS[index % TEAM_COLORS.length]!;
}


/** Only the top three count as positions — anything below is grade-only. */
export function positionText(position: number | null): string {
  if (!position) return "—";
  if (position === 1) return "First";
  if (position === 2) return "Second";
  if (position === 3) return "Third";
  return "—";
}

export function exactTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Sum points by team name from any row list. */
export function totalsByTeam<T extends { team_name: string | null; points: number }>(rows: T[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!r.team_name) continue;
    map.set(r.team_name, (map.get(r.team_name) ?? 0) + (r.points ?? 0));
  }
  return [...map.entries()]
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points);
}
