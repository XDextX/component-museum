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
