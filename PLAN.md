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
10. **Ecosistema CorpoSuite**: Academy LMS se integra a un ecosistema de módulos ya en producción (ver sección "🧩 Integración al Ecosistema CorpoSuite"). Nunca modificar la configuración de otro módulo (nginx.conf de otras apps, túnel Cloudflare de otras entradas, bases de datos de otros módulos) al desplegar o tocar Academy — solo agregar entradas nuevas propias. Nunca compartir base de datos con otro módulo del ecosistema.

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

# Integración con SIGE (portal de departamentos) — ver "Diseño definitivo de integración"
SIGE_SERVICE_TOKEN=
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

**Estado parcial (construido y probado de extremo a extremo contra Postgres real el 2026-09-11)**: crear curso, agregar módulos/lecciones, subir VIDEO/PPTX/PDF/IMAGE o agregar un LINK, y reproducir/visualizar el recurso — todo respetando el aislamiento multi-empresa (probado explícitamente: un colaborador de otra empresa recibe 404 en la página del curso y 403 al intentar el streaming directo del archivo). Pendiente de esta fase: editar/publicar/archivar un curso, CRUD de categorías (hoy solo se seleccionan las existentes), y búsqueda/filtros del catálogo.

- [ ] CRUD de categorías de cursos (hoy: solo lectura vía seed, se seleccionan al crear un curso)
- [ ] CRUD de cursos — **crear con asignación a empresa(s): hecho** (`POST /api/courses`); editar/publicar/archivar: pendiente
- [x] Módulos y lecciones (estructura jerárquica) — crear módulo (`POST /api/courses/[courseId]/modules`) y lección (`POST /api/modules/[moduleId]/lessons`); editar/reordenar/eliminar: pendiente
- [x] Subida de archivos (PPTX, PDF, video, imagen) con validación de tipo/tamaño — `POST /api/lessons/[lessonId]/resources`, ver `src/lib/uploads.ts`. Los archivos se guardan en `UPLOADS_DIR` (fuera de `/public`) y solo se sirven autenticados vía `/api/uploads/[...path]` con soporte de Range Requests (streaming de video probado con 206 Partial Content)
- [x] Pipeline de conversión PPTX → PDF (LibreOffice headless) con manejo de fallo (fallback a descarga) — implementado en `tryConvertPptxToPdf()`; el camino de fallo (binario `soffice` no instalado) se probó explícitamente y no rompe la subida. **El camino de éxito (conversión real) no se ha probado todavía** porque este entorno de desarrollo no tiene LibreOffice instalado — verificar en un servidor con `soffice` disponible antes de confiar en la vista previa de PPTX en producción.
- [x] Visor de presentaciones embebido (PDF resultante) — `src/components/courses/ResourceViewer.tsx`
- [ ] Catálogo de cursos (búsqueda + filtros), respetando aislamiento por empresa — el listado y el aislamiento ya funcionan (`src/app/(dashboard)/courses/page.tsx`); falta búsqueda/filtros
- **Pendiente conocido, no bloqueante**: al eliminar un curso/módulo/lección/recurso, Prisma hace cascade solo en la base de datos — los archivos ya subidos a `UPLOADS_DIR` quedan huérfanos en disco. No hay todavía un endpoint DELETE para cursos/recursos; cuando se construya, debe borrar también el archivo físico.
- [ ] **Criterio de aceptación**: un Admin puede crear un curso completo con al menos un módulo, una lección de tipo PRESENTATION (PPTX real de prueba) y verla renderizada como PDF en el navegador. **Parcialmente verificado**: el flujo completo de subida funciona; falta confirmar la conversión PPTX→PDF real con LibreOffice instalado.

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

## 🧩 Integración al Ecosistema CorpoSuite (SIGE y futuros módulos)

Academy LMS no es una aplicación aislada: se integra a un ecosistema de módulos empresariales ya en producción para el mismo grupo de empresas (Kezelmedica, Vitaris, Red Beat), bajo el dominio **`corposuitekrv.com`**. Esta sección documenta lo que **ya existe realmente** (investigado directamente del repositorio en producción `https://github.com/kayab23/app_viaticos.git` — SIGE/GastosMed) y da instrucciones precisas para integrar Academy LMS como un módulo nuevo, sin romper nada de lo existente.

### Estado real del ecosistema (investigado, no hipotético)

Todos los módulos corren hoy en un único servidor físico on-premise: **`SER-DESARROLLO`** (HP ProLiant ML30 Gen10, Windows Server 2025 Standard, IP estática `192.168.1.252`), con **un solo Nginx compartido** (`C:\CRM\nginx\`) y **un solo túnel de Cloudflare** (`Corposuite-Tunnel`) que expone cada app en su propio subdominio HTTPS sin abrir puertos al WAN.

| # | Módulo | Stack real | Puerto local en `SER-DESARROLLO` | Subdominio | BD propia |
|:---|:---|:---|:---|:---|:---|
| 1 | **CRM de Visitas** | Nginx sirviendo SPA estática + backend propio en `:8002` | `80` | `crm.corposuitekrv.com` | Propia |
| 2 | **SIGE / GastosMed** (viáticos) | React+Vite SPA + Express/PM2 (`gastosmed-api`) + PostgreSQL 17 | `8080` (backend interno `3001`) | `sige.corposuitekrv.com` | `app_viaticos` (PostgreSQL) |
| 3 | **RedBeat** | Python ASGI (FastAPI/Django) vía `uvicorn` | `8000` | `redbeat.corposuitekrv.com` | Propia |
| 4 | **Almacén Kezelmedica** | Nginx, HTTPS/HSTS propio | `8085` | `almacen.corposuitekrv.com` | Propia |
| 5 | **Vitaris** | Python ASGI vía `uvicorn`, patrón CSRF double-submit cookie | `8001` | `vitaris.corposuitekrv.com` | Propia |
| 6 | **Academy LMS** (este proyecto) | Next.js App Router (SSR) + PostgreSQL | *a asignar — ver abajo* | `academy.corposuitekrv.com` (propuesto, confirmar con el usuario) | `academy_lms` (ya definida en este repo) |
| 7 | *(futuro)* | — | — | `<app7>.corposuitekrv.com` | — |

**Principio arquitectónico ya validado en producción y que Academy LMS DEBE seguir**: el ecosistema es una **integración federada de aplicaciones independientes**, no un monolito ni un esquema de base de datos compartido. Cada módulo:
- Tiene su propio stack tecnológico (no todos son Next.js/Node — hay Python ASGI, Express, Nginx puro), su propio proceso, y **su propia base de datos**. SIGE, por ejemplo, no comparte tablas con CRM ni con Vitaris.
- Se integra con el resto **solo a dos niveles**: (a) infraestructura compartida (mismo servidor físico, mismo Nginx, mismo túnel/dominio Cloudflare — así el usuario final percibe una "suite" coherente vía subdominios memorables), y (b) llamadas puntuales servidor-a-servidor cuando un módulo necesita un dato de otro (patrón ya usado entre Vitaris y CRM: token de servicio dedicado, origen explícitamente permitido, `credentials: false` — nunca sesión de usuario compartida entre subdominios).
- No existe una sesión compartida real entre módulos (cada app sigue emitiendo y validando su propia sesión). Lo que **sí existe como diseño definitivo** es un puente de identidad de un solo uso iniciado por SIGE hacia Academy — ver "Diseño definitivo de integración" más abajo — para que SIGE actúe como portal/ERP y Academy se sienta como un departamento embebido en él, sin que eso implique compartir cookies ni tablas de sesión entre los dos.

### Diseño definitivo de integración: Academy como departamento embebido en el portal SIGE

**SIGE es el portal/ERP; Academy es un departamento que vive dentro de él** — igual que, más adelante, lo serán Jurídico o Recursos Humanos. Este diseño reemplaza cualquier idea anterior de "un enlace que saca al usuario de SIGE a otra pestaña": la experiencia objetivo es que el usuario **nunca sale de `sige.corposuitekrv.com`** al usar Academy.

#### Experiencia de usuario

1. El usuario tiene sesión abierta en SIGE y ve una entrada nueva en su navbar (`Layout.tsx`): **"Capacitación"**.
2. Al hacer clic, SIGE pide —servidor a servidor— un enlace de acceso de un solo uso a Academy y lo **monta en un `<iframe>` dentro de su propia interfaz**. La URL en el navegador sigue siendo la de SIGE en todo momento.
3. Ese iframe carga Academy ya autenticado, sin pantalla de login, con el navbar propio de Academy oculto (para no duplicar navegación) y mostrando solo el contenido del departamento.

#### Arquitectura de identidad: SIGE manda, Academy obedece

SIGE es la fuente de verdad de usuarios y empresa (ya tiene ~250 colaboradores reales). Academy **no levanta un sistema de alta de usuarios paralelo**: cuando SIGE pide el primer enlace de acceso para un usuario que Academy todavía no conoce, Academy lo da de alta en ese mismo momento con los datos que SIGE le entrega (email, nombre, empresa, rol). Esto sustituye, como mecanismo principal, la idea de un job de sincronización por lote corriendo de fondo (ver "Alta de usuarios" más abajo).

#### Contrato técnico

- **Endpoint nuevo en Academy** (a construir): `POST /api/integrations/sige/sso-issue`
  - Autenticado con un token de servicio dedicado (`SIGE_SERVICE_TOKEN`), nunca con la sesión del usuario final — mismo patrón ya validado en producción entre Vitaris y CRM.
  - Recibe `{ email, fullName, companySlug, role }` — SIGE ya tiene estos datos en `profiles`/`collaborator_registry`, normalizando `empresa` a minúsculas tal como se documentó arriba.
  - Efecto: busca el `User` por email; si no existe, lo crea (`companyId` resuelto desde `companySlug`); genera un token de acceso de un solo uso con expiración corta (ej. 60 segundos) — mismo patrón que `account_activation_tokens`/`password_reset_tokens` ya usado en SIGE.
  - Responde `{ accessUrl: "https://academy.corposuitekrv.com/enlace-acceso?token=..." }`.
- **Página nueva en Academy** (a construir): `/enlace-acceso?token=...`
  - Valida el token (existe, no usado, no expirado), lo marca usado, crea la sesión NextAuth normal (mismo `authOptions` de siempre) y redirige a `/dashboard`.
  - Detecta si corre dentro de un iframe (`window.self !== window.top`) y, si es así, oculta su propio navbar/sidebar de nivel superior — para no duplicar la navegación que ya provee SIGE alrededor.
- **Cabecera de seguridad** (excepción puntual y acotada, no una relajación general): en `next.config.js`, sustituir el `X-Frame-Options: DENY` genérico por `Content-Security-Policy: frame-ancestors 'self' https://sige.corposuitekrv.com;`. Sigue bloqueado para cualquier otro sitio del mundo — la única excepción, a propósito, es `sige.corposuitekrv.com`.
- **Del lado de SIGE**: la entrada de navbar, la llamada al endpoint de arriba, y el `<iframe>` que consume `accessUrl`. Instrucciones completas y precisas para ese lado en el archivo `SIGE_INTEGRATION.md` (en la raíz de este repo), pensado para copiarse al repositorio de SIGE y ejecutarse ahí por otro agente.

#### Por qué esto sigue siendo un módulo independiente, no un monolito

Nada de la lógica de negocio de Academy (cursos, calificaciones, certificados, progreso) se mueve a SIGE ni viceversa. Academy conserva su propia base de datos, su propio proceso, su propio deploy. Lo único que cruza la frontera es: (a) la identidad en el momento del primer acceso, vía un token de un solo uso — nunca una sesión compartida de verdad — y (b) el permiso puntual de ser enmarcado por ese origen específico. Si Academy se cae, SIGE sigue funcionando normal (solo la pestaña "Capacitación" no carga); si algún día se decide que Academy deje de vivir dentro de SIGE, basta con quitar el iframe y el navbar de SIGE — Academy sigue funcionando sola, sin cambios en su código.

#### Limitación conocida a vigilar: cookies de terceros en el iframe

El iframe carga contenido de `academy.corposuitekrv.com` dentro de una página cuyo origen top-level es `sige.corposuitekrv.com` — es, técnicamente, un iframe **cross-origin**. Navegadores modernos (Safari/ITP desde hace años, Firefox cada vez más, y Chrome anunciando lo mismo) restringen o bloquean cookies de terceros dentro de iframes cross-origin por defecto. Esto puede romper la persistencia de la sesión de Academy dentro del iframe (el login vía el token de un solo uso funcionaría, pero una recarga de esa sección podría perder la sesión en navegadores estrictos). Mitigación mínima: configurar la cookie de sesión de NextAuth con `SameSite=None; Secure` (obligatorio para que un cross-origin iframe pueda leerla) — pero esto no resuelve el bloqueo total en Safari. **Antes de dar este diseño por cerrado en producción, hay que probarlo explícitamente en Safari e iOS** (no solo Chrome/Edge, donde sí funcionará sin problema); si el bloqueo resulta inaceptable para el navegador que use la mayoría de los colaboradores, la alternativa sería pasar el token por `postMessage` en vez de depender de cookies — cambio de diseño que no se hace ahora, solo se deja anotado como plan B.

#### Repetible para futuros departamentos

Jurídico, Recursos Humanos y cualquier módulo futuro del ERP siguen exactamente este mismo molde: app propia e independiente + un endpoint `sso-issue` equivalente + entrada de navbar en SIGE + excepción de `frame-ancestors` para ese departamento específico. No hay que rediseñar nada la próxima vez que se agregue uno.

### Pasos precisos para desplegar Academy LMS como módulo #6

1. **Confirmar puerto local libre real con el administrador del servidor** antes de fijar uno — no asumir un número. Como referencia, los puertos ya ocupados son `80, 8080, 8000, 8085, 8001`; un candidato razonable a proponer es `8086`, pero DEBE verificarse en `SER-DESARROLLO` antes de reservarlo en Nginx/Cloudflare.
2. **Carpeta en servidor**: `C:\AcademyLMS\app\`, replicando el patrón ya usado por SIGE (`C:\GastosMed\app\`).
3. **Proceso**: PM2 con nombre de proceso único `academy-lms`, ejecutando `next start -p <PUERTO_INTERNO>` (ej. `3100`, un puerto interno distinto del puerto público de Nginx — igual que SIGE corre su backend interno en `3001` mientras Nginx publica `8080`).
   ```powershell
   cd C:\AcademyLMS\app
   pm2 start "next start -p 3100" --name "academy-lms"
   pm2 save
   ```
4. **Nginx — diferencia técnica clave frente a las apps SPA existentes**: CRM, SIGE y Vitaris son SPAs que Nginx sirve como archivos estáticos (`root ... ; try_files $uri $uri/ /index.html;`) y solo el prefijo `/api/` se reenvía al backend. **Academy LMS es Next.js App Router con SSR en cada ruta**, así que el bloque de Nginx NO debe servir una carpeta estática — debe reenviar **todo** el tráfico al proceso Node. El `nginx.conf` real de producción (revisado en `ops/nginx.conf` del repo SIGE) ya define zonas de `limit_req` compartidas (`api_general`, `api_login`, `api_upload`) y bloquea extensiones sensibles a nivel Nginx además de la app — Academy DEBE seguir el mismo estilo, no un bloque mínimo aislado:
   ```nginx
   # Academy LMS (nuevo — puerto a confirmar, ver paso 1) — agregar dentro del bloque http{} existente
   upstream academy_lms { server 127.0.0.1:3100; keepalive 64; }

   server {
       listen       8086;
       server_name  192.168.1.252  SER-DESARROLLO  localhost;
       server_tokens off;

       # Bloquear archivos sensibles (mismo criterio que los demás módulos)
       location ~ /\.                           { deny all; access_log off; }
       location ~* \.(env|log|sql|bak|ps1|sh)$ { deny all; access_log off; }

       # Assets estáticos de Next.js: cacheables de forma agresiva e inmutable
       location /_next/static/ {
           proxy_pass http://academy_lms;
           proxy_set_header Host $host;
           expires 1y;
           add_header Cache-Control "public, immutable";
           access_log off;
       }

       # Login: mismo rate limit estricto que los demás módulos
       location = /api/auth/callback/credentials {
           limit_req zone=api_login burst=5 nodelay;
           limit_req_status 429;
           proxy_pass http://academy_lms;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Todo lo demás (SSR, resto de rutas, resto de /api/)
       location / {
           limit_req zone=api_general burst=30 nodelay;
           proxy_pass http://academy_lms;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Esta entrada se **agrega** al `C:\CRM\nginx\conf\nginx.conf` existente (reutilizando las zonas `limit_req_zone` que ya están declaradas una sola vez arriba del archivo), sin tocar los bloques `server` de las otras apps, y se recarga con `cd C:\CRM\nginx ; .\nginx.exe -s reload`.
5. **Cloudflare Tunnel**: agregar un nuevo "Public Hostname" (`academy` → `http://localhost:8086`) al túnel `Corposuite-Tunnel` ya existente, en Cloudflare Zero Trust → Networks → Tunnels. Esto no requiere tocar las entradas de los otros 5 módulos ni reiniciar el túnel.
6. **Variables de entorno de producción propias de Academy** (nunca reutilizar las de otro módulo):
   ```
   NEXTAUTH_URL=https://academy.corposuitekrv.com
   DATABASE_URL=postgresql://<usuario_propio>:<password>@localhost:5432/academy_lms
   ```
7. **Base de datos**: usar la misma instancia de PostgreSQL 17 ya instalada en `SER-DESARROLLO` (confirmar versión coincide con la que el equipo instale para Academy), pero con una base de datos propia `academy_lms` — nunca tablas ni esquema compartido con `app_viaticos` ni con ningún otro módulo.

### Convención de datos compartida entre módulos (sin compartir base de datos)

Para que un cruce de datos futuro entre módulos sea trivial sin necesitar una migración, el identificador de empresa DEBE normalizarse igual en todos los módulos: `kezelmedica`, `vitaris`, `redbeat` (minúsculas, sin espacios ni acentos) — que es exactamente como ya está modelado `Company.slug` en el schema de Academy LMS. **Verificado en el código real de SIGE** (`backend/migrate.js`, tabla `collaborator_registry`, y su índice `idx_collab_registry_empresa ON collaborator_registry(UPPER(empresa))`): SIGE guarda la empresa como texto libre en mayúsculas sin espacios (`'KEZELMEDICA' | 'VITARIS' | 'REDBEAT'`, según `ARQUITECTURA.md` del repo SIGE) — la normalización hacia el slug de Academy es entonces solo un `.toLowerCase()`, no un mapeo de nombres distintos como se había asumido antes de revisar el código.

### Alta de usuarios: creación al primer acceso (reemplaza el job de sincronización por lote)

El mecanismo **principal** de alta de usuarios en Academy ya no es un job programado que sincroniza toda la lista de colaboradores — es la creación on-demand descrita en "Diseño definitivo de integración": la primera vez que SIGE pide un enlace de acceso para alguien, Academy lo crea con los datos que recibe en ese momento. Esto es más simple y evita mantener un job de sincronización corriendo de fondo. La investigación del schema real de SIGE que sigue abajo se conserva porque sus hallazgos (sobre todo el de la "baja") siguen aplicando igual de directo al nuevo mecanismo.

SIGE ya es la fuente de verdad operativa de "quién trabaja aquí, en qué empresa, en qué puesto" — tiene ~250 colaboradores dados de alta vía su flujo de onboarding (`collaborator_registry` → `POST /api/collaborators`). Antes de comprometer el diseño de arriba, se revisó el schema real (`backend/migrate.js`) y las rutas reales (`backend/routes/collaborators.js`, `backend/routes/users.js`) de SIGE para no asumir campos que no existen. Hallazgos concretos:

| Dato necesario para Academy | ¿Existe en SIGE hoy? | Dónde |
|:---|:---|:---|
| Email único de login | Sí | `users.email` (UNIQUE) |
| Nombre completo, rol, departamento, empresa | Sí | `profiles.full_name/role/department` + `profiles.empresa` (agregado por `ALTER TABLE`) |
| Ficha de onboarding completa (puesto, sede, fecha de ingreso) | Sí | `collaborator_registry` |
| **Flag de colaborador activo/inactivo (baja)** | **No existe.** Ni `users` ni `profiles` tienen columna `is_active`/`disabled`. `collaborator_registry.status` solo cubre el ciclo de **alta** (`pendiente` → `revisado` → `incorporado` → `rechazado`), no el de **baja**. | — |
| Endpoint que exponga email+empresa+rol de todos los colaboradores activos, sin restricción a un solo campo de filtro de dashboard | Parcial. `GET /api/users` existe pero es solo-admin y no incluye `empresa`; el detalle completo (`GET /api/users/:id`) sí trae `empresa` pero es por colaborador, uno a la vez. | `backend/routes/users.js` |

**Consecuencia directa para el diseño (aplica igual al mecanismo de creación al primer acceso)**: la idea de "cuando alguien causa baja en SIGE, Academy lo desactiva automáticamente" **no se puede construir todavía** — SIGE no guarda ese dato hoy. El endpoint `sso-issue` puede confiar en que SIGE solo lo llame para usuarios que SIGE considera vigentes en ese momento (SIGE sí sabe a quién dejó entrar a su propia sesión), pero Academy no tiene forma de enterarse después, por su cuenta, de que alguien fue dado de baja en SIGE — el `User` creado en Academy se queda activo indefinidamente salvo que alguien lo desactive ahí manualmente. Antes de cerrar esto del todo hay que decidir una de estas dos cosas (no lo decido yo, es una decisión de negocio/operación):
1. Agregar una columna de baja/estado a `users`/`profiles` en SIGE primero (cambio en el otro repo, fuera del alcance de Academy), y que `sso-issue` la consulte y rechace el acceso si el colaborador ya no está activo, o
2. Aceptar, por ahora, que la desactivación en Academy siga siendo manual, y revisar esto de nuevo cuando SIGE tenga ese dato.

**Patrón reutilizable encontrado y sí recomendable copiar**: SIGE ya resolvió "cómo le doy acceso a alguien sin que un admin tenga que inventarle una contraseña a mano" con una tabla `account_activation_tokens` (`registry_id`, `token_hash`, `expires_at`, `used`) — un token de un solo uso que el propio colaborador usa para activar su cuenta y poner su contraseña. Este es exactamente el patrón que Academy debería usar cuando la sincronización cree un usuario nuevo (en vez de generar una contraseña temporal como hace `POST /api/collaborators/:id/create-account` en SIGE, que es un patrón más viejo dentro del mismo repo).

### Patrón de integración futura entre módulos (no implementar todavía)

El ecosistema ya tiene un patrón probado para cuando un módulo necesita un dato de otro: llamada servidor-a-servidor con **token de servicio dedicado** (no la sesión del usuario final), origen explícitamente permitido y sin depender de cookies cross-domain — es el mismo patrón que hoy usa Vitaris para exponerle datos al CRM. Un caso de uso concreto ya identificable para Academy LMS: que SIGE consulte, antes de aprobar un viático, si un colaborador tiene vigente una capacitación obligatoria (ej. "Manejo de químicos" ligado a PNO-ADM-01). Esto se resolvería el día que se decida construir con un endpoint de solo lectura tipo `GET /api/integrations/certifications?userId=...` en Academy, protegido por token de servicio — **no se construye en las fases actuales de este plan**; se deja documentado aquí para que, cuando se decida, no haya que rediseñar nada ni el agente ejecutor tenga que inventar el patrón de integración desde cero.

### Patrones técnicos de SIGE reutilizables en Academy (verificados en el código real, no copiados a ciegas)

Revisando el backend de SIGE se encontraron prácticas ya probadas en producción que Academy debería adoptar cuando le toque construir lo equivalente — se documentan aquí para no reinventarlas ni improvisar algo peor. Ninguna de estas está implementada todavía en Academy; quedan como recomendación para la fase que corresponda:

| Patrón en SIGE | Dónde vivirá en Academy | Fase relevante |
|:---|:---|:---|
| **Rate limiting híbrido** (`backend/lib/hybridRateLimitStore.js`): usa Redis cuando está disponible para compartir el conteo entre workers de PM2 en modo cluster, y degrada automáticamente a memoria local si Redis no responde — nunca tumba el login. | Reemplazar el `Map` en memoria de `src/lib/auth.ts` por el mismo patrón (Redis opcional vía `REDIS_URL`, fallback a memoria) el día que Academy corra en más de una instancia/worker. Con una sola instancia PM2 no es urgente, pero si se activa modo cluster hay que resolverlo antes, no después. | Mejora técnica, no bloquea ninguna fase actual |
| **Auto-activación de cuenta con token de un solo uso** (`account_activation_tokens`: `registry_id`, `token_hash`, `expires_at`, `used`) en vez de contraseña temporal generada por un admin. | Usar exactamente este patrón para el flujo de alta de usuario en Academy (ya sea alta manual o, más adelante, por sincronización desde SIGE): el usuario nuevo recibe un correo con link de activación de un solo uso, nunca una contraseña temporal en texto. | Fase 1 (ya se construyó auth) — ajuste recomendado antes de abrir altas reales; hoy Academy solo tiene seed de desarrollo, así que no es urgente pero sí antes de producción |
| **Logging selectivo de accesos** (`backend/middleware/accessLogger.js`): solo registra mutaciones (POST/PUT/PATCH/DELETE) y respuestas de error (status ≥ 400), nunca cada GET — evita inflar la tabla de auditoría — y redacta explícitamente campos `password`/`confirmPassword` antes de guardar el detalle. | Aplicar el mismo criterio de selectividad y redacción en cualquier lugar de Academy que registre payloads completos en `ActivityLog` (hoy `logActivity` ya evita loguear cosas sensibles en el login; mantener ese criterio al agregar más acciones en fases futuras). | Todas las fases que agreguen nuevas llamadas a `logActivity` |
| **Script de precheck antes de arrancar** (`backend/tests/precheck.js`, enganchado a `predev`/`prestart` en `package.json`): valida conexión a BD y variables de entorno requeridas antes de levantar el servidor, con error claro en vez de un arranque a medias. | Agregar un script equivalente en Academy (`scripts/precheck.ts` + hooks `predev`/`prebuild` en `package.json`) que valide `DATABASE_URL`, `NEXTAUTH_SECRET` y la conexión a Postgres antes de arrancar. | Fase 1 (ajuste recomendado, no implementado todavía) |
| **Web Push (VAPID)** (`backend/routes/push.js` + `web-push`): notificaciones push del navegador además de las in-app/email. | Opcional para el módulo de Notificaciones — hoy Fase 5 de Academy solo contempla in-app + email; agregar push del navegador es una mejora disponible, no un requisito nuevo. | Fase 5 (opcional, a confirmar si se quiere) |

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
| **Ecosistema** | Academy LMS es el módulo #6 de la suite CorpoSuite (`corposuitekrv.com`), que ya incluye CRM, SIGE/GastosMed, RedBeat, Almacén y Vitaris en producción sobre el mismo servidor (`SER-DESARROLLO`). Integración federada (infra compartida, BD y stack independientes por módulo) — ver sección "🧩 Integración al Ecosistema CorpoSuite" |
