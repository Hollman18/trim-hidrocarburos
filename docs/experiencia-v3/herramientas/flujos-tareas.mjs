// Las tareas más frecuentes de cada rol (X4 §2, R-revision/roles), recorridas de verdad.
const acepta = () => ({ click: 'Aceptar lo que TRIM dedujo', nth: 0, espera: 600, tag: 'aceptar-grupo' })
const PORT = 'ceiba~portafolio'
export const flujos = [
 // ── ger
 { id: 'ger-1-quien-esta-en-ello', rol: 'ger', tarea: 'Ver dónde se trabó y quién está en ello, y volver a sus 5 campos',
   pasos: [ { go: `#/ger/planta-viva/${PORT}/curso`, tag: 'inicio' }, { click: 'La Ceiba: 1.966 bbl/d. Abrir el campo', solo390: 1, tag: 'campo' }, { click: 'Ver qué se está haciendo', tag: 'ficha' }, { css: '[role=dialog] button[aria-label*="Cerrar"]', tag: 'cerrar-ficha', ver: 1 } ] },
 { id: 'ger-2-firmar-metas', rol: 'ger', tarea: 'Firmar las metas del mes',
   pasos: [ { go: `#/ger/planta-viva/${PORT}/curso`, tag: 'inicio' }, { click: 'Andrés Vélez · Gerente de activo', tag: 'menu' }, { click: 'Metas y accesos', tag: 'elija-un-campo' }, { css: 'button:has-text("La Ceiba"):has-text("Llanos")', tag: 'la-ceiba' }, { mirar: 'Firmar la versión', exacto: true, tag: 'firmar' } ] },
 { id: 'ger-3-el-mes', rol: 'ger', tarea: '¿Está bajando? Ver el mes',
   pasos: [ { go: `#/ger/planta-viva/${PORT}/curso`, tag: 'inicio' }, { css: 'button:has-text("Después")', tag: 'despues', ver: 1 }, { click: 'Resultados', exacto: true, tag: 'resultados', ver: 1, tel: 'nav' } ] },
 { id: 'ger-4-campo-y-equipo', rol: 'ger', tarea: 'Abrir el campo que más deja de producir y su equipo',
   pasos: [ { go: `#/ger/planta-viva/${PORT}/curso`, tag: 'inicio' }, { click: 'La Ceiba: 1.966 bbl/d. Abrir el campo', tag: 'campo' }, { click: 'Ver qué se está haciendo', tag: 'ficha' } ] },
 // ── prod
 { id: 'prod-1-confirmar-lote', rol: 'prod', tarea: 'Confirmar las paradas del día en lote',
   pasos: [ { go: '#/prod/planta-viva/ceiba/curso', tag: 'inicio' }, { click: 'Ver Hoy', tag: 'hoy' }, { click: 'Confirmar las 2', tag: 'confirmadas' } ] },
 { id: 'prod-2-asignacion', rol: 'prod', tarea: 'Cargar la asignación oficial de septiembre',
   pasos: [ { go: '#/prod/planta-viva/ceiba/curso', tag: 'inicio' }, { click: 'Ver Hoy', tag: 'hoy' }, { click: 'Cargarla', tag: 'produccion', ver: 1 }, { mirar: 'Cuadre · asignación oficial', tag: 'formulario' }, { escribir: 'asignación de septiembre reportada a la ANH', css2: 'input[aria-label="Motivo de la carga"]', tag: 'motivo' } ] },
 { id: 'prod-3-si-falla-hoy', rol: 'prod', tarea: 'Ver qué limita hoy y abrir el primero de «Si falla hoy»',
   pasos: [ { go: '#/prod/planta-viva/ceiba/curso', tag: 'inicio' }, { click: 'P-201A bomba de agua · sin instrumento 3.059 después de 2 min', tag: 'p201a' } ] },
 // ── sup
 { id: 'sup-1-confirmar-lote', rol: 'sup', tarea: 'Confirmar 2 paradas iguales',
   pasos: [ { go: '#/sup/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Confirmar las 2', tag: 'confirmadas' } ] },
 { id: 'sup-2-causa', rol: 'sup', tarea: 'Conseguir la causa de LC-21 (nadie contestó)',
   pasos: [ { go: '#/sup/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Responder yo', tag: 'responder' }, { texto: 'Cierre para prueba o intervención del pozo', tag: 'respondida' } ] },
 { id: 'sup-3-entregar-turno', rol: 'sup', tarea: 'Entregar el turno',
   pasos: [ { go: '#/sup/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Entregar turno', tag: 'resumen' }, { click: 'Compartir en PDF', tag: 'pdf' } ] },
 { id: 'sup-4-turno-subpantalla', rol: 'sup', tarea: 'Lo mismo, por la subpantalla «Turno» del panel',
   pasos: [ { go: '#/sup/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Turno', exacto: true, tag: 'turno', ver: 1 } ], solo: '1440' },
 { id: 'sup-5-planes', rol: 'sup', tarea: 'Decidir los planes de P-201B',
   pasos: [ { go: '#/sup/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Ver los planes', tag: 'nivel3-sin-planes' }, { click: 'Ver el diagnóstico', tag: 'nivel4' }, { mirar: 'Planes · lo que todavía se puede mover', tag: 'planes' }, { click: 'Aceptar', exacto: true, tag: 'aceptado' } ] },
 // ── oper
 { id: 'oper-1-que-se-dano', rol: 'oper', tarea: 'Contestar qué se dañó en P-201B',
   pasos: [ { go: '#/oper/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Contestar', solo1440: 1, tag: 'abrir-pregunta' }, { texto: 'Sello mecánico', tag: 'parte' }, { texto: 'Fuga hacia afuera', tag: 'registrada' } ] },
 { id: 'oper-2-por-que-paro', rol: 'oper', tarea: 'Contestar por qué paró LC-21',
   pasos: [ { go: '#/oper/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Contestar', nth: 1, tag: 'abrir-pregunta' }, { texto: 'Cierre para prueba o intervención del pozo', tag: 'registrada' } ], solo: '1440' },
 { id: 'oper-3-aviso-sap', rol: 'oper', tarea: 'Avisar a SAP que P-201B está parada',
   pasos: [ { go: '#/oper/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Ver P-201B', tag: 'nivel3', solo1440: 1 }, { click: 'Crear aviso en SAP', tag: 'panel-sap' }, { mirar: 'Enviar aviso a SAP', tag: 'enviar' } ], solo: '1440' },
 // ── tec
 { id: 'tec-1-que-se-dano', rol: 'tec', tarea: 'Decir qué se dañó en P-201B',
   pasos: [ { go: '#/tec/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Contestar', tag: 'abrir-pregunta' }, { texto: 'Sello mecánico', tag: 'parte' }, { texto: 'Fuga hacia afuera', tag: 'registrada' } ] },
 { id: 'tec-2-orden-k101', rol: 'tec', tarea: 'Atender la orden de K-101',
   pasos: [ { go: '#/tec/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Ver la orden', tag: 'nivel3' }, { click: 'Ver la orden en SAP', tag: 'orden', ver: 1 } ] },
 { id: 'tec-3-ver-equipo', rol: 'tec', tarea: 'Ver el equipo que le toca',
   pasos: [ { go: '#/tec/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Ver P-201B', tag: 'nivel3' } ] },
 // ── jefe
 { id: 'jefe-1-orden-k101', rol: 'jefe', tarea: 'Seguir la orden de K-101 (ya pasó el límite)',
   pasos: [ { go: '#/jefe/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Ver la orden', tag: 'nivel3' }, { click: 'Ver la orden en SAP', tag: 'orden' } ] },
 { id: 'jefe-2-planes', rol: 'jefe', tarea: 'Decidir los 3 planes de P-201B',
   pasos: [ { go: '#/jefe/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Ver los planes', tag: 'nivel3-sin-planes' }, { click: 'Ver el diagnóstico', tag: 'nivel4' }, { mirar: 'Planes · lo que todavía se puede mover', tag: 'planes' }, { click: 'Aceptar', exacto: true, tag: 'aceptado' } ] },
 { id: 'jefe-3-espera', rol: 'jefe', tarea: 'Ver de dónde sale «7,7 de 8,1 días son espera»',
   pasos: [ { go: '#/jefe/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Resultados', exacto: true, tag: 'resultados', tel: 'nav' }, { click: 'Confiabilidad', exacto: true, tag: 'confiabilidad' }, { mirar: 'Reparación activa y espera', tag: 'espera' } ], solo: '1440' },
 { id: 'jefe-4-no-intervenir', rol: 'jefe', tarea: '«Ojo: no intervenir P-201A y P-201C hoy»',
   pasos: [ { go: '#/jefe/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Ver P-201A y P-201C', tag: 'lista' }, { click: 'P-201A', nth: 0, tag: 'p201a' } ] },
 // ── conf
 { id: 'conf-1-atacar-primero', rol: 'conf', tarea: 'Qué atacar primero: abrir P-201A',
   pasos: [ { go: '#/conf/equipos/ceiba', tag: 'inicio' }, { click: 'P-201A', nth: 0, tag: 'p201a' } ] },
 { id: 'conf-2-vigia', rol: 'conf', tarea: '¿Le creo al vigía?',
   pasos: [ { go: '#/conf/equipos/ceiba', tag: 'inicio' }, { click: 'Ver el detalle', tag: 'confiabilidad' } ] },
 { id: 'conf-3-repetido', rol: 'conf', tarea: 'Bajar por su inicio: P-201A aparece tres veces',
   pasos: [ { go: '#/conf/equipos/ceiba', tag: 'inicio' }, { mirar: 'P-201A', nth: 1, tag: 'segunda-vez' }, { mirarCss: '[aria-label^="P-201A, bomba de agua: si falla hoy"]', tag: 'tercera-vez' } ] },
 // ── reg
 { id: 'reg-1-pedir-causa', rol: 'reg', tarea: 'Pedir la causa de LC-21 a quien la debe',
   pasos: [ { go: '#/reg/regulatorio/ceiba/curso', tag: 'inicio' }, { click: 'LC-21', nth: 0, tag: 'ficha-sin-accion', ver: 1 } ] },
 { id: 'reg-2-exportar-septiembre', rol: 'reg', tarea: 'Exportar el reporte de septiembre a la ANH (un campo)',
   pasos: [ { go: '#/reg/regulatorio/ceiba/curso', tag: 'inicio' }, { click: 'Período: Octubre, en curso', tag: 'periodo' }, { texto: 'Septiembre · cerrado', tag: 'septiembre' }, { click: 'Exportar', exacto: true, tag: 'exportar' }, { texto: 'CSV para la ANH', tag: 'csv' } ] },
 { id: 'reg-3-todos-los-campos', rol: 'reg', tarea: 'Ver si se puede publicar en sus 5 campos',
   pasos: [ { go: '#/reg/regulatorio/ceiba/curso', tag: 'inicio' }, { click: 'Todos mis campos', tag: 'elija-un-campo', ver: 1 } ] },
 // ── adm
 { id: 'adm-1-que-falta', rol: 'adm', tarea: 'Ver qué le falta a La Ceiba', pasos: [ { go: '#/adm/configuracion/ceiba/curso', tag: 'inicio' } ] },
 { id: 'adm-2-firmar-topologia', rol: 'adm', tarea: 'Firmar a qué pozos sirve cada equipo (La Ceiba)',
   pasos: [ { go: '#/adm/configuracion/ceiba/curso', tag: 'inicio' }, { click: 'A qué pozos sirve cada equipo', nth: 0, tag: 'paso1' }, acepta(), acepta(), acepta(), acepta(), acepta(), acepta(), acepta(), acepta(), { click: '3 Ver el impacto y firmar', tag: 'paso3-bloqueado' }, { click: 'Ver lo que falta', tag: 'sin-responder-0' } ], solo: '1440' },
 { id: 'adm-3-tags', rol: 'adm', tarea: 'Asociar los tags sin equipo',
   pasos: [ { go: '#/adm/configuracion/ceiba/curso', tag: 'inicio' }, { click: 'Conectores', exacto: true, tag: 'conectores', tel: 'nav' }, { mirar: 'Tags por asociar', tag: 'tags' }, { mirar: 'Aplicar las 3', toque: 1, tag: 'aplicar' } ] },
 // ── plan y cont (apagados en el MVP)
 { id: 'plan-1-repuesto', rol: 'plan', tarea: '¿Qué repuesto pido ya?',
   pasos: [ { go: '#/plan/hoy/ceiba/curso', tag: 'abre-produccion', ver: 1 } ] },
 { id: 'cont-1-evidencia', rol: 'cont', tarea: '¿Esta parada le toca al contratista?',
   pasos: [ { go: '#/cont/evidencia/ceiba/curso', tag: 'abre-produccion', ver: 1 } ] },
]
flujos.push(
 { id: 'plan-2-programa', rol: 'plan', tarea: '¿Qué programo esta semana?', pasos: [ { go: '#/plan/resultados/ceiba/curso', tag: 'abre-produccion', ver: 1 } ] },
 { id: 'plan-3-alcanza', rol: 'plan', tarea: '¿Alcanza el repuesto de P-201B?', pasos: [ { go: '#/plan/equipos/ceiba/P-201B', tag: 'abre-produccion', ver: 1 } ] },
 { id: 'cont-2-expediente', rol: 'cont', tarea: 'Exportar el expediente de una parada', pasos: [ { go: '#/cont/evidencia/ceiba/cerrado', tag: 'abre-produccion', ver: 1 } ] },
 { id: 'cont-3-paradas-externas', rol: 'cont', tarea: 'Ver las paradas con responsable externo', pasos: [ { go: '#/cont/paradas/ceiba/curso', tag: 'abre-produccion', ver: 1 } ] },
)
const exp = (campo) => [ { click: 'Campo: ', exacto: false, tag: 'selector' }, { texto: campo, nth: 0, tag: 'campo' }, { click: 'Exportar', exacto: true, tag: 'exportar' }, { texto: 'CSV para la ANH', tag: 'csv' } ]
flujos.push(
 { id: 'reg-4-exportar-5-campos', rol: 'reg', tarea: 'Exportar septiembre a la ANH de sus 5 campos', solo: '1440',
   pasos: [ { go: '#/reg/regulatorio/ceiba/curso', tag: 'inicio' }, { click: 'Período: Octubre, en curso', tag: 'periodo' }, { texto: 'Septiembre · cerrado', tag: 'septiembre' }, { click: 'Exportar', exacto: true, tag: 'exportar' }, { texto: 'CSV para la ANH', tag: 'csv' },
     ...exp('Morichal Norte'), ...exp('Guacamayo'), ...exp('El Palmar'), ...exp('La Zarza') ] },
 { id: 'sup-6-cambiar-de-puerta', rol: 'sup', tarea: 'Pasar de Hoy a Equipos',
   pasos: [ { go: '#/sup/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Equipos', exacto: true, tel: 'nav', tag: 'equipos' } ] },
)
flujos.push(
 { id: 'jefe-5-responder-yo', rol: 'jefe', tarea: 'Contestar él mismo qué se dañó en P-201B',
   pasos: [ { go: '#/jefe/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Responder yo', tag: 'abrir-pregunta' }, { texto: 'Sello mecánico', tag: 'parte' }, { texto: 'Fuga hacia afuera', tag: 'registrada' } ] },
 { id: 'sup-7-una-por-una', rol: 'sup', tarea: 'Confirmar una por una (Identificar)',
   pasos: [ { go: '#/sup/hoy/ceiba/curso', tag: 'inicio' }, { click: 'Ver una por una', tag: 'identificar' }, { mirar: 'Ver el chat de Jairo Peña', tag: 'whatsapp' } ] },
)
