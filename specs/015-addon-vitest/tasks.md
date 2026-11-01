# Tareas 015 — addon-vitest

Cada tarea va en su propio worktree, en `.claude/worktrees/`, con su `node_modules`, y empieza así:
1. `git branch -m spec/015-addon-vitest-T-n`;
2. `git reset --hard <PLAN>`, o el commit de la ola anterior que dé el coordinator;
3. `npm ci`, `npm run build:packages` y `npm run gallery:astro`.

Antes de reportar pasa el build de `packages/react`, `npm run gallery:astro`, los dos `tsc` y
`npm test`, y da el número de tests antes y después. Nunca más de dos `npm test` a la vez. Las
notas, en UTF-8 y CRLF.

Las marcas C-n citan un cambio de la spec (`notes.md`).

Archivos compartidos, siempre en olas distintas:
- `gallery/vitest.config.ts`: T-2 y T-3;
- `specs/015-addon-vitest/notes.md`: T-1 y T-4.

- [x] **T-1 — Medir la base de hoy**
  Cubre: NFR de duración, RF-5 (la lista de partida)
  Archivos: `specs/015-addon-vitest/notes.md` (sección «Base»)
  Hecho cuando:
  - Sin otra carga, con el método de la T-8 de la 017, se anotan el calentamiento, 3 pasadas de
    `npm test` sin cambios, su mediana y su % de 174.3 s.
  - Se anota la tabla de fases y los 6 archivos más lentos.
  - La salida de `vitest list --json` queda fuera del repo, y su número de tests, en las notas.
  - Si la mediana ya pasa de 130.7 s (75 %), se dice: la entrega 4 añadió dos componentes después de
    la última medida de la 017.
  Inyección: no aplica (es una medida); las 3 cifras sueltas van junto a la mediana.
  Nota: hecha, sin código cambiado. Serie 1 (con otra carga: 227.6 s de calentamiento y pasadas de 277.5, 209.0 y 156.5 s, con `Hook timed out`) descartada. Serie 2 con la máquina libre: 138.1, 139.0 y 139.2 s; mediana **139.0 s, 79.7 %** de 174.3 s. **Pasa de 130.7 s** (75 %) por 8.3 s: la entrega 4 añadió componentes (1287 tests hoy, 912 en la 017). Fases y 6 archivos más lentos en `notes.md`, «Base». `vitest list --json` falla (`No test suite found`); número de tests de `vitest run` en JSON: 1287.

- [ ] **T-2 — El addon y el proyecto `stories`, en Edge y dentro de `npm test`**
  Cubre: RF-1, RF-2, RF-3
  Archivos: `gallery/package.json`, `package-lock.json`, `gallery/.storybook/main.ts`,
  `gallery/vitest.config.ts`, `gallery/.storybook/vitest.setup.ts`, `vitest.config.ts`,
  `tests/addon-vitest.test.ts`
  Hecho cuando:
  - Lo primero: `channel: 'msedge'` lanza Edge con el proveedor de Vitest. Si no, para y vuelve al
    plan.
  - `npm test` ejecuta 12 tests de historia, uno por historia, y termina en 0.
  - Una historia que lanza un error pone `npm test` en distinto de 0 y su nombre sale en la salida.
  - El test falla si `@storybook/addon-vitest` no es la versión instalada de `storybook`,
    `@vitest/browser-playwright` no es la de `vitest`, o `playwright` no es la de `playwright-core`.
  - Con `PLAYWRIGHT_BROWSERS_PATH` en una carpeta vacía, los tests de historia pasan.
  - El `package-lock.json` no añade ningún navegador ni script de instalación nuevo; se anota
    cuántos paquetes añade.
  - Se dice si el proyecto carga `preview-head.html` (lo necesita la 016).
  - `gallery-toolbar.test.ts` y los demás tests de la galería siguen en verde, con el addon en
    `main.ts`.
  Inyección: `throw` en una historia pone `npm test` en rojo con su nombre; quitar `channel` de la
  configuración pone en rojo el dato de RF-3; otra versión de `playwright` pone en rojo RF-1.

- [ ] **T-3 — Los tests de historia respetan el lock (C-1)**
  Cubre: RF-6
  Archivos: `tests/lib/lock.ts`, `tests/lock.test.ts`, `tests/stories-setup.ts`,
  `gallery/vitest.config.ts`
  Hecho cuando:
  - Lo primero: comprobar que el Vitest del panel tiene `watch` verdadero. Si no, para y vuelve al
    plan.
  - `npm test` no se queda esperando: `e2e` y `stories` comparten el lock del mismo proceso, y lo
    libera solo su primer dueño.
  - Con el lock de otro proceso vivo, `vitest run --project stories` no arranca hasta soltarlo.
  - Con `npm run gallery` abierto, `npm test` no espera al panel.
  - Los casos que ya tiene `lock.test.ts` siguen iguales.
  Inyección: quitar el caso del mismo dueño deja `npm test` esperando y agota el tiempo; soltar el
  lock desde el segundo dueño pone en rojo el caso de `lock.test.ts`.

- [ ] **T-4 — El panel, la lista de tests y la medida final (C-2, C-3, C-4)**
  Cubre: RF-4, RF-5, NFR de duración
  Archivos: `specs/015-addon-vitest/notes.md` (sección «Después»)
  Hecho cuando:
  - Desde `npm run gallery`, en Edge, «Run tests» deja aprobadas las 12 historias.
  - Cada nombre de la lista de la T-1 sigue en `vitest list --json`.
  - Con el mismo método de la T-1, se anotan la mediana, lo que suma respecto de la base y si cumple
    ≤ 10 s (C-4) y el 75 % de la 017. Si no cumple alguno, se dice cuánto falta y dónde.
  - Sin caché de Vite se anota también el primer arranque, aparte.
  Inyección: `throw` en una historia hace que el panel la marque en rojo; un test borrado sale en la
  comparación de la lista.

## Grafo de olas

| Ola | Tareas | Por qué esperan |
|---|---|---|
| 1 | T-1 | — (la base, sin otra carga) |
| 2 | T-2 | La base. |
| 3 | T-3 | `gallery/vitest.config.ts` de la T-2. |
| 4 | T-4 | Todo lo anterior, sin otra carga. |

Casi no hay paralelismo: cada tarea necesita la anterior, y dos de ellas miden sin otra carga.
