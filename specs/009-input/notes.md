# Notas de la 009 — los indispensables de un formulario

## Decisiones (2026-10-22, decididas por el coordinator en modo autónomo)

- Entrega 4 = las cinco specs 009–013, publicadas juntas.
- Etiqueta, ayuda y error dentro de cada control, sin `Field` (Astro y regla 4).
- `label` siempre visible y obligatoria; la etiqueta oculta queda fuera de alcance.
- `type`: `text`, `email`, `password`, `search`, `tel`, `url`, `number`; `size`: `sm`, `md`, `lg`
  como Button, sin variantes de aspecto.

## Lista propuesta, en orden (una spec por componente)

| Orden | Spec | Componente | Por qué es indispensable | Por qué va en ese puesto |
|---|---|---|---|---|
| 1 | 009 | **Input** (`text`, `email`, `password`, `search`, `tel`, `url`, `number`) | Casi todo formulario pide un dato de una línea. | Fija el patrón de campo (etiqueta, ayuda, error) y los tokens del control que heredan todos los demás. |
| 2 | 010 | **Textarea** | Hay textos que no caben en una línea: mensajes y comentarios. | Reusa casi todo el patrón de la 009; sale barata justo detrás. |
| 3 | 011 | **Checkbox** | Para el sí/no, aceptar términos o suscribirse. | Otro maquetado: la etiqueta va a la derecha y el control es propio. |
| 4 | 012 | **RadioGroup** | Para elegir una sola opción entre pocas, a la vista. | Es la primera agrupación (`fieldset`/`legend`), y se apoya en el control de la 011. |
| 5 | 013 | **Select** (nativo) | Para elegir una opción entre muchas. | Es el último porque el nativo es el más simple de estilar y el que menos aporta sobre el HTML. |

Comparada con la lista del coordinator: es la misma, con dos ajustes.
- «Radio (grupo)» pasa a **RadioGroup**. Un radio suelto no sirve de nada: el contrato es el
  grupo, con su leyenda, su ayuda y su error.
- El **Select es nativo**. Un listbox propio exige teclado, lectores de pantalla y móvil, todo a
  mano, y eso no es indispensable.

**Fuera de la lista, como no indispensables:** Switch (lo cubre Checkbox), Combobox/Autocomplete,
DatePicker (lo cubre `type="date"` del navegador, si se pide), File, Slider, un `Fieldset`
genérico y un `Form` envoltorio (el `<form>` nativo basta). Button ya existe y sirve para enviar
(`type="submit"`).

## Etiqueta, ayuda y error: dentro de cada componente, no en un `Field` aparte

**Decisión propuesta:** cada control lleva sus props `label`, `hint` y `error`, con los mismos
nombres en todos los contratos. Comparten las reglas CSS de campo, sin un componente `Field`
exportado.

Por qué:
- **Astro no puede cablear un hijo de un slot.** Un `Field` necesitaría poner el `id` en el
  control que recibe en su slot, y Astro no tiene ni contexto ni `cloneElement`. El consumidor
  tendría que repetir el `id` a mano en dos sitios. Ese es justo el fallo de `legacy`:
  `FormField.astro` ponía `<label for={fieldId}>`, pero el `input` del slot nunca recibía ese
  `id`, así que la etiqueta no quedaba asociada.
- **Un contrato, muchos frameworks (regla 4).** En React, un `Field` con contexto funcionaría; en
  Astro, no. Las dos API acabarían siendo distintas.
- **Accesible por defecto (regla 7).** Si el componente genera el `id`, `aria-describedby` y
  `aria-invalid`, el consumidor no puede olvidarlos.

Coste que se acepta: la lógica de campo se repite en cinco componentes por dos frameworks. Se
mitiga así:
- en cada paquete, un ayudante interno no exportado;
- unas reglas CSS de campo comunes;
- un test que exige que `label`, `hint` y `error` tengan los mismos nombres y tipos en todos los
  contratos que los declaren.

Alternativa descartada: un `Field` exportado y cada control «desnudo». Es más flexible (se podría
envolver un control de terceros), pero en Astro deja la asociación en manos del consumidor.

## Lecciones de `legacy` (referencia, no fuente)

- `Input.astro`: `size`, `variant` (`outline`/`filled`/`underline`) y `state`
  (`success`/`error`/`warning`), con Tailwind. Aquí no hay `variant` (el campo tiene un único
  aspecto) ni `state`: el error es un texto, y no basta con un color (WCAG 1.4.1).
- Los `id` salían de `Math.random()`: no se pueden reproducir, y en React con SSR no casan entre
  servidor y cliente.
- `InputController.mts` añadía comportamiento en el cliente. Aquí el control es el `input`
  nativo, sin JavaScript propio en Astro.

## A qué entrega pertenece

Propuesta: la 009 abre la **entrega 4**, que reúne las cinco specs (009–013).
- La entrega 3 (007 y 008, solo galería) ya está en `main` (9c51a98) y no publica nada.
- Lo que el dueño pidió son los indispensables de **un formulario**. Con Input solo no se arma
  ninguno, así que se publican juntos cuando el kit entero cumpla la constitución.
- Coste: una cadena de cinco ramas antes de `main` y de npm.
- Alternativa descartada (ver Decisiones): entrega 4 = Input y Textarea (los campos de texto), y entrega 5 =
  Checkbox, RadioGroup y Select. Publica antes, con dos cadenas más cortas.

## Para el plan

- **Contrato.** Hoy el contrato tiene props con tipos `enum` y `boolean`; `label`, `hint` y
  `error` necesitan un tipo `string`, y `label` es obligatoria. Hay que ampliar el formato del
  contrato y su test de la 002.
- **Eventos.** Button declara `click`, y Astro lo emite como `museum:button:click`. Para Input
  bastan los eventos nativos `input` y `change`, que ya burbujean. Decidir cómo los declara el
  contrato sin inventar eventos propios.
- **`id`.** En React, `useId`; en Astro, un contador o un hash por render que no dependa de
  `Math.random`. Si el consumidor pasa su propio `id`, se usa ese, y su `aria-describedby` se suma
  al del componente.
- **Altura.** Input y Button del mismo `size` miden lo mismo, para que vayan juntos en una fila.
- **Tokens.** Borde del control, error y marcador de obligatorio, como `--museum-*`, en los dos
  temas.
