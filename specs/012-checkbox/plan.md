# Plan 012 — checkbox

**Approved:** 2026-10-23 · el coordinator en modo autónomo

Parte de `spec.md` (aprobada por el coordinator en modo autónomo, 13 RF) y de `notes.md`. Las
decisiones son dos: el control se dibuja con `appearance: none` y tokens, y `defaultChecked` va en
el contrato. Se apoya en lo que dejaron la 009, la 010 y la 011 en `spec/012-checkbox` (d9b55cd):
- el ayudante de campo:
  - `packages/react/src/field.tsx` (`Field`) pinta la etiqueta antes del control;
  - `packages/astro/src/field.ts` (`fieldIds(prefix, …)`) admite los prefijos `museum-input` y
    `museum-textarea`;
- la hoja del campo (`.museum-field*`, `.museum-input*`/`.museum-textarea*`) y los tokens
  `--museum-control-*` y `--museum-field-*`, en los tres bloques de tema de la 011:
  - claro: `:root`, `light` y `system`;
  - `@media` con `[data-theme="system"]`;
  - `[data-theme="dark"]`;
- los tests de campo, que recorren una lista de `kinds` (Input, Textarea):
  - `field-markup.test.ts`, `field-ids.test.ts`;
  - `field-styles.test.ts`, sobre `tests/fixtures/field.html`, en los cinco modos de tema de la
    011;
  - `field-a11y.test.ts`, sobre los consumidores, con `inputInstances`/`textareaInstances` en
    `tests/lib/consumer.ts`;
- los tests de galería por contrato, `astroCases` sin `variant` y la fuente única
  `gallery/lib/example-classes.ts`.

Lecciones que el plan aplica:
- El contrato, los dos frameworks y las historias van en una sola tarea; si no, el cruce de
  paquetes y la regla 5 quedan en rojo (009).
- El ayudante va en su propia tarea, vigilado por los tests de marcado (010).
- Las medidas son contra el fondo real compuesto y en los cinco modos de tema (009, 011).
- Con error y foco, el borde de error sigue visible (candidato de pulido de la 011).
- Las notas, en UTF-8.

## Decisiones tomadas en el plan (opción conservadora)

- **La etiqueta no envuelve el control: va después, con `for`.** Es el mismo `<label for>` de Input,
  y no hace falta cambiar cómo se asocian. La zona de pulsación (RF-10) es la unión de las cajas del
  control y de la etiqueta, y la etiqueta tiene `min-height` y `line-height` de 1.5rem (24 px): el
  `line-height` solo ya da los 24 px.
- **La marca es un `::before` del propio `<input>`** con `mask-image` (un SVG fijo de una marca) y
  `background-color: var(--museum-checkbox-mark)`. Chromium, Firefox y Safari pintan
  pseudoelementos en un `input` con `appearance: none`; aquí solo se prueba Edge.
- **En React, `defaultChecked` solo se pasa si el consumidor no pasa `checked`.** Así React no avisa
  de un control a la vez controlado y no controlado.
- **Colores forzados:** el control usa `forced-color-adjust: none` y colores de sistema:
  - el borde, `CanvasText`;
  - el cuadro marcado, `Highlight`;
  - la marca, `HighlightText`.

  Si no, el modo forzado pintaría la marca del color del fondo y la haría invisible.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | `contracts/checkbox.contract.json` y los dos Checkbox (T-3); `contract.test.ts` y `packages.test.ts` ya recorren cada contrato. |
| RF-2 a RF-6 | El ayudante en línea (T-1) usado por Checkbox (T-3); marcado en `field-markup.test.ts` (T-3) y navegador en `field-a11y.test.ts` (T-4). |
| RF-7, RF-8, RF-9 | Tokens y reglas del cuadro y de la marca (T-2); página fija en `field-styles.test.ts` (T-2) y consumidores (T-4). |
| RF-10 | `min-height` y `line-height` de la etiqueta en línea y tamaño del cuadro por `size` (T-2); medida en T-2 y T-4. |
| RF-11 | Anillo de la 003 en `.museum-checkbox:focus-visible`, con el borde de error visible (T-2); con `Tab` en T-4. |
| RF-12 | `defaultChecked` → atributo `checked` en Astro y `defaultChecked` nativo en React (T-3); marcado en T-3 y pulsación en T-4. |
| RF-13 | Bloque `@media (forced-colors: active)` (T-2); con `forcedColors: 'active'` en T-2 y T-4. |
| NFR | Galería (T-3); regla 2 (T-4); foco y `disabled` (T-4). |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad | Tarea |
|---|---|---|---|
| `packages/react/src/field.tsx` | mod. | `Field` gana `inline`: el control antes de la etiqueta y la clase `museum-field--inline`. Sin `inline`, el marcado es el de hoy. | T-1 |
| `packages/astro/src/field.ts` | mod. | `fieldIds` admite el prefijo `museum-checkbox`. | T-1 |
| `tests/field-ids.test.ts` | mod. | El contador del prefijo nuevo, como dato. | T-1 |
| `styles/museum.css` | mod. | Tokens del cuadro marcado y de la marca en los tres bloques; disposición en línea; `.museum-checkbox*` por `size`, `:checked`, `[aria-invalid]`, `:focus-visible`, `:disabled`; colores forzados. | T-2 |
| `tests/fixtures/field.html` | mod. | El marcado canónico de Checkbox (bloque 4), sin marcar y marcado, junto a los de Input y Textarea. | T-2 |
| `tests/field-styles.test.ts` | mod. | RF-7 a RF-11 y RF-13 sobre la página fija, en los cinco modos de tema. | T-2 |
| `contracts/checkbox.contract.json` | sí | El contrato (bloque 4). | T-3 |
| `packages/react/src/Checkbox/Checkbox.tsx`, `packages/react/src/index.ts` | sí / mod. | Checkbox de React y su export. | T-3 |
| `packages/astro/src/Checkbox/Checkbox.astro`, `packages/astro/index.js`, `packages/astro/index.d.ts` | sí / mod. | Checkbox de Astro y su export. | T-3 |
| `gallery/stories/Checkbox.react.stories.tsx`, `Checkbox.astro.stories.tsx`, `Checkbox.mdx` | sí | Historia React con controles, 8 casos Astro y la documentación en español e inglés. | T-3 |
| `gallery/lib/example-classes.ts` | mod. | Entrada `Checkbox` (`my-checkbox`). | T-3 |
| `tests/field-markup.test.ts` | mod. | Un `kind` Checkbox: el marcado de React contra el canónico, y el de Astro contra el de React. | T-3 |
| `tests/lib/consumer.ts` | mod. | `checkboxInstances` (bloque 4). | T-4 |
| `tests/field-a11y.test.ts` | mod. | Un `kind` Checkbox con sus casos propios. | T-4 |

**Archivos compartidos y quién los toca:**
- `field.tsx`, `field.ts` y `field-ids.test.ts`: solo la T-1.
- La hoja, la página fija y `field-styles.test.ts`: solo la T-2.
- El contrato, los `index`, las historias, `example-classes.ts` y `field-markup.test.ts`: solo la
  T-3.
- `consumer.ts` y `field-a11y.test.ts`: solo la T-4.

## 3. Lógica pura

```ts
// packages/astro/src/field.ts — the prefix union grows; nothing else changes
fieldIds(prefix: 'museum-input' | 'museum-textarea' | 'museum-checkbox', id, hint, error, describedBy)
```
En React, `Field({ …, inline?: boolean })` hace lo mismo que hoy y solo cambia el orden de los
nodos.

## 4. Algoritmo

**Contrato** (`contracts/checkbox.contract.json`, exacto):
```json
{
  "name": "Checkbox",
  "props": {
    "label": { "type": "string", "required": true },
    "hint": { "type": "string", "default": "" },
    "error": { "type": "string", "default": "" },
    "size": { "type": "enum", "values": ["sm", "md", "lg"], "default": "md" },
    "disabled": { "type": "boolean", "default": false },
    "required": { "type": "boolean", "default": false },
    "defaultChecked": { "type": "boolean", "default": false }
  },
  "events": [],
  "content": false,
  "classProp": true
}
```

**Marcado canónico:**
```html
<div class="museum-field museum-field--inline">
  <input id="ID" type="checkbox" class="museum-checkbox museum-checkbox--md [clase]"
    aria-describedby="ID-error ID-hint [consumidor]" aria-invalid="true" required checked data-museum-checkbox />
  <label class="museum-field__label" for="ID">Label<span class="museum-field__required" aria-hidden="true">*</span></label>
  <p id="ID-hint" class="museum-field__hint">Hint</p>
  <p id="ID-error" class="museum-field__error">Error</p>
</div>
```
`checked` es el atributo que da `defaultChecked` en Astro. En React, `renderToStaticMarkup` lo
escribe igual a partir de `defaultChecked`.

**Hoja (T-2):**
- **Tokens nuevos, en los tres bloques de tema:** `--museum-checkbox-checked-bg` (el cuadro marcado)
  y `--museum-checkbox-mark` (la marca). El borde reutiliza `--museum-control-border`, y el error,
  `--museum-field-error`. Los valores se eligen para 3:1 (marca contra cuadro, y cuadro contra
  `--museum-surface`) y el test los ajusta.
- **`.museum-field--inline`:** una rejilla de dos columnas (`auto 1fr`), con
  `column-gap: var(--museum-space-sm-y)` y `align-items: start`. La ayuda y el error van en la
  segunda columna, alineados con el texto de la etiqueta. La etiqueta tiene `min-height` y
  `line-height` de 1.5rem; cualquiera de los dos da los 24 px, así que una inyección para RF-10 tiene
  que quitar los dos.
- **`.museum-checkbox`:**
  - `appearance: none`, `margin: 0`, borde de `--museum-border-width` con `--museum-control-border`;
  - fondo `--museum-control-bg`, radio `calc(var(--museum-radius) / 2)`;
  - tamaño `max(1em, 1rem)` con el `font-size` de su `size`, y `display: grid` y
    `place-content: center` para la marca;
  - alineado con la primera línea de la etiqueta (`margin-top` según la diferencia de alturas).
- **`.museum-checkbox::before`:** `content: ""`, tamaño `0.75em`, `mask-image` con el SVG en línea y
  `background-color: var(--museum-checkbox-mark)`, con `transform: scale(0)` que pasa a
  `scale(1)` con `:checked`.
- **`:checked`:** `background-color` y `border-color` de `--museum-checkbox-checked-bg`.
- **`[aria-invalid="true"]`:** `border-color: var(--museum-field-error)`; con `:checked` el cuadro
  conserva su fondo y el borde sigue siendo el de error.
- **`:focus-visible`:** el anillo de dos tonos de la 003, con `outline-offset`. El borde (de error o
  no) queda dentro y no lo tapa.
- **`:disabled`:** `--museum-disabled-opacity` solo en el cuadro, como en los campos de texto.
- **`@media (forced-colors: active)`:** las reglas de las decisiones del plan.

**React (T-3):** `Checkbox` usa `Field` con `inline`. Si el consumidor pasa `checked`, el componente
no envía `defaultChecked`.

**Astro (T-3):** `Checkbox.astro` usa `fieldIds('museum-checkbox', …)` y escribe el marcado
canónico con `checked={defaultChecked}`.

**Galería (T-3):**
- La historia React usa `argTypesFromContract`, con `label: 'Accept the terms'` (distinto de
  `exampleText`) y `exampleClasses.Checkbox`. Lleva `key={String(args.defaultChecked)}` en el
  render: cambiar el control de `defaultChecked` monta de nuevo el input, porque un `defaultChecked`
  no cambia un control ya montado.
- La historia Astro tiene 8 casos: `default`, `size-sm`, `size-lg`, `hint`, `error`, `disabled`,
  `required` y `defaultChecked`.
- `Checkbox.mdx` va en las dos lenguas.

**Consumidores (T-4).** `checkboxInstances` crea, con prefijo `checkbox-`:
- los tres `size`;
- `hint`, `error`, `both` y `required`;
- `disabled` con error, y `disabled` marcado;
- `checked` (con `defaultChecked`);
- las gemelas, `own` y una etiqueta larga de 200 caracteres.

`field-a11y.test.ts` gana un `kind` Checkbox. En los cinco modos de tema y los dos frameworks:
- **RF-2:** pulsar la etiqueta lo marca, también en las gemelas, cada una el suyo.
- **RF-3 a RF-6:** los mismos casos que Input.
- **RF-7:** el borde del cuadro sin marcar ≥ 3:1 contra el fondo compuesto, en reposo y en error.
- **RF-8:** marcado, marca contra cuadro ≥ 3:1 y cuadro contra fondo ≥ 3:1. La marca se lee del
  `background-color` calculado del `::before`.
- **RF-9:** con `visibleTexts`.
- **RF-10:** la unión de las cajas del control y de la etiqueta ≥ 24 × 24 px, en cada `size`.
- **RF-11:** con `Tab`, el anillo ≥ 3:1, y, en `error`, el borde calculado sigue siendo el de error
  con `outline-offset` > 0.
- **RF-12:** `checked` empieza marcado y se desmarca al pulsarlo.
- **RF-13:** con `forcedColors: 'active'`, el fondo calculado del cuadro marcado es distinto del
  del cuadro sin marcar, y la marca es distinta de su cuadro.

## 5. Interfaz

- **Campo:** el cuadro a la izquierda, alineado con la primera línea de la etiqueta; la ayuda y el
  error debajo de la etiqueta; todo sobre la superficie del campo.
- **Marcado:** el cuadro, relleno del color de acento; la marca, en su color.
- **Error:** el borde del cuadro y el texto, en el color de error. Con el foco, el anillo queda por
  fuera y no tapa el borde.
- **`disabled`:** el cuadro atenuado, y la etiqueta, la ayuda y el error legibles.
- **Colores forzados:** el borde, el cuadro marcado y la marca con colores de sistema.
- **Galería:** `Checkbox/React`, `Checkbox/Astro` (8 casos) y `Checkbox/Documentation`; la matriz
  muestra Checkbox en los dos frameworks.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **`<label for>` después del control.** | Envolver el control en la etiqueta: otro marcado para el ayudante, y la ayuda y el error quedarían dentro de la etiqueta y formarían parte de su nombre accesible. |
| **La marca en `::before` del input, con `mask-image` y un token.** | Un SVG en `background-image`: su color no puede leer un token. Un `<span>` hermano: un nodo más en el marcado y en los dos frameworks. |
| **`forced-color-adjust: none` con colores de sistema.** | Dejar que el sistema fuerce los colores: la marca, pintada con `background-color`, tomaría el color del fondo. |
| **`defaultChecked` solo si no hay `checked`** en React. | Pasar los dos: React avisa de un control controlado y no controlado a la vez. |
| **El ayudante en su propia tarea (T-1), en paralelo con la hoja (T-2).** | Meterlo en la T-3: mezcla un refactor vigilado con un componente nuevo. |
| **Contrato, dos frameworks e historias en una tarea (T-3).** | Repartirlos: deja en rojo el cruce de paquetes y la regla 5. |

**Dependencias (regla 9).** Ninguna nueva.

**Commits:**
- **T-1:** `refactor(packages/react)` y `refactor(packages/astro)`.
- **T-2:** `feat:` para la hoja, y después la sesión de git añade `fix(packages/react)` y
  `fix(packages/astro)` vacíos (`AGENTS.md`); más `test:`.
- **T-3:** el contrato (`feat:`), `feat(packages/react)`, `feat(packages/astro)` y la galería
  (`docs:`).
- **T-4:** `test:`.

## 7. Estrategia de tests

- **Runner:** Vitest, con Edge real vía `playwright-core`.
- **Como dato:** `fieldIds` (T-1) y el marcado de React y de Astro (T-3).
- **En Edge:** la página fija en los cinco modos de tema y con colores forzados (T-2); los
  consumidores (T-4).
- **Sin aflojar Input ni Textarea:** `field-markup.test.ts` sigue en verde sin tocar sus casos (T-1)
  y cada tarea da el número de tests de Input y Textarea antes y después.
- **Inyección por tarea:** su línea «Inyección:», en la rama del worktree, y el commit dice cuál se
  vio en rojo (regla 8).
- **Trabajo visual:** capturas en los dos temas, más una con colores forzados, de la página fija
  (T-2) y de las historias y la documentación (T-3), al coordinator antes del commit.
- **Antes de reportar:** el build de `packages/react`, `npm run gallery:astro`, los dos `tsc` y
  `npm test`. Las notas, en UTF-8.
- **Proporción:** 4 tareas para 13 RF.
