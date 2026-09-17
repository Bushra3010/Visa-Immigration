/** File checks for uploads (PRD §12.3): size, extension and magic bytes. */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string[]; test: (b: Uint8Array) => boolean }[] = [
  { mime: "application/pdf", ext: ["pdf"], test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { mime: "image/jpeg", ext: ["jpg", "jpeg"], test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: ["png"], test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/webp", ext: ["webp"], test: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
];

export type FileCheck = { ok: true; mime: string; ext: string } | { ok: false; reason: string };

export function checkUpload(fileName: string, size: number, head: Uint8Array): FileCheck {
  if (size === 0) return { ok: false, reason: "The file is empty." };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, reason: "Files must be 10 MB or smaller." };
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const match = SIGNATURES.find((s) => s.test(head));
  if (!match) return { ok: false, reason: "Only PDF, JPG, PNG or WebP files are accepted." };
  if (!match.ext.includes(ext)) return { ok: false, reason: "The file extension doesn't match its contents." };
  return { ok: true, mime: match.mime, ext: match.ext[0] };
}

export function safeFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return base || "document";
}
