import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/** Mirrors Laravel's `local` disk root (`storage/app/private`). */
const PRIVATE_ROOT = path.join(process.cwd(), "storage", "app", "private");

/** Laravel `max:2048` (kilobytes). */
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

/** Laravel `now()->addDay()` on temporary URLs. */
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

/** Content sniffing (Laravel `image`/`mimes` rules use fileinfo, not the client mime). */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 4 && ascii(bytes, 0, 4) === "GIF8") return "image/gif";
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function mimeForPath(filePath: string): string | null {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return EXT_TO_MIME[ext] ?? null;
}

function assertSafeStoragePath(filePath: string): boolean {
  if (!/^task-attachments\/\d+\/[A-Za-z0-9._-]+$/.test(filePath)) return false;
  if (filePath.includes("..")) return false;
  const resolved = path.resolve(PRIVATE_ROOT, filePath);
  return resolved.startsWith(PRIVATE_ROOT + path.sep);
}

/** Store an upload under `task-attachments/{taskId}/{40-hex}.{ext}` (Laravel hashName style). */
export async function storeAttachmentFile(
  taskId: number,
  bytes: Uint8Array,
  mime: string,
): Promise<string> {
  const ext = MIME_TO_EXT[mime];
  if (!ext) throw new Error(`Unsupported attachment mime: ${mime}`);
  const filePath = `task-attachments/${taskId}/${randomBytes(20).toString("hex")}.${ext}`;
  const absolute = path.resolve(PRIVATE_ROOT, filePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
  return filePath;
}

export async function deleteAttachmentFile(filePath: string): Promise<void> {
  if (!assertSafeStoragePath(filePath)) return;
  const absolute = path.resolve(PRIVATE_ROOT, filePath);
  await unlink(absolute).catch(() => undefined);
}

export async function readAttachmentFile(
  filePath: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!assertSafeStoragePath(filePath)) return null;
  const mime = mimeForPath(filePath);
  if (!mime) return null;
  try {
    const bytes = await readFile(path.resolve(PRIVATE_ROOT, filePath));
    return { bytes, mime };
  } catch {
    return null;
  }
}

function signatureSecret(): string {
  return process.env.JWT_SECRET ?? "dev-only-change-me-please-32-chars-minimum";
}

export function signStoragePath(filePath: string, expires: number): string {
  return createHmac("sha256", signatureSecret())
    .update(`${filePath}?expires=${expires}`)
    .digest("hex");
}

/** Laravel `URL::temporarySignedRoute` shape: absolute URL + `?expires=&signature=`. */
export function createSignedStorageUrl(filePath: string, origin: string): string {
  const expires = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
  return `${origin.replace(/\/+$/, "")}/storage/${filePath}?expires=${expires}&signature=${signStoragePath(filePath, expires)}`;
}

export type SignatureCheck = "ok" | "invalid" | "expired";

export function checkStorageSignature(
  filePath: string,
  expiresRaw: string,
  signature: string,
): SignatureCheck {
  if (!/^\d{1,15}$/.test(expiresRaw)) return "invalid";
  if (!/^[0-9a-f]{64}$/i.test(signature)) return "invalid";
  const expires = Number(expiresRaw);
  if (expires < Math.floor(Date.now() / 1000)) return "expired";
  const expected = Buffer.from(signStoragePath(filePath, expires), "hex");
  const provided = Buffer.from(signature.toLowerCase(), "hex");
  if (expected.length !== provided.length) return "invalid";
  return timingSafeEqual(expected, provided) ? "ok" : "invalid";
}
