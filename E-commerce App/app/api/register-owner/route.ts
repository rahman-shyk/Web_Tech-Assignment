import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ConflictError } from "@/lib/db/repository";
import { provisionTenant } from "@/lib/db/provision";
import { getTenantDb } from "@/lib/db/tenant";
import { createSession } from "@/lib/auth/sessions";

const schema = z.object({
  storeName: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,63}$/),
  ownerName: z.string().trim().min(2).max(80),
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
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const tenant = await provisionTenant({
      name: parsed.data.storeName,
      slug: parsed.data.slug,
      ownerEmail: parsed.data.email,
    });
    const db = await getTenantDb(tenant._id);
    const staffResult = await db.collection("staff").insertOne({
      tenantId: tenant._id,
      name: parsed.data.ownerName,
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: "owner",
      permissions: ["catalog:read", "catalog:write", "orders:read", "orders:write", "settings:write", "staff:write"],
      createdAt: new Date(),
    });
    await createSession({
      realm: "staff",
      id: String(staffResult.insertedId),
      tenantId: tenant._id,
      email: tenant.ownerEmail,
    });
    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: "STORE_ALREADY_EXISTS" }, { status: 409 });
    }
    console.error(
      "Owner registration failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "REGISTRATION_FAILED" }, { status: 503 });
  }
}
