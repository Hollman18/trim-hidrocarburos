# 7. La API, endpoint por endpoint

La forma exacta de cada respuesta está en el **anexo A** (el contrato completo, `CONTRATO.md`) y en el código: `src/shared/api/contrato.ts` (rutas, parámetros y códecs) y `src/shared/api/cable.ts` (las reglas del cable). Este capítulo es el **índice**: qué endpoint existe, qué parámetros lleva, qué pantalla lo usa y en qué capítulo están las fórmulas de lo que devuelve.

Cómo leer las tablas:

- **Parámetros.** `campos` es una lista separada por comas (`campos=ceiba,morichal`); `desde` y `hasta` van en ISO 8601 con zona (`2026-09-01T00:00:00.000-05:00`) y el `hasta` **no se incluye**. Los parámetros que no están en la ruta van en la consulta.
- **Pantallas.** En negrita, la pantalla; en `código`, el panel (archivo de `src/widgets/`). «(v2)» son pantallas de la versión 2 que el producto no muestra todavía (`PANTALLAS_V2` en `src/shared/config/producto.ts`); el endpoint igual se necesita para las demás.
- **Constante.** El nombre del endpoint en `contrato.ts`: ahí está su códec, que es la especificación ejecutable de la respuesta (`aDTO` = lo que el servidor produce).

## 7.1 Lecturas (`GET`)

Todas responden el sobre `{ "datos": …, "refs": { … } }`.

| Ruta | Parámetros | Constante | Pantallas que la usan | Fórmulas |
|---|---|---|---|---|
| `GET /api/vistas/diferidos` | `campos`, `desde`, `hasta` | `DIFERIDOS` | **Agua (v2)**, **Identificar**, **Diferidos**, **Superficie**, **Electrosumergibles**, **Mantenimiento**, **Planta**, **Portafolio (v2)**, **Producción**, **Regulatorio (v2)**, **Resumen**, **Turno**, `PanelEquipo`, `informe/Exportar`, `resumen/ResumenDirectivo` | 5A |
| `GET /api/vistas/diferidos/mensual` | `campos` | `DIFERIDOS_MENSUAL` | **Diferidos**, **Portafolio (v2)**, **Producción**, **Regulatorio (v2)**, **Resumen**, `resumen/ResumenDirectivo` | 5A |
| `GET /api/vistas/diferidos/base` | `campos`, `desde`, `hasta` | `DIFERIDOS_BASE` | **Diferidos**, **Mantenimiento**, **Portafolio (v2)**, **Resumen**, `resumen/ResumenDirectivo` | 5A |
| `GET /api/vistas/produccion/diaria` | `campos`, `desde`, `hasta` | `PRODUCCION_DIARIA` | **Producción** | 5A |
| `GET /api/vistas/potencial-reciente` | `campos` | `POTENCIAL_RECIENTE` | **Configuración** | 5A, 5D |
| `GET /api/vistas/paradas/por-identificar` | `campos` | `PREGUNTAS` | **Identificar**, **Mantenimiento**, **Mi trabajo**, **Turno**, `PanelEquipo`, `conectores/Integraciones`, `equipo/FichaEjecutiva`, `riesgo/Ahora`, `sap/BloqueSap` | 5B |
| `GET /api/vistas/paradas/:evento/opciones` | `{ evento: string }` | `OPCIONES_RESPUESTA` | **Identificar** | 5B, 5C |
| `GET /api/vistas/bombas/prediccion` | `campo`, `equipo` | `PREDICCION` | **Agua (v2)** | 5B |
| `GET /api/vistas/bombas/paradas` | `campo`, `equipo` | `PARADAS_BOMBA` | `bombas/Detalle` | 5B |
| `GET /api/vistas/bombas/paradas-en-periodo` | `campos`, `desde`, `hasta` | `PARADAS_EN_PERIODO` | **Evidencia (v2)** | 5B |
| `GET /api/vistas/riesgo` | `campos` | `RIESGO` | **Superficie**, **Mantenimiento**, **Riesgo**, **Mi trabajo**, **Turno**, `equipo/FichaEjecutiva`, `resumen/ResumenDirectivo`, `riesgo/Ahora`, `sap/BloqueSap` | 5B |
| `GET /api/vistas/estado` | `campos` | `ESTADO` | **Planta**, **Portafolio (v2)**, **Producción**, **Riesgo**, **(vista de un campo)**, `Cabecera`, `Riel`, `resumen/ResumenDirectivo` | 5B |
| `GET /api/vistas/pozos` | `campos`, `desde`, `hasta` | `POZOS` | **Pozos** | 5B, 5C |
| `GET /api/vistas/pozos/:campo/:pozo` | `{ campo: string; pozo: string; desde: Date; hasta: Date }` | `POZO` | `pozos/DetallePozo` | 5B, 5C |
| `GET /api/vistas/electrosumergibles` | `campos`, `desde`, `hasta` | `ELECTROSUMERGIBLES` | **Electrosumergibles** | 5C |
| `GET /api/vistas/asignacion` | `{ campo: string; mes: string }` | `ASIGNACION` | `produccion/AsignacionOficial` | 5A |
| `GET /api/vistas/predicciones` | `campos` | `PREDICCIONES` | `confiabilidad/Aciertos` | 5C |
| `GET /api/vistas/relojes` | `campos`, `desde`, `hasta` | `RELOJES` | **Confiabilidad**, `sap/PanelSapMantenimiento` | 5D |
| `GET /api/vistas/campos/:campo/ahora` | `{ campo: string }` | `CAMPO_AHORA` | **Agua (v2)**, **Configuración**, **Planta** | 5B |
| `GET /api/vistas/equipos/:campo/:equipo` | `campo`, `equipo` | `EQUIPO_HOY` | `PanelEquipo`, `sap/BloqueSap` | 5C |
| `GET /api/vistas/equipos-hoy` | `campos` | `EQUIPOS_HOY` | **Planta**, **Regulatorio (v2)**, `diferidos/Paretos` | 5C |
| `GET /api/vistas/equipos/:campo/:equipo/historia` | `campo`, `equipo` | `HISTORIA_EQUIPO` | `PanelEquipo` | 5B |
| `GET /api/vistas/equipos/:campo/:equipo/ficha` | `PorEquipo & { desde: Date; hasta: Date }` | `FICHA_EQUIPO` | `equipo/FichaEjecutiva` | 5B |
| `GET /api/vistas/equipos` | `campos` | `FILAS_EQUIPOS` | **Superficie** | 5C |
| `GET /api/vistas/confiabilidad` | `campos` | `CONFIABILIDAD` | **Confiabilidad** | 5C |
| `GET /api/vistas/bombas` | `campos`, `desde`, `hasta` | `BOMBAS` | **Bombas** | 5B, 5C |
| `GET /api/vistas/ciclo` | `campos`, `desde`, `hasta` | `CICLO` | **Resumen**, **Riesgo**, **Turno**, **Identificar**, **Mantenimiento**, `resumen/ResumenDirectivo`, `equipo/FichaEjecutiva`, `bombas/Detalle`, `ciclo/Ciclo` | 11 |
| `GET /api/mensajes` | `campos` | `MENSAJES` | **Identificar**, **Mi trabajo**, **Turno**, `conectores/Integraciones` | 5D |
| `GET /api/sap/avisos` | `campos` | `SAP_AVISOS` | **Mi trabajo**, `conectores/Integraciones`, `confiabilidad/Aciertos`, `resumen/ResumenDirectivo`, `sap/BloqueSap`, `sap/PanelSapMantenimiento` | 5D |
| `GET /api/sap/ordenes` | `campos` | `SAP_ORDENES` | **Mi trabajo**, `conectores/Integraciones`, `confiabilidad/Aciertos`, `resumen/ResumenDirectivo`, `sap/BloqueSap`, `sap/PanelSapMantenimiento` | 5D |
| `GET /api/sap/equipos` | `{ campo: string }` | `SAP_EQUIPOS` | `conectores/Integraciones` | 5D |
| `GET /api/sap/equipos/:equipo` | `campo`, `equipo` | `SAP_EQUIPO` | `sap/BloqueSap` | 5D |
| `GET /api/campos` | — | `LISTA_CAMPOS` | _arranque (estado global)_ | 2.5 |
| `GET /api/catalogo` | — | `CATALOGO` | _arranque (estado global)_ | 2.5, 4, 5C |
| `GET /api/configuracion/historial` | — | `CONFIGURACION_HISTORIAL` | _arranque (estado global)_ | 5D |
| `GET /api/paradas/respuestas` | — | `RESPUESTAS` | _arranque (estado global)_ | 5B, 5D |
| `GET /api/usuarios` | — | `USUARIOS` | _arranque (estado global)_ | 5D |
| `GET /api/usuarios/historial` | — | `ACCESOS` | _arranque (estado global)_ | 5D |
| `GET /api/informes` | — | `INFORMES` | _arranque (estado global)_ | 5D |
| `GET /api/asignacion-oficial` | — | `ASIGNACION_OFICIAL` | _arranque (estado global)_ | 5A |
| `GET /api/analisis` | — | `ANALISIS` | _arranque (estado global)_ | 5C, 5D |
| `GET /api/planta/cambios` | — | `CAMBIOS_PLANTA` | _arranque (estado global)_ | 5D |

**Presentación de `GET /api/vistas/ciclo` (front hecho).** El códec define números y planes; el front **no recalcula**. En Resumen el retorno simulado va **antes** de «MEDIDO · PERÍODO»; chip «simulado»; tres columnas «1 / 2 / 3» sin párrafos bajo cada una; el «por qué» en ⓘ y globos (`Tip`); lista «Ver planes de acción» **plegada** por defecto. En Riesgo, Turno y Mantenimiento: cinturón `CicloCifras` (sin lista de planes). Reglas de copy y accesibilidad: capítulo **11 §11.1b**, **8 §8.13**; cadenas que debe ver el auditor e2e: `e2e/auditoria/rutas.ts` (Resumen gerente). En el demo, `POST /api/planes/:id` aplica sobre la respuesta en sesión (S24 en capítulo 10).

Las rutas con `_arranque_` se piden una vez al abrir la aplicación (sección 2.5) y alimentan el estado global; ninguna pantalla las vuelve a pedir.

> **Cambios del 8 de octubre de 2026** (commit `cb8cd39`; la forma exacta, en el anexo A y en `contrato.ts`):
> - `GET /api/vistas/riesgo`: `costoFalla` es ahora lo que costaría **si el equipo falla hoy**, descontando el colchón del tanque (5B, «Costo por falla»); campo nuevo `colchonH` (horas que aguanta hoy el tanque, solo bombas de disposición con tanque); `mdtFuente` lo dice en palabras.
> - `GET /api/vistas/diferidos` (y `/mensual`): cada fila de `porEquipo` trae `fallas` y `disparos` en el período (bombas de la línea y electrosumergibles); campo nuevo `sinCosto`: los equipos que fallaron en el período sin costar crudo.
> - `GET /api/vistas/bombas/prediccion`: campo nuevo `llenado` (con la bomba detenida, el agua que entra hoy al tanque y en cuántas horas llega al alto-alto; sin agua que entre, no sube).
> - Instrumento sin lectura: `valor: null` (nunca «—» ni 0). Servicio todavía caído: `EventoServicio.fin: null`.
> - «Por identificar» se cuenta igual en todas las pantallas sobre `GET /api/vistas/paradas/por-identificar` (`contarPorIdentificar`: las que piden respuesta y, de ellas, las que ya arrancaron sin identificar).

> **Escala.** Con la fuente http, una pantalla que lee varias consultas las pide una tras otra (cada `use()` suspende hasta que llega la anterior). El servidor tiene que responder rápido (objetivo: < 300 ms por vista de un campo y un mes) o el front tendrá que precargarlas. `/vistas/diferidos` trae hoy todos los tramos; cuando el portafolio crezca conviene paginarlos (`GET /api/vistas/diferidos/tramos?cursor=`).

## 7.2 Registro de la cadena de datos

Sin sobre: el objeto tal cual. Detalle en el capítulo 4 y en el anexo A («Cadena de datos (registro)»).

| Ruta | Qué devuelve | Quién la usa | Capacidad |
|---|---|---|---|
| `GET /api/campos/:campo/tags/:tag/procedencia` | De dónde sale un número: instrumento, lectura, cálculo, custodia y (solo con `conector:configurar`) el bloque técnico del gateway. `404 tag-no-registrado` si el tag no existe: el front muestra el hueco. | el panel «cadena del dato» (`CadenaDato`), en toda pantalla que muestra una señal | lectura: cualquiera con el campo; `tecnico`: `conector:configurar` |
| `GET /api/campos/:campo/inventario` | Gateways, conteo de tags (total y pendientes) y equipos con sus tags; `404 campo-desconocido` | **Conectores** | ninguna: basta tener el campo |
| `GET /api/campos/:campo/tags/pendientes` | Tags que el borde mandó y que no se pudieron asociar a un equipo; `404 campo-desconocido` | **Conectores** | ninguna: basta tener el campo |
| `POST /api/campos/:campo/tags/:tag/equipo` | Asocia un tag pendiente a un equipo (`origen: "manual" \| "regla"`) | **Conectores** | `conector:configurar` |
| `POST /api/inscripcion` | Emite el código de un solo uso (10 caracteres, vence en 24 h) con que un gateway nuevo se inscribe en un campo; en producción se canjea por su certificado de cliente | **Conectores** | `conector:configurar` |
| `POST /api/ingesta/nacimiento` | El borde se presenta (certificado de nacimiento Sparkplug: gateway, dispositivos, tags, límites declarados): es lo que llena la cadena sola. `400` con `faltas: [ruta]` si viene mal formado | el gateway, no una pantalla | certificado de cliente del gateway (pendiente: hoy entra por HTTP) |
| `GET /api/salud` | `{ ok: true }`: que el servicio responde | monitoreo | ninguna |

## 7.3 Insumos que entrega el borde

Ninguna pantalla los pide: son la **entrada del motor**. El servidor los arma con lo que llega del borde (capítulo 4) y los guarda (capítulo 3). `referencia/insumos/` trae los de los cinco campos del demo con esta misma forma, para cargar una base de pruebas sin leer TypeScript.

| Ruta | Qué carga | Archivo de referencia |
|---|---|---|
| `GET /api/campos/:campo/pozos` | Pozos, sus pruebas y el origen de cada prueba | `referencia/insumos/<campo>/pozos.json` |
| `GET /api/campos/:campo/pozos/eventos?desde&hasta` | Eventos del controlador de cada pozo (inicio, fin, código) | `<campo>/pozos-eventos.json` |
| `GET /api/campos/:campo/servicios/eventos?desde&hasta` | Caídas de energía, aire, compresión, evacuación… | `<campo>/servicios-eventos.json` |
| `GET /api/campos/:campo/bombas/:equipo/paradas?desde&hasta` | Paradas de cada bomba: primera alarma, firma de señales, nivel del tanque al parar | `<campo>/bombas/<equipo>-paradas.json` |
| `GET /api/campos/:campo/produccion-diaria?desde&hasta` | El valor fiscal de cada día (`null` = sin dato) y su origen | `<campo>/produccion-diaria.json` |
| `GET /api/campos/:campo/tags/:tag/serie?desde&hasta` | La serie del historiador de un tag (`SerieTag`: `desde`, `pasoH`, `valores` con `null` en los huecos) | dentro de `arranque/catalogo.json` (registro de equipos) |
| `GET /api/campos/:campo/tanques/:tanque/nivel` | El nivel del tanque de agua ahora: `{ tag, pct, hora }` (el colchón sale de aquí; en el demo es una constante, capítulo 10 S2) | — (constante `NIVEL_AHORA` del demo) |
| `GET /api/campos/:campo/metrologia` | La gravedad API del crudo y su fuente: `{ api, apiFuente, demostrada }`; `api: null` = banda no verificable y el libro no se publica (5A §2) | dentro de `arranque/catalogo.json` (`medicion.metrologia`) |
| **sin ruta todavía** | Ajustes de protección del variador de cada electrosumergible (banda y alarma de sus cinco señales) | `<campo>/electrosumergibles.json` (`"endpoint": null`) — capítulo 10 |

### Lecturas del contrato que el front no pide

| Ruta | Qué devuelve | Para qué |
|---|---|---|
| `GET /api/informes/:folio` | El registro completo de un informe (consulta, cifras, estado y huella). Exige sesión y que **todos** los campos del informe sean de la persona (403 si no; 404 si el folio no existe): el folio es consecutivo y sin esta regla se podrían recorrer todos | Auditoría de un informe emitido (5D) |
| `GET /api/configuracion` (opcional) | La última versión firmada: `{ version, fecha, por, motivo, config }` | El front usa `/api/configuracion/historial` |

## 7.4 Escrituras

Todas responden `{ "datos": … }` o el error único. **`por`, `porId`, `hora`, `fecha`, `canal`, números consecutivos e ids los pone el servidor, nunca el cuerpo.** El orden de revisión es siempre: capacidad y persona activa (403) → recurso (404) → campo del cuerpo = campo del recurso (422) y la persona lo tiene (403) → conflicto (409) → forma (422).

| Ruta | Cuerpo | Capacidad | De dónde sale el campo | Responde | 403 · 404 · 409 · 422 propios | Capítulo |
|---|---|---|---|---|---|---|
| `POST /api/configuracion` | `{ config, motivo, base }` (`base` = versión sobre la que se editó) | `metas:firmar` (tramos: meta, máximo de diferido, precio, máximo sin causa) y/o `config:firmar` (programa, tanques, respaldos, perfil, membrete); las dos si toca los dos grupos | **cada campo que el cambio toca** (`camposTocados`) | `{ version }` | 409 `version-cambio` si `base` no es la vigente; 422 por las 8 reglas de `validarConfig` (anexo A) | 5D |
| `POST /api/usuarios` | `{ invitacion: { nombre, correo, rolId, campos, telefono?, alertas }, motivo }` | `usuarios:administrar` | los campos que se otorgan (nadie otorga lo que no tiene) | `{ usuario, acceso }` (el servidor pone `id`, `desde`, `estado: "invitado"`) | 422 con `errores[]` por caja (`revisarAcceso`): nombre ≥ 3, correo único, rol del producto, ≥ 1 campo, teléfono E.164 único entre no suspendidos, alertas solo con teléfono y en roles con alertas, motivo ≥ 5 | 5D |
| `PATCH /api/usuarios/:id` | `{ usuario, motivo }` | `usuarios:administrar` | ídem | `{ usuario, acceso }` | 404 si no existe; 403 nadie cambia sus propios campos ni se suspende o quita el rol a sí mismo; 409 si deja la operación sin gerente de activo | 5D |
| `POST /api/paradas/:evento/respuesta` | `{ evento, campoId, equipo, texto, parte?, modo? }` | `causa:declarar` o `causa:completar` | del evento del PLC | `{ respuesta }` con `canal: "pantalla"` | 403 si el cuerpo trae `canal: "whatsapp"`; 404 evento desconocido; 409 «Ya respondió…» (la primera gana); 422 campo distinto al del evento, parte que no es del equipo, bomba sin parte, modo que no es de la parte, texto libre < 8 | 5B, 5D |
| `POST /api/analisis/:evento` | `{ mecanismo, causaRaiz, nota? }` | `causa:completar` | del evento del PLC | `{ analisis }` | 404 evento desconocido; 422 sin respuesta declarada con parte, mecanismo fuera de ISO 14224 B.2 o causa fuera de B.3; un segundo POST es versión nueva | 5C, 5D |
| `POST /api/sap/avisos` | `{ tipo: "M1"\|"M2", campoId, equipo, prioridad, parte, modo, descripcion, inicioAveria, parada, evento, evidencia[] }` | `sap:aviso` | `campoId` del cuerpo | `{ aviso }` (el servidor pone `numero`, `creado`, `creadoPor`, `origen: "trim"`, `cerrado: false`) | 409 si el equipo ya tiene un aviso abierto; 422 `campo: "descripcion"` si tiene < 8 | 5D |
| `POST /api/informes` | la **consulta**, no las cifras: `{ formato, titulo, alcance, periodo, campos, desde, hasta, equipo? }` | `evidencia:exportar` | `campos` del cuerpo (todos de la persona) | `{ informe }` con `folio`, `fecha`, `por`, `version`, `estado`, `cifras`, `huella` | 422 sin campos, campo inexistente, `hasta` ≤ `desde`, ficha de un equipo de otro campo | 5D |
| `POST /api/asignacion-oficial` | `{ filas: [{ mes, campoId, pozo, bbl, horas? }], motivo }` | `asignacion:cargar` | `campoId` de cada fila | `{ filas, carga }` | todo o nada: 403 campo ajeno; 422 mes no cerrado, pozo vacío, `bbl` < 0, `horas` fuera de 0…días×24, sin filas, motivo < 5 | 5A |
| `POST /api/planta/cambios` | `{ campo, cambio: { tipo: "agregar-miembro"\|"quitar-miembro"\|"agregar-elemento"\|"quitar-elemento", … } }` | `conector:configurar` | `campo` del cuerpo | `{ planta, cambio }` | 404 campo sin esquema; 409/422 id repetido o elemento que no está | 5D |
| `POST /api/planes/:id` | `{ estado: "aceptado"\|"ejecutado", motivo }` | `planes:decidir` | del plan (`cicloValor` → `campoId`) | `{ decision }` (el servidor pone `por`, `porId`, `fecha`) | 404 si el id no es un plan del ciclo; 409 si ya está en ese estado o se ejecuta sin aceptar; 422 motivo < 5 | 11 |
| `GET /api/webhooks/whatsapp` | `hub.mode`, `hub.verify_token`, `hub.challenge` | token de verificación de Meta | — | `hub.challenge` | 403 si el token no coincide | 5D |
| `POST /api/webhooks/whatsapp` | lo que manda Meta | firma `X-Hub-Signature-256` (HMAC-SHA256 del cuerpo crudo con el *app secret*) | del evento del mensaje respondido (`context.id`) | **siempre 200** si queda aceptado o descartado | 401 sin firma válida; deduplica por `messages[].id`; persona = E.164 activa, con alertas y con el campo; la primera respuesta gana | 5D |

## 7.5 Endpoints que faltan

Están decididos pero no existen ni en el demo ni en el simulador (detalle en el capítulo 10):

| Ruta | Para qué |
|---|---|
| `GET /api/sesion` | Persona, rol, nivel, campos y capacidades del token (2.8). |
| `GET /api/informes/:folio/verificacion` | Que un tercero compruebe un informe por su folio y su huella. |
| `GET /api/paradas/:evento` | Una parada con `respuestas[]` y `analisis[]` históricos. |
| `POST /api/campos/:campo/tags/equipo` | Asociar tags por lotes, con resultado tag por tag. |
| `GET /api/reloj` (o `generadoEn`/`datosHasta` en cada respuesta) | El «ahora» de los datos. |
| `GET /api/vistas/diferidos/tramos?cursor=` | Paginar los tramos del libro. |
| (ajustes del variador de cada electrosumergible) | Ver 7.3. |
