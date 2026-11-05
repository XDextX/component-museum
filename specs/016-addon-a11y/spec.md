# Spec 016 — addon-a11y

**Status:** approved · **Approved:** 2026-10-23 · el dueño, para después de la entrega 4; una violación de axe rompe npm test
**Changed:** 2026-11-01 · cambios de la revisión del 2026-11-01 (C-2 y C-5, en `notes.md`), por decisión del dueño («Apruebo todo»)
**Changed:** 2026-11-04 · sin límite absoluto de duración de `npm test` (ni 150 ni 170 s): queda solo ≤ 15 s añadidos sobre la 015, medidos contra una base de la 015 del mismo día y la misma máquina, por decisión del dueño («Quitar el límite absoluto»), tras ver 170.8 y 188.9 s con el mismo código
**Size:** M (5 RF) · **Entrega:** 5 (herramientas de la galería) · **Depende de:** 015

## Contexto y objetivo

El dueño quiere `@storybook/addon-a11y` junto al addon de Vitest de la 015 («Sí, en la 015»; no
cabía en sus 100 líneas). El addon pasa axe-core por cada historia, dentro de los tests de historia
de la 015, y muestra el resultado en un panel de Storybook. Es **complementario** de los tests de
Edge que ya hay, no los sustituye:
- **axe** cubre reglas WCAG A y AA genéricas en todas las historias, también en las que vengan:
  etiquetas, nombres, ARIA válido, `id` duplicados y contraste de texto.
- **Los tests de Edge** miden lo que axe no ve: foco real con `Tab`, el anillo y el borde del
  control a 3:1 (contraste no textual), y el contraste contra el fondo compuesto de cada tema.

Versiones, fuentes y cómo se reparten las comprobaciones: `notes.md`.

## Definiciones

- **Test de historia** — como en la 015.
- **Violación** — una regla de axe que falla en una historia (no un resultado «incompleto»).

## Historias de usuario

- US-1: Como dueño, quiero que una historia nueva con un fallo de accesibilidad no pase `npm test`.
- US-2: Como dueño, quiero ver en Storybook qué regla falla y en qué elemento.

## Requisitos (EARS)

- RF-1: EL SISTEMA declara el addon con la versión exacta de `storybook`. — **Check:** un test falla
  si la versión de `@storybook/addon-a11y` no es la de `storybook` en la galería.
- RF-2: CUANDO se ejecuta `npm test`, EL SISTEMA pasa axe por cada historia y falla ante una
  violación. — **Check:** una historia con un input sin etiqueta pone `npm test` en distinto de 0.
- RF-3: EL SISTEMA pasa axe con el tema claro y con el oscuro de la galería. — **Check:** una
  historia con texto ilegible solo en oscuro pone `npm test` en distinto de 0.
- RF-4: EL SISTEMA no desactiva ninguna regla de axe sin un motivo escrito. — **Check:** un test
  falla si la configuración desactiva una regla fuera de la lista de excepciones con motivo.
- RF-5: CUANDO el lector abre una historia en `npm run gallery`, EL SISTEMA muestra sus resultados
  de axe en el panel. — **Check:** en la validación, en Edge sobre el servidor de desarrollo, da 0.

## Requisitos no funcionales

- **Dependencias (regla 9).** Motivo: una comprobación automática de accesibilidad en cada
  historia, también en las futuras, y su panel en Storybook, que pide el dueño. Arrastra
  `axe-core` (licencia MPL-2.0). Es de desarrollo y de la galería: no llega a ningún paquete (regla
  2).
- **Nada se afloja (regla 7).** Los tests de `tests/` siguen todos (RF-5 de la 015); axe se suma y
  no sustituye ninguna medida.
- **Edge, sin descargas y una puerta:** como en la 015.

## Casos límite

- **Resultados «incompletos» de axe** (contraste sobre degradados, texto sobre imágenes): no rompen
  `npm test`; ese contraste lo miden los tests de Edge (RF-2).
- **Controles `disabled`:** axe no les exige contraste, como WCAG; el error de un campo
  `disabled` sí lo cumple, y lo mide `field-a11y` (RF-2).
- **Historias Astro:** axe evalúa el HTML prerenderizado, que es el real de Astro (RF-2).
- **El tema «Sistema»:** se cubre con el claro y el oscuro pedidos (RF-3).
- **El gestor de Storybook** (barras, panel): axe mira el `body` del iframe de la historia, con el
  lienzo de la galería, no el gestor (RF-2).

## Fuera de alcance

- Reglas AAA, y la regla `region` (desactivada por defecto en el addon; va en la lista de RF-4).
- Revisión manual de accesibilidad: axe cubre solo una parte de WCAG.
- Cambiar los componentes: una violación en un componente es un hallazgo para otra spec. Una en
  el código propio de la galería se arregla en esta.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-4 son tests vistos en rojo una vez inyectando su violación
  (regla 8); RF-5 se comprueba en la validación, también con su violación.
- Se abrió `npm run gallery` y el panel de accesibilidad de cada historia dio 0 violaciones, en los
  dos temas.

## Preguntas abiertas

Ninguna.
