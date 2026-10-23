# Tareas 009 — input

**Approved:** 2026-10-23 · el coordinator en modo autónomo; el npm test de la ola 2 se pasa tras la ola 3 (sin Input de Astro, la regla 3/4 del paquete Astro puede ir en rojo)

Cómo se trabaja en paralelo (plan, bloque 2): cada tarea va en su propio worktree, en
`.claude/worktrees/`, con su `node_modules`. Los worktrees salen de `main`, así que cada tarea
empieza, con el árbol limpio, así:
1. `git branch -m spec/009-input-T-n`: se renombra la rama que da la app, no se crea otra;
2. `git reset --hard <PLAN>`, o el commit de la ola anterior ya mergeada que dé el coordinator;
3. `npm ci`, `npm run build:packages` y `npm run gallery:astro`.

Antes de reportar, cada tarea pasa los dos `tsc` (`tsc --noEmit` y `tsc --noEmit -p gallery`) y
`npm test`. Al cerrar cada ola, la sesión de git mergea las ramas en `spec/009-input` y se pasa
`npm test` sobre el merge; un rojo vuelve a la tarea dueña del archivo (por ejemplo, un snippet de
`Input.mdx` que los tests generalizados de la T-3 rechacen vuelve a la T-4). Se borra
`node_modules` antes de quitar cada worktree.

Cada archivo compartido lo toca una sola tarea (plan, bloque 2):
- `gallery/lib/contract-args.ts`, `tests/lib/contract.ts`, `tests/lib/api.ts`: la T-1;
- `styles/museum.css`: la T-2;
- los tests de galería, `extract-astro.mjs` e `index.astro`: la T-3;
- `contracts/input.contract.json`, `packages/react/src/index.ts`, `Input.mdx`: la T-4;
- `packages/astro/index.js` e `index.d.ts`: la T-5;
- `tests/lib/consumer.ts`: la T-6;
- `tests/input-markup.test.ts` lo crea la T-4 y lo amplía la T-5, en una ola posterior.

- [ ] **T-1 — Contrato con props de texto**
  Cubre: RF-1 (formato)
  Archivos: `tests/lib/contract.ts`, `tests/lib/api.ts`, `tests/contract.test.ts`,
  `gallery/lib/contract-args.ts`, `tests/contract-args.test.ts`
  Hecho cuando:
  - `PropSpec` admite `string` con `default` u obligatoria. `expectedApi` da `'string'` o `'string!'`,
    y `declaredProps`/`diffApi` detectan un tipo distinto y una obligatoria declarada opcional.
  - `contract.test.ts` recorre cada contrato y cada framework con carpeta, y Button conserva sus
    casos exactos.
  - En `contract-args.ts`, como dato con un contrato en memoria:
    - `argTypesFromContract` da control `text` a las `string`;
    - `defaultSummary` da `""` o nada;
    - `usageSnippet` escribe `label="…"`;
    - `astroCases` da los 13 casos de un contrato como el de Input, y los 6 de siempre de Button.
  - Ningún test de Button se quita ni se afloja: dilo con el número antes y después.
  Inyección: declarar `label?: string` en una copia en memoria pone en rojo la comprobación de la
  obligatoria; quitar la rama `string` de `astroCases` pone en rojo los 13 casos.

- [x] **T-2 — Hoja del campo y sus tokens**
  Cubre: RF-7, RF-8, RF-9 (sobre la página fija)
  Archivos: `styles/museum.css` (tokens en los tres bloques de tema, `.museum-field*`,
  `.museum-input*`), `tests/fixtures/input-field.html`, `tests/input-styles.test.ts`
  Hecho cuando:
  - En Edge, en la página fija con el marcado canónico del plan, en claro y en oscuro, con
    `data-theme` y por preferencia del sistema:
    - el borde del control contrasta ≥ 3:1, en reposo y en error;
    - la etiqueta, la ayuda, el error, el valor y el placeholder contrastan ≥ 4.5:1;
    - el anillo de foco contrasta ≥ 3:1;
    - en los tres `size`, Input y Button miden lo mismo de alto;
    - un error de 600 px sin espacios no ensancha el campo a 320 px;
    - el error de un campo `disabled` mantiene los 4.5:1 (la opacidad solo atenúa el control).
  - Cada regla de Input lee solo `var(--museum-*)`.
  - `cascade.test.ts`, `theme.test.ts` y `styles.test.ts` siguen en verde.
  - El coordinator aprueba las capturas de la página fija en los dos temas antes del commit
    (trabajo visual).
  Inyección: un `--museum-control-border` de `#e5e7eb` en claro pone en rojo RF-7; quitar el
  `padding` vertical de `.museum-input--md` pone en rojo RF-9.
  Visto en rojo y restaurado: con el borde en `#e5e7eb`, RF-7 falla en los dos modos claros (2
  tests); con `padding: 0 var(--museum-space-md-x)` en `.museum-input--md`, RF-9 falla (1 test).

  Va en la ola 1 junto a la T-1: no comparten archivos, y la página fija no espera a los paquetes.

- [ ] **T-3 — Tests de galería por contrato**
  Cubre: RF-10 (los tests)
  Archivos: `tests/lib/gallery-pages.ts`, `tests/gallery.test.ts`, `tests/snippets.test.ts`,
  `tests/gallery-browser.test.ts`, `tests/gallery-i18n.test.ts`, `tests/gallery-overflow.test.ts`,
  `gallery/scripts/extract-astro.mjs`, `gallery/astro-render/src/pages/index.astro`,
  `gallery/stories/Button.astro.stories.tsx` (solo la ruta del JSON)
  Hecho cuando:
  - Los tests de galería recorren cada componente exportado con contrato: regla 5, idiomas,
    snippets, historia React, casos Astro y desborde a 320 y 542 px.
  - Las comprobaciones propias de Button siguen iguales o más estrictas: dilo con el número de
    tests de Button antes y después.
  - `extract-astro.mjs` escribe `generated/astro-button.json` igual que hoy (mismo contenido).
  - La galería se ve igual (Button/React, Button/Astro, documentación y matriz).
  Inyección: un segundo componente en memoria, exportado y sin historia, pone en rojo la regla 5
  y los idiomas; quitar el `<script>` de un caso Astro del HTML extraído no cambia el JSON de
  Button.

- [ ] **T-4 — Contrato e Input de React, con su historia y su documentación**
  Cubre: RF-1, RF-2 a RF-6 (marcado), RF-10 (React y docs)
  Archivos: `contracts/input.contract.json` (exacto, plan, bloque 4),
  `packages/react/src/Input/Input.tsx`, `packages/react/src/index.ts`,
  `gallery/stories/Input.react.stories.tsx`, `gallery/stories/Input.mdx`,
  `tests/input-markup.test.ts`
  Hecho cuando:
  - `contract.test.ts` da verde a Input en React.
  - `renderToStaticMarkup` produce el marcado canónico en cada caso: sin ayuda ni error; con
    ayuda; con error; con los dos (error primero); `required`; `disabled`; `id` y
    `aria-describedby` del consumidor; atributos libres y clase en el `<input>`.
  - Dos Input en un mismo árbol dan `id` distintos.
  - La historia React tiene un control por prop del contrato.
  - `Input.mdx` tiene sus secciones en español y en inglés, con el import completo.
  - La galería muestra Input en React y en la matriz.
  - Tres commits: el contrato (`feat:`), `feat(packages/react)` y `docs:`.
  - El coordinator aprueba las capturas de la historia y de la documentación en los dos temas
    antes del commit.
  Inyección: quitar `htmlFor` de la etiqueta pone en rojo el caso de RF-2; poner la ayuda antes
  del error en `aria-describedby` pone en rojo el caso de los dos.

  Va en la ola 2 junto a la T-3: no comparten archivos. Las dos necesitan la T-1.

- [ ] **T-5 — Input de Astro, con su historia**
  Cubre: RF-1, RF-2 a RF-6 (marcado), RF-10 (Astro)
  Archivos: `packages/astro/src/Input/Input.astro`, `packages/astro/index.js`,
  `packages/astro/index.d.ts`, `gallery/stories/Input.astro.stories.tsx`,
  `tests/input-markup.test.ts` (añade la comparación Astro contra React)
  Hecho cuando:
  - `contract.test.ts` da verde a Input en Astro.
  - El marcado de Astro (desde `astro-render`) es el mismo que el de React, caso por caso,
    normalizando solo los `id` generados.
  - El componente no emite ningún `<script>`.
  - La historia Astro tiene los 13 casos con su código copiable.
  - La matriz marca Input en los dos frameworks.
  - Los tests generalizados de la T-3 dan verde con Input.
  - Un commit `feat(packages/astro)` y otro con la historia.
  - El coordinator aprueba las capturas de la historia en los dos temas antes del commit.
  Inyección: quitar la historia Astro de Input pone en rojo la regla 5 (comprobación de RF-10); un
  `id` con `Math.random()` pone en rojo la comparación entre dos builds.

- [ ] **T-6 — Input en los consumidores: accesibilidad en Edge**
  Cubre: RF-2 a RF-9 (en el navegador), NFR de accesibilidad y regla 2
  Archivos: `tests/lib/consumer.ts` (instancias de Input, plan, bloque 4),
  `tests/input-a11y.test.ts`
  Hecho cuando:
  - En Edge, sobre los consumidores construidos de React y de Astro, en los dos temas:
    - RF-2: cada etiqueta encuentra y enfoca su control, también en las gemelas;
    - RF-3 y RF-4: la descripción accesible contiene la ayuda y el error, el error primero;
    - RF-5: sin error, no hay `aria-invalid`;
    - RF-6: `required` y su marcador;
    - RF-7 y RF-8: borde ≥ 3:1 y texto ≥ 4.5:1, incluido el error del Input `disabled`;
    - RF-9: Input y Button del mismo `size` miden lo mismo;
    - foco: `Tab` alcanza cada Input no deshabilitado, con anillo ≥ 3:1, y salta el `disabled`.
  - `a11y.test.ts` y los tests de consumidores siguen en verde.
  Inyección: un consumidor con `aria-describedby` vacío en el componente pone en rojo RF-3; un
  Input `disabled` sin el atributo nativo pone en rojo la comprobación del `Tab`.

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 | — (no comparten archivos) |
| 2 | T-3 ∥ T-4 | Las dos usan el formato de contrato de la T-1. |
| 3 | T-5 | Necesita el contrato de la T-4 y los tests generalizados de la T-3. |
| 4 | T-6 | Necesita Input en los dos paquetes (T-4, T-5) y la hoja (T-2). |

Si una tarea necesita tocar un archivo de otra tarea de su misma ola, no lo hace: para y vuelve
al plan.
