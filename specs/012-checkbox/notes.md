# Notas de la 012 — checkbox

## Qué se hereda de 009–011, sin cambiarlo

- `label`, `hint` y `error` dentro, con el error antes que la ayuda en `aria-describedby`.
- La superficie propia del campo, con su `padding` igual al alcance del anillo (009).
- El ayudante de campo por paquete (`packages/react/src/field.tsx`, `packages/astro/src/field.ts`,
  de la 010). Hoy pinta la etiqueta **antes** del control: Checkbox la necesita después. Es para el
  plan.
- `id` deterministas en Astro (contador en `globalThis`, nunca `Math.random()`).
- Las clases de ejemplo, de la fuente única `gallery/lib/example-classes.ts`, con una entrada
  `Checkbox` que añade la tarea dueña de la historia.
- Los casos Astro con ayuda y con error, más un caso marcado (regla 5).
- Los tests de accesibilidad miden contra el fondo real compuesto.
- El tema solo si la página lo pide (011).
- Las notas de los agentes, en UTF-8.

## Decisiones (2026-10-23, decididas por el coordinator en modo autónomo)

- Control dibujado con `appearance: none` sobre el checkbox nativo: borde y fondo de tokens, marca
  con `mask-image` pintada con un token; los colores forzados de Windows tienen su RF (RF-13).
- Prop booleana `defaultChecked` en el contrato (RF-1, RF-12); en React, `checked` y `onChange`
  siguen como atributos nativos.

## Preguntas de diseño que se hicieron, con la recomendación tomada

1. **¿Control dibujado o nativo?**
   - **Recomendado:** dibujado, con `appearance: none` sobre el `<input type="checkbox">` nativo.
     - El cuadro, su borde y su fondo salen de tokens `--museum-*` en los dos temas.
     - La marca es una `mask-image` con un SVG fijo, pintada con `background-color` de un token.
       Así la marca sigue al tema sin cambiar el SVG.
     - Ventajas: el borde y la marca se miden con estilos calculados (RF-7, RF-8), como el resto
       del museo, el tamaño sigue a `size`, y se ve igual en todos los navegadores.
     - El rol, el estado y el teclado siguen siendo los del nativo.
     - Coste: hay que cuidar los colores forzados de Windows (`@media (forced-colors: active)`,
       caso límite), y la marca es una regla más.
   - **Alternativa:** nativo con `accent-color`. Es menos código y respeta solo los colores
     forzados. Pero el borde del cuadro sin marcar lo dibuja el navegador: no se puede leer con
     estilos calculados, solo midiendo píxeles de una captura, y su tamaño y su color no siguen a
     los tokens.
2. **¿Cómo se pide el estado inicial?**
   - **Recomendado:** una prop `defaultChecked` booleana en el contrato, falsa por defecto.
     - Es el nombre exacto de lo que significa: en el DOM, `defaultChecked` refleja el atributo
       HTML `checked`. Así se llama igual en React y en Astro (regla 4).
     - Como está en el contrato, la galería genera un caso Astro marcado y un control en React, y
       se ve el estado marcado (regla 5).
     - Quien quiera un control controlado en React sigue teniendo los nativos `checked` y
       `onChange`, que pasan como atributos.
   - **Alternativa:** solo los atributos nativos (`checked` en Astro, `checked`/`defaultChecked` en
     React), como `value` en la 010. El contrato no lo nombra, así que `astroCases` no da ningún
     caso marcado, y la historia Astro no enseñaría el estado más importante del control.

## Menores decididos por el planner (opción conservadora)

- **`indeterminate` fuera de alcance.** No tiene atributo HTML: solo existe como propiedad del DOM
  y necesita JavaScript, que Astro no pone (NFR). Sirve sobre todo para «marcar todo» en listas, y
  no es indispensable para un formulario.
- **Zona de pulsación de 24 × 24 px**, el mínimo de WCAG 2.2 (2.5.8, AA). La constitución pide la
  2.1 AA, donde el objetivo táctil (2.5.5) es AAA y de 44 px. Se toma 24 px como mínimo razonable;
  la etiqueta, que también se pulsa, suele dar más.
- **`required`** es el nativo: el formulario no se envía sin marcar (términos), con el marcador `*`
  en la etiqueta.
- **`size`** cambia el tamaño del cuadro y de la letra de la etiqueta, como en Input. El cuadro mide
  `1em` de la letra de cada `size`, con un mínimo de 16 px.
- **Sin `type` ni `value` en el contrato:** `value` pasa como atributo (por defecto, `on`).

## A qué entrega pertenece

Entrega 4 (009–014). La rama `spec/012-checkbox` sale de `spec/011-tema-opcional`.

## Para el plan

- El ayudante de campo necesita una disposición en línea, con el control antes de la etiqueta y la
  ayuda y el error debajo, alineados con el texto de la etiqueta. Hay que ampliarlo sin cambiar el
  marcado de Input y Textarea, que vigilan sus tests de marcado.
- La etiqueta tiene que envolver el control o tener `for`. Si lo envuelve, la zona de pulsación es
  la caja de la etiqueta.
- Casos Astro (`astroCases` sin `variant`, con `defaultChecked` si se decide): `default`, 2 de
  `size`, `hint`, `error`, `disabled`, `required` y `defaultChecked` (8).
- Los colores forzados se emulan con `forcedColors: 'active'` en el contexto de Playwright.
- Tokens nuevos probables: el fondo del cuadro marcado y el color de la marca, en los tres bloques
  de tema (claro, `system` oscuro y `dark`).

## Clarify (2026-10-23, menores decididos por el planner)

- Caso límite nuevo: con error y con el foco, el borde de error sigue visible junto al anillo. Es el
  fallo que el coordinator vio en Input (candidato de pulido en `specs/011-tema-opcional/notes.md`),
  y aquí se evita desde el principio.
- RF-1 no nombra `defaultChecked`: si se decide la recomendación 2, el RF-1 lo añade a la lista de
  props.
