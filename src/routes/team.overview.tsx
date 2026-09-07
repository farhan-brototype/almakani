import { createFileRoute } from "@tanstack/react-router";

import { TeamOverview } from "@/components/manage/team.overview";

export const Route = createFileRoute("/team/overview")({ component: TeamOverview });
