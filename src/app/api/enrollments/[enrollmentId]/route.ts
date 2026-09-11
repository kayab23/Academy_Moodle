import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth, canManageCourse } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { EnrollmentStatus } from '@prisma/client';

export async function DELETE(req: NextRequest, { params }: { params: { enrollmentId: string } }) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  let user;
  try {
    user = requireAuth(session);
  } catch {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const enrollment = await db.enrollment.findUnique({
    where: { id: params.enrollmentId },
    include: {
      course: { include: { assignedCompanies: true } },
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 });
  }

  // Solo el propio alumno o un administrador/instructor del curso puede cancelar la inscripción
  const isOwner = enrollment.userId === user.id;
  const isStaff = canManageCourse(user, enrollment.course);

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: 'No tienes permiso para cancelar esta inscripción' }, { status: 403 });
  }

  try {
    const updated = await db.enrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.SUSPENDED },
    });

    await logActivity({
      userId: user.id,
      action: 'ENROLLMENT_CANCELLED',
      entityType: 'Enrollment',
      entityId: updated.id,
      metadata: { courseId: enrollment.courseId, targetUserId: enrollment.userId },
    });

    return NextResponse.json({ success: true, status: updated.status });
  } catch (error) {
    console.error('[ENROLLMENT_CANCEL_ERROR]', error);
    return NextResponse.json({ error: 'No se pudo cancelar la inscripción' }, { status: 500 });
  }
}
