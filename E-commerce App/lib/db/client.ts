import { MongoClient } from "mongodb";
import { getEnv } from "@/lib/env";

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClient(): Promise<MongoClient> {
  if (!global.mongoClientPromise) {
    global.mongoClientPromise = new MongoClient(getEnv().MONGODB_URI).connect();
  }
  return global.mongoClientPromise;
}
