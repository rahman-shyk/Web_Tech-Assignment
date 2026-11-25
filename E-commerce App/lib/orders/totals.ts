export type OrderLineAmount = {
  quantity: number;
  unitPriceMinor: number;
};

export type OrderTotals = {
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export function calculateOrderTotals(
  lines: readonly OrderLineAmount[],
  options: { shippingMinor?: number; taxRateBasisPoints?: number } = {},
): OrderTotals {
  if (
    !lines.length ||
    lines.some(
      (line) =>
        !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 ||
        !Number.isSafeInteger(line.unitPriceMinor) ||
        line.unitPriceMinor < 0,
    )
  ) {
    throw new Error("Order lines must have positive quantities and valid prices");
  }

  const shippingMinor = options.shippingMinor ?? 0;
  const taxRateBasisPoints = options.taxRateBasisPoints ?? 0;
  if (
    !Number.isSafeInteger(shippingMinor) ||
    shippingMinor < 0 ||
    !Number.isSafeInteger(taxRateBasisPoints) ||
    taxRateBasisPoints < 0
  ) {
    throw new Error("Shipping and tax values must be non-negative integers");
  }

  const subtotalMinor = lines.reduce(
    (subtotal, line) => subtotal + line.quantity * line.unitPriceMinor,
    0,
  );
  if (!Number.isSafeInteger(subtotalMinor + shippingMinor)) {
    throw new Error("Order total exceeds the supported amount");
  }

  const taxMinor = Math.round((subtotalMinor * taxRateBasisPoints) / 10_000);
  const totalMinor = subtotalMinor + shippingMinor + taxMinor;
  if (!Number.isSafeInteger(totalMinor)) {
    throw new Error("Order total exceeds the supported amount");
  }

  return { subtotalMinor, shippingMinor, taxMinor, totalMinor };
}
