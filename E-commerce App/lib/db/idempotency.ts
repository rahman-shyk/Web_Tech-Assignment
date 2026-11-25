import type {
  Collection,
  Document,
  Filter,
  OptionalUnlessRequiredId,
} from "mongodb";

export async function withIdempotency<T extends Document>(
  collection: Collection<T>,
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const existing = await collection.findOne({
    idempotencyKey: key,
  } as unknown as Filter<T>);
  if (existing) return existing as T;

  const result = await operation();
  await collection.insertOne({
    ...result,
    idempotencyKey: key,
  } as unknown as OptionalUnlessRequiredId<T>);
  return result;
}
