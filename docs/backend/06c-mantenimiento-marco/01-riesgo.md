## 6C.1 Riesgo — «Qué está en riesgo» · jefe de mantenimiento, confiabilidad, gerente

**Para qué.** «A qué equipo ir hoy, por los barriles que cuesta.» (nivel `decision`: «Qué se pierde ahora y qué va a fallar.») — `src/widgets/Onboarding.tsx:24` y `:37`.
**Ruta.** `#/<rol>/riesgo/<campo>[~portafolio]/<período>` · **Roles y nivel.** `jefe` (ingeniería), `conf` (ingeniería), `ger` (decisión). Operación no la tiene: Turno y Mi trabajo repiten lo mismo (`src/entities/roles.ts:28-34`). Agrega campos (`agrega: true`): en portafolio suma los campos del rol.
**Lee.** `GET /api/vistas/riesgo?campos` → `Riesgo[]` (filas) y `GET /api/vistas/estado?campos` → `EstadoCampo[]` (solo para el potencial). **El período no cambia nada**: todo es «ahora» (`AHORA`). Fórmulas: 5B §5 «Lo que se pierde ahora y lo que está en riesgo».

> El demo calcula con `AHORA = 2026-10-02T14:00-05:00`. Los números de abajo son los de la captura y los del caso `referencia/riesgo/portafolio.json` (y `ceiba.json`, `morichal.json`), que el backend debe reproducir sin redondear.

### Captura 1 · jefe, portafolio, «ver 2 más» cerrado

![Riesgo · jefe · portafolio · octubre en curso](../img/jefe-riesgo-portafolio.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | Marca ◆ delante de la cifra | ◆ 1 (rojo) | aparece si alguna fila `perdiendo` tiene `altoImpacto` (`Riesgo.tsx:147`) | ◆ P1 o nada (no hay P2 en la cabecera aunque solo se pierda por un pozo sin identificar) | `riesgo[].altoImpacto` |
| 2 | **Perdiéndose ahora** | **13.217** bbl/d | $\sum_{\text{estado}=\text{perdiendo}} \text{bblDia}$ = 11.058,9 + 684,1 + 588,1 + 585,2 + 300,8 = 13.217,1 → 5B §5.2 «Perdiéndose ahora» | `n0` + «bbl/d». Con 0 se ve «0 bbl/d» (sin marca) | `GET /api/vistas/riesgo` → `bblDia` de las filas `perdiendo` |
| 3 | Apoyo: eficiencia perdida y pozos | «31,5 % del potencial · 21 pozos parados» | $\dfrac{\sum \text{bblDia}_{\text{perdiendo}}}{\sum_{\text{campos}} \text{potencialBpd}} \times 100$ = 13.217,1 / 42.014,9 = 31,46 % ; pozos = $\sum$ `pozos` de las filas `perdiendo` (17+1+1+1+1) → 5B §5.4 «El estado del campo» | `n1` + « % del potencial · » + `plural(n,'pozo parado','pozos parados')`. Sin potencial (ningún campo con factor): «0,0 %» (`Riesgo.tsx:149`) | `GET /api/vistas/estado` → `potencialBpd`; `riesgo[].pozos` |
| 4 | Rótulo «En riesgo · N equipos» | «En riesgo · 7 equipos» | número de filas `en-riesgo` | `plural(n,'equipo','equipos')` | `riesgo[]` con `estado = 'en-riesgo'` |
| 5 | **En riesgo** (bbl/d si fallan) | **5.561** bbl/d si fallan | $\sum_{\text{en-riesgo}} \text{bblDia}$ = 1.670,7 + 1.599,8 + 647,2 + 606,5 + 526,1 + 510,4 + 0 = 5.560,6 → 5B §5.3 «En riesgo» | `n0` + «bbl/d si fallan». No se suma con la cifra 2: todavía no se pierde | `riesgo[].bblDia` |
| 6 | Pie corto del costo | «≈ 56.706 bbl si fallan · sin 1 servicio» | $\sum_{\text{en-riesgo}} \text{costoFalla}$ (las que lo traen) = 3.364,6 + 3.433,5 + 16.614,9 + 12.290,8 + 10.660,0 + 10.341,8 = 56.705,7 → 5B §5.3 (`costoFalla`) | `pieCorto` (`Riesgo.tsx:52-56`): sin filas → «nada en riesgo»; costo > 0 → «≈ {n0} bbl si fallan» + « · {k} sin historia» (equipos no servicio sin `costoFalla`) + « · sin {plural(s,'servicio','servicios')}»; costo 0 y todas servicio → «solo servicios del campo»; costo 0 con alguno sin historia → «sin historia para estimar» | `riesgo[].costoFalla` |
| 7 | ⓘ «Costo si fallan» | (globo) | la frase larga `pieCosto` (`Riesgo.tsx:46-49`) | Texto literal aquí: «56.706 bbl si fallan con su tiempo fuera de siempre · sin contar 1 servicio del campo». Variantes: « · {plural(k,'equipo','equipos')} sin historia para estimar»; «son servicios del campo: lo que cuesta su caída depende de cuánto dure»; «— sin historia para estimar una falla». Solo se dibuja si hay filas en riesgo; en el papel sale escrito («Costo si fallan: …») | ídem |
| 8 | **El más cercano** | «K-101 · La Ceiba» | la **primera** fila `en-riesgo` después de ordenar por `horas` ascendente con `horas` ausente = −1 (`Riesgo.tsx:31`): lo que ya está fuera va primero | equipo + « · {campo}» solo en portafolio; debajo el nombre de la parte (`NOMBRE_PARTE`, con mayúscula) si hay; sin filas: «ninguno» en gris | `riesgo[]` |
| 9 | Chip «ya fuera» | «ya fuera» | `horas === undefined` en esa fila (la variable ya llegó a su alarma o el equipo es un servicio en alarma sin pronóstico) | chip fuerte «ya fuera»; si hay horas: «cruza en {fmtHoras(h)}» (ver captura 3) | `riesgo[].horas` |
| 10 | Extra del panel PERDIÉNDOSE AHORA | «5 causas» | número de filas `perdiendo` (una por equipo causante y tipo) | `plural(n,'causa','causas')`; sin filas: «nada» y el texto «Todos los pozos produciendo.» | `riesgo[]` |
| 11 | Fila: equipo y campo | «P-201B · La Ceiba»; las otras de PERDIÉNDOSE AHORA: «MN-41 · Morichal Norte», «GU-07 · Guacamayo», «GU-09 · Guacamayo», «LC-21 · La Ceiba» (orden del servidor: `bblDia` descendente, 5B §5.1); en EN RIESGO: «K-101 · La Ceiba», «MN-07 · Morichal Norte», «MN-18 · Morichal Norte», «P-201B · Morichal Norte», «GU-04 · Guacamayo» (orden por `horas`, fila 8) | `equipo` (+ « · » + nombre del campo solo en portafolio, `campoPorId(c).nombre`) | el nombre del campo sale del registro (`GET /api/campos`); un id sin registrar se ve «id (campo sin registrar)» | `riesgo[].equipo`, `.campoId` |
| 12 | Chip del tipo de causa | «bomba de reinyección» (P-201B de La Ceiba y de Morichal); «electrosumergible» (MN-41, GU-07, GU-09, MN-07, MN-18, GU-04); «sin identificar» (LC-21, `tipo = pendiente`); «aire de instrumentos» (K-101, `tipo = aire`) | `TIPO_CAUSA[tipo]` en minúscula → 5B §2.1 «La forma de una causa» | tono **fuerte** (borde oscuro) si `altoImpacto`, neutro si no (LC-21 «sin identificar» va neutro) | `riesgo[].tipo` |
| 13 | Desde cuándo | «desde 2 de oct, 03:52» (P-201B); MN-41 «desde 3 de sept, 06:40»; GU-07 «desde 26 de sept, 02:04»; GU-09 «desde 13 de sept, 17:23»; LC-21 «desde 1 de oct, 18:20» (las ESP y LC-21: su propio primer cierre) | `desde` = inicio de la parada de bomba o del servicio que causó; si la causa es el propio pozo, el primer cierre → 5B §5.2 | `fechaHora` (con año si es de otro año: «19 de oct de 2025, 02:02»); sin `desde` no se escribe la línea | `riesgo[].desde` |
| 14 | bbl/d de la fila | **11.059** (P-201B, 11.058,875); 684 (MN-41, 684,066); 588 (GU-07, 588,12); 585 (GU-09, 585,22); 301 (LC-21, 300,83) | `bblDia` de ese grupo = 11.058,875 (17 pozos, crudo asignado = prueba vigente × FA) → 5B §5.2 | `n0` | `riesgo[].bblDia` |
| 15 | Apoyo de la fila | «bbl/d · 17 pozos» (P-201B); las otras cuatro «bbl/d · 1 pozo» | `pozos` | `plural(n,'pozo','pozos')` | `riesgo[].pozos` |
| 16 | Parte de la fila | «aislamiento del motor y del cable» (MN-41, GU-07, GU-09 y, en EN RIESGO, GU-04); EN RIESGO: MN-07 «bomba de fondo», MN-18 «admisión y gas», P-201B de Morichal «succión y filtro de entrada»; K-101 y LC-21 sin parte | `parte` del primer pozo del grupo → 5C §3 «Catálogo de partes por familia» | `NOMBRE_PARTE[parte].toLowerCase()`; sin parte no se escribe nada (P-201B de La Ceiba no la tiene: la parada está «por identificar») | `riesgo[].parte` |
| 17 | Marca de la fila LC-21 | ▲ 2 (◆ 1 en P-201B, MN-41, GU-07, GU-09; en EN RIESGO ◆ 1 en K-101 y ▲ 2 en las otras cuatro) | PERDIÉNDOSE: `altoImpacto ? 1 : 2` (`Riesgo.tsx:78`; el servidor manda la misma regla en `prioridad`). EN RIESGO: `prioridad` del servidor tal cual (`Riesgo.tsx:107`): la de la salud de la parte (aquí 2: parte fuera de banda con pronóstico) o, en un servicio, su severidad (K-101 = 1) → 5B §5.1 y §5.3 | ◆ P1 / ▲ P2 / ■ P3 (8 §8.4) | `riesgo[].altoImpacto`, `riesgo[].prioridad` |
| 18 | Columna «cruza en» de K-101 | «ya fuera» | `horas` ausente → 5C §2 «Pronóstico de cruce» | «ya fuera» (negrita); si hay horas, `fmtHoras(h)` | `riesgo[].horas` |
| 19 | Columna «si falla» de K-101 | «todo el campo» | servicio (`esServicio`: no es ESP ni bomba de la línea, `Riesgo.tsx:219`) con `bblDia = 0` → en La Ceiba no produce ningún pozo, así que lo que cerraría es 0 | servicio con 0 → «todo el campo»; si no, `n0(bblDia)` + « bbl/d»; debajo: `costoFalla` → «≈ {n0} bbl por falla», servicio → nada, otro sin costo → «sin historia» | `riesgo[].bblDia`, `.tipo` |
| 20 | «qué hacer» ⓘ | (globo) | `accion` de la fila → 5B §5.3 | Globo «Qué hacer · K-101»: «Verificar que las tres unidades estén en servicio: hoy hay dos. Con el recibidor en 11 min de autonomía, una parada deja las válvulas en posición segura.» No se dibuja en nivel `decision` ni si no hay `accion` | `riesgo[].accion` |
| 21 | Chip del estado de la parte | «fuera de banda» (las cuatro filas con parte: MN-07, MN-18, P-201B, GU-04) | `estadoParte` de la peor parte → 5C §3 «Estado de una parte» | `ESTADO_PARTE[estadoParte]`: `fuera` → «fuera de banda» (tono fuerte), `avisa` → «avisa» (neutro) | `riesgo[].estadoParte` |
| 22 | «cruza en» de MN-07 | **4 h** (MN-07, 3,794 h); MN-18 «30 h» (30,16 h); P-201B de Morichal «43 h» (43,09 h); GU-04 «2,5 d» (61,08 h / 24 = 2,545 d) | horas hasta que la primera variable de la parte llegue a su alarma = 3,794 h → 5C §2 «Pronóstico de cruce» | `fmtHoras(h)`: < 48 h → `n0` + « h»; hasta 90 d → `n1(h/24)` + « d»; más → «más de 3 meses». Sin rango debajo porque 3,64 h y 3,96 h se escriben los dos «4 h» (`entre`, `Riesgo.tsx:209-214`) | `riesgo[].horas`, `.rango` |
| 23 | «si falla» de MN-07 | **607 bbl/d** (MN-07); MN-18 «526 bbl/d» (526,05); P-201B de Morichal «1.671 bbl/d» (1.670,66: los 4 pozos que cerraría en orden, 5B §5.3 (a)); GU-04 «647 bbl/d» (647,23) | crudo asignado del pozo = 606,53 → 5B §5.3 (c) | `n0` + « bbl/d» | `riesgo[].bblDia` |
| 24 | «flota» | «flota» (MN-07, MN-18, GU-04; P-201B de Morichal no: `costoDe = 'propio'`) | `costoDe = 'flota'`: el pozo nunca ha fallado y su tiempo fuera es el promedio de las ESP del campo (486,34 h en Morichal) → 5B §5.3 «Tiempo fuera promedio de la flota ESP» | solo en nivel `ingenieria` (`Riesgo.tsx:132`); el globo de la fila dice además «Costo por falla: 20 días fuera, el promedio de las electrosumergibles del campo (esta no ha fallado).» | `riesgo[].costoDe`, `.mdtFuente` |
| 25 | Rango corto | «30–31 h» (MN-18); P-201B de Morichal «41–45 h» (41,34–44,99 h); GU-04 «2,5–2,6 d» (60,25–61,93 h); MN-07 sin rango (fila 22) | `[rango[0], rango[1]]` = 29,64–30,70 h → 5C §2 | `entre`: si las dos puntas tienen la misma unidad se escribe «a–b unidad» («41–45 h», «2,5–2,6 d»); si no, «x–y» completos; si se escriben igual, vacío | `riesgo[].rango` |
| 26 | Costo por falla propio | «≈ 3.365 bbl por falla» (P-201B Morichal); de flota: MN-07 «≈ 12.291», MN-18 «≈ 10.660», GU-04 «≈ 16.615» | propio: `historial.bblPorFalla` = 26.917,2 bbl / 8 fallas cerradas = 3.364,6 → 5B §7 «Fallas del equipo». Flota (ESP que nunca ha fallado): $\text{crudoAsignado} \cdot \text{MDT}_{\text{flota}}/24$ = 606,532 × 486,339 / 24 = 12.290,8; 526,05 × 486,339 / 24 = 10.660,0; 647,226 × 616,103 / 24 = 16.614,9 → 5B §5.3 (c) «Tiempo fuera promedio de la flota ESP» | «≈ {n0} bbl por falla»; sin «flota» si `costoDe = 'propio'` | `riesgo[].costoFalla`, `.costoDe` |
| 27 | «ver 2 más» | «ver 2 más» | 7 filas; se ven 5 y nunca se esconde una de `prioridad = 1` (`listaCorta.ts:14`) → aquí K-101 (P1) va primera; se esconden MPP-301 y MN-27 | `ver {n} más` / `ver menos`; lo escondido sale en el papel (`.solo-impresion`) | — |

**Globo de una fila «perdiendo»** (al pasar el cursor o tocar; en el papel sale entero, `imprimir="todo"`): título «{equipo} · {TIPO_CAUSA}», pista = `motivo` («Se cerró porque la bomba de reinyección estaba parada y el tanque de agua lleno»), filas «Pozos parados 17», «Perdiéndose 11.059 bbl/d», «Por hora 461 bbl/h» (`n0(bblDia/24)`), «Desde 2 de oct, 03:52», «Pozos cerrados desde 2 de oct, 08:07» (solo si `cierreDesde − desde > 1 min`) y, **solo en nivel `decision`**, «Del potencial {n1} %» (`Riesgo.tsx:70-75`).

**Globo de una fila «en riesgo»** (en el papel sale solo la pista, `imprimir="pista"`): «Parte», «Cruza su límite · en 43 h (41–45 h)» o «ya fuera», «Si falla · 1.671 bbl/d» (servicio con 0: «cierra lo que esté produciendo en el campo»), «Por falla · ≈ 3.365 bbl»; pista = `motivo` + (en ingeniería) «Costo por falla: {mdtFuente}.». Ejemplo P-201B Morichal: «Succión y filtro de entrada: presión de succión salió de su banda normal; llega a su alarma en 43 h Costo por falla: el promedio de sus 8 fallas cerradas (el tanque absorbe una parte).»

### Captura 2 · jefe, portafolio, «ver más» abierto

![Riesgo · jefe · portafolio · ver más abierto](../img/jefe-riesgo-portafolio-vermas.png)

Lo demás (la cabecera y las cinco primeras filas de cada lista) es igual que en la captura 1 y se explica en su tabla.

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | Sexta fila | «MPP-301 · Morichal Norte» ▲ 2 · parte «filtro de entrada» · «fuera de banda» · cruza en «5,2 d» (124,31 h / 24 = 5,18) · rango «4,7–5,7 d» (113,34–137,63 h) · si falla «1.600 bbl/d» (1.599,75: los 3 pozos de su clúster, 5B §5.3 (a)) | orden por `horas`: 124,31 h → 5B §5.3 | `fmtHoras` ≥ 48 h → `n1(h/24)` + « d»; marca = `prioridad` de la parte | `riesgo[]` |
| 2 | Chip del tipo | «bomba multifásica» | `TIPO_CAUSA['transporte']`; `altoImpacto: false` (no es reinyección) pero **sí** lleva costo por falla y entra en la cifra 6 de la cabecera (`Riesgo.tsx:125-127`) | chip neutro | `riesgo[].tipo` |
| 3 | Costo por falla | «≈ 3.434 bbl por falla» | 24.034,6 bbl / 7 fallas cerradas = 3.433,5 | ídem fila 26 | `riesgo[].costoFalla` |
| 4 | Séptima fila | «MN-27 · Morichal Norte» ▲ 2 · «electrosumergible» · parte «protector del motor» · «fuera de banda» · cruza en «10,9 d» · si falla «510 bbl/d» (510,35) · «≈ 10.342 bbl por falla» · «flota» | 261,54 h / 24 = 10,9 d; costo de flota 510,35 × 486,339 / 24 = 10.341,8 → 5B §5.3 (c) | ídem captura 1 | `riesgo[]` |
| 5 | Rango en días | «10,2–11,6 d» | 245,9–279,3 h → `n1(h/24)` | — | `riesgo[].rango` |
| 6 | «ver menos» | — | el botón alterna | — | — |

### Captura 3 · confiabilidad, Morichal (un campo)

![Riesgo · conf · Morichal · octubre en curso](../img/conf-riesgo-morichal.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | Perdiéndose ahora | ◆ **684** bbl/d | solo MN-41 (684,07) | ídem captura 1 | `riesgo` |
| 2 | Apoyo | «3,9 % del potencial · 1 pozo parado» | 684,1 / 17.604,1 = 3,886 % | singular «1 pozo parado» | `estado[].potencialBpd` |
| 3 | En riesgo | «En riesgo · 5 equipos» · **4.913** bbl/d si fallan | 5 filas `en-riesgo`; 1.670,7 + 1.599,8 + 606,5 + 526,1 + 510,4 = 4.913,4 | — | `riesgo` |
| 4 | Pie corto | «≈ 40.091 bbl si fallan» | 3.364,6 + 3.433,5 + 12.290,8 + 10.660,0 + 10.341,8 = 40.090,8; sin salvedades (ningún servicio, todos con historia o flota) | ⓘ: «40.091 bbl si fallan con su tiempo fuera de siempre» | `riesgo[].costoFalla` |
| 5 | Parte del más cercano | «MN-07» · «Bomba de fondo» | la primera fila `en-riesgo` por `horas` (3,794 h); `NOMBRE_PARTE['bomba']` (con mayúscula aquí, en minúscula en las filas) | — | `riesgo[0].equipo`, `.parte` |
| 9 | «cruza en 4 h» | «cruza en 4 h» | `fmtHoras(3,794)` | cuando hay horas el más cercano dice «cruza en …», no lleva chip | `riesgo[0].horas` |
| 6 | Fila sin campo | «MN-41» (PERDIÉNDOSE AHORA, extra «1 causa»: ◆ 1 · «electrosumergible» · «aislamiento del motor y del cable» · «desde 3 de sept, 06:40» · 684 · «bbl/d · 1 pozo»); en EN RIESGO, en este orden: MN-07, MN-18, P-201B, MPP-301, MN-27 (todas ▲ 2) | en un solo campo no se escribe « · campo»; los valores de cada fila son los de las capturas 1 y 2 (5B §5.2 y §5.3) | `plural(n,'causa','causas')` | `riesgo[]` |
| 7 | «cruza en» y rango | «41–45 h» (P-201B, «43 h»); MN-07 «4 h»; MN-18 «30 h» · «30–31 h»; MPP-301 «5,2 d» · «4,7–5,7 d»; MN-27 «10,9 d» · «10,2–11,6 d» | P-201B 43,09 h (41,34–44,99 h); los demás, captura 1 filas 22 y 25 y captura 2 | `fmtHoras` y `entre` (captura 1) | `riesgo[].horas`, `.rango` |
| 8 | «si falla» y costo | «≈ 3.365 bbl por falla» (P-201B, «1.671 bbl/d»); MN-07 «607 bbl/d» · «≈ 12.291» · flota; MN-18 «526 bbl/d» · «≈ 10.660» · flota; MPP-301 «1.600 bbl/d» · «≈ 3.434»; MN-27 «510 bbl/d» · «≈ 10.342» · flota | ver captura 1, filas 23 y 26, y captura 2 | — | `riesgo[].bblDia`, `.costoFalla`, `.costoDe` |

### Captura 4 · gerente, La Ceiba (nivel decisión)

![Riesgo · ger · La Ceiba · octubre en curso](../img/ger-riesgo-ceiba.png)

| # | Lo que se ve | En la captura | Cómo se calcula | Texto según el valor | Viene de |
|---|---|---|---|---|---|
| 1 | Perdiéndose ahora | ◆ **11.360** bbl/d | P-201B 11.058,9 + LC-21 300,8 = 11.359,7 | — | `riesgo` |
| 2 | Apoyo | «100,0 % del potencial · 18 pozos parados» | 11.359,7 / 11.359,7: en La Ceiba todos los pozos están cerrados (5B §5.4) | — | `estado` |
| 3 | En riesgo | «En riesgo · 1 equipo» | solo K-101 (servicio) | — | `riesgo` |
| 4 | bbl/d si fallan | **0** bbl/d si fallan | K-101 entra con 0 porque ningún pozo produce | — | `riesgo[].bblDia` |
| 5 | Pie corto | «solo servicios del campo» | costo 0 y la única fila es servicio | ⓘ «son servicios del campo: lo que cuesta su caída depende de cuánto dure» | `riesgo` |
| 6 | El más cercano | «K-101» + «ya fuera» | — | — | — |
| 7 | Extra y filas | «2 causas»: ◆ 1 «P-201B» · «bomba de reinyección» · «desde 2 de oct, 03:52» · **11.059** · «bbl/d · 17 pozos»; ▲ 2 «LC-21» · «sin identificar» · «desde 1 de oct, 18:20» · 301 · «bbl/d · 1 pozo» | dos filas `perdiendo` (5B §5.2); en un campo, sin « · campo» | ídem captura 1 (filas 10-17) | `riesgo[]` |
| 8 | Si falla | ◆ 1 «K-101» · «aire de instrumentos» · «ya fuera» · «todo el campo» | servicio con 0 bbl/d (prioridad 1 = su severidad); en nivel `decision` no lleva «qué hacer» | — | `riesgo[]` |

**Variantes.**
- **Nivel `decision` (gerente).** Sin «qué hacer» (`!directivo && r.accion`, `Riesgo.tsx:136`); sin «flota»; el globo de cada fila «perdiendo» agrega «Del potencial»: P-201B en La Ceiba = 11.058,9 / 11.359,7 = **97,4 %** (en portafolio sería 26,3 %). La Lectura agrega «En puntos de eficiencia: lo perdido sobre el potencial del campo.»
- **Nivel `ingenieria` (jefe, conf).** «flota» bajo el costo y «Costo por falla: {mdtFuente}.» en el globo.
- **Campo vs portafolio.** En portafolio cada equipo lleva « · {campo}»; el potencial es la suma de los cinco campos (42.014,9 bbl/d). Las cifras de cada campo y del portafolio están en 5B §5.5 (Guacamayo: ◆ 1.173 · 17,7 % · 2 pozos parados; 1 equipo · 647 bbl/d · «≈ 16.615 bbl si fallan»; GU-04 · Aislamiento del motor y del cable · cruza en 2,5 d).
- **Período.** No cambia nada (es «ahora»): `#/jefe/riesgo/ceiba/cerrado` muestra lo mismo que `/curso`.

**Estados.**
- Sin nada perdiéndose: cifra «0 bbl/d» sin marca, apoyo «0,0 % del potencial · 0 pozos parados», panel con «nada» y «Todos los pozos produciendo.» (El Palmar y La Zarza hoy: `referencia/riesgo/palmar.json`, `zarza.json`, vacíos.)
- Sin nada en riesgo: «En riesgo · 0 equipos», «0 bbl/d si fallan», pie «nada en riesgo» sin ⓘ, «El más cercano: ninguno», panel con «Ninguna parte avisa.» (`Riesgo.tsx:193`; Mantenimiento y Mi trabajo dicen «Ninguna parte va hacia su límite.»).
- Equipo sin historia: «sin historia» bajo «si falla»; la cabecera agrega « · N sin historia».
- Campo sin la familia en su perfil firmado: sus bombas o ESP no entran (5B §5.3).

**Interacciones.**
- Clic en una fila (las dos listas) → cambia al campo de la fila (`setCampo`) y abre la ficha del equipo (`abrirEquipo(equipo, false)`), también si es una ESP: la ficha la documenta el capítulo de la ficha del equipo (pide `GET /api/vistas/equipos/:campo/:equipo`, `…/historia`, `…/ficha`).
- `#/jefe/riesgo/ceiba/curso/P-201B` abre la misma pantalla con la ficha de P-201B (ruta del auditor).
- «ver N más» / «ver menos»; ⓘ «Costo si fallan» y «qué hacer» (globo; en el papel sale escrito).

**Lectura («¿cómo se lee?»)** (`Riesgo.tsx:172-183`, literal): «**Perdiéndose ahora** es el crudo de los pozos que están apagados en este momento, cada uno cargado al equipo que lo apagó. **En riesgo** son las bombas de la línea y las electrosumergibles que producen pero tienen una parte que avisa: lo que se perdería por día si fallan, y lo que costaría una falla con el tiempo fuera que esos equipos suelen tener. [decisión: En puntos de eficiencia: lo perdido sobre el potencial del campo.] La lista va ordenada por cuándo cruza su límite: primero lo que ya está fuera. Toque o pase el cursor por una fila para ver el porqué y de dónde sale el costo por falla («flota»: el equipo nunca ha fallado y se estimó con el promedio de su flota en el campo). Un servicio del campo no lleva costo por falla: si falla, cierra lo que esté produciendo, y lo que cuesta depende de cuánto dure.»

### La franja «Ahora» (`widgets/riesgo/Ahora.tsx`): la misma lectura en una línea

No es parte de la pantalla Riesgo: es la franja de nivel 1 (ISA-101) que abre **Resumen** (un campo) y **Portafolio** (v2); su captura está en el capítulo de esas pantallas. Sus reglas, del código:

| Bloque | Valor | Marca | Pie |
|---|---|---|---|
| «Perdiéndose ahora · {fechaHora(AHORA)}» («· 2 de oct, 14:00») | $\sum$ `bblDia` de `perdiendo` → `n0` + « bbl/d», o «nada» | ◆ P1 si hay alto impacto perdiéndose; ▲ P2 si solo hay otra causa; nada si 0 | la primera fila `perdiendo` (la de más bbl/d, orden del servidor): «{equipo}[ · campo] · {tipo} · {n0} bbl/d» + « · {n0(alto)} de alto impacto»; sin nada: «todos los pozos produciendo» |
| «En riesgo · {n} {equipo/equipos} de alto impacto» | $\sum$ `bblDia` de `en-riesgo` o «ninguno» | ■ P3 si hay alguna | la que antes cruza (solo filas con `horas`): «primero {equipo}[ · campo] · {parte} en {fmtHoras}»; si ninguna tiene horas: «{equipo}: {motivo}»; sin filas: «ninguna parte va hacia su límite» |
| «Paradas por identificar» | número de preguntas con `pide`, o «ninguna» | ▲ P2 si alguna sigue parada (`!fin`); ■ P3 si todas arrancaron; nada si 0 | «{n} equipo(s) detenido(s): no arrancar hasta identificar el daño» / «arrancaron sin identificar: no conformidad» / «todas las paradas tienen causa» |

Ojo: el rótulo dice «de alto impacto» pero cuenta **todas** las filas `en-riesgo`, también K-101 (aire) y MPP-301 (multifásica); ver «Huecos y dudas». Lee `GET /api/vistas/riesgo` y `GET /api/vistas/paradas/por-identificar`.
