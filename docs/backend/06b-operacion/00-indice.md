# 6B · Operación: bombas, electrosumergibles, pozos, fichas de equipo y turno

Capítulo 6, parte B: las pantallas con que la operación (supervisor, operador, técnico) y la ingeniería (producción, jefe de mantenimiento, confiabilidad) miran los **equipos de alto impacto** —las bombas de reinyección y multifásicas, las electrosumergibles— y los **pozos** que dependen de ellos, la **ficha de un equipo** y la **entrega de turno**. Cada pantalla trae su captura anotada y una tabla: por cada número de la captura, qué se ve, el valor exacto, cómo se calcula (remitiendo a la ficha del capítulo 5), qué texto sale según el valor (con `archivo:línea`) y de qué endpoint y campo viene (capítulo 7).

Todos los valores son del demo con `AHORA = 2026-10-02T14:00-05:00`, período «Octubre, en curso» (1-oct 00:00 → 2-oct 14:00, hora de Colombia) salvo que se diga otro. Los números que no se leen en una captura se obtuvieron corriendo el motor (`pedirBombas`, `pedirPozos`, `pedirPozo`, `pedirFlotaEsp`, `pedirFichaEquipo`, `pedirHistoriaEquipo`, `riesgoAhora`, `libro` sobre `INSUMOS_DEMO`).

| Archivo | Sección | Capturas |
|---|---|---|
| [01-bombas.md](01-bombas.md) | 6B.1 · Bombas: la estación, la placa de cada bomba y su detalle | `sup-bombas-ceiba`, `conf-bombas-morichal`, `conf-bombas-portafolio`, `sup-bombas-detalle-ceiba`, `conf-bombas-detalle-morichal`, `jefe-bombas-detalle-ceiba` |
| [02-electrosumergibles.md](02-electrosumergibles.md) | 6B.2 · Electrosumergibles: la flota, la fila abierta y la ficha de MN-07 | `jefe-esp-morichal`, `conf-esp-morichal-fila`, `jefe-esp-ficha-MN-07`, `prod-esp-portafolio`, `sup-esp-ceiba`, `prod-esp-palmar` |
| [03-pozos.md](03-pozos.md) | 6B.3 · Pozos: la tabla y el detalle de un pozo | `prod-pozos-ceiba`, `sup-pozos-ceiba`, `prod-pozos-ficha-LC-21`, `prod-pozos-ficha-LC-14` |
| [04-ficha-equipo.md](04-ficha-equipo.md) | 6B.4 · La ficha de un equipo (operación, ingeniería, ejecutiva, servicio) | `sup-bombas-ficha-P-201B`, `jefe-riesgo-ficha-P-201B`, `ger-resumen-ficha-P-201B`, `conf-confiabilidad-ficha-MPP-301`, `jefe-equipo-ficha-K-101`, `ger-diferidos-ficha-SE-2` |
| [05-turno.md](05-turno.md) | 6B.5 · Entrega de turno | `sup-turno-ceiba`, `oper-turno-ceiba` |
| [06-telefono.md](06-telefono.md) | 6B.6 · En el teléfono (390 px) | `sup-bombas-telefono`, `oper-bombas-telefono`, `oper-bombas-detalle-telefono`, `sup-turno-telefono`, `oper-turno-telefono`, `sup-bombas-ficha-P-201B-telefono`, `oper-bombas-ficha-P-201B-telefono` |
| [07-huecos.md](07-huecos.md) | Huecos y dudas de estas pantallas | — |
| [capturas.mjs](../capturas/06b-operacion.mjs) | Las 31 capturas y sus marcas (se regeneran con `npm run pantallazos:doc -- --capturas docs/backend/capturas/06b-operacion.mjs`) | — |

## Fichas del motor a las que remite este capítulo

| Abreviatura | Ficha |
|---|---|
| 5B §4 | `05B-paradas-agua/04-agua.md`: agua que mueve la bomba, agua sin salida, colchón, orden de cierre, predicción por papel, parada medida, evitable |
| 5B §5 | `05B-paradas-agua/05-riesgo-ahora.md`: fila de riesgo, perdiéndose ahora, en riesgo, estado del campo |
| 5B §6 | `05B-paradas-agua/06-turno.md`: las cifras del turno |
| 5B §7 | `05B-paradas-agua/07-historia-equipo.md`: fallas, MTBF, MDT, bbl por falla, eventos cargados, equipo vivo, ficha ejecutiva |
| 5B §1–3 | eventos, causa de un pozo, causa de una bomba, «pide» y «arrancó sin identificar» |
| 5C §1–4 | serie y límites, vigía y pronóstico, salud por parte y sus frases, electrosumergibles |
| 5A §3–4, §8 | tramo, diferido, tolerancia y rango «calculado», Paretos |
| 5D §5, §6 | WhatsApp (registro de mensajes), SAP PM (aviso, órdenes, repuestos, identidad) |
| 8 | reglas globales: `n0`/`n1`, `fmtHoras`, prioridades ISA-101, `BarraMeta`, `Analogico`, «ver N más», ⓘ |

## Cómo se ve cada nivel (resumen; lo comprueban las aserciones del auditor)

| Pantalla | `operacion` (sup, oper, tec) | `ingenieria` (prod, jefe, conf) | `decision` (ger) |
|---|---|---|---|
| Bombas · placa | solo las variables fuera de banda; «PARTES QUE AVISAN»; bbl/h en la cabecera | las 4 variables clave; «PARTES» con el renglón de estables; historia de fallas al pie; rango del diferido | `PlacaDirectiva` (sin variables) — **ningún rol de decisión tiene la pantalla** (ver Huecos) |
| Bombas · detalle | «MIENTRAS ESTÉ PARADA»/«SI SE PARA AHORA» simple, «PARTES QUE AVISAN» con «Qué hacer:» escrito, «FUERA DE BANDA», «ÚLTIMAS PARADAS»; sin VIGÍA, SALUD POR PARTE, supuestos ni tolerancia (`e2e/auditoria/rutas.ts:61`) | todo: SALUD POR PARTE, VARIABLES, VIGÍA, «PARADAS DEL PLC», PUNTOS CIEGOS, ⓘ método/supuestos/tolerancia (`rutas.ts:64`) | — (abre la ficha ejecutiva) |
| Electrosumergibles | sin la 4.ª cifra ni las columnas Fallas/Disparos/Entre fallas | todo | «Fallas en N meses»; la fila abre la ficha (inalcanzable: ver Huecos) |
| Pozos | sin «Custodia completa», sin columna «Prueba», sin el filtro de custodia (`rutas.ts:62`) | todo | — |
| Detalle del pozo | «PARTES QUE AVISAN», «FUERA DE BANDA», «SIN SEÑAL»; sin PRUEBAS ni Agua | SALUD POR PARTE, SEÑALES DEL POZO, PRUEBAS, Agua y corte, fallas de la ESP | — |
| Ficha de equipo | «No arrancar hasta identificar qué se dañó.», «FUERA DE BANDA · N DE M», «Última parada» (`rutas.ts:81`) | «norma», «Modo de falla», «DISPOSITIVOS · N» con minigráfica, «HISTORIAL SAP», «HISTORIA DEL PLC», «Cadena del dato» | `FichaEjecutiva`: «Le ha costado», «Qué se está haciendo», «pozos cerrados desde» (`rutas.ts:58`) |
| Turno | igual para sup y oper | — | — |
