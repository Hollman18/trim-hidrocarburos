# El modelo choke, completo, en TRIM

**21-oct-2026 · Parte del plan maestro** (`PLAN-MAESTRO.md`). Propuesta: no se construye sin «hazlo».

**Fuentes:**
- SPE-36848 (Palen y Goodwin, BP, 1996), el modelo que adopta la Circular ANH 024 (C24 p.4).
- NSTA *UKSS Production Efficiency Section Guide 2025*, que convirtió ese modelo en reporte regulado.
- El anexo técnico de la Circular 003/2026.
- El ejemplo de Edinson [26:48].
- El detalle con citas está en `investigacion/R2-choke-y-perdidas.md` §1–§3 y en `P1-producto.md` §1.7 y §2.1.

**Etiquetas:**
- `[DATO]` está en la fuente.
- `[INFERENCIA]` es una decisión de diseño.
- **NO VERIFICADO** es lo que falta confirmar. Las tablas del modelo expandido de SPE-36848 están detrás de un muro de pago y no se leyeron.

---

## 0. Por qué el choke es central para el norte

El choke es la herramienta que dice **qué parada cuesta barriles de verdad y dónde rinde más evitarla**.

- `[DATO]` La producción fluye por una tubería en serie: **reservorio → pozos → planta → exportación**. Cada tramo tiene su capacidad, y el sistema entrega como máximo lo que deja pasar el más estrecho (SPE-36848; NSTA §5.3).
- `[INFERENCIA]` En un campo de 92–97 % de agua, el tramo estrecho suele ser **el agua en planta**: separación, tanques, bombas de reinyección y pozos inyectores. Por eso una bomba de reinyección que para puede frenar el campo entero, y por eso el colchón del tanque decide cuánto cuesta la falla. Es justo lo que TRIM ya modela con el colchón (`diferido.ts`).
- **Consecuencia práctica:**
  - Aumentar la capacidad de un tramo que **no** es el estrecho no da ni un barril.
  - Evitar las paradas del equipo que **sí** es el estrecho da todos los barriles.
  - El choke ordena dónde poner el vigía, el técnico y el repuesto.

---

## 1. Las 12 piezas del modelo completo

| # | Pieza | Qué es | Hoy en TRIM | Qué falta |
|---|---|---|---|---|
| 1 | **Los cuatro chokes** | Reservorio, Pozo, Planta y Exportación, en serie | `Chokes` con `pozos, planta, evacuacion, mercado` (`planta.ts:47`), versión británica y fija por campo | Alinear con los cuatro de BP/ANH; «mercado» pasa a ser subnivel de Exportación (§2) |
| 2 | **Potencial de cada choke** | Cuánto puede dar cada tramo, en bbl/d de crudo | Números fijos del demo en `PlantaCampo.chokes`; la planta ya se calcula por trenes (`trenesEnCrudo`, `planta.ts:66`) | **Calcularlos**, no declararlos (§3) |
| 3 | **Choke dominante del campo** | El tramo de menor potencial, día por día | `Campo.choke` declarado a mano (`tipos.ts:102`); ninguna pantalla lo usa | Calculado; empate = explicación obligatoria (§4) |
| 4 | **Choke de cada parada** | Dónde se originó la restricción de esa parada | No existe: ningún evento lleva choke | Regla de origen + dedicado/compartido (§5) |
| 5 | **Contabilidad de la brecha por choke** | Potencial − real, repartido por choke y dentro de cada choke por causa (el «modelo expandido» hasta el nivel de «falla de ESP») | El libro reparte el diferido por equipo y por `TipoCausa`, sin choke | Cascada potencial → real por choke, que suma exacto (§6) |
| 6 | **Escalera de brechas** | Desarrollo (reservorio), desempeño (levantamiento no optimizado), disponibilidad (paradas planeadas y no planeadas) y capacidad (operación) | Mezcladas en el diferido | Separarlas: el norte vive en **disponibilidad no planeada** (§7) |
| 7 | **Eficiencia de producción** | Real ÷ potencial del sistema (PE de la NSTA, ISO/TS 3250) | `Libro` tiene real y potencial | Indicador PE por campo y período, con el choke que la limitó (§8) |
| 8 | **Modelo choke de inyección** | En campos que dependen del agua, un modelo choke aparte para el agua: producida → tratamiento → tanques → bombas de reinyección → inyectores | El colchón del tanque y las bombas de reinyección; no se ve como modelo | Tubería del agua con sus potenciales y su dominante (§9) |
| 9 | **Valor de cada equipo según el choke** | Cuántos bbl/d quita la falla de un equipo según cuánto baja el mínimo de la tubería | El costo por falla con colchón (`diferido.ts`) | Generalizarlo a los cuatro chokes y al modelo de inyección (§10) |
| 10 | **Choke en el tiempo** | Qué choke dominó cada día y cuánto se perdió en cada uno | Nada | Serie diaria del dominante y de la brecha por choke (§11) |
| 11 | **Cómo se ve por rol** | La tubería de cuatro barras, el estrecho resaltado y la brecha en cada uno | Nada | Vistas por rol (§12) |
| 12 | **Salidas** | `choke_mod` de la ANH; PE de NSTA e ISO/TS 3250 cuando un cliente lo pida | Nada | Valor agregado (§13) |

---

## 2. Los cuatro chokes y sus fronteras

| Choke (código interno → ANH) | Frontera | Ejemplos (anexo C-003 §1.4.2 y NSTA §6) |
|---|---|---|
| `reservorio` → RESERVORIO | El yacimiento | Conificación de agua, declinación abrupta, conectividad, falta de soporte de presión por no inyectar |
| `pozo` → POZO | Del fondo a la válvula lateral del árbol, más lo **dedicado** a ese pozo (criterio de Edinson) | Falla de levantamiento (ESP, bombeo mecánico), arenamiento, integridad del pozo, transformador o variador dedicado |
| `planta` → PLANTA | Desde el cabezal común hasta la salida de la batería, más lo **compartido** | Separadores, tratamiento, tanques, agua (incluidas las bombas de reinyección y la disposición), compresión, aire, energía interna, red de media, pórtico, bomba de despacho y LACT propias |
| `exportacion` → EXPORTACION | De la brida de salida de la batería hacia afuera | Oleoducto, transportador, terminal o cliente que no recibe, nominación |

- **«Mercado»** (NSTA) no existe en la ANH. Queda como **subnivel** de Exportación: «terminal o cliente no recibe», «restricción de nominación».
- **Criterio de Edinson contra NSTA** `[DATO]`: la NSTA pone la red eléctrica hasta el levantamiento artificial en Planta (p. 41), mientras Edinson pone lo dedicado a un pozo en Pozo. **Decisión propuesta (21-oct): TRIM usa un solo criterio, el de Edinson, sin opción NSTA.** Tres razones:
  1. Es el que aplica la ANH: el anexo C-003 pone «fallas de levantamiento artificial» en Pozo.
  2. Deja todo el sistema de levantamiento de un pozo (bomba de fondo, motor, cable, variador y transformador dedicado) en un solo choke, que es como TRIM ve un equipo crítico.
  3. Con un solo criterio, los campos y las operadoras se pueden comparar.

  Lo que se configura es la **topología** (qué alimentador o equipo sirve a qué pozos, `Config.anh.chokes`), no el criterio. Si algún día un cliente reporta a la NSTA, eso sería un adaptador de salida, no otro modelo interno.

---

## 3. Potencial de cada choke (calculado)

Todos en **bbl/d de crudo**, por campo y por día. `[DATO]` La NSTA §5.4 fija qué entra en cada uno.

| Choke | Cálculo | Fuente del dato | Regla que no se negocia |
|---|---|---|---|
| **Pozo** (incluye reservorio para el potencial) | Σ de las pruebas vigentes de los pozos en condición óptima, con el levantamiento incluido | `libro.ts` (prueba vigente) | El pozo cuenta mientras pueda fluir; una ESP con la frecuencia bajada **no** baja el potencial: lo que deja de dar es brecha de desempeño |
| **Planta** | El menor de los trenes en crudo: crudo, agua (capacidad de agua × crudo/agua) y gas | `trenesEnCrudo` (`planta.ts:66`), que ya existe | **No se reduce por paradas planeadas ni no planeadas** (NSTA p. 29). La capacidad es la instalada; la parada es brecha |
| **Exportación** | Capacidad de evacuación: oleoducto, carrotanques, LACT de despacho, nominación aceptada | `Chokes.evacuacion` (hoy fijo); luego configuración firmada | Lo de mercado no reduce el potencial de Exportación (NSTA p. 29) |
| **Reservorio** | No se calcula como potencial propio (la NSTA tampoco lo hace) | — | Solo existe como choke de una parada o como brecha de desarrollo |

- **Potencial del sistema** = el menor de Pozo, Planta y Exportación (SMPP de la NSTA).
- **Diferida ANH:** no se mezcla con el potencial del sistema. Sigue siendo la última prueba de potencial reportada − real, por pozo (P1 §2.5). Son dos preguntas distintas: «cuánto pudo dar el pozo» frente a «cuánto pudo dar el campo».

---

## 4. Choke dominante del campo

- **Cálculo:** cada día, el choke con el menor potencial (§3).
- **Empate:** `[DATO]` «By design, no two potentials should be exactly the same. If they are you must provide an explanation» (NSTA §5.4). Un empate exacto exige una explicación escrita por producción.
- **`Campo.choke`** se conserva en el contrato para no romper el códec ni el SQL, pero queda obsoleto: la pantalla lee el calculado.
- **Lo que dice en palabras:** «Hoy limita: planta · agua (le sobran 1.200 bbl/d a los pozos)» (cifra de ejemplo).

---

## 5. Choke de cada parada

Es la regla de R2 §3.1, adoptada en P1 §2.1:

1. **Manda el origen.** El choke es el del componente donde se origina la restricción, no el del pozo que cerró. Un pozo cerrado porque la planta no recibe es PLANTA.
2. **Dedicado o compartido.** Si el elemento sirve a un solo pozo, POZO; si sirve a varios, PLANTA. Es el ejemplo del transformador de Edinson: pórtico o red de media → PLANTA; distribución a la unidad de bombeo → POZO.
3. **En cascada manda la raíz.** Si cae un servicio y por eso cierran 20 pozos, las 20 paradas llevan el choke del servicio. TRIM ya aplica esta regla para la causa (`causa-senal.ts`, reglas 1–2).
4. **Una causa posterior no crea otra diferida.** Un evento independiente sobre un pozo ya parado no suma barriles; se anota como contribuyente en la evidencia.
5. **Si la causa cambia, la parada se parte en dos tramos**, cada uno con su choke. Lo mismo pasa con el exceso de una parada planeada sobre su ventana: el exceso es un tramo no planeado.
6. **Restricción sin evento** (curtailment, tanque de agua al límite en régimen, nominación): lleva el choke dominante de ese tramo.
7. **Parada parcial** (ESP con la frecuencia bajada): se queda en el choke del equipo; su barril es brecha de desempeño o de disponibilidad, según la causa (§7). Cómo la quiere la ANH es **NO VERIFICADO** (pregunta 8 de P1).
8. **Tanques llenos:** si la planta no recibe agua o proceso, PLANTA. Si el tanque de crudo está lleno porque el oleoducto o el cliente no recibe, EXPORTACION (P1 §3.3–3.4).

**Cuándo pregunta a una persona:** cuando el choke depende de algo que la señal no sabe (externos, clima, orden público, reservorio). Al operador nunca se le pide escoger el choke: lo confirman sup, prod, jefe o conf (P1 §1.3).

---

## 6. Contabilidad de la brecha por choke

La identidad que tiene que cuadrar exacto, por campo y período:

```
Potencial del sistema − Producción real
   = Σ brecha por choke                         (reservorio + pozo + planta + exportación)
   = Σ por choke, Σ por causa dentro del choke  (el «modelo expandido»: N1 → N2 → equipo → parte)
```

- Cada barril de brecha va a **un** choke y a **una** causa. No hay regla publicada para repartir un barril entre dos causas simultáneas (R2 §1.2b, dato negativo). Se aplica la unicidad de la circular (C24 p.5) con la regla de origen de §5.
- **Lo sin explicar se muestra como «sin explicar»**, nunca se reparte para que cuadre. Si en un mes supera el 2,5 %, se marca para revisar. Ese umbral es el de cierre de la NSTA (§6.2, p. 38).
- **Por debajo del choke van los niveles que cada operadora quiera**: su propio árbol, gracias a la conversión (P1 §1.10). `[DATO]` SPE-36848: «all will further analyze down to at least another level e.g. ESP failure, metering».
- **Diferido y perdido nunca se mezclan.** La brecha por choke es diferida (potencial − real). La **pérdida** (lo producido que no se vende: pitera, derrame, tea) va aparte, con su propio choke opcional, como dónde ocurrió (P1 §1.9). `[DATO]` En inglés, la «production loss» de la NSTA es la diferida de la ANH, no su pérdida (R2 §1.2d).

---

## 7. Escalera de brechas

`[DATO]` Patente US 8,195,401 B2 y NSTA §5.3 y §6.4 (R2 §1.2c):

```
Potencial del reservorio
 └ brecha de desarrollo       → reservorio y proyectos
Potencial técnico (pozo en su óptimo, levantamiento incluido)
 └ brecha de desempeño        → producción: levantamiento no optimizado (frecuencia bajada, daño)
Potencial disponible
 └ brecha de disponibilidad   → mantenimiento y confiabilidad   ← AQUÍ VIVE EL NORTE
     ├ planeada               (mantenimiento, pruebas, workover)
     └ NO PLANEADA            (fallas, disparos, terceros, clima)   ← lo que TRIM tiene que bajar
Potencial operativo
 └ brecha de capacidad        → operación (curtailment, setpoints)
Producción real
```

- Cada barril de brecha lleva su **escalón** además de su choke. Así el indicador del norte (bbl por paradas no planificadas de equipos críticos) sale limpio, sin mezclarse con declinación, curtailment ni levantamiento mal ajustado.
- **El exceso de una parada planeada** se va a no planeada (§5.5). La NSTA lo deja en planeada; la ANH no lo dice. Se adopta lo prudente, para no esconder una falla bajo un mantenimiento (**NO VERIFICADO** con la ANH).

---

## 8. Eficiencia de producción

- **PE = producción real ÷ potencial del sistema**, por campo y período, con el choke que la limitó. Es el indicador NSTA (§5.3) e ISO/TS 3250. TRIM ya cita ISO/TS 3250 para real ÷ potencial (`anexo-c-normas.md`).
- **PE no planeada** = brecha de disponibilidad no planeada ÷ potencial del sistema: el porcentaje que el norte busca bajar.
- **El cuadre** vuelve a la identidad de §6: lo que falta para el 100 % es la suma de brechas por choke y por escalón, más lo sin explicar.

---

## 9. Modelo choke de inyección (el agua)

`[DATO]` SPE-36848: «In a field such as Magnus or Ula the Gross Potential is very dependent on water injection capacity, and a separate choke model can be used to model injection performance». En los campos de agua de TRIM esto es el centro del problema.

```
Agua producida → tratamiento de agua → tanques de agua → bombas de reinyección → pozos inyectores (o disposición)
```

- **Potencial de cada tramo** en bbl/d de agua. Las bombas de reinyección cuentan como capacidad instalada, no como capacidad disponible hoy: el tren de 3 bombas de La Ceiba vale 3 × 90.000. Los inyectores cuentan por su capacidad de admisión.
- **El dominante del agua** dice qué limita la disposición. Cuando la disposición es el choke de **planta**, el agua manda sobre el crudo: cada barril de agua que no sale le cuesta al campo «agua sin salida × crudo/agua» de crudo, una vez agotado el colchón del tanque. Es el cálculo que TRIM ya hace (`diferido.ts`, colchón; costo por falla «hoy, descontando el colchón»).
- **Relación con el norte:** las bombas de reinyección y las multifásicas son críticas porque **son el estrecho**. El modelo de inyección lo demuestra con números y no con opinión.
- **Para la ANH:** el inyector no tiene fila de parada, pero su tiempo de inyección viaja en `inyeccion_por_pozo.t_iny`. TRIM lo cuadra (regla V-17, P1 §4.2).

---

## 10. Valor de cada equipo según el choke

`[INFERENCIA]` Generaliza el costo por falla que ya existe:

- **Costo de la falla de un equipo** = cuánto baja el mínimo de la tubería (crudo o agua) mientras está caído, descontando el colchón, menos lo que el respaldo absorbe.
  - Una falla en un tramo que **no** es el estrecho y tiene holgura cuesta **0 bbl/d** mientras la holgura alcance.
  - Una falla en el estrecho cuesta todo lo que baja el mínimo.
- **Ranking de criticidad dinámica:** cada equipo, ordenado por «bbl/d que costaría si falla hoy». Ese orden decide dónde va el vigía, qué rutas predictivas van primero y qué repuesto se pide ya. Es la misma lógica de «equipos en riesgo» y del colchón, extendida a los cuatro chokes y al agua.
- **Lo que se gana desembotellando:** cuánto sube el potencial del sistema si se agrega capacidad en el estrecho (una bomba más, un tanque más grande). Sirve para que el gerente decida inversión con el mismo modelo.

---

## 11. Choke en el tiempo

- **Serie diaria** del choke dominante y de la brecha por choke y por escalón.
- **Cambio de dominante:** cuando el estrecho pasa de planta a pozos (por ejemplo, porque entró una bomba de reinyección nueva), TRIM lo avisa: cambian los equipos críticos.
- **Antes → con TRIM:** la brecha de disponibilidad no planeada por choke, antes y después del piloto, con las mismas fórmulas.

---

## 12. Cómo se ve, por rol

| Rol | Qué ve | En palabras |
|---|---|---|
| **Gerente** | La tubería de 4 barras por campo (reservorio, pozos, planta, exportación), el estrecho resaltado y la brecha del período repartida en las cuatro, con la pérdida aparte. Sin códigos | «Este mes La Ceiba se trabó sobre todo en planta · agua: 3.100 bbl» (cifra de ejemplo) |
| **Producción** | Potencial de cada choke, dominante de hoy, holgura de los demás, escalera de brechas y PE | «Hoy limita la planta (agua). A los pozos les sobran 1.200 bbl/d: abrir más pozos no da nada» (cifra de ejemplo) |
| **Supervisor** | El dominante del turno y lo que lo está frenando ahora | «Hoy limita: planta · agua» |
| **Confiabilidad y jefe** | Ranking de criticidad dinámica: los equipos del estrecho primero | «Si falla P-201B hoy, el campo pierde 1.665 bbl/d después de 1,8 h de colchón» |
| **Planeadora** | Las rutas y repuestos de los equipos del estrecho primero | — |
| **Operador y técnico** | Nada del modelo: solo contestan lo que vieron | — |
| **Regulatorio** | El `choke_mod` de cada parada y su cuadre | — |
| **Administrador** | Configuración: chokes por equipo (dedicado o compartido), capacidades de exportación | — |

Colores: lo normal en gris (ISA-101). El estrecho no es una alarma: se marca con forma y texto («limita»), no con rojo (U1 §3, §9).

---

## 13. Salidas (valor agregado)

- **ANH:** `choke_mod` por parada (POZO, PLANTA, EXPORTACION o RESERVORIO, en la forma que se configure; P1 §3.5).
- **NSTA / ISO TS 3250:** PE, brecha por choke y por fuente, cuando un cliente lo pida. Es el mismo cálculo con otra salida.

---

## 14. Invariantes y pruebas

1. Potencial del sistema = el menor de Pozo, Planta y Exportación. Un empate exige explicación.
2. Potencial − real = Σ brecha por choke + sin explicar, exacto. Si lo sin explicar pasa del 2,5 % del mes, se marca para revisar.
3. Σ brecha por choke = Σ por causa dentro del choke, exacto.
4. La pérdida nunca entra en la brecha.
5. En cascada, todas las paradas llevan el choke de la raíz.
6. Una causa posterior sobre un pozo ya parado no suma barriles.
7. Una falla en un tramo con holgura cuesta 0 bbl/d hasta que la holgura se agota.
8. El potencial de planta no baja por una parada.
9. Casos de referencia nuevos en `referencia/choke/`: un campo por cada dominante (pozo, planta-agua, exportación), una cascada, un empate, una parada parcial, un exceso de parada planeada y el modelo de inyección de La Ceiba (3 × 90.000, P-201B con 74.200, respaldo de 30.100, tanque de 30.000).

---

## 15. En qué fase entra cada pieza (PLAN-MAESTRO §5)

| Fase | Piezas |
|---|---|
| **F1 · Arquitectura** | 1 (los cuatro chokes), 4 (choke de la parada), 5 (brecha por choke, que suma exacto), 6 (escalera de brechas), 2 y 3 con los potenciales de planta desde `trenesEnCrudo` y los de pozo desde la prueba vigente. Invariantes 1–8 |
| **F2 · Piloto** | 9 (modelo de inyección del equipo piloto), 10 (criticidad dinámica para ordenar el vigía y las rutas), 7 (PE y PE no planeada para la línea base) |
| **F3 · Escalar** | 11 (choke en el tiempo y aviso de cambio de dominante), 12 (vistas por rol completas), exportación por configuración firmada, desembotellamiento |
| **Valor agregado** | 13 (`choke_mod` en el JSON de la ANH; PE para NSTA o ISO) |

---

## 16. Lo que falta confirmar

- La Tabla 2 de SPE-36848 (modelo expandido, «six minor chokes»): de pago.
- Criterio único de Edinson (decisión propuesta, §2). Falta validar con él un caso de borde: un transformador o variador que alimenta 2 o 3 pozos de una misma locación, ¿Pozo o Planta? La regla actual dice Planta, porque sirve a varios.
- Cómo quiere la ANH una restricción parcial y el exceso de una parada planeada.
- Si la ANH acepta dos tramos consecutivos de un mismo pozo con `h_fin_paro` = `h_ini_paro`.
- Las capacidades reales de exportación y de admisión de los inyectores en el piloto: son datos de la operadora.
