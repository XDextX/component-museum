# Tareas 014 — select

Cómo se trabaja (plan, bloque 2): cada tarea va en su propio worktree, en `.claude/worktrees/`, con
su `node_modules`. Cada tarea empieza, con el árbol limpio, así:
1. `git branch -m spec/014-select-T-n`;
2. `git reset --hard <PLAN>`, o el commit de la ola anterior que dé el coordinator;
3. `npm ci`, `npm run build:packages` y `npm run gallery:astro`.

Antes de reportar, cada tarea pasa:
- el build de `packages/react`;
- `npm run gallery:astro`;
- `tsc --noEmit` y `tsc --noEmit -p gallery`;
- `npm test`.

Al cerrar cada ola, la sesión de git mergea en `spec/014-select` y pasa `npm test` sobre el merge;
tras un commit de `styles/`, añade los commits vacíos con scope. Nunca más de dos tareas con
`npm test` a la vez (017). Las notas, en UTF-8 y CRLF.

Cada archivo compartido lo toca una sola tarea (plan, bloque 2):
- `styles/museum.css`, `tests/fixtures/field.html` y `tests/field-styles.test.ts`: la T-1;
- `packages/astro/src/field.ts` y `tests/field-ids.test.ts`: la T-2;
- el contrato, los `index`, las historias, `example-classes.ts` y `tests/field-markup.test.ts`: la
  T-3;
- `tests/lib/consumer.ts` y `tests/lib/field-a11y.ts`: la T-4.

- [x] **T-1 — Hoja de Select, agrupada con Input, y su flecha**
  Cubre: RF-10 a RF-15 (sobre la página fija)
  Archivos: `styles/museum.css` (selectores de Select en las reglas de Input,
  `--museum-select-arrow` en los tres bloques, `appearance: none`, flecha, elipsis, colores
  forzados), `tests/fixtures/field.html`, `tests/field-styles.test.ts`
  Hecho cuando: en Edge, en la página fija con el marcado canónico, en los cinco modos de tema y en
  los tres `size`:
  - el borde da ≥ 3:1 contra el fondo, en reposo y en error;
  - la flecha da ≥ 3:1 contra el fondo del control;
  - la etiqueta, el texto elegido, la indicación, la ayuda y el error dan ≥ 4.5:1, también el error
    del `disabled`;
  - Select e Input del mismo `size` miden lo mismo de alto, y ≥ 24 px;
  - con el foco, el anillo da ≥ 3:1, y en error el borde sigue siendo el de error con
    `outline-offset` > 0;
  - con `forcedColors: 'active'`, el borde y la flecha difieren del fondo, también en error;
  - una opción de 200 caracteres no ensancha el campo a 320 px;
  - cada regla nueva lee solo `var(--museum-*)` o colores de sistema;
  - los demás componentes siguen con sus casos: da el número antes y después;
  - el coordinator aprueba las capturas (dos temas y colores forzados) antes del commit.
  Inyección: un `--museum-select-arrow` igual a `--museum-control-bg` pone en rojo RF-11; quitar
  `.museum-select--md` del selector de `padding` pone en rojo RF-13 en `md`.

  Nota (hecha): ambas inyecciones vistas en rojo y revertidas por ruta.
  - `--museum-select-arrow` = `--museum-control-bg`: RF-11 en rojo en los cinco modos, y el test del token.
  - Sin `.museum-select--md` en el `padding`: RF-13 en rojo (18,66 contra 38 px en `md`) y el test de agrupado.
  - La flecha son dos triángulos que se solapan 0,03 em (sin solape, la unión dejaba una muesca).
  - En colores forzados, `--museum-select-arrow` se redefine como `CanvasText`: la cuenta del token es 3 en los
    temas y 1 en colores forzados, por eso su test va aparte del de los demás tokens.
  - Las reglas de Select leen solo `var(--museum-*)` y colores de sistema; la geometría de la flecha y el
    `padding` derecho van en `em`, así que su test prohíbe colores literales, no longitudes.

- [x] **T-2 — El prefijo `museum-select` en el ayudante de Astro**
  Cubre: RF-2 a RF-6 (la lógica, en Astro)
  Archivos: `packages/astro/src/field.ts`, `tests/field-ids.test.ts`
  Hecho cuando:
  - `fieldIds` cuenta `museum-select` aparte de los otros prefijos (test como dato).
  - `field-markup.test.ts` sigue en verde sin cambiar una línea.
  - Un commit: `refactor(packages/astro)`.
  Inyección: compartir el contador con `museum-input` pone en rojo el caso de prefijos separados de
  `field-ids.test.ts`.
  Nota: hecho. Inyección vista en rojo (caso de `museum-select`) y revertida por ruta. Vitest no
  comprueba tipos: sin el prefijo en la unión lo corta `tsc --noEmit`.

  Va en la ola 1 junto a la T-1: no comparten archivos.

- [x] **T-3 — Contrato y Select en los dos frameworks, con su galería**
  Cubre: RF-1, RF-2 a RF-9 y RF-16 (marcado), NFR de galería
  Archivos: `contracts/select.contract.json` (exacto, plan, bloque 4),
  `packages/react/src/Select/Select.tsx`, `packages/react/src/index.ts`,
  `packages/astro/src/Select/Select.astro`, `packages/astro/index.js`, `packages/astro/index.d.ts`,
  `gallery/stories/Select.react.stories.tsx`, `gallery/stories/Select.astro.stories.tsx`,
  `gallery/stories/Select.mdx`, `gallery/lib/example-classes.ts`,
  `tests/gallery-browser-select.test.ts`, `tests/field-markup.test.ts`
  Hecho cuando:
  - `contract.test.ts`, `packages.test.ts` y `projects.test.ts` dan verde con Select.
  - `field-markup.test.ts` (un `kind` Select) da el marcado canónico en React:
    - sin ayuda ni error, con ayuda, con error, con los dos (el error primero);
    - `required`, `disabled` y una opción `disabled`;
    - `defaultValue`, `placeholder`, y los dos a la vez (manda `defaultValue`);
    - un `defaultValue` que no está en `options`;
    - `value` controlado sin `defaultValue`;
    - `id` y `aria-describedby` del consumidor;
    - atributos libres (`name`) y la clase en el `<select>`;
    - `options` vacío.
  - En Astro, los 10 casos dan el mismo marcado que React, sin `<script>` y con ids reproducibles.
  - Los tests de galería generalizados dan verde con Select, y la matriz lo muestra en los dos
    frameworks.
  - Cuatro commits: el contrato (`feat:`), `feat(packages/react)`, `feat(packages/astro)` y la
    galería (`docs:`).
  - El coordinator aprueba las capturas en los dos temas antes del commit.
  Inyección: escribir `selected` en la primera opción siempre en Astro pone en rojo el caso
  `default` contra React; quitar `tests/gallery-browser-select.test.ts` pone en rojo
  `projects.test.ts`.

  Nota: hecha tal cual el plan, con tres ajustes. (1) Los casos de Astro son 10, no 9: la regla de la 010 añade `hint-error` al final (`default`, `hint`, `error`, `placeholder`, `size-sm`, `size-lg`, `disabled`, `required`, `defaultValue`, `hint-error`). (2) Suites generales tocadas: `casesOf` (`tests/lib/gallery-browser.ts`) lee `aria-required` solo en un grupo (`options` y `name`; en un `<select>` `required` es nativo) y cuenta el valor elegido de un `<select>` como `checked`; `Select.mdx` entra en la lista de `tests/theme-docs.test.ts`. `gallery.test.ts` y `snippets.test.ts` no necesitaron cambios. (3) React manda `defaultValue` al `<select>` solo sin `value` y solo si está en `options`; Astro escribe `selected` solo en esa opción o en la indicación. Inyecciones vistas en rojo y revertidas: `selected` siempre en la primera opción de Astro (caso `default` contra React y el test de `selected`), y quitar `tests/gallery-browser-select.test.ts` (`projects.test.ts`). Capturas en el scratchpad de la sesión, pendientes del coordinator.

  Va sola en la ola 2: necesita el prefijo (T-2), y sus capturas, la hoja (T-1).

- [x] **T-4 — Select en los consumidores: accesibilidad en Edge**
  Cubre: RF-2 a RF-16 (en el navegador), NFR de accesibilidad y regla 2
  Archivos: `tests/lib/consumer.ts` (`selectInstances`, plan, bloque 4), `tests/lib/field-a11y.ts`
  (`kind` Select), `tests/field-a11y-select.test.ts` (con `need('consumers')`)
  Hecho cuando: en Edge, sobre los consumidores construidos de React y de Astro, en tres modos de tema más colores
  forzados:
  - RF-2 a RF-6, como Input;
  - RF-7: las opciones uno a uno, y la `disabled` no se elige;
  - RF-8 y RF-9: el valor inicial de `selected` y de `placeholder`;
  - RF-10 a RF-15, contra el fondo real y con colores forzados;
  - RF-16: `ArrowDown` se salta la opción `disabled`, y el control `disabled` no se enfoca;
  - los demás componentes siguen con sus casos: da el número antes y después.
  Inyección: quitar `htmlFor` del ayudante de React en la rama pone en rojo RF-2 de Select; quitar
  `disabled` del `<option>` en Astro pone en rojo RF-7 y RF-16.

  Nota: hecha. `selectInstances` crea 15 controles (`sm`/`md`/`lg`, `hint`, `error`, `both`, `required` y `placeholder` con la indicación, `disabled` con error, `selected` con indicación y `defaultValue="b"`, `partial` con la C `disabled`, `own`, `long` con una opción de 200 caracteres y dos gemelos «Chooser»). El `kind` Select entra en la tabla de `kinds` de `field-a11y.ts` y reutiliza RF-2 a RF-6, el borde (RF-10), los textos (RF-12) y el foco con `Tab` (RF-14); lleva aparte RF-6 (envío), RF-7, RF-8 y RF-9, RF-11 (la flecha, leída del `background-image` calculado), RF-13 (altura contra Input), el borde de error con foco, RF-15 (colores forzados), RF-16 y la opción larga a 320 px. Se prueba en los tres modos de tema y, dentro de cada uno, los colores forzados, no como cinco modos aparte. Ajustes: en Edge un `select` obligatorio sobre la indicación sale inválido en el árbol sin `aria-invalid` y sin propiedad `required` (como el checkbox), así que RF-5 y RF-6 lo exentan y leen el DOM; teclear «Option C» no elige la `disabled` pero sí mueve a A, así que el test exige solo que no sea C. `tests/a11y.test.ts` no necesitó ajuste: su selector de paradas de `Tab` ya cuenta `select:not(:disabled)`. Tests: 102 nuevos (2 frameworks por 3 modos por 17): 1178 antes, 1280 después (más 1 omitido, como antes). Inyecciones vistas en rojo y revertidas por ruta: sin `htmlFor` en `packages/react/src/field.tsx` (RF-2 y RF-6 de React, 6 tests; Astro en verde) y sin `disabled` en el `<option>` de `Select.astro` (RF-7 y RF-16 de Astro, 6 tests; React en verde).

  Nota (ronda de correcciones tras la validación): `option:disabled` se pinta con el color de la indicación (4,83:1 en claro y 6,99:1 en oscuro contra el fondo de la opción; `GrayText` con colores forzados); la indicación se restringe a `option[value=""][disabled]:checked`, así que una opción normal con valor vacío conserva el color normal; `.museum-select option` queda guardada por un test (fondo igual al del control, no transparente, y su color). La página fija gana `sel-empty`. Tests: 1280 antes, 1286 después (más 1 omitido). Inyecciones en rojo y revertidas: sin la regla `option:disabled`, sin `.museum-select option` y con el `:has` sin `[disabled]` (5 tests cada una). Corregida la errata de 9 a 10 casos Astro y de «cinco modos de tema» en T-4.

## Grafo de olas

| Ola | Tareas | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 | — (no comparten archivos) |
| 2 | T-3 | El prefijo (T-2) y la hoja (T-1). |
| 3 | T-4 | Select exportado en los dos paquetes (T-3). |
