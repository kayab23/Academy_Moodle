import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
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
  email: z.string().email(),
  password: z.string().min(8),
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
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCredentials, req) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
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
