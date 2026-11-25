import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth/sessions";
import {
  featureKeys,
  PlatformCatalogError,
  updatePlatformPlan,
} from "@/lib/platform/catalog";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
  enabled: z.boolean(),
  featureKeys: z.array(z.enum(featureKeys)).max(featureKeys.length),
  version: z.number().int().positive(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ planId: string }> },
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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { planId } = await context.params;
  if (!/^[a-z0-9][a-z0-9_-]{1,62}$/.test(planId)) {
    return NextResponse.json({ error: "INVALID_PLAN_ID" }, { status: 400 });
  }
  try {
    const plan = await updatePlatformPlan(planId, parsed.data);
    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof PlatformCatalogError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
