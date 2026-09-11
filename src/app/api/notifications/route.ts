import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth } from '@/lib/scope';
import { isTrustedOrigin } from '@/lib/csrf';
import { getUserNotifications, markAllNotificationsAsRead } from '@/lib/notifications';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const data = await getUserNotifications(user.id);
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error('[NOTIFICATIONS_GET_ERROR]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const { pathname } = req.nextUrl;
    if (pathname.endsWith('/mark-all-read') || req.nextUrl.searchParams.get('action') === 'mark-all-read') {
      await markAllNotificationsAsRead(user.id);
      return NextResponse.json({ success: true });
    }

    // Default: marcar todas como leídas
    await markAllNotificationsAsRead(user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[NOTIFICATIONS_MARK_READ_ERROR]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
