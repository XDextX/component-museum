# Spec 013 — radiogroup

**Status:** implemented · **Approved:** 2026-10-24 · el coordinator en modo autónomo, con las 7 decisiones recomendadas del clarify (`notes.md`)
**Implemented:** 2026-10-30 · 5 tareas en 4 olas; tests 913 → 1104; validada por el reviewer en 1 vuelta; cierre aprobado por el dueño («Sí, ciérrala y sigue»)
**Size:** L (16 RF) · **Entrega:** 4 (009–014) · **Depende de:** 017

## Contexto y objetivo

Quinta spec de componente de la entrega 4 (`specs/009-input/notes.md`). **RadioGroup** sirve para
elegir una opción entre pocas, todas a la vista. Hereda de la 009 a la 012:
- leyenda, ayuda y error dentro;
- la superficie propia del campo y el ayudante de campo de cada paquete;
- `id` deterministas y contraste medido contra el fondo real;
- tema solo si la página lo pide (011);
- control dibujado con tokens y colores forzados (012).

Lo propio de RadioGroup:
- es un **grupo**: la etiqueta es su leyenda, y cada opción tiene la suya;
- las opciones llegan como **dato** (`options`), porque Astro no puede cablear hijos de un slot;
- un `name` común, y la opción marcada al principio (`defaultValue`).

`size` es `sm`, `md` o `lg` (por defecto `md`); `disabled` y `required`, falsos por defecto.

## Definiciones

- **Grupo** — el conjunto con su leyenda (`label`), su ayuda y su error.
- **Opción** — un `{ value, label, disabled? }` de `options`: un radio con su etiqueta.
- **Círculo, punto** — el control visible de una opción, y su marca de seleccionada.
- **Zona de pulsación, campo, tema** — como en la 012.

## Historias de usuario

- US-1: Como consumidor, quiero un grupo de opciones con su leyenda, su ayuda y su error a partir de
  una lista, sin cablear `name`, `id` ni ARIA.
- US-2: Como usuario de teclado, quiero entrar en el grupo con un `Tab` y elegir con las flechas.

## Requisitos (EARS)

- RF-1: EL SISTEMA define RadioGroup en un contrato con `label`, `name` y `options` obligatorias, y
  el resto con su default. — **Check:** el test de contrato acepta `options` y falla ante otra API.
- RF-2: EL SISTEMA da al grupo como nombre accesible el texto de `label`. — **Check:** en Edge, en
  los dos frameworks, `getByRole('radiogroup', { name: label })` lo encuentra.
- RF-3: CUANDO el usuario pulsa la etiqueta de una opción, EL SISTEMA la selecciona. — **Check:** en
  Edge, cada opción se halla por su etiqueta, y pulsarla la marca y desmarca la anterior.
- RF-4: CUANDO `hint` no está vacío, EL SISTEMA lo da como descripción accesible del grupo. —
  **Check:** en Edge, la descripción accesible del grupo contiene `hint`.
- RF-5: CUANDO `error` no está vacío, EL SISTEMA marca el grupo inválido y añade el error a su
  descripción. — **Check:** en Edge, el grupo da `aria-invalid="true"` y su descripción, `error`.
- RF-6: SI `error` está vacío, ENTONCES EL SISTEMA no marca el grupo inválido ni pinta un error. —
  **Check:** en Edge, sin `aria-invalid` ni texto de error.
- RF-7: CUANDO `required` es verdadero, EL SISTEMA marca el grupo obligatorio y lo indica en la
  leyenda. — **Check:** en Edge, el formulario no se envía sin elegir, y la leyenda lleva marcador.
- RF-8: MIENTRAS el foco está en el grupo, EL SISTEMA mueve la selección con las flechas. —
  **Check:** en Edge, un `Tab` entra en el grupo una vez, y `ArrowDown` selecciona la siguiente.
- RF-9: CUANDO `defaultValue` nombra una opción, EL SISTEMA la pinta seleccionada al principio. —
  **Check:** en Edge, en los dos frameworks, esa opción empieza marcada y las demás no.
- RF-10: EL SISTEMA pinta el borde del círculo con ≥ 3:1 contra el fondo real, en reposo y en error.
  — **Check:** un test en Edge lo mide en los tres modos de tema de la 011, en los dos frameworks.
- RF-11: MIENTRAS una opción está seleccionada, EL SISTEMA pinta su punto con ≥ 3:1 contra el
  círculo. — **Check:** un test en Edge mide punto contra círculo y círculo contra fondo.
- RF-12: EL SISTEMA pinta la leyenda, las etiquetas, la ayuda y el error con ≥ 4.5:1 contra el fondo
  real. — **Check:** un test en Edge mide cada texto en los tres modos de tema.
- RF-13: EL SISTEMA da a cada opción una zona de pulsación de al menos 24 × 24 px. — **Check:** en
  Edge, en los tres `size`, la caja de su etiqueta con el control mide ≥ 24 px de ancho y de alto.
- RF-14: CUANDO una opción tiene el foco, EL SISTEMA dibuja el anillo de la 003 alrededor del
  círculo. — **Check:** con `Tab`, el anillo da ≥ 3:1, y en error el borde de error sigue visible.
- RF-15: MIENTRAS el sistema fuerza los colores, EL SISTEMA distingue la opción seleccionada. —
  **Check:** en Edge con `forcedColors: 'active'`, círculo y punto se ven y difieren de los demás.
- RF-16: CUANDO el grupo o una opción es `disabled`, EL SISTEMA no la deja enfocar ni seleccionar. —
  **Check:** en Edge, `Tab` y las flechas se la saltan, y pulsarla no cambia la selección.

## Requisitos no funcionales

- **Accesibilidad (regla 7):** radios nativos; el estado no depende solo del color.
- **Galería (regla 5)**, con casos Astro que muestran opciones, ayuda, error y selección, y **regla
  2**: como en la 012. Los archivos de test por componente de la 017 incluyen RadioGroup.
- **Sin JavaScript propio en Astro**, con los eventos nativos. **Dependencias (regla 9):** ninguna.

## Casos límite

- **`options` vacío:** pinta la leyenda sin opciones y no falla (RF-2).
- **`defaultValue` que no está en `options`:** ninguna empieza marcada (RF-9).
- **Dos grupos con el mismo `name`:** es del consumidor; los `id` siguen siendo distintos (RF-3).
- **`hint` y `error` a la vez:** el error va primero (RF-4, RF-5).
- **Etiqueta larga:** se parte en líneas junto al círculo (RF-13).
- **Atributos HTML:** van al grupo; `className`, al grupo (RF-1).
- **Opción con `value: ''`:** empieza marcada si no se pasa `defaultValue`, porque su valor por
  defecto también es `""`; es conocido y no se trata en esta spec (RF-9).

## Fuera de alcance

- Opciones con su propia ayuda, opciones en horizontal y un RadioGroup controlado en Astro.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-16, tests vistos en rojo una vez con su inyección (regla 8).
- Historia y documentación abiertas en `npm run gallery`, en los dos temas y lenguas.

## Preguntas abiertas

Ninguna (resueltas por el planner en modo autónomo, con la recomendación: `notes.md`).
