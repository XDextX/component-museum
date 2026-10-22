# AGENTS.md

Reglas de trabajo, y nada más. **Una línea que describe lo que el repo _es_ — un inventario, una
tabla de consulta, un tutorial, una historia — no va aquí.** Una regla lleva el fallo que evita
siempre que sea eso lo que la hace cumplible.

**`docs/constitution.md` manda sobre este archivo.** Contiene las reglas innegociables y nunca se
repiten aquí. `docs/incidents.md` guarda la historia que hay detrás de ellas.

**Idioma.** Todo documento del repo está en español: la constitución, este archivo, las specs,
los planes y las tareas. El código y sus comentarios, JSDoc incluido, están en inglés. El idioma
de `Memory.md` lo decide el agente.

## Flujo de trabajo

### Antes de escribir código

- **Una funcionalidad o un refactor empieza con una spec**, en `specs/NNN-<nombre>/spec.md`. Lee
  antes la constitución y la spec activa.
- Una errata, un renombre, un comentario o un arreglo de formato no necesita spec. Cuando no está
  claro cuál de los dos es un cambio, **pregunta**.
- **La plantilla de spec y sus reglas viven en la skill `sdd`**, `.agents/skills/sdd/SKILL.md` — la
  única copia. Está en `.gitignore`, así que vive en cada máquina.
- **Cada RF lleva el check que lo zanja.** Un requisito sin check es prosa que parece cobertura.
- **Varias specs forman una entrega, y cada spec declara a cuál pertenece.** Cada spec se aprueba,
  se implementa y se valida sola, pero la entrega solo se cierra, se mergea a `main` y se publica
  en npm cuando la constitución se cumple entera, regla 5 incluida.
- **Una spec nunca pasa por encima de la constitución ni de este archivo.** Una contradicción es el
  hallazgo: se resuelve primero en esos dos archivos y luego en el código.
- **Cita la spec en los commits que produce.**

### Verificar

- **Un cambio se verifica con `npm test` desde la raíz**, que tiene que terminar en 0: encadena
  la comprobación de tipos, Vitest, los tests en un Edge real y los consumidores externos. Un
  verde de solo una parte no vale. Además, abre cada página de la galería tocada desde un servidor
  de desarrollo en marcha — di qué páginas abriste. (El comando de la galería es `npm run gallery`.)
- **Validar una spec cubre sus requisitos no funcionales y sus casos límite, no solo sus RF.**
- **El árbol de trabajo es CRLF.** Normaliza antes de buscar un ancla, o la sonda no encuentra
  nada.

### Trabajo visual, un componente cada vez

1. Cambia **un** componente. Enséñalo en los dos temas cuando la galería tenga dos.
2. **Para y espera la aprobación.** No hagas commit de un componente sin aprobar, no empieces el
   siguiente.
3. Con la aprobación, haz commit de ese componente y pasa al siguiente.

### Antes de enseñar una propuesta

- **Relee cada propuesta como un revisor sénior** que busca incoherencias y contradicciones, y di
  claramente qué encontraste.
- **Prefiere un número a un adjetivo, y di cuál tienes.**

### Comandos

- **La comprobación de tipos es parte de la política**: `tsc --noEmit` para TypeScript y
  `astro check` para los `.astro`, los dos dentro de `npm test` y antes de Vitest. Un error de
  tipos corta la cadena con distinto de 0.
- **No añadas un linter, un formateador ni un runner de tests para que pase un check** —
  constitución, regla 9.

### Git

- **NUNCA hagas push. NUNCA hagas commit si no te lo piden.** Terminar una tarea no implica hacer
  commit.
- **Los commits siguen Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`…), que la
  herramienta de changelog y versionado lee para versionar los paquetes (`@s-ui/mono`, que se instala al publicar por primera vez).
- **Una spec nueva se redacta desde `main`, y tiene su propia rama una vez aprobada**:
  `spec/NNN-<nombre>`. Dentro de una entrega, la primera spec sale de `main` y cada siguiente de
  la rama de la anterior, que aún no está en `main`; al cerrar la entrega se mergea a `main` la
  rama de la última spec.
- `AGENTS.md` y `docs/constitution.md` van en su propio commit `docs:`.
- **`git checkout -- .` destruye el trabajo sin commitear sin avisar.** Revierte solo rutas
  explícitas.
- **`bloque/` es borrador y nunca se versiona.**

### Memoria

- **Lee `Memory.md` antes de proponer nada**, y actualízalo después de cada tarea.
- **Mantén `Memory.md` por debajo de 50 líneas.** Resume lo obsoleto y bórralo.
- **Tres hogares, una regla en cada uno**: las reglas innegociables en `docs/constitution.md`, las
  de trabajo aquí, el estado y el contexto en `Memory.md`. Nunca dupliques una regla en dos.

## Reglas

### Datos sensibles

- **Nunca escribas rutas con el nombre real del usuario, emails, tokens ni contraseñas en un
  documento del repo ni en un mensaje de commit.** Usa marcadores — `C:\Users\<user>\...`,
  `<email>`, `<token>`.

### Herramientas de agentes

- **Las herramientas de agentes nunca se versionan** — `.agents/`, `.claude/`, `.opencode/`,
  `skills-lock.json`, `opencode.json` y `opencode.jsonc` son de cada máquina. Vuelve a ejecutar
  `powershell -File .agents/link.ps1` después de cambiar `.agents/`.
