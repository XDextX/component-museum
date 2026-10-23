# Notas de la 011 — tema-opcional

## Decisión del dueño (2026-10-23)

- «Solo si la página lo pide»: el paquete va en claro por defecto, y en oscuro solo con
  `data-theme="dark"` en un contenedor. Deja de seguir `prefers-color-scheme` por sí solo. Esto
  cambia el RF-5 de la 003.
- Motivo: con el sistema en oscuro y una web clara, los campos de la 009 y la 010 salían como
  recuadros oscuros, porque pintan su propia superficie para cumplir la regla 7.

## Respuestas del dueño (2026-10-23)

- El paquete ofrece `data-theme="system"` para seguir la preferencia del sistema (RF-3); decidido
  por el dueño.
- El campo mantiene su superficie propia (RF-5); decidido por el dueño.

## Estado de hoy (comprobado en `spec/010-textarea`, 0d3769b)

- `styles/museum.css` tiene tres bloques de tema:
  - `:root, [data-theme="light"]` (claro);
  - `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` (oscuro por
    sistema);
  - `[data-theme="dark"]`.
- La galería, con «Sistema», no pone atributo y deja que decida la regla `@media`
  (`gallery/.storybook/preview.ts`, comentario del decorador).
- Los README de los paquetes dicen que el oscuro llega con `prefers-color-scheme` o con
  `data-theme="dark"` (`packages/react/README.md:51` y `:137`, y su par en Astro).
- `npm view @component-museum/react version` da 404: no hay nada publicado.
- Tests que usan la preferencia del sistema (`colorScheme` o `prefers-color-scheme`), candidatos a
  cambiar en el plan:
  - `theme.test.ts` (003, RF-5 y RF-6), `a11y.test.ts`, `cascade.test.ts` y `browser.test.ts`;
  - `field-styles.test.ts` y `field-a11y.test.ts`;
  - `gallery-theme.test.ts`, `gallery-docs-theme.test.ts`, `gallery-story-theme.test.ts`,
    `gallery-browser.test.ts`, `gallery-astro-code.test.ts` y `gallery-lang.test.ts`.

## Preguntas de diseño para el coordinator, con recomendación

1. **Cómo sigue al sistema quien lo quiera.**
   - **Recomendado:** `data-theme="system"`, que el paquete resuelve con su regla
     `@media (prefers-color-scheme: dark)`, ahora limitada a `[data-theme="system"]`. Es la página
     la que lo pide (cumple «solo si la página lo pide»), sin JavaScript, y la galería lo usa tal
     cual para su «Sistema». Cuesta un valor más de `data-theme`, y la regla `@media` que ya
     existe pasa a apuntar a otro selector.
   - **Alternativa:** solo `light` y `dark`. Quien quiera seguir al sistema pone el atributo con un
     script propio (`matchMedia`), que el README daría. La galería resolvería «Sistema» en su
     decorador, como `docsScheme` (007). Es menos API, pero cada consumidor escribe su script y la
     galería duplica la lógica.
2. **¿El campo sigue pintando su superficie?**
   - **Recomendado:** sí. El principio de la 003 es que el contraste no dependa de la página. Con el
     claro por defecto, el recuadro oscuro sobre una web clara desaparece, que era el problema. Si
     se quitara la superficie, una web oscura que no pida el tema vería el texto oscuro del campo
     sobre su fondo oscuro y rompería la regla 7. Es el caso simétrico al que midió la 009 (texto
     claro sobre el lienzo blanco: etiqueta 1.05:1). Lo cubre RF-5.
   - **Coste:** sobre una web gris clara, el campo se ve como un recuadro blanco.
   - **Alternativa:** quitarla y dejar el contraste en manos de la página. Choca con la regla 7 y
     con la corrección de la validación de la 009.
3. **¿Es `BREAKING CHANGE`?**
   - **Recomendado:** no, porque nada se ha publicado. Si el dueño publica antes del cierre de la
     entrega 4, el commit de la hoja lleva `BREAKING CHANGE` en el cuerpo.

## Menores decididos por el planner (opción conservadora)

- Un `data-theme` desconocido se ignora, como hoy.
- La galería y su opción «Sistema» se mantienen: con la recomendación 1, el decorador pone
  `data-theme="system"` en lugar de no poner nada.
- El documento de publicación (`docs/publicacion.md`) no cambia: no habla de temas.

## A qué entrega pertenece

Entrega 4, entre la 010 y la 012 (Checkbox). Va antes del resto de campos para que ninguno se
construya sobre el comportamiento anterior. La rama `spec/011-tema-opcional` sale de
`spec/010-textarea`.

## Para el plan

- La hoja tiene el oscuro escrito dos veces (el bloque `@media` y `[data-theme="dark"]`). Con la
  recomendación 1 siguen siendo dos: `@media { [data-theme="system"] }` y `[data-theme="dark"]`.
- `tests/fixtures/style-page.html` y `field.html` usan los cuatro modos de tema de la 009: pasan a
  ser `light`, `dark`, `system` con las dos emulaciones, y sin atributo con emulación oscura (RF-1).
- La línea `Changed:` de la 003 la escribe quien implementa (RF-7), con aprobación.

## Candidatos para una spec futura de pulido (no entran en la 011)

Vistos por el coordinator en un recorrido como usuario (2026-10-23):
- La tabla de props muestra `""` como valor por defecto de `hint` y `error`, en vez de «-».
- Con un campo en error y enfocado, el anillo de foco tapa el borde rojo: mientras se escribe no se
  ve el estado de error.

## Clarify del plan (2026-10-23, menores decididos por el planner)

- `[data-theme="system"]` también en el bloque claro, para que un `system` dentro de un `dark` con
  el sistema en claro dé el claro.
- La hoja, el decorador y los seis tests que dependen de ella van en una sola tarea (T-1); la
  documentación, en otra (T-2), en paralelo.
- Cada test que emulaba el sistema prueba dos cosas: el tema pedido y el claro por defecto con el
  sistema en oscuro.
- La línea `Changed:` de la 003 la escribe la T-2 sin frase de aprobación: vale la de la 011.

## Pregunta para el dueño (con recomendación)

- La galería arranca con «Sistema» (`initialGlobals`). Recomendado: mantenerlo. Así la galería se
  ve como prefiere quien la lee, y los tests de la 005, la 007 y la 008 no cambian. La alternativa
  es arrancar en «Claro» para imitar el claro por defecto del paquete.
