# 5A.10 · Cuadre con la asignación oficial

La operadora reporta cada mes, pozo por pozo, el crudo asignado (a la ANH, en el sistema de contabilidad de hidrocarburos). TRIM asigna con **el mismo método** (lo real del PMO repartido por prueba × factor × horas abierto) y coteja. Si usan las mismas pruebas y las mismas horas, dan lo mismo; si no, la diferencia se parte en lo que explican las horas y lo que queda para la prueba o el factor. **Es un cotejo: no cambia el libro.**

Pantalla: Producción, ingeniería, panel «CUADRE · ASIGNACIÓN OFICIAL · mes cerrado» (`src/widgets/produccion/AsignacionOficial.tsx`). Cargarla es de producción (capacidad `asignacion:cargar`); los demás ven el cotejo y «Solo lectura: la carga producción.».

---

### Asignación de TRIM por pozo (`asignacionPorPozo`) · `GET /api/vistas/asignacion?campo&mes`

**Qué es.** Lo que TRIM le asigna a cada pozo con prueba en un **mes cerrado**, de modo que la suma de los pozos es **exactamente** lo real del PMO del campo.

**Fórmula** (`src/entities/libro.ts:385-404`). Para el campo $c$ y el mes $m$ (720 h en septiembre):

$$
\text{potencial}_p = \sum_{d\,\in\,m} q_{p,d}\cdot \text{FA}_m\cdot\frac{h_d}{24}
\qquad
\text{diferido}_p = \sum_{t\,\in\,\text{tramos de } p} \text{bbl}_t
\qquad
\text{horas}_p = H_m - \sum_{t\,\in\,p,\ \neg\text{aprox}} \text{horas}_t
$$

$$
k = \frac{\text{Real}_m}{\sum_p (\text{potencial}_p - \text{diferido}_p)}
\qquad
\text{asignado}_p = (\text{potencial}_p - \text{diferido}_p)\cdot k
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $H_m$ | horas del mes | h | calendario |
| $\text{horas}_p$ | horas produciendo según el PLC (las de frecuencia reducida cuentan como produciendo) | h | eventos del pozo |
| $k$ | reparte el inventario del tanque (real − (potencial − diferido)) en proporción, para que $\sum \text{asignado} = \text{Real}$ | — | libro del mes |

Ordenado por `asignado` de mayor a menor. Forma: `AsignacionPozo { campoId, pozo, horas, potencial, diferido, asignado }`.

**Ejemplo con los datos del demo (La Ceiba, septiembre).** Real del mes 338.662; $\sum \text{potencial} = 346.378{,}059$, $\sum \text{diferido} = 7.716{,}059$ → $k = 1$ exacto (mes entero: el inventario es 0).

| Pozo | Horas | Potencial | Diferido | Asignado |
|---|---:|---:|---:|---:|
| LC-11 | 635,350 | 31.765,412 | 3.677,228 | 28.088,184 |
| LC-08 | 718,383 | 27.256,010 | 60,830 | 27.195,180 |
| LC-16 | 699,333 | 26.475,052 | 756,762 | 25.718,291 |
| LC-04 | 654,967 | 25.021,657 | 2.260,583 | 22.761,074 |
| … | | | | |
| LC-21 | 720,000 | 9.106,007 | 0 | 9.106,007 |
| **Σ 18 pozos** | | **346.378,059** | **7.716,059** | **338.662** |

**Casos borde.** Mes abierto o inexistente → `[]` (octubre 2026: `[]`). Mes sin factor → potencial 0 y asignado 0. Pozos sin prueba no aparecen (su crudo queda repartido entre los demás vía el factor). $\sum(\text{potencial}-\text{diferido}) = 0$ → $k = 0$.

**Quién lo calcula.** Servidor. Caso `referencia/asignacion/<campo>-<mes>.json` (todos los campos, oct-2025 a sep-2026).

---

### Formato de la carga (CSV) y plantilla

**Qué es.** Lo que producción pega o sube mientras el backend no lea la asignación del sistema de contabilidad: `Mes;Campo;Pozo;Crudo asignado bbl;Horas` (horas opcional).

**Reglas de lectura** (`leerAsignacion`, `src/entities/asignacion.ts:58-95`; usa `partirTexto`, `leerMes`, `leerNumero`, `leerCampo` de `src/entities/plan.ts`):

| Tema | Regla |
|---|---|
| Separador | tabulador (lo que copia Excel) si alguna línea lo trae; si no, punto y coma; si no, coma. Se quita el BOM |
| Cabecera | la primera fila se salta si su columna 1 no es un mes **y** su columna 4 no es un número |
| Mes | «2026-09», «2026-09-01», «09/2026», «1/09/2026», «sep 2026», «sept-26», «septiembre de 2026», número de serie de Excel |
| Campo | por nombre o id, sin importar tildes ni mayúsculas («La Ceiba», «ceiba») |
| Pozo | sin espacios a los lados y en mayúsculas |
| Números | «29650», «29.650», «672,5», «1.234,5», «11,200.5»; vacío = sin dato |
| Columnas | más de 5 → error |
| Coma ambigua | con coma como separador, un par «11,200» sin comillas en las columnas de cifras es ambiguo si la fila no trae otra cifra de 4+ dígitos sin separar → error |
| Repetidos | mismo (mes, campo, pozo): **aviso** «Fila 8: repite LC-02 de septiembre de 2026 (fila 7); vale la última.» y vale la última |

**Errores (uno por fila mala).**

| Caso | Texto |
|---|---|
| Mes ilegible | «Fila 9: «xx» no es un mes (use 2026-09, 09/2026 o septiembre 2026).» |
| Columnas de más | «Fila 1: trae 6 columnas y se esperan 5. Si usa coma decimal, separe las columnas con punto y coma o péguelas desde Excel.» |
| Coma ambigua | «Fila N: «11,200» puede ser un número con miles o dos columnas. Escriba el número entre comillas ("11,200"), sin separador de miles, o separe las columnas con punto y coma.» |
| Mes no cerrado | «Fila 2: octubre de 2026 no es un mes cerrado con datos: no hay con qué cotejarlo.» |
| Campo desconocido | «Fila 10: «Campo X» no es un campo.» |
| Campo no asignado | «Fila 3: no tiene asignado ese campo.» |
| Sin pozo | «Fila 4: falta el pozo.» |
| Volumen malo | «Fila 5: «-5» no es un volumen (bbl, cero o más).» |
| Horas fuera | «Fila 6: «800» no son horas de septiembre de 2026 (0 a 720).» (octubre: 0 a 744) |

(Los textos de esta tabla salen de correr `leerAsignacion` con esas filas.)

**Una fila mala no carga nada.** Si hay errores, la pantalla muestra los primeros diez («y N más.») y «No se cargó nada: corrija esas filas y vuelva a cotejar.»: un pozo rechazado aparecería después como «no está en la oficial». Sin filas de datos: «No se encontraron filas de datos: después de la cabecera va una fila por pozo.»

**Plantilla** (botón «Plantilla», `plantillaAsignacion`): BOM + `Mes;Campo;Pozo;Crudo asignado bbl;Horas produciendo (opcional)` y una fila por pozo de TRIM del mes y campo (`2026-09;La Ceiba;LC-11;;`), separadas por CRLF; archivo `TRIM-asignacion-oficial-ceiba-2026-09.csv`.

**Quién lo calcula.** «Los dos»: el front lee y avisa; el servidor vuelve a validar y sus 422 mandan.

---

### Carga (`POST /api/asignacion-oficial`) y rastro de cargas

**Qué es.** La carga reemplaza lo cargado de cada (mes, campo) que trae y deja rastro: quién, cuándo, por qué y cuántos pozos reemplazó. Solo se inserta, nunca se corrige.

**Reglas del servidor** (`cargarAsignacion`, `src/shared/api/escrituras.ts:265-305`; `CONTRATO.md:551-564`), todo o nada, en este orden:

1. Rol sin `asignacion:cargar` → 403 «La asignación oficial la carga producción: su rol no la reemplaza.»
2. Sin persona activa del rol → 403.
3. Por fila: campo no asignado a la persona (403 «No tiene asignado {Campo}: no se cargó nada.»); mes no cerrado (422 «{mes} no es un mes cerrado con datos: no se cargó nada.»); pozo vacío; `bbl` no finito o < 0; `horas` fuera de 0 a días×24.
4. Sin filas → 422 «No llegó ninguna fila: no se cargó nada.»
5. Motivo de menos de 5 caracteres (`MOTIVO_MINIMO`) → 422 «Falta el motivo: diga de dónde sale esta asignación (por ejemplo, el reporte del mes a la ANH).»

Respuesta `{ filas, carga }`: toda la oficial como quedó (cada fila con `carga` = id) y la carga `{ id, fecha, por: «Nombre · rol», motivo, grupos: [{ mes, campoId, pozos, reemplazados }] }`. `id`, `fecha` y `por` los pone el servidor (`por` sale del token).

**Qué texto.** Tras cargar: «18 pozos cargados en 1 mes y campo.». Sobre el cotejo: «Cargada el {fecha y hora} por {por}: «{motivo}» · reemplazó N pozos de una carga anterior.» Al pie, desplegable «Rastro de las cargas · N cargas»: por carga, «{fecha} · {por}», «{motivo}» y «septiembre de 2026 · La Ceiba: 18 pozos» (con « (reemplazó N)» si había una carga anterior de ese mes y campo).

**Arranque.** `GET /api/asignacion-oficial` → `{ filas, cargas }` (en el demo empieza vacío: «sin cargar»).

---

### Cotejo pozo por pozo (`cotejar`)

**Qué es.** Para un mes y campo, cada pozo de la unión (los de TRIM y los de la oficial) con su diferencia y su porqué.

**Fórmula** (`src/entities/asignacion.ts:124-149`), con $o$ = oficial, $t$ = TRIM, $b$ = banda del campo (5A.2):

$$
\text{diferencia} = o_{\text{bbl}} - t_{\text{asignado}} \qquad \text{fuera} \iff |\text{diferencia}| > b\cdot\max(o_{\text{bbl}},\ t_{\text{asignado}})
$$

$$
\text{porHoras} = \frac{t_{\text{asignado}}}{t_{\text{horas}}}\cdot\left(o_{\text{horas}} - t_{\text{horas}}\right) \qquad \text{resto} = \text{diferencia} - \text{porHoras}
$$

| Caso | `fuera` | `motivo` |
|---|---|---|
| Solo en TRIM, asignado > 0,5 | sí | «No está en la asignación oficial; TRIM le asigna {n} bbl.» |
| Solo en TRIM, ≤ 0,5 | no | «No produjo en el mes.» |
| Solo en la oficial (TRIM no lo conoce) | si bbl > 0,5 | «TRIM no tiene ese pozo con prueba en el campo: revise el nombre o el maestro de pozos.» |
| TRIM horas 0 y oficial > 0,05 h | regla de banda | «Según el PLC no produjo en el mes; la oficial le da {h} h y {bbl} bbl.» |
| Horas distintas (> 0,05 h) y TRIM > 0 | regla de banda | «Horas: {o} oficial, {t} según el PLC; explican {porHoras} bbl.» + (si \|resto\| ≥ 1) « El resto, {resto} bbl, está en la prueba o el factor.» |
| \|diferencia\| < 1 | regla de banda | «Cuadra.» |
| Sin horas oficiales | regla de banda | «Sin horas oficiales no se separa: está en las horas, la prueba o el factor.» |
| Mismas horas | regla de banda | «Mismas horas: está en la prueba o el factor que usó cada uno.» |

Orden: primero los que TRIM no conoce, después la diferencia absoluta mayor. Totales: $\sum o$ (todas las filas oficiales, incluidas las de pozos desconocidos) y $\sum t$.

**Ejemplo (carga armada para este documento y corrida con el motor).** Septiembre de La Ceiba: la oficial = TRIM redondeado, salvo LC-11 (+20 %, mismas horas), LC-16 (+300 bbl y +10 h), sin LC-21, y con un pozo inexistente LC-99 (500 bbl, 720 h). Leídas 18 filas, sin errores.

| Pozo | Oficial | TRIM | Diferencia | Horas oficial · PLC | Fuera (±15 %) | Motivo |
|---|---:|---:|---:|---|---|---|
| LC-99 | 500 | — | 500 | 720 · — | sí | «TRIM no tiene ese pozo con prueba en el campo: revise el nombre o el maestro de pozos.» |
| LC-21 | — | 9.106,0 | −9.106,0 | — · 720,0 | sí | «No está en la asignación oficial; TRIM le asigna 9.106 bbl.» |
| LC-11 | 33.706 | 28.088,2 | 5.617,8 | 635,4 · 635,4 | **sí** ($5.618 > 0{,}15\times33.706 = 5.056$) | «Mismas horas: está en la prueba o el factor que usó cada uno.» |
| LC-16 | 26.018 | 25.718,3 | 299,7 | 709,3 · 699,3 | no | «Horas: 709,3 oficial, 699,3 según el PLC; explican 368 bbl. El resto, -68 bbl, está en la prueba o el factor.» |
| LC-03 | 11.398 | 11.397,5 | 0,5 | 720,0 · 720,0 | no | «Cuadra.» |
| … 14 más | | | | | | «Cuadra.» |

Totales: oficial 335.975; TRIM 338.662.

**Qué texto se muestra (el panel con esa carga).**

- «18 pozos leídos · 17 reconocidos · 1 que TRIM no tiene».
- Marca de dato inválido (círculo magenta punteado, ISA-101) + «TRIM no tiene LC-99 en La Ceiba: revise el nombre o el maestro de pozos.»
- ■ P3 + «Faltan 1 pozo de La Ceiba en lo que se cargó (TRIM les asigna 9.106 bbl): ¿está completo el archivo?» y debajo «LC-21».
- Cifras: «oficial **335.975 bbl**», «TRIM **338.662 bbl**» (ⓘ «Lo que midió el punto de medición oficial en el mes, repartido por prueba × factor × horas.»), «fuera de banda · ±15 %» **■ 1** «de 17 pozos cotejados».
- Si $|\Sigma o - \Sigma t| \ge 1$: «La oficial suma 2.687 bbl menos que lo que midió el punto oficial. Primero complete los pozos.» (sin pozos faltantes ni desconocidos, en vez de la última frase va un ⓘ «Diferencia de totales: Las dos deberían sumar lo mismo: si no, una usó otro volumen (por ejemplo, un corte de agua de laboratorio corregido).»)
- Tabla «Pozo · Oficial · TRIM · Diferencia · Horas oficial · PLC» solo con los comparables, cinco a la vista; ■ en «Diferencia» si está fuera; ⓘ por fila con el motivo (en el papel, el motivo en su renglón). Horas: `n1` o «sin dato».
- Botón «Descargar el cotejo»: CSV `TRIM-cotejo-asignacion-ceiba-2026-09` con columnas Pozo, Oficial bbl, TRIM bbl, Diferencia bbl, Horas oficiales, Horas PLC, Explican las horas bbl, Fuera de la banda (sí/no), Explicación.
- Sin carga: chip «sin cargar» + «TRIM asigna 338.662 bbl · 18 pozos» con ⓘ «La Ceiba · septiembre de 2026: Sin asignación oficial cargada. Lo que asigna TRIM es lo que midió el punto de medición oficial.»

Selectores: «Campo» (si hay más de uno) y «Mes» (solo meses cerrados, del más nuevo al más viejo; por omisión el último cerrado: septiembre de 2026).

**Quién lo calcula.** «Los dos» (`cotejar` es regla compartida); los datos de TRIM, el servidor (`/vistas/asignacion`); la banda, el catálogo.

**Referencia.** `src/entities/asignacion.ts`; `src/widgets/produccion/AsignacionOficial.tsx`; `verificar-libro.mjs` sección 8; `CONTRATO.md:985-997`, `:551-564`.
