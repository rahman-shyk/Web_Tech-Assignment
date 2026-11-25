import { authorize, type Actor } from "@/lib/auth/authorize";
import { readSession, type SessionPayload } from "@/lib/auth/sessions";
import type { Document } from "@/lib/db/types";
import { getTenantDb } from "@/lib/db/tenant";
import { findTenantById, type TenantRecord } from "@/lib/repositories/tenants";

type StaffSession = Extract<SessionPayload, { realm: "staff" }>;

type StaffMemberRecord = Document & {
  tenantId: string;
  email: string;
  permissions?: unknown;
  active?: boolean;
};

export type StaffAccessResult =
  | {
      authorized: true;
      session: StaffSession;
      tenant: TenantRecord;
    }
  | {
      authorized: false;
      error: string;
      status: 401 | 403;
    };

export function buildStaffActor(
  session: StaffSession,
  member: StaffMemberRecord,
): Actor | null {
  const memberEmail = member.email.toLowerCase();
  if (
    member.active === false ||
    session.tenantId !== member.tenantId ||
    session.email.toLowerCase() !== memberEmail ||
    (session.id !== String(member._id) && session.id !== memberEmail)
  ) {
    return null;
  }

  const permissions = Array.isArray(member.permissions)
    ? member.permissions.filter(
        (permission): permission is string => typeof permission === "string",
      )
    : [];
  return {
    id: String(member._id),
    realm: "staff",
    tenantId: member.tenantId,
    permissions,
  };
}

export async function resolveStaffAccess(
  permission: string,
): Promise<StaffAccessResult> {
  const session = await readSession("staff");
  if (!session || session.realm !== "staff") {
    return { authorized: false, error: "UNAUTHORIZED", status: 401 };
  }

  const tenant = await findTenantById(session.tenantId);
  if (!tenant || tenant.status !== "active") {
    return { authorized: false, error: "STORE_SUSPENDED", status: 403 };
  }

  const member = await (await getTenantDb(tenant._id))
    .collection<StaffMemberRecord>("staff")
    .findOne({
      tenantId: tenant._id,
      email: session.email.toLowerCase(),
    });
  if (!member) {
    return { authorized: false, error: "UNAUTHORIZED", status: 401 };
  }

  const actor = buildStaffActor(session, member);
  if (!actor) {
    return { authorized: false, error: "UNAUTHORIZED", status: 401 };
  }
  if (!actor.permissions.includes(permission)) {
    return { authorized: false, error: "FORBIDDEN", status: 403 };
  }

  await authorize(actor, permission, { tenantId: tenant._id });
  return { authorized: true, session, tenant };
}
