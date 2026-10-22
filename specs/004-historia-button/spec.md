# Spec 004 — historia-button

**Status:** implemented
**Approved:** 2026-10-19 · el dueño leyó la spec completa tras 4 rondas de clarify y la partición en 5 · 96 lines, 11 RF
**Implemented:** 2026-10-22 · 10 tareas en 4 olas con worktrees y merges locales, más 3 correcciones tras la validación; validada por el reviewer en 2 vueltas; `npm test` 206/206 (+1 omitido)
**Size:** L · **Entrega:** 2 (002–005) · **Depende de:** 003

## Contexto y objetivo

La regla 5 pide que cada componente exportado tenga su historia: uso, construcción y cómo
alterarlo, con controles en vivo donde el framework se renderiza en el cliente y, en Astro, cada
variante prerenderizada con su código de uso. La regla 10 pide esa documentación en español y en
inglés. En `legacy` no había controles en vivo y los snippets enseñaban Tailwind. Esta spec trae
un Storybook mínimo con la historia de Button; la 005 lo completa. El dueño eligió **Storybook
oficial**: Astro, que Storybook no soporta, se muestra prerenderizado. La prop de clase tiene un
control cerrado con la clase de ejemplo `my-button`, cuyo CSS se enseña.

## Definiciones

- **Galería** — el Storybook del repo. **Historia** — un componente en un framework, con su página
  de documentación: secciones uso, construcción y cómo alterarlo.
- **Control** — un campo de Storybook que cambia una prop. **Código de uso** — todo snippet que la
  documentación ofrece para copiar.
- **Clase de ejemplo** — una clase que la historia define y cuyo CSS enseña (`my-button`); no está
  en la hoja del paquete.
- **Framework renderizado en el cliente** — uno que Storybook re-renderiza en el navegador: React.

## Historias de usuario

- US-1: Como lector, quiero cambiar las props de Button en vivo en React y ver cada variante en
  Astro.
- US-2: Como lector, quiero copiar el código de uso a un proyecto sin Tailwind y que funcione.

## Requisitos (EARS)

- RF-1: EL SISTEMA tiene, por cada componente exportado, una historia por framework bajo el mismo
  nombre. — **Check:** un test recorre los exports y falla si a uno le falta su historia (regla 5).
- RF-2: EL SISTEMA documenta cada componente con uso, construcción y cómo alterarlo, en español y
  en inglés. — **Check:** un test falla si falta una sección en un idioma (reglas 5 y 10).
- RF-3: EL SISTEMA da en cada historia React un control por prop del contrato que no es evento, con
  los valores que el contrato admite; el de clase, cerrado a «ninguna» y sus clases de ejemplo. —
  **Check:** un test falla si falta uno, si una variante no es lista cerrada o si el de clase ofrece
  otra cosa.
- RF-4: CUANDO el lector cambia un control, EL SISTEMA re-renderiza el componente con ese valor. —
  **Check:** en un navegador, cada control cambia el atributo, la clase o el texto de Button React.
- RF-5: EL SISTEMA prerenderiza en la historia Astro cada variante, normal y `disabled`, con el
  componente real y texto de ejemplo en props obligatorias. — **Check:** un test falla si falta un
  render, si su HTML no es el del componente o si no tiene nombre accesible (reglas 5 y 7).
- RF-6: EL SISTEMA acompaña cada variante prerenderizada con su código de uso. — **Check:** un test
  falla si a una le falta, o si su código de uso nombra otra variante.
- RF-7: EL SISTEMA muestra en cada código de uso el import del componente y el de la hoja. —
  **Check:** un test lee los códigos de uso de los dos frameworks y falla si falta uno (regla 2).
- RF-8: EL SISTEMA muestra en los códigos de uso solo props del contrato y clases del paquete o de
  ejemplo de esa historia. — **Check:** un test, también en «cómo alterarlo», falla ante otra prop o
  clase.
- RF-9: EL SISTEMA muestra el CSS de cada clase de ejemplo junto a su control y en «cómo
  alterarlo». — **Check:** un test falla si una clase de ejemplo usada no lo tiene en los dos
  sitios.
- RF-10: EL SISTEMA importa en la galería componentes y hoja solo por `@component-museum/...`. —
  **Check:** un test falla ante una ruta relativa o absoluta a un paquete, o un import que no
  resuelve (regla 1); no mira a dónde resuelve, porque el paquete Astro publica su fuente.
- RF-11: CUANDO esta spec se implementa, EL SISTEMA cambia en la constitución y `AGENTS.md` las
  marcas «pendiente» por los nombres de paquetes, entradas, versionado, galería y comandos. —
  **Check:** un test une cada archivo en una línea; hoy halla 4 `pendientes? de la spec de
  arquitectura` fuera de `Changed:`; al terminar, 0.

## Requisitos no funcionales

- **Dependencias (regla 9).** Storybook, sus addons y el prerenderizado de Astro son dependencias de
  desarrollo de la galería, nunca de un paquete. Motivo de Storybook: da historias, controles y
  documentación sin una galería propia, que en `legacy` quedó sin controles en vivo.

## Casos límite

- **Dos idiomas sin selector.** Hasta la 005, la documentación muestra las dos versiones seguidas;
  una sección sin traducir hace fallar RF-2, sin relleno del otro idioma.
- **Clase de ejemplo.** Su CSS va sin capa, como el de un consumidor, y gana a Button (003, RF-8).
- **Prop de texto vacía.** Deja el Button de React sin texto, sin error (RF-4).
- **Props que no son variantes en Astro.** Se renderizan con su valor por defecto o un texto de
  ejemplo (RF-5); una variante nueva sin su render hace fallar RF-5.

## Fuera de alcance

- Selector de idioma, tema en la galería, código de uso en vivo y matriz de frameworks (005).
- Controles en vivo para Astro, hasta que Storybook soporte Astro de forma oficial.
- Desplegar la galería en un dominio público.

## Hecho cuando

- El build de Storybook y el comando de la 001 terminan en 0.
- RF-1 a RF-3 y RF-5 a RF-11 son tests vistos en rojo una vez inyectando su violación (regla 8).
- RF-4 se verificó en un navegador con viewport explícito, en los dos temas, desde el servidor de
  desarrollo de Storybook.

## Preguntas abiertas

Ninguna.
