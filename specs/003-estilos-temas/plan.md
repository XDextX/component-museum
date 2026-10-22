# Plan 003 — estilos-temas

**Approved:** 2026-10-21 · el dueño aprobó el plan y las 9 tareas (3 olas; la T-3 se para para la aprobación visual)

Parte de `spec.md` (aprobada, 11 RF) y de `notes.md`. Se apoya en lo que dejaron la 001 y la 002:
- los dos paquetes, con su `styles.css` vacío y las clases `museum-button`, `museum-button--<v>` y
  `museum-button--<s>`;
- `npm test` con candado;
- los consumidores sin tocar y con guarda, construidos en el `globalSetup` (`builds`);
- Edge con y sin JavaScript y con esquema emulado (`tests/lib/browser.ts`);
- el contrato de Button.

Versiones comprobadas en npm el 2026-10-21.

## Decisiones del dueño (2026-10-19, en `notes.md`)

- Tema claro y oscuro, con tokens CSS sobrescribibles.
- `data-theme` vale en `<html>` y en cualquier contenedor; manda el más cercano (RF-6).
- El consumidor siempre gana sin `!important`: el paquete va en la capa `museum` (RF-7 a RF-10).
- Tailwind v4 se prueba en los dos órdenes de import, solo en un consumidor de test; nunca es
  dependencia de un paquete.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | En los consumidores construidos, Edge lee fondo, texto y borde de cada variante y los compara con sus tokens; Astro también sin JavaScript. |
| RF-2 | Test que lista las at-rules de la hoja: solo `@layer` y `@media`, y ningún `@import`. |
| RF-3 | Test que recorre la hoja en el CSSOM de Edge: cada selector lleva `.museum-` o solo declara `--museum-*`. |
| RF-4 | En los consumidores, una regla sin capa en `:root` por cada categoría de token cambia su propiedad en Button. |
| RF-5 | Con `prefers-color-scheme` emulado y sin `data-theme`, los tokens son los de ese tema. |
| RF-6 | `data-theme` en `<html>`, en un contenedor y anidado, con la emulación contraria. |
| RF-7 | El mismo recorrido del CSSOM: toda regla de estilo cuelga de una capa cuyo nombre acaba en `museum`. |
| RF-8 | Regla sin capa sobre `.museum-button` y sobre una clase propia pasada por la prop de clase. |
| RF-9 | Consumidor con Tailwind v4 por framework, con dos páginas, una por orden de import: `px-8` da 32px. |
| RF-10 | En esas dos páginas, Button sin utilidades conserva el fondo y el `padding-left` de sus tokens. |
| RF-11 | Contraste ≥ 4.5:1 de texto sobre fondo, por variante, tema y framework; foco visible con teclado. |

Casos límite cubiertos:
- **Tokens a medias** (RF-4).
- **Token en `:root` frente a `data-theme`** (RF-6).
- **`data-theme` desconocido** (RF-5 y RF-6).
- **Las dos hojas a la vez** (RF-1).
- **Capas `base` y `components` ajenas:** documentado en el bloque 4; no tiene test propio, porque
  la spec lo da como contexto.

## 2. Archivos

| Archivo | Nuevo | Responsabilidad |
|---|---|---|
| `styles/museum.css` | sí | **La única fuente de CSS**: el orden de capas, los tokens de los dos temas y las reglas de Button. |
| `scripts/sync-styles.mjs` | sí | Copia la fuente, byte a byte, al `styles.css` de cada paquete. |
| `packages/*/package.json` | modificado | Script `prepack` que ejecuta la copia, para que cada tarball lleve la hoja al día. |
| `packages/*/styles.css` | generado | Ya no se versiona: lo escribe la copia (`.gitignore`). |
| `.gitignore` | modificado | Ignora `packages/*/styles.css`. |
| `tests/lib/css.ts` | sí | Lógica pura: at-rules de un texto CSS, `parseRgb` y `contrastRatio`. |
| `tests/lib/serve.ts` | sí | Sirve un `dist/` por HTTP en un puerto libre, para abrir en Edge un consumidor de React (SPA). |
| `tests/lib/consumer.ts` | modificado | Añade a las entradas una instancia de Button con una clase propia (`museum-test-own`) y la opción de consumidor con Tailwind v4 y dos páginas. |
| `tests/global-setup.ts` | modificado | Crea y construye los dos consumidores con Tailwind, en paralelo con los demás. |
| `tests/css.test.ts` | sí | Tests de la lógica pura. |
| `tests/styles.test.ts` | sí | RF-2, RF-3 y RF-7, y que el `styles.css` empaquetado es idéntico a la fuente. |
| `tests/theme.test.ts` | sí | RF-1, RF-4, RF-5 y RF-6. |
| `tests/cascade.test.ts` | sí | RF-8, RF-9 y RF-10. |
| `tests/a11y.test.ts` | sí | RF-11. |

## 3. Lógica pura

```ts
// Nombres de las at-rules de un texto CSS, sin los comentarios: ['layer', 'media', ...].
atRules(css: string): string[]
type Rgb = { r: number; g: number; b: number; a: number }
// 'rgb(1, 2, 3)' o 'rgba(1, 2, 3, 0.5)', tal como lo da getComputedStyle.
parseRgb(computed: string): Rgb
// Relación de contraste WCAG 2.1 entre dos colores opacos: de 1 a 21.
contrastRatio(a: Rgb, b: Rgb): number
```

## 4. Algoritmo

**Una sola fuente de CSS.** `styles/museum.css` es la única copia que se edita. Antes de cada
`npm pack`, el `prepack` de cada paquete la copia a su `styles.css`. Los consumidores de test
instalan tarballs, así que siempre reciben la fuente actual. Un test compara el `styles.css` del
tarball con la fuente, byte a byte. Lo primero que comprueba la T-1 es que `npm pack <dir>` lanza
el `prepack`. Si no lo lanza, la copia entra al principio del script `test`, y el `prepack` queda
solo para la publicación.

**Orden de capas.** La hoja empieza con `@layer base, components;` y pone todo lo suyo en
`@layer components.museum { … }`.
- **Tailwind importado antes:** Tailwind declara `theme, base, components, utilities` (comprobado
  en `tailwindcss@4.3.3/index.css`). `museum` queda dentro de `components`: gana a `base` (su
  preflight pone `background-color: transparent` en `button`) y pierde frente a `utilities`.
- **Tailwind importado después:** el orden es `base, components, theme, utilities`. `theme` solo
  declara variables `--*` de Tailwind, que no chocan con `--museum-*`, así que el resultado es el
  mismo.
- **Sin Tailwind:** `base` y `components` existen vacías, salvo `museum`, y no cambian nada.
- **Capas ajenas:** las reglas del consumidor en su propia `base` pierden; las directas en
  `components` ganan a `museum`, porque dentro de una capa las reglas sin subcapa ganan a las de
  sus subcapas; las reglas sin capa ganan siempre.
- Si la T-8 demuestra que este orden falla en alguno de los dos casos, el plan vuelve a la spec.

**Tokens y temas.** Cada color, radio, espaciado y tipografía de Button es un `--museum-*`:
- **Color, por variante:** `--museum-button-<v>-bg`, `-fg`, `-border`, más `--museum-focus`.
- **Radio:** `--museum-radius`.
- **Espaciado, por tamaño:** `--museum-space-<s>-x` y `-y`.
- **Tipografía:** `--museum-font-family`, `--museum-font-size-<s>`, `--museum-font-weight`.

```css
@layer components.museum {
  :root, [data-theme="light"] { /* tokens claros */ }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* oscuros */ } }
  [data-theme="dark"] { /* tokens oscuros */ }
  .museum-button { /* lee los tokens con var() */ }
}
```

Cómo resuelve esto cada caso:
- **Manda el más cercano:** cada `[data-theme]` vuelve a declarar los tokens de color, y los
  descendientes heredan los del contenedor más próximo.
- **`data-theme` desconocido:** en `<html>` cae al claro, o al oscuro si el sistema lo prefiere; en
  un contenedor, no declara nada y se hereda del ancestro.
- **Token del consumidor en `:root`, sin capa:** gana a los del paquete, que van en capa.

**Lecturas en el navegador.** Los consumidores ya están construidos en el `globalSetup`.
- **Astro:** se abre su `dist/index.html`, con JavaScript activado y desactivado.
- **React:** se sirve su `dist/` con `serve.ts`.

Los cambios de cada test se aplican en la página abierta, no en el consumidor. Así los consumidores
sin tocar siguen siendo de solo lectura (001):
- Las reglas del consumidor se añaden con `addStyleTag`, sin capa.
- Los contenedores `data-theme` se crean con `evaluate`, que funciona con JavaScript desactivado
  (hallazgo de la 001).
- RF-8 usa la instancia con la clase propia.

**Consumidores con Tailwind (RF-9, RF-10).** Uno por framework, con `tailwindcss` y
`@tailwindcss/vite` 4.3.3 y su plugin en la configuración. Cada uno tiene dos páginas, que solo
cambian el orden de dos imports:
- `import './tailwind.css'` (que contiene `@import "tailwindcss";`) seguido de la hoja del paquete;
- y al revés.

La configuración del consumidor la cambia el test, así que no son consumidores sin tocar.

**Accesibilidad (RF-11).** Por framework, variante y tema, `contrastRatio(fg, bg) ≥ 4.5`. La
variante `outline` tiene fondo propio (`--museum-surface`), así que su contraste no depende de la
página del consumidor. `disabled` queda fuera del umbral de contraste, porque WCAG lo exime.

**Foco de dos tonos (decisión del dueño, 2026-10-22).** La validación encontró que el anillo
`#93c5fd` quedaba a 1,80:1 contra el lienzo blanco del consumidor de Astro con tema oscuro. El
paquete no pinta la página, y el test medía contra `--museum-surface`, así que no podía fallar.

Ahora el anillo va separado del botón y rodeado por un halo de `--museum-surface`. El halo está
siempre, así que el anillo contrasta contra él y no contra la página. En CSS:
- `outline: 2px solid var(--museum-focus)` con `outline-offset: 2px`;
- `box-shadow: 0 0 0 6px var(--museum-surface)`, que pinta el halo bajo el anillo, desde el borde
  del botón hasta 2px más allá del borde exterior del anillo.

El check se hace en los dos temas, los dos frameworks y sobre el lienzo real de cada consumidor,
sin `data-theme` en la página ni fondo puesto por el test:
- **Contraste:** con `Tab`, `contrastRatio(focus, surface) ≥ 3` (WCAG 1.4.11).
- **El halo existe y rodea el anillo:** el `box-shadow` calculado tiene el color de `surface` y un
  alcance mayor o igual que `outline-offset` + ancho del anillo + 2px.
- **Sin hueco transparente:** en una captura del Button enfocado, los píxeles de dentro del
  anillo, del anillo y del halo exterior son `surface`, `focus` y `surface`. Ninguno es el color del
  lienzo.

La validación lista además la comprobación a mano: teclado, nombre accesible y foco.

## 5. Interfaz

- **Sin `data-theme`:** Button sigue la preferencia del sistema.
- **Con `data-theme="dark"`** en un contenedor: lo que contiene se ve oscuro.
- **Personalizar:** el consumidor escribe, sin capa:
  - `:root { --museum-button-primary-bg: … }` (tokens);
  - `.museum-button { … }` o su propia clase (reglas);
  - o utilidades de Tailwind en la prop de clase.
- **Foco:** con `:focus-visible`, un anillo de `--museum-focus` separado 2px del botón, sobre un
  halo de `--museum-surface` que lo rodea por los dos lados; se lee igual sobre fondo claro, oscuro
  o de cualquier color. Con ratón, sin anillo.
- **Estado vacío:** no aplica. Button siempre tiene contenido, el texto de ejemplo en los
  consumidores.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **Una fuente en `styles/museum.css`, copiada a cada paquete al empaquetar.** Los paquetes no pueden depender entre sí (002, RF-4) y cada uno publica su propia hoja; la copia es generada y no se versiona. | Dos copias versionadas con un test de igualdad: duplica el CSS y cada cambio hay que hacerlo dos veces. Un paquete `@component-museum/styles` del que dependan los dos: sería una dependencia impuesta al consumidor (002, RF-4). |
| **`museum` anidada en `components`, con `@layer base, components;` al principio** (la vía de `notes.md`). | `@layer museum;` solo: con Tailwind antes, `museum` queda detrás de `utilities` y les gana (RF-9 rojo). `!important` en las utilidades del consumidor: el dueño lo descartó. |
| **Los temas son reglas de tokens** (`:root`, `[data-theme]` y `@media`); Button solo lee `var()`. | Clases de tema en Button: el consumidor no podría cambiar el tema de un contenedor entero. |
| **`outline` con fondo propio** (`--museum-surface`), no transparente. | Fondo transparente: el contraste dependería de la página del consumidor, y RF-11 no podría garantizarlo. |
| **Anillo de foco de dos tonos** (decisión del dueño, 2026-10-22): separado del botón y sobre un halo de `--museum-surface`, y medido contra ese halo. | B, el anillo dentro del botón: su contraste dependería del fondo de cada variante, no de uno solo. C, dejar el foco al consumidor: rompe la regla 7 («accesible por defecto»). |
| **RF-2 por texto; RF-3 y RF-7 por el CSSOM de Edge.** | Un parser de CSS como dependencia (postcss, css-tree): una dependencia nueva cuando Edge ya parsea la hoja. Solo el CSSOM: el navegador descarta las at-rules desconocidas, así que `@apply` no aparecería. |
| **Cambios de test en la página abierta** (`addStyleTag`, `evaluate`), no en el consumidor. | Un consumidor más por cada caso: muchas instalaciones, y la regla de solo lectura de la 001 se rompería. |
| **Dos consumidores con Tailwind, cada uno con dos páginas**, una por orden de import. | Cuatro consumidores (uno por orden y framework): el doble de instalaciones. |

**Dependencias (regla 9).**
- **Ninguna en la raíz ni en los paquetes.**
- `tailwindcss` 4.3.3 y `@tailwindcss/vite` 4.3.3 (peer `vite ^5.2 || ^6 || ^7 || ^8`) se instalan
  solo en los dos consumidores de test con Tailwind, fuera del repo. Motivo: RF-9 y RF-10 tienen que
  probar Tailwind v4 de verdad, y solo así se ve el orden real de sus capas.

## 7. Estrategia de tests

- **Como dato:** `atRules`, `parseRgb` y `contrastRatio` (`css.test.ts`), y RF-2 sobre el texto de
  la fuente.
- **En el CSSOM de Edge:** RF-3 y RF-7.
- **Como output renderizado, en Edge y en los consumidores construidos:** RF-1, RF-4 a RF-6 y
  RF-8 a RF-11, con viewport explícito y en los dos temas.
- **Inyección por tarea:** cada tarea de `tasks.md` tiene su línea «Inyección:», y su commit dice
  cuál se vio en rojo (regla 8).
- **Trabajo visual (`AGENTS.md`):** la T-3 enseña Button en los dos temas al dueño y espera su
  aprobación antes del commit.
- **Tiempo:** dos consumidores más, con Tailwind. Se mide en la T-7.
- **Proporción:** 9 tareas para 11 RF.
