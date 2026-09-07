import { createFileRoute } from "@tanstack/react-router";

import { TeamDashboard } from "@/components/manage/team.index";

export const Route = createFileRoute("/team/")({ component: TeamDashboard });
