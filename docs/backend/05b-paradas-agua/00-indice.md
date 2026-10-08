# 5B · Paradas, causas y agua: de la bomba que para al pozo que se cierra

Este capítulo cubre la mitad «hacia adelante» del motor de alto impacto: **qué evento paró qué**, **a quién se le cargan los barriles**, **cuánto aguanta el tanque de agua cuando para la bomba de reinyección**, **qué se está perdiendo ahora y qué está en riesgo**, el **turno** y la **historia de fallas** de cada equipo. El libro de diferidos (asignación, factor, tolerancia) está en su propio capítulo; aquí se usa como insumo (`crudoAsignado`, `tramosDe`, `faDe`).

Todos los números de ejemplo salen de correr el motor con los insumos del demo (`INSUMOS_DEMO`), con `AHORA = 2026-10-02T14:00-05:00`. Zona horaria: Colombia (UTC−5).

| Archivo | Sección | Módulos |
|---|---|---|
| [01-eventos.md](01-eventos.md) | 1 · Los eventos: qué manda el PLC y qué se deduce | `pozos.ts`, `bombas.ts`, `libro.ts` (normalización, frecuencia reducida) |
| [02-causa-pozo.md](02-causa-pozo.md) | 2 · Árbol de atribución de un evento de pozo | `causa-senal.ts` (`deducirEvento`, `cascadaDe`, `bombaQueLeCorta`), `causas.ts` |
| [03-causa-bomba.md](03-causa-bomba.md) | 3 · Árbol de atribución de una parada de bomba; identificación y no conformidad; disparo vs falla | `causa-senal.ts` (`deducirParada`, `estadoIdentificacion`), `libro.ts` (`preguntasDe`, `esDisparo`) |
| [04-agua.md](04-agua.md) | 4 · El agua: colchón del tanque, orden de cierre, crudo en riesgo, parada medida y evitable | `diferido.ts` (`aguaQueMueve`, `colchonDe`, `ordenDeCierre`, `prediccion`, `paradaMedida`), `libro.ts` (`ordenOptimo`, `evitableDeEvento`), `configuracion.ts` |
| [05-riesgo-ahora.md](05-riesgo-ahora.md) | 5 · Lo que se pierde ahora y lo que está en riesgo | `diferido.ts` (`riesgoAhora`, `estadoCampo`, `mdtEspDelCampo`, `caudalesAhora`), `pages/Riesgo.tsx` |
| [06-turno.md](06-turno.md) | 6 · Entrega de turno | `pages/Turno.tsx` sobre `riesgoAhora`, `libro`, preguntas |
| [07-historia-equipo.md](07-historia-equipo.md) | 7 · Historia de un equipo: fallas, MTBF, horas fuera, barriles por falla; el equipo «vivo» | `libro.ts` (`historialDeEquipo`, `eventosCargadosA`, `diferidoDeEquipo`), `equipo-vivo.ts`, `equipos.ts`, widgets |
| [08-huecos.md](08-huecos.md) | Huecos y dudas | — |

## Endpoints que cubre este capítulo

| Endpoint | Tipo devuelto | Función del motor |
|---|---|---|
| `GET /api/vistas/bombas/prediccion?campo&equipo` | `Prediccion` | `prediccion` (`diferido.ts:182`) |
| `GET /api/vistas/bombas/paradas?campo&equipo` | `ParadaMedida[]` (más reciente primero) | `paradaMedida` (`diferido.ts:302`) |
| `GET /api/vistas/bombas/paradas-en-periodo?campos&desde&hasta` | `ParadaMedida + { horasEnPeriodo, bblEnPeriodo, cruzaBorde }` | `shared/api/diferidos.ts` |
| `GET /api/vistas/riesgo?campos` | `Riesgo[]` | `riesgoAhora` (`diferido.ts:418`) |
| `GET /api/vistas/estado?campos` | `EstadoCampo[]` | `estadoCampo` (`diferido.ts:553`) |
| `GET /api/vistas/paradas/por-identificar?campos` | `Pregunta[]` (toda la historia) | `libro(...).preguntas` (`libro.ts:822`) |
| `GET /api/vistas/equipos/:campo/:equipo/historia` | `{ eventos: EventoCargado[], bomba?: HistorialEquipo }` | `eventosCargadosA`, `historialDeEquipo` |
| `GET /api/vistas/equipos/:campo/:equipo/ficha?desde&hasta` | `FichaEquipo` | `pedirFichaEquipo` (`shared/api/equipos.ts:206`) |
| `GET /api/vistas/equipos/:campo/:equipo` | `EquipoVivo` | `equipoVivo` (`equipo-vivo.ts:25`) |
| `GET /api/vistas/confiabilidad?campos` | `[{ campoId, equipo, familia, h: HistorialEquipo }]` | `historialDeEquipo` |
| `GET /api/vistas/bombas?campos&desde&hasta` | `BombaVista[]` | `pedirBombas` (`shared/api/equipos.ts:255`) |
| `GET /api/vistas/campos/:campo/ahora` | `{ caudales, niveles }` | `caudalesAhora` (`diferido.ts:574`) + `NIVEL_AHORA` |

Casos de referencia que comprueban este capítulo (`node scripts/referencia.mjs comprobar`): `referencia/prediccion/{ceiba-P-201B, morichal-P-201B, morichal-MPP-301, guacamayo-P-201B}.json`, `referencia/riesgo/{ceiba, morichal, guacamayo, palmar, zarza, portafolio}.json`, `referencia/salud/bombas-*.json` (traen `veredicto` y `abierta`), `referencia/diferidos/*` (traen `preguntas`).

## Glosario mínimo del capítulo

| Término | Qué es |
|---|---|
| **Bomba de reinyección / disposición** | Bomba centrífuga (aquí P-201B, horizontal multietapa, API 610) que toma el agua separada del crudo y la inyecta a pozos inyectores. Papel `disposicion`: el agua no tiene otra salida; papel `recobro`: inyecta para mantener presión y el agua tiene salida alterna. |
| **Bomba multifásica** | Bomba de doble tornillo (MPP-301, API 676) que lleva la mezcla crudo+agua+gas de un grupo de pozos (clúster) a la planta sin separarla. Papel `transporte`. |
| **Electrosumergible (ESP)** | Bomba de fondo del pozo, movida por un motor en el pozo y un variador en superficie (VSD). El variador reporta códigos de disparo (GF, OL, UL…). |
| **Corte de agua (BSW)** | Fracción de agua en el líquido producido: $\text{BSW} = \frac{Q_w}{Q_w + Q_o}$. |
| **Tanque de agua / alto-alto** | Tanque que recibe el agua separada antes de la bomba. «Alto-alto» (LSHH) es el nivel al que dispara la protección y obliga a dejar de producir agua. |
| **Colchón** | Horas que tarda el tanque en llegar al alto-alto si la bomba se para. |
| **Respaldo** | Capacidad libre (bbl/d) de otro equipo que puede tomar el agua cuando la bomba para (bomba en paralelo, pozo de disposición alterno). Es configuración firmada. |
| **Primera alarma (first-out)** | La alarma que el PLC congela al disparar una máquina: la primera de la secuencia. |
| **Firma** | Parte de la bomba que estaba fuera de límite en el instante de parar, deducida de las señales. |
| **Disparo vs falla (ESP)** | Una ESP que vuelve a arrancar en menos de 24 h «disparó»; si tarda más, «falló» (hay que sacarla del pozo). |
| **MTBF / MDT** | Tiempo medio entre fallas (días) y tiempo medio fuera de servicio (horas), ISO 14224. |
| **ISA-101 / ISA-18.2** | Marcas de prioridad: P1 alarma ◆ rojo, P2 atención ▲ naranja, P3 aviso ■ amarillo, gris normal. |
