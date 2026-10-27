# Cambios del contrato desde la versión 1

> **BORRADOR** (M3, 27-oct-2026). Todavía no lo aprobó el dueño (puerta de §10, punto 4b, del prompt de la experiencia v3).
>
> - **Línea base:** la versión 1, commit **`cde8214`** («TRIM Hidrocarburos: front para entregar al backend», 7-oct-2026). Es la que tomó el desarrollador del backend.
> - **Comparado contra:** `HEAD` = **`9378717`** (27-oct-2026). Son 15 commits que tocaron el contrato o la referencia.
> - **La regla:** «al lado, nunca encima». Lo que existe no se renombra, no se borra y no cambia de significado. Lo nuevo se agrega al lado. Lo que sale se marca RETIRADO.
> - **Qué se comparó, campo por campo:**
>   - `CONTRATO.md`;
>   - `src/shared/api/contrato.ts` (rutas y códecs) y los tipos del motor que viajan;
>   - `src/shared/api/escrituras.ts` (las reglas de cada escritura);
>   - `referencia/`: los 89 archivos que ya existían en v1, comparados clave por clave, tipo por tipo y texto por texto, también commit por commit;
>   - el SQL: el de v1 (`simulador-api/esquema.sql`, que no cambió) contra el nuevo (`docs/backend/sql/esquema.sql`).
> - **Cómo repetir la medición:** §7.

---

## 1. Para el desarrollador, en una tabla corta

**«¿Lo usa lo necesario?»** sale de [`docs/experiencia-v3/necesario-por-rol.md`](../experiencia-v3/necesario-por-rol.md) y [`borrado.md`](../experiencia-v3/borrado.md) (M1, 27-oct). Hay tres respuestas:
- **AGREGAR AHORA:** lo usa lo necesario de algún rol (lo que ve, tiene o hace).
- **PARA DESPUÉS:** lo usa solo un escalón de la escalera de algún rol.
- **YA NO CONSTRUIR:** no lo usa nadie. Incluye lo RETIRADO (WhatsApp) y lo que solo usaba una pantalla que sale: Turno, la pantalla Evidencia del rol cont, Identificar como pantalla, Diferidos, Bombas y Electrosumergibles como pantallas, y el resumen viejo del gerente.
  - Lo de v1 que cae aquí **no se borra del contrato** (§3.1): queda «no prioritario».
  - Si usted ya lo hizo, déjelo.

**Las cuentas, endpoint por endpoint** (el detalle de cada uno está en §1.1):

| | AGREGAR AHORA | PARA DESPUÉS | YA NO CONSTRUIR | Total |
|---|---|---|---|---|
| Las 50 de v1 (41 lecturas + 9 escrituras) | **35** (27 + 8) | **5** (5 + 0) | **10** (9 + 1): 1 RETIRADO y 9 «no prioritario» | 50 |
| Las 29 nuevas desde v1 (20 lecturas + 9 escrituras) | **23** (15 + 8) | **3** (2 + 1) | **3** (3 + 0) | 29 |
| **Las 79 del código** | **58** | **8** | **13** | **79** |
| Lo que falta en el motor (§9): las 7 piezas de M1, más 1 encontrada al cruzar | **9 endpoints nuevos** y 4 campos opcionales en lo que ya existe | — | — | 9 |

Hay además 2 rutas que solo están en `CONTRATO.md`: `GET` y `POST /api/webhooks/whatsapp`. Son **YA NO CONSTRUIR** (RETIRADO). Las de la cadena de datos y los insumos están al final de §1.1.

**Lo que usted tiene que hacer, en orden:**

| # | Qué | Tipo | Qué hacer | ¿lo usa lo necesario? |
|---|---|---|---|---|
| R | **WhatsApp completo:**<br>• `GET /api/mensajes`;<br>• `GET` y `POST /api/webhooks/whatsapp`;<br>• el envío por Meta y las 10 plantillas;<br>• el teléfono y las alertas de cada persona;<br>• el `canal` de la respuesta | **RETIRADO** (propuesto) | **No construirlo.** Si ya lo hizo, puede quitarlo cuando quiera. Mientras tanto, acepte e ignore `telefono` y `alertas` en `/api/usuarios`; no los rechace (§3). | **YA NO CONSTRUIR** |
| C2 | Dispositivo sin lectura en `/vistas/equipos/:campo/:equipo`: `valor: "—"` → `null` | **CAMBIADO**: rompe | Propuesta: el front acepta los dos; un backend nuevo manda `null` (§4.1) | **AGREGAR AHORA** (nivel 4 de conf) |
| C5 a C8 | Reglas de cálculo:<br>• el colchón de una parada vieja;<br>• el cierre parcial de una ESP;<br>• `fallo` en la ESP;<br>• la evidencia de la cascada | **CAMBIADO**: cálculo | Ajustar el motor del servidor (§4.2) | **AGREGAR AHORA**: orden de cierre de sup y oper; nivel 3 y 4; «Ver una por una» |
| C9 | «bomba de reinyección» → «bomba de agua» en la causa | **CAMBIADO**: texto | Cambiar la frase (§4.3) | **AGREGAR AHORA** |
| C12, C13, C16 | Errores de las escrituras de v1 (`400` primero, `403 rol-desconocido`, motivo ≤ 500) | **CAMBIADO**: HTTP | §4.4 | **AGREGAR AHORA** (las escrituras se usan) |
| C18 | Datos del demo regenerados (`e5a195f`) | **CAMBIADO**: datos | Recargar los insumos de `HEAD`; la referencia de v1 queda aparte (§4.5) | — |
| C19, Q1 a Q5 | SQL: las 9 tablas de la cadena, reestructuradas en el esquema nuevo | **CAMBIADO / QUITADO** | Si usted construyó `simulador-api/esquema.sql`, sigue valiendo (§4.6) | **AGREGAR AHORA** (adm: tags sin equipo) |
| C1, C10, C11 | `Riesgo.costoFalla` cambió de significado, y sus textos `motivo` y `mdtFuente` | **CAMBIADO**: rompe y texto | Propuesta: `costoFalla` vuelve a v1 y lo nuevo va al lado como `costoFallaHoy` (§4.1) | **YA NO CONSTRUIR**:<br>• lo necesario no pinta `costoFalla` ni esos textos;<br>• «Si falla hoy» llega por `/vistas/lista-equipos`;<br>• `/vistas/riesgo` solo lo usa la ficha ejecutiva del gerente, que no muestra esa cifra.<br>**Por eso C1 deja de ser urgente**: con devolverle su significado de v1 basta. |
| C3, C4, C14, C15, C17 | Compatibles: `null` en `SerieTag.valor` y `EventoServicio.fin`, `campos` sin repetir, parámetros de las vistas y referencia más estricta | **CAMBIADO**: compatible | Nada obligatorio (§4.7) | **AGREGAR AHORA** (C3 y C4 son insumos y señales del nivel 3) |
| E1 a E29 | 29 endpoints nuevos | **AGREGADO** | 23 ahora, 3 después y 3 no (§1.1, §5) | ver §1.1 |
| F1 a F17 | Campos, capacidades y códigos nuevos | **AGREGADO** | §5.3 | ver §5.3 |
| M1 a M8 | **Lo que falta en el motor** (pérdidas, cierre de la orden, respuesta de la ANH, conversión del árbol, 5 tramos, paradas por confirmar, fallas por mes y estado de la configuración) | **AGREGADO** (propuesto) | Construir cuando el motor lo calcule; mientras tanto, la pantalla dice «sin registro» (§9) | **AGREGAR AHORA** |

### 1.1 Cada endpoint, uno por uno

En «Quién», el rol y lo que hace con él. Sale de `necesario-por-rol.md` («VE», «TIENE», «HACE» y escalón) y de qué pantalla lo pide hoy en el código (`use…` de `src/pages` y `src/widgets`).

**Las 41 lecturas de v1**

| Endpoint | ¿lo usa lo necesario? | Quién |
|---|---|---|
| `GET /vistas/diferidos` | **AGREGAR AHORA** | reg (¿se puede publicar?, Regulatorio); ger y prod (Resultados, informe del mes) |
| `GET /vistas/diferidos/mensual` | **YA NO CONSTRUIR** (no prioritario) | Solo Producción y Diferidos (A-09). El mes a mes del gerente llega dentro de `/vistas/planta-viva`. |
| `GET /vistas/diferidos/base` | **AGREGAR AHORA** | Resultados de ger, prod y jefe |
| `GET /vistas/produccion/diaria` | **AGREGAR AHORA** | Resultados: producción por día contra la meta (ger) |
| `GET /vistas/potencial-reciente` | **AGREGAR AHORA** | ger firma las metas (Configuración) |
| `GET /vistas/paradas/por-identificar` | **AGREGAR AHORA** | La ficha ejecutiva del gerente (`FichaEjecutiva`) y la orden en la ficha |
| `GET /vistas/paradas/:evento/opciones` | **YA NO CONSTRUIR** (no prioritario) | Solo Identificar (B-06). Las opciones de «Contestar» llegan dentro de `/vistas/hoy`. |
| `GET /vistas/bombas/prediccion` | **PARA DESPUÉS** | prod, escalón 2 (el tren de agua). El orden de cierre de sup y oper llega por `/vistas/campos/:campo/agua`. |
| `GET /vistas/bombas/paradas` | **YA NO CONSTRUIR** (no prioritario) | Ninguna pantalla la pide |
| `GET /vistas/bombas/paradas-en-periodo` | **YA NO CONSTRUIR** (no prioritario) | Solo la pantalla Evidencia del rol cont, que sale (A-21) |
| `GET /vistas/riesgo` | **AGREGAR AHORA** | La ficha ejecutiva del gerente («qué se está haciendo»). Ver C1. |
| `GET /vistas/estado` | **AGREGAR AHORA** | La marca del campo en la cabecera, todos los roles (C-01) |
| `GET /vistas/pozos` | **PARA DESPUÉS** | prod, escalón 3 (los pozos en tabla) |
| `GET /vistas/pozos/:campo/:pozo` | **PARA DESPUÉS** | prod, escalón 3 |
| `GET /vistas/electrosumergibles` | **PARA DESPUÉS** | prod, escalón 3 (`pedirFlotaEsp`) |
| `GET /vistas/asignacion` | **AGREGAR AHORA** | prod: cargar y cotejar la asignación oficial |
| `GET /vistas/predicciones` | **YA NO CONSTRUIR** (no prioritario) | El «3 de 3» de conf llega en `/vistas/lista-equipos` (`vigia`) |
| `GET /vistas/relojes` | **AGREGAR AHORA** | jefe: los días de espera (apoyo 3). Lleva los 5 tramos (M5). |
| `GET /vistas/campos/:campo/ahora` | **AGREGAR AHORA** | adm: el paso de los tanques (Configuración) |
| `GET /vistas/equipos/:campo/:equipo` | **AGREGAR AHORA** | conf: el diagnóstico (nivel 4) |
| `GET /vistas/equipos-hoy` | **AGREGAR AHORA** | reg (Regulatorio) |
| `GET /vistas/equipos/:campo/:equipo/historia` | **PARA DESPUÉS** | conf, escalón 2 (la historia del PLC) |
| `GET /vistas/equipos/:campo/:equipo/ficha` | **AGREGAR AHORA** | ger: la ficha ejecutiva |
| `GET /vistas/equipos` | **YA NO CONSTRUIR** (no prioritario) | Ninguna pantalla la pide; la reemplaza `/vistas/lista-equipos` |
| `GET /vistas/confiabilidad` | **AGREGAR AHORA** | conf (tiempo entre fallas, los más costosos) y jefe |
| `GET /vistas/bombas` | **AGREGAR AHORA** | El nivel 3 y el 4 (`Nivel3`, `Nivel4`): oper, conf y tec |
| `GET /mensajes` | **YA NO CONSTRUIR** (RETIRADO) | WhatsApp (§3) |
| `GET /sap/avisos` | **AGREGAR AHORA** | jefe: ver o crear el aviso del que avisa |
| `GET /sap/ordenes` | **AGREGAR AHORA** | jefe (la orden abierta) y tec (su orden) |
| `GET /sap/equipos` | **YA NO CONSTRUIR** (no prioritario) | Solo la integración de Conectores. Lo necesario de adm no la nombra. |
| `GET /sap/equipos/:equipo` | **AGREGAR AHORA** | jefe: la orden y el equipo SAP en la ficha (`BloqueSap`) |
| `GET /campos` | **AGREGAR AHORA** | Arranque, todos |
| `GET /catalogo` | **AGREGAR AHORA** | Arranque; la medición oficial de prod y reg |
| `GET /configuracion/historial` | **AGREGAR AHORA** | ger y adm firman sobre la versión vigente |
| `GET /paradas/respuestas` | **AGREGAR AHORA** | Arranque: lo declarado entra al libro |
| `GET /usuarios` | **AGREGAR AHORA** | ger da accesos; la persona de la sesión |
| `GET /usuarios/historial` | **AGREGAR AHORA** | ger: el rastro de los accesos (D1) |
| `GET /informes` | **AGREGAR AHORA** | ger y reg: el informe y el reporte con folio |
| `GET /asignacion-oficial` | **AGREGAR AHORA** | prod |
| `GET /analisis` | **AGREGAR AHORA** | jefe y conf completan el análisis |
| `GET /planta/cambios` | **YA NO CONSTRUIR** (no prioritario) | Solo la pantalla Planta de adm (B-04) |

**Las 9 escrituras de v1**

| Endpoint | ¿lo usa lo necesario? | Quién |
|---|---|---|
| `POST /configuracion` | **AGREGAR AHORA** | ger (metas) y adm (firmar la versión) |
| `POST /usuarios` | **AGREGAR AHORA** | ger (dar accesos) |
| `PATCH /usuarios/:id` | **AGREGAR AHORA** | ger |
| `POST /paradas/:evento/respuesta` | **AGREGAR AHORA** | oper y tec (contestar); sup (responder él) |
| `POST /analisis/:evento` | **AGREGAR AHORA** | jefe y conf |
| `POST /sap/avisos` | **AGREGAR AHORA** | jefe (crear la orden del que avisa); sup, escalón 2 |
| `POST /informes` | **AGREGAR AHORA** | ger (compartir el informe) y reg (exportar el reporte) |
| `POST /asignacion-oficial` | **AGREGAR AHORA** | prod |
| `POST /planta/cambios` | **YA NO CONSTRUIR** (no prioritario) | Solo la pantalla Planta de adm |

**Las 20 lecturas nuevas**

| Endpoint | ¿lo usa lo necesario? | Quién |
|---|---|---|
| E1 `GET /vistas/ciclo` | **PARA DESPUÉS** | ger, escalón 2; sup, escalón 3; jefe, escalón 2 (los planes, simulados) |
| E2 `GET /vistas/campos/:campo/tuberia` | **AGREGAR AHORA** | prod: la tubería del campo, una vez |
| E3 `GET /vistas/campos/:campo/choke/serie` | **PARA DESPUÉS** | prod, escalón 1 (qué limitó día por día) |
| E4 `GET /vistas/campos/:campo/agua` | **AGREGAR AHORA** | sup y oper: el orden de cierre en la alarma; prod, escalón 2 |
| E5 `GET /vistas/campos/:campo/capacidades` | **AGREGAR AHORA** | adm: los pasos de capacidades y del factor |
| E6 `GET /vistas/criticidad` | **YA NO CONSTRUIR** como endpoint propio | «Si falla hoy» llega en `/vistas/lista-equipos` (`primero`, `noIntervenir`) y `/vistas/planta-viva` (`siFallaHoy`). **Su cálculo sí hay que hacerlo.** |
| E7 `GET /vistas/choke/reparto` | **AGREGAR AHORA** | adm: el paso de capacidades revisa los días en que el real pasó la capacidad (`superado`); prod, escalón 1 |
| E8 `GET /vistas/choke/mensual` | **YA NO CONSTRUIR** | Solo Diferidos y el mes a mes viejo (A-09) |
| E9 `GET /vistas/choke/base` | **YA NO CONSTRUIR** | Solo «Dónde se trabó» del resumen viejo |
| E10 `GET /vistas/choke/arbol` | **AGREGAR AHORA** | reg: el árbol de 6 pasos como la circular (`ArbolCircular`) |
| E11 `GET /vistas/topologia` | **AGREGAR AHORA** | adm: el paso «a qué pozos sirve cada equipo» |
| E12 `GET /vistas/topologia/propuestas` | **AGREGAR AHORA** | adm: confirmar los 36, no escribirlos |
| E13 `GET /vistas/anh/paradas` | **AGREGAR AHORA** | prod, sup y reg: la cadena de cada parada («Ver una por una») |
| E14 `GET /vistas/anh/calidad` | **AGREGAR AHORA** | conf: «clasificación confirmada 0 de 7» |
| E15 `GET /vistas/anh/reporte` | **AGREGAR AHORA** | reg: su número principal. **Falta su caso en la referencia.** |
| E16 `GET /vistas/planta-viva` | **AGREGAR AHORA** | ger (número principal) y prod (`tecnica`) |
| E17 `GET /vistas/hoy` | **AGREGAR AHORA** | sup, oper, tec y jefe (sin `whatsapp`: R6) |
| E18 `GET /vistas/resultados` | **AGREGAR AHORA** | ger (cierre proyectado, diferido del mes) y prod (¿cuadra?) |
| E19 `GET /vistas/lista-equipos` | **AGREGAR AHORA** | jefe (avisan, no intervenir) y conf (el primero, vigía, sin instrumento) |
| E20 `GET /vistas/equipos/:campo/:equipo/tecnico` | **AGREGAR AHORA** | El nivel 3: oper, conf y tec |

**Las 9 escrituras nuevas**

| Endpoint | ¿lo usa lo necesario? | Quién |
|---|---|---|
| E21 `POST /planes/:id` | **PARA DESPUÉS** | sup, escalón 3; jefe, escalón 2 |
| E22 `POST /anh/paradas/:id/clasificacion` | **AGREGAR AHORA** | prod y conf corrigen dónde se trabó |
| E23 `POST /anh/paradas/:id/yacimiento` | **AGREGAR AHORA** | prod (y conf) |
| E24 `POST /anh/paradas/:id/respuesta` | **AGREGAR AHORA** | oper y sup (`responderPreguntaAnh`) |
| E25 `POST /anh/paradas/:id/revision` | **AGREGAR AHORA** (a confirmar con M1) | Es el reemplazo de «2 Algo está mal» de WhatsApp ([`whatsapp.md`](../experiencia-v3/whatsapp.md), fila 9). `necesario-por-rol.md` no la nombra. |
| E26 `POST /anh/paradas/confirmar` | **AGREGAR AHORA** | sup y prod: confirmar en lote, su acción principal |
| E27 `POST /anh/paradas/deshacer` | **AGREGAR AHORA** | sup y prod (Deshacer en vez de confirmar dos veces) |
| E28 `POST /configuracion/vista-previa` | **AGREGAR AHORA** | adm: el impacto antes de firmar (`ImpactoPaso`) |
| E29 `POST /topologia/importar` | **AGREGAR AHORA** | adm: cargar la topología pegada de Excel (`CargaTopologia`) |

**Fuera de `contrato.ts`** (en `CONTRATO.md` y `simulador-api/`; no entran en las 79):

| Endpoint | ¿lo usa lo necesario? | Quién |
|---|---|---|
| `GET` y `POST /api/webhooks/whatsapp` | **YA NO CONSTRUIR** (RETIRADO) | §3 |
| `GET /api/campos/:campo/inventario`, `GET …/tags/pendientes` y `POST …/tags/:tag/equipo` | **AGREGAR AHORA** | adm: «tags sin equipo · con sugerencia» y «Aplicar las 3» |
| `POST /api/inscripcion` y `POST /api/ingesta/nacimiento` | **AGREGAR AHORA** | Sin ellos no entra ningún dato del campo |
| `GET /api/campos/:campo/tags/:tag/procedencia` | **PARA DESPUÉS** | La «cadena del dato» de cada señal. Lo necesario no la nombra. |
| `GET /api/informes/:folio` | **PARA DESPUÉS** | La auditoría de un informe; lo necesario no la nombra |
| `GET /api/salud` | **AGREGAR AHORA** | Monitoreo |
| Los 8 insumos del motor (`/api/campos/:campo/pozos`, `…/pozos/eventos`, `…/servicios/eventos`, `…/bombas/:equipo/paradas`, `…/produccion-diaria`, `…/tags/:tag/serie`, `…/tanques/:tanque/nivel` y `…/metrologia`) | **AGREGAR AHORA** | Son la entrada de todo número |

### Conteo desde v1

| | Rutas (endpoints) | Campos, códigos, reglas, textos y datos | SQL | Total |
|---|---|---|---|---|
| **AGREGADO** | 29: de 50 a 79 en el código (20 `GET` + 9 `POST`) | 15 | 2 (el esquema nuevo con 104 tablas y 11 vistas; columnas nuevas en `v_procedencia`) | **46** |
| **CAMBIADO** | 0 rutas | 18: **2 rompen la forma o el significado** (C1, C2), 3 son textos, 4 son reglas de cálculo, 3 son errores o permisos, 1 son datos del demo y 5 son compatibles | 1 (C19: 9 tablas reestructuradas) | **19** |
| **QUITADO** | **0**: ninguna ruta ni ningún campo de una respuesta | 0 | 5, solo en el SQL nuevo frente al de v1, todos con reemplazo (Q1 a Q5) | **5** |
| **RETIRADO** (propuesto) | 3 (`GET /api/mensajes`, `GET` y `POST /api/webhooks/whatsapp`) | 6 grupos de campos y reglas de WhatsApp | 5 tablas y 5 columnas del SQL nuevo | — |

**Sobre las rutas:** el código de v1 tiene 41 lecturas en `contrato.ts` y 9 escrituras en `escrituras.ts`; el de `HEAD`, 61 y 18. El conteo de 49 → 78 que se midió antes cuenta igual los 29 nuevos. Ninguna ruta se renombró ni se borró.

**Sobre los campos que «faltan» en la referencia:** 59 claves de v1 ya no aparecen en la referencia de `HEAD`, todas de `riesgo/` y `salud/`. Todas son de datos, no de forma: con el agua real ya no hay un riesgo «perdiendo» ni una parte «sin señal» en esos casos. Se comprobó commit por commit: solo `e5a195f` (los datos) las quita.

---

## 2. Lo que no cambió (y usted puede dar por firme)

- **Las 50 rutas de v1**, con sus parámetros y la forma de cada respuesta. Lo que se agregó a una respuesta es opcional.
- **Las 9 escrituras de v1**, con sus cuerpos:
  - `POST /configuracion`;
  - `POST /usuarios` y `PATCH /usuarios/:id`;
  - `POST /paradas/:evento/respuesta`;
  - `POST /analisis/:evento`;
  - `POST /sap/avisos`;
  - `POST /informes`;
  - `POST /asignacion-oficial`;
  - `POST /planta/cambios`.
  
  Cambiaron algunos rechazos (§4.4).
- **Las 9 capacidades de v1** y **los códigos de error de v1**. Ningún rol perdió una capacidad: cada rol tiene hoy las de v1 o más. El cambio de permisos es otro, C13.
- **`simulador-api/`**: `api.mjs`, `base.mjs`, `indice.mjs` y `esquema.sql` son idénticos a v1. Solo cambió `datos/nacimientos.json`, que son datos.
- **El reporte a la ANH:** no existía en v1 (`/vistas/anh/*` es nuevo). No hay nada de v1 que romper ahí.

---

## 3. RETIRADO: WhatsApp (propuesto el 27-oct-2026)

**Motivo:** el dueño decidió quitar el canal de WhatsApp. **El backend no lo construye.** Lo que tenía valor queda dentro de TRIM, en pantalla: [`docs/experiencia-v3/whatsapp.md`](../experiencia-v3/whatsapp.md).

**Cómo se retira:**
- Nada se borra de golpe.
- `CONTRATO.md` y `docs/backend/sql/` marcan cada pieza «RETIRADO (27-oct-2026): el dueño decidió quitar el canal de WhatsApp: el backend no lo construye», con su reemplazo.
- El front deja de usarlo.

| # | Qué | Estaba en v1 | Reemplazo dentro de TRIM | Qué hace el backend |
|---|---|---|---|---|
| R1 | `GET /api/mensajes?campos` → `Mensaje[]`: el registro de lo enviado, con las reglas parada, cierre, causa, recordatorio, escalamiento, parte y orden, y las 10 plantillas de Meta | sí | Las tarjetas e insignias de `/vistas/hoy` y la franja «No arrancar» | No construir. Si existe, puede responder `[]` o `404` mientras la quita. El front ya no la pide. |
| R2 | `GET /api/webhooks/whatsapp` (verificación de Meta) y `POST /api/webhooks/whatsapp` (respuestas firmadas con HMAC, deduplicación, persona por E.164, «0» con texto, `context.id`) | sí | `POST /api/paradas/:evento/respuesta` (pantalla) | No construir |
| R3 | En `Usuario` y `CuerpoInvitacion`: `telefono` (E.164) y `alertas`. Las reglas 422 del teléfono (forma E.164, único entre no suspendidos, alertas solo con teléfono y solo en sup, oper, tec, conf y jefe). `ErrorAcceso.campo` = `whatsapp` \| `alertas`. `GET /api/usuarios` entrega `telefono` solo de quien recibe alertas. | sí | — (sin canal no hace falta el número) | **Aceptar e ignorar** `telefono` y `alertas` si llegan, sin un 422 por ellos. No volver a mandarlos. El número es un dato personal que deja de hacer falta. |
| R4 | `Respuesta.canal` (`'whatsapp' \| 'pantalla'`) y el `403` de `POST /paradas/:evento/respuesta` cuando el cuerpo trae `canal: "whatsapp"` | sí | Toda respuesta es de pantalla | Puede seguir poniendo `canal: "pantalla"` (el front no lo lee) u omitirlo. El 403 deja de importar. |
| R5 | «2 Algo está mal» por WhatsApp (`revisarDesdeWhatsapp`), con el motivo fijo «Por WhatsApp: …» | no (es de después de v1) | `POST /api/anh/paradas/:id/revision` (el botón «Algo está mal») | No construir |
| R6 | En `/vistas/hoy`:<br>• `VistaHoy.whatsapp` y `EntregaTurno.whatsapp`;<br>• los sufijos «; se escaló a las HH:MM», « · le llegó por WhatsApp a las …» y el rótulo «Ver el chat». | no (vista nueva) | Lo demás de Hoy; el rótulo pasa a «Ver la parada» | No construir esos campos ni esas frases |
| R7 | Pendientes del servidor:<br>• el webhook real y el envío por la Cloud API con las 10 plantillas (`CONTRATO.md` «Pendiente del lado del servidor»);<br>• las preguntas de campo de la ANH por WhatsApp (**B-33**);<br>• S10 (disparar cada mensaje con tareas) y S20 (el estado de WhatsApp en Conectores) de `10-pendientes.md`. | en parte | — | Sacarlos de la lista |
| R8 | **SQL nuevo** (`docs/backend/sql/esquema.sql`). Tablas: `plantilla_whatsapp`, `mensaje`, `mensaje_libre`, `estado_mensaje` y `respuesta_entrante`. Columnas: `usuario.telefono`, `usuario.alertas` (con `usuario_telefono_unico` y el trigger de alertas por rol), `rol.recibe_alertas`, `respuesta_parada.canal` y `respuesta_parada.entrante_meta_id`. | no (el SQL de v1 no tiene nada de WhatsApp) | — | No crear. Las líneas de `ejemplos.sql` que cargan esas tablas (347 líneas `insert into`) se marcan igual. |

**Lo que NO se retira, aunque viajaba en los mensajes:**
- las opciones sugeridas (`Opcion`, en `/vistas/paradas/:evento/opciones`);
- `CAUSAS_POZO`;
- la pregunta «¿qué se dañó?», que sigue en pantalla.

`Opcion.clave` («1», «2», «0») queda; la pantalla no la usa.

**La referencia:**
- `/api/mensajes` no tiene caso;
- los 8 casos de `referencia/hoy/` que traen `whatsapp`, «se escaló» o «Ver el chat», y los 2 de `referencia/ciclo/` con «(pantalla Identificar o WhatsApp)», se regeneran a propósito al construir.

---

## 4. CAMBIADO, en detalle, y cómo dejarlo «al lado»

### 4.1 Lo que rompe la forma o el significado

**C1 · `Riesgo.costoFalla` (`GET /api/vistas/riesgo`) cambió de significado.** Commit `cb8cd39`.

| | v1 (`cde8214`) | HEAD |
|---|---|---|
| Bomba (disposición, transporte o recobro) | `costoFalla = HistorialEquipo.bblPorFalla`: lo que el equipo **ya costó**, en promedio, por falla | Lo que **costaría si fallara hoy**: `Q × (1/n) Σ max(0, dᵢ − colchón) / 24`. En una bomba de recobro o con respaldo total, `0`. |
| Electrosumergible | `crudoAsignado × mdt / 24` | Lo mismo (sin cambio) |
| Ejemplo: P-201B de Morichal | **3.364,6** bbl | **2.086** bbl |
| `mdtFuente` | «el promedio de sus 8 fallas cerradas (el tanque absorbe una parte)» | «el promedio de sus 8 fallas cerradas, sin las 19 h que aguanta hoy el tanque» |

**Propuesta (al lado):**
- `GET /api/vistas/riesgo` vuelve a mandar `costoFalla` con el significado de v1.
- Se agrega **`costoFallaHoy`** (opcional) con el nuevo, junto a `colchonH` y `costoDe`, que ya son nuevos.
- El front lee `costoFallaHoy`.
- `/vistas/criticidad` (nueva) usa `costoFallaHoy` con la misma cifra.

**Alternativa:** `GET /api/v2/vistas/riesgo`, con el significado nuevo, al lado de la de v1.

En los dos casos hay que regenerar `referencia/riesgo/*` a propósito.

**C2 · El dispositivo sin lectura.** `EquipoVivo.dispositivos[].valor` en `/vistas/equipos/:campo/:equipo` y `/vistas/equipos-hoy`.
- **v1:** `valor: "—"`, `unidad: ""` y estado «sin señal» (`equipo-vivo.ts`).
- **HEAD:** `valor: null`. Un texto ahora se lee como una lectura discreta: un `"—"` saldría como el valor de un interruptor.

**Propuesta (al lado):** el front acepta `"—"` como sinónimo de `null`, lector tolerante en el códec. Un backend nuevo manda `null`. Las dos formas quedan válidas en `CONTRATO.md`.

### 4.2 Reglas de cálculo que cambiaron (cambian números de la referencia de v1)

Son correcciones del QA y de la revisión. Tener dos motores no tiene sentido, así que se registran con su antes y después. **Decisión del coordinador:** o se aceptan como «corrección» (el backend las adopta), o cada una lleva su versión de regla.

| # | Qué | v1 | HEAD | Commit |
|---|---|---|---|---|
| C5 | `ParadaMedida.colchon.previsto` (`/vistas/bombas/paradas`, `paradas-en-periodo` y `abierta` de `/vistas/bombas`) | «Con el nivel al parar». No decía con qué configuración; el demo usaba la vigente. | Con los que **regían cuando paró** (`configEn(historial, inicio)`). Firmar hoy otro respaldo no cambia una parada vieja. | `cb8cd39` |
| C6 | Orden de cierre (`Prediccion.orden`, crudo en riesgo y evitable por orden) | Cada pozo, entero | Entero si cabe; si no, en parte. Una electrosumergible baja a lo más 25 % (≈ 45 Hz, `BAJA_MAXIMA_ESP`) y lo que falta lo da el siguiente. | `e5a195f` |
| C7 | Salud de una electrosumergible: estado `fallo` | Solo por primera alarma o firma | También cuando la causa del evento abierto del pozo es su propia electrosumergible: un código del variador, o declarada con la parte. En `pozos-guacamayo` pasa de `detenida` a `fallo`, con `prioridad` de 0 a 1. | `cb8cd39` |
| C8 | Causa heredada por la cascada (`tramos[].causa`) | Hereda la causa de la bomba | Hereda tipo, parte, `como` y, sin parte, `porQueNo`. La `evidencia` va sin renglones repetidos y con el `porQueNo` de último. Con dos servicios caídos, gana el primero; en empate, el de id menor. | `cb8cd39` |

### 4.3 Textos del motor que la referencia exige (cambió el texto)

| # | Dónde | Texto viejo (v1) | Texto nuevo (HEAD) | Commit |
|---|---|---|---|---|
| C9 | `causa.texto` en `/vistas/diferidos` (tramos), `/vistas/riesgo` (`motivo`), `/vistas/bombas` y `/vistas/pozos` (`abierta`, `causa`) y `/vistas/equipos-hoy`. También en `desc_evid` de la ANH, que es nuevo. | «Se cerró porque la **bomba de reinyección** estaba parada y el tanque de agua lleno» · «Se le bajó la frecuencia: la **bomba de reinyección** no daba abasto» | «…la **bomba de agua** estaba parada…» · «…la **bomba de agua** no daba abasto» | `9378717` |
| C10 | `Riesgo.motivo` | «…llega a su alarma en **N h**» (siempre en horas: «124 h», «262 h») | «…llega a su alarma en **T**», con la regla de las pantallas:<br>• menos de 48 h, en horas enteras («43 h»);<br>• si no, en días con un decimal («5,2 d», «10,9 d»);<br>• más de 90 días, «más de 3 meses». | `cb8cd39` |
| C11 | `Riesgo.mdtFuente` | «el promedio de sus N fallas cerradas (el tanque absorbe una parte)» · «20 días fuera, el promedio de las electrosumergibles del campo (esta no ha fallado)» | «el promedio de sus N fallas cerradas, sin las H h que aguanta hoy el tanque» (H truncado, nunca redondeado hacia arriba) · «17,4 d fuera, el promedio de las electrosumergibles del campo (esta no ha fallado)» | `cb8cd39` |

**Qué hacer:** cambiar las frases del servidor. Al lado no aplica, porque la referencia compara el texto entero. Cada cambio futuro de texto va en esta tabla con el viejo y el nuevo (regla 3.1.4).

### 4.4 Errores y permisos en las escrituras de v1

| # | Qué | v1 | HEAD | Propuesta al lado |
|---|---|---|---|---|
| C12 | Cuerpo con un campo de otra forma (C-11) | `422 peticion-invalida`, revisado de **último** («forma (422)») | `400 peticion-invalida`, revisado **primero**, antes de cualquier regla | En las 9 escrituras de v1, **`400` o `422`** con `peticion-invalida` (el front decide por el código). `400` obligatorio solo en las escrituras nuevas de `/anh/paradas/…`, que tienen su caso en `referencia/escrituras/400-peticion-invalida.json`. Corregir también la fila 422 de la tabla «Error único» de `CONTRATO.md`, que todavía dice «La forma o una regla del dominio». |
| C13 | Rol que no es del producto (C-14) | Sin regla. El demo le prestaba al rol desconocido las capacidades de `prod`. | `403 rol-desconocido` en toda escritura. Hoy `plan` y `cont` (roles de v2) no escriben; en v1 podían `POST /informes` con `evidencia:exportar`. | Se queda: es seguridad. Cuando `plan` y `cont` vuelvan, vuelven con sus capacidades. |
| C16 | `POST /configuracion` | Motivo de 5 caracteres o más | Además, a lo sumo 500 caracteres (C-12) → 422. Cambia el texto del rechazo cuando lo firmado es técnico («Falta el motivo: diga por qué cambia la configuración técnica…»). Las reglas 9 a 11 (topología y capacidades) solo aplican si llegan esos campos nuevos. | Se queda |

### 4.5 Los datos del demo (C18)

`e5a195f` («Demo con el agua de los campos colombianos, 92–97 %») regeneró los insumos: pozos, eventos, servicios, catálogo, configuración, nacimientos y SAP. Por eso cambió **cada número y cada id** de los casos de v1:
- 1.212 ids de eventos;
- los respaldos: Morichal P-201B pasa de 15.100 a 42.500 bbl/d libres;
- el tanque de La Ceiba pasa de 10.000 a 30.000 bbl;
- la cuenca de La Ceiba pasa de Magdalena Medio a Llanos;
- las capacidades de placa;
- los límites de cada tag.

**No es un cambio del contrato, pero rompe la comparación.**

**Propuesta (al lado):** guardar la referencia de v1 tal cual, al lado de la de hoy, en `docs/backend/linea-base/v1/referencia/` (sale de `git show cde8214:referencia/…`). Así se puede comparar un backend contra v1 y contra `HEAD`:

```bash
node scripts/referencia.mjs comparar --base-url=… --referencia=docs/backend/linea-base/v1/referencia
```

La opción `--referencia` todavía no existe.

### 4.6 SQL: dos esquemas para la cadena de datos (C19, Q1 a Q5)

**En v1**, el SQL entregado es `simulador-api/esquema.sql` (SQLite; en producción, PostgreSQL). Solo cubre la cadena de datos:
- 10 tablas: `campo`, `gateway`, `fuente`, `equipo`, `tag`, `formula`, `calibracion`, `historial_tag`, `rechazo` y `semilla`;
- la vista `v_procedencia`.

Ese archivo **no cambió**.

**Después de v1** se escribió `docs/backend/sql/esquema.sql` (PostgreSQL 16): 104 tablas y 11 vistas. Ahí 9 de esas tablas tienen otra forma:

| # | Tabla y columna | v1 (`simulador-api/esquema.sql`) | Nuevo (`docs/backend/sql/esquema.sql`) |
|---|---|---|---|
| C19 | `fuente.id`, `tag.id` | `text` (`campo:tag`) | `bigint generated always as identity` |
| C19 | `calibracion.tag_id`, `historial_tag.tag_id` | `text` | `bigint` |
| C19 | Fechas (`gateway.primer_visto` y `ultimo_visto`, `historial_tag.reemplazado`, `rechazo.cuando`, `calibracion.vigente_hasta`) | `text` | `timestamptz` y `date` |
| C19 | `formula.activa` | `integer` (1) | `boolean` |
| C19 | Columnas nuevas `not null` sin valor por defecto | — | `campo.cuenca`, `campo.choke`, `fuente.campo_id`, `equipo.sistema`, `equipo.clase_iso` y `tag.dispositivo_id`. Además, nuevas que admiten nulo: `gateway.certificado_huella`, `equipo.servicio`, `equipo.modo_falla`… |
| Q1 | `fuente.reloj` | columna | sale de `fuente` y pasa a la tabla nueva `dispositivo.reloj` (el simulador junta conector y dispositivo en una fila) |
| Q2 | `equipo.id` (`campo:codigo`) | clave primaria | sale; la clave es `(campo_id, codigo)` |
| Q3 | `tag.fuente_id` | columna | sale; ahora es `tag.dispositivo_id` |
| Q4 | `tag.equipo_id` | columna | sale; ahora es `tag.equipo_codigo` |
| Q5 | tabla `semilla` | existe | no está (es del simulador) |

`v_procedencia` conserva todas sus columnas de v1 y agrega `dispositivo`, `alarma_alta`, `alarma_baja` y `alarma_fuente`. Solo `tag_id` pasa de texto a número.

**La contradicción que hay hoy:** `CONTRATO.md` (línea 33) sigue diciendo que el SQL es `simulador-api/esquema.sql`, y `docs/backend/README.md` dice que es `sql/esquema.sql`.

**Propuesta (al lado):**
1. `CONTRATO.md` dice las dos cosas:
   - el esquema de la cadena de **v1 sigue valiendo** (lo que manda es la forma JSON de `/api/campos/:campo/tags/:tag/procedencia` y `/inventario`, que no cambió);
   - `docs/backend/sql/esquema.sql` es la **versión 2** del modelo, opcional para esas 9 tablas y necesaria para todo lo demás.
2. `docs/backend/sql/` agrega un `v1-cadena.sql` con vistas de compatibilidad (`v1_equipo`, `v1_tag` y `v1_fuente`) que devuelven las columnas de v1 desde el modelo nuevo. Así lo que el desarrollador ya escribió contra v1 lee igual.

### 4.7 Compatibles (lo que usted ya manda sigue valiendo)

| # | Qué | Cambio |
|---|---|---|
| C3 | `Dispositivo.valor` de la serie de un tag: `number \| string` → `number \| string \| null` | `null` = sin señal; no se descarta |
| C4 | `EventoServicio.fin` (`GET /api/campos/:campo/servicios/eventos`): `string` → `string \| null` | `null` = el servicio sigue caído; la cascada va hasta ahora |
| C14 | `campos=a,b` (C-10) | Sin repetidos: el servidor responde `400 peticion-invalida` o cuenta cada campo una vez, y el front ya no los repite |
| C15 | Parámetros de una vista que no sirven (C-16) | Se precisan:<br>• campo ajeno → `403 sin-permiso`;<br>• campo inexistente → `404 campo-desconocido`;<br>• `desde ≥ hasta` o una fecha sin zona → `400 peticion-invalida`.<br>Los códigos ya existían en v1. |
| C17 | La regla de comparación de la referencia | v1: «la respuesta contiene lo esperado». HEAD agrega:<br>• `null` exige `null`;<br>• los registros cerrados traen sus claves;<br>• fechas con zona;<br>• las claves de `AUSENTES` (`colchonH`, `revision`, `siParaOtra`, `hz`, `techo`, `retiros`) **no** pueden venir cuando no aplican.<br>Un backend que mande `techo: false` falla: hay que omitirla. |

**Aclaración sin cambio de forma:** `/vistas/paradas/por-identificar` ahora dice cómo se cuenta «por identificar» (`cuentaPorIdentificar`). La respuesta es la misma.

---

## 5. AGREGADO, con su ejemplo

Todo es opcional para un backend de v1: una pantalla que no lo recibe dice «sin dato». **Qué se construye primero lo decide lo necesario de cada rol:** es la última columna, la misma de §1.1.

**Ejemplos:**
- Las respuestas de las vistas salen de `referencia/` y van recortadas: `{ a, b, … }` resume un objeto, y «… N más» indica cuántas filas más trae la lista.
- La forma exacta de cada campo está en `CONTRATO.md` (línea de cada endpoint y Anexo A).

### 5.1 Vistas nuevas (`GET`)

| # | Ruta | Para qué | Casos en `referencia/` | Commit | ¿lo usa lo necesario? |
|---|---|---|---|---|---|
| E1 | `/vistas/ciclo?campos&desde&hasta` | Ciclo antes · durante · después, con los planes simulados | 6 (`ciclo/`) | `45a7b49` | **PARA DESPUÉS** |
| E2 | `/vistas/campos/:campo/tuberia?desde&hasta` | La tubería del campo: qué limita y lo perdido por tramo | 11 (`choke/tuberia-*`) | `f4dd5bb` | **AGREGAR AHORA** |
| E3 | `/vistas/campos/:campo/choke/serie?desde&hasta` | Qué limitó cada día y «Cambió lo que limita» | 10 | `f4dd5bb` | **PARA DESPUÉS** |
| E4 | `/vistas/campos/:campo/agua` | La tubería del agua y el colchón | 5 (`agua-choke/`) | `f4dd5bb` | **AGREGAR AHORA** |
| E5 | `/vistas/campos/:campo/capacidades` | Capacidades firmadas y factor de medición propuesto | 8 | `9b6a659`, `8a7c89f` | **AGREGAR AHORA** |
| E6 | `/vistas/criticidad?campos` | «Si falla hoy» | 6 | `f4dd5bb` | **YA NO CONSTRUIR (endpoint)** |
| E7 | `/vistas/choke/reparto?campos&desde&hasta` | Brecha por tramo y por escalón, y la eficiencia de producción (PE) | 15 | `f4dd5bb` | **AGREGAR AHORA** |
| E8 | `/vistas/choke/mensual?campos` | Lo perdido por tramo, mes a mes | 7 | `f4dd5bb` | **YA NO CONSTRUIR** |
| E9 | `/vistas/choke/base?campos&desde&hasta` | Línea base por tramo | 7 | `f4dd5bb` | **YA NO CONSTRUIR** |
| E10 | `/vistas/choke/arbol?campos&desde&hasta&orden` | Árbol de pérdidas: `gestion`, `circular` o `responsable` | 31 | `d028202` | **AGREGAR AHORA** |
| E11 | `/vistas/topologia?campo` | La topología que rige | 5 | `f4dd5bb` | **AGREGAR AHORA** |
| E12 | `/vistas/topologia/propuestas?campo` | Lo que TRIM propone de la topología | 5 | `f4dd5bb` | **AGREGAR AHORA** |
| E13 | `/vistas/anh/paradas?campos&desde&hasta` | Filas de la ANH (pozo × día × causa) con su clasificación | 18 | `f4dd5bb` | **AGREGAR AHORA** |
| E14 | `/vistas/anh/calidad?campos&desde&hasta` | % confirmado y % corregido por paso | 7 | `f4dd5bb` | **AGREGAR AHORA** |
| E15 | `/vistas/anh/reporte?campos&desde&hasta` | ¿Se puede publicar?, paradas sin causa y quién las debe | **0: falta su caso** | `ed559e4` | **AGREGAR AHORA** |
| E16 | `/vistas/planta-viva?campos&desde&hasta&momento` | La planta viva por momento | 9 | `1b14930` | **AGREGAR AHORA** |
| E17 | `/vistas/hoy?rol&campos` | Las tareas de Hoy por rol. Sin `whatsapp` (R6). | 18 | `1b14930` | **AGREGAR AHORA** |
| E18 | `/vistas/resultados?campos&desde&hasta&rol` | Resultados por rol | 15 | `5aaa7f2` | **AGREGAR AHORA** |
| E19 | `/vistas/lista-equipos?campos` | La lista de Equipos con sus filtros | 3 | `5aaa7f2` | **AGREGAR AHORA** |
| E20 | `/vistas/equipos/:campo/:equipo/tecnico` | El nivel 3 de un equipo (`null` si el campo no lo tiene) | 6 | `5aaa7f2` | **AGREGAR AHORA** |

**Ejemplos de petición y respuesta** (recortados de `referencia/`):

```text
E1  GET /api/vistas/ciclo?campos=ceiba&desde=2026-09-01T00:00:00.000-05:00&hasta=2026-10-01T00:00:00.000-05:00
    {"campos":["ceiba"],"desde":"2026-09-01T00:00:00.000-05:00","hasta":"2026-10-01T00:00:00.000-05:00",
     "antes":{"bbl":0,"equipos":0,"planes":[]},
     "durante":{"bbl":2102.19,"equipos":1,"planes":[{ id, fase, campoId, equipo, titulo, accion, … }, "… 2 más"],"valorUsd":100905.25,"bblDia":1665.18},
     "despues":{"bbl":5897.06,"equipos":2,"planes":[…]},"retornoBbl":7999.25,"valorUsd":383964.02}

E2  GET /api/vistas/campos/ceiba/tuberia?desde=2026-09-01T00:00:00.000-05:00&hasta=2026-10-01T00:00:00.000-05:00
    {"campoId":"ceiba","desde":"…","hasta":"…","tramos":[{ tramo, nombre, explica, holguraBpd, limita, casiIgual, … }, "… 3 más"],
     "limita":"pozos","casiIguales":null,"umbral":0.03,"empate":false,"pasaHoyBpd":9394.2, …15 claves más}

E3  GET /api/vistas/campos/ceiba/choke/serie?desde=…&hasta=…
    {"dias":[{ dia, horas, real, potencial, potencialPruebas, potencialSistema, … }, "… 29 más"],"cambios":[],"vueltas":{"ceiba":0}}

E4  GET /api/vistas/campos/ceiba/agua
    {"campoId":"ceiba","t":1790967600000,"aguaBpd":224075,"crudoBpd":11857,"crudoPorAgua":0.05,"campoDeGas":false,
     "tramos":[{ tramo, nombre, potencialBpd, crudoBpd, holguraBpd, fuente, … }, "… 4 más"],"tratamientoBpd":null,"admisionInyectoresBpd":267750, …}

E5  GET /api/vistas/campos/ceiba/capacidades
    {"campoId":"ceiba","vigentes":{"firmadas":false,"crudo":{ tramo, valor, unidad, estado, fuente },"bombas":[…],"gas":{ …, medido }, …},
     "factorMedicionPropuesto":{"campoId":"ceiba","desde":"2026-07-04T00:00:00.000-05:00","hasta":"2026-10-02T00:00:00.000-05:00","valor":0.97,"dias":42,
       "texto":"La mediana de lo que midió el punto oficial ÷ lo que dan …","resumen":"TRIM propone 0,966, medido en 42 días sin paradas."},
     "entrada":{"maximoCrudo":{ bpd, dia },"pozosBpd":11857,"aguaPozosBpd":224075,"conGas":true, …},"hallazgos":[{ tramo, bloquea, texto }]}

E6  GET /api/vistas/criticidad?campos=ceiba
    {"ranking":[{ campoId, equipo, tramo, alcance, servidos, puesto, … }, "… 23 más"],
     "campos":[{ campoId, parados, sinCalcular, avisosTrabajo, cambioHoy, proximoInstrumento, … }]}

E7  GET /api/vistas/choke/reparto?campos=ceiba&desde=…&hasta=…
    {"potencial":346378.06,"real":338662,"brecha":7716.06,"diferido":7716.06,
     "porChoke":{"reservorio":0,"pozo":6675.51,"planta":1040.55,"exportacion":0,"sin-asignar":0},
     "porEscalon":{"desarrollo":0,"desempeno":0,"disponibilidad-planeada":0,"disponibilidad-no-planeada":7716.06,"capacidad":0,"sin-clasificar":0},
     "sinExplicar":0,"cuadra":true, …23 claves más}

E8  GET /api/vistas/choke/mensual?campos=ceiba
    [{"mes":"2025-10","desde":"…","hasta":"…","parcial":false,"porTramo":{ reservorio, pozo, planta, exportacion, sin-asignar },
      "noPlaneado":{ … },"diferido":16852.14}, "… 12 más"]

E9  GET /api/vistas/choke/base?campos=ceiba&desde=…&hasta=…
    {"base":{"desde":"2026-06-01T00:00:00.000-05:00","hasta":"2026-09-01T00:00:00.000-05:00","nombre":"jun a ago"},
     "periodo":{ desde, hasta },"noPlaneado":{ "pozo":{ baseDia, periodoDia, cambio }, … },"diferido":{ … },"texto":"En La Ceiba bajó lo que se trabó en la planta y subió lo …"}

E10 GET /api/vistas/choke/arbol?campos=ceiba&desde=…&hasta=…&orden=gestion
    {"orden":"gestion","niveles":["tramo", "… 5 más"],"desde":"…","hasta":"…","campos":["ceiba"],"version":"C024-2026","regla":"choke.arbol@1",
     "raiz":{"dimension":"raiz","valor":"total","texto":"Lo diferido del período","bbl":7716.06,"filas":28,"eventos":18,
             "confirmadoBbl":0,"noPlaneadaBbl":7716.06,"hijos":[{ dimension, valor, texto, cadena, bbl, filas, … }, "… 1 más"]}}

E11 GET /api/vistas/topologia?campo=ceiba
    {"campoId":"ceiba","firmada":false,"elementos":[{ campoId, elemento, nombre, clase, alcance, pozos, … }, "… 35 más"],"porSaber":[],"sinResponder":[]}

E12 GET /api/vistas/topologia/propuestas?campo=ceiba
    [{"elemento":"SE-2","pozos":["LC-01","… 17 más"],"fuente":"alimentador",
      "porque":"Los 18 pozos cuelgan de SE-2: ¿SE-2 sirve a todo el campo?","evidencia":["Alimentador de LC-01, LC-02, …"]}, "… 7 más"]

E13 GET /api/vistas/anh/paradas?campos=ceiba&desde=…&hasta=…
    [{"id":"EP-LC04-260906-85@2026-09-06#1","eventoId":"EP-LC04-260906-85","raiz":"EP-LC04-260906-85","pozo":"LC-04","campoId":"ceiba",
      "diaOperacional":"2026-09-06","inicio":"2026-09-06T17:14:00-05:00","inicioEvento":"…","fin":"2026-09-06T21:07:00-05:00", …16 claves más}, "… 27 más"]

E14 GET /api/vistas/anh/calidad?campos=ceiba&desde=…&hasta=…
    {"paradas":28,"porPaso":[{ paso, paradas, propuestas, avaladas, corregidas, declaradas, … }, "… 5 más"],
     "porRegla":[{ paso, regla, propuestas, corregidas, pctCorregido, cambiadoA }, "… 18 más"],"chokePorEquipo":[…],"sinTopologia":[]}

E15 GET /api/vistas/anh/reporte?campos=ceiba&desde=…&hasta=…
    (sin caso en referencia/; la forma es VistaReporteAnh de src/entities/regulatorio.ts y CONTRATO.md «F2 · Regulatorio».
     Falta agregar su caso antes de pedírsela al backend.)

E16 GET /api/vistas/planta-viva?campos=ceiba&desde=…&hasta=…&momento=antes
    {"campos":["ceiba"],"alcance":"campo","momento":"antes","desde":"…","hasta":"…","ahora":"2026-10-02T14:00:00.000-05:00","periodo":"septiembre",
     "cifras":{"antes":{ momento, previo, unidad, valor, entero, frase, … },"durante":{…},"despues":{…}},
     "planta":{"campoId":"ceiba","nombre":"La Ceiba","tramos":[…],"pasaBpd":9394.2,"escalaBpd":14000, …}, …}

E17 GET /api/vistas/hoy?campos=ceiba&rol=sup
    {"rol":"sup","campos":["ceiba"],"inicio":{"cifra":"1.966","unidad":"barriles por día","remate":"se dejan de producir en La Ceiba.", …},
     "bloqueos":[{ campoId, equipos, texto, sub }],"tareas":[{ id, tipo, campoId, capacidad, pide, grupo, … }, "… 4 más"],
     "insignia":4,"hechas":[],"entregarTurno":true,"campo":{…},"turno":{…},"entrega":{…}}
    (hoy también trae "whatsapp":{…} y "entrega.whatsapp": RETIRADOS, ver R6)

E18 GET /api/vistas/resultados?campos=ceiba&desde=…&hasta=…&rol=ger
    {"rol":"ger","campos":["ceiba"],"alcance":"campo","desde":"…","hasta":"…","ahora":"…","periodo":"septiembre","enCurso":false,
     "secciones":["produccion","… 8 más"], …11 claves más}

E19 GET /api/vistas/lista-equipos?campos=ceiba
    {"filas":[{ campoId, campoNombre, equipo, nombre, tipo, tipos, … }, "… 27 más"],
     "cuentas":{"estado":{ parados, avisan, sin-instrumento, todos },"tipo":{…},"tren":{…}},
     "cambioHoy":["Cambió hoy: P-201A y P-201C subieron al puesto 1 porque P…"],"sinRegistro":[…],
     "vigia":{"aciertos":3,"juzgadas":3,"falsas":0,"intervenidas":1,"seguimiento":0,"desde":"2026-09-01T05:00:00.000Z","frase":"…"},"primero":{…}, …}

E20 GET /api/vistas/equipos/ceiba/P-201B/tecnico
    {"campoId":"ceiba","campoNombre":"La Ceiba","equipo":"P-201B","subtitulo":"bomba multietapa de transferencia de agua · …",
     "familia":"bomba de agua","tipo":"bomba","tren":"agua","vecinos":{"anterior":"P-201A","siguiente":"P-201C"},"registrado":true, …17 claves más}
```

### 5.2 Escrituras nuevas (`POST`)

| # | Ruta | Capacidad | Responde | Rechazos | Commit | ¿lo usa lo necesario? |
|---|---|---|---|---|---|---|
| E21 | `/planes/:id` | `planes:decidir` | `{ decision }` | 404, 409 y 422 | `45a7b49` | **PARA DESPUÉS** |
| E22 | `/anh/paradas/:id/clasificacion` | `anh:clasificar` | `{ parada, guardadas }` | 403 `paso-ajeno`; 404; 409 `cadena-cambio`, `cascada-cambio` y `cambia-a-otra-persona`; 422 `clasificacion-incoherente`, `falta-motivo`, `cascada-sin-ids` y `texto-largo` | `f4dd5bb` | **AGREGAR AHORA** |
| E23 | `/anh/paradas/:id/yacimiento` | `anh:yacimiento` | `{ parada, guardadas }` | 403, 404, 409 y 422 | `f4dd5bb` | **AGREGAR AHORA** |
| E24 | `/anh/paradas/:id/respuesta` | `anh:clasificar` | `{ parada, guardadas }` | 409 `pregunta-cerrada`; 422 `pregunta-ajena`; 403 `paso-ajeno` | `9b6a659` | **AGREGAR AHORA** |
| E25 | `/anh/paradas/:id/revision` | `anh:clasificar` | `{ parada, guardadas }` | 422 `texto-corto` | `9b6a659` | **AGREGAR AHORA (a confirmar)** |
| E26 | `/anh/paradas/confirmar` | `anh:clasificar` (una parada) o `anh:confirmar` (lote) | `{ paradas, lote? }` | 403 `paso-ajeno`; 409 `lote-sin-pasos`; 422 | `f4dd5bb` | **AGREGAR AHORA** |
| E27 | `/anh/paradas/deshacer` | la de lo que se deshace | `{ paradas, guardadas }` | 409 si alguien dijo otra cosa después | `1b14930` | **AGREGAR AHORA** |
| E28 | `/configuracion/vista-previa` | `config:firmar` | `{ impacto, errores? }` (no guarda) | 403; 422 | `f4dd5bb` | **AGREGAR AHORA** |
| E29 | `/topologia/importar` | `config:firmar` | `TopologiaLeida` (no firma) | 404, 403, 422 y 400 | `f4dd5bb` | **AGREGAR AHORA** |

**Ejemplos.** E22 y E26 salen tal cual de `referencia/escrituras/`, que tiene 18 secuencias con el HTTP y el código de cada paso. Los demás salen de `CONTRATO.md`.

```text
E21 POST /api/planes/<id del plan de /vistas/ciclo>        (x-rol: sup)
    { "estado": "aceptado", "motivo": "Se programa con la cuadrilla del jueves" }
    → 200 { "decision": { "id": "…", "estado": "aceptado", "por": "Nelson Ortiz · supervisor de operaciones",
                          "porId": "…", "fecha": "…", "motivo": "Se programa con la cuadrilla del jueves" } }
    → 409 si ya está en ese estado o se ejecuta sin aceptar · 422 motivo < 5

E22 POST /api/anh/paradas/EP-LC14-251019-12@2025-10-19#1/clasificacion        (x-rol: jefe)
    { "pasos": { "responsable": "op-operacion" }, "motivo": "El equipo es de operación", "aplicarAlEvento": true,
      "cadena": "op-mantenimiento · planta · diferida · no-planeada · NP_PROC · NP_PROC/parada-estacion-bombeo-afecta-pozos" }
    → 200 { "parada": ParadaAnh, "guardadas": { "<clave>": { "responsable": DatoClasificado } } }
    luego (x-rol: sup), la cascada sin motivo:
    { "pasos": { "responsable": "op-mantenimiento" }, "aplicarALaCascada": true, "ids": ["EP-LC07-251019-11@2025-10-19#1", …], "cadena": "…" }
    → 409 { "error": { "codigo": "cambia-a-otra-persona", "mensaje": "…" } }      (referencia/escrituras/409-cambia-a-otra-persona.json)

E23 POST /api/anh/paradas/<id>/yacimiento        (x-rol: prod o conf)
    { "evidencia": "prueba", "cadena": "…" }   → 200 { parada, guardadas }
    con x-rol: sup → 403 sin-capacidad          (referencia/escrituras/403-sin-capacidad-yacimiento.json)

E24 POST /api/anh/paradas/<id>/respuesta        (x-rol: oper)
    { "pregunta": "<id de la pregunta de la fila>", "opcion": "<texto exacto del botón>" }   → 200 { parada, guardadas }
    { "pregunta": "no-existe", "opcion": "Sí" } → 422 pregunta-ajena   (referencia/escrituras/422-pregunta-ajena.json)

E25 POST /api/anh/paradas/<id>/revision
    { "motivo": "La parte no es esa: era el sello", "pedirA": "prod" }   → 200 { parada, guardadas }   (no toca ningún paso)

E26 POST /api/anh/paradas/confirmar        (x-rol: sup)
    { "ids": ["EP-LC14-260911-75@2026-09-11#1","EP-LC07-260914-09@2026-09-14#1"],
      "cadena": "op-mantenimiento · pozo · diferida · no-planeada · NP_SUB · NP_SUB/falla-esp" }
    → 200 { "paradas": [ParadaAnh, ParadaAnh], "lote": ConfirmacionLote }
    la misma petición otra vez → 409 lote-sin-pasos     (referencia/escrituras/409-lote-sin-pasos.json)

E27 POST /api/anh/paradas/deshacer
    { "ids": ["<fila>"], "n": [<consecutivo de lo que dijo quien deshace>] }   → 200 { paradas, guardadas }

E28 POST /api/configuracion/vista-previa
    { "config": Config, "aunConErrores": true }   → 200 { "impacto": { "desde": "…", "hasta": "…", "campos": [ImpactoCampo] }, "errores": ["…"] }

E29 POST /api/topologia/importar
    { "campo": "ceiba", "texto": "equipo;pozos\nP-201B;LC-01 LC-02 …" }
    → 200 { "campoId": "ceiba", "topologia": [ChokeDeElemento], "porSaber": [], "hallazgos": [{ fila, equipo?, texto, bloquea }], "filas": N }
```

### 5.3 Campos, capacidades y códigos nuevos dentro de lo que ya existía

| # | Dónde | Qué se agrega (opcional) | ¿Está en `CONTRATO.md`? | Commit | ¿lo usa lo necesario? |
|---|---|---|---|---|---|
| F1 | `/vistas/diferidos` y `/mensual` · `porEquipo[]` | `fallas` y `disparos` en las filas de bombas y electrosumergibles | sí | `cb8cd39` | **YA NO CONSTRUIR (lo reemplaza la cuenta por mes, M7)** |
| F2 | `/vistas/diferidos` y `/mensual` | `sinCosto[]`: `{ campoId, equipo, tipo, fallas, disparos }` | sí | `cb8cd39` | **YA NO CONSTRUIR (solo el resumen viejo por campo)** |
| F3 | `/vistas/diferidos` y `/mensual` · `porCampo[]` | `realDia`, `diferidoDia`, `metaProduccionDia` y `metaDiferidoDia` | **no**: falta documentarlo | `ed559e4` | **YA NO CONSTRUIR (la fila por campo del gerente llega en `/vistas/planta-viva`)** |
| F4 | `causa` (tramos, preguntas, `abierta` y `salud`) | `porQueNo`: por qué ninguna señal alcanzó | sí | `69449ed` | **YA NO CONSTRUIR como campo (salía en Identificar; el renglón sigue en `evidencia`)** |
| F5 | `/vistas/bombas/prediccion` y `veredicto.prediccion` de `/vistas/bombas` | `llenado: { aguaEntraBpd, colchon, prioridad }` | sí | `cb8cd39` | **AGREGAR AHORA (adm: paso de capacidades)** |
| F6 | `/vistas/riesgo` | `colchonH`, `techo`, `declaradoPor` y `costoDe` (y `costoFallaHoy` si se acepta C1) | sí | `8d788f4`, `cb8cd39`, `30132ea` | **YA NO CONSTRUIR (lo necesario lee «Si falla hoy» de `/vistas/lista-equipos`)** |
| F7 | `HistorialEquipo` | `fallasCerradas` y `bblPorFalla` | sí | `cb8cd39` | **AGREGAR AHORA (ger: «cuánto le ha costado» en la ficha; conf)** |
| F8 | `Opcion` (`/vistas/paradas/:evento/opciones`) | `veces` y `total` (con `fuente: 'historia'`) | sí | `cb8cd39` | **YA NO CONSTRUIR (solo Identificar)** |
| F9 | `/vistas/pozos` | `diferidoEntero` y `enteroPorEvento` | **no** | `ed559e4` | **PARA DESPUÉS (prod, escalón 3: pozos)** |
| F10 | `salud.medidas[].senal` (bombas y pozos) | `tendencia: { pendiente, ordenada, n, finH, errorPendiente, actual, … }` | **no** | `ed559e4` | **AGREGAR AHORA (las tendencias del nivel 3)** |
| F11 | `/api/catalogo` · `planta.agua[]` | `miembros: [{ id, etiqueta, equipo }]` | **no** | `e5a195f` | **AGREGAR AHORA (cabecera, Regulatorio)** |
| F12 | `POST /configuracion` y el historial | `Config.topologia`, `topologiaPorSaber` y `capacidades` (con `factorMedicion`), y las reglas 9 a 11 de `validarConfig` | sí | `f4dd5bb`, `8a7c89f` | **AGREGAR AHORA (adm)** |
| F13 | Capacidades | `planes:decidir`, `anh:clasificar`, `anh:confirmar` y `anh:yacimiento` (de 9 a 13). `reg` pasa a ser rol del producto. | sí | `45a7b49`, `f4dd5bb` | **AGREGAR AHORA las 3 de la ANH; `planes:decidir` PARA DESPUÉS** |
| F14 | Errores de las escrituras ANH (C-22) | `rol-desconocido`, `sin-persona`, `paso-ajeno`, `cadena-cambio`, `pregunta-cerrada`, `cascada-cambio`, `cambia-a-otra-persona`, `lote-sin-pasos`, `clasificacion-incoherente`, `falta-motivo`, `texto-largo`, `pregunta-ajena` y `cascada-sin-ids` | sí | `d0faf1e`, `30132ea` | **AGREGAR AHORA** |
| F15 | `referencia/` | 219 archivos nuevos; `escrituras/` (18 secuencias), `comparar --escrituras --tokens`, `casos[].escenario` y la lista `AUSENTES` | sí | varios | — |
| F16 | SQL | `docs/backend/sql/` (104 tablas, 11 vistas, ejemplos, pruebas y cuadres), salvo lo de §4.6 y lo retirado en R8 | sí | `8700292` y siguientes | **AGREGAR AHORA lo que respalda lo de arriba; lo de R8, YA NO** |
| F17 | `v_procedencia` | `dispositivo`, `alarma_alta`, `alarma_baja` y `alarma_fuente` | sí | `8700292` | **PARA DESPUÉS (procedencia)** |

**Para el coordinador:**
- F3, F9, F10 y F11 viajan y están en la referencia, pero **no están escritos en `CONTRATO.md`**. Hay que agregarlos ahí antes de pedírselos al backend.
- E15 no tiene caso en la referencia.

---

## 6. QUITADO

- **En la API: nada.** Ninguna ruta, ningún campo de una respuesta, ningún código de error y ninguna capacidad de v1 se quitó.
- **En el SQL:** 5 piezas del esquema de v1 no están en el esquema nuevo, todas con su reemplazo (Q1 a Q5, §4.6). El esquema de v1 sigue en el repositorio, sin cambios.

---

## 7. Cómo se midió (para repetirlo)

```bash
# rutas: lecturas del contrato y escrituras, en v1 y hoy
git show cde8214:src/shared/api/contrato.ts | grep -oE "\('(/[^']+)'" | sort -u     # 41 (hoy: 61)
git show cde8214:src/shared/api/escrituras.ts | grep -oE "'(POST|PATCH|PUT)', *[\`'][^\`']+"   # 9 (hoy: 18)
# texto del contrato y códecs
git diff cde8214 HEAD -- CONTRATO.md src/shared/api/contrato.ts src/shared/api/escrituras.ts
# referencia: 89 archivos de v1 que cambiaron, clave por clave, tipo, texto y número; y commit por commit
#   (script de comparación en el borrador de M3; ver §8: es la base de la prueba)
# SQL: columnas de cada tabla de simulador-api/esquema.sql contra docs/backend/sql/esquema.sql
```

---

## 8. La prueba: `verificar-contrato` contra la línea base

> Solo el diseño. No está implementada.

**Qué asegura:** todo endpoint, campo, código, texto exigido y tabla de `cde8214` sigue existiendo igual, o está registrado en este documento como CAMBIADO o RETIRADO, con su reemplazo. Si alguien rompe el contrato sin registrarlo, la prueba falla y dice qué rompió.

### 8.1 Dos archivos nuevos, al lado

1. **`docs/backend/linea-base/v1.json`**, la foto de v1. Se genera **una vez** con `scripts/linea-base.mjs --desde=cde8214` (lee con `git show`) y se guarda en el repositorio, para que la prueba no dependa del historial de git. Contiene:
   - `rutas`: cada `GET` de `contrato.ts` (ruta, parámetros y el nombre de la constante) y cada escritura de `escrituras.ts` (método y ruta), más las del texto de `CONTRATO.md` que el código no declara (`/api/webhooks/whatsapp`, `/api/inscripcion`, `/api/ingesta/nacimiento`, `/api/campos/:campo/tags/…`);
   - `formas`: por cada caso de `referencia/` de v1, cada ruta de clave con su tipo JSON (`datos.tramos[].causa.texto: string`), con las claves de diccionario normalizadas (`refs.eventos.{k}`);
   - `opcionales`: los campos que v1 documenta como «?» o «ausente si…»;
   - `codigos`: los códigos de error de la tabla «Error único» de v1, con su HTTP;
   - `capacidades`: las 9 de v1 y el reparto por rol;
   - `textos`: las rutas de texto que arma el motor y que la referencia exige (`causa.texto`, `motivo`, `mdtFuente`, `evidencia[]`, `accion`, `metodo`, `supuestos[]`, `frase*`), con su valor en v1;
   - `sql`: las tablas y columnas de `simulador-api/esquema.sql` con su tipo, y las columnas de `v_procedencia`.
2. **`docs/backend/cambios-contrato.json`**, el registro legible por la máquina. Es el gemelo de las tablas de este documento: una entrada por cambio, con:
   - `{ id, tipo: AGREGADO | CAMBIADO | RETIRADO | VERSION, objeto: ruta | campo | codigo | texto | sql, clave, fecha, commit, motivo, reemplazo? }`.
   
   Ejemplos:
   - `{ "id":"C1", "tipo":"CAMBIADO", "objeto":"campo", "clave":"/vistas/riesgo datos[].costoFalla", "reemplazo":"costoFallaHoy" }`;
   - `{ "id":"R1", "tipo":"RETIRADO", "objeto":"ruta", "clave":"GET /api/mensajes", "fecha":"2026-10-27", "motivo":"el dueño decidió quitar el canal de WhatsApp: el backend no lo construye" }`.

   `CAMBIOS-CONTRATO.md` se puede generar o revisar contra este archivo.

### 8.2 Las comprobaciones (una sección nueva al final de `scripts/verificar-contrato.mjs`)

| # | Comprueba | Falla si… |
|---|---|---|
| 1 | Cada ruta de `v1.json` existe en `contrato.ts`, en `escrituras.ts` o en `CONTRATO.md` | falta y no hay entrada RETIRADO o VERSION con esa clave (y, si es VERSION, la ruta nueva tiene que existir) |
| 2 | **Forma:** se vuelven a correr los casos de v1 con el motor de hoy **y los insumos de v1** (`docs/backend/linea-base/v1/referencia/insumos`, con `instalarInsumos`, como hace `referencia.mjs comprobar`). Cada ruta de clave de `formas` existe con el mismo tipo, y una opcional puede faltar. **Así los cambios de datos (C18) no se confunden con cambios del contrato.** | una clave falta o cambia de tipo y no hay entrada CAMBIADO o RETIRADO con su clave |
| 3 | **Textos:** en esa misma corrida, cada valor de `textos` es igual al de v1 | un texto cambió sin entrada CAMBIADO con el texto viejo y el nuevo |
| 4 | **Números:** en esa misma corrida, los números de los casos de v1 valen lo mismo, con la tolerancia de `indice.json` | cambió un número sin entrada CAMBIADO de cálculo (C5 a C8) que nombre ese caso y esa clave |
| 5 | Cada código de `codigos` sigue en la tabla «Error único» de `CONTRATO.md` con su HTTP | falta o cambió de HTTP sin entrada (C12 la tiene) |
| 6 | Las 9 capacidades siguen y ningún rol visible pierde una | se quitó una sin entrada |
| 7 | **SQL:** cada tabla y columna de `sql` existe en `simulador-api/esquema.sql`. Si el registro dice que rige el esquema nuevo, la comprobación se hace en `docs/backend/sql/esquema.sql` o en sus vistas `v1_*`, con el mismo tipo o uno registrado. | falta o cambió sin entrada (C19, Q1 a Q5) |
| 8 | **Lo RETIRADO** sigue en `CONTRATO.md` y en el SQL con la marca «RETIRADO (fecha)», su motivo y su reemplazo, y el front no lo usa (`grep` en `src` de la constante, por ejemplo `MENSAJES`) | se borró del todo, falta la marca o el front lo sigue usando |
| 9 | **WhatsApp** (§6.5 del prompt): `grep -ri whatsapp src e2e` = 0, y en `CONTRATO.md` y `docs/backend/sql/` cada mención está en un bloque marcado RETIRADO | aparece fuera de eso |
| 10 | El registro está sano: cada entrada CAMBIADO o RETIRADO tiene fecha, commit (o «pendiente»), motivo y reemplazo (o «ninguno, no se construye»), y no hay dos entradas con la misma clave | falta un dato |

### 8.3 Cómo se prueba la prueba

La prueba tiene que fallar sin el registro. En `verificar-contrato` se corren tres mutaciones en memoria (no en disco):
- quitar una clave de `formas`;
- cambiar un texto;
- borrar una ruta de la lista de hoy.

Las tres tienen que dar FALLA. Las mismas tres, con su entrada en el registro, tienen que pasar.

### 8.4 Lo que no puede asegurar (dicho para no prometer de más)

- **La comprobación 2 usa los insumos de v1 sobre el motor de hoy.** Si el motor de hoy exige un insumo que v1 no tenía (por ejemplo, la topología o las capacidades), el caso corre con el «sin firmar» o el derivado del registro. Eso hay que confirmarlo caso por caso la primera vez. Si no se puede, ese caso se marca «solo forma» en `v1.json`.
- **No ve campos opcionales de v1 que ningún caso de la referencia trae.** Para esos manda la lista `opcionales`, sacada a mano de `CONTRATO.md` de v1.

---

## 9. Lo que falta en el motor y hay que construir

Lo necesario de cada rol (M1) tiene 7 piezas que **hoy no calcula el motor**. Mientras no existan, la pantalla dice «sin registro» o «sin dato»; nada se inventa. Al cruzar, apareció una octava (M8).

Cada una va **AGREGADA al lado**:
- un endpoint nuevo;
- o un campo **opcional** en una vista que ya existe (ausente = «sin dato»).

Ninguna toca lo de v1. Todas son **AGREGAR AHORA**, porque las usa lo necesario, pero **después de que el motor las calcule**: primero `src/entities` con su prueba, después su caso en `referencia/` y por último el endpoint.

**Lo que no está decidido se dice «por decidir».** Las rutas, los cuerpos y las capacidades de abajo son la **propuesta**; los nombres finales se fijan cuando el motor exista.

| # | Qué falta | Quién lo usa (M1) | Endpoint propuesto (AGREGADO) | Capacidad | Depende de |
|---|---|---|---|---|---|
| M1 | **Registrar las pérdidas** (pitera, derrame, tea) y verlas aparte, nunca sumadas al diferido | oper la registra; ger, prod y reg la ven | `POST /api/perdidas` y `GET /api/vistas/perdidas?campos&desde&hasta` | nueva: `perdidas:registrar` (oper; por decidir si también sup) | La lista de tipos de pérdida y cómo se estima el volumen. C24 p. 4 dice que la pérdida «podrá estar sujeta a gravamen». No se inventa una fórmula. |
| M2 | **Cerrar la orden en el teléfono**, sin papel: qué encontró, qué se reparó, lecturas y horas | tec | `POST /api/sap/ordenes/:numero/cierre` | nueva: `orden:cerrar` (tec) | Cómo se escribe en SAP PM (la confirmación y el TECO). La tabla `confirmacion_sap` ya existe en el SQL nuevo. |
| M3 | **La respuesta de la ANH** y lo que queda de la hora para corregir | reg (apoyo 3); ger, escalón 1 | `POST /api/anh/respuestas` y `GET /api/vistas/anh/respuestas?campos&desde&hasta`. Además, el campo opcional `respuestaAnh` en `GET /vistas/anh/reporte`. | nueva: `anh:enviar` (reg) | Cómo llega la respuesta de la ANH: a mano o por su canal. Por decidir. |
| M4 | **Convertir el árbol de la operadora** al de la ANH | adm | `POST /api/anh/conversion/importar` (lee, no firma) y `GET /api/vistas/anh/conversion?campo`. Se firma con `POST /configuracion`, con el campo opcional nuevo `Config.conversionAnh`. | `config:firmar` (la de v1) | El árbol de cada operadora. Hoy solo existe la procedencia `conversion` en `entities/anh-clasificacion.ts`. |
| M5 | **El tiempo fuera en sus 5 tramos:** detección, administrativo, logística, reparación y arranque | jefe (TIENE) | Campo opcional `tramos` en `GET /vistas/relojes` (v1). Hoy trae `totalH`, `activaH` y `esperaH`. | la de la vista | Las horas de SAP (aviso, orden liberada, confirmaciones y TECO) y el cierre en el teléfono (M2). PM §1 dice: «El PLC más el cierre de la orden en el teléfono». Un tramo sin su marca va `null`. |
| M6 | **Las paradas por confirmar como número**, con la hora límite | sup (número principal) y prod (apoyo 1) | Campo opcional `porConfirmar` en `GET /vistas/hoy` | — | Nada nuevo: es la cuenta `faltan` que `inicioDe` (`entities/hoy.ts`) ya hace para el supervisor. Hoy viaja solo dentro de la frase. |
| M7 | **Las fallas por mes** de los equipos críticos, en el motor | jefe (apoyo 2); es el primer indicador del norte (PM §1) | `GET /api/vistas/fallas/mensual?campos` | — | `historialDeEquipo().eventos`. Hoy la cuenta por mes la hace la pantalla (`pages/Confiabilidad.tsx`, «Fallas por mes»), y eso va contra la regla «el motor calcula». |
| M8 | **El estado de la configuración** («3 de 6 pasos listos»), encontrado al cruzar | adm (número principal) | `GET /api/vistas/configuracion/estado?campo` | — | `estadoConfiguracion()` (`entities/choke-config.ts`) existe, pero hoy la llama la pantalla (`pages/Configuracion.tsx:354`). Con la fuente http no tiene endpoint. |

**Cuentas:** 9 endpoints nuevos (M1: 2, M2: 1, M3: 2, M4: 2, M7: 1, M8: 1) y 4 campos opcionales (M3 `respuestaAnh`, M4 `Config.conversionAnh`, M5 `tramos`, M6 `porConfirmar`).

### 9.1 Ejemplos propuestos

Son la forma que se propone, no un caso de la referencia: todavía no hay motor que los calcule. Los valores entre `<…>` no existen hoy.

```text
M1  POST /api/perdidas        (x-rol: oper)
    { "campoId": "ceiba", "tipo": "<pitera | derrame | tea | … por decidir>", "donde": { "pozo": "LC-07" } ,
      "inicio": "2026-10-02T09:10:00-05:00", "fin": null, "volumen": { "bbl": <número>, "fuente": "<medido | estimado>" } }
    → 200 { "perdida": { "id": "…", …lo mismo, "por": "Jairo Peña · operador de campo", "porId": "…", "hora": "…" } }
    → 403 sin-capacidad · 404 campo-desconocido · 422 sin tipo, sin volumen o fin < inicio
    Solo inserción (D1). Lo que la persona escriba no viaja a la ANH (D2).

    GET /api/vistas/perdidas?campos=ceiba&desde=…&hasta=…
    → { "bbl": <Σ>, "porTipo": [{ "tipo", "bbl", "eventos" }], "filas": [ …las de arriba ] }
    Sin registros: { "bbl": 0, "porTipo": [], "filas": [] }, y la pantalla dice «sin registro».
    La rama `perdida` de `/vistas/choke/arbol`, que hoy va en 0, se llena con esto. Nunca se suma al diferido.

M2  POST /api/sap/ordenes/<numero>/cierre        (x-rol: tec)
    { "encontrado": { "parte": "sello", "modo": "<modo del catálogo>" }, "reparado": "<texto ≤ 500, queda en TRIM>",
      "lecturas": [{ "tag": "<tag del equipo>", "valor": <número> }], "inicio": "…", "fin": "…" }
    → 200 { "orden": OrdenSap, "confirmacion": { "confirmacion", "contador", "horas", "fecha", "final": true } }
    → 403 si la orden no es suya o no es de su campo · 404 orden desconocida · 409 ya cerrada · 422 parte o modo fuera del catálogo

M3  POST /api/anh/respuestas        (x-rol: reg)
    { "folio": "<folio de POST /informes>", "estado": "aceptado | rechazado", "recibida": "2026-10-03T07:20:00-05:00",
      "rechazo": { "codigo": "<código de la ANH>", "filas": ["<id de ParadaAnh>"] } }
    → 200 { "respuesta": { …, "limiteCorreccion": "2026-10-03T08:20:00-05:00" } }      (1 h, C24)
    GET /vistas/anh/reporte → además "respuestaAnh": { "estado", "recibida", "limiteCorreccion", "quedanMin" }   (opcional)

M4  POST /api/anh/conversion/importar        (x-rol: adm)
    { "campo": "ceiba", "texto": "código de la operadora;descripción;N1;N2\n…" }
    → 200 { "conversion": [{ "codigo", "descripcion", "n1", "n2" }], "hallazgos": [{ "fila", "texto", "bloquea" }], "filas": N }   (no firma)
    GET /api/vistas/anh/conversion?campo=ceiba → { "vigente": […], "sinConvertir": ["<códigos sin N1/N2>"] }
    Se firma con POST /configuracion, "config": { …, "conversionAnh": [{ "campoId", "codigo", "n1", "n2" }] }   (opcional)

M5  GET /vistas/relojes?campos&desde&hasta → además, por promedio:
    "tramos": { "deteccionH": n | null, "administrativoH": n | null, "logisticaH": n | null, "reparacionH": n | null, "arranqueH": n | null }   (opcional)

M6  GET /vistas/hoy?rol=sup&campos=ceiba → además "porConfirmar": { "n": 4, "limite": "2026-10-03T07:00:00-05:00" }   (opcional; sup y prod)

M7  GET /api/vistas/fallas/mensual?campos=ceiba
    → [{ "mes": "2026-10", "desde": "…", "hasta": "…", "parcial": true, "fallas": 1,
         "porEquipo": [{ "campoId": "ceiba", "equipo": "P-201B", "fallas": 1, "disparos": 0 }] }, …]
    (demo: 1 falla de equipo crítico en octubre, P-201B, 2-oct, según M1)

M8  GET /api/vistas/configuracion/estado?campo=ceiba
    → { "campoId": "ceiba", "listos": 3, "total": 6, "pasos": [{ "paso", "nombre", "listo", "detalle", "corto", "firma" }],
        "siguiente": "topologia", "falta": "firmar a qué pozos sirve cada equipo", "frase": "La Ceiba: 3 de 6 pasos listos. …" }
    (la forma es EstadoConfiguracion de entities/choke-config.ts, tal cual)
```

**Para la prueba (§8):** cada M entra en `cambios-contrato.json` como AGREGADO cuando se construya, con su caso en `referencia/`. Mientras no exista, la prueba no lo exige.

**No entra aquí** (está en la escalera o en roles apagados, no en lo necesario):
- el programa del técnico y su cumplimiento;
- las rutas predictivas;
- trabajar sin señal;
- el paquete de métricas de la operadora;
- el historial de envíos a la ANH;
- «¿alcanza?» y pedir el repuesto (plan, apagada);
- las paradas de un tercero (cont, que sale).
