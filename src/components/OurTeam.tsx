import { ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type TeamLeader = {
  id: string;
  name: string;
  role: string;
  phone: string;
  cleanPhone: string;
  image: string;
};

export const TEAM_LEADERS: TeamLeader[] = [
  {
    id: "noufal",
    name: "NOUFAL HUDAWI",
    role: "Chief controller",
    phone: "+91 75580 46547",
    cleanPhone: "917558046547",
    image: "/OurTeams/noufal.png",
  },
  {
    id: "shebeeb",
    name: "MUHAMMED SHEBEEB",
    role: "Coordinator",
    phone: "+91 92075 20965",
    cleanPhone: "919207520965",
    image: "/OurTeams/Shebeeb.png",
  },
  {
    id: "zeham",
    name: "ZEHAM AHMED",
    role: "Ass. coordinator",
    phone: "+91 88912 68100",
    cleanPhone: "918891268100",
    image: "/OurTeams/zeham.png",
  },
  {
    id: "adnan",
    name: "MUHAMMED ADNAN",
    role: "Ass. coordinator",
    phone: "+91 79945 59163",
    cleanPhone: "917994559163",
    image: "/OurTeams/adnan.png",
  },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.76.46 3.42 1.27 4.86L2 22l5.28-1.38A9.94 9.94 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10Zm0 18.2c-1.6 0-3.1-.44-4.38-1.2l-.31-.19-3.13.82.84-3.05-.2-.32a8.16 8.16 0 0 1-1.26-4.36c0-4.53 3.69-8.2 8.24-8.2 4.54 0 8.23 3.67 8.23 8.2 0 4.53-3.69 8.3-8.03 8.3Zm4.53-6.13c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.38-1.72c-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

/** Individual Team Leader Card */
function LeaderCard({
  leader,
  inView,
  index,
}: {
  leader: TeamLeader;
  inView: boolean;
  index: number;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const animated = inView && imgLoaded;

  return (
    <div
      className="group relative flex h-[410px] w-[86vw] max-w-[340px] flex-shrink-0 select-none flex-col justify-between overflow-hidden rounded-3xl border border-[#c88d51]/20 bg-[#160d07] p-5 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.85)] transition-[border-color,box-shadow] duration-300 sm:hover:border-[#ff7826]/50 sm:hover:shadow-[0_20px_44px_-10px_rgba(255,120,38,0.2)] sm:h-[440px] sm:w-[380px] sm:max-w-[390px] sm:p-6"
      style={{
        background:
          "radial-gradient(circle at 75% 25%, rgba(255, 120, 38, 0.12), transparent 55%), linear-gradient(180deg, #190f08 0%, #120a05 100%)",
      }}
    >
      {/* Background ambient lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-[#ff7826]/10 blur-3xl transition-opacity sm:group-hover:opacity-100"
      />

      {/* Person Cutout Photo - sliding up from bottom */}
      <div className="absolute inset-y-0 left-0 w-[52%] sm:w-[50%] pointer-events-none">
        <img
          src={leader.image}
          alt={leader.name}
          loading="lazy"
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          className="absolute bottom-0 left-1 h-[88%] max-h-[360px] w-auto max-w-[125%] object-contain object-bottom drop-shadow-[0_16px_28px_rgba(0,0,0,0.9)] transition-all duration-700 ease-out select-none sm:h-[90%] sm:max-h-[390px]"
          style={{
            opacity: animated ? 1 : 0,
            transform: animated ? "translateY(0)" : "translateY(45px)",
            transitionDelay: `${(index % 4) * 80 + 100}ms`,
          }}
        />
        {/* Soft ground veil gradient under the feet */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#120a05] via-[#120a05]/60 to-transparent"
        />
      </div>

      {/* Leader Info (Right Side) */}
      <div className="relative z-10 flex h-full flex-col justify-between pl-[44%] sm:pl-[46%] pointer-events-none">
        {/* Name & Role */}
        <div className="relative pt-6 sm:pt-8">
          {/* Name & Role Text Block */}
          <div
            className="transition-all duration-600 ease-out"
            style={{
              opacity: animated ? 1 : 0,
              transform: animated ? "translateY(0)" : "translateY(18px)",
              transitionDelay: `${(index % 4) * 80 + 250}ms`,
            }}
          >
            {/* Name */}
            <h3 className="font-makani text-sm font-bold uppercase tracking-[0.06em] text-[#fcf8f2] sm:text-base md:text-lg">
              {leader.name}
            </h3>

            {/* Horizontal bracket underline */}
            <div
              className="mt-1.5 h-[2px] w-full rounded-full transition-all duration-700 ease-out"
              style={{
                background:
                  "linear-gradient(90deg, #ff7826 0%, #ffa347 70%, transparent 100%)",
                width: animated ? "100%" : "0%",
                transitionDelay: `${(index % 4) * 80 + 350}ms`,
              }}
            />

            {/* Role in Cursor Orange */}
            <p className="mt-1.5 font-sans text-xs font-medium tracking-wide text-[#ff7826] sm:text-sm">
              {leader.role}
            </p>
          </div>
        </div>

        {/* Bottom Actions: WhatsApp & Phone Links (with direct click handlers & stopPropagation) */}
        <div
          className="relative z-30 pb-3 pt-4 transition-all duration-500 ease-out pointer-events-auto"
          style={{
            opacity: animated ? 1 : 0,
            transform: animated ? "translateY(0) scale(1)" : "translateY(14px) scale(0.95)",
            transitionDelay: `${(index % 4) * 80 + 450}ms`,
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Link */}
            <a
              href={`https://wa.me/${leader.cleanPhone}`}
              target="_blank"
              rel="noreferrer"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Chat with ${leader.name} on WhatsApp`}
              className="pointer-events-auto relative z-30 flex items-center gap-1.5 rounded-full border border-[#25D366]/40 bg-[#25D366]/15 px-3 py-1.5 text-[11px] font-medium text-[#25D366] shadow-[0_4px_12px_rgba(37,211,102,0.15)] backdrop-blur-md transition-transform duration-200 active:scale-95 sm:hover:scale-105 sm:hover:bg-[#25D366]/30 sm:hover:shadow-[0_4px_16px_rgba(37,211,102,0.4)] sm:text-xs"
            >
              <WhatsAppIcon className="size-3.5 sm:size-4" />
              <span>WhatsApp</span>
            </a>

            {/* Call Link */}
            <a
              href={`tel:+${leader.cleanPhone}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Call ${leader.name}`}
              className="pointer-events-auto relative z-30 flex items-center gap-1.5 rounded-full border border-[#ff7826]/40 bg-[#ff7826]/15 px-3 py-1.5 text-[11px] font-medium text-[#ff9852] shadow-[0_4px_12px_rgba(255,120,38,0.15)] backdrop-blur-md transition-transform duration-200 active:scale-95 sm:hover:scale-105 sm:hover:bg-[#ff7826]/30 sm:hover:shadow-[0_4px_16px_rgba(255,120,38,0.4)] sm:text-xs"
            >
              <Phone className="size-3 sm:size-3.5" />
              <span>Call</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Our Team" Section — continuous multi-card slide carousel with hover slowdown & touch drag */
export function OurTeam() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Drag interaction refs
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isPointerDownRef = useRef(false);
  const hasMovedRef = useRef(false);

  // Duplicate items 4x for smooth infinite sliding
  const loopedLeaders = [
    ...TEAM_LEADERS,
    ...TEAM_LEADERS,
    ...TEAM_LEADERS,
    ...TEAM_LEADERS,
  ];

  // Observe section for staggered entrance animations
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setInView(true);
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Float accumulator to eliminate subpixel rounding vibration
  const posAccumulatorRef = useRef(0);

  // Infinite smooth slide scrolling animation frame loop
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let rafId: number;

    const step = () => {
      // If user is actively touching or dragging, sync accumulator and pause auto-step
      if (isPointerDownRef.current) {
        posAccumulatorRef.current = container.scrollLeft;
      } else if (container) {
        // Desktop: steady speed (0.8px), slows down to 0.15px on mouse hover
        // Mobile: smooth slow scroll (0.45px)
        const isMobile = window.innerWidth < 768;
        let speed = isMobile ? 0.45 : 0.8;
        if (isHovered && !isMobile) {
          speed = 0.15;
        }

        posAccumulatorRef.current += speed;

        // Loop seamlessly once scrolled halfway through the looped track
        const maxScroll = container.scrollWidth / 2;
        if (posAccumulatorRef.current >= maxScroll) {
          posAccumulatorRef.current -= maxScroll;
        }

        container.scrollLeft = posAccumulatorRef.current;
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isHovered]);

  // Pointer drag handlers for mouse / touch scrubbing (ignoring interactive buttons)
  const handlePointerDown = (e: React.PointerEvent) => {
    // If click originated on a link or button, don't initiate drag or capture pointer
    if ((e.target as HTMLElement).closest("a, button")) {
      return;
    }
    const container = scrollRef.current;
    if (!container) return;
    isPointerDownRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;
    posAccumulatorRef.current = container.scrollLeft;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const container = scrollRef.current;
    if (!container) return;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    if (Math.abs(walk) > 4) {
      if (!hasMovedRef.current) {
        hasMovedRef.current = true;
        setIsDragging(true);
        try {
          container.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
      container.scrollLeft = scrollLeftRef.current - walk;
      posAccumulatorRef.current = container.scrollLeft;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isPointerDownRef.current = false;
    setIsDragging(false);
    const container = scrollRef.current;
    if (container) {
      posAccumulatorRef.current = container.scrollLeft;
      if (hasMovedRef.current) {
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    }
  };

  // Manual prev/next navigation helpers
  const slide = useCallback((direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = window.innerWidth < 768 ? 320 : 400;
    const offset = direction === "left" ? -cardWidth : cardWidth;
    container.scrollBy({ left: offset, behavior: "smooth" });
    posAccumulatorRef.current = container.scrollLeft + offset;
  }, []);

  return (
    <section
      ref={sectionRef}
      id="our-team"
      className="relative flex min-h-0 flex-col items-center justify-center overflow-hidden px-2 pt-16 pb-20 sm:px-4 sm:pt-24 sm:pb-28"
      style={{ backgroundColor: "#1c110a" }}
    >
      {/* Background ambient lighting effects */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(54rem 30rem at 50% 0%, rgba(249, 115, 22, 0.16), transparent 70%), linear-gradient(180deg, rgba(28,17,10,0.85), rgba(28,17,10,0.98))",
        }}
      />

      {/* Heading Section */}
      <div className="text-center pt-4 sm:pt-8">
        <h2 className="font-makani text-2xl font-bold uppercase tracking-[0.08em] sm:text-4xl">
          <span className="bg-gradient-to-r from-[#ff5419] via-[#ff7826] to-[#ffa347] bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(255,100,30,0.45)]">
            Our Team
          </span>
        </h2>
        <span
          className="mx-auto mt-1.5 block h-[3px] w-14 rounded-full sm:mt-2.5 sm:w-16"
          style={{
            background:
              "linear-gradient(90deg, transparent, #ff7826 40%, #ffa347 60%, transparent)",
          }}
        />
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#d4bca7]/80 sm:text-sm">
          Festival Leadership & Controllers
        </p>
      </div>

      {/* Carousel Track Container */}
      <div
        className="relative mt-12 w-full max-w-7xl sm:mt-16"
        onMouseEnter={() => {
          if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Subtle Edge Vignettes to blend into #1c110a seamlessly */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-gradient-to-r from-[#1c110a] to-transparent sm:w-20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-[#1c110a] to-transparent sm:w-20"
        />

        {/* Scrollable Track (3 in a row on desktop, 1 in a row on mobile) */}
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
          className="flex w-full touch-pan-y items-center gap-4 overflow-x-hidden px-4 py-6 sm:gap-6 sm:px-6 select-none"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {loopedLeaders.map((leader, i) => (
            <LeaderCard
              key={`${leader.id}-${i}`}
              leader={leader}
              inView={inView}
              index={i}
            />
          ))}
        </div>

        {/* Desktop Manual Slide Buttons */}
        <button
          type="button"
          onClick={() => slide("left")}
          aria-label="Slide left"
          className="absolute -left-2 top-1/2 z-30 hidden -translate-y-1/2 size-11 items-center justify-center rounded-full border border-[#ff7826]/30 bg-[#1c110a]/80 text-[#ffa347] shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:border-[#ff7826] hover:bg-[#2a170d] lg:flex"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => slide("right")}
          aria-label="Slide right"
          className="absolute -right-2 top-1/2 z-30 hidden -translate-y-1/2 size-11 items-center justify-center rounded-full border border-[#ff7826]/30 bg-[#1c110a]/80 text-[#ffa347] shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:border-[#ff7826] hover:bg-[#2a170d] lg:flex"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Floating dot indicators hint */}
      <div className="mt-4 flex items-center justify-center gap-1.5 opacity-60">
        <span className="h-1.5 w-6 rounded-full bg-[#ff7826]" />
        <span className="size-1.5 rounded-full bg-[#ff7826]/40" />
        <span className="size-1.5 rounded-full bg-[#ff7826]/40" />
        <span className="size-1.5 rounded-full bg-[#ff7826]/40" />
      </div>
    </section>
  );
}
