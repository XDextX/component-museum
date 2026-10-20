# Tareas 001 — base-tests

**Approved:** 2026-10-19 · el dueño aprobó el plan y las 8 tareas, con Node 24 LTS y `package-lock.json` versionado
Tras la aprobación se añadieron la T-6b y la T-9, cada una por decisión del dueño: hoy son 10 tareas.

Requisito previo: Node 24 LTS instalado por el dueño (plan, «Decisiones del dueño»).

- [x] **T-1 — Crear la base de la raíz y el primer test**
  Cubre: RF-1
  Archivos: `.gitignore`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`,
  `tests/lib/paths.ts`, `tests/paths.test.ts`
  Hecho cuando: `node -v` da 24.x; `.gitignore` ya no ignora `package-lock.json` y este existe;
  `npm test` termina en 0 con los tests de `isOutside` (incluido el caso de otra
  unidad en Windows) y de `consumerDir`; con un `expect(1).toBe(2)` temporal, termina en distinto
  de 0.
  Inyección: un test temporal `tests/injected.test.ts` con `expect(1).toBe(2)` → `npm test` exit
  1, «1 failed | 9 passed», nombrando `tests/injected.test.ts:4:13`; borrado por ruta,
  `git status` igual y exit 0.

- [x] **T-2 — Probar que un test rojo para la suite y se nombra**
  Cubre: RF-2
  Archivos: `tests/lib/run.ts`, `tests/fixtures/failing-suite/`, `tests/runner.test.ts`
  Hecho cuando: el meta-test lanza Vitest sobre `failing-suite`, ve código distinto de 0 y el
  nombre del test y de su archivo en la salida; `npm test` sigue en 0.
  Inyección: la fixture `failing-suite` hecha pasar (`toBe(2)` → `toBe(1)`) → el meta-test en rojo
  (`expected +0 not to be +0`), exit 1; fixture restaurada con el mismo sha256.

- [x] **T-3 — Leer estilos en Edge con esquema emulado y sin JavaScript**
  Cubre: RF-3
  Archivos: `tests/lib/browser.ts`, `tests/fixtures/style-page.html`, `tests/browser.test.ts`
  Hecho cuando: el test lee el color oscuro con `colorScheme: 'dark'`, el claro con `'light'`, y
  sin JavaScript el color original que el script habría cambiado; invertir el esquema esperado lo
  pone en rojo. Antes de nada, comprobar si `evaluate` responde con JavaScript desactivado; si no,
  leer por CDP (plan, bloque 6).
  Inyección: el esquema esperado invertido en `tests/browser.test.ts` → los 2 tests de esquema en
  rojo (`expected 'rgb(20, 20, 20)' to be 'rgb(240, 240, 240)'` y al revés), exit 1; restaurado
  con el mismo sha256.

- [x] **T-4 — Añadir el paquete de prueba y la comprobación de tipos**
  Cubre: RF-8
  Archivos: `tests/fixtures/test-package/`, `package.json` (script `test` y `@types/node`
  `^24.19.2`), `package-lock.json`, `tsconfig.json` (vuelve `types: ["node"]`),
  `tests/typecheck.test.ts`
  Hecho cuando: `tsc --noEmit` acepta los imports de `node:path` de `tests/`; `npm test` corre
  `tsc --noEmit` y `astro check` antes de Vitest y termina en 0; el meta-test, con un error
  inyectado en una copia temporal del `.tsx` y otro en la del `.astro`, ve distinto de 0 en cada
  comando.
  Inyección: el meta-test inyecta código válido (`= 1` en lugar de `= 'x'`) en la copia del `.tsx`
  y del `.astro` → los 2 tests de error en rojo (`expected +0 not to be +0`), exit 1; restaurado
  con el mismo sha256. En la validación: un error en `src/sample.tsx` del repo daba `tsc` exit 0
  por el `exclude` de `tsconfig.json`; corregido, `npm test` termina en 2 en el paso `tsc`, antes
  de Vitest; restaurado con el mismo sha256.

- [x] **T-5 — Crear el consumidor externo e instalarle el tarball**
  Cubre: RF-4
  Archivos: `tests/lib/consumer.ts`, `tests/consumer.test.ts`
  Hecho cuando: por framework, el consumidor está en `os.tmpdir()/cm-<runId>/`, `isOutside` da
  `true` y el paquete de prueba resuelve en su propio `node_modules`; con un consumidor dentro del
  repo, el test se pone en rojo. Un consumidor viejo en la misma ruta se borra y se recrea.
  Inyección: la base de los consumidores dentro del repo → los 4 tests de ruta y resolución en
  rojo (`expected false to be true`), exit 1; restaurado con el mismo sha256 y `git status` igual.

- [x] **T-6 — Hacer fallar el build ante un módulo no declarado**
  Cubre: RF-5
  Archivos: `tests/fixtures/undeclared-module/`, `tests/consumer.test.ts`
  Hecho cuando: el build del consumidor falla con `museum-undeclared` instalado en el
  `node_modules` de la raíz del repo, y falla con él en el `node_modules` del padre del
  consumidor; con la dependencia declarada, pasa. El módulo copiado a la raíz se borra al terminar.
  Inyección: sin la guarda (`guardResolution: false`) → los 2 tests de RF-5 en rojo, porque el
  build con el módulo en el padre pasa, exit 1; la guarda activada por defecto → los 2 tests de
  configuración idéntica en rojo, exit 1; ambos restaurados con el mismo sha256.

- [x] **T-6b — Reutilizar los consumidores en una ejecución**
  Cubre: ninguno nuevo; tarea de rendimiento sobre RF-4 y RF-5 (plan, bloques 4 y 6)
  Archivos: `tests/global-setup.ts`, `vitest.config.ts`, `tests/consumer.test.ts`,
  `tests/lib/consumer.ts`
  Hecho cuando:
  - Cada consumidor se crea una sola vez por `runId`.
  - Hay uno sin tocar por framework para los tests que lo exigen, y otro con la guarda de
    resolución por framework para RF-5, nunca mezclados.
  - Ningún test modifica un consumidor sin tocar, y cada consumidor con guarda lo modifica solo su
    propio test de RF-5.
  - Los 27 tests siguen en verde.
  - Las inyecciones de RF-4 (consumidor dentro del repo) y de RF-5 (sin la guarda) siguen
    poniéndose en rojo.
  - El tiempo total de `npm test` se mide antes y después, y se reporta.

  Va antes de la T-7 porque cambia dónde se crean los consumidores: la instantánea de RF-6 tiene
  que tomarse antes de que el `globalSetup` los cree.
  Inyección en `tests/global-setup.ts`: consumidores dentro del repo → los 4 tests de RF-4 en
  rojo, exit 1; sin la guarda → los 2 tests de RF-5 en rojo, exit 1; restaurado con el mismo
  sha256 y `git status` igual.

- [x] **T-7 — Comprobar que la verificación deja el árbol igual**
  Cubre: RF-6
  Archivos: `tests/lib/snapshot.ts`, `tests/snapshot.test.ts`, `tests/consumer.test.ts`
  Hecho cuando: `diffSnapshots` tiene sus tests; la suite de consumidor falla en `afterAll` si
  cambia `git status` o el hash de un archivo de `tests/fixtures/`, comprobado escribiendo un
  archivo ahí durante la suite.
  Inyección, como `it` temporales: escribir `tests/fixtures/injected-rf6.txt` → `afterAll` en rojo
  con 2 diferencias (`git status` y `added:`), exit 1; dejar `node_modules/museum-undeclared` →
  rojo solo por hash (`added: node_modules/museum-undeclared/index.js` y `package.json`), exit 1;
  restaurado con el mismo sha256.

- [x] **T-8 — Enmendar `AGENTS.md` con la política nueva**
  Cubre: RF-7
  Archivos: `AGENTS.md`
  Hecho cuando: «Verificar» nombra `npm test` en lugar de «Todavía no hay runner de tests», y
  «Comandos» pone `tsc --noEmit` y `astro check` como parte de la política en lugar de «No
  ejecutes el comprobador de tipos». Lo aprueba el dueño y va en su propio commit `docs:`.

  Va la última porque la política solo puede nombrar comandos que ya funcionan.
  Inyección: la búsqueda del plan (las dos frases antiguas fuera, los tres comandos nombrados) dio
  rojo antes de la enmienda (5 fallos) y verde después; volver a añadir «No ejecutes el
  comprobador de tipos» → rojo, exit 1; `AGENTS.md` restaurado con el mismo sha256.

- [x] **T-9 — Poner un candado a `npm test` para que dos ejecuciones no se pisen**
  Cubre: RF-6 (plan, bloques 2, 4 y 6)
  Archivos: `tests/lib/lock.ts`, `tests/lock.test.ts`, `tests/global-setup.ts`
  Hecho cuando:
  - `isStale` tiene sus tests como dato: dueño vivo y reciente, pid muerto, y más de 15 min.
  - Un test lanza dos procesos que se disputan un candado en un directorio temporal: el segundo
    imprime «waiting for another npm test» y espera; con un límite de espera corto, falla con
    «another npm test (pid …) has held … since …».
  - Un candado con un pid muerto se retira y la ejecución sigue, así que un huérfano no bloquea
    para siempre.
  - El `globalSetup` toma el candado en `node_modules/.museum-test-lock` antes de la instantánea de
    RF-6 y lo suelta en el teardown, solo si es suyo.
  - `npm test` sigue en 0, y quitar la retirada de huérfanos pone en rojo el test del huérfano.

  Va tras la T-8 porque nació de un choque real entre dos sesiones, con el resto de la 001 ya hecho.
  Inyección: sin la retirada de huérfanos → el test del huérfano en rojo al llegar al límite
  (`another npm test (pid …) has held … since …`), exit 1, restaurado con el mismo sha256; dos
  `npm test` a la vez sin candado → el segundo exit 1 («museum-undeclared exists before the test»
  y RF-6 `added: node_modules/museum-undeclared/…`), y con candado los dos exit 0; restaurado e
  idéntico según `cmp`.

