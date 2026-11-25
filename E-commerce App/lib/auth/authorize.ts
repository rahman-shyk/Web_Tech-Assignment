export type Actor = {
  id: string;
  realm: "platform" | "staff" | "customer";
  tenantId?: string;
  permissions: readonly string[];
};

export type Resource = {
  tenantId?: string;
  ownerId?: string;
};

export async function authorize(
  actor: Actor,
  permission: string,
  resource: Resource,
): Promise<void> {
  if (!actor.permissions.includes(permission)) {
    throw new Error("FORBIDDEN");
  }
  if (actor.realm !== "platform" && resource.tenantId !== actor.tenantId) {
    throw new Error("FORBIDDEN");
  }
}
