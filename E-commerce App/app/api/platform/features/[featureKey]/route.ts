import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth/sessions";
import {
  isFeatureKey,
  PlatformCatalogError,
  setPlatformFeatureEnabled,
} from "@/lib/platform/catalog";

const schema = z.object({ enabled: z.boolean() });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ featureKey: string }> },
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
  const { featureKey } = await context.params;
  if (!isFeatureKey(featureKey)) {
    return NextResponse.json({ error: "FEATURE_NOT_FOUND" }, { status: 404 });
  }
  try {
    const feature = await setPlatformFeatureEnabled(featureKey, parsed.data.enabled);
    return NextResponse.json({ feature });
  } catch (error) {
    if (error instanceof PlatformCatalogError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
