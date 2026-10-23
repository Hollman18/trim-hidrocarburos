# 5E.2 · Los potenciales de los tramos y lo que limita

Cada tramo de la tubería tiene un **potencial**: lo que deja pasar, en bbl/d de crudo. Lo que limita al campo es el tramo de menor potencial (el «potencial del sistema», SMPP de la NSTA, §5.3). Aquí: cómo se calcula cada potencial, con qué capacidades, el empate y «casi iguales», el texto de «Qué limita hoy» y las reglas de la firma de las capacidades.

Función central: `potencialesDelCampo(campoId, t, ctx, versiones?)` (`src/entities/choke.ts:950-975`) → `PotencialesCampo` (`:837-899`). Las capacidades: `capacidadesDe` y `trenesDePlanta` (`src/entities/capacidades.ts:141-183, 225-242`). Ruta: `GET /api/vistas/campos/:campo/capacidades` (`VistaCapacidades`, `choke.ts:1399-1414`); los potenciales de hoy viajan dentro de `GET /api/vistas/campos/:campo/tuberia` (5E.6) y de la serie (5E.8).

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
| $\text{FM}_c$ | **factor de medición** del campo (QA-D3): el sesgo del separador de prueba contra el punto oficial, medido en días sin restricción | — | `factorMedicion(campoId)` (`choke.ts:195-196`); mientras no se mida y se firme, **1** (`PARAMETROS_CHOKE.factorMedicion`, `:189`) |

**Nunca el factor de asignación del mes** (QA-A-02): ese sale de lo que ya pasó por la planta y, con la planta limitando, escondería lo que la limita. La cifra con el factor de asignación existe aparte, `pozosAsignado` = Σ prueba × FA del mes: es la de Producción y del libro («cuánto se asigna»), no decide lo que limita.

**Ejemplo con los datos del demo.**

| Campo | Pozos con prueba | `pozos` (FM = 1) | `pozosAsignado` (× FA) |
|---|---:|---:|---:|
| La Ceiba | 18 | 11.857 | 11.360,2 |
| Morichal Norte | 41 | 17.937 | 17.604,1 |
| Guacamayo | 12 | 6.828 | 6.615,2 |
| El Palmar | 7 | 3.321 | 3.276,9 |
| La Zarza (gas) | 9 | 3.061 | 3.158,5 |

**Casos borde.** Pozo sin prueba: no entra (no se le inventa caudal). El agua de las mismas pruebas (`agua`, La Ceiba 224.075 bbl/d) da la relación crudo/agua con que se pasa el tren de agua a crudo (abajo): $11.857 / 224.075 = 0{,}0529$.

**Quién lo calcula.** Servidor.

**Referencia.** `src/entities/choke.ts:917-922` (`pruebasDelCampo`), `:950-955`; `docs/plan-circular-24/CORRECCIONES-QA.md` (D3).

---

### Potencial de la planta: el tren que manda

**Qué es.** El menor de los **trenes medidos**, pasados a crudo, con la **capacidad instalada** (no baja por una parada: NSTA p. 29). Un carril por tren (`TrenTuberia`, `capacidades.ts:203-222`): crudo, agua y gas.

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

**Qué texto.** El tren que manda va en «Qué limita hoy: la planta · tren de crudo (…)» (`TREN_NOMBRE`, `choke.ts:902`: «tren de crudo», «agua», «gas»).

**Quién lo calcula.** Servidor.

**Referencia.** `src/entities/capacidades.ts:141-183, 219-246`; `src/entities/choke.ts:926-936`.

---

### Potencial de afuera y el mercado

**Qué es.** Lo que deja salir el oleoducto o el transportador (`exportacion`): la capacidad firmada o, sin firma, la del esquema del demo. El **mercado** (lo que el cliente o la nominación reciben) es un subnivel: **no baja el potencial de afuera** (NSTA p. 29); si es menor que el sistema, se dice (`mercadoBajo`).

**Ejemplo con los datos del demo.** Afuera / mercado: La Ceiba 14.000 / 15.000; Morichal 21.000 / 24.000; Guacamayo 7.500 / 9.000; El Palmar 4.200 / 5.000. Ningún campo tiene hoy el mercado por debajo del sistema.

**Qué texto.** Con `mercadoBajo`, a la frase se le agrega «El comprador recibe hasta N bbl/d: es el mercado, un subnivel de afuera.» (`choke.ts:984`).

**Referencia.** `src/entities/choke.ts:960-967`.

---

### Lo que limita: el dominante, la holgura y el empate

**Qué es.** El tramo de menor potencial (`dominanteDe`, `choke.ts:824-834`), lo que le sobra a cada uno y los dos casos que la NSTA pide tratar aparte.

**Fórmula.**

$$
\text{sistema} = \min(\text{pozos},\ \text{planta},\ \text{afuera}),\qquad \text{holgura}_k = \text{potencial}_k - \text{sistema}
$$

- **Empate**: dos o más tramos iguales **al barril** (`Math.round`). «By design, no two potentials should be exactly the same. If they are you must provide an explanation» (NSTA §5.4). Se marca, se toma **el primero de la tubería** (donde el flujo se frena primero) y producción lo explica por escrito en la firma de las capacidades (`explicacionEmpate`).
- **Casi iguales**: los tramos cuya holgura, sobre el sistema, es menor que el umbral: $(\text{potencial}_k - \text{sistema})/\text{sistema} < 0{,}03$ (`PARAMETROS_CHOKE.umbralCasiIguales`, versión `choke.parametros@2`). La pantalla lo dice y **no avisa un cambio** de lo que limita (5E.8). No es la banda del factor de asignación (±15 % en La Ceiba): esa es regulatoria, no el error de las pruebas.

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

**Qué texto** (`textosDeHoy`, `choke.ts:978-999`). `textoCorto`: «Qué limita hoy: {los pozos | la planta · tren | afuera} (N bbl/d)». `texto`, el primero que aplique:

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

Con empate, `explicacion` lleva la firmada o, sin ella: «La planta y afuera dan lo mismo, 11.000 bbl/d: la NSTA (§5.4) pide explicarlo por escrito. Ampliar uno solo no da un barril más; se toma la planta, el primero de la tubería.» (con pozos y planta: «… se toma los pozos, …», ver 5E.11).

**Casos borde.** Campo de gas (`CAMPOS_DE_GAS`, `planta.ts:719`): sin tubería de crudo, sin holgura, sin dominante (`null`). Tramo sin dato: entra como $+\infty$ al mínimo y va en `sinDato`.

**Quién lo calcula.** Servidor. El umbral y los días para avisar son parámetros versionados (`choke.parametros@2`), provisionales hasta que los valide la operadora (5E.11).

**Referencia.** `src/entities/choke.ts:798-999`; `referencia/escenarios/empate/` (3 casos), `referencia/escenarios/capacidades-de-antes/` (7), `referencia/choke/tuberia-{campo}-2026-09.json`.

---

### Las capacidades: firmadas, del demo o sin dato

**Qué es.** Lo que rige en un campo (`CapacidadesVigentes`, `capacidades.ts:116-131`): por tramo (`crudo`, `agua`, `bombas[]`, `gas` con `medido`, `afuera`, `mercado`, `tratamiento`, `admision`), `{ valor, unidad, estado: firmado | demo | sin-dato, fuente }`. Se firman en `Config.capacidades` (`CapacidadesCampo`, `:48-66`) con su fuente: `placa`, `prueba`, `contrato`, `nominacion`, `estimado` («Placa del equipo», «Prueba de capacidad», «Contrato de transporte», «Nominación aceptada», «Estimado de ingeniería», `:38-41`). Lo que no se firma sigue con el dato del demo, marcado. **Cada día usa las que regían ese día** (`configEn` del historial): firmar hoy no cambia un día cerrado.

**Ejemplo con los datos del demo.** Ningún campo tiene capacidades firmadas: todas en `estado: demo`, con la fuente «La capacidad del tren de crudo en el esquema de planta: dato del demo, sin firmar». El aviso de la revisión de lo que rige (no bloquea): «Sin firmar, con el dato del demo: tren de crudo, tren de agua, afuera, el cliente o la nominación (mercado), tren de gas y admisión de los inyectores. Al firmarlas, cada una dirá de dónde sale: placa del equipo, prueba de capacidad, contrato de transporte, nominación aceptada o estimado de ingeniería.»

**Quién lo calcula.** Servidor: `GET /api/vistas/campos/:campo/capacidades` → `{ campoId, vigentes, firma?, entrada, hallazgos }`; `entrada` es lo que la revisión necesita (lo máximo que ya pasó, el potencial y el agua de los pozos, si hay gas).

**Referencia.** `src/entities/capacidades.ts:36-200`; `src/entities/choke.ts:1399-1414`; `referencia/choke/capacidades-{campo}.json`.

---

### Las reglas de la firma de las capacidades

**Qué es.** Lo que no deja firmar (422 de `POST /api/configuracion` y de la vista previa; reglas 10 y 11 de la firma). La forma (`validarCapacidades`, `capacidades.ts:346-373`): campo registrado y una vez; cada número > 0 y ≤ 10.000.000 con su fuente; cada bomba del tren de agua del campo y una vez; el gas dice si se mide. Contra lo que ya pasó (`revisarCapacidades`, `:293-345`, por `capacidadesQueBloquean`, `choke.ts:1423-1430`, **solo en los campos cuyas capacidades cambian con esta firma**):

1. el tren de crudo y afuera no pueden dejar pasar menos de **lo máximo que ya pasó en un día completo por el punto oficial en los últimos 30 días** (`maximoCrudoDiario`, `choke.ts:1384-1391`);
2. un empate exacto entre los pozos, la planta y afuera necesita `explicacionEmpate` (5 caracteres o más);
3. un cambio de más del **20 %** frente a lo vigente (`CAMBIO_GRANDE`, `capacidades.ts:248`) pide confirmar, **sin bloquear**.

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

**Referencia.** `src/entities/capacidades.ts:248-416`; `CONTRATO.md` · «Configuración», reglas 10 y 11.
