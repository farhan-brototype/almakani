import { useEffect, useRef, useState } from "react";

import cursorUrl from "@/assets/cursor.png";

const SIZE = 20; // keep the pointer small
const HOT_X = 6;
const HOT_Y = 4;

/**
 * Custom pointer: an orange flower that follows the mouse and rotates
 * with the page scroll position. Only active on fine-pointer devices.
 */
export function ScrollCursor() {
  const [enabled, setEnabled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100 });
  const rot = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    const onScroll = () => {
      rot.current = window.scrollY * 0.35;
    };
    const tick = () => {
      if (ref.current) {
        ref.current.style.transform = `translate(${pos.current.x - HOT_X}px, ${pos.current.y - HOT_Y}px) rotate(${rot.current}deg)`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] will-change-transform"
    >
      <img
        src={cursorUrl}
        alt=""
        width={SIZE}
        height={SIZE}
        className="block select-none"
        draggable={false}
      />
    </div>
  );
}
