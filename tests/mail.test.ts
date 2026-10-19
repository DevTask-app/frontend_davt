import { afterEach, describe, expect, it } from "vitest";
import {
  appName,
  escapeHtml,
  fromAddress,
  taskAssignedMail,
  toDayDateTimeString,
  workspaceInvitationMail,
} from "@/lib/server/mail";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("escapeHtml", () => {
  it("matches Blade's e() escaping (ENT_QUOTES)", () => {
    expect(escapeHtml(`A & B's "quote" <b>`)).toBe(
      "A &amp; B&#039;s &quot;quote&quot; &lt;b&gt;",
    );
  });
});

describe("toDayDateTimeString", () => {
  it("formats like Carbon's toDayDateTimeString in UTC", () => {
    expect(toDayDateTimeString(new Date("2026-10-19T18:27:00Z"))).toBe(
      "Mon, Oct 19, 2026 6:27 PM",
    );
  });

  it("uses 12-hour clock without leading zeros and pads minutes", () => {
    expect(toDayDateTimeString(new Date("2026-01-05T00:05:00Z"))).toBe(
      "Mon, Jan 5, 2026 12:05 AM",
    );
  });
});

describe("appName / fromAddress", () => {
  it("prefers APP_NAME then MAIL_FROM_NAME", () => {
    process.env.APP_NAME = "DevT";
    process.env.MAIL_FROM_NAME = "Other";
    expect(appName()).toBe("DevT");

    delete process.env.APP_NAME;
    expect(appName()).toBe("Other");
  });

  it("treats empty and \"null\" values as absent", () => {
    process.env.MAIL_FROM_NAME = "null";
    delete process.env.APP_NAME;
    expect(appName()).toBe(process.env.NEXT_PUBLIC_APP_NAME ?? "DevTask");

    process.env.MAIL_FROM_NAME = "DevT";
    process.env.MAIL_FROM_ADDRESS = '"dev@example.com"';
    expect(fromAddress()).toEqual({ name: "DevT", address: "dev@example.com" });
  });
});

describe("workspaceInvitationMail", () => {
  const mail = workspaceInvitationMail({
    workspaceName: "Acme & Co",
    acceptUrl: "http://localhost:3000/invitations/tok",
    token: "tok",
    expiresAt: new Date("2026-10-19T18:27:00Z"),
  });

  it("uses Laravel's subject translation", () => {
    expect(mail.subject).toBe("You have been invited to Acme & Co");
  });

  it("renders the text template verbatim (escaped, like Blade)", () => {
    expect(mail.text).toBe(
      [
        'You have been invited to join the "Acme &amp; Co" workspace on DevT.',
        "",
        "Accept your invitation by opening the link below:",
        "",
        "    http://localhost:3000/invitations/tok",
        "",
        "If the link does not work, you can also use this token:",
        "",
        "    tok",
        "",
        "This invitation expires Mon, Oct 19, 2026 6:27 PM.",
        "",
        "If you were not expecting this invitation, you can safely ignore this email.",
        "",
      ].join("\n"),
    );
  });

  it("renders the HTML template with escaped branding", () => {
    expect(mail.html).toContain("<title>DevT</title>");
    expect(mail.html).toContain("<strong>Acme &amp; Co</strong>");
    expect(mail.html).toContain(
      '<a href="http://localhost:3000/invitations/tok" style="color:#2563eb;">http://localhost:3000/invitations/tok</a>',
    );
    expect(mail.html.endsWith("</html>\n")).toBe(true);
  });
});

describe("taskAssignedMail", () => {
  const mail = taskAssignedMail({
    assignedBy: "Dani",
    taskTitle: `Fix A & B's "login"`,
    projectName: "Website",
    url: "http://localhost:3000/tasks/7",
  });

  it("uses Laravel's subject translation", () => {
    expect(mail.subject).toBe(`You have been assigned a task: Fix A & B's "login"`);
  });

  it("renders the text template verbatim (escaped, like Blade)", () => {
    expect(mail.text).toBe(
      [
        "Hi,",
        "",
        "Dani assigned you a task.",
        "",
        "    Task:    Fix A &amp; B&#039;s &quot;login&quot;",
        "    Project: Website",
        "",
        "Open the task here:",
        "",
        "    http://localhost:3000/tasks/7",
        "",
        "If you were not expecting this task, you can safely ignore this email.",
        "",
      ].join("\n"),
    );
  });

  it("falls back to an em dash when the project name is missing", () => {
    expect(
      taskAssignedMail({
        assignedBy: "Dani",
        taskTitle: "Task",
        projectName: null,
        url: "http://localhost:3000/tasks/7",
      }).text,
    ).toContain("    Project: —");
  });
});
