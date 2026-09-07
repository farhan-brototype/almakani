import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ManageTabs, type ManageTab } from "@/components/ManageTabs";
import { AnnouncementsPage } from "@/components/manage/admin.announcements";
import { AssigningPage } from "@/components/manage/admin.assigning";
import { Dashboard } from "@/components/manage/admin.index";
import { JudgementPage } from "@/components/manage/admin.judgement";
import { OverviewPage } from "@/components/manage/admin.overview";
import { ProgrammesPage } from "@/components/manage/admin.programmes";
import { TeamAnnouncements } from "@/components/manage/team.announcements";
import { TeamAssign } from "@/components/manage/team.assign";
import { TeamDashboard } from "@/components/manage/team.index";
import { TeamOverview } from "@/components/manage/team.overview";
import { OurStudents } from "@/components/manage/team.students";
import { PublicShell } from "@/components/PublicShell";
import { Button } from "@/components/ui/button";
import { FEST } from "@/config";
import { useAppSession } from "@/hooks/use-session";

export const Route = createFileRoute("/programlist")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { tab?: string } =>
    typeof search["tab"] === "string" ? { tab: search["tab"] as string } : {},
  head: () => ({
    meta: [{ title: `Programme List — ${FEST.name}` }, { name: "robots", content: "noindex" }],
  }),
  component: ProgrammeListPage,
});

const ADMIN_TABS: ManageTab[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "overview", label: "Overview" },
  { id: "programmes", label: "Programmes" },
  { id: "announcements", label: "Announcements" },
  { id: "assigning", label: "Assigning" },
  { id: "judgement", label: "Judgement List" },
];

const TEAM_TABS: ManageTab[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "overview", label: "Overview" },
  { id: "assigning", label: "Programme Assigning" },
  { id: "students", label: "Our Students" },
  { id: "announcements", label: "Announcements" },
];

function ProgrammeListPage() {
  const { role, loading } = useAppSession();
  const { tab: initialTab } = Route.useSearch();
  const [tab, setTab] = useState(initialTab ?? "dashboard");

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
      <PublicShell title="Programme List">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in with your admin or team account to open the programme list.
          </p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </PublicShell>
    );
  }

  const tabs = role === "admin" ? ADMIN_TABS : TEAM_TABS;

  return (
    <PublicShell
      title="Programme List"
      subtitle={role === "admin" ? "Admin panel" : "Team panel"}
    >

      <ManageTabs tabs={tabs} value={tab} onChange={setTab} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {role === "admin" ? (
          <>
            {tab === "dashboard" && <Dashboard />}
            {tab === "overview" && <OverviewPage />}
            {tab === "programmes" && <ProgrammesPage />}
            {tab === "announcements" && <AnnouncementsPage />}
            {tab === "assigning" && <AssigningPage />}
            {tab === "judgement" && <JudgementPage />}
          </>
        ) : (
          <>
            {tab === "dashboard" && <TeamDashboard />}
            {tab === "overview" && <TeamOverview />}
            {tab === "assigning" && <TeamAssign />}
            {tab === "students" && <OurStudents />}
            {tab === "announcements" && <TeamAnnouncements />}
          </>
        )}
      </div>
    </PublicShell>
  );
}
