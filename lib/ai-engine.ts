import { supabase, type Program, type TimetableRow } from "./supabase";
import type { AiDocumentRow } from "./site";

export type ChatRole = "user" | "assistant";
export type ChatMessage = { id: string; role: ChatRole; text: string };

export type Corpus = {
  programs: Program[];
  timetable: (TimetableRow & { programs?: { code: string; name: string } | null })[];
  docs: AiDocumentRow[];
};

const OUT_OF_SCOPE =
  "I only answer about the fest programmes, the schedule, and the concept note / bylaw the admin uploaded. Please ask about a programme code, a programme name, the schedule, or the bylaw.";

export async function loadCorpus(): Promise<Corpus> {
  const [programs, timetable, docs] = await Promise.all([
    supabase.from("programs").select("*").order("code"),
    supabase
      .from("timetable")
      .select("*, programs(code,name,category,type)")
      .order("event_date")
      .order("event_time"),
    supabase.from("ai_documents").select("*").order("created_at", { ascending: false }),
  ]);

  return {
    programs: (programs.data as Program[]) ?? [],
    timetable: (timetable.data as Corpus["timetable"]) ?? [],
    docs: (docs.data as AiDocumentRow[]) ?? [],
  };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function scheduleFor(corpus: Corpus, program: Program): string {
  const slots = corpus.timetable.filter((t) => t.program_id === program.id);
  if (slots.length === 0) return "Schedule: not published yet.";
  return slots
    .map(
      (s) =>
        `Schedule: ${new Date(s.event_date).toDateString()}${s.event_time ? ` at ${s.event_time.slice(0, 5)}` : ""}${
          s.stage ? ` · ${s.stage}` : ""
        }${s.completed ? " (completed)" : ""}`,
    )
    .join("\n");
}

function describeProgram(corpus: Corpus, program: Program): string {
  return [
    `**${program.code} — ${program.name}**`,
    `Type: ${program.type} · Category: ${program.category} · Candidates per team: ${program.candidates}`,
    program.allowed_classes ? `Restricted to class ${program.allowed_classes}.` : "",
    scheduleFor(corpus, program),
  ]
    .filter(Boolean)
    .join("\n");
}

function searchDocs(corpus: Corpus, question: string): string | null {
  const words = norm(question).split(" ").filter((w) => w.length > 3);
  if (words.length === 0) return null;
  let best: { score: number; doc: AiDocumentRow; excerpt: string } | null = null;

  for (const doc of corpus.docs) {
    const content = doc.content ?? "";
    if (!content) continue;
    const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim().length > 30);
    for (const para of paragraphs) {
      const hay = norm(para);
      const score = words.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0);
      if (score > 0 && (!best || score > best.score)) {
        best = { score, doc, excerpt: para.trim() };
      }
    }
  }
  if (!best) return null;
  return `From **${best.doc.title}**:\n\n${best.excerpt.slice(0, 1200)}`;
}

/** Compact, plain-text snapshot of everything the assistant is allowed to use. */
export function buildContext(corpus: Corpus): string {
  const parts: string[] = [];

  parts.push(
    "PROGRAMMES (code | name | type | category | candidates per team):\n" +
      corpus.programs
        .map(
          (p) =>
            `${p.code} | ${p.name} | ${p.type} | ${p.category} | ${p.candidates}${
              p.allowed_classes ? ` | only class ${p.allowed_classes}` : ""
            }`,
        )
        .join("\n"),
  );

  parts.push(
    "TIMETABLE (code | name | date | time | stage | completed):\n" +
      corpus.timetable
        .map(
          (t) =>
            `${t.programs?.code ?? ""} | ${t.programs?.name ?? ""} | ${t.event_date} | ${
              t.event_time ?? "-"
            } | ${t.stage ?? "-"} | ${t.completed ? "yes" : "no"}`,
        )
        .join("\n"),
  );

  for (const doc of corpus.docs) {
    if (doc.content?.trim()) {
      parts.push(`DOCUMENT — ${doc.title}:\n${doc.content.trim().slice(0, 12000)}`);
    } else if (doc.file_name) {
      parts.push(`DOCUMENT — ${doc.title} (file ${doc.file_name}, text not extracted).`);
    }
  }

  return parts.join("\n\n").slice(0, 38000);
}

/** Fully local, data-grounded answering. Never invents anything. */
export function answer(corpus: Corpus, question: string): string {
  const q = norm(question);
  if (!q) return OUT_OF_SCOPE;

  if (/^(hi|hello|hey|salam|assalamu alaikum)\b/.test(q)) {
    return "Hello! Ask me a programme code (e.g. `A12`), a programme name, the schedule, or anything from the uploaded concept note or bylaw.";
  }

  // 1. exact code match
  const byCode = corpus.programs.find((p) => norm(p.code) === q || q.split(" ").includes(norm(p.code)));
  if (byCode) return describeProgram(corpus, byCode);

  // 2. programme name match
  const byName = corpus.programs
    .map((p) => ({ p, score: norm(p.name).includes(q) ? q.length : 0 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  if (byName) return describeProgram(corpus, byName.p);

  // 3. schedule / today questions
  if (/(schedule|timetable|when|time|stage|date|program list|programmes today)/.test(q)) {
    const upcoming = corpus.timetable.filter((t) => !t.completed).slice(0, 12);
    if (upcoming.length === 0) return "No upcoming programmes are scheduled right now.";
    return (
      "Upcoming programmes:\n" +
      upcoming
        .map(
          (t) =>
            `  • ${t.programs?.code ?? ""} ${t.programs?.name ?? ""} — ${new Date(
              t.event_date,
            ).toDateString()}${t.event_time ? ` ${t.event_time.slice(0, 5)}` : ""}${
              t.stage ? ` · ${t.stage}` : ""
            }`,
        )
        .join("\n")
    );
  }

  // 6. uploaded bylaw / documents
  const doc = searchDocs(corpus, question);
  if (doc) return doc;

  // 7. fuzzy programme search as a final grounded attempt
  const words = q.split(" ").filter((w) => w.length > 2);
  const fuzzy = corpus.programs.filter((p) =>
    words.some((w) => norm(p.name).includes(w) || norm(p.code).includes(w)),
  );
  if (fuzzy.length > 0) {
    return (
      "I found these programmes:\n" +
      fuzzy.slice(0, 8).map((p) => `  • ${p.code} — ${p.name} (${p.type}, ${p.category})`).join("\n") +
      "\n\nAsk me with the exact code for full details."
    );
  }

  return OUT_OF_SCOPE;
}
