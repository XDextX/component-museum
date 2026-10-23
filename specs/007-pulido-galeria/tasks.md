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

- [x] **T-1 — Defaults de las props desde el contrato**
  Cubre: RF-1
  Archivos: `gallery/lib/contract-args.ts` (`defaultSummary`, `table.defaultValue`),
  `tests/contract-args.test.ts`, `tests/gallery-props.test.ts`
  Hecho cuando: `defaultSummary` da `primary`, `md`, `button` y `false` desde el contrato; en Edge,
  la tabla de la página de documentación los muestra en la columna de defaults de `variant`,
  `size`, `type` y `disabled`; ningún default está escrito en la historia.
  Inyección: cambiar el default de `size` a `lg` en una copia del contrato, leída por el test de
  dato, pone en rojo el caso de `size`.
  Hecho: visto en rojo antes de implementar (`defaultSummary` no existía: 2 tests rojos en
  `contract-args.test.ts`). Inyección vista en rojo: `size` → `lg` en `contracts/button.contract.json`
  del worktree (sha256 original `bc32ec02…3dbf`, restaurado y comprobado) pone en rojo 3 tests: el
  de `defaultSummary` (`md` esperado), el de `usageSnippet` (omite el default) y el de la tabla en
  Edge (`size` ≠ `md`). Sin inyección: 10/10 verdes.

- [x] **T-2 — Selector de idioma con el estilo de la página**
  Cubre: RF-2, RF-3
  Archivos: `gallery/lib/Lang.tsx`, `tests/gallery-lang.test.ts`
  Hecho cuando: en Edge, en los dos temas de la página de documentación, los botones usan la fuente
  de la página, sin borde `outset`, con contraste ≥ 4.5:1; el activo tiene `aria-pressed="true"` y
  un fondo distinto del otro, en español y en inglés; los dos se alcanzan con `Tab`, tienen nombre
  accesible y foco visible. El dueño ve el selector en los dos temas y lo aprueba antes del commit
  (trabajo visual).
  Inyección: quitar `font: inherit` en la rama del worktree devuelve Arial y pone en rojo RF-2.
  Hecho: test visto en rojo antes de implementar (4 de 6: fuente Arial). Color del texto tomado de `useTheme().color.defaultText`
  (el cuerpo del iframe no fija color: con `inherit` daba 1.85:1 en oscuro). Contrastes medidos: claro, activo 9.59:1 e inactivo
  12.75:1; oscuro, activo 7.03:1 e inactivo 9.75:1 (igual con `en` activo). Fondo activo `rgba(128,128,128,.25)`; inactivo transparente.
  Inyección vista en rojo: quitar `font: 'inherit'` pone en rojo los 4 casos de estilo (Arial); restaurado, 6 de 6 en verde.
  Capturas pendientes de aprobación del dueño.

  Va en la ola 2 porque mide el contraste sobre el tema oscuro de la página, que trae la T-4.

- [x] **T-3 — Quitar fondos, rejilla, medir y contornos de la barra**
  Cubre: RF-4
  Archivos: `gallery/.storybook/main.ts`, `tests/gallery-toolbar.test.ts`
  Hecho cuando: en Edge, la barra del gestor del Storybook construido no tiene «Preview background»,
  «Grid visibility», «Measure tool» ni «Outline tool», y sí «Tema de la galería».
  Inyección: dejar `measure: true` en la rama del worktree pone en rojo el caso de «Measure tool».
  Hecho: sin la corrección, el test dio rojo con las cuatro herramientas; con `measure: true`, rojo solo con
  `['Measure tool']`; restaurado `measure: false`, verde.

- [x] **T-4 — La página de documentación sigue al tema de la galería**
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
  Hecho (inyección vista): con `const theme = themes.light` fijo, fallan 4 de 11 (`theme:dark` con sistema claro y oscuro,
  `theme:system` con sistema oscuro, y el cambio desde la barra); restaurado, 11 de 11 en verde. Contrastes del
  párrafo: claro 12.75:1 (rgb 46,51,56 sobre blanco), oscuro 9.75:1 (rgb 201,204,207 sobre rgb 34,35,37).
  El global se lee de `globals=` en la URL del iframe, no del contexto (ver notes.md). Capturas pendientes de aprobación del dueño.

- [x] **T-5 — Código de Astro con resaltado y botón de copiar**
  Cubre: RF-6
  Archivos: `gallery/stories/Button.astro.stories.tsx`, `tests/gallery-astro-code.test.ts`
  Hecho cuando: lo primero, comprobar que `SyntaxHighlighter` de `storybook/internal/components` se
  pinta dentro de la historia; si no, parar y volver al plan, sin dependencias nuevas. En Edge, con
  permiso de portapapeles, cada uno de los 6 casos tiene marcas de resaltado, y su botón de copiar
  deja en el portapapeles exactamente su `usage` del JSON de la 004, imports incluidos; el botón se
  alcanza con `Tab` y tiene nombre accesible.
  Inyección: quitar `copyable` en la rama del worktree deja los casos sin botón y pone el test en
  rojo.
  Inyección vista en rojo (2026-10-22): quitar `copyable` de `SyntaxHighlighter` dejó los 6 casos sin botón y puso el test en rojo (7 de 10 fallan: los 6 de copiar y el de `Tab`); restaurado, 10 de 10 en verde.
  Corrección tras merge de la ola 1: `gallery-theme.test.ts` (005) recorría con `Tab` todo lo
  enfocable de la historia y medía cada cosa como un Button del museo. El «bloque de código a
  1,65:1» no es un fallo del resaltado: es el `div` de desplazamiento del `SyntaxHighlighter`
  (`tabindex="0"`), cuyo fondo transparente leía como negro (texto `#2e3338` sobre negro = 1,65:1;
  sobre su blanco real, 12,75:1). «Copy» fallaba por no llevar halo ni `outline`: su foco es una
  sombra interior de 3px. El test de la 005 solo mide ahora `[data-museum-button]`, con lo mismo que
  exigía, y además exige alcanzar con `Tab` cada uno. `gallery-astro-code.test.ts` añade, en los dos
  temas, el botón de copiar: texto ≥4,5:1 sobre su fondo y, con `Tab`, un indicador de ≥2px
  (`outline`, o la sombra que el foco añade) a ≥3:1 frente a su fondo. Medido sin tocar la historia:
  claro, texto 12,75:1, sombra de 3px a 4,79:1; oscuro, texto 9,75:1, sombra de 3px a 5,64:1.
  Inyección vista (historia con un `<style>` añadido, restaurada desde la copia con el mismo sha256
  `2a7663a0…6910`): texto `#aaa` en claro → 2,32:1, rojo; sombra `#333` en oscuro → 1,24:1, rojo;
  sin sombra ni `outline` en el foco → anchura 0 en los dos temas, rojo; sin `outline` en los Button
  del museo en claro → la prueba de la 005 en rojo («Button: no visible ring», 4 problemas).

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
