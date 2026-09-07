import { ExternalLink, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

type Approved = {
  id: string;
  program_code: string;
  program_name: string;
  type: string;
  category: string;
  candidates: number;
  allowed_classes: string | null;
  link: string | null;
  remark: string | null;
  created_at: string;
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


/** Approved registrations only — programme details and the submitted link. */
export function FullRegisteredPage() {
  const [rows, setRows] = useState<Approved[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("approved_registrations" as never);
    setRows((data as unknown as Approved[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtime(["registrations"], load);

  const types = useMemo(() => [...new Set(rows.map((r) => r.type))], [rows]);
  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))], [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (q && !`${r.program_code} ${r.program_name}`.toLowerCase().includes(q.toLowerCase()))
          return false;
        if (type !== "all" && r.type !== type) return false;
        if (category !== "all" && r.category !== category) return false;
        return true;
      }),
    [rows, q, type, category],
  );

  return (
    <div>
      <h1 className="font-display text-xl font-semibold sm:text-2xl">Full registered</h1>
      <p className="text-sm text-muted-foreground">
        Approved registrations only — the programme details and the submitted link.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-0 flex-1 sm:min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search programme code or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-36">
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
          <SelectTrigger className="w-full sm:w-44">
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

      {loading && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading approved registrations…
        </p>
      )}

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Programme</th>
              <th className="px-2 py-2">Submitted</th>
              <th className="px-2 py-2">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => (
              <tr key={r.id} className="align-top hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold">
                      {r.program_code}
                    </span>
                    <span className="text-sm font-semibold">{r.program_name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{r.type}</Badge>
                    <Badge variant="outline">{r.category}</Badge>
                    <Badge variant="outline">{r.candidates} candidate(s)</Badge>
                    {r.allowed_classes && (
                      <Badge variant="outline">class {r.allowed_classes} only</Badge>
                    )}
                  </div>
                </td>
                <td className="px-2 py-3 font-mono text-[11px] whitespace-nowrap">
                  {fmtExact(r.created_at)}
                </td>
                <td className="px-2 py-3">
                  <a
                    href={r.link ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-56 items-center gap-1 text-primary underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0" />
                    <span className="truncate">{r.link}</span>
                  </a>
                  {r.remark && (
                    <p className="mt-1 max-w-56 text-[11px] text-muted-foreground">{r.remark}</p>
                  )}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="p-10 text-center text-muted-foreground">
                  No approved registrations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
