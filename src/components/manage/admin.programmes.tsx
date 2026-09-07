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
  DialogTrigger,
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
import { chunkedWrite, pick } from "@/lib/sheet";
import {
  CATEGORIES,
  ENTRY_MODES,
  PROGRAM_TYPES,
  STATUSES,
  entryModeLabel,
  slotsFor,
  supabase,
  type EntryMode,
  type Program,
} from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";
import { useTaxonomy } from "@/lib/taxonomy";


const empty: Partial<Program> = {
  code: "",
  name: "",
  type: "Stage",
  category: "Aliya",
  candidates: 1,
  status: "upcoming",
  allowed_classes: null,
  entry_mode: "individual",
  group_count: 1,
  group_size: 1,
};

const MODE_LABEL: Record<EntryMode, string> = {
  individual: "Individual candidates",
  group: "Groups of candidates",
  team: "Team entry (no candidates)",
};

export function ProgrammesPage() {
  const { categories, types } = useTaxonomy();
  const [rows, setRows] = useState<Program[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Partial<Program> | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("programs").select("*").order("code");
    if (error) toast.error(error.message);
    setRows((data as Program[]) ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  useRealtime(["programs"], () => void load());

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (q && !`${r.code} ${r.name}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (type !== "all" && r.type !== type) return false;
        if (category !== "all" && r.category !== category) return false;
        return true;
      }),
    [rows, q, type, category],
  );

  const save = async (): Promise<void> => {
    if (!editing?.code || !editing.name) {
      toast.error("Code and name are required");
      return;
    }
    const entry_mode: EntryMode = editing.entry_mode ?? "individual";
    const group_count = Math.max(1, Number(editing.group_count) || 1);
    const group_size = Math.max(1, Number(editing.group_size) || 1);
    const payload = {
      code: editing.code.trim(),
      name: editing.name.trim(),
      type: editing.type,
      category: editing.category,
      // Group programmes store the total candidate slots so every screen
      // (registration, assigning, judgement) agrees on how many entries fit.
      candidates: slotsFor({
        candidates: Number(editing.candidates) || 1,
        entry_mode,
        group_count,
        group_size,
      }),
      entry_mode,
      group_count,
      group_size,
      status: editing.status ?? "upcoming",
      allowed_classes: editing.allowed_classes || null,
    };
    const { error } = editing.id
      ? await supabase.from("programs").update(payload).eq("id", editing.id)
      : await supabase.from("programs").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    setOpen(false);
    setEditing(null);
    void load();
  };

  const remove = async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} programme(s)? This cannot be undone.`)) return;
    const { error } = await supabase.from("programs").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelected([]);
    toast.success("Deleted");
    void load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageHeading title="Programmes" />
          <p className="text-sm text-muted-foreground">{rows.length} programmes registered</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkImport
            templateName="programmes"
            templateRow={{
              Code: "A01",
              Name: "Speech",
              Type: "Stage",
              Category: "Aliya",
              Candidates: 2,
              EntryMode: "individual",
              Groups: 1,
              GroupSize: 1,
              Status: "upcoming",
              AllowedClass: "",
            }}
            onRows={async (sheet, onProgress) => {
              const failed: string[] = [];
              const payload = sheet.flatMap((r, index) => {
                const code = pick(r, "code", "programcode", "programmecode");
                const name = pick(
                  r,
                  "name",
                  "programname",
                  "programmename",
                  "program",
                  "programme",
                );
                if (!code || !name) {
                  failed.push(`row ${index + 1}: missing programme code or name`);
                  return [];
                }

                const rawType = pick(r, "type").toLowerCase();
                const type =
                  PROGRAM_TYPES.find((t) => t.toLowerCase() === rawType) ??
                  (rawType.includes("sport")
                    ? "Sports"
                    : rawType.includes("non")
                      ? "Non-stage"
                      : rawType.includes("group")
                        ? "Group"
                        : "Stage");
                const rawCat = pick(r, "category").toLowerCase().replace(/^kulliy+a$/i, "kulliyya").replace(/^general$/i, "kulliyya");
                const category = CATEGORIES.find((c) => c.toLowerCase() === rawCat) ?? "Kulliyya";
                const rawMode = pick(r, "entrymode", "mode", "entry").toLowerCase();
                const entry_mode = (ENTRY_MODES.find((m) => m === rawMode) ??
                  (rawMode.includes("team")
                    ? "team"
                    : rawMode.includes("group")
                      ? "group"
                      : "individual")) as EntryMode;
                const gc = Math.max(1, Number(pick(r, "groups", "groupcount")) || 1);
                const gs = Math.max(1, Number(pick(r, "groupsize", "percandidates")) || 1);
                return [
                  {
                    code,
                    name,
                    type,
                    category,
                    entry_mode,
                    group_count: gc,
                    group_size: gs,
                    candidates: slotsFor({
                      candidates: Number(pick(r, "candidates", "numberofcandidates")) || 1,
                      entry_mode,
                      group_count: gc,
                      group_size: gs,
                    }),
                    status: pick(r, "status") || "upcoming",
                    allowed_classes: pick(r, "allowedclass", "allowedclasses") || null,
                  },
                ];
              });
              const result = await chunkedWrite(
                payload,
                (batch) => supabase.from("programs").upsert(batch, { onConflict: "code" }),
                onProgress,
              );
              await load();
              return { ok: result.ok, failed: [...failed, ...result.failed] };
            }}
          />
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={() => setEditing({ ...empty })}>
                <Plus className="size-4" /> Add programme
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing?.id ? "Edit programme" : "New programme"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Programme code</Label>
                  <Input
                    value={editing?.code ?? ""}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Programme name</Label>
                  <Input
                    value={editing?.name ?? ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={editing?.type ?? "Stage"}
                    onValueChange={(v) => setEditing({ ...editing, type: v as Program["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={editing?.category ?? "Aliya"}
                    onValueChange={(v) =>
                      setEditing({ ...editing, category: v as Program["category"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Entry mode</Label>
                  <Select
                    value={editing?.entry_mode ?? "individual"}
                    onValueChange={(v) =>
                      setEditing({ ...editing, entry_mode: v as EntryMode })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTRY_MODES.map((m) => (
                        <SelectItem key={m} value={m}>
                          {MODE_LABEL[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(editing?.entry_mode ?? "individual") === "individual" && (
                  <div className="space-y-1.5">
                    <Label>Number of candidates</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editing?.candidates ?? 1}
                      onChange={(e) =>
                        setEditing({ ...editing, candidates: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
                {editing?.entry_mode === "group" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Number of groups</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editing?.group_count ?? 1}
                        onChange={(e) =>
                          setEditing({ ...editing, group_count: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Candidates per group</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editing?.group_size ?? 1}
                        onChange={(e) =>
                          setEditing({ ...editing, group_size: Number(e.target.value) })
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Teams will fill {slotsFor({
                        candidates: editing?.candidates ?? 1,
                        entry_mode: "group",
                        group_count: editing?.group_count ?? 1,
                        group_size: editing?.group_size ?? 1,
                      })}{" "}
                      candidate slots — {entryModeLabel({
                        entry_mode: "group",
                        group_count: editing?.group_count ?? 1,
                        group_size: editing?.group_size ?? 1,
                        candidates: editing?.candidates ?? 1,
                      })}.
                    </p>
                  </>
                )}
                {editing?.entry_mode === "team" && (
                  <p className="self-end text-xs text-muted-foreground">
                    Teams enter as a whole — no candidate Ad.No is required.
                  </p>
                )}
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={editing?.status ?? "upcoming"}
                    onValueChange={(v) => setEditing({ ...editing, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Restrict to class (optional — e.g. 1 for Uoola class 1 only)</Label>
                  <Input
                    value={editing?.allowed_classes ?? ""}
                    onChange={(e) => setEditing({ ...editing, allowed_classes: e.target.value })}
                    placeholder="Leave empty for the whole category"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={save}>Save programme</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search code or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40">
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
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Category</th>
              <th className="p-3">Entry</th>
              <th className="p-3">Class</th>
              <th className="p-3">Status</th>
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
                <td className="p-3 font-mono">{r.code}</td>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{r.type}</td>
                <td className="p-3">{r.category}</td>
                <td className="p-3 text-xs">{entryModeLabel(r)}</td>
                <td className="p-3">{r.allowed_classes ?? "—"}</td>
                <td className="p-3">
                  <Badge variant={r.status === "completed" ? "default" : "secondary"}>
                    {r.status}
                  </Badge>
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(r);
                      setOpen(true);
                    }}
                  >
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
                <td colSpan={9} className="p-8 text-center text-muted-foreground">
                  No programmes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
