# Hallazgos · Producto y UX (R2, §6 del prompt)

**26-oct-2026 · R2 · UI y producto.** Medido en pantalla contra Vite en 5182 (`main`, 5aaa7f2), con Playwright, a 1440 × 900 y 390 × 844, en claro y oscuro. Cómo se midió: `hallazgos-ui.md`, «Cómo se midió». Las fichas por rol están en `roles/<rol>.md`.

## La prueba de los 10 segundos, en una tabla

| Rol | Abre en | Lo que entendí en 10 s (primera pantalla, sin desplazarse) | ¿Pasa? |
|---|---|---|---|
| ger | La planta viva | «1.966 bbl/d se dejan de producir en La Ceiba. La bomba de agua P-201B paró a las 03:52 y cerró dos pozos; se trabó en la planta. "Ver qué se está haciendo".» Todos los campos: «2.650; lo que más pesa, P-201B». | **Sí** |
| prod | La planta viva | La misma frase y los mismos botones del gerente. «Pozos · ◄ limita» es un rótulo chico del dibujo. No dice cuánto pasa contra lo que podría pasar ni dónde rinde más evitar la próxima parada. | **No** (P-01) |
| sup | Hoy | «1.966 se dejan de producir; le faltan 4 paradas por confirmar; el reporte sale mañana antes de las 07:00. No arrancar P-201B ni LC-21. Confirmar las 2.» | **Sí** |
| oper | Hoy (pregunta) | «P-201B, bomba de agua, paró a las 03:52. ¿Qué parte se dañó? No la arranque hasta decirlo. Pregunta 1 de 4.» | **Sí** |
| tec | Hoy | «5 cosas le tocan hoy. Primero P-201B: diga qué encontró.» | **Sí** |
| jefe | Hoy | «De lo que dura una falla, 7,7 de 8,1 días son espera; el vigía anunció 3 de 3. Conseguir la causa de 3 paradas; seguir la orden de K-101; ojo: no intervenir P-201A y P-201C hoy.» | **Sí** |
| conf | Equipos | Un renglón del vigía, 12 filtros en tres filas y una búsqueda. En el teléfono, la primera pantalla son solo filtros. No hay cifra ni frase. El primero de «Si falla hoy» (P-201A, 3.059 bbl/d) es la 8.ª fila. | **No** (P-02) |
| reg | Reporte | «No se puede publicar todavía: el período incluye días sin cierre publicado.» No dice qué falta, quién lo debe ni para cuándo. | **No** (P-03) |
| adm | Configurar | Un formulario («Metas, accesos y configuración»: perfil del campo, membrete, tanques). No dice qué falta en cada campo ni cuánto falta para firmar. | **No** (P-04) |
| plan | — (v2) | La dirección `#/plan/…` abre la vista de producción (Marcela Ríos). | No aplica (P-17) |
| cont | — (v2) | La dirección `#/cont/…` abre La planta viva de producción. | No aplica (P-17) |

## Los toques de las tareas clave (medidos)

| Tarea | Ancho | Toques | Cómo | Meta |
|---|---|---|---|---|
| El operador contesta qué se dañó (P-201B) | 390 | **2** | «Sello mecánico» → «Fuga hacia afuera» → aviso «Registrado…» y la pregunta 2 de 4 | 1 (imagen 5); P-07 |
| El operador contesta por qué paró un pozo (LC-21) | 390 | 1 | Una opción con círculo | 1 |
| El supervisor confirma 2 paradas iguales | 390 y 1440 | **1** | «Confirmar las 2» → aviso con «Deshacer», «Hecho hoy (1)», la insignia pasa de 3 a 2 | 1 |
| El supervisor entrega turno | 390 y 1440 | 1, y no termina | «Entregar turno» abre la pantalla Turno de antes; no arma ni entrega nada | P-06 |
| El técnico registra qué encontró | 390 y 1440 | **3** | «Registrar qué encontré» → la parte → «¿qué vio?» | ≤ 1 en el teléfono; P-07 |
| La ingeniera de producción ve qué limita hoy | 390 y 1440 | 0 (rótulo) / 1 (Antes) | «Pozos · ◄ limita» en el dibujo. «Si falla hoy», en Antes | La frase y la cifra; P-01 |
| El gerente ve dónde se trabó y quién está en ello | 1440 y 390 | 0 + **1** | La frase y el tramo marcado; «Ver qué se está haciendo» abre la ficha («Qué se está haciendo») | ≤ 3 |
| Confiabilidad ve qué atacar primero | 1440 / 390 | 0 + desplazarse | La fila de P-201A está a 1.025 px (escritorio) y a 1.874 px (teléfono, más de dos pantallas) | Sin desplazarse; P-02 |
| Regulatorio sabe si puede publicar | 1440 y 390 | 0 / no se encuentra | «No se puede publicar todavía» sí; qué falta y quién, no en la primera capa | P-03 |
| El administrador ve qué falta configurar | 1440 y 390 | no se encuentra | Lo más cercano: la pestaña «Filosofía operacional» (1 toque) con «Sin responder 30» | P-04 |

## Los niveles escondidos

- **Gerente:** el campo y dos niveles (la hoja del tramo, la ficha ejecutiva). Desde «Todos mis campos», un toque abre el campo y otro, la ficha. **Cumple** X4 §3.1, regla 5.
- **Técnico:** La planta viva (N1) → la lista de Equipos (N2) → el nivel 3 con migas «La Ceiba › Agua › P-201B» y ‹ › a los vecinos → el nivel 4 («Ver el diagnóstico»). **Cumple.** Nada pasó de 3 toques.
- **Pendiente:** el nivel 2 por tren de X4 §3.8 (`#/<rol>/planta/<campo>/<tren>`) no existe como dirección. El tren es un filtro de Equipos y la pantalla Agua.

---

## S1

### P-01 · Producción abre en la vista del gerente: no responde «¿qué limita hoy y dónde rinde más evitar la próxima parada?»
- **Evidencia:**
  - **Dónde:** `#/prod/planta-viva/ceiba/curso`, a 1440 y 390.
  - **Qué se ve:** la cifra, la frase y los dos botones son los del gerente: «1.966 barriles por día se dejan de producir en La Ceiba», «Ver qué se está haciendo», «Compartir el informe».
  - **Lo que no está:**
    - «lo que pasa hoy contra lo que podría pasar» (9.394 contra 11.857);
    - «a la planta le sobran 1.143»;
    - los 3 primeros de «Si falla hoy».
  - **Dónde vive la lente técnica:** en otra pantalla, la tubería de antes de Producción (P-16).
  - **Capturas:** `capturas/hallazgos/p-01-prod-inicio-del-gerente-1440.png`; comparar con `capturas/hallazgos/ui-19-cuatro-botones-tuberia-produccion-1440.png`.
- **Regla:**
  - X4 §2 (prod: «¿Qué limita hoy al campo y dónde rinde más evitar la próxima parada?»; acción: confirmar en lote y cargar la asignación);
  - X4 §3.4 (frase «Limitan los pozos: a la planta le sobran 1.143 bbl/d. Hoy pasan 9.394.», cifra **9.394 bbl/d pasan hoy**, «La planta viva técnica del campo (nivel 1) y los 3 primeros de «Si falla hoy»»);
  - X4 §4.3 («La lente técnica suma… 11.857, la capacidad de cada tramo, le sobran 1.143»);
  - prompt §6.1 («si no lo dice la primera pantalla, es un hallazgo S1»).
- **Arreglo:**
  - **Motor** (`src/entities/planta-viva.ts`): una `lente: 'gerencial' | 'tecnica'` según `rol.nivel`, y para la técnica:
    - la cifra «pasan hoy» con su par «de lo que podría pasar»;
    - la frase de X4 §3.4;
    - los tramos con su capacidad y «le sobran»;
    - los 3 primeros de «Si falla hoy» (ya los da `criticidad`).
  - **Pantalla** (`src/widgets/plantaviva/Heroe.tsx` y `Tuberia.tsx`): pintar la lente técnica (capacidades bajo cada tramo) y, en vez de «Compartir el informe», la acción de prod («Confirmar las N» si hay, o «Ver Hoy»).
  - **Prueba** (verificar-contrato, sección C2): `plantaViva(…prod).cifra.valor === 9394`.

### P-02 · Confiabilidad abre en una lista de filtros, sin cifra ni frase
- **Evidencia:**
  - **Dónde:** `#/conf/equipos/ceiba`.
  - **A 1440:**
    - lo primero son el renglón «¿Le creo al vigía?…» y **12 filtros en tres filas** (estado, tipo, tren) con una búsqueda;
    - después, «Cambió hoy: P-201A y P-201C subieron al puesto 1…» como texto suelto;
    - la lista va ordenada por condición: P-201B, K-101, LC-21, TK-102, H-302, LC-16, LC-07; **P-201A, el primero de «Si falla hoy», es la 8.ª fila, a 1.025 px**.
  - **A 390:** la primera pantalla son solo filtros, y P-201A queda a 1.874 px.
  - **No hay** cifra grande (el guion: 0 cifras de 32 px o más).
  - **Capturas:** `capturas/hallazgos/p-02-conf-inicio-1440.png`, `p-02-conf-inicio-filtros-390.png`.
- **Regla:**
  - X4 §2 (conf: «¿Qué equipo y qué modo de falla ataco primero, y cuánto le creo al número?»);
  - X4 §3.4 (frase «Ataque primero P-201A y P-201C: hoy valen más y TRIM no las vigila.»; cifra **3.059 bbl/d**, el primero de «Si falla hoy»);
  - X4 §3.1, regla 1;
  - prompt §6.1.
- **Arreglo:**
  - **Motor** (`src/entities/equipos-tecnico.ts`): a `listaEquipos` agregarle para conf `inicio: { cifra, frase, primero }` (de `riesgoAhora`/`criticidad`, que ya lo calculan) y «¿Dónde va el próximo instrumento?» (`criticidad.proximoInstrumento`, ver P-10).
  - **Pantalla** (`src/widgets/equipos/Lista.tsx`):
    - la cifra con su frase arriba (`CifraGrande` de B);
    - para conf, el orden por «Si falla hoy» (X4 §3.2: «Equipos, ordenados por "Si falla hoy"»);
    - los filtros plegados en una fila («Filtrar ▾») o en una hoja en el teléfono.
  - **Prueba e2e:** a 390, la cifra y P-201A visibles sin desplazarse.

### P-03 · Regulatorio: «No se puede publicar todavía» sin qué falta, quién lo debe ni para cuándo
- **Evidencia:**
  - **Dónde:** `#/reg/regulatorio/ceiba/curso`, 1440 y 390.
  - **Qué se ve:**
    - la tarjeta de arriba dice «■3 No se puede publicar todavía · El período incluye días sin cierre publicado», con «solo lectura» y «Exportar CSV»;
    - sin cifra grande;
    - lo que falta («Falta quién 355», «Falta qué pasó…») está dentro del árbol, con códigos, desplazando;
    - no hay hora límite ni a quién pedírselo.
  - **Captura:** `capturas/hallazgos/p-03-reg-inicio-1440.png`.
- **Regla:** X4 §2 (reg: «¿El reporte pasa? Si no, ¿qué falta, quién lo debe y cuánto tiempo queda?») y X4 §3.4 (frase «No se puede publicar todavía: octubre sigue abierto y 2 paradas no tienen causa (355 bbl).», cifra **2** paradas sin causa, «qué falta, quién lo debe y la hora límite»).
- **Arreglo:**
  - **Motor:** una vista de «se puede publicar» con la cuenta de paradas sin causa, sus bbl, a quién le toca cada una (el rol del paso que falta, de `PASOS_QUE_DECLARA`) y la hora límite. `resultados.ts` ya arma «¿Se puede publicar?» para Resultados.
  - **Pantalla** (`src/pages/Regulatorio.tsx`): la cifra con su frase arriba y una fila por parada que falta («LC-21 · 247 bbl · falta qué pasó · lo debe el operador ›»); el árbol, debajo.

### P-04 · El administrador abre en un formulario, no en lo que falta para firmar
- **Evidencia:**
  - **Dónde:** `#/adm/configuracion/ceiba/curso`.
  - **Qué se ve:**
    - el título «Metas, accesos y configuración»;
    - cuatro pestañas (UI-01) y «PERFIL DEL CAMPO» con un `<select>` y dos casillas;
    - «Octubre, en curso» y «Exportar» en la cabecera;
    - ni «5 de 7 pasos», ni el siguiente paso, ni «Firmar».
  - **Captura:** `capturas/hallazgos/p-04-adm-inicio-1440.png`.
- **Regla:**
  - X4 §2 (adm: «¿Está completo y bien armado cada campo, y qué falta para firmar?»; cifra: pasos listos, por ejemplo 5 de 7);
  - X4 §3.2 (adm abre en **Estado**);
  - X4 §3.4.
- **Arreglo:**
  - **Motor:** `estadoConfiguracion(campo)`, con los pasos (perfil, tanques, respaldo, capacidades firmadas, filosofía, conectores, tags sin equipo) listos o no. Casi todo lo dicen ya `configuracion.ts`, `capacidades.ts` («dato del demo, sin firmar») y Filosofía («Sin responder 30»).
  - **Pantalla:** una vista «Estado» primera en la puerta Configurar (`pantallas.tsx`, `roles.ts` `inicio`), con la cifra «N de M», la frase y una fila por paso con «›» al editor.

### P-05 · Turno (a donde lleva «Entregar turno»): lo proyectado es la cifra más grande y va antes que lo medido
- **Evidencia:**
  - **Dónde:** `#/sup/turno/ceiba/curso` (también oper), a 390 y 1440.
  - **Qué se ve:**
    - la primera cifra, la más grande (36 px), es **«983 bbl se dejarían de producir · turno que entra si nada cambia»**, una proyección sin la palabra «proyectado» ni trazo discontinuo;
    - al lado, más chica, la medida «1.966 bbl/d se deja de producir ahora»;
    - son cuatro cifras grandes en bloque (983, 1.966, 3 y 723).
  - **Captura:** `capturas/hallazgos/p-05-turno-proyectado-mas-grande-390.png`.
- **Regla:**
  - prompt §2.5 («Ninguna cifra simulada o proyectada es la grande ni va más arriba que la medida; siempre lleva su palabra»);
  - X5 §2.5;
  - X4 §3.7 («Turno · ciclo y las 4 cifras de arriba → desaparecen como bloque»).
- **Arreglo:**
  - en `src/pages/Turno.tsx`, quitar el bloque de 4 cifras (lo medido ya está en Hoy);
  - si se queda la proyección del turno, va en una línea con «proyectado» y trazo discontinuo, debajo.
  - Mejor aún: «Entregar turno» deja de abrir esta pantalla (P-06).

## S2

### P-06 · «Entregar turno» no entrega: abre la pantalla Turno de antes
- **Evidencia:**
  - **Qué pasa:** en `#/sup/hoy/ceiba/curso`, «Entregar turno» (390 y 1440) lleva a `#/sup/turno/ceiba/curso`.
  - **Esa pantalla:**
    - la cabecera «Entrega de turno» con Exportar solo en ícono;
    - el bloque de 4 cifras (P-05);
    - «Qué limita hoy al campo»;
    - «Cierre de hoy · paradas por confirmar».
  - **Lo que no hay:** ni resumen armado, ni firma, ni «Compartir por WhatsApp». La tarea no termina.
  - **Captura:** `capturas/hallazgos/p-06-entregar-turno-lleva-a-turno-390.png`.
- **Regla:**
  - X4 §3.6, punto 3 («La entrega de turno se vuelve un botón: arma el resumen e incluye el WhatsApp del turno»);
  - X4 §5.5;
  - imagen 3a («"Entregar turno" arma el resumen: lo que paró, lo que quedó pendiente y el WhatsApp del turno, con su firma. Se comparte por WhatsApp o en PDF.»).

  Es pendiente conocido de C3, y sigue.
- **Arreglo:**
  - **Motor** (`entities/hoy.ts`): `entregaDeTurno(rol, campo)` con lo que paró, lo pendiente, lo confirmado y el WhatsApp de las 12 h.
  - **Escritura:** `POST /api/turnos/entrega`, por inserción (D1).
  - **Pantalla:** una hoja (`HojaInferior`) con el resumen, «Entregar y compartir» y «Deshacer».

### P-07 · Contestar «qué se dañó» toma 2 toques al operador y 3 al técnico, y la misma acción tiene seis nombres
- **Evidencia:**
  - **El operador** (`#/oper/hoy/ceiba/curso`, 390): «Sello mecánico» abre un segundo paso («Sello mecánico: ¿qué vio? · Fuga hacia afuera · Fuga interna · Otra cosa»); el registro sale al segundo toque.
  - **El técnico** (`#/tec/hoy/ceiba/curso`): «Registrar qué encontré» → la parte → «¿qué vio?».
  - **Los nombres de la misma acción:**
    - «Contestar» (operador en el escritorio);
    - «Registrar qué encontré» y el título «Diga qué encontró en P-201B» (técnico);
    - «Diga qué se dañó» (nivel 3);
    - «Responder yo» (supervisor, jefe y confiabilidad);
    - «Registrar respuesta» (Identificar).
  - **Captura:** `capturas/hallazgos/p-07-operador-segundo-toque-390.png`.
- **Regla:**
  - imagen 5 («Contestar es un toque»);
  - X5 §5.8;
  - X4 §5.2 (la tarea principal a 1 toque en el teléfono);
  - prompt §6.7 («la misma acción se llama igual en todas partes»).
- **Arreglo:**
  - **Producto:** la decisión de C3 (el libro exige la parte con lo que se vio, ISO 14224) se puede respetar en un toque si cada opción ya es «parte + lo que se vio» («Sello mecánico · fuga hacia afuera», «Sello mecánico · fuga interna», «Rodamientos…») con las 2 o 3 combinaciones más frecuentes del historial. «Otra parte» abre la lista completa.
  - **Motor:** `entities/hoy.ts`, las opciones de la pregunta, con su prueba.
  - **Nombres:** uno solo, «Diga qué se dañó» (o «Contestar»), en `entities/hoy.ts`, `widgets/equipos/Nivel3.tsx` y `pages/Causa.tsx`. La palabra la escoge R1 en el glosario.

### P-08 · «Deshacer» de una respuesta retenida 5 s en el navegador: el riesgo
- **Evidencia (código y pantalla):**
  - **Lo que se ve:** al tocar una opción sale **«Registrado: sello mecánico (fuga hacia afuera) en P-201B · Deshacer»** y la vibración de 10 ms, *antes* de escribir nada.
  - **Cuándo se escribe** (`src/widgets/hoy/envio.ts`): cuando vence el aviso (`DESHACER_MS`, 5 s), al registrar otra respuesta, o en `pagehide` y al desmontar.
  - **Captura:** `capturas/hallazgos/p-08-registrado-antes-de-escribir-390.png`.
- **Los riesgos de UX:**
  1. **«Registrado» dice algo que todavía no es cierto.** Si la escritura falla después (409 porque otro contestó primero —«la primera gana»—, 403, o sin red), el error sale cuando la persona ya se fue. Si salió de la página, no lo ve nunca. Es la regla de confianza de Nubank al revés (prompt §6.6: «nada sorprende»).
  2. **Se puede perder en silencio.** En `pagehide`, `enviarPendiente()` hace un `fetch` asíncrono sin `keepalive` ni `sendBeacon` (no hay ninguno en `src/`). En el teléfono, el sistema suspende la pestaña al bloquear la pantalla o cambiar de aplicación, y la respuesta no sale. Con la fuente del demo no se nota; con la http, sí.
  3. **La hora** que queda es la del envío (hasta 5 s después), no la del toque. Es pequeño, pero D1 pide la hora del sistema del paso.
  4. **Quien supervisa** ve la pregunta abierta 5 s más, y puede contestarla en paralelo y recibir el 409.
  5. **5 s es poco** para quien lee despacio o tiene guantes (WCAG 2.2.1, tiempo ajustable). No hay forma de recuperar el «Deshacer» después.
- **Regla:** prompt §6.6; X5 §5.8 («queda registrado a nombre de quien contesta, con la hora del sistema»); D1 (por inserción); el pendiente de C3.
- **Arreglo, en orden de costo:**
  - **(a) Ya, sin motor:**
    - el aviso dice la verdad: «Se guarda en 5 s · Deshacer», y pasa a «Registrado» cuando la escritura responde;
    - `fetch(…, { keepalive: true })` en la escritura de la respuesta (`shared/api/escrituras.ts`) y guardar lo pendiente en `localStorage` para reintentar al volver;
    - el error, en una región `status` que no se va sola.
  - **(b) Lo correcto, igual que la confirmación:** escribir en el acto, y que «Deshacer» sea una escritura `retirado`. Pide al motor:
    - que `seguirConversacion` (`entities/anh-clasificacion.ts`) reabra la pregunta;
    - una historia de respuestas retiradas en `ctx.respuestas`, con su prueba (falla sin el cambio).

### P-09 · El mismo equipo con cuatro familias distintas
- **Evidencia (P-201B):**
  - **«bomba de agua»:** La planta viva, Hoy y la lista de Equipos;
  - **«bomba de reinyección»:** «Por equipo» de Equipos del gerente y Riesgo;
  - **«bomba multietapa de transferencia de agua»:** el título del nivel 3 y la ficha ejecutiva;
  - **«bomba de la línea»:** Identificar.
  - **SE-2:** sin marca en «Diferido por equipo» de La planta viva, y con un punto «•» en «Por equipo» de Equipos.
  - **Capturas:** `capturas/hallazgos/p-09-bomba-de-la-linea-identificar-1440.png` y `ui-14-por-equipo-gerente-1440.png`.
- **Regla:** prompt §6.7 («El mismo equipo lleva la misma marca, el mismo nombre y la misma cifra en todas las pantallas»); X4 §3.1, regla 4; X5 §5.5 (familia en palabras de campo).
- **Arreglo:**
  - **Motor:** un solo `familiaDe(equipo)` (la de la lista de Equipos: «bomba de agua»), con la descripción técnica larga solo como subtítulo del nivel 3;
  - **Pantallas:** usarlo en `widgets/diferidos/Paretos.tsx`, `pages/Riesgo.tsx`, `pages/Causa.tsx` y `widgets/equipo/FichaEjecutiva.tsx`;
  - **Prueba:** la sección de glosario de `verificar-libro` (R1 y F4).

### P-10 · Riesgo de jefe y confiabilidad: a dónde van sus dos funciones
- **Lo que se verificó:**
  - **«Ojo: no intervenir hoy»** ya está en Hoy del jefe (y de la planeadora): `entities/hoy.ts:654-657`, en pantalla en `#/jefe/hoy/ceiba/curso`. Pero su enlace **«Ver los equipos» lleva a La planta viva** (`destino: { a: 'planta' }` → `widgets/hoy/palabras.ts:27`; probado: termina en `#/jefe/planta-viva/ceiba/curso`).
  - **«¿Dónde va el próximo instrumento?»** solo está en Riesgo de confiabilidad (`widgets/riesgo/SiFallaHoy.tsx:180-183`).
  - **Capturas:** `capturas/hallazgos/p-10-ojo-ver-los-equipos-1440.png`, `p-10-proximo-instrumento-solo-en-riesgo-1440.png`.
- **Regla:**
  - X4 §3.6, punto 2 («Riesgo se disuelve»);
  - X4 §3.7 («Riesgo (jefe, conf) → Equipos (orden "Si falla hoy", con "Cambió hoy" arriba); Planta, nivel 1; Hoy ("Ojo: no intervenir…" e "Intervenir ya")»);
  - X4 §2 (la acción de conf: «Escoger dónde va el próximo instrumento»);
  - prompt §6.7.
- **Propuesta:**
  - **«¿Dónde va el próximo instrumento?» va a Equipos de confiabilidad**, como segundo renglón arriba de la lista, junto a «¿Le creo al vigía?». Es la decisión de su inicio (X4 §2) y su pantalla de entrada. Se usa `criticidad.proximoInstrumento`, que ya viaja en `shared/api/choke.ts:185`; el motor de Equipos lo expone para conf (`entities/equipos-tecnico.ts`).
  - **«Ojo: no intervenir hoy» se queda en Hoy del jefe**, y su enlace pasa a «Ver P-201A y P-201C» → Equipos con el filtro del tren de agua (destino nuevo `{ a: 'equipos', tren: 'agua' }` en `palabras.ts`).
  - **Después:**
    - quitar `riesgo` de las `pantallas` de jefe y conf en `src/entities/roles.ts`;
    - en `src/app/url.ts`, `FUSIONADA_EN.riesgo` debe llevar a `equipos` a los roles técnicos: hoy lleva a todos a `plantaViva` (X4 §3.7 dice Equipos);
    - ajustar las aserciones de `e2e/auditoria/rutas.ts` que piden `#/jefe/riesgo/…` (F4).

### P-11 · «…y 2 planes más ›» lleva a Identificar, donde no hay planes
- **Evidencia:**
  - **Dónde:** `#/sup/hoy/ceiba/curso`, en la tarjeta «Confirmar 2 paradas iguales».
  - **Qué pasa:** «Plan simulado: volver antes de 39 h (2.072 bbl), y 2 planes más ›» abre `#/sup/causa/ceiba/curso` («Paradas por identificar»). Ahí no hay ningún plan en la primera pantalla: C5 los sacó de Identificar.
  - **Por qué:** `widgets/hoy/palabras.ts`, `case 'planes': ir(['mantenimiento','causa','turno'])`.
  - **Captura:** `capturas/hallazgos/p-11-planes-mas-lleva-a-identificar-1440.png`.
- **Regla:** X4 §4.4, regla 2 («su plan a un toque»); prompt §6.6 («nada sorprende»).
- **Arreglo:** en `palabras.ts`, `planes` lleva a la ficha del equipo del plan (donde C5 dejó los planes: `{ a: 'equipo', … }`), igual que «Ver el plan ›» del gerente (probado: abre la ficha de P-201B).

### P-12 · La capacidad sin firmar no se dice: «◄ limita» va sin ⓘ y con contorno continuo
- **Evidencia:**
  - **Qué dice el motor:** en el demo, todas las capacidades son «dato del demo, sin firmar» (`entities/choke-reparto.ts:582`). La tubería de antes de Producción lo dice («capacidades del demo, sin firmar»).
  - **Qué se ve:** La planta viva (todos los roles, 1440 y 390) pone «Pozos · ◄ limita» con doble contorno continuo, sin ⓘ.
  - **Captura:** `capturas/hallazgos/p-12-limita-sin-firma-1440.png`.
- **Regla:** X4 §4.10 («Una capacidad sin firmar: en la lente del gerente, el contorno de ese tramo va discontinuo y "limita" lleva su ⓘ: "con una capacidad sin firmar"»); prompt §2.1 (nada inventado: el dato dice su calidad). Es pendiente conocido de C2.
- **Arreglo:**
  - **Motor:** que `plantaViva` exponga `tramo.capacidad: 'firmada' | 'sin-firmar'` (ya lo calcula `choke-reparto`).
  - **Pantalla** (`widgets/plantaviva/Tuberia.tsx`): el contorno discontinuo y una ⓘ junto a «limita».

### P-13 · La Zarza (gas): «0 barriles… produce sin paradas ahora» junto a «su tubería todavía no está»
- **Evidencia:**
  - **Dónde:** `#/ger/planta-viva/zarza/curso`.
  - **A 1440:** «Ahora mismo 0 barriles por día se dejan de producir. La Zarza produce sin paradas ahora.», y debajo la caja «La Zarza es un campo de gas: su tubería todavía no está.». Afirma que no hay paradas en un campo cuyo gas no se mide.
  - **A 390:** la frase «produce sin paradas» queda en una tarjeta aparte, después del aviso del gas.
  - **«Todos mis campos»** sí lo dice bien («campo de gas: su tubería todavía no está», en la fila).
  - **Captura:** `capturas/hallazgos/p-13-zarza-sin-paradas-1440.png`.
- **Regla:** X5 §5.10 y X4 §4.10 (campo de gas: «La Zarza es un campo de gas. La tubería del gas todavía no está.»); prompt §2.1 (si el motor no tiene el dato, «sin dato»).
- **Arreglo:** en `entities/planta-viva.ts` (la frase de «ahora»), para un campo de gas:
  - la frase es la de X4 §4.10;
  - la cifra dice «de crudo» o «sin dato de gas»;
  - nunca «produce sin paradas».

  Con su prueba en verificar-contrato (C2).

### P-14 · La frase del tramo en el teléfono dice lo contrario de lo que quiere decir
- **Evidencia:**
  - **Dónde:** `#/ger/planta-viva/ceiba/curso` (y prod), a 390, en el tramo Planta.
  - **Qué se lee:** «Planta · aquí se trabó / no pasan 1.665 bbl/d / se angostó: con P-201B parada / **el agua da para 236 bbl/d más de crudo**». Se lee como «sobra capacidad».
  - **Lo que quiere decir:** que el agua *solo* deja 236 más. Turno lo dice bien: «lo que den de más los pozos pasa solo hasta unos 236 bbl/d de crudo, hasta que vuelva». La imagen 2 dice «el agua no da para más crudo».
  - **Captura:** `capturas/hallazgos/p-14-frase-tramo-agua-da-para-390.png`.
- **Regla:** prompt §4, regla 1 (lo primero es la conclusión); prompt §6.6 (nada sorprende).
- **Arreglo:** en `src/entities/planta-viva.ts:572`, «el agua solo deja pasar 236 bbl/d más de crudo» (o «faltan 1.429 para volver», si el motor lo da). La frase final la decide R1.

### P-15 · La introducción es el modal de dos pasos con el párrafo del «foco»
- **Evidencia:**
  - **Dónde:** `#/ger/planta-viva/ceiba/curso` sin `trim.intro.ger` (también oper y sup a 390).
  - **Qué se ve:** un modal en el centro, con:
    - la banda índigo;
    - «Lo que usted decide» y un párrafo («Barriles que no se produjeron, el retorno posible del ciclo antes / durante / después…»);
    - «Qué es TRIM ⓘ», un control falso «Antes · Durante · Después», una barra de progreso y «Siguiente».
  - **De tú:** al operador, «Cómo están las bombas, a qué equipo **vas**…»; al supervisor, «…**cierras** en el orden que menos cuesta».
  - **Captura:** `capturas/hallazgos/p-15-introduccion-modal-1440.png`.
- **Regla:**
  - X4 §6.2 («Lo que se quita: el modal de dos pasos… Tampoco el párrafo del "foco"»; tres señas de una línea sobre el inicio de verdad y un primer acierto);
  - prompt §6.8;
  - prompt §2.10 (de usted).
- **Arreglo:** cambiar `src/widgets/Onboarding.tsx` por tres señas ancladas (a la frase, a la cifra y a lo marcado), con los textos de la tabla de X4 §6.2 por rol, «Siguiente» y «Ya entendí». El `foco` de `roles.ts` no se muestra al entrar. El texto lo afina R1.

### P-16 · Producción ve dos tuberías distintas del mismo campo
- **Evidencia:**
  - **La de La planta viva** (B, `#/prod/planta-viva/…`).
  - **La de Producción** (`#/prod/produccion/ceiba/curso`, y también en Identificar): «La tubería del campo», de antes, en cajas, con la lente técnica (11.857, 13.000 y 14.000, «le sobran 1.143»), «se pierden 1.966» y cuatro botones.
  - **Captura:** `capturas/hallazgos/ui-19-cuatro-botones-tuberia-produccion-1440.png`.
- **Regla:**
  - X4 §3.6, punto 6 («La tubería del campo (Producción y Planta) → una sola, en el nivel 1 de Planta»);
  - X4 §3.7;
  - el dueño: «sin mezcla de estilos».
- **Arreglo:** con P-01 (la lente técnica en La planta viva), quitar `widgets/choke/Tuberia.tsx` de `pages/Produccion.tsx` y `pages/Causa.tsx`. Lo que tiene y La planta viva no («Ver como tabla», el punto de medición oficial) pasa a la hoja del tramo o al papel (X4 §3.6, «queda solo para el papel»).

## S3

### P-17 · Una dirección de un rol de v2 abre la vista de producción sin decirlo
- **Evidencia:**
  - **`#/plan/hoy/ceiba/curso`** → `#/prod/hoy/ceiba/curso`, con «Marcela Ríos · Ingeniera de producción» en el panel.
  - **`#/cont/evidencia/ceiba/curso`** → `#/prod/planta-viva/ceiba/curso`.
  - **Sin aviso.** En cambio, con un campo ajeno sí avisa: «Usted no tiene asignado el campo Morichal Norte: le mostramos La Ceiba.».
  - **Captura:** `capturas/hallazgos/p-17-rol-plan-abre-produccion-1440.png`.
- **Regla:** CONSTRUCCION («nada se mueve en silencio», `Subpantallas.tsx`); prompt §6.9 (una dirección vieja o compartida).
- **Arreglo:** en `src/app/url.ts` (`leerHash`), cuando el rol de la dirección no se ofrece, guardar un aviso («Planeadora de mantenimiento todavía no está en el primer producto: le mostramos Producción.») con el mismo mecanismo de `campoAjeno` / `AvisoDeDireccion` de `App.tsx`.

### P-18 · El momento no viaja en la dirección
- **Evidencia:**
  - **Qué pasa:** `#/ger/planta/ceiba~portafolio/antes` (la forma de X4 §3.8) abre `#/ger/planta-viva/ceiba~portafolio/curso` en **Durante**. Al escoger «Antes» o «Después», la dirección no cambia: no se puede compartir «lo que viene».
  - **Captura:** sin captura; es la dirección. Se reproduce abriendo la ruta y escogiendo «Antes».
- **Regla:** X4 §3.8 (`#/<rol>/planta/<campo>/<momento>`); prompt §6.9.
- **Arreglo:**
  - en `src/app/url.ts`, leer y escribir el momento (`antes|ahora|despues`) en `planta-viva`, guardando el período para Después;
  - `Momentos.tsx` lo toma del estado.

### P-19 · La hoja del tramo del gerente dice «¿Por qué?» con las frases del catálogo
- **Evidencia:**
  - **Dónde:** la hoja de «Planta» en `#/ger/planta-viva/ceiba/curso`.
  - **Qué dice:** «No planeada 573 bbl └ proceso / facilidades · parada estación/bombeo afecta pozos · 573 bbl».
  - **Captura:** `capturas/hallazgos/p-19-hoja-tramo-por-que-1440.png`.
- **Regla:** X4 §4.5, punto 3 («"No planeada · 573 bbl → falla de la planta (bombeo de agua) → afectó a varios pozos", con palabras de campo y sin códigos»).
- **Arreglo:** en `entities/planta-viva.ts` (`arbolDelChoke`), traducir `cau_niv1`/`cau_niv2` a las palabras de campo del gerente (tabla en el motor, con su prueba). Es de R1 y F2.

### P-20 · Falta «3 de 11 planes en marcha» en La planta viva (pendiente conocido: sigue)
- **Evidencia:**
  - **En el código:** ninguna cadena «planes en marcha» en `src/`.
  - **En pantalla:** la tarjeta «Lo que todavía se puede mover» solo trae la suma y los tres momentos.
  - **Captura:** `capturas/hallazgos/p-20-sin-planes-en-marcha-1440.png`.
- **Regla:** X4 §3.7 («Resumen · ciclo… los planes, como línea "3 de 11 planes en marcha"»).
- **Arreglo:**
  - **Motor** (`entities/planta-viva.ts`): leer las decisiones de `sesion.planes` (aceptados, ejecutados y en total por campo) y dar `planes: { enMarcha, total }`.
  - **Pantalla:** una línea bajo «Ver el plan ›» en `widgets/plantaviva/Lateral.tsx`.
  - **Prueba:** aceptar un plan sube la cuenta.

### P-21 · Código sin uso (confirmado con grep): se puede borrar
- **Sin ningún rol que lo abra:**
  - `src/pages/Resumen.tsx`: solo lo registra `pantallas.tsx:11/73`; ningún rol tiene `resumen` y `FUSIONADA_EN.resumen` ya lleva a La planta viva.
  - `src/pages/Portafolio.tsx`: solo lo importa `Resumen.tsx`.
  - `src/widgets/riesgo/Ahora.tsx`: solo lo importan `Portafolio.tsx` y `Resumen.tsx`.
  - `src/widgets/resumen/enAlarma.ts`: solo lo importa `riesgo/Ahora.tsx` (no estaba en la lista).
  - `src/widgets/resumen/ResumenDirectivo.tsx`: lo importan `Resumen.tsx` y `Diferidos.tsx`. `Diferidos` solo usa su `Tendencia` en la rama `nivel === 'decision'` (`Diferidos.tsx:43-48`).
- **Ramas «decision» muertas:** el único rol de decisión que se ofrece es el gerente, y ya no tiene Diferidos, Producción ni Riesgo (cont es de v2):
  - `Diferidos.tsx:43`;
  - `Produccion.tsx:43` (`ing` siempre es verdadero);
  - `Riesgo.tsx:84` (`directivo` siempre es falso).
- **Cuidado al borrar:**
  - `scripts/verificar-libro.mjs:2188-2191` lee `src/widgets/riesgo/Ahora.tsx` y `:3622` lee `pages/Resumen.tsx` como texto. Hay que quitarlos de esas listas o la prueba falla.
  - Sacar `resumen` de `PANTALLAS` no rompe las direcciones viejas: `pantallaQueAbre` igual cae en `FUSIONADA_EN`. Probado: `#/ger/resumen/ceiba~portafolio/curso` → `#/ger/planta-viva/ceiba~portafolio/curso`.
  - `widgets/hoy/palabras.ts:27` tiene `'resumen'` como respaldo: quitarlo.

### P-22 · `scripts/pantallazos.mjs` tiene las rutas viejas del gerente y ninguna pantalla nueva
- **Evidencia:**
  - **Rutas viejas:**
    - `:26`: `{ archivo: 'resumen-gerente', ruta: '#/ger/resumen/ceiba~portafolio/curso' }`, que hoy abre La planta viva;
    - `:27`: `diferidos`, `#/ger/diferidos/…`, que hoy abre Resultados;
    - `ficha-bomba-parada`, `#/sup/bombas/ceiba/curso/P-201B`, que hoy abre el nivel 3.
  - **Faltan:** `ROLES` (l. 21) no incluye `reg`, y no hay ninguna captura de La planta viva, Hoy, Equipos, Resultados ni del teléfono.
- **Regla:** CONSTRUCCION, «Para el coordinador» de C5.
- **Arreglo:**
  - en `scripts/pantallazos.mjs`, renombrar y cambiar las rutas: `planta-viva-gerente` (`#/ger/planta-viva/ceiba~portafolio/curso`), `resultados-gerente` (`#/ger/resultados/ceiba/curso`), `nivel3-bomba-parada` (`#/sup/equipos/ceiba/P-201B`);
  - sumar `hoy-supervisor`, `hoy-operador` (390), `equipos-confiabilidad` y `reporte-regulatorio`, y `reg` en `ROLES`;
  - revisar que el README que los cita (`docs/pantallas/`) use los nombres nuevos.

---

## Los casos borde (§6.9), probados en pantalla

| Caso | Ruta | Lo que se ve | Resultado |
|---|---|---|---|
| Campo de gas | `#/ger/planta-viva/zarza/curso`; `#/jefe/hoy/zarza/curso`; `#/jefe/equipos/zarza` | La planta viva: «0… produce sin paradas» + «campo de gas: su tubería todavía no está». Hoy: «Nada pendiente. El campo está normal.» + «Abrir La planta viva». Equipos: «La Zarza no tiene electrosumergibles en su perfil». La franja: «nada anormal» | P-13 en La planta viva; lo demás, cumple |
| Campo sin paradas ahora | `#/ger/planta-viva/guacamayo/curso`, `palmar` | «0 barriles por día… Guacamayo produce sin paradas ahora.» La tubería llena; Guacamayo conserva su franja (1 alarma, 1 atención: GU-07 en Antes). El Palmar: «nada anormal» | Cumple X5 §5.10 |
| Hoy vacío | `#/jefe/hoy/zarza/curso` | «Nada pendiente. El campo está normal.» y el enlace | Cumple |
| Sin comunicación | todos | El demo no trae ningún caso (la franja dice 0 en los 5 campos). No se puede probar en pantalla sin inventar un dato | No probado (no hay dato) |
| Capacidad sin firmar | todos (todas son del demo, sin firmar) | «limita» sin ⓘ y contorno continuo | P-12 |
| Comienzo de mes (octubre lleva 2 días) | Después en `#/ger/planta-viva/ceiba/curso` | «Lo que pasó · octubre (2 días, en curso) … 1.046 barriles… Septiembre cerró en 7.716 bbl.» | Cumple X4 §4.4, regla 4 |
| Período septiembre | `#/ger/resultados/ceiba/cerrado`, `#/prod/resultados/ceiba/cerrado` | «Lo que pasó · septiembre: 7.716 barriles no se produjeron en La Ceiba»; sin «Cierre proyectado» | Cumple |
| Rol sin capacidad | `#/tec/equipos/ceiba/P-201B` (tec sin `sap:aviso`); `#/oper/hoy` (sin `anh:confirmar`) | El técnico no ve «Crear aviso en SAP» (sup, oper y conf sí); el operador no ve tarjetas de confirmar | Cumple |
| Rol sin la puerta | `#/ger/hoy/…`, `#/reg/hoy/…` | Abren su inicio (La planta viva y Reporte) | Cumple |
| Rol de v2 | `#/plan/…`, `#/cont/…` | Abren producción sin aviso | P-17 |
| Campo ajeno | `#/sup/hoy/morichal/curso` | «Usted no tiene asignado el campo Morichal Norte: le mostramos La Ceiba.» | Cumple |
| Direcciones viejas | `#/ger/resumen/…`, `#/ger/diferidos/…`, `#/ger/riesgo/…`, `#/ger/portafolio/…`, `#/ger/planta/…`, `#/sup/bombas/ceiba/curso/P-201B`, `#//produccion/palmar`, `#/oper/produccion/…`, `#/jefe/equipo/…` | Abren La planta viva, Resultados, La planta viva, «Todos mis campos», La planta viva, el nivel 3 de P-201B, Producción de El Palmar, Hoy del operador y Equipos (servicios), respectivamente. **Atrás** después de una redirección vuelve a la vista anterior (`#/ger/resultados/ceiba/cerrado` → atrás → `…/curso` → atrás → el inicio) | Cumple; el momento no viaja (P-18) |

## Pendientes conocidos que se pidieron verificar

| Pendiente | Estado |
|---|---|
| Riesgo de jefe y conf con dos funciones sin otro lugar | «Ojo: no intervenir hoy» **ya está en Hoy del jefe** (su enlace lleva mal). «¿Dónde va el próximo instrumento?» **sigue solo en Riesgo**. Propuesta en P-10: Equipos de confiabilidad |
| «3 de 11 planes en marcha» en La planta viva | **Sigue** (P-20) |
| Código sin uso | **Confirmado**, más `widgets/resumen/enAlarma.ts`; cuidado con `verificar-libro` (P-21) |
| `scripts/pantallazos.mjs` con rutas viejas del gerente | **Sigue** (P-22) |
| «Deshacer» de la respuesta retenida 5 s | **Riesgo real**: dice «Registrado» antes de escribir, se puede perder sin `keepalive`, y el error llega tarde (P-08) |

## Resumen

| Severidad | Hallazgos |
|---|---|
| S1 | 5: P-01 (prod), P-02 (conf), P-03 (reg), P-04 (adm) y P-05 (Turno: lo proyectado, la cifra más grande) |
| S2 | 11: P-06 a P-16 |
| S3 | 6: P-17 a P-22 |
