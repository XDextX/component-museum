# Plan 004 — historia-button

**Approved:** 2026-10-22 · aprobado por el coordinator en la sesión autónoma que declaró el dueño ("trabaja y haz los commits"), con sus 3 respuestas (versionado, instalación, workspaces); el dueño corrige al vuelo

Parte de `spec.md` (aprobada, 11 RF) y de `notes.md`. Se apoya en lo que dejaron la 001, la 002 y
la 003:
- `npm test` con candado;
- los consumidores construidos en el `globalSetup`;
- Edge (`tests/lib/browser.ts`) y `tests/lib/serve.ts`;
- el contrato `contracts/button.contract.json`;
- los dos paquetes con su hoja única `styles/museum.css`.

Versiones comprobadas en npm el 2026-10-22.

## Decisiones del dueño (de `notes.md` y de la 003)

Respuestas del dueño del 2026-10-22 a las preguntas del plan:
- **Versionado:** `@s-ui/mono` 2.46.0, que lee Conventional Commits y versiona cada paquete.
  RF-11 lo nombra en la regla 6 de la constitución y en `AGENTS.md`.
- **Instalación de `@s-ui/mono`:** al publicar por primera vez, al cerrar la entrega 2. La 004 no
  añade la dependencia.
- **Workspaces de npm:** sí, `packages/*` y `gallery`.

Y de antes:

- La galería es **Storybook oficial**, solo para React. Astro se muestra prerenderizado: cada
  variante del contrato con su código de uso (regla 5, enmendada en c05740e).
- La documentación va en español y en inglés (regla 10). Hasta la 005, las dos versiones se
  muestran seguidas.
- La prop de clase tiene un control cerrado, «ninguna» o `my-button`, con su CSS a la vista.
  Descartados: eximirla de la regla 5, y un control de texto libre.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | Test que recorre los exports de las dos entradas y busca una historia por framework con el mismo título (`Button`). |
| RF-2 | Test que lee la página MDX de Button y exige las tres secciones en español y en inglés. |
| RF-3 | `argTypes` generados desde el contrato; un test importa la historia React y los compara con el contrato. |
| RF-4 | En Edge, sobre el Storybook construido, cada arg cambia el atributo, la clase o el texto del Button React. |
| RF-5 | Una página Astro de la galería renderiza cada variante, normal y `disabled`; un test comprueba el HTML extraído. |
| RF-6 | Cada render Astro lleva su código de uso, generado para esa variante. |
| RF-7 | `usageSnippet()` escribe siempre los dos imports; un test lee todos los códigos de uso. |
| RF-8 | El mismo test: solo props del contrato y clases del paquete o de ejemplo de esa historia. |
| RF-9 | El CSS de `my-button` está en la descripción del control y en la sección «cómo alterarlo». |
| RF-10 | Test que lee los imports de `gallery/` y exige el especificador `@component-museum/...`, y que resuelva. |
| RF-11 | Enmienda de la constitución y `AGENTS.md`, y un test que une cada archivo en una línea y no halla ninguna marca «pendiente». |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad |
|---|---|---|
| `package.json` (raíz) | modificado | Workspaces `packages/*` y `gallery`; script `gallery` (`storybook dev`); el `test` construye también la galería. |
| `gallery/package.json` | sí | La galería como workspace privado: depende de los dos paquetes por especificador y lleva Storybook. |
| `gallery/.storybook/main.ts`, `preview.ts` | sí | Configuración de Storybook (`@storybook/react-vite`) e import de la hoja por el especificador. |
| `gallery/stories/Button.react.stories.tsx` | sí | La historia React: `argTypes` desde el contrato y la clase de ejemplo con su CSS. |
| `gallery/stories/Button.astro.stories.tsx` | sí | La historia Astro: muestra el HTML prerenderizado de cada variante y su código de uso. |
| `gallery/stories/Button.mdx` | sí | La documentación: uso, construcción y cómo alterarlo, en español y en inglés. |
| `gallery/astro-render/` | sí | Un sitio Astro mínimo que renderiza cada variante del contrato, normal y `disabled`, con el componente real. |
| `gallery/scripts/extract-astro.mjs` | sí | Extrae el HTML de cada variante del build de `astro-render` a `gallery/generated/astro-button.json`, que es generado y no se versiona. |
| `gallery/lib/contract-args.ts` | sí | Lógica pura: `argTypes` desde el contrato y `usageSnippet()`. |
| `tests/contract-args.test.ts` | sí | La lógica pura de `contract-args.ts`. |
| `tests/gallery.test.ts` | sí | RF-1, RF-3, RF-5 y RF-6. |
| `tests/snippets.test.ts` | sí | RF-2, RF-7, RF-8, RF-9 y RF-10. |
| `tests/gallery-browser.test.ts` | sí | RF-4. |
| `tests/marks.test.ts` | sí | RF-11. |
| `tests/global-setup.ts` | modificado | Construye `astro-render` y Storybook, en paralelo con los consumidores, y entrega sus rutas. |
| `docs/constitution.md`, `AGENTS.md` | modificado | RF-11; en su propio commit `docs:`, aprobado por el dueño. |
| `.gitignore` | modificado | `gallery/storybook-static/`, `gallery/generated/`, `gallery/astro-render/dist/`. |

## 3. Lógica pura

```ts
// Un control por prop del contrato que no es evento: enumerados como lista cerrada, booleanos
// como interruptor, y la clase como lista cerrada con «ninguna» y las clases de ejemplo.
argTypesFromContract(contract: Contract, exampleClasses: Record<string, string>): ArgTypes
// El código de uso de una variante: el import del componente, el de la hoja y el marcado con solo
// las props que no tienen su valor por defecto.
usageSnippet(framework: 'react' | 'astro', args: Record<string, unknown>, contract: Contract): string
// Las variantes que hay que prerenderizar: cada valor de `variant`, normal y `disabled`.
astroCases(contract: Contract): { id: string; props: Record<string, unknown> }[]
```

## 4. Algoritmo

**Paquetes por especificador (RF-10).** Las workspaces de npm enlazan `packages/react` y
`packages/astro` en el `node_modules` de la raíz. La galería escribe
`import { Button } from '@component-museum/react'` e `import '@component-museum/react/styles.css'`.
El test de RF-10 lee cada import de `gallery/` (sin `node_modules`, `generated` ni builds):
- falla si uno apunta a un paquete con una ruta relativa o absoluta;
- falla si uno no resuelve desde `gallery/`;
- no mira a dónde resuelve, porque el paquete Astro publica su fuente.

**Historia React (RF-3, RF-4, RF-9).** `argTypes` sale de `argTypesFromContract`. El control de
clase tiene `options: ['', 'my-button']`, con la etiqueta «ninguna» para `''`. Un decorador
inyecta el CSS de `.my-button`, que no tiene capa. La descripción del control muestra ese mismo
CSS en un bloque de código.
- RF-3 se comprueba importando la historia en Vitest y comparando sus `argTypes` con el contrato.
- RF-4 abre en Edge el Storybook construido (`iframe.html?id=button-react--default&args=…`), un arg
  cada vez, y lee el atributo, la clase o el texto del `<button>`.
- Un texto vacío deja el Button sin texto y no da error.

**Historia Astro (RF-5, RF-6).**
1. `gallery/astro-render/src/pages/index.astro` importa el contrato y `@component-museum/astro`.
2. Por cada caso de `astroCases`, renderiza un `<Button>` real dentro de `<div id="case-…">`, con
   texto de ejemplo.
3. `astro build` genera el HTML.
4. `extract-astro.mjs` guarda en `gallery/generated/astro-button.json`, por caso, su `outerHTML` y
   su `usageSnippet('astro', …)`.
5. La historia Astro muestra cada caso, con su HTML y su código de uso debajo.

RF-5 falla si falta un caso, si su HTML no lleva `museum-button--<variant>` o si su nombre
accesible está vacío. RF-6 falla si un caso no tiene código de uso o si este nombra otra variante.
No se usa la Container API de Astro, porque es experimental.

**Documentación (RF-2).** `Button.mdx` tiene seis encabezados `##`:
- en español, «Uso», «Construcción» y «Cómo alterarlo»;
- en inglés, «Usage», «How it is built» y «How to alter it».

El test lee el MDX como texto, exige los seis y falla si una sección está vacía. «Cómo alterarlo»
enseña las tres vías de la 003: tokens, reglas sobre la clase y utilidades. Incluye el CSS de
`my-button` (RF-9).

**Códigos de uso (RF-7, RF-8).** Todos salen de `usageSnippet`: los de la historia React, los de
cada caso Astro y los del MDX, que el test extrae de sus bloques de código. El test exige los dos
imports. Falla ante una prop que no está en el contrato o una clase que no es `museum-*` ni
`my-button`.

**Marcas «pendiente» (RF-11).** Hoy hay cuatro, fuera de las entradas `Changed:`:
- constitución, regla 1;
- constitución, regla 6;
- `AGENTS.md`, «Verificar»;
- `AGENTS.md`, «Git».

La enmienda pone en su lugar:
- **Galería:** `gallery/`, Storybook.
- **Paquetes y entradas:** `@component-museum/react` y `@component-museum/astro`, cada uno con su
  `index`.
- **Comando de la galería:** `npm run gallery`.
- **Herramienta de versionado:** `@s-ui/mono` (decisión del dueño).

Lleva su entrada `Changed:`. El test de RF-11 une cada archivo en una sola línea y no debe hallar
ninguna `pendientes? de la spec de arquitectura` fuera de las entradas `Changed:`. Antes de la
enmienda halla 4.

**Builds en `npm test`.** El `globalSetup` construye `astro-render`, extrae el JSON y construye
Storybook (`storybook build`), en paralelo con los consumidores. El tiempo se mide en la T-6.

## 5. Interfaz

- **La galería:** `npm run gallery` abre Storybook. Hay dos historias bajo `Button`: React, con
  controles, y Astro, con las variantes prerenderizadas; más la página de documentación en los dos
  idiomas.
- **Los controles** son `variant`, `size`, `type`, `disabled`, el texto y la clase (`ninguna` o
  `my-button`). Junto al de clase se ve el CSS de `.my-button`.
- **Estados vacíos:** con un texto vacío, Button se ve sin texto. Un componente sin historia hace
  fallar RF-1; no hay pantalla vacía.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **Storybook 10.6.3 con `@storybook/react-vite`** (decisión del dueño). Vite ya está en el árbol (peer `vite ^5–^8`). | `@storybook/react-webpack5`: otro empaquetador, cuando los consumidores y Astro ya usan Vite. |
| **Workspaces de npm (`packages/*`, `gallery`)**, para que la galería importe por especificador (regla 1). | Dependencias `file:../packages/*` en la galería: el mismo enlace, sin que la raíz lo sepa. Seguir sin workspaces: la galería no podría escribir `@component-museum/...`. Los consumidores externos siguen fuera del repo, así que el enlace en la raíz no les llega (001, RF-4 y RF-5). |
| **Astro prerenderizado con un sitio Astro mínimo y su `dist/`**, como en la 002. | La Container API: experimental y cambia en versiones menores. `@storybook-astro/framework`: descartado en `notes.md`. |
| **`argTypes` y códigos de uso generados desde el contrato.** | Escribirlos a mano: se desincronizan del contrato sin que nadie lo vea. |
| **Documentación en MDX, comprobada como texto.** | Comprobarla en el Storybook renderizado: más lento y frágil, para algo que es texto. |
| **RF-4 con los args por URL de Storybook** (`iframe.html?args=`), que usan el mismo camino que los controles. | Pulsar los controles del panel con Playwright: frágil ante cambios de la interfaz de Storybook. La comprobación a mano desde el servidor de desarrollo, que exige «Hecho cuando», se hace en la validación. |
| **Cada tarea paralela en su propio worktree.** Cada una tiene su rama `spec/004-historia-button-T-n`, su `node_modules` y su candado. Al cerrar cada ola, la sesión de git mergea las ramas en `spec/004-historia-button`. Coste: un `npm ci` por worktree (1–2 min y unos 500 MB cada uno), y merges al final de cada ola. Los archivos compartidos (`package.json`, `package-lock.json`, `tests/global-setup.ts`) los toca una sola tarea por ola. | Todas en el mismo checkout, como en la 003: esperas de hasta 11 min por el candado de `npm test` y choques de archivos temporales. Todo en serie: sin esperas, pero unas 3 veces más lento en tiempo real. |

**Dependencias de desarrollo nuevas (regla 9).** Todas son de `gallery/`, nunca de un paquete:
- `storybook` 10.6.3 — la galería (decisión del dueño): historias, controles y documentación.
- `@storybook/react-vite` 10.6.3 — renderiza las historias React con Vite, que ya usan los
  consumidores.
- `@storybook/addon-docs` 10.6.3 — la página MDX de documentación (RF-2).
- `@s-ui/mono` no se instala en esta spec: se nombra y se instala al cerrar la entrega 2
  (decisión del dueño).

## 7. Estrategia de tests

- **Como dato:** `argTypesFromContract`, `usageSnippet` y `astroCases`; las historias importadas
  en Vitest (RF-1, RF-3); el MDX como texto (RF-2, RF-9); el JSON prerenderizado (RF-5, RF-6); los
  imports (RF-10); las marcas (RF-11).
- **Como output renderizado, en Edge:** RF-4, sobre el Storybook construido y servido con
  `serve.ts`, con viewport explícito y en los dos temas.
- **Inyección por tarea:** cada tarea tiene su línea «Inyección:», y su commit dice cuál se vio en
  rojo (regla 8). Las inyecciones van en copias o en la rama del worktree, nunca en `main`.
- **Proporción:** 10 tareas para 11 RF. La T-10 es la enmienda de documentos.
