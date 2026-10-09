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

> **El agua de los campos del demo** (pruebas vigentes, corridas con el motor): La Ceiba **95 %** (18,9 bbl de agua por barril de crudo), Morichal Norte **97 %** (32,4), Guacamayo **93 %** (13,2), El Palmar **80 %** (4,0: todo es bombeo mecánico, y una unidad de varilla no mueve más líquido) y La Zarza **32 %** (es de gas y condensado: el mismo producto sirve donde el agua no manda). En un piloto, el corte real del cliente entra por las pruebas de pozo (capítulo 5B §4.1).

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

**Antes de la parada.** La Ceiba mueve **224.075 bbl/d de agua** (95 %) con tres bombas de reinyección de 90.000 bbl/d en paralelo: P-201A, P-201B y P-201C. P-201B mueve una mediana de **74.200 bbl/d** (medidor FI-2011). Si para, P-201A y P-201C pueden tomar 30.100 bbl/d más entre las dos (el respaldo firmado); el resto, **44.100 bbl/d**, se queda sin salida. El tanque TK-AG-CE mide 30.000 bbl con alto-alto al 90 %.

| Hora | Qué pasa | Cálculo | Lo que se ve |
|---|---|---|---|
| **03:52** | P-201B para (evento `EV-2011-1002`). El tanque está en 78,7 % (LT-2012). | Volumen libre $= (0{,}90 - 0{,}787)\cdot 30.000 = 3.390$ bbl. Agua sin salida $= 74.200 - 30.100 = 44.100$ bbl/d $= 1.837{,}5$ bbl/h. Colchón $= 3.390 / 1.837{,}5 =$ **1,84 h** (1,66–2,03 h). | La placa pasa a ◆ P1 «detenido». WhatsApp al supervisor y al operador: equipo parado, el respaldo no alcanza para todo su caudal. Ninguna señal explica la parte: «No arrancar hasta identificar el daño», y TRIM le pregunta al operador qué se dañó. |
| **05:43** | Primer pozo cerrado: LC-16, por nivel alto-alto (`LSHH`). | El tanque aguantó **1,845 h**: el modelo acertó al minuto. | Fila de la parada: «colchón 1,8 h · aguantó 1,8 h». |
| **05:46** | Los operarios cierran LC-07. Cierran primero los pozos que más agua dan, como haría un buen operador: con esos dos se quita el agua sin salida. | Crudo de los dos pozos cerrados = **1.665 bbl/d**. En el orden de TRIM (primero los de menos crudo por barril de agua: LC-02, LC-10 y LC-01 enteros, y bajar la frecuencia de LC-17 y LC-07) serían **1.426 bbl/d**: 14 % menos. | Detalle de la bomba: «Orden de cierre»; la parada abierta dice «evitable en orden: 30 bbl» (lo que lleva hasta ahora). |
| **14:00** (ahora) | La parada sigue abierta. El tanque está quieto en 89,6 %: con los dos pozos cerrados, P-201A y P-201C sacan toda el agua que entra. | Perdiéndose **1.665 bbl/d** $=$ 69 bbl/h. Diferido de la parada $=$ **573 bbl** (487–659, ±15,0 %). | Bombas: «Perdiéndose ahora 1.665 bbl/d · 69 bbl/h · 2 pozos cerrados». Placa: «573 bbl · 487 – 659 · calculado». Planta: el tanque, gris («P-201B detenida: el respaldo toma el agua que entra, el nivel no sube»). |
| **Gerencia** | La misma parada en el Resumen del portafolio, octubre en curso. | 573 de 2.377 bbl diferidos del portafolio $=$ 24 %. MN-41, la electrosumergible de Morichal caída desde el 25-sep, lleva 1.083 (46 %). | «Causa mayor: P-201B · La Ceiba» (lo que más se pierde ahora). Por equipo: «MN-41 · 1.083 bbl · 46 %», «P-201B · 573 bbl · 24 %». |
| **Historia** | Lo que esta bomba le ha costado al campo. | 9 fallas, una cada **41 días**, **40,0 h** fuera en promedio, **4.593 bbl** por falla. | Ficha del equipo y Confiabilidad: «le ha costado por falla». |

La misma parada en la pantalla de la bomba (confiabilidad, La Ceiba, octubre en curso):

![P-201B de La Ceiba detenida, vista de ingeniería](img/cap1-ceiba-p201b-detalle.png)

| # | Lo que se ve | Valor | De dónde sale |
|---|---|---|---|
| 1 | Respaldo de la bomba | «respaldo 30.100 bbl/d» | configuración firmada: `respaldos[]` (P-201A y P-201C en paralelo; 5B §4.2) |
| 2 | Diferido que causó | 573 bbl (487 – 659 · ±15,0 %) | Σ de los tramos de los pozos cuya causa es esta parada (5B §4.4) |
| 3 | Perdiéndose ahora | 1.665 bbl/d · 69 bbl/h · 2 pozos cerrados | Σ del crudo asignado de los pozos cerrados por ella (5B §4.3) |
| 4 | Le ha costado por falla | 4.593 bbl · 9 fallas en 12 meses · cada 41 d · 40,0 h fuera | historia del equipo: lo que costaron sus fallas pasadas (5B §7) |
| 5 | «No arrancar hasta identificar el daño» | P2 | ninguna señal explica la parte (5B §3) |
| 6 | Pozos que cerró | 2 (LC-07, LC-16) | eventos de pozo cargados a la parada (5B §4.3) |
| 7 | Colchón contra lo observado | «colchón 1,8 h · aguantó 1,8 h» | previsto con el nivel al parar; observado = primer cierre − paro (5B §4.4) |
| 8 | Libre hasta el alto-alto | 3.390 bbl | $(0{,}90 - 0{,}787) \cdot 30.000$ |
| 9 | Agua sin salida | 44.100 bbl/d | mediana de FI-2011 (74.200) − respaldo (30.100) |
| 10 | Primer pozo cerrado | a las 1,8 h | LC-16 a las 05:43 |
| 11 | Por qué paró | «Sin primera alarma y sin firma: el PLC no dice qué parte falló» | árbol de causas de la bomba (5B §3) |

**La misma bomba con más respaldo: P-201B de Morichal.** Morichal mueve **581.849 bbl/d de agua** (97 %) con siete bombas de 90.000 bbl/d. P-201B mueve 79.900; las otras seis tienen 39.500 libres entre todas. Con la bomba en marcha y el tanque TK-AG-MN (60.000 bbl) en 61,8 %, si P-201B se para ahora:

- el agua sin salida es $79.900 - 39.500 = 40.400$ bbl/d;
- el tanque aguanta **10,1 h** (9,0–11,1 h; el cálculo da 10,05 h);
- después hay que cerrar MN-27 y bajarles la frecuencia a MN-36 y MN-13 (25 %, lo más que aguanta una electrosumergible) y a MN-39 (16 %);
- se pierden **783 bbl/d** en ese orden, contra **1.222 bbl/d** cerrando parejo: **439 bbl/d menos**;
- y si falla hoy, con lo que han durado sus 8 fallas, costaría **≈ 1.235 bbl**: de cada falla solo cuentan las horas después de las 10 h que aguanta el tanque. **Si vuelve antes de 10 h, no cuesta crudo.** Lo que de verdad le costó cada falla en el pasado, con el tanque y los pozos de entonces, fue 2.765 bbl en promedio («le ha costado por falla»).

En la historia del demo, los operarios de Morichal cerraron primero los pozos más aguateros; cerrar en el orden de TRIM habría evitado **1.029 bbl** en 12 meses (201 solo en la parada del 24 de septiembre). Es poco contra un buen operador, y así debe ser: la ganancia grande está en no cerrar parejo, en reparar antes de que el tanque se llene y en anticipar la falla.

![P-201B de Morichal en marcha: si se para ahora](img/cap1-morichal-p201b-detalle.png)

| # | Lo que se ve | Valor | De dónde sale |
|---|---|---|---|
| 1 | Respaldo | «respaldo 39.500 bbl/d» | configuración firmada (las otras seis bombas del tren) |
| 2 | Si se para ahora | 783 bbl/d tras 10,1 h de colchón | crudo en orden (5B §4.2) |
| 3 | Nivel del tanque | LT-2012 61,8 % contra alto-alto 90 % | transmisor de nivel |
| 4 | Volumen libre | 16.920 bbl | $(0{,}90 - 0{,}618) \cdot 60.000$ |
| 5 | Agua sin salida | 40.400 bbl/d | 79.900 − 39.500 |
| 6 | Aguanta | 10,1 h (9,0 h a 11,1 h) | colchón con su rango (aforo y medidor de agua) |
| 7 | Orden de cierre | MN-27 entero; MN-36 y MN-13 al 25 %; MN-39 al 16 % | crudo por barril de agua, de menor a mayor, con el tope de frecuencia (5B §4.2) |
| 8 | Ahorro contra cerrar parejo | «439 bbl/d menos que parejo» | 1.222 − 783 |

Y lo que ve el gerente en el resumen del portafolio, el mismo día:

![Resumen del gerente, portafolio, octubre en curso](img/cap1-resumen-portafolio.png)

| # | Lo que se ve | Valor | De dónde sale |
|---|---|---|---|
| 1 | Barriles diferidos del portafolio | 2.377 | Σ de los tramos de los cinco campos en octubre (5A §3) |
| 2 | Su rango | «2.132–2.622 bbl · calculado» | tolerancia por la Ec. 22, en cuadratura entre campos (5A §4) |
| 3 | Perdiéndose ahora | 2.650 bbl/d · 4 de 87 pozos parados | riesgo ahora del portafolio (5B §5) |
| 4 | Causa mayor | «P-201B · La Ceiba» | lo que más se pierde ahora (5B §5) |
| 5 | Por equipo | MN-41 · 1.083 bbl · 46 %; P-201B · 573 bbl · 24 %; LC-21 · 247 bbl · 10 % | Pareto por equipo del período (5A §8) |

**Esto es la operatividad de los equipos críticos traducida a barriles.** La bomba de agua no produce un barril, pero su respaldo, su tanque y el orden de cierre deciden si una parada cuesta 0 bbl (el tanque la absorbe), unos cientos de bbl/d o miles. Con 95 % de agua el margen es de horas, no de días: por eso hay que saberlo al minuto.

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
| ¿El colchón predicho sirve? | Se mide contra lo observado en cada parada. En el demo: 1,84 h previstas contra 1,845 h observadas en La Ceiba, y como mucho 3 minutos de diferencia en las 18 paradas que llegaron a cerrar pozos. | 5B §4.4 |
| Una parada que cruza dos meses | Se recorta a cada mes con el factor de ese mes; no se suma entera a los dos. | 5B §4.4 |
| Lo que entra a mano | Solo la configuración firmada y la respuesta del operario, con fecha, firmante y motivo. Nada se sobrescribe: un mes viejo se recalcula con la versión que regía. | 5D |

## 1.6 Qué tiene que construir el backend para que esto funcione

1. **Recibir del borde**, sin edición manual: los eventos de los controladores de pozo con su código y su hora, las paradas de las bombas con la primera alarma y la firma de señales al parar (en el demo la firma nunca llega; el backend tiene que guardarla al registrar la parada: capítulo 5B, «Huecos»), las caídas de servicios, el fiscal del día, el nivel de los tanques y las series de los tags. → Capítulo 4.
2. **Guardar** eso y lo que entra a mano, con las reglas de custodia (solo inserción, versiones, quién y cuándo). → Capítulo 3.
3. **Calcular** las vistas con el motor (capítulo 5) y servirlas por la API (capítulo 7) con la misma forma que el demo.
4. **Avisar** por WhatsApp y **conversar** con SAP. → Capítulo 5D.
5. **Probar** que da los mismos números que el demo. → Capítulo 9.
