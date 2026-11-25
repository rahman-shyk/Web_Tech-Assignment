import { headers } from "next/headers";
import { getEnv } from "@/lib/env";
import { assertTenantId } from "@/lib/db/tenant";

export interface TenantContext {
  tenantId: string;
  realm: "platform" | "staff" | "customer";
}

export function resolveTenantFromHost(host: string): string | null {
  const normalized = host.split(":")[0].toLowerCase();
  const mapping = getEnv().TENANT_HOST_MAP;
  if (mapping) {
    try {
      const hosts = JSON.parse(mapping) as Record<string, string>;
      const mapped = hosts[normalized];
      if (mapped) {
        assertTenantId(mapped);
        return mapped;
      }
    } catch {
      throw new Error("TENANT_HOST_MAP must be a JSON object");
    }
  }

  const subdomain = normalized.split(".")[0];
  if (subdomain && subdomain !== "localhost" && subdomain !== "www") {
    assertTenantId(subdomain);
    return subdomain;
  }
  return null;
}

export async function getTenantContext(
  realm: TenantContext["realm"] = "staff",
): Promise<TenantContext | null> {
  const incomingHeaders = await headers();
  const tenantId = resolveTenantFromHost(incomingHeaders.get("host") ?? "");
  return tenantId ? { tenantId, realm } : null;
}
