import { createHash, randomUUID } from "node:crypto";
import type { ClientSession, Collection, Db, Document } from "@/lib/db/types";
import { getMongoClient } from "@/lib/db/client";
import {
  allowedOrderTransitions,
  canTransitionOrder,
  type OrderStatus,
} from "@/lib/orders/state";
import { calculateOrderTotals } from "@/lib/orders/totals";

export type CreateOrderInput = {
  items: { productId: string; quantity: number }[];
  customer: { name: string; email: string; phone: string };
  address: {
    line1: string;
    line2: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
};

export type OrderRecord = Omit<Document, "_id"> & {
  _id: string;
  number: string;
  tenantId: string;
  customerId: string;
  customer: CreateOrderInput["customer"];
  address: CreateOrderInput["address"];
  items: {
    productId: string;
    name: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }[];
  totals: {
    subtotalMinor: number;
    shippingMinor: number;
    taxMinor: number;
    totalMinor: number;
  };
  currency: string;
  payment: { method: "cash_on_delivery"; status: "pending" };
  status: OrderStatus;
  idempotencyKey: string;
  requestHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProductRecord = Omit<Document, "_id"> & {
  _id: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
};

export class OrderServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly allowedStatuses?: readonly OrderStatus[],
  ) {
    super(code);
  }
}

function hashRequest(input: CreateOrderInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function replayOrder(
  order: OrderRecord,
  requestHash: string,
): OrderRecord {
  if (order.requestHash !== requestHash) {
    throw new OrderServiceError("IDEMPOTENCY_KEY_REUSED", 409);
  }
  return order;
}

function asMinorUnits(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new OrderServiceError("PRODUCT_UNAVAILABLE", 409);
  }
  const minor = Math.round(value * 100);
  if (!Number.isSafeInteger(minor)) {
    throw new OrderServiceError("PRODUCT_UNAVAILABLE", 409);
  }
  return minor;
}

function settingAmount(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

async function findExistingOrder(
  orders: Collection<OrderRecord>,
  idempotencyKey: string,
  requestHash: string,
): Promise<OrderRecord | null> {
  const existing = (await orders.findOne({ idempotencyKey })) as OrderRecord | null;
  return existing ? replayOrder(existing, requestHash) : null;
}

export async function createStoreOrder(
  db: Db,
  tenantId: string,
  input: CreateOrderInput,
  idempotencyKey: string,
): Promise<OrderRecord> {
  const orders = db.collection<OrderRecord>("orders");
  await orders.createIndex(
    { idempotencyKey: 1 },
    {
      unique: true,
      partialFilterExpression: { idempotencyKey: { $type: "string" } },
    },
  );
  await orders.createIndex({ status: 1, createdAt: -1 });
  const requestHash = hashRequest(input);
  const existing = await findExistingOrder(orders, idempotencyKey, requestHash);
  if (existing) return existing;

  const client = await getMongoClient();
  const session = client.startSession();
  let createdOrder: OrderRecord | undefined;

  try {
    await session.withTransaction(async () => {
      type CustomerRecord = Omit<Document, "_id"> & {
        _id: string;
        name: string;
        email: string;
        phone?: string;
      };
      const products = db.collection<ProductRecord>("products");
      const orderItems: OrderRecord["items"] = [];

      for (const item of input.items) {
        const product = await products.findOne(
          { _id: item.productId, active: true },
          { session },
        );
        if (!product || typeof product.name !== "string") {
          throw new OrderServiceError("PRODUCT_UNAVAILABLE", 409);
        }

        const unitPriceMinor = asMinorUnits(product.price);
        const reserved = await products.updateOne(
          { _id: item.productId, active: true, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity }, $set: { updatedAt: new Date() } },
          { session },
        );
        if (reserved.modifiedCount !== 1) {
          throw new OrderServiceError("OUT_OF_STOCK", 409);
        }
        orderItems.push({
          productId: item.productId,
          name: product.name,
          quantity: item.quantity,
          unitPriceMinor,
          lineTotalMinor: unitPriceMinor * item.quantity,
        });
      }

      const settings = await db
        .collection<Document>("settings")
        .findOne({ tenantId }, { session });
      const subtotalMinor = orderItems.reduce(
        (sum, item) => sum + item.lineTotalMinor,
        0,
      );
      const freeShippingThreshold = settingAmount(
        settings?.freeShippingThresholdMinor,
        Number.MAX_SAFE_INTEGER,
      );
      const shippingMinor =
        subtotalMinor >= freeShippingThreshold
          ? 0
          : settingAmount(settings?.shippingFlatRateMinor);
      const totals = calculateOrderTotals(orderItems, {
        shippingMinor,
        taxRateBasisPoints: settingAmount(settings?.taxRateBasisPoints),
      });

      const customers = db.collection<CustomerRecord>("customers");
      const customer = await customers.findOne(
        { tenantId, email: input.customer.email },
        { session },
      );
      let customerId: string;
      if (!customer) {
        customerId = randomUUID();
        await customers.insertOne(
          {
            _id: customerId,
            tenantId,
            name: input.customer.name,
            email: input.customer.email,
            phone: input.customer.phone,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { session },
        );
      } else {
        customerId = String(customer._id);
      }

      const counter = await db
        .collection<{ _id: string; value: number }>("counters")
        .findOneAndUpdate(
          { _id: "orders" },
          { $inc: { value: 1 } },
          { upsert: true, returnDocument: "after", session },
        );
      const sequence = counter?.value ?? 1;
      const now = new Date();
      createdOrder = {
        _id: randomUUID(),
        number: `ORD-${String(sequence).padStart(6, "0")}`,
        tenantId,
        customerId,
        customer: input.customer,
        address: input.address,
        items: orderItems,
        totals,
        currency:
          typeof settings?.currency === "string" &&
          /^[A-Z]{3}$/.test(settings.currency)
            ? settings.currency
            : "USD",
        payment: { method: "cash_on_delivery", status: "pending" },
        status: "pending",
        idempotencyKey,
        requestHash,
        createdAt: now,
        updatedAt: now,
      };

      await orders.insertOne(createdOrder, { session });
      await db.collection("order_events").insertOne(
        {
          tenantId,
          orderId: createdOrder._id,
          fromStatus: null,
          toStatus: "pending",
          actorId: `customer:${createdOrder.customerId}`,
          createdAt: now,
        },
        { session },
      );
    });
  } catch (error) {
    const replay = await findExistingOrder(orders, idempotencyKey, requestHash);
    if (replay) return replay;
    throw error;
  } finally {
    await session.endSession();
  }

  if (!createdOrder) {
    throw new Error("Order transaction completed without creating an order");
  }
  return createdOrder;
}

export async function transitionOrder(
  db: Db,
  tenantId: string,
  orderId: string,
  nextStatus: OrderStatus,
  actorId: string,
): Promise<OrderRecord | null> {
  const orders = db.collection<OrderRecord>("orders");
  const client = await getMongoClient();
  const session: ClientSession = client.startSession();
  let updated: OrderRecord | null = null;

  try {
    await session.withTransaction(async () => {
      const current = await orders.findOne(
        { _id: orderId, tenantId },
        { session },
      );
      if (!current) return;
      if (current.status === nextStatus) {
        updated = current;
        return;
      }

      if (!canTransitionOrder(current.status, nextStatus)) {
        throw new OrderServiceError(
          "INVALID_TRANSITION",
          409,
          allowedOrderTransitions(current.status),
        );
      }

      const result = await orders.findOneAndUpdate(
        { _id: orderId, tenantId, status: current.status },
        { $set: { status: nextStatus, updatedAt: new Date() } },
        { returnDocument: "after", session },
      );
      if (!result) {
        throw new OrderServiceError("ORDER_CHANGED", 409);
      }
      updated = result;

      if (nextStatus === "cancelled") {
        for (const item of current.items) {
          await db.collection<ProductRecord>("products").updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity }, $set: { updatedAt: new Date() } },
            { session },
          );
        }
      }

      await db.collection("order_events").insertOne(
        {
          tenantId,
          orderId,
          fromStatus: current.status,
          toStatus: nextStatus,
          actorId,
          createdAt: new Date(),
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return updated;
}
