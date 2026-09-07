import { useCallback, useEffect, useRef, useState } from "react";

export type Pos = { x: number; y: number };

/** Shared AssistiveTouch-style draggable bubble behaviour: clamp, edge snap, persistence. */
export function useBubbleDrag(storageKey: string, size: number, margin = 12) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const latest = useRef<Pos>({ x: 0, y: 0 });

  const clamp = useCallback(
    (p: Pos): Pos => {
      const maxX = window.innerWidth - size - margin;
      const maxY = window.innerHeight - size - margin;
      return {
        x: Math.min(Math.max(p.x, margin), Math.max(margin, maxX)),
        y: Math.min(Math.max(p.y, margin), Math.max(margin, maxY)),
      };
    },
    [size, margin],
  );

  const apply = useCallback((p: Pos) => {
    latest.current = p;
    setPos(p);
  }, []);

  useEffect(() => {
    setMounted(true);
    let start: Pos = { x: window.innerWidth - size - 16, y: Math.round(window.innerHeight * 0.35) };
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) start = JSON.parse(raw) as Pos;
    } catch {
      /* ignore */
    }
    apply(clamp(start));
    const onResize = () => apply(clamp(latest.current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp, apply, size, storageKey]);

  const snap = useCallback(() => {
    const p = latest.current;
    const x =
      p.x + size / 2 < window.innerWidth / 2 ? margin : window.innerWidth - size - margin;
    const next = clamp({ x, y: p.y });
    apply(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [clamp, apply, size, margin, storageKey]);

  /** Returns pointer handlers; onTap fires only when the gesture was not a drag. */
  const handlers = (onTap: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
      setDragging(true);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const next = clamp({ x: e.clientX - d.dx, y: e.clientY - d.dy });
      if (Math.abs(next.x - latest.current.x) > 3 || Math.abs(next.y - latest.current.y) > 3)
        d.moved = true;
      apply(next);
    },
    onPointerUp: () => {
      const d = drag.current;
      drag.current = null;
      setDragging(false);
      if (!d) return;
      if (d.moved) snap();
      else onTap();
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragging(false);
    },
  });

  const onLeft = mounted ? pos.x + size / 2 < window.innerWidth / 2 : false;

  return { mounted, pos, dragging, onLeft, handlers };
}
