export const orderStatuses = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

export function allowedOrderTransitions(status: OrderStatus): readonly OrderStatus[] {
  return transitions[status];
}

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return transitions[from].includes(to);
}
