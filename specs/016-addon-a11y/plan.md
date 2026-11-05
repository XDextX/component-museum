# Plan 016 — addon-a11y

Parte de `spec.md` (aprobada por el dueño, 5 RF: una violación rompe `npm test`), de `notes.md` y
del plan de la 015, de la que depende: usa su proyecto `stories`. La sección «Revisión del
2026-11-01» de `notes.md` recoge un cambio a la spec, ya aplicado (C-5), y una nota (C-6).

**Medido el 2026-11-01:** axe 4.14.0 sobre las 12 historias de `gallery/storybook-static`, en Edge,
con las etiquetas por defecto del addon y `region` desactivada, en los temas claro y oscuro:

| Resultado | Dónde | Detalle |
|---|---|---|
| **114 violaciones `color-contrast`** | `RadioGroup/Astro` (54) y `Select/Astro` (60), solo en claro | `#f14d4d` sobre `#ffffff` = **3.55:1**, en `<span class="token tag attr-name namespace">label:</span>` |
| 0 violaciones | Las otras 10 historias, y las 12 en oscuro | — |
| «Incompletos» | La `legend` de RadioGroup y el `<select>` de Select | Fondo que axe no decide (texto solapado y degradado). No rompen; ya los mide `field-a11y` (013 y 014). |

**La causa está en la galería, no en un componente.** El bloque de código resalta como HTML el
`options={[{ value: 'a', label: … }]}` del código de uso, y Storybook pinta `value:` y `label:` con
el color de un espacio de nombres. Los tests de Edge no lo veían: `gallery-story-theme` mide todo el
texto solo en las historias de Button (`storyIds`).

Esta medida es sobre el Storybook construido; el proyecto `stories` pinta sus historias de otra
forma, y la T-2 repite la medida ahí.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | La dependencia y `tests/addon-a11y.test.ts` (T-2). |
| RF-2 | `parameters.a11y.test: 'error'` en `preview.ts`, sobre el proyecto `stories` (T-2). |
| RF-3 | Dos proyectos, `stories-light` y `stories-dark`, con `initialGlobals` (T-3). |
| RF-4 | `gallery/lib/a11y-exceptions.ts`, leído por `preview.ts`, y su test (T-2). |
| RF-5 | El addon en `main.ts` (T-2); el panel, abierto en la validación (T-4, según C-2 de la 015). |
| Violaciones de hoy | El contraste del código de uso (T-1, según C-5). |

## 2. Archivos

| Archivo | Nuevo | Responsabilidad | Tarea |
|---|---|---|---|
| `gallery/lib/astro-code.css` | sí | El color del token que no llega a 4.5:1 en el código de uso. | T-1 |
| `gallery/.storybook/preview.ts` | mod. | Importa esa hoja (T-1); `a11y.test: 'error'` y las excepciones (T-2). | T-1, T-2 |
| `tests/gallery-astro-code.test.ts` | mod. | Cada token del código de uso de cada historia Astro da ≥ 4.5:1, en los dos temas. | T-1 |
| `gallery/package.json`, `package-lock.json`, `gallery/.storybook/main.ts` | mod. | La dependencia y el addon. | T-2 |
| `gallery/lib/a11y-exceptions.ts` | sí | La lista de reglas desactivadas, cada una con su motivo; la primera, `region`. | T-2 |
| `tests/addon-a11y.test.ts` | sí | RF-1 y RF-4. | T-2 |
| `gallery/vitest.config.ts` | mod. | Una pasada por tema. | T-3 |
| `specs/016-addon-a11y/notes.md` | mod. | Medida final y prueba del panel. | T-4 |

**Archivos compartidos:** `preview.ts` lo tocan la T-1 y la T-2, en olas distintas.

## 3. Lógica pura

```ts
// gallery/lib/a11y-exceptions.ts
export const a11yExceptions: { rule: string; reason: string }[] = [
  { rule: 'region', reason: 'Una historia es un fragmento, sin regiones de página; el addon ya la
  desactiva.' },
];
```
`preview.ts` construye `a11y.config.rules` desde esa lista. El test compara una con otra, y falla si
una regla no tiene motivo.

## 4. Algoritmo

**El contraste del código (T-1, según C-5):**
- Una regla de `gallery/lib/astro-code.css`, que `preview.ts` importa, para que valga en el
  Storybook construido y en el proyecto `stories`:
  ```css
  /* Spec 016: Storybook paints a namespace token at 3.55:1 on white; here it is a JS key, not a namespace. */
  .token.namespace { color: inherit; opacity: 1; }
  ```
  Si los estilos de Storybook le ganan por especificidad, la T-1 sube la del selector; el test lo
  dirá.
- El resaltado de lenguaje no cambia: pasar a `tsx` cambiaría el aspecto de los 6 componentes por
  una sola clase de token.
- `gallery-astro-code.test.ts` mide con `visibleTexts` cada texto del código, en cada historia Astro
  y en los dos temas. Así queda una guarda que no depende de axe.

**El addon (T-2):**
- `parameters: { a11y: { test: 'error', config: { rules: … } } }` en `preview.ts`.
- El contexto es el de por defecto (`body`), y los «incompletos» no rompen, como dice la spec.
- Lo primero de la T-2: repetir la tabla de arriba con el proyecto `stories`. Si salen violaciones
  nuevas (por ejemplo, porque no carga `preview-head.html`), se anotan: una de la galería se
  arregla, y una de un componente es un hallazgo para otra spec, y para la tarea.

**Dos pasadas (T-3):** `gallery/vitest.config.ts` define dos proyectos con la misma configuración y
`storybookTest({ initialGlobals: { theme: 'light' | 'dark' } })`. El decorador ya lee ese global.

## 5. Interfaz

- **Código de uso de RadioGroup y Select:** `value:` y `label:` con el color del texto del bloque,
  en lugar del rojo. Un cambio visible, pequeño, que el coordinator ve en capturas.
- **`npm test`:** una violación da distinto de 0, con la regla, el elemento y la historia.
- **`npm run gallery`:** una pestaña «Accessibility» en el panel, y el simulador de visión que trae
  el addon en la barra (no se oculta; la 007 quitó otros cuatro botones concretos).

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **Arreglar el token en la galería.** | Añadir `color-contrast` a las excepciones: desactivaría la regla en toda historia, y la regla 7 no lo admite. `context.exclude` del bloque de código: dejaría 3.55:1 a la vista. |
| **Una hoja importada desde `preview.ts`.** | `preview-head.html`: el proyecto `stories` puede no cargarlo. |
| **Dos proyectos con `initialGlobals`.** | Una pasada en «Sistema»: solo vería un tema. |
| **La lista de excepciones como dato.** | Escribirlas en `preview.ts`: un test no podría exigir su motivo con la misma facilidad. |

**Dependencias (regla 9).** Motivo en la spec.

| Paquete | Versión | Lo que trae |
|---|---|---|
| `@storybook/addon-a11y` | 10.6.3, la instalada de `storybook` | `axe-core ^4.2.0` (hoy 4.14.0, MPL-2.0, 3.4 MB) y `@storybook/global` |

Es de desarrollo y de la galería: no llega a ningún paquete.

**Commits:** sin scope, citando la spec. Nada toca `packages/` ni `styles/`.

## 7. Estrategia de tests

- **Como dato:** la versión y la lista de excepciones (T-2).
- **De ejecución real:** una historia con un input sin etiqueta (T-2), y otra con texto ilegible
  solo en oscuro (T-3).
- **Sin aflojar:** los tests de contraste de Edge siguen iguales, y axe se suma.
- **Inyección por tarea:** su línea «Inyección:», en la rama del worktree.
- **Antes de reportar:** el build de `packages/react`, `npm run gallery:astro`, los dos `tsc` y
  `npm test`.
- **Carga:** nunca más de dos `npm test` a la vez; la T-4 mide sin otra carga.
- **Tiempo esperado, sin medir:** 24 tests de historia en lugar de 12, más axe por historia, a la
  vez que `e2e`. Espero **de 5 a 15 s** más que la base de la T-1 de la 015, contando ya esos 3 a 10
  s. Lo decide la T-4.
- **Proporción:** 4 tareas para 5 RF.
