export type AppealStatus = "open" | "in_review" | "resolved" | "rejected" | "withdrawn";

export type Appeal = {
  id: string;
  subject: string;
  kind: string;
  priority: string;
  content: string;
  explanation: string | null;
  file_url: string | null;
  file_name: string | null;
  status: AppealStatus;
  admin_reply: string | null;
  program_code: string | null;
  program_name: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export const APPEAL_KINDS = [
  { value: "general", label: "General" },
  { value: "registration", label: "Registration" },
  { value: "result", label: "Result" },
  { value: "grading", label: "Grading" },
  { value: "schedule", label: "Schedule" },
  { value: "other", label: "Other" },
];

export const APPEAL_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const STATUS_TONE: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  in_review: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  resolved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  withdrawn: "bg-muted text-muted-foreground",
};

export const PRIORITY_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  urgent: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export function labelOf(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export const fmtAppealDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
