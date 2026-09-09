import { Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

import cursorUrl from "@/assets/cursor.png";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteLogo } from "@/components/SiteLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { FEST } from "@/config";
import { useAppSession } from "@/hooks/use-session";
import { useSiteSettings } from "@/lib/site";



/**
 * Shared chrome for every public page.
 *
 * `hideable` pages (the home page) disappear behind a maintenance notice when
 * the admin flips "Hide main page" in Settings. The menu bar always stays.
 */
export function PublicShell({
  children,
  hideable = false,
  title,
  subtitle,
}: {
  children: ReactNode;
  hideable?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const { settings, loading } = useSiteSettings();
  const { role } = useAppSession();
  const hidden = hideable && settings.main_hidden && role !== "admin";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <NotificationBell />
      <main className="flex-1">
        {title && (
          <div
            className="relative border-b border-border/60"
            style={{ backgroundColor: "#1c110a" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(28,17,10,0.55), rgba(28,17,10,0.85))",
              }}
            />
            <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
              <h1 className="font-display animate-rise text-3xl font-semibold text-primary-foreground sm:text-4xl">
                {title}
              </h1>
              {subtitle && (
                <p className="animate-rise mt-2 max-w-2xl text-sm text-primary-foreground/70 sm:text-base">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}
        
        {hideable && loading ? (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
            <img
              src={cursorUrl}
              alt=""
              className="w-16 animate-spin object-contain [animation-duration:1.4s] sm:w-20"
              draggable={false}
            />
          </div>
        ) : hidden ? (
          <section className="relative isolate flex min-h-[calc(100vh-8rem)] flex-col items-center justify-start overflow-hidden px-4 pt-16 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "linear-gradient(180deg, rgba(238,196,186,0.55) 0%, rgba(214,222,214,0.35) 18%, hsl(var(--background)) 55%)",
              }}
            />
            <SiteLogo
              className="h-16 w-auto"
              alt={settings.fest_name || FEST.name}
              fallback={
                <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <Wrench className="size-6 text-muted-foreground" />
                </span>
              }
            />
            <h1 className="font-makani mt-10 text-4xl font-bold uppercase tracking-[0.04em] sm:text-6xl">
              {settings.hero_title || settings.fest_name || FEST.name}
            </h1>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              {settings.hero_subtitle || FEST.tagline}
            </p>
            <span className="mt-8 rounded-full border border-border px-6 py-2.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {settings.maintenance_message || "Main page coming soon"}
            </span>
          </section>
        ) : (

          children
        )}
      </main>
      <footer
        className="relative border-t border-[#c88d51]/20 py-8 text-primary-foreground"
        style={{ backgroundColor: "#1c110a" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(40rem 20rem at 50% 0%, rgba(249, 115, 22, 0.08), transparent 70%)",
          }}
        />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-[#d4bca7]/80 sm:flex-row">
          <p className="font-medium">
            © {new Date().getFullYear()} {FEST.college} ·{" "}
            <span className="text-[#ff7826] font-semibold">{FEST.name}</span>
          </p>
          <div className="flex gap-5">
            <Link to="/schedule" className="transition-colors hover:text-[#ffa347]">
              Schedule
            </Link>
            <Link to="/documents" className="transition-colors hover:text-[#ffa347]">
              Documents
            </Link>
            <Link to="/results" className="transition-colors hover:text-[#ffa347]">
              Results
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
