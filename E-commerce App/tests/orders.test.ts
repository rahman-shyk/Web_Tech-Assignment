import { describe, expect, it } from "vitest";
import { calculateOrderTotals } from "@/lib/orders/totals";
import {
  allowedOrderTransitions,
  canTransitionOrder,
} from "@/lib/orders/state";

describe("order totals", () => {
  it("calculates subtotals, shipping, and tax using integer minor units", () => {
    expect(
      calculateOrderTotals(
        [
          { quantity: 2, unitPriceMinor: 1250 },
          { quantity: 1, unitPriceMinor: 999 },
        ],
        { shippingMinor: 500, taxRateBasisPoints: 750 },
      ),
    ).toEqual({
      subtotalMinor: 3499,
      shippingMinor: 500,
      taxMinor: 262,
      totalMinor: 4261,
    });
  });

  it("rejects empty or invalid order lines", () => {
    expect(() => calculateOrderTotals([])).toThrow("Order lines");
    expect(() =>
      calculateOrderTotals([{ quantity: 0, unitPriceMinor: 100 }]),
    ).toThrow("Order lines");
  });
});

describe("order state transitions", () => {
  it("only allows forward fulfillment transitions and cancellation before packing", () => {
    expect(canTransitionOrder("pending", "confirmed")).toBe(true);
    expect(canTransitionOrder("processing", "cancelled")).toBe(true);
    expect(canTransitionOrder("packed", "cancelled")).toBe(false);
    expect(canTransitionOrder("completed", "processing")).toBe(false);
    expect(allowedOrderTransitions("shipped")).toEqual(["delivered"]);
  });

  it("keeps completed and cancelled orders terminal", () => {
    expect(allowedOrderTransitions("completed")).toEqual([]);
    expect(allowedOrderTransitions("cancelled")).toEqual([]);
  });
});
