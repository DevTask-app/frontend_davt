import { randomBytes } from "crypto";

/** Str::slug() equivalent limited to 160 chars, falling back to "workspace". */
export function slugifyWorkspaceName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
  return slug === "" ? "workspace" : slug;
}

/** Str::random(64): alphanumeric token. */
export function randomToken(length = 64): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let token = "";
  for (const byte of bytes) {
    token += characters[byte % characters.length];
  }
  return token;
}

/** CreatePersonalWorkspace name(): Str::limit(trim(name)."'s Workspace", 150, ''). */
export function personalWorkspaceName(userName: string): string {
  return `${userName.trim()}'s Workspace`.slice(0, 150);
}
