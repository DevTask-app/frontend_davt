import { describe, expect, it } from "vitest";
import { parseNextPath } from "@/lib/auth";

describe("parseNextPath", () => {
  it("returns the next path when it is a same-app absolute path", () => {
    expect(parseNextPath("?next=%2Finvitations%2Fabc")).toBe(
      "/invitations/abc",
    );
    expect(parseNextPath("?next=/dashboard")).toBe("/dashboard");
  });

  it("returns the fallback when next is missing or empty", () => {
    expect(parseNextPath(null)).toBe("/dashboard");
    expect(parseNextPath("")).toBe("/dashboard");
    expect(parseNextPath("?other=1")).toBe("/dashboard");
    expect(parseNextPath("?next=")).toBe("/dashboard");
  });

  it("rejects cross-origin and protocol-relative targets", () => {
    expect(parseNextPath("?next=https%3A%2F%2Fevil.test")).toBe("/dashboard");
    expect(parseNextPath("?next=//evil.test/x")).toBe("/dashboard");
    expect(parseNextPath("?next=javascript:alert(1)")).toBe("/dashboard");
  });

  it("keeps paths that only look external", () => {
    expect(parseNextPath("?next=/tasks/12")).toBe("/tasks/12");
    expect(parseNextPath("?next=/invitations/a?b=1")).toBe(
      "/invitations/a?b=1",
    );
  });

  it("honors a custom fallback", () => {
    expect(parseNextPath(null, "/login")).toBe("/login");
    expect(parseNextPath("?next=//evil.test", "/login")).toBe("/login");
  });
});
