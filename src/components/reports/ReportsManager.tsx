'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  BookOpen,
  Users,
  Layers,
  Download,
  Printer,
  Search,
  Building2,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AdminKpis,
  CourseReportItem,
  CollaboratorReportItem,
  DepartmentReportItem,
} from '@/lib/reports';
import { BarChartCard } from './BarChartCard';
import { DonutChartCard } from './DonutChartCard';
import { DepartmentComparisonChart } from './DepartmentComparisonChart';

interface ReportsManagerProps {
  initialKpis: AdminKpis;
  initialCourses: CourseReportItem[];
  initialCollaborators: CollaboratorReportItem[];
  initialDepartments: DepartmentReportItem[];
  userRole: string;
  userCompanyId: string;
  companies: { id: string; name: string; slug: string }[];
  locale: string;
}

type TabType = 'overview' | 'courses' | 'collaborators' | 'departments';

export function ReportsManager({
  initialKpis,
  initialCourses,
  initialCollaborators,
  initialDepartments,
  userRole,
  companies,
  locale,
}: ReportsManagerProps) {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [kpis, setKpis] = useState<AdminKpis>(initialKpis);
  const [courses, setCourses] = useState<CourseReportItem[]>(initialCourses);
  const [collaborators, setCollaborators] = useState<CollaboratorReportItem[]>(initialCollaborators);
  const [departments, setDepartments] = useState<DepartmentReportItem[]>(initialDepartments);

  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Reload data when company filter changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const queryParam = selectedCompanyId ? `?companyId=${selectedCompanyId}` : '';

    Promise.all([
      fetch(`/api/reports/kpis${queryParam}`).then((r) => r.json()),
      fetch(`/api/reports/courses${queryParam}`).then((r) => r.json()),
      fetch(`/api/reports/collaborators${queryParam}`).then((r) => r.json()),
      fetch(`/api/reports/departments${queryParam}`).then((r) => r.json()),
    ])
      .then(([newKpis, newCourses, newCollabs, newDepts]) => {
        if (!isMounted) return;
        startTransition(() => {
          if (newKpis && !newKpis.error) setKpis(newKpis);
          if (Array.isArray(newCourses)) setCourses(newCourses);
          if (Array.isArray(newCollabs)) setCollaborators(newCollabs);
          if (Array.isArray(newDepts)) setDepartments(newDepts);
        });
      })
      .catch((err) => {
        console.error('Error updating reports:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCompanyId]);

  // Handle CSV Export
  const handleExportCsv = () => {
    let exportType = 'courses';
    if (activeTab === 'collaborators') exportType = 'collaborators';
    else if (activeTab === 'departments') exportType = 'departments';

    const companyParam = selectedCompanyId ? `&companyId=${selectedCompanyId}` : '';
    const url = `/api/reports/export?type=${exportType}${companyParam}&locale=${locale}`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Filtered lists based on search
  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.companies.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCollaborators = collaborators.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.departmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.managerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Data for Course completion bar chart
  const courseChartItems = courses.map((c) => ({
    label: c.title,
    value: c.completionRate,
    badge: `${c.completedCount}/${c.enrolledCount}`,
  }));

  const selectedCompanyName = selectedCompanyId
    ? companies.find((c) => c.id === selectedCompanyId)?.name || ''
    : t('allCompanies');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Printable Header (Visible only when printing) */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1 style={{ fontSize: '20pt', fontWeight: 700, marginBottom: '6pt' }}>
          {t('printHeaderTitle')}
        </h1>
        <p style={{ fontSize: '10pt', color: '#555555' }}>
          {t('filterCompany')}: {selectedCompanyName} • {t('generatedOn')}: {new Date().toLocaleDateString(locale)}
        </p>
        <hr style={{ margin: '12pt 0', borderColor: '#cccccc' }} />
      </div>

      {/* Screen Header & Action Bar (Hidden when printing) */}
      <div
        className="glass-panel no-print"
        style={{
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: 'var(--brand-primary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              <BarChart3 size={20} />
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Analytics Suite
              </span>
            </div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{t('title')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              {t('subtitle')}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {userRole === 'ADMIN' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Building2 size={16} style={{ color: 'var(--text-muted)' }} />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="input"
                  style={{ minWidth: '180px', height: '40px', fontSize: 'var(--text-xs)' }}
                  aria-label={t('filterCompany')}
                >
                  <option value="">{t('allCompanies')}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleExportCsv}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              title={t('exportCsv')}
            >
              <Download size={16} />
              <span>{t('exportCsv')}</span>
            </button>

            <button
              onClick={handlePrint}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
              title={t('printPdf')}
            >
              <Printer size={16} />
              <span>{t('printPdf')}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            borderBottom: '1px solid var(--border-subtle)',
            paddingTop: 'var(--space-2)',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'overview', label: t('tabOverview'), icon: BarChart3 },
            { id: 'courses', label: t('tabCourses'), icon: BookOpen },
            { id: 'collaborators', label: t('tabCollaborators'), icon: Users },
            { id: 'departments', label: t('tabDepartments'), icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-4)',
                  border: 'none',
                  background: 'transparent',
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  borderBottom: isActive ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--brand-primary)' }}>
            <BookOpen size={16} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Cursos Activos</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.activeCourses} <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>/ {kpis.totalCourses}</span>
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--brand-secondary)' }}>
            <Users size={16} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Colaboradores</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.totalStudents}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={16} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Tasa Finalización</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.completionRate}%
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-warning)' }}>
            <TrendingUp size={16} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Promedio General</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.avgPlatformGrade}%
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#a855f7' }}>
            <Award size={16} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Certificados</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.totalCertificates}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#38bdf8' }}>
            <Clock size={16} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Horas Estudio</span>
          </div>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {kpis.totalStudyHours}h
          </p>
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--brand-primary)' }}>
          {t('loadingReports')}
        </div>
      )}

      {/* Tab 1: Overview & Charts */}
      {activeTab === 'overview' && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            <DonutChartCard
              title={t('statusDistribution')}
              subtitle="Proporción de estados de inscripción"
              completed={kpis.statusDistribution.completed}
              active={kpis.statusDistribution.active}
              suspended={kpis.statusDistribution.suspended}
              completedLabel={t('statusCompleted')}
              activeLabel={t('statusActive')}
              suspendedLabel={t('statusSuspended')}
            />

            <BarChartCard
              title={t('coursePerformance')}
              subtitle="Cursos con mayor tasa de completitud (%)"
              items={courseChartItems}
              emptyText="No hay cursos registrados para esta empresa."
            />
          </div>

          <DepartmentComparisonChart
            title={t('deptPerformance')}
            subtitle="Comparativa de avance y promedio por departamento"
            departments={departments}
            emptyText="No hay departamentos registrados para esta empresa."
          />
        </div>
      )}

      {/* Tab 2: Course Report Table */}
      {activeTab === 'courses' && !isLoading && (
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-4)',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 'var(--space-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ paddingLeft: 'var(--space-9)', width: '100%', height: '38px' }}
              />
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {filteredCourses.length} cursos encontrados
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{t('thCourse')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{t('thCategory')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{t('thCompany')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thEnrolled')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thCompleted')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thCompletionRate')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thAvgGrade')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thCertificates')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thStudyHours')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                      {t('emptyReport')}
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-3)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.title}
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {c.category}
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
                        <span className="badge" style={{ background: 'var(--bg-surface-elevated)' }}>
                          {c.companies}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {c.enrolledCount}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {c.completedCount}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: c.completionRate >= 80 ? 'var(--color-success)' : 'var(--brand-primary)' }}>
                          {c.completionRate}%
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                          {c.avgGrade}%
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {c.certificatesCount}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {c.studyHours}h
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Collaborator Report Table */}
      {activeTab === 'collaborators' && !isLoading && (
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-4)',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 'var(--space-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ paddingLeft: 'var(--space-9)', width: '100%', height: '38px' }}
              />
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {filteredCollaborators.length} colaboradores encontrados
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{t('thCollaborator')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{t('thCompany')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{t('thDepartment')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thCoursesEnrolled')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thCoursesCompleted')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thCompletionRate')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thAvgGrade')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thCertificates')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thStudyHours')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollaborators.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                      {t('emptyReport')}
                    </td>
                  </tr>
                ) : (
                  filteredCollaborators.map((collab) => (
                    <tr key={collab.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{collab.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{collab.email}</div>
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
                        {collab.companyName}
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {collab.departmentName}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {collab.enrolledCount}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {collab.completedCount}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: collab.completionRate >= 80 ? 'var(--color-success)' : 'var(--brand-primary)' }}>
                          {collab.completionRate}%
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                          {collab.avgGrade}%
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {collab.certificatesCount}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {collab.studyHours}h
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Department Report Table */}
      {activeTab === 'departments' && !isLoading && (
        <div className="glass-panel" style={{ padding: 'var(--space-6)' }}>
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-4)',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 'var(--space-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ paddingLeft: 'var(--space-9)', width: '100%', height: '38px' }}
              />
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {filteredDepartments.length} departamentos encontrados
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{t('thDepartment')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{t('thCompany')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>{t('thManager')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thMembers')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thTotalEnrollments')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thTotalCompletions')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thCompletionRate')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thAvgGrade')}</th>
                  <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>{t('thCertificates')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                      {t('emptyReport')}
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept) => (
                    <tr key={dept.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-3)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dept.name}
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)' }}>
                        {dept.companyName}
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {dept.managerName}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {dept.membersCount}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {dept.totalEnrollments}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {dept.totalCompletions}
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: dept.completionRate >= 80 ? 'var(--color-success)' : 'var(--brand-primary)' }}>
                          {dept.completionRate}%
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                          {dept.avgGrade}%
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>
                        {dept.certificatesCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
