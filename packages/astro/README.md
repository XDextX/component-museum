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
<Button variant="primary">Primary</Button>
<Button variant="secondary" size="lg">Secondary Large</Button>
<Button variant="outline" disabled>Disabled</Button>
```

---

### Badge

A small label component with multiple variants and sizes.

**Props:**
- `variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'` (default: 'primary')
- `size?: 'sm' | 'md' | 'lg'` (default: 'md')
- `class?: string` (additional Tailwind classes)

**Examples:**

```astro
<Badge variant="primary">New</Badge>
<Badge variant="success" size="lg">Approved</Badge>
<Badge variant="danger" size="sm">Error</Badge>
<Badge variant="warning">Pending</Badge>
```

---

### Card

A flexible container component for content organization.

**Props:**
- `variant?: 'basic' | 'elevated' | 'outlined'` (default: 'basic')
- `class?: string` (additional Tailwind classes)

**Examples:**

```astro
<Card variant="elevated">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>

<Card variant="outlined" class="p-6">
  <h2>Outlined Card</h2>
  <p>With custom padding</p>
</Card>
```

## License

MIT
