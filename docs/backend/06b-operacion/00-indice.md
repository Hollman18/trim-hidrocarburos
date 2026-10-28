# 6B · Operación: bombas, electrosumergibles, pozos, fichas de equipo y turno

> **v3 (27 y 28-oct-2026): las pantallas que hay hoy están en [06-pantallas-v3.md](../06-pantallas-v3.md).** Este capítulo conserva las fórmulas, los textos según su valor y los endpoints; los archivos de pantallas que la v3 borró o cambió dicen **RETIRADO** o **CAMBIADO** arriba, con su reemplazo. **Las capturas de este capítulo son de la v2 (25-oct-2026) y se conservan como histórico:** sus marcas apuntan a textos que la v3 cambió o borró, así que `npm run pantallazos:doc` ya no las regenera (cada una falla y no se guarda: ninguna imagen queda con un número que apunta a nada nuevo). Las capturas vigentes son las de `img/v3-*` y `img/cap1-*`.


Capítulo 6, parte B: las pantallas con que la operación (supervisor, operador, técnico) y la ingeniería (producción, jefe de mantenimiento, confiabilidad) miran los **equipos de alto impacto** —las bombas de reinyección y multifásicas, las electrosumergibles— y los **pozos** que dependen de ellos, la **ficha de un equipo** y la **entrega de turno**. Cada pantalla trae su captura anotada y una tabla: por cada número de la captura, qué se ve, el valor exacto, cómo se calcula (remitiendo a la ficha del capítulo 5), qué texto sale según el valor (con `archivo:línea`) y de qué endpoint y campo viene (capítulo 7).

Lo que trajeron el modelo choke y el árbol de causas (los tramos, «LA TUBERÍA DEL AGUA, HOY», «SIN INSTRUMENTO», «Si falla hoy», «Qué limita hoy», «CIERRE DE HOY») se explica en el capítulo 6D, `06d-choke-pantallas/`; aquí cada pantalla lo nombra en una fila corta y remite a su sección (6D.2 Planta y Agua, 6D.5 Riesgo, 6D.6 Turno, 6D.7 Identificar).

Todos los valores son del demo con `AHORA = 2026-10-02T14:00-05:00`, período «Octubre, en curso» (1-oct 00:00 → 2-oct 14:00, hora de Colombia) salvo que se diga otro. Los números que no se leen en una captura se obtuvieron corriendo el motor (`pedirBombas`, `pedirPozos`, `pedirPozo`, `pedirFlotaEsp`, `pedirFichaEquipo`, `pedirHistoriaEquipo`, `riesgoAhora`, `libro` sobre `INSUMOS_DEMO`).

| Archivo | Sección | Capturas |
|---|---|---|
| [01-bombas.md](01-bombas.md) | 6B.1 · Bombas: la estación, la placa de cada bomba y su detalle | `sup-bombas-ceiba`, `conf-bombas-morichal`, `conf-bombas-portafolio`, `sup-bombas-detalle-ceiba`, `conf-bombas-detalle-morichal`, `jefe-bombas-detalle-ceiba` |
| [02-electrosumergibles.md](02-electrosumergibles.md) | 6B.2 · Electrosumergibles: la flota, la fila abierta y la ficha de MN-07 | `jefe-esp-morichal`, `conf-esp-morichal-fila`, `jefe-esp-ficha-MN-07`, `prod-esp-portafolio`, `sup-esp-ceiba`, `prod-esp-palmar` |
| [03-pozos.md](03-pozos.md) | 6B.3 · Pozos: la tabla y el detalle de un pozo | `prod-pozos-ceiba`, `sup-pozos-ceiba`, `prod-pozos-ficha-LC-21`, `prod-pozos-ficha-LC-16` |
| [04-ficha-equipo.md](04-ficha-equipo.md) | 6B.4 · La ficha de un equipo (operación, ingeniería, ejecutiva, servicio y ficha mínima) | `sup-bombas-ficha-P-201B`, `jefe-riesgo-ficha-P-201B`, `ger-resumen-ficha-P-201B`, `conf-confiabilidad-ficha-MPP-301`, `jefe-equipo-ficha-K-101`, `jefe-bombas-ficha-P-201A`, `ger-diferidos-ficha-SE-2` |
| [05-turno.md](05-turno.md) | 6B.5 · Entrega de turno | `sup-turno-ceiba`, `oper-turno-ceiba` |
| [06-telefono.md](06-telefono.md) | 6B.6 · En el teléfono (390 px) | `sup-bombas-telefono`, `oper-bombas-telefono`, `oper-bombas-detalle-telefono`, `sup-turno-telefono`, `oper-turno-telefono`, `sup-bombas-ficha-P-201B-telefono`, `oper-bombas-ficha-P-201B-telefono` |
| [07-huecos.md](07-huecos.md) | Huecos y dudas de estas pantallas | — |
| [capturas.mjs](../capturas/06b-operacion.mjs) | Las 32 capturas y sus marcas (se regeneran con `npm run pantallazos:doc -- --capturas docs/backend/capturas/06b-operacion.mjs`) | — |

## Fichas del motor a las que remite este capítulo

| Abreviatura | Ficha |
|---|---|
| 5B §4 | `05B-paradas-agua/04-agua.md`: agua que mueve la bomba, agua sin salida, colchón, orden de cierre, predicción por papel, parada medida, evitable |
| 5B §5 | `05B-paradas-agua/05-riesgo-ahora.md`: fila de riesgo, perdiéndose ahora, en riesgo, estado del campo |
| 5B §6 | `05B-paradas-agua/06-turno.md`: las cifras del turno |
| 5B §7 | `05B-paradas-agua/07-historia-equipo.md`: fallas, MTBF, MDT, bbl por falla (lo que **le ha costado** cada falla, histórico; el «si falla hoy» de Riesgo es otra cifra, 5B §5), eventos cargados, equipo vivo, ficha ejecutiva |
| 5B §1–3 | eventos, causa de un pozo, causa de una bomba, «pide» y «arrancó sin identificar» |
| 5C §1–4 | serie y límites, vigía y pronóstico, salud por parte y sus frases, electrosumergibles |
| 5A §3–4, §8 | tramo, diferido, tolerancia y rango «calculado», Paretos |
| 5D §5, §6 | WhatsApp (registro de mensajes; **RETIRADO (27-oct-2026)**), SAP PM (aviso, órdenes, repuestos, identidad) |
| 5E | `05e-choke-arbol/`: el modelo choke y el árbol de 6 pasos (los tramos, sus potenciales, dónde se trabó cada parada, la tubería del agua, «Si falla hoy», el árbol de la circular) |
| 8 | reglas globales: `n0`/`n1`, `fmtHoras`, prioridades ISA-101, `BarraMeta`, `Analogico`, «ver N más», ⓘ |

## Cómo se ve cada nivel (resumen; lo comprueban las aserciones del auditor)

| Pantalla | `operacion` (sup, oper, tec) | `ingenieria` (prod, jefe, conf) | `decision` (ger) |
|---|---|---|---|
| Bombas · placa | solo las variables fuera de banda; «PARTES QUE AVISAN»; bbl/h en la cabecera; debajo de las placas, «SIN INSTRUMENTO» (las bombas del tren de agua sin instrumento; los dos niveles, 6D.2) | las 4 variables clave; «PARTES» con el renglón de estables; historia de fallas al pie con «le ha costado N bbl por falla» y las horas fuera con `fmtHoras` («2,0 d fuera», nunca «48,7 h fuera» ni «bbl/falla»: `rutas.ts:83`); rango del diferido | — **el gerente no tiene la pantalla** (decisión del dueño, 8-oct: se quitó la variante directiva; lo que le sirve, de qué campo viene el diferido y qué equipos fallan, está en su Resumen, 6A) |
| Bombas · detalle | «MIENTRAS ESTÉ PARADA»/«SI SE PARA AHORA» simple, «PARTES QUE AVISAN» con «Qué hacer:» escrito, «FUERA DE BANDA», «ÚLTIMAS PARADAS»; sin VIGÍA, SALUD POR PARTE, supuestos ni tolerancia (`e2e/auditoria/rutas.ts:76`) | todo: SALUD POR PARTE, VARIABLES, VIGÍA, «PARADAS DEL PLC», PUNTOS CIEGOS, ⓘ método/supuestos/tolerancia, «Le ha costado por falla», «bomba parada» (`rutas.ts:81`); en una bomba de disposición, «LA TUBERÍA DEL AGUA, HOY» y «Ver planes de acción» (los dos niveles) | — |
| Electrosumergibles | sin la 4.ª cifra ni las columnas Fallas/Disparos/Entre fallas | todo; «bbl/d en juego» (`rutas.ts:85`) | — (el gerente no tiene la pantalla, como Bombas) |
| Pozos | sin «Custodia completa», sin columna «Prueba», sin el filtro de custodia (`rutas.ts:77`) | todo | — |
| Detalle del pozo | «PARTES QUE AVISAN», «FUERA DE BANDA», «SIN SEÑAL»; sin PRUEBAS ni Agua | SALUD POR PARTE, SEÑALES DEL POZO, PRUEBAS, Agua y corte, fallas de la ESP | — |
| Ficha de equipo | «No arrancar hasta identificar qué se dañó.», «FUERA DE BANDA · N DE M», «Última parada» (`rutas.ts:112`); en una bomba de reinyección parada, «LA TUBERÍA DEL AGUA, HOY» en vez de la lectura fija | «norma», «Modo de falla», «Si falla hoy», «DISPOSITIVOS · N» con minigráfica, «HISTORIAL SAP», «HISTORIA DEL PLC», «Cadena del dato» | `FichaEjecutiva`: «Le ha costado», «Qué se está haciendo», «pozos cerrados desde», «llega el 9 de oct» y no «sin stock de kit» (`rutas.ts:73`) |
| Turno | las mismas cifras en sup y oper; el operador no ve «Qué limita hoy al campo», «Lo más frágil» ni el chip del tramo, y en «CIERRE DE HOY» no confirma (6B.5) | — | — |
