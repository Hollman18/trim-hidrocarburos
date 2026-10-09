# 9. Cómo se comprueba que el backend da los mismos números

Un backend está terminado cuando **el front, apuntado a él, muestra exactamente lo mismo que el demo** con los mismos datos. Para llegar ahí hay cuatro comprobaciones, de la más barata a la más completa. Las cuatro ya existen en el repositorio.

## 9.1 Los números, por HTTP, en cualquier lenguaje (`referencia/`)

`referencia/` trae, para los cinco campos del demo, **lo que entra** y **lo que tiene que salir**:

- **31 archivos de insumos** (`referencia/insumos/`, listados en `referencia/indice.json` → `insumos[]`). Cada uno es `{ "endpoint", "respuesta" }` con la forma de los endpoints de insumo (capítulo 7.3): pozos y pruebas, eventos de los controladores, caídas de servicios, paradas de cada bomba, fiscal día a día, registro de campos, catálogo, configuración de arranque y respuestas. Con ellos se carga la base de pruebas **sin leer TypeScript**.
- **116 casos** (`referencia/<familia>/*.json`, listados en `indice.json` → `casos[]`). Cada caso es `{ id, descripcion, endpoint, esperado }`:

| Familia | Casos | Qué prueba | Capítulo |
|---|---|---|---|
| `diferidos` | 6 | el libro del último mes cerrado (septiembre), por campo y del portafolio | 5A |
| `mensual` | 6 | la serie mes a mes, por campo y del portafolio | 5A |
| `diaria` | 6 | la producción día a día, por campo y del portafolio | 5A |
| `riesgo` | 6 | lo que se pierde ahora y lo que está en riesgo | 5B |
| `prediccion` | 4 | la predicción de cada bomba si se para ahora (colchón, orden de cierre) | 5B |
| `salud` | 10 | bombas con la salud de cada parte y pozos con la de su electrosumergible | 5C |
| `aciertos` | 6 | el registro de predicciones del vigía y las fallas | 5C |
| `sap` | 12 | avisos y órdenes de SAP | 5D |
| `asignacion` | 60 | la asignación por pozo de cada mes cerrado | 5A |

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

prueba que cada endpoint de `contrato.ts` vuelve igual después de pasar por JSON (`revivir(JSON.parse(JSON.stringify(aDTO(x)))) = x`) y que la fuente http, contra un servidor de prueba, traduce 403/409/422 al mismo `{ ok: false, error }`. **Es la especificación ejecutable de lo que su servidor tiene que producir**: si duda de la forma de un campo, el `aDTO` de su códec es la respuesta.

## 9.4 Las reglas, en TypeScript

```bash
npm run verificar
```

corre `tsc -b`, el linter, el contrato y `scripts/verificar-libro.mjs`: **327 comprobaciones** del motor, de las reglas de escritura y del simulador (el número crece con cada corrección; el script imprime «N de N comprobaciones bien»). Sus secciones, que sirven de lista de lo que el motor garantiza:

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

## 9.6 Lista de aceptación

Su backend se puede entregar cuando:

- [ ] `node scripts/referencia.mjs comparar --base-url=…` sale con 0 (116 de 116).
- [ ] El front con `VITE_FUENTE=http` arranca (los diez GET del arranque responden) y `npm run e2e -- --project=dev` pasa.
- [ ] Cada escritura responde los códigos del capítulo 7.4 en el orden de 2.8 (capacidad → recurso → campo → conflicto → forma), con el error único y el `mensaje` en español sin detalles internos.
- [ ] Ninguna lectura devuelve datos de un campo que la persona no tiene.
- [ ] Las identidades de 9.5 valen en los meses cerrados de los datos reales del cliente.
- [ ] Los informes se registran con folio consecutivo y la huella la calcula el servidor (no el navegador).
- [ ] El webhook de WhatsApp rechaza sin firma válida, deduplica y resuelve el evento por `context.id`.
- [ ] Las fechas viajan con zona; los opcionales ausentes se omiten; el precio sin configurar nunca vale 0.
