import { createFileRoute } from "@tanstack/react-router";

import { OurStudents } from "@/components/manage/team.students";

export const Route = createFileRoute("/team/students")({ component: OurStudents });
