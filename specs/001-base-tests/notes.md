# Notas de la 001 — para el plan

Lo que salió de `spec.md` al reducirla a 100 líneas. Pasa a `plan.md` cuando exista.

## Decisiones del dueño (2026-10-19)

- Consumidor externo de React: Vite con la plantilla `react-ts`. Next.js, en una spec posterior.
- La comprobación de tipos entra en la política: `tsc --noEmit` y `astro check` (RF-7, RF-8).
  Por eso RF-8 nombra las herramientas: son decisión del dueño, no del plan.
- Orden de las specs: 001 → 002 → … , cada una cerrada antes de empezar la siguiente.

## Para el plan

- Qué runner y qué navegador automatizado, cada uno con su alternativa descartada.
- Dónde vive el consumidor externo fuera del repo y cómo se recrea en cada validación; dos
  verificaciones a la vez no deben compartir su carpeta.
- Sin red no se puede crear el starter: qué pasa entonces.
- La 003 necesita un navegador con JavaScript desactivado (Button en Astro sin JavaScript).
- Cómo se empaqueta un paquete sin publicarlo.
- Cómo se verifica el requisito «funciona en Windows», que no tiene check.
