import nodemailer, { type Transporter } from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

const APP_NAME_FALLBACK = "DevTask"; // eslint-disable-line @typescript-eslint/no-unused-vars
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; // eslint-disable-line @typescript-eslint/no-unused-vars
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; // eslint-disable-line @typescript-eslint/no-unused-vars

/** Reads an env var, unquoting and treating empty/"null" values as absent (Laravel behaviour). */
function envValue(key: string): string | undefined {
  const raw = process.env[key];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  const value = /^".*"$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
  if (value === "" || value.toLowerCase() === "null") return undefined;
  return value;
}

/** Mirrors Laravel's `config('app.name')`; `MAIL_FROM_NAME` keeps us in sync with the mailer. */
export function appName(): string {
  return (
    envValue("APP_NAME") ??
    envValue("MAIL_FROM_NAME") ??
    envValue("NEXT_PUBLIC_APP_NAME") ??
    "DevTask"
  );
}

export function fromAddress(): { address: string; name: string } {
  return {
    address: envValue("MAIL_FROM_ADDRESS") ?? "hello@example.com",
    name: appName(),
  };
}

/** Blade `{{ }}` escaping (`e()`): htmlspecialchars with ENT_QUOTES. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Carbon's `toDayDateTimeString()`: `D, M j, Y g:i A` in the app timezone (UTC, like Laravel). */
export function toDayDateTimeString(date: Date, timeZone = "UTC"): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("weekday")}, ${value("month")} ${value("day")}, ${value("year")} ${value("hour")}:${value("minute")} ${value("dayPeriod")}`;
}

export function workspaceInvitationMail(input: {
  workspaceName: string;
  acceptUrl: string;
  token: string;
  expiresAt: Date | null;
}): RenderedMail {
  const name = appName();
  const workspace = escapeHtml(input.workspaceName);
  const acceptUrl = escapeHtml(input.acceptUrl);
  const token = escapeHtml(input.token);
  const expires = escapeHtml(
    input.expiresAt ? toDayDateTimeString(input.expiresAt) : "soon",
  );

  const html = [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    `    <title>${escapeHtml(name)}</title>`,
    "</head>",
    `<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">`,
    '    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">',
    "        <tr>",
    '            <td align="center">',
    '                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;padding:32px;">',
    "                    <tr>",
    '                        <td style="font-size:16px;line-height:24px;">',
    '                            <p style="margin:0 0 16px;">Hi,</p>',
    '                            <p style="margin:0 0 24px;">',
    "                                You have been invited to join the",
    `                                <strong>${workspace}</strong>`,
    `                                workspace on ${escapeHtml(name)}.`,
    "                            </p>",
    '                            <p style="margin:0 0 24px;text-align:center;">',
    `                                <a href="${acceptUrl}"`,
    '                                   style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">',
    "                                    Accept Invitation",
    "                                </a>",
    "                            </p>",
    '                            <p style="margin:0 0 8px;font-size:14px;color:#52525b;">',
    "                                Or copy and paste this link into your browser:",
    "                            </p>",
    '                            <p style="margin:0 0 24px;font-size:14px;word-break:break-all;">',
    `                                <a href="${acceptUrl}" style="color:#2563eb;">${acceptUrl}</a>`,
    "                            </p>",
    '                            <p style="margin:0 0 24px;font-size:14px;color:#52525b;">',
    `                                This invitation expires ${expires}.`,
    "                            </p>",
    '                            <p style="margin:0;font-size:14px;color:#71717a;">',
    "                                If you were not expecting this invitation, you can safely ignore this email.",
    "                            </p>",
    "                        </td>",
    "                    </tr>",
    "                </table>",
    "            </td>",
    "        </tr>",
    "    </table>",
    "</body>",
    "</html>",
    "",
  ].join("\n");

  const text = [
    `You have been invited to join the "${workspace}" workspace on ${escapeHtml(name)}.`,
    "",
    "Accept your invitation by opening the link below:",
    "",
    `    ${acceptUrl}`,
    "",
    "If the link does not work, you can also use this token:",
    "",
    `    ${token}`,
    "",
    `This invitation expires ${expires}.`,
    "",
    "If you were not expecting this invitation, you can safely ignore this email.",
    "",
  ].join("\n");

  return {
    subject: `You have been invited to ${input.workspaceName}`,
    text,
    html,
  };
}

export function taskAssignedMail(input: {
  assignedBy: string;
  taskTitle: string;
  projectName: string | null;
  url: string;
}): RenderedMail {
  const name = appName();
  const assignedBy = escapeHtml(input.assignedBy); // eslint-disable-line @typescript-eslint/no-unused-vars
  const taskTitle = escapeHtml(input.taskTitle);  // eslint-disable-line @typescript-eslint/no-unused-vars
  const projectName = escapeHtml(input.projectName ?? "—"); // eslint-disable-line @typescript-eslint/no-unused-vars
  const url = escapeHtml(input.url); // eslint-disable-line @typescript-eslint/no-unused-vars

  const html = [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    `    <title>${escapeHtml(name)}</title>`,
    "</head>",
    `<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">`,
    '    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">',
    "        <tr>",
    '            <td align="center">',
    '                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;padding:32px;">',
    "                    <tr>",
    '                        <td style="font-size:16px;line-height:24px;">',
    '                            <p style="margin:0 0 16px;">Hi,</p>',
    '                            <p style="margin:0 0 24px;">',
    `                                <strong>${escapeHtml(input.assignedBy)}</strong> assigned you a task.`,
    "                            </p>",
    '                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:#fafafa;border-radius:8px;">',
    "                                <tr>",
    '                                    <td style="padding:16px;font-size:15px;line-height:22px;">',
    `                                        <p style="margin:0 0 8px;"><strong>Task:</strong> ${escapeHtml(input.taskTitle)}</p>`,
    `                                        <p style="margin:0;"><strong>Project:</strong> ${escapeHtml(input.projectName ?? "—")}</p>`,
    "                                    </td>",
    "                                </tr>",
    "                            </table>",
    '                            <p style="margin:0 0 24px;text-align:center;">',
    `                                <a href="${escapeHtml(input.url)}"`,
    '                                   style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">',
    "                                    View Task",
    "                                </a>",
    "                            </p>",
    '                            <p style="margin:0 0 8px;font-size:14px;color:#52525b;">',
    "                                Or copy and paste this link into your browser:",
    "                            </p>",
    '                            <p style="margin:0 0 24px;font-size:14px;word-break:break-all;">',
    `                                <a href="${escapeHtml(input.url)}" style="color:#2563eb;">${escapeHtml(input.url)}</a>`,
    "                            </p>",
    '                            <p style="margin:0;font-size:14px;color:#71717a;">',
    "                                If you were not expecting this task, you can safely ignore this email.",
    "                            </p>",
    "                        </td>",
    "                    </tr>",
    "                </table>",
    "            </td>",
    "        </tr>",
    "    </table>",
    "</body>",
    "</html>",
    "",
  ].join("\n");

  const text = [
    "Hi,",
    "",
    `${escapeHtml(input.assignedBy)} assigned you a task.`,
    "",
    `    Task:    ${escapeHtml(input.taskTitle)}`,
    `    Project: ${escapeHtml(input.projectName ?? "—")}`,
    "",
    "Open the task here:",
    "",
    `    ${escapeHtml(input.url)}`,
    "",
    "If you were not expecting this task, you can safely ignore this email.",
    "",
  ].join("\n");

  return {
    subject: `You have been assigned a task: ${input.taskTitle}`,
    html,
    text,
  };
}

let cachedTransport: Transporter | null = null;

function mailerName(): string {
  return (envValue("MAIL_MAILER") ?? "log").toLowerCase();
}

function smtpTransport(): Transporter {
  if (cachedTransport) return cachedTransport;
  const host = envValue("MAIL_HOST") ?? "127.0.0.1";
  const port = Number(envValue("MAIL_PORT") ?? 587);
  const username = envValue("MAIL_USERNAME");
  const password = envValue("MAIL_PASSWORD");
  const scheme = envValue("MAIL_SCHEME");
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: scheme === "smtps" || port === 465,
    auth: username && password ? { user: username, pass: password } : undefined,
  });
  return cachedTransport;
}

/**
 * Sends a message with the configured mailer. `MAIL_MAILER=log` (the default)
 * prints instead of delivering, mirroring Laravel's log driver.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  const from = fromAddress();
  if (mailerName() !== "smtp") {
    console.info("[mail]", JSON.stringify({ from: `${from.name} <${from.address}>`, ...message }));
    return;
  }
  await smtpTransport().sendMail({
    from: { name: from.name, address: from.address },
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

export async function sendWorkspaceInvitationMail(input: {
  to: string;
  workspaceName: string;
  acceptUrl: string;
  token: string;
  expiresAt: Date | null;
}): Promise<void> {
  await sendMail({ to: input.to, ...workspaceInvitationMail(input) });
}

export async function sendTaskAssignedMail(input: {
  to: string;
  taskTitle: string;
  projectName: string | null;
  assignedBy: string;
  url: string;
}): Promise<void> {
  await sendMail({ to: input.to, ...taskAssignedMail(input) });
}
