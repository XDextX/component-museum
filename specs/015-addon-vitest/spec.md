# Spec 015 — addon-vitest

**Status:** implemented · **Approved:** 2026-10-23 · el dueño, para después de la entrega 4; tests de historia dentro de npm test
**Changed:** 2026-11-01 · cambios de la revisión del 2026-11-01 (C-1 a C-4, en `notes.md`), por decisión del dueño («Apruebo todo»)
**Changed:** 2026-11-01 · límite de `npm test` de 130.7 s (75 % de la base de la 017) a ≤ 150 s, por decisión del dueño («Subirlo a 150 s»), tras medir 139.0 s en la T-1
**Changed:** 2026-11-04 · límite de `npm test` de ≤ 150 s a ≤ 170 s, por decisión del dueño («Subir el límite a 170 s»), tras medir una mediana de 162.4 s en caliente sobre 9b200ed
**Implemented:** 2026-11-04 · 6 tareas (T-5 y T-6, guardas de RF-2 y RF-6 pedidas por la validación); tests 1287 → 1312; validada por el reviewer en 2 vueltas, y la T-6 cierra los 5 falsos verdes de la segunda, con sus inyecciones en rojo pero sin una tercera vuelta del reviewer; cierre aprobado por el dueño («Subir el límite a 170 s»)
**Size:** M (6 RF) · **Entrega:** 5 (herramientas de la galería) · **Depende de:** 014

## Contexto y objetivo

El dueño quiere `@storybook/addon-vitest` en la galería. Aporta dos cosas:
- un panel de tests dentro de Storybook («Run tests»), con el estado de cada historia;
- cada historia convertida en un test de humo (que se pinte sin error) sin escribirlo.

Hoy los tests de la galería son Vitest con `playwright-core` sobre el Edge del sistema, contra el
Storybook construido (`gallery-*.test.ts`, `a11y`, `field-a11y`…). Miden cosas concretas: tokens,
contraste, controles, idiomas, desborde. El addon **no sustituye ninguno**: añade el humo por
historia y el panel. `npm test` sigue siendo la única puerta (constitución, reglas 7 y 8;
`AGENTS.md`). Versiones y dependencias, con sus fuentes, en `notes.md`.

## Definiciones

- **Test de historia** — el que el addon genera por cada historia: la pinta en el navegador y falla
  si lanza un error (y ejecuta su `play`, si la tiene).
- **Panel de tests** — el widget del gestor de Storybook que lanza esos tests y muestra su estado.

## Historias de usuario

- US-1: Como dueño, quiero lanzar los tests de las historias desde Storybook y ver cuál falla.
- US-2: Como dueño, quiero que una historia nueva quede probada sin escribir su test.

## Requisitos (EARS)

- RF-1: EL SISTEMA declara el addon y sus pares con versiones exactas compatibles con lo
  instalado. — **Check:** un test falla si `vitest`, `playwright` o `storybook` no casan.
- RF-2: CUANDO se ejecuta `npm test`, EL SISTEMA ejecuta el test de cada historia. — **Check:** una
  historia que lanza un error pone `npm test` en distinto de 0, y su nombre sale.
- RF-3: EL SISTEMA ejecuta los tests de historia en el Edge del sistema, sin descargar navegadores.
  — **Check:** pasan con `PLAYWRIGHT_BROWSERS_PATH` vacío, y el navegador lanzado es Edge.
- RF-4: CUANDO el lector pulsa «Run tests» en `npm run gallery`, EL SISTEMA muestra el estado de
  cada historia. — **Check:** en la validación, en Edge con el servidor de desarrollo, aprobadas.
- RF-5: EL SISTEMA mantiene cada test que ya existe en `tests/`. — **Check:** la lista de
  `vitest list` al acabar contiene cada nombre de la lista al cortar la rama.
- RF-6: MIENTRAS otro `npm test` tiene el lock, EL SISTEMA no ejecuta desde la línea de comandos
  los tests de historia. — **Check:** con el lock de otro proceso vivo, el proyecto de historias
  no arranca hasta soltarlo.

## Requisitos no funcionales

- **Dependencias (regla 9).** Motivo: el panel de tests en Storybook y un test de humo por historia
  sin escribirlo, que pide el dueño. Son de desarrollo y de la galería: no llegan a ningún paquete
  ni a un consumidor (regla 2).
- **Sin descargas.** Ni `playwright install` ni ningún navegador de Playwright: se usa el Edge
  instalado, como `playwright-core` hoy.
- **Una puerta.** No hace falta ningún comando nuevo para validar; un script propio para el panel es
  solo comodidad.
- **Duración.** El proyecto suma ≤ 10 s a `npm test` (≤ 15 s con la 016), mediana de 3 ejecuciones.
- **Telemetría.** Ninguna, como la galería (`core.disableTelemetry`).

## Casos límite

- **Historias Astro:** son historias de React que pintan el HTML prerenderizado por Astro (005). El
  test de historia comprueba que la historia y su JSON se pintan; no prueba el componente de Astro,
  que siguen probando `field-markup` y `gallery.test` (RF-2).
- **El JSON de Astro falta** (no se ejecutó `gallery:astro`): el test de esa historia falla con un
  mensaje que lo dice (RF-2).
- **Páginas MDX:** el addon prueba historias, no documentación; las páginas siguen con sus tests de
  idiomas, snippets y tema (RF-5).
- **Dos `npm test` a la vez:** el segundo espera al lock, también para las historias (RF-6).
- **El panel abierto:** su Vitest no toma el lock, y `npm test` no lo espera (RF-6).
- **El asistente `storybook add` ofrece instalar navegadores de Playwright:** se rechaza (RF-3).

## Fuera de alcance

- `@storybook/addon-a11y` y sus tests de accesibilidad: van en la 016 (decisión del dueño).
- Tests visuales o de capturas, y funciones `play` nuevas en las historias.
- Sustituir o reescribir los tests de `tests/`.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-3 y RF-6 son tests vistos en rojo una vez inyectando su
  violación (regla 8); RF-4 y RF-5 se comprueban en la validación, también con su violación.
- Se abrió `npm run gallery`, se pulsó «Run tests» y cada historia acabó aprobada.

## Preguntas abiertas

Ninguna.
