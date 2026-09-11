# 🎓 Academy LMS — Plataforma de Capacitación Empresarial

Plataforma tipo Moodle diseñada para gestión de cursos, capacitaciones, presentaciones y seguimiento de colaboradores en entornos empresariales.

---

## 🎯 Instrucciones para el Agente Ejecutor

Estas reglas son de cumplimiento obligatorio para cualquier agente que implemente este plan. Si algo en el resto del documento entra en conflicto con esta sección, esta sección tiene prioridad.

0. **Leer [SPEC.md](SPEC.md) antes de escribir código**: contiene las reglas estrictas de seguridad, la arquitectura obligatoria de base de datos y los estándares de calidad (accesibilidad, rendimiento, escalabilidad). Ninguna fase se considera completa si viola una regla de SPEC.md, incluyendo su checklist de cierre de fase/PR.
1. **Repositorio**: este directorio aún no es un repositorio git. Antes de escribir código, ejecutar `git init` y hacer commits pequeños y descriptivos por feature (no un commit único por fase completa).
2. **Orden estricto**: no iniciar una fase sin haber cumplido el "Criterio de aceptación" de la fase anterior (ver sección "Fases de Desarrollo"). No adelantar trabajo de fases futuras aunque parezca eficiente.
3. **Stack cerrado**: usar exactamente las tecnologías de la tabla "Stack Tecnológico". No sustituir Prisma, NextAuth, PostgreSQL ni Next.js por alternativas sin aprobación explícita del usuario.
4. **Multi-empresa por defecto**: toda consulta a la base de datos que devuelva cursos, inscripciones, calificaciones o reportes debe filtrar por `companyId` del usuario autenticado, salvo que su rol sea `ADMIN` (ve todas las empresas). Un usuario de Kezelmedica nunca debe poder ver datos de Red Beat o Vitaris por defecto.
5. **i18n obligatorio**: ningún texto de interfaz se escribe hardcodeado. Todo string visible pasa por el sistema de traducción (`next-intl`) con clave en `src/messages/es.json` y `src/messages/en.json`.
6. **Validación antes de cerrar fase**: ejecutar `npm run lint` y `npm run build` sin errores antes de marcar cualquier fase como completa. Si hay pruebas relevantes a lo tocado, ejecutar `npm test`.
7. **No inventar alcance**: no agregar funcionalidades no listadas en este documento (ej. proveedores de login social, pagos, app móvil nativa) sin confirmarlo primero con el usuario.
8. **Archivos subidos**: nunca commitear contenido de `public/uploads/` al repositorio; debe estar en `.gitignore` desde el primer commit.
9. **Secrets**: nunca escribir credenciales reales en el código o en el repo. Usar `.env` (ignorado por git) y mantener `.env.example` actualizado con las variables requeridas (ver sección correspondiente).

---

## 📊 Investigación Realizada

### ¿Cómo funciona Moodle internamente?

Moodle (Modular Object-Oriented Dynamic Learning Environment) es un LMS open-source construido con **PHP + MySQL/MariaDB** (stack LAMP). Su arquitectura se divide en:

| Componente | Función |
|:---|:---|
| **Moodle Code** | Código PHP modular con ~50 tipos de plugins (actividades, autenticación, inscripción, temas) |
| **Moodledata** | Directorio de archivos subidos, contenido de cursos, caché y sesiones |
| **Database** | ~200 tablas relacionales con prefijo `mdl_` organizadas por XMLDB |

#### Tablas clave de Moodle:
- `mdl_user` → Perfiles, autenticación, preferencias
- `mdl_course` / `mdl_course_categories` → Estructura de cursos
- `mdl_enrol` / `mdl_user_enrolments` → Inscripciones (manual, auto, cohort)
- `mdl_grade_items` / `mdl_grade_grades` / `mdl_grade_categories` → Libro de calificaciones
- `mdl_role` / `mdl_role_assignments` → Sistema RBAC (Admin, Manager, Teacher, Student, Guest)
- `mdl_forum`, `mdl_assign`, `mdl_quiz`, `mdl_quiz_attempts` → Actividades modulares

#### Sistema de permisos de Moodle (RBAC):
- **Roles**: Admin, Manager, Teacher (editing/non-editing), Student, Guest
- **Capabilities**: Permisos granulares (~400+) como `mod/forum:replypost`, `moodle/course:update`
- **Contexts jerárquicos**: Sistema → Categoría → Curso → Actividad
- **4 niveles**: Allow, Prevent, Prohibit, Inherit

---

### Plataformas LMS empresariales referenciadas

| Plataforma | Fortaleza principal |
|:---|:---|
| **Docebo** | IA para recomendaciones, mapeo de habilidades, portales multi-audiencia |
| **Absorb LMS** | Compliance tracking, automatización robusta |
| **TalentLMS** | UX intuitiva, setup rápido, gamificación |
| **360Learning** | Aprendizaje colaborativo peer-to-peer |
| **Totara** | Multi-tenancy, altamente configurable |
| **SAP SuccessFactors** | Integración con ecosistema SAP HR/ERP |

#### Funcionalidades clave identificadas en las mejores plataformas:
1. **Gestión de cursos y contenido** — Organización modular (módulos → lecciones → recursos)
2. **Tracking de progreso** — Dashboards en tiempo real con % de completitud
3. **Calificaciones automáticas** — Gradebook con agregación y pesos
4. **Certificados digitales** — Emisión automática al completar cursos
5. **Gamificación** — Badges, puntos, leaderboards
6. **Visor de presentaciones** — Soporte PPTX/PDF embebido
7. **Notificaciones automáticas** — Recordatorios, deadlines, renovaciones
8. **Roles y permisos** — RBAC granular por contexto
9. **Reportes y analytics** — Exportación, gráficas de progreso
10. **Responsive/Mobile** — Acceso desde cualquier dispositivo

---

## 🏗️ Arquitectura Propuesta

### Stack Tecnológico

| Capa | Tecnología | Justificación |
|:---|:---|:---|
| **Frontend** | Next.js 14+ (App Router) + React 18 | SSR, rendimiento, escalabilidad |
| **Styling** | Vanilla CSS (variables + design tokens) | Control total, sin dependencias |
| **Backend** | Next.js API Routes + Server Actions | Full-stack unificado |
| **Base de Datos** | PostgreSQL | Estándar para datos relacionales (usuarios, cursos, calificaciones) |
| **ORM** | Prisma | Type-safe, migraciones automáticas, schema visual |
| **Autenticación** | NextAuth.js (Auth.js) | SSO, roles, sesiones seguras |
| **i18n** | next-intl | Bilingüe ES/EN, mensajes por namespace, integrado con App Router |
| **Storage** | Sistema de archivos local + ruta configurable | Archivos PPTX, PDF, videos |
| **Conversión de documentos** | LibreOffice headless (`soffice --headless --convert-to pdf`) | Convertir PPTX subidos a PDF renderizable en navegador |
| **Charts** | Chart.js / Recharts | Dashboards de progreso y analytics |

### Decisiones técnicas de riesgo resueltas

Estos puntos eran ambiguos en la investigación inicial y quedan resueltos aquí para que el agente ejecutor no tenga que decidir por su cuenta:

| Riesgo | Resolución |
|:---|:---|
| **Los navegadores no renderizan PPTX nativamente** | Al subir un `.pptx`, el backend lo convierte a `.pdf` de forma síncrona con LibreOffice headless (instalado en el servidor on-premise) y guarda ambos archivos. El visor de lección solo renderiza el PDF resultante (vía PDF.js / `react-pdf` o `<iframe>`). Si la conversión falla o LibreOffice no está disponible, la lección ofrece únicamente descarga directa del PPTX original y se registra un warning, sin romper el flujo. |
| **Streaming de video** | Los videos se sirven desde una API Route dedicada (`src/app/api/uploads/[...path]/route.ts`) que soporta **HTTP Range Requests** (respuesta `206 Partial Content`) para permitir seek y evitar cargar el archivo completo en memoria. Se usa la etiqueta `<video>` HTML5 nativa, sin librerías de terceros. |
| **Estrategia de sesión NextAuth** | Provider `Credentials` (email + password, hash con `bcrypt`), estrategia de sesión **JWT** (no database sessions) con `role` y `companyId` embebidos en el token para evitar queries repetidas. `middleware.ts` protege todas las rutas bajo `(dashboard)` y redirige según rol. |
| **Multi-empresa (3 compañías)** | Se modela como **una sola instancia** con aislamiento lógico por `companyId`, no como despliegues separados. Ver entidad `Company` en el esquema de base de datos. |
| **Branding por empresa** | Los colores/logo de cada empresa (Kezelmedica, Red Beat, Vitaris) viven en la tabla `Company` y se inyectan como variables CSS (`--primary-color`, `--secondary-color`) en el layout según la empresa del usuario autenticado. |

### Patrón Arquitectónico: Monolito Modular

```
Academy_Moodle/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── public/
│   └── uploads/               # Archivos subidos (presentaciones, recursos) — en .gitignore
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Páginas de login/registro
│   │   ├── (dashboard)/       # Layout principal autenticado
│   │   │   ├── admin/         # Panel administrativo
│   │   │   ├── courses/       # Catálogo y vista de cursos
│   │   │   ├── my-learning/   # Mi progreso (vista colaborador)
│   │   │   ├── gradebook/     # Libro de calificaciones
│   │   │   ├── certificates/  # Certificados obtenidos
│   │   │   ├── users/         # Gestión de usuarios
│   │   │   └── reports/       # Reportes y analytics
│   │   ├── api/               # API Routes
│   │   │   ├── auth/
│   │   │   ├── courses/
│   │   │   ├── enrollments/
│   │   │   ├── grades/
│   │   │   ├── progress/
│   │   │   └── uploads/       # Sirve archivos con soporte de Range Requests
│   │   ├── layout.tsx
│   │   └── page.tsx           # Landing page
│   ├── components/            # Componentes reutilizables
│   │   ├── ui/                # Botones, cards, modals, inputs
│   │   ├── course/            # CourseCard, LessonViewer, QuizForm
│   │   ├── dashboard/         # Widgets, charts, stats
│   │   ├── layout/            # Sidebar, Navbar, Footer
│   │   └── presentation/      # Visor de PPTX(convertido a PDF)/PDF/Video
│   ├── lib/                   # Utilidades y lógica compartida
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── auth.ts            # Configuración NextAuth
│   │   ├── convert.ts         # Wrapper de LibreOffice headless (PPTX → PDF)
│   │   ├── scope.ts           # Helpers de filtrado por companyId/rol
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── messages/               # i18n (next-intl)
│   │   ├── es.json
│   │   └── en.json
│   ├── hooks/                  # Custom React hooks
│   └── styles/
│       └── globals.css         # Design system completo
├── middleware.ts               # Protección de rutas + resolución de locale
├── .env                        # No versionado
├── .env.example                # Sí versionado, sin valores reales
├── .gitignore
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## 🗄️ Esquema de Base de Datos (Prisma)

Inspirado en las tablas clave de Moodle, adaptado a necesidades empresariales.

### Entidades principales

```mermaid
erDiagram
    Company ||--o{ User : "emplea"
    Company ||--o{ CourseCompany : "asigna"

    User ||--o{ Enrollment : "se inscribe"
    User ||--o{ Course : "crea (instructor)"
    User ||--o{ UserProgress : "registra progreso"
    User ||--o{ Grade : "recibe calificación"
    User ||--o{ Certificate : "obtiene"
    User ||--o{ Notification : "recibe"

    Course ||--o{ Module : "contiene"
    Course ||--o{ Enrollment : "tiene inscritos"
    Course ||--o{ Certificate : "emite"
    Course ||--o{ CourseCategory : "pertenece a"
    Course ||--o{ CourseCompany : "se asigna a"

    Module ||--o{ Lesson : "contiene"

    Lesson ||--o{ Resource : "tiene recursos"
    Lesson ||--o{ Quiz : "tiene evaluaciones"
    Lesson ||--o{ UserProgress : "trackea"

    Quiz ||--o{ Question : "contiene"
    Quiz ||--o{ QuizAttempt : "tiene intentos"

    QuizAttempt ||--o{ Answer : "contiene respuestas"
    QuizAttempt ||--o{ Grade : "genera"
```

### Modelo detallado

| Tabla | Campos principales | Inspiración Moodle |
|:---|:---|:---|
| **Company** | id, name, slug, logoUrl, primaryColor, secondaryColor, isActive | Aislamiento multi-empresa (Kezelmedica, Red Beat, Vitaris) |
| **User** | id, email, name, passwordHash, role (ADMIN/MANAGER/INSTRUCTOR/COLLABORATOR), companyId, locale (es/en), avatar, department, position, isActive | `mdl_user` + `mdl_role` |
| **Department** | id, name, companyId, managerId | Estructura organizacional (por empresa) |
| **CourseCategory** | id, name, description, parentId (jerárquica) | `mdl_course_categories` |
| **Course** | id, title, description, thumbnail, instructorId, categoryId, status (DRAFT/PUBLISHED/ARCHIVED), difficulty, estimatedHours | `mdl_course` |
| **CourseCompany** | id, courseId, companyId | Tabla pivote: a qué empresa(s) está asignado un curso. Sin registros = curso global visible para todas las empresas. |
| **Module** | id, title, courseId, position, description | Secciones de curso |
| **Lesson** | id, title, type (VIDEO/PRESENTATION/DOCUMENT/TEXT/QUIZ), content, moduleId, position, duration, isRequired | `mdl_course_modules` |
| **Resource** | id, lessonId, type (PPTX/PDF/VIDEO/IMAGE/LINK), fileUrl, convertedPdfUrl (nullable, solo para PPTX), fileName, fileSize | Moodledata + `mdl_files` |
| **Enrollment** | id, userId, courseId, status (ACTIVE/COMPLETED/SUSPENDED), enrolledAt, completedAt, enrolledBy | `mdl_user_enrolments` |
| **UserProgress** | id, userId, lessonId, isCompleted, completedAt, timeSpent, lastAccessed | `mdl_course_modules_completion` |
| **Quiz** | id, lessonId, title, passingScore, maxAttempts, timeLimit, shuffleQuestions | `mdl_quiz` |
| **Question** | id, quizId, type (MULTIPLE_CHOICE/TRUE_FALSE/OPEN/MATCHING), text, options (JSON), correctAnswer, points | `mdl_question` |
| **QuizAttempt** | id, userId, quizId, score, startedAt, finishedAt, attemptNumber | `mdl_quiz_attempts` |
| **Answer** | id, attemptId, questionId, selectedAnswer, isCorrect | `mdl_question_attempts` |
| **Grade** | id, userId, courseId, lessonId, quizAttemptId, score, maxScore, percentage, gradedBy, gradedAt | `mdl_grade_grades` |
| **Certificate** | id, userId, courseId, title, issuedAt, certificateNumber, templateId | Plugin Custom Certificate |
| **Notification** | id, userId, type, title, message, isRead, courseId, createdAt | Notificaciones del sistema |
| **ActivityLog** | id, userId, action, entityType, entityId, metadata (JSON), createdAt | Logs de auditoría |

### Regla de cálculo de calificación de curso

Para evitar ambigüedad en la Fase 4, la nota final de un curso se calcula como el **promedio simple de las calificaciones (`percentage`) de todos los `Lesson` con `isRequired = true`** que tengan un `Grade` asociado. El certificado solo se emite si: (a) el progreso del curso es 100% en lecciones requeridas, y (b) la nota final ≥ `passingScore` definido a nivel de curso (o del quiz correspondiente si el curso no tiene evaluación propia).

---

## 📋 Funcionalidades por Módulo

### 1. 🔐 Autenticación y Roles

| Feature | Detalle |
|:---|:---|
| Login/Logout | Email + contraseña (bcrypt), sesión JWT vía NextAuth Credentials Provider |
| Roles RBAC | **Admin** (todo, todas las empresas), **Manager** (su departamento/empresa), **Instructor** (sus cursos), **Collaborator** (aprender) |
| Permisos granulares | Cada rol tiene capabilities específicas por contexto, evaluadas en `src/lib/scope.ts` |
| Aislamiento por empresa | Todo query filtra por `companyId` salvo rol `ADMIN` (ver regla #4 de "Instrucciones para el Agente Ejecutor") |
| Perfil de usuario | Foto, departamento, posición, empresa, idioma preferido, historial |

### 2. 📚 Gestión de Cursos

| Feature | Detalle |
|:---|:---|
| CRUD de cursos | Crear, editar, archivar, eliminar |
| Estructura modular | Curso → Módulos → Lecciones → Recursos |
| Categorías jerárquicas | Ej: "Compliance" > "Seguridad" > "Manejo de químicos" |
| Estados de curso | Borrador → Publicado → Archivado |
| Asignación a empresas | Un curso puede ser global o asignado a una o varias empresas vía `CourseCompany` |
| Thumbnails | Imagen representativa del curso |
| Estimación de tiempo | Horas estimadas para completar |

### 3. 📊 Presentaciones y Contenido

| Feature | Detalle |
|:---|:---|
| Visor de PPTX | El PPTX se convierte a PDF en el servidor (LibreOffice headless) al subirse; el visor renderiza siempre el PDF resultante |
| Visor de PDF | Lector embebido de documentos (PDF.js / `react-pdf`) |
| Videos | Reproductor `<video>` nativo con tracking de progreso, servido vía API Route con Range Requests |
| Contenido textual | Editor rich-text para lecciones escritas |
| Subida de archivos | Drag & drop con validación de tipo y tamaño (definir límite explícito en `constants.ts`, ej. 200MB para video, 25MB para documentos) |

### 4. 📝 Evaluaciones y Quizzes

| Feature | Detalle |
|:---|:---|
| Tipos de pregunta | Opción múltiple, verdadero/falso, respuesta abierta, matching |
| Calificación automática | Para tipos cerrados (multiple choice, true/false, matching) |
| Calificación manual | Para respuestas abiertas (`OPEN`), pendiente de revisión por instructor hasta que se califique |
| Intentos múltiples | Configurar máximo de intentos por quiz |
| Tiempo límite | Temporizador opcional |
| Nota mínima aprobatoria | Configurar por quiz (`passingScore`) |

### 5. 📈 Seguimiento y Progreso

| Feature | Detalle |
|:---|:---|
| Progreso por lección | Check de completitud individual |
| Progreso por curso | Barra de progreso general (% completado, solo lecciones requeridas cuentan) |
| Tiempo en plataforma | Tracking de tiempo por sesión y lección |
| Dashboard personal | "Mi Aprendizaje" con cursos activos, completados, pendientes |
| Vista del manager | Progreso de su equipo/departamento (misma empresa) |
| Vista admin | Panorama general de toda la organización, con filtro por empresa |

### 6. 📋 Libro de Calificaciones (Gradebook)

| Feature | Detalle |
|:---|:---|
| Calificaciones por curso | Tabla con todos los colaboradores y sus notas |
| Agregación | Promedio simple de lecciones requeridas (ver "Regla de cálculo de calificación de curso") |
| Exportación | CSV/Excel de calificaciones |
| Historial | Registro de todos los intentos |

### 7. 🏆 Certificados

| Feature | Detalle |
|:---|:---|
| Generación automática | Al completar curso (100% lecciones requeridas + nota aprobatoria) |
| Número único | Folio para verificación (`certificateNumber`, único a nivel global) |
| Descarga PDF | Certificado descargable con diseño profesional, con branding de la empresa del usuario |
| Historial | Todos los certificados del colaborador |

### 8. 🔔 Notificaciones

| Feature | Detalle |
|:---|:---|
| Inscripción | "Has sido inscrito en el curso X" |
| Recordatorios | "Te falta completar el módulo Y" |
| Calificaciones | "Tu quiz ha sido calificado" |
| Certificados | "Tu certificado está listo" |
| Deadlines | "El curso X vence en 3 días" |
| Canal | In-app (tabla `Notification`) siempre; email vía SMTP (Outlook/M365) opcional, controlado por variables de entorno |

### 9. 📊 Reportes y Analytics

| Feature | Detalle |
|:---|:---|
| Dashboard admin | KPIs: cursos activos, usuarios, tasa de completitud, con filtro por empresa |
| Reporte por curso | Avance de todos los inscritos |
| Reporte por colaborador | Historial completo de aprendizaje |
| Reporte por departamento | Progreso del equipo |
| Gráficas | Barras, líneas, donuts de progreso |
| Exportación | CSV/PDF de reportes |

---

## 🎨 Diseño UI/UX

### Principios de diseño:
- **Dark mode elegante** con acentos vibrantes (gradientes azul-púrpura por defecto, sobrescribibles por `Company.primaryColor`/`secondaryColor`)
- **Glassmorphism** en cards y paneles
- **Micro-animaciones** en hover, transiciones, y progreso
- **Responsive** — Desktop, tablet, mobile
- **Sidebar colapsable** con navegación por iconos
- **Typography premium** — Inter / Outfit de Google Fonts
- **Bilingüe** — Todo texto de UI vía `next-intl`, selector de idioma en el navbar

### Páginas principales:
1. **Login** — Diseño centrado, branding de la empresa detectada (por dominio de email o selección manual)
2. **Dashboard** — KPIs, cursos recientes, calendario, notificaciones
3. **Catálogo de Cursos** — Grid de cards con filtros y búsqueda
4. **Vista de Curso** — Sidebar de módulos + área de contenido
5. **Visor de Lección** — PPTX(convertido)/PDF/Video con progreso lateral
6. **Quiz** — Interfaz limpia de evaluación con temporizador
7. **Gradebook** — Tabla interactiva con filtros
8. **Certificados** — Galería con descarga
9. **Reportes** — Dashboards con gráficas interactivas
10. **Admin Panel** — Gestión de usuarios, cursos, empresas, configuración

---

## ⚙️ Variables de Entorno (`.env.example`)

```
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/academy_lms

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Email (Outlook / Microsoft 365 SMTP)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Almacenamiento
UPLOADS_DIR=./public/uploads
MAX_VIDEO_SIZE_MB=200
MAX_DOCUMENT_SIZE_MB=25

# Conversión de documentos
LIBREOFFICE_PATH=soffice
```

### Scripts esperados en `package.json`

| Script | Uso |
|:---|:---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (debe pasar sin errores antes de cerrar cualquier fase) |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run test` | Jest |
| `npm run prisma:generate` | Genera el cliente de Prisma |
| `npm run prisma:migrate` | Corre migraciones en desarrollo |
| `npm run prisma:studio` | Explorador visual de datos |
| `npm run prisma:seed` | Carga de datos iniciales (empresas, departamentos, admin) |

---

## 📐 Fases de Desarrollo

### Fase 1 — Fundación (Semanas 1-2)
- [x] `git init` + `.gitignore` (incluye `public/uploads/`, `.env`, `node_modules`)
- [x] Setup del proyecto Next.js + TypeScript
- [x] Configurar Prisma + PostgreSQL, crear `.env.example`
- [x] Crear esquema de base de datos completo, incluyendo `Company` y `CourseCompany`
- [x] Implementar sistema de autenticación (NextAuth, Credentials + JWT)
- [x] Configurar `next-intl` con `es.json`/`en.json` mínimos
- [x] Design system CSS (variables, componentes base) con soporte de branding por empresa
- [x] Layout principal (Sidebar, Navbar, Footer)
- [x] Página de Login
- [x] **Criterio de aceptación**: `npm run build` y `npm run lint` pasan sin errores; es posible crear un usuario Admin por seed, iniciar sesión, y ver un dashboard vacío protegido por `middleware.ts`.

### Fase 2 — Core de Cursos (Semanas 3-4)
- [ ] CRUD de categorías de cursos
- [ ] CRUD de cursos (crear, editar, publicar, archivar) con asignación a empresa(s)
- [ ] Módulos y lecciones (estructura jerárquica)
- [ ] Subida de archivos (PPTX, PDF, video) con validación de tipo/tamaño
- [ ] Pipeline de conversión PPTX → PDF (LibreOffice headless) con manejo de fallo (fallback a descarga)
- [ ] Visor de presentaciones embebido (PDF resultante)
- [ ] Catálogo de cursos (búsqueda + filtros), respetando aislamiento por empresa
- [ ] **Criterio de aceptación**: un Admin puede crear un curso completo con al menos un módulo, una lección de tipo PRESENTATION (PPTX real de prueba) y verla renderizada como PDF en el navegador.

### Fase 3 — Inscripción y Progreso (Semanas 5-6)
- [ ] Sistema de inscripciones (manual + auto-inscripción)
- [ ] Tracking de progreso por lección
- [ ] Barra de progreso de curso (solo lecciones `isRequired`)
- [ ] Dashboard "Mi Aprendizaje" para colaboradores
- [ ] Vista de manager — progreso de su equipo (misma empresa)
- [ ] **Criterio de aceptación**: un Collaborator inscrito puede completar todas las lecciones requeridas de un curso y ver su barra de progreso llegar a 100%.

### Fase 4 — Evaluaciones y Calificaciones (Semanas 7-8)
- [ ] Creador de quizzes (UI para definir preguntas)
- [ ] Motor de quizzes (presentación + evaluación automática para tipos cerrados)
- [ ] Flujo de calificación manual para preguntas `OPEN`
- [ ] Gradebook — libro de calificaciones por curso, aplicando la regla de agregación definida
- [ ] Historial de intentos
- [ ] **Criterio de aceptación**: un Collaborator resuelve un quiz con preguntas cerradas y obtiene calificación automática inmediata; un Instructor puede calificar manualmente una pregunta abierta y el Gradebook refleja el cambio.

### Fase 5 — Certificados y Notificaciones (Semanas 9-10)
- [ ] Generación de certificados PDF según la regla de emisión definida
- [ ] Templates de certificados con branding por empresa
- [ ] Sistema de notificaciones en-app
- [ ] Notificaciones por email vía SMTP (opcional, controlado por `.env`)
- [ ] Galería de certificados del usuario
- [ ] **Criterio de aceptación**: al completar el 100% de un curso con nota aprobatoria, se genera automáticamente un certificado descargable con folio único y el branding de la empresa correcta.

### Fase 6 — Reportes y Polish (Semanas 11-12)
- [ ] Dashboard administrativo con KPIs (con filtro por empresa)
- [ ] Reportes por curso, colaborador, departamento
- [ ] Gráficas interactivas (Chart.js/Recharts)
- [ ] Exportación CSV/PDF
- [ ] Responsive design final
- [ ] Optimización de rendimiento
- [ ] Testing y QA
- [ ] **Criterio de aceptación**: los reportes exportados en CSV coinciden con los datos mostrados en pantalla para al menos un curso de prueba en cada una de las 3 empresas.

---

## ✅ Verificación

### Tests Automatizados
- Pruebas unitarias con Jest para lógica de negocio (calificaciones, progreso, regla de agregación de nota final)
- Pruebas de API con supertest para endpoints CRUD, incluyendo casos de aislamiento por `companyId`
- `npm run build` para validar que el proyecto compila sin errores

### Verificación Manual
- Login con diferentes roles y verificar permisos
- Login con usuarios de distintas empresas y verificar que no hay fuga de datos entre ellas
- Crear curso completo → inscribir usuario → completar → certificado
- Probar visor de PPTX/PDF con archivos reales (incluyendo un PPTX con imágenes y animaciones simples)
- Verificar responsive en dispositivos reales
- Validar exportación de reportes
- Probar cambio de idioma (ES/EN) en al menos 3 pantallas distintas

---

## ✅ Decisiones Confirmadas

| Aspecto | Decisión |
|:---|:---|
| **Nombre** | Academy LMS |
| **Base de Datos** | PostgreSQL local (ya instalado) |
| **Infraestructura** | On-premise (como Kezelmedica, Red Beat, Vitaris) |
| **Escala** | ~250 colaboradores (3 empresas) |
| **Video** | Sí, streaming de videos MP4 creados con software externo |
| **Email** | Outlook/Microsoft 365 SMTP (configurable en `.env`) |
| **Idioma** | Bilingüe (Español / Inglés) con sistema i18n (`next-intl`) |
| **Branding** | Colores de Kezelmedica/Vitaris (se configurarán después, paleta premium por defecto), modelados en la tabla `Company` |
| **Multi-empresa** | 3 empresas: Kezelmedica, Red Beat, Vitaris — una sola instancia con aislamiento lógico por `companyId` |
