# 5A.11 · Mapa de pantallas, el gráfico «Mes a mes» y los endpoints

---

### Qué ve cada rol

| Pantalla (ruta) | Roles (nivel) | Qué lleva del libro |
|---|---|---|
| Diferidos `#/ger/diferidos/<campo>/<período>` | Gerente (decisión) | Encabezado simple (sin «N sin identificar»), sello, rango con «Margen del cálculo»; «MES A MES» = Tendencia; «DÓNDE BAJARLO»; «POR EQUIPO» simple (sin tolerancia ni acumulado); «TIPO DE CAUSA» |
| Diferidos `#/prod/…`, `#/jefe/…`, `#/conf/…` | Producción, Mantenimiento, Confiabilidad (ingeniería) | Encabezado completo; «MES A MES» (columnas apiladas); Cuadre + («POR CAMPO» en portafolio \| «FACTOR DE ASIGNACIÓN» con un campo); «DÓNDE BAJARLO» + «TIPO DE CAUSA»; «POR EQUIPO» + «POR PARTE» |
| Producción `#/ger/produccion/…` | Gerente | Cabecera (sello, producción real contra meta, potencial, real del último día) y «DÍA A DÍA» |
| Producción `#/prod/produccion/…` | Producción | Lo anterior + «MEDICIÓN OFICIAL» + (Cuadre en portafolio \| Factor con un campo) + «CUADRE DIARIO/MENSUAL» + «CUADRE · ASIGNACIÓN OFICIAL» |
| Resumen `#/ger/resumen/…` | Gerente | `ResumenDirectivo`: cifra, rango, valor, sello; «PROMEDIO DIARIO»; «CIERRE PROYECTADO» o «TOTAL DEL PERÍODO»; perdiéndose ahora y en riesgo (otro capítulo); alto impacto %, antes → con TRIM, mantenimiento proactivo (SAP, otro capítulo), Tendencia; «POR EQUIPO» (tres); «POR CAMPO» (portafolio) |
| Mantenimiento `#/jefe/mantenimiento/…` | Jefe de mantenimiento | Barra «diferido» contra el máximo y «del diferido, programado» (5A.3) |

El auditor (`e2e/auditoria/rutas.ts`) exige, entre otras cosas: en `#/ger/diferidos/ceiba/curso` ver «MES A MES» y «DÓNDE BAJARLO» y **no** ver «FACTOR DE ASIGNACIÓN», «CADENA DE CUSTODIA» ni «Tolerancia»; en `#/ger/produccion/ceiba/curso` ver «DÍA A DÍA» y no «MEDICIÓN OFICIAL» ni «ASIGNACIÓN OFICIAL»; en `#/prod/produccion/ceiba/curso` ver «MEDICIÓN OFICIAL», «FACTOR DE ASIGNACIÓN» y «CUADRE · ASIGNACIÓN OFICIAL»; en `#/ger/resumen/ceiba~portafolio/curso` ver «barriles diferidos», «bbl · calculado», «PROMEDIO DIARIO», «producción … bbl/d meta …», «diferido … bbl/d máx. …» y «CIERRE PROYECTADO … meta 1.…».

---

### Gráfico «MES A MES» (ingeniería)

**Qué es.** Una columna por mes de la serie con lo diferido apilado por cómo se identificó, contra el máximo firmado de cada mes.

**Dónde se ve.** Diferidos (ingeniería) y `ResumenCampo` («DIFERIDO MES A MES»).

**Fórmula y dibujo.**

- Columna apilada: `identificado` (oscuro), `declarado` (gris claro), `pendiente` (rayado). La altura total es el diferido; el **rótulo** encima es la brecha en formato `k`: $\ge 1.000$ → `n1(v/1000)` + « k» («21,7 k»), si no `n0`.
- Raya del máximo: `meta.diferido` del mes (bbl, no por día) si el mes tiene meta en todos sus campos.
- ■ P3 encima si $\text{brecha} > \text{meta.diferido}$ y el mes **no** es parcial; título «Pasó el máximo de diferido firmado».
- Mes parcial: contorno punteado y «en curso» bajo el nombre.
- Eje: techo $= \text{tope}(1{,}12\cdot\max_m \max(\text{brecha}_m, \text{meta.diferido}_m))$ redondeado hacia arriba a 1; 1,5; 2; 2,5; 3; 4; 5; 6; 8 o 10 × potencia de diez; marcas en 0, la mitad y el techo.
- Los meses del período que se mira van al frente; los demás al 42 % de opacidad. El año va bajo el primer mes y bajo cada enero.
- Globo: título «Septiembre 2026»; pista «Mes en curso: cifras parciales, cierre sin publicar.» o «Clic para ver este mes»; filas «Diferidos», «Identificado por señal», «Declarado», «Sin identificar», «Alto impacto», «Máximo firmado» (o «sin meta firmada…»), «Eficiencia» (`n1` %), «Cierre: sin publicar \| publicable \| no publicable».

**Ejemplo (La Ceiba).** Rótulos de oct-25 a oct-26: 33,1 k ■ · 7,5 k · 23,1 k · 5,4 k · 23,3 k ■ · 20,1 k · 18,4 k · 13,5 k · 11,5 k · 60,6 k ■ · 6,8 k · 21,7 k · 3,0 k (en curso; pasa su máximo a la fecha de 1.267 pero no se marca por ser parcial). Agosto apila 6.613 por señal y 237 declarados.

**Quién lo calcula.** Front, con `GET /api/vistas/diferidos/mensual`.

**Referencia.** `src/widgets/diferidos/MesAMes.tsx`.

---

### Endpoints que alimentan este capítulo

| Endpoint | Devuelve | Lo consume | Tipo / módulo | Caso de `referencia/` |
|---|---|---|---|---|
| `GET /api/vistas/diferidos?campos&desde&hasta` | `Libro` completo (tramos por clave en `refs`) | Encabezado, Cuadre, Paretos, Palancas, Por campo, Producción (cabecera), Resumen | `libro()` · `src/entities/libro.ts:643` | `diferidos/<campo>-2026-09`, `diferidos/portafolio-2026-09` |
| `GET /api/vistas/diferidos/mensual?campos` | `[{ mes, corto, nombre, desde, hasta, parcial, libro: ResumenLibro }]` | Mes a mes, Tendencia, Factor, cuadre mensual | `serieMensual` · `:998` | `mensual/<campo>`, `mensual/portafolio` |
| `GET /api/vistas/diferidos/base?campos&desde&hasta` | `LineaBase` o `null` | apoyo «+44 % frente a jul a sep» | `lineaBase` · `:1022` | — |
| `GET /api/vistas/produccion/diaria?campos&desde&hasta` | `Dia[]` | Día a día, cuadre diario | `porDia` · `:924` | `diaria/<campo>-2026-09`, `diaria/portafolio-2026-09` |
| `GET /api/vistas/potencial-reciente?campos` | `{ campo: bbl/d }` | Configuración (referencia para fijar la meta) | `pedirPotencialReciente` | — |
| `GET /api/vistas/asignacion?campo&mes` | `AsignacionPozo[]` | Cotejo con la oficial | `asignacionPorPozo` · `:385` | `asignacion/<campo>-<mes>` |
| `GET /api/asignacion-oficial` (arranque) | `{ filas: FilaCargada[], cargas: CargaAsignacion[] }` | Cotejo, rastro | `asignacion.ts` | — |
| `POST /api/asignacion-oficial` | `{ filas, carga }` | Carga | `escrituras.ts:265` | `verificar` 8 |
| `GET /api/vistas/estado?campos` | `EstadoCampo[]` (`ayer`, `potencialBpd`, `perdiendoBpd`, …) | Real del último día, cierre proyectado | `estadoCampo` · `diferido.ts:553` | (riesgo) |
| `GET /api/catalogo` | `calendario`, `campos[c].medicion: { origen, banda, metrologia }` | Calendario, banda, Medición oficial | `catalogo.ts:78` | `insumos/arranque/catalogo.json` |
| `GET /api/configuracion/historial` (arranque) | versiones firmadas | metas, precio, criterio (`metaEn`, `precioEn`, `criterioEn`) | `configuracion.ts` | `insumos/arranque/configuracion-historial.json` |

Insumos del servidor (no los pide ninguna pantalla): `…/pozos`, `…/pozos/eventos`, `…/servicios/eventos`, `…/bombas/:equipo/paradas`, `…/produccion-diaria`, `…/metrologia` (`CONTRATO.md:833-919`; `referencia/insumos/<campo>/`).

**Reglas del cable para el libro** (`src/shared/api/contrato.ts:147-160`): fechas ISO con zona (`desde`, `hasta`, `tramos[].inicio/fin`, `preguntas[].inicio/fin` o `null`, `sinFiscal[].dias[]`); pozos y eventos por clave en `refs.pozos` (`campo/pozo`) y `refs.eventos` (id); `custodia.sinPrueba` y `estimados` como claves de pozo; `valorUsd` ausente si no hay precio; `real` y `residuo` del día `null` si no hay fiscal. La serie mensual no trae `tramos`, `porPozo`, `preguntas` ni `custodia` (con cinco campos pesaba 2 MB).

**Cómo comprobar un backend.** `node scripts/referencia.mjs comparar --base-url=URL`: la respuesta tiene que **contener** lo esperado; números con tolerancia $10^{-6}$ relativa o 0,005 absoluta; fechas como instante; el orden de las listas importa. Las identidades (potencial − real = Σ eventos en un mes; particiones del diferido; aditividad) están en `scripts/verificar-libro.mjs` secciones 1, 2, 3, 6b, 6f, 10 y 12.
