# Notas de la 015 — addon-vitest

## Numeración y entrega

- Es la 015 para no renumerar la entrega 4 (012 Checkbox, 013 RadioGroup, 014 Select).
- Abre la **entrega 5, herramientas de la galería**, y se implementa después de la entrega 4. No
  toca ningún paquete: no cambia lo que se publica.
- Su rama se corta cuando toque, de la última rama de la entrega 4 o de `main` si ya está mergeada
  (`AGENTS.md`).

## Respuestas del dueño (2026-10-23)

- Los tests de historia van dentro de `npm test` (RF-2); decidido por el dueño.
- Entra también `@storybook/addon-a11y`; decidido por el dueño. No cabía en 100 líneas: va en la
  **016-addon-a11y**, también de la entrega 5, que depende de esta.
- La 015 queda aprobada para implementarse después de la entrega 4; decidido por el dueño.

## Versiones y lo que arrastra (consultado el 2026-10-23)

Fuente: `npm view <paquete>@<versión>` en el registro de npm, y la documentación oficial
(storybook.js.org/docs/writing-tests/integrations/vitest-addon y
vitest.dev/config/browser/playwright).

| Paquete | Versión | Por qué | Lo que trae |
|---|---|---|---|
| `@storybook/addon-vitest` | 10.6.3 | Igual que `storybook` 10.6.3 de la galería; pide `storybook ^10.6.3`. | `@storybook/icons ^2.0.2`, `@storybook/global ^5.0.0`; 469 KB. Pares opcionales: `vitest`, `@vitest/browser` y `@vitest/browser-playwright` `^4.0.0 \|\| ^5.0.0`. |
| `@vitest/browser-playwright` | 5.0.5 | Pide `vitest 5.0.5`, el de la raíz. | `@vitest/browser 5.0.5` (con `@vitest/ui`, `ws`, `sirv`, `pngjs`…), `@vitest/mocker 5.0.5`; par `playwright *`. |
| `playwright` | 1.64.1 | Par del anterior; la misma versión que `playwright-core` 1.64.1 de la raíz. | Solo `playwright-core 1.64.1`. No tiene script de instalación: **no descarga navegadores**; 5 MB. |

- El addon exige un framework de Vite; la galería usa `@storybook/react-vite`.
- La documentación de Storybook usa el modo navegador de Vitest con Playwright y
  `instances: [{ browser: 'chromium' }]`. El asistente ofrece instalar los binarios de Playwright
  (`playwright install`); aquí se rechaza.
- Vitest pasa `launchOptions` tal cual a `browser.launch` de Playwright. `channel: 'msedge'` es el
  canal que ya usan `tests/lib/browser.ts` y el resto de tests. El ejemplo oficial usa
  `channel: 'chrome-beta'`; que `msedge` funcione con el proveedor de Vitest es lo primero que debe
  comprobar el plan.
- Esta máquina ya tiene navegadores de Playwright en su caché (`ms-playwright/chromium-1194`), por
  algo ajeno al repo. El check de RF-3 apunta `PLAYWRIGHT_BROWSERS_PATH` a una carpeta vacía para no
  darlos por buenos.

## Solape con lo que ya hay

| Hoy (Vitest + `playwright-core` + Edge, Storybook construido) | Con el addon |
|---|---|
| `gallery.test.ts`, `gallery-browser.test.ts`, `snippets.test.ts`, `gallery-i18n.test.ts`, `gallery-overflow.test.ts`, `gallery-*-theme.test.ts`, `gallery-astro-*.test.ts`, `a11y.test.ts`, `field-*.test.ts`… | Se quedan todos (RF-5): miden propiedades que un test de humo no ve. |
| Nada prueba que **cada** historia se pinte sin error, salvo las que nombra cada test. | El test de historia lo cubre para todas, también para las que se añadan (012–014). |
| Los resultados solo en la terminal. | El panel en Storybook (RF-4). |

Ningún test de `tests/` se borra ni se afloja; el addon solo suma.

## Preguntas para el coordinator, con recomendación

1. **¿Los tests de historia dentro de `npm test`?**
   - **Recomendado:** sí. `npm test` es la única puerta (`AGENTS.md`), y un test que solo corre en
     el panel no es una guarda (regla 8).
   - Coste: unos segundos más por ejecución, que el informe mide.
   - Alternativa: solo en el panel. Más rápido, pero la historia rota llegaría a un commit.
2. **¿Entra `@storybook/addon-a11y`?**
   - **Recomendado:** no. Es otra dependencia con su propio motivo, y la accesibilidad ya la miden
     `a11y`, `field-a11y` y `gallery-*-theme` en Edge real.
   - Si el dueño la quiere, va en otra spec de la entrega 5.

## Menores decididos por el planner (opción conservadora)

- Las dependencias van en `gallery/package.json` (`devDependencies`); `vitest` sigue en la raíz.
- Sin funciones `play` nuevas: el test de historia es solo el de humo.
- Sin script nuevo obligatorio: si se añade `test-storybook`, es comodidad.

## Para el plan

- El proyecto `storybook` de Vitest convive con el actual (`vitest.config.ts`, `projects`).
  `globalSetup` y el lock (`tests/lib/lock.ts`) tienen que cubrir los dos proyectos (RF-6).
- El proyecto necesita el JSON de Astro, que `npm test` ya genera antes de Vitest (`gallery:astro`).
- RF-4 pide arrancar `storybook dev` en un test, o validarlo en la sesión con el servidor en marcha;
  el plan decide cuál, y si es la segunda, el check es de la validación.
- Medir la duración de `npm test` antes y después.

## Revisión del 2026-11-01, contra `main` con la entrega 4 (aplicados)

La spec se aprobó con menos componentes y antes de la 017. Lo que sigue vigente: los 6 RF, el motivo
de las dependencias y sus versiones (`vitest` 5.0.5 y `playwright-core` 1.64.1 siguen siendo los
instalados; `storybook` instalado es 10.6.3, y el registro da 10.6.5, que no se sube aquí). Cambios
que propongo, y que decide el dueño:

- **C-1, RF-6: limitarlo a la línea de comandos.** El panel mantiene vivo un Vitest mientras dure
  `npm run gallery`. Si tomara el lock, `npm test` esperaría y fallaría a los 10 minutos. Texto:
  «MIENTRAS otro `npm test` tiene el lock, EL SISTEMA no ejecuta desde la línea de comandos los
  tests de historia». Recomendado.
- **C-2, RF-4: su check pasa a la validación.** Un test automático tendría que arrancar
  `storybook dev` y un Vitest en cada `npm test`, solo para ver un widget. «Hecho cuando» ya pide
  abrirlo a mano. Recomendado. Vale también para el RF-5 de la 016.
- **C-3, RF-5: comparar una vez, no un test permanente.** Un test con la lista de los 1286 tests
  fallaría cada vez que se borre uno a propósito, en cualquier spec futura. Texto del check: «la
  lista de `vitest list` al acabar contiene cada nombre de la lista al cortar la rama». Recomendado.
- **C-4, NFR de duración: ponerle un número.** Hoy solo pide informar. Propongo: el proyecto suma ≤
  10 s a `npm test` (≤ 15 s con la 016). El límite de la 017 es ≤ 75 % de 174.3 s = 130.7 s; su
  última medida (126.7 s) es de antes de RadioGroup y Select, y la suite ha pasado de 913 a 1286
  tests. Puede que ya no se cumpla antes de empezar: lo mide la T-1. Si es así, el dueño decide si
  mueve ese límite.

## Base (T-1, 2026-11-01)

Worktree `.claude/worktrees/agent-a4368a35b84735ab6`, rama `spec/015-addon-vitest-T-1` sobre `2cd3dbd`, 12 núcleos, sin código cambiado. Arranque: `npm ci`, `npm run build:packages`, `npm run gallery:astro`. Cada pasada: 67 archivos, 1287 tests (1286 pasan, 1 omitido).

**Otra carga.** El dueño tenía abiertos Claude (varios procesos), GitKraken, Opera, Discord, Steam y CurseForge, y otra sesión de Claude (mini-apps/telar) corrió un script `carrera3.mjs` y un servidor `servidor/principal.ts` durante la primera serie. Nadie más lanzó `npm test` de este repo.

**Serie 1, contaminada (no cuenta).** Calentamiento 227.6 s, pasada 1 277.5 s, pasada 2 209.0 s, pasada 3 156.5 s. Las tres primeras fallaron por `Hook timed out in 30000ms` (`gallery-browser-button`, `gallery-i18n` dos veces) con todos los tests en verde y la CPU al 100 %, y el cierre de Edge pasó de 20 s. Se descarta.

**Serie 2, máquina libre (CPU 3 %, sin `msedge` ni otro `npm test`)**, tras el calentamiento de la serie 1:

| Pasada | Total (s) | vitest (s) | Salida |
|---|---|---|---|
| P1 | 138.1 | 132.0 | 0 |
| P2 | 139.0 | 133.0 | 0 |
| P3 | 139.2 | 132.9 | 1 (los 1286 tests en verde; un `Unhandled Rejection: apiResponse.text: Response has been disposed`) |
| Mediana | **139.0** | | **79.7 % de 174.3 s** |

**Pasa de 130.7 s (75 %): sí**, por 8.3 s. La 017 midió 126.7 s con 912 tests; hoy son 1287 (la entrega 4 añadió Checkbox, RadioGroup y Select). Con el límite de la 017 la 015 parte ya incumpliéndolo: el dueño decide si lo mueve (C-4).

**Fases de la mediana** (P2, 139.0 s):

| Fase | s | Caché |
|---|---|---|
| `build react` | 0.6 | |
| `gallery:astro` | 0.5 | acierto |
| bloque `tipos` (5 a la vez; `tsc` 3.1, `tsc -p gallery` 2.0, `astro check` test-package 4.6, packages/astro 4.8, astro-render 4.9) | 5.0 | |
| `globalSetup`: cleanup 0.5; 4 `pack` 0.7 a 1.4; starters, astro-render y Storybook 0.0 a 0.1 | | acierto |
| `globalSetup`: 8 consumidores | 1.5 a 8.4 | acierto |
| `globalSetup`: type check package-react / package-astro | 3.8 / 11.7 | |
| `globalSetup`: cadena más larga (package-astro) | 21.3 | |
| `vitest` (incluye el `globalSetup`) | 133.0 | |
| **Total** | **139.0** | |

`vitest` es el 96 % del total. El `globalSetup` ronda los 21 s.

**Los 6 archivos más lentos** (pasada `vitest run --reporter=json` aparte, fuera de la mediana; el último archivo acaba en el segundo 130.2):

| Archivo | Segundos | Empieza en |
|---|---|---|
| `consumer-undeclared.test.ts` | 75.0 | 23.3 s |
| `a11y.test.ts` | 66.6 | 23.6 s |
| `gallery-i18n.test.ts` | 57.4 | 24.3 s |
| `field-a11y-radiogroup.test.ts` | 52.6 | 25.1 s |
| `field-a11y-checkbox.test.ts` | 47.4 | 26.0 s |
| `field-a11y-select.test.ts` | 42.2 | 26.7 s |

**Número de tests.** 1287 en el JSON de `vitest run` (1286 pasan, 1 omitido). `vitest list --json` **no se pudo usar**: sale con 1 y `No test suite found in file` en los `field-a11y-*.test.ts` (que generan sus tests en tiempo de ejecución) y deja un JSON vacío. La T-1 pedía su número; se usa el del reporte JSON. Nada de esto está en el repo.

**Anomalías.** Fuera de la serie 1: P3 de la serie 2 salió con 1 por un `Unhandled Rejection` (`apiResponse.text: Response has been disposed`) con todos los tests en verde, parecido al `ECONNRESET` de la T-16 de la 017. `PATH` no tiene `vitest`; los comandos sueltos van con `npm exec`. No toqué el Edge del usuario.
