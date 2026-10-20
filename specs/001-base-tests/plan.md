# Plan 001 — base-tests

**Approved:** 2026-10-19 · el dueño aprobó el plan y las 8 tareas, con Node 24 LTS y `package-lock.json` versionado

Parte de `spec.md` (aprobada, 8 RF) y de `notes.md`. No hay `package.json`: se borró en el
reinicio, y el runner se elige aquí (bloque 6). Versiones comprobadas en npm el 2026-10-19.

## Decisiones del dueño (2026-10-19)

- **Node 24 LTS.** Vitest 5 declara `node: ^22.12.0 || ^24.0.0 || >=26.0.0` y no admite el Node
  23.11.0 de esta máquina; Astro 7.4.1 pide `>=22.22.0`. El dueño instala Node 24 LTS, y
  `engines.node` es `^22.22.0 || >=24.0.0`.
- **`package-lock.json` se versiona.** Sale de `.gitignore`, para que dos instalaciones resuelvan
  las mismas versiones, transitivas incluidas. Descartado: dejarlo fuera y fijar versiones exactas,
  lo que no fija las transitivas.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | Script `test` de la raíz que encadena tipos y Vitest; termina en 0 si todo pasa. |
| RF-2 | Meta-test: lanza Vitest sobre una fixture con un test que falla y lee código y salida. |
| RF-3 | Test con Playwright sobre una página fixture, con `colorScheme` emulado y sin JavaScript. |
| RF-4 | Helper que crea un consumidor por framework en el directorio temporal del sistema. |
| RF-5 | Test que instala un módulo no declarado en la raíz y en el padre del consumidor. |
| RF-6 | Instantánea del árbol (`git status` y hashes) antes y después de la suite de consumidor. |
| RF-7 | Enmienda de `AGENTS.md` («Verificar» y «Comandos»), en su propio commit `docs:`. |
| RF-8 | El script `test` corre `tsc --noEmit` y `astro check`; meta-test con errores inyectados. |

Todos los RF quedan cubiertos.

## 2. Archivos

| Archivo | Nuevo | Responsabilidad |
|---|---|---|
| `.gitignore` | modificado | Deja de ignorar `package-lock.json`. |
| `package-lock.json` | sí | Fija las versiones resueltas, transitivas incluidas. |
| `package.json` | sí | Declara el repo como privado, sus `engines` (`^22.22.0 \|\| >=24.0.0`), el script `test` y las dependencias de desarrollo con motivo. |
| `tsconfig.json` | sí | Decide qué TypeScript se comprueba: los tests y el `.tsx` de la fixture, en modo estricto, con `types: ["node"]`. |
| `vitest.config.ts` | sí | Decide qué es un test (`tests/**/*.test.ts`), qué queda fuera (`tests/fixtures/**`), los tiempos máximos y el `globalSetup` de T-6b. |
| `tests/global-setup.ts` | sí (T-6b) | Crea una vez por ejecución los consumidores que comparten los tests, los entrega con `provide` y los borra al terminar. |
| `tests/lib/paths.ts` | sí | Decide si una ruta está fuera del repo y dónde vive cada consumidor (lógica pura). |
| `tests/lib/snapshot.ts` | sí | Toma la instantánea del árbol y dice qué cambió entre dos (comparación pura). |
| `tests/lib/run.ts` | sí | Ejecuta un comando y devuelve código y salida, sin lanzar excepción si falla. |
| `tests/lib/consumer.ts` | sí | Crea un consumidor externo desde su starter fijado y le instala un tarball. |
| `tests/lib/browser.ts` | sí | Abre Edge con el esquema de color y JavaScript pedidos, y lee el estilo calculado. |
| `tests/fixtures/test-package/` | sí | El paquete de prueba: `package.json`, `src/sample.tsx` (TypeScript sin JSX), `src/Sample.astro`, `index.js`. |
| `tests/fixtures/undeclared-module/` | sí | El módulo `museum-undeclared`, que el paquete de prueba usa sin declararlo en RF-5. |
| `tests/fixtures/failing-suite/` | sí | Una suite con un solo test que falla, para el meta-test de RF-2. |
| `tests/fixtures/style-page.html` | sí | Una página con un color por esquema y un script que cambia otro color (RF-3). |
| `tests/*.test.ts` | sí | `paths` y `snapshot` (lógica pura), `runner` (RF-1, RF-2), `browser` (RF-3), `typecheck` (RF-8), `consumer` (RF-4 a RF-6). |
| `AGENTS.md` | modificado | RF-7: la política de verificación y de tipos. |

## 3. Lógica pura

Sin reloj ni disco dentro: el identificador de la ejecución y las rutas entran como parámetros.

```ts
// true si target no está dentro de root; en Windows, otra unidad cuenta como fuera.
isOutside(root: string, target: string): boolean
// <base>/cm-<runId>/<framework>; runId lo genera quien llama, una vez por ejecución.
consumerDir(base: string, runId: string, framework: 'react' | 'astro'): string
// Lista de diferencias entre dos instantáneas; vacía si son iguales.
diffSnapshots(before: Snapshot, after: Snapshot): string[]
type Snapshot = { status: string; hashes: Record<string, string> }
```

## 4. Algoritmo

**Consumidor externo (RF-4).**
```
dir = consumerDir(os.tmpdir(), runId, framework)
si dir existe: borrarlo entero                       # caso límite «directorio ocupado»
react: npm create vite@9.3.0 <dir> -- --template react-ts
astro: npm create astro@5.3.0 <dir> -- --template minimal --no-install --no-git --yes
si falla por red: fallar con «sin red: no se pudo crear el starter de <framework>»
tarball = npm pack <paquete> --pack-destination <dir padre>   # nunca dentro del repo
npm install <tarball> en dir;  comprobar isOutside(repo, dir) y que el paquete resuelve en dir/node_modules
importar el paquete en src/main.tsx (react) o src/pages/index.astro (astro), para que el build lo use
```

**Módulo no declarado (RF-5).** Copia el paquete de prueba a un temporal y añade a `index.js`
`import 'museum-undeclared'`. Primero copia `undeclared-module` a `<repo>/node_modules/` y espera
que el build del consumidor falle; lo borra. Después lo copia a `<base>/cm-<runId>/node_modules/`,
el padre del consumidor, y espera el mismo fallo. Por último declara la dependencia en el paquete
copiado, reinstala y espera que el build pase.

**Consumidores compartidos (T-6b).** El `globalSetup` de Vitest genera el `runId` y crea, en
paralelo, cuatro consumidores: uno sin tocar por framework (RF-4) y uno con la guarda de
resolución por framework (RF-5), en carpetas `cm-<runId>` y `cm-<runId>-guard` distintas. Antes
de crear el de React sin tocar, deja un `leftover.txt` en su ruta, para que el test de «borra y
recrea» solo compruebe que ya no está. También genera los starters de referencia, sin instalar,
para el test de configuración idéntica. Los tests reciben las rutas con `inject`. Los
consumidores sin tocar son de solo lectura; cada consumidor con guarda lo modifica solo su test
de RF-5, que es el último que lo usa. El teardown borra todas las carpetas `cm-<runId>*`.

**Árbol intacto (RF-6).** La suite de consumidor toma la instantánea en `beforeAll` (salida de
`git status --porcelain` y sha256 de cada archivo de `tests/fixtures/`) y en `afterAll` falla si
`diffSnapshots` no está vacío. Ninguna inyección toca el repo: todas van a copias temporales.

**Tipos (RF-8).** El script `test` es `tsc --noEmit && astro check --root
tests/fixtures/test-package && vitest run`. El meta-test copia la fixture a un temporal, inyecta
`const n: number = 'x'` en el `.tsx` y un error equivalente en el frontmatter del `.astro`, y
espera código distinto de 0 en cada comando; sin inyección, 0.

## 5. Interfaz

Es una línea de comandos: `npm test`.
- **Todo verde:** código 0 y el resumen de Vitest.
- **Un test rojo:** código distinto de 0; Vitest nombra el archivo y el test (RF-2).
- **Error de tipos:** `tsc` o `astro check` nombran archivo y línea y cortan la cadena con distinto
  de 0, antes de Vitest.
- **Sin red:** los tests de consumidor fallan con el mensaje de arriba; no se saltan en silencio.
- **Sin Edge:** el test de navegador falla con «no se encontró Microsoft Edge (canal msedge)».
- **Sin tests:** no aplica; la suite siempre tiene al menos los de esta spec.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **Vitest 5** como runner (dependencia de desarrollo). Corre TypeScript sin configuración y archivos en paralelo, y su salida nombra el test que falla. Además, el addon de tests de Storybook que la 004 podría usar pide `vitest ^3–5` como peer. | `node:test`: cero dependencias, pero sin tiempos máximos por archivo ni la integración con Storybook; habría que cambiarlo en la 004. Jest: necesita transformar ESM y TypeScript. |
| **`playwright-core` 1.64 con el Edge del sistema** (`channel: 'msedge'`). Edge viene con Windows 11, y la plataforma de la spec es Windows. Emula `colorScheme` y desactiva JavaScript por contexto. | `playwright` con Chromium descargado: cientos de MB por máquina y un paso de instalación más. Modo navegador de Vitest: el test corre dentro de la página, así que no puede desactivar JavaScript (RF-3). |
| **TypeScript 6.0.x**, no la 7.0.2. | TypeScript 7: `@astrojs/check` 0.9.11 solo admite `^5 \|\| ^6`. |
| **`@astrojs/check` 0.9.11 y `astro` 7.4.1** en la raíz. `astro check` necesita `astro` instalado; la 002 lo necesitará igual. | Instalarlos solo en una copia temporal: cada ejecución pagaría una instalación con red. |
| **Consumidores en `os.tmpdir()/cm-<runId>/`.** Fuera del repo, y dos ejecuciones a la vez no comparten carpeta. | Una carpeta fija: dos verificaciones se pisan. Dentro del repo: hereda el `node_modules` de la raíz, que es la lección de la antigua 001. |
| **Starters fijados**: `create-vite` 9.3.0 y `create-astro` 5.3.0, plantilla `minimal`. | La última versión: un cambio del starter rompería la suite sin cambiar nada aquí. |
| **Inyecciones en copias temporales**, nunca en el repo. | Editar y revertir archivos del repo: un fallo a medias deja el árbol sucio y rompe RF-6. |
| **`.tsx` de la fixture sin JSX.** Basta para que `tsc` lo compruebe. | Con JSX: exige `react` y sus tipos, que trae la 002. |
| **Sin workspaces de npm todavía.** | Declararlos ahora: no hay paquetes; los decide la 002. |
| **Leer el estilo calculado con `getComputedStyle` vía Playwright**, y por CDP (`CSS.getComputedStyleForNode`) si con JavaScript desactivado `evaluate` no responde. Lo comprueba T-3 al empezar. | Capturas y comparación de píxeles: frágil ante fuentes y escalado. |
| **Consumidores compartidos por ejecución** (decisión del dueño, 2026-10-19). Tras la T-6, `npm test` tardaba 58–76 s, casi todo creando e instalando consumidores, en serie y con instalaciones repetidas. Se crean una vez por `runId`, en paralelo, en el `globalSetup`, y los comparten todos los tests (bloque 4). Coste aceptado: los tests dejan de estar aislados entre sí. Un test que modificara un consumidor sin tocar afectaría a los demás, y por eso esos consumidores son de solo lectura. | Separar los lentos en `npm run test:consumers`: rompe el comando único de RF-1. Dejarlo como está: 58–76 s por ejecución. Reutilizar consumidores entre ejecuciones: más rápido, pero un consumidor viejo escondería un fallo de instalación limpia (RF-4). |
| **Guarda de resolución solo en el consumidor de RF-5** (decisión del dueño, 2026-10-19). Con el módulo en el `node_modules` de un padre del consumidor, la resolución de Node y de Vite sube por las carpetas y el build pasa (comprobado en T-6). `createConsumer` con `guardResolution: true` añade a la configuración del consumidor temporal un plugin de Vite que hace fallar el build si un import se resuelve fuera de su carpeta; en Astro, además, `vite.resolve.noExternal` con el paquete bajo prueba, para que Vite vea sus imports. Sin la opción, la configuración queda idéntica a la del starter (lo comprueba un test), y la 002 compila sobre un consumidor sin tocar. | B: el permission model de Node 24 (`--permission --allow-fs-read`): más fiel, pero frágil con los binarios nativos de Rolldown y esbuild. C: recortar RF-5 al caso de la raíz del repo: deja sin cubrir el riesgo del `node_modules` padre. |

**Dependencias de desarrollo y su motivo (regla 9).** Ninguna llega a un consumidor.
- `vitest` — el runner de RF-1 y RF-2.
- `playwright-core` — el navegador real de RF-3, sin descargar binarios.
- `typescript` — `tsc --noEmit` de RF-8, y los tipos que entrega la 002.
- `@astrojs/check` — `astro check` de RF-8.
- `astro` — lo exige `@astrojs/check` para comprobar `.astro`.
- `@types/node` `^24.19.2` — los tests importan `node:path` y otros módulos de Node, y `tsc` los
  comprueba; la versión 24 sigue al Node 24 LTS del dueño.

## 7. Estrategia de tests

- **Como dato** (Vitest en Node): `paths`, `snapshot`, el código de salida y la salida de los
  meta-tests (RF-2, RF-8) y la resolución del paquete en el consumidor (RF-4, RF-5).
- **Como output renderizado** (Playwright y Edge): RF-3, el color calculado con cada esquema y,
  sin JavaScript, el color que el script habría cambiado.
- **Cada check se ve en rojo una vez (regla 8):**
  - RF-2, RF-5 y RF-8 se inyectan solos: su test exige el rojo.
  - RF-1 se rompe a mano una vez con un `expect(1).toBe(2)` temporal.
  - RF-3, invirtiendo el esquema esperado.
  - RF-4, apuntando el consumidor dentro del repo.
  - RF-6, escribiendo un archivo en `tests/fixtures/` durante la suite.
  - RF-7, buscando las dos frases antiguas, que aún están.
  - El commit de cada tarea nombra su inyección.
- **Lentitud.** Los tests de consumidor instalan con red: `testTimeout` de 5 minutos en ese
  archivo y `--prefer-offline` en `npm install`.
