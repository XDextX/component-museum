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

---

### Alert

A flexible alert component for displaying messages, notifications, and warnings.

**Props:**
- `variant?: 'success' | 'warning' | 'danger' | 'info'` (default: 'info')
- `title?: string` (optional title)
- `closable?: boolean` (add close button, default: false)
- `class?: string` (additional Tailwind classes)

**Examples:**

```astro
<!-- Basic alert -->
<Alert variant="info">
  This is an info message.
</Alert>

<!-- With title -->
<Alert variant="success" title="Success">
  Operation completed successfully.
</Alert>

<!-- Closable alert -->
<Alert variant="warning" title="Warning" closable>
  This alert can be dismissed by the user.
</Alert>

<!-- All variants -->
<Alert variant="success">Success message</Alert>
<Alert variant="info">Info message</Alert>
<Alert variant="warning">Warning message</Alert>
<Alert variant="danger">Danger message</Alert>
```

---

### Code

A syntax-highlighted code block component with copy-to-clipboard functionality.

**Props:**
- `language?: 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'astro' | 'bash' | 'json'` (default: 'javascript')
- `title?: string` (optional title for the code block)
- `copyable?: boolean` (enable/disable copy button, default: true)
- `class?: string` (additional Tailwind classes)

**Examples:**

```astro
<!-- Basic code block -->
<Code language="javascript">
  const greeting = "Hello, World!";
</Code>

<!-- With title -->
<Code language="typescript" title="Function Example">
  const add = (a: number, b: number): number => a + b;
</Code>

<!-- Non-copyable -->
<Code language="bash" copyable={false}>
  npm install
</Code>

<!-- Different languages -->
<Code language="python">
  def greet(name):
      return f"Hello, {name}!"
</Code>

<Code language="json">
  { "name": "my-project", "version": "1.0.0" }
</Code>
```

## License

MIT
