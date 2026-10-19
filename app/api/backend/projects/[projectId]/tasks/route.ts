import {
  authorizeTaskCreate,
  findProjectForUser,
  requireUser,
  resolveActiveWorkspace,
} from "@/lib/server/auth";
import { handle, json, modelNotFound, validationError } from "@/lib/server/http";
import { buildPagination, parsePagination } from "@/lib/server/pagination";
import { taskResource } from "@/lib/server/resources";
import { createTask } from "@/lib/server/task-actions";
import { queryTasks } from "@/lib/server/task-query";
import {
  parseOrThrow,
  parseQueryOrThrow,
  taskQuerySchema,
  taskStoreNestedSchema,
} from "@/lib/server/validation";
import {
  assertAssigneeInWorkspace,
  assertParentTaskInProject,
} from "@/lib/server/auth";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { projectId } = await params;
    if (!/^\d+$/.test(projectId)) throw modelNotFound("Project", projectId);
    const project = await findProjectForUser(user, Number(projectId));

    const filters = parseQueryOrThrow(taskQuerySchema, new URL(request.url).searchParams);
    const { page, perPage } = parsePagination(filters.page, filters.per_page, 15);

    const { total, tasks } = await queryTasks({
      filters,
      baseWhere: { projectId: project.id },
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

export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    const { projectId } = await params;
    if (!/^\d+$/.test(projectId)) throw modelNotFound("Project", projectId);
    const project = await findProjectForUser(user, Number(projectId));
    const input = parseOrThrow(taskStoreNestedSchema, await request.json().catch(() => null));

    const errors: Record<string, string[]> = {};
    if (input.assignee_id !== undefined && input.assignee_id !== null) {
      await assertAssigneeInWorkspace(project.workspaceId, input.assignee_id, errors);
    }
    if (input.parent_task_id !== undefined && input.parent_task_id !== null) {
      await assertParentTaskInProject(input.parent_task_id, project.id, null, errors);
    }
    if (Object.keys(errors).length > 0) throw validationError(errors);

    await authorizeTaskCreate(user, project);

    const task = await createTask({
      projectId: project.id,
      userId: user.id,
      data: input,
    });

    return json({ data: taskResource(task) }, 201);
  });
}
