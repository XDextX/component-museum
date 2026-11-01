# Plan 013 — radiogroup

Parte de `spec.md` (16 RF) y de `notes.md`: las 7 preguntas de clarify, resueltas en modo autónomo.
Se apoya en lo que hay en `spec/017-tests-rapidos` (b7969d5):
- **El formato de contrato** (`tests/lib/contract.ts`, `tests/lib/api.ts`,
  `gallery/lib/contract-args.ts`) admite `enum`, `boolean` y `string`, opcional u obligatoria. No
  admite listas.
- **El ayudante de campo:**
  - `packages/react/src/field.tsx` (`Field`, con `inline` de la 012) pinta una `<label for>`;
  - `packages/astro/src/field.ts` (`fieldIds`) admite los prefijos `museum-input`,
    `museum-textarea` y `museum-checkbox`.
- **La hoja de Checkbox** (`.museum-checkbox*`, tokens `--museum-checkbox-*`, colores forzados) y
  `.museum-field--inline`.
- **La suite de la 017:**
  - `need(...)` en cada archivo de navegador;
  - un `gallery-browser-<componente>.test.ts` por contrato con historia React, que exige
    `projects.test.ts`;
  - `tests/lib/field-a11y.ts` con un `kind` por componente y un `field-a11y-<kind>.test.ts` por
    `kind`;
  - `tests/lib/gallery-browser.ts`, con `casesOf(contract)`;
  - los consumidores guardados y sus builds por clave.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | Tipo `options` en el formato de contrato (T-1); `contracts/radiogroup.contract.json` y los dos RadioGroup (T-4). |
| RF-2, RF-4 a RF-7 | El ayudante en modo grupo, con `fieldset role="radiogroup"` y `legend` (T-2); marcado (T-4) y navegador (T-5). |
| RF-3, RF-8, RF-9, RF-16 | Radios nativos con `name` común, `<label for>` por opción, `defaultValue` y `disabled` (T-4); navegador (T-5). |
| RF-10 a RF-15 | Tokens y reglas del círculo, el punto y el anillo, y los colores forzados (T-3); página fija (T-3) y consumidores (T-5). |
| NFR | Galería y archivos por componente de la 017 (T-4); regla 2 (T-5). |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad | Tarea |
|---|---|---|---|
| `tests/lib/contract.ts`, `tests/lib/api.ts`, `tests/contract.test.ts` | mod. | Tipo `options` obligatorio (`'options!'` en la API), sin tocar los demás. | T-1 |
| `gallery/lib/contract-args.ts`, `tests/contract-args.test.ts` | mod. | Control `object` para `options`; `exampleOptions`; `usageSnippet` con `options={[…]}`; `astroCases` con las opciones de ejemplo. | T-1 |
| `tests/lib/gallery-browser.ts` | mod. | `casesOf` sabe dar un valor de `options` fuera del de ejemplo y comprobar que se pinta. | T-1 |
| `packages/react/src/field.tsx`, `packages/astro/src/field.ts`, `tests/field-ids.test.ts` | mod. | Modo `group`: `fieldset role="radiogroup"` y `legend`, con la descripción y `aria-invalid`/`aria-required` en el grupo; prefijo `museum-radiogroup`. | T-2 |
| `styles/museum.css`, `tests/fixtures/field.html`, `tests/field-styles.test.ts` | mod. | Tokens `--museum-radio-*` en los tres bloques; `.museum-radiogroup*` y `.museum-radio*`; colores forzados. | T-3 |
| `contracts/radiogroup.contract.json` | sí | El contrato (bloque 4). | T-4 |
| `packages/react/src/RadioGroup/RadioGroup.tsx`, `packages/react/src/index.ts` | sí / mod. | RadioGroup de React y su export. | T-4 |
| `packages/astro/src/RadioGroup/RadioGroup.astro`, `packages/astro/index.js`, `packages/astro/index.d.ts` | sí / mod. | RadioGroup de Astro y su export. | T-4 |
| `gallery/stories/RadioGroup.react.stories.tsx`, `RadioGroup.astro.stories.tsx`, `RadioGroup.mdx`, `gallery/lib/example-classes.ts` | sí / mod. | Historias, documentación en español e inglés y `my-radiogroup`. | T-4 |
| `tests/gallery-browser-radiogroup.test.ts` | sí | El archivo de navegador del componente, que pide `need('gallery')` (017). | T-4 |
| `tests/field-markup.test.ts` | mod. | Un `kind` RadioGroup: React contra el canónico, y Astro contra React. | T-4 |
| `tests/lib/consumer.ts`, `tests/lib/field-a11y.ts`, `tests/field-a11y-radiogroup.test.ts` | mod. / mod. / sí | Instancias de RadioGroup en los consumidores, el `kind` RadioGroup y su archivo con `need('consumers')`. | T-5 |

**Archivos compartidos y quién los toca:**
- el formato de contrato y `gallery-browser.ts`: solo la T-1;
- los ayudantes: solo la T-2;
- la hoja, la página fija y `field-styles.test.ts`: solo la T-3;
- el contrato, los `index`, las historias, `example-classes.ts` y `field-markup.test.ts`: solo la
  T-4;
- `consumer.ts` y `field-a11y.ts`: solo la T-5.

## 3. Lógica pura

```ts
// tests/lib/contract.ts and gallery/lib/contract-args.ts
type PropSpec = … | { type: 'options'; required: true };   // value: { value: string; label: string; disabled?: boolean }[]
exampleOptions(): { value: string; label: string; disabled?: boolean }[]
  // [{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }, { value: 'c', label: 'Option C' }]
// packages/astro/src/field.ts — the prefix union grows by 'museum-radiogroup'
```

## 4. Algoritmo

**Contrato** (`contracts/radiogroup.contract.json`, exacto):
```json
{
  "name": "RadioGroup",
  "props": {
    "label": { "type": "string", "required": true },
    "name": { "type": "string", "required": true },
    "options": { "type": "options", "required": true },
    "hint": { "type": "string", "default": "" },
    "error": { "type": "string", "default": "" },
    "size": { "type": "enum", "values": ["sm", "md", "lg"], "default": "md" },
    "disabled": { "type": "boolean", "default": false },
    "required": { "type": "boolean", "default": false },
    "defaultValue": { "type": "string", "default": "" }
  },
  "events": [],
  "content": false,
  "classProp": true
}
```

**Marcado canónico** (`ID` es el del grupo; cada opción, `ID-<índice>`):
```html
<fieldset id="ID" class="museum-field museum-radiogroup museum-radiogroup--md [clase]" role="radiogroup"
  aria-describedby="ID-error ID-hint [consumidor]" aria-invalid="true" aria-required="true" disabled data-museum-radiogroup>
  <legend class="museum-field__label">Label<span class="museum-field__required" aria-hidden="true">*</span></legend>
  <div class="museum-radiogroup__option">
    <input id="ID-0" type="radio" class="museum-radio" name="NAME" value="a" required checked />
    <label for="ID-0">Option A</label>
  </div>
  …
  <p id="ID-hint" class="museum-field__hint">Hint</p>
  <p id="ID-error" class="museum-field__error">Error</p>
</fieldset>
```
- `checked` va en la opción cuyo `value` es `defaultValue`.
- `disabled` en una opción va en su `<input>`, y en el `fieldset` si es de todo el grupo.

**React:** con `value` (controlado), cada radio recibe `checked={opción.value === value}`, y no
`defaultChecked`. `onChange` y los demás atributos van al `fieldset`.

**Hoja (T-3):**
- **Tokens nuevos**, en los tres bloques de tema: `--museum-radio-checked-bg` y
  `--museum-radio-mark`, por defecto `var(--museum-checkbox-…)`.
- **`.museum-radiogroup`:** `border: 0`, `margin: 0`, y el `padding` y la superficie del campo. La
  `legend` lleva `padding: 0` y la tipografía de la etiqueta.
- **Opciones:** `.museum-radiogroup__option` en columna, con `gap` de `--museum-space-sm-y`. Cada
  opción con la rejilla de `.museum-field--inline`.
- **`.museum-radio`:**
  - como `.museum-checkbox`, pero con `border-radius: 50%`;
  - el punto es un `::before` circular, con `background-color: var(--museum-radio-mark)` y
    `scale(0)` → `scale(1)` con `:checked`;
  - con `:checked`, el fondo es `--museum-radio-checked-bg`.
- **Error:** `.museum-radiogroup[aria-invalid="true"] .museum-radio` lleva
  `border-color: var(--museum-field-error)`.
- **Anillo:** el anillo de la 003 en `.museum-radio:focus-visible`, por fuera del borde.
- **`disabled`:** la opacidad, solo en el control.
- **Colores forzados:** el bloque de la 012 con `.museum-radio` (`CanvasText`, `Highlight`,
  `HighlightText`), incluido el borde de error, que en la 012 hubo que corregir en la validación.

**Galería (T-4):**
- La historia React usa `argTypesFromContract` (`options` como control JSON), `label: 'Plan'` y
  `exampleClasses.RadioGroup`. Lleva `key` sobre `defaultValue`.
- La historia Astro tiene 9 casos. `RadioGroup.mdx` va en las dos lenguas.
- `tests/gallery-browser-radiogroup.test.ts` llama a `defineGalleryBrowser('RadioGroup',
  need('gallery').storybook)`.

**Consumidores (T-5):** `radiogroupInstances` crea, con prefijo `radiogroup-`:
- los tres `size`;
- `hint`, `error`, `both` y `required`;
- `disabled` (todo el grupo), y una opción `disabled`;
- `selected` (con `defaultValue`), `own` y una etiqueta larga.

`field-a11y.ts` gana un `kind` RadioGroup:
- **RF-2:** el grupo por su rol y su nombre.
- **RF-3:** pulsar cada etiqueta.
- **RF-8:** con `Tab` se entra una vez, y con `ArrowDown` se selecciona la siguiente.
- **RF-10 a RF-15:** en los tres modos de tema, más los colores forzados.
- **RF-16:** `Tab`, las flechas y la pulsación se saltan lo `disabled`.

## 5. Interfaz

- **Grupo:** la leyenda arriba, las opciones en columna (cada círculo con su etiqueta a la derecha),
  y la ayuda y el error debajo, sobre la superficie del campo.
- **Seleccionada:** el círculo relleno, con el punto.
- **Error:** el borde de cada círculo y el texto de error.
- **`disabled`:** atenuado y fuera del orden de `Tab`.
- **Colores forzados:** colores de sistema.
- **Galería:** `RadioGroup/React`, `RadioGroup/Astro` (9 casos) y `RadioGroup/Documentation`; la
  matriz lo muestra en los dos frameworks.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **`options` como dato, con un tipo nuevo en el contrato.** | Hijos `<Radio>`: en Astro, un slot no puede recibir el `name` ni los `id` del grupo (009). |
| **`fieldset` con `role="radiogroup"`.** | Un `div role="radiogroup"`: perdería el `disabled` nativo del grupo y la `legend`. |
| **La descripción, `aria-invalid` y `aria-required`, en el grupo.** | En cada radio: el lector lo repetiría en cada opción. |
| **Tokens propios, con el valor de Checkbox.** | Reutilizar `--museum-checkbox-*`: cambiar Checkbox cambiaría RadioGroup sin quererlo. |
| **El ayudante en modo `group` (T-2).** | Escribir el grupo dentro de RadioGroup: otra copia de la lógica de `id` y ARIA. |
| **Contrato, dos frameworks e historias en una tarea (T-4)**, con su archivo `gallery-browser-radiogroup`. | Repartirlos: el cruce de paquetes, la regla 5 y `projects.test.ts` de la 017 quedarían en rojo entre olas. |

**Dependencias (regla 9).** Ninguna nueva.

**Commits:**
- **T-1:** `test:` y `feat:` para la galería, sin scope.
- **T-2:** `refactor(packages/react)` y `refactor(packages/astro)`.
- **T-3:** `feat:` para la hoja, más los vacíos con scope de la sesión de git.
- **T-4:** el contrato (`feat:`), `feat(packages/react)`, `feat(packages/astro)` y la galería
  (`docs:`).
- **T-5:** `test:`.

## 7. Estrategia de tests

- **Runner:** Vitest, con Edge vía `playwright-core`, en los proyectos `unit` y `e2e` de la 017.
- **Como dato:** el tipo `options` (T-1), `fieldIds` y el modo `group` (T-2), y el marcado (T-4).
- **En Edge:** la página fija en los cinco modos de tema y con colores forzados (T-3), y los
  consumidores (T-5).
- **Sin aflojar:** cada tarea da el número de tests de Input, Textarea y Checkbox antes y después, y
  sus inyecciones de la 012 siguen en rojo.
- **Inyección por tarea:** su línea «Inyección:», en la rama del worktree; el commit dice cuál
  se vio en rojo (regla 8).
- **Trabajo visual:** capturas en los dos temas, más una con colores forzados, de la página fija
  (T-3) y de las historias (T-4), al coordinator antes del commit.
- **Antes de reportar:** el build de `packages/react`, `npm run gallery:astro`, los dos `tsc` y
  `npm test`. Las notas, en UTF-8 y CRLF.
- **Carga:** nunca más de dos tareas con `npm test` a la vez (017).
- **Proporción:** 5 tareas para 16 RF.
