# Notas de la 010 — textarea

## Qué se hereda de la 009, sin cambiarlo

- El marcado del campo: `.museum-field`, `__label`, `__required`, `__hint` y `__error`, con el error
  antes que la ayuda en `aria-describedby`.
- La superficie propia del campo y su `padding` igual al alcance del anillo (corrección de la
  validación de la 009, regla 7).
- Los tokens de control y de campo (`--museum-control-*`, `--museum-field-*`).
- `id` deterministas en Astro, con un contador en `globalThis` y no `Math.random()`.
- Las clases de ejemplo, de la fuente única `gallery/lib/example-classes.ts`, con una entrada
  `Textarea` propia (corrección de la ola 2 de la 009).
- Los tests de accesibilidad miden contra el fondo real compuesto, sin sustituirlo.

## Decisiones (2026-10-23, decididas por el coordinator en modo autónomo)

- `rows` es un atributo HTML que pasa al control, sin prop en el contrato.
- `resize` fijo en vertical, sin prop (RF-10).
- Texto inicial con `value` en los dos frameworks: en React, el atributo nativo, que el consumidor
  controla como en cualquier input; en Astro, escapado y respetando los saltos de línea (RF-11).

## Preguntas de diseño que se hicieron, con la recomendación tomada

1. **`rows`.** Recomendado: atributo HTML que pasa al `<textarea>`, como `placeholder`, sin prop
   en el contrato. Así el formato del contrato no necesita un tipo numérico, que no existe, y el
   navegador ya resuelve el valor por defecto (2 filas). La alternativa sería una prop `rows` en el
   contrato con un tipo `number` nuevo: un control en la galería, a cambio de ampliar el formato y
   sus tests.
2. **`resize`.** Recomendado: fijo en `vertical` (RF-10), sin prop. El ancho lo decide la página; un
   `resize` horizontal desborda a 320 px. El consumidor puede cambiarlo con su clase. La alternativa
   sería una prop `resize` (`none`/`vertical`/`both`) en el contrato: API que nadie ha pedido.
3. **Texto inicial.** Recomendado: `value` en los dos frameworks (RF-11).
   - En React, `value` y `defaultValue` son los nativos.
   - En Astro, el `value` que recibe se escribe como contenido del `<textarea>`, escapado.
   - La alternativa, contenido (`children` o slot), choca con React, donde `children` en un
     `<textarea>` está desaconsejado y avisa. Daría dos API distintas (regla 4).

## Menores decididos por el planner (opción conservadora)

- Sin `type`: el contrato es el de Input menos `type`, con las mismas props de campo.
- La altura no se iguala con Button (un campo multilínea no va en fila con botones). RF-9 iguala
  el aspecto con Input del mismo `size`.
- La clase y los atributos HTML van al `<textarea>`, como en Input van al `<input>`.

## A qué entrega pertenece

Entrega 4 (009–013), decidida en la 009. La rama `spec/010-textarea` sale de `spec/009-input`, que
aún no está en `main` (`AGENTS.md`).

## Para el plan

- **El campo, en un sitio.** La lógica de campo de Input (los `id`, `aria-describedby` y el
  marcado) está escrita dentro de cada `Input`. Con un segundo control, conviene sacarla a un
  ayudante interno no exportado en cada paquete (`notes.md` de la 009), sin cambiar el marcado.
  Lo vigilan los tests de marcado de la 009.
- **Contador de Astro:** uno por componente (`museum-textarea-<n>`) o compartido con Input; los
  prefijos ya los hacen únicos.
- **Casos Astro** (`astroCases` sin `variant`): `default`, 2 de `size`, `hint`, `error`,
  `disabled`, `required` (7).
- **RF-11 en Astro:** comprobar que el contenido se escapa (`<` y `&`) y que se respetan los saltos
  de línea.
- Clarify, ronda 2: React con `value` sin `onChange` es de solo lectura, como en React nativo; se
  documenta y `defaultValue` da el texto editable. No se añade `onChange` propio.
