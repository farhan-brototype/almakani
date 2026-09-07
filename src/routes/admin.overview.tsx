import { createFileRoute } from "@tanstack/react-router";

import { OverviewPage } from "@/components/manage/admin.overview";

export const Route = createFileRoute("/admin/overview")({ component: OverviewPage });
