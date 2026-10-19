export interface MailMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * Phase 1 mailer: mirrors Laravel's log mail driver by printing the message.
 * SMTP delivery via Mailpit arrives in Phase 2 together with notifications.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  console.info(
    "[mail]",
    JSON.stringify({
      from: process.env.MAIL_FROM_NAME
        ? `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`
        : process.env.MAIL_FROM_ADDRESS,
      ...message,
    }),
  );
}

export async function sendWorkspaceInvitationMail(input: {
  to: string;
  workspaceName: string;
  inviterName: string;
  acceptUrl: string;
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: `You have been invited to join ${input.workspaceName} on DevTask`,
    body:
      `${input.inviterName} invited you to join the workspace "${input.workspaceName}".\n\n` +
      `Accept the invitation: ${input.acceptUrl}\n`,
  });
}

export async function sendTaskAssignedMail(input: {
  to: string;
  taskTitle: string;
  assignedBy: string;
  url: string;
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: `You have been assigned a task: ${input.taskTitle}`,
    body:
      `${input.assignedBy} assigned you to the task "${input.taskTitle}".\n\n` +
      `Open the task: ${input.url}\n`,
  });
}
