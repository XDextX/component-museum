# @component-museum/astro

Astro components of the component museum.

## Español

Instala el paquete (Astro 7 es una dependencia par):

```sh
npm install @component-museum/astro
```

Importa la hoja de estilos una sola vez, en tu layout, y usa el Button:

```astro
---
import '@component-museum/astro/styles.css';
import { Button } from '@component-museum/astro';
---

<Button variant="primary" size="md">Guardar</Button>
```

El tema claro es el de por defecto. El oscuro se pide con `data-theme="dark"` en cualquier contenedor, y `data-theme="system"` sigue la preferencia del sistema. Sin atributo, el paquete no mira el sistema.

`variant`: `primary`, `secondary` u `outline`. `size`: `sm`, `md` o `lg`. Más en el repositorio:
https://github.com/XDextX/component-museum

## English

Install the package (Astro 7 is a peer dependency):

```sh
npm install @component-museum/astro
```

Import the stylesheet once, in your layout, and use the Button:

```astro
---
import '@component-museum/astro/styles.css';
import { Button } from '@component-museum/astro';
---

<Button variant="primary" size="md">Save</Button>
```

The light theme is the default. Dark is requested with `data-theme="dark"` on any container, and `data-theme="system"` follows the system preference. Without the attribute, the package does not look at the system.

`variant`: `primary`, `secondary` or `outline`. `size`: `sm`, `md` or `lg`. More in the repository:
https://github.com/XDextX/component-museum
