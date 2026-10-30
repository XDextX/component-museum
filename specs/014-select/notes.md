# Notas de la 014 — select

## Qué se hereda, sin cambiarlo

- De la 009 a la 013:
  - etiqueta, ayuda y error dentro, con el error antes que la ayuda en `aria-describedby`;
  - la superficie propia del campo y el ayudante de campo; Select usa el modo normal, el de Input,
    con la etiqueta encima;
  - `id` deterministas en Astro, con un prefijo nuevo, `museum-select`;
  - los tokens de control (`--museum-control-*`) y de campo (`--museum-field-*`);
  - el tipo `options` del contrato (013, T-1) y `defaultValue` como estado inicial (013);
  - los colores forzados con `forced-color-adjust: none` y colores de sistema (012, 013).
- De la 011: el tema solo si la página lo pide, medido en sus modos.
- De la 017:
  - `need(...)` en cada archivo de navegador;
  - un `gallery-browser-select.test.ts`, que exige `projects.test.ts`;
  - un `kind` Select en `tests/lib/field-a11y.ts`, con su `field-a11y-select.test.ts`.
- La entrada `Select` en `gallery/lib/example-classes.ts`. Las notas, en UTF-8 y CRLF.

## Preguntas de clarify resueltas por el planner (modo autónomo, con la recomendación)

1. **¿Nativo o listbox propio?**
   - **Nativo** (lo pide el coordinator, y era la recomendación de la 009). El teclado, el lector
     de pantalla y el selector del móvil son los del navegador, y Astro no necesita JavaScript.
2. **¿Cómo se dibuja la flecha?**
   - **Con `appearance: none` y dos `linear-gradient` en `background-image`, de un token**
     (`--museum-select-arrow`, por defecto `var(--museum-control-fg)`).
   - Un SVG en `data:` no puede leer un token, y `<select>` no tiene `::before`.
   - Los degradados sí leen `var()`, así que la flecha sigue al tema.
   - Con colores forzados, `forced-color-adjust: none` y `CanvasText`, como en la 012.
3. **¿Indicación?**
   - **Prop `placeholder` en el contrato (string, por defecto `""`).** Si no está vacía, se pinta
     como un primer `<option value="" disabled>` con su texto.
   - Ese `<option>` sale elegido cuando no hay `defaultValue`. Con `required`, el formulario no se
     envía con él (RF-6, RF-9).
   - No va `hidden`, para que el lector de pantalla lo lea en la lista.
4. **¿`name` en el contrato?**
   - **No.** A diferencia de RadioGroup, un `<select>` es un solo control: `name` pasa como
     atributo HTML, igual que en Input.
5. **¿Controlado en React?**
   - **`value` y `onChange` nativos pasan como atributos.** El componente envía `defaultValue` solo
     si el consumidor no pasa `value`, como `defaultChecked` en la 012.
6. **¿Altura?**
   - **La de Input del mismo `size`** (RF-13), con el mismo `padding` vertical, letra y borde. El
     `padding` derecho hace sitio a la flecha.
7. **¿Texto largo de una opción?**
   - **Se corta con `text-overflow: ellipsis`** en el control cerrado (caso límite). La lista
     desplegada es del navegador y lo enseña entero.

## Menores decididos por el planner (opción conservadora)

- Fuera de alcance: `multiple`, `optgroup`, búsqueda y listbox propio.
- `options` vacío pinta el control sin opciones (o solo la indicación); un `defaultValue` que no
  está en `options` cuenta como ausente; `defaultValue` gana a `placeholder`.
- Casos Astro (`astroCases` con `options`): `default`, 2 de `size`, `hint`, `error`, `disabled`,
  `required`, `defaultValue` y `placeholder` (9).
- La historia React monta de nuevo el control al cambiar `defaultValue` (`key`), como la 012 y la
  013.

## A qué entrega pertenece

Entrega 4: es la última (009–012, 017, 013, 014). Cuando la 014 se valida y la constitución se
cumple entera, la entrega se cierra, se mergea a `main` y la publica el dueño. La rama
`spec/014-select` sale de `spec/013-radiogroup` cuando la 013 esté terminada.
