# 5D.2 · Configuración firmada y versionada (metas, tanques, respaldos, programa, perfil, membrete)

En TRIM casi nada se escribe a mano: producción, diferido, causas, salud y predicciones salen de los equipos. Lo que sí escribe una persona es **la regla contra la que se mide**: las metas de cada campo (con su precio y su regla de cierre), los tanques de agua, el respaldo de cada bomba, el programa de paradas aprobado, el perfil del campo y el nombre de la empresa del membrete. Todo eso es **una sola configuración**, que se edita en un borrador y **rige solo cuando se firma**. Cada firma es una **versión nueva** que nunca se sobrescribe ni se borra.

Por qué importa para el negocio: si la meta, el precio o el programa de paradas se pudieran mover después de ver el resultado, el libro de diferidos dejaría de ser evidencia. Una parada de la bomba de reinyección que se «reprograma» después de ocurrir dejaría de contar como falla; un precio cambiado hoy revaluaría los meses cerrados y los folios ya emitidos dejarían de cuadrar.

Código: `src/entities/configuracion.ts` (461 líneas), `src/entities/plan.ts` (209), `src/shared/api/escrituras.ts:85-123` (la firma, que en el demo ES el servidor), `src/pages/Configuracion.tsx`, `src/widgets/configuracion/Metas.tsx`, `PlanMensual.tsx`, `comun.ts`.

---

## 1. El modelo de datos

```ts
// src/entities/configuracion.ts:24-125 (resumido)
interface TramoMeta { desde: string /* AAAA-MM-DD, Colombia */; produccionBpd: number; diferidoMaxBpd: number;
                      netbackUsd?: number /* ausente = sin precio; en JSON viaja null */; criterioSinCausa: number /* % */ }
interface TanqueAgua { id; nombre; campoId; bomba /* la que lo vacía */; capacidadBbl; altoAlto /* fracción 0..1 */; tagNivel; aforo }
interface ParadaProgramada { id; campoId; equipo; desde /* ISO con zona */; hasta; motivo }
interface RespaldoBomba { campoId; equipo; libreBpd /* 0 = sin respaldo */; detalle }
interface PerfilCampo { gas: 'no' | 'tea' | 'consumo' | 'venta'; bombas: boolean; electrosumergibles: boolean }
interface ConfigCampo { metas: TramoMeta[] /* del más viejo al más nuevo */; perfil: PerfilCampo }
interface Config { empresa: string; campos: Record<string, ConfigCampo>; tanques: TanqueAgua[]; respaldos: RespaldoBomba[]; programa: ParadaProgramada[] }
interface Version { version: number; fecha: string; por: string; motivo: string; cambios: string[]; config: Config }
```

| Pieza | Qué significa en el campo | Quién la firma | Quién la consume (otros capítulos) |
|---|---|---|---|
| `metas[].produccionBpd` | lo que el campo debe producir, bbl/d, en el punto de medición oficial | gerente (`metas:firmar`) | libro (`meta.produccion`), día a día (`meta`), Resumen, informe (`metaProduccion` de la huella) |
| `metas[].diferidoMaxBpd` | lo máximo que se acepta dejar de producir, bbl/d | gerente | libro (`meta.diferido`), informe (`metaDiferido`) |
| `metas[].netbackUsd` | precio neto del barril, USD/bbl; sin él no se pasa a dinero | gerente | `valorUsd` del libro, fichas de equipo; ausente → el campo va en `sinPrecio` |
| `metas[].criterioSinCausa` | % máximo del potencial que puede quedar sin causa para poder **publicar** el libro | gerente | `publicable` / motivo `sin-causa` del libro (`libro.ts:784`) |
| `tanques[]` | tanque de agua que vacía una bomba de reinyección: capacidad, alto-alto, transmisor de nivel, tabla de aforo | administrador (`config:firmar`) | colchón de la predicción («si la bomba se para ahora», `diferido.ts:248`) y colchón previsto de cada parada medida (`diferido.ts:314`) |
| `respaldos[]` | caudal libre que toma el equipo en paralelo cuando la bomba para, bbl/d | administrador | agua sin salida y orden de cierre (`diferido.ts:62`), consecuencia del WhatsApp de parada (`mensajes.ts:279-284`), ficha del equipo (`equipos.ts:464`) |
| `programa[]` | paradas aprobadas antes de ocurrir: lo que cae dentro cuenta como **programado**, no como falla | administrador | causa de cada evento (`causa-senal.ts:136`), órdenes PM02 del demo (`sap.ts:262`) |
| `campos[].perfil` | qué maneja el campo: destino del gas y si tiene bombas de la línea y/o electrosumergibles | administrador | qué se dibuja en Planta, qué subpantallas existen, qué familias se **vigilan** (riesgo, predicciones, WhatsApp de parada) |
| `empresa` | nombre de la empresa en el membrete de los informes | administrador | membrete y CSV (5D.4) |

**Valores de la versión 1 del demo** (corrido con `versionInicial()`): `version: 1`, `fecha: "2026-09-01T08:00:00-05:00"`, `por: "Hermes Leal · administrador de la implementación"`, `motivo: "Arranque de la implementación"`, `cambios: ["Configuración inicial: metas por campo, precio neto, tanques de agua, respaldos de bombas y programa de paradas"]`, `empresa: "Operadora de demostración"`.

| Campo | tramo (desde) | producción bbl/d | máx. diferido bbl/d | precio USD/bbl | máx. sin causa | perfil (gas · bombas · ESP) |
|---|---|---|---|---|---|---|
| ceiba | 2025-10-01 | 10.900 | 800 | 48 | 2 % | venta · sí · sí |
| morichal | 2025-10-01 | 16.700 | 950 | 48 | 2 % | venta · sí · sí |
| guacamayo | 2025-10-01 | 6.300 | 450 | 48 | 2 % | consumo · sí · sí |
| palmar | 2025-10-01 | 3.250 | 50 | 48 | 2 % | no · sí · no |
| zarza | 2025-10-01 | 3.050 | 50 | **sin precio** (ausente) | 2 % | venta · sí · no |

| Tanque | campo | bomba | capacidad | alto-alto | transmisor | aforo |
|---|---|---|---|---|---|---|
| TK-AG-CE | ceiba | P-201B | 10.000 bbl | 0,9 | LT-2012 | Certificado de aforo TK-AG-CE · tabla de 1 cm |
| TK-AG-MN | morichal | P-201B | 18.000 bbl | 0,9 | LT-2012 | … TK-AG-MN … |
| TK-AG-GU | guacamayo | P-201B | 8.000 bbl | 0,9 | LT-2012 | … TK-AG-GU … |

| Respaldo | libre | detalle |
|---|---|---|
| ceiba · P-201B | 0 bbl/d | Única bomba del tren de agua |
| morichal · P-201B | 15.100 bbl/d | P-201A en paralelo, con 15.100 bbl/d libres |
| morichal · MPP-301 | 0 bbl/d | Sin bomba en paralelo ni derivación al manifold |
| guacamayo · P-201B | 13.000 bbl/d | Pozo de disposición alterno con capacidad para todo el caudal |

Programa de paradas de arranque: **7 paradas, todas ya pasadas** respecto de AHORA (la más nueva, `PR-3016-260825`, MPP-301 de Morichal, 25-26 ago 2026). Ejemplo: `{ "id":"PR-2011-260819", "campoId":"ceiba", "equipo":"P-201B", "desde":"2026-08-19T17:49:23-05:00", "hasta":"2026-08-20T09:34:04-05:00", "motivo":"Mantenimiento preventivo programado de la bomba" }`. En el demo el programa viaja como insumo (`insumos().programa`, `configuracion.ts:161`); en producción es parte de la versión firmada.

> **Ids del programa.** Los 7 ids de arranque (`PR-2011-260819`, `PR-M2011-260217`…) no siguen la forma `PR-{campo}-{equipo}-{fecha}` que el contrato pide para los nuevos; la pantalla arma los nuevos como `PR-${campoId}-${equipo}-${AAAAMMDDhhmm}` (`Configuracion.tsx`, función `agregar`). El servidor puede asignarlos él; lo que importa es que sean **únicos** y **estables** (el id es lo que identifica una parada entre versiones).

---

## 2. La firma: borrador → diferencias → motivo → versión

### Firmar una versión (`POST /api/configuracion`)

**Qué es.** La única escritura que cambia la configuración. El cuerpo lleva la configuración **completa** propuesta, el motivo y la versión sobre la que se editó.

**Dónde se ve.** Pantalla Configuración (`#/ger/configuracion/…` y `#/adm/configuracion/…`), panel «FIRMAR LA VERSIÓN», botón «Firmar como {nombre}». Pestañas: el gerente ve «Metas de los campos» y «Usuarios y accesos»; el administrador ve «Configuración técnica», «Metas de los campos» y «Usuarios y accesos» (`Configuracion.tsx:46-48`). En la pestaña de metas el panel de firma solo aparece a quien tiene `metas:firmar`; en la técnica, a quien tiene `config:firmar` (`firmaVisible`).

**Fórmula (la secuencia que el servidor aplica, en este orden).** Es la del servidor del demo (`escrituras.ts:89-123`), que el contrato da como orden oficial (403 → 404 → 422 de campo → 403 de campo → 409 → 422):

| # | Regla | Respuesta del demo (texto exacto) | HTTP en producción |
|---|---|---|---|
| 0 | normalizar el cuerpo: `netbackUsd: null` → ausente (`normalizarConfig`) | — | — |
| 1 | hay una **persona activa** con ese rol (en producción: la del token) | «Nadie con acceso activo tiene este rol: firma, responde o exporta una persona con acceso, no un rol.» | 403 `sin-permiso` |
| 2 | `base` = versión vigente | «Mientras editaba se firmó la versión {n} ({por}). Descarte el borrador y vuelva a editar sobre ella.» | 409 `version-cambio` |
| 3 | hay al menos un cambio (`diferencias(vigente, propuesta)` no vacío) | «No hay cambios que firmar.» | 422 (código sugerido `sin-cambios`; el contrato no lo nombra) |
| 4 | si hay cambios de **metas**, tener `metas:firmar` | «Las metas, el precio y la regla de cierre los firma el gerente de activo.» | 403 `sin-capacidad` |
| 5 | si hay cambios **técnicos**, tener `config:firmar` | «Tanques, respaldos, programa y membrete los firma el administrador de la implementación.» | 403 `sin-capacidad` |
| 6 | todos los `camposTocados` (que existan en el registro) están entre los campos de la persona | «No tiene asignado {campos}: lo de ese campo lo firma quien lo tenga.» | 403 `sin-permiso` |
| 7 | `validarConfig(propuesta, vigente, desdeMinimo, ahora)` vacío | los mensajes de validación, unidos por espacio | 422 `peticion-invalida` (con la lista) |
| 8 | motivo de ≥ 5 caracteres sin los espacios de los bordes (`MOTIVO_MINIMO`) | «Falta el motivo: una meta que se mueve sin motivo no es meta.» | 422 `texto-corto` |
| 9 | guardar `Version { version: vigente+1, fecha: ahora (Colombia), por: "{nombre} · {rol en minúscula}", motivo: trim, cambios, config }` | → `{ datos: { version } }` | 200 |

donde `desdeMinimo` = primer día del mes en curso en Colombia (`${diaIso(AHORA).slice(0,8)}01`) y `ahora` = hora del servidor al firmar.

> **Orden del contrato frente al demo.** `CONTRATO.md` («Escrituras») lista la forma (422) al final y pone el motivo como regla 8 de `validarConfig`; en el demo el motivo se revisa después de `validarConfig` y «sin cambios» antes de las capacidades. El front solo muestra el mensaje, así que el orden exacto no cambia ninguna pantalla, pero sí cuál de varios errores ve la persona. Recomendación: seguir el orden de la tabla.

**Ejemplo con los datos del demo.** (Corrido contra `firmarConfiguracion` del demo, con la versión 1 vigente.) El gerente sube La Ceiba a 11.200 bbl/d desde el 15 de octubre, con máximo de diferido 700 y precio 52:

- Administrador (`adm`) firmando eso → «Las metas, el precio y la regla de cierre los firma el gerente de activo.» (403).
- Gerente con `base: 0` → «Mientras editaba se firmó la versión 1 (Hermes Leal · administrador de la implementación). Descarte el borrador y vuelva a editar sobre ella.» (409).
- Gerente con la configuración sin tocar → «No hay cambios que firmar.»
- Gerente con motivo «ok» → «Falta el motivo: una meta que se mueve sin motivo no es meta.»
- Gerente cambiando `empresa` → «Tanques, respaldos, programa y membrete los firma el administrador de la implementación.»
- Gerente con motivo «Metas acordadas en el comité de producción de octubre» y `base: 1` → versión 2:

```json
{ "version": 2, "fecha": "2026-10-02T14:00:00-05:00", "por": "Andrés Vélez · gerente de activo",
  "motivo": "Metas acordadas en el comité de producción de octubre",
  "cambios": ["La Ceiba, desde el 15 de oct de 2026: producción 10.900 → 11.200 bbl/d; máximo de diferido 800 → 700 bbl/d; precio neto 48 USD/bbl → 52 USD/bbl"],
  "config": { "…": "la configuración completa, con ceiba.metas = [tramo 2025-10-01, tramo 2026-10-15]" } }
```

- Volver a firmar con `base: 1` → «Mientras editaba se firmó la versión 2 (Andrés Vélez · gerente de activo)…» (409).
- Después de la firma: `metaEn(ceiba, 14-oct 23:00)` = tramo 2025-10-01 (10.900); `metaEn(ceiba, 15-oct 00:00)` = tramo 2026-10-15 (11.200). `configEn(versiones, 1-oct)` sigue siendo la configuración de la versión 1.

**Casos borde.**
- **Una versión que toca los dos grupos exige las dos capacidades.** Ningún rol del producto tiene ambas (gerente: `metas:firmar`; administrador: `config:firmar`): un cambio mixto se rechaza siempre. La pantalla lo evita porque cada pestaña solo edita su grupo, pero un cliente HTTP podría mandarlo.
- **Campo nuevo.** El gerente puede firmar la meta de un campo que la configuración no traía: entra como «campo nuevo» con perfil vacío (`{ gas:'no', bombas:false, electrosumergibles:false }`, `campoEditable`, `configuracion.ts:245`). La diferencia «{campo}: campo nuevo» va al grupo de **metas** (`configuracion.ts:290`), así que la firma el gerente; el perfil lo firma después el administrador.
- **Quitar un campo** va al grupo **técnico** («{campo}: se quitó el campo de la configuración (sus metas y su perfil)») y lo bloquea `validarConfig` si tenía tramos de un mes cerrado (todos los del demo: rigen desde 2025-10-01).
- **Firmas concurrentes.** El 409 por `base` es la única protección contra la carrera: el servidor tiene que hacer la comprobación y la inserción de la versión en **una transacción** (o con `unique(version)` y reintento), no leer-y-escribir sin bloqueo.
- **Un campo que no está en el registro** no se cuenta en la regla 6 (no se le puede pedir a nadie que lo tenga asignado): lo rechaza `validarConfig` con ««{id}» no es un campo registrado.» (422).

**Qué texto se muestra según el valor.** Al firmar bien, arriba de las pestañas: «✓ Firmada la **versión {n}** · «{motivo}»» con ⓘ «Desde cuándo rige: Cada cambio rige desde la fecha que lleva; desde ahí las pantallas se miden contra él.» El editor se reinicia sobre la versión nueva. Un error del servidor aparece debajo del motivo (`role="alert"`); si falta el motivo, el foco va a su caja. Mientras `validarConfig` tenga errores, el botón «Firmar como …» está deshabilitado y arriba se lista «CORRIJA ANTES DE FIRMAR» con cada mensaje. Si nadie con acceso activo tiene el rol: hueco «Nadie con acceso activo tiene este rol.» (ⓘ «No hay quién firme: Firma una persona con acceso, no un rol. Los accesos los da el gerente de activo.»).

**Quién lo calcula y por dónde viaja.** Servidor. `POST /api/configuracion { config, motivo, base }` → `{ datos: { version: Version } }` (códec `R_FIRMA`, `contrato.ts:329`; el códec pasa la configuración por `normalizarConfig`). El front corre `diferenciasPorGrupo` y `validarConfig` **antes** para avisar; **los 422 del servidor mandan**.

**Referencia.** `src/shared/api/escrituras.ts:89-123`; `CONTRATO.md` · «`POST /api/configuracion`»; `verificar-libro`, secciones 6c/8b/11/15/16 (comprobaciones de escritura).

---

### Lo que cambió entre dos versiones (`diferenciasPorGrupo` / `diferencias`)

**Qué es.** La lista, en palabras, de lo que cambia entre la configuración vigente y la propuesta, **separada por quién la firma** (metas / técnica). Es a la vez la vista previa de la firma, la regla de capacidades (qué grupos toca) y el `cambios[]` que queda guardado en la versión.

**Dónde se ve.** Panel «FIRMAR LA VERSIÓN»: «METAS, PRECIO Y PUBLICACIÓN · FIRMA EL GERENTE DE ACTIVO» y «TÉCNICA · FIRMA EL ADMINISTRADOR», con un renglón por cambio; contador «{n} cambio(s) en el borrador». Panel «VERSIONES FIRMADAS»: los `cambios` de cada versión.

**Fórmula.** Reglas (`configuracion.ts:283-347`), en este orden de salida:

| Grupo | Disparador | Texto (plantilla exacta) |
|---|---|---|
| técnica | `empresa` distinta | `Empresa del membrete: «{a}» → «{b}»` |
| metas | campo en B que no está en A | `{Campo}: campo nuevo` (y no se listan sus tramos) |
| metas | tramo de B sin tramo igual el mismo día en A | `{Campo}, desde el {d de mmm de aaaa}: {partes}` con partes, separadas por «; », solo de lo que cambió respecto del tramo del mismo día o, si no hay, del **tramo anterior** más nuevo: `producción {antes} → {nuevo} bbl/d` · `máximo de diferido {antes} → {nuevo} bbl/d` · `precio neto {antes} USD/bbl → {nuevo} USD/bbl` (o `sin configurar`) · `máximo sin causa para publicar {antes} % → {nuevo} %`. Sin tramo anterior, sin «antes →». Si nada difiere del anterior: `lo mismo que regía` |
| metas | tramo de A que no está en B | `{Campo}: se quitó la meta que regía desde el {fecha}` |
| técnica | perfil | `{Campo}: {gas A} → {gas B}` (con `NOMBRE_GAS`: «no tiene tren de gas», «gas a tea», «gas para consumo propio», «gas a venta») · `{Campo}: bombas de la línea sí → no` · `{Campo}: electrosumergibles no → sí` |
| técnica | campo en A que no está en B | `{Campo}: se quitó el campo de la configuración (sus metas y su perfil)` |
| técnica | tanque nuevo / cambiado / quitado | `{id}: tanque nuevo de {bomba} ({Campo})` · `{id}: nombre «a» → «b»` · `{id}: campo X → Y` · `{id}: bomba que lo vacía X → Y` · `{id}: capacidad 10.000 bbl → …` · `{id}: alto-alto 90 % → 85 %` · `{id}: transmisor X → Y` · `{id}: certificado de aforo cambiado` · `{id}: se quitó el tanque de {bomba} ({Campo})` |
| técnica | respaldo (clave campo+equipo) | `{equipo} de {Campo}: respaldo declarado de {n} bbl/d` · `…: respaldo libre {a} bbl/d → {b} bbl/d` · `…: qué es el respaldo, «a» → «b»` · `…: se quitó el respaldo declarado ({n} bbl/d)` |
| técnica | programa (clave `id`), comparado en **todos** sus datos | `Programa: se agregó {equipo} ({Campo}), {fecha hora} a {fecha hora} · {motivo}` · `Programa: se cambió {equipo} ({Campo}): campo …; equipo …; inicio …; fin …; motivo «a» → «b»` · `Programa: se quitó {equipo} ({Campo}) · {motivo}` |

Las cifras se escriben con `toLocaleString('es-CO', { maximumFractionDigits: 2 })` («10.900», «48,5»); `NaN` → «vacío», infinito → «fuera de rango». Las fechas de día con `formatoFecha` en `America/Bogota` («15 de oct de 2026»); las de hora, «{d de mmm de aaaa} HH:MM» en Colombia (`fechaHoraCo`, `configuracion.ts:275-278`). Las fechas del programa se comparan **como instantes** (`Date.parse`), no como texto: `…-05:00` y `…Z` del mismo instante no son cambio.

**Ejemplo con los datos del demo.** (Corrido.) Propuesta técnica sobre la versión 1: empresa «Operadora XYZ S.A.S.», El Palmar con gas a tea, alto-alto de TK-AG-CE a 0,85, respaldo de P-201B de La Ceiba a 6.000 bbl/d «P-201A alquilada en paralelo», y una parada nueva de P-201B el 20-oct de 10:00 a 18:00:

```
técnica:
  Empresa del membrete: «Operadora de demostración» → «Operadora XYZ S.A.S.»
  El Palmar: no tiene tren de gas → gas a tea
  TK-AG-CE: alto-alto 90 % → 85 %
  P-201B de La Ceiba: respaldo libre 0 bbl/d → 6.000 bbl/d
  P-201B de La Ceiba: qué es el respaldo, «Única bomba del tren de agua» → «P-201A alquilada en paralelo»
  Programa: se agregó P-201B (La Ceiba), 20 de oct de 2026 10:00 a 20 de oct de 2026 18:00 · Cambio de sello programado
```

`camposTocados` = `["ceiba","palmar"]`; `validarConfig` = sin errores.

**Casos borde.** El texto de `cambios[]` queda guardado en la versión y **no se recalcula** al leerla (el historial no se corrige). Si el servidor genera estos textos, tiene que producir exactamente estas plantillas con los formatos de número y fecha de Colombia; si prefiere guardar un diff estructurado, el front necesita igualmente el texto (`Version.cambios: string[]`).

**Quién lo calcula.** Los dos: el front para la vista previa; el servidor para decidir capacidades (regla 4-5) y para guardar `cambios`.

**Referencia.** `src/entities/configuracion.ts:280-353`.

---

### Campos que toca un cambio (`camposTocados`)

**Qué es.** El conjunto de campos (ordenado alfabéticamente) sobre los que actúa una propuesta. La capacidad dice **qué** se firma; los campos asignados, **dónde**.

**Fórmula.** Para cada id que aparezca en `campos` de A o B, o como `campoId` de un tanque, respaldo o parada de A o B, se arma la sub-configuración de ese campo (sus metas y perfil, sus tanques, respaldos y paradas, `empresa: ''`) y el campo está tocado si `diferencias(subA, subB)` no es vacío:

$$ \text{tocados}(A,B) = \{\, c \in \text{ids}(A) \cup \text{ids}(B) \;:\; \text{diferencias}(A|_c,\, B|_c) \ne \varnothing \,\} $$

Así, mover un tanque de La Ceiba a Morichal toca **los dos** campos; el membrete no toca ninguno.

**Ejemplo con los datos del demo.** Cambio de meta de La Ceiba → `["ceiba"]`. Cambio técnico del ejemplo anterior → `["ceiba","palmar"]` (la empresa no cuenta).

**Casos borde.** Un gerente con `campos: ["ceiba"]` (no el del demo, que tiene «todos») que intente firmar una meta de Morichal recibe «No tiene asignado Morichal Norte: lo de ese campo lo firma quien lo tenga.».

**Referencia.** `src/entities/configuracion.ts:355-371`; `escrituras.ts:112-116`.

---

### Validación de la configuración (`validarConfig`, los 422)

**Qué es.** Las reglas que una configuración tiene que cumplir para poder firmarse. Las corre el front para avisar y el servidor para rechazar (sus 422 mandan). Recibe la propuesta `c`, la vigente `antes`, `desdeMinimo` (primer día del mes en curso, `AAAA-MM-01`) y `ahora` (la hora de la firma, obligatoria).

**Fórmula.** Todas las reglas se evalúan y se devuelven **todos** los errores (no se corta en el primero):

| # | Regla | Mensaje exacto |
|---|---|---|
| 1 | `empresa.trim()` no vacío | `Falta el nombre de la empresa para el membrete.` |
| 2 | no se quita un campo con algún tramo `desde < desdeMinimo` | `{Campo}: no se puede quitar el campo: sus metas midieron meses que ya cerraron.` |
| 3 | cada id de `campos` está en el registro (`GET /api/campos`) | `«{id}» no es un campo registrado.` |
| 4 | cada campo tiene ≥ 1 tramo | `{Campo}: no tiene meta firmada; necesita al menos un tramo.` |
| 5 | `desde` es `AAAA-MM-DD` y un día real (no 2026-02-30) | `{Campo}: «{desde}» no es un día (AAAA-MM-DD).` |
| 6 | no hay dos tramos el mismo día | `{Campo}: hay dos tramos que empiezan el {fecha}.` |
| 7 | $0 < \text{produccionBpd} \le 10\,000\,000$ (`TOPE_BPD`) | `{Campo}: la meta de producción tiene que ser mayor que cero (y menor de 10.000.000 bbl/d).` |
| 8 | $0 \le \text{diferidoMaxBpd} \le 10\,000\,000$ | `{Campo}: el máximo de diferido no puede ser negativo ni quedar vacío.` |
| 9 | $0 \le \text{criterioSinCausa} \le 20$ | `{Campo}: el máximo sin causa para publicar va entre 0 y 20 %.` |
| 10 | precio presente ⇒ $0 \le \text{netbackUsd} \le 500$ (`TOPE_PRECIO_USD`) | `{Campo}: el precio neto va entre 0 y 500 USD/bbl.` |
| 11 | un tramo **nuevo o cambiado** (no idéntico al del mismo día en `antes`) no puede tener `desde < desdeMinimo` | `{Campo}: lo de un mes que ya cerró no se cambia (tiene que regir desde el {fecha desdeMinimo} o después).` |
| 12 | no se quita un tramo de `antes` con `desde < desdeMinimo` | `{Campo}: no se puede quitar la meta que regía desde el {fecha}: es de un mes cerrado.` |
| 13 | ids de tanque únicos | `{id}: hay dos tanques con ese código.` |
| 14 | campo del tanque registrado | `{id}: «{campoId}» no es un campo registrado.` |
| 15 | bomba del tanque no vacía; a lo sumo un tanque por (campo, bomba) | `{id}: falta la bomba que lo vacía.` · `{bomba} de {Campo}: tiene más de un tanque declarado.` |
| 16 | capacidad > 0 y finita | `{id}: la capacidad tiene que ser mayor que cero.` |
| 17 | $0{,}5 \le \text{altoAlto} \le 0{,}98$ | `{id}: el alto-alto va entre 50 y 98 %.` |
| 18 | transmisor de nivel no vacío | `{id}: falta el transmisor de nivel.` |
| 19 | un respaldo por (campo, equipo) | `{equipo} de {Campo}: tiene dos respaldos declarados.` |
| 20 | $0 \le \text{libreBpd} \le 10\,000\,000$ | `{equipo} de {Campo}: la capacidad libre del respaldo no puede ser negativa ni quedar vacía.` |
| 21 | ids del programa únicos | `Programa {equipo}: hay dos paradas con el código {id}.` |
| 22 | campo de la parada registrado | `Programa {equipo}: «{campoId}» no es un campo registrado.` |
| 23 | `desde` y `hasta` son fechas y `desde < hasta` | `Programa {equipo}: el fin tiene que ser después del inicio.` |
| 24 | motivo de la parada ≥ 5 caracteres | `Programa {equipo}: falta el motivo.` |
| 25 | una parada que **ya empezó** (`antes.desde < ahora`) no cambia campo, equipo, desde ni hasta (el motivo sí puede cambiar) | `Programa {equipo}: la parada ya empezó ({fecha hora}); su equipo, su campo y sus fechas no se cambian.` |
| 26 | una parada **nueva o movida** tiene que empezar después de `ahora` | `Programa {equipo}: una parada solo se programa antes de que empiece; la que ya empezó no se vuelve programada.` |
| 27 | no se quita una parada que ya empezó | `Programa {equipo}: no se puede quitar una parada que ya empezó ({fecha}): pasó como programada.` |

(El motivo de la firma, ≥ 5 caracteres, no está en `validarConfig`: lo revisa la escritura, ver la tabla de la firma.)

**Ejemplo con los datos del demo.** (Corrido con `desdeMinimo = 2026-10-01` y `ahora = AHORA`.) Una propuesta deliberadamente mala sobre la versión 1 (empresa en blanco; tramo de La Ceiba del 15-sep con producción 0, diferido −1, sin causa 25 %, precio 600; Morichal sin tramos; un campo «nuevo» no registrado; un segundo TK-AG-CE con capacidad 0, alto-alto 0,99 y sin transmisor; un segundo respaldo de P-201B de La Ceiba con −5; la parada LC-19 de enero alargada 1 h; una parada nueva de P-201B del 1-oct 08:00 a 07:00 con motivo «ok») devuelve exactamente:

```
Falta el nombre de la empresa para el membrete.
La Ceiba: la meta de producción tiene que ser mayor que cero (y menor de 10.000.000 bbl/d).
La Ceiba: el máximo de diferido no puede ser negativo ni quedar vacío.
La Ceiba: el máximo sin causa para publicar va entre 0 y 20 %.
La Ceiba: el precio neto va entre 0 y 500 USD/bbl.
La Ceiba: lo de un mes que ya cerró no se cambia (tiene que regir desde el 1 de oct de 2026 o después).
Morichal Norte: no tiene meta firmada; necesita al menos un tramo.
Morichal Norte: no se puede quitar la meta que regía desde el 1 de oct de 2025: es de un mes cerrado.
«nuevo» no es un campo registrado.
TK-AG-CE: hay dos tanques con ese código.
P-201B de La Ceiba: tiene más de un tanque declarado.
TK-AG-CE: la capacidad tiene que ser mayor que cero.
TK-AG-CE: el alto-alto va entre 50 y 98 %.
TK-AG-CE: falta el transmisor de nivel.
P-201B de La Ceiba: tiene dos respaldos declarados.
P-201B de La Ceiba: la capacidad libre del respaldo no puede ser negativa ni quedar vacía.
Programa LC-19: la parada ya empezó (22 de ene de 2026 23:51); su equipo, su campo y sus fechas no se cambian.
Programa P-201B: el fin tiene que ser después del inicio.
Programa P-201B: falta el motivo.
Programa P-201B: una parada solo se programa antes de que empiece; la que ya empezó no se vuelve programada.
```

Otros dos casos corridos: quitar La Zarza → `La Zarza: no se puede quitar el campo: sus metas midieron meses que ya cerraron.`; quitar la parada `PR-2011-260819` → `Programa P-201B: no se puede quitar una parada que ya empezó (19 de ago de 2026): pasó como programada.`

**Casos borde.**
- **Inmutable hacia atrás.** Metas y programa no se reescriben antes del mes en curso / antes de ahora: es lo que mantiene los folios ya emitidos (5D.4) cuadrando. El tramo del 1-oct de un mes en curso **sí** puede cambiar (ese mes no ha cerrado) y el libro de octubre se rehace con lo nuevo: es la regla del producto («Lo que va del mes se medirá con lo nuevo»).
- **Lo que pasa del lado de la pantalla y no del servidor.** La pantalla limita las cajas (capacidad 100–500.000 bbl, alto-alto 50–98 %, libre 0 – 2 × capacidad nominal de la bomba, `Configuracion.tsx`, componente `Numero`); el servidor solo exige las reglas de la tabla (capacidad > 0, libre 0–10.000.000). Son avisos de pantalla, no reglas de firma.
- **«Mes cerrado» del servidor**: el primer día del mes en curso según **su** reloj en Colombia. Un servidor en UTC que use su fecha local aceptaría entre las 19:00 y las 24:00 del último día del mes un tramo del mes siguiente como si fuera «en curso» del mes anterior… o al revés: siempre calcular `desdeMinimo` en `America/Bogota`.
- `NaN`, `Infinity`, `null` en una cifra numérica obligatoria fallan las reglas 7-9 y 16-17 (las comparaciones con `NaN` dan falso). En JSON no viajan `NaN` ni `Infinity`; un `null` en `produccionBpd` debe dar 422, no 500.

**Quién lo calcula.** Los dos; los 422 del servidor mandan.

**Referencia.** `src/entities/configuracion.ts:373-461`; `CONTRATO.md` · «`POST /api/configuracion`», reglas 1-8.

---

## 3. Leer la configuración vigente y la que regía

### Meta, precio, regla de cierre y perfil vigentes (`metaEn`, `precioEn`, `criterioEn`, `perfilDe`, `configEn`)

**Qué es.** Las funciones que dicen qué regía para un campo en un instante. Las usa todo el motor.

**Fórmula.**

$$ \text{metaEn}(c, \text{campo}, t) = \text{el último tramo } x \text{ de } c.\text{campos[campo].metas con } x.\text{desde} \le \text{diaCo}(t) $$

(comparación de textos `AAAA-MM-DD`, que ordena igual que las fechas). `precioEn` = `netbackUsd` de ese tramo si es número; `criterioEn` = su `criterioSinCausa`. `perfilDe(c, campo)` = el perfil firmado o, si el campo no está, `{ gas:'no', bombas:false, electrosumergibles:false }`. `configEn(versiones, t)` = la `config` de la última versión con `fecha ≤ t` (las versiones van de la más vieja a la vigente; antes de la primera, la primera).

**Ejemplo con los datos del demo.** `metaEn(v1, 'ceiba', AHORA)` = `{ desde:"2025-10-01", produccionBpd:10900, diferidoMaxBpd:800, netbackUsd:48, criterioSinCausa:2 }`; `precioEn(v1,'zarza',AHORA)` = `undefined` (La Zarza no tiene precio); `criterioEn` = 2 en los cinco campos; `perfilDe(v1,'palmar')` = `{ gas:"no", bombas:true, electrosumergibles:false }`.

**Casos borde («sin meta firmada»).**
- Campo que la configuración vigente no trae, o trae sin tramos, o día anterior a su primer tramo: `metaEn` devuelve nada → **sin meta firmada**: el libro no le suma meta (`meta.sinMeta`, `porCampo[].sinMeta`), no lo valoriza (`sinPrecio`), no se publica (motivo `sin-meta`), el día a día da `meta: null`. Nunca se rellena con la semilla del demo ni con 0 (un 0 daría «cumplimiento 0 %»).
- Sin perfil firmado: el campo no tiene ninguna familia; la aplicación dice que falta el perfil (`tienePerfil`).
- **Precio `null`**: en JSON el precio sin configurar viaja `null` y `normalizarConfig` lo vuelve ausente; jamás vale 0 (`CONTRATO.md` · «Reglas del cable»). Corrido: un tramo con `"netbackUsd": null` sale como `{"desde":"2025-10-01","produccionBpd":3050,"diferidoMaxBpd":50,"criterioSinCausa":2}`.

**Quién lo calcula.** Los dos (`CONTRATO.md` · «Quién calcula qué»: «la meta o el perfil vigente de un campo… `perfilDe`, `metaEn`, `metaEntre`, `criterioEn`, `tanqueDe`»).

**Referencia.** `src/entities/configuracion.ts:179-240`.

---

### Meta global y total del mes (`metaEntre`)

**Qué es.** La meta global **es la suma** de las metas de los campos (en bbl/d porque los barriles se suman y los porcentajes no); nunca se guarda aparte. El total de un período es la integral día a día de la meta que rige cada día.

**Dónde se ve.** Configuración → Metas: fila «Meta global» («suma de {n} campos · pueden dar ≈ {Σ potencial} bbl/d») y la línea «Total de {mes} de {año}: producción {x} bbl · máx. diferido {y} bbl» con ⓘ «Total del mes». Plan mes a mes: columna «Total del mes, bbl».

**Fórmula.**

$$ \text{MetaGlobal}(t) = \sum_{c} \text{metaEn}(c, t).\text{produccionBpd} $$

$$ \text{Meta}_{c}[a,b) = \sum_{d \in \text{días}[a,b)} \text{metaEn}(c,d).\text{produccionBpd} \cdot \frac{h_d}{24}, \qquad h_d = \frac{\min(b, d+D) - \max(a, d)}{1\,\text{h}} $$

| símbolo | significado | unidad | de dónde sale |
|---|---|---|---|
| $d$ | inicio de cada día de Colombia desde inicioDía($a$) | ms | `inicioDiaCo` |
| $h_d$ | horas de ese día dentro de $[a,b)$ | h | recorte a los bordes |
| metaEn | tramo que rige ese día | bbl/d | configuración firmada |

Igual para `diferidoMaxBpd`. Si **algún** día del intervalo no tiene tramo, `sinMeta = true` y ese día no suma (la pantalla no da total).

**Ejemplo con los datos del demo.** (Corrido.) Meta global vigente: 10.900 + 16.700 + 6.300 + 3.250 + 3.050 = **40.200 bbl/d** de producción y 800 + 950 + 450 + 50 + 50 = **2.300 bbl/d** de máximo de diferido. Potencial promedio de 30 días (`/vistas/potencial-reciente`): La Ceiba 11.534,37; Morichal 17.329,84; Guacamayo 6.866,56; El Palmar 3.352,59; La Zarza 3.170,41 → «pueden dar ≈ 42.254 bbl/d». Total de octubre de 2026 de La Ceiba con la versión 1: `metaEntre` = 337.900 bbl de producción (10.900 × 31) y 24.800 bbl de diferido (800 × 31). Con el cambio a 11.200/700 desde el 15-oct: 343.000 bbl (14 × 10.900 + 17 × 11.200) y 23.100 bbl (14 × 800 + 17 × 700); el renglón diría «· con cambio de meta» y el ⓘ «La suma de los 31 días, cada uno con la meta que rige ese día. Del 1 al 14, lo que regía; desde el 15, lo nuevo.».

**Casos borde.** Mes en curso: el total de la pantalla es del **mes completo** (planeado), no hasta hoy. El del libro (`meta.produccion` de `/vistas/diferidos`) sí va hasta `hasta` del período. Días incompletos (un período que empieza o termina a mitad de día): se prorratean por horas.

**Qué texto se muestra según el valor.** Cifras con `n0` (sin decimales, miles con punto). Con algún campo sin meta: la fila global dice «sin meta firmada» en lugar de la suma, la línea del mes «sin total: sin meta firmada en algún campo», y el subtítulo «· {n} sin meta firmada».

**Quién lo calcula.** El total del mes de la pantalla de metas lo calcula el front sobre la propuesta (es una vista previa). El del libro, el servidor.

**Referencia.** `src/entities/libro.ts:574-591`; `src/widgets/configuracion/Metas.tsx:45-60, 144-166`.

---

### Avisos de metas que no cuadran (pantalla de metas)

**Qué es.** Avisos (no bloqueos) junto a la tabla de metas cuando las cifras no son coherentes con lo que los pozos pueden dar.

**Fórmula.** Con $P$ = potencial promedio de 30 días del campo (`/vistas/potencial-reciente`), $M$ = meta de producción propuesta, $X$ = máximo de diferido propuesto, y solo si $P > 0$ y las dos cifras son números:

$$ M > P \;\Rightarrow\; \text{«no se alcanza ni sin diferido»} $$

$$ X > P - M + \max(50,\ 0{,}02\,P) \;\Rightarrow\; \text{«las dos metas no cuadran»} $$

Además, si el gerente edita un campo que ya tiene un tramo firmado **posterior** al día escogido: «{Campo}: rige solo hasta el {fecha}» (ⓘ «Ya hay una meta firmada desde el {fecha}; lo que cambie ahora rige solo hasta ese día.»).

**Ejemplo con los datos del demo.** Con las metas vigentes ningún campo dispara aviso (La Ceiba: $X = 800$ contra $11.534{,}37 - 10.900 + \max(50; 230{,}69) = 865{,}06$). Si el gerente escribiera 11.600 bbl/d en La Ceiba, saldría «La Ceiba: no se alcanza ni sin diferido (pueden dar ≈ 11.534 bbl/d)» con ⓘ «La meta pide 11.600 bbl/d y los pozos hoy pueden dar ≈ 11.534 bbl/d.».

**Qué texto se muestra según el valor.** Cada aviso con la marca P3 ■ (amarillo, `FueraDeMeta`) y su ⓘ «Detalle». Texto del segundo aviso: «{Campo}: las dos metas no cuadran (daría ≈ {P−X} bbl/d)» y ⓘ «Con los {X} bbl/d de diferido que acepta, el campo daría ≈ {P−X} bbl/d, menos que su meta de {M} bbl/d.».

**Quién lo calcula.** Front, con el potencial que da el servidor.

**Referencia.** `src/widgets/configuracion/Metas.tsx:62-79`.

---

## 4. Lo que ve cada rol en la pantalla de configuración

### «Desde cuándo rige» (meta vigente)

**Qué es.** Una sola fecha para toda la firma de metas: los tramos editados se crean con ese `desde` (`conTramo`, que reemplaza un tramo del mismo día si lo había).

**Fórmula.** Por defecto, **hoy** en Colombia (`diaCo(AHORA)` = `2026-10-02` en el demo). Mínimo: `desdeMinimo` (`2026-10-01`). Texto al lado:

| Caso | Texto |
|---|---|
| desde = hoy | «Incluye 1 día ya corrido (hoy)» |
| desde < hoy (y ≥ mínimo) | «Incluye {n+1} días ya corridos» (p. ej. 1-oct → «Incluye 2 días ya corridos») |
| desde > hoy | «Empieza en {n} día(s)» (p. ej. 15-oct → «Empieza en 13 días») |
| desde < mínimo | alerta «Esa fecha es de un mes cerrado: escoja el 1 de oct de 2026 o después.» |

ⓘ «Desde cuándo rige»: «Lo que va del mes se medirá con lo nuevo. Una sola fecha para toda la firma. No puede ser antes del 1 de oct de 2026: lo de un mes cerrado no se reescribe.» (o «Hasta entonces rige lo que está firmado.» si la fecha es futura).

**Quién lo ve.** Solo quien tiene `metas:firmar`. Quien no firma ve «Solo lectura: los fija y firma el gerente de activo.» y las cifras **vigentes hoy**.

**Referencia.** `src/pages/Configuracion.tsx:254-282`.

### Tabla «METAS POR CAMPO» y panel «PRECIO Y PUBLICACIÓN»

Columnas «Producción, bbl/d» y «Máx. de diferido, bbl/d» (paso 50 en la caja); debajo de cada campo «pueden dar ≈ {P} bbl/d» o, si se cambió, «antes {M} · máx. {X} bbl/d»; el globo del nombre del campo dice «Rige desde {fecha}» o «Lo de antes, desde» / «Lo nuevo, desde». Una caja vacía (campo sin meta firmada) sale vacía, nunca con la semilla; si quien firma la deja vacía o en cero: borde grueso y «Tiene que ser mayor que 0.» / «Tiene que ser 0 o más.».

«PRECIO Y PUBLICACIÓN»: «Precio neto, USD/bbl» (vacío = «sin precio», paso 0,5) y «Máx. % sin causa» (0–20, paso 0,5); al cambiar, «antes {precio} USD/bbl · {criterio} %» o «antes sin meta firmada». Con «Plan mes a mes» el precio va en cada mes (5D.2 §5).

### «PERFIL DEL CAMPO» (pestaña técnica)

Selector «Destino principal del gas» (No tiene tren de gas / Gas a tea / Gas para consumo propio / Gas a venta) y dos casillas («Bombas de la línea» con «{n} bombas registradas»; «Electrosumergibles» con «{n} pozos registrados»). Avisos P3 ■ cuando el perfil no cuadra con el registro:

| Condición | Aviso | ⓘ «Qué pasa» |
|---|---|---|
| gas = no y el esquema tiene elementos de gas | «{n} elemento(s) del tren de gas no se dibuja(n)» | «El esquema los tiene, pero no se dibujan mientras el campo diga que no tiene gas.» |
| gas ≠ no y el esquema no tiene tren de gas | «Sin elementos en el tren de gas del esquema» | «Regístrelos en «Esquema de planta», al final de esta pestaña.» |
| ESP apagada y hay pozos con ESP | «Los {n} pozos con electrosumergible dejan de vigilarse» | «No saldrán sus avisos ni sus predicciones; lo que pierdan se sigue contando en el libro.» |
| ESP encendida y no hay pozos con ESP | «No hay pozos con electrosumergible registrados» | «La subpantalla saldrá vacía hasta que se registren.» |
| bombas apagadas y hay bombas | «{ids} dejan de vigilarse» | (igual que ESP) |
| bombas encendidas y no hay | «No hay bombas de la línea registradas» | «La subpantalla saldrá vacía…» |

**Regla de negocio que el servidor debe aplicar:** una familia apagada **sale de la vigilancia** (el servidor no devuelve sus riesgos, predicciones ni mensajes de parada), pero **lo que esos equipos hacen perder se sigue contando** en el libro (lo dice el controlador del pozo). Ver «Perfil sin gas» en 5D.7.

### «MEMBRETE DEL INFORME», «TANQUES DE AGUA», «RESPALDO DE BOMBAS», «PARADAS PROGRAMADAS», «NO SE CONFIGURA»

- **Membrete:** «Nombre de la empresa» (todos los campos).
- **Tanques:** por tanque del campo, «{id} · lo vacía {bomba} · nivel ahora {n1(pct)} %» (o «sin lectura» si `/vistas/campos/:campo/ahora` no trae el tanque), cajas Capacidad (bbl), Alto-alto (%: se muestra `altoAlto × 100` redondeado a 0,1 y se guarda `/100`), Transmisor de nivel, Certificado de aforo. Sin tanque: «Sin tanque de agua configurado.» con ⓘ «{Campo} no tiene tanque de agua configurado: su bomba no cierra pozos por nivel.».
- **Respaldo:** una fila por bomba **con perfil** del campo: «{id} · {papel} · capacidad {n0} bbl/d · pozos …», cajas «Capacidad libre (bbl/d)» y «Qué es el respaldo». Una bomba sin respaldo declarado vale 0 libre (al escribir, se crea con `detalle: 'Declarado en la configuración'`). Sin bombas con perfil: «Ninguna bomba con perfil: no hay respaldo que declarar.».
- **Paradas programadas:** lista de la más nueva a la más vieja, cinco visibles y «ver N más»; la papelera está deshabilitada en las que ya empezaron («Ya empezó: no se puede quitar del programa»). Formulario: equipo (equipos instrumentados del registro + pozos del campo), Desde y Hasta (`datetime-local`, mínimo = ahora en Colombia, se guardan como `…:00-05:00`), Motivo (≥ 5). Texto: «Es el programa de paradas aprobado. Una parada que esté aquí cuenta como programada, no como falla. Por eso se aprueba con firma y antes de que empiece: una falla no se puede volver programada después, ni una parada programada quitarse cuando ya pasó.»
- **No se configura** (sale de los equipos): Producción («{fuente} · corte de agua: analizador/laboratorio»), Estado de pozos (variadores / controladores de bombeo / válvulas de cabeza), Pruebas de pozo (con separador / estimadas desde la electrosumergible / sin prueba), Nivel de tanques, Paradas de bombas («PLC · primera alarma (first-out)»), Límites de electrosumergibles (si el perfil las tiene), Banda de asignación. Botón «Ver conectores y tags» solo para quien tiene la pantalla Conectores.

### «VERSIONES FIRMADAS»

La vigente primero con chip «vigente»; por versión: «Versión {n}» · `fechaHora(fecha)` · `por`; «{motivo}»; la lista de `cambios`. Cinco visibles y «ver N más»; en el papel salen todas. Contador = número de versiones. Fuente: `GET /api/configuracion/historial` (la última es la vigente).

---

## 5. Plan mes a mes (leer el presupuesto pegado)

### Cargar el presupuesto (`leerPlan`)

**Qué es.** El presupuesto anual de la empresa entra como **tramos que empiezan el día 1 de cada mes** (`conMes`, que reemplaza cualquier tramo que empezara dentro de ese mes). Se firma con el mismo `POST /api/configuracion`. La pantalla lo recibe pegado desde Excel o subido como CSV, con la plantilla `Mes;Campo;Producción bbl/d;Máximo de diferido bbl/d;Precio neto USD/bbl (opcional)`.

**Dónde se ve.** Configuración → Metas → «Plan mes a mes»: panel «CARGAR EL PRESUPUESTO» (solo con `metas:firmar`) y tabla «PLAN MES A MES» (todos los que ven Configuración). La pantalla abre en modo plan si ya hay ≥ 2 tramos del día 1 desde el mes en curso en algún campo.

**Fórmula (reglas de lectura, `plan.ts:150-202`).**

1. **Separador:** tabulador si alguna línea lo trae (lo que copia Excel); si no, `;` si alguna lo trae; si no, `,`. Se quita el BOM; las líneas vacías se saltan pero **cuentan** para el número de fila de los mensajes.
2. **Cabecera:** la primera línea no vacía se salta solo si su columna 1 no es un mes **y** su columna 3 no es un número.
3. **Mes** (`leerMes`, sin tildes ni mayúsculas, quitando comillas, « de » y una hora final): `2026-11`, `2026-11-01`, `2026-11-01 00:00:00`, `11/2026` (también con `.` o `-`), `1/11/2026` (día/mes/año), `nov 2026`, `nov-26`, `noviembre de 2026`, `sept`/`set` y el número de serie de Excel de 5 dígitos (días desde 1899-12-30). Año entre 2000 y 2100; el nombre del mes tiene que ser el comienzo de un mes de ≥ 3 letras (`junk` no es junio).
4. **Columnas:** más de 5 → error.
5. **Coma ambigua** (solo con `,` como separador, desde la 3.ª columna): un par sin comillas «1-3 dígitos» seguido de «exactamente 3 dígitos» puede ser un número con miles partido. Es **error** salvo que la fila traiga alguna cifra de 4 o más dígitos sin separador ni comillas (prueba de que quien escribe no agrupa miles); en ese caso se lee como dos columnas y se **avisa**.
6. **Tope:** mes > mes en curso + 24 meses → error.
7. **Campo** por nombre o id, sin tildes ni mayúsculas; tiene que ser de los campos de quien carga.
8. **Mes cerrado:** mes < mes en curso → error.
9. **Números** (`leerNumero`): con `.` y `,` a la vez, el **último** es el decimal («1.234,5», «11,200.5»); solo separadores de miles «10.900», «10,900», «1.234.567» (patrón `^-?[1-9]\d{0,2}([.,]\d{3})+$`; un 0 adelante es decimal: «0,125»); si no, la coma es decimal. El **precio nunca lleva miles** (`miles:false`): «48,125» = 48,125 USD/bbl.
10. Producción > 0; diferido ≥ 0 si viene; precio 0–500 si viene.
11. **Unidad:** con «bbl del mes», cada cifra se divide por los días del mes. Producción y diferido se redondean a 0,01 bbl/d.
12. **Repetidos** (mismo mes y campo): vale la **última** fila y se reporta un error informativo.

**Ejemplo con los datos del demo.** (Corrido con `desdeMes: "2026-10"` y los cinco campos permitidos.)

| Entrada | Resultado |
|---|---|
| `Mes;Campo;…` + `2026-11;La Ceiba;11.200;750;48,5` + `12/2026;Morichal Norte;16700;900;` + `enero de 2027;guacamayo;6.400,5;400;50` | 3 filas: ceiba 2026-11 11.200/750/48,5; morichal 2026-12 16.700/900/sin precio; guacamayo 2027-01 6.400,5/400/50 |
| `2026-11\tLa Ceiba\t11200\t750\t48` | 1 fila, 11.200/750/48 |
| `2026-11,La Ceiba,9000,500,100` | 1 fila 9.000/500/100 + aviso «Fila 1: «500,100» se leyó como dos columnas. Si era un solo número con miles, escríbalo entre comillas ("500,100") o separe las columnas con punto y coma.» |
| `2026-11,La Ceiba,11,200,700` | error «Fila 1: «11,200» puede ser un número con miles o dos columnas. Escriba el número entre comillas ("11,200"), sin separador de miles, o separe las columnas con punto y coma.» |
| `2026-11,La Ceiba,"11,200",700,48` | 1 fila 11.200/700/48 |
| `2026-09;La Ceiba;…` | «Fila 1: septiembre de 2026 ya cerró; su meta no se reescribe.» |
| `2029-01;La Ceiba;…` | «Fila 1: enero de 2029 está a más de dos años; revise el año.» |
| `2026-11;La Ceiba;11200;750;48,125` | precio 48,125 |
| `…;600` (precio) | «Fila 1: el precio neto va entre 0 y 500 USD/bbl («600»).» |
| `nov-26;Zarza;0;10;` | «Fila 1: la producción tiene que ser mayor que cero.» |
| `46327;La Ceiba;347200;23250;` con «bbl del mes» | mes 2026-11; 347.200 / 30 = **11.573,33** bbl/d; 23.250 / 30 = **775** bbl/d |
| dos filas 2026-11 de La Ceiba (11.200 y 11.300) | queda 11.300 + «Fila 2: repite noviembre de 2026 de La Ceiba (fila 1); vale la última.» |
| `2026-11;Otro;…` | «Fila 1: «Otro» no es un campo.» |
| campo no permitido | «Fila 1: no tiene asignado ese campo.» |

`leerNumero` corrido: «10.900» → 10900 (precio: 10,9); «10,900» → 10900 (precio: 10,9); «1.234,5» → 1234,5; «11,200.5» → 11200,5; «0,125» → 0,125; «48,125» → 48125 (precio: 48,125); «abc» → malo; «» → sin dato.

**Aviso «N veces la meta de hoy».** Después de revisar, por cada fila: $r = \text{produccionBpd}_{fila} / \text{produccionBpd}_{hoy}$ (la que regiría ese mes sin el plan). Si $r \ge 15$ o $r \le 1/15$: «{Campo}, {mes de año}: {n0(cifra)} bbl/d es {n0(r)} veces la meta de hoy ({n0(hoy)} bbl/d). ¿Las cifras son del mes y no bbl/d?» (o «la {n0(1/r)}ª parte de», y «¿Las cifras son bbl/d y no del mes?» si se escogió «bbl del mes»). Ejemplo: 347.200 leído como bbl/d contra 10.900 → $r = 31{,}85$ → «La Ceiba, noviembre de 2026: 347.200 bbl/d es 32 veces la meta de hoy (10.900 bbl/d). ¿Las cifras son del mes y no bbl/d?». Se muestran hasta 6 y «y {n} cifras más así.». Avisa, no bloquea.

**Plantilla (`plantillaPlan`).** Corrida: `﻿Mes;Campo;Producción bbl/d;Máximo de diferido bbl/d;Precio neto USD/bbl (opcional)\r\n2026-10;La Ceiba;10900;800;48\r\n2026-10;La Zarza;3050;50;` (BOM, CRLF, cifras sin agrupar con coma decimal, 12 meses × campos desde el mes en curso, con lo que rige hoy).

**Casos borde.**
- Lo cargado **pasa al borrador**; nada rige hasta firmar. Texto: «{n} filas pasaron al borrador; {m} filas con error no se pasaron. Revise y firme abajo.».
- «El plan se acaba»: con ≥ 3 meses propios y el último a ≤ 1 mes del en curso: «El plan llega hasta {mes de año}: falta el presupuesto siguiente.» (ⓘ «Cárguelo antes de que se acabe. Después de ese mes sigue rigiendo su última cifra.»).
- Un mes sin cifra propia «hereda» (se ve tenue): sigue rigiendo el tramo anterior.
- Las mismas reglas de `validarConfig` aplican al firmar.

**Quién lo calcula.** Front lee y arma la propuesta; el servidor solo recibe la configuración y aplica `validarConfig`. `CONTRATO.md` pone `plan.leerPlan` en «Los dos» (por si el servidor ofrece la carga directa del archivo).

**Referencia.** `src/entities/plan.ts`; `src/widgets/configuracion/PlanMensual.tsx:151-245`; `src/entities/configuracion.ts:250-258` (`conMes`).

---

## 6. Lo que el servidor guarda

| Tabla | Clave | Contenido | Regla |
|---|---|---|---|
| `version_config` | `version` (entero consecutivo desde 1) | `fecha` (Colombia), `por` (de la sesión), `motivo`, `cambios[]`, `config` completa (JSON o normalizada en tramos, tanques, respaldos, programa) | nunca se actualiza ni se borra; la 1 es la firma de arranque de la implementación |

- `GET /api/configuracion/historial` → `Version[]` de la más vieja a la vigente (todas; la configuración es de la empresa, no se filtra por campo).
- `GET /api/configuracion` (opcional) → la vigente.
- **Toda vista calculada** usa la versión vigente, salvo donde el contrato dice «la que regía» (los mensajes de WhatsApp usan `configEn` a la hora de cada mensaje, 5D.5). Las metas, el precio y la regla de cierre son tramos con fecha, así que la vigente ya contiene la historia correcta de esos tres.
