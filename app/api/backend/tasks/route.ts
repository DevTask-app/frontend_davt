import {
  assertAssigneeInWorkspace,
  assertParentTaskInProject,
  assertProjectInUserWorkspaces,
  authorizeTaskCreate,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json, modelNotFound, validationError } from "@/lib/server/http";
import { buildPagination, parsePagination } from "@/lib/server/pagination";
import { taskResource } from "@/lib/server/resources";
import { createTask } from "@/lib/server/task-actions";
import { queryTasks } from "@/lib/server/task-query";
import {
  parseOrThrow,
  parseQueryOrThrow,
  taskQuerySchema,
  taskStoreFlatSchema,
} from "@/lib/server/validation";

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    const active = await resolveActiveWorkspace(user, request);

    const filters = parseQueryOrThrow(taskQuerySchema, new URL(request.url).searchParams);
    const { page, perPage } = parsePagination(filters.page, filters.per_page, 15);

    const { total, tasks } = await queryTasks({
      filters,
      baseWhere: { project: { workspaceId: active.workspace.id } },
    });

    return json(
      buildPagination(
        tasks.map((task) => taskResource(task)),
        total,
        page,
        perPage,
        new URL(request.url),
      ),
    );
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    const active = await resolveActiveWorkspace(user, request);
    const input = parseOrThrow(taskStoreFlatSchema, await request.json().catch(() => null));

    const errors: Record<string, string[]> = {};
    const project =
      input.project_id !== undefined
        ? await assertProjectInUserWorkspaces(user, input.project_id, errors)
        : null;
    if (project && input.assignee_id !== undefined && input.assignee_id !== null) {
      await assertAssigneeInWorkspace(project.workspaceId, input.assignee_id, errors);
    }
    if (project && input.parent_task_id !== undefined && input.parent_task_id !== null) {
      await assertParentTaskInProject(input.parent_task_id, project.id, null, errors);
    }
    if (Object.keys(errors).length > 0) throw validationError(errors);
    if (!project) throw validationError({ project_id: ["The selected project is invalid."] });

    const scopedProject = await prisma.project.findFirst({
      where: { id: project.id, workspaceId: active.workspace.id },
    });
    if (!scopedProject) throw modelNotFound("Project", input.project_id);

    await authorizeTaskCreate(user, scopedProject);

    const task = await createTask({
      projectId: scopedProject.id,
      userId: user.id,
      data: input,
    });

    return json({ data: taskResource(task) }, 201);
  });
}
