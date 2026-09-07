import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "@/components/manage/admin.settings";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });
