import { CalendarClock, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRealtime } from "@/hooks/use-realtime";
import { entryModeLabel, slotsFor, supabase, type Program } from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";
import { RegistrationWindowPanel } from "@/components/manage/registration-window-panel";

type RegRow = {
  program_id: string;
  is_open: boolean;
  deadline: string | null;
  max_entries: number;
};

/** Turn a timestamptz into the value an <input type="datetime-local"> expects. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RegistrationSetupPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [rows, setRows] = useState<Record<string, RegRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [code, setCode] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [bulk, setBulk] = useState("");
  const [q, setQ] = useState("");
  const [state, setState] = useState("all");

  const load = useCallback(async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("programs").select("*").order("code"),
      supabase.from("program_registration").select("*"),
    ]);
    setPrograms((p as Program[]) ?? []);
    const map: Record<string, RegRow> = {};
    for (const row of (r as RegRow[]) ?? []) map[row.program_id] = row;
    setRows(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(["program_registration", "programs"], load);

  const byId = useMemo(() => {
    const m: Record<string, Program> = {};
    for (const p of programs) m[p.id] = p;
    return m;
  }, [programs]);

  /** Live preview of the programme matching the typed code. */
  const preview = useMemo(() => {
    const value = code.trim().toLowerCase();
    if (!value) return null;
    return programs.find((p) => p.code.toLowerCase() === value) ?? null;
  }, [code, programs]);

  /** Only programmes the admin has actually added to registration. */
  const listed = useMemo(
    () =>
      Object.values(rows)
        .map((r) => ({ reg: r, program: byId[r.program_id] }))
        .filter((x): x is { reg: RegRow; program: Program } => Boolean(x.program))
        .filter(({ reg, program }) => {
          if (q && !`${program.code} ${program.name}`.toLowerCase().includes(q.toLowerCase()))
            return false;
          if (state === "open" && !reg.is_open) return false;
          if (state === "closed" && reg.is_open) return false;
          return true;
        })
        .sort((a, b) => a.program.code.localeCompare(b.program.code)),
    [rows, byId, q, state],
  );

  const add = async () => {
    const value = code.trim();
    if (!value) return;
    const program = programs.find((p) => p.code.toLowerCase() === value.toLowerCase());
    if (!program) {
      toast.error(`No programme with code ${value}`);
      return;
    }
    if (rows[program.id]) {
      toast.info(`${program.code} is already in the registration list`);
      return;
    }
    setSaving("add");
    const payload: RegRow = {
      program_id: program.id,
      is_open: true,
      deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
      max_entries: Math.max(slotsFor(program), 1),
    };
    const { error } = await supabase
      .from("program_registration")
      .upsert(payload, { onConflict: "program_id" });
    setSaving("");
    if (error) toast.error(error.message);
    else {
      toast.success(`${program.code} added to registration`);
      setCode("");
      setNewDeadline("");
      void load();
    }
  };

  /** Add many programmes at once by pasting their codes. */
  const addBulk = async () => {
    const codes = bulk
      .split(/[\s,;]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (codes.length === 0) return;
    setSaving("bulk");
    const payload: RegRow[] = [];
    const missing: string[] = [];
    for (const c of codes) {
      const program = programs.find((p) => p.code.toLowerCase() === c.toLowerCase());
      if (!program) {
        missing.push(c);
        continue;
      }
      if (rows[program.id]) continue;
      payload.push({
        program_id: program.id,
        is_open: true,
        deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
        max_entries: Math.max(slotsFor(program), 1),
      });
    }
    if (payload.length > 0) {
      const { error } = await supabase
        .from("program_registration")
        .upsert(payload, { onConflict: "program_id" });
      if (error) toast.error(error.message);
    }
    setSaving("");
    if (missing.length > 0) toast.error(`Unknown code(s): ${missing.join(", ")}`);
    if (payload.length > 0) {
      toast.success(`${payload.length} programme(s) added to registration`);
      setBulk("");
      void load();
    }
  };

  const save = async (programId: string, patch: Partial<RegRow>) => {
    setSaving(programId);
    const current = rows[programId];
    const next: RegRow = {
      program_id: programId,
      is_open: patch.is_open ?? current?.is_open ?? true,
      deadline: patch.deadline !== undefined ? patch.deadline : (current?.deadline ?? null),
      max_entries: patch.max_entries ?? current?.max_entries ?? 1,
    };
    setRows((prev) => ({ ...prev, [programId]: next }));
    const { error } = await supabase
      .from("program_registration")
      .upsert(next, { onConflict: "program_id" });
    setSaving("");
    if (error) {
      toast.error(error.message);
      void load();
    } else {
      toast.success("Registration updated");
    }
  };

  const remove = async (programId: string) => {
    setSaving(programId);
    const { error } = await supabase
      .from("program_registration")
      .delete()
      .eq("program_id", programId);
    setSaving("");
    if (error) toast.error(error.message);
    else {
      toast.success("Removed from registration");
      void load();
    }
  };

  return (
    <div>
      <PageHeading title="Registration" />
      <p className="text-sm text-muted-foreground">
        Add the programmes that need registration by their programme code and fix a deadline for
        each one. Only the programmes listed here are shown to the teams.
      </p>

      <RegistrationWindowPanel />


      <div className="panel mt-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Programme code
            </label>
            <Input
              className="mt-1 h-9 w-40 font-mono"
              placeholder="e.g. A101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void add();
              }}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Deadline (optional)
            </label>
            <Input
              type="datetime-local"
              className="mt-1 h-9 w-56 text-xs"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
            />
          </div>
          <Button className="gap-1" disabled={saving === "add"} onClick={() => void add()}>
            <Plus className="size-4" /> Add programme
          </Button>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-border p-3">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Bulk add — paste programme codes separated by comma, space or new line
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Textarea
              className="min-h-[70px] flex-1 font-mono text-xs"
              placeholder="A101, A102&#10;B201 B202"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
            />
            <Button
              variant="secondary"
              className="gap-1 sm:self-end"
              disabled={saving === "bulk"}
              onClick={() => void addBulk()}
            >
              <Plus className="size-4" /> Bulk add
            </Button>
          </div>
        </div>

        {code.trim() && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
            {preview ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold">
                    {preview.code}
                  </span>
                  <span className="text-sm font-semibold">{preview.name}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{preview.type}</Badge>
                  <Badge variant="outline">{preview.category}</Badge>
                  <Badge variant="outline">{entryModeLabel(preview)}</Badge>
                  {preview.allowed_classes && (
                    <Badge variant="outline">class {preview.allowed_classes} only</Badge>
                  )}
                  <Badge variant="outline">{preview.status}</Badge>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No programme found with code “{code.trim()}”.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search added programme"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Open & closed</SelectItem>
            <SelectItem value="open">Registration open</SelectItem>
            <SelectItem value="closed">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading programmes…
        </p>
      )}

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Programme</th>
              <th className="px-2 py-2">Registration</th>
              <th className="px-2 py-2">Max entries</th>
              <th className="px-2 py-2">Deadline</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {listed.map(({ reg, program: p }) => {
              const past = reg.deadline ? new Date(reg.deadline) < new Date() : false;
              return (
                <tr key={p.id} className="align-top hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold">
                        {p.code}
                      </span>
                      <span className="text-sm font-semibold">{p.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{p.type}</Badge>
                      <Badge variant="outline">{p.category}</Badge>
                      <Badge variant="outline">{entryModeLabel(p)}</Badge>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={reg.is_open}
                        disabled={saving === p.id}
                        onCheckedChange={(v) => void save(p.id, { is_open: v })}
                      />
                      <span className="text-xs text-muted-foreground">
                        {reg.is_open ? (past ? "Open · deadline passed" : "Open") : "Paused"}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <Input
                      type="number"
                      min={1}
                      className="h-8 w-20 text-xs"
                      defaultValue={reg.max_entries ?? 1}
                      key={`max:${p.id}:${reg.max_entries}`}
                      onChange={(e) =>
                        void save(p.id, { max_entries: Math.max(Number(e.target.value) || 1, 1) })
                      }
                    />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="size-4 text-muted-foreground" />
                      <Input
                        type="datetime-local"
                        className="h-8 w-56 text-xs"
                        defaultValue={toLocalInput(reg.deadline)}
                        key={`${p.id}:${reg.deadline ?? ""}`}
                        onChange={(e) =>
                          void save(p.id, {
                            deadline: e.target.value ? new Date(e.target.value).toISOString() : null,
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      title="Remove from registration"
                      disabled={saving === p.id}
                      onClick={() => void remove(p.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!loading && listed.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                  No programmes added yet — add one by its code above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
