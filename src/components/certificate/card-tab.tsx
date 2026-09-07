import { Check, ChevronsUpDown, Download, FileDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PrintFrame } from "@/components/certificate/print-frame";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CARD_SIZE,
  downloadPdf,
  downloadPng,
  fileSafe,
  prizeLabel,
  prizeRank,
  type CardStudent,
} from "@/lib/certificates";
import type { PublicResultRow } from "@/lib/results";
import { cn } from "@/lib/utils";

const ALL = "__all__";

/** "1", "2" … "10" sort before/after text classes in natural order. */
function classSort(a: string, b: string) {
  const na = Number.parseInt(a, 10);
  const nb = Number.parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  if (!Number.isNaN(na)) return -1;
  if (!Number.isNaN(nb)) return 1;
  return a.localeCompare(b);
}

export function CardTab({
  rows,
  students,
  loading,
}: {
  rows: PublicResultRow[];
  students: CardStudent[];
  loading: boolean;
}) {
  const [cls, setCls] = useState(ALL);
  const [adno, setAdno] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const classes = useMemo(
    () =>
      [...new Set(students.map((s) => (s.class ?? "").trim()).filter(Boolean))].sort(classSort),
    [students],
  );

  const list = useMemo(
    () => students.filter((s) => cls === ALL || (s.class ?? "").trim() === cls),
    [students, cls],
  );

  useEffect(() => setAdno(""), [cls]);

  const student = list.find((s) => s.adno === adno) ?? null;

  const achievements = useMemo(() => {
    if (!student) return [];
    return rows
      .filter((r) => r.adno === student.adno && prizeLabel(r))
      .sort((a, b) => prizeRank(a) - prizeRank(b) || a.program_name.localeCompare(b.program_name));
  }, [rows, student]);

  const photo = student?.photo_url ?? rows.find((r) => r.adno === student?.adno)?.photo_url ?? null;


  const download = async (kind: "png" | "pdf") => {
    if (!nodeRef.current || !student) return;
    setBusy(kind);
    try {
      const name = fileSafe(`card-${student.name}-${student.adno}`);
      if (kind === "png") await downloadPng(nodeRef.current, name);
      else await downloadPdf(nodeRef.current, name, "portrait");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the file");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={cls} onValueChange={setCls}>
          <SelectTrigger aria-label="Class">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-label="Admission number"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              <span className={cn(!student && "text-muted-foreground")}>
                {student ? `${student.adno} — ${student.name}` : "Search Ad. No"}
              </span>
              <ChevronsUpDown className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search Ad. No or name…" />
              <CommandList>
                <CommandEmpty>No student found.</CommandEmpty>
                <CommandGroup>
                  {list.map((s) => (
                    <CommandItem
                      key={s.adno}
                      value={`${s.adno} ${s.name}`}
                      onSelect={() => {
                        setAdno(s.adno);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn("size-4", s.adno === adno ? "opacity-100" : "opacity-0")}
                      />
                      {s.adno} — {s.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

      </div>

      {!loading && classes.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Class filtering is unavailable until the <code>card_students()</code> database helper is
          installed. All students with published results are listed above.
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading published results…
        </div>
      ) : !student ? (
        <p className="text-sm text-muted-foreground">
          Pick a class and admission number to preview the achievement card.
        </p>
      ) : (
        <>
          <div className="panel overflow-hidden p-2">
            <PrintFrame width={CARD_SIZE.width} height={CARD_SIZE.height} nodeRef={nodeRef}>
              <img
                src="/certificates/card-blank.jpg"
                alt=""
                width={CARD_SIZE.width}
                height={CARD_SIZE.height}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              />

              {photo && (
                <img
                  src={photo}
                  alt=""
                  crossOrigin="anonymous"
                  style={{
                    position: "absolute",
                    left: "36.3%",
                    top: "11.4%",
                    width: "27.4%",
                    height: "19.4%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              )}

              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "32.4%",
                  width: "100%",
                  textAlign: "center",
                  fontSize: 34,
                  fontWeight: 700,
                  color: "#111",
                }}
              >
                {student.name} - {student.adno}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "35.6%",
                  width: "100%",
                  textAlign: "center",
                  fontSize: 27,
                  color: "#333",
                }}
              >
                {student.category ?? ""}
              </div>

              <div
                style={{
                  position: "absolute",
                  left: "12%",
                  top: "41%",
                  width: "76%",
                  maxHeight: "40%",
                  overflow: "hidden",
                }}
              >
                {achievements.length === 0 ? (
                  <p style={{ textAlign: "center", fontSize: 22, color: "#666" }}>
                    No published achievements yet.
                  </p>
                ) : (
                  achievements.map((a, i) => (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 16,
                        padding: "9px 0",
                        borderBottom: "1px solid rgba(0,0,0,0.08)",
                        fontSize: 22,
                        color: "#1a1a1a",
                      }}
                    >
                      <span style={{ width: 34, fontWeight: 700, color: "#b45309" }}>
                        {i + 1}.
                      </span>
                      <span style={{ width: "42%", fontWeight: 700, color: "#b45309" }}>
                        {prizeLabel(a)}
                      </span>
                      <span style={{ flex: 1 }}>{a.program_name}</span>
                    </div>
                  ))

                )}
              </div>
            </PrintFrame>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void download("pdf")} disabled={busy !== null}>
              {busy === "pdf" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => void download("png")} disabled={busy !== null}>
              {busy === "png" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download PNG
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
