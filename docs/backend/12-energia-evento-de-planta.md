# 12. La energía: el evento de planta y su aviso

> Fases 4, 5 y 6 de facilidades (4-nov-2026). Motor: `src/entities/evento-planta.ts` y `src/entities/familias-planta.ts`. Costura: `src/shared/api/eventoPlanta.ts` y `src/shared/api/push.ts`. Simulador: `simulador-api/push.mjs`. Contrato: CONTRATO.md, «El evento de planta: el apagón». Prueba: `scripts/verificar-planta.mjs` (46 comprobaciones) y `e2e/facilidades-f4.spec.ts`. Investigación: `~/TRIM-petroleras/investigacion/19`.

## 12.1 Qué resuelve

Cuando se va la energía, también se va lo que avisa: el SCADA, las radios y el satélite, en cuanto se agotan las UPS. Las facilidades tienen poca gente y nadie se entera a tiempo (19 §3.3). TRIM no pone energía ni opera interruptores. **Ve el apagón en minutos y le dice a cada rol lo suyo**, aunque no tenga TRIM abierto.

## 12.2 La entrada: la foto del momento

El servidor arma, por campo, la foto que manda el gateway (`EstadoEnergia`):

| Campo | Qué es | De dónde sale |
|---|---|---|
| `cargas[]` | `{ equipo, familia: 'pozo' \| 'bomba-agua' \| 'aire' \| 'otro', circuito, paroEn }`: cada carga eléctrica y la hora de su marcha → paro (`null` si sigue en marcha) | El controlador de cada pozo, el PLC de las bombas, el compresor (Sparkplug, `04-cadena-de-datos.md`) |
| `rele?` | `{ tag, equipo, abrioEn, texto }`: el disparo reportado por el relé, con su hora | IEC 61850 o DNP3 (Fase 3) |
| `ultimoDato` | El último dato que llegó del sitio | La ingesta; el `NDEATH` de Sparkplug lo adelanta |

Los circuitos salen del alimentador de cada pozo (`Pozo.alimentador`) y de un CCM por familia: el de las bombas de agua y el de servicios. **La topología eléctrica firmada** (qué alimenta cada barra) sigue pendiente: con ella, «total o parcial» deja de depender de esa agrupación.

## 12.3 La detección

`eventoDePlanta(foto, config)` devuelve el evento o `null`.

| Vía | Regla | Constante |
|---|---|---|
| `rele` | El relé reportó el disparo: el inicio es su hora | — |
| `firma-cargas` | **3 cargas o más** paran dentro de **60 s**: no son fallas sueltas, es un evento | `MIN_CARGAS`, `VENTANA_FIRMA_MS` |
| `silencio-gateway` | **2 min** sin datos del sitio | `SILENCIO_MS` |

Dos cargas que paran juntas, o tres con cinco minutos entre una y otra, no son un apagón.

**Total o parcial** (19 §2.3). Si cayeron todos los circuitos, es `total`: también paran los pozos y el tanque de agua no sube, así que el problema es el re-arranque. Si cayó una parte, es `parcial`: el caso típico es el circuito de las bombas de agua con los pozos produciendo. Ahí el tanque se llena y hay que cerrar pozos, y es lo más peligroso de las primeras horas. Con silencio del gateway no se sabe qué cayó, y se trata como total: es lo que más cuesta no avisar.

## 12.4 Los relojes de consecuencia

**Aire de instrumentos.** Solo si pararon los compresores:

$$
\text{quedan} = \text{autonomía del recibidor} - (t - \text{inicio})
$$

La autonomía de La Ceiba es la de la ficha de K-101: **11 min**, con la presión de cabezal de hoy. La norma pide de 5 a 30 min (03 §2.9). En los demás campos es `[SUPUESTO]` (`AUTONOMIA_AIRE_MIN`). En producción se mide y se firma.

**Tanque de agua.** Solo si pararon las bombas de agua:

$$
\text{horas} = \frac{\text{capacidad} \times (\text{alto-alto} - \text{nivel})}{\text{agua de los pozos en marcha} / 24}
$$

Sin pozos en marcha, «no sube, los pozos también pararon». Con menos de una hora se dice en minutos. En el demo, La Ceiba está en 89,6 % con el alto-alto en 90 % (P-201B parada): un parcial da **1 min**.

**Barriles en juego.** El crudo asignado de los pozos que pararon (`crudoAsignado`, el factor del mes): el total de La Ceiba da **11.360 bbl/d**. Un parcial con solo las bombas paradas todavía no pierde crudo, y se dice.

## 12.5 Lo que lee cada rol (`avisoPlanta`)

| Rol | Ejemplo (apagón total de prueba, La Ceiba, 14:00) |
|---|---|
| Gerente | «Prueba · Se fue la energía en La Ceiba. 11.360 bbl/d en juego. Mantenimiento ya está avisado.» |
| Supervisor | «Prueba · Apagón 14:00. Aire: 11 min. Tanque de agua: no sube, los pozos también pararon. Paró: 18 pozos, 3 bombas de agua y el compresor de aire.» |
| Operador | «¿Ve luz en la subestación 2?» [Sí] [No]. Lo que responde lo ven el supervisor y el de energía |
| De energía | «Prueba · Disparo 52-SE2 14:00:00. Paró: …». Es el responsable de energía si el cliente lo tiene (rol `ener`, D3); si no, el jefe de mantenimiento |

A los demás roles no se les avisa. Con la pieza Energía apagada, nadie ve el aviso.

## 12.6 El aviso de prueba

`POST /api/planta/eventos/prueba` crea un apagón de prueba (total o parcial) para probar la cadena de punta a punta. Solo puede hacerlo el administrador (`conector:configurar`), desde Conectores.
- **Total:** abre el relé de llegada (52-SE2).
- **Parcial:** cae el circuito de las bombas de agua. Con 3 bombas o más lo detecta la firma; con menos, el relé del CCM.

Todo dice «Prueba» y **nunca entra al libro**. Hay una abierta por campo. `…/terminar` la cierra.

## 12.7 La notificación push (D2)

La activa cada persona en Perfil: «Aviso de apagón en este dispositivo».
- Es Web Push estándar (RFC 8030) con VAPID (RFC 8292) y **sin contenido**. El service worker (`public/sw.js`) pregunta `GET /api/push/aviso` y muestra lo del rol con que se activó.
- Si el servidor no contesta, avisa igual con un texto genérico: un apagón no se calla.
- En un iPhone llega si TRIM está en la pantalla de inicio (iOS 16.4 o más nuevo).
- **El servidor de producción necesita:** su par de llaves VAPID (la privada fuera del repositorio), guardar las suscripciones con el rol y los campos que salen del token, y llamar a `enviar` al detectar el evento. En el demo las suscripciones viven en memoria y el navegador las reenvía al abrir TRIM.
- **Seguridad (revisión del 4-nov):** mandar el aviso pide `conector:configurar` y en producción lo hace el servidor solo. Las suscripciones se aceptan únicamente de los servicios de push de Google, Mozilla, Microsoft y Apple (`esServicioDePush`), y el envío no sigue redirecciones: así el servidor no se puede usar para pedir a la red interna. Con sesión, el rol y los campos de cada suscripción salen del token, nunca del cuerpo.
- **Una salvedad del despliegue:** si la política de seguridad del sitio restringe `worker-src`, tiene que admitir `'self'`.

## 12.8 Atribución: lo que para por un corte no es falla propia

El diferido del corte **no sale de este módulo**. Lo carga el libro con la causa `energia` por la cascada del servicio caído (`causa-senal.ts`), con el tag del relé en la evidencia. `verificar-planta.mjs` §4 lo comprueba en los 6 cortes de SE-2 de Morichal:
- los 236 pozos de sus cascadas van con causa «energía», no con falla propia;
- la identidad del libro queda exacta en los 5 meses con cortes;
- «energía» suma en el libro por tipo.

## 12.9 Las familias de energía y aire (`familias-planta.ts`)

Generador, transformador, UPS y aire de instrumentos, cada uno con:
- sus partes (ítem mantenible de ISO 14224) y sus variables;
- su límite, con su fuente o `[SUPUESTO]`: 9 de las 15 variables lo dicen;
- su referencia de falla (IEEE 493).

El demo instrumenta la UPS de El Palmar (`UPS-SALA`: carga de la batería y «en batería», por SNMP). Generador y transformador no tienen instancia en el demo, así que el margen N-1 de la generación queda pendiente.

## 12.10 Supuestos y pendientes

1. `[SUPUESTO]` La autonomía del recibidor de aire fuera de La Ceiba.
2. `[SUPUESTO]` Los límites de las familias que no tienen fuente, y la alarma de la UPS en 50 %.
3. Pendiente: la topología eléctrica firmada.
4. El margen N-1 está construido (§12.12), pero necesita la tabla de generación y de cargas: el demo no la tiene.
5. ✅ El arranque guiado: Fase 6, §12.12.
6. El responsable de energía se enciende con `VITE_ROL_ENERGIA=1` en el demo. Con servidor, debe encenderse cuando el registro de usuarios lo trae; hoy el front lo decide al construir.

---

## 12.11 La pieza Planta: las demás familias y el vigía de planta (Fase 5, 4-nov-2026)

**Las familias** (`familias-planta.ts`), cada una con su tren, sus partes, sus variables, su límite con fuente o `[SUPUESTO]` y qué hacer cuando avisa:

| Familia | Tren | Lo que avisa | Equipo de demo (Morichal) |
|---|---|---|---|
| Bomba de transferencia o de despacho | crudo | Vibración hacia 3,9 mm/s (API 610) | P-401 |
| Tratador térmico o electrostático | crudo | Tensión de rejilla hacia 18 kV `[SUPUESTO]` | TE-501 |
| Torre de enfriamiento de agua | agua | Agua de salida hacia 40 °C, el límite para verterla (19 §2.2) | CT-601 |
| Separador o FWKO | crudo | Interfase hacia 70 % `[SUPUESTO]` | FWKO-101 |
| Bomba de diluyente | crudo | Caudal de nafta hacia 2.000 bbl/d `[SUPUESTO]` | P-701 |

Morichal diluye **en el oleoducto**, después del punto de medición. El fiscal es de crudo solo y el libro no cambia (Fase 2).

**El vigía de planta** (`vigia-planta.ts`) aplica la misma regla del vigía de las bombas:
- toma cada variable continua con serie y alarma (`limites.ts`);
- calcula su tendencia por mínimos cuadrados y las horas hasta la alarma, con su rango (± 2 errores estándar);
- avisa si ya la cruzó o si la cruza en **30 días o menos**.

Una pendiente que no supera dos errores estándar no avisa. Por eso las variables planas del demo (caudal de despacho, temperatura del tratador, vibración del ventilador) no dan fecha.

**Dónde se ve:**
1. En el riesgo (`en-riesgo`, con sus horas), es decir en «Avisan» de Equipos y en «Equipos que avisan».
2. En la ficha del equipo: «Lo que avisa el vigía».

Lo que costaría si para sigue la misma regla de «Si falla hoy» (`criticidad.ts`):

| Caso | Cifra |
|---|---|
| Con respaldo | 0 |
| Despacho o compresión | Sin dato (`sinCifra`) |
| Lo demás | El techo de lo que esté produciendo |

**Cifras del demo que cambiaron:**
- Equipos que avisan, todos los campos: de 8 a 13.
- Franja de todos los campos: 4 alarmas, 9 en atención, 6 avisos.
- En Morichal, «Avisan» queda en 10.

**Las listas por tren:** cada equipo del esquema de cada campo aparece una vez, en el tren de su familia, y las cuentas por tren suman las filas (`verificar-planta.mjs` §8).

---

## 12.12 El re-arranque guiado y el margen N-1 (Fase 6, 4-nov-2026)

> Motor: `src/entities/arranque.ts`. Costura: `src/shared/api/eventoPlanta.ts` (`useArranques`, `marcarFase`). Vista: `src/widgets/ArranqueGuiado.tsx`, en Hoy debajo del aviso. Contrato: CONTRATO.md, «El re-arranque guiado y el margen de generación». Prueba: `scripts/verificar-arranque.mjs` (50 comprobaciones) y `e2e/facilidades-f6.spec.ts`. Investigación: 19 §4.1 y §6.3 (R1, R2, A1, A2).

TRIM **sugiere y registra**. Quien arranca es el operador; el deslastre es del relé y del PMS.

**El orden de arranque** (`planDeArranque`), por fases:

| Fase | Qué | Límite que respeta | Fuente |
|---|---|---|---|
| Lo que habilita | Control y comunicaciones (la UPS, donde la hay), aire de instrumentos, diluyente y tratador | Si el crudo no fluye, arrancar pozos no sirve | 19 §6.3, R1; Castilla sin diluir ≈ 8.000 cSt a 30 °C |
| Agua | Cada bomba de agua y la torre de enfriamiento | Antes que los pozos, o el tanque se llena. Un motor a la vez, 2 min entre uno y otro | 19 §2.3; los 2 min son `[SUPUESTO]` |
| Pozos | Por lotes, primero los que más crudo dan (con tabla: más crudo por kW) | Un arranque por motor (venía en marcha, está caliente); la electrosumergible espera el giro inverso; lotes de 4 y 5 min entre lotes, o lo que quepa en el escalón de la generación | NEMA MG 1 §12.54; Baker Hughes; 30 min de giro inverso, 4 pozos y 5 min son `[SUPUESTO]`; el escalón, ISO 8528-5 |
| Despacho | La bomba de despacho | Cuando ya hay crudo que mandar | — |

Los minutos cuentan desde que vuelve la energía: si el supervisor ya la marcó, son horas del reloj. La espera del giro inverso cuenta desde que **paró** cada pozo, así que si la energía tarda más de 30 min ya no frena nada.

**El revisor** (`incumplimientos`) dice en palabras cada límite que un orden viola: un motor que arranca dos veces, una fase fuera de orden, una electrosumergible con giro inverso, un lote de más o que pasa el escalón, dos motores de servicio juntos, lotes pegados, un pozo de más crudo detrás de uno de menos. La prueba comprueba que los 10 apagones de prueba del demo (5 campos, total y parcial) no violan ninguno, y que el revisor caza cada violación hecha a propósito.

**El cronómetro por fases** (R2): detección → causa identificada → energía restablecida → primer pozo arriba → 90 % de la producción → producción normal. La detección es la hora del evento; las demás las marca el supervisor con un botón, en orden y una vez (`POST /api/planta/eventos/:id/fase`, solo por inserción). Cada marca queda con su hora y quién, y cada fase con lo que duró desde la anterior. Un parcial de las bombas de agua no para pozos: sus fases son causa, energía y normal. **Esto es lo que vuelve «puede tardar una semana» un dato propio de la operadora.** En el demo el reloj está congelado: el cronómetro corre con el de la máquina desde que se abrió TRIM.

**El margen N-1** (`margenN1`, A1 y A2): si se cae la unidad de generación más cargada, ¿alcanza la **reserva rápida** de las demás (lo libre de cada una, sin pasar su escalón)? También se compara con la capacidad en régimen, y vale lo que más falte. Si falta, qué soltar primero: los pozos que menos crudo dan por kW, enteros (los suelta un interruptor). Es la misma mochila del orden de cierre (`mochila`, `libro.ts`). Lo que no es pozo se trata como esencial salvo que la tabla diga lo contrario. Ejemplo calculado a mano en la prueba: tres unidades de 1.000, 800 y 600 kW con 700, 500 y 300 kW de carga; cae la de 700; la reserva rápida es 200 + 180 = 380 kW; faltan 320 kW.

**Lo que falta para el margen en un campo real:** la tabla de generación (`TablaGeneracion`): por unidad, capacidad, carga y escalón (de su clase ISO 8528-5 o del fabricante); por carga, sus kW y si es esencial. La arma el ingeniero eléctrico o sale del PMS. Sin ella, la vista lo dice. Con ella, el orden de los pozos pasa a ser por crudo por kW y el lote lo fija el escalón, no el número.

**Supuestos de la fase:** la espera del giro inverso (30 min; el variador de cada pozo la lee), el lote sin tabla (4 pozos), los 5 min entre lotes y los 2 min entre arranques de servicio. Son las preguntas 9 y 10 al experto (19 §8.3).

