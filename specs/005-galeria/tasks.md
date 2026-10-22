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

- [ ] **T-4 — Página de la matriz**
  Cubre: RF-4 (se muestra en la galería)
  Archivos: `gallery/stories/Matrix.mdx`
  Hecho cuando: la página lee las entradas por especificador con `?raw` y los contratos con
  `import.meta.glob`, y pinta una tabla con cabeceras `scope`, «✓» o «falta», y un texto accesible
  por celda; sin componentes, muestra «Sin componentes»; `storybook build` termina en 0.
  Inyección: leer la entrada de React por `../../packages/react/...` en una copia pone en rojo
  RF-10 de la 004, por usar una ruta en lugar del especificador.

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

- [ ] **T-6 — Idioma en el navegador**
  Cubre: RF-1, RF-5
  Archivos: `tests/gallery-i18n.test.ts`
  Hecho cuando:
  - En Edge, con un contexto sin `localStorage`, la página de documentación muestra los tres
    títulos en español y ninguno en inglés.
  - Pulsar «English» los cambia y oculta los españoles.
  - Recargar mantiene el inglés.
  Inyección: que `initialLanguage` devuelva `en` por defecto pone en rojo RF-5.

- [ ] **T-7 — Tema y accesibilidad de los selectores en el navegador**
  Cubre: RF-3, NFR de accesibilidad
  Archivos: `tests/gallery-theme.test.ts`
  Hecho cuando:
  - Con `globals=theme:dark`, Button da los tokens oscuros de la 003 en las historias React y
    Astro, y con `theme:light`, los claros.
  - Los botones del idioma, el selector de tema de la barra y la tabla de la matriz se alcanzan con
    `Tab` y tienen nombre accesible.
  Inyección: quitar el `title` del global `theme` (en una copia de la configuración, sobre un build
  aparte) deja el selector sin nombre accesible, y el test se pone en rojo.

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 ∥ T-3 | — (ya no hay que esperar a `gallery/` en `tsc`) |
| 2 | T-4 ∥ T-5 ∥ T-6 | La T-4 necesita la matriz (T-1); la T-5 y la T-6, el MDX con `<Lang>` (T-2). |
| 3 | T-7 | Necesita el tema (T-3) y la página de la matriz (T-4). |
