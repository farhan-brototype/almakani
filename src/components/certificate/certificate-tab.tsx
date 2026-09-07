import { Download, FileDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PrintFrame } from "@/components/certificate/print-frame";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CERTIFICATE_SIZE,
  downloadPdf,
  downloadPng,
  fileSafe,
  prizeLabel,
  prizeRank,
} from "@/lib/certificates";
import type { PublicResultRow } from "@/lib/results";

const LINE = "1px solid rgba(0,0,0,0.75)";

function Blank({
  value,
  left,
  top,
  width,
}: {
  value: string;
  left: number;
  top: number;
  width: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        borderBottom: LINE,
        textAlign: "center",
        fontSize: 26,
        lineHeight: "30px",
        fontWeight: 600,
        color: "#1a1a1a",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {value}
    </div>
  );
}

export function CertificateTab({ rows, loading }: { rows: PublicResultRow[]; loading: boolean }) {
  const [category, setCategory] = useState("");
  const [programId, setProgramId] = useState("");
  const [entryId, setEntryId] = useState("");
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(),
    [rows],
  );

  const programs = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    for (const r of rows) {
      if (category && r.category !== category) continue;
      if (!map.has(r.program_id))
        map.set(r.program_id, { id: r.program_id, code: r.program_code, name: r.program_name });
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [rows, category]);

  const entries = useMemo(
    () =>
      rows
        .filter((r) => r.program_id === programId && prizeLabel(r))
        .sort((a, b) => prizeRank(a) - prizeRank(b)),
    [rows, programId],
  );

  useEffect(() => setProgramId(""), [category]);
  useEffect(() => setEntryId(""), [programId]);

  const entry = entries.find((e) => e.id === entryId) ?? null;

  const download = async (kind: "png" | "pdf") => {
    if (!nodeRef.current || !entry) return;
    setBusy(kind);
    try {
      const name = fileSafe(`certificate-${entry.student_name}-${entry.program_code}`);
      if (kind === "png") await downloadPng(nodeRef.current, name);
      else await downloadPdf(nodeRef.current, name, "landscape");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the file");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={programId} onValueChange={setProgramId} disabled={!category}>
          <SelectTrigger aria-label="Programme">
            <SelectValue placeholder="Select programme" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} · {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entryId} onValueChange={setEntryId} disabled={!programId}>
          <SelectTrigger aria-label="Place">
            <SelectValue placeholder="Select place" />
          </SelectTrigger>
          <SelectContent>
            {entries.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {prizeLabel(e)} — {e.student_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading published results…
        </div>
      ) : !entry ? (
        <p className="text-sm text-muted-foreground">
          Choose a category, programme and place to preview the certificate. Only individual
          programmes with published results are listed.
        </p>
      ) : (
        <>
          <div className="panel overflow-hidden p-2">
            <PrintFrame
              width={CERTIFICATE_SIZE.width}
              height={CERTIFICATE_SIZE.height}
              nodeRef={nodeRef}
            >
              <img
                src="/certificates/certificate-blank.jpg"
                alt=""
                width={CERTIFICATE_SIZE.width}
                height={CERTIFICATE_SIZE.height}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              />
              <Blank value={entry.student_name ?? ""} left={38.5} top={45.4} width={35.5} />
              <Blank value={prizeLabel(entry)} left={26.5} top={48.2} width={12} />
              <Blank value={entry.program_name} left={49} top={48.2} width={25} />
              <Blank value={entry.category} left={18.2} top={51.1} width={13} />
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
            <Button
              variant="outline"
              onClick={() => void download("png")}
              disabled={busy !== null}
            >
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
