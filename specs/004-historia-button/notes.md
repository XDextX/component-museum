# Notas de la 004 — para el plan

Lo que salió de `spec.md` al partir la antigua 002. Pasa a `plan.md` cuando exista.

## Decisiones del dueño (2026-10-19)

- La galería es Storybook oficial, no una galería propia.
- Astro en Storybook: HTML prerenderizado sin controles en vivo (opción C). La regla 5 se enmendó
  para ello en c05740e, hasta que Storybook soporte Astro de forma oficial.
- Esta spec trae un Storybook mínimo con la historia de Button, para cumplir la regla 5 desde el
  primer export; la 005 lo completa.
- Documentación en español y en inglés (regla 10, enmendada en c05740e).
- Prop de clase con control de lista cerrada: «ninguna» y `my-button`, con su CSS a la vista
  (RF-3, RF-8, RF-9). Así la regla 5 se cumple (un control por prop) y todo código de uso lleva
  solo clases definidas a la vista. Descartadas: B, enmendar la regla 5 para eximir la prop de
  clase, porque abre una excepción en una regla recién enmendada; y C, un control de texto libre,
  porque deja copiar clases que nadie define, que es lo que falló en `legacy`.

## Investigación: componentes `.astro` en Storybook (2026-10-19)

- Sin soporte oficial: [storybookjs/storybook#18356](https://github.com/storybookjs/storybook/issues/18356)
  sigue abierta; en febrero de 2026 el equipo pidió que una versión de la comunidad ganara
  tracción antes. Versiones en npm ese día: `storybook` 10.6.2, `astro` 7.4.1.
- Descartado `@storybook-astro/framework` 1.13.0 (comunidad, MIT;
  [repo](https://github.com/storybook-astro/storybook-astro),
  [hoja de ruta](https://storybook-astro.org/guides/roadmap/)): sin respaldo oficial (65 estrellas,
  16 issues abiertas); en su build estático, el modo por defecto, los controles de Astro no tienen
  efecto, y el modo servidor está «en progreso» y necesita Node; se apoya en la Container API.
- La [Container API de Astro](https://docs.astro.build/en/reference/container-reference/) es
  experimental desde Astro 4.9 y puede romper en versiones menores; si el plan la usa para el
  prerenderizado, el riesgo queda en la galería, nunca en un paquete.

## Para el plan

- La versión de Storybook y su framework de React, con la alternativa descartada.
- Cómo se prerenderiza Astro y cómo llega ese HTML a Storybook; el prerenderizado importa por el
  especificador del paquete (RF-10).
- Cómo genera Storybook el código de uso para que lleve el import de la hoja (RF-7).
- RF-9: dónde va el CSS de `.my-button`: junto al control del panel o en la tabla de la página de
  documentación.
- RF-11: los nombres que lleva a la constitución salen del plan; la enmienda la aprueba el dueño.
- El check de la regla 10 de la constitución cita «el test de idiomas de las historias», sin
  número de spec: es el RF-2 de esta spec.
