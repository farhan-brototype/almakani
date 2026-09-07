import { createFileRoute } from "@tanstack/react-router";

import { AssigningPage } from "@/components/manage/admin.assigning";

export const Route = createFileRoute("/admin/assigning")({ component: AssigningPage });
