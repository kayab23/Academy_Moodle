import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { markNotificationAsRead } from '@/lib/notifications';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    await markNotificationAsRead(params.notificationId, user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[NOTIFICATION_MARK_READ_ERROR]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
