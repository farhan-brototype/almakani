import {
  Award,
  ClipboardList,
  FileText,
  Home,
  Images,
  LayoutList,
  Radio,
  Settings,
  Trophy,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import type { Role } from "@/hooks/use-session";
import { supabase } from "@/lib/supabase";
import { teamLogout } from "@/lib/team-auth";

export type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  roles?: Role[];
};

/** Primary destinations, always visible. */
export const PRIMARY_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/results", label: "Results", icon: Trophy },
  { to: "/live", label: "Live", icon: Radio },
  { to: "/schedule", label: "Schedule", icon: LayoutList },
];

/** Secondary destinations, revealed under "More". */
export const MORE_ITEMS: NavItem[] = [
  { to: "/certificate", label: "Certificate", icon: Award },
  { to: "/gallery", label: "Gallery", icon: Images },
  { to: "/programlist", label: "Programme List", icon: LayoutList, roles: ["admin", "team"] },
  { to: "/registration", label: "Registration", icon: ClipboardList, roles: ["admin", "team"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function visibleItems(items: NavItem[], role: Role, ready: boolean) {
  return items.filter((i) => !i.roles || (ready && i.roles.includes(role)));
}

/** Short label for the signed-in viewer (team name or admin mail handle). */
export function shortIdentity(role: Role, email: string | null, teamName?: string | null) {
  if (role === "team") return teamName ?? "Team";
  if (role === "admin") return (email ? email.split("@")[0] : "") || "Admin";
  return "Login";
}

export function useSignOut(onDone?: () => void) {
  const navigate = useNavigate();
  return useCallback(
    async (role: Role) => {
      if (role === "team") await teamLogout();
      else await supabase.auth.signOut();
      window.dispatchEvent(new Event("artsfest-session"));
      onDone?.();
      void navigate({ to: "/" });
    },
    [navigate, onDone],
  );
}
