import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth/sessions";
import { ConflictError } from "@/lib/db/repository";
import { PlatformCatalogError } from "@/lib/platform/catalog";
import { tenantsCollection } from "@/lib/repositories/tenants";
import { provisionTenant } from "@/lib/db/provision";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,63}$/),
  ownerEmail: z.string().email(),
  planId: z.string().regex(/^[a-zA-Z0-9_-]{1,63}$/).optional(),
});

export async function GET(request: NextRequest) {
  if (!(await readSession("platform"))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const query = request.nextUrl.searchParams
    .get("q")
    ?.trim()
    .slice(0, 100)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const collection = await tenantsCollection();
  const filter = query
    ? {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { slug: { $regex: query, $options: "i" } },
          { ownerEmail: { $regex: query, $options: "i" } },
        ],
      }
    : {};
  const tenants = await collection.find(filter).sort({ createdAt: -1 }).limit(100).toArray();
  return NextResponse.json({ tenants });
}

export async function POST(request: Request) {
  if (!(await readSession("platform"))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const tenant = await provisionTenant(parsed.data);
    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    if (error instanceof ConflictError || error instanceof PlatformCatalogError) {
      return NextResponse.json(
        { error: error instanceof PlatformCatalogError ? error.code : "TENANT_CONFLICT" },
        { status: error instanceof PlatformCatalogError ? error.status : 409 },
      );
    }
    console.error(
      "Tenant provisioning failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json({ error: "TENANT_PROVISIONING_FAILED" }, { status: 503 });
  }
}
