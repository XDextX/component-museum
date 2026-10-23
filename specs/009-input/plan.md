# Plan 009 — input

**Approved:** 2026-10-23 · el coordinator en modo autónomo; el npm test de la ola 2 se pasa tras la ola 3 (sin Input de Astro, la regla 3/4 del paquete Astro puede ir en rojo)

Parte de `spec.md` (aprobada, 10 RF) y de `notes.md` (lista, decisiones y entrega 4). Se apoya en:
- el contrato de la 002: `contracts/*.contract.json`, `tests/lib/contract.ts` (`expectedApi`,
  `problems`), `tests/lib/api.ts` (`declaredProps`, `diffApi`) y `tests/contract.test.ts`;
- la hoja única de la 003, `styles/museum.css`: capa `components.museum`, tokens `--museum-*` y
  tema oscuro escrito dos veces (en `@media` y en `[data-theme="dark"]`);
- la galería de la 004/005: `gallery/lib/contract-args.ts`, `gallery/scripts/extract-astro.mjs`,
  `gallery/astro-render/src/pages/index.astro` y las historias de Button;
- los consumidores externos de la 001/002 (`tests/lib/consumer.ts`), donde `a11y.test.ts` mide
  Button con `Tab` real en Edge.

Comprobado en el código (`main` 9c51a98):
- el formato de contrato solo admite `enum` y `boolean` (`tests/lib/contract.ts:5-7`, copiado en
  `gallery/lib/contract-args.ts:3-5`);
- `astroCases` solo sabe de `variant` (`contract-args.ts`), y `extract-astro.mjs` lee
  `button.contract.json` y extrae un `<button>`;
- los tests de galería cargan `button.contract.json` y las rutas de Button a mano:
  `gallery.test.ts`, `gallery-browser.test.ts`, `snippets.test.ts`, `gallery-i18n.test.ts` y
  `gallery-overflow.test.ts`; también `contract.test.ts` (`impls`). `matrix.ts` y `Matrix.mdx` ya
  son genéricos.

## Decisiones tomadas en el plan (opción conservadora, `notes.md`)

- La prop de clase y los atributos HTML van al `<input>`, como en Button van al `<button>`; el
  envoltorio del campo no se personaliza (fuera de alcance).
- Sin `aria-live` en el error: es texto estático, descrito por `aria-describedby`.
- Input no declara eventos propios (`events: []`): `onChange`/`onInput` en React y `input`/`change`
  en Astro son los nativos, y pasan como atributos.
- Button conserva todo lo que se le exige hoy. Los tests generalizados añaden comprobaciones
  comunes a cada contrato; ninguna comprobación de Button se quita ni se afloja.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | Formato de contrato con `string` (T-1); `contracts/input.contract.json` y las dos implementaciones (T-4, T-5); `contract.test.ts` recorre cada contrato. |
| RF-2 | `id` propio o del consumidor, `<label for>` (T-4, T-5); test en Edge sobre los consumidores (T-6). |
| RF-3 | `aria-describedby` con el `id` de la ayuda (T-4, T-5); test T-6. |
| RF-4 | `aria-invalid="true"` y el `id` del error en la descripción (T-4, T-5); test T-6. |
| RF-5 | Sin `error`: ni atributo ni nodo de error (T-4, T-5); test T-6. |
| RF-6 | `required` nativo y marcador `*` oculto a la lectura (T-4, T-5); test T-6. |
| RF-7 | Tokens de borde en los dos temas (T-2); test sobre página fija (T-2) y sobre consumidores (T-6). |
| RF-8 | Tokens de texto (T-2); los mismos tests de RF-7. |
| RF-9 | Mismo `font-size`, `line-height`, `padding` vertical y borde que Button por `size` (T-2); tests T-2 y T-6. |
| RF-10 | Tests de galería por contrato (T-3); historias y docs de Input (T-4 React y MDX, T-5 Astro). |
| NFR | Foco y `disabled` con `Tab` real (T-6); regla 2 con los consumidores (T-6); idiomas (T-3, T-4). |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad | Tarea |
|---|---|---|---|
| `tests/lib/contract.ts` | mod. | Formato de contrato con props de texto (opcionales con `default`, u obligatorias); `expectedApi` las traduce a `'string'` y marca la obligatoria. | T-1 |
| `tests/lib/api.ts` | mod. | `declaredProps` reconoce `string` y si una prop es opcional; `diffApi` compara las dos cosas. | T-1 |
| `tests/contract.test.ts` | mod. | Recorre cada contrato y cada framework donde exista su carpeta; Button sigue con sus casos exactos. | T-1 |
| `gallery/lib/contract-args.ts` | mod. | Control `text` para `string`; `defaultSummary`; `usageSnippet` con `label="…"`; `astroCases` para contratos sin `variant`; textos de ejemplo. | T-1 |
| `tests/contract-args.test.ts` | mod. | Lo anterior, como dato, con un contrato en memoria. | T-1 |
| `styles/museum.css` | mod. | Tokens de campo en los tres bloques de tema y reglas `.museum-field*` e `.museum-input*`. | T-2 |
| `tests/fixtures/input-field.html` | sí | El marcado canónico del campo (bloque 4), con Button al lado, para medir la hoja sin paquetes. | T-2 |
| `tests/input-styles.test.ts` | sí | RF-7, RF-8, RF-9 y los tokens sobre la página fija, en los dos temas. | T-2 |
| `gallery/scripts/extract-astro.mjs` | mod. | Un JSON por contrato con implementación Astro (`generated/astro-<name>.json`). | T-3 |
| `gallery/astro-render/src/pages/index.astro` | mod. | Pinta los casos de cada componente exportado por el paquete Astro. | T-3 |
| `gallery/stories/Button.astro.stories.tsx` | mod. | Solo la ruta del JSON generado. | T-3 |
| `tests/lib/gallery-pages.ts` | sí | Por contrato y framework: título de historia, `id` de Storybook, archivos de historia y de docs. | T-3 |
| `tests/gallery.test.ts`, `tests/snippets.test.ts`, `tests/gallery-browser.test.ts`, `tests/gallery-i18n.test.ts`, `tests/gallery-overflow.test.ts` | mod. | Recorren cada componente exportado con contrato; las comprobaciones de Button se mantienen. | T-3 |
| `contracts/input.contract.json` | sí | El contrato de Input (bloque 4). | T-4 |
| `packages/react/src/Input/Input.tsx` | sí | Input de React: `useId`, etiqueta, ayuda, error y atributos ARIA. | T-4 |
| `packages/react/src/index.ts` | mod. | Exporta `Input` y sus tipos. | T-4 |
| `gallery/stories/Input.react.stories.tsx` | sí | Historia de React con controles del contrato. | T-4 |
| `gallery/stories/Input.mdx` | sí | Documentación en español y en inglés: uso, construcción, modificación y tokens. | T-4 |
| `tests/input-markup.test.ts` | sí | Marcado de React (`renderToStaticMarkup`) contra el canónico; con Astro, desde la T-5. | T-4, T-5 |
| `packages/astro/src/Input/Input.astro` | sí | Input de Astro, sin `<script>`, con `id` por contador. | T-5 |
| `packages/astro/index.js`, `packages/astro/index.d.ts` | mod. | Exportan `Input`. | T-5 |
| `gallery/stories/Input.astro.stories.tsx` | sí | Casos prerenderizados con su código, como Button. | T-5 |
| `tests/lib/consumer.ts` | mod. | Cada consumidor pinta también las instancias de Input (bloque 4). | T-6 |
| `tests/input-a11y.test.ts` | sí | RF-2 a RF-9 y el foco, en Edge sobre los consumidores de los dos frameworks y los dos temas. | T-6 |

**Archivos compartidos y quién los toca:**
- `gallery/lib/contract-args.ts`: solo la T-1.
- `styles/museum.css`: solo la T-2.
- Los tests de galería, `extract-astro.mjs` y `index.astro`: solo la T-3.
- `contracts/input.contract.json`, `packages/react/src/index.ts` e `Input.mdx`: solo la T-4.
- Los `index` de Astro: solo la T-5.
- `tests/lib/consumer.ts`: solo la T-6.
- `tests/input-markup.test.ts` lo crea la T-4 y lo amplía la T-5, que va en una ola posterior.

## 3. Lógica pura

```ts
// tests/lib/contract.ts
type PropSpec =
  | { type: 'enum'; values: string[]; default: string }
  | { type: 'boolean'; default: boolean }
  | { type: 'string'; default: string }
  | { type: 'string'; required: true };
type Api = Record<string, string[] | 'boolean' | 'string' | 'any' | 'string!'>; // 'string!' = obligatoria
expectedApi(contract: Contract, framework: Framework): Api

// gallery/lib/contract-args.ts
defaultSummary(spec: PropSpec): string | undefined   // '""' para '' ; undefined si es obligatoria
exampleText(prop: string): string                     // 'Label', 'Hint', 'Error': nombre con mayúscula
astroCases(contract: Contract): { id: string; props: Record<string, unknown> }[]
```

`astroCases`:
- **Con `variant`:** igual que hoy, cada variante en normal y en `disabled` (Button no cambia).
- **Sin `variant`:** un caso `default` con las obligatorias rellenas, más un caso por cada valor
  que no sea el default de cada prop:
  - cada valor de un `enum` distinto del default (`type-email`, `size-sm`…);
  - `true` en cada `boolean` (`disabled`, `required`);
  - el texto de ejemplo en cada `string` opcional (`hint`, `error`).
- Para Input salen 13 casos: `default`, 6 de `type`, 2 de `size`, `hint`, `error`, `disabled` y
  `required`. Es la lectura literal de la regla 5, «cada variante del contrato», y se elige por
  conservadora.

## 4. Algoritmo

**Contrato de Input** (`contracts/input.contract.json`, exacto):
```json
{
  "name": "Input",
  "props": {
    "label": { "type": "string", "required": true },
    "hint": { "type": "string", "default": "" },
    "error": { "type": "string", "default": "" },
    "type": { "type": "enum", "values": ["text", "email", "password", "search", "tel", "url", "number"], "default": "text" },
    "size": { "type": "enum", "values": ["sm", "md", "lg"], "default": "md" },
    "disabled": { "type": "boolean", "default": false },
    "required": { "type": "boolean", "default": false }
  },
  "events": [],
  "content": false,
  "classProp": true
}
```

**Marcado canónico** (los dos frameworks lo emiten igual; `ID` es el `id` del control):
```html
<div class="museum-field">
  <label class="museum-field__label" for="ID">Label<span class="museum-field__required" aria-hidden="true">*</span></label>
  <input id="ID" class="museum-input museum-input--md [clase del consumidor]" type="text"
    aria-describedby="ID-error ID-hint [los del consumidor]" aria-invalid="true" required data-museum-input />
  <p id="ID-hint" class="museum-field__hint">Hint</p>
  <p id="ID-error" class="museum-field__error">Error</p>
</div>
```
- El marcador `*` solo existe con `required`.
- La ayuda y el error solo existen con texto.
- `aria-describedby` solo existe si hay algo que describir. Lleva primero el error, luego la ayuda
  y al final los `id` del consumidor.
- `aria-invalid` solo existe con `error`.
- Los atributos libres van primero, y los del componente ganan si chocan (002, RF-11). La
  excepción es `id`: si el consumidor pasa uno, es el del control.
- **`id`.** En React, `useId()`. En Astro, un contador del módulo (`museum-input-<n>`), nunca
  `Math.random()`: es reproducible build a build, y es único por página porque cada render lo
  incrementa.

**Hoja (T-2).** Tokens nuevos, en los tres bloques de tema:
- `--museum-control-bg` (la superficie);
- `--museum-control-fg`;
- `--museum-control-border`;
- `--museum-control-placeholder`;
- `--museum-field-label`;
- `--museum-field-hint`;
- `--museum-field-error`, que también es el borde en error.

Más un token fijo, `--museum-font-weight-regular: 400`. Reglas:
- `.museum-field`: rejilla en columna con `gap` de `var(--museum-space-sm-y)` y
  `font-family: var(--museum-font-family)`.
- `.museum-input--sm/md/lg`: el mismo `padding` vertical, `font-size`, `line-height` y borde que
  `.museum-button--sm/md/lg`, que es lo que iguala las alturas (RF-9). El `padding` horizontal es
  el `space-*-x` de cada tamaño.
- `.museum-input[aria-invalid="true"]`: el borde pasa a `--museum-field-error`.
- `.museum-input:focus-visible`: el mismo anillo de dos tonos de Button (003).
- `.museum-input:disabled`: la opacidad de `--museum-disabled-opacity`, como Button, solo en el
  control; la etiqueta, la ayuda y el error no se atenúan, para que el error de un campo
  `disabled` mantenga los 4.5:1.
- `.museum-field__hint` y `.museum-field__error`: `overflow-wrap: anywhere`, para que un error
  largo no ensanche el campo.

Los colores se eligen para cumplir 4.5:1 (texto) y 3:1 (borde) contra `--museum-surface` en los
dos temas; el test los mide y la T-2 los ajusta hasta el verde.

**Galería (T-3).** `tests/lib/gallery-pages.ts` da, por cada contrato exportado por un framework,
el título (`<Name>/React`, `<Name>/Astro`), el `id` de Storybook (`<name>-react--default`,
`<name>-astro--variants`, `<name>-documentation--docs`) y los archivos de historia y de docs.
- Los tests de galería recorren esa lista.
- Las comprobaciones de Button quedan como un caso con nombre: el `<button>` exacto,
  `museum-button--<variant>` y los 6 casos.
- La comprobación común a todos: cada caso Astro tiene `museum-<name>` en su HTML, nombre
  accesible y su código de uso, y cada historia React pinta `[data-museum-<name>]` con las props
  del contrato.
- `extract-astro.mjs` recorre los contratos que exporta el paquete Astro, quita los `<script>` del
  HTML de cada caso y escribe `generated/astro-<name>.json`; cuenta los casos contra
  `astroCases`, y para Button, además, contra variante × 2.
- `index.astro` importa cada componente del paquete por su especificador y pinta
  `case-<name>-<id>`.

**Historias (T-4, T-5).** Input sigue el patrón de Button:
- historia React con `argTypesFromContract` y args de ejemplo para `label`;
- historia Astro con los 13 casos y su `SyntaxHighlighter` copiable (007, 008);
- `Input.mdx` en las dos lenguas con `LanguageSwitch`: uso, cómo está construido (marcado
  canónico), cómo modificarlo (tokens y prop de clase) y el import completo (regla 2).

**Consumidores (T-6).** `consumer.ts` añade, a cada consumidor, estas instancias de Input:
- una por `size`, con `value` y `placeholder` para medir los dos textos;
- `input-hint`, `input-error`, `input-both` (con ayuda y error), `input-required`, e
  `input-disabled` con error (caso límite de la spec: el error mantiene su contraste);
- `input-twins-a` e `input-twins-b`, con la misma etiqueta;
- `input-own`, con `id` y `aria-describedby` propios.

`input-a11y.test.ts` las abre en Edge, en los dos frameworks y los dos temas:
- **RF-2:** `getByLabel` encuentra cada control, y pulsar la etiqueta lo enfoca, también en las
  gemelas.
- **RF-3 y RF-4:** la descripción accesible (`aria-describedby` resuelto a texto) contiene la
  ayuda y el error, en ese orden en `input-both`.
- **RF-5:** sin `aria-invalid`.
- **RF-6:** `required` y el marcador visible.
- **RF-7:** el borde ≥ 3:1 contra el fondo compuesto, en reposo y en error.
- **RF-8:** cada texto ≥ 4.5:1, con `visibleTexts` de la 008 y el placeholder medido aparte.
- **RF-9:** la altura del Input igual a la del Button del mismo `size`.
- **Foco:** con `Tab` real, el anillo ≥ 3:1, y el `disabled` no se alcanza.

## 5. Interfaz

- **Campo en reposo:** la etiqueta arriba, el control debajo, con borde visible, y la ayuda debajo
  en un tono más suave.
- **Con error:** el borde del color de error y el texto del error bajo el control. El error no
  depende solo del color: su texto está siempre.
- **Obligatorio:** `*` tras la etiqueta; el lector de pantalla dice «obligatorio» por el `required`
  nativo.
- **`disabled`:** el campo atenuado como Button, fuera del orden de `Tab`.
- **Sin ayuda ni error:** solo la etiqueta y el control, sin huecos vacíos.
- **Temas:** claro y oscuro; los tokens cambian en los tres bloques de tema.
- **Galería:** `Input/React` con controles (`label`, `hint` y `error` como texto), `Input/Astro`
  con 13 casos y `Input/Documentation`; la matriz muestra Input en los dos frameworks.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **Etiqueta, ayuda y error dentro de cada control** (decidido, `notes.md`). | Un `Field` exportado: en Astro dejaría el `id` en manos del consumidor (el fallo de `legacy`). |
| **Props de texto en el formato del contrato**, con `required` para la obligatoria. | Tratar `label` como contenido (slot o `children`): en Astro el slot no se puede leer como texto para la etiqueta sin parsear HTML. |
| **`id` por contador en Astro.** | `Math.random()` (`legacy`): no se puede reproducir. Un hash de las props: dos campos iguales colisionan. |
| **`astroCases` genérico para contratos sin `variant`**, Button intacto. | Un campo `cases` en el contrato: amplía el formato por la galería, y el contrato es de los paquetes. |
| **Tests de galería por contrato y framework, desde las entradas** (`gallery-pages.ts`). | Copiar cada test para Input: dos copias que hay que cambiar juntas, y no se cumpliría el check de RF-10. |
| **Página fija con el marcado canónico para la hoja** (T-2), en paralelo con el contrato. | Esperar a los paquetes para medir la hoja: alarga la cadena una ola entera. |
| **React (T-4) antes que Astro (T-5), en olas distintas**, con el contrato en la T-4. | Las dos en paralelo con el mismo contrato en dos ramas: el mismo archivo añadido dos veces, y un cambio en una rama rompería el merge. |

**Dependencias (regla 9).** Ninguna nueva.

**Commits y scope (`AGENTS.md`).**
- La T-4 hace tres commits:
  - el contrato, `feat: add the Input contract (spec 009)`, que no está en ningún paquete;
  - `feat(packages/react): add Input (spec 009)`;
  - la historia y el MDX, `docs:`.
- La T-5 hace `feat(packages/astro): add Input (spec 009)` y su historia.
- La T-2 toca `styles/`, que se copia en los dos paquetes al empaquetar: va en un commit `feat:`
  sin scope, y la versión de los dos paquetes sube con los commits con scope de la T-4 y la T-5,
  dentro de la misma entrega.

## 7. Estrategia de tests

- **Runner:** Vitest (`package.json`), con Edge real vía `playwright-core`; `npm test` encadena
  las comprobaciones de tipos.
- **Como dato:** `expectedApi` y `diffApi` con `string`, `astroCases`, `defaultSummary`,
  `usageSnippet` y `exampleText` (T-1); `gallery-pages` (T-3); el marcado de React (T-4) y el de
  Astro contra el de React (T-5).
- **En Edge:** la hoja sobre la página fija (T-2); las historias generalizadas (T-3); RF-2 a RF-9 y
  el foco sobre los consumidores construidos (T-6).
- **Sin aflojar Button:** antes y después de la T-1 y la T-3, el número de tests de Button es el
  mismo o mayor; cada tarea lo dice en su informe.
- **Inyección por tarea:** cada tarea tiene su línea «Inyección:», en la rama de su worktree, y su
  commit dice cuál se vio en rojo (regla 8).
- **Trabajo visual (`AGENTS.md`):** la T-2 (hoja), la T-4 (historia React y docs) y la T-5
  (historia Astro) enseñan capturas en los dos temas al coordinator, que las aprueba antes del
  commit.
- **Antes de reportar:** los dos `tsc` (`tsc --noEmit` y `tsc --noEmit -p gallery`) y `npm test`.
- **Proporción:** 6 tareas para 10 RF.
