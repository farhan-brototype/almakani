import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FEST } from "@/config";
import { getTeamSession, teamLogout, teamRpc, type TeamSession } from "@/lib/team-auth";
import type { Announcement } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/team")({
  ssr: false,
  head: () => ({
    meta: [{ title: `Team Panel — ${FEST.name}` }, { name: "robots", content: "noindex" }],
  }),
  component: TeamLayout,
});

const NAV: { to: string; label: string; icon: typeof Users; exact?: boolean }[] = [
  { to: "/team", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/team/overview", label: "Overview", icon: CalendarClock },
  { to: "/team/assign", label: "Programme Assigning", icon: ClipboardList },
  { to: "/team/students", label: "Our Students", icon: Users },
  { to: "/team/announcements", label: "Announcements", icon: Megaphone },
];

function TeamLayout() {
  const [session, setSession] = useState<TeamSession | null>(null);
  const [unread, setUnread] = useState<Announcement[]>([]);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const loadUnread = useCallback(async () => {
    try {
      setUnread(await teamRpc<Announcement[]>("team_unread"));
    } catch {
      setUnread([]);
    }
  }, []);

  useEffect(() => {
    const s = getTeamSession();
    if (!s) {
      void navigate({ to: "/login" });
      return;
    }
    setSession(s);
    void loadUnread();
  }, [navigate, loadUnread]);

  const markRead = async (id: string) => {
    await teamRpc("team_mark_read", { p_announcement_id: id });
    setUnread((list) => list.filter((a) => a.id !== id));
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <p className="text-base font-semibold">{session.team.name}</p>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Team panel
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="size-5" />
                {unread.length > 0 && (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                    {unread.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Unread announcements</DropdownMenuLabel>
              {unread.length === 0 && (
                <DropdownMenuItem disabled>You're all caught up</DropdownMenuItem>
              )}
              {unread.map((a) => (
                <DropdownMenuItem
                  key={a.id}
                  className="flex-col items-start gap-1"
                  onSelect={() => void markRead(a.id)}
                >
                  <span className="font-medium">{a.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{a.body}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={async () => {
              await teamLogout();
              window.dispatchEvent(new Event("artsfest-session"));
              void navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" /> Logout
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as "/team"}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
