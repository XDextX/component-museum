# Plan 008 — pulido-historias

**Approved:** 2026-10-22 · el dueño

Parte de `spec.md` (aprobada, 4 RF) y de `notes.md`. Se apoya en lo que dejó la 007:
- el Storybook construido en el `globalSetup` y servido en los tests (`serve.ts`), con Edge y
  `closeBrowserAndServers` de `tests/lib/browser.ts`;
- `gallery/.storybook/preview.ts`, con el decorador `withTheme`, `docsScheme` y
  `ThemedDocsContainer`;
- `gallery/.storybook/preview-head.html`, con el CSS de desborde de la 007 (T-6);
- `gallery/stories/Button.astro.stories.tsx`, con `SyntaxHighlighter` copiable (007, RF-6);
- `tests/gallery-docs-theme.test.ts`, que mide el contraste de todo texto visible de una página.

Comprobado en el Storybook en marcha y en el instalado (10.6.3):
- en la vista de historia, el primer hijo de `#storybook-root` es el `div` del decorador, y el
  `body` lleva `sb-main-padded` (16 px de `padding`) con fondo transparente;
- `color-scheme` es `normal` en `html`, `body`, `.sbdocs-wrapper` y `.docblock-argstable`;
- `SyntaxHighlighter` admite `wrapLongLines` (`storybook/internal/components`, tipos en
  `dist/components/index.d.ts`).

## Decisiones del dueño (`notes.md`)

- El hueco entre el Button y su código es de 8 px (RF-3).
- El código de Astro parte sus líneas en anchos estrechos, sin reducir la letra (RF-4).

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | CSS de la vista de historia en `preview-head.html`: `body` sin `padding` y el `div` del decorador con alto mínimo de viewport; test de fondo en esquinas y centro. |
| RF-2 | `color-scheme` de la raíz del iframe según el tema, en `preview-head.html`; el contenedor de documentación marca su esquema; test de cada elemento con desplazamiento. |
| RF-3 | Un margen de 8 px bajo el Button de cada caso Astro; test de la distancia Button–bloque. |
| RF-4 | `wrapLongLines` en el `SyntaxHighlighter` y `overflow-wrap: anywhere` en el caso; test de `scrollWidth` del bloque a 320 y 542 px. |
| Regla 7 | Test de contraste de todo texto visible en las dos vistas de historia, en los dos temas. |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad |
|---|---|---|
| `gallery/.storybook/preview-head.html` | modificado | Decide el fondo de toda la vista de historia y el esquema de color de la raíz del iframe. |
| `gallery/.storybook/preview.ts` | modificado | El contenedor de documentación dice su esquema resuelto (`data-docs-scheme`), para que la raíz lo siga. |
| `gallery/stories/Button.astro.stories.tsx` | modificado | Separa el Button de su código y deja que el código parta sus líneas. |
| `tests/lib/contrast.ts` | sí | `visibleTexts`: el texto visible de una página, su color y el fondo compuesto bajo él; sale de `gallery-docs-theme.test.ts`, que pasa a usarlo. |
| `tests/gallery-docs-theme.test.ts` | modificado | Usa `visibleTexts` en vez de su copia en línea; mismos casos. |
| `tests/gallery-story-theme.test.ts` | sí | RF-1, RF-2 y la regla 7 en las vistas de historia. |
| `tests/gallery-astro-layout.test.ts` | sí | RF-3 y RF-4. |

**Archivos compartidos:** ninguno entre tareas.
- `preview-head.html`, `preview.ts`, `tests/lib/contrast.ts` y `gallery-docs-theme.test.ts`: solo
  la T-1.
- `Button.astro.stories.tsx`: solo la T-2.

## 3. Lógica pura

Ninguna nueva: el esquema de la documentación ya lo da `docsScheme(global, prefersDark)` (007), que
tiene sus tests como dato. `visibleTexts` es una función de página (corre en Edge), no lógica pura.

## 4. Algoritmo

**Fondo de la vista (RF-1).** En `preview-head.html`:
- `body.sb-main-padded { padding: 0 }`, para que no quede el marco de 16 px;
- `#storybook-root > div { min-height: 100vh; box-sizing: border-box }`: el `div` del decorador,
  que ya pinta `--museum-surface` con el tema, cubre el viewport y crece con el contenido.
- `#storybook-root` solo existe en la vista de historia; la documentación pinta sus historias en
  `#storybook-docs`, así que sus lienzos no se estiran a 100vh.

El test abre cada vista con `globals=theme:dark`, `theme:light` y `theme:system` (emulación oscura
y clara). En las cuatro esquinas (a 2 px del borde) y en el centro toma `elementFromPoint`, sube
hasta el primer fondo opaco y lo compara con el fondo del `div` del decorador; además, ese fondo
es oscuro o claro según el tema (luminancia, como en la 007). Lo repite tras desplazar
`Button/Astro/Variants` hasta abajo.

**Esquema de color (RF-2).** En `preview-head.html`:
```css
:root { color-scheme: light dark; }
:root:has([data-theme="light"], [data-docs-scheme="light"]) { color-scheme: light; }
:root:has([data-theme="dark"], [data-docs-scheme="dark"]) { color-scheme: dark; }
```
- En la vista de historia, el `data-theme` del decorador ya existe con «Claro» y «Oscuro»; con
  «Sistema» no hay atributo y la raíz sigue al sistema.
- En la documentación, `ThemedDocsContainer` pone `data-docs-scheme={docsScheme(...)}` en su `div`.
  Hace falta porque `matrix--docs` no tiene ninguna historia, y por tanto ningún decorador.
- `color-scheme` se hereda: la barra de `.docblock-argstable` y las de los `pre` siguen a la raíz.

El test recorre la raíz y todo elemento con `overflow-x` u `overflow-y` en `auto` o `scroll`, en
las dos páginas de documentación y las dos vistas. Con `theme:dark`, su `color-scheme` calculado
es `dark`; con `theme:light`, `light`. El cambio con la página abierta se prueba como en la 007:
se cambia el global desde la barra del gestor.

**Contraste (regla 7).** `visibleTexts(page)` es la función de `gallery-docs-theme.test.ts`,
movida tal cual: recorre los nodos de texto, descarta los invisibles y compone las capas de fondo.
El test exige ≥ 4.5:1 en cada texto de las dos vistas, con `theme:dark` y `theme:light`.

**Separación (RF-3).** La `section` sigue en bloque y el `div` del Button lleva `margin-bottom:
0.5rem` (8 px); el `h3` conserva `margin: 0 0 0.5rem`. Una rejilla con `gap` estiraba la
`ScrollArea` y recortaba el botón Copy de la 007 a 320 y 542 px (lo vio la T-2). El test toma, por caso, el `div` del HTML de Astro y el bloque
de código, y exige `bloque.top − div.bottom ≥ 8`.

**Líneas partidas (RF-4).** `<SyntaxHighlighter language="html" copyable wrapLongLines>` y
`overflowWrap: 'anywhere'` en la `section`, que el código hereda, para partir también una palabra
sin espacios.
- Lo primero de la tarea es comprobar que el contenido de la `ScrollArea` de Storybook no se
  ensancha al del texto.
- Si se ensancha, la tarea para y vuelve al plan, porque el arreglo iría a `preview-head.html`,
  que es de la T-1.

El test lanza Edge sin `--hide-scrollbars` (como `gallery-overflow.test.ts`) a 320 y 542 px. Por
caso, exige `scrollWidth ≤ clientWidth` en el `[data-radix-scroll-area-viewport]` del bloque.
Para el caso límite, añade al `code` de un caso un texto de 600 px sin espacios y repite la
medida. El copiado exacto lo sigue cubriendo `gallery-astro-code.test.ts`, que no se toca.

## 5. Interfaz

- **Vista de historia:** con «Oscuro», todo el iframe es de la superficie oscura, sin marco; con
  «Claro», de la clara; con «Sistema», la del sistema y, sin preferencia, la clara.
- **Barras de desplazamiento:** oscuras con el tema oscuro, en la tabla de props, en los bloques
  y en la raíz del iframe.
- **Casos Astro:** el título, el Button y el código, separados 8 px; el código parte sus líneas a
  320 px, sin barra horizontal.
- **Estados vacíos:** una vista sin contenido sigue pintando su superficie en todo el viewport.
- **Documentación:** sin cambios visibles más allá de las barras; sus lienzos no se estiran.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **El fondo de la vista con CSS en `preview-head.html`**, sobre el `div` del decorador. | `parameters.layout: 'fullscreen'` y `minHeight` en el decorador: el decorador también pinta las historias de la documentación, que crecerían a 100vh. |
| **`color-scheme` en la raíz con `:has()`**, leído de los atributos que ya ponen el decorador y el contenedor. | Escribirlo en `document.documentElement` desde un efecto: es estado fuera de React, que hay que deshacer al cambiar de historia. |
| **Un atributo propio de la galería en la documentación (`data-docs-scheme`).** | Poner `data-theme` en el contenedor: cambiaría los tokens del paquete en toda la página de documentación. |
| **`wrapLongLines` del `SyntaxHighlighter`.** | `white-space: pre-wrap` con CSS: tendría que apuntar a clases internas de Storybook. |
| **`visibleTexts` en `tests/lib/contrast.ts`**, compartida con el test de la 007. | Copiarla en el test nuevo: dos copias que tienen que cambiar juntas. |

**Dependencias (regla 9).** Ninguna nueva.

## 7. Estrategia de tests

- **Como dato:** nada nuevo; `docsScheme` ya está cubierto.
- **En Edge, sobre el Storybook construido:** RF-1 a RF-4 y la regla 7, con `serve`,
  `closeBrowserAndServers` y `contrastRatio`/`parseRgb`.
- **RF-4:** sin `--hide-scrollbars`.
- **Convivencia:** `gallery-astro-code.test.ts` (copiado exacto), `gallery-overflow.test.ts` y
  `gallery-docs-theme.test.ts` siguen en verde.
- **Inyección por tarea:** cada tarea tiene su línea «Inyección:», en la rama de su worktree, y su
  commit dice cuál se vio en rojo (regla 8).
- **Trabajo visual (`AGENTS.md`):** cada tarea enseña sus vistas al dueño en los dos temas, y a
  320 px la T-2, antes del commit.
- **Proporción:** 2 tareas para 4 RF.
