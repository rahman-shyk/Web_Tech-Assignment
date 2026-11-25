import type {
  EmailAdapter,
  JobQueue,
  PaymentAdapter,
  ShippingAdapter,
  StorageAdapter,
} from "@/lib/adapters/types";

export const mockPayment: PaymentAdapter = {
  async createIntent(input) {
    return {
      id: `pay_${input.tenantId}_${Date.now()}`,
      status: "created",
    };
  },
};

export const mockShipping: ShippingAdapter = {
  async createShipment(input) {
    return { trackingNumber: `track_${input.orderId}` };
  },
};

export const consoleEmail: EmailAdapter = {
  async send(input) {
    console.log("[email]", input.tenantId, input.to, input.subject);
  },
};

const memory = new Map<string, Uint8Array>();
export const memoryStorage: StorageAdapter = {
  async put(key, content) {
    memory.set(key, content);
    return `memory://${key}`;
  },
  async get(key) {
    return memory.get(key) ?? null;
  },
};

export const inMemoryJobQueue: JobQueue = {
  async enqueue(job, payload) {
    console.log("[job]", job, payload);
    return { id: `job_${Date.now()}` };
  },
};
