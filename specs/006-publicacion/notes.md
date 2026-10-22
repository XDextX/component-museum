# Notas de la 006 — para el plan

## Decisiones del dueño (2026-10-22)

- **Licencia MIT, a nombre de `XDextX`.** Un `LICENSE` en la raíz, copiado a cada paquete al
  empaquetar (RF-1, RF-2).
- **Primera versión: `0.1.0` a mano.** El dueño publica `0.1.0` tal cual, con `npm publish` en cada
  paquete. Desde ahí publica con `sui-mono release` y commits con scope. Motivo: hoy ningún commit
  lleva scope, así que `@s-ui/mono` no publicaría nada.
- **Scope obligatorio en los commits:** sí, con enmienda de `AGENTS.md` en su propio commit `docs:`
  (RF-8).
- **README mínimo por paquete:** sí, **en español y en inglés**. Dice cómo instalar, importar la
  hoja una vez, un ejemplo de uso y el enlace al repo (RF-9), y entra en la lista permitida de RF-2.
  Exige enmendar la regla 10 de la constitución (RF-10): texto propuesto abajo.

## RF-4: un solo RF con varios resultados (decisión del planner)

RF-4 sigue siendo un RF. Su comportamiento es uno, «calcular la versión según el tipo», y menor,
mayor y ninguna son casos de su check. Partirlo en tres pasaría de las 100 líneas sin cambiar qué se
construye.

## Enmienda propuesta de la regla 10 (RF-10; la aprueba el dueño)

Texto actual (`docs/constitution.md:62-67`):

> 10. **Los secretos, fuera; los documentos, en español; el código, en inglés.** `.env` está en
>     `.gitignore` y ningún token, contraseña o dirección personal aparece en un archivo
>     versionado. Los documentos — esta constitución, `AGENTS.md`, las specs, los planes y las
>     tareas — están en español; la documentación de las historias de la galería, de cara al
>     público, en español y en inglés; el código y sus comentarios, en inglés. *Check:*
>     `git ls-files .env` está vacío; el test de idiomas de las historias; leer el diff.

Texto propuesto (cambia una frase y el *Check*):

> 10. **Los secretos, fuera; los documentos, en español; el código, en inglés.** `.env` está en
>     `.gitignore` y ningún token, contraseña o dirección personal aparece en un archivo
>     versionado. Los documentos — esta constitución, `AGENTS.md`, las specs, los planes y las
>     tareas — están en español; la documentación de cara al público — las historias de la galería
>     y el README de cada paquete — en español y en inglés; el código y sus comentarios, en inglés.
>     *Check:* `git ls-files .env` está vacío; el test de idiomas de las historias y el de los
>     README; leer el diff.

Línea `Changed:` propuesta:
`Changed: <fecha> · regla 10: los README de los paquetes, en español y en inglés · spec 006`.

`AGENTS.md`, «Idioma», dice que todo documento del repo va en español. La enmienda del RF-8 no
repite qué va en dos idiomas: añade «salvo lo que la regla 10 pone en dos idiomas», para no
duplicar una regla de la constitución (ajuste del dueño al aprobar).

## Por qué es la última spec de la entrega 2, y no la primera de la 3

`AGENTS.md`: «la entrega solo se cierra, se mergea a `main` y se publica en npm cuando la
constitución se cumple entera». La entrega 2 (002–005) ya cumple la constitución y está en `main`
(40ab13b, PR #1), pero no está publicada, así que no está cerrada. Esta spec no añade componentes
ni cambia reglas: solo deja publicable lo que construyó la entrega 2. Si abriera la entrega 3, la 2
quedaría mergeada y sin publicar para siempre, contra `AGENTS.md`.

La cabecera de la 006 dice «Entrega: 2 (002–006)». Las cabeceras de la 002 a la 005, ya
implementadas, **no se tocan**: basta con que la 006 declare su entrega (revisión del coordinator).
Coste aceptado: la entrega 2 se mergeó a `main` antes de publicarse.

## Investigación: `@s-ui/mono` 2.46.0 (README y código en unpkg, consultado el 2026-10-22)

- Versión 2.46.0, publicada el 2026-05-12.
- **Qué sube la versión** (`src/check.js`):
  - `fix`, `feat`, `perf` y `refactor` suben la menor;
  - un `BREAKING CHANGE` en el cuerpo o en el pie sube la mayor (un `!` en la cabecera no cuenta);
  - cualquier otro tipo no publica.
- **Cada commit se asigna a un paquete por su scope**, la ruta de la workspace (`packages/react`).
  Los commits de este repo no llevan scope: `sui-mono check` no los asigna a ningún paquete.
- **La base de cada paquete es su último commit de tipo `release`.** Un `release(packages/react): …`
  pone a cero su estado (`src/check.js`). `sui-mono release` escribe ese commit
  (`release(<scope>): v<versión>`) y el tag `<scope>-<versión>`, sube la versión con
  `npm --no-git-tag-version version` desde la del `package.json`, hace push con tags y publica.
- **Acceso:** por defecto publica como `restricted`. Hace falta `config.sui-mono.access: "public"`
  en la raíz o `publishConfig` en cada paquete.
- **Los paquetes `private`** (la raíz y `gallery/`) se ignoran.

## ¿Hace falta un tag inicial por paquete?

Para el cálculo, no: `@s-ui/mono` parte del último commit `release` de cada paquete, no de los tags,
y sube desde la versión del `package.json` (`0.1.0`). Sí hace falta un **commit de release por
paquete** tras la publicación a mano:
- `release(packages/react): v0.1.0`
- `release(packages/astro): v0.1.0`

Sin él, contaría desde el principio del historial cualquier commit con scope. El procedimiento
(RF-7) añade también el tag `packages/react-0.1.0` y `packages/astro-0.1.0`, con el mismo formato
que escribiría `sui-mono release`. Así el historial queda igual que si la primera publicación la
hubiera hecho la herramienta. Los dos commits y los dos tags los hace la sesión de git o el dueño;
el push es del dueño.

## Para el plan

- **RF-2 amplía `tests/packages.test.ts`,** que ya hace `npm pack --dry-run` (`packedFiles`) y
  comprueba la entrada, la hoja y los tipos. Se le añade la comprobación de «nada de más», con la
  lista permitida; no se crea otro test (revisión del coordinator).
  - React: `dist/`, `styles.css`, `package.json`, `LICENSE`, `README.md`.
  - Astro: `index.js`, `index.d.ts`, `src/`, `styles.css`, `package.json`, `LICENSE`, `README.md`.
- **`LICENSE`** se copia a cada paquete en el `prepack`, como `styles.css`: un solo origen en la
  raíz, y la copia del paquete fuera de git.
- **RF-4 y RF-5:** un repo git temporal con los manifiestos y la configuración de `@s-ui/mono`, con
  commits de prueba, donde corre `sui-mono check`. Nunca `release`, y nunca dentro del repo real.
- **RF-6:** la búsqueda excluye `node_modules`; `specs/` y `docs/` quedan fuera por definición del
  check. El propio test construye sus cadenas para no encontrarse a sí mismo.
- **RF-9:** el README se lee del tarball, no de la carpeta, para probar lo que se publica.
- Comprobar que `sui-mono check` funciona con workspaces de npm 11 en Windows.
- La versión de `@s-ui/mono` se comprueba en npm el día del plan.
