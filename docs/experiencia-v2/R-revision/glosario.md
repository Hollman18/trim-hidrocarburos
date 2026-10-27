# Glosario · un nombre, una cifra

**26-oct-2026 · R1 · Medición y texto.** Entrega de PROMPT-REVISION-UX.md §4 (regla 3) y §12.3.

Cada rótulo de cifra del producto, con:
- su definición;
- de dónde sale en el motor;
- en qué pantallas aparece hoy;
- sus sinónimos y sus choques.

**De dónde salen las pantallas.** Del texto que se ve en las 142 rutas, a 1440 px y en tema claro: `medicion/antes-textos/paginas/*.txt`, que deja `herramientas/medir.mjs`. Las rutas son las de `e2e/auditoria/rutas.ts`, más el inicio de cada rol y cada pantalla de cada puerta.

**Las cifras** son las del demo: La Ceiba el 2 de oct a las 14:00, salvo que se diga otra cosa.

**Marcas:**
- ✅ cumple: un nombre para una cifra;
- ⚠️ sinónimo: dos nombres para la misma cifra;
- ❌ choque: un nombre para dos cifras distintas, o una palabra prohibida.

Cada choque lleva su hallazgo en `hallazgos-texto.md` (código `G-n`).

---

## 1. Lo que manda: `NOMBRE_CIFRA` y `cifrasDeUnNombre`

C5 dejó siete nombres con una sola definición:
- los nombres, en `src/entities/resultados.ts:56`;
- se publican por `@/shared/api/resultados`, con `NOMBRE_CIFRA` y `useCifrasDeUnNombre`.

**Quién los usa de verdad** (`grep` en `src/pages` y `src/widgets`):
- solo `pages/Riesgo.tsx` (`ahora`, `avisan` y `exposicion`);
- y `pages/Turno.tsx` (`ahora`).

Las demás pantallas escriben el rótulo a mano. Cinco de los siete nombres tienen al menos una pantalla que no los respeta:

| `NOMBRE_CIFRA` | Rótulo | ¿Lo respetan todas las pantallas? |
|---|---|---|
| `ahora` | «Se deja de producir ahora» | ❌ No. Planta y Producción dicen en la línea siguiente «se pierden 1.966» (G-1). Las filas de Equipos dicen «se deja de producir» de **un** equipo (G-1b) |
| `porBombas` | «por bombas paradas» | ⚠️ A medias. Solo Bombas lo usa. La misma 1.665 se llama de otras cuatro maneras, dos de ellas con «se pierden» (G-2) |
| `pozos` | «Lo que dan los pozos» | ✅ Sí: Producción y la ⓘ del tramo de los pozos |
| `potencial` | «Potencial del libro» | ❌ No. En Pozos es «Potencial ahora» y en Diferidos, Producción y Regulatorio, «Potencial» a secas (G-5) |
| `avisan` | «Equipos que avisan» | ❌ No. En Equipos, «Avisan» cuenta otra cosa: 3 en La Ceiba contra 1 en Riesgo. En Mantenimiento y Mi trabajo, «equipo(s) avisando» (G-15) |
| `exposicion` | «Exposición si fallan hoy» | ✅ Sí: Riesgo. Pero «si falla hoy» se usa en bbl/d en otras pantallas y en bbl en esta (G-16) |
| `retorno` | «Retorno posible del ciclo» | ❌ No. En La planta viva la misma cifra se llama «Lo que todavía se puede mover · bbl en el ciclo», y ese rótulo también nombra la parte de Durante (G-13) |

**Riesgo de fondo (S3).** «Se deja de producir ahora» se calcula por tres caminos:
- `estadoCampo().perdiendoBpd` (`diferido.ts:675`, la suma de `riesgoAhora`), que es la de `cifrasDeUnNombre`;
- `tuberiaCampo().perdiendoAhoraBpd` (`choke-reparto.ts:597`), que usa La planta viva (`planta-viva.ts:420`);
- la suma propia de `hoy.ts:727`, para el supervisor.

Hoy dan lo mismo: 1.966 en La Ceiba y 2.650 en todos los campos. `verificar-libro.mjs`, en su sección C5, lo prueba para la tubería y La planta viva. Hoy no entra en esa prueba.

---

## 2. Las cifras de «ahora» (bbl/d)

### G-1 · «Se deja de producir ahora» · ❌
- **Qué es.** Todo lo que el campo no produce en este momento por paradas, de cualquier causa y también sin identificar.
  - Es un ritmo, en bbl/d.
  - Es diferido, no pérdida.
- **Cifras.**
  - La Ceiba: **1.966**.
  - Morichal Norte: 684.
  - Todos los campos: **2.650**.
- **Motor.**
  - `estadoCampo().perdiendoBpd` (`entities/diferido.ts:675`);
  - `cifrasDeUnNombre().ahoraBpd` (`entities/resultados.ts:93`);
  - `tuberiaCampo().perdiendoAhoraBpd` (`entities/choke-reparto.ts:597`);
  - la frase grande sale de `duranteDeCampo` (`entities/planta-viva.ts:419`) y de `inicioDe` del supervisor (`entities/hoy.ts:726`).
- **Dónde está bien.**
  - La planta viva de todos los roles: «Ahora mismo · 1.966 barriles por día · se dejan de producir en La Ceiba».
  - Hoy del supervisor, con la misma frase.
  - Riesgo (jefe y confiabilidad), Turno («se deja de producir ahora»), Planta, Pozos y Producción: «Se deja de producir ahora · 1.966 bbl/d».
  - Electrosumergibles de Morichal: «684 bbl/d se dejan de producir».
- **Choques.**
  - ❌ **«se pierden 1.966»**, en la línea siguiente de la misma tarjeta, en Planta y en Producción: «Los pozos dan 11.857 según sus pruebas: pasan 9.394, se pierden 1.966 y los otros 497…». Lo escribe la pantalla en `widgets/choke/Tuberia.tsx:505` y rompe la regla 3: diferido no es pérdida.
  - ❌ **G-1b.** En las filas de Equipos (todas las listas), «1.665 bbl/d · se deja de producir» es lo de **un** equipo (P-201B), y «301 · se deja de producir», lo de LC-21. Lo escribe `equipos-tecnico.ts:278`.
    - C5 dejó la regla: lo de un equipo es «por P-201B se dejan de producir».
    - Los niveles 3 ya lo dicen bien («se dejan de producir: cerró LC-07 y LC-16»).
  - ⚠️ En Riesgo, «Se deja de producir ahora, por causa» es el título del reparto: 1.665 de P-201B y 301 de LC-21. No choca, porque la suma es el total, pero repite el rótulo de la cifra que tiene encima.

### G-2 · «por bombas paradas» · ⚠️
- **Qué es.** La parte de lo de ahora que cierran las bombas de la línea paradas, de reinyección y multifásicas.
- **Cifra.** La Ceiba: **1.665** bbl/d.
- **Motor.** `cifrasDeUnNombre().porBombasBpd` (`entities/resultados.ts:93`, con `BOMBAS_DE_LA_LINEA`).
- **Dónde.** Bombas: «Se deja de producir ahora, por bombas paradas» ✅.
- **La misma 1.665, con otros nombres.** Coinciden porque hoy P-201B es la única bomba parada y su tramo es la planta. Son tres alcances distintos que hoy dan lo mismo:
  - «no pasan 1.665 bbl/d» (el tramo de la planta, en La planta viva y en «Su campo, ahora» de Hoy) ✅: es el nombre del tramo;
  - «1.665 de esos barriles» (P-201B, en la frase de La planta viva) ✅: es la parte de un equipo;
  - «Por P-201B se dejan de producir ahora 1.665 bbl/d» (Agua) ✅;
  - ❌ «P-201B está parada: **se pierden** 1.665 bbl/d ahora» (Riesgo de jefe y confiabilidad: `entities/criticidad.ts:221`);
  - ❌ «se cerraron LC-07 y LC-16 y **se pierden** 1.665 bbl/d de crudo» (Agua: `entities/choke-agua.ts:344`). La línea de abajo, en la misma tarjeta, dice «Por P-201B se dejan de producir ahora 1.665».

### G-3 · «no pasa(n) ahora» (lo de un tramo) · ✅
- **Qué es.** Lo que no pasa por un tramo de la tubería ahora, en bbl/d.
- **Cifra.** Planta de La Ceiba: 1.665.
- **Motor.** `tuberiaCampo()`, por tramo (`entities/choke-reparto.ts`). En La planta viva, `tramos` de `entities/planta-viva.ts:525`.
- **Dónde.**
  - La planta viva: «Planta · aquí se trabó · no pasan 1.665 bbl/d».
  - Hoy, en «Su campo, ahora»: «En la planta no pasan 1.665 bbl/d».

### G-4 · «Lo que dan los pozos» · ✅
- **Qué es.** Lo que pueden dar los pozos según sus pruebas, sin el factor de asignación. Es el contorno del tramo de los pozos.
- **Cifra.** La Ceiba: **11.857** bbl/d.
- **Motor.** `potencialesDelCampo` (`entities/choke.ts:962`), que llega por `tuberiaCampo`.
- **Dónde.**
  - Producción: «Lo que dan los pozos según sus pruebas».
  - La ⓘ del tramo de los pozos, en la tubería de Producción.
  - La frase «Los pozos dan 11.857 según sus pruebas…» de Planta y Producción.

### G-5 · «Potencial del libro» · ❌
- **Qué es.** Las pruebas por el factor de asignación del mes: con eso valora el libro.
  - Ahora es un ritmo, en bbl/d.
  - En un período es la suma, en bbl.
- **Cifra.** La Ceiba: **11.360** bbl/d.
- **Motor.**
  - `estadoCampo().potencialBpd`, la suma de `crudoAsignado` (`entities/libro.ts:224`);
  - en el período, `libro().potencial` (`entities/libro.ts:686`);
  - su fuente en palabras está en `FUENTE_POTENCIAL` (`libro.ts:51`).
- **Dónde está bien.** Producción: «potencial del libro».
- **Choques.**
  - ❌ **«Potencial ahora»**, en Pozos (prod y sup): `pages/Pozos.tsx:127-128`. Sigue como lo dejó C5.
  - ⚠️ «Potencial» a secas:
    - en Diferidos («Potencial»);
    - en Producción («% del potencial», la columna «Potencial» y la ⓘ «Potencial»);
    - en Regulatorio («Potencial (pruebas × factor)» y «Del potencial»);
    - en la gráfica diaria de Producción («Potencial», `widgets/produccion/Diaria.tsx:90`).
  - ⚠️ «17,3 % del potencial», en Riesgo, se calcula contra este mismo potencial (1.966 / 11.360), pero no lo dice.

### G-6 · «Sale hoy» · ✅
- **Qué es.** Lo que sale del campo hoy por la salida de la tubería, en bbl/d.
- **Cifra.** La Ceiba: **9.394**.
- **Motor.** `tuberiaCampo().pasaHoyBpd` (`entities/choke.ts:1482`); el rótulo, en `entities/planta-viva.ts:654`.
- **Dónde.**
  - La planta viva: «Sale hoy · 9.394 bbl/d · meta 10.900».
  - La frase de Planta y Producción: «pasan 9.394».
  - La misma cifra es el techo de K-101: «Si para, hasta 9.394 bbl/d» (Hoy) y «hasta 9.394 bbl/d · si falla hoy» (Equipos). No choca: es «todo lo que sale».
- **X4 §3.4** pide para producción «9.394 bbl/d **pasan hoy**». Hoy la pantalla dice «Sale hoy»: dos verbos para la misma cifra (G-6, S3).

### G-7 · «producción por día» (promedio del período) · ⚠️ choque de lectura
- **Qué es.** La producción medida del período dividida por sus días, en bbl/d.
- **Cifra.** La Ceiba, octubre: **10.700**, contra la meta de 10.900.
- **Motor.** `libro()`: real / días (`entities/planta-viva.ts:884`; `entities/resultados.ts`).
- **Dónde.**
  - La planta viva: «Aviso · producción por día, bajo la meta · 10.700 de 10.900 bbl/d».
  - Resultados: «Promedio por día · producción · 10.700».
  - Producción: «10.700 bbl/d · 94,2 % del potencial».
- **Choque de lectura (S2).** En la misma pantalla de La planta viva, contra la **misma** meta de 10.900, hay dos cifras por día:
  - «Sale hoy 9.394»;
  - y «producción por día 10.700».

  La segunda no dice que es el promedio de octubre. Resultados sí lo dice («Promedio por día»).

---

## 3. Las cifras del período (bbl)

### G-8 · El diferido del período · ⚠️ (cinco nombres)
- **Qué es.** La suma de las paradas del período: lo que no se produjo, en bbl.
  - Es calculado, con su rango.
  - No es pérdida.
- **Cifra.** La Ceiba, octubre en curso: **1.046** bbl (rango 889 a 1.203).
- **Motor.**
  - `libro().diferido` (`entities/libro.ts:686`);
  - el mismo número en `esteMes.bbl` (`entities/planta-viva.ts:880`) y en la cifra de Resultados (`entities/resultados.ts`).
- **Sus nombres hoy:**
  - «Este mes · 1.046 **barriles diferidos**» (La planta viva, `widgets/plantaviva/Filas.tsx:26`);
  - «1.046 · **barriles diferidos**» (Diferidos);
  - «Lo que pasó · octubre, en curso · 1.046 barriles · **no se produjeron** en La Ceiba» (Resultados);
  - «**= No producido**» (Diferidos, en el cuadre);
  - «**el diferido del libro**» (Diferidos y Regulatorio);
  - «Después · lo que pasó» (el momento, en La planta viva).
- **Propuesta.**
  - El rótulo: «Diferido · octubre».
  - La frase de la cifra grande: «no se produjeron».
  - Fuera «No producido»: en el cuadre pasa a «= Diferido».

### G-9 · «Diferido por día» · ✅
- **Qué es.** El diferido del período dividido por sus días, en bbl/d.
- **Cifra.** Octubre: 661.
- **Dónde.**
  - «Diferido por día, mes a mes · octubre: 661 bbl/d» (La planta viva y Resultados).
  - «Promedio por día · diferido · 661 bbl/d · máx. 800» (Resultados).

### G-10 · «Máximo firmado» · ⚠️ (S3)
- **Qué es.** La meta de diferido que firmó el gerente.
- **Cifras.**
  - 800 bbl/d;
  - 1.267 bbl para lo que va de octubre;
  - 24.800 bbl para el mes.
- **Motor.** `metaEntre` (`entities/libro.ts:622`).
- **Nombres.**
  - «máximo firmado» (Resultados);
  - «máximo 800» (la leyenda de La planta viva);
  - «máx. 800» (las barras de Resultados).

  Son abreviaturas del mismo nombre. Basta con «máximo» en la barra y «máximo firmado» en la leyenda.

### G-11 · El rango calculado · ✅ (pero mal ubicado para el gerente)
- **Cifra.** «calculado, entre 889 y 1.203».
- **Dónde.** La planta viva, y Resultados («calculado · entre 889 y 1.203 bbl»).
- **X4 §6.1.10:** «los rangos, en la ⓘ, salvo en ingeniería». Para el gerente va en la primera capa (hallazgo T-9).

### G-12 · El valor en dólares · ✅ (un detalle para R4)
- **Cifra.** «50 mil USD» (La planta viva, Resultados y Diferidos).
- **Un detalle de lectura.** En Diferidos, la cifra y su unidad van en dos elementos separados por un margen (`widgets/diferidos/Encabezado.tsx:77`, `ml-1`).
  - En la pantalla se ve «50 mil USD».
  - En el texto que se copia o que lee un lector de pantalla queda «50mil USD».
  - No es un hallazgo de texto: va a R4.

### G-13 · «Retorno posible del ciclo» · ❌
- **Qué es.** Lo que se podría recuperar si se aplican los planes de Antes, Durante y Después. Es simulado, en bbl.
- **Cifras.**
  - La Ceiba: **2.133**.
  - Todos los campos: 45.233.
- **Motor.** `cicloValor` (`entities/escenarios.ts:265`) y `NOMBRE_CIFRA.retorno`.
- **Dónde está bien.** Resultados: «Retorno posible del ciclo · ≈ 2.133 bbl · simulado».
- **Choques.**
  - ❌ En La planta viva (todos los roles), la **misma** 2.133 se llama «**Lo que todavía se puede mover** · 2.133 **bbl en el ciclo** · simulado». Lo escribe `widgets/plantaviva/Lateral.tsx:29-32`.
  - ❌ En La planta viva de todos los campos (la línea de la columna), «Lo que todavía se puede mover ahora: ≈ **2.102** bbl» es solo la parte de Durante. Lo escribe `pages/PlantaViva.tsx:128`. El mismo rótulo nombra dos cifras.
  - ⚠️ En el nivel 4, «Planes · lo que todavía se puede mover».

### G-14 · Antes · Durante · Después como rótulo de cifra · ❌
Cada momento rotula dos cifras distintas en la misma pantalla de La planta viva. Es el caso «Antes / Durante» de X4 §1.3.3, que volvió con otra forma:

| Momento | En la píldora y en la cifra grande | En la tarjeta «Lo que todavía se puede mover» (simulado) |
|---|---|---|
| Antes | un **conteo**: los equipos que avisan (1 en La Ceiba, 8 en todos) | **0** bbl (La Ceiba); **42.017** bbl (todos) |
| Durante | **1.966 bbl/d**, medido | **2.102** bbl |
| Después | **1.046 bbl**, el diferido del libro | **30** bbl |

- **Motor.** `simulado` (`entities/planta-viva.ts:405-415`) y `mover.porMomento`.
- **Propuesta.** En la tarjeta del ciclo, nombrar el plan y no el momento:
  - «Intervenir a tiempo · 0»;
  - «Volver antes · 2.102»;
  - «No repetir · 30».

  Los tres son los verbos que ya usa el motor en sus frases (`planta-viva.ts:406-415`).

---

## 4. Las cifras de «lo que viene»

### G-15 · «Equipos que avisan» · ❌
- **Qué es.** Cuántos equipos avisan: los que están en riesgo, uno por equipo. Es un conteo.
- **Cifras.**
  - La Ceiba: **1** (K-101).
  - Todos los campos: **8**.
- **Motor.** `cifrasDeUnNombre().avisan`: `riesgoAhora` con estado `en-riesgo` (`entities/resultados.ts:93`).
- **Dónde está bien.** Riesgo: «Equipos que avisan · 1 · si paran, hasta 9.394 bbl/d en juego».
- **Choques.**
  - ❌ **«Avisan · 3»**, en el filtro de Equipos de La Ceiba (todos los roles técnicos). Cuenta lo que tiene condición en la franja y no está parado: K-101, TK-102 y H-302. Lo cuenta `equipos-tecnico.ts:283`, con el rótulo de `equipos-tecnico.ts:70`. La palabra es la misma y la cifra, otra: 3 contra 1.
  - ⚠️ «1 equipo avisando» (Mantenimiento, La Ceiba) y «8 equipos avisando» (Mantenimiento, todos): la misma cifra con otra forma del verbo.
  - ⚠️ «equipo avisando» y «Avisando · qué revisar» (Mi trabajo).
  - ⚠️ La franja dice «2 en atención · 1 aviso». Cuenta condiciones, también de equipos parados: es otra definición, con otras palabras. No choca de nombre, pero «aviso» (1) y «avisan» (1 o 3) se leen como lo mismo.

### G-16 · «Si falla hoy» · ❌ (dos unidades con el mismo nombre)
- **Qué es, según X4 §2, §3.4 y §3.6, y como lo construyó C4.** Lo que se dejaría de producir por día si el equipo falla hoy, después del colchón, en **bbl/d**.
- **Cifras.**
  - P-201A: 3.059 bbl/d.
  - K-101: hasta 9.394 bbl/d.
- **Motor.**
  - `criticidad` (`entities/criticidad.ts:326` y `:445`): el campo `bpd`;
  - en Equipos, `equipos-tecnico.ts:278`.
- **Dónde va en bbl/d.**
  - Equipos: «ahora o si falla hoy» y «hasta 9.394 bbl/d · si falla hoy».
  - Las placas de Bombas: «Si falla hoy: 3.059 bbl/d después de 2 min de colchón».
  - Los niveles 3: «Si falla hoy: 1.600 bbl/d · se trabaría en la planta».
  - El detalle de un pozo: «Si falla hoy: 783 bbl/d».
- **Choque.** ❌ En **Riesgo** y **Mantenimiento** (jefe y confiabilidad), «si falla hoy» es otra cifra, en **bbl**: «≈ 10.579 bbl si falla hoy» y «≈ 1.488 bbl si falla hoy».
  - Es `costoFalla` (`entities/diferido.ts:517`): lo que costaría la falla entera, con su tiempo fuera.
  - Su suma es «Exposición si fallan hoy» (G-17).
  - El comentario de `e2e/auditoria/rutas.ts` dice lo contrario de C4: «los bbl/d son "en juego" (o "si para"): "si falla(n)" es la cifra en bbl de Riesgo».
  - **Las dos reglas conviven en `main`.**
- **Más sinónimos de la cifra en bbl/d:**
  - «**en juego**» (Riesgo: «si paran, hasta 9.394 bbl/d en juego»; Electrosumergibles: «1.643 bbl/d en juego»);
  - «**si se para**» (placas de Bombas: «si se para: 1.600 bbl/d de inmediato»);
  - «**Si para**, hasta 9.394 bbl/d» (Hoy);
  - «**SI SE PARA AHORA**» (detalle de Confiabilidad);
  - «**Crudo en riesgo**» (nivel 4);
  - «dejan de producirse 3.059 bbl/d» (Hoy, «Lo más frágil»).
- **Propuesta** (la decide V1, porque toca a X4 y a la regla del auditor):
  - «Si falla hoy» se queda para el ritmo, en **bbl/d**, como en X4 y C4. «en juego», «si se para», «si para» y «Crudo en riesgo» pasan a ser «si falla hoy».
  - La cifra en bbl de Riesgo y Mantenimiento pasa a «**le costaría la falla**: ≈ 10.579 bbl». Así se lee al lado de «le ha costado N bbl por falla» (G-18), que es la misma idea hacia atrás.
  - La suma sigue como «Exposición si fallan hoy».

### G-17 · «Exposición si fallan hoy» · ✅
- **Qué es.** La suma de lo que costaría cada equipo que avisa si fallara hoy. Es estimado («≈»), en bbl.
- **Cifras.**
  - Todos los campos: **45.262**.
  - Morichal: 33.134.
- **Motor.** `cifrasDeUnNombre().exposicionBbl` y `NOMBRE_CIFRA.exposicion`.
- **Dónde.** Riesgo: «≈ 45.262 bbl de exposición si fallan hoy · sin 1 servicio».

### G-18 · «Le ha costado N bbl por falla» · ✅
- **Qué es.** El diferido histórico de cada falla del equipo, en bbl por falla.
- **Cifras.**
  - P-201B: 4.593.
  - MPP-301: 3.226.
- **Motor.** `historialDeEquipo` (`entities/libro.ts:1254`).
- **Dónde.**
  - Bombas: «9 fallas en 12 meses · cada 41 d · 40,0 h fuera · le ha costado 4.593 bbl por falla».
  - Confiabilidad: la columna «le ha costado por falla».
  - El detalle de MPP-301.

### G-19 · «colchón» · ✅
- **Qué es.** Cuánto aguanta el tanque antes de que haya que cerrar pozos, en horas o minutos.
- **Cifras.** «2 min de colchón» (P-201A), «10,1 h de colchón» (Morichal).
- **Motor.** `prediccion` (`entities/diferido.ts:211`).
- **Dónde.** Bombas, Equipos, niveles 3, Riesgo y Hoy.

---

## 5. Las cifras de los roles técnicos

| Rótulo | Qué es | Cifra | Motor | Dónde | Estado |
|---|---|---|---|---|---|
| «De 8,1 días que dura una falla, 7,7 son espera» | Los relojes del tiempo fuera: total contra espera | 7,7 de 8,1 días | `relojes` (`entities/sap.ts:336`); la frase en `hoy.ts:751` | Hoy del jefe; Resultados (jefe y planeación) | ✅ |
| «40,0 h fuera» / «2,0 d fuera» | El tiempo fuera de cada falla | P-201B 40,0 h | `historialDeEquipo` | Bombas, Confiabilidad | ✅. Una sola regla de horas y días; la vigila el auditor |
| «Diferido de su turno» | Lo diferido en las últimas 12 h | 723 barriles | `diferidoTurnoBbl` (`hoy.ts:239` y `:711`) | Hoy del supervisor | ✅ |
| «paradas por confirmar» | Las paradas de hoy que faltan por confirmar | 4 | `inicioDe` (`hoy.ts:729`) | Hoy del supervisor; Turno («faltan 4») | ✅ |
| «cosas le tocan hoy» | Las tareas que piden algo del técnico | 5 | `inicioDe` (`hoy.ts:757-762`) | Hoy del técnico | ✅. X4 decía 4; C3 dejó escrito el porqué |
| «1 de 4 preguntas» | La primera de las preguntas del operador | 4 | `inicioDe` (`hoy.ts:740-745`) | Hoy del operador | ✅. A 390 px no hay cifra grande: el «1 de 4» va chico, en la banda («Pregunta 1 de 4») |
| «¿Le creo al vigía?» / «acertó 3 de 3 avisos» | Aciertos sobre lo que se puede juzgar | 3 de 3 | `equipos-tecnico.ts:333-339`; Resultados `resultados.ts:444` | Equipos (conf), Resultados | ⚠️ Ver «El vigía anunció 3 de 3 fallas» |
| «El vigía anunció 3 de 3 fallas» | Las fallas que se anunciaron antes de pasar | 3 de 3 | `hoy.ts:750` | Hoy del jefe | ⚠️ «acertó 3 de 3 **avisos**» y «anunció 3 de 3 **fallas**» son dos medidas: precisión y cobertura. Hoy coinciden y se leen como la misma (S3) |
| «Tanque · 89,6 %» / «alto-alto 90 %» | El nivel del tanque de agua | 89,6 % | `tuberiaAgua` (`choke-agua.ts:207`) | La planta viva, Hoy, Agua, Configuración | ✅ |
| «mantenimiento proactivo» | Las horas proactivas sobre el total, desde el 1 de sept | 14 % | `horasPorClase` (`sap.ts:323`) | Resultados | ✅ |
| «¿Está bajando? Desde que entró TRIM» | Lo no planeado por día, antes contra ahora | planta 268 → 51; pozos 122 → 215 bbl/d | `lineaBasePorTramo` (`planta-viva.ts:578`) | La planta viva y Resultados | ⚠️ En La planta viva la cifra va **sin su nombre** («en la planta 268 → 51 bbl/d»). Resultados sí lo dice: «Lo no planeado por día» |
| «Lo de alto impacto» | Lo mismo, solo bombas de agua y electrosumergibles | 310 → 255 bbl/d | `resultados.ts` | Resultados | ✅ |
| «Real (punto de medición oficial)» / «Real medido» / «Real» | La producción fiscal del período | 16.941 bbl (Regulatorio) | `libro().real`; `FUENTE_REAL` (`libro.ts:52`) | Regulatorio, Diferidos, Producción | ⚠️ Tres formas (S3). Propuesta: «Producción medida» |
| «el último día completo dio 11.105 bbl» | La producción fiscal de ayer | 11.105 | `fiscalDeAyer` (`libro.ts:1063`) | Planta, Producción | ✅. Es «producidos ayer», que salió de la cabecera (X4 §3.5) |

## 6. La franja de condiciones (conteos)

| Rótulo en el escritorio | En el teléfono (390 px) | Motor | Estado |
|---|---|---|---|
| «2 alarmas» | «2 alarmas» | `franjaDe` (`entities/condiciones.ts:68`) | ✅ |
| «2 en atención» | «2 **atención**» | igual | ⚠️ Dos rótulos para la misma cuenta (S3) |
| «1 aviso» | «1 aviso» | igual | ✅ |
| «0 sin comunicación» | «**0**», sin palabra | igual | ❌ A 390 px queda solo la cifra junto al círculo punteado: la marca va sin palabra (X5 §5.6; X2: color con forma y palabra). Va a R3 |

## 7. Lo que el motor todavía no da (no se mide ni se inventa)

- **reg · «2 paradas sin causa»** como cifra grande del inicio (X4 §3.4).
  - El motor tiene las filas sin causa: «Falta quién · 355», en Regulatorio.
  - Pero no tiene la cifra con su frase de inicio, ni «quién lo debe» ni «la hora límite».
  - Hoy Regulatorio no tiene cifra grande.
- **adm · «5 de 7 pasos listos».** X4 lo da como ejemplo. Ninguna vista lo calcula.
- **plan y cont.** Apagados en el MVP (`producto.ts`: `ROLES_V2`). Sus cifras de X4 §3.4 («2 repuestos», «3 paradas») son ejemplos.
- **conf · «3.059 bbl/d · el primero de "Si falla hoy"»** como cifra grande. La cifra existe en Equipos (la primera fila sin parar), pero el inicio de confiabilidad no la pone grande.
