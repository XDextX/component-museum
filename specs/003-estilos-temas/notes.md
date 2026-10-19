# Notas de la 003 — para el plan

Lo que salió de `spec.md` al partir la antigua 002. Pasa a `plan.md` cuando exista.

## Decisiones del dueño (2026-10-19)

- Tema claro y oscuro, con tokens CSS sobrescribibles.
- `data-theme` vale en `<html>` y en cualquier contenedor (RF-6).
- Los estilos del consumidor siempre ganan sin `!important`: el paquete va en la capa `museum`
  (RF-7 a RF-10). Tres vías de personalización: tokens (RF-4), reglas sobre clases (RF-8) y
  utilidades (RF-9).

## Para el plan

- RF-1, RF-4 y RF-8: el color calculado sale como `rgb(...)` y el token puede estar escrito en
  otro formato; comparar valores normalizados.
- RF-2: la lista de at-rules estándar que se admiten (incluida `@layer`). RF-3: qué selectores
  cuentan como «solo tokens».
- RF-9 y RF-10: el orden de las capas lo fija su primera aparición en la página. Declarar al
  principio `@layer museum;` no basta: con Tailwind importado antes, `museum` queda detrás de
  `utilities` y les gana. Vía a valorar: anidar `museum` dentro de `components` y declarar al
  principio `@layer base, components;`, que encaja en los dos órdenes. Si no hay vía, vuelve a la
  spec. Con esa vía, las capas `base` y `components` aparecen en todo consumidor: sin Tailwind
  quedan vacías salvo `museum`.
- Cómo comparten los dos paquetes una sola fuente de CSS.
