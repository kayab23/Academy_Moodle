---
name: deploy
description: Guía paso a paso para desplegar Academy LMS a producción (servidor Windows accedido vía RDP, proceso PM2 "academy-lms"). Úsalo cuando el usuario pida "despliega a producción", "sube esto al servidor", "haz el deploy", "actualiza el servidor", "dame los comandos para el servidor" o algo equivalente.
---

# Deploy a Producción

Objetivo: que el código de `main` quede corriendo en el servidor de producción (`C:\AcademyLMS\app`, proceso PM2 `academy-lms`, puerto interno `3100`) sin dejar el sitio caído en el proceso. Claude Code **no tiene acceso directo al servidor de producción** — este skill es una guía colaborativa: Claude da el comando exacto, el usuario lo ejecuta por RDP y pega la salida, Claude la interpreta y da el siguiente paso.

Contexto de referencia: [PLAN.md](../../../PLAN.md), sección "Pasos precisos para desplegar Academy LMS como módulo #6", documenta la infraestructura (ruta, puerto, Nginx, Cloudflare Tunnel). Este skill cubre el ciclo de **actualización** de una instancia que ya existe, no el alta inicial del servidor/Nginx/Cloudflare — eso es manual y poco frecuente.

## Pre-requisito: código ya en `main` remoto

Antes de tocar el servidor, confirmar en el repo local:
```bash
git status
git log origin/main..HEAD --oneline
```
Si hay cambios sin commitear o commits locales sin pushear, resolverlo primero (usar el skill `sync-changes`, o preguntar al usuario). **Nunca desplegar código que no esté en `origin/main`** — el servidor hace `git pull`, así que lo que no está en el remoto no llega.

Si el cambio tocó `prisma/schema.prisma`, avisar al usuario explícitamente que este deploy va a requerir `prisma migrate deploy` en el servidor (paso 5 abajo), no solo `prisma generate`.

## Pasos (comandos para que el usuario los corra en la sesión RDP)

### 1. Confirmar identidad del proceso (solo si ha pasado tiempo o algo no cuadra)

```powershell
pm2 describe academy-lms
```

Confirmar `exec cwd` (debería ser `C:\AcademyLMS\app`) y `script args` (`start -p 3100`). Si difiere de lo documentado en PLAN.md, usar lo que muestre `pm2 describe`, no lo que diga la doc — el servidor real manda.

### 2. Ir al directorio y traer el código

```powershell
cd C:\AcademyLMS\app
git pull origin main
```

**Cada ventana nueva de PowerShell abre en `C:\WINDOWS\system32`.** Si el usuario abrió una sesión RDP distinta a la de pasos anteriores, el `cd` hay que repetirlo ahí — no asumir que el directorio de trabajo persiste entre ventanas. Si `npm`/`npx` fallan con `ENOENT ... package.json` o `npx` intenta instalar una versión de paquete rara (ej. una versión mayor de `prisma` no usada por el proyecto), es señal de que el comando corrió fuera de `C:\AcademyLMS\app` — parar y confirmar el directorio antes de seguir.

### 3. Detener el proceso ANTES de generar/compilar — crítico en Windows

```powershell
pm2 stop academy-lms
```

**Por qué este orden importa**: en Windows, mientras PM2 tiene el proceso corriendo, el motor de Prisma (`query_engine-windows.dll.node`) queda con el archivo bloqueado. Si se corre `prisma generate` o `npm run build` con el proceso todavía `online`, falla con `EPERM: operation not permitted, rename ... .tmpXXXX -> query_engine-windows.dll.node`. Este error ya se presentó en producción — **siempre detener el proceso primero**, nunca intentar compilar con el proceso activo.

Es seguro detenerlo aquí: `.next/` no se toca todavía en este paso, así que si algo sale mal más adelante, `pm2 start academy-lms` recupera la última build que sí funcionaba.

### 4. Instalar dependencias (solo si `package.json`/`package-lock.json` cambiaron)

```powershell
git diff HEAD@{1} HEAD --stat -- package.json package-lock.json
```
Si hay salida, correr `npm install`. Si no, se puede omitir para ahorrar tiempo.

### 5. Migraciones de base de datos (solo si `prisma/schema.prisma` cambió en este deploy)

```powershell
npx prisma migrate deploy
```
Nunca `prisma migrate dev` en producción (SPEC.md 2.8). Si el schema no cambió, saltar este paso.

### 6. Generar cliente Prisma y compilar

```powershell
npx prisma generate
npm run build
```

Confirmar que la salida incluya `✓ Compiled successfully` y termine con la tabla de rutas (`Route (app)`). Los mensajes tipo `[XXX_GET_ERROR] ... Dynamic server usage ... couldn't be rendered statically because it used 'headers'` que aparecen durante `Generating static pages` son ruido esperado de rutas dinámicas (`/api/*` que leen `headers()`) — **no son errores reales**, siempre que el build termine con la tabla de rutas y sin un mensaje de error fatal al final.

Si el build falla por cualquier otra razón: no reintentar a ciegas. Leer el error, decidir el fix, y solo entonces repetir este paso. El sitio sigue seguro mientras tanto porque `.next/` de la build anterior sigue intacto — ver paso 7.

### 7. Levantar el proceso

```powershell
pm2 start academy-lms
```
(No `pm2 restart` aquí — el proceso ya está `stopped` desde el paso 3; `start` es el comando correcto para reactivarlo.)

### 8. Verificar

```powershell
pm2 list
pm2 logs academy-lms --lines 30
```

- `pm2 list` DEBE mostrar `academy-lms` en estado `online`.
- El log de salida (`out.log`) DEBE terminar con `✓ Ready in <tiempo>`.
- Si el log de errores (`error.log`) muestra algo, verificar el timestamp/contexto — este log es acumulativo entre despliegues, así que puede haber ruido viejo de incidentes anteriores no relacionados con este deploy. Lo que importa es si aparece algo **nuevo** después del restart de este paso.

## Si el sitio queda caído a mitad del proceso

Si en cualquier punto `pm2 list` muestra `academy-lms` en `stopped` o `errored` y no es un paso intencional de este flujo, es urgente: priorizar `pm2 start academy-lms` para recuperar el servicio con la última build funcional antes de seguir investigando la causa.

## Reglas

- Nunca tocar los demás procesos de PM2 en esa máquina (`gastosmed-api` y sus réplicas en cluster) — pertenecen a otra app (SIGE). Solo actuar sobre `academy-lms`.
- Nunca usar `pm2 delete`, `git reset --hard`, ni `git push --force` como parte de este flujo.
- No asumir la ruta/puerto del servidor de memoria si `pm2 describe academy-lms` dice algo distinto a PLAN.md — confiar en el servidor real y, si hay diferencia, avisar al usuario para actualizar PLAN.md después.
- Si `git pull` falla por conflicto o el working tree del servidor tiene cambios locales sin commitear (alguien editó algo directo en el servidor), detenerse y reportarlo — no forzar con `git checkout .` ni `git reset --hard` sin que el usuario lo confirme explícitamente.
- Cada comando se entrega uno o pocos a la vez, esperando la salida real del usuario antes de asumir que funcionó — no encadenar los 8 pasos de un jalón sin ver resultados intermedios, salvo que el usuario pida explícitamente el listado completo de comandos de una vez.
