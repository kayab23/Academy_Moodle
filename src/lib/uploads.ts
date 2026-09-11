import path from 'path';
import { rm } from 'fs/promises';
import { ResourceType } from '@prisma/client';

export const UPLOADS_ROOT = path.resolve(process.cwd(), process.env.UPLOADS_DIR || './storage/uploads');

const MB = 1024 * 1024;

export const MAX_VIDEO_SIZE_BYTES = Number(process.env.MAX_VIDEO_SIZE_MB || 200) * MB;
export const MAX_DOCUMENT_SIZE_BYTES = Number(process.env.MAX_DOCUMENT_SIZE_MB || 25) * MB;
export const MAX_IMAGE_SIZE_BYTES = Number(process.env.MAX_IMAGE_SIZE_MB || 10) * MB;

interface ResourceTypeRule {
  extensions: string[];
  mimeTypes: string[];
  maxSizeBytes: number;
  contentType: string;
}

// Reglas por tipo de recurso: se valida extensión Y mime type declarado por el
// navegador (defensa básica; suficiente porque solo staff de confianza -
// ADMIN/MANAGER/INSTRUCTOR - puede subir, no usuarios finales).
export const RESOURCE_RULES: Record<ResourceType, ResourceTypeRule> = {
  VIDEO: {
    extensions: ['.mp4', '.webm', '.mov'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxSizeBytes: MAX_VIDEO_SIZE_BYTES,
    contentType: 'video/mp4',
  },
  PPTX: {
    extensions: ['.pptx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES,
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  PDF: {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES,
    contentType: 'application/pdf',
  },
  IMAGE: {
    extensions: ['.png', '.jpg', '.jpeg', '.webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
    contentType: 'image/png',
  },
  // LINK no tiene archivo; no aplica.
  LINK: { extensions: [], mimeTypes: [], maxSizeBytes: 0, contentType: 'text/plain' },
};

export function contentTypeForExtension(ext: string): string {
  const normalized = ext.toLowerCase();
  const map: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  return map[normalized] || 'application/octet-stream';
}

/**
 * Sanitiza un nombre de archivo original para uso seguro en el filesystem:
 * quita separadores de ruta y caracteres de control, conserva la extensión.
 */
export function sanitizeFileName(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const base = path
    .basename(original, ext)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
  return `${base || 'archivo'}${ext}`;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Borra del disco la carpeta de un recurso subido (UPLOADS_ROOT/<resourceId>/).
 * Best-effort: si falla (permisos, ya no existe) se registra y se ignora —
 * la fila en la base de datos ya se borró y es la fuente de verdad; un
 * archivo huérfano en disco es una fuga de almacenamiento, no un problema
 * de integridad de datos.
 */
export async function deleteResourceFiles(resourceId: string): Promise<void> {
  try {
    await rm(path.join(UPLOADS_ROOT, resourceId), { recursive: true, force: true });
  } catch (error) {
    console.warn(`[UPLOADS] No se pudo borrar la carpeta del recurso ${resourceId}:`, (error as Error).message);
  }
}

export function validateResourceFile(
  type: ResourceType,
  fileName: string,
  mimeType: string,
  sizeBytes: number
): FileValidationResult {
  if (type === ResourceType.LINK) {
    return { valid: true };
  }

  const rule = RESOURCE_RULES[type];
  const ext = path.extname(fileName).toLowerCase();

  if (!rule.extensions.includes(ext)) {
    return { valid: false, error: `Extensión no permitida para tipo ${type}. Permitidas: ${rule.extensions.join(', ')}` };
  }

  if (mimeType && !rule.mimeTypes.includes(mimeType)) {
    return { valid: false, error: `El tipo de archivo declarado (${mimeType}) no coincide con ${type}.` };
  }

  if (sizeBytes <= 0) {
    return { valid: false, error: 'El archivo está vacío.' };
  }

  if (sizeBytes > rule.maxSizeBytes) {
    const maxMb = Math.round(rule.maxSizeBytes / MB);
    return { valid: false, error: `El archivo excede el límite de ${maxMb}MB para tipo ${type}.` };
  }

  return { valid: true };
}
