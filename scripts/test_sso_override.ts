import assert from 'assert';
import crypto from 'crypto';
import { db } from '../src/lib/db';
import { authOptions } from '../src/lib/auth';
import { Role } from '@prisma/client';

async function main() {
  console.log('🧪 Iniciando verificación de B3-Academy (SSO Company Override)...');

  // 1. Validar que las 3 empresas existen y están activas
  const slugs = ['kezelmedica', 'vitaris', 'redbeat'];
  for (const slug of slugs) {
    let company = await db.company.findUnique({ where: { slug } });
    if (!company) {
      console.log(`Creando empresa faltante: ${slug}`);
      company = await db.company.create({
        data: {
          name: slug.charAt(0).toUpperCase() + slug.slice(1),
          slug,
          isActive: true,
        },
      });
    }
    assert(company.isActive, `La empresa ${slug} debe estar activa`);
    console.log(`  ✅ Empresa ${slug} existe y está activa (id: ${company.id})`);
  }

  const kezel = (await db.company.findUnique({ where: { slug: 'kezelmedica' } }))!;
  const vitaris = (await db.company.findUnique({ where: { slug: 'vitaris' } }))!;

  // 2. Crear usuario de prueba asociado a kezelmedica
  const testEmail = `superadmin-test-${Date.now()}@redbeat.mx`;
  const testUser = await db.user.create({
    data: {
      email: testEmail,
      name: 'Super Admin Test',
      passwordHash: 'dummy',
      role: Role.ADMIN,
      companyId: kezel.id,
      isActive: true,
    },
  });

  const credentialsProvider = authOptions.providers[0] as any;
  assert(credentialsProvider, 'CredentialsProvider debe existir');
  const authorizeFn = credentialsProvider.options.authorize;

  // 3. Caso A: Token con override (ej. Vitaris)
  const rawTokenOverride = crypto.randomBytes(32).toString('hex');
  const tokenHashOverride = crypto.createHash('sha256').update(rawTokenOverride).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 1000);

  await db.ssoToken.create({
    data: {
      tokenHash: tokenHashOverride,
      userId: testUser.id,
      companyOverrideId: vitaris.id,
      expiresAt,
      used: false,
    },
  });

  const sessionOverride = await authorizeFn(
    { ssoToken: rawTokenOverride },
    {} as any
  );
  assert(sessionOverride, 'La sesión con token override debe autorizarse');
  assert.strictEqual(sessionOverride.companyId, vitaris.id, 'companyId debe ser el de Vitaris (override)');
  assert.strictEqual(sessionOverride.companySlug, 'vitaris', 'companySlug debe ser vitaris (override)');
  console.log('  ✅ Caso A aprobado: Token con override asigna la empresa de override (Vitaris)');

  // 4. Caso B: Token sin override (usa la empresa del usuario: Kezelmedica)
  const rawTokenNormal = crypto.randomBytes(32).toString('hex');
  const tokenHashNormal = crypto.createHash('sha256').update(rawTokenNormal).digest('hex');

  await db.ssoToken.create({
    data: {
      tokenHash: tokenHashNormal,
      userId: testUser.id,
      companyOverrideId: null,
      expiresAt,
      used: false,
    },
  });

  const sessionNormal = await authorizeFn(
    { ssoToken: rawTokenNormal },
    {} as any
  );
  assert(sessionNormal, 'La sesión con token normal debe autorizarse');
  assert.strictEqual(sessionNormal.companyId, kezel.id, 'companyId debe ser el del usuario (Kezelmedica)');
  assert.strictEqual(sessionNormal.companySlug, 'kezelmedica', 'companySlug debe ser kezelmedica');
  console.log('  ✅ Caso B aprobado: Token sin override asigna la empresa base del usuario (Kezelmedica)');

  // Limpieza
  await db.ssoToken.deleteMany({ where: { userId: testUser.id } });
  await db.user.delete({ where: { id: testUser.id } });

  console.log('🎉 Todas las pruebas de B3-Academy pasaron exitosamente.');
}

main()
  .catch((err) => {
    console.error('❌ Error en pruebas:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
