import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Academy LMS seed...');

  // 1. Crear las 3 empresas confirmadas
  const kezelmedica = await prisma.company.upsert({
    where: { slug: 'kezelmedica' },
    update: {},
    create: {
      name: 'Kezelmedica',
      slug: 'kezelmedica',
      primaryColor: '#0284c7', // Sky Blue
      secondaryColor: '#0d9488', // Teal
      isActive: true,
    },
  });

  const redbeat = await prisma.company.upsert({
    where: { slug: 'redbeat' },
    update: {},
    create: {
      name: 'Red Beat',
      slug: 'redbeat',
      primaryColor: '#e11d48', // Rose / Red
      secondaryColor: '#f43f5e',
      isActive: true,
    },
  });

  const vitaris = await prisma.company.upsert({
    where: { slug: 'vitaris' },
    update: {},
    create: {
      name: 'Vitaris',
      slug: 'vitaris',
      primaryColor: '#059669', // Emerald Green
      secondaryColor: '#10b981',
      isActive: true,
    },
  });

  console.log('✅ Companies seeded: Kezelmedica, Red Beat, Vitaris');

  // 2. Departamentos base
  const deptAdmin = await prisma.department.upsert({
    where: { id: 'dept-admin-kezel' },
    update: {},
    create: {
      id: 'dept-admin-kezel',
      name: 'Dirección y Administración',
      companyId: kezelmedica.id,
    },
  });

  // 3. Usuario Administrador Global (SPEC.md 1.1: bcrypt cost >= 12)
  const saltRounds = 12;
  const adminPasswordHash = await bcrypt.hash('Password123!', saltRounds);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@academy.local' },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@academy.local',
      name: 'Administrador Global',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      companyId: kezelmedica.id,
      departmentId: deptAdmin.id,
      position: 'Administrador del Sistema',
      locale: 'es',
      isActive: true,
    },
  });

  // 4. Colaboradores de prueba para cada empresa
  const testPasswordHash = await bcrypt.hash('Password123!', saltRounds);

  await prisma.user.upsert({
    where: { email: 'colaborador@kezelmedica.com' },
    update: {},
    create: {
      email: 'colaborador@kezelmedica.com',
      name: 'Juan Pérez (Kezelmedica)',
      passwordHash: testPasswordHash,
      role: Role.COLLABORATOR,
      companyId: kezelmedica.id,
      position: 'Especialista de Almacén',
      locale: 'es',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'colaborador@redbeat.com' },
    update: {},
    create: {
      email: 'colaborador@redbeat.com',
      name: 'Ana López (Red Beat)',
      passwordHash: testPasswordHash,
      role: Role.COLLABORATOR,
      companyId: redbeat.id,
      position: 'Desarrolladora de Sistemas',
      locale: 'es',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'colaborador@vitaris.com' },
    update: {},
    create: {
      email: 'colaborador@vitaris.com',
      name: 'Carlos Ruiz (Vitaris)',
      passwordHash: testPasswordHash,
      role: Role.COLLABORATOR,
      companyId: vitaris.id,
      position: 'Responsable Sanitario',
      locale: 'es',
      isActive: true,
    },
  });

  console.log(`✅ Users seeded! Admin created: ${admin.email}`);
  console.log('🌱 Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
