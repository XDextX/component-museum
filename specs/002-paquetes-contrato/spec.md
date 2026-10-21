# Spec 002 — paquetes-contrato

**Status:** approved
**Approved:** 2026-10-19 · el dueño leyó la spec completa tras 4 rondas de clarify y la partición en 5 · 92 lines, 10 RF
**Changed:** 2026-10-20 · RF-11 (paso de atributos HTML) · decisión del dueño
**Size:** L · **Entrega:** 2 (002–005) · **Depende de:** 001

## Contexto y objetivo

El dueño quiere instalar el paquete de su framework e invocar los componentes «sin preocupación
alguna», en Astro y en React, con los mismos nombres. En `legacy` el paquete Astro imponía
Tailwind, `astro`, `@astrojs/check` y `typescript` como `dependencies` y necesitaba
`ssr.noExternal`; React tenía 1 componente frente a 23, sin contrato que los atara. Esta spec crea
los dos paquetes y el contrato común, con Button como único componente. El dueño eligió **una
implementación por framework**: contrato y CSS comunes, Button escrito a mano en cada uno. Scope
de npm: `@component-museum`; si está ocupado, se vuelve a preguntar al dueño.

## Definiciones

- **Paquete** — lo que se publica en npm para un framework. Hay dos: Astro y React.
- **Contrato** — la definición única, por componente, de sus props, variantes y eventos, legible
  por una máquina.
- **Prop de clase** — la prop con la que el consumidor añade clases propias: `class` en Astro,
  `className` en React (RF-10).
- **Consumidor externo** — el de la 001.

## Historias de usuario

- US-1: Como consumidor, quiero instalar el paquete de mi framework e importar su hoja de estilos
  una vez para usar Button sin configurar nada más.
- US-2: Como consumidor de Astro y React, quiero que Button tenga la misma API en los dos.

## Requisitos (EARS)

- RF-1: EL SISTEMA produce un paquete npm para Astro y otro para React, bajo `@component-museum`.
  — **Check:** cada paquete empaquetado se llama `@component-museum/<algo>` y trae entrada, hoja
  de estilos y declaraciones de tipos.
- RF-2: EL SISTEMA exporta desde la entrada de cada paquete cada componente con carpeta en él y
  contrato. — **Check:** un test cruza carpetas, exports y contratos comunes; falla si uno tiene
  un componente que otro no (regla 3).
- RF-3: CUANDO un consumidor externo instala su paquete e importa la hoja una vez, EL SISTEMA
  compila sin plugin, config ni dependencia añadida. — **Check:** por framework, el build del
  consumidor, con la configuración del starter sin tocar, termina en 0.
- RF-4: EL SISTEMA no declara más dependencia que su framework. — **Check:** un test falla si
  `dependencies`, `peerDependencies` u `optionalDependencies` tienen otra cosa (regla 9).
- RF-5: EL SISTEMA entrega los tipos de las props de cada componente. — **Check:** en el consumidor
  externo, una `variant` inexistente en Button hace fallar su comprobación de tipos (001).
- RF-6: EL SISTEMA define una sola vez el contrato de cada componente, común a los paquetes. —
  **Check:** un test falla si un componente exportado no tiene contrato o tiene más de uno.
- RF-7: EL SISTEMA implementa en cada framework la API del contrato traducida: props propias y
  variantes con su nombre, eventos por RF-8, clase por RF-10. — **Check:** un test traduce el
  contrato y falla ante una prop propia, variante, evento o clase que falte o sobre, sin contar los
  atributos HTML heredados (regla 4).
- RF-8: EL SISTEMA nombra cada evento `<e>` del contrato como `museum:<componente>:<e>` (evento
  DOM) en Astro y `on<E>` en React. — **Check:** un test deriva los nombres y falla ante uno
  distinto, ausente o extra. Button declara `click`: `museum:button:click` y `onClick`.
- RF-9: EL SISTEMA renderiza Button con el mismo elemento, clases y atributos ARIA para las mismas
  props en los dos frameworks. — **Check:** un test compara cada variante en ambos; 0 diferencias.
- RF-10: EL SISTEMA nombra la prop de clase `class` en Astro y `className` en React. — **Check:**
  un test falla si una implementación no acepta su nombre o acepta el del otro framework.
- RF-11: EL SISTEMA pasa tal cual al `<button>` cada atributo HTML que no es prop del contrato. —
  **Check:** en los dos frameworks, `data-x`, `aria-label` e `id` llegan al `<button>` renderizado.

## Requisitos no funcionales

- **Dependencias (regla 9).** Cada dependencia de desarrollo lleva su motivo escrito antes de
  añadirse; `typescript` y `@astrojs/check` lo tienen en la 001.
- **Publicación.** Solo el dueño publica en npm, y solo al cerrar la entrega 2 (`AGENTS.md`).
- **Versionado (regla 6).** Cada paquete se versiona por separado desde Conventional Commits.
- **Plataformas.** Las versiones de Astro, React y Node las fija el plan; cada manifiesto las
  declara.

## Casos límite

- **Atributo frente a prop del contrato.** `type`, `disabled`, `variant` y `size` solo entran por su
  prop; la clase del consumidor se suma a la del componente; los atributos que el componente pone
  para sí ganan al del consumidor (RF-11).
- **Hoja de estilos vacía.** En esta spec la hoja existe y se importa (RF-1, RF-3), pero la llena
  la 003.
- **`astro check` en el consumidor.** El starter de Astro no lo trae: el test lo añade solo para
  RF-5, y RF-3 se mide sin él.

## Fuera de alcance

- Estilos, temas y personalización (003); historia de Button (004); galería completa (005).
- Input, Textarea, Checkbox, Radio, Select y FormField: specs posteriores con este contrato.
- Vue, Svelte, Web Components, Next.js y cualquier otro framework.
- Migrar código de `legacy`: se lee como referencia, no se copia sin spec.

## Hecho cuando

- El build de cada paquete y el de cada consumidor externo terminan en 0, y el comando de la 001.
- RF-1 se comprobó en cada paquete empaquetado.
- RF-2, RF-4 y RF-6 a RF-11 son tests vistos en rojo una vez inyectando su violación (regla 8).
- RF-5 se verificó en cada consumidor externo con su comprobación de tipos.

## Preguntas abiertas

Ninguna.
