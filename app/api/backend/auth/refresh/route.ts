import { requireRefreshUser, resolveActiveWorkspace } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { ACCESS_TOKEN_EXPIRES_IN, signAccessToken } from "@/lib/server/jwt";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const user = await requireRefreshUser(request);
    await resolveActiveWorkspace(user, request);

    const accessToken = await signAccessToken(user.id);

    return json({
      access_token: accessToken,
      token_type: "bearer",
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
    });
  });
}
