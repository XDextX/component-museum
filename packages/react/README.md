# @component-museum/react

React components of the component museum.

## Español

Instala el paquete (React 19 es una dependencia par):

```sh
npm install @component-museum/react
```

Importa la hoja de estilos una sola vez, en la entrada de tu app, y usa el Button:

```tsx
import '@component-museum/react/styles.css';
import { Button } from '@component-museum/react';

export function Save() {
  return <Button variant="primary" size="md" onClick={() => console.log('saved')}>Guardar</Button>;
}
```

`variant`: `primary`, `secondary` u `outline`. `size`: `sm`, `md` o `lg`. Más en el repositorio:
https://github.com/XDextX/component-museum

## English

Install the package (React 19 is a peer dependency):

```sh
npm install @component-museum/react
```

Import the stylesheet once, in your app entry, and use the Button:

```tsx
import '@component-museum/react/styles.css';
import { Button } from '@component-museum/react';

export function Save() {
  return <Button variant="primary" size="md" onClick={() => console.log('saved')}>Save</Button>;
}
```

`variant`: `primary`, `secondary` or `outline`. `size`: `sm`, `md` or `lg`. More in the repository:
https://github.com/XDextX/component-museum
