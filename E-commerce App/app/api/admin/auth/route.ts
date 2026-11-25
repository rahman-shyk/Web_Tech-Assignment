import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findTenantBySlug } from "@/lib/repositories/tenants";
import { getTenantDb } from "@/lib/db/tenant";
import { createSession } from "@/lib/auth/sessions";
import { checkRateLimit } from "@/lib/security/rateLimit";

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,63}$/),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(12)
    .max(72)
    .refine((password) => new TextEncoder().encode(password).length <= 72),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(`staff-login:${parsed.data.slug}:${ip}`, 5, 900_000).allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const tenant = await findTenantBySlug(parsed.data.slug);
  if (!tenant || tenant.status !== "active") {
    return NextResponse.json({ error: "STORE_UNAVAILABLE" }, { status: 403 });
  }
  const db = await getTenantDb(tenant._id);
  const member = await db.collection("staff").findOne({
    tenantId: tenant._id,
    email: parsed.data.email,
  });
  if (
    !member ||
    typeof member.passwordHash !== "string" ||
    typeof member.email !== "string" ||
    !(await bcrypt.compare(parsed.data.password, member.passwordHash))
  ) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  await createSession({
    realm: "staff",
    id: String(member._id),
    tenantId: tenant._id,
    email: member.email,
  });
  return NextResponse.json({ ok: true, tenant });
}
