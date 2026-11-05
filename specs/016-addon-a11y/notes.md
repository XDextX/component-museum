# Notas de la 016 — addon-a11y

## Decisiones del dueño (2026-10-23)

- Entra `@storybook/addon-a11y` («Sí, en la 015»); decidido por el dueño. Va en su propia spec, la
  016, porque la 015 pasaba de 100 líneas con él. Las dos son de la entrega 5, y esta depende de la
  015.
- Los tests de historia van dentro de `npm test` (015); decidido por el dueño. Los de axe van con
  ellos.
- Una violación de axe rompe `npm test`: `parameters.a11y.test: 'error'` en todas las historias
  (RF-2); decidido por el dueño.

## Versión y lo que arrastra (consultado el 2026-10-23)

Fuentes: `npm view` en el registro de npm y
storybook.js.org/docs/writing-tests/accessibility-testing.

| Paquete | Versión | Por qué | Lo que trae |
|---|---|---|---|
| `@storybook/addon-a11y` | 10.6.3 | Igual que `storybook` 10.6.3; pide `storybook ^10.6.3`. | `axe-core ^4.2.0` (hoy, 4.14.0; 3.4 MB; MPL-2.0) y `@storybook/global ^5.0.0`; 188 KB. |

- Según la documentación oficial, axe corre por defecto las reglas WCAG 2.0 y 2.1 de nivel A y AA,
  más las de buenas prácticas. La regla `region` viene desactivada por defecto.
- `parameters.a11y.test` admite tres valores:
  - `'off'`: no corre;
  - `'todo'`: avisa en el panel, y en CLI/CI no da ni error ni salida;
  - `'error'`: la historia falla, en el panel y en la CLI.
- Las comprobaciones de axe se ejecutan junto con los tests de historia del addon de Vitest.
- La documentación avisa de dos cosas: lo automático solo cubre «hasta un 57 %» de WCAG, y axe con
  Vitest puede dar resultados distintos según el navegador. Aquí siempre es el mismo Edge.
- `axe-core` es MPL-2.0: es una licencia de copyleft débil, por archivo, y solo se usa en
  desarrollo. No se publica ni se modifica.

## Qué mide cada uno (no se afloja ni se duplica)

| Comprobación | axe (016) | Tests de Edge de hoy |
|---|---|---|
| Etiqueta y nombre accesible | Sí, en cada historia. | `field-a11y` y `gallery.test` en los casos que nombran. |
| ARIA válido, `id` duplicados | Sí. | En parte (`field-markup`). |
| Contraste de texto 4.5:1 | Sí, con el fondo que calcula axe; lo dudoso queda como «incompleto». | Sí, contra el fondo compuesto real, en cada tema (`visibleTexts`). |
| Contraste no textual 3:1 (borde, anillo) | No. | Sí (`field-a11y`, `a11y`). |
| Foco con `Tab` real y anillo visible | No. | Sí. |
| Tokens por tema | No. | Sí (`theme`, `gallery-theme`). |

Las dos se quedan. axe se suma porque cubre todas las historias por igual, sin escribir un test por
cada una.

## Pregunta para el dueño, con recomendación

- **¿Una violación rompe `npm test`?**
  - **Recomendado:** sí, `parameters.a11y.test: 'error'` en `preview.ts`, para todas las historias.
    Un aviso que no rompe nada no es una guarda (regla 8), y la regla 7 es innegociable.
  - Las excepciones van en una lista con su motivo (RF-4); la primera es `region`.
  - Coste: si axe encuentra algo hoy en Button, Input o Textarea, hay que arreglarlo antes de cerrar
    la 016. Eso sería un hallazgo para otra spec, no algo que se desactive.
  - Alternativa: `'todo'`, que solo avisa en el panel. No para nada, y no vale para la regla 8.

## Menores decididos por el planner (opción conservadora)

- Los «incompletos» de axe no rompen: lo que axe no sabe decidir lo miden ya los tests de Edge.
- Dos pasadas, con el tema claro y con el oscuro de la galería (`initialGlobals` del plugin de la
  015), en lugar de una con «Sistema».
- `addon-a11y` va en `gallery/package.json`, como el de la 015.

## Para el plan

- Las dos pasadas son dos proyectos de Vitest con `initialGlobals: { theme: 'light' }` y
  `{ theme: 'dark' }`, o uno parametrizado. El plan elige, y mide el coste en segundos.
- La lista de excepciones de RF-4 es un dato (por ejemplo, en `preview.ts`), y el test la compara
  con la configuración real.
- Lo primero de la tarea: correr axe sobre las historias actuales y apuntar lo que salga.

## Revisión del 2026-11-01, contra `main` con la entrega 4 (aplicados)

Medida: axe 4.14.0 en las 12 historias construidas, en Edge y en los dos temas (tabla en `plan.md`).
**Hay 114 violaciones de `color-contrast`**, solo en claro, en `RadioGroup/Astro` (54) y
`Select/Astro` (60): `#f14d4d` sobre `#ffffff`, 3.55:1, en `value:` y `label:` del código de uso,
que el resaltado de Storybook pinta como un espacio de nombres. Las otras 10 historias y las 12 en
oscuro dan 0. La sonda y su `axe.min.js` se quedaron fuera del repo.

Busqué los casos de una «T-16 de la 013 y la 014»: esas specs no tienen T-16 (la T-16 es de la 017),
así que lo medí directamente.

- **C-5, «Fuera de alcance»: una violación en la galería se arregla aquí.** Hoy dice que una
  violación en un componente es un hallazgo para otra spec, y no dice nada de la galería. Sin
  arreglar esta, RF-2 deja `npm test` en rojo desde el primer día. Texto: «Cambiar los componentes:
  una violación en un componente es un hallazgo para otra spec. Una en el código propio de la
  galería se arregla en esta». Recomendado, y es de lo que depende la T-1.
- **C-6, nota sobre el contraste de `gallery-story-theme`:** mide todo el texto solo en las
  historias de Button. No propongo ampliarlo aquí: la T-1 cubre el código de todas las historias
  Astro, y axe, el resto. Si el dueño prefiere una guarda propia para cada historia, es otra spec.
- **Sin cambio de spec, para que se sepa:** el addon añade un simulador de visión a la barra, y una
  pestaña «Accessibility» al panel. La 007 quitó cuatro botones concretos; este no es uno de ellos.

## T-2: la medida con el proyecto `stories` y las inyecciones (2026-11-04)

**Medida inicial** (`vitest run --project stories`, axe 4.14.0, addon 10.6.3, `a11y.test: 'error'`,
`region` desactivada, con la hoja de la T-1, en el tema «Sistema» del proyecto):

| Resultado | Dónde | Detalle |
|---|---|---|
| **0 violaciones** | Las 12 historias | 12 tests de historia en verde. |
| Violaciones de componentes | Ninguna | No hay hallazgo para otra spec. |

Las 114 violaciones de `color-contrast` de la medida del plan ya no salen: las resolvió la T-1.
Los «incompletos» no rompen, como dice la spec. Esta pasada es una sola, en «Sistema» (claro en el
Edge de la prueba); las dos pasadas por tema son la T-3.

**Excepciones (`gallery/lib/a11y-exceptions.ts`):** solo `region` («una historia es un fragmento,
sin regiones de página; el addon ya la desactiva»).

**Inyecciones (vistas en rojo y revertidas):**

| Inyección | Resultado |
|---|---|
| Una historia temporal `Tmp/React` con `<input />` sin etiqueta | `vitest run --project stories` en rojo: 1 test fallido, regla `label` («Form elements must have labels»), elemento `<input>`. Historia borrada. |
| `{ id: 'color-contrast', enabled: false }` añadida a mano a las reglas de `preview.ts` | `addon-a11y.test.ts` en rojo: «disables rules in preview.ts only from that list» (2 `enabled: false`, se esperaba 1). Revertida. |
| Versión instalada de `@storybook/addon-a11y` a 10.6.2 (en `node_modules`) | Rojo: «expected '10.6.2' to be '10.6.3'». Restaurada. |
| Excepción `{ rule: 'label', reason: '' }` en la lista | Rojo: «reason of label: expected 0 to be greater than 10». Revertida. |

**Tests:** 1323 → 1330 (7 nuevos en `tests/addon-a11y.test.ts`). `npm test` termina en 0 (212.8 s
en total, 202.1 s de vitest, con otra carga en la máquina).

**Desvío:** la inyección de «input sin etiqueta» se hizo sobre el proyecto `stories` y no sobre
`npm test` completo, para no pagar 200 s; es el mismo proyecto que `npm test` ejecuta.

## T-3: axe en los dos temas (2026-11-04)

**Cómo se pinta cada tema:** `gallery/vitest.config.ts` exporta `themed(theme)`, que crea el proyecto con `storybookTest({ initialGlobals: { theme } })` y el nombre `stories-<tema>`; su export por defecto es `themed('light')`. `gallery/vitest.dark.config.ts` exporta `themed('dark')`. El decorador de `preview.ts` lee ese global y pone `data-theme` en el lienzo (axe lo cita: `div[data-theme="dark"] > p`). Los dos comparten el `globalSetup` del lock, y `shareWithProcess` los deja ser co-dueños en el mismo proceso (RF-6 de la 015).

**Desvío del plan:** el plan decía un solo archivo (`gallery/vitest.config.ts`). Vitest 5.0.5 no admite que un archivo exporte un array ("config must export or return an object") ni `test.projects` anidado dentro de un proyecto ("No projects were found"). Por eso hay un segundo archivo, `gallery/vitest.dark.config.ts`, y una línea más en `projects` de `vitest.config.ts`. El panel de Storybook usa `gallery/vitest.config.ts`, es decir, el proyecto claro.

**Inyecciones de la 016** (historia temporal `Tmp/React` con texto `#2a2a2a`, legible en claro e ilegible en oscuro; borrada después):

| Inyección | Resultado |
|---|---|
| La historia con las dos pasadas | `stories-dark` en rojo: `color-contrast` 1.23:1 (`#2a2a2a` sobre `#111827`); `stories-light` en verde. 25 pasados, 1 fallido. |
| `initialGlobals: { theme: 'light' }` en el constructor (los dos proyectos en claro) | Las 26 historias en verde: la historia deja de verse en rojo, y eso prueba la pasada. El test de texto `gives each project the initial theme it is named for` se pone en rojo. |
| Quitar `gallery/vitest.dark.config.ts` de `projects` | Rojo: `lists the dark project's config in the projects of vitest.config.ts`. |

**Las guardas de la 015 repetidas** (`vitest run --project unit tests/addon-vitest.test.ts tests/addon-a11y.test.ts`; los textos que leen siguen donde estaban, así que no se tocó ninguna): las 9 inyecciones de la T-5 y la T-6 (1, 1b, 2, 3, 4, 5, T5a, T5b, T5c) siguen en rojo, cada una en su test.

**Tests de historia:** 12 → 24 (12 por tema). Tests de `npm test`: 1330 → ver el reporte de la tarea.

## Después (T-4, 2026-11-04)

Worktree `.claude/worktrees/agent-aab3f848f96c25e90`, rama `spec/016-addon-a11y-T-4` sobre `91d9d50` (con la T-1 a la T-3), 12 núcleos, sin código cambiado. Arranque: `npm ci`, `npm run build:packages`, `npm run gallery:astro`.

**El panel (RF-5).** `storybook dev --no-open` en el puerto 6107 (pid propio, parado al acabar) y Edge headless por script (`playwright-core`, canal `msedge`), sin ventana. Para cada historia y tema se abre el gestor con `?path=/story/<id>&globals=theme:<tema>`, se pulsa la pestaña «Accessibility» y se lee su contador; el lienzo del iframe lleva el `data-theme` pedido en las 24 (se comprobó).

| Historia | Claro: violaciones / pasadas / incompletas | Oscuro: violaciones / pasadas / incompletas |
|---|---|---|
| Button/Astro | 0 / 14 / 0 | 0 / 14 / 0 |
| Button/React | 0 / 6 / 0 | 0 / 6 / 0 |
| Checkbox/Astro | 0 / 17 / 0 | 0 / 17 / 0 |
| Checkbox/React | 0 / 9 / 0 | 0 / 9 / 0 |
| Input/Astro | 0 / 16 / 0 | 0 / 16 / 0 |
| Input/React | 0 / 8 / 0 | 0 / 8 / 0 |
| RadioGroup/Astro | 0 / 21 / 1 | 0 / 21 / 1 |
| RadioGroup/React | 0 / 13 / 1 | 0 / 13 / 1 |
| Select/Astro | 0 / 17 / 1 | 0 / 17 / 1 |
| Select/React | 0 / 9 / 1 | 0 / 9 / 1 |
| Textarea/Astro | 0 / 16 / 0 | 0 / 16 / 0 |
| Textarea/React | 0 / 8 / 0 | 0 / 8 / 0 |

0 violaciones en las 24 combinaciones. Los 4 «incompletos» (RadioGroup y Select) no rompen, como dice la spec.

**Inyección.** Una historia temporal `Tmp/React` (`gallery/stories/Tmp.react.stories.tsx`) con `<input />` sin etiqueta sale en el panel con «Violations 1» (5 pasadas) en claro y en oscuro. Historia borrada; `git status` limpio; servidor parado por su pid.

**Carga antes de medir.** Sin otra sesión de `npm test`, `vitest` ni `storybook`, y sin ningún `msedge`. 38 procesos `node` al empezar (26 al acabar; sobre todo MCP y herramientas de agentes). Memoria libre 4.0 GB de 15.5 GB al empezar, 6.1 GB al acabar. CPU: el contador del sistema dio entre 35 y 61 % justo después del servidor, y 11 % al final; por proceso, lo más activo eran Discord, Opera y Claude, con menos de un 5 % del total entre todos.

**Medida (método de la 015: calentamiento + pasadas; `npm test` entero, cada una con su total de reloj).** Seis pasadas en caliente en vez de tres, porque 4 de 6 salieron con 1.

| Pasada | Total (s) | vitest (s) | Salida |
|---|---|---|---|
| Calentamiento | 235.6 | 225.2 | 1 (`gallery.test.ts` RF-3 Button, timeout de 10 s en frío; igual que el de la 015) |
| P1 | 195.8 | 185.6 | 1 |
| P2 | 178.7 | 170.8 | 0 |
| P3 | 184.2 | 173.8 | 1 |
| P4 | 178.1 | 171.1 | 1 |
| P5 | 166.8 | 159.5 | 0 |
| P6 | 180.0 | 171.9 | 1 |

- **Mediana de las tres primeras (P1 a P3, el método): 184.2 s.** Mediana de las seis: 179.4 s.
- Las 4 salidas con 1 son todas la misma: `gallery-i18n.test.ts`, `afterAll` (`closeBrowserAndServers`) con `Hook timed out in 30000ms`, y antes `[museum] teardown: closing Edge still running after 10000 ms / 20000 ms`. Los 1344 tests pasan y 1 se omite en las seis (1312 → 1345 con las tres tareas; la 015 acabó en 1311 + 1). Cero OOM, cero `Unhandled Rejection`. Es el síntoma de la serie contaminada de la T-1 de la 015, pero aquí con la máquina casi libre y 4 de 6 veces.

**Fases de la mediana (P3, 184.2 s; total de la tabla 183.7):** `build react` 0.9; `gallery:astro` 0.6 (acierto); `tipos` 8.4 (`tsc -p gallery` 3.3, `tsc` 5.2, `astro check` 7.5, 7.7 y 8.3); `globalSetup`: cleanup 0.9, packs 1.1 a 2.2, el resto en acierto de caché, consumidores 1.4 a 9.2, type check package-react 4.4 y package-astro 14.1, cadena más larga (package-astro) 25.2; `vitest` 173.8 (incluye el `globalSetup`); total 183.7. En P5 (la más rápida, 166.8 s): `tipos` 5.6, `vitest` 159.5.

**Veredicto.**

| Límite | Base | Medida (P1 a P3) | Resultado |
|---|---|---|---|
| ≤ 15 s sobre la base (C-4) | 162.4 s (mediana de la 015, sobre `9b200ed`) | 184.2 s: **+21.8 s** | **No cumple**: faltan 6.8 s (con la mediana de seis, +17.0: faltan 2.0). |
| ≤ 170 s (Changed de la 015) | | 184.2 s | **No cumple**: sobra 14.2 s (con seis, 179.4: sobra 9.4). |

Solo P5 (166.8 s, +4.4, 3.2 por debajo de 170) cumple los dos; es una de seis.

**Dónde.** Las 24 historias, solas (`vitest run --project stories-light --project stories-dark`), tardan 11.6 s de reloj contra la caché ya caliente, de los que los tests son el 6 %; en la 015, las 12 sumaban 2.1 s a la suite entera al solaparse con `e2e`. No se midió en cuánto suma axe dentro de la suite completa, y la estimación (unos 2 a 5 s) no explica los +21.8 s. El resto está en `vitest` (173.8 s contra 135.1 s de la T-4 de la 015; la medida final de la 015 no apuntó su `vitest`) y en `tipos`, 8.4 s contra 5.0 s de la base de la 015. Las pasadas de `gallery-i18n.test.ts` se alargan a 99 s en P3 (57.4 s en la base de la 015) por el cierre de Edge. Lo que sí se sabe: la base de la 015 ya se movió de 141.1 s a 162.4 s sin cambio de código atribuible, así que hay una deriva de la máquina que esta medida no separa de la 016. Decide el dueño si sube el límite otra vez, o si pide investigar el cierre de Edge de `gallery-i18n` antes (es un hallazgo para otra spec: el cierre del navegador es del arnés de tests).

**Anomalías.** Las pasadas P5 y P6 se lanzaron primero desde otra carpeta y no valían (0.3 s); se repitieron desde el worktree. No se tocó el Edge del usuario.

## Después (T-5, 2026-11-04)

Mismo worktree y rama que la T-4, sin commits. El dueño decidió «Arreglar el cierre y medir».

**Causa.** No es una página, un contexto ni un servidor sin cerrar: el contexto se cierra en 0 ms y el servidor en 1 a 8 ms. Es `browser.close()` de Edge, que tarda lo que cuesta cerrar Edge con la máquina ocupada. Medido con una sonda aparte (`launch`, página, `contexts.close`, `browser.close`):

| Edges cerrando a la vez | Cierre de Edge |
|---|---|
| 1 | 0.3 s |
| 6 | 0.4 a 1.1 s |
| 12 | 1.2 a 3.2 s |
| `npm test` completo (35 cierres medidos con una traza temporal) | hasta 24.2 s; 17.4, 12.5, 8.5, 24.2 y 3.1 s en los cierres de `gallery-i18n` |

`gallery-i18n.test.ts` lanzaba y cerraba Edge **seis veces seguidas** (un `beforeAll`/`afterAll` por componente dentro de `describe.each`): 67 s de sus 99 s eran cierres de Edge, y cada uno era otra ocasión de pasar los 30 s del hook. Solo, el archivo tarda 57.8 s (como en la base de la 015) y cierra en 0.3 s; con los proyectos `stories-light` y `stories-dark` más `e2e` en el mismo comando, también 55.9 s: el retraso aparece solo con toda la suite en marcha. La 016 suma dos Edge de historias y el trabajo de axe a esa contención. `route.ts` (`untilClosed`) no tiene que ver con el cierre; sí con otro fallo (ver abajo). Los argumentos de Edge (`--disable-gpu`, `--disable-extensions`…) no cambiaron el cierre de forma medible.

**Arreglo.** `tests/gallery-i18n.test.ts`: un solo Edge y un solo servidor para todo el archivo (`beforeAll`/`afterAll` fuera del `describe.each`; cada test abre su propio contexto). Pasa de 6 lanzamientos y 6 cierres a 1. Solo, el archivo baja de 57.8 a 54.7 s. Sin tocar ningún `hookTimeout` ni `testTimeout`. Otros archivos lanzan Edge en `beforeAll` (`gallery-docs-theme`, `theme`, `story-theme`), pero uno por archivo o por bloque; no se tocaron.

**Test.** `tests/gallery-i18n-edge.test.ts` (proyecto `unit`, 1 test): el `chromium.launch(` de `gallery-i18n.test.ts` va antes de `describe.each(`. Visto en rojo antes del arreglo (`expected 1270 to be less than 981`) y en verde después. No se puede probar el tiempo bajo carga en un test, así que guarda la estructura que lo causa; la inyección es devolver el lanzamiento al interior del `describe.each`.

**Segundo fallo, en la serie de medida.** Una pasada salió con 1 por `Unhandled Rejection: route.fetch: Request context disposed` (en `tests/lib/route.ts:19`, `setThemeAttribute`): `untilClosed` no reconocía ese mensaje de cierre. Se añadió `Request context disposed` a su expresión y un caso a `tests/route.test.ts` (rojo antes, verde después). Es el mismo tipo de fallo que el `Response has been disposed` de la 015.

**Medida.** La serie A se hizo con el arreglo de Edge y sin el de `route.ts`; la serie B, con los dos y es la que cuenta. Carga antes de la serie B: CPU 39 % en el instante de arrancar, 4.1 GB libres, 24 procesos `node`, ningún `msedge`, sin otro `npm test`.

| Pasada | Serie A (s) | Salida | Serie B (s) | Salida |
|---|---|---|---|---|
| Calentamiento | 228.1 | 0 | 213.7 | 0 |
| P1 | 180.8 | 0 | 205.9 | 0 |
| P2 | 168.9 | 1 (`Unhandled Rejection` de `route.fetch`) | 188.9 | 0 |
| P3 | 170.8 | 0 | 187.0 | 0 |
| Mediana | 170.8 | | **188.9** | |

- Serie B, pasada mediana (P2, total 188.3): `build react` 0.9; `gallery:astro` 0.7 (acierto); `tipos` 8.0; `globalSetup` cadena más larga (package-astro) 25.3, con type check package-react 2.6 y package-astro 14.4; `vitest` 178.7. `vitest` en P1 y P3: 196.6 y 179.6.
- 8 de 8 pasadas desde el arreglo (4 de A, 4 de B) tienen todos los tests en verde y **cero `Hook timed out` y cero `closing Edge still running`**; 7 de 8 salen con 0 y la que no, por `route.fetch`, está arreglada. Antes del arreglo, 4 de 6 salían con 1 por el cierre. 1347 tests (1346 pasan, 1 omitido).
- **Veredicto, serie B (la que cuenta): 188.9 s.** Contra la base de 162.4 s: **+26.5 s, no cumple ≤ 15 s** (faltan 11.5 s). Contra ≤ 170 s: **no cumple**, sobran 18.9 s. La serie A, con la misma lógica de Edge, dio 170.8 s: +8.4 s sobre la base (**cumple ≤ 15 s**) y 0.8 s por encima de 170 (**no cumple por poco**).
- Las dos series, con el mismo código salvo `route.ts`, difieren en 18 s. La máquina deriva entre series (la base de la 015 pasó de 141.1 s a 162.4 s sin cambio de código), y esta medida no separa lo que cuesta la 016 de esa deriva. Lo que el arreglo sí cambió es la salida: `npm test` deja de terminar en 1. La duración sigue sin cumplir con la medida de la serie B; decide el dueño si sube el límite, o si pide medir otra vez la base de la 015 en la máquina de hoy.
