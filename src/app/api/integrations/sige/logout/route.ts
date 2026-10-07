import { NextRequest, NextResponse } from 'next/server';
import { isTrustedOrigin } from '@/lib/csrf';

/**
 * Cierre de sesión en cascada desde SIGE (SIGE-PLT-001 B.4).
 * `public/sige-logout.js` llama aquí al recibir `sige:logout`. Con sesión JWT de NextAuth no hay nada
 * que revocar en el servidor: se vencen las cookies de sesión (con los mismos atributos con que se emitieron,
 * si no el navegador no las reemplaza). Idempotente y sin datos sensibles; valida el origen como el resto de mutaciones.
 */
export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  }

  const isProd = process.env.NODE_ENV === 'production';
  const res = NextResponse.json({ ok: true });
  // NextAuth parte la cookie en .0/.1/... si el JWT es grande
  const base = isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  for (const name of [base, `${base}.0`, `${base}.1`, `${base}.2`]) {
    res.cookies.set(name, '', {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: '/',
      maxAge: 0,
    });
  }
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
