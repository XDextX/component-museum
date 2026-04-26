# Galería - component-museum

Bienvenido a la galería visual de componentes reutilizables del proyecto **component-museum**.

Este sitio Astro + React showcase de componentes documentados y listos para usar.

## 📖 Documentación General

Para información sobre el proyecto, requisitos, instalación y cómo contribuir, consulta el [README principal](../../Readme.md).

## 🚀 Comenzar

### Scripts disponibles

```bash
# Desarrollo local
npm run dev          # Inicia el servidor en localhost:4321

# Compilación
npm run build        # Build para producción en ./dist/
npm run preview      # Previsualiza el build de producción

# Astro CLI
npm run astro -- --help   # Ver todos los comandos de Astro
```

## 🎨 Componentes

Los componentes están organizados en el directorio `src/components/`. Cada componente tiene:

- **Componente React** (`.tsx`) - El componente reutilizable
- **Página showcase** (`.astro`) - Ejemplos y documentación visual
- **Props documentadas** - JSDoc o TypeScript interfaces
- **Ejemplos de uso** - Casos prácticos

### Agregar un nuevo componente

Sigue la [guía completa en src/components/README.md](src/components/README.md) para:

1. Crear la estructura del componente
2. Escribir el componente React
3. Crear la página showcase Astro
4. Documentar props y casos de uso

## 🛠️ Tecnologías

- **[Astro](https://astro.build)** - Framework web con rendimiento optimizado
- **[React](https://react.dev)** - Componentes interactivos
- **[Tailwind CSS](https://tailwindcss.com)** - Utilidades CSS
- **[TypeScript](https://www.typescriptlang.org)** - Seguridad de tipos

## 📚 Recursos

- [Documentación de Astro](https://docs.astro.build)
- [Documentación de React](https://react.dev)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)

## 📁 Estructura del Proyecto

```
src/
├── pages/              # Rutas del sitio
│   ├── index.astro     # Página principal
│   └── ...             # Otras páginas
├── components/         # Componentes reutilizables
│   ├── Button/
│   ├── Card/
│   └── README.md       # Guía de componentes
├── layouts/            # Layouts de Astro (si existen)
└── styles/
    └── global.css      # Estilos globales
```

## 🤝 Contribución

¿Quieres agregar un componente o mejorar uno existente?

1. Lee el [README principal](../../Readme.md) para la guía de contribución
2. Consulta la [guía de componentes](src/components/README.md)
3. Sigue las convenciones de código y accesibilidad
4. Abre un Pull Request

## 💬 Preguntas

Si tienes dudas sobre cómo crear componentes o contribuir, abre un issue en el repositorio principal.

---

Happy building! 🚀
