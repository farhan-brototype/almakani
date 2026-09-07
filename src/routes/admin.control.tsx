import { createFileRoute } from "@tanstack/react-router";

import { ControlPage } from "@/components/manage/admin.control";

export const Route = createFileRoute("/admin/control")({ component: ControlPage });
