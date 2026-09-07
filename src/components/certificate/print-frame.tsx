import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders the artwork at its true design size and scales it down to fit the
 * page, so the on-screen preview and the exported file are identical.
 */
export function PrintFrame({
  width,
  height,
  nodeRef,
  children,
}: {
  width: number;
  height: number;
  nodeRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setScale(Math.min(1, el.clientWidth / width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={wrapRef} className="w-full overflow-hidden">
      <div style={{ height: height * scale }}>
        <div
          ref={nodeRef}
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "relative",
            backgroundColor: "#ffffff",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
