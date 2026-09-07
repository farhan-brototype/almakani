import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type Row = Record<string, unknown>;

/** Parse an uploaded .xlsx / .xls / .csv file into plain rows (header row required). */
export async function parseSheetFile(file: File): Promise<Row[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const sheet = wb.Sheets[first];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: false });
}

/** Case/space-insensitive column lookup so imported files don't have to be perfect. */
export function pick(row: Row, ...keys: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const entries = Object.keys(row).map((k) => [norm(k), k] as const);
  const map = new Map(entries);
  const read = (columnKey: string): string => {
    const value = row[columnKey];
    if (value !== null && value !== undefined && String(value).trim() !== "")
      return String(value).trim();
    return "";
  };
  for (const key of keys) {
    const found = map.get(norm(key));
    if (found !== undefined) {
      const value = read(found);
      if (value) return value;
    }
  }
  // Fallback: partial header match ("Programme Code" -> "code", "Adm No." -> "adno")
  for (const key of keys) {
    const target = norm(key);
    for (const [normalized, original] of entries) {
      if (normalized === target || normalized.includes(target) || target.includes(normalized)) {
        const value = read(original);
        if (value) return value;
      }
    }
  }
  return "";
}

export function exportExcel(filename: string, rows: Row[], sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function downloadTemplate(filename: string, headers: string[], sample: Row) {
  exportExcel(filename, [sample], "Template");
  void headers;
}

export type PdfOptions = {
  /** Column indexes rendered bold (e.g. an Ad.No column). */
  boldColumns?: number[];
  /** Column indexes rendered in a monospace font so multi-line values line up. */
  monoColumns?: number[];
  /** Fixed widths (mm) keyed by column index. */
  columnWidths?: Record<number, number>;
};

export function exportPdf(
  filename: string,
  title: string,
  columns: string[],
  rows: string[][],
  options: PdfOptions = {},
) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), 14, 22);

  const columnStyles: Record<number, Record<string, unknown>> = {};
  const touch = (i: number) => (columnStyles[i] ??= {});
  for (const i of options.boldColumns ?? []) touch(i)["fontStyle"] = "bold";
  for (const i of options.monoColumns ?? []) touch(i)["font"] = "courier";
  for (const [i, w] of Object.entries(options.columnWidths ?? {}))
    touch(Number(i))["cellWidth"] = w;

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 27,
    styles: { fontSize: 8, cellPadding: 2, valign: "top" },
    headStyles: { fillColor: [46, 47, 92] },
    columnStyles,
  });
  doc.save(`${filename}.pdf`);
}

/**
 * Insert/upsert rows in small batches so one bad row can't kill the whole import,
 * and so the UI can report progress. Returns per-row failure messages.
 */
export async function chunkedWrite<T>(
  rows: T[],
  write: (batch: T[]) => PromiseLike<{ error: { message: string } | null }>,
  onProgress?: (done: number, total: number) => void,
  size = 10,
): Promise<{ ok: number; failed: string[] }> {
  const failed: string[] = [];
  let ok = 0;
  let done = 0;
  onProgress?.(0, rows.length);
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await write(batch);
    if (error) {
      // retry the batch one row at a time so good rows still land
      for (const row of batch) {
        const single = await write([row]);
        if (single.error) failed.push(`row ${done + 1}: ${single.error.message}`);
        else ok += 1;
        done += 1;
        onProgress?.(done, rows.length);
      }
    } else {
      ok += batch.length;
      done += batch.length;
      onProgress?.(done, rows.length);
    }
  }
  return { ok, failed };
}

/** Accepts 2026-09-12, 12/09/2026, 12-09-2026 and Excel serial numbers. */
export function normalizeDate(input: string): string {
  const value = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial > 20000 && serial < 60000) {
      const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return date.toISOString().slice(0, 10);
    }
  }
  const m = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return value;
}
