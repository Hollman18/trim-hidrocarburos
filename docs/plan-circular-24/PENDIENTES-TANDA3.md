# Lo que dejó abierto la tanda 3 (pantallas del choke)

Lo junta el coordinador a medida que cierran los agentes. Es la entrada de la tanda 4 (QA y cierre del motor).

## P2-UI · gerente, «Si falla hoy», diferidos por tramo (terminó 21-oct)

**Pedidos al motor y al contrato:**
1. ✅ **Hecho (F1, 22-oct).** La frase de U2 §6.5 la hace el motor: `CriticidadDelCampo.desembotellar` (`criticidad.ts`), «En La Ceiba, otra bomba de agua no sube la producción: evita que una falla cierre pozos. Hoy cada falla de P-201B cuesta unos 4.593 bbl. Para producir más…». La pinta `widgets/resumen/DondeSeTrabo.tsx`; se borró `paraProducirMas`.
2. ✅ **Hecho.** `FilaCriticidad.puesto` sale del motor (`criticidad.ts`), con `cambioHoy`, `proximoInstrumento` y `noIntervenir`. `widgets/riesgo/SiFallaHoy.tsx` ya no calcula el puesto ni las líneas de cada rol.
3. ✅ **Hecho el cruce:** `AvisoTrabajoCritico` (`criticidad.ts`, `CriticidadDelCampo.avisosTrabajo`), en la vista `/vistas/criticidad` y en la línea del jefe. ⛔ **«Proponer un plan» queda fuera de esta tanda** (decisión del coordinador): es otra escritura y no está en el contrato; la pantalla dice que el programa lo cambia el administrador con firma.
4. ⛔ **Fuera de esta tanda:** el gancho `EventoPerdida` necesita el registro de pérdidas, que todavía no existe; la línea de pérdida sigue con su estado vacío.
5. ⛔ **Fuera de esta tanda:** el vigía no deja un campo estructurado con lo que volvió planeado; sin él, la línea de U2 §7.3 no tiene de dónde salir.
6. ✅ **Hecho.** El motor dice lo de ahora en un servicio caído: «SE-2 está caído: se pierden N bbl/d ahora» (`FilaCriticidad.porque`, `criticidad.ts`). La pantalla lo pinta tal cual.

**Revisar en QA:**
- ✅ `src/widgets/diferidos/reparto.ts`: solo palabras y rellenos; la suma que hacía `leidoReparto` ahora la da el motor (`diferido`, Σ de los tramos del libro).
- ✅ ZA-06: «el comprador nominó menos» es mercado: afuera, subnivel mercado, `ext-transportador`, N1 `NP_TRANSP` «Restricción nominación/entrega» (`choke.ts` `choke.topologia@3`, fila `declarada-mercado` de `REGLAS_ANH@2`). Pruebas en `verificar-libro` §29 y `verificar-arbol`.
- ✅ Guacamayo: el crudo de la planta sube a 8.000 y la salida se queda en 7.500 (`planta.ts`); ya no hay empate artificial. U2 §2.9 con la cifra nueva; la referencia se regeneró a propósito.
- ✅ A 320 px, `widgets/ciclo`: revisado con el detector del auditor en Mantenimiento, Riesgo, Turno y Resumen: 0 hallazgos; no se reproduce.

## P4-UI · Filosofía operacional (terminó 21-oct)

**Datos del demo:**
- ✅ **Hecho.** Guacamayo: crudo de la planta 8.000, salida 7.500 (`planta.ts`, `caudales.crudoCap`). Referencia regenerada a propósito (`npm run referencia`).

**Motor:**
- ✅ **«Todavía no sé»:** se firma en `Config.topologiaPorSaber` y el motor no adivina: el paso 2 queda en `faltan` con la pregunta «¿Dónde se originó la parada…?» (`PREGUNTA_ORIGEN`), que contesta quien revisa; en «si falla hoy» va sin calcular (`choke.ts`, `criticidad.ts`). Pantalla (`BOTON`, `fraseDe`) y U2 §8.2 alineadas.
- ✅ **Equipos nuevos del registro:** con la topología firmada aparecen «sin responder», con lo que TRIM deduce, sin perder lo firmado (`sinResponderDe`, `GET /api/vistas/topologia` → `sinResponder`, `TopologiaPaso.tsx`).
- ✅ **La regla de la primera firma y la plantilla CSV** viven en el motor (`choke-config.ts`: `conTopologia`, `pendientesDe`, `faltanParaFirmar`, `plantillaTopologia`, `elementoDeRespuesta`, `respuestaDe`, `fraseDe`, `renglonDe`). `widgets/configuracion/topologia.ts` quedó con palabras solamente. La carga lee también «todavía no sé».
- ✅ **Nombres de código:** cada `fuente` de la tubería del campo y del agua va en palabras (`capacidades.ts`, `choke.ts`, `choke-agua.ts`); `verificar-libro` §29 lo prueba.

**Contrato y store:**
- ✅ `Config.capacidades` firmable (`capacidades.ts`; `validarCapacidades`, `revisarCapacidades`, `capacidadesQueBloquean`: 422 en la firma y en la vista previa), con el máximo diario de los últimos 30 días (`maximoCrudoDiario`) y la vista `GET /api/vistas/campos/:campo/capacidades`. El paso 2 escribe y revisa (`CapacidadesPaso.tsx`); se firma en el paso 3 con lo demás. La explicación de un empate va en la firma (`explicacionEmpate`), sin endpoint aparte.
- ✅ Store: `previsualizarConfig` e `importarTopologia` (y las escrituras del árbol) en `app/store.ts`.
- ⛔ **Fuera de esta tanda:** el borrador guardado en el servidor. Pide un recurso nuevo con su concurrencia; mientras tanto, lo contestado vive en el borrador de la sesión.

**Rutas y roles:**
- ✅ Dirección propia: pantalla `filosofia` (`#/adm/filosofia/…`), la misma vista que Configuración (el borrador no se pierde al pasar), marcada dentro de Configuración en el menú (`pantallas.tsx`: `DENTRO_DE`).
- ✅ Configuración para prod y conf en solo lectura (`roles.ts`: filosofía, técnica y metas); rutas del auditor agregadas.

**Revisar en QA:**
- ✅ El rótulo del «Esquema de planta» se queda: de él TRIM deduce a qué pozos sirve cada equipo, así que sí cambia cálculos.

## P1-UI · tubería del campo y del agua (terminó 21-oct)

**Motor (error confirmado por P1 y P2):**
- **ZA-06 («el comprador nominó menos») cae «en el pozo».** Es mercado → «afuera» (exportación, subnivel mercado), con responsable externo (U2 §1.1; R2 §2.2). Corregir `chokeDeCausa` y su prueba.

**Pedidos al motor y al contrato:**
- ✅ Tubería del campo (`choke.ts`, `TUBERIA`): `trenQueLimita`, `disponibleHoy` en crudo (con el agua de donde sale), `capacidades` (quién y cuándo las firmó), `pruebaMasVieja`, `medidor`; `Tuberia.tsx` los pinta y ya no recalcula el tren menor ni las sumas.
- ✅ Agua (`choke-agua.ts`): `estado` y `casiIgual` por tramo y `casiIguales`; `Agua.tsx` los pinta.
- ✅ «Perdiéndose ahora»: `desde` y `listaPozos`, más `perdiendoAhoraBpd` y `sinTramoAhoraBpd`.
- ✅ El empate se explica con la firma de las capacidades (`explicacionEmpate`), sin escritura aparte (decisión del coordinador).

**Fuera de sus archivos:**
- ✅ `Onboarding.tsx` tiene el texto de Agua.
- ⛔ `docs/backend/01` es de D1: no se tocó.

**Revisar en QA:**
- ✅ **Se deja el `!`.** `.solo-impresion` vive fuera de las capas a propósito: le gana a cualquier utilidad de pantalla. En una capa, los elementos que la combinan con `grid` o `flex` (hay) se verían en pantalla.
- ✅ `src/widgets/choke/palabras.ts`: solo textos y un predicado de presentación (`sinFirma`); ningún cálculo.

## P3-UI · árbol en Identificar, Turno y Confiabilidad (terminó 21-oct)

**Contrato y motor:**
1. ✅ **Hecho.** `POST /api/anh/paradas/:id/respuesta {pregunta, opcion}` (`escrituras.ts` `responderPreguntaAnh`, `responder` del motor): lo que TRIM deduce queda `declarado` con la persona en el porqué y lo avala quien revisa. «¿De dónde vino el corte?» se contesta en el campo. La causa y el detalle de la tabla (`raiz`, `detalle`) quedan para quien abre el equipo o revisa (`QuienContesta` `causa`), nunca el operador. Contrato, `CONTRATO.md`, SQL (`respuesta_campo`) y `verificar-contrato` §11.
2. ✅ **Hecho.** La conversación se guarda (`BorradorClasificacion.respuestas`) y se sigue al leer la fila: «¿Qué lo paró?» y sus siguientes llegan en la vista (`Preguntas.tsx`).
3. ✅ **Hecho.** `POST /api/anh/paradas/:id/revision {motivo, pedirA?}` (`ParadaAnh.revision`; SQL `revision_parada`, `revision_atendida`): «Algo está mal» en la tarjeta, «Pedir a producción» en el editor y la sección REVISAR en Identificar; queda atendida cuando el rol al que le toca escribe en la parada.
4. ✅ **Hecho.** `CONFIRMAN_LO_QUE_APUNTA`, `nombreDeRegla`, `esperaAQuienAbre`, `esNoSe`, `quienRevisa` y `esperaRevision` salen de `shared/api/arbol.ts`; se borraron las copias de `widgets/arbol/*`.
5. ✅ **Hecho.** Las escrituras del árbol van por `app/store.ts`; se borró `widgets/arbol/escribir.ts`. (De paso: guardar por evento cambiaba lo guardado después de leído y la vista quedaba vieja; corregido en `guardarClasificacion` y probado en `verificar-contrato`.)
6. ✅ **Decidido: no va.** «Si falla hoy» se queda en Riesgo para jefe y confiabilidad; Confiabilidad no lo repite.

**Coordinador (hecho):** los títulos y textos decían «REPORTE A LA ANH» y «CIERRE DE HOY PARA LA ANH». Ahora dicen «ÁRBOL DE CAUSAS» y «CIERRE DE HOY · PARADAS POR CONFIRMAR», y el reporte a la ANH queda como lo que sale de lo mismo (el norte). La prueba de P3 quedó ajustada.
