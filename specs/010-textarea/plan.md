# Plan 010 — textarea

**Approved:** 2026-10-23 · el coordinator en modo autónomo

Parte de `spec.md` (aprobada, 11 RF) y de `notes.md` (decisiones del coordinator: `rows` atributo,
`resize` fijo en vertical, texto inicial por `value`). Se apoya en lo que dejó la 009 en
`spec/009-input`:
- `contracts/input.contract.json`, el formato de contrato con props de texto
  (`tests/lib/contract.ts`, `tests/lib/api.ts`) y `astroCases` sin `variant`;
- Input en `packages/react/src/Input/Input.tsx` y `packages/astro/src/Input/Input.astro`, con la
  lógica de campo escrita dentro de cada uno;
- la hoja del campo en `styles/museum.css` (`.museum-field*`, `.museum-input*`, tokens
  `--museum-control-*` y `--museum-field-*` en los tres bloques de tema);
- los tests de la 009: `input-markup.test.ts`, `input-styles.test.ts` (sobre
  `tests/fixtures/input-field.html`) e `input-a11y.test.ts` (sobre los consumidores, con
  `inputInstances` en `tests/lib/consumer.ts`);
- los tests de galería que ya recorren cada componente exportado con contrato, y
  `gallery/lib/example-classes.ts` como fuente única de clases de ejemplo.

Lecciones de la 009 que el plan aplica:
- **El cruce de paquetes** (`packages.test.ts`, `crossProblems`) exige que cada contrato tenga
  carpeta y export en **cada** paquete. Por eso el contrato y los dos Textarea van en la misma
  tarea, la T-3.
- **Los tests de galería generalizados** exigen historia y documentación en cuanto un componente
  se exporta. Por eso las historias van en la misma tarea que los exports, la T-3.
- La clase de ejemplo `my-textarea` la añade a `example-classes.ts` la tarea dueña de la historia,
  la T-3.
- El campo pinta su superficie, y los tests miden contra el fondo real compuesto.

## Decisiones tomadas en el plan (opción conservadora)

- **El ayudante de campo tiene su propia tarea (T-1), antes de Textarea.** Así se refactoriza
  Input con sus tests de marcado en verde, sin mezclarlo con un componente nuevo.
- **Clases propias de Textarea** (`museum-textarea`, `museum-textarea--<size>`,
  `data-museum-textarea`). La hoja comparte las reglas agrupando selectores con los de Input. Poner
  `museum-input` en un `<textarea>` haría que el CSS de un consumidor para inputs le llegara
  también al textarea.
- **Los tests de la 009 se generalizan a «campos»** (Input y Textarea), en vez de copiarse.
  - `input-markup.test.ts` pasa a `field-markup.test.ts`, `input-styles.test.ts` a
    `field-styles.test.ts` e `input-a11y.test.ts` a `field-a11y.test.ts`, con `git mv`.
  - Cada caso de Input se conserva tal cual; lo de Input solo (`type`, la altura igual a Button) se
    queda como caso de Input.
- **Un `value` que empieza por salto de línea** lo conserva el control en los dos frameworks. El
  HTML tira el primer salto tras `<textarea>`, y React lo compensa; Astro tiene que hacer lo mismo.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | `contracts/textarea.contract.json` y los dos Textarea (T-3); `contract.test.ts` y `packages.test.ts` ya recorren cada contrato. |
| RF-2 a RF-6 | El ayudante de campo (T-1) usado por Textarea (T-3); marcado en `field-markup.test.ts` (T-3) y navegador en `field-a11y.test.ts` (T-4). |
| RF-7, RF-8 | Selectores de Textarea en las reglas del campo (T-2); fijo en `field-styles.test.ts` (T-2), consumidores en `field-a11y.test.ts` (T-4). |
| RF-9 | Mismas reglas que Input por `size` (T-2); comparación de estilos calculados en T-2 (fijo) y T-4 (consumidores). |
| RF-10 | `resize: vertical` en `.museum-textarea` (T-2); `resize` calculado en T-2 y T-4. |
| RF-11 | `value` como contenido escapado en Astro y nativo en React (T-3); marcado en T-3, valor del control en T-4. |
| NFR | Galería por los tests generalizados (T-3); regla 2 por los consumidores (T-4); foco y `disabled` (T-4). |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad | Tarea |
|---|---|---|---|
| `packages/react/src/field.tsx` | sí | Ayudante interno, no exportado: `id` del control, `aria-describedby` (error, ayuda, los del consumidor) y el marcado de etiqueta, ayuda y error alrededor de un control. | T-1 |
| `packages/react/src/Input/Input.tsx` | mod. | Usa el ayudante; mismo marcado. | T-1 |
| `packages/astro/src/field.ts` | sí | Ayudante interno: `fieldIds(prefix, id, hint, error, describedBy)` con el contador en `globalThis` por prefijo. | T-1 |
| `packages/astro/src/Input/Input.astro` | mod. | Usa el ayudante; mismo marcado. | T-1 |
| `styles/museum.css` | mod. | Selectores de Textarea en las reglas del control; `resize: vertical`; sin tokens nuevos. | T-2 |
| `tests/fixtures/input-field.html` → `field.html` | mov. | El marcado canónico de los dos campos, con Button al lado. | T-2 |
| `tests/input-styles.test.ts` → `field-styles.test.ts` | mov. | RF-7, RF-8, RF-9 y RF-10 sobre la página fija, para Input y Textarea. | T-2 |
| `contracts/textarea.contract.json` | sí | El contrato (bloque 4). | T-3 |
| `packages/react/src/Textarea/Textarea.tsx`, `packages/react/src/index.ts` | sí / mod. | Textarea de React y su export. | T-3 |
| `packages/astro/src/Textarea/Textarea.astro`, `packages/astro/index.js`, `packages/astro/index.d.ts` | sí / mod. | Textarea de Astro y su export. | T-3 |
| `gallery/stories/Textarea.react.stories.tsx`, `Textarea.astro.stories.tsx`, `Textarea.mdx` | sí | Historia React con controles, 7 casos Astro, documentación en español e inglés. | T-3 |
| `gallery/lib/example-classes.ts` | mod. | Entrada `Textarea` (`my-textarea`). | T-3 |
| `tests/input-markup.test.ts` → `field-markup.test.ts` | mov. | Marcado de React contra el canónico y de Astro contra React, para los dos campos. | T-3 |
| `tests/lib/consumer.ts` | mod. | `textareaInstances` junto a `inputInstances`. | T-4 |
| `tests/input-a11y.test.ts` → `field-a11y.test.ts` | mov. | RF-2 a RF-11 y el foco en Edge sobre los consumidores, para los dos campos. | T-4 |

**Archivos compartidos y quién los toca:**
- `Input.tsx`, `Input.astro` y los dos ayudantes: solo la T-1.
- `styles/museum.css` y la página fija: solo la T-2.
- El contrato, los `index` de los dos paquetes, `example-classes.ts`, las historias y
  `field-markup.test.ts`: solo la T-3.
- `consumer.ts` y `field-a11y.test.ts`: solo la T-4.

## 3. Lógica pura

```ts
// packages/astro/src/field.ts — internal, not exported from the entry
fieldIds(prefix: 'museum-input' | 'museum-textarea', id: string | undefined, hint: string,
  error: string, describedBy: string | undefined): { controlId: string; hintId?: string; errorId?: string; describedBy?: string }
```

- `controlId` es `id` si viene, y si no, `<prefix>-<n>`, con un contador por prefijo en
  `globalThis` (el mismo mecanismo de la 009).
- `describedBy` es error, ayuda y los del consumidor, en ese orden; `undefined` si queda vacío.
- En React, `field.tsx` hace lo mismo con `useId()`, y además pinta el campo alrededor del
  control que recibe.

## 4. Algoritmo

**Contrato** (`contracts/textarea.contract.json`, exacto): el de Input sin `type`.
```json
{
  "name": "Textarea",
  "props": {
    "label": { "type": "string", "required": true },
    "hint": { "type": "string", "default": "" },
    "error": { "type": "string", "default": "" },
    "size": { "type": "enum", "values": ["sm", "md", "lg"], "default": "md" },
    "disabled": { "type": "boolean", "default": false },
    "required": { "type": "boolean", "default": false }
  },
  "events": [],
  "content": false,
  "classProp": true
}
```

**Marcado canónico:** el de la 009 con `<textarea>` en lugar de `<input>`.
```html
<div class="museum-field">
  <label class="museum-field__label" for="ID">Label<span class="museum-field__required" aria-hidden="true">*</span></label>
  <textarea id="ID" class="museum-textarea museum-textarea--md [clase]" aria-describedby="ID-error ID-hint [consumidor]"
    aria-invalid="true" required data-museum-textarea>VALUE</textarea>
  <p id="ID-hint" class="museum-field__hint">Hint</p>
  <p id="ID-error" class="museum-field__error">Error</p>
</div>
```

**`value` (RF-11):**
- En React, `value` y `defaultValue` son los nativos y pasan como atributos.
- En Astro, `value` se saca de los atributos y se escribe como contenido con `{value}`, que Astro
  escapa. Si empieza por salto de línea, se antepone otro, como hace React, porque el parser de
  HTML tira el primero.
- Sin `value`, el `<textarea>` va vacío.

**Hoja (T-2):**
- Cada regla de `.museum-input`, `--sm/md/lg`, `::placeholder`, `[aria-invalid="true"]`,
  `:focus-visible` y `:disabled` pasa a nombrar también su par `.museum-textarea…`. No se copian
  declaraciones.
- `.museum-textarea` añade `resize: vertical` y `display: block` (un `<textarea>` es `inline-block`
  y dejaría un hueco de línea).
- No hay tokens nuevos.

**Galería (T-3):** las historias y el MDX siguen a los de Input:
- historia React con `argTypesFromContract`, `label: 'Message'` (distinto de `exampleText`) y la
  clase de `exampleClasses.Textarea`;
- historia Astro con los 7 casos (`default`, `size-sm`, `size-lg`, `hint`, `error`, `disabled`,
  `required`);
- `Textarea.mdx` en las dos lenguas, con `rows`, `resize` y `value` explicados en «cómo se usa».

**Consumidores (T-4):** `textareaInstances` repite las de Input con prefijo `textarea-`:
- tres `size`, con `value` y `placeholder`;
- `hint`, `error`, `both`, `required` y `disabled` con error;
- las gemelas y `own`;
- más dos propias: `textarea-escape`, con `value="<b>&amp;\nline 2"`, y `textarea-newline`, con un
  `value` que empieza por salto de línea.

`field-a11y.test.ts` recorre `['input', 'textarea']` con los casos de la 009. Para Textarea añade:
- **RF-9:** fuente, borde, radio, `padding` y colores calculados iguales a los del Input del mismo
  `size`;
- **RF-10:** `resize` calculado `vertical`;
- **RF-11:** el `value` del control es el texto exacto, sin etiquetas interpretadas y con el salto
  inicial.

## 5. Interfaz

- **Campo:** igual que Input. Etiqueta arriba, control de varias líneas, ayuda y error debajo,
  sobre la superficie del campo.
- **Tamaño:** el alto inicial lo dan las filas (`rows`, 2 por defecto en el navegador). El usuario
  lo agranda en vertical; el ancho no cambia.
- **Error, obligatorio, `disabled`, temas:** como en la 009.
- **Galería:** `Textarea/React`, `Textarea/Astro` (7 casos) y `Textarea/Documentation`; la matriz
  muestra Textarea en los dos frameworks.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **Ayudante de campo en su propia tarea, antes de Textarea**, vigilado por los tests de marcado de la 009. | Escribir Textarea copiando Input: dos copias de la lógica de `id` y ARIA que tendrían que cambiar juntas. |
| **Ayudantes como archivos en la raíz de `src/`** (`field.tsx`, `field.ts`), no en una carpeta. | Una carpeta `src/Field/`: el test de la regla 3 la contaría como componente sin export. |
| **Contrato, dos frameworks e historias en una tarea (T-3).** | Repartirlos en dos olas: entre una y otra quedan en rojo el cruce de paquetes y la regla 5 (pasó en la 009). |
| **Clases propias y selectores agrupados.** | `museum-input` en el `<textarea>`: el CSS de un consumidor para inputs le alcanzaría. |
| **Generalizar los tests de la 009 a campos, con `git mv`.** | Tres archivos `textarea-*.test.ts` copiados: duplicación que tiene que cambiar junta. |

**Dependencias (regla 9).** Ninguna nueva.

**Commits y scope:**
- La T-1 hace `refactor(packages/react)` y `refactor(packages/astro)`.
- La T-2 hace un `feat:` sin scope (`styles/`) y su test.
- La T-3 hace el contrato (`feat:`), `feat(packages/react)`, `feat(packages/astro)` y la galería
  (`docs:`).
- La T-4 hace un `test:`.

## 7. Estrategia de tests

- **Runner:** Vitest, con Edge real vía `playwright-core`.
- **Como dato:** `fieldIds` y el marcado de React y de Astro (T-1, T-3).
- **En Edge:** la página fija (T-2) y los consumidores (T-4).
- **Sin aflojar Input:** cada test de Input de la 009 sigue existiendo con el mismo nombre de caso
  dentro del archivo generalizado; cada tarea da el número de tests de Input antes y después.
- **Inyección por tarea:** cada tarea tiene su línea «Inyección:», en la rama de su worktree, y su
  commit dice cuál se vio en rojo (regla 8).
- **Trabajo visual:** la T-2 (página fija) y la T-3 (historias y documentación) enseñan capturas en
  los dos temas al coordinator antes del commit.
- **Antes de reportar:** el build de `packages/react`, `npm run gallery:astro`, los dos `tsc` y
  `npm test`.
- **Proporción:** 4 tareas para 11 RF.
