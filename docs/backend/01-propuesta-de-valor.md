# 1. El problema y su solución técnica

> **En una frase.** TRIM calcula, con cadena de custodia, **cuántos barriles se dejaron de producir por cada equipo crítico y por qué parte**, desde el pozo hasta la gerencia. Además avisa **antes** de que vuelva a pasar, para que el equipo se intervenga sin cerrar pozos.

Este capítulo explica el problema físico, la cadena de cálculo que lo resuelve y un caso real del demo de punta a punta. Cada paso remite al capítulo donde están sus fórmulas completas.

## 1.1 Por qué el agua manda

Un pozo maduro en Colombia no produce crudo: produce **líquido**, y casi todo es agua de formación. El **corte de agua** (BSW) es la fracción de agua en el líquido:

$$
\text{BSW} = \frac{Q_w}{Q_w + Q_o} \qquad\Longrightarrow\qquad \frac{Q_w}{Q_o} = \frac{\text{BSW}}{1 - \text{BSW}}
$$

| BSW | Barriles de agua por barril de crudo ($Q_w/Q_o$) |
|---|---|
| 92 % | 0,92 ÷ 0,08 = **11,5** |
| 95 % | 0,95 ÷ 0,05 = **19** |
| 97 % | 0,97 ÷ 0,03 ≈ **32,3** |
| 98 % | 0,98 ÷ 0,02 = **49** |

La relación crece muy rápido al final: pasar de 95 % a 98 % multiplica por 2,6 el agua que hay que mover por cada barril de crudo.

Esa agua se separa en la planta, cae a un **tanque de agua** y una **bomba de reinyección** la devuelve al subsuelo. La bomba no mueve crudo, pero **todo el crudo depende de ella**:

```mermaid
flowchart LR
  P["Pozos<br/>(electrosumergibles)"] -- "líquido:<br/>crudo + agua" --> S["Separación<br/>en planta"]
  S -- crudo --> PMO["Punto de medición oficial<br/>(LACT · fiscal)"]
  S -- agua --> T["Tanque de agua<br/>(LT · alto-alto)"]
  T --> B["Bomba de reinyección<br/>(P-201B)"]
  B --> I["Pozos inyectores<br/>o de disposición"]
  B -. "si para y el respaldo<br/>no alcanza" .-> T
  T -. "llega al alto-alto:<br/>hay que dejar de producir agua" .-> C["Cerrar pozos<br/>→ se pierde su crudo"]
```

Si la bomba se para y nada más absorbe el agua, el tanque sube. Al llegar al nivel **alto-alto** hay que dejar de producir agua, y la única forma es **cerrar pozos**. Cada pozo cerrado se lleva su crudo. Con cortes de 92–98 %, una bomba de agua parada pesa sobre la producción **más** que cualquier pozo.

El otro equipo de alto impacto es la **electrosumergible**, la bomba de fondo de cada pozo: si falla, ese pozo deja de producir hasta que se cambia (días o semanas de taladro).

> **Sobre los datos del demo.** Los cortes de agua del demo son de **29 % a 71 % por campo** (hasta 79,8 % en el pozo MN-27), por debajo del 92–98 % típico. Las fórmulas no cambian con el corte. Lo que cambia es la escala: con 95 % cada barril de crudo arrastra 19 de agua, la bomba mueve varias veces más agua para el mismo crudo y el colchón del tanque es mucho más corto. En un piloto con datos reales, el corte real del cliente entra por las pruebas de pozo (capítulo 5B §4.1).

## 1.2 Lo que cada nivel necesita saber

El mismo cálculo responde preguntas distintas según quién mira. Lo que cambia por nivel es qué se muestra, no los números (sección 2.8):

| Nivel | Pregunta | Lo que TRIM responde | Capítulo |
|---|---|---|---|
| **Gerencia** (decisión) | ¿Cuánto dejamos de producir, cuánto vale, por culpa de qué, y baja contra la meta que firmé? | Barriles diferidos del período con su rango, valor en USD, % de alto impacto, por equipo y por campo, cierre proyectado contra la meta | 5A, 6 |
| **Ingeniería de producción** | ¿El número aguanta una auditoría? | Factor de asignación en su banda regulatoria, custodia completa (pozos con prueba, días con fiscal), identidad exacta con el fiscal, publicación del libro | 5A |
| **Operación** (supervisor, operador) | ¿Qué está parado, cuánto aguanta el tanque, qué pozos cierro primero, puedo arrancar? | Lo que se pierde ahora (bbl/d, bbl/h, pozos cerrados), colchón en horas, orden de cierre, «no arrancar hasta identificar» | 5B |
| **Mantenimiento y confiabilidad** | ¿Qué parte va a fallar, cuándo, y cuánto crudo arriesga? | Vigía (cruce de la alarma en horas, con rango), salud por parte, riesgo por equipo, costo por falla, historia (MTBF, horas fuera) | 5C, 5B |
| **Aguas abajo** del equipo | ¿A quién afecta? | Los pozos que cierra cada bomba (chip «aguas abajo: todo el campo»), el servicio que paró a todo lo demás | 5B |

## 1.3 La cadena de cálculo, en siete pasos

### Paso 1 · Medir lo real
Lo producido **se mide**: es el fiscal del día del computador de flujo del punto de medición oficial (PMO). Un día sin fiscal no se rellena: se dice «sin fiscal» y el libro no se publica. → 5A.

$$
R_m = \sum_{d \in m,\ \text{con fiscal}} F_d
$$

### Paso 2 · Reconstruir el potencial
Lo que se habría producido sin eventos sale de las **pruebas de pozo**, llevadas a lo medido con el **factor de asignación** del mes:

$$
\text{FA}_m = \frac{R_m}{T_m}, \qquad T_m = \sum_{d} \sum_{p} q_{p,d} \cdot \frac{\max(0,\ H_d - P_{p,d})}{24}
$$

donde $q_{p,d}$ es el crudo de la prueba vigente del pozo, $H_d$ las horas del día y $P_{p,d}$ las horas perdidas del pozo ese día. El FA se compara contra su **banda regulatoria** (Res. MME 40236 de 2022, Fig. 10.2: ±15 % o ±5 % según la gravedad API y el volumen). Fuera de banda, el libro no se publica. → 5A §2.

### Paso 3 · Repartir lo que faltó, evento por evento
Cada evento de pozo (un paro o una frecuencia reducida, con la hora del PLC) produce un **tramo** de diferido:

$$
\text{bbl}_e = \sum_{d} q_{p,d} \cdot \text{FA}_{m(d)} \cdot h^{\text{ef}}_{e,d} \cdot \frac{f_{e,d}}{24}, \qquad f = \begin{cases} 1 & \text{paro} \\ 1 - \dfrac{\text{Hz}_e}{\text{Hz}_{\text{prueba}}} & \text{frecuencia reducida (aproximado, se marca aparte)} \end{cases}
$$

con $q_{p,d}$ el crudo de la prueba vigente del pozo ese día, $\text{FA}_{m(d)}$ el factor del mes de ese día y $h^{\text{ef}}_{e,d}$ las horas del evento en ese día. Las horas se cobran **una sola vez** aunque dos eventos se pisen. Así se cumple, en mes entero y por campo, la **identidad exacta**:

$$
\text{potencial} - \text{real} = \sum_{\text{eventos}} \text{bbl}
$$

Se rompe en un solo caso: un evento en un día **sin fiscal** suma diferido pero ese día no entra ni a lo real ni al potencial. Por eso un día sin fiscal bloquea la publicación del libro (5A §3, «Identidad del libro»).

Su incertidumbre se calcula con la Ec. 22 de la misma resolución (raíz de la suma de los cuadrados), y se muestra como rango: «5.729–6.734 bbl · calculado». → 5A §3–4.

### Paso 4 · Atribuir cada evento a su causa: equipo y parte
Un pozo no para «solo». Cada evento recorre un **árbol de causas**, en orden y con ventanas de tiempo exactas:

1. un **servicio** caído (energía, aire, compresión…) dentro de su ventana;
2. la **bomba de la línea** que le cortó el paso: la multifásica de su clúster, o la de reinyección cuando el tanque llegó al alto-alto (`LSHH`, `CMD`, `HZ`);
3. el **programa** de paradas firmado;
4. el **código del controlador** de la electrosumergible (falla a tierra, sobrecarga, baja carga…), que dice la parte;
5. lo que **declaró el operario** (por pantalla o WhatsApp);
6. **sin identificar**.

Para la parada de una bomba, la parte sale de la **primera alarma** del PLC o de la **firma de señales** al parar. Si ninguna señal la explica, TRIM pregunta al operario y marca **«no arrancar hasta identificar»**. Arrancar sin identificar queda como **no conformidad**. → 5B §2–3.

### Paso 5 · El agua: colchón, orden de cierre y lo evitable
Cuando la bomba de reinyección para, TRIM calcula cuánto aguanta el tanque y qué crudo se pierde después:

$$
h = \frac{(a - n)\cdot C}{\max(0,\ Q_{\text{mueve}} - Q_{\text{respaldo}})\,/\,24}
$$

con $a$ el alto-alto, $n$ el nivel, $C$ la capacidad del tanque, $Q_{\text{mueve}}$ la mediana del caudal de la bomba y $Q_{\text{respaldo}}$ lo que el respaldo absorbe.

Pasado el colchón hay que quitar el agua sin salida. TRIM recomienda cerrar **primero los pozos con menos crudo por barril de agua** ($r_j = c_j / w_j$): es una mochila fraccionaria y el orden voraz es óptimo. Después de cada parada mide cuánto se habría evitado con ese orden. → 5B §4.

### Paso 6 · Anticipar
El **vigía** proyecta cada señal del equipo hacia su alarma (mínimos cuadrados sobre la serie del historiador) y dice **en cuántas horas cruza**, con rango y qué parte daña. Con eso, **riesgo** pone precio a cada equipo: el crudo que pierde por día si para y **lo que costaría si falla hoy**:

$$
\text{si falla hoy} = Q_{\text{hoy}} \cdot \frac{1}{n}\sum_{i=1}^{n} \frac{\max(0,\ d_i - h_{\text{colchón}})}{24}
$$

con $Q_{\text{hoy}}$ el crudo que se perdería por día, $d_i$ las horas que duró cada una de sus $n$ fallas cerradas y $h_{\text{colchón}}$ las horas que el tanque aguanta hoy. Las horas que el tanque absorbe no cuestan crudo: **si la bomba vuelve antes de que el tanque se llene, la falla no cuesta nada**. Esa es la meta de reparación que la operación puede perseguir. Y **«¿acierta el vigía?»** registra cada predicción y en qué quedó. → 5C, 5B §5.

### Paso 7 · Cerrar el ciclo
Las **metas** y el **precio** los firma el gerente, por tramos y con motivo, en versiones que nunca se sobrescriben. El libro de un mes se **publica** solo si el FA está en banda, toda parada tiene causa dentro del máximo firmado, hay fiscal y hay meta. Los **informes** salen con folio y una **huella SHA-256** que calcula el servidor. Las paradas avisan por **WhatsApp** a quien tiene que actuar, y los avisos van a **SAP PM** con su evidencia. → 5A §7, 5D.

## 1.4 Un caso real de punta a punta: P-201B de La Ceiba, 2 de octubre de 2026

Todas las cifras salen del motor con los datos del demo (capítulo 5B §4).

**Antes de la parada.** La Ceiba no tiene respaldo para su bomba de reinyección P-201B («única bomba del tren de agua»). Su tanque TK-AG-CE mide 10.000 bbl con alto-alto al 90 %. La bomba mueve una mediana de **19.190 bbl/d** de agua (medidor FI-2011).

| Hora | Qué pasa | Cálculo | Lo que se ve |
|---|---|---|---|
| **03:52** | P-201B para (evento `EV-2011-1002`). El tanque está en 56,0 % (LT-2012). | Volumen libre $= (0{,}90 - 0{,}56)\cdot 10.000 = 3.400$ bbl. Agua sin salida $= 19.190 - 0 = 19.190$ bbl/d $= 799{,}6$ bbl/h. Colchón $= 3.400 / 799{,}6 =$ **4,25 h** (3,83–4,68 h). | La placa pasa a ◆ P1 «detenido». WhatsApp al supervisor y al operador: equipo parado, sin respaldo. Ninguna señal explica la parte: «No arrancar hasta identificar qué se dañó», y TRIM le pregunta al operador qué se dañó. |
| **08:07** | Primer pozo cerrado: LC-16, por nivel alto-alto (`LSHH`). | El tanque aguantó **4,245 h**: el modelo acertó al minuto. | Fila de la parada: «colchón 4,3 h · aguantó 4,2 h». |
| **08:07–08:52** | Se cierran 17 pozos. Sin respaldo no hay orden que escoger: se cierra todo el campo. | Crudo en orden = crudo parejo = 11.359,7 bbl/d; ahorro 0. | «Sin respaldo, el agua no tiene salida: al llenarse el tanque se cierra todo el campo». |
| **14:00** (ahora) | La parada sigue abierta. | Perdiéndose $= \sum$ crudo asignado de los 17 pozos $=$ **11.059 bbl/d** $=$ 461 bbl/h. Diferido de la parada $=$ **2.570 bbl** (2.185–2.956, ±15,0 %). | Bombas: «Perdiéndose ahora 11.059 bbl/d · 17 pozos cerrados · 461 bbl/h». Placa: «2.570 bbl · 2.185 – 2.956 · calculado». |
| **Gerencia** | La misma parada en el resumen del portafolio, octubre en curso. | 2.570 de 6.232 bbl diferidos del portafolio $=$ 41 %. | «Causa mayor: P-201B · La Ceiba». Por equipo: «P-201B · La Ceiba · 2.570 bbl · 41 %». |
| **Historia** | Lo que esta bomba le ha costado al campo. | 9 fallas, una cada **41 días**, **40,0 h** fuera en promedio, **18.075 bbl** por falla. | Ficha del equipo y Confiabilidad. |

La misma parada en la pantalla de la bomba (confiabilidad, La Ceiba, octubre en curso):

![P-201B de La Ceiba detenida, vista de ingeniería](img/cap1-ceiba-p201b-detalle.png)

| # | Lo que se ve | Valor | De dónde sale |
|---|---|---|---|
| 1 | Respaldo de la bomba | «sin respaldo» | configuración firmada: `respaldos[]` (5B §4.2) |
| 2 | Diferido que causó | 2.570 bbl (2.185 – 2.956 · ±15,0 %) | Σ de los tramos de los pozos cuya causa es esta parada (5B §4.4) |
| 3 | Perdiéndose ahora | 11.059 bbl/d · 461 bbl/h · 17 pozos cerrados | Σ del crudo asignado de los pozos cerrados por ella (5B §4.3) |
| 4 | Le ha costado por falla | 18.075 bbl · 9 fallas en 12 meses · cada 41 d · 40,0 h fuera | historia del equipo: lo que costaron sus fallas pasadas (5B §7) |
| 5 | «No arrancar hasta identificar el daño» | P2 | ninguna señal explica la parte (5B §3) |
| 6 | Pozos que cerró | 17 | eventos de pozo cargados a la parada (5B §4.3) |
| 7 | Colchón contra lo observado | «colchón 4,3 h · aguantó 4,2 h» | previsto con el nivel al parar; observado = primer cierre − paro (5B §4.4) |
| 8 | Libre hasta el alto-alto | 3.400 bbl | $(0{,}90 - 0{,}56) \cdot 10.000$ |
| 9 | Agua sin salida | 19.190 bbl/d | mediana de FI-2011 − respaldo (0) |
| 10 | Primer pozo cerrado | a las 4,2 h | LC-16 a las 08:07 |
| 11 | Por qué paró | «Sin primera alarma y sin firma: el PLC no dice qué parte falló» | árbol de causas de la bomba (5B §3) |

**El mismo equipo con respaldo: P-201B de Morichal.** Morichal tiene la P-201A en paralelo, con 15.100 bbl/d libres. Con la bomba en marcha y el tanque en 61,8 %, si P-201B se para ahora:

- el agua sin salida es solo $21.495 - 15.100 = 6.395$ bbl/d;
- el tanque aguanta **19,0 h** (17,1–21,0 h; el cálculo da 19,0499 h);
- después hay que cerrar 4 pozos: MN-27, MN-36, MN-13 enteros y MN-39 al 78 %;
- se pierden **1.671 bbl/d** cerrando en ese orden, contra **2.543 bbl/d** cerrando parejo: **872 bbl/d menos**;
- y si falla hoy, con lo que han durado sus 8 fallas (de 4 a 86 h), costaría **≈ 2.086 bbl**: de cada falla solo cuentan las horas después de las 19 h que aguanta el tanque. **Si vuelve antes de 19 h, no cuesta crudo.** Lo que de verdad le costó cada falla en el pasado, con el tanque y los pozos de entonces, fue 3.365 bbl en promedio («le ha costado por falla»).

En la historia del demo, cerrar en orden habría evitado **9.633 bbl** en las paradas de Morichal (4.762 solo en la del 24 de septiembre).


![P-201B de Morichal en marcha: si se para ahora](img/cap1-morichal-p201b-detalle.png)

| # | Lo que se ve | Valor | De dónde sale |
|---|---|---|---|
| 1 | Respaldo | «respaldo 15.100 bbl/d» | configuración firmada (P-201A en paralelo) |
| 2 | Si se para ahora | 1.671 bbl/d tras 19,0 h de colchón | crudo en orden (5B §4.2) |
| 3 | Nivel del tanque | LT-2012 61,8 % contra alto-alto 90 % | transmisor de nivel |
| 4 | Volumen libre | 5.076 bbl | $(0{,}90 - 0{,}618) \cdot 18.000$ |
| 5 | Agua sin salida | 6.395 bbl/d | 21.495 − 15.100 |
| 6 | Aguanta | 19,0 h (17,1 h a 21,0 h) | colchón con su rango (aforo ±0,7 %, agua ±10 %) |
| 7 | Orden de cierre | MN-27, MN-36, MN-13 enteros y MN-39 al 78 % | crudo por barril de agua, de menor a mayor (5B §4.2) |
| 8 | Ahorro contra cerrar parejo | «872 bbl/d menos que parejo» | 2.543 − 1.671 |
| 9 | Evitable de la parada del 24-sep | 4.762 bbl | 5B §4.5 |

Y lo que ve el gerente en el resumen del portafolio, el mismo día:

![Resumen del gerente, portafolio, octubre en curso](img/cap1-resumen-portafolio.png)

| # | Lo que se ve | Valor | De dónde sale |
|---|---|---|---|
| 1 | Barriles diferidos del portafolio | 6.232 | Σ de los tramos de los cinco campos en octubre (5A §3) |
| 2 | Su rango | «5.729–6.734 bbl · calculado» | tolerancia por la Ec. 22, en cuadratura entre campos (5A §4) |
| 3 | Perdiéndose ahora | 13.217 bbl/d · 21 de 87 pozos parados | riesgo ahora del portafolio (5B §5) |
| 4 | Causa mayor y primer equipo del Pareto | «P-201B · La Ceiba» | el equipo con más barriles del período (5A §8) |
| 5 | Sus barriles | 2.570 bbl · 41 % | la misma parada de arriba |

**Esto es la operatividad de los equipos críticos traducida a barriles.** La bomba de agua no produce un barril, pero su respaldo, su tanque y el orden de cierre deciden si una parada cuesta 0 bbl (el tanque la absorbe), 1.671 bbl/d o todo el campo.

## 1.5 Por qué los cálculos son precisos

| Riesgo de imprecisión | Cómo lo resuelve el motor | Capítulo |
|---|---|---|
| La hora del evento | Se usa la del PLC, sin redondear. Un evento abierto mide hasta el «ahora» del servidor. | 4, 5B §1 |
| Dos eventos que se pisan en el mismo pozo | Cada hora del pozo se cobra **una vez**: manda el paro sobre la frecuencia reducida y, entre paros, el primero. | 5A §2 |
| El diferido «no cuadra» con lo medido | Identidad exacta potencial − real = Σ eventos en mes entero con fiscal todos los días. En un día suelto, la diferencia es el **inventario del tanque de venta** (el PMO mide lo que se despacha, no lo que producen los pozos ese día), que se compensa dentro del mes. | 5A §3, 9.5 |
| Pruebas viejas o pozos sin prueba | Se usa la prueba vigente al inicio del día; un pozo sin prueba es un **hueco de custodia** que sube el FA y se nombra. | 5A §2 |
| Factor de asignación absurdo | Se compara contra la banda de la Res. 40236; fuera de banda, el libro no se publica. | 5A §2 |
| Frecuencia reducida | Se estima con $1 - \text{Hz}/\text{Hz}_0$, se marca **aproximado** y se suma aparte. | 5A §3 |
| Incertidumbre | Rango por la Ec. 22 (raíz de la suma de los cuadrados); el colchón suma la del aforo del tanque (0,2 %) y la del medidor de agua. | 5A §4, 5B §4 |
| ¿El colchón predicho sirve? | Se mide contra lo observado en cada parada. En el demo: 4,25 h previstas contra 4,245 h observadas en La Ceiba, y como mucho 2 minutos de diferencia en las 15 paradas que llegaron a cerrar pozos (10 de La Ceiba y 5 de Morichal). | 5B §4.4 |
| Una parada que cruza dos meses | Se recorta a cada mes con el factor de ese mes; no se suma entera a los dos. | 5B §4.4 |
| Lo que entra a mano | Solo la configuración firmada y la respuesta del operario, con fecha, firmante y motivo. Nada se sobrescribe: un mes viejo se recalcula con la versión que regía. | 5D |

## 1.6 Qué tiene que construir el backend para que esto funcione

1. **Recibir del borde**, sin edición manual: los eventos de los controladores de pozo con su código y su hora, las paradas de las bombas con la primera alarma y la firma de señales al parar (en el demo la firma nunca llega; el backend tiene que guardarla al registrar la parada: capítulo 5B, «Huecos»), las caídas de servicios, el fiscal del día, el nivel de los tanques y las series de los tags. → Capítulo 4.
2. **Guardar** eso y lo que entra a mano, con las reglas de custodia (solo inserción, versiones, quién y cuándo). → Capítulo 3.
3. **Calcular** las vistas con el motor (capítulo 5) y servirlas por la API (capítulo 7) con la misma forma que el demo.
4. **Avisar** por WhatsApp y **conversar** con SAP. → Capítulo 5D.
5. **Probar** que da los mismos números que el demo. → Capítulo 9.
