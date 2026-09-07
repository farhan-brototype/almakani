import { createFileRoute } from "@tanstack/react-router";

import { AccountsPage } from "@/components/manage/admin.accounts";

export const Route = createFileRoute("/admin/accounts")({ component: AccountsPage });
