import { AlertTriangle, CheckCircle2, Download, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { exportExcel, parseSheetFile, type Row } from "@/lib/sheet";

export type ImportProgress = (done: number, total: number) => void;

type Report = {
  ok: number;
  failed: string[];
  headers: string[];
  total: number;
};

export function BulkImport({
  label = "Bulk import",
  templateName,
  templateRow,
  onRows,
}: {
  label?: string;
  templateName: string;
  templateRow: Row;
  onRows: (rows: Row[], onProgress: ImportProgress) => Promise<{ ok: number; failed: string[] }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [note, setNote] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  const run = async (file: File) => {
    setReport(null);
    setBusy(true);
    setPct(5);
    setNote("Reading file…");
    try {
      const rows = await parseSheetFile(file);
      if (rows.length === 0) throw new Error("The sheet has no data rows");
      const headers = Object.keys(rows[0] ?? {});
      setPct(10);
      setNote(`0 / ${rows.length}`);
      const result = await onRows(rows, (done, total) => {
        setPct(total ? 10 + Math.round((done / total) * 90) : 100);
        setNote(`${done} / ${total}`);
      });
      setPct(100);
      setReport({ ...result, headers, total: rows.length });
      if (result.ok > 0) toast.success(`Imported ${result.ok} of ${rows.length} row(s)`);
      if (result.failed.length) toast.error(`${result.failed.length} row(s) could not be imported`);
      if (result.ok === 0 && result.failed.length === 0)
        toast.error("Nothing was imported — check the column headers");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      setReport({ ok: 0, failed: [message], headers: [], total: 0 });
      toast.error(message);
    } finally {
      setBusy(false);
      setNote("");
      setPct(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void run(file);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? "Importing…" : label}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={busy}
          onClick={() => exportExcel(`${templateName}-template`, [templateRow], "Template")}
        >
          <Download className="size-4" /> Template
        </Button>
      </div>

      {busy && (
        <div className="flex min-w-56 items-center gap-2">
          <Progress value={pct} className="h-2 w-40" />
          <span className="text-xs tabular-nums text-muted-foreground">{note || "Working…"}</span>
        </div>
      )}

      {report && !busy && (
        <div className="max-w-md rounded-xl border border-border bg-card p-3 text-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 font-medium">
              {report.failed.length === 0 ? (
                <CheckCircle2 className="size-4 text-primary" />
              ) : (
                <AlertTriangle className="size-4 text-destructive" />
              )}
              {report.ok} imported
              {report.failed.length > 0 && ` · ${report.failed.length} skipped`}
            </p>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setReport(null)}
              aria-label="Dismiss import report"
            >
              <X className="size-3.5" />
            </button>
          </div>
          {report.failed.length > 0 && (
            <ul className="mt-2 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-4 text-muted-foreground">
              {report.failed.slice(0, 20).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
              {report.failed.length > 20 && <li>…and {report.failed.length - 20} more</li>}
            </ul>
          )}
          {report.ok === 0 && report.headers.length > 0 && (
            <p className="mt-2 text-muted-foreground">
              Columns found in your file: {report.headers.join(", ")}. Download the template to see
              the expected headers.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
