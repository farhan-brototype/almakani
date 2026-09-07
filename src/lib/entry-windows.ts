import { supabase } from "./supabase";
import { normKey } from "./fest-rules";
import type { Program } from "./supabase";

export type EntryWindowKind = "item" | "random";

export type EntryWindow = {
  id: string;
  kind: EntryWindowKind;
  name: string;
  deadline: string | null;
  is_open: boolean;
  sort: number;
};

export type EntryWindowProgram = { window_id: string; program_id: string };

export type EntryWindows = {
  windows: EntryWindow[];
  links: EntryWindowProgram[];
};

export async function fetchEntryWindows(): Promise<EntryWindows> {
  const [{ data: w }, { data: l }] = await Promise.all([
    supabase.from("entry_windows").select("*").order("kind").order("sort").order("name"),
    supabase.from("entry_window_programs").select("*"),
  ]);
  return {
    windows: (w as EntryWindow[]) ?? [],
    links: (l as EntryWindowProgram[]) ?? [],
  };
}

/** True when the window's deadline is in the past. */
export const isPast = (w: Pick<EntryWindow, "deadline">, now: Date = new Date()): boolean =>
  Boolean(w.deadline && new Date(w.deadline) < now);

/** A window only allows entry while it is switched on AND the deadline has not passed. */
export const windowOpen = (w: Pick<EntryWindow, "is_open" | "deadline">, now?: Date): boolean =>
  Boolean(w.is_open) && !isPast(w, now);

export type ProgramWindow = {
  window: EntryWindow | null;
  open: boolean;
  deadline: string | null;
  label: string;
};

/**
 * The window that governs a programme. A "random" group the programme was
 * added to always wins over the item (type) window, so an admin can give a
 * handful of codes their own date without touching the rest.
 */
export function windowForProgram(
  program: Pick<Program, "id" | "type">,
  { windows, links }: EntryWindows,
  now?: Date,
): ProgramWindow {
  const randomIds = new Set(
    links.filter((l) => l.program_id === program.id).map((l) => l.window_id),
  );
  const random = windows.find((w) => w.kind === "random" && randomIds.has(w.id));
  const item =
    windows.find((w) => w.kind === "item" && normKey(w.name) === normKey(program.type ?? "")) ??
    null;
  const chosen = random ?? item;
  if (!chosen) return { window: null, open: true, deadline: null, label: "" };
  return {
    window: chosen,
    open: windowOpen(chosen, now),
    deadline: chosen.deadline,
    label: chosen.name,
  };
}

/** Sort key: soonest deadline first, programmes without a deadline last. */
export const deadlineRank = (deadline: string | null): number =>
  deadline ? new Date(deadline).getTime() : Number.POSITIVE_INFINITY;

export function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline";
  return new Date(deadline).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Turn a timestamptz into the value an <input type="datetime-local"> expects. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fromLocalInput = (value: string): string | null =>
  value ? new Date(value).toISOString() : null;
