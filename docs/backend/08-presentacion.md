# 8. Reglas de presentación que valen en toda la aplicación

El servidor manda **números sin redondear y sin formato**. El front los formatea con las reglas de este capítulo. Usted no tiene que implementarlas, pero sí conocerlas: explican por qué un valor que usted manda como `6232.4` se ve «6.232», por qué un precio en `null` se ve «falta precio» y no «0 USD», y por qué un `null` del historiador se ve «sin señal» y no «0».

Las reglas específicas de cada cifra (umbrales, frases según el valor) están en los capítulos 5 y 6. Aquí van las que se repiten en todas las pantallas.

## 8.1 Números

Formato colombiano (`es-CO`): **miles con punto, decimal con coma**. Todos los formateadores están en `src/shared/lib/formato.ts`.

| Función | Regla | Ejemplo | Dónde se usa |
|---|---|---|---|
| `n0(v)` | Sin decimales; redondeo al entero más cercano; un valor que redondea a 0 se escribe `0` (nunca `-0`) | `6232.4` → «6.232»; `-0.3` → «0» | barriles, bbl/d, horas enteras, conteos |
| `n1(v)` | Un decimal, siempre | `16.04` → «16,0» | porcentajes, horas cortas, millones de USD |
| `n2(v)` | Dos decimales, siempre | `0.0512` → «0,05» | cifras chicas de ingeniería |
| `n3(v)` | Tres decimales, siempre | `1.008` → «1,008» | **el factor de asignación** (con un punto, «1.008» se leería «mil ocho») |
| `pct(v)` | `n1(v)` + « %» (con espacio) | `44.2` → «44,2 %» | porcentajes con decimal |
| `num(v)` | Hasta 3 decimales, solo los que trae el dato; `null` (sin lectura) → «—» | `0.384` → «0,384» | valores de instrumento (respeta la resolución del instrumento: 0,384 kW/bbl no es 0,4). Un instrumento sin lectura llega con `valor: null` y se muestra «sin señal» (dato inválido, `sinLectura`), no «—» a secas ni 0 |
| `usd(v)` | ≥ 1.000.000 → `n1(v/10⁶)` + «M USD»; ≥ 1.000 → `n0(v/10³)` + «mil USD»; si no, `n0(v)` + «USD» | `299 412` → «299 mil USD»; `1 250 000` → «1,3 M USD» | valor de los barriles diferidos |
| `plural(n, uno, varios)` | Singular solo si `round(n) = 1` | `plural(1,'bomba','bombas')` → «1 bomba» | todo conteo con sustantivo |
| `decimalesDe(serie, valor)` | Los decimales que trae la serie del instrumento, máximo 3 (ISA-101, Tabla 7); los huecos (`null`) no cuentan | serie `[8.8, 9.15]` → 2 | señales de instrumento |

Porcentajes enteros (por ejemplo «89 %», «+44 %», «41 %») salen de `n0(v)` + « %»; uno que no llega a 1 % se escribe «< 1 %» (nunca «0 %» para algo que no es cero). El signo `+` se escribe a mano cuando la cifra es un cambio («+44 % frente a jul a sep»). Las reglas de redondeo de cada porcentaje (entero o con un decimal) están en su ficha del capítulo 5.

> **Una consecuencia para el servidor:** como el front redondea al mostrar, una suma de filas redondeadas puede no dar el total redondeado (1.922 + 1.173 + 792 + 49 + 0 = 3.936 en bbl/d se ve bien; con barriles por equipo puede faltar o sobrar 1). Eso es correcto: **el total sale de sumar los valores sin redondear**, nunca de sumar lo que se ve. El servidor no debe redondear antes de sumar.

## 8.2 Unidades

| Magnitud | Unidad en pantalla | Nota |
|---|---|---|
| Volumen de crudo | `bbl` (barriles a condiciones estándar) | Lo **acumulado** en el período: barriles diferidos, producción del mes, cierre proyectado. |
| Tasa de crudo | `bbl/d` | Lo **promedio por día calendario** del período. «La tasa no se acumula; el volumen sí» (`formato.ts`). |
| Tasa por hora | `bbl/h` | Solo en lo que se está perdiendo con un equipo parado («461 bbl/h»). |
| Dinero | `USD` (precio neto por barril firmado en la configuración) | Ver `usd(v)`. |
| Horas | `h` | «cruza en 43 h», «aguanta 19 h». |
| Instrumentos | la del tag (`psi`, `A`, `Hz`, `°C`, `mm/s`, `%`…) | La declara el instrumento al conectarse. |

El adaptador de país (`src/shared/config/region.ts`, región `colombia`) declara además las condiciones estándar de referencia (**14,65 psia · 60 °F**) y los límites de entrega del crudo (**BS&W ≤ 0,5 %** y **sal ≤ 20 PTB**, Res. MME 40236 de 2022). Un cliente de otro país cambia esa configuración, no el código.

## 8.3 Fechas y horas

Todas en **hora de Colombia** (`America/Bogota`), con la abreviatura de mes fija (`ene`, `feb`, …, `sept`, `oct`, `nov`, `dic`; `src/shared/lib/fecha.ts`), para que el mismo informe diga lo mismo en Safari, Chrome, Firefox y Node.

| Función (`src/entities/reloj.ts`) | Formato | Ejemplo | Uso |
|---|---|---|---|
| `fechaHora(d)` | día, mes corto, hora 24 h | «2 de oct, 03:52» | eventos del PLC (la hora del PLC no se redondea) |
| `fechaCorta(d)` | día y mes corto | «1 de oct» | días |
| `fechaHoraLarga(d)` | completa + «(hora de Colombia)» | «2 de octubre de 2026 a las 14:00 (hora de Colombia)» | documentos y papel |
| (otro año) | se agrega el año; el día sale con dos cifras | «06 de oct de 2025, 10:15» | lo de un año distinto al del «ahora» |

Ojo: con `day: '2-digit'`, el formato es-CO (ICU 78) escribe el día **sin** cero a la izquierda cuando no hay año («2 de oct, 03:52») y **con** cero cuando lo hay («06 de oct de 2025»). Un servidor que genere textos con fecha tiene que reproducir eso, o usar el mismo formateador.

**Horas y plazos** (`textoHoras` del motor, `src/entities/salud.ts`, que usan `fmtHoras` en las pantallas y los textos que arma el servidor: colchones, pronósticos, paradas, horas fuera y el motivo del riesgo; una sola regla en todo el producto):

$$
\text{textoHoras}(h) = \begin{cases} \text{«más de 3 meses»} & h > H_{\max} \\ n_0(h)\ \text{«h»} & h < 48 \\ n_1(h/24)\ \text{«d»} & \text{si no} \end{cases}
\qquad
\text{fmtHoras}(h, \text{precisa}) = \begin{cases} n_1(h)\ \text{«h»} & \text{precisa y } h < 48 \\ \text{textoHoras}(h) & \text{si no} \end{cases}
$$

Cuando la cifra es un plazo que no se puede pasar («0 si vuelve antes de 19 h»: el colchón del tanque), `textoHoras(h, true)` **trunca** en vez de redondear: con un colchón de 19,7 h, redondear diría «antes de 20 h», y una bomba que vuelve a las 19,8 h sí costaría crudo; truncado dice «antes de 19 h», que siempre es cierto. 

con $H_{\max}$ = `HORIZONTE_H` = 90 × 24 = 2.160 h (el horizonte del vigía, `src/entities/salud.ts:53`). Un pronóstico con rango se escribe «en *N* h (*a* h a *b* h)»; si los dos extremos se escriben igual, solo «en *N* h» (`textoPronostico`; los números reales están en el capítulo 5C).

## 8.4 Prioridades: color, forma y número (ISA-101 e ISA-18.2)

La aplicación sigue la filosofía de HMI de alto desempeño: **lo normal es gris; el color solo aparece cuando algo está mal**. La prioridad se codifica tres veces —color, forma y número— para que se lea sin color (daltonismo, sol, impresión en blanco y negro). Componente: `src/shared/ui/Prioridad.tsx`.

| Prioridad | Nombre | Forma | Color (claro / oscuro) | Cuándo |
|---|---|---|---|---|
| **1** | alarma | ◆ rombo con «1» | `#b71c1c` / `#ff8a80` | equipo detenido que cuesta crudo, señal en su límite de alarma, parte que ya falló |
| **2** | atención | ▲ triángulo con «2» | `#bf4000` / `#ffab40` | señal fuera de su banda normal que va a cruzar la alarma; «no arrancar hasta identificar» |
| **3** | aviso | ■ cuadrado con «3» | `#f9a825` / `#ffd54f` (con trazo oscuro) | un indicador fuera de su meta (producción bajo la meta, diferido sobre el máximo); tendencia lenta |
| 0 | normal | • punto gris | `--tinta3` | todo lo demás |
| — | **dato inválido** | ◌ círculo punteado | morado `#8420a3` / `#e1a6ea` | sin señal, o un dato de entrada que no corresponde a nada (un pozo que no existe) |

Reglas:

- **«Fuera de meta» es aviso (P3), no alarma.** El número queda en tinta normal y el cuadrado al lado dice que se salió (`FueraDeMeta`). Así el rojo significa una sola cosa en toda la aplicación.
- **La peor de varias** prioridades es 1 > 2 > 3 > normal (`peorSeveridad` en `src/shared/lib/prioridad.ts`): no es el máximo numérico.
- **Del estado del instrumento a la prioridad** (`DE_ESTADO`): `normal` → 0, `aviso` → 3, `atencion` → 2, `alarma` → 1, `sin señal` → dato inválido (no es una prioridad: es un dato que no se puede creer).
- **El servidor manda la prioridad o el estado**; el front no la reinventa. Donde el front la deduce (el indicador analógico sin estado, 8.6), lo hace solo como respaldo.

## 8.5 Barra contra la meta (`BarraMeta`)

Real contra meta (o contra un máximo): la cifra, una barra **siempre gris** y una raya vertical que marca la meta con su número debajo (`src/shared/ui/BarraMeta.tsx`). Es lo que reemplazó frases como «va 6 % por debajo de la meta».

$$
\text{ancho} = \frac{\min\left(1{,}25,\ \dfrac{v}{m}\right)}{1{,}25}, \qquad \text{raya en } \frac{1}{1{,}25} = 80\,\%
$$

| Símbolo | Significado |
|---|---|
| $v$ | el valor (producción, diferido…) |
| $m$ | la meta o el máximo firmado (> 0) |

- La raya va al 80 % del ancho para que se vea cuánto se pasa, hasta 1,25 veces la meta; de ahí en adelante la barra queda llena y la cifra dice cuánto.
- **Sin meta** ($m$ ausente o 0): ni barra ni raya; solo la cifra y la salvedad («sin meta firmada»).
- El cuadrado P3 lo decide **quien llama** con su propia comparación (la regla de cada cifra está en el capítulo 5): producción **por debajo** de la meta; diferido **por encima** del máximo.
- Ejemplo (resumen del gerente, portafolio, octubre en curso): producción 38.079 bbl/d contra meta 40.200 → $\min(1{,}25;\ 0{,}947)/1{,}25 = 75{,}8\,\%$ del ancho, raya en 80 %, cuadrado P3 porque 38.079 < 40.200. Diferido 3.936 bbl/d contra máximo 2.300 → $\min(1{,}25;\ 1{,}711)/1{,}25 = 100\,\%$ (barra llena), cuadrado P3 porque 3.936 > 2.300.

## 8.6 Indicador analógico de una señal (`Analogico`)

El valor de una señal sobre su banda normal y sus límites de alarma (ISA-101). `src/shared/ui/Analogico.tsx`. La escala se ajusta a los puntos que hay que mostrar:

$$
\begin{aligned}
P &= \{\, v,\ n_{\text{baja}},\ n_{\text{alta}},\ a_{\text{alta}},\ a_{\text{baja}} \,\} \cap \mathbb{R}_{\text{finito}} \\
\ell_0 &= \min P, \quad h_0 = \max P \\
\delta &= 0{,}12 \cdot \left( (h_0 - \ell_0) \ \text{o, si es 0,}\ |h_0| \ \text{o, si es 0,}\ 1 \right) \\
\ell &= \begin{cases} \min(0, \ell_0) & \text{si la banda no tiene piso y } \ell_0 \ge 0 \\ \ell_0 - \delta & \text{si no} \end{cases} \qquad h = h_0 + \delta \\
x(v) &= \frac{\operatorname{clamp}(v, \ell, h) - \ell}{h - \ell} \times 100\,\%
\end{aligned}
$$

| Símbolo | Significado |
|---|---|
| $v$ | valor actual (`null` = sin señal: la escala va punteada en morado y se escribe «sin señal») |
| $n_{\text{baja}}, n_{\text{alta}}$ | banda normal (un lado puede ser infinito: «< 3,9» no tiene piso) |
| $a_{\text{alta}}, a_{\text{baja}}$ | límites de alarma (rayas verticales) |

Prioridad que pinta: la que manda el servidor (`estado`); si no viene, $v \ge a_{\text{alta}}$ o $v \le a_{\text{baja}}$ → 1; fuera de la banda normal → 2; si no, 0. Con detalle, debajo de la barra se escribe «normal 2,0 – 4,0» (o «normal < 3,9», «normal > 85») y «alarma 4,5». Los decimales son los de la señal (`decimalesDe`).

> La regla del contrato es: **fuera de la banda normal = atención (P2); en la alarma = alarma (P1)** (anexo A, «Límite de cada tag»), y el indicador la sigue también cuando no le llega estado.

## 8.7 Listas largas: cinco y «ver N más»

Toda lista o tabla larga muestra **las primeras cinco filas** y un botón «ver N más» (`useVerMas`, `src/shared/ui/listaCorta.ts`):

- **Nunca esconde una fila de prioridad 1**: si una alarma queda después de la quinta, se muestra igual (ISA-18.2: una alarma no se tapa).
- Lo que la pantalla no muestra **sale en el papel** (el informe impreso es la pantalla impresa; una lista cortada en silencio engaña).
- El orden lo manda el servidor o la regla de la pantalla (por barriles, por prioridad, por cuándo cruza); cortar viene después de ordenar.

## 8.8 La ⓘ y los globos

Lo que explica una cifra —de dónde sale, cómo se calcula, su salvedad— va detrás de un ícono ⓘ gris (`Info`) o en un globo al pasar el cursor o al enfocar con el teclado (`Tip`). Reglas:

- El ícono **se ve siempre**: una salvedad se esconde detrás de él, nunca se borra.
- Es gris: no es una alarma.
- **En el papel sale escrito** debajo de la cifra («Cierre proyectado: …»).
- Escape lo cierra; en el teléfono el blanco de toque mide 24 px.

El texto de cada ⓘ está en la ficha de su cifra (capítulos 5 y 6).

## 8.9 Medido y calculado

Es la regla de custodia que más se repite en pantalla: **lo producido se mide; lo no producido se calcula**.

- Las cifras **calculadas** llevan la palabra «calculado» y, cuando hay tolerancia, su rango: «5.729–6.734 bbl · calculado» (la fórmula del rango está en el capítulo 5A).
- Lo **medido** (el fiscal del PMO, la lectura de un instrumento) no lleva rótulo; si falta, se dice («sin fiscal», «sin señal»).
- Un número **aproximado** (por ejemplo, el diferido por bajar la frecuencia de una bomba de fondo, que se estima con $1 - \text{Hz}/\text{Hz}_0$) se suma **aparte** y lo dice el globo.

## 8.10 Huecos: lo que falta se dice, no se rellena

Ningún hueco se pinta como cero. Frases fijas que aparecen en muchas pantallas:

| Situación | Lo que manda el servidor | Lo que se ve |
|---|---|---|
| Campo sin meta firmada | `meta.sinMeta: [campoId]` | «sin meta firmada» (sin barra) |
| Campo sin precio | `sinPrecio: [campoId]` | «falta precio en La Zarza» junto al valor en USD |
| Día sin dato del fiscal | `real: null`, `sinFiscal[].dias` | «sin fiscal» en ese día; el libro no se publica |
| Hueco del historiador | `null` en la serie | la línea se corta; «sin señal» en el valor actual |
| Recurso que no existe | `"datos": null` (HTTP 200) | el hueco de la pantalla, con su motivo |
| Campo que el registro no trae | un id que no está en `GET /api/campos` | «id (campo sin registrar)», nunca otro campo |
| Tanque que no se llena (el respaldo absorbe toda el agua) | `colchon.horas: null` (infinito) | «no cierra pozos» (no «más de 3 meses de colchón») |
| Perfil del campo sin esa familia | el perfil firmado | «Este campo no tiene en su perfil ninguno de los equipos de esta pantalla» |

## 8.11 El papel

Exportar imprime **la pantalla** (no un informe aparte), con:

- **Membrete**: la empresa de la configuración vigente.
- **Pie**: quién lo generó, hasta qué hora llegan los datos, la versión de la configuración, el **folio** (`INF-AAAA-NNNN`) y la **huella** SHA-256 (capítulo 5D), y la nota «lo producido se mide; lo diferido se calcula» (`src/widgets/informe/Membrete.tsx`).
- Lo que en pantalla está detrás de una ⓘ o de «ver N más» sale escrito.
- En el demo, el sello «DATOS DE DEMOSTRACIÓN» en la cabecera y en el papel. En el producto no aparece.
- Impreso sin pasar por Exportar (Ctrl+P), sin folio: el pie dice «SIN FOLIO · no sirve como respaldo» y la cabecera «Impresión sin folio».

## 8.12 Nivel de detalle por rol

El mismo número se ve igual para todos; cambia **qué** se ve (sección 2.8):

| Nivel | Roles | Ve | No ve |
|---|---|---|---|
| `decision` | gerente | cifras del período, contra meta, valor en USD, por equipo, cierre proyectado, qué se pierde ahora | señales, tags, tolerancias, custodia, factor de asignación, vigía, energía por barril |
| `operacion` | supervisor, operador, técnico | qué está parado, qué se pierde ahora, qué hacer, «no arrancar», en qué orden cerrar | acumulados, energía por barril, paneles de vigía y salud por parte (salvo lo que dice qué revisar) |
| `ingenieria` | producción, jefe de mantenimiento, confiabilidad, administrador | todo | — |

La lista exacta de lo que cada nivel ve y no ve en cada pantalla está en el capítulo 6 y la comprueban las aserciones del auditor (`e2e/auditoria/rutas.ts`, `ASERCIONES`).
