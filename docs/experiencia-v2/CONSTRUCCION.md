# Experiencia v2 · Construcción

**25-oct-2026 · Coordinador.** El dueño dio la orden: «hazlo todo… que quede como la opción B».

Lo leen todos los agentes de construcción antes de tocar código.

## Lo que manda (en este orden)

1. **Las palabras del dueño:**
   - el diseño es el de B, sin mezcla de estilos: todo se ve como B;
   - la tubería de C va dentro de la tarjeta principal de B;
   - los gráficos y cifras de A van redibujados en el estilo de B;
   - la navegación es un **panel lateral izquierdo azul**; en el teléfono, ese mismo panel abre desde la izquierda con ☰;
   - **ninguna barra de pestañas horizontal**, ni arriba ni abajo;
   - el azul de marca se queda;
   - la vista del gerente se llama «La planta viva».
2. **Las imágenes aprobadas para construir:** `docs/experiencia-v2/imagenes/*.png`. Su HTML, CSS y datos están en `imagenes/fuente/`; cada pieza se puede pasar a React tal cual.
3. **`X5-sistema-de-diseno.md`:** tokens (§3), navegación (§4), componentes (§5) e ISA-101 (§6).
4. **`X4-arquitectura-roles.md`:** las puertas por rol (§3.2), Hoy (§3.3), el inicio de cada rol (§3.4), el mapa de cada panel (§3.7), La planta viva (§4) y lo técnico (§5).
5. **`X2-norma-hmi.md`:** la paleta y las 44 comprobaciones. **`X3-librerias.md`:** SVG propio, sin librerías de gráficos ni de diagramas.

## Reglas de siempre (no negociables)

- **El motor calcula y la pantalla pinta.** Toda cifra, frase u orden sale de `src/entities` por el contrato (`src/shared/api`). oxlint prohíbe que una pantalla importe el motor.
- **Nada inventado.** Las cifras son las del demo. Cuando el motor no tenga un dato, la pantalla dice «sin dato»; no se rellena.
- **Diferido no es pérdida.** El diferido «se deja de producir», «no pasa» o «se trabó». Pérdida es lo que salió y no se vendió. Nunca se suman.
- **D1–D7 de `docs/plan-circular-24/CORRECCIONES-QA.md` siguen vigentes.** Lo de las personas se guarda por paso, solo por inserción. Nada de texto libre a la ANH. Una sola cifra del norte. Menos de 300 ms por cálculo.
- **Ninguna función se pierde.** Cada panel de hoy queda en su lugar nuevo (X4 §3.7). Las direcciones viejas siguen abriendo (`url.ts`).
- **Pruebas:**
  - cada cambio de motor lleva su prueba, que falla sin el cambio;
  - se prueba el resultado, no el mecanismo;
  - lo nuevo de pantalla lleva su e2e en `e2e/`, aunque lo corra el coordinador.
- **Al terminar:** `npx tsc -b` (nunca `--noEmit`), `npx oxlint src` y `npm test`. Los errores de archivos que son de otro agente no se tocan: se anotan.
- **NO correr `npx playwright test`** (las e2e). Las corre el coordinador cuando todos terminan: si alguien edita mientras corren, Tailwind recarga y salen pantallas vacías.
  - Sí se pueden tomar capturas propias con Playwright contra un servidor de Vite en **otro puerto** (5180–5189), que se apaga por su PID.
- **NUNCA** `pkill`, `killall` ni matar procesos por nombre.
  - No toques los puertos **4173** (el demo del dueño), **5173** ni **4199**.
  - No `npm i`. No commits (los hace el coordinador).
- **Español de Colombia, de usted.** Palabras de campo, sin códigos ni la palabra «choke» para el gerente.

## Dueños de archivos (para no pisarse)

| Agente | Tanda | Es dueño de | Puede leer, no editar |
|---|---|---|---|
| **C1 · Identidad y armazón** | 1 | `src/index.css`, `src/App.tsx`, `src/widgets/Riel.tsx`, `Cabecera.tsx`, `MenuPerfil.tsx`, `Subpantallas.tsx`, `Onboarding.tsx`, `src/app/pantallas.tsx`, `grupos.ts`, `url.ts`, `src/entities/roles.ts`, `src/shared/ui/*`, `src/shared/brand/*`, el motor y la API de la franja de condiciones (archivos nuevos), y el **cambio de tamaños de letra** en `src/pages/*` y `src/widgets/*` existentes | `pages/PlantaViva.tsx`, `pages/Hoy.tsx` y sus widgets (son de C2 y C3) |
| **C2 · La planta viva** | 1 (en paralelo) | `src/pages/PlantaViva.tsx`, `src/widgets/plantaviva/*` (nuevo), `src/entities/planta-viva.ts` (nuevo), `src/shared/api/plantaViva.ts` (nuevo), su sección propia en `contrato.ts`, `CONTRATO.md` y `scripts/verificar-*.mjs`, `e2e/planta-viva.spec.ts` | los widgets existentes (`widgets/choke/*`, `resumen/*`, `ciclo/*`): se reutilizan sin editarlos; si hace falta cambiar uno, se pide |
| **C3 · Hoy** | 1 (en paralelo) | `src/pages/Hoy.tsx`, `src/widgets/hoy/*` (nuevo), `src/entities/hoy.ts` (nuevo), `src/shared/api/hoy.ts` (nuevo), su sección en `contrato.ts`, `CONTRATO.md`, `scripts/verificar-*.mjs` y `escrituras.ts` (solo lo de «Deshacer»), `e2e/hoy.spec.ts` | `widgets/arbol/*` (Preguntas), `widgets/whatsapp/*` |
| **C4 · Equipos y nivel técnico** | 2 | `src/pages/Equipos.tsx` (nuevo), `src/widgets/equipos/*` (nuevo), el nivel 3 de la ficha técnica (`PanelEquipo`, `widgets/bombas/*`, `widgets/equipo/*`), `Analogico`/`Sparkline` si hace falta | — |
| **C5 · Resultados y limpieza** | 2 | `src/pages/Resultados.tsx` (nuevo), las fusiones de X4 §3.6, «un nombre, una cifra» (X4 §1.3.3: 1.665 contra 1.966) y la regla del auditor para texto SVG recortado (X3) | — |
| **QA** | 3 | revisión adversarial: imágenes contra la app, X2 (44 comprobaciones), X4 (cada función en su lugar), números contra el demo | — |

**Archivos compartidos** (`contrato.ts`, `CONTRATO.md`, `scripts/verificar-contrato.mjs`, `verificar-libro.mjs`):
- cada agente agrega **su propia sección** al final, con un comentario que empieza por su nombre (`// C2 · La planta viva`);
- se vuelve a leer el archivo justo antes de cada edición;
- no se reordena ni se reformatea lo de otros.

**El registro de pantallas** (`pantallas.tsx`, `roles.ts`, `grupos.ts`) es de C1. Registra `plantaViva` (`@/pages/PlantaViva`, export `PlantaViva`) y `hoy` (`@/pages/Hoy`, export `Hoy`). C2 y C3 crean esos archivos **lo primero**, con un componente mínimo que ya renderice, para que el registro compile desde el inicio.

## Las puertas (X4 §3.2 con lo que decidió el dueño)

El panel izquierdo tiene las puertas en orden fijo: **Hoy · La planta viva · Equipos · Resultados**. Cada rol ve las suyas:

| Rol | Puertas |
|---|---|
| ger | La planta viva, Equipos, Resultados |
| sup, oper, tec | Hoy, La planta viva, Equipos |
| prod, jefe, conf | las cuatro |
| plan | Hoy, Equipos, Resultados |
| reg | Reporte, La planta viva, Resultados |
| adm | Configurar, La planta viva |
| cont | Paradas y evidencia |

Cada rol abre en su respuesta (X4 §3.4): ger y prod en La planta viva; sup, oper, tec, jefe y plan en Hoy; conf en Equipos; reg en Reporte; adm en Configurar.

**Las pantallas de hoy quedan dentro de su puerta** mientras las tandas 2 y 3 las fusionan:
- Hoy: hoy (nueva), causa, turno, trabajo.
- La planta viva: plantaViva (nueva), planta, agua, riesgo y resumen (la del gerente, mientras dure).
- Equipos: bombas, esp, pozos, equipo.
- Resultados: diferidos, producción, confiabilidad, mantenimiento.
- Reporte: regulatorio.
- Configurar: configuración, filosofía, conectores.
- Paradas y evidencia: evidencia.

**Las subpantallas no van en pestañas horizontales:** se listan dentro del panel azul, debajo de su puerta, cuando la puerta está abierta. En el teléfono, en el mismo panel.

## Cierre de cada tanda (lo hace el coordinador)

`tsc -b` · `oxlint` · `npm test` · las e2e de todos los proyectos (`caffeinate -dims`) · el auditor de desbordes (100 rutas × 5 anchos) · capturas contra las imágenes · commit y push · `npm run paquete` y reinicio del demo de 4173 por su PID.
