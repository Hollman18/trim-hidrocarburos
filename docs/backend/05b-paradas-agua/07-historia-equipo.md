# 7 · Historia de un equipo: fallas, MTBF, horas fuera, barriles por falla

Dos cuentas distintas, que no hay que confundir:

| Cuenta | Función | Qué cuenta | Para qué equipos |
|---|---|---|---|
| **Historial de fallas** (`HistorialEquipo`) | `historialDeEquipo` (`libro.ts:1244-1299`) | las fallas **propias** del equipo, cuesten barriles o no (una parada que el tanque absorbió es una falla con 0 bbl) | bombas de la línea con perfil y ESP |
| **Eventos cargados** (`EventoCargado[]`) | `eventosCargadosA` (`libro.ts:1212-1241`) | cada evento que **cerró pozos** y se le cargó a ese equipo, sea falla propia, programada o un servicio | cualquier equipo: bomba, servicio, alimentador, pozo |

La historia empieza en el primer mes del calendario fiscal (`calendario()[0].desde`; en el demo, **1-oct-2025 00:00**) y termina en AHORA: $\text{días} = (\text{AHORA} - \text{desde}) / 1\ \text{d} = $ **366,583** días.

---

### Fallas del equipo

**Qué es.** Una **falla** es una parada propia del equipo: no la que causó otro equipo ni la programada. En la ESP, un evento que vuelve a arrancar en menos de 24 h es un **disparo**, no una falla (cap. 3.3).

**Qué entra** (`armarHistorial`, `libro.ts:1255-1272`):
- **Bomba con perfil**: cada `EventoBomba` del equipo desde el inicio de la historia cuya causa (`causaDeParada`) es `reinyeccion` o `transporte` → falla. Quedan fuera la programada y la que paró un servicio. `disparo = false` siempre.
- **ESP (pozo)**: cada `EventoPozo` del pozo cuya causa es `electrosumergible` **y** `causa.equipo === pozo` → evento; `disparo = esDisparo(...)`.

Cada evento (`FallaEquipo`): `id`, `inicio`, `fin` (o `null`), `horas` = $(t_{\text{fin o AHORA}} - t_{\text{ini}})/1\,\text{h}$, `parte`, `como`, `bbl` = suma de los tramos cargados a ese id en toda la historia (`bblPorEvento`; **0 si el tanque o el respaldo lo absorbieron**), `disparo`. Orden: más reciente primero.

**Fórmulas** (`libro.ts:1273-1298`):

$$
\text{fallas} = \#\{e : \lnot e.\text{disparo}\} \qquad \text{fallasCerradas} = \#\{e : \lnot e.\text{disparo} \land e.\text{fin} \ne \text{null}\}
$$

$$
\text{MTBF} = \frac{\text{días}}{\text{fallas}} \quad \text{solo si fallas} \ge 2 \text{ (cuenta la abierta: ya falló)}
$$

$$
\text{MDT}_h = \frac{1}{\text{fallasCerradas}} \sum_{\text{fallas cerradas}} \text{horas} \qquad
\text{bblPorFalla} = \frac{1}{\text{fallasCerradas}} \sum_{\text{fallas cerradas}} \text{bbl} \qquad
\text{bbl} = \sum_{\text{todos los eventos}} \text{bbl}
$$

| Símbolo | Significado | Unidad |
|---|---|---|
| días | días de historia | d |
| MTBF | tiempo medio entre fallas («una cada N días») | d |
| MDT | tiempo medio fuera de servicio de las fallas **cerradas** (incluye la espera de repuestos y logística; la reparación activa sale de las órdenes de SAP, en otro capítulo) | h |
| bblPorFalla | barriles promedio de cada falla cerrada (las absorbidas cuentan como 0): lo que **le ha costado** por falla. No es `Riesgo.costoFalla` (lo que costaría si fallara **hoy**, cap. 5) | bbl |
| bbl | todo lo cargado a sus eventos (fallas y disparos, abiertas incluidas) | bbl |

La falla **abierta** entra en `fallas` y en el MTBF, pero no en MDT ni en bbl por falla (lleva horas y barriles parciales y se compararía consigo misma).

> **Dos cifras por falla, con dos rótulos.** `bblPorFalla` es la **historia**: el promedio de lo que costaron sus fallas cerradas, con el factor y los pozos de cada mes y con los ceros de las que absorbió el tanque. Se rotula siempre «le ha costado por falla» (Detalle, placa, ficha ejecutiva, panel del equipo, Confiabilidad). «Si falla hoy» (`Riesgo.costoFalla`, cap. 5) es otra cuenta: el crudo de hoy por las horas de esas mismas fallas cerradas que pasan del colchón de hoy. P-201B de Morichal: le ha costado **2.764,7** bbl por falla; si falla hoy, **1.234,6**. Decisión del dueño del 8-oct (cap. 10, D3).

**Por parte** (`porParte`): se agrupan **todos** los eventos con `parte` (fallas y disparos): `fallas`, `disparos`, `bbl` (de todos), `mdtH` y `bblPorFalla` (de sus fallas cerradas), `mtbfDias` (días ÷ fallas de la parte, con ≥ 2), `ultima` (inicio del más reciente). Orden: bbl descendente, luego fallas. Una falla **sin parte** (sin identificar) no aparece en `porParte`.

**Ejemplo con los datos del demo — La Ceiba P-201B.**

| Falla | Inicio → fin | Horas | Parte | Cómo | bbl |
|---|---|---|---|---|---|
| `EV-2011-1002` | 2-oct 03:52 → abierta | 10,13 | — | ninguno | 573,1 |
| `EV-2011-0922` | 22-sep 10:05 → 23-sep 02:04 | 15,99 | rodamientos | señal | 1.040,6 |
| `EV-2011-0809` | 9-ago 21:14 → 11-ago 07:59 | 34,76 | sello | señal | 3.805,9 |
| `EV-2011-260727` | 27-jul 19:10 → 30-jul 09:17 | 62,12 | sello | señal | 7.452,9 |
| `EV-2011-260708` | 8-jul 23:39 → 11-jul 06:15 | 54,61 | sello | señal | 6.544,3 |
| `EV-2011-260420` | 20-abr 16:08 → 21-abr 22:13 | 30,09 | rodamientos | señal | 3.421,5 |
| `EV-2011-260325` | 25-mar 04:30 → 26-mar 05:12 | 24,70 | sello | señal | 2.875,0 |
| `EV-2011-251219` | 19-dic 20:13 → 21-dic 22:00 | 49,78 | rodamientos | señal | 5.935,2 |
| `EV-2011-251019` | 19-oct 02:02 → 21-oct 01:53 | 47,85 | sello | señal | 5.666,3 |

(No entran `EV-2011-260819`, programada, ni `EV-2011-260128`, que la paró K-101.)

1. fallas = 9; cerradas = 8.
2. MTBF = 366,583 / 9 = **40,73 días** → «cada 41 d» / «una cada 41 días».
3. MDT = (15,99 + 34,76 + 62,12 + 54,61 + 30,09 + 24,70 + 49,78 + 47,85) / 8 = **39,99 h** → «40,0 h fuera».
4. bbl por falla = (1.040,6 + 3.805,9 + 7.452,9 + 6.544,3 + 3.421,5 + 2.875,0 + 5.935,2 + 5.666,3) / 8 = 36.741,6 / 8 = **4.592,7 bbl** → «le ha costado 4.593 bbl por falla». Las horas no cambiaron con el demo del 9-oct (las mismas paradas); los barriles sí: cada parada cierra 2 o 3 pozos, no el campo entero.
5. bbl total = 36.741,6 + 573,1 = **37.314,7 bbl**.
6. Por parte: **sello** 5 fallas, 26.344,4 bbl, MDT 44,8 h, MTBF 73,3 d, 5.269 bbl por falla, última 9-ago; **rodamientos** 3 fallas, 10.397,2 bbl, MDT 32,0 h, MTBF 122,2 d, 3.466 bbl por falla, última 22-sep.

**Otras bombas del demo.**

| Bomba | Fallas (cerradas) | MTBF d | MDT h | Le ha costado por falla (bbl) | bbl total | Por parte |
|---|---|---|---|---|---|---|
| Morichal P-201B | 8 (8) | 45,82 | 47,09 | 2.764,7 | 22.117,4 | sello 5 (17.435 bbl) · motor 1 (894 bbl) · succión 1 (0 bbl); 1 sin parte (`260924`, 3.789 bbl) |
| Morichal MPP-301 | 7 (7) | 52,37 | 48,68 | 3.226,1 | 22.582,4 | sello 4 · tornillos 2 · lubricación 1 |
| Guacamayo P-201B (recobro) | 5 (5) | 73,32 | 41,03 | **0** | 0 | motor, sello, hidráulica, rodamientos, succión: 1 cada una |

En Morichal P-201B, una falla no costó crudo (`260103` succión, 3,7 h contra 5,9 h de colchón): **el tanque la absorbió** y baja el promedio de bbl por falla. Con 40.400 bbl/d sin salida y un tanque de 60.000 bbl, las demás duraron más que su colchón y cerraron 2 o 3 pozos. Guacamayo P-201B tiene 5 fallas y 0 bbl: es de recobro, sus paradas no cierran pozos hoy.

**Electrosumergibles.** En el demo **ninguna ESP tiene dos fallas**: no hay MTBF de ESP (siempre `undefined`). 22 ESP tienen una falla (21 cerradas: de 60,7 h en GU-07 a 815,3 h en LC-09; 1 abierta: MN-41). Las de después de la puesta en marcha de TRIM (1-sep) duran de 61 a 103 h; MN-05 y MN-16 ya no son fallas sino cambios programados por el vigía (5C). MN-07: 0 fallas, 5 disparos, 159,9 bbl. GU-04: 0 fallas, 6 disparos, 371,4 bbl.

**Casos borde.**
- Menos de 2 fallas → sin MTBF (`undefined`): la pantalla no lo escribe.
- Sin fallas cerradas → sin MDT ni bbl por falla.
- Una falla absorbida (0 bbl) **sí** cuenta (MTBF, MDT y baja el bbl por falla).
- La historia es la que hay desde el primer mes fiscal: un equipo instalado después tiene los mismos `días` de denominador (ver «Huecos»).

**Quién lo calcula y por dónde viaja.** Servidor. `HistorialEquipo` viaja en `GET /api/vistas/equipos/:campo/:equipo/historia` (`bomba`), `/ficha` (`hist`), `/vistas/bombas` (`veredicto.historial`, `veredicto.porFalla`), `/vistas/confiabilidad` (`h`), `/vistas/pozos/:campo/:pozo` (`historial`), `/vistas/electrosumergibles`. Fechas ISO; `fin` `null` si abierta; `porParte[].ultima` ISO.

**Referencia.** `libro.ts:1117-1299`; CONTRATO.md:1158-1165; casos `referencia/salud/bombas-*.json` y `referencia/salud/pozos-*.json`.

---

### Eventos con pozos cerrados (`eventosCargadosA`)

**Qué es.** Lo que se le cargó a un equipo en toda la historia, evento por evento: cuántos pozos cerró, cuánto costó y cuánto duró.

**Fórmula** (`libro.ts:1221-1241`). Sobre los tramos de toda la historia del campo con `causa.equipo === equipo`, se agrupa por `k = causa.evento ?? evento.id`:

| Campo | Valor |
|---|---|
| `id` | `k` |
| `inicio` | la hora de la **causa** (la parada de bomba o la caída del servicio con ese id); si no hay, el primer tramo |
| `fin` | `null` si algún tramo sigue abierto; si no, el fin del **último pozo que volvió a producir** |
| `bbl` | $\sum$ bbl de los tramos |
| `pozos` | pozos distintos |
| `causa` | la del primer tramo |

Orden: más reciente primero.

**Ejemplo con los datos del demo.**
- La Ceiba P-201B: **10 eventos, 38.838 bbl** (las 9 fallas + la programada `EV-2011-260819` de 1.523 bbl). Nota: 38.838 − 37.315 = 1.523 = la programada. `EV-2011-0922`: inicio 22-sep 10:05 (la bomba), fin 23-sep 02:40 (el último pozo que reabrió, 36 min después de que la bomba arrancara a las 02:04: con TRIM los pozos vuelven en 10-40 min), 2 pozos, 1.041 bbl.
- La Ceiba K-101: 6 eventos (caídas de aire), 17.277 bbl: cinco de 18 pozos y la del 25-mar con 15 (`SV-K-101-260325`, 4.278 bbl, la mayor; los otros 3 los cerró P-201B, cap. 2).
- Morichal SE-2: 59 eventos, 103.771 bbl: 6 caídas del pórtico (la mayor `SV-SE-2-260518`, 41 pozos, 26.215 bbl; las de dic-2025 y ago-2026 además pararon P-201B y MPP-301, y lo que cerró la bomba también se le carga a SE-2) más 53 eventos `UV` de un solo pozo cargados a su alimentador.
- Morichal P-201B: 8 eventos, 22.712 bbl: las 7 fallas que cerraron pozos (no `260103`, que el tanque absorbió) y la programada `EV-M2011-260217` (595 bbl).
- Morichal MPP-301: 8 eventos (7 fallas + programada `EV-3016-260825`, 845 bbl), 23.427 bbl.

**Casos borde.** Un evento que el tanque absorbió **no** aparece (no cerró pozos): la historia de fallas y la de eventos cargados difieren. Un equipo que nunca cerró pozos: lista vacía.

---

### Cómo se ve la historia en pantalla

**Placa de la bomba, ingeniería** (`Placa.tsx:173-180`), si hay fallas:

$$
\text{«}N\ \text{fallas en}\ n0(\text{días}/30{,}4)\ \text{meses} \cdot \text{cada}\ n0(\text{MTBF})\ \text{d} \cdot \text{fmtHoras}(\text{MDT}, \text{precisa})\ \text{fuera} \cdot \text{le ha costado}\ n0(\text{bblPorFalla})\ \text{bbl por falla»}
$$

`fmtHoras(h, precisa)`: < 48 h con un decimal y « h»; de 48 h a 90 días, días con un decimal y « d» (la misma regla que la ficha, el Detalle y Confiabilidad: una bomba no dice «48,7 h» en un lado y «2,0 d» en otro). La Ceiba P-201B: «9 fallas en 12 meses · cada 41 d · 40,0 h fuera · le ha costado 4.593 bbl por falla». Morichal P-201B: «8 fallas en 12 meses · cada 46 d · 47,1 h fuera · le ha costado 2.765 bbl por falla». MPP-301: «7 fallas en 12 meses · cada 52 d · 2,0 d fuera · le ha costado 3.226 bbl por falla» (antes del 8-oct, «48,7 h fuera»). Cada pieza se omite si no existe.

**Placa directiva** (quitada el 8-oct). La variante del gerente de la placa («Le ha costado N bbl en el período», «Falla más por …») ya no existe: el gerente no ve Bombas ni Electrosumergibles (cap. 10, D23). Lo que le interesa (de qué campo viene el diferido y qué equipos de ese campo fallan) está en su Resumen, en «POR CAMPO» desplegable (5A.8, `porEquipo.fallas/disparos` y `sinCosto`).

**Detalle de la bomba** (`Detalle.tsx:104-122`):
- «Diferido que causó» = `periodo.bbl` (del libro, `diferidoDeEquipo`, solo lo **cargado a esta bomba** en el período): «573 bbl», pie (ingeniería) «487 – 659 · calculado · ±15,0 % · 1 parada»; sin barriles, «0 bbl · ninguna parada con costo». Septiembre cerrado: 1.041 bbl, 1 parada (`EV-2011-0922`; la de sello pasó al 9-ago).
- «Le ha costado por falla» (solo ingeniería; antes «Costo por falla») = `veredicto.porFalla` = «4.593 bbl», pie «9 fallas en 12 meses · cada 41 d · 40,0 h fuera» (`fmtHoras(MDT, true)`; MPP-301 «2,0 d fuera»); sin fallas: «sin fallas» / «sin fallas en la historia que hay» (`Detalle.tsx:119-122`).
- Cada parada de la lista (4.4) dice su duración rotulada: «hasta <fecha> · **bomba parada** 16,0 h» (del paro de la bomba a su arranque), para no confundirla con la duración del panel del equipo (hasta que reabrió el último pozo).

**Panel del equipo, «HISTORIA DEL PLC»** (`PanelEquipo.tsx:262-312`):
- Nivel `ingenieria`: «**9 fallas** en 12 meses · cada 41 d · 40,0 h fuera · le ha costado 4.593 bbl por falla» (`fmtHoras(MDT, true)`; el último tramo solo si hay `bblPorFalla`), debajo «sello mecánico 5 · rodamientos 3»; luego «10 eventos con pozos cerrados · **38.838 bbl**» y una fila por evento: «<fechaHora(inicio)> · <N pozos cerrados> hasta <horas>» (cerrado: del paro hasta que reabrió el **último pozo**) o «<fechaHora(inicio)> · <N pozos cerrados> · sigue · <horas>» (abierto), debajo «<Parte> · <cómo>» o el texto de la causa si tiene ≤ 6 palabras (sin «· por el programa aprobado» en la programada) o solo el cómo; a la derecha «<n0(bbl)> bbl». Globo: «Hasta que reabrió el último pozo · 16,6 h» (o «Pozos cerrados, sigue · 10,1 h»), «Barriles», «Cómo se identificó» (`PanelEquipo.tsx:262-300`). Ejemplos: «2 de oct, 03:52 · 2 pozos cerrados · sigue · 10,1 h» / «sin identificar» / «573 bbl»; «22 de sept, 10:05 · 2 pozos cerrados hasta 16,6 h» / «Rodamientos · por señal» / «1.041 bbl» (la bomba volvió a las 16,0 h: lo dice su lista de paradas). Sin eventos: «Ningún pozo cerrado por este equipo en la historia.» Cinco filas y «ver N más».
- Nivel `operacion`: solo «Última parada: <fechaHora> · <parte>» + ⓘ con el texto de la causa.

**Ficha ejecutiva** (`FichaEjecutiva.tsx`), para quien decide:

| Renglón | Regla | La Ceiba P-201B (Octubre en curso) | Morichal P-201B (Septiembre cerrado) |
|---|---|---|---|
| Cifra y estado | fila `perdiendo` del equipo: «<n0> bbl/d perdiéndose», «Parada desde <desde> · pozos cerrados desde <cierreDesde>»; o «Cerrado por <equipo> desde <fecha>» (pozo); o fila `en-riesgo`: «En marcha · si para, <n0> bbl/d» | «**1.665 bbl/d** perdiéndose», «Parada desde 2 de oct, 03:52 · pozos cerrados desde 2 de oct, 05:43» | «En marcha · si para, 783 bbl/d» |
| Chips (equipos del catálogo) | `redundancia` (fuerte si «sin respaldo») y «si para: <aguasAbajo>» (`respaldoEnCampo`, `entities/equipos.ts:481-491`) | «P-201A y P-201C en paralelo, con 30.100 bbl/d libres entre las dos: el cabezal de disposición las limita a unos 89.250 cada una» · «si para: la parte del campo que el respaldo no cubre» | «Las otras seis bombas del tren, con 39.500 bbl/d libres entre todas: …» · «si para: la parte del campo que el respaldo no cubre» |
| Le ha costado | «<n0(periodo.bbl)> bbl en <período> · <usd>»; pie «<n0(historia.bbl)> bbl desde <fechaCorta(desde)> · <usd>» (USD con el precio de cada día; `usd()`: ≥ 1 M → «n1 M USD», ≥ 1.000 → «n0 mil USD») | «573 bbl en octubre, en curso · 28 mil USD», pie «38.838 bbl desde 01 de oct de 2025 · 1,9 M USD» | «3.789 bbl en septiembre, cerrado · 182 mil USD», pie «22.712 bbl desde 01 de oct de 2025 · 1,1 M USD» |
| Cada cuánto falla | «N fallas · una cada N días», pie «le ha costado <n0(bblPorFalla)> bbl por falla, en promedio» | «9 fallas · una cada 41 días», pie «le ha costado 4.593 bbl por falla, en promedio» | «8 fallas · una cada 46 días», pie «le ha costado 2.765 bbl por falla, en promedio» |
| Por qué parte · % de bbl | sobre las fallas (no disparos) con parte: bbl de cada parte ÷ total, las 2 mayores, `n0` % | «sello mecánico 72 % · rodamientos 28 %» | «sello mecánico 95 % · motor eléctrico 5 %» |
| Si para ahora | solo bomba en marcha con colchón: «el tanque aguanta <fmtHoras(h)> · luego se pierden <n0> bbl/d»; si el respaldo absorbe toda el agua, «no cierra pozos: el respaldo absorbe toda el agua» | — (está parada) | «el tanque aguanta 10 h · luego se pierden 783 bbl/d» |
| Qué se está haciendo | pregunta abierta → «Espera que se identifique el daño · hace N h» + «no arrancar»; pozo cerrado por otro → «Su pozo está bien · espera a <equipo>»; falla abierta → «Parada por <parte> · lleva N h · suele durar <MDT>»; perdiendo → motivo; en riesgo con parte → «<Parte> avisa · límite en <fmtHoras>» + ⓘ «Mantenimiento tiene la acción en su pantalla.»; en riesgo sin parte (un servicio: K-101) → su estado con mayúscula («En marcha · degradado») + ⓘ con su lectura; bomba o electrosumergible sin nada → «En marcha · ninguna parte avisa»; un pozo sin electrosumergible → su estado; un servicio que no está en riesgo ni cerrando pozos → «<Estado> · sin efecto en la producción hoy» (SE-2 de Morichal: «En servicio · corriente de barraje subiendo · sin efecto en la producción hoy», con su lectura en el ⓘ si está en aviso) (`FichaEjecutiva.tsx:47-73`) | «Espera que se identifique el daño · hace 10,1 h» + chip «no arrancar» | «Succión y filtro de entrada avisa · límite en 43 h» |

Para un pozo cerrado por otro (LC-07): «Cerrado por P-201B desde 2 de oct, 05:46», «Le ha costado 0 bbl en …», pie «330 bbl desde 01 de oct de 2025 · 16 mil USD» (lo que se le cargó al propio pozo en la historia), «Cada cuánto falla · No ha fallado · 3 disparos que volvieron a arrancar», «Qué se está haciendo · Su pozo está bien · espera a P-201B» + ⓘ «Lo cerró P-201B. Vuelve a producir cuando esa causa se resuelva.».

**Fila de la lista de equipos** (`pedirFilasEquipos`, `shared/api/equipos.ts:151-163`): `eventos` = eventos cargados; `bblHistoria`; `fallas` (solo bombas); `mtbfDias`: en bombas, el MTBF de fallas; **en los demás equipos, días ÷ eventos cargados con ≥ 2** (es «cada cuánto cierra pozos», no un MTBF de falla). Demo: La Ceiba P-201B 10 eventos, 38.838 bbl, 9 fallas, 40,7 d; K-101 6 eventos, 17.277 bbl, 61,1 d; SE-2 La Ceiba 30 eventos, 2.150 bbl, 12,2 d; Morichal SE-2 59 eventos, 103.771 bbl, 6,2 d.

---

### El equipo vivo (`EquipoVivo`)

**Qué es.** El equipo como se ve hoy, sea del catálogo (bomba, servicio, medición) o un pozo. `GET /api/vistas/equipos/:campo/:equipo` (`equipo-vivo.ts:25-89`). El campo que se compara es `marcha` (`en-marcha`, `detenido`, `cerrado-por-otro`, `sin-lectura`); `estado` es solo texto.

- **Catálogo**: `equipoEnCampo` + `conRespaldoFirmado` (la redundancia y lo que hay aguas abajo de una bomba salen del respaldo firmado: «sin respaldo» si `libreBpd = 0`, el `detalle` si > 0, «respaldo sin declarar en la configuración» si no hay; aguas abajo: transporte «N pozos», recobro «soporte de presión del yacimiento», disposición «todo el campo» / «la parte del campo que el respaldo no cubre» / «sin declarar: falta el respaldo en la configuración»). El dispositivo fiscal (`FQI-0101` de la LACT) reemplaza su serie por el fiscal de los últimos 12 días, con `null` en los días sin dato; sin dato del último día, `valor: null` y estado «sin señal» (`equipo-vivo.ts:34-44`). En todo `/vistas/equipos/:campo/:equipo` del demo hay 9 dispositivos sin lectura (antes del 9-oct, 54: con 18 pozos de La Ceiba parados había muchas más señales de fondo sin lectura), todos con `valor: null` y ninguno con «—» (`verificar-libro` §19).
- **Pozo**: severidad, marcha y estado según 1.2 (cap. 1); dispositivo «Estado del controlador» + las señales de la ESP (sin lectura → `valor: null`, sin unidad y estado «sin señal», nunca 0 ni un texto como «—»; `equipo-vivo.ts:66-73`); `lectura` = «<texto de la causa>. Se le carga a <equipo>.», o «<parte>: avisa.», o «Produciendo dentro de banda.».

**Ejemplo con los datos del demo.** La Ceiba P-201B: severidad 1, `detenido`, «P-201A y P-201C en paralelo, con 30.100 bbl/d libres entre las dos: el cabezal de disposición las limita a unos 89.250 cada una», «la parte del campo que el respaldo no cubre», lectura «Detenida. P-201A y P-201C no alcanzan a tomar toda su agua: el tanque llegó al alto-alto y hubo que cerrar parte de los pozos.». Morichal P-201B: severidad 2, `en-marcha`, «en marcha · succión cayendo», «Las otras seis bombas del tren, con 39.500 bbl/d libres entre todas: el cabezal de disposición las limita a unos 86.500 cada una». MPP-301: severidad 3, «en marcha · perdiendo eficiencia», «sin respaldo», «3 pozos». K-101 La Ceiba: severidad 1, «en marcha · degradado», «3 unidades (N+1)», «todo el campo».

**Referencia.** `equipo-vivo.ts`, `entities/equipos.ts:426-499`.
