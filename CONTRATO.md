# Contrato de la API · TRIM Hidrocarburos

Este repositorio es **front**. Lo que sigue es lo que el front necesita del backend, endpoint
por endpoint, con las reglas que el servidor tiene que aplicar. Hay tres fuentes de verdad, y
este documento las resume sin reemplazarlas:

| Qué | Dónde | Cómo se prueba |
|---|---|---|
| La **forma JSON** de cada respuesta (rutas, parámetros, códecs) | [`src/shared/api/contrato.ts`](src/shared/api/contrato.ts) y [`cable.ts`](src/shared/api/cable.ts) | `npm run verificar:contrato` |
| Las **reglas de cada escritura** (403, 404, 409, 422, en su orden) | [`src/shared/api/escrituras.ts`](src/shared/api/escrituras.ts): en el demo, ese módulo ES el servidor | `npm run verificar` (secciones 6c, 8b, 11, 15 y 16) |
| Los **números** (libro, predicción, salud, riesgo, SAP, aciertos, asignación) | `src/entities/*.ts`; los insumos con que se calculan, en `referencia/insumos/` | `npm run verificar` y `node scripts/referencia.mjs comparar --base-url=…` |

`simulador-api/` (Node + SQLite, sin dependencias) implementa **solo el registro de la cadena
de datos**: procedencia, inventario, pendientes, asociar un tag, inscripción y nacimiento del
borde. Lo demás (libro, configuración, usuarios, SAP, mensajes, predicciones, informes,
asignación) lo calcula hoy el demo dentro del front, con la misma forma de respuesta que el
backend tiene que dar. **El simulador no es el servidor de producción.**

---

## Por dónde empezar

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
| **Servidor** | Todo lo que lee los insumos o sale de ellos: `libro`, `diferido`, `causa-senal`, `salud`, `vigia`, `esp`, `metrologia`, `sap` (lo que se lee de SAP), `aciertos`, `mensajes` (el registro y su texto), `equipo-vivo`, `flota`, y `informe` (`cifrasDe`, `formaCanonica`, la huella). También los datos de catálogo del campo: máquinas y perfiles de bomba, catálogo de equipos y de daños, el límite de cada tag (`limites`: banda normal y alarma), metrología, punto de medición oficial y topología de planta. |
| **Los dos** | Las reglas de lo que entra a mano: `configuracion.validarConfig` y `camposTocados`, la meta o el perfil vigente de un campo (`perfilDe`, `metaEn`, `metaEntre`, `criterioEn`, `tanqueDe`), `usuarios.revisarAcceso` y `camposAsignados`, `reglas.ts` (`MOTIVO_MINIMO` = 5, `NOMBRE_MINIMO` = 3, `TEXTO_LIBRE_MINIMO` = 8), `planta.aplicarCambioPlanta`, `plan.leerPlan`, `asignacion.leerAsignacion` y `cotejar`. |
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
nueve (`Capacidad` en `entities/tipos.ts`, reparto por rol en `entities/roles.ts`):

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
| 400 | JSON roto, cuerpo que no es objeto, `%` mal formado, nacimiento mal formado, origen distinto de `manual`/`regla` | `peticion-invalida`, `url-invalida` |
| 401 | Sin sesión válida | `sin-sesion` |
| 403 | Sin la capacidad, sin persona activa o fuera de los campos asignados | `sin-capacidad`, `sin-permiso`, `gateway-de-otro-campo` |
| 404 | No existe el recurso o la ruta | `no-encontrado`, `tag-no-registrado`, `campo-desconocido`, `equipo-desconocido`, `ruta-no-encontrada` |
| 409 | Otro llegó antes (versión, respuesta, aviso abierto, último gerente) | `conflicto`, `version-cambio`, `tag-de-otro-gateway` |
| 413 | Cuerpo de más de 2 MB | `cuerpo-muy-grande` |
| 422 | La forma o una regla del dominio | `peticion-invalida` o uno propio (`texto-corto`, `acceso-invalido`, `descripcion-corta`…) |
| 5xx | Lo inesperado: **sin el mensaje interno** (SQL, rutas del servidor) | `interno` |

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
  `/api/informes`, `/api/asignacion-oficial`, `/api/analisis`, `/api/planta/cambios`.

Parámetros: `campos=a,b`; `desde` y `hasta` en ISO con zona (el `hasta` no se incluye).

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
| `/vistas/diferidos?campos&desde&hasta` | `Libro` (`libro.ts`). `tramos[]`: `{ evento: clave en refs.eventos, pozo: clave en refs.pozos, causa, inicio, fin (ISO), abierto, horas, factor, bbl, aproximado, sinCustodia, sinFactor, sesgo, azar }`. `preguntas[]` con `inicio` y `fin` ISO o `null`. `custodia: { sinPrueba: [clave], estimados: [clave], bswLaboratorio }`. `sinFiscal: [{ campoId, dias: [ISO] }]`, `sinFactor: [{ campoId, mes }]`. `motivos: [{ codigo, texto, campoId?, mes? }]`, con `codigo` en `en-curso`, `sin-fiscal`, `sin-factor`, `banda-sin-verificar`, `fa-fuera-de-banda`, `sin-causa`, `sin-meta`: **el front decide por el código, nunca por la frase**. `valorUsd?`, `valorCampos: { con, total }`, `sinPrecio: [campoId]`. `meta.sinMeta: [campoId]` y `porCampo[].sinMeta` (ver «Sin meta firmada»). Paretos: `porEquipo` una fila por (campo, equipo, tipo); `porParte` una fila por (familia, parte) armada con los **eventos del equipo** (la parada de la bomba del PLC con su parte, el evento de la electrosumergible), también los que el tanque absorbió: `fallas`, `disparos` y `horas` (= unión de los intervalos de esos eventos por equipo, recortada al período) salen de ellos y `bbl` de los tramos que causaron (puede ser 0) |
| `/vistas/diferidos/mensual?campos` | `[{ mes, corto, nombre, desde, hasta (ISO), parcial, libro }]`, con `libro` **sin** `tramos`, `porPozo`, `preguntas` ni `custodia` |
| `/vistas/diferidos/base?campos&desde&hasta` | `{ desde, hasta (ISO), nombre, baseDia, periodoDia, cambio }` o `null` sin tres meses publicados antes |
| `/vistas/produccion/diaria?campos&desde&hasta` | `[{ dia: ISO, horas, real \| null, faltan: [campoId], potencial, diferido, residuo \| null, meta \| null }]`: `meta` es `null` si algún campo pedido no tiene meta firmada ese día |
| `/vistas/potencial-reciente?campos` | `{ campoId: bbl/d }`: potencial promedio de los últimos 30 días. Es la referencia con que el gerente fija la meta; no es meta y no se guarda |
| `/vistas/paradas/por-identificar?campos` | `Pregunta[]` de toda la historia: las que piden respuesta, **y también las declaradas y las no conformes** (`pide`, `arrancoSinIdentificar`) |
| `/vistas/paradas/:evento/opciones` | `{ catalogo?, sugeridas?: { opciones: Opcion[], conEvidencia }, sospechosa?: SaludParte }` |
| `/vistas/bombas/prediccion?campo&equipo` | `Prediccion`: `perfil` por clave; `perdiendo.pozos: [clave]` (una multifásica parada trae los pozos cerrados por ella; una de recobro parada, `{ bblDia: 0, pozos: [] }`); `colchon` con `null` = no se llena; `orden.pasos[].pozo` y `orden.sinPrueba` por clave |
| `/vistas/bombas/paradas?campo&equipo` | `ParadaMedida[]` de la más reciente a la más vieja: `inicio`, `fin` ISO, `tramos` como en el libro, `colchon.previsto` |
| `/vistas/bombas/paradas-en-periodo?campos&desde&hasta` | `ParadaMedida` + `{ horasEnPeriodo, bblEnPeriodo, cruzaBorde }`: solo las que se solapan con el período, recortadas a `[desde, hasta)` con el factor de cada mes. Una parada que cruza el borde no se suma entera a los dos meses |
| `/vistas/riesgo?campos` | `Riesgo[]` con `desde` y `cierreDesde` ISO; cada item trae `prioridad` (la de la salud de la parte) y `estadoParte`. Con `costoFalla` va `costoDe`: `'propio'` si sale de la historia del equipo, `'flota'` si el equipo nunca ha fallado y se estimó con el promedio de su flota en el campo (la pantalla lo marca; `mdtFuente` es solo texto para leer). El `motivo` dice «X salió de su banda normal; llega a su alarma en N h» o «X ya llegó a su alarma», nunca «fuera de límite» |
| `/vistas/estado?campos` | `EstadoCampo[]`, uno por campo pedido y en ese orden, con `ayer: { fecha: ISO, bbl \| null }` |
| `/vistas/pozos?campos&desde&hasta` | `FilaPozo[]` con `pozo` y `evento` por clave y `salud?: SaludParte`. `diferidoEsp` = Σ de los tramos del período cuya causa es la electrosumergible del propio pozo (`causa.equipo === pozo` y `tipo === 'electrosumergible'`); sumado en el campo da la fila `electrosumergible` de `porTipo` |
| `/vistas/pozos/:campo/:pozo?desde&hasta` | `{ fila, tramos, historicos: [{ evento: clave, causa }], senales, partes, historial? }` o `null` |
| `/vistas/electrosumergibles?campos&desde&hasta` | `[{ fila, partes, historial }]` |
| `/vistas/asignacion?campo&mes` | `AsignacionPozo[]`: lo que TRIM asigna a cada pozo en un mes cerrado |
| `/vistas/predicciones?campos` | `{ registro: PrediccionVigia[], fallas: [{ …, falla: { inicio: ISO, fin: ISO \| null, … } }] }` |
| `/vistas/relojes?campos&desde&hasta` | `{ fallas, excluidas, totalH?, activaH?, esperaH? }` o `null`. `excluidas` = órdenes PM01 cerradas sin su parada del PLC; sin ninguna falla cruzada, los promedios van vacíos |
| `/vistas/campos/:campo/ahora` | `{ caudales: { crudo, agua } (bbl/d), niveles: { idTanque: { tag, pct, hora } } }`. Un tanque sin lectura **no aparece** |
| `/vistas/equipos/:campo/:equipo` | `EquipoVivo` o `null` (también pozos). Trae `marcha`: `en-marcha`, `detenido`, `cerrado-por-otro` o `sin-lectura`, que es lo que se compara; `estado` es solo texto |
| `/vistas/equipos-hoy?campos` | `{ campoId: EquipoVivo[] }`: catálogo y pozos |
| `/vistas/equipos/:campo/:equipo/historia` | `{ eventos: [{ id, inicio: ISO, fin: ISO \| null, bbl, pozos, causa }], bomba?: HistorialEquipo }` |
| `/vistas/equipos/:campo/:equipo/ficha?desde&hasta` | `FichaEquipo` o `null`, con `desdeHistoria` y `desdeCierre` ISO: los barriles del período y de toda la historia, con su valor en USD (lo calcula el servidor) |
| `/vistas/equipos?campos` | `FilaEquipo[]` |
| `/vistas/confiabilidad?campos` | `[{ campoId, equipo, familia, h: HistorialEquipo }]` |
| `/vistas/bombas?campos&desde&hasta` | `BombaVista[]` con `perfil` por clave, más `veredicto`, `abierta`, `senales` y `partes` (la salud llega aquí y en `sospechosa` de las opciones; ya no hay `/vistas/bombas/salud`) |

**Formas que se repiten.** `HistorialEquipo`: `eventos[]` con `inicio` ISO y `fin` ISO o
`null`; `porParte[].ultima` ISO; `fallasCerradas` y `bblPorFalla` (nuevos); `mdtH` del equipo
y de la parte sale **solo de fallas cerradas** (en la parte es opcional); el MTBF sigue
contando la falla abierta. `SaludParte`: las `Senal` internas (`primera`, `lenta`,
`causaActiva`, `fuera`, `medidas`, `sinSenal`) llevan `normal` con `null` del lado abierto.
Una electrosumergible con el pozo parado manda presión de entrada, temperatura del motor y
desbalance con `valor: null` y estado «sin señal»; corriente y frecuencia van con 0 medido.

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

Todas exigen además una **persona activa** en la sesión (`403` si no la hay) y los campos de la
regla general. El orden en que se revisan es el de `escrituras.ts`: capacidad y persona
(`403`); el recurso (`404`), que el campo del cuerpo sea el suyo (`422`) y que la persona lo
tenga (`403`); conflicto (`409`); forma (`422`).

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
  "respaldos":[{ "campoId":"morichal", "equipo":"P-201B", "libreBpd":15100, "detalle":"P-201A en paralelo" }],
  "programa":[{ "id":"PR-ceiba-P-201B-2026-11-04", "campoId":"ceiba", "equipo":"P-201B", "desde":"…", "hasta":"…", "motivo":"…" }] }
```

- `409` si `base` no es la vigente (`version-cambio`): firmarlo pisaría lo que se firmó en el medio.
- `403` si el rol no firma ese grupo, o si toca un campo que la persona no tiene (`camposTocados`):

| Grupo | Qué incluye | Capacidad |
|---|---|---|
| Metas | tramos: meta de producción, máximo de diferido, precio neto, máximo sin causa para publicar | `metas:firmar` (gerente de activo) |
| Técnica | cualquier cambio del programa (alta, baja o cualquier dato), de tanques (alta, baja o nombre, campo, bomba, capacidad, alto-alto, tag, aforo), de respaldos (alta, baja o cambio), un campo quitado, el perfil del campo y la empresa del membrete | `config:firmar` (administrador de la implementación) |

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

### `POST /api/planta/cambios`

Cuerpo `{ campo, cambio: { tipo: "agregar-miembro" | "quitar-miembro" | "agregar-elemento" |
"quitar-elemento", … } }` → `{ planta, cambio: CambioPlanta }` (`{ id, fecha, por, campo,
cambio }`). Capacidad `conector:configurar` y campo asignado. Se manda la **operación**, no la
planta entera: el servidor la aplica con `aplicarCambioPlanta` (`planta.ts`) sobre la planta que
él tiene. `404` si el campo no tiene esquema; `409`/`422` con un id repetido o un elemento que
no está. Cada cambio queda en el historial (`GET /api/planta/cambios`).

### Registro de la cadena: `POST /api/campos/:campo/tags/:tag/equipo` · `POST /api/inscripcion`

Ver «Cadena de datos».

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

En el demo, el teléfono simulado de Identificar hace de webhook dentro del navegador
(`recibirWhatsapp` en `escrituras.ts`, con estas mismas reglas). **Con la fuente http no manda
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
   "inicio":"…", "fin":"…", "tag":"52-SE2", "texto":"interruptor del pórtico 13,8 kV abierto" }]
```

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
2. Una **bomba de la línea** parada que le corta el paso a ese pozo. Con dos paradas a la vez,
   primero la multifásica que mueve ese pozo, después la de disposición (`LSHH`/`CMD`/`HZ`), y
   entre dos del mismo papel la que paró primero. El resultado no depende del orden en que
   lleguen las paradas. Hereda la causa de la parada de la bomba.
3. El **programa** aprobado (configuración): programada.
4. El **código del controlador**: electrosumergible `GF`/`PH` → aislamiento, `OL` → bomba de
   fondo, `UL` → admisión, `OT` → motor; bombeo mecánico `OL`/`UL` → levantamiento; `UV` →
   energía, cargada al alimentador del pozo.
5. **Declarada** por un operario.
6. **Sin identificar**: se pregunta.

**Parada de bomba:** programa → **primera alarma**, solo si es un disparo de ESA máquina que
protege una parte de su catálogo (`primerasAlarmas` del perfil) → **firma de caudal** (perdida
< 1 sin disparar) → **servicio caído** a ±15 min de la parada → **firma de las señales al
parar** (`firma` del evento) → **respuesta del operario** → sin identificar. Un tag que la
máquina no declara se deja en la evidencia y no identifica la parte.

**Identificación:** pide respuesta la parada sin identificar, o la de bomba sin parte. Si arrancó
sin respuesta, o la respuesta llegó después del arranque: **no conformidad**.

**`porQueNo`** (opcional, en la causa): con `como: 'ninguno'`, por qué ninguna señal alcanzó
(«Sin primera alarma y sin firma: el PLC no dice qué parte falló»; en un pozo, «Ningún servicio
caído, ninguna bomba de la línea parada, fuera del programa y sin código de falla»). También es el
último renglón de `evidencia`, que es la cadena de custodia y no cambia; el front lo lee de este
campo y no de su lugar en la lista.

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
orden de cierre  = sin respaldo: todo el campo; con respaldo: menos crudo por barril de agua primero
crudo en riesgo  = Σ crudo asignado de lo que se cierra; se compara contra cerrar parejo
parada medida    = colchón previsto (con el nivel al parar) contra el observado (paro → primer pozo cerrado)
```
El tanque de una bomba se busca por la clave (`campoId`, `bomba`) en `tanques[]` de la
configuración firmada; el respaldo, por (`campoId`, `equipo`) en `respaldos[]`.

### Historia de fallas

Una **falla** es una parada propia del equipo (no la que causó otro equipo ni la programada). En
la electrosumergible, un evento que vuelve a arrancar en menos de **24 h** es un **disparo**, no
una falla. Tiempo entre fallas = días de historia ÷ fallas, **solo con dos fallas o más** (cuenta
la falla abierta). Tiempo fuera (`mdtH`) = promedio de la duración de sus fallas **cerradas**
(incluye la espera; la reparación activa sale de las órdenes de SAP). Una parada que el tanque
absorbió cuenta como falla con 0 bbl.

### Salud por parte

Cada parte agrupa las variables de su familia con un papel: **anuncia** (su tendencia anticipa la
falla), **la daña** (la causa) o **confirma** (cambia cuando la falla ya empezó).

| Estado | Regla |
|---|---|
| `fallo` | la parada abierta se le atribuye a esta parte (primera alarma o firma) |
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
Lo declarado o sin identificar no tiene casilla hasta que se clasifique.

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

   Con esos insumos cargados:
   ```bash
   node scripts/referencia.mjs comparar --base-url=http://servidor:8080
   ```
   pide cada `endpoint` (que ya trae `/api/…`) y compara: la respuesta tiene que **contener** lo
   esperado (puede traer más), los números valen iguales con una diferencia de hasta 1e-6
   relativo o 0,005 absoluto, las fechas se comparan como instante y el orden de las listas
   importa. Sale con 1 si algo no coincide. `npm test` comprueba que los archivos de
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
- **Lecturas de las electrosumergibles:** por qué endpoint llegan los ajustes de protección del
  variador de cada pozo (la banda y la alarma de corriente, frecuencia, presión de entrada,
  temperatura del motor y desbalance). La serie va por `GET …/tags/:tag/serie`; los ajustes no
  tienen ruta. Hasta que se decida, `referencia/insumos/<campo>/electrosumergibles.json` los trae
  sin endpoint, y en el front el demo los arma del pozo en `entities/esp.ts` (no son un insumo
  del motor como los demás).
