# 6 · Entrega de turno

**Dónde.** `#/<rol>/turno/<campo|portafolio>/<período>` (`pages/Turno.tsx`). El período de la cabecera no aplica: el turno es siempre **las 12 horas que terminan en AHORA** (`TURNO_H = 12`, rotación 7×7 sobre una operación 24/7). En el demo: del 2-oct 02:00 al 2-oct 14:00.

La pantalla no calcula nada nuevo en el servidor: combina `GET /api/vistas/riesgo` (cap. 5), `GET /api/vistas/diferidos?desde=AHORA−12h&hasta=AHORA` (el libro de las últimas 12 h), `GET /api/vistas/paradas/por-identificar` (cap. 3) y `GET /api/mensajes`. Las cuentas de esta sección las hace **el front** sobre esas respuestas; el backend tiene que devolver los insumos idénticos.

---

### Se pierden en el turno que entra

**Qué es.** Lo que se está perdiendo ahora, sostenido las 12 horas del turno que entra, si nada cambia.

**Dónde se ve.** Primera cifra de la cabecera, 36 px. En el demo solo la abren el supervisor y el operador, que tienen La Ceiba y no el portafolio (`#/sup/turno/ceiba/curso`): «**5.680** bbl se pierden · turno que entra si nada cambia»; globo «Turno que entra: Lo que se pierde ahora, sostenido las 12 horas del turno.» con «Perdiéndose ahora 11.360 bbl/d» y «Turno 12 h» (`Turno.tsx:201-206`).

**Fórmula.**

$$
\text{turno} = \left(\sum_{\text{filas perdiendo}} \text{bblDia}\right) \cdot \frac{12}{24}
$$

**Ejemplo con los datos del demo.** Portafolio: 13.217,1 × 0,5 = 6.608,6 → «**6.609** bbl». La Ceiba: 11.359,7 × 0,5 → «5.680». Morichal: «342». Guacamayo: «587».

**Casos borde.** Sin nada parado: «0». No descuenta que un pozo vuelva a producir dentro del turno (es una proyección plana, y se dice «si nada cambia»).

---

### Perdiéndose ahora · pozos parados

**Qué es.** Lo mismo de Riesgo (5.2). Segunda cifra: ◆ (si alguna fila es de alto impacto; ▲ si todas son de otro tipo) + `n0(Σ bblDia)` «bbl/d», «perdiéndose ahora», `plural(Σ pozos, 'pozo parado', 'pozos parados')`.

**Ejemplo.** En pantalla, La Ceiba: ◆ **11.360** bbl/d «perdiéndose ahora» · «18 pozos parados». Calculado para el portafolio (ningún rol con Turno lo ve): ◆ 13.217 bbl/d · 21 pozos parados.

**Panel «PASANDO AHORA»** (extra: `plural(n, 'causa', 'causas')` o «nada parado»): una fila por causa, igual a la de Riesgo, con el globo «Pozos parados · Perdiéndose · **En el turno** <n0(bblDia × 12/24)> bbl · Desde · Pozos cerrados desde». Ejemplo P-201B La Ceiba: «En el turno 5.529 bbl», «Desde 2 de oct, 03:52», «Pozos cerrados desde 2 de oct, 08:07». Sin filas: «Todos los pozos produciendo.»

---

### Por identificar

**Qué es.** Las preguntas de toda la historia que **piden** respuesta (`pide`), incluidas las que ya arrancaron sin respuesta (no conformidades).

**Fórmula.** La cuenta única (`contarPorIdentificar`, cap. 3): cifra = `porIdentificar` (las que tienen `pide`); ▲ P2 si `porIdentificar − arrancaronSinIdentificar > 0` (alguna sigue sin arrancar); apoyo = `ApoyoPorIdentificar`: «<sin arrancar> sin arrancar · ■ <N> arrancó/arrancaron sin identificar» (un tramo en 0 no se escribe) (`Turno.tsx:42-44`, `:215-217`). La lista del panel son las mismas preguntas con `pide`; su extra es `porIdentificar`.

**Ejemplo con los datos del demo.** Portafolio: **4** por identificar ▲ · «2 sin arrancar · ■ 2 arrancaron sin identificar». La Ceiba (lo que abren supervisor y operador): **3** ▲ · «2 sin arrancar · ■ 1 arrancó sin identificar». Filas (`Turno.tsx:121-129`):

| Marca | Equipo · fecha | Chip |
|---|---|---|
| ▲ | P-201B · La Ceiba · 2 de oct, 03:52 | **no arrancar** (fuerte) |
| ■ | LC-08 · La Ceiba · 1 de oct, 22:15 | arrancó sin identificar |
| ▲ | LC-21 · La Ceiba · 1 de oct, 18:20 | **no arrancar** |
| ■ | P-201B · Morichal · 24 de sept, 16:51 | arrancó sin identificar |

(El orden es el de la API: primero las que piden, de la más reciente a la más vieja.) «No arrancar» es una instrucción de seguridad: esas filas nunca quedan detrás de «ver más» (prioridad 1 en `useVerMas`). Con el permiso `causa`, botón «Identificar antes de entregar →»; sin él, «Lo responde quien estuvo en el equipo.». Sin preguntas: «Todas las paradas tienen causa.»

Nota: Palmar PA-04 es no conforme (respuesta tardía) pero **no** sale aquí porque `pide` es falso (ya tiene respuesta). Sale en la cabecera de Causa (cap. 3).

---

### Diferidos · 12 h

**Qué es.** El diferido del libro en la ventana del turno (todo lo que se dejó de producir en esas 12 h, incluidos los eventos que venían de antes, recortados a la ventana).

**Fórmula.** `libro(campos, AHORA − 12 h, AHORA).diferido` = $\sum$ bbl de los tramos recortados a $[\text{AHORA} - 12\,\text{h}, \text{AHORA})$ (capítulo del libro).

**Ejemplo con los datos del demo.** Portafolio: **3.661** bbl (3.661,3). Se reparte así: P-201B La Ceiba 2.570 (sus 17 pozos desde las 08:07–08:52), MN-25 12 (disparo de 37 min), y las 12 h de MN-41 (≈ 342), GU-07 (≈ 294), GU-09 (≈ 293) y LC-21 (≈ 150), que venían de antes. La Ceiba sola: 2.721; Morichal: 354; Guacamayo: 587.

**Casos borde.** Es un libro **en curso**: el factor del mes es el último medido y los días no tienen cierre publicado (motivo `en-curso`). Si un campo no tiene dato fiscal hoy, sus tramos igual suman (el diferido sale de pruebas × factor, no del fiscal).

---

### Paradas nuevas (agrupadas por evento)

**Qué es.** Los eventos de pozo que **empezaron** en el turno (lo que venía de antes sigue en «pasando ahora» y no se cuenta otra vez), agrupados por su causa: un evento con muchos pozos (paró la bomba) es **una sola línea**.

**Fórmula** (`Turno.tsx:77-86`):

$$
\text{nuevos} = \{ t \in \text{tramos del libro de 12 h} : t.\text{evento.inicio} \ge \text{AHORA} - 12\,\text{h} \}
\qquad
\text{clave} = t.\text{causa.evento} \lor t.\text{evento.id}
$$

Por grupo: `bbl` = $\sum$ bbl; horas de inicio mínima y máxima; «sigue» si algún tramo está abierto. Extra del panel: «12 h · <plural(grupos, 'causa', 'causas')>».

**Qué texto se muestra según el valor** (`Turno.tsx:153-178`):
- Grupo de más de un pozo: «**N pozos cerrados** por **<equipo>** · HH:MM–HH:MM» + chip con cómo se identificó; a la derecha «<n0> bbl» (+ « · sigue»).
- Un solo pozo: «**HH:MM** · **<pozo>**» (+ « · por <equipo>» si lo cerró otro) + chip.
- Chip: «parte por identificar» si lo cerró otro equipo y `como = 'ninguno'`; si no, `COMO[como]`.
- Globo: «Lo cerró <equipo>» (si es otro), «Barriles», «Cómo se identificó»; pista = `causa.texto`.
- La hora es solo HH:MM (todo es de las últimas 12 h).

**Ejemplo con los datos del demo** (portafolio, 2 causas):

| Línea | Chip | Barriles |
|---|---|---|
| **17 pozos cerrados** por **P-201B** · La Ceiba · 08:07–08:52 | parte por identificar | 2.570 bbl · sigue |
| **08:13** · **MN-25** · Morichal (OL, 08:13 → 08:50, su ESP disparó por sobrecarga) | por señal | 12 bbl |

Sin grupos: «Ningún pozo paró.»

---

### Para vigilar

**Qué es.** Las filas «en riesgo» (5.3), ordenadas como en Riesgo (lo ya fuera primero, luego por horas).

**Prioridad en el turno** (`Turno.tsx:88`): si la parte cruza su alarma **dentro del turno** (`horas < 12`), la marca sube al menos a P2:

$$
\text{prioridad}_{\text{turno}} = \begin{cases} \min(\text{prioridad} \lor 3,\ 2) & \text{si } horas < 12 \\ \text{prioridad} & \text{si no} \end{cases}
$$

**Ejemplo.** MN-07 (cruza en 3,8 h) → ▲ P2 (ya era 2). K-101 → ◆ «ya fuera». Filas: equipo (+ campo), parte + chip de estado (o chip del tipo si no hay parte), a la derecha `fmtHoras(horas)` o «ya fuera» y `n0(bblDia)` «bbl/d»; globo «Parte · Cruza su límite · Si para» (los bbl/d se llaman «si para»; «si falla hoy» es solo el costo en bbl de Riesgo). Extra: «7 equipos». Sin filas: «Ninguna parte va hacia su límite.»

---

### WhatsApp del turno

Los mensajes con `hora ≥ AHORA − 12 h`, agrupados en hilos por evento (o por orden, o por regla y equipo). Es del capítulo de WhatsApp; aquí solo se nota que el estado del hilo sale de la pregunta del evento: «respondió <por> (por WhatsApp): «<texto>»» o chip «sin respuesta».

**Referencia.** `src/pages/Turno.tsx:1-284`.
