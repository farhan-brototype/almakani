import { useEffect, useRef } from "react";

import { supabase, supabaseConfigured } from "@/lib/supabase";

/**
 * Subscribe to postgres changes on a set of tables and re-run `onChange`
 * (debounced) whenever any of them is touched. Keeps every panel live.
 *
 * Also refreshes when the tab regains focus / becomes visible and when the
 * realtime socket reconnects, so a dropped connection never leaves a page
 * showing stale data.
 */
export function useRealtime(tables: string[], onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = tables.join(",");

  useEffect(() => {
    if (!supabaseConfigured) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ping = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 250);
    };
    const channel = supabase.channel(`live:${key}:${Math.random().toString(36).slice(2)}`);
    for (const table of key.split(",")) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, ping);
    }
    channel.subscribe((status) => {
      // A fresh (re)subscription may have missed events while it was down.
      if (status === "SUBSCRIBED") ping();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    window.addEventListener("focus", ping);
    window.addEventListener("online", ping);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", ping);
      window.removeEventListener("online", ping);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [key]);
}
