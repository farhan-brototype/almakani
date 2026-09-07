import { createFileRoute } from "@tanstack/react-router";

import { TeamAnnouncements } from "@/components/manage/team.announcements";

export const Route = createFileRoute("/team/announcements")({ component: TeamAnnouncements });
