import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ManageTabs, type ManageTab } from "@/components/ManageTabs";
import { AdminAppeals } from "@/components/manage/admin.appeals";
import { RegistrationSetupPage } from "@/components/manage/admin.registration";
import { RegistrationReviewPage } from "@/components/manage/admin.registration-review";
import { FullRegisteredPage } from "@/components/manage/full-registered";
import { TeamAppeals } from "@/components/manage/team.appeals";
import { TeamRegistration } from "@/components/manage/team.registration";
import { PublicShell } from "@/components/PublicShell";
import { Button } from "@/components/ui/button";
import { FEST } from "@/config";
import { useAppSession } from "@/hooks/use-session";

export const Route = createFileRoute("/registration")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { tab?: string } =>
    typeof search["tab"] === "string" ? { tab: search["tab"] as string } : {},
  head: () => ({
    meta: [
      { title: `Registration — ${FEST.name}` },
      {
        name: "description",
        content: "Programme registration: submit entries, track approvals and deadlines.",
      },
      { property: "og:title", content: `Registration — ${FEST.name}` },
      {
        property: "og:description",
        content: "Programme registration: submit entries, track approvals and deadlines.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegistrationPage,
});

const ADMIN_TABS: ManageTab[] = [
  { id: "registration", label: "Registration" },
  { id: "registered", label: "Full Registered" },
  { id: "review", label: "Review" },
  { id: "appeals", label: "Appeals" },
];

const TEAM_TABS: ManageTab[] = [
  { id: "registration", label: "Registration" },
  { id: "registered", label: "Full Registered" },
  { id: "appeals", label: "Appeals" },
];

function RegistrationPage() {
  const { role, loading } = useAppSession();
  const { tab: initialTab } = Route.useSearch();
  const [tab, setTab] = useState(initialTab ?? "registration");

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  if (loading) {
    return (
      <PublicShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </PublicShell>
    );
  }

  if (role === "guest") {
    return (
      <PublicShell title="Registration">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in with your admin or team account to open registration.
          </p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell
      title="Registration"
      subtitle={
        role === "admin"
          ? "Open programmes for registration, set deadlines and review entries"
          : "Submit your entries and track approval status"
      }
    >
      <ManageTabs
        tabs={role === "admin" ? ADMIN_TABS : TEAM_TABS}
        value={tab}
        onChange={setTab}
      />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {tab === "registered" ? (
          <FullRegisteredPage />
        ) : tab === "appeals" ? (
          role === "admin" ? (
            <AdminAppeals />
          ) : (
            <TeamAppeals />
          )
        ) : role === "admin" ? (
          tab === "review" ? (
            <RegistrationReviewPage />
          ) : (
            <RegistrationSetupPage />
          )
        ) : (
          <TeamRegistration />
        )}
      </div>
    </PublicShell>
  );
}
