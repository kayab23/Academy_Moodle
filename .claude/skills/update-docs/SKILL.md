---
name: update-docs
description: Revisa el código real del proyecto contra PLAN.md, SPEC.md, README.md y .env.example, y actualiza la documentación para que refleje el estado real (no al revés). Úsalo después de terminar una fase o feature, antes de cerrar un PR, o cuando el usuario pida "actualiza la documentación", "mantén los docs al día", "sincroniza el README", o algo equivalente. También conviene invocarlo proactivamente al notar que el código cambió pero PLAN.md/SPEC.md no.
---

# Update Docs

Objetivo: que [PLAN.md](../../PLAN.md), [SPEC.md](../../SPEC.md), `README.md` y `.env.example` describan siempre lo que el código **realmente hace hoy**, no lo que se planeó originalmente. La documentación sigue al código, nunca al revés: si el código no cumple una regla de SPEC.md, la solución es arreglar el código o discutirlo con el usuario — nunca relajar la regla en silencio para que coincida con el código no conforme.

## Cuándo usarlo

- El usuario lo pide explícitamente ("actualiza la doc", "revisa que el README esté al día").
- Se acaba de cerrar una fase de PLAN.md o una feature grande (nuevos modelos en `schema.prisma`, nuevos endpoints, nueva variable de entorno, nueva regla de seguridad implementada).
- Antes de dar por terminada una tarea que tocó `schema.prisma`, rutas de `src/app/api/`, `middleware.ts`, o cualquier archivo de configuración (`next.config.js`, `package.json`).

## Pasos

1. **Detectar qué cambió realmente**:
   - `git log --oneline -15` y `git diff <último commit de docs>..HEAD --stat` (o `git status`/`git diff` si hay cambios sin commitear) para ver qué archivos de código se tocaron desde la última actualización de documentación.
   - Priorizar: `prisma/schema.prisma`, `src/app/api/**`, `middleware.ts`, `.env.example` real vs código, `package.json` (scripts y dependencias), estructura de `src/`.

2. **Contrastar contra PLAN.md**:
   - **Fases**: por cada checkbox `- [ ]` de la fase actual, verificar en el código si esa tarea ya existe (ej. "CRUD de cursos" → ¿existen las rutas/Server Actions correspondientes?). Marcar `- [x]` solo lo que está realmente implementado y funcional, no lo que está a medias.
   - **Estructura de carpetas**: comparar el árbol bajo "Patrón Arquitectónico" con la estructura real (`src/`, `prisma/`). Si hay carpetas nuevas no documentadas o carpetas documentadas que no existen, actualizar el árbol.
   - **Modelo de datos**: comparar la tabla "Modelo detallado" y el diagrama Mermaid contra los modelos reales de `prisma/schema.prisma`. Si hay un modelo nuevo, campo nuevo relevante, o una relación que cambió, reflejarlo. Si un modelo documentado ya no existe, eliminarlo de la tabla y del diagrama.
   - **Scripts de `package.json`**: comparar la tabla de scripts esperados contra los scripts reales; agregar los que falten, quitar los que ya no existan.

3. **Contrastar contra SPEC.md**:
   - Si el código introduce algo con implicación de seguridad que SPEC.md no cubre (ej. un nuevo tipo de archivo subible, un nuevo proveedor de auth, un nuevo endpoint público sin sesión), agregar la regla correspondiente a la sección pertinente de SPEC.md en vez de dejarlo sin documentar.
   - Si al revisar el código se detecta una violación de una regla existente de SPEC.md (ej. una query que no filtra por `companyId`, un `onDelete` no declarado, un `any` sin justificar), **no silenciar la regla**: reportarlo explícitamente al usuario como hallazgo, y solo corregir la documentación si el usuario confirma que el comportamiento actual es el correcto y hay que actualizar la regla.

4. **`.env.example` vs uso real**:
   - `grep -r "process.env\." src/` (o equivalente) para listar todas las variables de entorno que el código realmente lee.
   - Comparar contra `.env.example`: agregar las que falten (con placeholder, nunca con valor real), quitar las que ya no se usan en ningún lado.

5. **README.md**:
   - Si no existe y ya hay código funcional (al menos Fase 1 completa), crear uno breve con: qué es el proyecto (1-2 líneas, referenciando PLAN.md para el detalle), cómo levantar el entorno local (clonar, `npm install`, copiar `.env.example` a `.env`, `npm run prisma:migrate`, `npm run dev`), y un enlace a PLAN.md y SPEC.md para arquitectura/seguridad. No duplicar contenido extenso de esos documentos en el README — el README es la puerta de entrada rápida, no el documento de referencia.
   - Si ya existe, solo corregir lo que quedó desactualizado (comandos que cambiaron, requisitos nuevos como tener LibreOffice instalado localmente para la conversión de PPTX).

6. **Aplicar los cambios** con Edit (no reescribir documentos completos si solo cambió una sección) y hacer un resumen breve al usuario de qué se actualizó y por qué, incluyendo cualquier discrepancia código↔spec que haya quedado pendiente de decisión del usuario.

## Reglas

- Nunca marcar una tarea de PLAN.md como completada (`[x]`) si no se verificó en el código real — no basarse en lo que "debería" estar hecho.
- Nunca modificar una regla de seguridad o de base de datos en SPEC.md solo para que deje de contradecir al código, sin que el usuario lo haya confirmado primero.
- No agregar a la documentación funcionalidades que no existen en el código todavía (eso es responsabilidad de PLAN.md como plan, no de este skill).
- Si este skill y `sync-changes` se usan juntos, `update-docs` corre primero (para que los cambios de documentación queden incluidos en lo que `sync-changes` sube).
