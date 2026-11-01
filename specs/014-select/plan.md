# Plan 014 — select

Parte de `spec.md` (16 RF) y de `notes.md`: las 7 preguntas de clarify, resueltas en modo autónomo.
Se apoya en lo que hay en `spec/013-radiogroup` (5a91f34, tras la T-3 de la 013):
- **El formato de contrato** ya admite `options` (013, T-1): `astroCases`, `usageSnippet`,
  `argTypesFromContract` y `casesOf` de `tests/lib/gallery-browser.ts` lo saben tratar.
- **El ayudante de campo:**
  - `packages/react/src/field.tsx` (`Field`, con `inline` y el modo grupo de la 013);
  - `packages/astro/src/field.ts` (`fieldIds`, con los prefijos de Input, Textarea, Checkbox y
    RadioGroup).
- **La hoja:** los tokens de control y de campo, y las reglas de `.museum-input`/`.museum-textarea`
  por `size`, en reposo, en error, con foco y `disabled`.
- **La suite de la 017:** `need(...)`, un `gallery-browser-<componente>` por contrato con historia
  React, y `tests/lib/field-a11y.ts` con un `kind` por componente.

La 013 aún tiene la T-4 y la T-5 en marcha. La rama de la 014 sale de `spec/013-radiogroup` cuando
la 013 esté terminada, y las tareas arrancan de ahí.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | `contracts/select.contract.json` y los dos Select (T-3); `contract.test.ts` y `packages.test.ts`. |
| RF-2 a RF-6 | El ayudante en modo normal, con el prefijo nuevo (T-2); marcado (T-3) y navegador (T-4). |
| RF-7 a RF-9, RF-16 | `<option>` desde `options`, `defaultValue` y `placeholder` (T-3); navegador (T-4). |
| RF-10 a RF-15 | `.museum-select*`, agrupado con Input, la flecha con su token y los colores forzados (T-1); página fija (T-1) y consumidores (T-4). |
| NFR | Galería y archivos por componente de la 017 (T-3); regla 2 (T-4). |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad | Tarea |
|---|---|---|---|
| `styles/museum.css` | mod. | `--museum-select-arrow` en los tres bloques; `.museum-select` y `--sm/md/lg` en los selectores de Input; `appearance: none`, la flecha con dos degradados, el `padding` derecho y la elipsis; colores forzados. | T-1 |
| `tests/fixtures/field.html`, `tests/field-styles.test.ts` | mod. | El marcado canónico de Select y RF-10 a RF-15 sobre la página fija. | T-1 |
| `packages/astro/src/field.ts`, `tests/field-ids.test.ts` | mod. | El prefijo `museum-select`. | T-2 |
| `contracts/select.contract.json` | sí | El contrato (bloque 4). | T-3 |
| `packages/react/src/Select/Select.tsx`, `packages/react/src/index.ts` | sí / mod. | Select de React y su export. | T-3 |
| `packages/astro/src/Select/Select.astro`, `packages/astro/index.js`, `packages/astro/index.d.ts` | sí / mod. | Select de Astro y su export. | T-3 |
| `gallery/stories/Select.react.stories.tsx`, `Select.astro.stories.tsx`, `Select.mdx`, `gallery/lib/example-classes.ts` | sí / mod. | Historias, documentación en español e inglés, y `my-select`. | T-3 |
| `tests/gallery-browser-select.test.ts` | sí | El archivo de navegador del componente, con `need('gallery')`. | T-3 |
| `tests/field-markup.test.ts` | mod. | Un `kind` Select: React contra el canónico, y Astro contra React. | T-3 |
| `tests/lib/consumer.ts`, `tests/lib/field-a11y.ts`, `tests/field-a11y-select.test.ts` | mod. / mod. / sí | Las instancias en los consumidores, el `kind` Select y su archivo con `need('consumers')`. | T-4 |

**Archivos compartidos y quién los toca:**
- la hoja y la página fija: solo la T-1;
- `field.ts`: solo la T-2;
- el contrato, los `index`, las historias, `example-classes.ts` y `field-markup.test.ts`: solo la
  T-3;
- `consumer.ts` y `field-a11y.ts`: solo la T-4.

## 3. Lógica pura

Ninguna nueva: `options` y `astroCases` ya están (013); `fieldIds` gana el prefijo
`'museum-select'`.

## 4. Algoritmo

**Contrato** (`contracts/select.contract.json`, exacto):
```json
{
  "name": "Select",
  "props": {
    "label": { "type": "string", "required": true },
    "options": { "type": "options", "required": true },
    "hint": { "type": "string", "default": "" },
    "error": { "type": "string", "default": "" },
    "placeholder": { "type": "string", "default": "" },
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

**Marcado canónico:**
```html
<div class="museum-field">
  <label class="museum-field__label" for="ID">Label<span class="museum-field__required" aria-hidden="true">*</span></label>
  <select id="ID" class="museum-select museum-select--md [clase]" aria-describedby="ID-error ID-hint [consumidor]"
    aria-invalid="true" required disabled data-museum-select>
    <option value="" disabled selected>Placeholder</option>
    <option value="a">Option A</option>
    …
  </select>
  <p id="ID-hint" class="museum-field__hint">Hint</p>
  <p id="ID-error" class="museum-field__error">Error</p>
</div>
```
- La opción de la indicación solo existe si `placeholder` no está vacío.
- `selected` va en la opción de `defaultValue` si está en `options`; si no, en la indicación.
- `disabled` de una opción va en su `<option>`.

**React:**
- Si el consumidor pasa `value`, el componente no envía `defaultValue`.
- Si no, envía `defaultValue={defaultValue en options ? defaultValue : ''}`.
- No usa `selected` en los `<option>` (React avisa): el estado lo da `defaultValue`/`value` del
  `<select>`. `renderToStaticMarkup` escribe igualmente `selected` en la opción elegida, que es lo
  que compara el test de marcado.

**Astro:** escribe `selected` en el `<option>` que toca, con `fieldIds('museum-select', …)`.

**Hoja (T-1):**
- **Selectores agrupados:** `.museum-select` y `--sm/md/lg` se añaden a cada regla de
  `.museum-input`: borde, fondo, letra, `padding`, error, foco y `disabled`. No se copian
  declaraciones.
- **`.museum-select` añade:**
  - `appearance: none`;
  - `padding-right: calc(var(--museum-space-*-x) + 1.25em)`;
  - `text-overflow: ellipsis`, `overflow: hidden` y `white-space: nowrap`;
  - la flecha: `background-image` con dos `linear-gradient(45deg/-45deg, transparent 50%,
    var(--museum-select-arrow) 50%)`, con `background-position` y `background-size` fijos a la
    derecha.
- **Token nuevo**, en los tres bloques de tema: `--museum-select-arrow: var(--museum-control-fg)`.
- **Colores forzados:** `.museum-select` con `forced-color-adjust: none`, borde y flecha
  `CanvasText`, fondo `Canvas`, y el borde de error `CanvasText` (lección de la 012).

**Galería (T-3):**
- La historia React usa `argTypesFromContract` (`options` como control JSON, `placeholder` como
  texto), `label: 'Country'` y `exampleClasses.Select`, con `key` sobre `defaultValue`.
- La historia Astro tiene 10 casos. `Select.mdx` va en las dos lenguas.
- `tests/gallery-browser-select.test.ts` llama a
  `defineGalleryBrowser('Select', need('gallery').storybook)`.

**Consumidores (T-4):** `selectInstances` crea, con prefijo `select-`:
- los tres `size`;
- `hint`, `error`, `both` y `required` (con indicación);
- `disabled` con error, y una opción `disabled`;
- `selected` (con `defaultValue`), `placeholder`, `own` y una opción de 200 caracteres.

`field-a11y.ts` gana un `kind` Select:
- **RF-2 a RF-6:** como Input.
- **RF-7:** las opciones uno a uno.
- **RF-8 y RF-9:** el valor inicial.
- **RF-10 a RF-15:** la flecha se lee de su `background-image` calculado, y se mide contra el fondo
  del control.
- **RF-13:** la altura igual a la del Input del mismo `size`.
- **RF-16:** `ArrowDown` se salta la opción `disabled`.

## 5. Interfaz

- **Campo:** como Input, con una flecha a la derecha y el texto elegido.
- **Indicación:** su texto, en el color del placeholder de Input.
- **Error, obligatorio, `disabled` y temas:** como en la 009. Con colores forzados, borde y flecha
  en colores de sistema.
- **Lista desplegada:** la del navegador (escritorio y móvil).
- **Galería:** `Select/React`, `Select/Astro` (10 casos) y `Select/Documentation`; la matriz lo
  muestra en los dos frameworks.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **`<select>` nativo con `appearance: none`.** | Un listbox propio: JavaScript en Astro, y teclado, lector y móvil hechos a mano. |
| **La flecha con dos degradados de un token.** | Un SVG en `data:`: no lee un token. Un nodo hermano: más marcado y un elemento sobre el control que intercepta la pulsación. |
| **Los selectores de Select junto a los de Input.** | Copiar las reglas: dos copias que tienen que cambiar juntas. |
| **`placeholder` como un `<option value="" disabled>`.** | `hidden`: el lector de pantalla no lo leería en la lista. |
| **En React, `defaultValue` del `<select>`, sin `selected` en los `<option>`.** | `selected` en el `<option>`: React lo desaconseja y avisa. |
| **Contrato, dos frameworks e historias en una tarea (T-3).** | Repartirlos: el cruce de paquetes, la regla 5 y `projects.test.ts` quedarían en rojo entre olas. |

**Dependencias (regla 9).** Ninguna nueva.

**Commits:**
- **T-1:** `feat:` para la hoja, más los vacíos con scope de la sesión de git.
- **T-2:** `refactor(packages/astro)`.
- **T-3:** el contrato (`feat:`), `feat(packages/react)`, `feat(packages/astro)` y la galería
  (`docs:`).
- **T-4:** `test:`.

## 7. Estrategia de tests

- **Runner:** Vitest, con Edge vía `playwright-core`, en los proyectos `unit` y `e2e` de la 017.
- **Como dato:** el prefijo (T-2) y el marcado (T-3).
- **En Edge:** la página fija en los cinco modos de tema y con colores forzados (T-1), y los
  consumidores (T-4).
- **Sin aflojar:** cada tarea da el número de tests de los demás componentes antes y después.
- **Inyección por tarea:** su línea «Inyección:», en la rama del worktree; el commit dice cuál
  se vio en rojo (regla 8).
- **Trabajo visual:** capturas en los dos temas, más una con colores forzados, de la página fija
  (T-1) y de las historias (T-3), al coordinator antes del commit.
- **Antes de reportar:** el build de `packages/react`, `npm run gallery:astro`, los dos `tsc` y
  `npm test`. Las notas, en UTF-8 y CRLF.
- **Carga:** nunca más de dos tareas con `npm test` a la vez (017).
- **Proporción:** 4 tareas para 16 RF.
