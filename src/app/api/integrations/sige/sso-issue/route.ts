import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { Role } from '@prisma/client';

const ssoIssueSchema = z.object({
  email: z.string().email('Email inválido'),
  fullName: z.string().min(1, 'Nombre completo requerido'),
  companySlug: z.string().min(1, 'Slug de empresa requerido'),
  role: z.string().optional(),
});

// Rate limit dedicado a esta ruta: aunque requiere el token de servicio,
// una comparación de igualdad normal no es de tiempo constante, así que
// limitamos intentos por IP como defensa en profundidad contra fuerza bruta.
const issueAttempts = new Map<string, { count: number; windowStart: number }>();
const ISSUE_MAX_ATTEMPTS = 20;
const ISSUE_WINDOW_MS = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = issueAttempts.get(ip);
  if (!record || now - record.windowStart > ISSUE_WINDOW_MS) {
    issueAttempts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  record.count += 1;
  return record.count > ISSUE_MAX_ATTEMPTS;
}

function isValidServiceToken(authHeader: string | null, expected: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const provided = Buffer.from(authHeader.slice('Bearer '.length));
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) {
    // Igual costo aproximado que una comparación real, para no filtrar la longitud por tiempo.
    crypto.timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return crypto.timingSafeEqual(provided, expectedBuf);
}

function mapSigeRole(rawRole?: string): Role {
  if (!rawRole) return Role.COLLABORATOR;
  const upper = rawRole.toUpperCase();
  if (upper === 'ADMIN' || upper === 'DIRECCION') return Role.ADMIN;
  if (upper === 'GERENTE' || upper === 'COORDINADOR' || upper === 'MANAGER') return Role.MANAGER;
  if (upper === 'INSTRUCTOR' || upper === 'DOCENTE') return Role.INSTRUCTOR;
  return Role.COLLABORATOR;
}

// Usuarios que siempre deben tener ADMIN en Academy, sin importar el rol que
// mande SIGE (ni cambios futuros de rol en SIGE). Se reconcilia en cada login.
const ADMIN_ROLE_OVERRIDE_EMAILS = new Set([
  'academy02@redbeat.mx', // Jean Brandon Pioquinto Escalona
  'academy@redbeat.mx', // Anabel Barraza López
  'di.academy02@redbeat.mx', // Miriam Montserrat Carranza Alcántara
  'di.academy03@redbeat.mx', // Diana Paola Ramírez Cabrera
]);

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
  }

  const authHeader = req.headers.get('authorization');
  const serviceToken = process.env.SIGE_SERVICE_TOKEN;

  if (!serviceToken || !isValidServiceToken(authHeader, serviceToken)) {
    return NextResponse.json(
      { error: 'No autorizado. Token de servicio no válido o no configurado.' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición JSON inválido' }, { status: 400 });
  }

  const parseResult = ssoIssueSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Datos incompletos o inválidos', details: parseResult.error.flatten() },
      { status: 422 }
    );
  }

  const { email, fullName, companySlug, role } = parseResult.data;
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedSlug = companySlug.toLowerCase().trim();

  // 1. Validar que la empresa exista
  const company = await db.company.findUnique({
    where: { slug: normalizedSlug },
  });

  if (!company || !company.isActive) {
    return NextResponse.json(
      { error: `La empresa '${normalizedSlug}' no existe o no está activa en Academy LMS.` },
      { status: 422 }
    );
  }

  // 2. Buscar o crear usuario (Arquitectura de identidad: SIGE manda, Academy obedece)
  let user = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  const isAdminOverride = ADMIN_ROLE_OVERRIDE_EMAILS.has(normalizedEmail);
  const targetRole = isAdminOverride ? Role.ADMIN : mapSigeRole(role);

  if (!user) {
    // Generar hash aleatorio seguro (no se usará para login por password)
    const dummyHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

    user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: fullName.trim(),
        passwordHash: dummyHash,
        role: targetRole,
        companyId: company.id,
        locale: 'es',
        isActive: true,
      },
    });

    await logActivity({
      userId: user.id,
      action: 'USER_PROVISIONED_VIA_SSO',
      entityType: 'User',
      entityId: user.id,
      metadata: { origin: 'SIGE', email: user.email, companySlug: normalizedSlug, roleOverride: isAdminOverride },
    });
  } else if (!user.isActive) {
    return NextResponse.json(
      { error: 'El usuario se encuentra inactivo en Academy LMS.' },
      { status: 403 }
    );
  } else if (isAdminOverride && user.role !== Role.ADMIN) {
    // Reconciliar en cada login: si SIGE cambia el rol de esta persona, Academy lo ignora.
    user = await db.user.update({
      where: { id: user.id },
      data: { role: Role.ADMIN },
    });

    await logActivity({
      userId: user.id,
      action: 'USER_ROLE_OVERRIDDEN_VIA_SSO',
      entityType: 'User',
      entityId: user.id,
      metadata: { origin: 'SIGE', email: user.email, newRole: Role.ADMIN },
    });
  }

  // 3. Generar token de acceso de un solo uso (corta expiración: 60s)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 1000); // 60 segundos

  await db.ssoToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
      used: false,
    },
  });

  await logActivity({
    userId: user.id,
    action: 'SSO_TOKEN_ISSUED',
    entityType: 'User',
    entityId: user.id,
    metadata: { origin: 'SIGE', email: user.email },
  });

  const baseUrl = process.env.NEXTAUTH_URL || 'https://academy.corposuitekrv.com';
  const accessUrl = `${baseUrl}/enlace-acceso?token=${rawToken}`;

  return NextResponse.json({ accessUrl });
}
