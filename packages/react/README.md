# @component-museum/react

Componentes de React para Component Museum.

## Instalación

```bash
npm install @component-museum/react
```

## Uso

### Button

```jsx
import { Button } from '@component-museum/react';

export function App() {
  return (
    <div>
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      
      <Button onClick={() => alert('Clicked!')}>
        Click me
      </Button>
      
      <Button disabled>Disabled</Button>
    </div>
  );
}
```

### Props

- `variant?: 'primary' | 'secondary' | 'outline'` - Estilo del botón (default: 'primary')
- `size?: 'sm' | 'md' | 'lg'` - Tamaño del botón (default: 'md')
- `className?: string` - Clases CSS adicionales
- Todas las propiedades estándar de HTML button (`onClick`, `disabled`, etc.)
