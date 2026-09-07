import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BulkImport } from "@/components/admin/BulkImport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { chunkedWrite, normalizeDate, pick } from "@/lib/sheet";
import { CATEGORIES, supabase, type Program, type TimetableRow } from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";
import { useTaxonomy } from "@/lib/taxonomy";


export function TimetablePage() {
  const { categories, types } = useTaxonomy();
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Partial<TimetableRow> | null>(null);

  const load = async () => {
    const [{ data: tt }, { data: pg }] = await Promise.all([
      supabase
        .from("timetable")
        .select("*, programs(code,name,category,type)")
        .order("event_date")
        .order("event_time"),
      supabase.from("programs").select("*").order("code"),
    ]);
    setRows((tt as TimetableRow[]) ?? []);
    setPrograms((pg as Program[]) ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  useRealtime(["timetable", "programs"], () => void load());

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const text = `${r.programs?.code ?? ""} ${r.programs?.name ?? ""} ${r.stage ?? ""}`;
        if (q && !text.toLowerCase().includes(q.toLowerCase())) return false;
        if (type !== "all" && r.programs?.type !== type) return false;
        if (category !== "all" && r.programs?.category !== category) return false;
        return true;
      }),
    [rows, q, type, category],
  );

  const save = async (): Promise<void> => {
    if (!editing?.program_id || !editing.event_date) {
      toast.error("Programme and date are required");
      return;
    }
    const payload = {
      program_id: editing.program_id,
      event_date: editing.event_date,
      event_time: editing.event_time || null,
      end_time: editing.end_time || null,
      stage: editing.stage || null,
      judge1: editing.judge1?.trim() || null,
      judge2: editing.judge2?.trim() || null,
      completed: Boolean(editing.completed),
    };

    const { error } = editing.id
      ? await supabase.from("timetable").update(payload).eq("id", editing.id)
      : await supabase.from("timetable").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  const toggleCompleted = async (row: TimetableRow, value: boolean) => {
    await supabase.from("timetable").update({ completed: value }).eq("id", row.id);
    await supabase
      .from("programs")
      .update({ status: value ? "completed" : "upcoming" })
      .eq("id", row.program_id);
    void load();
  };

  const remove = async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} schedule row(s)?`)) return;
    const { error } = await supabase.from("timetable").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelected([]);
    void load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageHeading title="Time Table" />
          <p className="text-sm text-muted-foreground">{rows.length} scheduled items</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkImport
            templateName="timetable"
            templateRow={{
              Code: "A01",
              Date: "2026-09-12",
              Start: "10:30",
              End: "11:30",
              Stage: "Main Stage",
              "Judge 1": "",
              "Judge 2": "",

              Completed: "no",
            }}
            onRows={async (sheet, onProgress) => {
              const failed: string[] = [];
              const payload = sheet.flatMap((r, index) => {
                const code = pick(r, "code", "programcode", "programmecode");
                const progName = pick(r, "program", "programme", "name", "programname");
                const program =
                  programs.find((p) => p.code.toLowerCase() === code.toLowerCase()) ??
                  (progName
                    ? programs.find((p) => p.name.toLowerCase() === progName.toLowerCase())
                    : undefined);
                const date = pick(r, "date", "eventdate");
                if (!program) {
                  failed.push(
                    `row ${index + 1}: unknown programme "${code || progName || "(blank)"}"`,
                  );
                  return [];
                }
                if (!date) {
                  failed.push(`row ${index + 1}: missing date`);
                  return [];
                }
                return [
                  {
                    program_id: program.id,
                    event_date: normalizeDate(date),
                    event_time: pick(r, "start", "time", "eventtime", "starttime") || null,
                    end_time: pick(r, "end", "endtime") || null,
                    stage: pick(r, "stage") || null,
                    judge1: pick(r, "judge1", "judge", "judgeone", "judge1name") || null,
                    judge2: pick(r, "judge2", "judgetwo", "judge2name") || null,

                    completed: ["yes", "true", "1", "completed"].includes(
                      pick(r, "completed").toLowerCase(),
                    ),
                  },
                ];
              });

              const result = await chunkedWrite(
                payload,
                (batch) => supabase.from("timetable").insert(batch),
                onProgress,
              );
              await load();
              return { ok: result.ok, failed: [...failed, ...result.failed] };
            }}
          />
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setEditing({ event_date: "", completed: false })}
          >
            <Plus className="size-4" /> Add schedule
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search code, programme or stage"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => remove(selected)}
          >
            <Trash2 className="size-4" /> Delete {selected.length}
          </Button>
        )}
      </div>

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">
                <Checkbox
                  checked={selected.length > 0 && selected.length === filtered.length}
                  onCheckedChange={(v) => setSelected(v ? filtered.map((r) => r.id) : [])}
                />
              </th>
              <th className="p-3">Code</th>
              <th className="p-3">Programme</th>
              <th className="p-3">Category</th>
              <th className="p-3">Date</th>
              <th className="p-3">Time</th>
              <th className="p-3">End</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Judges</th>
              <th className="p-3">Completed</th>

              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3">
                  <Checkbox
                    checked={selected.includes(r.id)}
                    onCheckedChange={(v) =>
                      setSelected((s) => (v ? [...s, r.id] : s.filter((i) => i !== r.id)))
                    }
                  />
                </td>
                <td className="p-3 font-mono">{r.programs?.code}</td>
                <td className="p-3 font-medium">{r.programs?.name}</td>
                <td className="p-3">
                  <Badge variant="secondary">{r.programs?.category}</Badge>
                </td>
                <td className="p-3">{r.event_date}</td>
                <td className="p-3">{r.event_time?.slice(0, 5) ?? "—"}</td>
                <td className="p-3">{r.end_time?.slice(0, 5) ?? "—"}</td>
                <td className="p-3">{r.stage ?? "—"}</td>
                <td className="p-3 text-xs">
                  {[r.judge1, r.judge2].filter(Boolean).join(", ") || "—"}
                </td>

                <td className="p-3">
                  <Checkbox
                    checked={r.completed}
                    onCheckedChange={(v) => toggleCompleted(r, Boolean(v))}
                  />
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove([r.id])}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-muted-foreground">
                  Nothing scheduled yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit schedule" : "New schedule"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Programme</Label>
              <Select
                value={editing?.program_id ?? ""}
                onValueChange={(v) => setEditing({ ...editing, program_id: v })}
              >
                <SelectTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={editing?.event_date ?? ""}
                onChange={(e) => setEditing({ ...editing, event_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input
                type="time"
                value={editing?.event_time?.slice(0, 5) ?? ""}
                onChange={(e) => setEditing({ ...editing, event_time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input
                type="time"
                value={editing?.end_time?.slice(0, 5) ?? ""}
                onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Input
                value={editing?.stage ?? ""}
                onChange={(e) => setEditing({ ...editing, stage: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Judge 1 (optional)</Label>
              <Input
                value={editing?.judge1 ?? ""}
                placeholder="Judge name"
                onChange={(e) => setEditing({ ...editing, judge1: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Judge 2 (optional)</Label>
              <Input
                value={editing?.judge2 ?? ""}
                placeholder="Judge name"
                onChange={(e) => setEditing({ ...editing, judge2: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                checked={Boolean(editing?.completed)}
                onCheckedChange={(v) => setEditing({ ...editing, completed: Boolean(v) })}
              />
              <Label>Completed</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
