# Tareas 008 — pulido-historias

**Approved:** 2026-10-22 · el dueño

Cómo se trabaja en paralelo (plan, bloque 2): cada tarea va en su propio worktree, en
`.claude/worktrees/`, con su `node_modules`. Los worktrees salen de `main`, así que cada tarea
empieza, con el árbol limpio, así:
1. `git branch -m spec/008-pulido-historias-T-n`: se renombra la rama que da la app, no se crea otra
   con `checkout -B`, para no dejar ramas `worktree-agent-*` huérfanas;
2. `git reset --hard 25f65ab`;
3. `npm ci`, `npm run build:packages` y `npm run gallery:astro`.

Al cerrar la ola, la sesión de git mergea las ramas en `spec/008-pulido-historias`. Se borra
`node_modules` antes de quitar cada worktree.

Ningún archivo es compartido:
- `gallery/.storybook/preview-head.html` y `gallery/.storybook/preview.ts`: solo la T-1;
- `gallery/stories/Button.astro.stories.tsx`: solo la T-2.

- [ ] **T-1 — La vista de historia y sus barras siguen al tema de la galería**
  Cubre: RF-1, RF-2, regla 7 en las vistas de historia
  Archivos: `gallery/.storybook/preview-head.html` (fondo de la vista, `color-scheme` de la raíz),
  `gallery/.storybook/preview.ts` (`data-docs-scheme` en `ThemedDocsContainer`),
  `tests/lib/contrast.ts` (`visibleTexts`, movida de `gallery-docs-theme.test.ts`),
  `tests/gallery-docs-theme.test.ts`, `tests/gallery-story-theme.test.ts`
  Hecho cuando:
  - En Edge, en `Button/React/Default` y `Button/Astro/Variants`, con `theme:dark`, `theme:light` y
    `theme:system` con emulación oscura y clara, las cuatro esquinas y el centro del viewport dan
    el fondo del decorador. Ese fondo es oscuro o claro según el tema, también tras desplazar la
    historia Astro hasta abajo.
  - La raíz y todo elemento con desplazamiento propio, en las dos vistas y en las dos páginas de
    documentación, resuelven `color-scheme` `dark` con `theme:dark` y `light` con `theme:light`, y
    lo cambian al cambiar el tema desde la barra con la página abierta.
  - Todo texto visible de las dos vistas contrasta ≥ 4.5:1 en los dos temas.
  - `gallery-docs-theme.test.ts` y `gallery-overflow.test.ts` siguen en verde; `npm test` termina
    en 0.
  - El dueño ve las vistas y la documentación en los dos temas y las aprueba antes del commit
    (trabajo visual).
  Inyección: quitar la regla de `min-height` en la rama del worktree deja blancas las esquinas
  inferiores y pone en rojo RF-1; quitar las reglas `:root` de `color-scheme` pone en rojo RF-2.

- [ ] **T-2 — Casos Astro separados y con el código partido**
  Cubre: RF-3, RF-4
  Archivos: `gallery/stories/Button.astro.stories.tsx` (rejilla con `gap` de 8 px,
  `wrapLongLines`, `overflowWrap`), `tests/gallery-astro-layout.test.ts`
  Hecho cuando:
  - Lo primero: comprobar que, con `wrapLongLines`, la `ScrollArea` de Storybook no ensancha su
    contenido al del texto. Si lo ensancha, parar y volver al plan.
  - En Edge, en los 6 casos, el bloque de código empieza ≥ 8 px por debajo del Button.
  - En Edge sin `--hide-scrollbars`, a 320 y a 542 px, el `[data-radix-scroll-area-viewport]` de
    cada bloque da `scrollWidth ≤ clientWidth`, también con un texto de 600 px sin espacios añadido.
  - `gallery-astro-code.test.ts` (copiado exacto) y `gallery-overflow.test.ts` siguen en verde.
  - El dueño ve la historia en los dos temas y a 320 px y la aprueba antes del commit (trabajo
    visual).
  - `npm test` termina en 0.
  Inyección: quitar el `gap` de la rejilla deja el bloque pegado al Button y pone en rojo RF-3;
  quitar `wrapLongLines` pone en rojo RF-4 a 320 px.

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 | — (no comparten archivos) |

Si la T-2 necesita CSS fuera de su historia (plan, bloque 4), no lo escribe: vuelve al plan, porque
`preview-head.html` es de la T-1.
