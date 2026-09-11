import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from './db';
import { logActivity } from './activity';

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return true;
  if (now - record.lastAttempt > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(key);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now - record.lastAttempt > LOCKOUT_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
  } else {
    record.count += 1;
    record.lastAttempt = now;
  }
}

function resetAttempts(key: string): void {
  loginAttempts.delete(key);
}

const credentialsSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  ssoToken: z.string().optional(),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        ssoToken: { label: 'SSO Token', type: 'text' },
      },
      async authorize(rawCredentials, req) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        // Flujo A: Autenticación por token de un solo uso (SSO Bridge desde SIGE)
        if (parsed.data.ssoToken) {
          const rawToken = parsed.data.ssoToken.trim();
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

          const ssoRecord = await db.ssoToken.findUnique({
            where: { tokenHash },
            include: { user: { include: { company: true } } },
          });

          if (
            !ssoRecord ||
            ssoRecord.used ||
            ssoRecord.expiresAt < new Date() ||
            !ssoRecord.user.isActive ||
            !ssoRecord.user.company.isActive
          ) {
            return null;
          }

          // Consumir el token de forma atómica: el `where` exige used=false,
          // así que si dos requests llegan casi al mismo tiempo con el mismo
          // token, solo uno de los `updateMany` afecta una fila.
          const consumed = await db.ssoToken.updateMany({
            where: { id: ssoRecord.id, used: false },
            data: { used: true, usedAt: new Date() },
          });

          if (consumed.count === 0) {
            return null;
          }

          const user = ssoRecord.user;

          await logActivity({
            userId: user.id,
            action: 'SSO_LOGIN',
            entityType: 'User',
            entityId: user.id,
            metadata: { origin: 'SIGE_BRIDGE', email: user.email },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
            companySlug: user.company.slug,
            locale: user.locale,
          };
        }

        // Flujo B: Autenticación normal por Email + Password
        const { email, password } = parsed.data;
        if (!email || !password) {
          return null;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Rate limiting IP + email (SPEC.md 1.1)
        const ip = req?.headers ? (req.headers['x-forwarded-for'] as string) || 'local' : 'local';
        const rateLimitKey = `${ip}:${normalizedEmail}`;

        if (!checkRateLimit(rateLimitKey)) {
          throw new Error('RATE_LIMITED');
        }

        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
          include: { company: true },
        });

        if (!user || !user.isActive || !user.company.isActive) {
          recordFailedAttempt(rateLimitKey);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          recordFailedAttempt(rateLimitKey);
          return null;
        }

        // Login exitoso
        resetAttempts(rateLimitKey);

        // Registro de auditoría (SPEC.md 1.11)
        await logActivity({
          userId: user.id,
          action: 'USER_LOGIN',
          entityType: 'User',
          entityId: user.id,
          metadata: { companyId: user.companyId, email: user.email },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          companySlug: user.company.slug,
          locale: user.locale,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companySlug = user.companySlug;
        token.locale = user.locale;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.companySlug = token.companySlug;
        session.user.locale = token.locale;
      }
      return session;
    },
  },
};
