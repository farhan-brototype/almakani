import { Bell, CalendarClock, Loader2, Plus, Search, Trash2 } from "lucide-react";
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
import { formatDeadline } from "@/lib/entry-windows";
import { entryModeLabel, slotsFor, type EntryMode } from "@/lib/supabase";
import { teamRpc } from "@/lib/team-auth";
import { PageHeading } from "@/components/PageHeading";

type OpenProgram = {
  program_id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  candidates: number;
  entry_mode?: EntryMode | null;
  group_count?: number | null;
  group_size?: number | null;
  max_entries?: number | null;
  allowed_classes: string | null;
  deadline: string | null;
  is_open: boolean;
};

type RegWindow = {
  is_open: boolean;
  reg_is_open: boolean;
  reg_start: string | null;
  reg_deadline: string | null;
  reg_use_start?: boolean;
  reg_use_deadline?: boolean;

};

/** The team RPC returns either the plain array (old SQL) or { window, programs }. */
type OpenPayload = OpenProgram[] | { window: RegWindow; programs: OpenProgram[] };

const OPEN_WINDOW: RegWindow = {
  is_open: true,
  reg_is_open: true,
  reg_start: null,
  reg_deadline: null,
  reg_use_start: false,
  reg_use_deadline: false,
};




type Reg = {
  id: string;
  program_id: string;
  program_code: string;
  program_name: string;
  type: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  link: string | null;
  remark: string | null;
  reviewed_at: string | null;
  seen_by_team: boolean;
  created_at: string;
};

const TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

/** Exact stamp down to the millisecond. */
const fmtExact = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
      })
    : "—";

export function TeamRegistration() {
  const [programs, setPrograms] = useState<OpenProgram[]>([]);
  const [regWindow, setRegWindow] = useState<RegWindow>(OPEN_WINDOW);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [link, setLink] = useState<Record<string, string>>({});
  const [remark, setRemark] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [myStatus, setMyStatus] = useState("all");
  const [myQ, setMyQ] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([
        teamRpc<OpenPayload>("team_open_registrations"),
        teamRpc<Reg[]>("team_registrations"),
      ]);
      if (Array.isArray(p)) {
        setPrograms(p);
        setRegWindow(OPEN_WINDOW);
      } else {
        setPrograms(p.programs ?? []);
        setRegWindow({ ...OPEN_WINDOW, ...(p.window ?? {}) });
      }
      setRegs(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load registrations");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(["registrations", "program_registration", "programs", "fest_settings"], load);

  // Safety net: an armed opening/closing time flips over on its own, and a
  // dropped socket can never leave the page showing a stale window.
  useEffect(() => {
    const id = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  const unseen = useMemo(
    () => regs.filter((r) => !r.seen_by_team && r.status !== "pending"),
    [regs],
  );

  const markSeen = async () => {
    try {
      await teamRpc("team_mark_registrations_seen");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  };

  const windowOpen = useMemo(() => {
    const now = new Date();
    if (!regWindow.reg_is_open) return false;
    if (regWindow.reg_use_start && regWindow.reg_start && new Date(regWindow.reg_start) > now)
      return false;
    if (
      regWindow.reg_use_deadline &&
      regWindow.reg_deadline &&
      new Date(regWindow.reg_deadline) < now
    )
      return false;

    return regWindow.is_open;
  }, [regWindow]);

  const types = useMemo(() => [...new Set(programs.map((p) => p.type))], [programs]);
  const categories = useMemo(() => [...new Set(programs.map((p) => p.category))], [programs]);

  const open = useMemo(
    () =>
      programs.filter((p) => {
        if (!p.is_open) return false;
        if (q && !`${p.code} ${p.name}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (type !== "all" && p.type !== type) return false;
        if (category !== "all" && p.category !== category) return false;
        return true;
      }),
    [programs, q, type, category],
  );

  const mine = useMemo(
    () =>
      regs.filter((r) => {
        if (myStatus !== "all" && r.status !== myStatus) return false;
        if (myQ && !`${r.program_code} ${r.program_name}`.toLowerCase().includes(myQ.toLowerCase()))
          return false;
        return true;
      }),
    [regs, myStatus, myQ],
  );

  const regsFor = useCallback(
    (programId: string) => regs.filter((r) => r.program_id === programId && r.status !== "rejected"),
    [regs],
  );

  const register = async (p: OpenProgram) => {
    const remarkValue = (remark[p.program_id] ?? "").trim();
    if (!remarkValue) {
      toast.error("Remark is required");
      return;
    }
    setBusy(p.program_id);
    try {
      await teamRpc("team_register", {
        p_program_code: p.code,
        p_link: (link[p.program_id] ?? "").trim() || null,
        p_remark: remarkValue,
      });

      setLink((l) => ({ ...l, [p.program_id]: "" }));
      setRemark((m) => ({ ...m, [p.program_id]: "" }));
      toast.success(`Sent for approval — ${p.code}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    } finally {
      setBusy("");
    }
  };

  const cancel = async (r: Reg) => {
    setBusy(r.id);
    try {
      await teamRpc("team_unregister", { p_registration_id: r.id });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove");
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <PageHeading title="Registration" />
      <p className="text-sm text-muted-foreground">
        Register your team for the programmes the admin has opened. Every entry is checked by the
        admin — rejected entries can be applied for again.
      </p>

      {unseen.length > 0 && (
        <div className="panel mt-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="size-4 text-primary" /> {unseen.length} new update
              {unseen.length > 1 ? "s" : ""} on your registrations
            </p>
            <Button size="sm" variant="outline" onClick={() => void markSeen()}>
              Mark all as read
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {unseen.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${TONE[r.status]}`}
                >
                  {r.status}
                </span>
                <span className="font-mono text-[11px]">{r.program_code}</span>
                <span>{r.program_name}</span>
                {r.admin_note && (
                  <span className="text-xs text-muted-foreground">— {r.admin_note}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading registrations…
        </p>
      )}

      <div
        className={`mt-5 rounded-lg border p-3 text-sm ${
          windowOpen
            ? "border-primary/30 bg-primary/5 text-foreground"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}
      >
        {windowOpen ? (
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4" />
            Registration is open
            {regWindow.reg_use_deadline && regWindow.reg_deadline
              ? ` until ${formatDeadline(regWindow.reg_deadline)}`
              : ""}
            .
          </span>
        ) : regWindow.reg_use_start &&
          regWindow.reg_start &&
          new Date(regWindow.reg_start) > new Date() ? (
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4" /> Registration opens on{" "}
            {formatDeadline(regWindow.reg_start)}.
          </span>
        ) : regWindow.reg_use_deadline &&
          regWindow.reg_deadline &&
          new Date(regWindow.reg_deadline) < new Date() ? (

          <span className="flex items-center gap-2">
            <CalendarClock className="size-4" /> Registration closed on{" "}
            {formatDeadline(regWindow.reg_deadline)}.
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4" /> Registration is closed right now.
          </span>
        )}
      </div>

      <h2 className="font-display mt-8 text-lg font-semibold">Open programmes</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search programme"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
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
      </div>

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Programme</th>
              <th className="px-2 py-2">Deadline</th>
              <th className="px-2 py-2">Your entries</th>
              <th className="px-2 py-2">Register</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {open.map((p) => {
              const past = p.deadline ? new Date(p.deadline) < new Date() : false;
              const list = regsFor(p.program_id);
              const slots = Math.max(p.max_entries ?? slotsFor(p), 1);
              const full = list.length >= slots;
              const locked = past || full || !windowOpen;
              return (
                <tr key={p.program_id} className="align-top hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold">
                        {p.code}
                      </span>
                      <span className="text-sm font-semibold">{p.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{p.type}</Badge>
                      <Badge variant="outline">{p.category}</Badge>
                      <Badge variant="outline">{entryModeLabel(p)}</Badge>
                      <Badge variant="outline">
                        {list.length}/{slots} slot(s) used
                      </Badge>
                      {p.allowed_classes && (
                        <Badge variant="outline">class {p.allowed_classes} only</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={`flex items-center gap-1.5 text-xs ${past ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}
                    >
                      <CalendarClock className="size-3.5" />
                      {p.deadline ? fmt(p.deadline) : "No deadline"}
                      {past && " · closed"}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    {list.length === 0 ? (
                      <span className="text-xs text-muted-foreground">None yet</span>
                    ) : (
                      <ul className="space-y-1.5">
                        {list.map((r) => (
                          <li key={r.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${TONE[r.status]}`}
                              >
                                {r.status}
                              </span>
                              <span className="max-w-40 truncate">{r.link ?? "No link"}</span>
                              {r.status === "pending" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-6"
                                  disabled={busy === r.id}
                                  onClick={() => void cancel(r)}
                                  title="Remove"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                            {r.remark && (
                              <p className="mt-0.5 max-w-48 text-[11px] text-muted-foreground">
                                Remark: {r.remark}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              {fmtExact(r.created_at)}
                            </p>
                          </li>
                        ))}
                      </ul>

                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col gap-2">
                      <Input
                        className="h-8 w-56 text-xs"
                        placeholder="Link"
                        value={link[p.program_id] ?? ""}
                        disabled={locked}
                        onChange={(e) => setLink((l) => ({ ...l, [p.program_id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void register(p);
                        }}
                      />
                      <Input
                        className="h-8 w-56 text-xs"
                        placeholder="Remark (required)"
                        required
                        aria-required
                        value={remark[p.program_id] ?? ""}
                        disabled={locked}
                        onChange={(e) =>
                          setRemark((m) => ({ ...m, [p.program_id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void register(p);
                        }}
                      />
                      <Button
                        size="sm"
                        className="w-fit gap-1"
                        disabled={
                          locked ||
                          busy === p.program_id ||
                          !(remark[p.program_id] ?? "").trim()
                        }
                        onClick={() => void register(p)}
                      >
                        <Plus className="size-4" /> Apply
                      </Button>

                    </div>
                    {full && (
                      <p className="mt-1 text-[11px] text-muted-foreground">All slots used</p>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && open.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-muted-foreground">
                  No programmes are open for registration right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="font-display mt-10 text-lg font-semibold">Your registrations</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search programme"
            value={myQ}
            onChange={(e) => setMyQ(e.target.value)}
          />
        </div>
        <Select value={myStatus} onValueChange={setMyStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Programme</th>
              <th className="px-2 py-2">Link & remark</th>
              <th className="px-2 py-2">Submitted</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mine.map((r) => (
              <tr key={r.id} className="align-top hover:bg-muted/30">
                <td className="px-4 py-3">
                  <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold">
                    {r.program_code}
                  </span>{" "}
                  {r.program_name}
                </td>
                <td className="px-2 py-3">
                  <span className="block max-w-56 truncate text-xs">{r.link ?? "—"}</span>
                  {r.remark && (
                    <p className="mt-1 max-w-56 text-[11px] text-muted-foreground">
                      Remark: {r.remark}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-2 py-3 font-mono text-[11px] text-muted-foreground">
                  {fmtExact(r.created_at)}
                </td>
                <td className="px-2 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${TONE[r.status]}`}
                  >
                    {r.status}
                  </span>
                  {r.admin_note && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{r.admin_note}</p>
                  )}
                </td>
                <td className="whitespace-nowrap px-2 py-3 font-mono text-[11px] text-muted-foreground">
                  {fmtExact(r.reviewed_at)}
                </td>

              </tr>
            ))}
            {!loading && mine.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
