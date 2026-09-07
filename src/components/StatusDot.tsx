import { cn } from "@/lib/utils";
import type { StudentStatus } from "@/lib/fest-rules";

const TONE: Record<StudentStatus["tone"], string> = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
  grey: "bg-muted-foreground/50",
};

/** Traffic-light dot showing whether a student meets the programme rules. */
export function StatusDot({ status, className }: { status: StudentStatus; className?: string }) {
  return (
    <span
      title={status.label}
      aria-label={status.label}
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full ring-2 ring-background",
        TONE[status.tone],
        className,
      )}
    />
  );
}
