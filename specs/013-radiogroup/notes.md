# Notas de la 013 — radiogroup

## Qué se hereda, sin cambiarlo

- De la 009 a la 012:
  - `label`, `hint` y `error` dentro, con el error antes que la ayuda en `aria-describedby`;
  - la superficie propia del campo, con su `padding` igual al alcance del anillo;
  - `id` deterministas en Astro, con un contador por prefijo en `globalThis`;
  - la disposición en línea de la 012: el control, después su etiqueta, con `for`;
  - el control dibujado con `appearance: none` y tokens; la marca, con `mask-image` y un token;
  - los colores forzados con `forced-color-adjust: none` y colores de sistema;
  - el anillo por fuera, con el borde de error visible.
- De la 011: el tema solo si la página lo pide, medido en los tres modos (`light` por defecto con el
  sistema en oscuro, `dark` y `system`).
- De la 017, la suite:
  - cada archivo de navegador nuevo llama a `need(...)`;
  - un `gallery-browser-radiogroup.test.ts`, que exige `projects.test.ts`;
  - un `kind` RadioGroup en `tests/lib/field-a11y.ts`, con su `field-a11y-radiogroup.test.ts`.

  La lista de historias de `gallery-story-theme` (`storyIds`) es fija y no incluye componentes de
  formulario, así que no necesita un archivo nuevo.
- Las clases de ejemplo van en `gallery/lib/example-classes.ts`, con una entrada `RadioGroup`.
- Las notas de los agentes, en UTF-8 y CRLF.

## Preguntas de clarify resueltas por el planner (modo autónomo, con la recomendación)

1. **¿Opciones como dato o como hijos `<Radio>`?**
   - **Como dato, `options: { value, label, disabled? }[]`.** Unos hijos en un slot de Astro no
     pueden recibir el `name` ni los `id` del grupo; es la misma razón por la que no hay `Field`
     (009, regla 4).
   - Cuesta un tipo nuevo en el formato del contrato, `options`, que el plan añade al test de
     contrato y a `contract-args.ts`, sin tocar los tipos que ya hay.
2. **¿`fieldset` o `div role="radiogroup"`?**
   - **`fieldset` con `role="radiogroup"` y la leyenda (`legend`) como nombre.** El `fieldset` da la
     agrupación nativa, y además `disabled` para todo el grupo de una vez (RF-16). El rol
     `radiogroup` admite `aria-invalid` y `aria-required` (RF-5, RF-7), que `group` no admite.
3. **¿`name` en el contrato?**
   - **Sí, obligatorio.** Sin un `name` común, las opciones no forman un grupo para el navegador
     (RF-3, RF-8). Generarlo solo daría un grupo que no se envía con un nombre útil.
4. **¿Estado inicial?**
   - **`defaultValue` (string, por defecto `""`) en el contrato,** igual que `defaultChecked` en la
     012: genera un caso Astro con selección, y se llama igual en React y en Astro.
   - En React, `value` y `onChange` pasan como atributos para quien quiera un grupo controlado.
     `onChange` en el grupo recibe el `change` de cada radio. Si llega `value`, cada radio usa
     `checked` en vez de `defaultChecked`.
5. **¿`required`?**
   - **Nativo en cada radio**: el formulario no se envía sin elegir. Además, `aria-required="true"`
     en el grupo y el marcador `*` en la leyenda.
6. **¿Tokens?**
   - **Propios, con valor por defecto de los de Checkbox:** `--museum-radio-checked-bg:
     var(--museum-checkbox-checked-bg)` y `--museum-radio-mark: var(--museum-checkbox-mark)`, en
     los tres bloques de tema.
   - Así se ven iguales, se pueden cambiar por separado, y el contraste ya medido en la 012 vale de
     partida.
7. **¿A qué se pasan los atributos HTML y la clase?**
   - **Al `fieldset`.** El grupo es el componente; los atributos de cada radio salen de `options`.

## Menores decididos por el planner (opción conservadora)

- `options` vacío pinta la leyenda sin opciones; un `defaultValue` que no está en `options` no marca
  ninguna; dos grupos con el mismo `name` son cosa del consumidor (casos límite).
- Fuera de alcance: una ayuda por opción, la disposición horizontal y el grupo controlado en Astro.
- Casos Astro, con unas opciones de ejemplo fijas (3): `default`, 2 de `size`, `hint`, `error`,
  `hint-error`, `disabled`, `required` y `defaultValue` (9). La opción `disabled` se prueba en los
  consumidores (grupo `partial`).
- Una opción con `value: ''` empieza marcada si no se pasa `defaultValue`, porque su valor por
  defecto también es `""`; es conocido y no se trata en esta spec.
- La historia React ofrece `options` como control JSON (de `argTypesFromContract`) y monta de nuevo
  el grupo al cambiar `defaultValue`, como la 012 con `defaultChecked`.

## A qué entrega pertenece

Entrega 4 (009–012, 017, 013, 014). La rama `spec/013-radiogroup` sale de `spec/017-tests-rapidos`.
