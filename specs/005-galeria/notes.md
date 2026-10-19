# Notas de la 005 — para el plan

Lo que salió de `spec.md` al compactarla. Pasa a `plan.md` cuando exista.

## Decisiones del dueño (2026-10-19)

- La documentación va en español y en inglés, con selector de idioma (RF-1); por defecto, español
  (RF-5).
- El código de uso refleja en vivo los valores de los controles (RF-2).
- La 004 trae el Storybook mínimo; esta spec lo completa. Las enmiendas de las reglas 5 y 10
  nacieron en la antigua 003-galeria y ya están en la constitución (c05740e).

## Para el plan

- Storybook no traduce la documentación por sí solo: cómo se implementa el selector de idioma, y
  el motivo de cualquier addon que añada (regla 9).
- Cómo genera Storybook el código de uso para que siga a los controles (RF-2) sin perder el import
  de la hoja de estilos (004, RF-7).
- Cómo se genera la matriz desde las entradas de los paquetes.
