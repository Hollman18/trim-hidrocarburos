# QA final · Revisión total de experiencia (tanda 3)

**27-oct-2026 · Coordinador.** Es el cierre de `PROMPT-REVISION-UX.md`. Código en `main`: ed559e4.

## 1. Lo que se corrió y lo que dio

| Prueba | Comando | Resultado |
|---|---|---|
| Tipos | `npx tsc -b` | sin errores |
| Lint (el motor no entra a las pantallas) | `npx oxlint src` | sin errores |
| Motor: libro | `node scripts/verificar-libro.mjs` | 563 de 563 |
| Motor: árbol de causas | `node scripts/verificar-arbol.mjs` | 128 de 128 |
| Contrato | `node scripts/verificar-contrato.mjs` | 203 de 203, y 16 de 16 por http |
| Referencia para un backend | `node scripts/referencia.mjs comprobar` | 311 de 311 casos y 18 de 18 escrituras rechazadas |
| e2e: dev, Safari, Firefox, iPhone, demo construido | `caffeinate -dims npx playwright test` | **518 de 518** (11,7 min) |
| Auditor de desbordes (dentro de las e2e) | 123 rutas × 6 anchos (320 a 1512) | sin hallazgos |

La primera corrida completa dio 511 de 518. Las 7 que fallaron eran 4 casos:
1. La píldora del campo en el panel plegado no decía su condición. Arreglado en la pantalla: «La Ceiba, con alarma», en su nombre y su ayuda.
2. Una prueba no encontraba las ramas del árbol de Regulatorio dentro de su nuevo contenedor plegable.
3. Tres pruebas de foco fallaban en Safari porque Safari no pasa con Tab por enlaces ni botones (se usa Option+Tab), y un clic no le da el foco a un botón.

La segunda corrida dio 518 de 518.

## 2. Hallazgos

| Fase | Resultado |
|---|---|
| Medir y encontrar (R1–R4) | ~230 hallazgos: texto 79, UI y producto 46, ISA-101 y gráficos 34, accesibilidad y frontend 24 |
| Verificar (V1, V2) | Confirmados: V1 110 (9 S1), V2 56 (5 S1). Refutados: 18. Duplicados: 15 |
| Arreglar (F1–F4, K1, K2) | Todos los S1 y casi todos los S2 y S3. El detalle por hallazgo, con su archivo y su prueba, está en `arreglos-f1.md`, `arreglos-f2.md`, `arreglos-f3.md`, `arreglos-f4.md`, `cierre-k1.md` y `cierre-k2.md` |

**Los S1, todos arreglados:**
- producción, confiabilidad, regulatorio y el administrador abren en la respuesta de su rol;
- en Turno, lo proyectado ya no es la cifra grande;
- el diferido «se deja de producir», nunca «se pierde»;
- «Avisan» con un solo conteo;
- «Si falla hoy» siempre en bbl/d;
- la barra llena con 0;
- los repartos que no sumaban a la vista (redondeo único en el motor, por mayor residuo);
- un equipo con dos marcas;
- el foco invisible sobre el panel índigo.

**Las 44 comprobaciones de ISA-101 (X2 §6):**
- según V2, antes de los arreglos: 19 cumplen, 22 a medias, 2 no y 1 no aplica;
- con los arreglos confirmados, V2 proyectó 40 que cumplen y 3 a medias con su razón escrita: E2, I3 (el disparo de cada protección no lo trae el motor) y G1 (falta la guía de estilo firmada por la operadora);
- **no se volvió a auditar una por una después de los arreglos**: el auditor ampliado cubre las que se pueden medir (color con forma y palabra, texto, pestañas, cifras grandes y simuladas).

## 3. Menos texto: lo que se logró y lo que NO

Medido con `herramientas/medir.mjs` (antes en 5aaa7f2, después en ed559e4; 390 y 1440 px, claro). La tabla completa está en `medicion/antes-vs-despues.md`.

**Inicios de cada rol a 390 px, sin desplazarse:**

| Rol | ger | prod | reg | sup | oper | jefe | conf | tec | adm |
|---|---|---|---|---|---|---|---|---|---|
| Palabras | 97 → 85 | 98 → 82 | 130 → 81 | 117 → 104 | 94 → 93 | 131 → 89 | 108 → 88 | 116 → 88 | 95 → 79 |
| Cambio | −12 % | −16 % | −38 % | −11 % | −1 % | −32 % | −19 % | −24 % | −17 % |

- **La meta de −40 % en los inicios no se cumplió.** La razón: las imágenes aprobadas por el dueño traen de 81 a 112 palabras a 390 px, más que cualquier tope de −40 %. Por la decisión D-1 (manda la imagen aprobada), cada inicio quedó con el tope de su imagen o de la imagen de su mismo tipo de pantalla. El auditor lo hace cumplir (`e2e/auditoria/presupuesto.ts`, con el porqué de cada tope).
- **La meta de −25 % en todo el producto no se cumplió:** −7 % sin desplazarse y 0 % en las páginas enteras.
  - Lo que se quitó de unas pantallas se ganó en otras, porque se fundieron sin perder funciones. Riesgo de jefe y confiabilidad pasó a Equipos, que creció (conf a 1440: 592 → 1.100 palabras).
  - Las listas largas tampoco se acortaron: Equipos con todos los campos tiene 3.850 palabras e Identificar con todos, 2.129.
  - **Lo que lo cerraría:** paginar o plegar las listas largas («primeros 20 · ver los N») y plegar por defecto los paneles secundarios de Equipos, Identificar y Filosofía. Es una tanda propia.

## 4. Pendientes (con su porqué)

1. **La fuente http (A9).** El simulador no sirve las vistas calculadas, y nunca las sirvió. Es trabajo de backend y quedó fuera de esta tanda. El comentario de `vite.config.ts` ya no lo llama «contrato ejecutable» sin aclararlo.
2. **UI-01.** Una entrada por parte de Configurar en el menú de la persona. Las partes no tienen dirección propia, por acuerdo de F1 y F3.
3. **Datos que el motor no tiene, y que la pantalla dice en vez de inventar:**
   - el interlock y el disparo de cada protección;
   - la vigencia de cada tag («sin comunicación» solo ve el medidor oficial);
   - el rango de cada instrumento (escala «provisional»);
   - el registro de pérdidas (la gota).
4. **«bomba de reinyección» en `descEvid` (lo que viaja a la ANH).** K1 la dejó así; en pantalla dice «bomba de agua». Lo decide el dueño.
5. **El −25 % de palabras en todo el producto** (sección 3).
6. **Las capturas de la revisión** (`capturas/`, 37 MB) se suben aparte, en tandas, porque un solo empuje se cortaba.
