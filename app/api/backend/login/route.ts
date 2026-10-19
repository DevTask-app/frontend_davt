import { prisma } from "@/lib/server/db";
import { handle, HttpError, json } from "@/lib/server/http";
import { ACCESS_TOKEN_EXPIRES_IN, signAccessToken } from "@/lib/server/jwt";
import { hitRateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";
import { parseOrThrow, loginSchema } from "@/lib/server/validation";
import bcrypt from "bcryptjs";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const body = await request.json().catch(() => null);
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    const limit = hitRateLimit(`login|${email}|${clientIp(request)}`, 5, 60);
    if (!limit.allowed) {
      return json(
        { message: "Too Many Attempts." },
        429,
        rateLimitHeaders(limit),
      );
    }

    const input = parseOrThrow(loginSchema, body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      throw new HttpError(401, "Invalid credentials.");
    }

    const accessToken = await signAccessToken(user.id);

    return json({
      access_token: accessToken,
      token_type: "bearer",
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
    });
  });
}
