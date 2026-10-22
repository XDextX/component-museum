# Tareas 005 — galeria

**Approved:** 2026-10-22 · aprobado por el coordinator en la sesión autónoma que declaró el dueño ("trabaja y haz los commits"); el dueño corrige al vuelo

Cómo se trabaja en paralelo (plan, bloque 6): cada tarea de una ola va en su propio worktree, con
su rama `spec/005-galeria-T-n` y su `node_modules`. Al cerrar la ola, la sesión de git mergea las
ramas en `spec/005-galeria`. Se borra `node_modules` antes de quitar cada worktree. Solo la tarea
indicada toca cada archivo compartido:
- `Button.mdx`: la T-3 y después la T-6;
- `tsconfig.json`: la T-1;
- `tests/snippets.test.ts`: la T-3.

- [ ] **T-1 — Meter `gallery/` en la comprobación de tipos**
  Cubre: lección de la 004 (tarea mecánica)
  Archivos: `tsconfig.json` (`gallery/**/*.ts`, `*.tsx`, tipos de cliente de Vite), los arreglos de
  tipos que salgan en `gallery/lib/` y `gallery/stories/*.tsx` (sin tocar `.storybook/`, que es de la
  T-4)
  Hecho cuando: `tsc --noEmit` revisa `gallery/` y termina en 0; `npm test` sigue en 0.
  Inyección: una copia de `gallery/lib/contract-args.ts` con `const n: number = 'x'` hace que `tsc`
  termine en distinto de 0.

- [ ] **T-2 — Matriz de frameworks como dato, con un solo parser de entradas**
  Cubre: RF-4
  Archivos: `gallery/lib/matrix.ts` (`entryExports`, `frameworkMatrix`), `tests/matrix.test.ts`,
  `tests/packages.test.ts` (importa `entryExports` en lugar de su copia)
  Hecho cuando: con las entradas reales, Button es `present` en los dos frameworks; los tests de
  `entryExports` de la 002 siguen en verde.
  Inyección: una copia en disco de la entrada de Astro sin el export de Button deja la celda
  `Button × astro` en `missing`; con el test esperando `present`, se pone en rojo.

- [ ] **T-3 — Selector de idioma y CSS de ejemplo con un solo origen**
  Cubre: RF-1 y RF-5 (el contenido; los tests en el navegador son la T-7), y la lección de la 004
  Archivos: `gallery/lib/Lang.tsx` (con `initialLanguage`), `gallery/lib/example-classes.ts`,
  `gallery/stories/Button.mdx`, `gallery/stories/Button.react.stories.tsx`,
  `tests/snippets.test.ts`
  Hecho cuando:
  - El MDX tiene `<LanguageSwitch />` y cada lengua dentro de `<Lang>`.
  - El CSS de `my-button` sale de `example-classes.ts` en la historia y en el MDX (`<Source>`).
  - `initialLanguage` da `es` sin preferencia, o si la guardada no es válida.
  - `tests/snippets.test.ts` corta las lenguas por `<Lang>`, comprueba el import del CSS de ejemplo
    y sigue en verde.
  - `storybook build` termina en 0.
  Inyección: una copia del MDX sin `<Lang lang="en">` pone en rojo RF-2 de la 004 en
  `snippets.test.ts`.

- [ ] **T-4 — Selector de tema en la barra de Storybook**
  Cubre: RF-3 (el contenido; el test es la T-8)
  Archivos: `gallery/.storybook/preview.tsx` (renombrado desde `preview.ts`)
  Hecho cuando: el global `theme` (Sistema, Claro, Oscuro) sale en la barra, y su decorador pone
  `data-theme` alrededor de cada historia, sin atributo con «Sistema»; el import de la hoja por
  especificador sigue ahí (004, RF-10); `storybook build` termina en 0.
  Inyección: un decorador que olvida el `<div>` para la historia Astro deja sus tokens claros con
  `theme:dark`, y la T-8 se pone en rojo.

- [ ] **T-5 — Página de la matriz**
  Cubre: RF-4 (se muestra en la galería)
  Archivos: `gallery/stories/Matrix.mdx`
  Hecho cuando: la página lee las entradas por especificador con `?raw` y los contratos con
  `import.meta.glob`, y pinta una tabla con cabeceras `scope`, «✓» o «falta», y un texto accesible
  por celda; sin componentes, muestra «Sin componentes»; `storybook build` termina en 0.
  Inyección: leer la entrada de React por `../../packages/react/...` en una copia pone en rojo
  RF-10 de la 004, por usar una ruta en lugar del especificador.

- [ ] **T-6 — El código de uso sigue a los controles**
  Cubre: RF-2
  Archivos: `gallery/stories/Button.mdx` (`<Canvas>` y `<Controls>` de la historia React, fuera de
  las lenguas), `tests/gallery-snippet.test.ts`
  Hecho cuando: en Edge, en la página de documentación, cambiar `variant` a `secondary` en los
  controles cambia el código de uso a `variant="secondary"`, y elegir `my-button` escribe
  `className="my-button"`; el código de uso sigue llevando los dos imports.
  Inyección: una historia con el `source.transform` quitado (en la rama del worktree) deja el código
  de uso sin los imports ni la variante, y el test se pone en rojo.

- [ ] **T-7 — Idioma en el navegador**
  Cubre: RF-1, RF-5
  Archivos: `tests/gallery-i18n.test.ts`
  Hecho cuando:
  - En Edge, con un contexto sin `localStorage`, la página de documentación muestra los tres
    títulos en español y ninguno en inglés.
  - Pulsar «English» los cambia y oculta los españoles.
  - Recargar mantiene el inglés.
  Inyección: que `initialLanguage` devuelva `en` por defecto pone en rojo RF-5.

- [ ] **T-8 — Tema y accesibilidad de los selectores en el navegador**
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
| 1 | T-1 ∥ T-2 | — |
| 2 | T-3 ∥ T-4 ∥ T-5 | La T-3 y la T-4 necesitan `gallery/` en `tsc` (T-1); la T-5, la matriz (T-2). |
| 3 | T-6 ∥ T-7 ∥ T-8 | La T-6 y la T-7 necesitan el MDX con `<Lang>` (T-3); la T-8, el tema y la matriz (T-4 y T-5). |
