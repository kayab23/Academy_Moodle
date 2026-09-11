# 🔒 SPEC.md — Especificación Obligatoria de Seguridad, Arquitectura de BD y Calidad

Este documento es de **lectura y cumplimiento obligatorios antes de escribir la primera línea de código** de Academy LMS. Complementa a [PLAN.md](PLAN.md) (visión, funcionalidades, fases) y no lo reemplaza. Donde haya conflicto, **esta SPEC gana en todo lo relacionado a seguridad, base de datos y calidad de código/UX** — PLAN.md gana en alcance funcional.

Cada regla usa **DEBE / NO DEBE** para dejar cero ambigüedad. Ninguna fase de PLAN.md se considera completa si viola una regla de esta SPEC.

---

## 1. Reglas Estrictas de Seguridad

### 1.1 Autenticación

- DEBE usarse `bcrypt` (cost factor ≥ 12) o `argon2id` para hashear contraseñas. NO DEBE almacenarse ni loguearse jamás una contraseña en texto plano.
- DEBE aplicarse una política de contraseña mínima: 8+ caracteres, validada en el servidor (no solo en el cliente).
- DEBE existir rate limiting en el endpoint de login (ej. máx. 5 intentos fallidos en 15 min por combinación IP+email) con backoff, para mitigar fuerza bruta.
- DEBE existir un flujo de reseteo de contraseña con token de un solo uso, expiración corta (≤ 1 hora) y invalidación del token tras su uso.
- NO DEBE revelarse en los mensajes de error si el email existe o no ("credenciales inválidas" genérico, nunca "usuario no encontrado").

### 1.2 Autorización (RBAC)

- Toda verificación de rol y permisos DEBE ejecutarse **en el servidor** (API Route / Server Action / middleware). NO DEBE confiarse en el rol enviado desde el cliente ni ocultarse una acción solo con CSS/JS.
- DEBE centralizarse la lógica de permisos en `src/lib/scope.ts` (o equivalente) y ser reutilizada — NO DEBE reimplementarse la lógica de "¿puede este usuario ver/editar X?" de forma dispersa en cada endpoint.
- Cada Server Action / API Route que mute datos DEBE verificar explícitamente: (a) sesión válida, (b) rol autorizado para esa acción, (c) pertenencia a la empresa (`companyId`) del recurso afectado, salvo rol `ADMIN`.
- DEBE aplicarse el **aislamiento multi-empresa como control de seguridad, no solo de negocio**: cualquier query que devuelva datos de `Course`, `Enrollment`, `Grade`, `Certificate`, `User`, etc. DEBE filtrar por `companyId` salvo `ADMIN`. Un fallo aquí se trata como vulnerabilidad crítica (fuga de datos entre empresas), no como bug menor.

### 1.3 Sesiones

- Las sesiones DEBEN usar JWT firmado (NextAuth) transportado en cookie `httpOnly`, `secure` (en producción) y `sameSite: 'lax'` o `'strict'`.
- NO DEBE almacenarse el JWT en `localStorage` ni exponerse al JavaScript del cliente.
- El token DEBE tener expiración (ej. 8h) y renovarse mediante refresh silencioso, no sesiones infinitas.
- `middleware.ts` DEBE proteger toda ruta bajo `(dashboard)` redirigiendo a login si no hay sesión válida.

### 1.4 Validación de entrada

- Todo input de usuario (body de API Route, Server Action, query params) DEBE validarse con un schema (`zod` recomendado) en el servidor antes de tocar la base de datos. NO DEBE confiarse en validación solo del lado cliente.
- Los mensajes de error de validación NO DEBEN filtrar detalles internos (stack traces, nombres de tablas/columnas).

### 1.5 Inyección SQL

- Todo acceso a datos DEBE hacerse vía Prisma Client (queries parametrizadas). NO DEBE usarse `$queryRawUnsafe` ni concatenación de strings para construir SQL con datos de usuario. Si se requiere SQL crudo, DEBE usarse `$queryRaw` con template tagged literals (parametrizado), nunca interpolación manual.

### 1.6 XSS y contenido enriquecido

- React ya escapa por defecto; NO DEBE usarse `dangerouslySetInnerHTML` con contenido no sanitizado.
- El editor rich-text de lecciones (contenido HTML generado por instructores) DEBE sanitizarse en el servidor con una librería como `DOMPurify` (server-side vía `isomorphic-dompurify` o similar) antes de guardarse o renderizarse.
- DEBE configurarse una **Content Security Policy** (vía headers en `next.config.js` o middleware) que restrinja `script-src` a orígenes propios.

### 1.7 CSRF

- Las Server Actions de Next.js ya incluyen protección CSRF nativa; para API Routes tradicionales que mutan estado DEBE verificarse el origen de la petición (header `Origin`/`Referer`) o usarse tokens CSRF si se exponen a clientes externos.

### 1.8 Subida de archivos (PPTX, PDF, video, imágenes)

- DEBE validarse tipo de archivo por **magic bytes / firma real del archivo**, no solo por extensión o `Content-Type` declarado por el cliente.
- DEBE aplicarse whitelist estricta de extensiones permitidas por tipo de recurso (`.pptx`, `.pdf`, `.mp4`, `.jpg/.png/.webp`).
- DEBE aplicarse límite de tamaño por tipo (ver `MAX_VIDEO_SIZE_MB` / `MAX_DOCUMENT_SIZE_MB` en `.env`), verificado en el servidor, no solo en el input del navegador.
- Los archivos DEBEN guardarse con un nombre generado (UUID), nunca con el nombre original del usuario, para evitar path traversal y colisiones. La ruta de guardado NO DEBE construirse concatenando directamente el nombre de archivo provisto por el usuario.
- El endpoint que sirve archivos (`/api/uploads/[...path]`) DEBE validar que el usuario autenticado tiene permiso sobre ese recurso (pertenece a un curso al que está inscrito/asignado) antes de servirlo — NO DEBE ser un directorio estático públicamente listable.
- Los archivos subidos NO DEBEN ejecutarse ni interpretarse nunca como código (sin `.php`, `.exe`, `.sh`, `.html` en la whitelist).

### 1.9 Cabeceras de seguridad HTTP

DEBEN configurarse globalmente (Next.js `headers()` en `next.config.js`):
- `Strict-Transport-Security` (en producción, HTTPS obligatorio)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (o `frame-ancestors 'self'` vía CSP)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` definida explícitamente

### 1.10 Secretos y configuración

- NO DEBE commitearse jamás `.env` con valores reales; solo `.env.example` con placeholders.
- `NEXTAUTH_SECRET` y credenciales SMTP DEBEN ser valores fuertes generados aleatoriamente (≥ 32 bytes), distintos entre dev/staging/prod.
- NO DEBE loguearse el contenido de variables de entorno ni de objetos de sesión completos en consola/logs de producción.

### 1.11 Auditoría

- Toda acción sensible (login, cambio de rol, cambio de calificación manual, eliminación de curso/usuario, emisión de certificado) DEBE registrarse en la tabla `ActivityLog` con `userId`, `action`, `entityType`, `entityId`, `metadata`, `createdAt`.
- Los logs de auditoría NO DEBEN ser editables ni eliminables desde la aplicación (solo lectura para Admin).

### 1.12 Dependencias y manejo de errores

- DEBE correrse `npm audit` (o equivalente) periódicamente; NO DEBE introducirse una dependencia nueva con vulnerabilidades críticas/altas conocidas sin justificación documentada.
- El `package-lock.json` DEBE commitearse para builds reproducibles.
- En producción, los errores NO DEBEN mostrar stack traces ni mensajes internos al cliente — DEBE mostrarse un mensaje genérico y loguear el detalle solo server-side.

---

## 2. Arquitectura de Base de Datos — Mejores Prácticas

### 2.1 Identificadores

- Todas las tablas DEBEN usar `id` tipo `String @id @default(cuid())` (o `uuid()`), **nunca enteros autoincrementales expuestos públicamente** (evita enumeración de recursos vía URL, ej. `/courses/1`, `/courses/2`).

### 2.2 Convenciones de nombres

- Modelos Prisma en `PascalCase` singular (`User`, `CourseCompany`). Columnas en `camelCase` en el schema, mapeadas a `snake_case` en la tabla física vía `@map`/`@@map` para consistencia con convenciones SQL estándar.

### 2.3 Integridad referencial

- Toda relación DEBE declarar explícitamente `onDelete` — no dejarlo en default silencioso:
  - `onDelete: Cascade` solo donde el hijo no tiene valor sin el padre (ej. `Question` al borrar `Quiz`).
  - `onDelete: Restrict` donde borrar el padre no debe ser posible si hay hijos (ej. no permitir borrar un `Course` con `Certificate`s ya emitidos).
  - `onDelete: SetNull` donde la relación es opcional y el hijo debe sobrevivir (ej. `Course.instructorId` si se borra el instructor).

```prisma
model Question {
  id     String @id @default(cuid())
  quiz   Quiz   @relation(fields: [quizId], references: [id], onDelete: Cascade)
  quizId String
}

model Certificate {
  id       String @id @default(cuid())
  course   Course @relation(fields: [courseId], references: [id], onDelete: Restrict)
  courseId String
}
```

### 2.4 Índices

- DEBE indexarse toda columna usada frecuentemente en `WHERE`/`JOIN`: llaves foráneas (`companyId`, `userId`, `courseId`), columnas de estado (`status`), y columnas usadas para ordenar (`createdAt`).

```prisma
model Enrollment {
  id        String   @id @default(cuid())
  userId    String
  courseId  String
  status    EnrollmentStatus
  enrolledAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
  @@index([courseId, status])
  @@index([userId])
}
```

### 2.5 Restricciones únicas

- DEBEN declararse `@@unique` donde el negocio lo exige: `User.email` único global, `[userId, courseId]` único en `Enrollment` (no doble inscripción), `Certificate.certificateNumber` único global.

### 2.6 Timestamps y soft delete

- Todo modelo relevante para el negocio DEBE tener `createdAt DateTime @default(now())` y `updatedAt DateTime @updatedAt`.
- `User` y `Course` DEBEN usar **soft delete** (`isActive Boolean @default(true)` / `archivedAt DateTime?`) en lugar de borrado físico, para preservar integridad de calificaciones, certificados e historial. Los logs de auditoría NUNCA se borran físicamente.

### 2.7 Transacciones

- Toda operación que escriba en más de una tabla como una sola unidad lógica (ej. enviar intento de quiz → crear `Answer[]` → crear `Grade` → actualizar `UserProgress`) DEBE envolverse en `prisma.$transaction(...)` para evitar estados inconsistentes.

### 2.8 Migraciones

- DEBE usarse `prisma migrate dev` en desarrollo y `prisma migrate deploy` en producción. NO DEBE editarse a mano una migración ya aplicada en producción — cualquier corrección se hace con una migración nueva.
- Los archivos de migración DEBEN commitearse al repositorio (son parte del código, no artefactos generados a ignorar).

### 2.9 Rendimiento de queries

- Las queries a listados (`courses`, `users`, `reports`) DEBEN paginarse (`skip`/`take` o cursor-based) — NO DEBE devolverse un arreglo sin límite desde ningún endpoint.
- DEBE usarse `select`/`include` explícito en Prisma para traer solo los campos necesarios — NO DEBE hacerse `findMany()` sin criterios en tablas que crecerán (ej. `ActivityLog`, `Notification`).
- DEBE evitarse el patrón N+1 (loop haciendo una query por cada elemento); usar `include` anidado o batch queries.

### 2.10 Entorno y respaldo

- Dev, staging y producción DEBEN usar bases de datos separadas (nunca compartir `DATABASE_URL`).
- Al ser infraestructura on-premise, DEBE documentarse (fuera de código, en runbook de operaciones) una estrategia de backup periódico de PostgreSQL (ej. `pg_dump` nocturno) antes de ir a producción — no es responsabilidad del código de la app, pero el proyecto no se considera "listo para producción" sin ello.

---

## 3. Estándares de Calidad (Moderno · Dinámico · Intuitivo · Escalable · Robusto)

### 3.1 Sistema de diseño

- DEBE existir un único origen de verdad para tokens visuales (`src/styles/globals.css`): escala de espaciado, radios, tipografía, colores base y colores de marca por empresa. NO DEBEN usarse valores mágicos (`padding: 13px`) sueltos en componentes.
- DEBE respetarse la escala tipográfica y de espaciado definida — NO DEBE introducirse un tamaño de fuente o espaciado ad-hoc fuera de los tokens sin justificación.

### 3.2 Estados de UI obligatorios

- Toda vista que dependa de datos remotos DEBE implementar explícitamente sus 4 estados: **loading** (skeleton, no spinner genérico ni pantalla en blanco), **error** (mensaje claro + acción de reintento), **vacío** (empty state con guía de siguiente acción) y **éxito**.
- Las acciones destructivas (eliminar curso, remover usuario) DEBEN pedir confirmación explícita.

### 3.3 Accesibilidad

- DEBE cumplirse WCAG 2.1 nivel AA como mínimo: contraste de color suficiente (incluyendo en dark mode), navegación completa por teclado, estados de foco visibles, atributos `aria-*` en componentes interactivos custom (modals, dropdowns, tabs).

### 3.4 Rendimiento

- Las imágenes DEBEN servirse vía `next/image` (optimización automática, lazy loading).
- Los visores pesados (PDF, video) DEBEN cargarse de forma diferida (`dynamic import`, `loading="lazy"`), no bloquear el render inicial del layout.
- DEBE evitarse re-render innecesario en listas grandes (paginación o virtualización en tablas de Gradebook/Reportes con muchos registros).

### 3.5 Responsive y consistencia

- Breakpoints DEBEN ser consistentes en todo el proyecto: móvil `<640px`, tablet `<1024px`, desktop `≥1024px`, definidos como variables/mixins reutilizables, no repetidos con valores distintos por componente.
- Las animaciones/transiciones DEBEN usar duraciones consistentes (ej. 150ms para micro-interacciones, 250–300ms para transiciones de layout) definidas como tokens, no valores sueltos por componente.

### 3.6 Calidad de código

- TypeScript DEBE correr en modo `strict`. NO DEBE usarse `any` sin comentario justificando por qué no hay alternativa tipada.
- DEBE pasar `npm run lint` y `npm run build` sin errores antes de considerar cerrada cualquier tarea (ya establecido en PLAN.md, se reafirma aquí como estándar de calidad, no solo de proceso).
- La lógica de negocio sensible (cálculo de calificación final, agregación de progreso, reglas de emisión de certificado) DEBE tener pruebas unitarias — no queda a criterio, es requisito de "robusto".

### 3.7 Escalabilidad

- Las API Routes DEBEN ser stateless (sin estado en memoria del proceso) para poder escalar horizontalmente — la sesión vive en el JWT, no en memoria del servidor.
- Procesos pesados y lentos (conversión de PPTX a PDF, envío masivo de notificaciones/emails) DEBEN diseñarse de forma que puedan moverse a una cola/worker en el futuro sin rediseñar el resto del sistema (aislar esta lógica en `src/lib/`, no mezclarla directamente en el handler de la API Route).

---

## 4. Checklist Obligatorio Antes de Cerrar Cualquier Fase o Pull Request

- [ ] `npm run lint` y `npm run build` pasan sin errores ni warnings nuevos.
- [ ] Toda query nueva que toque datos multi-empresa filtra por `companyId` (o está explícitamente justificado por qué no aplica).
- [ ] Todo endpoint nuevo que muta datos valida sesión, rol y pertenencia del recurso en el servidor.
- [ ] Todo input de usuario nuevo se valida con schema en el servidor.
- [ ] Toda tabla nueva en `schema.prisma` tiene `id` tipo cuid, `createdAt`/`updatedAt`, `onDelete` explícito en sus relaciones, e índices en sus llaves foráneas.
- [ ] Toda vista nueva con datos remotos implementa loading/error/empty/success.
- [ ] Ningún texto de interfaz está hardcodeado fuera del sistema i18n.
- [ ] No se commiteó ningún secreto real ni archivo de `public/uploads/`.
- [ ] Las acciones sensibles añadidas quedan registradas en `ActivityLog`.

---

Este documento se actualiza junto con el proyecto: si una decisión de seguridad o arquitectura cambia, DEBE reflejarse aquí antes de implementarse, no después.
