import { db } from './db';
import { NotificationType } from '@prisma/client';
import nodemailer from 'nodemailer';

export interface CreateNotificationParams {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
}

/**
 * Crea una notificación en la base de datos y opcionalmente envía correo si SMTP está configurado.
 */
export async function createNotification({
  userId,
  type = NotificationType.SYSTEM,
  title,
  message,
  linkUrl = null,
}: CreateNotificationParams) {
  try {
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        linkUrl,
      },
    });

    // Envío opcional por correo si hay configuración SMTP en .env
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpFrom = process.env.SMTP_FROM || 'Academy LMS <noreply@corposuitekrv.com>';

    if (smtpHost && smtpUser && smtpPass) {
      // Disparar en segundo plano sin bloquear
      (async () => {
        try {
          const user = await db.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
          });

          if (user?.email) {
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: smtpPort,
              secure: smtpPort === 465,
              auth: {
                user: smtpUser,
                pass: smtpPass,
              },
            });

            await transporter.sendMail({
              from: smtpFrom,
              to: `"${user.name}" <${user.email}>`,
              subject: title,
              text: `${message}\n\nAccede a la plataforma para más detalles: ${process.env.NEXTAUTH_URL || 'https://academy.corposuitekrv.com'}${linkUrl || ''}`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                  <h2>${title}</h2>
                  <p>${message}</p>
                  ${
                    linkUrl
                      ? `<p><a href="${process.env.NEXTAUTH_URL || 'https://academy.corposuitekrv.com'}${linkUrl}" style="background: #0070f3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver en Academy</a></p>`
                      : ''
                  }
                </div>
              `,
            });
          }
        } catch (emailErr) {
          // Loguear error de correo sin interrumpir
          console.warn('[SMTP] No se pudo enviar notificación por email:', emailErr);
        }
      })();
    }

    return notification;
  } catch (err) {
    console.error('Error al crear notificación:', err);
    return null;
  }
}

/**
 * Obtiene notificaciones de un usuario con conteo de no leídas.
 */
export async function getUserNotifications(userId: string, limit = 20) {
  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return { notifications, unreadCount };
}

/**
 * Marca una notificación como leída.
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  return db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

/**
 * Marca todas las notificaciones pendientes de un usuario como leídas.
 */
export async function markAllNotificationsAsRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
