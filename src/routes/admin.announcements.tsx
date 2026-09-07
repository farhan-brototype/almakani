import { createFileRoute } from "@tanstack/react-router";

import { AnnouncementsPage } from "@/components/manage/admin.announcements";

export const Route = createFileRoute("/admin/announcements")({ component: AnnouncementsPage });
