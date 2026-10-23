# Notas de la 007 — para el plan

## Decisiones del dueño (2026-10-22)

- **Imports de los casos Astro:** se mantienen en cada caso, como pide el RF-7 de la 004; fuera de
  alcance, sin tocar la 004.
- **Descripciones de las props:** no entran. Son candidatas a una spec futura: una descripción por
  prop en español y en inglés (regla 10), guardada en el contrato y mostrada en la tabla.
- **Barra de Storybook:** se quitan las cuatro herramientas: fondos, rejilla, medir y contornos.

## Menores resueltos sin preguntar (clarify, ronda 1)

- El selector de idioma se parte en dos RF: estilo (RF-2) y estado activo (RF-3), para que cada
  check mida una sola cosa.
- El gestor de Storybook queda con su propio tema, y la spec lo dice como caso límite: solo la
  página de documentación y las historias siguen al tema de la galería.

## Por qué abre la entrega 3

La entrega 2 (002–006) se cierra cuando el dueño publique los paquetes en npm (spec 006). Esta spec
no toca `packages/`, `styles/` ni lo que se publica: solo la galería, que no se publica. Meterla en
la entrega 2 retrasaría la publicación por un pulido que el consumidor del paquete no ve. Por eso
abre la entrega 3. Coste: la galería de la entrega 2 sale con estos seis fallos de uso, que no
rompen ninguna regla de la constitución.

Si la 006 no se ha mergeado a `main` cuando se apruebe esta spec, la rama `spec/007-pulido-galeria`
espera, porque se corta de `main` (`AGENTS.md`).

## Comprobación en la galería (Edge, Storybook en marcha, 2026-10-22)

1. **Tabla de props:** `variant`, `size`, `type` y `disabled` dan «-» en descripción y en default.
   `children` da `string` y `className` muestra el CSS de `my-button`. Las tres primeras filas son
   el esqueleto de carga («propertyName*»). Confirmado.
2. **Selector de idioma:** botones nativos, `font-family: Arial`, `border: 2px outset`, fondo
   `rgb(240, 240, 240)`. Confirmado.
3. **Barra del gestor:** «Grid visibility», «Preview background», «Measure tool», «Outline tool»,
   «Viewport size», «Tema de la galería Sistema», zoom y otros. Confirmado.
4. **Tema:** con `prefers-color-scheme: dark` emulado y el tema en «Sistema», `.sbdocs-wrapper`
   tiene fondo `rgb(255, 255, 255)`. Confirmado.
5. **Historia Astro:** 6 casos, sin resaltado (ningún `span` con clase dentro de `pre`) y sin botón
   de copiar; los 6 bloques repiten `import { Button }`. Confirmado.
6. **Desborde a 542 px:** no se reproduce con emulación de móvil (barras de scroll superpuestas):
   `scrollWidth` es igual a `clientWidth` (542), en el iframe y en el gestor. Lo midió el coordinator
   con una barra de scroll clásica (viewport 527 px, wrapper 547 px). Por eso el check de RF-7 exige
   barra clásica y no emulación de móvil.

## Para el plan

- RF-1: los defaults salen del contrato, en `argTypesFromContract` (`table.defaultValue`); nada
  escrito a mano.
- RF-4: Storybook 10 permite desactivar herramientas del núcleo en `main.ts` (`features`); comprobar
  los nombres exactos en la versión instalada.
- RF-5: Storybook trae temas claro y oscuro (`storybook/theming`) para la página de documentación;
  hace falta que el tema siga al global `theme` de la galería, y con «Sistema», a
  `prefers-color-scheme`. Medir el contraste del texto de la página en los dos temas (regla 7).
- RF-6: el bloque `Source` de `@storybook/addon-docs`, ya instalado, trae resaltado y botón de
  copiar. Ver si se puede usar dentro de la historia o si los casos Astro tienen que ir a la página
  MDX.
- RF-7: buscar qué elemento desborda con una barra clásica; si es de Storybook, corregirlo con CSS
  de la galería.
- Ninguna dependencia nueva prevista.

- T-4 (RF-5): `Button.mdx` no tiene historia primaria, así que el contexto de documentación no da contexto de historia
  ni el global `theme`; el contenedor lo lee de `globals=` en la URL del iframe (que el gestor mantiene al día) y de `globalsUpdated`.
- T-5, cambio de plan (coordinator): `SyntaxHighlighter` no se pinta en el iframe de una historia sin tema de Storybook, así que la historia lo envuelve en `ThemeProvider` con `convert(themes.light|dark)` según el global `theme`; y `language="html"` en lugar de `astro`, que no es un lenguaje registrado.
