# Tareas 001 — base-tests

**Approved:** 2026-10-19 · el dueño aprobó el plan y las 8 tareas, con Node 24 LTS y `package-lock.json` versionado

Requisito previo: Node 24 LTS instalado por el dueño (plan, «Decisiones del dueño»).

- [x] **T-1 — Crear la base de la raíz y el primer test**
  Cubre: RF-1
  Archivos: `.gitignore`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`,
  `tests/lib/paths.ts`, `tests/paths.test.ts`
  Hecho cuando: `node -v` da 24.x; `.gitignore` ya no ignora `package-lock.json` y este existe;
  `npm test` termina en 0 con los tests de `isOutside` (incluido el caso de otra
  unidad en Windows) y de `consumerDir`; con un `expect(1).toBe(2)` temporal, termina en distinto
  de 0.

- [x] **T-2 — Probar que un test rojo para la suite y se nombra**
  Cubre: RF-2
  Archivos: `tests/lib/run.ts`, `tests/fixtures/failing-suite/`, `tests/runner.test.ts`
  Hecho cuando: el meta-test lanza Vitest sobre `failing-suite`, ve código distinto de 0 y el
  nombre del test y de su archivo en la salida; `npm test` sigue en 0.

- [x] **T-3 — Leer estilos en Edge con esquema emulado y sin JavaScript**
  Cubre: RF-3
  Archivos: `tests/lib/browser.ts`, `tests/fixtures/style-page.html`, `tests/browser.test.ts`
  Hecho cuando: el test lee el color oscuro con `colorScheme: 'dark'`, el claro con `'light'`, y
  sin JavaScript el color original que el script habría cambiado; invertir el esquema esperado lo
  pone en rojo. Antes de nada, comprobar si `evaluate` responde con JavaScript desactivado; si no,
  leer por CDP (plan, bloque 6).

- [x] **T-4 — Añadir el paquete de prueba y la comprobación de tipos**
  Cubre: RF-8
  Archivos: `tests/fixtures/test-package/`, `package.json` (script `test` y `@types/node`
  `^24.19.2`), `package-lock.json`, `tsconfig.json` (vuelve `types: ["node"]`),
  `tests/typecheck.test.ts`
  Hecho cuando: `tsc --noEmit` acepta los imports de `node:path` de `tests/`; `npm test` corre
  `tsc --noEmit` y `astro check` antes de Vitest y termina en 0; el meta-test, con un error
  inyectado en una copia temporal del `.tsx` y otro en la del `.astro`, ve distinto de 0 en cada
  comando.

- [x] **T-5 — Crear el consumidor externo e instalarle el tarball**
  Cubre: RF-4
  Archivos: `tests/lib/consumer.ts`, `tests/consumer.test.ts`
  Hecho cuando: por framework, el consumidor está en `os.tmpdir()/cm-<runId>/`, `isOutside` da
  `true` y el paquete de prueba resuelve en su propio `node_modules`; con un consumidor dentro del
  repo, el test se pone en rojo. Un consumidor viejo en la misma ruta se borra y se recrea.

- [ ] **T-6 — Hacer fallar el build ante un módulo no declarado**
  Cubre: RF-5
  Archivos: `tests/fixtures/undeclared-module/`, `tests/consumer.test.ts`
  Hecho cuando: el build del consumidor falla con `museum-undeclared` instalado en el
  `node_modules` de la raíz del repo, y falla con él en el `node_modules` del padre del
  consumidor; con la dependencia declarada, pasa. El módulo copiado a la raíz se borra al terminar.

- [ ] **T-7 — Comprobar que la verificación deja el árbol igual**
  Cubre: RF-6
  Archivos: `tests/lib/snapshot.ts`, `tests/snapshot.test.ts`, `tests/consumer.test.ts`
  Hecho cuando: `diffSnapshots` tiene sus tests; la suite de consumidor falla en `afterAll` si
  cambia `git status` o el hash de un archivo de `tests/fixtures/`, comprobado escribiendo un
  archivo ahí durante la suite.

- [ ] **T-8 — Enmendar `AGENTS.md` con la política nueva**
  Cubre: RF-7
  Archivos: `AGENTS.md`
  Hecho cuando: «Verificar» nombra `npm test` en lugar de «Todavía no hay runner de tests», y
  «Comandos» pone `tsc --noEmit` y `astro check` como parte de la política en lugar de «No
  ejecutes el comprobador de tipos». Lo aprueba el dueño y va en su propio commit `docs:`.

  Va la última porque la política solo puede nombrar comandos que ya funcionan.
