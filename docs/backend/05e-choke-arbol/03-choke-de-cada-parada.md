# 5E.3 · El tramo de cada parada

Cada parada del libro lleva el tramo donde **se originó** (el paso 2 del árbol de la ANH), con su porqué en palabras de campo. TRIM lo **propone** con la topología (5E.1) y la causa de la señal (5B.2, 5B.3); lo **confirma una persona** (5E.9). Este archivo cubre la regla (`chokeDeCausa`), sus casos (cascada, baja tensión de un solo pozo, mercado, tanque lleno, evacuación, declaraciones, programadas) y la fila ANH donde vive (pozo × día operacional × causa, con parciales, disparos, exceso y abiertas al corte).

Funciones: `chokeDeCausa(causa, campoId, ctx)` (`src/entities/choke.ts:576-586`), que memoriza por contexto, causa y campo y llama a `deducirChoke` (`:687-793`); `chokeDeTramo(t, ctx)` (`:592`) para un tramo del libro; `paradasAnh` (`src/entities/anh-paradas.ts:219-299`) para las filas. La regla tiene versión: **`choke.topologia@3`** (`REGLA_CHOKE`, `choke.ts:521`), y cada propuesta la lleva (`DatoClasificado.regla`): lo ya clasificado conserva la suya.

Datos de los ejemplos: el demo, `AHORA = 2026-10-02T14:00-05:00`; «13 meses» es del 1-oct-2025 al 2-oct-2026 14:00.

---

### El tramo de una parada y su porqué

**Qué es.** `ChokeDeParada` (`choke.ts:524-546`): `choke`; `porque` (la frase); `elemento` (la raíz de la cascada o el propio pozo); `servidos` (a cuántos pozos sirve ese elemento); `pregunta` (un dato que solo sabe una persona: la propuesta no pasa a confirmada sola); `alcance`; `subnivel: 'mercado'`; `fuente` (`firmada` si el elemento está en la topología firmada, `derivada` si en la del registro, `regla` si no está y el tramo sale del tipo de causa); `regla`. `null` cuando la señal no lo decide: sin causa, o el equipo está «por saber».

**Fórmula (las reglas, en orden).**

1. **Manda el origen.** `Causa.equipo` ya es la raíz de la cascada (el servicio que cayó, la bomba que paró antes, el propio pozo): todas las paradas de una cascada llevan el tramo de su raíz.
2. **Dedicado o compartido, según la topología** (5E.1). Para la baja tensión (`UV`), el alimentador del pozo. **Regla @2**: si la baja tensión tumbó **un solo pozo** de su alimentador en la ventana de cascada (15 min, la misma de `causa-senal.ts`; `cortesDe`, `choke.ts:656-685`), se propone **el pozo** y se pregunta de dónde vino el corte; si tumbó varios, la planta.
3. **Reinyección, multifásica, aire, compresión, separación, tratamiento → planta** (compartidas). **Evacuación → planta**, salvo que el elemento sea de un tercero; sin ese dato se propone planta y se pregunta «¿El oleoducto o el cliente estaba recibiendo?» (`PREGUNTA_OLEODUCTO`, `:550`). **La energía nunca es «afuera»**: la de afuera se materializa en el sistema eléctrico del campo; quién la cortó es el responsable, otro paso.
4. **Programada → el tramo del elemento intervenido** (workover y pruebas → pozo).
5. **Declarada → lo que declaró la persona**: uno de los cuatro motivos cerrados (`CHIPS`, `:598-607`) o, en texto libre, la topología como propuesta y la pregunta. **Regla @3**: la declaración que nombra al comprador (o cliente, o transportador) **y** la nominación es afuera, en el mercado (`esDeclaracionDeMercado`, `:624-629`: dos expresiones cerradas, no una lectura del texto).
6. **Pendiente → `null`.** El yacimiento nunca sale de una señal. **Regla @3**: un equipo «por saber» → `null` (5E.1).

Una parada **parcial** lleva el tramo de su causa: lo que cambia es su escalón (5E.4).

**Ejemplo con los datos del demo** (13 meses, 1.211 tramos del libro, 485.684,2 bbl):

| Tramo propuesto | Tramos del libro | bbl |
|---|---:|---:|
| En el pozo | 619 | 245.749,4 |
| En la planta | 584 | 237.306,7 |
| Afuera (mercado) | 6 | 2.272,9 |
| Sin tramo (pendientes: LC-21 y LC-08 de La Ceiba) | 2 | 355,0 |

Por fuente: 1.203 de la topología derivada y 6 de la regla (las declaraciones del mercado de La Zarza, con `alcance: tercero`). Por tipo: electrosumergible → pozo 503; energía → pozo 104 (regla @2) y → planta 254; aire → planta 105; compresión 59; reinyección 44; tratamiento 36; evacuación 29; proceso 28; multifásica (transporte) 20; programada → planta 9 y → pozo 5; levantamiento → pozo 4; declarada → pozo 3 y → mercado 6.

**Quién lo calcula.** Servidor. Al operador **nunca se le pide el tramo**: lo confirman supervisión, producción, el jefe o confiabilidad (5E.9).

**Referencia.** `src/entities/choke.ts:521-793`; `referencia/anh/paradas-*.json` (paso 2 de cada fila, con `porqueChoke`).

---

### Una falla del propio pozo

**Qué es.** Electrosumergible o bombeo mecánico del pozo: el pozo, salvo que la topología firmada diga otra cosa.

**Ejemplo con los datos del demo.** LC-06, `EP-LC06-251001-96` (1-oct-2025, 02:55, disparo por sobrecarga): «LC-06 tiene su propia electrosumergible: la falla queda en el pozo» (`fuente: derivada`, `servidos: 1`). Baja carga (`UL`, parte admisión), LC-12 `EP-LC12-251005-53`: el mismo porqué y la pregunta «¿Falló la bomba o el pozo dejó de aportar? Si no aportó, es el yacimiento» (el yacimiento solo lo dice una persona).

**Qué texto.** Pozo: «{pozo} tiene su propia electrosumergible: la falla queda en el pozo» / «… su propio bombeo mecánico …»; en la topología firmada como compartido: «{pozo} está en la topología firmada como compartido: queda en la planta».

**Referencia.** `src/entities/choke.ts:735-745`.

---

### La cascada: un servicio o una bomba que frena varios pozos

**Qué es.** Un servicio que cae (energía, aire, compresión, proceso) o una bomba de la línea que para cierra varios pozos; cada pozo es una parada con **la misma raíz** y el mismo tramo (Unicidad, C24 p.5). La fila ANH guarda la raíz (`raiz`) y los minutos desde su caída (`minutosDesdeRaiz`).

**Ejemplo con los datos del demo.** En 13 meses hay 56 cascadas.

| Cascada | Pozos | Filas ANH | bbl | Porqué |
|---|---:|---:|---:|---|
| SE-2, Morichal Norte, 15-oct-2025 | 41 | 82 | 14.601,1 | «SE-2 alimenta 41 pozos: si cae, se frenan varios» |
| K-101, La Ceiba, 28-ene-2026 (`SV-K-101-260128`) | 18 | 31 | 3.909,8 | «K-101 le da aire de instrumentos a 18 pozos: si cae, se frenan varios» (cada fila guarda los minutos desde la caída de la raíz; en una de ellas, 8) |

La misma caída de K-101 paró P-201B (`EV-2011-260128`, 16:20 → 23:51, «Paró porque presión baja del aire de instrumentos»): la bomba también es parte de la cascada, y su raíz es K-101.

**Qué texto.** `{equipo} {verbo} {N pozos}: si {para|cae}, se frenan {varios | los 2 | los 3}`. El verbo sale del tipo (`VERBO`, `choke.ts:642-646`): «mueve el agua de», «lleva la producción de», «alimenta», «le da aire de instrumentos a», «comprime el gas de», «separa lo que llega de», «trata el crudo de», «despacha el crudo de»; una bomba con perfil, del papel: «lleva la producción de» (transporte), «inyecta el agua de» (recobro), «mueve el agua de». Un servicio «cae»; una máquina «para».

**Referencia.** `src/entities/choke.ts:637-655, 774-792`; `src/entities/causa-senal.ts` (la ventana de cascada); `referencia/anh/paradas-morichal-2025-12.json`, `paradas-ceiba-2025-10.json`.

---

### El tanque de agua lleno y la multifásica parada

**Qué es.** Una bomba de la línea que paró **antes** que el pozo: la de disposición lo cierra por el tanque de agua lleno; la multifásica, porque no mueve su producción. El porqué dice qué le pasó al pozo, con la hora en que paró la bomba.

**Ejemplo con los datos del demo.** La Ceiba, hoy: P-201B paró el 2-oct a las 03:52 y el tanque de agua se llenó; LC-16 cerró a las 05:43 (111 min después) y LC-07 a las 05:46 (114 min): «P-201B mueve el agua de 18 pozos: el pozo se cerró porque el tanque de agua se llenó con P-201B parada (paró el 2 de oct, 03:52), así que se trabó en la planta». Morichal, MN-07: «MPP-301 lleva la producción de 3 pozos: el pozo paró porque MPP-301 dejó de moverle la producción (paró el 3 de nov de 2025, 21:04), así que se trabó en la planta». Programada de la bomba (LC-16, P-201B): «Parada programada de P-201B, que mueve el agua de 18 pozos: queda en la planta».

**Referencia.** `src/entities/choke.ts:774-792`; `referencia/anh/paradas-ceiba-2026-10.json`.

---

### La baja tensión que tumbó un solo pozo (regla @2)

**Qué es.** Un `UV` del variador de un pozo, sin servicio caído ni bomba parada, que no arrastró a ningún otro pozo del alimentador en 15 minutos. Si el pórtico hubiera fallado, habrían caído todos sus pozos (como en las caídas de SE-2 en Morichal). Se propone **el pozo** y se le pregunta al operador **un hecho**, nunca el tramo.

**Ejemplo con los datos del demo.** LC-05, `EP-LC05-261001-95`, 1-oct-2026 09:16 → 12:45 (3,483 h, 117,921 bbl): «La baja tensión tumbó solo a LC-05: SE-2 siguió alimentando a los demás pozos, así que se propone el pozo» + `PREGUNTA_ENERGIA` (`choke.ts:548`): «¿De dónde vino el corte: de afuera (el proveedor), del campo (pórtico, red de media o subestación) o de este pozo (su transformador, su variador o su cable)?». En 13 meses son 104 tramos de energía con el pozo como tramo.

**Casos borde.** Si el `UV` tumbó varios a la vez sin servicio caído: «La baja tensión tumbó N pozos de {alimentador} a la vez ({lista}): se propone la planta» (no ocurre en el demo). Sin corte identificado: «{alimentador} alimenta N pozos: si cae, se frenan varios».

**Referencia.** `src/entities/choke.ts:756-773`; `referencia/anh/paradas-ceiba-2026-10.json` (fila de LC-05).

---

### La evacuación: el tanque de crudo y la LACT

**Qué es.** El tanque y la LACT son de la batería (planta). Solo es afuera si el oleoducto o el cliente no recibía, y TRIM no tiene esa señal: propone planta y pregunta.

**Ejemplo con los datos del demo.** Guacamayo, GU-03 por LACT-01: «LACT-01 es de la planta y despacha el crudo de 12 pozos: si el oleoducto o el cliente no recibía, es afuera» + «¿El oleoducto o el cliente estaba recibiendo?». La respuesta de campo «No, no recibía» la pasa a afuera (5E.5, 5E.9).

**Referencia.** `src/entities/choke.ts:746-755`; `referencia/anh/paradas-guacamayo-2025-10.json`.

---

### Lo que declaró una persona

**Qué es.** Un cierre que el operario declaró. Cuatro motivos cerrados (`CHIPS`, `choke.ts:598-607`) dicen el tramo y el escalón; el mercado se reconoce por dos palabras; lo demás es texto libre y **TRIM no lo interpreta**.

**Qué texto.**

| Lo que declaró | Tramo | Escalón | Porqué |
|---|---|---|---|
| «Cierre para prueba o intervención del pozo» | pozo | paradas planeadas | «Se cerró para probar o intervenir el pozo: queda en el pozo» |
| «Fuga o daño en la línea de flujo» | pozo | no planeadas | «La línea de flujo es del pozo y le sirve solo a él: queda en el pozo» |
| «Orden de producción: nominación o restricción del comprador» | afuera · mercado | capacidad | «El comprador o la nominación no recibieron todo: es afuera, en el mercado» |
| «Falla del controlador o de un instrumento del pozo» | pozo | no planeadas | «El controlador o el instrumento es del pozo y le sirve solo a él: queda en el pozo» |
| Texto libre que nombra comprador/cliente/transportador **y** nominación | afuera · mercado | capacidad | «{quien} dijo «{texto}»: el comprador no recibió todo, así que es afuera, en el mercado» |
| Cualquier otro texto libre | el de la topología (pozo) | de la causa | «Lo declaró el operario con sus palabras: la propuesta es el pozo y la confirma una persona» + «¿Dónde se originó lo que se declaró: en el pozo, en la planta o afuera?» |

**Ejemplo con los datos del demo.** La Zarza: 6 declaraciones de mercado en 13 meses (ZA-01 dos veces, ZA-03 dos, ZA-04, ZA-06), 2.272,9 bbl; ZA-06 pone 302,6 bbl en septiembre de 2026: «Nelson Ortiz dijo «El comprador nominó menos gas: se cerró el pozo»: el comprador no recibió todo, así que es afuera, en el mercado» (`alcance: tercero`, `fuente: regla`). Texto libre: LC-06 («Lo declaró el operario con sus palabras…»); MN-22, `EP-MN22-260930-03` («Fuga en la línea de flujo del pozo: se cerró para repararla», escrito a mano y no como motivo cerrado): dos filas, 106,5 bbl el 30-sep y 86,3 bbl el 1-oct, con la propuesta del pozo y la pregunta.

**Casos borde.** La regla del mercado es cerrada sobre dos expresiones (`MERCADO_QUIEN`, `MERCADO_QUE`, `choke.ts:618-620`), con cuidado con la «ó» (que en JavaScript no es letra para `\b`). Cualquier otra declaración libre sigue sin interpretarse.

**Referencia.** `src/entities/choke.ts:594-633, 711-726`; `referencia/anh/paradas-zarza-2026-09.json`.

---

### Las paradas programadas

**Qué es.** El tramo del elemento intervenido: un pozo (workover, prueba) es pozo; una bomba o un servicio, planta.

**Ejemplo con los datos del demo.** 14 tramos programados en 13 meses: LC-19, «Parada programada en LC-19 (prueba o intervención del pozo): queda en el pozo»; P-201B (LC-16): «Parada programada de P-201B, que mueve el agua de 18 pozos: queda en la planta». Lo que siguió cerrado **después** de la ventana del programa es otra fila, no planeada (exceso, abajo).

**Referencia.** `src/entities/choke.ts:727-734`.

---

### La fila ANH: un pozo × un día operacional × una causa

**Qué es.** La unidad que se reporta (`ParadaAnh`, `anh-paradas.ts:73-137`; tabla `paradas_pozo` de la Circular 024). Sale de los tramos del libro, **que no cambian**: aquí solo se parten por día y se clasifican. Los barriles de cada fila son los del libro (`diferidaTrimBbl`): **no viajan a la ANH** (la diferida ANH es otra cifra) y suman exacto lo del libro (`conciliarAnh`, `:381`). Id: `${eventoId}@${díaOperacional}#${n}`.

**Fórmula (reglas de partición, provisionales hasta la pregunta 4 de P1 §8).**

- **Día operacional**: el día calendario con corte a las 23:59:59, en hora de Colombia (`diaOperacional`, `:55`; `inicioDiaCo`, `:53`), como corta el día a día del libro.
- **Medianoche**: una parada que la cruza se parte en una fila por día, con el mismo evento: la primera termina a las 23:59:59 y la siguiente empieza a las 00:00:00. En el JSON, las 23:59:59 COT son las 04:59:59Z del día siguiente (`horaAnh`, `:66-70`; `Config.anh.zonaSalida`: `utc-z` por defecto o `cot-offset`).
- **Abierta al corte**: si a las 23:59:59 seguía parada, la fila termina ahí y lo dice («Continúa al corte del día»): `h_fin_paro` nunca va vacío. `diaEnCurso`: el día todavía no corta (es hoy) y la fila puede cambiar.
- **«Tramo n de m del evento»** en la descripción cuando se partió (`m = null` mientras el evento siga abierto): sin él, la ANH leería más paradas de las que hubo.
- **Parcial** (frecuencia reducida, `HZ`): también es parada («total o parcial», C24 p.3-4), con su `fraccion` (< 1) y «Parcial: X Hz de Y Hz de la prueba».
- **Disparos** de la electrosumergible (vuelve a arrancar en < 24 h): también son filas, aunque no cuenten como falla para el MTBF.
- **Cascada**: N pozos, N filas con la misma raíz y la misma clasificación.
- **Exceso** de una programada: lo que siguió cerrado después de la ventana del programa firmado es otra fila, **no planeada** (`propuestaDeExceso`, regla `programa-exceso@1`, `anh-clasificacion.ts:1473-1493`).
- **Una hora del pozo, una fila**: un evento que llega con el pozo ya cerrado no abre otra fila (se anota en la descripción); si la primera causa termina y el pozo sigue cerrado por otra, se parte. Es la regla con que el libro cobra cada hora una sola vez.

**Ejemplo con los datos del demo.**

| Período | Filas | Eventos | Parciales | Disparos | Exceso | Abiertas al corte |
|---|---:|---:|---:|---:|---:|---:|
| La Ceiba · oct (1-oct → 2-oct 14:00) | 7 | 5 | 0 | 0 | 0 | 5 |
| Portafolio · sep 2026 | 129 | 69 | 0 | 39 | 0 | 63 |
| Portafolio · 13 meses | 2.308 | 1.211 | 196 | 528 | 6 | — |

Filas tipo, corridas:

- **Medianoche y abierta al corte** — LC-08, `EP-LC08-261001-02`: fila 1 el 1-oct 22:15 → 23:59:59 (1,750 h, 65,111 bbl), «Continúa al corte del día. Tramo 1 de 2 del evento EP-LC08-261001-02. …»; fila 2 el 2-oct 00:00 → 01:10 (1,167 h, 43,407 bbl), «Tramo 2 de 2 …». MN-30, `EP-MN30-251003-45`, 3-oct-2025 20:50 → 23:59:59, «Tramo 1 de 2».
- **Evento que sigue abierto** — LC-21, `EP-LC21-261001-01`: fila 1 (1-oct 18:20 → 23:59:59, 5,667 h, 71,033 bbl) «Tramo 1 del evento EP-LC21-261001-01, que sigue abierto»; fila 2 (2-oct, 14,000 h, 175,493 bbl, día en curso).
- **Parcial** — GU-02, `EP-GU02-251017-58@2025-10-17#1`: 23,733 h, fracción 0,248, 108,329 bbl, «Parcial: 39,5 Hz de 52,5 Hz de la prueba. Tanque de crudo alto: despacho limitado por la nominación del oleoducto.» De los 196 parciales de 13 meses, 127 son de evacuación (escalón capacidad) y 69 de compresión de C-401 (no planeadas), p. ej. MN-01, 45 de 56,5 Hz.
- **Disparo** — LC-06, `EP-LC06-251001-96`: 02:55 → 05:32 (2,617 h, 82,309 bbl), «Disparo: volvió a arrancar en menos de 24 h. El variador disparó por sobrecarga. Parte: Bomba de fondo. VSD-LC06 · código OL · 1 de oct, 02:55».
- **Exceso** — MN-07, `EP-MN07-260217-82@2026-02-17#2`: 15:48:55 → 21:17 (5,468 h, 136,905 bbl), «Se pasó de la ventana del programa PR-M2011-260217, que terminaba a las 15:48.», con planta · diferida · no planeada propuestas por `programa-exceso@1`.

**Qué texto.** La descripción de la fila (`desc_evid`) se arma solo con hechos estructurados (QA-D2; 5E.9).

**Quién lo calcula.** Servidor: `GET /api/vistas/anh/paradas?campos=&desde=&hasta=` → `ParadaAnh[]` de los días operacionales que toca el período (llevado a días enteros), con lo que ya dijeron las personas encima.

**Referencia.** `src/entities/anh-paradas.ts:1-299`; `referencia/anh/paradas-{campo}-{mes}.json` (20 casos).
