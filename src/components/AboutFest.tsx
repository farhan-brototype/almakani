import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import alUrl from "@/assets/al.png";
import brewingUrl from "@/assets/Brewing_ideas_together.png";
import islahUrl from "@/assets/islah_arts_fest.png";
import makaniUrl from "@/assets/makani.png";
import { cn } from "@/lib/utils";

type Slide = {
  id: string;
  title: string;
  mobileText: ReactNode;
  desktopText: ReactNode;
};

const SLIDES: Slide[] = [
  {
    id: "about",
    title: "About Al Makani",
    mobileText: (
      <>
        A cultural space where diverse voices meet, ideas are brewed, and creativity becomes a
        collective experience.
      </>
    ),
    desktopText: (
      <>
        A cultural space where diverse voices meet, ideas are brewed, and creativity becomes a
        collective experience. It becomes a ground for intellectual protest, where questioning power,
        reclaiming identity, and confronting erasure transform artistic expression into a quiet
        revolution for existence itself.
      </>
    ),
  },
  {
    id: "logo",
    title: "Concept of Logo",
    mobileText: (
      <>
        Al Makani is where people come together. Different backgrounds, experiences and perspectives
        occupy the same space. Conversations begin casually, but they can evolve into questions that
        challenge society.
      </>
    ),
    desktopText: (
      <>
        <p>
          Al Makani is where people come together. Different backgrounds, experiences and
          perspectives occupy the same space. Conversations begin casually, but they can evolve
          into questions that challenge society.
        </p>
        <p className="mt-4">
          The logo carries this very idea. The Malayalam lettering gives the festival its{" "}
          <em className="font-medium not-italic text-foreground">cultural identity</em>, while the
          word <em className="font-medium not-italic text-foreground">“Together”</em> represents
          the coming together of individuals, ideas and artistic expressions.
        </p>
      </>
    ),
  },
];

/**
 * The four artwork pieces, positioned exactly as they sit in the original logo
 * ("al" on the same baseline as "makani", "Islah Arts Fest '26" underneath and
 * "Brewing Ideas Together" at the top right). The drift values control how far
 * each piece travels on the Concept slide — a little more spread out than before.
 */
const PIECES = [
  {
    src: alUrl,
    alt: "Al",
    left: 0.45,
    top: 7,
    width: 21.75,
    dx: -22,
    dy: -14,
    rot: -5,
  },
  {
    src: makaniUrl,
    alt: "Makani",
    left: 0.55,
    top: 40.7,
    width: 98.8,
    dx: 6,
    dy: 2,
    rot: 2,
  },
  {
    src: islahUrl,
    alt: "Islah Arts Fest '26",
    left: 0.55,
    top: 86.9,
    width: 98.4,
    dx: -4,
    dy: 18,
    rot: -2,
  },
  {
    src: brewingUrl,
    alt: "Brewing Ideas Together",
    left: 71.5,
    top: 10,
    width: 28.1,
    dx: 18,
    dy: -16,
    rot: 7,
  },
];


function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-makani text-2xl font-bold uppercase tracking-[0.08em] sm:text-4xl">
        <span className="gold-text">{children}</span>
      </h2>
      <span className="stage-gradient mt-2 block h-[3px] w-14 rounded-full" />
    </div>
  );
}

/**
 * The logo artwork. At split = 0 the four pieces sit exactly as they do in the
 * original logo and the whole mark gently jumps. As split → 1 each piece drifts
 * slightly away from the others.
 */
function LogoArtwork({ split }: { split: number }) {
  return (
    <div
      className={cn(
        "relative w-[17rem] sm:w-[26rem]",
        split < 0.05 && "animate-float"
      )}
      style={{ aspectRatio: "1099 / 604" }}
    >
      {PIECES.map((piece, i) => (
        <img
          key={piece.alt}
          src={piece.src}
          alt={piece.alt}
          className="absolute object-contain"
          style={{
            left: `${piece.left}%`,
            top: `${piece.top}%`,
            width: `${piece.width}%`,
            transform: `translate(${piece.dx * split}%, ${piece.dy * split * 3}%) rotate(${piece.rot * split}deg)`,
            transition: "transform 140ms linear",
            transitionDelay: `${i * 25}ms`,
          }}
        />
      ))}
    </div>
  );
}


/**
 * One shared viewport section. The logo keeps its place; scrolling swaps the
 * text from "About Al Makani" to "Concept of Logo" while the logo splits into
 * its individual artwork elements.
 */
export function AboutFest() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && setSeen(true),
      { threshold: 0.35 }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let raf = 0;
    const handleScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const track = rect.height - window.innerHeight;
        const next = track <= 0 ? 0 : Math.max(0, Math.min(1, -rect.top / track));
        setProgress(next);
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Text cross-fade and the split both happen across the middle of the scroll.
  const fade = Math.max(0, Math.min(1, (progress - 0.3) / 0.35));
  const activeDot = fade < 0.5 ? 0 : 1;

  // Slides travel horizontally: before the section is seen the text waits off
  // to the right, then the outgoing slide exits left while the incoming one
  // enters from the right.
  const slideStyle = (i: number): CSSProperties => {
    const hiddenX = 70;
    if (!seen) {
      return {
        opacity: 0,
        transform: `translateX(${hiddenX}px)`,
        transition: "opacity 700ms ease, transform 800ms cubic-bezier(.2,.8,.2,1)",
      };
    }
    const o = i === 0 ? 1 - fade : fade;
    const x = i === 0 ? -46 * fade : 46 * (1 - fade);
    return {
      opacity: o,
      transform: `translateX(${x}px)`,
      transition: "opacity 700ms ease, transform 800ms cubic-bezier(.2,.8,.2,1)",
    };
  };

  return (
    <section ref={sectionRef} id="about" className="relative h-[200vh] overflow-clip bg-background">

      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        <div className="absolute left-1/2 top-8 z-20 flex -translate-x-1/2 items-center gap-3 sm:top-10">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "block h-2 w-2 rounded-full transition-all duration-500",
                i === activeDot ? "w-6 bg-primary" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Mobile — logo above, text below */}
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 px-6 text-center md:hidden">
          <div className="scale-[0.85]">
            <LogoArtwork split={fade} />
          </div>
          <div className="relative w-full">
            {SLIDES.map((slide, i) => {
              const o = i === 0 ? 1 - fade : fade;
              return (
                <div
                  key={slide.id}
                  aria-hidden={o < 0.5}
                  className={cn("flex flex-col items-center", i === 1 && "absolute inset-0")}
                  style={slideStyle(i)}
                >
                  <SectionHeading>{slide.title}</SectionHeading>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {slide.mobileText}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop — logo left, text right, places fixed */}
        <div className="mx-auto hidden w-full max-w-6xl grid-cols-2 items-center gap-12 px-12 md:grid">
          <div className="flex justify-center">
            <LogoArtwork split={fade} />
          </div>
          <div className="relative">
            {SLIDES.map((slide, i) => {
              const o = i === 0 ? 1 - fade : fade;
              return (
                <div
                  key={slide.id}
                  aria-hidden={o < 0.5}
                  className={cn(i === 1 && "absolute inset-0")}
                  style={slideStyle(i)}
                >
                  <SectionHeading>{slide.title}</SectionHeading>
                  <div className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                    {slide.desktopText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
