# 5C.4 · Electrosumergibles: variador, sensor de fondo, fallas y la flota

La **electrosumergible** (ESP, *electrical submersible pump*, API RP 11S) es una bomba centrífuga
multietapa con su motor eléctrico, bajada al fondo del pozo con el cable de potencia. En Colombia es
el sistema de levantamiento de la mayoría de los pozos de crudo pesado con mucha agua. Es el otro
equipo de **alto impacto** del producto: cuando falla, todo el crudo de su pozo se pierde hasta que
un equipo de reacondicionamiento (taladro) la saca y la cambia, lo que toma días. En Morichal la
falla cerrada promedio dejó el pozo **20,3 días** fuera.

TRIM no ve la bomba por dentro: ve lo que miden el **variador** de superficie (VSD: corriente,
frecuencia, desbalance de corriente entre fases) y el **sensor de fondo** (presión de entrada a la
bomba, PIP, y temperatura del motor). Todo el vigía de la ESP sale de esas cinco variables
(`src/entities/esp.ts`).

---

### Las cinco señales de la electrosumergible (`PLANTILLA_ESP`)

| Variable (`id`) | ISA | Nombre | Dónde | Anuncia (ISO 14224 B.2) | Sentido | Por qué |
|---|---|---|---|---|---|---|
| `corriente` | II | Corriente del motor | Variador | 1.6 Agarrotamiento | sube | A frecuencia fija, la bomba se frena por sólidos o roce y la carga sube. |
| `frecuencia` | SI | Frecuencia | Variador | – | – | (sin alarma: no se proyecta) |
| `pip` | PI | Presión de entrada | Sensor de fondo | 5.1 Bloqueo o taponamiento | baja | Cae hacia el punto en que la bomba empieza a manejar gas o a quedarse sin fluido. |
| `t_motor` | TI | Temperatura del motor | Sensor de fondo | 2.7 Sobrecalentamiento | sube | Sube cuando falta enfriamiento o el protector deja entrar fluido. |
| `desbalance` | II | Desbalance de corriente entre fases | Variador | 4.5 Falla de tierra o aislamiento | sube | Crece a medida que el aislamiento del motor o del cable se degrada. |

Cada señal viaja como una `Senal` igual que las de las bombas (`/vistas/pozos/:campo/:pozo` →
`senales[]`), con su `serie`, `normal`, `alarma` (con `fuente: "Ajuste de protección del variador
del pozo (configuración del pozo)"`), `limite`, `mecanismo`, `tendencia` y `pronostico`. El tag es
el del controlador más la variable («VSD-MN07 · corriente») o el del sensor
(«PIT-MN07 · sensor de fondo», «TIT-MN07 · sensor de fondo»).

### Banda y alarma de la ESP: los ajustes de protección del variador

**Qué es.** En la electrosumergible no hay base maestra de alarmas por máquina: los límites son los
**ajustes de protección del variador de cada pozo** (configuración del pozo, no un número del
producto). Viajan con cada señal.

**De dónde salen en producción.** Del variador (lectura de sus parámetros) o de la configuración del
pozo que mantiene ingeniería de producción. **Hoy no tienen endpoint**: CONTRATO.md lo deja pendiente
(«Lecturas de las electrosumergibles»); `referencia/insumos/<campo>/electrosumergibles.json` los trae
con `"endpoint": null` y la forma
`{ pozo, senales: [{ variable, tag, unidad, serie, normal, alarma }] }`.

**Cómo los arma el demo** (determinista por pozo; `lecturas`, `esp.ts:56-87`). Con valores base
sorteados por una semilla del pozo — corriente $I_0 \in [35, 85]$ A, presión de entrada
$P_0 \in [350, 900]$ psi, temperatura $T_0 \in [95, 125]$ °C, desbalance $D_0 \in [1; 3{,}5]$ % — y la
frecuencia de la prueba vigente (55 Hz si no hay):

| Variable | Banda normal | Alarma |
|---|---|---|
| corriente | $[0{,}85\,I_0;\ 1{,}12\,I_0]$ | alta $\text{round}(1{,}25\,I_0)$, baja $\text{round}(0{,}65\,I_0)$ |
| frecuencia | $[f-1;\ f+1]$ | ninguna |
| presión de entrada | $[0{,}7\,P_0;\ 1{,}2\,P_0]$ | baja $\text{round}(0{,}35\,P_0)$ |
| temperatura del motor | $[T_0-10;\ 135]$ | alta 150 °C |
| desbalance | $[0;\ 5]$ % | alta 10 % |

Las series son doce valores diarios que terminan en AHORA, con ruido de ±0,6 % del valor base.
Cuatro pozos llevan una tendencia a propósito (pendiente diaria como fracción del base, `TENDENCIAS`):
MN-07 corriente +1,6 %/d (arranca en 1,07 × base); MN-18 presión de entrada −3 %/d (arranca en
0,72 × base); MN-27 temperatura del motor +0,85 %/d (arranca en 1,06 × base); GU-04 desbalance
(4 + 0,44·i %). GU-07 trae el desbalance ya fuera de banda (`YA_FUERA`), pero está parada.

**Ejemplo real: MN-07.** $I_0 = 80$ A → banda 68–89,6 A; alarma alta 100 A, baja 52 A; frecuencia
59 Hz (banda 58–60, sin alarma); presión de entrada banda 532,7–913,2 psi, alarma baja 266 psi;
temperatura del motor banda 110–135 °C, alarma 150 °C; desbalance 0–5 %, alarma 10 %.

---

### Estado y lectura de cada señal

**Fórmula.** Con el pozo **produciendo** (sin evento abierto, o solo con un evento de frecuencia
reducida `HZ`; `estadoAhora`, `pozos.ts:167-173`):

- valor = último de la serie; estado = `estadoDe(valor)` (5C.1: alarma si ≥ alta o ≤ baja; atención
  si fuera de banda; si no, normal).

Con el pozo **parado** (cualquier evento abierto que no sea `HZ`):

| Variable | valor | estado | origen |
|---|---|---|---|
| corriente, frecuencia (`MEDIDA_CON_MOTOR_PARADO`) | **0** (se mide) | `normal` (la alarma baja es consecuencia de la parada, que ya marca el controlador: alarmas por estado, ISA-18.2) | «variador del pozo» |
| presión de entrada, temperatura del motor, desbalance | **`null`** | `sin señal` | «sensor de fondo · sin lectura con el motor parado» / «variador del pozo · sin lectura con el motor parado» |

Con el pozo parado **no se proyecta**: `motivo` «El pozo está parado: no hay tendencia que proyectar».

**Ejemplo real: MN-41** (parada desde el 3 de sept, 06:40, código GF, aislamiento): corriente 0 A
normal, frecuencia 0 normal, presión de entrada / temperatura / desbalance `null` «sin señal».
Ingeniería ve SEÑALES DEL POZO con el rótulo «sin lectura: motor parado»; operación no ve ningún
panel de sin señal (es lo esperado).

**Operación vs ingeniería en el detalle del pozo.** Ingeniería: todas las señales (panel SEÑALES DEL
POZO). Operación: solo **FUERA DE BANDA** (estados aviso, atención o alarma) y **SIN SEÑAL · con el
pozo produciendo** (`senalesParaOperar`). MN-07 en operación: FUERA DE BANDA con la corriente
(▲ 99,8 A, «normal 68,0 – 89,6 · alarma 52,0 y 100,0»).

---

### Salud por parte de la electrosumergible (`saludDeEsp`)

**Qué es.** El mismo evaluador de 5C.3 con el catálogo `PARTES_ESP`, todas las variables
instrumentadas, «detenido» = el pozo no produce y **`parteFallo` = `parteQueFallo(p, ctx)`**: la parte
de la causa del evento abierto del pozo cuando esa causa es **su propia** electrosumergible (código del
variador `GF`/`PH`/`OL`/`UL`/`OT`, o declarada con la parte); cerrado por otro equipo, a frecuencia
reducida o produciendo, ninguna (`esp.ts:136-161`). `saludDeEsp(p, ctx)` pide el contexto (la causa
depende de las respuestas y del programa firmado), así ningún llamador se puede saltar la parte que
falló.

**Ejemplo con los datos del demo: MN-07, Morichal** (produce; corriente 99,8 A en `atencion`,
cruza la alarma de 100 A en 3,794 h, rango 3,644–3,958 h; el resto en banda):

| Parte | Variables (papel) | Estado | Prioridad | Frase corta |
|---|---|---|---|---|
| Bomba de fondo (eje y etapas) | corriente (anuncia) anormal y cruza; presión de entrada (confirma) | **fuera** | 2 ▲ | «corriente del motor · alarma en 4 h» |
| Aislamiento del motor y del cable | desbalance (anuncia) 2,5 % estable; corriente (confirma) anormal | **fuera** | 2 ▲ | «corriente del motor · alarma en 4 h» |
| Admisión y separador de gas | presión de entrada (anuncia) 763,7 psi sin tendencia; corriente (confirma) anormal | **fuera** | 2 ▲ | «corriente del motor · alarma en 4 h» |
| Motor de fondo | temperatura del motor (anuncia) cruza en 8.712 h; corriente (**la daña**) anormal y cruza | **avisa** | 2 ▲ (causa activa) | «corriente del motor · cruza en 4 h» |
| Protector (sello del motor) | temperatura del motor (anuncia) 8.712 h > 90 d; desbalance (confirma) | **estable** («tendencia lenta») | 0 | «temperatura del motor · más de 3 meses» |

La peor parte (`partes[0]`) es la **Bomba de fondo**: en la flota, la columna «Ahora» dice
**Bomba de fondo (eje y etapas) · fuera de banda · corriente del motor · alarma en 4 h**; el globo y
el papel: «corriente del motor salió de su banda normal; llega a su alarma en 4 h». Una corriente
que sube confirma también aislamiento y admisión: con la ESP produciendo, una variable que confirma
y está fuera de banda pone la parte «fuera» (regla del contrato), por eso tres partes salen fuera.

Otros pozos del demo:

| Pozo | Peor parte | Señal | Pronóstico (pantalla) |
|---|---|---|---|
| MN-18 (Morichal) | Admisión y separador de gas · fuera (P2) | presión de entrada | «presión de entrada · alarma en 30 h · 30–31 h» (30,16 h) |
| MN-27 (Morichal) | Protector (sello del motor) · fuera (P2) | temperatura del motor | «temperatura del motor · alarma en 10,9 d · 10,2–11,6 d» (261,5 h) |
| GU-04 (Guacamayo) | Aislamiento del motor y del cable · fuera (P2) | desbalance 8,9 % | «desbalance de corriente entre fases · alarma en 2,5 d · 2,5–2,6 d» (61,08 h) |
| MN-41 (Morichal), parada por falla a tierra (`GF`) desde el 3-sep | Aislamiento del motor y del cable · **falló** (P1 ◆); las demás partes «equipo detenido» (P0) | – | «causa de la parada» |
| GU-07 (`GF`) y GU-09 (`PH`, desbalance de fases), Guacamayo | Aislamiento · **falló** (P1 ◆) | – | «causa de la parada» |
| Resto de Morichal (36 en marcha) | Aislamiento · estable | – | – |
| Las 15 de La Ceiba | detenidas (P0): las cierra la parada abierta de P-201B (14 con código CMD, 1 con LSHH); la flota dice «cerrado por P-201B» en gris | – | – |

**Casos borde.** Una ESP parada por su propia falla sale «falló» en la parte de su causa (antes del
8-oct nadie le pasaba `parteFallo` y salía «equipo detenido»: ver «Huecos», 1). Las 3 del demo paradas
por sí mismas (MN-41, GU-07, GU-09) salen así; las 15 cerradas por otro equipo (La Ceiba, por P-201B)
no tienen parte que falló (`verificar-libro` §18). En `/vistas/pozos` → `salud` (= `partes[0]`) MN-41
pasa de `detenida`, prioridad 0, a `fallo`, prioridad 1 (`referencia/salud/pozos-morichal-2026-09.json`;
GU-07 y GU-09 en `pozos-guacamayo-2026-09.json`). Un pozo sin electrosumergible no tiene partes
(`saludDeEsp` → `[]`): su parada se explica con las causas de pozo.

**Quién lo calcula y por dónde viaja.** Servidor. `/vistas/pozos/:campo/:pozo` → `senales`,
`partes`, `historial`; `/vistas/pozos` → `salud` (= `partes[0]`); `/vistas/electrosumergibles` →
`[{ fila, partes, historial }]`; `/vistas/equipos-hoy` y `/vistas/equipos/:campo/:equipo` (la salud
dentro de `EquipoVivo`, `equipo-vivo.ts:52`).

---

### Falla vs disparo (`DISPARO_MAX_H = 24`)

**Qué es.** En la electrosumergible, un evento propio que **vuelve a arrancar en menos de 24 h** es
un **disparo** (*trip*), no una falla. La falla es la que obliga a sacar el equipo del pozo, y eso
tarda días. Contarlas juntas hundiría el MTBF.

**Fórmula** (`esDisparo`, `src/entities/libro.ts:450-455`):

$$
\text{disparo} \iff \text{causa} = \text{electrosumergible} \ \land\ \text{fin} \ne \text{null} \ \land\ \frac{\text{fin} - \text{inicio}}{1\ \text{h}} < 24
$$

Solo aplica a la ESP: la parada de una bomba de superficie siempre es falla (siempre se revisa). Una
ESP con el evento abierto **no** es disparo aunque lleve menos de 24 h (todavía no arrancó).

**Qué es una falla.** Una parada **propia** del equipo: no la que causó otro equipo (servicio caído,
bomba de la línea parada) ni la del programa aprobado (`historialDeEquipo` → `armarHistorial`, `libro.ts:1227-1280`). En la
bomba: paradas de su PLC cuya causa es `reinyeccion` o `transporte` (su propia familia). En la ESP:
eventos del pozo cuya causa es `electrosumergible` con `equipo = pozo`. Una parada que el tanque
absorbió **cuenta como falla con 0 bbl**.

**Ejemplo real: MN-07** — 7 eventos propios en 12 meses, todos disparos (el más largo, 3,75 h del 4 de
mayo, por admisión): 0 fallas, 7 disparos. Por parte: admisión 4 disparos (219 bbl), bomba 2 (61 bbl),
aislamiento 1 (34 bbl).

**Qué texto se muestra.** Detalle del pozo (ingeniería): cifra «Electrosumergible · 12 meses» →
**«0 fallas»** con pie «7 disparos», y ⓘ «Fallas y disparos»: «Un disparo es una parada que vuelve a
arrancar en menos de 24 h: no es una falla. La falla es la que obliga a sacar el equipo del pozo.»

---

### Historia de fallas del equipo (`HistorialEquipo`): MTBF y horas fuera

**Qué es.** Las métricas de confiabilidad de ISO 14224 de un equipo, sobre la historia que hay
(desde el primer mes del calendario hasta AHORA: **366,58 días** en el demo, «12 meses»).

**Fórmulas.**

$$
\text{MTBF}_{\text{días}} = \begin{cases} \dfrac{D}{n_f} & n_f \ge 2 \\ \text{no se calcula} & n_f < 2 \end{cases}
\qquad
\text{MDT}_{\text{h}} = \frac{1}{|F_c|}\sum_{e \in F_c} (\text{fin}_e - \text{inicio}_e)
$$

$$
\text{bbl por falla} = \frac{1}{|F_c|}\sum_{e \in F_c} \text{bbl}_e
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $D$ | días de historia: $(\text{AHORA} - \text{inicio del calendario})/24\ \text{h}$ | d | calendario (`dias`) |
| $n_f$ | fallas (sin disparos), **incluida la abierta** («ya falló») | – | eventos del PLC / variador |
| $F_c$ | fallas **cerradas** (la abierta lleva horas y barriles parciales) | – | – |
| $\text{bbl}_e$ | barriles que el libro le cargó a ese evento (0 si el tanque o el respaldo lo absorbieron) | bbl | libro |

Por parte (`porParte`): lo mismo restringido a los eventos de esa parte, con `disparos`, `bbl` (de
todos sus eventos, también disparos) y `ultima`. Ordenadas por bbl y luego por fallas.

**Ejemplo con los datos del demo.**

| Equipo (campo) | Fallas | Cerradas | MTBF | Horas fuera (MDT) | bbl por falla | Texto |
|---|---|---|---|---|---|---|
| P-201B (Morichal) | 8 | 8 | 366,58 / 8 = 45,8 d | 47,09 h | 3.364,6 | placa: «8 fallas en 12 meses · cada 46 d · 47,1 h fuera · le ha costado 3.365 bbl por falla» |
| MPP-301 (Morichal) | 7 | 7 | 52,4 d | 48,68 h | 3.433,5 | «7 fallas en 12 meses · cada 52 d · 2,0 d fuera · le ha costado 3.434 bbl por falla» |
| MN-05 (Morichal) | 1 | 1 | — (< 2 fallas) | 394,38 h | – | tabla: «—» en «Entre fallas» |
| MN-41 (Morichal) | 1 (abierta) | 0 | — | — | – | «—» |
| MN-07 (Morichal) | 0 | 0 | — | — | – | «0 fallas», «7 disparos» |

En el demo **ninguna electrosumergible tiene dos fallas**: la columna «Entre fallas» de la flota es
«—» en todas, y el detalle del pozo nunca dice «1 falla cada N d».

«bbl por falla» es lo que el equipo **ya costó** por falla y se rotula «le ha costado por falla»; no
es el «si falla hoy» de Riesgo (crudo de hoy × horas fuera, 5B.5).

**Casos borde.** Sin fallas cerradas: no hay MDT ni bbl por falla. Una falla abierta cuenta para el
MTBF pero no para el MDT. Horas fuera incluye la espera (repuesto, taladro); la reparación activa sale
de las órdenes de SAP (capítulo SAP: los tres relojes).

**Quién lo calcula y por dónde viaja.** Servidor (`historialDeEquipo`). En `/vistas/bombas` →
`veredicto.historial`; `/vistas/pozos/:campo/:pozo` → `historial`; `/vistas/electrosumergibles` →
`historial`; `/vistas/confiabilidad` → `h`; `/vistas/equipos/:campo/:equipo/historia` → `bomba`.

---

### Pantalla «Electrosumergibles» (la flota)

**Dónde se ve.** `#/conf/esp/morichal/curso` (confiabilidad), `#/jefe/esp/…`, `#/prod/esp/…`
(ingeniería); `#/sup/esp/…`, `#/oper/esp/…`, `#/tec/esp/…` (operación). Solo campos cuyo perfil
firmado tiene electrosumergibles (`pedirFlotaEsp`); un campo sin ESP muestra «\<ámbito\> no tiene
pozos con electrosumergible.» (Palmar: «no tiene electrosumergibles en su perfil»).

**Cifras de la cabecera** (`src/pages/Esp.tsx`):

| Rótulo | Fórmula | Pie | Morichal, mes en curso |
|---|---|---|---|
| En falla ahora | «$a$ de $N$» con $a$ = pozos que **no producen** y cuya causa es su electrosumergible; marca ◆ si $a > 0$ | «X bbl/d perdiéndose» = Σ crudo asignado de esos pozos; si no hay pero hay paradas por otra causa, «las paradas, por otra causa»; si no, «todas produciendo» | **1 de 41** ◆ · «684 bbl/d perdiéndose» (MN-41) |
| Con aviso | pozos que **producen** con alguna parte `fuera` o `avisa` | «X bbl/d en juego» = Σ crudo asignado (como la cabecera de Riesgo; nunca «si fallan»); o «ninguna parte avisa» | **3** · «1.643 bbl/d en juego» (MN-07 606,5 + MN-18 526,1 + MN-27 510,4) |
| Diferido de sus electrosumergibles | fila `electrosumergible` del Pareto por tipo del libro del período: **fallas y disparos** (un disparo no es falla, pero también difiere; la columna «Por su ESP» suma lo mismo) | «N % por \<parte\>» = bbl de la primera fila del Pareto por parte de la familia ÷ diferido ESP; sin parte, «parte sin identificar»; sin nada, «ninguna parada propia»; ⓘ «Lo que se les cargó en el período por su propia electrosumergible: fallas y disparos. Un disparo no es una falla, pero también difiere.» | **1.095 bbl** · «99 % por aislamiento del motor y del cable» (1.083,1 / 1.095,0). Septiembre cerrado: 40.483 bbl · «46 % por aislamiento…» |
| Entre fallas · 12 meses (ingeniería) | $\text{MTBF}_{\text{flota}} = D \cdot N / \sum n_f$ si $\sum n_f > 0$ | «N fallas · M disparos» + ⓘ «Fallas y disparos» | **1.503 d** (366,58 × 41 / 10) · «10 fallas · 267 disparos» |

Operación no ve la cuarta cifra. El gerente no tiene esta pantalla (decisión del 8-oct: su variante, con «Fallas en 12 meses», se quitó; `#/ger/esp/…` cae en su Resumen). Antes del 8-oct la segunda cifra decía «bbl/d si fallan» y la tercera «Diferido por sus fallas» (sumaba los disparos).

**Tabla FLOTA.** Columnas: Pozo (marca `sevPozo`, id, campo en portafolio, Hz) · Ahora ·
Crudo bbl/d · Por su ESP bbl (diferido del período cuya causa es su propia ESP) · y en ingeniería
Fallas · Disparos · Entre fallas («N d» o «—»). «Ahora»:
- parado por otro equipo: «cerrado por P-201B» (gris);
- parado por sí: «parado · aislamiento del motor y del cable» (o el tipo de causa; «sin identificar» si pide respuesta);
- produce con la peor parte `fuera`/`avisa`: nombre en negrita + chip de estado + frase corta; globo con la frase larga;
- si no, el rótulo del estado de la peor parte («estable»).

Marca del pozo (`sevPozo`, `src/widgets/pozos/estado.ts:12-14`): parado por otro → 0; parado por su
ESP (alto impacto) → 1; parado por otra cosa propia → 2; produce frenado (HZ) → 3; produce con la
peor parte fuera/avisa → su prioridad (o 3); si no, 0.

Orden: primero las que tienen marca o producen sin dato; dentro, falló por sí (0) → fuera (1) → avisa
(2) → cerrada por otro (3) → resto (4); luego por horas de la primera señal que cruza; luego por crudo.
Cinco a la vista y «ver N más»; ninguna con marca queda escondida; en el papel salen todas.

**Ejemplo real (Morichal, ingeniería), primeras filas** (Pozo · Ahora · Crudo · Por su ESP · Fallas ·
Disparos · Entre fallas): ◆ MN-41 (57 Hz) · parado · aislamiento del motor y del cable · 684 · 1.083 · 1 ·
0 · —; ▲ MN-07 (59 Hz) · Bomba de fondo (eje y etapas) · fuera de banda · corriente del motor ·
alarma en 4 h · 607 · 0 · 0 · 7 · —; ▲ MN-18 · Admisión y separador de gas · fuera de banda ·
presión de entrada · alarma en 30 h · 30–31 h · 526 · 0 · 0 · 7 · —; ▲ MN-27 · Protector (sello del
motor) · fuera de banda · temperatura del motor · alarma en 10,9 d · 10,2–11,6 d · 510 · 0 · 0 · 10 · —.
Después vienen las 37 sin marca, por crudo: MN-19 (641 bbl/d) es la quinta y última visible; las otras
36 (MN-32 630, MN-40 617, …) quedan tras «ver 36 más» y salen en el papel (`useVerMas`: cinco a la
vista, y una fila de prioridad 1 nunca se esconde).

**Teléfono.** Una tarjeta por pozo: marca, id, «bomba de fondo (eje y etapas) · fuera de banda» (o
«cerrado por …», «parado · …», «en marcha»), crudo bbl/d y «N bbl por su ESP».

**Quién lo calcula.** Servidor: `GET /api/vistas/electrosumergibles?campos&desde&hasta` y
`GET /api/vistas/diferidos` (Paretos). El front solo suma las cifras de la cabecera.

---

### Confiabilidad por familia (pantalla «Confiabilidad»)

**Dónde se ve.** `#/conf/confiabilidad/morichal/curso`, `#/jefe/confiabilidad/…`, planeadora
(`plan`). Solo ingeniería.

**Cifras por familia** (`src/pages/Confiabilidad.tsx:45-53`; tarjeta por familia presente):

$$
\text{MTBF}_{\text{familia}} = \frac{D \cdot N_{\text{familia}}}{\sum n_f} \ (\text{si } \sum n_f > 0), \qquad
\text{MDT}_{\text{familia}} = \text{promedio de horas de todas las fallas cerradas de la familia}
$$

| Familia (Morichal) | Equipos | Fallas | Disparos | Entre fallas | Fuera | bbl en la historia |
|---|---|---|---|---|---|---|
| Bombas de reinyección | 1 | 8 | 0 | **46 d** | 47,1 h | 26.917 |
| Electrosumergibles | 41 | 10 | 267 | **1.503 d** | 20,3 d | 113.847 |
| Bombas multifásicas | 1 | 7 | 0 | **52 d** | 2,0 d | 24.035 |

Más la tarjeta «Historia · 12 meses · eventos del PLC». Globo: «MTBF de la flota: días de historia
por equipo ÷ fallas, sin contar disparos ni paradas que causó otro equipo.»

**«DE QUÉ FALLAN · contra la referencia».** Por familia, las fallas (sin disparos) **con parte
identificada**, por parte, con % del total de la familia y barra; ⓘ con el peso publicado.
Morichal: reinyección «7 FALLAS CON PARTE»: Sello mecánico 5 · 71 %, Succión y filtro de entrada
1 · 14 %, Motor eléctrico 1 · 14 % (la octava falla no tiene parte); electrosumergibles «10 FALLAS
CON PARTE»: Aislamiento 5 · 50 %, Bomba de fondo 2 · 20 %, Motor de fondo 2 · 20 %, Admisión 1 ·
10 %; multifásicas: Sellos 4 · 57 %, Tornillos 2 · 29 %, Lubricación 1 · 14 %.

**«CALIDAD DEL REGISTRO»** (cómo se supo la parte de cada falla): Morichal, 25 fallas de 43 equipos:
señal 22 (88 %), firma 2 (8 %), declarado 0 (0 %), ninguno 1 (4 %).

**«LOS MÁS COSTOSOS»** (12 con más bbl en la historia; columnas Equipo · Fallas · Entre fallas · Fuera ·
Parte · **le ha costado por falla** · bbl; la penúltima, nueva el 8-oct, es `h.bblPorFalla` con «—» si
no tiene fallas cerradas, y se oculta en el teléfono como «Entre fallas» y «Fuera»): P-201B 8 · 46 d ·
47,1 h · Sello · 3.365 · 26.917; MPP-301 7 · 52 d · 2,0 d · Sello · 3.434 · 24.035; MN-41 1 · — · — ·
Aislamiento · — (su falla sigue abierta) · 19.721; MN-06 1 +4 · — · 28,9 d · Aislamiento · 16.005 · 16.206;
MN-11 · 12.133 · 12.371; MN-08 · 11.416 · 11.823; … (`src/pages/Confiabilidad.tsx:115-137`).

**Quién lo calcula.** Servidor: `GET /api/vistas/confiabilidad?campos` → `[{ campoId, equipo, familia,
h }]`; las cifras por familia las suma el front.
