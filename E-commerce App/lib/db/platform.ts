import type { Db } from "mongodb";
import { getMongoClient } from "@/lib/db/client";
import { getEnv } from "@/lib/env";

export async function getPlatformDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getEnv().PLATFORM_DB_NAME ?? "platform");
}
