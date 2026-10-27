# Experiencia v3 · Construcción

**27-oct-2026 · Coordinador.** El dueño aprobó y dijo «hazlo». Este documento lo leen todos los agentes de construcción antes de tocar código.

## Las decisiones del dueño

1. **Lo necesario de cada rol: aprobado** (`necesario-por-rol.md`, con el §0b del choke, el §0c de la jornada y el §0d de «¿Está funcionando?»). Se construye lo necesario; los escalones quedan para después.
2. **Gerente: opción A.** Sin el control «Antes · Durante · Después» en su inicio. Ese antes, durante y después vive en la tarjeta «¿Está funcionando?» (§0d).
3. **Se borra lo propuesto** (`borrado.md`), incluido **WhatsApp** (`whatsapp.md`). El aviso fuera de la app se pierde; el dueño lo aceptó.
4. **Panel lateral izquierdo**, también en el teléfono, que se abre con ☰. **Sin barra abajo**: las imágenes de M4 que la muestran no aplican.
5. **D1 Grafito, pero con colores más cálidos y SIN la barra negra.** El dueño: «creo que el color de la primera versión está bien». En la v1 (`cde8214`):
   - el panel lateral era **claro, en grises cálidos**: `--superficie #d6d5d2`, borde `--linea #b4b3b0`, la entrada activa en `--panel #eceae7` con una raya del acento a la izquierda, y la letra en tinta `#1f2328`;
   - los fondos eran cálidos: `--suelo #c9c9c7`, `--panel #eceae7`, `--elevado #f4f3f0`.
   - **Lo que se hace:** se toma de D1 la estructura, la tipografía IBM Plex Sans (licencia OFL) y el kit SCADA, con neutros cálidos de la familia de la v1, el panel lateral claro como la v1 y un acento sobrio.
   - **Se mide otra vez:** WCAG 2.2 en los 5 fondos y los dos temas, y la separación de 10 o más entre el acento y los colores de estado con las 4 visiones (`docs/experiencia-v3/herramientas/medir-direcciones.mjs`).
   - La paleta de estado de X2 no cambia.
6. **Backend: el SQL de la v1 rige**, y lo nuevo se agrega al lado (`docs/backend/CAMBIOS-CONTRATO.md`).

## Lo que el dueño volvió a pedir (obligatorio)

> «Recuerda que el choke esté implementado para entender el árbol del problema, si es barril diferido o perdido; para entender cuánto se perdió y cuánto quedó diferido. Esto debemos mostrarlo también. Y que los roles clave puedan entender cuánto produjeron, cuánto diferido quedó y cuántos barriles se perdieron, y la trazabilidad de sus causas.»

**El balance del choke**, para los roles clave: ger, prod, sup, reg, jefe y conf.
- **Producido · Diferido · Perdido**, en el período (y en la jornada para sup).
  - El diferido y el perdido van **lado a lado y NUNCA sumados**.
  - El potencial es producido más diferido; el perdido va aparte.
- **Por tramo del choke** (yacimiento, pozos, planta o salida): dónde quedó el diferido y dónde se perdió.
- **La trazabilidad de las causas**, a un toque:
  - de cada número, su árbol: tramo → diferida o pérdida → planeada → N1 → N2 → la parada;
  - de cada parada, quién dijo qué y cuándo (D1).
- **La pérdida necesita su registro** (`POST /api/perdidas`, que no existe hoy). Hasta que haya datos, dice «sin registro», nunca 0 inventado. El operador la registra con botones: pitera, derrame, tea, venteo, rechazo.

## Reglas de siempre

- **Al lado, nunca encima** (`PROMPT-SIMPLIFICACION.md` §3.1). El contrato de la v1 (`cde8214`) no se rompe: solo se agrega; lo que sale se marca RETIRADO; los 19 CAMBIADO se vuelven compatibles con la v1, y todo va en `CAMBIOS-CONTRATO.md`.
- **El motor calcula y la pantalla pinta. Nada inventado. Diferido no es pérdida. El choke va sí o sí.** D1–D7 siguen vigentes.
- **Pruebas:** cada cambio con su prueba, que falla sin el cambio. Al final: `npx tsc -b`, `npx oxlint src` y `npm test`. NO correr la suite completa de e2e (la corre el coordinador). Sí se pueden correr las propias specs contra el Vite de cada uno (`TRIM_URL=http://localhost:518x`).
- **NUNCA `pkill`**; no tocar los puertos 4173, 5173 ni 4199; no `npm i`; no commits.
- **Español de Colombia, de usted, con poco texto y «tipo número».**

## Tandas y dueños de archivos

**Tanda A (motor y contrato, en paralelo con B1):**

| Agente | Hace | Es dueño de |
|---|---|---|
| **A1 · Contrato v1 y WhatsApp fuera** | Compatibilidad con la v1 de los 19 CAMBIADO; WhatsApp RETIRADO en el contrato y fuera del motor (`entities/mensajes.ts`: mudar lo que se usa, como `causasSugeridas` y `CAUSAS_POZO`); la foto fija de la v1 y su prueba en `verificar-contrato`; `CAMBIOS-CONTRATO.md` final; los AGREGADOS sin endpoint (`/vistas/configuracion/estado`, `porConfirmar` como número) | `src/shared/api/contrato.ts`, `CONTRATO.md`, `docs/backend/*`, `referencia/`, `scripts/verificar-contrato.mjs`, `entities/mensajes.ts`, `shared/api/mensajes.ts` |
| **A2 · El balance del choke, pérdidas, jornada y efectividad** | Registro de pérdidas (escritura y vista); el balance producido · diferido · perdido por rol y por tramo, con la trazabilidad; la jornada configurable por campo; «¿Está funcionando?» (`/vistas/efectividad`, la meta de reducción y «barriles que se dejaron de diferir»); las fallas por mes en el motor | `src/entities/perdidas.ts`, `balance.ts`, `jornada.ts`, `efectividad.ts` (nuevos), su costura en `src/shared/api/`, su sección en `contrato.ts`, `CONTRATO.md` y `verificar-*.mjs` |
| **A3 · Las acciones que faltan** | Contestar la parte en 1 toque; cerrar la orden en el teléfono; la respuesta de la ANH y la hora para corregir; la conversión del árbol de la operadora al de la ANH (lo necesario: importar la tabla de equivalencias y verla) | sus archivos nuevos en `src/entities` y `src/shared/api`, `escrituras.ts` (su sección), su sección en `contrato.ts`, `CONTRATO.md` y `verificar-*.mjs` |
| **B1 · Identidad cálida y kit SCADA** | Tokens D1 cálidos (decisión 5), IBM Plex Sans, panel lateral claro como la v1, el kit SCADA como componentes (`docs/experiencia-v3/kit-scada.md`); borrar WhatsApp del front (pantallas y widgets) | `src/index.css`, `src/shared/ui/*`, `src/shared/brand/*`, `src/widgets/Riel.tsx`, `Cabecera.tsx`, `Franja.tsx`, `MenuPerfil.tsx`, `src/widgets/whatsapp/*`, `public/fonts/` (solo agregar IBM Plex) |

**Tanda B (pantallas por rol, después de A):** B2 (ger, prod, reg y adm) y B3 (sup, oper, tec, jefe y conf), con lo necesario de cada rol, el balance del choke, la jornada y «¿Está funcionando?». Se borra lo de `borrado.md` y quedan las puertas de `flujos.md`.

**Tanda C:** QA total (la matriz de `PROMPT-SIMPLIFICACION.md` §11), la medición de antes y después, el demo y el registro para el backend.
