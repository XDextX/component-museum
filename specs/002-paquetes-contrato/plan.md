# Plan 002 — paquetes-contrato

**Approved:** 2026-10-20 · el dueño aprobó el plan y las 9 tareas (la T-9 espera al RF del paso de atributos HTML)

Parte de `spec.md` (aprobada, 10 RF) y de `notes.md`. Se apoya en la base de la 001: `npm test`
con candado, `createConsumer` (consumidor sin tocar o con `guardResolution`), Edge sin JavaScript,
y `tsc --noEmit` y `astro check`. Versiones comprobadas en npm el 2026-10-19.

## Decisiones del dueño (2026-10-20)

- **Atributos HTML de Button: todos, como en `legacy`.** Cualquier atributo HTML pasa tal cual al
  `<button>`. Descartadas: una lista cerrada (`id`, `name`, `value`, `form`, `aria-*`, `data-*`) y
  ninguno.
- **Organización npm `component-museum`: se crea al cerrar la entrega 2.** No bloquea las tareas,
  porque nada se publica antes. Es un paso de cierre de la entrega 2: el dueño la crea con su
  cuenta antes de publicar. Hoy `npm view` da 404 para `@component-museum/react` y
  `@component-museum/astro`, y npm responde 403 a la página de la organización. Si al cerrar no se
  puede crear, se vuelve a preguntar, sin caer a otro scope.

## API de Button propuesta (la aprueba el dueño con el plan)

Tomada del Button de `legacy`; es contrato público (regla 6).
- `variant`: `primary | secondary | outline`, por defecto `primary`.
- `size`: `sm | md | lg`, por defecto `md`.
- `disabled`: booleano, por defecto `false`.
- `type`: `button | submit | reset`, por defecto `button`.
- Contenido: el slot por defecto en Astro y `children` en React, por regla fija, como la clase.
- Evento `click`.
- Cualquier otro atributo HTML pasa al `<button>` (decisión de arriba). No forma parte del
  contrato: el contrato lista las props **propias**.

## 1. Alcance y cobertura

| RF | Qué lo cubre |
|---|---|
| RF-1 | Dos paquetes, `packages/astro` y `packages/react`; un test empaqueta cada uno y lee su lista de archivos. |
| RF-2 | Test que cruza carpetas de componentes, exports de cada entrada y contratos. |
| RF-3 | Los consumidores sin tocar de la 001 instalan además el paquete de su framework y compilan. |
| RF-4 | Test que lee los manifiestos y solo admite el framework como peer. |
| RF-5 | En el consumidor con guarda de la 002, una `variant` inexistente rompe `tsc` (React) y `astro check` (Astro). |
| RF-6 | Un solo `contracts/button.contract.json`; un test busca contratos en todo el repo. |
| RF-7 | Test que traduce el contrato y lo compara con las props **propias** declaradas, leídas con la API de TypeScript, sin los atributos HTML heredados. |
| RF-8 | Regla de nombres pura (`eventName`) y un test sobre las dos implementaciones. |
| RF-9 | Button React renderizado con `react-dom/server` frente al HTML del build del consumidor Astro, comparados en Edge. |
| RF-10 | Regla pura (`classProp`) y comprobación dentro del test de RF-7. |
| RF-11 | Test en Edge de que `data-x`, `aria-label` e `id` llegan al `<button>`, y de quién gana en un choque (T-9). |

La nota de `notes.md` también se cubre: los dos paquetes compilan además en un consumidor con
guarda propio de la 002 (T-6).

## 2. Archivos

| Archivo | Nuevo | Responsabilidad |
|---|---|---|
| `contracts/button.contract.json` | sí | La API de Button, una sola vez: props, valores, por defecto, eventos, si tiene contenido y clase. No se publica. |
| `packages/react/package.json` | sí | Nombre con scope, `exports` (entrada, tipos, `./styles.css`), `files`, peer `react`. |
| `packages/react/src/Button/Button.tsx` | sí | Button de React escrito a mano según el contrato. |
| `packages/react/src/index.ts` | sí | La entrada: exporta cada componente. |
| `packages/react/tsconfig.build.json` | sí | Compila `src/` a `dist/` (ESM, `.d.ts`, `jsx: react-jsx`). |
| `packages/astro/package.json` | sí | Nombre con scope, `exports`, peer `astro` y palabra clave `astro-component`. |
| `packages/astro/src/Button/Button.astro` | sí | Button de Astro escrito a mano; emite `museum:button:click`. |
| `packages/astro/index.js` / `index.d.ts` | sí | La entrada y sus tipos. |
| `packages/*/styles.css` | sí | La hoja que se importa una vez; vacía hasta la 003. |
| `tests/lib/contract.ts` | sí | Lee contratos y traduce nombres por framework (lógica pura). |
| `tests/lib/api.ts` | sí | Extrae, con la API de TypeScript, las props que declara cada implementación. |
| `tests/contract.test.ts` | sí | RF-6, RF-7, RF-8, RF-10. |
| `tests/packages.test.ts` | sí | RF-1, RF-2, RF-4. |
| `tests/markup.test.ts` | sí | RF-9. |
| `tests/global-setup.ts`, `tests/consumer.test.ts`, `tests/lib/consumer.ts` | modificado | Instalar los paquetes en los consumidores y crear los dos consumidores con guarda de la 002 (RF-3, RF-5). |
| `package.json` | modificado | Script `test` que construye los paquetes antes de comprobar, y las dependencias nuevas. |
| `tsconfig.json` | modificado | Incluye `packages/react/src` y `tests/lib/**`. |

## 3. Lógica pura

```ts
type Framework = 'react' | 'astro'
type Contract = { name: string; props: Record<string, PropSpec>; events: string[];
                  content: boolean; classProp: boolean }
type PropSpec = { type: 'enum'; values: string[]; default: string } | { type: 'boolean'; default: boolean }
// 'museum:button:click' en Astro; 'onClick' en React.
eventName(framework: Framework, component: string, event: string): string
// 'class' en Astro; 'className' en React.
classProp(framework: Framework): string
// El contenido: null en Astro (slot); 'children' en React.
contentProp(framework: Framework): string | null
// Las props que debe declarar una implementación: las del contrato, más la de clase, los
// eventos y el contenido, cada uno con su nombre traducido.
expectedApi(contract: Contract, framework: Framework): Record<string, string[] | 'boolean' | 'any'>
// Diferencias entre lo esperado y lo declarado; vacía si coinciden.
diffApi(expected: Api, declared: Api): string[]
```

## 4. Algoritmo

**Props declaradas (RF-7, RF-10).** Con el compilador de TypeScript (ya instalado):
- **React:** `ButtonProps` es `ButtonOwnProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>,
  keyof ButtonOwnProps>`. El test lista las propiedades de `ButtonProps`, se queda con las que se
  declaran en el propio `Button.tsx` (el archivo de su declaración) y descarta las heredadas de
  `@types/react`.
- **Astro:** `interface Props extends Omit<HTMLAttributes<'button'>, keyof OwnProps>`, con las
  propias declaradas en el frontmatter. El test lo compila como TypeScript y descarta las que se
  declaran en los tipos de `astro`.
- Una unión de literales da los valores de cada prop.

`diffApi(expectedApi(contrato, fw), propias)` tiene que dar vacío. Así una prop propia de más o de
menos sigue poniendo el test en rojo, aunque los atributos HTML sean libres.

**Contrato y atributos heredados a la vez:** `onClick` y `children` (React) y `class` (Astro)
existen ya como atributos HTML. El componente los declara también como propios, para que el test
los vea; si alguno faltara entre las propias, el test lo da como ausente. Para RF-10, el test
mira las props **completas**: React no puede aceptar `class` y Astro no puede aceptar
`className`. Si los tipos de un framework trajeran el nombre del otro, el `Omit` lo quita.

**Eventos (RF-8).**
- **React:** sus props `on*` son exactamente `eventName('react', …)` de cada evento.
- **Astro:** el componente lleva un script que, en el `click` nativo, despacha
  `new CustomEvent('museum:button:click', { bubbles: true })`. El test busca en la fuente todos los
  literales `museum:<c>:<e>` y exige que el conjunto sea igual al derivado.

**Consumidores (RF-3, RF-5).** El `globalSetup` añade a cada consumidor sin tocar el tarball de su
paquete en la misma instalación que el paquete de prueba. También añade a su entrada el import
del componente, el de la hoja, y una instancia por variante con un `id` estable. Además crea, en
paralelo con los otros cuatro, un consumidor con guarda por framework solo para la 002
(`cm-<runId>-pkg`). Al de Astro le instala `@astrojs/check` y `typescript`, solo para RF-5; RF-3
se mide en el consumidor sin tocar. RF-5 escribe un archivo con
`<Button variant="nope">`, corre `tsc -b` (React) o `astro check` (Astro), exige distinto de 0 y
borra el archivo.

**Mismo HTML (RF-9).** Por variante:
- **React:** `renderToStaticMarkup(createElement(Button, props, 'Label'))`.
- **Astro:** el elemento con ese `id` en el `dist/index.html` del consumidor Astro.

Las dos cadenas se cargan en Edge y se extrae el nombre del elemento, la lista de clases ordenada
y los atributos `aria-*` y `disabled`/`type`. Se normalizan los `data-astro-*` y los ids, y el
resultado tiene que tener 0 diferencias.

**Atributos libres y choques (T-9).** Por framework, Button se renderiza con `data-x="1"`,
`aria-label="Etiqueta"` e `id="b1"` (React con `renderToStaticMarkup`; Astro en la página del
consumidor), y en Edge se comprueba que los tres llegan al `<button>`. Los choques se resuelven
así:
- Las props del contrato (`type`, `disabled`, `variant`, `size`) no chocan: van por su prop, nunca
  por los atributos libres, porque el `Omit` las quita de los heredados.
- La clase del consumidor (`className` o `class`) **se suma** a las clases del componente; no las
  sustituye. Lo exige la 003 (RF-8).
- Los atributos que el componente pone para sí mismo y que no son del contrato (el gancho
  `data-museum-button` del script de Astro) **ganan** al del consumidor, porque el evento
  depende de ellos. El componente aplica primero los atributos libres y después los suyos.

**Build de los paquetes.** El script `test` pasa a ser
`tsc -p packages/react/tsconfig.build.json && tsc --noEmit && astro check --root
tests/fixtures/test-package && astro check --root packages/astro && vitest run`. Así cada
ejecución empaqueta un `dist/` fresco. `dist/` va a `.gitignore`.

## 5. Interfaz

- **El consumidor** escribe `import { Button } from '@component-museum/react'` (o `…/astro`) e
  `import '@component-museum/<fw>/styles.css'`, sin tocar su configuración (RF-3).
- **Atributos libres:** el consumidor puede pasar cualquier atributo HTML (`id`, `name`,
  `aria-*`, `data-*`, `form`…) y llega al `<button>`.
- **Button sin estilos todavía:** la hoja está vacía hasta la 003; Button se ve como un `<button>`
  nativo, y eso no es un fallo de esta spec.
- **Mensajes de los tests:**
  - RF-7 lista las diferencias («missing prop size», «extra prop foo», «variant values differ»).
  - RF-4 nombra la dependencia que sobra.
  - RF-2 nombra el componente que falta y dónde falta.

## 6. Decisiones

| Decisión | Alternativa descartada y motivo |
|---|---|
| **El contrato es JSON en `contracts/`, fuera de los paquetes.** Lo leen los tests, nunca los paquetes. | Un paquete `@component-museum/contract` del que dependan los dos: sería una dependencia impuesta (RF-4). Un `.ts` importado por los paquetes: rompe el empaquetado. |
| **Atributos HTML libres** (decisión del dueño), con `Omit` de las props propias para que no se dupliquen. | Una lista cerrada de atributos, o ninguno: los descartó el dueño. |
| **RF-7 compara solo las props propias**, separadas de las heredadas por el archivo donde se declaran. | Comparar las props completas: los atributos HTML libres darían cientos de «props de más». Exigir un tipo `OwnProps` exportado aparte: obliga a una convención que el test no puede comprobar mejor. |
| **La clase del consumidor se suma; los atributos propios del componente ganan.** | Que el consumidor sustituya la clase: rompería los estilos del paquete y la 003. Que el consumidor gane siempre: rompería el evento de Astro. |
| **Tipos escritos a mano y comprobados contra el contrato** con la API de TypeScript. | Generar los tipos desde el contrato: añade un paso de build y contradice «escrito a mano en cada uno» (decisión del dueño). |
| **React compila con `tsc` a `dist/`** (ESM y `.d.ts`). `typescript` ya está. | Un bundler (tsup, Vite en modo librería): una dependencia nueva para lo que `tsc` ya hace. Publicar `.tsx` fuente: un consumidor sin Vite no lo entiende. |
| **Astro publica la fuente `.astro`**, con `astro` en `peerDependencies`. El código de Astro 7.4.1 (`isFrameworkPkgByJson`) compila esos paquetes sin `ssr.noExternal`, lo que arregla el fallo de `legacy`. | Precompilar `.astro`: Astro no lo admite para componentes. |
| **Peer de React: solo `react` `^19.0.0`.** El paquete importa `react/jsx-runtime` y nunca `react-dom`; la app ya trae el suyo. | `react` y `react-dom`: se impondría una dependencia que el paquete no usa. Admitir React 18: nadie lo pidió, y el starter de la 001 trae React 19. |
| **Peer de Astro: `astro` `^7.0.0`**, la versión del starter fijado. | `^6 \|\| ^7`: sin consumidor de prueba para la 6. |
| **Sin workspaces de npm todavía.** Los tests empaquetan desde la ruta del paquete. | Declararlos ahora: enlazarían los paquetes en el `node_modules` de la raíz, justo lo que la 001 trata de que no se cuele; la galería de la 004 los decidirá. |
| **Los paquetes se instalan en los consumidores sin tocar existentes**, y hay dos consumidores con guarda nuevos solo para la 002. | Cuatro consumidores nuevos: unos 20–40 s más por ejecución. Reusar los consumidores con guarda de la 001: su paquete de prueba importa un módulo no declarado, y su build falla a propósito. |
| **RF-9 compara en Edge** el HTML de React en el servidor con el del build de Astro. | La Container API de Astro: experimental y necesita el Vite de Astro dentro de Vitest. |
| **El versionado** (regla 6) lo nombra la 004 (su RF-11); aquí los dos paquetes empiezan en `0.1.0`. | Elegir ahora la herramienta: nada se publica hasta cerrar la entrega 2. |

**Dependencias de desarrollo nuevas (regla 9).** Todas en la raíz; ninguna llega a un consumidor.
- `react` 19.3.1 y `@types/react` 19.3.0 — compilar y comprobar los tipos del Button de React.
- `react-dom` 19.3.1 — `renderToStaticMarkup` en RF-9.

**Dependencias de los paquetes.** Solo el framework, como peer (RF-4):
- `@component-museum/react` → `react ^19.0.0`.
- `@component-museum/astro` → `astro ^7.0.0`.

## 7. Estrategia de tests

- **Como dato:** contrato (RF-6), API traducida (RF-7, RF-8, RF-10), exports (RF-2), manifiestos y
  empaquetado (RF-1, RF-4).
- **Con build y comprobación de tipos en consumidores externos:** RF-3 en los consumidores sin
  tocar y en los de guarda de la 002, y RF-5.
- **Como output renderizado, en Edge:** RF-9.
- **Inyección prevista por tarea:** cada tarea de `tasks.md` la nombra en su línea «Inyección:»,
  y el commit dice cuál se vio en rojo (regla 8).
- **Tiempo:** dos consumidores más en paralelo y el build de los paquetes. Se mide y se reporta
  en la T-6.
- **Proporción:** 8 tareas para 10 RF. Lo más pesado es RF-9, la única comparación en navegador.
