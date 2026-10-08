# 3 · Árbol de atribución de una parada de bomba; identificación y no conformidad

En una parada de bomba el **equipo siempre se sabe** (es la bomba): lo que se busca es **la parte** que falló, o si la paró otra cosa (el programa, un servicio). La función es `causaDeParada(ev, ctx)` (`causa-senal.ts:184`) → `deducirParada` (`causa-senal.ts:186-226`).

Sea `perfil = perfilBomba(ev.equipo, ev.campoId)`, `tipo = 'transporte'` si la bomba es multifásica y `'reinyeccion'` en cualquier otro caso (también recobro), y `base = ['<ev.senal> · <hora del paro>']`.

## 3.1 Las siete reglas, en orden

| # | Regla | Condición exacta | Resultado (`tipo` · `equipo` · `parte` · `como`) | `texto` |
|---|---|---|---|---|
| 1 | **Programa** | hay entrada con `equipo = bomba` y $\text{desde} \le t \le \text{hasta}$ | `programada` · bomba · — · `programa` | el `motivo` del programa |
| 2 | **Primera alarma** | `ev.primeraAlarma` existe **y** su tag está en `perfil.primerasAlarmas` **y** la parte es del catálogo de partes de ese subtipo (`parteDeAlarma`, `causa-senal.ts:143-147`) | `tipo` · bomba · la parte · `senal` | «Primera alarma: <texto>» |
| 3 | **Firma de caudal** | `ev.perdida < 1` y la bomba tiene perfil (perdió caudal **sin disparar**) | `tipo` · bomba · `tornillos` (multifásica) o `hidraulica` (inyección) · `firma` | «Desgaste de los tornillos: bajó el caudal con la bomba en marcha» / «Desgaste interno: bajó el caudal con la bomba en marcha» |
| 4 | **Servicio caído** | algún servicio del campo con $\lvert t_{\text{servicio}} - t_{\text{bomba}} \rvert \le 15\ \text{min}$ (`servicioAlParar`, `causa-senal.ts:106-107`) | tipo del servicio · **el servicio** · — · `senal`; `evento` = id del servicio | «Paró porque <texto del servicio>» |
| 5 | **Firma de las señales al parar** | `ev.firma` (guardada por el backend) o, si la parada está **abierta** y no la trae, la primera parte de `saludDePartes(perfil)` en estado `fuera` | `tipo` · bomba · `firma.parte` · `firma` | «<Nombre de la parte>: estaba fuera de límite al parar» |
| 6 | **Respuesta del operario** | `ctx.respuestas[ev.id]` | `tipo` · bomba · `r.parte` · `declarado` | `r.texto` |
| 7 | **Sin identificar** | nada de lo anterior | `tipo` · bomba · — · `ninguno`, con `porQueNo` | «Paró sin primera alarma: hay que identificar qué se dañó» o «Paró con una alarma que no señala una parte: hay que identificar qué se dañó» |

**Evidencia** en cada caso:
- 1: `['Programa <id>: <motivo>', base]`.
- 2: `['Primera alarma <tag> · <texto>', base]`.
- 3: `['Perdió el <round(perdida·100)> % del caudal sin disparar: la velocidad subió a caudal constante' | '…: el caudal bajó con la bomba en marcha', base]`.
- 4: `['<tag del servicio> · <texto>', base]`.
- 5: `[firma.texto, base, (+ 'Primera alarma <tag> · <texto>: no es un disparo de una parte de esta máquina' si había alarma ajena)]`.
- 6: `[base, (+ alarma ajena), 'Declarado por <por> · <hora>']`.
- 7: `[base, (+ alarma ajena), porQueNo]` con `porQueNo` = «Sin primera alarma y sin firma: el PLC no dice qué parte falló», o «Sin firma: el PLC no dice qué parte falló» si hubo una alarma que no identifica.

> **Orden importante.** La primera alarma propia va **antes** que el servicio: una bomba que disparó por `LSH-2013` a ±15 min de una caída de energía se carga a la bomba (sello). La firma de caudal también va antes que el servicio. Una primera alarma que no es de la máquina (p. ej. `52-SE2`) no identifica parte y se sigue buscando: por eso esas paradas terminan en la regla 4.

### Ejemplos con los datos del demo (las 36 paradas, corridas una por una)

| Parada | Bomba | Lo que trae | Regla que aplica → causa |
|---|---|---|---|
| `EV-2011-0909` · 9-sep 21:14 → 11-sep 07:59 | Ceiba P-201B | primera alarma `LSH-2013` | 2 → reinyección · sello · señal · «Primera alarma: fuga de sello detectada» |
| `EV-2011-0922` · 22-sep 10:05 | Ceiba P-201B | `TSH-2011` | 2 → rodamientos («temperatura alta en la cámara de empuje») |
| `EV-2011-260819` · 19-ago 18:19 | Ceiba P-201B | dentro de `PR-2011-260819` | 1 → programada · programa |
| `EV-2011-260128` · 28-ene 16:20 | Ceiba P-201B | primera alarma `PAL-1011` (no es de P-201B) | 2 no aplica; 4: K-101 cayó a las 16:18 (2 min antes) → **aire · K-101** · «Paró porque presión baja del aire de instrumentos» |
| `EV-3016-260310` · 10-mar 19:11 | Morichal MPP-301 | `perdida: 0.36`, sin alarma | 3 → transporte · tornillos · firma · evidencia «Perdió el 36 % del caudal sin disparar: la velocidad subió a caudal constante» |
| `EV-G2011-260502` · 2-may 18:50 | Guacamayo P-201B | `perdida: 0.43` | 3 → reinyección · hidraulica (desgaste interno) · firma |
| `EV-M2011-260828` · 28-ago 18:10 | Morichal P-201B | primera alarma `52-SE2` | 4: SE-2 cayó a las 18:08 → **energía · SE-2** |
| `EV-M2011-260924` · 24-sep 16:51 → 28-sep 06:53 | Morichal P-201B | nada | 7 → sin identificar (`ninguno`), y **arrancó sin respuesta** → no conformidad |
| `EV-2011-1002` · 2-oct 03:52 → abierta | Ceiba P-201B | nada (ni firma: la bomba detenida deja todas sus partes en `detenida`) | 7 → sin identificar; **pide respuesta y no se puede arrancar** |

Resumen: 27 paradas con primera alarma (24 propias → parte; 3 ajenas → servicio), 3 por firma de caudal, 4 por programa, 2 sin identificar. Ninguna llega por la regla 5 (el demo no manda `firma`) ni por la 6 (`ctx.respuestas` vacío al arrancar).

**Casos borde.**
- **Bomba sin perfil en el campo**: `perfil` es `undefined` → reglas 2, 3 y 5 no aplican (sin catálogo no hay parte), `tipo = 'reinyeccion'`.
- **Firma calculada en el front**: es memoria de proceso (`FIRMAS`, `causa-senal.ts:155`), no persiste. **El backend real debe guardar `firma` con el evento al registrar la parada** (CONTRATO.md:877-878); si no, una parada que se cierra antes de que alguien la mire se queda sin firma para siempre.
- La regla 4 usa solo la hora de **inicio** del servicio (no su cascada) y el primer servicio de la lista que cumpla.

## 3.2 ¿Pide respuesta? ¿Arrancó sin identificar? (`estadoIdentificacion`)

**Qué es.** La regla de operación: *una parada que ninguna señal explica no se arranca hasta que quien la revise registre qué se dañó*. TRIM es de solo lectura (no bloquea el PLC); si arranca antes, queda una **no conformidad** con la hora del PLC.

**Fórmula** (`causa-senal.ts:304-311`):

$$
\text{sinIdentificar} = (\text{tipo} = \text{pendiente}) \lor \big(\text{tipo} \in \{\text{reinyeccion}, \text{transporte}\} \land \lnot \text{parte} \land \text{como} \ne \text{declarado}\big)
$$

$$
\text{respondidaTarde} = \text{declarado} \land \text{fin} \ne \text{null} \land t_{\text{respuesta}} > t_{\text{fin}}
$$

$$
\text{pide} = \text{sinIdentificar} \qquad \text{arrancoSinIdentificar} = (\text{sinIdentificar} \land \text{fin} \ne \text{null}) \lor \text{respondidaTarde}
$$

| Símbolo | Significado | De dónde sale |
|---|---|---|
| tipo, parte, como, declarado | de la causa | árbol de los caps. 2 y 3 |
| fin | `fin` del evento de pozo o de la parada de bomba | PLC |
| $t_{\text{respuesta}}$ | `Respuesta.hora` | escritura (pantalla o WhatsApp), hora del servidor |

**Qué es una «pregunta»** (`preguntasDe`, `libro.ts:822-843`). Sobre un rango:
- **De pozo**: cada tramo cuya causa es `pendiente` o es declarada **sobre el propio evento** (`esDeclarado`: `tipo = 'declarada'`, o `como = 'declarado'` con `causa.evento === evento.id`). `sobre: 'pozo'`, `equipo` = el pozo.
- **De bomba**: cada parada de bomba que se solapa con el rango, con causa de tipo reinyección o transporte y **sin parte** o con la parte **declarada**. `sobre: 'bomba'`, `bbl` = suma de los tramos del rango cargados a esa parada.
- Orden: primero las que `pide`, luego de la más reciente a la más vieja.
- `GET /api/vistas/paradas/por-identificar` las pide sobre **toda la historia** (desde el primer mes del calendario hasta AHORA): una pregunta sin responder no prescribe al cambiar de período (`shared/api/diferidos.ts:113`).

**Ejemplo con los datos del demo** (portafolio, toda la historia):

| Pregunta | Sobre | Inicio → fin | `pide` | `arrancoSinIdentificar` | Lectura |
|---|---|---|---|---|---|
| Ceiba P-201B `EV-2011-1002` | bomba | 2-oct 03:52 → abierta | sí | no | **no arrancar** |
| Ceiba LC-21 `EP-LC21-261001-01` | pozo | 1-oct 18:20 → abierto | sí | no | **no arrancar** |
| Ceiba LC-08 `EP-LC08-261001-02` | pozo | 1-oct 22:15 → 2-oct 01:10 | sí | **sí** | arrancó sin identificar |
| Morichal P-201B `EV-M2011-260924` | bomba | 24-sep 16:51 → 28-sep 06:53 | sí | **sí** | arrancó sin identificar |
| Palmar PA-04 `EP-PA04-260621-05` | pozo | 21-jun 13:00 → 22-jun 08:00 | no | **sí** | declarada a las 09:30 del 22-jun, **después** de arrancar (respuesta tardía) |
| 8 declaradas más (MN-22, ZA-06, ZA-04, LC-06, ZA-01 ×2, ZA-03 ×2) | pozo | — | no | no | declarada antes de arrancar |

**Qué texto se muestra según el valor.**

| Pantalla | Regla | Texto / marca |
|---|---|---|
| Turno, «POR IDENTIFICAR» | lista = `pide` (incluye las no conformes) | `!fin` → ▲ P2 + chip fuerte «no arrancar»; `fin` → ■ P3 + chip «arrancó sin identificar» (`Turno.tsx:117-125`) |
| Causa, cabecera (no se muestra al nivel `operacion`) | «por identificar · histórico» = `pide && !arrancoSinIdentificar`; apoyo «N pozos · M bombas · K sin arrancar»; «no conformidades» = `arrancoSinIdentificar` con ■ P3 si > 0 (`Causa.tsx:84-124`) | demo: **2** por identificar (1 pozo · 1 bomba · 2 sin arrancar) con ▲; **3** no conformidades |
| Placa de bomba (ingeniería/operación) | `abierta.pide` | ▲ «**No arrancar** hasta identificar» + ⓘ «<texto>. Sin identificar qué se dañó: no arrancar hasta que quien la revise lo registre.» (`Placa.tsx:140-147`) |
| Placa directiva | `abierta.pide` | «Esperando que se identifique el daño» |
| Detalle de bomba | `abierta.pide` | banda ▲ «No arrancar hasta identificar el daño» + ⓘ con el procedimiento (`Detalle.tsx:123-130`) |
| Detalle de bomba, lista de paradas | por fila | ■ «arrancó sin identificar» si `arrancoSinIdentificar`; ▲ «por identificar» si `pide` y no arrancó (`Detalle.tsx:420-421`) |
| Ficha ejecutiva | pregunta abierta de ese equipo (`pide && !fin`) | «Espera que se identifique el daño · hace <fmtHoras(AHORA − inicio, precisa)>» + chip fuerte «no arrancar». Demo, Ceiba P-201B: «hace 10,1 h» |

**Cifras de identificación del período (cabecera de Causa).** Salen del libro (`libro.ts:708-709`, `:797`):

$$
\text{pendiente} = \sum_{\text{tramos con tipo = pendiente}} \text{bbl} \qquad \text{declarado} = \sum_{\text{tramos esDeclarado}} \text{bbl} \qquad \text{identificado} = \text{diferido} - \text{pendiente} - \text{declarado}
$$

Ojo: los pozos que cerró una bomba **sin parte identificada** (`reinyeccion`, `como: 'ninguno'`) cuentan como **identificados** (el equipo está probado por señal; lo que falta es la parte, y eso lo pregunta la pregunta de bomba). Demo, portafolio, «Octubre, en curso» (1-oct 00:00 → 2-oct 14:00): diferido 6.232 bbl; por señal 5.790 bbl (**92,9 %**); declarado 86 bbl (1,4 %); sin identificar 355 bbl (5,7 %). Septiembre cerrado: 105.227 bbl; por señal 104.818 bbl; declarado 409 bbl; sin identificar 0.

**Quién lo calcula y por dónde viaja.** Servidor. `Pregunta[]` en `GET /api/vistas/paradas/por-identificar` y en `Libro.preguntas`; `ParadaMedida.pide` / `.arrancoSinIdentificar` en `GET /api/vistas/bombas/paradas` y en `BombaVista.abierta`.

**Referencia.** `causa-senal.ts:304`, `libro.ts:822`, `CONTRATO.md:1018-1019`; casos `referencia/diferidos/*.json` (campo `preguntas`).

## 3.3 Falla o disparo (electrosumergible)

**Qué es.** Una ESP que dispara y vuelve a arrancar en menos de 24 h no falló: **disparó** (protección del variador, se repone desde superficie). La falla de una ESP es la que obliga a sacarla del pozo con taladro, y eso tarda días. Contarlas juntas hundiría su MTBF.

**Fórmula** (`esDisparo`, `libro.ts:423-428`):

$$
\text{disparo} = (\text{tipo} = \text{electrosumergible}) \land \text{fin} \ne \text{null} \land \frac{t_{\text{fin}} - t_{\text{inicio}}}{1\ \text{h}} < 24
$$

`DISPARO_MAX_H = 24` (estricto: 24,0 h exactas es falla). Un evento **abierto** nunca es disparo (todavía no se sabe). En las bombas de superficie no aplica: toda parada propia es falla.

**Ejemplo con los datos del demo.** MN-07 (Morichal): 7 eventos de su ESP en la historia, todos de 0,3 a 3,8 h (p. ej. `EP-MN07-260809-33`, `UL`, 9-ago 11:14 → 14:02, 2,8 h, 69 bbl) → **0 fallas, 7 disparos**, 314 bbl. LC-05 (La Ceiba): `GF` 24-oct-2025 08:55 → 5-nov 16:53 = 296 h → **1 falla** (más 8 disparos). MN-41: `GF` desde el 3-sep 06:40, abierto (703 h a AHORA) → 1 falla abierta.

**Qué texto se muestra.** Ficha ejecutiva, «Cada cuánto falla»: con fallas, «N falla(s) · una cada N días»; sin fallas pero con disparos, «No ha fallado · N disparos que volvieron a arrancar»; sin nada, «No ha fallado» (`FichaEjecutiva.tsx:84-88`). MN-07 → «No ha fallado · 7 disparos que volvieron a arrancar».

**Referencia.** `libro.ts:420-428`, `libro.ts:1196-1201`; CONTRATO.md:1094-1095.
