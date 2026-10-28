# QA total de la experiencia v3

**27-oct-2026 · C1.** Revisión adversarial de la app construida (`main`, 262df1f + 6d8dc07).
- **Cómo:** los 9 roles que se ofrecen, a 1440 × 900 y 390 × 844, en claro y noche, con Playwright contra un Vite propio (5185).
- **Herramientas, para repetirlo:**
  - [`herramientas/qa-v3.mjs`](herramientas/qa-v3.mjs): el inicio de cada rol en los 4 casos (36 capturas), el auditor (`detector.ts`), lo que se ve sin desplazarse (`inicio.ts`) y las comprobaciones automáticas de X2. Resultado en [`qa-v3-medicion.json`](herramientas/qa-v3-medicion.json).
  - [`herramientas/qa-v3-flujos.mjs`](herramientas/qa-v3-flujos.mjs): los 10 flujos del top, medidos. Resultado en [`qa-v3-flujos.json`](herramientas/qa-v3-flujos.json).
- **Capturas:** en [`capturas/qa/`](capturas/qa/), con el nombre `<rol>-<ancho>-<claro|noche>[-entera].png` y `flujo-<n>-<rol>-<ancho>.png`.
- **Severidad:**
  - **S1:** rompe lo obligatorio (ANH, D1–D7, el contrato);
  - **S2:** lo necesario, el choke o la norma no se cumplen;
  - **S3:** se entiende peor o sobra.

**Resultado:** no hay S1. Se arreglaron 10 S2 y 2 S3, cada uno con su prueba en [`e2e/qa-v3.spec.ts`](../../e2e/qa-v3.spec.ts) (12 pruebas). Quedan anotados 2 S2 grandes y 11 S3.

---

## 1. Hallazgos arreglados

| # | Sev. | Qué estaba mal | Evidencia | Arreglo | Prueba |
|---|---|---|---|---|---|
| H-01 | S2 | **El operador, en el teléfono, no veía la franja ni la hora de los datos.** Una regla de CSS de la v2 escondía la cabecera cuando había pregunta (en la v2, «Pregunta 1 de 4» iba en la banda). En la v3 nadie la pintaba. Rompe X2 N2 y D3 y la imagen aprobada `d1-grafito-oper-telefono` | `[data-franja]` con `checkVisibility() = false` solo en oper a 390 | Se quitó la regla (`src/index.css`). El tope de palabras de oper sube de 72 a 80, con su porqué (`e2e/auditoria/presupuesto.ts`) | QA-01 |
| H-02 | S2 | **El supervisor no podía avisar a SAP desde Hoy** (FF-5). La línea «SAP no lo sabe · Avisar» salía solo si la bomba tenía una pregunta en su Hoy, y la de P-201B la debe quien la abre | Flujo 5, sup: «sin Avisar» y sin «Ver P-201B» | `AvisarParadas` (`pages/Hoy.tsx`): una línea por cada bomba parada que da el motor (`/vistas/lista-equipos`) | QA-02 |
| H-03 | S2 | **La ficha del gerente lo sacaba de «Todos mis campos»** (FF-9 seguía sin arreglar): al cerrarla quedaba en La Ceiba | Flujo 9: `#/ger/planta-viva/ceiba/curso` al cerrar | `useAcciones().abrir` conserva el alcance del portafolio (`widgets/plantaviva/acciones.ts`) | QA-03 |
| H-04 | S2 | **Confiabilidad y el supervisor no tenían el balance del choke** (producido · diferido · perdido por tramo, con su árbol), que CONSTRUCCION.md pide para ger, prod, sup, reg, jefe y conf. «Mi turno» trae solo el diferido y el perdido de la jornada | [conf, antes](capturas/qa/conf-1440-claro-entera.png) | El mismo `Balance` (`/vistas/balance`) en Confiabilidad y debajo de «Mi turno». [Después](capturas/qa/sup-1440-claro-entera.png) | QA-04 |
| H-05 | S2 | **Lo borrado seguía vivo:** «Equipos sin topología» en Confiabilidad (A-28) | Texto en `conf/confiabilidad` | Fuera de `widgets/arbol/Calidad.tsx`. El dato sigue en el motor | QA-05 |
| H-06 | S2 | **«Falta» tenía la forma de «sin comunicación»:** un círculo punteado, en otro color. En blanco y negro no se distinguen (X2 C8 y D2) | El estado de adm | `MarcaFalta` usa la marca «falta» de X2 (`MarcaCondicion`, el rectángulo discontinuo). [En gris](capturas/qa/gris-adm-1440.png) | QA-06 |
| H-07 | S2 · C3 | **«3 de 6 pasos» lo calculaba la pantalla:** `Configuracion.tsx` corría `estadoConfiguracion` en vez de leer `/vistas/configuracion/estado` | El código | Lee `useEstadoConfiguracion` (el campo y cada «otro campo»). Lo contestado en el borrador sin firmar solo cambia la frase de su paso; nunca la cuenta | QA-07 y `arreglos-f3-config` |
| H-08 | — · C3 | **¿Faltan `/vistas/perdidas` y `/vistas/anh/respuestas`?** No: lo necesario ya llega por el motor, por otra vía | — | **No se duplica.** La pérdida de prod, sup y reg va en el balance (`/vistas/balance`): su número por tramo y, en la trazabilidad, cada registro con quién y cuándo (`Traza` → `Perdidas`). La respuesta de la ANH de reg llega en `/vistas/reporte-anh` (`respuestaAnh`), con los minutos que quedan | `b3-roles` (la pérdida registrada queda en su tramo) y `b2-roles` (reg) |
| H-09 | S2 · C3 | **«Ver una por una» pedía `/opciones`** para un formulario muerto (`responde = false`) y la pista «Sospechosa», que sirve para contestar. Ahí no se contesta (FF-2, B-06) | El código | Se quitaron el formulario, la pista y el pedido. Quedan la evidencia de la parada (la señal y por qué no alcanzó) y la cadena con «Confirmar» y «Corregir», que es lo necesario. [Después](capturas/qa/una-por-una-sup-1440.png) | QA-08 y `arreglos-f1` |
| H-10 | S2 | **La trazabilidad tapaba la franja y oscurecía todo** en el escritorio (X2 N5) | La captura de la hoja con el velo | `Traza` es un panel no modal debajo de la cabecera, como la hoja del tramo. En el teléfono sigue la hoja modal. [Después](capturas/qa/traza-planta-prod-1440.png) | QA-11 |
| H-11 | S2 | **El número del técnico mentía:** al cerrar la orden de K-101, «5 cosas» seguía en 5. `pedirHoy` no le pasaba los cierres de orden a `pedirOrdenesSap` | En la app: 5 antes y después | `shared/api/hoy.ts` pasa `cierresOrden` y los suma a la versión. El contrato no cambia | QA-12 |
| H-12 | S3 | «Mi turno» decía «falta · falta · falta · falta» | [Antes](capturas/qa/sup-1440-claro.png) | «falta toda la cadena» (`widgets/hoy/vista.ts`) | QA-09 |
| H-13 | S3 | En «¿Está funcionando?», «Este mes 436» por encima de «Antes 391» y al lado «Ya se ganó 3.934» se leía como una contradicción. Lo ganado suma desde el arranque, no este mes | La tarjeta | «dejaron de diferirse **desde el 1 de septiembre**» | QA-10 |

## 2. Lo que no se arregló (anotado)

| # | Sev. | Qué | Por qué queda | Qué hacer |
|---|---|---|---|---|
| P-01 | **S2 grande** | **El kit SCADA no se usa en todas partes.** Quedan fuera del kit: `Sparkline` (la ficha del gerente, `PanelEquipo`); `BarraMeta` (`Planta`, `bombas/Detalle`, `resumen/PorCampo`); y gráficas a mano («Fallas por mes» de Confiabilidad, `Proyeccion`, `plantaviva/piezas` y `Planta`) | Son 7 archivos; es la tarea de `kit-scada.md` §7 | Pasarlos al kit y sumar la regla del auditor: ningún `<svg>` de indicador fuera de `shared/ui/scada` |
| P-02 | **S2 grande** | **Datos que el kit pide y el motor no da:** el rango del instrumento (hoy la escala dice «provisional»), «parado normal» contra «anormal» y la vigencia del tag para «sin comunicación desde HH:MM» | Son del motor y del backend | `kit-scada.md` §7.3 y X2 §7 |
| P-03 | S3 | conf · «decir qué se dañó» cuesta **3 toques**; FF-2 proponía 2 («Ver lo que le toca» → «Contestar yo» → la opción) | No es su tarea principal | Que «Contestar yo» vaya en la línea de «Le tocan…» |
| P-04 | S3 | Los planes: **2 toques** («Ver los planes» → «Aceptar»), contra 1 propuesto, y sin «Deshacer»: lo aceptado pasa a «Ya se hizo» | Son simulados y son escalón (necesario §3 y §5) | Decidir si se quedan en el primer nivel de sup y jefe |
| P-05 | S3 | El nivel 3 sigue con «Crear aviso en SAP» y «Enviar aviso a SAP»; Hoy dice «Avisar» (FF-5: un solo nombre). Avisar a SAP no tiene «Deshacer» | — | Un solo nombre |
| P-06 | S3 | El gerente abre en La Ceiba (1.966), no en «Todos mis campos» (2.650, el número del boceto §14) | Lo pone el campo por defecto del demo | Abrir en el portafolio cuando el rol tiene varios campos |
| P-07 | S3 | La franja cuenta «0 sin comunicación»: X2 §3.5 dice que lo normal no se cuenta | Lo fijan `armazon.spec` y la decisión D-1 | — |
| P-08 | S3 | N1: el nivel 1 pasa de 900 px en 8 de 9 roles a 1440 (alto de la vista: ger 1.184, prod 1.108, sup 1.487, oper 1.046, conf 2.798, tec 1.301, reg 1.658, adm 1.068; jefe 900). Lo necesario (número, apoyos y acción) sí cabe arriba en todos | La norma pide todo el nivel 1 sin desplazar | Plegar lo que va debajo de lo necesario |
| P-09 | S3 | T1: prod y sup tienen 5 cifras de 20 a 31 px en la primera vista (el tope es 4) | — | Bajar una a 18 px |
| P-10 | S3 | F5: las tarjetas de tarea («Diga qué se dañó en P-201B») llevan la marca del equipo (rombo de alarma), no la marca «falta» | La marca se lee como contexto, con su palabra | Decidirlo con Adair |
| P-11 | S3 | F4: «Pregunta **1** de 4» queda justo encima del rombo con «1» | — | Separarlos |
| P-12 | S3 | tec: con la primera pregunta ya abierta, su tarjeta sigue mostrando «Contestar» | — | Ocultarlo cuando está abierta |
| P-13 | S3 | El árbol dice «No planeada · No planeada - Proceso / Facilidades»: el código N1 de la ANH repite la palabra | Es el nombre oficial del código | Mostrar N1 sin el prefijo, solo en pantalla |

---

## 3. Lo necesario, rol por rol

Se comparó con `necesario-por-rol.md` §1 a §11 y §14, en las capturas `<rol>-1440-claro-entera.png` y `<rol>-390-claro-entera.png`.

| Rol | Número principal | Apoyos | Acción a 1 toque | CUÁNDO | ¿Cumple? |
|---|---|---|---|---|---|
| ger | 1.966 bbl/d (La Ceiba) · 2.650 (todos) | producción 10.700/10.900; cierre 293.287 «proyectado»; diferido 1.046 · 50 mil USD · máx. 1.267; «¿Está funcionando?»; pérdida «sin registro» | Ver P-201B | Metas y «Compartir el informe» a la vista | Sí (P-06) |
| prod | 9.394 de 11.857 bbl/d | por confirmar 4 (2 se confirman ya); 1.046 bbl · 355 sin identificar; si falla hoy 3.059; pérdida «sin registro» | Confirmar las 2 | «Fin de mes»: la asignación de septiembre y «¿Cuadra?» salen el 2 de octubre | Sí |
| sup | 4 por confirmar · antes de las 07:00 | ahora 1.966; no arrancar 2; sin causa 2 | Confirmar las 2 | «Mi turno» (06:00–18:00); «Entregar turno» arriba; el orden de cierre con P-201B parada | Sí, tras H-02 y H-04 |
| oper | Pregunta 1 de 4 | no arrancar 2 | La parte, con 1 toque | Orden de cierre; «Registrar una pérdida» | Sí, tras H-01 |
| jefe | Avisan 1 · K-101 · frenaría en la planta | por identificar 3; fallas críticas 1; espera 7,7 de 8,1 (abre los 5 tramos) | Ver la orden | «Ojo: no intervenir hoy» como línea | Sí. El balance, en su Resultados, a 1 toque |
| conf | Si falla hoy 3.059 bbl/d | vigía 3 de 3; sin instrumento 5; entre fallas 41 d; clasificación 0 de 7 | Abrir P-201A | — | Sí, tras H-04 (el balance va en Resultados → Confiabilidad) |
| tec | 5 cosas | no arrancar 2 | La parte, con 1 toque; Cerrar la orden | — | Sí, tras H-11 |
| reg | 2 paradas sin causa | 355 bbl; límite 07:00; respuesta de la ANH «sin respuesta registrada» | Exportar el reporte | El árbol de 6 pasos y el balance; la medición oficial, a un toque | Sí |
| adm | 3 de 6 pasos | 36 por confirmar (en su paso); 3 tags · Aplicar las 3 | Seguir el paso | La conversión del árbol y la jornada, a la vista | Sí, tras H-07 |

**Lo borrado no sigue vivo**, salvo A-28 (H-05, arreglado):
- la introducción (A-18) ya no sale aunque no esté marcada como vista;
- el perfil solo dice «Puede» (A-19, A-20);
- sin «Qué está en riesgo» ni el control Antes · Durante · Después (A-06, A-13; `b2` y `b3`);
- sin K-101 en el Hoy del supervisor (A-24);
- sin los porcentajes de Identificar para sup (A-29);
- WhatsApp: el grep da 0 en `src`;
- el índigo `#142d88` solo queda en un comentario.

**Nada obligatorio se perdió:** el reporte (C024 y DICC), D1 (quién dijo qué), la pérdida «sin registro» y el orden de cierre siguen ahí.

## 4. El choke y el balance

| Rol | Producido | Diferido y perdido, lado a lado | Por tramo | Trazabilidad a 1 toque |
|---|---|---|---|---|
| ger | 64.147 (todos) · 16.941 (La Ceiba) | 2.376 · «sin registro» | Sí | tramo → planeada → N1 → N2 → la parada, con quién y cuándo |
| prod | 16.941 | 1.046 · «sin registro» | Sí | Sí ([captura](capturas/qa/traza-planta-prod-1440.png)) |
| sup | 16.941 (mes) | jornada 655 · «sin registro»; mes 1.046 · «sin registro» | Sí (H-04) | Sí |
| reg | 16.941 | 1.046 · «sin registro» | Sí, más el árbol de la circular (Σ = 1.046) | Sí |
| jefe | 16.941 (Resultados) | 1.046 · «sin registro» | Sí | Sí |
| conf | 16.941 (Confiabilidad) | 1.046 · «sin registro» | Sí (H-04) | Sí |

- **Los tramos suman el diferido:** yacimiento 0 + pozos 118 + planta 573 + salida 0 + sin identificar 355 = 1.046.
- **El diferido y el perdido nunca se suman:** columnas aparte, y el panel lo dice.
- **Sin registro de pérdidas, la pantalla dice «sin registro» o «—» con «sin registro» debajo, nunca 0.** En las filas de tramo va «—».

## 5. «¿Está funcionando?»

- **Antes de TRIM:** 391 bbl/d no planeados (jun a ago) · 1 falla al mes.
- **Este mes:** 436 bbl/d · «sin meta firmada» · 1 falla.
- **Ya se ganó:** 3.934 bbl, que «dejaron de diferirse desde el 1 de septiembre» · 3 de 3 avisos acertaron.
- **En todos los campos:** 1.381 → 1.222, y 9.520 bbl ganados.
- «Por tramo», a un toque ([captura](capturas/qa/funcionando-tramo-ger-1440.png)).

**Se entiende con H-13:** este mes va por encima de la base (P-201B paró el 2 de octubre), pero desde el arranque se ganó. Sin meta firmada no se inventa una.

## 6. Los 10 flujos del top

Medidos con `qa-v3-flujos.mjs`, en un contexto nuevo por flujo. «Ahora» es la app con los arreglos de este documento.

| # | Rol · tarea | Hoy (antes) | Propuesto | Ahora 1440 | Ahora 390 | ¿Se cumplió? |
|---|---|---|---|---|---|---|
| 1 | Cambiar de pantalla en el teléfono | 2 | 1 | 1 | 2 | **No, por decisión del dueño** (decisión 4: panel lateral con ☰, sin barra abajo). oper, tec, reg y adm tienen una sola pantalla |
| 2 | Decir qué se dañó | 3 | oper y tec 1 · jefe y conf 2 · sup 2 | oper 1 · tec 1 · jefe 2 · sup 2 · conf 3 | igual (jefe +1 desplaz., sup +2, conf +1) | Sí, salvo conf (P-03) |
| 3 | Decidir los planes de P-201B | 3 + 1 a 4 desplaz. | 1 | 2 | 2 + 1 desplaz. | A medias (P-04) |
| 4 | Entregar el turno (sup) | 2 + 2 desplaz. (teléfono) | 2 | 2 + 1 desplaz. | 2 + 1 desplaz. | Sí: «Entregar turno» arriba. El desplazamiento es hasta «Compartir en PDF» dentro del resumen |
| 5 | Avisar a SAP | 3 | 1 | jefe 1 · conf 1 · sup 1 · oper 2 | igual (+1 desplaz.) | Sí, tras H-02. oper va por la ficha: avisar no está en su lo necesario (§4) |
| 6 | La orden de K-101 | 2 (callejón para tec) | sup, jefe y conf 0 · tec 1 | sup 0 · conf 0 · jefe 1 (es su acción principal) · tec 3 | igual | Sí. tec: 3 toques (abrir, qué hizo, cerrar), pero ya no es callejón; el número baja (H-11) |
| 7 | reg · pedir la causa | imposible | 1 | — | — | **Cambió el objetivo:** necesario §10 quitó «Pedir» a propósito (la pregunta ya le sale a quien la debe). La fila abre la ficha (1 toque) para la evidencia |
| 8 | conf · qué atacar primero | 4 a 7 desplaz. | 0 desplaz. | 0 desplaz. · 1 toque | 0 · 1 | Sí. P-201A sale en la frase, el botón y la 1.ª fila; el bloque de abajo se fue |
| 9 | ger · quién está en ello | 3 · 4 + 1 desplaz. | 2 | 2 | 2 | Sí, tras H-03 |
| 10 | prod · confirmar las paradas del día | 2 | 1 | 1 | 1 | Sí |

## 7. ISA-101: las 44 comprobaciones (X2 §6)

Medido en los 9 inicios (36 capturas), el nivel 3 de P-201B, Planta y Configurar.
- **El auditor** (`e2e/auditor.spec.ts`, 100 rutas): 0 hallazgos en los inicios, y su spec pasa.
- **`npm test`:** verificar-kit, con la paleta medida en `medicion-final.txt`.

| ID | Comprobación | Resultado | Evidencia |
|---|---|---|---|
| C1 | Ningún texto en color de condición | **Cumple** | 0 textos en las 36 capturas (`qa-v3.mjs`, `c1`) |
| C2 | Toda forma de color con nombre o palabra al lado | **Cumple** | Auditor, regla «color»: 0 |
| C3 | Píxeles saturados ≤ 3 % (≤ 0,5 % sin nada anormal) | **Cumple** | 0,03 % (oper) a 0,76 % (sup) a 1440, contando el botón petróleo |
| C4 | Un color de condición no se usa para otra cosa | **Cumple** | Auditor «color»; los tokens de estado solo en `MarcaCondicion` y la franja |
| C5 | El acento solo para el foco y lo seleccionado | **Cumple** | 0 marcas de estado en el acento (`acentoEnMarca`); el acento queda a 12,47 o más de cada estado |
| C6 | Contraste de forma, número y texto | **Cumple** | `medicion-final.txt`: tinta3 ≥ 4,95; alarma 3,92; el amarillo con trazo, 11,64 |
| C7 | Daltonismo ≥ 10 en el peor caso | **Cumple** | Peor caso 11,13 (interlock contra sin comunicación, tritanopía) |
| C8 | En blanco y negro se distingue | **Cumple, tras H-06** | [Equipos en gris](capturas/qa/gris-equipos-jefe-1440.png) y [Configurar en gris](capturas/qa/gris-adm-1440.png) |
| F1 | La marca lleva su palabra en listas y fichas | **Cumple** | Auditor «color» |
| F2 | El mismo equipo tiene la misma condición en todas partes | **Cumple** | P-201B: alarma en la franja, Hoy, Equipos, nivel 3 y Resultados; LC-21: atención |
| F3 | Una sola condición por equipo | **Cumple** | El motor da una (`franja().equipos`) |
| F4 | Los dígitos 1–3 en una forma no se confunden con rótulos | **A medias** | P-11 |
| F5 | Una tarea lleva la marca «falta» | **A medias** | P-10 |
| E1 | Relleno por estado, en marcha contra parado ≥ 3:1 | **Cumple** | 7,03:1 |
| E2 | Sin comunicación: «---» y «desde HH:MM» | **A medias** | El kit lo pinta (verificar-kit). El motor no da la vigencia del tag (P-02) |
| E3 | Equipo parado: sus variables sin marca propia | **Cumple** | [Nivel 3 de P-201B](capturas/qa/p201b-nivel3-1440-claro.png): «parada: en gris y sin marca» |
| E4 | Sin sombra ni halo en el SVG del proceso | **Cumple** | 0 `filter` en los SVG de las 12 pantallas medidas |
| E5 | La caja no se tiñe; marca arriba a la izquierda; anillo solo con P1 | **Cumple** | La tubería de prod y ger: la planta con contorno de 2 px y el rombo arriba a la izquierda |
| E6 | Interlock solo con primera alarma registrada o disparo del SIS | **No se puede comprobar en el demo** | No hay interlock en los datos; el motor no lo inventa (X2 §4.2) |
| I1 | La escala no se mueve con el valor | **A medias** | La escala es fija, pero «provisional»: falta el rango del instrumento (P-02) |
| I2 | Puntero y número en tinta | **Cumple** | verificar-kit: «cifra anormal: nunca en color» |
| I3 | Banda normal con sus rayas; el disparo se distingue | **A medias** | La banda y las rayas, sí; el disparo no llega del motor (`sinDisparo`) |
| I4 | Un hueco corta la línea, nunca es 0 | **Cumple** | verificar-kit y el libro |
| I5 | La tendencia dice su ventana; ≤ 4 trazas | **Cumple** | «tendencia de 12 días», 1 o 2 trazas |
| I6 | Cada variable de la placa con su minigráfica | **Cumple** | Nivel 3: cada señal con su tendencia |
| I7 | Lo proyectado o simulado, discontinuo, con su palabra y más chico | **Cumple** | «proyectado» a 26 px contra el número principal a 60; «simulado» en los planes |
| N1 | El nivel 1 cabe sin desplazar | **A medias** | P-08; a 390, la franja, el número y la acción caben en todos |
| N2 | La franja en todo nivel 1, 2 y 3, en el mismo lugar | **Cumple, tras H-01** | `[data-franja]` visible en los 36 casos y en el nivel 3 |
| N3 | Franja → lista → ficha, 1 clic cada uno | **Cumple** | `armazon.spec` |
| N4 | ≤ 4 niveles | **Cumple** | El más hondo es el diagnóstico (nivel 4) |
| N5 | La ficha no tapa la franja ni oscurece | **Cumple, tras H-10** | La ficha, la hoja del tramo y ahora la trazabilidad, sin velo en el escritorio. En el teléfono, hoja modal (decidido) |
| N6 | El mismo lugar se llama igual | **Cumple** | «Equipos», «Hoy», «Resultados» en todos los roles |
| T1 | ≤ 1 cifra de 32 px o más y ≤ 4 de 20 a 31 px | **A medias** | 1 grande en todos; prod y sup tienen 5 medianas (P-09) |
| T2 | Todo valor con `tabular-nums` | **Cumple** | 0 cifras sin tabular en las 36 capturas |
| T3 | Nada bajo 12 px | **Cumple** | 0 textos bajo 12 px |
| T4 | Unidad, contexto, calidad y vigencia | **Cumple** | bbl, bbl/d, «medido», «proyectado», «calculado», «datos de las 14:00» |
| D1 | Lo calculado y lo simulado lo dicen; lo medido, no | **Cumple** | «calculado entre 889 y 1.203», «simulado», «medido» |
| D2 | Sin comunicación, inválido, campaña y falta se ven distintos | **Cumple, tras H-06** | 10 marcas en verificar-kit; «falta» ya no es un círculo |
| D3 | Dice hasta qué hora llegan los datos | **Cumple, tras H-01** | «datos de las 14:00» en los 9 inicios, en los dos anchos |
| M1 | Ninguna animación, salvo navegación de 200 ms o menos | **Cumple** | `getAnimations()` vacío en reposo; solo el panel y el velo, en 200 ms; con menos movimiento, nada |
| M2 | Nada parpadea | **Cumple** | Sin `animate-pulse`, `ping` ni `spin`; sin SMIL |
| M3 | «Repetir la parada» solo a pedido | **No aplica** | No existe |
| G1 | Todo cambio de token pasa por una guía de estilo firmada | **No** | No hay `GuiaEstilo` firmada: los tokens viven en `index.css` y `kit-scada.md` |
| G2 | Esta lista corre en CI sobre las rutas del auditor | **A medias** | El auditor corre en CI (`npm run e2e`) y cubre C1, C2, C4, F1, N2, T1 y T3; el resto es manual o va en este documento |

**En cuenta:**
- 33 cumplen (5 de ellas, tras los arreglos de este documento: C8, D2, D3, N2 y N5);
- 8 a medias;
- 1 no (G1);
- 2 no aplican o no se pueden comprobar en el demo (M3, E6).

**Además:**
- **La paleta cálida y el acento:**
  - fondos grises cálidos en los dos temas (verificar-kit);
  - el petróleo `#2c7371` solo en el botón principal, lo seleccionado y el foco;
  - ningún estado con el color de la marca.
- **El kit SCADA:** se usa en los inicios, el nivel 3 y la tubería, pero no en todas partes (P-01).
- **Nada parpadea** (M2).
- **La franja:** arriba a la derecha en el escritorio y debajo del título en el teléfono, en todos los roles (H-01).

## 8. Visual

- **Contemporáneo, minimalista y cálido.**
  - El panel lateral es claro (`--nav #dfddd8`), con la raya del acento en la entrada activa.
  - No hay barra negra en el claro: 0 franjas oscuras de borde a borde en las 18 capturas claras.
  - En la noche, grises cálidos, no negro.
- **Nada se sale, se recorta ni se pisa:** el auditor da 0 en los 36 inicios, y `auditor.spec` pasa con los arreglos.
- **Detalles que se ven** (S3, no arreglados):
  - en el panel lateral de adm, «Administrador de la implementación» se parte en 3 renglones;
  - en el nivel 3, «P-201A + P-201C» se parte en «P-» / «201C» dentro de «Mientras esté parada»;
  - en Confiabilidad, la etiqueta «Datos de demostración» queda entre las migas y el título.

## 9. Pruebas y comprobación

- **`e2e/qa-v3.spec.ts`:** 12 pruebas (QA-01 a QA-12), cada una falla sin su arreglo. QA-07 y QA-08 además leen el código.
- **Corridas contra el Vite propio** (`TRIM_URL=http://localhost:5185`, proyecto dev): qa-v3, auditor, b2-roles, b3-roles, arreglos-f1, arreglos-f3-config, arbol-identificar, correcciones-f3, carril, interfaz, hoy, planta-viva, armazon, inicios-k2, choke-arbol, f2-regulatorio, resultados y metas. **Todas pasan.** No se corrió la suite completa.
- `npx tsc -b`, `npx oxlint src` y `npm test`: en verde.
- **Archivos tocados:**
  - pantallas: `src/index.css`, `src/pages/{Hoy,Causa,Confiabilidad,Configuracion}.tsx`;
  - widgets: `src/widgets/{arbol/Calidad,choke/Traza,configuracion/marcas,hoy/vista,plantaviva/acciones,resultados/Funcionando}.ts(x)`;
  - costura: `src/shared/api/hoy.ts`;
  - pruebas: `e2e/auditoria/presupuesto.ts` y `e2e/qa-v3.spec.ts`.
- **El contrato no cambió:** ningún endpoint ni forma nueva. `/vistas/hoy` ahora tiene en cuenta los cierres de orden que ya existían.

---

## Cierre de la v3 (coordinador)

**Pruebas:**
- tsc y oxlint limpios;
- libro, árbol, contrato y kit en verde;
- referencia 344 casos y 48 escrituras rechazadas;
- línea base de la v1 en verde;
- **e2e 569 de 569** (dev, Safari, Firefox, iPhone y el demo construido), con el auditor ampliado (regla «kit»).

**Medición** (`docs/experiencia-v2/R-revision/herramientas/medir.mjs`, 390 y 1440 px, tema claro; el detalle por rol está en `medicion-antes-vs-v3.md`):

| Todo el producto | Antes de la revisión | v3 | Cambio |
|---|---|---|---|
| Palabras de las páginas | 138.376 | 86.344 | **−38 %** |
| Palabras sin desplazarse | 52.387 | 27.437 | **−48 %** |
| Pantallas (rutas) | 142 | 97 | −32 % |

**Inicios a 390 px:**

| Rol | Palabras | Cambio |
|---|---|---|
| ger | 97 → 57 | −41 % |
| reg | 130 → 76 | −42 % |
| jefe | 131 → 71 | −46 % |
| prod | 98 → 65 | −34 % |
| sup | 117 → 84 | −28 % |
| tec | 116 → 88 | −25 % |
| conf | 108 → 87 | −19 % |
| adm | 95 → 77 | −19 % |
| oper | 94 → 80 | −15 % |

oper, conf y adm quedan en su tope de lo necesario (`presupuesto.ts`, con su porqué).

**Pendiente, con su porqué:**
- **ISA G1:** la guía de estilo la firma cada operadora.
- **Lo que falta en el motor** y depende de la conexión con la planta: el rango de cada instrumento, si una parada fue normal o anormal, la vigencia de cada tag y el interlock.
- **Los flujos 1, 3 y 7:** el 1 es decisión del dueño (panel lateral), el 3 quedó en 2 toques y el 7 cambió a propósito.
- **Lo que el auditor no ve del kit:** las barras en HTML que quedan y las burbujas de TrenAgua.
