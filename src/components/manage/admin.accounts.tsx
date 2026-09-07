import { KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRealtime } from "@/hooks/use-realtime";
import { isHexColor, supabase, TEAM_COLORS } from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";
import { cn } from "@/lib/utils";

type TeamRow = {
  id: string;
  name: string;
  username: string;
  short_name: string | null;
  color: string | null;
};

export function AccountsPage() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<(Partial<TeamRow> & { password?: string }) | null>(null);

  /** Colours already taken by other teams — one colour, one team. */
  const takenColors = new Set(
    rows
      .filter((r) => r.id !== editing?.id)
      .map((r) => (r.color ?? "").toLowerCase())
      .filter(Boolean),
  );

  const load = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("id,name,username,short_name,color")
      .order("name");
    if (error) {
      // colour column not migrated yet — fall back so the page still works
      const { data: base } = await supabase
        .from("teams")
        .select("id,name,username,short_name")
        .order("name");
      setRows(((base as TeamRow[]) ?? []).map((r) => ({ ...r, color: null })));
      setLoading(false);
      return;
    }
    setRows((data as TeamRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);

  useRealtime(["teams"], () => void load());

  const save = async (): Promise<void> => {
    if (!editing?.name?.trim() || !editing.username?.trim()) {
      toast.error("Team name and username are required");
      return;
    }
    if (!editing.id && !editing.password) {
      toast.error("Set a password for the new team");
      return;
    }
    const color = (editing.color ?? "").trim();
    if (color && !isHexColor(color)) {
      toast.error("Colour must be a hex code like #DC2626");
      return;
    }
    if (color && takenColors.has(color.toLowerCase())) {
      toast.error("That colour is already used by another team");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: editing.name.trim(),
      username: editing.username.trim(),
      short_name: editing.short_name?.trim() || null,
      color: color ? color.toUpperCase() : null,
    };
    if (editing.password) {
      const { data: hash, error: hashError } = await supabase.rpc("hash_password", {
        p_password: editing.password,
      });
      if (hashError) {
        setSaving(false);
        toast.error(hashError.message);
        return;
      }
      payload["password_hash"] = hash;
    }
    const { error } = editing.id
      ? await supabase.from("teams").update(payload).eq("id", editing.id)
      : await supabase.from("teams").insert(payload);
    setSaving(false);
    if (error) {
      if (error.message.includes("teams_name_key")) {
        toast.error(`A team named "${String(payload["name"])}" already exists`);
        void load();
      } else if (error.message.includes("teams_username_key")) {
        toast.error(`The username "${String(payload["username"])}" is already taken`);
        void load();
      } else if (error.message.includes("teams_color_key")) {
        toast.error("That colour is already used by another team");
        void load();
      } else if (error.message.includes("teams.color") || error.message.includes("teams_color_hex_chk")) {
        toast.error("Run supabase/team-colours.sql once to enable team colours");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Team account saved");
    setEditing(null);
    void load();
  };

  const remove = async (id: string): Promise<void> => {
    if (!window.confirm("Delete this team account? Its students will be unlinked.")) return;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void load();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <PageHeading title="Team Accounts" />
          <p className="text-sm text-muted-foreground">
            Login credentials and the short name used on judgement sheets.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setEditing({ name: "", username: "" })}>
          <Plus className="size-4" /> New team
        </Button>
      </div>

      <div className="panel mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Team</th>
              <th className="p-3">Short name</th>
              <th className="p-3">Colour</th>
              <th className="p-3">Username</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{r.short_name ?? "—"}</td>
                <td className="p-3">
                  {r.color ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block size-4 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: r.color }}
                      />
                      <span className="font-mono text-xs uppercase">
                        {TEAM_COLORS.find((c) => c.hex.toLowerCase() === r.color?.toLowerCase())
                          ?.name ?? r.color}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 font-mono">{r.username}</td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Reset password"
                    onClick={() => setEditing({ ...r, password: "" })}
                  >
                    <KeyRound className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No team accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit team account" : "New team account"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Team name</Label>
              <Input
                value={editing?.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Short name of team</Label>
              <Input
                placeholder="e.g. A"
                value={editing?.short_name ?? ""}
                onChange={(e) => setEditing({ ...editing, short_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                value={editing?.username ?? ""}
                onChange={(e) => setEditing({ ...editing, username: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{editing?.id ? "New password (blank = keep)" : "Password"}</Label>
              <Input
                type="text"
                value={editing?.password ?? ""}
                onChange={(e) => setEditing({ ...editing, password: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Team colour</Label>
              <div className="flex flex-wrap items-center gap-2">
                {TEAM_COLORS.map((c) => {
                  const taken = takenColors.has(c.hex.toLowerCase());
                  const active = (editing?.color ?? "").toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      disabled={taken}
                      title={taken ? `${c.name} is already used by another team` : c.name}
                      onClick={() => setEditing({ ...editing, color: c.hex })}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        active ? "border-primary ring-2 ring-primary/40" : "border-border",
                        taken && "cursor-not-allowed opacity-40",
                      )}
                    >
                      <span
                        className="inline-block size-3.5 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.name}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, color: null })}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  None
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pick a custom colour"
                  value={isHexColor(editing?.color ?? "") ? (editing?.color as string) : "#000000"}
                  onChange={(e) => setEditing({ ...editing, color: e.target.value.toUpperCase() })}
                  className="size-9 cursor-pointer rounded border border-border bg-transparent p-1"
                />
                <Input
                  className="max-w-[180px] font-mono uppercase"
                  placeholder="#RRGGBB"
                  value={editing?.color ?? ""}
                  onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                />
                {editing?.color && takenColors.has(editing.color.toLowerCase()) ? (
                  <span className="text-xs text-destructive">Already used by another team</span>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />} Save account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
