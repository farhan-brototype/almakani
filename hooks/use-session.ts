import { useEffect, useState } from "react";

import { getTeamSession, type TeamSession } from "@/lib/team-auth";
import { supabase } from "@/lib/supabase";

export type Role = "guest" | "admin" | "team";

export type AppSession = {
  loading: boolean;
  role: Role;
  email: string | null;
  team: TeamSession["team"] | null;
};

const EMPTY: AppSession = { loading: true, role: "guest", email: null, team: null };
const CACHE_KEY = "artsfest-session-cache";

/** Shared across every mounted hook so page-to-page navigation never refetches. */
let cached: AppSession | null = null;
let inflight: Promise<AppSession> | null = null;
const listeners = new Set<(s: AppSession) => void>();

function readPersisted(): AppSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppSession;
    return { ...parsed, loading: false };
  } catch {
    return null;
  }
}

function publish(next: AppSession) {
  cached = next;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  for (const l of listeners) l(next);
}

async function resolveSession(): Promise<AppSession> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (user) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin) {
      return { loading: false, role: "admin", email: user.email ?? null, team: null };
    }
  }
  const team = getTeamSession();
  if (team) return { loading: false, role: "team", email: null, team: team.team };
  return { loading: false, role: "guest", email: null, team: null };
}

function refresh(): Promise<AppSession> {
  if (!inflight) {
    inflight = resolveSession()
      .then((next) => {
        publish(next);
        return next;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function clearSessionCache() {
  cached = null;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * One hook that resolves the current viewer: admin (Supabase auth + is_admin),
 * team (token session in localStorage) or guest. The result is cached in
 * memory (and localStorage) so navigating between pages is instant; the real
 * check still runs in the background and corrects the cache.
 */
export function useAppSession(): AppSession {
  const [state, setState] = useState<AppSession>(() => cached ?? readPersisted() ?? EMPTY);

  useEffect(() => {
    if (!cached) {
      const persisted = readPersisted();
      if (persisted) {
        cached = persisted;
        setState(persisted);
      }
    }

    listeners.add(setState);
    void refresh();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED")
        void refresh();
    });
    const onStorage = () => void refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("artsfest-session", onStorage);

    return () => {
      listeners.delete(setState);
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("artsfest-session", onStorage);
    };
  }, []);

  return state;
}
