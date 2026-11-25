import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth/sessions";
import { ConflictError, NotFoundError } from "@/lib/db/repository";
import { updateTenantStatus } from "@/lib/repositories/tenants";

const schema = z.object({
  status: z.enum(["active", "suspended", "archived"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string }> },
) {
  if (!(await readSession("platform"))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
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
  const { tenantId } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,63}$/.test(tenantId)) {
    return NextResponse.json({ error: "INVALID_TENANT_ID" }, { status: 400 });
  }
  try {
    const tenant = await updateTenantStatus(tenantId, parsed.data.status);
    return NextResponse.json({ tenant });
  } catch (error) {
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: "INVALID_STATUS_TRANSITION" }, { status: 409 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
    }
    throw error;
  }
}
