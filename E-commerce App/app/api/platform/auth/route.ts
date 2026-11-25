import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { createSession } from "@/lib/auth/sessions";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const env = getEnv();
  if (
    !env.AUTH_SECRET ||
    !env.SUPER_ADMIN_EMAIL ||
    !env.SUPER_ADMIN_PASSWORD_HASH
  ) {
    return NextResponse.json({ error: "SUPER_ADMIN_NOT_CONFIGURED" }, { status: 503 });
  }
  const passwordValid = await bcrypt.compare(
    parsed.data.password,
    env.SUPER_ADMIN_PASSWORD_HASH,
  );
  if (
    parsed.data.email.toLowerCase() !== env.SUPER_ADMIN_EMAIL.toLowerCase() ||
    !passwordValid
  ) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  await createSession({
    realm: "platform",
    id: "super-admin",
    email: env.SUPER_ADMIN_EMAIL,
  });
  return NextResponse.json({ ok: true });
}
