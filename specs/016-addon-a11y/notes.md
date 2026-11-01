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
