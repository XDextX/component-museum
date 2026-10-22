# Tareas 004 — historia-button

**Approved:** 2026-10-22 · aprobado por el coordinator en la sesión autónoma que declaró el dueño ("trabaja y haz los commits"), con sus 3 respuestas (versionado, instalación, workspaces); el dueño corrige al vuelo

Cómo se trabaja en paralelo (plan, bloque 6): cada tarea de una ola va en su propio worktree, con
su rama `spec/004-historia-button-T-n` y su `node_modules`. Al cerrar la ola, la sesión de git
mergea las ramas en `spec/004-historia-button`. Los archivos compartidos los toca una sola tarea:
`package.json` y `package-lock.json` la T-1, y `tests/global-setup.ts` la T-6.

- [x] **T-1 — Workspaces y esqueleto de la galería con Storybook**
  Cubre: base de RF-1 a RF-10 (tarea mecánica)
  Archivos: `package.json` (workspaces, script `gallery`), `package-lock.json`,
  `gallery/package.json`, `gallery/.storybook/main.ts`, `gallery/.storybook/preview.ts`,
  `.gitignore`
  Hecho cuando: `npm ci` enlaza `@component-museum/react` y `@component-museum/astro` en
  `node_modules`; `npm run gallery` arranca Storybook; `storybook build` termina en 0; los tests de
  la 001 a la 003 siguen en verde.
  Inyección: quitar `gallery` de las workspaces hace que el import por especificador de
  `preview.ts` no resuelva, y `storybook build` falla.
  Inyección vista: la del plan pone `storybook build` en rojo por otro motivo (npm desinstala
  Storybook con la galería, y `@component-museum/react` sigue enlazado desde `packages/*`), así que
  no prueba el especificador. En su lugar, quitar el enlace `node_modules/@component-museum/react`
  → `storybook build` en rojo con «failed to resolve import "@component-museum/react/styles.css"»,
  exit 1; `npm install` lo enlaza de nuevo y el build pasa. Manifiestos restaurados, idénticos según
  `cmp`. `npm run gallery` compila los paquetes (`build:packages`) y arranca Storybook en `:6006`.

- [x] **T-2 — Lógica pura: controles, códigos de uso y casos Astro desde el contrato**
  Cubre: base de RF-3, RF-5, RF-6, RF-7, RF-8
  Archivos: `gallery/lib/contract-args.ts`, `tests/contract-args.test.ts`
  Hecho cuando:
  - `argTypesFromContract` da una lista cerrada por enumerado, un interruptor por booleano y la
    clase con `['', 'my-button']`.
  - `usageSnippet` escribe los dos imports y solo las props que no tienen su valor por defecto.
  - `astroCases` da cada variante, normal y `disabled`.
  Inyección: que `usageSnippet` omita el import de la hoja pone en rojo su test.
  Inyección vista: quitar el import de la hoja de `usageSnippet` dejó en rojo "always writes both imports and omits default props" (6 verdes, 1 rojo); restaurado con el mismo sha256.

- [ ] **T-3 — Prerenderizar Button en Astro**
  Cubre: RF-5, RF-6 (el contenido; el test es la T-7)
  Archivos: `gallery/astro-render/` (`astro.config.mjs`, `src/pages/index.astro`,
  `tsconfig.json`; sin `package.json` propio: usa el `astro` de la raíz con `astro build --root`),
  `gallery/scripts/extract-astro.mjs`
  Hecho cuando: `astro build` en `astro-render` y la extracción dejan `gallery/generated/astro-button.json`
  con un caso por variante, normal y `disabled`, cada uno con su HTML real y su código de uso.
  Inyección: quitar `disabled` de `astroCases` deja el JSON sin esos casos, y el recuento de la
  tarea (variantes × 2) se pone en rojo.

- [ ] **T-4 — Historia React de Button con sus controles**
  Cubre: RF-3, RF-9 (junto al control)
  Archivos: `gallery/stories/Button.react.stories.tsx`
  Hecho cuando: la historia usa `argTypesFromContract`; el control de clase ofrece «ninguna» y
  `my-button`; su descripción muestra el CSS de `.my-button`, que un decorador inyecta sin capa;
  `storybook build` termina en 0.
  Inyección: un `argTypes` escrito a mano con una variante de menos pone en rojo RF-3 en la T-7.

- [x] **T-5 — Documentación de Button en español y en inglés**
  Cubre: RF-2, RF-9 (en «cómo alterarlo»)
  Archivos: `gallery/stories/Button.mdx`
  Hecho cuando: hay seis secciones con contenido («Uso», «Construcción» y «Cómo alterarlo», y
  «Usage», «How it is built» y «How to alter it»); «Cómo alterarlo» enseña tokens, reglas sobre la
  clase y utilidades, con el CSS de `my-button`; sus códigos de uso salen de `usageSnippet`.
  Inyección: borrar «How to alter it» pone en rojo RF-2 en la T-8.
  Inyección vista: la guarda de texto es la de la T-8 (aún no existe); con un check provisional (seis `##` con contenido) borrar «## How to alter it» dio rojo (MISSING), restaurado y verde. Las dos versiones van seguidas, con un selector de anclas (#es, #en).

- [ ] **T-6 — Historia Astro y builds de la galería en `npm test`**
  Cubre: RF-5, RF-6 (en la galería)
  Archivos: `gallery/stories/Button.astro.stories.tsx`, `tests/global-setup.ts`
  Hecho cuando: la historia Astro muestra cada caso del JSON con su HTML y su código de uso debajo;
  el `globalSetup` construye `astro-render`, extrae el JSON y construye Storybook en paralelo con
  los consumidores, y entrega sus rutas; el tiempo de `npm test` se mide antes y después.
  Inyección: que el `globalSetup` no extraiga el JSON hace fallar `storybook build`, porque la
  historia Astro no encuentra el JSON.

- [ ] **T-7 — Guardas de historias, controles y casos Astro**
  Cubre: RF-1, RF-3, RF-5, RF-6
  Archivos: `tests/gallery.test.ts`
  Hecho cuando:
  - Cada export de las dos entradas tiene una historia por framework bajo `Button`.
  - Los `argTypes` de la historia React coinciden con el contrato.
  - El JSON tiene cada caso, con `museum-button--<variant>`, un nombre accesible no vacío y su
    código de uso con la variante correcta.
  Inyección: una variante nueva en una copia del contrato sin su caso Astro pone en rojo RF-5.

- [ ] **T-8 — Guardas de documentación, códigos de uso e imports**
  Cubre: RF-2, RF-7, RF-8, RF-9, RF-10
  Archivos: `tests/snippets.test.ts`
  Hecho cuando:
  - El MDX tiene las seis secciones con contenido.
  - Todos los códigos de uso (historia React, casos Astro y MDX) llevan los dos imports y solo
    props del contrato y clases `museum-*` o `my-button`.
  - El CSS de `my-button` aparece en la descripción del control y en «cómo alterarlo».
  - Ningún import de `gallery/` usa una ruta a un paquete, y todos resuelven.
  Inyección: un `import '../../packages/react/styles.css'` en una copia de `preview.ts` pone en rojo
  RF-10, y una clase `px-4` en un código de uso del MDX, RF-8.

- [ ] **T-9 — Los controles re-renderizan Button React**
  Cubre: RF-4
  Archivos: `tests/gallery-browser.test.ts`
  Hecho cuando: en Edge, sobre el Storybook construido y servido con `serve.ts`, cada arg
  (`variant`, `size`, `type`, `disabled`, texto, clase) cambia el atributo, la clase o el texto
  del `<button>`, en los dos temas; un texto vacío no da error. La validación lo repite a mano
  desde `npm run gallery`.
  Inyección: una historia que ignora `args.variant` pone en rojo el caso de `variant`.

- [x] **T-10 — Cerrar las marcas «pendiente» de la constitución y `AGENTS.md`**
  Cubre: RF-11
  Archivos: `tests/marks.test.ts`, `docs/constitution.md`, `AGENTS.md`
  Hecho cuando: el test une cada archivo en una línea y halla 0
  `pendientes? de la spec de arquitectura` fuera de `Changed:`. La enmienda nombra la galería, los
  paquetes y sus entradas, `npm run gallery` y la herramienta de versionado, `@s-ui/mono`, sin instalarla;
  lleva su entrada `Changed:`, la aprueba el dueño y va en su propio commit `docs:`.
  Inyección: el test, escrito antes de la enmienda, halla las 4 marcas y se pone en rojo.
  Inyección vista: 2026-10-22 · test escrito antes: rojo con 4 marcas (2 por archivo); tras la enmienda,
  re-añadir una marca en `AGENTS.md` (restaurado por ruta, mismo sha256) lo pone en rojo.
