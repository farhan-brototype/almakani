import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import cursorUrl from "@/assets/cursor.png";
import { getPending, subscribeProgress } from "@/lib/progress";

/**
 * Centered rotating cursor page loader shown during route transitions and data loading.
 */
export function LoadingBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const routerPending = useRouterState({ select: (s) => s.status === "pending" });

  const [visible, setVisible] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isPending = routerPending || getPending() > 0;

    if (isPending) {
      if (!showTimer.current) {
        showTimer.current = setTimeout(() => {
          setVisible(true);
        }, 50);
      }
    } else {
      if (showTimer.current) {
        clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      setVisible(false);
    }
  }, [pathname, routerPending]);

  useEffect(() => {
    const check = () => {
      const isPending = routerPending || getPending() > 0;
      if (!isPending) {
        if (showTimer.current) {
          clearTimeout(showTimer.current);
          showTimer.current = null;
        }
        setVisible(false);
      }
    };
    const unsub = subscribeProgress(check);
    check();
    return unsub;
  }, [routerPending, pathname]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-background/70 backdrop-blur-xs transition-opacity duration-150"
    >
      <div className="flex flex-col items-center justify-center p-4">
        <img
          src={cursorUrl}
          alt=""
          role="presentation"
          className="w-16 animate-spin object-contain [animation-duration:1.4s] sm:w-20"
          draggable={false}
        />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
