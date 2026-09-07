import { supabase } from "./supabase";

const KEY = "artsfest-team-session";

export type TeamSession = {
  token: string;
  team: {
    id: string;
    name: string;
    captain: string | null;
    vice_captain: string | null;
    vice_captain2: string | null;
  };
};

export function getTeamSession(): TeamSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TeamSession) : null;
  } catch {
    return null;
  }
}

export function setTeamSession(session: TeamSession) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export async function teamLogin(username: string, password: string): Promise<TeamSession> {
  const { data, error } = await supabase.rpc("team_login", {
    p_username: username,
    p_password: password,
  });
  if (error) throw new Error(error.message);
  const session = data as TeamSession;
  setTeamSession(session);
  return session;
}

export async function teamLogout() {
  const session = getTeamSession();
  if (session) await supabase.rpc("team_logout", { p_token: session.token });
  window.localStorage.removeItem(KEY);
}

export async function teamRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const session = getTeamSession();
  if (!session) throw new Error("Not signed in");
  const { data, error } = await supabase.rpc(fn, { p_token: session.token, ...args });
  if (error) throw new Error(error.message);
  return data as T;
}
