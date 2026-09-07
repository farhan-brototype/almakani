import { createFileRoute } from "@tanstack/react-router";

import { Dashboard } from "@/components/manage/admin.index";

export const Route = createFileRoute("/admin/")({ component: Dashboard });
