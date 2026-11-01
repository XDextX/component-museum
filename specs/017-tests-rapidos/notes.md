# Notas de la 017 — tests-rapidos

## Respuestas del dueño (2026-10-23)

- Entrega 4, justo después de la 012 y antes de la 013 y la 014; decidido por el dueño.
- Los consumidores se guardan entre ejecuciones (RF-5); decidido por el dueño.

## Medidas (2026-10-23, checkout principal en `spec/012-checkbox`, esta máquina, 12 núcleos)

**Cota alta bajo carga.** Las dos tareas de la 012 corrían su `npm test` en sus worktrees a la vez.
Esa carga tumbó 6 archivos (5 hooks de cierre pasaron de 30 s, y un `git` no arrancó en
`release.test.ts`): 640 tests pasaron, 1 falló y 1 se omitió. No es la base: la primera tarea del
plan la mide en una máquina sin otra carga.

| Fase (`npm test`, en orden) | Segundos |
|---|---|
| `tsc -p packages/react/tsconfig.build.json` | 3.7 |
| `npm run gallery:astro` (`astro build` + extracción) | 38.3 |
| `tsc --noEmit` | 13.4 |
| `tsc --noEmit -p gallery` | 10.0 |
| `astro check` de `tests/fixtures/test-package` | 31.3 |
| `astro check` de `packages/astro` | 6.7 |
| `astro check` de `gallery/astro-render` | 9.0 |
| `vitest run` (`globalSetup` y 44 archivos) | 576.3 |
| **Total** | **688.6 (11 min 29 s)** |

Los archivos más lentos de `vitest run`, en segundos:

| Archivo | Segundos |
|---|---|
| `gallery-browser.test.ts` | 200 |
| `theme.test.ts` | 133 |
| `gallery-story-theme.test.ts` | 91 |
| `gallery-docs-theme.test.ts` | 79 |
| `gallery-overflow.test.ts` | 69 |
| `release.test.ts` | 48 |

Piezas sueltas, medidas con la misma carga:

| Pieza | Segundos |
|---|---|
| `npm run build:packages` | 24.0 |
| un `npm pack ./packages/react --dry-run` | 15.7 |
| el build de Storybook | 64.4 |

La medida del `globalSetup` solo se paró a petición del coordinator, para no tumbar las tareas. El
plan la hace sin carga.

## Recuento del trabajo repetido (leído en el código, `spec/012-checkbox`)

- **El paquete de React se compila unas 7 veces por ejecución:**
  - el `tsc` del script `test`;
  - el `prepack` de `buildGallery` (`tests/global-setup.ts`);
  - un `npm pack` por cada uno de los 3 consumidores con React (plain, package y tailwind), por
    `installPackage` en `tests/lib/consumer.ts`;
  - el de `styles.test.ts`;
  - el `npm pack --dry-run` de `packages.test.ts`, que también ejecuta `prepack`.

  Astro sigue el mismo camino (3 consumidores, más `styles` y `packages`), y `test-package` se
  empaqueta una vez por cada uno de los 8 consumidores.
- **`astro-render` se construye dos veces:** en el script `test` (`gallery:astro`) y en
  `buildGallery`. Son unos 38 s cada vez.
- **Storybook** se construye en cada ejecución (unos 64 s), aunque no haya cambiado nada.
- **Consumidores:** cada ejecución hace dos `npm exec` de los starters fijados y 8 `npm install`
  contra el registro, más el `@astrojs/check` del consumidor de Astro. Todo con red.

## Muestra de inyecciones que tienen que seguir en rojo (NFR)

1. 002, RF-5: una variante fuera del contrato rompe el tipado del consumidor guardado
   (`checkButtonTypes`).
2. 003, RF-7: una regla fuera de la capa `museum`.
3. 006, RF-2: un archivo de más en el tarball.
4. 009, RF-2: la etiqueta sin `htmlFor` en el ayudante de campo.
5. 011, RF-1: el oscuro por `prefers-color-scheme` sin atributo.
6. 007, RF-7: un elemento de 600 px que desborda a 542 px.

Cada una toca un camino que esta spec cambia: el tarball, los consumidores reutilizados, la
galería en caché y la hoja.

## Preguntas para el dueño, con recomendación

1. **¿Entrega?**
   - **Recomendado:** entrega 4, justo tras la 012 y antes de la 013 y la 014. Cada tarea de lo que
     queda pasa `npm test` al menos dos veces (al reportar y tras el merge de su ola), más la
     validación: con las 2 specs que faltan son más de 10 ejecuciones.
   - No toca `packages/` ni lo que se publica, así que no retrasa la publicación más que lo que
     tarde en implementarse.
   - **Alternativa:** entrega 5, con las herramientas de la galería. Así la entrega 4 se cierra
     antes, pero la 013 y la 014 se prueban con la lentitud de hoy.
2. **¿Caché de consumidores entre ejecuciones (RF-5)?**
   - **Recomendado:** sí. Es la parte con red y la más grande de lo que no depende del código del
     repo.
   - Clave: la versión fijada del starter, más el `package.json` y el lockfile del consumidor sin
     los tarballs. Los tarballs se instalan siempre de nuevo (RF-6).
   - **Alternativa:** quitar solo lo repetido dentro de cada ejecución (RF-1, RF-2, RF-3). Es más
     simple, pero cada ejecución sigue descargando del registro.

## Menores decididos por el planner (opción conservadora)

- La caché vive en `node_modules/.museum-cache/` del checkout, como el lock: no se versiona y cada
  worktree tiene la suya.
- La clave incluye las versiones de Node, de npm y de las dependencias fijadas, no solo los
  archivos.
- Un build se guarda con su clave al final, de forma atómica: uno a medias nunca tiene clave.
- El objetivo se mide como mediana de 3 ejecuciones, porque una sola es ruidosa (la cota alta lo
  demuestra).

## Para el plan

- **Primera tarea:** medir la base por fase, sin otra carga en la máquina, incluido el
  `globalSetup` desglosado (starters, instalaciones, builds de consumidores, galería).
- RF-7 y RF-8: el `globalSetup` prepara de forma perezosa lo que cada archivo pide (`inject`), o
  los tests se reparten en proyectos de Vitest. El plan elige.
- RF-1: `packages.test.ts` lee la lista de archivos del tarball de la ejecución en lugar de lanzar
  un `npm pack --dry-run` propio.

## Clarify (2026-10-23, menores decididos por el planner)

- RF-5: el check dice «ni descarga nada»; el `@astrojs/check` del consumidor de Astro entra en la
  caché.
- NFR nuevo: un subconjunto (RF-7) no sustituye a `npm test` para reportar, que sigue siendo la
  única puerta (`AGENTS.md`).
- La medida bajo carga se paró a petición del coordinator. Mis procesos dejaron un lock y cinco
  carpetas `cm-b16bfabe*` en el temporal: los quité, solo los de esa ejecución.

## Riesgo a medir en la base

- Las tareas de la 012 informan de unos 31 procesos `msedge` abiertos en la máquina. Probablemente
  son de ejecuciones cortadas: un hook que pasa de 30 s, o una ejecución detenida, no llega a
  cerrar su Edge. Cada Edge huérfano resta memoria y CPU a las ejecuciones siguientes, y explicaría
  parte de los cierres lentos.
- La primera tarea del plan cuenta los `msedge` antes y después de una ejecución normal y de una
  cortada a mano, y el plan decide si la limpieza entra aquí (por ejemplo, cerrar los Edge que la
  ejecución lanzó, por PID, en el teardown).

## Cambio de spec: RF-10, limpieza (aprobado por el coordinator en modo autónomo, 2026-10-23)

La spec aprobada no cubre la limpieza que pidió el coordinator: las carpetas `cm-*` y
`playwright_chromiumdev_profile-*` que dejan en `%TEMP%` las ejecuciones cortadas (llenaron el
disco el 2026-10-23), y los `msedge` sin cerrar. Lo que no está en la spec no se implementa, así
que la T-7 espera a este cambio. Texto propuesto:

- RF-10: CUANDO una ejecución empieza, EL SISTEMA borra de `%TEMP%` las carpetas `cm-*` y los
  perfiles `playwright_chromiumdev_profile-*` de ejecuciones que ya no viven. — **Check:** con una
  carpeta de un `runId` muerto y otra de uno vivo, solo desaparece la del muerto.

Cómo saber qué ejecución vive sin borrar la de otro checkout:
- cada carpeta `cm-<runId>` se asocia a su ejecución por el `owner.json` del lock, que lleva el
  `pid`;
- las de un `pid` muerto se borran; ante la duda, no se borran;
- los Edge huérfanos se cierran por el `pid` que su ejecución apuntó al lanzarlos, nunca por
  nombre de proceso.

## Clarify del plan (2026-10-23, menores decididos por el planner)

- La limpieza va por cambio de spec (RF-10), no en el plan: borrar en `%TEMP%` sin un RF y sin
  check puede tocar la ejecución viva de otro worktree.
- Hay poco paralelismo, a propósito: solo la T-3 y la T-6 van juntas, porque `global-setup.ts` y
  `consumer.ts` los tocan las demás en olas sucesivas.
- `astro-render` lo construye solo el script `test` (`gallery:astro`), porque `tsc --noEmit -p
  gallery` necesita su JSON antes de Vitest. El `globalSetup` deja de construirlo.
- La clave es de contenido, no de fechas, y se calcula después del `prepack`.
- Los consumidores guardados se copian a `%TEMP%` y los tarballs se instalan con `--offline`: la
  caché nunca se modifica durante una ejecución.
- La T-1 y la T-8 miden sin otra carga: el coordinator no lanza otras tareas mientras corren.
- RF-10 en la spec, con su línea `Changed:`. El Edge huérfano se reconoce sin apuntar `pid`: su
  `--user-data-dir` es un perfil `playwright_chromiumdev_profile-*` de `%TEMP%` y su proceso padre
  ya no vive. Así nunca se toca el Edge del usuario, que no usa un perfil de Playwright, ni los de
  otra ejecución viva.

## Base (T-1, 2026-10-23, sin otra carga)

Worktree `.claude/worktrees/agent-a8d527f168119ad64`, rama `spec/017-tests-rapidos-T-1` sobre `1ed5bc2`, 12 núcleos, sin tareas ni galería en marcha. Tres ejecuciones seguidas de los pasos de `npm test`, sin cambios, todas en verde: 44 archivos, 813 tests (812 pasan, 1 omitido). La medida del `globalSetup` salió de un registro temporal (`MUSEUM_PHASE_LOG`) que se ha revertido: no hay código cambiado.

**Total y por paso** (segundos; la mediana es la pasada 3, la del medio en total):

| Paso | Pasada 1 | Pasada 2 | Pasada 3 | Mediana |
|---|---|---|---|---|
| `tsc -p packages/react/tsconfig.build.json` | 0.6 | 0.6 | 0.6 | 0.6 |
| `npm run gallery:astro` | 2.1 | 2.4 | 2.4 | 2.4 |
| `tsc --noEmit` | 2.2 | 2.5 | 2.4 | 2.4 |
| `tsc --noEmit -p gallery` | 1.5 | 1.6 | 1.4 | 1.5 |
| `astro check` de `test-package` | 4.1 | 3.6 | 3.4 | 3.6 |
| `astro check` de `packages/astro` | 3.8 | 3.7 | 3.6 | 3.7 |
| `astro check` de `gallery/astro-render` | 3.7 | 3.8 | 3.7 | 3.7 |
| `vitest run` (`globalSetup` y tests) | 163.2 | 146.0 | 156.8 | 156.8 |
| **Total** | **181.3** | **164.2** | **174.3** | **174.3 (2 min 54 s)** |

Con la máquina libre la base es unas 4 veces menor que la cota alta bajo carga (688.6 s). Los pasos de tipos son casi gratis (15 s entre todos, con las cachés de tsc y Astro calientes). El peso está en `vitest run`: el 90 % del total.

**`globalSetup` por partes** (pasada 3; entre paréntesis las pasadas 1 y 2). Total 62.1 s (64.3 y 53.6):

| Parte | Segundos |
|---|---|
| starters (2 `npm exec`; el de Astro, 5.4 s) | 5.3 (5.4, 5.3) |
| crear e instalar los 8 consumidores en paralelo (empaquetar + `npm install`) | 35.8 (37.1, 29.3); cada `npm install` de Astro 33 s, de React 12-14 s |
| builds de los 6 consumidores en paralelo | 4.7 (5.1, 5.3); los de Astro 5 s, los de React 2 s |
| `checkButtonTypes` (instala `@astrojs/check` y dos chequeos; el de Astro, 4-5 s) | 16.3 (16.7, 13.7) |
| galería, en paralelo con lo anterior (de 5.3 a 23.9) | 18.6 (9.9, 33.1) |
| - `prepack` de React y Astro | 2.3 (2.5, 2.2) |
| - `astro build` de `astro-render` | 2.7 (3.1, 3.6) |
| - extracción | 0.1 |
| - Storybook | 13.5 (4.1, 27.2) |

Conteos por ejecución, en el `globalSetup`: 20 `npm pack` (suman 39 s de reloj sumado; 52 y 43 en las otras), 13 `npm install` (suman 197 s sumados; 203 y 191), 2 starters. Faltan los empaquetados de `packages.test.ts` y `styles.test.ts`, que están en los tests. El camino crítico del `globalSetup` es crear e instalar los consumidores de Astro (unos 41 s hasta que están todos); la galería acaba antes y no lo alarga. Lo que queda de `vitest run` tras el `globalSetup`: unos 95 s.

**Storybook varía mucho** (4.1, 13.5 y 27.2 s) con la máquina libre y sin cambios: depende de las cachés internas y del reparto con los `npm install`. Una pasada de base no distingue bien un ahorro de 10 s ahí.

**Los 10 archivos más lentos** (segundos, pasada 3, con las otras dos al lado):

| Archivo | P3 | P1 | P2 |
|---|---|---|---|
| `consumer.test.ts` | 75.8 | 82.2 | 81.8 |
| `gallery-browser.test.ts` | 73.8 | 85.1 | 82.7 |
| `a11y.test.ts` | 72.3 | 68.4 | 69.7 |
| `field-a11y.test.ts` | 68.2 | 62.3 | 68.0 |
| `typecheck.test.ts` | 58.6 | 27.6 | 52.3 |
| `field-markup.test.ts` | 47.5 | 51.7 | 40.1 |
| `gallery-i18n.test.ts` | 47.2 | fuera del top 10 | 43.5 |
| `theme.test.ts` | 46.9 | 47.6 | 49.2 |
| `gallery-story-theme.test.ts` | 39.3 | 38.2 | 38.4 |
| `field-styles.test.ts` | 25.9 | 30.1 | fuera del top 10 |

Los archivos corren en paralelo, así que sus tiempos no suman al total. `packages.test.ts` (unos 30 s, por su `npm pack --dry-run`) queda justo fuera de los diez en la pasada 3.

**`%TEMP%` y Edge** (el disco `C:` tenía 61.3 GB libres al empezar):

| Momento | `cm-*` | `playwright_chromiumdev_profile-*` | `msedge` (de tests) | GB libres |
|---|---|---|---|---|
| Antes (restos previos, no míos) | 36 | 48 | 7 (0) | 61.3 |
| Tras una ejecución normal (las 3, igual tras cada una) | 36 | 48 | 7 (0) | 61.2 |
| Tras una cortada a mano: `taskkill /T /F` del árbol de `vitest` a los 110 s | 42 | 57 | 7 (0) | 60.0 |
| Tras una cortada a mano: matar solo los `node` del worktree, sin árbol | 43 | 55 | 7 (0) | 60.0 |

- Una ejecución normal no deja carpetas ni Edge. Las 36 y 48 de antes son restos de ejecuciones anteriores ajenas a esta tarea, y no las toqué.
- Una cortada deja 6 o 7 `cm-*` (`cm-<runId>`, `-guard`, `-pkg`, `-starter`, `-tw`, más `cm-release-*` o `cm-typecheck-*`) y 7 a 9 perfiles de Playwright: unos 1.2 GB. Un disco lleno se explica por la acumulación de cortes.
- **Los 7 `msedge` son el Edge del usuario (ninguno lleva `remote-debugging-pipe` ni `playwright`) y no los toqué.** En los dos cortes los Edge de los tests murieron con su proceso padre (el pipe se cierra), y no quedó ninguno huérfano. Los 31 `msedge` de las tareas de la 012 no se reprodujeron aquí; vendrán de otra forma de cortar (un hook que pasa de 30 s, un parón con Edge a medias) o de la carga. Para el RF-10, lo medido aquí son las carpetas, no los procesos.
- Tras cada corte quité solo las carpetas nuevas, comparadas con la lista de antes, y el lock (`node_modules/.museum-test-lock`) que dejó. Volvió a 36 y 48.

**Anomalías.**
- `[museum] teardown: closing Edge still running after 10000 ms` salió en la pasada 1 (`theme.test.ts`, `cascade.test.ts` y otros), con la máquina libre y todo en verde. El cierre de Edge pasa de 10 s en esta máquina; el `hookTimeout` de 30 s lo absorbe.
- Una ejecución cortada deja el lock, y hay que borrarlo a mano antes de la siguiente.
- Las cachés de herramientas (tsc incremental, Astro) estaban calientes porque `build:packages` y `gallery:astro` corrieron en el arranque. La medida de la T-8 debe hacerse en las mismas condiciones.
- Ninguna pasada falló.

## T-5: el globalSetup de un proyecto sin archivos (2026-10-23)

Comprobado antes de tocar nada, con una configuración suelta de Vitest 5.0.5 con dos proyectos (`unit` sin
`globalSetup`, `e2e` con un `globalSetup` que escribe un archivo):
- `vitest run tests/contract.test.ts` (un archivo de `unit`) y `--project unit`: **el `globalSetup` de `e2e` no se
  ejecuta**; el archivo no se escribió.
- `vitest run tests/phases.test.ts` (un archivo de `e2e`): se ejecuta.

No hizo falta la alternativa de la variable de entorno: bastan los dos proyectos.

## Después (T-8, 2026-10-24, sin otra carga)

Worktree `.claude/worktrees/agent-a51f2bfeeb962eca8`, rama `spec/017-tests-rapidos-T-8` sobre `1012ced` (merge de la T-7), 12 núcleos, nada más corriendo. Mismas condiciones que la base: `npm ci`, `npm run build:packages` y `npm run gallery:astro` en el arranque, así que las cachés de tsc y de Astro están calientes. Sin código cambiado: el `git status` final solo muestra este archivo y `tasks.md`.

**Calentamiento** (no cuenta): una primera ejecución llenó las cachés de Storybook, `astro-render`, starters y consumidores en este worktree. Total 176.5 s, todo en verde, con starters, consumidores y Storybook «construidos».

**Resultado: los dos objetivos NO se cumplen.** La suite baja de 174.3 s a unos 125 s, pero no a la mitad.

| Medida (total de `npm test`, segundos) | Pasada 1 | Pasada 2 | Pasada 3 | Mediana | % de la base (174.3 s) | Objetivo |
|---|---|---|---|---|---|---|
| Sin cambios | 126.2 | 124.7 | 125.3 | **125.3** | **71.9 %** | ≤ 50 % (87.2 s): NO |
| Tras un byte de un componente (un comentario al final de `packages/react/src/Button/Button.tsx`, distinto cada vez) | 134.9 | 133.9 | 127.5 | **133.9** | **76.8 %** | ≤ 70 % (122.0 s): NO |
| Complementaria: un cambio que sí altera `dist/` (`export const t8 = N;` en el mismo archivo) | 128.0 | 130.5 | 136.7 | 130.5 | 74.9 % | (no es un objetivo) |

Las 9 ejecuciones en verde: 51 archivos, 892 tests pasan y 1 se omite. La base eran 44 archivos y 813 tests: la suite ha crecido desde la T-1, y los tiempos de hoy cargan con los tests nuevos. Ningún cierre de Edge por `hookTimeout` ni aviso `teardown` en ninguna.

- El comentario no cambia `dist/` (la clave de Storybook y de los consumidores es de contenido): Storybook sale «acierto» en las tres pasadas. Por eso la serie complementaria, con un cambio que sí llega a `dist/` y reconstruye Storybook (14 a 16 s), da un total parecido: el ahorro de la caché de Storybook (unos 14 s) no es lo que decide el total. Los 8 s entre «sin cambios» y «un byte» están en el orden de la variación entre pasadas de una misma serie (hasta 7 s); no los atribuyo a nada.
- Cada pasada empaqueta y reinstala los tarballs (RF-6), y se ve en el total.

**Fases de la mediana sin cambios** (pasada 3, 125.3 s; la base, pasada 3 de la T-1, al lado):

| Fase | Segundos | Caché | Base (T-1) |
|---|---|---|---|
| `gallery:astro` | 0.4 | acierto | 2.4 |
| `tsc --noEmit` | 2.2 | — | 2.4 (más 0.6 del `tsc -p packages/react/tsconfig.build.json`, que ya no está) |
| `tsc --noEmit -p gallery` | 1.4 | — | 1.5 |
| `astro check` de `test-package` | 3.4 | — | 3.6 |
| `astro check` de `packages/astro` | 3.5 | — | 3.7 |
| `astro check` de `gallery/astro-render` | 3.7 | — | 3.7 |
| `vitest run` | **110.6** | — | 156.8 |
| de ello, `globalSetup: cleanup` | 0.6 | — | — |
| de ello, 4 `pack` (en paralelo; React 1.3) | 1.3 | — | (20 `npm pack` en el `globalSetup`) |
| de ello, 2 starters | 0.1 | acierto | 5.3 |
| de ello, `astro-render` y Storybook | 0.0 y 0.0 | acierto | 18.6 (galería) |
| de ello, 8 consumidores (React 1.5 a 2.1; Astro 7.3 a 8.2) | 9.2 | acierto | 35.8 |
| de ello, builds de los 6 consumidores | 12.0 | — | 4.7 |
| de ello, `type checks` (`checkButtonTypes`) | 11.6 | — | 16.3 |
| **Total** | **125.3** | | **174.3** |

- **`vitest run` es el 88 % del total** (110.6 de 125.3 s) y ahorra 46 s respecto de la base. El resto de pasos suma 14.7 s y apenas se mueve (ya estaban en su mínimo con las cachés calientes).
- **Dentro de `vitest run`:** el `globalSetup` es de unos 35 s (las sumas de las filas de arriba, con los consumidores y los builds de ellos y los type checks uno tras otro), y quedan unos 75 s de tests. Una pasada extra solo para el diagnóstico (`vitest run --reporter=json`, fuera de las medianas) da el `globalSetup` en 38 s y los archivos largos empezando justo después:

| Archivo | Segundos | Empieza en |
|---|---|---|
| `field-a11y.test.ts` | 72.9 | 41 s |
| `consumer.test.ts` | 72.2 | 38 s |
| `gallery-browser.test.ts` | 71.6 | 39 s |
| `theme.test.ts` | 61.1 | 39 s |
| `gallery-story-theme.test.ts` | 48.1 | 39 s |
| `gallery-overflow.test.ts` | 33.3 | 39 s |

  Los archivos corren en paralelo y el último acaba en el segundo 114. El total lo marca el `globalSetup` (38 s) más el archivo más largo (unos 73 s): son los tres de unos 72 s, que ya duraban 68 a 76 s en la base. La caché ha quitado el `globalSetup` de unos 62 s a unos 35 s, pero los archivos de test de navegador no han cambiado.
- **Qué falta para el 50 % (87.2 s):** 38 s más. El `globalSetup` ya está en 35 a 38 s, de los que 24 s son builds y type checks de consumidores que ninguna caché evita en esta spec (RF-6: los tarballs se instalan siempre de nuevo), y los 72 s de los tres archivos más largos no dependen del `globalSetup`. No se ha tocado nada para llegar al objetivo.

**Recuento por ejecución** (contado con un `--require` temporal fuera del repo que registra los procesos `node` de `npm-cli.js` y de `storybook`; no cambia código). Tres ejecuciones contadas: sin cambios, con un componente de prueba añadido (`packages/react/src/Probe/Probe.tsx`, sin exportar) y con un cambio de `dist/` sin componente nuevo:

| Cuenta por ejecución | Sin cambios | Con componente de prueba | Con un cambio de `dist/` |
|---|---|---|---|
| `npm pack` | 9 | 9 | 9 |
| `npm install` | 10 | 10 | 10 |
| starters (`npm exec` de `create-*`) | 0 (acierto) | 0 | 0 |
| `npm exec` (`tsc -b` y `astro check` de `checkButtonTypes`) | 4 | 4 | 4 |
| `npm run build` (consumidores y Storybook) | 12 | 13 | 13 |
| builds de Storybook | 0 (acierto) | 1 | 1 |

Los empaquetados, las instalaciones y los starters son los mismos con y sin el componente. La única diferencia es Storybook, que se construye una vez cuando cambia `dist/` y ninguna cuando no cambia: no depende de si hay un componente más, sino de si cambia lo que publica (con y sin el componente de prueba, el mismo 1). Los 9 `npm pack` son 5 de rutas del repo (React, Astro y 3 de `test-package`), 3 de paquetes temporales en `cm-*-guard` y 1 `--dry-run`; los 10 `npm install` son todos `--offline` con los tarballs. No desgloso cuáles son del `globalSetup` y cuáles de los tests.

El componente de prueba tumbó 2 tests, los esperados: `contract.test.ts` (RF-6 de la 002: «Probe has no contract») y `packages.test.ts` (RF-2 de la 006: «Probe has no export»). Se quitó al acabar.

**Muestra de inyecciones**, cada una con `npm test` completo, restaurada por ruta con `git checkout -- <ruta>` y con el `git status` limpio al acabar:

| Spec y RF | Inyección | Test que se puso en rojo | Fallos |
|---|---|---|---|
| 002, RF-5 | `variant?: string` en `packages/react/src/Button/Button.tsx` | `consumer.test.ts` «Button types in the consumers (002 RF-5) > passes the react consumer's type check, and fails it once a Button has variant="nope"» y `contract.test.ts` (RF-7, RF-10) | 2 |
| 003, RF-7 | una regla `.museum-stray` fuera de la capa, al final de `styles/museum.css` | `styles.test.ts` «styles only museum elements ... all inside the museum layer (RF-7)» | 2 (más `phases.test.ts`, ver anomalías) |
| 006, RF-2 | `"src"` en `files` de `packages/react/package.json` | `packages.test.ts` «packs nothing beyond the allowed list and everything required ... (spec 006 RF-2)» | 2 (más `phases.test.ts`) |
| 009, RF-2 | sin `htmlFor` en la etiqueta de `packages/react/src/field.tsx` | `field-a11y.test.ts` «RF-2: each label finds its control and pressing it focuses it, twins included» (Input, Textarea y Checkbox, React, tres modos) y `field-markup.test.ts` (30) | 65 |
| 011, RF-1 | el oscuro del sistema también en `:root` (sin atributo) en `styles/museum.css` | `theme.test.ts` «RF-1 (spec 011): with no data-theme, the package is light whatever the system prefers» (React y Astro, 4 casos) y `field-styles.test.ts` RF-5 | 24 |
| 007, RF-7 | `<div style={{ width: 600, height: 10 }} />` al final de `gallery/stories/Button.mdx` | `gallery-overflow.test.ts` «Button docs page at 320 px» y «at 542 px: scrollWidth <= clientWidth» | 3 (una es `phases.test.ts`) |

Las 6 se ven en rojo con el test que les toca. Ningún cierre de Edge.

**Anomalías.**
- **`phases.test.ts` («builds astro-render at most once») sale en rojo en la primera ejecución tras cambiar o restaurar `styles/museum.css`** o `packages/react/package.json`, aunque la inyección en curso no tenga que ver: salió en las 2 que tocan `styles/` (003 RF-7, 011 RF-1) y en las dos ejecuciones que siguieron a una restauración de `styles/` (006 y 007, cuya inyección no toca `astro-render`). En las 4 se ven `gallery:astro` y `globalSetup: astro-render` los dos «construido». Causa: `gallery:astro` (el primer paso) calcula la clave con el `packages/astro/styles.css` que dejó el `prepack` de la ejecución anterior; el `prepack` del `globalSetup` copia la hoja nueva, la clave cambia y `astro-render` se vuelve a construir (unos 2 s). El RF-3 («un solo build») no se cumple en esa ejecución, y `npm test` sale con 1 aunque nada esté roto; una segunda ejecución sale en verde. Sale tras editar `styles/` sin `npm run build:packages` antes, que es justo el caso de las inyecciones 003 y 011. No lo arreglé: esta tarea mide. Lo anoto como hallazgo sobre la T-2/T-7 (por ejemplo, `gallery:astro` podría copiar las hojas antes de calcular la clave).
- Los dos objetivos no se cumplen, ver las tablas.
- Las 9 ejecuciones de tiempo, las de recuento y las de calentamiento terminaron sin `hookTimeout` ni aviso `teardown`; la base tenía un aviso de cierre de Edge en la pasada 1.
- El comentario de la serie «un byte» no llega a `dist/`; las dos series se anotan por eso.
- No comprobé `%TEMP%` ni los `msedge` en esta tarea y no toqué el Edge del usuario.

## Después de la segunda ronda (T-16, 2026-10-24, sin otra carga)

Worktree `.claude/worktrees/agent-a6a1e688cc426941b`, rama `spec/017-tests-rapidos-T-16` sobre `eb62f69`, 12 núcleos, nada más corriendo. Mismo método que la T-8: `npm ci`, `npm run build:packages` y `npm run gallery:astro` al arrancar, calentamiento aparte, 3 pasadas por serie. Sin código cambiado. Todas las pasadas de las series en verde: 63 archivos, 912 tests pasan y 1 se omite (la T-8: 51 archivos, 892).

**Calentamiento** (no cuenta): 181.1 s, todo «construido».

**Resultado: los dos objetivos siguen sin cumplirse.**

| Medida (total de `npm test`, s) | P1 | P2 | P3 | Mediana | % de 174.3 s | Objetivo |
|---|---|---|---|---|---|---|
| Sin cambios | 125.3 | 128.0 | 126.7 | **126.7** | **72.7 %** | ≤ 50 % (87.2 s): NO, faltan 39.5 s |
| Un byte (`export const t16 = N;` al final de `packages/react/src/Button/Button.tsx`, N distinto; sí altera `dist/`: Storybook «construido», 15.5 a 16.8 s) | 131.4 | 127.9 | 124.2 | **127.9** | **73.4 %** | ≤ 70 % (122.0 s): NO, faltan 5.9 s |

T-8 para comparar: 125.3 s (71.9 %) y 133.9 s (76.8 %, con un comentario que no tocaba `dist/`; con `dist/`, 130.5 s). «Sin cambios» no ha bajado; «un byte» queda un poco mejor.

**Fases de la mediana sin cambios** (P3, 126.7 s):

| Fase | s | Caché |
|---|---|---|
| `build react` | 0.5 | — |
| `gallery:astro` | 0.5 | acierto |
| bloque `tipos` (5 pasos a la vez; `tsc` 3.0, `tsc -p gallery` 2.0, `astro check` test-package 4.5, packages/astro 4.7, astro-render 4.9) | 4.9 | — |
| `globalSetup`: cleanup 0.6; 4 `pack` 0.6 a 1.3; starters 0.1; `astro-render` 0.1; Storybook 0.0 | | acierto |
| `globalSetup`: 8 consumidores | 1.5 a 8.4 | acierto |
| `globalSetup`: 6 builds de consumidores | 0.0 a 0.2 | acierto |
| `globalSetup`: type check package-react / package-astro | 4.1 / 19.0 | — |
| `globalSetup`: cadena más larga (package-astro) | 28.5 | — |
| `vitest` (incluye el `globalSetup`) | 120.8 | — |
| **Total** | **126.7** | |

`vitest` es el 95 % del total; el resto suma 5.9 s. El `globalSetup` está en unos 31 s (35 a 38 en la T-8) y lo manda la cadena de package-astro (28.5 s), de la que 19.0 s son el `astro check` de `checkButtonTypes` con las ocho cadenas en marcha (4 a 5 s solo).

**Los 6 archivos más lentos** (pasada `vitest run --reporter=json` aparte, fuera de la mediana; el `globalSetup` termina hacia el segundo 31 y el último archivo acaba en el 108):

| Archivo | Segundos | Empieza en |
|---|---|---|
| `consumer-undeclared.test.ts` | 71.4 | 31 s |
| `field-a11y-checkbox.test.ts` | 55.8 | 34 s |
| `a11y.test.ts` | 32.4 | 32 s |
| `theme-astro.test.ts` | 32.2 | 32 s |
| `theme-react.test.ts` | 31.6 | 32 s |
| `gallery-docs-theme.test.ts` | 31.2 | 32 s |

Los tres archivos de unos 72 s de la T-8 ya no están; `consumer-undeclared.test.ts` queda en 71.4 s y, con el `globalSetup`, marca el total (31 + 71 = 103 s de 108).

**Qué falta para el 50 %:** 39.5 s. Se lo llevan `consumer-undeclared.test.ts` (71 s, sin partir, tras un `globalSetup` de 31 s) y, en el `globalSetup`, el type check de package-astro (19 s).

**Muestra de 6 inyecciones**, cada una con `npm test` completo y restaurada por ruta (`git checkout -- <ruta>`):

| Spec, RF | Inyección | Archivo y test en rojo | Fallos |
|---|---|---|---|
| 002 RF-5 | `variant?: string` en `Button.tsx` | `consumer.test.ts` «passes the react consumer's type check, and fails it once a Button has variant="nope"»; `contract.test.ts` «Button react: own props match the translated contract (RF-7, RF-10)» | 2 |
| 003 RF-7 | `.museum-stray` al final de `styles/museum.css` | `styles.test.ts` «styles only museum elements ... all inside the museum layer (RF-7)» | 1 |
| 006 RF-2 | `"src"` en `files` de `packages/react/package.json` | `packages.test.ts` «packs nothing beyond the allowed list ... (spec 006 RF-2)» | 1 |
| 009 RF-2 | sin `htmlFor` en `field.tsx` | `field-a11y-checkbox.test.ts` (21), `field-a11y-input.test.ts` (6), `field-a11y-textarea.test.ts` (6), `field-ids.test.ts` (2), `field-markup.test.ts` (30); RF-2 en los tres `field-a11y-*` | 65 |
| 011 RF-1 | `:root,` delante de `[data-theme="system"]` en el bloque oscuro de `styles/museum.css` | `theme-react.test.ts` (6) y `theme-astro.test.ts` (8) «RF-1: Button wears the package styles», `a11y.test.ts` (2), `field-a11y-*` (2 cada uno), `field-styles.test.ts` (1) | 23 |
| 007 RF-7 | `<div style={{ width: 600, height: 10 }} />` al final de `gallery/stories/Button.mdx` | `gallery-overflow.test.ts` «Button docs page at 320 px» y «at 542 px: scrollWidth <= clientWidth» | 2 |

`phases.test.ts` ya no sale en rojo tras tocar `styles/` (el hallazgo de la T-8 está arreglado).

**Tipos en serie frente a en paralelo** (a mano, fuera de `npm test`, con `node_modules/.bin` en el PATH, los cinco pasos):

| | P1 | P2 | P3 | Mediana |
|---|---|---|---|---|
| En serie | 15.7 | 15.6 | 15.4 | **15.6 s** |
| A la vez | 5.6 | 5.3 | 5.3 | **5.3 s** |

En serie: `tsc` 2.4, `tsc -p gallery` 1.6, cada `astro check` 3.6 a 4.1 s. A la vez, cada `astro check` tarda 4.9 a 5.6 s, no 14 s: el paralelo ahorra unos 10 s con la máquina libre. El 14 s por `astro check` solo se da con otro `npm test` en marcha.

**Anomalías.**
- Una ejecución de re-calentamiento (tras restaurar `Button.tsx`, fuera de las series) salió con código 1 con los 912 tests en verde: un `Unhandled Error` `route.fetch: read ECONNRESET` (`/favicon.svg`) en `field-a11y-checkbox.test.ts`. No se repitió en ninguna otra pasada.
- La inyección 011 mostró `[museum] teardown: closing Edge still running after 10000 ms`; falló igualmente con sus tests.
- Ningún `hookTimeout` en ninguna pasada.
- El proceso de la sesión se cerró a mitad de la inyección 003: `styles/museum.css` quedó modificado y `node_modules/.museum-test-lock` con el pid 52232 ya muerto. Restauré por ruta, borré el lock y repetí esa inyección entera; la pasada cortada no cuenta.
- No toqué el Edge del usuario.
