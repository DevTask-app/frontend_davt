import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { buildPagination } from "@/lib/server/pagination";
import { notificationResource } from "@/lib/server/resources";

const NOTIFIABLE_TYPE = "App\\Models\\User";

/** Laravel `(int)` cast: leading integer, NaN -> 0. */
function intParam(raw: string | null): number {
  const value = raw === null ? NaN : parseInt(raw, 10);
  return Number.isNaN(value) ? 0 : value;
}

function clampPage(raw: string | null): number {
  const page = intParam(raw);
  return page >= 1 ? page : 1;
}

/** Notifications paginate silently (no 422): per_page clamped to [1, 100], default 15. */
function clampPerPage(raw: string | null): number {
  if (raw === null) return 15;
  return Math.max(1, Math.min(100, intParam(raw)));
}

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);

    const url = new URL(request.url);
    const page = clampPage(url.searchParams.get("page"));
    const perPage = clampPerPage(url.searchParams.get("per_page"));
    const where = { notifiableId: user.id, notifiableType: NOTIFIABLE_TYPE };

    const [total, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return json(buildPagination(items.map(notificationResource), total, page, perPage, url));
  });
}
