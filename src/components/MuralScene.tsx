import { useEffect, useRef, useState } from "react";

import yellowTent from "@/assets/hero-live/1.png.asset.json";
import lightDune from "@/assets/hero-live/2.png.asset.json";
import redTent from "@/assets/hero-live/3.png.asset.json";
import peopleDune from "@/assets/hero-live/4.png.asset.json";
import peopleDuneMobile from "@/assets/hero-live/4-mobile.png.asset.json";
import blueTent from "@/assets/hero-live/5.png.asset.json";
import peachDune from "@/assets/hero-live/6.png.asset.json";
import rightPalms from "@/assets/hero-live/7.png.asset.json";
import brownTent from "@/assets/hero-live/8.png.asset.json";
import brownDune from "@/assets/hero-live/9.png.asset.json";
import desertSky from "@/assets/hero-live/10.png.asset.json";
import cloudLeft from "@/assets/hero-live/cloud-left.png.asset.json";
import cloudMiddle from "@/assets/hero-live/cloud-mid.png.asset.json";
import cloudRight from "@/assets/hero-live/cloud-right.png.asset.json";
import leftPalm from "@/assets/hero-live/palm-left.png.asset.json";
import { BrandLoader } from "@/components/BrandLoader";

const assets = [desertSky, brownDune, peachDune, peopleDune, peopleDuneMobile, lightDune, redTent, brownTent, blueTent, yellowTent, rightPalms, leftPalm, cloudLeft, cloudMiddle, cloudRight];

function Art({ src, className }: { src: string; className: string }) {
  return <img src={src} alt="" aria-hidden="true" draggable={false} className={className} />;
}

function Scene({ mobile = false }: { mobile?: boolean }) {
  const p = mobile ? "hero-mobile-" : "hero-";
  return (
    <div className={mobile ? "hero-live-mobile sm:hidden" : "hero-live-canvas hidden sm:block"} aria-hidden="true">
      <Art src={desertSky.url} className={`hero-live-full ${mobile ? "hero-live-mobile-sky" : "hero-live-sky"}`} />
      {!mobile && <>
        <Art src={cloudLeft.url} className="hero-cloud hero-cloud-left" />
        <Art src={cloudMiddle.url} className="hero-cloud hero-cloud-mid" />
        <Art src={cloudRight.url} className="hero-cloud hero-cloud-right" />
      </>}
      <Art src={leftPalm.url} className={`hero-palm ${p}palm-left`} />
      {mobile && <div className="hero-mobile-sun" />}

      {/* Supplied artwork stack, composed from 10 down to 1. */}
      <Art src={brownDune.url} className={`hero-dune ${p}dune-back`} />
      <Art src={brownTent.url} className={`hero-tent ${p}tent-brown`} />
      <Art src={mobile ? leftPalm.url : rightPalms.url} className={`hero-palm ${p}palm-right`} />
      <Art src={peachDune.url} className={`hero-dune ${p}dune-middle`} />
      <Art src={blueTent.url} className={`hero-tent ${p}tent-blue`} />
      <Art src={mobile ? peopleDuneMobile.url : peopleDune.url} className={`hero-dune ${p}dune-front`} />
      <Art src={redTent.url} className={`hero-tent ${p}tent-red`} />
      <Art src={lightDune.url} className={`hero-dune ${p}dune-floor`} />
      <Art src={yellowTent.url} className={`hero-tent ${p}tent-yellow`} />

      <div className={`hero-live-logo ${mobile ? "hero-live-logo-mobile" : ""}`}>
        <BrandLoader className="!w-full" />
      </div>
    </div>
  );
}

export function MuralScene({ onReady }: { onReady?: () => void }) {
  const [ready, setReady] = useState(false);
  const reported = useRef(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) setReady(true);
    }, 1500);

    Promise.all(assets.map(({ url }) => new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = image.onerror = () => resolve();
      image.src = url;
    }))).then(() => {
      if (active) {
        clearTimeout(timer);
        setReady(true);
      }
    });
    return () => { active = false; clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!ready || reported.current) return;
    reported.current = true;
    onReady?.();
  }, [onReady, ready]);

  return (
    <section className="hero-live relative isolate h-[100svh] min-h-[620px] w-full overflow-hidden" aria-label="Al Makani Arts Fest 2026 desert camp">
      <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
        <Scene />
        <Scene mobile />
        <div className="hero-live-bottom-fade" />
      </div>
    </section>
  );
}