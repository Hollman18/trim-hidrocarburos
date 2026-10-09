# 6B.3 Pozos — producción, supervisor

**Para qué.** «Caudal de cada pozo, su origen y qué lo para.» (`PARA_QUE.pozos`, `src/widgets/Onboarding.tsx:20`).

**Ruta.** `#/<rol>/pozos/<campo>[~portafolio]/<período>`. Una fila abierta reemplaza la tabla por el detalle del pozo con «← Pozos» (estado de la pantalla, `src/pages/Pozos.tsx:38, 78-81`; el auditor abre la primera fila en `#/prod/pozos/ceiba/curso`, `ABRIR_FILA`, `e2e/auditoria/rutas.ts:34`). Con un pozo en la dirección (`…/curso/LC-21`) se abre la **ficha** del pozo encima (`PanelEquipo` → `DetallePozo` con «← Cerrar»): mismo contenido, más el bloque SAP si el pozo tiene electrosumergible.

**Roles y nivel.** `prod` → `ingenieria`; `sup` → `operacion`. (Ningún otro rol tiene la pantalla.)

**Lee.**

| Endpoint | Para qué |
|---|---|
| `GET /api/vistas/pozos?campos&desde&hasta` → `FilaPozo[]` | la tabla y la cabecera (`pedirFilasPozos`, `src/shared/api/diferidos.ts:279`) |
| `GET /api/vistas/pozos/:campo/:pozo?desde&hasta` → `DetallePozo \| null` | el detalle (`pedirPozo`, `diferidos.ts:298-310`) |
| configuración firmada (perfil del campo, ya cargada al arrancar) | si hay electrosumergibles en el alcance (`conEsp`, `Pozos.tsx:32-33`) |

`FilaPozo` (`src/shared/api/diferidos.ts:233-256`, una por pozo del campo, calculada «ahora» salvo lo del período):

| Campo | Qué es | Ficha |
|---|---|---|
| `pozo` | el registro del pozo (`id`, `campoId`, `levantamiento`, `controlador`, `alimentador`, `origen` de su prueba: `instrumento` / `estimado` / …, `pruebas[]`, `fuentePrueba`) | 5A §1 «La prueba de pozo» |
| `produce`, `hz`, `evento`, `causa` | estado ahora (`estadoAhora`) y la causa de su evento abierto (`causaDeEvento`) | 5B §1 «Estado del pozo ahora», 5B §2 |
| `crudoBpd` | prueba vigente × FA del mes (`crudoAsignado`) | 5A §2–3 |
| `aguaBpd` | agua de la prueba vigente (sin factor) | 5A §1 |
| `prueba`, `diasDesdePrueba` | la prueba vigente y su edad en días (`(AHORA − fecha)/1 d`) | — |
| `diferido`, `eventos`, `horasParado` | Σ bbl de sus tramos del período (sea cual sea la causa), número de tramos, Σ horas × factor | 5A §3 «Tramo» |
| `diferidoEsp` | solo lo de su propia electrosumergible | 6B.2 |
| `salud?` | `saludDeEsp(pozo)[0]`: la peor parte de su ESP | 5C §4 |

---

## La tabla

### Ingeniería (producción, La Ceiba)

![Pozos · producción · La Ceiba · octubre en curso](../img/prod-pozos-ceiba.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | «Pozos» | **15 de 18** | $N - \#\{\lnot\text{produce}\}$ de $N$ (`Pozos.tsx:47, 135`) | «a de N» | `produce` |
| 2 | Pie | «produciendo · 0 frenados» | frenados = producen con `hz` (frecuencia reducida) | `plural(n,'frenado','frenados')` | `hz` |
| 3 | «Potencial ahora» ⓘ | **11.360 bbl/d** | $\sum_p \text{crudoBpd}_p$ sobre **todos** los pozos (11.360,23); es el mismo `potencialBpd` del estado del campo (5B §5.4) | `n0` + « bbl/d»; ⓘ «La prueba vigente de cada pozo por el factor de asignación del mes.» | `crudoBpd` |
| 4 | «Perdiéndose ahora» | ◆ **1.966 bbl/d** (rojo) | $\sum$ `crudoBpd` de los pozos que **no producen** (`Pozos.tsx:50`): LC-16 869,00 + LC-07 796,18 (cerrados por P-201B) + LC-21 300,84 (sin identificar) = 1.966,03. **No** suma la fracción de los frenados (Riesgo sí la suma, 5B §5.2) | marca (`Pozos.tsx:66`): ◆ P1 y cifra roja si alguna causa es de alto impacto (`reinyeccion`, `electrosumergible`); ▲ P2 si no; sin marca con 0 | `crudoBpd`, `causa.tipo` |
| 5 | Pie | «3 pozos parados» | — | `plural(n,'pozo parado','pozos parados')`; con 0: «ninguno parado» | — |
| 6 | «Custodia completa» ⓘ (solo ingeniería) | **17 de 18** | pozos con prueba del separador = $N$ − sin prueba − estimados (`Pozos.tsx:83`) | ⓘ «Pozos con prueba del separador de prueba. Una estimada sale de la electrosumergible, no de un separador. Un pozo sin prueba no tiene a quién asignarle su crudo: sube el factor del campo y su diferido no se puede calcular.» | `pozo.origen`, `pozo.pruebas` |
| 7 | Pie | «1 estimada» | LC-17 (prueba estimada) | «N estimada(s)» · «N sin prueba»; si no hay ninguna de las dos: «todos con separador» (`Pozos.tsx:84-85`) | — |
| 8 | Filtro | «Parados o frenados · 3» | parados + frenados | botones con `aria-pressed`; el filtro filtra la misma lista | — |
| 9 | Filtro | «Electrosumergible con aviso · 0» | pozos que producen con `salud` en `fuera`/`avisa` | solo si hay ESP en el alcance (`conEsp`) | `salud.estado` |
| 10 | Filtro | «Sin custodia completa · 1» | sin prueba + estimados | solo ingeniería; filtra `origen ≠ instrumento` | `pozo.origen` |
| 11 | Pozo y marca | ▲ **LC-21** | `sevPozo` (`src/widgets/pozos/estado.ts:12-14`): parado por otro → 0 (gris); parado por causa propia de alto impacto → 1; parado por otra causa propia (aquí: sin identificar) → 2; frenado por sí → 3; produce con la ESP que avisa → la prioridad de la parte (o 3); si no, 0 | el id es un botón (teclado); el clic de la fila abre el detalle | `pozo.id`, `produce`, `causa`, `hz`, `salud` |
| 12 | Debajo del id | «Bombeo mecánico» | `LEVANTAMIENTO_NOMBRE`, salvo que la columna «Electrosumergible» ya lo diga (pozo ESP); en portafolio, el campo (`Pozos.tsx:93`) | — | `pozo.levantamiento` |
| 13 | «Ahora» | chip «sin identificar» | produce sin `hz` → «produciendo» gris; si no: «a N Hz · » (si frenado) + quién: «cerrado por <equipo>» si lo cerró otro (en el papel « · <tipo de causa>»); chip «sin identificar» si la causa es `pendiente`; si no `TIPO_CAUSA` en minúscula; sin causa «parado» (`Pozos.tsx:88-91, 108-113`) | globo: título `TIPO_CAUSA` (o «Evento abierto»), pista = `causa.texto`, filas «Se le carga a», «Código», «Señal»/«Otra señal» (las dos primeras evidencias) | `causa`, `evento.codigo`, `causa.evidencia` |
| 14 | Crudo bbl/d | 301 | `crudoBpd` = 314 × FA 0,958 = 300,84 | `n0`; **sin prueba: «—»** (no 0) | `crudoBpd` |
| 15 | Agua bbl/d | 1.532 | `aguaBpd` (LC-21 es de bombeo mecánico: 1.846 bbl/d de líquido, 83 % de agua) | `n0`; sin prueba «—» | `aguaBpd` |
| 16 | Prueba (solo ingeniería) | «10 d» | `diasDesdePrueba` = 10,29 | separador (`instrumento`) → «N d» (el lector oye «separador · N d»); `estimado` → chip «estimada · N d»; sin prueba vigente → chip fuerte «sin prueba» (`Pozos.tsx:119-124`) | `diasDesdePrueba`, `pozo.origen` |
| 17 | Electrosumergible | «—» | pozo sin ESP | solo con ESP en el alcance; parte en minúscula + chip `ESTADO_PARTE` si `fallo`/`fuera`/`avisa` (neutro en `avisa`); si no, el estado en gris («equipo detenido», «estable») (`Pozos.tsx:125-127`) | `salud` |
| 18 | Diferido bbl | **247** | `diferido`: Σ bbl de sus tramos del período, **sea cual sea la causa** (un pozo cerrado por la bomba aparece aquí, pero cuenta en la bomba en los Paretos) | `n0` | `diferido` |
| 19 | Pie | «1 evento» | `eventos` (tramos) | `plural(n,'evento','eventos')` | `eventos` |
| 20 | Otra fila | • «cerrado por P-201B» | `cerradoPorOtro`: causa con `equipo ≠ pozo` | gris, sin marca. Globo de «Ahora» (fila 13) de un pozo cerrado por la bomba, p. ej. LC-16: las dos primeras evidencias de la causa, sin repetir: «Señal» = «ZS-2011 · marcha → paro · 2 de oct, 03:52» (el paro de la bomba), «Otra señal» = «VSD-LC16 · código LSHH · 2 de oct, 05:43» (el cierre del pozo: lo disparó el nivel alto-alto del tanque); la tercera, el porqué de la bomba sin identificar («Sin primera alarma y sin firma: …», también en `causa.porQueNo`). Antes las dos primeras eran el mismo paro de la bomba (6B·H13, resuelto el 8-oct) | `causa.equipo`, `causa.evidencia[]` |
| 21 | Prueba estimada | chip «estimada · 5 d» | LC-17, `origen: estimado`, 4,96 d | — | — |
| 22 | ESP detenida | «equipo detenido» | con el pozo parado su ESP no se evalúa | — | `salud.estado` |
| 23 | «ver 13 más» | — | cinco a la vista; ningún pozo con marca **ni con salvedad** queda escondido (`Pozos.tsx:76`). Salvedad (`Pozos.tsx:64-65`): sin prueba, o (en ingeniería) prueba que no es del separador, o ESP produciendo sin dato. Orden (`Pozos.tsx:72`): marca (1, 2, 3, luego 0) → con salvedad primero → diferido descendente | en el papel salen todas (`Pozos.tsx:199`) | — |
| 24 | Las otras filas a la vista | «LC-17 · produciendo · 539 · 15.740 · estimada · 5 d · estable · 0 · 0 eventos»; «LC-16 · cerrado por P-201B · 869 · 25.289 · 26 d · equipo detenido · 300 · 1 evento»; «LC-07 · cerrado por P-201B · 796 · 23.221 · 32 d · equipo detenido · 273 · 1 evento»; «LC-05 · produciendo · 812 · 11.666 · 12 d · estable · 118 · 1 evento» | las reglas de las filas 11-22, fila por fila. Orden (fila 23): LC-21 (▲) primero, LC-17 (salvedad: prueba estimada) después, y el resto por diferido descendente (300, 273, 118). LC-05 produce: su evento es la caída de SE-2 del 1-oct, 09:16 (117,9 bbl, cargado a SE-2); LC-08, con 108,5 bbl de su parada del 1-oct, 22:15, sin identificar (6B.5 fila 15), queda tras «ver 13 más». La columna Diferido suma **todas** las causas (fila 18) | — | `FilaPozo[]` |

El encabezado del panel «POZOS» dice cuántas filas deja el filtro (18; con «Parados o frenados», 3).

### Operación (supervisor, La Ceiba)

![Pozos · supervisor · La Ceiba · octubre en curso](../img/sup-pozos-ceiba.png)

| # | Lo que cambia | En la captura | Regla |
|---|---|---|---|
| 1 | Tres cifras | «Pozos», «Potencial ahora», «Perdiéndose ahora 1.966 bbl/d» | sin «Custodia completa» (`Pozos.tsx:140`). Aserción `rutas.ts:66`: «Custodia» y «Sin custodia completa» no deben aparecer |
| 2 | Filtros | «Todos · Parados o frenados · 3 · Electrosumergible con aviso · 0» | sin el de custodia; si el rol cambia a uno de operación con el filtro de custodia puesto, se vuelve a «Todos» (`Pozos.tsx:58`) |
| 3 | Columnas | Pozo · Ahora · Crudo · Agua · **Electrosumergible** · Diferido | sin «Prueba» |
| 4 | Orden | LC-21, LC-16, LC-07, LC-05, **LC-08** | en operación la prueba estimada no es salvedad: LC-17 (0 bbl) baja a su lugar por diferido y queda tras «ver 13 más»; sube LC-08 (109 bbl) |
| 5 | Filas a la vista | «LC-16 · cerrado por P-201B · 869 · 25.289 · equipo detenido · 300 · 1 evento»; «LC-07 · cerrado por P-201B · 796 · 23.221 · equipo detenido · 273 · 1 evento»; «LC-05 · produciendo · 812 · 11.666 · estable · 118 · 1 evento»; «LC-08 · produciendo · 893 · 13.322 · estable · 109 · 1 evento» (y LC-21 como en ingeniería) | columnas Crudo · Agua · Electrosumergible · Diferido de 6B.3 filas 14-19, sin «Prueba» |

La Lectura es la misma para los dos niveles («El estado de cada pozo lo dice su controlador…», `Pozos.tsx:144-151`).

### Estados de la tabla

| Estado | Qué se ve |
|---|---|
| Pozo sin prueba | Crudo y Agua «—»; Prueba chip fuerte «sin prueba»; siempre a la vista (salvedad); su diferido es 0 con el tramo marcado `sinCustodia` (5A §3) |
| Pozo frenado (HZ) | «a 45,0 Hz · <causa>» en «Ahora»; marca ■ P3 si es causa propia; cuenta en «frenados» y en el filtro «Parados o frenados» |
| Campo sin ESP | sin filtro ni columna «Electrosumergible» (El Palmar, 6B.2) |
| Portafolio | el campo debajo de cada id; en el teléfono, « · <campo>» junto al id |
| Teléfono | una tarjeta por pozo: marca, id, «produciendo» o «a N Hz · <causa>», crudo bbl/d y «N bbl diferidos» (`Pozos.tsx:165-183`) |

---

## El detalle de un pozo (`DetallePozo`)

`src/widgets/pozos/DetallePozo.tsx`. Se ve desde Pozos (fila o dirección), desde Electrosumergibles (6B.2) y en la ficha de cualquier pozo (6B.4). `DetallePozo` (`src/shared/api/diferidos.ts:286-296`) trae `fila` (la `FilaPozo` del pozo), `tramos` (sus tramos del período, más reciente primero), `historicos` (todos sus eventos con causa), `senales` y `partes` (solo ESP) e `historial` (solo ESP). Un pozo que no existe en el campo responde `null` y la pantalla dice «No hay un pozo <id> en <campo>.» (`DetallePozo.tsx:43`).

### Un pozo parado sin causa identificada (LC-21, ficha, producción)

![Pozos · producción · ficha de LC-21](../img/prod-pozos-ficha-LC-21.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | Cabecera de la ficha | «LC-21» ▲ «P2 · ATENCIÓN» | severidad del pozo como equipo vivo (`src/entities/equipo-vivo.ts:56-57`, la misma regla que `sevPozo`) | `Severidad_` | `/vistas/equipos/ceiba/LC-21` → `severidad` |
| 2 | Sistema · campo · estado | «Pozos productores · La Ceiba · detenido · parada por orden» | `estado` = «detenido · <CODIGO[código]>» (`CMD` = «parada por orden») | ver 6B.2 fila 2 | `EquipoVivo.estado` |
| 3 | Identidad | «La Ceiba · Bombeo mecánico · POC-LC21 · alimentador SE-2» | campo · levantamiento · controlador · alimentador | — | `fila.pozo` |
| 4 | Chip | «parado» | `!produce` | «parado» fuerte / «a N Hz» / «produciendo»; en ingeniería, además «prueba estimada» (neutro) o «sin prueba» (fuerte) si la prueba no es del separador (`DetallePozo.tsx:75-78`) | `fila.produce/hz`, `pozo.origen` |
| 5 | Desde | «desde 1 de oct, 18:20 ·» | `fechaHora(evento.inicio)` | solo si hay evento abierto | `fila.evento.inicio` |
| 6 | Qué falta | chip «sin identificar» ⓘ | `estadoIdentificacion(causa, fin).pide` (5B §3.2): si lo cerró otro equipo, «parte por identificar»; si no, «sin identificar» (`DetallePozo.tsx:56-57`). Antes del chip, en negrita, «cerrado por <equipo>» o el tipo de causa (no con `pendiente`) y la parte | ⓘ «Por qué paró» (o «Por qué está frenado»): «Ninguna señal explica por qué paró: hay que identificarlo. Código CMD (parada por orden). Se le carga a LC-21 (sin identificar).» (`DetallePozo.tsx:89-90`) | `fila.causa`, `fila.evento` |
| 7 | «Crudo asignado» ⓘ | **301 bbl/d** | prueba vigente 314 × FA del mes 0,958 = 300,83 (5A §2) | ⓘ «Prueba vigente × factor de asignación del mes.»; sin prueba: «sin prueba» + ⓘ «No se le inventa caudal: sin prueba no hay de dónde sacarlo.» | `fila.crudoBpd` |
| 8 | «Agua» (solo ingeniería) | **1.532 bbl/d** | agua de la prueba vigente | `n0`; sin prueba «—» | `fila.aguaBpd` |
| 9 | Corte | «corte 83 %» | $\text{agua}/(\text{agua} + \text{crudo de la prueba}) = 1.532/(1.532+314) = 83{,}0\,\%$ (`DetallePozo.tsx:99`) | `n0` + « %»; vacío si crudo + agua = 0 | `aguaBpd`, `prueba.crudoBpd` |
| 10 | «Diferido · <período>» | **247 bbl** | Σ tramos del período (5A §3); el rótulo lleva el nombre del período en minúscula (la ficha tapa el selector de la cabecera) | `n0` + « bbl» | `fila.diferido` |
| 11 | Pie | «1 evento · 19,7 h equivalentes parado» | horas × factor: del 1-oct 18:20 a AHORA = 19,67 h | «N evento(s) · `fmtHoras(h, true)` equivalentes parado» | `fila.eventos/horasParado` |
| 12 | Franja | ▲ «No arrancar hasta identificar por qué paró.» + «Identificar» | `pide`, evento abierto, causa propia (`DetallePozo.tsx:111-118`); el botón solo con la pantalla `causa` en el rol | — | `fila.causa`, `fila.evento.fin` |
| 13 | Pruebas (solo ingeniería) | «PRUEBAS» · 5 · «Separador de prueba automatizado SP-CE1» ⓘ | la primera parte de `fuentePrueba` (hasta « · » o «: »); la ⓘ «De dónde sale la prueba» trae la frase entera («… · FT-CE1181 crudo · …») | extra = número de pruebas; sin pruebas: «sin custodia» y el hueco «**Sin prueba:** hay que probarlo.» + ⓘ «Su crudo llega al punto de medición oficial pero nadie lo asigna: sube el factor del campo y su diferido no se puede calcular.» | `pozo.pruebas`, `pozo.fuentePrueba` |
| 14 | Prueba vigente | «22 de sept» chip «vigente · 10 d» | la de `fila.prueba` | `fechaCorta`; otro año «09 de oct de 2025» | `prueba`, `diasDesdePrueba` |
| 15 | Corte de cada prueba | «83 %» | $n_0(\text{agua}/(\text{agua}+\text{crudo})\times100)$ por fila; columna «Hz» solo para electrosumergible (`n1`, «—» si no trae) | — | `pozo.pruebas[]` |
| 16 | Eventos | «EVENTOS» · «1 · octubre, en curso» | tramos del período; extra «N · <período>» o solo el período | «Ningún evento.» | `DetallePozo.tramos` |
| 17 | Un evento | «1 de oct, 18:20 · sigue · **CMD**» / chip «sin identificar» | la hora **del PLC** (`evento.inicio`), no la del tramo; «sigue» o la duración `fmtHoras(h, true)`; si el tramo está **recortado** al período (empieza después del evento o termina antes que él), se dice: « · N h en el período» (abierto: «sigue · N h en el período»); código; « a N Hz» si es HZ; debajo, en negrita, «por <equipo>» si lo cargó otro, o `TIPO_CAUSA`; la parte; el chip de identificación. LC-21 paró dentro del período: sin recorte. Con recorte, ver MN-41 (6B.2, fila 17: «25 de sept, 06:40 · sigue · 38,0 h en el período · GF») | globo (y papel): «<hora del PLC> · <tipo>», pista = `causa.texto`, filas «Se le carga a», «Cómo se identificó», «Código» y, si está recortado, «En el período · <inicio del tramo> · <horas>» (`DetallePozo.tsx:226-252`). Antes la fila escribía el inicio del tramo (6B·H11, resuelto el 8-oct) | `tramos[].inicio/horas/abierto`, `evento.inicio/fin` |
| 18 | Barriles del evento | **247 bbl** · «±15 %» | Σ del tramo (5A §3) | ingeniería: «±`n0(sesgo×100)` %»; «aproximado» (HZ) y «sin custodia» mandan; operación sin pie | `tramos[].bbl/sesgo` |
| 19 | Las otras pruebas | «12 de jul · 313 · 1.499 · 83 %»; «11 de abr · 314 · 1.473 · 82 %»; «9 de ene · 318 · 1.458 · 82 %»; «09 de oct de 2025 · 328 · 1.455 · 82 %» (y la vigente «22 de sept · 314 · 1.532 · 83 %», filas 14-15) | una fila por prueba de `pozo.pruebas`, de la más nueva a la más vieja; corte de la fila 15; sin columna Hz (bombeo mecánico) | fecha de otro año con el día en dos cifras (Huecos 14) | `pozo.pruebas[]` |

### Un pozo con electrosumergible cerrado por otro equipo (LC-16, `#/prod/pozos/morichal/curso/LC-16`)

![Pozos · producción · ficha de LC-16](../img/prod-pozos-ficha-LC-16.png)

La dirección pide Morichal, pero producción no tiene Morichal asignado (`prod`: La Ceiba y El Palmar): la dirección no abre un campo ajeno (`src/app/url.ts:66-73`) y la ficha se abre sobre **La Ceiba**, el LC-16 de La Ceiba. Es el caso de una ESP sana cerrada por la parada de P-201B: el primer pozo que cerró la parada del 2-oct, a las 05:43, cuando el tanque llegó al alto-alto y el LSHH lo disparó (es el que más agua da del campo, 25.289 bbl/d).

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | Severidad | «NORMAL» (gris) | cerrado por otro equipo → 0 (la alarma es de P-201B) | — | `EquipoVivo.severidad` |
| 2 | Estado | «Pozos productores · La Ceiba · cerrado por P-201B» | `estado` del pozo | — | `EquipoVivo.estado` |
| 3 | Quién | «desde 2 de oct, 05:43 · **cerrado por P-201B**» | causa con `equipo ≠ pozo` | — | `fila.causa.equipo` |
| 4 | Qué falta | chip «parte por identificar» ⓘ | la parada de P-201B pide respuesta: lo que falta es la **parte de la bomba**, no por qué paró el pozo | ⓘ «Se cerró porque la bomba de reinyección estaba parada y el tanque de agua lleno. Código LSHH (nivel muy alto del tanque de agua). Se le carga a P-201B (sin identificar).» (`DetallePozo.tsx:89-90`; `CODIGO.LSHH`, `src/entities/pozos.ts:54`) | `fila.causa`, `estadoIdentificacion` |
| 5 | Crudo asignado | **869 bbl/d** | 907 × 0,958 = 869,0 | — | `fila.crudoBpd` |
| 6 | Corte | «corte 97 %» | 25.289 / (25.289 + 907) = 96,5 % | — | — |
| 7 | Diferido | 300 bbl · «1 evento · 8,3 h equivalentes parado» | cerrado desde las 05:43 (el primero que cerró la parada) hasta AHORA: 8,28 h × 869,0 / 24 = 299,9 bbl | — | `fila` |
| 8 | Electrosumergible · 12 meses | «1 falla» · «6 disparos» | la falla de aislamiento de febrero (orden 40012012, fila 18) y 6 eventos propios de menos de 24 h | — | `historial` |
| 9 | Franja | «Vuelve cuando **P-201B** arranque.» | `pide`, abierto y **cerrado por otro** (`DetallePozo.tsx:122-127`): en vez de «No arrancar», a quién esperar | — | `fila.causa` |
| 10 | Botón | «Ver P-201B» | abre la ficha de P-201B (`abrirEquipo`) | — | — |
| 11 | Salud por parte | todas «equipo detenido»; Aislamiento «1 falla · 29.722 bbl» | historia de cada parte (fallas y disparos) | — | `partes`, `historial.porParte` |
| 12 | Señales | «sin lectura: motor parado» | ver 6B.2 | — | `senales` |
| 13 | Evento | «2 de oct, 05:43 · sigue · LSHH» / «**por P-201B**» chip «parte por identificar» · 300 bbl · ±15 % | tramo cargado a P-201B | — | `tramos[]` |
| 14 | SAP | «SAP · MANTENIMIENTO · equipo 10852028 · CO-CEI-BAT1-POZ-LC-16» ⓘ | identidad SAP (5D §6) | — | `/sap/equipos/LC-16?campo=ceiba` |
| 15 | Sin aviso | «Sin aviso ni orden abiertos.» | sin aviso ni orden abiertos y **sin** la capacidad `sap:aviso` (producción): solo la frase; con la capacidad, la frase y el botón «Enviar aviso a SAP» (6B.4) | — | `/sap/avisos`, `/sap/ordenes` |
| 16 | Repuesto en tránsito | «Cable de potencia y empalme · 0 en bodega (mín. 1) · llegan 2 el 20 de oct» | falta pero viene en camino: sin ■ | «llega/llegan N el <fecha>» | `repuestos[].enTransito` |
| 17 | Historial SAP (ingeniería) | «HISTORIAL SAP · 1 ORDEN» | órdenes del equipo, de la más reciente | «ORDEN»/«ÓRDENES» | `/sap/ordenes` |
| 18 | Una orden | «4 de feb **40012012** correctivo · Reparar aislamiento del motor y del cable de LC-16 cerrada · 8,0 h» | «<fechaCorta(creada)> <número> <clase> · <descripción> <estado> · <n1(horas reales)> h» (las horas llevan «confirmadas» solo para el lector de pantalla, `BloqueSap.tsx:62`) | cinco y «ver N más» | `OrdenSap` |
| 19 | Identidad | «La Ceiba · Electrosumergible · VSD-LC16 · alimentador SE-2» | como LC-21 (fila 3) | — | `fila.pozo` |
| 20 | Historia de cada parte | Aislamiento «1 falla · 29.722 bbl», Bomba de fondo «0 fallas · 83 bbl», Admisión «0 fallas · 523 bbl» (Protector y Motor de fondo, sin historia) | `historial.porParte`: aislamiento 1 falla, 0 disparos, 29.722 bbl; admisión 5 disparos, 522,8 bbl; bomba 1 disparo, 82,9 bbl; $5 + 1 = 6$ disparos (fila 8) | «N falla(s) · N bbl», sin `plural` | `historial.porParte[]` |
| 21 | Bandas de las señales | Corriente «VSD-LC16 · variador del pozo · 0,0 A · normal 179,4 – 236,3 · alarma 137,0 y 264,0»; Frecuencia «0,0 Hz · normal 55,5 – 57,5»; Presión de entrada «PIT-LC16 · sensor de fondo · sin señal · normal 310,1 – 531,6 · alarma 155,0»; Temperatura «TIT-LC16 · sin señal · normal 92,0 – 135,0 · alarma 150,0»; Desbalance «sin señal · normal 0,0 – 5,0 · alarma 10,0» | 5C §4 «Banda y alarma de la ESP» con $I_0 = 211$ A (≈ 8,5 A por cada 1.000 bbl/d de líquido: $(907 + 25.289)/1.000 \times 8{,}5 = 222{,}7$, con el ±10 % del pozo; `src/entities/esp.ts:62-67`), $f = 56{,}5$ Hz, $P_0 = 443$ psi, $T_0 = 102$ °C: $[0{,}85I_0;\ 1{,}12I_0] = [179{,}4;\ 236{,}3]$, alarmas $\text{round}(0{,}65I_0) = 137$ y $\text{round}(1{,}25I_0) = 264$; $[f-1;\ f+1]$; $[0{,}7P_0;\ 1{,}2P_0]$, alarma $\text{round}(0{,}35P_0) = 155$; $[T_0 - 10;\ 135]$ | con el motor parado: 0 y «sin señal» (fila 12); la frecuencia con los decimales de su serie (56,5 → un decimal) | `senales[]` |
| 22 | PRUEBAS | «PRUEBAS · 5» · «Separador de prueba automatizado SP-CE1»; «6 de sept · vigente · 26 d · 907 · 25.289 · 97 % · 56,5»; «10 de jul · 926 · 24.652 · 96 % · 56,5»; «9 de abr · 929 · 24.225 · 96 % · 56,5»; «8 de ene · 924 · 23.840 · 96 % · 56,5»; «09 de oct de 2025 · 952 · 23.700 · 96 % · 56,5» | como LC-21 (filas 13-15) más la columna Hz (`n1`) por ser electrosumergible; la vigente da el crudo de la fila 5 (907 × 0,958) | | `pozo.pruebas[]` |
| 23 | Otro repuesto | «Bomba electrosumergible (etapas) · 1 en bodega (mín. 1)» | stock = mínimo → sin marca (5D §6 «Repuestos críticos») | | `repuestos[]` |

### Variantes del detalle

| Nivel | Qué ve |
|---|---|
| `ingenieria` (producción, jefe, confiabilidad) | Agua y corte, «Electrosumergible · N meses», chips de prueba estimada / sin prueba, «SALUD POR PARTE» (`BloqueParte`, 6B.1), «SEÑALES DEL POZO» (todas), «PRUEBAS», «±N %» en cada evento |
| `operacion` (supervisor; y desde Electrosumergibles, operador y técnico) | sin Agua, sin ESP · N meses, sin PRUEBAS; «PARTES QUE AVISAN» (solo `fallo`/`fuera`/`avisa`, con la frase corta, globo con la frase larga y ⓘ «qué hacer»; «Ninguna parte avisa.»); «FUERA DE BANDA» (señales en aviso, atención o alarma) y «SIN SEÑAL · con el pozo produciendo» (un instrumento sin lectura viaja con `valor: null` y estado «sin señal»: es un dato inválido, ISA-101, y se dice «sin señal» en magenta, nunca 0 ni «—»); con el pozo parado la falta de lectura es lo esperado y no se repite (`src/widgets/pozos/estado.ts:28-33`) |

**Estados.** Pozo produciendo sin evento: sin la línea «desde …» ni franjas. Pozo frenado por causa propia: chip «a N Hz», ⓘ «Por qué está frenado». Evento cerrado que pide respuesta (arrancó sin identificar): no hay franja «No arrancar» (`!f.evento?.fin`), pero el chip del evento sigue. Pozo sin prueba: «sin prueba» en vez del crudo, «—» en el agua, «sin custodia» en PRUEBAS.

**Interacciones.** «← Pozos»/«← Electrosumergibles»/«← Cerrar»; «Identificar» → pantalla de causa; «Ver <equipo>» → ficha del equipo que lo cerró; globos de cada evento (en el papel, escritos).
