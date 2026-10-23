# Spec 010 — textarea

**Status:** implemented · **Approved:** 2026-10-23 · el coordinator en modo autónomo, tras 2 rondas de clarify
**Implemented:** 2026-10-23 · 4 tareas en 3 olas con worktrees, más el arreglo del conteo de Tab del test de Button; validada por el reviewer en 1 vuelta; `npm test` 550/550 (+1 omitido)
**Size:** L (11 RF) · **Entrega:** 4 (009–013, formulario) · **Depende de:** 009

## Contexto y objetivo

Segunda spec de la entrega 4 (`specs/009-input/notes.md`: lista y orden). **Textarea** es el campo
de varias líneas, para mensajes y comentarios. Hereda el patrón de campo de la 009 sin cambiarlo:
- `label`, `hint` y `error` dentro del control, con los mismos nombres y reglas;
- el campo pinta su propia superficie;
- los mismos tokens de control;
- el formato de contrato con props de texto y los tests de galería que ya recorren cada contrato.

Lo propio de Textarea: no tiene `type`; cambia de tamaño solo en vertical; y su texto inicial es
el `value` que recibe en los dos frameworks (en HTML, un `<textarea>` toma su texto del contenido,
no de un atributo). `size` es `sm`, `md` o `lg` (por defecto `md`); `disabled` y `required` son
falsos por defecto; `label` siempre es visible.

## Definiciones

- **Campo, ayuda, error** — como en la 009, con Textarea en lugar de Input.
- **Contrato, prop de clase, consumidor externo, tema** — como en la 002 y la 003.

## Historias de usuario

- US-1: Como consumidor, quiero un Textarea que se use y se vea como Input, con su etiqueta, su
  ayuda y su error, sin cablear `id` ni ARIA.
- US-2: Como usuario, quiero agrandar el campo para leer lo que escribo sin romper la página.

## Requisitos (EARS)

- RF-1: EL SISTEMA define Textarea en un contrato: `label` obligatoria; `hint`, `error`, `size`,
  `disabled` y `required` con su default. — **Check:** el test de contrato de la 002 falla si un
  paquete declara Textarea con otras props, tipos o defaults.
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
- RF-7: EL SISTEMA pinta el borde del control con un contraste ≥ 3:1 contra el fondo real, en reposo
  y en error. — **Check:** un test en Edge lo mide en los dos temas, en los dos frameworks.
- RF-8: EL SISTEMA pinta la etiqueta, la ayuda, el error, el texto y el placeholder con ≥ 4.5:1
  contra el fondo real. — **Check:** un test en Edge mide cada texto en los dos temas.
- RF-9: EL SISTEMA da a Textarea el mismo aspecto de campo que Input del mismo `size`. — **Check:**
  en Edge, la fuente, el borde, el radio, el `padding` y los colores del campo coinciden.
- RF-10: EL SISTEMA deja cambiar el tamaño del control solo en vertical. — **Check:** en Edge, el
  `resize` calculado del control es `vertical` en los dos frameworks.
- RF-11: CUANDO el consumidor pasa `value`, EL SISTEMA lo muestra como texto inicial del control. —
  **Check:** en Edge, el valor del control es ese texto, en los dos frameworks.

## Requisitos no funcionales

- **Accesibilidad (regla 7).** Se alcanza con `Tab`, con el anillo de foco de la 003 (≥ 3:1). Un
  control `disabled` no recibe el foco. El error no se distingue solo por color.
- **Galería (regla 5).** Página de documentación, historia React con controles y casos Astro con su
  código, en español y en inglés (regla 10), cubiertos por los tests de galería de la 009.
- **Instalar y usar (regla 2).** Un consumidor externo de cada framework compila con un Textarea.
- **Sin JavaScript propio en Astro**, con los eventos nativos. **Dependencias (regla 9):** ninguna.

## Casos límite

- **Dos Textarea con la misma etiqueta, o un Textarea y un Input en la misma página:** cada
  etiqueta enfoca su control, con `id` distintos (RF-2).
- **El consumidor pasa su propio `id` o su `aria-describedby`:** se respetan y se suman a los del
  componente, el error primero (RF-2 a RF-4).
- **`disabled` con `error`:** dice el error, y su texto mantiene el contraste (RF-4, RF-8).
- **Un texto o un error largo:** se parten en líneas sin ensanchar el campo desde 320 px (test de
  desborde de la galería, 007).
- **`value` con saltos de línea o con `<` y `&`:** se muestran tal cual, sin interpretarse como HTML
  (RF-11).
- **React con `value` sin `onChange`:** el control queda de solo lectura, como cualquier
  `<textarea>` de React; `defaultValue` da un texto inicial editable (RF-11).
- **Atributos HTML** (`name`, `rows`, `placeholder`, `maxlength`…): pasan al `<textarea>`, como en
  Input.

## Fuera de alcance

- Crecer solo con el texto (auto-resize), contador de caracteres y redimensión horizontal.
- Lo que la 009 dejó fuera: variantes de aspecto, etiqueta oculta, validación propia.
- Cambiar Input o el patrón de campo: si hace falta, es otra spec.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-11 son tests vistos en rojo una vez inyectando su violación
  (regla 8).
- La historia y la documentación de Textarea se abrieron desde `npm run gallery`, en los dos temas
  y en los dos idiomas.

## Preguntas abiertas

Ninguna.
