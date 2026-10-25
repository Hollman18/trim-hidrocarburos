# 5E.2 · Los potenciales de los tramos y lo que limita

Cada tramo de la tubería tiene un **potencial**: lo que deja pasar, en bbl/d de crudo. Lo que limita al campo es el tramo de menor potencial (el «potencial del sistema», SMPP de la NSTA, §5.3). Aquí: cómo se calcula cada potencial, el factor de medición con que se leen las pruebas (lo que TRIM propone y lo que se firma), con qué capacidades, el empate y «casi iguales», el texto de «Qué limita hoy» y las reglas de la firma de las capacidades.

Función central: `potencialesDelCampo(campoId, t, ctx, versiones?)` (`src/entities/choke.ts:962-989`) → `PotencialesCampo` (`:847-911`). Las capacidades: `capacidadesDe` y `trenesDePlanta` (`src/entities/capacidades.ts:170-217, 272-289`). Ruta: `GET /api/vistas/campos/:campo/capacidades` (`VistaCapacidades`, `choke.ts:1535-1558`); los potenciales de hoy viajan dentro de `GET /api/vistas/campos/:campo/tuberia` (5E.6) y de la serie (5E.8).

Todos los ejemplos son **de hoy en el demo**, 2-oct-2026 14:00 (hora de Colombia), salvo que se diga otra fecha.

---

### Potencial de los pozos

**Qué es.** Lo que pueden dar los pozos según sus pruebas: incluye el yacimiento, como la NSTA. Un pozo cerrado cuenta mientras pueda fluir; una frecuencia bajada no lo baja.

**Dónde se ve.** Producción → «La tubería del campo», primer tramo (`widgets/choke/Tuberia.tsx`); Turno y el árbol → «Qué limita hoy» (`widgets/arbol/HoyLimita.tsx`); Configuración → Capacidades (`widgets/configuracion/CapacidadesPaso.tsx`).

**Fórmula.**

$$
\text{pozos}(t) = \sum_{p\ \in\ \text{pozos con prueba}} q_p(t)\cdot \text{FM}_c
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $q_p(t)$ | crudo de la prueba vigente del pozo $p$ en $t$ | bbl/d | `pruebaEn(p, t).crudoBpd` |
| $\text{FM}_c$ | **factor de medición** del campo (QA-D3): el sesgo del separador de prueba contra el punto oficial | — | el **firmado** en `Config.capacidades[campo].factorMedicion` de la configuración que rige en $t$ (`factorMedicionDe`, `choke.ts:200-205`); sin firma, **1** (`PARAMETROS_CHOKE.factorMedicion`, `:195-198`). Lo que TRIM propone (abajo) **no rige sin firma** |

**Nunca el factor de asignación del mes** (QA-A-02): ese sale de lo que ya pasó por la planta y, con la planta limitando, escondería lo que la limita. La cifra con el factor de asignación existe aparte, `pozosAsignado` = Σ prueba × FA del mes: es la de Producción y del libro («cuánto se asigna»), no decide lo que limita.

**Ejemplo con los datos del demo** (ningún campo tiene el factor firmado: FM = 1).

| Campo | Pozos con prueba | `pozos` (FM = 1) | `pozosAsignado` (× FA) |
|---|---:|---:|---:|
| La Ceiba | 18 | 11.857 | 11.360,2 |
| Morichal Norte | 41 | 17.937 | 17.604,1 |
| Guacamayo | 12 | 6.828 | 6.615,2 |
| El Palmar | 7 | 3.321 | 3.276,9 |
| La Zarza (gas) | 9 | 3.061 | 3.158,5 |

Con el factor firmado, los pozos se leen con él: Guacamayo con 1,004 da $6.828 \times 1{,}004 = 6.855$ bbl/d, y el ⓘ de «Los pozos» lo dice («La suma de lo que dan los pozos con su prueba vigente × el factor de medición firmado (1,004)…», `referencia/escenarios/factor-de-medicion/tuberia-guacamayo.json`). `PotencialesCampo` trae `factorMedicion` y `factorFirmado`.

**Casos borde.** Pozo sin prueba: no entra (no se le inventa caudal). El agua de las mismas pruebas (`agua`, La Ceiba 224.075 bbl/d) da la relación crudo/agua con que se pasa el tren de agua a crudo (abajo): $11.857 / 224.075 = 0{,}0529$; el factor de medición multiplica el crudo, no el agua. Cada día se mide con el factor de la configuración de su medianoche: firmado hoy, rige desde mañana para los días (5E.4) y desde la firma para «hoy».

**Quién lo calcula.** Servidor.

**Referencia.** `src/entities/choke.ts:930-934` (`pruebasDelCampo`), `:962-971`; `docs/plan-circular-24/CORRECCIONES-QA.md` (D3).

---

### El factor de medición: lo que TRIM propone y lo que se firma

**Qué es.** El número por el que se multiplican las pruebas de los pozos para que digan lo que mide el punto oficial (QA-D3; 5E·H9). Las pruebas se miden con el separador de prueba y lo real con el punto oficial: si el separador lee de más o de menos, lo que limita, lo estructural y la eficiencia de producción quedan corridos. **TRIM lo propone y el administrador lo firma** con las capacidades; el motor usa el firmado o, sin firma, 1: **nunca la propuesta sola**.

**Dónde se ve.** Configuración → «Filosofía operacional», paso 2, panel «EL FACTOR DE MEDICIÓN DE LOS POZOS» (`widgets/configuracion/CapacidadesPaso.tsx`, `FactorMedicion`): lo que rige, la propuesta prellenada con su porqué y «Firmar este factor de medición» (6D.11).

**Fórmula** (`factorMedicionPropuesto`, `src/entities/choke.ts:1150-1204`):

$$
\text{FM}^{\text{propuesto}}_c = \operatorname{round}_{3}\Big(\operatorname{mediana}_{d\ \in\ D_c}\ \frac{\text{real}_d}{\sum_{p} q_p(d)}\Big), \qquad
D_c = \{\, d \in [\text{hoy} - 90\ \text{d},\ \text{hoy}) : 24\ \text{h con fiscal},\ \text{diferido}_d = 0,\ \text{limitan los pozos} \,\}
$$

- **Días sin paradas**: el libro no difirió nada ese día (`DiaCampo.diferido = 0`); **limitan los pozos**: el dominante del día es `pozos` (con la planta o afuera limitando, o con la capacidad superada, lo real no dice lo que dan los pozos). Así, todo lo que dieron los pozos pasó por el punto oficial.
- Las pruebas **sin** el factor que rigiera ese día: la propuesta no depende de lo ya firmado.
- La **mediana** y no el promedio: el inventario del tanque de venta mueve lo real de un día, no la mediana.
- La ventana y el mínimo son parámetros versionados (`PARAMETROS_CHOKE`, `choke.parametros@3`: `ventanaFactorDias` 90 y `minimoDiasFactor` 7). Con menos de 7 días que sirvan no se propone; en un campo de gas tampoco (la eficiencia de crudo no aplica).

**Ejemplo con los datos del demo** (ventana del 4 de jul al 1 de oct de 2026, 90 días completos):

| Campo | Días que sirven | Propuesta | Lo que dice |
|---|---:|---:|---|
| La Ceiba | 42 | **0,966** | el punto oficial mide 3,4 % menos que las pruebas |
| Morichal Norte | 9 | **0,961** | 3,9 % menos |
| Guacamayo | 24 | **1,004** | 0,4 % más |
| El Palmar | 80 | **0,998** | 0,2 % menos |
| La Zarza (gas) | — | ninguna | «La Zarza es un campo de gas: la eficiencia de crudo no aplica y TRIM no propone el factor de medición.» |

Con 30 días, Morichal tiene 5 que sirven y no se propone: «TRIM todavía no lo propone: en los 30 días antes de hoy hubo 5 días sin paradas y con los pozos limitando, y hacen falta 7.»

**Qué texto.** `texto` (lo que se prellena como porqué): «La mediana de lo que midió el punto oficial ÷ lo que dan las pruebas en 42 días sin paradas y con los pozos limitando, del 4 de jul al 1 de oct: el punto oficial mide 3,4 % menos que las pruebas.» `resumen` (lo que va junto a la eficiencia, 5E.4): «TRIM propone 0,966, medido en 42 días sin paradas.»

**Cómo se firma.** Dentro de las capacidades del campo: `Config.capacidades[campo].factorMedicion = { valor, porque }` (`FactorMedicionFirmado`, `src/entities/capacidades.ts:50-54`). **Quién y cuándo** los dice la versión que lo firmó (`firmaDeFactorMedicion`, `:233-244`; en la vista, `firmaFactor`); **por qué**, `porque`, en palabras (lo prellena la propuesta). Lo que rige va en `vigentes.factorMedicion` (`{ valor, estado: firmado | sin-firmar, porque? }`). Reglas (abajo, «Las reglas de la firma»): entre 0,5 y 1,5, con su porqué, nunca en un campo de gas; lejos de lo que TRIM mide (más de 0,02), pide confirmar.

**Quién lo calcula.** Servidor: `GET /api/vistas/campos/:campo/capacidades` → `factorMedicionPropuesto` (`{ campoId, valor?, dias, desde, hasta, texto, resumen }`) y `entrada.factorMedicionPropuesto` (`{ valor, dias }`, para la revisión). Se firma con `POST /api/configuracion`.

**Referencia.** `src/entities/choke.ts:1118-1204`; `src/entities/capacidades.ts:50-61, 134-140, 207-217, 233-244`; `referencia/choke/capacidades-{campo}.json`; `referencia/escenarios/factor-de-medicion/` (Guacamayo 1,004 y El Palmar 0,998 firmados desde el comienzo); `scripts/verificar-libro.mjs`, sección 32.

---

### Potencial de la planta: el tren que manda

**Qué es.** El menor de los **trenes medidos**, pasados a crudo, con la **capacidad instalada** (no baja por una parada: NSTA p. 29). Un carril por tren (`TrenTuberia`, `capacidades.ts:250-269`): crudo, agua y gas.

**Fórmula.**

$$
\text{planta} = \min_{\text{tren medido}} \text{enCrudo}_{\text{tren}}, \qquad
\text{enCrudo}_{\text{agua}} = \operatorname{round}\!\Big(C_{\text{agua}}\cdot\frac{\text{crudo}}{\text{agua}}\Big), \qquad
\text{enCrudo}_{\text{gas}} = \operatorname{round}\!\Big(C_{\text{gas}}\cdot\frac{\text{crudo}_{\text{esq}}}{\text{gas}_{\text{esq}}}\Big)\ \text{solo si se mide}
$$

$C_{\text{agua}}$ = la suma de las bombas del tren de agua **en servicio** (sin las de reserva), topada por la admisión de los inyectores y el tratamiento si son menores (`capacidadesDe`). El crudo y el agua de la conversión son los de las pruebas (la misma base del potencial de los pozos; `trenesEnCrudo`, `src/entities/planta.ts:66-71`). **Un tren sin medir no entra en el mínimo**: decidiría lo que limita con un número declarado (U2 §11.3, punto 1). En el demo **ningún tren de gas se mide**.

**Ejemplo con los datos del demo** (capacidades del demo, sin firmar):

| Campo | Tren de crudo | Tren de agua (bbl/d de agua → crudo) | Gas (KPC/d) | Planta | Manda |
|---|---:|---|---|---:|---|
| La Ceiba | 13.000 | 3 × 89.250 = 267.750 → 14.168 | 4.200, sin medir | 13.000 | crudo |
| Morichal Norte | 19.500 | 7 × 86.500 = 605.500 → 18.666 | 11.000, sin medir | 18.666 | agua |
| Guacamayo | 8.000 | 110.000 → 8.334 (P-201C de reserva no suma) | 2.600, sin medir | 8.000 | crudo |
| El Palmar | 3.600 | 16.000 → 4.028 | — | 3.600 | crudo |

Uso a todo el potencial: La Ceiba crudo 91,2 %, agua 83,7 %; Morichal crudo 92,0 %, agua 96,1 %.

**Casos borde.** Sin tren medido, sin esquema de planta o campo de gas: `planta = null` y el tramo va en `sinDato` (no se inventa). Sin agua en las pruebas, el tren de agua no se puede pasar a crudo (`enCrudo = null`).

**Qué texto.** El tren que manda va en «Qué limita hoy: la planta · tren de crudo (…)» (`TREN_NOMBRE`, `choke.ts:914`: «tren de crudo», «agua», «gas»).

**Quién lo calcula.** Servidor.

**Referencia.** `src/entities/capacidades.ts:170-217, 266-293`; `src/entities/choke.ts:938-948`.

---

### Potencial de afuera y el mercado

**Qué es.** Lo que deja salir el oleoducto o el transportador (`exportacion`): la capacidad firmada o, sin firma, la del esquema del demo. El **mercado** (lo que el cliente o la nominación reciben) es un subnivel: **no baja el potencial de afuera** (NSTA p. 29); si es menor que el sistema, se dice (`mercadoBajo`).

**Ejemplo con los datos del demo.** Afuera / mercado: La Ceiba 14.000 / 15.000; Morichal 21.000 / 24.000; Guacamayo 7.500 / 9.000; El Palmar 4.200 / 5.000. Ningún campo tiene hoy el mercado por debajo del sistema.

**Qué texto.** Con `mercadoBajo`, a la frase se le agrega «El comprador recibe hasta N bbl/d: es el mercado, un subnivel de afuera.» (`choke.ts:998`).

**Referencia.** `src/entities/choke.ts:974-981`.

---

### Lo que limita: el dominante, la holgura y el empate

**Qué es.** El tramo de menor potencial (`dominanteDe`, `choke.ts:833-844`), lo que le sobra a cada uno y los dos casos que la NSTA pide tratar aparte.

**Fórmula.**

$$
\text{sistema} = \min(\text{pozos},\ \text{planta},\ \text{afuera}),\qquad \text{holgura}_k = \text{potencial}_k - \text{sistema}
$$

- **Empate**: dos o más tramos iguales **al barril** (`Math.round`). «By design, no two potentials should be exactly the same. If they are you must provide an explanation» (NSTA §5.4). Se marca, se toma **el primero de la tubería** (donde el flujo se frena primero) y producción lo explica por escrito en la firma de las capacidades (`explicacionEmpate`).
- **Casi iguales**: los tramos cuya holgura, sobre el sistema, es menor que el umbral: $(\text{potencial}_k - \text{sistema})/\text{sistema} < 0{,}03$ (`PARAMETROS_CHOKE.umbralCasiIguales`, versión `choke.parametros@3`). La pantalla lo dice y **no avisa un cambio** de lo que limita (5E.8). No es la banda del factor de asignación (±15 % en La Ceiba): esa es regulatoria, no el error de las pruebas.

**Ejemplo con los datos del demo** (hoy): en los cuatro campos de crudo limitan **los pozos**. Holgura: La Ceiba planta 1.143, afuera 2.143; Morichal 729 / 3.063; Guacamayo 1.172 / **672** (afuera es el siguiente); El Palmar 279 / 879.

Empate y casi iguales, corridos con `dominanteDe` y con escenarios de capacidades:

| Caso | Potenciales (bbl/d) | Resultado |
|---|---|---|
| Empate | pozos 3.400 · planta 3.400 · afuera 4.100 | empatados pozos y planta; manda pozos; holgura afuera 700 |
| Casi empate | pozos 3.401 · planta 3.400 · afuera 4.100 | manda la planta; casi iguales pozos y planta; sin empate |
| Guacamayo con las capacidades de antes (afuera 6.800, crudo 7.400), hoy | 6.828 · 7.400 · 6.800 | manda afuera; casi iguales pozos y afuera |
| La Ceiba, 15-mar-2026 12:00, con el tren de crudo de antes (12.000) | 12.212 · 12.000 · 14.000 | manda la planta (tren de crudo); casi iguales pozos y planta |
| La Ceiba, misma hora, con el de hoy (13.000) | 12.212 · 13.000 · 14.000 | mandan los pozos; a la planta le sobran 788 |
| La Ceiba hoy, tren de crudo firmado en 11.000 | 11.857 · 11.000 · 14.000 | manda la planta; a los pozos les sobran 857 |
| La Ceiba hoy, crudo y afuera firmados en 11.000 | 11.857 · 11.000 · 11.000 | empate planta y afuera; manda la planta |

**Qué texto** (`textosDeHoy`, `choke.ts:992-1013`). `textoCorto`: «Qué limita hoy: {los pozos | la planta · tren | afuera} (N bbl/d)». `texto`, el primero que aplique:

| Condición | Texto corrido |
|---|---|
| Empate con explicación firmada | «Dos tramos dan exactamente lo mismo: la planta y afuera. Por qué, según la firma: «El oleoducto se dimensionó con el tren de crudo».» |
| Empate sin explicación | «Dos tramos dan exactamente lo mismo: la planta y afuera. Producción tiene que explicar por qué (lo pide el método).» |
| Casi iguales | «Los pozos y la planta están casi iguales (menos de 3 % de diferencia): lo que se gane en uno lo frena el otro.» (Guacamayo con las de antes: «Los pozos y afuera están casi iguales …») |
| Limita la planta | «A los pozos les sobran 857 bbl/d: abrir más pozos no da nada. Lo que da es ampliar el tren de crudo.» |
| Limita afuera | «Afuera no reciben más: a los pozos les sobran N bbl/d. Lo que da es más nominación o más evacuación.» |
| Limitan los pozos, sigue la planta | «A la planta le sobran 1.143 bbl/d: lo que den de más los pozos pasa, hasta 1.143 bbl/d.» (La Ceiba; Morichal 729; El Palmar 279) |
| Limitan los pozos, sigue afuera | «Afuera reciben 672 bbl/d más: lo que den de más los pozos pasa, hasta 672 bbl/d.» (Guacamayo) |
| Campo de gas | corto «Campo de gas: su tubería todavía no está»; largo «La Zarza es un campo de gas. La tubería del gas todavía no está: el gas tiene una tolerancia diferente y falta definir cómo se mide su potencial.» |
| Sin esquema | «Sin esquema de planta: no se sabe qué limita» / «{campo} no tiene esquema de planta registrado: sin él no se sabe qué limita.» |

Con empate, `explicacion` lleva la firmada o, sin ella: «La planta y afuera dan lo mismo, 11.000 bbl/d: la NSTA (§5.4) pide explicarlo por escrito. Ampliar uno solo no da un barril más; se toma el tramo de la planta, el primero de la tubería.» Con los pozos y la planta: «Los pozos y la planta dan lo mismo, 3.400 bbl/d: … se toma el tramo de los pozos, el primero de la tubería.» El sujeto es el tramo, en singular (antes decía «se toma los pozos», 5E·H32).

**Casos borde.** Campo de gas (`CAMPOS_DE_GAS`, `planta.ts:719`): sin tubería de crudo, sin holgura, sin dominante (`null`). Tramo sin dato: entra como $+\infty$ al mínimo y va en `sinDato`.

**Quién lo calcula.** Servidor. El umbral y los días para avisar son parámetros versionados (`choke.parametros@3`, que agregó la ventana y el mínimo de días del factor de medición), provisionales hasta que los valide la operadora (5E.11).

**Referencia.** `src/entities/choke.ts:807-1013`; `referencia/escenarios/empate/` (3 casos), `referencia/escenarios/capacidades-de-antes/` (7), `referencia/choke/tuberia-{campo}-2026-09.json`.

---

### Las capacidades: firmadas, del demo o sin dato

**Qué es.** Lo que rige en un campo (`CapacidadesVigentes`, `capacidades.ts:143-159`): por tramo (`crudo`, `agua`, `bombas[]`, `gas` con `medido`, `afuera`, `mercado`, `tratamiento`, `admision`), `{ valor, unidad, estado: firmado | demo | sin-dato, fuente }`, y el factor de medición de los pozos (`factorMedicion`: `{ valor, estado: firmado | sin-firmar, porque? }`, arriba). Se firman en `Config.capacidades` (`CapacidadesCampo`, `:65-85`) con su fuente: `placa`, `prueba`, `contrato`, `nominacion`, `estimado` («Placa del equipo», «Prueba de capacidad», «Contrato de transporte», «Nominación aceptada», «Estimado de ingeniería», `:42-45`). Lo que no se firma sigue con el dato del demo, marcado. **Cada día usa las que regían ese día** (`configEn` del historial): firmar hoy no cambia un día cerrado.

**Ejemplo con los datos del demo.** Ningún campo tiene capacidades firmadas: todas en `estado: demo`, con la fuente «La capacidad del tren de crudo en el esquema de planta: dato del demo, sin firmar», y el factor de medición en 1, `sin-firmar`. El aviso de la revisión de lo que rige (no bloquea): «Sin firmar, con el dato del demo: tren de crudo, tren de agua, afuera, el cliente o la nominación (mercado), tren de gas y admisión de los inyectores. Al firmarlas, cada una dirá de dónde sale: placa del equipo, prueba de capacidad, contrato de transporte, nominación aceptada o estimado de ingeniería.»

**Quién lo calcula.** Servidor: `GET /api/vistas/campos/:campo/capacidades` → `{ campoId, vigentes, firma?, firmaFactor?, factorMedicionPropuesto, entrada, hallazgos }`; `entrada` es lo que la revisión necesita (lo máximo que ya pasó, el potencial de los pozos con el factor que rige y su agua, si hay gas, y lo que TRIM propone del factor).

**Referencia.** `src/entities/capacidades.ts:40-247`; `src/entities/choke.ts:1535-1558`; `referencia/choke/capacidades-{campo}.json`.

---

### Las reglas de la firma de las capacidades

**Qué es.** Lo que no deja firmar (422 de `POST /api/configuracion` y de la vista previa; reglas 10 y 11 de la firma). La forma (`validarCapacidades`, `capacidades.ts:418-453`): campo registrado y una vez; cada número > 0 y ≤ 10.000.000 con su fuente; cada bomba del tren de agua del campo y una vez; el gas dice si se mide; **el factor de medición entre 0,5 y 1,5** (`TOPE_FACTOR_MEDICION`), **con su porqué** (5 caracteres o más, 500 a lo sumo) y **nunca en un campo de gas** («Factor de medición de La Zarza: en un campo de gas la eficiencia de crudo no aplica: no se firma.»). Contra lo que ya pasó (`revisarCapacidades`, `:350-417`, por `capacidadesQueBloquean`, `choke.ts:1567-1574`, **solo en los campos cuyas capacidades cambian con esta firma**):

1. el tren de crudo y afuera no pueden dejar pasar menos de **lo máximo que ya pasó en un día completo por el punto oficial en los últimos 30 días** (`maximoCrudoDiario`, `choke.ts:1520-1527`);
2. un empate exacto entre los pozos, la planta y afuera necesita `explicacionEmpate` (5 caracteres o más);
3. un cambio de más del **20 %** frente a lo vigente (`CAMBIO_GRANDE`, `capacidades.ts:295`) pide confirmar, **sin bloquear**;
4. un factor de medición a más de **0,02** de lo que TRIM propone (`DISTANCIA_FACTOR_PROPUESTO`, `capacidades.ts:61`) pide confirmar, **sin bloquear**: «Factor de medición: usted escribe 1,050 y TRIM mide 1,004 en 24 días sin paradas. ¿Es correcto?» (Guacamayo). Fuera de 0,5–1,5, sin porqué o en un campo de gas, bloquea también aquí (`tramo: factor`). El empate de la regla 2 se revisa con los pozos leídos con el factor que quedaría.

**Ejemplo con los datos del demo.** Lo máximo de los últimos 30 días: La Ceiba 11.683 bbl/d (16-sep), Morichal 17.588 (10-sep), Guacamayo 6.975 (18-sep), El Palmar 3.402 (4-sep), La Zarza 3.221 (8-sep). Revisando La Ceiba:

| Se escribe | Bloquea | Texto |
|---|---|---|
| tren de crudo 5.000 (placa) | sí | «Tren de crudo: por este tramo ya pasaron 11.683 bbl/d de crudo el 16 de sept, y usted escribe 5.000: no puede dejar pasar menos de lo que ya pasó. Revise el número o la unidad.» |
| (lo mismo) | no | «Tren de crudo: cambia 62 % frente a lo vigente (13.000 bbl/d de crudo). ¿Es correcto?» |
| tren de crudo 17.000 (placa) | no | «Tren de crudo: cambia 31 % frente a lo vigente (13.000 bbl/d de crudo). ¿Es correcto?» |
| afuera 14.000 sin fuente válida | sí | «Afuera: el oleoducto o el transportador: ¿de dónde sale este número? Placa del equipo, prueba de capacidad, contrato de transporte, nominación aceptada o estimado de ingeniería.» |
| afuera 13.000 (= tren de crudo) | sí | «Con estos números, la planta y afuera dan exactamente lo mismo (13.000 bbl/d). El método pide explicar un empate: escriba por qué.» |
| afuera 13.000 + explicación | no | «La planta y afuera dan exactamente lo mismo (13.000 bbl/d), y está explicado: «El oleoducto se dimensionó con la planta».» |

En la firma, cada texto que bloquea va precedido del campo: «La Ceiba: …».

**Quién lo calcula.** Los dos lados (la pantalla mientras se escribe); **los 422 del servidor mandan**.

**Referencia.** `src/entities/capacidades.ts:295-503`; `CONTRATO.md` · «Configuración», reglas 10 y 11.
