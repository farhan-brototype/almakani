import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/hooks/use-realtime";

import { supabase, type Announcement } from "@/lib/supabase";
import { teamRpc } from "@/lib/team-auth";
import { PageHeading } from "@/components/PageHeading";


export function TeamAnnouncements() {
  const [rows, setRows] = useState<Announcement[]>([]);

  const load = useCallback(async () => {
    {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      const list = (data as Announcement[]) ?? [];
      setRows(list);
      try {
        const unread = await teamRpc<Announcement[]>("team_unread");
        await Promise.all(
          unread.map((a) => teamRpc("team_mark_read", { p_announcement_id: a.id })),
        );
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["announcements"], () => void load());

  return (
    <div>
      <PageHeading title="Announcements" />
      <p className="text-sm text-muted-foreground">Everything the fest committee has published.</p>

      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="panel p-4">
            <h2 className="font-display text-base font-semibold">{r.title}</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleString()}
            </p>
          </article>
        ))}
        {rows.length === 0 && (
          <p className="panel p-8 text-center text-muted-foreground">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}
