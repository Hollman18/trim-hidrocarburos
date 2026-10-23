# 5B · Paradas, causas y agua: de la bomba que para al pozo que se cierra

Este capítulo cubre la mitad «hacia adelante» del motor de alto impacto: **qué evento paró qué**, **a quién se le cargan los barriles**, **cuánto aguanta el tanque de agua cuando para la bomba de reinyección**, **qué se está perdiendo ahora y qué está en riesgo**, el **turno** y la **historia de fallas** de cada equipo. El libro de diferidos (asignación, factor, tolerancia) está en su propio capítulo; aquí se usa como insumo (`crudoAsignado`, `tramosDe`, `faDe`).

Todos los números de ejemplo salen de correr el motor con los insumos del demo (`INSUMOS_DEMO`), con `AHORA = 2026-10-02T14:00-05:00`. Zona horaria: Colombia (UTC−5).

| Archivo | Sección | Módulos |
|---|---|---|
| [01-eventos.md](01-eventos.md) | 1 · Los eventos: qué manda el PLC y qué se deduce | `pozos.ts`, `bombas.ts`, `libro.ts` (normalización, frecuencia reducida) |
| [02-causa-pozo.md](02-causa-pozo.md) | 2 · Árbol de atribución de un evento de pozo | `causa-senal.ts` (`deducirEvento`, `cascadaDe`, `bombaQueLeCorta`), `causas.ts` |
| [03-causa-bomba.md](03-causa-bomba.md) | 3 · Árbol de atribución de una parada de bomba; identificación y no conformidad; la cuenta única de «por identificar»; disparo vs falla | `causa-senal.ts` (`deducirParada`, `estadoIdentificacion`, `cuentaPorIdentificar`), `libro.ts` (`preguntasDe`, `esDisparo`) |
| [04-agua.md](04-agua.md) | 4 · El agua: colchón del tanque, llenado con la bomba ya parada, orden de cierre, crudo en riesgo, parada medida (con la configuración que regía) y evitable | `diferido.ts` (`aguaQueMueve`, `colchonDe`, `llenadoDe`, `ordenDeCierre`, `prediccion`, `paradaMedida`), `libro.ts` (`ordenOptimo`, `evitableDeEvento`), `configuracion.ts` (`configEn`) |
| [05-riesgo-ahora.md](05-riesgo-ahora.md) | 5 · Lo que se pierde ahora y lo que está en riesgo: «si para» y «si falla hoy» (descontando el colchón), la exposición | `diferido.ts` (`riesgoAhora`, `costoDeBomba`, `estadoCampo`, `mdtEspDelCampo`, `caudalesAhora`), `pages/Riesgo.tsx`, `shared/ui/costoHoy.ts` |
| [06-turno.md](06-turno.md) | 6 · Entrega de turno | `pages/Turno.tsx` sobre `riesgoAhora`, `libro`, preguntas |
| [07-historia-equipo.md](07-historia-equipo.md) | 7 · Historia de un equipo: fallas, MTBF, horas fuera, barriles por falla; el equipo «vivo» | `libro.ts` (`historialDeEquipo`, `eventosCargadosA`, `diferidoDeEquipo`), `equipo-vivo.ts`, `equipos.ts`, widgets |
| [08-huecos.md](08-huecos.md) | Huecos y dudas | — |

## Endpoints que cubre este capítulo

| Endpoint | Tipo devuelto | Función del motor |
|---|---|---|
| `GET /api/vistas/bombas/prediccion?campo&equipo` | `Prediccion` (con `llenado` si es de disposición y ya está parada) | `prediccion` (`diferido.ts:211`), `llenadoDe` (`:269`) |
| `GET /api/vistas/bombas/paradas?campo&equipo` | `ParadaMedida[]` (más reciente primero), con el tanque y el respaldo que regían al parar | `paradaMedida` (`diferido.ts:371`) |
| `GET /api/vistas/bombas/paradas-en-periodo?campos&desde&hasta` | `ParadaMedida + { horasEnPeriodo, bblEnPeriodo, cruzaBorde }` | `shared/api/diferidos.ts` |
| `GET /api/vistas/riesgo?campos` | `Riesgo[]` (con `costoFalla` «si falla hoy», `colchonH`, `mdtFuente`, `costoDe`) | `riesgoAhora` (`diferido.ts:528`), `costoDeBomba` (`:507`) |
| `GET /api/vistas/estado?campos` | `EstadoCampo[]` | `estadoCampo` (`diferido.ts:662`) |
| `GET /api/vistas/paradas/por-identificar?campos` | `Pregunta[]` (toda la historia); la cifra «por identificar» se cuenta con `cuentaPorIdentificar` | `libro(...).preguntas` (`libro.ts:883`) |
| `GET /api/vistas/equipos/:campo/:equipo/historia` | `{ eventos: EventoCargado[], bomba?: HistorialEquipo }` | `eventosCargadosA`, `historialDeEquipo` |
| `GET /api/vistas/equipos/:campo/:equipo/ficha?desde&hasta` | `FichaEquipo` | `pedirFichaEquipo` (`shared/api/equipos.ts:211`) |
| `GET /api/vistas/equipos/:campo/:equipo` | `EquipoVivo` | `equipoVivo` (`equipo-vivo.ts:25`) |
| `GET /api/vistas/confiabilidad?campos` | `[{ campoId, equipo, familia, h: HistorialEquipo }]` | `historialDeEquipo` |
| `GET /api/vistas/bombas?campos&desde&hasta` | `BombaVista[]` | `pedirBombas` (`shared/api/equipos.ts:262`) |
| `GET /api/vistas/campos/:campo/ahora` | `{ caudales, niveles }` | `caudalesAhora` (`diferido.ts:683`) + `NIVEL_AHORA` |

Casos de referencia que comprueban este capítulo (`node scripts/referencia.mjs comprobar`): `referencia/prediccion/{ceiba-P-201B, morichal-P-201B, morichal-MPP-301, guacamayo-P-201B}.json`, `referencia/riesgo/{ceiba, morichal, guacamayo, palmar, zarza, portafolio}.json`, `referencia/salud/bombas-*.json` (traen `veredicto` y `abierta`), `referencia/diferidos/*` (traen `preguntas`).

## Dónde sigue: el modelo choke (capítulo 5E)

Lo que este capítulo calcula por evento, por bomba y por equipo se lee también **por tramo de la tubería** (yacimiento, pozo, planta, afuera) en el capítulo 5E, con las mismas cuentas:

- **El tramo de cada parada** (5E.3) sale de la causa de 5B.2 y 5B.3 (la raíz de la cascada, la bomba que paró antes) y de la topología del campo (5E.1).
- **El colchón del tanque de agua** que se muestra en la tubería del agua (5E.6) es el de 5B.4 (`colchonDe`, `paradaMedida`, `prediccion`), con la misma cifra única por bomba (89.250 bbl/d en La Ceiba).
- **«Si falla hoy»** (5E.7) ordena los equipos por bbl/d (`FilaCriticidad.bpd`) en tres grupos (medido, techo, sin dato) y lleva al lado el costo de una falla de 5B.5 (`costoDeBomba` y la cuenta de `riesgoAhora`): no hay una cuenta nueva.
- **La fila ANH** (pozo × día operacional × causa, 5E.3) parte por día los tramos del libro y su clasificación de seis pasos va en 5E.9.

## Glosario mínimo del capítulo

| Término | Qué es |
|---|---|
| **Bomba de reinyección / disposición** | Bomba centrífuga (aquí P-201B, horizontal multietapa, API 610) que toma el agua separada del crudo y la inyecta a pozos inyectores. Con 95–97 % de agua es una de un **tren** en paralelo (La Ceiba P-201A/B/C, Morichal P-201A a G); P-201B es la que tiene medidor. Papel `disposicion`: el agua no tiene otra salida; papel `recobro`: inyecta para mantener presión y el agua tiene salida alterna. |
| **Bomba multifásica** | Bomba de doble tornillo (MPP-301, API 676) que lleva la mezcla crudo+agua+gas de un grupo de pozos (clúster) a la planta sin separarla. Papel `transporte`. |
| **Electrosumergible (ESP)** | Bomba de fondo del pozo, movida por un motor en el pozo y un variador en superficie (VSD). El variador reporta códigos de disparo (GF, OL, UL…). |
| **Corte de agua (BSW)** | Fracción de agua en el líquido producido: $\text{BSW} = \frac{Q_w}{Q_w + Q_o}$. |
| **Tanque de agua / alto-alto** | Tanque que recibe el agua separada antes de la bomba. «Alto-alto» (LSHH) es el nivel al que dispara la protección y obliga a dejar de producir agua. |
| **Colchón** | Horas que tarda el tanque en llegar al alto-alto si la bomba se para (ahora, con todo el campo produciendo). |
| **Llenado** | Con la bomba ya parada: cuándo llega el tanque al alto-alto con lo que la parada dejó sin salida y todavía no se quitó cerrando pozos (`Prediccion.llenado`). |
| **Si para / si falla hoy / le ha costado por falla** | «Si para»: crudo por día que se perdería (bbl/d). «Si falla hoy»: barriles que costaría una falla hoy, descontando el colchón (`Riesgo.costoFalla`). «Le ha costado por falla»: el promedio histórico de sus fallas cerradas (`bblPorFalla`). |
| **Respaldo** | Capacidad libre (bbl/d) que toma el agua cuando la bomba para: lo que las otras bombas del tren pueden mover de más, una bomba de reserva o un pozo de disposición alterno. Es configuración firmada. |
| **Primera alarma (first-out)** | La alarma que el PLC congela al disparar una máquina: la primera de la secuencia. |
| **Firma** | Parte de la bomba que estaba fuera de límite en el instante de parar, deducida de las señales. |
| **Disparo vs falla (ESP)** | Una ESP que vuelve a arrancar en menos de 24 h «disparó»; si tarda más, «falló» (hay que sacarla del pozo). |
| **MTBF / MDT** | Tiempo medio entre fallas (días) y tiempo medio fuera de servicio (horas), ISO 14224. |
| **ISA-101 / ISA-18.2** | Marcas de prioridad: P1 alarma ◆ rojo, P2 atención ▲ naranja, P3 aviso ■ amarillo, gris normal. |
