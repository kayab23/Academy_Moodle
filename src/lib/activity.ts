import { db } from './db';
import { Prisma } from '@prisma/client';

export interface LogActivityParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Registra una acción sensible en ActivityLog (SPEC.md 1.11)
 */
export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  metadata,
}: LogActivityParams): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        userId: userId ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (error) {
    // Registro de auditoría no debe romper el flujo de la aplicación si falla, pero sí loguear el error
    console.error('[ActivityLog Error]:', error);
  }
}
