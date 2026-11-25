import type { Db, Document } from "mongodb";

export interface AuditEvent extends Document {
  tenantId: string | null;
  actorId: string;
  action: string;
  resource: string;
  resourceId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export async function appendAuditEvent(db: Db, event: AuditEvent) {
  await db.collection<AuditEvent>("audit_events").insertOne({
    ...event,
    timestamp: event.timestamp ?? new Date(),
  });
}
