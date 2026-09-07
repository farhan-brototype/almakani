import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { FEST } from "@/config";
import { useAppSession } from "@/hooks/use-session";
import { formatBytes, type DocumentRow } from "@/lib/site";
import { deletePublicFile, uploadPublicFile } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: `Documents — ${FEST.name}` },
      {
        name: "description",
        content: `Download the bylaw, circulars, forms and other official files of ${FEST.name}.`,
      },
      { property: "og:title", content: `Documents — ${FEST.name}` },
      { property: "og:description", content: `Official files and bylaw of ${FEST.name}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsPage,
});

/** Short, human label for the file kind — "PDF", "DOCX", "IMAGE"… */
function kindOf(row: DocumentRow): string {
  const fromName = (row.file_name ?? row.file_url).split("?")[0]!.split(".").pop() ?? "";
  if (fromName && fromName.length <= 5) return fromName.toUpperCase();
  const type = row.file_type ?? "";
  if (type.includes("pdf")) return "PDF";
  if (type.startsWith("image/")) return "IMAGE";
  return "FILE";
}

function DocumentsPage() {
  const { role } = useAppSession();
  const isAdmin = role === "admin";
  const [tab, setTab] = useState<string>("overview");
  const manage = isAdmin && tab === "manage";
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<DocumentRow> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setRows((data as DocumentRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`documents-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        !needle ||
        r.title.toLowerCase().includes(needle) ||
        (r.remarks ?? "").toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const save = async (): Promise<void> => {
    if (!editing?.title?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editing.id && !file) {
      toast.error("Choose a file to upload");
      return;
    }
    setBusy(true);
    try {
      let payload: Record<string, unknown> = {
        title: editing.title.trim(),
        remarks: editing.remarks ?? null,
      };
      if (!editing.id) payload["sort_order"] = rows.length;
      if (file) {
        const url = await uploadPublicFile("fest-documents", file);
        payload = {
          ...payload,
          file_url: url,
          file_name: file.name,
          file_type: file.type || file.name.split(".").pop(),
          file_size: file.size,
        };
      }
      const { error } = editing.id
        ? await supabase.from("documents").update(payload).eq("id", editing.id)
        : await supabase.from("documents").insert(payload);
      if (error) throw new Error(error.message);
      toast.success("Document saved");
      setEditing(null);
      setFile(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  /** Swap the display order of a document with its neighbour. */
  const move = async (index: number, direction: -1 | 1): Promise<void> => {
    const next = index + direction;
    if (next < 0 || next >= rows.length) return;
    const a = rows[index]!;
    const b = rows[next]!;
    const reordered = [...rows];
    reordered[index] = b;
    reordered[next] = a;
    setRows(reordered);
    await Promise.all(
      reordered.map((r, i) => supabase.from("documents").update({ sort_order: i }).eq("id", r.id)),
    );
    void load();
  };

  const remove = async (row: DocumentRow): Promise<void> => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    const { error } = await supabase.from("documents").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await deletePublicFile("fest-documents", row.file_url);
    void load();
  };

  return (
    <PublicShell
      title="Documents"
      subtitle="Read online or download the official files of the fest."
    >
      {isAdmin && (
        <ManageTabs
          tabs={[{ id: "overview", label: "Overview" }, { id: "manage", label: "Documents" }]}
          value={tab}
          onChange={setTab}
        />
      )}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search documents…"
              className="pl-9"
            />
          </div>
          {manage && (
            <Button
              className="gap-2"
              onClick={() => {
                setFile(null);
                setEditing({ title: "", remarks: "" });
              }}
            >
              <Plus className="size-4" /> Add document
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="panel mt-5 p-10 text-center text-muted-foreground">No documents found.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((r, i) => (
<article
                key={r.id}
                className="group animate-pop flex flex-col overflow-hidden rounded-xl border border-border bg-card"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                {/* Rectangular file plate with the format written on it */}
<div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent transition-colors duration-300 group-hover:from-primary/25 group-hover:via-primary/10">
                  {/* Shine sweep — runs across the plate on hover */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[150%] -skew-x-12 bg-gradient-to-r from-transparent via-white to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-[300%]" />
                  <div className="flex flex-col items-center gap-1">
                    <FileText className="size-8 text-primary" />
                    <span className="text-lg font-bold tracking-wide text-primary">
                      {kindOf(r)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 border-t border-border p-4">
                  <h2 className="font-display text-base font-semibold">{r.title}</h2>
                  {r.remarks && <p className="text-sm text-muted-foreground">{r.remarks}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>

                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <a href={r.file_url} target="_blank" rel="noreferrer">
                        <Eye className="size-4" />
                        <span className="hidden sm:inline">Read</span>
                      </a>
                    </Button>
                    <Button asChild size="sm" className="gap-1.5">
                      <a href={r.file_url} download={r.file_name ?? true}>
                        <Download className="size-4" />
                        <span className="hidden sm:inline">Download</span>
                      </a>
                    </Button>
                    {manage && (
                      <div className="hidden flex-wrap items-center gap-2 sm:flex">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => void move(i, -1)}
                          disabled={i === 0 || Boolean(q)}
                          aria-label="Move up"
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => void move(i, 1)}
                          disabled={i === filtered.length - 1 || Boolean(q)}
                          aria-label="Move down"
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setFile(null);
                            setEditing(r);
                          }}
                          aria-label="Edit"
                        >
                          <Upload className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => void remove(r)}
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit document" : "Add document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={editing?.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea
                rows={3}
                value={editing?.remarks ?? ""}
                onChange={(e) => setEditing({ ...editing, remarks: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>File {editing?.id && "(leave empty to keep current)"}</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
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
