# R3 · Inventario y QA de los gráficos, la tubería y los indicadores (§8)

**26-oct-2026 · R3.** Sobre `main` en 5aaa7f2. Los guiones, las capturas y los datos crudos son los mismos de `isa-101.md`: `herramientas/` y `capturas/r3/`.

## Cómo se midió cada comprobación

| # | Comprobación | Cómo |
|---|---|---|
| 1 | Escala honesta | Código (de dónde sale cada escala) más captura |
| 2 | La cifra arriba | Captura |
| 3 | Unidades | Captura y código |
| 4 | Texto SVG de 12 px o más en pantalla | `r3-medir.mjs`: tamaño × escala de la CTM de cada `<text>`, en 1440, 1280, 768, 390 y 320 px; y si se sale de su `<svg>` |
| 5 | Color | Gris para el dato y estado solo donde hay estado (`formasEstado`) |
| 6 | Lo simulado, discontinuo | Captura |
| 7 | Cuadres | `r3-cuadres.mjs`: los `data-*` del motor y el texto visible |
| 8 | La tubería (X5 §5.3) | Captura y código |
| 9 | Accesible | Código y teclado medido en la tubería |
| 10 | Anchos y temas | 168 + 126 vistas; desborde de la página = 0 en todas |
| 11 | Rendimiento | `r3-rendimiento.mjs`, en el build de producción, CPU ×1 (escritorio) y ×4 (teléfono) |

Las marcas: ✓ cumple · ½ a medias · ✗ no cumple · — no aplica. Los hallazgos (H#) están en `hallazgos-isa-graficos.md`.

**En ningún ancho ni tema se encontró:**
- texto SVG que se salga de su dibujo (`svgFuera` = 0);
- desborde horizontal de la página;
- texto pintado.

## El inventario: 34 dibujos y gráficos

### Las pantallas de B (tandas 1 y 2)

| # | Gráfico | Archivo | Dónde | 1 | 2 | 3 | 4 (px mín.) | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G1 | **Tubería acostada** (con el ramal del agua) | `widgets/plantaviva/Tuberia.tsx` `TuberiaAcostada` | N1, de 640 px en adelante | ✓ | ✓ | ✓ | ✓ 12,0 · 13,0 · 12,2 | ✓ | ½ | ✓ | ½ | ½ | ✓ | ✓ |
| G2 | **Tubería de pie** | `Tuberia.tsx` `TuberiaDePie` | N1 en el teléfono | ✓ | ✓ | ✓ | **✗** 12,2 a 390; **9,5–11,6 a 320** | ✓ | ½ | ✓ | ✓ | ½ | ½ | ✓ |
| G3 | **Tubería en chico** (todos mis campos) | `Tuberia.tsx` `MiniTuberia` | N1 de todos | ✓ | ✓ | — | — (sin texto) | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| G4 | **Tubería en chico de Hoy** (duplicada) | `widgets/hoy/Lateral.tsx` `MiniTuberia` y el operador | Hoy, «Su campo, ahora» | ✓ | ✓ | — | — | ✓ | — | ✓ | ½ | ✓ | ½ | — |
| G5 | **Diferido por día, mes a mes** (columna derecha) | `plantaviva/Lateral.tsx` `MesAMesYBajando` | N1 | ✓ | ✓ | ✓ | **✗** 12,0 · 13,0 · 12,2 · 12,2 · **9,5 a 320** | ½ | ✓ | ✓ | — | ✓ | ½ | ✓ |
| G6 | **Diferido por equipo** (barra de 5 px) | `plantaviva/Lateral.tsx` `PorEquipo` · `resultados/Tarjetas.tsx` `PorEquipo` | N1 y Resultados | ✓ | ✓ | ½ | — (HTML) | ✓ | — | **✗** | — | ✓ | ✓ | ✓ |
| G7 | **Lo que todavía se puede mover** (antes · durante · después, simulado) | `plantaviva/Lateral.tsx` `Mover` | N1 | — | ✓ | ½ | — | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| G8 | **Barra contra la meta** (producción por día, Few) | `plantaviva/Filas.tsx` | N1 | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | — | ✓ | ✓ | ✓ |
| G9 | **Hoja del tramo**: equipos, el **árbol** «¿Por qué?» y «desde que entró TRIM» | `plantaviva/HojaTramo.tsx` | N1 | — | ✓ | ✓ | — | ✓ | — | ✓ | — | ✓ | ½ | ✓ |
| G10 | **Mes a mes** (por equipo / por dónde se trabó) | `widgets/resultados/MesAMes.tsx` | Resultados | ✓ | ✓ | ✓ | ✓ 12,0 en los 5 anchos | ½ | ✓ | ✓ | — | ✓ | ✓ | ✓ / ½ |
| G11 | **Barras contra meta y máximo** (promedio y cierre proyectado) | `resultados/Cifra.tsx` `Barra` | Resultados | ½ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| G12 | **¿Está bajando?** (flechas) y **mantenimiento proactivo** | `resultados/Tarjetas.tsx` `Bajando` · `plantaviva/Lateral.tsx` | Resultados y N1 | ✓ | ✓ | ✓ | — | ✓ | — | — | — | ½ | ✓ | ✓ |
| G13 | **Mantenimiento**: reparación activa y espera | `resultados/Tarjetas.tsx` `Mantenimiento` | Resultados (jefe, plan) | ✓ | ✓ | ✓ | — | ½ | ✗ | ✓ | — | ✓ | ✓ | ✓ |
| G14 | **Indicador analógico fijo** | `shared/ui/Analogico.tsx` `IndicadorFijo` | N3 | **✗** | ✓ | ✓ | — (sin texto) | ✓ | — | — | — | ✓ | ✓ | ✓ |
| G15 | **Minitendencia** (12 días) | `shared/ui/Sparkline.tsx` `Minitendencia` | N3 | ½ | ✓ | ✓ | — | ✓ | — | — | — | ✓ | ✓ | ✓ |
| G16 | **Tendencia grande** («los 12 días antes de parar») | `Sparkline.tsx` `TendenciaFija` + `equipos/Tarjetas.tsx` `Grafica` | N3 | ½ | ✓ | ✓ | ✓ (rótulos en HTML) | ✓ | — | — | — | ½ | ✓ | ✓ |
| G17 | **Esquema del tren de agua** (PI, PDI, FI) | `widgets/equipos/TrenAgua.tsx` | N3 | — | ✓ | ✓ | ✓ 12,6 · 14 · 14 · 12,7; renglones a 320 | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |

### Las pantallas de antes (todavía en uso)

| # | Gráfico | Archivo | Dónde | 1 | 2 | 3 | 4 (px mín.) | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G18 | **Indicador analógico de antes** | `shared/ui/Analogico.tsx` `Analogico` | Bombas (grupo, N2), detalle del pozo (N3), variables del N4 | **✗** | ✓ | ✓ | — | ½ | — | — | — | ✓ | ✓ | ✓ |
| G19 | **Minigráfica de antes** | `shared/ui/Sparkline.tsx` `Sparkline` | N4 «Sus instrumentos» | ½ | ✓ | ½ | — | **✗** | — | — | — | ½ | ✓ | ✓ |
| G20 | **Proyección del vigía** (salud por parte) | `widgets/bombas/Proyeccion.tsx` | N4 | ½ | ✓ | ½ | ✓ (HTML) | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| G21 | **Esquema de planta** | `pages/Planta.tsx` + `widgets/planta/Simbolos.tsx` | N2 (Planta) | — | ✓ | ✓ | ✓ 12,2 en 1440, 1280 y 768 (en el teléfono, a un toque) | ✓ | — | — | — | ✓ | ✓ | ✓ |
| G22 | **La tubería del campo de antes** | `widgets/choke/Tuberia.tsx` `TuberiaDelCampo` | Producción y Planta | ✓ | ✓ | ✓ | — (HTML) | ✓ | — | ✓ | **✗** | ✓ | ✓ | ✓ |
| G23 | **La tubería del agua** | `widgets/choke/Agua.tsx` | Agua (N2) | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | ½ | ✓ | ✓ | ✓ |
| G24 | **Qué limitó, día por día** (franja y barras) | `widgets/choke/Serie.tsx` | Producción | ✓ | ✓ | **✗** | ✓ 12,0 | ½ | — | ✓ | — | ✓ | ✓ | ✓ |
| G25 | **Escalera** (de lo que dan los pozos a lo que salió) | `widgets/choke/Escalera.tsx` | Producción | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | — | ✓ | ✓ | ✓ |
| G26 | **Día a día** (real, potencial y meta) | `widgets/produccion/Diaria.tsx` | Producción y Resultados (detrás de «ver») | ½ | ✓ | ✓ | ✓ 12,0 | ✓ | **✗** | ✓ | — | ✓ | ✓ | ✓ |
| G27 | **Factor de asignación** | `widgets/diferidos/Factor.tsx` | Producción | ✓ | ✓ | ✓ | ✓ 12,0 | ✓ | — | — | — | ✓ | ✓ | ✓ |
| G28 | **Mes a mes del libro** | `widgets/diferidos/MesAMes.tsx` | Diferidos | ✓ | ✓ | **✗** | ✓ 12,0 | ½ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| G29 | **Por dónde se trabó / por tramo / ramas** | `widgets/diferidos/PorTramo.tsx` + `choke/Ramas.tsx` + `resumen/DondeSeTrabo.tsx` | Diferidos y Resultados | ✓ | ✓ | ✓ | — | ½ | — | **✗** | — | ✓ | ✓ | ✓ |
| G30 | **Por campo** (barras chicas contra meta y máximo) | `widgets/resumen/PorCampo.tsx` + `shared/ui/BarraMeta.tsx` | Resultados de todos | **✗** | ✓ | ✓ | — | ✓ | — | ✓ | — | ✓ | ½ | ✓ |
| G31 | **Barra contra la meta** (cifra grande) | `shared/ui/BarraMeta.tsx` | Diferidos, Producción, Mantenimiento y Planta (nivel del tanque) | ½ | ✓ | ✓ | — | ✓ | ½ | ✓ | — | ✓ | ✓ | ✓ |
| G32 | **Dónde bajarlo y tipo de causa** (Pareto) | `widgets/diferidos/Paretos.tsx` | Diferidos, Resultados y Equipos del gerente | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | — | ✓ | ✓ | ✓ |
| G33 | **Fallas por mes** | `pages/Confiabilidad.tsx` | Confiabilidad | **✗** | ✓ | ½ | ✓ 15,8 · 13,4 · 12,9 | ½ | — | — | — | ½ | ✓ | ✓ |
| G34 | **Árbol de causas como la circular** | `widgets/choke/ArbolCircular.tsx` | Regulatorio | — | ✓ | ✓ | — (HTML) | ✓ | — | ✓ | — | ✓ | ✓ | ✓ |

Hay otros dibujos que no son gráficos de dato y quedan fuera de la tabla:
- los íconos de lucide;
- las marcas (`Prioridad.tsx`);
- el logo;
- los símbolos de la configuración (`configuracion/marcas.tsx`);
- la ficha del gerente con «Lo que pasó» (`choke/AguaHoy.tsx`): es texto con cifras.

## Notas por gráfico (la evidencia)

**G1 · Tubería acostada** `[01]` `[02]` `[05]` `[06]`
- **Escala** desde el eje: alto = valor × 88 / escala, simétrico.
- **Rayado medido:** 10,47 px de alto × 121 px. Es proporcional a 1.665 y respeta el mínimo de 2 px (`Math.max(2, …)`).
- **El tramo:**
  - un solo tramo marcado por momento (`data-marcado`);
  - «limita» con doble contorno en tinta;
  - el ramal vuelve al yacimiento con flechas fijas;
  - «Sin identificar» aparte y discontinuo;
  - Antes: llena, con la línea de riesgo;
  - Después: barras bajo cada tramo (118 y 573, `data-barra-despues`).
- **Teclado** (medido): Tab recorre reservorio → pozo → planta → exportacion → sin identificar; Enter abre la hoja; Escape la cierra; el foco es un anillo índigo.
- **(6) ½:** en Antes, «Al cierre 293.287 bbl ■3» va sin «proyectado» ni trazo discontinuo (H10).
- **(8) ½:**
  - la gota de la pérdida no se dibuja: no hay registro, y la leyenda lo dice ✓;
  - el dibujo de esta tubería y el de Producción y Planta son distintos (H8);
  - en Después, el ramal sigue con «P-201B parada desde 03:52», que es estado de ahora (H28).
- **(9) ½:** no hay «ver como tabla» (H29).

**G2 · Tubería de pie** `[03]` `[04]`. A 320 px el viewBox de 326 se encoge: «Yacimiento» 11,6 px, «la roca» 10, «15 de 18 en marcha» 10,8 (H9). El auditor no lo ve porque no mide 320.

**G3 y G4 · En chico.**
- La de Hoy repite el dibujo con `preserveAspectRatio="none"`: los extremos y el rayado se estiran y el hueco rayado queda en 2 px de alto `[15]` (H27).
- En la de La planta viva el tramo trabado se angosta y se raya ✓.

**G5 · Mes a mes de La planta viva.**
- Bien:
  - 13 barras desde cero;
  - el máximo en discontinuo por mes;
  - ■3 sobre febrero;
  - octubre con contorno discontinuo y «octubre: 661 bbl/d» en la cabecera;
  - rótulos de tres en tres.
- **(4)** baja a 9,5 px a 320 (ejes y meses).
- **(5) ½:** las barras apiladas `--dato1` contra `--dato3` dan 2,66:1 (claro) y 2,43:1 (oscuro) (H21).

**G6 · Diferido por equipo** `[01]` y Resultados.
- **(7) ✗:**
  - 573 + 247 + 118 + 109 = **1.047** a la vista, contra el total de **1.046**;
  - LC-21 247 + LC-08 109 = **356**, contra «**355** sin causa» en la misma pantalla.
  - Los valores exactos sí cuadran: 573,06 + 246,53 + 117,92 + 108,52 = 1.046,03.
  - Es el redondeo de cada parte (H2).
- **(3) ½:** «octubre · calculado» dice el período, pero la unidad (bbl) no está.
- Además, el mismo equipo es «bomba de agua» en La planta viva y Resultados y «bomba de reinyección» en Diferidos y Riesgo (para R1).

**G10 · Mes a mes de Resultados** `[15]`.
- Bien:
  - dibujado al ancho de verdad: 12 px en los 5 anchos, también a 320;
  - cada mes es un botón con su frase;
  - Tab y Enter abren el mes como período.
- **(11):** cambiar «Por equipo / Por dónde se trabó» toma 0,7–1,8 ms de JS (4,8 con CPU ×4) ✓.
- **(11) ½:** «un mes como período» toma **18,4 ms** de JS en el escritorio y **61,5 ms** con CPU ×4, hasta 112 ms para pintar (H26).

**G11 · Barras de Resultados** `[19]`.
- El cierre proyectado va rayado y con chip ✓.
- **(1) ½:** la barra se corta en 1,25 veces la meta sin marcarlo. El diferido proyectado, 58.880 contra un máximo de 24.800 (2,37 veces), se dibuja igual que uno de 1,25 (H25).

**G13 · Mantenimiento.** La espera va **rayada**, que en TRIM es «lo que no pasa» y «proyectado»: el rayado tiene cuatro sentidos (H24).

**G14 a G16 · Indicadores del N3** `[09]`.
- Bien:
  - banda en `--banda` y rayas de extremo;
  - alarma de 2,4 px en tinta;
  - puntero en tinta, o en gris con el equipo parado;
  - minitendencia sobre la misma escala;
  - ventana escrita («21 de sept → hoy, 2 de oct»);
  - como mucho 3 gráficas.
- **(1) ✗:** la escala sale de los límites, **las lecturas de la ventana y el valor de ahora** (`equipos-tecnico.ts:482-492,514`). La nota de la tarjeta dice «La escala de cada señal es fija» (H5).
- **(9) ½:** la tendencia grande es `aria-hidden` y su figura no dice hacia dónde va.

**G17 · Tren de agua.**
- Bien:
  - por brillo: P-201B oscura con contorno de 2,2 px; P-201A y P-201C sin relleno y discontinuas;
  - burbujas PI 18,2, PDI 0 y FI 0;
  - «174.033 bbl/d entran: las toman P-201A y P-201C» cuadra con «Mientras esté parada»;
  - por debajo de 312 px, en renglones.

**G18 · Analógico de antes** `[12]`.
- **(1) ✗:** escala del valor actual ± 12 % (`Analogico.tsx:39-44`): con la bomba en 0, la banda se va a la derecha.
- **(5) ½:**
  - banda en `--tinta3` al 30 % (1,34:1), sin rayas de extremo;
  - deduce la prioridad (`estado ?? (enAlarma ? 1 : fuera ? 2 : 0)`).
- La placa no tiene minitendencia (H12).

**G19 · Minigráfica del N4** `[13]`.
- **(5) ✗:** el último punto va en rombo naranja en FI-2011, II-2011 y PDI-2011 **con la bomba parada**, más el ◆1 de 11 px de la fila (H4).
- **(1) ½:** escala del mínimo al máximo de la serie, no fija.
- **(3) ½:** sin ventana escrita.

**G20 · Proyección del vigía** `[17]`.
- Bien: proyección en discontinuo con «en 5,2 d» y su rango; ventana «hace 11 d · hoy · +5,7 d»; el límite rotulado («límite 12 psi»).
- **(1) ½:** sin banda normal ni valores de escala (H23).

**G21 · Esquema de planta** `[16]`.
- Bien:
  - 2D, sin filtro;
  - cajas sin tinte, con borde de 2 px en el color de la condición y anillo solo en P1;
  - marca arriba a la izquierda;
  - por brillo («Bombas de agua · detenido» más oscura);
  - líneas por trazo (continuo, discontinuo y punteado) y no por color;
  - nada se mueve.
- Detalle: los tags van en `font-mono` (`Planta.tsx:434`) y no en Air Condensed (para R2).

**G22 · Tubería de antes** (Producción y Planta) `[10]`.
- Es otro dibujo de la misma tubería: cajas tan altas como su capacidad, el núcleo oscuro y una línea discontinua de «hoy».
- **(8) ✗:** **ni angostamiento ni rayado** donde se trabó. Es otro código para lo mismo que muestra La planta viva (H8).
- Debajo dice «se pierden 1.966» (H15).
- Bien: tiene «Ver como tabla» y los cuadres (9.394 pasa; 1.665 + 301 = 1.966; 118 + 573 + 355 = 1.046).

**G23 · Tubería del agua** (Agua). Es HTML en cajas y no la rama de X5 §5.3:
- «casi iguales» va con borde discontinuo grueso;
- «1. 2. 3.» en «Por qué es crítica», junto al ◆1 de P-201B (H32);
- «se pierden 1.665 bbl/d de crudo» (H15).

**G24 · Qué limitó, día por día** `[14]`.
- **(3) ✗:** el eje dice «792» y «0» sin unidad.
- **(5) ½:** las abreviaturas «Po», «Pl» y «Af» en la franja; el patrón de cada tramo distingue sin color ✓.

**G25 · Escalera.** Cuadra: 18.774 − 787 = 17.987; 17.987 − 691 − 355 = 16.941; 691 + 355 = 1.046 ✓.

**G26 · Día a día** `[14]`.
- **(6) ✗:**
  - el potencial (calculado) va discontinuo, el trazo de lo simulado o proyectado (X2 §5.3, punto 8);
  - el tramo al día en curso va discontinuo «3 3» sin leyenda;
  - con 2 días de octubre, toda la línea «real» se ve discontinua (H18).
- **(1) ½:** el eje no parte de cero (9,0 k – 12,0 k). Es una línea, se admite, pero el «diferido» sombreado es una cantidad.

**G27 · Factor.** Banda de ±15 % sombreada, la referencia 1,00 en discontinuo y 13 meses rotulados ✓.

**G28 · Mes a mes del libro** `[14]`.
- **(3) ✗:** «16,9 k» sin «bbl» en el título ni en el eje.
- **(5) ½:**
  - el cuadrado de «pasó el máximo» está hecho a mano (7–8 px, sin «3», `diferidos/MesAMes.tsx:166`) (H20);
  - «por señal» y «declarado» son dos grises casi iguales.

**G29 · Por tramo** `[completas, Diferidos]`.
- 118 + 573 + 355 = 1.046 ✓.
- **(7) ✗:** «LC-21 247 · LC-08 109» bajo «Sin identificar 355» (H2).

**G30 · Por campo.**
- **(1) ✗ S1:** La Zarza y Guacamayo, con **0 bbl/d** de diferido, dibujan **la barra llena** (32 de 32 px), pasada la raya del máximo. El estilo del relleno llega vacío (`style` = null); en las demás filas llega con su porcentaje (H1).
- **(10) ½:** las pistas miden 32 px a 1280: no se leen (H33).

**G31 · BarraMeta.** Se corta en 1,25 veces la meta sin marca (H25) y no tiene variante «proyectado»: quien la use para un cierre lo pinta como medido (`ResumenDirectivo.tsx:157-159`, en Diferidos).

**G33 · Fallas por mes** `[15]`.
- **(1) ✗:** sin eje ni valores: no se puede leer cuántas fallas hubo.
- Otros problemas:
  - meses «10 11 12 01 … 10» sin año;
  - tres series en tres grises apilados (2,66:1 entre vecinos);
  - `aria-label` genérico («Fallas de equipos de alto impacto por mes»).
- A 390 px se desplaza dentro de su contenedor (`min-w-[420px]`) ✓.

## Los cuadres, contra el motor

| Cuadre | Valor exacto (motor, `data-*`) | En pantalla | ¿Cuadra? |
|---|---|---|---|
| **1.665 + 301 = 1.966** (lo que se deja de producir ahora en La Ceiba) | planta 1.665,18 + sin identificar 300,84 = 1.966,03 | 1.665 + 301 = 1.966 en La planta viva (cifra, tubería y explicación), Hoy (sup: «1.966», «no pasan 1.665»), Equipos (P-201B 1.665 y LC-21 301), N3 (P-201B 1.665 y LC-21 301), Riesgo y Turno (1.966 con 1.665 y 301), Producción y Planta (1.966 con 1.665 y 301) | ✓ |
| **118 + 573 + 355 = 1.046** (octubre) | 117,92 + 573,06 + 355,04 = 1.046,03 | La planta viva en Después (tramos y «355 bbl sin identificar»), Resultados (cifra 1.046), Diferidos (por tramo), Producción (Escalera: 691 + 355) | ✓ |
| **1.966 + 684 = 2.650** (todos los campos) | La Ceiba 1.966,03 + Morichal 684,07 = 2.650,09 | La planta viva de todos: 2.650; filas 1.966, 684, 0, 0 y 0 | ✓ |
| Todos los campos, Después | 1.253,23 + 1.046,03 + 77,50 = 2.376,75 | Cifra **2.377**; filas 1.253 + 1.046 + 77 = **2.376** | **✗ redondeo** (H2) |
| Diferido por equipo de La Ceiba | 573,06 + 246,53 + 117,92 + 108,52 = 1.046,03 | 573 + 247 + 118 + 109 = **1.047** | **✗ redondeo** (H2) |
| Sin identificar de La Ceiba | LC-21 246,53 + LC-08 108,52 = 355,04 | «355 sin causa» y, al lado, 247 + 109 = **356** (La planta viva, Resultados y Diferidos) | **✗ redondeo** (H2) |
| ¿Se puede publicar? (Diferidos) | — | 17.987 − 16.941 = 1.046; 691 + 0 + 355 = 1.046 | ✓ |
| Diferido del turno | — | Hoy «723 barriles · últimas 12 h» = Turno «723 bbl diferidos · 12 h» | ✓ |

**Ninguna cifra cambia de una pantalla a otra.** 1.966, 1.665, 301, 1.046, 355, 573 y 2.650 son las mismas en La planta viva, Resultados, Hoy, Equipos, N3, Riesgo, Turno, Producción y Diferidos. Lo que no cuadra es la **suma a la vista** de partes redondeadas una por una: diferencia de 1 bbl.

## El rendimiento (§8.10: ≤ 16 ms al cambiar de momento o de filtro)

Event Timing del navegador, con el clic real de Playwright. «JS» es `processingEnd − processingStart`: el trabajo de React para volver a armar el dibujo. «Pintado» es `duration`, hasta el cuadro siguiente, redondeado a 8 ms.

**Build de producción:**

| Cambio | JS, escritorio CPU ×1 (ms) | Pintado (ms) | JS, teléfono CPU ×4 (ms) | Pintado (ms) |
|---|---|---|---|---|
| La planta viva, La Ceiba: Antes → Después → Durante | 3,1 · 7,8 · 3,4 | 48 · 24 · 16 | 12,0 · 11,0 · 5,8 | 56 · 32 · 16 |
| La planta viva, todos | 3,7 · 2,9 · 3,0 | 48 · 24 · 24 | 10,4 · 11,0 · 4,5 | 56 · 32 · 16 |
| Resultados: «Por equipo / Por dónde se trabó» | 1,4 · 0,7 · 1,8 | 48 · 24 · 24 | 4,8 · 3,3 · 2,0 | 56 · 16 · 16 |
| Resultados: un mes como período | **18,4** | **56** | **61,5** | **112** |
| Equipos: filtros | 1,9 · 2,9 · 1,4 | 48 · 24 · 16 | 8,2 · 9,7 · 5,8 | 64 · 32 · 16 |
| N3: al vecino del tren | 6,9 | 48 | **21,1** | **64** |

**En el servidor de desarrollo** (React en modo dev, de 2 a 4 veces más lento), para comparar: los momentos toman 11,7–15,9 ms de JS; el mes como período, 43 ms; el filtro «Todos» de Equipos, 34 ms.

**Lectura:**
- El trabajo de dibujar cabe en 16 ms en todo, salvo cambiar el período desde el mes a mes y pasar al vecino en el teléfono, que recalculan el motor (D7 sigue bajo 300 ms).
- El **primer** cambio de cada vista tarda 48–56 ms en pintarse aunque el JS sea de 3 ms: es el primer cuadro después de la interacción (estilo y composición), no el gráfico.
- Lo de arriba va en H26.
