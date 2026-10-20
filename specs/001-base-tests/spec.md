# Spec 001 — base-tests

**Status:** implemented
**Approved:** 2026-10-19 · el dueño leyó la spec completa tras 4 rondas de clarify y la partición en 5 · 83 lines, 8 RF
**Implemented:** 2026-10-19 · 10 tareas (T-1…T-9 y T-6b) en `spec/001-base-tests`; validada por el reviewer en 2 vueltas; `npm test` 36/36
**Size:** M · **Entrega:** 1 (solo esta spec)

## Contexto y objetivo

La regla 8 pide, por cada regla mecánica, un test que se vio fallar; la regla 2, que un proyecto
fuera del workspace compile con cada paquete. No hay runner, y `AGENTS.md` dice que lo elige una
spec propia: esta. Las specs siguientes miden con tests, en un navegador y en un consumidor
externo. Un consumidor dentro del repo hereda el `node_modules` de la raíz y no prueba la regla 2:
por eso vive fuera. El dueño decidió que la comprobación de tipos entra en la política.

## Definiciones

- **Guarda** — un test que zanja una regla leyendo archivos.
- **Consumidor externo** — un proyecto creado con el starter de su framework fuera del repo, con
  instalación limpia de un paquete empaquetado. React: Vite con la plantilla `react-ts`; Astro: el
  starter oficial.
- **Paquete de prueba** — un paquete mínimo, con un `.tsx` y un `.astro`, para probar esta base;
  no se publica.

## Historias de usuario

- US-1: Como quien verifica un cambio, quiero un solo comando que corra todos los tests y diga
  cuál falló.
- US-2: Como dueño, quiero que la prueba de la regla 2 falle si un paquete usa algo que no declara.

## Requisitos (EARS)

- RF-1: EL SISTEMA ejecuta todos los tests del repo con un solo comando desde la raíz, que termina
  en 0 si pasan. — **Check:** con la suite en verde, el comando termina en 0.
- RF-2: SI un test falla, ENTONCES EL SISTEMA termina en distinto de 0 y nombra el test y su
  archivo. — **Check:** inyectar un test que falla da distinto de 0 y su nombre; revertido, 0.
- RF-3: EL SISTEMA corre en el mismo comando tests que leen en un navegador real el estilo
  calculado, con `prefers-color-scheme` emulado y con JavaScript desactivado. — **Check:** un test
  lee un color que cambia por esquema (oscuro y claro según la emulación) y, sin JavaScript, el
  color que un script de la página habría cambiado sigue siendo el original.
- RF-4: CUANDO se verifica un paquete, EL SISTEMA crea un consumidor externo por framework fuera
  del repo y le instala el paquete empaquetado. — **Check:** la ruta del consumidor está fuera del
  repo y el paquete que resuelve está en su propio `node_modules`.
- RF-5: SI el paquete usa un módulo que no declara, ENTONCES EL SISTEMA hace fallar el build del
  consumidor externo. — **Check:** el build falla con el módulo instalado en la raíz del repo y con
  él en un `node_modules` de un directorio padre del consumidor; declarado, pasa.
- RF-6: CUANDO termina una verificación, EL SISTEMA deja el árbol del repo como estaba. —
  **Check:** `git status` y el hash de cada archivo inyectado son idénticos antes y después.
- RF-7: CUANDO esta spec se implementa, EL SISTEMA deja en `AGENTS.md` el comando de RF-1 y la
  comprobación de tipos de RF-8 como política. — **Check:** `AGENTS.md` ya no dice «Todavía no hay
  runner de tests» ni «No ejecutes el comprobador de tipos», y nombra los tres comandos; la enmienda
  la aprueba el dueño.
- RF-8: EL SISTEMA ejecuta en el comando de RF-1 `tsc --noEmit` para React y `astro check` para
  Astro. — **Check:** un error de tipos inyectado en un `.tsx`, y otro en un `.astro`, dan
  distinto de 0; revertidos, 0.

## Requisitos no funcionales

- **Dependencias (regla 9).** Todo lo de esta spec es dependencia de desarrollo y nunca llega a un
  consumidor. Motivos: `typescript` ejecuta `tsc --noEmit` y genera los tipos que la 002 entrega;
  `@astrojs/check` ejecuta `astro check`. El runner y el navegador llevan el suyo en el plan.
- **Plataforma.** El comando funciona en Windows, donde trabaja el dueño.

## Casos límite

- **Sin paquetes todavía.** Esta spec va antes que la 002: RF-4, RF-5 y RF-8 se prueban con el
  paquete de prueba.
- **Directorio temporal ocupado.** Si queda el consumidor de una verificación anterior, la nueva
  lo recrea desde cero (RF-4).

## Fuera de alcance

- Hooks de pre-commit, integración continua y un consumidor con Next.js.
- Las guardas de cada regla: las traen las specs que crean lo que guardan.
- Los paquetes y la galería.

## Hecho cuando

- El comando de RF-1 termina en 0, y cada check se vio en rojo una vez inyectando su violación.
- RF-3 se vio pasar en un navegador real, no simulado.

## Preguntas abiertas

Ninguna.
