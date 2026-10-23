# Spec 009 — input

**Status:** approved · **Approved:** 2026-10-23 · el coordinator en modo autónomo («entra en modo autonomo»), tras 2 rondas de clarify
**Size:** L (10 RF) · **Entrega:** 4 (009–013, los indispensables de un formulario; abre con esta) ·
**Depende de:** 008

## Contexto y objetivo

El dueño pide los componentes indispensables para un formulario, una spec por componente
(`notes.md`: lista, orden y entrega). Solo existe Button. Esta spec añade **Input**, el campo de una
línea, en React y en Astro con el mismo contrato. Fija también el patrón de campo que heredan
Textarea, Checkbox, RadioGroup y Select: etiqueta, ayuda y error van dentro de cada control, no
en un componente aparte, porque Astro no puede asociar la etiqueta a un control recibido por slot
(`notes.md`). En `legacy`, esa asociación faltaba. `type` admite `text`, `email`, `password`,
`search`, `tel`, `url` y `number` (por defecto `text`); `size`, `sm`, `md` y `lg` (por defecto
`md`), como Button; `disabled` y `required`, falsos por defecto; `label` siempre es visible.

## Definiciones

- **Campo** — el Input con su etiqueta, su ayuda y su error.
- **Ayuda** (`hint`) — un texto fijo bajo el control que explica qué se espera.
- **Error** (`error`) — un texto que dice qué falla; si está vacío, el campo no está en error.
- **Contrato, prop de clase, consumidor externo, tema** — como en la 002 y la 003.

## Historias de usuario

- US-1: Como consumidor, quiero poner un Input con su etiqueta, su ayuda y su error en una línea,
  sin cablear `id` ni atributos ARIA.
- US-2: Como usuario de un lector de pantalla, quiero oír la etiqueta, la ayuda y el error del
  campo.

## Requisitos (EARS)

- RF-1: EL SISTEMA define Input en un contrato: `label` obligatoria; `hint`, `error`, `type`,
  `size`, `disabled` y `required` con su default. — **Check:** el test de contrato de la 002 acepta
  props de texto y falla si un paquete declara Input con otras props, tipos o defaults.
- RF-2: EL SISTEMA da al control como nombre accesible el texto de `label`. — **Check:** en Edge,
  en los dos frameworks, el control se encuentra por su etiqueta y pulsar la etiqueta lo enfoca.
- RF-3: CUANDO `hint` no está vacío, EL SISTEMA lo da como descripción accesible del control. —
  **Check:** en Edge, la descripción accesible del control contiene el texto de `hint`.
- RF-4: CUANDO `error` no está vacío, EL SISTEMA marca el control como inválido y añade el error a
  su descripción. — **Check:** en Edge, `aria-invalid="true"` y la descripción contiene `error`.
- RF-5: SI `error` está vacío, ENTONCES EL SISTEMA no marca el control como inválido ni pinta un
  error. — **Check:** en Edge, sin `aria-invalid` ni texto de error en el campo.
- RF-6: CUANDO `required` es verdadero, EL SISTEMA marca el control como obligatorio y lo indica en
  la etiqueta. — **Check:** en Edge, el control es `required` y la etiqueta muestra un marcador.
- RF-7: EL SISTEMA pinta el borde del control con un contraste ≥ 3:1 contra el fondo, en reposo y
  en error. — **Check:** un test en Edge lo mide en los dos temas.
- RF-8: EL SISTEMA pinta la etiqueta, la ayuda, el error, el valor y el placeholder con un contraste
  ≥ 4.5:1 contra el fondo. — **Check:** un test en Edge mide cada texto en los dos temas.
- RF-9: EL SISTEMA da a Input y a Button del mismo `size` la misma altura. — **Check:** en Edge,
  en los tres tamaños, las dos alturas coinciden.
- RF-10: EL SISTEMA documenta Input en la galería como Button. — **Check:** los tests de la galería
  (regla 5, idiomas, matriz, snippets) recorren cada contrato, no solo Button, y fallan sin Input.

## Requisitos no funcionales

- **Accesibilidad (regla 7).** Se alcanza con `Tab`, con el anillo de foco de la 003 (≥ 3:1 en
  los dos temas). Un control `disabled` no recibe el foco. El error no se distingue solo por color
  (WCAG 1.4.1): RF-4 da su texto.
- **Instalar y usar (regla 2).** Un consumidor externo de cada framework compila con un Input, sin
  configuración nueva.
- **Sin JavaScript propio en Astro.** El control es el `input` nativo; los eventos `input` y
  `change` son los del navegador, en los dos frameworks.
- **Dependencias (regla 9).** Ninguna nueva.
- **Idiomas (regla 10).** La historia y su documentación, en español y en inglés.

## Casos límite

- **Dos Input con la misma etiqueta en una página:** cada etiqueta enfoca su control (RF-2).
- **El consumidor pasa su propio `id` o su `aria-describedby`:** se respetan y se suman a los del
  componente (RF-2, RF-3).
- **`hint` y `error` a la vez:** los dos forman parte de la descripción, el error primero (RF-3,
  RF-4).
- **Un error largo:** se parte en varias líneas sin ensanchar el campo desde 320 px (RF-10).
- **`disabled` con `error`:** dice el error, y su texto mantiene el contraste (RF-4, RF-8).
- **Atributos HTML** (`name`, `value`, `placeholder`, `autocomplete`…): pasan al `input`, como en
  Button (002, RF-11).

## Fuera de alcance

- Variantes de aspecto (`outline`, `filled`, `underline` de `legacy`) y estados `success` o
  `warning`.
- Etiqueta oculta a la vista, prefijos, sufijos e iconos dentro del campo.
- Validación propia: el componente muestra el `error` que recibe; quién valida es el consumidor.
- `type` de fecha, archivo, color o rango, y los demás componentes de la lista (010–013).

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-10 son tests vistos en rojo una vez inyectando su violación
  (regla 8).
- La historia de Input se abrió desde `npm run gallery`, en los dos temas y en los dos idiomas.

## Preguntas abiertas

Ninguna.
