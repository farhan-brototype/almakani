import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

import { fetchPublicResults, positionText, type PublicResultRow } from "./results";
import { supabase } from "./supabase";

/** Design sizes of the printed artwork (px), used as the render canvas. */
export const CERTIFICATE_SIZE = { width: 1600, height: 1128 };
export const CARD_SIZE = { width: 1131, height: 1600 };

/** "First with A" / "First" / "A grade" — the wording used on printed items. */
export function prizeLabel(r: Pick<PublicResultRow, "position" | "grade">): string {
  const place = r.position && r.position <= 3 ? positionText(r.position) : null;
  if (place) return r.grade ? `${place} with ${r.grade}` : place;
  return r.grade ? `${r.grade} grade` : "";
}

/** First-with-grade, then plain positions, then grade-only entries. */
export function prizeRank(r: Pick<PublicResultRow, "position" | "grade">): number {
  const pos = r.position && r.position <= 3 ? r.position : 0;
  if (pos && r.grade) return pos;
  if (pos) return 100 + pos;
  const grade = (r.grade ?? "").toUpperCase().charCodeAt(0) || 999;
  return 200 + grade;
}

export type CardStudent = {
  adno: string;
  name: string;
  class: string | null;
  category: string | null;
  photo_url: string | null;
};

/** Rows that can be certified individually (no group / team-level entries). */
export function individualRows(rows: PublicResultRow[]): PublicResultRow[] {
  return rows.filter((r) => !r.is_group && !!r.adno && !!r.student_name);
}

export async function fetchCertificateRows(): Promise<PublicResultRow[]> {
  return individualRows(await fetchPublicResults());
}

/**
 * Students that can print a card. Uses the public `card_students` function when
 * the database has it (gives the class), and otherwise falls back to the
 * students found in the published results.
 */
export async function fetchCardStudents(rows: PublicResultRow[]): Promise<CardStudent[]> {
  try {
    const { data, error } = await supabase.rpc("card_students" as never);
    if (!error && Array.isArray(data) && data.length) {
      return (data as CardStudent[]).slice().sort((a, b) => a.adno.localeCompare(b.adno));
    }
  } catch {
    /* fall through to the results-derived list */
  }

  const map = new Map<string, CardStudent>();
  for (const r of rows) {
    if (!r.adno || map.has(r.adno)) continue;
    map.set(r.adno, {
      adno: r.adno,
      name: r.student_name ?? "",
      class: null,
      category: r.category ?? null,
      photo_url: r.photo_url ?? null,
    });
  }
  return [...map.values()].sort((a, b) => a.adno.localeCompare(b.adno));
}

async function nodeToPng(node: HTMLElement): Promise<string> {
  // The preview is shrunk with a CSS transform to fit the screen; the export
  // must ignore that so the artwork fills the whole exported page.
  return toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#ffffff",
    width: node.offsetWidth,
    height: node.offsetHeight,
    style: { transform: "none", transformOrigin: "top left", margin: "0" },
  });
}


export async function downloadPng(node: HTMLElement, filename: string) {
  const url = await nodeToPng(node);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
}

export async function downloadPdf(
  node: HTMLElement,
  filename: string,
  orientation: "landscape" | "portrait",
) {
  const url = await nodeToPng(node);
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  pdf.addImage(url, "PNG", 0, 0, w, h);
  pdf.save(`${filename}.pdf`);
}

/** Safe file name for a download. */
export const fileSafe = (v: string) =>
  v.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "almakani";
