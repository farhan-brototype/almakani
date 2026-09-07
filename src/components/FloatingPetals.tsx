import { useEffect, useState } from "react";

import petalAsset from "@/assets/petal-soft.png.asset.json";

/**
 * Two large, faint flower marks pinned to the top corners of the viewport.
 * They only appear once the hero has been scrolled past, rotate slowly and
 * sit partly off-screen so only a portion of each shows.
 */
export function FloatingPetals() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-700"
      style={{ opacity: show ? 1 : 0 }}
    >
      <img
        src={petalAsset.url}
        alt=""
        className="absolute -left-24 -top-24 w-56 animate-spin opacity-30 [animation-duration:38s] sm:-left-32 sm:-top-32 sm:w-80"
        draggable={false}
      />
      <img
        src={petalAsset.url}
        alt=""
        className="absolute -right-24 -top-16 w-48 animate-spin opacity-25 [animation-direction:reverse] [animation-duration:52s] sm:-right-28 sm:-top-24 sm:w-72"
        draggable={false}
      />
    </div>
  );
}
