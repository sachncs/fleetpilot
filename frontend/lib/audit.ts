import { z } from 'zod';

import { getDb } from './db';
import { auditLog } from './db/schema';

const AUDIT_MAX_PAYLOAD_BYTES = 8 * 1024;

const auditPayloadSchema = z.unknown();

export interface AuditEntry {
  entity: string;
  entityId: string;
  action: string;
  actor?: string;
  payload?: unknown;
}

/**
 * Single source of truth for audit writes. Usable from API routes and the
 * worker. Payload is zod-validated (any JSON) and hard-capped at 8KB.
 */
export function writeAudit(entry: AuditEntry): void {
  let payloadJson: string | null = null;

  if (entry.payload !== undefined) {
    auditPayloadSchema.parse(entry.payload);
    payloadJson = JSON.stringify(entry.payload);
    if (Buffer.byteLength(payloadJson, 'utf8') > AUDIT_MAX_PAYLOAD_BYTES) {
      payloadJson = JSON.stringify({ truncated: true });
    }
  }

  getDb()
    .insert(auditLog)
    .values({
      entity: entry.entity,
      entityId: entry.entityId,
      action: entry.action,
      actor: entry.actor ?? 'system',
      payloadJson,
    })
    .run();
}
