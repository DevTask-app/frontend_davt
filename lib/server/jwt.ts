import { SignJWT, jwtVerify } from "jose";

export const ACCESS_TOKEN_EXPIRES_IN = 3600;

// tymon JWTAuth refresh window: refresh_ttl (20160 minutes).
const REFRESH_CLOCK_TOLERANCE_SECONDS = 20160 * 60;

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(userId: number): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRES_IN}s`)
    .sign(secretKey());
}

async function verifyToken(token: string, clockTolerance?: number): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      secretKey(),
      clockTolerance !== undefined ? { clockTolerance } : undefined,
    );
    const subject = payload.sub;
    if (typeof subject !== "string" || !/^\d+$/.test(subject)) return null;
    return Number(subject);
  } catch {
    return null;
  }
}

export async function verifyAccessToken(token: string): Promise<number | null> {
  return verifyToken(token);
}

export async function verifyRefreshToken(token: string): Promise<number | null> {
  return verifyToken(token, REFRESH_CLOCK_TOLERANCE_SECONDS);
}
