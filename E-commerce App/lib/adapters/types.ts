export interface PaymentAdapter {
  createIntent(input: {
    tenantId: string;
    amountMinor: number;
    currency: string;
  }): Promise<{ id: string; status: "created" | "succeeded" }>;
}

export interface ShippingAdapter {
  createShipment(input: {
    tenantId: string;
    orderId: string;
  }): Promise<{ trackingNumber: string }>;
}

export interface EmailAdapter {
  send(input: {
    tenantId: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<void>;
}

export interface StorageAdapter {
  put(key: string, content: Uint8Array): Promise<string>;
  get(key: string): Promise<Uint8Array | null>;
}

export interface JobQueue {
  enqueue<T>(job: string, payload: T): Promise<{ id: string }>;
}
