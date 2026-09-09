import { useEffect, useRef, useState } from "react";

import efeUrl from "@/assets/T_efe.webp";
import fizoUrl from "@/assets/T_fizo.webp";
import novaUrl from "@/assets/T_nova.webp";
import zoroUrl from "@/assets/T_zoro.webp";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Poster = { key: "nova" | "zoro" | "efe" | "fizo"; name: string; sub: string; url: string };

const POSTERS: Poster[] = [
  { key: "nova", name: "Nova", sub: "Horreya", url: novaUrl },
  { key: "zoro", name: "Zoro", sub: "Zahawi", url: zoroUrl },
  { key: "efe", name: "Efe", sub: "Harafish", url: efeUrl },
  { key: "fizo", name: "Fizo", sub: "Fishawy", url: fizoUrl },
];

/** Dedicated pre-rendered split leader cards in public/TeamBased */
const TEAM_BASED_SPLITS: Record<string, [string, string, string]> = {
  nova: ["/TeamBased/nova-1.png", "/TeamBased/nova-2.png", "/TeamBased/nova-3.png"],
  zoro: ["/TeamBased/zoro-1.png", "/TeamBased/zoro-2.png", "/TeamBased/zoro-3.png"],
  efe: ["/TeamBased/efe-1.png", "/TeamBased/efe-2.png", "/TeamBased/efe-3.png"],
  fizo: ["/TeamBased/fizo-1.png", "/TeamBased/fizo-2.png", "/TeamBased/fizo-3.png"],
};

/** Pre-rendered team split card from public/TeamBased */
function TeamBasedCard({
  src,
  index,
  captain,
  teamName,
}: {
  src: string;
  index: number;
  captain: boolean;
  teamName: string;
}) {
  return (
    <div className="group relative flex min-w-0 flex-col items-center">
      <div
        className={`relative aspect-[1/2.5] w-full overflow-hidden rounded-2xl sm:rounded-3xl border bg-[#140b06] shadow-[0_16px_36px_-12px_rgba(0,0,0,0.85)] transition-all duration-300 ${
          captain
            ? "border-[#ff7826]/80 shadow-[0_22px_50px_-12px_rgba(255,120,38,0.5)] ring-1 ring-[#ff7826]/40 sm:scale-[1.02]"
            : "border-[#c88d51]/30 hover:border-[#ff7826]/50"
        }`}
      >
        <img
          src={src}
          alt={`${teamName} leader ${index + 1}`}
          loading="eager"
          decoding="async"
          draggable={false}
          className="size-full object-cover object-top select-none pointer-events-none"
        />
      </div>
    </div>
  );
}

/** Team posters section — Hardware-accelerated 180° 3D card flip on open & return */
export function TeamPosters() {
  const [active, setActive] = useState<Poster | null>(null);
  const [flipped, setFlipped] = useState(false);
  const flipTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const preloadTeamImages = (teamKey: string) => {
    const splits = TEAM_BASED_SPLITS[teamKey];
    if (splits) {
      splits.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  };

  const handleSelectPoster = (p: Poster) => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);

    preloadTeamImages(p.key);
    setActive(p);
    setFlipped(false);

    // Trigger 180° flip immediately on next paint frame for smooth 60/120fps hardware acceleration
    flipTimerRef.current = window.setTimeout(() => {
      setFlipped(true);
    }, 40);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
      // Flip 180° back to front before closing
      setFlipped(false);

      closeTimerRef.current = window.setTimeout(() => {
        setActive(null);
      }, 480);
    }
  };

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const splits = active ? TEAM_BASED_SPLITS[active.key] : null;

  return (
    <section id="teams" className="bg-background px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-makani text-2xl font-bold uppercase tracking-[0.08em] sm:text-4xl">
            <span className="gold-text">The Teams</span>
          </h2>
          <span className="stage-gradient mx-auto mt-2 block h-[3px] w-14 rounded-full" />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
            Tap a team poster to reveal its leaders
          </p>
        </div>

        {/* Poster Grid */}
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
          {POSTERS.map((p) => (
            <button
              key={p.key}
              type="button"
              data-team={p.key}
              onMouseEnter={() => preloadTeamImages(p.key)}
              onClick={() => handleSelectPoster(p)}
              className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-[#1c110a] text-left shadow-md transition-all duration-300 sm:hover:-translate-y-1.5 sm:hover:border-primary/60 sm:hover:shadow-xl active:scale-[0.98] select-none touch-manipulation cursor-pointer"
            >
              <img
                src={p.url}
                alt={`${p.name} ${p.sub} team`}
                loading="eager"
                decoding="async"
                draggable={false}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset["retried"]) return;
                  img.dataset["retried"] = "1";
                  img.src = `${p.url}${p.url.includes("?") ? "&" : "?"}r=1`;
                }}
                className="aspect-[3/4] w-full object-cover object-top transition-transform duration-500 sm:group-hover:scale-105 pointer-events-none select-none"
              />
            </button>
          ))}
        </div>
      </div>

      {/* 180-Degree 3D Flip Dialog Modal */}
      <Dialog open={!!active} onOpenChange={handleOpenChange}>
        <DialogContent
          overlayClassName="bg-black/85 backdrop-blur-md"
          className="max-w-4xl border-0 bg-transparent p-3 shadow-none data-[state=closed]:animate-none data-[state=open]:animate-none sm:p-6"
        >
          <div className="max-h-[90vh] overflow-y-auto overflow-x-hidden p-1">
            {active ? (
              <>
                <DialogTitle className="text-center font-makani text-xl uppercase tracking-wider sm:text-3xl mb-4">
                  <span className="gold-text">
                    {active.name} {active.sub}
                  </span>
                </DialogTitle>

                {/* 3D Flip Stage */}
                <div className="perspective-1000 relative min-h-[380px] sm:min-h-[500px] flex items-center justify-center">
                  <div
                    className="relative w-full max-w-4xl preserve-3d transition-transform duration-500 ease-[cubic-bezier(0.2,0.85,0.25,1)] will-change-transform"
                    style={{
                      transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    }}
                  >
                    {/* Front Face: Single Team Poster */}
                    <div className="backface-hidden absolute inset-0 flex items-center justify-center p-2">
                      <div className="w-full max-w-[260px] sm:max-w-[300px] aspect-[3/4] overflow-hidden rounded-2xl sm:rounded-3xl border border-[#ff7826]/60 bg-[#1c110a] shadow-[0_22px_50px_-10px_rgba(255,120,38,0.45)] ring-1 ring-[#ff7826]/30">
                        <img
                          src={active.url}
                          alt={`${active.name} poster`}
                          className="size-full object-cover object-top select-none pointer-events-none"
                        />
                      </div>
                    </div>

                    {/* Back Face (180deg): 3 Split Leader Cards */}
                    <div className="backface-hidden rotate-y-180 w-full">
                      {splits && (
                        <div className="grid grid-cols-3 items-start gap-2 sm:gap-4 w-full">
                          {splits.map((src, i) => (
                            <div key={src} className={i === 1 ? "sm:-mt-3" : ""}>
                              <TeamBasedCard
                                src={src}
                                index={i}
                                captain={i === 1}
                                teamName={active.name}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
