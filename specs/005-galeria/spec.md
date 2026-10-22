# Spec 005 — galeria

**Status:** implemented
**Approved:** 2026-10-19 · el dueño leyó la spec completa tras 4 rondas de clarify y la partición en 5 · 75 lines, 5 RF
**Implemented:** 2026-10-22 · 7 tareas con worktrees y merges locales, más 1 corrección tras la validación (texto del lienzo en tema oscuro); validada por el reviewer en 2 vueltas; `npm test` 234/234 (+1 omitido)
**Size:** M · **Entrega:** 2 (002–005) · **Depende de:** 004

## Contexto y objetivo

La 004 trae un Storybook mínimo con la historia de Button, que ya cumple las reglas 1, 2, 5 y 10.
Esta spec lo completa con lo que lo hace cómodo de recorrer: elegir el idioma, ver cada tema, un
código de uso que sigue a los controles y una matriz de componentes por framework, que es el check
de la regla 4. Por esa matriz, la entrega 2 no se cierra sin esta spec. El dueño decidió que el
código de uso refleja los controles en vivo y que el idioma por defecto es el español.

## Definiciones

- Las de la 004 (galería, historia, control, código de uso, clase de ejemplo).
- **Matriz** — la tabla de componentes por framework que dice cuál existe en cada uno.

## Historias de usuario

- US-1: Como lector, quiero leer la documentación solo en mi idioma, español o inglés.
- US-2: Como lector, quiero copiar el código de uso con los valores que acabo de elegir.
- US-3: Como lector, quiero ver los componentes en tema claro y oscuro, y saber qué falta en cada
  framework.

## Requisitos (EARS)

- RF-1: CUANDO el lector elige un idioma, EL SISTEMA muestra la documentación solo en ese idioma.
  — **Check:** en un navegador, pasar a inglés cambia los títulos de las tres secciones de Button
  y oculta los españoles.
- RF-2: CUANDO el lector cambia un control, EL SISTEMA actualiza el código de uso con el nuevo
  valor. — **Check:** en un navegador, cambiar la variante de Button React cambia la variante
  escrita en su código de uso.
- RF-3: CUANDO el lector cambia el tema de la galería, EL SISTEMA muestra los componentes con ese
  tema. — **Check:** en un navegador, el tema oscuro da los tokens oscuros de la 003 en la historia
  React y en la Astro de Button, y el claro, los claros.
- RF-4: EL SISTEMA muestra una matriz generada a partir de las entradas de los paquetes. —
  **Check:** un test genera la matriz; quitar un export de una entrada lo marca ausente (regla 4).
- RF-5: MIENTRAS el lector no ha elegido idioma, EL SISTEMA muestra la documentación en español. —
  **Check:** en un navegador sin preferencia guardada, Button muestra los títulos en español.

## Requisitos no funcionales

- **Dependencias (regla 9).** Cada addon de Storybook lleva su motivo escrito antes de añadirse; es
  dependencia de desarrollo de la galería, nunca de un paquete.
- **Accesibilidad.** Los selectores de idioma y de tema y la matriz son usables con teclado y
  tienen nombre accesible, verificado en un navegador.

## Casos límite

- **Prop de clase en el código de uso.** Al elegir `my-button`, RF-2 la escribe; lo admite la 004
  (RF-8) porque es una clase de ejemplo con su CSS a la vista (004, RF-9).
- **Astro.** Sin controles, RF-2 solo aplica a React; cada variante Astro tiene su código de uso
  fijo (004, RF-6).
- **Componente que falta en un framework.** La matriz lo marca ausente (RF-4) y no tiene historia
  en ese framework (004, RF-1).

## Fuera de alcance

- Lo que ya entrega la 004: historias, documentación, controles, variantes Astro, imports del código
  de uso y la guarda de la regla 1.
- Controles en vivo para Astro, desplegar la galería y traducir la interfaz propia de Storybook.
- Historias de componentes fuera de Button.

## Hecho cuando

- El build de Storybook y el comando de la 001 terminan en 0; RF-4 es un test visto en rojo una vez
  inyectando su violación (regla 8).
- RF-1 a RF-3 y RF-5 se verificaron en un navegador con viewport explícito, en los dos temas,
  desde el servidor de desarrollo de Storybook.

## Preguntas abiertas

Ninguna.
