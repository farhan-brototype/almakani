import { useEffect, useState } from "react";

import { supabase, supabaseConfigured } from "./supabase";

export type SiteSettings = {
  entry_open: boolean;
  /** Universal registration window (applies to every programme). */
  reg_start: string | null;
  reg_deadline: string | null;
  reg_is_open: boolean;
  /** When off the matching time is only a note — it never opens/closes by itself. */
  reg_use_start: boolean;
  reg_use_deadline: boolean;

  live_enabled: boolean;
  fest_name: string;
  main_hidden: boolean;
  /** Grand Results mode — podium labels + celebration on the Team Points page. */
  grand_results: boolean;
  maintenance_message: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  about_text: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  contact_map_url: string | null;
  logo_url: string | null;
  /** External album link shown as "All Photos" on the Gallery page. */
  gallery_link: string | null;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  entry_open: true,
  reg_start: null,
  reg_deadline: null,
  reg_is_open: true,
  reg_use_start: false,
  reg_use_deadline: false,

  live_enabled: false,
  fest_name: "Arts Fest",
  main_hidden: false,
  grand_results: false,
  maintenance_message: "The page will be updated soon.",
  hero_title: null,
  hero_subtitle: null,
  about_text: null,
  contact_email: null,
  contact_phone: null,
  contact_address: null,
  contact_map_url: null,
  logo_url: null,
  gallery_link: null,
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  if (!supabaseConfigured) return DEFAULT_SETTINGS;
  try {
    // Never let a slow/unreachable backend hold the page hostage.
    const query = supabase.from("fest_settings").select("*").eq("id", 1).maybeSingle();
    const { data } = (await Promise.race([
      query,
      new Promise((_, reject) => setTimeout(() => reject(new Error("settings timeout")), 4000)),
    ])) as Awaited<typeof query>;
    return { ...DEFAULT_SETTINGS, ...((data as Partial<SiteSettings> | null) ?? {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Cached across mounts so switching pages doesn't re-block on settings. */
let settingsCache: SiteSettings | null = null;
const settingsListeners = new Set<(s: SiteSettings) => void>();

/** Re-read the settings row and push it to every mounted consumer immediately. */
export async function refreshSiteSettings(): Promise<SiteSettings> {
  const next = await fetchSiteSettings();
  settingsCache = next;
  for (const fn of settingsListeners) fn(next);
  return next;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(settingsCache ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(settingsCache === null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const next = await fetchSiteSettings();
        settingsCache = next;
        if (active) setSettings(next);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    settingsListeners.add(setSettings);
    if (!supabaseConfigured) {
      return () => {
        active = false;
        settingsListeners.delete(setSettings);
      };
    }
    const channel = supabase
      .channel(`site-settings-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fest_settings" },
        () => void load(),
      )
      .subscribe();
    // Safety net: keeps the registration window, live switch and site texts
    // correct even if the socket drops or an armed time simply arrives.
    const poll = window.setInterval(() => void load(), 20_000);
    const onFocus = () => void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      settingsListeners.delete(setSettings);
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, []);


  return { settings, loading };
}

export type DocumentRow = {
  id: string;
  title: string;
  remarks: string | null;
  category: string | null;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  sort_order?: number | null;
  created_at: string;
};

export type GalleryRow = {
  id: string;
  title: string | null;
  caption: string | null;
  album: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  sort_order?: number | null;
  created_at: string;
};

export type ResultRow = {
  id: string;
  program_id: string | null;
  program_code: string;
  program_name: string | null;
  category: string | null;
  type: string | null;
  position: number | null;
  grade: string | null;
  points: number;
  adno: string | null;
  student_name: string | null;
  team_id: string | null;
  team_name: string | null;
  published: boolean;
  created_at: string;
};

export type AiDocumentRow = {
  id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function positionLabel(position: number | null): string {
  if (!position) return "—";
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";
  return "—";
}
