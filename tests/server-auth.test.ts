import { beforeEach, describe, expect, it } from "vitest";
import { json, unauthenticated } from "@/lib/server/http";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  signAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/server/jwt";
import { hitRateLimit, clearRateLimits } from "@/lib/server/rate-limit";
import {
  personalWorkspaceName,
  randomToken,
  slugifyWorkspaceName,
} from "@/lib/server/workspace-utils";

describe("jwt", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-32-chars-minimum!!";
  });

  it("signs and verifies access tokens", async () => {
    const token = await signAccessToken(42);
    expect(ACCESS_TOKEN_EXPIRES_IN).toBe(3600);
    await expect(verifyAccessToken(token)).resolves.toBe(42);
    await expect(verifyRefreshToken(token)).resolves.toBe(42);
  });

  it("rejects tampered tokens", async () => {
    const token = await signAccessToken(42);
    await expect(verifyAccessToken(`${token}x`)).resolves.toBeNull();
    await expect(verifyAccessToken("not.a.jwt")).resolves.toBeNull();
  });

  it("signs with the tymon-compatible subject claim", async () => {
    const token = await signAccessToken(7);
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
    );
    expect(payload.sub).toBe("7");
    expect(payload.exp - payload.iat).toBe(3600);
  });
});

describe("rate limit", () => {
  beforeEach(() => clearRateLimits());

  it("allows up to max attempts then blocks", () => {
    const first = hitRateLimit("k", 2, 60);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    const second = hitRateLimit("k", 2, 60);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
    const third = hitRateLimit("k", 2, 60);
    expect(third.allowed).toBe(false);
    expect(third.retryAfter).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    hitRateLimit("a", 1, 60);
    expect(hitRateLimit("a", 1, 60).allowed).toBe(false);
    expect(hitRateLimit("b", 1, 60).allowed).toBe(true);
  });
});

describe("workspace utils", () => {
  it("slugifies workspace names", () => {
    expect(slugifyWorkspaceName("My Cool Workspace")).toBe("my-cool-workspace");
    expect(slugifyWorkspaceName("  ---  ")).toBe("workspace");
    expect(slugifyWorkspaceName("!!!")).toBe("workspace");
    expect(slugifyWorkspaceName("a".repeat(200)).length).toBe(160);
  });

  it("builds personal workspace names capped at 150 chars", () => {
    expect(personalWorkspaceName(" Alice ")).toBe("Alice's Workspace");
    expect(personalWorkspaceName("x".repeat(200)).length).toBe(150);
  });

  it("generates alphanumeric tokens", () => {
    const token = randomToken(64);
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });
});

describe("auth guard behavior", () => {
  it("rejects with 401 Unauthenticated for missing bearer header", async () => {
    const { requireUser } = await import("@/lib/server/auth");
    await expect(requireUser(new Request("http://localhost"))).rejects.toMatchObject({
      status: 401,
      message: "Unauthenticated.",
    });
  });

  it("rejects with 401 for invalid bearer tokens", async () => {
    process.env.JWT_SECRET = "test-secret-key-32-chars-minimum!!";
    const { requireUser } = await import("@/lib/server/auth");
    await expect(
      requireUser(
        new Request("http://localhost", {
          headers: { Authorization: "Bearer bogus.token.here" },
        }),
      ),
    ).rejects.toMatchObject({
      status: 401,
      message: "Unauthenticated.",
    });
  });

  it("json helper sets content type", () => {
    const response = json({ a: 1 });
    expect(response.headers.get("content-type")).toBe("application/json");
  });

  it("unauthenticated helper shape", () => {
    const error = unauthenticated();
    expect(error.status).toBe(401);
    expect(error.message).toBe("Unauthenticated.");
  });
});
