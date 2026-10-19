# Constitución

Status: approved 2026-10-19 by the owner — 10 rules, reviewed in full.
Changed: 2026-10-19 · traducción al español y enmienda de la regla 10 · reglas 1, 2 y 6 en
términos genéricos tras el reinicio (los nombres concretos, pendientes de la spec de
arquitectura).

**Propósito.** Este repo es el único hogar de los componentes con los que el dueño construye
otros proyectos. Cada componente se publica como un paquete por cada framework que soporta, de
modo que cualquier proyecto pueda instalarlo y usarlo sin configuración extra. La galería es
donde cada uno se ve, se explica y se manipula.

Cada regla dice dónde se decide: un test, un comando o un archivo que leer. Romper una es un
bug — el arreglo es la regla o una enmienda, nunca un rodeo en el código. `AGENTS.md` las
desarrolla y cede ante ellas en cualquier conflicto.

1. **Los paquetes son el producto; la galería es su primer consumidor.** La galería importa un
   componente solo a través de la entrada de su paquete, exactamente como lo haría un proyecto
   de fuera, nunca a través de una ruta al código fuente de un paquete. Un componente que solo
   funciona desde dentro del repo no está terminado. *Check:* ningún import de la galería llega
   al código fuente de otro paquete. (Nombres de la galería, de los paquetes y de sus entradas:
   pendientes de la spec de arquitectura.)
2. **Instalar, importar, usar.** Un consumidor instala el paquete, importa su hoja de estilos una
   vez, y cada componente exportado funciona — sin plugin de build, archivo de configuración ni
   dependencia extra que añadir a mano. *Check:* la historia de cada componente muestra el
   import completo, y un proyecto fuera del workspace compila con él (cómo, lo decide una
   spec).
3. **Cada componente se exporta desde la entrada de su paquete.** Una carpeta de componente que
   la entrada no exporta es inalcanzable. *Check:* la lista de carpetas coincide con las líneas
   `export` de la entrada.
4. **Un contrato, muchos frameworks.** Las props, variantes y eventos de un componente se definen
   una vez; la implementación de cada framework sigue ese contrato con los mismos nombres. Un
   framework al que le falta un componente lo dice en la galería — nunca publica otra API con el
   mismo nombre. *Check:* la matriz de frameworks de la galería, generada a partir de las
   entradas de los paquetes.
5. **Ningún componente sin su historia.** Cada componente exportado tiene una página en la
   galería que explica cómo usarlo, cómo está construido y cómo modificarlo, con controles en
   vivo para manipular sus props. *Check:* cada export tiene página; una página a la que le
   falta una sección no está terminada.
6. **Un cambio incompatible se versiona como tal.** Otros proyectos dependen de estos paquetes:
   renombrar o quitar una prop, una variante o un evento es un commit `BREAKING CHANGE`, para
   que la herramienta de versionado suba la versión mayor (cuál, pendiente de la spec de
   arquitectura). *Check:* el commit que cambia un contrato lo dice.
7. **Accesible por defecto.** Cada componente cumple WCAG 2.1 AA: alcanzable con teclado, nombre
   accesible, foco visible, contraste de texto 4.5:1. *Check:* su spec indica cómo se verificó
   cada punto en un navegador en marcha.
8. **Una regla mecánica viene con su guarda, y la guarda falla una vez.** Si una regla se puede
   zanjar leyendo archivos, la zanja un test — y nunca se da por verde antes de haber inyectado
   su violación y haberlo visto en rojo. *Check:* la regla nombra su test; el commit nombra la
   inyección.
9. **Una dependencia nueva necesita antes su motivo**, escrito en la spec que la introduce. Una
   dependencia que un paquete impone a sus consumidores necesita uno más fuerte: la regla 2 la
   paga. *Check:* cada diff de `package.json` que añade una cita una spec.
10. **Los secretos, fuera; los documentos, en español; el código, en inglés.** `.env` está en
    `.gitignore` y ningún token, contraseña o dirección personal aparece en un archivo
    versionado. Los documentos — esta constitución, `AGENTS.md`, las specs, los planes y las
    tareas — están en español; el código y sus comentarios, en inglés. *Check:*
    `git ls-files .env` está vacío; leer el diff.
