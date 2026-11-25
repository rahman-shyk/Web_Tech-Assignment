import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

export type SessionPayload =
  | { realm: "platform"; id: string; email: string }
  | { realm: "staff"; id: string; tenantId: string; email: string }
  | { realm: "customer"; id: string; tenantId: string; email: string };

function cookieName(realm: SessionPayload["realm"]) {
  return realm === "platform"
    ? "platform_session"
    : realm === "staff"
      ? "staff_session"
      : "customer_session";
}

function secret() {
  const value = getEnv().AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is required");
  return new TextEncoder().encode(value);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
  (await cookies()).set(cookieName(payload.realm), token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return token;
}

export async function readSession(
  realm: SessionPayload["realm"],
): Promise<SessionPayload | null> {
  const token = (await cookies()).get(cookieName(realm))?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.realm !== realm) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession(realm: SessionPayload["realm"]) {
  (await cookies()).delete(cookieName(realm));
}
