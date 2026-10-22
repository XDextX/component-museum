# Plan 005 — galeria

**Approved:** 2026-10-22 · aprobado por el coordinator en la sesión autónoma que declaró el dueño ("trabaja y haz los commits"); el dueño corrige al vuelo
Ajustado tras mergear las correcciones de la 004 (5ded4ac): sin la antigua T-1 ni la parte del CSS de un
solo origen, que ya están hechas; quedan 7 tareas.

Parte de `spec.md` (aprobada, 5 RF) y de `notes.md`. Se apoya en lo que dejó la 004:
- `gallery/` con Storybook 10.6.3 (`@storybook/react-vite`, `@storybook/addon-docs`);
- las historias `Button/React` (controles desde el contrato) y `Button/Astro` (casos
  prerenderizados);
- `Button.mdx`, bilingüe, con las dos lenguas seguidas y separadas por anclas;
- `gallery/lib/contract-args.ts`;
- el `globalSetup`, que construye la galería;
- `serve.ts` y Edge.

Versiones comprobadas en npm el 2026-10-22: `storybook` y `@storybook/addon-docs` 10.6.3.

## Decisiones del dueño (de `notes.md`)

- Documentación en español y en inglés, con selector de idioma (RF-1); por defecto, español (RF-5).
- El código de uso refleja en vivo los valores de los controles (RF-2).

## Lecciones de la 004 que aplica este plan

- **Un solo origen para lo que se escribe dos veces.** El CSS de `my-button` ya tiene uno,
  `gallery/lib/example-classes.ts`, desde las correcciones de la 004 (5ded4ac). Falta el parser de
  exports de las entradas, que está dentro de `tests/packages.test.ts`: pasa a
  `gallery/lib/matrix.ts`, y lo usan el test de la 002 y la matriz.
- **`gallery/` ya entra en la comprobación de tipos** (`tsc --noEmit -p gallery` y `astro check`
  de `gallery/astro-render`, en `npm test`). Su `include` solo cubre `.storybook/*.ts` y
  `lib/**/*.ts`. Por eso el tema se escribe en `preview.ts` con `createElement`, sin JSX, y solo la
  T-2 amplía el `include` a `lib/**/*.tsx`, para `Lang.tsx`.
- **Las inyecciones van sobre copias en disco** (de una entrada, del MDX o de la configuración),
  nunca solo en memoria, cuando el test lee archivos.
- **Cada tarea paralela va en su propio worktree.** Se borra su `node_modules` antes de quitar el
  worktree.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | Selector de idioma en la página de documentación: solo se pinta la lengua elegida. Test en Edge. |
| RF-2 | La página de documentación muestra la historia React con sus controles (`<Canvas>` y `<Controls>`). Su código de uso sale de `usageSnippet` con los args actuales. Test en Edge. |
| RF-3 | Selector de tema en la barra de Storybook; un decorador pone `data-theme` alrededor de cada historia, React y Astro. Test en Edge. |
| RF-4 | `frameworkMatrix()`, una función pura, calcula la matriz desde el texto de las entradas; una página MDX la muestra. Test como dato, con copias de las entradas. |
| RF-5 | Sin preferencia guardada, el selector arranca en español. Test en Edge con un contexto nuevo. |

El NFR de accesibilidad lo comprueba un test en Edge: el selector de idioma, el de tema y la
matriz se usan con teclado y tienen nombre accesible. Los casos límite (clase en el código de uso,
Astro sin controles, componente que falta) quedan cubiertos por RF-2 y RF-4.

## 2. Archivos

| Archivo | Nuevo | Responsabilidad |
|---|---|---|
| `gallery/tsconfig.json` | modificado | Su `include` gana `lib/**/*.tsx`, para `Lang.tsx` (T-2). |
| `gallery/lib/matrix.ts` | sí | `entryExports()`, sacado de `packages.test.ts`, y `frameworkMatrix()`. |
| `gallery/lib/Lang.tsx` | sí | `LanguageProvider`, `LanguageSwitch` y `Lang`: elige el idioma, lo guarda y pinta solo esa lengua. |
| `gallery/.storybook/preview.ts` | modificado | El global `theme` (sistema, claro, oscuro) en la barra y el decorador `data-theme`, con `createElement`, sin JSX, para seguir dentro del `include`. |
| `gallery/stories/Button.mdx` | modificado | Las lenguas dentro de `<Lang>` (T-2), y `<Canvas>` más `<Controls>` de la historia React (T-5). El CSS de ejemplo ya sale de `example-classes.ts`. |
| `gallery/stories/Matrix.mdx` | sí | La matriz: lee las entradas por especificador con `?raw` y los contratos con `import.meta.glob`. |
| `tests/packages.test.ts` | modificado | Usa `entryExports` de `gallery/lib/matrix.ts`. |
| `tests/snippets.test.ts` | modificado | Corta las lenguas por `<Lang lang="…">` en lugar de por las anclas `<a id>`. |
| `tests/matrix.test.ts` | sí | RF-4. |
| `tests/gallery-i18n.test.ts` | sí | RF-1 y RF-5. |
| `tests/gallery-theme.test.ts` | sí | RF-3 y el NFR de accesibilidad. |
| `tests/gallery-snippet.test.ts` | sí | RF-2. |

## 3. Lógica pura

```ts
// Los exports de valor de una entrada: `export { A, default as B }` sí; `export type` no.
entryExports(source: string): string[]
type Cell = 'present' | 'missing'
// Por componente (de los contratos) y framework, si su entrada lo exporta.
frameworkMatrix(entries: Record<Framework, string>, components: string[]): Record<string, Record<Framework, Cell>>
// La lengua inicial: la guardada si es 'es' o 'en'; si no, 'es' (RF-5).
initialLanguage(saved: string | null): 'es' | 'en'
```

## 4. Algoritmo

**Idioma (RF-1, RF-5).** `Button.mdx` envuelve cada lengua en `<Lang lang="es">…</Lang>` y
`<Lang lang="en">…</Lang>`, con el Markdown dentro y líneas en blanco a los dos lados. Arriba,
`<LanguageSwitch />` pinta dos botones, «Español» y «English», con `aria-pressed`. Al pulsar uno,
la lengua se guarda en `localStorage` (`museum:lang`) y `Lang` solo pinta la elegida. La lengua
inicial sale de `initialLanguage(localStorage)`. Si `localStorage` no está disponible, se queda en
español. El test de la 004 sigue leyendo el MDX como texto: las seis secciones siguen ahí, y lo
único que cambia es dónde corta las lenguas.

**Código de uso en vivo (RF-2).** `Button.mdx` añade, fuera de las dos lenguas,
`<Canvas of={ReactStories.Default} sourceState="shown" />` y `<Controls of={ReactStories.Default} />`.
La historia ya transforma su código con `usageSnippet('react', ctx.args, contract)`, y Storybook
vuelve a ejecutar esa transformación con los args que cambian los controles de la página. Al
elegir `my-button`, el código de uso escribe `className="my-button"`, que la 004 admite (RF-8). En
Astro no hay controles: cada caso conserva su código de uso fijo (004, RF-6).

**Tema (RF-3).** `preview.ts` declara el global `theme`: «Sistema», «Claro» y «Oscuro», en la
barra de herramientas de Storybook, que es parte del núcleo de la versión 10. Un decorador envuelve
cada historia en un `<div>`: con `data-theme="light"` o `"dark"`, o sin el atributo con «Sistema».
La historia Astro pinta su HTML dentro de ese `<div>`, así que hereda el tema igual.

**Matriz (RF-4).** `Matrix.mdx`:
1. Importa `@component-museum/react?raw` y `@component-museum/astro?raw`: el texto de cada entrada,
   por su especificador, como pide la regla 1.
2. Toma los nombres de los contratos con
   `import.meta.glob('../../contracts/*.contract.json', { eager: true })`.
3. Pinta una tabla, `<table>` con `<th scope>`, con `frameworkMatrix(...)`: «✓» o «falta» por
   celda, y un texto accesible en cada una.

El test de RF-4 copia las dos entradas a un temporal. En la copia de la de Astro quita el export de
Button, y espera que `frameworkMatrix` marque `Button × astro` como `missing`.

**Comprobación de tipos.** `npm test` ya corre `tsc --noEmit -p gallery` (desde la 004). Revisa
historias, librería y configuración, y con la T-2 también `Lang.tsx`. El MDX no entra: lo compila
Storybook en su build, que ya está en el `globalSetup`.

## 5. Interfaz

- **Página «Button/Documentation»:**
  - Arriba, «Español | English». Empieza en español y recuerda la elección.
  - Debajo, Button React con sus controles y su código de uso, que cambia al mover un control.
  - Luego, las tres secciones en la lengua elegida.
- **Barra de Storybook:** un selector «Tema» con Sistema, Claro y Oscuro. Cambia las historias
  React y Astro.
- **Página «Matriz»:** una fila por componente y una columna por framework. «Falta» donde la entrada
  no lo exporta.
- **Estados vacíos:**
  - Sin componentes, la matriz muestra solo la cabecera y el texto «Sin componentes», y no da error.
  - Sin `localStorage`, el idioma es el español y no se guarda.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **Selector de idioma propio en el MDX** (`Lang.tsx`), sin addon. Storybook no traduce la documentación. | Un addon de i18n: una dependencia más (regla 9) para dos botones. Un global en la barra: el MDX no lee los globales de forma estable en la vista de documentación. |
| **El tema como global del núcleo de Storybook 10**, con un decorador `data-theme`. | `@storybook/addon-themes`: una dependencia nueva para lo que un global y un decorador ya hacen. |
| **`<Canvas>` y `<Controls>` en el MDX**, con la transformación de código que ya tiene la historia. | Un componente de código propio enganchado a los args: duplica lo que Storybook ya hace con `usageSnippet`. |
| **Matriz calculada en la página, desde el texto de las entradas** (`?raw`, por especificador). | Un script que la genere a JSON: otro paso de build y otro archivo generado. Leer `packages/*/` por ruta: rompe la regla 1. |
| **`entryExports` con un solo origen** (lección de la 004; el CSS de ejemplo ya lo tiene). | Dejar dos copias con un test de igualdad, como en la 004: cada cambio se hace dos veces. |
| **Cada tarea paralela en su propio worktree**, mergeado al cerrar la ola. Se borra `node_modules` antes de quitar el worktree. Coste: un `npm ci` por worktree (1–2 min). | El mismo checkout: esperas por el candado y choques de archivos temporales (003 y 004). |

**Dependencias (regla 9).** Ninguna nueva: `Canvas`, `Controls` y `Source` vienen de
`@storybook/addon-docs`, ya instalado, y la barra de herramientas es parte del núcleo de Storybook.

## 7. Estrategia de tests

- **Como dato:** `frameworkMatrix`, `entryExports` (que sigue cubierto por el test de la 002) e
  `initialLanguage`.
- **Como output renderizado, en Edge, sobre el Storybook construido:**
  - RF-1, RF-5 y RF-2 en la página de documentación (`iframe.html?viewMode=docs&id=…`), con un
    contexto nuevo para RF-5;
  - RF-3 con `globals=theme:dark` o `theme:light`;
  - el NFR de accesibilidad, con `Tab` y nombres accesibles, en la página y en la barra del gestor.
- **La comprobación a mano** desde `npm run gallery`, en los dos temas, la lista la validación.
- **Inyección por tarea:** cada tarea tiene su línea «Inyección:», hecha sobre copias en disco o en
  la rama del worktree, y su commit dice cuál se vio en rojo (regla 8).
- **Proporción:** 7 tareas para 5 RF.
