# 5D.5 · WhatsApp: el carril caliente · RETIRADO (27-oct-2026)

> **RETIRADO (27-oct-2026).** El dueño decidió quitar el canal de WhatsApp: el backend no lo construye. Reemplazo dentro de TRIM: los avisos de parada, de pozos cerrándose y de orden liberada son tarjetas e insignias de **Hoy** (y la franja «No arrancar»); la pregunta «¿qué se dañó?» es **la pregunta de Hoy** y «Contestar» en Identificar (`POST /api/paradas/:evento/respuesta`); el recordatorio y el escalamiento son la tarjeta **«Conseguir la causa»** con la insignia del supervisor; «2 Algo está mal» es el botón **«Algo está mal»** (`POST /api/anh/paradas/:id/revision`); la entrega de turno queda en pantalla y en PDF. Ver [CAMBIOS-CONTRATO.md §3](../CAMBIOS-CONTRATO.md#3-retirado-whatsapp-propuesto-el-27-oct-2026) y [whatsapp.md](../../experiencia-v3/whatsapp.md). Este capítulo queda como histórico.

TRIM avisa por WhatsApp, en minutos, a quien tiene que actuar sobre un equipo de alto impacto, y recibe la respuesta en el mismo hilo: **un toque para decir qué se dañó**. Es lo que convierte una parada «sin identificar» en un dato con parte y modo de falla (ISO 14224), que es lo que el vigía necesita para aprender y lo que hace defendible el libro.

Por qué importa para el negocio: cuando la bomba de reinyección P-201B de La Ceiba se para, su respaldo (P-201A y P-201C) no alcanza a tomar toda el agua y el tanque empieza a llenarse; con el 95 % del líquido del campo en agua, en menos de dos horas hay que cerrar pozos. El supervisor y el operador tienen que saberlo **al parar**, no al revisar el turno; y si ninguna señal del PLC explica la parada, la única fuente de la causa es quien abre el equipo.

Código: `src/entities/mensajes.ts` (349 líneas), `src/shared/api/mensajes.ts` (el registro del demo), `src/shared/api/escrituras.ts:334-410` (respuesta en pantalla y webhook simulado), `src/widgets/whatsapp/Telefono.tsx`, `NoEnviado.tsx`, `src/pages/Turno.tsx`, `src/pages/Causa.tsx:379-427`, `src/pages/Trabajo.tsx`, `src/widgets/conectores/Integraciones.tsx`, `src/entities/usuarios.ts:117-135`.

---

## 1. Las reglas (fijas del producto, no se configuran por persona)

### Destinatarios de una regla (`destinatarios`, `recibeAlertas`)

$$ \text{destinatarios}(R, c) = \{\, u : u.\text{rolId} \in R \;\land\; \text{recibeAlertas}(u, c) \,\} $$

con `recibeAlertas` = activa ∧ alertas encendidas ∧ con teléfono ∧ rol ∈ {sup, oper, tec, conf, jefe} ∧ tiene el campo (5D.3). Un suspendido, un invitado o alguien con las alertas apagadas no recibe nada.

### Tabla de reglas

| Regla (`regla`) | Disparador | A quién | Hora del mensaje | Plantilla |
|---|---|---|---|---|
| `parada` | un evento propio de un equipo de alto impacto (bomba de la línea o electrosumergible) empieza, **y su familia está encendida en el perfil que regía a esa hora** | supervisor(es) y operador(es) del campo con alertas | inicio del evento + 1 min | `parada` (bomba) o `paradaEsp` (electrosumergible) |
| `cierre` | (solo bombas) se cierra el **primer** pozo por esa parada | los mismos | inicio del primer tramo de pozo cargado a ese evento + 1 min | `cierre` |
| `causa` (pregunta) | una parada que **ninguna señal explica** (pregunta del libro, `Pregunta`) | operador(es) con alertas; **si no hay ninguno, el supervisor** | inicio + 1 min | `causa` |
| `causa` · `recordatorio` | sigue sin respuesta a los 30 min | los mismos de la pregunta | inicio + 30 min, solo si la respuesta no llegó antes | `recordatorio`, o `recordatorioArranco` si el equipo ya arrancó a esa hora |
| `causa` · `escalamiento` | sigue sin respuesta a las 2 h **y** la pregunta fue a operadores | supervisor(es) con alertas | inicio + 120 min, solo si la respuesta no llegó antes | `escalamiento` |
| `parte` | el vigía **emite** una predicción de falla de una parte | confiabilidad y jefe de mantenimiento con alertas y ese campo | la hora de emisión de la predicción | `parte` (con tag) o `parteSinTag` |
| `orden` | SAP **libera** una orden asignada a una persona (`tecnico`) | ese técnico, si recibe alertas de ese campo | `liberada` + 1 min | `orden` |

Detalles que el servidor tiene que respetar (`mensajes.ts:233-349`):
- **Paradas**: se recorren los eventos de la historia de cada equipo de la flota del campo (`flotaDe`); el perfil y el respaldo se leen de `configEn(versiones, inicio)`, **la configuración que regía al parar**. Familia apagada → no hay mensaje (el equipo no se vigilaba).
- **Pregunta** y su hilo: se calculan las opciones una sola vez (`causasSugeridas(p, ctx)`, sin lecturas actuales) y van en los tres mensajes.
- **Respuesta**: con `p.causa.declarado.hora`, se dejan de mandar el recordatorio y el escalamiento posteriores a esa hora.
- **Orden**: el aviso queda aunque la orden pase después a TECO; una orden sin `liberada` o sin `tecnico` (contratista) no genera mensaje.

**Ejemplo con los datos del demo.** (Corrido, `GET /api/mensajes` del demo con las 8 personas iniciales, de `2025-10-01` a AHORA.) **337 mensajes**: 311 de La Ceiba (el único campo con supervisor y operador con alertas) y 26 de los avisos del vigía a jefe y confiabilidad en Morichal (20) y Guacamayo (6): `parada/paradaEsp` 238, `parada/parada` 18, `cierre` 18, `causa` 4, `recordatorio` 4, `escalamiento` 3, `parte` 10, `parteSinTag` 24, `orden` 18. Por destinatario: oper 145, sup 140, tec 18, jefe 17, conf 17. **0 no enviados**. El más viejo `2025-10-01T07:56:00Z`, el más nuevo `2026-10-02T14:11:00Z`.

El hilo de la parada de P-201B del 2 de octubre (`EV-2011-1002`, paró a las 03:52:18 hora de Colombia, sin causa por señal, todavía abierta):

| Hora (UTC) | Hora Colombia | Para | Plantilla | Texto |
|---|---|---|---|---|
| 08:53:18 | 03:53 | sup, oper | `trim_equipo_parado` | TRIM · P-201B de La Ceiba paró a las 03:52. Tiene respaldo (P-201A y P-201C en paralelo, con 30.100 bbl/d libres entre las dos: el cabezal de disposición las limita a unos 89.250 cada una), pero no para todo su caudal: si no arranca a tiempo, puede haber que cerrar pozos. |
| 08:53:18 | 03:53 | oper | `trim_que_se_dano` | TRIM · P-201B de La Ceiba paró el 2 de oct, 03:52. Ninguna señal dice qué se dañó. ¿Qué encontró? Responda con un número.⏎1) Sello mecánico (5 de las 8 fallas anteriores de este equipo) · 2) Rodamientos y cámara de empuje (3 de las 8 fallas anteriores de este equipo) · 3) Otra parte del equipo · 0) Otra cosa: escríbala |
| 09:22:18 | 04:22 | oper | `trim_recordatorio_causa` | TRIM · Recordatorio: P-201B sigue sin causa. Antes de arrancar, diga qué se dañó. Responda con un número.⏎(las mismas opciones) |
| 10:44:00 | 05:44 | sup, oper | `trim_pozos_cerrandose` | TRIM · Por P-201B parado se empezaron a cerrar pozos de La Ceiba a las 05:43. |
| 10:52:18 | 05:52 | sup | `trim_escalado_causa` | TRIM · Escalado: P-201B de La Ceiba paró hace 2 h y nadie ha dicho qué se dañó.⏎(las mismas opciones) |

(⏎ = el salto de línea que es parte del cuerpo aprobado.) El primer pozo (LC-16) se cerró a las 05:43: 1 h 51 min después de parar, que es lo que el tanque TK-AG-CE aguantó con los 44.100 bbl/d que P-201A y P-201C no alcanzan a tomar. **El mensaje de las 03:53 no lo sabía** y no lo dice: dice lo que el respaldo firmado permite («puede haber que cerrar pozos»). Antes del 9-oct, con La Ceiba sin respaldo, el aviso de cierre llegaba de último (08:08); ahora llega antes que el escalamiento.

Con supervisor y operador en todos los campos (corrido con esas dos personas en «todos»), aparecen las tres consecuencias de una bomba según su respaldo:

| Campo · bomba | Respaldo libre / capacidad | Consecuencia (texto exacto) |
|---|---|---|
| La Ceiba · P-201B | 30.100 / 89.250 | «Tiene respaldo (P-201A y P-201C en paralelo, con 30.100 bbl/d libres entre las dos: el cabezal de disposición las limita a unos 89.250 cada una), pero no para todo su caudal: si no arranca a tiempo, puede haber que cerrar pozos.» |
| Morichal · MPP-301 | 0 / 90.000 | «Si no arranca a tiempo, hay que cerrar los pozos que dependen de ella.» |
| Morichal · P-201B | 39.500 / 86.500 | «Tiene respaldo (Las otras seis bombas del tren, con 39.500 bbl/d libres entre todas: el cabezal de disposición las limita a unos 86.500 cada una), pero no para todo su caudal: si no arranca a tiempo, puede haber que cerrar pozos.» |
| Guacamayo · P-201B | 50.000 / 50.000 | «Tiene respaldo (P-201C de reserva (50.000 bbl/d), alineada al pozo de disposición alterno: toma todo su caudal): toma todo su caudal y no hay que cerrar pozos.» |

Regla:

$$ \text{consecuencia} = \begin{cases} \text{«…hay que cerrar los pozos…»} & \text{sin respaldo o } \text{libre} \le 0 \\ \text{«Tiene respaldo ({detalle}): toma todo su caudal…»} & \text{libre} \ge \text{capacidadBpd (nominal de la bomba)} \\ \text{«Tiene respaldo ({detalle}), pero no para todo su caudal…»} & \text{en otro caso} \end{cases} $$

Una electrosumergible: «Según su última prueba, el pozo deja de producir unos {crudoBpd redondeado, miles con punto} bbl/d.» con la **última prueba con fecha ≤ inicio de la parada**; sin ninguna: «Todavía no tiene prueba de pozo: no se sabe cuánto deja de producir.». Corridos: «TRIM · LC-12 de La Ceiba (electrosumergible) paró a las 17:25. Según su última prueba, el pozo deja de producir unos 396 bbl/d.» y «TRIM · LC-16 de La Ceiba (electrosumergible) paró a las 21:25. Todavía no tiene prueba de pozo: no se sabe cuánto deja de producir.».

**Referencia.** `src/entities/mensajes.ts:221-349`; `src/entities/usuarios.ts:117-135`; `CONTRATO.md` · «WhatsApp: el carril caliente».

---

## 2. Las diez plantillas aprobadas por Meta

WhatsApp exige que el mensaje que **inicia la empresa** sea una plantilla aprobada (categoría **utilidad**). Cada mensaje del registro guarda su `plantilla` y sus `parametros`, y su `texto` **sale de ahí** (`textoDe`): lo que el registro dice que se envió es exactamente lo que la plantilla produce. El «TRIM · » del comienzo y el salto de línea antes de `{opciones}` son **parte del cuerpo aprobado**.

| Clave (`plantilla`) | Nombre aprobado en Meta | Cuerpo exacto | Regla que la dispara |
|---|---|---|---|
| `parada` | `trim_equipo_parado` | `TRIM · {equipo} de {campo} paró a las {hora}. {consecuencia}` | parada de una bomba de la línea |
| `paradaEsp` | `trim_electrosumergible_parada` | `TRIM · {equipo} de {campo} (electrosumergible) paró a las {hora}. {consecuencia}` | parada de la electrosumergible de un pozo |
| `cierre` | `trim_pozos_cerrandose` | `TRIM · Por {equipo} parado se empezaron a cerrar pozos de {campo} a las {hora}.` | primer pozo cerrado por una bomba parada |
| `causa` | `trim_que_se_dano` | `TRIM · {equipo} de {campo} paró el {fecha}. Ninguna señal dice qué se dañó. ¿Qué encontró? Responda con un número.\n{opciones}` | pregunta: parada que ninguna señal explica |
| `recordatorio` | `trim_recordatorio_causa` | `TRIM · Recordatorio: {equipo} sigue sin causa. Antes de arrancar, diga {pregunta}. Responda con un número.\n{opciones}` | 30 min sin respuesta, el equipo sigue parado |
| `recordatorioArranco` | `trim_recordatorio_arranco` | `TRIM · Recordatorio: {equipo} arrancó a las {hora} sin causa. Diga {pregunta}. Responda con un número.\n{opciones}` | 30 min sin respuesta y el equipo **ya arrancó** antes de los 30 min |
| `escalamiento` | `trim_escalado_causa` | `TRIM · Escalado: {equipo} de {campo} paró hace 2 h y nadie ha dicho qué se dañó.\n{opciones}` | 2 h sin respuesta → supervisor |
| `parte` | `trim_vigia_anticipa` | `TRIM · {equipo} de {campo}: el vigía anticipa falla en {parte}; cruzaría su límite entre el {desde} y el {hasta} ({tag}). {accion}` | predicción emitida con tag |
| `parteSinTag` | `trim_vigia_anticipa_sin_tag` | `TRIM · {equipo} de {campo}: el vigía anticipa falla en {parte}; cruzaría su límite entre el {desde} y el {hasta}. {accion}` | predicción emitida sin tag |
| `orden` | `trim_orden_liberada` | `TRIM · SAP liberó la orden {orden} ({clase}, prioridad {prioridad}) para {equipo} de {campo}: {descripcion}` | SAP liberó una orden con técnico |

(Son 7 reglas o pasos de hilo —parada, cierre, pregunta, recordatorio, escalamiento, parte, orden— y **10 plantillas**, porque tres pasos tienen variante: bomba/electrosumergible, sigue parado/ya arrancó, con tag/sin tag. Una plantilla con un parámetro opcional no existe en Meta: por eso cada caso es una plantilla aparte.)

### Parámetros (todos texto, todos obligatorios, sin vacíos ni saltos de línea)

| Parámetro | Valor | Formato | Ejemplo corrido |
|---|---|---|---|
| `equipo` | id del equipo (o del pozo) | tal cual | `P-201B`, `LC-12`, `K-101` |
| `campo` | nombre del campo en el registro | `campoPorId(c).nombre` | `La Ceiba` |
| `hora` | hora del evento (inicio, primer cierre o arranque) | `HH:MM` 24 h en Colombia (`Intl es-CO`, `America/Bogota`) | `03:52` |
| `fecha` | inicio de la parada | `fechaHora`: «{d} de {mmm}, HH:MM» (con año si es de otro año) | `2 de oct, 03:52` |
| `consecuencia` | frase según respaldo o prueba | ver §1 | — |
| `opciones` | las opciones numeradas en **una sola línea** | `{clave}) {texto}` + ` ({porque})` si hay porqué; unidas con ` · ` | `1) Sello mecánico (5 de las 8 fallas anteriores de este equipo) · … · 0) Otra cosa: escríbala` |
| `pregunta` | `por qué paró` (pozo sin catálogo de daños) o `qué se dañó` | texto fijo | `qué se dañó` |
| `parte` | nombre de la parte en minúscula, o `una parte` | `NOMBRE_PARTE[parte].toLowerCase()` | `admisión y gas`, `bomba de fondo` |
| `desde`, `hasta` | ventana de la predicción | `fechaHora` | `3 de oct, 19:38` |
| `tag` | tag que la anuncia, con su fuente | texto de la predicción | `PIT-MN18 · sensor de fondo` |
| `accion` | acción de la predicción o de la parte en el catálogo; si no hay, `Vea la ficha de {equipo} en TRIM.` | texto | `Bajar la frecuencia o revisar el nivel de fluido antes de que dispare por baja carga.` |
| `orden` | número de la orden SAP | texto | `40012056` |
| `clase` | nombre de la clase en minúscula | `correctivo` / `preventivo` / `predictivo` | `predictivo` |
| `prioridad` | prioridad SAP 1-4 | `String(n)` | `2` |
| `descripcion` | descripción de la orden en SAP | tal cual | `Verificar que las tres unidades estén en servicio: hoy hay dos. …` |

**Validación (`textoDe`).** Una plantilla con un parámetro que **sobra**, **falta**, va **vacío** (o solo espacios) o trae **CR/LF** es un `ErrorDePlantilla` (Meta lo rechazaría). Textos corridos: «La plantilla trim_orden_liberada necesita «descripcion» en una sola línea y no vacío.», «La plantilla trim_pozos_cerrandose no lleva x.», «La plantilla trim_pozos_cerrandose necesita «campo» en una sola línea y no vacío.».

**Ejemplos corridos de cada plantilla (registro del demo).**
- `trim_equipo_parado`: «TRIM · P-201B de La Ceiba paró a las 03:52. Tiene respaldo (P-201A y P-201C en paralelo, con 30.100 bbl/d libres entre las dos: el cabezal de disposición las limita a unos 89.250 cada una), pero no para todo su caudal: si no arranca a tiempo, puede haber que cerrar pozos.» (sin respaldo, como la MPP-301: «… Si no arranca a tiempo, hay que cerrar los pozos que dependen de ella.»)
- `trim_electrosumergible_parada`: «TRIM · LC-12 de La Ceiba (electrosumergible) paró a las 17:25. Según su última prueba, el pozo deja de producir unos 396 bbl/d.»
- `trim_pozos_cerrandose`: «TRIM · Por P-201B parado se empezaron a cerrar pozos de La Ceiba a las 05:43.»
- `trim_que_se_dano` (pozo sin catálogo, LC-21): «TRIM · LC-21 de La Ceiba paró el 1 de oct, 18:20. Ninguna señal dice qué se dañó. ¿Qué encontró? Responda con un número.⏎1) Cierre para prueba o intervención del pozo · 2) Fuga o daño en la línea de flujo · 3) Orden de producción: nominación o restricción del comprador · 4) Falla del controlador o de un instrumento del pozo · 0) Otra cosa: escríbala»
- `trim_que_se_dano` (pozo con electrosumergible sin historia, LC-08): «TRIM · LC-08 de La Ceiba paró el 1 de oct, 22:15. Ninguna señal dice qué se dañó. ¿Qué encontró? Responda con un número.⏎1) Aislamiento del motor y del cable · 2) Protector (sello del motor) · 3) Bomba de fondo (eje y etapas) · 4) Admisión y separador de gas · 5) Motor de fondo · 6) No fue la electrosumergible: otra causa del pozo · 0) Otra cosa: escríbala»
- `trim_recordatorio_causa` y `trim_escalado_causa`: ver el hilo de `EV-2011-1002` arriba.
- `trim_recordatorio_arranco`: **no aparece en el demo** (ninguna pregunta del demo tiene el equipo arrancado antes de los 30 min sin respuesta). Con `equipo: LC-08`, `hora: 22:40`, `pregunta: qué se dañó` produciría «TRIM · Recordatorio: LC-08 arrancó a las 22:40 sin causa. Diga qué se dañó. Responda con un número.⏎{opciones}» (texto armado con la plantilla, no del registro).
- `trim_vigia_anticipa`: «TRIM · MN-18 de Morichal Norte: el vigía anticipa falla en admisión y gas; cruzaría su límite entre el 3 de oct, 19:38 y el 3 de oct, 20:41 (PIT-MN18 · sensor de fondo). Bajar la frecuencia o revisar el nivel de fluido antes de que dispare por baja carga.» (va a jefe y conf, que tienen Morichal).
- `trim_vigia_anticipa_sin_tag`: «TRIM · LC-14 de La Ceiba: el vigía anticipa falla en bomba de fondo; cruzaría su límite entre el 27 de sept, 05:02 y el 30 de sept, 09:50. Revisar sólidos y escala; programar tratamiento químico o el cambio de la bomba.»
- `trim_orden_liberada`: «TRIM · SAP liberó la orden 40012056 (predictivo, prioridad 2) para K-101 de La Ceiba: Verificar que las tres unidades estén en servicio: hoy hay dos. Con el recibidor en 11 min de autonomía, una parada deja las válvulas en posición segura.» (a tec, 2026-10-02T14:11Z = 09:11 Colombia, liberada 09:10).

**Casos borde.** Lo que sigue a la respuesta de la persona (¿qué vio?, la confirmación) va **dentro de la ventana de 24 h** que abre su respuesta, y puede ser mensaje libre (no plantilla). Ver §5.

**Referencia.** `src/entities/mensajes.ts:111-149`; `src/widgets/conectores/Integraciones.tsx` (la lista «PLANTILLAS APROBADAS · UTILIDAD» muestra nombre y cuerpo tal cual).

---

## 3. Opciones numeradas (`Opcion`, `causasSugeridas`)

**Qué es.** Lo que se le ofrece a quien responde: partes del equipo (del catálogo de daños de su clase), con un porqué cuando hay evidencia, y siempre la salida «0» para escribir.

```ts
interface Opcion { clave: string /* "1".."9"; "0" = otra cosa */; texto: string; parte?: ParteId;
                   porque?: string; fuente?: 'senal' | 'historia'; veces?: number; total?: number }
```

**Fórmula.**
1. **Pozo sin catálogo** (sin electrosumergible): `CAUSAS_POZO` = «Cierre para prueba o intervención del pozo», «Fuga o daño en la línea de flujo», «Orden de producción: nominación o restricción del comprador», «Falla del controlador o de un instrumento del pozo» (sin orden de probabilidad), y `0) Otra cosa: escríbala`.
2. **Bomba de la línea o pozo con electrosumergible**: candidatas, sin repetir parte:
   - (solo en pantalla, `lecturas = true`, con la parada **abierta**) primero las partes cuya salud hoy está **fuera** (`fuente: 'senal'`, porqué «{tag} llegó a su alarma» si la señal está en alarma o su pronóstico ya cruzó, si no «{tag} salió de su banda normal»), luego las que **avisan** («{tag} venía avisando»);
   - después la **historia**: fallas **anteriores** del mismo equipo (`inicio < inicio de esta parada`, sin disparos, distintas de esta), contando solo las partes **ya conocidas antes de esta parada** (una respuesta con `hora ≥ inicio` no cuenta); ordenadas por cantidad descendente; `fuente: 'historia'`, `veces` = fallas de esa parte, `total` = fallas anteriores (con o sin parte), porqué «{veces} de las {total} fallas anteriores de este equipo».
   - Con candidatas: las **3 primeras**, luego «Otra parte del equipo», luego (si es electrosumergible) «No fue la electrosumergible: otra causa del pozo», luego `0`.
   - Sin candidatas: **todas** las partes del catálogo en su orden, luego (ESP) «No fue la electrosumergible: otra causa del pozo», luego `0`. `conEvidencia = false`.
3. Claves `1..n` en orden; `0` siempre al final.

**Ejemplo con los datos del demo.** P-201B de La Ceiba, parada `EV-2011-1002`: 8 fallas anteriores, 5 de sello y 3 de rodamientos → `[{clave:"1", texto:"Sello mecánico", parte:"sello", fuente:"historia", veces:5, total:8, porque:"5 de las 8 fallas anteriores de este equipo"}, {clave:"2", texto:"Rodamientos y cámara de empuje", parte:"rodamientos", veces:3, total:8, …}, {clave:"3", texto:"Otra parte del equipo"}, {clave:"0", texto:"Otra cosa: escríbala"}]`.

**Casos borde.** **La pantalla escribe desde `veces` y `total`, no desde la frase `porque`** (que es la misma cifra dicha para WhatsApp). En pantalla, con la parada abierta, se suman las partes fuera de banda; el mensaje ya enviado **no** se reescribe con ellas (dice lo que se sabía a su hora). `GET /api/vistas/paradas/:evento/opciones` → `{ catalogo?, sugeridas?: { opciones, conEvidencia }, sospechosa? }` es la versión de pantalla.

**Referencia.** `src/entities/mensajes.ts:58-82, 170-219`.

---

## 4. El registro de lo enviado (`GET /api/mensajes`)

### Mensaje (`Mensaje`)

**Qué es.** El registro de lo que TRIM mandó (o intentó mandar). **Se guarda al enviar y no se reescribe** si después cambia un acceso, una respuesta o la configuración.

```ts
// src/entities/mensajes.ts:84-109
type Mensaje = { id; regla: 'parada'|'cierre'|'causa'|'parte'|'orden'; plantilla: NombrePlantilla; parametros: Record<string,string>;
                 campoId; equipo; para /* id del usuario */; hora /* ISO */; opciones?: Opcion[]; evento?; orden?;
                 insistencia?: 'recordatorio' | 'escalamiento' }
             & ({ texto: string } | { noEnviado: string })
```

`id` en el demo: `{regla}-{evento ?? orden ?? equipo}-{insistencia ?? ''}-{para}-{hora}` (p. ej. `causa-EV-2011-1002-escalamiento-sup-2026-10-02T10:52:18.000Z`). En producción el servidor guarda además **el id de Meta del mensaje saliente** (`wamid`): con él el webhook resuelve a qué mensaje respondió la persona.

**Dónde se ve.**
- **Turno** (sup, oper; últimas 12 h): un hilo por evento (o por orden), un paso por hora y tipo con todos los que lo recibieron (`PASO_CORTO`: «parado», «pregunta», «recordatorio», «escalado», «pozos cerrándose», «aviso del vigía», «orden liberada en SAP»; en el mismo minuto, orden `ORDEN_PASO`: parada, pregunta, recordatorio, escalamiento, cierre, parte, orden) y al final «respondió {por} por WhatsApp: «{texto}»» o «sin respuesta».
- **Causa** (panel de la parada, todos los roles con la pantalla): «WHATSAPP» con los pasos «{HH:MM} {paso}» unidos por « → », el globo «WhatsApp · {equipo}» con quién recibió cada paso, y «respondió {por} · {HH:MM}: «{texto}»», «respondido en pantalla» o chip «sin respuesta». Si nadie la recibe: «WhatsApp: sin destinatario» (ⓘ «Nadie de este campo tiene número con las alertas encendidas; la pregunta está solo en esta pantalla.»). Botón «Ver el chat de {nombre}» / «Ver mi chat de WhatsApp» (el teléfono simulado).
- **Mi trabajo** (técnico): en cada orden suya, «TRIM le avisó por WhatsApp · {fechaHora}» o, si no salió, ◌ «TRIM no pudo avisarle por WhatsApp ({fechaHora}): {motivo}».
- **Conectores → Sistemas corporativos → WhatsApp Business** (administrador): «Número +57 601 555 0100 · verificado por Meta» (fijo del demo), «Respuestas hoy {n} · webhook activo», «Últimas 24 h {n} enviados» (+ ◌ «{n} sin enviar» con ⓘ «Un dato no cabía en su plantilla.»), «{n} personas reciben alertas», y la lista de plantillas. Corrido para La Ceiba: **14 enviados** en las últimas 24 h, 0 sin enviar, **5 personas reciben alertas**, 0 respuestas por WhatsApp hoy.

**Fórmula (regla del registro).** Un mensaje dice **solo lo que se sabía a su hora**:
- la consecuencia de una parada usa el respaldo y el perfil de `configEn(versiones, inicio)`; un respaldo firmado hoy no reescribe el texto de una parada de ayer;
- al parar una bomba no se sabe cuántos pozos va a cerrar ni cuántos barriles va a costar: no se dice;
- las opciones salen de las fallas anteriores a la parada, con las partes conocidas antes de ella;
- la prueba citada de una electrosumergible es la última con fecha ≤ inicio;
- el recordatorio a los 30 min dice «arrancó a las …» solo si el equipo ya había arrancado a esa hora;
- una respuesta posterior no reescribe un mensaje ya enviado.

### Mensajes no enviados (`noEnviado`)

**Qué es.** Un parámetro que no sirve (vacío o de varias líneas, como una descripción de SAP en blanco) **no tumba el registro**: ESE mensaje queda guardado **sin `texto` y con `noEnviado`** = el motivo (el texto del `ErrorDePlantilla`), y los demás salen. Cualquier otro error no es del dato y no se tapa.

**Qué texto se muestra.** Es un **dato inválido** (ISA-101: magenta, círculo punteado ◌), junto al paso del hilo: «· ◌ no se envió a {nombres}: {motivo}» (un mismo motivo para varias personas se dice una vez). **No cuenta como avisado**: en el teléfono simulado no aparece (solo lo que de verdad le llegó). En el demo hay **0** no enviados.

**Quién lo calcula y por dónde viaja.** Servidor: decide, envía por la Cloud API de Meta y guarda. `GET /api/mensajes?campos=a,b` → `Mensaje[]`, **del más reciente al más viejo**, solo de los campos de la persona. Tabla `mensaje` (clave `id`, más el id de Meta del saliente): se guarda al intentar enviar y no se reescribe. En el demo el registro se arma una vez al arrancar con las 8 personas iniciales y la versión 1 (`shared/api/mensajes.ts:18-29`): nadie recibe nada.

**Referencia.** `src/entities/mensajes.ts:104-109, 227-252`; `src/widgets/whatsapp/NoEnviado.tsx`; `CONTRATO.md` · «WhatsApp».

---

## 5. La respuesta

### El webhook de WhatsApp (`GET`/`POST /api/webhooks/whatsapp`)

**Qué es.** La única puerta por la que entra una respuesta por WhatsApp. **No** usa el endpoint de la pantalla ni la sesión de una persona: lo autentica Meta.

**Fórmula (secuencia).**

`GET /api/webhooks/whatsapp` (verificación de la suscripción): si `hub.mode = subscribe` y `hub.verify_token` = el token configurado → responder el valor de `hub.challenge` (texto, 200); si no → `403`.

`POST /api/webhooks/whatsapp`:

| # | Paso | Regla |
|---|---|---|
| 1 | **Firma** | `X-Hub-Signature-256` = `sha256=` + HMAC-SHA256 del **cuerpo crudo** (los bytes como llegaron, **antes** de parsear el JSON) con el *app secret*, comparado en **tiempo constante**. Sin firma válida → `401`. |
| 2 | **Deduplicar** | por el id del mensaje entrante (`messages[].id`): Meta reintenta; un id ya procesado se descarta. |
| 3 | **Persona** | el número `from` (E.164) se resuelve a una persona **activa, con alertas y con el campo de la parada** (`recibeAlertas(u, campo)`, comparando E.164). Si no: no entra y se le contesta que no está registrado. |
| 4 | **Evento** | con el `context.id` del mensaje que la persona respondió = el id de Meta del mensaje saliente guardado en el registro → su `evento`. **Nunca** «la última pregunta abierta» de esa persona ni un id escrito en el texto. |
| 5 | **Opción** | el número escogido es la `clave` de las `opciones` de **ese** mensaje. Con «0» hay que escribir qué encontró (**≥ 8 caracteres**, `TEXTO_LIBRE_MINIMO`); en una bomba, esa respuesta entra **sin parte** y el libro la cuenta en «sin parte». Una opción con parte pide después el modo (lo que vio). |
| 6 | **La primera respuesta gana** | si la parada ya tiene respuesta (por cualquier canal), no se registra y se le contesta quién respondió. |
| 7 | **Guardar** | `Respuesta { texto, por: "{nombre} · {rol}", porId, hora, parte?, modo?, canal: "whatsapp" }` |
| — | **Respuesta a Meta** | **siempre `200`** en cuanto el mensaje queda aceptado o descartado (los `409`/`422` son para la pantalla). |

**Reglas de forma** (las mismas del webhook simulado, `escrituras.ts:385-410`, con sus textos):

| Caso | Texto que se le contesta (`TRIM · {texto}`) |
|---|---|
| el evento no existe | «Esa parada no está en el registro del PLC.» |
| el campo no es el de la parada | «La parada no es de ese campo.» |
| el número no recibe alertas de ese campo | «Ese número no recibe las alertas de este campo: la respuesta no entra.» |
| ya respondió alguien | «Ya respondió {por}.» |
| «0» con menos de 8 caracteres | «Con «0» hay que escribir qué encontró, con al menos una frase corta.» |
| parte que no es del equipo | «Esa parte no es de este equipo.» |
| parte sin modo válido de esa parte | «Diga qué vio en esa parte.» |
| modo «otro» con menos de 8 caracteres | «Escriba qué vio, con al menos una frase corta.» |

**Texto de la respuesta guardada:** con «0» → lo escrito; con parte y modo «otro» → «{texto de la opción}: {lo escrito}»; con parte y modo → «{texto de la opción}: {nombre del modo en minúscula}»; sin parte (una causa de pozo, «No fue la electrosumergible») → el texto de la opción.

**Mensajes libres que siguen a la respuesta** (dentro de la ventana de 24 h; los textos del teléfono simulado, `Telefono.tsx`):
- tras una opción con parte: «TRIM · ¿Qué vio en {parte en minúscula}? Responda con un número.⏎1) {modo}⏎2) …» (los modos del catálogo de esa parte, uno por línea; en un mensaje libre los saltos sí se permiten);
- tras «Otra parte del equipo»: «TRIM · ¿Qué parte? Responda con un número.⏎1) {parte}…»;
- tras «No fue la electrosumergible»: «TRIM · ¿Qué fue? Responda con un número.⏎1) Cierre para prueba o intervención del pozo⏎…»;
- tras «0»: «TRIM · Escriba qué encontró.»; tras el modo «otro»: «TRIM · Escriba qué vio.»;
- al registrar: «TRIM · Registrado: «{texto}». Gracias.»; si ya había respuesta: «TRIM · Ya respondió {por}: «{texto}». Gracias.»; un rechazo: «TRIM · {texto del rechazo}».

**Ejemplo con los datos del demo.** (Corrido contra el webhook simulado, parada `EV-2011-1002` de La Ceiba.) Con `campoId: morichal` → «La parada no es de ese campo.»; desde el número de producción (`prod`, sin alertas) → «Ese número no recibe las alertas de este campo: la respuesta no entra.»; «0» con «fuga» → «Con «0» hay que escribir qué encontró, con al menos una frase corta.»; «1» (sello) sin modo → «Diga qué vio en esa parte.»; «1» con modo `ELP` (modos del sello: `ELP`, `INL`, `OTH`) → aceptada: `{ texto: "Sello mecánico: fuga hacia afuera", por: "Jairo Peña · operador de campo", porId: "oper", parte: "sello", modo: "ELP", canal: "whatsapp", hora: "2026-10-02T14:00:00-05:00" }`. Después, el supervisor por WhatsApp y por pantalla → «Ya respondió Jairo Peña · operador de campo.».

**Casos borde.**
- **Con la fuente http el teléfono simulado no manda nada** y lo dice en el chat: «Con el servidor, una respuesta por WhatsApp solo entra por el webhook firmado de Meta: este teléfono es del demo y no la envía.» Ningún cuerpo del front lleva `canal` ni `por`.
- Una respuesta que llega **después de que el equipo arrancó** deja la parada como **no conformidad** (`arrancoSinIdentificar`).
- En un pozo con electrosumergible, una respuesta con parte entra como **falla de la electrosumergible** (alto impacto, con su parte) y cuenta como declarada; «No fue la electrosumergible» entra como causa del pozo, sin parte.
- Dos respuestas casi simultáneas (WhatsApp y pantalla): la restricción `unique(evento)` en `respuesta_parada` decide; la segunda recibe «Ya respondió …» (WhatsApp) o `409` (pantalla).

### La respuesta en pantalla (`POST /api/paradas/:evento/respuesta`)

Cuerpo `{ evento, campoId, equipo, texto, parte?, modo? }` → `{ respuesta }` con `canal: "pantalla"` puesto por el servidor. Reglas en orden (`escrituras.ts:338-373`): `causa:declarar` o `causa:completar` («Su rol no responde paradas.», 403) → persona activa (403) → evento existe («Esa parada no está en el registro del PLC.», 404) → `campoId` del cuerpo = el del evento («La parada no es de ese campo.», 422) → la persona tiene el campo («Esa parada es de un campo que no tiene asignado.», 403) → **la primera gana** («Ya respondió {por}.», 409) → parte del catálogo del equipo («Esa parte no es de este equipo.») → en una **bomba de la línea** la parte es obligatoria en pantalla («Diga qué parte de la bomba se dañó.») → modo de esa parte («Diga qué vio en esa parte.») → sin parte o con modo «otro», texto libre ≥ 8 («Escriba qué encontró, con al menos una frase corta.») (422). **403 también si el cuerpo trae `canal: "whatsapp"`**. Texto guardado: lo escrito o «{Parte}: {modo en minúscula}».

**Quién lo calcula y por dónde viaja.** Servidor. `GET /api/paradas/respuestas` (arranque) → `{ evento: Respuesta }` de los campos de la persona. Tabla `respuesta_parada` (clave `evento`, `unique`: la primera gana). Una respuesta no se edita ni se reemplaza; la historia de correcciones (`GET /api/paradas/:evento` con `respuestas[]`) está pendiente.

**Referencia.** `src/shared/api/escrituras.ts:308-410`; `src/widgets/whatsapp/Telefono.tsx`; `CONTRATO.md` · «El webhook de WhatsApp», «`POST /api/paradas/:evento/respuesta`».

---

## 6. Envío por la Cloud API (lo que el servidor tiene que construir)

Pendiente del lado del servidor (`CONTRATO.md` · «Pendiente del lado del servidor»): el envío por la Cloud API de Meta con las diez plantillas, guardando el id de cada mensaje saliente. Puntos que se deducen de las reglas:

1. Las reglas se evalúan **por eventos** (parada que empieza, primer cierre, pregunta creada, minuto 30, minuto 120, predicción emitida, orden liberada), no recalculando la historia: el demo recalcula todo desde los insumos, pero un servidor real tiene que **disparar y guardar** en el momento (un job programado para el minuto 30 y el 120 que verifique que no hay respuesta).
2. Antes de enviar: armar los parámetros, validar con `textoDe`; si falla, guardar con `noEnviado`. Si Meta rechaza al enviar (número inválido, plantilla pausada), guardar también como no enviado con el motivo.
3. Idioma de la plantilla: `es` (o `es_CO`, según como se aprueben). Los nombres son los de la tabla; los parámetros en el orden en que aparecen en el cuerpo.
4. Guardar `wamid` del saliente para el paso 4 del webhook.
