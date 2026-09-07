import { Loader2, Paperclip, Search } from "lucide-react";
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
import { supabase } from "@/lib/supabase";
import {
  APPEAL_KINDS,
  APPEAL_PRIORITIES,
  PRIORITY_TONE,
  STATUS_TONE,
  fmtAppealDate,
  labelOf,
  type AppealStatus,
} from "@/lib/appeals";

type Row = {
  id: string;
  subject: string;
  kind: string;
  priority: string;
  content: string;
  explanation: string | null;
  file_url: string | null;
  file_name: string | null;
  status: AppealStatus;
  admin_reply: string | null;
  resolved_at: string | null;
  created_at: string;
  programs: { code: string; name: string } | null;
  teams: { name: string } | null;
};

const SORTS = [
  { value: "new", label: "Newest first" },
  { value: "old", label: "Oldest first" },
  { value: "priority", label: "Priority" },
];

const RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export function AdminAppeals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("open");
  const [kind, setKind] = useState("all");
  const [priority, setPriority] = useState("all");
  const [team, setTeam] = useState("all");
  const [sort, setSort] = useState("new");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("appeals")
      .select(
        "id,subject,kind,priority,content,explanation,file_url,file_name,status,admin_reply," +
          "resolved_at,created_at,programs(code,name),teams(name)",
      )
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(["appeals"], load);

  const teams = useMemo(
    () => [...new Set(rows.map((r) => r.teams?.name).filter(Boolean))] as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (kind !== "all" && r.kind !== kind) return false;
      if (priority !== "all" && r.priority !== priority) return false;
      if (team !== "all" && r.teams?.name !== team) return false;
      if (
        q &&
        !`${r.subject} ${r.content} ${r.explanation ?? ""} ${r.teams?.name ?? ""} ${
          r.programs?.code ?? ""
        }`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "priority") return (RANK[a.priority] ?? 9) - (RANK[b.priority] ?? 9);
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "old" ? da - db : db - da;
    });
  }, [rows, status, kind, priority, team, q, sort]);

  const counts = useMemo(
    () => ({
      open: rows.filter((r) => r.status === "open").length,
      in_review: rows.filter((r) => r.status === "in_review").length,
      resolved: rows.filter((r) => r.status === "resolved").length,
    }),
    [rows],
  );

  const update = async (row: Row, next: AppealStatus) => {
    setBusy(row.id);
    const replyText = (reply[row.id] ?? row.admin_reply ?? "").trim();
    const { error } = await supabase
      .from("appeals")
      .update({
        status: next,
        admin_reply: replyText || null,
        resolved_at:
          next === "resolved" || next === "rejected" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Appeal ${labelOf(next).toLowerCase()}`);
      setReply((r) => ({ ...r, [row.id]: "" }));
      await load();
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
      <div>
        <PageHeading title="Appeals" />
        <p className="mt-2 text-sm text-muted-foreground">
          {counts.open} open · {counts.in_review} in review · {counts.resolved} resolved
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subject, content, team"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
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
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {APPEAL_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priority</SelectItem>
            {APPEAL_PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={team} onValueChange={setTeam}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="panel p-6 text-center text-sm text-muted-foreground">No appeals found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="panel space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{a.subject}</span>
                <Badge className={STATUS_TONE[a.status] ?? ""}>{labelOf(a.status)}</Badge>
                <Badge className={PRIORITY_TONE[a.priority] ?? ""}>{labelOf(a.priority)}</Badge>
                <Badge variant="outline">{labelOf(a.kind)}</Badge>
                {a.programs && (
                  <Badge variant="secondary">
                    {a.programs.code} · {a.programs.name}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{a.teams?.name ?? "—"}</span>
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

              <Textarea
                rows={2}
                maxLength={4000}
                value={reply[a.id] ?? a.admin_reply ?? ""}
                onChange={(e) => setReply((r) => ({ ...r, [a.id]: e.target.value }))}
                placeholder="Reply / resolution note"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={busy === a.id}
                  onClick={() => void update(a, "in_review")}
                >
                  Mark in review
                </Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  disabled={busy === a.id}
                  onClick={() => void update(a, "resolved")}
                >
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-full"
                  disabled={busy === a.id}
                  onClick={() => void update(a, "rejected")}
                >
                  Reject
                </Button>
                {a.resolved_at && (
                  <span className="self-center text-xs text-muted-foreground">
                    Closed {fmtAppealDate(a.resolved_at)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
