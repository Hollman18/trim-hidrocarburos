# 6A.1 Resumen del activo — gerente (decisión)

**Para qué.** «Lo perdido contra la meta, su valor y a qué equipo.» (`PARA_QUE_DECISION.resumen`, `src/widgets/Onboarding.tsx:34`).
**Ruta.** `#/ger/resumen/<campo | ceiba~portafolio>/<período>` · **Roles y nivel.** Solo el gerente de activo (`ger`, nivel `decision`) tiene la pantalla «resumen» (`src/entities/roles.ts:38-39`). Con nivel `decision`, `Resumen()` dibuja `ResumenDirectivo` (`src/pages/Resumen.tsx:31-37`). Las variantes `Portafolio` y `ResumenCampo` del mismo archivo existen para niveles de ingeniería/operación, pero ningún rol de hoy las alcanza (5A §Huecos 16); se describen al final.
**Lee.**

| Endpoint (capítulo 7) | Para qué en esta pantalla |
|---|---|
| `GET /api/vistas/diferidos?campos&desde&hasta` (período) | cifra, rango, valor, sello, promedio diario, cierre/total, alto impacto %, por equipo, por campo y, desplegados, los equipos de cada campo (`porEquipo` con `fallas`/`disparos`, y `sinCosto`) |
| `GET /api/vistas/diferidos?campos&desde=2026-06-01&hasta=2026-09-01` y `…&desde=2026-09-01&hasta=ahora` | «antes → con TRIM» (dos intervalos fijos, no dependen del período) |
| `GET /api/vistas/diferidos/mensual?campos` | gráfica mes a mes (Tendencia) |
| `GET /api/vistas/diferidos/base?campos&desde&hasta` | «+44 % frente a jul a sep» (o «sin base de comparación» si responde `null`) |
| `GET /api/vistas/riesgo?campos` | perdiéndose ahora, causa mayor, en riesgo de alto impacto y «también en alarma» |
| `GET /api/catalogo` (arranque) | máquinas de bombeo de la línea, para separar un servicio de una bomba en «también en alarma» (`esServicio`) |
| `GET /api/vistas/estado?campos` | pozos parados, ritmo del cierre proyectado, «producidos ayer» de la cabecera |
| `GET /api/sap/ordenes?campos` | mantenimiento proactivo (el front suma horas; sin órdenes, «sin dato») |
| `GET /api/vistas/equipos-hoy?campos` | solo en el portafolio: la marca de prioridad de cada equipo de POR CAMPO desplegado (`useEquiposDeHoy`, `src/widgets/resumen/PorCampo.tsx:49`). El Pareto simple POR EQUIPO no lleva marca |

Todas las cifras del libro se piden **una vez por período** y el front solo divide por días y formatea (capítulo 8).

---

## 6A.1.1 Portafolio · octubre en curso

![Resumen · gerente · portafolio · octubre en curso](../img/ger-resumen-portafolio.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | Subtítulo de la cabecera: «*Ámbito* · *N campos* · *X* bbl producidos ayer» | «Portafolio · 5 campos · 39.578 bbl producidos ayer» | $\sum_c \text{ayer.bbl}_c$ = 11.105 + 16.685 + 5.439 + 3.186 + 3.163 (fiscal del 1-oct de cada campo) — 5B §5.4 «El estado del campo» (`ayer`) | `n0` + « bbl producidos ayer»; si **algún** campo trae `ayer.bbl = null` → «ayer sin fiscal» (hueco, no suma parcial). Con un campo: «La Ceiba · 11.105 bbl producidos ayer»; «5 campos» solo en el portafolio (`src/widgets/Cabecera.tsx:51-56`) | `GET /api/vistas/estado` → `[].ayer.bbl` |
| 2 | Sello de publicación | «PROVISIONAL» | por el **código** de `motivos`: vacío → publicable; solo `en-curso` → provisional; otro → bloqueado — 5A §«Estado de publicación» y §«Sello de publicación» | «✓ PUBLICABLE» / «PROVISIONAL» (neutro, sin marca) / ■ P3 + chip fuerte «NO PUBLICABLE» y una línea corta por motivo («El Palmar · factor fuera de banda», `CORTO` en `src/widgets/diferidos/Sello.tsx:13-16`). Globo: título «Se puede publicar \| Provisional \| Todavía no se puede publicar» y la frase de `publicacion()` (`src/widgets/diferidos/publicacion.ts:24-31`). En el papel, la frase entera | `GET /api/vistas/diferidos` → `motivos[].codigo`, `motivos[].texto` |
| 3 | Barriles diferidos (cifra de 44 px) | «6.232» | $\text{brecha} = \text{Potencial} - \text{Real} = 66.523{,}716 - 60.292 = 6.231{,}716$ — 5A §«No producido · brecha» | `n0`, sin unidad; debajo «barriles diferidos» (fijo) | `GET /api/vistas/diferidos` → `brecha` |
| 4 | Rango «calculado» | «5.729–6.734 bbl · calculado» | $[\max(0, 6.231{,}716 - 502{,}470),\ 6.231{,}716 + 502{,}470]$ — 5A §«Rango de los barriles diferidos» | `${n0(lo)}–${n0(hi)} bbl · calculado` (`src/widgets/diferidos/Rango.tsx:30-31`). Globo en decisión: título «Margen del cálculo», fila «Rango: 5.729 a 6.734 bbl» (y «Aparte, aproximado: N bbl a frecuencia reducida» si `aproximado > 0`), pista = `NOTA_SIMPLE` (captura `ger-resumen-ceiba-globo-rango`) | `brecha`, `tolerancia`, `aproximado` |
| 5 | Valor en USD | «299 mil USD» | $\sum$ (potencial − real) × precio del día, días con precio = 299.122,381 — 5A §«Valor en USD («falta precio»)» | `usd(v)`: ≥ 10⁶ → «1,3 M USD»; ≥ 10³ → «299 mil USD»; si no «N USD». Sin `valorUsd` → «sin precio» con ⓘ «Sin precio: Falta el precio neto en la configuración.» (`src/widgets/resumen/ResumenDirectivo.tsx:106-110`) | `valorUsd` (ausente si ningún día tuvo precio) |
| 6 | Rótulo del valor | «valor · falta precio en La Zarza» + ⓘ | `sinPrecio` = campos con algún día sin precio | Con valor y `sinPrecio ≠ ∅`: «valor · falta precio en *A, B*» y ⓘ «Valor: Sin contar los días sin precio de La Zarza.»; si no, «valor». (Ojo: el Resumen no usa `valorCampos`, a diferencia del encabezado de Diferidos) | `sinPrecio[]` |
| 7 | PROMEDIO DIARIO · producción | ■ «38.079 bbl/d» | $\text{Real}/\max(1/24,\ \text{días}) = 60.292 / 1{,}583 = 38.079{,}158$ — 5A §«Real» y §«Horas y días del período» | `n0` + «bbl/d»; ■ P3 si hay meta y $\text{realDia} < \text{meta.produccionDia}$ (`:55`). Globo «Producción»: «A la fecha: 60.292 de 63.650 bbl» (con período en curso; si no, «Del período») y «Meta del período: 1.246.200 bbl · 31 días»; sin meta, «Meta del período: sin meta firmada en *campos*» | `real`, `meta.dias`, `meta.produccionDia`, `meta.produccion`, `meta.produccionTotal`, `meta.diasTotal` |
| 8 | Barra de la producción | relleno 75,8 %, raya al 80 % | $\min(1{,}25;\ 38.079/40.200)/1{,}25 = 0{,}758$ — capítulo 8 §8.5 `BarraMeta` | gris siempre; sin meta no hay barra ni raya | — |
| 9 | Rótulo de la meta | «meta 40.200» | `meta.produccionDia` = Σ de los tramos firmados por día (10.900 + 16.700 + 6.300 + 3.250 + 3.050) — 5A §«Meta del período» | «meta *n0*»; sin meta: `textoSinMeta(meta, varios)` = «sin meta firmada en La Zarza» | `meta.produccionDia`, `meta.sinMeta` |
| 10 | PROMEDIO DIARIO · diferido | ■ «3.936 bbl/d» | $\text{brecha}/\text{días} = 6.231{,}716/1{,}583 = 3.935{,}821$ | ■ P3 si $\text{difDia} > \text{meta.diferidoDia}$. Globo «Diferido»: «A la fecha: 6.232 de un máximo de 3.642 bbl», «Máximo del período: 71.300 bbl · 31 días» | `brecha`, `meta.diferido`, `meta.diferidoTotal` |
| 11 | Rótulo del máximo | «máx. 2.300» | `meta.diferidoDia` (800 + 950 + 450 + 50 + 50) | «máx. *n0*» o «sin meta firmada…»; barra llena porque 3.936/2.300 = 1,71 > 1,25 | `meta.diferidoDia` |
| 12 | Apoyo del diferido | «+44 % frente a jul a sep» | $(3.935{,}821 - 2.733{,}732)/2.733{,}732 = +0{,}440$ — 5A §«Línea base: los 3 meses antes» | `signo(x)`: «+», «−» (U+2212) o nada; `n0(|x·100|)` « %» «frente a» `base.nombre` (`:27`, `:123`). Si el servidor responde `null` (menos de 3 meses publicados antes), dice **«sin base de comparación»**, como el encabezado de Diferidos (`:123`; captura `ger-resumen-portafolio-doce`, 6A.1.5) | `GET /api/vistas/diferidos/base` → `cambio`, `nombre` |
| 13 | Título del bloque derecho | «CIERRE PROYECTADO» + ⓘ | $\text{enCurso} \iff \text{diasTotal} > \text{días} + 0{,}01$ (`:56`) — 5A §«Horas y días del período» | «CIERRE PROYECTADO» solo con el mes en curso; con cualquier otro período «TOTAL DEL PERÍODO» y sin ⓘ. ⓘ literal: «Si todo sigue como está ahora: lo que va del mes más el ritmo de hoy hasta el último día (31 días).» (`:130`; «31» = `n0(meta.diasTotal)`; captura `ger-resumen-ceiba-globo-cierre`) | `meta.dias`, `meta.diasTotal` |
| 14 | Cierre · producción | ■ «907.429 bbl» | $\text{Real} + \text{restantes}\cdot\sum_c(\text{potencialBpd}_c - \text{perdiendoBpd}_c) = 60.292 + 29{,}417 \times 28.797{,}868$ — 5A §«Cierre proyectado del mes» | `n0` + «bbl»; ■ si cierre < `meta.produccionTotal`; relleno $\min(1{,}25;\ 0{,}728)/1{,}25 = 58{,}2\,\%$ | `real` + `GET /api/vistas/estado` → `potencialBpd`, `perdiendoBpd` |
| 15 | Meta del mes completo | «meta 1.246.200» | `meta.produccionTotal` = Σ tramos de los 31 días | «meta *n0*» o «sin meta firmada…» | `meta.produccionTotal` |
| 16 | Cierre · diferido | ■ «395.035 bbl» | $\text{brecha} + \text{restantes}\cdot\sum_c \text{perdiendoBpd}_c = 6.231{,}716 + 29{,}417 \times 13.217{,}110$ | ■ si cierre > `meta.diferidoTotal`; barra llena | `brecha`, `perdiendoBpd` |
| 17 | Máximo del mes completo | «máx. 71.300» | `meta.diferidoTotal` | «máx. *n0*» o «sin meta firmada…» | `meta.diferidoTotal` |
| 18 | Perdiéndose ahora | ◆ «13.217 bbl/d» | $\sum$ `bblDia` de las filas `perdiendo` — 5B §5.2 «Perdiéndose ahora» | `n0` + « bbl/d»; ◆ P1 si alguna fila `perdiendo` es de alto impacto, ▲ P2 si no; si la suma es 0: «nada» sin marca (`:161-163`; captura `ger-resumen-palmar`) | `GET /api/vistas/riesgo` → `[estado='perdiendo'].bblDia`, `altoImpacto` |
| 19 | Pozos parados | «21 de 87 pozos parados» | $\sum_c \text{parados}_c$ de $\sum_c \text{pozos}_c$ — 5B §5.4 | «*p* de *n* pozos parados»; si no se pierde nada: «todos los pozos produciendo» (`:164`) | `GET /api/vistas/estado` → `parados`, `pozos` |
| 20 | Causa mayor | «P-201B · La Ceiba» y «bomba de reinyección» | la **primera** fila `perdiendo` (el servidor las ordena por `bblDia` descendente) | equipo + « · *Campo*» solo en el portafolio; debajo `TIPO_CAUSA[tipo]` en minúsculas. La celda entera no aparece si no se pierde nada (`:166-172`) | `riesgo[0].equipo`, `campoId`, `tipo` |
| 21 | En riesgo · alto impacto | «5 equipos» | número de filas `en-riesgo` **con** `altoImpacto` (P-201B de Morichal, GU-04, MN-07, MN-18, MN-27; `:44`) — 5B §5.3 | `plural(n, 'equipo', 'equipos')`; 0 → «ninguno» (`:84`) | `riesgo[estado='en-riesgo' ∧ altoImpacto]` |
| 22 | Pie de «en riesgo» | «primero MN-07 en 4 h» | la de alto impacto con `horas` más chicas: MN-07, 3,794 h → `fmtHoras` = «4 h» | En orden (`:77-78`): «primero *E* en *fmtHoras(h)*»; si ninguna trae horas pero hay alguna: «*E* ya fuera»; si no hay ninguna y se pierde por alto impacto: «ninguna otra bomba ni electrosumergible avisa»; si no: «ninguna bomba ni electrosumergible avisa». Ya no lleva los servicios detrás ni se corta (`:85`, sin `truncate`): lo que no es de alto impacto va en su propio renglón (fila 41) | `riesgo[].horas`, `equipo`, `altoImpacto` |
| 41 | También en alarma | «+ 1 servicio y 1 bomba multifásica en alarma» | `otrosEnAlarma(riesgo)` (`src/widgets/resumen/enAlarma.ts:9-19`): las filas `en-riesgo` **sin** `altoImpacto` (K-101 y MPP-301). Cada una es un **servicio** si `esServicio(r)` = no es electrosumergible **y** no es una máquina de bombeo de la línea del catálogo (`src/shared/api/equipos.ts:208`, la misma regla de Riesgo y Mantenimiento); las demás son bombas de la línea que no cierran pozos (hoy solo la multifásica, `tipo = 'transporte'`). $5 + 1 + 1 = 7$: los siete en riesgo de la pantalla Riesgo | Renglón propio, con «+ » delante, que se parte si no cabe (`:86`): `plural(s, 'servicio', 'servicios')` y `plural(b, 'bomba multifásica', 'bombas multifásicas')` (o «otra bomba / otras bombas» si alguna no es multifásica), unidos con « y », más « en alarma»; sin ninguna fila así, no hay renglón ni globo. Globo «También en alarma» sobre la celda (`:76`, `:173-175`; captura `ger-resumen-portafolio-globo-alarma`): una fila por equipo, «MPP-301 · Morichal Norte» → «Bomba multifásica», «K-101 · La Ceiba» → «Aire de instrumentos» (`TIPO_CAUSA[tipo]`; « · *Campo*» solo en el portafolio); en el papel se escribe (`imprimir="todo"`) | `riesgo[estado='en-riesgo' ∧ ¬altoImpacto].equipo`, `tipo`, `campoId`; `GET /api/catalogo` (máquinas de bombeo) |
| 23 | Botón «Ver riesgo» | «Ver riesgo» | aparece si el rol tiene la pantalla «riesgo» (`rol.pantallas`) | fijo; lleva a `#/ger/riesgo/…` | rol (sesión) |
| 24 | Alto impacto, % del diferido | «89 %» | $100\cdot 5.523{,}051 / 6.231{,}716 = 88{,}6$ — 5A §«Alto impacto, % del diferido» | `n0` + « %» (`:181`); diferido 0 → «0 %»; debajo, fijo, «del diferido · reinyección y electrosumergibles» | `altoImpacto`, `diferido` |
| 25 | Antes → con TRIM | «1.451 → 3.262 bbl/d · +125 %» | $133.532{,}612/92$ → $103.019{,}005/31{,}583$; cambio $+1{,}247$ — 5A §«Antes → con TRIM» | `${n0(antes)} → ${n0(después)} bbl/d · ${signo(cambio)}` (`:187`); antes = 0 → «—» en vez del % (El Palmar: «0 → 0 bbl/d · —», captura `ger-resumen-palmar`). ⓘ: «Alto impacto por día desde que entró TRIM (1 de sept) contra los tres meses antes. Es una comparación, no la prueba de que lo bajó TRIM.» (`:185`). **No cambia con el período** de la cabecera | dos `GET /api/vistas/diferidos` → `altoImpacto`, `meta.dias` |
| 26 | Mantenimiento proactivo | «16 %» | $P/(P+K)\cdot100 = 12/(12+64) = 15{,}8$ con las órdenes de SAP de los 5 campos cerradas (o liberadas/creadas) entre el 1-sep y ahora — 5D §«Horas proactivas contra correctivas (`horasPorClase`)» | `n0` + « %» y la barra (ancho = el %) (`:192`, `:199-201`). ⓘ «Mantenimiento proactivo: Horas preventivas o predictivas en SAP desde que entró TRIM (1 de sept). Si no sube, las fallas no bajan.» (`:194`). **Sin órdenes con horas** ($P+K=0$, `porcentaje` ausente) el bloque no desaparece: la cifra dice «sin dato», sin barra, y debajo «sin órdenes en SAP desde 1 de sept» (`fechaCorta` de la puesta en marcha, `:204`; captura `ger-resumen-palmar`: El Palmar y La Zarza no tienen órdenes). No cambia con el período | `GET /api/sap/ordenes?campos` → `clase`, `horasReales`, `cierreTecnico`/`liberada`/`creada` |
| 27 | Horas | «12,0 h proactivas · 64,0 h correctivas» | $P = \sum h$ (PM02 + PM03), $K = \sum h$ (PM01) | `n1(P)` « h proactivas · » `n1(K)` « h correctivas» (`:202`), igual que Mantenimiento; sin órdenes, en su lugar «sin órdenes en SAP desde …» (fila 26) | ídem |
| 28 | Gráfica mes a mes (Tendencia) | 13 barras, oct-25 a oct-26 | por mes $m$: $\text{total}_m = \text{diferido}_m/d_m$ (claro), $\text{alto}_m = \text{altoImpacto}_m/d_m$ (oscuro), raya $= \text{meta.diferidoDia}_m$, con $d_m = \max(1/24, (\min(\text{hasta}_m, \text{ahora}) - \text{desde}_m)/24\,\text{h})$ — 5A §«Tendencia del gerente» | Eje Y sin números: techo $= 1{,}1\cdot\max_m \max(\text{total}_m, \text{máx}_m)$ (**sin** redondear a un tope, a diferencia de «Mes a mes» de ingeniería). Mes del período: borde y su cifra `n0(total)` encima; los demás sin cifra. Nombre del mes `corto` en mayúsculas, en negrita el del período. Leyenda fija: «alto impacto», «lo demás», «máximo firmado», «pasó el máximo». Globo por mes: título «Octubre 2026», «Diferido: 3.936 bbl/d», «De alto impacto: 3.488 bbl/d», «Máximo firmado: 2.300 bbl/d» (o `textoSinMeta`), pista «Clic para ver este mes». Clic → rango a la medida de ese mes | `GET /api/vistas/diferidos/mensual` → `[].libro.diferido`, `altoImpacto`, `meta.diferidoDia`, `meta.sinMeta`, `parcial`, `desde`, `hasta` |
| 29 | Marca «pasó el máximo» | ■ sobre JUL (y SEP) | $\text{total}_m > \text{máx}_m$ **y** el mes no es parcial (`:251`) | cuadrado P3 con título «Pasó el máximo de diferido firmado». Portafolio: jul 3.039 ■, sep 3.508 ■ (máx. 2.300); oct 3.936 sin marca por ser parcial | ídem |
| 40 | Cifra del mes del período | «3.936» | $\text{diferido}_{\text{oct}}/1{,}583$ | `n0`; solo sobre los meses que tocan el período | ídem |
| 30 | POR EQUIPO · cifra | «2.570» | `porEquipo[0].bbl` = 2.570,257 (P-201B de La Ceiba, parada abierta del 2-oct) — 5A §«Pareto por equipo» | las **tres** primeras filas de `porEquipo` (`:71`); vacío: «Nada diferido.» (`:217`) | `porEquipo[0..2].bbl` |
| 31 | Peso del equipo | «bbl · 41 %» | $100\cdot 2.570{,}257/6.231{,}716 = 41{,}2$ | «bbl · *n0(%)* %» (contra `diferido`, no contra la brecha; `:228`). Aquí sigue `n0` y no `pctParte` (ver Huecos 21) | `porEquipo[].bbl`, `diferido` |
| 32 | Parte o tipo | «aislamiento del motor y del cable» (MN-41) | `partes[0]` (la parte con más barriles del equipo); si no tiene: el tipo de causa | `NOMBRE_PARTE[parte]` en minúsculas o `TIPO_CAUSA[tipo]` en minúsculas («bomba de reinyección», «sin identificar», «energía eléctrica»); equipo en negrita y « · *Campo*» en el portafolio. Clic → ficha del equipo en su campo | `porEquipo[].partes[0].parte`, `tipo`, `campoId` |
| 33 | POR CAMPO · producción por día | ■ «9.438» (La Ceiba) | $\text{real}_c/\text{días} = 14.943/1{,}583$ | `BarraMeta` chica: `n0`, barra, meta a la derecha; ■ si $\text{real}_c/\text{días} < \text{metaProduccion}_c/\text{días}$ (`src/widgets/resumen/PorCampo.tsx:87`, `:108-111`) | `porCampo[].real`, `metaProduccion`, `sinMeta` |
| 34 | Meta por día del campo | «10.900» | $\text{metaProduccion}_c/\text{días} = 17.258{,}333/1{,}583$ | `n0`; con `sinMeta` no hay barra ni número y junto al nombre sale el chip «sin meta firmada» | `porCampo[].metaProduccion` |
| 35 | POR CAMPO · diferido por día | ■ «1.922» | $\text{brecha}_c/\text{días}$ | ■ si > máximo por día (`PorCampo.tsx:112-115`) | `porCampo[].brecha` |
| 36 | Máximo por día del campo | «800» | $\text{metaDiferido}_c/\text{días}$ | `n0` | `porCampo[].metaDiferido` |
| 37 | Barriles diferidos del campo | «3.043» | `porCampo[].brecha` | `n0`, en negrita (`PorCampo.tsx:116`; lector « bbl diferidos»). Filas en el orden del servidor (brecha descendente): La Ceiba 3.043 · Guacamayo 1.858 · Morichal Norte 1.253 · El Palmar 77 · La Zarza 0 (−0 se escribe 0). La fila entera es un botón que **despliega** los equipos del campo (6A.1.4); ir al campo es el botón «Ir a *campo*» de la lista | `porCampo[].brecha` |
| 42 | Chevron de la fila | «›» plegado (desplegado, «⌄») | la fila es un `<button aria-expanded aria-controls>` (`PorCampo.tsx:101-104`); el chevron gira 90° al abrir | decorativo (`aria-hidden`): el estado lo dice `aria-expanded`. No sale en el papel (`no-imprimir`), donde los campos van siempre desplegados | estado de la pantalla (no pide nada) |

**Las cinco filas de POR CAMPO (portafolio, octubre):**

| Campo | Producción bbl/d | Meta | ■ | Diferido bbl/d | Máx. | ■ | bbl |
|---|---:|---:|---|---:|---:|---|---:|
| La Ceiba | 9.438 | 10.900 | ■ | 1.922 | 800 | ■ | 3.043 |
| Guacamayo | 5.442 | 6.300 | ■ | 1.173 | 450 | ■ | 1.858 |
| Morichal Norte | 16.813 | 16.700 | — | 792 | 950 | — | 1.253 |
| El Palmar | 3.228 | 3.250 | ■ | 49 | 50 | — | 77 |
| La Zarza | 3.159 | 3.050 | — | 0 | 50 | — | 0 |

La Zarza no tiene precio pero sí meta: no lleva chip; el precio solo afecta el valor (fila 6).

**Las tres filas de POR EQUIPO (filas 30-32, portafolio, octubre)**, en el orden del servidor (`porEquipo` por `bbl` descendente; el % es contra `diferido` = 6.231,716): P-201B · La Ceiba · «bomba de reinyección» (sin parte: la parada abierta del 2-oct no la tiene) **2.570** bbl · 41 %; MN-41 · Morichal Norte · «aislamiento del motor y del cable» **1.083** bbl · 17 % (1.083,1 / 6.231,7 = 17,4 %); GU-07 · Guacamayo · «aislamiento del motor y del cable» **931** bbl · 15 % (14,9 %). `GET /api/vistas/diferidos` → `porEquipo[0..2].equipo`, `campoId`, `bbl`, `partes[0].parte`, `tipo`.

---

## 6A.1.2 Un campo · octubre en curso (La Ceiba)

![Resumen · gerente · La Ceiba · octubre en curso](../img/ger-resumen-ceiba.png)

Mismas filas que el portafolio; solo cambian los valores y lo que se apaga con un campo:

| # | En la captura | Qué cambia |
|---|---|---|
| 1 | «La Ceiba · 11.105 bbl producidos ayer» | sin «N campos» |
| 3 · 4 | «3.043» · «2.587–3.500 bbl · calculado» | 17.986,201 − 14.943; tol 456,480 |
| 5 · 6 | «146 mil USD» · «valor» | 3.043,201 × 48; sin `sinPrecio` → rótulo «valor» sin ⓘ |
| 7 · 9 | ■ «9.438 bbl/d» · «meta 10.900» | 14.943 / 1,583; relleno $0{,}866/1{,}25 = 69{,}3\,\%$ |
| 10 · 11 | ■ «1.922 bbl/d» · «máx. 800» | 3.043,201 / 1,583 |
| 12 | «+98 % frente a jul a sep» | base 968,853 bbl/d → 1.922,021 |
| 14 · 15 | ■ «14.943 bbl» · «meta 337.900» | ritmo de hoy **0**: los 18 pozos están cerrados (potencial 11.359,706 = perdiendo 11.359,706), así que el cierre es lo que va; relleno 3,5 % |
| 16 · 17 | ■ «337.208 bbl» · «máx. 24.800» | 3.043,201 + 29,417 × 11.359,706 |
| 18 · 19 | ◆ «11.360 bbl/d» · «18 de 18 pozos parados» | 17 pozos por P-201B + LC-21 sin identificar |
| 20 | «P-201B» (sin campo) y «bomba de reinyección» | un solo campo: sin « · La Ceiba» |
| 21 · 22 · 41 | «ninguno» · «ninguna otra bomba ni electrosumergible avisa» · «+ 1 servicio en alarma» | no hay en riesgo de alto impacto; P-201B ya se está perdiendo (alto impacto) → «ninguna **otra**…»; K-101 (aire de instrumentos: `esServicio`) va en su propio renglón, entero (antes se cortaba al final del pie: Huecos 2, resuelto). Globo «También en alarma»: «K-101 → Aire de instrumentos» (sin campo: es uno solo) |
| 24 · 25 | «84 %» · «736 → 762 bbl/d · +3 %» | 2.570,257/3.043,201; 67.733,617/92 → 24.064,028/31,583 |
| 26 · 27 | «20 %» · «4,0 h proactivas · 16,0 h correctivas» | PM03 de LC-14 (4 h) contra dos PM01 de P-201B (8 + 8 h); la orden abierta de octubre suma 0 h |
| 32 · 38 | «sin identificar» · «bbl · 8 %» (LC-21) | LC-21 no tiene parte ni causa: se escribe `TIPO_CAUSA.pendiente` en minúsculas; 246,514/3.043,201 = 8,1 % |
| 30 (tercera fila; filas 30-31) | «SE-2» · «energía eléctrica» · «118 bbl · 4 %» | tercera fila de `porEquipo` de La Ceiba: SE-2 (alimentador eléctrico), 118 bbl; sin parte (un servicio no tiene partes) → el tipo «energía eléctrica» en minúsculas; 118/3.043 = 3,9 % → «4 %». La cuarta fila (LC-08, 109 bbl) no sale: el Resumen corta en tres (`:71`) |
| — | sin POR CAMPO | el bloque solo existe con el portafolio (`:235`) |

Globos de esta captura, literales:

![Globo del cierre proyectado](../img/ger-resumen-ceiba-globo-cierre.png)

![Globo del rango (nivel decisión)](../img/ger-resumen-ceiba-globo-rango.png)

- ⓘ de CIERRE PROYECTADO: «Si todo sigue como está ahora: lo que va del mes más el ritmo de hoy hasta el último día (31 días).»
- Globo del rango: título «Margen del cálculo», «Rango: 2.587 a 3.500 bbl» y la pista `NOTA_SIMPLE`: «Lo producido se mide en el punto de medición oficial. Lo diferido se calcula a partir de las pruebas de los pozos y las horas que estuvieron parados: es una estimación con su margen, no una medición. La cifra real está dentro del rango. Las predicciones son escenarios, no compromisos.» (`src/widgets/diferidos/Rango.tsx:16-19`).

![Globo «También en alarma» (portafolio)](../img/ger-resumen-portafolio-globo-alarma.png)

- Globo «También en alarma» (portafolio, fila 41): «MPP-301 · Morichal Norte — Bomba multifásica» y «K-101 · La Ceiba — Aire de instrumentos», en el orden en que el servidor manda las filas de riesgo.

---

## 6A.1.3 Un campo · período cerrado (Morichal Norte · trimestre jul–sep)

![Resumen · gerente · Morichal Norte · trimestre](../img/ger-resumen-morichal-trimestre.png)

| # | En la captura | Cómo sale | Qué cambia respecto del mes en curso |
|---|---|---|---|
| 2 | «✓ PUBLICABLE» | `motivos = []` (jul, ago y sep publicados, factores en banda, meta firmada, sin pendiente) | sin marca |
| 3 | «108.829» | 1.624.383,332 − 1.515.554 | rango «92.763–124.896 bbl · calculado» (tol 16.066,280) |
| 5 | «5,2 M USD» | 108.829,332 × 48 = 5.223.807,916 | `usd` ≥ 10⁶ → `n1` de millones |
| 7 | ■ «16.473 bbl/d» | 1.515.554 / 92 días | meta 16.700 → relleno 78,9 % |
| 10 | ■ «1.183 bbl/d» | 108.829,332 / 92 | máx. 950 → relleno 99,6 % |
| 12 | «+65 % frente a abr a jun» | base 716,579 → 1.182,928 | la base son los tres meses antes del **período** |
| 13 | «TOTAL DEL PERÍODO» | `diasTotal = días = 92` → no en curso | sin ⓘ; compara real contra `meta.produccion` y brecha contra `meta.diferido` (`:139-147`). Globo de la producción: «Producción del período · Meta del período: 1.536.400 bbl · 92 días» |
| 14 · 15 | ■ «1.515.554 bbl» · «meta 1.536.400» | `real` contra `meta.produccion` (16.700 × 92) | |
| 16 · 17 | ■ «108.829 bbl» · «máx. 87.400» | `brecha` contra `meta.diferido` (950 × 92) | |
| 18 · 19 | ◆ «684 bbl/d» · «1 de 41 pozos parados» | la única fila `perdiendo` de Morichal **ahora**: MN-41, parada por su electrosumergible (697 × FA 0,981 = 684,066 bbl/d); de alto impacto → ◆ P1. Pozos: `estado.parados` = 1 de `estado.pozos` = 41 (5B §5.4) | no depende del período (es «ahora») |
| 20 | «MN-41» · «electrosumergible» | la fila `perdiendo` más grande **de ahora** (684,066 bbl/d) | perdiéndose ahora, causa mayor y en riesgo **no dependen del período**: son «ahora» |
| 21 | «4 equipos» | filas `en-riesgo` con `altoImpacto` de Morichal: P-201B (succión), MN-07, MN-18, MN-27 | `plural(4, 'equipo', 'equipos')` |
| 22 · 41 | «primero MN-07 en 4 h» · «+ 1 bomba multifásica en alarma» | 4 de alto impacto (P-201B, MN-07, MN-18, MN-27); lo otro en alarma es MPP-301, la multifásica: una máquina de bombeo de la línea, no un servicio (`esServicio` falso, `tipo = 'transporte'`). Antes se leía «1 servicio en alarma» (Huecos 1, resuelto) | |
| 28 · 39 | barras de JUL, AGO y SEP con borde y «849», «933», «1.785» | los tres meses del período van con borde y cifra; ■ en MAR (958), MAY (1.320) y SEP (1.785) contra 950 | Morichal: lo de alto impacto es poco en mar y may (lo demás es SE-2 y MPP-301) |
| 24 · 25 · 26 · 27 | «78 %» · «499 → 1.628 bbl/d · +226 %» · «9 %» · «4,0 h proactivas · 40,0 h correctivas» | 24: $100\cdot\text{altoImpacto}/\text{diferido}$ del trimestre de Morichal (5A §«Alto impacto, % del diferido»); 25: los dos intervalos fijos (jun-ago contra 1-sep → ahora) del campo, 5A §«Antes → con TRIM»; 26 · 27: órdenes SAP de Morichal desde el 1-sep, $4/(4+40) = 9{,}1\,\%$ (5D §«Horas proactivas contra correctivas») | el % sí es del período; antes→con TRIM y SAP **no** |
| 30 · 31 · 32 | POR EQUIPO: «MN-41 · aislamiento del motor y del cable · 18.638 bbl · 17 %», «MN-06 · aislamiento del motor y del cable · 16.005 bbl · 15 %», «SE-2 · energía eléctrica · 13.152 bbl · 12 %» | las tres primeras filas de `porEquipo` del trimestre; % contra `diferido` = 108.829 (período cerrado: diferido = brecha) | otras filas que en octubre: el Pareto **sí** es del período |

La Tendencia de Morichal, para cotejar (bbl/d total/alto, máx. 950): oct 928/453 · nov 404/229 · dic 730/29 · ene 31/24 · feb 77/36 · mar 958/218 ■ · abr 303/296 · may 1.320/134 ■ · jun 507/377 · jul 849/628 · ago 933/490 · sep 1.785/1.677 ■ · oct 792/692 (en curso). La Ceiba: oct-25 1.067/944 ■ · nov 249/160 · dic 747/743 · ene 173/24 · feb 834/834 ■ · mar 648/643 · abr 612/554 · may 434/431 · jun 384/310 · jul 1.955/1.868 ■ · ago 221/17 · sep 723/716 · oct 1.922/1.623. Portafolio: oct-25 2.108 · nov 1.070 · dic 2.067 · ene 591 · feb 1.125 · mar 1.752 · abr 1.142 · may 1.872 · jun 1.003 · jul 3.039 ■ · ago 1.680 · sep 3.508 ■ · oct 3.936 (máx. 2.300).

---

## 6A.1.4 POR CAMPO desplegado (portafolio · octubre en curso)

Decisión del dueño del 8-oct: el gerente no ve Bombas ni Electrosumergibles; lo que le interesa es **de qué campo viene el diferido y qué equipos de ese campo fallan**. Cada fila de POR CAMPO (filas 33-37 y 42) es un botón: un toque la abre o la cierra y debajo sale la lista de los equipos del campo (`src/widgets/resumen/PorCampo.tsx`, montado en `ResumenDirectivo.tsx:235` solo en el portafolio). Sin señales, tags ni tolerancias. La captura es solo el bloque, con La Ceiba y Morichal Norte abiertos.

![POR CAMPO con La Ceiba y Morichal Norte desplegados · portafolio · octubre en curso](../img/ger-resumen-portafolio-porcampo.png)

**Qué renglones salen** (`PorCampo.tsx:89-92`): las filas de `porEquipo` de ese campo, en el orden del servidor (barriles de mayor a menor; una fila por campo, equipo y tipo, así que un equipo puede salir dos veces: su falla y su parada programada) y, al final, las de `sinCosto` de ese campo (equipos que fallaron sin costar crudo, 6A.1.5). Ningún número se calcula en la pantalla: el front solo divide para el % y escoge el texto.

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 37 | Barriles del campo | «3.043» | `porCampo[].brecha` (fila 37) | igual que plegado | `porCampo[].brecha` |
| 42 | Chevron abierto | «⌄» junto a «La Ceiba» | `aria-expanded = true`; `aria-controls` apunta a la lista (`PorCampo.tsx:101`, `:119`) | lista con nombre accesible «Equipos de La Ceiba» (`:123`) | — |
| 43 | Marca de prioridad del renglón | ◆ P1 en P-201B (La Ceiba); ■ P3 en SE-2 (Morichal Norte) | `marcaDeFila(f, hoy)` (`src/widgets/diferidos/marca.ts:10-11`): la severidad **de hoy** del equipo si el renglón es de una falla suya; **ninguna** (0) si `tipo = 'programada'`. Lo declarado y lo sin identificar sí son fallas (paradas que nadie programó) y llevan la del equipo | `MarcaPrioridad` decorativa (`aria-hidden`); 0 → punto gris. La prioridad va en el nombre accesible del renglón (`:132`): «Prioridad 1 · alarma. P-201B, bomba de reinyección, 1 falla: 2.570 bbl, 84 % del diferido de La Ceiba». Es la misma función que marca el Pareto de Diferidos (6A.2 fila 19) | `GET /api/vistas/equipos-hoy?campos` → `[].severidad` |
| 44 | Equipo | «P-201B» | `porEquipo[].equipo` | negrita, sin el campo (ya está bajo su campo) | `porEquipo[].equipo` |
| 45 | Lo que es · cuántas veces falló | «bomba de reinyección · 1 falla» | `TIPO_CAUSA[tipo]` en minúsculas · `vecesDe(f)` (`PorCampo.tsx:27-31`): en las filas que traen `fallas` (solo `reinyeccion`, `transporte` y `electrosumergible`), sus fallas y disparos del período (fórmula abajo) | «1 falla» / «N fallas» / «sin fallas»; detrás « · 1 disparo» / « · N disparos» solo si hay | `porEquipo[].tipo`, `fallas`, `disparos` |
| 48 | Electrosumergible que solo disparó | «electrosumergible · sin fallas · 1 disparo» (MN-25) | `fallas = 0`, `disparos = 1`: paró y volvió en menos de 24 h | un disparo no es una falla, pero también difiere (12 bbl) | ídem |
| 50 | Paradas (lo que no es falla de un equipo de la línea) | «sin identificar · 1 parada» (LC-21); también «energía eléctrica · 2 paradas» (SE-2 de Morichal), «declarada por el operario · 1 parada» (MN-22) | servicios, lo programado, lo declarado y lo sin identificar no traen `fallas`: se cuentan sus paradas con barriles, `eventos` = paradas distintas de la fila (5A §«Pareto por equipo») | `plural(eventos, 'parada', 'paradas')` | `porEquipo[].eventos` |
| 46 | Barriles del renglón | «2.570» | `porEquipo[].bbl` = 2.570,257 | `n0`, negrita | `porEquipo[].bbl` |
| 47 | Parte del campo | «bbl · 84 %» | $p_e = 100\cdot\text{bbl}_e/\text{diferido}_c = 100 \times 2.570{,}257 / 3.043{,}201 = 84{,}46$ (base abajo) | `pctParte(p)` (`src/shared/lib/formato.ts:20-21`): `n0(p)` « %»; lector «84 % del diferido de La Ceiba» | `porEquipo[].bbl`, `porCampo[].diferido` |
| 49 | Menos del 1 % | «bbl · < 1 %» (MN-25: $100 \times 11{,}903/1.253{,}234 = 0{,}95$) | ídem | con $0 < p < 1$ dice «< 1 %» (lector «menos del 1 %»), nunca «0 %» ni «1 %»: un número que no es cero no se pinta como cero (corregido el 8-oct: antes, con `n0`, 49 de los 97 renglones de 12 meses decían «0 %»). Un renglón con barriles nunca tiene $p = 0$ | ídem |
| 51 | Ir al campo | «Ir a La Ceiba» | `onCampo(c.campoId)` = `setCampo` (`PorCampo.tsx:153`) | lo que antes hacía el toque en la fila; no se imprime (`Boton` lleva `no-imprimir`) | — |

**Fallas y disparos del período** (los calcula el servidor: `src/entities/libro.ts:757-760`, campos opcionales de `FilaEquipo`, `:408-428`):

$$
\text{fallas}_e = \#\{\,k \in H_e : \neg\,\text{disparo}_k \;\wedge\; t^{\text{ini}}_k < h \;\wedge\; t^{\text{fin}*}_k > d \,\}
\qquad
\text{disparos}_e = \#\{\,k \in H_e : \text{disparo}_k \;\wedge\; t^{\text{ini}}_k < h \;\wedge\; t^{\text{fin}*}_k > d \,\}
$$

| Símbolo | Qué es | Unidad | Fuente |
|---|---|---|---|
| $H_e$ | los eventos de la historia de fallas del equipo: las paradas de la bomba del PLC (también las que el tanque absorbió) o los eventos de su electrosumergible | — | `historialDeEquipo(campo, equipo)`, la misma historia de su ficha y de Confiabilidad |
| $[d, h)$ | el período consultado | instante | `desde`, `hasta` |
| $t^{\text{fin}*}_k$ | fin del evento; si sigue abierto, ahora | instante | la regla de período de `porParte` |
| $\text{disparo}_k$ | electrosumergible que volvió a arrancar en menos de 24 h | — | `esDisparo`, `DISPARO_MAX_H = 24` (`libro.ts:450-455`) |

Cuenta la falla abierta y las que no costaron barriles; por eso una bomba puede tener **más fallas que paradas con barriles** (P-201B de Morichal en 12 meses: 8 fallas, `eventos` = 5; 6A.1.5). En una electrosumergible, $\text{fallas} + \text{disparos} = \text{eventos}$ (MN-06 en 12 meses: 1 + 4 = 5). En una bomba, `disparos` = 0. En las filas de otro tipo los dos campos no van y la pantalla cuenta paradas (fila 50). Comprobado en verificar-libro §18 (6 períodos: las 279 filas de bombas y electrosumergibles cuadran con la historia recortada al período).

**La base del % es el diferido del campo, no la cifra de su fila.** La fila muestra $\text{brecha}_c = \text{Potencial}_c - \text{Real}_c$ (fila 37); el % de cada equipo es contra $\text{diferido}_c$ = Σ de los eventos del campo (`porCampo[].diferido`, `PorCampo.tsx:127`), que es exactamente la suma de sus renglones con barriles (identidad de verificar-libro §1): así los % de un campo suman 100. Las dos cifras coinciden cuando no hay inventario entre días: el mes en curso (La Ceiba: 3.043,201 las dos) y los meses enteros. En un rango que corta meses difieren por el residuo (5A §«Residuo · inventario entre días»): del 15-sep al 2-oct La Ceiba dice «8.977» (brecha 8.976,505) y sus equipos suman 9.472,825, la base de sus %; La Zarza, brecha −53,587 y diferido 0, no tiene renglones. El POR EQUIPO del Resumen (fila 31) y el Pareto de Diferidos usan la misma base (`diferido`).

**Los cinco campos en octubre** (marca · equipo · lo que es · veces · bbl · % del campo):

| Campo (fila · base del %) | Renglones |
|---|---|
| La Ceiba (3.043 · 3.043,201) | ◆ P-201B · bomba de reinyección · 1 falla · 2.570 · 84 %; ▲ LC-21 · sin identificar · 1 parada · 247 · 8 %; • SE-2 · energía eléctrica · 1 parada · 118 · 4 %; • LC-08 · sin identificar · 1 parada · 109 · 4 % |
| Guacamayo (1.858 · 1.857,787) | ◆ GU-07 · electrosumergible · 1 falla · 931 · 50 %; ◆ GU-09 · electrosumergible · 1 falla · 927 · 50 % |
| Morichal Norte (1.253 · 1.253,234) | ◆ MN-41 · electrosumergible · 1 falla · 1.083 · 86 %; • MN-22 · declarada por el operario · 1 parada · 86 · 7 %; ■ SE-2 · energía eléctrica · 2 paradas · 72 · 6 %; • MN-25 · electrosumergible · sin fallas · 1 disparo · 12 · < 1 % |
| El Palmar (77 · 77,496) | • PA-07 · bombeo mecánico · 1 parada · 77 · 100 % |
| La Zarza (0 · 0) | «Ningún equipo con diferido.» (`PorCampo.tsx:121`) |

Ningún equipo falló sin costar crudo en octubre (`sinCosto` vacío).

**Cuántos se ven.** `useVerMas(renglones, { n, prioridad: marca })` (`PorCampo.tsx:95`): cinco a la vista (seis si son exactamente seis, para no esconder uno solo) y además **toda fila P1**, aunque venga después (ISA-18.2: una alarma no se tapa); el resto, detrás de «ver N más» / «ver menos» (`VerMas`) y con `solo-impresion`, para que salga en el papel. En octubre ningún campo pasa de cuatro renglones.

**En el papel**, todos los campos salen desplegados (`hidden print:block`, `:119`), sin chevrons ni botones; un campo largo se parte entre hojas por sus renglones (`data-partible`, `:100`, y `src/index.css:194`) y el nombre del campo no queda solo al pie de una hoja (`print:break-after-avoid`, `:102`). Portafolio, 12 meses: 98 renglones (los 97 con barriles y P-201B de Guacamayo) en 7 hojas A4.

**Un toque en un equipo** abre su ficha ejecutiva con el mismo `abrir` de POR EQUIPO (`ResumenDirectivo.tsx:74`: `setCampo` + `abrirEquipo(eq, false)`).

---

## 6A.1.5 Portafolio · últimos 12 meses (Guacamayo desplegado entero)

Guacamayo abierto y «ver 9 más» tocado (`antes` de la captura), para que se vea el último renglón: P-201B, que falló sin costar crudo.

![Resumen · gerente · portafolio · 12 meses, Guacamayo desplegado](../img/ger-resumen-portafolio-doce.png)

| # | En la captura | Cómo sale | Qué cambia |
|---|---|---|---|
| 3 | «639.507» | 15.917.845,243 − 15.278.338 (el mismo libro de 6A.2.3) | período cerrado: «TOTAL DEL PERÍODO», sin ⓘ |
| 12 | «sin base de comparación» | `GET …/base` → `null`: no hay tres meses publicados antes del 1-oct-2025 | antes del 8-oct la línea no salía (Huecos 4) |
| 37 | «98.380» | brecha de Guacamayo, 98.379,623 = su diferido (meses enteros) | las filas, por brecha: Morichal Norte 270.387 · La Ceiba 244.954 · Guacamayo 98.380 · El Palmar 18.007 · La Zarza 7.780 |
| 48 | «electrosumergible · 1 falla · 7 disparos» (GU-05) | `fallas` 1, `disparos` 7; `eventos` = 8 = 1 + 7 | |
| 43 | ◆ GU-09 | severidad de hoy 1 (aislamiento «falló») | sin «ver más» tocado, GU-09 (5.º) y GU-07 (8.º, P1) quedan a la vista |
| 49 | «bbl · < 1 %» (SE-2 de Guacamayo: $100 \times 929{,}550 / 98.379{,}623 = 0{,}94$) | `pctParte` | 6 de los 15 renglones de Guacamayo; en el portafolio, 54 de los 97 con barriles |
| 52 | «bomba de reinyección · 5 fallas · no costó crudo» (P-201B) | `Libro.sinCosto` (abajo): sin barriles ni % | último renglón del campo |
| 53 | «ver menos» | «ver 9 más» ya tocado | |
| 51 | «Ir a Guacamayo» | `setCampo('guacamayo')` | |

**Guacamayo, 12 meses** (15 renglones; base 98.379,623): • GU-05 · electrosumergible · 1 falla · 7 disparos · 16.794 · 17 %; • LACT-01 · evacuación del crudo · 4 paradas · 15.179 · 15 %; • GU-02 · 1 falla · 6 disparos · 14.990 · 15 %; • GU-11 · 1 falla · 7 disparos · 13.856 · 14 %; ◆ GU-09 · 1 falla · 7 disparos · 10.740 · 11 %; • GU-08 · 1 falla · 7 disparos · 10.643 · 11 %; • GU-06 · 1 falla · 14 disparos · 9.300 · 9 %; ◆ GU-07 · 1 falla · 10 disparos · 3.631 · 4 %; • SE-2 · energía eléctrica · 21 paradas · 930 · < 1 %; • GU-01 · sin fallas · 10 disparos · 717 · < 1 %; • GU-03 · sin fallas · 11 disparos · 609 · < 1 %; ▲ GU-04 · sin fallas · 6 disparos · 371 · < 1 %; • GU-12 · sin fallas · 10 disparos · 369 · < 1 %; • GU-10 · sin fallas · 7 disparos · 249 · < 1 %; • P-201B · bomba de reinyección · 5 fallas · no costó crudo. Plegada la lista, se ven los cinco primeros y GU-07 (P1); «ver 9 más» esconde los otros nueve, también ▲ GU-04 (solo la P1 se queda a la vista).

**Equipos que fallaron sin costar crudo (`Libro.sinCosto`)** — los calcula el servidor (`src/entities/libro.ts:780-791`; tipo `EquipoSinCosto`, `:434-445`): para cada campo de la consulta, los candidatos son las bombas con paradas en el campo y perfil firmado (`transporte` si es multifásica, si no `reinyeccion`, también la de recobro) y los pozos con electrosumergible (`electrosumergible`); se quitan los que ya tienen fila de su familia en `porEquipo`; se cuentan `fallas` y `disparos` con la regla de 6A.1.4 y quedan los que tienen $\text{fallas} + \text{disparos} > 0$. Orden: más fallas, más disparos, el código del equipo (comparación de texto simple, la misma en cualquier lenguaje). No tocan `porEquipo`, `porParte` ni ningún Pareto. La pantalla los pone al final de su campo (`PorCampo.tsx:91`, `:137`): «*tipo* · *veces* · no costó crudo», sin barriles ni %; lector «P-201B, bomba de reinyección, 5 fallas: no costó crudo» (`:128`, `:132`); llevan la marca de hoy del equipo (son fallas) y entran en «ver N más» como uno más. **P-201B de Guacamayo** es la bomba de recobro: el agua tiene salida alterna y su parada no cierra pozos (5B §5 «Lo que se pierde ahora y lo que está en riesgo»: `bblDia` 0 para recobro), así que sus fallas no cargan barriles. Por período: 5 fallas en 12 meses, 4 en el año a la fecha, 1 en el trimestre, ninguna en septiembre ni en octubre. La serie mensual lo trae en 7 meses (Guacamayo nov, mar, may, jun, ago; P-201B de Morichal dic y ene, absorbidas por el tanque). Comprobado en verificar-libro §19 (seis períodos, ni uno de más ni de menos contra la historia de fallas).

**Otros campos, 12 meses**, para cotejar: Morichal Norte (270.387; 47 renglones, 33 con «< 1 %»): ■ SE-2 · energía eléctrica · 58 paradas · 103.043 · 38 %; ▲ P-201B · bomba de reinyección · **8 fallas** · 26.917 · 10 % (5 paradas con barriles: 3 las absorbió el tanque); ■ MPP-301 · bomba multifásica · 7 fallas · 24.035 · 9 %; ◆ MN-41 · electrosumergible · 1 falla · 18.638 · 7 %; • MN-06 · 1 falla · 4 disparos · 16.206 · 6 %. La Ceiba (244.954; 22 renglones): ◆ P-201B · bomba de reinyección · 8 fallas · 144.598 · 59 %; • LC-16 · 1 falla · 6 disparos · 30.328 · 12 %; • LC-09 · 1 falla · 8 disparos · 22.537 · 9 %; ◆ K-101 · aire de instrumentos · 5 paradas · 12.997 · 5 %; …; **• P-201B · parada programada · 1 parada · 3.828 · 2 %**, sin marca aunque P-201B esté hoy en P1 (`marcaDeFila`): una parada programada no es una alarma y no se queda a la vista por ella. El Palmar (18.007; 8 renglones) y La Zarza (7.780; 6), sin marcas.

---

## 6A.1.6 Un campo sin órdenes de SAP ni nada perdiéndose (El Palmar · octubre en curso)

![Resumen · gerente · El Palmar · octubre en curso](../img/ger-resumen-palmar.png)

| # | En la captura | Cómo sale | Qué cambia |
|---|---|---|---|
| 18 · 19 | «nada» · «todos los pozos produciendo» | ninguna fila `perdiendo` en El Palmar | sin marca y sin la celda «Causa mayor» |
| 21 · 22 | «ninguno» · «ninguna bomba ni electrosumergible avisa» | ni en riesgo ni perdiendo de alto impacto | sin renglón «+ … en alarma» ni globo: no hay nada más en riesgo |
| 25 | «0 → 0 bbl/d · —» | El Palmar no tiene reinyección ni electrosumergibles (bombeo mecánico): alto impacto 0 antes y después | con «antes» = 0 no hay %: «—» |
| 26 · 27 | «sin dato» · «sin órdenes en SAP desde 1 de sept» | ninguna orden de El Palmar con horas desde la puesta en marcha: `porcentaje` ausente | antes del 8-oct el bloque desaparecía (Huecos 5); La Zarza dice lo mismo |

El resto, del mismo libro: «77» · «66–89 bbl · calculado» · «4 mil USD» · «valor»; ■ «3.228 bbl/d» · «meta 3.250»; «49 bbl/d» · «máx. 50» · «+13 % frente a jul a sep»; cierre «101.508 bbl» · «meta 100.750» y «77 bbl» · «máx. 1.550»; «0 %» de alto impacto; POR EQUIPO «PA-07 · bombeo mecánico · 77 · bbl · 100 %».

---

## Variantes

- **Portafolio vs campo.** Solo el portafolio tiene «· N campos» en la cabecera, « · *Campo*» junto al equipo (causa mayor, por equipo y el globo «También en alarma») y el bloque POR CAMPO con sus campos desplegables (6A.1.4). `textoSinMeta(meta, varios)` nombra los campos sin meta solo en el portafolio («sin meta firmada en La Zarza»); con un campo dice «sin meta firmada».
- **En curso vs cerrado.** Con el mes en curso: «A la fecha», «CIERRE PROYECTADO» con su ⓘ y barras contra `produccionTotal`/`diferidoTotal`. Con cualquier otro período (cerrado, trimestre, año a la fecha, 12 meses, rango): «Del período», «TOTAL DEL PERÍODO», barras contra `produccion`/`diferido`. El año a la fecha y un rango que llega a hoy **no** cuentan como «en curso» (5A §Huecos 12).
- **Teléfono.** Mismo contenido; POR CAMPO pone nombre y total arriba y las dos barras debajo (`rejilla`, `PorCampo.tsx:53`), también en la lista desplegada; la Tendencia se desplaza en horizontal y arranca al final (`alFinal`).
- **Papel.** POR CAMPO sale con todos los campos desplegados y todos sus renglones, sin chevrons, «ver N más» ni «Ir a» (6A.1.4); el globo «También en alarma» se escribe.
- **Nivel.** Otro nivel no ve esta pantalla (ver abajo).

## Estados

| Estado | Qué se ve | Cómo provocarlo en el demo |
|---|---|---|
| Sin meta firmada en algún campo | barras sin raya ni relleno, rótulo «sin meta firmada en *X*», sin ■; POR CAMPO con chip «sin meta firmada» y barras sin meta; globos «Meta del período: sin meta firmada…»; en la Tendencia, el mes sin raya ni ■ | no hay ruta del demo: hace falta firmar una configuración sin tramos para un campo (5A §«Sin meta firmada», escenario corrido de La Zarza) |
| Falta precio | «valor · falta precio en La Zarza» + ⓘ | cualquier período del portafolio (La Zarza no tiene precio) — captura 6A.1.1 |
| Sin ningún precio | «sin precio» + ⓘ «Falta el precio neto en la configuración.» | `#/ger/resumen/zarza/curso` |
| Provisional / publicable / no publicable | ver fila 2 | `…/curso` (provisional), `…/cerrado` y `…/trimestre` (publicable), `…/ceiba~portafolio/ytd` o `/doce` (no publicable: «El Palmar · factor fuera de banda») |
| Nada perdiéndose | «nada» sin marca, «todos los pozos produciendo», sin la celda «Causa mayor» | `#/ger/resumen/palmar/curso` o `zarza` — captura 6A.1.6 |
| Sin órdenes SAP con horas | «sin dato» · mantenimiento proactivo, sin barra, y «sin órdenes en SAP desde 1 de sept» | `#/ger/resumen/palmar/curso` o `zarza` — captura 6A.1.6 |
| Sin base de comparación | «sin base de comparación» bajo la barra del diferido | `…/doce` (12 meses: no hay tres meses publicados antes del 1-oct-2025) — captura 6A.1.5 |
| Nada en riesgo ni en alarma | «ninguno», «ninguna bomba ni electrosumergible avisa», sin renglón «+ … en alarma» ni globo | `#/ger/resumen/palmar/curso` — captura 6A.1.6 |
| Solo servicios o bombas sin cierre en alarma | «ninguno» y el renglón «+ 1 servicio en alarma» con su globo | `#/ger/resumen/ceiba/curso` (K-101) — captura 6A.1.2 |
| Un campo sin equipos con diferido | desplegado: «Ningún equipo con diferido.» | La Zarza en `#/ger/resumen/ceiba~portafolio/curso` |
| Un equipo que falló sin costar crudo | al final de su campo, «… · *N* fallas · no costó crudo», sin barriles ni % | P-201B de Guacamayo en `…/doce`, `…/ytd` o `…/trimestre` — captura 6A.1.5 |
| Muchos equipos en un campo | cinco a la vista y toda P1; «ver N más» | Guacamayo en `…/doce` («ver 9 más») |

## Interacciones

| Clic / toque | Hace | Pide |
|---|---|---|
| Barra de un mes de la Tendencia | rango a la medida de ese mes (`#/ger/resumen/<campo>/2026-07-01_2026-07-31`) | otra vez el libro, la base y la serie con ese período |
| Fila de POR EQUIPO | cambia al campo del equipo y abre su ficha ejecutiva (`abrirEquipo(eq, false)`) | `GET /api/vistas/equipos/:campo/:equipo/ficha` (otro capítulo) |
| Fila de POR CAMPO | despliega o pliega los equipos del campo (`aria-expanded`); Enter o espacio con el teclado | nada: los equipos vienen en el libro que ya está y la marca en `GET /api/vistas/equipos-hoy`, pedido una vez al montar el bloque |
| Un equipo de la lista | cambia al campo del equipo y abre su ficha ejecutiva, como en POR EQUIPO | `GET /api/vistas/equipos/:campo/:equipo/ficha` |
| «Ir a *campo*» | cambia al campo | los mismos endpoints con un campo |
| «ver N más» / «ver menos» | muestra u oculta el resto de los equipos de ese campo | nada |
| «Ver riesgo» | va a Riesgo | `GET /api/vistas/riesgo`, `…/estado` |
| ⓘ y globos | ver filas 4, 7, 10, 13, 25, 26, 28 y 41 | ninguno |
| Exportar | imprime esta pantalla con membrete, folio y huella (5D §«Membrete y pie del papel»); los ⓘ salen escritos | `POST /api/informes` |

## Lo que no se alcanza hoy: `Portafolio` y `ResumenCampo`

`Resumen()` manda a `Portafolio` (portafolio) o `ResumenCampo` (un campo) a los niveles distintos de `decision` (`src/pages/Resumen.tsx:35-36`), pero ningún rol de ingeniería u operación tiene la pantalla «resumen». Si el producto se la diera a uno, `ResumenCampo` mostraría: el encabezado de Diferidos (6A.2), la franja `Ahora` (abajo), cuatro cifras —«producción contra su meta» (`n0(real/días)` «de *meta* bbl/d», ■ si cumplimiento < 100 %), «sin paradas programadas» (`n1(peNoPlan)` %, 5A §«Sin paradas programadas»), «sin identificar» (`n0(pendiente)` bbl, ■ si el libro no es publicable y hay pendiente; pista = textos de los motivos) y «evitable cerrando en orden» (`n0(evitablePorOrden)` bbl)—, «DIFERIDO MES A MES» (gráfica de ingeniería, 6A.2), «DÓNDE BAJARLO» y el Pareto por equipo con cinco filas y «Ver los N equipos». El servidor no cambia: son los mismos campos del libro.

**La franja `Ahora`** (`src/widgets/riesgo/Ahora.tsx`, también en `Portafolio`) usa desde el 8-oct las mismas reglas del Resumen del gerente:

| Bloque | Portafolio (demo) | La Ceiba (demo) | Regla |
|---|---|---|---|
| Perdiéndose ahora | ◆ «13.217 bbl/d» · «P-201B · La Ceiba · bomba de reinyección · 11.059 bbl/d · 12.916 de alto impacto» | ◆ «11.360 bbl/d» | sin cambio (`:36-39`) |
| En riesgo · *N* equipos de alto impacto | «En riesgo · 5 equipos de alto impacto» · ■ «3.961 bbl/d» · «primero MN-07 · Morichal Norte · bomba de fondo en 4 h» · «+ 1 servicio y 1 bomba multifásica en alarma» | «En riesgo · 0 equipos de alto impacto» · «ninguno» · «ninguna otra bomba ni electrosumergible avisa» · «+ 1 servicio en alarma» | cuenta, suma `bblDia` y busca «el primero» **solo** entre filas `en-riesgo` con `altoImpacto` (`:25`, `:29`, `:40-42`; antes contaba los siete y sumaba 5.561 bbl/d); sin ninguna, la frase del Resumen (`:44-45`); lo demás, en un renglón aparte que no se corta, con `otrosEnAlarma` (`:26`, `:46`, `aparte` en `:76`) |
| Paradas por identificar | ▲ «4» · «2 equipos detenidos: no arrancar hasta identificar el daño» | ▲ «3» · «2 equipos detenidos: …» | `contarPorIdentificar(usePreguntas(campos))` (`:20-21`), la misma cuenta de Turno, Mi trabajo, Identificar y Mantenimiento: la cifra es `porIdentificar`; ▲ 2 si alguna sigue sin arrancar (`porIdentificar − arrancaronSinIdentificar`), ■ 3 si todas arrancaron |

La Lectura dice «lo que se perdería por día si **paran**» (`:55`): los bbl/d se llaman «si para»; «si falla hoy» es el costo en bbl de Riesgo.
