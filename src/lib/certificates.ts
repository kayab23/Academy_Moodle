import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from './db';
import { UPLOADS_ROOT } from './uploads';
import { calculateCourseProgress } from './progress';
import { calculateCourseGrade } from './grading';
import { createNotification } from './notifications';
import { logActivity } from './activity';
import { NotificationType } from '@prisma/client';

export interface GeneratePdfParams {
  studentName: string;
  courseTitle: string;
  companyName: string;
  companySlug?: string;
  primaryColorHex?: string | null;
  secondaryColorHex?: string | null;
  certificateNumber: string;
  finalGrade: number;
  issueDate: Date;
  instructorName?: string | null;
}

/**
 * Convierte color hexadecimal (#RRGGBB) a valores normalizados rgb(r, g, b) de pdf-lib.
 */
function hexToRgb(hex: string | null | undefined, fallback: [number, number, number]) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) {
    return rgb(fallback[0], fallback[1], fallback[2]);
  }
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Genera el documento PDF vectorial en formato apaisado (Landscape A4: 842 x 595 pt)
 * con doble marco decorativo y branding corporativo.
 */
export async function generateCertificatePdfBytes(params: GeneratePdfParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);

  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Colores corporativos según la empresa
  const primaryColor = hexToRgb(params.primaryColorHex, [0.06, 0.46, 0.43]); // Default teal
  const secondaryColor = hexToRgb(params.secondaryColorHex, [0.85, 0.65, 0.13]); // Default gold
  const textColor = rgb(0.12, 0.14, 0.17);
  const mutedColor = rgb(0.45, 0.48, 0.53);

  // 1. Marco exterior
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 802,
    height: 555,
    borderColor: primaryColor,
    borderWidth: 4,
  });

  // 2. Marco interior fino
  page.drawRectangle({
    x: 28,
    y: 28,
    width: 786,
    height: 539,
    borderColor: secondaryColor,
    borderWidth: 1.5,
  });

  // 3. Filete decorativo superior
  page.drawLine({
    start: { x: 120, y: 535 },
    end: { x: 722, y: 535 },
    thickness: 1,
    color: secondaryColor,
  });

  // Helper para centrar texto
  const drawCenteredText = (
    text: string,
    y: number,
    size: number,
    font: typeof fontTimes,
    color = textColor
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (842 - textWidth) / 2,
      y,
      size,
      font,
      color,
    });
  };

  // Encabezado institucional
  drawCenteredText(params.companyName.toUpperCase(), 500, 16, fontHelveticaBold, primaryColor);
  drawCenteredText('ACADEMIA CORPORATIVA & DESARROLLO DE TALENTO', 482, 10, fontHelvetica, mutedColor);

  drawCenteredText('OTORGA EL PRESENTE', 445, 12, fontHelvetica, mutedColor);
  drawCenteredText('CERTIFICADO DE ACREDITACIÓN', 415, 26, fontTimesBold, primaryColor);

  drawCenteredText('A:', 380, 11, fontHelvetica, mutedColor);

  // Nombre del Estudiante
  drawCenteredText(params.studentName, 345, 24, fontTimesBold, textColor);

  // Línea bajo el nombre
  const studentWidth = fontTimesBold.widthOfTextAtSize(params.studentName, 24);
  page.drawLine({
    start: { x: (842 - studentWidth) / 2 - 20, y: 338 },
    end: { x: (842 + studentWidth) / 2 + 20, y: 338 },
    thickness: 1,
    color: secondaryColor,
  });

  // Texto de acreditación del curso
  drawCenteredText(
    'Por haber acreditado satisfactoriamente los objetivos y lecciones requeridas del curso:',
    305,
    11,
    fontTimes,
    mutedColor
  );

  // Título del Curso
  drawCenteredText(`"${params.courseTitle}"`, 275, 18, fontTimesBold, primaryColor);

  // Detalle de nota y cumplimiento
  const gradeText = `Con una calificación final de ${params.finalGrade}% de aprovechamiento.`;
  drawCenteredText(gradeText, 245, 11, fontHelveticaBold, textColor);

  // Fecha y Folio
  const formattedDate = params.issueDate.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  drawCenteredText(`Emitido el ${formattedDate}`, 215, 10, fontHelvetica, mutedColor);

  // Firmas y sellos al pie
  const leftSigX = 160;
  const rightSigX = 530;
  const sigLineY = 110;

  // Firma izquierda: Instructor / Capacitador
  page.drawLine({
    start: { x: leftSigX, y: sigLineY },
    end: { x: leftSigX + 180, y: sigLineY },
    thickness: 1,
    color: mutedColor,
  });
  const instructorLabel = params.instructorName || 'Instructor Asignado';
  page.drawText(instructorLabel, {
    x: leftSigX + (180 - fontHelveticaBold.widthOfTextAtSize(instructorLabel, 10)) / 2,
    y: sigLineY - 14,
    size: 10,
    font: fontHelveticaBold,
    color: textColor,
  });
  page.drawText('Instructor del Curso', {
    x: leftSigX + (180 - fontHelvetica.widthOfTextAtSize('Instructor del Curso', 8)) / 2,
    y: sigLineY - 26,
    size: 8,
    font: fontHelvetica,
    color: mutedColor,
  });

  // Firma derecha: Dirección Académica
  page.drawLine({
    start: { x: rightSigX, y: sigLineY },
    end: { x: rightSigX + 180, y: sigLineY },
    thickness: 1,
    color: mutedColor,
  });
  page.drawText('Dirección de Capacitación', {
    x: rightSigX + (180 - fontHelveticaBold.widthOfTextAtSize('Dirección de Capacitación', 10)) / 2,
    y: sigLineY - 14,
    size: 10,
    font: fontHelveticaBold,
    color: textColor,
  });
  page.drawText('Acreditación y Cumplimiento KRV', {
    x: rightSigX + (180 - fontHelvetica.widthOfTextAtSize('Acreditación y Cumplimiento KRV', 8)) / 2,
    y: sigLineY - 26,
    size: 8,
    font: fontHelvetica,
    color: mutedColor,
  });

  // Folio de verificación al centro inferior
  const folioText = `Folio Oficial de Verificación: ${params.certificateNumber}`;
  drawCenteredText(folioText, 55, 9, fontHelveticaBold, primaryColor);

  return pdfDoc.save();
}

/**
 * Valida si un usuario cumple los requisitos para obtener el certificado de un curso
 * y lo emite automáticamente si aún no ha sido generado (PLAN.md l. 228).
 */
export async function checkAndIssueCertificate(userId: string, courseId: string) {
  // 1. Verificar progreso 100% en lecciones requeridas
  const progress = await calculateCourseProgress(userId, courseId);
  if (!progress.isFullyCompleted) {
    return null;
  }

  // 2. Obtener curso y verificar calificación aprobatoria
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { name: true } },
    },
  });

  if (!course) return null;

  const courseGrade = await calculateCourseGrade(userId, courseId);
  let finalGrade = courseGrade.finalGrade;

  if (finalGrade === null) {
    // Si el curso no tiene quizzes/evaluaciones obligatorias con nota, el 100% de asistencia acredita con 100%
    finalGrade = 100;
  } else if (finalGrade < course.passingScore) {
    // No alcanzó la nota aprobatoria
    return null;
  }

  // 3. Verificar si el certificado ya fue emitido
  const existingCert = await db.certificate.findFirst({
    where: { userId, courseId },
  });

  if (existingCert) {
    return existingCert;
  }

  // 4. Obtener datos del alumno y de su empresa para el branding
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!user) return null;

  const company = user.company;
  const companySlug = company?.slug || 'krv';
  const companyCode = companySlug.toUpperCase().slice(0, 4);
  const year = new Date().getFullYear();
  const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
  const certificateNumber = `ACAD-${companyCode}-${year}-${randomHex}`;

  // 5. Generar PDF
  const pdfBytes = await generateCertificatePdfBytes({
    studentName: user.name,
    courseTitle: course.title,
    companyName: company?.name || 'Grupo Empresarial KRV',
    companySlug,
    primaryColorHex: company?.primaryColor,
    secondaryColorHex: company?.secondaryColor,
    certificateNumber,
    finalGrade,
    issueDate: new Date(),
    instructorName: course.instructor?.name,
  });

  // 6. Guardar archivo físico en el directorio de almacenamiento
  const certDir = path.join(UPLOADS_ROOT, 'certificates');
  await mkdir(certDir, { recursive: true });
  const filePath = path.join(certDir, `${certificateNumber}.pdf`);
  await writeFile(filePath, Buffer.from(pdfBytes));

  // 7. Registrar en la base de datos
  const certificate = await db.certificate.create({
    data: {
      certificateNumber,
      title: `Certificado: ${course.title}`,
      userId,
      courseId,
      finalGrade,
      pdfUrl: `/api/certificates/${certificateNumber}/download`,
      issuedAt: new Date(),
    },
  });

  // 8. Crear notificación in-app para el usuario
  await createNotification({
    userId,
    type: NotificationType.CERTIFICATE,
    title: '¡Certificado de Acreditación Disponible!',
    message: `Has completado satisfactoriamente "${course.title}" con ${finalGrade}% de calificación. Tu certificado oficial ya está disponible para descargar.`,
    linkUrl: '/certificates',
  });

  // 9. Registrar evento de auditoría
  await logActivity({
    userId,
    action: 'CERTIFICATE_ISSUED',
    entityType: 'Certificate',
    entityId: certificate.id,
    metadata: {
      certificateNumber,
      courseId,
      finalGrade,
      companySlug,
    },
  });

  return certificate;
}
