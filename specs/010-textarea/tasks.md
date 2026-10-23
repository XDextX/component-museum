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

- [x] **T-1 — Ayudante de campo compartido, con Input usándolo**
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
  Visto en rojo (2026-10-23): en React, `input-markup.test.ts` caso «with both» (1 rojo de 14), restaurado.
  En Astro la comparación NO se pone en rojo: ninguno de sus 13 casos junta ayuda y error, así que la
  inyección solo la ve `tests/field-ids.test.ts` («describes by error, then hint…»), restaurado. Hallazgo:
  la línea de inyección de la tarea no se cumple tal cual en la comparación Astro.

- [x] **T-2 — Hoja de Textarea sobre las reglas del campo**
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

  Hecho (sin commit, a la espera de las capturas aprobadas):
  - Casos de Input de la 009 en `field-styles.test.ts`: 28 antes, 28 después, mismos nombres. El
    archivo pasa de 28 a 32 tests; los 4 nuevos son «includes the Textarea rules grouped with Input», RF-9 de Textarea, RF-10 y
    el error largo en 320 px de Textarea. Los casos de borde, texto, error del `disabled` y anillo
    recorren también los controles `ta-*`.
  - `tests/fixtures/input-field.html` pasa a `field.html`; el único test que lo cargaba es el
    propio de estilos.
  - Contrastes de Textarea en Edge (iguales en los cuatro modos de cada tema): claro: borde 4.83 en
    reposo y 6.47 en error, valor 17.74, placeholder 4.83, etiqueta 17.74, ayuda 7.56, error 6.47
    (también en `disabled`), anillo 6.70; oscuro: 6.99, 9.35, 16.98, 6.99, 16.98, 12.04, 9.35,
    9.35 y 9.84.
  - Inyecciones vistas en rojo y restauradas: quitar `.museum-textarea--md` del selector de
    `padding` pone en rojo RF-9 de Textarea (1 test); `resize: both` pone en rojo RF-10 (1 test).

  Va en la ola 1 junto a la T-1: no comparten archivos.

- [x] **T-3 — Contrato y Textarea en los dos frameworks, con su galería**
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

  Hecho (sin commit, a la espera de las capturas aprobadas):
  - Casos de Input de la 009 en `field-markup.test.ts`: 14 antes (10 de React, 4 de Astro), 14 después,
    mismos nombres; el único que cambia de nombre es el de Astro «(13)» a «(14)» por el caso nuevo.
    Textarea añade 11 de React y 5 de Astro.
  - Caso de Astro con ayuda y error juntos: `astroCases` añade `hint-error` al final cuando el contrato
    tiene `hint` y `error` (Input pasa a 14 casos, Textarea tiene 8, no 7). Los de Button no cambian.
  - `value` con saltos y HTML y `value` con salto inicial se prueban sobre una segunda página,
    `gallery/astro-render/src/pages/textarea-values.astro` (sale en `dist/textarea-values/`).
  - `rows` no sale en los snippets del MDX (`snippets.test.ts` solo admite props del contrato); se
    explica en la prosa.
  - Inyecciones vistas en rojo y restauradas: `set:html` para el `value` en Astro pone en rojo el caso de
    escape (2 tests); quitar el salto inicial pone en rojo el del salto (1); hint antes que error en
    `field.ts` pone en rojo la comparación Astro de Input y de Textarea (el caso `hint-error`, 2 tests);
    quitar la historia Astro de Textarea pone en rojo la regla 5 (3 tests de `gallery.test.ts`).

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

  Hecho (sin commit):
  - Casos de Input de la 009 en `field-a11y.test.ts`: 32 antes (8 por framework y tema), 32 despu�s,
    mismos nombres. Textarea a�ade 40 (10 por framework y tema): los mismos casos, un RF-9 propio
    (contra Input del mismo `size`, y tambi�n en error y `disabled`), RF-10 y RF-11. Total 72.
  - Textarea usa etiquetas y textos propios (`Area �`) salvo las gemelas, que se llaman �Twin� como las de
    Input: con las cuatro en la p�gina, cada etiqueta enfoca su control y los ids difieren. En React hay
    adem�s `textarea-readonly` (`value` sin `onChange`): sigue siendo �Fixed text� tras teclear; el
    `defaultValue`/`value` inicial (`textarea-sm`) s� se edita.
  - Los contrastes del RF-7 y del valor y el placeholder del RF-8 se miden ahora, para los dos campos,
    contra el fondo compuesto real bajo el control (el suelo opaco m�s cercano, o el lienzo blanco), con un
    ayudante instalado una vez en la p�gina; el RF-8 de textos usa `visibleTexts`, como antes.
  - Medido en Edge, React y Astro iguales, claro / oscuro: borde 4.83 / 6.99 en reposo y 6.47 / 9.35 en
    error (tambi�n en `disabled`); valor 17.74 / 16.98; placeholder 4.83 / 6.99; etiquetas 17.74 / 16.98;
    ayuda 7.56 / 12.04; error 6.47 / 9.35 (el de `disabled` incluido); anillo 6.70 / 9.84, de 2 px y con el
    halo del paquete. RF-9: sm 14px/6px, md 16px/8px, lg 18px/12px (fuente / `padding`), radio 6px, borde
    1px, iguales a los de Input. RF-10: `vertical` en los 13 (Astro) y 14 (React) textarea. RF-11:
    `textarea-escape` = `<b>&\nx` y `textarea-newline` = `\nx`, sin elemento `<b>`.
  - Hallazgo y arreglo (aprobado por el due�o): `a11y.test.ts` (Button) pulsaba `Tab` una vez por cada
    coincidencia de `button, a, input, select, textarea, [tabindex]`, deshabilitadas incluidas, y contaba con
    un hueco de sobra. Con el segundo campo `disabled` (el Textarea) el consumidor Astro daba dos vueltas y
    ve�a 10 botones en vez de 9. Ahora cuenta solo lo que Tab alcanza (`:not(:disabled)`, `a[href]`,
    `tabindex` distinto de -1); sigue exigiendo los nueve Buttons, el anillo y el halo. Tests de ese
    archivo: 4 antes, 4 despu�s. Inyecci�n: con el conteo viejo y los dos campos deshabilitados, el test cae
    en Astro, claro y oscuro (2 rojos, �got 10�); con el nuevo pasa. Restaurado.

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 | — (no comparten archivos) |
| 2 | T-3 | El ayudante de la T-1; la hoja de la T-2 para las capturas. |
| 3 | T-4 | Textarea exportado en los dos paquetes (T-3). |

Si una tarea necesita tocar un archivo de otra tarea de su misma ola, no lo hace: para y vuelve
al plan.
