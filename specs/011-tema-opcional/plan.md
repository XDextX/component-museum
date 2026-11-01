# Plan 011 — tema-opcional

**Approved:** 2026-10-23 · el dueño; la galería sigue arrancando en «Sistema»

Parte de `spec.md` (aprobada por el dueño, 7 RF) y de `notes.md`. Las respuestas del dueño:
`data-theme="system"`, y el campo mantiene su superficie. Comprobado en `spec/011-tema-opcional`
(f8709ba):
- `styles/museum.css` tiene tres bloques de tema:
  - `:root, [data-theme="light"]`;
  - `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`;
  - `[data-theme="dark"]`.
- El decorador de la galería (`gallery/.storybook/preview.ts`) no pone `data-theme` con «Sistema»
  y fija `colorScheme: 'light dark'`; `preview-head.html` (008) lee `#storybook-root >
  [data-theme="light"|"dark"]` y, si no lo hay, deja `:root { color-scheme: light dark }`.
- Tests que emulan el sistema, y qué hacen hoy:
  - `theme.test.ts`: RF-5 de la 003 (sin atributo, manda el sistema) y RF-6 (gana el más cercano).
  - `a11y.test.ts` (Button) y `field-a11y.test.ts` (campos): pasan al oscuro **solo con la
    emulación**, sin atributo, sobre las páginas de los consumidores.
  - `field-styles.test.ts`: cuatro modos; dos de ellos son «sistema» sin atributo.
  - `gallery-theme.test.ts`, `gallery-story-theme.test.ts`, `gallery-docs-theme.test.ts`,
    `gallery-astro-code.test.ts`, `gallery-lang.test.ts` y `gallery-browser.test.ts`: usan el
    global de la galería con la emulación del sistema, a favor o en contra.
  - `cascade.test.ts` solo usa el claro, y `browser.test.ts` prueba `readStyle` sobre su propia
    página (`tests/fixtures/style-page.html`, con su `@media` propio): ninguno depende del paquete.
- Los textos que dicen que el oscuro llega con `prefers-color-scheme`: los README de los dos
  paquetes (español e inglés) y `Button.mdx`, `Input.mdx` y `Textarea.mdx` (las dos lenguas).

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | La hoja deja de leer la preferencia sin atributo (T-1); `theme.test.ts`, `field-styles.test.ts`, `a11y.test.ts` y `field-a11y.test.ts` prueban el claro con el sistema en oscuro (T-1). |
| RF-2 | Sin cambio en `[data-theme="dark"]`/`"light"`; el RF-6 de la 003 en `theme.test.ts` gana casos con `system` anidado (T-1). |
| RF-3 | `[data-theme="system"]` en el bloque claro y en el `@media` oscuro (T-1); `theme.test.ts` con las dos emulaciones y el cambio en vivo (T-1). |
| RF-4 | El decorador pone `data-theme="system"` con «Sistema» (T-1); los tests de galería, sin relajar, más un caso «Sistema» en `gallery-theme.test.ts` (T-1). |
| RF-5 | La superficie del campo se queda (009); `field-styles.test.ts` mide un campo sobre una página oscura sin `data-theme` (T-1). |
| RF-6 | README y MDX en las dos lenguas (T-2); `tests/theme-docs.test.ts` (T-2). |
| RF-7 | Línea `Changed:` en `specs/003-estilos-temas/spec.md` (T-2); el mismo test (T-2). |
| NFR | Regla 7: los tests de contraste de Button, Input y Textarea en los dos temas, ahora pedidos (T-1). Regla 6: sin `BREAKING CHANGE` (bloque 6). |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad | Tarea |
|---|---|---|---|
| `styles/museum.css` | mod. | Decide cuándo hay oscuro: solo con `data-theme="dark"`, o con `"system"` y el sistema en oscuro. | T-1 |
| `gallery/.storybook/preview.ts` | mod. | «Sistema» pide `data-theme="system"` en el lienzo del decorador. | T-1 |
| `tests/theme.test.ts` | mod. | RF-1, RF-2 y RF-3 sobre los consumidores: el claro por defecto, `system` y el más cercano. | T-1 |
| `tests/field-styles.test.ts` | mod. | Modos de tema nuevos sobre la página fija; RF-5 sobre una página oscura sin atributo. | T-1 |
| `tests/a11y.test.ts`, `tests/field-a11y.test.ts` | mod. | El oscuro se pide con `data-theme` en `<html>`; además, el claro con el sistema en oscuro y `system` con las dos emulaciones. | T-1 |
| `tests/gallery-theme.test.ts` | mod. | Un caso «Sistema»: el lienzo lleva `data-theme="system"` y los tokens siguen la emulación. | T-1 |
| `packages/react/README.md`, `packages/astro/README.md` | mod. | Cómo se pide el tema, en español y en inglés. | T-2 |
| `gallery/stories/Button.mdx`, `Input.mdx`, `Textarea.mdx` | mod. | La línea de temas, en las dos lenguas. | T-2 |
| `specs/003-estilos-temas/spec.md` | mod. | Línea `Changed:` (RF-7). | T-2 |
| `tests/theme-docs.test.ts` | sí | RF-6 y RF-7 como dato. | T-2 |

**Archivos compartidos:** ninguno entre las dos tareas.
- La hoja, `preview.ts` y los seis tests de T-1 son solo de la T-1. Cambiar la hoja deja en rojo
  esos tests y la galería, así que van juntos.
- Los cinco documentos, la 003 y el test nuevo son solo de la T-2.

## 3. Lógica pura

Ninguna nueva. `docsScheme` (007) ya resuelve «Sistema» para el contenedor de la documentación,
que pinta el tema de Storybook y no el del paquete, así que no cambia.

## 4. Algoritmo

**Hoja (T-1).** Dos cambios de selector, sin tocar ningún valor:
```css
/* Light: the default, and any container that asks for it or for the system's (overridden below). */
:root,
[data-theme="light"],
[data-theme="system"] { /* light tokens, unchanged */ }

/* Dark from the system, only where the page asks for it. */
@media (prefers-color-scheme: dark) {
  [data-theme="system"] { /* dark tokens, unchanged */ }
}

[data-theme="dark"] { /* dark tokens, unchanged */ }
```
- `[data-theme="system"]` entra en el bloque claro. Así, un `system` dentro de un `dark` con el
  sistema en claro da el claro, y no hereda el oscuro de fuera. El bloque `@media`, que va después
  y tiene la misma especificidad, lo pasa a oscuro cuando el sistema lo está.
- `:root:not([data-theme="light"])` desaparece: sin atributo, `:root` es claro (RF-1).
- Un `data-theme` desconocido (`"sepia"`) no casa con ningún bloque y hereda el de fuera; en
  `<html>`, el de `:root`, que es el claro.
- Siguen siendo tres bloques, y cada token se declara tres veces: el test de la 009 que lo cuenta
  no cambia.
- El campo y su superficie no cambian (respuesta del dueño).

**Galería (T-1).** El decorador cambia `theme ?? undefined` por `theme ?? 'system'` en el
atributo, y mantiene `colorScheme: 'light dark'` para «Sistema». `preview-head.html` no cambia:
con `system`, la raíz se queda en `light dark`, que sigue a la preferencia.

**Tests (T-1).** Ninguno se relaja. Donde hoy se emula el sistema, se prueban dos cosas: el tema
pedido y el claro por defecto con el sistema en oscuro.

| Test | Antes | Después |
|---|---|---|
| `theme.test.ts`, RF-5 de la 003 | sin atributo, los tokens siguen la emulación | RF-1: sin atributo (y con `"sepia"`), los claros con las dos emulaciones. RF-3: `data-theme="system"` en `<html>` y en un contenedor, los de la emulación; con la página abierta, `emulateMedia` de oscuro a claro cambia los tokens. |
| `theme.test.ts`, RF-6 de la 003 | `<html>`, contenedor, `light` en `dark` | Lo mismo, más `system` dentro de `dark` (con sistema claro, el claro) y `light` dentro de `system` (con sistema oscuro, el claro). |
| `field-styles.test.ts` | 4 modos (atributo × 2, sistema × 2) | 5 modos: `light`, `dark`, `system` con sistema claro, `system` con sistema oscuro, y sin atributo con sistema oscuro (que da el claro). Cada medida de la 009 se repite en los 5. Además, RF-5: `body` con fondo `#111827` y sin atributo, con textos ≥ 4.5:1 y borde ≥ 3:1. |
| `a11y.test.ts`, `field-a11y.test.ts` | oscuro = emulación | Oscuro = `data-theme="dark"` en `<html>` con el sistema en claro. Claro = sin atributo con el sistema en oscuro. Más un recorrido con `data-theme="system"` y el sistema en oscuro, que da las medidas del oscuro. |
| `gallery-theme.test.ts` | `light` y `dark` contra la preferencia | Más «Sistema» con las dos emulaciones: el lienzo lleva `data-theme="system"` y los tokens de la emulación. |
| Resto de tests de galería | — | Sin cambio; tienen que seguir en verde, y si alguno se pone en rojo es un hallazgo, no se relaja. |

**Documentación (T-2).** La línea de temas, en las dos lenguas, en cada uno de los 5 documentos:
- en español: «el claro es el de por defecto; el oscuro se pide con `data-theme="dark"` en
  cualquier contenedor, y `data-theme="system"` sigue la preferencia del sistema. Sin atributo, el
  paquete no mira el sistema»;
- en inglés, su par.

`theme-docs.test.ts` exige, en cada documento:
- `data-theme="dark"` y `data-theme="system"` al menos dos veces, una por lengua;
- ninguna frase que presente `prefers-color-scheme` como activación automática («llega con
  `prefers-color-scheme`», «arrives through `prefers-color-scheme`»);
- además, que la 003 tenga una línea `Changed:` que nombre la 011 y su RF-5.

## 5. Interfaz

- **Página sin atributo:** todo claro, también con el sistema en oscuro.
- **`data-theme="dark"`:** oscuro dentro, sea cual sea el sistema.
- **`data-theme="system"`:** sigue al sistema, y cambia en vivo si el sistema cambia.
- **Página oscura sin atributo:** campos y botones claros sobre ella, legibles (la superficie del
  campo).
- **Galería:** «Claro», «Oscuro» y «Sistema» se ven igual que hoy; solo cambia que «Sistema» lo
  pide.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **`[data-theme="system"]` también en el bloque claro.** | Solo en el `@media`: un `system` dentro de un `dark` heredaría el oscuro con el sistema en claro. |
| **La hoja y todos los tests que dependen de ella en una tarea (T-1).** | Repartirlos: entre ola y ola, los tests de contraste y de galería quedarían en rojo. |
| **Probar el claro por defecto con el sistema en oscuro en cada test que emulaba.** | Cambiar solo la emulación por el atributo: perdería la comprobación de RF-1 justo donde nació el problema. |
| **Un test de texto para los documentos (T-2).** | Leerlos a mano en la validación: el RF-6 pide un test, y la regla 8 una guarda. |
| **Sin `BREAKING CHANGE`** (NFR de la spec aprobada): no hay nada publicado (`npm view`, 404). | Marcarlo igualmente: subiría la versión mayor de un paquete que no tiene versión. |

**Dependencias (regla 9).** Ninguna nueva.

**Commits:**
- La T-1 hace un `feat:` para la hoja. Tras él, la sesión de git añade
  `fix(packages/react)` y `fix(packages/astro)` vacíos (`AGENTS.md`). Además, `fix:` para la
  galería y `test:` para los tests.
- La T-2 hace `docs(packages/react)` y `docs(packages/astro)` para los README, `docs:` para los
  MDX y la 003, y `test:`.

## 7. Estrategia de tests

- **Runner:** Vitest, con Edge real vía `playwright-core`.
- **Como dato:** `theme-docs.test.ts` (T-2).
- **En Edge:** la hoja sobre los consumidores y la página fija; la galería construida (T-1).
- **Sin aflojar:** cada tarea da el número de tests antes y después, y ningún caso existente se
  borra; los que cambian de emulación a atributo conservan su nombre de RF.
- **Inyección por tarea:** cada tarea tiene su línea «Inyección:», en la rama de su worktree, y su
  commit dice cuál se vio en rojo (regla 8).
- **Trabajo visual:** la T-1 enseña capturas de Button, Input y Textarea en la galería con «Claro»,
  «Oscuro» y «Sistema» (sistema en oscuro), y de una página de consumidor sin atributo con el
  sistema en oscuro.
- **Antes de reportar:** el build de `packages/react`, `npm run gallery:astro`, los dos `tsc` y
  `npm test`. Las notas que escriban los agentes, en UTF-8.
- **Proporción:** 2 tareas para 7 RF.
