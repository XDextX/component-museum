# Tareas 013 — radiogroup

Cómo se trabaja (plan, bloque 2): cada tarea va en su propio worktree, en `.claude/worktrees/`, con
su `node_modules`. Cada tarea empieza, con el árbol limpio, así:
1. `git branch -m spec/013-radiogroup-T-n`;
2. `git reset --hard <PLAN>`, o el commit de la ola anterior que dé el coordinator;
3. `npm ci`, `npm run build:packages` y `npm run gallery:astro`.

Antes de reportar, cada tarea pasa:
- el build de `packages/react`;
- `npm run gallery:astro`;
- `tsc --noEmit` y `tsc --noEmit -p gallery`;
- `npm test`.

Al cerrar cada ola, la sesión de git mergea en `spec/013-radiogroup` y pasa `npm test` sobre el
merge; tras un commit de `styles/`, añade los commits vacíos con scope. Nunca más de dos tareas con
`npm test` a la vez (017). Las notas, en UTF-8 y CRLF.

Cada archivo compartido lo toca una sola tarea (plan, bloque 2):
- `tests/lib/contract.ts`, `tests/lib/api.ts`, `gallery/lib/contract-args.ts` y
  `tests/lib/gallery-browser.ts`: la T-1;
- `packages/react/src/field.tsx` y `packages/astro/src/field.ts`: la T-2;
- `styles/museum.css`, `tests/fixtures/field.html` y `tests/field-styles.test.ts`: la T-3;
- el contrato, los `index`, las historias, `example-classes.ts` y `tests/field-markup.test.ts`: la
  T-4;
- `tests/lib/consumer.ts` y `tests/lib/field-a11y.ts`: la T-5.

- [ ] **T-1 — `options` en el formato de contrato**
  Cubre: RF-1 (formato)
  Archivos: `tests/lib/contract.ts`, `tests/lib/api.ts`, `tests/contract.test.ts`,
  `gallery/lib/contract-args.ts`, `tests/contract-args.test.ts`, `tests/lib/gallery-browser.ts`
  Hecho cuando:
  - `PropSpec` admite `{ type: 'options', required: true }`; `expectedApi` da `'options!'`, y
    `declaredProps`/`diffApi` reconocen una lista `{ value, label, disabled? }[]` obligatoria. Una
    lista opcional, o de otro tipo, falla.
  - `argTypesFromContract` da un control `object`.
  - `usageSnippet` escribe `options={[…]}` con las opciones de ejemplo, en React y en Astro.
  - `astroCases` da los 8 casos de un contrato como el de RadioGroup, y los de Button, Input,
    Textarea y Checkbox no cambian.
  - `casesOf` da un valor de `options` distinto del de ejemplo y comprueba que la historia lo pinta.
  - Los tests de los demás contratos siguen iguales: da el número antes y después.
  Inyección: declarar `options?: …` en una copia en memoria pone en rojo la comprobación de la
  obligatoria; quitar la rama `options` de `astroCases` pone en rojo los 8 casos.

- [x] **T-2 — El ayudante de campo, también como grupo**
  Cubre: RF-2, RF-4 a RF-7 (la lógica)
  Archivos: `packages/react/src/field.tsx` (modo `group`: `fieldset role="radiogroup"`, `legend`, la
  descripción, `aria-invalid` y `aria-required` en el grupo), `packages/astro/src/field.ts` (prefijo
  `museum-radiogroup`), `tests/field-ids.test.ts`
  Hecho cuando:
  - Sin `group`, el marcado de Input, Textarea y Checkbox es el de hoy: `field-markup.test.ts` sigue
    en verde sin cambiar una línea.
  - Con `group`, `Field` pinta el `fieldset` con su `legend`, y da a sus hijos el `id` del grupo y
    el `name`.
  - `fieldIds` cuenta `museum-radiogroup` aparte (como dato).
  - Dos commits: `refactor(packages/react)` y `refactor(packages/astro)`.
  Inyección: poner `aria-describedby` en los hijos en lugar del grupo pone en rojo el caso de modo
  `group` de `field-ids.test.ts`; romper el modo por defecto pone en rojo `field-markup.test.ts`.

  Va en la ola 1 junto a la T-1: no comparten archivos.

  Nota: `Field` gana `group?: { name, size, disabled, className?, attrs? }`; con él pinta el `fieldset` y da a los hijos solo `id` y `name` (sin `aria-describedby`: va en el grupo). `attrs` se esparce primero en el `fieldset`. Inyecciones vistas en rojo: `aria-describedby` en los hijos (2 tests de `field-ids`) y orden hint/error en el modo por defecto (6 de `field-markup`; hay que reconstruir `packages/react` porque lee `dist`). Tests: +4 (`field-ids`), el resto sin cambios.

- [ ] **T-3 — Hoja del grupo, el círculo y el punto**
  Cubre: RF-10 a RF-15 (sobre la página fija)
  Archivos: `styles/museum.css` (tokens `--museum-radio-*` en los tres bloques,
  `.museum-radiogroup*`, `.museum-radio*`, colores forzados), `tests/fixtures/field.html`,
  `tests/field-styles.test.ts`
  Hecho cuando: en Edge, en la página fija con el marcado canónico, en los cinco modos de tema y en
  los tres `size`:
  - el borde del círculo da ≥ 3:1 contra el fondo, en reposo y en error;
  - el punto da ≥ 3:1 contra el círculo marcado, y el círculo marcado ≥ 3:1 contra el fondo;
  - la leyenda, las etiquetas, la ayuda y el error dan ≥ 4.5:1, también en el `disabled` con error;
  - cada opción mide ≥ 24 × 24 px;
  - con el foco, el anillo da ≥ 3:1, y en error el borde sigue siendo el de error con
    `outline-offset` > 0;
  - con `forcedColors: 'active'`, la opción marcada y las demás difieren, también en error;
  - cada regla nueva lee solo `var(--museum-*)` o colores de sistema;
  - Checkbox, Input y Textarea siguen con sus casos: da el número antes y después;
  - el coordinator aprueba las capturas (dos temas y colores forzados) antes del commit.
  Inyección: un `--museum-radio-mark` igual a `--museum-radio-checked-bg` pone en rojo RF-11; quitar
  `.museum-radio` del bloque de colores forzados pone en rojo RF-15.

  Va en la ola 2: con la T-1 y la T-2 serían tres `npm test` a la vez.

- [ ] **T-4 — Contrato y RadioGroup en los dos frameworks, con su galería**
  Cubre: RF-1, RF-2 a RF-9 y RF-16 (marcado), NFR de galería
  Archivos: `contracts/radiogroup.contract.json` (exacto, plan, bloque 4),
  `packages/react/src/RadioGroup/RadioGroup.tsx`, `packages/react/src/index.ts`,
  `packages/astro/src/RadioGroup/RadioGroup.astro`, `packages/astro/index.js`,
  `packages/astro/index.d.ts`, `gallery/stories/RadioGroup.react.stories.tsx`,
  `gallery/stories/RadioGroup.astro.stories.tsx`, `gallery/stories/RadioGroup.mdx`,
  `gallery/lib/example-classes.ts`, `tests/gallery-browser-radiogroup.test.ts`,
  `tests/field-markup.test.ts`
  Hecho cuando:
  - `contract.test.ts`, `packages.test.ts` y `projects.test.ts` dan verde con RadioGroup.
  - `field-markup.test.ts` (un `kind` RadioGroup) da el marcado canónico en React:
    - sin ayuda ni error, con ayuda, con error, con los dos (el error primero);
    - `required`, `disabled` del grupo y de una opción;
    - `defaultValue`;
    - `value` controlado sin `defaultChecked`;
    - `id` y `aria-describedby` del consumidor, y la clase en el `fieldset`;
    - `options` vacío.
  - En Astro, los 8 casos dan el mismo marcado que React, sin `<script>` y con ids reproducibles.
  - Los tests de galería generalizados dan verde con RadioGroup, y la matriz lo muestra en los dos
    frameworks.
  - Cuatro commits: el contrato (`feat:`), `feat(packages/react)`, `feat(packages/astro)` y la
    galería (`docs:`).
  - El coordinator aprueba las capturas en los dos temas antes del commit.
  Inyección: marcar siempre la primera opción en Astro pone en rojo el caso `default` contra React;
  quitar `tests/gallery-browser-radiogroup.test.ts` pone en rojo `projects.test.ts`.

  Va sola en la ola 3: necesita la T-1 y la T-2, y sus capturas, la hoja (T-3).

- [ ] **T-5 — RadioGroup en los consumidores: accesibilidad en Edge**
  Cubre: RF-2 a RF-16 (en el navegador), NFR de accesibilidad y regla 2
  Archivos: `tests/lib/consumer.ts` (`radiogroupInstances`, plan, bloque 4),
  `tests/lib/field-a11y.ts` (`kind` RadioGroup), `tests/field-a11y-radiogroup.test.ts`
  (con `need('consumers')`)
  Hecho cuando: en Edge, sobre los consumidores construidos de React y de Astro, en los cinco modos
  de tema:
  - RF-2: el grupo se halla por su rol y su nombre;
  - RF-3: pulsar cada etiqueta selecciona su opción y desmarca la anterior;
  - RF-4 a RF-7, como en Checkbox, en el grupo;
  - RF-8: un `Tab` entra una vez, y `ArrowDown` selecciona la siguiente;
  - RF-9: `selected` empieza en su opción;
  - RF-10 a RF-15, contra el fondo real y con colores forzados;
  - RF-16: lo `disabled` no se enfoca ni se selecciona;
  - la etiqueta larga se parte sin desbordar a 320 px;
  - Input, Textarea y Checkbox siguen con sus casos: da el número antes y después.
  Inyección: quitar `role="radiogroup"` del ayudante en la rama pone en rojo RF-2; dar un `name`
  distinto a cada opción pone en rojo RF-3 y RF-8.

## Grafo de olas

| Ola | Tareas | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 | — (no comparten archivos) |
| 2 | T-3 | No más de dos `npm test` a la vez (017). |
| 3 | T-4 | El formato (T-1), el ayudante (T-2) y la hoja (T-3). |
| 4 | T-5 | RadioGroup exportado en los dos paquetes (T-4). |
