import { createFileRoute } from "@tanstack/react-router";

import { ProgrammesPage } from "@/components/manage/admin.programmes";

export const Route = createFileRoute("/admin/programmes")({ component: ProgrammesPage });
