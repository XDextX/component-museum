# Spec 006 — publicacion

**Status:** implemented · **Approved:** 2026-10-22 · el dueño, tras 2 rondas de clarify, con el ajuste de RF-8 · **Implemented:** 2026-10-22 · 8 tareas en 2 olas con worktrees, más 1 corrección tras la validación (React se empaquetaba sin `dist/`); validada por el reviewer en 2 vueltas; `npm test` 266/266 (+1 omitido)
**Size:** L (10 RF) · **Entrega:** 2 (002–006) · **Depende de:** 005

## Contexto y objetivo

`AGENTS.md` dice que una entrega solo se cierra, se mergea a `main` y se publica en npm cuando la
constitución se cumple entera. La entrega 2 ya está en `main` (40ab13b), pero sin publicar. Esta
spec deja `@component-museum/react` y `@component-museum/astro` listos para que el dueño los
publique: manifiestos con licencia MIT a nombre de `XDextX`, tarballs con solo lo que usa el
consumidor y un README en español e inglés, y `@s-ui/mono` configurado para versionar cada paquete
desde commits con scope (regla 6). El dueño publica `0.1.0` a mano y desde ahí con `sui-mono
release`. La regla 2 ya se prueba sobre el tarball real (001 y 002). El login de npm, la
organización `component-museum` y cada publicación son del dueño: ningún agente toca tokens de npm.

## Definiciones

- **Paquete publicable** — `packages/react` y `packages/astro`. La raíz y `gallery/` son `private`.
- **Scope de un commit** — la ruta del paquete entre paréntesis (`feat(packages/react): …`), por la
  que `@s-ui/mono` asigna el cambio a un paquete.
- **Commit de release** — `release(packages/<p>): v<versión>`. Desde él cuenta `@s-ui/mono` los
  cambios de ese paquete.

## Historias de usuario

- US-1: Como dueño, quiero publicar los dos paquetes con un procedimiento escrito y sin preparar
  nada a mano.
- US-2: Como consumidor, quiero que un cambio incompatible suba la versión mayor y que el paquete en
  npm me diga cómo instalarlo y usarlo.

## Requisitos (EARS)

- RF-1: EL SISTEMA declara en cada paquete publicable `license: "MIT"`, `repository` (con su
  `directory`) y `publishConfig.access: "public"`. — **Check:** un test falla si falta uno, si
  `directory` no es la carpeta del paquete o si el `LICENSE` no es MIT a nombre de `XDextX`.
- RF-2: EL SISTEMA mete en cada tarball solo su lista de archivos permitidos, con `LICENSE` y
  `README.md`. — **Check:** un test compara la lista de `npm pack --dry-run --json` con la
  permitida de cada paquete y falla ante un archivo de más o de menos.
- RF-3: EL SISTEMA declara `@s-ui/mono` como dependencia de desarrollo de la raíz, con acceso
  público. — **Check:** un test lee el manifiesto de la raíz y falla si falta la dependencia o si
  `config.sui-mono.access` no es `public`.
- RF-4: CUANDO un commit lleva el scope de un paquete, EL SISTEMA calcula su versión siguiente
  según el tipo (regla 6). — **Check:** en un repo git temporal, `sui-mono check` da menor ante
  `fix`, `feat`, `perf` o `refactor`; mayor ante `BREAKING CHANGE` en el cuerpo; y ninguna ante
  `docs`.
- RF-5: SI un commit no lleva scope de paquete, ENTONCES EL SISTEMA no lo asigna a ningún paquete.
  — **Check:** en el mismo repo temporal, un `feat:` sin scope no produce ninguna release.
- RF-6: EL SISTEMA no publica en npm ni lee tokens de npm desde ningún script, test o manifiesto. —
  **Check:** un test falla si un `package.json`, `scripts/` o `tests/` contienen `npm publish`,
  `sui-mono release`, `NPM_TOKEN` o `_authToken`, o si hay un `.npmrc` versionado.
- RF-7: EL SISTEMA deja escrito el procedimiento de publicación del dueño, en `docs/publicacion.md`.
  — **Check:** un test falla si el documento no nombra, en este orden: `npm login`, la
  organización, `npm publish` de `0.1.0` en cada paquete, el commit de release de cada paquete, y
  `sui-mono check` y `sui-mono release` para las siguientes.
- RF-8: CUANDO esta spec se implementa, EL SISTEMA deja en `AGENTS.md` el scope de commit por
  paquete como obligatorio, y en «Idioma» una remisión a la regla 10. — **Check:** `AGENTS.md`
  nombra `packages/react` y `packages/astro` como scopes, y remite a la regla 10 sin listar nada.
- RF-9: EL SISTEMA publica con cada paquete un `README.md` en español y en inglés que dice cómo
  instalarlo, importar su hoja una vez y usar Button, con el enlace al repo. — **Check:** un test
  lee el README empaquetado y falla si a una de las dos lenguas le falta el `npm install`, el
  import de la hoja, un Button o el enlace.
- RF-10: CUANDO esta spec se implementa, EL SISTEMA deja en la regla 10 de la constitución los
  README de los paquetes entre la documentación pública en dos idiomas. — **Check:** la regla 10 los
  nombra, con su línea `Changed:`; la enmienda la aprueba el dueño y va en su propio commit `docs:`.

## Requisitos no funcionales

- **Dependencias (regla 9).** `@s-ui/mono` 2.46.0, dependencia de desarrollo de la raíz. Motivo:
  la constitución (regla 6) y `AGENTS.md` lo eligen para versionar cada paquete desde Conventional
  Commits, y se instala al publicar por primera vez, que es esta spec. Nunca llega a un consumidor.
- **Seguridad.** Ningún token de npm entra en el repo, en un test ni en la salida de un agente.

## Casos límite

- **Primera publicación.** Ningún commit lleva scope todavía, así que `@s-ui/mono` no publicaría
  nada. Por eso el dueño publica `0.1.0` a mano, y un commit de release por paquete marca la base
  desde la que se cuenta (RF-7).
- **La galería y la raíz** son `private`: `@s-ui/mono` las ignora y nunca las publica.
- **Sin la organización en npm,** la publicación falla; el documento de RF-7 la pone como segundo
  paso.
- **Un cambio en los dos paquetes** necesita un commit por scope, o uno de los dos no sube versión
  (RF-5, RF-8).

## Fuera de alcance

- `npm login`, crear la organización `component-museum` en npm y cada publicación: son del dueño.
- Integración continua y releases automáticas.
- Desplegar la galería.

## Hecho cuando

- `npm test` termina en 0; RF-1 a RF-7 y RF-9 son tests vistos en rojo una vez inyectando su
  violación (regla 8); RF-8 y RF-10 son enmiendas que aprueba el dueño.
- El dueño sigue `docs/publicacion.md` y los dos paquetes quedan publicados en npm: es el cierre de
  la entrega 2, y lo hace él.

## Preguntas abiertas

Ninguna.
