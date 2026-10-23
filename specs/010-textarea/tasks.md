# Tareas 010 — textarea

**Approved:** 2026-10-23 · el coordinator en modo autónomo

Cómo se trabaja en paralelo (plan, bloque 2): cada tarea va en su propio worktree, en
`.claude/worktrees/`, con su `node_modules`. Cada tarea empieza, con el árbol limpio, así:
1. `git branch -m spec/010-textarea-T-n`;
2. `git reset --hard <PLAN>`, o el commit de la ola anterior ya mergeada que dé el coordinator;
3. `npm ci`, `npm run build:packages` y `npm run gallery:astro`.

Antes de reportar, cada tarea pasa el build de `packages/react`, `npm run gallery:astro`,
`tsc --noEmit`, `tsc --noEmit -p gallery` y `npm test`. Al cerrar cada ola, la sesión de git
mergea las ramas en `spec/010-textarea` y se pasa `npm test` sobre el merge; un rojo vuelve a la
tarea dueña del archivo. Se borra `node_modules` antes de quitar cada worktree.

Cada archivo compartido lo toca una sola tarea (plan, bloque 2):
- `Input.tsx`, `Input.astro`, `packages/react/src/field.tsx` y `packages/astro/src/field.ts`: la T-1;
- `styles/museum.css` y la página fija: la T-2;
- el contrato, los `index` de los dos paquetes, `gallery/lib/example-classes.ts`, las historias y
  `field-markup.test.ts`: la T-3;
- `tests/lib/consumer.ts` y `field-a11y.test.ts`: la T-4.

- [ ] **T-1 — Ayudante de campo compartido, con Input usándolo**
  Cubre: RF-2 a RF-6 (la lógica que hereda Textarea)
  Archivos: `packages/react/src/field.tsx`, `packages/react/src/Input/Input.tsx`,
  `packages/astro/src/field.ts`, `packages/astro/src/Input/Input.astro`
  Hecho cuando:
  - Input de React y de Astro usan el ayudante de su paquete, sin ninguna lógica de `id` ni de
    `aria-describedby` propia.
  - `input-markup.test.ts` sigue en verde sin cambiar una línea: el mismo marcado, los 13 casos de
    Astro iguales a React, ids reproducibles y sin `<script>`.
  - `fieldIds` tiene sus tests como dato: `id` propio; contador por prefijo; orden error, ayuda,
    consumidor; vacío da `undefined`.
  - Los ayudantes no se exportan desde ninguna entrada, y `packages.test.ts` sigue en verde.
  - Hay dos commits, `refactor(packages/react)` y `refactor(packages/astro)`.
  Inyección: poner la ayuda antes del error en el ayudante de cada paquete pone en rojo el caso
  «with both» de `input-markup.test.ts`, en React y en la comparación Astro.

- [ ] **T-2 — Hoja de Textarea sobre las reglas del campo**
  Cubre: RF-7, RF-8, RF-9, RF-10 (sobre la página fija)
  Archivos: `styles/museum.css`, `tests/fixtures/input-field.html` → `tests/fixtures/field.html`,
  `tests/input-styles.test.ts` → `tests/field-styles.test.ts` (con `git mv`)
  Hecho cuando:
  - Cada regla de control de Input nombra también su par de Textarea, sin declaraciones copiadas.
  - `.museum-textarea` añade solo `resize: vertical` y `display: block`, y no hay tokens nuevos.
  - En Edge, en la página fija, en los cuatro modos de tema, para Textarea:
    - el borde ≥ 3:1, en reposo y en error;
    - los textos ≥ 4.5:1, el error del `disabled` incluido;
    - el anillo ≥ 3:1;
    - en cada `size`, la fuente, el borde, el radio, el `padding` y los colores iguales a los del
      Input;
    - `resize` calculado `vertical`;
    - un error de 600 px sin espacios no ensancha el campo a 320 px.
  - Cada caso de Input de la 009 sigue con su nombre: da el número antes y después.
  - El coordinator aprueba las capturas de la página fija en los dos temas antes del commit.
  Inyección: quitar `.museum-textarea--md` del selector de `padding` pone en rojo RF-9 en `md`;
  `resize: both` pone en rojo RF-10.

  Va en la ola 1 junto a la T-1: no comparten archivos.

- [ ] **T-3 — Contrato y Textarea en los dos frameworks, con su galería**
  Cubre: RF-1, RF-2 a RF-6 y RF-11 (marcado), NFR de galería (regla 5, idiomas)
  Archivos: `contracts/textarea.contract.json` (exacto, plan, bloque 4),
  `packages/react/src/Textarea/Textarea.tsx`, `packages/react/src/index.ts`,
  `packages/astro/src/Textarea/Textarea.astro`, `packages/astro/index.js`,
  `packages/astro/index.d.ts`, `gallery/stories/Textarea.react.stories.tsx`,
  `gallery/stories/Textarea.astro.stories.tsx`, `gallery/stories/Textarea.mdx`,
  `gallery/lib/example-classes.ts` (`Textarea: { 'my-textarea': … }`),
  `tests/input-markup.test.ts` → `tests/field-markup.test.ts` (con `git mv`)
  Hecho cuando:
  - `contract.test.ts` y `packages.test.ts` dan verde a Textarea en los dos paquetes.
  - `field-markup.test.ts` da el marcado canónico de Textarea en React en cada caso:
    - sin ayuda ni error, con ayuda, con error, con los dos (el error primero);
    - `required`, `disabled`, `id` y `aria-describedby` del consumidor;
    - atributos libres (`rows`, `name`) y la clase en el `<textarea>`;
    - `value` y `defaultValue`.
  - En Astro, el marcado de los 7 casos es igual al de React; `value="<b>&\nx"` sale escapado y
    con su salto; un `value` que empieza por salto de línea lo conserva; no hay `<script>`; y los
    ids son reproducibles.
  - Cada caso de Input sigue con su nombre: da el número antes y después.
  - Los tests de galería generalizados dan verde con Textarea: regla 5, idiomas, snippets, clases
    de ejemplo, casos Astro y desborde a 320 y 542 px.
  - La matriz muestra Textarea en los dos frameworks.
  - Hay cuatro commits: el contrato (`feat:`), `feat(packages/react)`, `feat(packages/astro)` y la
    galería (`docs:`).
  - El coordinator aprueba las capturas de las dos historias y la documentación en los dos temas
    antes del commit.
  Inyección: escribir `value` con `set:html` en Astro pone en rojo el caso de escape; quitar la
  historia Astro de Textarea pone en rojo la regla 5.

  Va sola en la ola 2: necesita el ayudante (T-1), y sus capturas necesitan la hoja (T-2).

  Añadido por el dueño tras la T-1: un caso de Astro con ayuda y error juntos (en Input y en
  Textarea), para que la comparación con React vigile el orden error-ayuda.

- [ ] **T-4 — Textarea en los consumidores: accesibilidad en Edge**
  Cubre: RF-2 a RF-11 (en el navegador), NFR de accesibilidad y regla 2
  Archivos: `tests/lib/consumer.ts` (`textareaInstances`, plan, bloque 4),
  `tests/input-a11y.test.ts` → `tests/field-a11y.test.ts` (con `git mv`)
  Hecho cuando: en Edge, sobre los consumidores construidos de React y de Astro, en los dos temas,
  Textarea pasa los mismos casos que Input:
  - RF-2 (gemelas incluidas), RF-3 y RF-4 (el error primero), RF-5 y RF-6;
  - RF-7 y RF-8 contra el fondo real;
  - foco con `Tab`, que salta el `disabled`.

  Además, para Textarea:
  - RF-9: los estilos calculados son iguales a los del Input del mismo `size`;
  - RF-10: `resize` `vertical`;
  - RF-11: el valor exacto de `textarea-escape` y `textarea-newline`.

  Cada caso de Input sigue con su nombre: da el número antes y después.
  Inyección: quitar `htmlFor` del ayudante de React en la rama pone en rojo RF-2 de Input y de
  Textarea en React; quitar el salto inicial que añade Astro pone en rojo RF-11 en
  `textarea-newline`.

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 | — (no comparten archivos) |
| 2 | T-3 | El ayudante de la T-1; la hoja de la T-2 para las capturas. |
| 3 | T-4 | Textarea exportado en los dos paquetes (T-3). |

Si una tarea necesita tocar un archivo de otra tarea de su misma ola, no lo hace: para y vuelve
al plan.
