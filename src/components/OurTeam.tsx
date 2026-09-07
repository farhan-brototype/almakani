import { Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import teamAsset from "@/assets/team-2026.png.asset.json";

const teamPhoto = teamAsset.url;


type Member = {
  name: string;
  role: string;
  /** International format without "+", e.g. "919000000000". Empty hides the links. */
  phone?: string | undefined;
  side: "left" | "right";
  /** Vertical position of the label, in % of the photo height. */
  labelTop: number;
  /** Point on the photo the connector line points at, in % of the photo box. */
  ax: number;
  ay: number;
};

/** The four side callouts. Shebeeb (top) and Noufal (bottom) are rendered separately. */
const SIDES: Member[] = [
  { name: "Zeham", role: "Assi. Co-ordinator", side: "left", labelTop: 10, ax: 27, ay: 22 },
  { name: "Swalih Hudawi", role: "Assi. Controller", side: "left", labelTop: 42, ax: 20, ay: 47 },
  { name: "Adnan", role: "Assi. Co-ordinator", side: "right", labelTop: 10, ax: 66, ay: 24 },
  { name: "Afthab Hudawi", role: "Assi. Controller", side: "right", labelTop: 42, ax: 79, ay: 47 },

];

const TOP = { name: "Shebeeb", role: "Co-ordinator", ax: 51, ay: 19 };
const BOTTOM = { name: "Noufal Hudawi", role: "Controller", ax: 51, ay: 46 };

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.76.46 3.42 1.27 4.86L2 22l5.28-1.38A9.94 9.94 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10Zm0 18.2c-1.6 0-3.1-.44-4.38-1.2l-.31-.19-3.13.82.84-3.05-.2-.32a8.16 8.16 0 0 1-1.26-4.36c0-4.53 3.69-8.2 8.24-8.2 4.54 0 8.23 3.67 8.23 8.2 0 4.53-3.69 8.3-8.03 8.3Zm4.53-6.13c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.38-1.72c-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

function Links({ phone }: { phone?: string | undefined }) {
  if (!phone) return null;
  return (
    <span className="mt-1 flex items-center justify-center gap-1.5">
      <a
        href={`https://wa.me/${phone}`}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success transition-transform hover:scale-110 sm:size-6"
      >
        <WhatsAppIcon className="size-3 sm:size-3.5" />
      </a>
      <a
        href={`tel:+${phone}`}
        aria-label="Call"
        className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform hover:scale-110 sm:size-6"
      >
        <Phone className="size-2.5 sm:size-3" />
      </a>
    </span>
  );
}

/** Rounded plaque used for every callout. */
function Plaque({
  name,
  role,
  phone,
  tone = "plain",
}: {
  name: string;
  role: string;
  phone?: string | undefined;
  tone?: "plain" | "gold";
}) {
  return (
    <div
      className={`rounded-full border px-2.5 py-1 text-center backdrop-blur-sm sm:px-4 sm:py-1.5 ${
        tone === "gold"
          ? "border-primary/70 bg-background/95 shadow-[0_6px_18px_-8px_oklch(0.6_0.15_52/0.6)]"
          : "border-primary/45 bg-background/90 shadow-[0_4px_14px_-10px_oklch(0.2_0.02_60/0.6)]"
      }`}
    >
      <p className="font-display text-[9px] font-bold leading-tight sm:text-base">{name}</p>
      <p className="text-[7px] uppercase leading-tight tracking-wide text-muted-foreground sm:text-[10px]">
        {role}
      </p>
      <Links phone={phone} />
    </div>
  );
}

/** Label x-position of the line start, in SVG units (photo width = 100). Overshoots the plaque edge so the stroke tucks under it with no visible gap. */
const LEFT_EDGE = -30;
const RIGHT_EDGE = 130;


/** "Our Team" — the group photo with diagram-style callout plaques wired to each person. */
export function OurTeam() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const revealDetails = show && imageLoaded;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setShow(e.isIntersecting)),
      { rootMargin: "-15% 0px -15% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const anim = (i: number, extra = 0) => ({
    opacity: revealDetails ? 1 : 0,
    transition: "opacity 500ms ease-out, transform 600ms cubic-bezier(.2,.85,.25,1)",
    transitionDelay: `${i * 120 + extra}ms`,
  });

  return (
    <section
      id="our-team"
      className="relative flex min-h-0 flex-col items-center justify-center overflow-visible bg-background px-2 py-4 pb-16 sm:px-4 sm:py-8 sm:pb-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(38rem 22rem at 50% 0%, oklch(0.6 0.15 52 / 12%), transparent 65%)",
        }}
      />
      <div className="text-center">
        <h2 className="font-makani text-2xl font-bold uppercase tracking-[0.08em] sm:text-4xl">
          <span className="gold-text">Our Team</span>
        </h2>
        <span className="stage-gradient mx-auto mt-1 block h-[3px] w-14 rounded-full sm:mt-2" />
      </div>

      {/* Photo + callouts. The photo box is the coordinate space for every line. */}
      <div ref={ref} className="mt-20 flex w-full flex-1 items-center justify-center sm:mt-28">
        <div className="relative">
          <img
            src={teamPhoto}
            alt="Al Makani fest co-ordinators and controllers"
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className="block h-[34vh] max-h-[360px] w-auto max-w-[62vw] object-contain drop-shadow-[0_20px_40px_oklch(0.2_0.022_60/0.18)] sm:h-[44vh] sm:max-h-[460px]"
          />

          {/* Ornamental base that veils the seated row's legs */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[-14%] bottom-[-1px] h-[24%]"
            style={{
              opacity: revealDetails ? 1 : 0,
              transform: revealDetails ? "translateY(0)" : "translateY(14px)",
              transition: "opacity 600ms ease-out, transform 700ms cubic-bezier(.2,.85,.25,1)",
              transitionDelay: "220ms",
            }}
          >
            <div
              className="absolute inset-x-0 bottom-0 h-full"
              style={{
                background:
                  "radial-gradient(120% 100% at 50% 100%, var(--color-background) 46%, oklch(0.6 0.15 52 / 20%) 72%, transparent 100%)",
              }}
            />
            <div
              className="absolute inset-x-[8%] bottom-[18%] h-[3px] rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, oklch(0.72 0.14 62 / 85%), transparent)",
              }}
            />
          </div>

          {/* Connector lines */}
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            {SIDES.map((m, i) => {
              const x1 = m.side === "left" ? LEFT_EDGE : RIGHT_EDGE;
              const y1 = m.labelTop + 5;
              const elbowX = m.side === "left" ? m.ax - 7 : m.ax + 7;
              return (
                <polyline
                  key={m.name}
                  points={`${x1},${y1} ${elbowX},${y1} ${m.ax},${m.ay}`}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  style={{
                    opacity: revealDetails ? 0.9 : 0,
                    transition: "opacity 600ms ease-out",
                    transitionDelay: `${i * 120}ms`,
                  }}
                />
              );
            })}
            {/* Top (Shebeeb) and bottom (Noufal) stems */}
            {[
              { p: `57,-9 57,${TOP.ay - 1} ${TOP.ax},${TOP.ay}`, d: 60 },
              { p: `${BOTTOM.ax},${BOTTOM.ay} ${BOTTOM.ax},90`, d: 180 },
            ].map((s) => (
              <polyline
                key={s.p}
                points={s.p}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth={1}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{
                  opacity: revealDetails ? 0.9 : 0,
                  transition: "opacity 600ms ease-out",
                  transitionDelay: `${s.d}ms`,
                }}
              />
            ))}
          </svg>

          {/* Anchor dots */}
          {[...SIDES, TOP, BOTTOM].map((m, i) => (
            <span
              key={`${m.name}-dot`}
              aria-hidden
              className="absolute size-1.5 rounded-full bg-primary ring-2 ring-primary/25 transition-all duration-500"
              style={{
                left: `${m.ax}%`,
                top: `${m.ay}%`,
                opacity: revealDetails ? 1 : 0,
                transform: `translate(-50%, -50%) scale(${revealDetails ? 1 : 0.4})`,
                transitionDelay: `${i * 120 + 250}ms`,
              }}
            />
          ))}

          {/* Side plaques */}
          {SIDES.map((m, i) => (
            <div
              key={`${m.name}-label`}
              className={`absolute w-[4.6rem] sm:w-[10.5rem] ${
                m.side === "left" ? "right-full mr-1 sm:mr-3" : "left-full ml-1 sm:ml-3"
              }`}
              style={{
                top: `${m.labelTop}%`,
                ...anim(i, 120),
                transform: revealDetails
                  ? "translateX(0)"
                  : `translateX(${m.side === "left" ? "-18px" : "18px"})`,
              }}
            >
              <Plaque name={m.name} role={m.role} phone={m.phone} />
            </div>
          ))}

          {/* Shebeeb — upper middle */}
          <div
            className="absolute bottom-full left-1/2 mb-2 w-[5.4rem] sm:mb-4 sm:w-[11rem]"
            style={{
              ...anim(0, 60),
              transform: revealDetails
                ? "translate(-50%, 0)"
                : "translate(-50%, -14px)",
            }}
          >
            <Plaque name={TOP.name} role={TOP.role} tone="gold" />
          </div>

          {/* Noufal — lower middle, seated on the ornamental base */}
          <div
            className="absolute left-1/2 top-[90%] w-[6.4rem] sm:w-[12.5rem]"
            style={{
              ...anim(1, 180),
              transform: revealDetails
                ? "translate(-50%, 0)"
                : "translate(-50%, 16px)",
            }}
          >
            <div className="relative">
              <span
                aria-hidden
                className="absolute inset-x-[-10%] top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, oklch(0.72 0.14 62 / 70%), transparent)",
                }}
              />
              <div className="relative">
                <Plaque name={BOTTOM.name} role={BOTTOM.role} tone="gold" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
