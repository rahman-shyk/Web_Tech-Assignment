import type {
  Collection,
  Document,
  Filter,
  IndexDescription,
  Sort,
} from "mongodb";
import type { Db } from "mongodb";

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} was not found`);
  }
}

export class ConflictError extends DomainError {
  constructor(message = "Resource conflict") {
    super("CONFLICT", message);
  }
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export async function paginate<T extends Document>(
  collection: Collection<T>,
  filter: Filter<T>,
  options: { cursor?: string; limit?: number; sort?: Sort },
): Promise<Page<T>> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const cursorFilter = options.cursor
    ? ({ ...filter, _id: { $gt: options.cursor } } as Filter<T>)
    : filter;
  const items = await collection
    .find(cursorFilter, {
      sort: options.sort ?? { _id: 1 },
      limit: limit + 1,
    })
    .toArray();
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const last = pageItems.at(-1);
  return {
    items: pageItems as T[],
    nextCursor:
      hasMore && last && "_id" in last && typeof last._id === "string"
        ? last._id
        : null,
  };
}

export async function ensureIndexes(
  db: Db,
  collectionName: string,
  indexes: IndexDescription[],
) {
  await db.collection(collectionName).createIndexes(indexes);
}
