import { NextRequest } from 'next/server';

/**
 * En producción la cookie de sesión usa SameSite=None (requerido para que
 * funcione embebida en el iframe de SIGE), por lo que SameSite deja de ser
 * una defensa CSRF válida: el navegador SÍ adjunta la cookie en peticiones
 * cross-site. Todo handler que mute datos (Server Action o ruta /api) debe
 * verificar el origen con esta función en vez de confiar en la cookie sola.
 *
 * Se compara contra NEXTAUTH_URL (configurado por el operador), nunca contra
 * el Host de la propia petición, que un atacante controla.
 */
export function isTrustedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');

  // Sin header Origin: no es una petición cross-site fetch/XHR (algunos
  // navegadores lo omiten en ciertas navegaciones same-origin). No se puede
  // demostrar que sea un ataque, así que se deja pasar; el header, cuando
  // está presente, es la señal confiable a validar.
  if (!origin) return true;

  const trustedUrl = process.env.NEXTAUTH_URL;
  if (!trustedUrl) return false;

  try {
    return new URL(origin).origin === new URL(trustedUrl).origin;
  } catch {
    return false;
  }
}
