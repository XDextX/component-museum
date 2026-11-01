# Spec 012 — checkbox

**Status:** implemented · **Approved:** 2026-10-23 · el coordinator en modo autónomo: control dibujado (appearance: none) y prop defaultChecked
**Implemented:** 2026-10-23 · 4 tareas en 3 olas con worktrees, más 1 corrección (borde de error en colores forzados); validada por el reviewer en 2 vueltas; `npm test` 812/812 (+1 omitido)
**Size:** L (13 RF) · **Entrega:** 4 (009–014) · **Depende de:** 011

## Contexto y objetivo

Cuarta spec de la entrega 4 (`specs/009-input/notes.md`). **Checkbox** sirve para un sí o un no:
aceptar términos, suscribirse. Hereda el patrón de campo de la 009 a la 011:
- `label`, `hint` y `error` dentro;
- la superficie propia del campo y el ayudante de campo de cada paquete;
- `id` deterministas y contraste medido contra el fondo real;
- el tema solo si la página lo pide (`data-theme`).

Lo propio: la etiqueta va a la derecha del control y el control es un cuadro con marca. El estado
del cuadro y de la marca tiene que verse con contraste no textual en los dos temas, y el control
tiene que poder pulsarse cómodamente. `size` es `sm`, `md` o `lg` (por defecto `md`); `disabled`,
`required` y `defaultChecked`, falsos por defecto. El control es el checkbox nativo dibujado con
tokens (`notes.md`).

## Definiciones

- **Cuadro** — el control visible; **marca** — el signo que dice que está marcado.
- **Zona de pulsación** — la caja que, al pulsarla, cambia el estado: el control y su etiqueta.
- **Campo, ayuda, error, tema** — como en la 009 y la 011.

## Historias de usuario

- US-1: Como consumidor, quiero un Checkbox con su etiqueta, su ayuda y su error, sin cablear ARIA.
- US-2: Como usuario, quiero ver si está marcado en cualquier tema y pulsarlo sin apuntar al píxel.

## Requisitos (EARS)

- RF-1: EL SISTEMA define Checkbox en un contrato: `label` obligatoria; `hint`, `error`, `size`,
  `disabled`, `required` y `defaultChecked` con su default. — **Check:** el test de contrato falla
  ante otra API.
- RF-2: CUANDO el usuario pulsa la etiqueta, EL SISTEMA cambia el estado del control. —
  **Check:** en Edge, en los dos frameworks, se halla por su etiqueta y pulsarla lo marca.
- RF-3: CUANDO `hint` no está vacío, EL SISTEMA lo da como descripción accesible del control. —
  **Check:** en Edge, la descripción accesible contiene `hint`.
- RF-4: CUANDO `error` no está vacío, EL SISTEMA marca el control inválido y añade el error a su
  descripción. — **Check:** en Edge, `aria-invalid="true"` y la descripción contiene `error`.
- RF-5: SI `error` está vacío, ENTONCES EL SISTEMA no marca el control inválido ni pinta un error. —
  **Check:** en Edge, sin `aria-invalid` ni texto de error.
- RF-6: CUANDO `required` es verdadero, EL SISTEMA marca el control obligatorio y lo indica en la
  etiqueta. — **Check:** en Edge, el control es `required` y la etiqueta muestra un marcador.
- RF-7: EL SISTEMA pinta el borde del cuadro sin marcar con ≥ 3:1 contra el fondo real, en reposo y
  en error. — **Check:** un test en Edge lo mide en los dos temas y en los dos frameworks.
- RF-8: MIENTRAS el control está marcado, EL SISTEMA pinta la marca con ≥ 3:1 contra el cuadro. —
  **Check:** un test en Edge mide marca contra cuadro, y cuadro contra fondo, en los dos temas.
- RF-9: EL SISTEMA pinta la etiqueta, la ayuda y el error con ≥ 4.5:1 contra el fondo real. —
  **Check:** un test en Edge mide cada texto en los dos temas.
- RF-10: EL SISTEMA da a cada control una zona de pulsación de al menos 24 × 24 px. — **Check:** en
  Edge, en los tres `size`, la caja de la etiqueta con el control mide ≥ 24 px de ancho y de alto.
- RF-11: CUANDO el control tiene el foco, EL SISTEMA dibuja el anillo de la 003 alrededor del
  cuadro. — **Check:** en Edge, con `Tab`, el anillo da ≥ 3:1 y rodea el cuadro sin taparlo.
- RF-12: CUANDO `defaultChecked` es verdadero, EL SISTEMA pinta el control marcado desde el
  principio. — **Check:** en Edge, en los dos frameworks, empieza marcado y se desmarca al pulsarlo.
- RF-13: MIENTRAS el sistema fuerza los colores, EL SISTEMA distingue el control marcado del que no
  lo está. — **Check:** en Edge con `forcedColors: 'active'`, cuadro y marca se ven y difieren.

## Requisitos no funcionales

- **Accesibilidad (regla 7).** El control es un checkbox nativo para el lector de pantalla (rol,
  estado, `Space`); `disabled` no recibe el foco; el estado no depende solo del color.
- **Galería (regla 5)**, con un caso Astro marcado, y **regla 2**: como en la 009 y la 010.
- **Sin JavaScript propio en Astro**, con los eventos nativos. **Dependencias (regla 9):** ninguna.

## Casos límite

- **Etiqueta larga:** se parte en líneas a la derecha del cuadro, que queda arriba (RF-10).
- **Marcado y `disabled`:** la marca se ve, atenuada como el resto del control (RF-8).
- **Con error y con el foco:** el borde de error sigue visible junto al anillo (RF-7, RF-11).
- **Dos Checkbox con la misma etiqueta; `id` o `aria-describedby` del consumidor:** como en la 009
  (RF-2 a RF-4).
- **`hint` y `error` a la vez:** el error primero en la descripción (RF-3, RF-4).
- **Atributos HTML** (`name`, `value`…): pasan al control.

## Fuera de alcance

- El estado mixto (`indeterminate`): no tiene atributo HTML y pide JavaScript (ver `notes.md`).
- Interruptor (switch), grupos de checkbox con leyenda (los cubre RadioGroup en la 013) y
  validación propia.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-13 son tests vistos en rojo una vez inyectando su violación
  (regla 8).
- La historia y la documentación se abrieron desde `npm run gallery` en los dos temas y lenguas.

## Preguntas abiertas

Ninguna.
