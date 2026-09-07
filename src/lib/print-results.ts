import { positionText, type ResultEntry } from "./results";

export type PrintMode = "winners" | "grades" | "both";

export type PrintGroup = { code: string; name: string; category?: string; rows: ResultEntry[] };

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const getPrizeHtml = (r: ResultEntry) => {
  if (r.position === 1) return `<span class="badge badge-first">First</span>`;
  if (r.position === 2) return `<span class="badge badge-second">Second</span>`;
  if (r.position === 3) return `<span class="badge badge-third">Third</span>`;
  if (r.grade) return `<span class="badge badge-grade">Grade</span>`;
  return "—";
};

const getGradeText = (r: ResultEntry) => (r.grade ? escapeHtml(r.grade) : "—");
const getAdnoText = (r: ResultEntry) => (r.students?.adno ? escapeHtml(r.students.adno) : "—");
const getNameText = (r: ResultEntry) =>
  escapeHtml(r.students?.name ?? r.teams?.name ?? "—");
const getTeamShortText = (r: ResultEntry) =>
  escapeHtml(r.teams?.short_name || r.teams?.name || "—");

const buildRowHtml = (r: ResultEntry) => `
  <tr>
    <td class="col-prize">${getPrizeHtml(r)}</td>
    <td class="col-grade">${getGradeText(r)}</td>
    <td class="col-adno">${getAdnoText(r)}</td>
    <td class="col-name">${getNameText(r)}</td>
    <td class="col-team">${getTeamShortText(r)}</td>
  </tr>
`;

/** Opens a clean print sheet with only positions and/or grades per programme. */
export function printResultSheet(
  groups: PrintGroup[],
  opts: { title: string; mode: PrintMode; logoUrl?: string | null },
) {
  const { mode } = opts;

  const blocks = groups
    .map((g) => {
      const winners = g.rows
        .filter((r) => r.position && r.position <= 3)
        .sort((a, b) => (a.position ?? 9) - (b.position ?? 9));
      const gradeOnly = g.rows
        .filter((r) => r.grade && (!r.position || r.position > 3))
        .sort((a, b) => (a.grade ?? "").localeCompare(b.grade ?? "") || b.percent - a.percent);

      const lines: string[] = [];
      if (mode !== "grades") {
        for (const r of winners) {
          lines.push(buildRowHtml(r));
        }
      }
      if (mode !== "winners" && gradeOnly.length > 0) {
        if (mode === "both" && winners.length > 0) {
          lines.push(`
            <tr class="sep-row">
              <td colspan="5">Grade Only</td>
            </tr>
          `);
        }
        for (const r of gradeOnly) {
          lines.push(buildRowHtml(r));
        }
      }
      if (lines.length === 0) return "";

      return `
        <section class="card">
          <div class="card-header">
            <span class="code">${escapeHtml(g.code)}</span>
            <h2 class="card-title">${escapeHtml(g.name)}</h2>
            ${g.category ? `<span class="cat-badge">${escapeHtml(g.category)}</span>` : ""}
          </div>
          <table class="results-table">
            <thead>
              <tr>
                <th class="col-prize">Prize</th>
                <th class="col-grade">Grade</th>
                <th class="col-adno">Ad.No</th>
                <th class="col-name">Name</th>
                <th class="col-team">Team</th>
              </tr>
            </thead>
            <tbody>
              ${lines.join("")}
            </tbody>
          </table>
        </section>
      `;
    })
    .filter(Boolean)
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    header img { height: 42px; object-fit: contain; }
    header h1 {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      letter-spacing: .02em;
      text-transform: uppercase;
      color: #0f172a;
    }
    .grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .card {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      break-inside: avoid;
      background: #ffffff;
    }
    .card-header {
      background: #f8fafc;
      border-bottom: 1.5px solid #cbd5e1;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 700;
      color: #0284c7;
      background: #e0f2fe;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #bae6fd;
    }
    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      flex: 1;
    }
    .cat-badge {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6d28d9;
      background: #ede9fe;
      border: 1px solid #c4b5fd;
      padding: 2px 7px;
      border-radius: 4px;
      white-space: nowrap;
    }
    table.results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      text-align: left;
    }
    table.results-table th {
      background: #f1f5f9;
      color: #334155;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
    }
    table.results-table td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      color: #1e293b;
    }
    table.results-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .col-prize { width: 16%; font-weight: 700; color: #0f172a; text-align: center; }
    .col-grade { width: 12%; text-align: center; font-weight: 700; color: #2563eb; }
    .col-adno { width: 16%; font-family: ui-monospace, monospace; text-align: center; color: #475569; }
    .col-name { width: 38%; font-weight: 600; }
    .col-team { width: 18%; text-align: center; font-weight: 700; color: #0f172a; }

    .badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
      text-align: center;
    }
    .badge-first { color: #92400e; background: #fef3c7; border: 1px solid #fde68a; }
    .badge-second { color: #334155; background: #f1f5f9; border: 1px solid #cbd5e1; }
    .badge-third { color: #9a3412; background: #ffedd5; border: 1px solid #fed7aa; }
    .badge-grade { color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; }

    .sep-row td {
      background: #e2e8f0 !important;
      color: #475569;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: center;
      padding: 4px 8px;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .card { break-inside: avoid; }
    }
  </style></head><body>
  <header>
    <div class="header-left">
      ${opts.logoUrl ? `<img src="${escapeHtml(opts.logoUrl)}" alt="" />` : ""}
      <h1>${escapeHtml(opts.title)}</h1>
    </div>
  </header>
  <div class="grid">${blocks || "<p>No results to print.</p>"}</div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 350); };<\/script>
  </body></html>`;

  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

