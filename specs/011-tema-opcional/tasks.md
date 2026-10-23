# Tareas 011 — tema-opcional

**Approved:** 2026-10-23 · el dueño; la galería sigue arrancando en «Sistema»

Cómo se trabaja en paralelo (plan, bloque 2): cada tarea va en su propio worktree, en
`.claude/worktrees/`, con su `node_modules`. Cada tarea empieza, con el árbol limpio, así:
1. `git branch -m spec/011-tema-opcional-T-n`;
2. `git reset --hard <PLAN>`;
3. `npm ci`, `npm run build:packages` y `npm run gallery:astro`.

Antes de reportar, cada tarea pasa el build de `packages/react`, `npm run gallery:astro`,
`tsc --noEmit`, `tsc --noEmit -p gallery` y `npm test`. Al cerrar la ola, la sesión de git mergea
las ramas en `spec/011-tema-opcional`, añade los commits vacíos de la hoja (`AGENTS.md`) y pasa
`npm test` sobre el merge. Se borra `node_modules` antes de quitar cada worktree. Las notas que
escriban los agentes, en UTF-8.

Ningún archivo es compartido:
- `styles/museum.css`, `gallery/.storybook/preview.ts`, `tests/theme.test.ts`,
  `tests/field-styles.test.ts`, `tests/a11y.test.ts`, `tests/field-a11y.test.ts` y
  `tests/gallery-theme.test.ts`: la T-1;
- los dos README, `Button.mdx`, `Input.mdx`, `Textarea.mdx`, `specs/003-estilos-temas/spec.md` y
  `tests/theme-docs.test.ts`: la T-2.

- [ ] **T-1 — El oscuro solo cuando la página lo pide**
  Cubre: RF-1, RF-2, RF-3, RF-4, RF-5, NFR de accesibilidad (regla 7)
  Archivos: `styles/museum.css` (selectores de los bloques claro y `@media`, plan, bloque 4),
  `gallery/.storybook/preview.ts` (`data-theme="system"` con «Sistema»), `tests/theme.test.ts`,
  `tests/field-styles.test.ts`, `tests/a11y.test.ts`, `tests/field-a11y.test.ts`,
  `tests/gallery-theme.test.ts`
  Hecho cuando:
  - En Edge, sin `data-theme` (y con `"sepia"`), los tokens son los claros con el sistema en oscuro
    y en claro.
  - Con `data-theme="system"`, son los de la emulación, y cambian en vivo con `emulateMedia`.
  - Gana el más cercano también con `system`:
    - `system` dentro de `dark`, con el sistema en claro, da el claro;
    - `light` dentro de `system`, con el sistema en oscuro, da el claro.
  - `field-styles.test.ts` repite cada medida de la 009 en sus 5 modos, y un campo sobre `body`
    `#111827` sin atributo da textos ≥ 4.5:1 y borde ≥ 3:1.
  - `a11y.test.ts` y `field-a11y.test.ts`:
    - piden el oscuro con `data-theme="dark"` y el sistema en claro;
    - miden el claro sin atributo con el sistema en oscuro;
    - miden `data-theme="system"` con el sistema en oscuro;
    - todo en verde, en los dos frameworks.
  - Con «Sistema», `gallery-theme.test.ts` encuentra `data-theme="system"` en el lienzo y los
    tokens de la emulación. El resto de tests de galería siguen en verde sin cambiarlos.
  - Ningún test existente se borra ni se afloja: da el número antes y después.
  - El coordinator aprueba las capturas antes del commit (trabajo visual):
    - Button, Input y Textarea en la galería con «Claro», «Oscuro» y «Sistema» (sistema en oscuro);
    - una página de consumidor sin atributo con el sistema en oscuro.
  Inyección:
  - Dejar `:root:not([data-theme="light"])` en el `@media` pone en rojo RF-1 con el sistema en
    oscuro.
  - Quitar `[data-theme="system"]` del bloque claro pone en rojo el caso `system` dentro de `dark`.
  - Volver a `undefined` en el decorador pone en rojo el caso «Sistema» de `gallery-theme.test.ts`.

- [x] **T-2 — Documentar cómo se pide el tema**
  Cubre: RF-6, RF-7
  Archivos: `packages/react/README.md`, `packages/astro/README.md`, `gallery/stories/Button.mdx`,
  `gallery/stories/Input.mdx`, `gallery/stories/Textarea.mdx`, `specs/003-estilos-temas/spec.md`
  (línea `Changed:`), `tests/theme-docs.test.ts`
  Hecho cuando:
  - Los 5 documentos dicen, en español y en inglés, que el claro es el de por defecto, que el
    oscuro se pide con `data-theme="dark"` y que `data-theme="system"` sigue al sistema.
  - Ninguno presenta `prefers-color-scheme` como activación automática.
  - La 003 lleva `Changed: 2026-10-23 · RF-5: claro por defecto; el oscuro se pide con `data-theme`
    (`dark` o `system`) · spec 011`. La aprobación es la de la 011; la tarea no añade la frase de
    aprobación.
  - `theme-docs.test.ts` lo comprueba como dato.
  - `readme.test.ts` y los tests de idiomas y snippets de la galería siguen en verde.
  - Las tres páginas de documentación se abren en `npm run gallery`, en las dos lenguas.
  - Commits: `docs(packages/react)`, `docs(packages/astro)`, `docs:` (MDX y 003) y `test:`.
  Inyección: devolver «arrives through `prefers-color-scheme`» al README de Astro pone en rojo
  RF-6; quitar la línea `Changed:` de la 003 pone en rojo RF-7.
  Hecho (2026-10-23): inyección vista en rojo y restaurada: «arrives through `prefers-color-scheme`» en el
  README de Astro puso en rojo RF-6 (1 caso); quitar la línea `Changed:` puso en rojo RF-7 (1 caso).
  Sin las ediciones, el test nuevo daba 9 casos en rojo de 11.

  Va en la ola 1 junto a la T-1: no comparten archivos.

## Grafo de olas

| Ola | Tareas en paralelo | Por qué esperan |
|---|---|---|
| 1 | T-1 ∥ T-2 | — (no comparten archivos) |
