# Plan 017 — tests-rapidos

**Approved:** 2026-10-23 · el coordinator en modo autónomo; con el RF-10 de limpieza

Parte de `spec.md`, aprobada por el dueño (9 RF): va en la entrega 4, tras la 012, y los
consumidores se guardan entre ejecuciones. También parte de `notes.md` (medidas bajo carga,
recuento del trabajo repetido, muestra de inyecciones, riesgo de los Edge huérfanos).

Comprobado en `spec/017-tests-rapidos` (d0e24e1):
- **El script `test`** de `package.json` hace, por este orden:
  - `tsc -p packages/react/tsconfig.build.json`;
  - `npm run gallery:astro` (`astro build` de `astro-render` y `extract-astro.mjs`);
  - los dos `tsc --noEmit`;
  - tres `astro check`;
  - `vitest run`.

  `tsc --noEmit -p gallery` necesita el JSON de `gallery/generated/`, porque lo importan las
  historias Astro. Por eso `gallery:astro` va antes.
- **`tests/global-setup.ts`:**
  - toma el lock;
  - crea los starters con `npm exec`;
  - crea 8 consumidores con `createConsumer`, que empaqueta cada vez por `installPackage`;
  - construye 6 de ellos, más dos `checkButtonTypes`;
  - y, en paralelo, `buildGallery`: `prepack`, `astro build`, extracción y build de Storybook.
- **De los 44 archivos de test, 22 no usan `inject`** y no necesitan el `globalSetup`.
  - Entre ellos, `packages.test.ts` y `styles.test.ts` empaquetan por su cuenta.
  - `release.test.ts` crea su propio repo temporal.
- `vitest.config.ts` tiene un solo proyecto con `globalSetup: ['tests/global-setup.ts']`.

## Decisiones tomadas en el plan (opción conservadora)

- **La limpieza de `%TEMP%` y de los Edge huérfanos no está en la spec aprobada.** Las carpetas
  `cm-*` y `playwright_chromiumdev_profile-*` que dejan las ejecuciones cortadas, y los `msedge` sin
  cerrar, piden un RF nuevo, porque la spec manda y lo que no está en ella no se implementa.
  - El coordinator aprobó el cambio (RF-10, modo autónomo); la T-7 lo implementa.
- **Una sola clave honesta por build.** Es un `sha256` de:
  - el contenido de cada archivo de entrada, con su ruta, en orden;
  - las versiones de Node y npm;
  - el `package-lock.json`.
- **Un build solo vale si existen a la vez su salida y su clave.**
  - La clave se escribe la última, con escritura a un temporal y `rename`.
  - Un build a medias nunca tiene clave.
- **La caché vive en `node_modules/.museum-cache/`**, una por checkout, junto al lock.
- **El subconjunto (RF-7) son dos proyectos de Vitest:**
  - `unit`: los 22 archivos sin `inject`, sin `globalSetup`;
  - `e2e`: el resto, con el `globalSetup` de hoy.

  `npm test` corre los dos. Lo primero de la T-5 es comprobar que Vitest no ejecuta el
  `globalSetup` de un proyecto sin archivos que correr; si lo ejecuta, la alternativa es una
  variable de entorno, decidida en la T-5 y anotada.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | Un `npm pack` por paquete (React, Astro, `test-package` y el no declarado) al principio del `globalSetup`; `installPackage` recibe tarballs; `packages.test.ts` y `styles.test.ts` usan los de la ejecución (T-3). |
| RF-2 | `buildGallery` deja de construir `astro-render`: usa el JSON del script `test` (T-2). |
| RF-3, RF-4 | `scripts/cache.mjs` con clave de entradas; Storybook en el `globalSetup` y `astro-render` en `gallery:astro`, los dos a través de ella (T-2). |
| RF-5 | Consumidores guardados por clave (starter fijado, `package.json` y lockfile del consumidor sin tarballs, Node y npm), copiados a `%TEMP%` en cada ejecución (T-4). |
| RF-6 | Tras copiar, `npm install --offline` de los tarballs de la ejecución; el test compara el hash (T-4). |
| RF-7, RF-8 | Proyectos `unit` y `e2e`; cada preparación que falta falla con su nombre (T-5). |
| RF-9 | `scripts/test.mjs` cronometra cada paso del script, lee las fases que deja el `globalSetup` y pinta la tabla (T-6). |
| NFR objetivo | Base (T-1) y medida final, con mediana de 3 (T-8). |
| NFR guardas | La muestra de 6 inyecciones de `notes.md`, reproducidas (T-8). |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad | Tarea |
|---|---|---|---|
| `specs/017-tests-rapidos/notes.md` | mod. | La base: 3 ejecuciones, mediana, desglose por fase, recuento de `msedge` y de carpetas de `%TEMP%`. | T-1 |
| `scripts/cache.mjs` | sí | `inputKey(files, extra)` y `cached(name, key, outputs, build)`: decide si un build guardado vale y lo guarda de forma atómica. | T-2 |
| `gallery/scripts/astro-cached.mjs` | sí | `astro build` de `astro-render` y la extracción, a través de `cached()`. | T-2 |
| `tests/cache.test.ts` | sí | `scripts/cache.mjs` como dato: misma entrada da misma clave; un byte cambia la clave; sin clave o sin salida, reconstruye. | T-2 |
| `tests/global-setup.ts` | mod. | Una preparación por fase, con su tiempo; un empaquetado por paquete; Storybook por la caché; consumidores por la caché. | T-2, T-3, T-4, T-5 |
| `tests/lib/consumer.ts` | mod. | `installPackage` recibe tarballs; `createConsumer` copia el consumidor guardado o lo crea y lo guarda. | T-3, T-4 |
| `tests/packages.test.ts`, `tests/styles.test.ts` | mod. | Leen los tarballs de la ejecución en lugar de empaquetar. | T-3 |
| `tests/consumer.test.ts` | mod. | RF-6: el paquete instalado es el tarball de la ejecución; las comprobaciones de hoy siguen. | T-4 |
| `vitest.config.ts` | mod. | Proyectos `unit` y `e2e`. | T-5 |
| `scripts/test.mjs` | sí | Ejecuta los pasos de `npm test` en orden, para en el primer error con su código y pinta la tabla de fases. | T-6 |
| `package.json` | mod. | `gallery:astro` pasa a `node gallery/scripts/astro-cached.mjs` (T-2); `test` pasa a `node scripts/test.mjs`, sin el `tsc -p … build` (T-6). | T-2, T-6 |
| `tests/test-runner.test.ts` | sí | `scripts/test.mjs` como dato: el orden de los pasos, que para en el primero que falla, y la tabla. | T-6 |
| `tests/lib/cleanup.ts`, `tests/cleanup.test.ts` | sí | RF-10: qué restos de `%TEMP%` y qué Edge son de una ejecución muerta, y su borrado. | T-7 |
| `specs/017-tests-rapidos/notes.md` | mod. | Medida final y la muestra de inyecciones en rojo. | T-8 |

**Por qué hay poco paralelismo.** Casi todo pasa por `tests/global-setup.ts` y
`tests/lib/consumer.ts`, que son compartidos. Las tareas que los tocan van una detrás de otra.
Solo la T-6, que toca `package.json` (la línea `test`) y sus scripts nuevos, va en paralelo con la
T-3. `package.json` lo tocan la T-2 y la T-6, en olas distintas.

## 3. Lógica pura

```js
// scripts/cache.mjs — Node only, no dependencies (node:crypto, node:fs)
inputKey(files: string[], extra: Record<string, string>): string
  // sha256 over each file's repo-relative path and bytes, sorted by path, then extra sorted by key
cached(name: string, key: string, outputs: string[], build: () => Promise<void>): Promise<'hit' | 'built'>
  // hit only if node_modules/.museum-cache/<name>.key equals key AND every output exists
```

## 4. Algoritmo

**Entradas de cada build (RF-3, RF-4):**
- **`astro-render`:**
  - `gallery/astro-render/**`, sin `dist`;
  - `packages/astro/{index.js,index.d.ts,src/**,styles.css}`;
  - `gallery/lib/contract-args.ts` y `contracts/*.json`;
  - `gallery/scripts/extract-astro.mjs` y `styles/museum.css`;
  - `package-lock.json`, más Node y npm.
  - Salidas: `gallery/astro-render/dist/` y `gallery/generated/*.json`.
- **Storybook:**
  - `gallery/{.storybook,stories,lib}/**`, `gallery/package.json` y `gallery/generated/*.json`;
  - `packages/react/{dist,styles.css,package.json}` y `packages/astro/styles.css`;
  - `contracts/*.json`, `styles/museum.css` y `package-lock.json`, más Node y npm.
  - Salida: `gallery/storybook-static/`.
- **La clave se calcula después del `prepack`**, para que lea el `dist/` y el `styles.css` recién
  escritos. Cualquier cambio en un componente cambia el `dist/` y, con él, la clave.

**Un empaquetado por paquete (RF-1, T-3):**
1. Al principio del `globalSetup`, `npm pack` de `packages/react`, `packages/astro`,
   `tests/fixtures/test-package` y el paquete no declarado, en `cm-<runId>-pack/`.
2. Cada `npm pack` ejecuta su `prepack` una vez.
3. Los tarballs pasan a `createConsumer` y se exponen a los tests con `provide('tarballs', …)`.
4. `packages.test.ts` lista los archivos del tarball con `tar -tf` de Windows (`tar.exe`) en lugar
   de `npm pack --dry-run`. Lo primero es comprobar que `tar` está; si no, se lee el tarball con
   `node:zlib` y una lectura mínima de cabeceras.
5. `styles.test.ts` desempaqueta el tarball de la ejecución.
6. El `tsc -p packages/react/tsconfig.build.json` del script `test` lo quita la T-6: el `prepack` ya
   compila.

**Consumidores guardados (RF-5, RF-6, T-4):**
1. La clave de cada consumidor es su forma (plain, guarded, package o tailwind, y el framework), el
   starter fijado, el `package.json` y el lockfile del starter sin los tarballs, y Node y npm.
2. Si hay acierto, se copia `node_modules/.museum-cache/consumers/<forma>-<framework>/` a
   `%TEMP%/cm-<runId>…/` con `cpSync`.
3. Si no, se crea como hoy, se instalan las dependencias del starter (y `@astrojs/check` en el de
   Astro) y se guarda una copia sin los tarballs.
4. En los dos casos, después: `npm install --offline --no-save` de los tarballs de la ejecución, y
   el build del consumidor.
5. RF-6: el test compara el `sha256` de cada `node_modules/@component-museum/*/package.json` y
   `dist/index.js` instalados con los del tarball de la ejecución.

**Subconjunto (RF-7, RF-8, T-5):**
- `vitest.config.ts` define `projects`: `unit` (los 22 archivos sin `inject`) y `e2e` (el resto,
  con `globalSetup`).
- La lista de `unit` se calcula leyendo los archivos: un test con `inject(` cae en `e2e`, así que un
  archivo nuevo no se queda sin preparación.
- RF-8: cada `inject` va por un `need(name)` en `tests/lib/`, que falla con
  «falta la preparación <name>: ejecuta el proyecto e2e o npm test» si el valor no se proveyó.

**Tabla de fases (RF-9, T-6):**
- `scripts/test.mjs` ejecuta los pasos del script `test` de hoy, en el mismo orden y sin
  `tsc -p … build`, y para en el primero que falla con su código.
- Mide cada paso y lee `node_modules/.museum-cache/phases.json`, que escribe el `globalSetup` con
  la duración de cada preparación (T-2 deja el ayudante `phase(name, fn)`).
- Pinta una tabla de fases con sus segundos y si fue acierto de caché.
- `gallery:astro` ya pasa por `cached()` desde la T-2 (`gallery/scripts/astro-cached.mjs`).

**Muestra de inyecciones (T-8).** Las 6 de `notes.md`, cada una en la rama del worktree, con
`npm test` completo en rojo y restaurada por ruta:
- 002 RF-5 y 006 RF-2, que pasan por el tarball y los consumidores guardados;
- 003 RF-7 y 011 RF-1, por la hoja cacheada en Storybook;
- 009 RF-2, por el ayudante;
- 007 RF-7, por la galería cacheada.

## 5. Interfaz

- **`npm test`:** la misma salida que hoy, más una tabla al final:

  | fase | segundos | caché |
  |---|---|---|
  | `gallery:astro` | 0.4 | acierto |
  | `tsc --noEmit` | … | — |
  | … | | |
  | `globalSetup: consumidores` | … | acierto |
  | `vitest` | … | — |
  | total | … | |

- **Preparación que falta (RF-8):** «falta la preparación `gallery`: ejecuta el proyecto e2e o
  `npm test`».
- **Sin caché** (primera vez, o tras borrar `node_modules/`): todo se construye y se guarda; la
  tabla dice «construido».

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **Clave con el contenido de los archivos, no con fechas.** | `mtime`: un `git checkout` o un `cpSync` cambia fechas sin cambiar el contenido, y al revés. |
| **El `astro-render` lo construye solo el script (`gallery:astro`).** | Solo el `globalSetup`: `tsc --noEmit -p gallery` necesita el JSON antes de Vitest. |
| **Consumidores copiados de la caché a `%TEMP%`, con `npm install --offline` de los tarballs.** | Instalar en la caché misma: dos checkouts o una ejecución cortada dejarían una caché sucia. |
| **Proyectos `unit` y `e2e`.** | Detectar en el `globalSetup` qué archivos se van a correr: Vitest no lo expone de forma estable. |
| **`scripts/test.mjs` en lugar de la cadena con `&&`.** | Medir con `time` desde fuera: la tabla no sabría qué fue acierto de caché. |
| **La limpieza, con su propio RF por cambio de spec.** | Meterla sin RF: la spec manda, y una limpieza de `%TEMP%` mal acotada podría borrar los datos de otra ejecución viva. |

**Dependencias (regla 9).** Ninguna nueva: `node:crypto`, `node:fs`, `node:zlib` y el `tar.exe` de
Windows.

**Commits:** las tareas no tocan `packages/`, `styles/` ni lo que se publica. Van con `test:`,
`build:` o `refactor:` sin scope, citando la spec.

## 7. Estrategia de tests

- **Runner:** Vitest, con Edge vía `playwright-core`.
- **Como dato:** `scripts/cache.mjs` (T-2) y `scripts/test.mjs` (T-6).
- **De ejecución completa:** RF-1 a RF-6 cuentan invocaciones en el registro de fases de una
  ejecución, y la segunda ejecución sin cambios da aciertos (T-2 a T-4).
- **Inyección por tarea:** su línea «Inyección:», en la rama del worktree, y el commit dice cuál se
  vio en rojo (regla 8). Más la muestra de 6 de las specs anteriores (T-8).
- **Sin aflojar:** cada tarea da el número de tests antes y después, y ninguno se borra.
- **Antes de reportar:** el build de `packages/react`, `npm run gallery:astro`, los dos `tsc` y
  `npm test`. Las notas, en UTF-8 y CRLF.
- **Sin carga ajena:** la T-1 y la T-8 miden con la máquina sin otras ejecuciones. El coordinator
  no lanza otras tareas mientras corren.
- **Proporción:** 8 tareas para 10 RF.
