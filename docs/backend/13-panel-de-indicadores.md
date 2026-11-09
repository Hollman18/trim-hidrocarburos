# 13. El panel de indicadores a medida

> Fase 7 de facilidades (4-nov-2026), pieza Núcleo. Motor: `src/entities/indicadores.ts`. Costura: `src/shared/api/panel.ts`. Pantalla: `src/pages/Panel.tsx` («Mi panel», en la puerta Resultados). Contrato: CONTRATO.md, «El panel de indicadores». Prueba: `scripts/verificar-indicadores.mjs` (36 comprobaciones) y `e2e/facilidades-f7.spec.ts`.

## 13.1 Qué resuelve

El gerente, producción y confiabilidad arman su propio panel con dos cosas:
- **indicadores del catálogo**, cada uno con su fórmula, su fuente y su ventana (en la ⓘ de la tarjeta);
- **cualquier señal ya conectada** de sus campos, con la tendencia del kit SCADA.

Todo se dibuja con el kit (`Cifra`, `Columnas`, `Tendencia`), así que se ve igual que el resto del producto en los dos temas y en el teléfono.

## 13.2 El catálogo

Cada indicador tiene un **núcleo puro** que la prueba compara con un caso calculado a mano, y un adaptador que le pasa los datos del motor.

| Indicador | Fórmula | Fuente | Ventana | Pieza | Caso a mano |
|---|---|---|---|---|---|
| Diferido por causa | Por mes, Σ barriles diferidos de cada tramo del libro por tipo de causa. Las 4 que más suman, aparte; las demás, en «Otras» | El libro de diferidos | 6 meses, con el mes en curso | Barriles | 6 causas en 2 meses: 150 y 60 bbl; Aire 4 + Programada 1 = 5 en «Otras» |
| MTBF de la flota | Σ días de historia de cada equipo ÷ Σ fallas. Bombas con perfil y electrosumergibles; los disparos no cuentan. Con menos de 2 fallas, sin dato | El historial de fallas (PLC + causa) | Toda la historia | Equipos | 1.095 días ÷ 4 fallas = 273,75 días |
| MTTR (reparación activa) | Promedio de horas confirmadas de las PM01 con cierre técnico (TECO) en la ventana. La espera no entra | Órdenes de SAP PM | 12 meses | Mantenimiento | (6 + 10) ÷ 2 = 8 h; fuera la cerrada antes, la abierta y la preventiva |
| Horas preventivo y predictivo contra correctivo | (PM02 + PM03) ÷ (PM02 + PM03 + PM01) × 100, por la fecha de cierre | Órdenes de SAP PM | 12 meses | Mantenimiento | (6 + 4) ÷ 20 = 50 % |
| Cortes de energía por mes | Por mes, los disparos del relé de llegada (servicio «energía»), por la fecha en que empezaron; horas hasta que volvió | El relé (IEC 61850 o DNP3) | 12 meses | Energía | Agosto 2 cortes, 5 h (el de las 23:30 del 31 es de agosto en Bogotá); septiembre 2, 124,5 h (uno sigue caído) |
| Margen N-1 | Lo mayor entre la carga de la unidad más cargada − la reserva rápida de las demás y la carga total − su capacidad. Si falta, qué soltar primero, por menos crudo por kW | La tabla de generación y de cargas + el crudo de TRIM | Ahora | Energía | Cae G-1 (700 kW); reserva 200 + 180; faltan 320 kW |

## 13.3 «Sin dato» y por qué

Un indicador sin dato dice **«Sin dato»** y el motivo; nunca un cero que no se midió:
- el margen N-1 sin tabla de generación (el demo no la tiene);
- el MTBF con menos de 2 fallas, el MTTR sin correctivas cerradas, las horas sin órdenes en la ventana;
- los cortes de un campo sin el relé conectado (un mes sin cortes no se distingue de un mes sin datos);
- una señal que ya no está conectada;
- un indicador de una pieza que el campo no contrató: «La pieza Energía no está contratada en La Ceiba.».

Una señal sin límite firmado se muestra como cifra, no como gráfica: la escala sale de los límites, nunca de las lecturas (kit §1).

## 13.4 Guardar el panel

`POST /api/paneles` guarda el panel **entero** (como mucho 12 elementos). Lo puede quien tiene la pantalla `panel` en su rol: gerente, producción y confiabilidad. No hay capacidad nueva: es una preferencia de la persona, y el servidor revisa la pantalla del rol (`403 sin-pantalla`). Valida el campo (`404 campo-ajeno`), el indicador, la señal y los ids (`422 panel-invalido`). Con sesión, el rol y los campos salen del token.

Sin panel guardado, la vista trae **el de ejemplo de su rol** (`ejemplo: true`) y la pantalla lo dice. El primer cambio guarda el de ejemplo con el cambio.

**El servidor de producción necesita:** guardar un panel por persona (no por rol, como el demo); calcular cada valor con las mismas reglas (`valorIndicador`, `valorSenal`); y, con la tabla de generación de un campo, el margen N-1.

## 13.5 Lo que cambió en el demo

- «Mi panel» entra en la puerta Resultados de `ger`, `prod` y `conf`. La prueba del armazón dice ahora «Confiabilidad, Mi panel».
- La pantalla es del Núcleo. Con solo Energía contratada, el gerente aterriza en su panel (los cortes de energía), no en «Metas y accesos» (`verificar-piezas.mjs` §5).
- `ordenOptimo` y el deslastre de la Fase 6 comparten la misma mochila (`mochila`, `libro.ts`).
