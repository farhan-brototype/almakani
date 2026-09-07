import { CalendarClock, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRealtime } from "@/hooks/use-realtime";
import { formatDeadline, fromLocalInput, toLocalInput } from "@/lib/entry-windows";
import { refreshSiteSettings } from "@/lib/site";
import { supabase } from "@/lib/supabase";

type Row = {
  reg_start: string | null;
  reg_deadline: string | null;
  reg_is_open: boolean;
  /** Armed times only. When off, the time is a note and nothing happens by itself. */
  reg_use_start: boolean;
  reg_use_deadline: boolean;
};

const EMPTY: Row = {
  reg_start: null,
  reg_deadline: null,
  reg_is_open: true,
  reg_use_start: false,
  reg_use_deadline: false,
};

/** True when the universal window currently allows registration. */
export function universalOpen(row: Row, now: Date = new Date()): boolean {
  if (!row.reg_is_open) return false;
  if (row.reg_use_start && row.reg_start && new Date(row.reg_start) > now) return false;
  if (row.reg_use_deadline && row.reg_deadline && new Date(row.reg_deadline) < now) return false;
  return true;
}


/**
 * One master start time, closing time and switch for the whole fest.
 * Per-programme deadlines still apply on top — they can close a
 * programme earlier but never open it outside this window.
 */
export function RegistrationWindowPanel() {
  const [row, setRow] = useState<Row>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("fest_settings")
      .select("reg_start, reg_deadline, reg_is_open, reg_use_start, reg_use_deadline")
      .eq("id", 1)
      .maybeSingle();
    if (error) setMissing(true);
    else setRow({ ...EMPTY, ...((data as Partial<Row> | null) ?? {}) });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(["fest_settings"], load);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const save = async (patch: Partial<Row>) => {
    const next: Row = { ...row, ...patch };
    // Re-opening after an armed closing time already passed clears that time,
    // otherwise registration would close again immediately.
    if (
      patch.reg_is_open === true &&
      row.reg_use_deadline &&
      row.reg_deadline &&
      new Date(row.reg_deadline) < new Date() &&
      patch.reg_deadline === undefined
    )
      next.reg_deadline = null;

    setRow(next);
    setSaving(true);
    const { error } = await supabase.from("fest_settings").update(next).eq("id", 1);
    setSaving(false);
    if (error) {
      setMissing(true);
      toast.error(error.message);
      void load();
    } else {
      toast.success("Registration window updated");
      void refreshSiteSettings();
    }
  };

  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading registration window…
      </p>
    );

  const open = universalOpen(row);
  const notYet = Boolean(
    row.reg_use_start && row.reg_start && new Date(row.reg_start) > new Date(),
  );
  const passed = Boolean(
    row.reg_use_deadline && row.reg_deadline && new Date(row.reg_deadline) < new Date(),
  );

  return (
    <div className="panel mt-5 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-base font-semibold">Registration window (all programmes)</h2>
        {open ? (
          <Badge className="bg-primary/15 text-primary">Open now</Badge>
        ) : passed ? (
          <Badge variant="destructive">Closed · deadline passed</Badge>
        ) : notYet ? (
          <Badge variant="secondary">Not started yet</Badge>
        ) : (
          <Badge variant="secondary">Paused</Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Registration allowed</span>
          <Switch
            checked={row.reg_is_open && !passed}
            disabled={saving || missing}
            onCheckedChange={(v) => void save({ reg_is_open: v })}
          />
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Registration never opens or closes on its own. The master switch above decides everything.
        Use the two small switches below if you want the opening time or the closing time to act
        automatically — when a switch is off, that time is only a note.
      </p>


      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Registration opens</Label>
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <Input
              type="datetime-local"
              className="h-9 w-56 text-xs"
              disabled={missing}
              key={`start:${row.reg_start ?? ""}`}
              defaultValue={toLocalInput(row.reg_start)}
              onChange={(e) => void save({ reg_start: fromLocalInput(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={row.reg_use_start}
              disabled={saving || missing}
              onCheckedChange={(v) => void save({ reg_use_start: v })}
            />
            <span className="text-xs text-muted-foreground">Use this opening time</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Registration closes</Label>
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <Input
              type="datetime-local"
              className="h-9 w-56 text-xs"
              disabled={missing}
              key={`end:${row.reg_deadline ?? ""}`}
              defaultValue={toLocalInput(row.reg_deadline)}
              onChange={(e) => void save({ reg_deadline: fromLocalInput(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={row.reg_use_deadline}
              disabled={saving || missing}
              onCheckedChange={(v) => void save({ reg_use_deadline: v })}
            />
            <span className="text-xs text-muted-foreground">Use this closing time</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {row.reg_use_start && row.reg_start
            ? `Opens ${formatDeadline(row.reg_start)}`
            : "Opening time not in use"}{" "}
          ·{" "}
          {row.reg_use_deadline && row.reg_deadline
            ? `Closes ${formatDeadline(row.reg_deadline)}`
            : "Closing time not in use"}
        </p>
      </div>

      {missing && (
        <p className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          Run <span className="font-mono">supabase/schedule-judges.sql</span> in the SQL editor to
          enable the universal registration window switches.
        </p>
      )}


    </div>
  );
}
