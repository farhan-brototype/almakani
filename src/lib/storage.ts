import { supabase } from "./supabase";

export type Bucket =
  | "fest-appeals"
  | "fest-documents"
  | "fest-gallery"
  | "student-photos"
  | "fest-branding";

function safeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

/** ~10 years, so a stored link keeps working for the whole life of the fest site. */
const LINK_TTL = 315360000;

/** Upload one file and return a long-lived readable URL. */
export async function uploadPublicFile(bucket: Bucket, file: File, folder = ""): Promise<string> {
  const path = `${folder ? `${folder}/` : ""}${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) {
    if (error.message.toLowerCase().includes("bucket not found") || error.message.toLowerCase().includes("bucket")) {
      throw new Error(`Storage bucket '${bucket}' was not found. Please run supabase/setup.sql in your Supabase SQL Editor.`);
    }
    throw new Error(error.message);
  }
  const { data, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, LINK_TTL);
  if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "Could not create link");
  return data.signedUrl;
}

/** Extract the storage path from a public or signed URL. */
function pathFromUrl(bucket: Bucket, url: string): string | null {
  for (const marker of [`/object/public/${bucket}/`, `/object/sign/${bucket}/`]) {
    const index = url.indexOf(marker);
    if (index !== -1) {
      const rest = url.slice(index + marker.length);
      return decodeURIComponent(rest.split("?")[0] ?? rest);
    }
  }
  return null;
}

/** Delete a file from a bucket given the URL it was uploaded to. */
export async function deletePublicFile(bucket: Bucket, publicUrl: string): Promise<void> {
  const path = pathFromUrl(bucket, publicUrl);
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}


/** Read a text-ish file (txt / md / csv / json) in the browser. */
export async function readTextFile(file: File): Promise<string> {
  return file.text();
}

/**
 * Extract readable text from a PDF in the browser so the assistant can answer
 * from the uploaded concept note / bylaw.
 */
export async function readPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(text);
  }
  await doc.cleanup();
  return pages.join("\n\n");
}

/** Read any supported knowledge file (text-ish or PDF) into plain text. */
export async function readKnowledgeText(file: File): Promise<string | null> {
  try {
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") return await readPdfText(file);
    if (/\.(txt|md|csv|json|html?)$/i.test(file.name)) return await file.text();
  } catch {
    return null;
  }
  return null;
}
