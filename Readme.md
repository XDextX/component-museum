# component-museum

Un monorepo moderno para crear, documentar y compartir una colección de componentes reutilizables. Construido con **Astro**, **React**, **Tailwind CSS** y **TypeScript**.

## 🎯 Propósito

component-museum es una galería visual de componentes de UI que puedes usar como referencia, documentación o como base para tu propio sistema de diseño. Cada componente está showcaseado con ejemplos en vivo, props documentadas y casos de uso.

## 🛠️ Stack Técnico

- **[Astro](https://astro.build)** 6.1.9 - Framework web moderno, optimizado para performance
- **[React](https://react.dev)** 19.2.5 - Biblioteca para componentes interactivos
- **[Tailwind CSS](https://tailwindcss.com)** 4.2.4 - Framework CSS utility-first
- **[TypeScript](https://www.typescriptlang.org)** - Tipado estático para JavaScript
- **npm workspaces** - Monorepo para organizar múltiples paquetes

## 📋 Requisitos

- **Node.js** >= 22.12.0
- **npm** >= 10.0.0

## ⚙️ Instalación

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/component-museum.git
   cd component-museum
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

## 🚀 Desarrollo

### Iniciar servidor local

```bash
npm run dev
```

El servidor de desarrollo abrirá en [http://localhost:4321](http://localhost:4321)

### Compilar para producción

```bash
npm run build
```

El sitio compilado estará en el directorio `packages/gallery/dist/`

### Previsualizar build de producción

```bash
npm run preview
```

### Scripts del Monorepo (@s-ui/mono)

Este proyecto usa **@s-ui/mono** para gestionar el monorepo. Proporciona comandos útiles para commits, releases y ejecución de comandos en múltiples paquetes:

#### Commits y Releases

```bash
npm run commit              # Commit interactivo con plantilla (feat/fix/docs/etc)
npm run check               # Preview de qué versiones se liberarán
npm run release             # Publica nuevas versiones a npm
npm run changelog           # Genera archivos CHANGELOG.md automáticamente
```

**Convenciones de Commits:** Usa [Conventional Commits](https://www.conventionalcommits.org/) - los commits se categorizan como `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `test:`, `chore:`, `release:`

#### Ejecutar comandos en todos los paquetes

```bash
npm run run "npm install"           # Ejecuta en serie en todos los paquetes
npm run run-parallel "npm build"    # Ejecuta en paralelo (más rápido)
```

#### Mantenimiento

```bash
npm run phoenix              # Limpia e reinstala todas las dependencias
```

## 📁 Estructura del Proyecto

```
component-museum/                    # Raíz del monorepo
├── packages/
│   └── gallery/                     # Galería principal (Astro + React)
│       ├── src/
│       │   ├── pages/               # Rutas de la aplicación
│       │   │   └── index.astro      # Página principal
│       │   ├── components/          # Componentes reutilizables
│       │   │   └── README.md        # Guía de cómo crear componentes
│       │   └── styles/
│       │       └── global.css       # Estilos globales
│       ├── public/                  # Activos estáticos
│       ├── astro.config.mjs         # Configuración de Astro
│       └── package.json
├── package.json                     # Configuración del workspace
└── README.md                        # Este archivo
```

## 🎨 Cómo Agregar Componentes

Los componentes se crean en el directorio `packages/gallery/src/components/`. Cada componente debe ser un archivo `.tsx` (React) o `.astro` (Astro).

### Estructura básica de un componente

```
src/components/
├── Button/
│   ├── Button.tsx          # Componente React
│   ├── Button.module.css   # Estilos (opcional)
│   └── Button.stories.astro # Página de demostración
```

Para más detalles, consulta la [guía de componentes](packages/gallery/src/components/README.md).

## 🤝 Contribución

Las contribuciones son bienvenidas. Para agregar nuevos componentes:

1. Crea una rama para tu feature: `git checkout -b feature/nuevo-componente`
2. Sigue la estructura recomendada en `src/components/README.md`
3. Documenta el componente con ejemplos de uso
4. Commitea tus cambios: `git commit -m "feat: agregar componente Nuevo"`
5. Push a la rama: `git push origin feature/nuevo-componente`
6. Abre un Pull Request

### Convenciones de código

- **Nomenclatura de componentes:** PascalCase (ej: `Button`, `CardHeader`)
- **Props:** Documentar con JSDoc o comentarios de TypeScript
- **Estilos:** Preferir Tailwind CSS sobre CSS custom
- **Accesibilidad:** Seguir WCAG 2.1 AA standards

## 📚 Documentación

- [Documentación de Astro](https://docs.astro.build)
- [Documentación de React](https://react.dev)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)

## 📜 Licencia

Este proyecto está disponible bajo la licencia MIT.

## 💬 Preguntas o Sugerencias

Si tienes preguntas o sugerencias, no dudes en abrir un issue o contactar a los mantenedores.

---

**Última actualización:** 2026-04-26
