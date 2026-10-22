# Tareas 003 — estilos-temas

**Approved:** 2026-10-21 · el dueño aprobó el plan y las 9 tareas (3 olas; la T-3 se para para la aprobación visual)

Regla para el paralelismo: solo la T-3 edita `styles/museum.css`. Si un test de otra tarea pide
cambiar la hoja, esa tarea lo dice y la T-3 lo hace, para que dos sesiones no toquen el mismo
archivo.

- [ ] **T-1 — Una sola fuente de CSS, copiada a cada paquete al empaquetar**
  Cubre: ninguno nuevo; tarea mecánica de la que dependen RF-1 a RF-11 (plan, bloques 4 y 6)
  Archivos: `styles/museum.css` (cabecera con `@layer base, components;` y bloque
  `components.museum` vacío), `scripts/sync-styles.mjs`, `packages/react/package.json`,
  `packages/astro/package.json` (`prepack`), `packages/*/styles.css` (fuera de git), `.gitignore`,
  `tests/styles.test.ts`
  Hecho cuando: lo primero, comprobar que `npm pack <dir>` lanza el `prepack` (si no, la copia va al
  script `test`, plan, bloque 4); el `styles.css` de cada tarball es idéntico byte a byte a
  `styles/museum.css`; los tests de la 001 y la 002 siguen en verde.
  Inyección: editar a mano un `packages/*/styles.css` y empaquetar sin el `prepack` pone en rojo
  la igualdad con la fuente.

- [ ] **T-2 — Lógica pura de CSS y de contraste**
  Cubre: base de RF-2 y RF-11
  Archivos: `tests/lib/css.ts`, `tests/css.test.ts`
  Hecho cuando: `atRules` ignora los comentarios y lista `layer`, `media`, `apply`, `import`;
  `parseRgb` lee `rgb()` y `rgba()`; `contrastRatio` da 21 entre negro y blanco, 1 entre dos
  colores iguales, y 4.54 entre `#767676` y blanco.
  Inyección: quitar la linealización sRGB de `contrastRatio` pone en rojo el caso `#767676`.

- [ ] **T-3 — Escribir tokens, temas y reglas de Button**
  Cubre: el contenido de RF-1 y RF-4 a RF-7 y RF-11 (los tests son la T-4, la T-6, la T-8 y la T-9)
  Archivos: `styles/museum.css`
  Hecho cuando: hay un token por cada color (por variante: `bg`, `fg`, `border`, más `focus` y
  `surface`), radio, espaciado (por tamaño) y tipografía; tema claro en `:root` y
  `[data-theme="light"]`, oscuro en `@media (prefers-color-scheme: dark)` y en
  `[data-theme="dark"]`; Button solo lee `var()`; `:focus-visible` dibuja un anillo de 2px o más.
  El dueño ve Button en los dos temas y en los dos frameworks y lo aprueba antes del commit
  (`AGENTS.md`, trabajo visual).
  Inyección: un color directo en una regla de Button, en lugar de su token, lo deja fuera de RF-4,
  y la T-6 se pone en rojo.

- [ ] **T-4 — Guardas de la hoja: CSS estándar, selectores y capa**
  Cubre: RF-2, RF-3, RF-7
  Archivos: `tests/styles.test.ts`
  Hecho cuando: la fuente solo tiene at-rules `layer` y `media` y ningún `@import`; en el CSSOM de
  Edge, cada regla de estilo lleva `.museum-` o solo declara `--museum-*`, y cuelga de una capa
  cuyo nombre acaba en `museum`.
  Inyección: añadir `@apply`, una regla `button { }` o una regla fuera de `@layer`, una cada vez,
  pone el test en rojo.

- [ ] **T-5 — Servir el `dist/` y añadir una instancia con clase propia**
  Cubre: base de RF-1, RF-4 a RF-6 y RF-8 a RF-11
  Archivos: `tests/lib/serve.ts`, `tests/lib/consumer.ts`
  Hecho cuando: `serve(dir)` sirve un `dist/` en un puerto libre y se cierra al terminar; las
  entradas de los consumidores llevan además un Button con la clase `museum-test-own`; los tests de
  la 002 siguen en verde, porque la configuración del starter no cambia.
  Inyección: servir sin cabecera `Content-Type` para `.js` hace que Edge no ejecute el módulo, y la
  prueba de humo de la tarea (React renderiza el Button) se pone en rojo.

- [ ] **T-6 — Estilos, tokens y temas en los consumidores**
  Cubre: RF-1, RF-4, RF-5, RF-6
  Archivos: `tests/theme.test.ts`
  Hecho cuando:
  - Por framework y variante, fondo, texto y borde calculados son los de sus tokens; en Astro,
    también sin JavaScript, y también con las dos hojas a la vez.
  - Una regla sin capa en `:root` por categoría cambia su propiedad; las demás no cambian.
  - Sin `data-theme`, el tema sigue la emulación.
  - Con la emulación contraria, `data-theme` en `<html>`, en un contenedor y un `light` dentro de un
    `dark` dan los tokens del tema más cercano.
  - Un valor desconocido se trata como ausente.
  Inyección: cambiar el orden para que `[data-theme="dark"]` vaya antes que `@media` deja ganar a
  la preferencia del sistema en `<html data-theme="light">`, y el test se pone en rojo (en una
  copia de la hoja inyectada en la página, no en la fuente).

- [ ] **T-7 — Consumidores con Tailwind v4, uno por framework, con dos órdenes de import**
  Cubre: base de RF-9 y RF-10
  Archivos: `tests/lib/consumer.ts`, `tests/global-setup.ts`
  Hecho cuando: el `globalSetup` crea y construye, en paralelo con los demás, un consumidor por
  framework con `tailwindcss` y `@tailwindcss/vite` 4.3.3, con dos páginas que solo cambian el
  orden de los dos imports y una utilidad `px-8` en un Button; los demás consumidores no cambian;
  el tiempo de `npm test` se mide antes y después.
  Inyección: quitar el plugin de Tailwind de la configuración deja `px-8` sin generar, y la
  comprobación de la tarea (la regla `.px-8` existe en el CSS construido) se pone en rojo.

- [ ] **T-8 — El consumidor gana: reglas propias y Tailwind en los dos órdenes**
  Cubre: RF-8, RF-9, RF-10
  Archivos: `tests/cascade.test.ts`
  Hecho cuando: una regla sin capa que cambia el fondo gana en Button, con `.museum-button` y con
  `museum-test-own`, en cada framework; en las dos páginas de cada consumidor con Tailwind, `px-8`
  da 32px de `padding-left` y Button sin utilidades da el fondo y el `padding-left` de sus tokens.
  Inyección: cambiar la cabecera por `@layer museum;` solo (en una copia de la hoja inyectada en la
  página) pone en rojo RF-9 en la página con Tailwind importado antes.

- [ ] **T-9 — Contraste y foco de Button en los dos temas**
  Cubre: RF-11
  Archivos: `tests/a11y.test.ts`
  Hecho cuando: por framework, variante y tema, `contrastRatio(fg, bg) ≥ 4.5`; con `Tab`, el
  Button enfocado tiene un `outline` visible de 2px o más en los dos temas; la validación lista la
  comprobación a mano de teclado, nombre accesible y foco.
  Inyección: un `fg` de `primary` con contraste 3:1, en una copia de la hoja inyectada en la
  página, pone el test en rojo.
