# Tareas 006 — publicacion

**Approved:** 2026-10-22 · el dueño, con el ajuste de T-1 (sync-styles.mjs no se renombra)

Cómo se trabaja en paralelo (plan, bloque 6): cada tarea de una ola va en su propio worktree, con
su rama `spec/006-publicacion-T-n` y su `node_modules`. Las T-7 y T-8 son de texto y no necesitan
`npm ci`. Al cerrar la ola, la sesión de git mergea las ramas en `spec/006-publicacion`. Se borra
`node_modules` antes de quitar cada worktree. Solo la tarea indicada toca cada archivo compartido:
- `tests/packages.test.ts`: la T-1 y después la T-4;
- `packages/*/package.json`: la T-1;
- el `package.json` de la raíz y `package-lock.json`: la T-3.

- [x] **T-1 — Licencia MIT y manifiestos listos para publicar**
  Cubre: RF-1
  Archivos: `LICENSE`, `scripts/sync-styles.mjs` (mismo nombre; añade la copia de `LICENSE`),
  `packages/react/package.json`, `packages/astro/package.json` (`license`, `repository` con
  `directory`, `publishConfig.access`), `.gitignore` (`packages/*/LICENSE`),
  `tests/packages.test.ts`
  Hecho cuando: el `LICENSE` de la raíz es MIT a nombre de `XDextX`; el `prepack` copia `LICENSE` y
  `styles.css` a cada paquete; el test de RF-1 lee los dos manifiestos y el `LICENSE`; los tests de
  la 002 y la 003 que leen el tarball siguen en verde.
  Inyección: una copia en disco de un manifiesto con `directory: "packages/otro"` pone en rojo RF-1.
  Visto en rojo: con `"directory": "packages/otro"` en el manifiesto de Astro, el test de RF-1 falla (`expected [ Array(1) ] to deeply equal []`); restaurado por sha256 (OK).

- [x] **T-2 — README bilingüe de cada paquete**
  Cubre: RF-9
  Archivos: `packages/react/README.md`, `packages/astro/README.md`, `tests/readme.test.ts`
  Hecho cuando: cada README tiene `## Español` y `## English`, y cada sección lleva el
  `npm install @component-museum/<p>`, el import de su hoja, un Button y el enlace a
  `https://github.com/XDextX/component-museum`; `npm pack --dry-run` lista `README.md`.
  Inyección: una copia en disco del README de Astro sin el import de la hoja en `## English` pone en
  rojo RF-9.
  Visto en rojo: el README de Astro con las líneas de `styles.css` quitadas de `## English` (copia
  guardada y restaurada por sha256 `feef7f61…8c2d`) dio `## English: no stylesheet import`, 1 test
  en rojo. Restaurado: 4 de 4 en verde. `npm pack --dry-run` lista `README.md` en los dos paquetes.

- [x] **T-3 — Instalar `@s-ui/mono` y probar el cálculo de versiones**
  Cubre: RF-3, RF-4, RF-5
  Archivos: `package.json` (raíz: `@s-ui/mono` `^2.46.0`, `config.sui-mono.access: "public"`),
  `package-lock.json`, `tests/lib/release-repo.ts`, `tests/release.test.ts`
  Hecho cuando:
  - Lo primero: en Windows con npm 11, `check()` lista `packages/react` y `packages/astro`, sin
    `gallery`.
  - En el repo git temporal, `fix`, `feat`, `perf` y `refactor` con scope dan `increment` 2;
    `BREAKING CHANGE` en el cuerpo, 3; `docs`, 0; `feat:` sin scope, 0 en los dos paquetes.
  - Nunca se llama a `release`, y el repo temporal se borra al terminar.
  Inyección: quitar `packages/*` de las workspaces en la copia del manifiesto de la raíz del repo
  temporal deja a `check()` sin paquetes, y los casos que esperan 2 o 3 se ponen en rojo.
  Hecho (2026-10-22): `@s-ui/mono` 2.46.0 (la última en npm). Comprobado primero: `check()` con npm 11.19
  en Windows lista `packages/react` y `packages/astro`, sin `gallery` (es `private`). Inyección vista
  en rojo: aplicada a todo repo temporal, 8 de 10 tests en rojo (la lista de paquetes, los cuatro
  tipos, `BREAKING CHANGE`, `docs` y `feat` sin scope, con `check()` sin paquetes); revertida,
  10 de 10 en verde. Un test de la suite deja la inyección fija (sin `packages/*`, `check()` da `{}`).

- [x] **T-4 — Nada de más en cada tarball**
  Cubre: RF-2
  Archivos: `tests/packages.test.ts` (`tarballProblems` y la lista permitida, sobre `packedFiles`)
  Hecho cuando: la lista de `npm pack --dry-run` de cada paquete solo tiene lo permitido (plan,
  bloque 3) y tiene todo lo obligatorio, `LICENSE` y `README.md` incluidos.
  Inyección: un `tsconfig.json` añadido a `files` en una copia del manifiesto de Astro pone en rojo
  RF-2 por archivo de más; quitar `LICENSE` del `prepack`, por archivo de menos.
  Hecho (2026-10-22): `tarballProblems` y la lista permitida de cada paquete en `tests/packages.test.ts`,
  con un test unitario y uno por paquete sobre `packedFiles`. Visto en rojo (manifiesto de Astro
  restaurado por sha256 `1341a1f8…0d9b`): con `tsconfig.json` en `files`,
  `expected [ 'tsconfig.json is not allowed' ] to deeply equal []`; con `packages/astro/LICENSE`
  borrado y el `prepack` en `node -e 0`, `[ 'LICENSE is missing' ]`. Restaurado: 21 de 21 en verde
  (1 omitido).
  Arreglo aparte (bloque propio): `SKIP` de `tests/lib/contract.ts` no excluía `.claude`, y los
  worktrees de agentes en `.claude/worktrees/` duplicaban los contratos y ponían en rojo
  `contract.test.ts` RF-6 en el checkout principal. Se añade `.claude` a `SKIP`. Inyección: copia de
  `button.contract.json` en `.claude/x/` del worktree: sin el arreglo, RF-6 en rojo
  (`expected [ Array(1) ] to deeply equal []`, 1 de 15); con él, 15 de 15 en verde; copia borrada.
  Corrección tras validación (ronda 1): el `prepack` de React solo copiaba la hoja y `LICENSE`, y
  `dist/` está en `.gitignore`: un pack desde un clon recién hecho salía sin `dist/`, y en este
  checkout llevaba el `dist/` que hubiera, viejo o no. `scripts/build-dist.mjs` compila `src/` con
  `tsconfig.build.json` en el `prepack`, en una carpeta temporal, y pasa cada archivo a `dist/` por
  `rename`; borra de `dist/` lo que ya no tiene fuente. `build:packages` de la raíz queda en el
  `prepack` de los dos paquetes. El test nuevo de `tests/packages.test.ts` copia lo que tendría un
  clon (`git ls-files --cached --others --exclude-standard`), sin `dist/`, y exige en el tarball
  el `import` y los `types` de `exports`.
  Inyección vista: test primero, con el `prepack` de entonces (sin compilar) → rojo, el tarball solo
  con `LICENSE`, `README.md`, `package.json` y `styles.css`, «./dist/index.js is not in the packed
  files»; con `build-dist.mjs`, verde. Comprobado además a mano: un `dist/stale.js` desaparece en el
  `prepack`, y 4 `npm pack --dry-run` a la vez desde `dist/` vacío listan los 4 archivos de `dist/`
  cada uno, sin carpetas `.dist-build-*` sobrantes.

  Va tras la T-1 y la T-2 porque necesita `LICENSE` y `README.md` en el tarball.

- [x] **T-5 — Guarda contra publicar o leer tokens desde el repo**
  Cubre: RF-6
  Archivos: `tests/no-publish.test.ts`
  Hecho cuando: el test recorre los `package.json` versionados, `scripts/` y `tests/`, y falla ante
  un término de `forbiddenTerms()` (armados en ejecución) o ante un `.npmrc` versionado; en el repo
  real, pasa.
  Inyección: un script `"release": "sui-mono release"` en una copia del manifiesto de la raíz, o un
  `.npmrc` en una copia del árbol, pone el test en rojo.
  Visto en rojo (2026-10-22): con la guarda debilitada (sin buscar términos ni `.npmrc`), los dos casos
  de inyección sobre copias en un directorio temporal fallan (2 de 4 en rojo); con la guarda
  restaurada, pasan los 4. En el repo real y sobre un test que arma sus cadenas en ejecución, pasa.
  Nota: `npx vitest run tests/no-publish.test.ts` con la config del repo no llegó a ejecutar el test:
  el `globalSetup` falló al construir la galería (`storybook build`), ajeno a esta tarea. Se corrió
  con una config mínima sin `globalSetup`.

- [x] **T-6 — Procedimiento de publicación del dueño**
  Cubre: RF-7
  Archivos: `docs/publicacion.md`, `tests/publish-doc.test.ts`
  Hecho cuando: el documento lista, en orden:
  1. `npm login`;
  2. la organización;
  3. `npm publish` de `0.1.0` en cada paquete;
  4. los commits y tags de release de cada paquete;
  5. `sui-mono check` y `sui-mono release` para las siguientes.

  Además dice que ningún agente ejecuta esos pasos ni toca tokens. El test, con `stepPositions`,
  exige todos los pasos y en orden. Arma en ejecución las cadenas que la T-5 prohíbe (`npm publish`,
  `sui-mono release`), para que la guarda no lo encuentre.
  Inyección: una copia del documento con `npm publish` antes de `npm login` pone en rojo el orden.
  Visto en rojo (2026-10-22): copia del documento con la línea de publicar antepuesta, vía
  `PUBLISH_DOC`; falló «names them in order»; con el documento real, 4 de 4 en verde.

- [x] **T-7 — Texto de la enmienda de `AGENTS.md`**
  Cubre: RF-8
  Archivos: `AGENTS.md`
  Hecho cuando: «Git» hace obligatorio el scope `packages/react` o `packages/astro` en todo commit
  que toque un paquete, con un commit por paquete. «Idioma» añade solo «salvo lo que la regla 10
  pone en dos idiomas». El texto queda listo para su propio commit `docs:`, que aprueba el dueño.
  Inyección: no aplica.

- [x] **T-8 — Texto de la enmienda de la regla 10**
  Cubre: RF-10
  Archivos: `docs/constitution.md`
  Hecho cuando: la regla 10 tiene el texto aprobado en `notes.md`, con la entrada `Changed:`
  propuesta allí; queda lista para su propio commit `docs:`, que aprueba el dueño.
  Inyección: no aplica.

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 ∥ T-3 ∥ T-5 ∥ T-6 ∥ T-7 ∥ T-8 | — (no comparten archivos) |
| 2 | T-4 | Necesita `LICENSE` en el tarball (T-1) y `README.md` (T-2), y comparte `packages.test.ts` con la T-1. |

Al cerrar la ola 2, `npm test` en `spec/006-publicacion` con todo mergeado, porque la guarda de la
T-5 tiene que pasar también sobre lo que añadieron las demás.
