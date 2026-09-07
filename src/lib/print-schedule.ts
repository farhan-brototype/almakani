import type { TimetableRow } from "./supabase";

export type ScheduleSection = { title: string; subtitle?: string; rows: TimetableRow[] };

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );

const dateText = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const timeText = (t: string | null) => (t ? t.slice(0, 5) : "—");

const judgeText = (r: TimetableRow) =>
  [r.judge1, r.judge2].map((j) => (j ?? "").trim()).filter(Boolean).join(", ") || "—";

const rowHtml = (r: TimetableRow, showJudges: boolean) => `
  <tr>
    <td class="col-date">${escapeHtml(dateText(r.event_date))}</td>
    <td class="col-time">${escapeHtml(timeText(r.event_time))}${
      r.end_time ? ` – ${escapeHtml(timeText(r.end_time))}` : ""
    }</td>
    <td class="col-code">${escapeHtml(r.programs?.code ?? "—")}</td>
    <td class="col-name">${escapeHtml(r.programs?.name ?? "—")}</td>
    <td class="col-cat">${escapeHtml(r.programs?.category ?? "—")}</td>
    <td class="col-stage">${escapeHtml(r.stage ?? "—")}</td>
    ${showJudges ? `<td class="col-judge">${escapeHtml(judgeText(r))}</td>` : ""}
  </tr>
`;

/**
 * Opens a clean print sheet of scheduled programmes.
 * Every section starts on a fresh page (one page per judge / stage).
 */
export function printScheduleSheet(
  sections: ScheduleSection[],
  opts: {
    title: string;
    showJudges: boolean;
    logoUrl?: string | null;
    pageBreakPerSection?: boolean;
  },
): boolean {
  const { showJudges } = opts;
  const breakPer = opts.pageBreakPerSection ?? true;

  const blocks = sections
    .filter((s) => s.rows.length > 0)
    .map(
      (s, i) => `
        <section class="sheet${breakPer && i > 0 ? " page-break" : ""}">
          <div class="sheet-head">
            <h2>${escapeHtml(s.title)}</h2>
            ${s.subtitle ? `<span class="sub">${escapeHtml(s.subtitle)}</span>` : ""}
            <span class="count">${s.rows.length} programme${s.rows.length > 1 ? "s" : ""}</span>
          </div>
          <table class="sched-table">
            <thead>
              <tr>
                <th class="col-date">Date</th>
                <th class="col-time">Time</th>
                <th class="col-code">Code</th>
                <th class="col-name">Programme</th>
                <th class="col-cat">Category</th>
                <th class="col-stage">Stage</th>
                ${showJudges ? `<th class="col-judge">Judges</th>` : ""}
              </tr>
            </thead>
            <tbody>${s.rows.map((r) => rowHtml(r, showJudges)).join("")}</tbody>
          </table>
        </section>
      `,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a; background: #fff; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    header {
      display: flex; align-items: center; gap: 12px;
      border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px;
    }
    header img { height: 42px; object-fit: contain; }
    header h1 {
      font-size: 18px; font-weight: 700; margin: 0;
      letter-spacing: .02em; text-transform: uppercase;
    }
    .sheet { margin-bottom: 16px; }
    .page-break { break-before: page; page-break-before: always; }
    .sheet-head {
      display: flex; align-items: center; gap: 8px;
      background: #f8fafc; border: 1.5px solid #cbd5e1; border-bottom: 0;
      border-radius: 6px 6px 0 0; padding: 6px 10px;
    }
    .sheet-head h2 { font-size: 14px; margin: 0; font-weight: 700; }
    .sheet-head .sub { font-size: 11px; color: #475569; }
    .sheet-head .count { margin-left: auto; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
    table.sched-table { width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left; }
    table.sched-table th {
      background: #f1f5f9; color: #334155; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .04em; padding: 5px 8px; border: 1px solid #cbd5e1;
    }
    table.sched-table td { padding: 5px 8px; border: 1px solid #cbd5e1; color: #1e293b; }
    table.sched-table tr:nth-child(even) td { background: #f8fafc; }
    .col-date { width: 15%; }
    .col-time { width: 13%; white-space: nowrap; }
    .col-code { width: 9%; font-family: ui-monospace, monospace; font-weight: 700; color: #0284c7; }
    .col-name { font-weight: 600; }
    .col-cat { width: 14%; }
    .col-stage { width: 14%; }
    .col-judge { width: 18%; }
    @media print { .sheet { break-inside: auto; } }
  </style></head><body>
  <header>
    ${opts.logoUrl ? `<img src="${escapeHtml(opts.logoUrl)}" alt="" />` : ""}
    <h1>${escapeHtml(opts.title)}</h1>
  </header>
  ${blocks || "<p>Nothing to print for these filters.</p>"}
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 350); };<\/script>
  </body></html>`;

  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
