import { rolVisible } from '@/shared/config/producto'
import type { Rol, Capacidad } from './tipos'

/** Cada capacidad es un permiso que el servidor revisa en un endpoint (403
 *  sin ella), no una promesa. Las que ninguna acción revisaba (atribuir el
 *  diferido, firmar el potencial, cambiar criticidad, ajustar el umbral,
 *  cerrar el mes, suplantar) se quitaron: el libro sale de los equipos y no
 *  se edita, y el cambio de rol del menú es del demo, no del producto.
 *   · causa:declarar        POST /api/paradas/:evento/respuesta (en pantalla)
 *   · causa:completar       POST /api/analisis/:evento, y también POST /api/paradas/:evento/respuesta
 *                           (incluye a causa:declarar: `puedeHacer` en tipos.ts)
 *   · evidencia:exportar    POST /api/informes
 *   · conector:configurar   POST /api/campos/:campo/tags/:tag/equipo, POST /api/inscripcion y POST /api/planta/cambios
 *   · config:firmar         POST /api/configuracion con cambios técnicos
 *   · metas:firmar          POST /api/configuracion con metas, precio o regla de cierre
 *   · usuarios:administrar  POST /api/usuarios y PATCH /api/usuarios/:id
 *   · sap:aviso             POST /api/sap/avisos
 *   · asignacion:cargar     POST /api/asignacion-oficial: la oficial de un mes la
 *                           reemplaza quien la reporta (producción), no cualquiera
 *                           que tenga el campo; el operador y el técnico ni ven Producción.
 *   · planes:decidir        POST /api/planes/:id (aceptar / marcar ejecutado)
 *   · anh:clasificar        POST /api/anh/paradas/:id/clasificacion, y POST /api/anh/paradas/confirmar con
 *                           una sola parada. Quien declara: sup, oper, tec, prod, jefe y conf (P1 §1.15);
 *                           cada rol dice solo los pasos que son suyos (PASOS_QUE_DECLARA, anh-clasificacion.ts)
 *   · anh:confirmar         POST /api/anh/paradas/confirmar con varias (en lote): sup y prod, quienes
 *                           firman el día (CONFIRMAN_EN_LOTE, anh-paradas.ts)
 *   · anh:yacimiento        POST /api/anh/paradas/:id/yacimiento: prod y conf (PONEN_YACIMIENTO)
 *  El gerente no tiene ninguna de las tres: no ve el detalle técnico (P1 §1.15).
 *   · perdidas:registrar    A2 · POST /api/perdidas: oper (la ve), sup y prod (necesario-por-rol §4; entities/perdidas.ts)
 *   · orden:cerrar          A3 · POST /api/sap/ordenes/:numero/cierre: el técnico (necesario-por-rol §8; entities/orden-cierre.ts)
 *   · anh:enviar            A3 · POST /api/anh/respuestas: regulatorio (necesario-por-rol §10; entities/anh-respuestas.ts)
 *  A3 · «Lo que vio» (POST /api/paradas/:evento/vio) pide causa:declarar, y la conversión del
 *  árbol (POST /api/anh/conversion/importar) config:firmar, como la topología. */
const sin: Record<Capacidad, boolean> = {
  'causa:declarar': false, 'causa:completar': false, 'evidencia:exportar': false,
  'conector:configurar': false, 'config:firmar': false,
  'metas:firmar': false, 'usuarios:administrar': false, 'sap:aviso': false, 'asignacion:cargar': false,
  'planes:decidir': false, 'anh:clasificar': false, 'anh:confirmar': false, 'anh:yacimiento': false,
  'perdidas:registrar': false,
  'orden:cerrar': false, 'anh:enviar': false, // A3
}
const con = (...ks: Capacidad[]) => ({ ...sin, ...Object.fromEntries(ks.map(k => [k, true])) })

/** Pantallas depuradas: cada rol ve lo que su decisión exige, nada más.
 *  Una pantalla sale de un rol cuando todo lo que trae ya está en otra de las
 *  suyas (revisión del 6-oct-2026): Riesgo repite Turno para operación y Mi
 *  trabajo para el técnico; el gerente abre cualquier equipo desde Resumen y
 *  Riesgo. Al jefe de mantenimiento y a confiabilidad Riesgo sí les aporta: lo
 *  parado ahora y los equipos que no son de alto impacto (el aire de
 *  instrumentos); desde la revisión de la tanda 3 (K1 · P-10) eso vive en su
 *  Equipos, debajo de la lista. La topología es una proyección distinta según cómo piensa cada rol. */
/** Experiencia v2 (25-oct-2026, CONSTRUCCION.md): cada rol suma «La planta viva»
 *  y «Hoy» según sus puertas, sin perder ninguna pantalla de antes (sus
 *  direcciones siguen abriendo), y abre en su respuesta (X4 §3.4): el gerente y
 *  producción en La planta viva; supervisor, operador, técnico, jefe y
 *  planeadora en Hoy; confiabilidad en Equipos; regulatorio en su Reporte; el
 *  administrador en Configurar. El orden de `pantallas` dice cuál se abre
 *  primero dentro de cada puerta.
 *  Orden de organigrama: la dirección arriba, y debajo cada área con su
 *  jefatura primero y el campo al final. */
export const ROLES: Rol[] = [
  { id: 'ger', nivel: 'decision', nombre: 'Gerente de activo', persona: 'Andrés Vélez', iniciales: 'AV',
    // C5 (X4 §3.6, puntos 2, 4 y 5): su Resumen, sus Diferidos y su Producción se fundieron en La planta viva y
    // Resultados, y su Riesgo en La planta viva (Durante y Antes) y Equipos (C4: lo parado o avisa); sus
    // direcciones abren ahí (`FUSIONADA_EN`, url.ts).
    // B3 · A-16: su pantalla Equipos sale (repite «Diferido por equipo»); su dirección abre Resultados (`FUSIONADA_EN_ROL`).
    pantallas: ['plantaViva', 'resultados', 'configuracion'], inicio: 'plantaViva', topologia: null,
    foco: 'Barriles que no se produjeron, el retorno posible del ciclo antes / durante / después, y si baja contra la meta que usted firmó. Usted fija las metas de cada campo y da los accesos.',
    area: 'direccion',
    campos: 'todos',
    puede: con('evidencia:exportar', 'metas:firmar', 'usuarios:administrar') },
  { id: 'prod', nivel: 'ingenieria', nombre: 'Ingeniera de producción', persona: 'Marcela Ríos', iniciales: 'MR',
    // B3 (pedido de B2): Hoy sale (confirmar y la asignación van en su inicio) y Diferidos (A-09); Electrosumergibles
    // es un filtro de Equipos (A-15). Sin puerta: Producción, «Una por una», Equipos, Pozos, Planta y Agua, a un toque.
    pantallas: ['plantaViva', 'resultados', 'equipos', 'produccion', 'pozos', 'causa', 'planta', 'agua', 'configuracion', 'filosofia'], inicio: 'plantaViva', topologia: 'produccion',
    foco: 'Explicas el mes en barriles: el factor de asignación en banda, la custodia completa y nada sin identificar.',
    area: 'produccion',
    campos: ['ceiba', 'palmar'],
    puede: con('evidencia:exportar', 'asignacion:cargar', 'anh:clasificar', 'anh:confirmar', 'anh:yacimiento', 'perdidas:registrar') },
  { id: 'sup', nivel: 'operacion', nombre: 'Supervisor de operaciones', persona: 'Nelson Ortiz', iniciales: 'NO',
    // B3 (experiencia v3, flujos.md §2): Hoy y Equipos. Turno (A-01), Bombas y Electrosumergibles (A-15), Pozos (B-05) y
    // La planta viva (B-01) salen; «Ver una por una» abre la cadena de 6 pasos (`causa`, sin puerta propia).
    pantallas: ['hoy', 'equipos', 'causa'], inicio: 'hoy', topologia: 'proceso',
    foco: 'Durante: turno, identificar y orden de cierre. Antes: bombas y lo que hay que vigilar. Si una para, cierras en el orden que menos cuesta.',
    area: 'produccion',
    campos: ['ceiba'],
    puede: con('causa:declarar', 'evidencia:exportar', 'sap:aviso', 'planes:decidir', 'anh:clasificar', 'anh:confirmar', 'perdidas:registrar') },
  { id: 'oper', nivel: 'operacion', nombre: 'Operador de campo', persona: 'Jairo Peña', iniciales: 'JP',
    // B3: una sola pantalla, sin menú (§9.4). Equipos queda solo para abrir la ficha (nivel 3) desde la pregunta.
    pantallas: ['hoy', 'equipos', 'causa'], inicio: 'hoy', topologia: 'proceso',
    foco: 'Cómo están las bombas, a qué equipo vas, y qué se dañó cuando la señal no lo dice.',
    area: 'produccion',
    campos: ['ceiba'],
    puede: con('causa:declarar', 'sap:aviso', 'anh:clasificar', 'perdidas:registrar') },
  { id: 'jefe', nivel: 'ingenieria', nombre: 'Jefe de mantenimiento', persona: 'Camilo Rueda', iniciales: 'CR',
    // K1 · P-10 (X4 §3.6, punto 2): su Riesgo se fundió en Equipos (debajo de la lista, con «Ojo: no conviene
    // intervenirlas hoy» arriba); su dirección abre Equipos (`FUSIONADA_EN_ROL`, url.ts).
    // B3: Hoy, Equipos y Resultados. Mantenimiento como estaba (A-12) se borra: lo suyo está en su Hoy (las fallas del
    // mes, la espera en 5 tramos, «No intervenir hoy», el programa de paradas y «por parte», a un toque).
    pantallas: ['hoy', 'equipos', 'resultados', 'causa'], inicio: 'hoy',
    topologia: null,
    foco: 'Antes: intervenir a tiempo. Durante: identificar y planes simulados. Después: palancas y partes — para que bajen los barriles diferidos.',
    area: 'mantenimiento',
    campos: 'todos',
    puede: con('causa:completar', 'evidencia:exportar', 'sap:aviso', 'planes:decidir', 'anh:clasificar') },
  { id: 'conf', nivel: 'ingenieria', nombre: 'Ingeniero de confiabilidad', persona: 'Edwin Maestre', iniciales: 'EM',
    // K1 · P-10: su Riesgo se fundió en Equipos (debajo de la lista; «¿Dónde va el próximo instrumento?» arriba).
    // B3: Equipos (con lo que le toca hacer arriba: su Hoy se funde aquí) y Confiabilidad, en la puerta Resultados (B-03).
    pantallas: ['equipos', 'confiabilidad', 'causa', 'configuracion', 'filosofia'], inicio: 'equipos', topologia: 'proceso',
    foco: 'Antes: vigía, aciertos y riesgo. Después: MTBF y costo por falla. La reparación activa, no la espera del repuesto.',
    area: 'mantenimiento',
    campos: ['ceiba', 'morichal', 'guacamayo'],
    puede: con('causa:completar', 'evidencia:exportar', 'sap:aviso', 'planes:decidir', 'anh:clasificar', 'anh:yacimiento') },
  { id: 'plan', nivel: 'ingenieria', nombre: 'Planeadora de mantenimiento', persona: 'Luz Caro', iniciales: 'LC',
    pantallas: ['hoy', 'equipos', 'resultados', 'equipo', 'confiabilidad'], inicio: 'hoy', topologia: 'proceso',
    foco: 'El horizonte es lo que deja pedir el repuesto sin pagar urgencia.',
    area: 'mantenimiento',
    campos: ['ceiba', 'morichal'],
    puede: con('evidencia:exportar') },
  { id: 'tec', nivel: 'operacion', nombre: 'Técnico de mantenimiento', persona: 'Óscar Daza', iniciales: 'OD',
    // F1 · P-trabajo-1 (X4 §3.6.3 y §3.7): Mi trabajo se fundió en Hoy (sus órdenes, lo que vigilar y el
    // programa ya están ahí); su dirección abre Hoy (`FUSIONADA_EN`, url.ts).
    // B3: una sola pantalla, sin menú: Hoy (con su orden de SAP y la ficha del equipo a un toque).
    pantallas: ['hoy', 'equipos', 'causa'], inicio: 'hoy', topologia: 'proceso',
    foco: 'Abres el equipo y dices qué encontraste cuando la señal no lo dice. De ahí aprende el vigía.',
    area: 'mantenimiento',
    campos: ['ceiba'],
    puede: con('causa:declarar', 'anh:clasificar', 'orden:cerrar') },
  { id: 'reg', nivel: 'ingenieria', nombre: 'Cumplimiento regulatorio', persona: 'Iván Salas', iniciales: 'IS',
    // B3: una sola pantalla, sin menú: el Reporte (la planta viva y Resultados salen de sus puertas: B-01 y B-03).
    pantallas: ['regulatorio'], inicio: 'regulatorio', topologia: 'medicion',
    foco: 'Cada parada en el árbol de la circular, con lo que va a la ANH, y la medición viva. Nunca la tocamos.',
    area: 'soporte',
    campos: 'todos',
    puede: con('evidencia:exportar', 'anh:enviar') },
  { id: 'adm', nivel: 'ingenieria', nombre: 'Administrador de la implementación', persona: 'Hermes Leal', iniciales: 'HL',
    // B3: una sola pantalla, sin menú: Configurar (cada paso abre su editor; Conectores es uno). B-01 y B-04.
    pantallas: ['configuracion', 'filosofia', 'conectores', 'planta', 'agua'], inicio: 'configuracion', topologia: 'proceso',
    foco: 'Configuras conectores, umbrales, tanques, respaldos y el programa de paradas. Las metas y los accesos los da el gerente de activo.',
    area: 'plataforma',
    campos: 'todos',
    puede: con('evidencia:exportar', 'conector:configurar', 'config:firmar') },
]
/** B3 · A-21: abastecimiento (cont) salió del producto. Su dirección dice que no está, como la de un rol
 *  apagado (la planeadora), sin abrir otro rol en silencio (A-22). */
export const ROLES_RETIRADOS: Readonly<Record<string, string>> = { cont: 'Abastecimiento y contratos' }
/** Roles del primer producto. Los de v2 siguen declarados pero no se ofrecen. */
export const ROLES_VISIBLES = ROLES.filter(r => rolVisible(r.id))
/** Con qué rol se entra. Se declara aparte para que reordenar el menú no
 *  cambie por accidente la pantalla con la que abre la aplicación. */
export const ROL_INICIAL = 'prod'
/** El rol para NAVEGAR el demo: un id que no se ofrece cae en el de inicio. El
 *  servidor nunca usa este respaldo (C-14): revisa con `rolExacto`. */
export const rolPorId = (id: string) =>
  ROLES.find(r => r.id === id && rolVisible(r.id))
  ?? ROLES.find(r => r.id === ROL_INICIAL)
  ?? ROLES_VISIBLES[0]!
/** El rol tal cual, SIN respaldo: undefined si no existe o no se ofrece en el
 *  primer producto (los de la versión 2). Es el que usa el servidor en cada
 *  escritura (C-14): un rol sin entrada no tiene capacidades, y una persona con
 *  un rol oculto no escribe con las de producción. */
export const rolExacto = (id: string): Rol | undefined => ROLES.find(r => r.id === id && rolVisible(r.id))
