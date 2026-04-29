# @component-museum/astro

A collection of accessible, reusable Astro components styled with Tailwind CSS.

## Installation

```bash
npm install @component-museum/astro
```

## Usage

Import the component and styles:

```astro
---
import { Button } from '@component-museum/astro';
import '@component-museum/astro/styles.css';
---

<Button variant="primary" size="lg">Click me</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline" disabled>Disabled</Button>
```

## Components

### Button

A flexible button component with variants and sizes.

**Props:**
- `variant?: 'primary' | 'secondary' | 'outline'` (default: 'primary')
- `size?: 'sm' | 'md' | 'lg'` (default: 'md')
- `disabled?: boolean`
- `class?: string` (additional Tailwind classes)

**Examples:**

```astro
<!-- Basic -->
<Button>Click me</Button>

<!-- Variants -->
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>

<!-- Sizes -->
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

<!-- Combined -->
<Button variant="outline" size="lg">Large Outline</Button>

<!-- Disabled -->
<Button disabled>Disabled</Button>

<!-- Custom classes -->
<Button class="w-full">Full Width</Button>
```

## License

MIT
