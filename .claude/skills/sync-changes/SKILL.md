---
name: sync-changes
description: Revisa, commitea y sube TODOS los cambios pendientes del repositorio (staged, unstaged y untracked) para que no quede nada sin subir a GitHub. Úsalo cuando el usuario pida "subir todos los cambios", "sincronizar el repo", "no dejar nada pendiente", "haz push de todo", o algo equivalente.
---

# Sync Changes

Objetivo: al terminar este skill, `git status` debe mostrar el árbol de trabajo limpio (sin cambios sin commitear) **y** el branch actual debe estar sincronizado con su remoto (sin commits locales sin pushear). Si algo impide llegar a ese estado, se reporta explícitamente al usuario en vez de forzar algo destructivo.

## Pasos

1. **Diagnóstico inicial** (en paralelo):
   - `git status` — ver archivos staged, unstaged y untracked.
   - `git diff` — cambios no staged.
   - `git diff --staged` — cambios ya staged.
   - `git log --oneline -5` — estilo de mensajes de commit reciente, para mantener consistencia.
   - `git rev-parse --abbrev-ref HEAD` — branch actual.
   - `git status -sb` o `git rev-list --left-right --count origin/<branch>...<branch>` (tras un `git fetch` si hay remoto) — saber si hay commits locales sin pushear o si el remoto tiene commits que no están local.

   Si no hay ningún cambio pendiente y el branch ya está sincronizado con el remoto: informar al usuario que no hay nada que subir y terminar aquí.

2. **Revisión de seguridad antes de agregar archivos**:
   - Listar los archivos untracked/modificados y verificar que ninguno luzca como secreto: `.env`, `.env.*` (salvo `.env.example`), `*.pem`, `*.key`, `credentials*.json`, `*secret*`, tokens, etc.
   - Si aparece un archivo sospechoso, **NO agregarlo**. Avisar al usuario qué archivo se excluyó y por qué, y continuar con el resto.
   - Confirmar que `.gitignore` ya cubre `node_modules/`, `.env`, `public/uploads/`, `.next/` y similares; si falta algo evidente, agregarlo a `.gitignore` antes de hacer `git add`.

3. **Agrupar cambios**: si el diff mezcla trabajo claramente no relacionado (por ejemplo, una parte de configuración y otra de una feature completa), preferir varios commits pequeños y descriptivos en vez de uno solo gigante — igual que en cualquier commit normal. Si es un solo tema, un commit basta. El objetivo de "no dejar nada pendiente" es sobre el estado final del repo, no sobre forzar un único commit.

4. **Stage y commit** por cada grupo lógico:
   - `git add <archivos específicos>` (evitar `git add -A`/`git add .` ciego; añadir explícitamente lo que corresponde a cada commit, excluyendo lo detectado en el paso 2).
   - Redactar un mensaje de commit conciso (1-2 líneas) enfocado en el "por qué", siguiendo el estilo visto en `git log`.
   - Commitear con heredoc y la línea de atribución que use este proyecto (revisar commits previos del repo para copiar el formato exacto de atribución si ya existe uno).

5. **Push**:
   - `git push` (o `git push -u origin <branch>` si el branch no tiene upstream todavía).
   - Si el push falla por divergencia con el remoto (`rejected`, `non-fast-forward`): NO hacer `push --force`. Hacer `git fetch` y `git log HEAD..origin/<branch> --oneline` para ver qué hay en el remoto que falta local, e informar al usuario para decidir cómo reconciliar (merge/rebase) — no decidir esto de forma autónoma.

6. **Verificación final**:
   - `git status` debe mostrar `nothing to commit, working tree clean`.
   - Confirmar que no hay commits locales por delante del remoto (`git status -sb` o comparando `git rev-parse HEAD` con `git rev-parse origin/<branch>`).
   - Reportar al usuario en 1-2 frases: qué se commiteó/subió, y si algo quedó excluido (por ejemplo, un archivo con pinta de secreto) explicar por qué no se subió.

## Reglas

- Nunca usar `git push --force`, `git reset --hard`, ni `git clean -fd` dentro de este skill.
- Nunca commitear un archivo que parezca contener secretos sin confirmarlo primero con el usuario.
- Si el repo no tiene remoto configurado (`git remote -v` vacío), avisar al usuario en vez de intentar adivinar uno.
- Si hay conflictos de merge o el working tree está en un estado raro (rebase/merge en progreso), detenerse y reportar — no intentar resolverlo automáticamente sin que el usuario lo sepa.
