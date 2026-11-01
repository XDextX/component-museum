# Spec 014 — select

**Status:** implemented · **Approved:** 2026-10-24 · el coordinator en modo autónomo, con las 7 decisiones recomendadas del clarify (`notes.md`)
**Implemented:** 2026-10-31 · 4 tareas en 3 olas y una ronda de arreglos; tests 1104 → 1286; validada por el reviewer en 2 vueltas; sin comprobar: la lista nativa abierta; cierre aprobado por el dueño («Sí, ciérrala»)
**Size:** L (16 RF) · **Entrega:** 4 (cierra con esta) · **Depende de:** 013

## Contexto y objetivo

Última spec de componente de la entrega 4 (`specs/009-input/notes.md`). **Select** sirve para
elegir una opción entre muchas. Es el `<select>` **nativo**: un listbox propio necesitaría
JavaScript en Astro, y el teclado, el lector de pantalla y el móvil los da el navegador.

Hereda de la 009 a la 013:
- etiqueta, ayuda y error dentro, con el ayudante de campo y la superficie propia;
- `id` deterministas y contraste contra el fondo real;
- el tema solo si la página lo pide (011);
- las opciones como dato (`options`, el tipo de la 013);
- `defaultValue` como estado inicial;
- colores forzados con su RF.

Se ve como Input del mismo `size`: misma altura, borde y superficie, más una flecha dibujada con un
token. `size` es `sm`, `md` o `lg` (por defecto `md`); `disabled` y `required`, falsos por defecto.

## Definiciones

- **Opción** — un `{ value, label, disabled? }` de `options`: un `<option>`.
- **Indicación** (`placeholder`) — una primera opción vacía y no elegible, que pide elegir.
- **Flecha** — el signo que dice que el control se despliega.
- **Campo, ayuda, error, tema** — como en la 009 y la 011.

## Historias de usuario

- US-1: Como consumidor, quiero un Select con su etiqueta, su ayuda y su error a partir de una
  lista, sin cablear `id` ni ARIA.
- US-2: Como usuario, quiero elegir con el teclado o con el selector nativo de mi móvil.

## Requisitos (EARS)

- RF-1: EL SISTEMA define Select en un contrato con `label` y `options` obligatorias, y el resto con
  su default. — **Check:** el test de contrato falla si un paquete declara Select con otra API.
- RF-2: EL SISTEMA da al control como nombre accesible el texto de `label`. — **Check:** en Edge, en
  los dos frameworks, el control se encuentra por su etiqueta y pulsar la etiqueta lo enfoca.
- RF-3: CUANDO `hint` no está vacío, EL SISTEMA lo da como descripción accesible del control. —
  **Check:** en Edge, la descripción accesible contiene `hint`.
- RF-4: CUANDO `error` no está vacío, EL SISTEMA marca el control inválido y añade el error a su
  descripción. — **Check:** en Edge, `aria-invalid="true"` y la descripción contiene `error`.
- RF-5: SI `error` está vacío, ENTONCES EL SISTEMA no marca el control inválido ni pinta un error. —
  **Check:** en Edge, sin `aria-invalid` ni texto de error.
- RF-6: CUANDO `required` es verdadero, EL SISTEMA marca el control obligatorio y lo indica en la
  etiqueta. — **Check:** en Edge, el formulario no se envía con la indicación, y hay marcador.
- RF-7: EL SISTEMA pinta las opciones de `options` en su orden, con su valor y su texto. —
  **Check:** en Edge, los `<option>` coinciden uno a uno, y uno `disabled` no se puede elegir.
- RF-8: CUANDO `defaultValue` nombra una opción, EL SISTEMA la muestra elegida al principio. —
  **Check:** en Edge, en los dos frameworks, el valor del control es `defaultValue`.
- RF-9: MIENTRAS no hay `defaultValue`, EL SISTEMA muestra la indicación si la hay. — **Check:** en
  Edge, el control muestra el texto de `placeholder` con valor `""`, y no se puede volver a elegir.
- RF-10: EL SISTEMA pinta el borde del control con ≥ 3:1 contra el fondo real, en reposo y en error.
  — **Check:** un test en Edge lo mide en los tres modos de tema de la 011, en los dos frameworks.
- RF-11: EL SISTEMA pinta la flecha con ≥ 3:1 contra el fondo del control. — **Check:** un test en
  Edge mide el color de la flecha contra el fondo del control en los tres modos de tema.
- RF-12: EL SISTEMA pinta la etiqueta, el texto elegido, la indicación, la ayuda y el error con
  ≥ 4.5:1 contra el fondo real. — **Check:** un test en Edge mide cada texto en los tres modos.
- RF-13: EL SISTEMA da a Select y a Input del mismo `size` la misma altura. — **Check:** en Edge, en
  los tres `size`, las dos alturas coinciden y miden ≥ 24 px.
- RF-14: CUANDO el control tiene el foco, EL SISTEMA dibuja el anillo de la 003 a su alrededor. —
  **Check:** con `Tab`, el anillo da ≥ 3:1, y en error el borde de error sigue visible.
- RF-15: MIENTRAS el sistema fuerza los colores, EL SISTEMA mantiene visibles borde y flecha. —
  **Check:** en Edge con `forcedColors: 'active'`, el borde y la flecha difieren del fondo.
- RF-16: MIENTRAS el control tiene el foco, EL SISTEMA cambia la opción con las flechas del teclado.
  — **Check:** en Edge, `ArrowDown` elige la siguiente opción elegible; un `disabled` no se enfoca.

## Requisitos no funcionales

- **Accesibilidad (regla 7):** el `<select>` nativo, con su rol, su teclado y su selector de móvil.
- **Galería (regla 5)**, con casos Astro de opciones, indicación, ayuda, error y selección, y
  **regla 2**: como en la 013. Lleva sus archivos de test por componente (017).
- **Sin JavaScript propio en Astro**, con los eventos nativos. **Dependencias (regla 9):** ninguna.

## Casos límite

- **`options` vacío:** el control se pinta sin opciones, o solo con la indicación (RF-7).
- **`defaultValue` que no está en `options`:** se comporta como si no lo hubiera (RF-9).
- **`defaultValue` y `placeholder` a la vez:** manda `defaultValue` (RF-8).
- **Texto de una opción más ancho que el control:** se corta con puntos suspensivos sin ensanchar
  el campo, y el texto completo sigue en la lista desplegada (RF-12).
- **`hint` y `error` a la vez:** el error va primero (RF-3, RF-4).

## Fuera de alcance

- Selección múltiple (`multiple`), grupos de opciones (`optgroup`), búsqueda y un listbox propio.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-16, tests vistos en rojo una vez con su inyección (regla 8).
- Historia y documentación abiertas en `npm run gallery`, en los dos temas y lenguas.

## Preguntas abiertas

Ninguna (resueltas por el planner en modo autónomo, con la recomendación: `notes.md`).
