# 5C.5 · ¿Acierta el vigía? El registro de predicciones y su calificación

Sin un historial, una predicción es una opinión; con él, confiabilidad sabe cuánto creerle. Este
módulo guarda **cada predicción de alto impacto cuando sale**, con su ventana, y la **califica**
contra lo que pasó después: la falla real del PLC y las órdenes cerradas en SAP. Y mira la otra cara:
**las fallas que nadie anunció**, separando las que el vigía podía ver de las que no
(`src/entities/aciertos.ts`).

> **Simplificación del demo (importante).** En el demo no hay un registro guardado: «el registro se
> arma con una regla fija sobre la historia del PLC» (`prediccionesHistoricas`, `aciertos.ts:110-182`),
> coherente con ella y con SAP, y las predicciones vigentes se derivan del riesgo de hoy con una hora
> de emisión inventada. **El backend real no reconstruye nada**: guarda cada predicción en el momento
> en que el vigía la emite, nunca la reescribe y la califica cuando vence. Ver «Qué debe hacer el
> backend real» al final.

---

### La predicción (`PrediccionVigia`)

**Forma** (`aciertos.ts:38-56`; viaja en `GET /api/vistas/predicciones?campos=` → `registro[]`):

| Campo | Tipo | Qué es |
|---|---|---|
| `id` | string | Identificador estable de la predicción |
| `campoId`, `equipo` | string | Equipo de alto impacto (bomba de reinyección o pozo con ESP) |
| `parte?` | `ParteId` | La parte que va a fallar (ítem mantenible) |
| `tag?` | string | El instrumento que la anuncia (`PI-2010`, `VSD-MN07 · corriente`) |
| `accion?` | string | Qué hacer (del catálogo de la parte) |
| `emitida` | ISO | Cuándo la emitió el vigía |
| `desde`, `hasta` | ISO | Ventana en que la parte cruzaría su límite si nada cambia |
| `calificacion` | `seguimiento` \| `acierto` \| `intervenida` \| `falsa-alarma` | En qué quedó |
| `falla?` | `{ id, inicio }` | Si acertó: la falla del PLC que la confirmó |
| `intervencion?` | ISO | Si se intervino: cuándo se cerró en SAP la orden que la atendió |

No confundir con `Prediccion` de `diferido.ts` (qué pasa si una bomba se para ahora).

---

### Calificación de una predicción (`calificar`)

**Qué es.** La regla única con que el servidor califica (`aciertos.ts:64-75`).

**Fórmula.** Con $t_e$ = `emitida`, $t_h$ = `hasta`, $t$ = ahora, y $T = \min(t_h, t)$:

$$
\text{calificación} = \begin{cases}
\text{acierto} & \exists\ \text{falla } f:\ f.\text{campo} = p.\text{campo},\ f.\text{equipo} = p.\text{equipo},\ f.\text{parte} = p.\text{parte},\ t_e \le f.\text{inicio} \le T \\
\text{intervenida} & \text{si no, } \exists\ \text{intervención } i:\ \text{mismo campo y equipo},\ t_e \le i.\text{fecha} \le T \\
\text{falsa alarma} & \text{si no, } t > t_h \\
\text{seguimiento} & \text{si no}
\end{cases}
$$

Reglas que se derivan:
- **Acierto aunque llegue antes de lo previsto**: lo que se anunció fue la parte, no la hora. La
  falla puede caer antes de `desde`; solo tiene que estar entre la emisión y el fin de la ventana.
- **La parte tiene que coincidir.** Una falla del mismo equipo por otra parte no es acierto.
- **Intervenida no es acierto**: es lo que se busca (se intervino antes de fallar), pero no prueba
  que iba a fallar. No entra en la tasa.
- Acierto se evalúa **antes** que intervenida.
- La intervención se cruza por **equipo**, no por parte (ver «Huecos»).
- Las fallas son las del historial del equipo **sin disparos** (5C.4) y con la parte que se sabe
  **hoy**: una parte declarada después por un operario puede volver acierto una predicción ya
  emitida (`ctx` en `prediccionesHistoricas`).

**Ejemplo con los datos del demo (Morichal).**

| Predicción | Emitida | Ventana | Contra qué | Calificación |
|---|---|---|---|---|
| MN-33 · aislamiento | 13 de sept, 02:26 | 15 de sept, 12:02 – 18 de sept, 16:50 | Falla `EP-MN33-260917-72` por aislamiento el 17 de sept, 02:26 (dentro) | **acierto**, 4,0 d antes |
| MN-05 · bomba de fondo | 9 de sept, 21:37 | 12 de sept, 21:37 – 16 de sept, 21:37 | Cambio programado `PR-VIG-MN05-260912-bomba`: orden PM03 `40012059` cerrada el 13 de sept, 18:22 | **intervenida** |
| MPP-301 · rodamientos | 5 de sept, 23:17 | 10 de sept, 04:05 – 15 de sept, 18:29 | Orden PM03 `40012060` cerrada el 7 de sept, 11:17 | **intervenida** |
| MN-40 · aislamiento | 3 de sept, 03:59 | 4 de sept, 23:11 – 7 de sept, 08:47 | Nada; venció | **falsa alarma** |
| MN-41 · aislamiento | 3 de sept, 01:55 | 4 de sept, 21:07 – 7 de sept, 06:43 | Nada en la ventana: su falla a tierra fue el 25 de sept | **falsa alarma** |
| MN-16 · bomba de fondo | 2 de sept, 19:25 | 5 de sept, 05:01 – 8 de sept, 09:49 | Cambio programado `PR-VIG-MN16-260904-bomba`: orden PM03 `40012061` cerrada el 6 de sept, 03:03 | **intervenida** |
| MN-07 · bomba de fondo | 1 de oct, 06:00 | 2 de oct, 17:38 – 17:57 | Ventana abierta | **seguimiento** |
| MN-18 · admisión | 2 de oct, 08:00 | 3 de oct, 19:38 – 20:41 | Abierta | **seguimiento** |
| P-201B · succión | 30 de sept, 17:00 | 4 de oct, 07:20 – 10:59 | Abierta | **seguimiento** |
| MN-27 · protector | 1 de oct, 16:00 | 12 de oct, 19:55 – 14 de oct, 05:16 | Abierta | **seguimiento** |

**Quién lo calcula.** Servidor.

---

### Predicciones vigentes (`prediccionesVigentes`)

**Qué es.** Lo que el vigía tiene anunciado hoy: un `Riesgo` «en riesgo» de alto impacto con horas
(`aciertos.ts:80-89`).

**Fórmula.** Por cada `Riesgo` con `estado = 'en-riesgo'`, `altoImpacto = true` y `horas` definidas
(5C.3, «Riesgo»):

$$
\text{desde} = \text{AHORA} + r_0\ \text{h}, \qquad \text{hasta} = \text{AHORA} + r_1\ \text{h}
$$

con $[r_0, r_1]$ el rango del pronóstico de la primera señal de la peor parte (si no hay rango,
$[h, h]$). `id = PR-<campo>-<equipo>-<parte>-vigente`. Ordenadas por `hasta`.

**Demo:** `emitida = AHORA − (6 + ⌊azar·42⌋)` h, un número fijo por id (FNV-1a): «unas horas antes de
ahora». En producción es la hora real en que el vigía la emitió.

**Ejemplo.** P-201B Morichal: rango [41,336; 44,990] h → desde AHORA + 41,336 h = **4 de oct, 07:20**,
hasta **4 de oct, 10:59**. MN-07: [3,644; 3,958] h → **2 de oct, 17:38 – 17:57**.

**Casos borde.** Las multifásicas **no** son de alto impacto (`altoImpacto = subtipo !== 'multifasica'`):
MPP-301 no genera predicción vigente aunque su filtro cruce en 5,2 d. Una parte `fuera` sin `primera`
(su variable ya en alarma) no tiene `horas` y no genera predicción. Un equipo con parada abierta no
está «en riesgo» (está «perdiendo»).

---

### Registro histórico del demo (`prediccionesHistoricas`): la regla fija

**🔴 Demostración.** El servidor guarda cada predicción cuando sale; el demo la arma así, coherente
con la historia del PLC (`aciertos.ts:110-182`). `azar(s)` es FNV-1a de un texto normalizado a [0, 1):
la misma regla da siempre el mismo registro.

1. **Desde la puesta en marcha** (`PUESTA_EN_MARCHA = 2026-09-01`, 00:00 hora de Colombia). Qué
   predicciones existen se decide con el contexto con que **arrancó** la operación (sin respuestas de
   hoy); el contexto de hoy solo califica.
2. **Aciertos posibles:** por cada falla vista como `vigilada` con parte, si `azar("a|"+id) < 0,7`
   (≈ 7 de cada 10), una predicción con anticipo $A = (2 + \lfloor \text{azar}("l|"+id)\cdot 8\rfloor)$ días:
   $t_e = \text{inicio} - A$; si $t_e$ cae antes de la puesta en marcha, no cuenta (TRIM no estaba);
   ventana $[t_e + 0{,}6A;\ t_e + 1{,}4A]$.
3. **Sobre la flota:** por cada equipo de la flota de alto impacto del campo cuya familia está
   encendida en el perfil, si `azar("x|campo|equipo") < 0,35`, una predicción sobre una parte
   vigilable escogida por `azar("p|…")`, emitida $2 + 22\cdot\text{azar}("e|…")$ días después de la
   puesta en marcha, con plazo $P = 3 + \lfloor 5\cdot\text{azar}("d|…")\rfloor$ días, ventana
   $[t_e + 0{,}6P;\ t_e + 1{,}4P]$, y solo si ya venció. La mitad (`azar("i|…") < 0,5`) lleva
   intervención a $t_e + 1{,}5$ d. **Ojo:** esta regla incluye las multifásicas (MPP-301), que la
   vigente excluye.
4. **Lo que anticipó con tiempo de cambiar** (desde el 9-oct): cada parada del programa que salió de
   una orden predictiva del vigía (`intervencionDelVigia`: el demo la reconoce por su id,
   `PR-VIG-<pozo>-<día>-<parte>`) es una predicción sobre esa parte, con anticipo
   $A = (3 + \lfloor 5\cdot\text{azar}("l|"+id)\rfloor)$ días, emitida en
   $\max(\text{puesta en marcha},\ \text{desde} - 0{,}5A)$, ventana $[t_e + 0{,}6A;\ t_e + 1{,}4A]$ e
   intervención al terminar el cambio (`hasta` − 3 h). No tiene falla: queda **intervenida**. El
   generador del demo escribe esos cambios en vez de la falla para las fallas de desgaste de las
   electrosumergibles (bomba de fondo, admisión, motor) que ocurrían con al menos 5 días de TRIM en
   servicio; las de aislamiento caen en horas y fallan igual. En el demo: MN-16 (4-sep) y MN-05 (12-sep).
5. Se califican todas con `calificar` contra las fallas del contexto de hoy y las intervenciones de
   las reglas 3 y 4.

El demo tiene además las órdenes SAP coherentes: por cada predicción intervenida, `historiaSap` crea
un aviso M1 «El vigía anticipa falla: \<parte\> de \<equipo\>» (origen TRIM, evidencia «Predicción
\<id\> · ventana hasta el \<fecha\>») y una orden **PM03** (predictiva) en TECO con
`cierreTecnico = intervencion` y la acción de la parte como descripción (`src/entities/sap.ts:295-313`).
En el demo: `40012057` (LC-14, La Ceiba, cerrada 26 de sept, 07:26), `40012058` (P-201B, Guacamayo,
14 de sept, 17:23), `40012059` (MN-05, Morichal, 13 de sept, 18:22), `40012060` (MPP-301, Morichal,
7 de sept, 11:17) y `40012061` (MN-16, Morichal, 6 de sept, 03:03). Las dos de las electrosumergibles son
las de los cambios programados de la regla 4: esas paradas no generan además una PM02 (`sap.ts`).

---

### Fallas vistas (`fallasVistas`): ¿el vigía podía verla?

**Qué es.** Cada falla de la flota de alto impacto desde la puesta en marcha, con su visibilidad
(`aciertos.ts:188-241`; viaja en `/vistas/predicciones` → `fallas[]`).

**Fórmula (en este orden).**

| Visibilidad | Condición | Rótulo |
|---|---|---|
| `fuera-de-perfil` | La familia estaba **apagada** en el perfil firmado que **regía en `falla.inicio`** (`configEn(versiones, t)`) | «Familia apagada en el perfil del campo» |
| `sin-parte` | La falla no tiene parte identificada | «Sin parte identificada: no se sabe qué mirar» |
| `vigilada` | La parte es vigilable: ESP siempre; bomba, si alguna variable de la parte que **anuncia o la daña** tiene tag en esa máquina (`vigilable`, `libro.ts:629-635`) | «Parte con instrumento: el vigía la mira» |
| `sin-instrumento` | En otro caso; `faltan` = nombres de las variables (no «confirma») sin tag | «Parte sin instrumento: el vigía no la ve» |

Firmar hoy un perfil **no reescribe la historia**. Sin disparos.

**Ejemplo (Morichal).** 5 fallas desde el 1 de sept: 4 `vigilada` (MN-41 aislamiento, 25 de sept 06:40;
MPP-301 sello, 24 de sept 06:23; MN-33 aislamiento, 17 de sept 02:26; MN-23 admisión, 5 de sept 14:17) y
1 `sin-parte` (P-201B, `EV-M2011-260924`, 24 de sept 16:51, «ninguno»). MN-05 y MN-16 ya no son fallas: el vigía
las anticipó y se cambiaron en paradas programadas (regla 4 arriba).
En el demo no hay ninguna `sin-instrumento` ni `fuera-de-perfil`.

---

### Pantalla «¿ACIERTA EL VIGÍA?» (Confiabilidad)

**Dónde se ve.** Pantalla Confiabilidad (`#/conf/confiabilidad/morichal/curso`, jefe de mantenimiento,
planeadora), panel con extra «desde que entró TRIM · 1 de sept» (`src/widgets/confiabilidad/Aciertos.tsx`).
No depende del período de la cabecera: es toda la historia desde la puesta en marcha.

**Fórmulas de las cuatro cifras.** Con $V$ = predicciones vencidas (todo lo que no está en
seguimiento), $A$ = aciertos, $F$ = falsas alarmas, $I$ = intervenidas, $W$ = fallas `vigiladas`, y
$a_k = (\text{falla.inicio} - \text{emitida})/1\ \text{d}$ para cada acierto:

$$
\text{tasa} = \frac{A}{A+F}\cdot 100 \ (\text{si } A+F>0), \qquad \text{anticipadas} = \frac{A}{|W|}, \qquad \bar a = \frac{1}{A}\sum a_k
$$

| Cifra | Valor | Barra | Pie | Morichal | Portafolio (5 campos) |
|---|---|---|---|---|---|
| Acertó | «$A$ de $A+F$»; «—» si $A+F=0$ | tasa/100 | «33 % · 2 falsas alarmas» (`n0`); nota «3 intervenidas, sin calificar» + ⓘ si $I>0$ | **1 de 3** · «33 % · 2 falsas alarmas» · «3 intervenidas, sin calificar» | 5 de 7 · «71 % · 2 falsas alarmas» · «5 intervenidas, sin calificar» |
| Fallas anticipadas | «$A$ de $|W|$» | $A/|W|$ | «en partes con instrumento» | **1 de 4** | 5 de 9 |
| Anticipación | «$\bar a$ d» (`n1`); «—» sin aciertos | – | «promedio · de min a max d»; «sin aciertos todavía» | **4,0 d** · «promedio · de 4,0 a 4,0 d» | 4,8 d · de 2,0 a 8,0 d |
| En seguimiento | cuántas | – | «la primera vence \<fecha\>»; «nada en seguimiento» | **4** · «la primera vence 2 de oct, 17:57» | 5 · 2 de oct, 17:57 |

La Ceiba sola: «3 de 3» · «100 % · 0 falsas alarmas» · «1 intervenida, sin calificar»; 3 de 3 (LC-11, LC-04 y la
parada de P-201B del 22-sep, por rodamientos); 4,7 d (de 2,0 a 8,0 d); 0 · «nada en seguimiento». Guacamayo: «1 de 1»;
1 de 2 (GU-07 se le escapó); 6,0 d; 1. No es 100 % en todo: en Morichal acertó una de tres y de cuatro fallas
vigiladas anunció una; en el portafolio, cinco de nueve.

ⓘ «Intervenidas antes»: «Se le hizo mantenimiento a la parte antes de que fallara: es lo que se busca,
pero no prueba que iba a fallar. No cuenta como acierto ni como falsa alarma.»

**Listas.**

1. **«LO QUE ANUNCIÓ Y EN QUÉ QUEDÓ · N»** (las vencidas, de la emisión más reciente a la más vieja;
   cinco a la vista y «ver N más», pero **una falsa alarma nunca queda escondida**: «un historial que a
   la vista solo muestra aciertos maquilla al vigía»). Cada fila: «**equipo** · parte» (nombre corto en
   minúscula; «parte sin identificar» si no tiene) y debajo «avisó \<emitida\> → falló \<inicio\>» /
   «→ orden \<número PM03\> cerrada \<fecha\>» (o «orden predictiva» si no la encuentra) / «→ venció
   \<hasta\>»; a la derecha el chip «acierto» / «intervenida antes» / «falsa alarma» y, si acertó,
   «N d antes». Morichal (6):
   - MN-33 · aislamiento del motor y del cable — avisó 13 de sept, 02:26 → falló 17 de sept, 02:26 · *acierto* · 4,0 d antes
   - MN-05 · bomba de fondo — avisó 9 de sept, 21:37 → orden 40012059 cerrada 13 de sept, 18:22 · *intervenida antes*
   - MPP-301 · rodamientos — avisó 5 de sept, 23:17 → orden 40012060 cerrada 7 de sept, 11:17 · *intervenida antes*
   - MN-40 · aislamiento del motor y del cable — avisó 3 de sept, 03:59 → venció 7 de sept, 08:47 · *falsa alarma*
   - MN-41 · aislamiento del motor y del cable — avisó 3 de sept, 01:55 → venció 7 de sept, 06:43 · *falsa alarma*
   - MN-16 · bomba de fondo — avisó 2 de sept, 19:25 → orden 40012061 cerrada 6 de sept, 03:03 · *intervenida antes* (tras «ver 1 más»)
2. **«LO QUE NO ANUNCIÓ · N FALLAS»**: «Se le escaparon: tenían instrumento» (= fallas `vigiladas` que
   no son la `falla` de ningún acierto) y un grupo por cada visibilidad no vigilada, con su rótulo, la
   cuenta y la lista («**equipo** · fecha · parte»; «falta: …» si es sin instrumento). Morichal
   «· 4 FALLAS»: se le escaparon **3** (MN-41 · 25 de sept, 06:40 · aislamiento del motor y del cable,
   una falla a tierra súbita; MPP-301 · 24 de sept, 06:23 · sello mecánico; MN-23 · 5 de sept, 14:17 ·
   admisión y gas) y «Sin parte identificada: no se sabe qué mirar» **1** (P-201B · 24 de sept, 16:51). Sin ninguna: «Ninguna falla sin anunciar
   desde la puesta en marcha.»
3. **«EN SEGUIMIENTO · N»** con el rótulo de columna «cruzaría el límite»: «**equipo** · parte», el tag
   y la ventana («2 de oct, 17:38–17:57» si es el mismo día; si no, «12 de oct, 19:55 – 14 de oct,
   05:16»), ordenadas por `hasta`. Morichal: MN-07 · bomba de fondo · VSD-MN07 · corriente ·
   2 de oct, 17:38–17:57; MN-18 · admisión y gas · PIT-MN18 · sensor de fondo · 3 de oct, 19:38–20:41;
   P-201B · succión y filtro de entrada · PI-2010 · 4 de oct, 07:20–10:59; MN-27 · protector del motor ·
   TIT-MN27 · sensor de fondo · 12 de oct, 19:55 – 14 de oct, 05:16.

En el portafolio, cada fila añade « · \<campo\>». Un clic abre la ficha del equipo.

**Casos borde.** Sin predicciones vencidas: «Ninguna predicción ha vencido todavía.» Sin seguimiento:
«Nada en seguimiento.» Sin fallas vigiladas: «0 de 0» y la barra no se dibuja.

**Quién lo calcula y por dónde viaja.** Servidor: `GET /api/vistas/predicciones?campos` →
`{ registro: PrediccionVigia[], fallas: FallaVista[] }` (fechas ISO). Las cuatro cifras las cuenta el
front sobre esas listas; los números de orden salen de `GET /api/sap/ordenes` (PM03 del mismo equipo
cuyo `cierreTecnico` es igual a `intervencion`).

**Referencia.** `src/entities/aciertos.ts`; `src/shared/api/predicciones.ts`;
`src/widgets/confiabilidad/Aciertos.tsx`; CONTRATO.md «Historial de aciertos del vigía». Casos:
`referencia/aciertos/<campo>.json` y `referencia/aciertos/portafolio.json`
(`/api/vistas/predicciones?campos=…`; requieren `insumos/<campo>/electrosumergibles.json`). Ojo: el
registro de referencia es el de la **regla del demo**; un backend real con su propio registro no lo
reproducirá, y para comprobarlo hay que cargarle ese registro como insumo (ver «Huecos»).

---

### Qué debe hacer el backend real

1. **Emitir y guardar.** Cada vez que el vigía calcula que una parte de un equipo de alto impacto
   cruza su alarma dentro del horizonte (la peor parte con `primera`, como hoy el riesgo), guardar una
   fila `PrediccionVigia` con `emitida` = el instante de cálculo, la ventana del pronóstico en ese
   instante, `parte`, `tag` y `accion`. **Nada se califica hacia atrás**: el registro empieza con la
   puesta en marcha.
2. **Una predicción, no una por cálculo.** El vigía se recalcula con cada lectura; hay que definir
   cuándo una predicción sigue siendo la misma (mismo equipo y parte con la ventana abierta) y si se
   actualiza su ventana o se cierra y se abre otra. **El código no lo define** (ver «Huecos»).
3. **Calificar al vencer** con `calificar`: fallas del PLC del historial del equipo (sin disparos, con
   la parte que se sabe al calificar) y órdenes **cerradas en SAP** sobre el equipo entre la emisión y
   el fin de la ventana. En el demo las intervenciones son las PM03 que la propia regla crea; en
   producción hay que decidir qué clases de orden cuentan (¿solo PM03?, ¿PM02 también?) y si se exige
   la misma parte.
4. **Visibilidad** de cada falla con la versión de la configuración vigente en `falla.inicio`.
5. **Inmutabilidad.** La calificación de una predicción vencida puede cambiar solo si cambia la parte
   de una falla (una respuesta posterior); dejar rastro de ese cambio.
