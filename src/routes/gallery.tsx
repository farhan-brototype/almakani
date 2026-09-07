import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Images, Loader2, Pencil, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ManageTabs } from "@/components/ManageTabs";
import { PublicShell } from "@/components/PublicShell";
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
import { Progress } from "@/components/ui/progress";
import { FEST } from "@/config";
import { useAppSession } from "@/hooks/use-session";
import { formatBytes, useSiteSettings, type GalleryRow } from "@/lib/site";
import { deletePublicFile, uploadPublicFile } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: `Gallery — ${FEST.name}` },
      { name: "description", content: `Photos from ${FEST.name} at ${FEST.college}.` },
      { property: "og:title", content: `Gallery — ${FEST.name}` },
      { property: "og:description", content: `Photos from ${FEST.name}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GalleryPage,
});

type Editing = {
  row: GalleryRow | null;
  title: string;
  desktop: File | null;
  mobile: File | null;
};

const emptyEdit: Editing = { row: null, title: "", desktop: null, mobile: null };

function GalleryPage() {
  const { role } = useAppSession();
  const { settings } = useSiteSettings();
  const isAdmin = role === "admin";
  const [tab, setTab] = useState<string>("overview");
  const manage = isAdmin && tab === "manage";
  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<GalleryRow | null>(null);
  const [edit, setEdit] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [sizes, setSizes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from("gallery")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setRows((data as GalleryRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`gallery-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const save = async (): Promise<void> => {
    if (!edit) return;
    if (!edit.row && !edit.desktop) {
      toast.error("Choose the laptop-view photo");
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { title: edit.title || null };
      if (edit.desktop) payload["image_url"] = await uploadPublicFile("fest-gallery", edit.desktop);
      if (edit.mobile)
        payload["mobile_image_url"] = await uploadPublicFile("fest-gallery", edit.mobile);
      if (!edit.row) payload["sort_order"] = rows.length;
      const { error } = edit.row
        ? await supabase.from("gallery").update(payload).eq("id", edit.row.id)
        : await supabase.from("gallery").insert(payload);
      if (error) throw new Error(error.message);
      toast.success("Photo saved");
      setEdit(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  /** Quick multi-upload — one row per chosen file, appended at the end. */
  const bulkUpload = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    let failed = 0;
    for (let i = 0; i < list.length; i += 1) {
      const f = list[i]!;
      try {
        const url = await uploadPublicFile("fest-gallery", f);
        const { error } = await supabase
          .from("gallery")
          .insert({ image_url: url, title: f.name.replace(/\.[^.]+$/, ""), sort_order: rows.length + i });
        if (error) throw new Error(error.message);
      } catch {
        failed += 1;
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    toast[failed ? "warning" : "success"](
      failed ? `${list.length - failed} uploaded, ${failed} failed` : `${list.length} photos added`,
    );
    void load();
  };

  const move = async (index: number, direction: -1 | 1): Promise<void> => {
    const next = index + direction;
    if (next < 0 || next >= rows.length) return;
    const reordered = [...rows];
    const a = reordered[index]!;
    reordered[index] = reordered[next]!;
    reordered[next] = a;
    setRows(reordered);
    await Promise.all(
      reordered.map((r, i) => supabase.from("gallery").update({ sort_order: i }).eq("id", r.id)),
    );
    void load();
  };

  const remove = async (row: GalleryRow) => {
    if (!window.confirm("Delete this photo?")) return;
    await supabase.from("gallery").delete().eq("id", row.id);
    await deletePublicFile("fest-gallery", row.image_url);
    if (row.mobile_image_url) await deletePublicFile("fest-gallery", row.mobile_image_url);
    void load();
  };

  return (
    <PublicShell title="Gallery" subtitle="Moments captured across the festival.">
      {settings.gallery_link && (
        <div className="mx-auto flex max-w-5xl justify-center px-4 pt-6">
          <Button asChild className="gap-2 rounded-full">
            <a href={settings.gallery_link} target="_blank" rel="noreferrer">
              <Images className="size-4" /> All Photos
            </a>
          </Button>
        </div>
      )}

      {isAdmin && (
        <ManageTabs
          tabs={[{ id: "overview", label: "Overview" }, { id: "manage", label: "Pics" }]}
          value={tab}
          onChange={setTab}
        />
      )}


      {manage && (
        <section className="mx-auto max-w-5xl px-4 pt-6">
          <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Button className="gap-2" onClick={() => setEdit({ ...emptyEdit })}>
              <Upload className="size-4" /> Add photo (laptop + mobile)
            </Button>
            <Label className="flex-1 text-xs text-muted-foreground">
              Or drop several at once
              <Input
                type="file"
                accept="image/*"
                multiple
                className="mt-1"
                onChange={(e) => void bulkUpload(e.target.files)}
              />
            </Label>
            {progress && (
              <div className="w-40">
                <Progress value={(progress.done / progress.total) * 100} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {progress.done}/{progress.total}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Full-bleed, gap-free photo stack at 100vw */}
      <section className="py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="panel mx-4 flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <Images className="size-6" /> No photos yet.
          </p>
        ) : (
          <div className="flex w-screen max-w-[100vw] flex-col">
            {rows.map((r, i) => (
              <figure key={r.id} className="group relative m-0 block w-full leading-[0]">
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => setLightbox(r)}
                  aria-label={r.title ?? "Open photo"}
                >
                  <picture>
                    {r.mobile_image_url && (
                      <source media="(max-width: 640px)" srcSet={r.mobile_image_url} />
                    )}
                    <img
                      src={r.image_url}
                      alt={r.title ?? "Fest photo"}
                      loading="lazy"
                      className="block w-full"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        const dims = `${img.naturalWidth}×${img.naturalHeight}`;
                        setSizes((s) => (s[r.id] === dims ? s : { ...s, [r.id]: dims }));
                      }}
                    />
                  </picture>
                </button>
                {manage && (
                  <div className="absolute right-3 top-3 flex gap-2 leading-none opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                      {sizes[r.id] ?? "…"} px
                    </span>
                    <Button size="icon" variant="secondary" className="size-8" onClick={() => void move(i, -1)} aria-label="Move up">
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="size-8" onClick={() => void move(i, 1)} aria-label="Move down">
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="size-8"
                      onClick={() => setEdit({ row: r, title: r.title ?? "", desktop: null, mobile: null })}
                      aria-label="Edit photo"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="size-8" onClick={() => void remove(r)} aria-label="Delete photo">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <Button size="icon" variant="secondary" className="absolute right-4 top-4" aria-label="Close">
            <X className="size-4" />
          </Button>
          <img
            src={lightbox.image_url}
            alt={lightbox.title ?? "Fest photo"}
            className="max-h-[85vh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}

      <Dialog open={Boolean(edit)} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.row ? "Edit photo" : "Add photo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title (optional)</Label>
              <Input
                value={edit?.title ?? ""}
                onChange={(e) => setEdit((s) => (s ? { ...s, title: e.target.value } : s))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Laptop / desktop image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setEdit((s) => (s ? { ...s, desktop: e.target.files?.[0] ?? null } : s))
                }
              />
              {edit?.desktop && (
                <p className="text-xs text-muted-foreground">{formatBytes(edit.desktop.size)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Mobile image (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setEdit((s) => (s ? { ...s, mobile: e.target.files?.[0] ?? null } : s))
                }
              />
              {edit?.mobile && (
                <p className="text-xs text-muted-foreground">{formatBytes(edit.mobile.size)}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void save()} disabled={busy} className="gap-2">
              {busy && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicShell>
  );
}
