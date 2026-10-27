# Arreglos de F2 · La planta viva, Resultados y sus pantallas

**26-oct-2026 · F2.** Fase 4 de `PROMPT-REVISION-UX.md`, con la lista de `verificados-v1.md` (§4, F2) y `verificados-v2.md` («F2 · La planta viva y Resultados»).

**Cómo se hizo.** F2 tomó el motor (la regla de redondeo, La planta viva, Resultados), sus pantallas, Producción y el código sin uso. Tres forks de F2 hicieron, en paralelo y con archivos que no se pisaban:
- Regulatorio;
- Riesgo, Agua y los textos de `choke/*`;
- Diferidos, Mantenimiento, Confiabilidad y `Diaria`.

**Cómo quedó:**
- `npx tsc -b` y `npx oxlint src`: limpios.
- `verificar-libro`: 552 de 555. Las 3 que fallan son de otros:
  - la referencia de `agua-choke`, `choke/criticidad-*` y `equipos/*` (F3);
  - G-15 en `pages/Trabajo.tsx` (F1);
  - P-09 por `criticidad.ts` (F3).
- `verificar-arbol`: 128 de 128.
- `verificar-contrato`: 199 de 199.
- e2e corridas contra mi Vite (127.0.0.1:5182, apagado por su PID): `planta-viva`, `resultados`, `f2-regulatorio`, `f2-riesgo-agua` y `f2-diferidos-mant-conf`.
  - En dev: 26 de 26.
  - En Firefox e iPhone: 25 de 25 (la última corrida, de `planta-viva` y `resultados`, también 25 de 25 en los tres proyectos).
- Escaneo propio de 13 rutas a 1512, 1280, 1024, 768, 390 y 320 px: ningún texto de SVG bajo 12 px, ninguno sale de su dibujo y nada desplaza la página de lado.

**Abreviaturas de las pruebas:**
- **VL F2:** el bloque «F2 · La planta viva y Resultados» al final de `scripts/verificar-libro.mjs`.
- **VL Reg:** el bloque «F2 · Regulatorio».
- **VL Rie:** el bloque «F2 · Riesgo y agua».
- **VL Dif:** el bloque «F2 · Diferidos, mantenimiento y confiabilidad».
- **e2e PV / RS:** `e2e/planta-viva.spec.ts` y `e2e/resultados.spec.ts`.
- **e2e Reg / Rie / Dif:** las specs nuevas `e2e/f2-*.spec.ts`.

Cada prueba falla sin su arreglo: por ejemplo, LC-08 daba 109, 247 + 109 = 356, 2.377 contra 2.376, la barra de La Zarza llena, producción con 1.966 y el «Ver…» de 36 px.

## La regla de redondeo (H2), el cimiento

- **Dónde va:** `src/entities/redondeo.ts` (nuevo).
  - `repartirEnteros`: mayor residuo, con el desempate por el valor exacto y después por el id.
  - `porcentajesEnteros`.
  - `enterosDelPeriodo(campo, …)`: raíz, tramo, escalón, elemento, equipo con su causa, fila y evento.
  - `enterosDeReparto(campos, …)`: encima de la raíz, la suma de las raíces.
  - `enterosDeAhora`: lo de Durante.
- **Lo exacto se conserva** en los campos de siempre (el contrato y `data-valor`). Lo que se ve son campos nuevos:
  - `entero`;
  - `bblEntero` y `pctEntero`;
  - `enteros` en `/vistas/choke/reparto`.
  - Así `referencia/` solo cambió en lo mío.
- **Quiénes lo leen:**
  - La planta viva, Resultados, «Por tramo» de Diferidos y el Pareto (F2);
  - `entities/hoy.ts` (F1) y `equipos-tecnico.ts` (F3);
  - `regulatorio.ts` y `mantenimiento.ts` (los forks).
- **Cómo queda:**
  - 118 + 573 + 355 = 1.046;
  - 573 + 247 + 118 + **108** = 1.046 (LC-08 = 108 en las cinco lecturas probadas);
  - 55 + 24 + 11 + 10 = 100 %;
  - todos los campos: **2.376** = 1.253 + 1.046 + 77;
  - ahora: 1.665 + 301 = 1.966 y 2.650.
- **Pruebas:** VL F2 (cuatro comprobaciones), RS («F2 · la regla de redondeo…», con el Pareto de Diferidos) y PV (los tramos a la vista suman 1.046).

## S1

| Id | Estado | Archivos | Prueba |
|---|---|---|---|
| **P-01** · producción abre en su respuesta | Hecho | `planta-viva.ts` (`LENTE_TECNICA`, `tecnicaDe`), `plantaviva/Tecnica.tsx` (nuevo), `Heroe.tsx`, `pages/PlantaViva.tsx`. Producción ve «**9.394** barriles por día · salen hoy de La Ceiba.», con «Limitan los pozos: a la planta le sobran 1.143 bbl/d. Con P-201B parada, el agua solo deja pasar 236 bbl/d más de crudo.». Además: «Si falla hoy», los 3 primeros (P-201A, P-201C y LC-11, en bbl/d); lo que cabe y lo que le sobra a cada tramo; y «Ver Hoy» en lugar de «Compartir el informe» | VL F2 «P-01»; PV «producción: la lente técnica…» |
| **P-03** · regulatorio: qué falta, quién y para cuándo | Hecho (fork) | `anh-calidad.ts` (`paradasSinCausa`), `entities/regulatorio.ts`, `shared/api/regulatorio.ts` (`GET /vistas/anh/reporte`) y `pages/Regulatorio.tsx`. La Ceiba: 2 paradas, 355 bbl (LC-21 247 + LC-08 108), quién y la hora límite | VL Reg; `verificar-contrato` F2; e2e Reg |
| **T-8 / G-1 / G-2 / H15** · lo diferido dicho como pérdida | Hecho en los textos de F2 | `choke/Tuberia.tsx`, `Agua.tsx`, `AguaHoy.tsx`, `palabras.ts`, `Serie.tsx`, `Escalera.tsx`, `ArbolCircular.tsx`, `riesgo/SiFallaHoy.tsx` y `plantaviva/HojaTramo.tsx`. **Pendiente de F3:** las frases del motor (`criticidad.ts`, `choke-agua.ts`), pedidas en `coordinacion.md` con su redacción | VL Rie; e2e Rie |
| **G-15** · «Avisan» con un solo conteo | Hecho en Mantenimiento (fork) | «1 equipo avisa», de `useCifrasDeUnNombre().avisan`. El filtro de Equipos es de F3 | VL Dif; e2e Dif |
| **G-16** · «Si falla hoy» en una unidad | Hecho (forks) | Riesgo y Mantenimiento: «le costaría la falla» en bbl (D-2); `costoHoy` lo cambió F1 | VL Rie, VL Dif |
| **H1** · la barra llena con 0 | Hecho | `resultados/Cifra.tsx` (piso en 0 y sin relleno), `libro.ts` (`porCampo`: `diferidoDia` con piso en 0, más `realDia` y las metas por día) y `resumen/PorCampo.tsx` | VL F2 «H1»; RS (La Zarza: el relleno mide 0 px) |
| **H2** · repartos que no suman | Hecho | arriba | arriba |
| **H3** · una marca por equipo | Hecho | Mantenimiento y Riesgo (forks, con `useCondiciones` y `useFranja`); Pareto de Diferidos y «Por campo» (`diferidos/marca.ts`, `severidadDeCondicion`) | VL Dif, VL Rie; RS (el Pareto: P-201B «Prioridad 1, alarma») |

## S2

| Id | Estado | Archivos | Prueba |
|---|---|---|---|
| **H7 / UI-02** · la hoja del tramo | Hecho | `plantaviva/HojaTramo.tsx`. En el escritorio, panel no modal:<br>• sin velo, debajo de la cabecera, con la franja libre;<br>• el foco entra y vuelve al tramo;<br>• Escape o un clic afuera lo cierran.<br>En el teléfono, modal, con `data-velo`: tocar el velo la cierra | PV «F2 · la hoja del tramo no tapa la franja…»; PV 320 px «tocar el velo» |
| **H8 / P-16 / UI-19** · la tubería de antes | Hecho en Producción | `plantaviva/Tecnica.tsx` (`TuberiaTecnica`) en `pages/Produccion.tsx`. **Planta (F3) y Causa (F1)** la montan con una línea (`coordinacion.md`) | VL F2 «P-16 y H8» |
| **H10** · «Al cierre» de Antes | Hecho | `planta-viva.ts` (`venta.calidad`) y `Tuberia.tsx`: «proyectado», con trazo discontinuo | VL F2 «H10»; PV |
| **H11** · cifras de más | Hecho | `resultados/Cifra.tsx` y `Tarjetas.tsx`: el cierre proyectado, el 14 %, ≈ 2.133 y el 75 % a 18 px. `Confiabilidad.tsx` (fork) | RS («una sola de 54 o más; las secundarias, 4 o menos»); VL Dif |
| **H14** · 1440 × 900 | Hecho a 1440 | La pérdida pasa a la ⓘ de «Dónde se trabó» (también UI-12 e I-ger-3), y F1 movió DEMO. **A 1280 no** se puso la columna de 320 px: la tubería se encogía a 0,82 y sus rótulos bajaban de 12 px (§8.4), que manda | PV «1440 × 900: la vista del gerente cabe» |
| **H28** · Después repetía 1.046 | Hecho | En Después, «Este mes» dice «Septiembre cerró en 7.716» (`esteMes.mesAnterior`, `Filas.tsx`), y el ramal lleva «ahora:» delante | VL F2 «H28»; PV |
| **UI-04** · estilo B en las pantallas de F2 | Hecho | Producción (la cabecera en tarjeta de B), Riesgo, Agua, Diferidos, Mantenimiento, Confiabilidad y Regulatorio (forks) | C5 §13 (títulos); VL Dif, VL Rie y VL Reg |
| **P-09** · una familia por equipo | Hecho en lo de F2 | Riesgo, Paretos y la lente técnica: «bomba de agua». **Pendiente de F3:** `criticidad.ts` (el nombre «P-201A · bomba de reinyección») y `flota.ts`; hoy hacen caer la prueba del glosario de F4 | VL Rie, VL Dif; glosario de F4 |
| **P-12** · «limita» sin firmar | Hecho | `planta-viva.ts` (`capacidad`, `limitaSinFirmar`, la ⓘ en el rótulo), `Tuberia.tsx` (el globo y el nombre accesible), `HojaTramo` y `Capacidades` | VL F2 «P-12» |
| **P-13** · campo de gas | Hecho | «0 barriles por día de crudo se dejan de producir.», con «Es lo del crudo: la tubería del gas todavía no está.». Nunca «produce sin paradas» | VL F2 «P-13» |
| **P-14** · «da para» → «solo deja pasar» | Hecho | `planta-viva.ts` (`notaAngosto`, `fraseAngosto`) | VL F2 «P-14» |
| **G-5** · «Potencial del libro» | Hecho | Producción (yo); Diferidos y Regulatorio (forks) | VL Dif, VL Reg |
| **G-7** · «Promedio por día» | Hecho | `planta-viva.ts` | VL F2 «G-7» |
| **G-13** · «bbl · retorno posible del ciclo» | Hecho | `plantaviva/Lateral.tsx` | el glosario de F4 («bbl en el ciclo» no vuelve) |
| **T-9 / P-planta-2 / P-agua-1** | Hecho en los widgets (fork) | Una frase; la cuenta, detrás de «Ver la cuenta». Lo que es frase del motor (`choke-agua.ts`), pedido a F3 | VL Rie; e2e Rie |
| **P-diferidos-1 / P-produccion-1 / P-mant-1** | Hecho | Diferidos con la cifra de Resultados (fork); Producción en dos líneas (yo); la frase de lo programado (`entities/mantenimiento.ts`, fork, y también en Resultados del jefe) | VL Dif; VL F2 «P-mant-1»; RS |
| **P-reg-1** · los códigos detrás de un toque | Hecho (fork) | `ArbolCircular.tsx` («Ver los códigos ANH») | e2e Reg |

## S3

| Id | Estado | Archivos | Prueba |
|---|---|---|---|
| **H9** · texto de SVG de 12 px o más a 320 px | Hecho | Las dos al ancho de verdad (`useAncho`):<br>• `TuberiaDePie`, con un arreglo angosto: rótulos más cerca, el ramal y «Pedir la causa» en dos renglones;<br>• `MesAMesYBajando`, rotulado de 3 en 3 o de 4 en 4 | PV 320 px (La Ceiba, los tres momentos, y «Todos mis campos») |
| **H21** · 1 px entre segmentos | Hecho | `Lateral.tsx`, `resultados/MesAMes.tsx` (`data-separador`) y `Confiabilidad.tsx` (fork) | RS |
| **H24** · la espera sin rayado | Hecho | `resultados/Tarjetas.tsx`: gris liso, con su muestra | RS |
| **H29** · «Ver como tabla» | Hecho | `Tecnica.tsx` (`TablaTramos`): plegada en la pantalla y siempre en el papel | PV |
| **H33** · pistas de 32 px | Hecho | `resumen/PorCampo.tsx`: rejilla por el ancho de la tarjeta (`@container`) | RS (a 1280 px, la pista más angosta mide 80 px o más) |
| **A5** · blancos de 44 px | Hecho | `resultados/piezas.tsx` (`AlDetalle`), «Ver el plan», «Ver la producción día a día», `Tecnica.tsx`, `Momentos` (`toque`) | RS 390 px |
| **A6** · la cifra y su frase juntas | Hecho | `Heroe.tsx` (`role="group"` y `aria-labelledby`) | PV |
| **A15** · títulos h2 | Hecho | `Lateral.tsx`, `Tecnica.tsx`, «Dónde se trabó» y `HojaTramo` | PV (no se salta de nivel) |
| **A16** · «barriles por día» para el lector | Hecho | `planta-viva.ts` (`enPalabras`, el nombre del dibujo, `mesAMes.aria`) y `resultados.ts` | VL F2 «A16»; C2 y PV ajustadas |
| **A21** · la barra y su leyenda en el papel | Hecho | `resumen/DondeSeTrabo.tsx` (`data-sin-partir` y `print:break-before-avoid`) | VL F2 «P-16 y H8… A21» (en el código: el papel no se imprimió) |
| **V2-2** · enlaces en el papel | Hecho | `Tuberia.tsx` y `Lateral.tsx` (`no-imprimir`) | PV (con `media: print`) |
| **UI-10 / UI-18 / P-18** · el control de los momentos | Hecho | `Momentos.tsx`: el lema con su token y el blanco de 44 px. El momento va en el estado y en la dirección (con F1) | VL F2 «UI-10 y UI-18»; PV («…/despues» abre en Después) |
| **UI-12 / I-ger-3** · la pérdida | Hecho | «Pérdida: nada registrado en octubre», en la ⓘ | C2 ajustada; PV |
| **P-19** · el porqué en palabras | Hecho | `planta-viva.ts` (`CAUSA_EN_PALABRAS`): «falla de la planta (P-201B, bomba de agua) → afectó a varios pozos · 573 bbl» | VL F2 «P-19» |
| **P-20** · «N de M planes en marcha» | Hecho | `planta-viva.ts` lee las decisiones (`op.decisiones`, `sesion.planes` por la costura) y `Lateral.tsx` las muestra. Sin decisiones da «0 de 3 planes en marcha»; con una aceptada, «1 de 3» | VL F2 «P-20» |
| **P-21** · código sin uso | Hecho | Se borraron `pages/Resumen.tsx`, `pages/Portafolio.tsx`, `resumen/ResumenDirectivo.tsx`, `riesgo/Ahora.tsx`, `resumen/enAlarma.ts` y `diferidos/Encabezado.tsx`, y las ramas «decision» de Diferidos, Producción y Riesgo. `verificar-libro`: la lista de C5 ya no lee `Resumen.tsx`, y la de F4 ya tenía su guarda | VL F2 (no existen y no vuelven) |
| **I-ger-7** · «lo no planeado, por día» | Hecho | `Lateral.tsx` | — (texto; en la captura) |
| **P-resultados-1** · la conclusión primero | Hecho | `resultados.ts`: «Va 221 bbl por debajo del máximo firmado a la fecha (1.267)…» | C5 y RS ajustadas |
| G-6, P-planta-3, G-8, I-reg-2, P-agua-2, P-riesgo-1, P-conf-1, T-10, T-11, UI-15, UI-17, H16, H17, H18, H20, H22, H32, A18 y V2-1 | Hechos (forks) | ver los reportes de los forks, resumidos en `coordinacion.md` | VL Reg, VL Rie, VL Dif; e2e Reg, Rie, Dif |
| A17 | Lo resolvió F1 (`Tip.tsx`) | — | — |

## Lo que pidió el encargo, punto por punto

- **«Al cierre» en Antes, con «proyectado»:** H10, hecho.
- **La tubería de antes:** V2 decidió el dibujo de La planta viva. Hecho en Producción; `TuberiaTecnica` queda lista para Planta (F3) e Identificar (F1).
- **El texto de SVG a 320 px:** H9, hecho. El mes a mes del portafolio también se prueba.
- **La barra contra la meta cortada a 1,25×:** **no se tocó.** V2 la refutó (H25): X2 §5.2 lo decide así a propósito, y la marca y el `aria-label` dicen lo que se sale.
- **«3 de 11 planes en marcha»:** P-20, hecho. El motor sí lee `sesion.planes`.
- **«¿Dónde va el próximo instrumento?»:** acordado con F3 en `coordinacion.md`.
  - Va arriba de Equipos de confiabilidad, junto con «Ojo: no intervenir hoy».
  - En Riesgo se queda mientras Riesgo exista.

## No hecho o pendiente, con su porqué

- **H14 a 1280 px:** ver arriba. Gana la letra de 12 px.
- **LC-08 = 108 en el nivel 3 y en Identificar:** son vistas de F3 y F1. Ya importan `redondeo.ts`; la prueba en `verificar-libro` cubre mis vistas y `enterosDelPeriodo`.
- **Frases del motor en `criticidad.ts` y `choke-agua.ts` (T-8, P-agua-1) y el nombre de P-201A (P-09):** son de F3, pedidas con su redacción. Hasta que estén, la prueba de F4 de P-09 y la e2e de Riesgo («nada se pierde») fallan por esas frases.
- **`referencia/`:** regeneré solo `planta-viva/*` y `resultados/*`. `hoy/*` quedó con lo que da el motor de hoy (ver `coordinacion.md`). `agua-choke`, `choke/criticidad-*` y `equipos/*` son de F3 para regenerar.
- **«Ver el reporte» unificado:** `resultados.ts` (`publicarDe`) y `regulatorio.ts` repiten la regla de «¿se puede publicar?». No es un hallazgo; queda anotado para quien la una.
