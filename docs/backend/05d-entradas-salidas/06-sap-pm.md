# 5D.6 · SAP PM: avisos que salen, órdenes, horas y repuestos que entran

SAP Plant Maintenance es el **sistema de registro del mantenimiento** de la operadora: ahí viven avisos, órdenes, horas confirmadas, historial y stock. TRIM **no lo reemplaza y no crea órdenes**. Hace dos cosas:

1. **Le envía a SAP el aviso** (M2 avería, M1 solicitud) con la evidencia que tiene: equipo, hora del PLC, parte sospechosa, modo de falla, tags. El planeador decide en SAP si lo vuelve orden, la libera y la cierra.
2. **Lee de SAP** el estado de avisos y órdenes, las horas confirmadas, el historial y el stock de repuestos críticos, para mostrarlos junto a los barriles.

Por qué importa: una bomba de reinyección parada sin aviso en SAP es una parada que nadie va a atender a tiempo («parado, SAP no lo sabe»); y la diferencia entre **reparación activa** (horas confirmadas en SAP) y **indisponibilidad total** (la parada que ve el PLC) dice si la parada larga fue de mantenimiento o de **espera del repuesto**: es lo que el jefe de mantenimiento puede bajar.

Código: `src/entities/sap.ts` (352 líneas), `src/shared/api/sap.ts` (110), `src/shared/api/escrituras.ts:195-224`, `src/widgets/sap/BloqueSap.tsx`, `PanelSapMantenimiento.tsx`, `TresRelojes.tsx`, `src/pages/Mantenimiento.tsx`, `src/pages/Trabajo.tsx`, `src/widgets/conectores/Integraciones.tsx`.

> 🔴 **Todo lo que se lee de SAP en el demo está simulado** con una regla fija y declarada a partir de la historia de paradas del PLC (`armarHistoria`, `sap.ts:228-316`), más un stock fijo (`STOCK`, `sap.ts:154-168`) y una identidad de equipo calculada con un hash (`identidadSap`). En producción viene de SAP por el backend: S/4HANA con sus API OData de avisos, órdenes, equipos y stock, o ECC con las BAPI de PM o IDoc; el integrador confirma versión y mecanismo (`CONTRATO.md` · «SAP PM»). **El front solo habla con el backend.**

---

## 1. Lo que TRIM envía: el aviso (`POST /api/sap/avisos`)

### Aviso de mantenimiento (`AvisoSap`)

**Qué es.** La notificación de SAP PM que TRIM crea con la evidencia del PLC. `M2` = **avería** (el equipo paró: indicador de parada de SAP en verdadero); `M1` = **solicitud** (el equipo marcha y una parte avisa: la predicción del vigía o una variable fuera de banda).

```ts
// src/entities/sap.ts:42-67
interface AvisoSap { numero; tipo: 'M1'|'M2'; campoId; equipo; descripcion; prioridad: 1|2|3|4 /* 1 muy alta · 4 baja */;
  parte?: ParteId /* catálogo B */; modo?: string /* daño, catálogo C = modo ISO 14224 */; inicioAveria?: string /* hora del PLC */;
  parada: boolean; evidencia: string[] /* texto largo */; creado; creadoPor; origen: 'trim'|'sap'; evento?; orden?; cerrado: boolean }
```

**Dónde se ve.** Ficha de un equipo (panel lateral, todos los roles que lo abren), bloque «SAP · MANTENIMIENTO · equipo {equipoSap} · {ubicación técnica}» (ⓘ «De dónde sale: Avisos, órdenes, horas y stock vienen de SAP. La orden la crea el planeador en SAP; TRIM envía el aviso y avisa cuando la orden se libera.»). Sin aviso ni orden abiertos y con `sap:aviso` (sup, oper, jefe, conf): «Sin aviso ni orden abiertos» + chip fuerte «parado, SAP no lo sabe» si el equipo está detenido (o el riesgo dice «perdiendo», o hay una pregunta abierta) + botón «Enviar aviso a SAP».

**Fórmula (el formulario prellenado, `BloqueSap.tsx:144-223`).**

| Campo | Valor inicial |
|---|---|
| `tipo` | `M2` si parado (`marcha = detenido`, riesgo «perdiendo» o pregunta abierta), si no `M1` |
| `descripcion` («Qué pasa») | parado: «Parada de {equipo}: {parte sugerida en minúscula}» o «Parada de {equipo}, sin causa identificada»; si no: «{equipo}: {motivo del riesgo o estado del equipo o "revisar"}» |
| `parte` | la de la pregunta abierta o la del riesgo; selector con el catálogo de daños («sin identificar» permitido) |
| `modo` («Daño (lo que se ve)») | el declarado en la pregunta, si lo hay; opciones «{código} · {nombre}» de esa parte |
| `prioridad` («Prioridad en SAP») | 1 si la severidad del equipo es 1, 2 si es 2, si no 3; opciones «1 · muy alta», «2 · alta», «3 · media», «4 · baja» |
| `inicioAveria` | inicio de la pregunta o `desde` del riesgo (ISO) |
| `evidencia` | hasta 5 renglones sin repetir: la evidencia de la causa, el motivo del riesgo, «Variable: {tag}», la lectura del equipo |
| `evento` | id de la pregunta abierta (el evento del PLC) |

**Reglas del servidor (en orden).**

| # | Regla | Texto del demo | HTTP |
|---|---|---|---|
| 1 | `sap:aviso` | «Su rol no envía avisos a SAP.» | 403 |
| 2 | persona activa | «Nadie con acceso activo tiene este rol: …» | 403 |
| 3 | `campoId` del cuerpo entre los campos de la persona | «Ese campo no lo tiene asignado: el aviso no se envía.» | 403 |
| 4 | descripción ≥ 8 caracteres (`TEXTO_LIBRE_MINIMO`) | «Escriba qué pasa, con al menos una frase corta.» con `campo: "descripcion"` | 422 |
| 5 | **un aviso abierto por (campo, equipo)**, contando los de SAP y los enviados | «Ya hay un aviso abierto de {equipo} en SAP: el {número}.» | 409 |
| 6 | crear: `numero` (el de SAP), `creado` (ahora), `creadoPor: "{nombre} · desde TRIM"`, `origen: "trim"`, `cerrado: false`; el equipo y la ubicación técnica de SAP salen del maestro (`identidadSap`) | → `{ datos: { aviso } }` | 200 |

**Ejemplo con los datos del demo.** (Corrido.) Técnico → «Su rol no envía avisos a SAP.»; producción → igual; supervisor (solo La Ceiba) para Morichal → «Ese campo no lo tiene asignado: el aviso no se envía.»; descripción «fuga» → «Escriba qué pasa, con al menos una frase corta.» (`campo: "descripcion"`); un aviso de K-101 de La Ceiba → «Ya hay un aviso abierto de K-101 en SAP: el 10004149.» (el M1 abierto del aire de instrumentos). El aviso del contrato para P-201B (M2, prioridad 1, sello `ELP`, «Sello mecánico: fuga por el lado de acople», inicio 03:52, evidencia `ZS-2011 · marcha → paro · 2 de oct, 03:52`) se crea con `numero: "10004155"` (el mayor de los avisos más uno: hay 55, del 10004100 al 10004154), `creado: "2026-10-02T14:00:00-05:00"`, `creadoPor: "Nelson Ortiz · desde TRIM"`, `origen: "trim"`, `cerrado: false`; un segundo aviso del operador para P-201B → «Ya hay un aviso abierto de P-201B en SAP: el 10004155.».

**Casos borde.**
- **TRIM no crea órdenes**: el aviso queda «sin orden» hasta que el planeador la cree en SAP. En la ficha: «Aviso {n} · {avería|solicitud} · prioridad {p} · {recién enviado | hace {fmtHoras}} · {creadoPor}», «{descripción}», chip «sin orden» (ⓘ «Sin orden todavía: La crea el planeador en SAP, y cuando la libere TRIM le avisa al técnico.»).
- **Prioridad ≠ alarma.** La prioridad de SAP (1 muy alta … 4 baja) es la de la operadora para planear el trabajo; **no es** la prioridad de alarma ISA-18.2/ISA-101 de TRIM (P1 ◆, P2 ▲, P3 ■). No se pintan con los colores de alarma. Lo único que se marca es un **aviso de prioridad 1 sin orden hace más de 4 h** (P3 ■ «fuera de meta», panel «ABIERTO EN SAP»).
- **Lo que el demo no revisa y el servidor sí debe:** que `equipo` sea del campo (y de la flota), que `tipo` ∈ {M1, M2}, que `prioridad` ∈ 1..4, que `parte`/`modo` sean del catálogo del equipo y que `evento`, si viene, exista y sea de ese equipo (el demo aceptó `evento: "X"` corriendo la prueba).
- Si SAP rechaza el aviso o no responde: el servidor responde 5xx/502 sin mensaje interno y **no** registra el aviso como enviado (la pantalla dirá «No se guardó: …»).

**Quién lo calcula y por dónde viaja.** Servidor (crea el aviso en SAP y lo guarda). Tabla `aviso_sap` (clave `numero`; uno abierto por (campo, equipo)). `GET /api/sap/avisos?campos` → `AvisoSap[]` completos, del más reciente al más viejo **por instante** (las horas llegan con zonas distintas), incluidos los enviados desde TRIM.

**Referencia.** `src/shared/api/escrituras.ts:197-224`; `src/widgets/sap/BloqueSap.tsx`; `CONTRATO.md` · «`POST /api/sap/avisos`».

---

## 2. Lo que TRIM lee de SAP

### Órdenes de trabajo (`OrdenSap`, `GET /api/sap/ordenes`)

**Qué es.** Las órdenes de mantenimiento que el planeador creó en SAP, con su clase, estado, técnico y horas confirmadas.

```ts
// src/entities/sap.ts:71-91
interface OrdenSap { numero; clase: 'PM01'|'PM02'|'PM03'; campoId; equipo; descripcion; estado: 'CRTD'|'REL'|'PCNF'|'CNF'|'TECO';
  prioridad: 1|2|3|4; creada; liberada?; cierreTecnico?; tecnico? /* id de persona en TRIM */; puesto /* puesto de trabajo */;
  aviso?; horasReales /* confirmadas: reparación activa */; repuestos: { material; descripcion; cantidad }[]; evento? /* parada del PLC (PM01) */ }
```

| Dato | Significado | Texto en pantalla |
|---|---|---|
| `clase` | la de la operadora; en el demo **PM01 correctivo**, **PM02 preventivo**, **PM03 predictivo**. El mapeo de clases se configura | «correctivo» / «preventivo» / «predictivo» |
| `estado` | estado de sistema de SAP, en el orden en que se recorre | `CRTD` «creada, sin liberar» · `REL` «liberada» · `PCNF` «en ejecución» · `CNF` «ejecutada» · `TECO` «cerrada» |
| `tecnico` | **id de la persona en TRIM** (resuelto por su correo en SAP); si la orden va a un contratista, solo `puesto` | el nombre de la persona, o «la cuadrilla {puesto}» / «cuadrilla {puesto}» |
| `horasReales` | horas confirmadas en SAP | «{n1} h» en el historial |
| `evento` | (PM01) la parada del PLC que atendió | — (se usa en los tres relojes) |

**Ejemplo con los datos del demo.** (Corrido.) **62 órdenes**: PM01 49 (todas TECO: Morichal 23, La Ceiba 14, Guacamayo 12), PM02 7 (TECO), PM03 6 (1 REL, 5 TECO). **55 avisos**: M2 de SAP 40 (cerrados), M2 de TRIM 9 (cerrados), M1 de TRIM 1 abierto + 5 cerrados. (Con el demo del 9-oct cambian las fallas de las electrosumergibles: MN-05 y MN-16 dejan de ser PM01 y pasan a PM03 del vigía; aparecen las de LC-04, LC-11, MN-33 y GU-07.) La primera orden: `40012000`, PM01, Morichal, P-201B, «Reparar sello mecánico de P-201B», TECO, creada `2025-10-05T23:28:12Z`, liberada `2025-10-06T00:28:12Z`, cierre técnico `2025-10-08T20:11:02Z`, puesto `MEC-CONTRATISTA`, aviso `10004100`, 8 h, evento `EV-M2011-251005`, repuesto `MAT-SELLO-201` × 1. La única abierta: `40012056`, PM03, La Ceiba, K-101, REL, liberada `2026-10-02T09:10:00-05:00`, técnico `tec` (Óscar Daza), puesto `MEC-CEIBA`, aviso `10004149`, 0 h.

**Regla de la simulación del demo** (lo que el backend **reemplaza** con SAP):

| Origen en el PLC | Aviso | Orden |
|---|---|---|
| cada **falla cerrada** de un equipo de la flota (no disparos, con fin), en orden de inicio | M2, prioridad 1 si causó barriles (> 0) si no 2, parte de la falla, «{Parte}: parada de {equipo}», `inicioAveria` = inicio, cerrado; desde la puesta en marcha (2026-09-01, Colombia) `origen: trim`, `creado` = inicio + 0,05 h, «TRIM · desde la parada del PLC»; antes `origen: sap`, + 0,5 h, «Operación, directo en SAP» | PM01, TECO, creada inicio + 1 h, liberada + 2 h, cierre técnico = fin + 3 h, `horasReales = min(duración, 8 h)`, técnico `tec` en La Ceiba (puesto `MEC-CEIBA`) o ninguno (`MEC-CONTRATISTA`), un repuesto: el material de la parte para esa familia |
| cada parada del **programa** firmado | — | PM02, prioridad 3, descripción = motivo; creada 7 días antes, liberada 1 día antes (no existe si la creación es futura); estado TECO si terminó, PCNF si empezó, REL si ya se liberó, CRTD si no; cierre = fin + 2 h; horas `min(duración, 8)` si terminó |
| acción inmediata del aire de La Ceiba (K-101) | M1 abierto `10004149`, «Aire de instrumentos degradado: presión de cabezal cayendo», creado 07:40 de hoy, «TRIM · el aire cae hace 7 días» | PM03 REL `40012056` |
| cada **predicción intervenida** del vigía | M1 cerrado, «El vigía anticipa falla: {parte} de {equipo}», evidencia «Predicción {id} · ventana hasta el {fecha}», creado emisión + 0,2 h | PM03 TECO, creada + 2 h, liberada + 4 h, cierre = intervención, 4 h |

Numeración: avisos desde `10004100`, órdenes desde `40012000`. Una respuesta posterior de un operario cambia la parte del aviso y de la orden (SAP recibe ese dato), sin mover la numeración (`conPartesDeHoy`).

**Casos borde.** La reparación activa del demo es siempre ≤ 8 h (jornada fija), por eso los promedios de «reparación activa» salen en 8 h casi siempre; en producción son las horas reales confirmadas.

**Quién lo calcula y por dónde viaja.** Servidor (lee SAP). `GET /api/sap/ordenes?campos` → `OrdenSap[]` de la más reciente a la más vieja (por `creada`). Las horas por clase **las suma el front** sobre lo recibido (ya no hay `/api/sap/horas`).

**Referencia.** `src/entities/sap.ts:31-104, 178-316`; `referencia/sap/ordenes-*.json` y `avisos-*.json` (salidas esperadas por campo y portafolio).

---

### Horas proactivas contra correctivas (`horasPorClase`)

**Qué es.** El indicador que más pesa para un jefe de mantenimiento: de las horas confirmadas en SAP, cuántas fueron **antes de que falle** (preventivo + predictivo) contra **porque falló** (correctivo). Si el proactivo no sube, las fallas no bajan.

**Dónde se ve.** Mantenimiento (`#/jefe/mantenimiento/…`), panel «HORAS EN SAP»: «**{n0(%)} %** preventivo o predictivo» (ⓘ «Mantenimiento proactivo»), «sin meta configurada», barra, «{n1} h proactivas · {n1} h correctivas · {n} órdenes».

**Fórmula.** Con las órdenes cuya fecha de referencia $t_o$ = `cierreTecnico` (o, si no tiene, `liberada`, o `creada`) cae en $[\text{desde}, \text{hasta})$:

$$ P = \sum_{o:\ \text{clase} \in \{PM02, PM03\}} h_o, \qquad K = \sum_{o:\ \text{clase} = PM01} h_o, \qquad \%_{\text{proactivo}} = \frac{P}{P + K} \cdot 100 $$

| símbolo | significado | unidad | de dónde sale |
|---|---|---|---|
| $h_o$ | `horasReales` de la orden | h | SAP (horas confirmadas) |
| $t_o$ | cierre técnico, o liberación, o creación | instante | SAP |

**Ejemplo con los datos del demo.** (Corrido.)

| Período | Alcance | Proactivo | Correctivo | Órdenes | % |
|---|---|---|---|---|---|
| Septiembre 2026 | La Ceiba | 4 h | 24 h | 4 | 14,29 → «14 %» |
| Septiembre 2026 | 5 campos | 20 h | 80 h | 15 | 20 % |
| Jul–sep 2026 | La Ceiba | 12 h | 48 h | 8 | 20 % |
| Jul–sep 2026 | 5 campos | 36 h | 160 h | 27 | 18,37 → «18 %» |
| Últimos 12 meses | La Ceiba | 20 h | 112 h | 17 | 15,15 → «15 %» |
| Últimos 12 meses | 5 campos | 76 h | 384,09 h | 61 | 16,52 → «17 %» |
| Octubre en curso | cualquiera | 0 | 0 | 1 | sin dato |

La Ceiba, septiembre: PM03 `40012057` (LC-14, 4 h, cerrada 26-sep) + PM01 `40012043` (P-201B rodamientos, 8 h, 23-sep) + PM01 `40012046` (LC-11 aislamiento, 8 h, 29-sep) + PM01 `40012048` (LC-04 aislamiento, 8 h, 29-sep) → $4/(4+24) = 14{,}29\,\%$; en pantalla «14 %», «4,0 h proactivas · 24,0 h correctivas · 4 órdenes». (La de sello de P-201B pasó al 9-ago.)

**Casos borde.** $P + K = 0$ → `porcentaje` sin dato: «Sin órdenes cerradas en el período» (ⓘ «No hay órdenes cerradas en {período}. Escoja un período cerrado (el mes anterior, por ejemplo) para ver las horas.»). Ojo: una orden **abierta** cuenta en el período de su liberación (con 0 h); por eso en octubre la respuesta trae `ordenes: 1` con 0 h, aunque la pantalla no lo escribe: sin horas no hay porcentaje y el panel solo dice «Sin órdenes cerradas en el período» (el «1 orden» que se ve en octubre es otro: el del panel «ABIERTO EN SAP», «ahora · 0 avisos · 1 orden»). «sin meta configurada»: no hay meta de % proactivo en la configuración firmada.

**Quién lo calcula.** Front, sumando lo que llegó de `GET /api/sap/ordenes`.

**Referencia.** `src/entities/sap.ts:320-331`; `src/widgets/sap/PanelSapMantenimiento.tsx:37-68`.

---

### Los tres relojes de una falla (`relojes`, `GET /api/vistas/relojes`)

**Qué es.** Para cada falla cerrada (ISO 14224): **indisponibilidad total** (la parada que mide TRIM con el PLC), **reparación activa** (las horas confirmadas en SAP de la orden correctiva) y **espera** (la diferencia: repuesto, permisos, cuadrilla). Separarlos dice si la parada larga es de mantenimiento o de la espera.

**Dónde se ve.** Mantenimiento, panel «HORAS EN SAP», bloque «TRES RELOJES · PROMEDIO DE {n} FALLA(S)»: «Reparación activa {h}», «Espera **{h}**», «Indisponibilidad total {h}» (ⓘ «Tres relojes: Reparación activa: horas confirmadas en SAP. Espera: repuesto, permisos, cuadrilla. Indisponibilidad total: la parada que ve el PLC. Separarlos deja ver si la parada larga es de mantenimiento o de la espera del repuesto (ISO 14224).») y una barra gris partida (activa + espera = total; gris siempre, no es una alarma).

**Fórmula.** Candidatas: órdenes **PM01**, en **TECO**, con `evento`, cuyo `cierreTecnico` ∈ $[\text{desde}, \text{hasta})$. Para cada una, $T_i$ = horas de la parada del PLC `evento` (de la historia del equipo). Entran las que tienen $T_i > 0$; las demás son `excluidas`:

$$ \bar T = \frac{1}{n}\sum_i T_i, \qquad \bar A = \frac{1}{n}\sum_i \min(h_i, T_i), \qquad \bar E = \frac{1}{n}\sum_i \big(T_i - \min(h_i, T_i)\big) = \bar T - \bar A $$

| símbolo | significado | unidad | de dónde sale |
|---|---|---|---|
| $T_i$ | indisponibilidad total de la falla $i$ | h | PLC (`historialDeEquipo(...).eventos[].horas`) |
| $h_i$ | horas confirmadas de su orden PM01 | h | SAP |
| $n$ | fallas con su parada | — | cruce SAP ↔ PLC |

**Ejemplo con los datos del demo.** La Ceiba, septiembre 2026 (corrido): `EV-2011-0922` (P-201B, 15,99 h) con orden `40012043` (8 h), LC-11 (84,67 h) con `40012046` (8 h) y LC-04 (61,15 h) con `40012048` (8 h) → $\bar T = 53{,}93$ h, $\bar A = 8$ h, $\bar E = 45{,}93$ h; en pantalla «Reparación activa 8 h · Espera **46 h** · Indisponibilidad total 2,2 d». Otros (corridos): 5 campos septiembre → 10 fallas, total 96,72 h, activa 8 h, espera 88,72 h («4,0 d» de total con `fmtHoras`); La Ceiba 12 meses → 14 fallas, 193,64 / 8 / 185,64 h; 5 campos 12 meses → 49 fallas, 198,86 / 7,84 / 191,02 h; octubre en curso → sin candidatas (`null`). Desde la puesta en marcha la espera de una electrosumergible baja de semanas a 2 a 5 días (5C.4), y eso es lo que mueve el promedio.

**Casos borde.** Sin ninguna PM01 cerrada con evento en el período → la vista responde `null` y no se dibuja el bloque. Con candidatas pero ninguna con su parada → `{ fallas: 0, excluidas: n }` y los promedios ausentes («sin dato», nunca 0). Con excluidas: «{n} orden(es) fuera del promedio» (ⓘ «Promedio de {f} fallas cerradas; {n} órdenes correctivas cerradas no tienen la parada del PLC que las respalda…»). La reparación activa se recorta a la indisponibilidad ($\min$): horas de SAP mayores que la parada no dan espera negativa. Formato `fmtHoras`: < 48 h → «{n0} h»; ≥ 48 h → «{n1(h/24)} d»; más de 3 meses → «más de 3 meses».

**Quién lo calcula y por dónde viaja.** Servidor (cruza SAP con el PLC): `GET /api/vistas/relojes?campos&desde&hasta` → `{ fallas, excluidas, totalH?, activaH?, esperaH? }` o `null`.

**Referencia.** `src/entities/sap.ts:333-353`; `src/shared/api/sap.ts:93-110`; `src/widgets/sap/TresRelojes.tsx`.

---

### Repuestos críticos y stock (`Repuesto`)

**Qué es.** Los materiales críticos de un equipo, con su **stock de libre utilización en la bodega del campo** (SAP MM), el mínimo, el plazo de compra y lo que viene en tránsito. Es lo que decide si una falla será corta o larga (la espera).

```ts
interface Repuesto { material; descripcion; campoId; equipos: string[]; stock; minimo; plazoDias; enTransito?: { cantidad; llega /* AAAA-MM-DD */ } }
```

**Dónde se ve.** Ficha del equipo, «REPUESTOS CRÍTICOS»: «**{descripción}** · {stock} en bodega (mín. {mínimo})» + « · llega(n) {cantidad} el {fecha}» si hay tránsito, o « · pedirlo: {plazo} días» si falta; marca P3 ■ si falta (stock < mínimo) **y** no hay tránsito. Para `decision`: una sola línea «**En SAP:** {orden abierta | aviso abierto, sin orden todavía | sin aviso ni orden abiertos} · ■ sin stock de {repuestos bajo el mínimo **que no vienen en camino**, en minúscula}» y, por cada repuesto bajo el mínimo que sí viene, « · {descripción} llega el {fecha}» sin marca (como la ficha técnica, que no le pone ■ al que está en tránsito). Hasta el 8-oct el gerente veía «sin stock de» también lo que ya venía en camino.

**Ejemplo con los datos del demo.** P-201B de La Ceiba (corrido): Kit de sello mecánico `MAT-SELLO-201` 0 (mín. 1, 21 días, **llega 1 el 9 de oct**); Juego de rodamientos `MAT-ROD-201` 2 (mín. 1); Impulsor y anillos de desgaste `MAT-IMP-201` 0 (mín. 1, **45 días**, sin tránsito → ■ «pedirlo: 45 días»). Línea del gerente: «En SAP: sin aviso ni orden abiertos · ■ sin stock de impulsor y anillos de desgaste · kit de sello mecánico llega el 9 de oct». Pozo LC-14 (electrosumergible, comparte los del campo): Bomba electrosumergible (etapas) 1 (mín. 1, 60 días); Cable de potencia y empalme 0 (mín. 1, 30 días, llegan 2 el 20 de oct).

**Casos borde.** Las electrosumergibles comparten los repuestos del campo (`equipos: []`). Un equipo sin repuestos declarados no muestra el bloque. El material de una parte depende de la **familia** (el «motor» de una bomba de superficie no es el motor de fondo de una ESP): donde no hay material declarado, la orden va sin repuesto.

**Quién lo calcula.** Servidor (SAP MM). `GET /api/sap/equipos/:equipo?campo` → `{ identidad: { equipoSap, ubicacion }, repuestos: Repuesto[] }`; `GET /api/sap/equipos?campo` → `EquipoSap[]` (`{ equipo, familia, identidad, repuestos, catalogo? }`) de la flota de alto impacto del campo.

**Referencia.** `src/entities/sap.ts:119-176`; `src/widgets/sap/BloqueSap.tsx:34-55` (línea del gerente), `:81-100`.

### Identidad del equipo en SAP (`identidadSap`)

Número de equipo y ubicación técnica de SAP. **En producción salen del maestro de SAP** y se asocian en Conectores. En el demo, regla fija: `equipoSap = "10" + (100000 + hash(campo+equipo))` y `ubicacion = CO-{CEI|MNO|GUA|PAL|ZAR}-BAT1-{POZ (pozo) | AGU (bomba) | SRV (otro)}-{equipo}`. Corridos: P-201B de La Ceiba → `10759915` · `CO-CEI-BAT1-AGU-P-201B`; LC-14 → `10852026` · `CO-CEI-BAT1-POZ-LC-14`; K-101 → `10176913` · `CO-CEI-BAT1-SRV-K-101`.

---

## 3. Pantallas que combinan lo de SAP

### Ficha del equipo (`BloqueSap`)

Prioridad de lo que se muestra: orden abierta (no TECO) > aviso abierto sin orden > formulario/«Sin aviso ni orden abiertos». Orden abierta: «**Orden {n}** · {clase} · prioridad {p} · {estado}{ · liberada el {fechaHora}}», descripción, «asignada a {técnico} · aviso {n}». Para `ingenieria`, además «HISTORIAL SAP · {n} ÓRDENES»: «{fechaCorta(creada)} **{número}** {clase} · {descripción} {estado} · {n1} h» (cinco visibles y «ver N más»; en el papel todas).

### Mantenimiento: «ABIERTO EN SAP»

Extra «ahora · {n} aviso(s) · {n} orden(es)»; avisos abiertos **sin orden** («Aviso {n} · {equipo} · hace {fmtHoras}» con chip «sin orden», ■ si prioridad 1 y > 4 h) y órdenes no TECO («Orden {n} · {clase} · {equipo}», «{liberada fecha} · {técnico o "cuadrilla {puesto}"}», chip con el estado). Corrido para La Ceiba hoy: 0 avisos sin orden (el M1 de K-101 ya tiene orden) y 1 orden (`40012056`, «liberada»).

### Mi trabajo (técnico)

«ÓRDENES EN SAP» (extra «{n} a su nombre» o «{n} abiertas»): las de estado REL, PCNF o CRTD; primero las suyas (con la descripción escrita y «TRIM le avisó por WhatsApp · {fechaHora}», **RETIRADO (27-oct-2026)**), después las demás. Texto: «Las crea y las libera el planeador en SAP; TRIM no las escribe. Cuando SAP libera una a su nombre, TRIM le avisa por WhatsApp. Se notifican y se cierran en SAP.» (lo de WhatsApp: **RETIRADO (27-oct-2026)**; la orden se ve en su Hoy). Si un equipo que avisa ya tiene una orden suya: «Orden {n} liberada a su nombre: vea «Órdenes en SAP».».

### Conectores → «SISTEMAS CORPORATIVOS» (administrador)

Bloque «SAP S/4HANA · Mantenimiento (PM)» con chip «conectado» (fijo del demo) y «sincronizado {AHORA − 2 min}» (fijo). Corrido para La Ceiba:

| Fila | Valor | ⓘ |
|---|---|---|
| TRIM → SAP · avisos | «5 en total» (avisos con `origen: trim`) | «Con su evidencia, desde la puesta en marcha: M1 solicitud (una parte avisa) · M2 avería (el equipo paró).» |
| SAP → TRIM · órdenes | «18 órdenes · 1 abierta» | «Con su estado: creada, liberada, en ejecución, cerrada.» |
| SAP → TRIM · horas | «132,0 h» (suma de horas de todas sus órdenes) | «Confirmadas: la reparación activa de cada orden.» |
| SAP → TRIM · repuestos | «5 materiales» | «Los críticos: stock de libre utilización en la bodega del campo.» |
| PLC ↔ SAP · equipos | «16 de 16» (la flota de alto impacto: P-201B y 15 pozos con ESP) | «Los de alto impacto, asociados entre el PLC y SAP. Por ejemplo: P-201B → equipo 10759915 · CO-CEI-BAT1-AGU-P-201B.» |
| CATÁLOGOS DE DAÑO | «Bomba de reinyección: 5 partes (cat. B) · 11 daños (cat. C) · 5 causas (cat. 5)»; «Electrosumergible: 5 partes (cat. B) · 7 daños (cat. C) · 5 causas (cat. 5)» (daños = modos distintos de las partes + 1 por «otro»; causas = `CAUSAS_RAIZ`, primer nivel de ISO 14224 Table B.3) | — |

(«16 de 16» es tautológico en el demo: cuenta la flota contra sí misma; con SAP real debe ser «equipos de la flota con `equipoSap` asociado» de «equipos de la flota».)

---

## 4. Lo que es simulado en el demo y lo que hace el backend real

| Pieza | Demo | Producción |
|---|---|---|
| avisos y órdenes históricos | derivados del PLC con la regla de la tabla (`armarHistoria`) | lectura de SAP (avisos, órdenes, estados, horas confirmadas) |
| crear un aviso | número = máximo + 1 en memoria | crear la notificación en SAP y devolver su número |
| técnico de la orden | `tec` fijo en La Ceiba | persona de TRIM resuelta por el correo del responsable en SAP; si no hay, solo el puesto de trabajo |
| stock | tabla fija `STOCK` | SAP MM: stock de libre utilización por centro/almacén del campo, mínimo, plazo, pedidos en tránsito |
| identidad SAP | hash del id | maestro de equipos y ubicaciones técnicas, asociado en Conectores |
| clases PM01/02/03 | fijas | mapeo configurable de las clases de orden de la operadora a correctivo/preventivo/predictivo |
| «conectado», «sincronizado 2 de oct, 13:58» (AHORA − 2 min) | fijos | estado real de la conexión y hora de la última sincronización |
| mensaje «orden liberada» | sale de las órdenes con `liberada` | disparado por el cambio de estado a REL leído de SAP (5D.5) |
