# 11. Ciclo de valor ANTES / DURANTE / DESPUÉS · encargo al desarrollador del servidor

> **Quién hace qué.** El **front ya está hecho** en este repositorio: el gerente ve el retorno posible partido en antes / durante / después, y operación acepta o ejecuta los planes. **Este capítulo no pide implementar el servidor aquí.** Es el encargo para quien construya el backend que reemplaza al simulador del demo.
>
> El cliente compra TRIM para **reducir paradas**. El pitch es el ciclo **antes** (intervenir mientras el tanque aguanta), **durante** (recuperar más rápido que el MTTR y cerrar el agua en el orden TRIM) y **después** (no repetir). El front lo muestra en barriles y USD. El servidor tiene que calcular las mismas cifras y guardar las decisiones.

Las cifras del ciclo son **simuladas**: no entran al libro ni a un informe firmado. El LLM no las inventa. Cada plan lleva `simulado: true` y supuestos en palabras.

| Capa | Dónde | Estado |
|---|---|---|
| Motor (fórmulas) | `src/entities/escenarios.ts` (`cicloValor`, `conDecisiones`, `planPorId`) | Hecho. El servidor lo corre (opción A del capítulo 2) o lo reescribe igual |
| Contrato | `GET /api/vistas/ciclo`, `POST /api/planes/:id` en `contrato.ts` y anexo A | Hecho. Forma ejecutable |
| Front | `src/widgets/ciclo/Ciclo.tsx` (Resumen, ficha, detalle, Riesgo, Turno, Identificar, Mantenimiento) | Hecho. Lee `useCiclo`; no calcula |
| Persistencia `decision_plan` y los dos endpoints en el servidor de producción | Este capítulo | **Trabajo del desarrollador del backend** |

Referencia para comparar: `referencia/ciclo/{campo\|portafolio}-{mes}.json` (se genera con `node scripts/referencia.mjs generar`).

---

## 11.1 Por qué se vende así: Antes, Durante, Después

El cliente no compra «un software de mantenimiento». Compra **menos pozos cerrados**. En un campo maduro el agua manda (capítulo 1): si la bomba de reinyección o una electrosumergible falla, el tanque sube y hay que cerrar pozos. TRIM ataca ese problema en **tres momentos distintos del tiempo**, con producto distinto en cada uno, y el ciclo de valor lo traduce a **barriles simulados** para que gerencia vea ROI sin confundirlo con el libro.

| Momento | Pregunta del comprador | Por qué importa (física + negocio) | Qué producto TRIM ya tiene |
|---|---|---|---|
| **1 · Antes** | «¿Qué puedo evitar antes de que pare?» | Mientras el tanque aguanta, todavía hay ventana para intervenir sin cerrar pozos. Es donde está el **mayor ROI**: cada hora antes de la falla evita el MTTR completo. | Vigía (cruce de alarma), Riesgo (`costoFalla`, colchón), aciertos del vigía, WhatsApp con ventana (**RETIRADO (27-oct-2026)**), salud por parte |
| **2 · Durante** | «Ya paró: ¿cómo pierdo menos tiempo?» | Cada hora parada cuesta \(Q/24\) barriles. Recuperar antes del MTTR histórico, **identificar el daño antes de arrancar** (regla de operación) y cerrar el agua en el **orden TRIM** son palancas distintas del mismo evento. | Turno, Identificar, orden de cierre simulado (`evitable`), MTTR vs horas ya paradas |
| **3 · Después** | «¿Cómo no repetimos la misma falla?» | Lo del período ya está en el **libro medido**; aquí se ataca la **parte que más costó** y lo que se habría ahorrado con mejor orden, para la próxima vez. | Paretos por parte, MTBF, costo por falla, libro publicable |

**Cómo se cuenta en la demo (20 minutos).** Primero el gerente ve cuánto **ya** dejó de producir (libro, medido). Arriba del todo ve cuánto **todavía puede** mover con las tres palancas (ciclo, simulado). Operación ve Durante y Antes en Turno e Identificar; mantenimiento ve el cinturón y los planes plegados. Nadie tiene que leer un párrafo: números grandes, ⓘ y globos para el «por qué».

**Lo que no es.** No es simulación de planta/proceso con P&ID y planos (línea **gemelo digital**, cap. **1 §1.6**), ni un LLM sobre el P&ID. Aquí el motor existente (colchón, orden de cierre, costo si falla hoy, evitable, historia de fallas) se empaqueta en **planes de acción** con barriles. El LLM no produce esos números.

## 11.1a Mapa palanca → pantalla (front hecho)

Texto largo de producto (`PALANCA_PRODUCTO` en `escenarios.ts`) **no va impreso en pantalla**: solo en ⓘ y globos. Componentes: `BloqueCiclo`, `CicloCifras`, `PlanesDe` en `src/widgets/ciclo/Ciclo.tsx`.

| Palanca | Pantallas (rol típico) | Qué ve en una frase |
|---|---|---|
| **1 · Antes** | Resumen (columna 1), Riesgo, Mantenimiento «1 · Intervenir», Bombas/vigía, Confiabilidad «¿Acierta el vigía?» | Equipos que avisan + bbl si fallan hoy |
| **2 · Durante** | Resumen (columna 2), Turno «2 · …», Identificar, Riesgo (perdiendo), ficha/detalle bomba | Lo que se pierde ahora + recuperar antes del MTTR |
| **3 · Después** | Resumen (columna 3), Diferidos, Mantenimiento (palancas/pareto), Confiabilidad | Lo que más costó en el período + no repetir |

Introducción al entrar: chips `1 Antes · 2 Durante · 3 Después` + ⓘ (`Onboarding.tsx`). Capacidad `planes:decidir`: supervisor, jefe de mantenimiento, confiabilidad (`POST /api/planes/:id`).

## 11.1b Presentación en pantalla (gerente y demás roles)

### Resumen del activo (`#/ger/resumen/…`)

Orden **del arriba hacia abajo**:

1. **`BloqueCiclo`** (retorno simulado) — **antes** del libro medido.
2. **`MEDIDO · PERÍODO`** — barriles diferidos del período (custodia); ⓘ «Medido vs simulado».
3. Promedio diario, cierre, tendencia, por equipo, por campo (sin cambio respecto al capítulo 6A).

Dentro de `BloqueCiclo`:

| Elemento | Comportamiento | Texto visible |
|---|---|---|
| Cifra hero | `retornoBbl` + `valorUsd?` | «**45.233**» + «bbl · retorno» + USD; chips `Antes · Durante · Después · simulado` |
| Explicación del retorno | `Info` | Título «Tres palancas»; cuerpo = `AYUDA_RETORNO` (incluye que es simulado) |
| Tres columnas | `CeldaFase` × 3 | «**1** Antes», «**2** Durante», «**3** Después»: bbl, barra de proporción, equipos; **sin** párrafo bajo cada columna |
| Producto por palanca | `Tip` al pasar el cursor / foco | Filas: producto (`PALANCA_PRODUCTO`), equipos con bbl; en impresión: pista del lema |
| Ir a la pantalla | clic en la celda | Enlace a Riesgo / Turno / Diferidos según menú del rol |
| **Planes de acción** | `PlanesDe` **plegado por defecto** | Botón «**Ver planes de acción**» + contador (p. ej. 11); al abrir: una línea por plan; «Ocultar planes» |

Fila compacta de un plan (expandido): `1` · `GU-04` · *Intervenir aislamiento antes de que pare* · **10.639 bbl**. Párrafos (`accion`, `supuestos[]`) solo en **globo** (`Tip`). Orden: mayor `bbl` primero. Máximo 12 filas en Resumen.

### Cinturón en operación y mantenimiento

`CicloCifras`: retorno + tres mini-columnas (misma lógica, sin lista de planes). Pantallas: **Riesgo**, **Turno**, **Mantenimiento** (arriba del contenido propio).

### Planes en otros contextos

Misma regla **plegada por defecto** en: **Identificar** (planes «durante · identificar»), **Mantenimiento** (todos los tramos), **ficha ejecutiva**, **detalle de bomba**. Título largo tipo «PLANES DE ACCIÓN · SIMULADO» **retirado**; solo el botón «Ver planes de acción».

### Medido vs simulado (riesgo comercial)

| Cifra | Entra al libro | Cómo se etiqueta en UI |
|---|---|---|
| Diferido del período | Sí | «MEDIDO · PERÍODO», «barriles diferidos», sello de publicación |
| Retorno del ciclo | **No** | Chip «simulado»; ⓘ en Resumen y cinturón |

Reglas de presentación compartidas: capítulo **8 §8.8** (ⓘ y globos) y **8 §8.13** (listas plegables del ciclo).

## 11.1c Qué significa cada tramo (para el servidor y la venta)

| Tramo | Fórmula (resumen) | Qué justifica la compra en la demo |
|---|---|---|
| **Antes.bbl** | Σ `costoFalla` de alto impacto en riesgo | «Si falla hoy, esto cuesta» — priorizar intervención |
| **Durante.bbl** | Ahorro vs MTTR + evitable orden TRIM; identificar = 0 | «Cada hora que sigue parada cuesta X» — apurar reparación e identificación |
| **Durante.bblDia** | Σ `bblDia` perdiendo (alto impacto) | Ritmo actual de pérdida (no suma al retorno) |
| **Después.bbl** | `evitablePorOrden` + palanca por parte top del período | «Atacar la parte que más costó» — no repetir |
| **retornoBbl** | suma de los tres tramos | Una sola cifra para el pitch; **no** es recuperación ya lograda |

Operación y mantenimiento ven las mismas cifras en corto y los mismos planes plegados. Quien tiene `planes:decidir` acepta y marca ejecutado; el front invalida caché y vuelve a pedir el GET ciclo.

### Ejemplo con los datos del demo (septiembre 2026, portafolio, mes cerrado)

`referencia/ciclo/portafolio-2026-09.json`. El reloj del demo es 2-oct-2026 14:00 (−05:00). ANTES y DURANTE miran el **ahora** (equipos en riesgo / perdiendo hoy); DESPUÉS mira el **período pedido**.

| Cifra | Valor | De dónde |
|---|---:|---|
| ANTES | 42.017 bbl · 6 equipos | Σ `costoFalla` de alto impacto en riesgo (GU-04, MN-07, MN-18, MN-27, GU-07, P-201B de Morichal) |
| DURANTE | 2.102 bbl · 2.349 bbl/d · 1 equipo | P-201B de La Ceiba: 2.072 bbl si vuelve antes del MTTR + 30 bbl de orden TRIM; identificar = 0 |
| DESPUÉS | 15.607 bbl · 5 planes | palancas de aislamiento (Morichal, Ceiba, Guacamayo) + evitable por orden de Morichal y Ceiba |
| **Retorno** | **59.726 bbl · 2,87 M USD** | suma de los tres tramos |

El Resumen del gerente usa el **período de la cabecera**. Con «octubre en curso» DESPUÉS es más chico (el mes recién empieza); ANTES y DURANTE no cambian porque salen del **ahora**. Un servidor que ignore `desde`/`hasta` en DESPUÉS falla la referencia y muestra otro ROI.

**Misma fecha del reloj, dos lecturas de retorno (portafolio):**

| Período en cabecera | retornoBbl (≈) | Antes | Durante | Después | Nota |
|---|---:|---:|---:|---:|---|
| Septiembre **cerrado** (`referencia/ciclo/portafolio-2026-09.json`) | 59.726 | 42.017 | 2.102 | 15.607 | DESPUÉS incluye palancas + evitable del mes completo |
| Octubre **en curso** (2-oct-2026 14:00, demo en pantalla) | **45.233** | 42.017 | 2.102 | **1.114** | DESPUÉS solo lleva lo acumulado del 1-oct → ahora; el gerente ve la lista de planes **plegada** |

Comprobación rápida: \(42.017 + 2.102 + 1.114 = 45.233\).

---

## 11.2 Fórmulas (el servidor las corre)

Sea \(Q\) el crudo por día que se pierde si el equipo para (`bblDia` / `crudoBpd`), \(d_i\) las horas de cada falla cerrada, \(\bar d\) su promedio (`mdtH`), \(h\) las horas de colchón de hoy, \(t\) las horas ya parada.

### ANTES

Para cada `riesgoAhora` con `estado === 'en-riesgo'` y `altoImpacto`:

\[
\text{bbl}_{\text{antes}} = \texttt{costoFalla}
\]

`costoFalla` ya está en 5B §«Costo si falla hoy»: en una bomba de disposición con tanque, \(Q \times \overline{\max(0, d_i - h)} / 24\). Ausente (el plan sigue, sin cifra) si no hay fallas cerradas. `horas` = cruce de alarma.

Id del plan: `antes:{campoId}:{equipo}:{parte}` (`parte` = `_` si no hay).

### DURANTE

Para cada `riesgoAhora` con `estado === 'perdiendo'` y `altoImpacto`:

1. **mttr** (si hay `mdtH` y \(Q > 0\)):

\[
\text{bbl}_{\text{mttr}} = Q \times \max(0,\ \bar d - t) / 24
\]

Si ya lleva más que su promedio fuera, el ahorro es 0: el plan no inventa un número. Id: `durante:{campoId}:{equipo}:mttr`.

2. **orden** (bomba de reinyección, parada abierta): `paradaMedida.evitable` (5B §4, `evitableDeEvento`). Cerrar el resto del agua en el orden TRIM. Id: `durante:{campoId}:{equipo}:orden`.

3. **identificar** (la parada pide parte): `bbl = 0`. El tanque aún aguanta `llenado.colchon.horas` si está calculado. Desbloquea el arranque; no ahorra crudo por sí. Id: `durante:{campoId}:{equipo}:identificar`.

`durante.bblDia` = \(\sum Q\) de esos equipos (lo que se pierde ahora). Un plan con `bbl = 0` **no entra** a `durante.bbl` ni al retorno.

### DESPUÉS (período del libro: `desde` / `hasta` de la consulta)

1. **orden**: `libro.evitablePorOrden` del campo, si \(> 0\). Id: `despues:{campoId}:orden`.
2. **palanca**: `libro.porParte[0].bbl` (la parte que más costó). Id: `despues:{campoId}:{parte}:palanca`.

### Retorno

\[
\text{retornoBbl} = \text{ANTES.bbl} + \text{DURANTE.bbl} + \text{DESPUÉS.bbl}
\]

`valorUsd` = \(\sum \text{bbl} \times \texttt{precioEn}(\text{config}, \text{campo}, \text{ahora})\) cuando el campo tiene precio firmado; ausente si ninguno lo tiene.

**Identidades** (`npm run verificar`, sección 21): `retorno = suma de tramos`; `ANTES.bbl = Σ costoFalla` de alto impacto en riesgo; `DURANTE.bblDia = Σ bblDia` de alto impacto perdiendo; cada plan `simulado === true`.

---

## 11.3 Contrato (lo que el servidor tiene que producir)

Forma en `contrato.ts` (`CICLO`) y anexo A. Cuerpo `{ "datos": …, "refs": {} }`. Fechas ISO con zona. Campos opcionales **omitidos**, no `null`.

### `GET /api/vistas/ciclo?campos=&desde=&hasta=`

El servidor:

1. Recorta `campos` a los de la persona (como `/vistas/riesgo`).
2. Corre `cicloValor(campos, desde, hasta, ctx, versiones)` con el mismo `ctx` y el historial de configuración que las demás vistas.
3. Aplica las decisiones persistidas (`conDecisiones`) sobre cada `plan.id`. `estado` ausente = propuesto. No se manda `null`.
4. **No** hay GET de planes al arrancar: el estado viaja aquí. El arranque sigue en diez GET (capítulo 2.5).

Ejemplo recortado (portafolio, septiembre; el caso completo está en `referencia/ciclo/portafolio-2026-09.json`):

```json
{
  "datos": {
    "campos": ["ceiba", "morichal", "guacamayo", "palmar", "zarza"],
    "desde": "2026-09-01T00:00:00.000-05:00",
    "hasta": "2026-10-01T00:00:00.000-05:00",
    "antes": { "bbl": 42017.113752115896, "equipos": 6, "planes": [ "…" ], "valorUsd": 2016821.4601015623 },
    "durante": { "bbl": 2102.1927657430356, "equipos": 1, "planes": [ "…" ], "valorUsd": 100905.25275566572, "bblDia": 2349.248864150644 },
    "despues": { "bbl": 15606.750550690685, "equipos": 5, "planes": [ "…" ], "valorUsd": 749124.026433153 },
    "retornoBbl": 59726.05706854962,
    "valorUsd": 2866850.7392903813
  },
  "refs": {}
}
```

Cada `PlanAccion` trae `id`, `fase`, `campoId`, `equipo`, `titulo`, `accion`, `bbl`, `supuestos[]`, `simulado: true`; y, si aplican, `parte`, `horas`, `valorUsd`, `estado`.

Comparación: contenimiento (el servidor puede mandar más campos), números con diferencia ≤ \(10^{-6}\) relativa o \(0{,}005\) absoluta, orden de las listas importa. Capítulo 9.1.

### `POST /api/planes/:id`

Cuerpo `{ "estado": "aceptado" | "ejecutado", "motivo" }`. Capacidad `planes:decidir`. Campo del plan entre los de la persona.

Para saber si el id existe: armar el ciclo con **todos** los campos de la persona y el período de historia completa (`planPorId`). `404` si no está.

Orden de rechazo (el de todas las escrituras, capítulo 2.8):

| HTTP | Cuándo | Mensaje (demo) |
|---|---|---|
| 403 | sin capacidad | «Los planes los acepta operación o mantenimiento.» |
| 403 | sin persona activa | «Nadie con acceso activo tiene este rol…» |
| 403 | campo ajeno | «Ese campo no lo tiene asignado.» |
| 404 | el id no es un plan del ciclo actual | «Ese plan no existe.» |
| 422 | `estado` distinto de aceptado/ejecutado | «Un plan se acepta o se marca ejecutado.» |
| 422 | motivo < 5 | «Falta el motivo…» |
| 409 | aceptar uno ya aceptado o ejecutado; ejecutar uno no aceptado | «Ese plan ya está aceptado.» / «Hay que aceptarlo antes…» |

Responde `{ "datos": { "decision": { "id", "estado", "por", "porId", "fecha", "motivo" } }, "refs": {} }`. `por`, `porId` y `fecha` los pone el servidor (salen del token). Un plan **no se revierte**. Las cifras del plan **no cambian** con la decisión: solo el `estado`. Tras el POST, el front invalida la caché y vuelve a pedir el GET ciclo.

Capacidad `planes:decidir` ya está en `capacidad` y en `rol_capacidad` (sup, jefe, conf) en `sql/esquema.sql` y `sql/ejemplos.sql`. El gerente **no** decide; solo ve.

### Tabla `decision_plan` (el servidor la crea)

No está en `sql/esquema.sql` todavía: el demo guarda las decisiones en la sesión del navegador (`sesion.planes`). En producción esa tabla es obligatoria. No entra al recuento de 89 tablas del capítulo 3 hasta que se agregue al esquema y a `tablas.json`.

```sql
create table decision_plan (
  id      text primary key,          -- el id del plan (antes:campo:equipo:parte, …)
  estado  text not null check (estado in ('aceptado', 'ejecutado')),
  por     text not null,
  por_id  text not null references usuario(id),
  fecha   timestamptz not null,
  motivo  text not null check (char_length(motivo) >= 5)
);
-- Solo inserción, o un UPDATE en un solo sentido (propuesto → aceptado → ejecutado).
-- El GET ciclo lee la última fila por id.
-- Un segundo POST con estado = ejecutado no borra el rastro del aceptado.
```

Alineado con el resto del modelo (capítulo 3): `por_id` es la persona del token; `por` es el texto que ve la pantalla («Nombre · rol»).

### Qué hace el demo y qué no se copia

| En el demo | En el servidor de producción |
|---|---|
| Las decisiones viven en `sesion.planes` (se pierden al recargar) | Persisten en `decision_plan` |
| `cicloValor` corre en el navegador (`src/entities/`) | Corre en Node (opción A) o se reescribe; mismos números |
| Tras el POST, el overlay se aplica en la costura (`conDecisiones`) | El GET ya trae `estado` aplicado; el front no vuelve a calcular |

---

## 11.4 Lista de trabajo del desarrollador del backend

Esto lo hace quien construye el servidor, **no** el front. El front ya apunta a estos endpoints.

### MVP (1–2 sprints) — para conectar el front al servidor

1. **Motor.** Correr `cicloValor` en Node sobre los insumos de la base (opción A del capítulo 2). Misma `ctx` y mismas `versiones` que `/vistas/riesgo` y `/vistas/diferidos`. Si se reescribe en otro lenguaje: las identidades de 11.2 tienen que valer.
2. **Tabla.** Crear `decision_plan`. Capacidad `planes:decidir` ya está en el esquema de personas.
3. **GET.** `GET /api/vistas/ciclo?campos=&desde=&hasta=` según 11.3. Recortar a los campos de la persona. Aplicar overlay. Caché por contexto (el GET recalcula libro + riesgo + paradas: no dejar que cada pantalla dispare tres motores; el front ya pide **un** GET).
4. **POST.** `POST /api/planes/:id` con la tabla de rechazos, mismos textos. No revertir. No cambiar `bbl`.
5. **Comparar.**

```bash
node scripts/referencia.mjs comparar --base-url=http://su-servidor:8080
```

Tiene que pasar los 122 casos, incluidos los 6 de `referencia/ciclo/`.

6. **Front contra el servidor.** En `.env.local`:

```bash
VITE_FUENTE=http
VITE_API_URL=http://su-servidor:8080/api
```

Comprobar a mano (el e2e auditor ya exige los textos):

- Resumen gerente `#/ger/resumen/ceiba~portafolio/curso`: «bbl · retorno», «Antes», «Durante», «Después», «simulado», «Ver planes de acción», «MEDIDO»; **no** debe verse en pantalla el párrafo largo de un plan (p. ej. «Reparar y arrancar: cada hora…») con la lista plegada.
- Riesgo / Turno / Mantenimiento: cinturón con las tres columnas; Mantenimiento con «Ver planes de acción» plegado.
- Ficha de P-201B: planes DURANTE (mttr, orden, identificar) tras expandir.
- Identificar: «Ver planes de acción» (identificar el daño).
- Como jefe o supervisor: aceptar un plan y marcarlo ejecutado; recargar: el estado sigue (ya no vive en el navegador).

**Hecho cuando:** el GET ciclo contiene el JSON de `referencia/ciclo/portafolio-2026-09.json` (contenimiento, 1e-6 relativo) y el POST acepta / rechaza con los mismos textos. El gerente ve el mismo ROI que en el demo.

### Después del MVP (no bloquea la conexión del front)

- Informe de planes ejecutados en el período (bbl «perseguidos» vs diferido real): **no restar del libro**. Tablero de gestión, cifra simulada.
- WhatsApp: avisar el plan ANTES cuando `horas` < 24 h (reusar plantillas de 5D). **RETIRADO (27-oct-2026)**: no se construye.
- SAP: el plan aceptado **no crea** la orden; el aviso M1/M2 sigue siendo el de hoy (`sap:aviso`).

### Fuera de este producto (no implementar)

- Grafo de conocimiento (P&ID, datasheets) para sugerir **cuál** intervención: no cambia las cifras del ciclo.
- Gemelo digital (simulación de proceso/planta/línea con planos y datasheets): línea de producto aparte; no es el MVP TRIM (cap. 1 §1.6).

### Riesgos (dueño = backend, salvo el primero)

| Riesgo | Mitigación | Dueño |
|---|---|---|
| El gerente toma el retorno como barriles ya recuperados | Chip «simulado»; ⓘ «Medido vs simulado»; retorno **encima** del libro medido | front (hecho) |
| La lista de planes abruma en la primera pantalla | `PlanesDe` plegado: «Ver planes de acción»; detalle en globo | front (hecho) |
| El GET ciclo es caro (recalcula libro + riesgo + paradas) | Misma caché por contexto que `riesgoAhora` / `libro`; un GET, no tres pantallas pidiendo el motor | **backend** |
| Un plan ANTES desaparece cuando la parte deja de avisar | El id incluye parte; si ya no está en `cicloValor`, POST → 404. El historial queda en `decision_plan` | **backend** |
| Doble conteo ANTES + DESPUÉS (la misma parte) | Se dice en supuestos: ANTES es si falla **hoy**; DESPUÉS es lo **ya** perdido. No se restan | producto (hecho) |

### Criterio de aceptación comercial (front · ya cumple)

En una demo de 20 minutos, el gerente de activo ve:

1. Cuánto dejó de producir (libro, cifra medida).
2. Cuánto puede todavía evitar o recuperar (ciclo, cifra simulada), partido en antes / durante / después.
3. A qué equipo ir, con un clic a la ficha.
4. Que operación puede aceptar el plan y que mantenimiento lo marca ejecutado.

Eso es el retorno de inversión visible. El libro sigue siendo la custodia; el ciclo es la palanca. El desarrollador del backend tiene que **conservar esos números** al reemplazar el simulador.
