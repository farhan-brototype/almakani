import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronsLeftRight, Grip, LogOut, User, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useAppSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import {
  MORE_ITEMS,
  PRIMARY_ITEMS,
  shortIdentity,
  useSignOut,
  visibleItems,
} from "@/components/nav/nav-items";
import { useBubbleDrag } from "@/components/nav/useBubbleDrag";

const BTN = 56;
const PANEL = 232;
const GAP = 10;

/** Concept A — movable bubble with a list panel that always opens toward screen centre. */
export function FloatingNav() {
  const { role, team, email } = useAppSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { mounted, pos, dragging, onLeft, handlers } = useBubbleDrag(
    "artsfest-floating-nav-pos",
    BTN,
  );
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const signOut = useSignOut(() => setOpen(false));
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [viewportH, setViewportH] = useState(() =>
    typeof window === "undefined" ? 800 : window.innerHeight,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  /** Measure the panel so it can never hang below the viewport. */
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => setPanelHeight(panelRef.current?.offsetHeight ?? 0);
    measure();
    const ro = new ResizeObserver(measure);
    if (panelRef.current) ro.observe(panelRef.current);
    return () => ro.disconnect();
  }, [open, expanded, role]);

  if (!mounted) return null;

  const primary = visibleItems(PRIMARY_ITEMS, role, mounted);
  const moreItems = visibleItems(MORE_ITEMS, role, mounted);
  const items = [...primary, ...moreItems];
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const signedIn = role !== "guest";

  const panelWidth = expanded ? PANEL : 68;
  const panelLeft = onLeft
    ? pos.x + BTN + GAP
    : Math.max(GAP, pos.x - GAP - panelWidth);
  const maxPanelHeight = Math.max(160, viewportH - GAP * 2);
  const height = Math.min(panelHeight || 0, maxPanelHeight);
  const panelTop = Math.max(GAP, Math.min(pos.y, viewportH - GAP - height));


  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[58]"
          onPointerDown={() => setOpen(false)}
          aria-hidden
        />
      )}

      <button
        type="button"
        data-launcher
        aria-label={open ? "Close navigation" : "Open navigation"}
        {...handlers(() => setOpen((v) => !v))}
        style={{ left: pos.x, top: pos.y, touchAction: "none" }}
        className={cn(
          "fixed z-[60] flex size-12 items-center justify-center rounded-full bg-bubble text-bubble-foreground shadow-xl ring-1 ring-border transition-opacity md:size-14",
          dragging || open ? "opacity-95" : "opacity-45 hover:opacity-95",
        )}
      >
        {open ? <X className="size-5 md:size-6" /> : <Grip className="size-5 md:size-6" />}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="animate-pop fixed z-[59] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-bubble/95 p-2 text-bubble-foreground shadow-2xl backdrop-blur"
          style={{
            left: panelLeft,
            top: panelTop,
            width: panelWidth,
            maxHeight: maxPanelHeight,
          }}
        >
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-2.5 transition-colors",
                  isActive(item.to)
                    ? "bg-primary/12 text-primary"
                    : "text-foreground/80 hover:bg-muted",
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {expanded && <span className="truncate text-sm font-medium">{item.label}</span>}
              </Link>
            ))}


            {!signedIn ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: "/login" });
                }}
                title="Login"
                className="flex items-center gap-3 rounded-xl p-2.5 text-primary transition-colors hover:bg-muted"
              >
                <User className="size-5 shrink-0" />
                {expanded && <span className="text-sm font-semibold">Login</span>}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signOut(role)}
                title={`Logout (${shortIdentity(role, email, team?.name)})`}
                className="flex items-center gap-3 rounded-xl p-2.5 text-foreground/80 transition-colors hover:bg-muted"
              >
                <LogOut className="size-5 shrink-0" />
                {expanded && (
                  <span className="truncate text-sm font-medium">
                    {shortIdentity(role, email, team?.name)}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse" : "Expand"}
              className="mt-1 flex items-center gap-3 rounded-xl border border-border/70 p-2.5 text-muted-foreground transition-colors hover:bg-muted"
            >
              <ChevronsLeftRight className="size-5 shrink-0" />
              {expanded && <span className="text-sm">Collapse</span>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
