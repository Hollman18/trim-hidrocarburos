# 9. Cómo se comprueba que el backend da los mismos números

Un backend está terminado cuando **el front, apuntado a él, muestra exactamente lo mismo que el demo** con los mismos datos. Para llegar ahí hay cuatro comprobaciones, de la más barata a la más completa. Las cuatro ya existen en el repositorio.

## 9.1 Los números, por HTTP, en cualquier lenguaje (`referencia/`)

`referencia/` trae, para los cinco campos del demo, **lo que entra** y **lo que tiene que salir**:

- **36 archivos de insumos** (`referencia/insumos/`, listados en `referencia/indice.json` → `insumos[]`). Cada uno es `{ "endpoint", "respuesta" }` con la forma de los endpoints de insumo (capítulo 7.3): pozos y pruebas, eventos de los controladores, caídas de servicios, paradas de cada bomba, fiscal día a día, registro de campos, catálogo, configuración de arranque y respuestas; además, la locación de los pozos de Morichal (`morichal/locaciones.json`, sin endpoint todavía: 5E·H23) y los cuatro escenarios del choke (`escenarios/*.json`: lo que cambia sobre el arranque). Con ellos se carga la base de pruebas **sin leer TypeScript**.
- **252 casos** (`referencia/<familia>/*.json`, listados en `indice.json` → `casos[]`). Cada caso es `{ id, descripcion, endpoint, esperado }`:

| Familia | Casos | Qué prueba | Capítulo |
|---|---|---|---|
| `diferidos` | 6 | el libro del último mes cerrado (septiembre), por campo y del portafolio | 5A |
| `mensual` | 6 | la serie mes a mes, por campo y del portafolio | 5A |
| `diaria` | 6 | la producción día a día, por campo y del portafolio | 5A |
| `riesgo` | 6 | lo que se pierde ahora y lo que está en riesgo | 5B |
| `ciclo` | 6 | retorno ANTES / DURANTE / DESPUÉS del último mes cerrado, por campo y del portafolio | 11 |
| `prediccion` | 4 | la predicción de cada bomba si se para ahora (colchón, orden de cierre) | 5B |
| `salud` | 10 | bombas con la salud de cada parte y pozos con la de su electrosumergible | 5C |
| `aciertos` | 6 | el registro de predicciones del vigía y las fallas | 5C |
| `sap` | 12 | avisos y órdenes de SAP | 5D |
| `asignacion` | 60 | la asignación por pozo de cada mes cerrado | 5A |
| `choke` | 49 | la topología y sus propuestas, las capacidades, la tubería, la serie, el reparto, el mes a mes, la línea base y «si falla hoy», por campo y del portafolio | 5E |
| `anh` | 20 | las filas de `paradas_pozo` con su propuesta de seis pasos (14) y la calidad de la clasificación (6) | 5E |
| `choke-arbol` | 26 | el árbol de pérdidas en sus tres órdenes, por campo, del portafolio y de meses viejos | 5E |
| `agua-choke` | 5 | la tubería del agua de cada campo | 5E |
| `escenarios` | 30 | lo mismo con otros datos: las capacidades de antes (7), un cambio de lo que limita (2), un empate (3) y las correcciones de las personas sobre la clasificación (18) | 5E |

Con los insumos cargados en su servidor:

```bash
node scripts/referencia.mjs comparar --base-url=http://su-servidor:8080
```

pide cada `endpoint` (ya trae `/api/…` y la consulta) y compara:

- la respuesta tiene que **contener** lo esperado (puede traer más campos);
- los números valen iguales con una diferencia de hasta $10^{-6}$ **relativa** o $0{,}005$ **absoluta**;
- las fechas se comparan como **instante** (da igual la zona en que vengan, siempre que traigan zona);
- **el orden de las listas importa** (los Pareto, las filas de riesgo y las paradas vienen ordenadas por una regla: capítulo 5);
- sale con código 1 si algo no coincide, y dice qué caso y qué ruta del JSON.

Los casos de un escenario se comparan con ese escenario cargado (`--escenario=ID`: las capacidades de antes, el cambio de lo que limita, el empate o las correcciones, que traen lo que dijeron las personas). Las **escrituras rechazadas** van aparte: `referencia/escrituras/` trae 18 (de `400-peticion-invalida` a `422-texto-largo`), cada una con sus pasos y el HTTP y el código del contrato que tiene que responder; `--escrituras` las manda (escriben: hágalo contra una base de prueba). Con el servidor del demo dan 18 de 18.

El rango de los insumos es toda la historia del demo: del primer mes del calendario a `AHORA` = 2026-10-02 14:00 (−05:00). **Su servidor tiene que usar ese mismo «ahora» para estos casos** (el reloj fijo del demo; capítulo 2.6), o los períodos y los eventos abiertos medirán distinto.

> **Excepción conocida.** Las lecturas de las electrosumergibles (`referencia/insumos/<campo>/electrosumergibles.json`) no tienen endpoint todavía (`"endpoint": null`); el motor del demo las arma del pozo (`src/entities/esp.ts`). Los casos que las leen (riesgo, aciertos y la salud de los pozos de campos con electrosumergibles) lo dicen en su campo `requiere`. Capítulo 10.

## 9.2 El front contra su backend

En `.env.local` del front:

```bash
VITE_FUENTE=http
VITE_API_URL=http://su-servidor:8080/api
```

Con `npm run dev`, Vite manda `/api` a esa dirección por su proxy (no hay problemas de CORS en desarrollo) y no monta el simulador. Luego:

```bash
npm run e2e -- --project=dev
```

corre los flujos de navegador y el **auditor** (`e2e/auditor.spec.ts`): recorre cada rol en cada pantalla, en cinco anchos (1512, 1280, 1024, 768 y 390 px), y revisa que no haya texto cortado, solapado ni fuera de la pantalla, y que cada nivel vea lo que debe y no vea lo que no (`ASERCIONES` en `e2e/auditoria/rutas.ts`). Sus aserciones usan los datos del demo, así que el servidor tiene que servir los insumos de `referencia/insumos/`. Con `TRIM_URL` se apunta a un front que no esté en `http://localhost:5173`.

## 9.3 La forma del cable, sin backend

```bash
npm run verificar:contrato
```

prueba que cada endpoint de `contrato.ts` vuelve igual después de pasar por JSON (`revivir(JSON.parse(JSON.stringify(aDTO(x)))) = x`) y que la fuente http, contra un servidor de prueba, traduce 403/409/422 al mismo `{ ok: false, error }`. Hoy: **138 de 138 comprobaciones**, más **15 de 15** de la costura http de punta a punta (H1 a H5: el arranque, las consultas, un error del servidor, las escrituras rechazadas y el choke y el árbol por el servidor); sus secciones 10 a 15 son las del choke y la clasificación ANH (lo que el contrato rechaza, la respuesta de campo, el árbol de pérdidas, lo guardado paso por paso, permisos y topes, y que `--escrituras` vea un servidor que responde distinto). **Es la especificación ejecutable de lo que su servidor tiene que producir**: si duda de la forma de un campo, el `aDTO` de su códec es la respuesta.

## 9.4 Las reglas, en TypeScript

```bash
npm run verificar
```

corre `tsc -b`, el linter, `scripts/verificar-libro.mjs`, `scripts/verificar-arbol.mjs` y el contrato. `verificar-libro` hace **435 comprobaciones** del motor, de las reglas de escritura y del simulador (el número crece con cada corrección; el script imprime «N de N comprobaciones bien»). Sus secciones, que sirven de lista de lo que el motor garantiza:

| Sección | Qué garantiza |
|---|---|
| 1 | Identidades de cada mes y campo: $\text{potencial} - \text{real} = \sum \text{eventos}$ en mes entero; real + diferido + inventario = potencial cada día |
| 2 | El portafolio por período es la suma de los campos |
| 3 | Factor de asignación y custodia |
| 4 | Bombas: colchón previsto contra el que el tanque aguantó |
| 5 | Preguntas y no conformidades |
| 6, 6b–6f | Lo que entra a mano cambia el cálculo como debe: metas (la global es la suma), accesos, plan mes a mes, perfil de cada campo, sin meta firmada |
| 7 | Historia de fallas |
| 8, 8b | SAP, WhatsApp, aciertos y asignación oficial; huella, firma, accesos y mensajes |
| 9 | Reglas de causa y del motor |
| 10 | Datos que faltan, se pisan o no cuadran (un mundo de prueba con huecos a propósito) |
| 11 | Estado, dirección y costura |
| 12 | Pantallas |
| 13 | Componentes, accesibilidad y contraste |
| 14 | Simulador del registro (peticiones malas, ingesta, semilla); una sola entrada de datos, capas y cachés |
| 15 | Costura asíncrona, contrato y escrituras |
| 16 | Las escrituras se limitan a los campos de la persona |
| 17 | Las fechas dicen lo mismo en todos los navegadores |
| 18 | Corrección del 8-oct: costo por falla «si falla hoy» (con el colchón del tanque), la electrosumergible que falló, causas que no dependen del orden de llegada, servicio todavía caído, fallas y disparos por equipo, banda sin verificar y «publicable» por campo |
| 19 | Corrección de la revisión del 8-oct: el tanque solo sube si entra agua (`Prediccion.llenado`), horas con una sola regla, instrumento sin lectura = `null`, equipos que fallaron sin costar crudo (`Libro.sinCosto`) |
| 20 | El demo con el agua de los campos colombianos (9-oct): los trenes de agua en equilibrio después de los cierres, el tope de 25 % a la reducción de frecuencia de una electrosumergible, el orden de cierre de los operarios (los más aguateros primero) y el efecto de la puesta en marcha (el diferido de alto impacto por día baja entre 15 % y 25 %) |
| 21 | Ciclo ANTES / DURANTE / DESPUÉS: retorno = suma de tramos; ANTES = Σ `costoFalla` de alto impacto en riesgo; DURANTE.bblDia = lo que se pierde ahora de alto impacto; cada plan `simulado === true` |
| 22 | Modelo choke: los cuatro tramos, la topología y «¿Dónde se trabó?» (5E.1, 5E.3) |
| 23 | Qué limita hoy: potenciales, gas sin medir, «casi iguales» y campo de gas (5E.2) |
| 24 | Lo que se perdió, por tramo y por escalón, con el total del libro (5E.4) |
| 25 | La tubería del campo, el mes a mes y antes → con TRIM (5E.6, 5E.8) |
| 26 | Qué limitó cada día y el aviso «Cambió lo que limita» (5E.8) |
| 27 | La tubería del agua (5E.6) |
| 28 | «Si falla hoy» para todos los equipos (5E.7) |
| 29 | El mercado, «Todavía no sé», las capacidades firmadas y lo que piden las pantallas (5E.1–5E.3) |
| 30 | El árbol de pérdidas del choke: cada barril cuelga de su tramo y de los pasos del árbol (5E.5) |
| 31 | Correcciones del QA: todas las vistas sobre las mismas filas, una cifra del norte y los bordes (5E.4) |

`npm run verificar:arbol` hace **128 comprobaciones** de la clasificación ANH (5E.9), en 14 secciones: la regla del slug reproduce los 117 códigos; cada N2 es de su N1; la coherencia planeada/N1 bloqueada; una comprobación por fila de `REGLAS_ANH`; una señal apunta, no prueba; el día operacional y la medianoche; la cascada de N pozos son N filas; la conciliación Σ por N1 = Σ por tipo de causa; las dos formas de salida; el porqué del choke guardado con la clasificación; «En el yacimiento» solo producción o confiabilidad; al operador nunca se le pide dónde se trabó; la respuesta de campo, «Algo está mal» y «Todavía no sé»; lo guardado paso por paso (QA-D1, QA-D2).

Las pruebas de navegador (`npm run e2e`) son **203** al 22-oct-2026, con las del choke y el árbol (`e2e/choke-*.spec.ts`, `e2e/arbol-identificar.spec.ts`, `e2e/correcciones-f3.spec.ts`). El esquema SQL se comprueba aparte con `docs/backend/sql/herramientas/validar.sh` (capítulo 3): **149 escrituras que la base tiene que rechazar y 26 que tiene que aceptar**, todas como se esperaba (`validacion.log`).

Un backend en otro lenguaje no corre este script; lo que tiene que dar está en `referencia/` y en las reglas de este documento.

## 9.5 Las identidades que su servidor debe cumplir siempre

Además de los casos, estas igualdades **tienen que valer para cualquier dato**, no solo para el demo. Conviene que su servidor las revise al cerrar cada mes y alerte si una falla:

| Identidad | Dónde se define |
|---|---|
| $\text{potencial}_{\text{mes}} - \text{real}_{\text{mes}} = \sum_{\text{eventos del mes}} \text{bbl}$ (mes entero, por campo, con fiscal todos los días; tolerancia $10^{-9}$ relativa en `verificar-libro`). Un día sin fiscal deja residuo = −(diferido de ese día) y el libro no se publica | 5A §3 |
| $\text{real}_d + \text{diferido}_d + \text{inventario}_d = \text{potencial}_d$ cada día con fiscal (el inventario del tanque de venta es la diferencia; en el mes entero suma 0) | 5A §3, §9 |
| $\sum_{\text{pozos}} \text{asignado}_{p} = \text{real}_{\text{mes}}$ (la asignación por pozo se escala con $k = \text{real} / \sum(\text{potencial}_p - \text{diferido}_p)$ y suma exacto lo medido) | 5A §10 |
| Aditividad: el libro de $[a, c)$ = libro de $[a, b)$ + libro de $[b, c)$ en real, potencial y diferido | 5A (`verificar-libro`, sección 12) |
| Portafolio = $\sum$ campos (barriles); la meta del portafolio = $\sum$ metas de los campos | 5A |
| Una parada que cruza el borde de dos meses no se suma entera a los dos (se recorta con el factor de cada mes) | 5B |
| La huella de un informe recalculada desde sus cifras da la misma huella | 5D |
| \(retornoBbl = ANTES.bbl + DURANTE.bbl + DESPUÉS.bbl\); ANTES = Σ `costoFalla` de alto impacto en riesgo; cada plan `simulado === true` (no entra al libro) | 11 |
| Σ de los barriles de las filas de `paradas_pozo` del período = diferido del libro (por campo, por día y en el conjunto) | 5E.3 |
| $\text{potencial} - \text{real} = \sum_{\text{tramo}} + \text{sin explicar} = \sum_{\text{escalón}} + \text{sin explicar}$ | 5E.4 |
| $\text{potencial del sistema} - \text{real} = \sum_{\text{tramo}} + \text{sin explicar} + \text{brecha de las pruebas} - \text{estructural}$ | 5E.4 |
| Cada nodo del árbol de pérdidas = Σ de sus ramas (barriles, filas, eventos, confirmado, no planeado); la raíz = diferido del libro, en los tres órdenes | 5E.5 |
| La cifra del norte es una sola: el escalón no planeado del reparto = la rama no planeada del árbol = Σ del mes a mes | 5E.4, 5E.8 |
| Lo que rige en cada fila, paso por paso = lo más reciente dicho en la fila o en su evento; nada de lo dicho por una persona se borra | 5E.9 |

## 9.6 Lista de aceptación

Su backend se puede entregar cuando:

- [ ] `node scripts/referencia.mjs comparar --base-url=…` sale con 0 (252 de 252, incluidos los 6 de `referencia/ciclo/` y los 30 de los escenarios, cada uno con su escenario cargado), y con `--escrituras` da 18 de 18.
- [ ] El front con `VITE_FUENTE=http` arranca (los diez GET del arranque responden) y `npm run e2e -- --project=dev` pasa.
- [ ] En Resumen gerente (`#/ger/resumen/…/curso`), con la lista de planes **plegada**, aparecen «bbl · retorno», chips Antes / Durante / Después / simulado, «Ver planes de acción» y «MEDIDO»; **no** el copy largo de un plan en cuerpo visible (capítulo 11 §11.1b; `e2e/auditoria/rutas.ts`).
- [ ] `GET /api/vistas/ciclo` y `POST /api/planes/:id` cumplen el capítulo 11 (estado persistido, no en la sesión del navegador).
- [ ] Cada escritura responde los códigos del capítulo 7.4 en el orden de 2.8 (capacidad → recurso → campo → conflicto → forma), con el error único y el `mensaje` en español sin detalles internos.
- [ ] Ninguna lectura devuelve datos de un campo que la persona no tiene.
- [ ] La clasificación ANH se guarda paso por paso y solo por inserción: un cambio sobre lo que dijo otra persona sin motivo da 409 `cambia-a-otra-persona`, y lo que se retira queda `retirado` con quién y por qué (5E.9).
- [ ] La topología y las capacidades del choke se firman con `POST /api/configuracion` y sus reglas 9 a 11 (5E.1, 5E.2).
- [ ] Las identidades de 9.5 valen en los meses cerrados de los datos reales del cliente.
- [ ] Los informes se registran con folio consecutivo y la huella la calcula el servidor (no el navegador).
- [ ] El webhook de WhatsApp rechaza sin firma válida, deduplica y resuelve el evento por `context.id`.
- [ ] Las fechas viajan con zona; los opcionales ausentes se omiten; el precio sin configurar nunca vale 0.
