# R3 · Hallazgos de ISA-101 y de gráficos

**26-oct-2026 · R3.** Fase 2. Cada hallazgo trae:
- su severidad;
- la evidencia: ruta, rol, ancho, tema, selector o línea, y captura en `capturas/r3/`;
- la regla que rompe;
- el arreglo concreto.

Las mediciones están en `isa-101.md` y `graficos.md`. Los datos crudos, en `herramientas/datos-r3/`. Pasa a verificación adversarial (V2).

**Severidad, como en el encargo:**
- S1: confunde, miente o bloquea;
- S2: hace pensar de más;
- S3: pulido.

**Cuántos:** 3 S1 · 12 S2 · 19 S3 (34 en total).

---

## S1

### H1 · «Por campo»: un campo con 0 bbl/d de diferido dibuja la barra llena, pasada la raya del máximo
- **Evidencia:**
  - Dónde: `#/ger/resultados/ceiba~portafolio/curso`, 1280 px, claro (también en oscuro y en otros anchos: el estilo es el mismo).
  - Filas de La Zarza y Guacamayo: «diferido: 0 bbl/d, máximo 50 / 450» (su `aria-label`), y el relleno `[data-relleno]` mide **32 de 32 px**, con `style` = null. En Morichal, el relleno es `width: 66.65%`.
  - Captura completa: `scratchpad/r3/completas/ger_resultados_ceiba_portafolio_curso__trozo1.png`, sección «Por campo».
- **Causa:** `d = c.brecha / dias` (`widgets/resumen/PorCampo.tsx:101`) da un residuo negativo; el campo produjo lo de su potencial. `BarraMeta` calcula `Math.min(1.25, valor / meta) / 1.25` (`shared/ui/BarraMeta.tsx:41`), queda un ancho negativo y React descarta la declaración. Sin ancho, el `<i>` en bloque llena la pista.
- **Regla:** §8.1, escala honesta: el dibujo dice lo contrario de la cifra («0» al lado de una barra que pasó el máximo); X2 §5.2.
- **Arreglo:**
  - `BarraMeta.tsx:41`: `const ancho = conBarra ? Math.max(0, Math.min(1.25, valor / meta)) / 1.25 : 0`;
  - lo mismo en `widgets/resultados/Cifra.tsx:81` (`Barra`) y en `widgets/plantaviva/Filas.tsx:46`;
  - en el motor, el diferido por día del campo nunca negativo: redondeado y con `Math.max(0, …)` donde se arma `brecha`.
  - **Prueba (e2e):** en esa ruta, el `[data-relleno]` de la barra de diferido de `zarza` mide 0 px.

### H2 · Repartos que no suman su total a la vista (redondeo de cada parte)
- **Evidencia** (`herramientas/datos-r3/cuadres.json`):
  - `#/ger/planta-viva/ceiba/curso` y `#/ger/resultados/ceiba/curso`, «Diferido por equipo»: 573 + 247 + 118 + 109 = **1.047**, bajo una cifra de **1.046**;
  - en la misma pantalla, «355 sin causa» (Filas y la explicación de Resultados) junto a LC-21 **247** + LC-08 **109** = 356;
  - en `#/prod/diferidos/ceiba/curso`, «Sin identificar 355 · LC-21 247 · LC-08 109»;
  - `#/ger/planta-viva/ceiba~portafolio/curso`, Después: la cifra es **2.377** y las filas suman 1.253 + 1.046 + 77 = **2.376**.
  - Los valores exactos del motor sí cuadran (1.046,03; 355,04; 2.376,75).
- **Regla:** §8.6, todo reparto suma su total; §3, «una cifra que no cuadra» es S1. Es 1 bbl de redondeo, pero se lee en la misma pantalla.
- **Arreglo:** en el motor, cada reparto que se muestra junto a su total se redondea con el **mayor residuo**: la suma de las partes redondeadas da el total redondeado.
  - Dónde: `entities/planta-viva.ts` (`porEquipo`, las filas de todos, `sinIdentificar` y su detalle), `entities/resultados.ts` (`porEquipo`) y el detalle de `PorTramo`.
  - La pantalla sigue pintando lo que llega.
  - **Prueba** en `verificar-libro.mjs`: para La Ceiba y para todos, `Σ redondeo(partes) === redondeo(total)` en cada reparto mostrado.

### H3 · El mismo equipo con dos marcas (F2): P-201B con triángulo y MPP-301 con cuadrado
- **Evidencia:**
  - `#/jefe/mantenimiento/ceiba/curso`, 1440 px, «Paradas por identificar»: **P-201B ▲** «sigue parado» `[11]`. En las otras 27 pantallas es ◆1.
  - Código: `pages/Mantenimiento.tsx:117` y `pages/Trabajo.tsx:56`, `MarcaPrioridad s={… !p.fin ? 2 : 3}`, la prioridad de la tarea (también en `#/tec/trabajo/ceiba/curso`).
  - `#/conf/bombas/morichal/curso`: la placa de **MPP-301 lleva ■3** `[12]`; en `#/conf/equipos/morichal/MPP-301`, en la lista de Equipos y en la franja es **▲2**.
  - `entities/condiciones.ts:9-11` lo dice: «aviso en su estado y atención en Riesgo». La placa usa el estado (`eq.severidad`).
- **Regla:** X2 F2 y F5 (B10); X5 §6.4, «una marca por equipo, la misma en todas partes»; §3, un color que dice lo que no es.
- **Arreglo:**
  - **Una sola condición por equipo, del motor.** `condiciones.ts` ya la escoge (`franjaDe`, el peor de estado y riesgo). Exponerla por equipo en `/vistas/equipos-hoy` y que la usen `Placa.tsx` (en vez de `eq.severidad`), `Mantenimiento.tsx`, `Trabajo.tsx`, `Turno.tsx:234` y `Riesgo.tsx:186`.
  - En las filas de tarea («por identificar»), la marca del equipo o la de «falta» (X2 F5), nunca la prioridad de la tarea.
  - **Prueba (e2e):** recorrer las rutas de jefe, tec y conf, juntar equipo → forma de la marca y exigir una sola por equipo.

---

## S2

### H4 · El N4 de una bomba parada lleva 6 marcas de alarma en sus instrumentos (E3)
- **Evidencia:** `#/conf/equipos/ceiba/P-201B/diagnostico`, `[data-instrumentos]`, 1440 px, claro `[13]`.
  - FI-2011, II-2011 y PDI-2011 llevan ◆1 de 11 px al inicio y el rombo naranja al final de su minigráfica.
  - Los valores 0 son los de una bomba parada.
  - En el N3 de la misma bomba, «Sus señales» va en gris y sin marca ✓.
- **Regla:** X2 E3 y B9 (supresión por estado, ISA-18.2); X5 §6.4.
- **Arreglo:**
  - `widgets/PanelEquipo.tsx` `FilaDispositivo` (`:252` y `:261`): con el equipo detenido, sin marca propia, `Sparkline` sin `prioridad` y en `--tinta3`.
  - Mejor: que `Instrumentos` lea las señales de `useNivelEquipo` (ya traen `gris` y `condicion` del motor, `senalDe`).
  - **Prueba:** 0 marcas `svg[viewBox="0 0 14 14"]` dentro de `[data-instrumentos=P-201B]`.

### H5 · La escala de los indicadores no es fija y la pantalla dice que sí (I1)
- **Evidencia:**
  - `entities/equipos-tecnico.ts:482-492,514`: `escalaDe(d.unidad, bandaN, alarmas, [...serie, valor])` mete las lecturas de la ventana **y el valor de ahora**. La escala crece cuando el valor pasa el máximo, y `fuera: 'arriba'` nunca puede salir.
  - El `Analogico` de antes (placa de Bombas `[12]`, `DetallePozo`, variables de `bombas/Detalle`) arma la escala del valor actual ± 12 % (`shared/ui/Analogico.tsx:39-44`).
  - La nota del N3 dice «La escala de cada señal es fija» (`widgets/equipos/Senales.tsx:83`) `[09]`.
- **Regla:**
  - X2 I1 y §5.1, punto 1 («nunca depende del valor de ahora»);
  - X5 §5.4 («mientras el motor no dé el rango… la escala no rotula sus extremos», es decir, provisional);
  - el pendiente del coordinador: que la pantalla diga que es provisional.
- **Arreglo:**
  - En el motor, `escalaDe` solo con los límites firmados: de 0 (o del límite menor menos un margen) al mayor límite × 1,5. Sin lecturas ni valor. Con el valor afuera, `fuera` y la flecha.
  - El texto de la nota: «La escala es provisional: falta el rango de cada instrumento y el disparo de cada protección; el sistema todavía no los trae.»
  - Cambiar `Analogico` por `IndicadorFijo` en `widgets/bombas/Placa.tsx:71`, `bombas/Detalle.tsx:121,446` y `pozos/DetallePozo.tsx:175`, con la escala del motor.
  - **Prueba:** la misma señal con 3 valores distintos tiene la banda en la misma x (±1 px).
  - **Lo que falta del motor (no se inventa):** el rango del instrumento y el disparo por tag (X2 §7, pedido 4).

### H6 · La franja no está en el mismo lugar en N1, N2 y N3
- **Evidencia** (caja de `[data-franja]`, en px):
  - **1440:** N1 (885, 44); N2 (885, 68); N3 P-201B (885, **128**), MPP-301 (891, 90); Mantenimiento **(272, 136)**, a la izquierda `[11]`.
  - **1280:** N1 (725, 44); Planta, Agua y Pozos **(272, 136)**, a la izquierda bajo el título `[10]`.
  - **390:** y de 142 a 273.
- **Regla:** X2 N2 y §3.5; X5 §6.10, «la franja en el mismo lugar en los niveles 1, 2 y 3».
- **Arreglo:** un lugar fijo para la franja en la cabecera, igual en `widgets/Cabecera.tsx` y en `CabezaEquipo` de `widgets/equipos/Nivel3.tsx`:
  - una rejilla `grid-cols-[minmax(0,1fr)_auto]` desde `lg`, con la franja en la columna derecha y la primera fila, alineada con las migas;
  - el período y «Exportar» pasan a la fila de abajo (o a la izquierda, junto al título) y nunca empujan la franja;
  - la marca DEMO va en línea con las migas, sin salto propio.
  - **Prueba (e2e):** la caja de `[data-franja]` en `planta-viva`, `planta`, `equipos` y `equipos/…/P-201B` difiere ≤ 4 px en x e y a 1440 y a 1280.

### H7 · La hoja del tramo y la ficha del gerente tapan la franja y oscurecen lo de atrás (N5)
- **Evidencia:**
  - `#/ger/planta-viva/ceiba/curso`: Enter en el tramo de la planta → la hoja a la derecha, con velo `[07]`;
  - «Ver qué se está haciendo» → la ficha ejecutiva, con velo, cubre el 40 % y la franja `[08]`.
- **Regla:** X2 N5 y B11 (Hollifield: la ficha va en una zona reservada, sin tapar).
- **Arreglo:**
  - `widgets/plantaviva/HojaTramo.tsx` y `widgets/PanelEquipo.tsx`: en el escritorio, sin velo; el panel empieza debajo de la cabecera (`top` = alto de `[data-cabecera]`) para que la franja quede a la vista; la tubería sigue clicable.
  - En el teléfono, la hoja que sube puede llevar velo.

### H8 · Dos dibujos para la misma tubería (X5 §5.3; «sin mezcla de estilos»)
- **Evidencia:**
  - La planta viva dibuja **angostamiento y hueco rayado** `[01]`.
  - Producción y Planta (`#/prod/produccion/ceiba/curso`, `#/prod/planta/ceiba/curso`) usan `widgets/choke/Tuberia.tsx` `TuberiaDelCampo`: cajas tan altas como su capacidad y una línea discontinua de «hoy», **sin rayado** donde se trabó `[10]`.
  - Agua usa otras cajas (`choke/Agua.tsx`).
  - Una ingeniera de producción ve la misma planta de La Ceiba con dos códigos.
- **Regla:** X5 §5.3 (una tubería); palabras del dueño («la tubería de C… todo se ve como B»); prompt §2.3 (el diferido es un estrechamiento rayado).
- **Arreglo:** en Producción y Planta, cambiar `TuberiaDelCampo` por `TuberiaAcostada` con la lente técnica.
  - Lo que cabe en cada tramo y «le sobran» van en el rótulo.
  - «Ver como tabla» se conserva como alternativa (ver H29).
  - O dejar la de antes solo en el papel.

### H9 · Texto SVG de 9,5 a 11,6 px a 320 px en La planta viva (T3)
- **Evidencia:** `#/ger/planta-viva/ceiba/curso` y las de prod, sup y conf, a 320 px, claro: **28 textos bajo 12 px** `[04]`.
  - En la tubería de pie: «Yacimiento» 11,6; «la roca» 10,0; «15 de 18 en marcha» 10,8.
  - En el mes a mes: ejes y meses a 9,5 px.
  - A 390 px, el mínimo es 12,2 ✓.
  - El auditor no lo detecta: sus anchos son 1512, 1280, 1024, 768 y 390 (`e2e/auditoria/rutas.ts`, `ANCHOS`).
- **Regla:** X2 T3; X5 §3.4 (nada bajo 12 px); prompt §8.4.
- **Arreglo:**
  - `widgets/plantaviva/Lateral.tsx` `MesAMesYBajando`: dibujar al ancho de verdad con `useAncho`, como `resultados/MesAMes.tsx`, que mide 12 px también a 320.
  - `Tuberia.tsx` `TuberiaDePie`: el `viewBox` de 326 al ancho real del contenedor (o letra de `13 × 326 / ancho`).
  - Sumar 320 a `ANCHOS` del auditor.

### H10 · En Antes, «Al cierre 293.287 bbl» va sin «proyectado» (I7, D1)
- **Evidencia:** `#/ger/planta-viva/ceiba/curso`, momento Antes, 1440 px: el rótulo de la venta dice «Al cierre **293.287** bbl ■3 meta 337.900», sin la palabra ni trazo discontinuo `[06]`. En Resultados, el mismo cierre lleva «proyectado» y va rayado `[19]`.
- **Regla:** prompt §2.5; X2 I7 y D1; X5 §5.9.
- **Arreglo:** el motor (`entities/planta-viva.ts`, la venta de Antes) manda `calidad: 'proyectado'`, y `Tuberia.tsx` (`data-venta`) pone «Al cierre · proyectado» con el chip de calidad, del mismo tamaño que la unidad.

### H11 · Resultados: 1 cifra grande y 6 secundarias en la primera vista (T1)
- **Evidencia:** `#/ger/resultados/ceiba/curso` (y `prod`, `reg`), 1440 × 900: 64 px «1.046» y seis de 22 px: 10.700, 661, 293.287, 58.880, «14 %» y «≈ 2.133» `[19]`. En todos los campos, 7. Confiabilidad: 8 cifras de 24–26 px.
- **Regla:** X5 §3.4 («Cifra secundaria… como mucho 4 por vista»); X2 T1.
- **Arreglo:**
  - en `widgets/resultados/Cifra.tsx`, el cierre proyectado (lo que no se midió) baja a 18 px: lo proyectado nunca igual que lo medido;
  - «14 %» del proactivo y «≈ 2.133» del ciclo bajan a 18 px (`Tarjetas.tsx:67,90`).
  - Quedan 2 secundarias de 22 px.

### H12 · Las placas de Bombas (pantalla de grupo): sin minigráfica y con la banda casi invisible (I3, I6)
- **Evidencia:** `#/sup/bombas/ceiba/curso` y `#/conf/bombas/morichal/curso`, 1440 px `[12]`:
  - 0 minigráficas;
  - la banda en `--tinta3` al 30 % (1,34:1);
  - sin rayas de extremo;
  - escala móvil (H5).
- **Regla:** X2 I3, I6 y §5.1, punto 10 (en equipos gemelos, la banda en el mismo lugar); X5 §5.4.
- **Arreglo:** `widgets/bombas/Placa.tsx`: por cada variable, `IndicadorFijo` + `Minitendencia` de las señales del motor (`nivelEquipo`), con la misma escala para P-201A, B y C.

### H13 · «0 sin comunicación» se afirma de todo el campo, pero solo mira el medidor oficial; y sin comunicación no tiene hora (E2, C1 latente)
- **Evidencia:**
  - `entities/condiciones.ts:14-17,64-65`: «sin comunicación» es solo el computador de flujo del punto oficial. La franja dice «**0** sin comunicación» en cada pantalla, sin salvedad `[01]`.
  - Lo que se ve donde falta un dato:
    - el N3 pone «---» y «sin señal», sin hora (`Senales.tsx:37`);
    - el N4 y la ficha ponen «—» y «SIN SEÑAL» **en morado** (`PanelEquipo.tsx:258,265`);
    - el `Analogico` pone «sin señal» en morado (`Analogico.tsx:71`).
  - Hoy no se ve porque el demo no trae el caso.
- **Regla:** X2 E2 y C1; X5 §3.3 («el valor pasa a «---»»); NUREG 1.1-21 (la hora); prompt §2.1.
- **Arreglo:**
  - **Lo que falta del motor (no se inventa):** la vigencia y la hora del último dato por tag (X2 §7, pedido 3).
  - Mientras tanto, la píldora de la franja dice lo que sabe: el `aria-label` y el globo «Sin comunicación: solo se vigila el punto de medición oficial», o la palabra corta «medidor oficial: 0».
  - En pantalla, el valor es «---» y el texto en `--tinta2` («sin comunicación desde HH:MM» cuando llegue la hora), con la marca morada al lado. Cambiar `PanelEquipo.tsx:258,265` y `Analogico.tsx:71`.

### H14 · La planta viva no cabe en la primera vista (N1)
- **Evidencia:**
  - `#/ger/planta-viva/ceiba/curso`: a 1440 × 900 mide **969 px**; la fila de producción contra la meta queda cortada `[01]`. La marca «DATOS DE DEMOSTRACIÓN» le suma 33 px (ya lo notó C2).
  - A 1280 px, la columna derecha baja: **1.639 px**.
- **Regla:** X2 N1; X5 §8.1, N1 (la imagen 1 cabe).
- **Arreglo:** `widgets/Cabecera.tsx`: la marca DEMO en la misma línea del título (`h1`), no en la de las migas. En `pages/PlantaViva.tsx`, la columna de 352 px desde 1280 (`min-[1280px]:grid-cols-[minmax(0,1fr)_320px]`), con el panel plegado.

### H15 · En los dibujos de antes, el diferido se llama «se pierden»
- **Evidencia:**
  - Producción y Planta: «se pierden 1.966».
  - Agua: «se pierden 1.665 bbl/d de crudo» y «se pierden 3.059».
  - Bombas: «luego se pierden 783 bbl/d».
  - Riesgo: «está parada: se pierden 1.665 bbl/d ahora».
  - Capturas: `[12]` y `scratchpad/r3/completas/*`.
- **Regla:** prompt §2.3 (diferido no es pérdida); X4 §3.1, regla 4. C5 lo dejó pendiente (`criticidad.ts`, `choke-agua.ts`).
- **Arreglo:** en el motor, «se dejan de producir» en esas frases, con su prueba; para el texto, en coordinación con R1.

---

## S3

| # | Hallazgo | Evidencia | Regla | Arreglo |
|---|---|---|---|---|
| H16 | En las pantallas de antes, la marca va sin su palabra | Cabecera de la placa de Bombas `[12]`; tablas de Pozos y Electrosumergibles (`Pozos.tsx:93,161`, `Esp.tsx:77,147`); «Sus instrumentos» del N4 `[13]`; `Turno.tsx:234`; `Riesgo.tsx:186` | X2 F1; X5 §5.6 | Poner la palabra de la condición junto a la marca («alarma», «atención») o usar la fila de equipo de B (`equipos/Lista.tsx` `FilaEquipo`) |
| H17 | La pantalla decide la prioridad | `Analogico.tsx:51` (`estado ?? (enAlarma ? 1 : fuera ? 2 : 0)`); `Sparkline.tsx` (`prioridad ?? (fuera ? 3 : 0)`); `Turno.tsx:234` y `Riesgo.tsx:186` (`altoImpacto ? 1 : 2`); `pozos/estado.ts:12` (`sevPozo`) | X2 B15 y §7, pedido 5 | Sin prioridad del motor, sin marca; que el motor mande la condición de cada pozo y señal (H3) |
| H18 | Día a día: el potencial (calculado) va discontinuo, como lo proyectado; el tramo al día en curso, discontinuo y sin leyenda | `#/prod/produccion/ceiba/curso`, «Día a día» `[14]`; `produccion/Diaria.tsx:81,85` | X2 §5.3, punto 8 | Potencial continuo en `--tinta2`; el día en curso, punto hueco con «en curso» en la leyenda |
| H19 | Marcas de 9 a 11 px en unos 40 sitios | `grep tamano={9|10|11}`: `Pozos.tsx`, `Esp.tsx`, `Placa.tsx:98,112`, `PanelEquipo.tsx:252`, `Produccion.tsx:171,183` (9 px), `BarraMeta.tsx:58`, `Cuadre.tsx`, `BloqueSap.tsx`, `Mantenimiento.tsx:117`, `Trabajo.tsx:56,195`… | X2 §4.2 (mínimo 12 px en el escritorio y 16 en el teléfono); X5 §5.6 | Un tamaño mínimo en `MarcaCondicion` (`Math.max(tamano, 12)`, y 14 en el teléfono) y quitar los `tamano={9…11}` |
| H20 | La marca de «pasó el máximo» está hecha a mano: cuadrado de 7–8 px, sin «3» | `diferidos/MesAMes.tsx:166` y dentro del gráfico; `resumen/ResumenDirectivo.tsx:376` `[14]` | X5 §3.3 y §5.4 (el «■3» sobre el mes) | `MarcaCondicion c="aviso"` de 12–14 px, como `resultados/MesAMes.tsx:88` |
| H21 | Las barras apiladas `--dato1`/`--dato3` dan 2,66:1 (claro) y 2,43:1 (oscuro) entre sí | `r3-paleta.mjs`; mes a mes de La planta viva, de Resultados y de Confiabilidad | WCAG 2.2 1.4.11 (partes vecinas) | Separar los segmentos con 1 px de `--panel` (`stroke="var(--panel)"` en el segmento de arriba), como ya hace «por dónde se trabó» |
| H22 | Gráficos sin unidad o sin escala | Diferidos «Mes a mes» («16,9 k» sin bbl); «Qué limitó, día por día» («792» sin unidad); Confiabilidad «Fallas por mes» (sin eje ni valores; meses «10 … 10» sin año; `aria-label` genérico) `[14]` `[15]` | §8.1 y §8.3; X2 T4 | Unidad en el título («bbl», «bbl/d», «fallas»); en Fallas por mes, el eje de 0 al máximo, el número sobre cada barra, «oct 2025 … oct 2026» y la frase con cifras en el `aria-label` |
| H23 | Proyección del vigía sin banda normal ni escala | `#/conf/equipos/morichal/MPP-301/diagnostico`, salud por parte `[17]`; `bombas/Proyeccion.tsx` | X2 §5.3, puntos 2 y 6 | Banda en `--banda` y el 0 y el límite rotulados en HTML, como `equipos/Tarjetas.tsx` `Grafica` |
| H24 | El rayado tiene cuatro sentidos | Lo que no pasa (tubería), sin identificar (Serie, PorTramo), proyectado (cierre de Resultados) y espera (Mantenimiento) | X5 §5.3 y §5.4 («un código, un significado») | Rayado a 45° solo para lo que no pasa y lo sin identificar; lo proyectado, contorno discontinuo con su palabra; la espera de Mantenimiento, gris liso con su rótulo |
| H25 | La barra contra la meta se corta en 1,25 veces sin marcarlo | Resultados: diferido proyectado 58.880 contra un máximo de 24.800 (2,37 veces), barra llena `[19]`; `BarraMeta.tsx:41` y `Cifra.tsx:81` | §8.1 (escala honesta) | Por encima de 1,25, la barra termina en «►» y el `aria-label` dice «más de 1,25 veces el máximo» |
| H26 | Un mes como período (Resultados): 18,4 ms de JS en el escritorio y 61,5 ms en el teléfono (×4), y 112 ms hasta el cuadro pintado; al vecino del tren (N3), 21 ms en el teléfono | `r3-rendimiento.mjs`, build de producción (`graficos.md`) | §8.10 (≤ 16 ms) | `startTransition` en el cambio de período y de equipo (la píldora responde en el acto y el gráfico llega en el cuadro siguiente); guardar el libro por período en el motor como ya se hace por momento |
| H27 | La tubería en chico está dos veces; la de Hoy se deforma | `widgets/hoy/Lateral.tsx:15-41` con `preserveAspectRatio="none"` y `h-6`: el rayado queda en 2 px y los extremos se estiran `[15]` | X5 §5.3 («en chico») | Usar `MiniTuberia` de `widgets/plantaviva/Tuberia.tsx` (C3 ya lo propuso) |
| H28 | La planta viva en Después: «1.046» dos veces (la cifra grande y «Este mes») y el ramal con «P-201B parada desde 03:52», que es estado de ahora | `[05]` | X4 §4.4; prompt §4, punto 8 | En Después, la fila «Este mes» pasa a «Septiembre cerró en 7.716»; el ramal sin el estado de ahora, o con «ahora:» delante. Para R1 y R2 |
| H29 | La tubería de La planta viva no tiene alternativa en tabla | `widgets/plantaviva/Tuberia.tsx`; la de antes sí la tiene («Ver como tabla») | Prompt §8.8; X5 §5.3 (accesible) | Un botón «Ver como tabla» bajo el dibujo, con cada tramo: lo que cabe, lo que pasa, lo que no pasa y sus equipos (sale de `planta.tramos`) |
| H30 | Los tokens de equipo no son los de X2 | `index.css`: oscuro `--eq-parado` `#0d0f11` (casi negro; 1,14:1 contra el suelo) donde X2 §4.4 pide `#1f2225`; claro `--eq-marcha` `#ffffff` y `--eq-parado` `#5b6168`, donde X2 pide `#fafaf9` y `#686c71` | X2 §4.4; X5 §3.2 («nunca negro») | Alinear con X2, o dejar escrita la desviación en X5 §3.2 con su medida (marcha contra parado: 6,26 y 14,06) |
| H31 | X5 §3.1 afirma que el índigo queda lejos de los estados «también con daltonismo», y midió solo normal y deutan | Con protanopía, morado contra índigo da **6,24** (claro) | Exactitud del documento | Corregir X5 §3.1 con los cuatro tipos de visión; en la práctica, la marca morada nunca va sobre el índigo (las píldoras blancas) |
| H32 | «1. 2. 3.» en «Por qué es crítica» (Agua), junto al ◆1 | `#/prod/agua/ceiba/curso`, `choke/Agua.tsx` | X2 F4 | Viñetas o la ⓘ del título (X4 §5.4, N2) |
| H33 | «Por campo»: las pistas de las barras miden 32 px a 1280 | `#/ger/resultados/ceiba~portafolio/curso`, `[data-barra]` de 32 px | §8.9; X5 §5.4 (pista de 10 px de alto y largo suficiente) | Columnas más anchas o barra debajo de la cifra, en `resumen/PorCampo.tsx` (`angosto`) |
| H34 | En la ficha del gerente, «No arrancar» es un chip sin ⊘ | `[08]`, «Qué se está haciendo · … no arrancar» | X5 §3.3 y §5.6 (franja en tinta, borde de 2 px y ⊘) | `Bloqueo` de `widgets/hoy/piezas.tsx` en `equipo/FichaEjecutiva.tsx` |

---

## Fuera de mi dimensión (para R1 y R2)

- **Pestañas en la página:** `pages/Configuracion.tsx:106` usa `role="tablist"` con píldoras horizontales: «Partes de la configuración». El dueño pidió «ninguna barra de pestañas horizontal» (R2).
- **Títulos y cabeceras de antes:** quedan en MAYÚSCULAS («SIN INSTRUMENTO», «SALUD POR PARTE», «QUÉ LA ANUNCIA», «ESQUEMA DE PLANTA») y con tags en `font-mono` en el esquema y en el N4 (R2).
- **Nombres de la familia y del equipo:**
  - P-201B es «bomba de agua» en La planta viva y Resultados, y «bomba de reinyección» en Diferidos, Riesgo y Agua;
  - los 118 bbl de los pozos son «LC-05 (energía eléctrica)» en la tubería y «SE-2 energía eléctrica» en «Diferido por equipo» (glosario de R1).

## Lo que se verificó y está bien (no son hallazgos)

**Cuadres:**
- 1.665 + 301 = 1.966;
- 118 + 573 + 355 = 1.046;
- 1.966 + 684 = 2.650.
- Valores exactos del motor, y las mismas cifras en La planta viva, Resultados, Hoy, Equipos, N3, Riesgo, Turno, Producción y Diferidos. Ninguna cifra cambia entre pantallas.

**Paleta:** la de X5 §3.3 está exacta en los dos temas. La separación con daltonismo es ≥ 10 en todos los pares (mínimo 10,43). El texto y las formas pasan WCAG en los 5 fondos.

**En las 294 vistas:**
- 0 texto pintado;
- 0 animaciones;
- 0 filtros o sombras en los dibujos;
- color de estado entre 0,02 y 0,23 % de la pantalla;
- 0 desborde de la página;
- 0 texto SVG que se salga de su dibujo.

**«No arrancar»:** en tinta con ⊘ y borde de 2 px en Hoy, N3, Bombas y el operador.

**«Limita»:** en gris con doble contorno. El equipo se ve por brillo. La pérdida se dice («sin eventos registrados»), no se dibuja y no se suma.

**Tubería:**
- Tab recorre los tramos, Enter abre la hoja y Escape la cierra;
- el foco es índigo;
- el rayado mide 10,5 px a 1440 (mínimo de 2 px en el código).

**Rendimiento:** el cambio de momento y los filtros pintan con 1–8 ms de JS en el escritorio y ≤ 12 ms con CPU ×4 (build de producción).
