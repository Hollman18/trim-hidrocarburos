# 5 · Lo que se pierde ahora y lo que está en riesgo

Dos funciones del servidor alimentan la pantalla **Riesgo** (`#/<rol>/riesgo/<campo>/<período>`), la entrega de **Turno**, la cabecera de cada campo y la ficha ejecutiva:

- `riesgoAhora(campos, ctx)` → `Riesgo[]` (`diferido.ts:519-618`) → `GET /api/vistas/riesgo?campos`.
- `estadoCampo(campo, ctx)` → `EstadoCampo` (`diferido.ts:653-669`) → `GET /api/vistas/estado?campos` (uno por campo, en el orden pedido).

Nada de esto sale de una tabla escrita: sale de los eventos abiertos de los controladores, las pruebas, el factor del mes, el vigía (salud por parte) y la historia de fallas. Cada campo se calcula independiente (ninguno mira a otro) y se memoriza por (contexto, campo).

## 5.1 La fila de riesgo (`Riesgo`)

| Campo | Significado | Unidad | En «perdiendo» | En «en riesgo» |
|---|---|---|---|---|
| `campoId`, `equipo`, `tipo` | Campo, equipo causante, tipo de causa | — | `causa.equipo`, `causa.tipo` | la bomba / el servicio / el pozo ESP |
| `estado` | `'perdiendo'` o `'en-riesgo'` | — | | |
| `prioridad` | Marca ISA-18.2 (1–3) | — | 1 si alto impacto, si no 2 | **la de la salud de la parte** (o la severidad del servicio) |
| `estadoParte` | `fuera` o `avisa` | — | — | de la peor parte |
| `bblDia` | Crudo por día | bbl/d | lo que se pierde ya | lo que se perdería por día si para («si para», «en juego») |
| `pozos` | Pozos | n | pozos parados por esa causa | pozos que cerraría |
| `desde` | Cuándo empezó la causa (ISO) | — | parada de la bomba o del servicio; si la causa es el propio pozo, el primer cierre | — |
| `cierreDesde` | Primer pozo cerrado (ISO) | — | sí | — |
| `parte` | Parte | `ParteId` | la de la causa | la peor parte |
| `horas`, `rango` | Horas hasta que la primera variable llegue a su alarma, y su rango | h | — | del vigía; ausente si ya llegó |
| `motivo` | Frase | texto | `causa.texto` | `motivoDeParte(sp)` o la lectura del servicio |
| `accion` | Qué hacer | texto | — | `parte.accion` o `intervencion.accionInmediata` |
| `tag` | Instrumento que avisa | — | — | |
| `costoFalla` | Barriles que costaría que el equipo fallara **hoy** («si falla hoy»); ausente si no hay historia con que estimarlo | bbl | — | 5.3, «Si falla hoy» |
| `colchonH` | Solo bomba de disposición con tanque: horas que aguanta hoy el tanque si para (una reparación más corta no cuesta crudo) | h | — | 5.3, «Si falla hoy» |
| `mdtFuente` | Texto: de dónde sale `costoFalla` (solo para leer) | texto | — | |
| `costoDe` | `'propio'` o `'flota'`; ausente si `costoFalla` es 0 por definición | — | — | |
| `altoImpacto` | Si es de alto impacto | bool | `tipo ∈ {reinyeccion, electrosumergible}` | bomba no multifásica, o ESP |

Orden en la API: primero `perdiendo`, luego `en-riesgo`; dentro de cada uno, `bblDia` descendente (`diferido.ts:524`). La pantalla reordena «en riesgo» (5.5).

---

### 5.2 Perdiéndose ahora (filas `perdiendo`)

**Qué es.** El crudo de los pozos apagados (o frenados) **en este momento**, cada uno cargado al equipo que lo apagó.

**Fórmula** (`diferido.ts:542-560`). Para cada pozo $p$ del campo con evento abierto $e$ (`estadoAhora`), con causa $c = $ `causaDeEvento(e)`, se agrupa por la clave (`c.equipo`, `c.tipo`):

$$
\text{bblDia}_{k} = \sum_{p \in k} \text{crudoAsignado}(p) \cdot \begin{cases} f(hz_e, hz_{\text{prueba}}) & \text{si } p \text{ produce a frecuencia reducida} \\ 1 & \text{si está cerrado} \end{cases}
$$

$$
\text{crudoAsignado}(p) = c_{\text{prueba vigente}}(p) \cdot \text{FA}_{\text{mes}}
$$

`pozos` = número de pozos del grupo; `cierreDesde` = mínimo de `e.inicio`; `desde` = inicio de la parada de bomba o del servicio que es `c.evento` (`inicioDeCausa`, `diferido.ts:622-628`), o el mínimo `e.inicio` si la causa es el propio pozo; `parte` y `motivo` del **primer** pozo del grupo; `prioridad` = 1 si alto impacto, 2 si no.

**Ejemplo con los datos del demo** (portafolio, AHORA = 2-oct 14:00):

| Equipo · campo | Tipo | Pozos | bbl/d | Desde | Pozos cerrados desde | Motivo |
|---|---|---|---|---|---|---|
| P-201B · La Ceiba | reinyección | 17 | 11.058,9 | 2-oct 03:52 | 2-oct 08:07 | Se cerró porque la bomba de reinyección estaba parada y el tanque de agua lleno |
| MN-41 · Morichal | electrosumergible (aislamiento) | 1 | 684,1 | 3-sep 06:40 | 3-sep 06:40 | El variador disparó por falla a tierra |
| GU-07 · Guacamayo | electrosumergible (aislamiento) | 1 | 588,1 | 26-sep 02:04 | ídem | El variador disparó por falla a tierra |
| GU-09 · Guacamayo | electrosumergible (aislamiento) | 1 | 585,2 | 13-sep 17:23 | ídem | El variador disparó por desbalance de fases |
| LC-21 · La Ceiba | sin identificar | 1 | 300,8 | 1-oct 18:20 | ídem | Ninguna señal explica por qué paró: hay que identificarlo |

Total perdiéndose: **13.217,1 bbl/d** en 21 pozos (17 + 1 + 1 + 1 + 1).

**Qué texto se muestra según el valor** (Riesgo, `Riesgo.tsx:74-97`; Turno igual con «En el turno»):
- Marca: ◆ P1 si `altoImpacto`, ▲ P2 si no (la pantalla la deduce de `altoImpacto`, igual que el servidor).
- Renglón: **equipo** (+ « · <campo>» si el ámbito es el portafolio), chip con `TIPO_CAUSA[tipo]` en minúscula (tono fuerte si alto impacto), la parte en minúscula, «desde <fechaHora(desde)>»; a la derecha `n0(bblDia)` y «bbl/d · <plural(pozos, 'pozo', 'pozos')>».
- Globo (y papel): «Pozos parados» · «Perdiéndose <n0> bbl/d» · «Por hora <n0(bblDia/24)> bbl/h» · «Desde» · «Pozos cerrados desde» (solo si `cierreDesde − desde > 1 min`) · «Del potencial <n1> %» (solo nivel `decision`, sobre el potencial del ámbito).
- Ejemplo, P-201B: «P-201B · La Ceiba», chip «bomba de reinyección», «desde 2 de oct, 03:52», «**11.059** bbl/d · 17 pozos»; globo «Por hora 461 bbl/h», «Pozos cerrados desde 2 de oct, 08:07», «Del potencial 26,3 %» (portafolio) o 97,4 % (solo La Ceiba).
- `fechaHora`: «2 de oct, 03:52»; con otro año, «19 de oct de 2025, 02:02».

**Casos borde.** Un pozo sin prueba tiene crudo 0 (cuenta como pozo parado con 0 bbl/d). Un pozo a frecuencia reducida por causa propia no suma pozos parados en `EstadoCampo.parados` pero sí entra en «perdiendo» con su fracción. Sin factor medido en el campo, todo es 0.

---

### 5.3 En riesgo (filas `en-riesgo`)

**Qué es.** Equipos que **producen** pero tienen una parte que avisa: lo que se perdería por día si paran («si para»), cuándo cruza la alarma, y lo que costaría que fallaran **hoy** («si falla hoy», abajo). Solo se vigilan las familias que el **perfil firmado del campo** tiene (`perfilDe(config, campo).bombas` y `.electrosumergibles`).

Tres fuentes, en este orden (`diferido.ts:567-615`):

**(a) Bombas de la línea en marcha con una parte que avisa** (`diferido.ts:568-583`). Para cada bomba con perfil en el campo **sin parada abierta**: `sp` = la primera parte de `saludDePartes(perfil)` en estado `fuera` o `avisa` (la lista de salud ya viene ordenada por gravedad). Si hay:

| Campo de la fila | Valor |
|---|---|
| `bblDia` | `prediccion(p).crudoBpd` (cap. 4: en orden de cierre para disposición; el clúster para transporte; 0 para recobro) |
| `pozos` | `orden.pasos.length` (disposición) o `perfil.pozos.length` (transporte) o 0 |
| `horas`, `rango`, `tag` | de `sp.primera` (la variable que antes cruza); si no hay, el `tag` de `sp.fuera[0]` |
| `prioridad` | `sp.prioridad || 3` |
| `costoFalla`, `colchonH`, `mdtFuente`, `costoDe` | `costoDeBomba(p, prediccion(p), historialDeEquipo(p))` (`diferido.ts:498-513`): «Si falla hoy», abajo |
| `altoImpacto` | `subtipo !== 'multifasica'` |

**(b) Servicios del campo en alarma que cuelgan de todo el campo** (`diferido.ts:586-594`). Cada equipo del catálogo que no es bomba, instrumentado en el campo, con severidad 1 o 2 y `aguasAbajo === 'todo el campo'`, y que no esté ya en la lista (p. ej. como «perdiendo»):

$$
\text{bblDia} = \sum_{p\ \text{produce}} \text{crudoAsignado}(p) \qquad \text{pozos} = \#\{p\ \text{produce}\}
$$

`prioridad` = severidad del equipo; `tipo` = `eq.servicio` (o `proceso`); `motivo` = «<nombre>: <estado>. <lectura>»; `accion` = `intervencion.accionInmediata`; sin `horas`, sin `costoFalla` (lo que cuesta la caída de un servicio depende de cuánto dure), `altoImpacto: false`.

**(c) Electrosumergibles que producen con una parte que avisa** (`diferido.ts:597-615`). Para cada pozo ESP que produce: `sp` = peor parte de `saludDeEsp(p, ctx)`. `bblDia = crudoAsignado(p)`, `pozos = 1`, `altoImpacto: true`, y `costoFalla` con la cuenta de «Si falla hoy» (su crudo de hoy por sus horas fuera; sin fallas propias, las de su flota en el campo).

**Tiempo fuera promedio de la flota ESP** (`mdtEspDelCampo`, `diferido.ts:478-482`), con los datos del demo:

$$
\text{mdtEspDelCampo} = \frac{1}{n} \sum_{\text{ESP del campo}}\ \sum_{\text{fallas cerradas, no disparos}} \text{horas}
$$

| Campo | Fallas cerradas de ESP (no disparos) | Horas de cada una | Promedio |
|---|---|---|---|
| Morichal | 9 | MN-01 460,6 · MN-05 394,4 · MN-06 692,7 · MN-08 489,8 · MN-11 692,8 · MN-16 362,1 · MN-17 387,7 · MN-23 442,8 · MN-24 454,3 | **486,34 h** (20,3 días) |
| Guacamayo | 5 | GU-02 782,7 · GU-05 821,6 · GU-06 290,6 · GU-08 449,8 · GU-11 735,8 | **616,10 h** (25,7 días) |
| La Ceiba | 4 | LC-05 296,0 · LC-09 815,3 · LC-12 378,4 · LC-16 755,6 | 561,30 h |

---

#### Si falla hoy (`costoFalla`, `colchonH`)

**Qué es.** Los barriles que costaría que el equipo fallara **hoy**: el crudo que se pierde por día si para hoy, por las horas que suelen durar sus fallas, **sin las horas que aguanta hoy el tanque** (una bomba de disposición). Es la decisión del dueño del producto del 8-oct-2026 (cap. 10, D3): una sola cuenta para todas las familias, así las filas se pueden sumar (la «exposición» de la cabecera). No es lo que el equipo **ya costó** por falla (`HistorialEquipo.bblPorFalla`, cap. 7: «le ha costado por falla»).

**Dónde se ve.** Riesgo, fila «en riesgo», debajo de la cifra «si para»: «≈ 2.086 bbl si falla hoy», con tanque «0 si vuelve antes de 19 h», y «flota» (solo ingeniería) si se estimó con la flota; ⓘ «si falla hoy» con el `mdtFuente`; globo «Si falla hoy · ≈ 2.086 bbl»; la cabecera los suma: «≈ 55.238 bbl de exposición» (5.5). Mantenimiento, ATACAR AHORA, con las mismas palabras en el mismo orden (cap. 6C).

**Fórmula** (`costoDeBomba`, `diferido.ts:498-513`; electrosumergible, `diferido.ts:603-612`). Con $d_i$ = horas de cada falla **cerrada** del equipo (sin disparos), $\bar d$ su promedio, $n$ cuántas son:

$$
\text{costoFalla} =
\begin{cases}
Q_{\text{hoy}} \cdot \dfrac{1}{n}\displaystyle\sum_{i=1}^{n} \max\!\left(0,\ d_i - h_{\text{hoy}}\right) \Big/ 24 & \text{disposición con tanque} \quad (\text{colchonH} = h_{\text{hoy}}) \\[2ex]
Q_{\text{hoy}} \cdot \bar d / 24 & \text{disposición sin colchón calculado (sin tanque o sin nivel): un techo} \\[1ex]
0 & \text{recobro, o respaldo que absorbe toda el agua } (Q_{\text{sin salida}} \le 0) \\[1ex]
Q_{\text{hoy}} \cdot \bar d / 24 & \text{multifásica (no tiene tanque)} \\[1ex]
Q_{\text{pozo hoy}} \cdot \bar d / 24 & \text{electrosumergible; sin fallas propias, } \bar d = \text{mdtEspDelCampo} \ (\text{costoDe} = \text{flota}) \\[1ex]
\text{ausente} & \text{sin fallas cerradas propias (ni flota, en una electrosumergible)}
\end{cases}
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $Q_{\text{hoy}}$ | crudo por día que se pierde si la bomba para hoy | bbl/d | `prediccion(p).crudoBpd` (cap. 4: en el orden de cierre) |
| $Q_{\text{pozo hoy}}$ | crudo asignado del pozo hoy | bbl/d | `crudoAsignado(p)` = prueba vigente × FA |
| $d_i$ | horas fuera de cada falla cerrada (la abierta no entra; los disparos tampoco) | h | `historialDeEquipo(...).eventos` con `fin` y sin `disparo` (cap. 7) |
| $h_{\text{hoy}}$ | colchón de hoy: lo que aguanta el tanque si la bomba para ahora | h | `prediccion(p).colchon.horas` (cap. 4); 0 si ya está en el alto-alto |
| 24 | horas por día | h/d | — |

Por qué $\max(0, d_i - h)$: mientras la bomba esté parada menos que el colchón, el tanque absorbe el agua y no se cierra ningún pozo; solo las horas que pasan del colchón cuestan crudo. Una falla más corta que el colchón de hoy cuesta 0.

`mdtFuente` (texto, `diferido.ts:503-512`): «el promedio de sus N fallas cerradas» (`su falla cerrada` si es una) y, en disposición con tanque, «…, sin las <`textoHoras(h, true)`> que aguanta hoy el tanque» (las horas **truncadas**: 19,05 h → «19 h», 18,6 h → «18 h», nunca redondeadas hacia arriba); con el tanque ya en el alto-alto, «…; el tanque ya está en el alto-alto, no aguanta nada»; sin colchón calculado, «…, sin descontar el tanque (no hay colchón calculado): es un techo». Recobro: «una bomba de recobro no cierra pozos hoy»; respaldo total: «el respaldo absorbe toda el agua: parar no cierra pozos». Electrosumergible: «<`textoHoras(mdtH)`> fuera, el promedio de sus N fallas cerradas» o «<`textoHoras(mdt)`> fuera, el promedio de las electrosumergibles del campo (esta no ha fallado)».

**Ejemplo con los datos del demo — P-201B de Morichal** (disposición, con tanque y respaldo P-201A de 15.100 bbl/d).
1. $Q_{\text{hoy}}$ = **1.670,662 bbl/d** (cap. 4: cierra MN-27, MN-36, MN-13 y MN-39 al 78 %); $h_{\text{hoy}}$ = **19,0499 h** (cap. 4: 5.076 bbl libres / 266,46 bbl/h).
2. Sus 8 fallas cerradas: $d$ = 86,03 · 50,48 · 60,09 · 39,84 · 49,58 · 3,67 · 20,36 · 66,71 h ($\bar d$ = 47,094 h).
3. $\max(0, d_i - 19{,}05)$ = 66,98 · 31,43 · 41,04 · 20,79 · 30,53 · **0** · 1,31 · 47,66 h; promedio **29,967 h**. La falla de 3,67 h (`EV-M2011-260103`, succión) hoy no costaría nada: el tanque la aguanta.
4. $\text{costoFalla} = 1.670{,}662 \times 29{,}967 / 24 = $ **2.086,0 bbl** → «≈ 2.086 bbl si falla hoy»; `colchonH` = 19,05 → «0 si vuelve antes de 19 h»; `mdtFuente` «el promedio de sus 8 fallas cerradas, sin las 19 h que aguanta hoy el tanque»; `costoDe: 'propio'`.
5. Sin descontar el colchón daría $1.670{,}662 \times 47{,}094 / 24 = 3.278{,}3$ bbl (el «de hoy» sin tanque que se preguntaba en «Huecos», 28). Lo que **le ha costado** por falla (histórico) es otra cifra: 26.917,2 / 8 = **3.364,6 bbl** («le ha costado 3.365 bbl por falla», cap. 7).

**MPP-301 de Morichal** (multifásica, sin tanque): $Q_{\text{hoy}}$ = 1.599,752 bbl/d (el clúster MN-07, MN-18, MN-33); 7 fallas cerradas, $d$ = 45,40 · 72,64 · 10,54 · 40,72 · 26,37 · 69,75 · 75,31 h, $\bar d$ = 48,676 h → $1.599{,}752 \times 48{,}676 / 24 = $ **3.244,5 bbl** («≈ 3.245 bbl si falla hoy»; `mdtFuente` «el promedio de sus 7 fallas cerradas»). Le ha costado 3.433,5 bbl por falla.

**Electrosumergibles** (ninguna en riesgo tiene fallas propias: todas `flota`): MN-07 $606{,}532 \times 486{,}339 / 24 = $ **12.290,8**; MN-18 $526{,}054 \times 486{,}339/24 = $ **10.660,0**; MN-27 $510{,}350 \times 486{,}339/24 = $ **10.341,8**; GU-04 $647{,}226 \times 616{,}103 / 24 = $ **16.614,9**. `mdtFuente` «20,3 d fuera, el promedio de las electrosumergibles del campo (esta no ha fallado)» (Guacamayo: «25,7 d fuera, …»).

**Casos que el demo no tiene en riesgo, corridos con el motor** (`verificar-libro` §18):
- **Recobro**, P-201B de Guacamayo con su predicción y su historia reales (5 fallas cerradas, $\bar d$ = 41,03 h): `costoFalla: 0`, sin `costoDe` ni `colchonH`, «una bomba de recobro no cierra pozos hoy». En pantalla, «≈ 0 bbl si falla hoy».
- **Respaldo que absorbe toda el agua** (Morichal con el respaldo de P-201B a $10^6$ bbl/d): `costoFalla: 0`, «el respaldo absorbe toda el agua: parar no cierra pozos». Un 0 por definición cuenta como cifra en la exposición.
- **Sin tanque firmado** (Morichal sin tanques): $1.670{,}662 \times 47{,}094 / 24 \approx$ **3.278 bbl**, «…, sin descontar el tanque (no hay colchón calculado): es un techo»; sin `colchonH`.
- **Sin historia** (MPP-301 sin paradas; las electrosumergibles de Guacamayo sin fallas propias ni de su flota): `costoFalla` **ausente**, no 0 → «sin historia» y fuera de la exposición.

**Casos borde.**

| Caso | `costoFalla` | `colchonH` | Pantalla |
|---|---|---|---|
| Tanque ya en el alto-alto ($h = 0$) | $Q \cdot \bar d / 24$ | 0 | «≈ N bbl si falla hoy», sin «0 si vuelve…» (menos de 1 h no se dice) |
| Colchón de más de 90 días | $Q \cdot \text{prom}(\max(0, d_i - h))/24$ (casi siempre 0) | $h$ | sin «0 si vuelve…» (`colchonCorto` solo con $1 \le h \le 2.160$ h) |
| Colchón infinito (respaldo total) | 0 | ausente | «≈ 0 bbl si falla hoy» |
| Una sola falla cerrada | con esa | — | `mdtFuente` «el promedio de su falla cerrada» |
| Solo la falla abierta | ausente (la abierta no entra en $d_i$; y una bomba parada no está «en riesgo») | — | — |
| Disparos de una electrosumergible | no entran en $d_i$ | — | — |

**Qué texto se muestra según el valor** (`src/shared/ui/costoHoy.ts:15-36`, la misma forma en Riesgo y en Mantenimiento):
- `costoHoy(r)`: «≈ <`n0(costoFalla)`> bbl si falla hoy»; sin `costoFalla`, nada (Riesgo escribe entonces «sin historia», o nada si es un servicio).
- `colchonCorto(r)`: solo con `costoFalla` y $1 \le$ `colchonH` $\le$ 2.160 h: «0 si vuelve antes de <`textoHoras(colchonH, true)`>» (espacios duros en «antes de 19 h» para que la «h» no quede sola en la columna angosta).
- `detalleCostoHoy(r)` (el ⓘ «si falla hoy»): `mdtFuente` con mayúscula inicial y punto, más « Una reparación más corta no cuesta crudo.» si hay `colchonCorto`. P-201B de Morichal: «El promedio de sus 8 fallas cerradas, sin las 19 h que aguanta hoy el tanque. Una reparación más corta no cuesta crudo.»; MPP-301: «El promedio de sus 7 fallas cerradas.»
- `deFlota(r, nivel)`: «flota» debajo, solo en el nivel `ingenieria` y con `costoDe = 'flota'`.

**Lo que ya costó (no es esta cifra).** `HistorialEquipo.bblPorFalla` (promedio de los barriles de sus fallas cerradas, con los ceros de las que absorbió el tanque) se rotula siempre «le ha costado por falla»: Detalle de la bomba («Le ha costado por falla»), placa («· le ha costado 3.365 bbl por falla»), ficha ejecutiva («le ha costado 18.075 bbl por falla, en promedio»), panel del equipo y Confiabilidad (columna «le ha costado / por falla»). Cap. 7.

**Quién lo calcula y por dónde viaja.** Servidor. `GET /api/vistas/riesgo?campos` → `Riesgo.costoFalla?` (bbl), `colchonH?` (h, solo finito), `mdtFuente?` (texto) y `costoDe?` (`'propio'` | `'flota'`); son números y textos: el códec no cambia. Fórmula en CONTRATO.md «Costo si falla hoy» (`CONTRATO.md:1118-1138`).

**Referencia.** `diferido.ts:453-472` (tipo), `:498-513` (`costoDeBomba`), `:580`, `:603-612`; `src/shared/ui/costoHoy.ts`; casos `referencia/riesgo/{morichal,guacamayo,portafolio}.json`; `verificar-libro.mjs` §18 (1) y §19 (5).

---

**Ejemplo con los datos del demo** (todas las filas en riesgo del portafolio):

| Equipo · campo | Tipo | Parte · estado | Prio | Cruza en (rango) | Si para bbl/d | Pozos | Si falla hoy (bbl) | `colchonH` | `costoDe` |
|---|---|---|---|---|---|---|---|---|---|
| K-101 · La Ceiba | aire | — | 1 | — (ya fuera) | 0 | 0 | — | — | — |
| MN-07 · Morichal | ESP | bomba · fuera | 2 | 3,79 h (3,64–3,96) | 606,5 | 1 | 606,532 × 486,339 / 24 = **12.290,8** | — | flota |
| MN-18 · Morichal | ESP | admision · fuera | 2 | 30,16 h (29,6–30,7) | 526,1 | 1 | **10.660,0** | — | flota |
| P-201B · Morichal | reinyección | succion · fuera | 2 | 43,09 h (41,3–45,0) | 1.670,7 | 4 | 1.670,662 × 29,967 / 24 = **2.086,0** | 19,05 | propio |
| GU-04 · Guacamayo | ESP | aislamiento · fuera | 2 | 61,08 h (60,3–61,9) | 647,2 | 1 | 647,226 × 616,103 / 24 = **16.614,9** | — | flota |
| MPP-301 · Morichal | transporte | filtro · fuera | 2 | 124,31 h (113,3–137,6) | 1.599,8 | 3 | 1.599,752 × 48,676 / 24 = **3.244,5** | — | propio |
| MN-27 · Morichal | ESP | protector · fuera | 2 | 261,54 h (245,9–279,3) | 510,4 | 1 | **10.341,8** | — | flota |

Suma de «si falla hoy» = 12.290,8 + 10.660,0 + 2.086,0 + 16.614,9 + 3.244,5 + 10.341,8 = **55.238,1 bbl** (K-101, servicio, no lleva cifra). Antes de la corrección del 8-oct, P-201B de Morichal decía 3.364,6 y MPP-301 3.433,5 (lo que **ya** costaron por falla) y la suma era 56.706.

Motivos (textuales, horas con `textoHoras`, la regla de las pantallas): P-201B Morichal «Succión y filtro de entrada: presión de succión salió de su banda normal; llega a su alarma en 43 h» (tag `PI-2010`, acción «Limpiar el filtro o recuperar nivel en el tanque antes de que la bomba dispare por baja succión.»); MPP-301 «Filtro de entrada: caída de presión del filtro salió de su banda normal; llega a su alarma en 5,2 d» (`PDT-3011`); GU-04 «… llega a su alarma en 2,5 d»; MN-27 «Protector (sello del motor): temperatura del motor salió de su banda normal; llega a su alarma en 10,9 d»; MN-07 «Bomba de fondo (eje y etapas): corriente del motor salió de su banda normal; llega a su alarma en 4 h»; K-101 «Sistema de aire de instrumentos: en marcha · degradado. La presión de cabezal cae hace 7 días. La norma exige recibidor de 5 a 30 min de autonomía: hoy quedan 11. Alimenta cinco sistemas.»

K-101 de La Ceiba entra por (b) con 0 bbl/d porque en La Ceiba **no produce ningún pozo**. SE-2 de Morichal (corriente de barraje subiendo) **no** entra: su severidad es 3 y (b) solo toma 1 o 2.

**Casos borde.**
- Bomba con parada abierta: nunca está «en riesgo» (ya está «perdiendo» o el tanque absorbe).
- Bomba de recobro con una parte que avisa: entra con `bblDia = 0` y `costoFalla = 0` («≈ 0 bbl si falla hoy»).
- Equipo sin historia: bomba sin fallas cerradas → sin `costoFalla` («sin historia»); ESP sin fallas propias **y** campo sin ninguna falla cerrada de ESP → sin `costoFalla`.
- La parte en `fuera` sin pronóstico de cruce (la variable ya está en alarma, o es un instrumento discreto): `horas` ausente → la pantalla dice «ya fuera».
- **La prioridad no se deduce de las horas** en el servidor (`prioridad` viaja hecha); Turno sí la sube a P2 si cruza dentro del turno (cap. 6).

---

### 5.4 El estado del campo (`EstadoCampo`)

**Qué es.** El resumen de un campo ahora. Lo pide la cabecera del campo, el riel lateral y Riesgo (para el potencial).

**Fórmulas** (`calcularEstado`, `diferido.ts:655-669`):

| Campo | Fórmula |
|---|---|
| `ayer` | `{ fecha, bbl }` del fiscal del último día completo del punto de medición oficial; `bbl: null` si el computador de flujo no lo reportó (`fiscalDeAyer`, `libro.ts:1036`) |
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

**Cabecera** (`Riesgo.tsx:155-182`):

| Cifra | Fórmula | Formato |
|---|---|---|
| **Perdiéndose ahora** | $\sum$ `bblDia` de `perdiendo` | `n0` + «bbl/d»; ◆ P1 delante si alguna es de alto impacto |
| apoyo | `n1(porDia / potencial × 100)` « % del potencial · » `plural(Σ pozos, 'pozo parado', 'pozos parados')`; potencial = $\sum$ `EstadoCampo.potencialBpd` del ámbito (0 si no hay → «0,0 %») | |
| **En riesgo · N equipos** | $\sum$ `bblDia` de `en-riesgo` | `n0` + «bbl/d en juego» (los bbl/d se llaman «si para» o «en juego», nunca «si falla») |
| pie corto (la **exposición**) | $\sum$ `costoFalla` de las filas que lo traen (un 0 por definición, recobro o respaldo total, cuenta como cifra; ausente no). Sin filas: «nada en riesgo»; con alguna cifra: «≈ <n0(Σ costoFalla)> bbl de exposición» + (« · N sin historia») + (« · sin N servicio(s)»); sin ninguna cifra y todas servicios: «solo servicios del campo»; si no: «sin historia para estimar» (`Riesgo.tsx:39-61`) | |
| ⓘ «Exposición» | con alguna cifra: «Suma de lo que costaría cada equipo si fallara hoy, uno por uno.» + («N equipo(s) sin historia para estimar.») + («Sin contar N servicio(s) del campo.»); sin cifra y todas servicios: «Son servicios del campo: lo que cuesta su caída depende de cuánto dure.»; si no: «Sin historia de fallas para estimar lo que costaría una.» No es que fallen todos a la vez: es lo expuesto, equipo por equipo | |
| **El más cercano** | la primera fila de «en riesgo» ya ordenada (abajo): equipo (+ campo), nombre de la parte y «cruza en <fmtHoras>» o chip fuerte «ya fuera»; sin filas, «ninguno» | |

«Servicio» es lo que no es ESP ni bomba de la línea (`esServicio`, `shared/api/equipos.ts:53`: una sola regla para Riesgo, Mantenimiento, el Resumen y la franja «Ahora»; la multifásica es bomba de la línea, no servicio). La exposición de la cabecera es **exactamente** la suma de lo que dicen las filas («≈ N bbl si falla hoy», 5.3).

**Orden de «en riesgo» en pantalla** (`Riesgo.tsx:32`): por `horas` ascendente, con `horas` ausente = −1 → **lo que ya está fuera va primero**.

**Fila «en riesgo»** (`Riesgo.tsx:99-151`): marca con `prioridad`; equipo (+ campo); chip con el tipo; parte en minúscula + chip `ESTADO_PARTE[estadoParte]` («fuera de banda» en tono fuerte, «avisa» neutro). Columna «cruza en»: `fmtHoras(horas)` o «ya fuera», y debajo el rango corto (`entre`: «41–45 h»; vacío si los dos extremos se escriben igual). Columna «si para» (cabecera de la columna): `n0(bblDia) bbl/d`, o «todo el campo» si es servicio con 0 bbl/d; debajo `costoHoy(r)` «≈ <n0(costoFalla)> bbl si falla hoy», o nada (servicio), o «sin historia»; con tanque, `colchonCorto(r)` «0 si vuelve antes de <horas>»; y «flota» (`deFlota`: solo nivel `ingenieria`, `costoDe = 'flota'`). Globo: «Parte», «Cruza su límite · en 43 h (41–45 h)» o «ya fuera», «Si para · N bbl/d» (servicio sin producción: «cierra lo que esté produciendo en el campo»), «Si falla hoy · ≈ N bbl» (solo con cifra); pista = motivo. Debajo, ⓘ «qué hacer» con `accion` (no en el nivel `decision`) y ⓘ «si falla hoy» con `detalleCostoHoy(r)` (todos los niveles, solo con cifra y `mdtFuente`). Las cuatro funciones están en `src/shared/ui/costoHoy.ts` y las usa también Mantenimiento.

`fmtHoras` (sin «precisa»): < 48 h → entero + « h»; hasta 90 días → días con un decimal + « d»; más → «más de 3 meses».

**Ejemplo con los datos del demo.**

| Ámbito | Perdiéndose ahora | Apoyo | En riesgo | Pie corto | El más cercano |
|---|---|---|---|---|---|
| Portafolio | ◆ **13.217** bbl/d | 31,5 % del potencial · 21 pozos parados | 7 equipos · **5.561** bbl/d en juego | «≈ 55.238 bbl de exposición · sin 1 servicio»; ⓘ «Suma de lo que costaría cada equipo si fallara hoy, uno por uno. Sin contar 1 servicio del campo.» | K-101 · La Ceiba · chip «ya fuera» |
| La Ceiba | ◆ **11.360** | 100,0 % · 18 pozos parados | 1 equipo · **0** bbl/d en juego | «solo servicios del campo» | K-101 · «ya fuera» |
| Morichal | ◆ **684** | 3,9 % · 1 pozo parado | 5 equipos · **4.913** | «≈ 38.623 bbl de exposición» (12.290,8 + 10.660,0 + 2.086,0 + 3.244,5 + 10.341,8) | MN-07 · Bomba de fondo · cruza en 4 h |
| Guacamayo | ◆ **1.173** | 17,7 % · 2 pozos parados | 1 equipo · **647** | «≈ 16.615 bbl de exposición» | GU-04 · Aislamiento del motor y del cable · cruza en 2,5 d |

Orden de las filas del portafolio: K-101 (ya fuera) · MN-07 (4 h) · MN-18 (30 h · 30–31 h) · P-201B Morichal (43 h · 41–45 h) · GU-04 (2,5 d · 2,5–2,6 d) · MPP-301 (5,2 d · 4,7–5,7 d) · MN-27 (10,9 d · 10,2–11,6 d). Fila de K-101: ◆ «ya fuera», «si para **todo el campo**», sin cifra ni ⓘ «si falla hoy». Fila de P-201B Morichal: ▲ «succión y filtro de entrada» + «fuera de banda», «43 h» «41–45 h», «**1.671** bbl/d», debajo «≈ 2.086 bbl si falla hoy» y «0 si vuelve antes de 19 h»; ⓘ «si falla hoy»: «El promedio de sus 8 fallas cerradas, sin las 19 h que aguanta hoy el tanque. Una reparación más corta no cuesta crudo.» Fila de MN-07: ▲, «4 h» (sin rango: 3,64 y 3,96 se escriben los dos «4 h»), «607 bbl/d», «≈ 12.291 bbl si falla hoy», «flota» en ingeniería; ⓘ «20,3 d fuera, el promedio de las electrosumergibles del campo (esta no ha fallado).». Fila de MPP-301: «1.600 bbl/d», «≈ 3.245 bbl si falla hoy» (sin «0 si vuelve…»: no tiene tanque).

**Ver más.** Se ven 5 filas y «ver N más»; una fila de prioridad 1 nunca se esconde (`listaCorta.ts:10-16`; en «perdiendo» la prioridad es 1 si alto impacto). En papel salen todas.

**Texto fijo de la pantalla** (Lectura, `Riesgo.tsx:184-194`): «Perdiéndose ahora es el crudo de los pozos que están apagados en este momento, cada uno cargado al equipo que lo apagó. En riesgo son las bombas de la línea y las electrosumergibles que producen pero tienen una parte que avisa: lo que se perdería por día si paran, y lo que costaría que fallaran hoy con el tiempo fuera que suelen tener (la exposición lo suma).» (+ «En puntos de eficiencia: lo perdido sobre el potencial del campo.» en `decision`) + «La lista va ordenada por cuándo cruza su límite: primero lo que ya está fuera. El ⓘ «si falla hoy» de cada fila dice de dónde sale la cifra («flota»: el equipo nunca ha fallado y se estimó con su flota en el campo). Un servicio del campo no lleva esa cifra: lo que cuesta su caída depende de cuánto dure.»

**Referencia.** `diferido.ts:424-669`, `pages/Riesgo.tsx`, `shared/ui/costoHoy.ts`; casos `referencia/riesgo/{ceiba,morichal,guacamayo,palmar,zarza,portafolio}.json`.
