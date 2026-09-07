import { createFileRoute } from "@tanstack/react-router";
import { useRealtime } from "@/hooks/use-realtime";
import { Crown, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { FEST } from "@/config";
import { supabase, type Team } from "@/lib/supabase";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: `Teams & Captains — ${FEST.name}` },
      {
        name: "description",
        content: "The competing teams of the arts fest with their captains and vice captains.",
      },
      { property: "og:title", content: `Teams & Captains — ${FEST.name}` },
      {
        property: "og:description",
        content: "The competing teams of the arts fest with their captains and vice captains.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("teams_public").select("*").order("name");
    setTeams((data as Team[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["teams"], () => void load());

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-3xl font-semibold">Teams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Captains and vice captains leading each team of {FEST.name}.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {teams.map((t) => (
            <div key={t.id} className="panel p-5">
              <h2 className="font-display text-xl font-semibold">{t.name}</h2>
              <div className="mt-4 space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Crown className="size-4 text-accent-foreground" />
                  <span className="text-muted-foreground">Captain:</span>
                  <span className="font-medium">{t.captain ?? "—"}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Shield className="size-4 text-accent-foreground" />
                  <span className="text-muted-foreground">Vice captain:</span>
                  <span className="font-medium">{t.vice_captain ?? "—"}</span>
                </p>
                {t.vice_captain2 ? (
                  <p className="flex items-center gap-2">
                    <Shield className="size-4 text-accent-foreground" />
                    <span className="text-muted-foreground">Vice captain 2:</span>
                    <span className="font-medium">{t.vice_captain2}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground">No teams added yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
