import { createFileRoute } from "@tanstack/react-router";

import { TeamAssign } from "@/components/manage/team.assign";

export const Route = createFileRoute("/team/assign")({ component: TeamAssign });
