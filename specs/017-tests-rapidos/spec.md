# Spec 017 — tests-rapidos

**Status:** implemented · **Approved:** 2026-10-23 · el dueño: entrega 4, tras la 012; consumidores guardados entre ejecuciones
**Implemented:** 2026-10-24 · 16 tareas en 12 olas y 4 arreglos; tests 813 → 913; validada por el reviewer en 1 vuelta (10 RF implementados); el objetivo ≤ 75 % se da por cumplido con la T-16 sin carga (72.7 % y 73.4 %), por decisión del dueño («da por buena la medida de la T-16»)
**Changed:** 2026-10-23 · RF-10 añadido (limpieza de %TEMP% de ejecuciones muertas) · coordinator en modo autónomo
**Changed:** 2026-10-24 · segunda ronda de tareas por decisión del dueño («Arregla el fallo de astro-render y añade a la 017 tareas para bajar los tests de navegador y los builds de consumidores, hasta llegar al 50 %») · sin cambios en RF ni NFR · aprobada por el coordinator en modo autónomo, con una condición: cada archivo partido (T-12, T-14, T-15) sigue cayendo en `e2e`, porque llama a `need` él mismo o porque `splitTests` sigue sus imports, con un test que lo comprueba
**Changed:** 2026-10-24 · NFR de objetivo de ≤ 50 % / ≤ 70 % a ≤ 75 % / ≤ 75 % por decisión del dueño («Acepta lo medido: cambia en la spec los objetivos a ≤ 75 % sin cambios y tras un byte»), tras medir 72.7 % y 73.4 % en la T-16
**Size:** L (10 RF) · **Entrega:** 4 (tras la 012, antes de la 013) · **Depende de:** 012

## Contexto y objetivo

El dueño: «con esta escasa cantidad de componentes ya se tarda mucho, al crecer la deuda va a ser
abismal». Hoy `npm test` tarda **11 min 29 s**, una cota alta medida con otras dos ejecuciones en
paralelo (`notes.md`). Hay trabajo repetido:
- el paquete de React se compila unas 7 veces por ejecución (un `prepack` en cada `npm pack`);
- `astro-render` se construye dos veces, y Storybook se reconstruye en cada ejecución aunque no
  cambie nada;
- los 8 consumidores crean su starter y descargan sus dependencias del registro cada vez.

Esta spec quita ese trabajo sin aflojar ninguna guarda: lo que no cambia no se rehace, y lo que se
hace, se hace una vez.

## Definiciones

- **Ejecución** — un `npm test` completo, con su `globalSetup`.
- **Entradas** de un build — los archivos y las versiones de las que depende su salida.
- **Clave** — el hash de las entradas de un build; un build guardado vale solo si su clave coincide.
- **Base** — la duración de `npm test`, por fase, en esta máquina y sin otra carga, medida antes del
  primer cambio de esta spec.

## Historias de usuario

- US-1: Como dueño, quiero que `npm test` tarde mucho menos, y que no crezca al ritmo de los
  componentes.
- US-2: Como tarea, quiero correr solo los tests que toco sin construir lo que no necesitan.

## Requisitos (EARS)

- RF-1: EL SISTEMA empaqueta cada paquete publicable una sola vez por ejecución. — **Check:** el
  registro da un `prepack` por paquete, y cada consumidor usa ese tarball.
- RF-2: EL SISTEMA construye `astro-render` una sola vez por ejecución. — **Check:** el registro de
  la ejecución da una sola `astro build` de `astro-render`.
- RF-3: MIENTRAS las entradas de Storybook o de `astro-render` no cambian, EL SISTEMA reutiliza su
  build. — **Check:** una segunda ejecución sin cambios no construye ninguno de los dos.
- RF-4: SI cambia una entrada, o la clave falta o no se lee, ENTONCES EL SISTEMA vuelve a construir.
  — **Check:** cambiar un byte de una historia, de la hoja o de un componente reconstruye.
- RF-5: MIENTRAS el starter fijado y sus dependencias no cambian, EL SISTEMA reutiliza los
  consumidores instalados. — **Check:** una segunda ejecución no ejecuta starters ni descarga nada.
- RF-6: EL SISTEMA instala en cada consumidor los tarballs de la ejecución en curso. — **Check:** el
  hash del paquete instalado en cada consumidor es el del tarball de esa ejecución.
- RF-7: CUANDO un subconjunto de tests no usa consumidores ni galería, EL SISTEMA no los prepara. —
  **Check:** `vitest run tests/contract.test.ts` no empaqueta ni construye, y tarda ≤ 30 s.
- RF-8: SI un test usa una preparación que no se hizo, ENTONCES EL SISTEMA falla y la nombra. —
  **Check:** un test que pide la galería sin prepararla falla con el nombre de la galería.
- RF-9: EL SISTEMA informa, al acabar `npm test`, de la duración de cada fase. — **Check:** la
  salida de `npm test` lleva una tabla de fases con sus segundos.
- RF-10: CUANDO una ejecución empieza, EL SISTEMA borra de `%TEMP%` las carpetas `cm-*` y los
  perfiles de Edge de los tests de ejecuciones muertas, y cierra sus Edge. — **Check:** con restos
  de un `runId` muerto y de uno vivo, solo desaparecen los del muerto; el Edge del usuario sigue.

## Requisitos no funcionales

- **Objetivo.** Sin cambios desde la ejecución anterior, `npm test` ≤ 75 % de la base; tras un
  cambio en un componente, ≤ 75 %. Cada cifra es la mediana de 3 ejecuciones.
- **Crecer menos que lineal.** El número de empaquetados, instalaciones, starters y builds de
  Storybook por ejecución no depende del número de componentes (RF-1 a RF-5).
- **Ninguna guarda se afloja (regla 8).** Una muestra de inyecciones de specs anteriores se vuelve a
  poner en rojo después del cambio (`notes.md`), y ningún test de `tests/` se borra.
- **El lock** (`tests/lib/lock.ts`) no cambia. **Una puerta:** un subconjunto (RF-7) acelera una
  tarea, pero no sustituye a `npm test` para reportar (`AGENTS.md`).
- **Dependencias (regla 9):** ninguna nueva. La caché vive en `node_modules/` y nunca se versiona.

## Casos límite

- **Una ejecución se corta a medias:** su build a medio escribir no se reutiliza (RF-4).
- **Dos checkouts (worktrees):** cada uno tiene su caché, junto a su lock (RF-3, RF-5).
- **Restos de otro checkout vivo, o un Edge del usuario:** no se tocan; ante la duda, no se borra
  (RF-10).
- **Se cambia la versión de un starter o de una dependencia de la raíz:** cambia la clave y se
  rehace (RF-4, RF-5).
- **`gallery/generated/` borrado a mano:** se reconstruye, no se sirve el JSON guardado (RF-4).
- **La red no está:** si la caché de consumidores vale, la ejecución no la necesita (RF-5).

## Fuera de alcance

- Cambiar los `hookTimeout` y `testTimeout` globales de `vitest.config.ts`. Partir archivos de Edge
  sí entra (segunda ronda), con un timeout propio en el `beforeAll` que lo necesite.
- Reescribir tests para que midan menos.
- Integración continua.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-10 son tests vistos en rojo una vez inyectando su violación
  (regla 8), y la muestra de inyecciones anteriores sigue en rojo.
- La tabla de fases, antes y después, en el informe, con las medianas del objetivo.

## Preguntas abiertas

Ninguna.
