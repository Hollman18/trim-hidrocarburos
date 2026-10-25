# 5E.10 · Pantallas, endpoints y casos de referencia

El mapa de lo que el servidor tiene que servir para el modelo choke y el árbol de seis pasos: **13 lecturas y 7 escrituras nuevas**, cada una con su función del motor (la que el servidor reproduce), su forma en el contrato, las pantallas que la leen y los casos de `referencia/` contra los que se comprueba. El detalle de cada pantalla (capturas, textos por rol) es el capítulo 6D; aquí, lo que el backend necesita.

**La costura.** Cada lectura del front pasa por `src/shared/api/choke.ts` o `src/shared/api/arbol.ts`: con `VITE_FUENTE=http` pide la ruta y valida la respuesta con el códec del contrato; con `demo`, corre el mismo motor en el navegador. Así, `referencia/` es a la vez la respuesta esperada del servidor y la salida del motor del demo (`node scripts/referencia.mjs comprobar`).

---

### Las lecturas

| Ruta | Función del motor | Forma (contrato, Anexo A) | `shared/api` | Pantallas | Referencia |
|---|---|---|---|---|---|
| `GET /api/vistas/campos/:campo/tuberia?desde=&hasta=` | `tuberiaCampo` (`choke-reparto.ts:597`) | `TuberiaCampo` | `pedirTuberia` (`src/shared/api/choke.ts:126`) | Producción, Planta, Diferidos («Por tramo»), Resumen («Dónde se trabó»), Turno («Qué limita hoy»), Configuración (capacidades) | `choke/tuberia-{campo}-2026-09` (5) |
| `GET /api/vistas/campos/:campo/choke/serie?desde=&hasta=` | `serieChoke` (`choke-reparto.ts:724`) | `{ dias, cambios, vueltas }` | `pedirSerieChoke` (`:141`) | Producción («Serie») | `choke/serie-{campo}-2026-09` (5) |
| `GET /api/vistas/campos/:campo/agua` | `tuberiaAgua` (`choke-agua.ts:207`) | `TuberiaAgua` | `pedirTuberiaAgua` (`:152`) | Agua, Bombas, panel del equipo, Turno | `agua-choke/{campo}` (5) |
| `GET /api/vistas/campos/:campo/capacidades` | `vistaCapacidades` (`choke.ts:1546`), con `factorMedicionPropuesto` (`:1161`) | `VistaCapacidades`: lo que rige, con el factor de medición (`vigentes.factorMedicion`), quién lo firmó (`firmaFactor`) y lo que TRIM propone (`factorMedicionPropuesto`) | `pedirCapacidades` (`:167`) | Configuración → Capacidades (y el factor de medición) | `choke/capacidades-{campo}` (5), `escenarios/factor-de-medicion/capacidades-guacamayo` |
| `GET /api/vistas/criticidad?campos=` | `criticidadDelCampo` / `criticidad` (`criticidad.ts:326, 445`) | `{ ranking, campos }` | `pedirCriticidad` (`:188`) | Riesgo («Si falla hoy»), Bombas, panel del equipo, Resumen, Turno | `choke/criticidad-{campo}`, `criticidad-portafolio` (6) |
| `GET /api/vistas/choke/reparto?campos=&desde=&hasta=` | `brechaPorChoke` (`choke-reparto.ts:257`) | `BrechaChoke`, con `realPe`, `potencialPe`, `peCreible` y `textoPe` | `pedirRepartoChoke` (`:208`) | Producción («Escalera»), Diferidos, Resumen, Configuración | `choke/reparto-{campo}-2026-09`, `reparto-portafolio-2026-09`, `reparto-ceiba-2026-09-22` y `…-12a14` (lo sin explicar distinto de cero y por encima del 2,5 %) (8) |
| `GET /api/vistas/choke/mensual?campos=` | `repartoPorMes` (`choke-reparto.ts:683`) | `MesPorTramo[]` | `pedirRepartoMensual` (`:216`) | Producción («Mes a mes»), Diferidos, Resumen directivo | `choke/mensual-{campo}`, `mensual-portafolio` (6) |
| `GET /api/vistas/choke/base?campos=&desde=&hasta=` | `lineaBasePorTramo` (`choke-reparto.ts:694`) | `LineaBasePorTramo \| null` | `pedirBaseChoke` (`:236`) | Resumen («antes → con TRIM» por tramo) | `choke/base-{campo}-2026-09`, `base-portafolio-2026-09` (6) |
| `GET /api/vistas/choke/arbol?campos=&desde=&hasta=&orden=` | `arbolDelChoke` (`choke-arbol.ts:279`) | `ArbolChoke` | `pedirArbolChoke` (`:227`) | Producción («Ramas»), Regulatorio (árbol circular), Diferidos, Resumen | `choke-arbol/*` (26) |
| `GET /api/vistas/topologia?campo=` | `topologiaDe`, `porSaberDelCampo`, `sinResponderDe` (`choke.ts:412-429`) | `{ campoId, firmada, elementos, porSaber, sinResponder }` | `pedirTopologia` (`:269`) | Configuración → Filosofía operacional | `choke/topologia-{campo}` (5) |
| `GET /api/vistas/topologia/propuestas?campo=` | `propuestasTopologia` (`choke.ts:466`) | `PropuestaTopologia[]` | `pedirPropuestasTopologia` (`:292`) | Configuración → Filosofía operacional | `choke/propuestas-{campo}` (5) |
| `GET /api/vistas/anh/paradas?campos=&desde=&hasta=` | `paradasAnh` (`anh-paradas.ts:219`) con lo guardado | `ParadaAnh[]` | `pedirParadasAnh` (`arbol.ts:97`) | Identificar (`causa`), Turno (cierre del día) | `anh/paradas-*` (14) |
| `GET /api/vistas/anh/calidad?campos=&desde=&hasta=` | `calidadClasificacion` (`anh-calidad.ts:103`) | `CalidadClasificacion` | `pedirCalidadAnh` (`arbol.ts:136`) | Confiabilidad («Calidad de la clasificación») | `anh/calidad-*` (6) |

**Lo que comparten.** Los campos del parámetro son los de la persona: con uno ajeno, el contrato pide 403 `sin-permiso` (C-16; el demo, sin sesión, no lo puede probar). Los períodos son ISO (`desde`, `hasta`), los del calendario (`calendarioDe(ahora)`). Todas leen **las mismas filas ANH con la clasificación vigente** (QA-A-01): una corrección en Identificar mueve el reparto, el árbol, la tubería, el mes a mes, la base y la calidad a la vez. Rendimiento (QA-D7): ningún cálculo de más de 300 ms en el hilo principal; se calcula una vez por contexto y período, se guarda en memoria y se invalida con la versión de lo guardado.

---

### Las escrituras

| Ruta | Función (`escrituras.ts`) | Capacidad | Qué guarda | Referencia |
|---|---|---|---|---|
| `POST /api/anh/paradas/:id/clasificacion` | `clasificarParada` (`:893`) | `anh:clasificar` (sup, prod, oper, tec, jefe, conf) | pasos dichos, en fila, evento o cascada (5E.9) | `escrituras/403-paso-ajeno`, `409-cadena-cambio`, `422-clasificacion-incoherente`, `422-cascada-sin-ids`, `409-cascada-cambio`, `409-cambia-a-otra-persona`, `422-falta-motivo`, `422-texto-largo` |
| `POST /api/anh/paradas/:id/yacimiento` | `declararYacimientoAnh` (`:942`) | `anh:yacimiento` (prod, conf) | el paso 2 = yacimiento con su evidencia | `403-sin-capacidad-yacimiento` |
| `POST /api/anh/paradas/:id/respuesta` | `responderPreguntaAnh` (`:1006`) | `anh:clasificar` | la respuesta y el paso que determina | `409-pregunta-cerrada`, `422-pregunta-ajena` |
| `POST /api/anh/paradas/:id/revision` | `revisarParadaAnh` (`:1097`) | `anh:clasificar` | la marca de revisión | `422-texto-corto` |
| `POST /api/anh/paradas/confirmar` | `confirmarParadasAnh` (`:1179`) | `anh:clasificar` (una parada) o `anh:confirmar` (lote: sup, prod) | la confirmación por fila y el lote | `403-paso-ajeno-confirmar`, `409-lote-sin-pasos` |
| `POST /api/configuracion/vista-previa` | `previsualizarConfiguracion` (`:1269`) | `config:firmar` (adm) | nada (devuelve `ImpactoConfig`) | — |
| `POST /api/topologia/importar` | `importarTopologia` (`:1306`) | `config:firmar` | nada (devuelve `TopologiaLeida`) | — |

Comunes a todas: `400 peticion-invalida` (la forma), `403 rol-desconocido`, `403 sin-capacidad`, `404 no-encontrado` (una fila que no existe y una de un campo ajeno responden **lo mismo**, C-20). La topología y las capacidades se **firman** con `POST /api/configuracion` (5D.2), no con estas rutas.

---

### Las tablas del servidor

Lo que estas escrituras dejan, en `docs/backend/sql/esquema.sql` (capítulo 3): `topologia` y `topologia_por_saber` (`:1303-1377`), `capacidades_campo` y `capacidad_firmada` (`:1378-1436`), dentro de cada versión firmada; `causa_n1`, `causa_n2` y los demás catálogos de la ANH (`:2088-2178`); `confirmacion_lote` (`:2179`), `clasificacion_paso` (`:2199`), `respuesta_campo` (`:2389`), `revision_parada` (`:2430`) y `revision_atendida` (`:2462`); y las vistas `v_clasificacion_vigente` y `v_clasificacion_fuente` (`:3174-3190`). Las filas ANH, el reparto, el árbol y las tuberías **no se guardan**: salen del libro y de lo guardado cada vez.

---

### Cómo se comprueba

- `node scripts/referencia.mjs comprobar`: el motor de hoy contra `referencia/` (257 casos, 37 insumos; de ellos, 51 del choke, 20 de la ANH, 26 del árbol, 5 del agua y 33 de los escenarios: capacidades de antes 7, cambio de lo que limita 2, empate 3, factor de medición 3, correcciones 18). Falla también si ningún caso del reparto trae lo sin explicar distinto de cero o `cuadra: false` (5E·H37).
- `node scripts/referencia.mjs comparar --base-url=URL [--token=…]`: un servidor contra los mismos casos; `--escenario=ID` carga un escenario; `--escrituras`, las 18 escrituras rechazadas (escriben en el servidor).
- `npm run verificar:libro` (450 comprobaciones; la sección 32 es la de 5E·H9 y 5E·H30–H37), `verificar:arbol` (128) y `verificar:contrato` (141, con las cinco pruebas HTTP H1–H5 contra el servidor del demo).

Las cifras de este capítulo son las de esos casos (capítulo 9).
