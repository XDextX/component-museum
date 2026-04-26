# Componentes - Guía de Estructura

Este directorio contiene todos los componentes reutilizables de la galería. Los componentes pueden ser creados con **React** (archivos `.tsx`) o **Astro** (archivos `.astro`).

## 📋 Estructura Recomendada

Cada componente debe estar organizado en su propio subdirectorio:

```
components/
├── Button/
│   ├── Button.tsx                    # Componente (React)
│   ├── Button.module.css             # Estilos (opcional)
│   └── Button.astro                  # Página showcase (Astro)
├── Card/
│   ├── Card.tsx
│   ├── Card.module.css
│   └── Card.astro
└── README.md                         # Este archivo
```

## 🎨 Crear un Nuevo Componente

### Paso 1: Crear la carpeta del componente

```bash
mkdir src/components/MiComponente
```

### Paso 2: Crear el componente React (MiComponente.tsx)

Ejemplo básico de un componente React:

```tsx
import React from 'react';

interface MiComponenteProps {
  title: string;
  description?: string;
  variant?: 'primary' | 'secondary';
}

/**
 * MiComponente
 * 
 * Un componente que demuestra...
 * 
 * @param title - Título del componente (requerido)
 * @param description - Descripción opcional
 * @param variant - Variante visual del componente
 */
export const MiComponente: React.FC<MiComponenteProps> = ({
  title,
  description,
  variant = 'primary'
}) => {
  return (
    <div className={`mi-componente mi-componente--${variant}`}>
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="text-gray-600">{description}</p>}
    </div>
  );
};
```

### Paso 3: Crear la página Showcase (MiComponente.astro)

Esta página muestra ejemplos del componente en la galería:

```astro
---
import { MiComponente } from '../MiComponente.tsx';
import Layout from '../../layouts/Layout.astro';
---

<Layout title="MiComponente">
  <main>
    <h1>MiComponente</h1>
    
    <section>
      <h2>Descripción</h2>
      <p>Describe aquí el propósito y uso del componente.</p>
    </section>

    <section>
      <h2>Ejemplos</h2>
      
      <h3>Variante Primary</h3>
      <MiComponente 
        client:load
        title="Título de ejemplo" 
        description="Esto es una descripción"
        variant="primary"
      />

      <h3>Variante Secondary</h3>
      <MiComponente 
        client:load
        title="Otro título" 
        variant="secondary"
      />
    </section>

    <section>
      <h2>Props</h2>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Tipo</th>
            <th>Requerido</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>title</td>
            <td>string</td>
            <td>Sí</td>
            <td>Título del componente</td>
          </tr>
          <tr>
            <td>description</td>
            <td>string</td>
            <td>No</td>
            <td>Descripción opcional</td>
          </tr>
          <tr>
            <td>variant</td>
            <td>'primary' | 'secondary'</td>
            <td>No</td>
            <td>Variante visual (default: 'primary')</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</Layout>
```

### Paso 4: Agregar estilos (opcional)

Si usas CSS Modules, crea un archivo `MiComponente.module.css`:

```css
.miComponente {
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.miComponente--primary {
  background-color: #3b82f6;
  color: white;
}

.miComponente--secondary {
  background-color: #f3f4f6;
  color: #111827;
}
```

> **Nota:** Preferimos usar Tailwind CSS para estilos. Solo usa CSS Modules para estilos complejos o que necesiten isolación.

## 🎯 Convenciones

### Nomenclatura

- **Componentes:** PascalCase (ej: `Button`, `CardHeader`, `Modal`)
- **Archivos:** Mismo nombre que el componente (ej: `Button.tsx`)
- **Directorios:** Mismo nombre que el componente (ej: `/Button/`)

### TypeScript / JSDoc

Documenta siempre las props de tus componentes:

```tsx
interface ButtonProps {
  /** Texto del botón */
  label: string;
  /** Tipo de botón */
  type?: 'button' | 'submit' | 'reset';
  /** Callback al hacer click */
  onClick?: () => void;
  /** Desabilitar el botón */
  disabled?: boolean;
}
```

### Estilos

1. **Preferencia:** Tailwind CSS (clases directas)
2. **Segunda opción:** CSS Modules (para estilos complejos)
3. **Evitar:** Inline styles o CSS-in-JS

### Accesibilidad

Todos los componentes deben cumplir con:
- Atributos `aria-*` cuando sea necesario
- Navegación por teclado (Tab, Enter, Escape)
- Contraste de colores WCAG AA
- Textos alternativos en imágenes

Referencia: [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)

## 📦 Exportar un Componente

Crea un archivo `index.ts` en la carpeta del componente para facilitar imports:

```ts
// src/components/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

Así los usuarios pueden hacer:

```tsx
import { Button } from '@/components/Button';
```

En lugar de:

```tsx
import { Button } from '@/components/Button/Button';
```

## 🧪 Testing

(Próximamente) Se agregarán instrucciones para testing de componentes.

## 📚 Recursos

- [React Documentation](https://react.dev)
- [Astro Documentation](https://docs.astro.build)
- [Tailwind CSS](https://tailwindcss.com)
- [Web Accessibility (A11y)](https://www.w3.org/WAI/fundamentals/)

---

¡Feliz creando componentes! Si tienes dudas, abre un issue en el repositorio.
