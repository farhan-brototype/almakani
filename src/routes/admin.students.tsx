import { createFileRoute } from "@tanstack/react-router";

import { StudentsPage } from "@/components/manage/admin.students";

export const Route = createFileRoute("/admin/students")({ component: StudentsPage });
