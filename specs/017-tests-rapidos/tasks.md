# Tareas 017 — tests-rapidos

**Approved:** 2026-10-23 · el coordinator en modo autónomo; con el RF-10 de limpieza

Cómo se trabaja (plan, bloque 2): cada tarea va en su propio worktree, en `.claude/worktrees/`, con
su `node_modules`. Cada tarea empieza, con el árbol limpio, así:
1. `git branch -m spec/017-tests-rapidos-T-n`;
2. `git reset --hard <PLAN>`, o el commit de la ola anterior ya mergeada que dé el coordinator;
3. `npm ci`, `npm run build:packages` y `npm run gallery:astro`.

Antes de reportar, cada tarea pasa:
- el build de `packages/react`;
- `npm run gallery:astro`;
- `tsc --noEmit` y `tsc --noEmit -p gallery`;
- `npm test`.

Cada tarea da el número de tests antes y después, y ninguno se borra. Al cerrar cada ola, la
sesión de git mergea en `spec/017-tests-rapidos` y pasa `npm test` sobre el merge. Las notas que
escriban los agentes, en UTF-8 y CRLF.

**Poco paralelismo, a propósito.** `tests/global-setup.ts` y `tests/lib/consumer.ts` son
compartidos, así que las tareas que los tocan van en olas distintas. Solo la T-3 y la T-6 van en
paralelo. Quién toca cada archivo compartido:
- `tests/global-setup.ts`: T-2, T-3, T-4 y T-5, cada una en su ola;
- `tests/lib/consumer.ts`: T-3 y T-4;
- `package.json`: T-2 (`gallery:astro`) y T-6 (`test`);
- `specs/017-tests-rapidos/notes.md`: T-1 y T-8.

- [x] **T-1 — Medir la base sin otra carga**
  Cubre: NFR de objetivo (la base)
  Archivos: `specs/017-tests-rapidos/notes.md` (sección «Base»)
  Hecho cuando:
  - Con la máquina sin otra ejecución (el coordinator no lanza otras tareas), `npm test` completo
    se ejecuta 3 veces seguidas sin cambios, y se anota la mediana del total.
  - Se anota el desglose por fase de la mediana:
    - cada paso del script `test`;
    - el `globalSetup` por partes: starters, creación e instalación de cada consumidor, sus builds,
      `checkButtonTypes`, `prepack`, `astro build`, extracción y Storybook;
    - los 10 archivos de test más lentos.
  - Se cuentan los `msedge` y las carpetas `cm-*` y `playwright_chromiumdev_profile-*` de
    `%TEMP%`, antes y después de una ejecución normal y de una cortada a mano.
  - La medida es en un worktree propio, sin tocar código: los tiempos del `globalSetup` salen de un
    registro temporal que no se commitea.
  Inyección: no aplica (es una medida); las 3 cifras sueltas van junto a la mediana.

  Va sola en la ola 1: las demás tareas necesitan la base.
  Nota: hecha. Mediana del total, 174.3 s (181.3, 164.2, 174.3), todo en verde; el desglose, los
  archivos más lentos y el estado de `%TEMP%` y de Edge están en la sección «Base» de `notes.md`.
  Sin cambios de código.

- [x] **T-2 — Caché honesta para Storybook y `astro-render`; un solo `astro build`**
  Cubre: RF-2, RF-3, RF-4
  Archivos: `scripts/cache.mjs`, `tests/cache.test.ts`, `gallery/scripts/astro-cached.mjs`,
  `package.json` (solo `gallery:astro`), `tests/global-setup.ts` (`buildGallery` sin `astro build`
  ni extracción; Storybook por `cached()`; ayudante `phase(name, fn)` que escribe
  `node_modules/.museum-cache/phases.json`)
  Hecho cuando:
  - `inputKey` y `cached` tienen sus tests como dato:
    - misma entrada, misma clave;
    - un byte o una versión distintos, otra clave;
    - sin clave, con clave corrupta o sin salida, se construye.
  - En una ejecución hay una sola `astro build` de `astro-render`.
  - Una segunda ejecución sin cambios no construye ni Storybook ni `astro-render`: `phases.json`
    dice «acierto».
  - Cambiar un byte de una historia, de `styles/museum.css` o de `packages/react/src/Button` (que
    cambia el `dist/`) reconstruye lo que depende de él.
  - Un build cortado a medias no deja clave.
  Inyección: una clave que no incluye `styles/museum.css` deja de reconstruir Storybook al cambiar
  la hoja, y pone en rojo el caso RF-4 de la hoja.

  Va sola en la ola 2: abre el registro de fases que usan las siguientes.
  Nota: hecha. `scripts/cache.mjs` (`inputKey(root, files, extra)`, `cached`, `recordPhase` y las listas de
  entradas de cada build), `gallery/scripts/astro-cached.mjs` (`gallery:astro` y el `globalSetup` pasan por
  él: la segunda llamada es un acierto, así que hay una sola `astro build` por ejecución) y Storybook por
  `cached()` en el `globalSetup`. `phases.json` (en `node_modules/.museum-cache/`) lleva las fases con
  `seconds` y `cache`. Tests nuevos: `tests/cache.test.ts` (29) y `tests/phases.test.ts` (3); de 813 a 845
  tests, ninguno borrado. Inyección vista en rojo: quitar `styles/museum.css` de `storybookInputs` pone en
  rojo `Storybook: styles/museum.css` (1 de 29). Desviaciones: `inputKey` recibe la raíz como primer
  argumento; `cached` un quinto argumento (carpeta de la caché) para los tests; dos `.d.mts` para
  importar los `.mjs` desde TypeScript; las fases del `globalSetup` se llaman `globalSetup: <fase>` y
  `phases.json` no se limpia entre ejecuciones (lo hará `scripts/test.mjs`, T-6).

- [x] **T-3 — Un empaquetado por paquete, el mismo tarball en todos**
  Cubre: RF-1
  Archivos: `tests/global-setup.ts` (empaqueta al principio, `provide('tarballs')`),
  `tests/lib/consumer.ts` (`installPackage` con tarballs), `tests/packages.test.ts`,
  `tests/styles.test.ts`
  Hecho cuando:
  - `phases.json` da exactamente un `prepack` por paquete en la ejecución, y cada consumidor
    instala el tarball de `provide('tarballs')`.
  - `packages.test.ts` lee la lista del tarball de la ejecución (con `tar.exe`, o lectura de
    cabeceras si no está) y sigue fallando ante un archivo de más o de menos.
  - `styles.test.ts` compara la hoja del tarball de la ejecución.
  Inyección: un archivo de más en `files` de un paquete pone en rojo `packages.test.ts` (006, RF-2),
  ahora leído del tarball de la ejecución.

  Va en la ola 3 junto a la T-6: no comparten archivos.
  Nota: hecha. El `globalSetup` empaqueta al principio react, astro, `test-package` y el no declarado, cada uno
  una vez y en su carpeta (`cm-<runId>-pack/<nombre>`), y los expone con `provide('tarballs')`; `phases.json` da
  4 fases `pack` y ninguna `prepack` aparte. `installPackage` y `createConsumer` reciben tarballs. Lista de
  archivos del tarball por lectura de cabeceras (`tests/lib/tarball.ts`, `node:zlib`), no `tar.exe`. Tests: de 845
  a 848 (`tarballFiles`, un `pack` por paquete, y el tarball instalado en cada consumidor). Inyección vista en
  rojo: `tsconfig.build.json` en `files` de `packages/react` pone en rojo `packages.test.ts` (RF-2). El test de
  «clon limpio» de `packages.test.ts` conserva su `npm pack --dry-run` propio: prueba justo el pack sin `dist/`.

- [x] **T-4 — Consumidores guardados entre ejecuciones, con los tarballs nuevos**
  Cubre: RF-5, RF-6
  Archivos: `tests/lib/consumer.ts` (`createConsumer` desde la caché), `tests/global-setup.ts`,
  `tests/consumer.test.ts` (RF-6)
  Hecho cuando:
  - Una segunda ejecución sin cambios no ejecuta ningún starter ni instala desde el registro:
    `phases.json` da «acierto» en los 8 consumidores, y la ejecución pasa sin red.
  - En cada consumidor, el `sha256` de `package.json` y de `dist/index.js` de cada paquete
    instalado es el del tarball de la ejecución.
  - Cambiar la versión fijada de un starter, o una dependencia de su `package.json`, rehace ese
    consumidor.
  - La caché no se modifica en una ejecución: se copia y se trabaja en `%TEMP%`.
  Inyección: reutilizar el `node_modules/@component-museum` guardado sin reinstalar el tarball pone
  en rojo RF-6 tras cambiar un componente.
  Nota: hecha. Cada starter se guarda en `node_modules/.museum-cache/consumers/starters/<framework>` y cada
  consumidor, con sus dependencias instaladas y sin tarballs, en `consumers/<forma>-<framework>` (8 entradas,
  914 MB en total). Cada ejecución copia a `%TEMP%` y hace `npm install --offline` de los tarballs de la
  ejecución; la caché solo se escribe en un fallo. La clave del consumidor es la forma, el framework, el pin del
  starter, su `package.json` y lockfile, lo instalado encima y Node y npm. `phases.json` da una fase por starter
  y por consumidor. Tests nuevos: `tests/consumer-cache.test.ts` (5), RF-6 en `consumer.test.ts` (10) y 1 en
  `phases.test.ts`; de 857 a 873 con 1 saltado, ninguno borrado. Inyección vista en rojo: guardar en la caché
  `@component-museum` y no reinstalarlo, y cambiar `Button.tsx`, pone en rojo RF-6 en los 3 consumidores React
  que lo instalan. Desviaciones: el RF-6 compara todos los archivos del tarball, no solo `package.json` y
  `dist/index.js` (`dist/index.js` es un barril y no cambia con un componente: con solo esos dos la inyección
  salió verde); `@astrojs/check` y Tailwind se instalan al guardar el consumidor, no después; el filtro de
  `phases.test.ts` pasa de `/pack/` a `globalSetup: pack ` porque `consumer package-*` lo cumplía.
  Segunda vuelta (velocidad de la copia): con `cpSync` síncrono la fase `consumers` tardaba 28-35 s con la
  caché llena; con `fs.promises.cp`, 22,3 s; con `robocopy /MT:16` (de Windows, solo lee la caché),
  11,3 s. Medido a solas, un consumidor Astro: 8,3 s con `cp` y 2,4 s con `robocopy`; los 7 restantes en
  paralelo, 15,0 s y 7,4 s. `copyTree` en `tests/lib/consumer.ts` usa `robocopy` y cae a `fs.promises.cp` si no
  está. La inyección de RF-6 sigue en rojo con el cambio.

- [x] **T-5 — Subconjuntos sin preparación que no necesitan**
  Cubre: RF-7, RF-8
  Archivos: `vitest.config.ts` (proyectos `unit` y `e2e`), `tests/global-setup.ts`,
  `tests/lib/need.ts`
  (`need(name)` sobre `inject`), los archivos de test con `inject` (cambio mecánico de `inject` a
  `need`)
  Hecho cuando:
  - Lo primero: comprobar que Vitest no ejecuta el `globalSetup` de `e2e` cuando no corre ningún
    archivo de `e2e`. Si lo ejecuta, la alternativa (variable de entorno) se decide y se anota.
  - `vitest run tests/contract.test.ts` no empaqueta ni construye, y tarda ≤ 30 s.
  - Un test que pide `gallery` sin la preparación falla con «falta la preparación `gallery`».
  - Un archivo de test nuevo con `inject` cae solo en `e2e`.
  - `npm test` corre los dos proyectos y da el mismo número de tests que antes.
  Inyección: poner un archivo con `inject` en la lista de `unit` pone en rojo RF-8 con el nombre de
  su preparación.

  Nota: hecha. Vitest no ejecuta el `globalSetup` de un proyecto sin archivos que correr (comprobado antes de
  tocar nada, anotado en `notes.md`), así que no hizo falta la variable de entorno. `vitest.config.ts` define
  `unit` (26 archivos, sin `globalSetup`) y `e2e` (24, con él); las listas salen de `splitTests`
  (`tests/lib/projects.ts`), que lee las llamadas `need('x')` o `inject('x')` de cada archivo, así que un archivo
  nuevo con `inject` cae solo en `e2e`. `tests/lib/need.ts` (`need(name)`) falla con «falta la preparación
  `<name>`: ejecuta el proyecto e2e o npm test»; los 24 archivos con `inject` pasan a `need` (cambio mecánico).
  `vitest run tests/contract.test.ts`: 3,3 s, sin `globalSetup`. Tests nuevos: `tests/need.test.ts` (1, con el
  fixture `tests/fixtures/missing-preparation`) y `tests/projects.test.ts` (7); de 873 a 881 (880 pasan y 1 se
  salta), ninguno borrado. Inyección vista en rojo: sacar `tests/gallery.test.ts` de la detección (queda en `unit`)
  pone en rojo `projects.test.ts` con «tests/gallery.test.ts asks for the preparation gallery». Desviaciones: `unit`
  tiene 26 archivos y no 22 (los 2 tests nuevos de esta tarea y los de las tareas anteriores); `projects` con `extends: true` y los
  tiempos de espera en la raíz; el recorrido de `tests/` es a mano, porque `readdirSync` recursivo sobre
  `fixtures` tardaba un minuto.

- [x] **T-6 — `npm test` con su tabla de fases**
  Cubre: RF-9
  Archivos: `scripts/test.mjs`, `tests/test-runner.test.ts`, `package.json` (solo `test`, sin el
  `tsc -p packages/react/tsconfig.build.json`)
  Hecho cuando:
  - `npm test` ejecuta los pasos de hoy en el mismo orden y para en el primero que falla, con su
    código de salida.
  - Al final pinta la tabla de fases, con los segundos y «acierto» o «construido».
  - `scripts/test.mjs` tiene sus tests como dato: el orden, que se para en el primer error y el
    formato de la tabla.
  - Un error de tipos sigue cortando la cadena con distinto de 0 (`AGENTS.md`).
  Inyección: un error de tipos en un archivo de `tests/` pone `npm test` en distinto de 0 sin llegar
  a Vitest.

  Nota: hecha. `scripts/test.mjs` (`testSteps`, `formatTable`, `runTests`; `scripts/test.d.mts` para
  importarlo desde TypeScript) ejecuta los pasos en el orden de siempre sin el `tsc -p …
  tsconfig.build.json`, vacía `phases.json` al empezar, para en el primer error con su código y pinta la
  tabla con las fases del `globalSetup` antes de `vitest`. `package.json`: solo `test`. Tests nuevos:
  `tests/test-runner.test.ts` (9); de 845 a 854, ninguno borrado. Inyección vista en rojo: un error de tipos
  en `tests/` dio `npm test` = 2 tras `tsc --noEmit`, sin llegar a Vitest, y se revirtió. El comentario
  `shortcut` de `tests/phases.test.ts` pasa a una nota sin `shortcut`: ya se limpia, salvo en un `vitest`
  suelto. Desviación: el paso `gallery:astro` va como `npm run gallery:astro`, para conservar su salida.

- [x] **T-7 — Limpieza de `%TEMP%` y de los Edge huérfanos de ejecuciones muertas**
  Cubre: RF-10
  Archivos: `tests/global-setup.ts` (limpieza al empezar, y `owner.json` con `runId` y `pid` en
  sus carpetas `cm-<runId>*`), `tests/lib/cleanup.ts` (nuevo), `tests/cleanup.test.ts` (nuevo)
  Hecho cuando:
  - Al empezar, se borran solo las carpetas `cm-*` cuyo `owner.json` nombra un `pid` que no vive.
    Una carpeta sin dueño legible y con menos de 24 h se deja.
  - Un Edge es huérfano de los tests solo si su `--user-data-dir` es un perfil
    `playwright_chromiumdev_profile-*` de `%TEMP%` y el proceso que lo lanzó ya no vive. Solo esos
    se cierran, por `pid`. Un Edge sin perfil de Playwright, el del usuario, nunca se toca.
  - Se borran los perfiles `playwright_chromiumdev_profile-*` que ningún Edge vivo usa.
  - `cleanup.test.ts` lo prueba como dato, con dueños falsos vivo y muerto, procesos falsos y una
    carpeta de `%TEMP%` de prueba.
  - Una ejecución viva de otro worktree, en paralelo, termina en verde mientras esta limpia.
  Inyección: tratar como muerto un dueño ilegible pone en rojo el caso de la carpeta reciente sin
  dueño; cerrar Edge por nombre de proceso pone en rojo el caso del Edge del usuario.

  Nota: hecha. `tests/lib/cleanup.ts` (`cleanup`, `writeOwner`, `userDataDir`, `parseProcesses`, `listProcesses`,
  `killTree`) y `tests/cleanup.test.ts` (12 tests, como dato: carpeta temporal de prueba, dueños y procesos
  falsos, nada real). El `globalSetup` limpia al empezar (fase `globalSetup: cleanup`, antes de crear nada) y
  escribe `owner.json` (`runId` y `pid`) en sus 6 carpetas `cm-<runId>*`. Reglas: una `cm-*` directamente en
  `%TEMP%` se borra si su dueño no vive, o si no tiene dueño legible y pasa de 24 h; un Edge se cierra, por pid
  (`taskkill /PID n /T /F`), solo si es la raíz de un árbol con `--user-data-dir` =
  `%TEMP%\\playwright_chromiumdev_profile-*` y su proceso padre (el lanzador) ya no vive; se borran los perfiles
  que ningún Edge vivo usa (los del Edge recién cerrado, y los de más de 2 minutos). Inyecciones vistas en rojo y
  revertidas: dueño ilegible tratado como muerto, 2 tests rojos (carpeta reciente sin dueño y la de 23 h); filtro
  de Edge sin mirar el perfil, 1 test rojo (el Edge del usuario). Desviaciones: `playwright-artifacts-*` no se
  toca (el plan no lo dice); el perfil sin Edge espera 2 minutos para no pisar al que está a punto de abrirse.

- [x] **T-8 — Medida final y muestra de inyecciones antiguas**
  Cubre: NFR de objetivo, NFR de guardas
  Archivos: `specs/017-tests-rapidos/notes.md` (sección «Después»)
  Hecho cuando:
  - Sin otra carga, la mediana de 3 ejecuciones sin cambios da ≤ 50 % de la base, y la de 3
    ejecuciones tras cambiar un byte de un componente, ≤ 70 %. Las cifras, junto a la base.
  - Las 6 inyecciones de `notes.md` (002 RF-5, 003 RF-7, 006 RF-2, 007 RF-7, 009 RF-2, 011 RF-1) se
    ven en rojo con `npm test` completo y se restauran por ruta.
  - El número de empaquetados, instalaciones, starters y builds de Storybook por ejecución es el
    mismo con y sin un componente de prueba añadido en la rama.
  Inyección: las 6 de la muestra.
  Nota: hecha, sin código cambiado. **Los dos objetivos NO se cumplen.** Sin cambios: mediana 125.3 s
  (126.2, 124.7, 125.3), 71.9 % de la base de 174.3 s, objetivo ≤ 50 %: no. Tras un byte de un componente:
  mediana 133.9 s (134.9, 133.9, 127.5), 76.8 %, objetivo ≤ 70 %: no (con un cambio que sí altera `dist/`,
  130.5 s, 74.9 %). El peso sigue en `vitest run` (110.6 s de 125.3): unos 35 s de `globalSetup` y tres archivos
  de navegador de unos 72 s que corren tras él. Las 6 inyecciones se ven en rojo con el test que les toca. El
  recuento (9 `npm pack`, 10 `npm install`, 0 starters) es el mismo con y sin un componente de prueba; Storybook
  se construye 1 vez si cambia `dist/` y 0 si no. Hallazgo: `phases.test.ts` sale en rojo en la primera
  ejecución tras cambiar `styles/museum.css` (doble build de `astro-render`). Las tablas, en la sección
  «Después» de `notes.md`.

## Segunda ronda (decisión del dueño, 2026-10-24)

«Arregla el fallo de astro-render y añade a la 017 tareas para bajar los tests de navegador y los
builds de consumidores, hasta llegar al 50 %.» Plan, sección «Segunda ronda». Mismas reglas de
arranque y de informe que arriba. Además:
- **Ningún caso se quita ni se afloja:** cada tarea que parte un archivo compara la lista de nombres
  de `it` antes y después (los mismos, y el mismo número), y reproduce una inyección del archivo.
- **No más de dos tareas con `npm test` a la vez**, para no tumbar archivos por carga.
- **Quién toca cada archivo compartido:**
  - `tests/global-setup.ts` y `tests/lib/consumer.ts`: solo la T-11;
  - `scripts/test.mjs`: solo la T-10;
  - `gallery/scripts/astro-cached.mjs`: solo la T-9.

- [x] **T-9 — Una sola build de `astro-render` también tras tocar la hoja**
  Cubre: RF-3, RF-4 (el fallo de la T-8)
  Archivos: `gallery/scripts/astro-cached.mjs` (ejecuta `scripts/sync-styles.mjs` de los dos
  paquetes antes de calcular la clave), `tests/astro-render-key.test.ts` (nuevo)
  Hecho cuando:
  - Tras cambiar `styles/museum.css` sin `build:packages`, una sola ejecución construye
    `astro-render` una vez y `phases.test.ts` sale en verde a la primera.
  - El build lee la hoja de esta ejecución: `packages/astro/styles.css` es igual, byte a byte, a
    `styles/museum.css` cuando se calcula la clave.
  - `tests/astro-render-key.test.ts` lo comprueba como dato, con una hoja copiada vieja en una
    carpeta temporal: la clave cambia tras la copia, y no antes.
  Inyección: quitar la llamada a `sync-styles` vuelve a dar dos builds tras tocar la hoja y pone en
  rojo `phases.test.ts`, y el test nuevo.
  Nota: hecha. `astro-cached.mjs` exporta `astroRenderKey(root)`, que ejecuta `scripts/sync-styles.mjs`
  en `packages/react` y `packages/astro` y luego calcula la clave; `ensureAstroRender` la usa (más su
  declaración en `astro-cached.d.mts`). Tests: 893 antes, 894 después (el nuevo
  `tests/astro-render-key.test.ts`, que prueba la clave con una raíz temporal y una hoja vieja en los dos
  paquetes). Tras un byte de `styles/museum.css` sin `build:packages`, un solo `npm test` sale en 0 con
  `gallery:astro` «construido» y `globalSetup: astro-render` «acierto». Inyección (el bucle sin paquetes) en
  rojo: `phases.test.ts` y el test nuevo.

- [x] **T-10 — Los pasos de tipos de `npm test`, en paralelo**
  Cubre: NFR de objetivo
  Archivos: `scripts/test.mjs` (`gallery:astro` primero; luego los dos `tsc` y los tres
  `astro check` a la vez; luego `vitest`), `tests/test-runner.test.ts`
  Hecho cuando:
  - Un error de tipos en cualquiera de los cinco pasos sigue cortando antes de Vitest, con el
    código de salida de ese paso. Si fallan varios, el código es distinto de 0 y la salida nombra
    cada uno.
  - La tabla de fases da cada paso con su tiempo, y el bloque paralelo con el suyo.
  - `tests/test-runner.test.ts` lo prueba como dato, con pasos falsos (uno lento, uno que falla).
  - Los cinco pasos tardan, juntos, ≤ 6 s en la máquina de la T-8 (eran 14.3 s en serie).
  Inyección: un error de tipos en `tests/`, con el bloque paralelo, pone `npm test` en distinto de 0
  sin llegar a Vitest.

  Va en la ola 8 junto a la T-9: no comparten archivos.
  Nota: hecha. `scripts/test.mjs` da a los cinco pasos de tipos `group: 'tipos'`; `runTests` espera (`await`) a cada
  etapa: `gallery:astro` sola, el grupo con `Promise.all`, y `vitest`. En un grupo todos acaban, el código es el del
  primer fallo (en el orden de la lista) y se imprime `fallaron: <paso> (<código>), ...`. `runStep` pasa a `spawn`
  asíncrono con la salida guardada y volcada al acabar el paso, para que no se entrelace. La tabla da cada paso con
  sangría y su tiempo, y una fila `tipos` con el del bloque; el total no cuenta los pasos anidados. Tests: de 10 a 14 en
  `test-runner.test.ts` (grupo, concurrencia, un fallo con su código, varios fallos nombrados, total sin doble cuenta),
  vistos en rojo antes. Inyección vista en rojo: `tests/zz-inject.ts` con `const bad: number = "x"` da salida 2, nombra
  `tsc --noEmit (2)` y no llega a Vitest; revertida. Medida: el bloque tardó 6.6 s en una ejecución corta con otra tarea
  en marcha (objetivo ≤ 6 s); en el `npm test` completo, con dos `npm test` a la vez, 39.7 s: no es una medida fiable.

- [x] **T-11 — Builds de consumidores guardados, y cada consumidor en su cadena**
  Cubre: RF-5, RF-6 (los builds), NFR de objetivo
  Archivos: `tests/global-setup.ts` (una cadena por consumidor: restaurar, instalar tarballs, build
  y type check; todas en paralelo), `tests/lib/consumer.ts` (build guardado por clave),
  `tests/consumer-cache.test.ts`
  Hecho cuando:
  - La clave de un build es la del consumidor (T-4) más el `sha256` de los tarballs que tiene
    instalados. Si hay acierto, se restaura la salida (`dist/`) en lugar de construir.
  - Con un byte distinto en un tarball, el build se rehace.
  - Los type checks (`checkButtonTypes`, 002 RF-5) se ejecutan siempre, nunca desde la caché, y
    siguen fallando con `variant="nope"`.
  - El `globalSetup` sin cambios baja de unos 35 s a ≤ 20 s (la fase de cada cadena, en la tabla).
  - `consumer.test.ts` (RF-3 y RF-6) sigue en verde sin cambiar sus casos.
  Inyección: guardar el build con una clave sin los tarballs reutiliza un `dist/` viejo tras cambiar
  un componente, y pone en rojo el caso de `consumer-cache.test.ts` que lo comprueba.
  Nota: hecha. `tests/lib/consumer.ts` añade `buildKey` (la clave del consumidor más el `sha256` de los bytes
  de cada tarball instalado, por nombre de paquete), `consumerBuildKey` (le suma los archivos que escriben las
  fuentes del consumidor: `consumer.ts`, `museum-guard.mjs` y el contrato de Button) y `buildCached` (acierto:
  restaura `dist/` y la salida guardada, sin construir ni escribir; fallo: construye y solo guarda un build que
  acaba en 0). Se guarda en `node_modules/.museum-cache/consumers/builds/<forma>-<framework>/`. `global-setup.ts`
  pasa a una cadena por consumidor (crear, build guardado, type check), las 8 a la vez; los type checks
  (`checkButtonTypes`) se ejecutan siempre. Fases nuevas en la tabla: `build`, `type check` y `chain` por consumidor.
  Tests: 6 nuevos en `consumer-cache.test.ts` (11 en el archivo; `npm test` da 904 y 1 omitido). Inyección (la clave
  sin los tarballs) en rojo: «changes with one byte of any tarball»
  y «rebuilds once a tarball byte differs». Segunda ejecución de `npm test`: los 6 builds en acierto (0.0 a 0.2 s
  cada uno, de 12.0 s) y la caché de builds ocupa 1.7 MB. Las cadenas tardan 5.8 a 13.7 s y la de package-astro
  37.8 s (su `astro check`, 24.4 s, con otro `npm test` en paralelo). Con carga, el ≤ 20 s no se confirma por el
  `astro check`; sin carga queda por medir (T-16).

- [x] **T-12 — `field-a11y` partido por `kind`**
  Cubre: NFR de objetivo
  Archivos: `tests/lib/field-a11y.ts` (el cuerpo de hoy, como `defineFieldA11y(kind)`);
  `tests/field-a11y.test.ts` pasa a `tests/field-a11y-input.test.ts`,
  `tests/field-a11y-textarea.test.ts` y `tests/field-a11y-checkbox.test.ts`
  Hecho cuando:
  - Los tres archivos dan, juntos, la misma lista de nombres de `it` que el de hoy, y el mismo
    número de tests.
  - Cada archivo tarda ≤ 30 s.
  - Caen en el proyecto `e2e` (usan `inject`).
  Inyección: la 009 RF-2 de la T-8 (sin `htmlFor` en `field.tsx`) pone en rojo RF-2 en los tres
  archivos.

  Va en la ola 9 junto a la T-11: no comparten archivos.
  Nota: hecha. El cuerpo vive en `tests/lib/field-a11y.ts` como `defineFieldA11y(kind, consumers)` (su Edge y su
  `afterAll` dentro de la función); cada `tests/field-a11y-{input,textarea,checkbox}.test.ts` llama a
  `need('consumers')` él mismo y se lo pasa, así que `splitTests` los manda a `e2e` sin tocar `projects.ts`;
  `tests/projects.test.ts` lo comprueba (un test nuevo). Nombres de `it` expandidos (JSON de Vitest) antes y
  después: 210 y 210, listas idénticas (54 Input, 66 Textarea, 90 Checkbox). Tiempos de archivo (junit, con otro
  `npm test` en paralelo): Checkbox 17.9 s, Textarea 8.6 s, Input 7.3 s (≤ 30 s; el de hoy eran unos 73 s).
  Inyección (sin `htmlFor` en `field.tsx`): RF-2 en rojo en los tres archivos (React, tres modos cada uno; también
  caen RF-6, RF-9, RF-10 y RF-12 de Checkbox/Input/Textarea que dependen de la etiqueta), revertida por ruta.

- [x] **T-13 — El RF-5 de los consumidores, en su archivo y en paralelo**
  Cubre: NFR de objetivo
  Archivos: `tests/consumer.test.ts` (sin el bloque «undeclared module (RF-5)»),
  `tests/consumer-undeclared.test.ts` (nuevo: el bloque, con React y Astro a la vez y
  `buildConsumerAsync` en lugar de `buildConsumer`)
  Hecho cuando:
  - Los dos archivos dan, juntos, la misma lista de nombres de `it` que el de hoy.
  - En cada framework se siguen viendo los tres pasos: falla con el módulo en la raíz, falla con el
    módulo en el padre, y pasa al declararlo.
  - Cada archivo tarda ≤ 40 s.
  - Los dos frameworks trabajan en carpetas distintas de `cm-*-guard`, sin pisarse.
  Inyección: declarar el módulo en el consumidor guardado, antes del primer build, pone en rojo el
  primer paso en los dos frameworks.

  Nota: hecha. `tests/consumer-undeclared.test.ts` llama a `need('consumers')` él mismo, así que `splitTests`
  lo manda a `e2e` sin tocar `projects.ts`; `tests/projects.test.ts` lo comprueba (un test nuevo). Nombres de
  `it` (JSON de Vitest) antes y después: 25 y 25, listas idénticas (23 en `consumer.test.ts`, 2 en el nuevo).
  Desvío del plan: el módulo sin declarar se pone en la raíz del repo y en el padre de los consumidores, que los
  dos frameworks comparten; por eso no hay un `it` en paralelo por framework, sino un `beforeAll` que, en cada
  paso, coloca el módulo, construye los dos consumidores a la vez con `buildConsumerAsync` y lo quita; luego
  declara, instala y construye los dos a la vez, cada uno en su carpeta de `cm-*-guard`. Cada `it` comprueba
  los tres pasos de su framework. El `beforeAll` lleva su propio timeout (300 s; el del `describe` no llega a los
  hooks y con 30 s cayó bajo carga). El `afterAll` de la foto del árbol (RF-6) pasó al archivo nuevo: en
  `consumer.test.ts` corría a la vez que el módulo puesto en la raíz y veía `node_modules/museum-undeclared`.
  Tiempos (junit): `consumer-undeclared` 16.4 s, `consumer` 0.3 s de tests (el de hoy eran unos 72 s con carga,
  21.5 s solo). Inyección (copiar el módulo en `node_modules` de cada consumidor guardado antes del primer
  build): el primer paso en rojo en React y en Astro (el build sale con 0), revertida por ruta.

- [x] **T-14 — `gallery-browser` partido por componente**
  Cubre: NFR de objetivo
  Archivos: `tests/lib/gallery-browser.ts` (el cuerpo de hoy), un archivo
  `tests/gallery-browser-<componente>.test.ts` por contrato con historia React, y
  `tests/gallery-browser-classes.test.ts` (el bloque de clases de ejemplo)
  Hecho cuando:
  - La misma lista de nombres de `it` que hoy, y el mismo número de tests.
  - Un componente nuevo con contrato tiene que tener su archivo: un test como dato compara los
    contratos con historia React con los archivos `gallery-browser-*.test.ts`, y falla si falta uno.
  - Cada archivo tarda ≤ 30 s.
  Inyección: quitar un archivo de componente pone en rojo el test como dato; romper el control de
  una prop en la historia de Input pone en rojo su archivo.

  Va en la ola 10 junto a la T-13: no comparten archivos.
  Nota: hecha. El cuerpo vive en `tests/lib/gallery-browser.ts` (renombrado con `git mv`): `defineGalleryBrowser(componente,
  storybook)` para el bloque RF-4 de un componente y `defineExampleClasses(storybook)` para los bloques de clases de
  ejemplo (el «offers … example class» y el RF-9). Cada `tests/gallery-browser-{button,checkbox,input,textarea,classes}.test.ts`
  llama a `need('gallery')` él mismo, así que `splitTests` los manda a `e2e` sin tocar `projects.ts`. `tests/projects.test.ts`
  tiene dos tests nuevos al final: los `gallery-browser-*` están en `e2e` y piden `gallery`, y hay un archivo por contrato
  con historia React (el test como dato). Nombres de `it` (JSON de Vitest) antes y después: 20 y 20, listas idénticas.
  Inyecciones: quitar `tests/gallery-browser-textarea.test.ts` pone en rojo el test como dato; una historia de Input que
  ignora sus args (`render: () => <Input label="Email" />`) pone en rojo los dos `it` de `gallery-browser-input` y deja en
  verde el de Button; las dos revertidas por ruta.

- [x] **T-15 — `theme` por framework y `gallery-story-theme` por historia**
  Cubre: NFR de objetivo
  Archivos:
  - `tests/lib/theme.ts`, `tests/theme-react.test.ts` y `tests/theme-astro.test.ts`, desde
    `tests/theme.test.ts`;
  - `tests/lib/story-theme.ts` y un archivo por historia, desde `tests/gallery-story-theme.test.ts`.
  Hecho cuando:
  - Cada par de archivos da la misma lista de nombres de `it` que su original, y el mismo número de
    tests.
  - Cada archivo tarda ≤ 35 s.
  Inyección: la 011 RF-1 de la T-8 (oscuro del sistema en `:root`) pone en rojo los dos archivos de
  `theme`; quitar `min-height: 100vh` de `preview-head.html` pone en rojo
  `gallery-story-theme-button-react--default`, como en el original.

  Va en la ola 11, sola.
  Nota: hecha. Los cuerpos viven en `tests/lib/theme.ts` (`defineTheme(framework, consumers)`) y `tests/lib/story-theme.ts`
  (`defineStoryTheme(storyId, storybook)`), movidos con `git mv`; cada `tests/theme-{react,astro}.test.ts` y
  `tests/gallery-story-theme-<id>.test.ts` llama a `need(...)` él mismo, así que `splitTests` los manda a `e2e` sin tocar
  `projects.ts`. Se parte por id de historia (`button-react--default`, `button-astro--variants`, `button-documentation--docs`,
  `matrix--docs`): 4 archivos. `tests/projects.test.ts` tiene dos tests nuevos al final: los archivos están en `e2e` y piden
  `consumers` / `gallery`, y hay un archivo por id de `storyIds` (el test como dato). Nombres de `it` (JSON de Vitest) antes y
  después: 68 y 68 en `theme`, 26 y 26 en `story-theme`, listas idénticas. Tiempos de archivo (JSON, `vitest run` completo,
  segunda pasada): theme-astro 28.0 s, theme-react 27.6 s, story astro 16.8 s, story react 13.6 s, docs de Button 4.8 s,
  matrix 2.7 s (≤ 35 s; los de hoy eran unos 61 y 48 s). La primera pasada, tras `npm test`, dio 43.3 y 39.9 s en `theme` y
  2 rojos ajenos en `consumer.test.ts` (RF-5, tarballs de la guarda); la segunda, en verde.
  Inyecciones: el oscuro del sistema también en `:root` (`styles/museum.css`) pone en rojo 14 tests en cada archivo de `theme`;
  quitar `min-height: 100vh` de `preview-head.html` pone en rojo 4 `it` RF-1 de `gallery-story-theme-button-react--default` y
  deja en verde los otros tres (la historia de Astro es más alta que el viewport y las de docs no usan el decorador; el
  original ya solo caía ahí). Las dos revertidas por ruta.

- [x] **T-16 — Volver a medir, como la T-8**
  Cubre: NFR de objetivo, NFR de guardas
  Archivos: `specs/017-tests-rapidos/notes.md` (sección «Después de la segunda ronda»)
  Hecho cuando:
  - Se anotan las series «sin cambios» y «un byte», con el mismo método que la T-8: sin otra carga,
    calentamiento aparte, 3 pasadas por serie y mediana. Cada serie va con su % de la base
    (174.3 s) y con si cumple el 50 % y el 70 %.
  - Se anota la tabla de fases y los 6 archivos más lentos, con cuándo empiezan.
  - La muestra de 6 inyecciones de la T-8 sigue en rojo con `npm test` completo.
  - Si un objetivo no se cumple, se dice cuánto falta y dónde, sin tocar código.
  Inyección: las 6 de la muestra.
  Nota: hecha, sin código cambiado. **Los dos objetivos NO se cumplen.** Sin cambios: mediana 126.7 s (125.3, 128.0, 126.7), 72.7 % de 174.3 s, objetivo ≤ 50 %: no, faltan 39.5 s. Un byte (cambio que altera `dist/`): mediana 127.9 s (131.4, 127.9, 124.2), 73.4 %, objetivo ≤ 70 %: no, faltan 5.9 s. Se lo llevan `consumer-undeclared.test.ts` (71 s tras un `globalSetup` de 31 s) y el type check de package-astro en el `globalSetup` (19 s). Las 6 inyecciones, en rojo con `npm test` completo. Tipos: 15.6 s en serie, 5.3 s a la vez. Tablas en «Después de la segunda ronda» de `notes.md`.

## Grafo de olas

| Ola | Tareas | Por qué esperan |
|---|---|---|
| 1 | T-1 | — (la base, sin otra carga) |
| 2 | T-2 | La base; abre `scripts/cache.mjs` y `phases.json`. |
| 3 | T-3 ∥ T-6 | `phases.json` (T-2); no comparten archivos. |
| 4 | T-4 | `consumer.ts` y `global-setup.ts` tras la T-3. |
| 5 | T-5 | `global-setup.ts` tras la T-4. |
| 6 | T-7 | `global-setup.ts` tras la T-5. |
| 7 | T-8 | Todo lo anterior, sin otra carga. |
| 8 | T-9 ∥ T-10 | La T-8 y su hallazgo; no comparten archivos. |
| 9 | T-11 ∥ T-12 | Tras la ola 8; no comparten archivos. |
| 10 | T-13 ∥ T-14 | `consumer.ts` de la T-11 (para la T-13); no comparten archivos. |
| 11 | T-15 | Sola, para no pasar de dos `npm test` a la vez. |
| 12 | T-16 | Todo lo anterior, sin otra carga. |
