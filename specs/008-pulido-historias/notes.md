# Notas de la 008 — para el plan

## Decisiones del dueño (2026-10-22)

- **Hueco entre el Button y su código (RF-3):** 8 px, como se propuso.
- **Código de Astro en anchos estrechos (RF-4):** se parten las líneas, en vez de reducir la letra.

## Comprobación en la galería (Edge, Storybook en marcha con la 007, 2026-10-22)

1. **Vista de historia oscura** (`button-react--default`, `globals=theme:dark`): `body` y `html`
   transparentes (blanco), `body.sb-main-padded` con `padding: 16px`; el recuadro del decorador
   (`rgb(17, 24, 39)`) mide solo lo que el componente (32 × 70 px en 16,16). Confirmado.
2. **Barra de la tabla de props** (documentación, `theme:dark`): `.sbdocs-wrapper` oscuro
   (`rgb(34, 35, 37)`), pero `color-scheme` es `normal` en `html`, `body`, el wrapper y
   `.docblock-argstable`: la barra nativa sale clara. Confirmado.
3. **Casos Astro** (`button-astro--variants`): cada `section` es `display: block` sin `gap`; el
   `div` del Button termina en y=97 y el bloque de código empieza en y=97: 0 px de hueco.
   Confirmado. El bloque es el `SyntaxHighlighter` de la 007 (Radix ScrollArea, barra nativa
   oculta). El corte del import a anchos estrechos lo midió el coordinator; aquí no se midió
   porque el panel del navegador estaba oculto (viewport 0).

## Para el plan

- RF-1: el decorador pinta solo su `div`; el fondo de toda la vista necesita el `body` del iframe
  (o quitar el `padding` de `sb-main-padded` con `layout`), siguiendo el global y «Sistema».
- RF-2: `color-scheme` en la raíz del iframe según el tema; vale para la documentación y las
  historias, y para las barras de `preview-head.html` (`pre` y `.docblock-argstable`, 007 T-6).
- RF-3: 8 px es la mitad del `padding` de `1rem` del decorador y el margen del `h3` del caso.
- RF-4: partir líneas (`white-space: pre-wrap` y `overflow-wrap: anywhere`) es visual; el test de
  copiar de la 007 (`tests/gallery-astro-code.test.ts`) debe seguir en verde.
- Ninguna dependencia nueva prevista.
