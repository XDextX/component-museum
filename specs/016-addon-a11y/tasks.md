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

- [ ] **T-1 — El código de uso, a 4.5:1 (C-5)**
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

- [ ] **T-2 — El addon, una violación rompe `npm test`**
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

- [ ] **T-3 — Axe en los dos temas**
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

- [ ] **T-4 — El panel y la medida final (C-2 de la 015)**
  Cubre: RF-5, NFR
  Archivos: `specs/016-addon-a11y/notes.md` (sección «Después»)
  Hecho cuando:
  - Desde `npm run gallery`, en Edge, el panel «Accessibility» da 0 violaciones en las 12 historias,
    en los dos temas.
  - Con el método de la T-8 de la 017, se anotan la mediana de `npm test`, lo que suma respecto de
    la base de la 015 y si cumple ≤ 15 s (C-4) y el 75 % de la 017. Si no cumple alguno, se dice
    cuánto falta y dónde.
  Inyección: un input sin etiqueta en una historia sale como violación en el panel.

## Grafo de olas

| Ola | Tareas | Por qué esperan |
|---|---|---|
| 1 | T-1 | La 015 implementada; `preview.ts`. |
| 2 | T-2 | Sin la T-1, RF-2 está en rojo por las 114 violaciones; `preview.ts`. |
| 3 | T-3 | El addon (T-2). |
| 4 | T-4 | Todo lo anterior, sin otra carga. |
