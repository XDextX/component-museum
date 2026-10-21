# Tareas 002 — paquetes-contrato

**Approved:** 2026-10-20 · el dueño aprobó el plan y las 9 tareas (la T-9 espera al RF del paso de atributos HTML)

Paso de cierre de la entrega 2, no de esta spec: el dueño crea la organización npm
`component-museum` antes de publicar (plan, «Decisiones del dueño»).

- [x] **T-1 — Escribir el contrato de Button y su guarda**
  Cubre: RF-6
  Archivos: `contracts/button.contract.json`, `tests/lib/contract.ts`, `tests/contract.test.ts`
  Hecho cuando: el contrato recoge la API propuesta en el plan, aprobada con él; `eventName`, `classProp`,
  `contentProp` y `expectedApi` tienen sus tests como dato; el test falla si un componente no
  tiene contrato o tiene más de uno en el repo.
  Inyección: una copia de `button.contract.json` en otra carpeta pone el test en rojo.
  Inyección vista: copiar `button.contract.json` a `tests/fixtures/dup-inject/` puso el test en rojo («Button has 2 contracts»); restaurado, mismo sha256.

- [x] **T-2 — Crear el paquete de React con Button**
  Cubre: RF-1 (React), RF-4 (React)
  Archivos: `packages/react/`, `package.json` (raíz: `react`, `react-dom`, `@types/react`, script
  `test` que compila el paquete), `tsconfig.json`, `.gitignore` (`dist/`), `tests/packages.test.ts`
  Hecho cuando: `npm test` compila `dist/`; el paquete empaquetado se llama
  `@component-museum/react` y trae entrada, `styles.css` y `.d.ts`; el manifiesto solo tiene
  `react` como peer.
  Inyección: añadir `left-pad` a `dependencies` de `packages/react/package.json` → el test de RF-4
  en rojo (`expected { dependencies: [ 'left-pad' ], … } to deeply equal { dependencies: [], … }`),
  exit 1; manifiesto restaurado, idéntico según `cmp`.

- [x] **T-3 — Crear el paquete de Astro con Button**
  Cubre: RF-1 (Astro), RF-4 (Astro)
  Archivos: `packages/astro/` (con su propio `tsconfig.json`, como la fixture de la 001),
  `package.json` (script `test` con `astro check --root packages/astro`), `tests/packages.test.ts`
  Hecho cuando: `astro check` sobre el paquete termina en 0; el paquete empaquetado se llama
  `@component-museum/astro` y trae entrada, `styles.css` y tipos; el manifiesto solo tiene `astro`
  como peer y la palabra clave `astro-component`.
  Inyección: quitar `index.d.ts` de `files` de `packages/astro/package.json` → el test de RF-1 en
  rojo (`./index.d.ts is not in the packed files`), exit 1; manifiesto restaurado, idéntico según
  `cmp`.

- [x] **T-4 — Comprobar cada implementación contra el contrato**
  Cubre: RF-7, RF-8, RF-10
  Archivos: `tests/lib/api.ts`, `tests/contract.test.ts`
  Hecho cuando: las props **propias** de los dos Button (las declaradas en su archivo, sin los
  atributos HTML heredados de `@types/react` o de `astro`), leídas con la API de TypeScript,
  coinciden con `expectedApi`; React expone `onClick` y `className` y no `class`; Astro despacha solo
  `museum:button:click` y acepta `class` y no `className`.
  Inyección: renombrar `onClick` a `onPress`, añadir una prop propia `foo`, quitar `size` de las
  propias y aceptar `class` en React, una cada vez, ponen el test en rojo.
  Inyección vista: en memoria, por el mismo declaredProps/diffApi/eventLiterals del test y sin tocar `packages/`: en React, `onClick`→`onPress`, una prop `foo`, sin `size`, aceptar `class` y una `on*` extra; en Astro, una prop `foo`, `className` en `OwnProps` y el literal `museum:button:press`. Cada una puso en rojo su assert (props propias, RF-10 o eventos).

- [x] **T-5 — Cruzar carpetas, exports y contratos**
  Cubre: RF-2
  Archivos: `tests/packages.test.ts`
  Hecho cuando: por paquete, las carpetas de `src/`, los exports de la entrada y los contratos
  nombran los mismos componentes.
  Inyección: quitar el export de Button de una entrada, o crear una carpeta `src/Ghost/`, ponen el
  test en rojo.
  Inyección vista: crear `packages/react/src/Ghost/` → rojo con «Ghost has no export» y «Ghost has no contract»; vaciar `packages/astro/index.js` → rojo con «Button has no export»; restaurado por ruta, mismo sha256, carpeta borrada.

- [x] **T-6 — Compilar los paquetes en los consumidores externos**
  Cubre: RF-3
  Archivos: `tests/global-setup.ts`, `tests/lib/consumer.ts`, `tests/consumer.test.ts`
  Hecho cuando:
  - Los consumidores sin tocar instalan además el paquete de su framework, importan Button y la
    hoja, y su build termina en 0 con la configuración del starter idéntica a la original.
  - Los dos consumidores con guarda de la 002 (`cm-<runId>-pkg`) también compilan, según la nota
    de `notes.md`.
  - Los 36 tests de la 001 siguen en verde.
  - El tiempo de `npm test` se mide antes y después, y se reporta.
  Inyección: una copia del paquete con un `import 'museum-undeclared'` no declarado, y ese módulo
  instalado en el `node_modules` del padre del consumidor, hace fallar el build con guarda; el
  consumidor sin tocar no lo detecta, que es la razón de la nota.
  Inyección vista: copias de los dos paquetes con `import 'museum-undeclared'` y el módulo en el `node_modules` del padre (script fuera del repo) → en React y Astro, el build sin tocar termina en 0 y el build con guarda en 1 («resolves outside the consumer»); el repo no se tocó.

- [x] **T-7 — Romper la comprobación de tipos del consumidor con una variante inexistente**
  Cubre: RF-5
  Archivos: `tests/global-setup.ts` (`@astrojs/check` y `typescript` solo en el consumidor con
  guarda de Astro), `tests/consumer.test.ts`
  Hecho cuando: con `<Button variant="nope">`, `tsc -b` en el consumidor de React y `astro check`
  en el de Astro terminan en distinto de 0; sin ese archivo, en 0.
  Inyección: escribir la `variant` como `string` en las dos implementaciones deja pasar `"nope"` y
  pone el test en rojo.
  Inyección vista: copias de los dos paquetes fuera del repo con `variant?: string` en `Button.tsx` y `Button.astro` → con `<Button variant="nope">`, `tsc -b` (React) y `astro check` (Astro) terminan en 0 y el test de RF-5, que exige distinto de 0, se pone en rojo; `packages/` no se tocó.

- [x] **T-8 — Comparar el HTML de los dos Button**
  Cubre: RF-9
  Archivos: `tests/markup.test.ts`, `tests/lib/browser.ts`
  Hecho cuando: por cada variante y tamaño, el elemento, las clases ordenadas y los atributos
  `aria-*`, `disabled` y `type` de React (`renderToStaticMarkup`) y de Astro (el `dist/index.html`
  del consumidor) coinciden, tras normalizar `data-astro-*`.
  Inyección: añadir una clase solo en React pone el test en rojo.
  Inyección vista: en copias temporales, sin tocar `packages/`: `className: 'injected'` solo en React → rojo con «injected» en las clases de las 9 combinaciones; `title: 'injected'` solo en React → rojo con el atributo de más en las 9. Se comparan todos los atributos salvo `data-astro-*` y `data-museum-button` (gancho del script de Astro; React no lo emite).

- [ ] **T-9 — Pasar los atributos HTML al `<button>` y resolver los choques**
  Cubre: RF-11
  Archivos: `packages/react/src/Button/Button.tsx`, `packages/astro/src/Button/Button.astro`,
  `tests/markup.test.ts`
  Hecho cuando:
  - `data-x`, `aria-label` e `id` llegan al `<button>` en los dos frameworks (Edge, como en la T-8).
  - Una clase del consumidor se suma a las del componente y no las sustituye.
  - Un `data-museum-button` del consumidor no pisa el del componente en Astro.
  - Las props del contrato (`type`, `disabled`) solo se aceptan por su prop: el tipo no admite un
    segundo `type` heredado.
  Inyección: aplicar los atributos libres después de los propios del componente deja que el del
  consumidor pise `data-museum-button` y pone el test en rojo.

  Va la última porque comparte con la T-8 el render en los dos frameworks.

