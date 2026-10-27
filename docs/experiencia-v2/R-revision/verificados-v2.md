# V2 · Verificación adversarial: ISA-101, gráficos, accesibilidad y frontend

**26-oct-2026 · V2.** Fase 3. Entrada: los 34 hallazgos de R3 (`hallazgos-isa-graficos.md`, `isa-101.md`, `graficos.md`) y los 24 de R4 (`hallazgos-a11y-frontend.md`). Por defecto, escéptico: cada hallazgo se reprodujo con una medición propia o con la lectura del código, y se contrastó con lo que manda (el dueño, X5, X4 y X2, en ese orden).

**Cómo se verificó:**
- Vite propio en **5187** (`npx vite --port 5187 --strictPort`, PID 65784 y su `npx` 65766), apagado por su PID al terminar.
- El simulador, con una base temporal: `TRIM_DB=<scratchpad>/v2-sim.db PUERTO=8793 node simulador-api/indice.mjs` (PID 69407), apagado por su PID.
- Guiones nuevos en `herramientas/`:
  - `v2-ver.mjs`: abre una ruta en un ancho y un tema, hace los pasos (clic, Tab, Enter), evalúa una expresión y guarda la captura;
  - `v2-cls.mjs`: el CLS de la primera carga.
- Capturas propias en `capturas/v2/`. Se citan así: `[v2/h14]` es `h14-n1-ger-1440x900.png`.
- No se tocó `src/`, `e2e/` ni `scripts/`.

**Severidad:** S1 confunde, miente o bloquea; S2 hace pensar de más; S3 pulido.

---

## Resumen

| Origen | Confirmados S1 | S2 | S3 | Refutados | Total |
|---|---|---|---|---|---|
| R3 · ISA-101 y gráficos | **4** | 11 | 16 | 3 | 34 |
| R4 · Accesibilidad y frontend | **1** | 6 | 16 | 1 | 24 |
| Nuevos de V2 | — | — | 2 | — | 2 |
| **Total** | **5** | **17** | **34** | **4** | **60** |

**Cambios de severidad:**
- **Suben:** H15 (S2 → S1: es la regla 3, que no se rompe, y R1 la tiene igual en T-8) y H28 (S3 → S2).
- **Bajan:** H9 (S2 → S3), A6 (S2 → S3) y A8 (S2 → S3).
- **Seis con otro arreglo:** H2, H5, H14, H18, H24 y A9.

**Los S1 finales:**

| Id | Qué |
|---|---|
| **H1** | «Por campo»: un campo con 0 bbl/d de diferido pinta la barra llena, pasada la raya del máximo |
| **H2** | Repartos que no suman su total a la vista (573 + 247 + 118 + 109 = 1.047 bajo «1.046») |
| **H3** | El mismo equipo con dos marcas: P-201B ▲2 en Mantenimiento y Mi trabajo (◆1 en el resto); MPP-301 ■3 en la placa (▲2 en el resto) |
| **H15** | El diferido dicho como pérdida («se pierden 1.966») en Producción, Planta, Agua, Riesgo y Bombas |
| **A1** | En el tema claro, el foco del teclado no se ve en el panel índigo ni en la banda del teléfono (1:1) |

**Refutados:**
- **H25:** X2 §5.2 fija el tope de 1,25 a propósito.
- **H26:** es tiempo del motor dentro de D7, no del pintado.
- **H30:** X2 §4.4 fija la regla y el umbral, no el código de color.
- **A23:** cumple D7, y el mismo R4 lo dice.

---

## La regla de redondeo (decidida)

**La regla:** se redondea una sola vez, en el motor, de arriba abajo. La pantalla pinta enteros que ya suman y nunca redondea por su cuenta.

1. **La raíz es el total de un campo en su período** (o en «ahora»).
   - Se redondea al entero más cercano una sola vez.
   - Ese entero es la cifra del norte, la del papel y la de la ANH: 1.046 y 1.966.
   - Nunca se recalcula sumando las partes.
2. **Debajo de la raíz** (tramo → equipo → pozo o parada, y los porcentajes), el motor reparte el entero de la raíz por **mayor residuo** (método de Hamilton):
   - va de arriba abajo por la jerarquía;
   - desempata siempre igual: primero el valor exacto mayor, después el id;
   - publica el entero de cada nodo **una vez** por campo y período;
   - **toda pantalla que muestre ese nodo lee ese entero, aunque lo muestre solo.**
   - Una parte que no es cero y le toca 0 se dice «< 1», como ya hace `pctParte`.
3. **Encima de la raíz** (todos los campos, varios meses), el total que se muestra es la **suma de los enteros de las raíces**.
4. **El valor exacto se conserva:**
   - en `data-*` y en el contrato;
   - en la ⓘ de «calculado» («1.046,03 bbl; las partes se redondean para sumar el total»);
   - el archivo para la ANH sigue con sus decimales.
   - No hace falta una ⓘ en cada reparto.

**Cómo queda el demo:**
- Por tramo: 118 + 573 + 355 = **1.046**. No cambia, y es el cuadre que fija el encargo.
- Por equipo: 573 + 247 + 118 + **108** = **1.046**.
- Sin identificar: 247 + **108** = **355**.
- Porcentajes: 55 + 24 + 11 + 10 = **100 %**.
- LC-08 dice **108** en todas partes: en su N3, en Identificar, en Equipos del gerente y en Diferidos. Hoy dice 109 suelto y 109 en el reparto.
- «Todos mis campos», Después: **2.376** = 1.253 + 1.046 + 77. Hoy la cifra dice 2.377 y las filas suman 2.376. El Palmar queda en 77 en su fila y en su propia vista.
- Durante: 1.665 + 301 = 1.966 y 1.966 + 684 = 2.650. No cambian.

**Por qué no las otras:**
- **El total como suma de las partes redondeadas, en todo nivel.**
  - La cifra del norte cambiaría según cómo se parta: 1.046 por tramo y 1.047 por equipo.
  - El error crece con el número de partes: los 47 equipos de Morichal en 12 meses.
  - Rompe D3 (una sola cifra del norte) y el cuadre 118 + 573 + 355 = 1.046 del encargo.
  - Solo vale encima de la raíz: ahí las partes son pocas (≤ 5 campos, ≤ 13 meses) y cada una ya es una cifra publicada.
- **Solo una ⓘ:** deja a la vista una suma que no cuadra, que el encargo llama S1, y añade texto.
- **Mayor residuo en cada reparto, suelto (lo que propuso R3):**
  - la suma cuadra, pero LC-08 sería 108 en el reparto y 109 en su N3, en Identificar y en Equipos, contra «un nombre, una cifra» (X4 §1.3.3);
  - y en «todos», El Palmar sería 78 en la fila y 77 en su vista.

**Dónde va:**
- Un ayudante nuevo, `repartirEnteros(total, partes)`, en `src/entities/redondeo.ts` (dueño F2).
- Lo usan:
  - `planta-viva.ts`, `resultados.ts` y el libro de Diferidos (F2);
  - `equipos-tecnico.ts` (F3);
  - `hoy.ts`, Turno y Causa (F1).
- **Prueba** en `verificar-libro.mjs`, en la sección de F2, para La Ceiba y para todos:
  1. cada reparto mostrado suma el entero de su total;
  2. el mismo nodo tiene el mismo entero en todas las vistas (LC-08 = 108 en `/vistas/planta-viva`, `/vistas/resultados`, `/vistas/equipos/ceiba/LC-08/tecnico` y `/vistas/paradas/por-identificar`).

---

## ISA-101 y gráficos (R3)

### S1

| Id | Veredicto | Sev. (R3 → V2) | Evidencia propia | Por qué | Arreglo final y archivo |
|---|---|---|---|---|---|
| **H1** | CONFIRMADO | S1 → **S1** | `#/ger/resultados/ceiba~portafolio/curso`, 1280, claro: La Zarza y Guacamayo, `aria-label` «diferido: 0 bbl/d, máximo 50 / 450», `[data-relleno]` de **32 de 32 px**, `style` nulo `[v2/h01]`. Causa: `brecha = potencial − real` (`entities/libro.ts:733`) sale negativa; `BarraMeta.tsx:38` (no :41) da un ancho negativo, React descarta la declaración y el `<i>` en bloque llena la pista | El dibujo dice lo contrario de la cifra. Escala honesta (§8.1) | 1. `shared/ui/BarraMeta.tsx:38`: `Math.max(0, Math.min(1.25, valor / meta)) / 1.25` (**F1**).<br>2. Lo mismo en `widgets/resultados/Cifra.tsx:81` (**F2**).<br>3. `plantaviva/Filas.tsx:46` **no** se afecta: su `<i>` es absoluto y sin ancho mide 0. Se puede dejar.<br>4. `resumen/PorCampo.tsx:101` arma en la pantalla las cifras por día (`c.brecha / dias`). Que el motor (`libro.ts`, `porCampo`) mande el diferido por día ya con piso en 0: «produjo sobre el potencial» es 0 diferido (**F2**).<br>**Prueba e2e (F4):** en esa ruta, el `[data-relleno]` del diferido de `zarza` mide 0 px |
| **H2** | CONFIRMADO CON OTRO ARREGLO | S1 → **S1** | `cuadres.json` y lectura propia: «Diferido por equipo» 573 + 247 + 118 + 109 = 1.047 bajo 1.046; «355 sin causa» junto a 247 + 109 = 356; «todos», Después: cifra 2.377 y filas 2.376. LC-08 dice 109 **suelto** en su N3 (`#/prod/equipos/ceiba/LC-08`), en Identificar (`#/sup/causa/…`) y en Equipos del gerente | Una cifra que no cuadra, en la misma pantalla (§3, §8.6). El arreglo de R3 rompería «un nombre, una cifra» en esas tres pantallas | **La regla de arriba**: redondeo único de arriba abajo, mayor residuo debajo de la raíz y suma de raíces encima. El motor publica el entero de cada nodo. `entities/redondeo.ts` (nuevo), `planta-viva.ts`, `resultados.ts`, libro y `diferidos/PorTramo` (**F2**); `equipos-tecnico.ts` (**F3**); `hoy.ts`, Turno y Causa (**F1**). Prueba en `verificar-libro.mjs` (dos identidades, arriba) |
| **H3** | CONFIRMADO | S1 → **S1** | `#/jefe/mantenimiento/ceiba/curso`: «Prioridad 2 · atención · P-201B · sigue parado» (◆1 en las demás) y LC-08 ■3 por «arrancó sin identificar». `#/conf/bombas/morichal/curso`: la placa de MPP-301 «Prioridad 3 · aviso»; en `#/conf/equipos/morichal/curso` y en su N3, ▲2 «Atención · filtro de entrada». Código: `Mantenimiento.tsx:117`, `Trabajo.tsx:56` (`!p.fin ? 2 : 3`) y `Placa.tsx:51` (`eq.severidad`) | El equipo más grave del campo sale como prioridad 2 en la pantalla del jefe: un color que dice lo que no es (X2 F2; X5 §6.4) | 1. El motor expone **la condición de cada equipo** (la de `franjaDe`) en `/vistas/equipos-hoy`: `entities/condiciones.ts` y `shared/api/condiciones.ts` (**F1**).<br>2. La usan `Placa.tsx` (**F3**), `Mantenimiento.tsx` y `Riesgo.tsx:186` (**F2**), y `Trabajo.tsx` y `Turno.tsx:234` (**F1**).<br>3. En las filas de tarea, la marca **del equipo** (X5 §5.7, que manda sobre X2 F5); un equipo sin condición, como LC-08, va sin marca.<br>**Prueba e2e (F4):** recorrer jefe, tec y conf, juntar equipo → forma de su marca y exigir una sola |
| **H15** | CONFIRMADO | **S2 → S1** | Texto medido: Producción y Planta «pasan 9.394, **se pierden** 1.966»; Agua «**se pierden** 1.665 bbl/d de crudo», «… 1.426», «… 3.059»; Riesgo «está parada: **se pierden** 1.665 bbl/d ahora»; Bombas de Morichal «luego **se pierden** 783 bbl/d». Está en el motor (`criticidad.ts:176,177,221,293`; `choke-agua.ts:344,347`) **y en la pantalla** (`choke/Tuberia.tsx:505`, `choke/Agua.tsx:319,338`, `choke/AguaHoy.tsx:71`, `bombas/Placa.tsx:169,172`) | Rompe la regla 3, que no se rompe: llama pérdida a lo que es diferido, mientras La planta viva dice «Pérdida: sin eventos registrados». Miente según el propio glosario. R1 lo tiene como **T-8 · S1**: misma severidad | «Se dejan de producir» o «deja de producir» en las frases del motor y de la pantalla: `criticidad.ts` y `choke-agua.ts`, `choke/Tuberia.tsx`, `Agua.tsx` y `AguaHoy.tsx` (**F2**); `bombas/Placa.tsx` (**F3**). **Cambian por diseño:** `verificar-libro.mjs:2680,2686,2930`, `e2e/choke-produccion.spec.ts:131,147` y `e2e/experiencia-f2c.spec.ts:116` (F2, F3 y F4, sin probar menos) |

### S2

| Id | Veredicto | Sev. | Evidencia propia | Por qué | Arreglo final y archivo |
|---|---|---|---|---|---|
| **H4** | CONFIRMADO | S2 | `#/conf/equipos/ceiba/P-201B/diagnostico`, `[data-instrumentos=P-201B]`: 8 marcas, 3 de ellas «Prioridad 1 · alarma», y 6 elementos en color al final de las minigráficas | ISA-18.2 y X2 E3/B9 (supresión por estado). La bomba ya lleva su ◆1 una vez: no miente, multiplica | `widgets/PanelEquipo.tsx` `FilaDispositivo`: que `Instrumentos` lea las señales de `useNivelEquipo` (ya traen `gris` y `condicion`), sin marca propia y con `Sparkline` en `--tinta3` (**F3**). Prueba: 0 `svg[viewBox="0 0 14 14"]` dentro de `[data-instrumentos=P-201B]` |
| **H5** | CONFIRMADO CON OTRO ARREGLO | S2 | `equipos-tecnico.ts:482-492,514`: `escalaDe(…, [...serie, valor])`. La nota de `Senales.tsx:83` dice «La escala de cada señal es fija». **`verificar-libro.mjs:3697-3700` exige hoy lo contrario de I1:** que la escala cambie con las lecturas | X2 I1 («nunca depende del valor de ahora»). La pantalla afirma algo que no es | 1. `escalaDe` solo con **los límites firmados** y la banda en el tercio del medio (Hollifield): dos lados [a, b] → [a − (b − a), b + (b − a)], con piso en 0 si la variable no es negativa; un lado → [0, 2 × límite].<br>2. **No el «× 1,5» de R3**: con «normal > 10», PI-2010 en 18,2 psi (normal) quedaría fuera de escala.<br>3. Sin ningún límite, no se dibuja el indicador: el valor y «sin límite declarado» (§7.8).<br>4. La nota: «La escala sale de los límites firmados; falta el rango del instrumento y el disparo: el sistema no los trae.»<br>5. `IndicadorFijo` con la escala del motor en `bombas/Placa.tsx:71`, `bombas/Detalle.tsx:121,446` y `pozos/DetallePozo.tsx:175` (**F3**).<br>6. La prueba de `verificar-libro.mjs:3697` se invierte por diseño: la misma señal con 3 valores tiene la misma escala (F3) |
| **H6** | CONFIRMADO | S2 | `[data-franja]` (x, y). A 1440: N1 (885, 44), Planta y Agua (885, 68), P-201B (885, 128), MPP-301 (891, 90), Mantenimiento **(272, 136)**. A 1280: N1 (725, 44); Planta y Agua **(272, 136)**; MPP-301 (731, 136) | X2 N2 y X5 §6.10: en el mismo lugar en N1, N2 y N3 | Lugar fijo para la franja en la primera fila, a la derecha y alineada con las migas: `widgets/Cabecera.tsx` (**F1**) y `CabezaEquipo` de `widgets/equipos/Nivel3.tsx` (**F3**). El período y Exportar nunca la empujan. Prueba e2e (F4): ≤ 4 px de diferencia en x e y a 1440 y 1280 |
| **H7** | CONFIRMADO | S2 | `HojaTramo.tsx:26-28`: `fixed inset-0`, velo `bg-[rgb(10_12_16/.4)]`, la hoja a toda la altura sobre la franja. `PanelEquipo.tsx:109,384`: velo `bg-black/35` | X2 N5 y B11 | En el escritorio, sin velo y empezando debajo de `[data-cabecera]`: `plantaviva/HojaTramo.tsx` (**F2**) y `PanelEquipo.tsx` (**F3**). **Cambia el patrón:** diálogo no modal (sin `aria-modal` ni lo de atrás inerte), el foco entra al abrir y vuelve al tramo al cerrar (A4), Escape cierra. Las e2e que prueban el foco atrapado se ajustan por diseño (F4). En el teléfono, la hoja que sube sigue con velo |
| **H8** | CONFIRMADO | S2 | `#/prod/produccion/ceiba/curso` y `#/prod/planta/…`: «La tubería del campo» en cajas, sin angostamiento ni rayado `[v2/h08]` | La regla 3 manda el diferido como estrechamiento rayado; además «todo se ve como B» | `TuberiaAcostada` con la lente técnica en `pages/Produccion.tsx` (**F2**) y `pages/Planta.tsx` (**F3**). Se conservan lo que cabe por tramo y «Ver como tabla» (H29). `choke/Tuberia.tsx` queda solo para el papel, si hace falta (**F2**) |
| **H10** | CONFIRMADO | S2 | Antes, 1440: `[data-venta]` = «Al cierre 293.287 bbl · meta 337.900 ■3», sin la palabra ni trazo discontinuo `[v2/h10]` | La regla 5 y X2 I7 y D1. «Al cierre» ya sugiere el futuro: hace pensar, no engaña. S2 | `entities/planta-viva.ts` manda `calidad: 'proyectado'`; `plantaviva/Tuberia.tsx` pone «Al cierre · proyectado» del tamaño de la unidad (**F2**) |
| **H11** | CONFIRMADO | S2 | Medido en la primera vista a 1440: Resultados, 1 de 64 px y **6 de 22 px** (10.700, 661, 293.287, 58.880, 14 %, ≈ 2.133) `[v2/h11]`. Confiabilidad, **7 de 24–26 px** | X5 §3.4 y X2 T1: como mucho 4 secundarias. Jerarquía rota | `resultados/Cifra.tsx`: el cierre proyectado a 18 px. `resultados/Tarjetas.tsx:67,90`: «14 %» y «≈ 2.133» a 18 px. **Falta en R3:** `pages/Confiabilidad.tsx`, dejar 4 de 24 px y el resto a 18 (**F2**) |
| **H12** | CONFIRMADO | S2 | `bombas/Placa.tsx:71` usa el `Analogico` viejo: banda `bg-[var(--tinta3)] opacity-30` (`Analogico.tsx:90`), sin rayas de extremo y sin `Minitendencia` | X2 I3, I6 y §5.1, punto 10. La banda es el contexto del indicador | Con el mismo cambio de H5: `IndicadorFijo` + `Minitendencia` de `nivelEquipo` en `widgets/bombas/Placa.tsx`, con la misma escala para las gemelas (**F3**) |
| **H13** | CONFIRMADO | S2 | `condiciones.ts:14-17`: «sin comunicación» es solo el computador de flujo oficial; la franja afirma «0 sin comunicación» del campo. Texto en morado latente: `Analogico.tsx:71` y `PanelEquipo.tsx:258,265` | Regla 1 (nada inventado): el 0 de los demás tags no se sabe. X2 E2/C1. Hoy no se ve porque el demo no trae el caso | 1. La píldora dice su alcance: «0 sin comunicación · medidor oficial» en el escritorio, y en el `aria-label` y el globo: «TRIM todavía solo sabe si llega el dato del punto de medición oficial» (`widgets/Franja.tsx`, **F1**).<br>2. «---» y el texto en `--tinta2`, con la marca morada al lado: `PanelEquipo.tsx:258,265` y `Analogico.tsx:71` (**F3**).<br>3. La hora es un pedido al motor (X2 §7, pedido 3): no se inventa |
| **H14** | CONFIRMADO CON OTRO ARREGLO | S2 | 1440 × 900: `.vista` 969 px; tarjeta de la tubería de 98 a 733 px; «Este mes» de 749 a 929 px `[v2/h14]`. La imagen 1 cabe porque **no lleva la línea de la pérdida dentro de la tarjeta** ni la marca DEMO. A 1280, 1.639 px | X2 N1. La DEMO en línea solo quita 33 px: 969 − 33 = 936, todavía > 900 | 1. DEMO en la fila de las migas sin crecerla (`Cabecera.tsx`, **F1**).<br>2. La línea «Pérdida… sin eventos registrados» pasa a la ⓘ de «Dónde se trabó», o a la leyenda en una sola línea, como dice X5 §5.10 (`plantaviva/Tuberia.tsx`, **F2**).<br>3. A 1280, columna derecha de 320 px (`pages/PlantaViva.tsx`, **F2**), **sin plegar el panel**: X5 lo pliega solo por debajo de 1280.<br>**Prueba e2e (F4):** `.vista` ≤ 900 a 1440 × 900 |
| **H28** | CONFIRMADO | **S3 → S2** | Después, 1440: «1.046» dos veces (la cifra grande y «Este mes»); el ramal con «P-201B parada desde 03:52», el tanque 89,6 % y ◆1, que son el estado de ahora dentro de «lo que pasó» `[v2/h28]` | La misma cifra en dos tarjetas y dos tiempos en una vista: hace pensar (§4.8; X4 §4.4) | En Después, «Este mes» → «Septiembre cerró en 7.716» y el ramal sin el estado de ahora (o con «ahora:» delante): `entities/planta-viva.ts` y `plantaviva/Filas.tsx` y `Tuberia.tsx` (**F2**). Coordinar con V1 (R1 y R2) |

### S3

| Id | Veredicto | Sev. | Evidencia propia | Por qué | Arreglo final y archivo |
|---|---|---|---|---|---|
| **H9** | CONFIRMADO | **S2 → S3** | 320 px, `#/ger/planta-viva/ceiba/curso`: 31 textos SVG bajo 12 px (tubería de pie de 10 a 11,6; ejes del mes a mes 9,5) `[v2/h09]` | Son «tamaños» (la definición de S3) y solo a 320 px. A 390 cumple | `plantaviva/Lateral.tsx` `MesAMesYBajando` al ancho real con `useAncho`; `plantaviva/Tuberia.tsx` `TuberiaDePie` con el `viewBox` al ancho del contenedor (**F2**). 320 en `ANCHOS` del auditor (**F4**) |
| **H16** | CONFIRMADO | S3 | Texto de Bombas: «1 Bomba multietapa… P-201B Reinyección detenido», sin «alarma»; `Pozos.tsx`, `Esp.tsx`, `Turno.tsx:234` y `Riesgo.tsx:186` | X2 F1 y X5 §5.5 | La palabra de la condición junto a la marca: `Placa`, `Pozos`, `Esp` y N4 (**F3**); `Turno` (**F1**); `Riesgo` (**F2**) |
| **H17** | CONFIRMADO | S3 | `Analogico.tsx:51`, `Sparkline.tsx`, `Turno.tsx:234` y `Riesgo.tsx:186` (`altoImpacto ? 1 : 2`), `pozos/estado.ts:12`. Hoy coinciden con la franja: LC-21 ▲2 en Pozos | Regla 2 y X2 B15. Latente: no se ve | Sin prioridad del motor, sin marca. Con la condición por equipo de H3: `Analogico` y `Sparkline` (**F3**), `Turno` (**F1**), `Riesgo` (**F2**) y `pozos/estado.ts` (**F3**) |
| **H18** | CONFIRMADO CON OTRO ARREGLO | S3 | `produccion/Diaria.tsx:81` (potencial `strokeDasharray="5 3"`) y `:85` (último tramo «3 3») | X2 §5.3, punto 8: lo discontinuo es lo proyectado. **El arreglo de R3 confunde:** el potencial continuo en `--tinta2` (#464b52) quedaría casi igual al real en `--dato1` (#3a3f45) | El potencial continuo en `--dato3`, de 1,2 px (3,41:1), y el real en `--dato1`, de 1,8 px. El día en curso, solo con el punto hueco (ya está), sin el tramo discontinuo, y «○ día en curso» en la leyenda (**F2**) |
| **H19** | CONFIRMADO | S3 | 42 sitios con `tamano={9\|10\|11}` en 29 archivos | X2 §4.2 y X5 §5.6 (≥ 12 en el escritorio y 14 en el teléfono) | Mínimo en `shared/ui/Prioridad.tsx` `MarcaCondicion` (`Math.max(tamano, 12)` y 14 por debajo de `sm`) (**F1**). Con eso no hace falta tocar los 42 sitios |
| **H20** | CONFIRMADO | S3 | `diferidos/MesAMes.tsx:166` y `resumen/ResumenDirectivo.tsx:376`: un `rect` de 7 px sin «3» | X5 §3.3 y §5.4 | `MarcaCondicion c="aviso"` de 12–14 px (**F2**) |
| **H21** | CONFIRMADO | S3 | Paleta de R3: `--dato1`/`--dato3`, 2,66:1 en claro y 2,43:1 en oscuro | Matiz: cada mes tiene su frase en el botón o en el `aria-label`, así que WCAG 1.4.11 se cumple por la alternativa en texto. El separador es pulido | 1 px de `--panel` entre los segmentos en `plantaviva/Lateral.tsx`, `resultados/MesAMes.tsx` y `pages/Confiabilidad.tsx` (**F2**) |
| **H22** | CONFIRMADO | S3 | Diferidos «Mes a mes»: ejes «15,0 k», «16,9 k» sin bbl. «Qué limitó, día por día»: «792» y «0» sin unidad. «Fallas por mes»: sin eje ni valores, meses «10 … 10», `aria-label` «Fallas por mes (se desplaza de lado)» `[v2/h22]` | §8.1 y §8.3; X2 T4 e I5 | Unidad en el título; en «Fallas por mes», el número sobre cada barra, «oct 2025 … oct 2026» y la frase con cifras en el `aria-label`: `diferidos/MesAMes.tsx`, `choke/Serie.tsx` y `pages/Confiabilidad.tsx` (**F2**) |
| **H23** | CONFIRMADO | S3 | `bombas/Proyeccion.tsx`: rotula el límite y no tiene banda | X2 §5.3, puntos 2 y 6 | Banda en `--banda` y el 0 y el límite en HTML, como `equipos/Tarjetas.tsx` `Grafica` (**F3**) |
| **H24** | CONFIRMADO CON OTRO ARREGLO | S3 | `resultados/Tarjetas.tsx:125`: la espera de Mantenimiento con el mismo rayado a 45° | **R3 contradice a X5 en una parte.** X5 §5.4 manda «Lo proyectado va con contorno y rayado, y con su palabra» (X2 §5.2 igual), y «sin identificar» rayado es diferido, el mismo sentido. El único que choca es la espera, que es tiempo y no barriles | Solo la espera cambia: gris liso más claro (`--dato3`) con su rótulo (**F2**). Lo proyectado y lo sin identificar se quedan |
| **H27** | CONFIRMADO | S3 | `hoy/Lateral.tsx:20`: `preserveAspectRatio="none"` con `h-6 w-full` | X5 §5.3 (en chico) | `MiniTuberia` de `plantaviva/Tuberia.tsx:355` en `hoy/Lateral.tsx` (**F1**, que la importa de F2) |
| **H29** | CONFIRMADO | S3 | La tubería de B no tiene «Ver como tabla». **El papel tampoco la trae:** `pdftotext` del informe de La planta viva repite el dibujo, sin tabla por tramo | §8.8 acepta la tabla «en el papel o con ver como tabla», y no está en ninguno de los dos | Tabla por tramo (cabe, pasa, no pasa, equipos), de `planta.tramos`: visible solo al imprimir y detrás de «Ver como tabla» bajo el dibujo (`plantaviva/Tuberia.tsx`, **F2**) |
| **H31** | CONFIRMADO | S3 | `paleta-medida.md:70`: morado contra índigo, **6,24** con protanopía | Exactitud del documento: X5 §3.1 dice 11,02 como el peor | Corregir X5 §3.1 con los cuatro tipos de visión y la razón práctica (la marca morada nunca va sobre el índigo: va en las píldoras blancas) (**F1**, documento) |
| **H32** | CONFIRMADO | S3 | `choke/Agua.tsx:346`: `<ol className="list-decimal">` junto al ◆1 de P-201B | X2 F4 | Viñetas (**F2**: `widgets/choke` es suyo) |
| **H33** | CONFIRMADO | S3 | Pistas de 32 px a 1280 (medidas en H1) | X5 §5.4 | Barra debajo de la cifra en `resumen/PorCampo.tsx` (`angosto`) (**F2**) |
| **H34** | CONFIRMADO | S3 | `equipo/FichaEjecutiva.tsx:115`: `chip={noArrancar ? 'no arrancar' : …}` | X5 §3.3 y §5.6: el bloqueo es una franja en tinta con ⊘ | `Bloqueo` de `hoy/piezas.tsx` en `FichaEjecutiva.tsx` (**F3**) |

### Refutados

| Id | Veredicto | Por qué |
|---|---|---|
| **H25** · la barra se corta en 1,25 sin marcarlo | REFUTADO | X2 §5.2 lo decide a propósito: «La meta como raya, al 80 % del ancho; pasa hasta 1,25 veces · Igual» y «Lo que se sale lo dice la marca junto a la cifra, no la barra». La cifra (58.880 contra máx. 24.800), el ■3 y el `aria-label` («por encima del máximo») lo dicen, y el corte achica, no exagera (§8.1). Un «►» al final es opcional |
| **H26** · un mes como período tarda 18,4 ms (61,5 con CPU ×4) | REFUTADO | Aun con sus números: cambiar el período recalcula **el motor** (D7, < 300 ms). El tope de 16 ms de §8.10 es para pintar un gráfico al cambiar de momento o de filtro, y eso mide de 1 a 8 ms. La interacción pinta en 56 y 112 ms, por debajo de 200 ms (INP bueno). `startTransition` y la caché por período quedan como mejora opcional (F2) |
| **H30** · los tokens de equipo no son los de X2 | REFUTADO | X2 §4.4: «Lo que fija esta guía es la regla y el umbral (§6, C6 y C7), no el código de color». E1 pasa: 6,26 y 14,06. «Nunca negro» (X5 §3.2) habla del fondo del tema; el relleno del parado lleva contorno de 2 px en tinta. Si se quiere, una línea en X5 §3.2 con la medida |

---

## Accesibilidad y frontend (R4)

### S1

| Id | Veredicto | Sev. | Evidencia propia | Por qué | Arreglo final y archivo |
|---|---|---|---|---|---|
| **A1** | CONFIRMADO | S1 | Tres Tab en `#/ger/planta-viva/ceiba/curso`, 1440, claro: foco en «Equipos» del panel, `outline: 2px solid rgb(20, 45, 136)` sobre `rgb(20, 45, 136)`. No se ve nada `[v2/a01-foco-panel-light]`. En oscuro, `rgb(243, 244, 245)` sí se ve | Bloquea a quien usa el teclado: no sabe dónde está. WCAG 2.4.7 y 1.4.11. X5 §3.1 puso el anillo índigo sin prever el panel índigo | `src/index.css`: `.sobre-marca :focus-visible { outline-color: var(--marca-sobre) }` (`--marca-sobre` ya existe, #fff, 11,93:1). La clase va en el `<nav>` de `Riel.tsx` (las dos variantes), en la banda de `App.tsx` y en la banda de `hoy/Operador.tsx` (**F1**). Una línea en X5 §3.1: «sobre el índigo, el anillo es blanco» (**F1**). Prueba e2e (**F4**) |

### S2

| Id | Veredicto | Sev. | Evidencia propia | Por qué | Arreglo final y archivo |
|---|---|---|---|---|---|
| **A2** | CONFIRMADO | S2 | `#/sup/hoy/ceiba/curso`, 1280: foco en «Confirmar las 2» + Enter → `document.activeElement` = `BODY` | WCAG 2.4.3; X4: un toque y la siguiente | Foco al título de la pregunta nueva (`hoy/Operador.tsx` y `Pregunta.tsx`) y a la tarjeta siguiente (`hoy/Tarjeta.tsx` y `Hoy.tsx`) (**F1**). Prueba e2e (**F4**) |
| **A3** | CONFIRMADO | S2 | `hoy/piezas.tsx:66-80`: `role="status"` que se monta con su texto y con «Deshacer» adentro. `envio.ts:51`: 5 s fijos. **«Hecho hoy» no ofrece deshacer** (`piezas.tsx:56-60`): pasados los 5 s, no hay otro camino en Hoy | WCAG 4.1.3. El 2.2.1 es discutible, pero el prompt §6.6 pide «toda acción se puede deshacer o dice que no se puede» | Región `status` siempre montada, con «Deshacer» al lado y fuera de ella; el reloj se pausa con el foco o el puntero encima (`hoy/piezas.tsx`, `envio.ts` y `Hoy.tsx`, **F1**). Si se quiere más: «Hecho hoy» dice dónde se corrige (Identificar, D1) |
| **A4** | CONFIRMADO | S2 | `shared/ui/foco.ts:104`: `document.activeElement instanceof HTMLElement ? … : null`. Un `<g>` es `SVGElement` | WCAG 2.4.3 | `HTMLElement \| SVGElement` en `useModal` (**F1**). Prueba e2e: Enter en `[data-tramo="planta"]`, Escape, y el foco vuelve a ese `<g>` (**F4**) |
| **A5** | CONFIRMADO | S2 | 390 px, `#/sup/hoy/ceiba/curso`: ☰ 40 × 40, iniciales 38 × 38, campo 97 × 32, cuentas de la franja de 30 de alto, DEMO 51 × 24; «Ver una por una», «Ver el chat», «Ver la orden» y «Ver el orden» de **22 de alto** | Manda X5 §5 y el prompt §5 (44 px en el teléfono), sin la excepción de espacio de WCAG 2.5.8; con ella, algunos sí pasarían 2.5.8. Pesa en los roles de campo (sup y tec, con guantes). Coincide con UI-18 de R2 (V1) | `min-h-11` por debajo de `sm` en `Franja`, `App` (☰), `MenuPerfil`, `Riel` (campo), `Cabecera` y `hoy/Tarjeta.tsx` (**F1**); `equipos/Nivel3.tsx` y `Planta.tsx` (**F3**); `plantaviva/Filas.tsx` y `resultados/Tarjetas.tsx` (**F2**). Un solo arreglo con UI-18 |
| **A7** | CONFIRMADO | S2 | 320 × 640: `.vista` se desplaza de lado **+97 px** (P-201B, diagnóstico) y **+177 px** (MPP-301); las filas de `FilaDispositivo` miden 383 y 463 px | WCAG 1.4.10 (reflujo, AA) | `FilaDispositivo` con `flex-wrap` y la minitendencia oculta por debajo de 400 px (`PanelEquipo.tsx`, **F3**). 320 en el auditor (**F4**, el mismo cambio de H9) |
| **A9** | CONFIRMADO CON OTRO ARREGLO | S2 | Detalle abajo. Simulador en 8793: **0 de los 60 GET del contrato** responden 200, y los 10 del arranque dan 404. Solo atiende la salud y el registro de la cadena de datos | La comparación de las dos fuentes (§10) no se puede hacer, y nada prueba que la app arranque contra un servidor HTTP. No afecta al demo del dueño | Ver «A9 en detalle» (**F4**) |

### S3

| Id | Veredicto | Sev. | Evidencia propia | Por qué | Arreglo final y archivo |
|---|---|---|---|---|---|
| **A6** | CONFIRMADO | **S2 → S3** | `plantaviva/Heroe.tsx:15-29`: el previo, la cifra y la frase son `<p>` sueltos dentro de la `section` «La planta viva de La Ceiba» | Se leen en orden («Ahora mismo / 1.966 barriles por día / se dejan de producir…»): no hay falla de WCAG 1.3.1. Es el pedido del prompt §9, y Hoy y Resultados ya lo hacen | `role="group"` con `aria-labelledby` de la cifra y la frase, en `plantaviva/Heroe.tsx` (**F2**) y en el héroe de `equipos/Nivel3.tsx` (**F3**) |
| **A8** | CONFIRMADO | **S2 → S3** | `store.ts:459`: `beforeprint` solo cambia `data-theme`; `colorScheme` sigue en `dark` (`store.ts:166`, `index.html:25`) | Solo pasa con el tema oscuro al imprimir. **El folio sigue legible en el membrete de arriba** (`pdftotext`: «Folio INF-2026-0001» en la cabecera); se pierde el del pie | `beforeprint` también pone `colorScheme = 'light'`; en `@media print`, `:root { color-scheme: light }` (`app/store.ts` e `index.css`, **F1**) |
| **A10** | CONFIRMADO | S3 | `foco.ts:173`: `'aria-controls': id` siempre | Higiene de ARIA: no es falla de 4.1.2, y el 4.1.1 ya no está en WCAG 2.2 | `'aria-controls': abierto ? id : undefined` (**F1**) |
| **A11** | CONFIRMADO | S3 | `Cabecera.tsx:118-121`: en el teléfono el texto largo va `max-sm:hidden` y «DEMO» `aria-hidden`: botón sin nombre. La nota no usa `useDesplegable` | WCAG 4.1.2 (A), en un control secundario | `aria-label="Datos de demostración"` y `useDesplegable` en `MarcaDemo` (**F1**) |
| **A12** | CONFIRMADO | S3 | `document.title` = «Trim · Hidrocarburos» en las 3 rutas medidas; ningún `document.title` en `src/` | WCAG 2.4.2 | Título por vista en `App.tsx` (**F1**) |
| **A13** | CONFIRMADO | S3 | Ningún «Saltar al contenido» en `App.tsx` | 2.4.1 ya pasa por las regiones; es una ayuda para el teclado | Enlace en `App.tsx` que haga `focus()` sin tocar `location.hash` (**F1**) |
| **A14** | CONFIRMADO | S3 | `Onboarding.tsx:41` usa `useModal`, que devuelve el foco a lo que estaba activo al abrir: `body`, porque abre al cargar | WCAG 2.4.3 | Al cerrar, foco al `h1` de la vista (`tabIndex={-1}` en `Cabecera.tsx`) (**F1**) |
| **A15** | CONFIRMADO | S3 | Medido: La planta viva `H1 H3 H3…`; Causa `H1 H2 H5…`; diagnóstico `H1 H3 H2 H2 H4…` | Buena práctica de 1.3.1. Ninguna e2e busca encabezados por nivel (`grep level:`) | `h2` en los títulos de tarjeta: `plantaviva/piezas.tsx` (**F2**), `hoy/Tarjeta.tsx`, `hoy/Lateral.tsx` y `arbol/*` (**F1**), `equipos/Nivel4.tsx` (**F3**) |
| **A16** | CONFIRMADO | S3 | `shared/lib/prioridad.ts:5`: «Prioridad 1 · alarma». Las regiones y dibujos dicen «bbl/d». Una sola e2e busca el texto con «·» (`experiencia-f2c.spec.ts`) | El prompt §9 pide «Prioridad 1, alarma»; X2 §4.2 escribió «·». Manda el encargo, y la coma es más segura con los lectores | `prioridad.ts` con coma (**F1**); «barriles por día» en las frases de `aria-label` de `planta-viva.ts` y `resultados.ts` y en `resultados/MesAMes.tsx` (**F2**), y de `hoy.ts` (**F1**); ajustar esa e2e (**F4**) |
| **A17** | CONFIRMADO | S3 | `Tip.tsx:62-66`: `tabIndex 0` sin `role` cuando no hay `onClick` ni es dibujo | WCAG 4.1.2 (buena práctica: lee su texto) | `role="button"` con `aria-expanded` en ese caso (`shared/ui/Tip.tsx`, **F1**), o filas sin foco con una ⓘ aparte (`diferidos/Paretos.tsx`, **F2**) |
| **A18** | CONFIRMADO | S3 | `Riesgo.tsx:235` y `Planta.tsx:228`: `behavior: 'smooth'` sin mirar `prefers-reduced-motion` | X2 M1 y WCAG 2.3.3. **Pasa M1 a «a medias»** | `matchMedia(...)` → `'auto'` en `pages/Riesgo.tsx` (**F2**) y `pages/Planta.tsx` (**F3**) |
| **A19** | CONFIRMADO | S3 | `index.css`: 0 reglas de `prefers-contrast` y de `forced-colors` | Prompt §9 | Las reglas de R4 en `index.css` (**F1**). **Ojo:** `prefers-contrast` no toca los tokens de estado (X5 §6.14; C7 ≥ 10) |
| **A20** | CONFIRMADO | S3 | Reproducido en desarrollo: CLS **0,0545** en `#/conf/equipos/morichal`, dos cargas; el corrimiento sale del «Cargando…» (`P.p-3`) y de la columna de la franja. La planta viva: 0,0007 | Prompt §10 (CLS ≈ 0). Está bajo 0,1 (bueno) | La cabecera fuera del `Suspense` perezoso, o un `fallback` con su alto, en `App.tsx` (**F1**) |
| **A21** | CONFIRMADO | S3 | `pdftotext` del PDF de R4: las barras de «Dónde se trabó» al pie de la hoja 2 y su leyenda («en el yacimiento · en los pozos…») arriba de la hoja 3 | Prompt §10 | `break-inside: avoid` y `break-after: avoid` en el `@media print` (`index.css`, **F1**); la barra y su leyenda en un bloque (`resultados/Tarjetas.tsx`, **F2**) |
| **A22** | CONFIRMADO | S3 | `dist/assets/costura-X_y8FtCz.js` = 519.625 bytes, con `modulepreload` en `dist/index.html`; `demo/servidor.mjs` no comprime | Aviso de Vite; cumple el 1,5 s | Gzip o brotli en `demo/servidor.mjs`; partir `costura` en `vite.config.ts:101-106` con cuidado (**F4**, o el coordinador) |
| **A24** | CONFIRMADO | S3 | `shared/api/registro.ts:29-60`: sin rama para `FUENTE === 'demo'`; en el demo construido, la ruta devuelve la página → `SIN_SERVICIO` | Prompt §6.9: los vacíos enseñan. Solo el administrador | Con la fuente del demo: «En el demo no hay bordes conectados: el registro lo sirve el backend», con un enlace a Configuración. Sin datos inventados (`registro.ts` y `pages/Conectores.tsx`, **F3**) |

### Refutado

| Id | Veredicto | Por qué |
|---|---|---|
| **A23** · D7 con CPU ×4, 443 ms | REFUTADO | D7 dice «con la CPU normal» (`CORRECCIONES-QA.md:47`), y con ella el peor es de 115 ms. El mismo R4 escribe «cumple» y «ninguno obligatorio». Queda como riesgo anotado |

### A9 en detalle: por qué la fuente http no arranca y por qué `verificar-contrato --http` pasa igual

**1. Lo que falta en `simulador-api/`.** Medido contra el simulador en 8793:
- **Los 10 GET del arranque dan 404:** `/campos`, `/catalogo`, `/configuracion/historial`, `/paradas/respuestas`, `/usuarios`, `/usuarios/historial`, `/informes`, `/asignacion-oficial`, `/analisis` y `/planta/cambios`. Son los que pide `shared/api/servidor.ts` `arrancarDelServidor`.
  - R4 contó 6 porque `Promise.all` corta en el primer rechazo.
- **Las 50 vistas también dan 404:** `/vistas/*`, `/mensajes` y `/sap/*`. En total, **0 de 60**.
- **Las escrituras del contrato** (las de `escrituras.ts`) tampoco están, salvo las del registro.
- **Lo único que atiende:** `/api/salud`, inventario, pendientes, procedencia, asociar un tag, inscripción y nacimiento.

**2. No es un descuido: está escrito.**
- La cabecera de `simulador-api/api.mjs` y el README («Qué cubre cada cosa») dicen que el simulador implementa **solo el registro de la cadena de datos**.
- Para lo demás, un backend se prueba con `referencia/` y `node scripts/referencia.mjs comparar --base-url=…`.
- **Lo que confunde:**
  - `vite.config.ts:6` llama al simulador «el contrato ejecutable»;
  - `main.tsx:17` dice solo «ruta no encontrada», sin cuál ruta ni qué hacer.

**3. Por qué `verificar-contrato --http` pasa.**
- `probarHttp` (`scripts/verificar-contrato.mjs:1487`) **reemplaza `globalThis.fetch`** (`:1515`) por un servidor de prueba **dentro del mismo proceso de Node**.
- Ese servidor responde los 60 GET con el propio motor:
  - `responder(srv)` (`:87`), un `R[nombre](p)` por cada endpoint de `ENDPOINTS`;
  - más unas pocas escrituras.
- Prueba, entonces:
  - que el cliente del front pide las rutas correctas;
  - que los códecs van y vuelven por JSON;
  - que el arranque hace sus 10 GET (H1, `:1567`).
- **No prueba:**
  - que exista un servidor HTTP que sirva esas rutas (el del repo no las sirve);
  - que la app arranque en un navegador con `VITE_FUENTE=http` (`main.tsx` → `arrancarDelServidor` → React);
  - que las pantallas se vean igual con las dos fuentes.
- En corto: el front pasa contra un servidor escrito en el mismo archivo de la prueba.

**4. El arreglo (F4).**
1. **Un solo servidor de vistas.** Sacar `responder` y el despacho de GET de `verificar-contrato.mjs` (`ENDPOINTS`, `leer`, `aRespuesta` y la normalización a `null` de `:1561-1563`) a un módulo de `simulador-api/` (por ejemplo `vistas.mjs`), que reciba una función `cargar` para el motor en TypeScript.
   - En desarrollo, el plugin de `vite.config.ts` se la da con `server.ssrLoadModule`.
   - `npm run simulador` la obtiene con Vite en modo middleware.
   - `verificar-contrato --http` usa **ese mismo módulo**, con un servidor de verdad en un puerto libre y no con un `fetch` falso.
   - Así lo que se prueba es lo que se le entrega a un backend como referencia ejecutable.
2. **Un proyecto de Playwright `http`:**
   - arranca el simulador en un puerto libre (ni 4173, ni 5173, ni 4199);
   - arranca Vite con `VITE_FUENTE=http`;
   - compara las 16 rutas de `r4-fuentes.mjs` contra la fuente del demo: el texto de `.vista`, las cifras de `data-*` y la captura.
3. **El mensaje de `main.tsx`:** «TRIM no pudo arrancar: GET /api/campos respondió 404. Revise VITE_API_URL o que el backend esté arriba.»
4. **El comentario de `vite.config.ts:6`:** que diga lo que el simulador cubre de verdad.

---

## Nuevos de V2

| Id | Sev. | Evidencia | Por qué | Arreglo y archivo |
|---|---|---|---|---|
| **V2-1** · `--dato-5` en barras de dato | S3 | `#/prod/diferidos/ceiba/curso`: 4 barras en `rgb(163, 168, 173)` sobre `--panel2`, **2,12:1** («Tipo de causa» y «Por equipo»). `diferidos/Paretos.tsx:88,198` y `resumen/ResumenDirectivo.tsx:346,372`. R3 lo dejó dicho («verificarlo si alguien lo usa»): sí se usa | WCAG 1.4.11 (3:1) y X5 §3.2 (las barras secundarias en `--dato3`, 3,41:1) | `--dato3` en esos cuatro sitios (**F2**) |
| **V2-2** · El papel imprime lo que solo sirve en pantalla | S3 | `pdftotext` del informe de La planta viva: «Pedir la causa ›» y «Ver el plan ›» | Prompt §10: en el papel, un enlace no hace nada | `no-imprimir` en esos enlaces, o la frase sin «›» (`plantaviva/Tuberia.tsx` y `Lateral.tsx`, **F2**) |

---

## Los arreglos, por dueño (en orden de severidad)

**F1 · Armazón, Hoy y lo común**
- **S1:**
  - **A1:** `index.css`, `Riel.tsx`, `App.tsx` y `hoy/Operador.tsx`;
  - **H1:** `shared/ui/BarraMeta.tsx:38`;
  - **H3:** el motor de la condición por equipo (`entities/condiciones.ts`, `shared/api/condiciones.ts`), `Trabajo.tsx:56` y `Turno.tsx:234`;
  - **H2:** `hoy.ts`, Turno y Causa leen los enteros del motor.
- **S2:**
  - **A2:** `hoy/Operador.tsx`, `Pregunta.tsx`, `Tarjeta.tsx` y `Hoy.tsx`;
  - **A3:** `hoy/piezas.tsx` y `envio.ts`;
  - **A4:** `shared/ui/foco.ts`;
  - **A5:** `Franja`, `App`, `MenuPerfil`, `Riel`, `Cabecera` y `hoy/Tarjeta.tsx`;
  - **H6:** `Cabecera.tsx`;
  - **H13:** `Franja.tsx` y `condiciones.ts`;
  - **H14:** DEMO en `Cabecera.tsx`.
- **S3:**
  - **H19:** `Prioridad.tsx`;
  - **H16 y H17:** `Turno.tsx`;
  - **H27:** `hoy/Lateral.tsx`;
  - **H31:** X5 §3.1;
  - **A8:** `app/store.ts` e `index.css`;
  - **A10:** `foco.ts`;
  - **A11:** `MarcaDemo`;
  - **A12 y A13:** `App.tsx`;
  - **A14:** `Onboarding.tsx` y `Cabecera.tsx`;
  - **A15:** `hoy/*` y `arbol/*`;
  - **A16:** `shared/lib/prioridad.ts` y `hoy.ts`;
  - **A17:** `Tip.tsx`;
  - **A19 y A21:** `index.css`;
  - **A20:** `App.tsx`.

**F2 · La planta viva y Resultados**
- **S1:**
  - **H2:** `entities/redondeo.ts` (nuevo), `planta-viva.ts`, `resultados.ts`, el libro, `diferidos/PorTramo` y la prueba de las dos identidades;
  - **H1:** `resultados/Cifra.tsx:81` y el diferido por día de `porCampo` en `libro.ts`;
  - **H3:** `Mantenimiento.tsx:117` y `Riesgo.tsx:186`;
  - **H15:** `criticidad.ts`, `choke-agua.ts`, `choke/Tuberia.tsx`, `Agua.tsx` y `AguaHoy.tsx`, más sus pruebas.
- **S2:**
  - **H7:** `plantaviva/HojaTramo.tsx`;
  - **H8:** `pages/Produccion.tsx` y `choke/Tuberia.tsx`;
  - **H10:** `planta-viva.ts` y `plantaviva/Tuberia.tsx`;
  - **H11:** `resultados/Cifra.tsx`, `Tarjetas.tsx` y `Confiabilidad.tsx`;
  - **H14:** la pérdida a la ⓘ y la columna de 1280 (`PlantaViva.tsx`);
  - **H28:** Después.
- **S3:**
  - **H9:** `plantaviva/Lateral.tsx` y `Tuberia.tsx`;
  - **H16 y H17:** `Riesgo.tsx`;
  - **H18:** `produccion/Diaria.tsx`;
  - **H20:** `diferidos/MesAMes.tsx` y `ResumenDirectivo.tsx`;
  - **H21:** las tres gráficas apiladas;
  - **H22:** `diferidos/MesAMes.tsx`, `choke/Serie.tsx` y `Confiabilidad.tsx`;
  - **H24:** `resultados/Tarjetas.tsx:125`;
  - **H29:** la tabla por tramo;
  - **H32:** `choke/Agua.tsx`;
  - **H33:** `resumen/PorCampo.tsx`;
  - **A5:** `plantaviva/Filas.tsx` y `resultados/Tarjetas.tsx`;
  - **A6:** `plantaviva/Heroe.tsx`;
  - **A15:** `plantaviva/piezas.tsx`;
  - **A16:** `planta-viva.ts`, `resultados.ts` y `resultados/MesAMes.tsx`;
  - **A17:** `diferidos/Paretos.tsx`;
  - **A18:** `Riesgo.tsx:235`;
  - **A21:** `resultados/Tarjetas.tsx`;
  - **V2-1** y **V2-2**.

**F3 · Equipos y niveles técnicos**
- **S1:**
  - **H3:** `bombas/Placa.tsx`;
  - **H15:** `bombas/Placa.tsx:169,172`;
  - **H2:** `equipos-tecnico.ts` lee los enteros.
- **S2:**
  - **H5:** `equipos-tecnico.ts` `escalaDe`, `equipos/Senales.tsx:83`, `bombas/Detalle.tsx`, `pozos/DetallePozo.tsx` y la prueba de `verificar-libro.mjs:3697-3700`, invertida por diseño;
  - **H12:** `bombas/Placa.tsx`;
  - **H4, H7 y A7:** `PanelEquipo.tsx`;
  - **H6:** `equipos/Nivel3.tsx`;
  - **H8:** `pages/Planta.tsx`;
  - **H13:** `PanelEquipo.tsx:258,265` y `Analogico.tsx:71`;
  - **A5:** `equipos/Nivel3.tsx` y `Planta.tsx`.
- **S3:**
  - **H16:** `Placa`, `Pozos`, `Esp` y N4;
  - **H17:** `Analogico`, `Sparkline` y `pozos/estado.ts`;
  - **H23:** `bombas/Proyeccion.tsx`;
  - **H34:** `equipo/FichaEjecutiva.tsx`;
  - **A6:** el héroe de `Nivel3.tsx`;
  - **A15:** `equipos/Nivel4.tsx`;
  - **A18:** `Planta.tsx:228`;
  - **A24:** `shared/api/registro.ts` y `Conectores.tsx`.

**F4 · Pruebas y auditor**
- **S1:** las e2e de H1 (relleno de 0 px), H3 (una marca por equipo en jefe, tec y conf) y A1 (anillo ≥ 3:1 sobre el `<nav>` en claro). La de H2 va en `verificar-libro`, con F2.
- **S2:**
  - **A9:** el servidor de vistas único en `simulador-api/`, `verificar-contrato --http` contra él, el proyecto `http` de Playwright, `main.tsx` y el comentario de `vite.config.ts`;
  - las e2e de H6 (la franja en su lugar), H14 (≤ 900), A2 y A4 (el foco), y H7 (el foco atrapado cambia por diseño).
- **S3:**
  - 320 en `ANCHOS` del auditor (H9 y A7);
  - las reglas de §11 (SVG bajo 12 px, más de una cifra grande —que habría visto H11—, color sin forma);
  - la e2e de A16 (`experiencia-f2c.spec.ts`);
  - las e2e de H15 (`choke-produccion.spec.ts:131,147` y `experiencia-f2c.spec.ts:116`);
  - **A22:** `demo/servidor.mjs` y `vite.config.ts`.

**Pruebas que cambian por diseño, sin probar menos:**

| Prueba | Por qué cambia |
|---|---|
| `verificar-libro.mjs:3697-3700` | H5: hoy exige que la escala cambie con las lecturas |
| `verificar-libro.mjs:2680, 2686 y 2930`, `choke-produccion.spec.ts:131,147`, `experiencia-f2c.spec.ts:116` | H15: las frases con «se pierden» |
| La e2e de la ficha y la hoja con el foco atrapado | H7: pasan a diálogo no modal |
| `experiencia-f2c.spec.ts` | A16: «Prioridad N, …» con coma |

---

## Las 44 comprobaciones, después de la verificación

| | Cumple | A medias | No cumple | No aplica |
|---|---|---|---|---|
| R3 | 20 | 20 | 3 | 1 |
| **V2** | **19** | **22** | **2** (F2, I1) | **1** (M3) |

**Cambios:**
- **M1 baja de ✓ a ½:** A18, el desplazamiento suave por código no respeta `prefers-reduced-motion`.
- **G1 sube de ✗ a ½:** X5 es la guía de estilo escrita (X5 §6: «sigue su ciclo de vida con una guía de estilo escrita (esta)») y los tokens de `index.css` salen de ella. Falta la `GuiaEstilo` firmada y versionada por sitio, que es un pedido a producto (X2 §7), no a esta tanda: **razón escrita**.
- Lo demás, como lo midió R3; cada «½» y cada «✗» está reproducido arriba.

**Lo que cada arreglo confirmado deja en ✓:**

| Comprobación | Pasa con | Queda «½» con su razón escrita |
|---|---|---|
| F2, F3 y F5 | H3 (y H4 para F3) | — |
| I1 | H5 + H12 | — |
| C1 | H13 | — |
| E2 | — | Sí: falta la hora del último dato por tag (pedido 3 al motor). En pantalla, «---» y la marca, sin inventar la hora |
| E3 | H4 | — |
| F1 | H16 | — |
| F4 | H32 | — |
| I3 | H12 | Sí: no hay disparo (pedido 4) y la pantalla lo dice |
| I5 | H22 y la ventana escrita en N4 | — |
| I6 | H12 | — |
| I7 y D1 | H10 | — |
| N1 | H14 | — |
| N2 | H6 | — |
| N5 | H7 | — |
| N6 | lo de V1 (R1 y R2) | — |
| T1 | H11 | — |
| T3 | H9 + H19 | — |
| T4 | H22 | — |
| M1 | A18 | — |
| G2 | F4, con las reglas nuevas del auditor | — |
| G1 | — | Sí: pedido a producto |

Con todo lo confirmado arreglado: **40 cumplen, 3 a medias con su razón escrita (E2, I3 y G1) y 1 no aplica (M3).**

---

**Servidores apagados por su PID:** Vite 5187 (65784 y 65766) y el simulador 8793 (69407). La base temporal del simulador quedó en el scratchpad, no en `simulador-api/datos/`.
