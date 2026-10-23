# Tareas 012 — checkbox

**Approved:** 2026-10-23 · el coordinator en modo autónomo

Cómo se trabaja en paralelo (plan, bloque 2): cada tarea va en su propio worktree, en
`.claude/worktrees/`, con su `node_modules`. Cada tarea empieza, con el árbol limpio, así:
1. `git branch -m spec/012-checkbox-T-n`;
2. `git reset --hard <PLAN>`, o el commit de la ola anterior ya mergeada que dé el coordinator;
3. `npm ci`, `npm run build:packages` y `npm run gallery:astro`.

Antes de reportar, cada tarea pasa el build de `packages/react`, `npm run gallery:astro`,
`tsc --noEmit`, `tsc --noEmit -p gallery` y `npm test`. Al cerrar cada ola, la sesión de git
mergea las ramas en `spec/012-checkbox` y pasa `npm test` sobre el merge; un rojo vuelve a la
tarea dueña del archivo. Tras el commit de la hoja, la sesión de git añade los commits vacíos con
scope (`AGENTS.md`). Las notas que escriban los agentes, en UTF-8.

Cada archivo compartido lo toca una sola tarea (plan, bloque 2):
- `packages/react/src/field.tsx`, `packages/astro/src/field.ts`, `tests/field-ids.test.ts`: la T-1;
- `styles/museum.css`, `tests/fixtures/field.html`, `tests/field-styles.test.ts`: la T-2;
- el contrato, los `index` de los dos paquetes, `gallery/lib/example-classes.ts`, las historias y
  `tests/field-markup.test.ts`: la T-3;
- `tests/lib/consumer.ts`, `tests/field-a11y.test.ts`: la T-4.

- [x] **T-1 — El ayudante de campo, también en línea**
  Cubre: RF-2 a RF-6 (la lógica que hereda Checkbox)
  Archivos: `packages/react/src/field.tsx` (`inline`), `packages/astro/src/field.ts` (prefijo
  `museum-checkbox`), `tests/field-ids.test.ts`
  Hecho cuando:
  - `Field` con `inline` pinta el control antes de la etiqueta, con la clase
    `museum-field--inline`.
  - Sin `inline`, el marcado es el de hoy: `field-markup.test.ts` sigue en verde sin cambiar una
    línea.
  - `fieldIds` cuenta `museum-checkbox` aparte de los otros prefijos (test como dato).
  - Dos commits: `refactor(packages/react)` y `refactor(packages/astro)`.
  Inyección: pintar la etiqueta después del control también sin `inline` pone en rojo
  `field-markup.test.ts` en Input y Textarea.
  Hecho: inyección vista en rojo (control antes de la etiqueta también sin `inline`: 6 casos de Input, 6 de
  Textarea y 2 más en `field-markup.test.ts`) y restaurada. El test de `Field` en línea (React) vive en
  `field-ids.test.ts`, único archivo de tests de la T-1; también se vio en rojo antes del código.

- [x] **T-2 — Hoja del cuadro, la marca y la disposición en línea**
  Cubre: RF-7, RF-8, RF-9, RF-10, RF-11, RF-13 (sobre la página fija)
  Archivos: `styles/museum.css` (tokens en los tres bloques; `.museum-field--inline`;
  `.museum-checkbox*`; colores forzados), `tests/fixtures/field.html`, `tests/field-styles.test.ts`
  Hecho cuando: en Edge, en la página fija, en los cinco modos de tema de la 011 y en los tres
  `size`, para Checkbox sin marcar y marcado:
  - el borde del cuadro da ≥ 3:1 contra el fondo, en reposo y en error;
  - la marca da ≥ 3:1 contra el cuadro marcado, y el cuadro marcado ≥ 3:1 contra el fondo;
  - la etiqueta, la ayuda y el error dan ≥ 4.5:1, también en el `disabled` con error;
  - la unión de las cajas del control y de la etiqueta mide ≥ 24 × 24 px;
  - con el foco, el anillo da ≥ 3:1, y en error el borde sigue siendo el de error con
    `outline-offset` > 0;
  - con `forcedColors: 'active'`, el cuadro marcado y el sin marcar tienen fondos distintos, y la
    marca es distinta de su cuadro;
  - cada regla de Checkbox lee solo `var(--museum-*)` o colores de sistema, y cada token nuevo está
    en los tres bloques;
  - Input y Textarea siguen con sus casos: da el número antes y después;
  - el coordinator aprueba las capturas (dos temas y colores forzados) antes del commit.
  Inyección: un `--museum-checkbox-mark` igual a `--museum-checkbox-checked-bg` pone en rojo RF-8;
  quitar el bloque de colores forzados pone en rojo RF-13.
  Visto en rojo (2026-10-23, rama `spec/012-checkbox-T-2`, revertido): con la marca igual al cuadro
  marcado en los tres bloques, RF-8 falla en 5 de los 5 modos (`cb-sm-checked mark: expected 1 to be
  greater than or equal to 3`); con el bloque de colores forzados desactivado, RF-13 falla (`sm checked
  vs unchecked fill: expected 'rgb(0, 0, 0)' not to be 'rgb(0, 0, 0)'`); y con `place-content` en vez de
  `grid: 1fr / 1fr` (marca de 0 px) falla la medida de la marca, que las capturas destaparon.
  Números: `field-styles.test.ts`, 38 tests antes (Input y Textarea) y 73 después, los 38 sin tocar.
  Valores: `--museum-checkbox-checked-bg` #1d4ed8 claro, #3b82f6 oscuro; `--museum-checkbox-mark`
  #ffffff claro, #111827 oscuro; fijos: `--museum-checkbox-target` 1.5rem, `-size-sm/md/lg` 1/1/1.125rem
  y `-mark-image`. Contrastes: borde 4.83 (claro) y 6.99 (oscuro); borde de error 6.47 y 9.35; cuadro
  marcado y marca 6.70 y 4.82. La etiqueta usa `line-height` de 1.5rem, así que `min-height` queda como
  segundo seguro: quitarlo solo no pone en rojo RF-10 (la T-4 deberá inyectar otra cosa).

  Corrección tras validación (ronda 1). Con colores forzados, `.museum-checkbox[aria-invalid="true"]`
  (y su `:checked`), más específica que el bloque de colores forzados, seguía pintando el borde con
  `--museum-field-error`, y el cuadro lleva `forced-color-adjust: none`: el token del tema se colaba
  en la paleta forzada. Dentro de `@media (forced-colors: active)` el borde del cuadro con error pasa
  a `CanvasText`; el error lo dice su texto, no un color. RF-13 de `field-styles.test.ts` mide ahora
  el contraste del borde (≥3:1) contra el fondo del campo que rodea al cuadro, y el del cuadro sin
  marcar contra su propio relleno, en `cb-md`, `cb-error`, `cb-md-checked` y `cb-error-checked`, con
  colores forzados claros y oscuros y `data-theme` light y dark (antes solo comparaba que los colores
  fueran distintos y no miraba el cuadro con error).
  Antes / después, borde del cuadro con error contra su entorno (paleta forzada / `data-theme`):
  claro/light 6.47 → 21; claro/dark 1.90 → 21; oscuro/light 3.25 → 21; oscuro/dark 11.06 → 21. Sin
  error, sin cambios: sin marcar 21, marcado 15.13 (claro) y 14.37 (oscuro).
  Inyección vista: el test nuevo, escrito antes del arreglo, cae con `claro/dark cb-error` y
  `cb-error-checked` a 1.90 (y `oscuro/light` a 3.25 queda justo por encima del umbral); con el
  arreglo, `field-styles.test.ts` 74 de 74.

  Va en la ola 1 junto a la T-1: no comparten archivos.

- [x] **T-3 — Contrato y Checkbox en los dos frameworks, con su galería**
  Cubre: RF-1, RF-2 a RF-6 y RF-12 (marcado), NFR de galería
  Archivos: `contracts/checkbox.contract.json` (exacto, plan, bloque 4),
  `packages/react/src/Checkbox/Checkbox.tsx`, `packages/react/src/index.ts`,
  `packages/astro/src/Checkbox/Checkbox.astro`, `packages/astro/index.js`,
  `packages/astro/index.d.ts`, `gallery/stories/Checkbox.react.stories.tsx`,
  `gallery/stories/Checkbox.astro.stories.tsx`, `gallery/stories/Checkbox.mdx`,
  `gallery/lib/example-classes.ts` (`Checkbox: { 'my-checkbox': … }`), `tests/field-markup.test.ts`
  Hecho cuando:
  - `contract.test.ts` y `packages.test.ts` dan verde a Checkbox en los dos paquetes.
  - `field-markup.test.ts`, con un `kind` Checkbox, da el marcado canónico en React en cada caso:
    - sin ayuda ni error, con ayuda, con error, con los dos (el error primero);
    - `required`, `disabled`;
    - `defaultChecked` como atributo `checked`;
    - `id` y `aria-describedby` del consumidor;
    - atributos libres y la clase en el `<input>`;
    - con `checked` y `onChange` del consumidor, sin `defaultChecked`.
  - En Astro, los 8 casos dan el mismo marcado que React, sin `<script>` y con ids reproducibles.
  - Los tests de galería generalizados dan verde con Checkbox: regla 5, idiomas, snippets, clases
    de ejemplo, casos Astro y desborde.
  - La matriz muestra Checkbox en los dos frameworks.
  - Input y Textarea siguen con sus casos: da el número antes y después.
  - Cuatro commits: el contrato (`feat:`), `feat(packages/react)`, `feat(packages/astro)` y la
    galería (`docs:`).
  - El coordinator aprueba las capturas de las historias y la documentación en los dos temas antes
    del commit.
  Inyección: escribir `checked` siempre en Astro pone en rojo el caso `default` contra React;
  declarar `defaultChecked?: string` en React (en la rama) pone en rojo `contract.test.ts` (RF-1).
  Hecho (2026-10-23, rama `spec/012-checkbox-T-3`): inyecciones vistas en rojo y restauradas. Con `checked={true}`
  siempre en Astro fallan 2 tests de `field-markup.test.ts` (el caso `default` contra React y el de RF-12). Con
  `defaultChecked?: string` en React, `contract.test.ts` falla con `prop defaultChecked is "string", expected
  "boolean"` (la inyección pelada rompe antes el `tsc` del global-setup; se vio con un `as never` en la rama).
  Números: `field-markup.test.ts`, 30 tests antes (Input y Textarea) y 46 después, los 30 sin tocar.
  Desvíos del plan, menores: `astroCases` da 9 casos y no 8 (el `hint-error` que añade para todo campo con ayuda
  y error, como en Textarea); el marcado de React escribe `checked` al final, tras `data-museum-checkbox`, y el
  de Astro lo copia; `tests/gallery-browser.test.ts` lee `defaultChecked` como el atributo `checked`, y
  `tests/theme-docs.test.ts` incluye `Checkbox.mdx`.

  Va sola en la ola 2: necesita el ayudante (T-1), y sus capturas, la hoja (T-2).

- [x] **T-4 — Checkbox en los consumidores: accesibilidad en Edge**
  Cubre: RF-2 a RF-13 (en el navegador), NFR de accesibilidad y regla 2
  Archivos: `tests/lib/consumer.ts` (`checkboxInstances`, plan, bloque 4),
  `tests/field-a11y.test.ts` (`kind` Checkbox)
  Hecho cuando: en Edge, sobre los consumidores construidos de React y de Astro, en los cinco modos
  de tema:
  - RF-2: pulsar la etiqueta marca su control, también en las gemelas;
  - RF-3 a RF-6, como Input;
  - RF-7 a RF-9 contra el fondo real;
  - RF-10: zona de pulsación ≥ 24 × 24 px;
  - RF-11: con `Tab`, el anillo da ≥ 3:1, se salta el `disabled` y el borde de error sigue visible;
  - RF-12: `checked` empieza marcado y se desmarca;
  - RF-13: con colores forzados, marcado y sin marcar se distinguen;
  - la etiqueta larga se parte sin desbordar a 320 px;
  - Input y Textarea siguen con sus casos: da el número antes y después.
  Inyección: quitar `for` de la etiqueta en el ayudante de la rama pone en rojo RF-2; quitar
  `min-height` y `line-height` de la etiqueta en línea, juntos (el `line-height` solo ya da los
  24 px), pone en rojo RF-10 en `sm`.
  Hecho (2026-10-23, rama `spec/012-checkbox-T-4`, sin commit):
  - Inyecciones vistas en rojo y restauradas por ruta (`git checkout -- <ruta>`, CRLF comprobado): sin
    `htmlFor` en `packages/react/src/field.tsx`, RF-2 cae en Checkbox (`RF-2` compartido, el de estado, `RF-12`,
    `RF-9` por la etiqueta que no se encuentra, etiqueta larga y `RF-10`), y también `RF-2` y `RF-6` de Input y
    Textarea en React: 33 rojos de 210. Con la inyección de la tarea tal cual (quitar solo `min-height` de
    `.museum-field--inline .museum-field__label`) NO cae nada, como avisó la T-2: la etiqueta usa
    `line-height: 1.5rem`. Quitando `min-height` y `line-height` cae RF-10 en `sm` (`checkbox-sm height: expected 20
    to be greater than or equal to 24`), 6 rojos de 6 (React y Astro, tres modos). Otras, todas en `styles/museum.css`:
    marca igual al cuadro marcado, RF-8 (`checkbox-sm mark on box: expected 1 to be greater than or equal to 3`, 6 de
    6); `outline-offset: 0`, RF-11 (`checkbox-sm ring offset: expected 0 to be greater than 0`); el borde de error
    sin el color de error, RF-7 y RF-11; `@media (forced-colors: none)`, RF-13 (`checked box vs unchecked box`); texto
    de ayuda y error gris claro, RF-9 en claro.
  - Input y Textarea: `field-a11y.test.ts` tenía 120 tests antes (Input 54, Textarea 66) y tiene 210 después: los 120
    con los mismos nombres y Checkbox suma 90 (15 por framework y modo). Cambios en lo compartido, sin aflojar nada
    de Input ni de Textarea: el `kind` lleva `hook`, `twinLabel`, `twinPrefix` y `twinTotal` (4 para Input y Textarea,
    como el `toBe(4)` de antes); `RF-7` y `RF-8` de campos de texto (borde, valor, marcador de posición) se saltan
    para Checkbox, que tiene los suyos; las etiquetas se comparan recortadas a 40 caracteres, como las lee
    `visibleTexts`. Las etiquetas de Checkbox empiezan por «Tick» y las gemelas se llaman «Pair» (`getByLabel` busca
    subcadenas y `Twin` sigue siendo de Input y Textarea); los `name` de las gemelas no empiezan por `twins-`.
  - Hallazgos de Edge, no del componente: su árbol de accesibilidad no da la propiedad `required` a un checkbox, así
    que RF-6 lo lee del DOM (`el.required`) para Checkbox; y marca como `invalid` un checkbox `required` sin marcar
    por su validez nativa, sin `aria-invalid`, así que RF-5 no lo mira en `checkbox-required` y sí el atributo.
  - Medido en Edge, React y Astro iguales, claro / oscuro (sistema = oscuro): borde sin marcar 4.83 / 6.99, en
    error 6.47 / 9.35 (también `disabled`), con el borde de error igual a `--museum-field-error`; marcado, marca contra
    cuadro 6.70 / 4.82, cuadro contra fondo 6.70 / 4.82 y borde 6.70 / 4.82, en los tres `size` (cuadro 16, 16 y 18 px,
    marca 14, 14 y 16 px a escala 1); `disabled` marcado, opacidad 0.5 y marca a escala 1; etiquetas 17.74 / 16.98,
    ayuda 7.56 / 12.04, error y marcador 6.47 / 9.35, también el error del `disabled`. RF-10: la unión de cuadro y
    etiqueta mide 24 px de alto en los tres `size` (la etiqueta sola, 24) y 48 la etiqueta larga a 1024 px; el ancho es
    el del campo. RF-11: anillo de 2 px con `outline-offset` de 2 px y 6.70 / 9.84 contra lo que lo rodea, el borde
    (4.83 / 6.99, 6.47 / 9.35 en error, 6.70 / 4.82 marcado) sigue siendo el suyo con el foco, `Tab` salta `disabled` y
    `Espacio` marca y desmarca (también en el árbol de accesibilidad). RF-12: solo `checkbox-checked` y
    `checkbox-locked` empiezan marcados; una pulsación desmarca. RF-13, con `forcedColors: 'active'`: sin marcar
    cuadro negro y borde blanco; marcado cuadro y borde cian (26, 235, 255) y marca negra (en oscuro, morado y marca
    blanca); la marca sin marcar, a escala 0. Etiqueta larga a 320 px: se parte en 144 px de alto (6 líneas de 24), el
    cuadro de 16 px queda 4 px bajo su borde superior (centrado en la primera línea) y el campo no desborda
    (`scrollWidth` igual a `clientWidth`).

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 | — (no comparten archivos) |
| 2 | T-3 | El ayudante de la T-1; la hoja de la T-2 para las capturas. |
| 3 | T-4 | Checkbox exportado en los dos paquetes (T-3). |

Si una tarea necesita tocar un archivo de otra tarea de su misma ola, no lo hace: para y vuelve
al plan.
