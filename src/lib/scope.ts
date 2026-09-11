import { Role } from '@prisma/client';
import { Session } from 'next-auth';

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role: Role;
  companyId: string;
  companySlug?: string;
  locale: string;
}

export class AuthorizationError extends Error {
  constructor(message = 'Acceso denegado') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Valida que la sesión exista y contenga usuario autenticado.
 */
export function requireAuth(session: Session | null): AuthenticatedUser {
  if (!session?.user || !session.user.id || !session.user.companyId || !session.user.role) {
    throw new AuthorizationError('Sesión inválida o no autenticada');
  }
  return session.user as unknown as AuthenticatedUser;
}

/**
 * Valida que el usuario autenticado tenga uno de los roles permitidos.
 */
export function requireRole(session: Session | null, allowedRoles: Role[]): AuthenticatedUser {
  const user = requireAuth(session);
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError('Permisos insuficientes para esta operación');
  }
  return user;
}

/**
 * Retorna filtro Prisma de aislamiento multi-empresa.
 * Para ADMIN: {} (ve todas las empresas).
 * Para cualquier otro rol: { companyId: user.companyId }.
 */
export function getCompanyScope(user: AuthenticatedUser): { companyId?: string } {
  if (user.role === Role.ADMIN) {
    return {};
  }
  return { companyId: user.companyId };
}

/**
 * Verifica si el usuario puede acceder a recursos de una empresa específica.
 */
export function canAccessCompany(user: AuthenticatedUser, targetCompanyId: string): boolean {
  if (user.role === Role.ADMIN) {
    return true;
  }
  return user.companyId === targetCompanyId;
}

/**
 * Verifica si un usuario puede ver o inscribirse a un curso según la empresa.
 * Cursos sin asignaciones de empresa son globales (visibles para todos).
 */
export function canAccessCourse(
  user: AuthenticatedUser,
  course: { assignedCompanies?: { companyId: string }[] }
): boolean {
  if (user.role === Role.ADMIN) return true;
  if (!course.assignedCompanies || course.assignedCompanies.length === 0) return true;
  return course.assignedCompanies.some((ac) => ac.companyId === user.companyId);
}

/**
 * Verifica si un usuario puede administrar un curso (crear módulos/lecciones,
 * subir recursos). No es lo mismo que poder verlo (canAccessCourse):
 * - ADMIN: cualquier curso.
 * - INSTRUCTOR: solo los cursos donde es el instructor asignado.
 * - MANAGER: cursos sin empresas asignadas todavía, o ya asignados a su propia empresa.
 * - COLLABORATOR: nunca.
 */
export function canManageCourse(
  user: AuthenticatedUser,
  course: { instructorId?: string | null; assignedCompanies?: { companyId: string }[] }
): boolean {
  if (user.role === Role.ADMIN) return true;
  if (user.role === Role.INSTRUCTOR) return course.instructorId === user.id;
  if (user.role === Role.MANAGER) {
    if (!course.assignedCompanies || course.assignedCompanies.length === 0) return true;
    return course.assignedCompanies.some((ac) => ac.companyId === user.companyId);
  }
  return false;
}

/**
 * Roles habilitados para crear/administrar contenido de cursos.
 */
export function canCreateCourses(user: AuthenticatedUser): boolean {
  return user.role === Role.ADMIN || user.role === Role.MANAGER || user.role === Role.INSTRUCTOR;
}
