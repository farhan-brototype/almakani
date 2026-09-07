import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import cursorUrl from "@/assets/cursor.png";
import { AboutFest } from "@/components/AboutFest";
import { FloatingPetals } from "@/components/FloatingPetals";
import { MuralScene } from "@/components/MuralScene";
import { OurTeam } from "@/components/OurTeam";
import { PublicShell } from "@/components/PublicShell";
import { TeamPosters } from "@/components/TeamPosters";
import { FEST } from "@/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${FEST.name} — ${FEST.college}` },
      {
        name: "description",
        content: `Official home of ${FEST.name}, the arts festival of ${FEST.college}. Documents, gallery and results.`,
      },
      { property: "og:title", content: `${FEST.name} — ${FEST.college}` },
      {
        property: "og:description",
        content: `Official home of ${FEST.name}. Documents, gallery and results.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [heroReady, setHeroReady] = useState(false);
  const [gateGone, setGateGone] = useState(false);

  // Never leave visitors stuck behind the loader if the image stalls.
  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!heroReady) return;
    const t = setTimeout(() => setGateGone(true), 700);
    return () => clearTimeout(t);
  }, [heroReady]);

  return (
    <PublicShell hideable>
      {!gateGone && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-background transition-opacity duration-700 ${heroReady ? "opacity-0" : "opacity-100"}`}
        >
          <img
            src={cursorUrl}
            alt=""
            className="w-16 animate-spin object-contain [animation-duration:1.4s] sm:w-20"
            draggable={false}
          />
          <span className="sr-only">Loading</span>
        </div>
      )}

      <FloatingPetals />

      <div className={`relative transition-opacity duration-700 ${heroReady ? "opacity-100" : "opacity-0"}`}>
        <section className="relative isolate h-screen w-full overflow-hidden">
          {/* Painted mural: logo in the diamond, team flags on the huts, steaming tea */}
          <MuralScene onReady={() => setHeroReady(true)} />
        </section>
        <AboutFest />
        <OurTeam />
        <TeamPosters />
      </div>
    </PublicShell>
  );
}
