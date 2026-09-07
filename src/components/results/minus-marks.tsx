import { CheckCircle2, Loader2, MinusCircle, Save, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchPenalties, type Penalty } from "@/lib/penalties";
import { useRealtime } from "@/hooks/use-realtime";
import { supabase, type Team } from "@/lib/supabase";

/** Admin page: deduct points from a team with an optional remark. */
export function MinusMarksPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [rows, setRows] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState("");
  const [points, setPoints] = useState("");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: t }, list] = await Promise.all([
      supabase.from("teams").select("id,name,short_name").order("name"),
      fetchPenalties({ includeDrafts: true }),
    ]);
    setTeams((t as Team[]) ?? []);
    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(["team_penalties", "teams"], () => void load());

  const add = async () => {
    const value = Number(points);
    if (!teamId) {
      toast.error("Pick a team first");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter how many points to deduct");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("team_penalties").insert({
      team_id: teamId,
      points: value,
      remark: remark.trim() === "" ? null : remark.trim(),
      published: false,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved as draft — publish it to deduct the points");
    setPoints("");
    setRemark("");
    void load();
  };

  const setPublished = async (row: Penalty, published: boolean) => {
    setBusy(row.id);
    const { error } = await supabase
      .from("team_penalties")
      .update({ published, published_at: published ? new Date().toISOString() : null })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(published ? "Published — points deducted everywhere" : "Moved back to draft");
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("team_penalties").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Minus mark removed");
      void load();
    }
  };

  const drafts = rows.filter((r) => r.published !== true);
  const published = rows.filter((r) => r.published === true);
  const total = published.reduce((s, r) => s + (Number(r.points) || 0), 0);

  const list = (items: Penalty[], isDraft: boolean) => (
    <ul className="divide-y divide-border">
      {items.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{r.teams?.name ?? "—"}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {r.remark || "No remark"} · {new Date(r.created_at).toLocaleString()}
            </span>
          </span>
          <span className="text-lg font-semibold text-destructive">−{r.points}</span>
          {isDraft ? (
            <Button
              size="sm"
              className="gap-2"
              disabled={busy === r.id}
              onClick={() => void setPublished(r, true)}
            >
              {busy === r.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Publish
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={busy === r.id}
              onClick={() => void setPublished(r, false)}
            >
              <Undo2 className="size-4" />
              Unpublish
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            aria-label="Remove minus mark"
            onClick={() => void remove(r.id)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Minus marks</h2>
        <p className="text-sm text-muted-foreground">
          Save a deduction as a draft first. Nothing changes until you publish it — once published
          the points are deducted everywhere: admin, team and public results.
        </p>
      </div>

      <div className="panel space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            inputMode="numeric"
            placeholder="Minus points"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>
        <Input
          placeholder="Remark (optional)"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
        <Button onClick={() => void add()} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save draft
        </Button>
      </div>

      {loading ? (
        <div className="panel p-6 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <section className="panel overflow-hidden">
            <header className="flex items-center justify-between bg-muted/60 px-4 py-2">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide">
                Drafts
              </h3>
              <span className="text-xs text-muted-foreground">Not deducted yet</span>
            </header>
            {drafts.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No drafts.</p>
            ) : (
              list(drafts, true)
            )}
          </section>

          <section className="panel overflow-hidden">
            <header className="flex items-center justify-between bg-muted/60 px-4 py-2">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide">
                Published deductions
              </h3>
              <span className="text-xs text-muted-foreground">
                <MinusCircle className="mr-1 inline size-3" />
                {total} points in total
              </span>
            </header>
            {published.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No published minus marks yet.
              </p>
            ) : (
              list(published, false)
            )}
          </section>
        </>
      )}
    </div>
  );
}
