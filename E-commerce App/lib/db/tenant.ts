import type { Db } from "mongodb";
import { getMongoClient } from "@/lib/db/client";

export function assertTenantId(tenantId: string): void {
  if (!/^[a-zA-Z0-9_-]{1,63}$/.test(tenantId)) {
    throw new Error("Invalid tenant id");
  }
}

export async function getTenantDb(tenantId: string): Promise<Db> {
  assertTenantId(tenantId);
  const client = await getMongoClient();
  return client.db(`t_${tenantId}`);
}
