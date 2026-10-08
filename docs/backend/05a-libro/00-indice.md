# 5A · El libro de diferidos: asignación de producción y lo que se deja de producir

Este capítulo explica, para quien construye el backend, cómo se calcula **cuánto crudo no se produjo, por qué y con qué tolerancia**: la asignación de la producción fiscal a los pozos, el factor de asignación y su banda regulatoria, el diferido de cada evento de pozo, el cuadre exacto con la medición oficial, los períodos, las metas firmadas, el valor en USD, la publicación del libro, los Paretos, el día a día y el cotejo con la asignación oficial de la operadora.

Cada cifra sigue la plantilla de la guía: qué es, dónde se ve, fórmula, ejemplo con los números del demo **corridos con el motor** (`src/entities/*.ts`, `AHORA = 2026-10-02T14:00-05:00`), casos borde, texto en pantalla, quién la calcula y por dónde viaja, y referencia al código.

## Contenido

| Archivo | Sección | Lo que cubre |
|---|---|---|
| [01-modelo-fisico.md](01-modelo-fisico.md) | 5A.1 Modelo físico | Fluido total, crudo, agua, gas; corte de agua (BSW) y WOR; por qué el agua manda; prueba de pozo y prueba vigente; punto de medición oficial (LACT, computador de flujo); producción fiscal del día; corte de agua de laboratorio |
| [02-factor-de-asignacion.md](02-factor-de-asignacion.md) | 5A.2 Factor de asignación | Horas perdidas y eventos que se pisan; teórico y real del mes; FA; pozos sin prueba; banda de la Res. 40236 (Fig. 10.2) y cómo se escoge la fila; banda sin verificar; fuera de banda |
| [03-potencial-real-diferido.md](03-potencial-real-diferido.md) | 5A.3 Potencial, real y diferido | Real, potencial, brecha, tramo (paro y frecuencia reducida), diferido, identidad exacta, residuo/inventario, eficiencia, sin paradas programadas, identificado/declarado/pendiente, alto impacto, evitable cerrando en orden |
| [04-tolerancia-y-rango.md](04-tolerancia-y-rango.md) | 5A.4 Tolerancia | Ec. 22 (raíz de suma de cuadrados), sesgo correlado por campo, reloj del PLC, tolerancia del libro, rango «calculado», nota de cálculo, aproximado aparte |
| [05-periodos-y-portafolio.md](05-periodos-y-portafolio.md) | 5A.5 Períodos | Calendario (cerrado / publicado / parcial), períodos de la cabecera y rango a la medida, horas y días, «en curso», serie mensual, aditividad, portafolio, potencial reciente |
| [06-metas-base-y-valor.md](06-metas-base-y-valor.md) | 5A.6 Metas y valor | Tramos firmados, `metaEn`/`metaEntre`, meta a la fecha y del período, sin meta firmada, cierre proyectado, línea base, valor en USD y «falta precio», alto impacto %, antes → con TRIM, Tendencia |
| [07-publicacion.md](07-publicacion.md) | 5A.7 Publicación | Los siete motivos con su regla y su texto, los tres estados, el sello y sus líneas cortas |
| [08-paretos-y-palancas.md](08-paretos-y-palancas.md) | 5A.8 Paretos y palancas | Por tipo, por equipo, por parte (fallas, disparos, horas fuera), «dónde bajarlo» (vigilada, sin instrumento, sin parte, evitable), por pozo |
| [09-produccion-dia-a-dia.md](09-produccion-dia-a-dia.md) | 5A.9 Producción | `Dia`, cuadre diario y mensual, gráfica «Día a día», cabecera de Producción, panel «Medición oficial» |
| [10-asignacion-oficial.md](10-asignacion-oficial.md) | 5A.10 Asignación oficial | `asignacionPorPozo` (suma exacta lo real), formato y validación del CSV, carga y rastro, cotejo pozo por pozo |
| [11-pantallas-y-endpoints.md](11-pantallas-y-endpoints.md) | 5A.11 Mapa | Qué ve cada rol, gráfico «Mes a mes», endpoints con sus casos de `referencia/` |
| [12-huecos-y-dudas.md](12-huecos-y-dudas.md) | 5A.12 Huecos y dudas | 21 puntos con archivo y línea |

## Las cifras que hay que reproducir (demo)

| | La Ceiba · sep (cerrado) | La Ceiba · oct (en curso) | Portafolio · sep | Portafolio · oct |
|---|---:|---:|---:|---:|
| Factor de asignación | 0,969 | 0,958 | 0,961–1,032 | 0,958–1,032 |
| Real (bbl) | 324.688 | 14.943 | 1.163.047 | 60.292 |
| Potencial (bbl) | 346.379,435 | 17.986,201 | 1.268.274,224 | 66.523,716 |
| Barriles diferidos | **21.691** | **3.043** | **105.227** | **6.232** |
| Rango | 18.438–24.945 | 2.587–3.500 | 96.444–114.010 | 5.729–6.734 |
| Sin identificar | 0 | 355 | 0 | 355 |
| Alto impacto | 21.494 (99 %) | 2.570 (84 %) | 97.496 (93 %) | 5.523 (89 %) |
| Valor | 1,0 M USD | 146 mil USD | 5,0 M USD · falta precio en La Zarza | 299 mil USD · falta precio en La Zarza |
| Diferido por día · máx. | 723 · 800 | 1.922 ■ · 800 | 3.508 ■ · 2.300 | 3.936 ■ · 2.300 |
| Frente a los 3 meses antes | −16 % frente a jun a ago | +98 % frente a jul a sep | +83 % frente a jun a ago | +44 % frente a jul a sep |
| Sello | ✓ PUBLICABLE | PROVISIONAL | ✓ PUBLICABLE | PROVISIONAL |

## Quién calcula qué, en una línea

El **servidor** calcula todo lo que lee los insumos (libro, factor, banda, tramos, tolerancia, Paretos, día a día, asignación por pozo, motivos de publicación, valor). **Los dos** corren las reglas de lo que entra a mano (`metaEn`, `metaEntre`, `criterioEn`, `precioEn`, `leerAsignacion`, `cotejar`, `mesCerrado`). El **front** solo formatea, decide el estado del sello por el código de los motivos, arma el rango, divide por días y ordena.
