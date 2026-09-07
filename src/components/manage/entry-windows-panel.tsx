import { CalendarClock, Loader2, Plus, Shuffle, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRealtime } from "@/hooks/use-realtime";
import {
  fetchEntryWindows,
  formatDeadline,
  fromLocalInput,
  isPast,
  toLocalInput,
  type EntryWindow,
  type EntryWindowProgram,
} from "@/lib/entry-windows";
import { normKey } from "@/lib/fest-rules";
import { supabase, type Program } from "@/lib/supabase";

type Props = {
  /** Items of the category (Stage, Non-stage, Sports, …). */
  itemNames: string[];
  programs: Program[];
};

/**
 * Entry windows: one row per item of the category plus any number of
 * named "random" groups holding hand-picked programme codes. Every row
 * carries its own date/time and on/off switch; a passed deadline closes
 * the window automatically until the admin switches it back on.
 */
export function EntryWindowsPanel({ itemNames, programs }: Props) {
  const [windows, setWindows] = useState<EntryWindow[]>([]);
  const [links, setLinks] = useState<EntryWindowProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [randomName, setRandomName] = useState("");
  const [randomDeadline, setRandomDeadline] = useState("");
  const [codeDraft, setCodeDraft] = useState<Record<string, string>>({});
  /** Re-render every minute so a passing deadline flips the row live. */
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const data = await fetchEntryWindows();
    setWindows(data.windows);
    setLinks(data.links);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(["entry_windows", "entry_window_programs"], load);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const byId = useMemo(() => {
    const m: Record<string, Program> = {};
    for (const p of programs) m[p.id] = p;
    return m;
  }, [programs]);

  const itemRows = useMemo(
    () =>
      itemNames.map((name) => ({
        name,
        row: windows.find((w) => w.kind === "item" && normKey(w.name) === normKey(name)) ?? null,
      })),
    [itemNames, windows],
  );

  const randoms = useMemo(
    () =>
      windows
        .filter((w) => w.kind === "random")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [windows],
  );

  const saveWindow = async (
    kind: "item" | "random",
    name: string,
    patch: Partial<EntryWindow>,
    existing: EntryWindow | null,
  ) => {
    setBusy(`${kind}:${name}`);
    const next = {
      kind,
      name,
      is_open: patch.is_open ?? existing?.is_open ?? true,
      deadline: patch.deadline !== undefined ? patch.deadline : (existing?.deadline ?? null),
      sort: existing?.sort ?? 0,
      updated_at: new Date().toISOString(),
    };
    // Switching a window back on after its deadline passed clears the old date,
    // otherwise it would close again immediately.
    if (patch.is_open === true && existing && isPast(existing) && patch.deadline === undefined)
      next.deadline = null;
    const { error } = await supabase
      .from("entry_windows")
      .upsert(next as unknown as object, { onConflict: "kind,name" });
    setBusy("");
    if (error) toast.error(error.message);
    else void load();
  };

  const addRandom = async () => {
    const name = randomName.trim();
    if (!name) {
      toast.error("Give the random group a name");
      return;
    }
    if (randoms.some((r) => normKey(r.name) === normKey(name))) {
      toast.info(`"${name}" already exists`);
      return;
    }
    setBusy("new-random");
    const { error } = await supabase.from("entry_windows").insert({
      kind: "random",
      name,
      deadline: fromLocalInput(randomDeadline),
      is_open: true,
    } as unknown as object);
    setBusy("");
    if (error) {
      toast.error(error.message);
      return;
    }
    setRandomName("");
    setRandomDeadline("");
    toast.success(`Random group "${name}" created`);
    void load();
  };

  const removeWindow = async (w: EntryWindow) => {
    if (!window.confirm(`Remove "${w.name}"?`)) return;
    setBusy(w.id);
    const { error } = await supabase.from("entry_windows").delete().eq("id", w.id);
    setBusy("");
    if (error) toast.error(error.message);
    else void load();
  };

  const addCode = async (w: EntryWindow) => {
    const raw = codeDraft[w.id] ?? "";
    const codes = raw
      .split(/[\s,;]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (codes.length === 0) return;
    const missing: string[] = [];
    const payload: EntryWindowProgram[] = [];
    for (const c of codes) {
      const p = programs.find((x) => x.code.toLowerCase() === c.toLowerCase());
      if (!p) {
        missing.push(c);
        continue;
      }
      if (links.some((l) => l.window_id === w.id && l.program_id === p.id)) continue;
      payload.push({ window_id: w.id, program_id: p.id });
    }
    if (payload.length > 0) {
      setBusy(w.id);
      const { error } = await supabase
        .from("entry_window_programs")
        .upsert(payload as unknown as object[], { onConflict: "window_id,program_id" });
      setBusy("");
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    if (missing.length > 0) toast.error(`Unknown code(s): ${missing.join(", ")}`);
    setCodeDraft((prev) => ({ ...prev, [w.id]: "" }));
    void load();
  };

  const removeCode = async (windowId: string, programId: string) => {
    const { error } = await supabase
      .from("entry_window_programs")
      .delete()
      .eq("window_id", windowId)
      .eq("program_id", programId);
    if (error) toast.error(error.message);
    else void load();
  };

  const stateBadge = (row: EntryWindow | null) => {
    if (!row) return <Badge variant="outline">Not set · open</Badge>;
    if (isPast(row)) return <Badge variant="destructive">Closed · deadline passed</Badge>;
    return row.is_open ? (
      <Badge className="bg-primary/15 text-primary">Open</Badge>
    ) : (
      <Badge variant="secondary">Paused</Badge>
    );
  };

  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading entry windows…
      </p>
    );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Entry window per item</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Each item of the category gets its own deadline and switch. When the deadline passes the
          entry closes by itself — switch it back on to reopen (the old date is cleared).
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3">Entry allowed</th>
                <th className="p-3">Deadline</th>
                <th className="p-3">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itemRows.map(({ name, row }) => (
                <tr key={name}>
                  <td className="p-3 font-medium">{name}</td>
                  <td className="p-3">
                    <Switch
                      checked={row ? row.is_open && !isPast(row) : true}
                      disabled={busy === `item:${name}`}
                      onCheckedChange={(v) => void saveWindow("item", name, { is_open: v }, row)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="size-4 text-muted-foreground" />
                      <Input
                        type="datetime-local"
                        className="h-8 w-56 text-xs"
                        key={`item:${name}:${row?.deadline ?? ""}`}
                        defaultValue={toLocalInput(row?.deadline ?? null)}
                        onChange={(e) =>
                          void saveWindow(
                            "item",
                            name,
                            { deadline: fromLocalInput(e.target.value) },
                            row,
                          )
                        }
                      />
                    </div>
                  </td>
                  <td className="p-3">{stateBadge(row)}</td>
                </tr>
              ))}
              {itemRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    Add items of the category first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Shuffle className="size-4 text-primary" /> Random groups
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick programmes by code and give them their own date and switch. Create as many named
          groups as you need — a programme inside a random group follows that group instead of its
          item.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5">
            <Label>Group name</Label>
            <Input
              value={randomName}
              placeholder="e.g. Late entries"
              onChange={(e) => setRandomName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deadline (optional)</Label>
            <Input
              type="datetime-local"
              className="w-56 text-xs"
              value={randomDeadline}
              onChange={(e) => setRandomDeadline(e.target.value)}
            />
          </div>
          <Button
            className="gap-2"
            disabled={busy === "new-random"}
            onClick={() => void addRandom()}
          >
            <Plus className="size-4" /> Add random
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {randoms.map((w) => {
            const picked = links
              .filter((l) => l.window_id === w.id)
              .map((l) => byId[l.program_id])
              .filter((p): p is Program => Boolean(p))
              .sort((a, b) => a.code.localeCompare(b.code));
            return (
              <div key={w.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold">{w.name}</span>
                  {stateBadge(w)}
                  <span className="text-xs text-muted-foreground">{formatDeadline(w.deadline)}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <Switch
                      checked={w.is_open && !isPast(w)}
                      disabled={busy === `random:${w.name}`}
                      onCheckedChange={(v) => void saveWindow("random", w.name, { is_open: v }, w)}
                    />
                    <Input
                      type="datetime-local"
                      className="h-8 w-56 text-xs"
                      key={`random:${w.id}:${w.deadline ?? ""}`}
                      defaultValue={toLocalInput(w.deadline)}
                      onChange={(e) =>
                        void saveWindow(
                          "random",
                          w.name,
                          { deadline: fromLocalInput(e.target.value) },
                          w,
                        )
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Remove group"
                      disabled={busy === w.id}
                      onClick={() => void removeWindow(w)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {picked.map((p) => (
                    <span
                      key={p.id}
                      className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                    >
                      <span className="font-mono font-semibold">{p.code}</span>
                      <span className="text-muted-foreground">{p.name}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => void removeCode(w.id, p.id)}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  {picked.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No programmes picked yet.
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Input
                    className="h-8 w-56 font-mono text-xs"
                    placeholder="A101, A102"
                    value={codeDraft[w.id] ?? ""}
                    onChange={(e) => setCodeDraft((prev) => ({ ...prev, [w.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void addCode(w);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    disabled={busy === w.id}
                    onClick={() => void addCode(w)}
                  >
                    <Plus className="size-4" /> Add codes
                  </Button>
                </div>
              </div>
            );
          })}
          {randoms.length === 0 && (
            <p className="text-xs text-muted-foreground">No random groups yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
