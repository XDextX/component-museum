# Spec 011 — tema-opcional

**Status:** approved · **Approved:** 2026-10-23 · el dueño, con data-theme="system" y el campo con superficie propia
**Size:** M (7 RF) · **Entrega:** 4 (009–014) · **Depende de:** 010

## Contexto y objetivo

Decisión del dueño (2026-10-23), que cambia el RF-5 de la 003: **el paquete va en claro por
defecto, y solo se pone en oscuro cuando la página lo pide**. Hoy sigue `prefers-color-scheme` por
sí solo. Con el sistema en oscuro y una web clara, los campos de la 009 y la 010 salían como
recuadros oscuros, porque para cumplir la regla 7 pintan su propia superficie. La página pide el
tema con `data-theme`: `dark` u, opcionalmente, `system` para seguir la preferencia del sistema.
La galería y su opción «Sistema» (005, 007, 008) siguen funcionando, ahora pidiéndolo.

## Definiciones

- **Pedir el tema** — poner `data-theme` en `<html>` o en un contenedor.
- **Tema del paquete** — los tokens `--museum-*` claros u oscuros (003).

## Historias de usuario

- US-1: Como consumidor con una web clara, quiero que los componentes salgan claros aunque el
  usuario tenga el sistema en oscuro.
- US-2: Como consumidor con modo oscuro, quiero activarlo, o seguir al sistema, con un atributo.

## Requisitos (EARS)

- RF-1: MIENTRAS ningún ancestro pide el tema, EL SISTEMA usa el tema claro, sea cual sea la
  preferencia del sistema. — **Check:** en Edge, con emulación oscura, los tokens son los claros.
- RF-2: CUANDO un ancestro pide `data-theme="dark"` o `"light"`, EL SISTEMA usa ese tema dentro;
  manda el más cercano. — **Check:** el test de RF-6 de la 003 pasa con las dos emulaciones.
- RF-3: CUANDO un ancestro pide `data-theme="system"`, EL SISTEMA sigue dentro la preferencia del
  sistema. — **Check:** en Edge, emulación oscura da los tokens oscuros, y clara los claros.
- RF-4: MIENTRAS el tema de la galería es «Sistema», EL SISTEMA pinta las historias y la
  documentación con la preferencia del sistema. — **Check:** los tests de la 005, 007 y 008 con
  «Sistema» y emulación siguen en verde.
- RF-5: SI la página es oscura sin pedir el tema, ENTONCES EL SISTEMA mantiene legible cada campo.
  — **Check:** en Edge, en un fondo oscuro sin `data-theme`, textos ≥ 4.5:1 y borde ≥ 3:1.
- RF-6: EL SISTEMA documenta, en los README y en la página de cada componente, en las dos lenguas,
  el claro por defecto, `"dark"` y `"system"`. — **Check:** un test falla si falta uno o si queda
  `prefers-color-scheme` como activación automática.
- RF-7: CUANDO esta spec se implementa, EL SISTEMA deja en la 003 que su RF-5 cambia por la 011. —
  **Check:** la 003 lleva una línea `Changed:` que nombra la 011 y su RF-5.

## Requisitos no funcionales

- **Accesibilidad (regla 7).** Los tests de contraste de Button, Input y Textarea siguen en verde
  en los dos temas, ahora pedidos con `data-theme`.
- **Versionado (regla 6).** Ningún paquete se ha publicado (`npm view` da 404 el 2026-10-23), así
  que ningún consumidor tiene el comportamiento anterior: no es `BREAKING CHANGE`. Si el dueño
  publica antes de cerrar la entrega 4, sí lo sería.
- **Dependencias (regla 9).** Ninguna nueva. **Sin JavaScript** en los paquetes para el tema.

## Casos límite

- **`data-theme="light"` dentro de `"system"` o de `"dark"`:** manda el más cercano (RF-2).
- **`data-theme` con otro valor (`"sepia"`):** se ignora y sigue el tema de fuera; sin nada fuera,
  el claro (RF-1).
- **El sistema cambia de oscuro a claro con la página abierta y `data-theme="system"`:** cambia sin
  recargar (RF-3).
- **Una web oscura que no pide el tema:** ve campos claros sobre su fondo, legibles (RF-5).
- **El consumidor de Tailwind con `dark:`:** su clase oscura no cambia los tokens; tiene que pedir
  el tema (README, RF-6).

## Fuera de alcance

- Un tercer tema o temas a medida.
- Cambiar el tema del gestor de Storybook (007).
- Quitar la superficie propia del campo (009): ver `notes.md`.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-7 son tests vistos en rojo una vez inyectando su violación
  (regla 8).
- Button, Input y Textarea se abrieron en `npm run gallery` con «Claro», «Oscuro» y «Sistema»,
  con el sistema en oscuro y en claro.

## Preguntas abiertas

Ninguna.
