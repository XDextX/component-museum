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

- [ ] **T-4 — Consumidores guardados entre ejecuciones, con los tarballs nuevos**
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

- [ ] **T-5 — Subconjuntos sin preparación que no necesitan**
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

- [ ] **T-6 — `npm test` con su tabla de fases**
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

- [ ] **T-7 — Limpieza de `%TEMP%` y de los Edge huérfanos de ejecuciones muertas**
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

- [ ] **T-8 — Medida final y muestra de inyecciones antiguas**
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
