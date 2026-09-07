import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarClock,
  ClipboardList,
  Cog,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  Megaphone,
  Settings2,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { FEST } from "@/config";
import { useAdminSession } from "@/hooks/use-admin";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: `Admin Panel — ${FEST.name}` }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});

const NAV: { to: string; label: string; icon: typeof Users; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/overview", label: "Overview", icon: CalendarClock },
  { to: "/admin/programmes", label: "Programmes", icon: ListChecks },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/results", label: "Results", icon: Trophy },
  { to: "/admin/timetable", label: "Time Table", icon: CalendarClock },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/assigning", label: "Assigning", icon: ClipboardList },
  { to: "/admin/control", label: "Fest Control", icon: Settings2 },
  { to: "/admin/accounts", label: "Team Accounts", icon: UsersRound },
  { to: "/admin/settings", label: "Settings", icon: Cog },
];

function AdminLayout() {
  const { loading, isAdmin, email } = useAdminSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !isAdmin) void navigate({ to: "/login" });
  }, [loading, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="px-5 py-5">
          <p className="gold-text text-lg font-semibold">{FEST.name}</p>
          <p className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60">
            Admin panel
          </p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as "/admin"}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-primary shadow-sm"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-primary",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border p-3 text-xs">
          <p className="truncate px-1 text-sidebar-foreground/60">{email}</p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-2"
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" /> Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1">
        <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-card/95 px-3 py-2 backdrop-blur md:hidden">
          <div className="flex flex-1 gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to as "/admin"}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-foreground/70 hover:bg-muted",
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Logout"
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
        <main className="mx-auto max-w-7xl p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
