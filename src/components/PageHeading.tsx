import { cn } from "@/lib/utils";

/** Bright, light-theme page title with a gradient underline accent. */
export function PageHeading({ title, className }: { title: string; className?: string }) {
  return (
    <h1
      className={cn(
        "font-display relative inline-block pb-2 text-2xl font-semibold sm:text-[1.75rem]",
        className,
      )}
    >
      <span className="gold-text">{title}</span>
      <span className="stage-gradient absolute bottom-0 left-0 h-[3px] w-12 rounded-full" />
    </h1>
  );
}
