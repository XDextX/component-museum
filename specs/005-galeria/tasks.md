# Tareas 005 — galeria

**Approved:** 2026-10-22 · aprobado por el coordinator en la sesión autónoma que declaró el dueño ("trabaja y haz los commits"); el dueño corrige al vuelo
Ajustado tras mergear las correcciones de la 004 (5ded4ac): la antigua T-1 (`gallery/` en `tsc`) y el
CSS de `my-button` de un solo origen ya están hechos; las tareas se renumeran de T-1 a T-7.

Cómo se trabaja en paralelo (plan, bloque 6): cada tarea de una ola va en su propio worktree, con
su rama `spec/005-galeria-T-n` y su `node_modules`. Al cerrar la ola, la sesión de git mergea las
ramas en `spec/005-galeria`. Se borra `node_modules` antes de quitar cada worktree. Solo la tarea
indicada toca cada archivo compartido:
- `Button.mdx`: la T-2 y después la T-5;
- `gallery/tsconfig.json` y `tests/snippets.test.ts`: la T-2.

- [x] **T-1 — Matriz de frameworks como dato, con un solo parser de entradas**
  Cubre: RF-4
  Archivos: `gallery/lib/matrix.ts` (`entryExports`, `frameworkMatrix`), `tests/matrix.test.ts`,
  `tests/packages.test.ts` (importa `entryExports` en lugar de su copia)
  Hecho cuando: con las entradas reales, Button es `present` en los dos frameworks; los tests de
  `entryExports` de la 002 siguen en verde; `tsc --noEmit -p gallery` termina en 0.
  Inyección: una copia en disco de la entrada de Astro sin el export de Button deja la celda
  `Button × astro` en `missing`; con el test esperando `present`, se pone en rojo.
  Inyección vista: `frameworkMatrix` forzada a `present` en una copia de `matrix.ts` pone en rojo «marks Button x astro missing…» en `tests/matrix.test.ts`; restaurado con el mismo sha256.

- [x] **T-2 — Selector de idioma**
  Cubre: RF-1 y RF-5 (el contenido; los tests en el navegador son la T-6)
  Archivos: `gallery/lib/Lang.tsx` (con `initialLanguage`), `gallery/tsconfig.json` (`include` con
  `lib/**/*.tsx`), `gallery/stories/Button.mdx`, `tests/snippets.test.ts`
  Hecho cuando:
  - El MDX tiene `<LanguageSwitch />` y cada lengua dentro de `<Lang>`, en lugar de las anclas.
  - `initialLanguage` da `es` sin preferencia, o si la guardada no es válida.
  - `tests/snippets.test.ts` corta las lenguas por `<Lang>` y sigue en verde.
  - `tsc --noEmit -p gallery` revisa `Lang.tsx`, y `storybook build` termina en 0.
  Inyección: una copia del MDX sin `<Lang lang="en">` pone en rojo RF-2 de la 004 en
  `snippets.test.ts`.
  Inyección vista: el test leyendo una copia del MDX sin `<Lang lang="en">` → 3 en rojo, entre ellos
  RF-2 de la 004 («en has its three sections»: `expected [] to deeply equal [ 'Usage', …`), exit 1;
  test restaurado, idéntico según `cmp`, y el MDX fuente sin tocar. Sin `LanguageProvider`: un
  almacén de módulo con `useSyncExternalStore` comparte la lengua entre el selector y cada `<Lang>`.
  Comprobado a mano en Edge sobre el build: español por defecto, «English» pasa a inglés con
  `aria-pressed` y lo guarda en `museum:lang`, y al recargar sigue en inglés.
  Con una sola lengua visible, el test RF-9 de la 004 (`gallery-browser.test.ts`) elige cada
  idioma con el selector antes de buscar el CSS de ejemplo; antes lo esperaba dos veces a la vez.

- [x] **T-3 — Selector de tema en la barra de Storybook**
  Cubre: RF-3 (el contenido; el test es la T-7)
  Archivos: `gallery/.storybook/preview.ts` (sin JSX: `createElement`)
  Hecho cuando: el global `theme` (Sistema, Claro, Oscuro), con su `title`, sale en la barra; su
  decorador pone `data-theme` alrededor de cada historia, sin atributo con «Sistema»; el import de
  la hoja por especificador sigue ahí (004, RF-10); `tsc --noEmit -p gallery` y `storybook build`
  terminan en 0.
  Inyección: un decorador que olvida el `<div>` para la historia Astro deja sus tokens claros con
  `theme:dark`, y la T-7 se pone en rojo.
  Archivo añadido: `tests/gallery-preview.test.ts` (decorador y global, como dato).
  Inyección vista: una copia de `preview.ts` cuyo decorador no pone `data-theme`, importada por
  `gallery-preview.test.ts` solo durante la prueba → rojo en «wraps the story in data-theme», exit 1;
  test restaurado, idéntico según `cmp`, `preview.ts` sin tocar y la copia borrada. La primera
  inyección registrada editaba el propio `preview.ts`; se repitió sobre la copia.
  Ajustes al cerrarla: las opciones de la barra pasan a «Sistema, Claro, Oscuro» (título «Tema»),
  como pide la tarea; y el `tsconfig.json` raíz incluye `gallery/env.d.ts`, porque el test importa
  `preview.ts`, que importa la hoja (sin ello, `tsc --noEmit` daba TS2882 y cortaba `npm test`).

- [x] **T-4 — Página de la matriz**
  Cubre: RF-4 (se muestra en la galería)
  Archivos: `gallery/stories/Matrix.mdx`
  Hecho cuando: la página lee las entradas por especificador con `?raw` y los contratos con
  `import.meta.glob`, y pinta una tabla con cabeceras `scope`, «✓» o «falta», y un texto accesible
  por celda; sin componentes, muestra «Sin componentes»; `storybook build` termina en 0.
  Inyección: leer la entrada de React por `../../packages/react/...` en una copia pone en rojo
  RF-10 de la 004, por usar una ruta en lugar del especificador.
  Inyección vista: Matrix.mdx leyendo `../../packages/react/dist/index.js?raw` (restaurado, mismo
  sha256) puso en rojo RF-10 de la 004 («path into packages/»). Un `@component-museum/nope?raw`
  rompe el build de Storybook (globalSetup), también rojo. La guarda de RF-10 de la 004 ahora
  ignora la query `?raw` al resolver (autorizado por el dueño). `npm test`: 24 archivos, 215
  pasan, 1 saltado, 2m21s.

- [x] **T-5 — El código de uso sigue a los controles**
  Cubre: RF-2
  Archivos: `gallery/stories/Button.mdx` (`<Canvas>` y `<Controls>` de la historia React, fuera de
  las lenguas), `tests/gallery-snippet.test.ts`
  Hecho cuando: en Edge, en la página de documentación, cambiar `variant` a `secondary` en los
  controles cambia el código de uso a `variant="secondary"`, y elegir `my-button` escribe
  `className="my-button"`; el código de uso sigue llevando los dos imports.
  Inyección: una historia con el `source.transform` quitado (en la rama del worktree) deja el código
  de uso sin los imports ni la variante, y el test se pone en rojo.
  Inyección vista: copias del MDX y de la historia React sin su `source.transform`, en un
  Storybook aparte (`gallery/.inject-T5/`, borrado después; la fuente sin tocar) → los 3 tests en
  rojo: el código de uso pasa a `<r className="">` (nombre minificado) y pierde los imports,
  exit 1; test restaurado, idéntico según `cmp`. Riesgo del plan comprobado: Storybook 10 vuelve a
  ejecutar la transformación al mover un control de la página de documentación, así que no hace
  falta un componente de código propio. El código del `<Canvas>` es el `<pre>` junto a la historia.

- [x] **T-6 — Idioma en el navegador**
  Cubre: RF-1, RF-5
  Archivos: `tests/gallery-i18n.test.ts`
  Hecho cuando:
  - En Edge, con un contexto sin `localStorage`, la página de documentación muestra los tres
    títulos en español y ninguno en inglés.
  - Pulsar «English» los cambia y oculta los españoles.
  - Recargar mantiene el inglés.
  Inyección: que `initialLanguage` devuelva `en` por defecto pone en rojo RF-5.
  Inyección vista: `initialLanguage` devolviendo `en` por defecto (sobre `Lang.tsx`, restaurado con el mismo sha256) → `tests/gallery-i18n.test.ts` en rojo en la aserción de títulos en español, exit 1.

- [x] **T-7 — Tema y accesibilidad de los selectores en el navegador**
  Cubre: RF-3, NFR de accesibilidad
  Archivos: `tests/gallery-theme.test.ts`
  Hecho cuando:
  - Con `globals=theme:dark`, Button da los tokens oscuros de la 003 en las historias React y
    Astro, y con `theme:light`, los claros.
  - Los botones del idioma, el selector de tema de la barra y la tabla de la matriz se alcanzan con
    `Tab` y tienen nombre accesible.
  Inyección: quitar el `title` del global `theme` (en una copia de la configuración, sobre un build
  aparte) deja el selector sin nombre accesible, y el test se pone en rojo.
  Inyección vista: la del plan no muerde. Storybook 10 no lee el `title` de la barra para el nombre
  accesible del botón: sale de la `description` del global, y sin ella, de la clave interna («theme
  Sistema»). `preview.ts` gana `description: 'Tema de la galería'` y el test exige ese nombre. Una copia
  de la configuración sin la `description`, en un Storybook aparte (`gallery/.inject-T7/`, borrado
  después) → rojo con «theme Sistema», exit 1; test restaurado, idéntico según `cmp`, fuente sin tocar.
  Ajustes: la tabla de la matriz no tenía nombre ni se alcanzaba con `Tab`; `Matrix.mdx` le da un
  `<caption>` y la envuelve en una región con nombre y `tabIndex={0}`. La barra de Storybook es una
  sola parada de `Tab` que se recorre con las flechas: el test llega así al selector de tema. Además
  comprueba la regla 7 en cada tema y en las dos historias: texto ≥ 4.5:1 y anillo ≥ 3:1 frente al halo.
  Corrección: el `afterAll` de `gallery-i18n.test.ts` (y antes el de `cascade.test.ts`) pasó a veces
  de los 10 s de `hookTimeout`. No era el servidor (`closeAllConnections()`, 0-5 ms) ni el orden, ni
  nada propio de `gallery-i18n`: medido dentro de `npm test`, cerrar Edge tarda 0,8-3,7 s, frente a
  0,1-0,4 s en aislamiento, cuando varios ficheros cierran el suyo a la vez (cinco workers en 5 s), y
  cerrar los contextos, hasta 1,9 s. Arreglo: los 7 `afterAll` que cierran Edge usan
  `closeBrowserAndServers()` (`tests/lib/browser.ts`: contextos, Edge y servidores, en ese orden, y
  avisa del paso que siga en marcha a los 10 o 20 s), y `vitest.config.ts` sube `hookTimeout` a
  30 s con la medida en su comentario. Tres `npm test` seguidos lanzados como el coordinador
  (`npm test > log 2>&1` desde Git Bash): exit 0 en los tres (99 s, 111 s y 102 s), 230 tests. Una
  tanda anterior falló por npm, no por esto: `@volar/typescript@2.4.29` se publicó 4 s después de
  que la instalación de `@astrojs/check` lo pidiera (ETARGET).
  Corrección tras validación (ronda 1): con «Oscuro», el texto propio de la historia Button/Astro
  (`<h3>` de cada caso y `<code>` del código de uso) quedaba negro sobre `#111827`, a 1,18:1; el
  decorador pintaba el fondo con `--museum-surface` pero no daba color. Se arregla en la galería, no
  en el paquete: el decorador de `preview.ts` da al lienzo `color-scheme` (el del tema, o
  `light dark` con «Sistema») y `color: CanvasText`. Medido: 21:1 en claro y 17,74:1 en oscuro, con
  «Sistema» igual bajo cada preferencia. `gallery-theme.test.ts` lo comprueba en Edge para los cuatro
  casos. Inyección vista: una copia de la configuración sin `color: CanvasText`, en un Storybook
  aparte → los dos casos oscuros en rojo a 1,18:1, exit 1; test y `preview.ts` con el mismo sha256.

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 ∥ T-3 | — (ya no hay que esperar a `gallery/` en `tsc`) |
| 2 | T-4 ∥ T-5 ∥ T-6 | La T-4 necesita la matriz (T-1); la T-5 y la T-6, el MDX con `<Lang>` (T-2). |
| 3 | T-7 | Necesita el tema (T-3) y la página de la matriz (T-4). |
