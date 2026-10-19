import { requireUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireUser(request);
    await resolveActiveWorkspace(user, request);
    return json({ message: "Logged out." });
  });
}
