# Notas de la 002 — para el plan

Lo que salió de `spec.md` al partir la antigua 002 (32 RF) en 002–004. Pasa a `plan.md`.

## Decisiones del dueño (2026-10-19)

- Una implementación por framework, con CSS y contrato comunes. Descartados: web components con
  envoltorios, y compilar desde una fuente única.
- npm público, scope `@component-museum`. Si el plan comprueba que está ocupado, se vuelve a
  preguntar al dueño; no se cae a otro scope por defecto.
- Eventos: nombre canónico en el contrato y regla fija de traducción (RF-8).
- Prop de clase: `class` en Astro y `className` en React, por regla fija (RF-10).
- El contrato de Button declara `click` (RF-8).

## Para el plan

- Comprobar que el scope `@component-museum` está libre en npm, antes de nada más.
- RF-9: normalizar los ids que genera React y los atributos que añade Astro.
- ¿`react` solo, o `react` y `react-dom` como peer? Lo decide el plan con su motivo; RF-4 admite
  los paquetes del framework.
- Cómo se construye cada paquete y qué herramienta versiona.
- La regla 4 se comprueba con la matriz de frameworks, que llega con la 005; hasta entonces la
  guarda el contrato común (RF-6, RF-7). Por eso la entrega 2 incluye la 005.
