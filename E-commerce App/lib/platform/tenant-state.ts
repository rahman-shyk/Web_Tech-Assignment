export type TenantStatus = "pending" | "active" | "suspended" | "archived";

const transitions: Record<TenantStatus, readonly TenantStatus[]> = {
  pending: ["archived"],
  active: ["suspended", "archived"],
  suspended: ["active", "archived"],
  archived: [],
};

export function canTransitionTenantStatus(
  current: TenantStatus,
  next: TenantStatus,
): boolean {
  return transitions[current].includes(next);
}
