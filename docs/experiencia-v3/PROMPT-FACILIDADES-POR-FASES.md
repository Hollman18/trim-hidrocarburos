# Prompt · TRIM en plantas de facilidades, por fases

> Para un agente (o equipo de agentes) que trabaja en `/Users/hollman/trim-hidrocarburos`.
> Escrito el 3-nov-2026 con las decisiones del dueño (Hollman). Se ejecuta **una fase a la vez**: hacer → probar → informar → esperar «sigue».

---

## 0. La misión, en una frase

Llevar TRIM a los **equipos críticos de las plantas de facilidades** —con la **energía** como puerta de entrada— armado en **piezas que encajan como Lego**, cada pieza **leída por rol**, y con los **barriles bien contados**. **Se conservan la estructura y el diseño de pantallas por rol de la v3**: lo nuevo entra como contenido de esa estructura.

## 1. Lo que decidió el dueño (rige todo el trabajo)

| # | Decisión | Fuente de verdad |
|---|---|---|
| 1 | **Foco en facilidades**: los equipos de la planta (agua, crudo, gas, servicios) son el sujeto; el pozo es donde se difiere el barril, la causa puede ser de la planta | `~/TRIM-petroleras/investigacion/19-plantas-de-facilidades-energia.md` |
| 2 | **La conexión depende del estado de la planta**: historiador, directo a PLC y equipos, o mezcla. Siempre solo lectura, salida desde adentro, lista cerrada de tags | `docs/backend/04-cadena-de-datos.md` §4.2 |
| 3 | **Piezas Lego**: Núcleo (conexión, catálogo de equipos, avisos, panel de indicadores) + Equipos · Energía · Planta · Barriles · Mantenimiento. Cada cliente contrata las suyas. Las piezas comparten un contrato mínimo: **equipo · evento · causa · barriles**; una pieza ausente deja «sin dato», nunca un hueco ni un error | §3 de este prompt |
| 4 | **Todo por rol**: cada pieza dice qué ve cada rol y cómo lo lee. Lo visible = piezas contratadas ∩ lo necesario del rol | `docs/experiencia-v3/necesario-por-rol.md`, `docs/experiencia-v3/roles/*.md` |
| 5 | **Las pantallas por rol se conservan.** Cada rol sigue con su pregunta, su número principal y su acción principal. Lo nuevo entra por la ficha del rol y pasa las dos preguntas de §5.1 de `necesario-por-rol.md` | `docs/experiencia-v3/CONSTRUCCION.md` |
| 6 | **Barriles**: el diferido se calcula; el perdido se registra (no se mide); van lado a lado y nunca se suman. El encogimiento por mezcla de crudos es un ajuste de volumen, ni diferido ni perdido, y ya lo absorbe el factor de asignación. **El hueco real es el diluyente** | `~/TRIM-petroleras/investigacion/20-mezcla-de-crudos-encogimiento.md` |

## 2. Decisiones abiertas (pregúntalas al dueño antes de la fase que las usa)

| # | Pregunta | Recomendación | La usa |
|---|---|---|---|
| D1 | ¿Factor de asignación **diario** (Res. 40236 art. 21) o mensual como hoy? | **✅ DECIDIDO (4-nov-2026): diario** | Fase 2 |
| D2 | El aviso de apagón necesita llegar **aunque nadie tenga TRIM abierto**. **✅ DECIDIDO (4-nov-2026): notificación push** del navegador, en el celular o en el escritorio, **solo para el evento de planta**. WhatsApp sigue retirado (`docs/experiencia-v3/whatsapp.md`) | Push web (Service Worker + Push API, llaves VAPID) | Fase 4 |
| D3 | ¿Responsable de energía como rol propio, o en la ficha del jefe de mantenimiento? **✅ DECIDIDO (4-nov-2026): las dos.** Existe el rol «Responsable de energía»; el cliente lo enciende si tiene esa persona. Si no lo tiene, lo de energía lo recibe el jefe de mantenimiento | Rol nuevo, apagado por defecto; sin él, el jefe | Fase 4 |

Las preguntas al experto de `19` §8.3 y `20` §9 que sigan sin respuesta se tratan como **supuestos**: el dato del demo se marca `[SUPUESTO]` en el código y en el informe de la fase, y nunca se presenta como dato de campo.

## 3. Las piezas y quién las ve

| Pieza | Qué resuelve | Roles que la leen (cómo) |
|---|---|---|
| **Núcleo** | Datos sueltos juntos, avisos, panel de indicadores a medida | Todos; **adm** configura conexiones y catálogo |
| **Equipos** | Aviso antes de la falla de cada equipo | **jefe** (qué intervengo, días que le quedan), **conf** (modo de falla, tendencia), **tec** (su trabajo de hoy), **ger** (solo el que más barriles pone en riesgo) |
| **Energía** | Aviso de apagón aunque el sitio se apague, margen de la generación, re-arranque | **sup** (qué se paró, minutos de aire, horas de tanque, orden de arranque), **oper** (una pregunta con botones), **ger** (bbl/d en juego y desde cuándo), **jefe** o responsable de energía (equipo eléctrico, eventos de relé, margen) |
| **Planta** | Trenes de agua, crudo, gas y servicios; cuánto falta para la siguiente consecuencia | **sup**, **prod** (qué tren frena la producción), **jefe** |
| **Barriles** | Libro de diferidos y perdidos: dónde, por qué, cuánto costó | **ger** (por causa y costo), **prod** (balance completo), **sup** (paradas del turno), **reg** (paradas con su causa), **conf** (qué equipo pone más diferido) |
| **Mantenimiento** | Causa capturada, confiabilidad, aviso listo para SAP | **jefe**, **conf**, **tec** |

Un mismo evento se dice distinto a cada rol. Ejemplo de referencia para el apagón:
- **ger:** «Se fue la energía en la planta. 1.665 bbl/d en juego. Mantenimiento ya está avisado.»
- **sup:** «Apagón 14:02. Aire: 18 min. Tanque de agua: 2,1 h. Arranque: aire → P-201A → P-201B…»
- **oper:** «¿Ves luz en la subestación 2? [Sí] [No]»
- **energía:** «Disparo 52-SE2 14:02:03. Generación disponible 3,1 de 4,5 MW.»

## 4. Cómo se trabaja en cada fase

1. **Lee** la sección de la fase y sus fuentes de verdad. Solo esa fase.
2. **Planea** en el informe: archivos, dueño de cada archivo, pruebas que vas a escribir. Si trabajan varios agentes: tandas de **4 como máximo**, con un dueño por archivo.
3. **Construye** con estas reglas:
   - El motor calcula en `src/entities`. Las pantallas leen solo a través de `src/shared/api` (lo vigila oxlint). Las fechas pasan por `formatoFecha`.
   - El contrato **crece al lado**: lo que sale se marca RETIRADO y cada cambio se anota en `docs/backend/CAMBIOS-CONTRATO.md` y en `CONTRATO.md`.
   - Cada número sale de una función con nombre. Si no hay dato, la pantalla dice «sin dato» o «sin registro».
   - Español de Colombia, de usted, poco texto, primero el número.
4. **Prueba** hasta que la **puerta** de la fase esté verde (§5).
5. **Documenta**: la ficha de cada rol afectado, el capítulo del documento técnico que corresponda (`docs/backend/`) y los pantallazos (`npm run pantallazos`).
6. **Informa y detente.** El informe dice: qué se hizo, la salida de cada comando de la puerta, los pantallazos por rol, los supuestos usados y lo que quedó pendiente. La fase siguiente empieza cuando el dueño dice «sigue».

Reglas de entorno que se cumplen siempre:
- Mata procesos solo por PID; los puertos 4173, 5173 y 4199 son de otros.
- Trabaja con las dependencias instaladas.
- El dueño hace los commits.
- Edita cuando no estén corriendo e2e.
- `tsc -b` es el chequeo de tipos.

## 5. La puerta de cada fase (lo común)

Una fase está **verde** cuando se cumple todo esto, con la salida a la vista en el informe:

- [ ] `npx tsc -b`, `npx oxlint src` y `npm test` pasan.
- [ ] Cada cambio tiene su prueba, y la prueba **falla sin el cambio** (escribe primero la prueba y muéstrala roja).
- [ ] Las pruebas verifican el **resultado** que ve el rol (el número, el texto, la acción), no el mecanismo.
- [ ] Las specs e2e propias de la fase pasan contra tu Vite (`TRIM_URL=http://localhost:518x`). La suite completa la corre el coordinador.
- [ ] Pantallazos de cada rol afectado, en escritorio (1440) y teléfono (390), comparados con los de la fase anterior. Si un rol cambió sin que la fase lo pidiera, la fase no está verde.
- [ ] El libro sigue exacto: potencial − real = Σ diferidos, y diferido y perdido nunca sumados (`npm run verificar:libro`).
- [ ] La ficha de cada rol afectado dice qué ve de lo nuevo y cómo lo lee.

---

## Fase 0 · El diseño por escrito

**Hace:** deja escrito, antes de tocar código, todo lo de §1–§3 en las fuentes oficiales.
- En cada `docs/experiencia-v3/roles/<rol>.md`, una sección «Piezas» que diga qué ve el rol de cada pieza y cómo lo lee.
- `docs/backend/CAMBIOS-CONTRATO.md` con lo que agregan las fases 1–7: piezas por cliente, equipos de planta, evento de planta, diluyente, protocolos de conexión directa y factor diario.

**Puerta propia:**
- Las 11 fichas tienen la sección «Piezas», incluidos los roles apagados, que dicen «apagado».
- Cada fila de §3 aparece en las fichas.
- El dueño aprueba el diseño. Esta fase no cambia código.

## Fase 1 · Las piezas (Lego) y el filtro por rol

**Hace:**
- Los interruptores globales de `src/shared/config/producto.ts` pasan a ser **piezas contratadas por cliente**, configurables por campo.
- Cada pantalla, sección y número declara a qué pieza pertenece.
- Lo visible para un usuario = piezas del cliente ∩ lo necesario de su rol.
- La fase **reorganiza lo que ya existe**: con todas las piezas encendidas, el producto se ve igual que hoy.

**Puerta propia:**
- Con todas las piezas encendidas, los pantallazos de los 11 roles son **idénticos** a los de hoy.
- Con combinaciones reales, ningún rol muestra un hueco, un error ni un 0 inventado; donde falta una pieza dice «sin dato» o la sección no aparece. Las combinaciones: solo Equipos · solo Energía · Planta + Equipos · todo.
- Prueba que encienda y apague cada pieza y verifique lo que ve cada rol.

## Fase 2 · Barriles bien contados

**Hace:**
- **Diluyente:** esquema de dilución por campo (en planta, en fondo de pozo o en oleoducto) y volumen diario de nafta. El fiscal se vuelve **crudo neto de nafta**, también en las pruebas de pozo cuando la nafta va al fondo.
- Si el campo diluye y falta el dato de nafta, el libro marca ese día **«no publicable»** con su motivo, en lugar de una cifra.
- **Factor de asignación diario**, si el dueño lo aprobó (D1). Si no, deja escrito en `docs/backend/05a-libro/02-factor-de-asignacion.md` por qué es mensual.
- Agrega «falta de diluyente» como causa de parada y «evaporación» y «fondos de tanque» como tipos de pérdida.

**Puerta propia:**
- Un campo con 22 % de nafta sin descontar ya **no** infla el diferido: un evento de 100 bbl da 100, no 121.
- El mismo campo sin dato de nafta da «no publicable».
- Un campo sin diluyente da exactamente los mismos números que hoy.
- La identidad del libro sigue exacta.

## Fase 3 · Conexión según el estado de la planta

**Hace:**
- En `src/entities/cadena.ts`, los nombres de las vías de conexión directa a equipos de planta:
  - relés por IEC 61850 o DNP3;
  - analizadores de red y controladores de generador o compresor por Modbus RTU;
  - UPS por SNMP;
  - la entrada digital «hay tensión» del gateway.
- En el simulador, un campo de demo **sin historiador**, todo por conexión directa, además de los que hoy mezclan.

**Puerta propia:**
- La procedencia de cada tag nuevo dice de dónde viene y que es solo lectura.
- El campo sin historiador funciona de punta a punta.
- `npm run verificar:contrato` pasa.

## Fase 4 · Pieza Energía

**Hace:**
- **Familias nuevas en el vigía**, cada una con sus partes, variables y límites con fuente o `[SUPUESTO]` (ver `19` §5.2): generador, transformador, UPS y compresor de aire.
- **Evento de planta:** el motor detecta el apagón por dos vías: muchas cargas que paran a la vez, o el silencio del gateway (`NDEATH` de Sparkplug).
- **Total o parcial:** distingue los dos en el primer minuto (`19` §2.3) y calcula los **relojes de consecuencia** (minutos de aire, horas de tanque).
- **Lectura por rol:** cada rol lo ve como dice §3. El aviso sale además por **notificación push** (D2), en el celular o el escritorio, a quien lo tenga activado, aunque no tenga TRIM abierto. Lo de energía lo recibe el «Responsable de energía» si el cliente lo encendió; si no, el jefe de mantenimiento (D3).
- **Atribución:** el diferido del corte se carga a «energía» con la hora del relé cuando existe, y con la deducción de hoy (`choke.ts`, caso `energia`) cuando no.

**Puerta propia:**
- Un apagón total y uno parcial de demo producen, cada uno, el aviso correcto para sup, oper, ger y jefe, con sus relojes.
- Los equipos que paran por el apagón **no** levantan falsas alarmas de falla propia.
- El diferido del corte aparece en el libro con causa «energía» y la identidad sigue exacta.

## Fase 5 · Pieza Planta

**Hace:**
- **Los demás equipos de facilidades** en el vigía (`19` §1.2 y §2.2):
  - bombas de transferencia y despacho;
  - tratadores térmicos y electrostáticos;
  - torres de enfriamiento;
  - separadores y FWKO;
  - bombas de diluyente.
- **Listas de equipos** organizadas por tren de planta (agua, crudo, gas, servicios), usando los trenes que ya existen (`src/entities/equipos-tecnico.ts`).

**Puerta propia:**
- Cada familia nueva tiene al menos un aviso de demo que el vigía detecta y que el jefe y confiabilidad ven en su ficha.
- Las listas por tren cuadran con el catálogo.

## Fase 6 · Re-arranque guiado y margen de generación

**Hace:**
- **Una vista para el supervisor tras un apagón:** el orden de arranque por barriles, con cronómetro por fase.
- **Límites con fuente** (`19` §4.1): escalones del generador según ISO 8528-5, arranques permitidos por motor y espera por giro inverso de la ESP.
- **Margen N-1:** ¿alcanza la generación si se cae la unidad más cargada? Se presenta junto con el orden de deslastre, traducido a barriles, y reutiliza el orden de cierre de pozos que ya existe.

**Puerta propia:**
- El orden propuesto respeta todos los límites.
- La vista cabe en el teléfono (390) con una sola acción principal.
- El cronómetro deja registrado cuánto duró cada fase del arranque.

> ✅ **CONSTRUIDA el 4-nov-2026.** Motor `src/entities/arranque.ts`, vista `src/widgets/ArranqueGuiado.tsx`, prueba `scripts/verificar-arranque.mjs` (50) y `e2e/facilidades-f6.spec.ts`. El margen N-1 está en el motor y probado con una tabla sintética; el demo no tiene tabla de generación y la vista lo dice. Detalle: `docs/backend/12-energia-evento-de-planta.md` §12.12.

## Fase 7 · Panel de indicadores a medida (Núcleo)

**Hace:**
- **Un panel donde ger, prod y conf arman sus propias gráficas e indicadores** con cualquier señal ya conectada. Usa el kit SCADA existente (`docs/experiencia-v3/kit-scada.md`).
- **Catálogo inicial de indicadores con fórmula y fuente:**
  - diferido por causa;
  - MTBF y MTTR;
  - horas-hombre de preventivo y predictivo contra correctivo;
  - cortes de energía por mes;
  - margen N-1.

**Puerta propia:**
- Cada indicador del catálogo tiene su prueba contra un caso calculado a mano.
- Un indicador sin dato dice «sin dato».
- El panel se ve bien en los dos temas y en el teléfono.

> ✅ **CONSTRUIDA el 4-nov-2026.** Motor `src/entities/indicadores.ts`, pantalla `src/pages/Panel.tsx` («Mi panel», en Resultados de ger, prod y conf), prueba `scripts/verificar-indicadores.mjs` (36) y `e2e/facilidades-f7.spec.ts`. Detalle: `docs/backend/13-panel-de-indicadores.md`. El informe final: `docs/experiencia-v3/INFORME-FACILIDADES.md`.

---

## 6. Al terminar la fase 7

Un informe final con:
- la matriz pieza × rol ya construida, con pantallazos;
- los supuestos que siguen abiertos;
- las preguntas al experto que siguen sin respuesta.

Actualiza también el documento técnico (`docs/backend/`) y la presentación de venta. Para la presentación, la regla es la de siempre: se vende por producción y equipos, y cada cifra viene del producto.
