import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isTrustedOrigin } from '@/lib/csrf';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const pathname = req.nextUrl.pathname;

    // Defensa CSRF: en producción la cookie de sesión es SameSite=None
    // (requerida por el embed en SIGE), así que se valida el origen a mano
    // en toda mutación (Server Actions llegan como POST a la misma ruta).
    if (req.method !== 'GET' && req.method !== 'HEAD' && !isTrustedOrigin(req)) {
      return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
    }

    const isLoginPage = pathname === '/login';

    if (isLoginPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.next();
    }

    if (!isAuth) {
      const from = encodeURIComponent(pathname + req.nextUrl.search);
      return NextResponse.redirect(new URL(`/login?from=${from}`, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/courses/:path*',
    '/my-learning/:path*',
    '/gradebook/:path*',
    '/certificates/:path*',
    '/users/:path*',
    '/reports/:path*',
    '/admin/:path*',
    '/login',
  ],
};
