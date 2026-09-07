import { Check, ExternalLink, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { useRealtime } from "@/hooks/use-realtime";
import { supabase } from "@/lib/supabase";
import { PageHeading } from "@/components/PageHeading";

type Row = {
  id: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  link: string | null;
  remark: string | null;
  created_at: string;
  reviewed_at: string | null;
  program_id: string;
  team_id: string;
  programs: { code: string; name: string; type: string; category: string } | null;
  teams: { name: string; short_name: string | null } | null;
};

const fmtExact = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });


const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export function RegistrationReviewPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [team, setTeam] = useState("all");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [program, setProgram] = useState("");
  const [note, setNote] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("registrations")
      .select(
        "id,status,admin_note,link,remark,created_at,reviewed_at,program_id,team_id," +
          "programs(code,name,type,category),teams(name,short_name)",
      )
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(["registrations"], load);

  const teams = useMemo(
    () => [...new Set(rows.map((r) => r.teams?.name).filter(Boolean))] as string[],
    [rows],
  );
  const types = useMemo(
    () => [...new Set(rows.map((r) => r.programs?.type).filter(Boolean))] as string[],
    [rows],
  );
  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.programs?.category).filter(Boolean))] as string[],
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (team !== "all" && r.teams?.name !== team) return false;
        if (type !== "all" && r.programs?.type !== type) return false;
        if (category !== "all" && r.programs?.category !== category) return false;
        if (
          program &&
          !`${r.programs?.code ?? ""} ${r.programs?.name ?? ""}`
            .toLowerCase()
            .includes(program.toLowerCase())
        )
          return false;
        if (
          q &&
          !`${r.teams?.name ?? ""}`
            .toLowerCase()
            .includes(q.toLowerCase())
        )
          return false;
        return true;
      }),
    [rows, status, team, type, category, program, q],
  );

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    }),
    [rows],
  );

  const decide = async (row: Row, next: "approved" | "rejected") => {
    setBusy(row.id);
    const { error } = await supabase
      .from("registrations")
      .update({
        status: next,
        admin_note: note[row.id]?.trim() || null,
        reviewed_at: new Date().toISOString(),
        seen_by_team: false,
      })
      .eq("id", row.id);
    if (error) {
      setBusy("");
      toast.error(error.message);
      return;
    }
    setBusy("");
    toast.success(next === "approved" ? "Registration approved" : "Registration rejected");
    void load();
  };

  const decideAll = async (next: "approved" | "rejected") => {
    const targets = filtered.filter((r) => r.status === "pending");
    if (targets.length === 0) return;
    setBusy("bulk");
    for (const row of targets) await decide(row, next);
    setBusy("");
  };

  return (
    <div>
      <PageHeading title="Review" />
      <p className="text-sm text-muted-foreground">
        Approve or reject the entries teams submitted. A rejected entry frees the programme so the
        team can apply again.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-3 py-1 ${STATUS_TONE["pending"]}`}>
          {counts.pending} pending
        </span>
        <span className={`rounded-full px-3 py-1 ${STATUS_TONE["approved"]}`}>
          {counts.approved} approved
        </span>
        <span className={`rounded-full px-3 py-1 ${STATUS_TONE["rejected"]}`}>
          {counts.rejected} rejected
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search team"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Filter by programme code or name"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={team} onValueChange={setTeam}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Team" />
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
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-36">
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
        <Button
          variant="outline"
          disabled={busy === "bulk"}
          onClick={() => void decideAll("approved")}
        >
          Approve all shown
        </Button>
        <Button
          variant="outline"
          disabled={busy === "bulk"}
          onClick={() => void decideAll("rejected")}
        >
          Reject all shown
        </Button>
      </div>

      {loading && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading registrations…
        </p>
      )}

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[940px] text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Programme</th>
              <th className="px-2 py-2">Team</th>
              <th className="px-2 py-2">Submitted</th>
              <th className="px-2 py-2">Link & remark</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Note & decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.id} className="align-top hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold">
                      {r.programs?.code}
                    </span>
                    <span className="text-sm font-semibold">{r.programs?.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{r.programs?.type}</Badge>
                    <Badge variant="outline">{r.programs?.category}</Badge>
                  </div>
                </td>
                <td className="px-2 py-3">{r.teams?.name}</td>
                <td className="px-2 py-3 font-mono text-[11px] whitespace-nowrap">
                  {fmtExact(r.created_at)}
                </td>
                <td className="px-2 py-3">
                  {r.link ? (
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-56 items-center gap-1 text-primary underline"
                    >
                      <ExternalLink className="size-3.5 shrink-0" />
                      <span className="truncate">{r.link}</span>
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">No link</span>
                  )}
                  {r.remark && (
                    <p className="mt-1 max-w-56 text-[11px] text-muted-foreground">{r.remark}</p>
                  )}
                </td>
                <td className="px-2 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_TONE[r.status]}`}
                  >
                    {r.status}
                  </span>
                  {r.admin_note && (
                    <p className="mt-1 max-w-40 text-[11px] text-muted-foreground">{r.admin_note}</p>
                  )}
                </td>
                <td className="px-2 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="h-8 w-44 text-xs"
                      placeholder="Reason / note"
                      value={note[r.id] ?? r.admin_note ?? ""}
                      onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={busy === r.id || r.status === "approved"}
                      onClick={() => void decide(r, "approved")}
                    >
                      <Check className="size-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={busy === r.id || r.status === "rejected"}
                      onClick={() => void decide(r, "rejected")}
                    >
                      <X className="size-4" /> Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  No registrations match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
