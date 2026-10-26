import { rolVisible } from '@/shared/config/producto'
import type { Rol, Capacidad } from './tipos'

/** Cada capacidad es un permiso que el servidor revisa en un endpoint (403
 *  sin ella), no una promesa. Las que ninguna acción revisaba (atribuir el
 *  diferido, firmar el potencial, cambiar criticidad, ajustar el umbral,
 *  cerrar el mes, suplantar) se quitaron: el libro sale de los equipos y no
 *  se edita, y el cambio de rol del menú es del demo, no del producto.
 *   · causa:declarar        POST /api/paradas/:evento/respuesta (pantalla y WhatsApp)
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
 *  El gerente no tiene ninguna de las tres: no ve el detalle técnico (P1 §1.15). */
const sin: Record<Capacidad, boolean> = {
  'causa:declarar': false, 'causa:completar': false, 'evidencia:exportar': false,
  'conector:configurar': false, 'config:firmar': false,
  'metas:firmar': false, 'usuarios:administrar': false, 'sap:aviso': false, 'asignacion:cargar': false,
  'planes:decidir': false, 'anh:clasificar': false, 'anh:confirmar': false, 'anh:yacimiento': false,
}
const con = (...ks: Capacidad[]) => ({ ...sin, ...Object.fromEntries(ks.map(k => [k, true])) })

/** Pantallas depuradas: cada rol ve lo que su decisión exige, nada más.
 *  Una pantalla sale de un rol cuando todo lo que trae ya está en otra de las
 *  suyas (revisión del 6-oct-2026): Riesgo repite Turno para operación y Mi
 *  trabajo para el técnico; el gerente abre cualquier equipo desde Resumen y
 *  Riesgo. Al jefe de mantenimiento y a confiabilidad Riesgo sí les aporta: lo
 *  parado ahora y los equipos que no son de alto impacto (el aire de
 *  instrumentos). La topología es una proyección distinta según cómo piensa cada rol. */
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
    pantallas: ['plantaViva', 'equipos', 'resultados', 'configuracion'], inicio: 'plantaViva', topologia: null,
    foco: 'Barriles que no se produjeron, el retorno posible del ciclo antes / durante / después, y si baja contra la meta que usted firmó. Usted fija las metas de cada campo y da los accesos.',
    area: 'direccion',
    campos: 'todos',
    puede: con('evidencia:exportar', 'metas:firmar', 'usuarios:administrar') },
  { id: 'prod', nivel: 'ingenieria', nombre: 'Ingeniera de producción', persona: 'Marcela Ríos', iniciales: 'MR',
    pantallas: ['plantaViva', 'hoy', 'equipos', 'resultados', 'produccion', 'diferidos', 'pozos', 'esp', 'causa', 'planta', 'agua', 'configuracion', 'filosofia'], inicio: 'plantaViva', topologia: 'produccion',
    foco: 'Explicas el mes en barriles: el factor de asignación en banda, la custodia completa y nada sin identificar.',
    area: 'produccion',
    campos: ['ceiba', 'palmar'],
    puede: con('evidencia:exportar', 'asignacion:cargar', 'anh:clasificar', 'anh:confirmar', 'anh:yacimiento') },
  { id: 'sup', nivel: 'operacion', nombre: 'Supervisor de operaciones', persona: 'Nelson Ortiz', iniciales: 'NO',
    pantallas: ['hoy', 'plantaViva', 'equipos', 'bombas', 'esp', 'turno', 'causa', 'pozos'], inicio: 'hoy', topologia: 'proceso',
    foco: 'Durante: turno, identificar y orden de cierre. Antes: bombas y lo que hay que vigilar. Si una para, cierras en el orden que menos cuesta.',
    area: 'produccion',
    campos: ['ceiba'],
    puede: con('causa:declarar', 'evidencia:exportar', 'sap:aviso', 'planes:decidir', 'anh:clasificar', 'anh:confirmar') },
  { id: 'oper', nivel: 'operacion', nombre: 'Operador de campo', persona: 'Jairo Peña', iniciales: 'JP',
    pantallas: ['hoy', 'plantaViva', 'equipos', 'bombas', 'esp', 'causa', 'turno'], inicio: 'hoy', topologia: 'proceso',
    foco: 'Cómo están las bombas, a qué equipo vas, y qué se dañó cuando la señal no lo dice.',
    area: 'produccion',
    campos: ['ceiba'],
    puede: con('causa:declarar', 'sap:aviso', 'anh:clasificar') },
  { id: 'jefe', nivel: 'ingenieria', nombre: 'Jefe de mantenimiento', persona: 'Camilo Rueda', iniciales: 'CR',
    pantallas: ['hoy', 'plantaViva', 'equipos', 'resultados', 'mantenimiento', 'diferidos', 'bombas', 'esp', 'confiabilidad', 'equipo', 'riesgo', 'causa'], inicio: 'hoy',
    topologia: null,
    foco: 'Antes: intervenir a tiempo. Durante: identificar y planes simulados. Después: palancas y partes — para que bajen los barriles diferidos.',
    area: 'mantenimiento',
    campos: 'todos',
    puede: con('causa:completar', 'evidencia:exportar', 'sap:aviso', 'planes:decidir', 'anh:clasificar') },
  { id: 'conf', nivel: 'ingenieria', nombre: 'Ingeniero de confiabilidad', persona: 'Edwin Maestre', iniciales: 'EM',
    pantallas: ['equipos', 'bombas', 'esp', 'hoy', 'plantaViva', 'resultados', 'confiabilidad', 'diferidos', 'riesgo', 'equipo', 'causa', 'planta', 'agua', 'configuracion', 'filosofia'], inicio: 'equipos', topologia: 'proceso',
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
    pantallas: ['hoy', 'plantaViva', 'equipos', 'trabajo', 'bombas', 'esp', 'causa'], inicio: 'hoy', topologia: 'proceso',
    foco: 'Abres el equipo y dices qué encontraste cuando la señal no lo dice. De ahí aprende el vigía.',
    area: 'mantenimiento',
    campos: ['ceiba'],
    puede: con('causa:declarar', 'anh:clasificar') },
  { id: 'cont', nivel: 'decision', nombre: 'Abastecimiento y contratos', persona: 'Paula Gómez', iniciales: 'PG',
    pantallas: ['evidencia'], inicio: 'evidencia', topologia: null,
    foco: 'La línea de tiempo viene del PLC: deja de ser acta y pasa a ser evidencia.',
    area: 'soporte',
    campos: 'todos',
    puede: con('evidencia:exportar') },
  { id: 'reg', nivel: 'ingenieria', nombre: 'Cumplimiento regulatorio', persona: 'Iván Salas', iniciales: 'IS',
    pantallas: ['regulatorio', 'plantaViva', 'resultados'], inicio: 'regulatorio', topologia: 'medicion',
    foco: 'Cada parada en el árbol de la circular, con lo que va a la ANH, y la medición viva. Nunca la tocamos.',
    area: 'soporte',
    campos: 'todos',
    puede: con('evidencia:exportar') },
  { id: 'adm', nivel: 'ingenieria', nombre: 'Administrador de la implementación', persona: 'Hermes Leal', iniciales: 'HL',
    pantallas: ['configuracion', 'filosofia', 'conectores', 'plantaViva', 'planta', 'agua'], inicio: 'configuracion', topologia: 'proceso',
    foco: 'Configuras conectores, umbrales, tanques, respaldos y el programa de paradas. Las metas y los accesos los da el gerente de activo.',
    area: 'plataforma',
    campos: 'todos',
    puede: con('evidencia:exportar', 'conector:configurar', 'config:firmar') },
]
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
