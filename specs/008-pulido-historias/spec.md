# Spec 008 — pulido-historias

**Status:** implemented · **Approved:** 2026-10-22 · el dueño, con 8 px de hueco (RF-3) y líneas partidas (RF-4)
**Implemented:** 2026-10-22 · 2 tareas en 1 ola con worktrees; la rejilla de la T-2 se cambió por un margen (recortaba el Copy de la 007); validada por el reviewer en 1 vuelta; `npm test` 347/347 (+1 omitido)
**Size:** M (4 RF) · **Entrega:** 3 · **Depende de:** 007

## Contexto y objetivo

Un recorrido por la galería como usuario con la 007 terminada (Storybook, 2026-10-22) encontró
tres fallos de uso. Los tres se reprodujeron en Edge:
- con el tema oscuro, las vistas de historia siguen blancas: solo el recuadro del componente se
  oscurece, y queda un marco y el resto de la página en blanco (la 007 oscureció solo la página de
  documentación);
- en la página de documentación oscura, la barra de desplazamiento de la tabla de props se pinta
  clara;
- en los casos Astro, el Button queda pegado a su bloque de código, y en anchos estrechos la línea
  del import obliga a desplazar dentro del bloque.

Esta spec deja las vistas de historia coherentes con el tema de la galería y fáciles de leer, sin
tocar los paquetes ni lo que se publica.

## Definiciones

- **Vista de historia** — una historia abierta sola, fuera de la página de documentación:
  `Button/React/Default` y `Button/Astro/Variants`.
- **Página de documentación** y **tema de la galería** — como en la 007.
- **Fondo de superficie** — el que da el tema del paquete a la superficie (`--museum-surface`).

## Historias de usuario

- US-1: Como lector, quiero que la vista de historia entera siga el tema que elijo.
- US-2: Como lector de Astro en el móvil, quiero distinguir cada Button de su código y leer el
  código sin desplazarme en horizontal.

## Requisitos (EARS)

- RF-1: EL SISTEMA pinta toda la vista de historia con el fondo de superficie del tema de la
  galería. — **Check:** en Edge, en las dos vistas, con «Oscuro», «Claro» y «Sistema» (emulación
  oscura y clara), las cuatro esquinas y el centro del viewport dan el fondo de superficie del tema.
- RF-2: EL SISTEMA pinta cada barra de desplazamiento de la página de documentación y de las vistas
  de historia con el esquema del tema de la galería. — **Check:** en Edge, todo elemento con
  desplazamiento propio resuelve `color-scheme` oscuro con el tema oscuro y claro con «Claro».
- RF-3: EL SISTEMA separa el Button de cada caso Astro de su bloque de código. — **Check:** en Edge,
  en los 6 casos, el hueco vertical entre el Button y el bloque es ≥ 8 px.
- RF-4: EL SISTEMA muestra el código de cada caso Astro sin desplazamiento horizontal desde 320 px.
  — **Check:** en Edge con barra de scroll clásica, a 320 y a 542 px, el `scrollWidth` de cada
  bloque no pasa de su `clientWidth`.

## Requisitos no funcionales

- **Accesibilidad (regla 7).** Todo texto visible de las vistas de historia contrasta ≥ 4.5:1
  contra su fondo, en los dos temas; lo mide un test, no solo los Button.
- **Dependencias (regla 9).** Ninguna nueva.
- **Paquetes.** Ningún cambio en `packages/`, `styles/` ni en lo que se publica.

## Casos límite

- **Tema «Sistema» sin preferencia del sistema:** la vista de historia va clara (RF-1).
- **Cambio de tema con la historia abierta:** el fondo y las barras cambian sin recargar (RF-1,
  RF-2).
- **Copiar tras partir líneas:** el botón de copiar de la 007 sigue dejando en el portapapeles
  exactamente el `usage`, sin saltos de línea añadidos (RF-4).
- **Una palabra más ancha que el bloque** (una ruta sin espacios): se parte igual, sin desbordar
  (RF-4).
- **El gestor de Storybook** sigue con su propio tema, como en la 007.

## Fuera de alcance

- El código de la página de documentación (bloques `Source` de Storybook): conserva su propio
  desplazamiento.
- El tema del gestor de Storybook (barra lateral y barra de herramientas).
- Cambios en los paquetes y nuevos componentes.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-4 son tests vistos en rojo una vez inyectando su violación
  (regla 8); el test de copiar de la 007 sigue en verde.
- Las dos vistas de historia y la página de documentación se abrieron desde `npm run gallery`, en
  los dos temas y a 320 px.

## Preguntas abiertas

Ninguna.
