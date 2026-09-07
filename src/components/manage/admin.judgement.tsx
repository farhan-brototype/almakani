import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ArrowDown, ArrowUp, FileDown, Loader2, Printer, Sheet as SheetIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportExcel } from "@/lib/sheet";
import { interleaveByTeam, letterFor, orderCandidates } from "@/lib/judge-order";
import { useRealtime } from "@/hooks/use-realtime";
import { fetchAll, supabase } from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";

const FEST_LOGO = "/almakani-logo.png";


type Candidate = { letter: string; adno: string; team: string; student: string };
type JudgeSheet = {
  code: string;
  name: string;
  category: string;
  type: string;
  group: boolean;
  rows: Candidate[];
};

type Row = {
  program_id: string;
  slot_index?: number | null;
  student: { adno: string; name: string } | null;
  team: { name: string; short_name: string | null } | null;
};

type ProgramRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  entry_mode?: string | null;
  group_size?: number | null;
};

/** Every individual sheet is printed with this many ruled rows. */
const MIN_ROWS = 12;

const blank = (): Candidate => ({ letter: "", adno: "", team: "", student: "" });

/** Rows as printed: every sheet is padded out to twelve ruled lines. */
const sheetRows = (s: JudgeSheet): Candidate[] => [
  ...s.rows,
  ...Array.from({ length: Math.max(0, MIN_ROWS - s.rows.length) }, blank),
];

const pdfRows = sheetRows;


/** Loads the fest logo as a data URL so jsPDF can embed it. */
async function loadLogo(url: string | null | undefined) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("logo read failed"));
      reader.readAsDataURL(blob);
    });
    const format = blob.type.includes("jpeg") || blob.type.includes("jpg") ? "JPEG" : "PNG";
    return { data, format };
  } catch {
    return null;
  }
}


type Instance = { iid: string; sheet: JudgeSheet };

let iidSeq = 0;
const nextIid = () => `pick-${++iidSeq}`;

export function JudgementPage() {
  
  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState<JudgeSheet[]>([]);
  const [manual, setManual] = useState(false);
  const [codeQuery, setCodeQuery] = useState("");
  const [instances, setInstances] = useState<Instance[]>([]);


  const load = async () => {
    setLoading(true);
    const loadAssignments = async () => {
      try {
        return await fetchAll<unknown>(
          "assignments",
          "program_id, slot_index, student:students(adno,name), team:teams(name,short_name)",
        );
      } catch {
        // database not migrated yet: retry without the slot column
        return await fetchAll<unknown>(
          "assignments",
          "program_id, student:students(adno,name), team:teams(name,short_name)",
        );
      }
    };
    const [programs, assignments, items] = await Promise.all([
      fetchAll<ProgramRow>(
        "programs",
        "id,code,name,type,category,entry_mode,group_size",
        { column: "code" },
      ),
      loadAssignments(),
      fetchAll<{ name: string; kind: string }>("category_items", "name,kind"),
    ]);
    const groupItems = new Set(
      ((items as { name: string; kind: string }[]) ?? [])
        .filter((i) => i.kind === "Group")
        .map((i) => i.name.toLowerCase()),
    );
    type Entry = Candidate & { slot: number };
    const byProgram = new Map<string, Entry[]>();
    for (const a of (assignments as unknown as Row[]) ?? []) {
      const arr = byProgram.get(a.program_id) ?? [];
      arr.push({
        letter: "",
        adno: a.student?.adno ?? "",
        student: a.student?.name ?? "",
        team: a.team?.short_name || a.team?.name || "—",
        slot: typeof a.slot_index === "number" && a.slot_index >= 0 ? a.slot_index : arr.length,
      });
      byProgram.set(a.program_id, arr);
    }
    const built: JudgeSheet[] = ((programs as ProgramRow[]) ?? []).map((p) => {
      const isGroup =
        p.entry_mode === "group" || groupItems.has((p.type ?? "").toLowerCase());
      const list = byProgram.get(p.id) ?? [];
      let rows: Candidate[];
      if (isGroup) {
        // Split every team's candidates into its own groups so two groups of the
        // same team never share one row.
        const size = Math.max(1, p.group_size || 0) || 1;
        const perTeam = new Map<string, Entry[]>();
        for (const c of list) {
          const arr = perTeam.get(c.team) ?? [];
          arr.push(c);
          perTeam.set(c.team, arr);
        }
        const groups: Candidate[] = [];
        for (const [team, entries] of [...perTeam.entries()].sort((a, b) =>
          a[0].localeCompare(b[0]),
        )) {
          const sorted = [...entries].sort((a, b) => a.slot - b.slot);
          const buckets = new Map<number, Entry[]>();
          sorted.forEach((e, i) => {
            const g = size > 1 ? Math.floor((e.slot >= 0 ? e.slot : i) / size) : i;
            const arr = buckets.get(g) ?? [];
            arr.push(e);
            buckets.set(g, arr);
          });
          for (const [, members] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
            groups.push({
              letter: "",
              adno: members.map((m) => m.adno).join(", "),
              team,
              student: "",
            });
          }
        }
        rows = interleaveByTeam(p.code, groups).map((r, i) => ({
          ...r,
          letter: letterFor(i).toUpperCase(),
        }));
      } else {
        rows = orderCandidates(p.code, list).map((c, i) => ({
          ...c,
          letter: letterFor(i).toUpperCase(),
        }));
      }
      return {
        code: (p.code ?? "").toUpperCase(),
        name: p.name,
        category: p.category,
        type: p.type,
        group: isGroup,
        rows,
      };
    });
    setSheets(built);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useRealtime(["programs", "assignments", "students", "category_items"], () => void load());

  const visible = useMemo<Instance[]>(
    () =>
      manual
        ? instances
        : sheets
            .filter((s) => s.rows.length > 0)
            .map((s) => ({ iid: `auto-${s.code}`, sheet: s })),
    [manual, sheets, instances],
  );

  const matches = useMemo(() => {
    const q = codeQuery.trim().toLowerCase();
    if (!q) return [] as JudgeSheet[];
    return sheets
      .filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [codeQuery, sheets]);

  const addInstance = (s: JudgeSheet) =>
    setInstances((prev) => [
      ...prev,
      { iid: nextIid(), sheet: { ...s, rows: s.rows.map((r) => ({ ...r })) } },
    ]);

  const updateInstance = (iid: string, fn: (rows: Candidate[]) => Candidate[] | null) =>
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.iid !== iid) return inst;
        const rows = fn(inst.sheet.rows);
        return rows ? { ...inst, sheet: { ...inst.sheet, rows } } : inst;
      }),
    );

  const move = (iid: string, index: number, delta: number) =>
    updateInstance(iid, (prevRows) => {
      const rows = [...prevRows];
      const target = index + delta;
      if (target < 0 || target >= rows.length) return null;
      const a = rows[index]!;
      const b = rows[target]!;
      rows[index] = b;
      rows[target] = a;
      return rows.map((r, i) => ({ ...r, letter: letterFor(i).toUpperCase() }));
    });

  const setLetter = (iid: string, index: number, letter: string) =>
    updateInstance(iid, (rows) =>
      rows.map((r, i) => (i === index ? { ...r, letter: letter.toUpperCase() } : r)),
    );


  const toExcel = () => {
    const rows = visible.flatMap(({ sheet: s }) =>
      s.rows.map((r) => ({
        "Programme code": s.code,
        "Program Name": s.name,
        Category: s.category,
        "Code Letter": r.letter,
        "Ad.no": r.adno,
        "Students Name": r.student,
        Point: "",
      })),
    );
    if (rows.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    exportExcel("judgement-list", rows, "Judgement");
  };

  /** Four sheets to an A4 page, two by two. */
  const toPdf = async () => {
    if (visible.length === 0) {
      toast.error("Nothing to export yet");
      return;
    }
    const logo = await loadLogo(FEST_LOGO);
    const doc = new jsPDF({ format: "a4", unit: "mm" });
    const quadrants = [
      { x: 10, y: 12 },
      { x: 112, y: 12 },
      { x: 10, y: 152 },
      { x: 112, y: 152 },
    ];
    const width = 88;

    visible.forEach(({ sheet: s }, i) => {
      const slot = i % 4;
      if (i > 0 && slot === 0) doc.addPage();
      const q = quadrants[slot]!;

      // Per-programme banner: logo only, centred above the sheet (453×142 source).
      const logoW = 36;
      const logoH = (logoW * 142) / 453;
      if (logo) doc.addImage(logo.data, logo.format, q.x + (width - logoW) / 2, q.y, logoW, logoH);

      autoTable(doc, {
        startY: q.y + (logo ? logoH + 1.5 : 2),
        margin: { left: q.x },
        tableWidth: width,
        body: [[s.code, s.name.toUpperCase(), s.category]],

        styles: {
          fontSize: 8,
          cellPadding: 1.4,
          lineColor: [30, 30, 30],
          lineWidth: 0.2,
        },
        theme: "grid",
        bodyStyles: { fillColor: [20, 20, 24], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [20, 20, 24], textColor: [255, 255, 255] },

        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 16, halign: "center" },
          1: { fontStyle: "bold", halign: "center" },
          2: { cellWidth: 22, halign: "center" },
        },
      });
      const after = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      const body = pdfRows(s).map((r) =>
        s.group ? [r.letter, r.adno, ""] : [r.letter, r.adno, r.student, ""],
      );
      autoTable(doc, {
        startY: after + 1.5,
        margin: { left: q.x },
        tableWidth: width,
        head: [s.group ? ["Code", "Ad.no", "Point"] : ["Code", "Ad.no", "Students Name", "Point"]],
        body,
        styles: {
          fontSize: 7.5,
          cellPadding: 1.4,
          lineColor: [120, 120, 120],
          lineWidth: 0.1,
          halign: "center",
          valign: "middle",
          minCellHeight: 7,
        },
        headStyles: {
          fillColor: [232, 232, 234],
          textColor: [25, 25, 30],
          fontSize: 7.5,
          halign: "center",
          valign: "middle",
          lineColor: [120, 120, 120],
          lineWidth: 0.1,
        },
        columnStyles: s.group
          ? {
              0: { cellWidth: 13 },
              1: { font: "courier", fontStyle: "bold" },
              2: { cellWidth: 18 },
            }
          : {
              0: { cellWidth: 13 },
              1: { cellWidth: 17, font: "courier", fontStyle: "bold" },
              2: { halign: "left" },
              3: { cellWidth: 17 },
            },
        didParseCell: (data) => {
          if (data.section === "head") data.cell.styles.halign = "center";
        },
      });
    });
    doc.save("judgement-list.pdf");
  };

  /** Export wrapper so any failure surfaces as a toast instead of a silent no-op. */
  const downloadPdf = async () => {
    try {
      await toPdf();
    } catch (err) {
      console.error("judgement pdf export failed", err);
      toast.error("Could not create the PDF");
    }
  };


  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <PageHeading title="Judgement List" />
          <p className="text-sm text-muted-foreground">
            Printable judging sheets — four to an A4 page, in the same order as result enrolling.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={manual ? "outline" : "default"}
            size="sm"
            onClick={() => setManual(false)}
          >
            Full (automatic)
          </Button>
          <Button variant={manual ? "default" : "outline"} size="sm" onClick={() => setManual(true)}>
            Manual
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={toExcel}>
            <SheetIcon className="size-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void downloadPdf()}>
            <FileDown className="size-4" /> PDF
          </Button>
          <Button size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
        </div>
      </div>

      {manual && (
        <div className="panel space-y-3 p-4 print:hidden">
          <div className="space-y-1.5">
            <Label>Type a programme code or name</Label>
            <Input
              value={codeQuery}
              placeholder="e.g. A101 or Mappilappattu"
              onChange={(e) => setCodeQuery(e.target.value)}
            />
          </div>
          {matches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {matches.map((m) => (
                <Button
                  key={m.code}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    addInstance(m);
                    setCodeQuery("");
                  }}
                >
                  {m.code} · {m.name}
                </Button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {instances.map((inst, i) => (
              <button
                key={inst.iid}
                className="rounded-full bg-muted px-3 py-1 text-xs"
                onClick={() =>
                  setInstances((prev) => prev.filter((x) => x.iid !== inst.iid))
                }
              >
                {i + 1}. {inst.sheet.code} ✕
              </button>
            ))}
            {instances.length === 0 && (
              <span className="text-xs text-muted-foreground">
                No programme picked yet — pick one to build its sheet. The same programme can be
                added more than once.
              </span>
            )}
          </div>

        </div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="judge-grid grid gap-8 md:grid-cols-2 md:gap-x-10">
          {visible.map(({ iid, sheet: s }) => (
            <article
              key={iid}
              className="judge-card overflow-hidden rounded-lg border border-judge-rule bg-card p-0"
            >
              <header className="flex items-center justify-center px-3 py-3">
                <img src={FEST_LOGO} alt="Al Makani Islah Arts Fest" className="h-16 w-auto" />
              </header>
              <table className="w-full table-fixed border-collapse text-sm">
                <tbody>
                  <tr className="bg-judge-bar text-judge-bar-foreground">
                    <td className="w-16 border border-judge-rule p-1.5 text-center align-middle font-mono text-xs font-bold uppercase">
                      {s.code}
                    </td>
                    <td className="border border-judge-rule p-1.5 text-center align-middle text-xs font-bold uppercase">
                      {s.name}
                    </td>
                    <td className="w-24 border border-judge-rule p-1.5 text-center align-middle text-xs">
                      {s.category}
                    </td>
                  </tr>
                </tbody>
              </table>
              <table className="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="bg-judge-head text-[10px] uppercase tracking-wide text-judge-head-foreground">
                    <th className="w-12 border border-judge-rule p-2.5 py-3 text-center align-middle">
                      Code
                    </th>
                    <th className="w-16 border border-judge-rule p-2.5 py-3 text-center align-middle">
                      Ad.no
                    </th>
                    {!s.group && (
                      <th className="border border-judge-rule p-2.5 py-3 text-center align-middle">
                        Students Name
                      </th>
                    )}
                    <th className="w-16 border border-judge-rule p-2.5 py-3 text-center align-middle">
                      Point
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sheetRows(s).map((r, i) => (
                    <tr key={`${iid}-${i}`}>
                      <td className="border border-judge-rule p-2.5 py-3 text-center align-middle">
                        {manual && i < s.rows.length ? (
                          <Input
                            className="h-8 w-12 text-center uppercase"
                            value={r.letter}
                            onChange={(e) => setLetter(iid, i, e.target.value)}
                          />
                        ) : (
                          r.letter || "\u00a0"
                        )}
                      </td>
                      <td className="border border-judge-rule p-2.5 py-3 text-center align-middle font-mono font-semibold">
                        {r.adno || "\u00a0"}
                      </td>
                      {!s.group && (
                        <td className="border border-judge-rule p-2.5 py-3 align-middle">
                          {r.student || "\u00a0"}
                        </td>
                      )}
                      <td className="border border-judge-rule p-2.5 py-3 text-center align-middle">
                        {manual && i < s.rows.length && (
                          <span className="flex justify-center gap-1 print:hidden">
                            <Button size="icon" variant="ghost" onClick={() => move(iid, i, -1)}>
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => move(iid, i, 1)}>
                              <ArrowDown className="size-4" />
                            </Button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>
            </article>
          ))}

          {visible.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {manual
                ? "Pick a programme code above to build its judgement sheet."
                : "No programme has candidates yet."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
