# P1 · Plan de producto: árbol de paradas ANH (Circular 024), choke, pérdidas, conversión de árboles, métricas modulares, programa del técnico y colores

> **Nota del 21-oct-2026 (v2 del plan):** el norte de TRIM es bajar las paradas no planificadas de los equipos críticos; el cumplimiento ANH es valor agregado. Las fases y prioridades de este documento quedan reemplazadas por `PLAN-MAESTRO.md` §5. El modelo, las reglas y el diseño siguen vigentes.


Arquitecto de producto · 21-oct-2026 · Sigue `docs/plan-circular-24/CONTEXTO.md`. Construye sobre R1 (normativa), R2 (choke y pérdidas), R3 (métricas) y R4 (auditoría). No se tocó código.

> **Dueño del vocabulario.** §1 fija los nombres (entidades, campos, enums y sus valores exactos) que usan este plan, U1 (`U1-experiencia.md`) y el código futuro. Un cambio a §1 después de esta primera escritura se anota en «Cambios al vocabulario», con fecha y hora.

Convenciones de cita: «C24 p.N» = Circular ANH 0024 del 09-09-2026, página N; «Schema» = `investigacion/fuentes/20260731_Esquema_JSON_V3.1_ANH.json`; «Dicc.» = `investigacion/fuentes/20260820_Dicionario_de_Datos_JSON_V3.2_ANH.xlsx`, hoja `JSONV3`, fila N; R1 §x, R2 §x, R3 §x, R4 §x = los informes de la ronda 1. **NO VERIFICADO** = no se pudo comprobar y se dice por qué. **Provisional** = decisión reversible que depende de la ANH o de Edinson.

## Índice
- §0 Resumen
- §1 Vocabulario y modelo
- §2 Reglas de negocio
- §3 Resolución de los desacuerdos de la ronda 1
- §4 Salida regulatoria
- §5 Contrato con el backend
- §6 Plan por fases
- §7 Actualización del documento backend
- §8 Preguntas para Edinson y para la ANH
- §9 Riesgos
- Respuestas a UX
- Cambios al vocabulario
- Desacuerdos con otros agentes
- Anexo A · Los 117 códigos internos de N2

## §0 Resumen
1. **El modelo** (§1): la clasificación ANH (`ClasificacionAnh`, 6 pasos + `cau_gral_paro` + `desc_evid`) vive **al lado** de `Causa`/`TipoCausa`, en un tramo nuevo `ParadaAnh` (pozo × día operacional × causa). Nada del libro ni de los 122 casos de `referencia/` cambia de significado. La coherencia planeada/N1 está bloqueada en el tipo.
2. **Catálogo como datos**: código interno estable (`ClaveN1`, 117 `CodigoN2` del Anexo A) y dos formas de salida oficiales que se contradicen (circular: clave y `EXPORTACION`; Diccionario V3.2: texto y `EXPORTACIÓN`). Por defecto la circular; se cambia con una línea firmada y se prueba con el ambiente API 1-C1 antes del 1-dic (§3.5).
3. **Propuesta automática** (§2.1): `REGLAS_ANH` lleva cada causa de TRIM a los 6 pasos; el choke sale de la topología (dedicado = pozo, compartido = planta, criterio de Edinson). Pregunta a una persona solo lo que la señal no decide (externos, clima, orden público, reservorio, el N2 de energía y de bombeo mecánico). Nada sale como confirmado si nadie lo miró (origen `C`).
4. **Pérdidas** (`EventoPerdida`) separadas de la diferida; con parada, la parada queda `DIFERIDA` y el volumen va al balance (provisional, pregunta crítica 1). **Diferida ANH** por pozo y día al lado de la de TRIM, con una explicación que suma exacto (§2.5).
5. **Conversión del árbol de la operadora** (§1.10, §2.3): hoja (con herencia por subárbol) → pareja ANH, `segun-programa` o `precisar`; versionada, validada y firmada por `reg`; el choke y el impacto nunca van en la tabla.
6. **Salida** (§4): TRIM emite `paradas_pozo` completo (y un fragmento de `produccion_por_pozo`); valida con el Schema oficial más 15 reglas propias; corrección en 1 h como envío nuevo. Hallazgo: `metadatos_archivo` no tiene dónde poner el número ni el motivo de la corrección.
7. **Fases** (§6), ajustadas a la capacidad real (≈ 12,6 persona-semanas hasta el 26-nov, sin backend real ni operadora piloto): el 1-dic es obligación **de la operadora**; si al 31-oct no hay operadora firmada, la meta del 1-dic es un **generador de `paradas_pozo` validado con datos `DEMO-`**. Antes del 1-dic solo lo que toca el archivo (F1-F2); diferida ANH, pérdidas completas, WhatsApp, vistas del gerente y conversión pasan a F3; métricas con logística y programa del técnico en F4; SAP y canal ANH en F5. El piloto del equipo (Adair: vigía y colores) es distinto del piloto regulatorio.

## §1 Vocabulario y modelo

### 1.0 Cinco principios que gobiernan todo el modelo
1. **Al lado, nunca encima.** La clasificación ANH vive junto a `Causa` y `TipoCausa` (`src/entities/causa-senal.ts`), no los reemplaza. `TipoCausa`, `TIPO_CAUSA`, `ALTO_IMPACTO`, el libro (`libro.ts`) y sus 122 casos de `referencia/` no cambian de significado (R4 §7.3: tocar `TipoCausa` rompe 19 casos y ~31 archivos; tocar el método del diferido, ≈ 94 casos).
2. **Código interno estable, salida por versión.** Ningún dato guarda la cadena que viaja a la ANH. Se guarda un código interno; la cadena sale de una **forma de salida** ligada a una versión del catálogo (R1 R-1, R2 §3.0). Hay al menos dos versiones oficiales que se contradicen: la Tabla 1 de la circular (C24 p.6-7) y el Diccionario V3.2 (Dicc. 133-141).
3. **Cada dato con su procedencia.** Todo campo de la clasificación lleva quién o qué lo puso (señal, regla, tabla de conversión, programa, persona), cuándo, y con qué versión de regla o tabla. De ahí sale el «Origen» A/M/C de la tupla (C24 p.2).
4. **Dos vistas, un solo evento.** La vista de gestión (TRIM: equipo, parte, `TipoCausa`) y la regulatoria (ANH: los 6 pasos) salen del **mismo** tramo de parada, nunca de dos capturas (R2 §6.4).
5. **Nada se inventa.** Lo que la señal no decide se pregunta con opciones cerradas; lo que no se resuelve se muestra como pendiente, nunca se rellena con un comodín (R2 §3.3 fila `pendiente`; R1 R-12).

### 1.1 Mapa de entidades nuevas (y dónde viven)

| Entidad (nombre del código) | Qué es | Archivo propuesto (nuevo salvo que se diga) | Lo escribe |
|---|---|---|---|
| `VersionCatalogoAnh`, `FormaSalidaAnh` | El catálogo regulatorio versionado y cómo se escribe cada valor en el JSON | `src/entities/anh-catalogo.ts` + datos `src/entities/datos/anh-catalogo.ts` | Implementación (dato de referencia) |
| `ClasificacionAnh` | Los 6 pasos + `cauGral` + `descEvid` de una parada, cada uno como `DatoClasificado` | `src/entities/anh-clasificacion.ts` | Motor (propone) y persona (confirma) |
| `ParadaAnh` | El tramo reportable: un pozo × un día operacional × una causa. Es una fila de `paradas_pozo` | `src/entities/anh-paradas.ts` | Motor |
| `RegistroAnhPozo`, `ConfigAnh` | Identidad ANH de cada pozo (n_pozo, id_rec, uwi, form) y de la operadora/contrato/facilidad | `src/entities/configuracion.ts` (bloque nuevo `Config.anh`, opcional) | Administrador, firmado |
| `ChokeDeElemento` | Choke por defecto de cada equipo, servicio o alimentador (topología) | `Config.anh.chokes` | Administrador, firmado |
| `ArbolOperadora`, `NodoArbol` | El árbol propio de causas de cada operadora, profundidad libre | `src/entities/arbol-operadora.ts` | Se importa de la operadora |
| `TablaConversion`, `FilaConversion` | Hoja del árbol propio → pareja ANH (N1, N2), versionada y firmada | `src/entities/arbol-operadora.ts` | `reg` firma; `adm` prepara |
| `EventoPerdida` | Hidrocarburo ya producido que dejó de estar disponible (derrame, tea, venteo…) | `src/entities/perdidas.ts` | Persona, medición o balance |
| `DiferidaAnhDia`, `ProduccionPozoDia` | La diferida con la definición literal de la ANH, por pozo y día, al lado de la de TRIM | `src/entities/diferida-anh.ts` | Motor |
| `EnvioIdp`, `HallazgoValidacion` | Cada archivo JSON generado, su validación propia, su envío y sus correcciones | `src/entities/idp.ts` | Motor + `reg` |
| `PerfilMetricas`, `Cifra` | Paquetes de métricas encendidos por operadora y el valor que viaja con su ficha | `src/entities/metricas.ts` | Administrador, firmado |
| `TareaPrograma`, `ProgramaSemana`, `Ruta`, `PuntoMedicion`, `Lectura`, `CierreOrden` | El programa del técnico: preventivo, predictivo, campañas y cierre sin papel | `src/entities/programa.ts` | `plan`, `conf`, `tec` |
| `Enclavamiento`, `CondicionVisual`, `GuiaEstilo` | Interlock como estado de la máquina, separado de la prioridad de alarma; la guía de colores por operadora | `src/entities/tipos.ts` (tipos), `src/shared/lib/estilo.ts` (guía) | Motor (estado); administrador (guía) |

### 1.2 Catálogo regulatorio versionado

```ts
type IdVersionCatalogo = 'C024-2026' | 'DICC-V3.2'      // se agregan, nunca se borran
interface VersionCatalogoAnh {
  id: IdVersionCatalogo
  nombre: string             // «Circular ANH 0024 de 2026, Tabla 1»
  fuente: string             // documento + página/fila
  vigenteDesde: string       // fecha COT
  vigenteHasta: string | null
  parejas: ParejaAnh[]       // las parejas (N1, N2) válidas en esta versión
  forma: FormaSalidaAnh      // cómo se escribe cada valor
}
```

**Enums internos (valores exactos del código):**

| Tipo | Valores internos | Etiqueta de pantalla (U1 usa estas) |
|---|---|---|
| `Responsable` | `op-operacion` · `op-mantenimiento` · `op-planeacion` · `ext-energia` · `ext-transportador` · `comunidad` · `autoridad` · `tercero` · `fuerza-mayor` | «Operador · Operación» · «Operador · Mantenimiento» · «Operador · Planeación/Logística» · «Externo · Proveedor de energía» · «Externo · Transportador» · «Comunidad» · «Autoridad / Regulador» · «Tercero» · «Fuerza mayor (clima/natural)» |
| `ChokeAnh` (choke **de la parada**) | `pozo` · `planta` · `exportacion` · `reservorio` | «Pozo» · «Planta» · «Exportación (evacuación)» · «Reservorio» |
| `Impacto` | `diferida` · `perdida` | «Diferida» · «Pérdida» |
| `Planeacion` | `planeada` · `no-planeada` | «Planeada» · «No planeada» |
| `ClaveN1` | Las 20 N1_KEY de la circular, tal cual: `P_MANT_ELE` `P_MANT_MEC` `P_MANT_INS` `P_MANT_INT` `P_WO` `P_PRUEBAS` `P_PES` `P_OP` `NP_CLIMA` `NP_OPUB` `NP_ENEXT` `NP_ENINT` `NP_INS` `NP_CTRL` `NP_SUB` `NP_SUP` `NP_INTEG` `NP_PROC` `NP_TRANSP` `NP_AUT` (C24 p.6-7) | El N1_TEXT de la Tabla 1 en tipo oración («Planeada - Mantenimiento Eléctrico», …) |
| `ClaveN1Planeada` / `ClaveN1NoPlaneada` | Subconjuntos de `ClaveN1` por prefijo `P_` / `NP_` | — |
| `CodigoN2` | `` `${ClaveN1}/${slug}` ``, con `slug` = el N2 de la Tabla 1 pasado a minúsculas, sin diacríticos (la ñ pasa a n), con **cada racha** de caracteres que no son letra o número cambiada por **un solo** `-` y sin `-` en los extremos (regla fija, sin tabla a mano; S1 §1.3). P. ej. `NP_SUB/falla-esp`, `NP_ENINT/falla-vsd`, `NP_PROC/parada-estacion-bombeo-afecta-pozos`, `NP_CTRL/falla-instrumento-sensor`. 117 en `C024-2026`, sin repetidos (lista completa en el Anexo A) | El N2 de la Tabla 1 en tipo oración, byte a byte (R1 §1.5) |
| `CausaGeneral` (para `cau_gral_paro`, **provisional**) | Las 18 causas de la Res. 0651 art. 15.1 par. 2 (R1 §3.1): `abandono` `alto-sw` `electrico` `emergencia-sanitaria` `ambiental` `facilidades` `ingenieria` `bajo-potencial` `mantenimiento` `mecanico` `precio-crudo` `orden-publico` `cerrado-temporalmente` `bombeo-transporte` `pruebas-suspendidas` `climatico` `registros-pbu` `servicio-pozo` | Texto literal de la resolución |

Notas:
- Las `ClaveN1` usan la N1_KEY como código interno porque es un **código** dado por el acto administrativo, no un texto de pantalla. Si la ANH escribe texto en `cau_niv1` (Dicc. 140), lo resuelve la forma de salida, no el dato.
- La clave del N2 es **la pareja**: «Falla por falta de Mantenimiento» existe en `NP_ENINT` y en `NP_INS` (R1 §1.5).
- Una pareja que cambia de N1 entre versiones («Falla Instrumento/sensor»: `NP_CTRL` en la circular, `NP_INS` en el Diccionario, R1 §4.4) se resuelve con una **tabla de equivalencias entre versiones** (`EQUIVALENCIA_VERSIONES`: `CodigoN2` de una versión → `CodigoN2` de otra), no reescribiendo datos guardados.

```ts
interface FormaSalidaAnh {
  cauNiv1: 'clave' | 'texto'                       // C024-2026: 'clave'; DICC-V3.2: 'texto'
  responsable: Record<Responsable, string>
  choke: Record<ChokeAnh, string>
  impacto: Record<Impacto, string>
  planeacion: Record<Planeacion, string>
  n1Texto: Record<ClaveN1, string>                 // se usa si cauNiv1 = 'texto'
  n2: Record<CodigoN2, string>
  cauGral: Record<CausaGeneral, string>            // texto que viaja en cau_gral_paro (provisional, §1.2b)
  unidad: Record<CampoParada, string>              // 3.ª posición de la tupla, copiada de la plantilla: 'string'; 'ISO 8601 DateTime' en h_ini_paro y h_fin_paro
  origenConfirmado: 'M'                            // ver 1.3
  origenDeducido: 'C' | 'M'                        // provisional: 'C'
}
type CampoParada = 'n_pozo' | 'id_rec' | 'uwi' | 'form' | 'campo' | 'pla_no_plan' | 'h_ini_paro' | 'h_fin_paro'
  | 'cau_gral_paro' | 'dif_perd' | 'resp_par' | 'choke_mod' | 'cau_niv1' | 'cau_niv2' | 'desc_evid'   // orden del Schema
```

Valores exactos de las dos formas conocidas (fuente: C24 p.5 y p.8 para la circular; Dicc. 133, 137, 138, 139, 140 para el Diccionario, leídos hoy del archivo):

| Interno | `C024-2026` | `DICC-V3.2` |
|---|---|---|
| `op-operacion` | `Operador-Operación` (C24 p.5, Paso 1; la circular no da forma en mayúsculas) | `OPERADOR - OPERACIÓN` |
| `op-mantenimiento` | `Operador-Mantenimiento` | `OPERADOR - MANTENIMIENTO` |
| `op-planeacion` | `Operador-Planeación/Logística` | `OPERADOR - PLANEACIÓN/LOGÍSTICA` |
| `ext-energia` | `Externo-Proveedor Energía` | `EXTERNO - PROVEEDOR ENERGÍA` |
| `ext-transportador` | `Externo-Transportador` | `EXTERNO - TRANSPORTADOR` |
| `comunidad` | `Comunidad` | `COMUNIDAD` |
| `autoridad` | `Autoridad/Regulador` | `AUTORIDAD / REGULADOR` (una sola opción, R1 §4.3 punto 5) |
| `tercero` | `Tercero` | `TERCERO` |
| `fuerza-mayor` | `Fuerza Mayor (Clima/Natural)` | `FUERZA MAYOR (CLIMA/NATURAL)` |
| `pozo` / `planta` / `exportacion` / `reservorio` | `POZO` / `PLANTA` / `EXPORTACION` / `RESERVORIO` (C24 p.8) | `POZO` / `PLANTA` / `EXPORTACIÓN` / `RESERVORIO` |
| `diferida` / `perdida` | `DIFERIDA` / `PERDIDA` | igual |
| `planeada` / `no-planeada` | `PLANEADA` / `NO PLANEADA` | igual |
| `cau_niv1` | la clave (`P_MANT_ELE`) | el texto en mayúsculas (`PLANEADA - MANTENIMIENTO ELÉCTRICO`, …, `NO PLANEADA - AUTORIDAD / RESTRICCIÓN`) |
| `cau_niv2` | la cadena de la Tabla 1 tal cual («Falla ESP», «Perdida Línea de Vista (Flora)», «Falla Instrumento/sensor») | la cadena del Diccionario en mayúsculas, **limpiando** los artefactos de edición «VSD / -» y «HURTO / -» (decisión propia, NO VERIFICADO que el receptor espere la forma limpia) y respetando las **cinco cadenas que el Diccionario escribe distinto** de la Tabla 1 (R1 §4.4; S1 §1.1 fila 12): «PRUEBA DE POZO (POTENCIAL/PLT)», «OPERACIÓN POR BALANCE DE INVENTARIOS (PLANIFICADO)», «FALLA CONFIGURACIÓN/PARAMETRIZACIÓN (PLC/VSD/CONTROL)», «PERDIDA LINEA DE VISTA (FLORA)» (sin tilde en LINEA) y «INSTRUMENTO SIN SEÑAL» (en la celda va con doble espacio antes del separador; se emite sin él, NO VERIFICADO) |

Hay además una **tercera escritura** de `resp_par`: los ejemplos de la descripción del campo, «"Mantenimiento", "Operación", "Comunidad"» (C24 p.8). No se modela como forma porque no da los 9 valores; va en la pregunta 3 de §8.

Cuál de las dos formas acepta el receptor es **NO VERIFICADO** (R1 A-3, A-4, A-5): `Config.anh.versionCatalogo` elige una por operadora, por defecto `C024-2026` (es el acto administrativo, R1 A-3). Cambiarla es cambiar una línea de configuración firmada.

### 1.2b `cau_gral_paro`: cómo se llena (provisional)

Es obligatorio (Schema `required`) y no tiene lista en ningún artefacto (C24 p.8; Dicc. 136 «No aplica»). Mientras la ANH no responda (pregunta 9), se deriva de la N1 con la tabla versionada `CAU_GRAL_DE_N1@1` y la persona puede cambiarlo. El texto que viaja es el literal de la Res. 0651 art. 15.1 par. 2 (R1 §3.1), en `forma.cauGral`.

| N1 | `CausaGeneral` propuesta | Nota |
|---|---|---|
| `P_MANT_ELE`, `P_MANT_MEC`, `P_MANT_INS`, `P_MANT_INT` | `mantenimiento` | pareja natural |
| `P_WO` | `servicio-pozo` | pareja natural |
| `P_PRUEBAS` | `registros-pbu` | **sin pareja exacta** («toma de registros/PBU» cubre solo parte de las pruebas) |
| `P_PES` | `facilidades` | **sin pareja natural** |
| `P_OP` | `ingenieria` | **sin pareja natural** |
| `NP_CLIMA` | `climatico` | pareja natural |
| `NP_OPUB` | `orden-publico` | pareja natural |
| `NP_ENEXT`, `NP_ENINT` | `electrico` | pareja natural |
| `NP_INS`, `NP_CTRL` | `electrico` | **sin pareja natural** |
| `NP_SUB`, `NP_SUP` | `mecanico` (excepción por pareja: `NP_SUB/alto-bsw-corte-de-agua` → `alto-sw`) | pareja natural |
| `NP_INTEG`, `NP_PROC` | `facilidades` | pareja natural |
| `NP_TRANSP` | `bombeo-transporte` | pareja natural |
| `NP_AUT` | `ambiental` (excepción: `NP_AUT/suspension-orden-autoridad` → `cerrado-temporalmente`) | **sin pareja exacta** para «Restricción autoridad» |

Las cinco filas marcadas «sin pareja» son la razón de fondo de la pregunta 9: con las 18 causas de la Res. 0651 no se puede llenar este campo sin inventar una correspondencia.

### 1.3 Procedencia y origen de cada dato

```ts
type OrigenAnh = 'A' | 'M' | 'C'          // la segunda posición de la tupla (C24 p.2)
type Procedencia =
  | 'senal'        // hora del PLC o del controlador
  | 'registro'     // registro ANH del pozo (n_pozo, id_rec, uwi, form, campo)
  | 'regla'        // regla de TRIM sobre la causa deducida (id@versión)
  | 'conversion'   // tabla de conversión del árbol de la operadora (id@versión)
  | 'programa'     // programa firmado o tarea del programa del técnico
  | 'declarado'    // lo escribió una persona
  | 'confirmado'   // una persona aceptó lo propuesto (uno a uno o en lote)
  | 'corregido'    // una persona cambió lo propuesto
interface DatoClasificado<T> {
  valor: T
  procedencia: Procedencia
  regla?: string            // 'choke.topologia@1', 'conv:ECP-2026@3'…
  por?: string; porId?: string; hora?: string   // obligatorios si la procedencia es de persona; hora = la del toque (U1 P-9)
  recibido?: string         // hora en que llegó al servidor, si difiere (captura sin señal)
  lote?: string             // ConfirmacionLote.id si se confirmó en lote (U1 P-10)
  propuesto?: T             // lo que propuso TRIM, si la persona lo cambió (auditoría)
}
interface ConfirmacionLote {      // U1 P-10: qué se mostró y qué se confirmó de una vez
  id: string; porId: string; por: string; hora: string
  paradas: string[]               // ParadaAnh.id
  cadena: string                  // la cadena de 6 pasos que vio, ya serializada en códigos internos
  pasos: PasoAnh[]                // qué pasos subió a confirmado según su rol (PASOS_QUE_CONFIRMA, §1.3; S1 §2.3 P-10)
}
```

Paso de `Procedencia` a `OrigenAnh` (**provisional**, R1 A-13; la plantilla oficial pone `"A"` a la identidad y `"M"` a todo lo demás):

| Procedencia | Origen |
|---|---|
| `senal`, `registro` | `A` |
| `regla`, `conversion`, `programa` (sin persona) | `FormaSalidaAnh.origenDeducido` (por defecto `C`) |
| `declarado`, `confirmado`, `corregido` | `M` |

**`desc_evid`** también lleva procedencia (S1 H3): `M` si una persona escribió algo en él; `C` si lo armó TRIM desde `Causa.texto` y `Causa.evidencia`. **Nunca lleva nombres de personas** (S1 R-D): las personas van como rol («supervisor de turno», «técnico de mantenimiento»); los nombres se quedan en `DatoClasificado`, dentro de TRIM. Si la parada se partió por día, `desc_evid` empieza con «Tramo n de m del evento {eventoId}» (S1 R-F).

**La confirmación es por paso, no en bloque** (S1 §2.2 d; cambio P1-6). Un toque de «Confirmar» sube a `confirmado` solo los pasos que esa persona contestó o que su rol puede avalar (`PASOS_QUE_CONFIRMA`):

| Rol | Pasos que su confirmación sube a `confirmado` |
|---|---|
| `oper`, `tec` | `planeacion` (¿estaba programado?), `impacto` (¿se regó algo?) y la causa de TRIM que él contestó (parte, modo) |
| `sup`, `prod`, `jefe`, `conf` | los 6 pasos |

El responsable, el choke, la N1 y la N2 de una cadena que solo confirmó un operador **siguen con su procedencia de regla (origen `C`)** hasta que los confirma un rol de la segunda fila. Así ninguna marca `M` se fabrica con un toque de quien no ve esos pasos como suyos.
### 1.4 La clasificación ANH de una parada

```ts
type ClasificacionAnh = BaseClasificacion & (
  | { planeacion: DatoClasificado<'planeada'>;    n1: DatoClasificado<ClaveN1Planeada> }
  | { planeacion: DatoClasificado<'no-planeada'>; n1: DatoClasificado<ClaveN1NoPlaneada> }
)
interface BaseClasificacion {
  responsable: DatoClasificado<Responsable>    // paso 1
  choke: DatoClasificado<ChokeAnh>             // paso 2
  impacto: DatoClasificado<Impacto>            // paso 3
  // planeacion: paso 4 · n1: paso 5 (en la unión de arriba)
  n2: DatoClasificado<CodigoN2>                // paso 6; debe pertenecer a n1
  cauGral: DatoClasificado<CausaGeneral | string>   // provisional (R1 A-1)
  descEvid: DatoClasificado<string>            // armado desde Causa.texto + Causa.evidencia; sin nombres de personas (§1.3)
}
```

- **La coherencia planeada/N1 está bloqueada en el tipo**: no se puede construir una `ClasificacionAnh` con `planeada` y una clave `NP_`, ni al revés (C24 p.7: rechazo automático). El códec del contrato y el constructor único `clasificar(...)` la vuelven a comprobar en tiempo de ejecución, y que `n2` empiece por `n1 + '/'`.
- Mientras falta algún paso, el objeto es un `BorradorClasificacion` (todos los campos opcionales, `Partial`), nunca una `ClasificacionAnh`. Solo una `ClasificacionAnh` completa se serializa.

### 1.5 El tramo reportable: `ParadaAnh`

```ts
type EstadoParadaAnh =
  | 'propuesta'      // los 6 pasos deducidos (regla/conversión/programa); nadie los confirmó
  | 'por-precisar'   // falta un paso que la señal no decide: se pregunta a una persona
  | 'confirmada'     // completa y los 6 pasos con procedencia de persona de un rol que puede avalarlos (§1.3)
  | 'pendiente'      // TipoCausa 'pendiente': no hay causa; no se puede reportar
interface ParadaAnh {
  id: string                    // `${eventoId}@${diaOperacional}#${n}`
  eventoId: string              // EventoPozo.id: une los tramos de un mismo evento
  pozo: string; campoId: string
  diaOperacional: string        // 'YYYY-MM-DD', corte 23:59:59 (C24 p.9); zona −05:00 provisional (pregunta 4)
  inicio: string                // ISO con zona; se serializa en UTC 'Z' (provisional, §2.5)
  fin: string                   // nunca null: si sigue abierta, el corte del día (23:59:59 COT)
  abiertaAlCorte: boolean
  fraccion: number              // 1 = cerrado; < 1 = parcial (código HZ)
  causa: Causa                  // la de TRIM, sin tocar (vista de gestión)
  causaOperadora?: { arbol: string; version: number; codigo: string }  // la hoja del árbol propio, si la hay
  clasificacion: ClasificacionAnh | BorradorClasificacion
  estado: EstadoParadaAnh
  faltan: PasoAnh[]             // pasos que piden persona
  versionCatalogo: IdVersionCatalogo
  versionConversion?: string    // 'conv:<operadora>@<n>'
  perdidaId?: string            // EventoPerdida asociado (§2.4)
  revision?: { porId: string; por: string; hora: string; texto?: string }   // «Algo está mal» (U1 P-2): no corrige, pasa a quien corrige
  diferidaTrimBbl: number       // la del libro para este tramo (solo lectura; no viaja)
}
type PasoAnh = 'responsable' | 'choke' | 'impacto' | 'planeacion' | 'n1' | 'n2'
```

### 1.6 Identidad ANH del pozo, la operadora y el contrato (`Config.anh`)

```ts
interface RegistroAnhPozo {
  pozo: string            // Pozo.id de TRIM
  nPozo: string           // nombre oficial
  idRec: string           // id del sistema de información de la ANH
  uwi: string
  formacion: string       // va en `form`
  formaciones?: string[]  // si el pozo produce de varias: la regla de filas espera la pregunta 29 (S1 H5)
  campoAnh: string        // nombre oficial del campo ante la ANH (va en `campo`; S1 H6); no es Campo.nombre del demo
  tipLev?: string         // si la operadora usa otro texto que el derivado de Levantamiento
}
interface ConfigAnh {
  operadora: string                       // texto libre del membrete
  nombreArchivo: string                   // NOMBREOPERADORA: solo A-Z, 0-9 y '_' (C24 p.9, 4.3-i)
  contratos: Array<{ numero: string; campos: string[] }>   // CONTRATONUMERO, mismas reglas de sintaxis
  pozos: Record<string, RegistroAnhPozo>
  facilidades: Record<string, { idRec: string; nombre: string; campoId: string }>  // para los balances y las pérdidas
  versionCatalogo: IdVersionCatalogo
  chokes: ChokeDeElemento[]
  // criterioFrontera: RETIRADO (21-oct, CHOKE-COMPLETO.md §2): un solo criterio, el de Edinson (dedicado = pozo, compartido = planta)
  reglaPlaneado: 'programa-firmado'                            // la única hoy; §2.2
  conversion?: string                                          // tabla de conversión vigente
}
interface ChokeDeElemento {
  elemento: string        // id de equipo, tag de servicio o alimentador (Pozo.alimentador)
  choke: ChokeAnh
  alcance: 'dedicado' | 'compartido' | 'frontera' | 'tercero'
  pozos?: string[]        // a qué pozos alimenta o sirve
}
```

`Config.anh` es **opcional**: sin él, TRIM funciona como hoy y la pantalla Regulatorio dice qué falta. Vive dentro de la configuración firmada y versionada que ya existe (`Version`, `configuracion.ts`), con la misma regla: nunca se sobrescribe.

### 1.7 Choke del campo (calculado) frente a choke de la parada

| Concepto | Nombre del código | Valores | De dónde sale | Para qué |
|---|---|---|---|---|
| **Choke de la parada** | `ClasificacionAnh.choke` (`ChokeAnh`) | `pozo` · `planta` · `exportacion` · `reservorio` | Paso 2: componente donde se **origina** la restricción (regla §2.1, `ChokeDeElemento`) | `choke_mod` de cada fila |
| **Choke dominante del campo** | `chokeDominante(planta: PlantaCampo)` → `ChokeCampo` | `pozos` · `planta` · `exportacion` | **Calculado**: el menor de `PlantaCampo.chokes` (`planta.ts:44-47`); un empate devuelve `empate: true` y pide explicación (NSTA §5.4, R2 §1.2a) | Gestión del activo (gerente, producción). No viaja a la ANH |

- `Campo.choke` (`tipos.ts:102`, valores `'Pozos' | 'Planta' | 'Evacuación' | 'Mercado'`) **se conserva sin cambios** en el contrato para no romper el códec ni el SQL; queda **obsoleto** y la pantalla lee `chokeDominante`. `mercado` de `PlantaCampo.chokes` se muestra como subnivel de `exportacion`, nunca como quinto valor reportable (R2 §2.3).
- `pozos` del choke dominante incluye el reservorio, como la NSTA (R2 §2.2).

### 1.8 Diferida ANH frente a diferida TRIM

| | **Diferida TRIM** (existente) | **Diferida ANH** (nueva, al lado) |
|---|---|---|
| Nombre del código | `Libro.diferido`, `Tramo.bbl` (`libro.ts`) | `DiferidaAnhDia.diferidaBbl` (`diferida-anh.ts`) |
| Unidad | Por evento (tramo), luego se agrega | Por **pozo y día operacional** |
| Fórmula | prueba vigente × FA del mes × horas × fracción ÷ 24 (`libro.ts:328-335`) | potencial (última prueba **reportada a la ANH**, bbl/d) − real del pozo en el día (C24 p.4) |
| Prueba | la última hecha (`pruebaEn`) | la última con `Prueba.reportadaAnh` (campo nuevo opcional) |
| Factor de asignación | sí | no lo lleva la fórmula escrita; el «real» sí lo lleva si es la asignación (`prd_oil`, Dicc.) |
| Cierra contra | el PMO del mes (Σ diferidos = potencial − real) | nada: es la cifra que la ANH puede recalcular con `pruebas_potenciales` y `produccion_por_pozo` |
| Viaja en el IDP | no | no (la ANH la calcula); TRIM la muestra para que el operador sepa qué número va a ver la ANH |

```ts
interface ReporteAnhPrueba { idp: string; fecha: string }       // nombre del archivo y día en que viajó
// Prueba gana: reportadaAnh?: ReporteAnhPrueba  (opcional; no rompe insumos)
interface ProduccionPozoDia {
  pozo: string; dia: string
  tProdH: number                 // horas en que aportó fluidos, del PLC (t_prod)
  prdOilBbl: number | null       // asignación diaria; null = sin dato, nunca cero
  fuenteReal: 'oficial' | 'trim' // cargada por la operadora o propuesta por TRIM (§2.5)
}
interface DiferidaAnhDia {
  pozo: string; dia: string
  potencialBbl: number | null    // prueba reportada a la ANH (24 h)
  realBbl: number | null
  diferidaBbl: number | null     // potencial − real, con signo; null si falta una de las dos
  diferidaTrimBbl: number        // Σ tramos del libro ese día en ese pozo
  explicacion: { prueba: number; factor: number; eventos: number; resto: number }  // §2.5: suman exacto diferidaBbl
}
```

### 1.9 Pérdidas

```ts
type TipoPerdida = 'derrame' | 'fuga' | 'tea' | 'venteo' | 'rechazo' | 'dano-equipo' | 'arrastre-agua'
type FluidoPerdida = 'crudo' | 'gas' | 'agua' | 'blancos'
type MetodoPerdida = 'medido' | 'balance' | 'estimado'
interface EventoPerdida {
  id: string
  campoId: string; facilidad: string             // clave de Config.anh.facilidades (el balance es por facilidad)
  fluido: FluidoPerdida
  tipo: TipoPerdida
  inicio: string; fin: string | null
  volumen: number | null; unidad: 'bbl' | 'kpc'  // kpc = «miles de pies cúbicos estándar (KPC)», Res. 0651 art. 3, texto original del 27-08-2025 (la versión compilada no trae la unidad); null mientras producción no lo cierre
  rangoEstimado?: 'menos-1' | '1-10' | '10-100' | 'mas-100' | 'no-se'   // lo que dijo el operador en campo (U1 §4.2, P-3)
  donde?: { tipo: 'pozo' | 'equipo' | 'linea' | 'tanque'; id: string }  // dentro de la facilidad (U1 P-3)
  notificacion24h?: { hora: string; porId: string; por: string }      // derrame: Res. 40537 art. 59; TRIM no notifica, registra (U1 P-14)
  metodo: MetodoPerdida
  recuperadoBbl?: number                         // crudo recuperado y devuelto al proceso: no es pérdida
  responsable: DatoClasificado<Responsable>
  planeacion: DatoClasificado<Planeacion>        // en la C24 una pérdida puede ser planeada (R1 §3.3)
  choke?: DatoClasificado<ChokeAnh>              // por si la ANH pide fila para la pérdida sin parada (pregunta 1; S1 H10)
  paradaId?: string                              // ParadaAnh si además hubo pozo cerrado
  evidencia: string[]
  estado: 'registrada' | 'confirmada'           // 'confirmada' exige volumen y metodo
}
```

- Las seis primeras son la lista literal de C24 p.4 («derrames de crudo, fugas … desde cabeza de pozo hasta el PMO, quema de gas en tea, venteos intencionales, rechazo por especificación o daños en equipos»). `arrastre-agua` (crudo que se va con el agua de disposición) es una precisión de TRIM dentro de «daños en equipos» (R2 §4.3); que la ANH la espere ahí es **NO VERIFICADO**.
- **Ninguna pérdida se suma al diferido** (R3 G1). Son dos cifras.

### 1.10 Árbol de la operadora y su conversión

```ts
interface ArbolOperadora {
  id: string                     // 'ECP', 'OPERADORA-X'
  version: number
  nombre: string
  nodos: NodoArbol[]             // profundidad libre: 3 hojas o miles
  importado: { por: string; hora: string; fuente: string }
}
interface NodoArbol { codigo: string; padre: string | null; texto: string }   // nivel y hoja se derivan
type DestinoConversion =
  | { tipo: 'pareja'; pareja: CodigoN2 }                                  // muchos a uno: árbol fino
  | { tipo: 'segun-programa'; planeada: CodigoN2; noPlaneada: CodigoN2 }  // «Mantenimiento eléctrico»
  | { tipo: 'precisar'; pregunta: string; opciones: Array<{ pareja: CodigoN2; texto: string }> }  // uno a muchos: árbol grueso; la pregunta y los textos son los que ve el operador
interface FilaConversion {
  codigo: string                 // nodo del árbol propio; vale para sus descendientes salvo fila propia
  destino: DestinoConversion
  responsable?: Responsable      // por defecto; la persona puede cambiarlo
  nota?: string
}
interface TablaConversion {
  id: string                     // 'conv:<arbol>@<version>'
  arbol: string; versionArbol: number
  versionCatalogo: IdVersionCatalogo
  version: number
  vigenteDesde: string; vigenteHasta: string | null
  filas: FilaConversion[]
  preparadaPor: string; firmadaPor: string; firmadaEn: string
}
```

- **Ni el choke ni el impacto van en la tabla**: salen del evento (R2 §5.4, patrón 1).
- La planeación sale de la N1 de la pareja; con `segun-programa`, del programa firmado (R2 §5.4, «otra definición de planeado»).
- Una tabla vale solo si pasa la validación de §2.3 (exhaustiva, coherente, sin comodines injustificados). Cada `ParadaAnh` guarda la versión con que se convirtió; cambiar la tabla no reescribe lo reportado.
- **Las reglas de TRIM son también una tabla**: `REGLAS_ANH` lleva `TipoCausa` (+ parte + código del controlador + alcance del elemento) a responsable, choke, impacto y pareja (§2.1). Se versiona igual (`regla:trim@<n>`).

### 1.11 Paquetes de métricas y la cifra que viaja con su ficha

```ts
type PaqueteMetricas = 'nucleo' | 'avanzada' | 'esp' | 'trabajo' | 'logistica' | 'predictivo' | 'costos'
type IdMetrica = string            // los ids de R3 §3: 'N1'…'N11', 'W1', 'W2', 'G1'…'G6', 'E1'…'E6', 'T1'…'T10', 'L1'…'L7', 'P1'…'P7', 'C1'…'C4'
type ClaseTrabajo = 'correctivo' | 'preventivo' | 'predictivo' | 'modificacion'
type OrigenTrabajo = 'falla' | 'rutina' | 'ruta' | 'vigia'
interface PerfilMetricas {
  paquetes: PaqueteMetricas[]                 // 'nucleo' siempre (no se apaga)
  base: 'operacion' | 'calendario'            // de MTBF y λ; el rótulo la dice siempre
  contratistasEnT1: boolean
  clasesOrden: Record<string, ClaseTrabajo>   // 'PM01' → 'correctivo'… del CMMS del cliente; nunca por defecto
  tiposAviso: Record<string, 'solicitud' | 'averia' | 'actividad'>
  reglaFallaEsp: 'pull' | 'menos-24h'
  ventanaRepetidaDias: number
  cifraPrincipal: Partial<Record<Familia, 'N3' | 'N4' | 'L4' | 'L3'>>   // pedido de Edinson
  alias: Partial<Record<IdMetrica, string>>
}
interface Cifra {
  id: IdMetrica; definicion: string           // 'N3@1'
  valor: number | null; n: number
  banda?: [number, number]; cota?: number     // 90 %, NIST (R3 §3.0)
  base?: 'operacion' | 'calendario'
  desde: string; hasta: string
  motivo?: string                             // por qué no hay valor (n < 2, falta el paquete…)
}
```

Lo que **no** se configura (R3 §4.1): fórmulas, el mínimo n ≥ 2, la exclusión de disparos y de paradas ajenas, la población de fallas cerradas, y los umbrales de cómo se muestra la banda (n = 2-4, 5-9, ≥ 10; U1 P-15). Estos umbrales y el n ≥ 3 de Weibull son decisiones de producto, no de norma (R3 §6-17).

### 1.12 Programa y órdenes del técnico

```ts
type Disciplina = 'mecanica' | 'electrica' | 'instrumentacion' | 'integridad' | 'soldadura' | 'facilidades'
type EstadoTarea = 'programada' | 'en-curso' | 'hecha' | 'no-hecha' | 'reprogramada'
interface TareaPrograma {
  id: string; campoId: string; equipo: string
  clase: ClaseTrabajo; disciplina: Disciplina
  desde: string; hasta: string               // ventana
  tecnicoId?: string; cuadrilla?: string
  fuente: 'sap' | 'trim'                     // de dónde viene la tarea (§2.8)
  ordenSap?: string
  estado: EstadoTarea
  pareja?: CodigoN2                          // si para pozos: P_MANT_* / P_PRUEBAS… (alimenta pla_no_plan)
  paradaProgramada?: string                  // ParadaProgramada.id que la respalda
  rutaId?: string
}
type Tecnica = 'vibracion' | 'termografia' | 'aceite'
interface PuntoMedicion {
  id: string; equipo: string; ubicacion: string   // «rodamiento lado acople, horizontal»
  tecnica: Tecnica; instrumento: string; unidad: string
  alerta: number | null; alarma: number | null    // firmados por el cliente; null = sin límite
}
interface Ruta {
  id: string; campoId: string; tecnica: Tecnica
  puntos: string[]                           // PuntoMedicion.id
  frecuenciaDias: number
  fuenteFrecuencia: 'pf-observado' | 'cliente'
  campana?: { desde: string; hasta: string; contratista?: string }
}
interface Lectura {
  punto: string; hora: string
  valor: number | null; foto?: string
  porId: string; origen: 'ruta-manual' | 'colector'   // 'ruta-manual' ya existe en cadena.ts
  motivoSinValor?: 'equipo-parado' | 'sin-acceso' | 'instrumento-danado' | 'otra'   // obligatorio si valor = null (U1 P-12)
  referencia?: number          // termografía: temperatura del punto de referencia (ΔT = valor − referencia)
  muestra?: string             // aceite: número del frasco; el resultado llega del laboratorio
}
interface ProgramaSemana {     // el programa congelado contra el que se mide T3 (R3 §3.4)
  campoId: string; semana: string          // 'YYYY-Www'
  congeladoEn: string; congeladoPor: string
  tareas: string[]                         // TareaPrograma.id al congelar
  cambios: Array<{ tarea: string; tipo: 'agregada' | 'quitada' | 'movida'; hora: string; porId: string }>
}
type ActividadMant = 'reemplazo' | 'reparacion' | 'ajuste' | 'inspeccion' | 'limpieza' | 'lubricacion'
type Entrega = 'operativo' | 'con-restriccion' | 'no-arrancar'
interface CierreOrden {
  orden: string                               // número SAP u id de TRIM
  inicioTrabajo: string; finTrabajo: string   // t3 y t4 (R3 §3.5)
  personas: Array<{ id: string; horas: number }>
  parte?: ParteId; modo?: string; descriptor?: string
  actividad: ActividadMant
  repuestos: Array<{ material: string; cantidad: number; reservado: boolean }>
  esperaRepuestoDesde?: string
  entrega: Entrega
  origenTrabajo: OrigenTrabajo
  fotos: string[]; recibe?: { porId: string; hora: string }
  capturadoSinSenal: boolean
  correcciones?: Array<{ campo: 'inicioTrabajo' | 'finTrabajo'; antes: string; motivo: string }>
  envio: 'pendiente' | 'enviado' | 'rechazado'   // hacia SAP, si la operadora lo tiene
}
```

- `ActividadMant` es una lista propia de partida: el número de tabla de actividades de ISO 14224 es **NO VERIFICADO** (R3 §6, punto 15).
- `modoTrabajo` de la operadora (`Config.trabajo.modo`): `'sap'` (TRIM es cliente móvil que escribe en SAP) o `'liviano'` (TRIM guarda la orden, para operadoras sin CMMS). Mismo modelo en los dos (R3 §5.4).

### 1.13 Interlock frente a prioridad de alarma

| Concepto | Nombre del código | Valores | Qué lo alimenta |
|---|---|---|---|
| **Prioridad de alarma** (ISA-18.2) | `Severidad` (`tipos.ts:5`), `MarcaPrioridad` | `1` · `2` · `3` (y `0` normal); `4` reservado, sin uso hoy (R4 §5.1) | Límites firmados, vigía |
| **Interlock / enclavamiento** (estado de la máquina) | `Enclavamiento` (nuevo, en `Equipo` y `EventoBomba`) | `{ activo: boolean; primeraAlarma?: string; lazo?: string; desde?: string }` | first-out del PLC (`EventoBomba.primeraAlarma`, `bombas.ts:295`) o el estado del lazo `sis` (`cadena.ts`) |
| **Disparo** (confiabilidad, existente) | `esDisparo` (`libro.ts:450-455`) | ESP que vuelve a arrancar en < 24 h | No es interlock: se queda con su nombre y su chip gris «disparo, no falla» |

```ts
type CondicionVisual =
  | 'normal' | 'sin-comunicacion' | 'dato-invalido' | 'medicion-campana'
  | 'interlock' | 'alarma-1' | 'alarma-2' | 'alarma-3' | 'diagnostico'
interface GuiaEstilo {
  id: 'trim' | 'sitio'
  condiciones: Record<CondicionVisual, { token: string; forma: 'punto' | 'rombo' | 'triangulo' | 'cuadrado' | 'candado' | 'circulo-punteado' | 'circulo-punteado-raya' | 'circulo-i' | 'reloj' }>
  firmadaPor: string; firmadaEn: string
}
```

- `sin-comunicacion` (morado, Adair) se separa de `dato-invalido` (dato que no corresponde) y de `medicion-campana` (gris con la fecha de la última lectura: no es falla de comunicación) (R4 §5.4, punto 3).
- El color concreto de cada condición es de U1 (§9.2); la regla de producto es que **ningún color significa dos cosas distintas para quien decide**: si `interlock` es rojo, `alarma-1` deja de ser rojo en esa guía (ISA-18.2 vía R4 §5.3). El morado tiene **un solo significado**, «no le crea a este número», y lo usan solo dos condiciones que dicen eso: `sin-comunicacion` y `dato-invalido`, separadas por forma y texto. **Nada más usa el morado** (S1 §2.2 c; cambio P1-7 a):
  - un paso de la cadena que todavía no tiene respuesta («falta») es una tarea pendiente, no un dato malo: va en **gris con contorno discontinuo y la palabra "falta"** (marca de pantalla `MarcaFalta`, que no es una `CondicionVisual`); cerca de la hora límite (05:00) lleva la marca de `alarma-3`;
  - «sin prueba reportada a la ANH» (§2.5) es un dato que falta: gris con el texto, no morado.
- **Las dos guías comparten los significados y solo difieren en tonos** (cambio P1-7 b): en `'trim'` y en `'sitio'`, `interlock` es rojo con candado y `alarma-1` es naranja (rombo con «1»), `alarma-2` naranja (triángulo con «2»), `alarma-3` amarillo (cuadrado con «3»). Así el rojo nunca significa dos cosas en ninguna configuración.
- **Hasta F3 rige la paleta de hoy** (P1 rojo, sin interlock): mientras `Enclavamiento` no exista, el rojo sigue siendo la prioridad 1. En F2, por eso, la banda de rechazo del IDP de U1 §6.3 sale roja; pasa a naranja cuando entre la guía nueva en F3 (cambio P1-7 c).
- Etiqueta de pantalla: «Interlock (enclavamiento)». En el código, `enclavado`/`Enclavamiento`, para no chocar con «disparo».

### 1.14 Envío del IDP

```ts
type TipoEnvio = 'PROGRAMADO' | 'EXTEMPORANEO' | 'CORRECCION'   // enum del Schema (metadatos_archivo.tipo_envio)
type EstadoEnvio = 'borrador' | 'validado' | 'entregado' | 'aceptado' | 'rechazado' | 'reemplazado'
interface EnvioIdp {
  id: string
  contrato: string; diaOperacional: string
  nombreArchivo: string                     // NOMBREOPERADORA_CONTRATONUMERO_yyyymmddTHHMMSS.json
  generadoEn: string                        // COT
  tipoEnvio: TipoEnvio
  correccion: number                        // 0 = original
  motivoCorreccion?: string                 // Res. 0651 art. 15.2 par. 3
  reemplazaA?: string
  versionSchema: string; versionCatalogo: IdVersionCatalogo; versionConversion?: string
  huella: string                            // SHA-256, como los informes con folio (informe.ts)
  nodos: Array<'paradas_pozo' | 'produccion_por_pozo'>   // lo que TRIM aporta (§4.1); pruebas_potenciales lo lee, no lo emite
  resumenPerdidas: boolean                  // si va el detalle de pérdidas por facilidad para el balance
  hallazgos: HallazgoValidacion[]
  notificadoEn?: string; venceCorreccion?: string   // notificación + 1 h
  respuestaAnh?: string
  estado: EstadoEnvio
}
interface HallazgoValidacion {
  regla: string               // 'V-07'… (§4.2)
  gravedad: 'rechazo' | 'aviso'
  ruta: string                // 'segmento_datos.paradas_pozo[3].cau_niv2'
  mensaje: string
}
```

### 1.15 Capacidades nuevas (formato de `tipos.ts`)

| Capacidad | Qué permite | Roles por defecto |
|---|---|---|
| `anh:clasificar` | Completar o corregir los pasos de una `ParadaAnh` | sup, oper, tec, prod, jefe, conf |
| `anh:confirmar` | Confirmar en lote lo propuesto por TRIM | sup, prod |
| `anh:conversion` | Preparar el árbol propio y la tabla de conversión | adm |
| `anh:firmar` | Firmar la tabla de conversión y el registro ANH de los pozos | reg |
| `idp:generar` | Generar, validar y descargar el JSON del día y sus correcciones | reg (y sup como respaldo, configurable) |
| `perdida:registrar` | Registrar o corregir un `EventoPerdida` | sup, oper, prod |
| `programa:cerrar` | Cerrar una orden o capturar una lectura de ruta | tec |
| `programa:planear` | Armar tareas, rutas y campañas | plan, conf |
| `anh:comentar` | Comentar una fila de la tabla de conversión (`FilaConversion.nota`), sin cambiar su destino | conf, reg |
| `metricas:perfil` | Firmar el `PerfilMetricas` | adm (con `config:firmar`) |
| `estilo:firmar` | Firmar la `GuiaEstilo` del sitio | adm |

Ninguna capacidad nueva la tiene `ger` (regla del dueño: el gerente no ve el detalle técnico).

## §2 Reglas de negocio

### 2.1 Cómo propone TRIM cada uno de los 6 pasos, y cuándo pregunta

**Una sola función, en este orden** (`proponerClasificacion(parada, ctx)` en `anh-clasificacion.ts`; se ejecuta después de `deducirEvento` de `causa-senal.ts`, que no cambia):
1. Si la `Causa` es `pendiente` → `estado = 'pendiente'`, los 6 pasos en `faltan`. No se propone nada (R2 §3.3).
2. Si el evento trae una **causa de la operadora** (la hoja que escogió una persona en su árbol, o el código de catálogo de un aviso SAP) → se aplica la `TablaConversion` vigente para responsable, planeación, N1 y N2 (§2.3).
3. Si no → se aplica `REGLAS_ANH` sobre la causa de TRIM (tabla de abajo).
4. **El choke y el impacto nunca salen de la tabla de conversión**: salen de la topología (`Config.anh.chokes`) y de si hubo `EventoPerdida` (§2.4) (R2 §5.4, patrón 1).
5. Las preguntas de campo que ve el operador (U1 §2.4) también son datos versionados (`PREGUNTAS_CAMPO@n`, U1 P-7); la versión queda en `DatoClasificado.regla`.
6. Cada paso que la regla no decide queda en `faltan` y la parada queda `por-precisar`, con las opciones cerradas que esa regla admite (nunca la lista completa si se puede acotar).
7. Si todo se pudo deducir → `propuesta`. Pasa a `confirmada` cuando una persona con `anh:clasificar` o `anh:confirmar` la acepta (uno a uno o en lote).

**El choke por topología (regla `choke.topologia@1`)**, con el criterio único de Edinson, dedicado/compartido (transcript [26:48]; R2 §3.1-2):
- Se busca el **elemento raíz** de la causa: `Causa.equipo` (bomba, servicio) o, para el código `UV`, `Pozo.alimentador`.
- Si hay `ChokeDeElemento` para ese elemento, manda su `choke`.
- Si no hay: ESP, bombeo mecánico o código del propio pozo → `pozo`; bomba de la línea, servicio, separador, tratador, tanque o LACT propios → `planta`; tercero más allá del límite de batería → `exportacion`. RESERVORIO nunca se deduce de una señal (R2 §3.1-4): solo lo pone una persona.
- **Sin alternativa NSTA** (decisión propuesta del 21-oct, `CHOKE-COMPLETO.md` §2): un solo criterio para que los campos se puedan comparar; lo único configurable es la topología. Si un cliente reportara a la NSTA, sería un adaptador de salida.

**`REGLAS_ANH` v1** (sale de R2 §3.3, con las decisiones de §3 de este plan). «Se pregunta» = paso que va a `faltan`.

| Causa de TRIM (`TipoCausa` + condición) | Responsable | Choke | Impacto | Planeación | Pareja (N1/N2) propuesta | Se pregunta |
|---|---|---|---|---|---|---|
| `electrosumergible`, parte `motor`, `aislamiento`, `protector` o `bomba` (códigos OT, GF, PH, OL) | `op-mantenimiento` | `pozo` | `diferida` | `no-planeada` | `NP_SUB/falla-esp` | se propone sin pregunta, pero **no** pasa a `confirmada` sin una persona: GF y PH pueden venir del cable de superficie o del variador (`NP_ENINT/falla-vsd`), y la N2 la confirma quien abrió o sacó el equipo (regla «una señal apunta», abajo) |
| `electrosumergible`, parte `admision` (UL, baja carga) | `op-mantenimiento` | `pozo` | `diferida` | `no-planeada` | — | N2 entre `NP_SUB/falla-esp`, `NP_SUB/arenamiento-obstruccion`, `NP_SUB/alto-bsw-corte-de-agua`; y choke `reservorio` si la persona escoge falta de aporte (R2 §3.3, fila ESP) |
| `levantamiento` (bombeo mecánico, OL/UL) | `op-mantenimiento` | `pozo` | `diferida` | `no-planeada` | — | N2 dentro de `NP_SUP` (6 opciones); la varilla o la bomba de subsuelo no tienen N2: se ofrece `NP_SUP/falla-sistema-de-levantamiento-artificial` y la pregunta va a Edinson (§8) |
| `reinyeccion` o `transporte` con parte `rodamientos` | `op-mantenimiento` | `planta` | `diferida` | `no-planeada` | `NP_SUP/falla-rodamiento-cojinete-bearing-box` | nada |
| ídem con parte `motor` | `op-mantenimiento` | `planta` | `diferida` | `no-planeada` | `NP_SUP/falla-motor-superficie` | nada |
| ídem con parte `lubricacion` | `op-mantenimiento` | `planta` | `diferida` | `no-planeada` | `NP_SUP/falla-caja-reductora-lubricacion` | nada |
| `reinyeccion` o `transporte` cuya **primera alarma** (first-out, `EventoBomba.primeraAlarma`) es del variador o del arrancador/MCC de la bomba (S1 P1-15) | `op-mantenimiento` | `planta` | `diferida` | `no-planeada` | `NP_ENINT/falla-vsd` o `NP_ENINT/falla-mcc-switchgear` según el tag | la N2 la confirma quien abrió el equipo (no hay `ParteId` para el variador: la regla lee el tag del first-out, configurado por equipo en `Config.protecciones`) |
| ídem con parte `sello`, `succion`, `filtro`, `hidraulica` o `tornillos`, o sin parte | `op-mantenimiento` | `planta` | `diferida` | `no-planeada` | `NP_PROC/parada-estacion-bombeo-afecta-pozos`; la parte va en `desc_evid` | nada (§3.1 explica por qué) |
| ídem, cierre por **tanque de agua al límite sin falla de la bomba** (capacidad) | `op-operacion` | `planta` | `diferida` | `no-planeada` | `NP_PROC/tanques-llenos-capacidad-limitada` | nada |
| `energia` por `UV` del pozo o elemento `dedicado` | `op-mantenimiento` | `pozo` | `diferida` | `no-planeada` | — | N2 dentro de `NP_ENINT` (transformador, VSD, cableado…); responsable `ext-energia` si la persona dice que vino de afuera (entonces N1 `NP_ENEXT`) |
| `energia` por servicio en elemento `compartido` (pórtico, red MT) | `op-mantenimiento` | `planta` | `diferida` | `no-planeada` | — | N2 dentro de `NP_ENINT` |
| `energia` por servicio en elemento `frontera` (acometida, subestación de llegada) | — | `planta` | `diferida` | `no-planeada` | — | responsable entre `ext-energia` (→ `NP_ENEXT`, 4 N2) y `op-mantenimiento` (→ `NP_ENINT`): TRIM no tiene la señal de frontera (R2 §3.3) |
| `aire` | `op-mantenimiento` | `planta` | `diferida` | `no-planeada` | — | N1/N2 entre `NP_SUP/falla-motor-superficie` (compresor de aire), `NP_ENINT/*`, `NP_INS/*`, `NP_CTRL/*`: no hay N2 para servicios industriales (R2 §3.3) |
| `compresion` | `op-mantenimiento` | `planta` | `diferida` | `no-planeada` | `NP_PROC/capacidad-compresion-transferencia-gas-limitada` | nada; si hubo gas a tea, TRIM propone registrar un `EventoPerdida` `tea` (§2.4) |
| `evacuacion`, equipo propio (TK, LACT) | `op-operacion` | `planta` | `diferida` | `no-planeada` | `NP_PROC/tanques-llenos-capacidad-limitada` (tanque) | una pregunta: «¿el oleoducto o el cliente estaba recibiendo?». Si **no** → responsable `ext-transportador`, choke `exportacion`, N2 dentro de `NP_TRANSP` (§3.3) |
| `proceso` (separador) | `op-operacion` | `planta` | `diferida` | `no-planeada` | `NP_PROC/capacidad-tratamiento-agua-crudo-limitada` | si la raíz fue un instrumento: `NP_INS/falla-transmisor-de-nivel` (la persona cambia) |
| `tratamiento` | `op-operacion` | `planta` | `diferida` | `no-planeada` | `NP_PROC/capacidad-tratamiento-agua-crudo-limitada` | si se perdió crudo fuera de especificación: `EventoPerdida` `rechazo` (§2.4) |
| `programada` con `pareja` en la parada programada o la tarea | por N1: `P_MANT_*` → `op-mantenimiento`; `P_OP`, `P_PRUEBAS`, `P_WO`, `P_PES` → `op-operacion` (**provisional**, §8) | `ChokeDeElemento` del equipo intervenido; `pozo` para `P_WO` y `P_PRUEBAS` | `diferida` | `planeada` | la de la tarea | nada |
| `programada` sin `pareja` (el programa de hoy solo trae `motivo` en texto libre) | ídem | ídem | `diferida` | `planeada` | — | N1/N2 dentro de las 8 `P_*` |
| `declarada` con uno de los 4 chips de `CAUSAS_POZO` (`mensajes.ts:61-66`) | según el chip | según el chip | `diferida` | según el chip | «Cierre para prueba o intervención» → `P_PRUEBAS/*` o `P_WO/*`; «Fuga o daño en la línea de flujo» → `NP_INTEG/fuga-dano-en-linea-interna` (y propone `EventoPerdida`); «Orden de producción: nominación o restricción del comprador» → `NP_TRANSP/restriccion-nominacion-entrega` (`ext-transportador`, `exportacion`) o `P_OP/curtailed-por-decision-operativa`; «Falla del controlador o de un instrumento» → `NP_CTRL/*` o `NP_INS/*` | el N2 (y la planeación donde el chip admite las dos) |
| `declarada` en texto libre | — | por topología | `diferida` | — | — | los 6 pasos, con la topología ya puesta como propuesta del choke |

Lo que **nunca** se deduce de una señal y siempre lo declara una persona (R2 §3.3): responsables `comunidad`, `autoridad`, `tercero` y `fuerza-mayor`; N1 `NP_CLIMA`, `NP_OPUB`, `NP_AUT`; el choke `reservorio`. La señal solo puede proponer «externo, sin detalle».

**Una señal apunta, no prueba** (regla de Hollman, transcript [37:34]: «aunque nosotros estaríamos midiendo cada una de las variables de esos equipos, no quiere decir que… el daño sea específicamente por eso. Puede ser un daño colateral»; S1 P1-11). Regla `regla:senal-apunta@1`:
- lo que sale de la **firma de variables** (`Causa.como = 'firma'`) o de un código del controlador que puede venir de superficie (`GF`, `PH`, `UV`) o del first-out de un variador **nunca** pasa a `confirmada` sin una persona;
- su N2 la confirma **quien abrió el equipo** (el técnico en el cierre de la orden, §2.8, o `jefe`/`conf`); hasta entonces viaja con origen `C`;
- en pantalla se dice «las señales apuntan a…», nunca «la causa fue…» (U1 lo redacta).

**Cuándo una persona confirma lo que TRIM propuso.** La circular pide que la clasificación la hagan «los ingenieros y operadores del campo» (C24 p.5). Que una propuesta confirmada cumpla eso es **NO VERIFICADO** (R1 A-14). Regla de producto:
- **Ninguna fila sale con procedencia de persona si nadie la tocó.** Lo propuesto y no confirmado viaja con el origen de `FormaSalidaAnh.origenDeducido` (§1.3).
- **La confirmación es por paso** (§1.3, `PASOS_QUE_CONFIRMA`). El operador y el técnico confirman lo que contestaron; **por WhatsApp no confirman el choke ni la N1/N2**: el mensaje les muestra solo lo que ellos pueden avalar y la línea «el resto lo revisa su supervisor» (S1 §2.2 d; U1 lo ajusta). Lo que ningún rol competente revisó sigue con origen `C`.
- La confirmación en lote (`anh:confirmar`) la hace quien firma el día (supervisor o producción) en el cierre regulatorio del día (§2.6): una lista de lo propuesto, agrupada por causa raíz, con un toque por grupo. Cambiar algo de un grupo lo saca del lote.
- Las reglas que más se corrigen se vuelven visibles: un tablero de «correcciones por regla» (`DatoClasificado.propuesto` ≠ `valor`) para que `conf` ajuste `REGLAS_ANH` o la tabla de conversión.

**Unicidad y cascadas** (C24 p.5). Una fila por pozo y por tramo. Si un servicio cierra 20 pozos, son 20 filas con la misma clasificación raíz (es lo que hace hoy `deducirEvento`: cada `EventoPozo` hereda la causa de su cascada). Un evento posterior sobre un pozo que ya estaba cerrado no abre una segunda fila: va a `desc_evid` (R2 §1.2b). Si la causa original termina y el pozo sigue cerrado por otra, se parte en dos tramos (**provisional**, R1 A-15).

**Parada parcial (`HZ`) y disparos.** La parada de la ANH es «total o parcial» y «con independencia de su duración» (C24 p.3-4 para «total o parcial»; p.4, definición de Parada de Pozo, para la duración). Por eso: (a) los disparos de ESP (< 24 h) **sí** son filas de `paradas_pozo`, aunque no entren al MTBF (R3 §4.3 punto 8); (b) las reducciones por frecuencia (`HZ`) son filas con `fraccion < 1` y `desc_evid` que dice «parcial: X Hz de Y Hz de la prueba». Cómo quiere la ANH la parcial es **NO VERIFICADO** (R1 A-10); `Config.anh.reportarParciales` (por defecto `true`) permite apagarlo sin tocar datos.

### 2.2 Planeada y N1: la coherencia bloqueada en el modelo

- **En el tipo**: `ClasificacionAnh` es una unión discriminada (§1.4). `planeada` solo admite `ClaveN1Planeada` y `no-planeada` solo `ClaveN1NoPlaneada`. El compilador (`tsc -b`) rechaza la combinación incoherente; el códec del contrato la rechaza en tiempo de ejecución (`verificar-contrato.mjs` lleva el caso).
- **En la captura**: el paso 4 (planeación) filtra las N1 del paso 5. Si una persona cambia la planeación después de escoger la N1, la N1 y el N2 se borran (no se «convierten»).
- **Qué es planeada** (`reglaPlaneado = 'programa-firmado'`):
  - el tramo está dentro de una ventana del programa firmado (`ParadaProgramada`, o `TareaPrograma` con `pareja` `P_*`), **o**
  - una persona declara una decisión intencional del operador «como parte de la gestión normal del activo» (C24 p.4, definición de Parada Planeada: limitación de producción, optimización, pruebas): es el caso de `CMD` y de `HZ` por decisión, que hoy no son planeadas (R4 §1.6 fila `pla_no_plan`).
- **El exceso de una parada planeada** (la ventana `hasta` pasó y el pozo sigue cerrado) se parte: el tramo dentro del programa es `planeada`; el exceso es otro tramo `no-planeada`, `por-precisar` en responsable y N1/N2. Así no se esconde una falla bajo un mantenimiento (R2 §1.2c; **NO VERIFICADO** con la ANH).
- **El libro no cambia.** `Libro.planeado` (`tipo === 'programada'`, `libro.ts:743`) sigue siendo la noción de gestión, y sus 12 casos no se tocan. La cifra ANH es otra: `planeadaAnhBbl` = Σ `diferidaTrimBbl` de las `ParadaAnh` con `planeada`, y se muestra con su rótulo.

### 2.3 Conversión del árbol de la operadora (el pedido central de Edinson)

**Para qué sirve, por rol.** El operador y el técnico siguen escogiendo la causa en el árbol que conocen (el de Ecopetrol, ~10 veces la matriz; el de una operadora chica, 3 o 4 ítems; transcript [31:08]); la fila de la ANH sale sola. Confiabilidad sigue haciendo Pareto con su árbol fino. Regulatorio firma una tabla una vez y no reclasifica a mano cada día.

**Cómo se aplica a una parada**:
1. Se busca la fila del código de la hoja; si no tiene, la del ancestro más cercano (una fila en un nodo vale para todo su subárbol, salvo fila propia de un descendiente). Así se convierte un árbol de miles de hojas con decenas de filas.
2. `pareja` → N1 y N2 directos; la planeación sale del prefijo de la N1.
3. `segun-programa` → si el tramo está en el programa firmado, `planeada`; si no, `noPlaneada`.
4. `precisar` → la parada queda `por-precisar` con esas opciones, y solo esas.
5. `responsable` de la fila es la propuesta; la persona puede cambiarlo.
6. Si la conversión y las señales se contradicen en la planeación (la hoja dice «mantenimiento programado» y no hay programa firmado, o al revés), gana el programa firmado para la planeación y la parada queda `por-precisar` en N1/N2 con las dos opciones a la vista. Es una alerta, no una adivinanza.

**Antes de firmarse, una tabla pasa estas pruebas** (`validarConversion`, en CI con un caso por regla):
- **Exhaustiva**: cada hoja del árbol tiene fila propia o heredada.
- **Coherente**: toda `CodigoN2` existe en la `versionCatalogo` de la tabla; en `segun-programa`, `planeada` es `P_*` y `noPlaneada` es `NP_*`.
- **Sin comodines sin justificar**: una fila que va a «Otro evento natural» o a «Orden público - Pendiente detalle» exige `nota`; si su uso real pasa de un umbral (configurable, 5 % de las paradas del mes, propuesta propia), se avisa a `reg` (R2 §5.4, errores típicos).
- **Una versión por vigencia**: no hay dos tablas vigentes el mismo día para la misma operadora.

**Versiones y firmas.** `adm` importa el árbol (CSV o Excel: código, padre, texto) y prepara la tabla; `reg` la firma (`anh:firmar`). La firma fija `vigenteDesde`. Cada `ParadaAnh` guarda `versionConversion`. Una corrección de la tabla rige hacia adelante; recalcular un día ya enviado se hace solo como envío de corrección (§4.4).

**Conciliación (invariante probado)**: en un período, Σ `diferidaTrimBbl` por N1 = Σ por hoja del árbol propio = Σ por `TipoCausa`. Es el mismo volumen agrupado de tres formas (R2 §5.4, patrón 7).

**Del lado de SAP**: si los avisos de la operadora traen su catálogo de causa (parte objeto, daño, causa), el código de causa del aviso entra como `causaOperadora` y se convierte igual. Los nombres de los catálogos de SAP son **NO VERIFICADO** (R3 §5.4); el mapeo se hace por cliente en Conectores.

### 2.4 Pérdida con y sin parada

- **Pérdida sin parada** (tea rutinaria, arrastre de crudo en el agua, pitera reparada sin cerrar el pozo, evaporación): solo un `EventoPerdida`. **No** genera fila en `paradas_pozo` (R2 §4.4; R1 A-9 provisional).
- **Pérdida con parada** (rotura de la línea de flujo: se cierra el pozo y se derrama crudo): una `ParadaAnh` **y** un `EventoPerdida` unidos por `perdidaId`/`paradaId`. El volumen perdido va al `EventoPerdida`; la parada lleva `impacto = 'diferida'` (lo no producido mientras estuvo cerrado se recupera) y `desc_evid` cita la pérdida. `PERDIDA` en la parada solo cuando la parada no difirió nada (el pozo siguió fluyendo a un destino que se perdió), y lo pone una persona. **Provisional** hasta que la ANH lo diga: es la pregunta crítica 1 de §8 (R2 §4.4, «afecta el gravamen»).
- **Quién la registra**: sup, oper o prod (`perdida:registrar`). TRIM la **propone** cuando la causa la sugiere: chip «Fuga o daño en la línea de flujo», caída de compresión con quema, tratamiento con crudo fuera de especificación.
- **Valoración**: TRIM muestra los barriles y el responsable; **no calcula gravamen** (la norma que lo desarrolla no se encontró, R1 §3.6, A-23). La pérdida nunca se suma al diferido ni al «costo por falla» del dueño.
- **Derrame**: además de registrarlo, TRIM recuerda que es incidente a notificar en 24 h (Res. MME 40537/2024, art. 59; R1 O-14). TRIM no lo notifica.
- **Venteo**: el balance de gas no tiene campo de venteo (R2 §4.3). TRIM lo registra igual; en qué nodo va es **NO VERIFICADO** (§8).

### 2.5 Cómo se calcula la diferida ANH

Para cada pozo y día operacional `d` (función nueva `diferidaAnh(pozo, d)` en `diferida-anh.ts`; reusa `pruebaEn`, `porDia` y los tramos del libro, sin tocarlos):

```
pruebaRep(d)  = crudoBpd de la última Prueba con reportadaAnh.fecha < d      (provisional: rige desde el día siguiente al IDP que la llevó)
real(d)       = ProduccionPozoDia.prdOilBbl                                (null = sin dato)
diferidaAnh   = pruebaRep(d) − real(d)                                     (con signo; null si falta una)
```

**La explicación cuadra exacto** (identidad, probada en `verificar-libro`):

```
prueba   = pruebaRep(d) − pruebaVig(d)                    (la ANH usa otra prueba que TRIM)
factor   = pruebaVig(d) × (1 − FA del mes)               (el FA lo pone TRIM en el factor, no en el diferido; R4 D2)
eventos  = diferidaTrim(d) = Σ tramos del libro ese día
resto    = diferidaAnh − (prueba + factor + eventos)     (diferencia entre la asignación oficial y la de TRIM)
```

- `fuenteReal`: si la operadora carga su asignación diaria oficial (`prd_oil`), manda esa (`'oficial'`); si no, TRIM propone la suya (`'trim'` = prueba vigente × FA × (24 − Σ horas × fracción de sus tramos) ÷ 24, con las horas efectivas del libro, `intervalosEfectivos`), rotulada como propuesta y «provisional hasta el cierre del mes», porque el FA del mes en curso no está cerrado (S1 R-J). La asignación oficial mensual ya se carga hoy (`POST /api/asignacion-oficial`); la diaria es nueva (§5).
- Con `fuenteReal = 'trim'` y esa definición, `resto` es 0 (salvo redondeo) **si la prueba vigente no cambia dentro del día**: así una hora con frecuencia reducida (`HZ`) resta su fracción y no cuenta como producción completa. Si la prueba vigente cambia a mitad del día, `resto ≠ 0` y se muestra con ese motivo (S1 C-4; cambio P1-9).
- **Alcance: solo crudo.** La diferida ANH de F3 es de crudo (`crudoBpd`, `prd_oil`). Un campo de gas queda fuera hasta que Edinson responda qué cambia (él dijo que los de gas «tienen una tolerancia diferente en cuanto a paradas de pozo», [31:08]): potencial de gas, nominación y DCQ (SPE-36848 vía R2 §1.1). Pregunta 28.
- Una prueba estimada desde la ESP (`Pozo.origen = 'estimado'`) no se marca `reportadaAnh` por defecto: que cuente como «prueba de potencial reportada» es **NO VERIFICADO** (R4 §9, punto 5).
- Si el pozo no tiene prueba reportada → `potencialBbl = null`, y la pantalla dice «sin prueba reportada a la ANH» en gris con el texto (es un dato que falta, no un dato malo: no usa el morado, §1.13), nunca cero.
- **El libro no cambia** (R4 §7.3: tocar el método rompe ≈ 94 casos). La diferida ANH es una cifra aparte, con su rótulo.

### 2.6 El día operacional, la medianoche y las paradas abiertas al corte

- **Día operacional** = el «día calendario anterior con hora de corte a las 23:59:59 horas» (C24 p.9). La circular no dice la zona: se toma **provisionalmente** la de Colombia (00:00:00 a 23:59:59 −05:00, como ya corta `porDia`, R4 §2.1) hasta la respuesta a la pregunta 4.
- **Una parada que cruza la medianoche se parte** en una fila por día, con el mismo `eventoId` (**provisional**, R1 A-11, R-7): el primer tramo termina a las 23:59:59 COT; el siguiente empieza a las 00:00:00 COT. La clasificación se copia de un tramo al siguiente con su procedencia; si alguien la cambia en un tramo, se pregunta si aplica a los demás tramos del evento (Unicidad: un evento, una clasificación).
- **Abierta al corte**: `fin = 23:59:59 COT`, `abiertaAlCorte = true`, y `desc_evid` empieza con «Continúa al corte del día». `h_fin_paro` nunca va vacío (es obligatorio y no hay valor «abierta», R1 §1.7).
- **Hora en el JSON**: UTC con `Z`, como dice el formato de C24 p.8 y la plantilla (`2026-07-31T10:00:00Z`). Ojo: las 23:59:59 COT son las `04:59:59Z` del día siguiente. `Config.anh.zonaSalida` (`'utc-z'` por defecto, o `'cot-offset'` = `-05:00`) permite cambiarlo si la ANH lo pide (R1 A-12).
- **El calendario del cierre** (para Turno y Regulatorio, U1 lo diseña):
  - durante el día: las paradas se clasifican a medida que pasan (Turno, Identificar, WhatsApp);
  - 23:59:59: corte; TRIM arma las `ParadaAnh` del día;
  - antes de las 07:00: se resuelven las `pendiente` y `por-precisar`, se confirma lo propuesto, se genera y se valida el JSON (§4), y se entrega (C24 p.8-9).
- **Lo que no se resolvió a las 07:00**: una `pendiente` no tiene N1 válida y no se puede serializar (el Schema exige los 15 campos y la circular rechaza valores fuera de catálogo, C24 p.7). El archivo sale sin esa fila **solo si `reg` lo decide expresamente**, con un hallazgo de aviso, y la fila se envía después como `EXTEMPORANEO` o `CORRECCION` (§4.4). TRIM no rellena con un comodín.
- **Dato que llega tarde** (el PLC se reconecta y trae un evento de ayer): crea `ParadaAnh` del día anterior y marca el envío de ese día «con corrección pendiente».

### 2.7 El crudo que se va con el agua de disposición

- Cumple la definición de pérdida (producido a superficie y no disponible para la venta, C24 p.4); la circular no lo nombra (R2 §4.3). En campos de 92-97 % de agua es una pérdida continua, sin parada.
- **Modelo**: `EventoPerdida` diario, `tipo = 'arrastre-agua'`, `fluido = 'crudo'`, `volumen = OIW (ppm) × caudal de agua dispuesta (bbl/d) × 10⁻⁶`, `metodo = 'medido'` si hay analizador de aceite en agua en línea, `'estimado'` si sale de laboratorio. Sin parada; responsable propuesto `op-operacion`.
- **Hoy TRIM no tiene la señal de OIW** (no está en el catálogo de tags del demo). Es un insumo nuevo (tag del analizador o carga del laboratorio).
- **Apagado por defecto en lo regulatorio** (`Config.anh.perdidaArrastre = false`): TRIM la muestra como cifra de gestión (producción, gerente: «crudo que se va con el agua»); que la ANH la espere en `balance_fluido_crudo.perdidas` es **NO VERIFICADO** (§8). El ejemplo de R2 (≈ 22 bbl/d con 100 ppm) usa un OIW ilustrativo, no un dato.

### 2.8 Programa del técnico

- **Dos modos, un modelo** (`Config.trabajo.modo`):
  - `'sap'`: las tareas vienen del plan de mantenimiento y del programa semanal de SAP (`fuente = 'sap'`); TRIM es el cliente móvil que escribe aviso, notificación técnica y confirmación (R3 §5.4). TRIM no guarda una segunda verdad de la orden: guarda la captura hasta que SAP la acepta.
  - `'liviano'`: para operadoras sin CMMS (transcript [31:08], «las chiquiticas»); TRIM guarda tareas, órdenes y cierres (`fuente = 'trim'`).
  - Esto cambia la regla «TRIM no crea órdenes» (`sap.ts:4-5`) solo en modo `'liviano'` (R4 §6.3, opciones a + b + c).
- **El cierre de la orden en el teléfono** (`CierreOrden`) genera t3 y t4, las horas por persona, la parte, el modo, la actividad, los repuestos y el origen del trabajo. Funciona sin señal y sube al volver la cobertura. Alimenta L3-L5, T7, T8, T1, N8 y P5 (R3 §5.1). La primera prueba de valor es **T9** (retraso del cierre), antes y después del papel.
- **La parada que viene de una tarea**: si una `TareaPrograma` cierra pozos, su `pareja` (`P_MANT_*`, `P_PRUEBAS`…) alimenta la clasificación ANH como `planeada` con soporte verificable; el número de orden va en `desc_evid` (R3 §5.3; C24 p.5, principio de verificabilidad).
- **Rutas y campañas**: la frecuencia propuesta es la mitad del P-F observado más corto de esa parte (SAE JA1012 vía R3 §2.10); si la operadora fija otra mayor, la ruta queda marcada «no alcanza». Una lectura fuera de límite propone un aviso M1 con la evidencia; el correctivo que resulte queda `origenTrabajo = 'ruta'`. Las lecturas entran como serie del vigía con origen `ruta-manual` y su condición visual es `medicion-campana`, no `sin-comunicacion` (R4 §5.4 punto 3). Los límites de zona son configuración firmada del cliente: TRIM no precarga números de norma (R3 §2.7).
- **El técnico no ve rankings de técnicos** ni el *wrench time* individual (R3 §4.2).

### 2.9 Interlock, alarma y colores

- **`Enclavamiento.activo = true`** cuando el equipo está detenido y su primera alarma (first-out) está en la lista de protecciones configurada para ese equipo (`Config.protecciones[equipo]`, nueva, firmada), o cuando el lazo `sis` del equipo reporta disparo. TRIM no inventa un interlock: sin first-out ni lazo, el equipo está «detenido», no «enclavado».
- **Orden de resolución de la condición visual** de un equipo (una sola condición a la vez): `sin-comunicacion` → `dato-invalido` → `interlock` → `alarma-1` → `alarma-2` → `alarma-3` → `diagnostico` → `medicion-campana` → `normal`. Sin comunicación no se puede afirmar nada más.
- **Guías**: `'trim'` y `'sitio'` **comparten los significados** (§1.13; S1 P1-7 b): `sin-comunicacion` y `dato-invalido` morado, `interlock` rojo con candado, alarmas en naranja (1 y 2, rombo y triángulo) y amarillo (3, cuadrado), `diagnostico` azul, `medicion-campana` gris con reloj. Solo difieren en tonos. Así ningún color significa dos cosas en ninguna configuración. Que ISA-101 fije estos colores es **NO VERIFICADO**: según las fuentes públicas, los fija la guía de estilo del sitio (R4 §5.3). **Hasta F3 rige la paleta de hoy** (P1 rojo, sin interlock).
- **El «parado de alto impacto»** que hoy se pinta como P1 (`Trabajo.tsx`, `Pozos.tsx:66`, R4 §5.1) se separa: parado por interlock → `interlock`; parado por otra causa → la prioridad que le toque por su diferido. Es un cambio de presentación, no de cálculo.
- **Hay dos pilotos distintos** (S1 C-7, R-A; cambio P1-10), con dueños y dependencias distintos (§3.2):
  - el **equipo piloto del vigía** (el de Adair): una multifásica o una de inyección, para el monitoreo, los colores y el modelo;
  - la **operadora piloto del reporte ANH**: la que entrega `paradas_pozo`. No hay ninguna firmada hoy (§6, F0).
  Incluir `transporte` en `ALTO_IMPACTO` cambia cifras del libro y casos de referencia (R4 §8 fila 24): va en su propia fase, con regeneración de casos.

### 2.10 Métricas modulares: reglas que no se negocian

- Una función por métrica en el motor (`metricas.ts`); el contrato entrega `Cifra` ya calculada; las pantallas solo pintan (R3 §4.3).
- Las cinco trampas de R3 §1.4 se corrigen **al lado**: las cifras nuevas (`N3`, `N3c`, `L4`, `T1`) nacen como funciones nuevas con su `definicion`; los números viejos siguen hasta que la pantalla cambia de fuente; los rótulos dicen la base («calendario»/«operación»).
- La invariante `L1 + L2 + L3 + L4 + L5 + sin explicar = MDT` se prueba por falla y en promedio (R3 §4.3 punto 3).
- Dos contabilidades del mismo evento: el JSON cuenta paradas de pozo (también disparos); confiabilidad cuenta fallas del equipo. El ⓘ lo dice; ninguna se adapta a la otra (R3 §4.3 punto 8).

## §3 Resolución de los desacuerdos de la ronda 1

Cada decisión dice: el desacuerdo, la decisión, por qué, si es **definitiva** o **provisional reversible**, y cómo se revierte. Las provisionales viven en configuración o en `REGLAS_ANH` versionada: revertirlas no migra datos.

### 3.1 Reinyección y multifásica: ¿N1 de la falla de la parte o `NP_PROC`? (R2 §7 punto 1 contra R4 §1.7)

- **Desacuerdo.** R4 manda toda parada por bomba de reinyección o multifásica a `NP_PROC` («Parada estación/bombeo afecta pozos» o «Tanques llenos / capacidad limitada»). R2 dice que, si TRIM conoce la parte, la N1/N2 es la de la falla raíz (`NP_SUP`, `NP_ENINT`…), porque el Paso 6 pide la «falla raíz que detuvo la producción» (C24 p.5), y deja `NP_PROC` para cuando no hay parte o la causa es de capacidad.
- **Decisión (provisional, reversible).** Híbrido, ya escrito en `REGLAS_ANH` v1 (§2.1):
  - **Parte con N2 exacto en la Tabla 1** → la N1/N2 de la falla: `rodamientos` → `NP_SUP/falla-rodamiento-cojinete-bearing-box`; `motor` → `NP_SUP/falla-motor-superficie`; `lubricacion` → `NP_SUP/falla-caja-reductora-lubricacion`; variador o MCC, leídos de la primera alarma de la bomba → `NP_ENINT/falla-vsd` o `NP_ENINT/falla-mcc-switchgear` (fila agregada a `REGLAS_ANH` v1 en §2.1, S1 P1-15).
  - **Parte sin N2 exacto** (`sello`, `succion`, `filtro`, `hidraulica`, `tornillos`) o **sin parte** → `NP_PROC/parada-estacion-bombeo-afecta-pozos`, con la parte en `desc_evid`.
  - **Cierre por capacidad, sin falla de la bomba** → `NP_PROC/tanques-llenos-capacidad-limitada`.
  - El choke es `planta` en todos los casos (R2 y R4 coinciden).
- **Por qué.** La circular pide una causa «exacta, puntual y verificable» (C24 p.5). Mandar un sello mecánico de una centrífuga a «Falla unidad de bombeo superficie (Componentes)» —que es la unidad de bombeo mecánico, `NP_SUP`— sería inexacto; mandar un rodamiento a `NP_PROC` pierde una causa que la Tabla 1 sí tiene. El híbrido nunca inventa una pareja. Además, los dos informes coinciden en que la ANH no tiene N2 para bomba de reinyección o multifásica (R1 §1.5).
- **Cómo se revierte.** Si Edinson o la ANH dicen «siempre `NP_PROC`», se cambia `REGLAS_ANH` a v2 (una tabla de 3 filas). Las paradas ya reportadas conservan su `regla@1`. Pregunta crítica 3 de §8.

### 3.2 Los dos pilotos: el equipo del vigía (Adair) y la operadora del reporte ANH (S1 C-5, C-7, R-A)

- **Lo que se corrige.** La versión anterior de este plan usaba el piloto de Adair como piloto regulatorio y daba como razón que la reinyección «tiene catálogo de partes». La multifásica también lo tiene (`bomba-multifasica`, `catalogo.ts`; `PARTES_MULTIFASICA`, `partes.ts:124`): lo único que la frena es `ALTO_IMPACTO` (`causa-senal.ts:57`).
- **Equipo piloto del vigía** (dueño: Adair, con Hollman). Adair lo pidió para el **monitoreo y el modelo**: «ojalá una multifásica o una de inyección, porque además de que es de lo más crítico en planta y que a veces desencadenan eventos en cascada y sacan parte o la facilidad, son de los equipos que más instrumentación tienen asociada» [33:45]; y en [36:51] dio la lista de variables (temperaturas, vibraciones, presiones de succión y descarga, flujo, corriente), que queda como **requisito de instrumentación** del equipo piloto. Depende de los **datos de entrenamiento** que Adair dijo que no le han conseguido («Hoy recordé el tema de la data esa para lo de entrenar el modelo, pero no me la han conseguido», [33:45]) y del first-out legible (pregunta 26). Decisión: **bomba de inyección o multifásica, la que llegue primero con datos**; no tiene fecha regulatoria.
- **Operadora piloto del reporte ANH** (dueño: Hollman, comercial). Es la que entrega `paradas_pozo`. Depende de su registro ANH de pozos, de sus eventos (archivo o ingesta) y de sus credenciales de API 1-C1 (§6, F0). **La Ceiba es un campo del demo** (`src/entities/campos.ts`): solo sirve de ejemplo.
- **Multifásica en `ALTO_IMPACTO`.** Sigue en F3, con regeneración deliberada de casos. Hasta entonces se clasifica para la ANH (la tabla de §2.1 la cubre) pero no suma en `lb.altoImpacto`.

### 3.3 Evacuación: ¿siempre `NP_TRANSP` y `EXPORTACION`? (R2 §7 punto 2 contra R4 §1.7)

- **Decisión (definitiva en la regla; la pregunta del oleoducto, provisional).** Coincido con R2. En TRIM, `evacuacion` agrupa equipos **propios** dentro de la batería (TK-102, LACT-01, `equipos.ts`). Si para por un equipo propio: `planta`, responsable `op-*`, `NP_PROC` o `NP_INS`. Solo es `exportacion`/`NP_TRANSP`/`ext-transportador` si el oleoducto, el terminal o el cliente no recibió, y eso lo dice una persona con una sola pregunta (§2.1), porque TRIM no tiene esa señal.
- **Por qué.** El choke es el del componente donde se **origina** la restricción (C24 p.4; R2 §3.1-1). Ojo: el Anexo de la C003 pone «tanques llenos» en Exportación/Transporte (R2 §3.0); R2 lo lee como el tanque de crudo sin evacuación. La regla lo respeta: si el tanque se llenó porque el oleoducto no recibía, la persona contesta «no recibía» y la fila va a `exportacion`.
- **Alineado con U1 (S1 §2.2 a, U1-1).** La pregunta de campo separa el agua del crudo: «La planta no recibe (agua o proceso)» → `planta` / `NP_PROC` (el agua de disposición no sale de la batería, §3.4); «El tanque de crudo está lleno» → «¿El oleoducto o el cliente estaba recibiendo?»: *Sí* → `planta` / `NP_PROC/tanques-llenos-capacidad-limitada`; *No* → `ext-transportador` / `exportacion` / `NP_TRANSP`; *No sé* → el paso queda en «falta». Mismo criterio ante eventos iguales (Consistencia, C24 p.5).
- **Defecto colateral (no se toca ahora).** `CATEGORIA_DE.evacuacion = 'externa'` (`causas.ts`) da siempre por externa la evacuación. Solo lo usa `Regulatorio.tsx`, que se reemplaza en la fase 1 (R4 §1.3): la capa PRODML queda congelada y documentada como «solo gestión».

### 3.4 Agua de disposición llena: ¿PLANTA o EXPORTACIÓN? (R2 §3.2 fila reinyección)

- **Decisión (provisional).** `planta`. El agua de disposición no sale de la batería; la NSTA pone los «water disposal limits» en el choke de planta (R2 §3.2). Pregunta a Edinson en §8 (va junto con la 3).

### 3.5 Código o texto en `cau_niv1`; tildes y mayúsculas (R1 A-3, A-4, A-5; R2 §3.0; R4 §10)

- **Desacuerdo.** No es entre agentes sino entre fuentes oficiales: la circular pide la clave (`["P_MANT_ELE","M","string"]`, C24 p.8) y escribe `"EXPORTACION"`; el Diccionario lista el texto en mayúsculas con tildes (Dicc. 139-140). R1 lo propone «clave», R2 y R4 «no verificado». Los tres coinciden en guardar ambos.
- **Decisión (provisional, reversible por configuración).**
  - Lo guardado es siempre el **código interno** (`ClaveN1`, `CodigoN2`, `ChokeAnh`…), §1.2.
  - La salida por defecto es `C024-2026`: **clave** en `cau_niv1`, `EXPORTACION` sin tilde, responsables con la escritura del Paso 1, N2 de la Tabla 1 tal cual. Es el acto administrativo firmado (R1 A-3).
  - `DICC-V3.2` queda lista como alternativa (texto en mayúsculas, con tildes). Cambiar es una línea de `Config.anh.versionCatalogo`, firmada.
  - Antes del 1-dic, la operadora piloto **envía un archivo de prueba de cada forma** al ambiente de pruebas del canal API 1-C1, que está habilitado desde la publicación de la circular (C24 p.8), y se queda con la que el receptor acepte. Es la forma más rápida de cerrar la duda sin esperar una respuesta escrita.
- **Por qué no se decide «para siempre».** El Schema no valida ninguno de esos valores (no hay `enum`, R1 §4.3 punto 1): la regla vive en un receptor que no está publicado. Cualquier decisión fija sería adivinar.

### 3.6 Una pérdida, ¿siempre no planeada? (C003 contra C24, R1 §3.3)

- **Decisión (definitiva).** No. Rige la C24: la pérdida pasa por «¿Planeada?» como la diferida (R1 §3.4 fila 5). `EventoPerdida.planeacion` es obligatorio y la captura lo pregunta solo para tea y venteo (U1 §4.2).

### 3.7 El origen `C` en la clasificación (R1 A-13 contra la plantilla)

- **Decisión (provisional).** Lo deducido y no confirmado viaja con `C`; lo que toca una persona, con `M`; las horas del PLC y la identidad del pozo, con `A` (§1.3). La plantilla oficial pone `"M"` en todos los campos de clasificación, pero el Schema acepta `A|M|C|Fijo|""` (R1 §4.2). Si la ANH rechaza `C` en esos campos, `FormaSalidaAnh.origenDeducido = 'M'` lo cambia sin tocar datos; la procedencia real sigue guardada para la auditoría.

## §4 Salida regulatoria

### 4.1 Qué nodos del IDP aporta TRIM y cuáles no

El IDP v3.1 tiene 13 nodos en `segmento_datos` más `metadatos_archivo` y `segmento_datos_operador` (R1 §4.1). TRIM no firma ni es dueño del IDP: lo es el operador (R1 §7). Leído hoy del Schema (`required` de cada ítem):

| Nodo | Campos obligatorios | ¿Lo aporta TRIM? | Por qué |
|---|---|---|---|
| `paradas_pozo` (15) | `n_pozo, id_rec, uwi, form, campo, pla_no_plan, h_ini_paro, h_fin_paro, cau_gral_paro, dif_perd, resp_par, choke_mod, cau_niv1, cau_niv2, desc_evid` | **Sí, completo.** Es el entregable regulatorio de TRIM | TRIM tiene las horas del PLC, la causa y su evidencia; con `Config.anh` tiene la identidad del pozo |
| `produccion_por_pozo` (12) | `n_pozo, id_rec, uwi, form, campo, tip_lev, t_prod, prd_oil, prd_gas, prd_agua, cond, observaciones` | **Parcial, opcional por operadora.** TRIM da `t_prod` (horas del PLC), `tip_lev` (desde `Levantamiento`) y una **propuesta** de `prd_oil`; no tiene `prd_gas` ni `cond` por pozo, y `prd_agua` solo desde la prueba | `tuplaNumber` exige un número (no admite vacío en el valor): sin gas y condensado por pozo, TRIM no puede emitir el ítem completo. Lo entrega como **fragmento** para que el sistema de la operadora lo una |
| `pruebas_potenciales` (24) | incluye `pip, i_m, long_stroke, thp, chp, pres_anu_rev, tht, api_60, gor, bsw, id_laboratorio…` | **No lo emite; lo lee.** Marca qué prueba viajó (`Prueba.reportadaAnh`) para la diferida ANH | TRIM no tiene la mayoría de los 24 campos |
| `inyeccion_por_pozo` (9) | `n_pozo, id_rec, form, campo, t_iny, t_fluid_iny, vol_iny, pres_iny, obs` (Dicc. 143-151; `t_iny` es `tuplaTime` «HH:MM» con patrón `^([01]\d\|2[0-3]):?([0-5]\d)$`) | **No lo emite; lo cuadra.** Aporta las horas de marcha de la bomba de reinyección como soporte y avisa (V-17) si el `t_iny` que carga la operadora no cuadra con las paradas de esa bomba | Es el nodo que mueve la bomba piloto: cuando para, baja el `t_iny` de sus inyectores (S1 H4, R-H). El patrón **no admite «24:00»**: un inyector que inyectó todo el día no tiene representación exacta (máximo «23:59»; pregunta 7) |
| `tanques`, `movimientos_tanque`, `medidores_liquidos`, `medidor_gas`, `cromatografia` | — | **No** | Medición fiscal que TRIM lee pero no modela (R4 §4) |
| `balance_fluido_crudo/agua/gas/blancos` | `perdidas`, `quemado`, `crudo_recuperado`… | **No los emite.** Entrega el **detalle de pérdidas del día por facilidad** (Σ `EventoPerdida` por fluido y tipo) para que el operador lo concilie con su balance | La fórmula del `balance` no está publicada (R1 §4.5) y TRIM no tiene inventarios ni entregas. El venteo no tiene campo (R2 §4.3) |
| `metadatos_archivo`, `segmento_datos_operador` | `titulo, version, fecha_publicacion, tipo_json ("U"), fuente_de_entrega, tipo_envio` | **Solo en el archivo de prueba y en el modo «archivo completo»** (abajo) | — |

**Dos modos de entrega** (`Config.anh.entrega`):
- `'fragmento'` (por defecto): TRIM produce `paradas_pozo` (y, si se pide, el fragmento de `produccion_por_pozo` y el resumen de pérdidas) como JSON con las tuplas exactas, para que el sistema IDP de la operadora lo inserte. Es lo realista: la operadora ya arma el resto del IDP.
- `'archivo'`: para la operadora que no tiene quien arme el IDP, TRIM arma el archivo con los nodos que tiene y `segmento_datos` sin los demás. El Schema no tiene `required` en `segmento_datos` (R1 §4.3 punto 2), así que estructuralmente pasa; que el receptor lo acepte sin los nodos fiscales es **NO VERIFICADO** y probablemente no (C24 §1.4 hace obligatorios los balances). Se ofrece solo para el ambiente de pruebas.

### 4.2 La validación propia (el Schema no valida el catálogo)

El Schema publicado valida estructura y tipos, pero **no** los valores de catálogo ni la coherencia (R1 §4.3 punto 1). Por eso TRIM valida en dos capas antes de dejar entregar (C24 p.3 pide validar en origen):

**Capa 1 · Schema oficial.** El archivo de la ANH, convertido de UTF-16 a UTF-8 (R1 §4.0) y guardado en el repositorio con su SHA-256, se corre con un validador Draft-07 **con la validación de formatos activada** (`date-time`, `date`). Que la ANH active formatos es **NO VERIFICADO** (R1 §4.2): TRIM los activa para ser más estricto, nunca menos.

**Capa 2 · Reglas de la circular** (`validarIdp`, en `idp.ts`; cada regla con su código, su fuente y un caso en `verificar-libro.mjs`):

| Código | Regla | Gravedad | Fuente |
|---|---|---|---|
| V-01 | `paradas_pozo` presente; si no hubo paradas, `[]` | rechazo | C24 p.7 |
| V-02 | Cada ítem trae los 15 campos y ninguno más | rechazo | C24 p.3, p.7-8; Schema |
| V-03 | Cada valor es tupla de 3 con origen `A`, `M` o `C` (TRIM no emite `""` ni `Fijo`) y con la **unidad** de `forma.unidad` para ese campo (`"string"`; `"ISO 8601 DateTime"` en las horas, como la plantilla) | rechazo | C24 p.2; plantilla V3.1 (más estricto que el Schema, que deja la unidad libre) |
| V-04 | `choke_mod`, `dif_perd`, `pla_no_plan`, `resp_par` dentro de la forma de salida de la versión elegida | rechazo | C24 p.5, p.8; Dicc. 133-139 |
| V-05 | `cau_niv1` es una de las 20 (clave o texto según la versión) | rechazo | C24 p.7 |
| V-06 | Prefijo de N1 coherente con `pla_no_plan` | rechazo | C24 p.7 |
| V-07 | `cau_niv2` pertenece a su `cau_niv1` en la versión elegida, byte a byte | rechazo | C24 p.8 |
| V-08 | `h_ini_paro` y `h_fin_paro` en ISO 8601 con zona; `h_fin_paro ≥ h_ini_paro`; ambos dentro del día operacional (salvo `zonaSalida`) | rechazo | C24 p.8 |
| V-09 | Ninguna fila `pendiente`; ninguna con pasos en `faltan` | rechazo | C24 p.7 (no hay valor «sin identificar») |
| V-10 | `n_pozo`, `id_rec`, `uwi`, `form`, `campo` no vacíos (vienen del registro ANH firmado) | rechazo | C24 p.7-8 |
| V-11 | `cau_niv2 = «Orden público - Pendiente detalle»` | aviso | Tabla 1; R1 R-12 |
| V-12 | Filas con procedencia deducida sin confirmar (origen `C`) | aviso | R1 A-13 |
| V-13 | Dos filas del mismo pozo que se solapan en el tiempo | aviso | Unicidad, C24 p.5 |
| V-14 | Nombre del archivo con la sintaxis de 4.3 (`A-Z`, `0-9`, `_`) | rechazo | C24 p.9 |
| V-16 | Por pozo y día, Σ duración de las paradas con `fraccion = 1` ≈ 24 h − `t_prod` de `produccion_por_pozo` (tolerancia firmada por la operadora). Si `t_prod` lo pone el sistema de la operadora, TRIM lo pide para cuadrar | aviso | Res. 0651 art. 15.2 par. 2 («inconsistencias de contenido»); S1 H8, R-C |
| V-17 | Por inyector y día, las horas de parada de su bomba de reinyección cuadran con `t_iny` (si la operadora lo carga) | aviso | Schema `inyeccion_por_pozo`; S1 H4 |
| V-15 | Cuadre: Σ volumen de `EventoPerdida` por facilidad y fluido = lo que el operador pone en `perdidas`/`quemado` (si lo carga) | aviso | R2 §5.4 patrón 7 |

Solo con cero hallazgos de rechazo se pasa a `validado` (§1.14). **Por qué tan estricto**: la circular rechaza el **reporte**, no la fila («rechazará… reportes que no cumplan las reglas de validación estricta de paradas de pozo», C24 p.8), y mientras no se corrija «se considerará no recibido» (Res. 0651 art. 15.2 par. 1). Una fila mala de TRIM puede tumbar el IDP entero de la operadora (S1 R-B; que el rechazo sea del archivo entero es la lectura literal, NO VERIFICADO con la ANH).

### 4.3 El nombre del archivo y los metadatos

- `NOMBREOPERADORA_CONTRATONUMERO_yyyymmddTHHMMSS.json` (C24 p.8-9), con `Config.anh.nombreArchivo` y el `numero` del contrato, ambos ya saneados a `A-Z0-9_` al firmar la configuración (no se sanean al generar: si no cumplen, la firma se rechaza).
- El sello `yyyymmddTHHMMSS` es la **hora de generación** en COT. **Provisional**: la circular fija COT para los archivos de alta frecuencia (numeral 4.2, C24 p.9); para el IDP diario (4.1) no dice zona (S1 §1.1 fila 30). Que el sello sea la hora de generación y no la del día reportado es la lectura de R1 §1.9 (**NO VERIFICADO**; pregunta 10).
- Como `_` es a la vez separador y carácter permitido, el nombre no se puede descomponer (R1 §1.9): TRIM nunca lo lee de vuelta; guarda contrato y día en `EnvioIdp`.
- `metadatos_archivo.version`: `"3.1"` (circular y plantilla), configurable; el Diccionario fija `version` = «3.1» con origen «Fijo» (Dicc. 4); «V3.2» es el nombre de su archivo y «V3.0» el título de la hoja; solo el `title` del Schema dice «3.5» (S1 §1.1 fila 28). La duda baja de crítica a menor.
- **Modo `'archivo'` (solo ambiente de pruebas): valores de los metadatos** (S1 H7; Schema; Dicc. 3-5), provisionales:

| Campo | Valor que pone TRIM |
|---|---|
| `metadatos_archivo.titulo` | el de la plantilla V3.1, tal cual |
| `version` | `"3.1"` |
| `fecha_publicacion` | fecha de generación del archivo (Dicc. 5: «Fecha de generación o emisión del archivo JSON»), `YYYY-MM-DD` |
| `tipo_json` | `"U"` |
| `fuente_de_entrega` | `["OFICIAL"]` (**NO VERIFICADO** cuál de `TELEMETRÍA`, `OFICIAL` o `POR DEMANDA` corresponde; pregunta 30) |
| `segmento_datos_operador.datos_operador_contrato[]` | `operador` = `Config.anh.operadora`; `f_operacional` = día operacional; `f_carga` = hora de generación; `contrato` = número del contrato; `usuario` = rol de quien genera (nunca el nombre, S1 R-D) |

- `tipo_envio` y `fuente_de_entrega` son **arreglos** de enum en el Schema (R1 §4.1): TRIM emite `["PROGRAMADO"]`, `["EXTEMPORANEO"]` o `["CORRECCION"]`.

### 4.4 La ventana de corrección de 1 hora

- Res. 0651 art. 15.2 (adicionado por la Res. 0052/2026): rechazo de ingesta o inconsistencia de contenido → corregir y retransmitir **en 1 hora** desde la notificación o desde que el operador la identifica; mientras tanto, el reporte se tiene por no recibido (R1 §3.1).
- **Modelo**: `EnvioIdp.notificadoEn` y `venceCorreccion = notificadoEn + 1 h`. La corrección es un `EnvioIdp` nuevo (`tipoEnvio = 'CORRECCION'`, `correccion = n+1`, `reemplazaA`, `motivoCorreccion` obligatorio). El anterior pasa a `reemplazado`. Nunca se edita un envío (U1 §6.3; el lago es inmutable, C24 p.9).
- **Lo que pide el par. 3** (id del envío, fecha y hora de generación, número de corrección, motivo): TRIM lo guarda todo en `EnvioIdp`. **Hallazgo**: `metadatos_archivo` tiene `additionalProperties: false` y **no tiene** campos para número de corrección ni motivo (leído hoy del Schema). Dentro del archivo solo caben `tipo_envio = ["CORRECCION"]` y el sello de hora del nombre. Dónde viajan el número y el motivo es **NO VERIFICADO** (§8): TRIM los entrega aparte (en el canal de la operadora o en el informe con folio) hasta que la ANH diga.
- **Para que la hora alcance**: la corrección de una parada se hace en la misma cadena de Identificar (U1 §6.3); el validador corre de nuevo; el archivo se genera con un toque. Meta de producto: corrección típica (un N2 mal puesto) en menos de 15 minutos.
- La huella SHA-256 de cada envío reusa el mecanismo de los informes con folio (`informe.ts`, `POST /api/informes`, R4 §4).

### 4.5 El impacto de la Res. ANH 0592/2026

- **Qué dice** (R1 §3.2, leída del PDF en `fuentes/`): suspende el **art. 4** de la Res. 0651/2025 desde el 30-09-2026 por seis meses, hasta el 29-03-2027; la suspensión cubre «exclusivamente» lo que se sustenta en el art. 4 y no suspende «las demás disposiciones».
- **Lectura para el plan.** La C24 se apoya en los arts. 10, 13, 14 y 15 (no en el 4) y dice que el IDP diario aplica «independientemente… de los plazos graduales de implementación de telemetría» (C24 p.8-9). Por eso el plan **mantiene el 1-dic-2026** como fecha dura. La zona gris es la de los campos pequeños: el JSON Tipo B para < 3000 BOPD venía del par. 8 del art. 4 (Res. 0101/2026), y ese artículo quedó suspendido justo desde el 30-09 (R1 A-16).
- **Decisión (provisional).** Se construye para el 1-dic sin apoyarse en la suspensión. Si la ANH confirma que aplaza la matriz para algún grupo de campos, se mueve la fecha de la fase 2, no su contenido. Pregunta crítica 2 de §8.

### 4.6 Zona de alta frecuencia (144 archivos al día)

Fuera del alcance de este plan. Los 144 archivos de 10 minutos en el lago del operador (C24 p.9; R1 O-15) son telemetría que hoy produce el SCADA o el historiador del operador. TRIM no los genera. Se anota para no prometerlo.

## §5 Contrato con el backend

Reglas que se mantienen (`CONTRATO.md`, «Reglas del cable» y «Escrituras»): sobre `{ datos }`, error único, `por`/`porId`/`hora`/ids los pone el servidor, horas en ISO con zona, un dato ausente es `null` y nunca cero, campos de la persona. **Todo lo nuevo es aditivo**: ningún endpoint actual cambia de forma; los campos nuevos en tipos existentes son opcionales. Así `verificar-contrato.mjs` y los 122 casos de `referencia/` siguen verdes (R4 §7.3, fila 1).

### 5.1 Cambios en tipos existentes (opcionales, sin romper)

| Tipo | Campo nuevo | Endpoint que lo trae | Nota |
|---|---|---|---|
| `Prueba` (`pozos.ts`) | `reportadaAnh?: ReporteAnhPrueba` | `GET /api/catalogo` (insumos de pozos) | Sin el campo, la diferida ANH dice «sin prueba reportada» |
| `Config` (`configuracion.ts`) | `anh?: ConfigAnh`; `protecciones?: Record<string, string[]>`; `trabajo?: { modo: 'sap' \| 'liviano' }`; `metricas?: PerfilMetricas`; `estilo?: GuiaEstilo['id']` | `GET /api/configuracion`, `POST /api/configuracion` (firmada) | Mismo historial de versiones |
| `ParadaProgramada` | `pareja?: CodigoN2`; `responsable?: Responsable` | Configuración | El motivo en texto libre sigue; la pareja lo vuelve reportable |
| `Respuesta` (`pozos.ts`) | `anh?: Partial<Record<PasoAnh, string>>` (códigos internos); `causaOperadora?: string` | `POST /api/paradas/:evento/respuesta` | La respuesta del operario por WhatsApp o pantalla lleva también los pasos ANH que contestó |
| `Equipo`, `EventoBomba` | `enclavamiento?: Enclavamiento` | `/vistas/equipos/…`, `/vistas/bombas/paradas` | Solo con first-out o lazo `sis` |
| `Dispositivo` (`tipos.ts`) | `condicion?: CondicionVisual` | todos los que traen dispositivos | Lo calcula el servidor con el orden de §2.9; el front no lo deduce |
| `Campo` | — (sin cambios). `choke` queda obsoleto | `GET /api/campos` | El choke dominante llega por la vista nueva |
| `Capacidad` (`tipos.ts`) | las 11 de §1.15 | `GET /api/sesion` | `puedeHacer` sin cambios |

### 5.2 Vistas nuevas (`GET /api/vistas/…`)

| Ruta | Devuelve | Roles |
|---|---|---|
| `/vistas/anh/paradas?campos&dia` | `ParadaAnh[]` del día operacional (con `clasificacion`, `estado`, `faltan`) | prod, sup, oper, tec, jefe, conf, reg |
| `/vistas/anh/paradas/:id/opciones` | Para cada paso en `faltan`: las opciones cerradas (`CodigoN2[]`, `Responsable[]`…) con sus etiquetas; si hay árbol de la operadora, sus hojas sugeridas | quien tenga `anh:clasificar` |
| `/vistas/anh/cierre?contrato&dia` | `{ resumen: Record<EstadoParadaAnh, number>, hallazgos: HallazgoValidacion[], perdidas: resumen por facilidad, envio?: EnvioIdp, venceA: ISO }` (la pantalla de U1 §6.2) | reg, sup |
| `/vistas/anh/envios?contrato&desde&hasta` | `EnvioIdp[]` con su cadena de correcciones | reg |
| `/vistas/anh/envios/:id/archivo` | El JSON exacto entregado (o el fragmento), inmutable | reg |
| `/vistas/anh/diferida?campos&desde&hasta` | `DiferidaAnhDia[]` por pozo y día, con la explicación de §2.5 | prod, ger (solo agregado por campo), reg |
| `/vistas/anh/reparto?campos&desde&hasta&por` | Σ bbl por `choke`, `n1`, `responsable`, `planeacion` o `hoja` (árbol propio); siempre con el mismo total que `/vistas/diferidos` | ger (solo `choke` y `planeacion`), prod, jefe, conf |
| `/vistas/anh/calidad?campos&desde&hasta` | % confirmado, % corregido, reglas y filas de conversión que más se corrigen | conf |
| `/vistas/campos/:campo/choke` | `{ dominante: ChokeCampo, potenciales: Chokes, empate: boolean, desde: ISO }` | ger, prod, sup |
| `/vistas/perdidas?campos&desde&hasta` | `EventoPerdida[]` y Σ por campo, fluido, tipo y responsable | ger (agregado), prod, sup, reg, cont |
| `/vistas/conversion/:arbol` | `{ arbol: ArbolOperadora, tablas: TablaConversion[] (versiones), vigente }` | adm, reg, conf |
| `/vistas/conversion/:arbol/impacto?tabla&desde&hasta` | Simulación de U1 §5.5: paradas que cambian, Σ por N1 antes y después, cuadre | adm, reg |
| `/vistas/metricas?campos&desde&hasta&familia` | `Cifra[]` del perfil firmado, solo de los paquetes encendidos | según §4.2 de R3 |
| `/vistas/programa?campo&tecnico&desde&hasta` | `{ tareas: TareaPrograma[], rutas: Ruta[], pendientesCierre: string[] }` | tec (lo suyo), plan, jefe |
| `/vistas/rutas/:ruta/lecturas?desde&hasta` | `Lectura[]` y su estado contra límites | conf, plan, tec |

### 5.3 Escrituras nuevas

| Ruta | Cuerpo | Capacidad | Notas |
|---|---|---|---|
| `POST /api/anh/paradas/:id/clasificacion` | `{ pasos: Partial<Record<PasoAnh, string>>, motivo?: string, aplicarAlEvento?: boolean }` | `anh:clasificar` | El servidor arma `DatoClasificado` (`declarado` o `corregido`, con `propuesto`). `422` si la planeación y la N1 no cuadran o si el N2 no es de su N1. `motivo` obligatorio si corrige algo ya `confirmada` |
| `POST /api/anh/paradas/confirmar` | `{ ids: string[] }` | `anh:confirmar` (o `anh:clasificar` para una sola) | Sube a `confirmado` solo los pasos de `PASOS_QUE_CONFIRMA` del rol (§1.3) y guarda una `ConfirmacionLote`; la parada pasa a `confirmada` solo si sus 6 pasos quedan con procedencia de persona; `409` si alguna cambió desde que se leyó (se manda la versión) |
| `POST /api/anh/conversion/:arbol` | `ArbolOperadora` (importación) o `TablaConversion` en borrador | `anh:conversion` | Corre `validarConversion`; devuelve hallazgos |
| `POST /api/anh/conversion/:arbol/firmar` | `{ tabla: string, vigenteDesde: string }` | `anh:firmar` | `422` si hay hallazgos que bloquean |
| `POST /api/anh/envios` | `{ contrato, dia, tipoEnvio, motivoCorreccion?, reemplazaA? }` | `idp:generar` | Genera, valida (capas 1 y 2) y guarda con huella. No entrega |
| `POST /api/anh/envios/:id/entrega` | `{ modo: 'canal' \| 'manual', hora?: string }` | `idp:generar` | `'canal'` solo si hay integración con API 1-C1 (fase 4); `'manual'` = «la entregué yo» |
| `POST /api/anh/envios/:id/respuesta` | `{ resultado: 'aceptado' \| 'rechazado', motivo?: string, hora: string }` | `idp:generar` | Abre el reloj de 1 h si es rechazo |
| `POST /api/perdidas` · `PATCH /api/perdidas/:id` | `EventoPerdida` sin ids | `perdida:registrar` | `volumen` puede ir como rango en la captura de campo (Respuestas a UX, P-3) |
| `POST /api/programa/tareas` · `POST /api/programa/rutas` | `TareaPrograma` / `Ruta` | `programa:planear` | Solo en modo `'liviano'`; en modo `'sap'` las tareas se leen de SAP |
| `POST /api/programa/cierres` | `CierreOrden` | `programa:cerrar` | Idempotente por `orden` + hora del teléfono (captura sin señal) |
| `POST /api/programa/lecturas` | `Lectura[]` | `programa:cerrar` | Entran a la serie del vigía con origen `ruta-manual` |
| `POST /api/asignacion-oficial/diaria` | `ProduccionPozoDia[]` con `fuenteReal = 'oficial'` | `asignacion:cargar` (existente) | Hermano del `POST /api/asignacion-oficial` mensual |

### 5.4 Cambios en `src/shared/api/*` (la costura)

| Archivo | Cambio |
|---|---|
| `contrato.ts` | Códecs nuevos para cada vista y escritura de 5.2-5.3. El de `ClasificacionAnh` rechaza la combinación planeada/N1 incoherente y el N2 ajeno a su N1 (la misma regla del tipo, en tiempo de ejecución) |
| `consulta.ts`, `fuente.ts` | Las rutas nuevas en la fuente demo (motor local) y en la fuente http |
| `escrituras.ts` | Las escrituras nuevas, con el orden de revisión de siempre (403, 404, 422, 409) |
| `diferidos.ts` | Funciones de lectura de `/vistas/anh/reparto` y `/vistas/anh/diferida` |
| `informes.ts` | Huella y folio para `EnvioIdp` |
| `sap.ts` | Escritura de notificación técnica y confirmación (fase 4, modo `'sap'`) |
| nuevo `anh.ts` | Lecturas y escrituras de paradas ANH, cierre y envíos |
| nuevo `programa.ts` | Programa, rutas, lecturas y cierres |
| nuevo `metricas.ts` | `/vistas/metricas` |

La regla de oxlint del proyecto se mantiene: las pantallas solo leen datos por `src/shared/api`.

### 5.5 Cambios a `CONTRATO.md`

- Sección nueva **«Clasificación ANH (Circular 024)»** después de «Causa de cada evento»: vocabulario de §1 (enums con sus valores exactos), las dos formas de salida, el orden de `proponerClasificacion` y la tabla `REGLAS_ANH` v1.
- Sección nueva **«Envío del IDP»**: modos `fragmento`/`archivo`, validación V-01 a V-17, nombre del archivo, ventana de 1 h.
- **«Reporte con PRODML»** (`CONTRATO.md:1210-1216`): se rotula «solo gestión; no es la salida regulatoria» y se remite a la sección ANH.
- Tablas de vistas y escrituras: las filas de 5.2 y 5.3.
- **«Modelo de datos de lo que se escribe»**: `ParadaAnh` (clasificación persistida), `EventoPerdida`, `ArbolOperadora`, `TablaConversion`, `EnvioIdp`, `TareaPrograma`, `Ruta`, `Lectura`, `CierreOrden`.
- **«Cómo se comprueba un backend»**: los casos nuevos de `referencia/` (§6).
- **«Escrituras»**: excepción a «la hora la pone el servidor» para las capturas sin señal (U1 P-9): el cuerpo trae la hora del toque; el servidor guarda la suya en `recibido` y rechaza con `422` una hora futura o anterior al inicio de la parada.

## §6 Plan por fases

**Reglas para todas las fases.**
- Los cambios van **al lado**: archivos nuevos y campos opcionales. Los 122 casos de `referencia/` (y en especial los ≈ 94 que dependen del método del diferido y los 19 que dependen de `TipoCausa`, R4 §7.2) deben seguir verdes sin regenerarse, salvo en la fase que lo diga expresamente.
- `npm test` completo en cada entrega: `tsc -b` (**nunca** `tsc --noEmit`), `oxlint src`, `verificar-libro.mjs`, `verificar-contrato.mjs` y `referencia.mjs comprobar`; más `npm run e2e`.
- El gerente no ve detalle técnico en ninguna fase (CONTEXTO, regla del dueño): toda vista nueva para `ger` se revisa contra esa regla en el e2e.
- Los datos de demostración del registro ANH (`id_rec`, `uwi`, formación) se marcan `DEMO-…`: **nunca** se inventan identificadores con apariencia real.
- Casos nuevos en una carpeta nueva `referencia/anh/` (no se tocan las existentes).

### Primero, de quién es el 1-dic (S1 §5.2, D1; cambio P1-1)

**El 1-dic es la obligación de la operadora, no de TRIM.** La Circular 024 obliga a «las compañías operadoras» (C24 p.1, p.8); TRIM solo incumple si una operadora que confió en él no puede entregar un `paradas_pozo` válido. Hoy no hay operadora piloto firmada: la reunión del 19-oct era para validar el producto antes de presentarlo («estamos en un proceso ahorita temprano», Hollman [37:34]), y La Ceiba es un campo del demo. Por eso hay una **puerta de decisión el 31-oct**:
- **Si al 31-oct hay una operadora piloto firmada**, con su registro ANH de pozos y sus eventos de paradas (por archivo, porque no hay backend real de ingesta, S1 D2), el 1-dic TRIM le entrega cada día el fragmento `paradas_pozo` validado, y la prueba en API 1-C1 la hace la operadora con sus credenciales (S1 D4).
- **Si no la hay**, la meta del 1-dic es un **generador validado con datos `DEMO-`**: el fragmento `paradas_pozo` en las dos formas, que pasa el Schema oficial y V-01 a V-17 sobre una semana del demo. La prueba en API 1-C1 queda para cuando una operadora preste sus credenciales.

### La capacidad real y el recorte (S1 §5.1-5.2; cambio P1-2)

- **Capacidad**: del 27-oct al 26-nov hay 21 días hábiles (2 y 16 de noviembre son festivos; calculados por S1 con la Ley 51 de 1983, NO VERIFICADO en calendario oficial). Con tres personas a tiempo completo (dedicación NO VERIFICADA) son ≈ **12,6 persona-semanas**.
- **Lo que pedía la versión anterior de F1 + F2**: ≈ 15 persona-semanas en el extremo optimista de las estimaciones de R4 §8 y ≈ 28 en el punto medio. **No cabía.** Y eso sin backend real, sin operadora piloto y sin credenciales de API 1-C1.
- **Recorte**: antes del 1-dic queda **solo lo que toca el archivo** (lista de abajo, ≈ 12-21 persona-semanas con las mismas estimaciones). Cabe solo en el extremo optimista; por eso hay un **punto de control el 14-nov** con un plan B.
- **Sale de antes del 1-dic y pasa a F3** (no viaja en `paradas_pozo` o lo emite la operadora): diferida ANH; fragmento de `produccion_por_pozo`; `EventoPerdida` completo, V-15 y el resumen por facilidad; plantilla de WhatsApp de las 22:00 y 05:00 y las preguntas nuevas por WhatsApp; vistas del gerente (choke y pérdida); conversión básica del árbol (salvo que la operadora piloto la exija como condición del contrato).
- **Plan B del 14-nov**: si Identificar con la cadena de 6 eslabones no está, la clasificación antes del 1-dic se hace en una tabla de Regulatorio (una fila por parada, los pasos que faltan como listas cerradas filtradas) y la cadena de U1 §2 pasa a F3.

### Calendario

| Fase | Fechas (2026-2027) | Meta | Antes o después del 1-dic |
|---|---|---|---|
| F0 · Decidir y pedir | 21-oct → 31-oct | Preguntas críticas enviadas; **puerta del 31-oct**: ¿hay operadora piloto firmada? | Antes |
| F1 · Generador de `paradas_pozo` | 27-oct → 14-nov (control el 14-nov) | Clasificar cada parada en los 6 pasos y producir el fragmento válido | Antes |
| F2 · Cierre mínimo del día | 15-nov → 30-nov (congelado 26-nov; marcha blanca 24-30 nov si hay operadora) | El fragmento del día validado antes de las 06:30, con corrección en 1 h a mano | Antes |
| **1-dic-2026** | — | Con operadora: entrega diaria del fragmento. Sin operadora: generador validado con `DEMO-` | — |
| F3 · Lo que no es archivo, conversión, choke y colores | 1-dic → 31-ene-2027 | Todo lo recortado arriba; asistente de conversión; choke dominante; interlock y guía de colores; multifásica en `ALTO_IMPACTO` | Después |
| F4 · Métricas modulares, logística y programa del técnico | 1-feb → 30-abr-2027 | Paquetes 1, 1b, 2, 5 y **L3-L5 de logística** desde el cierre en el teléfono; programa del técnico en modo liviano; rol `plan` | Después |
| F5 · Integraciones | mayo-2027 → | SAP, paquetes 3, 4 completo y 6, canal API 1-C1, crudo en el agua | Después |

### F0 · Decidir y pedir (21-oct → 31-oct)
- **Entregables**: las preguntas críticas de §8 (1 a 10) enviadas a Edinson y, por su intermedio, a las mesas de trabajo de la ANH (C24 p.10); la **puerta del 31-oct** (operadora piloto firmada o no; si sí: su registro ANH de pozos, número de contrato, `NOMBREOPERADORA`, un archivo de eventos de paradas y, si lo tiene, su árbol de causas); a Adair: la fecha de los **datos de entrenamiento** y de qué equipo (pregunta 32), y el first-out del equipo piloto del vigía (pregunta 26); quién cubre el turno de 05:00 a 08:00 desde el 1-dic, también domingos y festivos (S1 D11), si hay operadora; cláusula de responsabilidad para el contrato del piloto (S1 R-B).
- **Archivos**: ninguno de código. Este plan y U1.
- **Terminado cuando**: la puerta del 31-oct está decidida y escrita.

### F1 · Generador de `paradas_pozo` (27-oct → 14-nov)
- **Entregables** (solo lo que toca el archivo):
  1. Catálogo `C024-2026` y `DICC-V3.2` como datos (Anexo A, `EQUIVALENCIA_VERSIONES`, las cinco cadenas distintas del Diccionario), `CAU_GRAL_DE_N1@1` y `forma.unidad`.
  2. Tipos de §1.2-§1.6; `clasificar(...)` con la coherencia bloqueada (§2.2); confirmación por paso (§1.3).
  3. `proponerClasificacion` con `REGLAS_ANH` v1, la regla «una señal apunta» y el choke por topología con `Config.anh.chokes` **cargado a mano**.
  4. `ParadaAnh`: partición por día operacional, abiertas al corte, parciales y disparos; «tramo n de m» en `desc_evid`.
  5. Registro ANH de pozos (con `campoAnh`) y datos de operadora y contrato por **CSV firmado** en Configuración.
  6. Serializador del fragmento `paradas_pozo` en las dos formas, con unidad y origen por campo (incluido `desc_evid`); Schema oficial convertido a UTF-8; V-01 a V-14 y V-16 (V-16 solo si la operadora da `t_prod`).
  7. Identificar con la cadena de 6 eslabones y «Confirmar» por paso; `dif_perd` = «Pérdida» como opción que pone una persona (sin `EventoPerdida` completo). **Sin WhatsApp nuevo.**
  8. Importación de un **archivo de eventos** de la operadora (inicio, fin, pozo, código o causa propia), solo si hay operadora piloto.
- **Archivos**: nuevos `src/entities/anh-catalogo.ts`, `anh-clasificacion.ts`, `anh-paradas.ts`, `idp.ts`, `src/entities/datos/anh-catalogo.ts`, `src/shared/api/anh.ts`; cambios aditivos en `src/entities/configuracion.ts` (`Config.anh`, `ParadaProgramada.pareja`), `src/entities/pozos.ts` (`Respuesta.anh`), `src/entities/tipos.ts` (capacidades), `src/entities/roles.ts`, `src/shared/api/contrato.ts`, `escrituras.ts`, `consulta.ts`, `fuente.ts`, `src/pages/Causa.tsx`, `Configuracion.tsx`, `scripts/gen-linea.mjs` (registro ANH `DEMO-`). **No se tocan** `causa-senal.ts` (solo se lee su `Causa`), `libro.ts`, `diferido.ts`, `TipoCausa`.
- **Pruebas**:
  - `verificar-libro.mjs`, sección «ANH»: una comprobación por fila de `REGLAS_ANH`; la regla «una señal apunta» (una ESP con GF no pasa a `confirmada` con un toque de `oper`); partición de medianoche (fin 23:59:59 COT = 04:59:59Z, provisional); cascada de 20 pozos = 20 filas; la combinación planeada/`NP_` imposible; conciliación Σ por N1 = Σ por `TipoCausa`; la regla del `slug` reproduce los 117 códigos del Anexo A.
  - `verificar-contrato.mjs`: ida y vuelta de cada códec nuevo y rechazo de la combinación incoherente.
  - `referencia/anh/`: `paradas-dia-*` (una semana del demo), `idp-fragmento-*` (JSON esperado byte a byte en las dos formas), `validacion-*` (un caso por regla V-xx).
  - e2e nuevo `anh-identificar.spec`: 1 toque para confirmar una parada deducida con `sup`; **al operador nunca se le pide escoger choke, N1 ni N2**, y su confirmación no sube esos pasos a `M`; el gerente no ve N1/N2.
- **Terminado cuando** (control del 14-nov): una semana del demo produce el fragmento que pasa el Schema y V-01 a V-14 en las dos formas, sin filas `pendiente` ni `por-precisar` después de contestar; los 122 casos viejos siguen verdes. Si no: plan B.

### F2 · Cierre mínimo del día (15-nov → 30-nov)
- **Entregables**: encender `reg` y Regulatorio mínimo (paradas del día, hallazgos, «Descargar el fragmento», marcar entregado/aceptado/rechazado a mano, preparar la `CORRECCION` con motivo y el reloj de 1 h); `EnvioIdp` con huella; aviso **en pantalla y por correo** (no WhatsApp) a las 05:00 si queda algo `pendiente` o `por-precisar`; confirmación en lote por causa raíz en Turno; si hay operadora: archivos de prueba de las dos formas al ambiente API 1-C1 (los envía ella) y marcha blanca del 24 al 30-nov contra lo que reporta hoy.
- **Archivos**: `src/pages/Regulatorio.tsx`, `Turno.tsx`, `src/shared/config/producto.ts` (encender `reg`), `src/entities/informe.ts` (huella del envío), `src/shared/api/informes.ts`.
- **Pruebas**: `referencia/anh/envio-correccion-*`; e2e `anh-cierre.spec` (rechazo → corrección con motivo → envío nuevo que `reemplazaA`).
- **Riesgos**: los de §9, en especial R-01, R-14, R-17 y R-18.
- **Terminado cuando**: con operadora, 7 días seguidos del fragmento validado antes de las 06:30; sin operadora, el generador `DEMO-` pasa todo y el congelado del 26-nov se respeta.

### F3 · Lo que no es archivo, conversión completa, choke y colores (1-dic-2026 → 31-ene-2027)
- **Entregables**: lo recortado de antes del 1-dic (diferida ANH con `Prueba.reportadaAnh` y `ProduccionPozoDia`; fragmento de `produccion_por_pozo`; `EventoPerdida` completo con V-15 y el resumen por facilidad; plantilla de WhatsApp de cierre, sujeta a aprobación de Meta, S1 D6; preguntas y confirmación por WhatsApp de U1 §2.6; vistas del gerente); conversión básica y luego el asistente de U1 §5; los nodos del árbol de la operadora como botones (U1 P-8); tablero de calidad de la clasificación; choke dominante calculado y `Campo.choke` obsoleto; `Enclavamiento`, `CondicionVisual`, `GuiaEstilo` con interlock rojo en las dos guías; **multifásica en `ALTO_IMPACTO`** con regeneración deliberada de casos; `REGLAS_ANH` v2 con las respuestas de Edinson y la ANH; rol `cont`.
- **Archivos**: `src/entities/diferida-anh.ts`, `perdidas.ts`, `arbol-operadora.ts`, `src/pages/Configuracion.tsx` (página de conversión), `src/entities/planta.ts` (`chokeDominante`), `src/entities/tipos.ts`, `src/index.css` (tokens), `src/shared/ui/Prioridad.tsx`, `src/shared/lib/prioridad.ts`, nuevo `src/shared/lib/estilo.ts`, `src/pages/Trabajo.tsx`, `Pozos.tsx`, `Diferidos.tsx`, `Produccion.tsx`, `src/widgets/resumen/PorCampo.tsx`, `src/widgets/diferidos/Paretos.tsx`, `src/entities/mensajes.ts`, `src/entities/causa-senal.ts:57` (`ALTO_IMPACTO`, **solo aquí**).
- **Pruebas**: identidad `prueba + factor + eventos + resto = diferidaAnh` (con `resto = 0` cuando la prueba vigente no cambia en el día); `referencia/anh/diferida-anh-*`, `conversion-*` y `conversion-grande-*` (≥ 1.000 hojas); orden de resolución de la condición visual; e2e de colores (ningún color con dos significados en ninguna guía); regeneración controlada de los casos de `altoImpacto` con informe de diferencias.
- **Terminado cuando**: una operadora convierte su árbol real y el cuadre Σ por su árbol = Σ por N1 da exacto en un mes; Adair revisa la guía.

### F4 · Métricas modulares, logística y programa del técnico (1-feb → 30-abr-2027)
- **Entregables**: `PerfilMetricas` firmado y `/vistas/metricas` con `Cifra`; paquetes 1 (núcleo, con las cinco trampas de R3 §1.4 corregidas al lado), 1b, 2 y 5; **L3, L4 y L5 de logística calculados desde el cierre en el teléfono del modo `'liviano'`** (R3 §4.1: «L3-L5 necesitan el cierre en el teléfono»), para que la «cifra principal» de Edinson ([22:34]) incluya la logística desde F4 (S1 C-1; cambio P1-8); encender `plan`; programa del técnico en modo `'liviano'` con cierre sin señal (empezando por el cierre de la orden; las 48 h sin red de todo el programa se estiman antes de comprometerlas, S1 R-K); T9 antes y después del papel.
- **Archivos**: nuevos `src/entities/metricas.ts`, `src/entities/programa.ts`, `src/shared/api/metricas.ts`, `programa.ts`; cambios en `src/pages/Confiabilidad.tsx`, `Mantenimiento.tsx`, `Trabajo.tsx`, `src/entities/cadena.ts`, `src/entities/equipos.ts:247`, `src/shared/config/producto.ts`.
- **Pruebas**: invariante `L1+…+L5+sin explicar = MDT`; MTBF de flota con n ≥ 2 igual que el de equipo; bandas χ² contra R3 §3.0 (P-201B: 45,8 d, banda 25,4-92,1 d); `referencia/metricas/`; e2e del cierre sin señal.
- **Terminado cuando**: la operadora piloto escoge sus paquetes y su cifra principal; un técnico cierra una semana de órdenes y rutas sin papel.

### F5 · Integraciones (mayo-2027 →)
- Modo `'sap'`: aviso con t0 y t5 del PLC, notificación técnica y confirmación (R3 §5.4; interfaz BAPI/OData **NO VERIFICADO**, la define el integrador); paquetes 3 (trabajo), 4 completo (L1, L2, L6, L7 con SAP MM) y 6 (costos); entrega directa por el canal API 1-C1 si la ANH entrega la especificación técnica del canal (no está entre las fuentes de `investigacion/fuentes/`: **NO VERIFICADO** que exista publicada); crudo en el agua de disposición si se confirma (§2.7).

## §7 Actualización del documento backend (`docs/backend/`)

Se actualiza en la misma entrega que el código de cada fase (no antes: el documento describe lo construido). Capítulos que cambian:

| Capítulo | Qué cambia | Fase |
|---|---|---|
| `01-propuesta-de-valor.md` | La salida regulatoria de la Circular 024 como parte de la propuesta; el valor por rol (U1 §1.1) | F1 |
| `02-arquitectura.md` | Módulos nuevos (`anh-*`, `perdidas`, `idp`, `arbol-operadora`, `diferida-anh`, `metricas`, `programa`) y su lugar en la cadena: motor → clasificación ANH → serializador → validación | F1 |
| `03-modelo-de-datos.md` y `sql/esquema.sql`, `sql/tablas.json`, `modelo-de-datos.xlsx` | Tablas nuevas: `parada_anh` (con una columna por paso + procedencia), `catalogo_anh` y `forma_salida_anh` (versionados), `registro_anh_pozo`, `choke_elemento`, `arbol_operadora`, `nodo_arbol`, `tabla_conversion`, `fila_conversion`, `evento_perdida`, `produccion_pozo_dia`, `envio_idp`, `hallazgo_validacion`; más adelante `tarea_programa`, `ruta`, `punto_medicion`, `lectura`, `cierre_orden`, `perfil_metricas`. La tabla `tramo_diferido` **no cambia** (su `check (causa_tipo in …)` sigue con los 13 `TipoCausa`); `campo.choke` se marca obsoleto | F1 (lo regulatorio), F4 (programa y métricas) |
| `05a-libro/` | Capítulo nuevo `13-diferida-anh.md`: la definición literal, la identidad de la explicación (§2.5) y por qué el libro no cambia; `10-asignacion-oficial.md` suma la carga diaria | F3 |
| `05b-paradas-agua/02-causa-pozo.md` | Después del árbol de atribución: «De la causa de TRIM a los 6 pasos de la ANH» (`proponerClasificacion`, `REGLAS_ANH`, choke por topología); `01-eventos.md`: partición por día operacional y abiertas al corte | F1 |
| `05b-paradas-agua/` (nuevo `09-perdidas.md`) | `EventoPerdida`, con y sin parada, el crudo en el agua | F3 |
| `05d-entradas-salidas/02-configuracion-firmada.md` | `Config.anh`, `ChokeDeElemento`, `protecciones`, `PerfilMetricas`, `GuiaEstilo`, tabla de conversión firmada | F1, F3, F4 |
| `05d-entradas-salidas/03-usuarios-roles-permisos.md` | Las 11 capacidades de §1.15; `reg` y `plan` encendidos | F1, F4 |
| `05d-entradas-salidas/04-informes-exportados.md` | `EnvioIdp`: nombre del archivo, huella, inmutabilidad, cadena de correcciones | F2 |
| `05d-entradas-salidas/05-whatsapp.md` | Pregunta de pérdida, confirmación de la cadena y plantilla del cierre de las 22:00 | F3 |
| `05d-entradas-salidas/06-sap-pm.md` | Causa de la operadora desde el aviso; más adelante, escritura de notificación y confirmación | F2, F5 |
| `05d-entradas-salidas/` (nuevo `10-idp-anh.md`) | Los nodos que aporta TRIM, los dos modos de entrega, V-01 a V-17, la ventana de 1 h, la Res. 0592 | F1-F2 |
| `06a-libro-gerencia/01-resumen.md`, `02-diferidos.md`, `04-configuracion.md` | Reparto por choke, pérdida aparte, vistas «como la ANH»; secciones nuevas de configuración | F1 (configuración), F3 (vistas) |
| `06b-operacion/05-turno.md`, `06-telefono.md` | Cierre del día en Turno; captura de pérdida y cierre de orden sin señal | F1, F4 |
| `06c-mantenimiento-marco/02-identificar.md` | La cadena de 6 eslabones (U1 §2) | F1 |
| `06c-mantenimiento-marco/03-mantenimiento.md`, `04-confiabilidad.md`, `06-trabajo.md` | Planeado con la definición ANH; métricas modulares; programa del técnico | F4 |
| `07-api.md` | Las vistas y escrituras de §5.2-5.3 | Cada fase |
| `08-presentacion.md` | Guía de estilo y condiciones visuales (interlock, sin comunicación, medición por campaña) | F3 |
| `09-verificacion.md` | Las secciones nuevas de `verificar-libro`, la carpeta `referencia/anh/`, la validación con el Schema oficial | F1-F2 |
| `10-pendientes.md` | Las preguntas abiertas de §8 y las decisiones provisionales de §3, con su interruptor | F1 |
| `anexo-b-glosario.md` | Diferida ANH, diferida TRIM, pérdida, choke de la parada, choke dominante, interlock, procedencia, forma de salida | F1 |
| `anexo-c-normas.md` | Circular ANH 0024/2026, Schema V3.1, Diccionario V3.2, Res. 0592/2026, Res. 0052/2026 (art. 15.2); corregir la línea 13: los cuatro chokes de la ANH son los de SPE-36848 (Reservorio, Pozos, Planta, Exportación) y Mercado es de la NSTA (R2 §2.3 punto 4) | F1 |

## §8 Preguntas para Edinson y para la ANH

Consolidadas de R1 §6 (A-1 a A-23), R2 §9 (1 a 9), R3 §6, R4 §9, U1 y S1 (§1.4, §3, §7.1 P1-13), sin duplicados; la numeración salta (28-32) porque las nuevas se agregaron en la ronda de corrección. Edinson figura en «Proyectó» de la circular (R1 §1.0), pero **su respuesta no es la norma**: lo que diga se pide confirmado por escrito en las mesas de trabajo de la ANH (C24 p.10; R1 §6). «Bloquea» = sin respuesta, la decisión provisional de este plan entra en producción el 1-dic.

### 8.1 Críticas (antes del 1-dic; a la ANH, vía Edinson)

| # | Pregunta | Fuentes | Decisión provisional mientras tanto |
|---|---|---|---|
| 1 | Una parada que causa **diferida y pérdida** a la vez (rotura de línea con derrame): ¿qué va en `dif_perd`? ¿Cómo se une la parada con el valor de `perdidas` del balance? Una pérdida **sin** pozo parado (tea, rechazo), ¿va como fila de `paradas_pozo` o solo en el balance? | R2 §9-1; R1 A-8, A-9 | §2.4: la parada `DIFERIDA`, el volumen en el balance, `desc_evid` cita el evento; sin parada, solo el balance |
| 2 | ¿La Res. 0592/2026 aplaza la obligatoriedad del JSON v3.1 y de la matriz de paradas del 1-dic para algún grupo de campos (p. ej. < 3000 BOPD), o solo los plazos de telemetría? | R1 A-16 | §4.5: el 1-dic sigue firme |
| 3 | En `cau_niv1`, ¿va la clave (`P_MANT_ELE`) o el texto («PLANEADA - MANTENIMIENTO ELÉCTRICO»)? ¿Qué lista de N2 rige (Tabla 1, árbol o Diccionario V3.2)? ¿El receptor compara mayúsculas, tildes y espacios exactos (`EXPORTACION`/`EXPORTACIÓN`)? En `resp_par` hay **tres** escrituras: «Operador-Mantenimiento» (Paso 1, C24 p.5), «OPERADOR - MANTENIMIENTO» (Dicc. 138) y el ejemplo «Mantenimiento» de la descripción del campo (C24 p.8): ¿cuál? ¿«Falla Instrumento/sensor» es de `NP_CTRL` o de `NP_INS`? (Menor: `version` = «3.1» según Dicc. 4, la plantilla y la circular; solo el `title` del Schema dice 3.5.) | R1 A-2, A-3, A-4, A-5, A-17; R2 §9-2; R4 §9-1, 9-2, 9-3; S1 §1.1 filas 5 y 28 | §3.5: forma `C024-2026`, cambiable por configuración; archivo de prueba de cada forma (lo envía la operadora) |
| 4 | Si un pozo sigue parado a las 23:59:59, ¿qué va en `h_fin_paro`? ¿Una parada de varios días se parte en una fila por IDP? ¿Las horas van en UTC con `Z` o en hora de Colombia? | R1 A-11, A-12; R4 §9-4 | §2.6: se parte por día; abierta = 23:59:59 COT; salida en UTC `Z` |
| 5 | Si un sistema propone la causa desde las alarmas y el ingeniero la confirma, ¿el Origen es `C` o `M`? ¿Vale una propuesta confirmada por una persona como clasificación «por parte de los ingenieros y operadores»? ¿Vale una captura en otro orden (primero «qué encontró») si la confirmación recorre los 6 pasos en orden? | R1 A-13, A-14; R4 §9-7; U1 §2.1 | §1.3, §3.7: `C` sin confirmar, `M` confirmado |
| 6 | ¿Las reglas de catálogo y coherencia se validan en el receptor aparte del Schema? ¿Se publicarán? ¿El ambiente de pruebas de API 1-C1 devuelve el motivo del rechazo? ¿Valida alguna combinación entre responsable, choke y N1 además de P_/NP_? ¿Acepta Origen vacío o `Fijo`? | R1 A-18, A-19, A-22 | §4.2: validación propia más estricta que el Schema |
| 7 | Bomba de reinyección o multifásica con la parte identificada: ¿N1 de la falla (`NP_SUP`, `NP_ENINT`) o siempre `NP_PROC` «Parada estación/bombeo afecta pozos»? Tanques de agua de disposición llenos: ¿choke `PLANTA` o `EXPORTACION`? El inyector no tiene fila de parada, pero su tiempo de inyección viaja en `inyeccion_por_pozo.t_iny` (`HH:MM`): ¿cómo se reporta un día completo si el patrón del Schema no admite «24:00»? | R2 §9-3; R1 A-20; S1 H4 | §3.1, §3.4: híbrido; `PLANTA`; `t_iny` lo emite la operadora y TRIM lo cuadra (V-17) |
| 8 | Una restricción parcial (ESP con frecuencia bajada, choke a medias, curtailment del 30 %), ¿es fila de `paradas_pozo`? ¿Cómo se dice que fue parcial? Si la causa cambia durante la parada, ¿dos filas consecutivas con `h_fin = h_ini`? | R1 A-10, A-15; R2 §9-6 | §2.1: fila con `desc_evid` «parcial»; dos tramos |
| 9 | `cau_gral_paro`: ¿una de las 18 causas del art. 15.1 par. 2 de la Res. 0651, texto libre o derivado de la N1? ¿Lo valida el receptor? | R1 A-1 | `CausaGeneral` con las 18, derivada de la N1 y editable |
| 10 | En una **corrección** (Res. 0651 art. 15.2 par. 3), ¿dónde viajan el número de corrección y el motivo, si `metadatos_archivo` no tiene esos campos y no admite otros? ¿El sello `yyyymmddTHHMMSS` del nombre es la hora de generación? | Hallazgo de este plan (§4.3, §4.4) | Se guardan en `EnvioIdp` y se entregan aparte |

### 8.2 Importantes (a Edinson; antes de cerrar F3)

| # | Pregunta | Fuentes |
|---|---|---|
| 11 | Frontera POZO/PLANTA: ¿su criterio «dedicado o compartido» (el transformador del pórtico es planta, el de las unidades es pozo) o la frontera física de la NSTA (la distribución eléctrica y las líneas de flujo son planta)? | R2 §9-4; transcript [26:48] |
| 12 | Sin N2 en la Tabla 1: varilla partida o bomba de subsuelo de bombeo mecánico, aire de instrumentos, declinación. ¿Qué pareja usar? | R2 §9-5 |
| 13 | Diferida ANH: ¿el potencial es la prueba tal cual o por el factor de campo del día? ¿El «real» es la asignada (`prd_oil`) o la medida? ¿La prueba rige desde el día en que se hizo o desde el siguiente al IDP que la llevó? ¿Cuenta una prueba estimada desde la ESP o con medidor multifásico? | R1 A-6, A-7; R4 §9-5, 9-6 |
| 14 | Un pozo cerrado por alto corte de agua por decisión de ingeniería: ¿`P_OP` «Curtailed por decisión operativa» o `NP_SUB` «Alto BSW / corte de agua»? | R1 A-21 |
| 15 | Responsable por defecto de un workover, una prueba de pozo o una puesta en servicio programados: ¿«Operador-Operación» u «Operador-Planeación/Logística»? ¿Y del exceso de una parada planeada sobre su ventana? | Este plan, §2.1 y §2.2 |
| 16 | ¿Qué norma o procedimiento define cuándo la ANH cobra sobre una pérdida? ¿Es `resp_par` lo que decide la «responsabilidad del operador»? | R1 A-23 |
| 17 | ¿El crudo arrastrado con el agua de disposición se reporta como pérdida? ¿Dónde va el venteo intencional en el JSON? ¿Quiso decir «ya estando en superficie» (no «en subsuelo»)? ¿Qué es una «pitera»? | R2 §9-7, 9-8, 9-9 |
| 18 | ¿Podemos ver un extracto del árbol de diferidas de Ecopetrol (estructura, niveles, un ejemplo de rama)? ¿Su «nivel 6» es de una jerarquía propia o el de ISO 14224? | R2 §5.1 |
| 28 | **Campos de gas**: usted dijo que «tienen una tolerancia diferente en cuanto a paradas de pozo» [31:08]. ¿Qué cambia: la diferida de gas, el potencial, la nominación o el DCQ? ¿Una parada corta de un pozo de gas que no incumple la nominación es diferida? | Transcript [31:08]; S1 §3 punto 9, H9; SPE-36848 vía R2 §1.1 |
| 29 | ¿Un pozo que produce de varias formaciones lleva una fila de `paradas_pozo` por formación, o una sola? (a la ANH) | S1 H5 |
| 30 | En el archivo completo, ¿qué valor de `fuente_de_entrega` corresponde (`TELEMETRÍA`, `OFICIAL` o `POR DEMANDA`)? ¿`fecha_publicacion` es la fecha de generación? (a la ANH) | S1 H7; Dicc. 5 |

### 8.3 Para las fases 4 y 5 (a Edinson y a la operadora piloto)

| # | Pregunta | Fuentes |
|---|---|---|
| 19 | Clases de orden y tipos de aviso de su SAP: ¿qué significa cada uno (PM01/PM02/PM03, M1/M2/M3)? ¿El predictivo se registra como preventivo? | R3 §2.11, §6-12 |
| 20 | ¿El mantenimiento contratado entra en el % proactivo (SMRP lo excluye)? | R3 §3.4 T1 |
| 21 | Falla de ESP: ¿la definen por pull (workover) o por duración? ¿Hay registro de workover con fechas de instalación, arranque y pull? | R3 §2.6, E1-E3 |
| 22 | ¿Qué cifra abre la tarjeta de cada familia para su área de confiabilidad: MTBF, tiempo fuera, reparación activa o logística? | R3 §4.1; transcript [22:34] |
| 23 | Colectores de vibración y cámaras de termografía que usan (fabricante y formato de archivo); límites de zona y criterios de ΔT firmados | R3 §6-9, 6-16 |
| 24 | Campo exacto de la duración real en las confirmaciones (IDAUR) y la interfaz de escritura (BAPI u OData) que permite su integrador | R3 §6-13, 6-14 |

### 8.4 Para Adair

| # | Pregunta | Fuentes |
|---|---|---|
| 25 | Si el rojo es interlock, ¿las tres prioridades de alarma van en naranja y amarillo con forma distinta, o alguna usa azul? ¿Es la guía de estilo de una operadora concreta? | R4 §5.3; §2.9 |
| 26 | Por equipo piloto: ¿qué alarmas del first-out son disparos de protección (interlock) y cuáles son paradas por proceso? ¿Hay lazo SIS cableado con estado legible? | §2.9 |
| 27 | Para «falla de comunicación» (morado): ¿qué tiempo sin dato del PLC la define? | R4 §5.4 punto 3 |
| 32 | ¿Cuándo llegan los **datos de entrenamiento** del modelo que está consiguiendo, de qué equipo (multifásica o inyección) y con qué variables (las que listó en [36:51])? Sin ellos el equipo piloto del vigía no se puede validar | Transcript [33:45], [36:51]; S1 §3 punto 13, D10 |

## §9 Riesgos

| # | Riesgo | Probabilidad / impacto | Mitigación |
|---|---|---|---|
| R-01 | El receptor de la ANH espera la otra forma (texto en `cau_niv1`, tildes) y rechaza todo el 1-dic | Media / alto | Las dos formas listas (§1.2); archivo de prueba de cada una en F2; cambio por configuración firmada, sin migrar datos |
| R-02 | La ANH no contesta las preguntas críticas antes del 1-dic | Alta / medio | Toda respuesta pendiente tiene un interruptor (§3); se documenta en `10-pendientes.md` qué se asumió y desde cuándo |
| R-03 | Se rompen casos de `referencia/` o pantallas existentes al meter la clasificación | Baja si se respeta «al lado» / alto | Solo campos opcionales y archivos nuevos (R4 §7.3); `TipoCausa`, `libro.ts`, `diferido.ts` intocados hasta F3; `npm test` completo por entrega |
| R-04 | Demasiadas paradas `por-precisar`: la gente no alcanza a contestar antes de las 07:00 | Media / alto | Preguntas en palabras de campo, 1-3 toques (U1 §2.2); lote por causa raíz; aviso de las 22:00 y 05:00; tablero de correcciones para ajustar `REGLAS_ANH` |
| R-05 | Se reporta como confirmado algo que nadie miró («relleno automático») | Media / alto (auditoría ANH) | Procedencia guardada por dato; origen `C` para lo no confirmado; nunca `M` sin persona (§1.3) |
| R-06 | La operadora no tiene `id_rec`, `uwi` o formación por pozo a mano | Media / alto | Pedirlos en F0; V-10 bloquea; demo con `DEMO-` |
| R-07 | Dos verdades de la orden de trabajo (TRIM y SAP) | Media / medio | Modo `'sap'`: TRIM no guarda la orden, solo la captura hasta que SAP la acepta (§2.8) |
| R-08 | Confundir la diferida ANH con la de TRIM en pantalla (dos cifras distintas del «mismo» concepto) | Alta / medio | Rótulos distintos siempre, explicación que cuadra exacto (§2.5), el gerente solo ve la de TRIM con una línea «la ANH calcula X» |
| R-09 | Confundir el choke del campo con el de la parada | Media / medio | Dos nombres en el código y en pantalla (§1.7; U1 §3.1) |
| R-10 | El árbol de una operadora grande no cabe en el asistente (miles de hojas) | Media / medio | Herencia por subárbol (§1.10); caso de rendimiento con ≥ 1.000 hojas en F3 |
| R-11 | Cambiar el rojo a interlock confunde a quien ya usa TRIM | Baja / medio | Guía por operadora (`'trim'` sigue por defecto); forma + texto siempre |
| R-12 | **Gravamen** sobre pérdidas: la circular dice que la pérdida «podrá estar sujeta a gravamen por parte de la ANH, de acuerdo con la responsabilidad de la compañía operadora y la naturaleza del evento» (C24 p.4). Que eso sea regalía es inferencia de R2 §4.1 (nota 4 del Cuadro 4 de la Res. 40537), no texto. TRIM muestra un responsable que la operadora puede no querer declarar | Media / alto (plata) | TRIM no calcula gravamen (§2.4); en pantalla se cita la circular literal («gravamen»), nunca «regalías»; el responsable de una pérdida lo cierra producción, con evidencia; Neutralidad técnica (C24 p.5) en el ⓘ |
| R-13 | La ANH cambia la estructura con 10 días de plazo (Res. 0651 art. 15.1 par. 4) | Media / medio | Catálogo y forma de salida como datos versionados; validador con el Schema como archivo, no como código |
| R-14 | Cronograma: del 27-oct al 26-nov hay 21 días hábiles ≈ 12,6 persona-semanas con tres personas a tiempo completo; la versión anterior de F1+F2 pedía ≈ 15 (optimista) a 28 (punto medio) según R4 §8 (S1 §5.1) | Alta / alto | Recorte a lo que toca el archivo (§6), que cabe solo en el extremo optimista; punto de control el 14-nov con plan B (clasificación en tabla de Regulatorio); congelado el 26-nov |
| R-15 | El ambiente de pruebas de la ANH no responde o no explica rechazos | Media / medio | La validación propia es más estricta que el Schema (V-03, V-08 con formatos activados) |
| R-16 | Datos tardíos del PLC (reconexión) cambian un día ya enviado | Media / bajo | Envío marcado «con corrección pendiente»; corrección como envío nuevo (§2.6, §4.4) |
| R-17 | **Una fila de TRIM tumba el IDP entero de la operadora**: el canal rechaza el **reporte** («rechazará… reportes que no cumplan las reglas de validación estricta de paradas de pozo», C24 p.8) y mientras no se corrija «se considerará no recibido» (Res. 0651 art. 15.2 par. 1) | Media / alto | Validación propia más estricta que el Schema (§4.2); modo `fragmento` siempre validado; huella de lo que TRIM entregó frente a lo que la operadora envió; cláusula de responsabilidad en el contrato del piloto (S1 R-B) |
| R-18 | **`paradas_pozo` no cuadra con `t_prod`** (o con `t_iny` de los inyectores): la ANH tiene los nodos y puede cruzarlos; una diferencia es «inconsistencia de contenido» (Res. 0651 art. 15.2 par. 2) y abre la ventana de 1 h | Media / medio | V-16 y V-17 (§4.2); pedir a la operadora su `t_prod` y su `t_iny` para cuadrar antes de entregar (S1 R-C, R-H) |
| R-19 | **Nombres de personas en `desc_evid`**: viajarían a la ANH datos personales de trabajadores (régimen de la Ley 1581 de 2012; alcance exacto NO VERIFICADO) | Media / medio | `desc_evid` solo con roles; los nombres se quedan en `DatoClasificado` dentro de TRIM; lo mismo en el CSV de descarga (§1.3; S1 R-D) |
| R-20 | **Inflar el conteo de paradas**: partir por medianoche y reportar cada disparo multiplica filas, y una parada de 24 h sale como 23:59:59 h | Media / bajo | «Tramo n de m del evento …» en `desc_evid` mientras la ANH responde la pregunta 4 (S1 R-F) |
| R-21 | **Confundir los dos pilotos** (el equipo del vigía de Adair y la operadora del reporte ANH) y comprometer una fecha regulatoria sobre un piloto que nadie firmó | Alta / alto | Dos nombres, dos dueños y dos listas de dependencias (§3.2); puerta del 31-oct (§6) (S1 R-A) |
| R-22 | **Sin los datos de entrenamiento de Adair**, el vigía del equipo piloto no se puede validar | Alta / medio | Pregunta 32 en F0, con fecha; el equipo piloto del vigía se escoge por cuál llega primero con datos (§3.2) (S1 D10) |
| R-23 | **Campos de gas**: la diferida ANH del plan es solo de crudo, y Edinson advirtió que el gas tiene «una tolerancia diferente» [31:08] | Media / medio | Alcance declarado «solo crudo» (§2.5); pregunta 28; no ofrecer la diferida ANH a un campo de gas hasta la respuesta |
| R-24 | **Una señal tomada como prueba**: un código GF o una firma de variables reportada como causa confirmada cuando el daño era colateral (Hollman [37:34]) | Media / medio | Regla «una señal apunta» (§2.1): nunca `confirmada` sin una persona; la N2 la confirma quien abrió el equipo |

## Respuestas a UX

Leído `U1-experiencia.md` el 21-oct-2026 a las 12:15 y de nuevo a las 12:30, con su sección «Pedidos a producto» (P-1 a P-16).

| Pedido de U1 | Respuesta | Dónde quedó |
|---|---|---|
| **P-1** · Encender `reg`, `plan` y la pantalla `regulatorio` antes del 1-dic | **Sí para `reg` y Regulatorio, en F2. No para `plan` antes del 1-dic**: sin programa del técnico (F4) la planeadora no tiene qué armar, y la capacidad hasta el 26-nov no alcanza ni para lo que toca el archivo (§6). `plan` se enciende en F4; `cont` en F3. (Corrige mi respuesta anterior, que decía «Sí» sin la fecha; S1 P1-16) | §6, F2 y F4 |
| **P-2** · Marca «para revisar» distinta de `corregido` | **Sí.** `ParadaAnh.revision` (quién, hora, texto) | §1.5 |
| **P-3** · Volumen opcional con rango, y `donde` | **Sí.** `EventoPerdida.volumen: number \| null`, `rangoEstimado` y `donde`. Ajuste de nombres: los valores del rango van sin símbolos (`'menos-1' \| '1-10' \| '10-100' \| 'mas-100' \| 'no-se'`) para que sirvan como claves. `confirmada` exige volumen y método | §1.9 |
| **P-4** · Texto de la pregunta y etiqueta de cada opción en `precisar` | **Sí**, con una forma distinta: `{ pregunta, opciones: Array<{ pareja, texto }> }` en vez de `etiquetas: Record<CodigoN2, string>`, porque el arreglo guarda el **orden** de los botones | §1.10 |
| **P-5** · Formas para `diagnostico` y `dato-invalido` | **Sí.** Se llaman `circulo-i` (el «i» es parte de la forma) y `circulo-punteado-raya`. `diagnostico` entra en el orden de resolución entre `alarma-3` y `medicion-campana` | §1.13, §2.9 |
| **P-6** · Plantilla de WhatsApp del cierre (22:00 y 05:00) | **Sí**, en F2, hora configurable por campo | §6, F2 |
| **P-7** · Preguntas de campo como datos versionados | **Sí.** `PREGUNTAS_CAMPO@n`, igual que `REGLAS_ANH`; la propuesta guarda la versión en `DatoClasificado.regla` (`'preguntas:campo@n'`) | §1.3 (campo `regla`); F1 |
| **P-8** · Usar los nodos de primer nivel del árbol de la operadora como botones de «¿Qué lo paró?» (≤ 8) | **Sí, en F3**, y solo si la tabla de conversión firmada cubre esos nodos (si no, se volvería a preguntar). Antes de F3 se usan las preguntas de TRIM | §6, F3 |
| **P-9** · `hora` = la del toque | **Sí.** Es una excepción explícita a la regla del contrato «la hora la pone el servidor»: el cliente manda la hora del toque, el servidor la guarda en `hora` y la suya en `recibido`, y rechaza (`422`) una hora futura o anterior al inicio de la parada | §1.3; se anota en `CONTRATO.md` (§5.5) |
| **P-10** · Guardar el grupo de una confirmación en lote | **Sí.** `ConfirmacionLote` (qué paradas, qué cadena vio, quién y cuándo) y `DatoClasificado.lote` | §1.3 |
| **P-11** · Programa congelado | **Sí**, como entidad propia `ProgramaSemana` (con los cambios posteriores), en vez de un campo suelto | §1.12 |
| **P-12** · Motivo cuando no hay valor | **Sí**, con su nombre: `Lectura.motivoSinValor` | §1.12 |
| **P-13** · Hora corregida con motivo en el cierre | **Sí**, como `CierreOrden.correcciones` (arreglo: guarda t3 y t4 y la historia, no solo la última) | §1.12 |
| **P-14** · Notificación de 24 h del derrame | **Sí.** `EventoPerdida.notificacion24h`; TRIM muestra el reloj y registra quién notificó, no notifica | §1.9, §2.4 |
| **P-15** · Umbrales de las bandas (n = 2-4, 5-9, ≥ 10) fijos en `metricas.ts` | **Sí**, como parte de lo que no se configura (R3 §4.1). Se rotulan como decisión de producto, no de norma, igual que el n ≥ 3 de Weibull (R3 §6-17) | §1.11 (lista de lo no configurable) |
| **P-16** · Guía `'sitio'` por defecto (y el Desacuerdo 2 de U1: interlock en la guía `'trim'`) | **Sí, y más**: desde F3 las dos guías comparten los significados (interlock rojo con candado, alarma-1 naranja) y solo difieren en tonos; `'sitio'` es la de la operadora piloto y la de toda implementación nueva. Hasta F3 rige la paleta actual (P1 rojo), así que en F2 la banda de rechazo del IDP sale roja (S1 §2.2 c, P1-7) | §1.13, §2.9 |
| Morado compartido entre `sin-comunicacion` y `dato-invalido` (U1 §9.2) | **Aceptado, y acotado**: el morado tiene un solo significado («no le crea a este número») y solo esas dos condiciones lo usan. El paso sin respuesta («falta») va en gris con contorno discontinuo y la palabra «falta», no en morado; tampoco «sin prueba reportada» (S1 §2.2 c-1) | §1.13 |
| «Qué va en el archivo: … `pruebas_potenciales`» (U1 §6.2) | **Corrección**: TRIM **no** emite `pruebas_potenciales` (le faltan 18 de sus 24 campos obligatorios); la **lee**. Emite `paradas_pozo`, un fragmento opcional de `produccion_por_pozo` y el resumen de pérdidas | §4.1, §1.14 |
| Lo que confirma el operador (U1 §2.6, §3.2, §10.1; S1 §2.2 d) | El operador confirma solo lo que contestó (planeación, impacto, la parte); **por WhatsApp no confirma el choke ni la N1/N2**. El mensaje le muestra lo suyo y «el resto lo revisa su supervisor». Lo no revisado por `sup`, `prod`, `jefe` o `conf` sigue con origen `C` | §1.3, §2.1 |
| Botón «La planta no recibe o los tanques están llenos» (U1 §2.4; S1 §2.2 a) | Se parte: agua o proceso → `planta`; tanque de crudo lleno → pregunta «¿el oleoducto o el cliente estaba recibiendo?» | §3.3 |
| `perdida:registrar` para `reg` y comentario de `conf` en la conversión (S1 C-2, C-3) | `perdida:registrar` **no** se da a `reg`: el rechazo por especificación lo registra `prod`. Para `conf` se agrega la capacidad `anh:comentar` (escribe `FilaConversion.nota`, no cambia destinos) | §1.15 (fila nueva) |
| Orden de captura distinto del de la circular (U1 §2.1) | De acuerdo con preguntar en orden de campo y confirmar en el orden de la circular; la duda va en la pregunta 5 | §8.1 |

## Cambios al vocabulario

Cambios a §1 hechos después de su primera escritura (21-oct-2026, mañana):

| Fecha y hora | Cambio | Por qué |
|---|---|---|
| 21-oct-2026 12:11 | `CodigoN2`: el `slug` sale de una **regla fija** (N2 de la Tabla 1 en minúsculas, sin tildes, lo que no es letra o número → `-`). El ejemplo `NP_PROC/parada-estacion-bombeo` pasa a `NP_PROC/parada-estacion-bombeo-afecta-pozos`. Lista completa en el Anexo A | Evitar una tabla de slugs a mano; 117 códigos sin repetidos |
| 21-oct-2026 12:11 | `DiferidaAnhDia.explicacion`: `{ factor, prueba, sinEvento, resto }` → `{ prueba, factor, eventos, resto }` | La identidad de §2.5 suma exacto con «eventos» (la diferida del libro), no con «sin evento» |
| 21-oct-2026 12:30 | `EventoPerdida`: `volumen: number \| null`, `rangoEstimado`, `donde`, `notificacion24h`; `confirmada` exige volumen y método | U1 P-3 y P-14 |
| 21-oct-2026 12:20 | `DestinoConversion` `precisar`: `opciones: CodigoN2[]` → `{ pregunta, opciones: Array<{ pareja, texto }> }` | U1 P-4 |
| 21-oct-2026 12:20 | `GuiaEstilo` gana las formas `circulo-punteado-raya` y `circulo-i`; regla de color con la excepción del morado; `diagnostico` entra en el orden de §2.9 | U1 P-5 y §9.2 |
| 21-oct-2026 12:30 | `Lectura` gana `motivoSinValor`, `referencia` y `muestra`; `CierreOrden` gana `correcciones`; entidad nueva `ProgramaSemana` | U1 P-11, P-12, P-13 y §8.2-8.3 |
| 21-oct-2026 12:30 | `DatoClasificado` gana `recibido` y `lote` (`hora` = la del toque); entidad nueva `ConfirmacionLote`; `ParadaAnh.revision` | U1 P-2, P-9, P-10 |
| 21-oct-2026 12:20 | `EnvioIdp.nodos` ya no incluye `pruebas_potenciales`; se agrega `resumenPerdidas` | §4.1 (Schema: TRIM no tiene los 24 campos) |
| 21-oct-2026 12:45 | Regla del `slug` reescrita con exactitud: cada **racha** de caracteres no alfanuméricos → un solo `-`, sin `-` en los extremos; ñ → n. Los 117 códigos del Anexo A no cambian | S1 §1.3 (P1-12) |
| 21-oct-2026 12:45 | `FormaSalidaAnh` gana `cauGral` y `unidad`; tipo nuevo `CampoParada` (los 15 campos en el orden del Schema); tabla nueva `CAU_GRAL_DE_N1@1` (§1.2b) | S1 H1-H2 (P1-3) |
| 21-oct-2026 12:45 | `BaseClasificacion.descEvid: string` → `DatoClasificado<string>` (con origen `M` o `C`, sin nombres de personas, con «tramo n de m») | S1 H3, R-D, R-F (P1-3) |
| 21-oct-2026 12:45 | Confirmación **por paso**: tabla `PASOS_QUE_CONFIRMA`; `ConfirmacionLote.pasos`; `confirmada` = los 6 pasos con procedencia de persona de un rol que puede avalarlos | S1 §2.2 d (P1-6) |
| 21-oct-2026 12:50 | `RegistroAnhPozo` gana `campoAnh` (obligatorio) y `formaciones?`; `EventoPerdida` gana `choke?` | S1 H5, H6, H10 (opcionales 4 y 5) |
| 21-oct-2026 12:50 | Colores: el morado tiene un solo significado y solo lo usan `sin-comunicacion` y `dato-invalido`; marca de pantalla nueva `MarcaFalta` (gris, contorno discontinuo, no es `CondicionVisual`); las dos guías comparten significados (interlock rojo con candado, alarma-1 naranja) | S1 §2.2 c (P1-7) |
| 21-oct-2026 12:55 | `REGLAS_ANH` v1 gana la fila del first-out del variador o MCC de la bomba de la línea; regla nueva `regla:senal-apunta@1` | S1 P1-15, P1-11 |
| 21-oct-2026 12:55 | Reglas de validación nuevas V-16 (`t_prod`) y V-17 (`t_iny`); V-03 comprueba la unidad | S1 H2, H4, H8 (P1-4, P1-5) |
| 21-oct-2026 13:00 | Capacidad nueva `anh:comentar` (conf, reg); son 11 | S1 C-3 |
| 21-oct-2026 13:00 | Se distinguen «equipo piloto del vigía» y «operadora piloto del reporte ANH» (términos de pantalla y de plan, no del código) | S1 C-7 (P1-10) |

## Desacuerdos con otros agentes

- **R4 §1.7, fila `reinyeccion`/`transporte`** (todo a `NP_PROC`): desacuerdo parcial, resuelto en §3.1 con un híbrido. Tampoco adopto del todo R2 §3.3: R2 propone `NP_SUP` para cualquier parte con falla, y yo mando a `NP_PROC` las partes sin N2 exacto (sello, succión, filtro, impulsor, tornillos), porque forzar «Falla unidad de bombeo superficie (Componentes)» —que describe la unidad de bombeo mecánico— no es una causa «exacta, puntual y verificable» (C24 p.5).
- **R4 §1.7, fila `evacuacion`** (siempre `NP_TRANSP`/`EXPORTACION`): coincido con R2 §7 punto 2; resuelto en §3.3.
- **R2 §5.4, patrón 5** («la tabla la firma … contabilidad/regulatorio, `cont`/`reg`»): `cont` en `roles.ts` es Abastecimiento y contratos, no contabilidad. Propongo que firme solo `reg` (`anh:firmar`) y que `adm` prepare (§1.15).
- **U1 §6.2** («QUÉ VA EN EL ARCHIVO … pruebas_potenciales»): ver «Respuestas a UX»; TRIM no emite ese nodo.
- **U1 §9.2** (morado compartido): no es desacuerdo; acepté la excepción y cambié la regla de §1.13.
- Con **R1** y **R3** no hay desacuerdos de fondo. Uso de R1 su propuesta de clave en `cau_niv1` como salida por defecto (A-3), con la otra forma lista (§3.5).

**Con S1 (`S1-revision.md`), ronda de corrección del 21-oct.** Apliqué los 16 cambios obligatorios de S1 §7.1. Dos los hice distinto de la redacción propuesta y uno lo matizo:
- **P1-8 (logística):** escogí la primera de las dos opciones de S1 (adelantar L3, L4 y L5 a F4 desde el cierre del modo `'liviano'`), no la de sacarlas de `cifraPrincipal`. Es el pedido literal de Edinson [22:34] y R3 §4.1 dice que L3-L5 solo necesitan el cierre en el teléfono. L1, L2, L6 y L7 (que necesitan SAP) siguen en F5.
- **P1-15 (variador):** agregué la fila, pero no por `ParteId` (no existe una parte «variador»): la regla lee el tag de la **primera alarma** y la clase del tag se configura por equipo en `Config.protecciones`. Sin ese tag configurado, la parada sigue cayendo en «sin parte» → `NP_PROC`.
- **P1-6 (confirmación por paso):** de acuerdo, con un matiz: S1 da los 6 pasos solo a `sup` y `prod`; yo los doy también a `jefe` y `conf`, que tienen `causa:completar` y son quienes abren el equipo o lo analizan (`tipos.ts:194-200`). La regla «una señal apunta» (P1-11) exige justamente que la N2 la confirme quien abrió el equipo.
- **El 8-dic y los fines de semana (S1 §5.1, D11):** de acuerdo en que es una dependencia; no la convierto en entregable de producto, sino en condición de la puerta del 31-oct (§6, F0): sin quién cubra de 05:00 a 08:00 no se firma el piloto.

## Anexo A · Los 117 códigos internos de N2 (versión `C024-2026`)

Generados con la regla de §1.2 sobre la Tabla 1 transcrita en R1 §1.5 (C24 p.6-7). Entre « » va la cadena exacta de la Tabla 1, que es la que se serializa en la forma `C024-2026`. Ningún código se repite. Para `DICC-V3.2`, la forma de salida mapea estos mismos códigos a las cadenas del Diccionario (Dicc. 141) y `EQUIVALENCIA_VERSIONES` cubre la pareja que cambia de N1 (`NP_CTRL/falla-instrumento-sensor` → `NP_INS/falla-instrumento-sensor`).

| N1 | n | Códigos internos «cadena de la Tabla 1» |
|---|---|---|
| `P_MANT_ELE` | 9 | `P_MANT_ELE/transformador` «Transformador» · `P_MANT_ELE/acometida-electrica` «Acometida eléctrica» · `P_MANT_ELE/ups-fuente` «UPS / Fuente» · `P_MANT_ELE/generador` «Generador» · `P_MANT_ELE/protecciones-electricas` «Protecciones eléctricas» · `P_MANT_ELE/cableado-electrico` «Cableado eléctrico» · `P_MANT_ELE/mcc-switchgear` «MCC / Switchgear» · `P_MANT_ELE/vsd` «VSD» · `P_MANT_ELE/red-interna-bt-mt-at` «Red interna BT/MT/AT» |
| `P_MANT_MEC` | 7 | `P_MANT_MEC/unidad-de-bombeo-superficie` «Unidad de bombeo superficie» · `P_MANT_MEC/caja-reductora` «Caja reductora» · `P_MANT_MEC/correas-poleas` «Correas / Poleas» · `P_MANT_MEC/bomba-superficie` «Bomba (superficie)» · `P_MANT_MEC/compresor` «Compresor» · `P_MANT_MEC/lubricacion` «Lubricación» · `P_MANT_MEC/sistema-de-levantamiento-artificial` «Sistema de Levantamiento Artificial» |
| `P_MANT_INS` | 6 | `P_MANT_INS/calibracion-instrumentos-presion` «Calibración instrumentos presión» · `P_MANT_INS/calibracion-instrumentos-nivel` «Calibración instrumentos nivel» · `P_MANT_INS/sensores-fondo` «Sensores fondo» · `P_MANT_INS/instrumentacion-superficie` «Instrumentación superficie» · `P_MANT_INS/verificacion-lazos-de-control` «Verificación lazos de control» · `P_MANT_INS/valvulas-de-control` «Válvulas de control» |
| `P_MANT_INT` | 6 | `P_MANT_INT/inspeccion-lineas-internas` «Inspección líneas internas» · `P_MANT_INT/inspeccion-valvulas` «Inspección válvulas» · `P_MANT_INT/inspeccion-tubing-casing` «Inspección tubing / casing» · `P_MANT_INT/cambio-de-tramo-de-linea` «Cambio de tramo de línea» · `P_MANT_INT/reparacion-por-corrosion` «Reparación por corrosión» · `P_MANT_INT/reemplazo-de-valvulas` «Reemplazo de válvulas» |
| `P_WO` | 4 | `P_WO/workover-recompletacion` «Workover / recompletación» · `P_WO/cambio-zona-productora` «Cambio zona productora» · `P_WO/canoneo-fractura-estimulacion` «Cañoneo / fractura / estimulación» · `P_WO/servicio-contratado-equipo` «Servicio contratado (equipo)» |
| `P_PRUEBAS` | 4 | `P_PRUEBAS/prueba-de-pozo-presion-transiente-produccion-potencial-plt-ilt-otros` «Prueba de pozo (presión transiente, producción, potencial, PLT, ILT, otros)» · `P_PRUEBAS/prueba-de-integridad` «Prueba de integridad» · `P_PRUEBAS/verificacion-calibracion-metrologia` «Verificación/calibración (metrología)» · `P_PRUEBAS/hazop-verificacion-de-seguridad` «HAZOP / verificación de seguridad» |
| `P_PES` | 3 | `P_PES/comisionamiento` «Comisionamiento» · `P_PES/reintegro-tras-overhaul` «Reintegro tras overhaul» · `P_PES/hook-up-puesta-en-marcha` «Hook-up / puesta en marcha» |
| `P_OP` | 3 | `P_OP/curtailed-por-decision-operativa` «Curtailed por decisión operativa» · `P_OP/optimizacion-ramp-up-controlado` «Optimización / ramp-up controlado» · `P_OP/operacion-por-balance-de-inventarios` «Operación por balance de inventarios» |
| `NP_CLIMA` | 6 | `NP_CLIMA/tormenta-electrica-descargas` «Tormenta eléctrica / descargas» · `NP_CLIMA/deslizamiento-derrumbe` «Deslizamiento / derrumbe» · `NP_CLIMA/incendio-natural` «Incendio (natural)» · `NP_CLIMA/otro-evento-natural` «Otro evento natural» · `NP_CLIMA/inundacion-desborde-de-rio` «Inundación / Desborde de río» · `NP_CLIMA/fuertes-lluvias-vias-intransitables` «Fuertes lluvias / vías intransitables» |
| `NP_OPUB` | 8 | `NP_OPUB/paro-gremios-transportadores` «Paro gremios / transportadores» · `NP_OPUB/grupo-armado-amenaza-seguridad` «Grupo armado / amenaza seguridad» · `NP_OPUB/hurto` «Hurto» · `NP_OPUB/sabotaje-atentado` «Sabotaje / atentado» · `NP_OPUB/vandalismo-dano-intencional` «Vandalismo / daño intencional» · `NP_OPUB/orden-publico-pendiente-detalle` «Orden público - Pendiente detalle» · `NP_OPUB/bloqueo-comunidad-ingreso-a-locacion` «Bloqueo comunidad / ingreso a locación» · `NP_OPUB/bloqueo-indigena-ingreso-a-locacion` «Bloqueo indígena / ingreso a locación» |
| `NP_ENEXT` | 4 | `NP_ENEXT/corte-energia-proveedor` «Corte energía proveedor» · `NP_ENEXT/baja-alta-tension-del-proveedor` «Baja/alta tensión del proveedor» · `NP_ENEXT/falla-subestacion-externa` «Falla subestación externa» · `NP_ENEXT/acometida-externa-afectada-poste-red-externa` «Acometida externa afectada (poste/red externa)» |
| `NP_ENINT` | 13 | `NP_ENINT/falla-transformador` «Falla transformador» · `NP_ENINT/falla-mcc-switchgear` «Falla MCC/Switchgear» · `NP_ENINT/falla-ups-fuente` «Falla UPS/Fuente» · `NP_ENINT/falla-generador-local` «Falla generador local» · `NP_ENINT/falla-cableado-interno-empalmes` «Falla cableado interno/empalmes» · `NP_ENINT/falla-protecciones-breaker-fusible-rele` «Falla protecciones (breaker/fusible/relé)» · `NP_ENINT/punto-caliente` «Punto Caliente» · `NP_ENINT/falla-sistema-a-tierra` «Falla Sistema a Tierra» · `NP_ENINT/falla-por-fauna` «Falla por Fauna» · `NP_ENINT/falla-por-flora` «Falla por Flora» · `NP_ENINT/falla-por-falta-de-mantenimiento` «Falla por falta de Mantenimiento» · `NP_ENINT/falla-vsd` «Falla VSD» · `NP_ENINT/falla-red-interna-bt-mt-at` «Falla red interna BT/MT/AT» |
| `NP_INS` | 11 | `NP_INS/falla-transmisor-de-presion` «Falla transmisor de presión» · `NP_INS/falla-transmisor-de-nivel` «Falla transmisor de nivel» · `NP_INS/falla-sensor-fondo` «Falla sensor fondo» · `NP_INS/instrumento-fuera-de-rango` «Instrumento fuera de rango» · `NP_INS/instrumento-sin-senal` «Instrumento sin señal» · `NP_INS/dano-por-humedad-inundacion` «Daño por humedad / inundación» · `NP_INS/dano-por-tormenta-electrica` «Daño por tormenta eléctrica» · `NP_INS/hurto-de-instrumentacion` «Hurto de instrumentación» · `NP_INS/instrumentacion-manipulada-por-terceros` «Instrumentación manipulada por terceros» · `NP_INS/falla-por-falta-de-mantenimiento` «Falla por falta de Mantenimiento» · `NP_INS/error-de-calibracion` «Error de calibración» |
| `NP_CTRL` | 6 | `NP_CTRL/falla-plc-cpu` «Falla PLC/CPU» · `NP_CTRL/falla-scada-red-comunicaciones` «Falla SCADA/red/comunicaciones» · `NP_CTRL/falla-hmi-servidor` «Falla HMI/Servidor» · `NP_CTRL/falla-instrumento-sensor` «Falla Instrumento/sensor» · `NP_CTRL/perdida-linea-de-vista-flora` «Perdida Línea de Vista (Flora)» · `NP_CTRL/falla-configuracion-parametrizacion` «Falla configuración/parametrización» |
| `NP_SUB` | 6 | `NP_SUB/falla-esp` «Falla ESP» · `NP_SUB/falla-pcp` «Falla PCP» · `NP_SUB/falla-gas-lift` «Falla Gas Lift» · `NP_SUB/arenamiento-obstruccion` «Arenamiento / obstrucción» · `NP_SUB/integridad-de-pozo-packer-tubing-casing` «Integridad de pozo (packer/tubing/casing)» · `NP_SUB/alto-bsw-corte-de-agua` «Alto BSW / corte de agua» |
| `NP_SUP` | 6 | `NP_SUP/falla-unidad-de-bombeo-superficie-componentes` «Falla unidad de bombeo superficie (Componentes)» · `NP_SUP/falla-rodamiento-cojinete-bearing-box` «Falla rodamiento/cojinete (bearing box)» · `NP_SUP/falla-caja-reductora-lubricacion` «Falla caja reductora / lubricación» · `NP_SUP/falla-correas-poleas` «Falla Correas / Poleas» · `NP_SUP/falla-motor-superficie` «Falla motor superficie» · `NP_SUP/falla-sistema-de-levantamiento-artificial` «Falla Sistema de Levantamiento Artificial» |
| `NP_INTEG` | 4 | `NP_INTEG/pitting-corrosion` «Pitting / corrosión» · `NP_INTEG/fuga-dano-en-linea-interna` «Fuga / daño en línea interna» · `NP_INTEG/dano-valvula-acople-union` «Daño válvula/acople/unión» · `NP_INTEG/cambio-de-tramo-valvuleria-correctivo` «Cambio de tramo/valvulería (correctivo)» |
| `NP_PROC` | 4 | `NP_PROC/tanques-llenos-capacidad-limitada` «Tanques llenos / capacidad limitada» · `NP_PROC/capacidad-tratamiento-agua-crudo-limitada` «Capacidad tratamiento agua/crudo limitada» · `NP_PROC/capacidad-compresion-transferencia-gas-limitada` «Capacidad compresión/transferencia gas limitada» · `NP_PROC/parada-estacion-bombeo-afecta-pozos` «Parada estación/bombeo afecta pozos» |
| `NP_TRANSP` | 4 | `NP_TRANSP/oleoducto-externo-fuera-de-servicio` «Oleoducto externo fuera de servicio» · `NP_TRANSP/atentado-sabotaje-oleoducto-externo` «Atentado/sabotaje oleoducto externo» · `NP_TRANSP/restriccion-nominacion-entrega` «Restricción nominación/entrega» · `NP_TRANSP/terminal-cliente-no-recibe` «Terminal/cliente no recibe» |
| `NP_AUT` | 3 | `NP_AUT/restriccion-autoridad` «Restricción autoridad» · `NP_AUT/restriccion-ambiental` «Restricción ambiental» · `NP_AUT/suspension-orden-autoridad` «Suspensión/orden autoridad» |
