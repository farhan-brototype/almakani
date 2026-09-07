import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2, LogIn, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SiteLogo } from "@/components/SiteLogo";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FEST } from "@/config";
import { teamLogin } from "@/lib/team-auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: `Sign in — ${FEST.name}` },
      { name: "description", content: "One sign-in for admins and teams of the arts fest." },
      { property: "og:title", content: `Sign in — ${FEST.name}` },
      { property: "og:description", content: "One sign-in for admins and teams of the arts fest." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const tryAdmin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier.trim(),
      password,
    });
    if (error) return false;
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw new Error("This account is not registered as an admin.");
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const looksLikeEmail = identifier.includes("@");
    try {
      // Team usernames may also contain "@" (e.g. teama@fest), so always fall
      // back to a team login before giving up.
      if (looksLikeEmail) {
        let adminError: string | null = null;
        try {
          if (await tryAdmin()) {
            toast.success("Welcome back, admin");
            window.dispatchEvent(new Event("artsfest-session"));
            void navigate({ to: "/programlist" });
            return;
          }
        } catch (err) {
          adminError = err instanceof Error ? err.message : null;
        }
        try {
          const session = await teamLogin(identifier.trim(), password);
          toast.success(`Signed in as ${session.team.name}`);
          window.dispatchEvent(new Event("artsfest-session"));
      void navigate({ to: "/programlist" });
          return;
        } catch {
          throw new Error(adminError ?? "Incorrect username/email or password");
        }
      }
      const session = await teamLogin(identifier.trim(), password);
      toast.success(`Signed in as ${session.team.name}`);
      window.dispatchEvent(new Event("artsfest-session"));
      void navigate({ to: "/programlist" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-16">
        <div className="animate-rise text-center">
          <SiteLogo
            className="mx-auto size-20 rounded-2xl"
            fallback={
              <span className="stage-gradient mx-auto flex size-14 items-center justify-center rounded-2xl text-primary-foreground shadow-lg">
                <Sparkles className="size-7" />
              </span>
            }
          />
          <h1 className="mt-5 font-display text-4xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One door for everyone — admins use their email, teams use their username.
          </p>
        </div>

        {!supabaseConfigured && (
          <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
            to your .env file (see SETUP.md).
          </p>
        )}

        <form onSubmit={submit} className="panel animate-pop mt-8 space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="identifier">Username or email</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="team-a  ·  admin@college.edu"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {busy ? "Checking credentials…" : "Continue"}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <KeyRound className="size-3" /> You are routed automatically to the right panel.
          </p>
        </form>
      </main>
    </div>
  );
}
