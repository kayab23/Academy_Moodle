import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAuth } from '@/lib/scope';
import { getUserNotifications, markAllNotificationsAsRead } from '@/lib/notifications';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = requireAuth(session);

    const data = await getUserNotifications(user.id);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
