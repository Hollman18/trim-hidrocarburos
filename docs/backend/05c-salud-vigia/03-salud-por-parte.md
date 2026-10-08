# 5C.3 · Salud por parte: qué parte está por fallar y con qué prioridad

El vigía no habla de variables sueltas: habla de **partes**. Tres variables que se mueven juntas
(la barrera del sello pierde nivel, la presión de barrera baja, la descarga se calienta) dicen una
sola cosa: el sello. Agruparlas da una alerta con nombre y fecha, que es lo que un técnico
convierte en una orden de trabajo y un planeador en un pedido de repuesto (`src/entities/partes.ts:1-15`).

La **parte** es el **ítem mantenible** de ISO 14224 (nivel 8 de la taxonomía): contra ella se
registra la falla en el CMMS (en SAP PM, la «parte del objeto», catálogo B; ver 5C.6). El catálogo
de partes es **librería del producto**, versionada por familia; no se escribe por cliente.

Un solo evaluador sirve para la bomba de reinyección, la multifásica y cada electrosumergible:
`evaluarPartes` (`src/entities/salud.ts:101-152`).

---

### El papel de cada variable en una parte

| Papel (código) | Rótulo en pantalla | Qué quiere decir | ¿Da fecha? | ¿Pone la parte «fuera»? |
|---|---|---|---|---|
| `avisa` | «anuncia» | Su tendencia anticipa la falla de la parte | Sí | Sí, si está anormal |
| `causa` | «la daña» | Es lo que daña a la parte: vigilarla es vigilar la causa | Sí | No: si está anormal, la parte **avisa** con «riesgo activo» (`causaActiva`) |
| `confirma` | «confirma» | Cambia cuando la falla ya empezó | **No** | Sí, si está anormal y el equipo está **en marcha** |

---

### Catálogo de partes por familia

**Bombas de inyección y disposición** (API 610 / HPS; `PARTES_INYECCION`, `partes.ts:67-120`).
Instrumentos de P-201B en esta fase: PI-2010, PDI-2011, FI-2011, VI-2011, TI-2011, LSH-2013,
II-2011, LT-2012 (`bombas.ts:144-153`).

| Parte (`id`) | Nombre | Ítem ISO 14224 | Variables (papel) | Modos B.6 | Qué hacer (se muestra a operación) |
|---|---|---|---|---|---|
| `sello` | Sello mecánico | Sello del eje | presión de succión (la daña), vibración (la daña), fuga del sello (confirma) | ELP, INL | Corregir la succión y revisar el plan de sello; tener el cartucho de repuesto en sitio antes de que la fuga crezca. |
| `succion` | Succión y filtro de entrada | Tubería y filtro de entrada | presión de succión (anuncia), nivel del tanque de succión (la daña) | UST, PLU, LOO | Limpiar el filtro o recuperar nivel en el tanque antes de que la bomba dispare por baja succión. |
| `rodamientos` | Rodamientos y cámara de empuje | Rodamiento axial y radial | temperatura de la cámara de empuje (anuncia), vibración (anuncia), nivel de aceite de la cámara (la daña) | OHE, VIB, NOI | Revisar aceite de la cámara de empuje y alineación; programar el cambio con el repuesto en mano. |
| `hidraulica` | Impulsores y desgaste interno | Impulsor y anillos de desgaste | energía por barril (anuncia), caudal (confirma), presión de descarga (confirma) | LOO, PDE | Programar el overhaul en la próxima ventana, comparando contra la curva de fábrica. |
| `motor` | Motor eléctrico | Motor de accionamiento | temperatura de devanado (anuncia), corriente (confirma), velocidad (confirma) | OHE, UST, FTS, VIB | Revisar ventilación y carga del motor; programar la prueba de aislamiento. |

**Bombas multifásicas de doble tornillo** (API 676; `PARTES_MULTIFASICA`, `partes.ts:124-187`):

| Parte | Nombre | Ítem ISO 14224 | Variables (papel) | Modos B.6 | Qué hacer |
|---|---|---|---|---|---|
| `sello` | Sellos mecánicos (cuatro) | Sello del eje | nivel del depósito de barrera (anuncia), presión de barrera (anuncia), temperatura de descarga (la daña) | ELP, ELU, INL | Reponer y vigilar la barrera; cambiar el sello en una ventana programada. |
| `tornillos` | Tornillos y holguras | Rotor de tornillos y camisa | velocidad (anuncia), temperatura de descarga (confirma) | LOO, INL, PDE | Revisar el manejo de arena aguas arriba; programar el cambio de tornillos o camisa. |
| `filtro` | Filtro de entrada | Filtro de succión | caída de presión del filtro (anuncia), presión de succión (confirma) | PLU, LOO | Limpiar o cambiar la canasta del filtro antes del disparo. |
| `rodamientos` | Rodamientos | Rodamientos de la bomba | temperatura de rodamiento (anuncia), vibración (anuncia) | OHE, VIB, NOI | Revisar lubricación y alineación; programar el cambio con el repuesto en mano. |
| `lubricacion` | Lubricación | Sistema de lubricación (API 614) | presión de aceite (anuncia), temperatura de aceite (anuncia) | OHE, PDE | Revisar nivel, filtro y enfriador del aceite. |
| `motor` | Motor eléctrico | Motor de accionamiento | temperatura de devanado, temperatura de rodamiento del motor, vibración del motor (anuncian), corriente (confirma) | OHE, UST, FTS, VIB | Revisar ventilación y carga del motor; programar la prueba de aislamiento. |

**Electrosumergibles** (variador + sensor de fondo; `PARTES_ESP`, `partes.ts:194-250`; detalle en 5C.4):

| Parte | Nombre | Ítem ISO 14224 | Variables (papel) | Modos B.6 | Qué hacer |
|---|---|---|---|---|---|
| `aislamiento` | Aislamiento del motor y del cable | Cable de potencia y devanado del motor | desbalance de corriente entre fases (anuncia), corriente del motor (confirma) | UST, BRD | Programar la prueba de aislamiento desde superficie y tener listo el equipo de reemplazo y el taladro. |
| `protector` | Protector (sello del motor) | Sección sellante | temperatura del motor (anuncia), desbalance (confirma) | INL, OHE | Revisar la tendencia de temperatura y planear el cambio antes de que el motor se aterrice. |
| `bomba` | Bomba de fondo (eje y etapas) | Etapas y eje de la bomba | corriente del motor (anuncia), presión de entrada (confirma) | UST, LOO, PLU | Revisar sólidos y escala; programar tratamiento químico o el cambio de la bomba. |
| `admision` | Admisión y separador de gas | Admisión y separador de gas | presión de entrada (anuncia), corriente del motor (confirma) | UST, LOO | Bajar la frecuencia o revisar el nivel de fluido antes de que dispare por baja carga. |
| `motor` | Motor de fondo | Motor eléctrico de fondo | temperatura del motor (anuncia), corriente del motor (la daña) | OHE, UST | Revisar el enfriamiento (caudal por el motor) y la carga. |

Cada parte trae además `peso` (cuánto pesa entre las fallas, con fuente: ESA 2025 para sellos y
rodamientos, EPRI/IEEE para motores, Mahmud 2026 —673 fallas de ESP en 47 pozos de Libia— para la
electrosumergible) y `anticipacion` (con cuánto avisa). Se muestran en los ⓘ «cuánto pesa» y
«anticipación» de cada parte y salen escritos en el papel. Textos literales en `partes.ts`.

`NOMBRE_PARTE` (`partes.ts:258-271`) es el nombre corto cuando se juntan familias (Pareto, Aciertos,
«Falla más por …»): «Sello mecánico», «Succión y filtro de entrada», «Rodamientos», «Desgaste
interno», «Motor eléctrico», «Tornillos y holguras», «Filtro de entrada», «Lubricación»,
«Aislamiento del motor y del cable», «Protector del motor», «Bomba de fondo», «Admisión y gas».

**Quién lo entrega.** Servidor, como dato de catálogo: `GET /api/catalogo` →
`campos[campo].catalogosDanos[equipo] = { clase, partes: Parte[] }`. La `Parte` también viaja
anidada en cada `SaludParte.parte`.

---

### Estado de una parte (`EstadoParte`)

**Qué es.** El veredicto sobre una parte, en seis valores, con su rótulo (`ESTADO_PARTE`,
`salud.ts:40-47`).

**Dónde se ve.** Chip de cada parte en el detalle de bomba y de pozo, la placa, la columna
«Ahora» de la flota de electrosumergibles, el riesgo, la pregunta de identificación (`sospechosa`).

**Fórmula (algoritmo exacto, `evaluarPartes`).** Para cada parte, con las variables de su catálogo:

1. Clasificar cada variable:
   - no instrumentada en este equipo → `faltan` (bomba: no tiene tag en `perfil.tags`; electrosumergible: siempre instrumentada);
   - con señal numérica → `medidas` (o `sinSenal` si `valor === null`);
   - sin señal numérica pero con dispositivo (interruptor) → `discretas` con su estado.
2. Si el equipo está **detenido** (bomba: parada abierta en su PLC **o** `marcha = 'detenido'`;
   ESP: el pozo no produce), las variables que solo **confirman** no cuentan: «con el equipo parado
   leen la parada misma» → $C = \{m \in \text{medidas} : \text{detenido} \Rightarrow \text{papel} \ne \text{confirma}\}$.
3. Una variable está **anormal** si su pronóstico es `cruzado` **o** su instrumento reporta
   `alarma` o `atencion` (no `aviso`).
4. $\text{fuera} = \{m \in C : \text{papel} \ne \text{causa},\ \text{anormal}(m)\}$;
   $\text{causaActiva} = \{m \in C : \text{papel} = \text{causa},\ \text{anormal}(m)\}$;
   $\text{discretaFuera} = \exists d : \text{papel} \ne \text{causa} \land \lnot(\text{detenido} \land \text{papel}=\text{confirma}) \land \text{estado}(d) \in \{\text{alarma}, \text{atencion}\}$.
5. $\text{tendencias} = \{m \in \text{medidas} : \text{papel} \ne \text{confirma},\ \text{proyectable},\ \text{pronóstico} = \text{cruza}\}$,
   ordenadas por horas; $\text{cruzan} = \{m : h \le 2.160\}$; $\text{primera} = \text{cruzan}_0$;
   $\text{coinciden} = |\text{cruzan}|$; $\text{lenta} = \text{tendencias}_0$ solo si $\text{cruzan} = \varnothing$.
6. Estado, **en este orden** (la primera que se cumpla):

| # | Condición | Estado | Rótulo |
|---|---|---|---|
| 1 | La parada abierta se le atribuye a esta parte (`parteFallo`, de la primera alarma o la firma: `causa-senal.ts`) | `fallo` | «falló» |
| 2 | $|\text{fuera}| > 0$ o discretaFuera | `fuera` | «fuera de banda» |
| 3 | Equipo detenido | `detenida` | «equipo detenido» |
| 4 | $|\text{cruzan}| > 0$ o $|\text{causaActiva}| > 0$ | `avisa` | «avisa» |
| 5 | Sin medidas ni discretas (nada instrumentado o todo sin señal) | `sin-dato` | «sin dato» |
| 6 | En otro caso | `estable` | «estable» |

Consecuencias que el backend debe reproducir:
- La causa activa («la daña» anormal) hace **avisar**, no «fuera».
- Con el equipo detenido una parte nunca «avisa»: o falló, o algo que anuncia está fuera, o está «detenida».
- Una parte sin instrumentos en un equipo detenido sale «detenida», no «sin dato».
- La tendencia que cuenta incluye las de papel `causa` (la daña) y `avisa`, no las `confirma`.

**Ejemplo con los datos del demo: P-201B, Morichal, en marcha.**

| Parte | Medidas (papel) | Cálculo | Estado | Prioridad |
|---|---|---|---|---|
| Succión y filtro de entrada | PI-2010 (anuncia) 8,8 psi `atencion`, cruza 43,09 h; LT-2012 (la daña) 61,8 % normal | PI-2010 anormal y anuncia → fuera | **fuera** | 2 (la de `atencion`) |
| Sello mecánico | PI-2010 (la daña) `atencion`; VI-2011 (la daña) normal; LSH-2013 (confirma, discreta) `normal` | PI-2010 anormal y la daña → causaActiva; cruza 43,09 h → primera | **avisa** | 2 (hay causa activa) |
| Rodamientos y cámara de empuje | TI-2011 (anuncia) cruza 4.145 h; VI-2011 (anuncia) ruido; falta nivel de aceite (LT) | ninguna cruza ≤ 90 d → lenta = TI-2011 | **estable** («tendencia lenta») | 0 |
| Impulsores y desgaste interno | FI-2011 y PDI-2011 (confirman) normales; falta energía por barril (JI) | – | **estable** | 0 |
| Motor eléctrico | II-2011 (confirma) normal; faltan temperatura de devanado (TE) y velocidad (SI) | – | **estable** | 0 |

MPP-301, Morichal: Filtro de entrada **fuera** (P2: PDT-3011 9,6 psi `atencion`, cruza 124,3 h);
Rodamientos **avisa** (P3: VT-3013 248,2 h y TE-3013 644,1 h → `coinciden` = 2); Tornillos y holguras
**avisa** (P3: SI-3016 420,3 h); Sellos mecánicos (cuatro) **avisa** (P3: LT-3017 792,5 h);
Lubricación y Motor eléctrico **estable**.

La Ceiba, P-201B detenida desde el 2 de oct, 03:52 (evento `EV-2011-1002`, sin parte identificada:
`parteFallo` vacío): las cinco partes **detenidas** (P0). VI-2011 lee 0 mm/s en `normal`; caudal,
descarga y corriente en `alarma`, pero solo confirman y con el equipo parado no cuentan.

**Casos borde.**

| Caso | Resultado |
|---|---|
| Variable del catálogo que no está en la plantilla de la familia | Se ignora. |
| Instrumento de bomba con `valor: null` | **Hueco**: `senalesDe` exige `typeof valor === 'number'` (`vigia.ts:141`), así que la variable cae a `discretas` con estado «sin señal» en vez de a `sinSenal` (ver «Huecos y dudas»). |
| Todo lo de la parte sin señal (equipo en marcha) | `sin-dato`. |
| Interruptor en `alarma` | discretaFuera → `fuera` con prioridad **2** (no 1; ver «Huecos»). |

**Quién lo calcula y por dónde viaja.** Servidor. `SaludParte[]` (de la que más preocupa a la que
menos) en `GET /api/vistas/bombas` → `partes`; `GET /api/vistas/pozos/:campo/:pozo` → `partes`;
`GET /api/vistas/electrosumergibles` → `[].partes`; `GET /api/vistas/pozos` → `salud` (solo la
primera de la electrosumergible); `GET /api/vistas/paradas/:evento/opciones` → `sospechosa` (la
primera parte `fuera` de una bomba con la parada **abierta**: P-201B Morichal daría `succion`;
MPP-301, `filtro`). Tipo `SaludParte` (`salud.ts:63-82`):
`{ parte, estado, prioridad, primera?, coinciden, lenta?, causaActiva[], fuera[], medidas[], discretas[], sinSenal[], faltan[] }`.

**Referencia.** `src/entities/salud.ts`; `src/entities/esp.ts:137-146`; CONTRATO.md «Salud por parte».
Casos: `referencia/salud/bombas-<campo>-2026-09.json` (`partes` de cada bomba),
`referencia/salud/pozos-<campo>-2026-09.json` (`salud` de cada pozo; requiere
`insumos/<campo>/electrosumergibles.json`), `referencia/riesgo/<campo>.json`.

---

### Prioridad de la parte (ISA-18.2)

**Qué es.** La prioridad de la marca de la parte. ISA-18.2 prioriza por **consecuencia y tiempo
para responder**; solo lo anormal lleva color.

**Fórmula.**

$$
\text{prioridad} = \begin{cases}
1 & \text{fallo} \\
\min\left(\min_{m \in \text{fuera}} \text{SEV}'(m),\ \text{discretaFuera} ? 2 : 3\right) & \text{fuera} \\
2 & \text{avisa} \land \left(|\text{causaActiva}|>0 \ \lor\ h_{\text{primera}} < 24\right) \\
3 & \text{avisa en otro caso} \\
0 & \text{detenida, estable, sin-dato}
\end{cases}
$$

con $\text{SEV}'(m) = \text{SEV}(\text{estado}(m))$ si no es 0, y **2** si el estado es `normal` (una
variable `cruzado` con su instrumento en normal) (`salud.ts:138-142`). $\text{SEV}$: alarma 1,
atención 2, aviso 3.

| Prioridad | Marca | Nombre |
|---|---|---|
| 1 | ◆ rojo | Prioridad 1 · alarma |
| 2 | ▲ naranja | Prioridad 2 · atención |
| 3 | ■ amarillo | Prioridad 3 · aviso |
| 0 | sin marca, gris | Normal |

**Ejemplo con los datos del demo.** Succión de P-201B (Morichal): fuera por PI-2010 en `atencion` →
$\min(2, 3) = 2$ ▲. Sello de P-201B: avisa con causa activa → 2 ▲. Rodamientos de MPP-301: avisa,
primera a 248,2 h ≥ 24 h, sin causa activa → 3 ■. Bomba de fondo de MN-07: fuera por corriente en
`atencion` → 2 ▲ (aunque cruza en 3,8 h: la regla de < 24 h es solo para `avisa`). Motor de fondo
de MN-07: avisa con la corriente (la daña) anormal → 2 ▲.

**Casos borde.** `fuera` con variable en `alarma` → 1. Prioridad 0 en una parte que avisa no
puede darse; en el riesgo se usa `sp.prioridad || 3` por defensa (`diferido.ts:474, 504`).

**Quién lo calcula.** Servidor; `SaludParte.prioridad`, y `Riesgo.prioridad` (la misma: «la
pantalla no la deduce de las horas»).

---

### Orden de las partes y «la peor parte»

**Fórmula.** Orden por rango de estado: `fallo` 0, `fuera` 1, `avisa` 2, `detenida` 3, `estable` 4,
`sin-dato` 5; a igual rango, por horas de la `primera` (sin primera = ∞); a igual, el orden del
catálogo (orden estable) (`salud.ts:49, 150-151`).

La **peor parte** según quien la use:

| Consumidor | Regla | Código |
|---|---|---|
| Riesgo (`/vistas/riesgo`) | primera con estado `fuera` o `avisa` | `peorParte`, `diferido.ts:409` |
| Placa de bomba (negrita + frase) | primera con `fallo`, `fuera` o `avisa`; si hay parada abierta, no se resalta | `Placa.tsx:23, 97-104` |
| Placa de decisión | primera `fuera` o `avisa`: «En marcha · \<parte\> avisa» | `Placa.tsx:190, 202` |
| Fila de pozos (`/vistas/pozos` → `salud`) y flota ESP | `partes[0]` | `diferidos.ts:249`, `Esp.tsx` |
| Pregunta de identificación (`sospechosa`) | primera `fuera` con la parada abierta | `diferidos.ts:135` |

**Ejemplo.** P-201B Morichal: orden Succión (fuera) → Sello (avisa, 43,09 h) → Rodamientos,
Impulsores, Motor (estables). MPP-301: Filtro (fuera) → Rodamientos (248 h) → Tornillos (420 h) →
Sello (792 h) → Lubricación → Motor. MN-07: Bomba de fondo (fuera, 3,79 h) → Aislamiento (fuera,
sin primera) → Admisión (fuera, sin primera) → Motor de fondo (avisa) → Protector (estable).

---

### Frases de una parte

**Qué es.** Lo que se escribe de cada parte: qué variable lo dice y cuándo, sin repetir el estado
que ya va en el chip.

**Reglas** (`src/widgets/bombas/comun.ts:49-115`, `src/entities/salud.ts:158-168`).

`estadoCorto` (placa):

| Estado | Texto |
|---|---|
| fallo | «causa de la parada» |
| fuera | «fuera de banda» |
| avisa con primera | «cruza en 43 h» (más de 90 d: «cruza en más de 3 meses») |
| avisa sin primera | «lo que la daña, fuera de banda» |
| detenida | «bomba detenida» |
| estable | «tendencia lenta» si tiene `lenta`; si no, «estable» |
| sin-dato | «sin instrumentos» |

`fraseParteCorta` (bajo el nombre; operación; columna «Ahora» de la flota):

| Caso | Texto | Ejemplo real |
|---|---|---|
| fuera, sin señal fuera (solo un interruptor) | «un instrumento suyo reporta alarma» | – |
| fuera, la variable en `alarma` o `cruzado` | «\<variable\> · ya en alarma» | – |
| fuera, la variable cruza | «\<variable\> · alarma \<pronóstico corto\>» | «presión de succión · alarma en 43 h · 41–45 h» (P-201B Morichal); «corriente del motor · alarma en 4 h» (MN-07) |
| fuera, la variable no cruza | «\<variable\>» | – |
| con primera | «\<variable\> · cruza \<pronóstico corto\>» y, si coinciden más, « · +1 señal» / « · +N señales» | «vibración · cruza en 10,3 d · 9,8–11,0 d · +1 señal» (rodamientos de MPP-301) |
| con causa activa sin primera | «**la daña:** \<variable\>» | (no ocurre en el demo: toda causa activa del demo también cruza) |
| con lenta | «\<variable\> · más de 3 meses» | «temperatura de la cámara de empuje · más de 3 meses» |
| fallo / sin-dato / resto | «causa de la parada» / «sin instrumentos» / vacío | – |

`fraseParte` (globo, papel, pista de la flota):

| Caso | Texto | Ejemplo real |
|---|---|---|
| fuera, en alarma | «\<variable\> ya llegó a su alarma» | – |
| fuera, cruza | «\<variable\> salió de su banda normal; llega a su alarma \<pronóstico largo\>» | «presión de succión salió de su banda normal; llega a su alarma en 43 h (41 h a 45 h)» |
| con primera | «\<variable\> cruza su límite \<pronóstico largo\>» + « (y 1 señal más en el mismo sentido)» | «vibración cruza su límite en 10,3 d (9,8 d a 11,0 d) (y 1 señal más en el mismo sentido)» |
| causa activa sin primera | «lo que la daña ya está fuera de banda: \<variable\>» | – |
| lenta | «\<variable\> va hacia su límite, pero en más de 3 meses» | – |

`motivoDeParte` (servidor; texto de `/vistas/riesgo` → `motivo`): «\<Parte\>: \<variable\> salió de
su banda normal; llega a su alarma en **N h**» con $N = \text{round}(h)$ **siempre en horas**, o
«\<Parte\>: \<variable\> ya llegó a su alarma», o «\<Parte\>: \<variable con primera\>». Ejemplos
reales: «Succión y filtro de entrada: presión de succión salió de su banda normal; llega a su alarma
en 43 h»; «Filtro de entrada: caída de presión del filtro salió de su banda normal; llega a su
alarma en 124 h»; «Protector (sello del motor): temperatura del motor salió de su banda normal; llega
a su alarma en 262 h» (en pantalla la misma parte dice «10,9 d»: ver «Huecos»).

---

### Dónde se ve la salud por parte, por nivel de rol

**Placa de la bomba** (estación de bombas, `src/widgets/bombas/Placa.tsx`).

| Nivel | Qué muestra |
|---|---|
| Ingeniería (`conf`, `jefe`) | 4 variables clave de la familia (inyección: presión de succión, presión de descarga, caudal, vibración; multifásica: caída de presión del filtro, vibración, velocidad, nivel del depósito de barrera); bajo «PARTES», cada parte `fallo`/`fuera`/`avisa`/`sin-dato` en su renglón con marca y `estadoCorto`; la peor en negrita con su `fraseParteCorta`; el resto en un renglón gris «N partes estables» (o «con la bomba detenida»), con globo de nombre + estado; pie con la historia: «8 fallas en 12 meses · cada 46 d · 3.365 bbl/falla · 47,1 h fuera». |
| Operación (`sup`, `oper`, `tec`) | Solo las variables fuera de banda («Instrumentos en banda.» si no hay); «PARTES QUE AVISAN» sin el renglón de estables; si ninguna, «Ninguna parte avisa.» |
| Decisión (`ger`) | Sin variables: «En marcha · succión y filtro de entrada avisa», «Falla más por sello mecánico · una cada 46 días». |

Ejemplo real, placa de P-201B en Morichal (ingeniería): ▲ **Succión y filtro de entrada** · fuera de
banda / «presión de succión · alarma en 43 h · 41–45 h»; ▲ Sello mecánico · cruza en 43 h;
renglón gris «3 partes estables» (globo: Rodamientos y cámara de empuje · tendencia lenta;
Impulsores y desgaste interno · estable; Motor eléctrico · estable). MPP-301: ▲ **Filtro de
entrada** · fuera de banda / «caída de presión del filtro · alarma en 5,2 d · 4,7–5,7 d»;
■ Rodamientos · cruza en 10,3 d; ■ Tornillos y holguras · cruza en 17,5 d; ■ Sellos mecánicos
(cuatro) · cruza en 33,0 d; «2 partes estables»; pie «7 fallas en 12 meses · cada 52 d · 3.434
bbl/falla · 48,7 h fuera».

**Detalle de la bomba.**
- Ingeniería: panel **SALUD POR PARTE**, un `BloqueParte` por parte (abierto si `fallo`, `fuera` o
  `avisa`): marca, nombre, frase corta, chip de estado y, si la parte tiene historia, «5 fallas ·
  17.079 bbl». Abierto: la proyección de su `primera`; «QUÉ LA ANUNCIA» (cada variable con su papel
  —anuncia / la daña / confirma—, tag, pronóstico corto o «ya cruzó», y valor o «sin señal» en
  magenta); «Falta instrumentar: nivel de aceite de la cámara (LT)»; «LO QUE HA COSTADO»: fallas ·
  bbl · disparos, «una cada 73 días» (MTBF de la parte, ≥ 2 fallas), «fuera 2,2 d en promedio» (horas
  fuera de sus fallas cerradas), «por falla 3.416 bbl»; ⓘ «qué hacer» (acción + ítem ISO 14224),
  «anticipación», «cuánto pesa».
- Operación: panel **PARTES QUE AVISAN** (cada una con marca, chip, frase corta y **«Qué hacer:»
  escrito**, no detrás de un ⓘ) y panel **FUERA DE BANDA** con los analógicos de las variables no
  normales. P-201B Morichal: 2 partes (Succión y filtro de entrada / Sello mecánico) y 1 variable
  (PI-2010). P-201B La Ceiba, detenida (comprobado en pantalla, `#/oper/bombas/ceiba/curso` → abrir la
  placa): PARTES QUE AVISAN «Ninguna avisa.» y FUERA DE BANDA **3**: presión de descarga PDI-2011
  0 psi, caudal FI-2011 0 bbl/d y corriente II-2011 0 A, las tres ◆ en alarma (las reporta el PLC como
  consecuencia de la parada; la salud no las toma como pista porque solo confirman).

Números reales de «LO QUE HA COSTADO» (historia de 12 meses del PLC):

| Equipo (campo) | Parte | Texto |
|---|---|---|
| P-201B (Morichal) | Sello mecánico | 5 fallas · 17.079 bbl; una cada 73 días; fuera 2,2 d en promedio; por falla 3.416 bbl |
| P-201B (Morichal) | Succión y filtro de entrada | 1 falla · 0 bbl; fuera 3,7 h en promedio; por falla 0 bbl |
| P-201B (Morichal) | Motor eléctrico | 1 falla · 0 bbl; fuera 20,4 h en promedio |
| MPP-301 (Morichal) | Tornillos y holguras | 2 fallas · 9.725 bbl; una cada 183 días; fuera 3,0 d; por falla 4.862 bbl |
| MPP-301 (Morichal) | Sellos mecánicos (cuatro) | 4 fallas · 13.536 bbl; una cada 92 días; fuera 46,9 h; por falla 3.384 bbl |
| P-201B (La Ceiba) | Sello mecánico | 5 fallas · 104.082 bbl; una cada 73 días; fuera 44,8 h; por falla 20.816 bbl |
| MN-07 (Morichal) | Admisión y separador de gas | 0 fallas · 219 bbl · 4 disparos |

(Una parte con 0 bbl en una falla: la parada la absorbió el tanque; cuenta como falla.)

**Detalle del pozo con electrosumergible** (5C.4): ingeniería ve SALUD POR PARTE con el mismo
`BloqueParte`; operación ve PARTES QUE AVISAN con la frase corta (globo con la frase larga) y ⓘ
«qué hacer».

**Riesgo** (`/vistas/riesgo`, capítulo de riesgo): un equipo de alto impacto **en marcha** con una
parte `fuera`/`avisa` genera un `Riesgo` «en riesgo» con `prioridad` = la de la parte,
`estadoParte`, `parte`, `horas`/`rango` de su `primera`, `tag` (de la primera, o de la primera fuera),
`accion` de la parte y `motivo` = `motivoDeParte`. Morichal hoy: P-201B (P2, succión, 43,1 h,
PI-2010), MPP-301 (P2, filtro, 124,3 h, PDT-3011; **no** es alto impacto: multifásica), MN-07 (P2,
bomba, 3,8 h), MN-18 (P2, admisión, 30,2 h), MN-27 (P2, protector, 261,5 h). Una bomba con parada
abierta no entra (ya está «perdiendo»). Solo se vigilan las familias encendidas en el perfil firmado
del campo.
