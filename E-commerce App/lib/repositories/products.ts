import { getTenantDb } from "@/lib/db/tenant";
import { NotFoundError } from "@/lib/db/repository";

export type ProductRecord = {
  _id?: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  stock: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function productsCollection(
  tenantId: string,
) {
  const db = await getTenantDb(tenantId);
  return db.collection("products");
}

export async function listProducts(tenantId: string): Promise<ProductRecord[]> {
  const items = await (await productsCollection(tenantId))
    .find({ active: true })
    .sort({ createdAt: -1 })
    .toArray();
  return items as unknown as ProductRecord[];
}

export async function createProduct(
  tenantId: string,
  input: Omit<ProductRecord, "_id" | "createdAt" | "updatedAt">,
): Promise<ProductRecord> {
  const collection = await productsCollection(tenantId);
  const now = new Date();
  const product = { ...input, _id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  await collection.insertOne(product as never);
  return product;
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  input: Partial<Omit<ProductRecord, "_id" | "createdAt" | "updatedAt">>,
): Promise<ProductRecord> {
  const collection = await productsCollection(tenantId);
  const result = await collection.findOneAndUpdate(
    { _id: productId } as never,
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) throw new NotFoundError("Product");
  return result as unknown as ProductRecord;
}

export async function deleteProduct(
  tenantId: string,
  productId: string,
): Promise<void> {
  const collection = await productsCollection(tenantId);
  const result = await collection.findOneAndUpdate(
    { _id: productId } as never,
    { $set: { active: false, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) throw new NotFoundError("Product");
}
