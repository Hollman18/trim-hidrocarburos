## 6C.3 Mantenimiento — «Mantenimiento: lo que hay que atacar» · jefe de mantenimiento

**Para qué.** «Qué atacar para bajar el diferido de alto impacto.» (`src/widgets/Onboarding.tsx:16`).
**Ruta.** `#/jefe/mantenimiento/<campo>[~portafolio]/<período>` · **Roles y nivel.** Solo `jefe` (ingeniería); es su pantalla de inicio. Agrega campos.
**Lee.** `GET /api/vistas/diferidos?campos&desde&hasta` → `Libro` (`altoImpacto`, `planeado`, `noPlaneado`, `anticipable`, `sinInstrumento`, `sinParte`, `evitablePorOrden`, `brecha`, `diferido`, `meta`, `porParte`); `GET /api/vistas/diferidos/base?campos&desde&hasta` → `LineaBase`; `GET /api/vistas/riesgo?campos`; `GET /api/vistas/paradas/por-identificar?campos`; `GET /api/sap/avisos?campos`, `GET /api/sap/ordenes?campos`, `GET /api/vistas/relojes?campos&desde&hasta`; el programa de paradas de la configuración firmada vigente (arranque: `GET /api/configuracion/historial`); `GET /api/usuarios` (nombre del técnico).

La pantalla junta tres lecturas: **la balanza en barriles** (lo de alto impacto, el diferido por día contra el máximo, lo programado contra lo no programado), **qué atacar ahora** (lo que el vigía y los servicios dicen hoy) y **lo de SAP** (horas proactivas, tres relojes, lo abierto). Componentes: `src/pages/Mantenimiento.tsx`, `ParetoPartes` y `Palancas` (`src/widgets/diferidos/Paretos.tsx`), `src/widgets/sap/PanelSapMantenimiento.tsx`, `src/widgets/sap/TresRelojes.tsx`.

### Captura 1 · La Ceiba, octubre en curso

![Mantenimiento · jefe · La Ceiba · octubre en curso](../img/jefe-mantenimiento-ceiba.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | **fallas de alto impacto** | **2.570** bbl | $\sum$ bbl de los tramos cuya causa es de alto impacto (bomba de reinyección o electrosumergible); excluye lo programado porque es otro tipo de causa → 5A §3 «Alto impacto» | `n0` + «bbl». Su desglose está en «DÓNDE BAJARLO» (filas 14-15) | `Libro.altoImpacto` |
| 2 | Marca ■ de la barra | ■ 3 | `hayMeta && difDia > meta.diferidoDia` (`Mantenimiento.tsx:120`) | ■ P3 (aviso, no alarma: el número queda en tinta normal) → 8 §8.4 | `meta.diferidoDia` |
| 3 | **diferido** por día | **1.922** bbl/d | $\text{difDia} = \dfrac{\text{brecha}}{\max(1/24,\ \text{meta.dias})}$ = 3.043,2 / 1,5833 d (1-oct 00:00 → 2-oct 14:00 = 38 h) → 5A §6 «Meta del período» y §5 «Horas y días del período» | `BarraMeta` (8 §8.5): `n0` + «bbl/d» | `Libro.brecha`, `Libro.meta.dias` |
| 27 | La barra y su raya | barra llena, raya al 80 % | $\min(1{,}25,\ 1.922/800)/1{,}25 = 100\,\%$; raya en $1/1{,}25 = 80\,\%$ | gris siempre; sin meta, ni barra ni raya | ídem |
| 4 | Máximo firmado | «máx. 800» | `meta.diferidoDia` del tramo firmado → 5A §6 «Tramo de meta firmado» | `máx. {n0}`; sin meta en algún campo: `textoSinMeta` («sin meta firmada», o en portafolio «sin meta firmada en {campos}») y sin ■ | `Libro.meta` |
| 5 | Línea base | «antes 969 bbl/d (jul a sep)» | `baseDia` = brecha de los 3 meses publicados antes / sus días = 89.134,5 / 92 = 968,85 → 5A §6 «Línea base» | «antes {n0(baseDia)} bbl/d ({nombre})»; sin base: no se escribe | `GET /api/vistas/diferidos/base` → `baseDia`, `nombre` |
| 6 | **del diferido, programado** | **0,0 %** | $\dfrac{\text{planeado}}{\text{diferido}} \times 100$ (0 si diferido = 0) → 5A §3 «Sin paradas programadas» | `n1` + « %»; barra gris de ese ancho | `Libro.planeado`, `.diferido` |
| 7 | Apoyo | «0 bbl · 3.043 bbl no programado» | `planeado` · `noPlaneado` | `n0` | `Libro.planeado`, `.noPlaneado` |
| 8 | **por identificar** | **2** | $\#\{\text{pide} \land \lnot\text{arrancoSinIdentificar}\}$ en toda la historia (igual que Identificar) → 5B §3.2 | número sin marca | `GET /api/vistas/paradas/por-identificar` |
| 9 | No conformes | ■ «1 arrancó sin identificar» | $\#\{\text{arrancoSinIdentificar}\}$ | ■ P3 si > 0; `plural(n,'arrancó sin identificar','arrancaron sin identificar')`; con 0: «0 arrancaron sin identificar» sin marca | ídem |
| 10 | Extra de ATACAR AHORA | «1 equipo avisando» (la fila: ◆ 1 «K-101» · «aire de instrumentos»; la marca es `prioridad` del servidor, 6C.1 fila 17) | filas `en-riesgo` de `GET /api/vistas/riesgo`, ordenadas por `horas` ascendente con ausente = −1 (lo que ya está fuera primero) | `plural(n,'equipo avisando','equipos avisando')`; vacío: «Ninguna parte va hacia su límite.» | `riesgo[]` |
| 11 | Estado de K-101 | chip «ya fuera» | `horas` ausente | con horas: «{parte en minúscula} · cruza en {fmtHoras}»; sin horas: parte + chip fuerte «ya fuera»; sin parte y con tag, el tag en mono | `riesgo[].horas`, `.parte`, `.tag` |
| 12 | Columna derecha | «todo el campo» / «si para» | con `costoFalla`: «≈ {n0} bbl» / «si falla»; sin él: «si para» con `siPara` = «todo el campo» (servicio con 0 bbl/d) o «{n0(bblDia)} bbl/d» | **ojo**: aquí la cifra principal es el **costo por falla**, no los bbl/d (al revés que Riesgo) | `riesgo[].costoFalla`, `.bblDia` |
| 13 | «qué hacer» ⓘ | (globo) | `accion` | «Qué hacer · K-101»: «Verificar que las tres unidades estén en servicio: hoy hay dos. Con el recibidor en 11 min de autonomía, una parada deja las válvulas en posición segura.» | `riesgo[].accion` |
| 14 | DÓNDE BAJARLO · Equipos de alto impacto | «2.570 · 84 %» | → 5A §8 «Palancas» | `n0(bbl)` y `n0(100·bbl/diferido)` %; el diferido contra el máximo **no** se repite aquí (`conMaximo={false}`) | `Libro.altoImpacto` |
| 15 | Sin la parte identificada | «2.570 · 84 %» | la parada abierta de P-201B no tiene parte → 5A §8 | filas «Con parte vigilada 0 · 0 %», «Con parte sin instrumento 0 · 0 %», «Evitable cerrando en orden 0 · 0 %» | `Libro.sinParte`, `.anticipable`, `.sinInstrumento`, `.evitablePorOrden` |
| 16 | POR PARTE vacío | «Ninguna falla con la parte identificada.» | `porParte` vacío → 5A §8 «Pareto por parte» | — | `Libro.porParte` |
| 17 | Sin parte | «+ 2.570 bbl sin la parte identificada» ⓘ | `sinParte` | ⓘ «Barriles de equipos de alto impacto cuya parada no dejó primera alarma ni firma. Están en «paradas por identificar».» | `Libro.sinParte` |
| 18 | PROGRAMA DE PARADAS | «Nada programado de aquí en adelante.» | paradas del programa firmado del campo con `hasta ≥ AHORA`, por `desde` | con filas: «**{equipo}**[ · campo]», motivo, «{fechaHora(desde)} a {fechaHora(hasta)}»; extra fijo «firmado» | configuración vigente → `programa` (5D §2) |
| 19 | HORAS EN SAP vacío | «Sin órdenes cerradas en el período» ⓘ | $P + K = 0$ en el período (octubre en curso no tiene órdenes cerradas; la abierta cuenta con 0 h) → 5D §6 «Horas proactivas contra correctivas» | ⓘ «No hay órdenes cerradas en {período en minúscula}. Escoja un período cerrado (el mes anterior, por ejemplo) para ver las horas.» Sin «TRES RELOJES» (la vista responde `null`) | `GET /api/sap/ordenes`, `GET /api/vistas/relojes` |
| 20 | Extra de ABIERTO EN SAP | «ahora · 0 avisos · 1 orden» | avisos `!cerrado && !orden`; órdenes con `estado ≠ TECO` (no depende del período) → 5D §6 «Mantenimiento: ABIERTO EN SAP» | `plural` en los dos | `GET /api/sap/avisos`, `/ordenes` |
| 21 | Orden abierta | «Orden 40012053 · predictivo · K-101» | `numero` · `NOMBRE_CLASE[clase]` · equipo (+ campo en portafolio) | clase PM01 «correctivo», PM02 «preventivo», PM03 «predictivo» | `ordenes[]` |
| 22 | Liberada y a cargo | «2 de oct · Óscar Daza» | `fechaCorta(liberada)` (precedida de «liberada » si el estado no es REL) · técnico | técnico = persona del registro por `tecnico`; sin técnico: «cuadrilla {puesto}» | `ordenes[].liberada`, `.tecnico`, `.puesto` |
| 23 | Estado | chip «liberada» | `NOMBRE_ESTADO_ORDEN[estado]` | CRTD «creada, sin liberar», REL «liberada», PCNF «en ejecución», CNF «ejecutada» | `ordenes[].estado` |
| 24 | Parada por identificar | ▲ 2 «P-201B · 2 de oct, 03:52» «sigue parado» 2.570 bbl; ▲ 2 «LC-21 · 1 de oct, 18:20» «sigue parado» 247 bbl | orden: primero las pendientes (`pide && !arrancoSinIdentificar`), luego las no conformes que todavía `pide` (`Mantenimiento.tsx:41`); dentro, el orden del servidor (5B §3.2). ▲ P2 y chip fuerte si `!fin && !arrancoSinIdentificar`; ■ P3 si no (`Mantenimiento.tsx:95-104`) | «arrancó sin identificar» / «sigue parado» / «por identificar»; a la derecha `n0(bbl)` bbl | `pregunta` (`equipo`, `inicio`, `fin`, `bbl`) |
| 25 | No conforme | ■ 3 «LC-08 · 1 de oct, 22:15» «arrancó sin identificar» 109 bbl | `arrancoSinIdentificar` | — | ídem |
| 26 | «Ir a identificar» | botón | solo si el rol tiene la pantalla Identificar y hay alguna sin identificar | lleva a `#/jefe/causa/…` | — |

**Aviso abierto sin orden** (no hay en el demo hoy: el M1 de K-101 ya tiene orden): «**Aviso {n}** · {equipo}[ · campo]», «hace {fmtHoras(AHORA − creado)}» + chip «sin orden», y ■ P3 si es de prioridad 1 y lleva más de 4 h sin orden (`PanelSapMantenimiento.tsx:90`). Globo: «Aviso {n} · {equipo}», pista = descripción, «Enviado hace {fmtHoras}», «Orden: sin orden todavía».

**Globos.** Fila de ATACAR AHORA: «{equipo} · {TIPO_CAUSA}», pista `motivo`, filas «Parte», «Cruza su límite · en {fmtHoras}» o «ya fuera», «Instrumento · {tag}», «Si para · {siPara}», «Si falla · ≈ {n0(costoFalla)} bbl». Cifra «del diferido, programado»: «Programado y no programado» · «Lo programado estaba en el programa de paradas aprobado; lo demás son fallas o restricciones. La mide el PLC.» · «Programado 0 bbl», «No programado 3.043 bbl», «De alto impacto 2.570 bbl», «Con la parte vigilada 0 bbl» (en el papel sale la pista). Orden abierta: «Orden {n} · {equipo}», pista = descripción («Verificar que las tres unidades estén en servicio: hoy hay dos. …»), «Clase», «Estado», «Liberada {fechaCorta}», «A cargo».

### Captura 2 · portafolio, octubre en curso

![Mantenimiento · jefe · portafolio · octubre en curso](../img/jefe-mantenimiento-portafolio.png)

Las reglas de cada fila son las de la captura 1 (y K-101, su «qué hacer» y la orden 40012053 son los mismos); aquí, los valores del portafolio.

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | fallas de alto impacto | **5.523** bbl | → 5A tabla de cifras (89 %) | — | `Libro.altoImpacto` |
| 2 | diferido por día | ■ **3.936** bbl/d | 6.232,1 / 1,5833 | ■ porque 3.936 > 2.300 | `Libro` |
| 3 | Máximo del portafolio | «máx. 2.300» | suma de los máximos firmados de los campos (`metaEntre`) → 5D §2 «Meta global y total del mes» | — | `Libro.meta.diferidoDia` |
| 4 | Base | «antes 2.734 bbl/d (jul a sep)» | 2.733,73 → 5A §6 | — | `LineaBase` |
| 5 | No conformes | «por identificar» **2** y ■ 3 «3 arrancaron sin identificar» | LC-08 (La Ceiba), P-201B (Morichal, 24-sep), PA-04 (El Palmar, respondida tarde) | — | `por-identificar` |
| 6 | Extra | «7 equipos avisando» | — | — | `riesgo` |
| 7 | Parte y cruce | «bomba de fondo · cruza en 4 h» (MN-07 · Morichal Norte); luego MN-18 · Morichal Norte «admisión y gas · cruza en 30 h», P-201B · Morichal Norte «succión y filtro de entrada · cruza en 43 h», GU-04 · Guacamayo «aislamiento del motor y del cable · cruza en 2,5 d»; primero ◆ 1 K-101 · La Ceiba «ya fuera»; las cuatro con ▲ 2 | → 6C.1 (mismas filas, mismo orden por `horas`) | «{parte} · cruza en {fmtHoras}» | `riesgo[].equipo`, `.parte`, `.horas`, `.prioridad` |
| 8 | Costo por falla | «≈ 12.291 bbl» / «si falla» (MN-07); MN-18 «≈ 10.660 bbl», P-201B de Morichal «≈ 3.365 bbl», GU-04 «≈ 16.615 bbl»; K-101 «todo el campo» / «si para» | → 5B §5.3 y 6C.1 fila 26 | ídem captura 1, fila 12 | `riesgo[].costoFalla` |
| 9 | DÓNDE BAJARLO | «Con parte vigilada 2.953 · 47 %» (las fallas de ESP de octubre, todas vigilables); el panel entero: «Equipos de alto impacto 5.523 · 89 %», «Con parte vigilada 2.953 · 47 %», «Con parte sin instrumento 0 · 0 %», «Sin la parte identificada 2.570 · 41 %» (P-201B de La Ceiba), «Evitable cerrando en orden 0 · 0 %» | cada fila: $\text{bbl}$ y $n_0(100 \cdot \text{bbl}/\text{diferido})$ con diferido = 6.232,1 → 5A §8 «Palancas» | ídem captura 1, fila 14 | `Libro.altoImpacto`, `.anticipable`, `.sinInstrumento`, `.sinParte`, `.evitablePorOrden` |
| 10 | POR PARTE, primera fila | «Aislamiento del motor y del cable» | → 5A §8 «Pareto por parte» | nombre en negrita, barra proporcional a la primera | `Libro.porParte[]` |
| 11 | Fallas de la fila | «electrosumergible · 3 fallas» — 2.941 bbl · 100 % | MN-41, GU-07, GU-09 (abiertas, > 24 h); 2.941 / 2.953 = 99,6 % | «{familia} · {N falla(s) | sin fallas}{ · M disparo(s)}», `n0` %| ídem |
| 12 | Disparo | «electrosumergible · sin fallas · 1 disparo» — 12 bbl · 0 % | un evento de bomba de fondo que arrancó en < 24 h | — | ídem |
| 13 | Parada por identificar de otro campo | «P-201B · Morichal Norte · 24 de sept, 16:51» ■ 3 «arrancó sin identificar» · 9.838 bbl; antes, las de La Ceiba: ▲ 2 «P-201B · La Ceiba · 2 de oct, 03:52» «sigue parado» 2.570 bbl, ▲ 2 «LC-21 · La Ceiba · 1 de oct, 18:20» «sigue parado» 247 bbl, ■ 3 «LC-08 · La Ceiba · 1 de oct, 22:15» «arrancó sin identificar» 109 bbl; en POR PARTE, «+ 2.570 bbl sin la parte identificada» | no conforme; sigue en la lista porque `pide` (nadie dijo la parte) | — | `por-identificar` |
| 14 | Respondidas tarde | «1 más, respondida después de arrancar» ⓘ | no conformes que ya no `pide` (PA-04, respondida a las 09:30 del 22-jun después de arrancar) (`Mantenimiento.tsx:42, 190-195`) | ⓘ «1 parada más arrancó sin identificar y se respondió después de arrancar: ya tiene causa, pero cuenta como no conforme arriba.» (plural: «{n} paradas más arrancaron … se respondieron … ya tienen causa, pero cuentan como no conformes arriba.») | ídem |
| 15 | «ver 2 más» | — | 7 filas; K-101 (P1) siempre visible; escondidas MPP-301 y MN-27 (en el papel salen) | — | — |
| 16 | del diferido, programado | **0,0 %** · «0 bbl · 6.232 bbl no programado» | $\text{planeado}/\text{diferido}$ = 0 / 6.232,1 (ningún campo tuvo paradas programadas en octubre) → 5A §3 | ídem captura 1, filas 6-7 | `Libro.planeado`, `.noPlaneado` |
| 17 | Orden abierta | «Orden 40012053 · predictivo · K-101 · La Ceiba» · «2 de oct · Óscar Daza» · «liberada» | la misma orden de la captura 1; en portafolio con « · campo» | ídem captura 1, filas 21-23 | `GET /api/sap/ordenes` |

### Captura 3 · La Ceiba, septiembre cerrado (HORAS EN SAP con datos)

![Mantenimiento · jefe · La Ceiba · septiembre cerrado](../img/jefe-mantenimiento-ceiba-cerrado.png)

Lo que es «ahora» o «toda la historia» (por identificar y no conformes, ATACAR AHORA, ABIERTO EN SAP, PARADAS POR IDENTIFICAR) es igual que en la captura 1 y se explica en su tabla; aquí, lo que cambia con el período.

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | fallas de alto impacto | **21.494** bbl | 99 % de 21.691 → 5A tabla de cifras | — | `Libro.altoImpacto` |
| 2 | diferido por día | **723** bbl/d (sin ■) | 21.691,4 / 30 d; 723 ≤ 800 | sin marca: está bajo el máximo | `Libro` |
| 3 | Base | «antes 858 bbl/d (jun a ago)» | 858,38 | — | `LineaBase` |
| 4 | % proactivo | **20 %** | $P/(P+K) = 4/(4+16)$ → 5D §6 «Horas proactivas contra correctivas» | `n0` + « %» (ojo: entero, no `n1`) | `GET /api/sap/ordenes` (suma el front) |
| 5 | Sin meta | «sin meta configurada» | fijo: no hay meta de % proactivo en la configuración | — | — |
| 6 | Detalle | «4,0 h proactivas · 16,0 h correctivas · 3 órdenes» | PM03 `40012054` 4 h + PM01 `40012043` 8 h + PM01 `40012041` 8 h | `n1` h; `plural(n,'orden','órdenes')` | ídem |
| 7 | Título de los relojes | «TRES RELOJES · PROMEDIO DE 2 FALLAS» | `fallas` = PM01 en TECO, con evento y cierre técnico en el período, cuya parada del PLC tiene horas → 5D §6 «Los tres relojes» | `plural(n,'FALLA','FALLAS')` | `GET /api/vistas/relojes` → `fallas` |
| 8 | Reparación activa | «8 h» | $\bar A = \frac{1}{n}\sum \min(h_i, T_i)$ = 8 h | `fmtHoras` (< 48 h → `n0` h); ausente → «sin dato» | `activaH` |
| 9 | Espera | **«17 h»** (negrita) | $\bar E = \bar T - \bar A$ = 25,38 − 8 = 17,38 h | ídem | `esperaH` |
| 10 | Indisponibilidad total | «25 h» | $\bar T$ = (34,76 + 15,99) / 2 = 25,38 h | ídem; con «excluidas» > 0 se agrega «{n} orden(es) fuera del promedio» + ⓘ | `totalH`, `excluidas` |
| 11 | ⓘ «Tres relojes» | (globo) | — | «Reparación activa: horas confirmadas en SAP. Espera: repuesto, permisos, cuadrilla. Indisponibilidad total: la parada que ve el PLC. Separarlos deja ver si la parada larga es de mantenimiento o de la espera del repuesto (ISO 14224).» | — |
| 12 | del diferido, programado | **0,0 %** · «0 bbl · 21.691 bbl no programado» | $\text{planeado}/\text{diferido}$ = 0 / 21.691,4 → 5A §3 | ídem captura 1, filas 6-7 | `Libro.planeado`, `.noPlaneado` |
| 13 | DÓNDE BAJARLO | «Con parte vigilada 21.494 · 99 %»; el panel: «Equipos de alto impacto 21.494 · 99 %», «Con parte vigilada 21.494 · 99 %», «Con parte sin instrumento 0 · 0 %», «Sin la parte identificada 0 · 0 %», «Evitable cerrando en orden 0 · 0 %» | altoImpacto = anticipable = 21.493,77; $n_0(100 \cdot 21.493{,}77 / 21.691{,}44) = 99$ → 5A §8 «Palancas» | ídem captura 1, fila 14 | `Libro.altoImpacto`, `.anticipable`, `.sinInstrumento`, `.sinParte`, `.evitablePorOrden` |
| 14 | POR PARTE | «Sello mecánico» · «reinyección · 1 falla» · 14.649 bbl · 68 %; «Rodamientos» · «reinyección · 1 falla» · 6.089 · 28 %; «Admisión y gas» · «electrosumergible · sin fallas · 7 disparos» · 396 · 2 %; «Bomba de fondo» · «electrosumergible · sin fallas · 2 disparos» · 203 · 1 %; «Motor eléctrico» · «electrosumergible · sin fallas · 1 disparo» · 131 · 1 %; «Aislamiento del motor y del cable» · «electrosumergible · sin fallas · 1 disparo» · 25 · 0 % | `porParte` del libro de septiembre: 14.649,47 · 6.089,39 · 395,99 · 202,73 · 131,40 · 24,79 bbl; % = $n_0(100 \cdot \text{bbl}/\sum \text{porParte.bbl})$ con $\sum$ = 21.493,77 (`Paretos.tsx:120, 148`) → 5A §8 «Pareto por parte» | «{familia} · {plural(fallas,'falla','fallas') o 'sin fallas'}{ · plural(disparos,'disparo','disparos')}»; barra proporcional a la primera | `Libro.porParte[]` (`parte`, `familia`, `bbl`, `fallas`, `disparos`) |

La barra bajo los relojes es la indisponibilidad total partida en activa (8/25,38 = 31,5 %) y espera (68,5 %), gris (ISA-101: no es alarma), separada por una raya del color del panel.

**Variantes.**
- **Portafolio.** Cada fila lleva « · campo»; el máximo y la base suman los campos; «Ir a identificar» también.
- **Período.** Cambian el libro (cifras 1-7, Palancas, Por parte), las horas de SAP y los relojes; **no** cambian ATACAR AHORA, ABIERTO EN SAP, PROGRAMA DE PARADAS ni PARADAS POR IDENTIFICAR (son «ahora» o «toda la historia»). Ejemplo 5 campos, septiembre: «16 %» (12 h / 64 h, 11 órdenes) y relojes de 8 fallas: activa 8 h, espera «11,1 d» (267,38 h), total «11,5 d» (275,38 h).
- **Sin meta firmada.** La barra «diferido» queda solo con la cifra y «sin meta firmada» (sin raya ni ■).

**Estados.** Sin nada en riesgo: «Ninguna parte va hacia su límite.»; programa vacío: «Nada programado de aquí en adelante.»; SAP vacío: «Nada abierto en SAP.»; el panel PARADAS POR IDENTIFICAR **no aparece** si no hay ni sin identificar ni respondidas tarde; con solo respondidas tarde dice «Todas las paradas tienen causa.» + la nota.

**Interacciones.** Clic en una fila de ATACAR AHORA, de un aviso o de una orden → cambia al campo y abre la ficha del equipo. Clic en una fila de POR PARTE → Confiabilidad (o Bombas si el rol no la tiene) (`onIr={irA('confiabilidad') ?? irA('bombas')}`). «ver N más» en ATACAR AHORA y en PARADAS POR IDENTIFICAR (ahí nunca se esconde una que sigue parada: prioridad 1 si `!fin && !arrancoSinIdentificar`).

**Lectura («¿cómo se lee?»).** «El indicador de mantenimiento se mueve antes que el diferido: si las fallas de alto impacto se anticipan (la parte avisó y se intervino a tiempo), pasan a ser paradas programadas, más cortas y en la ventana que uno escoge. Diferido: el promedio por día contra el máximo firmado (la raya). Atacar ahora: primero lo que ya está fuera, luego lo que cruza antes su límite; toque o pase el cursor por una fila para ver el porqué.» HORAS EN SAP: «Horas confirmadas en las órdenes de SAP cerradas en el período: preventivo y predictivo (lo que se hace antes de que falle) contra correctivo (lo que se hace porque falló). Si el proactivo no sube, las fallas no bajan. Los tres relojes: la barra es la parada total, partida en reparación activa y espera.» ABIERTO EN SAP: «TRIM no crea órdenes: manda el aviso a SAP y el planeador crea la orden. Avisos: lo que TRIM envió y todavía no tiene orden. Órdenes: las abiertas, con su estado y su técnico. Toque o pase el cursor por una fila para ver la descripción.» PROGRAMA DE PARADAS: «Lo que está aquí cuenta como programado, no como falla. Se cambia en la configuración, con firma: así una falla no se puede volver programada después.» PARADAS POR IDENTIFICAR: «Sin la parte que falló no hay de qué aprender: el vigía no sabe qué mirar la próxima vez.»

**Lo que es simulado en el demo.** Las órdenes y avisos de SAP se derivan del PLC con una regla fija (5D §6 «Regla de la simulación del demo»): la reparación activa es siempre ≤ 8 h, por eso los relojes dan «8 h» casi siempre. El backend real lee SAP PM (órdenes, horas confirmadas) y cruza cada PM01 con su parada del PLC por `evento`.
