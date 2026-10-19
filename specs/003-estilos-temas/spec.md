# Spec 003 — estilos-temas

**Status:** approved
**Approved:** 2026-10-19 · el dueño leyó la spec completa tras 4 rondas de clarify y la partición en 5 · 96 lines, 11 RF
**Size:** L · **Entrega:** 2 (002–005) · **Depende de:** 002

## Contexto y objetivo

La regla 2 pide que el consumidor importe la hoja una vez y todo se vea bien, sin herramientas.
En `legacy` la hoja era 301 `@apply` de Tailwind que solo funcionaban si el consumidor compilaba
Tailwind. Esta spec llena la hoja de la 002 con CSS estándar, tokens, tema claro y oscuro, y tres
vías de personalización —tokens, reglas sobre sus clases y utilidades—, con Button. El dueño
decidió que **las reglas del consumidor siempre ganan**: el paquete va en la capa `museum`, y
`data-theme` vale en `<html>` y en cualquier contenedor.

## Definiciones

- **Token** — una variable CSS del paquete que el consumidor puede sobrescribir. Categorías:
  color, radio, espaciado y tipografía.
- **Prop de clase** y **consumidor externo** — los de la 002 y la 001.

## Historias de usuario

- US-1: Como consumidor, quiero sobrescribir tokens y elegir tema en la página o en una parte de
  ella, sin tocar el CSS del paquete.
- US-2: Como consumidor, quiero que mis reglas sin capa, mi reset y mis utilidades de Tailwind
  ganen siempre; el reset de Tailwind, en su capa `base`, pierde por diseño.

## Requisitos (EARS)

- RF-1: CUANDO un consumidor externo renderiza Button, EL SISTEMA lo muestra con los estilos del
  paquete. — **Check:** por framework y variante, fondo, texto y borde calculados son los de sus
  tokens; en Astro, también con JavaScript desactivado.
- RF-2: EL SISTEMA publica su hoja como CSS estándar que el navegador aplica tal cual. — **Check:**
  un test falla ante una at-rule no estándar (`@apply`, `@tailwind`…) o un `@import` de otro
  paquete.
- RF-3: EL SISTEMA aplica sus reglas solo a elementos de sus componentes. — **Check:** un test falla
  ante un selector sin clase de componente, salvo los que solo declaran tokens.
- RF-4: EL SISTEMA expone como token cada color, radio, espaciado y tipografía de Button. —
  **Check:** en el consumidor externo, sobrescribir en `:root` un token de cada categoría cambia
  su propiedad en Button.
- RF-5: MIENTRAS ningún ancestro lleva `data-theme`, EL SISTEMA sigue la preferencia del sistema
  operativo. — **Check:** con `prefers-color-scheme` emulado, los tokens son los de ese tema.
- RF-6: CUANDO `<html>` o un contenedor lleva `data-theme`, EL SISTEMA usa ese tema dentro, sea
  cual sea la preferencia; manda el más cercano. — **Check:** con emulación contraria, `<html>`, un
  contenedor y un `light` dentro de un `dark` dan los tokens del tema declarado más cercano.
- RF-7: EL SISTEMA declara todas sus reglas dentro de una capa `museum`. — **Check:** un test falla
  ante una regla fuera de una capa `museum`, de primer nivel o anidada.
- RF-8: CUANDO una regla sin capa del consumidor apunta a la clase de un componente o a una pasada
  por la prop de clase, EL SISTEMA la deja ganar. — **Check:** en el consumidor externo, una regla
  de una clase que cambia el fondo gana en Button, con su clase y con una propia, en cada framework.
- RF-9: CUANDO el consumidor pasa utilidades de Tailwind v4 por la prop de clase, EL SISTEMA las
  deja ganar en cualquier orden de import. — **Check:** con la hoja antes y después de la de
  Tailwind, `px-8` da 32px de `padding-left`, en cada framework.
- RF-10: CUANDO el consumidor usa Tailwind v4, EL SISTEMA gana a su capa `base` en cualquier orden
  de import. — **Check:** en los dos órdenes, Button sin utilidades da el fondo y el
  `padding-left` de sus tokens, en cada framework.
- RF-11: EL SISTEMA cumple WCAG 2.1 AA en Button, en los dos frameworks y temas. — **Check:** la
  validación lista cómo se verificó en un navegador teclado, nombre, foco y contraste 4.5:1
  (regla 7).

## Requisitos no funcionales

- **Dependencias (regla 9).** Tailwind solo lo añade el test al consumidor externo; nunca es
  dependencia de un paquete.

## Casos límite

- **Tokens a medias.** Los no sobrescritos siguen con su valor; uno redefinido en un contenedor solo
  cambia lo que contiene (RF-4).
- **Reset del consumidor.** Uno sin capa (`button { all: unset }`) gana a Button: es lo decidido
  (RF-7). El de Tailwind va en su capa `base` y pierde (RF-10).
- **Token en `:root` frente a `data-theme`.** Un token del consumidor en `:root` pierde dentro de
  un `data-theme` más cercano, que declara el suyo; para ganar ahí, se redefine en ese contenedor.
- **`data-theme` desconocido.** Un valor que no es `light` ni `dark` se trata como ausente: manda el
  ancestro siguiente con `data-theme` o, si no hay, la preferencia del sistema (RF-5, RF-6).
- **Las dos hojas a la vez.** Con las hojas de Astro y React importadas, Button se ve igual (RF-1).
- **Capas `base` y `components` ajenas.** Si el plan anida `museum` en `components`, las reglas del
  consumidor en su `base` pierden y las directas en `components` ganan a `museum`; las sin capa
  ganan siempre (RF-8).

## Fuera de alcance

- Tailwind v3: sus capas no son nativas y cualquier regla suya ganaría al paquete.
- Temas distintos de claro y oscuro, y tokens de otros componentes.
- La historia de Button (004) y el tema en la galería (005).

## Hecho cuando

- El comando de la 001 termina en 0; RF-2, RF-3 y RF-7 son tests vistos en rojo (regla 8).
- RF-1, RF-4 a RF-6 y RF-8 a RF-10 se verificaron en un navegador con viewport explícito, en los
  dos temas; RF-11, además, con teclado.

## Preguntas abiertas

Ninguna.
