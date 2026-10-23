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

- [x] **T-1 — La vista de historia y sus barras siguen al tema de la galería**
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
  Inyecciones vistas (T-1, en el worktree, restauradas):
  - Sin la línea `min-height: 100vh`: 4 fallos de RF-1 (`Button/React/Default`, esquinas inferiores sin
    el fondo del decorador, en `theme:dark`, `theme:light` y `theme:system` con las dos emulaciones).
  - Sin las tres reglas `:root` de `color-scheme`: 10 fallos de RF-2 (raíz y contenedores de
    desplazamiento en `normal`).
  Notas: el `body` lleva `sb-show-main sb-main-padded` y Storybook fija su `padding` con
  `.sb-show-main.sb-main-padded` (0,2,0), así que la regla de la galería usa
  `body.sb-show-main.sb-main-padded`. Las reglas `:root:has(...)` leen `#storybook-root > [data-theme]`
  y `[data-docs-scheme]`, no cualquier `data-theme`, porque una página de documentación puede
  contener historias fijadas al otro tema. El test de RF-2 deja fuera los bloques `Source` de la
  página de documentación (`.docblock-source`, que Storybook pinta siempre claros) y el panel de
  código de cada canvas (siempre oscuro): son de Storybook y están fuera de alcance. Hallazgo: en
  `theme:dark` esos `Source` explícitos siguen claros; en `theme:light` el panel de código del
  canvas sigue oscuro.

- [x] **T-2 — Casos Astro separados y con el código partido**
  Cubre: RF-3, RF-4
  Archivos: `gallery/stories/Button.astro.stories.tsx` (margen de 8 px bajo el Button, sección en
  bloque; `wrapLongLines`, `overflowWrap`), `tests/gallery-astro-layout.test.ts`
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
  Inyección: quitar el margen bajo el Button deja el bloque pegado y pone en rojo RF-3;
  quitar `wrapLongLines` pone en rojo RF-4 a 320 px.
  Hecho: con `wrapLongLines` la `ScrollArea` no se ensancha (320 px: scrollWidth 241 = clientWidth 241; ancho normal 912/912).
  Hueco Button-bloque: 8 px en los 6 casos, en claro, oscuro y 320 px (el `div` del Button lleva `margin-bottom` de 8 px).
  Hallazgo: con la seccion como rejilla (`gap` del plan) el boton Copy de la 007 quedaba recortado bajo el bloque a 320 y 542 px
  (la ScrollArea se estira a la altura del wrapper y empuja la ActionBar fuera). Por eso la seccion es `display: block` con margenes,
  no rejilla; el test pasa a cubrir el boton Copy visible y dentro del viewport a 320 y 542 px.
  Inyecciones vistas en rojo y restauradas: seccion como rejilla, RF-6 rojo a 320 y 542 px (el elemento en el centro del boton no es el boton);
  sin el `margin-bottom` del Button, RF-3 rojo; sin `wrapLongLines`, los 4 RF-4 rojos (scrollWidth 482 > clientWidth 241/463).

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 | — (no comparten archivos) |

Si la T-2 necesita CSS fuera de su historia (plan, bloque 4), no lo escribe: vuelve al plan, porque
`preview-head.html` es de la T-1.
