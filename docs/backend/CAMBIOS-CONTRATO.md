# Cambios del contrato desde la versión 1

> **27-oct-2026 · A1 (experiencia v3).** El dueño aprobó las decisiones (`docs/experiencia-v3/CONSTRUCCION.md`): rige el SQL de v1, WhatsApp sale y lo nuevo va al lado. Este documento ya no es un borrador: dice lo que quedó hecho.
>
> - **Línea base:** la versión 1, commit **`cde8214`** («TRIM Hidrocarburos: front para entregar al backend», 7-oct-2026). Es la que tomó el desarrollador del backend. Su foto está en [`linea-base/v1.json`](linea-base/v1.json) y su referencia, tal cual, en [`linea-base/v1/referencia/`](linea-base/v1/referencia/).
> - **La regla:** «al lado, nunca encima». Lo que existe no se renombra, no se borra y no cambia de significado. Lo nuevo se agrega al lado. Lo que sale se marca RETIRADO.
> - **El registro para la máquina:** [`cambios-contrato.json`](cambios-contrato.json): una entrada por cambio, con su fecha, su commit, su motivo, su reemplazo y si quedó compatible (`resuelto`).
> - **La prueba:** `npm run verificar:contrato`, sección «A1» (§8). Si alguien rompe el contrato sin registrarlo, falla y dice qué rompió.
> - **Cómo repetir la medición:** §7.

---

## 1. Para el desarrollador, en una tabla corta

**Lo que usted tiene que hacer, en orden.** «Resuelto» dice cómo quedó cada cambio frente a v1:
- **al lado:** volvió a ser compatible con v1; si usted construyó v1, sigue valiendo;
- **compatible:** lo que v1 manda sigue valiendo, no hay que hacer nada;
- **registrado:** no se puede deshacer sin romper la v2 (una corrección de cálculo, un texto): hay que adoptarlo.

| # | Qué | Tipo · resuelto | Qué hacer | ¿lo usa lo necesario? |
|---|---|---|---|---|
| R1–R8 | **WhatsApp completo:** `GET /api/mensajes`, el webhook, el envío por Meta y las plantillas, el teléfono y las alertas de cada persona, el `canal` de la respuesta y sus tablas del SQL nuevo | **RETIRADO** (27-oct-2026) | **No construirlo.** Si ya lo hizo, puede quitarlo cuando quiera. Acepte e ignore `telefono` y `alertas` en `/api/usuarios`, sin un `422` por ellos: el front nunca manda `telefono` y manda `alertas: false` (v1 la pide) (§3) | **YA NO CONSTRUIR** |
| C1 | `Riesgo.costoFalla` había cambiado de significado | CAMBIADO · **al lado** | Nada si construyó v1: `costoFalla` volvió a su significado de v1. Agregue **`costoFallaHoy`** (opcional), la cifra «si falla hoy» que pinta el front (§4.1) | **YA NO CONSTRUIR** el de v1; `costoFallaHoy`, cuando haga `/vistas/riesgo` |
| C2 | Dispositivo sin lectura: `valor: "—"` → `null` | CAMBIADO · **al lado** | Nada: el front acepta los dos. Un backend nuevo manda `null` (§4.1) | **AGREGAR AHORA** (nivel 4 de conf) |
| C5–C8 | Reglas de cálculo (el colchón de una parada vieja, el cierre parcial de una ESP, `fallo` en la ESP, la evidencia de la cascada) | CAMBIADO · registrado | Ajustar el motor del servidor: son correcciones del QA (§4.2) | **AGREGAR AHORA** |
| C9–C11 | Textos: «bomba de reinyección» → «bomba de agua»; las horas de `motivo` y de `mdtFuente` | CAMBIADO · registrado | Cambiar las frases del servidor (§4.3) | **AGREGAR AHORA** (C9); C10 y C11 son de `/vistas/riesgo` |
| C12 | `peticion-invalida` en las 9 escrituras de v1 | CAMBIADO · **al lado** | `400` o `422`: los dos valen en las escrituras de v1 (§4.4) | **AGREGAR AHORA** |
| C13, C16 | `403 rol-desconocido`; motivo ≤ 500 en la configuración | CAMBIADO · registrado | Adoptarlos (seguridad y un tope al texto libre) (§4.4) | **AGREGAR AHORA** |
| C18 | Datos del demo regenerados (`e5a195f`) | CAMBIADO · **al lado** | Para comparar contra v1: `--referencia=docs/backend/linea-base/v1/referencia` (§4.5) | — |
| C19, Q1–Q5 | SQL de la cadena: 9 tablas con otra forma en el SQL nuevo | CAMBIADO · **al lado** | **Rige el SQL de v1** (`simulador-api/esquema.sql`, sin cambios). `docs/backend/sql/v1-cadena.sql` da sus tablas y columnas desde el modelo nuevo (§4.6) | **AGREGAR AHORA** (adm: tags sin equipo) |
| C3, C4, C14, C15, C17 | Compatibles | CAMBIADO · compatible | Nada obligatorio (§4.7) | **AGREGAR AHORA** (C3 y C4 son insumos) |
| A3-1 | `POST /api/paradas/:evento/respuesta`: `modo` pasa a opcional con `parte` («Contestar» en 1 toque) | CAMBIADO · registrado | Aceptar la parte sin `modo`. **Ojo:** un backend de v1 responde `422` hasta que lo adopte; es la única regla de v1 que se relaja (§9.2) | **AGREGAR AHORA** (oper y tec) |
| E1–E29 | 29 endpoints nuevos de la v2 | **AGREGADO** | 23 ahora, 3 después y 3 no (§1.1, §5) | ver §1.1 |
| M1–M8, A2, A3 | Lo que faltaba en el motor, **ya construido**: pérdidas, balance, jornada, efectividad, fallas por mes (A2); cierre de la orden, respuesta de la ANH, conversión del árbol, 5 tramos (A3); `porConfirmar` y el estado de la configuración (A1) | **AGREGADO** | Construir lo de **AGREGAR AHORA**, con su caso en `referencia/` (§9.2, §9.3 y §9.4) | **AGREGAR AHORA** |
| F1–F17 | Campos, capacidades y códigos nuevos | **AGREGADO** | §5.3. F3, F9, F10 y F11 ya están escritos en `CONTRATO.md` («A1») | ver §5.3 |

**Las cuentas, endpoint por endpoint** (el detalle de cada uno está en §1.1):

| | AGREGAR AHORA | PARA DESPUÉS | YA NO CONSTRUIR | Total |
|---|---|---|---|---|
| Las 50 de v1 (41 lecturas + 9 escrituras) | **35** (27 + 8) | **5** (5 + 0) | **10** (9 + 1): 1 RETIRADO (`GET /mensajes`) y 9 «no prioritario» | 50 |
| Las 29 de la v2 (20 lecturas + 9 escrituras) | **23** (15 + 8) | **3** (2 + 1) | **3** (3 + 0) | 29 |
| Las 13 de la v3 (A1, A2 y A3: 8 lecturas + 5 escrituras) | **13** | — | — | 13 |
| **En el código hoy:** 68 lecturas en `contrato.ts` y 23 escrituras (22 en `escrituras.ts` y `POST /perdidas`) | **71** | **8** | **12** | **91** |

Hay además 2 rutas que solo estaban en `CONTRATO.md`: `GET` y `POST /api/webhooks/whatsapp`. Son **YA NO CONSTRUIR** (RETIRADO). Las de la cadena de datos y los insumos están al final de §1.1.

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
| E15 `GET /vistas/anh/reporte` | **AGREGAR AHORA** | reg: su número principal (6 casos en `referencia/anh/reporte-*`) |
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

**Las 13 de la v3** (A1, A2 y A3, 27-oct-2026; el detalle en §9.2, §9.3 y §9.4)

| Endpoint | ¿lo usa lo necesario? | Quién |
|---|---|---|
| `GET /vistas/configuracion/estado` (M8, A1) | **AGREGAR AHORA** | adm: su número principal |
| `GET /vistas/balance` (A2-1) | **AGREGAR AHORA** | ger, prod, sup, reg, jefe y conf: producido · diferido · perdido |
| `GET /vistas/perdidas` y `POST /perdidas` (M1, A2) | **AGREGAR AHORA** | oper, sup y prod registran; los roles clave la ven |
| `GET /vistas/jornada` (A2-2) | **AGREGAR AHORA** | sup |
| `GET /vistas/efectividad` (A2-3) | **AGREGAR AHORA** | ger y prod |
| `GET /vistas/fallas/mensual` (M7, A2) | **AGREGAR AHORA** | jefe |
| `POST /paradas/:evento/vio` (A3-1) | **AGREGAR AHORA** | oper y tec |
| `POST /sap/ordenes/:numero/cierre` (M2, A3) | **AGREGAR AHORA** | tec |
| `POST /anh/respuestas` y `GET /vistas/anh/respuestas` (M3, A3) | **AGREGAR AHORA** | reg |
| `POST /anh/conversion/importar` y `GET /vistas/anh/conversion` (M4, A3) | **AGREGAR AHORA** | adm |

**Fuera de `contrato.ts`** (en `CONTRATO.md` y `simulador-api/`; no entran en las 91):

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
| **AGREGADO** | 42: 29 de la v2 (20 `GET` + 9 `POST`) y 13 de la v3 (8 `GET` + 5 `POST`) | los de la v2 (F1 a F17) y los de la v3 (`costoFallaHoy`, `porConfirmar`, `tramos` de los relojes, `respuestaAnh`, `cierre` de la orden, dos de la configuración y 3 capacidades) | el esquema nuevo (104 tablas y 11 vistas), columnas nuevas en `v_procedencia` y `v1-cadena.sql` | — |
| **CAMBIADO** | 0 rutas | 19 de v1 (C1 a C19): **resueltos al lado** C1, C2, C12, C18 y C19 (con Q1 a Q5); **compatibles** C3, C4, C14, C15 y C17; **registrados** C5 a C11, C13 y C16. Y uno de la v3 que relaja una regla de v1: A3-1 | C19 y Q1 a Q5: rige el SQL de v1 | **20** |
| **QUITADO** | **0** | 0 | **0**: lo que el SQL nuevo no tenía de v1 lo da `v1-cadena.sql` (Q1 a Q5) | **0** |
| **RETIRADO** | 3 (`GET /api/mensajes`, `GET` y `POST /api/webhooks/whatsapp`) | 6 grupos de campos y reglas de WhatsApp (R3 a R7) | 5 tablas y 6 columnas o restricciones del SQL nuevo (R8) | — |

**Sobre las rutas:** el código de v1 tiene 41 lecturas en `contrato.ts` y 9 escrituras en `escrituras.ts`; el de hoy, 68 y 23 (22 en `escrituras.ts` y `POST /perdidas` en `perdidas.ts`). Ninguna ruta se renombró ni se borró: `GET /mensajes` salió del código y queda en `RETIRADAS` (`contrato.ts`) y en `CONTRATO.md`, marcada RETIRADO.

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

## 3. RETIRADO: WhatsApp (27-oct-2026)

**Motivo:** el dueño decidió quitar el canal de WhatsApp. **El backend no lo construye.** Lo que tenía valor queda dentro de TRIM, en pantalla: [`docs/experiencia-v3/whatsapp.md`](../experiencia-v3/whatsapp.md).

**Cómo quedó retirado (hecho el 27-oct-2026):**
- Nada se borró del contrato.
- `CONTRATO.md` marca cada pieza «RETIRADO (27-oct-2026)», con su motivo y su reemplazo: la sección «RETIRADO · WhatsApp: el carril caliente», el webhook, los usuarios, la respuesta, los pendientes y Hoy.
- `src/shared/api/contrato.ts` lista en **`RETIRADAS`** lo que v1 declaraba ahí o en los tipos que viajan (R1, R3 y R4), con su fecha, su motivo y su reemplazo. `MENSAJES` ya no se exporta.
- `docs/backend/sql/` marca cada tabla y columna (R8) con un bloque `-- RETIRADO (27-oct-2026): …` y su `comment on … is 'RETIRADO …'`; esas tablas quedan sin filas en `ejemplos.sql`. Regla: toda línea que nombra el canal dice RETIRADO. `validar.sh` y `verificar-contrato` lo comprueban.
- El front dejó de usarlo: `entities/mensajes.ts` y `shared/api/mensajes.ts` se borraron; lo que se seguía usando (`causasSugeridas`, `CAUSAS_POZO`, `NO_FUE_ESP_CORTO`, `Opcion`) se mudó a `entities/causas-sugeridas.ts`, sin cambiar lo que calcula. `grep -ri whatsapp src` = 0.
- El reporte a la ANH no cambió: al regenerar `referencia/`, ningún archivo de `referencia/anh/` cambió.

| # | Qué | Estaba en v1 | Reemplazo dentro de TRIM | Qué hace el backend |
|---|---|---|---|---|
| R1 | `GET /api/mensajes?campos` → `Mensaje[]`: el registro de lo enviado, con las reglas parada, cierre, causa, recordatorio, escalamiento, parte y orden, y las 10 plantillas de Meta | sí | Las tarjetas e insignias de `/vistas/hoy` y la franja «No arrancar» | No construir. Si existe, puede responder `[]` o `404` mientras la quita. El front ya no la pide. |
| R2 | `GET /api/webhooks/whatsapp` (verificación de Meta) y `POST /api/webhooks/whatsapp` (respuestas firmadas con HMAC, deduplicación, persona por E.164, «0» con texto, `context.id`) | sí | `POST /api/paradas/:evento/respuesta` (pantalla) | No construir |
| R3 | En `Usuario` y `CuerpoInvitacion`: `telefono` (E.164) y `alertas`. Las reglas 422 del teléfono (forma E.164, único entre no suspendidos, alertas solo con teléfono y solo en sup, oper, tec, conf y jefe). `ErrorAcceso.campo` = `whatsapp` \| `alertas`. `GET /api/usuarios` entrega `telefono` solo de quien recibe alertas. | sí | — (sin canal no hace falta el número) | **Aceptar e ignorar** `telefono` y `alertas` si llegan, sin un 422 por ellos. No volver a mandarlos. El número es un dato personal que deja de hacer falta. **El front** nunca manda `telefono` y, en `POST` y `PATCH /usuarios`, manda `alertas: false`: v1 la pide en el cuerpo y así un backend de v1 no se rompe. |
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

**La referencia** (regenerada a propósito el 27-oct-2026):
- `/api/mensajes` no tiene caso;
- los casos de `referencia/hoy/` ya no traen `whatsapp` ni «se escaló»; «Ver el chat» pasó a «Ver la parada» y «se la vuelven a preguntar en la próxima ronda» a «la pregunta sigue en Hoy»;
- los 2 de `referencia/ciclo/` dicen «Registrar la parte dañada en la pantalla («Contestar» en Hoy)».

---

## 4. CAMBIADO, en detalle, y cómo dejarlo «al lado»

### 4.1 Lo que rompía la forma o el significado (los dos, resueltos al lado)

**C1 · `Riesgo.costoFalla` (`GET /api/vistas/riesgo`) cambió de significado.** Commit `cb8cd39`.

| | v1 (`cde8214`) | HEAD |
|---|---|---|
| Bomba (disposición, transporte o recobro) | `costoFalla = HistorialEquipo.bblPorFalla`: lo que el equipo **ya costó**, en promedio, por falla | Lo que **costaría si fallara hoy**: `Q × (1/n) Σ max(0, dᵢ − colchón) / 24`. En una bomba de recobro o con respaldo total, `0`. |
| Electrosumergible | `crudoAsignado × mdt / 24` | Lo mismo (sin cambio) |
| Ejemplo: P-201B de Morichal | **3.364,6** bbl | **2.086** bbl |
| `mdtFuente` | «el promedio de sus 8 fallas cerradas (el tanque absorbe una parte)» | «el promedio de sus 8 fallas cerradas, sin las 19 h que aguanta hoy el tanque» |

**Hecho (al lado, 27-oct-2026):**
- `GET /api/vistas/riesgo` volvió a mandar `costoFalla` con el significado de v1: en una bomba, `bblPorFalla` (P-201B de Morichal: **2.765** bbl con los datos de hoy); en una electrosumergible, la misma cuenta de antes.
- **`costoFallaHoy`** (AGREGADO, opcional) trae lo nuevo, junto a `colchonH` y `costoDe`, que ya eran nuevos (P-201B de Morichal: **1.235** bbl). `mdtFuente` dice de dónde sale `costoFallaHoy` (C11).
- El front lee `costoFallaHoy` (`costoHoy.ts`, «En riesgo», Mantenimiento, el ciclo y Resultados).
- `/vistas/criticidad` (nueva) sigue con su `FilaCriticidad.costoFalla`: es la misma cifra que `Riesgo.costoFallaHoy` (`verificar-libro` lo compara).
- `referencia/riesgo/*` se regeneró a propósito; `costoFallaHoy` entró en `AUSENTES` (`referencia-diferencias.mjs`): ausente, no 0, cuando no aplica.
- Prueba: `verificar-libro` («C1 · al lado») y `verificar-contrato` («A1», C1).

**C2 · El dispositivo sin lectura.** `EquipoVivo.dispositivos[].valor` en `/vistas/equipos/:campo/:equipo` y `/vistas/equipos-hoy`.
- **v1:** `valor: "—"`, `unidad: ""` y estado «sin señal» (`equipo-vivo.ts`).
- **HEAD:** `valor: null`. Un texto ahora se lee como una lectura discreta: un `"—"` saldría como el valor de un interruptor.

**Hecho (al lado, 27-oct-2026):** el códec del dispositivo (`contrato.ts`, `SIN_LECTURA_V1`) lee `"—"` como `null`. Un backend nuevo manda `null`; las dos formas quedan válidas en `CONTRATO.md`. Prueba: `verificar-contrato` («A1», C2: el mismo equipo con `"—"` y con `null` entra igual).

### 4.2 Reglas de cálculo que cambiaron (cambian números de la referencia de v1)

Son correcciones del QA y de la revisión. Tener dos motores no tiene sentido, así que se registran con su antes y después. **Quedaron registradas como corrección** (`resuelto: registrado` en `cambios-contrato.json`): el backend las adopta; no hay una versión de cada regla.

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

**Qué hacer:** cambiar las frases del servidor. Al lado no aplica, porque la referencia compara el texto entero. Cada cambio futuro de texto va en esta tabla con el viejo y el nuevo (regla 3.1.4), y en `cambios-contrato.json` (objeto `texto`, con la plantilla vieja): la prueba de la línea base falla si un texto que exigía la referencia de v1 cambia sin su entrada.

### 4.4 Errores y permisos en las escrituras de v1

| # | Qué | v1 | HEAD | Cómo quedó |
|---|---|---|---|---|
| C12 | Cuerpo con un campo de otra forma (C-11) | `422 peticion-invalida`, revisado de **último** («forma (422)») | `400 peticion-invalida`, revisado **primero**, antes de cualquier regla | En las 9 escrituras de v1, **`400` o `422`** con `peticion-invalida` (el front decide por el código). `400` obligatorio solo en las escrituras nuevas de `/anh/paradas/…`, que tienen su caso en `referencia/escrituras/400-peticion-invalida.json`. **Hecho:** la fila 422 de «Error único» de `CONTRATO.md` lo dice así. |
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

**Hecho (al lado, 27-oct-2026):** la referencia de v1 está tal cual, al lado de la de hoy, en [`linea-base/v1/referencia/`](linea-base/v1/referencia/) (sale de `git archive cde8214 referencia`, con `node scripts/linea-base.mjs generar --desde=cde8214`). Así se puede comparar un backend contra v1 y contra hoy:

```bash
node scripts/referencia.mjs comparar --base-url=… --referencia=docs/backend/linea-base/v1/referencia
```

(`--referencia=` es nueva; `REFERENCIA_DIR=` hace lo mismo.) La regla de comparación es la de hoy (C17).

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

**Hecho (al lado, 27-oct-2026): rige el SQL de v1.**
1. `CONTRATO.md` (arriba, «La versión 1 y lo que cambió») y `docs/backend/README.md` dicen lo mismo:
   - el esquema de la cadena de **v1 rige** (`simulador-api/esquema.sql`, sin cambios; lo que manda es la forma JSON de `/api/campos/:campo/tags/:tag/procedencia` y `/inventario`, que no cambió);
   - `docs/backend/sql/esquema.sql` es **AGREGADO**, al lado: la versión 2 del modelo, opcional para esas tablas y necesaria para todo lo demás.
2. [`sql/v1-cadena.sql`](sql/v1-cadena.sql) crea el esquema **`v1`** con una vista por cada tabla de v1 y su `v_procedencia`, con los **mismos nombres y las mismas columnas en el mismo orden** (`v1.campo`, `v1.gateway`, `v1.fuente`, `v1.equipo`, `v1.tag`, `v1.formula`, `v1.calibracion`, `v1.historial_tag`, `v1.rechazo`, `v1.semilla` vacía y `v1.v_procedencia` con sus 32 columnas), leídas del modelo nuevo. Con `set search_path = v1`, lo que el desarrollador escribió contra v1 lee igual. Q1 a Q5 dejan de ser «quitados»: cada columna de v1 tiene su vista.
3. Pruebas: `validar.sh` corre `v1-cadena.sql` en PostgreSQL 16 con los ejemplos cargados y `herramientas/comprobar-v1.mjs` compara nombres, orden y tipos con `simulador-api/esquema.sql`; `verificar-contrato` («A1», línea base 7) comprueba, sin PostgreSQL, las tablas y columnas de v1 y el orden de las columnas de cada vista `v1.*`.

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
| E15 | `/vistas/anh/reporte?campos&desde&hasta` | ¿Se puede publicar?, paradas sin causa y quién las debe | 6 (`anh/reporte-*`, A1) | `ed559e4` | **AGREGAR AHORA** |
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
    {"campos":["ceiba"],"periodo":"septiembre","estado":"publicable","titulo":"Se puede publicar",
     "cifra":{"valor":0,"unidad":"paradas sin causa","frase":"Se puede publicar: cuadra con la medición oficial y ninguna parada está sin causa.", …}, …}
    (referencia/anh/reporte-ceiba-2026-09.json)

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

**Hecho (A1, 27-oct-2026):**
- F3, F9, F10 y F11 ya están escritos en `CONTRATO.md` («A1 · Compatibilidad con la versión 1», «Campos que ya viajaban…»).
- E15 tiene sus 6 casos: `referencia/anh/reporte-<campo o portafolio>-2026-09.json`.

---

## 6. QUITADO

- **En la API: nada.** Ninguna ruta, ningún campo de una respuesta, ningún código de error y ninguna capacidad de v1 se quitó. Lo que salió está RETIRADO (§3), no quitado.
- **En el SQL: nada.** Las 5 piezas del esquema de v1 que el esquema nuevo no tenía (Q1 a Q5) las da el esquema `v1` de `v1-cadena.sql` (§4.6). El esquema de v1 sigue en el repositorio, sin cambios, y rige.

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
# la foto de v1 (una vez) y la prueba contra ella
node scripts/linea-base.mjs generar --desde=cde8214   # docs/backend/linea-base/v1.json y v1/referencia/
npm run verificar:contrato                            # sección «A1»
zsh docs/backend/sql/herramientas/validar.sh .        # el esquema v1 de v1-cadena.sql en PostgreSQL 16
```

---

## 8. La prueba: `verificar-contrato` contra la línea base

> **Hecha (27-oct-2026).** `npm run verificar:contrato`, sección «A1 · Contrato v1». Lo que difiere del diseño está en §8.4.

**Qué asegura:** todo endpoint, campo, código, texto exigido y tabla de `cde8214` sigue existiendo igual, o está registrado como CAMBIADO o RETIRADO, con su reemplazo. Si alguien rompe el contrato sin registrarlo, la prueba falla y dice qué rompió.

### 8.1 Los archivos, al lado

1. **[`linea-base/v1.json`](linea-base/v1.json)**, la foto de v1, generada **una vez** con `node scripts/linea-base.mjs generar --desde=cde8214` (lee con `git show` y `git archive`) y guardada en el repositorio: la prueba no depende del historial de git. Trae:
   - `rutas`: los 41 `GET` de `contrato.ts` (ruta y constante), las 9 escrituras de `escrituras.ts` y las rutas que nombra `CONTRATO.md` (98 en total, contando las repetidas entre orígenes);
   - `formas`: por endpoint, cada ruta de clave de los casos de la referencia de v1 con su tipo JSON (`$.datos[].costoFalla: number`), con las claves de diccionario normalizadas (`$.refs.eventos.{k}`): 1.529 claves en 11 endpoints;
   - `textos`: los 621 textos del motor que la referencia de v1 exigía, como plantilla (los ids de equipo son `ID` y los números `#`);
   - `campos`: los campos de primer nivel, y si son opcionales, de los 78 tipos que viajan (los que nombran `contrato.ts` o `escrituras.ts`), por archivo (`entities/pozos.ts:Respuesta`);
   - `codigos`: los 20 códigos de la tabla «Error único» de v1, con su HTTP;
   - `capacidades`: las 9 de v1 y el reparto por rol;
   - `sql`: las tablas y columnas de `simulador-api/esquema.sql` con su tipo, y las 32 columnas de `v_procedencia`.
2. **[`linea-base/v1/referencia/`](linea-base/v1/referencia/)**: la referencia de v1 tal cual (C18).
3. **[`cambios-contrato.json`](cambios-contrato.json)**, el registro legible por la máquina, gemelo de las tablas de este documento: una entrada por cambio, `{ id, tipo: AGREGADO | CAMBIADO | RETIRADO | VERSION, objeto, clave, fecha, commit, motivo, reemplazo, resuelto?, efecto?, viejo?, enContratoTs? }`. Ejemplos:
   - `{ "id": "C1", "tipo": "CAMBIADO", "objeto": "campo", "clave": "/vistas/riesgo $.datos[].costoFalla", "resuelto": "al lado", "reemplazo": "costoFalla vuelve a su significado de v1 …; lo nuevo va al lado en costoFallaHoy" }`;
   - `{ "id": "R1", "tipo": "RETIRADO", "objeto": "ruta", "clave": "GET /mensajes", "fecha": "2026-10-27", "motivo": "el dueño decidió quitar el canal de WhatsApp: el backend no lo construye", "enContratoTs": "GET /mensajes" }`;
   - los textos llevan la plantilla vieja en la clave: `/vistas/riesgo $.datos[].motivo «… llega a su alarma en # h»` (C10).

### 8.2 Las comprobaciones

`scripts/linea-base.mjs` (`comprobarLineaBase`), llamada desde `verificar-contrato`:

| # | Comprueba | Falla si… |
|---|---|---|
| 1 | Cada ruta de v1 existe hoy en su mismo origen (`contrato.ts`, `escrituras.ts` o `CONTRATO.md`) | falta y no hay entrada RETIRADO o VERSION con esa clave (y, si es VERSION, la ruta nueva tiene que existir) |
| 2 | **Forma:** cada clave de `formas` existe hoy con su tipo en algún caso del mismo endpoint de `referencia/` (que `npm test` ata al motor de hoy: `referencia.mjs comprobar`) | una clave falta o cambia de tipo sin entrada CAMBIADO o RETIRADO |
| 3 | **Textos:** cada plantilla de `textos` sigue en la referencia de hoy, en la misma ruta del mismo endpoint. **Campos:** cada campo de los tipos que viajan sigue, y uno opcional en v1 no se vuelve obligatorio | un texto cambió sin entrada CAMBIADO con el viejo; un campo o un tipo se fue sin entrada |
| 5 | Cada código de `codigos` sigue en «Error único» de `CONTRATO.md` con su HTTP | falta o cambió de HTTP sin entrada |
| 6 | Las 9 capacidades siguen y ningún rol visible pierde una | se quitó una sin entrada |
| 7 | **SQL de v1:** cada tabla y columna sigue en `simulador-api/esquema.sql` con su tipo, y el esquema `v1` de `v1-cadena.sql` da cada tabla y `v_procedencia` con las columnas de v1 **en su orden** | falta, cambió o cambió de orden sin entrada |
| 8 | **Lo RETIRADO** sigue en `CONTRATO.md` con la marca (en la línea o en el título de su sección), está en `RETIRADAS` de `contrato.ts` cuando v1 lo declaraba ahí, y el front no usa su constante | se borró del todo, falta la marca o el front lo sigue usando |
| 9 | **WhatsApp** (§6.5 del prompt): 0 en `src`; en `e2e`, solo guardas de que no vuelve (`!t.includes('WhatsApp')`, `toHaveCount(0)`, las listas `no:` del auditor); en `CONTRATO.md` y en `docs/backend/sql/`, cada mención junto a la marca RETIRADO | aparece fuera de eso |
| 10 | El registro está sano: cada entrada con id, objeto, clave, fecha, commit (o «pendiente»), motivo y, salvo AGREGADO, reemplazo; sin dos entradas con la misma clave | falta un dato |

Además, en la misma sección: C1, C2, M6, M8 y `RETIRADAS` con sus datos (§9.4).

### 8.3 Cómo se prueba la prueba

En `verificar-contrato` se corren mutaciones en memoria (no en disco), y cada una tiene que dar FALLA sin su entrada y pasar con ella:
- quitar una clave de la forma (`/vistas/riesgo $.datos[].bblDia`);
- cambiar un texto (el primero de v1 que sigue igual hoy);
- borrar una ruta (`GET /vistas/riesgo` de `contrato.ts`);
- y nombrar el canal en una pantalla: una falla más en la comprobación 9.

### 8.4 Lo que no asegura (dicho para no prometer de más)

- **Los números de v1 no se comparan (la comprobación 4 del diseño no se hizo).** Para hacerlo había que correr los casos de v1 con el motor de hoy y los insumos de v1; pero el catálogo, la configuración, la topología y la locación de los pozos los da el código de hoy, no los insumos (C18 los cambió), y la mezcla daría números que no son ni de v1 ni de hoy. Los números se aseguran contra la referencia de hoy (`npm test`), y las correcciones de cálculo están registradas (C5 a C8).
- **La forma se compara por endpoint, contra la referencia de hoy** (la unión de sus casos), no caso por caso con los insumos de v1: por eso las 59 claves de `riesgo/` y `salud/` que con los datos de hoy no salen en el mismo caso sí están en otro caso del mismo endpoint, y no cuentan como cambio de forma.
- **Los textos se comparan como plantilla** (sin ids ni números). Un texto de v1 que hoy sale con otros datos (otro tag, otro respaldo) cuenta como cambio y queda registrado como C18; los cambios de redacción, como C9, C10 y C11.
- **No ve campos que ningún caso de la referencia trae ni tipos que no son `interface`** (por ejemplo `Invitacion`, que es un `Pick`): para esos manda el registro (R3) y `CONTRATO.md`.
- **El orden exacto de las columnas en PostgreSQL** lo prueba `validar.sh` (`comprobar-v1.mjs`); `verificar-contrato` lee el texto de `v1-cadena.sql`.

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
| M6 | **Las paradas por confirmar como número**, con la hora límite | sup (número principal) y prod (apoyo 1) | Campo opcional `porConfirmar` en `GET /vistas/hoy` | — | **Construido (A1, §9.4).** Es la cuenta que `inicioDe` (`entities/hoy.ts`) ya hacía para la frase del supervisor. |
| M7 | **Las fallas por mes** de los equipos críticos, en el motor | jefe (apoyo 2); es el primer indicador del norte (PM §1) | `GET /api/vistas/fallas/mensual?campos` | — | `historialDeEquipo().eventos`. Hoy la cuenta por mes la hace la pantalla (`pages/Confiabilidad.tsx`, «Fallas por mes»), y eso va contra la regla «el motor calcula». |
| M8 | **El estado de la configuración** («3 de 6 pasos listos»), encontrado al cruzar | adm (número principal) | `GET /api/vistas/configuracion/estado?campo` | — | **Construido (A1, §9.4)** con `estadoConfiguracion()` (`entities/choke-config.ts`); la pantalla lo lee con `useEstadoConfiguracion` (B2 la cambia). |

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

**Para la prueba (§8):** cada M ya construida está en `cambios-contrato.json` como AGREGADO (M1 a M8, y A2-1, A2-2, A2-3 y A3-1), con su caso en `referencia/`. Lo construido: §9.2 (A3), §9.3 (A2) y §9.4 (A1).

**No entra aquí** (está en la escalera o en roles apagados, no en lo necesario):
- el programa del técnico y su cumplimiento;
- las rutas predictivas;
- trabajar sin señal;
- el paquete de métricas de la operadora;
- el historial de envíos a la ANH;
- «¿alcanza?» y pedir el repuesto (plan, apagada);
- las paradas de un tercero (cont, que sale).

### 9.2 A3 · Lo construido: M2 a M5 y «Contestar» en 1 toque (27-oct-2026)

**AGREGADO al lado.** Nada de v1 cambia de forma; la única regla que se relaja es la de A3-1 (abajo). Lo de §9.1 era
la propuesta; esto es lo que quedó, con su prueba (`verificar-contrato`, sección «A3 · Las acciones que faltan» y la
H de A3 con la fuente http) y su caso en `referencia/`. El detalle, en `CONTRATO.md`, «A3 · Las acciones que faltan».

| # | Qué | Ruta o campo (AGREGADO) | Capacidad | Rechazos (código) | Caso en `referencia/` | ¿lo usa lo necesario? |
|---|---|---|---|---|---|---|
| A3-1 | **«Contestar» en 1 toque** (oper y tec): la parte se guarda sola; lo que vio es la pregunta siguiente, opcional | `POST /api/paradas/:evento/vio` `{ modo, texto? }` → `{ respuesta }` (con `modo` y `vio: { por, porId, hora, texto? }`); en `POST /api/paradas/:evento/respuesta`, `modo` pasa a opcional con `parte` | `causa:declarar` | 400; 403 `rol-desconocido`, `sin-capacidad`, `sin-permiso`; 404 `no-encontrado`; 409 `ya-dicho`; 422 `sin-parte`, `modo-ajeno`, `texto-corto`, `texto-largo` | `escrituras/400-vio-…` a `422-vio-modo-ajeno` (6) | **AGREGAR AHORA** (oper y tec, acción principal). **Ojo:** un backend de v1 responde 422 a la parte sin modo hasta que adopte esto: es la única regla de v1 que se relaja |
| M2 | **Cerrar la orden en el teléfono** (tec) | `POST /api/sap/ordenes/:numero/cierre` → `{ orden, cierre }`; campo opcional `cierre` (y estado `CNF`, horas sumadas) en `GET /api/sap/ordenes` | `orden:cerrar` (nueva, tec) | 400; 403 `sin-capacidad`, `sin-permiso`, `ajena`; 404; 409 `ya-cerrada`, `sin-liberar`; 422 `actividad-ajena`, `parte-ajena`, `modo-ajeno`, `horas-invalidas`, `lectura-ajena` | `escrituras/400-cierre-…` a `422-cierre-horas-invalidas` (7) | **AGREGAR AHORA**. Por decidir: cómo viaja a SAP PM (confirmación y TECO) |
| M3 | **La respuesta de la ANH y la hora para corregir** (reg) | `POST /api/anh/respuestas` → `{ respuesta }`; `GET /api/vistas/anh/respuestas?campos&desde&hasta`; campo opcional `respuestaAnh` en `GET /api/vistas/anh/reporte` | `anh:enviar` (nueva, reg) | 400; 403; 404 `campo-desconocido`; 409 `ya-aceptada`, `hora-anterior`; 422 `falta-motivo`, `motivo-ajeno`, `estado-invalido`, `dia-invalido`, `hora-invalida`, `folio-ajeno` | `anh/respuestas-ceiba-2026-10` (vacía) y `escrituras/…-respuesta-anh-…` (5) | **AGREGAR AHORA**. A mano por ahora; los motivos son las reglas de rechazo de P1 §4.2 (NO VERIFICADO que la ANH use esas palabras) |
| M4 | **La conversión del árbol de la operadora** (adm), solo lo necesario | `POST /api/anh/conversion/importar` → `{ campoId, conversion, hallazgos, filas }` (no firma); `GET /api/vistas/anh/conversion?campo`; campo opcional `Config.conversionAnh` en `POST /api/configuracion` | `config:firmar` (la de v1) | 400; 403; 404 `campo-desconocido`; 422 `archivo-vacio` | `anh/conversion-ceiba` (vacía) y `escrituras/…-conversion-…` (4) | **AGREGAR AHORA**. Por decidir: aplicarla a las paradas (el evento no trae el código de la operadora) |
| M5 | **El tiempo fuera en sus 5 tramos** (jefe) | campo opcional `tramos` en `GET /vistas/relojes`: `{ deteccionH, administrativoH, logisticaH, reparacionH, arranqueH (número o null), sinDatoH, fallas, conCierre }` | la de la vista | — | `sap/relojes-ceiba-historia` y `sap/relojes-portafolio-historia` | **AGREGAR AHORA** (jefe, TIENE) |

**Capacidades nuevas** (de 14 a 16): `orden:cerrar` (tec) y `anh:enviar` (reg). Ningún rol pierde una.

**Ejemplos** (los rechazos salen tal cual de `referencia/escrituras/`):

```text
A3-1 POST /api/paradas/EV-2011-1002/respuesta        (x-rol: oper)
     { "evento": "EV-2011-1002", "campoId": "ceiba", "equipo": "P-201B", "texto": "", "parte": "sello" }
     → 200 { "respuesta": { "texto": "Sello mecánico", "parte": "sello", "por": "Jairo Peña · operador de campo", "porId": "oper",
                            "canal": "pantalla", "hora": "2026-10-02T14:00:00-05:00" } }          (1 toque: la parada queda identificada)
     POST /api/paradas/EV-2011-1002/vio        (x-rol: tec)
     { "modo": "ELP" }
     → 200 { "respuesta": { …lo mismo, "modo": "ELP", "vio": { "por": "Óscar Daza · técnico de mantenimiento", "porId": "tec", "hora": "…" } } }
     otra vez → 409 ya-dicho        (referencia/escrituras/409-vio-ya-dicho.json)

M2   POST /api/sap/ordenes/40012056/cierre        (x-rol: tec)
     { "actividad": "ajuste", "lecturas": [{ "tag": "PT-1011", "valor": 118 }],
       "inicio": "2026-10-02T10:00:00-05:00", "fin": "2026-10-02T12:30:00-05:00" }
     → 200 { "orden": { "numero": "40012056", "equipo": "K-101", "estado": "CNF", "horasReales": 2.5, "cierre": { … } },
             "cierre": { "orden": "40012056", "actividad": "ajuste", "lecturas": [{ "tag": "PT-1011", "valor": 118, "unidad": "psi" }],
                         "inicio": "…", "fin": "…", "horas": 2.5, "por": "Óscar Daza · técnico de mantenimiento", "porId": "tec", "hora": "…" } }
     con "parte": "sello" (K-101 no tiene catálogo) → 422 parte-ajena        (referencia/escrituras/422-cierre-parte-ajena.json)

M3   POST /api/anh/respuestas        (x-rol: reg)
     { "campoId": "ceiba", "dia": "2026-10-01", "estado": "rechazado", "motivo": "V-07", "recibida": "2026-10-02T13:30:00-05:00" }
     → 200 { "respuesta": { …, "n": 1, "limiteCorreccion": "2026-10-02T14:30:00-05:00", "por": "Iván Salas · cumplimiento regulatorio", … } }
     GET /api/vistas/anh/reporte?campos=ceiba&… → además "respuestaAnh": { "dia": "2026-10-01", "estado": "rechazado", "motivo": "V-07",
         "motivoTexto": "El detalle no es de su causa", "limiteCorreccion": "2026-10-02T14:30:00-05:00", "quedanMin": 30, "vencida": false, … }
     sin respuestas: "respuestaAnh" no viene (la pantalla dice «ANH: sin respuesta registrada»)

M4   POST /api/anh/conversion/importar        (x-rol: adm)
     { "campo": "ceiba", "texto": "Código;Descripción;N1;N2\nOP-101;Rodamiento;NP_SUP;Falla rodamiento/cojinete (bearing box)\nOP-103;Otra cosa;;\n" }
     → 200 { "campoId": "ceiba", "conversion": [{ "codigo": "OP-101", "n1": "NP_SUP", "n2": "NP_SUP/falla-rodamiento-cojinete-bearing-box", … },
             { "codigo": "OP-103", "descripcion": "Otra cosa", … }], "hallazgos": [{ "fila": 3, "codigo": "OP-103", "texto": "OP-103 queda sin equivalencia…", "bloquea": false }], "filas": 2 }
     POST /api/configuracion { "config": { …, "conversionAnh": [ …lo de arriba… ] }, "motivo": "…", "base": 1 }   → la versión firmada
     GET /api/vistas/anh/conversion?campo=ceiba → { "vigente": [ … ], "sinEquivalencia": [{ "codigo": "OP-103", "falta": "n1" }], "total": 2, "conEquivalencia": 1, "firma": { "version": 2, … } }

M5   GET /api/vistas/relojes?campos=ceiba&desde=2025-10-01…&hasta=2026-10-02… → además
     "tramos": { "deteccionH": 0.40, "administrativoH": 1.60, "logisticaH": null, "reparacionH": 8, "arranqueH": null,
                 "sinDatoH": 183.64, "fallas": 14, "conCierre": 0 }        (referencia/sap/relojes-ceiba-historia.json)
     Σ de los tramos con dato + sinDatoH = totalH. Con el cierre en el teléfono de una correctiva, su reparación es la del teléfono
     y la logística y el arranque dejan de ser null.
```

**Para `cambios-contrato.json` (§8.1):** A3-1, M2, M3, M4 y M5 entran como AGREGADO con estas claves y la fecha 2026-10-27.
A3-1 lleva además la nota de la regla relajada (`modo` opcional con `parte`).

### 9.3 A2 · Lo construido: el balance del choke, las pérdidas (M1), la jornada, «¿Está funcionando?» y las fallas por mes (M7) (27-oct-2026)

**AGREGADO al lado.** Nada de v1 cambia. Es lo que el dueño volvió a pedir (`CONSTRUCCION.md`): producido · diferido ·
perdido para los roles clave, por tramo y con la trazabilidad de sus causas. Lo de §9.1 (M1, M7) era la propuesta; esto
es lo que quedó, con sus pruebas (`verificar-libro` y `verificar-contrato`, secciones «A2», también con la fuente http)
y sus casos en `referencia/`. El detalle, en `CONTRATO.md`, «A2 · El balance del choke…».

**Un cambio frente a la propuesta de §9.1 (M1):** sin registros, la vista de pérdidas manda `bbl: null` y
`estado: 'sin-registro'`, **no** `bbl: 0`. Que nadie haya registrado una pérdida no prueba que no se perdió nada.

| # | Qué | Ruta o campo (AGREGADO) | Capacidad | Rechazos (código) | Casos en `referencia/` | ¿lo usa lo necesario? |
|---|---|---|---|---|---|---|
| A2-1 | **El balance del choke**: producido · diferido · perdido por campo y por tramo (yacimiento, pozos, planta, salida, sin identificar), lado a lado y nunca sumados, con el árbol de cada tramo (diferida → planeada → N1 → N2 → paradas con quién dijo qué; pérdida → tipo → registros) | `GET /api/vistas/balance?campos&desde&hasta` o `?campos&jornada=actual\|anterior` | la de la vista | — | `balance/` (6): La Ceiba y el portafolio en septiembre y octubre, La Ceiba en la jornada actual y la anterior | **AGREGAR AHORA** (ger, prod, sup, reg, jefe y conf) |
| M1 | **El registro de pérdidas** (pitera, derrame, tea, venteo, rechazo), por inserción y corregible con motivo (D1) | `POST /api/perdidas` → `{ perdida }`; `GET /api/vistas/perdidas?campos&desde&hasta` | `perdidas:registrar` (nueva: oper, sup y prod) | 400 `peticion-invalida`; 403 `rol-desconocido`, `sin-capacidad`, `sin-persona`, `campo-ajeno`; 404 `campo-desconocido`, `perdida-desconocida`; 409 `ya-corregida`; 422 `tipo-desconocido`, `tramo-desconocido`, `sin-donde`, `texto-largo`, `hora-invalida`, `en-el-futuro`, `fin-antes-de-inicio`, `volumen-invalido`, `sin-volumen`, `fuente-desconocida`, `sin-como`, `retirar-sin-corrige`, `falta-motivo` | `perdidas/` (4, vacías: el demo no inventa pérdidas) y `escrituras/…-perdida-…` (8) | **AGREGAR AHORA**. Por decidir con la operadora: cómo se estima cada tipo (TRIM no inventa una fórmula: la persona dice el volumen y cómo lo estimó) |
| A2-2 | **La jornada del supervisor** («Mi turno» y la entrega de turno) | `GET /api/vistas/jornada?campo&jornada=actual\|anterior`; campo opcional `Config.campos[campo].turnos` (`["06:00","18:00"]`) en `POST /api/configuracion` | `config:firmar` (la de v1) para el cambio de turno | 422 de `validarConfig` (hora que no es HH:MM, repetida, más de 4) | `jornada/` (4): La Ceiba y Morichal, jornada actual y anterior | **AGREGAR AHORA** (sup). Sin firma rige 06:00 y 18:00, y se dice |
| A2-3 | **«¿Está funcionando?»**: antes de TRIM, este mes contra la meta, lo ganado; por tramo | `GET /api/vistas/efectividad?campos`; campo opcional `Config.campos[campo].metas[].reduccionPct` en `POST /api/configuracion` | `metas:firmar` (la de v1) para la meta de reducción | 422 de `validarConfig` (fuera de 0 a 100 %) | `efectividad/` (2) | **AGREGAR AHORA** (ger y prod; Resultados) |
| M7 | **Las fallas por mes** de los equipos críticos, en el motor | `GET /api/vistas/fallas/mensual?campos` | la de la vista | — | `fallas/` (2) | **AGREGAR AHORA** (jefe, apoyo 2) |

**Capacidad nueva** (de 13 a 14): `perdidas:registrar` (oper, sup y prod). Ningún rol pierde una.

**Ejemplos** (del demo: La Ceiba, 2-oct-2026 a las 14:00; los rechazos salen tal cual de `referencia/escrituras/`):

```text
A2-1 GET /api/vistas/balance?campos=ceiba&desde=2026-10-01T00:00:00.000-05:00&hasta=2026-10-02T14:00:00.000-05:00
     → { "total": { "producido": { "exacto": 16941, "entero": 16941 }, "diferido": { "exacto": 1046.03, "entero": 1046 },
                    "perdido": null, "potencial": { "exacto": 17987.03, "entero": 17987 }, "sinExplicar": 0, "gasKpc": null, "sinFiscal": [],
                    "porTramo": [{ "tramo": "reservorio", "nombre": "Yacimiento", "diferido": { …, "entero": 0 }, "perdido": null },
                                 { "tramo": "pozo", "nombre": "Pozos", "diferido": { …, "entero": 118 }, "perdido": null },
                                 { "tramo": "planta", "nombre": "Planta", "diferido": { …, "entero": 573 }, "perdido": null },
                                 { "tramo": "exportacion", "nombre": "Salida", … "entero": 0 … },
                                 { "tramo": "sin-asignar", "nombre": "Sin identificar", "diferido": { …, "entero": 355 }, "perdido": null }] },
         "arbol": [{ "tramo": "planta", "diferida": { "nivel": "impacto", "valor": "diferida", "bblEntero": 573,
                     "hijos": [{ "nivel": "planeacion", "valor": "no-planeada", "hijos": [ …N1 → N2 → «paradas»: [{ "eventoId", "pozo", "bblEntero", "dijeron": [] }] ] }] },
                     "perdida": null }, "… 4 más"],
         "frase": "La Ceiba, octubre: produjo 16.941 bbl · quedaron diferidos 1.046 bbl · perdido: sin registro." }
     Cuadres: diferido = /vistas/diferidos = la raíz de /vistas/choke/arbol; cada tramo = el primer nivel del orden gestion;
     potencial = producido + diferido; potencial del libro = producido + diferido + sinExplicar; el perdido nunca entra.

M1   POST /api/perdidas        (x-rol: oper)
     { "campoId": "ceiba", "tipo": "pitera", "tramo": "pozo", "donde": "Línea de flujo de LC-07",
       "inicio": "2026-10-02T09:10:00-05:00", "fin": "2026-10-02T09:40:00-05:00",
       "volumen": { "bbl": 3.5, "fuente": "estimado", "como": "Charco de 3 × 2 m, de unos 2 cm" } }
     → 200 { "perdida": { "id": "PER-ceiba-0001", "n": 1, …lo mismo, "por": "Jairo Peña · operador de campo", "porId": "oper",
                          "rol": "oper", "hora": "2026-10-02T14:00:00-05:00" } }
     corregir (x-rol: sup): { …, "corrige": "PER-ceiba-0001", "motivo": "Se aforó el tanque: eran 5 bbl", "volumen": { "bbl": 5, "fuente": "medido", … } }
     → 200 { "perdida": { "id": "PER-ceiba-0002", "corrige": "PER-ceiba-0001", … } }; corregir otra vez la 0001 → 409 ya-corregida
     con x-rol: tec → 403 sin-capacidad          (referencia/escrituras/403-perdida-sin-capacidad.json)
     GET /api/vistas/perdidas?campos=ceiba&desde=…&hasta=…   (sin registros)
     → { "estado": "sin-registro", "bbl": null, "bblEntero": null, "gasKpc": null, "porTipo": [], "porTramo": [], "filas": [], "retiradas": [],
         "texto": "Sin registro de pérdidas en el período", … }

A2-2 GET /api/vistas/jornada?campo=ceiba&jornada=actual
     → { "jornada": { "desde": "2026-10-02T06:00:00.000-05:00", "hasta": "2026-10-02T18:00:00.000-05:00", "nombre": "De 06:00 a 18:00 del 2 de oct",
                      "turnos": ["06:00", "18:00"], "firmada": false, "enCurso": true },
         "porConfirmar": 3, "diferido": { "exacto": 655.34, "entero": 655 }, "perdido": null,
         "paradas": [{ "pozo": "LC-21", "inicio": "2026-10-01T18:20:00-05:00", "fin": null, "cuando": "Venía del 1 de oct, 18:20 · sigue",
                       "tramo": "sin-asignar", "cadena": [ …6 pasos con quién dijo cada uno… ], "estado": "pendiente", "bblEntero": 100, … }, "… 2 más"],
         "nota": "Horario por defecto, sin firmar: cambio de turno a las 06:00 y 18:00." }

A2-3 GET /api/vistas/efectividad?campos=ceiba,morichal,guacamayo,palmar,zarza
     → { "base": { "nombre": "jun a ago", "firmada": false, "fuente": "Los tres meses publicados antes de que entrara TRIM (jun a ago): …" },
         "antes": { "noPlaneadoDia": { "entero": 1381 }, "fallasMes": 5 }, "esteMes": { "mes": "2026-10", "noPlaneadoDia": { "entero": 1222 }, "fallas": 1, "parcial": true },
         "meta": null, "cumple": { "noPlaneado": null, "fallas": null },
         "ganado": { "bbl": { "entero": 9520 }, "dias": 31.6, "fallasAnticipadas": 5, "intervenidas": 5, "juzgadas": 7 },
         "porTramo": [{ "tramo": "planta", "antesDia": { "entero": 561 }, "ahoraDia": { "entero": 362 }, "ganadoBbl": { "entero": 7984 }, … }, …],
         "notas": ["Sin meta de reducción firmada en La Ceiba, …", "Muestra corta: TRIM lleva 32 días.", "Octubre va en curso: …"] }

M7   GET /api/vistas/fallas/mensual?campos=ceiba
     → [ …, { "mes": "2026-10", "nombre": "octubre", "parcial": true, "fallas": 1, "disparos": 0,
              "porFamilia": { "inyeccion": 1, "multifasica": 0, "electrosumergible": 0 }, "porTramo": { "planta": 1, … },
              "porEquipo": [{ "campoId": "ceiba", "equipo": "P-201B", "familia": "inyeccion", "tramo": "planta", "fallas": 1, "disparos": 0 }] } ]
```

**SQL (por decidir con el backend):** el registro de pérdidas pide una tabla por inserción (`perdida`: id, n, campo,
tipo, tramo, donde, evento, inicio, fin, bbl, gas_kpc, fuente, como, por, rol, hora, corrige, motivo, retirada) con la
regla «la que rige es la que nadie corrigió», como `clasificacion_paso`. No está en `docs/backend/sql/` todavía.

**Para `cambios-contrato.json` (§8.1):** A2-1, M1, A2-2, A2-3 y M7 entran como AGREGADO con estas claves y la fecha 2026-10-27.
M1 lleva además la nota del `null` (sin registro), que cambia la propuesta de §9.1.

### 9.4 A1 · Lo construido: M6 y M8, y lo de v1 (27-oct-2026)

**AGREGADO al lado.** Nada de v1 cambia de forma. Pruebas: `verificar-contrato`, sección «A1 · Contrato v1» (también recorre las dos en la ida y vuelta por JSON de la sección 2); casos en `referencia/`. El detalle, en `CONTRATO.md`, «A1 · Compatibilidad con la versión 1».

| # | Qué | Ruta o campo (AGREGADO) | Capacidad | Casos en `referencia/` | ¿lo usa lo necesario? |
|---|---|---|---|---|---|
| M6 | **Las paradas por confirmar como número**, con la hora límite | campo opcional `porConfirmar: { n, limite }` en `GET /api/vistas/hoy` (solo `rol=sup` y `rol=prod`) | la de la vista | `hoy/sup-*` y `hoy/prod-*` | **AGREGAR AHORA** (sup, número principal; prod, apoyo 1) |
| M8 | **El estado de la configuración** («3 de 6 pasos listos») | `GET /api/vistas/configuracion/estado?campo` → `EstadoConfiguracion` | la de la vista (403 con un campo ajeno, 404 con uno que no existe) | `configuracion/estado-<campo>` (5) | **AGREGAR AHORA** (adm, número principal) |
| C1 | **Si falla hoy**, al lado de lo de v1 | campo opcional `costoFallaHoy` en `GET /api/vistas/riesgo` | la de la vista | `riesgo/*` | lo pinta el front; `/vistas/riesgo` es de la ficha del gerente |

**Ejemplos** (del demo, La Ceiba, 2-oct-2026 a las 14:00):

```text
M6  GET /api/vistas/hoy?campos=ceiba&rol=sup → además
    "porConfirmar": { "n": 4, "limite": "2026-10-03T07:00:00-05:00" }
    (la misma cuenta de la frase: «Le faltan 4 paradas por confirmar: el reporte sale mañana antes de las 07:00.»)

M8  GET /api/vistas/configuracion/estado?campo=ceiba
    → { "campoId": "ceiba", "listos": 3, "total": 6,
        "pasos": [{ "paso": "perfil", "nombre": "Perfil del campo", "listo": true, "detalle": "firmado", "corto": "firmado", "firma": "administrador" }, "… 5 más"],
        "siguiente": "topologia", "falta": "Falta firmar a qué pozos sirve cada equipo.",
        "frase": "La Ceiba: 3 de 6 pasos listos. Falta firmar a qué pozos sirve cada equipo." }

C1  GET /api/vistas/riesgo?campos=morichal → la fila de P-201B:
    { …, "costoFalla": 2764.68, "costoFallaHoy": 1234.65, "colchonH": 10.05, "costoDe": "propio",
      "mdtFuente": "el promedio de sus 8 fallas cerradas, sin las 10 h que aguanta hoy el tanque" }
```

**WhatsApp fuera del motor** (§3): `entities/mensajes.ts` y `shared/api/mensajes.ts` se borraron; lo que se usaba se mudó a `entities/causas-sugeridas.ts`. Salió de `entities/hoy.ts`, `usuarios.ts`, `pozos.ts`, `escenarios.ts`, `roles.ts`, `reglas.ts`, `shared/config/region.ts`, `shared/api/escrituras.ts` y `contrato.ts`. Las pruebas de WhatsApp de `verificar-libro` y `verificar-contrato` se borraron; las de las causas sugeridas se quedaron.

