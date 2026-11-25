import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/db/client";
import { getEnv } from "@/lib/env";

export async function GET() {
  try {
    const client = await getMongoClient();
    await client.db(getEnv().PLATFORM_DB_NAME ?? "platform").command({ ping: 1 });
    return NextResponse.json({
      status: "ok",
      database: "connected",
      platformDatabase: getEnv().PLATFORM_DB_NAME ?? "platform",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const code =
      error instanceof Error && error.message.includes("environment")
        ? "INVALID_ENVIRONMENT"
        : "MONGODB_UNAVAILABLE";
    return NextResponse.json({
      status: "error",
      database: "disconnected",
      timestamp: new Date().toISOString(),
      error: code,
    }, { status: 503 });
  }
}
