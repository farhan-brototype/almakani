import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAppSession } from "@/hooks/use-session";
import { useRealtime } from "@/hooks/use-realtime";
import { teamRpc } from "@/lib/team-auth";

type Announcement = { id: string; title: string; body: string | null; created_at: string };
type Registration = {
  id: string;
  program_code: string;
  program_name: string | null;
  status: string;
  admin_note: string | null;
  seen_by_team: boolean;
  reviewed_at: string | null;
};

/**
 * Floating bell for teams: unread announcements plus registration approvals or
 * rejections they have not looked at yet.
 */
export function NotificationBell() {
  const { role } = useAppSession();
  const [news, setNews] = useState<Announcement[]>([]);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (role !== "team") return;
    try {
      const [unread, registrations] = await Promise.all([
        teamRpc<Announcement[]>("team_unread"),
        teamRpc<Registration[]>("team_registrations"),
      ]);
      setNews(unread ?? []);
      setRegs(
        (registrations ?? []).filter((r) => r.status !== "pending" && !r.seen_by_team).reverse(),
      );
    } catch {
      /* signed out or offline — leave the bell empty */
    }
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["announcements", "registrations"], () => void load());

  if (role !== "team") return null;

  const count = news.length + regs.length;

  const markRegistrationsSeen = async () => {
    if (regs.length === 0) return;
    try {
      await teamRpc("team_mark_registrations_seen");
      setRegs([]);
    } catch {
      /* ignore */
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && news.length > 0) {
      const seen = news;
      setNews([]);
      void Promise.all(
        seen.map((a) => teamRpc("team_mark_read", { p_announcement_id: a.id })),
      ).catch(() => {
        /* ignore — badge will resync on next load if marking failed */
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={count ? `${count} new notifications` : "Notifications"}
          className="fixed right-4 top-4 z-[60] size-11 rounded-full bg-background/90 shadow-xl backdrop-blur transition-transform hover:scale-105 active:scale-95 sm:right-6 sm:top-6 sm:size-12"
        >
          <Bell className="size-5 text-foreground" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="z-[70] w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
        <div className="max-h-80 overflow-y-auto">
          {count === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              You are all caught up.
            </p>
          )}

          {regs.map((r) => (
            <Link
              key={r.id}
              to="/registration"
              onClick={() => {
                setOpen(false);
                void markRegistrationsSeen();
              }}
              className="block border-b px-4 py-3 last:border-0 hover:bg-muted"
            >
              <p className="text-sm font-medium">
                {r.program_code} — {r.program_name}
              </p>
              <p
                className={
                  r.status === "approved"
                    ? "text-xs font-semibold text-emerald-600"
                    : "text-xs font-semibold text-destructive"
                }
              >
                Registration {r.status}
              </p>
              {r.admin_note && <p className="mt-0.5 text-xs text-muted-foreground">{r.admin_note}</p>}
            </Link>
          ))}

          {news.map((n) => (
            <Link
              key={n.id}
              to="/programlist"
              search={{ tab: "announcements" } as never}
              onClick={() => setOpen(false)}
              className="block border-b px-4 py-3 last:border-0 hover:bg-muted"
            >
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
