# Publicación en npm — procedimiento del dueño

Este documento lo sigue el dueño del repo, a mano, en su máquina. **Ningún agente ejecuta estos
pasos ni toca tokens**: ni `npm login`, ni la organización, ni la publicación, ni los tags, ni el
push. Tampoco se versiona ningún `.npmrc` ni token; las credenciales de npm viven solo en la
sesión del dueño.

Paquetes: `@component-museum/react` (`packages/react`) y `@component-museum/astro`
(`packages/astro`). La galería y la raíz son `private` y no se publican.

## Primera publicación (0.1.0)

`@s-ui/mono` cuenta cada versión desde el commit y el tag de release anteriores del paquete
(paso 4), y la primera no tiene ninguno. Por eso la primera versión se publica a mano.

1. **`npm login`** con la cuenta del dueño.
2. **Crear la organización `component-museum`** en npmjs.com. Sin ella, la publicación falla.
3. **`npm publish` de `0.1.0` en cada paquete**, desde su carpeta (`packages/react` y
   `packages/astro`). El `prepack` compila `dist/` en React y copia `LICENSE` y `styles.css` al
   paquete, así que no hace falta compilar antes. La política de
   acceso `public` ya está en cada `package.json`.
4. **Commits y tags de release de cada paquete**, con el mismo formato que escribe `@s-ui/mono`
   (`release(<scope>): v<versión>` y tag `<scope>-<versión>`), para que cuente desde ahí:
   - `release(packages/react): v0.1.0` y el tag `packages/react-0.1.0`;
   - `release(packages/astro): v0.1.0` y el tag `packages/astro-0.1.0`.

   El push, con los tags, lo hace el dueño.

## Versiones siguientes

5. Con commits que lleven scope (`fix(packages/react): …`), el dueño ejecuta `sui-mono check`
   para ver qué versión sube cada paquete, y después `sui-mono release` para publicar, escribir
   los commits y tags de release y hacer el push.
