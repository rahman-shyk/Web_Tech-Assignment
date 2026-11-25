import { NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/lib/auth/sessions";
import {
  createPlatformPlan,
  featureKeys,
  listPlatformCatalog,
  PlatformCatalogError,
} from "@/lib/platform/catalog";

const createSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,62}$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
  featureKeys: z.array(z.enum(featureKeys)).max(featureKeys.length),
});

export async function GET() {
  if (!(await readSession("platform"))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json(await listPlatformCatalog());
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
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    const plan = await createPlatformPlan(parsed.data);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    if (error instanceof PlatformCatalogError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
