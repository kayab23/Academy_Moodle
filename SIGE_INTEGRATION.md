# 🔗 Integración: Academy LMS como departamento embebido en SIGE

**Este archivo vive en el repositorio de Academy LMS pero está escrito para ejecutarse en el repositorio de SIGE (`app_viaticos`)** — cópialo a la raíz de ese repositorio antes de trabajar. Todo lo que describe se construye ahí, no en Academy.

## Contexto (léelo antes de tocar código)

SIGE está dejando de ser "la app de viáticos" para convertirse en el **portal/ERP** del grupo (Kezelmedica, Vitaris, Red Beat): un lugar único donde viven varios departamentos (Capacitación/Academy es el primero; Jurídico y Recursos Humanos vendrán después), cada uno como una aplicación independiente por debajo, pero **mostrada dentro de SIGE sin que el usuario salga de `sige.corposuitekrv.com`**.

Academy LMS (`https://academy.corposuitekrv.com`) ya existe como aplicación Next.js independiente, con su propia base de datos y su propio login. Tu trabajo aquí es **exclusivamente el lado de SIGE**: agregar una pestaña "Capacitación" que la muestre embebida.

**Principio que no debes romper**: SIGE sigue siendo dueño exclusivo de sus propios datos (`app_viaticos`) y Academy de los suyos (`academy_lms`) — esta integración NO comparte base de datos, NO comparte tabla de sesiones, y NO le da a Academy acceso directo a Postgres de SIGE ni viceversa. Lo único que cruza la frontera es una llamada servidor-a-servidor puntual para obtener un enlace de acceso de un solo uso.

## Qué se construye, en tres piezas

### 1. Variables de entorno nuevas (`backend/.env`)

```
# Integración con Academy LMS (portal de departamentos)
ACADEMY_API_URL=https://academy.corposuitekrv.com
ACADEMY_SERVICE_TOKEN=<generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

`ACADEMY_SERVICE_TOKEN` DEBE ser el mismo valor que se configure como `SIGE_SERVICE_TOKEN` en el `.env` de Academy LMS (es un secreto compartido entre los dos backends, generado una sola vez). Coordínalo con quien tenga acceso al despliegue de Academy — nunca lo hardcodees en el código, nunca lo expongas al frontend.

### 2. Nueva ruta de backend: `backend/routes/academy.js`

Sigue exactamente el mismo estilo que las rutas existentes (`backend/routes/push.js`, `backend/routes/collaborators.js`): Express router, `authenticate` importado de `./auth.js`, `query` importado de `../db.js`.

```js
// backend/routes/academy.js
import { Router } from 'express';
import { authenticate, auditLog } from './auth.js';
import { query } from '../db.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/academy/sso — pide a Academy LMS un enlace de acceso de un solo uso
// para el usuario autenticado de SIGE, y lo devuelve al frontend para montarlo
// en un iframe. El token de servicio NUNCA sale de este backend.
router.post('/sso', authenticate, apiLimiter, async (req, res) => {
  const ACADEMY_API_URL = process.env.ACADEMY_API_URL;
  const ACADEMY_SERVICE_TOKEN = process.env.ACADEMY_SERVICE_TOKEN;

  if (!ACADEMY_API_URL || !ACADEMY_SERVICE_TOKEN) {
    return res.status(503).json({ error: 'Integración con Academy no configurada en este servidor.' });
  }

  try {
    // req.user viene del JWT de SIGE (userId, email, role, empresa) — ver authenticate() en auth.js.
    // full_name no viaja en el JWT, se consulta aparte.
    const profileQ = await query('SELECT full_name FROM profiles WHERE id = $1', [req.user.userId]);
    const fullName = profileQ.rows[0]?.full_name || req.user.email;

    // Empresa ya viene en mayúsculas sin espacios en SIGE (KEZELMEDICA/VITARIS/REDBEAT);
    // Academy espera el slug en minúsculas — normalizar aquí, no del lado de Academy.
    const companySlug = (req.user.empresa || '').toLowerCase();
    if (!companySlug) {
      return res.status(422).json({ error: 'Tu cuenta no tiene una empresa asignada; no se puede abrir Capacitación.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let academyRes;
    try {
      academyRes = await fetch(`${ACADEMY_API_URL}/api/integrations/sige/sso-issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACADEMY_SERVICE_TOKEN}`,
        },
        body: JSON.stringify({
          email: req.user.email,
          fullName,
          companySlug,
          role: req.user.role,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!academyRes.ok) {
      console.error('[ACADEMY SSO] Academy respondió', academyRes.status);
      return res.status(502).json({ error: 'Capacitación no está disponible en este momento. Intenta más tarde.' });
    }

    const { accessUrl } = await academyRes.json();

    await auditLog(req.user.userId, 'academy_sso_issued', 'user', req.user.userId, {}, req.headers['x-forwarded-for'] || '');

    return res.json({ accessUrl });
  } catch (err) {
    console.error('[ACADEMY SSO] Error:', err.message);
    return res.status(502).json({ error: 'Capacitación no está disponible en este momento. Intenta más tarde.' });
  }
});

export default router;
```

Notas sobre este código:
- El **timeout de 5s + `AbortController`** es obligatorio: si Academy está caído o lento, SIGE no debe colgarse ni afectar el resto de la app — falla rápido con un mensaje claro.
- Usa `apiLimiter` (ya existe en `backend/middleware/rateLimiter.js`) en vez de inventar uno nuevo.
- Usa `auditLog` (ya exportado de `backend/routes/auth.js`) para dejar registro, igual que cualquier otra acción — no inventes un mecanismo de log distinto.
- Nunca devuelvas `ACADEMY_SERVICE_TOKEN` ni ningún detalle interno al frontend — solo `{ accessUrl }` o un mensaje de error genérico.

### 3. Registrar la ruta en `backend/index.js`

Junto a los demás `app.use('/api/...', ...)` (busca el bloque donde están `pushRouter`, `collaboratorsRouter`, etc.):

```js
import academyRouter from './routes/academy.js';
// ...
app.use('/api/academy', academyRouter);
```

### 4. Frontend: nueva vista "Capacitación"

Sigue el patrón de vistas existente en `src/App.tsx` y `src/components/Layout.tsx` (no uses react-router ni ninguna librería nueva de routing — SIGE ya resuelve sus vistas con un `currentView` de tipo `AppView` y render condicional).

**`src/components/Layout.tsx`**: agregar `'capacitacion'` al tipo `AppView` (línea con `export type AppView = 'dashboard' | 'trips' | ...`) y una entrada nueva en el arreglo `allNav`:
```ts
{ id: 'capacitacion', name: 'Capacitación', icon: GraduationCap },
```
(`GraduationCap` se importa de `lucide-react`, mismo paquete de iconos que ya usa el resto del navbar).

**`src/App.tsx`**:
- Agregar `'capacitacion'` a `VALID_VIEWS`.
- Agregar el render condicional junto a los demás (`{currentView === 'dashboard' && <Dashboard .../>}` etc.):
  ```tsx
  {currentView === 'capacitacion' && <CapacitacionView />}
  ```
- Revisar los bloques de restricción de vistas por rol (el `useEffect` que redirige según `normalizeRole(user.role)`, más abajo en el mismo archivo) y decidir explícitamente qué roles pueden ver `'capacitacion'` — probablemente todos los roles activos (es capacitación, no algo restringido a administración), pero esa decisión de negocio la confirma quien ejecute esta tarea, no se asume aquí.

**Nuevo componente `src/components/CapacitacionView.tsx`**:
```tsx
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, AlertTriangle } from 'lucide-react';

export function CapacitacionView() {
  const [accessUrl, setAccessUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.post<{ accessUrl: string }>('/academy/sso', {})
      .then((data) => { if (!cancelled) setAccessUrl(data.accessUrl); })
      .catch(() => { if (!cancelled) setError('No se pudo abrir Capacitación. Intenta de nuevo en unos minutos.'); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <AlertTriangle className="text-amber-500" size={32} />
        <p className="text-gray-600 dark:text-gray-300">{error}</p>
      </div>
    );
  }

  if (!accessUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <iframe
      src={accessUrl}
      title="Academy - Capacitación"
      style={{ width: '100%', height: '100%', border: 'none', minHeight: '80vh' }}
      // Sandbox explícito: permite scripts, forms y same-origin dentro del iframe
      // (Academy los necesita para funcionar), pero no permite que el contenido
      // enmarcado navegue la pestaña de nivel superior ni abra popups arbitrarios.
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
    />
  );
}
```

Ajusta las clases de Tailwind al sistema visual real de SIGE (revisa cómo lo hacen `Reports.tsx` o `Dashboard.tsx` para mantener consistencia) — el snippet de arriba es la estructura funcional, no el diseño final pixel-perfect.

## Lo que este archivo NO cubre (vive en el otro repo, no aquí)

El endpoint `POST /api/integrations/sige/sso-issue` y la página `/enlace-acceso` que consumen esta llamada se construyen **en Academy LMS**, no en SIGE — están definidos en `PLAN.md` de ese repositorio, sección "Diseño definitivo de integración: Academy como departamento embebido en el portal SIGE". Si ese endpoint todavía no existe cuando ejecutes esto, coordínalo antes de dar la tarea por terminada — sin él, `POST /api/academy/sso` de aquí fallará con 502 de forma controlada (no rompe el resto de SIGE), pero la pestaña "Capacitación" no funcionará.

## Checklist antes de dar esto por terminado

- [ ] `ACADEMY_API_URL` y `ACADEMY_SERVICE_TOKEN` configurados en `backend/.env` (nunca commiteados con valor real — agregar ambos a `backend/.env.example` con placeholder).
- [ ] `backend/routes/academy.js` creado, registrado en `backend/index.js`, protegido con `authenticate` + `apiLimiter`, con timeout explícito hacia Academy.
- [ ] Entrada "Capacitación" visible en el navbar (`Layout.tsx`) para los roles que se decida.
- [ ] `CapacitacionView.tsx` muestra loading, error y el iframe correctamente.
- [ ] Probado con Academy realmente desplegado en `academy.corposuitekrv.com` (o su equivalente en un entorno de prueba) — no solo con el mensaje de error de "no configurado".
- [ ] **Probado explícitamente en Safari/iOS**, no solo Chrome — hay una limitación conocida de cookies de terceros en iframes cross-origin documentada en el `PLAN.md` de Academy que puede afectar si la sesión dentro del iframe persiste correctamente en esos navegadores.
- [ ] `npm run check` (o el equivalente de este repo: typecheck + lint + test) pasa sin errores nuevos.
- [ ] No se tocó ninguna otra ruta, vista o configuración de SIGE que no sea estrictamente necesaria para esta integración.
