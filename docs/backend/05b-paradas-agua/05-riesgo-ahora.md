# 5 · Lo que se pierde ahora y lo que está en riesgo

Dos funciones del servidor alimentan la pantalla **Riesgo** (`#/<rol>/riesgo/<campo>/<período>`), la entrega de **Turno**, la cabecera de cada campo y la ficha ejecutiva:

- `riesgoAhora(campos, ctx)` → `Riesgo[]` (`diferido.ts:418-518`) → `GET /api/vistas/riesgo?campos`.
- `estadoCampo(campo, ctx)` → `EstadoCampo` (`diferido.ts:553-569`) → `GET /api/vistas/estado?campos` (uno por campo, en el orden pedido).

Nada de esto sale de una tabla escrita: sale de los eventos abiertos de los controladores, las pruebas, el factor del mes, el vigía (salud por parte) y la historia de fallas. Cada campo se calcula independiente (ninguno mira a otro) y se memoriza por (contexto, campo).

## 5.1 La fila de riesgo (`Riesgo`)

| Campo | Significado | Unidad | En «perdiendo» | En «en riesgo» |
|---|---|---|---|---|
| `campoId`, `equipo`, `tipo` | Campo, equipo causante, tipo de causa | — | `causa.equipo`, `causa.tipo` | la bomba / el servicio / el pozo ESP |
| `estado` | `'perdiendo'` o `'en-riesgo'` | — | | |
| `prioridad` | Marca ISA-18.2 (1–3) | — | 1 si alto impacto, si no 2 | **la de la salud de la parte** (o la severidad del servicio) |
| `estadoParte` | `fuera` o `avisa` | — | — | de la peor parte |
| `bblDia` | Crudo por día | bbl/d | lo que se pierde ya | lo que se perdería si falla |
| `pozos` | Pozos | n | pozos parados por esa causa | pozos que cerraría |
| `desde` | Cuándo empezó la causa (ISO) | — | parada de la bomba o del servicio; si la causa es el propio pozo, el primer cierre | — |
| `cierreDesde` | Primer pozo cerrado (ISO) | — | sí | — |
| `parte` | Parte | `ParteId` | la de la causa | la peor parte |
| `horas`, `rango` | Horas hasta que la primera variable llegue a su alarma, y su rango | h | — | del vigía; ausente si ya llegó |
| `motivo` | Frase | texto | `causa.texto` | `motivoDeParte(sp)` o la lectura del servicio |
| `accion` | Qué hacer | texto | — | `parte.accion` o `intervencion.accionInmediata` |
| `tag` | Instrumento que avisa | — | — | |
| `costoFalla` | Barriles que cuesta una falla así | bbl | — | 5.3 |
| `mdtFuente` | Texto: de dónde sale ese tiempo fuera | texto | — | |
| `costoDe` | `'propio'` o `'flota'` | — | — | |
| `altoImpacto` | Si es de alto impacto | bool | `tipo ∈ {reinyeccion, electrosumergible}` | bomba no multifásica, o ESP |

Orden en la API: primero `perdiendo`, luego `en-riesgo`; dentro de cada uno, `bblDia` descendente (`diferido.ts:423`). La pantalla reordena «en riesgo» (5.5).

---

### 5.2 Perdiéndose ahora (filas `perdiendo`)

**Qué es.** El crudo de los pozos apagados (o frenados) **en este momento**, cada uno cargado al equipo que lo apagó.

**Fórmula** (`diferido.ts:441-459`). Para cada pozo $p$ del campo con evento abierto $e$ (`estadoAhora`), con causa $c = $ `causaDeEvento(e)`, se agrupa por la clave (`c.equipo`, `c.tipo`):

$$
\text{bblDia}_{k} = \sum_{p \in k} \text{crudoAsignado}(p) \cdot \begin{cases} f(hz_e, hz_{\text{prueba}}) & \text{si } p \text{ produce a frecuencia reducida} \\ 1 & \text{si está cerrado} \end{cases}
$$

$$
\text{crudoAsignado}(p) = c_{\text{prueba vigente}}(p) \cdot \text{FA}_{\text{mes}}
$$

`pozos` = número de pozos del grupo; `cierreDesde` = mínimo de `e.inicio`; `desde` = inicio de la parada de bomba o del servicio que es `c.evento` (`inicioDeCausa`, `diferido.ts:522-528`), o el mínimo `e.inicio` si la causa es el propio pozo; `parte` y `motivo` del **primer** pozo del grupo; `prioridad` = 1 si alto impacto, 2 si no.

**Ejemplo con los datos del demo** (portafolio, AHORA = 2-oct 14:00):

| Equipo · campo | Tipo | Pozos | bbl/d | Desde | Pozos cerrados desde | Motivo |
|---|---|---|---|---|---|---|
| P-201B · La Ceiba | reinyección | 17 | 11.058,9 | 2-oct 03:52 | 2-oct 08:07 | Se cerró porque la bomba de reinyección estaba parada y el tanque de agua lleno |
| MN-41 · Morichal | electrosumergible (aislamiento) | 1 | 684,1 | 3-sep 06:40 | 3-sep 06:40 | El variador disparó por falla a tierra |
| GU-07 · Guacamayo | electrosumergible (aislamiento) | 1 | 588,1 | 26-sep 02:04 | ídem | El variador disparó por falla a tierra |
| GU-09 · Guacamayo | electrosumergible (aislamiento) | 1 | 585,2 | 13-sep 17:23 | ídem | El variador disparó por desbalance de fases |
| LC-21 · La Ceiba | sin identificar | 1 | 300,8 | 1-oct 18:20 | ídem | Ninguna señal explica por qué paró: hay que identificarlo |

Total perdiéndose: **13.217,1 bbl/d** en 21 pozos (17 + 1 + 1 + 1 + 1).

**Qué texto se muestra según el valor** (Riesgo, `Riesgo.tsx:69-92`; Turno igual con «En el turno»):
- Marca: ◆ P1 si `altoImpacto`, ▲ P2 si no (la pantalla la deduce de `altoImpacto`, igual que el servidor).
- Renglón: **equipo** (+ « · <campo>» si el ámbito es el portafolio), chip con `TIPO_CAUSA[tipo]` en minúscula (tono fuerte si alto impacto), la parte en minúscula, «desde <fechaHora(desde)>»; a la derecha `n0(bblDia)` y «bbl/d · <plural(pozos, 'pozo', 'pozos')>».
- Globo (y papel): «Pozos parados» · «Perdiéndose <n0> bbl/d» · «Por hora <n0(bblDia/24)> bbl/h» · «Desde» · «Pozos cerrados desde» (solo si `cierreDesde − desde > 1 min`) · «Del potencial <n1> %» (solo nivel `decision`, sobre el potencial del ámbito).
- Ejemplo, P-201B: «P-201B · La Ceiba», chip «bomba de reinyección», «desde 2 de oct, 03:52», «**11.059** bbl/d · 17 pozos»; globo «Por hora 461 bbl/h», «Pozos cerrados desde 2 de oct, 08:07», «Del potencial 26,3 %» (portafolio) o 97,4 % (solo La Ceiba).
- `fechaHora`: «2 de oct, 03:52»; con otro año, «19 de oct de 2025, 02:02».

**Casos borde.** Un pozo sin prueba tiene crudo 0 (cuenta como pozo parado con 0 bbl/d). Un pozo a frecuencia reducida por causa propia no suma pozos parados en `EstadoCampo.parados` pero sí entra en «perdiendo» con su fracción. Sin factor medido en el campo, todo es 0.

---

### 5.3 En riesgo (filas `en-riesgo`)

**Qué es.** Equipos que **producen** pero tienen una parte que avisa: lo que se perdería por día si fallan, cuándo cruza la alarma, y lo que costaría una falla con el tiempo fuera que esos equipos suelen tener. Solo se vigilan las familias que el **perfil firmado del campo** tiene (`perfilDe(config, campo).bombas` y `.electrosumergibles`).

Tres fuentes, en este orden (`diferido.ts:466-515`):

**(a) Bombas de la línea en marcha con una parte que avisa.** Para cada bomba con perfil en el campo **sin parada abierta**: `sp` = la primera parte de `saludDePartes(perfil)` en estado `fuera` o `avisa` (la lista de salud ya viene ordenada por gravedad). Si hay:

| Campo de la fila | Valor |
|---|---|
| `bblDia` | `prediccion(p).crudoBpd` (cap. 4: en orden de cierre para disposición; el clúster para transporte; 0 para recobro) |
| `pozos` | `orden.pasos.length` (disposición) o `perfil.pozos.length` (transporte) o 0 |
| `horas`, `rango`, `tag` | de `sp.primera` (la variable que antes cruza); si no hay, el `tag` de `sp.fuera[0]` |
| `prioridad` | `sp.prioridad || 3` |
| `costoFalla` | `historial.bblPorFalla` (promedio de bbl de sus fallas **cerradas**, cap. 7) |
| `mdtFuente` | «el promedio de sus N fallas cerradas (el tanque absorbe una parte)» |
| `costoDe` | `'propio'` si hay `bblPorFalla` |
| `altoImpacto` | `subtipo !== 'multifasica'` |

**(b) Servicios del campo en alarma que cuelgan de todo el campo.** Cada equipo del catálogo que no es bomba, instrumentado en el campo, con severidad 1 o 2 y `aguasAbajo === 'todo el campo'`, y que no esté ya en la lista (p. ej. como «perdiendo»):

$$
\text{bblDia} = \sum_{p\ \text{produce}} \text{crudoAsignado}(p) \qquad \text{pozos} = \#\{p\ \text{produce}\}
$$

`prioridad` = severidad del equipo; `tipo` = `eq.servicio` (o `proceso`); `motivo` = «<nombre>: <estado>. <lectura>»; `accion` = `intervencion.accionInmediata`; sin `horas`, sin `costoFalla`, `altoImpacto: false`.

**(c) Electrosumergibles que producen con una parte que avisa.** Para cada pozo ESP que produce: `sp` = peor parte de `saludDeEsp(p)`. `bblDia = crudoAsignado(p)`, `pozos = 1`, `altoImpacto: true`, y:

$$
\text{MDT} = \begin{cases} \text{mdtH propio (fallas cerradas del pozo)} & \text{si existe} \\ \text{mdtEspDelCampo} & \text{si no} \end{cases}
\qquad
\text{costoFalla} = \text{crudoAsignado}(p) \cdot \frac{\text{MDT}}{24}
$$

$$
\text{mdtEspDelCampo} = \frac{1}{n} \sum_{\text{ESP del campo}}\ \sum_{\text{fallas cerradas, no disparos}} \text{horas}
$$

`mdtFuente`: «<round(mdtH/24)> días fuera, el promedio de sus N fallas cerradas» (propio) o «<round(mdt/24)> días fuera, el promedio de las electrosumergibles del campo (esta no ha fallado)» (flota). `costoDe` = `'propio'` / `'flota'`.

**Tiempo fuera promedio de la flota ESP** (`mdtEspDelCampo`, `diferido.ts:406-410`), con los datos del demo:

| Campo | Fallas cerradas de ESP (no disparos) | Horas de cada una | Promedio |
|---|---|---|---|
| Morichal | 9 | MN-01 460,6 · MN-05 394,4 · MN-06 692,7 · MN-08 489,8 · MN-11 692,8 · MN-16 362,1 · MN-17 387,7 · MN-23 442,8 · MN-24 454,3 | **486,34 h** (20,3 días) |
| Guacamayo | 5 | GU-02 782,7 · GU-05 821,6 · GU-06 290,6 · GU-08 449,8 · GU-11 735,8 | **616,10 h** (25,7 días) |
| La Ceiba | 4 | LC-05 296,0 · LC-09 815,3 · LC-12 378,4 · LC-16 755,6 | 561,30 h |

**Ejemplo con los datos del demo** (todas las filas en riesgo del portafolio):

| Equipo · campo | Tipo | Parte · estado | Prio | Cruza en (rango) | Si falla bbl/d | Pozos | Costo por falla | `costoDe` |
|---|---|---|---|---|---|---|---|---|
| K-101 · La Ceiba | aire | — | 1 | — (ya fuera) | 0 | 0 | — | — |
| MN-07 · Morichal | ESP | bomba · fuera | 2 | 3,79 h (3,64–3,96) | 606,5 | 1 | 606,532 × 486,339 / 24 = **12.290,8** | flota |
| MN-18 · Morichal | ESP | admision · fuera | 2 | 30,16 h (29,6–30,7) | 526,1 | 1 | **10.660,0** | flota |
| P-201B · Morichal | reinyección | succion · fuera | 2 | 43,09 h (41,3–45,0) | 1.670,7 | 4 | **3.364,6** (26.917,2 bbl / 8 fallas cerradas) | propio |
| GU-04 · Guacamayo | ESP | aislamiento · fuera | 2 | 61,08 h (60,3–61,9) | 647,2 | 1 | 647,226 × 616,103 / 24 = **16.614,9** | flota |
| MPP-301 · Morichal | transporte | filtro · fuera | 2 | 124,31 h (113,3–137,6) | 1.599,8 | 3 | **3.433,5** (24.034,6 / 7) | propio |
| MN-27 · Morichal | ESP | protector · fuera | 2 | 261,54 h (245,9–279,3) | 510,4 | 1 | **10.341,8** | flota |

Motivos (textuales): P-201B Morichal «Succión y filtro de entrada: presión de succión salió de su banda normal; llega a su alarma en 43 h» (tag `PI-2010`, acción «Limpiar el filtro o recuperar nivel en el tanque antes de que la bomba dispare por baja succión.»); MPP-301 «Filtro de entrada: caída de presión del filtro salió de su banda normal; llega a su alarma en 124 h» (`PDT-3011`); MN-07 «Bomba de fondo (eje y etapas): corriente del motor salió de su banda normal; llega a su alarma en 4 h»; K-101 «Sistema de aire de instrumentos: en marcha · degradado. La presión de cabezal cae hace 7 días. La norma exige recibidor de 5 a 30 min de autonomía: hoy quedan 11. Alimenta cinco sistemas.»

K-101 de La Ceiba entra por (b) con 0 bbl/d porque en La Ceiba **no produce ningún pozo**. SE-2 de Morichal (corriente de barraje subiendo) **no** entra: su severidad es 3 y (b) solo toma 1 o 2.

**Casos borde.**
- Bomba con parada abierta: nunca está «en riesgo» (ya está «perdiendo» o el tanque absorbe).
- Bomba de recobro con una parte que avisa: entra con `bblDia = 0`.
- Equipo sin historia: bomba sin fallas cerradas → sin `costoFalla` («sin historia»); ESP sin fallas propias **y** campo sin ninguna falla cerrada de ESP → sin `costoFalla`.
- La parte en `fuera` sin pronóstico de cruce (la variable ya está en alarma, o es un instrumento discreto): `horas` ausente → la pantalla dice «ya fuera».
- **La prioridad no se deduce de las horas** en el servidor (`prioridad` viaja hecha); Turno sí la sube a P2 si cruza dentro del turno (cap. 6).

---

### 5.4 El estado del campo (`EstadoCampo`)

**Qué es.** El resumen de un campo ahora. Lo pide la cabecera del campo, el riel lateral y Riesgo (para el potencial).

**Fórmulas** (`calcularEstado`, `diferido.ts:555-569`):

| Campo | Fórmula |
|---|---|
| `ayer` | `{ fecha, bbl }` del fiscal del último día completo del punto de medición oficial; `bbl: null` si el computador de flujo no lo reportó (`fiscalDeAyer`, `libro.ts:975`) |
| `potencialBpd` | $\sum_{p \in \text{campo}} \text{crudoAsignado}(p)$ (todos los pozos, produzcan o no) |
| `perdiendoBpd` | $\sum$ `bblDia` de las filas `perdiendo` |
| `perdiendoAltoBpd` | lo mismo, solo filas con `altoImpacto` |
| `pozos` | pozos del campo |
| `parados` | pozos con `estadoAhora(p).produce = false` (un `HZ` no cuenta) |
| `enRiesgo` | número de filas `en-riesgo` |
| `severidad` | 1 si hay alguna fila `perdiendo` de alto impacto; 2 si hay alguna `perdiendo`; 3 si hay alguna fila (en riesgo); 0 si nada |

**Ejemplo con los datos del demo.**

| Campo | Ayer (1-oct) | Potencial bbl/d | Perdiendo | De alto impacto | Pozos | Parados | En riesgo | Severidad |
|---|---|---|---|---|---|---|---|---|
| La Ceiba | 11.105 | 11.359,7 | 11.359,7 | 11.058,9 | 18 | 18 | 1 | 1 |
| Morichal | 16.685 | 17.604,1 | 684,1 | 684,1 | 41 | 1 | 5 | 1 |
| Guacamayo | 5.439 | 6.615,7 | 1.173,3 | 1.173,3 | 12 | 2 | 1 | 1 |
| Palmar | 3.186 | 3.276,9 | 0 | 0 | 7 | 0 | 0 | 0 |
| Zarza | 3.163 | 3.158,5 | 0 | 0 | 9 | 0 | 0 | 0 |

En La Ceiba el potencial es igual a lo que se pierde: los 18 pozos están cerrados (17 por P-201B y LC-21 sin identificar).

**Quién lo calcula y por dónde viaja.** Servidor, `GET /api/vistas/estado?campos` → `EstadoCampo[]` con `ayer.fecha` ISO. Caso de referencia: no tiene caso propio; `riesgo/*` cubre las filas.

---

### 5.5 La pantalla Riesgo

**Dónde.** `#/<rol>/riesgo/<campo|portafolio>/<período>` (el período no cambia nada: es «ahora»). Usa `useRiesgo(ids)` y `useEstadoCampos(ids)`.

**Cabecera** (`Riesgo.tsx:143-170`):

| Cifra | Fórmula | Formato |
|---|---|---|
| **Perdiéndose ahora** | $\sum$ `bblDia` de `perdiendo` | `n0` + «bbl/d»; ◆ P1 delante si alguna es de alto impacto |
| apoyo | `n1(porDia / potencial × 100)` « % del potencial · » `plural(Σ pozos, 'pozo parado', 'pozos parados')`; potencial = $\sum$ `EstadoCampo.potencialBpd` del ámbito (0 si no hay → «0,0 %») | |
| **En riesgo · N equipos** | $\sum$ `bblDia` de `en-riesgo` | `n0` + «bbl/d si fallan» |
| pie corto | sin filas: «nada en riesgo»; con costo > 0: «≈ <n0(Σ costoFalla)> bbl si fallan» + (« · N sin historia») + (« · sin N servicio(s)»); costo 0 y todas son servicios: «solo servicios del campo»; si no: «sin historia para estimar» | |
| ⓘ «Costo si fallan» | frase larga: «<n0> bbl si fallan con su tiempo fuera de siempre · N equipos sin historia para estimar · sin contar N servicio(s) del campo»; o «son servicios del campo: lo que cuesta su caída depende de cuánto dure»; o «— sin historia para estimar una falla» | |
| **El más cercano** | la primera fila de «en riesgo» ya ordenada (abajo): equipo (+ campo), nombre de la parte y «cruza en <fmtHoras>» o chip fuerte «ya fuera»; sin filas, «ninguno» | |

«Servicio» en la pantalla es lo que no es ESP ni bomba de la línea (`esServicio`, `Riesgo.tsx:219`). El costo de la cabecera es **exactamente** la suma de lo que dicen las filas.

**Orden de «en riesgo» en pantalla** (`Riesgo.tsx:31`): por `horas` ascendente, con `horas` ausente = −1 → **lo que ya está fuera va primero**.

**Fila «en riesgo»** (`Riesgo.tsx:94-139`): marca con `prioridad`; equipo (+ campo); chip con el tipo; parte en minúscula + chip `ESTADO_PARTE[estadoParte]` («fuera de banda» en tono fuerte, «avisa» neutro). Columna «cruza en»: `fmtHoras(horas)` o «ya fuera», y debajo el rango corto (`entre`: «41–45 h»; vacío si los dos extremos se escriben igual). Columna «si falla»: `n0(bblDia) bbl/d`, o «todo el campo» si es servicio con 0 bbl/d; debajo «≈ <n0(costoFalla)> bbl por falla», o nada (servicio), o «sin historia»; y «flota» (solo nivel `ingenieria`) si `costoDe = 'flota'`. Globo: «Parte», «Cruza su límite · en 43 h (41–45 h)» o «ya fuera», «Si falla» (servicio sin producción: «cierra lo que esté produciendo en el campo»), «Por falla ≈ N bbl»; pista = motivo (+ en ingeniería «Costo por falla: <mdtFuente>.»). Debajo, ⓘ «qué hacer» con `accion` (no en el nivel `decision`).

`fmtHoras` (sin «precisa»): < 48 h → entero + « h»; hasta 90 días → días con un decimal + « d»; más → «más de 3 meses».

**Ejemplo con los datos del demo.**

| Ámbito | Perdiéndose ahora | Apoyo | En riesgo | Pie corto | El más cercano |
|---|---|---|---|---|---|
| Portafolio | ◆ **13.217** bbl/d | 31,5 % del potencial · 21 pozos parados | 7 equipos · **5.561** bbl/d si fallan | «≈ 56.706 bbl si fallan · sin 1 servicio» | K-101 · La Ceiba · chip «ya fuera» |
| La Ceiba | ◆ **11.360** | 100,0 % · 18 pozos parados | 1 equipo · **0** | «solo servicios del campo» | K-101 · «ya fuera» |
| Morichal | ◆ **684** | 3,9 % · 1 pozo parado | 5 equipos · **4.913** | «≈ 40.091 bbl si fallan» | MN-07 · Bomba de fondo · cruza en 4 h |
| Guacamayo | ◆ **1.173** | 17,7 % · 2 pozos parados | 1 equipo · **647** | «≈ 16.615 bbl si fallan» | GU-04 · Aislamiento del motor y del cable · cruza en 2,5 d |

Orden de las filas del portafolio: K-101 (ya fuera) · MN-07 (4 h) · MN-18 (30 h · 30–31 h) · P-201B Morichal (43 h · 41–45 h) · GU-04 (2,5 d · 2,5–2,6 d) · MPP-301 (5,2 d · 4,7–5,7 d) · MN-27 (10,9 d · 10,2–11,6 d). Fila de K-101: ◆ «ya fuera», «si falla **todo el campo**», sin costo. Fila de P-201B Morichal: ▲ «succión y filtro de entrada» + «fuera de banda», «43 h» «41–45 h», «1.671 bbl/d», «≈ 3.365 bbl por falla». Fila de MN-07: ▲, «4 h» (sin rango: 3,64 y 3,96 se escriben los dos «4 h»), «607 bbl/d», «≈ 12.291 bbl por falla», «flota» en ingeniería.

**Ver más.** Se ven 5 filas y «ver N más»; una fila de prioridad 1 nunca se esconde (`listaCorta.ts:10-16`; en «perdiendo» la prioridad es 1 si alto impacto). En papel salen todas.

**Texto fijo de la pantalla** (Lectura): «Perdiéndose ahora es el crudo de los pozos que están apagados en este momento, cada uno cargado al equipo que lo apagó. En riesgo son las bombas de la línea y las electrosumergibles que producen pero tienen una parte que avisa…» (+ «En puntos de eficiencia: lo perdido sobre el potencial del campo.» en `decision`).

**Referencia.** `diferido.ts:363-569`, `pages/Riesgo.tsx`; casos `referencia/riesgo/{ceiba,morichal,guacamayo,palmar,zarza,portafolio}.json`.
