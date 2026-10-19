import { afterEach, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import path from "node:path";
import {
  checkStorageSignature,
  createSignedStorageUrl,
  deleteAttachmentFile,
  mimeForPath,
  readAttachmentFile,
  signStoragePath,
  sniffImageMime,
  storeAttachmentFile,
} from "@/lib/server/storage";

const png = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);

const created: string[] = [];

afterEach(async () => {
  while (created.length > 0) {
    const filePath = created.pop()!;
    const dir = path.dirname(path.resolve(process.cwd(), "storage", "app", "private", filePath));
    await rm(dir, { recursive: true, force: true });
  }
});

describe("sniffImageMime", () => {
  it("detects supported image magic bytes", () => {
    expect(sniffImageMime(png)).toBe("image/png");
    expect(sniffImageMime(jpeg)).toBe("image/jpeg");
    expect(sniffImageMime(gif)).toBe("image/gif");
    expect(sniffImageMime(webp)).toBe("image/webp");
  });

  it("rejects non-images and truncated headers", () => {
    expect(sniffImageMime(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull();
    expect(sniffImageMime(png.slice(0, 4))).toBeNull();
    expect(sniffImageMime(new Uint8Array([]))).toBeNull();
  });
});

describe("mimeForPath", () => {
  it("maps stored extensions to mime types", () => {
    expect(mimeForPath("task-attachments/1/abc.jpg")).toBe("image/jpeg");
    expect(mimeForPath("task-attachments/1/abc.png")).toBe("image/png");
    expect(mimeForPath("task-attachments/1/abc.webp")).toBe("image/webp");
    expect(mimeForPath("task-attachments/1/abc.gif")).toBe("image/gif");
    expect(mimeForPath("task-attachments/1/abc.exe")).toBeNull();
  });
});

describe("signed storage urls", () => {
  it("builds Laravel-shaped temporary urls", () => {
    const url = createSignedStorageUrl("task-attachments/7/abc.png", "http://localhost:3000/");
    expect(url).toMatch(
      /^http:\/\/localhost:3000\/storage\/task-attachments\/7\/abc\.png\?expires=\d{10}&signature=[0-9a-f]{64}$/,
    );
  });

  it("validates, rejects tampered and expired signatures", () => {
    const filePath = "task-attachments/7/abc.png";
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const signature = signStoragePath(filePath, expires);

    expect(checkStorageSignature(filePath, String(expires), signature)).toBe("ok");
    expect(checkStorageSignature(filePath, String(expires), signature.replace(/.$/, "0"))).toBe(
      "invalid",
    );
    expect(checkStorageSignature(filePath, String(expires + 60), signature)).toBe("invalid");
    expect(checkStorageSignature(filePath, "abc", signature)).toBe("invalid");
    expect(checkStorageSignature(filePath, "1000000000", signature)).toBe("expired");
  });
});

describe("attachment file storage", () => {
  it("stores, reads back and deletes a file under storage/app/private", async () => {
    const filePath = await storeAttachmentFile(424242, png, "image/png");
    created.push(filePath);
    expect(filePath).toMatch(/^task-attachments\/424242\/[0-9a-f]{40}\.png$/);

    const read = await readAttachmentFile(filePath);
    expect(read?.mime).toBe("image/png");
    expect(Array.from(read!.bytes)).toEqual(Array.from(png));

    await deleteAttachmentFile(filePath);
    expect(await readAttachmentFile(filePath)).toBeNull();
  });

  it("refuses paths outside the private disk", async () => {
    expect(await readAttachmentFile("../.env")).toBeNull();
    expect(await readAttachmentFile("task-attachments/../secret.png")).toBeNull();
    expect(await readAttachmentFile("other/1/abc.png")).toBeNull();
  });
});
