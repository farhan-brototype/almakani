import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { EnrolledPage } from "@/components/results/enrolled";
import { ProgramResultsPage, StudentMarksPage } from "@/components/results/lists";
import { MinusMarksPage } from "@/components/results/minus-marks";
import { DraftPage, PublishedPage, TotalEnrolledPage } from "@/components/results/stages";
import { ManageTabs } from "@/components/ManageTabs";
import { PageHeading } from "@/components/PageHeading";

export const Route = createFileRoute("/admin/results")({ component: AdminResults });

const TABS = [
  { id: "students", label: "Students" },
  { id: "programmes", label: "Programmes" },
  { id: "enrolled", label: "Enrolled" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "total", label: "Total Enrolled" },
  { id: "minus", label: "Minus Marks" },
];

function AdminResults() {
  const [tab, setTab] = useState("students");

  return (
    <div className="space-y-5">
      <div>
        <PageHeading title="Results" />
        <p className="text-sm text-muted-foreground">
          Enter marks, review drafts and publish the official points.
        </p>
      </div>

      <ManageTabs tabs={TABS} value={tab} onChange={setTab} className="mx-0 max-w-none px-0 pt-0" />

      {tab === "students" && <StudentMarksPage />}
      {tab === "programmes" && <ProgramResultsPage />}
      {tab === "enrolled" && <EnrolledPage />}
      {tab === "draft" && <DraftPage />}
      {tab === "published" && <PublishedPage />}
      {tab === "total" && <TotalEnrolledPage />}
      {tab === "minus" && <MinusMarksPage />}
    </div>
  );
}
