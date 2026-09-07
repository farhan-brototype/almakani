import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useRealtime } from "@/hooks/use-realtime";
import { supabase, type Announcement } from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";


export function AnnouncementsPage() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Partial<Announcement> | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data as Announcement[]) ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  useRealtime(["announcements"], () => void load());

  const save = async (): Promise<void> => {
    if (!editing?.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    const payload = { title: editing.title.trim(), body: editing.body ?? null };
    const { error } = editing.id
      ? await supabase.from("announcements").update(payload).eq("id", editing.id)
      : await supabase.from("announcements").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Announcement saved");
    setEditing(null);
    void load();
  };

  const remove = async (id: string): Promise<void> => {
    if (!window.confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
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
          <PageHeading title="Announcements" />
          <p className="text-sm text-muted-foreground">
            Shown publicly and inside every team panel.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setEditing({ title: "", body: "" })}>
          <Plus className="size-4" /> New announcement
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <article key={r.id} className="panel flex items-start gap-3 p-4">
            <div className="flex-1">
              <h2 className="font-display text-base font-semibold">{r.title}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </article>
        ))}
        {rows.length === 0 && (
          <p className="panel p-8 text-center text-muted-foreground">No announcements yet.</p>
        )}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit announcement" : "New announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={editing?.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                rows={5}
                value={editing?.body ?? ""}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
