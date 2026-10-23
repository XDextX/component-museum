# Tareas 007 — pulido-galeria

**Approved:** 2026-10-22 · el dueño; si la T-6 necesita tocar preview.ts, para y pasa a la ola 2

Cómo se trabaja en paralelo (plan, bloque 6): cada tarea de una ola va en su propio worktree, en
`.claude/worktrees/`, con su rama `spec/007-pulido-galeria-T-n` y su `node_modules`. Los worktrees
salen de `main`: **cada tarea empieza poniéndose sobre `spec/007-pulido-galeria`** con
`git checkout -B spec/007-pulido-galeria-T-n spec/007-pulido-galeria` antes de tocar nada. Al cerrar
la ola, la sesión de git mergea las ramas en `spec/007-pulido-galeria`. Se borra `node_modules`
antes de quitar cada worktree. Cada archivo compartido lo toca una sola tarea:
- `gallery/.storybook/preview.ts`: la T-4;
- `gallery/.storybook/main.ts`: la T-3;
- `gallery/lib/Lang.tsx`: la T-2.

- [ ] **T-1 — Defaults de las props desde el contrato**
  Cubre: RF-1
  Archivos: `gallery/lib/contract-args.ts` (`defaultSummary`, `table.defaultValue`),
  `tests/contract-args.test.ts`, `tests/gallery-props.test.ts`
  Hecho cuando: `defaultSummary` da `primary`, `md`, `button` y `false` desde el contrato; en Edge,
  la tabla de la página de documentación los muestra en la columna de defaults de `variant`,
  `size`, `type` y `disabled`; ningún default está escrito en la historia.
  Inyección: cambiar el default de `size` a `lg` en una copia del contrato, leída por el test de
  dato, pone en rojo el caso de `size`.

- [ ] **T-2 — Selector de idioma con el estilo de la página**
  Cubre: RF-2, RF-3
  Archivos: `gallery/lib/Lang.tsx`, `tests/gallery-lang.test.ts`
  Hecho cuando: en Edge, en los dos temas de la página de documentación, los botones usan la fuente
  de la página, sin borde `outset`, con contraste ≥ 4.5:1; el activo tiene `aria-pressed="true"` y
  un fondo distinto del otro, en español y en inglés; los dos se alcanzan con `Tab`, tienen nombre
  accesible y foco visible. El dueño ve el selector en los dos temas y lo aprueba antes del commit
  (trabajo visual).
  Inyección: quitar `font: inherit` en la rama del worktree devuelve Arial y pone en rojo RF-2.

  Va en la ola 2 porque mide el contraste sobre el tema oscuro de la página, que trae la T-4.

- [ ] **T-3 — Quitar fondos, rejilla, medir y contornos de la barra**
  Cubre: RF-4
  Archivos: `gallery/.storybook/main.ts`, `tests/gallery-toolbar.test.ts`
  Hecho cuando: en Edge, la barra del gestor del Storybook construido no tiene «Preview background»,
  «Grid visibility», «Measure tool» ni «Outline tool», y sí «Tema de la galería».
  Inyección: dejar `measure: true` en la rama del worktree pone en rojo el caso de «Measure tool».

- [ ] **T-4 — La página de documentación sigue al tema de la galería**
  Cubre: RF-5
  Archivos: `gallery/.storybook/preview.ts` (`parameters.docs.container`, `docsScheme`),
  `tests/gallery-docs-theme.test.ts`
  Hecho cuando: lo primero, comprobar que el contenedor de documentación puede leer el global
  `theme`; si no, parar y volver al plan. En Edge, con `theme:dark`, y con `theme:system` y
  emulación oscura, el fondo de
  `.sbdocs-wrapper` es oscuro y el texto de un párrafo contrasta ≥ 4.5:1; con `theme:light`, y con
  `theme:system` y emulación clara, es claro. `docsScheme` tiene sus tests como dato. El dueño ve
  la página en los dos temas y la aprueba antes del commit (trabajo visual).
  Inyección: que el contenedor ignore el global y use siempre `themes.light` pone en rojo los casos
  oscuros.

- [ ] **T-5 — Código de Astro con resaltado y botón de copiar**
  Cubre: RF-6
  Archivos: `gallery/stories/Button.astro.stories.tsx`, `tests/gallery-astro-code.test.ts`
  Hecho cuando: lo primero, comprobar que `SyntaxHighlighter` de `storybook/internal/components` se
  pinta dentro de la historia; si no, parar y volver al plan, sin dependencias nuevas. En Edge, con
  permiso de portapapeles, cada uno de los 6 casos tiene marcas de resaltado, y su botón de copiar
  deja en el portapapeles exactamente su `usage` del JSON de la 004, imports incluidos; el botón se
  alcanza con `Tab` y tiene nombre accesible.
  Inyección: quitar `copyable` en la rama del worktree deja los casos sin botón y pone el test en
  rojo.

- [x] **T-6 — Sin desborde horizontal desde 320 px**
  Cubre: RF-7
  Archivos: `tests/gallery-overflow.test.ts`, `gallery/.storybook/preview-head.html` (si el
  desborde sale de Storybook) o el archivo de la galería que lo cause
  Hecho cuando: lo primero, localizar con barra de scroll clásica qué elemento desborda. En Edge sin
  `--hide-scrollbars`, la página de documentación y las dos historias dan
  `scrollWidth ≤ clientWidth` a 320 y a 542 px.
  Inyección: un elemento de 600 px de ancho fijo en una copia de la página, inyectado con
  `addStyleTag`, pone el test en rojo a 542 px; y el mismo test con `--hide-scrollbars` no lo vería.
  Hecho: desbordaban (a 320 y/o 542) la tabla de props de la página de documentación (547 px
  mínimos), el `pre` de uso de la historia Astro (item de rejilla sin `min-width: 0`) y los `code`
  en línea de la prosa de la página de documentación (`white-space: nowrap`). Arreglo: CSS en
  `gallery/.storybook/preview-head.html`. Inyección vista en rojo: `body::after` de 600 px, activada
  con `MUSEUM_OVERFLOW_INJECT=1`, pone en rojo los 6 casos (incluido 542 px); sin ella, 6 en verde.

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-3 ∥ T-4 ∥ T-5 ∥ T-6 | — (no comparten archivos) |
| 2 | T-2 | Mide el contraste del selector sobre el tema oscuro de la página (T-4). |

Si la T-6 acaba arreglando el desborde en un archivo que toca otra tarea de la ola 1, se mueve a la
ola 2 en lugar de compartirlo.
