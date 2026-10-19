import { findTaskForUser, requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json, modelNotFound } from "@/lib/server/http";
import { activityLogResource } from "@/lib/server/resources";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { taskId } = await params;
    if (!/^\d+$/.test(taskId)) throw modelNotFound("Task", taskId);
    const task = await findTaskForUser(user, Number(taskId));

    const logs = await prisma.taskActivityLog.findMany({
      where: { taskId: task.id },
      orderBy: { id: "desc" },
    });

    return json({ data: logs.map(activityLogResource) });
  });
}
