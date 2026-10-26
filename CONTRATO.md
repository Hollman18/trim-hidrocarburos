# Contrato de la API · TRIM Hidrocarburos

Este repositorio es **front**. Lo que sigue es lo que el front necesita del backend, endpoint
por endpoint, con las reglas que el servidor tiene que aplicar. Hay tres fuentes de verdad, y
este documento las resume sin reemplazarlas:

| Qué | Dónde | Cómo se prueba |
|---|---|---|
| La **forma JSON** de cada respuesta (rutas, parámetros, códecs) | [`src/shared/api/contrato.ts`](src/shared/api/contrato.ts) y [`cable.ts`](src/shared/api/cable.ts) | `npm run verificar:contrato` |
| Las **reglas de cada escritura** (403, 404, 409, 422, en su orden) | [`src/shared/api/escrituras.ts`](src/shared/api/escrituras.ts): en el demo, ese módulo ES el servidor (y las del árbol de paradas dan su HTTP y su código, C-22) | `npm run verificar` (secciones 6c, 8b, 11, 15 y 16) y `node scripts/referencia.mjs comparar --base-url=… --escrituras` |
| Los **números** (libro, predicción, salud, riesgo, SAP, aciertos, asignación) | `src/entities/*.ts`; los insumos con que se calculan, en `referencia/insumos/` | `npm run verificar` y `node scripts/referencia.mjs comparar --base-url=…` |

`simulador-api/` (Node + SQLite, sin dependencias) implementa **solo el registro de la cadena
de datos**: procedencia, inventario, pendientes, asociar un tag, inscripción y nacimiento del
borde. Lo demás (libro, configuración, usuarios, SAP, mensajes, predicciones, informes,
asignación) lo calcula hoy el demo dentro del front, con la misma forma de respuesta que el
backend tiene que dar. **El simulador no es el servidor de producción.**

---

## Por dónde empezar

> El documento técnico completo para construir el backend está en [`docs/backend/`](docs/backend/README.md): la fórmula, el ejemplo calculado y el texto en pantalla de cada cifra, las pantallas anotadas, el modelo de datos en PostgreSQL y lo que falta decidir. Este contrato es su anexo A.

Para quien construye el backend, en este orden:

1. **Leer «Quién calcula qué», «Sesión» y «Reglas del cable»** de este documento. Son las tres
   decisiones que todo lo demás supone.
2. **La sesión** (`GET /api/sesion` y el token). Sin ella ninguna escritura sabe quién firma ni
   sobre qué campos.
3. **Los insumos del borde** (sección «Insumos que el backend entrega»): el registro de la
   cadena de datos ya tiene esquema de referencia en
   [`simulador-api/esquema.sql`](simulador-api/esquema.sql) (en producción, PostgreSQL +
   TimescaleDB) y una implementación de referencia en `simulador-api/`. La forma de los
   insumos que el motor consume está en `src/entities/insumos.ts` (interfaz `Insumos`), y
   `referencia/insumos/` trae los de los cinco campos del demo ya en JSON, con la forma de
   cada endpoint de insumo: con ellos se carga la base de pruebas sin leer TypeScript.
4. **Los diez GET del arranque** (sección «Arranque»). El front los pide en paralelo antes de
   pintar y, si uno falla, no arranca a medias: lo dice en pantalla.
5. **Las vistas calculadas** (`/api/vistas/…`). La forma más corta de dar el mismo número es
   correr el motor de `src/entities/` (TypeScript puro, sin React) en un servicio Node con los
   insumos de la base. Si se reescribe en otro lenguaje, `referencia/` dice con qué insumos
   (`referencia/insumos/`) y qué tiene que salir.
6. **Las escrituras**, con las reglas de la sección «Escrituras» y los umbrales de
   `src/entities/reglas.ts`.
7. **Comprobar** (sección «Cómo se comprueba un backend»): la referencia por HTTP, el front
   apuntado al servidor (`VITE_FUENTE=http`) y los flujos de navegador.
8. **Lo que falta** está al final: «Pendiente en el front para producción» y «Pendiente del lado
   del servidor».

---

## Quién calcula qué

Lo que decide un número o un permiso lo calcula el servidor; el front solo lo muestra. Las
reglas de lo que entra a mano corren en los dos lados: el front las usa para avisar antes de
mandar, y el servidor las vuelve a correr y **sus 422 mandan**.

| Dueño | Qué (módulos de `src/entities/` o de `src/shared/`) |
|---|---|
| **Servidor** | Todo lo que lee los insumos o sale de ellos: `libro`, `diferido`, `causa-senal`, `salud`, `vigia`, `esp`, `metrologia`, `sap` (lo que se lee de SAP), `aciertos`, `mensajes` (el registro y su texto), `equipo-vivo`, `flota`, `escenarios` (ciclo ANTES / DURANTE / DESPUÉS), `informe` (`cifrasDe`, `formaCanonica`, la huella), el modelo choke (`choke`: el tramo de cada parada, lo que limita, la brecha por tramo y por escalón, la tubería y la serie; `choke-agua`; `criticidad`; la vista previa `choke-config.impactoConfig`) y el árbol de paradas de la ANH (`anh-paradas`, `anh-clasificacion`: las filas y su propuesta, con lo que dijeron las personas encima; `anh-calidad`). También los datos de catálogo del campo: máquinas y perfiles de bomba, catálogo de equipos y de daños, el límite de cada tag (`limites`: banda normal y alarma), metrología, punto de medición oficial y topología de planta. |
| **Los dos** | Las reglas de lo que entra a mano: `configuracion.validarConfig` y `camposTocados`, la meta o el perfil vigente de un campo (`perfilDe`, `metaEn`, `metaEntre`, `criterioEn`, `tanqueDe`), `usuarios.revisarAcceso` y `camposAsignados`, `reglas.ts` (`MOTIVO_MINIMO` = 5, `NOMBRE_MINIMO` = 3, `TEXTO_LIBRE_MINIMO` = 8), `planta.aplicarCambioPlanta`, `plan.leerPlan`, `asignacion.leerAsignacion` y `cotejar`; la topología del choke (`choke.validarTopologia`, dentro de `validarConfig`; el tramo sale del alcance con `chokeDeAlcance` y el alcance del número de pozos con `alcancePorPozos`; la carga por CSV `choke-config.leerTopologia`) y la coherencia de la clasificación ANH (`clasificar` y `problemasDeClasificacion`: el códec la vuelve a revisar al entrar). |
| **Front** | `reloj` (los períodos salen de `calendarioDe(ahora)`), `shared/lib/formato`, `planta.armar` (el dibujo), `cadena` (las frases de la procedencia), los nombres de los catálogos de normas, y ordenar o filtrar lo que ya llegó. |

La misma división, con más detalle, está en la cabecera de `src/shared/api/diferidos.ts`.

---

## Sesión y autenticación

**La identidad sale del token, nunca de la petición.** La persona, su rol, sus campos y sus
capacidades los resuelve el servidor desde el token de sesión. No se aceptan del segmento de
rol de la dirección (`#/rol/…`), ni de un cuerpo, ni de una cabecera que mande el navegador.

#### `GET /api/sesion`
```json
{ "datos": { "persona": { "id": "sup", "nombre": "Nelson Ortiz" },
             "rolId": "sup", "nivel": "operacion",
             "campos": ["ceiba"],
             "capacidades": ["causa:declarar", "evidencia:exportar", "sap:aviso"] } }
```
`401 { "error": { "codigo": "sin-sesion", … } }` si no hay sesión válida. `campos` es
`"todos"` o una lista: son los que el gerente le dio a la persona en el registro de usuarios
(`camposAsignados` en `usuarios.ts`), no los de fábrica del rol. Una persona suspendida o
invitada que todavía no entró no tiene sesión.

**Inicio y fin de sesión.** TRIM no guarda contraseñas: la sesión la emite el servicio de
identidad del cliente (OIDC / SSO), y el token lleva el id de la persona. «Cambiar contraseña»
y «Cerrar las demás sesiones» son de ese servicio; mientras no esté conectado, Mi perfil
muestra el hueco y «Cerrar sesión» no aparece en el menú (volverá cuando exista la sesión).

**No hay suplantación en el producto.** La capacidad `rol:suplantar` se quitó. El menú
«Cambiar de rol» y el rol de la dirección son del **demo**, que no tiene inicio de sesión. Si
algún día soporte necesita «ver como», es **de solo lectura**: el token conserva las
capacidades de la persona real, toda escritura con la suplantación activa responde `403`, y
`por` es siempre la persona real. `GET /api/sesion` lo diría con `suplantando: { rolId }`.

**Atajos del prototipo, que producción ignora:**
- Las escrituras de `escrituras.ts` mandan la cabecera `x-rol` con el rol que se está viendo.
- El registro de la cadena (`procedencia.ts`, `registro.ts`) manda `x-capacidades`, separadas
  por coma, y el simulador decide con ella.

> En el front, leer la sesión de `GET /api/sesion` al arrancar (en vez del rol de la
> dirección) y quitar esas dos cabeceras es trabajo pendiente («Pendiente en el front para
> producción», al final).

### Las capacidades

Cada capacidad es un permiso que el servidor revisa en un endpoint (`403` sin ella). Son
trece (`Capacidad` en `entities/tipos.ts`, reparto por rol en `entities/roles.ts`):

| Capacidad | Endpoint |
|---|---|
| `causa:declarar` | `POST /api/paradas/:evento/respuesta` |
| `causa:completar` | `POST /api/paradas/:evento/respuesta` y `POST /api/analisis/:evento` |
| `evidencia:exportar` | `POST /api/informes` |
| `conector:configurar` | `POST /api/campos/:campo/tags/:tag/equipo`, `POST /api/inscripcion`, `POST /api/planta/cambios`, y el bloque `tecnico` de la procedencia |
| `config:firmar` | `POST /api/configuracion` con cambios técnicos |
| `metas:firmar` | `POST /api/configuracion` con metas, precio o regla de cierre |
| `usuarios:administrar` | `POST /api/usuarios`, `PATCH /api/usuarios/:id` y el registro completo de `GET /api/usuarios` |
| `sap:aviso` | `POST /api/sap/avisos` |
| `asignacion:cargar` | `POST /api/asignacion-oficial` (producción: la reemplaza quien la reporta, no cualquiera con el campo) |
| `planes:decidir` | `POST /api/planes/:id` (aceptar o marcar ejecutado un plan del ciclo ANTES / DURANTE / DESPUÉS; supervisor, jefe de mantenimiento, confiabilidad) |
| `anh:clasificar` | `POST /api/anh/paradas/:id/clasificacion`, `POST /api/anh/paradas/:id/respuesta`, `POST /api/anh/paradas/:id/revision` y `POST /api/anh/paradas/confirmar` con una sola parada, aunque traiga varias filas de la misma raíz (los días de un pozo o los pozos de una cascada: B-07) (quien declara: supervisor, operador, técnico, producción, jefe de mantenimiento y confiabilidad; cada rol dice solo los pasos que son suyos, `PASOS_QUE_DECLARA`, y contesta solo sus preguntas, `ROLES_QUE_CONTESTAN`) |
| `anh:confirmar` | `POST /api/anh/paradas/confirmar` con varias paradas de la misma cadena, en lote (quien firma el día: supervisor y producción) |
| `anh:yacimiento` | `POST /api/anh/paradas/:id/yacimiento` («En el yacimiento» en el paso 2, con su evidencia: producción y confiabilidad) |

El gerente no tiene ninguna de las tres de la ANH: no ve el detalle técnico. La topología del
choke la firma `config:firmar` (es configuración técnica): su vista previa y su carga por CSV
piden la misma capacidad.

**Nivel de detalle.** Cada rol trae su nivel: `decision` (gerente), `operacion` (supervisor,
operador, técnico) o `ingenieria` (producción, confiabilidad, mantenimiento, administración).
Los números son los mismos en los tres; cambia qué se muestra. A nivel `decision` el servidor
puede omitir señales, tags, tolerancias y custodia de las respuestas: el front no los pinta.

### Las escrituras se limitan a los campos de la persona

**Regla general:** toda escritura resuelve el campo **desde el recurso** (el evento del PLC,
el equipo, el tag) o desde el cuerpo cuando el recurso no existe todavía, y responde `403` si
ese campo no está entre los campos de la persona del token. La capacidad dice **qué** puede
hacer; los campos, **dónde**. Lo mismo vale para las lecturas: una dirección con un campo
ajeno no devuelve datos de ese campo.

| Escritura | De dónde sale el campo |
|---|---|
| `POST /api/paradas/:evento/respuesta` y `POST /api/analisis/:evento` | del evento del PLC (`404` si no existe; `422` si el `campoId` del cuerpo no es el del evento) |
| `POST /api/sap/avisos` | `campoId` del cuerpo |
| `POST /api/configuracion` | **cada campo que el cambio toca** (`camposTocados` en `configuracion.ts`: metas y perfil, y el campo de antes y el de después de cada tanque, respaldo o parada del programa que cambia). El membrete es de la empresa, no de un campo |
| `POST /api/informes` | `campos` del cuerpo (todos tienen que ser de la persona) |
| `POST /api/asignacion-oficial` | `campoId` de cada fila |
| `POST /api/planta/cambios` | `campo` del cuerpo |
| `POST /api/inscripcion` | `campo` del cuerpo |
| `POST /api/campos/:campo/tags/:tag/equipo` | `:campo` de la ruta, que tiene que ser el del tag |
| `POST /api/usuarios`, `PATCH /api/usuarios/:id` | ver «Usuarios»: nadie otorga campos que no tiene |
| `POST /api/planes/:id` | del plan (`cicloValor` → `campoId`; `404` si el id no existe) |
| `POST /api/anh/paradas/:id/clasificacion`, `…/yacimiento`, `…/respuesta`, `…/revision` y `POST /api/anh/paradas/confirmar` | del evento del controlador de cada fila (el id es `${evento}@${día}#${n}`). Una fila que no existe y una de un campo que la persona no tiene responden **lo mismo**, `404` (C-20: el id lleva pozo y día; no se dice si existe). En lote o en cascada, todas tienen que ser de la persona |
| `POST /api/configuracion/vista-previa` | cada campo que el cambio toca (`camposTocados`, como la firma) |
| `POST /api/topologia/importar` | `campo` del cuerpo (`404` si no está en el registro) |

El demo aplica la misma regla en `escrituras.ts` (`camposAsignados`, `revisarEvento`) y
`verificar-libro` la prueba en la sección 16.

---

## Reglas del cable

Todas las respuestas del front (`src/shared/api/contrato.ts`) siguen estas reglas:

- **Sobre:** el cuerpo es `{ "datos": …, "refs": { … } }`. Las escrituras responden
  `{ "datos": … }`.
- **Entidades por clave:** lo que muchas filas comparten viaja **una vez** en `refs` y las filas
  lo nombran por clave, en texto: `refs.pozos["<campoId>/<pozoId>"]` = `Pozo` tal cual, con sus
  pruebas; `refs.eventos["<id>"]` = `EventoPozo`; `refs.perfiles["<campoId>/<equipo>"]` =
  `PerfilBomba`.
- **Fechas** (los campos `Date` del motor): ISO 8601 con zona y milisegundos, en hora de
  Colombia (`"2026-10-02T14:00:00.000-05:00"`). Se acepta cualquier zona explícita; **sin zona
  el front la rechaza**.
- **Opcionales:** un opcional ausente se **omite**. `null` solo donde el dominio dice null
  («sin dato del fiscal», «sigue abierta»).
- **Horas que nunca llegan:** `Colchon.horas` y `Colchon.rango` van en `null` cuando el tanque
  no se llena (`Infinity` en el motor; JSON no lo tiene).
- **Bandas abiertas:** `Senal.normal` es `[baja, alta]` con `null` del lado abierto
  («< 85» → `[null, 85]`).
- **Lo que puede no existir** (un pozo, un equipo, una ficha, la base de tres meses, los
  relojes sin datos) va con `"datos": null` y HTTP 200, no con 404: la pantalla muestra el
  hueco.
- **Precio sin configurar** viaja como `null` (o se omite) y nunca vale 0. El front lo vuelve
  ausente en el borde: el códec de la configuración firmada (`GET /api/configuracion/historial` y
  la respuesta de `POST /api/configuracion`) pasa por `normalizarConfig`.
- **Lado de alarma que no existe** (`alarma.alta` o `alarma.baja` de un límite o de una señal)
  puede venir en `null`: al entrar se vuelve ausente. Un `null` comparado como número sería una
  alarma en 0.
- **Respuestas del registro de la cadena** (procedencia, inventario, pendientes, asociar,
  inscripción, nacimiento): el objeto tal cual, sin sobre. No comparten entidades.

### Error único

Todo error, también los del registro de la cadena de datos, es JSON con este cuerpo:
```json
{ "error": { "codigo": "sin-capacidad", "mensaje": "Su rol no envía avisos a SAP.", "…": "…" } }
```
El `mensaje` se muestra tal cual a la persona, así que va en español y sin detalles internos.
El `codigo` es lo que se compara. Hoy el front decide por código solo en un caso:
`tag-no-registrado` en el 404 de la procedencia. Cualquier otro 404, o una respuesta que no
sea JSON, el front la trata como **«no hay servicio»**, no como una afirmación sobre el dato.

| HTTP | Cuándo | Códigos en uso |
|---|---|---|
| 400 | JSON roto, cuerpo que no es objeto, un campo del cuerpo con otra forma (un texto donde va una lista, un número donde va un texto: C-11, se responde con la ruta, «`pasos.impacto` tiene que ser un texto»), `%` mal formado, nacimiento mal formado, origen distinto de `manual`/`regla`, un parámetro de una vista que no se puede leer | `peticion-invalida`, `url-invalida` |
| 401 | Sin sesión válida | `sin-sesion` |
| 403 | Sin la capacidad, sin persona activa o fuera de los campos asignados | `sin-capacidad`, `sin-permiso`, `gateway-de-otro-campo` |
| 404 | No existe el recurso o la ruta | `no-encontrado`, `tag-no-registrado`, `campo-desconocido`, `equipo-desconocido`, `ruta-no-encontrada` |
| 409 | Otro llegó antes (versión, respuesta, aviso abierto, último gerente) | `conflicto`, `version-cambio`, `tag-de-otro-gateway` |
| 413 | Cuerpo de más de 2 MB | `cuerpo-muy-grande` |
| 422 | La forma o una regla del dominio | `peticion-invalida` o uno propio (`texto-corto`, `acceso-invalido`, `descripcion-corta`…) |
| 5xx | Lo inesperado: **sin el mensaje interno** (SQL, rutas del servidor) | `interno` |

**Las escrituras de la clasificación ANH** (`/api/anh/paradas/…`) usan estos códigos (C-22):

| HTTP | Código | Cuándo |
|---|---|---|
| 400 | `peticion-invalida` | el cuerpo no tiene la forma del contrato (antes de cualquier regla) |
| 403 | `sin-capacidad` | sin `anh:clasificar`, `anh:confirmar` (lote) o `anh:yacimiento` |
| 403 | `rol-desconocido` | el rol de la sesión no está entre los del producto (uno de la versión 2 o inventado: el servidor no le presta las capacidades de otro, C-14) |
| 403 | `sin-persona` | nadie con acceso activo tiene ese rol |
| 403 | `paso-ajeno` | un paso que el rol no dice (`PASOS_QUE_DECLARA`) o no confirma (`PASOS_QUE_CONFIRMA`), o una pregunta que no contesta (`ROLES_QUE_CONTESTAN`) |
| 404 | `no-encontrado` | la fila no existe **o es de un campo que la persona no tiene** (la misma respuesta, C-20) |
| 409 | `cadena-cambio` | la cadena que vio la persona ya no es la de la fila (o la de alguna fila del lote) |
| 409 | `pregunta-cerrada` | otra persona ya contestó esa pregunta |
| 409 | `cascada-cambio` | «para la cascada», la raíz trae eventos que no están en los `ids` que mostró la pantalla |
| 409 | `cambia-a-otra-persona` | sin `motivo`, la escritura cambiaría o retiraría lo que dijo OTRA persona en otra fila o evento del alcance; el mensaje dice cuáles (pozo, día, paso y quién) |
| 409 | `lote-sin-pasos` | el lote no sube ningún paso: ya estaban confirmadas (no se guarda, C-19) |
| 422 | `clasificacion-incoherente` | planeada con una causa `NP_…` (o al revés), un detalle de otra causa, un valor fuera del catálogo, «cambie primero ¿Planeada?» |
| 422 | `falta-motivo` | cambia o retira lo que ya dijo una persona en la fila de la dirección, o retira lo que dijo una persona en cualquier fila, sin `motivo` de 5 caracteres o más |
| 422 | `texto-largo` | `motivo` o `evidencia` de más de 500 caracteres (C-12) |
| 422 | `pregunta-ajena` | una pregunta que TRIM no tiene o que no es de esa fila (C-18); una opción que no es de la pregunta |
| 422 | `cascada-sin-ids` | «para la cascada» sin `ids`, sin la fila de la dirección entre ellos o con una fila de otra raíz |

En el demo `escrituras.ts` ES el servidor y cada rechazo de estas escrituras trae, además del
mensaje, su HTTP y su código de esta tabla (`Rechazo.estado` y `Rechazo.codigo`); con la fuente
http, los del servidor. Así `referencia/escrituras/` comprueba que un backend rechaza lo mismo
con el mismo HTTP y el mismo código (C-08; «Cómo se comprueba un backend»).

Campos extra según el caso: `errores: [{ campo, texto }]` en accesos (`campo` es `nombre`,
`correo`, `rol`, `campos`, `whatsapp`, `alertas`, `motivo` o `general`: el `ErrorAcceso` de
`usuarios.ts`); `campo: "descripcion"` en un aviso; `faltas: [ruta]` en un nacimiento mal
formado («dispositivos[1].fuente.reloj es obligatorio»); `tags: [tag]` en
`tag-de-otro-gateway`.

### Rutas

Una por recurso, y **ningún tramo literal al mismo nivel que un `:parámetro`**:
- `/api/catalogo`: lo que el servidor sabe de cada campo y casi no cambia.
- `/api/vistas/…`: lo **calculado** por el servidor.
- `/api/campos/:campo/…`: los **insumos** que entrega el borde y el registro de la cadena de
  datos. Ninguna pantalla del libro los pide: los consume el servidor (salvo Conectores y la
  cadena del dato, que leen el registro).
- Lo que entra a mano: `/api/configuracion`, `/api/usuarios`, `/api/paradas/…`, `/api/sap/…`,
  `/api/informes`, `/api/asignacion-oficial`, `/api/analisis`, `/api/planta/cambios`,
  `/api/planes/…`, la clasificación ANH (`/api/anh/paradas/…`) y la topología del choke
  (`/api/topologia/importar` y `/api/configuracion/vista-previa`; se firma con `/api/configuracion`).

Parámetros: `campos=a,b`, **sin repetidos** (C-10: `campos=ceiba,ceiba` multiplicaba el reparto; el
servidor responde `400 peticion-invalida` o cuenta cada campo una vez, y el front nunca lo repite:
`urlDe` los quita); `desde` y `hasta` en ISO con zona (el `hasta` no se incluye).

**Lo que una vista responde con parámetros que no sirven** (C-16), la misma regla en todas:
- un campo que la persona no tiene: `403 sin-permiso` (nunca datos de ese campo);
- un campo que no está en el registro: `404 campo-desconocido`;
- `desde ≥ hasta`, o una fecha que no es fecha o va sin zona: `400 peticion-invalida`;
- `orden` ausente o fuera de su lista (el árbol del choke): `400 peticion-invalida`.
En el demo no hay sesión: lo del campo ajeno queda en «Pendiente del lado del servidor».

---

## Arranque

Con la fuente `http` (`VITE_FUENTE=http`), `src/shared/api/servidor.ts` pide estos diez GET
**en paralelo antes de pintar**. Todos van en el sobre `{ datos, refs }` y no llevan `Date`.
Si uno falla, el arranque lo dice en la página: por eso **ninguno responde 403** a una persona
con sesión; lo que no le toca se filtra.

| Ruta | Devuelve | Qué ve cada quien |
|---|---|---|
| `GET /api/campos` | `Campo[]` (`entities/tipos.ts`): `{ id, nombre, cuenca, choke: "Pozos" \| "Planta" \| "Evacuación" \| "Mercado", nota }`. Es **el registro de campos**: un cliente nuevo son filas aquí, no código. Se revisa al entrar (id único y no vacío, nombre no vacío); `GET /api/catalogo` no puede traer un campo que no esté aquí (el arranque se detiene y lo dice) | todos (el registro es de la empresa: la configuración y los accesos nombran a todos) |
| `GET /api/catalogo` | `DatosDeCatalogo` (`shared/api/catalogo.ts`): `{ calendario: Mes[] (desde y hasta en ms; publicado si todos los campos con fiscal publicaron ese mes), equipos: [id], maquinasBomba: [id], campos: { campoId: { perfilesBomba, registroEquipos, limites: { tag: LimiteTag }, medicion: { origen?, banda, metrologia? }, pozos, catalogosDanos: { equipo: Catalogo }, planta? } } }` | solo los campos de la persona |
| `GET /api/configuracion/historial` | `Version[]`, de la más vieja a la vigente; **la última es la vigente** | todas (la configuración es de la empresa) |
| `GET /api/paradas/respuestas` | `{ evento: Respuesta }` | las de sus campos |
| `GET /api/usuarios` | `Usuario[]` | ver «Usuarios» |
| `GET /api/usuarios/historial` | `CambioAcceso[]` | con `usuarios:administrar`, todo; sin ella, `[]` |
| `GET /api/informes` | `Informe[]` | los de sus campos |
| `GET /api/asignacion-oficial` | `{ filas: FilaCargada[], cargas: CargaAsignacion[] }` (ver «Asignación oficial») | la de sus campos, y las cargas que tocaron alguno de ellos |
| `GET /api/analisis` | `{ vigentes: { evento: Analisis }, anteriores: { evento: Analisis[] } }` | los de sus campos |
| `GET /api/planta/cambios` | `CambioPlanta[]` | los de sus campos |

`/api/catalogo` reemplaza a las rutas viejas `/api/calendario`, `/api/catalogo/equipos`,
`/api/catalogo/bombas`, `/campos/:c/bombas` (perfil), `/campos/:c/equipos/registro`,
`/campos/:c/equipos/:e/catalogo`, `/campos/:c/medicion-oficial` y `/campos/:c/planta`. Un campo
sin esquema de planta no trae `planta` (hueco; nunca la de otro campo).

**Un campo que el registro no trae** (un id en un usuario, un mensaje o un aviso que no está en
`GET /api/campos`) se muestra como «id (campo sin registrar)», nunca como otro campo. La
configuración firmada solo acepta campos del registro (`validarConfig`, 422).

**Cada equipo del registro** (`registroEquipos`, y `equipos[]` del inventario) trae dos datos
que el motor ya no deduce del id: `servicio` (`aire`, `energia`, `compresion`, `evacuacion`,
`proceso` o `tratamiento`: el tipo de causa que se le carga cuando ese servicio cae) y `fiscal`
(el tag del computador de flujo cuyo valor es el fiscal del día; solo en el punto de medición
oficial).

**Perfil de bomba** (`perfilesBomba`, tipo `PerfilBomba` en `bombas.ts`): `subtipo`,
`tecnologia`, `norma`, `papel` (transporte, disposición, recobro), `capacidadBpd`, `pozos`
(multifásica), `sinBomba`, `tags` por `VariableId` y `primerasAlarmas: { tag: ParteId }` de la
máquina. Un tag que la máquina no declara en `primerasAlarmas` no identifica ninguna parte:
queda en la evidencia. **Ya no trae respaldo ni tanque**: son configuración firmada
(`respaldos[]`, `tanques[]`). **Ya no trae `alarmas`**: el punto de alarma es del límite del tag.

**Límite de cada tag** (`limites`, tipo `LimiteTag` en `limites.ts`): **la única fuente** de la
banda normal y de la alarma de un tag; el vigía y la salud de las partes leen de aquí, y la
procedencia (`GET …/tags/:tag/procedencia`, `instrumento.limite`) cita la misma banda, no la
define. Antes eran tres fuentes y VI-2011 llegó a decir 3,9 en el panel y 4,5 en la procedencia.
```json
"VI-2011": { "tag":"VI-2011", "equipo":"P-201B", "texto":"< 3,9", "normal":[null, 3.9],
             "alarma":{ "alta":3.9, "fuente":"API 610, Tabla 8: …" },
             "firma":{ "normal":"Registro de tags: la declara el instrumento al conectarse (DBIRTH) y la aprueba ingeniería del cliente",
                       "alarma":"Base maestra de alarmas (ISA-18.2): la firma ingeniería de confiabilidad del cliente" } }
```
| Número | De dónde sale | Quién lo firma |
|---|---|---|
| `texto`, `normal` (banda normal; `null` del lado abierto) | el registro de tags: lo que el instrumento declara en su DBIRTH (`limite`, `bajo`, `alto`), versionado en `historial_tag` si cambia | ingeniería del cliente, al aprobar el registro |
| `alarma` (`alta`/`baja`/`fuente`) | la base maestra de alarmas de la máquina (ISA-18.2), con la norma u hoja de datos | ingeniería de confiabilidad del cliente |

Un tag es único en su campo. Sin `alarma` el vigía responde «sin límite»: no proyecta contra la
banda normal. Fuera de la banda normal es atención; en la alarma, alarma. En la electrosumergible
la banda y la alarma son los ajustes de protección de su variador (configuración del pozo) y
viajan con cada señal.

---

## Vistas calculadas (`GET /api/vistas/…`)

La forma exacta de cada una es el códec de `contrato.ts`; aquí, qué es y lo que cambia del
tipo del motor. Lo que no se nombra va tal cual.

| Ruta | Devuelve |
|---|---|
| `/vistas/diferidos?campos&desde&hasta` | `Libro` (`libro.ts`). `tramos[]`: `{ evento: clave en refs.eventos, pozo: clave en refs.pozos, causa, inicio, fin (ISO), abierto, horas, factor, bbl, aproximado, sinCustodia, sinFactor, sesgo, azar }`. `preguntas[]` con `inicio` y `fin` ISO o `null`. `custodia: { sinPrueba: [clave], estimados: [clave], bswLaboratorio }`. `sinFiscal: [{ campoId, dias: [ISO] }]`, `sinFactor: [{ campoId, mes }]`. `motivos: [{ codigo, texto, campoId?, mes? }]`, con `codigo` en `en-curso`, `sin-fiscal`, `sin-factor`, `banda-sin-verificar`, `fa-fuera-de-banda`, `sin-causa`, `sin-meta`: **el front decide por el código, nunca por la frase**. `valorUsd?`, `valorCampos: { con, total }`, `sinPrecio: [campoId]`. `meta.sinMeta: [campoId]` y `porCampo[].sinMeta` (ver «Sin meta firmada»). Paretos: `porEquipo` una fila por (campo, equipo, tipo); en las filas `reinyeccion`, `transporte` y `electrosumergible` van además `fallas` y `disparos` del período: los eventos de la historia de fallas del equipo (`historialDeEquipo`) que se solapan con `[desde, hasta)` (la misma regla de período que `porParte`; cuenta la abierta y las que el tanque absorbió; un disparo no es falla; en una bomba `disparos` es 0); en las demás filas no van; `sinCosto: [{ campoId, equipo, tipo, fallas, disparos }]` (nuevo) son los equipos de la línea (bombas de inyección, también la de recobro, y multifásicas con paradas en el campo; electrosumergibles) con `fallas + disparos > 0` en el período, con esa misma regla, y **sin fila de su familia** (`tipo` = `reinyeccion`, `transporte` o `electrosumergible`) en `porEquipo`: fallaron sin costar crudo (el tanque, el respaldo o la salida alterna lo absorbieron); sin barriles, no entran en ningún Pareto; por campo en el orden de la consulta, de más fallas a menos, luego disparos y el código del equipo (comparación de texto simple). Ejemplo: P-201B de Guacamayo (recobro), 5 fallas en 12 meses y 1 en el trimestre; `[]` si no hay; `porParte` una fila por (familia, parte) armada con los **eventos del equipo** (la parada de la bomba del PLC con su parte, el evento de la electrosumergible), también los que el tanque absorbió: `fallas`, `disparos` y `horas` (= unión de los intervalos de esos eventos por equipo, recortada al período) salen de ellos y `bbl` de los tramos que causaron (puede ser 0) |
| `/vistas/diferidos/mensual?campos` | `[{ mes, corto, nombre, desde, hasta (ISO), parcial, libro }]`, con `libro` **sin** `tramos`, `porPozo`, `preguntas` ni `custodia` |
| `/vistas/diferidos/base?campos&desde&hasta` | `{ desde, hasta (ISO), nombre, baseDia, periodoDia, cambio }` o `null` sin tres meses publicados antes |
| `/vistas/produccion/diaria?campos&desde&hasta` | `[{ dia: ISO, horas, real \| null, faltan: [campoId], potencial, diferido, residuo \| null, meta \| null }]`: `meta` es `null` si algún campo pedido no tiene meta firmada ese día |
| `/vistas/potencial-reciente?campos` | `{ campoId: bbl/d }`: potencial promedio de los últimos 30 días. Es la referencia con que el gerente fija la meta; no es meta y no se guarda |
| `/vistas/paradas/por-identificar?campos` | `Pregunta[]` de toda la historia: las que piden respuesta, **y también las declaradas y las no conformes** (`pide`, `arrancoSinIdentificar`). «Por identificar» se cuenta igual en todas las pantallas (`cuentaPorIdentificar`, causa-senal.ts): `porIdentificar` = las que tienen `pide` (hayan arrancado o no); `arrancaronSinIdentificar` = de esas, las que tienen `arrancoSinIdentificar` (no conformidad). Una respondida tarde ya no pide y no cuenta, aunque sigue no conforme |
| `/vistas/paradas/:evento/opciones` | `{ catalogo?, sugeridas?: { opciones: Opcion[], conEvidencia }, sospechosa?: SaludParte }` |
| `/vistas/bombas/prediccion?campo&equipo` | `Prediccion`: `perfil` por clave; `perdiendo.pozos: [clave]` (una multifásica parada trae los pozos cerrados por ella; una de recobro parada, `{ bblDia: 0, pozos: [] }`); `colchon` con `null` = no se llena (lo que aguantaría si parara **ahora con todo produciendo**); `llenado` (solo una de disposición **ya parada**, con tanque y nivel): `{ aguaEntraBpd, colchon, prioridad }`, el tanque con el agua que **entra** ahora (fórmula en «Predicción», abajo); `colchon.horas: null` = no sube; `orden.pasos[].pozo` y `orden.sinPrueba` por clave |
| `/vistas/bombas/paradas?campo&equipo` | `ParadaMedida[]` de la más reciente a la más vieja: `inicio`, `fin` ISO, `tramos` como en el libro, `colchon.previsto`. El tanque y el respaldo de `colchon.previsto` son los de la configuración que **regía cuando paró** (`configEn(historial, inicio)`), como en los mensajes: firmar hoy otro respaldo no cambia una parada vieja. Lo mismo en `paradas-en-periodo` y en `abierta` de `/vistas/bombas` |
| `/vistas/bombas/paradas-en-periodo?campos&desde&hasta` | `ParadaMedida` + `{ horasEnPeriodo, bblEnPeriodo, cruzaBorde }`: solo las que se solapan con el período, recortadas a `[desde, hasta)` con el factor de cada mes. Una parada que cruza el borde no se suma entera a los dos meses |
| `/vistas/riesgo?campos` | `Riesgo[]` con `desde` y `cierreDesde` ISO; cada item trae `prioridad` (la de la salud de la parte) y `estadoParte`. **`costoFalla` = lo que costaría que el equipo fallara HOY** (fórmula en «Costo si falla hoy», abajo): una sola cuenta en bombas y electrosumergibles, así las filas se suman. `0` en una bomba de recobro o con un respaldo que absorbe toda el agua; **ausente** (no 0) si el equipo no tiene fallas cerradas propias ni, en una electrosumergible, de su flota. `colchonH` (nuevo): en una bomba de disposición con tanque, las horas que aguanta hoy el tanque (una reparación más corta no cuesta crudo); ausente con colchón infinito o sin colchón calculado. **`techo: true`**: `bblDia` no es una cifra calculada sino un techo (un servicio o un equipo de proceso que cuelga de todo el campo: «se cierra lo que esté produciendo»); la pantalla lo dice «hasta N», como en «Si falla hoy» (D6; QA-R). Ausente en lo calculado. **`declaradoPor`**: `motivo` es lo que respondió una persona con sus palabras (una parada declarada) y esto es quién, por su rol («el operador de campo»); en el papel va «Lo contestó …», nunca el texto ni el nombre (D2). Ausente si `motivo` es de TRIM. `costoDe`: `'propio'` si sale de la historia del equipo, `'flota'` si nunca ha fallado y se estimó con el promedio de su flota en el campo (la pantalla lo marca); no va cuando `costoFalla` es 0 por definición. `mdtFuente` es solo texto para leer («el promedio de sus 8 fallas cerradas, sin las 19 h que aguanta hoy el tanque»; en una electrosumergible «20,3 d fuera, el promedio de …»), con las horas en la regla de las pantallas y el colchón **truncado**, nunca redondeado hacia arriba (19,05 h → «19 h»; 18,6 h → «18 h»): la pantalla dice «0 si vuelve antes de 19 h» y tiene que ser cierto. Lo que el equipo **ya costó** por falla es otra cifra (`HistorialEquipo.bblPorFalla`, «le ha costado por falla»). El `motivo` dice «X salió de su banda normal; llega a su alarma en T» o «X ya llegó a su alarma», nunca «fuera de límite»; T con la regla de las pantallas: menos de 48 h en horas enteras («43 h»), si no en días con un decimal («10,9 d»), más de 90 días «más de 3 meses» |
| `/vistas/estado?campos` | `EstadoCampo[]`, uno por campo pedido y en ese orden, con `ayer: { fecha: ISO, bbl \| null }` |
| `/vistas/pozos?campos&desde&hasta` | `FilaPozo[]` con `pozo` y `evento` por clave y `salud?: SaludParte`. `diferidoEsp` = Σ de los tramos del período cuya causa es la electrosumergible del propio pozo (`causa.equipo === pozo` y `tipo === 'electrosumergible'`); sumado en el campo da la fila `electrosumergible` de `porTipo` |
| `/vistas/pozos/:campo/:pozo?desde&hasta` | `{ fila, tramos, historicos: [{ evento: clave, causa }], senales, partes, historial? }` o `null` |
| `/vistas/electrosumergibles?campos&desde&hasta` | `[{ fila, partes, historial }]` |
| `/vistas/asignacion?campo&mes` | `AsignacionPozo[]`: lo que TRIM asigna a cada pozo en un mes cerrado |
| `/vistas/predicciones?campos` | `{ registro: PrediccionVigia[], fallas: [{ …, falla: { inicio: ISO, fin: ISO \| null, … } }] }` |
| `/vistas/relojes?campos&desde&hasta` | `{ fallas, excluidas, totalH?, activaH?, esperaH? }` o `null`. `excluidas` = órdenes PM01 cerradas sin su parada del PLC; sin ninguna falla cruzada, los promedios van vacíos |
| `/vistas/campos/:campo/ahora` | `{ caudales: { crudo, agua } (bbl/d), niveles: { idTanque: { tag, pct, hora } } }`. Un tanque sin lectura **no aparece** |
| `/vistas/equipos/:campo/:equipo` | `EquipoVivo` o `null` (también pozos). Trae `marcha`: `en-marcha`, `detenido`, `cerrado-por-otro` o `sin-lectura`, que es lo que se compara; `estado` es solo texto. Un dispositivo sin lectura (el fiscal sin dato del último día, una señal de fondo de una electrosumergible parada) viaja con `valor: null` y estado `sin señal`, nunca con un texto como `"—"` (un texto es una lectura discreta) |
| `/vistas/equipos-hoy?campos` | `{ campoId: EquipoVivo[] }`: catálogo y pozos |
| `/vistas/equipos/:campo/:equipo/historia` | `{ eventos: [{ id, inicio: ISO, fin: ISO \| null, bbl, pozos, causa }], bomba?: HistorialEquipo }` |
| `/vistas/equipos/:campo/:equipo/ficha?desde&hasta` | `FichaEquipo` o `null`, con `desdeHistoria` y `desdeCierre` ISO: los barriles del período y de toda la historia, con su valor en USD (lo calcula el servidor) |
| `/vistas/equipos?campos` | `FilaEquipo[]` |
| `/vistas/confiabilidad?campos` | `[{ campoId, equipo, familia, h: HistorialEquipo }]` |
| `/vistas/bombas?campos&desde&hasta` | `BombaVista[]` con `perfil` por clave, más `veredicto`, `abierta`, `senales` y `partes` (la salud llega aquí y en `sospechosa` de las opciones; ya no hay `/vistas/bombas/salud`) |
| `/vistas/ciclo?campos&desde&hasta` | `CicloValor`: tramos `antes`, `durante` (con `bblDia`), `despues`; `retornoBbl`; `valorUsd?`; cada `PlanAccion` con `simulado: true`, `bbl`, `supuestos[]`, `estado?` (ausente = propuesto). Cifras **simuladas**: no entran al libro. Fórmulas en el capítulo 11. El servidor aplica `POST /api/planes/:id` sobre cada `id`. **Presentación (front hecho):** Resumen muestra el retorno primero y el libro después; planes plegados («Ver planes de acción»); copy largo solo en globos — capítulos 11 y 8 §8.13 |
| `/vistas/campos/:campo/tuberia?desde&hasta` | `TuberiaCampo` (`choke.ts`; «La tubería del campo», U2 §2): `desde` y `hasta` ISO; `tramos[]` en el orden de la tubería (`reservorio`, `pozo`, `planta`, `exportacion`), cada uno `{ tramo, nombre, explica, potencialBpd, fuente, estado, holguraBpd, limita, casiIgual, trenes?, disponibleHoy?, subniveles?, perdiendoAhoraBpd, perdidoBbl, equiposTop }` (`potencialBpd` y `holguraBpd` en `null` = sin dato; `estado`: `pruebas`, `demo`, `firmado`, `sin-firmar` o `sin-dato`); `limita` (`pozos`, `planta`, `exportacion`, o `null` sin tubería de crudo), `casiIguales`, `umbral`, `empate`, `pasaHoyBpd`, `perdiendoAhora[]` `{ tramo, bpd, equipo, pozos, listaPozos, desde (ISO) }` (`tramo: null` = sin identificar; `desde`: el primero de sus pozos que paró), `perdiendoAhoraBpd` y `sinTramoAhoraBpd` (Σ de lo anterior, y lo que no tiene tramo todavía), `perdidoPeriodo[]` por tramo con sus `equiposTop`, `sinTramoBbl` y `sinTramoEquipos` («sin identificar», que no es un tramo), `diferido`, `campoDeGas`, `textoCorto`, `frase`, `fraseGerente`; `capacidades: { estado: firmadas | demo | parte, firma?: { version, fecha, por }, texto }` (quién y cuándo firmó las de hoy); `medidor?: { medidor, estado: en-linea | sin-comunicacion, desde? (ISO), ultimoDia?: { dia (ISO), bbl }, texto }` (el punto de medición oficial). En la planta, `trenQueLimita` (`crudo`, `agua` o `gas`: el menor de los trenes medidos) y `disponibleHoy?: { valor, unidad: "bbl/d de crudo", agua: { valor, de }, equipo, texto }` (lo que queda hoy con un equipo parado, en crudo y el agua de donde sale; el tramo no se angosta); en los pozos, `pruebaMasVieja?: { pozo, fecha (ISO), dias, texto }`; en afuera, `subniveles[]` con su `estado`. Cada `fuente` va **en palabras**, nunca un nombre del código. Cada día del período usa las capacidades que regían ese día. **Cuadres:** Σ `perdidoPeriodo` + `sinTramoBbl` = `diferido` = el de `/vistas/diferidos` del período; con los pozos limitando, el potencial de los pozos − `pasaHoyBpd` = Σ `perdiendoAhora`. Un tren sin medir (el gas) no entra en el mínimo de la planta. Reemplaza a `/vistas/campos/:campo/choke` de P1 §5.2 |
| `/vistas/campos/:campo/choke/serie?desde&hasta` | `{ dias, cambios, vueltas }`: cada día (`dia` ISO) con `horas`, `real` (`null` sin fiscal), `potencial`, `potencialSistema`, `estructural`, `diferido`, `residuo`, `porChoke`, `porEscalon` y, por campo, `dominante`, `casiIguales`, `potenciales` y `superado` (el real pasó la capacidad declarada). `cambios[]` `{ campoId, dia (ISO), de, a, valorBpd, texto }`: el aviso «Cambió lo que limita», solo cuando el tramo nuevo gana por más del umbral de «casi iguales» y lo sostiene `diasParaCambio` días seguidos (`PARAMETROS_CHOKE`, `choke.parametros@3`). `vueltas` cuenta los cambios sin ese filtro. Cada día suma lo mismo que el libro de ese día |
| `/vistas/campos/:campo/agua` | `TuberiaAgua` (`choke-agua.ts`; «La tubería del agua», U2 §5): `t` (ms), `aguaBpd`, `crudoBpd`, `crudoPorAgua`; `tramos[]` (`producida`, `tratamiento`, `tanques`, `bombas`, `inyectores`) con `potencialBpd` (`null` = sin dato, o el tanque, que es colchón y no caudal), `crudoBpd`, `holguraBpd`, `sinDato?`, `fuente`, `tanques[]` con `colchon?` `{ horas, rango, nivelPct, cuando, bomba, evento?, aguaSinSalidaBpd }` (`horas: null` = no se llena; `cuando`: `al-parar` o `si-para-ahora`) y `bombas[]` `{ id, capacidadBpd, placaBpd, papel, reserva, nota?, instrumentada, marcha, mueveBpd?, respaldoLibreBpd? }`; `tratamientoBpd` y `admisionInyectoresBpd` (`null` = sin dato), `dominante`, `limita`, `angosto?`, `sobraBpd`, `faltaBpd`, `crudoQueFrenaBpd`, `sinUna?` (con `desde` ISO y `colchonH`, `null` = no se llena), `siParaOtra?` (con una bomba ya parada, si para otra de las que quedan: lo que entra, lo que cabe, el agua sin salida, el colchón, el orden de cierre y el crudo que se pierde; la misma cuenta del «si falla hoy» de las hermanas), `sinDato`, `frases`, `texto`. Cada tramo trae además `estado` (`pruebas`, `demo`, `firmado`, `sin-dato`) y `casiIgual`; `casiIguales` (o `null`) son los tramos de la disposición a menos del umbral del más angosto. La capacidad de cada bomba es UNA cifra (la de la predicción y el colchón); la placa va de referencia; cada bomba trae `estado`, `fuente` y, si se firmó, `fuenteFirmada` |
| `/vistas/campos/:campo/capacidades` | `VistaCapacidades` (`vistaCapacidades`, `choke.ts`; U2 §8.4): `vigentes` (`CapacidadesVigentes`: `crudo`, `agua`, `bombas[]`, `gas` con `medido`, `afuera`, `mercado`, `tratamiento`, `admision`, cada uno `{ tramo, valor \| null, unidad, estado: firmado \| demo \| sin-dato, fuente (en palabras), fuenteFirmada? }`; `firmadas`; `explicacionEmpate?`), `firma?` (`{ version, fecha, por }` de la versión desde la que rigen), `entrada` (lo que la revisión necesita: `vigentes`, `maximoCrudo?: { bpd, dia (ISO) }` lo máximo que pasó en un día por el punto oficial en los últimos 30, `pozosBpd` (con el factor de medición que rige), `aguaPozosBpd`, `conGas`, `caudalesGas`, `factorMedicionPropuesto?: { valor, dias }`) y `hallazgos[]` `{ tramo, equipo?, texto, bloquea }` de lo que rige (`tramo: factor` es el factor de medición). El factor de medición (QA-D3): el que rige en `vigentes.factorMedicion` (`{ valor, estado: firmado \| sin-firmar, porque? }`; sin firma, 1), quién lo firmó en `firmaFactor?` (`{ version, fecha, por }`) y lo que TRIM propone en `factorMedicionPropuesto` (`{ campoId, valor?, dias, desde (ISO), hasta (ISO), texto, resumen }`: la mediana de lo real ÷ las pruebas en los días completos sin paradas y con los pozos limitando de los 90 antes de hoy; sin `valor` con menos de 7 días o en un campo de gas). La pantalla revisa lo que se va a firmar con `revisarCapacidades` y esta `entrada`; el servidor lo vuelve a revisar al firmar |
| `/vistas/criticidad?campos` | `{ ranking, campos }` («Si falla hoy», `criticidad.ts`, U2 §6): `ranking` = `FilaCriticidad[]` de todos los campos pedidos, de mayor a menor bbl/d si falla hoy, sin lo ya parado: `{ campoId, equipo, nombre, familia, tramo, alcance, servidos, bpd, colchonH?, costoFalla?, costoDe?, mdtFuente?, vigilado, sinDato?, subio?, estimacion, parado, perdiendoBpd?, puesto, porque }` (`bpd: null` = sin dato; `subio: { desde (ISO), porque, otro }`; `colchonH: null` = no se llena; `puesto`: 1 + cuántos de su campo cuestan más, los que cuestan lo mismo lo comparten, `null` sin dato o ya parado; `porque` de lo ya parado dice lo de ahora: «está caído: se pierden N bbl/d ahora»). `campos[]`, en el orden pedido: `{ campoId, parados, sinCalcular, cambioHoy?, proximoInstrumento?, noIntervenir?, avisosTrabajo, desembotellar? }`: lo que decide cada rol con la lista (U2 §6.4: dónde va el próximo instrumento, no intervenir hoy lo que vale más), `avisosTrabajo[]` `{ campoId, tarea, equipo, desde, hasta (ISO), motivo, porque, texto }` (un trabajo del programa firmado sobre un equipo que hoy vale más) y la frase del desembotellamiento (U2 §6.5: «otra bomba de agua no sube la producción: evita que una falla cierre pozos; cada falla cuesta X bbl»). En una bomba con instrumento, `costoFalla` es exactamente el de `/vistas/riesgo` |
| `/vistas/choke/reparto?campos&desde&hasta` | `BrechaChoke` (`brechaPorChoke`, CHOKE-COMPLETO §6–§8): `desde`, `hasta` ISO, `potencial`, `real`, `brecha`, `diferido`, `porChoke` y `porEscalon` (con `sin-asignar` y `sin-clasificar`), `porChokeEscalon`, `porChokeEquipo`, `sinExplicar`, `cuadra`, `porConfirmar`, `estructural`, `estructuralPorChoke`, `potencialSistema`, `brechaSistema`, `realPe`, `potencialPe`, `pe`, `peNoPlaneada`, `peCreible`, `textoPe?`, `dominante`, `horasPorDominante`, `superado[]` (`dia` ISO), `porCampo[]` con lo mismo por campo, `texto`, `textoEstructural?`. `pe` = 100 · `realPe` ÷ `potencialPe`: lo real y el potencial del sistema de los campos de crudo (en un campo de gas, 0: la eficiencia de crudo no aplica). Con `peCreible: false` la pantalla dice `textoPe` y nunca el número (QA-D3). **Identidad exacta:** potencial − real (del libro) = Σ por tramo + sin explicar = Σ por escalón + sin explicar, y Σ por tramo = el diferido de `/vistas/diferidos` del mismo período |
| `/vistas/choke/mensual?campos` | `MesPorTramo[]`: cada mes del calendario (`desde`, `hasta` ISO, `parcial`) con `porTramo`, `noPlaneado` y `diferido`, el mismo de cada mes de `/vistas/diferidos/mensual` |
| `/vistas/choke/base?campos&desde&hasta` | `LineaBasePorTramo` o `null` sin tres meses publicados antes del período: `base` y `periodo` (`desde`, `hasta` ISO), `noPlaneado` y `diferido` por tramo (`{ baseDia, periodoDia, cambio }`, `cambio: null` sin base), `texto`. La misma base de `/vistas/diferidos/base` |
| `/vistas/choke/arbol?campos&desde&hasta&orden` | `ArbolChoke` (`arbolDelChoke`, `choke-arbol.ts`; «el árbol de pérdidas del choke», el modelo expandido de SPE-36848): `orden` (`gestion`, `circular` o `responsable`; obligatorio), `niveles` (los de ese orden), `desde`, `hasta` ISO, `campos`, `version` (la forma de salida de las cadenas: `C024-2026` por defecto), `regla` (`choke.arbol@1`) y `raiz`. Cada nodo `{ dimension, valor, texto, cadena?, bbl, filas, eventos, confirmadoBbl, noPlaneadaBbl, hijos }`: `dimension` es el nivel (`raiz`, `tramo`, `responsable`, `impacto`, `planeacion`, `n1`, `n2`, `equipo`, `parte`); `valor` el código interno (`planta`, `no-planeada`, `NP_SUB`, `NP_SUB/falla-esp`, `op-mantenimiento`, `P-201B`, `sello`), `falta` si el paso falta y, en el tramo, `sin-asignar` («sin identificar»); `texto` en palabras de campo; `cadena` lo que viaja a la ANH en la forma de salida (`choke_mod`, `resp_par`, `dif_perd`, `pla_no_plan`, `cau_niv1`, `cau_niv2`), solo en los pasos con valor; `filas` y `eventos`, las filas de `/vistas/anh/paradas` y sus eventos; `confirmadoBbl`, los barriles con los 6 pasos avalados por una persona (estado `confirmada`); `noPlaneadaBbl`, los de las paradas no planeadas. Los niveles: `gestion` = tramo → planeada o no → causa → detalle → equipo → parte; `circular` = responsable → tramo → diferida o pérdida → planeada o no → causa → detalle (C24 p. 5); `responsable` = responsable → tramo → causa → equipo. Con la clasificación **vigente** de cada fila: lo que dijeron las personas encima de lo que propone TRIM; el tramo de una fila cuyo paso 2 espera una respuesta (el tanque de crudo: «¿el oleoducto recibía?») es el que propone el motor del choke, como en la tubería. Un paso que falta va en su rama `falta` y **nunca se reparte**. En el paso 3 la rama `perdida` siempre está, hoy vacía (`bbl: 0`, `filas: 0`): TRIM todavía no registra pérdidas. **Hijos de más a menos barriles; `falta` y `sin-asignar` al final.** **Cuadres:** cada nodo = Σ de sus hijos (barriles, filas, confirmado y no planeado); la raíz = el diferido de `/vistas/diferidos` del período (Σ `diferidaTrimBbl`); el primer nivel de `gestion` = `porChoke` de `/vistas/choke/reparto`, tramo por tramo, mientras nadie haya corregido el paso 2 (el reparto sale de la regla del motor y todavía no lee lo que corrigen las personas; el árbol sí: una corrección mueve esos barriles de tramo); Σ por causa = la conciliación por N1 de las filas; las hojas suman las filas. Al entrar, el front revisa el árbol con la misma regla (`revisarArbol`) y rechaza el que no cuadra, diciendo dónde. Es un cálculo sobre las filas de la ANH: **no tiene tabla ni vista SQL propia** |
| `/vistas/topologia?campo` | `{ campoId, firmada, elementos, porSaber, sinResponder }`: la topología que rige en el campo (la firmada en `Config.topologia` o, si el campo no trae ninguna entrada, la que se deriva del registro), cada elemento `{ elemento, choke, alcance, pozos?, campoId?, casoBorde?, nombre?, clase? }` con el `choke` que sale de su alcance (dedicado → pozo, compartido → planta, frontera y tercero → afuera) y `casoBorde: "misma-locacion"` si sirve a 2 o 3 pozos de una misma locación. `porSaber[]` `{ elemento, nombre?, clase? }`: lo firmado «Todavía no sé» (sin tramo). `sinResponder[]`: con la topología firmada, los equipos que el registro tiene y la firma no (uno nuevo), con lo que TRIM deduce del registro; esperan su respuesta sin perder lo firmado y, mientras tanto, su parada toma el tramo de la regla por tipo de falla |
| `/vistas/topologia/propuestas?campo` | `[{ elemento, pozos, porque, fuente, evidencia, conflicto?, casoBorde? }]`: lo que TRIM propone de la topología con lo que ya sabe (`fuente`: `alimentador`, `bomba`, `cascadas` o `registro`), para confirmarlo. Nunca se firma solo |
| `/vistas/anh/paradas?campos&desde&hasta` | `ParadaAnh[]` (`anh-paradas.ts`, P1 §1.5) de los días operacionales que toca el período (llevado a días enteros): una fila por pozo × día × causa, con lo que ya dijeron las personas encima. Ver «Clasificación ANH (Circular 024)» |
| `/vistas/anh/calidad?campos&desde&hasta` | `CalidadClasificacion` (`anh-calidad.ts`; P1 §2.1, U2 §4.6): `paradas`, `porPaso[]` `{ paso, paradas, propuestas, avaladas, corregidas, declaradas, enFalta, pctConfirmado, pctCorregido }` (`null` sin filas o sin propuestas), `porRegla[]` `{ paso, regla, propuestas, corregidas, pctCorregido, cambiadoA }`, `chokePorEquipo[]` y `sinTopologia[]` (equipos cuya parada tomó el tramo de la regla por tipo de causa) |

**Formas que se repiten.** `HistorialEquipo`: `eventos[]` con `inicio` ISO y `fin` ISO o
`null`; `porParte[].ultima` ISO; `fallasCerradas` y `bblPorFalla` (nuevos); `mdtH` del equipo
y de la parte sale **solo de fallas cerradas** (en la parte es opcional); el MTBF sigue
contando la falla abierta. `SaludParte`: las `Senal` internas (`primera`, `lenta`,
`causaActiva`, `fuera`, `medidas`, `sinSenal`) llevan `normal` con `null` del lado abierto.
Una electrosumergible con el pozo parado manda presión de entrada, temperatura del motor y
desbalance con `valor: null` y estado «sin señal»; corriente y frecuencia van con 0 medido. Un
instrumento de bomba que llega con `valor: null` (`Dispositivo.valor` admite `null`) **no se
descarta**: es una señal sin lectura, con estado «sin señal», pronóstico «Sin señal en línea» y,
en la salud, en `sinSenal` de su parte.

**Aditividad.** `/vistas/diferidos` es aditivo en intervalos disjuntos: Producción pide cada mes
recortado al rango escogido, y la suma de real, potencial y diferido tiene que dar lo mismo que
el rango completo (`verificar-libro`, sección 12).

**Escala.** Hoy `/vistas/diferidos` trae todos los tramos por clave. Cuando el portafolio crezca
conviene paginarlos (`GET /api/vistas/diferidos/tramos?cursor=`). Con la fuente http, una
pantalla que lee varias consultas las pide una tras otra (cada `use()` suspende): el backend
tiene que responder rápido o una etapa futura del front tiene que precargarlas.

### Registro, SAP y mensajes (sin `/vistas`)

| Ruta | Devuelve |
|---|---|
| `GET /api/mensajes?campos` | `Mensaje[]`, del más reciente al más viejo (ver «WhatsApp») |
| `GET /api/sap/avisos?campos` | `AvisoSap[]` completos, con `cerrado: boolean` y `orden?`, incluidos los enviados desde TRIM |
| `GET /api/sap/ordenes?campos` | `OrdenSap[]`. Las horas por clase de orden las suma el front: ya no hay `/api/sap/horas` |
| `GET /api/sap/equipos?campo` | `EquipoSap[]` |
| `GET /api/sap/equipos/:equipo?campo` | `{ identidad: { equipoSap, ubicacion }, repuestos: Repuesto[] }` |

---

## Escrituras

Cada escritura responde en el sobre `{ datos }` y con el error único. `por`, `porId`, `hora`,
`fecha`, `canal`, números consecutivos e ids **los pone el servidor**, nunca el cuerpo: `por`
sale del token (se propone `por: { id, nombre, rol }` para leerlo; hoy es el texto
«Nombre · rol»). Los textos con fecha que quedan en registros firmados se escriben en hora de
Colombia (`America/Bogota`).

Todas exigen además una **persona activa** en la sesión (`403` si no la hay), un rol del producto
(un rol de la versión 2 o inventado no escribe: el servidor no le presta las capacidades de otro,
C-14) y los campos de la regla general. El orden en que se revisan es el de `escrituras.ts`: la
forma del cuerpo (`400`, antes de cualquier regla: un campo con otra forma no es una excepción del
servidor, C-11); capacidad y persona (`403`); el recurso (`404`), que el campo del cuerpo sea el
suyo (`422`) y que la persona lo tenga (`403`); conflicto (`409`); las reglas del dominio (`422`).

### `POST /api/configuracion` · `GET /api/configuracion/historial`

Cuerpo `{ config, motivo, base }` → `{ version: Version }` con `{ version, fecha, por, motivo,
cambios[], config }`. `base` es la versión sobre la que se editó. La configuración:
```json
{ "empresa":"Operadora de demostración",
  "campos":{ "ceiba":{ "metas":[
      { "desde":"2025-10-01", "produccionBpd":10900, "diferidoMaxBpd":800, "netbackUsd":48, "criterioSinCausa":2 },
      { "desde":"2026-11-01", "produccionBpd":11200, "diferidoMaxBpd":700, "netbackUsd":null, "criterioSinCausa":2 } ],
                       "perfil":{ "gas":"venta", "bombas":true, "electrosumergibles":true } } },
  "tanques":[{ "id":"TK-AG-CE", "nombre":"…", "campoId":"ceiba", "bomba":"P-201B", "capacidadBbl":10000, "altoAlto":0.9,
               "tagNivel":"LT-2012", "aforo":"Certificado de aforo TK-AG-CE · tabla de 1 cm" }],
  "respaldos":[{ "campoId":"morichal", "equipo":"P-201B", "libreBpd":42500, "detalle":"Las otras seis bombas del tren" }],
  "programa":[{ "id":"PR-ceiba-P-201B-2026-11-04", "campoId":"ceiba", "equipo":"P-201B", "desde":"…", "hasta":"…", "motivo":"…" }],
  "topologia":[{ "elemento":"P-201B", "choke":"planta", "alcance":"compartido", "pozos":["LC-01","…","LC-18"], "campoId":"ceiba" }],
  "topologiaPorSaber":[{ "elemento":"K-101", "campoId":"ceiba" }],
  "capacidades":[{ "campoId":"ceiba", "crudo":{ "bpd":13000, "fuente":"prueba" },
                   "bombas":[{ "equipo":"P-201A", "bpd":89250, "fuente":"placa" }],
                   "gas":{ "bpd":2400, "fuente":"placa", "medido":false },
                   "afuera":{ "bpd":14000, "fuente":"contrato" }, "mercado":{ "bpd":15000, "fuente":"nominacion" },
                   "explicacionEmpate":"…",
                   "factorMedicion":{ "valor":0.966, "porque":"La mediana de lo que midió el punto oficial ÷ lo que dan las pruebas en 42 días sin paradas…" } }] }
```

`topologiaPorSaber` (opcional) son los equipos de los que el administrador contestó «Todavía
no sé» (`ElementoPorSaber`, `choke.ts`): **el motor no adivina** su tramo. Sus paradas quedan
con el paso 2 en falta y la pregunta «¿Dónde se originó la parada: en el pozo, en la planta o
afuera?» (`PREGUNTA_ORIGEN`), que contesta quien revisa; en «si falla hoy» van en `sinCalcular`.
Un equipo no puede estar a la vez en `topologia` y en `topologiaPorSaber` del mismo campo.

`capacidades` (opcional) son las capacidades firmadas de cada campo (`CapacidadesCampo`,
`capacidades.ts`; U2 §8.4): el tren de crudo, cada bomba del tren de agua (no el total: el
tren es la suma de las que están en servicio, topada por la admisión y el tratamiento), el tren
de gas y si se mide, afuera (oleoducto o transportador), el cliente o la nominación (subnivel
de afuera), el tratamiento de agua y la admisión de los inyectores. Cada número en bbl/d (el
gas en KPC/d) y con su `fuente`: `placa`, `prueba`, `contrato`, `nominacion` o `estimado`. Lo que
no se firma sigue con el dato del demo, marcado (`estado: demo`). **Cada día usa las que regían
ese día** (`configEn` del historial): firmar hoy no cambia un mes cerrado. `explicacionEmpate`
explica por escrito un empate exacto entre dos tramos (NSTA §5.4): va con la firma, no hay
otro endpoint para eso. `factorMedicion` (`{ valor, porque }`, QA-D3) es el factor con que se
leen las pruebas de los pozos para lo que limita y la eficiencia de producción: el sesgo del
separador de prueba contra el punto oficial. Se firma aquí, con su porqué en palabras; quién y
cuándo los dice la versión que lo firmó. Sin él rige **1**. TRIM propone uno
(`factorMedicionPropuesto` en `GET /api/vistas/campos/:campo/capacidades`: la mediana de lo real ÷
lo que dan las pruebas en los días completos sin paradas y con los pozos limitando de los 90 antes
de hoy, si son 7 o más), pero **la propuesta nunca rige sin firma**. Como lo demás, cada día se
mide con el factor de la configuración de su medianoche.

`topologia` (opcional) es la del modelo choke: a qué pozos sirve cada equipo, servicio o
alimentador (`ChokeDeElemento`, `choke.ts`). Un campo que no trae ninguna entrada usa la que
se deriva del registro (`GET /api/vistas/topologia`); un elemento sin `campoId` vale para
todos. El `choke` se guarda para la auditoría, pero **sale del alcance** (dedicado → `pozo`,
compartido → `planta`, frontera y tercero → `exportacion`): nadie lo escoge. Una topología
vacía es lo mismo que ninguna y no viaja; lo que llegue en `null` dentro de un elemento se
vuelve ausente (`normalizarConfig`).

- `409` si `base` no es la vigente (`version-cambio`): firmarlo pisaría lo que se firmó en el medio.
- `403` si el rol no firma ese grupo, o si toca un campo que la persona no tiene (`camposTocados`):

| Grupo | Qué incluye | Capacidad |
|---|---|---|
| Metas | tramos: meta de producción, máximo de diferido, precio neto, máximo sin causa para publicar | `metas:firmar` (gerente de activo) |
| Técnica | cualquier cambio del programa (alta, baja o cualquier dato), de tanques (alta, baja o nombre, campo, bomba, capacidad, alto-alto, tag, aforo), de respaldos (alta, baja o cambio), de la topología del choke (alta, baja o cambio de un elemento: a qué pozos sirve, o «Todavía no sé»), de las capacidades, un campo quitado, el perfil del campo y la empresa del membrete | `config:firmar` (administrador de la implementación) |

  Una versión que toca los dos grupos exige las dos capacidades.
- `422` (`validarConfig`, con la hora del servidor al firmar como referencia; «mes cerrado» es
  antes del primer día del mes en curso):
  1. Un tramo nuevo o cambiado no empieza antes del primer día del mes en curso; no se quita una
     meta ni un campo con tramos de un mes cerrado.
  2. El día del tramo es `AAAA-MM-DD` real y no hay dos tramos el mismo día; todo campo trae al
     menos un tramo y su perfil; los ids de campo son campos registrados.
  3. Producción > 0 y ≤ 10.000.000 bbl/d; máximo de diferido 0–10.000.000; máximo sin causa
     0–20 %; precio, si está, 0–500 USD/bbl (`TOPE_BPD`, `TOPE_PRECIO_USD`).
  4. Empresa no vacía.
  5. Tanques: ids únicos, transmisor de nivel y bomba obligatorios, como máximo un tanque por
     (campo, bomba), capacidad > 0, alto-alto 50–98 %.
  6. Respaldos: uno por (campo, equipo), libre 0–10.000.000 bbl/d.
  7. Programa: ids únicos (que incluyan el campo: `PR-{campo}-{equipo}-{fecha}`, o los asigna el
     servidor), fin después del inicio, motivo de 5 caracteres o más; una parada nueva o movida
     empieza después de ahora; en una que ya empezó no se cambian equipo, campo, desde ni hasta,
     y no se quita. **El programa es inmutable hacia atrás**, igual que las metas.
  8. Motivo de la firma de 5 caracteres o más.
  9. Topología (`validarTopologia`, `choke.ts`): el `choke` guardado es el que sale del
     alcance; un dedicado sirve a un solo pozo y un compartido a más de uno; los pozos son del
     campo; el campo está registrado; ningún elemento dos veces en el mismo campo. **No es
     inmutable hacia atrás:** cada parada guarda la regla con que se clasificó y lo que ya
     confirmó una persona no cambia solo (queda para revisar en Identificar); la vista previa
     dice cuántas cambiarían antes de firmar. «Todavía no sé»: el elemento con su campo
     registrado, una vez, y no a la vez contestado en `topologia`.
  10. Capacidades, la forma (`validarCapacidades`): el campo está registrado y va una vez;
     cada número > 0 y ≤ 10.000.000 con su fuente; cada bomba es del tren de agua del campo y va
     una vez; el gas dice si se mide; el factor de medición, entre 0,5 y 1,5, con su porqué (5
     caracteres o más, 500 a lo sumo) y nunca en un campo de gas (la eficiencia de crudo no aplica).
  11. Capacidades, contra lo que ya pasó (`capacidadesQueBloquean` → `revisarCapacidades`, solo
     en los campos cuyas capacidades cambian con esta firma): el tren de crudo y afuera no
     pueden dejar pasar menos de lo máximo que ya pasó en un día por el punto oficial en los
     últimos 30 días; un empate exacto entre los pozos, la planta y afuera necesita
     `explicacionEmpate` (5 caracteres o más). Un cambio de más del 20 % frente a lo vigente
     solo pide confirmar (no bloquea), y un factor de medición que se aleja más de 0,02 de lo que
     TRIM propone, también. La pantalla corre las mismas reglas mientras se escribe.

El historial (`cambios`) dice la topología en palabras: la primera vez que un campo la firma,
un renglón («Topología de La Ceiba: se firma con 36 elementos; antes regía la que TRIM deriva
del registro»); después, uno por elemento que cambia («Topología: P-201B (La Ceiba): le sirve
a varios pozos (18 pozos) → le sirve a un solo pozo (LC-16); se traba en la planta → en el
pozo»). `camposTocados` cuenta el campo de cada elemento que cambia; uno sin campo toca todos.
«Todavía no sé» también va en palabras («Topología: K-101 (La Ceiba): todavía no se sabe a qué
pozos sirve; el tramo de sus paradas queda en falta hasta que se diga»), y las capacidades, una
línea por campo («Capacidades de La Ceiba (se firman por primera vez): tren de crudo 11.000
bbl/d de crudo (prueba de capacidad)»).

**Metas en barriles por día, por tramos.** Cada tramo rige desde su día (hora de Colombia)
hasta que empiece el siguiente, y lleva con la misma fecha el **precio neto** y el **máximo sin
causa para publicar**. La **meta global es la suma** de los campos y nunca se guarda aparte.
Ninguna versión se sobrescribe: el libro de un mes viejo se rehace con la versión que regía.

**Sin meta firmada.** Si la configuración vigente (la última de `/configuracion/historial`) no
trae un campo, o lo trae sin tramos, ese campo **no tiene meta firmada**: ni la semilla de la
demostración ni un 0 (que daría «cumplimiento 0 %»). `metaEn`, `precioEn` y `criterioEn`
devuelven nada; el libro no le suma meta (`meta.sinMeta` y `porCampo[].sinMeta` lo dicen), no lo
valoriza (va en `sinPrecio`), no se publica (motivo `sin-meta`) y el día a día da `meta: null`.
Las pantallas (Resumen, Diferidos, Producción, Metas, Configuración) dicen «sin meta firmada» en
vez de comparar, y el total global lo dice si un solo campo no la tiene. Sin perfil firmado, el
campo no tiene ninguna familia (`perfilDe`) y la pantalla dice que falta el perfil. El gerente
puede firmar la meta de un campo que la configuración no traía: entra como campo nuevo, sin
familias en su perfil hasta que el administrador lo firme.

**Perfil del campo.** `gas` es `no`, `tea`, `consumo` o `venta`; `bombas` y
`electrosumergibles` dicen si el campo tiene esas familias. Decide qué se dibuja en la planta y
qué subpantallas existen. Una familia apagada sale de la **vigilancia** (riesgo, predicciones,
bombas): el servidor no devuelve sus avisos. Lo que esos equipos hacen perder lo dice el
controlador del pozo y **se sigue contando** en el libro.

**Plan mes a mes.** El presupuesto se firma como tramos que empiezan el día 1 de cada mes (el
mismo `POST`). La pantalla lo recibe pegado desde Excel o en CSV con la plantilla
`Mes;Campo;Producción bbl/d;Máximo de diferido bbl/d;Precio neto USD/bbl` (`plan.ts`: meses
`2026-11`, `11/2026` o `noviembre de 2026`; cifras en bbl/d o en bbl del mes). Con coma como
separador, dos celdas sin comillas, una de 1 a 3 dígitos seguida de otra de 3 dígitos, son
ambiguas **solo si la fila no muestra cómo escribe sus cifras**: si trae una cifra de 4 dígitos o
más sin separador («9000»), quien la escribió no agrupa los miles y el par son dos columnas
(`2026-11,La Ceiba,9000,500,100` se lee: 9.000, 500 y 100 USD/bbl). Sin esa prueba
(`2026-11,La Ceiba,11,200,700`) no se adivina: se pide comillas, sin miles o punto y coma. El mes,
el campo y el pozo no cuentan como cifras. El precio no se lee con separador de miles. Los
meses cerrados no se cargan.

`GET /api/configuracion` (opcional) devuelve la última versión: `{ version, fecha, por, motivo,
config }`. El front usa `/api/configuracion/historial` (Membrete, Exportar y el panel
«Versiones firmadas»).

### `POST /api/usuarios` · `PATCH /api/usuarios/:id` · `GET /api/usuarios` · `GET /api/usuarios/historial`

```json
{ "id":"u9", "nombre":"Lucía Prada", "correo":"lucia.prada@operadora.example", "rolId":"sup",
  "campos":["ceiba"], "estado":"invitado", "desde":"2026-10-02",
  "telefono":"+573005550199", "alertas":true }
```
- `POST { invitacion: { nombre, correo, rolId, campos, telefono?, alertas }, motivo }` →
  `{ usuario, acceso: CambioAcceso }`. El servidor asigna `id`, `desde` (el día del reloj del
  PLC) y `estado: "invitado"`. El historial de la invitación guarda rol, campos, WhatsApp y
  alertas.
- `PATCH { usuario, motivo }` → `{ usuario, acceso }`, solo para personas que existen (`404`).
  Al suspender, el servidor guarda `antesDeSuspender` (`activo` o `invitado`); al quitar la
  suspensión vuelve a ese estado. Nadie se borra: lo que firmó o respondió sigue a su nombre.
- Los dos exigen `usuarios:administrar`. Los rechazos traen `error.errores` por caja:
  - `403`: nadie cambia sus propios campos («Sus propios campos los cambia otro gerente»), ni se
    suspende ni se quita el rol a sí mismo; un firmante sin «todos» no otorga «todos» ni campos
    fuera de los suyos (lo que la persona ya tenía no se revisa).
  - `409`: el cambio deja la operación sin ningún gerente de activo con acceso.
  - `422`: nombre de 3 caracteres o más; correo con forma de correo y único; rol del producto;
    al menos un campo; teléfono que, normalizado, es **E.164** (`/^\+\d{8,15}$/`: un celular del
    país sin indicativo lo recibe, «300 123 4567» → «+573001234567», y uno con indicativo pierde
    espacios y separadores, «+57 300 123 4567» → «+573001234567»); el teléfono **se guarda, viaja
    y se compara en E.164**, y la pantalla lo muestra agrupado («+57 300 123 4567»,
    `telefonoLegible`); es **único entre usuarios no suspendidos** («Ese
    WhatsApp ya es de …», con restricción `unique` sobre el número normalizado); alertas solo
    con teléfono y solo en los roles que tienen reglas de WhatsApp (supervisor, operador,
    técnico, confiabilidad, jefe de mantenimiento: `ROLES_CON_ALERTAS`); motivo de 5 o más.
- `campos` es `"todos"` o una lista; `"todos"` incluye los campos que se agreguen después.

**Quién lee qué.** `GET /api/usuarios` con `usuarios:administrar` devuelve el registro completo.
Sin ella (el arranque lo pide para todos) devuelve solo las personas que comparten al menos un
campo con quien pregunta (o tienen `"todos"`), y de cada una **la forma mínima**
(`PersonaVisible` en `usuarios.ts`; la regla ejecutable es `registroVisible`):

| Campo | Quien pregunta (su propio registro) | Las demás personas |
|---|---|---|
| `id`, `nombre`, `rolId`, `campos`, `estado`, `alertas` | sí | sí: nombres en firmas, órdenes y respuestas; quién ocupa cada rol; a quién le llega cada alerta |
| `telefono` | sí | **solo si recibe alertas** (activa, con alertas encendidas y en un rol con alertas): el operador ve a quién le llegó la pregunta por WhatsApp (Telefono en Identificar). El del gerente, el de un suspendido o el de quien tiene las alertas apagadas no viaja |
| `correo`, `desde`, `antesDeSuspender` | sí (Mi perfil muestra su correo) | **no**: ninguna pantalla operativa los usa |

Ninguna regla de esas pantallas cambia con la forma mínima (destinatarios de cada alerta,
campos asignados, persona de cada rol: `verificar:contrato`, sección 8). Si a quien administra
le llegara la forma mínima, Accesos lo dice en pantalla en vez de editar sin correo
(`registroCompleto`). `GET /api/usuarios/historial` sin la capacidad responde `[]`. Mi perfil
lee el teléfono y las alertas de la persona en `GET /api/usuarios` y no los escribe: los cambia
el gerente.

### `POST /api/paradas/:evento/respuesta` (pantalla)

Cuerpo `{ evento, campoId, equipo, texto, parte?, modo? }` → `{ respuesta }` con `{ texto, por,
porId, hora, parte?, modo?, canal: "pantalla" }`.
```json
{ "evento":"BP-2011-0412", "campoId":"ceiba", "equipo":"P-201B",
  "texto":"Sello con fuga por el lado de acople; se cambió", "parte":"sello", "modo":"ELP" }
```
- `403` sin `causa:declarar` ni `causa:completar`, o si el campo del evento no es de la persona.
  **También `403` si el cuerpo trae `canal: "whatsapp"`**: una respuesta por WhatsApp solo entra
  por el webhook firmado (ver «WhatsApp»). El servidor pone `canal: "pantalla"`.
- `404` si el evento no está en el registro del PLC.
- `409` «Ya respondió …»: **la primera respuesta gana**, también en pantalla. Una respuesta no
  se edita ni se reemplaza; si hace falta corregirla, es una historia de respuestas que el
  contrato todavía no tiene (`GET /api/paradas/:evento`, pendiente).
- `422`: el `campoId` del cuerpo no es el del evento; la parte no es del equipo; en una bomba de
  la línea falta la parte; el modo no es de la parte; sin parte (o con el modo «otro») el texto
  libre tiene menos de 8 caracteres.

`parte` y `modo` salen del **catálogo de daños** de la clase del equipo: la parte es el ítem
mantenible y el modo, lo que se vio (ISO 14224 Table B.6). En un pozo con electrosumergible, una
respuesta con parte entra como **falla de la electrosumergible** (alto impacto, con su parte) y
cuenta como declarada; «no fue la electrosumergible» entra como causa de pozo, sin parte. Si
llega después de que el equipo arrancó, la parada queda como **no conformidad**.

### `POST /api/analisis/:evento`

Cuerpo `{ mecanismo, causaRaiz, nota? }` → `{ analisis }` con `{ mecanismo, causaRaiz, nota?,
por, hora }`. Capacidad `causa:completar` (confiabilidad, jefe de mantenimiento). El campo sale
del evento (el cuerpo no lo trae): `403` si no es de la persona, `404` si no existe. `422` si la
parada no tiene una respuesta declarada con parte, si `mecanismo` no es un código de ISO 14224
Table B.2 o `causaRaiz` no es de la Table B.3 (primer nivel). Un segundo `POST` es una **versión
nueva**: la anterior pasa a la historia (`anteriores` en `GET /api/analisis`), no se borra.

### `POST /api/sap/avisos`

```json
{ "tipo":"M2", "campoId":"ceiba", "equipo":"P-201B", "prioridad":1, "parte":"sello", "modo":"ELP",
  "descripcion":"Sello mecánico: fuga por el lado de acople", "inicioAveria":"2026-10-02T03:52:00-05:00",
  "parada":true, "evento":"BP-2011-0412", "evidencia":["ZS-2011 · marcha → paro · 2 de oct, 03:52"] }
```
→ `{ aviso }` con `numero`, `creado`, `creadoPor`, `origen: "trim"` y `cerrado: false`, que pone
el servidor. Capacidad `sap:aviso` (supervisor, operador, jefe de mantenimiento,
confiabilidad); `403` también si el campo no es de la persona. `409` si ese equipo ya tiene un
aviso abierto (con su número): se completa ese en SAP, no se duplica. `422` con
`campo: "descripcion"` si la descripción tiene menos de 8 caracteres. `M1` = solicitud (el
equipo marcha y una parte avisa), `M2` = avería (el equipo paró). El equipo y la ubicación
técnica de SAP salen del maestro (`identidadSap`).

### `POST /api/informes` · `GET /api/informes/:folio`

Ver «Informes exportados».

### `POST /api/asignacion-oficial`

Cuerpo `{ filas: [{ mes, campoId, pozo, bbl, horas? }], motivo }` → `{ filas, carga }`: toda la
asignación oficial como quedó (cada fila con `carga`, el id de la carga que la trajo) y la carga
registrada, `CargaAsignacion` (`asignacion.ts`): `{ id, fecha, por, motivo, grupos: [{ mes,
campoId, pozos, reemplazados }] }`. Reemplaza lo cargado de cada (mes, campo) que llega; `id`,
`fecha` y `por` los pone el servidor (`por` sale del token). Capacidad **`asignacion:cargar`**
(producción) y persona activa (`403`): la oficial de un mes la reemplaza quien la reporta, no
cualquiera con el campo. **Todo o nada**: con una fila mala no se carga ninguna (el pozo rechazado
aparecería como «falta en la oficial») y el error dice la primera fila mala: campo que no es de la
persona (`403`), mes que no está cerrado, pozo vacío, `bbl` < 0, `horas` fuera de 0 a días del mes
× 24, sin filas o sin motivo de 5 caracteres o más (`422`). **Un reemplazo no borra el rastro**:
la carga anterior sigue en `cargas` y la nueva dice cuántos pozos reemplazó. Producción muestra
quién cargó lo que rige en el mes y campo, cuándo y por qué, y el rastro de todas las cargas.

### `POST /api/planes/:id`

Cuerpo `{ estado: "aceptado" | "ejecutado", motivo }` → `{ decision: { id, estado, por, porId, fecha, motivo } }`.
Capacidad `planes:decidir` (supervisor, jefe de mantenimiento, confiabilidad) y el campo del
plan entre los de la persona. `por`, `porId` y `fecha` los pone el servidor. Un plan se acepta
y luego se marca ejecutado; no se revierte. `404` si el id no sale de `cicloValor` con los
campos de la persona (historia completa). `409` si ya está en ese estado o se ejecuta sin
aceptar. `422` si el motivo tiene menos de 5 caracteres. Las cifras del plan **no cambian**
con la decisión: solo el `estado`. Detalle en el capítulo 11.

### `POST /api/configuracion/vista-previa`

Cuerpo `{ config }` (la versión que se va a firmar, sin firmarla) → `{ impacto: ImpactoConfig }`
(`choke-config.ts`; U2 §8.5): `desde` y `hasta` ISO (las paradas que se miran: desde el primer
día del tercer mes cerrado antes del actual, hasta ahora) y `campos[]`, uno por campo que el
cambio toca, con `limitaAntes` y `limitaDespues` (lo que limita hoy con cada versión),
`criticidad[]` (solo los equipos cuyo «si falla hoy» o cuyo tramo cambian: `{ equipo, nombre,
antes, despues, tramoAntes, tramoDespues }`), `paradasQueCambian: { total, confirmadas,
porTramo: [{ de, a, paradas }] }` (`confirmadas`: las que ya dijo o confirmó una persona, que no
cambian solas) y `texto[]`, los renglones que pinta la pantalla. No guarda nada. Las mismas
reglas de la firma, en el mismo orden: `config:firmar` y persona activa (`403`), los campos
tocados entre los de la persona (`403`), `validarConfig` (`422`) y la revisión de las
capacidades que cambian (`422`, la regla 11 de la firma). Con `aunConErrores: true` en el cuerpo, esos
dos `422` no cortan la vista previa: responde `200` con `{ impacto, errores[] }` (lo que todavía impide
firmar) y la pantalla lo muestra como «borrador con errores: así quedaría» (B-53); si el borrador ni
siquiera se deja calcular, sigue el `422`. Los `403` y la forma del cuerpo no cambian. La topología no mueve barriles: el
libro es el mismo con las dos versiones; las capacidades sí cambian lo que limita y «si falla
hoy», y la vista previa lo dice.

### `POST /api/topologia/importar`

Cuerpo `{ campo, texto }`: un CSV o un pegado de Excel con dos columnas, el equipo y los pozos
a los que sirve, separadas por punto y coma, tabulador o coma (la primera fila con datos decide;
una lista dentro de una celda con coma va entre comillas). Los pozos van en lista o con una
palabra: «todos», «otro dueño» (más allá de la batería), «punto de entrega» (la brida de
salida) o «todavía no sé». Un encabezado que empieza por «equipo» o «elemento» se salta. →
`{ campoId, topologia, porSaber, hallazgos, filas }` (`TopologiaLeida`, `leerTopologia` en
`choke-config.ts`): `topologia` son los elementos de las filas sin nada que bloquee, con el
alcance y el tramo que salen del número de pozos; `porSaber`, los equipos contestados «todavía
no sé»; `hallazgos[]` `{ fila, equipo?, texto, bloquea }`. La plantilla que descarga la pantalla
(`plantillaTopologia`) usa las mismas palabras: descargarla y subirla sin cambios da lo mismo. Bloquea: equipo
vacío o que TRIM no tiene en el registro del campo, equipo repetido, sin pozos, con un pozo que
no es del campo, o un pozo que sirve a otro (un pozo solo se sirve a sí mismo, lo mismo que la firma: C-13). Avisa sin bloquear: el caso de borde (2 o 3 pozos de una misma locación). **No
firma:** lo leído va al borrador de la configuración y se firma con `POST /api/configuracion`.
`config:firmar` y el campo entre los de la persona (`403`); campo que no está en el registro
(`404`); texto vacío (`422`).

### `POST /api/planta/cambios`

Cuerpo `{ campo, cambio: { tipo: "agregar-miembro" | "quitar-miembro" | "agregar-elemento" |
"quitar-elemento", … } }` → `{ planta, cambio: CambioPlanta }` (`{ id, fecha, por, campo,
cambio }`). Capacidad `conector:configurar` y campo asignado. Se manda la **operación**, no la
planta entera: el servidor la aplica con `aplicarCambioPlanta` (`planta.ts`) sobre la planta que
él tiene. `404` si el campo no tiene esquema; `409`/`422` con un id repetido o un elemento que
no está. Cada cambio queda en el historial (`GET /api/planta/cambios`).

### Registro de la cadena: `POST /api/campos/:campo/tags/:tag/equipo` · `POST /api/inscripcion`

Ver «Cadena de datos».

### `POST /api/anh/paradas/:id/clasificacion`

Cuerpo `{ pasos, motivo?, aplicarAlEvento?, aplicarALaCascada?, ids?, cadena? }` → `{ parada:
ParadaAnh, guardadas: { clave: BorradorClasificacion } }`. `:id` es el de la fila
(`${evento}@${día}#${n}`); `pasos` lleva los valores en códigos internos (`{ "choke": "planta",
"planeacion": "no-planeada", "n1": "NP_PROC", "n2": "NP_PROC/parada-estacion-bombeo-afecta-pozos" }`).
La procedencia, `por`, `porId`, `rol`, `hora` y `n` los pone el servidor: un paso que faltaba
queda `declarado`; uno que TRIM proponía distinto, `corregido` (con `propuesto` al lado); el
mismo, `confirmado` (`declararPaso`, `anh-clasificacion.ts`). **Se guardan solo esos pasos**
(D1, «Clasificación ANH»), más los `retirado` que la coherencia pida; `guardadas` dice lo que
se guardó en esta petición, por clave. El alcance:
- sin bandera, la fila; `aplicarAlEvento`, todos los tramos del evento (Unicidad: un evento, una
  clasificación); `aplicarALaCascada`, **cada evento de las filas de `ids`** (las que mostró la
  pantalla, U2 §4.3: «Sí, a los {n}»), una escritura por evento. Si la raíz trae eventos que no
  están en `ids`, `409`: la pantalla tiene que mostrarlos antes. La fila de la dirección va entre
  los `ids`. Si el período corta la cascada (un rango que deja fuera el día en que cayó la raíz o
  el siguiente), la pantalla pide las filas de esa ventana por el mismo `GET /api/vistas/anh/paradas`
  y manda todas: dice «los 18 pozos» aunque el período muestre 4 (QA-R, vecino 12);
- el tramo de exceso del programa (`exceso`) se guarda solo, en su fila: es otra decisión, no
  planeada, y no hereda de su evento.

Revisión, en este orden: `400` la forma del cuerpo; `403` sin `anh:clasificar`, con un rol que no
es del producto o sin persona activa; `404` la fila no existe o es de un campo que la persona no
tiene (la misma respuesta); `403` un paso que el rol no dice como suyo (`PASOS_QUE_DECLARA`: el
operador, «¿Planeada?» y «Qué pasó»; el técnico, además la causa y el detalle; supervisión,
producción, el jefe de mantenimiento y confiabilidad, los seis); `409` `cadena` (la de los 6
pasos que vio la persona, con «—» en los que faltan: `cadenaVista`) ya no es la de la fila; `422`
un paso que no existe, ningún paso, un valor que no es del catálogo, «En el yacimiento» (va por
`…/yacimiento`), un `motivo` de más de 500 caracteres; `422`/`409` el alcance de la cascada (sin
`ids`, una fila de otra raíz, una raíz con más eventos); `422` una causa de la otra planeación en
alguna fila del alcance («cambie primero ¿Planeada?»: la coherencia planeada/causa está
bloqueada, C24 p.7); y lo que cambia de lo que dijeron las personas:
- en la fila de la dirección, cambiar o retirar lo que ya dijo una persona sin `motivo` de 5
  caracteres o más es `422` (C-05: cambiar «¿Planeada?» retira la causa y el detalle que no van, y
  eso también cuenta);
- en otra fila u otro evento del alcance, cambiar o retirar lo que dijo OTRA persona sin
  `motivo` es `409`, diciendo cuáles (pozo, día, paso y quién);
- retirar lo que dijo una persona, en cualquier fila, siempre lleva `motivo`.
Cuando hace falta (la escritura cambia o retira lo que dijo una persona), el `motivo` queda en el
porqué de lo que se guarda en esa petición: es una corrección con su motivo.

### `POST /api/anh/paradas/:id/yacimiento`

Cuerpo `{ evidencia, motivo?, aplicarAlEvento?, cadena? }` → como la clasificación. Pone «En el
yacimiento» en el paso 2 (`declararYacimiento`): `evidencia` es `prueba` (la prueba del pozo),
`corte-agua`, `presion` (la presión de fondo) o una nota escrita (500 caracteres o menos), y
queda en `choke.porque.evidencia` (y en `ParadaAnh.evidenciaYacimiento`). **Es de cada pozo**: el
alcance es la fila o su evento, nunca la cascada; el servidor arma el alcance solo con los campos
de este cuerpo, y un `aplicarALaCascada` que llegue no se lee (C-17). `403` sin `anh:yacimiento`
(solo producción y confiabilidad: nunca sale de una señal ni de la respuesta del operador);
`422` sin evidencia, o sin motivo si cambia lo que ya dijo una persona; `400`, `404`, `409` como
arriba.

### `POST /api/anh/paradas/confirmar`

Cuerpo `{ ids, cadena, pasos? }` → `{ paradas: ParadaAnh[], lote?: ConfirmacionLote }`. **`cadena`
es obligatoria** (`400` sin ella, C-06): se confirma lo que la persona vio. Una sola parada la
confirma quien tiene `anh:clasificar`, también cuando son varias filas de **la misma raíz**
(`campoId` + `raiz`: los días de un pozo o los pozos de una cascada son una sola decisión, C24
p. 5; B-07): van sin lote, fila por fila. Filas de paradas distintas son un lote, y un lote es
solo de quien tiene `anh:confirmar` (supervisión y producción, que firman el día; `403` para los
demás: «confírmelas una por una»); quien firma el día confirma en lote también las de una sola
raíz. Todas tienen que tener la misma cadena completa de 6 pasos (`422` si no: «confírmelas por grupo»). La confirmación es **por paso** (P1 §1.3): sube a
`confirmado` solo los pasos que el rol avala (`PASOS_QUE_CONFIRMA`) y que nadie había avalado, y
se guarda **en cada fila, nunca en su evento** (la marca del lote no se copia a otra fila). El
toque del operador confirma «¿Planeada?» y «Qué pasó», y dónde se trabó sigue siendo propuesta de
TRIM. Con «una señal apunta», la causa y el detalle solo los confirma quien abre o analiza el
equipo (jefe y confiabilidad). `pasos` son los que la pantalla mostró para confirmar: uno que el
rol no avala es `403` («Su rol no confirma «Dónde se trabó»…»), y los que no vengan no se
confirman. `404` si alguna fila no existe o es de un campo ajeno (sin decir cuál de las dos);
`409` si `cadena` ya no es la de alguna fila; **`409` si el lote no sube ningún paso** (ya estaban
confirmadas: no se guarda un lote vacío, C-19). Una fila sola que ya estaba confirmada responde
`200` sin guardar nada. El lote (`{ id, porId, por, hora, paradas, cadena, pasos }`) guarda qué se
vio (**la `cadena` de la petición**) y qué se confirmó de una vez. Hasta 1.000 filas por petición.

### `POST /api/anh/paradas/:id/respuesta`

Cuerpo `{ pregunta, opcion, aplicarAlEvento?, aplicarALaCascada?, ids?, cadena? }` → como la
clasificación (`{ parada, guardadas }`). Lo que una persona contesta en el campo a una pregunta
abierta de la fila (`ParadaAnh.propuesta.preguntas`: «¿Qué lo paró?», «¿De dónde vino el
corte?», «¿El oleoducto o el cliente estaba recibiendo?», «¿Qué fue, exactamente?»…), con
`pregunta` = su `id` y `opcion` = el **texto exacto del botón** (`OpcionCampo.texto`). El servidor
corre `responder` (`anh-clasificacion.ts`). **La respuesta no corrige ni confirma** (D1; B-04):
solo el paso que determina queda `declarado` por esa persona, con «TRIM lo dedujo de lo que
contestó …» en el porqué (y `propuesto`, si TRIM proponía otro valor); un paso que su rol no avala
como suyo (el tramo que sale de «De este pozo: su transformador…» dicho por el operador) no cuenta
como avalado hasta que lo confirme quien revisa; lo que TRIM ya proponía igual sigue siendo de
TRIM; y donde una persona ya dijo ese paso (en cualquier fila del alcance) no se deja nada: la
respuesta queda en la conversación. La respuesta queda en `clasificacion.respuestas[]` de cada
clave (`{ pregunta, opcion, sigue?, acota?, perdida?, noSe?, por, porId, rol, hora, n }`) y la
conversación sigue: al leer la fila, la pregunta que abrió (`sigue`) llega en
`propuesta.preguntas`. «No sé» no fija nada: la pregunta sigue abierta y escala a quien revisa
(`propuesta.escalada`); repetirlo, la misma persona a la misma pregunta, no se guarda otra vez.
Revisión, en este orden: `400` la forma; `403` sin `anh:clasificar`, con un rol que no es del
producto o sin persona activa; `404` la fila no existe o es de un campo ajeno; `409` `cadena`
cambió; `409` la pregunta ya no está abierta porque otra persona la contestó; `422` una pregunta
que TRIM no tiene o que no es de esta fila (C-18); `403` el rol no contesta esa pregunta
(`ROLES_QUE_CONTESTAN`: al operador nunca se le pregunta dónde se trabó; el yacimiento, solo
producción y confiabilidad); `422` la opción no es de esa pregunta; `422`/`409` el alcance de la
cascada, como en la clasificación. Se guarda por fila, por evento o por cascada como la
clasificación.

### `POST /api/anh/paradas/:id/revision`

Cuerpo `{ motivo, pedirA?, aplicarAlEvento?, aplicarALaCascada?, ids?, cadena? }` → como la
clasificación. «Algo está mal» (sin `pedirA`: a quien revisa) o «Pedir a producción»
(`pedirA: "prod"`, la pregunta del yacimiento). **No toca ningún paso** (D1): deja en cada clave
del alcance `revision: { motivo, pedirA?, por, porId, rol, hora, n }` (`RevisionAnh`; viaja en
`ParadaAnh.revision` y en `clasificacion.revision`) y la pasa a quien corrige, que la ve en
«REVISAR». Queda **atendida** (`revision.atendida: { por, porId, rol, hora }`) cuando ese rol (o,
sin `pedirA`, supervisión, producción, el jefe o confiabilidad) dice, corrige, contesta o
confirma algo de la fila. La misma revisión de la misma persona, todavía sin atender, no se
guarda dos veces. **No pisa lo que pidió otra persona** (D1): en otra fila u otro evento del
alcance donde rige una revisión de OTRA persona sin atender (el jefe le pidió a producción «¿Fue
el yacimiento?»), esa clave no se escribe y su revisión sigue; la clave de la fila de la dirección
sí la recibe. `400` la forma; `403` sin `anh:clasificar`, sin persona o con un rol que no es
del producto; `404` la fila no existe o es de un campo ajeno; `409` `cadena` cambió; `422`
motivo de menos de 5 caracteres (sin contar lo que no se ve) o de más de 500, `pedirA` que no es
un rol que revisa, o pedírselo al propio rol; `422`/`409` el alcance de la cascada. «2 Algo está
mal» por WhatsApp es esta misma escritura (ver «El webhook de WhatsApp»).

---

## Informes exportados (folio y huella)

Exportar (PDF por la ventana de imprimir, o CSV de los eventos) registra el informe **antes** de
entregarlo. **La huella la calcula el servidor**, con su propio libro y su versión vigente de
la configuración: si la mandara el navegador, el folio certificaría cualquier cifra que alguien
decidiera hashear.

#### `POST /api/informes`
Cuerpo: la **consulta**, no las cifras.
```json
{ "formato":"pdf", "titulo":"Diferidos", "alcance":"La Ceiba", "periodo":"septiembre de 2026",
  "campos":["ceiba"], "desde":"2026-09-01T00:00:00.000-05:00", "hasta":"2026-10-01T00:00:00.000-05:00",
  "equipo": { "equipo":"P-201B", "campoId":"ceiba" } }
```
`titulo`, `alcance` y `periodo` son rótulos del papel; las cifras salen de `campos`, `desde`,
`hasta` y `equipo` (solo en la ficha de un equipo). No lleva huella ni estado.
- `403` sin `evidencia:exportar` o con algún campo que no es de la persona.
- `422` si no hay campos, si un campo no existe, si `hasta` ≤ `desde` o si la ficha es de un
  equipo de otro campo.

→ `{ informe }` con `{ …consulta, folio, fecha, por, version, estado, cifras, huella }`.
`folio` es `INF-AAAA-NNNN`, consecutivo y nunca se reutiliza. `estado` es `publicable` si el
libro del período se puede publicar, `provisional` si el único motivo es `en-curso` (días sin
cierre publicado) y `bloqueado` en cualquier otro caso (`estadoDelLibro`).

**Forma canónica de la huella** (`informe.ts`: `formaCanonica`, `CLAVES_HUELLA`). Es un **texto**,
no JSON (cada lenguaje escribe distinto los números en JSON): una línea `clave=valor` por cifra,
en este orden: `campos`, `desde`, `hasta`, `version`, `real`, `potencial`, `noProducido`,
`diferido`, `tolerancia`, `metaProduccion`, `metaDiferido`, `eventos` y, solo en la ficha de un
equipo, `equipo`, `campoEquipo`, `bblEquipo`.
- Líneas separadas por LF, **sin salto final**, en UTF-8 sin BOM.
- `campos`: ids en orden alfabético unidos con coma (`ceiba,morichal`).
- `desde`, `hasta`: ISO 8601 en UTC truncado al segundo con `Z` (`2026-09-01T05:00:00Z`).
- `version` y `eventos` (número de tramos evento × pozo del período): enteros.
- Barriles: `k = floor(v × 100 + 0,5)` en doble IEEE-754, escrito como k/100 con dos decimales
  y punto (`10900.00`, `-1.50`).
- **Huella = SHA-256 del texto, en hexadecimal minúscula.**

#### `GET /api/informes/:folio` · `GET /api/informes/:folio/verificacion?huella=`
- `GET /api/informes/:folio` devuelve el registro completo (consulta, cifras, estado y huella).
  Exige sesión, y que **todos** los campos del informe sean de la persona (`403` si no; `404` si
  el folio no existe). El folio es consecutivo: sin esta regla se podrían recorrer todos.
- `GET /api/informes/:folio/verificacion?huella=…` es la comprobación para terceros (proveedor,
  regulador), sin sesión: responde solo `{ "datos": { "coincide": true, "fecha": "…" } }`. No
  devuelve quién exportó, ni campos, ni cifras. Con límite de consultas por IP.

El papel lleva membrete (empresa de la configuración), quién lo generó, hasta qué hora llegan
los datos, la versión de la configuración, el folio, la huella y la nota de cálculo: lo
producido se mide, lo no producido se calcula. Si las cifras del papel no dan la misma huella, el
documento fue modificado.

---

## WhatsApp: el carril caliente

TRIM avisa por WhatsApp a quien tiene que actuar, con reglas fijas del producto (no se
configuran por persona; `mensajes.ts`):

| Regla | A quién | Cuándo |
|---|---|---|
| Parada de un equipo de alto impacto | supervisor y operador del campo | al parar. Una bomba lleva la consecuencia según su respaldo vigente: sin respaldo, cerrar pozos; parcial, puede haber que cerrar; libre ≥ capacidad nominal, no se cierran. Una electrosumergible cita la última prueba con fecha ≤ inicio o, si no la hay, «Todavía no tiene prueba de pozo…». En una bomba, otro mensaje (`cierre`) cuando se cierra el primer pozo |
| ¿Qué se dañó? (parada que ninguna señal explica) | operador (o supervisor si no hay operador con alertas) | al parar; recordatorio a los 30 min (si el equipo ya arrancó, con `trim_recordatorio_arranco`); al supervisor a las 2 h si nadie ha respondido |
| El vigía anticipa la falla de una parte | confiabilidad y jefe de mantenimiento | cuando emite la predicción, con su ventana |
| Orden liberada en SAP | el técnico asignado | cuando SAP la libera; el aviso queda aunque la orden pase después a TECO |

**Cada mensaje dice solo lo que se sabía a su hora**: al parar una bomba no se sabe cuántos
pozos va a cerrar ni cuántos barriles va a costar. La pregunta de una bomba lleva hasta tres
partes sugeridas con su porqué, sacadas de las fallas de ese equipo **anteriores a la parada**;
una respuesta posterior no reescribe un mensaje ya enviado. En pantalla, con la parada abierta,
se suman las partes que hoy están fuera de banda o avisando, y se dice de dónde sale cada
sugerencia (`fuente: 'senal' | 'historia'`).

- **Plantillas aprobadas por Meta** (categoría utilidad, `PLANTILLAS` en `mensajes.ts`): el
  mensaje que inicia la empresa tiene que ser una plantilla. Son diez: `trim_equipo_parado`,
  `trim_electrosumergible_parada`, `trim_pozos_cerrandose`, `trim_que_se_dano`,
  `trim_recordatorio_causa`, `trim_recordatorio_arranco`, `trim_escalado_causa`,
  `trim_vigia_anticipa`, `trim_vigia_anticipa_sin_tag` y `trim_orden_liberada`. El «TRIM · » del
  comienzo y el salto antes de `{opciones}` son parte del cuerpo aprobado. Ningún parámetro va
  vacío ni con saltos de línea: las opciones van numeradas en una sola línea. Lo que sigue a la
  respuesta (¿qué vio?) va dentro de la ventana de 24 h como mensaje libre.
- `GET /api/mensajes?campos` → `Mensaje[]`: `{ id, regla, plantilla, parametros: { nombre: texto },
  campoId, equipo, para, hora, texto, opciones?, evento?, orden?, insistencia? }`. `plantilla` es
  la clave de `PLANTILLAS` (`parada`, `paradaEsp`, `cierre`, `causa`, `recordatorio`,
  `recordatorioArranco`, `escalamiento`, `parte`, `parteSinTag`, `orden`) y de ahí sale su nombre
  aprobado; `texto` es **exactamente** el cuerpo de la plantilla con sus parámetros. `Opcion` =
  `{ clave, texto, parte?, porque?, fuente?, veces?, total? }` (con `fuente: 'historia'`, `veces` de
  `total` fallas anteriores del equipo fueron de esa parte: la pantalla escribe de esas cifras, no
  de la frase de `porque`). Es **el registro de lo enviado**: se guarda al
  enviar y no se reescribe.
- **Cada mensaje se arma con la versión de la configuración que regía a su hora** (`configEn`
  sobre el historial de versiones): el perfil (si la familia se vigilaba) y el respaldo de la
  bomba (la consecuencia de la parada) son los de ese momento. Un respaldo firmado hoy no
  reescribe el texto de una parada de ayer (`mensajesDe` recibe `versiones`).
- **Un parámetro que no sirve no tumba el registro.** Si una plantilla no se puede llenar (un
  parámetro vacío o con saltos de línea, como una descripción de SAP en blanco), ESE mensaje queda
  en el registro **sin `texto` y con `noEnviado`: el motivo**, y los demás salen. La pantalla lo
  muestra como dato inválido junto al paso del hilo («no se envió a …: …»); no cuenta como avisado.

### El webhook de WhatsApp

Las respuestas por WhatsApp **no entran por el endpoint de la pantalla**. Tienen su ruta, sin
sesión de persona y autenticada por Meta:

- `GET /api/webhooks/whatsapp`: la verificación de la suscripción de Meta (`hub.mode=subscribe`,
  `hub.verify_token` igual al configurado → responde `hub.challenge`; si no, `403`).
- `POST /api/webhooks/whatsapp`:
  1. **Firma.** Rechaza con `401` todo payload sin un `X-Hub-Signature-256` válido:
     `sha256=` + HMAC-SHA256 del **cuerpo crudo** (los bytes tal como llegaron, antes de parsear)
     con el *app secret*, comparado en tiempo constante.
  2. **Deduplica** por el id del mensaje entrante (`messages[].id`): Meta reintenta.
  3. **Persona:** el número (`from`, en E.164) se resuelve a una persona **activa, con alertas y
     con el campo de la parada**. Si no, no entra, y se le contesta que no está registrado.
  4. **Evento:** se resuelve con el `context.id` del mensaje que la persona respondió (el id del
     mensaje saliente que el servidor guardó al enviarlo en el registro de mensajes), **nunca**
     con «la última pregunta abierta» de esa persona ni con un id que venga en el texto.
  5. **Opción:** el número escogido es la `clave` de las `opciones` de ESE mensaje. Con «0» hay
     que escribir qué encontró (8 caracteres o más); en una bomba, esa respuesta entra sin parte
     y el libro la cuenta en «sin parte».
  6. **La primera respuesta gana:** si la parada ya tiene respuesta, no se registra y se le
     contesta quién respondió. Al webhook siempre se le responde `200` en cuanto el mensaje
     queda aceptado o descartado; el `409` es para la pantalla.
- La respuesta queda con `canal: "whatsapp"`, `por` y `porId` de la persona resuelta.
- **El cierre de la respuesta** («Así queda lo que usted contestó … 1) Está bien · 2) Algo está
  mal»): «2» es la misma escritura que el botón de la pantalla (`POST …/revision`, B-05), a nombre
  de la persona del número, sobre las filas ANH de la parada (las de su evento o, si la parada es
  de una bomba o de un servicio, las de su cascada), con un motivo cerrado («Por WhatsApp: «Algo
  está mal» en lo que contestó»). No toca ningún paso. TRIM contesta: «Entendido. Lo revisa su
  supervisor en Identificar; usted no tiene que hacer nada más.»
- Lo que una persona escribe por WhatsApp se queda en TRIM: no viaja a la ANH ni a ningún informe
  (D2; `desc_evid` se arma con lo estructurado).

En el demo, el teléfono simulado de Identificar hace de webhook dentro del navegador
(`recibirWhatsapp` y `revisarDesdeWhatsapp` en `escrituras.ts`, con estas mismas reglas). **Con la fuente http no manda
nada**: ningún cuerpo del front lleva `canal` ni `por` (los pone el servidor), y una respuesta por
WhatsApp solo entra por el webhook firmado. El teléfono lo dice en el chat.

---

## Cadena de datos (registro)

Un cliente nuevo son **filas**, no código. Nada de la cadena se escribe por cliente:

| Pieza | Cómo entra |
|---|---|
| `gateway`, `fuente`, `tag`, `calibracion` | se descubren del certificado de nacimiento del borde |
| `equipo` (nombre, clase ISO 14224, criticidad, `servicio`, `fiscal`) | registro de ingeniería del cliente, una vez |
| `formula` | librería del producto, por (clase de equipo, tipo de tag). `calculo` solo sale en los tags de fuente `calculado`: hoy el único es `PDT-1011` (`f1-compresor-aire`) |
| `tag.equipo_id` | se resuelve solo si el borde nombra el dispositivo con el código del activo; si no, queda `pendiente` |

`v_procedencia` une todo eso (`simulador-api/esquema.sql`). La cadena **no se escribe: se
consulta**. En PostgreSQL va el mismo trigger que en el esquema de referencia (o una FK
compuesta): `tag.campo_id` es el campo de su gateway.

#### `GET /api/campos/:campo/tags/:tag/procedencia`
De dónde sale un número. `404 { codigo: "tag-no-registrado" }` si el tag no está registrado: el
front muestra el hueco, no una cadena inventada.
```json
{
  "instrumento": { "tag":"PDT-1011", "tipo":"Derivada de presión", "unidad":"psi/h",
                   "equipo":"K-101", "equipoNombre":"Sistema de aire de instrumentos",
                   "claseEquipo":"compresor-aire", "criticidad":5,
                   "limite": {"texto":"> -0,2","bajo":-0.2,"alto":null},
                   "mapeo":"descubierto|regla|manual|pendiente" },
  "lectura":     { "clase":"continua|discreta", "cadenciaS":47,
                   "protocolo":"calculado", "modo":"solo-lectura", "reloj":"el tag del que se deriva" },
  "calculo":     { "id":"f1-compresor-aire",
                   "expresion":"pendiente de la presión de cabezal (PT-1011) en la ventana, en psi/h",
                   "version":2, "ventanaMin":15 },
  "custodia":    { "editable":false, "calibracion":null },
  "tecnico":     { "gateway":{"id":"EPIC-CEIBA-01","modelo":"GRV-EPIC-PR1","serie":"…","firmware":"3.6.2"},
                   "enlace":"starlink", "bufferH":48, "ultimoVisto":"…",
                   "endpoint":null, "transporte":"mqtt-sparkplug-b/tls", "almacenamiento":"…" }
}
```
`calculo` y `custodia.calibracion` pueden ser `null` (por ejemplo `LT-2012`, un transmisor, trae
`calculo: null`). `tecnico` solo sale con `conector:configurar`: lo decide el servidor, no es un
filtro de pantalla.

#### `GET /api/campos/:campo/inventario`
```json
{ "gateways":[{"id":"EPIC-CEIBA-01","campo_id":"ceiba","modelo":"…","serie":"…","firmware":"…","enlace":"…",
               "buffer_h":48,"primer_visto":"…","ultimo_visto":"…","tags":30}],
  "tags":{"total":33,"pendientes":3},
  "equipos":[{"codigo":"K-101","nombre":"Sistema de aire de instrumentos","clase":"compresor-aire",
              "criticidad":5,"tags":"PT-1011,AIT-1011,PDT-1011"}] }
```
`404 { codigo: "campo-desconocido" }` si el campo no existe. `tags.pendientes` es siempre un
número (0 sin tags). `equipos[].tags` alimenta la sugerencia de nomenclatura que corre en el
front.

#### `GET /api/campos/:campo/tags/pendientes`
```json
[{"tag":"XI-1017","tipo":"Nivel de interfase","unidad":"%","limite_texto":"35 – 65",
  "cadencia_s":5,"protocolo":"opc-ua","gateway_id":"EPIC-CEIBA-02"}]
```
`404 { codigo: "campo-desconocido" }` si el campo no existe.

#### `POST /api/campos/:campo/tags/:tag/equipo`
Requiere `conector:configurar` y el campo asignado. Cuerpo `{ "equipo": "P-201B", "origen":
"manual|regla" }` → `{ "tag", "equipo", "origen" }`. `400` si falta el equipo o el origen no es
`manual` ni `regla`; `404 equipo-desconocido` si el equipo no es de ese campo; `404
tag-no-registrado` si el tag no existe. **Un nacimiento nunca deshace un mapeo manual o por
regla.** Para aceptar en bloque, hoy el front hace un `POST` por tag y muestra cada rechazo con
su motivo; conviene un endpoint por lotes (pendiente).

#### `POST /api/inscripcion`
Requiere `conector:configurar` y el campo asignado. Emite el código de un solo uso que se lleva
al borde; en producción se canjea por su certificado en el primer contacto. La respuesta trae el
`campo` para el que se emitió: el front lo guarda con el campo pedido y no lo muestra bajo otro.
```json
{ "campo":"ceiba" } → { "campo":"ceiba", "codigo":"KEV4Y-SQCMN", "expiraEn":"24 h", "instruccion":"…" }
```
`404 campo-desconocido` si el campo no existe.

#### `POST /api/ingesta/nacimiento`
Lo llama el borde, no el front. Forma de `NBIRTH` + `DBIRTH` de Sparkplug B. **El campo y el id
del gateway salen del certificado de cliente**, nunca del cuerpo (en el simulador, que no tiene
certificados, vienen en el cuerpo).
```json
{ "campo":"ceiba",
  "gateway":{"id":"EPIC-CEIBA-02","modelo":"GRV-EPIC-PR1","serie":"…",
             "firmware":"3.6.2","enlace":"starlink","bufferH":48},
  "dispositivos":[{
    "nombre":"P-201B",
    "fuente":{"protocolo":"opc-ua","endpoint":"opc.tcp://…:4840","reloj":"el PLC de la batería"},
    "metricas":[{"nombre":"VT-2011","tipo":"…","unidad":"mm/s","limite":"< 3,9",
                 "bajo":null,"alto":3.9,"cadenciaS":5,"clase":"continua",
                 "calibracion":{"vigenteHasta":"…","detalle":"…"}}]}]}
→ { "gateway":"EPIC-CEIBA-02", "tags":1, "pendientes":0 }
```
- `dispositivos[].nombre` resuelve el mapeo: si coincide con el código de un equipo del campo,
  el tag queda `descubierto`; si no, `pendiente`.
- **Todo o nada** (una transacción). `400 { error: { faltas: [...] } }` con rutas del tipo
  «dispositivos[1].fuente.reloj es obligatorio»; `404 campo-desconocido`; `403
  gateway-de-otro-campo` si el gateway está inscrito en otro campo; `409 tag-de-otro-gateway`
  (con `tags: [...]`) si un tag ya lo publica otro gateway. Los dos rechazos quedan en la tabla
  `rechazo`.
- Si un re-nacimiento cambia límite, unidad, cadencia o calibración de un tag, lo anterior se
  versiona en `historial_tag` en vez de reemplazarse.

**Errores generales del registro:** JSON roto, cuerpo que no es objeto o `%` mal formado →
`400`; cuerpo de más de 2 MB → `413`; lo inesperado → `500` sin mensaje interno.

---

## Línea de alto impacto: libro de diferidos, predicción y salud

El producto: **cuántos barriles no se produjeron, por qué equipo de alto impacto (bombas de
reinyección y electrosumergibles) y por qué parte, con su tolerancia; qué pasa si una bomba se
para ahora; y qué parte está por fallar.** Hoy lo calcula el front (`src/shared/api/diferidos.ts`
sobre `src/entities/`) con datos de demo; en producción lo calcula el servidor con **la misma
fórmula** y lo entrega en `/api/vistas/…`.

### Premisa: cadena de custodia

| Regla | Consecuencia para la API |
|---|---|
| Todo lo que se muestra sale de un **equipo** | Producido, diferido, causas, predicciones y salud vienen de controladores, PLC, transmisores, separadores de prueba y el computador de flujo. Ningún formulario los alimenta |
| A mano entran **solo dos cosas** | La configuración (metas, tanques, respaldos, programa), firmada y versionada; y la respuesta de un operario cuando ninguna señal explica una parada, marcada como declarada |
| La hora la pone el **PLC** | `inicio` y `fin` de cada evento, con zona horaria |
| Un dato ausente **no es cero** | Un pozo sin prueba no tiene caudal (hueco de custodia); un instrumento sin señal viaja con `valor: null`; un día sin dato del computador de flujo es `null`, nunca 0 |
| TRIM es de **solo lectura** | Nunca escribe en el PLC. La regla «no arrancar hasta identificar» es de procedimiento: TRIM registra la no conformidad |

### Insumos que el backend entrega (todos de equipos)

La forma que el motor consume es la interfaz `Insumos` de `src/entities/insumos.ts`. Ninguna
pantalla los pide: entran al servidor. Los del demo, campo por campo y con estas mismas
formas, están en `referencia/insumos/` (ver «Cómo se comprueba un backend»).

#### `GET /api/campos/:campo/pozos`
```json
[{ "id":"LC-14", "campoId":"ceiba", "levantamiento":"electrosumergible|bombeo-mecanico|flujo-natural",
   "controlador":"VSD-LC14", "alimentador":"SE-2",
   "origen":"instrumento|estimado", "fuentePrueba":"Separador de prueba automatizado SP-CE1 · FT-… · AT-…",
   "pruebas":[{ "fecha":"2026-09-12T10:00:00-05:00", "crudoBpd":820, "aguaBpd":1494, "hz":56.5 }] }]
```
Sin `origen` y con `pruebas: []` el pozo no tiene custodia: no se le asigna caudal.

#### `GET /api/campos/:campo/pozos/eventos?desde=&hasta=`
Del controlador de cada pozo (variador, controlador de bombeo, válvula de cabeza).
```json
[{ "id":"EP-LC21-261001-01", "campoId":"ceiba", "pozo":"LC-21", "inicio":"2026-10-01T18:20:00-05:00", "fin":null,
   "codigo":"GF|PH|OL|UL|OT|UV|PSH|LSHH|CMD|HZ", "senal":"POC-LC21 · código CMD", "hz":45 }]
```
`fin: null` sigue abierto. `HZ` es frecuencia reducida: `hz` es la frecuencia a la que quedó.
**Eventos que se pisan** en el mismo pozo: el servidor los normaliza para que cada hora se cobre
una vez (un paro manda sobre un HZ y, entre dos iguales, gana el primero); el estado actual de un
pozo con un paro y un HZ abiertos a la vez es el paro. La alternativa es que la ingesta rechace
los solapes; hay que escoger una y decirla aquí.

#### `GET /api/campos/:campo/servicios/eventos?desde=&hasta=`
```json
[{ "id":"SV-SE-2-…", "campoId":"ceiba", "equipo":"SE-2", "tipo":"aire|energia|compresion|evacuacion|proceso|tratamiento",
   "inicio":"…", "fin":"… | null", "tag":"52-SE2", "texto":"interruptor del pórtico 13,8 kV abierto" }]
```
`fin: null`: el servicio **sigue caído**. Su cascada usa el ahora como fin (los pozos que cierran
en ella mientras sigue caído son suyos).

#### `GET /api/campos/:campo/bombas/:equipo/paradas?desde=&hasta=`
Del PLC de la bomba. La parte que falló NO viene escrita a mano: se deduce de la primera alarma o
de la firma de las señales.
```json
[{ "id":"EV-2011-0909", "campoId":"ceiba", "equipo":"P-201B",
   "inicio":"2026-09-09T21:14:00-05:00", "fin":"2026-09-11T07:58:00-05:00",
   "perdida":1, "senal":"ZS-2011 · marcha → paro",
   "primeraAlarma":{ "tag":"LSH-2013", "texto":"fuga de sello detectada" },
   "firma":{ "parte":"sello", "tag":"LSH-2013", "texto":"…" },
   "nivelAlParar":{ "tag":"LT-2012", "pct":56.0 } }]
```
`perdida` es la fracción de capacidad perdida. `primeraAlarma` es el first-out que congeló el
PLC. `firma` la decide el backend **con las lecturas del instante de parar** y se guarda con el
evento: no cambia al cerrarse la parada ni cuando las lecturas vuelven a banda. `nivelAlParar`
es la lectura del transmisor del tanque de agua en ese instante.

#### `GET /api/campos/:campo/produccion-diaria?desde=&hasta=`
```json
{ "origen":{ "fuente":"FQI-0101 · computador de flujo de la unidad LACT-01", "bsw":"analizador|laboratorio" },
  "meses":[{ "mes":"2026-09", "publicado":true, "dias":[12443, 12582, null, …] }] }
```
Barriles netos de cada día del punto de medición oficial. `dias: (number | null)[]`: `null`, o
un arreglo más corto, es un día **sin dato** del computador de flujo, nunca un cero. `publicado`
es por campo: cada campo publica su mes. El último día del mes en curso es parcial.

#### Demás lecturas
- `GET /api/campos/:campo/tanques/:tanque/nivel` → `{ "tag":"LT-2012", "pct":61.8, "hora":"…" }`.
- `GET /api/campos/:campo/tags/:tag/serie?desde=&paso=` → la serie del historiador (vigía de
  bombas y de electrosumergibles; límites de la electrosumergible = ajustes de protección de su
  variador), con su paso explícito (tipo `SerieTag` en `tipos.ts`):
  ```json
  { "desde":"2026-09-21T14:00:00.000-05:00", "pasoH":24, "valores":[2.2, 2.1, null, 2.3, …] }
  ```
  El valor `i` es el de `desde + i × pasoH` horas. Un hueco del historiador va como `null` **en
  su lugar** (no se salta: saltarlo comprime el eje). `paso` es la cadencia que el servidor
  escoja (`1h`, `1d`…) y la respuesta la dice en `pasoH`; el vigía ajusta y proyecta en horas con
  ese paso, nunca con uno supuesto. La misma forma va en `serie` de cada dispositivo
  (`/vistas/equipos…`, `registroEquipos`) y de cada señal (`/vistas/bombas`, `/vistas/pozos…`).
  Una serie sin `pasoH`, con paso ≤ 0, `desde` sin zona o un valor que no es número ni `null` se
  rechaza al entrar (`ErrorDeContrato`). El fiscal del día del punto de medición oficial viaja
  igual: un valor por día con `null` el día sin dato del computador de flujo.
- `GET /api/campos/:campo/metrologia` → `{ "api":19.4, "apiFuente":"…", "demostrada":null }`.
  `api` puede llegar `null`: sin °API (o sin mes fiscal publicado) la banda **no es verificable**,
  la tolerancia se acota con la fila más ancha de la Fig. 10.2, se dice, y el libro no se publica
  (`bandaDe` devuelve `{ valor, fuente, verificable }`). La fila de la Fig. 10.2 se escoge con la
  producción fiscal promedio del último mes publicado. El `null` llega igual al front
  (`MetrologiaCampo.api: number | null`, y `medicion.metrologia.api` del catálogo): Configuración
  dice «sin análisis de °API del crudo», nunca «0,0 °API».
- **Instrumentación de esta fase en las bombas de reinyección:** lo que da el PLC (marcha/paro con
  primera alarma, presión de succión y de descarga, caudal) más vibración en línea, temperatura
  de la cámara de empuje, interruptor de fuga de sello, corriente del motor y nivel del tanque de
  agua. **No se mide la energía por barril**: el desgaste interno se ve cuando baja el caudal con
  la bomba en marcha. En las electrosumergibles: variador (corriente, frecuencia, desbalance) y
  sensor de fondo (presión de entrada, temperatura del motor).

### Catálogo de daños (`entities/catalogo.ts`)

Una librería por clase de equipo, con los niveles de ISO 14224 y su lugar en el perfil de
catálogo de SAP PM:

| Nivel | ISO 14224 | SAP PM |
|---|---|---|
| Parte | ítem mantenible (nivel 8) | parte del objeto · catálogo B |
| Modo | Table B.6 | daño · catálogo C |
| Mecanismo | Table B.2 | daño o causa, según el perfil |
| Causa raíz | Table B.3 | causa · catálogo 5 |

Clase del registro → catálogo (`claseDeCatalogo`, la misma con que el front escoge el catálogo de
cada bomba en `catalogoDe`, desde la clase ISO de su tecnología, `CLASE_ISO` en `bombas.ts`):
`bomba-centrifuga` de disposición,
reinyección o recobro → `bomba-inyeccion`; `bomba-centrifuga` de transporte, `bomba-tornillo` o
`bomba-multifasica` → `bomba-multifasica`; `bomba-electrosumergible` → `bomba-electrosumergible`.
Los códigos del cliente se asocian a estos en la implementación. Un pozo sin electrosumergible no
tiene partes: su parada se explica con el catálogo de causas de pozo.

### SAP PM (el backend habla con SAP; el front, solo con el backend)

TRIM **no crea órdenes de trabajo**: le manda a SAP el aviso con la evidencia, y el planeador
crea, libera y cierra la orden en SAP. TRIM lee de vuelta lo que necesita mostrar. El integrador
confirma la versión de SAP y el mecanismo (en S/4HANA, las API OData de avisos, órdenes, equipos
y stock; en ECC, las BAPI de PM o IDoc).

Órdenes: `{ numero, clase, campoId, equipo, descripcion, estado, prioridad, creada, liberada?,
cierreTecnico?, tecnico?, puesto, aviso?, horasReales, repuestos: RepuestoOrden[], evento? }` con
`RepuestoOrden = { material, descripcion, cantidad }`. `estado` es el estado de sistema de SAP:
`CRTD` creada, `REL` liberada, `PCNF` en ejecución, `CNF` ejecutada, `TECO` cerrada. Las clases
son las de la operadora (en el demo PM01 correctivo, PM02 preventivo, PM03 predictivo); el mapeo
se configura. `tecnico` es el id de la persona en TRIM (por su correo en SAP); si la orden va a
un contratista, solo `puesto`. `horasReales` son las confirmadas en SAP (reparación activa). El
equipo devuelve sus repuestos críticos: `{ material, descripcion, stock, minimo, plazoDias,
enTransito?: { cantidad, llega } }` (stock de libre utilización en la bodega del campo).

**Los tres relojes** de ISO 14224 de cada falla cerrada se arman cruzando la orden PM01
(`horasReales`, reparación activa) con la parada del PLC (`evento`, indisponibilidad total); la
espera es la diferencia. Las PM01 cerradas sin su parada se cuentan en `excluidas`.

**En el demo, la historia de SAP se deriva del PLC con una regla fija** (una correctiva por
falla cerrada, una preventiva por parada del programa, una predictiva abierta), coherente con el
registro de predicciones; en producción la devuelve SAP.

### Historial de aciertos del vigía

`PrediccionVigia` (distinta de la `Prediccion` de bombas): `{ id, campoId, equipo, parte?, tag?,
accion?, emitida, desde, hasta, calificacion, falla?: { id, inicio }, intervencion? }`. El
servidor guarda cada predicción de alto impacto cuando sale (con su ventana) y la califica
(`calificar` en `aciertos.ts`): **acierto** si esa parte falló antes del fin de la ventana;
**intervenida** si antes hubo una orden cerrada en SAP sobre el equipo (no cuenta como acierto);
**falsa alarma** si venció sin nada; **seguimiento** mientras la ventana está abierta. Las fallas
sin aviso se separan por si el vigía podía verlas (parte con instrumento, sin instrumento, sin
parte, familia apagada en el perfil), **juzgado con la versión de la configuración que regía en
`falla.inicio`**: firmar un perfil no reescribe la historia. Nada se califica hacia atrás: el
registro empieza con la puesta en marcha. En el demo, el registro se arma con una regla fija
sobre la historia del PLC (`prediccionesHistoricas`), coherente con ella y con SAP.

### Asignación oficial (cotejo)

`GET /api/asignacion-oficial` (en el arranque) → `{ filas, cargas }`: `filas` son `FilaCargada`
`{ mes, campoId, pozo, bbl, horas?, carga }`, lo que la operadora reportó, pozo por pozo, y
`cargas` el rastro de quién las cargó (ver `POST /api/asignacion-oficial`). Lo lee el backend del
sistema de contabilidad de hidrocarburos; mientras no esté conectado, producción lo sube
(`Mes;Campo;Pozo;Crudo asignado bbl;Horas`, con su motivo) con `POST /api/asignacion-oficial`. Solo meses
cerrados (`mesCerrado`: ya empezó el siguiente). Un pozo repetido en la carga es un aviso y vale
la última fila. Se coteja contra `/api/vistas/asignacion?campo&mes`: lo real del punto de
medición oficial repartido por prueba × factor × horas abierto. Un pozo está fuera cuando la
diferencia pasa la banda de asignación del campo; la diferencia se parte en lo que explican las
horas y lo que queda para la prueba o el factor. Los pozos que TRIM no tiene se marcan como dato
inválido y los que faltan en la oficial se dicen aparte. **El cotejo no cambia el libro.**

### Causa de cada evento (en este orden; `causa-senal.ts`)

**Evento de pozo:**
1. Un **servicio** del campo caído: la causa es el servicio, pero **solo para su cascada**. El
   primer cierre va a ±15 min de la caída y cada cierre siguiente a ≤ 15 min del anterior; lo
   que cierra horas después con el servicio caído tiene otra causa. Si una bomba de la línea que
   le sirve al pozo paró **antes** de la caída del servicio (más de 15 min antes), manda la bomba.
   Si el cierre cae en la cascada de dos servicios, gana el que **cayó primero**; si cayeron a la
   vez, el de **id menor** (orden de código del texto). Un servicio con `fin: null` llega hasta
   ahora.
2. Una **bomba de la línea** parada que le corta el paso a ese pozo. Con dos paradas a la vez,
   primero la multifásica que mueve ese pozo, después la de disposición (`LSHH`/`CMD`/`HZ`), y
   entre dos del mismo papel la que paró primero. El resultado no depende del orden en que
   lleguen las paradas. Hereda la causa de la parada de la bomba: su tipo, su parte, su `como` y,
   sin parte, su `porQueNo`. Su `evidencia` es el paro de la bomba, lo que identificó la causa de
   la bomba (el programa, la primera alarma, la firma o el servicio; la declaración, si fue
   declarada) y el cierre del pozo, **sin repetir renglones**; sin identificar, el `porQueNo` de la
   bomba va de último.
3. El **programa** aprobado (configuración): programada.
4. El **código del controlador**: electrosumergible `GF`/`PH` → aislamiento, `OL` → bomba de
   fondo, `UL` → admisión, `OT` → motor; bombeo mecánico `OL`/`UL` → levantamiento; `UV` →
   energía, cargada al alimentador del pozo.
5. **Declarada** por un operario.
6. **Sin identificar**: se pregunta.

**Parada de bomba:** programa → **primera alarma**, solo si es un disparo de ESA máquina que
protege una parte de su catálogo (`primerasAlarmas` del perfil) → **firma de caudal** (perdida
< 1 sin disparar) → **servicio caído** a ±15 min de la parada (con dos, el que cayó primero; en
empate, el de id menor) → **firma de las señales al parar** (`firma` del evento) → **respuesta
del operario** → sin identificar. Un tag que la máquina no declara se deja en la evidencia y no
identifica la parte.

**Identificación:** pide respuesta la parada sin identificar, o la de bomba sin parte. Si arrancó
sin respuesta, o la respuesta llegó después del arranque: **no conformidad**.

**`porQueNo`** (en la causa): **siempre** con `como: 'ninguno'`, por qué ninguna señal alcanzó
(«Sin primera alarma y sin firma: el PLC no dice qué parte falló»; en un pozo, «Ningún servicio
caído, ninguna bomba de la línea parada, fuera del programa y sin código de falla»; un pozo cerrado
por una bomba sin parte lleva el de su bomba). También es el último renglón de `evidencia`, que es
la cadena de custodia y no cambia; el front lo lee de este campo y no de su lugar en la lista.

### El modelo choke: dónde se trabó cada parada y qué limita al campo (`choke.ts`)

La producción pasa por una tubería en serie: **yacimiento → pozos → planta o estación → afuera**
(oleoducto, transportador o cliente). El campo entrega como mucho lo que deja pasar el tramo más
angosto (SPE-36848; NSTA, UKSS Production Efficiency Section Guide, §5.3). En pantalla no se
dice «choke»: se dice «¿Dónde se trabó?», «Qué limita hoy» y «Si falla hoy».

**El tramo de cada parada** (`chokeDeCausa`, regla `choke.topologia@3`). Manda el ORIGEN: la
raíz de la cascada (`Causa.equipo`: el servicio que cayó, la bomba que paró antes, el pozo), y
un solo criterio, el de Edinson: **lo dedicado a un pozo es pozo y lo compartido es planta**;
la frontera de la batería y lo de otro dueño son afuera. El alcance de cada elemento sale de la
topología (`Config.topologia`, o la que se deriva del registro: cada pozo dedicado a sí mismo;
las bombas, a los pozos de su perfil o a todos; lo del esquema de planta, a todos; el oleoducto,
de otro dueño; cada alimentador, a los pozos que cuelgan de él). Sin elemento en la topología,
el tramo sale del tipo de causa. Casos que la señal no decide y quedan como propuesta con una
pregunta: el tanque de crudo lleno («¿El oleoducto o el cliente estaba recibiendo?»), la baja
tensión de un solo pozo (se propone el pozo y se pregunta de dónde vino el corte; si cayeron
varios del mismo alimentador en la ventana de cascada, la planta) y la declaración en texto
libre. La declaración de que el comprador, el cliente o el transportador nominó menos («El
comprador nominó menos gas», ZA-06) es del mercado: afuera, subnivel mercado, de otro dueño,
con responsable `ext-transportador` y N1 `NP_TRANSP` («Restricción nominación/entrega», R2
§2.2); es lo que cambió de la `@2` a la `@3`. Un equipo firmado «Todavía no sé»
(`Config.topologiaPorSaber`) **no se adivina**: su parada queda sin tramo, en falta, con la
pregunta «¿Dónde se originó la parada…?». **El yacimiento nunca sale de una señal:** lo pone
producción o confiabilidad con su evidencia. Una parada sin causa no tiene tramo (`sin-asignar`,
«sin identificar»).

**Lo que limita** (`potencialesDelCampo`): pozos = Σ prueba vigente de los pozos con prueba ×
el factor de medición firmado del campo (`Config.capacidades[].factorMedicion`; 1 si no se
firmó: lo que propone TRIM no rige), NUNCA el factor de asignación del mes: ese sale de lo que ya pasó por la planta y
escondería lo que la planta limita (QA-A-02, decisión D3). El libro sigue valorando el diferido con
su factor de asignación: son dos preguntas distintas («cuánto pudo dar el pozo» frente a «cuánto se
asigna»); planta = el menor de los
trenes **medidos**, con la capacidad instalada (el agua pasada a crudo con las pruebas; el gas
no se mide en esta fase y no entra al mínimo); afuera = la evacuación declarada, con el mercado
de subnivel. Las capacidades son las firmadas (`Config.capacidades`) o, donde no se firmó, el
dato del demo, marcado; cada día usa las que regían ese día. Lo que limita es el menor; dos
tramos iguales al barril son un empate que se explica con la firma (`explicacionEmpate`), y dos a menos del umbral están «casi iguales» (`PARAMETROS_CHOKE`: 3 %, versionado).
Un potencial es un máximo: si el real de un día lo pasa, la capacidad declarada está corta y se
avisa (`superado`); ese día no se separa nada estructural.

**La brecha por tramo y por escalón** (`brechaPorChoke`, `choke-reparto.ts`): suma LAS MISMAS
filas que el árbol (`/vistas/anh/paradas`, con la clasificación vigente: lo que dijeron las
personas incluido), así que corregir el paso 2 o el 4 mueve a la vez la tubería, el reparto, la
serie, el mes a mes, la línea base y el árbol (QA-A-01, C-09). Cada barril va a UN tramo y a un
escalón (desarrollo, desempeño, disponibilidad planeada, disponibilidad no planeada, capacidad o
sin clasificar), y la identidad es exacta: potencial − real = Σ por tramo + sin explicar. **El
indicador del norte es UNA sola cifra**: el escalón `disponibilidad-no-planeada` (D4); todas las
vistas la leen. Lo sin identificar nunca cuenta como no planeado. `Libro.noPlaneado` es otra
cosa: lo «no programado (libro)». Si el tramo no se sabe, el escalón sale de la causa (D5). Si lo que limita no son los pozos, la parte estructural (pozos − sistema) se
separa y se dice (una frase por campo y tramo, con su cifra), nunca se suma aparte. PE = real ÷
potencial del sistema, de los campos donde aplica: en un campo de gas la eficiencia de crudo no
aplica (`pe` 0) y el conjunto es el de sus campos de crudo (`realPe`, `potencialPe`). **La PE
no siempre se puede creer** (`peCreible`): no en un campo de gas; no cuando el factor de medición
no estaba firmado y las pruebas dan menos de lo que midió el punto oficial (la brecha de las
pruebas es negativa: el potencial del sistema queda corto y PE + PE no planeada pasa de 100 %);
y no cuando la PE misma pasaría de 100 %. Entonces `textoPe` dice por qué, con lo que TRIM
propone del factor, y la pantalla **nunca** muestra el número. Con el factor firmado se cree.

**El árbol de pérdidas del choke** (`arbolDelChoke`, `choke-arbol.ts`, regla `choke.arbol@1`):
el «modelo choke expandido» de SPE-36848, que abre cada tramo «down to at least another level e.g.
ESP failure». En la ANH esos niveles son los pasos del árbol de Edinson (transcript [26:48]: «esto
está copiado del modelo choque»). Cada barril diferido del período cuelga de UN tramo y, dentro de él,
de todo el árbol, con la clasificación vigente de su fila (`/vistas/anh/paradas`), en uno de tres
órdenes: `gestion` (tramo → planeada o no → causa → detalle → equipo → parte, el del norte),
`circular` (responsable → tramo → diferida o pérdida → planeada o no → causa → detalle, el de la
circular) y `responsable` (responsable → tramo → causa → equipo). Cada nodo suma exacto sus ramas;
lo que falta va en su rama y no se reparte; la pérdida tiene su rama, vacía mientras TRIM no
registre pérdidas. El primer nivel de `gestion` es el mismo reparto por tramo de `brechaPorChoke`,
también después de que una persona corrige el paso 2: los dos leen las mismas filas
(`verificar-contrato` §12 a2).

**La tubería del agua** (`tuberiaAgua`) es el mismo modelo para la inyección: agua de los pozos →
tratamiento → tanques (colchón, no caudal) → bombas de reinyección → inyectores, con UNA cifra
por bomba (la de la predicción y el colchón). **«Si falla hoy»** (`criticidad.ts`) ordena todos
los equipos por el crudo que el campo dejaría de sacar si fallaran hoy, agotado el colchón, con
las mismas cuentas de la predicción y del riesgo (un servicio es una estimación: supone que se
cierran todos los pozos que dependen de él, y se marca).

### Clasificación ANH (Circular 024)

Vive **al lado** de la causa de TRIM, nunca encima: la causa sigue siendo la de gestión y de
ella sale una propuesta regulatoria de 6 pasos, en el orden de la circular (C24 p.5):

| Paso | `PasoAnh` | En pantalla | Valores (códigos internos) |
|---|---|---|---|
| 1 | `responsable` | Quién | `op-operacion`, `op-mantenimiento`, `op-planeacion`, `ext-energia`, `ext-transportador`, `comunidad`, `autoridad`, `tercero`, `fuerza-mayor` |
| 2 | `choke` | Dónde se trabó | `pozo`, `planta`, `exportacion`, `reservorio` |
| 3 | `impacto` | Qué pasó | `diferida`, `perdida` |
| 4 | `planeacion` | ¿Planeada? | `planeada`, `no-planeada` |
| 5 | `n1` | Causa | las 20 claves de la Tabla 1 (`P_…` planeadas, `NP_…` no planeadas) |
| 6 | `n2` | Detalle | `${n1}/${slug}`, 117 códigos (Anexo A de P1) |

**Cada paso con su procedencia** (`DatoClasificado`): `{ valor, procedencia, regla?, porque?,
por?, porId?, rol?, hora?, recibido?, lote?, propuesto? }`, con `procedencia` en `senal`,
`registro`, `regla`, `conversion`, `programa` (lo que deduce TRIM) o `declarado`, `confirmado`,
`corregido` (lo que dice una persona: llevan quién, con qué rol y a qué hora). El porqué del paso
2 guarda los datos de la frase (`PorqueChoke`: `regla`, `elemento`, `pozosServidos`, `cascada`,
`persona`, `texto`, `pregunta`, `evidencia`), no la frase armada en la pantalla.

**La coherencia está bloqueada:** planeada solo va con una `n1` `P_…`, no planeada solo con una
`NP_…`, y el `n2` es de su `n1` (la ANH rechaza la transmisión entera por esto, C24 p.7). El
códec del contrato lo vuelve a revisar al entrar: una `ParadaAnh` incoherente, o un dato de
persona sin quién ni cuándo, no entra (`ErrorDeContrato` con la ruta y el problema en palabras),
y una clasificación con los 6 pasos se arma con `clasificar`, el único constructor.

**La fila** (`ParadaAnh`, `paradasAnh`): una por pozo × día operacional × causa. El día
operacional corta a las 23:59:59 hora de Colombia; una parada que cruza la medianoche se parte
(«Tramo n de m del evento»), una abierta al corte termina a las 23:59:59 y lo dice, una
frecuencia reducida es parcial (`fraccion` < 1), un disparo de electrosumergible también es
fila, el exceso sobre la ventana del programa es otra fila no planeada, y una cascada de N pozos
son N filas con la misma `raiz`. Los barriles de la fila (`diferidaTrimBbl`) son los del libro:
no viajan a la ANH y suman exacto lo del libro. Estados: `propuesta` (los 6 pasos deducidos;
nadie los confirmó), `por-precisar` (falta un paso que la señal no decide), `confirmada` (los 6
con procedencia de persona de un rol que puede avalarlos) y `pendiente` (sin causa).

**Lo que se guarda es solo lo que dijo una persona, POR PASO, solo por inserción, y nunca se
borra ni se copia a nombre de otro** (D1, CORRECCIONES-QA):
- **Una escritura guarda solo los pasos que dijo esta persona en esta petición**, con su
  nombre, su hora y el consecutivo del servidor (`n`, el `id` de `clasificacion_paso`), en una
  clave: una fila (`ParadaAnh.id`) o un evento (`EventoPozo.id`). «Para la cascada» es una
  escritura por evento de las filas que mostró la pantalla (`ids`). Nada más viaja: ni lo que
  otras personas dijeron en la fila de origen, ni el yacimiento, ni la marca de un lote.
- **Lo que rige en una fila, paso por paso** (`rigeEnFila`, `anh-clasificacion.ts`; la vista
  `v_clasificacion_fuente` del esquema): lo más reciente (`n`) entre lo dicho en la fila y lo
  dicho en su evento; si no hay nada, lo que propone TRIM con la regla de hoy (`aplicarGuardada`).
  El tramo de exceso del programa solo usa lo suyo. Así, una escritura en otro paso del evento no
  toca lo que una persona dijo de este paso en la fila, y lo que se dice del evento después rige
  en todas sus filas.
- **`retirado`**: cuando un cambio deja incoherente lo que dijo una persona (otra planeación
  deja sin sentido su causa; otra causa, su detalle), no desaparece nada: se guarda en ese paso
  una marca `retirado` con quién, cuándo, el motivo (obligatorio) y el valor que se retira, y la
  fila vuelve a lo que propone TRIM (que, si tampoco va, queda en falta). Un `retirado` está en
  `guardadas` y en la historia; nunca rige como valor y nunca sale en `ParadaAnh.clasificacion`.
- **La revisión y la respuesta de campo no tocan pasos.** La única excepción: el paso que la
  respuesta determina (uno que faltaba, uno que TRIM proponía distinto o el tramo cuya pregunta
  del motor del choke seguía abierta) queda `declarado` a nombre de quien contestó; lo que TRIM
  ya proponía igual sigue siendo de TRIM, nada sale «confirmado» por una respuesta (B-04) y lo que
  ya dijo una persona no se toca.
- Ningún paso sale con procedencia de persona si nadie lo tocó. También se guardan la
  conversación de campo (`respuestas`, con su `n`: al leer la fila se juntan las de la fila y las
  de su evento en el orden en que se dijeron, y la pregunta que abrió cada una llega en
  `propuesta.preguntas`) y la revisión pedida (`revision`: rige la más reciente entre la fila y su
  evento).

El TS (`escribirPasos`, `escrituras.ts`, que reemplaza a `guardarClasificacion`) y el SQL
(`clasificacion_paso`, `v_clasificacion_fuente`, `clasificacion_coherente`) aplican la MISMA
regla: un backend con el esquema da la misma fila que el servidor del demo (C-03).

**`desc_evid` y lo que sale de TRIM se arman solo con lo estructurado** (D2; S1 R-D): la frase de
TRIM sobre la causa, la parte, lo que vio de la lista (el modo del catálogo), uno de los motivos
cerrados de `CAUSAS_POZO`, el id del programa y la evidencia de las señales, con la persona dicha
por su rol («Declarado por el operador de campo»). **El texto libre de una persona nunca viaja**:
ni la respuesta de una parada escrita con sus palabras (por pantalla o por WhatsApp, aunque
nombre a otras personas), ni el motivo escrito de una parada del programa, ni un motivo o un
porqué. Se queda en TRIM. Una persona no escribe `desc_evid`, y su causa general es una de las
18 (`causa_general`), nunca un texto libre. Lo mismo en las exportaciones (el CSV de Evidencia:
`causaParaSalir`).

**Una fila mala es un error del servidor** (C-15): una `ParadaAnh` con un valor fuera del
catálogo o incoherente no puede salir de un servidor con el esquema (las llaves foráneas de
`causa_n1`, `causa_n2` y `causa_general` y el trigger de coherencia la impiden al guardar); si
llega, el códec rechaza la respuesta entera con `ErrorDeContrato` y la pantalla lo dice y ofrece
reintentar. No se muestra una lista a medias como si estuviera completa.

**`propuesta`** trae lo que necesita la pantalla para lo que falta: `faltan`, `opciones` (las
cerradas que admite la regla, nunca las 117 si se pueden acotar), `sugerido`, `preguntas` (en
palabras de campo, con quién las contesta), `problemas`, `fila` y `regla` (la de `REGLAS_ANH@2`;
la `@2` agregó la fila `declarada-mercado`),
`apunta` («una señal apunta, no prueba»), `perdida`, `alternativas`, `hueco`, `preguntaChoke` y
`porqueChoke`. **`propuesta.borrador` y `propuesta.clasificacion` no viajan cuando son la misma
`clasificacion` de la fila** (el caso de siempre; eran el 42 % del peso): el front los repone al
entrar. Si alguno difiere, viaja entero.

### Cálculo del libro (asignación de producción)

```
mes m, campo c (solo los días con dato fiscal):
  T_m   = Σ días con dato Σ pozos con prueba  crudo de la prueba vigente × (horas del día − horas perdidas) / 24
          horas perdidas: parado = horas; frecuencia reducida = horas × f
          f = clamp(1 − hz ÷ hz de la prueba, 0, 1); sin hz del evento o de la prueba, f = 1 y el tramo es aproximado
          (la misma regla en el libro, el riesgo, la predicción y los caudales de ahora)
  R_m   = Σ días con dato del fiscal del punto de medición oficial
  FA_m  = R_m / T_m        debe caer en la banda de la Res. 40236 (Fig. 10.2); un mes sin días con dato no tiene FA
potencial = Σ pozos con prueba  crudo × FA_m × horas / 24      (los días sin fiscal no entran ni aquí ni en lo real)
diferido de un evento = crudo × FA_m × horas × f / 24
          se parte por día (cambia la prueba y el factor) y se recorta al período
identidad en un mes entero:  potencial − real = Σ diferidos         (exacta)
en un período que corta meses: la diferencia es inventario entre días (se muestra)

tolerancia: dentro de un campo, Σ bbl × banda (es el mismo sesgo en todos los pozos) y la hora
del PLC (√2 · 1 s / horas) en cuadratura; entre campos, en cuadratura. Lo de frecuencia
reducida es aproximado (ley de afinidad) y queda fuera de la tolerancia.

alto impacto      = bombas de reinyección + electrosumergibles
  vigilado        con la parte identificada y una variable instrumentada que la anuncia o la daña
  sin instrumento con la parte identificada y nada que la vigile en ese equipo
  sin parte       sin la parte identificada
evitable por orden = por parada de reinyección que no cerró todo el campo, escogiendo solo entre
                     los pozos que producían al empezar sus cierres:
                     bbl × (1 − crudo del orden óptimo / crudo de lo que se cerró)
                     orden óptimo: menos crudo por barril de agua primero, hasta quitar la misma agua
                     (una electrosumergible entera o a lo más 25 % menos: el mismo orden de cierre)

meta (metaEntre)  = Σ campos Σ días del período  tramo vigente ese día × horas del día dentro del período / 24
                    produccion con produccionBpd, diferido con diferidoMaxBpd. Lo que va a la fecha se
                    prorratea por horas; el total del mes en curso llega hasta su último día (MetaPeriodo:
                    produccion, diferido, produccionDia, diferidoDia, produccionTotal, diferidoTotal, dias, diasTotal,
                    sinMeta). Un día sin tramo firmado no suma: el campo va en sinMeta y la meta no es comparable
línea base        = brecha por día de los 3 meses publicados en todos los campos antes del período
                    (baseDia = brecha ÷ días); periodoDia = brecha del período ÷ días transcurridos;
                    cambio = (periodoDia − baseDia) ÷ baseDia. Sin tres meses, no hay base. Es contexto, no meta
valor             = Σ campos Σ días con dato fiscal y con precio  (potencial − real) del día × precio neto de ese día
                    un día sin precio no se valora; valorUsd existe si al menos un día tuvo precio
                    valorCampos = { con: campos con precio todos sus días, total: campos }
                    sinPrecio   = campos con al menos un día sin precio
publicable        = sin motivos: días sin cierre publicado (en-curso), días sin fiscal, meses sin
                    factor, banda sin verificar, FA fuera de banda, un campo sin meta firmada (sin-meta),
                    o sin identificar > criterio del campo (la regla de cierre que regía al final del período)
```

`sinFiscal: [{ campoId, dias }]` y `sinFactor: [{ campoId, mes }]` dicen los huecos con su
motivo; lo real y el potencial los excluyen y el libro queda con `publicable: false`. Formas que
admiten null: `EstadoCampo.ayer.bbl`, `Dia.real` y `Dia.residuo` (más `Dia.faltan: [campoId]`),
y `Tramo.sinFactor: boolean`.

### Predicción: si la bomba se para ahora

```
agua que mueve   = mediana de su medidor de caudal mientras trabaja (sin medidor: capacidad, y se dice)
agua sin salida  = max(0, mueve − respaldo libre) × fracción sin bomba
colchón (h)      = (alto-alto − nivel ahora) × capacidad / (agua sin salida / 24)    null si no se llena
  tolerancia     = √( (0,2 % × capacidad / libre)² + banda del agua² )   aforo (Res. 40236, Anexo 2) y medidor
orden de cierre  = sin respaldo: todo el campo; con respaldo: menos crudo por barril de agua primero,
                   cada pozo entero si cabe; si no, en parte, y una electrosumergible a lo más 25 %
                   (≈ 45 Hz: BAJA_MAXIMA_ESP) y lo que falta lo da el siguiente; si al final falta agua,
                   las que se bajaron en parte se cierran enteras (el mismo orden para lo evitable)
crudo en riesgo  = Σ crudo asignado de lo que se cierra; se compara contra cerrar parejo
parada medida    = colchón previsto (con el nivel al parar y el tanque y el respaldo que regían al parar)
                   contra el observado (paro → primer pozo cerrado)

YA PARADA (disposición, con tanque y nivel): llenado — el tanque sube con lo que la parada dejó sin salida
                   y que todavía no se quitó cerrando pozos
agua que entra   = Σ agua de la prueba vigente de los pozos que producen ahora (× la parte que no pierde el
                   que va a frecuencia reducida; la misma del caudal de agua de /vistas/campos/:campo/ahora):
                   se devuelve para leer, no entra en la cuenta
agua quitada     = Σ agua de la prueba vigente de los pozos cerrados por la parada (perdiendo.pozos), con
                   la parte que deja de dar el que va a frecuencia reducida
agua sin salida  = max(0, (pérdida de la parada × mueve − respaldo libre) × fracción sin bomba − agua quitada)
horas            = (alto-alto − nivel ahora) × capacidad / (agua sin salida / 24)          null si no sube
  tolerancia     = √( aforo² + banda del agua² )   (el agua de las pruebas, no del medidor)
prioridad        = 1 ya en el alto-alto · 2 menos de 24 h · 3 hasta 90 días · 0 no sube o más allá
```
`colchon` sigue siendo «si parara ahora con todo produciendo»: con la bomba ya parada y los pozos
que hacía falta cerrar ya cerrados (La Ceiba hoy: P-201B parada, 15 de 18 pozos produciendo)
`colchon.horas` da menos de 0,1 h, pero `llenado` da `horas: null` y `prioridad: 0`: la parada dejó
44.100 bbl/d sin salida y se cerraron 48.510 (LC-16 y LC-07), así que el tanque no sube; no hay alarma
por eso. Cuadra con Planta: entran ≈ 174.000 y P-201A y P-201C sacan hasta 178.500 (2 × 89.250). La pantalla (Planta) pinta el tanque con `llenado.prioridad`,
o P1 si ya está en el alto-alto.

#### Costo si falla hoy (`Riesgo.costoFalla`)

```
Q   = crudo por día que se pierde si para hoy: crudoBpd de la predicción (en el orden de cierre);
      en una electrosumergible, el crudo asignado del pozo hoy
dᵢ  = horas de cada falla CERRADA del equipo (sin disparos)        d̄ = su promedio
h   = colchón de hoy (colchon.horas de la predicción)

disposición con tanque          costo = Q × (1/n) Σ max(0, dᵢ − h) / 24     colchonH = h
disposición sin colchón         costo = Q × d̄ / 24  (sin tanque o sin su nivel: un techo, y se dice)
respaldo que absorbe toda el agua (colchón infinito), o recobro      costo = 0
multifásica (transporte)        costo = Q × d̄ / 24
electrosumergible               costo = Q × d̄ / 24; sin fallas propias, d̄ de las electrosumergibles
                                del campo (costoDe 'flota')
sin fallas cerradas propias (ni flota)                               costoFalla ausente
```
Ejemplos del demo: P-201B de Morichal = 1.670,7 × promedio(max(0, dᵢ − 19,05)) / 24 ≈ **2.086 bbl**;
MPP-301 ≈ **3.244,5 bbl**. Lo que el equipo ya costó por falla (`bblPorFalla`, 3.364,6 en P-201B de
Morichal) es la historia, no esta cifra.
El tanque de una bomba se busca por la clave (`campoId`, `bomba`) en `tanques[]` de la
configuración firmada; el respaldo, por (`campoId`, `equipo`) en `respaldos[]`.

### Historia de fallas

Una **falla** es una parada propia del equipo (no la que causó otro equipo ni la programada). En
la electrosumergible, un evento que vuelve a arrancar en menos de **24 h** es un **disparo**, no
una falla. Tiempo entre fallas = días de historia ÷ fallas, **solo con dos fallas o más** (cuenta
la falla abierta). Tiempo fuera (`mdtH`) = promedio de la duración de sus fallas **cerradas**
(incluye la espera; la reparación activa sale de las órdenes de SAP). Una parada que el tanque
absorbió cuenta como falla con 0 bbl. `bblPorFalla` = barriles promedio de sus fallas cerradas: lo
que **le ha costado por falla** (la ficha y Confiabilidad lo rotulan así); no es `costoFalla` de
Riesgo, que es lo que costaría si fallara hoy.

### Salud por parte

Cada parte agrupa las variables de su familia con un papel: **anuncia** (su tendencia anticipa la
falla), **la daña** (la causa) o **confirma** (cambia cuando la falla ya empezó).

| Estado | Regla |
|---|---|
| `fallo` | la parada abierta se le atribuye a esta parte (primera alarma o firma; en una electrosumergible, la causa del evento abierto del pozo cuando es su propia electrosumergible: código del variador o declarada con la parte) |
| `fuera` | una variable que anuncia o confirma ya salió de su banda o su instrumento reporta alarma (con el equipo parado, lo que solo confirma no cuenta) |
| `detenida` | el equipo está parado: no hay tendencia que leer |
| `avisa` | una variable que anuncia o daña llega a su alarma en ≤ 90 días (pendiente > 2 errores estándar, y de un mecanismo que no es choque), o lo que la daña ya está fuera de banda |
| `estable` | instrumentada y sin tendencia hacia la alarma (más de 90 días = «tendencia lenta») |
| `sin-dato` | nada de lo que la anuncia está instrumentado o con señal |

Prioridad: `fallo` 1; `fuera`, la del instrumento; `avisa`, 2 si lo que la daña está activo o
llega en menos de 24 h, si no 3. En electrosumergibles, fuera de banda sin alarma es atención,
igual que en las bombas.

### Vigía

Mínimos cuadrados sobre la serie de cada variable que anuncia un mecanismo de degradación de ISO
14224. **Solo se proyecta lo que anuncia un mecanismo que no es «choque»** (la misma regla para
la salud de las partes y para el veredicto); el 4.5 (falla de tierra o aislamiento) se clasifica
como degradación. Proyecta el cruce **solo si la pendiente supera dos errores estándar**; si no,
responde «sin tendencia». El rango de días sale de la pendiente ± 2 errores estándar. Con el
equipo detenido o el instrumento sin señal, no proyecta. Cada punto va en su tiempo real
(`i × pasoH` horas desde `desde` de la serie; los huecos no entran y no mueven a los demás), la
pendiente sale en unidades por hora y las horas para cruzar se cuentan desde el último lugar de
la serie. Proyecta contra la `alarma` del límite del tag (`limites`), la misma que lee la salud.

**Lo que ve operación de las señales de un pozo** (ISA-101: solo lo anormal, con su nombre):
bajo «fuera de banda» va lo que el instrumento reporta en aviso, atención o alarma; un instrumento
sin señal con el pozo produciendo es dato inválido y va aparte («sin señal en línea»). Sin señal
con el pozo parado es lo esperado (el sensor de fondo y el desbalance no transmiten con el motor
apagado) y no se muestra: sería una marca permanente en cada electrosumergible parada.

### Reporte con PRODML

Cada tipo de causa cae en una casilla de `ReasonLost` (`src/entities/causas.ts`): reinyección,
multifásica, energía, aire y compresión → *topside equipment failure-maint*; electrosumergible y
bombeo mecánico → *well equipment failure-maint*; programada → *planned maint turnaround*;
separación y tratamiento → *process and operation problem*; evacuación → *3rd party processing*.
Lo declarado o sin identificar no tiene casilla hasta que se clasifique. **Es de gestión, no la
salida regulatoria:** lo que pide la ANH (los 6 pasos de la Circular 024) es «Clasificación ANH»,
arriba.

---

## Modelo de datos de lo que se escribe

El esquema de `simulador-api/esquema.sql` cubre solo la cadena de datos. El de
`2-documentos/TRIM_Hidrocarburos_esquema.sql` del paquete describe el balance de cierre anterior
(`evento_diferido`, `v_cierre_balance`) y **está obsoleto**: no es el método de asignación que
calcula el motor. Lo que el servidor tiene que guardar del lado de escritura, con sus claves (las
formas exactas son los tipos TS citados):

| Tabla | Clave | Forma | Regla |
|---|---|---|---|
| `version_config` | `version` (entero consecutivo) | `Version` (`configuracion.ts`): fecha, por, motivo, cambios[], config completa (JSON o normalizada en tramos, tanques, respaldos, programa) | nunca se actualiza ni se borra |
| `usuario` | `id` | `Usuario` (`usuarios.ts`), teléfono también en E.164 | `unique` sobre correo en minúsculas y sobre el E.164 de los no suspendidos |
| `cambio_acceso` | `id` | `CambioAcceso` | solo se inserta |
| `respuesta_parada` | `evento` | `Respuesta` (`pozos.ts`): texto, por, porId, hora, parte?, modo?, canal | una por evento: la primera gana (restricción `unique`) |
| `analisis` | (`evento`, versión) | `Analisis` (`catalogo.ts`) | la vigente es la última; las anteriores quedan |
| `aviso_sap` | `numero` | `AvisoSap` (`sap.ts`) | uno abierto por (campo, equipo) |
| `informe` | `folio` | `Informe` (`informe.ts`): consulta, cifras, estado, huella | folio consecutivo por año, nunca reutilizado |
| `mensaje` | `id` (+ el id de Meta del mensaje saliente) | `Mensaje` (`mensajes.ts`): con `texto` si salió o con `noEnviado` (el motivo) si no | se guarda al intentar enviar y no se reescribe |
| `prediccion` | `id` | `PrediccionVigia` (`aciertos.ts`) | se guarda al emitirse; la calificación se agrega al vencer |
| `asignacion_oficial` | (`mes`, `campoId`, `pozo`) | `FilaCargada` (`asignacion.ts`): la fila y la `carga` que la trajo | se reemplaza por (mes, campo), todo o nada |
| `carga_asignacion` | `id` | `CargaAsignacion` (`asignacion.ts`): fecha, por, motivo, grupos (mes, campo, pozos, reemplazados) | solo se inserta: el rastro de quién cargó o reemplazó la oficial |
| `cambio_planta` | `id` | `CambioPlanta` (`planta.ts`) | solo se inserta; la planta vigente es el resultado |
| `topologia` | (`version`, `orden`); único (`version`, `campo_id`, `elemento`) | `ChokeDeElemento` (`choke.ts`) de cada versión firmada: elemento, alcance, choke, pozos, campo (null = todos), caso de borde | dentro de `version_config` (la `Config` lo trae en `topologia`); el `choke` tiene que ser el que sale del alcance |
| `clasificacion_paso` | `id` (consecutivo, `DatoClasificado.n`); la última por (`clave`, `paso`) en `v_clasificacion_vigente`; lo que rige en cada fila, paso por paso, en `v_clasificacion_fuente` | `DatoClasificado` (`anh-clasificacion.ts`) de lo que dijo una persona en una fila (`clave` = `ParadaAnh.id`) o en un evento (`clave` = `EventoPozo.id`): paso, valor, procedencia (`declarado`, `confirmado`, `corregido` o `retirado`), regla, porqué, quién, rol, hora, lote, propuesto | solo se inserta, y solo los pasos de cada petición (D1); en cada fila rige lo más reciente entre su clave y la de su evento; coherencia de lo que rige revisada al confirmar; persona activa, con su rol y su campo, y pasos de su rol (`paso_por_rol`); N1, N2 y causa general del catálogo (FK) |
| `confirmacion_lote` | `id` | `ConfirmacionLote` (`anh-paradas.ts`): quién, cuándo, las filas, la cadena que vio (la de la petición) y los pasos que subió (al menos uno) | solo se inserta |
| `respuesta_campo` | `id` (consecutivo, `RespuestaCampo.n`) | `RespuestaCampo` (`anh-clasificacion.ts`): la pregunta, el botón, lo que abre, acota o propone, quién y cuándo, por fila o por evento | solo se inserta, en el orden de la conversación; pregunta y opción del catálogo (`pregunta_campo`, `opcion_campo`) y el rol entre los que la contestan (`contesta_pregunta`) |
| `revision_parada` | `id` (consecutivo, `RevisionAnh.n`) | `RevisionAnh`: motivo, a quién se le pide, quién y cuándo, por fila o por evento | solo se inserta; rige la más reciente entre la fila y su evento; no toca ningún paso |
| `revision_atendida` | `revision_id` | `RevisionAnh.atendida`: quién la atendió y cuándo | una por revisión; la atiende el rol al que se le pidió o uno que revisa |
| `topologia` · `topologia_por_saber` | (`version`, `orden`) | `ChokeDeElemento` y `ElementoPorSaber` (`choke.ts`) de cada versión firmada | dentro de `version_config`; un pozo solo se sirve a sí mismo; un equipo no está a la vez contestado y «Todavía no sé»; sin pozos repetidos |
| `capacidades_campo` · `capacidad_firmada` | (`version`, `campo_id`) · (`version`, `campo_id`, `tramo`, `equipo`) | `CapacidadesCampo` y `CapacidadFirmada` (`capacidades.ts`); el factor de medición y su porqué en `capacidades_campo` | dentro de `version_config`; la bomba es del tren de agua del campo; el factor, entre 0,5 y 1,5 y con su porqué, nunca en un campo de gas |
| `causa_n1` · `causa_n2` · `causa_general` · `paso_por_rol` · `pregunta_campo` · `contesta_pregunta` · `opcion_campo` | sus claves | los catálogos que cierran lo que se escribe (`anh-catalogo.ts`, `anh-clasificacion.ts`) | del producto: salen del motor |

---

## Cómo se comprueba un backend

1. **Los números, por HTTP, en cualquier lenguaje.** `referencia/` trae, para los cinco campos
   del demo, **lo que entra** y **lo que tiene que salir**:
   - `referencia/insumos/`: los insumos con la forma de los endpoints de insumo de este
     contrato. Cada archivo es `{ "endpoint", "respuesta" }`, y `referencia/indice.json`
     (`insumos[]`) los lista todos:

     | Archivo | Endpoint | Carga |
     |---|---|---|
     | `<campo>/pozos.json` | `GET /api/campos/:campo/pozos` | pozos, pruebas y origen de la prueba |
     | `<campo>/pozos-eventos.json` | `GET /api/campos/:campo/pozos/eventos?desde=&hasta=` | eventos del controlador de cada pozo (los del demo traen pegada la `respuesta` histórica de quien declaró la causa) |
     | `<campo>/servicios-eventos.json` | `GET /api/campos/:campo/servicios/eventos?desde=&hasta=` | caídas de energía, aire, compresión… |
     | `<campo>/bombas/<equipo>-paradas.json` | `GET /api/campos/:campo/bombas/:equipo/paradas?desde=&hasta=` | paradas del PLC con primera alarma, firma y nivel al parar |
     | `<campo>/produccion-diaria.json` | `GET /api/campos/:campo/produccion-diaria?desde=&hasta=` | el fiscal día a día (`null` = sin dato) y su `origen` |
     | `arranque/campos.json`, `arranque/catalogo.json` | `GET /api/campos`, `GET /api/catalogo` | registro de campos, perfiles de bomba, registro de equipos con sus series, límites de cada tag, medición oficial y metrología |
     | `arranque/configuracion-historial.json` | `GET /api/configuracion/historial` | la versión de arranque: metas, precio, tanques, respaldos y **programa de paradas** |
     | `arranque/paradas-respuestas.json` | `GET /api/paradas/respuestas` | las respuestas guardadas (vacío al arrancar) |
     | `<campo>/electrosumergibles.json` | **ninguno todavía** (`"endpoint": null`) | de cada electrosumergible, sus cinco señales: `tag`, `unidad`, `serie` (`SerieTag`, la del historiador), `normal` y `alarma` (los ajustes de protección de su variador) |

     El rango `desde`/`hasta` es toda la historia, del primer mes del calendario a AHORA
     (2026-10-02T14:00-05:00, el reloj del demo): un backend que los sirva por esos endpoints
     o los cargue en su base parte de lo mismo que el motor. Las lecturas de las
     electrosumergibles son la excepción: el motor del demo todavía las arma del pozo
     (`entities/esp.ts`) y el contrato no dice por qué endpoint llegan los ajustes del variador
     (ver «Pendiente»). Van en su archivo para que el backend tenga los números, y los casos que
     las leen (riesgo, aciertos y la salud de los pozos de los campos con electrosumergibles) lo
     dicen en `requiere`.
   - Los casos (`referencia/<familia>/…json`, cada uno `{ id, descripcion, endpoint, esperado }`):
     libro del último mes cerrado, serie mensual y producción día a día, por campo y del
     portafolio; riesgo del vigía; registro de predicciones y fallas (aciertos); avisos y
     órdenes de SAP; bombas con la salud de cada parte y pozos con la de su electrosumergible
     (último mes cerrado); predicción de cada bomba si se para ahora; y la asignación por pozo
     de cada mes cerrado. `referencia/indice.json` (`casos[]`) los lista con su endpoint.

   Las familias del modelo choke y del árbol de paradas (21-oct-2026), del último mes cerrado
   por campo y del portafolio: `choke/` (lo perdido por tramo y por escalón con la
   eficiencia, mes a mes, contra la línea base, «si falla hoy», la tubería de cada campo, qué
   limitó cada día, la topología y sus propuestas), `agua-choke/` (la tubería del agua de
   cada campo) y `anh/` (las filas de `paradas_pozo` con la clasificación que propone TRIM y
   su calidad, sin nada dicho por una persona). La topología de Morichal marca un caso de
   borde con la locación de sus pozos, que todavía no tiene endpoint: va en
   `referencia/insumos/morichal/locaciones.json` (`"endpoint": null`) y sus casos lo dicen en
   `requiere`.

   El árbol de pérdidas del choke (22-oct-2026), en `choke-arbol/`: el del último mes cerrado de
   cada campo y del portafolio, en los órdenes `gestion` y `circular` (con las cadenas de la forma
   `C024-2026`), con la clasificación que propone TRIM (sin nada dicho por una persona).

   Con esos insumos cargados:
   ```bash
   node scripts/referencia.mjs comparar --base-url=http://servidor:8080
   ```
   pide cada `endpoint` (que ya trae `/api/…`) y compara: la respuesta tiene que **contener** lo
   esperado (puede traer más, salvo las claves que dicen algo con solo venir: `AUSENTES` en
   `scripts/referencia-diferencias.mjs`, como `colchonH`, `revision`, `siParaOtra`, `hz`,
   `techo` o `retiros`), los números valen iguales con una diferencia de hasta 1e-6
   relativo o 0,005 absoluto, las fechas se comparan como instante y el orden de las listas
   importa. Sale con 1 si algo no coincide.

   **Las escrituras rechazadas** (`referencia/escrituras/`, C-08): 18 secuencias de POST del
   árbol de paradas con el HTTP y el código del contrato que tiene que dar cada paso (403, 404,
   409, 422 y 400, y las aceptadas que los preparan: «el jefe corrige con motivo; el supervisor
   cambia lo mismo para la cascada sin motivo → 409 `cambia-a-otra-persona`»):
   ```bash
   node scripts/referencia.mjs comparar --base-url=http://servidor:8080 --escrituras --tokens=tokens.json
   ```
   Las aceptadas **escriben**: va contra un backend recién cargado con el arranque, una vez (cada
   caso toca filas y eventos que ningún otro toca). El rol de cada paso viaja en `x-rol` y, con
   sesión, con el token de ese rol (`--tokens`, `{ "sup": "…", "jefe": "…" }`, o `TRIM_TOKENS`;
   si no, el de `--token`). Un rechazo vale si trae el mismo HTTP y el mismo `error.codigo`. El
   caso `403-rol-desconocido` manda el rol `cont` (de la versión 2): con sesión necesita el token de
   una persona con ese rol, porque el backend lee el rol del token y no de `x-rol`. `npm test` comprueba que los archivos de
   `referencia/insumos/` bastan: arma todos los casos con los insumos **leídos de esos
   archivos** (no con los de `src/entities/datos/`) y deben dar lo mismo.
2. **El front contra el backend.** En `.env.local`: `VITE_FUENTE=http` y
   `VITE_API_URL=http://servidor:8080/api` (absoluta; con una relativa, `/api`, el front pide al
   mismo dominio, y la política de seguridad ya lo permite). Con `npm run dev`, Vite manda `/api`
   a esa dirección por su proxy y no monta el simulador. Luego `npm run e2e -- --project=dev`
   (con `TRIM_URL` si el front no está en `http://localhost:5173`): los flujos de navegador y el
   auditor de `e2e/`. Sus aserciones usan los datos del demo, así que el backend tiene que
   servir los insumos de `referencia/insumos/`.
3. **La forma del cable**, sin backend: `npm run verificar:contrato` prueba que cada endpoint de
   `contrato.ts` vuelve igual por JSON y que la fuente http, contra un servidor de prueba,
   traduce 403/409/422 al mismo `{ ok: false, error }`. Es la especificación ejecutable de lo que
   el backend tiene que producir (`aDTO` de cada códec).
4. **Las reglas**, en TypeScript: `npm run verificar` (`scripts/verificar-libro.mjs`) corre hoy
   más de 250 comprobaciones del motor, de las reglas de escritura y del simulador. El número
   crece con cada corrección; el script imprime el total al final («N de N comprobaciones
   bien»). Cubre, por secciones: identidades de cada mes y campo; portafolio; factor de
   asignación y custodia; colchón de las bombas; preguntas y no conformidades; lo que entra a
   mano (metas, accesos, plan, perfil); historia de fallas; SAP, WhatsApp, aciertos y asignación
   oficial; huella, firma y mensajes; reglas de causa; datos que faltan o se pisan; estado,
   dirección y costura; pantallas; componentes y contraste; el simulador del registro; la
   costura y sus cachés; y que las escrituras se limitan a los campos de la persona. Un backend
   en otro lenguaje no lo corre: lo que tiene que dar está en `referencia/` y en estas reglas.

`npm test` corre `tsc -b`, `oxlint src`, `verificar`, `verificar:contrato` y
`referencia.mjs comprobar` (que `referencia/`, casos e insumos, no se desvíe del motor ni de los
datos del demo; si cambian a propósito, `npm run referencia` la regenera). `npm run e2e` corre
las pruebas de navegador (levanta su propio servidor).

---

## Despliegue del front

Variable de build `VITE_FUENTE` (ver `.env.example`): sin definir o `demo`, los insumos de
demostración se cargan con import dinámico (`shared/api/fuente.ts`) y la costura calcula en el
navegador; con `http`, el build no trae el paquete de datos y cada consulta es un GET y cada
escritura un POST/PATCH al servidor. `VITE_API_URL` va absoluta (`https://api.…/api`: la
política de seguridad del build agrega su origen a `connect-src`) o relativa (`/api`: el mismo
dominio, que `'self'` ya cubre); otra cosa detiene el build diciendo qué se esperaba
(`verificar:contrato`, sección 7).

El servidor que publique el front tiene que mandar estas cabeceras (las de
`demo/cabeceras.mjs`; con API en otro origen, `politica(html, { api })`):

| Cabecera | Valor |
|---|---|
| `Content-Security-Policy` | la de `demo/cabeceras.mjs`, con `frame-ancestors 'none'` (en un `<meta>` no vale: va en la cabecera) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `X-Frame-Options` | `DENY` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

Se sirve por **HTTPS**: el demo calcula la huella del informe con `crypto.subtle`, que el
navegador solo ofrece en un contexto seguro (HTTPS o localhost).

---

## Pendiente en el front para producción

Con `VITE_FUENTE=http` y `VITE_API_URL` el front ya pide cada consulta y cada escritura al
servidor, y el build no lleva los datos del demo. Lo que **todavía** es del demo y hay que
cambiar en el código antes de producción:

- **La sesión:** arrancar con `GET /api/sesion` (persona, rol, campos y capacidades del token)
  en vez del rol de la dirección (`#/rol/…`), y quitar «Cambiar de rol» fuera del demo.
- **Las cabeceras del prototipo:** `x-rol` (escrituras.ts) y `x-capacidades` (registro.ts,
  procedencia.ts). El servidor no las lee; con la sesión dejan de mandarse.
- **`GET /api/usuarios/historial`** solo con `usuarios:administrar` (hoy el arranque lo pide para
  todos y el servidor responde `[]` sin la capacidad).

El teléfono simulado de Identificar es del demo: con la fuente http no manda nada y lo dice
(la respuesta por WhatsApp solo entra por el webhook firmado de Meta).

## Pendiente del lado del servidor

- **Sesión e identidad:** `GET /api/sesion`, el token y el servicio de identidad (inicio y fin de
  sesión, contraseña, sesiones abiertas). Lo que cambia en el front, arriba.
- **Webhook de WhatsApp** (`/api/webhooks/whatsapp`) y el envío por la Cloud API de Meta con las
  diez plantillas, guardando el id de cada mensaje saliente.
- **`GET /api/informes/:folio/verificacion`** para terceros.
- **`GET /api/paradas/:evento`** con `respuestas[]` y `analisis[]` históricos.
- **Asociar tags por lotes** (`POST /api/campos/:campo/tags/equipo` con `[{ tag, equipo, origen }]`,
  resultado tag por tag).
- **Alarma del límite en el registro de la cadena:** el simulador guarda la banda normal de
  cada tag (DBIRTH) y su procedencia la cita; la alarma (`limites[tag].alarma`, base maestra de
  alarmas) la entrega el catálogo. Si el servidor quiere servir la alarma también en la
  procedencia, va en `instrumento.limite.alarma` con la misma forma.
- **Reloj de los datos:** `generadoEn` / `datosHasta` en las respuestas, o `GET /api/reloj`. Los
  períodos ya salen de `calendarioDe(ahora)` (`reloj.ts`).
- **Eventos de pozo que se pisan:** normalizarlos (como hoy el motor) o rechazarlos en la ingesta;
  escoger una.
- **Paginación** de los tramos del libro cuando el portafolio crezca.
- **Canje del código de inscripción** por certificado de cliente, y rechazo de nacimientos sin
  certificado válido. **Cliente MQTT** contra el broker: hoy el nacimiento entra por HTTP.
- **`lectura`** (serie de tiempo) particionada por mes en TimescaleDB.
- **La locación de cada pozo** (para el caso de borde del choke: 2 o 3 pozos de una misma
  locación, U2 §8.6): no está en `Pozo` ni tiene endpoint. Se propone `Pozo.locacion` en
  `GET /api/campos/:campo/pozos`; mientras tanto el demo la trae en `entities/datos/topologia.ts`
  (entra por `fuente.ts`) y `referencia/insumos/<campo>/locaciones.json` sin endpoint.
- **Las capacidades de los tramos firmadas** (`Config.capacidades` de U2 §11.1: el tren de
  crudo, cada bomba de agua, la evacuación, el tratamiento y la admisión de los inyectores, con
  su fuente y su fecha): hoy son datos del demo en el esquema de planta (`caudales.*Cap` y
  `chokes`), sin firmar. Lo que pide la regla de U2 §8.4 —una capacidad no puede ser menor que
  lo que ya pasó por el tramo— se cumplió a mano en el demo (21-oct-2026: La Ceiba 12.000 →
  13.000 en el tren de crudo; Guacamayo 6.800 → 7.500 afuera y 7.400 → 8.000 en el tren de crudo:
  el 21-oct se subió a 7.500 y el 22, a 8.000, porque con 7.500 empataba al barril con afuera,
  `planta.ts`); con las capacidades firmadas, la firma lo tiene que revisar. El factor de medición
  ya se firma (`Config.capacidades[].factorMedicion`); ningún campo del demo lo tiene firmado.
- **El campo ajeno en las vistas** (C-16): `403 sin-permiso` con una dirección que pide un campo
  que la persona no tiene. Sin sesión, el demo no lo puede probar.
- **Las preguntas de campo por WhatsApp** (B-33): la plantilla de Meta para la pregunta de la
  clasificación («¿De dónde vino el corte?» con sus opciones numeradas), el registro de mensajes
  que la manda al operador del campo cuando la fila tiene una pregunta de campo abierta (y la que
  sigue cuando llega la respuesta), y la entrada del webhook, que usa las reglas de
  `POST …/respuesta` con la persona del número.
- **Los artefactos del SQL** (C-23): `ejemplos.sql`, `tablas.json` y `validacion.log` se
  regeneran con `herramientas/validar.sh` en el commit de cierre, sobre el mismo código.
- **La captura sin señal en la clasificación ANH** (U1 P-9): el cuerpo traería la hora del
  toque y el servidor guardaría la suya en `recibido`. Hoy la hora la pone el servidor.
- **El resto del carril ANH de P1 §5**: el reparto por causa, responsable y planeación
  (`/vistas/anh/reparto`), las opciones por fila, el cierre del día, la conversión del árbol de
  la operadora y el envío del IDP no están en este contrato todavía.
- **Lecturas de las electrosumergibles:** por qué endpoint llegan los ajustes de protección del
  variador de cada pozo (la banda y la alarma de corriente, frecuencia, presión de entrada,
  temperatura del motor y desbalance). La serie va por `GET …/tags/:tag/serie`; los ajustes no
  tienen ruta. Hasta que se decida, `referencia/insumos/<campo>/electrosumergibles.json` los trae
  sin endpoint, y en el front el demo los arma del pozo en `entities/esp.ts` (no son un insumo
  del motor como los demás).

---

## Anexo A · Las formas del modelo choke y del árbol de paradas

La forma exacta es el códec de `src/shared/api/contrato.ts` (`TUBERIA`, `SERIE_CHOKE`,
`TUBERIA_AGUA`, `CAPACIDADES`, `CRITICIDAD`, `REPARTO_CHOKE`, `REPARTO_CHOKE_MENSUAL`, `BASE_CHOKE`,
`ARBOL_CHOKE`, `TOPOLOGIA`, `PROPUESTAS_TOPOLOGIA`, `PARADAS_ANH`, `CALIDAD_ANH` y las `R_*` de las escrituras),
y `npm run verificar:contrato` la prueba de ida y vuelta. Aquí, en JSON, para leerla sin
TypeScript. `ISO` es un instante con zona («2026-10-02T14:00:00.000-05:00»); un opcional
ausente se omite; `null` solo donde se dice.

```ts
type Tramo = 'reservorio' | 'pozo' | 'planta' | 'exportacion'      // el paso 2 de la ANH
type Limita = 'pozos' | 'planta' | 'exportacion'                    // lo que limita al campo
type Escalon = 'desarrollo' | 'desempeno' | 'disponibilidad-planeada' | 'disponibilidad-no-planeada' | 'capacidad' | 'sin-clasificar'
type Alcance = 'dedicado' | 'compartido' | 'frontera' | 'tercero'
type TipoCausa = 'reinyeccion' | 'transporte' | 'electrosumergible' | 'levantamiento' | 'energia' | 'aire' | 'compresion'
  | 'evacuacion' | 'proceso' | 'tratamiento' | 'programada' | 'declarada' | 'pendiente'   // Causa.tipo (causa-senal.ts)
interface EquipoBbl { equipo: string; bbl: number; tipo: TipoCausa; porTipo?: Array<{ tipo: TipoCausa; bbl: number }> }   // tipo: el de la causa con más barriles; la pantalla dice la familia («P-201B (bomba de reinyección)», B-13)

// GET /api/vistas/campos/:campo/tuberia?desde&hasta
interface TuberiaCampo {
  campoId: string; desde: ISO; hasta: ISO
  tramos: Array<{
    tramo: Tramo; nombre: string; explica: string
    potencialBpd: number | null; fuente: string; estado: 'pruebas' | 'demo' | 'firmado' | 'sin-firmar' | 'sin-dato'
    holguraBpd: number | null; limita: boolean; casiIgual: boolean
    trenes?: Array<{ tren: 'crudo' | 'agua' | 'gas'; capacidad: number; unidad: string; enCrudo: number | null; medido: boolean; uso: number | null
      estado: 'firmado' | 'demo' | 'sin-dato' }>
    trenQueLimita?: 'crudo' | 'agua' | 'gas'
    disponibleHoy?: { valor: number; unidad: 'bbl/d de crudo'; agua: { valor: number; de: number }; equipo: string; texto: string }
    subniveles?: Array<{ nombre: string; potencialBpd: number; fuente: string; estado: 'pruebas' | 'demo' | 'firmado' | 'sin-firmar' | 'sin-dato' }>
    pruebaMasVieja?: { pozo: string; fecha: ISO; dias: number; texto: string }
    perdiendoAhoraBpd: number; perdidoBbl: number; equiposTop: EquipoBbl[]
  }>
  limita: Limita | null; casiIguales: Limita[] | null; umbral: number; empate: boolean
  pasaHoyBpd: number
  perdiendoAhora: Array<{ tramo: Tramo | null; bpd: number; equipo: string; pozos: number; listaPozos: string[]; desde: ISO }>
  perdiendoAhoraBpd: number; sinTramoAhoraBpd: number
  brechaPruebasBpd: number   // el cuadre de U2 §2.2 con las pruebas (D3): potencial de los pozos − pasaHoyBpd − perdiendoAhoraBpd
  perdidoPeriodo: Array<{ tramo: Tramo; bbl: number; equiposTop: EquipoBbl[] }>
  sinTramoBbl: number; sinTramoEquipos: EquipoBbl[]; diferido: number; campoDeGas: boolean
  capacidades: { estado: 'firmadas' | 'demo' | 'parte'; firma?: { version: number; fecha: string; por: string }; texto: string }
  medidor?: { medidor: string; estado: 'en-linea' | 'sin-comunicacion'; desde?: ISO; ultimoDia?: { dia: ISO; bbl: number }; texto: string }
  textoCorto: string; frase: string
  fraseHoy?: string        // con un equipo parado que angosta hoy la planta: lo que eso deja pasar («Hoy, con P-201B parada, …»)
  fraseGerente: string     // «Se trabó sobre todo en la planta: P-201B (bomba de reinyección). 355 bbl todavía sin identificar.» (B-13)
}

// GET /api/vistas/campos/:campo/choke/serie?desde&hasta
interface SerieChoke {
  dias: Array<{
    dia: ISO; horas: number; real: number | null; potencial: number; potencialSistema: number
    estructural: number; diferido: number; residuo: number | null
    porChoke: Record<Tramo | 'sin-asignar', number>; porEscalon: Record<Escalon, number>
    dominante: Record<string, Limita>; casiIguales: Record<string, Limita[] | null>
    potenciales: Record<string, { pozos: number; planta: number | null; exportacion: number | null; tren?: 'crudo' | 'agua' | 'gas' }>
    superado: Record<string, Limita>
  }>
  cambios: Array<{ campoId: string; dia: ISO; de: Limita; a: Limita; valorBpd: number; texto: string }>
  vueltas: Record<string, number>
}

// GET /api/vistas/campos/:campo/agua
interface TuberiaAgua {
  campoId: string; t: number; aguaBpd: number; crudoBpd: number; crudoPorAgua: number
  tramos: Array<{
    tramo: 'producida' | 'tratamiento' | 'tanques' | 'bombas' | 'inyectores'; nombre: string
    potencialBpd: number | null; crudoBpd: number | null; holguraBpd: number | null; sinDato?: string; fuente: string
    estado: 'pruebas' | 'demo' | 'firmado' | 'sin-dato'; casiIgual: boolean
    tanques?: Array<{ id: string; nombre: string; capacidadBbl: number; altoAlto: number; nivelPct?: number; sinColchon?: string
      colchon?: { horas: number | null; rango: [number | null, number | null]; nivelPct: number; cuando: 'al-parar' | 'si-para-ahora'; bomba: string; evento?: string; aguaSinSalidaBpd: number } }>
    bombas?: Array<{ id: string; capacidadBpd: number; placaBpd: number; papel: 'disposicion' | 'recobro'; reserva: boolean; nota?: string
      instrumentada: boolean; marcha: 'en-marcha' | 'parada' | 'sin-lectura'; mueveBpd?: number; respaldoLibreBpd?: number
      estado: 'firmado' | 'demo'; fuente: string; fuenteFirmada?: string }>
    disponibleHoy?: { valor: number; equipo: string; texto: string }
  }>
  tratamientoBpd: number | null; admisionInyectoresBpd: number | null
  dominante: string; limita: boolean; angosto?: string; casiIguales: string[] | null; sobraBpd: number; faltaBpd: number; crudoQueFrenaBpd: number
  sinUna?: { bomba: string; papel: 'disposicion' | 'recobro'; aguaSinSalidaBpd: number; crudoBpd: number; crudoParejoBpd: number
    colchonH?: number | null; parada: boolean; desde?: ISO; perdiendoBpd?: number }
  // Con una bomba de la línea ya parada: si para otra de las que quedan (B-01). La misma cuenta del «si falla
  // hoy» de las hermanas (criticidad.ts): lo que entra ahora menos lo que toman las que quedarían, el colchón
  // del tanque al nivel de ahora y el orden de cierre de TRIM (los pozos más acuatosos primero).
  siParaOtra?: { enMarcha: string[]; entraBpd: number; cabenBpd: number; bomba: string; aguaSinSalidaBpd: number; colchonH?: number
    pasos: Array<{ pozo: string; fraccion: number; crudoPorAgua: number }>; crudoBpd: number; crudoParejoBpd: number }
  sinDato: string[]; frases: string[]; texto: string
}

// GET /api/vistas/criticidad?campos
interface FilaCriticidad {
  campoId: string; equipo: string; nombre: string; familia: 'bomba' | 'electrosumergible' | 'bombeo-mecanico' | 'pozo' | 'servicio'
  tramo: Tramo; alcance: Alcance; servidos: number; bpd: number | null; colchonH?: number | null
  costoFalla?: number; costoDe?: 'propio' | 'flota'; mdtFuente?: string; vigilado: boolean; sinDato?: string
  subio?: { desde: ISO; porque: string; otro: string }; estimacion: boolean; parado: boolean; perdiendoBpd?: number
  puesto: number | null; porque: string
}
interface VistaCriticidad {
  ranking: FilaCriticidad[]
  campos: Array<{ campoId: string; parados: FilaCriticidad[]; sinCalcular: Array<{ equipo: string; nombre: string; motivo: string }>; cambioHoy?: string
    proximoInstrumento?: string; noIntervenir?: string; desembotellar?: string
    avisosTrabajo: Array<{ campoId: string; tarea: string; equipo: string; desde: ISO; hasta: ISO; motivo: string; porque: string; texto: string }> }>
}

// GET /api/vistas/campos/:campo/capacidades · lo que se firma en Config.capacidades es CapacidadesCampo
type FuenteCapacidad = 'placa' | 'prueba' | 'contrato' | 'nominacion' | 'estimado'
interface CapacidadFirmada { bpd: number; fuente: FuenteCapacidad }
interface CapacidadesCampo { campoId: string; crudo?: CapacidadFirmada; bombas?: Array<CapacidadFirmada & { equipo: string }>
  gas?: CapacidadFirmada & { medido: boolean }; afuera?: CapacidadFirmada; mercado?: CapacidadFirmada; tratamiento?: CapacidadFirmada
  admision?: CapacidadFirmada; explicacionEmpate?: string
  factorMedicion?: { valor: number; porque: string } }   // QA-D3: 0,5 a 1,5, con su porqué; sin él rige 1
interface CapacidadVigente { tramo: 'crudo' | 'agua' | 'gas' | 'afuera' | 'mercado' | 'tratamiento' | 'admision'; valor: number | null
  unidad: 'bbl/d de crudo' | 'bbl/d de agua' | 'KPC/d de gas'; estado: 'firmado' | 'demo' | 'sin-dato'; fuente: string; fuenteFirmada?: FuenteCapacidad }
interface CapacidadesVigentes { campoId: string; firmadas: boolean; crudo: CapacidadVigente; agua: CapacidadVigente
  bombas: Array<{ equipo: string; valor: number; placa: number; papel: 'disposicion' | 'recobro'; reserva: boolean; nota?: string
    estado: 'firmado' | 'demo'; fuente: string; fuenteFirmada?: FuenteCapacidad }>
  gas: CapacidadVigente & { medido: boolean }; afuera: CapacidadVigente; mercado: CapacidadVigente; tratamiento: CapacidadVigente
  admision: CapacidadVigente; explicacionEmpate?: string
  factorMedicion: { valor: number; estado: 'firmado' | 'sin-firmar'; porque?: string } }
interface VistaCapacidades {
  campoId: string; vigentes: CapacidadesVigentes; firma?: { version: number; fecha: string; por: string }
  firmaFactor?: { version: number; fecha: string; por: string }   // quién firmó el factor de medición que rige, y cuándo
  // Lo que TRIM propone (nunca rige sin firma): la mediana de lo real ÷ las pruebas en los días sin paradas con los pozos limitando.
  factorMedicionPropuesto: { campoId: string; valor?: number; dias: number; desde: ISO; hasta: ISO; texto: string; resumen: string }
  entrada: { campoId: string; vigentes: CapacidadesVigentes; maximoCrudo?: { bpd: number; dia: ISO }; pozosBpd: number; aguaPozosBpd: number
    conGas: boolean; caudalesGas: { crudo: number; gas: number }; factorMedicionPropuesto?: { valor: number; dias: number } }
  hallazgos: Array<{ tramo: string; equipo?: string; texto: string; bloquea: boolean }>
}

// GET /api/vistas/choke/reparto?campos&desde&hasta
interface CifrasChoke {
  potencial: number; real: number; brecha: number; diferido: number
  porChoke: Record<Tramo | 'sin-asignar', number>; porEscalon: Record<Escalon, number>
  porChokeEquipo: Record<Tramo | 'sin-asignar', EquipoBbl[]>
  sinExplicar: number; cuadra: boolean; porConfirmar: number
  estructural: number; estructuralPorChoke: Record<Limita, number>; potencialSistema: number; brechaSistema: number
  realPe: number; potencialPe: number   // lo que entra en la PE: los campos de crudo (en uno de gas, 0)
  pe: number; peNoPlaneada: number
  peCreible: boolean; textoPe?: string  // sin ella, la frase y nunca el número (QA-D3)
  dominante: Limita | null; horasPorDominante: Record<Limita, number>
}
interface BrechaChoke extends CifrasChoke {
  desde: ISO; hasta: ISO
  porChokeEscalon: Record<Tramo | 'sin-asignar', Record<Escalon, number>>
  porCampo: Array<CifrasChoke & { campoId: string; superado: Array<{ dia: ISO; choke: Limita; capacidad: number; real: number }> }>
  superado: Array<{ campoId: string; dia: ISO; choke: Limita; capacidad: number; real: number }>
  texto: string; textoEstructural?: string
}
// GET /api/vistas/choke/mensual?campos → MesPorTramo[]
interface MesPorTramo { mes: string; desde: ISO; hasta: ISO; parcial: boolean
  porTramo: Record<Tramo | 'sin-asignar', number>; noPlaneado: Record<Tramo | 'sin-asignar', number>; diferido: number }
// GET /api/vistas/choke/base?campos&desde&hasta → LineaBasePorTramo | null
interface LineaBasePorTramo {
  base: { desde: ISO; hasta: ISO; nombre: string }; periodo: { desde: ISO; hasta: ISO }
  noPlaneado: Record<Tramo | 'sin-asignar', { baseDia: number; periodoDia: number; cambio: number | null }>
  diferido: Record<Tramo | 'sin-asignar', { baseDia: number; periodoDia: number; cambio: number | null }>
  texto: string
}

// GET /api/vistas/choke/arbol?campos&desde&hasta&orden → ArbolChoke
type OrdenArbol = 'gestion' | 'circular' | 'responsable'
type NivelArbol = 'tramo' | 'responsable' | 'impacto' | 'planeacion' | 'n1' | 'n2' | 'equipo' | 'parte'
// gestion: tramo → planeacion → n1 → n2 → equipo → parte
// circular: responsable → tramo → impacto → planeacion → n1 → n2      (C24 p. 5)
// responsable: responsable → tramo → n1 → equipo
interface NodoArbol {
  dimension: 'raiz' | NivelArbol
  valor: string            // código interno; 'falta' si el paso falta; en el tramo, 'sin-asignar' («sin identificar»); en la raíz, 'total'
  texto: string            // en palabras de campo
  cadena?: string          // choke_mod, resp_par, dif_perd, pla_no_plan, cau_niv1 o cau_niv2 en la forma de salida; solo con valor
  bbl: number              // Σ de sus hijos, exacto
  filas: number            // filas de /vistas/anh/paradas
  eventos: number          // eventos distintos del controlador
  confirmadoBbl: number    // con los 6 pasos avalados por una persona
  noPlaneadaBbl: number    // de las paradas no planeadas (el paso 4 vigente)
  hijos: NodoArbol[]       // de más a menos barriles; 'falta' y 'sin-asignar' al final. En 'impacto', 'perdida' siempre está (hoy vacía)
}
interface ArbolChoke { orden: OrdenArbol; niveles: NivelArbol[]; desde: ISO; hasta: ISO; campos: string[]
  version: 'C024-2026' | 'DICC-V3.2'; regla: 'choke.arbol@1'; raiz: NodoArbol }

// GET /api/vistas/topologia?campo · lo que se firma en Config.topologia es ChokeDeElemento
interface ChokeDeElemento { elemento: string; choke: Tramo; alcance: Alcance; pozos?: string[]; campoId?: string; casoBorde?: 'misma-locacion' }
interface TopologiaVigente { campoId: string; firmada: boolean; elementos: Array<ChokeDeElemento & { nombre?: string; clase?: string }>
  porSaber: Array<{ elemento: string; nombre?: string; clase?: string }>            // firmado «Todavía no sé»: Config.topologiaPorSaber
  sinResponder: Array<ChokeDeElemento & { nombre?: string; clase?: string }> }       // equipos nuevos del registro que la firma no trae
// GET /api/vistas/topologia/propuestas?campo
type Propuestas = Array<{ elemento: string; pozos: string[]; porque: string; fuente: 'alimentador' | 'bomba' | 'cascadas' | 'registro'
  evidencia: string[]; conflicto?: string; casoBorde?: 'misma-locacion' }>

// GET /api/vistas/anh/paradas?campos&desde&hasta → ParadaAnh[]
type Paso = 'responsable' | 'choke' | 'impacto' | 'planeacion' | 'n1' | 'n2'
type Procedencia = 'senal' | 'registro' | 'regla' | 'conversion' | 'programa' | 'declarado' | 'confirmado' | 'corregido'
  | 'retirado'                      // solo en `guardadas`: lo retiró una persona (con motivo) y rige lo de TRIM
interface DatoClasificado<T, Q = string> {
  valor: T; procedencia: Procedencia; regla?: string; porque?: Q
  por?: string; porId?: string; rol?: string; hora?: ISO; recibido?: ISO; lote?: string; propuesto?: T   // por, porId, rol y hora: obligatorios si es de persona
  n?: number                        // el consecutivo del servidor (clasificacion_paso.id): decide qué rige entre la fila y su evento
}
interface PorqueChoke { regla: string; elemento?: string; pozosServidos?: number; cascada?: { raiz: string; minutos: number }
  persona?: string; texto?: string; pregunta?: string; evidencia?: string }
interface Clasificacion {          // completa: los 6 pasos, coherentes; borrador: los que haya
  responsable?: DatoClasificado<string>; choke?: DatoClasificado<Tramo, PorqueChoke>; impacto?: DatoClasificado<'diferida' | 'perdida'>
  planeacion?: DatoClasificado<'planeada' | 'no-planeada'>; n1?: DatoClasificado<string>; n2?: DatoClasificado<string>
  cauGral?: DatoClasificado<string>; descEvid?: DatoClasificado<string>; apunta?: { regla: 'senal-apunta@1'; porque: string }
  respuestas?: Array<{ pregunta: string; opcion: string; sigue?: string; acota?: Partial<Record<Paso, string[]>>; perdida?: string; noSe?: true
    por: string; porId: string; rol: string; hora: ISO; n?: number }>  // la conversación de campo: se sigue al leer la fila
  revision?: Revision
}
interface Revision { motivo: string; pedirA?: 'sup' | 'prod' | 'jefe' | 'conf'; por: string; porId: string; rol: string; hora: ISO; n?: number
  atendida?: { por: string; porId: string; rol: string; hora: ISO } }
interface ParadaAnh {
  id: string                        // `${eventoId}@${diaOperacional}#${n}`
  eventoId: string; raiz: string; minutosDesdeRaiz?: number; evidenciaYacimiento?: string; revision?: Revision
  // Lo que una persona dijo y otra retiró con motivo (`retirado` que rige en la fila): no rige, la fila volvió a lo
  // que propone TRIM, y la pantalla lo dice en la historia de la parada («antes: …, retirado por … porque …»). El
  // motivo se queda en TRIM: no va a la ANH ni al papel (D2). Ausente si nada se retiró (QA-R, vecino 8).
  retiros?: Array<{ paso: Paso; valor: string; por: string; porId: string; rol: string; hora: ISO; motivo?: string }>
  pozo: string; campoId: string; diaOperacional: string; inicio: ISO; fin: ISO
  inicioEvento: ISO                 // cuándo empezó el evento (no el tramo del día): «parada desde el 25 de sept» (B-22)
  hz?: { parada: number; prueba: number }   // código HZ: la frecuencia a la que quedó y la de su prueba («bajó de 52,5 a 39,5 Hz»)
  abiertaAlCorte: boolean; diaEnCurso: boolean; fraccion: number; parcial: boolean; disparo: boolean; exceso: boolean
  tramo: { n: number; m: number | null }; horas: number; diferidaTrimBbl: number
  causa: Causa                      // la de TRIM, tal cual (ver «Causa de cada evento»)
  clasificacion: Clasificacion
  estado: 'propuesta' | 'por-precisar' | 'confirmada' | 'pendiente'; faltan: Paso[]
  propuesta: {
    estado: string; faltan: Paso[]; opciones: Partial<Record<Paso, string[]>>; sugerido: Partial<Record<Paso, string>>
    preguntas: Array<{ id: string; texto: string; pasos: Paso[]; quien: 'campo' | 'revisa' | 'yacimiento'; fuente: string
      opciones: Array<{ texto: string; deja: Partial<Record<Paso, string>>; acota?: Partial<Record<Paso, string[]>>; sigue?: string; perdida?: string; yacimiento?: string }> }>
    problemas: string[]; fila: string; regla: string; apunta?: object; perdida?: 'derrame' | 'tea' | 'rechazo'
    alternativas?: string[]; hueco?: string; preguntaChoke?: string; porqueChoke?: PorqueChoke
    escalada?: { pregunta: string; porId: string; hora: ISO }
    causaPendiente: boolean; opcionesRegla: Partial<Record<Paso, string[]>>; preguntasPendientes: string[]
    borrador?: Clasificacion        // no viaja si es igual a `clasificacion` (se repone de ella)
    clasificacion?: Clasificacion   // ídem; solo existe completa
  }
  versionCatalogo: 'C024-2026' | 'DICC-V3.2'
}

// GET /api/vistas/anh/calidad?campos&desde&hasta
interface CalidadClasificacion {
  paradas: number
  porPaso: Array<{ paso: Paso; paradas: number; propuestas: number; avaladas: number; corregidas: number; declaradas: number; enFalta: number
    pctConfirmado: number | null; pctCorregido: number | null }>
  porRegla: Array<{ paso: Paso; regla: string; propuestas: number; corregidas: number; pctCorregido: number; cambiadoA: Record<string, number> }>
  // paradas = filas del reporte; eventos = las paradas detrás («MN-41 · 1 parada (2 filas)», B-47)
  chokePorEquipo: Array<{ campoId: string; equipo: string; paradas: number; eventos: number; corregidas: number; pctCorregido: number; cambiadoA: Partial<Record<Tramo, number>> }>
  sinTopologia: Array<{ campoId: string; equipo: string; paradas: number; eventos: number }>
}

// POST /api/anh/paradas/:id/clasificacion · POST /api/anh/paradas/:id/yacimiento
type CuerpoClasificacion = { pasos: Partial<Record<Paso, string>>; motivo?: string; aplicarAlEvento?: boolean; aplicarALaCascada?: boolean; ids?: string[]; cadena?: string }   // ids: con aplicarALaCascada
type CuerpoYacimiento = { evidencia: 'prueba' | 'corte-agua' | 'presion' | string; motivo?: string; aplicarAlEvento?: boolean; cadena?: string }
type RespuestaClasificacion = { parada: ParadaAnh; guardadas: Record<string, Clasificacion> }   // clave: ParadaAnh.id o EventoPozo.id; solo lo guardado en esta petición (pasos con su n, también los «retirado»)
// POST /api/anh/paradas/confirmar
type CuerpoConfirmacion = { ids: string[]; cadena: string; pasos?: Paso[] }   // cadena: la que vio la persona (obligatoria)
type RespuestaConfirmacion = { paradas: ParadaAnh[]; lote?: { id: string; porId: string; por: string; hora: ISO; paradas: string[]; cadena: string; pasos: Paso[] } }
// POST /api/configuracion/vista-previa
type CuerpoVistaPrevia = { config: Config; aunConErrores?: boolean }   // aunConErrores: 200 con { impacto, errores[] } en vez de 422 (B-53)
type RespuestaVistaPrevia = { impacto: { desde: ISO; hasta: ISO; campos: Array<{
  campoId: string; limitaAntes: Limita | null; limitaDespues: Limita | null
  criticidad: Array<{ equipo: string; nombre: string; antes: number | null; despues: number | null; tramoAntes: Tramo | null; tramoDespues: Tramo | null }>
  paradasQueCambian: { total: number; confirmadas: number; porTramo: Array<{ de: Tramo | null; a: Tramo | null; paradas: number }> }
  texto: string[] }> } }
// POST /api/topologia/importar
type CuerpoTopologiaCsv = { campo: string; texto: string }
type RespuestaTopologiaCsv = { campoId: string; topologia: ChokeDeElemento[]; porSaber: string[]; hallazgos: Array<{ fila: number; equipo?: string; texto: string; bloquea: boolean }>; filas: number }
// POST /api/anh/paradas/:id/respuesta → RespuestaClasificacion
type CuerpoRespuestaAnh = { pregunta: string; opcion: string; aplicarAlEvento?: boolean; aplicarALaCascada?: boolean; ids?: string[]; cadena?: string }   // opcion: el texto del botón
// POST /api/anh/paradas/:id/revision → RespuestaClasificacion
type CuerpoRevisionAnh = { motivo: string; pedirA?: 'sup' | 'prod' | 'jefe' | 'conf'; aplicarAlEvento?: boolean; aplicarALaCascada?: boolean; ids?: string[]; cadena?: string }
```

## C2 · La planta viva

`GET /api/vistas/planta-viva?campos&momento&desde&hasta` (`PLANTA_VIVA` en `contrato.ts`; motor
`src/entities/planta-viva.ts`; costura `src/shared/api/plantaViva.ts`). Es el pedido 1 de X4 §4.11: la vista
del gerente por campo (o por «todos mis campos», con varios `campos`) y por momento, **en una sola lectura**.
Antes el Resumen pedía cuatro vistas enteras por campo para usar unas pocas cifras de cada una.

- `momento`: `antes` (lo que viene), `durante` (ahora) o `despues` (lo que pasó). Otro valor es un error
  (««ayer» no es un momento…»; el servidor responde 422).
- `desde` y `hasta`: el período de **Después** y de las cifras del período (el libro). Antes y Durante son «ahora».
- El servidor la calcula con la configuración firmada, su historial (las capacidades de cada día) y lo que
  dijeron las personas en la clasificación (el tramo vigente de cada parada), como `/vistas/campos/:campo/tuberia`.
- No calcula nada nuevo: junta `tuberiaCampo`, `riesgoAhora`, `estadoCampo`, `criticidadDelCampo`
  (con `desembotellar`), `tuberiaAgua` (`TREN_AGUA`), `libro`, `serieMensual`, `lineaBasePorTramo`
  (desde la puesta en marcha), `arbolDelChoke` (orden de gestión) y `cicloValor`.
- D7: menos de 300 ms; el motor la guarda por contexto, historial, guardadas, campos y período, y cambiar de
  momento no recalcula nada.

**Cuadres que no se rompen** (los prueban `verificar-libro.mjs` y `verificar-contrato.mjs`, sección C2):
- **Durante:** Σ `planta.tramos[].valor` + `planta.sinIdentificar.valor` = `cifras.durante.valor` =
  `perdiendoAhoraBpd` de la tubería = `perdiendoBpd` de `/vistas/estado` (La Ceiba: 1.665 + 301 = 1.966).
- **Después:** Σ `planta.tramos[].valor` + `planta.sinIdentificar.valor` = `cifras.despues.valor` = el
  `diferido` de `/vistas/diferidos` del mismo período (La Ceiba, octubre: 118 + 573 + 355 = 1.046).
- **Un nombre, una cifra** (X4 §3.1, regla 4): «se dejan de producir ahora» es siempre el total del campo, o
  de todos (Σ `filas[].valor`: 1.966 + 684 = 2.650), nunca lo de un equipo.
- **Antes** es un conteo y un nombre (`cifras.antes.valor` = los equipos `en-riesgo` de `/vistas/riesgo`):
  un techo («hasta 9.394») no se suma.
- `mover` es el ciclo (`/vistas/ciclo`: `antes.bbl`, `durante.bbl`, `despues.bbl`, `retornoBbl`), **simulado**:
  nunca es la cifra grande.
- `porEquipo` es el Pareto del libro (las cuatro primeras filas de `porEquipo`); `mesAMes.meses` es la serie
  de `/vistas/diferidos/mensual` en bbl/d; `bajando` es `/vistas/choke/base` desde la puesta en marcha.

```ts
type Momento = 'antes' | 'durante' | 'despues'
type Pedazo = string | { b: string }                    // un rótulo: texto, o la cifra que va en negrita
interface EquipoDelTramo { campoId: string; equipo: string; familia: string; prioridad: 0 | 1 | 2 | 3; sinInstrumento: boolean
  condicion: string; valor: number | null; techo: boolean; texto: string }
interface CifraMomento {
  momento: Momento; previo: string; valor: number; unidad: string     // «Ahora mismo» · 1.966 · «barriles por día»
  frase: string; explica: string; fraseCorta: string                 // fraseCorta: 20 palabras o menos; es el nombre accesible del dibujo
  tramo: Tramo | 'sin-asignar' | null                                // el tramo marcado del momento
  primerEquipo: { campoId: string; equipo: string } | null           // lo que abre «Ver qué se está haciendo»
  simulado: { bbl: number; texto: string; plan: { campoId: string; equipo: string } | null }
}
interface VistaPlantaViva {
  campos: string[]; alcance: 'campo' | 'portafolio'; momento: Momento; desde: ISO; hasta: ISO; ahora: ISO
  periodo: string                                                    // «octubre, en curso»
  cifras: Record<Momento, CifraMomento>                              // las tres: la escogida manda
  planta: null | {                                                   // un campo
    campoId: string; nombre: string; campoDeGas: boolean; textoGas?: string
    tramos: Array<{ tramo: Tramo; nombre: string; titulo: Pedazo[]; marca: string | null; linea: Pedazo[]
      valor: number; cabeBpd: number | null; sinDato: boolean; limita: boolean; marcado: boolean
      angostoBpd?: number                                            // Durante: hasta dónde se angosta la pared (lo que hoy puede pasar)
      frase: string; nota?: string[]; equipos: EquipoDelTramo[]
      porque: Array<{ texto: string; bbl: number; detalle: string[] }>   // el árbol en el orden de gestión, sin códigos
      desdeTrim?: { antesBpd: number; ahoraBpd: number; cambio: number | null; texto: string } }>
    pasaBpd: number; escalaBpd: number
    ramal: { hay: boolean; entraBpd: number | null; tanque: { id: string; nivelPct: number | null; altoAltoPct: number | null } | null
      bombas: Array<{ id: string; estado: 'parada' | 'en-marcha' | 'sin-instrumento'; prioridad: 0 | 1 | 2 | 3 }>; texto: Pedazo[]; resumen: string }
    sinIdentificar: { valor: number; equipos: string[]; titulo: string; linea: string; primerEquipo: string | null } | null
    venta: { titulo: string; valor: number; unidad: 'bbl/d' | 'bbl'; metaTexto: string | null; bajoMeta: boolean }
    ariaLabel: string; paraProducirMas?: string; pozos: { total: number; enMarcha: number }; sinComunicacion?: string
  }
  filas: Array<{ campoId: string; nombre: string; valor: number; unidad: string; tramo: Tramo | null
    primerEquipo: EquipoDelTramo | null; linea: string; campoDeGas: boolean }>   // todos los campos, de la que más pesa a la que menos
  esteMes: { titulo: string; bbl: number; rango: [number, number]; valorUsd: number | null; nota: string; anterior: { nombre: string; bbl: number } | null }
  produccion: { realBpd: number; metaBpd: number | null; bajoMeta: boolean; texto: string }
  mover: { totalBbl: number; porMomento: Record<Momento, number> }
  porEquipo: Array<{ campoId: string; equipo: string; familia: string; prioridad: 0 | 1 | 2 | 3; palabra: string; bbl: number; pct: number }>
  mesAMes: { meses: Array<{ mes: string; rotulo: string; nombre: string; totalBpd: number; altoBpd: number; maximoBpd: number | null; sobre: boolean; enCurso: boolean }>
    actualBpd: number | null; nombreActual: string; maximoBpd: number | null }
  bajando: { desde: ISO; base: string; filas: Array<{ tramo: Tramo; nombre: string; antesBpd: number; ahoraBpd: number; cambio: number | null; texto: string }>; nota: string } | null
  perdida: string                                                    // la pérdida va aparte y nunca se suma al diferido
}
```

Las frases las arma el motor, en palabras de campo y sin la palabra «choke» ni códigos de la ANH: la de
«ahora» y la de «lo que viene» son nuevas (X4 §4.11, pedido 2); la del período reutiliza `fraseGerente`.
Los estados de X4 §4.10 vienen en la misma forma: un campo de gas (`campoDeGas` y `textoGas`), nada parado
(cifra 0 y «produce sin paradas ahora»), comienzo de mes (`esteMes.anterior` y el mes anterior en la
explicación de Después) y la pérdida («sin eventos registrados»). Lo que falta del motor para el resto
(la gota de la pérdida, el tren de agua de todos los campos, el medidor sin comunicación por caudal) está
en CONSTRUCCION.md, «C2 · hecho».

## C3 · Hoy

`GET /api/vistas/hoy?rol&campos` (`HOY` en `contrato.ts`; motor `src/entities/hoy.ts`; costura
`src/shared/api/hoy.ts`). Es «Hoy» de X4 §3.3 y §3.4: lo que a cada rol le toca hacer, en un solo lugar,
con su orden, la cifra y la frase de su inicio. Viaja tal cual (JSON puro: las horas van como texto ISO con zona).

- `rol`: el de la persona. Con el servidor sale del token; un `rol` que no es el suyo es 403. Un rol que no está
  entre los del producto no tiene Hoy.
- `campos`: se recortan a los que la persona tiene asignados (un campo ajeno no se dice, como C-20).
- **No calcula nada nuevo:** junta lo que ya entregan las demás vistas y lo que entra a mano —las paradas que el
  libro pregunta (`/vistas/paradas/por-identificar` y sus opciones), las filas de la ANH del mes en curso con lo
  que dijeron las personas (`/vistas/anh/paradas`), `/vistas/riesgo`, la franja de la cabecera
  (`/vistas/equipos-hoy` + riesgo), `/mensajes`, `/sap/ordenes` y `/sap/avisos`, los planes de `/vistas/ciclo`,
  la tubería y el agua de cada campo, `/vistas/criticidad` («Ojo: no intervenir»), los relojes y el vigía (el
  jefe), la asignación oficial cargada, las metas firmadas, los análisis y el programa— y el motor las cruza.
- D7: menos de 300 ms con cada rol, en un campo y en todos (lo prueba `verificar-contrato.mjs`, sección C3).

**Qué junta y con qué capacidad** (X4 §3.3; cada tarea dice la suya en `capacidad`, y un rol no ve lo que
`puedeHacer` no le deja):

| Tarea | De dónde sale | Quién | `capacidad` |
|---|---|---|---|
| La franja «No arrancar … hasta identificar qué se dañó» | las paradas del libro sin causa que siguen paradas | quien dice qué se dañó | `causa:declarar` |
| Contestar qué se dañó o por qué paró (una por parada) | las paradas del libro sin causa | oper, tec | `causa:declarar` |
| Conseguir la causa de N paradas (juntas; «se escaló a las…» sale de WhatsApp) | las mismas; al supervisor, solo las de pozo (la parte de una bomba es del operador y del técnico) | sup, jefe, conf | `causa:declarar` |
| Confirmar N paradas iguales (un lote por cadena) | las filas de hoy propuestas, sin revisión pendiente ni «una señal apunta» | sup, prod | `anh:confirmar` |
| Contestar o precisar una pregunta de campo del árbol | las filas del mes en curso (oper y tec) o de hoy (quien revisa) que no esperan al libro | quien la contesta (`ROLES_QUE_CONTESTAN`) | `anh:clasificar` (`anh:yacimiento` para el yacimiento) |
| Revisar lo que alguien marcó «Algo está mal» | `ParadaAnh.revision` sin atender que le toca | sup, prod, jefe, conf | `anh:clasificar` |
| Confirmar la causa que una señal apunta | `esperaAQuienAbre` | jefe, conf | `anh:clasificar` |
| Seguir la orden (o el aviso) de lo que ya pasó el límite; si no hay, intervenir | `/vistas/riesgo` (`en-riesgo` sin horas) y SAP | sup, jefe, conf (intervenir: jefe, conf) | `sap:aviso` |
| Atender su orden de SAP | las órdenes abiertas a su nombre (se hacen en SAP: TRIM no escribe) | tec | — |
| Completar el análisis de una falla declarada | las declaradas con parte y sin análisis | jefe, conf | `causa:completar` |
| Cargar la asignación oficial del último mes cerrado | la asignación oficial sin cargar | prod | `asignacion:cargar` |
| Firmar la meta de un campo | un campo sin meta firmada que rija hoy | ger | `metas:firmar` |
| Decidir los planes del ciclo (simulados); los que tocan el equipo de otra tarjeta van como una línea en ella | `/vistas/ciclo`, propuestos y que mueven crudo | sup, jefe, conf | `planes:decidir` |
| «Lo más frágil: el agua» (aviso) | `tuberiaAgua.siParaOtra` | sup, oper | — |
| «Ojo: no intervenir hoy» y los trabajos del programa (avisos) | `/vistas/criticidad` | jefe, plan | — |
| «Lo que viene» (aviso) | el programa firmado | tec | — |

**El orden** (X4 §3.3): `tareas` llega ordenada y la pantalla no la reordena. Primero `grupo: 'hora'` (lo que
tiene hora límite: el reporte de mañana a las 07:00, C24 p.8-9; la más cercana primero), después `'barriles'`
(lo que se deja de producir ahora, `bblAhora`, de más a menos, y después lo que se perdería si para,
`bblSiPara`), después `'demas'` (por antigüedad, `desde`) y al final `'aviso'` (solo informa). Lo que dice
«no» no es una tarjeta: va en `bloqueos`, arriba. `insignia` = las tarjetas con `pide: true`: un aviso no suma.

```ts
type Trozo = string | { b: string }                    // lo que va en negrita lo marca el motor
type Destino = { a: 'paradas' } | { a: 'equipo'; campoId: string; equipo: string } | { a: 'planta' } | { a: 'agua' }
  | { a: 'turno' } | { a: 'asignacion' } | { a: 'metas' } | { a: 'planes' }
interface VistaHoy {
  rol: string; campos: string[]
  inicio: { frase: string; previo?: string; cifra: string; unidad?: string; remate?: string; explica?: Trozo[] }
  bloqueos: Array<{ campoId: string; equipos: string[]; texto: string; sub: string; planes?: string[] }>
  tareas: Array<{
    id: string; tipo: 'contestar' | 'conseguir-causa' | 'confirmar' | 'confirmar-apunta' | 'revisar' | 'precisar' | 'orden'
      | 'intervenir' | 'analisis' | 'planes' | 'asignacion' | 'metas' | 'aviso'
    campoId: string; capacidad?: Capacidad; pide: boolean; grupo: 'hora' | 'barriles' | 'demas' | 'aviso'
    titulo: string                                       // verbo + qué: «Confirmar 2 paradas iguales»
    donde?: { equipo: string; marca?: CondicionFranja; texto: string }   // la marca es la del EQUIPO (la de la franja)
    porque?: Trozo[]
    accion?: { tipo: 'confirmar'; texto: string; ids: string[]; cadena: string; pozos: string[] }
      | { tipo: 'responder'; texto: string } | { tipo: 'ir'; texto: string; destino: Destino }
    ver?: { texto: string; destino: Destino }
    preguntas?: PreguntaHoy[]                            // las que se contestan desde la tarjeta, en orden
    planes?: string[]; limite?: ISO; bblAhora?: number; bblSiPara?: number; desde?: ISO
  }>
  insignia: number
  hechas: Array<{ id: string; titulo: string; detalle: string; hora: ISO }>   // lo que la persona hizo hoy y sigue rigiendo
  vacio?: string                                         // «Nada pendiente. El campo está normal.»
  entregarTurno: boolean                                 // el supervisor: abre la entrega de turno que ya existe
  campo?: { campoId: string; tramos: Array<{ choke: 'pozo' | 'planta' | 'exportacion'; rotulo: string; limita: boolean; trabado: boolean }>; frases: Trozo[][] }
  whatsapp?: { mensajes: number; hilos: Array<{ equipo: string; pasos: string; estado?: Trozo[] }> }   // las últimas 12 h
  turno?: { horas: number; diferidoBbl: number }
}
interface PreguntaHoy {                                  // una pregunta de un toque (X5 §5.8)
  id: string; via: 'libro' | 'anh'; campoId: string; equipo: string; sobre: 'bomba' | 'pozo'; marca?: CondicionFranja
  contexto: string                                       // «P-201B · bomba de agua · paró hoy a las 03:52, hace 10,1 h»
  texto: string; pista?: string
  opciones: Array<                                       // siempre termina en «Todavía no sé»
    | { tipo: 'parte'; texto: string; dato?: string; parte: ParteId; modos: Array<{ codigo: string; texto: string; escribe?: true }> }
    | { tipo: 'partes'; texto: string; dato?: string; partes: Array<{ parte: ParteId; texto: string; modos: … }> }
    | { tipo: 'texto'; texto: string; dato?: string; valor: string }
    | { tipo: 'causas'; texto: string; dato?: string; causas: Array<{ texto: string; dato?: string; valor: string }> }
    | { tipo: 'anh'; texto: string; dato?: string; valor: string }
    | { tipo: 'no-se'; texto: 'Todavía no sé'; dato: string; valor?: 'No sé' }>
  bloqueo?: { texto: string; sub?: string }; tramo: { choke: 'pozo' | 'planta' | 'exportacion'; rotulo: string }
  libro?: { evento: string; campoId: string; equipo: string }                 // → POST /api/paradas/:evento/respuesta
  anh?: { fila: string; pregunta: string; cadena: string; aplicarAlEvento?: true; aplicarALaCascada?: true; ids?: string[] }  // → POST /api/anh/paradas/:id/respuesta
}
```

La cifra y la frase de cada rol (X4 §3.4), con el demo de La Ceiba: el supervisor, «Se dejan de producir
1.966 bbl/d. Le faltan 4 paradas por confirmar: el reporte sale mañana antes de las 07:00.»; el operador,
«Tiene 4 preguntas. Empiece por P-201B: está parada y no se puede arrancar.»; el técnico, «Le tocan N cosas
hoy. Primero P-201B: diga qué encontró.»; el jefe de mantenimiento, «De 8,1 días que dura una falla, 7,7 son
espera. El vigía anunció 3 de 3 fallas.» (los relojes de `/vistas/relojes` y el vigía de `/vistas/predicciones`).
Los demás, cuántas cosas les tocan y la primera.

### «Deshacer»: `POST /api/anh/paradas/deshacer`

Contestar o confirmar desde Hoy deja un aviso con «Deshacer» durante 5 s (X4 §5.5; X5 §5.7). Con D1 nada se
borra:

- **Una confirmación** se escribe en el acto. «Deshacer» es una **escritura nueva, por inserción**:
  `POST /api/anh/paradas/deshacer { ids, n }` con las filas y los consecutivos (`n`) de los pasos que subió
  esa confirmación (los trae la respuesta de `…/confirmar`). En la misma clave (fila o evento) donde está cada
  uno se guarda un paso con procedencia `retirado`: el valor retirado, quién, la hora y el motivo «deshecho por
  quien contestó», con un consecutivo mayor. Como es lo más reciente, rige (`rigeEnFila`): la fila vuelve a lo
  que propone TRIM y su historia lo dice (`ParadaAnh.retiros`). La confirmación y su lote se quedan.
- **Una respuesta** (al libro, `POST /api/paradas/:evento/respuesta`, o al árbol, `POST /api/anh/paradas/:id/respuesta`)
  la sostiene la pantalla mientras dura el aviso y la escribe al vencer, al registrar otra o al salir de la
  página. «Deshacer» la suelta antes de escribirla: nada que borrar. (El libro guarda una respuesta por parada
  —la primera gana— y la conversación del árbol solo se alarga: deshacer una ya escrita borraría o dejaría la
  pregunta cerrada.)
- «Todavía no sé» en el libro no escribe nada: la pregunta sigue abierta y vuelve en la próxima ronda de
  WhatsApp; en el árbol se guarda «No sé» y escala a quien revisa (U1 §2.4).

| Revisión, en este orden | HTTP · `codigo` |
|---|---|
| `ids` lista de textos; `n` lista de enteros mayores que cero | 400 · `peticion-invalida` |
| el rol existe, tiene `anh:clasificar` o `anh:confirmar`, y hay una persona con acceso | 403 · `rol-desconocido`, `sin-capacidad`, `sin-persona` |
| sin filas, o más de 1000 | 422 · `peticion-invalida` |
| cada fila existe y es de un campo de la persona (no se dice cuál de las dos) | 404 · `no-encontrado` |
| cada consecutivo es de un paso que dijo **esta** persona | 403 · `ajeno` |
| cada consecutivo todavía rige en esas filas (nadie dijo otra cosa después, no se deshizo ya) | 409 · `ya-cambio` |

Respuesta (`R_DESHACER`): `{ paradas: ParadaAnh[]; guardadas: Record<string, BorradorClasificacion> }`: las
filas como quedaron y lo que se guardó por clave (los retiros), que el front copia a su sesión.
