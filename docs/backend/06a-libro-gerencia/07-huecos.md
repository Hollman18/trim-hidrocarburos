# 6A.7 Huecos y dudas (pantallas del libro y de la gerencia)

Lo que no cuadra en lo que muestran estas pantallas, lo que el front deja fijo y el servidor tendrá que dar, y lo que las capturas no pudieron mostrar. Los huecos del motor ya escritos en 5A.12, 5B.8, 5C.7 y 5D.9 no se repiten; se remite a ellos cuando una pantalla los hace visibles.

## A. Inconsistencias que cambian lo que se ve

1. **«Servicios en alarma» del Resumen incluye una bomba.** El Resumen del gerente llama «servicio» a toda fila `en-riesgo` sin `altoImpacto` (`src/widgets/resumen/ResumenDirectivo.tsx:43`, `:175`): en el portafolio cuenta K-101 **y MPP-301** («2 servicios en alarma»; globo «MPP-301 · Bomba multifásica»). La pantalla Riesgo define servicio como «ni bomba de la línea ni electrosumergible» (`src/pages/Riesgo.tsx:219`), que deja fuera a MPP-301. Para el gerente, una bomba multifásica con el filtro tapado no es un «servicio». Propuesta: usar la misma regla `esServicio`, o decir «1 servicio y 1 bomba multifásica».
2. **El pie de «En riesgo · alto impacto» se corta.** La celda es `truncate` (`ResumenDirectivo.tsx:80`); con un campo en 1.280 px se lee «ninguna otra bomba ni electrosumergible avisa · 1 …» y el «1 servicio en alarma» queda cortado (captura `ger-resumen-ceiba`). Lo cortado está en el globo, pero el número de servicios no se ve.
3. **El gerente ve la tolerancia en el globo de la cifra.** El globo «Barriles diferidos» del encabezado no distingue nivel: en decisión también dice «Σ de los eventos: 3.043 bbl ±15,0 % (Res. 40236)» (`src/widgets/diferidos/Encabezado.tsx:51`), aunque el nivel `decision` no ve tolerancias (capítulo 8 §8.12) y el rango del mismo encabezado sí se adapta («Margen del cálculo»). El auditor no lo detecta porque solo mira el texto visible.
4. **«Sin base de comparación» se dice en Diferidos y se calla en el Resumen.** Con `GET …/base` en `null`, el encabezado de Diferidos escribe «sin base de comparación» (`Encabezado.tsx:79`) y el Resumen del gerente no escribe nada (`ResumenDirectivo.tsx:119`). Va contra la regla 8.10 («lo que falta se dice»).
5. **«Mantenimiento proactivo» desaparece sin órdenes.** Si no hay horas PM01/PM02/PM03 desde la puesta en marcha, el bloque entero no se dibuja (`ResumenDirectivo.tsx:185`), sin «sin dato». En Mantenimiento la misma cifra dice «Sin órdenes cerradas en el período». Además el Resumen escribe las horas con `n0` («12 h proactivas») y Mantenimiento con `n1` («12,0 h»).
6. **La marca de cada fila del Pareto es la del equipo, no la de la fila.** `ParetoEquipos` pinta la severidad **de hoy** del equipo en cada fila de ese equipo (`src/widgets/diferidos/Paretos.tsx:45-51`): en los 12 meses del portafolio, la fila «P-201B · La Ceiba · parada programada · 3.828» lleva ◆ P1, y por ser P1 nunca se esconde detrás de «ver más» (captura `ger-diferidos-portafolio-doce`). La fila de una parada programada del año pasado no es una alarma. Propuesta: marcar solo la fila del tipo que hoy está mal, o solo la primera fila del equipo.
7. **El gráfico del factor no arranca al final.** `MesAMes`, `Tendencia` y `Diaria` usan `alFinal` para que un gráfico desplazable muestre primero el mes en curso; `Factor` no (`src/widgets/diferidos/Factor.tsx:26`). En 1.280 px, con el panel a media pantalla, el punto del mes que se mira (octubre) queda cortado a la derecha (capturas `prod-diferidos-ceiba` y `prod-produccion-ceiba`; en `prod-diferidos-ceiba-globo-factor` se ve porque el foco desplazó el gráfico).
8. **Fecha de otro año con el día en dos cifras.** `FMT_FECHA_ANIO` produce «01 de oct de 2025» y `FMT_FECHA` «1 de oct» (`src/entities/reloj.ts:18-19`, opción `day: '2-digit'`, que ICU respeta solo con el año). Se ve en el eje de la curva de 12 meses (captura `prod-produccion-palmar-doce`); `FMT_FECHA_HORA_ANIO` (`:17`) tiene la misma opción, así que un día 1 a 9 de otro año saldrá con cero adelante también en `fechaHora`. Cosmético, pero entra a informes con huella: el servidor que genere textos con fecha tiene que producir exactamente lo mismo.
9. **La caja de fecha de la firma sale en el formato del navegador.** «Desde el [10/02/2026]» (mes/día) junto a «2 de oct de 2026» (captura `ger-configuracion-ceiba`). En un navegador en inglés el 10/02 se lee como 10 de febrero. No afecta al servidor (el valor viaja `AAAA-MM-DD`).

## B. Lo que el front deja fijo y tiene que dar el servidor

10. **Conectores · SISTEMAS CORPORATIVOS**: «sincronizado {AHORA − 2 min}», los chips «conectado», «webhook activo», el número «+57 601 555 0100» y «verificado por Meta» son constantes del front (`src/widgets/conectores/Integraciones.tsx:19-20`, `:66`, `:89`, `:91-92`). No hay endpoint que los dé. Propuesta: `GET /api/integraciones` → `{ sap: { conectado, sincronizado }, whatsapp: { numero, verificado, webhook: { activo, ultimo } } }`.
11. **«SAP → TRIM · horas» no dice de cuándo.** Suma las horas de **todas** las órdenes del campo (`Integraciones.tsx:33`): 116,0 h en La Ceiba son toda la historia, sin período ni «desde». Y «PLC ↔ SAP · equipos 16 de 16» cuenta la flota contra sí misma (`:75`, ya en 5D.6).
12. **«Antes → con TRIM» y «mantenimiento proactivo» usan fechas fijas del front**: `PUESTA_EN_MARCHA` y tres meses antes (`ResumenDirectivo.tsx:61-65`). El servidor tiene que exponer la fecha de puesta en marcha (hoy sale de la versión 1 de la configuración) para que ese bloque no dependa de una constante.

## C. Reglas de entrada que la pantalla deja pasar o rechaza de más

13. **Horas con tres decimales en la asignación oficial.** «672,383» se lee como 672.383 (coma de miles: tres cifras tras la coma) y la carga entera se rechaza: «Fila 2: «672,383» no son horas de septiembre de 2026 (0 a 720).» (corrido al armar la captura `prod-produccion-asignacion-cotejo`; `leerNumero`, `src/entities/plan.ts`). Una exportación de SAP con horas a tres decimales chocaría con esto. El servidor tiene que leer igual (y el mensaje ayuda), o aceptar el decimal cuando la columna es de horas.
14. **El plan deja pasar 30 veces la meta a la firma.** La revisión del presupuesto avisa «Guacamayo, diciembre de 2026: 189.000 bbl/d es 30 veces la meta de hoy…», pero después de «Pasar 5 filas al borrador» el aviso desaparece y la firma lo acepta (`validarConfig` solo topa en 10.000.000 bbl/d; captura `ger-configuracion-plan-borrador`). Propuesta: repetir el aviso en FIRMAR LA VERSIÓN o pedir confirmación.

## D. Lo que no se pudo capturar o no ocurre en el demo

15. **El globo de un mes de MES A MES (ingeniería) y de la Tendencia**: el mismo toque que lo abre cambia el período (los dos `Tip` llevan `onClick`). Sus filas se dan desde el código (6A.2 fila 34; 6A.1 fila 28).
16. **El globo del chip «sugerido» de Conectores** no abrió con el generador (el texto está en 6A.6 fila 31, de 5D.8).
17. **Estados sin ruta en el demo**: sin meta firmada, día sin fiscal, último día sin fiscal, «mucho sin identificar» (`sin-causa`), banda sin verificar, rol sin `asignacion:cargar` en Producción. Sus textos están en las tablas «Estados», tomados del código; los números corridos de esos escenarios, en 5A.6, 5A.7 y 5A.9.
18. **El código de inscripción es aleatorio**: la captura `adm-conectores-ceiba-inscribir` muestra uno distinto en cada corrida.
19. **(Resuelto)** El generador del repo hace los pasos `escribir` y `elegir` y lee `CAPTURAS_ESCRITAS`: las ocho capturas de formularios se regeneran con `npm run pantallazos:doc`.

## E. Ya documentados en el motor, visibles aquí

- «Publicable» de POR CAMPO con regla propia del front (5A.12 §9) → 6A.2 fila 53.
- «En curso» solo para el mes en curso: el año a la fecha dice «meta» y «TOTAL DEL PERÍODO» (5A.12 §12) → 6A.3.5 fila 2.
- Tendencia (Σ eventos) contra Mes a mes (brecha) (5A.12 §13) → 6A.1 fila 28 y 6A.2 fila 34.
- `Portafolio` y `ResumenCampo` no se alcanzan (5A.12 §16) → 6A.1, final.
- Signo «−» (U+2212) en «−16 % frente a jun a ago» y «-1», «-107», «-68 bbl» con guion (5A.12 §17) → 6A.2.2 fila 9, 6A.3.2 fila 24, 6A.3.6.
- «Faltan 1 pozo» (5A.12 §11) → 6A.3.6 fila 52.
- Potencial reciente dividido siempre por 30 (5A.12 §15) → 6A.4.1 fila 5.
