# Plan 007 — pulido-galeria

**Approved:** 2026-10-22 · el dueño; si la T-6 necesita tocar preview.ts, para y pasa a la ola 2

Parte de `spec.md` (aprobada, 7 RF) y de `notes.md`. Se apoya en lo que dejó la entrega 2:
- el Storybook construido en el `globalSetup` y servido en los tests (`serve.ts`), con Edge y
  `closeBrowserAndServers` de `tests/lib/browser.ts`, como en `gallery-theme.test.ts`;
- `gallery/lib/contract-args.ts`, que deriva los controles del contrato;
- `gallery/lib/Lang.tsx`, el selector de idioma;
- `gallery/.storybook/preview.ts`, con el global `theme` y su decorador.

Comprobado en el Storybook instalado (`gallery/node_modules/storybook`, 10.6.3):
- `features` admite `backgrounds`, `measure` y `outline`; «Grid visibility» viene de
  `backgrounds`.
- `storybook/theming` exporta `themes` y `getPreferredColorScheme`.
- `storybook/internal/components` exporta `SyntaxHighlighter`, con la opción `copyable`.

## Decisiones del dueño (`notes.md`)

- Los imports de cada caso Astro se mantienen (004, RF-7).
- Las descripciones de las props irán en otra spec.
- Se quitan las cuatro herramientas de la barra.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | `argTypesFromContract` añade `table.defaultValue` desde el contrato; test en Edge sobre la tabla de la página de documentación. |
| RF-2 | `Lang.tsx`: botones con la fuente y el color de la página, borde fino de `currentColor`; test de fuente, borde y contraste en los dos temas. |
| RF-3 | El botón activo lleva `aria-pressed` y un fondo propio; test en los dos temas y las dos lenguas. |
| RF-4 | `features: { backgrounds: false, measure: false, outline: false }` en `main.ts`; test sobre la barra del gestor. |
| RF-5 | Un contenedor de documentación que elige `themes.dark` o `themes.light` según el global `theme` y, con «Sistema», según `prefers-color-scheme`; test de fondo y contraste. |
| RF-6 | Cada caso Astro pinta su código con `SyntaxHighlighter` (`language="astro"`, `copyable`); test con permiso de portapapeles. |
| RF-7 | CSS de la galería que corrige el elemento que desborde; test con barra de scroll clásica a 320 y a 542 px. |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad |
|---|---|---|
| `gallery/lib/contract-args.ts` | modificado | Cada control lleva su default del contrato (`table.defaultValue.summary`): una sola fuente, nada retecleado. |
| `tests/contract-args.test.ts` | modificado | Los defaults como dato. |
| `gallery/lib/Lang.tsx` | modificado | Estilo de los botones del selector y del activo. |
| `gallery/.storybook/main.ts` | modificado | Quita las herramientas de la barra. |
| `gallery/.storybook/preview.ts` | modificado | El tema de la página de documentación (`parameters.docs.container`), sin JSX. |
| `gallery/stories/Button.astro.stories.tsx` | modificado | El código de cada caso, con resaltado y botón de copiar. |
| `gallery/.storybook/preview-head.html` | sí | El CSS que corrige el desborde, si sale de Storybook (RF-7). |
| `tests/gallery-props.test.ts` | sí | RF-1. |
| `tests/gallery-lang.test.ts` | sí | RF-2 y RF-3. |
| `tests/gallery-toolbar.test.ts` | sí | RF-4. |
| `tests/gallery-docs-theme.test.ts` | sí | RF-5. |
| `tests/gallery-astro-code.test.ts` | sí | RF-6. |
| `tests/gallery-overflow.test.ts` | sí | RF-7. |

**Archivos compartidos:** cada uno lo toca una sola tarea.
- `preview.ts`: solo la T-4.
- `main.ts`: solo la T-3.
- El desborde va a un archivo nuevo, `preview-head.html`, para no tocar `preview.ts`.

## 3. Lógica pura

```ts
// El default de cada prop del contrato, como lo escribe la tabla: 'primary', 'md', 'button', 'false'.
defaultSummary(spec: PropSpec): string
// La preferencia efectiva de la página: el global si es 'light' o 'dark'; si no, la del sistema.
docsScheme(global: unknown, prefersDark: boolean): 'light' | 'dark'
```

`contrastRatio` y `parseRgb` ya existen en `tests/lib/css.ts`.

## 4. Algoritmo

**Defaults (RF-1).** `argTypesFromContract` añade a cada prop
`table: { defaultValue: { summary: defaultSummary(spec) } }`, leído del contrato. La historia no
escribe ningún default. El test abre `iframe.html?viewMode=docs&id=button-documentation--docs`,
espera a que la tabla deje de mostrar el esqueleto de carga y lee la columna de defaults de cada
fila.

**Selector de idioma (RF-2, RF-3).** Los botones heredan la fuente y el color de la página
(`font: inherit`, `color: inherit`), con `border: 1px solid currentColor` y fondo transparente. El
activo tiene `aria-pressed="true"` y un fondo de `currentColor` al 15 % de opacidad (`color-mix`),
más `font-weight: 600`. El test mide en los dos temas de la página (los de RF-5):
- la `font-family` es la del cuerpo de la documentación;
- el `border-style` no es `outset`;
- el contraste del texto contra el fondo efectivo es ≥ 4.5:1;
- el fondo del activo es distinto del otro.

Lo repite con «English» activo.

**Barra (RF-4).** `main.ts` añade `features: { backgrounds: false, measure: false, outline: false }`.
El test abre el `index.html` del Storybook construido y busca los botones por nombre accesible:
- faltan «Preview background», «Grid visibility», «Measure tool» y «Outline tool»;
- está «Tema de la galería».

**Tema de la página (RF-5).** `preview.ts` define `parameters.docs.container`: un componente, con
`createElement`, que envuelve el `DocsContainer` de `@storybook/addon-docs/blocks` y le pasa
`theme={docsScheme(...) === 'dark' ? themes.dark : themes.light}`.
- El global sale del contexto de la documentación; la T-4 lo comprueba antes de nada y, si no se
  puede leer ahí, para y vuelve al plan.
- Con «Sistema», la preferencia se lee con `matchMedia('(prefers-color-scheme: dark)')`.
- Sin preferencia del sistema, la página va clara.

El test usa `globals=theme:dark`, `theme:light` y `theme:system` con emulación oscura y clara, y
comprueba dos cosas: que el fondo de `.sbdocs-wrapper` es oscuro o claro (luminancia), y que el
texto de un párrafo contrasta ≥ 4.5:1 con él.

**Código de Astro (RF-6).** El `<pre>` de cada caso pasa a
`createElement(SyntaxHighlighter, { language: 'astro', copyable: true }, usage)`, de
`storybook/internal/components`, el mismo componente que usa el bloque `Source`. Los imports de
cada caso se mantienen (decisión del dueño). El test:
1. Da permiso de portapapeles al contexto de Edge
   (`grantPermissions(['clipboard-read', 'clipboard-write'], { origin })`).
2. Por caso, comprueba que hay marcas de resaltado (`span` con clase dentro del código).
3. Pulsa su botón de copiar y compara `navigator.clipboard.readText()` con el `usage` del JSON de
   la 004.

Si `SyntaxHighlighter` no se puede usar desde la historia, la tarea para y vuelve al plan: no se
añade ninguna dependencia.

**Desborde (RF-7).** El test lanza Edge sin `--hide-scrollbars`
(`ignoreDefaultArgs: ['--hide-scrollbars']`), porque Playwright oculta las barras de scroll por
defecto y así no se vería el fallo. Abre la página de documentación y las dos historias a 320 y a
542 px, y comprueba `scrollWidth ≤ clientWidth` en el documento.
- La tarea empieza localizando el elemento que se sale.
- Si es de Storybook, el arreglo es CSS en `preview-head.html` (por ejemplo, `max-width: 100%` o
  `overflow-x: auto` en ese elemento).
- Si es de la galería, se arregla en su archivo.

## 5. Interfaz

- **Tabla de props:** muestra `primary`, `md`, `button` y `false` como defaults; la columna de
  descripción sigue vacía (otra spec).
- **Selector de idioma:** dos botones con el aspecto de la página; el activo, con fondo tenue y en
  negrita.
- **Barra:** recarga, tamaño de viewport, «Tema de la galería», zoom y abrir en aislamiento; sin
  fondos, rejilla, medir ni contornos.
- **Tema:** la página de documentación es oscura con «Oscuro», o con «Sistema» y el sistema en
  oscuro. El gestor de Storybook conserva su propio tema.
- **Astro:** cada caso, con su código resaltado y un botón «Copy».
- **Estados vacíos:** sin permiso de portapapeles, el botón de copiar no rompe la página y el código
  sigue a la vista.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **Defaults en `argTypesFromContract`**, leídos del contrato. | Escribirlos en la historia: un segundo origen que se desincroniza del contrato. |
| **`features` de Storybook** para quitar las herramientas. | Ocultarlas con CSS del gestor: frágil ante cambios de la interfaz de Storybook. |
| **`DocsContainer` con los temas de `storybook/theming`**, elegidos por el global de la galería. | Un tema fijo en `parameters.docs.theme`: no sigue al selector ni a «Sistema». |
| **`SyntaxHighlighter` de `storybook/internal/components`**, que resalta y copia. Es la ruta interna que usa el bloque `Source`, así que puede cambiar en una versión menor; si pasa, el test de RF-6 se pone en rojo. | El bloque `Source`: necesita el contexto de la página de documentación y no se pinta dentro de una historia. Un resaltador propio: sería una dependencia nueva (regla 9). |
| **El arreglo del desborde en un `preview-head.html` nuevo.** | Ponerlo en `preview.ts`: compartiría archivo con la T-4. |
| **Un archivo de test por RF o par de RF**, para que las tareas no compartan archivos. | Un solo `gallery-polish.test.ts`: lo tocarían todas las tareas. |

**Dependencias (regla 9).** Ninguna nueva: todo viene de Storybook 10.6.3 y de `@storybook/addon-docs`,
ya instalados.

## 7. Estrategia de tests

- **Como dato:** `defaultSummary` y `docsScheme`.
- **En Edge, sobre el Storybook construido:** RF-1 a RF-7, en los dos temas cuando el RF lo pide.
  Se reutilizan `closeBrowserAndServers` y `contrastRatio`.
- **RF-6:** con permiso de portapapeles.
- **RF-7:** sin `--hide-scrollbars`.
- **Inyección por tarea:** cada tarea tiene su línea «Inyección:», en la rama de su worktree, y su
  commit dice cuál se vio en rojo (regla 8).
- **Trabajo visual (`AGENTS.md`):** el selector de idioma y el tema de la página se enseñan al
  dueño en los dos temas, y se espera su aprobación antes del commit.
- **Proporción:** 6 tareas para 7 RF.
