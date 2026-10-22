# Plan 006 — publicacion

**Approved:** 2026-10-22 · el dueño, con el ajuste de T-1 (sync-styles.mjs no se renombra)

Parte de `spec.md` (aprobada, 10 RF) y de `notes.md`. Se apoya en lo que dejaron las specs
anteriores:
- `npm test` con candado;
- `tests/packages.test.ts`, que con `packedFiles` ya corre `npm pack --dry-run` y comprueba la
  entrada, la hoja y los tipos;
- el `prepack` de cada paquete, que copia `styles/museum.css` con `scripts/sync-styles.mjs`;
- las workspaces `packages/*` y `gallery`.

Comprobado el 2026-10-22:
- `@s-ui/mono` 2.46.0 sigue siendo la última versión (2026-05-12);
- esta máquina tiene Node 24.20.0 y npm 11.19.0.

## Decisiones del dueño (spec y `notes.md`)

- Licencia MIT, a nombre de `XDextX`.
- `0.1.0` se publica a mano; desde ahí, con `sui-mono release`.
- El scope de commit es obligatorio; `AGENTS.md` se enmienda en su propio commit `docs:`.
- Cada paquete lleva un README en español y en inglés; la regla 10 se enmienda con el texto
  aprobado en `notes.md`.
- RF-8: «Idioma» solo remite a la regla 10.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | Los manifiestos ganan `license`, `repository` y `publishConfig`; un test en `packages.test.ts` los lee, junto con el `LICENSE` de la raíz. |
| RF-2 | `packages.test.ts` amplía `packedFiles` con la lista permitida de cada paquete: falla ante un archivo de más o de menos. |
| RF-3 | `@s-ui/mono` en las dependencias de desarrollo de la raíz y `config.sui-mono.access: "public"`; un test lee el manifiesto. |
| RF-4 | Repo git temporal con los manifiestos; un commit por tipo y `check()` de `@s-ui/mono` en un proceso con ese repo como `cwd`. |
| RF-5 | En el mismo repo temporal, un `feat:` sin scope no da ninguna release. |
| RF-6 | Test que recorre los manifiestos, `scripts/` y `tests/` en busca de comandos de publicación y tokens, y de un `.npmrc` versionado. |
| RF-7 | `docs/publicacion.md` y un test que comprueba el orden de sus pasos. |
| RF-8 | Texto de la enmienda de `AGENTS.md` (scope obligatorio y remisión a la regla 10), listo para su commit `docs:`. |
| RF-9 | Un README bilingüe por paquete y un test que lo lee del tarball. |
| RF-10 | Texto de la enmienda de la regla 10 (`notes.md`), con su línea `Changed:`, listo para su commit `docs:`. |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad |
|---|---|---|
| `LICENSE` | sí | MIT, `Copyright (c) 2026 XDextX`: el único origen de la licencia. |
| `scripts/sync-styles.mjs` | modificado | Conserva su nombre (decisión del dueño). Además de `styles/museum.css` a `styles.css`, copia `LICENSE` a `LICENSE`, en el `prepack` de cada paquete, byte a byte y con el mismo `rename` atómico. |
| `packages/react/package.json`, `packages/astro/package.json` | modificado | `license`, `repository` con su `directory`, `publishConfig.access`; el `prepack` no cambia. |
| `packages/react/README.md`, `packages/astro/README.md` | sí | Español y luego inglés: instalar, importar la hoja una vez, un Button y el enlace al repo. |
| `.gitignore` | modificado | `packages/*/LICENSE`, la copia generada. |
| `package.json` (raíz) | modificado | `@s-ui/mono` `^2.46.0` y `config.sui-mono.access: "public"`. |
| `package-lock.json` | modificado | `@s-ui/mono`. |
| `tests/packages.test.ts` | modificado | RF-1 y RF-2, ampliando `packedFiles` en lugar de crear otro test. |
| `tests/lib/release-repo.ts` | sí | Crea el repo git temporal, hace commits y llama a `check()` en un proceso aparte. |
| `tests/release.test.ts` | sí | RF-3, RF-4 y RF-5. |
| `tests/no-publish.test.ts` | sí | RF-6. |
| `docs/publicacion.md` | sí | El procedimiento del dueño, RF-7. |
| `tests/publish-doc.test.ts` | sí | RF-7. |
| `tests/readme.test.ts` | sí | RF-9. `tarballProblems` va en `packages.test.ts`, `stepPositions` en `publish-doc.test.ts` y `forbiddenTerms` en `no-publish.test.ts`, como `crossProblems` hoy. |
| `AGENTS.md` | modificado | RF-8, en su propio commit `docs:`. |
| `docs/constitution.md` | modificado | RF-10, en su propio commit `docs:`. |

## 3. Lógica pura

```ts
// Las rutas de un tarball que no están permitidas, y las permitidas que faltan. Una entrada
// que acaba en «/» admite todo lo que cuelga de ella.
tarballProblems(files: string[], allowed: string[], required: string[]): string[]
// Los índices de cada paso en el texto, en el orden pedido; -1 si falta uno.
stepPositions(text: string, steps: string[]): number[]
// Los términos prohibidos, armados en ejecución para que el propio test no los contenga.
forbiddenTerms(): string[]
```

**Listas permitidas (RF-2):**
- React: `dist/`, `styles.css`, `package.json`, `LICENSE`, `README.md`.
- Astro: `index.js`, `index.d.ts`, `src/`, `styles.css`, `package.json`, `LICENSE`, `README.md`.
- Obligatorios: `styles.css`, `LICENSE`, `README.md` y la entrada de cada uno.

## 4. Algoritmo

**`LICENSE` y hoja en el `prepack`.** `sync-styles.mjs` copia los dos archivos con la misma
lógica de hoy: si la copia ya es idéntica no la toca, y si no, escribe un temporal y lo renombra.
Como `npm pack` lanza el `prepack` (003, T-1), cada tarball de test y el que publique el dueño
llevan los dos archivos al día. La copia del paquete no se versiona.

**Repo git temporal (RF-4, RF-5).** `release-repo.ts`, en `os.tmpdir()/cm-release-<runId>`:
1. `git init` y una identidad local de commit, solo para ese repo.
2. Copia el `package.json` de la raíz y el de cada paquete, en sus carpetas. No copia nada más:
   `@s-ui/mono` solo necesita las workspaces y los manifiestos.
3. Un commit de partida `release(packages/react): v0.1.0` y otro igual para Astro.
4. Por caso, un commit vacío (`--allow-empty`) con su mensaje:
   - `fix(packages/react): …`, `feat(…)`, `perf(…)` y `refactor(…)`;
   - `feat(packages/react): …` con `BREAKING CHANGE: …` en el cuerpo;
   - `docs(packages/react): …`;
   - `feat: …` sin scope.
5. Lanza `node -e "require('<repo>/node_modules/@s-ui/mono/src/check.js').check().then(s =>
   console.log(JSON.stringify(s)))"` con el repo temporal como `cwd`, y lee el JSON.

Lo que se espera:
- `increment` es 2 (menor) en los cuatro primeros, 3 (mayor) con `BREAKING CHANGE` y 0 con `docs`.
- `feat:` sin scope deja los dos paquetes en 0.
- Nunca se llama a `release`.
- El repo temporal se borra al terminar.

**Guarda de publicación (RF-6).** Recorre los `package.json` versionados (`git ls-files`),
`scripts/` y `tests/`. Falla si alguno contiene un término de `forbiddenTerms()`, o si
`git ls-files` lista un `.npmrc`. Los términos se arman en ejecución
(`['npm', 'publish'].join(' ')`, etc.) para que el test no se encuentre a sí mismo. El test de RF-7
arma igual los pasos que busca, porque si no la guarda lo encontraría.

**Procedimiento (RF-7).** `docs/publicacion.md` lista, en este orden:
1. `npm login`.
2. Crear la organización `component-museum` en npmjs.com.
3. `npm publish` de `0.1.0`, en `packages/react` y en `packages/astro`.
4. Los commits `release(packages/react): v0.1.0` y `release(packages/astro): v0.1.0`, y los tags
   `packages/react-0.1.0` y `packages/astro-0.1.0`; el push lo hace el dueño.
5. Para las siguientes versiones, `sui-mono check` y `sui-mono release`.

El documento dice también que ningún agente ejecuta estos pasos ni toca tokens. El test usa
`stepPositions` y exige que las posiciones estén todas y en orden creciente.

**README (RF-9).** Dos secciones, `## Español` y `## English`. Cada una tiene el `npm install` del
paquete, el import de su hoja, un Button y el enlace al repo. `npm pack --dry-run` da la lista del
tarball pero no su contenido. El test comprueba que `README.md` está en esa lista (RF-2), lee el
archivo de la carpeta del paquete, que npm empaqueta tal cual, y comprueba cada sección por
separado.

**Enmiendas (RF-8, RF-10).**
- **`AGENTS.md`, sección «Git»:** el scope `packages/react` o `packages/astro` es obligatorio en
  todo commit que toque un paquete, con un commit por paquete.
- **`AGENTS.md`, sección «Idioma»:** «salvo lo que la regla 10 pone en dos idiomas».
- **Regla 10 de la constitución:** el texto aprobado de `notes.md`, con su línea `Changed:`.

Cada enmienda va en su propio commit `docs:`.

## 5. Interfaz

- **El dueño** sigue `docs/publicacion.md`; nada más del repo le pide pasos a mano.
- **El consumidor** ve en npm el README en su idioma, con la instalación y el uso.
- **Estados vacíos:**
  - Sin commits con scope, `sui-mono check` responde «Nothing to release»; es lo esperado tras la
    publicación a mano.
  - Sin la organización en npm, `npm publish` falla con 404; el documento lo pone como el paso 2.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **`LICENSE` copiado en el `prepack`, junto a la hoja, por el mismo `sync-styles.mjs`** (decisión del dueño: sin renombrar). | `files: ["../../LICENSE"]`: npm no empaqueta archivos de fuera del paquete. Una copia versionada en cada paquete: tres copias de un mismo texto. Renombrarlo a `sync-package-files.mjs`: `styles/museum.css` y `Memory.md` citan el nombre actual, y sería un cambio sin necesidad. |
| **`check()` de `@s-ui/mono` en un proceso aparte, leyendo JSON.** | Interpretar la salida de `sui-mono check`: lleva colores y es texto pensado para personas. Llamarlo dentro de Vitest: `config.js` lee el `cwd` al cargarse, y Vitest no puede cambiarlo por test. |
| **Repo git temporal con solo los manifiestos.** | Usar el repo real: su historial no tiene commits con scope, y el test dependería de él. |
| **README bilingüe en un solo archivo**, con dos secciones. | `README.es.md` y `README.en.md`: npm solo muestra `README.md`. |
| **`publishConfig` en cada paquete y `config.sui-mono.access` en la raíz**: los pide la spec (RF-1, RF-3). `npm publish` lee el primero; `sui-mono release`, el segundo. | Solo uno de los dos: la publicación a mano de `0.1.0` o la de `sui-mono release` saldría `restricted`. |
| **RF-8 y RF-10 sin test.** Su check es leer el texto, y los aprueba el dueño (la spec lo dice en «Hecho cuando»). | Un test que fije el texto de la constitución: congela una redacción que solo cambia con una enmienda. |
| **Worktree por tarea paralela**, como en la 004 y la 005; las tareas de documentos no necesitan `npm ci`. | El mismo checkout: esperas por el candado. |

**Dependencias (regla 9).** `@s-ui/mono` `^2.46.0`, de desarrollo, en la raíz: el motivo está en
la spec. Trae sus propias dependencias (conventional-changelog, `glob`, `commander`…). Ninguna
llega a un consumidor, porque los paquetes no la declaran (002, RF-4).

## 7. Estrategia de tests

- **Como dato:** `tarballProblems`, `stepPositions` y `forbiddenTerms`; los manifiestos (RF-1,
  RF-3); la lista del tarball (RF-2); el README del tarball (RF-9); el documento (RF-7); la guarda
  (RF-6).
- **Con un proceso externo:** RF-4 y RF-5, sobre el repo git temporal.
- **A mano, en la validación:** RF-8 y RF-10, leyendo el texto enmendado.
- **Inyección por tarea:** cada tarea tiene su línea «Inyección:», sobre copias en disco o en la
  rama del worktree, y su commit dice cuál se vio en rojo (regla 8).
- **Windows y npm 11:** la T-3 comprueba primero que `check()` lista `packages/react` y
  `packages/astro` en este entorno. `glob` devuelve barras `/`, y el código solo usa `awk` en la
  rama de dependabot, que aquí no se activa.
- **Proporción:** 8 tareas para 10 RF; dos de ellas (T-7 y T-8) son solo de texto.
