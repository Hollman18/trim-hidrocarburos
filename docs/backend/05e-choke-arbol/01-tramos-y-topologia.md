# 5E.1 · Los cuatro tramos y la topología

El modelo choke ve el campo como **una tubería en serie**: el yacimiento entrega a los pozos, los pozos a la planta (o estación) y la planta afuera (oleoducto, transportador o cliente). Lo que no se produjo se trabó en uno de esos tramos, y lo que limita el campo es el tramo más angosto. Es el método de SPE-36848 (Palen y Goodwin, BP, 1996), que la ANH adoptó en la Circular 024 como el paso 2 del árbol de causas (`choke_mod`), y el de la guía de la NSTA (Reino Unido), que agrega «Mercado» como el tramo de afuera que no recibe (anexo C).

Este archivo cubre las palabras de los tramos, el criterio único que decide el tramo de cada equipo (la topología), cómo se deriva del registro, cómo la propone TRIM, cómo se contesta y se firma, y el «Todavía no sé». Lo que cada tramo **da** (sus potenciales) va en 5E.2; el tramo de **cada parada**, en 5E.3.

Rutas: `GET /api/vistas/topologia?campo=` (`pedirTopologia`, `src/shared/api/choke.ts:269`) y `GET /api/vistas/topologia/propuestas?campo=` (`pedirPropuestasTopologia`, `:292`); lo firmado viaja en `POST /api/configuracion` (`Config.topologia` y `Config.topologiaPorSaber`, `src/entities/configuracion.ts:119-128`), con `POST /api/configuracion/vista-previa` (`src/shared/api/escrituras.ts:1264-1305`) y `POST /api/topologia/importar` (`:1306`).

**Dos sentidos de «tramo».** En este capítulo «tramo» es siempre un tramo de la **tubería** (yacimiento, pozo, planta, afuera). El libro (5A) llama «tramo» a un pedazo de tiempo de una parada (`Tramo`, `diferido.ts`); aquí ese se llama **fila** cuando es la fila ANH (pozo × día × causa, 5E.9) o **tramo del libro** cuando hace falta distinguirlo.

---

### Los cuatro tramos y sus palabras

**Qué es.** Los valores del paso 2 de la ANH (`ChokeAnh`, `src/entities/choke.ts:64`): `reservorio`, `pozo`, `planta`, `exportacion`, en el orden de la tubería (`ORDEN_CHOKE`, `:117`). Para **lo que limita** a un campo hay tres (`ChokeCampo`, `:68`): `pozos` (incluye el yacimiento, como la NSTA), `planta` y `exportacion`. «Mercado» **no es un quinto valor**: es un subnivel de exportación (`subnivel: 'mercado'`, `SUBNIVEL_MERCADO`, `:161`). Lo que no tiene tramo todavía es `sin-asignar` (`CHOKES_Y_SIN_ASIGNAR`, `:119`).

**Dónde se ve.** En toda pantalla que dice dónde se trabó algo: la tubería del campo, el reparto, el árbol, Identificar, «si falla hoy», la topología de Configuración.

**Qué texto.**

| Valor | `NOMBRE_CHOKE` (`:125`) | `EXPLICA_TRAMO` (`:132`, el ⓘ corto) | `DONDE_CHOKE` (`:146`, en frase) |
|---|---|---|---|
| `reservorio` | «En el yacimiento» | «La roca o el fluido, no un equipo» | «en el yacimiento» |
| `pozo` | «En el pozo» | «Solo afectó a este pozo» | «en el pozo» |
| `planta` | «En la planta o estación» | «Afectó a varios pozos» | «en la planta» |
| `exportacion` | «Afuera: oleoducto, transportador o cliente» | «Fuera de la batería» | «afuera (oleoducto, transportador o cliente)» |
| `sin-asignar` | — | — | «sin identificar todavía» |

`RESUMEN_TRAMO` (`:139`) es el ⓘ largo: «El problema fue de la roca o del fluido, no de un equipo: el pozo no tenía qué dar.» · «Solo afectó a este pozo: su bomba de fondo, su varilla, su cabeza, su línea o lo eléctrico que es solo suyo.» · «Afectó a varios pozos: lo compartido, desde el cabezal de producción hasta la salida de la batería, y los servicios del campo.» · «Fuera de la batería: el oleoducto, el transportador o el cliente no recibieron.» Para lo que limita, `NOMBRE_CHOKE_CAMPO` (`:155`): «Los pozos», «La planta o estación», «Afuera: oleoducto, transportador o cliente». El subnivel: «Mercado: el terminal o el cliente no recibe, o la nominación».

**Quién lo calcula.** Son constantes del producto; el servidor devuelve los códigos y el front pone las palabras. Si el servidor genera textos (mensajes, informes), usa estas mismas.

**Referencia.** `src/entities/choke.ts:59-176`; `src/entities/anh-catalogo.ts:280` (`ETIQUETA_CHOKE`, las palabras de la Circular).

---

### El criterio único: el alcance decide el tramo

**Qué es.** El tramo de un equipo **no lo escoge nadie**: sale de **a quién sirve** (su alcance, `AlcanceElemento`, `choke.ts:82`). Es el criterio de Edinson Romero en la sesión con la operadora («esto está copiado del modelo choque», [26:48]): lo que es de un solo pozo es el pozo; lo que comparten varios es la planta; lo que está en el límite de la batería o es de otro dueño es afuera. Un solo criterio, sin opción NSTA, para que los campos se puedan comparar (CHOKE-COMPLETO §2).

**Fórmula.** `chokeDeAlcance` (`choke.ts:212-220`):

| Alcance | `NOMBRE_ALCANCE` (`:162`) | Ejemplos | Tramo |
|---|---|---|---|
| `dedicado` | «Le sirve a un solo pozo» | la bomba de fondo, el variador, el transformador, la línea de flujo de un pozo | `pozo` |
| `compartido` | «Le sirve a varios pozos» | pórtico, red de media, separador, bombas de agua, multifásica de un clúster, aire, compresor | `planta` |
| `frontera` | «El límite de la batería hacia afuera» | la brida de salida, el punto de entrega | `exportacion` |
| `tercero` | «De otro dueño, más allá de la batería» | oleoducto, transportador, cliente | `exportacion` |

Dentro de la batería el alcance sale del **número de pozos servidos** (`alcancePorPozos`, `:223`): uno, dedicado; dos o más, compartido. **El yacimiento nunca sale de un equipo**: solo lo pone una persona (5E.9, `declararYacimiento`). **La energía que entra no es frontera**: la acometida sirve a varios pozos y es compartida (la restricción se materializa en el sistema eléctrico del campo); quién la cortó (el proveedor o el campo) es el responsable, otro paso del árbol.

**Ejemplo con los datos del demo.** La Ceiba (18 pozos): P-201B (bomba de agua) sirve a los 18 → compartido → planta; LC-14 (su levantamiento) → dedicado → pozo; el oleoducto → tercero → afuera. Morichal: MPP-301 (multifásica) sirve a MN-07, MN-18 y MN-33 → compartido → planta.

**Casos borde.** Un elemento guardado con un `choke` que no es el que sale de su alcance: el motor usa el derivado y la firma lo rechaza (abajo). Un equipo de 2 o 3 pozos de la misma locación: va a la planta, marcado (abajo).

**Quién lo calcula.** Servidor (y el front, para la frase inmediata). El `choke` se guarda solo para la auditoría.

**Referencia.** `src/entities/choke.ts:206-228`; `CONTRATO.md` · «Configuración» (`topologia`: «el `choke` se guarda para la auditoría, pero **sale del alcance**»).

---

### La topología que rige en un campo

**Qué es.** La lista de elementos del campo con su alcance y sus pozos (`ChokeDeElemento`, `choke.ts:85-104`: `elemento`, `choke`, `alcance`, `pozos?`, `campoId?`, `casoBorde?`). Rige **la firmada** (`Config.topologia`) si trae alguna entrada para el campo; si no, **la que se deriva del registro** (`topologiaDe`, `:412`; `topologiaFirmada`, `:414`). Una topología firmada **manda entera**: un campo la estrena completa (abajo, «la primera firma»). Una entrada firmada sin `campoId` vale para todos los campos.

**Fórmula (la derivada, `topologiaDerivada`, `choke.ts:330-367`).** Sin escribir nada a mano, con lo que el motor ya tiene:

1. cada pozo es dedicado a sí mismo (su levantamiento);
2. las bombas de la línea sirven a los pozos de su perfil (`bombas.ts`: MPP-301 → MN-07, MN-18, MN-33); las de agua, a todos los pozos del campo (toda el agua pasa por ellas);
3. lo del esquema de planta (`CAMPO_PLANTA`: manifold, separador, tratador, tanques, LACT, depurador, compresor, tea, tanque y bombas de agua, inyectores, subestación, aire) sirve a todos los pozos: compartido;
4. lo que sale del límite de batería (oleoducto, gas a venta) es de otro dueño: tercero;
5. los alimentadores se agrupan por `Pozo.alimentador` (en el demo, todos cuelgan del pórtico SE-2).

Un elemento que no está en el registro no está en la topología: el tramo de su parada sale de la regla por tipo de causa (5E.3) y se dice («fuente: regla»). Vive en el motor y no en `datos/`: es una regla sobre el registro (`verificar-libro` §14 comprueba que el motor no importa `datos/*`).

**Ejemplo con los datos del demo** (topología derivada; ningún campo trae topología firmada en la versión 1):

| Campo | Elementos | Dedicados | Compartidos | De otro dueño | Pozos |
|---|---:|---:|---:|---:|---:|
| La Ceiba | 36 | 18 | 16 | 2 | 18 |
| Morichal Norte | 65 | 41 | 22 | 2 | 41 |
| Guacamayo | 27 | 12 | 14 | 1 | 12 |
| El Palmar | 18 | 7 | 10 | 1 | 7 |
| La Zarza | 23 | 9 | 12 | 2 | 9 |

En La Ceiba, P-201A, P-201B, SE-2, K-101, V-101, LACT-01, TK-102, C-401 y H-302 son compartidos de 18 pozos (planta); el oleoducto y el gas a venta, de otro dueño (afuera).

**Qué texto.** La lista de Configuración usa `renglonDe` (`choke-config.ts:117-135`): «sirve a todo el campo (18 pozos) → se traba en la planta», «sirve solo a LC-16 → se traba en el pozo», «de otro dueño, más allá de la batería → se traba afuera», «llegada de la energía (18 pozos) → se traba en la planta», «punto de entrega → se traba afuera»; sin elemento: «todavía no se sabe: sus paradas quedan sin tramo hasta que se diga» o «sin responder: el tramo de sus paradas sale de la regla por tipo de falla».

**Quién lo calcula.** Servidor: `GET /api/vistas/topologia?campo=` → `{ campoId, firmada, elementos, porSaber, sinResponder }` (`CONTRATO.md`, vistas; tipo en el Anexo A, `// GET /api/vistas/topologia?campo`).

**Referencia.** `src/entities/choke.ts:282-429`; `referencia/choke/topologia-{ceiba,morichal,guacamayo,palmar,zarza}.json`.

---

### El caso de borde: un equipo de la misma locación

**Qué es.** Un equipo compartido por **2 o 3 pozos de una misma locación** (`casoBordeDe`, `choke.ts:269-275`). La regla dice planta (sirve a varios) y el administrador no puede escoger otra cosa; se marca `casoBorde: 'misma-locacion'` para que, el día que la operadora conteste (pregunta abierta, 5E.11), se vea cuántos equipos y paradas cambian.

**Ejemplo con los datos del demo.** Morichal: MPP-301 → MN-07, MN-18 y MN-33, los tres del «Clúster norte» (`LOCACIONES_DEMO`, `src/entities/datos/topologia.ts:19-27`). Cargado por CSV: «Fila 2: MPP-301 sirve a 3 pozos de una misma locación (MN-07, MN-18 y MN-33): va a la planta, y queda marcado como caso de borde hasta que se confirme la regla con la operadora.» (aviso, no bloquea).

**Qué texto.** ⓘ `EXPLICA_CASO_BORDE` (`:251`): «Falta confirmar con la operadora si un transformador que alimenta 2 o 3 pozos de una misma locación va al pozo o a la planta. Hoy va a la planta, porque sirve a varios. Si la regla cambia, todos los equipos con esta etiqueta cambian juntos, con vista previa y firma.»

**Casos borde.** La locación de cada pozo **no está en `Pozo`**: la da quien llama (en el demo, la costura pasa `locacionDemo`). El servidor necesita ese dato del registro (5E.11).

**Referencia.** `src/entities/choke.ts:260-280`; `referencia/choke/topologia-morichal.json`.

---

### Lo que TRIM propone de la topología

**Qué es.** Para que el administrador **confirme y no escriba**, TRIM propone la topología con lo que ya sabe (`propuestasTopologia`, `choke.ts:466-520`), con cuatro fuentes y su evidencia: de qué **alimentador** cuelga cada pozo, qué pozos mueve cada **bomba**, qué pozos cerraron en cada **cascada** de un servicio (la regla de `causa-senal.ts`) y lo que dice el **registro** de cada equipo. Lo que no cuadra va como `conflicto`. **Nunca se firma sola.**

**Ejemplo con los datos del demo** (`porque` tal como sale):

| Campo | Elemento | Fuente | Pozos | Texto |
|---|---|---|---:|---|
| La Ceiba | SE-2 | alimentador | 18 | «Los 18 pozos cuelgan de SE-2: ¿SE-2 sirve a todo el campo?» |
| La Ceiba | P-201B | bomba | 18 | «P-201B saca el agua de los 18 pozos: ¿sirve a todo el campo?» |
| La Ceiba | H-302 | cascadas | 18 | «Cuando cayó H-302 el 23 de abr, cerraron los 18 pozos en cascada. Pasó 2 veces: ¿H-302 sirve a todo el campo?» |
| La Ceiba | K-101 | cascadas | 18 | «Cuando cayó K-101 el 4 de ago, cerraron los 18 pozos en cascada. Pasó 6 veces: …» |
| La Ceiba | V-101 | registro | 0 | «El registro dice que V-101 sirve a «4 pozos».» + conflicto: «… pero el esquema lo pone donde pasa la producción de todos los pozos. ¿Cuál es?» |
| Morichal | MPP-301 | bomba | 3 | «MPP-301 mueve MN-07, MN-18 y MN-33: ¿sirve a esos 3?» |
| Morichal | SE-2 | cascadas | 41 | «Cuando cayó SE-2 el 28 de ago, cerraron los 41 pozos en cascada. Pasó 6 veces: …» |
| Morichal | C-401 | cascadas | 25 | «Cuando cayó C-401 el 25 de jul, cerraron 11 pozos en cascada. Pasó 3 veces: ¿C-401 sirve a esos 25?» + conflicto: «En sus caídas cerraron 25 de los 41 pozos que la topología le supone» |

La de V-101 trae `pozos: []`: el registro dice un número que no cuadra con el esquema, y TRIM no escoge.

**Quién lo calcula.** Servidor: `GET /api/vistas/topologia/propuestas?campo=` → `[{ elemento, pozos, porque, fuente, evidencia, conflicto?, casoBorde? }]`.

**Referencia.** `src/entities/choke.ts:445-520`; `referencia/choke/propuestas-{campo}.json`.

---

### Contestar: «¿A qué pozos sirve este equipo?»

**Qué es.** El administrador contesta un **hecho** y TRIM deduce el tramo (`RespuestaTopologia`, `choke-config.ts:41-42`): `uno`, `varios`, `todos`, `tercero`, `frontera`, `acometida`, `no-se`. `elementoDeRespuesta` (`:79-92`) arma el elemento: con `uno` o `varios`, los pozos escogidos; con `todos`, `tercero`, `frontera` y `acometida`, todos los pozos del campo; el alcance sale del hecho y el tramo, del alcance; el caso de borde se marca con la misma regla de la carga.

**Qué texto (al instante, `fraseDe`, `:104-116`).** Corrido en La Ceiba:

| Respuesta | Frase |
|---|---|
| P-201B · `uno` (LC-16) | «Si para, se traba en el pozo: es solo de LC-16.» |
| P-201B · `todos` | «Si para, se traba en la planta o estación: sirve a los 18 pozos.» |
| oleoducto · `tercero` | «Si para, se traba afuera.» |
| SE-2 · `acometida` | «Si para, se traba en la planta o estación. Quién respondió (el proveedor o nosotros) se pregunta en cada parada.» |
| `no-se` | «Mientras no se sepa, TRIM no adivina: sus paradas quedan sin tramo y en Identificar cada una pregunta «¿Dónde se originó la parada: en el pozo, en la planta o afuera?».» |

**Quién lo calcula.** Front (borrador); el servidor vuelve a correr las reglas al firmar.

**Referencia.** `src/entities/choke-config.ts:36-135`.

---

### «Todavía no sé»: el motor no adivina

**Qué es.** Un equipo del que el administrador contestó «Todavía no sé» se firma en `Config.topologiaPorSaber` (`ElementoPorSaber`, `choke.ts:106`). **El motor no adivina su tramo**, ni por el tipo de falla: `deducirChoke` devuelve `null` (`choke.ts:694`) y el paso 2 de sus paradas queda en falta con su porqué y la pregunta `PREGUNTA_ORIGEN` (`porSaberDe`, `:435-443`), que contesta quien revisa, nunca el operador. En «si falla hoy» el equipo va sin cifra (5E.7).

**Ejemplo con los datos del demo.** Con K-101 de La Ceiba por saber, en los 13 meses del demo (1-oct-2025 → 2-oct-2026 14:00): 105 tramos del libro, 17.277 bbl, pasan a **sin tramo**; siguen en el escalón de paradas no planeadas (el escalón sale de la causa, 5E.4, QA-D5). Porqué: «Falta saber a qué pozos sirve K-101: el administrador contestó «Todavía no sé» y TRIM no lo adivina».

**Casos borde.** Un equipo no puede estar a la vez en `topologia` y en `topologiaPorSaber` del mismo campo (422). Contestado de otra forma, deja de estar por saber.

**Referencia.** `src/entities/choke.ts:419-443`; `CONTRATO.md` · «Configuración» (`topologiaPorSaber`).

---

### La primera firma y la validación

**Qué es.** La topología es **técnica**: la firma el administrador (`config:firmar`) con `POST /api/configuracion`. Un campo que estrena su topología **la firma completa**: cada equipo tiene que tener respuesta (contestada o aceptada por tipo); TRIM propone, no firma nada solo (`pendientesDe`, `faltanParaFirmar`, `choke-config.ts:172-185`). Con una firmada, cambia solo lo contestado, y un equipo nuevo del registro espera su respuesta (`sinResponderDe`, `choke.ts:424-429`) sin trabar la firma de lo demás; mientras tanto su tramo sale de la regla por tipo de causa. `conTopologia` (`choke-config.ts:143-170`) pone el borrador encima de la configuración.

**Reglas (422, `validarTopologia`, `choke.ts:240-258`; regla 9 de la firma).** Textos corridos:

- «P-201B (ceiba): el choke guardado («En el pozo») no es el que sale de su alcance («Le sirve a varios pozos» → «En la planta o estación»).»
- «TR-1 (ceiba): es dedicado, así que le sirve a un solo pozo (tiene 2).»
- «TR-2 (ceiba): le sirve a un solo pozo, así que es dedicado y no compartido.»
- «TR-2 (ceiba): está dos veces en la topología.»
- «TR-2 (ceiba): el pozo XX-99 no es de ese campo.»
- «Hay un elemento sin nombre: de él sale el identificador.»

**Ejemplo con los datos del demo.** Contestar solo P-201B → `uno` (LC-16) en La Ceiba: «La Ceiba: 35 equipos quedan sin contestar en la filosofía operacional. TRIM propone, pero no firma nada solo: contéstelos o acéptelos por tipo.» Aceptando los demás por tipo y con K-101 en «Todavía no sé»: 35 elementos firmados + 1 por saber, sin errores; el historial dice «Topología de La Ceiba: se firma con 35 elementos; antes regía la que TRIM deriva del registro» y «Topología: K-101 (La Ceiba): todavía no se sabe a qué pozos sirve; el tramo de sus paradas queda en falta hasta que se diga».

**Casos borde.** **No es inmutable hacia atrás** (a diferencia de metas y programa): cada parada guarda la regla con que se clasificó (`choke.topologia@3`) y lo que ya confirmó una persona no cambia solo (queda para revisar en Identificar).

**Referencia.** `src/entities/choke-config.ts:136-185`; `src/entities/configuracion.ts:221-241, 388-424`; `CONTRATO.md` · «Configuración», reglas 9–11.

---

### La vista previa del impacto

**Qué es.** Antes de firmar, lo que cambiaría en cada campo (`impactoConfig`, `choke-config.ts:241-288`): qué limita hoy (antes → después), qué equipos cambian en «si falla hoy», cuántas paradas cambiarían de tramo **desde el primer día del tercer mes cerrado** (con las ya confirmadas aparte, que no cambian solas). **La topología no mueve barriles**: el libro es el mismo con las dos.

**Ejemplo con los datos del demo** (La Ceiba, P-201B → solo LC-16 y K-101 → «Todavía no sé»; paradas del 1-jul-2026 al 2-oct-2026 14:00):

- «Qué limita hoy: los pozos → los pozos (no cambia)»
- «Si falla hoy: K-101 9.394 bbl/d → sin dato (se trabaría en sin tramo, antes en la planta o estación); P-201B 1.426 bbl/d → 1.426 bbl/d (se trabaría en el pozo, antes en la planta o estación)»
- «Dónde se trabó: 99 paradas cambiarían de tramo desde el 1 de jul (54: la planta o estación → sin tramo; 45: la planta o estación → el pozo).»
- «El libro no cambia: la topología no mueve barriles, solo dónde se trabó cada parada»

**Quién lo calcula.** Servidor: `POST /api/configuracion/vista-previa { config, aunConErrores? }` → `{ impacto, errores? }`. No guarda nada. Mismas reglas que la firma: `config:firmar`, los campos que toca entre los de la persona (403) y `validarConfig` (422); con `aunConErrores` devuelve el impacto y los errores, salvo que el borrador no se deje calcular.

**Referencia.** `src/entities/choke-config.ts:187-288`; `src/shared/api/escrituras.ts:1264-1305`.

---

### La carga por CSV y la plantilla

**Qué es.** La topología de un campo se puede subir de un CSV o un pegado de Excel (`leerTopologia`, `choke-config.ts:358-415`): dos columnas, «equipo; pozos a los que sirve», separadas por punto y coma, tabulador o coma (decide la primera fila con datos). Los pozos en lista (espacios, comas entre comillas, «/» o «+») o con una palabra: «todos», «otro dueño», «punto de entrega», «todavía no sé». La plantilla (`plantillaTopologia`, `:324-331`) es lo que quedaría hoy en las mismas palabras: descargarla, cambiarla y subirla da lo mismo (La Ceiba: 37 filas con el encabezado; «LC-01; LC-01» … «K-101; todos»). **No firma**: lo leído va al borrador.

**Ejemplo con los datos del demo** (La Ceiba, 10 filas con errores a propósito):

- «Fila 5: XX-1 no está en el registro de La Ceiba: regístrelo primero (esquema de planta o Conectores).»
- «Fila 6: P-201B ya está en la fila 2.»
- «Fila 7: diga a qué pozos sirve SE-2: uno, varios, «todos», «otro dueño», «punto de entrega» o «todavía no sé».»
- «Fila 8: ZZ-9 no es un pozo de La Ceiba.»
- «Fila 9: LC-08 es un pozo: solo se sirve a sí mismo (escriba «LC-08» en sus pozos).»
- Archivo vacío: «El archivo no trae ninguna fila: va una por equipo, con «equipo; pozos a los que sirve».»

Lo que bloquea no entra a la topología leída; de esas 10 filas entraron 3 elementos y K-101 por saber.

**Quién lo calcula.** Servidor: `POST /api/topologia/importar { campo, texto }` → `TopologiaLeida` (`{ campoId, topologia, porSaber, hallazgos, filas }`). `config:firmar` (403 «La topología la carga el administrador de la implementación.»); campo fuera del registro: 404 («Ese campo no está en el registro de campos.»); campo no asignado: 403; texto vacío: 422 («El archivo llegó vacío: …»); `texto` que no es texto: 400. Pasados 50 hallazgos vuelve uno solo que cuenta el resto; se quitan los caracteres invisibles (C-12, C-24).

**Referencia.** `src/entities/choke-config.ts:289-415`; `src/shared/api/escrituras.ts:1306-1350`.
