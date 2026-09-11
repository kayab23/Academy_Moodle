import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { requireRole } from '@/lib/scope';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { CategoryManager } from '@/components/courses/CategoryManager';

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);
  const user = requireRole(session, [Role.ADMIN, Role.MANAGER]);
  const t = await getTranslations('categories');
  const tCommon = await getTranslations('common');

  const categories = await db.courseCategory.findMany({
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { courses: true, children: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <Link href="/courses" className="btn-secondary" style={{ padding: 'var(--space-2)' }}>
          <ArrowLeft size={18} />
          <span>{tCommon('back')}</span>
        </Link>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>{t('title')}</h1>
        </div>
      </div>

      <CategoryManager initialCategories={categories} isAdmin={user.role === Role.ADMIN} />
    </div>
  );
}
