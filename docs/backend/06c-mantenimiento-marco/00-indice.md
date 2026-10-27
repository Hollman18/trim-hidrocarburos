# 6C · Mantenimiento, confiabilidad e identificar; planta; y el marco común de la aplicación

Pantalla por pantalla, con capturas anotadas: para cada número, chip, marca, barra o frase que depende de un dato, **cómo se calcula** (con remisión a la ficha de los capítulos 5A-5D), **el valor exacto de la captura**, **el texto según el valor** (sacado del código, con archivo:línea) y **de qué endpoint y campo sale** (capítulo 7).

Datos: el demo (`VITE_FUENTE=demo`), `AHORA = 2026-10-02T14:00-05:00`, período «Octubre, en curso» salvo que se diga otro. Los números se comprobaron corriendo el motor (`src/entities/*`) y leyendo el texto de cada pantalla.

| Archivo | Pantalla | Rutas capturadas | Capturas |
|---|---|---|---|
| [01-riesgo.md](01-riesgo.md) | Riesgo (y la franja «Ahora» de Resumen) | `#/jefe/riesgo/ceiba~portafolio/curso` («ver 2 más» cerrado y abierto), `#/ger/riesgo/ceiba/curso` (decisión), `#/conf/riesgo/morichal/curso` | 4 |
| [02-identificar.md](02-identificar.md) | Identificar (paradas por identificar) | `#/oper/causa/ceiba/curso` (+ el chat de WhatsApp, **RETIRADO (27-oct-2026)**), `#/sup/…`, `#/tec/…`, `#/prod/causa/ceiba/curso`, `#/prod/causa/morichal/cerrado`, `#/jefe/causa/ceiba/curso`, `#/conf/causa/morichal/curso` (+ respuesta y análisis de causa raíz B.2/B.3) | 9 |
| [03-mantenimiento.md](03-mantenimiento.md) | Mantenimiento | `#/jefe/mantenimiento/ceiba/curso`, `…/ceiba~portafolio/curso`, `…/ceiba/cerrado` (HORAS EN SAP y tres relojes con datos) | 3 |
| [04-confiabilidad.md](04-confiabilidad.md) | Confiabilidad | `#/conf/confiabilidad/morichal/curso`, `#/jefe/confiabilidad/ceiba~portafolio/curso` | 2 |
| [05-superficie.md](05-superficie.md) | Superficie (tabla de equipos) | `#/jefe/equipo/ceiba/curso`, `#/conf/equipo/morichal/curso` (servicios desplegados) | 2 |
| [06-trabajo.md](06-trabajo.md) | Mi trabajo (técnico) | `#/tec/trabajo/ceiba/curso` en escritorio y en teléfono | 2 |
| [07-planta.md](07-planta.md) | Planta | `#/prod/planta/ceiba/curso` (1.512 px), `#/conf/planta/morichal/curso` (+ capacidad por tren), `#/prod/planta/palmar/curso` (sin gas), `#/adm/planta/guacamayo/curso` (+ el administrador cambia el esquema: Configuración y la planta después) | 7 |
| [08-marco.md](08-marco.md) | El marco común | cabecera y riel, período y rango a la medida, sello de demostración, selector de campo, menú de la persona y cambio de rol, introducción de cada rol (2 pasos; jefe y gerente), subpantallas, Exportar, «¿cómo se lee?», cajón del teléfono, el papel con folio y sin folio | 16 |
| [09-huecos-y-dudas.md](09-huecos-y-dudas.md) | Huecos y dudas | 29 puntos con archivo y línea (7 resueltos el 8-oct, marcados; la numeración no cambia) | — |

**Capturas.** 45 en `doc/img/` con los prefijos del rol (`jefe-`, `conf-`, `oper-`, `sup-`, `tec-`, `prod-`, `ger-`, `adm-`) y `marco-`. 38 las genera el generador del repo con [capturas.mjs](../capturas/06c-mantenimiento-marco.mjs):

```bash
npm run pantallazos:doc -- --capturas docs/backend/capturas/06c-mantenimiento-marco.mjs [--solo marco-]
```

Las otras 7 necesitan escribir en cajas, entrar sin la marca de la introducción o emular el papel, cosas que el generador no hace: `adm-configuracion-esquema-guacamayo`, `adm-planta-guacamayo-cambio` ([guiones/planta.mjs](../capturas/guiones/planta.mjs)) y `marco-intro-jefe-paso1`, `marco-intro-jefe-paso2`, `marco-intro-ger-paso2`, `marco-papel-folio`, `marco-papel-sin-folio` ([guiones/marco.mjs](../capturas/guiones/marco.mjs)). Van en `docs/backend/capturas/guiones/` del repositorio (desde ahí los imports de Vite y Playwright se resuelven con el `node_modules` del repo) y se corren desde la raíz:

```bash
node docs/backend/capturas/guiones/planta.mjs [--salida docs/backend/img] [--puerto 5197]
node docs/backend/capturas/guiones/marco.mjs  [--salida docs/backend/img] [--puerto 5198]
```

Cada uno levanta su propio Vite (`VITE_FUENTE=demo`, puerto estricto: si está ocupado, falla), dibuja las marcas igual que el generador y sale con 1 si un paso o una marca no aparece o si la página lanza un error (esa captura no se guarda). La salida por defecto es `docs/backend/img/`.

**Cómo leer las tablas.** Columna «#» = el número verde de la captura. «Cómo se calcula» da la fórmula corta y remite a la ficha completa (5A libro, 5B paradas y agua, 5C salud y vigía, 5D entradas y salidas). «Viene de» es `endpoint → campo`; cuando el front suma o cuenta sobre lo que llega, se dice. Las cifras que **no** tenían ficha en el capítulo 5 (las de la cabecera de Riesgo, las tarjetas de Confiabilidad por familia del portafolio, las columnas de Superficie, la cobertura y los caudales de Planta, el marco) van completas aquí con su ejemplo corrido.

**Lo esencial para quien construye el backend.**
1. Casi todo lo de estas pantallas es **«ahora»** o **«toda la historia»**, no el período: Riesgo, ATACAR AHORA, ABIERTO EN SAP, las preguntas por identificar (que no prescriben), Confiabilidad completa, Mi trabajo y Planta (salvo los «bbl diferidos»). El período solo mueve el libro (identificación, palancas, por parte, bbl del período por equipo) y las horas de SAP.
2. El servidor manda **filas sin redondear y con su prioridad**; el front ordena (por `horas` con lo ya fuera primero, por severidad y bbl), corta en cinco sin esconder nunca un P1, suma las cabeceras y formatea (8 §8).
3. Lo que hoy es **simulado** y el backend debe reemplazar: SAP (órdenes, horas, relojes), el registro de predicciones, la severidad/estado/lectura de los equipos del catálogo, el teléfono de WhatsApp (**RETIRADO (27-oct-2026)**: no se reemplaza, sale), el cambio de rol, y que respuestas, análisis y cambios de planta vivan solo en la sesión del navegador.
