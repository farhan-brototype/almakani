import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { ManageTabs, type ManageTab } from "@/components/ManageTabs";
import { AccountsPage } from "@/components/manage/admin.accounts";
import { ControlPage } from "@/components/manage/admin.control";
import { SettingsPage } from "@/components/manage/admin.settings";
import { StudentsPage } from "@/components/manage/admin.students";
import { PublicShell } from "@/components/PublicShell";
import { Button } from "@/components/ui/button";
import { FEST } from "@/config";
import { useAppSession } from "@/hooks/use-session";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [{ title: `Settings — ${FEST.name}` }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsHub,
});

const TABS: ManageTab[] = [
  { id: "overview", label: "Overview" },
  { id: "students", label: "Students" },
  { id: "control", label: "Fest Control" },
  { id: "accounts", label: "Team Accounts" },
];

function SettingsHub() {
  const { role, loading } = useAppSession();
  const [tab, setTab] = useState("overview");

  if (loading) {
    return (
      <PublicShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </PublicShell>
    );
  }

  if (role !== "admin") {
    return (
      <PublicShell title="Settings">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">Admins only.</p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell title="Settings" subtitle="Students, fest control and team accounts.">

      <ManageTabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {tab === "overview" && <SettingsPage />}
        {tab === "students" && <StudentsPage />}
        {tab === "control" && <ControlPage />}
        {tab === "accounts" && <AccountsPage />}
      </div>
    </PublicShell>
  );
}
