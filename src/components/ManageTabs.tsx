import { cn } from "@/lib/utils";

export type ManageTab = { id: string; label: string };

/**
 * Horizontal rail of section tabs shown inside a page for logged-in tiers.
 * Row one of every managed page is always the normal "Overview" view.
 */
export function ManageTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: ManageTab[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  if (tabs.length < 2) return null;
  return (
    <div
      className={cn(
        "mx-auto max-w-7xl overflow-x-auto px-4 pt-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <div className="flex w-max gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
              value === t.id
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted/70 text-foreground/70 hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
