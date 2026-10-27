# WhatsApp: qué hay, qué valor daba y con qué se reemplaza dentro de TRIM

> Fase B del prompt (§6). Borrador de M3, 27-oct-2026, sobre `HEAD` = `9378717`.
> **No se ha borrado nada todavía.** La lista de lo que se borra la aprueba el dueño (puerta de §10).
> El contrato con el backend se trata aparte en [`docs/backend/CAMBIOS-CONTRATO.md`](../backend/CAMBIOS-CONTRATO.md), §3.

## 0. En una página

- **Hoy hay 19 funciones** relacionadas con WhatsApp: 9 reglas de envío, el diálogo del chat y 9 piezas de pantalla, registro, configuración y texto. Están en **38 archivos** de `src`, `e2e` y `scripts`, con **266** apariciones de «whatsapp» (26 archivos en `src`, 8 en `e2e` y 4 en `scripts`).
- **Las funciones 1 a 9 llevaban algo de valor:** avisar que algo paró, preguntar qué se dañó, insistir, escalar, anticipar una falla, avisar una orden y dejar decir «algo está mal».
  - **Todas tienen ya su equivalente en pantalla**, en Hoy, Identificar o Turno.
  - Lo que se pierde es **el empujón**: el mensaje llega aunque la persona no tenga TRIM abierto. El reemplazo funciona solo si la persona abre TRIM. Es la única pérdida real, y el dueño tiene que aceptarla de forma explícita (§4).
- **Las funciones 10 a 19 no dan valor sin el canal:** el teléfono simulado, el hilo de cada parada, el «no enviado», el panel del turno, la integración, el teléfono y las alertas de cada persona, el registro de mensajes y los textos que nombran WhatsApp. **Se borran.**
- **`simulador-api/` no tiene nada de WhatsApp.**
- **El SQL de la versión 1 (`simulador-api/esquema.sql`) tampoco.** WhatsApp está en el SQL nuevo (`docs/backend/sql/`) y en `CONTRATO.md`; ahí se **retira** (no se borra), según §3.1.
- **Nadie lo pidió en la reunión de expertos:** el transcript del 19-oct no menciona WhatsApp. Es una función del diseño del producto, el «carril caliente» de `docs/backend/05d-entradas-salidas/05-whatsapp.md`.

## 1. Las reglas de envío que existen hoy

Todas están en `src/entities/mensajes.ts`, función `mensajesDe` (líneas 239 a 358).

**Quién recibe:** solo la persona que cumple `recibeAlertas` (`usuarios.ts:131`):
- está activa;
- tiene las alertas encendidas y un teléfono;
- su rol está en `ROLES_CON_ALERTAS` = sup, oper, tec, conf y jefe;
- tiene el campo asignado.

| # | Regla (plantilla de Meta) | A quién | Cuándo | Qué le lleva y qué decisión habilita |
|---|---|---|---|---|
| 1 | **parada** de bomba (`trim_equipo_parado`) | sup y oper del campo | 1 min después de que para un equipo de alto impacto | Equipo, hora y la consecuencia según el respaldo firmado («si no arranca a tiempo, hay que cerrar los pozos…»). Decisión: arrancar o prepararse para cerrar pozos. |
| 2 | **parada** de electrosumergible (`trim_electrosumergible_parada`) | sup y oper | Ídem | «El pozo deja de producir unos N bbl/d» según la última prueba |
| 3 | **cierre** (`trim_pozos_cerrandose`) | sup y oper | Cuando se cierra el primer pozo de la cascada de una bomba | «Por {equipo} parado se empezaron a cerrar pozos» |
| 4 | **causa**, la pregunta (`trim_que_se_dano`) | El oper del campo con alertas; si no hay, el sup | 1 min después de una parada que ninguna señal explica | «¿Qué encontró? Responda con un número», con las opciones de `causasSugeridas`. Decisión: declarar la causa, que levanta el «no arrancar» y entra al libro como declarada. |
| 5 | **recordatorio** (`trim_recordatorio_causa`) y **recordatorio-arrancó** (`trim_recordatorio_arranco`) | Los mismos de la pregunta | A los 30 min sin respuesta (la segunda, si el equipo ya arrancó) | La misma pregunta, con la urgencia del arranque |
| 6 | **escalamiento** (`trim_escalado_causa`) | sup del campo | A las 2 h sin respuesta, solo si la pregunta fue a operadores | «Paró hace 2 h y nadie ha dicho qué se dañó» |
| 7 | **parte**, el vigía anticipa (`trim_vigia_anticipa`, y `…_sin_tag` cuando la predicción no trae tag) | conf y jefe | Cuando el vigía emite la predicción | Parte, ventana, tag y acción. Decisión: intervenir antes de la falla. |
| 8 | **orden** liberada (`trim_orden_liberada`) | El técnico asignado | Cuando SAP libera la orden | Número, clase, prioridad, equipo y descripción. Decisión: atender la orden. |
| 9 | **El diálogo del chat**, con mensajes libres dentro de la ventana de 24 h (`Telefono.tsx`) | oper (y quien abra el chat) | Después de la pregunta | Un ida y vuelta en el mismo chat:<br>• «¿Qué vio en {parte}?», «¿Qué parte?» y «0 Otra cosa: escríbala»;<br>• el cierre «Así queda lo que usted contestó… 1) Está bien · 2) Algo está mal»;<br>• «2» deja la parada para revisar (`revisarDesdeWhatsapp`). |

Cuando un parámetro queda vacío o con varias líneas, el mensaje sale como `noEnviado`, con su motivo (`mensajes.ts:253`).

## 2. Inventario por función: valor y reemplazo

**Roles por pantalla** (`roles.ts:55-125`):
- Identificar: prod, sup, oper, jefe, conf y tec;
- Turno: sup y oper;
- Hoy: prod, sup, oper, jefe, conf, plan y tec;
- Conectores: adm;
- Accesos: ger edita y adm solo lee;
- Perfil: todos.

### 2.1 Con valor: se reemplaza DENTRO de TRIM (casi todo ya existe)

| # | Función | Rol | Valor que daba | Reemplazo dentro de TRIM (sin canal externo) | ¿Existe hoy? |
|---|---|---|---|---|---|
| 1 | Aviso de parada de bomba | sup, oper | Saber en minutos que paró un equipo que cierra pozos, y su respaldo | Dos cosas en pantalla:<br>• la franja «No arrancar X…» y la tarjeta de la parada en **Hoy**, con su insignia;<br>• en Turno, «Parado ahora». | Sí: `hoy.ts:393-404`, `Turno.tsx:258` |
| 2 | Aviso de parada de electrosumergible | sup, oper | Ídem, con los bbl/d del pozo | La misma tarjeta en Hoy, con la cifra del pozo | Sí |
| 3 | Aviso de pozos cerrándose | sup, oper | Saber que el colchón se acabó | La tarjeta «confirmar» del supervisor («P-201B cerró LC-07 y LC-16») y, en Turno, «Paradas nuevas» | Sí: `Turno.tsx:287` |
| 4 | La pregunta «¿qué se dañó?» | oper (o sup) | **El dato que más vale:** convierte una parada «sin identificar» en parte y modo de falla | **La pregunta de Hoy**, una por pantalla en el teléfono, y «Contestar» en Identificar, con las mismas opciones sugeridas | Sí: `widgets/hoy/Pregunta.tsx:43`, `widgets/hoy/Operador.tsx:33`, `Causa.tsx:277` |
| 5 | Recordatorio a los 30 min | oper | Insistir antes del arranque | La pregunta sigue arriba en Hoy y la franja «No arrancar» no se va hasta que se contesta. **Propuesta, para que el dueño decida:** que la tarjeta diga cuánto lleva sin respuesta. El dato existe (`inicio` de la parada); el texto sería nuevo del motor. | En parte |
| 6 | Escalamiento a las 2 h | sup | Que alguien responda lo que el operador no contestó | Dos cosas en Hoy:<br>• la tarjeta **«Conseguir la causa de N paradas»** con «Responder yo», para sup, jefe y conf;<br>• la insignia de Hoy.<br>Es el reemplazo que pide §6: «un aviso con insignia en el Hoy del supervisor». El sufijo «; se escaló a las HH:MM» desaparece. | Sí: `hoy.ts:535`, `shared/api/hoy.ts:121`, `Riel.tsx:148` |
| 7 | El vigía anticipa una falla | conf, jefe | Intervenir antes de la falla | «Intervenir X: ya pasó el límite» (Hoy de jefe y conf), «Por vigilar» (Hoy del técnico) y el panel «Por vigilar» de Turno | Sí: `hoy.ts:694`, `hoy.ts:792`, `Turno.tsx:279` |
| 8 | Orden liberada | tec | Saber qué orden atender | La tarjeta «Atender la orden de X» en el Hoy del técnico, y «Seguir la orden» para sup, jefe y conf. Sin WhatsApp solo pierde el sufijo «le llegó por WhatsApp». | Sí: `hoy.ts:690-715` |
| 9 | «2 Algo está mal» en el chat | oper | Corregir lo que se contestó | El botón «Algo está mal» de la pantalla. Es **la misma escritura**: `revisarParadaAnh`, `POST /api/anh/paradas/:id/revision`. | Sí: `escrituras.ts:1101` |

**La entrega de turno** se queda como resumen en pantalla y en PDF, sin chat. Ya existe en `widgets/hoy/Entrega.tsx:26`, con:
- lo que paró;
- lo que queda por hacer;
- lo hecho hoy;
- el diferido;
- «Compartir en PDF».

Solo se quita el bloque «El turno en WhatsApp» (`Entrega.tsx:38`).

### 2.2 Sin valor fuera del canal: se BORRA del front

| # | Función | Dónde | Rol | Por qué no agrega valor sin WhatsApp |
|---|---|---|---|---|
| 10 | **Teléfono simulado** con el hilo y las respuestas rápidas | `src/widgets/whatsapp/Telefono.tsx` | quien ve Identificar | Es una imitación del chat para el demo. Además, en el demo deja responder **en nombre de otra persona**: «Ver el chat de X» permite responder como X. |
| 11 | **Hilo de WhatsApp** de cada parada | `Causa.tsx:495-554` (`HiloWhatsapp`), `RespondidaConChat` (:257) y partes de `Declarada` (:627-669) | Identificar | Repite en otro formato lo que ya dice la parada. La trazabilidad de quién dijo qué (D1) está en la respuesta y en la clasificación, no en el chat. |
| 12 | **«Mensaje no enviado»** | `src/widgets/whatsapp/NoEnviado.tsx` | Turno, Identificar | Solo existe porque hay plantillas de Meta |
| 13 | Panel **«WhatsApp del turno»** y tarjeta lateral **«El turno en WhatsApp»** | `Turno.tsx:293-305`, `widgets/hoy/Lateral.tsx:45-61` (`TurnoWhatsapp`) y `Hoy.tsx:94` | sup, oper | Es un registro de envíos. Lo que importa del turno (qué paró y qué falta) ya está en Hoy y en la entrega. |
| 14 | **Integración WhatsApp Business** en Conectores: número, plantillas, enviados y webhook | `widgets/conectores/Integraciones.tsx:87-101` | adm | Configuración de un canal que se va. La sección SAP se queda (:64-85). |
| 15 | **Teléfono y alertas de cada persona** | `widgets/configuracion/Accesos.tsx:182-191`, `pages/Perfil.tsx:88-125`, `entities/usuarios.ts` (`telefono`, `alertas`, `ROLES_CON_ALERTAS`, `ALERTAS_DEL_ROL`, `recibeAlertas`, `e164`, `normalizarTelefono`, `telefonoLegible`, reglas :240-249) y `shared/config/region.ts:22-38` (`celular`) | ger edita, adm lee, todos ven el suyo | Sin canal no hay a dónde mandar. El teléfono además es un dato personal que deja de hacer falta. |
| 16 | **Registro de mensajes** | `entities/mensajes.ts` (`mensajesDe`, `PLANTILLAS`, `textoDe`, `ErrorDePlantilla`, `destinatarios`, `PASO_CORTO`, `ORDEN_PASO`, `OTRA`, `OTRA_PARTE`, `NO_FUE_ESP`, `NOMBRE_REGLA` [ya sin uso]), `shared/api/mensajes.ts` (entero), `entities/hoy.ts` (`WhatsappHoy`, `whatsappDelTurno`, `escalada`, `porWhatsapp` y `EntradaHoy.mensajes`) y `shared/api/hoy.ts:73-75` | — | Es el registro de lo enviado |
| 17 | **Las escrituras del canal** | `escrituras.ts`: `recibirWhatsapp` (:437-470), `revisarDesdeWhatsapp` (:1138-1162), `WHATSAPP_SOLO_WEBHOOK`, `MOTIVO_WHATSAPP` y la normalización del teléfono (:210, :240); `app/store.ts:92-99, 252-253` | — | El equivalente de pantalla (`responderParada` y `revisarParadaAnh`) se queda |
| 18 | **Textos que nombran WhatsApp en pantallas que se quedan** | `hoy.ts:524, 529, 542` («Ver el chat» → «Ver la parada»); `hoy.ts:453` y `widgets/hoy/acciones.ts:31-42` («próxima ronda de WhatsApp» → «la pregunta sigue en Hoy»); `Cabecera.tsx:112-128`; `Onboarding.tsx:23`; `Lateral.tsx:69`; `entities/escenarios.ts:37` (`PALANCA_PRODUCTO`, que ninguna pantalla muestra) y `:207` (acción del plan «Identificar el daño») | varios | Son textos. Se reescriben sin la palabra y sin la promesa. |
| 19 | **Las preguntas de campo de la ANH por WhatsApp (B-33)** | Pendiente, nunca construido: `CONTRATO.md` («Pendiente del lado del servidor») y `docs/backend/10-pendientes.md` S29 | — | Muere con el canal. Las preguntas del árbol ya se contestan en pantalla. |

**Lo que NO se borra, aunque viva en `mensajes.ts`:**
- `causasSugeridas` (con `lecturas = true` alimenta las pistas de Identificar, `diferidos.ts:161`);
- `CAUSAS_POZO`, que es el catálogo de la pantalla y del árbol ANH;
- `NO_FUE_ESP_CORTO`;
- el tipo `Opcion` (lo usa `/vistas/paradas/:evento/opciones`).

Hay que **mudarlos** a un módulo que no se llame «mensajes» (por ejemplo, `entities/causas-sugeridas.ts`) antes de borrar lo demás.

**`Respuesta.canal`** (`pozos.ts:73`): deja de tener sentido. Se quita el valor `'whatsapp'` del front; en el contrato queda RETIRADO (ver CAMBIOS-CONTRATO §3).

**Código que queda sin uso al borrar:**
- `filasDeRaiz` (`shared/api/arbol.ts:211`, solo la usa `revisarDesdeWhatsapp`);
- el import de `region` en `escrituras.ts`;
- `NOMBRE_REGLA` (ya hoy sin uso).

## 3. Las pruebas que se van o se podan

Lo que es **solo de WhatsApp** se borra. Lo **mixto** se poda: se quita el paso de WhatsApp y se queda lo demás.

| Prueba | Archivo | Qué hacer |
|---|---|---|
| «WhatsApp: el operador avala solo lo que contestó, en el mismo chat…» | `e2e/arbol-identificar.spec.ts:186` | Borrar. Lo del árbol del supervisor ya lo cubren las demás pruebas del archivo; confirmarlo. |
| «carril caliente, SAP, aciertos y perfiles» | `e2e/carril.spec.ts:4` | Podar. Se quitan:<br>• el hilo y el chat (:28-69);<br>• Turno «registro por hilo» (:109);<br>• el aviso del técnico (:120);<br>• WhatsApp en Conectores (:168);<br>• Accesos «registro de lo enviado» (:258).<br>Se quedan las pistas (:12-26), SAP, aciertos y perfiles. |
| «Hoy · supervisor: las tarjetas en su orden…» | `e2e/hoy.spec.ts:15` | Podar: «se escaló a las 20:20» (:32) y `[data-whatsapp]` (:41) |
| «el último toque del chat de WhatsApp deja el foco…» | `e2e/interfaz.spec.ts:125` | Borrar |
| «en el papel salen los ⓘ, los globos…» | `e2e/interfaz.spec.ts:166` | Podar: :195, :207-208 y :222 |
| «H3, H16 y P-trabajo-1 · Turno…» | `e2e/arreglos-f1.spec.ts:373` | Podar :377 |
| «el demo construido carga cada pantalla» | `e2e/demo-construido.spec.ts:7` | Cambiar el texto esperado (:13) |
| «Hoy · supervisor en el teléfono…» | `e2e/inicios-k2.spec.ts:24` | Podar :33 y :40 |
| Rutas del auditor | `e2e/auditoria/rutas.ts:110, 176, 186, 192` | Quitar las expectativas de WhatsApp. La de :110 (`no: 'WhatsApp con ventana'`) puede quedar como guarda de que no vuelve. |
| Sigla permitida `WHATSAPP` | `e2e/auditoria/detector.ts:372` | Quitar |
| Presupuesto de palabras del sup | `e2e/auditoria/presupuesto.ts:57` (cuenta «Ver el chat») | Recalcular |
| Sección 8 y otras | `scripts/verificar-libro.mjs`: :362-416, :565-571, :579-580, :584-603, :680-695, :697-713, :1165-1170, :1401-1406, :1417-1419 y :1713-1718 | Borrar lo de WhatsApp. Se quedan las pruebas de `causasSugeridas` (:382-392, :421-430) y de órdenes (:417-420). |
| Varios | `scripts/verificar-contrato.mjs`: `MENSAJES` (:68, :130, :265, :410), invitación con teléfono (:182, :226), forma mínima de usuarios (:486-515), B-05 por WhatsApp (:1157), Hoy del sup (:1295, :1308-1312), orden del técnico (:1443-1452), entrega (:1465-1470) y R20 (:1744-1748) | Podar. **`MENSAJES` no se borra de la prueba de contrato: pasa a «RETIRADO»** (ver la prueba en CAMBIOS-CONTRATO §5). |
| `desc_evid` con lo estructurado | `scripts/verificar-arbol.mjs:624-631` | Cambiar `canal: 'whatsapp'` por una respuesta de pantalla con texto libre. La garantía D2 se sigue probando. |
| Pantallazo `whatsapp-operario` | `scripts/pantallazos.mjs:38` | Quitar |

**Prueba de que se fue (§6.5):**
- `grep -ri whatsapp src e2e` da **0**. Hoy da 34 archivos (26 en `src` y 8 en `e2e`).
- En `CONTRATO.md` y `docs/backend/sql/` solo aparece junto a la marca RETIRADO.
- tsc, oxlint, `npm test` y e2e en verde.
- **El reporte a la ANH no cambia.** Ninguna salida de `referencia/anh/*` lleva WhatsApp: lo que la persona escribe nunca viaja (D2). `desc_evid` se arma con lo estructurado (`CONTRATO.md` línea 1012). Hay que comprobarlo regenerando la referencia y viendo que `referencia/anh/` no cambia.

## 4. Lo que el dueño tiene que decidir

1. **Aceptar que se pierde el empujón.** Sin WhatsApp, el operador se entera de la pregunta solo si abre TRIM; hoy le llega al teléfono aunque no lo tenga abierto.
   - El reemplazo dentro de TRIM (la pregunta en Hoy, la insignia y la tarjeta «Conseguir la causa» del supervisor) **depende de que alguien mire**.
   - Si en campo eso no pasa, las paradas «sin identificar» van a crecer. Se puede medir: cuántas preguntas se contestan antes del arranque, antes y después.
2. **El texto de cuánto lleva sin respuesta** (fila 5). Es opcional y lo armaría el motor.
3. **«Ver el chat» → «Ver la parada»** en las tarjetas de sup, jefe y conf (fila 18). El destino es el mismo, Identificar.
4. **La entrega de turno** se queda en pantalla y PDF. El X4 decía «se comparte por WhatsApp o en PDF» (`X4-arquitectura-roles.md:1234`); queda solo PDF.

## 5. Archivos de documentación que hablan de WhatsApp (se actualizan al construir)

Se marcan RETIRADO, no se borran, para que el desarrollador del backend sepa qué ya no construir:
- `CONTRATO.md`: 29 menciones, en «WhatsApp: el carril caliente» y «El webhook de WhatsApp» (líneas 937-1020), usuarios (585-630), respuesta (642), pendientes (1876, 1909) y Hoy (2297-2366);
- `docs/backend/sql/esquema.sql` (29), `tablas.json` (33), `ejemplos.sql` (12), `pruebas.sql` (6) y `validacion.log`;
- `docs/backend/03-modelo-de-datos.md` (32), `05d-entradas-salidas/05-whatsapp.md` (21), `06d-choke-pantallas/08-whatsapp.md` (20), `05d-…/03-usuarios-roles-permisos.md` (18), `06c-…/02-identificar.md` (16), `07-api.md` (4) y `10-pendientes.md` (S10, S20, S29 y la línea 143), entre otros.

Se reescriben sin la promesa (documento comercial):
- `docs/backend/01-propuesta-de-valor.md`, líneas 99, 234 y 343 («Avisar por WhatsApp»);
- `pitch-trim-ventas.md:124`.

`TRIM-pitch-comercial.html` no menciona WhatsApp (grep = 0). Su PDF no se revisó.
