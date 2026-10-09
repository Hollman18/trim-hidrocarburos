# 5D.3 · Usuarios, roles, capacidades y permisos

Quién entra a TRIM, con qué rol y a qué campos, y qué puede escribir cada quien. **El producto fija lo que cada rol ve y hace** (`roles.ts`); **el gerente de activo decide quién tiene cada rol y qué campos** (`usuarios.ts`). Nadie se borra: quien ya no debe entrar queda suspendido y lo que firmó o respondió sigue a su nombre.

Código: `src/entities/roles.ts` (114 líneas), `src/entities/tipos.ts:119-206`, `src/entities/usuarios.ts` (292), `src/shared/api/escrituras.ts` (las reglas de cada escritura), `src/shared/api/usuarios.ts`, `src/widgets/configuracion/Accesos.tsx`, `src/pages/Perfil.tsx`, `src/app/url.ts`.

---

## 1. Los 8 roles del producto

`ROLES` declara 11 roles; `ROLES_VISIBLES` deja los **8 del primer producto** (`rolVisible`: con `MVP = true` se ocultan `plan` planeadora, `cont` abastecimiento y `reg` cumplimiento, `src/shared/config/producto.ts:13-17`). Un id de rol que no es del producto cae al rol de arranque `prod` (`rolPorId`, `roles.ts:111-114`; corrido: `rolPorId('plan')` → `prod`).

| id | Rol | Nivel | Persona demo | Pantallas (orden del menú) | Inicio | Campos de fábrica | Capacidades (las que `puedeHacer` concede) | Alertas WhatsApp |
|---|---|---|---|---|---|---|---|---|
| `ger` | Gerente de activo | decision | Andrés Vélez | resumen, diferidos, produccion, riesgo, configuracion | resumen | todos | evidencia:exportar, metas:firmar, usuarios:administrar | no |
| `prod` | Ingeniera de producción | ingenieria | Marcela Ríos | produccion, diferidos, pozos, esp, causa, planta | produccion | ceiba, palmar | evidencia:exportar, asignacion:cargar | no |
| `sup` | Supervisor de operaciones | operacion | Nelson Ortiz | bombas, esp, turno, causa, pozos | bombas | ceiba | causa:declarar, evidencia:exportar, sap:aviso | sí |
| `oper` | Operador de campo | operacion | Jairo Peña | bombas, esp, causa, turno | bombas | ceiba | causa:declarar, sap:aviso | sí |
| `jefe` | Jefe de mantenimiento | ingenieria | Camilo Rueda | mantenimiento, diferidos, bombas, esp, confiabilidad, equipo, riesgo, causa | mantenimiento | todos | causa:declarar (por inclusión), causa:completar, evidencia:exportar, sap:aviso | sí |
| `conf` | Ingeniero de confiabilidad | ingenieria | Edwin Maestre | bombas, esp, confiabilidad, diferidos, riesgo, equipo, causa, planta | bombas | ceiba, morichal, guacamayo | causa:declarar (por inclusión), causa:completar, evidencia:exportar, sap:aviso | sí |
| `tec` | Técnico de mantenimiento | operacion | Óscar Daza | trabajo, bombas, esp, causa | trabajo | ceiba | causa:declarar | sí |
| `adm` | Administrador de la implementación | ingenieria | Hermes Leal | configuracion, conectores, planta | configuracion | todos | evidencia:exportar, conector:configurar, config:firmar | no |

Además, **toda persona** puede abrir `perfil` (Mi perfil), que no está en el menú del rol pero sí en la dirección (`PANTALLAS_COMUNES`, `url.ts`). Pantallas de v2 (`agua`, `evidencia`, `regulatorio`) no se ofrecen.

**Nivel de detalle** (`NivelDetalle`, `tipos.ts:141-145`): `decision` = barriles, valor, tendencia, quién se los lleva y si está parado o en riesgo; `operacion` = qué está parado, qué se pierde, qué hacer, solo la variable que está fuera; `ingenieria` = todo (señales, partes, vigía, tolerancias, custodia). **Los números son los mismos en los tres**; cambia qué se muestra. El servidor puede omitir señales, tags, tolerancias y custodia a nivel `decision` (`CONTRATO.md` · «Las capacidades»). Ejemplo en este capítulo: el bloque SAP de un equipo es una sola línea para `decision` y lleva el historial de órdenes solo para `ingenieria` (5D.6).

**Topología** (`topologia`): cómo navega cada rol el árbol de activos (`proceso`, `produccion`, `medicion` o ninguna). Área del organigrama (`area`): Dirección, Producción y operaciones, Mantenimiento y confiabilidad, Soporte y cumplimiento, Plataforma.

---

## 2. Las capacidades

### Capacidad (permiso revisado en un endpoint)

**Qué es.** Un permiso que el **servidor** revisa en un endpoint concreto y que responde `403` sin él. No es una promesa de pantalla: una capacidad que ninguna acción revisaba se quitó (`roles.ts:4-20`).

**Fórmula.**

$$ \text{puedeHacer}(r, k) = r.\text{puede}[k] \;\lor\; \exists\, k' : r.\text{puede}[k'] \land k \in \text{INCLUYE}[k'] , \qquad \text{INCLUYE} = \{\texttt{causa:completar} \mapsto [\texttt{causa:declarar}]\} $$

| Capacidad | Nombre largo (Mi perfil, papel) | Nombre corto (Mi perfil) | Endpoint(s) que la exigen |
|---|---|---|---|
| `causa:declarar` | Responder qué se dañó cuando la señal no lo explica | Responder qué se dañó | `POST /api/paradas/:evento/respuesta` |
| `causa:completar` | Completar el análisis de la falla: mecanismo y causa raíz | Completar el análisis de la falla | `POST /api/analisis/:evento` y también `POST /api/paradas/:evento/respuesta` (incluye declarar) |
| `evidencia:exportar` | Exportar evidencia con folio | (igual) | `POST /api/informes` |
| `conector:configurar` | Configurar conectores y tags | (igual) | `POST /api/campos/:campo/tags/:tag/equipo`, `POST /api/inscripcion`, `POST /api/planta/cambios`, y el bloque `tecnico` de `GET …/procedencia` |
| `config:firmar` | Firmar la configuración técnica: tanques, respaldos de bombas, programa de paradas, perfil de los campos y membrete | Firmar la configuración técnica | `POST /api/configuracion` con cambios técnicos |
| `metas:firmar` | Fijar y firmar las metas de producción y de diferidos de cada campo, con su precio neto y su regla de cierre | Firmar metas y precio | `POST /api/configuracion` con metas, precio o regla de cierre |
| `usuarios:administrar` | Dar acceso a las demás personas: invitar, cambiar rol o campos, suspender | Dar acceso a otras personas | `POST /api/usuarios`, `PATCH /api/usuarios/:id`, registro completo en `GET /api/usuarios`, `GET /api/usuarios/historial` |
| `sap:aviso` | Enviarle a SAP el aviso de mantenimiento de un equipo (la orden la crea el planeador en SAP) | Enviar avisos a SAP | `POST /api/sap/avisos` |
| `asignacion:cargar` | Cargar la asignación oficial que reportó la operadora, pozo por pozo, para cotejarla con la de TRIM | Cargar la asignación oficial | `POST /api/asignacion-oficial` |

**Ejemplo con los datos del demo.** `permisosDelRol(jefe.puede).concedidas` = `[causa:declarar, causa:completar, evidencia:exportar, sap:aviso]` (declarar viene por inclusión). El técnico solo tiene `causa:declarar`.

**Casos borde.** La capacidad `rol:suplantar` ya no existe: el menú «Cambiar de rol» es del demo. Si algún día se soporta «ver como», es **solo lectura**: toda escritura con la suplantación activa responde 403 y `por` es la persona real (`CONTRATO.md` · «Sesión»).

**Qué texto se muestra según el valor.** Mi perfil, panel «PERMISOS» (extra «los otorga el servidor»): primero las concedidas con ✓, después las negadas con ✕ en tinta tenue; el nombre corto en pantalla y el largo en el globo y en el papel.

**Quién lo calcula y por dónde viaja.** Servidor, desde el token: `GET /api/sesion` → `capacidades: Capacidad[]` (ya expandidas: el servidor puede mandar `causa:declarar` explícito a quien tiene `causa:completar`). En el demo, `rolPorId(rolId).puede`.

**Referencia.** `src/entities/roles.ts:4-26`; `src/entities/tipos.ts:158-206`; `src/pages/Perfil.tsx:22-32`.

---

## 3. La sesión y los campos asignados

### Campos asignados de una persona (`camposAsignados`)

**Qué es.** Los campos sobre los que una persona ve y actúa. **Son los que el gerente le dio en el registro de usuarios**, no los de fábrica del rol. `"todos"` incluye los campos que se agreguen después.

**Dónde se ve.** Mi perfil, fila «Campos» («{n} de {total}», chips con el campo actual resaltado; ⓘ «Los campos a los que tiene acceso. Los asigna el gerente de activo.»); el selector de campo de la cabecera; toda escritura.

**Fórmula.**

$$ \text{campos}(p) = \begin{cases} \text{CAMPOS} & \text{si } p.\text{campos} = \texttt{"todos"} \\ \{ c \in \text{CAMPOS} : c.\text{id} \in p.\text{campos} \} & \text{si no} \end{cases} $$

En el demo, sin login, la persona de un rol es `personaDelRol(usuarios, rolId)`: la **activa** cuyo id es el del rol (la original), o la primera activa con ese rol; si nadie activo lo tiene, los campos de fábrica del rol (`usuarios.ts:279-292`). En producción: la persona del token.

**Ejemplo con los datos del demo.** `camposAsignados(conf)` = `["ceiba","morichal","guacamayo"]`.

**Casos borde.** Un id de campo en el registro de una persona que `GET /api/campos` no trae se muestra «{id} (campo sin registrar)» (`campoPorId`) y no se cuenta en la lista (el filtro es sobre `CAMPOS`). Persona **invitada** (todavía no entró) o **suspendida**: no tiene sesión (`401 sin-sesion`).

**Quién lo calcula y por dónde viaja.** Servidor: `GET /api/sesion` → `{ persona: { id, nombre }, rolId, nivel, campos: "todos" | [ids], capacidades: [...] }`. `401 { error: { codigo: "sin-sesion" } }` sin sesión válida. **La identidad sale del token, nunca de la petición** (ni del segmento `#/rol/…`, ni del cuerpo, ni de una cabecera que mande el navegador).

> **Atajos del prototipo que producción ignora:** las escrituras de `escrituras.ts` mandan la cabecera `x-rol`; el registro de la cadena (`procedencia.ts`, `registro.ts`) manda `x-capacidades`. El servidor real **no** las lee (`CONTRATO.md` · «Sesión», «Pendiente en el front»).

**Referencia.** `src/entities/usuarios.ts:279-292`; `CONTRATO.md` · «`GET /api/sesion`».

---

## 4. El registro de usuarios

### Forma completa (`Usuario`) y forma mínima (`PersonaVisible`)

```ts
// src/entities/usuarios.ts:18-60
interface Usuario { id; nombre; correo; rolId; campos: 'todos' | string[]; estado: 'activo' | 'invitado' | 'suspendido';
                    desde /* AAAA-MM-DD */; telefono? /* E.164 */; alertas: boolean; antesDeSuspender?: 'activo' | 'invitado' }
interface PersonaVisible { id; nombre; rolId; campos; estado; alertas; telefono? }
```

**Las 8 personas iniciales del demo** (corrido, `USUARIOS_INICIALES`): una por rol visible, `id = rolId`, correo `{nombre.apellido}@operadora.example` (sin tildes), `estado: "activo"`, `desde: "2026-09-01"`, teléfono `+5730055501{01..08}` (en el orden de `ROLES_VISIBLES`: ger 01, prod 02, sup 03, oper 04, jefe 05, conf 06, tec 07, adm 08), `alertas` = true solo en sup, oper, jefe, conf, tec.

### Quién lee qué (`GET /api/usuarios`, `registroVisible`)

**Qué es.** La regla de lectura del registro. Con `usuarios:administrar`: el registro completo. Sin ella (el arranque lo pide para todos): solo las personas que comparten **al menos un campo** con quien pregunta (o tienen «todos», o quien pregunta tiene «todos»), la propia completa y las demás en forma mínima.

| Dato | Su propio registro | Las demás personas |
|---|---|---|
| `id`, `nombre`, `rolId`, `campos`, `estado`, `alertas` | sí | sí |
| `telefono` | sí | **solo si recibe alertas** (activa, alertas encendidas, con número, en un rol con alertas) |
| `correo`, `desde`, `antesDeSuspender` | sí | no |

**Ejemplo con los datos del demo.** (Corrido.) Para el operador (`oper`, campos `["ceiba"]`) llegan las 8 personas (todas comparten La Ceiba o tienen «todos»): él completo (con correo y `desde`), y de los demás la forma mínima; el teléfono viaja solo de sup, jefe, conf y tec (`+573005550103/05/06/07`); el de ger, prod y adm no (no reciben alertas). Para producción (`prod`): igual, su propio teléfono `+573005550102` sí.

**Casos borde.** Si a quien administra le llegara la forma mínima, Accesos no deja editar y lanza un error con el texto «GET /api/usuarios trajo a {nombres} sin correo ni día de acceso: con usuarios:administrar el registro llega completo…» (`registroCompleto`, `usuarios.ts:73-77`). `GET /api/usuarios/historial` sin la capacidad responde `[]` (hoy el arranque lo pide para todos; pendiente en el front pedirlo solo con la capacidad).

**Quién lo calcula.** Servidor (la regla ejecutable es `registroVisible`, que también corre `verificar:contrato`, sección 8).

**Referencia.** `src/entities/usuarios.ts:42-93`; `CONTRATO.md` · «Quién lee qué».

### Número de WhatsApp en E.164 (`normalizarTelefono`, `e164`, `telefonoLegible`)

**Qué es.** El número es la **identidad de la persona en el canal**: el webhook resuelve el número que respondió a una persona. Se guarda, viaja y se compara en E.164 (`+` y 8-15 dígitos); se muestra agrupado.

**Fórmula.** Con la región Colombia (`celular = { indicativo: '+57', patron: /^3\d{9}$/ }`):
1. Se quitan espacios, paréntesis, puntos y guiones.
2. Si lo que queda es un celular nacional (`3` + 9 dígitos) → `+57` + número.
3. Si empieza por `+` y quedan 8-15 dígitos → `+` + dígitos.
4. Si no, se deja como se escribió (y la regla de forma lo rechaza).

**Ejemplo con los datos del demo.** (Corrido.)

| Escrito | Guardado | Mostrado (`telefonoLegible`) |
|---|---|---|
| `300 123 4567` | `+573001234567` | `+57 300 123 4567` |
| `+57 300 123 4567` | `+573001234567` | `+57 300 123 4567` |
| `(300) 123-4567` | `+573001234567` | `+57 300 123 4567` |
| `+1 (415) 555-0100` | `+14155550100` | `+14155550100` (otro país: no se agrupa) |
| `12345` | `12345` → 422 | — |
| `+57300` | `+57300` → 422 (5 dígitos) | — |

**Casos borde.** Único entre usuarios **no suspendidos** (restricción `unique` sobre el E.164 de los no suspendidos): dos personas con el mismo número harían que una respuesta quedara a nombre de la equivocada.

**Referencia.** `src/entities/usuarios.ts:137-168`; `src/shared/config/region.ts`.

---

## 5. Cambios de acceso (invitar, cambiar, suspender)

### Invitar (`POST /api/usuarios`) y cambiar (`PATCH /api/usuarios/:id`)

**Qué es.** Las dos escrituras del registro. Las dos exigen `usuarios:administrar`, una persona activa que firma y un motivo; las dos dejan un `CambioAcceso` en el historial.

**Dónde se ve.** Configuración → «Usuarios y accesos» (gerente; los demás que ven Configuración —el administrador— la ven en solo lectura: «Solo lectura: los da el gerente de activo.»). Panel «USUARIOS Y ACCESOS» (extra «{n} con acceso · {n} invitado(s) · {n} suspendido(s)»), botón «Invitar a una persona», «Cambiar» por fila; panel «HISTORIAL DE ACCESOS».

**Fórmula (secuencia del servidor, `escrituras.ts:143-193`).**

| # | Regla | Texto del demo | HTTP |
|---|---|---|---|
| 1 | `usuarios:administrar` | «Los accesos los da el gerente de activo.» | 403 `sin-capacidad` |
| 2 | persona activa que firma | «Nadie con acceso activo tiene este rol: …» | 403 |
| 3 | (PATCH) la persona existe | «Esa persona no está en el registro: invítela.» | 404 |
| 4 | normalizar: `nombre.trim()`, `correo.trim()`, teléfono a E.164; (POST) `id` nuevo, `desde` = día del servidor en Colombia, `estado: "invitado"`; (PATCH) `estado` según `estadoAlGuardar` | — | — |
| 5 | `revisarAcceso(registro, nuevo, firmante, motivo)` | ver la tabla siguiente | 403 / 409 / 422 |
| 6 | (PATCH) hay algún cambio (`cambiosDeUsuario`) | «No hay cambios que guardar.» | 422 |
| 7 | guardar y anotar `CambioAcceso { id consecutivo, fecha, por: "{nombre} · {rol}", usuario: nombre, cambios, motivo }` | → `{ datos: { usuario, acceso } }` | 200 |

Cuerpos: `POST { invitacion: { nombre, correo, rolId, campos, telefono?, alertas }, motivo }`; `PATCH { usuario: Usuario, motivo }`. El servidor asigna `id` (en el demo `u{n}` con el primer n libre desde `registro.length + 1`), `desde` y `estado`.

**Reglas de `revisarAcceso` y su HTTP.** El demo devuelve **todos** los errores juntos, cada uno con su caja (`campo`); el servidor responde con el código más fuerte presente (403 > 409 > 422) y la lista completa en `error.errores: [{ campo, texto }]`:

| Caja (`campo`) | Regla | Texto exacto | HTTP |
|---|---|---|---|
| `general` | nadie se suspende ni se cambia el rol a sí mismo | «No puede suspenderse ni quitarse el rol a sí mismo: pídaselo a otro gerente.» | 403 |
| `campos` | nadie cambia sus propios campos (mismos campos en cualquier orden) | «Sus propios campos los cambia otro gerente.» | 403 |
| `campos` | un firmante sin «todos» no otorga «todos» (salvo que la persona ya lo tuviera) | «No puede dar «todos los campos»: usted no los tiene.» | 403 |
| `campos` | un firmante sin «todos» no otorga campos fuera de los suyos; **lo que la persona ya tenía no se revisa**; quien tenía «todos» y queda con lista no recibe nada nuevo | «No puede dar campos que usted no tiene: {campos}.» | 403 |
| `general` | después del cambio queda ≥ 1 persona con rol `ger` y estado **activo** (un invitado no cuenta) | «Tiene que quedar al menos un gerente de activo con acceso: sin él nadie podría dar accesos ni firmar metas.» | 409 |
| `nombre` | ≥ 3 caracteres (`NOMBRE_MINIMO`) | «Falta el nombre completo.» | 422 |
| `correo` | forma `^[^\s@]+@[^\s@]+\.[^\s@]+$` | «Escriba un correo válido, como nombre@empresa.com.» | 422 |
| `correo` | único, sin distinguir mayúsculas | «Ya hay una persona con ese correo.» | 422 |
| `rol` | rol del producto (de los 8) | «Escoja un rol.» | 422 |
| `campos` | lista no vacía | «Escoja al menos un campo.» | 422 |
| `whatsapp` | si hay teléfono, E.164 `^\+\d{8,15}$` | «El WhatsApp va con indicativo (+57 300 123 4567) o como celular de 10 dígitos (300 123 4567).» | 422 |
| `whatsapp` | E.164 único entre no suspendidos (si el nuevo estado no es suspendido) | «Ese WhatsApp ya es de {nombre}: cada número es de una sola persona.» | 422 |
| `whatsapp` | alertas ⇒ teléfono | «Para recibir alertas necesita un número de WhatsApp.» | 422 |
| `alertas` | alertas ⇒ rol con alertas (`sup`, `oper`, `tec`, `conf`, `jefe`) | «Ese rol no recibe alertas por WhatsApp: quite la marca.» | 422 |
| `motivo` | ≥ 5 caracteres (`MOTIVO_MINIMO`) | «Falta el motivo: todo cambio de acceso queda escrito con su porqué.» | 422 |

**Ejemplo con los datos del demo.** (Corrido.)
- El gerente suspendiéndose: dos errores, «No puede suspenderse ni quitarse el rol a sí mismo…» y «Tiene que quedar al menos un gerente de activo…» (es el único gerente) → 403.
- El gerente cambiándose sus campos a `["ceiba"]` → «Sus propios campos los cambia otro gerente.».
- Un segundo gerente `u9` con campos `["ceiba"]` dando Morichal al operador → «No puede dar campos que usted no tiene: Morichal Norte.»; dándole «todos» → «No puede dar «todos los campos»: usted no los tiene.».
- El administrador cambiando el rol del gerente a producción (el demo ni siquiera llega aquí: el administrador no tiene `usuarios:administrar`; con `revisarAcceso` directo) → «Tiene que quedar al menos un gerente de activo con acceso…» → 409.
- Invitación con nombre «Al», correo de Nelson Ortiz, rol `plan`, sin campos, WhatsApp de Nelson, alertas, motivo «ok» → siete errores: nombre, «Ya hay una persona con ese correo.», «Escoja un rol.», «Escoja al menos un campo.», «Ese WhatsApp ya es de Nelson Ortiz: cada número es de una sola persona.», «Ese rol no recibe alertas por WhatsApp: quite la marca.», motivo.
- Invitación correcta por el gerente: `{ nombre: "Lucía Prada", correo: "lucia.prada@operadora.example", rolId: "sup", campos: ["ceiba"], telefono: "300 555 0199", alertas: true }`, motivo «Nuevo supervisor de La Ceiba desde octubre» → usuario `{ id: "u9", …, telefono: "+573005550199", estado: "invitado", desde: "2026-10-02" }` y acceso `{ id: 2, fecha: "2026-10-02T14:00:00-05:00", por: "Andrés Vélez · gerente de activo", usuario: "Lucía Prada", cambios: ["invitado como supervisor de operaciones", "campos: La Ceiba", "WhatsApp: +57 300 555 0199", "recibe alertas por WhatsApp"], motivo: "Nuevo supervisor de La Ceiba desde octubre" }`.
- Suspenderla después («Ya no trabaja en el campo») → `estado: "suspendido"`, `antesDeSuspender: "invitado"`, acceso 3 con `cambios: ["acceso suspendido"]`. Guardar otra vez sin cambios → «No hay cambios que guardar.». PATCH a `u99` → «Esa persona no está en el registro: invítela.».
- El operador intentando invitar → «Los accesos los da el gerente de activo.».

### Estado al guardar (`estadoAlGuardar`)

El front solo dice **si queda suspendida o no**; el estado lo decide el servidor:

| Antes | Pedido | Queda |
|---|---|---|
| activo / invitado | suspendido | suspendido, `antesDeSuspender` = el de antes |
| suspendido | suspendido | suspendido, conserva `antesDeSuspender` |
| suspendido | no suspendido | `antesDeSuspender` (o activo si no había): **un invitado que nunca entró vuelve a invitado**, no a activo |
| activo / invitado | no suspendido | el mismo de antes (el front no puede activar a nadie) |

Corrido: `estadoAlGuardar(Lucía invitada, suspendida)` → `antesDeSuspender: "invitado"`; quitar la suspensión → `estado: "invitado"`.

> **Lo que el demo no tiene y el servidor sí:** el paso de `invitado` a `activo` ocurre **cuando la persona entra por primera vez** (servicio de identidad). No hay endpoint para eso; lo hace el servidor al emitir la primera sesión.

### Texto del historial (`cambiosDeInvitacion`, `cambiosDeUsuario`)

| Caso | Renglones (exactos) |
|---|---|
| invitación | `invitado como {rol en minúscula}` · `campos: {nombres o "todos los campos"}` · `WhatsApp: {legible o "sin número"}` · (si alertas) `recibe alertas por WhatsApp` |
| cambio de rol | `rol: {Rol A} → {Rol B}` |
| cambio de campos | `campos: {A} → {B}` |
| suspensión / reactivación | `acceso suspendido` · `acceso reactivado` · (otro cambio de estado) `estado: {nombre del estado}` |
| WhatsApp | `WhatsApp: {A legible} → {B legible}` (se compara el E.164 guardado) |
| alertas | `recibe alertas por WhatsApp` · `deja de recibir alertas por WhatsApp` |

Corrido: de Lucía (sup, La Ceiba, +573005550199, alertas) a (oper, La Ceiba + Morichal, suspendida, +573005550200, sin alertas) → `["rol: Supervisor de operaciones → Operador de campo", "campos: La Ceiba → La Ceiba, Morichal Norte", "acceso suspendido", "WhatsApp: +57 300 555 0199 → +57 300 555 0200", "deja de recibir alertas por WhatsApp"]`.

El primer cambio del historial del demo es el de arranque: `{ id: 1, fecha: "2026-09-01T08:00:00-05:00", por: "Hermes Leal · administrador de la implementación", usuario: "Todas las personas iniciales", cambios: ["Andrés Vélez: gerente de activo", …], motivo: "Accesos de arranque de la implementación" }` (`sesion.ts:84-85`).

**Casos borde.**
- **Nombre y correo no aparecen en `cambiosDeUsuario`.** Un PATCH que solo cambie el correo da «No hay cambios que guardar.»; uno que cambie el correo junto con otra cosa lo guarda **sin dejarlo en el historial**. El formulario de cambio no muestra nombre ni correo (solo la invitación), pero un cliente HTTP sí podría mandarlos. Ver «Huecos y dudas».
- La forma del formulario: el rol y los campos de **la propia fila** están deshabilitados («Su propio rol y su acceso los cambia otro gerente de activo.»); la casilla «Todos los campos, también los futuros» solo aparece a quien tiene «todos» (o si la persona ya lo tenía); la casilla de alertas solo se habilita en roles con alertas y dice «Recibe por WhatsApp: {ALERTAS_DEL_ROL}»; «Suspender el acceso · lo firmado sigue a su nombre» no aparece en la propia fila. Al fallar, el foco va a la primera caja con error en el orden nombre, correo, rol, campos, whatsapp, alertas, motivo.

**Qué texto se muestra según el valor.** Cada fila: nombre (tachado si suspendido; «· usted» en la propia), correo (solo con registro completo), «{Rol} · {campos}», «WhatsApp {legible}» o «sin WhatsApp», «· recibe alertas»; chip «invitado · aún no entra» o «suspendido» (fuerte). Historial: «{usuario}» · «{fechaHora} · {por}» · «{motivo}» · renglones; cinco visibles y «ver N más».

**Quién lo calcula y por dónde viaja.** Servidor. Tablas `usuario` (`unique` sobre correo en minúsculas y sobre el E.164 de los no suspendidos) y `cambio_acceso` (solo se inserta). `GET /api/usuarios/historial` → `CambioAcceso[]` del más viejo al más nuevo.

**Referencia.** `src/entities/usuarios.ts:183-277`; `src/shared/api/escrituras.ts:125-193`; `src/widgets/configuracion/Accesos.tsx`.

### Alertas por rol (`ROLES_CON_ALERTAS`, `ALERTAS_DEL_ROL`, `recibeAlertas`)

$$ \text{recibeAlertas}(u, c) = u.\text{estado}=\text{activo} \land u.\text{alertas} \land u.\text{telefono} \neq \varnothing \land u.\text{rolId} \in \{\text{sup, oper, tec, conf, jefe}\} \land (c \text{ omitido} \lor u.\text{campos}=\text{todos} \lor c \in u.\text{campos}) $$

| Rol | Lo que le llega (texto de Accesos y Mi perfil) |
|---|---|
| sup | equipo de alto impacto parado, pozos cerrándose por una bomba y «¿qué se dañó?» cuando nadie responde en 2 h (o de una vez, si no hay operador con WhatsApp) |
| oper | equipo de alto impacto parado, pozos cerrándose por una bomba y «¿qué se dañó?» con su recordatorio a los 30 min |
| tec | las órdenes que SAP le libera |
| conf | cada predicción del vigía cuando sale, con su ventana |
| jefe | cada predicción del vigía cuando sale, con su ventana |

Corrido para los 8 iniciales (sin campo / con `morichal`): ger F/F, prod F/F, sup V/F, oper V/F, jefe V/V, conf V/V, tec V/F, adm F/F.

Mi perfil, panel «AVISOS»: sin rol con alertas → «Su rol no recibe alertas por WhatsApp.»; con rol → chip «le llegan» / «no le llegan: sin número» / «apagadas» / «sin persona con acceso», y «Las cambia el gerente de activo». Mi perfil **no escribe** teléfono ni alertas; lo único personal es la apariencia (Sistema / Claro / Oscuro). «SESIONES Y CONTRASEÑA»: hueco «Servicio de identidad de la empresa · sin conectar» (TRIM no guarda contraseñas: OIDC/SSO del cliente).

---

## 6. Reglas de autorización que el servidor aplica en cada endpoint

**Regla general.** Toda escritura exige (1) sesión (401), (2) la capacidad (403 `sin-capacidad`), (3) una **persona activa** (403), (4) que el campo del recurso sea uno de los campos de la persona (403 `sin-permiso`). El campo se resuelve **desde el recurso** (evento del PLC, equipo, tag) o desde el cuerpo cuando el recurso no existe todavía. Orden: capacidad y persona (403) → recurso (404) → el campo del cuerpo es el del recurso (422) → la persona tiene el campo (403) → conflicto (409) → forma (422). Las **lecturas** también filtran por campo: una dirección con un campo ajeno no devuelve datos de ese campo. Los 10 GET del arranque **nunca** responden 403 a una persona con sesión: filtran.

`por`, `porId`, `hora`, `fecha`, `canal`, números consecutivos e ids **los pone el servidor**, nunca el cuerpo. `por` sale del token (hoy el texto «Nombre · rol en minúscula»; el contrato propone `por: { id, nombre, rol }`).

| Endpoint | Capacidad | De dónde sale el campo | 404 | 409 | 422 (texto del demo) | Sección |
|---|---|---|---|---|---|---|
| `POST /api/configuracion` | `metas:firmar` y/o `config:firmar` según los grupos | cada campo de `camposTocados` (el membrete no es de un campo) | — | `version-cambio` | validarConfig, motivo, sin cambios | 5D.2 |
| `POST /api/usuarios`, `PATCH /api/usuarios/:id` | `usuarios:administrar` | nadie otorga campos que no tiene | PATCH a quien no existe | último gerente | revisarAcceso | 5D.3 |
| `POST /api/paradas/:evento/respuesta` | `causa:declarar` (o `causa:completar`) | del evento del PLC | «Esa parada no está en el registro del PLC.» | «Ya respondió {por}.» (la primera gana) | «La parada no es de ese campo.» · «Esa parte no es de este equipo.» · «Diga qué parte de la bomba se dañó.» · «Diga qué vio en esa parte.» · «Escriba qué encontró, con al menos una frase corta.» · **403** si el cuerpo trae `canal: "whatsapp"` | 5D.5 |
| `POST /api/analisis/:evento` | `causa:completar` | del evento (el cuerpo no lo trae) | evento inexistente | — (un segundo POST es versión nueva) | «Solo se analiza una falla declarada con su parte.» · «Escoja el mecanismo de falla.» · «Escoja la causa raíz.» | capítulo del libro |
| `POST /api/sap/avisos` | `sap:aviso` | `campoId` del cuerpo | — | «Ya hay un aviso abierto de {equipo} en SAP: el {número}.» | «Escriba qué pasa, con al menos una frase corta.» (`campo: "descripcion"`) | 5D.6 |
| `POST /api/informes` | `evidencia:exportar` | `campos` del cuerpo (todos) | — | — | sin campos, campo inexistente, `hasta ≤ desde`, ficha de otro campo | 5D.4 |
| `GET /api/informes/:folio` | sesión y **todos** los campos del informe | del informe | folio inexistente | — | — | 5D.4 |
| `POST /api/asignacion-oficial` | `asignacion:cargar` | `campoId` de cada fila | — | — | mes no cerrado, pozo vacío, bbl < 0, horas fuera de rango, sin filas, motivo | capítulo de asignación |
| `POST /api/planta/cambios` | `conector:configurar` | `campo` del cuerpo | campo sin esquema | id repetido | elemento que no está | 5D.7 |
| `POST /api/campos/:campo/tags/:tag/equipo` | `conector:configurar` | `:campo` de la ruta (= el del tag) | `tag-no-registrado`, `equipo-desconocido` | — | 400 sin equipo u origen inválido | 5D.8 |
| `POST /api/inscripcion` | `conector:configurar` | `campo` del cuerpo | `campo-desconocido` | — | — | 5D.8 |
| `POST /api/ingesta/nacimiento` | certificado de cliente del borde (no sesión de persona) | del certificado | `campo-desconocido` | `tag-de-otro-gateway` | 400 `faltas` · 403 `gateway-de-otro-campo` | 5D.8 |
| `POST /api/webhooks/whatsapp` | firma de Meta (no sesión) | de la parada del mensaje respondido | — | — | (siempre 200 a Meta; 401 sin firma) | 5D.5 |

**El cuerpo de error.** `{ "error": { "codigo": "…", "mensaje": "…" } }`, más `errores: [{ campo, texto }]` en accesos y `campo: "descripcion"` en un aviso. El `mensaje` se muestra **tal cual** (español, sin detalles internos). Un 5xx responde `interno` sin el mensaje interno.

### Cómo vuelve un rechazo al front (`{ ok: false, error }`)

Todas las escrituras del front devuelven `{ ok: true, … }` o `{ ok: false, error: string }` (`Rechazo`, `escrituras.ts:53-55`; los accesos devuelven `{ ok: false, errores: ErrorAcceso[] }`):

| Lo que pasó en HTTP | `error` que ve la persona |
|---|---|
| 403, 409 o 422 con el error del contrato | `error.mensaje` del servidor, tal cual |
| otro HTTP con error del contrato (400, 404, 500…) | «No se guardó: {mensaje}.» |
| respuesta que no es JSON | «No se guardó: no hay un servicio conectado en esta instalación que responda esa ruta.» |
| sin red | «No se guardó: no se pudo hablar con el servidor ({detalle}).» |
| accesos sin `errores` en el cuerpo | `[{ campo: "general", texto: error }]` |

Lo aceptado se copia a la sesión del front **con lo que el servidor devolvió** (no con lo que se mandó).

**Referencia.** `src/shared/api/escrituras.ts:37-83`; `src/shared/api/fuente.ts:30-94`; `CONTRATO.md` · «Error único», «Las escrituras se limitan a los campos de la persona».
