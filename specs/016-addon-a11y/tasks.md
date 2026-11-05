# Tareas 016 — addon-a11y

La rama `spec/016-addon-a11y` sale de `spec/015-addon-vitest`. Cada tarea va en su propio worktree,
en `.claude/worktrees/`, con su `node_modules`, y empieza así:
1. `git branch -m spec/016-addon-a11y-T-n`;
2. `git reset --hard <PLAN>`, o el commit de la ola anterior que dé el coordinator;
3. `npm ci`, `npm run build:packages` y `npm run gallery:astro`.

Antes de reportar pasa el build de `packages/react`, `npm run gallery:astro`, los dos `tsc` y
`npm test`, y da el número de tests antes y después. Nunca más de dos `npm test` a la vez. Las
notas, en UTF-8 y CRLF.

Las marcas C-n citan un cambio de la spec (`notes.md`).

Archivo compartido, en olas distintas: `gallery/.storybook/preview.ts`, T-1 y T-2.

- [x] **T-1 — El código de uso, a 4.5:1 (C-5)**
  Cubre: regla 7; hace posible RF-2
  Archivos: `gallery/lib/astro-code.css`, `gallery/.storybook/preview.ts` (su import),
  `tests/gallery-astro-code.test.ts`
  Hecho cuando:
  - En Edge, cada texto del código de uso de las 6 historias Astro da ≥ 4.5:1, en los dos temas.
  - `value:` y `label:` de RadioGroup y Select dejan de medir 3.55:1 en claro.
  - El copiado exacto y el resaltado siguen como están en `gallery-astro-code.test.ts`.
  - El coordinator aprueba las capturas de `RadioGroup/Astro` y `Select/Astro` en los dos temas
    antes del commit (trabajo visual).
  Inyección: quitar el import de la hoja pone en rojo `gallery-astro-code.test.ts` en RadioGroup y
  Select, en claro, con 3.55:1.
  Nota: hecha. La causa era `opacity: 0.7` del token namespace, no solo el color: la hoja fija `pre .token.namespace { color: inherit !important; opacity: 1 !important }` (el resaltado pinta en línea). `value:`/`label:` en claro 3.55 → 12.75:1, en oscuro 5.66 → 11.00:1; el test mide el color efectivo con opacidad. Tests 1311 → 1323. Capturas aprobadas por el dueño («Apruebo y commitea»).

- [x] **T-2 — El addon, una violación rompe `npm test`**
  Cubre: RF-1, RF-2, RF-4, RF-5 (el registro)
  Archivos: `gallery/package.json`, `package-lock.json`, `gallery/.storybook/main.ts`,
  `gallery/.storybook/preview.ts`, `gallery/lib/a11y-exceptions.ts`, `tests/addon-a11y.test.ts`
  Hecho cuando:
  - Lo primero: repetir la medida del plan con el proyecto `stories`, y anotar la tabla en
    `notes.md`. Si sale una violación en un componente, parar y avisar: es un hallazgo para otra
    spec.
  - `npm test` termina en 0, con axe en las 12 historias.
  - Una historia con un input sin etiqueta pone `npm test` en distinto de 0, con la regla y la
    historia.
  - El test falla si la versión del addon no es la de `storybook`.
  - El test falla si `preview.ts` desactiva una regla fuera de `a11yExceptions`, o una excepción no
    tiene motivo.
  - `gallery-toolbar.test.ts` sigue en verde con el simulador de visión en la barra.
  Inyección: un input sin etiqueta en una historia pone `npm test` en rojo; desactivar
  `color-contrast` en `preview.ts` pone en rojo RF-4.
  Nota: hecha. Medida con el proyecto `stories`: 0 violaciones en las 12 historias, sin hallazgos de componentes; excepciones: solo `region`. Las 4 inyecciones se vieron en rojo y se revirtieron (detalle en `notes.md`). Tests 1323 → 1330.

- [x] **T-3 — Axe en los dos temas**
  Cubre: RF-3
  Archivos: `gallery/vitest.config.ts` (RF-3 se prueba con una ejecución real)
  Hecho cuando:
  - `npm test` ejecuta 24 tests de historia: 12 por tema.
  - Cada proyecto pinta con su tema: el lienzo lleva su `data-theme`.
  - Una historia con texto ilegible solo en oscuro pone `npm test` en distinto de 0, y en el
    proyecto `stories-dark`.
  - El RF-6 de la 015 sigue: los dos proyectos comparten el lock del mismo proceso.
  Inyección: la historia con texto ilegible solo en oscuro se ve en rojo en `stories-dark` y en
  verde en `stories-light`; con los dos proyectos en claro, deja de verse en rojo, y eso prueba la
  pasada.
  Nota: hecha. Dos proyectos, `stories-light` y `stories-dark`: 24 tests de historia, 12 por tema. Desvío: un archivo de configuración de Vitest solo puede exportar un proyecto, así que el oscuro vive en `gallery/vitest.dark.config.ts` (importa el constructor `themed` de `gallery/vitest.config.ts`) y se añade a `projects` en `vitest.config.ts`. Inyecciones vistas en rojo y revertidas (`notes.md`).

- [x] **T-4 — El panel y la medida final (C-2 de la 015)**
  Cubre: RF-5, NFR
  Archivos: `specs/016-addon-a11y/notes.md` (sección «Después»)
  Hecho cuando:
  - Desde `npm run gallery`, en Edge, el panel «Accessibility» da 0 violaciones en las 12 historias,
    en los dos temas.
  - Con el método de la T-8 de la 017, se anotan la mediana de `npm test`, lo que suma respecto de
    la base de la 015 y si cumple ≤ 15 s (C-4) y el límite de 150 s. Si no cumple alguno, se dice
    cuánto falta y dónde.
  Inyección: un input sin etiqueta en una historia sale como violación en el panel.
  Nota: hecha, con veredicto negativo en la medida. Panel: 0 violaciones en las 12 historias y los dos temas (24 combinaciones); el input sin etiqueta sale como 1 violación en los dos temas (historia temporal borrada). Medida (`notes.md`, «Después»): mediana de P1 a P3 = 184.2 s contra la base de la 015 (162.4 s): +21.8 s, **no cumple ≤ 15 s** (faltan 6.8 s); y **no cumple ≤ 170 s** (sobran 14.2 s; el límite de 150 s de la tarea lo subió el dueño a 170 s en la 015). Solo 1 de 6 pasadas (166.8 s) cumple los dos. 4 de 6 salieron con 1 por el `afterAll` de `gallery-i18n.test.ts` (cierre de Edge, `Hook timed out in 30000ms`) con todos los tests en verde. Decide el dueño.
  T-5: el fallo de salida está arreglado (todas las pasadas posteriores terminan en 0); el veredicto de duración sigue sin cumplirse (188.9 s en la serie final).

- [x] **T-5 — El cierre de Edge en `gallery-i18n`**
  Cubre: el NFR de duración (C-4 y ≤ 170 s) y «`npm test` termina en 0»
  Archivos: `tests/gallery-i18n.test.ts`, `tests/gallery-i18n-edge.test.ts`, `tests/lib/route.ts`,
  `tests/route.test.ts`,
  `specs/016-addon-a11y/notes.md` (sección «Después (T-5)»)
  Hecho cuando:
  - `gallery-i18n.test.ts` lanza un solo Edge y un solo servidor por archivo, no uno por componente.
  - Tres pasadas de `npm test` con el método de la 015 terminan en 0, sin `Hook timed out`.
  - Se anotan los totales, la mediana y el veredicto contra ≤ 15 s sobre 162.4 s y contra ≤ 170 s.
  - No cambia ningún `hookTimeout` ni `testTimeout` (fuera de alcance).
  Inyección: devolver el `chromium.launch` al interior del `describe.each` pone en rojo
  `gallery-i18n-edge.test.ts`.
  Nota: hecha. Causa: `browser.close()` de Edge tarda hasta 24 s con la suite entera en marcha (0.3 s solo), y `gallery-i18n` lo hacía 6 veces (67 de sus 99 s); no había nada sin cerrar. Arreglo: un Edge y un servidor por archivo; sin tocar timeouts. Un segundo fallo, `route.fetch: Request context disposed`, se añadió a `untilClosed`. Ambos con test visto en rojo. 8 pasadas sin un solo `Hook timed out`; salida 0 en las 4 de la serie final. Duración (`notes.md`, «Después (T-5)»): mediana 188.9 s, +26.5 s sobre 162.4 s y 18.9 s sobre 170 s: **no cumple ninguno**; una serie anterior dio 170.8 s (+8.4 s; 0.8 s sobre 170), y la máquina deriva 18 s entre series. Decide el dueño. Tests 1345 → 1347.

## Grafo de olas

| Ola | Tareas | Por qué esperan |
|---|---|---|
| 1 | T-1 | La 015 implementada; `preview.ts`. |
| 2 | T-2 | Sin la T-1, RF-2 está en rojo por las 114 violaciones; `preview.ts`. |
| 3 | T-3 | El addon (T-2). |
| 4 | T-4 | Todo lo anterior, sin otra carga. |
