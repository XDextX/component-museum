# Plan 015 — addon-vitest

Parte de `spec.md` (aprobada por el dueño, 6 RF) y de `notes.md`, cuya sección «Revisión del
2026-11-01» recoge cuatro cambios a la spec, ya aplicados (C-1 a C-4).

Comprobado en `spec/015-addon-vitest` (333dd15, `main` con la entrega 4):
- **Hay 6 contratos y 12 historias:** una React y una Astro por componente (Button, Input, Textarea,
  Checkbox, RadioGroup y Select).
- **`vitest.config.ts`** tiene dos proyectos, calculados por `splitTests`: `unit`, sin
  `globalSetup`, y `e2e`, con `tests/global-setup.ts`, que toma el lock.
- **`scripts/test.mjs`** ejecuta `build react`, `gallery:astro`, el bloque `tipos` y `vitest run`, y
  pinta la tabla de fases.
- **`storybook` no está en la raíz:** vive en `gallery/node_modules/`, y lo mismo pasaría con el
  addon. Un `vitest.config.ts` de la raíz no podría importar su plugin. Por eso el proyecto nuevo
  tiene su configuración en `gallery/`.
- **`vitest` 5.0.5 y `playwright-core` 1.64.1** están instalados. `storybook` instalado es 10.6.3,
  aunque el registro ya da 10.6.5: el addon va con la versión instalada, y subir Storybook no entra.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | Las dependencias y `tests/addon-vitest.test.ts`, que compara las versiones instaladas (T-2). |
| RF-2 | El proyecto `stories`, dentro del `vitest run` de `npm test` (T-2). |
| RF-3 | `launchOptions: { channel: 'msedge' }`; el dato en el test, y una ejecución con `PLAYWRIGHT_BROWSERS_PATH` vacío (T-2). |
| RF-4 | El addon registrado en `main.ts` (T-2); el panel, abierto en la validación (T-4, según C-2). |
| RF-5 | La lista de tests antes (T-1) y después (T-4), según C-3. |
| RF-6 | Un `globalSetup` del proyecto `stories` que toma el lock, salvo en modo vigilancia (T-3, según C-1). |
| NFR duración | Base (T-1) y medida final (T-4), según C-4. |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad | Tarea |
|---|---|---|---|
| `specs/015-addon-vitest/notes.md` | mod. | La base, la lista de tests y la medida final. | T-1, T-4 |
| `gallery/package.json`, `package-lock.json` | mod. | Las tres dependencias de desarrollo. | T-2 |
| `gallery/.storybook/main.ts` | mod. | Registra el addon. | T-2 |
| `gallery/vitest.config.ts` | sí | El proyecto `stories`: plugin, navegador y Edge. | T-2, T-3 |
| `gallery/.storybook/vitest.setup.ts` | sí | Aplica las anotaciones de `preview.ts` a los tests de historia. | T-2 |
| `vitest.config.ts` | mod. | Añade `gallery/vitest.config.ts` a `projects`. | T-2 |
| `tests/addon-vitest.test.ts` | sí | RF-1 y el dato de RF-3. | T-2 |
| `tests/lib/lock.ts`, `tests/lock.test.ts` | mod. | Un mismo proceso puede volver a pedir el lock que ya tiene. | T-3 |
| `tests/stories-setup.ts` | sí | Toma el lock para el proyecto `stories`, salvo en modo vigilancia. | T-3 |
| `tests/addon-vitest.test.ts` | mod. | Guarda las tres conexiones de RF-2 y RF-6, leídas como texto. | T-5 |

**Archivos compartidos:** `gallery/vitest.config.ts` lo tocan la T-2 y la T-3, en olas distintas, y
`notes.md`, la T-1, la T-4 y la T-5. **`tests/global-setup.ts` casi no se toca:** la T-3 le añadió
una línea (`shareWithProcess: true`) y `acquireLock` sigue igual para él por defecto.

## 3. Lógica pura

```ts
// tests/lib/lock.ts: acquireLock already exists; it gains the case of an owner with this same pid.
acquireLock(lockDir, { runId }): Promise<() => void>
  // Owner is this process: returns a release that does nothing, and the first holder releases it.
```

## 4. Algoritmo

**El proyecto `stories` (T-2):**
```ts
// gallery/vitest.config.ts
storybookTest({ configDir: join(import.meta.dirname, '.storybook') })
browser: { enabled: true, headless: true, provider: playwright({ launchOptions: { channel: 'msedge' } }),
           instances: [{ browser: 'chromium' }] }
setupFiles: ['.storybook/vitest.setup.ts']
```
- **Lo primero de la T-2:** comprobar que `channel: 'msedge'` lanza el Edge del sistema con el
  proveedor de Vitest. Si no, para y vuelve al plan.
- **La instalación** se hace con `npm install -w @component-museum/gallery`, sin `storybook add`: el
  asistente ofrece descargar navegadores. Por el mismo motivo, nada ejecuta `playwright install`.
- **El JSON de Astro** ya está cuando empieza Vitest, porque lo escribe `gallery:astro`.
- **`preview-head.html`:** la T-2 comprueba si el proyecto lo carga. Si no, las historias se pintan
  sin ese CSS y sigue valiendo para el humo; la 016 lo necesita saber para medir el contraste.

**El lock (T-3, según C-1):**
- `npm test` ejecuta los proyectos en el mismo proceso, así que `e2e` y `stories` piden el lock con
  el mismo `pid`. Sin el cambio de `acquireLock`, el segundo esperaría al primero para siempre.
- Solo se libera con la liberación del primero.
- `tests/stories-setup.ts` no pide el lock si `project.vitest.config.watch` es verdadero: el panel
  mantiene vivo un Vitest mientras dure `npm run gallery`, y lo retendría todo ese tiempo. Lo
  primero de la T-3 es comprobar que el panel se ve así.

**Medidas (T-1, T-4):** el método de la T-8 de la 017: sin otra carga, un calentamiento aparte, 3
pasadas y la mediana. La lista de tests sale de `vitest list --json`.

## 5. Interfaz

- **`npm test`:** la salida de hoy, con los tests de historia como un proyecto más (`stories`). Una
  historia rota da distinto de 0 y su nombre.
- **`npm run gallery`:** el widget «Run tests» al pie de la barra lateral, y el estado por historia.
- **Galería construida:** sin cambios en las páginas. El widget no ejecuta nada fuera del servidor
  de desarrollo.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **Configuración del proyecto en `gallery/`.** | En el `vitest.config.ts` de la raíz: desde ahí no se resuelve `storybook`, que está en `gallery/node_modules/`. |
| **Instalar con `npm install`, no con `storybook add`.** | El asistente: reescribe la configuración y ofrece descargar navegadores (RF-3). |
| **Un proyecto dentro de `vitest run`.** | Un paso aparte en `scripts/test.mjs`: iría detrás del resto y sumaría todo su tiempo; dentro corre a la vez que `e2e`. |
| **`acquireLock` admite a su mismo dueño.** | Tomar el lock solo en `e2e`: un `vitest run --project stories` suelto correría sin lock (RF-6). |
| **El panel no toma el lock (C-1).** | Tomarlo: `npm test` esperaría mientras esté abierta la galería, y fallaría a los 10 minutos. |

**Dependencias (regla 9).** Motivo en la spec: panel y humo por historia. Van en `gallery/`, de
desarrollo, y no llegan a ningún paquete.

| Paquete | Versión | Lo que trae | Por qué es necesario |
|---|---|---|---|
| `@storybook/addon-vitest` | 10.6.3 | `@storybook/icons`, `@storybook/global` | Es lo que pide el dueño. |
| `@vitest/browser-playwright` | 5.0.5 | `@vitest/browser`, `@vitest/mocker` y lo suyo | Par del addon: es el modo navegador de Vitest. |
| `playwright` | 1.64.1 | `playwright-core` 1.64.1 | Par del anterior. No descarga navegadores (sin script de instalación). |

**Commits:** nada toca `packages/` ni `styles/`, así que van sin scope, citando la spec.

## 7. Estrategia de tests

- **Como dato:** versiones y `channel` (T-2), y el lock con el mismo dueño (T-3).
- **De ejecución real:** una historia que lanza un error (T-2) y `PLAYWRIGHT_BROWSERS_PATH` vacío
  (T-2).
- **Inyección por tarea:** su línea «Inyección:», en la rama del worktree, y el commit dice cuál se
  vio en rojo (regla 8).
- **Antes de reportar:** el build de `packages/react`, `npm run gallery:astro`, los dos `tsc` y
  `npm test`.
- **Carga:** nunca más de dos `npm test` a la vez. La T-1 y la T-4 miden sin otra carga.
- **Tiempo esperado, sin medir:** el proyecto corre a la vez que `e2e`, que marca el final. El
  primer arranque de Vite es unos 15 a 25 s una sola vez. Espero **de 3 a 10 s** más en cada
  `npm test`, por el reparto de núcleos. Lo decide la T-4.
- **Proporción:** 4 tareas para 6 RF.
