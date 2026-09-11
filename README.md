# 🎓 Academy LMS
Plataforma empresarial de capacitación, gestión de cursos y seguimiento de competencias inspirada en Moodle, diseñada con arquitectura multi-empresa para **Kezelmedica**, **Red Beat** y **Vitaris**.

Para el detalle de investigación, arquitectura, módulos y fases, consulta [PLAN.md](PLAN.md).  
Para las reglas estrictas de seguridad, base de datos y estándares de calidad, consulta [SPEC.md](SPEC.md).

---

## 🚀 Inicio Rápido en Desarrollo Local

### Requisitos previos
- **Node.js**: v18+ (recomendado v20+)
- **PostgreSQL**: v14+ en ejecución local (puerto 5432)
- **Git**

### Instalación y Puesta en Marcha

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Copiar `.env.example` a `.env` y configurar la cadena de conexión local:
   ```bash
   cp .env.example .env
   ```
   Asegurar que `DATABASE_URL` apunte a tu instancia local de PostgreSQL:
   ```env
   DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/academy_lms?schema=public"
   NEXTAUTH_SECRET="tu_secreto_aleatorio_de_32_bytes"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Ejecutar migraciones de base de datos**:
   ```bash
   npm run prisma:migrate
   ```

4. **Poblar datos iniciales (Seed)**:
   Crea las empresas (Kezelmedica, Red Beat, Vitaris), departamentos y el usuario administrador:
   ```bash
   npm run prisma:seed
   ```
   *Credenciales creadas por defecto*:
   - **Admin**: `admin@academy.local` | `Password123!`
   - **Colaborador Kezelmedica**: `colaborador@kezelmedica.com` | `Password123!`
   - **Colaborador Red Beat**: `colaborador@redbeat.com` | `Password123!`
   - **Colaborador Vitaris**: `colaborador@vitaris.com` | `Password123!`

5. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 🛠️ Scripts Disponibles

| Script | Descripción |
|:---|:---|
| `npm run dev` | Inicia servidor de desarrollo Next.js |
| `npm run build` | Compilación de producción y type-check |
| `npm run start` | Inicia servidor de producción |
| `npm run lint` | Análisis de código con ESLint |
| `npm run prisma:generate` | Genera cliente Prisma actualizado |
| `npm run prisma:migrate` | Aplica migraciones pendientes |
| `npm run prisma:seed` | Ejecuta script de seed |
| `npm run prisma:studio` | GUI interactiva para explorar la BD |

---

## 🔐 Seguridad y Aislamiento

- **Aislamiento Multi-Empresa**: Todas las consultas a nivel de datos aplican alcance por `companyId` salvo para el rol `ADMIN`.
- **Autenticación**: Proveedor Credentials con hash `bcrypt` (cost 12), rate limiting contra ataques de fuerza bruta y sesiones JWT cifradas.
- **Protección**: `middleware.ts` resguarda las rutas privadas redirigiendo a login si no hay sesión activa.
