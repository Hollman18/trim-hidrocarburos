# 5C.2 · El vigía: tendencia, pronóstico de cruce y horizonte

El vigía responde una pregunta: **¿cuántas horas faltan para que esta variable llegue a su
alarma, y con qué rango?** Solo la responde cuando la tendencia es estadísticamente real; si no,
dice por qué no hay fecha. Todo vive en `src/entities/vigia.ts`; la electrosumergible reutiliza
las mismas dos funciones (`tendencia`, `pronostico`) desde `src/entities/esp.ts`.

Principios (de ISO 14224 y de la práctica de monitoreo por condición):

1. **Solo se anticipa la degradación.** ISO 14224 (Annex B, Table B.2) clasifica los mecanismos
   de falla; con la definición de SINTEF, «degradación» es lo que evoluciona en el tiempo y
   «choque» lo súbito. Solo lo primero da aviso (`proyectable`, `vigia.ts:116`).
2. **Una pendiente que no supera dos errores estándar es ruido**, y proyectarla sería inventar una
   fecha.
3. **Se proyecta contra la alarma del tag** (`limites`), nunca contra la banda normal.
4. **Más allá de 90 días una recta no se sostiene**: se dice «más de 3 meses» / «tendencia lenta».

---

### Tendencia (`tendencia`): mínimos cuadrados con error estándar de la pendiente

**Qué es.** La recta de mínimos cuadrados ordinarios sobre los puntos con lectura de la serie, en
unidades por hora, con el error estándar de la pendiente y el valor ajustado en el último lugar
de la serie.

**Dónde se ve.** No se muestra como número. Se ve como la recta punteada del dibujo `Proyeccion`
(panel VIGÍA del detalle de bomba y dentro de cada parte que avisa). Es la base de todo pronóstico.

**Fórmula.** Con los puntos $(x_k, y_k)$, $k = 1..n$, que tienen lectura:

$$
x_k = i_k \cdot \text{pasoH}, \qquad \bar x = \frac{1}{n}\sum x_k, \qquad \bar y = \frac{1}{n}\sum y_k
$$

$$
S_{xx} = \sum (x_k-\bar x)^2, \qquad S_{xy} = \sum (x_k-\bar x)(y_k-\bar y), \qquad S_{yy} = \sum (y_k-\bar y)^2
$$

$$
b = \frac{S_{xy}}{S_{xx}}, \qquad a = \bar y - b\,\bar x, \qquad \text{RSS} = \sum \left(y_k - (a + b\,x_k)\right)^2
$$

$$
s^2 = \frac{\text{RSS}}{n-2}, \qquad \text{SE}_b = \sqrt{\frac{s^2}{S_{xx}}}, \qquad R^2 = 1 - \frac{\text{RSS}}{S_{yy}}\ \ (\text{si } S_{yy}=0,\ R^2 = 1)
$$

$$
x_{\text{fin}} = (N-1)\cdot \text{pasoH}, \qquad \hat y_{\text{fin}} = a + b\,x_{\text{fin}}
$$

| Símbolo | Significado | Unidad | De dónde sale | Campo de `Tendencia` |
|---|---|---|---|---|
| $i_k$ | posición en la serie del punto $k$ (los huecos no entran, pero **no** corren a los demás) | – | `valores` | – |
| $n$ | puntos con lectura | – | serie | `n` |
| $N$ | largo de la serie con huecos | – | `valores.length` | – |
| $b$ | pendiente | unidad/h | ajuste | `pendiente` |
| $a$ | valor ajustado en `desde` ($x=0$) | unidad | ajuste | `ordenada` |
| $\text{SE}_b$ | error estándar de la pendiente | unidad/h | ajuste | `errorPendiente` |
| $R^2$ | coeficiente de determinación (informativo, no decide nada) | – | ajuste | `r2` |
| $x_{\text{fin}}$ | horas desde `desde` hasta el último lugar de la serie (el «ahora» de la serie) | h | serie | `finH` |
| $\hat y_{\text{fin}}$ | valor **ajustado** en $x_{\text{fin}}$ | unidad | ajuste | `actual` |

**Ejemplo con los datos del demo: PI-2010 (presión de succión de P-201B, Morichal).**
Serie: `desde 2026-09-21T14:00-05:00`, `pasoH 24`, valores
`[14,2 13,9 13,5 13,0 12,6 12,1 11,5 11,0 10,4 9,9 9,3 8,8]`.

1. $x = 0, 24, 48, \dots, 264$; $n = N = 12$; $\bar x = 132$ h; $\bar y = 11{,}6833$ psi.
2. $S_{xx} = 82.368$; $S_{xy} = -1.732{,}8$; $S_{yy} = 36{,}6167$.
3. $b = -1.732{,}8 / 82.368 = -0{,}0210373$ psi/h ($= -0{,}5049$ psi/día).
4. $a = 11{,}6833 - (-0{,}0210373)(132) = 14{,}4603$ psi.
5. $\text{RSS} = 0{,}163240$; $s^2 = 0{,}163240/10 = 0{,}0163240$; $\text{SE}_b = \sqrt{0{,}0163240/82.368} = 0{,}000445178$ psi/h.
6. $R^2 = 0{,}99554$.
7. $x_{\text{fin}} = 264$ h; $\hat y_{\text{fin}} = 14{,}4603 - 0{,}0210373 \cdot 264 = 8{,}9064$ psi (la lectura es 8,8: el vigía parte del valor **ajustado**, no de la última lectura).

**Casos borde.**

| Caso | Resultado |
|---|---|
| Serie mal formada | `tendencia` lanza `Serie del historiador mal formada: …` (nunca ajusta con un paso inventado). |
| Menos de 4 puntos con lectura | `undefined` → «Faltan puntos para ajustar una tendencia». Motor: `tendencia(serieHasta([1,2,3], 24))` → `undefined`. |
| $S_{xx} = 0$ (todos los puntos en el mismo instante; no ocurre con paso > 0 y n ≥ 4) | `undefined`. |
| Serie constante ($S_{yy}=0$) | $b = 0$, $\text{SE}_b = 0$, $R^2 = 1$ → «La variable no va hacia el límite». Ej.: desbalance de MN-07 (2,5 % × 12). (La frecuencia, también constante, no llega aquí: no tiene alarma → «sin límite».) |
| Huecos | Se omiten; $x$ de los demás no cambia. Motor, la misma PI-2010 con los valores 3 y 6 en `null`: $n = 10$, $b = -0{,}020927$ psi/h, cruza en **42,9 h** (41,1–44,9) en vez de 43,1. |

**Quién lo calcula.** Servidor (`tendencia`, `src/entities/vigia.ts:37-65`). La `Tendencia` viaja
dentro de cada `Senal` (`/vistas/bombas` → `senales[].tendencia`, y dentro de `partes[]`).

---

### Pronóstico de cruce (`pronostico`)

**Qué es.** Con la tendencia y el límite de alarma, cuántas horas faltan para cruzarlo y el rango
(≈ 95 % si los residuos son normales).

**Dónde se ve.** Panel VIGÍA del detalle de bomba («Llega a 8 psi en 43 h · 41–45 h»), la placa de
cada bomba (estado de la parte: «cruza en 43 h»), la tarjeta «Próxima en fallar» de la estación de
bombas, la frase de cada parte (5C.3), la columna «Ahora» de la flota de electrosumergibles, el
riesgo (`/vistas/riesgo` → `horas`, `rango`) y la ventana de cada predicción vigente (5C.5).

**Fórmula.** Con $\sigma = +1$ si el límite se cruza subiendo y $\sigma = -1$ si bajando:

$$
b_\sigma = \sigma\, b, \qquad F = \sigma\,(L - \hat y_{\text{fin}})
$$

$$
\text{pronóstico} = \begin{cases}
\text{cruzado} & F \le 0 \\
\text{sin tendencia («no va hacia el límite»)} & F > 0,\ b_\sigma \le 0 \\
\text{sin tendencia («es ruido»)} & F > 0,\ 0 < b_\sigma \le 2\,\text{SE}_b \\
\text{cruza en } h = \dfrac{F}{b_\sigma}\ \text{h, con rango } \left[\dfrac{F}{b_\sigma + 2\,\text{SE}_b},\ \dfrac{F}{b_\sigma - 2\,\text{SE}_b}\right] & F > 0,\ b_\sigma > 2\,\text{SE}_b
\end{cases}
$$

| Símbolo | Significado | Unidad | De dónde sale |
|---|---|---|---|
| $L$ | límite de alarma (`alarma.alta` si sube, `alarma.baja` si baja) | unidad del tag | `limites[tag].alarma` / ajuste del variador |
| $\sigma$ | sentido | – | `plantilla.anuncia.sentido`, o deducido de la alarma (5C.1) |
| $F$ | lo que falta para la alarma, desde el valor ajustado | unidad | – |
| $h$ | horas para cruzar, contadas **desde el último lugar de la serie** | h | `pronostico.horas` |
| rango | `[rapido, lento]` | h | `pronostico.rango` |

Nótese el orden: primero se mira si **ya cruzó** (con el valor ajustado), después la pendiente.

**Ejemplo con los datos del demo.**

*PI-2010, P-201B, Morichal* (límite bajo 8 psi, $\sigma = -1$):
$F = -(8 - 8{,}9064) = 0{,}9064$ psi; $b_\sigma = 0{,}0210373$; $2\,\text{SE}_b = 0{,}00089036$;
$b_\sigma / \text{SE}_b = 47{,}3 > 2$ → cruza.
$h = 0{,}9064 / 0{,}0210373 = 43{,}086$ h; rango $= [0{,}9064/0{,}0219277;\ 0{,}9064/0{,}0201470] = [41{,}34;\ 44{,}99]$ h.
**En pantalla: «en 43 h · 41–45 h»** (corto: VIGÍA «Llega a 8 psi en 43 h · 41–45 h», placa y estación de bombas). La forma larga de `textoPronostico`, «en 43 h (41 h a 45 h)», es la que usan las frases de parte (`fraseParte`); para PI-2010 ninguna pantalla del demo la muestra (Riesgo escribe «en 43 h (41–45 h)» y el motivo del servidor «…llega a su alarma en 43 h»).

*Corriente de la electrosumergible de MN-07, Morichal* (alarma alta 100 A, $\sigma = +1$): serie
`[86,1 86,6 87,9 89,2 90,8 91,8 93,0 94,6 96,3 97,6 98,2 99,8]`; $b = 0{,}0540647$ A/h
(1,30 A/día); $\text{SE}_b = 0{,}00111733$; $\hat y_{\text{fin}} = 99{,}7949$ A; $F = 0{,}2051$ A;
$h = 3{,}794$ h; rango $[3{,}644;\ 3{,}958]$. **En pantalla: «en 4 h»** (los dos extremos del rango
se escriben «4 h», así que no se repite el rango).

*PDT-3011, caída de presión del filtro de MPP-301, Morichal* (alarma 12 psi): $b = 0{,}0217512$
psi/h, $\text{SE}_b = 0{,}00105289$, $\hat y_{\text{fin}} = 9{,}2962$, $h = 124{,}31$ h, rango
$[113{,}34;\ 137{,}63]$ → **«en 5,2 d · 4,7–5,7 d»**.

*VT-3013, vibración de MPP-301* (alarma 5,5 mm/s): $h = 248{,}17$ h, rango $[234{,}56;\ 263{,}46]$ →
**«en 10,3 d · 9,8–11,0 d»**.

*TI-2011, cámara de empuje de P-201B, Morichal* (alarma 85 °C): $b = 0{,}00976$ °C/h,
$b/\text{SE}_b = 3{,}5$ → cruza en $h = 4.145$ h (2.638–9.668) = 173 días > 90 días →
**«en más de 3 meses»** y la parte dice «tendencia lenta».

*VI-2011, vibración de P-201B, Morichal* (alarma 3,9 mm/s): $b = 0{,}000248$ mm/s/h,
$\text{SE}_b = 0{,}000231$, $b/\text{SE}_b = 1{,}07 \le 2$ → **sin tendencia**: «La pendiente no supera
dos errores estándar: es ruido». En el panel VIGÍA: «Límite **3,9 mm/s** · sin fecha» con ⓘ.

*LT-2012, nivel del tanque de succión de P-201B, Morichal* (alarma baja 15 %): la pendiente es
positiva (+0,049 %/día) → «La variable no va hacia el límite».

**Casos borde y orden de las reglas.** Para cada variable de la plantilla de la bomba
(`senalesDe`, `src/entities/vigia.ts:122-173`), en este orden:

| # | Condición | Pronóstico | Texto (`motivo`) |
|---|---|---|---|
| 0 | El tag no existe o su `valor` es un **texto** (interruptor, «sin fuga»: lo lee la salud como discreta) | la variable **no entra** a `senales` | – |
| 1 | `valor === null` (sin lectura) **o** `estado === 'sin señal'` | `sin-tendencia`; la señal sale con `valor: null` y estado `sin señal` | «Sin señal en línea: \<origen\>» |
| 2 | El equipo está `detenido` (`eq.marcha`) | `sin-tendencia` | «La bomba está detenida: no hay tendencia que proyectar» |
| 3 | El tag no tiene alarma en ese sentido | `sin-limite` | (pantalla: «sin límite declarado») |
| 4 | Sin tendencia (n < 4) | `sin-tendencia` | «Faltan puntos para ajustar una tendencia» |
| 5 | Velocidad de una **multifásica** con presión diferencial inestable | `no-atribuible` | «La presión diferencial cambió más de 5 %: la velocidad pudo subir por proceso, no por desgaste» |
| 6 | En otro caso | `pronostico(t, L, σ)` | – |

Regla 1 desde el 8-oct (`vigia.ts:144-155`): antes un `valor: null` caía en la regla 0 y la variable desaparecía del vigía (la salud la tomaba como discreta); ahora entra como señal sin lectura. Mundo de prueba (`verificar-libro` §18): VI-2011 de la P-201B de La Ceiba con `valor: null` → «Sin señal en línea: PLC · 47 s» y, en la salud, en `sinSenal` del sello mecánico.

Regla 5 (API 676 B.2.1.2: a presión diferencial constante, más velocidad es menos eficiencia
volumétrica por desgaste de tornillos y camisa). Si las series de descarga ($p_d$) y succión
($p_s$) están **alineadas** (mismo `desde`, mismo `pasoH`, mismo largo), se calcula
$\Delta p_i = p_{d,i} - p_{s,i}$ (un hueco en cualquiera es hueco) y:

$$
\overline{\Delta p} = \frac{1}{m}\sum \Delta p_i, \qquad \text{estable} \iff \forall i:\ \left|\Delta p_i - \overline{\Delta p}\right| \le 0{,}05\,\overline{\Delta p}
$$

Si no están alineadas, o no hay $\Delta p$, **no es estable** y la velocidad no se proyecta. En
MPP-301 (Morichal) $\Delta p$ va de 297 a 302 psi (media ≈ 300): estable, y la velocidad SI-3016
se proyecta: **«en 17,5 d · 16,6–18,5 d»** contra 1.650 rpm.

En la electrosumergible (`senalesEsp`, `src/entities/esp.ts:105-135`): pozo parado →
«El pozo está parado: no hay tendencia que proyectar»; sin alarma en ese sentido → `sin-limite`
(la frecuencia nunca tiene alarma); sin tendencia → «Faltan puntos…»; si no, `pronostico`.

**Quién lo calcula.** Servidor (`pronostico`, `vigia.ts:76-87`). Viaja en cada `Senal.pronostico`
(`/vistas/bombas`, `/vistas/pozos/:campo/:pozo`, y anidado en `partes[]`), en
`veredicto.primera` y `veredicto.cruzadas` de `/vistas/bombas`, y como `horas`/`rango` en
`/vistas/riesgo`. Tipo `Pronostico` (`vigia.ts:67-72`):
`{ tipo: 'cruza', horas, rango } | { tipo: 'cruzado' } | { tipo: 'sin-tendencia', motivo } | { tipo: 'sin-limite' } | { tipo: 'no-atribuible', motivo }`.

**Referencia.** `src/entities/vigia.ts`; CONTRATO.md «Vigía». `scripts/verificar-libro.mjs:817-831`
(regla `proyectable` y paso de la serie). Casos de `referencia/` que traen pronósticos:
`referencia/salud/bombas-<campo>-2026-09.json` (`/api/vistas/bombas`, septiembre),
`referencia/riesgo/<campo>.json` (`/api/vistas/riesgo`: `horas`, `rango`, `motivo`) y
`referencia/salud/pozos-<campo>-2026-09.json` (`/api/vistas/pozos`, `salud`). Se comprueban con
`node scripts/referencia.mjs comprobar`.

---

### ¿Qué variables se proyectan? (`proyectable` y el mecanismo)

**Qué es.** La regla única de qué se puede anticipar: una señal se proyecta si su variable **no**
anuncia un mecanismo de familia «choque». Una variable sin mecanismo declarado (una presión de
barrera, una corriente de bomba de superficie) se proyecta contra su alarma si la tiene.

**Fórmula.** $\text{proyectable}(s) \iff s.\text{mecanismo}.\text{familia} \ne \text{choque}$ (o no tiene mecanismo).

**Mecanismos que anuncian las plantillas del demo** (todos de degradación):

| Familia | Variable | Mecanismo ISO 14224 B.2 | Sentido |
|---|---|---|---|
| Inyección (P-201B) | Presión de succión | 2.1 Cavitación | baja |
| Inyección | Nivel del tanque de succión | 2.1 Cavitación | baja |
| Inyección | Energía por barril (no instrumentada en esta fase) | 2.4 Desgaste | sube |
| Inyección | Temperatura de la cámara de empuje | 2.4 Desgaste | sube |
| Inyección | Vibración | 1.2 Vibración | sube |
| Inyección | Fuga del sello (interruptor, no se proyecta: no es numérica) | 1.1 Fuga | sube |
| Multifásica (MPP-301) | Caída de presión del filtro | 5.1 Bloqueo o taponamiento | sube |
| Multifásica | Temperatura de descarga | 2.7 Sobrecalentamiento | sube |
| Multifásica | Temperatura de rodamiento | 2.4 Desgaste | sube |
| Multifásica | Vibración | 1.2 Vibración | sube |
| Multifásica | Velocidad | 2.3 Erosión | sube |
| Multifásica | Nivel del depósito de barrera | 1.1 Fuga | baja |
| Electrosumergible | Corriente del motor | 1.6 Agarrotamiento | sube |
| Electrosumergible | Presión de entrada | 5.1 Bloqueo o taponamiento | baja |
| Electrosumergible | Temperatura del motor | 2.7 Sobrecalentamiento | sube |
| Electrosumergible | Desbalance de corriente entre fases | 4.5 Falla de tierra o aislamiento (clasificada como degradación) | sube |

El 4.5 se clasifica como degradación a propósito: el aislamiento pierde resistencia de a poco y el
desbalance crece antes del disparo a tierra (`src/entities/iso14224.ts:101-105`).

**Dónde se aplica.** En la salud por parte (solo las tendencias proyectables cuentan para
`avisa`, `salud.ts:124`) y en el veredicto de la bomba (`diferido.ts:411-413`). `senalesDe`
calcula el pronóstico de todas; el filtro se aplica al usarlo.

**Casos borde.** Con la tabla actual ninguna variable de plantilla anuncia un mecanismo de choque,
así que en el demo `proyectable` siempre es verdadero. La tabla B.2 está **transcrita y pendiente
de cotejo** con la norma comprada (`MECANISMOS_ESTADO`, sale en el ⓘ «mecanismos» del detalle).

---

### Horizonte de 90 días y «tendencia lenta»

**Qué es.** El límite de lo que se afirma con una recta: `HORIZONTE_H = 90 × 24 = 2.160 h`
(`src/entities/salud.ts:53`).

**Fórmula.**

$$
\text{texto}(h) = \begin{cases}
\text{«más de 3 meses»} & h > 2.160 \\
\text{round}(h)\ \text{«h»} & h < 48 \\
(h/24)\ \text{con un decimal, «d»} & 48 \le h \le 2.160
\end{cases}
$$

(`fmtHoras`, `src/widgets/bombas/comun.ts:15-17`; con `precisa = true`, para paradas, las horas
por debajo de 48 h llevan un decimal: «47,1 h».) Desde el 8-oct es **una sola regla con el motor**:
`fmtHoras(h)` sin `precisa` es `textoHoras(h)` de `src/entities/salud.ts:166-171`, la misma que escribe
el `motivo` del riesgo (5C.3), así el servidor y la pantalla dicen «10,9 d» para la misma cifra.
`textoHoras(h, true)` (hacia abajo) trunca a lo que escribe para un plazo que no se puede pasar:
19,05 h → «19 h», 18,6 h → «18 h», 55,2 h → «2,3 d» («0 si vuelve antes de 19 h», 5B.5).
`verificar-libro` §18 compara las dos en 13 valores (47,6 h → «48 h» en las dos: el corte se mira
antes de redondear) y falla a propósito si alguien cambia una sin la otra.

**Qué texto se muestra.**

| Función | Uso | `cruza` dentro del horizonte | `cruza` > 90 d | `cruzado` | `sin-limite` | `sin-tendencia` / `no-atribuible` |
|---|---|---|---|---|---|---|
| `textoPronostico` | frases largas | «en 43 h (41 h a 45 h)»; si los dos extremos se escriben igual, «en 4 h» | «en más de 3 meses» | «ya cruzó el límite» | «sin límite declarado» | el `motivo` |
| `pronosticoCorto` | etiquetas | «en 43 h · 41–45 h»; «en 5,2 d · 4,7–5,7 d»; «en 4 h» | igual que arriba | igual | igual | igual |
| `rangoCorto` | el rango | «41–45 h» si las dos cotas tienen la misma unidad; si no, «40 h–2,1 d»; vacío si se escriben igual | – | – | – | – |

En la salud por parte, una variable que cruza en más de 90 días **no hace avisar** a la parte: la
parte queda `estable` con `lenta` y dice «tendencia lenta» (placa) o «temperatura de la cámara de
empuje · más de 3 meses» (frase corta) / «… va hacia su límite, pero en más de 3 meses» (frase
larga). Ejemplo real: TI-2011 de P-201B en Morichal (4.145 h).

**Casos borde.** $h \le 2.160$ con rango lento > 2.160: la cifra se da y el extremo lento se escribe
«más de 3 meses» (motor: `textoPronostico({ cruza, horas: 2136, rango: [1920, 2500] })` →
«en 89,0 d (80,0 d a más de 3 meses)»). Exactamente 48 h → «2,0 d», pero 47,6 h → «48 h» (el corte
es `h < 48` antes de redondear; es cosmético).

---

### El dibujo de la tendencia (`Proyeccion`)

**Qué es.** Lo medido, la recta prolongada hasta el cruce y el rango sobre el límite, con su propio
eje de tiempo. Gris: una proyección no es una alarma.

**Dónde se ve.** Panel VIGÍA (cada señal que no es `sin-tendencia`) y arriba de cada parte que
avisa con `primera` (`BloqueParte`). Solo ingeniería.

**Reglas** (`src/widgets/bombas/Proyeccion.tsx`):
- No se dibuja sin tendencia, sin serie, con menos de 2 lecturas o sin última lectura.
- Eje: «hace N d» al inicio ($N = x_{\text{fin}}/24$ con 1 decimal: «hace 11 d»), «hoy» en $x_{\text{fin}}$,
  y «+M d» al final; si el cruce queda a menos de 46 px de «hoy», se escribe junto: «hoy · +0,2 d».
- Se dibuja hasta $\min(\text{rango}_{\text{lento}},\ 45\ \text{d})$: más allá la recta no se sostiene.
- El rótulo del cruce va **en días con un decimal**: «en 1,8 d» para PI-2010 (43,1 h), «en 0,2 d»
  para MN-07; solo si $h \le 45$ d.
- `aria-label`: «Tendencia de Presión de succión: cruza el límite en 1,8 días».

**Ejemplo.** PI-2010: «hace 11 d» · «hoy» · «+1,9 d» (44,99 h); raya «límite 8 psi»; barra del
rango 41,3–45,0 h; rótulo «en 1,8 d».

---

### Panel VIGÍA (detalle de una bomba, ingeniería)

**Dónde se ve.** `#/conf/bombas/morichal/curso` → abrir la placa (rol confiabilidad, jefe de
mantenimiento, ingeniería). No sale en operación ni en decisión (el auditor exige que «VIGÍA» no
aparezca en decisión: `e2e/auditoria/rutas.ts`, `NO_DECISION`).

**Reglas** (`src/widgets/bombas/Detalle.tsx:67-70, 202-230`):
- Lista las señales **con mecanismo**, ordenadas por horas de cruce (las que no cruzan, al final,
  en el orden de la plantilla). Encabezado: «N señales».
- Cada fila: nombre, «ISO 14224 2.1 · Cavitación», y
  - `cruza`: «Llega a **8 psi** en 43 h · 41–45 h» (más de 90 d: «Llega a **85 °C** en más de 3 meses»);
  - otro: «Límite **3,9 mm/s** · sin fecha» + ⓘ «Sin fecha» con el motivo; `cruzado`: «… · ya cruzó el límite»;
    `sin-limite`: «sin límite declarado».
  - ⓘ «anuncia» con el porqué de la plantilla.
- Sin señales con mecanismo: «Ninguna variable instrumentada anuncia degradación.»

**Ejemplo con los datos del demo (P-201B, Morichal, «4 señales»).**

| Orden | Señal | Mecanismo | Texto |
|---|---|---|---|
| 1 | Presión de succión (PI-2010) | 2.1 Cavitación | Llega a **8 psi** en 43 h · 41–45 h |
| 2 | Temperatura de la cámara de empuje (TI-2011) | 2.4 Desgaste | Llega a **85 °C** en más de 3 meses |
| 3 | Nivel del tanque de succión (LT-2012) | 2.1 Cavitación | Límite **15 %** · sin fecha (ⓘ «La variable no va hacia el límite») |
| 4 | Vibración (VI-2011) | 1.2 Vibración | Límite **3,9 mm/s** · sin fecha (ⓘ «… es ruido») |

MPP-301 (Morichal, «6 señales»): PDT-3011 «Llega a **12 psi** en 5,2 d · 4,7–5,7 d»; VT-3013
«**5,5 mm/s** en 10,3 d · 9,8–11,0 d»; SI-3016 «**1.650 rpm** en 17,5 d · 16,6–18,5 d»; TE-3013
«**85 °C** en 26,8 d · 24,7–29,3 d»; LT-3017 «**50 %** en 33,0 d · 30,4–36,1 d»; TE-3012
«**90 °C** en más de 3 meses».

La Ceiba (P-201B detenida): todas «sin fecha» con ⓘ «La bomba está detenida: no hay tendencia que
proyectar»; no se dibuja ninguna proyección.

**Quién lo calcula.** Servidor (pronósticos); el front solo ordena y formatea.

---

### «Próxima en fallar» (estación de bombas)

**Qué es.** De las bombas **en marcha** (sin parada abierta), la parte en estado `fuera` o `avisa`
que tiene `primera` (una señal que cruza) con menos horas.

**Dónde se ve.** Cabecera de la estación de bombas (`src/pages/Bombas.tsx:35-39`), todos los
niveles.

**Fórmula.**

$$
\text{próxima} = \arg\min_{(b,p)\ :\ b\ \text{sin parada abierta},\ p.\text{estado} \in \{\text{fuera},\text{avisa}\},\ p.\text{primera}} \; p.\text{primera}.\text{horas}
$$

**Ejemplo con los datos del demo.** Morichal, período en curso: P-201B · Succión y filtro de
entrada (43,09 h) gana a MPP-301 · Filtro de entrada (124,3 h). Pantalla:
**«P-201B · Succión y filtro de entrada»** y debajo, ingeniería/operación:
«presión de succión · en 43 h · 41–45 h»; decisión: «Morichal · en 43 h». En el portafolio se
antepone el campo. Sin ninguna: «ninguna».

**Casos borde.** Una parte `fuera` sin `primera` (su variable ya está en alarma o no cruza) no
compite. Una parte que avisa solo porque lo que la daña está fuera de banda (`causaActiva`) sin
`primera`, tampoco.
