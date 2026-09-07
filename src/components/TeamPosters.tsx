import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import efeUrl from "@/assets/T_efe.webp";
import fizoUrl from "@/assets/T_fizo.webp";
import novaUrl from "@/assets/T_nova.webp";
import zoroUrl from "@/assets/T_zoro.webp";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRealtime } from "@/hooks/use-realtime";
import { supabase, type Team } from "@/lib/supabase";

type Poster = { key: string; name: string; sub: string; url: string };

const POSTERS: Poster[] = [
  { key: "nova", name: "Nova", sub: "Horreya", url: novaUrl },
  { key: "zoro", name: "Zoro", sub: "Zahawi", url: zoroUrl },
  { key: "efe", name: "Efe", sub: "Harafish", url: efeUrl },
  { key: "fizo", name: "Fizo", sub: "Fishawy", url: fizoUrl },
];

/**
 * Each person's horizontal centre in the poster (cx, as a % of image width)
 * and the matching background-position % that centres them in a slice when
 * the poster is zoomed to 340% width.
 */
const FACES = [
  { cx: 27, pos: 17, role: "Vice Captain" },
  { cx: 50, pos: 50, role: "Captain" },
  { cx: 73, pos: 83, role: "Vice Captain" },
];

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * One vertical slice of the poster. When `split` is false the three slices sit
 * flush against each other — indistinguishable from the original photo. When
 * it flips true they drift apart, gain rounded borders and reveal the leader
 * captions underneath.
 */
function Slice({
  url,
  index,
  role,
  name,
  captain,
  split,
}: {
  url: string;
  index: number;
  role: string;
  name: string | null;
  captain: boolean;
  split: boolean;
}) {
  const dir = index - 1; // -1 left, 0 centre, +1 right
  return (
    <div className="flex min-w-0 flex-col items-center">
      <div
        className={`aspect-[3/5] w-full border bg-[#1c110a] ${
          captain ? "border-primary/70" : "border-primary/25"
        }`}
        style={{
          backgroundImage: `url(${url})`,
          // Merged: exact thirds of the poster so the slices form the original
          // photo. Split: zoom slightly and centre on each person's face.
          backgroundSize: split ? "340% auto" : "300% auto",
          backgroundPosition: split
            ? `${FACES[index]?.pos ?? 50}% 18%`
            : `${index * 50}% 22%`,
          backgroundRepeat: "no-repeat",
          transform: `translateX(${split ? dir * 12 : 0}px)`,
          borderRadius: split ? "1rem" : "0px",
          borderColor: split ? undefined : "transparent",
          boxShadow: split
            ? captain
              ? "0 18px 45px -18px hsl(var(--primary) / 0.45)"
              : "0 14px 35px -20px rgba(0,0,0,0.7)"
            : "none",
          transition:
            "transform 650ms cubic-bezier(.2,.85,.25,1), border-radius 650ms cubic-bezier(.2,.85,.25,1), box-shadow 650ms ease, border-color 400ms ease, background-size 650ms cubic-bezier(.2,.85,.25,1), background-position 650ms cubic-bezier(.2,.85,.25,1)",
          transitionDelay: `${Math.abs(dir) * 60}ms`,
        }}
      />
      <div
        className="flex flex-col items-center"
        style={{
          opacity: split ? 1 : 0,
          transform: split ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 450ms ease, transform 550ms cubic-bezier(.2,.8,.2,1)",
          transitionDelay: split ? `${280 + Math.abs(dir) * 90}ms` : "0ms",
        }}
      >
        <p className="mt-2 text-center font-display text-xs font-semibold sm:text-sm">
          {name ?? "—"}
        </p>
        <p
          className={`text-center text-[10px] uppercase tracking-wide sm:text-[11px] ${
            captain ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {role}
        </p>
      </div>
    </div>
  );
}

/** Team posters below "Our Team" — tap one and the photo splits into its three leaders. */
export function TeamPosters() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [active, setActive] = useState<Poster | null>(null);
  const [split, setSplit] = useState(false);
  const [fly, setFly] = useState<CSSProperties>({});
  const timers = useRef<number[]>([]);
  const originRef = useRef<DOMRect | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<string>("none");

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from("teams_public").select("*");
      if (alive) setTeams((data as Team[]) ?? []);
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  useRealtime(["teams"], () => {
    void supabase
      .from("teams_public")
      .select("*")
      .then(({ data }) => setTeams((data as Team[]) ?? []));
  });

  // The poster flies forward out of the grid card it was tapped in, then splits.
  // Runs from a callback ref because the dialog body mounts after the state change.
  const flownRef = useRef(false);
  const stageCb = useCallback((node: HTMLDivElement | null) => {
    stageRef.current = node;
    const from = originRef.current;
    if (!node || !from || flownRef.current) return;
    flownRef.current = true;
    const to = node.getBoundingClientRect();
    if (!to.width || !to.height) return;
    const sx = from.width / to.width;
    const sy = from.height / to.height;
    const tx = from.left + from.width / 2 - (to.left + to.width / 2);
    const ty = from.top + from.height / 2 - (to.top + to.height / 2);
    fromRef.current = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
    setFly({ transform: fromRef.current, opacity: 0.55, transition: "none" });
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setFly({
          transform: "translate(0px, 0px) scale(1, 1)",
          opacity: 1,
          transition: "transform 620ms cubic-bezier(.2,.85,.25,1), opacity 380ms ease-out",
        }),
      ),
    );
    later(() => setSplit(true), 720);
  }, []);

  useLayoutEffect(() => {
    if (active) return;
    flownRef.current = false;
    setSplit(false);
    setFly({});
  }, [active]);


  // On close, merge the slices, then fly the whole poster back to its card.
  const handleOpenChange = (open: boolean) => {
    if (open) return;
    setSplit(false);
    later(
      () =>
        setFly({
          transform: fromRef.current,
          opacity: 0,
          transition:
            "transform 560ms cubic-bezier(.4,0,.2,1), opacity 420ms ease-in 140ms",
        }),
      300,
    );
    later(() => setActive(null), 900);
  };

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const teamOf = (p: Poster) => teams.find((t) => norm(t.name).includes(norm(p.name))) ?? null;

  const FALLBACK_LEADERS: Record<string, [string, string, string]> = {
    nova: ['Afnan', 'Sinan Pv', 'Irfan Ali'],
    zoro: ['Shahinsha', 'Riyan', 'Rishan TT'],
    efe: ['Salahudheen', 'Abdusamad', 'Irshad'],
    fizo: ['Jaseem', 'Ameen', 'Nashid'],
  };

  const namesOf = (p: Poster): (string | null)[] => {
    const t = teamOf(p);
    const db = t ? [t.vice_captain, t.captain, t.vice_captain2] : [null, null, null];
    const fallback = FALLBACK_LEADERS[p.key] ?? [null, null, null];
    return db.map((n, i) => (n && String(n).trim() ? String(n).trim() : fallback[i] ?? null));
  };

  return (
    <section id="teams" className="bg-background px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-makani text-2xl font-bold uppercase tracking-[0.08em] sm:text-4xl">
            <span className="gold-text">The Teams</span>
          </h2>
          <span className="stage-gradient mx-auto mt-2 block h-[3px] w-14 rounded-full" />
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
          {POSTERS.map((p) => (
            <button
              key={p.key}
              type="button"
              data-team={p.key}
              onClick={(e) => {
                originRef.current = e.currentTarget.getBoundingClientRect();
                setActive(p);
              }}
              className="group overflow-hidden rounded-2xl border border-primary/20 bg-[#1c110a] text-left transition-transform duration-300 hover:-translate-y-1 hover:border-primary/60"
            >
              <img
                src={p.url}
                alt={`${p.name} ${p.sub} team`}
                loading="eager"
                decoding="async"
                onError={(e) => {
                  // A dropped request would leave one poster blank; retry once.
                  const img = e.currentTarget;
                  if (img.dataset["retried"]) return;
                  img.dataset["retried"] = "1";
                  img.src = `${p.url}${p.url.includes("?") ? "&" : "?"}r=1`;
                }}
                className="aspect-[3/4] w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!active} onOpenChange={handleOpenChange}>
        <DialogContent
          overlayClassName="bg-background/40 backdrop-blur-2xl"
          className="max-w-3xl border-0 bg-transparent p-4 shadow-none data-[state=closed]:animate-none data-[state=open]:animate-none sm:p-6"
        >
          <div className="max-h-[85vh] overflow-y-auto overflow-x-hidden pr-1">
          {active ? (
            <>
              <DialogTitle className="text-center font-makani text-xl uppercase tracking-wide sm:text-2xl">
                <span className="gold-text">
                  {active.name} {active.sub}
                </span>
              </DialogTitle>
              <div
                ref={stageCb}
                className="mt-4 grid grid-cols-3 items-start gap-0 will-change-transform"
                style={{ perspective: "1200px", transformOrigin: "center center", ...fly }}
              >
                {FACES.map((f, i) => (
                  <div key={f.cx} className={i === 1 && split ? "sm:-mt-4" : ""}>
                    <Slice
                      url={active.url}
                      index={i}
                      role={f.role}
                      name={namesOf(active)[i] ?? null}
                      captain={i === 1}
                      split={split}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

