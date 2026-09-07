import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ManageTabs, type ManageTab } from "@/components/ManageTabs";
import { TimetablePage } from "@/components/manage/admin.timetable";
import { SchedulePrintPage } from "@/components/manage/admin.timetable-print";

const TABS: ManageTab[] = [
  { id: "schedule", label: "Schedule" },
  { id: "print", label: "Print" },
];

function TimetableRoute() {
  const [tab, setTab] = useState("schedule");
  return (
    <div>
      <ManageTabs tabs={TABS} value={tab} onChange={setTab} className="px-0 pt-0" />
      <div className="mt-5">{tab === "print" ? <SchedulePrintPage /> : <TimetablePage />}</div>
    </div>
  );
}

export const Route = createFileRoute("/admin/timetable")({ component: TimetableRoute });
