import { prisma } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { ACCESS_TOKEN_EXPIRES_IN, signAccessToken } from "@/lib/server/jwt";
import { hitRateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";
import { assertEmailAvailable } from "@/lib/server/auth";
import { parseOrThrow, registerSchema } from "@/lib/server/validation";
import bcrypt from "bcryptjs";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const limit = hitRateLimit(`register|${clientIp(request)}`, 6, 60);
    if (!limit.allowed) {
      return json(
        { message: "Too Many Attempts." },
        429,
        rateLimitHeaders(limit),
      );
    }

    const input = parseOrThrow(registerSchema, await request.json().catch(() => null));

    const errors: Record<string, string[]> = {};
    await assertEmailAvailable(input.email, errors);
    if (Object.keys(errors).length > 0) {
      return json({ message: "The given data was invalid.", errors }, 422);
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: await bcrypt.hash(input.password, 10),
        role: "User",
      },
    });

    const accessToken = await signAccessToken(user.id);

    return json(
      {
        access_token: accessToken,
        token_type: "bearer",
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
      },
      201,
    );
  });
}
