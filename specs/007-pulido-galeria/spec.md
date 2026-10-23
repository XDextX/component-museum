# Spec 007 — pulido-galeria

**Status:** implemented · **Approved:** 2026-10-22 · el dueño, tras 2 rondas de clarify
**Implemented:** 2026-10-22 · 6 tareas en 2 olas con worktrees, más 3 correcciones tras el merge (guarda de la regla 7 limitada a los Button del museo, tipos de la T-2, color del texto de la página en oscuro); validada por el reviewer en 1 vuelta; `npm test` 314/314 (+1 omitido)
**Size:** M (7 RF) · **Entrega:** 3 (abre con esta spec) · **Depende de:** 005

## Contexto y objetivo

Un recorrido por la galería como usuario (Storybook, 2026-10-22) encontró seis fallos de uso. Cinco
se reprodujeron en Edge y uno solo con barra de scroll clásica:
- la tabla de props de Button no muestra los valores por defecto, aunque el contrato los tiene;
- los botones «Español | English» son botones nativos sin estilo;
- la barra de Storybook trae fondos, rejilla, medir y contornos junto al tema de la galería, y su
  fondo «light» compite con él;
- con el tema oscuro, el lienzo se ve oscuro pero la página de documentación sigue blanca;
- el código de uso de Astro no tiene resaltado ni botón de copiar;
- la página puede desbordar en horizontal en pantallas estrechas.

Esta spec deja la galería coherente con su propio tema y fácil de leer, sin tocar los paquetes ni
lo que se publica.

## Definiciones

- **Página de documentación** — `Button/Documentation`, en Storybook.
- **Tema de la galería** — el selector «Sistema | Claro | Oscuro» de la 005.

## Historias de usuario

- US-1: Como lector, quiero ver el valor por defecto de cada prop sin leer la prosa.
- US-2: Como lector, quiero que toda la página, y no solo el lienzo, siga el tema que elijo.
- US-3: Como lector de Astro, quiero copiar el código de uso de una variante con un clic.

## Requisitos (EARS)

- RF-1: EL SISTEMA muestra en la tabla de props el valor por defecto que da el contrato a cada
  prop. — **Check:** en Edge, la página de documentación da `primary`, `md`, `button` y `false` en
  la columna de defaults de `variant`, `size`, `type` y `disabled`.
- RF-2: EL SISTEMA da a los botones del selector de idioma el estilo de la página. — **Check:** en
  Edge y en los dos temas, usan la fuente de la página, sin el borde nativo, y su texto contrasta
  ≥ 4.5:1.
- RF-3: EL SISTEMA marca en el selector de idioma cuál está activo. — **Check:** en Edge, el botón
  activo tiene `aria-pressed="true"` y un fondo distinto del otro, en los dos temas y con las dos
  lenguas.
- RF-4: EL SISTEMA quita de la barra de Storybook los fondos, la rejilla, la medida y los contornos.
  — **Check:** en Edge, la barra del gestor no tiene esos cuatro botones y sí tiene «Tema de la
  galería».
- RF-5: CUANDO el tema de la galería es oscuro, o es «Sistema» con el sistema en oscuro, EL SISTEMA
  pinta oscura la página de documentación entera. — **Check:** en Edge, el fondo de la página es
  oscuro y su texto contrasta ≥ 4.5:1; con «Claro», el fondo es claro.
- RF-6: EL SISTEMA da al código de uso de cada caso Astro resaltado de sintaxis y un botón de
  copiar. — **Check:** en Edge, cada caso tiene marcas de resaltado y un botón que copia
  exactamente su código al portapapeles.
- RF-7: EL SISTEMA no desborda en horizontal la página de documentación ni las historias desde 320
  px de ancho. — **Check:** en Edge, sin emulación de móvil y con barra de scroll clásica, el
  `scrollWidth` no pasa del `clientWidth` a 320 y a 542 px.

## Requisitos no funcionales

- **Accesibilidad (regla 7).** Todo texto nuevo o restilado contrasta ≥ 4.5:1 en los dos temas; los
  botones de idioma y de copiar se alcanzan con teclado, con nombre accesible y foco visible.
- **Dependencias (regla 9).** Ninguna nueva. Si el plan necesitara una, su motivo se escribe aquí
  antes de añadirla.
- **Paquetes.** Ningún cambio en `packages/`, `styles/` ni en lo que se publica.

## Casos límite

- **Tema «Sistema» sin preferencia del sistema:** la página va clara (RF-5).
- **El gestor de Storybook** (barra lateral y de herramientas) sigue con su propio tema: solo la
  página de documentación y las historias siguen al tema de la galería (RF-5).
- **Copiar sin permiso de portapapeles:** el botón no rompe la página, y el código sigue a la vista
  para copiarlo a mano (RF-6).
- **Idioma inglés activo:** el selector marca «English» con el mismo estilo (RF-3).
- **Desborde que venga de Storybook:** si su origen es la propia interfaz de Storybook y no la
  galería, se corrige en la galería con CSS, sin parchear Storybook (RF-7).

## Fuera de alcance

- Descripciones de las props en la tabla: irán en otra spec (decisión del dueño).
- Los imports de cada caso Astro se mantienen, como pide el RF-7 de la 004 (decisión del dueño).
- El tema del gestor de Storybook (barra lateral y barra de herramientas).
- Nuevos componentes y cambios en los paquetes.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-7 son tests vistos en rojo una vez inyectando su violación
  (regla 8).
- Las páginas tocadas se abrieron desde `npm run gallery`, en los dos temas.

## Preguntas abiertas

Ninguna.
