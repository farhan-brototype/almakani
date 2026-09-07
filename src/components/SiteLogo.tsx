import { useEffect, type ReactNode } from "react";

import { useSiteSettings } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Renders the admin-uploaded fest logo. When no logo is set the caller's
 * fallback mark (icon / coloured squares) is used instead.
 */
export function SiteLogo({
  className,
  fallback,
  alt = "Fest logo",
}: {
  className?: string;
  fallback: ReactNode;
  alt?: string;
}) {
  const { settings } = useSiteSettings();
  if (!settings.logo_url) return <>{fallback}</>;
  return (
    <img
      src={settings.logo_url}
      alt={alt}
      className={cn("object-contain", className)}
      loading="lazy"
    />
  );
}

/** Swaps the browser tab icon to the uploaded logo when one exists. */
export function FaviconFromSettings() {
  const { settings } = useSiteSettings();
  const url = settings.logo_url;

  useEffect(() => {
    if (!url || typeof document === "undefined") return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const previous = link.href;
    link.href = url;
    link.type = "image/png";
    return () => {
      if (link) link.href = previous;
    };
  }, [url]);

  return null;
}
