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
 *                           que tenga el campo; el operador y el técnico ni ven Producción. */
const sin: Record<Capacidad, boolean> = {
  'causa:declarar': false, 'causa:completar': false, 'evidencia:exportar': false,
  'conector:configurar': false, 'config:firmar': false,
  'metas:firmar': false, 'usuarios:administrar': false, 'sap:aviso': false, 'asignacion:cargar': false,
}
const con = (...ks: Capacidad[]) => ({ ...sin, ...Object.fromEntries(ks.map(k => [k, true])) })

/** Pantallas depuradas: cada rol ve lo que su decisión exige, nada más.
 *  Una pantalla sale de un rol cuando todo lo que trae ya está en otra de las
 *  suyas (revisión del 6-oct-2026): Riesgo repite Turno para operación y Mi
 *  trabajo para el técnico; el gerente abre cualquier equipo desde Resumen y
 *  Riesgo. Al jefe de mantenimiento y a confiabilidad Riesgo sí les aporta: lo
 *  parado ahora y los equipos que no son de alto impacto (el aire de
 *  instrumentos). La topología es una proyección distinta según cómo piensa cada rol. */
/** Orden de organigrama: la dirección arriba, y debajo cada área con su
 *  jefatura primero y el campo al final. */
export const ROLES: Rol[] = [
  { id: 'ger', nivel: 'decision', nombre: 'Gerente de activo', persona: 'Andrés Vélez', iniciales: 'AV',
    pantallas: ['resumen', 'diferidos', 'produccion', 'riesgo', 'configuracion'], inicio: 'resumen', topologia: null,
    foco: 'Barriles que no se produjeron, cuánto es de los equipos de alto impacto, y si baja contra la meta que usted firmó. Usted fija las metas de cada campo y da los accesos.',
    area: 'direccion',
    campos: 'todos',
    puede: con('evidencia:exportar', 'metas:firmar', 'usuarios:administrar') },
  { id: 'prod', nivel: 'ingenieria', nombre: 'Ingeniera de producción', persona: 'Marcela Ríos', iniciales: 'MR',
    pantallas: ['produccion', 'diferidos', 'pozos', 'esp', 'causa', 'planta'], inicio: 'produccion', topologia: 'produccion',
    foco: 'Explicas el mes en barriles: el factor de asignación en banda, la custodia completa y nada sin identificar.',
    area: 'produccion',
    campos: ['ceiba', 'palmar'],
    puede: con('evidencia:exportar', 'asignacion:cargar') },
  { id: 'sup', nivel: 'operacion', nombre: 'Supervisor de operaciones', persona: 'Nelson Ortiz', iniciales: 'NO',
    pantallas: ['bombas', 'esp', 'turno', 'causa', 'pozos'], inicio: 'bombas', topologia: 'proceso',
    foco: 'Entras por las bombas: lo gris está normal, el color es el problema. Si una para, cierras en el orden que menos cuesta.',
    area: 'produccion',
    campos: ['ceiba'],
    puede: con('causa:declarar', 'evidencia:exportar', 'sap:aviso') },
  { id: 'oper', nivel: 'operacion', nombre: 'Operador de campo', persona: 'Jairo Peña', iniciales: 'JP',
    pantallas: ['bombas', 'esp', 'causa', 'turno'], inicio: 'bombas', topologia: 'proceso',
    foco: 'Cómo están las bombas, a qué equipo vas, y qué se dañó cuando la señal no lo dice.',
    area: 'produccion',
    campos: ['ceiba'],
    puede: con('causa:declarar', 'sap:aviso') },
  { id: 'jefe', nivel: 'ingenieria', nombre: 'Jefe de mantenimiento', persona: 'Camilo Rueda', iniciales: 'CR',
    pantallas: ['mantenimiento', 'diferidos', 'bombas', 'esp', 'confiabilidad', 'equipo', 'riesgo', 'causa'], inicio: 'mantenimiento',
    topologia: null,
    foco: 'Respondes por que los barriles diferidos bajen, no por explicarlos.',
    area: 'mantenimiento',
    campos: 'todos',
    puede: con('causa:completar', 'evidencia:exportar', 'sap:aviso') },
  { id: 'conf', nivel: 'ingenieria', nombre: 'Ingeniero de confiabilidad', persona: 'Edwin Maestre', iniciales: 'EM',
    pantallas: ['bombas', 'esp', 'confiabilidad', 'diferidos', 'riesgo', 'equipo', 'causa', 'planta'], inicio: 'bombas', topologia: 'proceso',
    foco: 'Respondes por la reparación activa, no por la espera del repuesto.',
    area: 'mantenimiento',
    campos: ['ceiba', 'morichal', 'guacamayo'],
    puede: con('causa:completar', 'evidencia:exportar', 'sap:aviso') },
  { id: 'plan', nivel: 'ingenieria', nombre: 'Planeadora de mantenimiento', persona: 'Luz Caro', iniciales: 'LC',
    pantallas: ['equipo', 'confiabilidad'], inicio: 'equipo', topologia: 'proceso',
    foco: 'El horizonte es lo que deja pedir el repuesto sin pagar urgencia.',
    area: 'mantenimiento',
    campos: ['ceiba', 'morichal'],
    puede: con('evidencia:exportar') },
  { id: 'tec', nivel: 'operacion', nombre: 'Técnico de mantenimiento', persona: 'Óscar Daza', iniciales: 'OD',
    pantallas: ['trabajo', 'bombas', 'esp', 'causa'], inicio: 'trabajo', topologia: 'proceso',
    foco: 'Abres el equipo y dices qué encontraste cuando la señal no lo dice. De ahí aprende el vigía.',
    area: 'mantenimiento',
    campos: ['ceiba'],
    puede: con('causa:declarar') },
  { id: 'cont', nivel: 'decision', nombre: 'Abastecimiento y contratos', persona: 'Paula Gómez', iniciales: 'PG',
    pantallas: ['evidencia'], inicio: 'evidencia', topologia: null,
    foco: 'La línea de tiempo viene del PLC: deja de ser acta y pasa a ser evidencia.',
    area: 'soporte',
    campos: 'todos',
    puede: con('evidencia:exportar') },
  { id: 'reg', nivel: 'ingenieria', nombre: 'Cumplimiento regulatorio', persona: 'Iván Salas', iniciales: 'IS',
    pantallas: ['regulatorio'], inicio: 'regulatorio', topologia: 'medicion',
    foco: 'Vigilamos que la medición esté viva. Nunca la tocamos.',
    area: 'soporte',
    campos: 'todos',
    puede: con('evidencia:exportar') },
  { id: 'adm', nivel: 'ingenieria', nombre: 'Administrador de la implementación', persona: 'Hermes Leal', iniciales: 'HL',
    pantallas: ['configuracion', 'conectores', 'planta'], inicio: 'configuracion', topologia: 'proceso',
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
export const rolPorId = (id: string) =>
  ROLES.find(r => r.id === id && rolVisible(r.id))
  ?? ROLES.find(r => r.id === ROL_INICIAL)
  ?? ROLES_VISIBLES[0]!
