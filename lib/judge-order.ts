export const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export type OrderedCandidate = {
  adno: string;
  student: string;
  team: string;
  team_id?: string | null;
  student_id?: string | null;
};

/** Small stable hash so a programme always starts from the same team. */
function codeOffset(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i += 1) h = (h * 31 + code.charCodeAt(i)) % 100000;
  return h;
}

/**
 * Canonical candidate order for a programme: a round-robin over the teams so
 * two candidates of one team never follow each other. Deterministic — the
 * judgement sheet and the result enrolling screen both call this, so the two
 * lists always run in exactly the same order.
 */
export function orderCandidates<T extends OrderedCandidate>(code: string, list: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const c of list) {
    const arr = buckets.get(c.team) ?? [];
    arr.push(c);
    buckets.set(c.team, arr);
  }
  const teams = [...buckets.keys()].sort((a, b) => a.localeCompare(b));
  if (teams.length === 0) return [];
  for (const t of teams) buckets.get(t)!.sort((a, b) => a.adno.localeCompare(b.adno));

  const offset = codeOffset(code) % teams.length;
  const rotated = teams.map((_, i) => teams[(i + offset) % teams.length]!);
  const out: T[] = [];
  let guard = 0;
  while (out.length < list.length && guard < 1000) {
    for (const team of rotated) {
      const next = buckets.get(team)?.shift();
      if (next) out.push(next);
    }
    guard += 1;
  }
  return out;
}

/**
 * Same team round-robin as orderCandidates, but the order inside a team is kept
 * exactly as given. Used for group rows, where each entry is a whole group.
 */
export function interleaveByTeam<T extends { team: string }>(code: string, list: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const c of list) {
    const arr = buckets.get(c.team) ?? [];
    arr.push(c);
    buckets.set(c.team, arr);
  }
  const teams = [...buckets.keys()].sort((a, b) => a.localeCompare(b));
  if (teams.length === 0) return [];
  const offset = codeOffset(code) % teams.length;
  const rotated = teams.map((_, i) => teams[(i + offset) % teams.length]!);
  const out: T[] = [];
  let guard = 0;
  while (out.length < list.length && guard < 1000) {
    for (const team of rotated) {
      const next = buckets.get(team)?.shift();
      if (next) out.push(next);
    }
    guard += 1;
  }
  return out;
}

export const letterFor = (index: number): string => LETTERS[index] ?? String(index + 1);
