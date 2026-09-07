import { Loader2, Paperclip, Plus, Search, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeading } from "@/components/PageHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRealtime } from "@/hooks/use-realtime";
import { uploadPublicFile } from "@/lib/storage";
import { teamRpc } from "@/lib/team-auth";
import {
  APPEAL_KINDS,
  APPEAL_PRIORITIES,
  STATUS_TONE,
  type Appeal,
  fmtAppealDate,
  labelOf,
} from "@/lib/appeals";

export function TeamAppeals() {
  const [rows, setRows] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [explanation, setExplanation] = useState("");
  const [kind, setKind] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [programCode, setProgramCode] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await teamRpc<Appeal[]>("team_appeals"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load appeals");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(["appeals"], load);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (
          q &&
          !`${r.subject} ${r.content} ${r.program_code ?? ""}`.toLowerCase().includes(q.toLowerCase())
        )
          return false;
        return true;
      }),
    [rows, status, q],
  );

  const reset = () => {
    setSubject("");
    setContent("");
    setExplanation("");
    setKind("general");
    setPriority("normal");
    setProgramCode("");
    setFile(null);
  };

  const submit = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Subject and content are required");
      return;
    }
    setSaving(true);
    try {
      let fileUrl: string | null = null;
      if (file) {
        if (file.size > 15 * 1024 * 1024) throw new Error("File must be under 15 MB");
        fileUrl = await uploadPublicFile("fest-appeals", file, "appeals");
      }
      await teamRpc("team_appeal_create", {
        p_subject: subject.trim().slice(0, 160),
        p_content: content.trim().slice(0, 4000),
        p_explanation: explanation.trim().slice(0, 4000) || null,
        p_kind: kind,
        p_priority: priority,
        p_program_code: programCode.trim() || null,
        p_file_url: fileUrl,
        p_file_name: file?.name ?? null,
      });
      toast.success("Appeal submitted");
      reset();
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit appeal");
    }
    setSaving(false);
  };

  const withdraw = async (id: string) => {
    setBusy(id);
    try {
      await teamRpc("team_appeal_withdraw", { p_id: id });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not withdraw");
    }
    setBusy("");
  };

  if (loading)
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageHeading title="Appeals" />
          <p className="mt-2 text-sm text-muted-foreground">
            Raise an appeal about registration, results or anything else. Admins reply here.
          </p>
        </div>
        <Button className="rounded-full" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 size-4" /> {open ? "Close form" : "New appeal"}
        </Button>
      </div>

      {open && (
        <div className="panel animate-pop space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Subject *</label>
              <Input
                value={subject}
                maxLength={160}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short title of the appeal"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Programme code (optional)
              </label>
              <Input
                value={programCode}
                maxLength={24}
                onChange={(e) => setProgramCode(e.target.value)}
                placeholder="e.g. A12"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPEAL_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPEAL_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Content *</label>
            <Textarea
              value={content}
              maxLength={4000}
              rows={3}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What is the appeal about?"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Explanation</label>
            <Textarea
              value={explanation}
              maxLength={4000}
              rows={3}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Extra detail, reasoning or references (optional)"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="file"
              className="max-w-xs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <span className="text-xs text-muted-foreground">{file.name}</span>}
            <Button className="ml-auto rounded-full" disabled={saving} onClick={() => void submit()}>
              {saving && <Loader2 className="mr-1 size-4 animate-spin" />} Submit appeal
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search appeals"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_review">In review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="panel p-6 text-center text-sm text-muted-foreground">No appeals yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="panel space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{a.subject}</span>
                <Badge className={STATUS_TONE[a.status] ?? ""}>{labelOf(a.status)}</Badge>
                <Badge variant="outline">{labelOf(a.kind)}</Badge>
                <Badge variant="outline">{labelOf(a.priority)}</Badge>
                {a.program_code && <Badge variant="secondary">{a.program_code}</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">
                  {fmtAppealDate(a.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{a.content}</p>
              {a.explanation && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.explanation}</p>
              )}
              {a.file_url && (
                <a
                  href={a.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline"
                >
                  <Paperclip className="size-3.5" /> {a.file_name ?? "Attachment"}
                </a>
              )}
              {a.admin_reply && (
                <div className="rounded-xl bg-muted p-3 text-sm">
                  <span className="text-xs font-semibold text-muted-foreground">Admin reply</span>
                  <p className="mt-1 whitespace-pre-wrap">{a.admin_reply}</p>
                </div>
              )}
              {(a.status === "open" || a.status === "in_review") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={busy === a.id}
                  onClick={() => void withdraw(a.id)}
                >
                  <Undo2 className="mr-1 size-3.5" /> Withdraw
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
