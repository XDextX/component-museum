# Notas de la 017 — tests-rapidos

## Respuestas del dueño (2026-10-23)

- Entrega 4, justo después de la 012 y antes de la 013 y la 014; decidido por el dueño.
- Los consumidores se guardan entre ejecuciones (RF-5); decidido por el dueño.

## Medidas (2026-10-23, checkout principal en `spec/012-checkbox`, esta máquina, 12 núcleos)

**Cota alta bajo carga.** Las dos tareas de la 012 corrían su `npm test` en sus worktrees a la vez.
Esa carga tumbó 6 archivos (5 hooks de cierre pasaron de 30 s, y un `git` no arrancó en
`release.test.ts`): 640 tests pasaron, 1 falló y 1 se omitió. No es la base: la primera tarea del
plan la mide en una máquina sin otra carga.

| Fase (`npm test`, en orden) | Segundos |
|---|---|
| `tsc -p packages/react/tsconfig.build.json` | 3.7 |
| `npm run gallery:astro` (`astro build` + extracción) | 38.3 |
| `tsc --noEmit` | 13.4 |
| `tsc --noEmit -p gallery` | 10.0 |
| `astro check` de `tests/fixtures/test-package` | 31.3 |
| `astro check` de `packages/astro` | 6.7 |
| `astro check` de `gallery/astro-render` | 9.0 |
| `vitest run` (`globalSetup` y 44 archivos) | 576.3 |
| **Total** | **688.6 (11 min 29 s)** |

Los archivos más lentos de `vitest run`, en segundos:

| Archivo | Segundos |
|---|---|
| `gallery-browser.test.ts` | 200 |
| `theme.test.ts` | 133 |
| `gallery-story-theme.test.ts` | 91 |
| `gallery-docs-theme.test.ts` | 79 |
| `gallery-overflow.test.ts` | 69 |
| `release.test.ts` | 48 |

Piezas sueltas, medidas con la misma carga:

| Pieza | Segundos |
|---|---|
| `npm run build:packages` | 24.0 |
| un `npm pack ./packages/react --dry-run` | 15.7 |
| el build de Storybook | 64.4 |

La medida del `globalSetup` solo se paró a petición del coordinator, para no tumbar las tareas. El
plan la hace sin carga.

## Recuento del trabajo repetido (leído en el código, `spec/012-checkbox`)

- **El paquete de React se compila unas 7 veces por ejecución:**
  - el `tsc` del script `test`;
  - el `prepack` de `buildGallery` (`tests/global-setup.ts`);
  - un `npm pack` por cada uno de los 3 consumidores con React (plain, package y tailwind), por
    `installPackage` en `tests/lib/consumer.ts`;
  - el de `styles.test.ts`;
  - el `npm pack --dry-run` de `packages.test.ts`, que también ejecuta `prepack`.

  Astro sigue el mismo camino (3 consumidores, más `styles` y `packages`), y `test-package` se
  empaqueta una vez por cada uno de los 8 consumidores.
- **`astro-render` se construye dos veces:** en el script `test` (`gallery:astro`) y en
  `buildGallery`. Son unos 38 s cada vez.
- **Storybook** se construye en cada ejecución (unos 64 s), aunque no haya cambiado nada.
- **Consumidores:** cada ejecución hace dos `npm exec` de los starters fijados y 8 `npm install`
  contra el registro, más el `@astrojs/check` del consumidor de Astro. Todo con red.

## Muestra de inyecciones que tienen que seguir en rojo (NFR)

1. 002, RF-5: una variante fuera del contrato rompe el tipado del consumidor guardado
   (`checkButtonTypes`).
2. 003, RF-7: una regla fuera de la capa `museum`.
3. 006, RF-2: un archivo de más en el tarball.
4. 009, RF-2: la etiqueta sin `htmlFor` en el ayudante de campo.
5. 011, RF-1: el oscuro por `prefers-color-scheme` sin atributo.
6. 007, RF-7: un elemento de 600 px que desborda a 542 px.

Cada una toca un camino que esta spec cambia: el tarball, los consumidores reutilizados, la
galería en caché y la hoja.

## Preguntas para el dueño, con recomendación

1. **¿Entrega?**
   - **Recomendado:** entrega 4, justo tras la 012 y antes de la 013 y la 014. Cada tarea de lo que
     queda pasa `npm test` al menos dos veces (al reportar y tras el merge de su ola), más la
     validación: con las 2 specs que faltan son más de 10 ejecuciones.
   - No toca `packages/` ni lo que se publica, así que no retrasa la publicación más que lo que
     tarde en implementarse.
   - **Alternativa:** entrega 5, con las herramientas de la galería. Así la entrega 4 se cierra
     antes, pero la 013 y la 014 se prueban con la lentitud de hoy.
2. **¿Caché de consumidores entre ejecuciones (RF-5)?**
   - **Recomendado:** sí. Es la parte con red y la más grande de lo que no depende del código del
     repo.
   - Clave: la versión fijada del starter, más el `package.json` y el lockfile del consumidor sin
     los tarballs. Los tarballs se instalan siempre de nuevo (RF-6).
   - **Alternativa:** quitar solo lo repetido dentro de cada ejecución (RF-1, RF-2, RF-3). Es más
     simple, pero cada ejecución sigue descargando del registro.

## Menores decididos por el planner (opción conservadora)

- La caché vive en `node_modules/.museum-cache/` del checkout, como el lock: no se versiona y cada
  worktree tiene la suya.
- La clave incluye las versiones de Node, de npm y de las dependencias fijadas, no solo los
  archivos.
- Un build se guarda con su clave al final, de forma atómica: uno a medias nunca tiene clave.
- El objetivo se mide como mediana de 3 ejecuciones, porque una sola es ruidosa (la cota alta lo
  demuestra).

## Para el plan

- **Primera tarea:** medir la base por fase, sin otra carga en la máquina, incluido el
  `globalSetup` desglosado (starters, instalaciones, builds de consumidores, galería).
- RF-7 y RF-8: el `globalSetup` prepara de forma perezosa lo que cada archivo pide (`inject`), o
  los tests se reparten en proyectos de Vitest. El plan elige.
- RF-1: `packages.test.ts` lee la lista de archivos del tarball de la ejecución en lugar de lanzar
  un `npm pack --dry-run` propio.

## Clarify (2026-10-23, menores decididos por el planner)

- RF-5: el check dice «ni descarga nada»; el `@astrojs/check` del consumidor de Astro entra en la
  caché.
- NFR nuevo: un subconjunto (RF-7) no sustituye a `npm test` para reportar, que sigue siendo la
  única puerta (`AGENTS.md`).
- La medida bajo carga se paró a petición del coordinator. Mis procesos dejaron un lock y cinco
  carpetas `cm-b16bfabe*` en el temporal: los quité, solo los de esa ejecución.

## Riesgo a medir en la base

- Las tareas de la 012 informan de unos 31 procesos `msedge` abiertos en la máquina. Probablemente
  son de ejecuciones cortadas: un hook que pasa de 30 s, o una ejecución detenida, no llega a
  cerrar su Edge. Cada Edge huérfano resta memoria y CPU a las ejecuciones siguientes, y explicaría
  parte de los cierres lentos.
- La primera tarea del plan cuenta los `msedge` antes y después de una ejecución normal y de una
  cortada a mano, y el plan decide si la limpieza entra aquí (por ejemplo, cerrar los Edge que la
  ejecución lanzó, por PID, en el teardown).
