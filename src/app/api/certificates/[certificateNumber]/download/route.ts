import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import path from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { UPLOADS_ROOT } from '@/lib/uploads';
import { generateCertificatePdfBytes } from '@/lib/certificates';

export async function GET(
  req: NextRequest,
  { params }: { params: { certificateNumber: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const certificate = await db.certificate.findUnique({
      where: { certificateNumber: params.certificateNumber },
      include: {
        course: {
          include: {
            instructor: { select: { name: true } },
          },
        },
        user: {
          include: { company: true },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificado no encontrado' }, { status: 404 });
    }

    // Validación de permisos multi-empresa
    if (user.role === Role.COLLABORATOR && certificate.userId !== user.id) {
      return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 });
    }

    if (
      user.role === Role.MANAGER &&
      certificate.user.companyId !== user.companyId
    ) {
      return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 });
    }

    // Un instructor solo puede descargar certificados de los cursos que él
    // mismo imparte, nunca de otro instructor ni de otra empresa.
    if (
      user.role === Role.INSTRUCTOR &&
      certificate.course.instructorId !== user.id
    ) {
      return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 });
    }

    const certDir = path.join(UPLOADS_ROOT, 'certificates');
    const filePath = path.join(certDir, `${certificate.certificateNumber}.pdf`);

    let pdfBytes: Buffer;

    if (existsSync(filePath)) {
      pdfBytes = await readFile(filePath);
    } else {
      // Regenerar en caliente si no existe en disco
      const uint8 = await generateCertificatePdfBytes({
        studentName: certificate.user.name,
        courseTitle: certificate.course.title,
        companyName: certificate.user.company?.name || 'Grupo Empresarial KRV',
        companySlug: certificate.user.company?.slug || 'krv',
        primaryColorHex: certificate.user.company?.primaryColor,
        secondaryColorHex: certificate.user.company?.secondaryColor,
        certificateNumber: certificate.certificateNumber,
        finalGrade: certificate.finalGrade,
        issueDate: certificate.issuedAt,
        instructorName: certificate.course.instructor?.name,
      });

      pdfBytes = Buffer.from(uint8);
      await mkdir(certDir, { recursive: true });
      await writeFile(filePath, pdfBytes);
    }

    const response = new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-${certificate.certificateNumber}.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    });

    return response;
  } catch (err: unknown) {
    console.error('[CERTIFICATE_DOWNLOAD_ERROR]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
