import { FUENTE, pedirJson, ErrorApi, mensajeDe, locacionDe } from './fuente'
import { deRespuesta } from './cable'
import {
  R_FIRMA, R_USUARIO, R_AVISO, R_INFORME, R_ASIGNACION, R_RESPUESTA, R_ANALISIS, R_PLANTA, R_PLAN,
  R_CLASIFICACION, R_CONFIRMACION, R_VISTA_PREVIA, R_TOPOLOGIA_CSV, incoherencias,
  type CuerpoFirma, type CuerpoUsuario, type CuerpoInvitacion, type CuerpoAviso, type CuerpoRespuesta, type CuerpoWhatsapp, type CuerpoAnalisis, type CuerpoAsignacion,
  type CuerpoClasificacion, type CuerpoConfirmacion, type CuerpoYacimiento, type CuerpoVistaPrevia, type CuerpoTopologiaCsv,
  type CuerpoRespuestaAnh, type CuerpoRevisionAnh,
} from './contrato'
import { pedirParadaAnh, eventosDeLaCascada, filasDeEventos, filasDeRaiz, campoDeLaFila, partesDelId, soloDePersona, cadenaVista, guardadasDe } from './arbol'
import {
  declararPaso, declararYacimiento, responder, conRevisionAtendida, quienRevisa, esNoSe, ErrorClasificacion, esDePersona, PASOS_QUE_CONFIRMA, PASOS_QUE_DECLARA,
  ROLES_QUE_CONTESTAN, QUIEN_CONTESTA, PREGUNTAS_CAMPO,
  type BorradorClasificacion, type DatoClasificado, type PorqueChoke, type ValoresPasos, type IdPregunta, type Persona, type RevisionAnh,
} from '@/entities/anh-clasificacion'
import { confirmarLote, confirmarParada, conClasificacion, type ParadaAnh, type ConfirmacionLote } from '@/entities/anh-paradas'
import { PASOS, PASO_CAMPO, ETIQUETA_PLANEACION, planeacionDeN1, n1DeCodigo, type PasoAnh, type Planeacion, type ClaveN1, type CodigoN2 } from '@/entities/anh-catalogo'
import { impactoConfig, leerTopologia, type ImpactoConfig, type TopologiaLeida } from '@/entities/choke-config'
import { capacidadesQueBloquean } from '@/entities/choke'
import type { Contexto } from '@/entities/causa-senal'
import { sesion, cambiarSesion } from './sesion'
import { pedirHistoriaSap } from './sap'
import { pedirMesesCerrados } from './calendario'
import { pedirCatalogoDeDanos } from './equipos'
import { pedirCifrasInforme } from './informes'
import type { Codec } from './cable'
import { diferencias, diferenciasPorGrupo, camposTocados, validarConfig, normalizarConfig, type Version } from '@/entities/configuracion'
import {
  revisarAcceso, cambiosDeUsuario, cambiosDeInvitacion, estadoAlGuardar, personaDelRol, recibeAlertas, normalizarTelefono, camposAsignados, registroCompleto,
  type Usuario, type ErrorAcceso, type CambioAcceso,
} from '@/entities/usuarios'
import { rolExacto } from '@/entities/roles'
import { CAMPOS, campoPorId } from '@/entities/campos'
import { eventosBomba } from '@/entities/bombas'
import { eventosPozos } from '@/entities/pozos'
import type { AvisoSap } from '@/entities/sap'
import type { Informe, ConsultaInforme } from '@/entities/informe'
import type { FilaOficial, FilaCargada, CargaAsignacion } from '@/entities/asignacion'
import { OTRA } from '@/entities/mensajes'
import { nombreModo, modosDeParte, MODO_OTRO, type Analisis } from '@/entities/catalogo'
import { mecanismo as mecanismoIso, CAUSAS_RAIZ } from '@/entities/iso14224'
import { diasDelMes, nombreMes } from '@/entities/plan'
import { aplicarCambioPlanta, type CambioDePlanta, type CambioPlanta, type PlantaCampo } from '@/entities/planta'
import type { Respuesta } from '@/entities/pozos'
import { MOTIVO_MINIMO, TEXTO_LIBRE_MINIMO, TEXTO_MAXIMO, alcanza } from '@/entities/reglas'
import { AHORA } from '@/entities/reloj'
import { region } from '@/shared/config/region'
import { diaIso } from '@/shared/lib/formato'
import { formatoFecha } from '@/shared/lib/fecha'
import { puedeHacer } from '@/entities/tipos'
import { cicloValor, planPorId, type DecisionPlan, type EstadoPlan } from '@/entities/escenarios'
import { calendario } from '@/entities/libro'

/** LAS ESCRITURAS DEL CONTRATO: una función por cada POST/PATCH.
 *
 *  Todas son asíncronas y responden lo mismo en las dos fuentes, la forma que
 *  ya muestran las pantallas: `{ ok: true, … }` o `{ ok: false, error }`.
 *  - Con la fuente http hacen el pedido, y el 403 (no le toca), el 409 (otro
 *    llegó antes) y el 422 (la forma) del servidor vuelven como `{ ok: false,
 *    error }` con SUS palabras. Si no hubo respuesta, también se dice: nada se
 *    pierde en silencio. Lo aceptado se copia a la sesión con lo que el
 *    servidor devolvió (y la caché de consultas pide de nuevo lo que cambió).
 *  - En el demo, el servidor es este módulo: aplica las mismas reglas, en el
 *    mismo orden, sobre la sesión del navegador.
 *
 *  `quien` dice con qué rol se actúa. En este prototipo no hay inicio de
 *  sesión: viaja en la cabecera `x-rol`. En producción sale del token y el
 *  servidor no le cree al cliente. */

export interface Credencial { rolId: string }
export type Rechazo = { ok: false; error: string }
type Resultado<T extends object = object> = ({ ok: true } & T) | Rechazo

/** Lo que se responde cuando nadie con acceso activo tiene el rol que se está viendo. */
const SIN_PERSONA = 'Nadie con acceso activo tiene este rol: firma, responde o exporta una persona con acceso, no un rol.'
/** El 403 de un rol que no está entre los del producto (C-14): el servidor busca
 *  el rol SIN respaldo (`rolExacto`); un rol oculto o inventado no escribe con
 *  las capacidades de otro. */
const SIN_ROL = 'Su rol no está entre los del producto: no escribe nada.'

/** La hora con que se firma: la del reloj del sistema (en el demo, la del
 *  PLC, que está congelada). Con el servidor la pone él. */
const horaDelPlc = () => `${new Date(AHORA.getTime() - 5 * 3_600_000).toISOString().slice(0, 19)}-05:00`

/* ─────────────────────────── el pedido con el servidor ─────────────────────────── */

/** Manda una escritura y revive la respuesta. Los rechazos del contrato
 *  (403, 409, 422) vuelven como `{ ok: false }` con el mensaje del servidor;
 *  `detalle` es el objeto `error` entero, por si trae más (los errores por
 *  caja de un acceso). Lo demás (sin red, 500) también vuelve como rechazo,
 *  diciendo que no se guardó. */
async function escribir<T, J>(q: Credencial, metodo: 'POST' | 'PATCH' | 'PUT', ruta: string, cuerpo: unknown, cod: Codec<T, J>):
  Promise<{ ok: true; datos: T } | { ok: false; error: string; estado: number; detalle?: unknown }> {
  try {
    const r = await pedirJson(ruta, undefined, { metodo, cuerpo, cabeceras: { 'x-rol': q.rolId } })
    return { ok: true, datos: deRespuesta(cod, r) }
  } catch (e) {
    if (e instanceof ErrorApi) {
      const contrato = e.estado === 403 || e.estado === 409 || e.estado === 422
      return { ok: false, estado: e.estado, detalle: e.detalle, error: contrato ? e.message : `No se guardó: ${e.message}.` }
    }
    return { ok: false, estado: 0, error: `No se guardó: ${mensajeDe(e)}.` }
  }
}

/* ─────────────────────────── configuración ─────────────────────────── */

/** `POST /api/configuracion { config, motivo, base }` → la versión firmada.
 *  `base` es la versión sobre la que se editó: si entretanto se firmó otra, 409. */
export async function firmarConfiguracion(q: Credencial, c: CuerpoFirma): Promise<Resultado<{ cambios: string[]; version: number }>> {
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', '/configuracion', c, R_FIRMA)
    if (!r.ok) return r
    const v = r.datos.version, { ctx, versiones } = sesion()
    cambiarSesion({ ctx: { ...ctx, config: v.config }, versiones: [...versiones, v] })
    return { ok: true, cambios: v.cambios, version: v.version }
  }
  const { ctx, versiones, usuarios } = sesion()
  const forma = revisarForma(c, { config: 'objeto', motivo: 'texto?', base: 'entero' }) ?? formaDeConfig(c.config)
  if (forma) return { ok: false, error: forma }
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  // Lo que llega se normaliza en el borde, como lo hace el servidor: un precio en null es «sin precio», no 0.
  const config = normalizarConfig(c.config)
  // Firma una persona con acceso, no un rol: si nadie activo tiene este rol, no hay quién firme.
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  // El 409: lo editado partía de otra versión. Firmarlo pisaría lo que se firmó en el medio.
  const vigente = versiones.at(-1)!
  if (c.base !== vigente.version) return { ok: false, error: `Mientras editaba se firmó la versión ${vigente.version} (${vigente.por}). Descarte el borrador y vuelva a editar sobre ella.` }
  const cambios = diferencias(ctx.config, config)
  if (!cambios.length) return { ok: false, error: 'No hay cambios que firmar.' }
  // Lo mismo que el servidor responde con 403: cada grupo lo firma quien puede.
  const grupos = diferenciasPorGrupo(ctx.config, config), puede = rol.puede
  if (grupos.metas.length && !puede['metas:firmar']) return { ok: false, error: 'Las metas, el precio y la regla de cierre los firma el gerente de activo.' }
  if (grupos.tecnica.length && !puede['config:firmar']) return { ok: false, error: 'Tanques, respaldos, programa y membrete los firma el administrador de la implementación.' }
  // También 403: la capacidad dice qué firma; los campos asignados, dónde. Un
  // id que no es campo no se cuenta aquí: lo rechaza validarConfig (422).
  const mios = camposAsignados(rol, usuarios).map(x => x.id)
  const ajenos = camposTocados(ctx.config, config).filter(id => CAMPOS.some(x => x.id === id) && !mios.includes(id))
  if (ajenos.length) return { ok: false, error: `No tiene asignado ${ajenos.map(id => campoPorId(id).nombre).join(', ')}: lo de ese campo lo firma quien lo tenga.` }
  const errores = validarConfig(config, ctx.config, `${diaIso(AHORA).slice(0, 8)}01`, AHORA.getTime())
  if (errores.length) return { ok: false, error: errores.join(' ') }
  // Las capacidades que cambian pasan por la revisión de la firma (U2 §8.4): lo que bloquea es 422.
  const capacidades = capacidadesQueBloquean(ctx.config, config, ctx, versiones)
  if (capacidades.length) return { ok: false, error: capacidades.join(' ') }
  // El motivo, con las palabras del grupo que se firma (C-27): una meta, o la configuración técnica.
  if (!alcanza(c.motivo, MOTIVO_MINIMO)) return { ok: false, error: grupos.metas.length
    ? 'Falta el motivo: una meta que se mueve sin motivo no es meta.'
    : 'Falta el motivo: diga por qué cambia la configuración técnica (queda en el historial con su firma).' }
  const tope = revisarTopes(c as unknown as Record<string, unknown>, ['motivo'])
  if (tope) return { ok: false, error: tope }
  const v: Version = { version: vigente.version + 1, fecha: horaDelPlc(), por: `${yo.nombre} · ${rol.nombre.toLowerCase()}`, motivo: c.motivo.trim(), cambios, config }
  cambiarSesion({ ctx: { ...ctx, config }, versiones: [...versiones, v] })
  return { ok: true, cambios, version: v.version }
}

/* ─────────────────────────── usuarios ─────────────────────────── */

type ResultadoAcceso<T extends object = object> = ({ ok: true } & T) | { ok: false; errores: ErrorAcceso[] }

/** Los errores por caja de un 422 de accesos (`error.errores`), o el mensaje
 *  general si el servidor no los separó. */
const erroresDe = (r: { error: string; detalle?: unknown }): ErrorAcceso[] => {
  const e = (r.detalle as { errores?: unknown } | undefined)?.errores
  return Array.isArray(e) && e.length ? e as ErrorAcceso[] : [{ campo: 'general', texto: r.error }]
}
/** Lo que el servidor aceptó de un acceso, en la copia de la sesión. */
function anotarAcceso(u: Usuario, acceso: CambioAcceso) {
  const { usuarios, accesos } = sesion()
  cambiarSesion({ usuarios: usuarios.some(x => x.id === u.id) ? usuarios.map(x => (x.id === u.id ? u : x)) : [...usuarios, u], accesos: [...accesos, acceso] })
}

/** `PATCH /api/usuarios/:id { usuario, motivo }` → la persona como quedó y el
 *  cambio en el historial. Lo firma quien tenga el rol actual. */
export async function guardarUsuario(q: Credencial, c: CuerpoUsuario): Promise<ResultadoAcceso> {
  if (FUENTE === 'http') {
    const r = await escribir(q, 'PATCH', `/usuarios/${encodeURIComponent(c.usuario.id)}`, c, R_USUARIO)
    if (!r.ok) return { ok: false, errores: erroresDe(r) }
    anotarAcceso(r.datos.usuario, r.datos.acceso)
    return { ok: true }
  }
  // En el demo la sesión ES el registro del servidor: siempre completo.
  const { accesos } = sesion(), usuarios = registroCompleto(sesion().usuarios), u = c.usuario
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, errores: [{ campo: 'general', texto: SIN_ROL }] }
  if (!rol.puede['usuarios:administrar']) return { ok: false, errores: [{ campo: 'general', texto: 'Los accesos los da el gerente de activo.' }] }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, errores: [{ campo: 'general', texto: SIN_PERSONA }] }
  // PATCH: la persona tiene que existir; invitar es otra llamada (POST) y el id lo da el servidor.
  const antes = usuarios.find(x => x.id === u.id)
  if (!antes) return { ok: false, errores: [{ campo: 'general', texto: 'Esa persona no está en el registro: invítela.' }] }
  // El estado lo decide el servidor: suspender anota el de antes y reactivar vuelve a ese.
  const limpio = estadoAlGuardar(antes, { ...u, nombre: u.nombre.trim(), correo: u.correo.trim(), ...(u.telefono !== undefined ? { telefono: normalizarTelefono(u.telefono, region.celular) } : {}) })
  const errores = revisarAcceso(usuarios, limpio, yo.id, c.motivo)
  if (errores.length) return { ok: false, errores }
  const cambios = cambiosDeUsuario(antes, limpio)
  if (!cambios.length) return { ok: false, errores: [{ campo: 'general', texto: 'No hay cambios que guardar.' }] }
  anotarAcceso(limpio, { id: accesos.length + 1, fecha: horaDelPlc(), por: `${yo.nombre} · ${rol.nombre.toLowerCase()}`,
    usuario: limpio.nombre, cambios, motivo: c.motivo.trim() })
  return { ok: true }
}

/** `POST /api/usuarios { invitacion, motivo }` → la persona invitada (el id,
 *  el día y el estado «invitado» los pone el servidor) y el cambio. */
export async function invitarUsuario(q: Credencial, c: CuerpoInvitacion): Promise<ResultadoAcceso<{ id: string }>> {
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', '/usuarios', c, R_USUARIO)
    if (!r.ok) return { ok: false, errores: erroresDe(r) }
    anotarAcceso(r.datos.usuario, r.datos.acceso)
    return { ok: true, id: r.datos.usuario.id }
  }
  const { accesos } = sesion(), usuarios = registroCompleto(sesion().usuarios), datos = c.invitacion
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, errores: [{ campo: 'general', texto: SIN_ROL }] }
  if (!rol.puede['usuarios:administrar']) return { ok: false, errores: [{ campo: 'general', texto: 'Los accesos los da el gerente de activo.' }] }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, errores: [{ campo: 'general', texto: SIN_PERSONA }] }
  // Lo que pone el servidor: un id que nadie tiene, el día del reloj del PLC y «invitado».
  let n = usuarios.length + 1
  while (usuarios.some(x => x.id === `u${n}`)) n++
  const hora = horaDelPlc()
  const limpio: Usuario = { ...datos, id: `u${n}`, nombre: datos.nombre.trim(), correo: datos.correo.trim(), estado: 'invitado', desde: hora.slice(0, 10),
    ...(datos.telefono !== undefined ? { telefono: normalizarTelefono(datos.telefono, region.celular) } : {}) }
  const errores = revisarAcceso(usuarios, limpio, yo.id, c.motivo)
  if (errores.length) return { ok: false, errores }
  anotarAcceso(limpio, { id: accesos.length + 1, fecha: hora, por: `${yo.nombre} · ${rol.nombre.toLowerCase()}`,
    usuario: limpio.nombre, cambios: cambiosDeInvitacion(limpio), motivo: c.motivo.trim() })
  return { ok: true, id: limpio.id }
}

/* ─────────────────────────── SAP ─────────────────────────── */

/** `POST /api/sap/avisos` → el aviso creado en SAP (número, hora y quién los pone el servidor). */
export async function enviarAviso(q: Credencial, a: CuerpoAviso): Promise<Resultado<{ aviso: AvisoSap }> & { campo?: 'descripcion' }> {
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', '/sap/avisos', a, R_AVISO)
    if (!r.ok) {
      // El 422 dice de qué caja es el error: el formulario la marca inválida y le enlaza el mensaje.
      const campo = (r.detalle as { campo?: unknown } | undefined)?.campo
      return { ok: false, error: r.error, ...(campo === 'descripcion' ? { campo } : {}) }
    }
    cambiarSesion({ avisosEnviados: [...sesion().avisosEnviados, r.datos.aviso] })
    return { ok: true, aviso: r.datos.aviso }
  }
  const { usuarios, ctx, avisosEnviados } = sesion()
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!rol.puede['sap:aviso']) return { ok: false, error: 'Su rol no envía avisos a SAP.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  // Como en el resto del contrato: nadie actúa sobre un campo que no tiene asignado.
  if (!camposAsignados(rol, usuarios).some(c => c.id === a.campoId)) return { ok: false, error: 'Ese campo no lo tiene asignado: el aviso no se envía.' }
  if (!alcanza(a.descripcion, TEXTO_LIBRE_MINIMO)) return { ok: false, error: 'Escriba qué pasa, con al menos una frase corta.', campo: 'descripcion' }
  const todos = [...pedirHistoriaSap(ctx).avisos, ...avisosEnviados]
  // Un aviso abierto por equipo: el segundo no se crea y se dice cuál está abierto (409).
  const abierto = todos.find(x => !x.cerrado && x.campoId === a.campoId && x.equipo === a.equipo)
  if (abierto) return { ok: false, error: `Ya hay un aviso abierto de ${a.equipo} en SAP: el ${abierto.numero}.` }
  const numero = String(Math.max(...todos.map(x => Number(x.numero))) + 1)
  const aviso: AvisoSap = { ...a, descripcion: a.descripcion.trim(), numero, creado: horaDelPlc(), creadoPor: `${yo.nombre} · desde TRIM`, origen: 'trim', cerrado: false }
  cambiarSesion({ avisosEnviados: [...avisosEnviados, aviso] })
  return { ok: true, aviso }
}

/* ─────────────────────────── informes ─────────────────────────── */

/** `POST /api/informes` → se manda la CONSULTA; el servidor saca las cifras
 *  con su libro, su versión de la configuración y la huella, y pone el folio,
 *  la fecha y quién lo emitió. */
export async function emitirInforme(q: Credencial, c: ConsultaInforme): Promise<Resultado<{ informe: Informe }>> {
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', '/informes', c, R_INFORME)
    if (!r.ok) return r
    cambiarSesion({ informes: [...sesion().informes, r.datos.informe] })
    return { ok: true, informe: r.datos.informe }
  }
  const { usuarios, ctx, versiones } = sesion()
  // Lo mismo que el servidor responde con 403: exporta quien tiene la
  // capacidad, una persona con acceso y solo de sus campos.
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!rol.puede['evidencia:exportar']) return { ok: false, error: 'Su rol no exporta evidencia.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  const mios = camposAsignados(rol, usuarios).map(x => x.id)
  if (c.campos.some(x => !mios.includes(x))) return { ok: false, error: 'El informe incluye campos que no tiene asignados.' }
  let calculo: Awaited<ReturnType<typeof pedirCifrasInforme>>
  // Una consulta imposible (sin campos, un período al revés) es el 422 del servidor.
  try { calculo = await pedirCifrasInforme(c, ctx, versiones.at(-1)!.version) }
  catch (e) { return { ok: false, error: mensajeDe(e) } }
  // El consecutivo se toma después de calcular: dos exportaciones seguidas no comparten folio.
  const informes = sesion().informes, fecha = horaDelPlc()
  const informe: Informe = { ...c, ...calculo, fecha, folio: `INF-${fecha.slice(0, 4)}-${String(informes.length + 1).padStart(4, '0')}`,
    por: `${yo.nombre} · ${rol.nombre.toLowerCase()}` }
  cambiarSesion({ informes: [...informes, informe] })
  return { ok: true, informe }
}

/* ─────────────────────────── asignación oficial ─────────────────────────── */

/** `POST /api/asignacion-oficial { filas, motivo }` → reemplaza lo cargado de
 *  cada mes y campo que llega, y deja la carga en el rastro (quién, cuándo, por
 *  qué y cuántos pozos reemplazó). Todo o nada: con una fila mala no se carga
 *  ninguna. */
export async function cargarAsignacion(q: Credencial, c: CuerpoAsignacion): Promise<Resultado> {
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', '/asignacion-oficial', c, R_ASIGNACION)
    if (!r.ok) return r
    cambiarSesion({ asignacionOficial: r.datos.filas, cargasAsignacion: [...sesion().cargasAsignacion, r.datos.carga] })
    return { ok: true }
  }
  const { usuarios, asignacionOficial, cargasAsignacion } = sesion(), filas = c.filas
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  // El 403 del contrato: la oficial de un mes la reemplaza quien la reporta,
  // no cualquiera con el campo (antes el operador y el técnico la pisaban).
  if (!rol.puede['asignacion:cargar']) return { ok: false, error: 'La asignación oficial la carga producción: su rol no la reemplaza.' }
  // Las mismas reglas que `leerAsignacion`: aquí no se confía en que la pantalla ya las aplicó.
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  const mios = camposAsignados(rol, usuarios).map(c => c.id)
  const cerrados = pedirMesesCerrados()
  for (const f of filas) {
    if (!mios.includes(f.campoId)) return { ok: false, error: `No tiene asignado ${campoPorId(f.campoId).nombre}: no se cargó nada.` }
    if (!cerrados.includes(f.mes)) return { ok: false, error: `${nombreMes(f.mes)} no es un mes cerrado con datos: no se cargó nada.` }
    if (!f.pozo.trim()) return { ok: false, error: 'Una fila no trae el pozo: no se cargó nada.' }
    if (!Number.isFinite(f.bbl) || f.bbl < 0) return { ok: false, error: `${f.pozo}: el volumen tiene que ser cero o más bbl. No se cargó nada.` }
    const horasMes = diasDelMes(f.mes) * 24
    if (f.horas !== undefined && !(Number.isFinite(f.horas) && f.horas >= 0 && f.horas <= horasMes))
      return { ok: false, error: `${f.pozo}: ${nombreMes(f.mes)} tiene de 0 a ${horasMes} horas. No se cargó nada.` }
  }
  // Sin filas no hay qué cargar: una carga vacía dejaría un rastro de nada.
  if (!filas.length) return { ok: false, error: 'No llegó ninguna fila: no se cargó nada.' }
  if (!alcanza(c.motivo, MOTIVO_MINIMO)) return { ok: false, error: 'Falta el motivo: diga de dónde sale esta asignación (por ejemplo, el reporte del mes a la ANH).' }
  const clave = (f: FilaOficial) => `${f.mes}|${f.campoId}`
  const llegan = [...new Set(filas.map(clave))]
  const id = cargasAsignacion.length + 1
  const carga: CargaAsignacion = { id, fecha: horaDelPlc(), por: `${yo.nombre} · ${rol.nombre.toLowerCase()}`, motivo: c.motivo.trim(),
    grupos: llegan.map(k => {
      const [mes, campoId] = k.split('|') as [string, string]
      return { mes, campoId, pozos: filas.filter(f => clave(f) === k).length, reemplazados: asignacionOficial.filter(f => clave(f) === k).length }
    }) }
  // Lo que se guarda es lo que el servidor aceptó, campo por campo: nada que el cuerpo traiga de más.
  const guardadas: FilaCargada[] = filas.map(f => ({ mes: f.mes, campoId: f.campoId, pozo: f.pozo, bbl: f.bbl, ...(f.horas !== undefined ? { horas: f.horas } : {}), carga: id }))
  cambiarSesion({ asignacionOficial: [...asignacionOficial.filter(f => !llegan.includes(clave(f))), ...guardadas], cargasAsignacion: [...cargasAsignacion, carga] })
  return { ok: true }
}

/* ─────────────────────────── respuestas a paradas ─────────────────────────── */

/** El campo de una parada, sacado del registro del PLC (la del pozo o la de
 *  la bomba), nunca del cuerpo: con el campo del cuerpo, quien tiene La Ceiba
 *  respondería una parada de Morichal escribiendo «ceiba». undefined si el
 *  evento no existe. */
const campoDelEvento = (evento: string): string | undefined =>
  eventosBomba().find(e => e.id === evento)?.campoId ?? eventosPozos().find(e => e.id === evento)?.campoId

/** Lo que el servidor revisa del evento antes que la forma de la respuesta:
 *  que exista (404), que el campo del cuerpo sea el suyo (422) y, si hay
 *  quien firma con rol, que lo tenga asignado (403). */
function revisarEvento(evento: string, campoId: string | undefined, mios?: string[]): string | undefined {
  const campo = campoDelEvento(evento)
  if (!campo) return 'Esa parada no está en el registro del PLC.'
  if (campoId !== undefined && campoId !== campo) return 'La parada no es de ese campo.'
  if (mios && !mios.includes(campo)) return 'Esa parada es de un campo que no tiene asignado.'
  return undefined
}

/** Anota en la copia de la sesión la respuesta que el servidor aceptó. */
function anotarRespuesta(evento: string, r: Respuesta) {
  const { ctx } = sesion()
  cambiarSesion({ ctx: { ...ctx, respuestas: { ...ctx.respuestas, [evento]: r } } })
}

/** `POST /api/paradas/:evento/respuesta` desde la pantalla → la respuesta como
 *  quedó (`por`, `porId`, `hora` y `canal` los pone el servidor). El cuerpo es
 *  el del contrato y nada más: si llevara `canal`, el servidor tendría que
 *  creerle al navegador por qué vía llegó la respuesta. */
export async function responderParada(q: Credencial, c: CuerpoRespuesta): Promise<Resultado> {
  if (FUENTE === 'http') {
    const cuerpo: CuerpoRespuesta = { evento: c.evento, campoId: c.campoId, equipo: c.equipo, texto: c.texto,
      ...(c.parte !== undefined ? { parte: c.parte } : {}), ...(c.modo !== undefined ? { modo: c.modo } : {}) }
    const r = await escribir(q, 'POST', `/paradas/${encodeURIComponent(c.evento)}/respuesta`, cuerpo, R_RESPUESTA)
    if (!r.ok) return r
    anotarRespuesta(c.evento, r.datos.respuesta)
    return { ok: true }
  }
  const { ctx, usuarios } = sesion()
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  // Las reglas del servidor, en su orden: capacidad (403), persona activa,
  // campo asignado, la primera respuesta gana (409) y la forma (422).
  if (!puedeHacer(rol.puede, 'causa:declarar')) return { ok: false, error: 'Su rol no responde paradas.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  const malEvento = revisarEvento(c.evento, c.campoId, camposAsignados(rol, usuarios).map(x => x.id))
  if (malEvento) return { ok: false, error: malEvento }
  const previa = ctx.respuestas[c.evento]
  if (previa) return { ok: false, error: `Ya respondió ${previa.por}.` }
  const cat = pedirCatalogoDeDanos(c.campoId, c.equipo)
  const parte = c.parte ? cat?.partes.find(x => x.id === c.parte) : undefined
  if (c.parte && !parte) return { ok: false, error: 'Esa parte no es de este equipo.' }
  // En una bomba de la línea, en pantalla, la parte es obligatoria. En una
  // electrosumergible no: «no fue la electrosumergible» es causa de pozo.
  if (!parte && cat && cat.clase !== 'bomba-electrosumergible') return { ok: false, error: 'Diga qué parte de la bomba se dañó.' }
  if (parte && !(c.modo && modosDeParte(parte).some(m => m.codigo === c.modo))) return { ok: false, error: 'Diga qué vio en esa parte.' }
  const libre = c.texto.trim()
  if ((!parte || c.modo === MODO_OTRO) && !alcanza(libre, TEXTO_LIBRE_MINIMO)) return { ok: false, error: 'Escriba qué encontró, con al menos una frase corta.' }
  anotarRespuesta(c.evento, {
    texto: libre || `${parte!.nombre}: ${nombreModo(c.modo!, parte!.id).toLowerCase()}`,
    por: `${yo.nombre} · ${rol.nombre.toLowerCase()}`, porId: yo.id,
    ...(parte ? { parte: parte.id, modo: c.modo } : {}), canal: 'pantalla', hora: horaDelPlc(),
  })
  return { ok: true }
}

/** Lo que dice el teléfono simulado cuando la fuente es el servidor. */
export const WHATSAPP_SOLO_WEBHOOK = 'Con el servidor, una respuesta por WhatsApp solo entra por el webhook firmado de Meta: este teléfono es del demo y no la envía.'

/** La respuesta que llega por WhatsApp. En producción NO la manda el front:
 *  la manda el webhook de WhatsApp al servidor (firmado por Meta) y entra solo
 *  de un número que recibe las alertas de ese campo. El teléfono de la
 *  pantalla la simula en el demo, donde este módulo hace de webhook. Con el
 *  servidor no se manda nada: ningún cuerpo del front lleva `canal` ni `por`
 *  (los pone el servidor), y un POST con `canal: 'whatsapp'` desde el
 *  navegador sería pedirle que le crea. Se dice en el chat, no se calla. */
export async function recibirWhatsapp(c: CuerpoWhatsapp): Promise<Resultado> {
  if (FUENTE === 'http') return { ok: false, error: WHATSAPP_SOLO_WEBHOOK }
  const { ctx, usuarios } = sesion()
  const u = usuarios.find(x => x.id === c.usuarioId)
  // El campo es el de la parada, no el que diga el mensaje: el número tiene que recibir las alertas de ESE campo.
  const malEvento = revisarEvento(c.evento, c.campoId)
  if (malEvento) return { ok: false, error: malEvento }
  if (!u || !recibeAlertas(u, c.campoId))
    return { ok: false, error: 'Ese número no recibe las alertas de este campo: la respuesta no entra.' }
  const rolDelNumero = rolExacto(u.rolId)
  if (!rolDelNumero) return { ok: false, error: SIN_ROL }
  const previa = ctx.respuestas[c.evento]
  if (previa) return { ok: false, error: `Ya respondió ${previa.por}.` }
  const libre = (c.texto ?? '').trim()
  if (c.opcion.clave === OTRA.clave && !alcanza(libre, TEXTO_LIBRE_MINIMO)) return { ok: false, error: 'Con «0» hay que escribir qué encontró, con al menos una frase corta.' }
  // Con la parte va lo que vio, del catálogo de esa parte: es lo que hace útil la respuesta para el análisis.
  const parte = c.opcion.parte ? pedirCatalogoDeDanos(c.campoId, c.equipo)?.partes.find(x => x.id === c.opcion.parte) : undefined
  if (c.opcion.parte && !parte) return { ok: false, error: 'Esa parte no es de este equipo.' }
  if (parte && !(c.modo && modosDeParte(parte).some(m => m.codigo === c.modo))) return { ok: false, error: 'Diga qué vio en esa parte.' }
  if (c.modo === MODO_OTRO && !alcanza(libre, TEXTO_LIBRE_MINIMO)) return { ok: false, error: 'Escriba qué vio, con al menos una frase corta.' }
  anotarRespuesta(c.evento, {
    texto: c.opcion.clave === OTRA.clave ? libre : parte && c.modo === MODO_OTRO ? `${c.opcion.texto}: ${libre}`
      : parte && c.modo ? `${c.opcion.texto}: ${nombreModo(c.modo, parte.id).toLowerCase()}` : c.opcion.texto,
    por: `${u.nombre} · ${rolDelNumero.nombre.toLowerCase()}`, porId: u.id,
    ...(c.opcion.parte ? { parte: c.opcion.parte, modo: c.modo } : {}), canal: 'whatsapp', hora: horaDelPlc(),
  })
  return { ok: true }
}

/* ─────────────────────────── análisis de falla ─────────────────────────── */

/** Anota el análisis aceptado: una corrección es una versión nueva y el
 *  anterior pasa a la historia, no se borra. */
function anotarAnalisis(evento: string, a: Analisis) {
  const { analisis, analisisAnteriores } = sesion()
  const previo = Object.hasOwn(analisis, evento) ? analisis[evento] : undefined
  cambiarSesion({
    analisis: { ...analisis, [evento]: a },
    ...(previo ? { analisisAnteriores: { ...analisisAnteriores, [evento]: [...(analisisAnteriores[evento] ?? []), previo] } } : {}),
  })
}

/** `POST /api/analisis/:evento { mecanismo, causaRaiz, nota }` → el análisis registrado. */
export async function completarAnalisis(q: Credencial, c: CuerpoAnalisis): Promise<Resultado> {
  if (FUENTE === 'http') {
    const { evento, ...cuerpo } = c
    const r = await escribir(q, 'POST', `/analisis/${encodeURIComponent(evento)}`, cuerpo, R_ANALISIS)
    if (!r.ok) return r
    anotarAnalisis(evento, r.datos.analisis)
    return { ok: true }
  }
  const { usuarios, ctx } = sesion()
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!rol.puede['causa:completar']) return { ok: false, error: 'El análisis lo completa confiabilidad o el jefe de mantenimiento.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  // El campo sale del evento (el cuerpo no lo trae): nadie analiza una falla de un campo que no tiene.
  const malEvento = revisarEvento(c.evento, undefined, camposAsignados(rol, usuarios).map(x => x.id))
  if (malEvento) return { ok: false, error: malEvento }
  if (!ctx.respuestas[c.evento]?.parte) return { ok: false, error: 'Solo se analiza una falla declarada con su parte.' }
  if (!mecanismoIso(c.mecanismo)) return { ok: false, error: 'Escoja el mecanismo de falla.' }
  if (!CAUSAS_RAIZ.some(x => x.codigo === c.causaRaiz)) return { ok: false, error: 'Escoja la causa raíz.' }
  const nota = c.nota?.trim()
  anotarAnalisis(c.evento, { mecanismo: c.mecanismo, causaRaiz: c.causaRaiz, ...(nota ? { nota } : {}),
    por: `${yo.nombre} · ${rol.nombre.toLowerCase()}`, hora: horaDelPlc() })
  return { ok: true }
}

/* ─────────────────────────── esquema de planta ─────────────────────────── */

/** `POST /api/planta/cambios { campo, cambio }` → la planta como quedó y el
 *  cambio en el historial. Se manda la OPERACIÓN (agregar un pozo a un
 *  conjunto…), no la planta entera: el servidor la aplica con las mismas
 *  reglas (`aplicarCambioPlanta`) sobre la planta que él tiene. */
export async function cambiarPlanta(q: Credencial, campo: string, cambio: CambioDePlanta): Promise<Resultado> {
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', '/planta/cambios', { campo, cambio }, R_PLANTA)
    if (!r.ok) return r
    anotarPlanta(campo, r.datos.planta, r.datos.cambio)
    return { ok: true }
  }
  const { usuarios, plantas, cambiosPlanta } = sesion()
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!rol.puede['conector:configurar']) return { ok: false, error: 'El esquema de planta lo edita el administrador de la implementación.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  if (!camposAsignados(rol, usuarios).some(c => c.id === campo)) return { ok: false, error: 'Ese campo no lo tiene asignado.' }
  const cfg = Object.hasOwn(plantas, campo) ? plantas[campo] : undefined
  if (!cfg) return { ok: false, error: 'Ese campo no tiene esquema de planta.' }
  const r = aplicarCambioPlanta(cfg, cambio)
  if ('error' in r) return { ok: false, error: r.error }
  anotarPlanta(campo, r.planta, { id: cambiosPlanta.length + 1, fecha: horaDelPlc(), por: `${yo.nombre} · ${rol.nombre.toLowerCase()}`, campo, cambio: r.texto })
  return { ok: true }
}
function anotarPlanta(campo: string, planta: PlantaCampo, cambio: CambioPlanta) {
  const { plantas, cambiosPlanta } = sesion()
  cambiarSesion({ plantas: { ...plantas, [campo]: planta }, cambiosPlanta: [...cambiosPlanta, cambio] })
}

/* ─────────────────────────── planes del ciclo ─────────────────────────── */

/** `POST /api/planes/:id { estado, motivo }` → la decisión. Un plan se
 *  acepta y luego se marca ejecutado; no se revierte. Capacidad
 *  `planes:decidir` y el campo del plan entre los de la persona. */
export async function decidirPlan(q: Credencial, c: { id: string; estado: EstadoPlan; motivo: string }): Promise<Resultado<{ decision: DecisionPlan }>> {
  if (c.estado !== 'aceptado' && c.estado !== 'ejecutado') return { ok: false, error: 'Un plan se acepta o se marca ejecutado.' }
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', `/planes/${encodeURIComponent(c.id)}`, { estado: c.estado, motivo: c.motivo }, R_PLAN)
    if (!r.ok) return r
    const { planes } = sesion()
    cambiarSesion({ planes: { ...planes, [r.datos.decision.id]: r.datos.decision } })
    return { ok: true, decision: r.datos.decision }
  }
  const { ctx, versiones, usuarios, planes } = sesion()
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!puedeHacer(rol.puede, 'planes:decidir')) return { ok: false, error: 'Los planes los acepta operación o mantenimiento.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  if (!alcanza(c.motivo, MOTIVO_MINIMO)) return { ok: false, error: 'Falta el motivo: una decisión sin motivo no queda.' }
  const mios = camposAsignados(rol, usuarios).map(x => x.id)
  const cal = calendario()
  const ciclo = cicloValor(mios, new Date(cal[0]!.desde), new Date(cal.at(-1)!.hasta), ctx, versiones)
  const plan = planPorId(ciclo, c.id)
  if (!plan) return { ok: false, error: 'Ese plan no existe.' }
  if (!mios.includes(plan.campoId)) return { ok: false, error: 'Ese campo no lo tiene asignado.' }
  const actual = Object.hasOwn(planes, c.id) ? planes[c.id] : undefined
  const estadoActual = actual?.estado ?? 'propuesto'
  if (c.estado === 'aceptado' && estadoActual !== 'propuesto') {
    return { ok: false, error: estadoActual === 'aceptado' ? 'Ese plan ya está aceptado.' : 'Ese plan ya se ejecutó.' }
  }
  if (c.estado === 'ejecutado' && estadoActual !== 'aceptado') {
    return { ok: false, error: estadoActual === 'ejecutado' ? 'Ese plan ya se ejecutó.' : 'Hay que aceptarlo antes de marcarlo ejecutado.' }
  }
  const decision: DecisionPlan = {
    id: c.id, estado: c.estado,
    por: `${yo.nombre} · ${rol.nombre.toLowerCase()}`, porId: yo.id,
    fecha: horaDelPlc(), motivo: c.motivo.trim(),
  }
  cambiarSesion({ planes: { ...planes, [c.id]: decision } })
  return { ok: true, decision }
}

/* ─────────────────────────── la clasificación ANH ─────────────────────────── */

/* Las escrituras del árbol de paradas (Circular 024). Lo que dicen las personas
   se guarda POR PASO, solo por inserción, y nunca se borra ni se copia a nombre
   de otro (D1 de CORRECCIONES-QA):
   - Una escritura guarda solo los pasos que dijo esta persona en esta petición,
     con su nombre, su hora y el consecutivo del servidor (`n`), en una fila o en
     un evento. «Para la cascada» es una escritura por evento de las filas que
     mostró la pantalla (`ids`): si la raíz trae más eventos, 409.
   - En cada fila rige, paso por paso, lo más reciente entre su clave y la de su
     evento (`rigeEnFila`, anh-clasificacion.ts); sin nada, lo que propone TRIM.
     El tramo de exceso del programa solo usa lo suyo.
   - Cambiar lo que ya dijo una persona pide motivo: en la fila de la dirección,
     422 sin él; lo que dijo OTRA persona en otra fila o evento, 409 diciendo
     cuáles. Con motivo, queda como corrección con su motivo.
   - Lo que un cambio deja incoherente de lo que dijo una persona (la causa de la
     otra planeación) queda `retirado`, con quién y el motivo: la fila vuelve a lo
     que propone TRIM. Nada desaparece.
   - La revisión no toca ningún paso; la respuesta de campo, solo el que determina.
   - El yacimiento y la marca de lote nunca se copian: cada escritura lleva lo suyo.
   La fila se busca en el servidor por su id (`${evento}@${día}#${n}`), nunca se
   recibe; su campo sale del evento del controlador. Orden de revisión: la forma
   del cuerpo (400); capacidad y persona (403); la fila (404, también si es de un
   campo que la persona no tiene: no se dice si existe, C-20); los pasos que el
   rol no dice o no avala (403); la cadena que vio la persona (409); la forma y la
   coherencia (422); el alcance (422; 409 si la cascada trae más de lo que se vio);
   lo que cambia de lo que dijeron otras personas (422 en la fila; 409 en las demás). */

/** Quiénes dicen o confirman todos los pasos (`PASOS_QUE_DECLARA` y `PASOS_QUE_CONFIRMA`). */
const QUIENES_TODO = 'supervisión, producción, el jefe de mantenimiento o confiabilidad'
/** El 409: otra persona cambió la fila mientras esta la miraba. */
const CAMBIO_LA_PARADA = 'Mientras la revisaba, alguien cambió esta parada: vuelva a abrirla para ver cómo quedó.'
/** El 404 de una fila: no existe, o es de un campo que la persona no tiene (no se dice cuál de las dos, C-20). */
const NO_ESTA = 'Esa parada no está entre las de sus campos: revise el evento y el día.'
/** El 422 de una cascada sin las filas que vio la persona. */
const CASCADA_SIN_IDS = 'Para la cascada, mande las filas que mostró la pantalla («ids»): se guarda solo en sus eventos.'
/** Cuántas filas caben en una petición (C-12): un lote o una cascada de verdad son decenas. */
const MAXIMO_IDS = 1000

/* ─────────── la forma del cuerpo (400, C-11) ─────────── */

type Forma = 'texto' | 'texto?' | 'bool?' | 'textos' | 'textos?' | 'objeto' | 'entero'
/** El 400 `peticion-invalida`, con la ruta de lo que no tiene la forma. */
const PETICION = (ruta: string, que: string) => `La petición no tiene la forma del contrato: «${ruta}» ${que}.`
const QUE_ES: Record<string, string> = {
  texto: 'tiene que ser un texto', bool: 'tiene que ser sí o no (true o false)', textos: 'tiene que ser una lista de textos',
  objeto: 'tiene que ser un objeto', entero: 'tiene que ser un número entero',
}
/** La forma de un cuerpo, ANTES de las reglas: lo que no la tiene es un 400 en
 *  palabras, nunca una excepción (500). Lo que el cuerpo traiga de más no se lee. */
function revisarForma(c: unknown, forma: Readonly<Record<string, Forma>>): string | undefined {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'La petición no tiene la forma del contrato: el cuerpo tiene que ser un objeto.'
  const o = c as Record<string, unknown>
  for (const [k, f] of Object.entries(forma)) {
    const v = o[k]
    const base = f.replace('?', '')
    if (v === undefined || v === null) { if (f.endsWith('?')) continue; return PETICION(k, 'falta') }
    const bien = base === 'texto' ? typeof v === 'string'
      : base === 'bool' ? typeof v === 'boolean'
        : base === 'textos' ? Array.isArray(v) && v.every(x => typeof x === 'string')
          : base === 'objeto' ? typeof v === 'object' && !Array.isArray(v)
            : Number.isInteger(v)
    if (!bien) return PETICION(k, QUE_ES[base] ?? 'no tiene la forma')
  }
  return undefined
}
/** Los topes de lo escrito (C-12): un motivo o una nota no es un documento. */
function revisarTopes(c: Record<string, unknown>, campos: readonly string[]): string | undefined {
  for (const k of campos) {
    const v = c[k]
    if (typeof v === 'string' && v.length > TEXTO_MAXIMO) return `«${k}» es de ${TEXTO_MAXIMO} caracteres o menos: escriba lo esencial.`
  }
  return undefined
}

/* ─────────── la fila, el alcance y lo que cambia ─────────── */

const FMT_DIA = formatoFecha({ day: 'numeric', month: 'short', timeZone: 'America/Bogota' })
/** «LC-07 (3 oct)»: una fila dicha para leer. */
const filaEnPalabras = (f: ParadaAnh) => `${f.pozo} (${FMT_DIA.format(new Date(`${f.diaOperacional}T12:00:00-05:00`))})`

/** La fila de la dirección: undefined (404) si no existe o si es de un campo que
 *  la persona no tiene, sin decir cuál de las dos (C-20): el campo sale del
 *  evento del controlador antes de armar la fila. */
function filaDe(id: unknown, mios: readonly string[], ctx: Contexto, g: Record<string, BorradorClasificacion>): ParadaAnh | undefined {
  if (typeof id !== 'string' || id.length > 200) return undefined
  const campo = campoDeLaFila(id)
  if (!campo || !mios.includes(campo)) return undefined
  return pedirParadaAnh(id, ctx, g)
}

/** Dónde se guarda una escritura (una fila o un evento) y las filas que rigen con esa clave. */
interface Objetivo { clave: string; filas: ParadaAnh[] }
/** Lo que se guarda en esta petición, por clave. */
type Escritos = Record<string, BorradorClasificacion>

/** «a, b y c». */
const listaEnPalabras = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
/** Los pozos de unos eventos, para decirlos en palabras. */
const pozosDeEventos = (eventos: readonly string[]) => listaEnPalabras([...new Set(eventos.map(e => eventosPozos().find(x => x.id === e)?.pozo ?? e))])

/** Dónde se guarda lo que dice la persona: en su fila, en su evento (todos sus
 *  tramos) o, para la cascada, en cada evento de las filas que mostró la pantalla
 *  (`ids`). Si la raíz trae eventos que la persona no vio, 409: la pantalla tiene
 *  que mostrarlos antes (C-01). El tramo de exceso del programa es otra decisión,
 *  no planeada: se guarda solo, en su fila. Un tramo de exceso de otro evento no
 *  hereda lo del evento: no está entre las filas de su clave. */
function objetivosDe(p: ParadaAnh, a: { aplicarAlEvento?: boolean; aplicarALaCascada?: boolean; ids?: readonly string[] }, ctx: Contexto,
  g: Record<string, BorradorClasificacion>): { objetivos: Objetivo[] } | { error: string } {
  if (p.exceso) return { objetivos: [{ clave: p.id, filas: [p] }] }
  const conLaDeLaDireccion = (fs: ParadaAnh[]) => fs.filter(f => !f.exceso).map(f => (f.id === p.id ? p : f))
  if (a.aplicarALaCascada) {
    const ids = [...new Set(a.ids ?? [])]
    if (!ids.length) return { error: CASCADA_SIN_IDS }
    if (ids.length > MAXIMO_IDS) return { error: `Una petición lleva hasta ${MAXIMO_IDS} filas.` }
    if (!ids.includes(p.id)) return { error: 'La fila de la dirección tiene que estar entre las que mostró la pantalla («ids»).' }
    const eventos = eventosDeLaCascada(p, ctx, g)
    const ajenas = ids.filter(id => !eventos.includes(partesDelId(id)?.eventoId ?? ''))
    if (ajenas.length) return { error: `${listaEnPalabras(ajenas.slice(0, 3))}${ajenas.length > 3 ? ` y ${ajenas.length - 3} más` : ''} no ${ajenas.length === 1 ? 'es' : 'son'} de la cascada de ${p.raiz}: revise las filas que mandó.` }
    const vistos = new Set(ids.map(id => partesDelId(id)!.eventoId))
    const faltan = eventos.filter(e => !vistos.has(e))
    if (faltan.length) return { error: `Mientras la revisaba, la cascada de ${p.raiz} cambió: son ${eventos.length} pozos y la pantalla mostró ${vistos.size} (falta ${pozosDeEventos(faltan)}). Vuelva a abrirla para verlos todos.` }
    const filas = conLaDeLaDireccion(filasDeEventos(p.campoId, eventos, ctx, g))
    return { objetivos: eventos.map(e => ({ clave: e, filas: filas.filter(f => f.eventoId === e) })) }
  }
  if (a.aplicarAlEvento) return { objetivos: [{ clave: p.eventoId, filas: conLaDeLaDireccion(filasDeEventos(p.campoId, [p.eventoId], ctx, g)) }] }
  return { objetivos: [{ clave: p.id, filas: [p] }] }
}

/** Lo que una persona cambiaría de lo que dijo una persona en una fila. */
interface Cambio { fila: ParadaAnh; paso: PasoAnh; antes: DatoClasificado<unknown, unknown>; retira: boolean }
const cambioEnPalabras = (c: Cambio) => `${filaEnPalabras(c.fila)}: «${PASO_CAMPO[c.paso]}», que dijo ${c.antes.por}`

/** Lo que dice una persona en las filas de una clave, paso por paso: el valor
 *  nuevo de cada paso (lo que deja `decir` en la primera fila donde cambia algo;
 *  con su procedencia: declarado, corregido o confirmado), lo que retira porque ya
 *  no va con lo nuevo (la causa de la otra planeación: solo lo que dijo una
 *  persona; lo de TRIM se quita solo al leer) y lo que cambiaría de lo que dijeron
 *  las personas en cada fila. Un paso que no va con lo que dijo una persona en
 *  alguna fila es 422, con la fila. */
function decirEn(o: Objetivo, p: ParadaAnh, decir: (b: BorradorClasificacion) => BorradorClasificacion):
  { nuevos: Map<PasoAnh, DatoClasificado<unknown, unknown>>; retirados: Map<PasoAnh, unknown>; cambios: Cambio[] } | { error: string } {
  const filas = [...o.filas].sort((a, b) => Number(b.id === p.id) - Number(a.id === p.id))
  const nuevos = new Map<PasoAnh, DatoClasificado<unknown, unknown>>(), retirados = new Map<PasoAnh, unknown>()
  const despues = new Map<string, BorradorClasificacion>()
  for (const f of filas) {
    let b: BorradorClasificacion
    try { b = decir(f.clasificacion) } catch (e) {
      if (e instanceof ErrorClasificacion) return { error: f.id === p.id ? e.message : `En ${filaEnPalabras(f)}: ${e.message}` }
      throw e
    }
    despues.set(f.id, b)
    for (const x of PASOS) {
      const a = f.clasificacion[x], d = b[x]
      if (d && d !== a && !nuevos.has(x)) nuevos.set(x, d)
      if (a && !d && esDePersona(a.procedencia) && !retirados.has(x)) retirados.set(x, a.valor)
    }
  }
  // Lo nuevo vale para todas las filas de la clave: lo que dijo una persona en
  // otra fila y ya no va con ello también se retira (la clave lo pisa en todas).
  for (const f of filas) {
    const c = f.clasificacion
    const queda = <Q extends PasoAnh>(q: Q) => (nuevos.get(q) ?? (retirados.has(q) ? undefined : c[q])) as DatoClasificado<string, unknown> | undefined
    const pl = queda('planeacion'), n1 = queda('n1'), n2 = queda('n2')
    if (pl && n1 && planeacionDeN1(n1.valor as ClaveN1) !== pl.valor) {
      if (nuevos.has('n1') && esDePersona(pl.procedencia) && !nuevos.has('planeacion'))
        return { error: `En ${filaEnPalabras(f)} «¿Planeada?» es «${ETIQUETA_PLANEACION[pl.valor as Planeacion]}» (lo dijo ${pl.por}): cambie primero «¿Planeada?».` }
      if (!nuevos.has('n1') && esDePersona(n1.procedencia)) { retirados.set('n1', n1.valor); if (n2 && esDePersona(n2.procedencia) && !nuevos.has('n2')) retirados.set('n2', n2.valor) }
    }
    const n1b = queda('n1'), n2b = queda('n2')
    if (n1b && n2b && n1DeCodigo(n2b.valor as CodigoN2) !== n1b.valor && esDePersona(n2b.procedencia) && !nuevos.has('n2')) retirados.set('n2', n2b.valor)
  }
  const cambios: Cambio[] = []
  for (const f of filas) for (const x of new Set([...nuevos.keys(), ...retirados.keys()])) {
    const d = f.clasificacion[x]
    if (!d || !esDePersona(d.procedencia)) continue
    const retira = retirados.has(x) && !nuevos.has(x)
    if (retira || String(d.valor) !== String(nuevos.get(x)!.valor)) cambios.push({ fila: f, paso: x, antes: d, retira })
  }
  return { nuevos, retirados, cambios }
}

/** El motivo de una corrección, en el porqué de lo que se guarda (P1 §5.3). */
function conMotivo<D extends DatoClasificado<unknown, unknown>>(d: D, paso: PasoAnh, motivo: string): D {
  if (paso !== 'choke') return { ...d, porque: motivo }
  const q = (d.porque ?? { regla: d.regla ?? '' }) as PorqueChoke
  return { ...d, porque: { ...q, texto: q.texto ? `${q.texto}. Motivo: ${motivo}` : motivo } }
}

/** El consecutivo que sigue: el orden en que se dice (`clasificacion_paso.id`). */
function contadorDe(g: Readonly<Record<string, BorradorClasificacion>>): () => number {
  let n = 0
  for (const b of Object.values(g)) {
    for (const p of PASOS) n = Math.max(n, b[p]?.n ?? 0)
    for (const r of b.respuestas ?? []) n = Math.max(n, r.n ?? 0)
    n = Math.max(n, b.revision?.n ?? 0, b.cauGral?.n ?? 0)
  }
  return () => ++n
}

/** Lo guardado en una clave con lo nuevo encima, paso por paso: la conversación
 *  se alarga y la revisión es la última (o la misma, atendida). */
export function fusionarGuardado(antes: BorradorClasificacion | undefined, nuevo: BorradorClasificacion): BorradorClasificacion {
  const r: Record<string, unknown> = { ...antes }
  for (const p of PASOS) if (nuevo[p]) r[p] = nuevo[p]
  if (nuevo.cauGral) r.cauGral = nuevo.cauGral
  if (nuevo.respuestas?.length) r.respuestas = [...(antes?.respuestas ?? []), ...nuevo.respuestas]
  if (nuevo.revision) r.revision = nuevo.revision
  return r as BorradorClasificacion
}

/** Atiende lo que se le pidió a este rol en las filas que toca la escritura
 *  («Algo está mal», «Pedir a producción»): la revisión que rige en cada fila
 *  queda con quién y cuándo, en la clave donde está guardada. */
function atender(escritos: Escritos, filas: readonly ParadaAnh[], g: Record<string, BorradorClasificacion>, quien: Persona, rol: string, hora: string) {
  for (const f of filas) {
    const rv = f.revision
    if (!rv || rv.atendida || !quienRevisa(rv).includes(rol)) continue
    const clave = [f.id, f.eventoId].find(k => g[k]?.revision === rv || (rv.n !== undefined && g[k]?.revision?.n === rv.n))
    if (!clave || escritos[clave]?.revision?.atendida) continue
    escritos[clave] = { ...escritos[clave], revision: conRevisionAtendida({ revision: rv }, quien, rol, hora).revision! }
  }
}

/** Guarda en la sesión lo escrito (paso por paso, D1) y devuelve la fila de la dirección como quedó. */
function guardar(id: string, escritos: Escritos, ctx: Contexto) {
  const { clasificacionesAnh } = sesion()
  const nuevas = { ...clasificacionesAnh }
  for (const [k, e] of Object.entries(escritos)) nuevas[k] = fusionarGuardado(clasificacionesAnh[k], e)
  cambiarSesion({ clasificacionesAnh: nuevas })
  return { parada: pedirParadaAnh(id, ctx, nuevas)!, guardadas: escritos }
}

/** Lo que el servidor guardó, en la copia de la sesión (con la fuente http), paso
 *  por paso: cambia su versión y las vistas de la ANH se piden de nuevo. */
function anotarClasificaciones(g: Record<string, BorradorClasificacion>) {
  const antes = sesion().clasificacionesAnh
  cambiarSesion({ clasificacionesAnh: { ...antes, ...Object.fromEntries(Object.entries(g).map(([k, e]) => [k, fusionarGuardado(antes[k], e)])) } })
}

/** Los pasos que el rol no dice (o no confirma) como suyos, dichos en palabras; undefined si son todos suyos. */
function pasosAjenos(rolId: string, pasos: readonly PasoAnh[], tabla: Readonly<Record<string, readonly PasoAnh[]>>, verbo: 'dice' | 'confirma'): string | undefined {
  const suyos = Object.hasOwn(tabla, rolId) ? tabla[rolId]! : []
  const ajenos = pasos.filter(p => !suyos.includes(p))
  if (!ajenos.length) return undefined
  return `Su rol no ${verbo} ${ajenos.map(p => `«${PASO_CAMPO[p]}»`).join(', ')}: lo ${verbo} ${QUIENES_TODO}.`
}

/** Lo que no cuadra en el valor de un paso (el 422), con las mismas palabras de `clasificar`. */
function valorInvalido(paso: PasoAnh, valor: unknown): string | undefined {
  if (typeof valor !== 'string') return PETICION(`pasos.${paso}`, 'tiene que ser un texto')
  if (!valor.trim()) return `«${PASO_CAMPO[paso]}» llegó vacío.`
  return incoherencias({ [paso]: { valor, procedencia: 'regla' } } as BorradorClasificacion)[0]
}

/** Lo que dice una persona de unos pasos en las claves de la escritura: las
 *  revisiones de motivo (422 en la fila de la dirección, 409 en las demás) y lo
 *  que se guarda en cada clave. Lo común a `…/clasificacion` y `…/yacimiento`. */
function escribirPasos(p: ParadaAnh, objetivos: readonly Objetivo[], decir: (b: BorradorClasificacion) => BorradorClasificacion,
  motivo: string | undefined, yo: { id: string; nombre: string }, rol: string, hora: string, faltaMotivo: string):
  { escritos: Escritos } | { error: string } {
  const porClave: Array<{ o: Objetivo; nuevos: Map<PasoAnh, DatoClasificado<unknown, unknown>>; retirados: Map<PasoAnh, unknown> }> = []
  const cambios: Cambio[] = []
  for (const o of objetivos) {
    const r = decirEn(o, p, decir)
    if ('error' in r) return r
    porClave.push({ o, nuevos: r.nuevos, retirados: r.retirados })
    cambios.push(...r.cambios)
  }
  const conMotivoValido = alcanza(motivo, MOTIVO_MINIMO)
  const enLaFila = cambios.filter(c => c.fila.id === p.id)
  if (enLaFila.length && !conMotivoValido) return { error: faltaMotivo }
  const deOtros = cambios.filter(c => c.fila.id !== p.id && c.antes.porId !== yo.id)
  if (deOtros.length && !conMotivoValido) {
    const unicos = [...new Map(deOtros.map(c => [`${c.fila.id}|${c.paso}`, c])).values()]
    return { error: `Esto cambia lo que dijo otra persona en ${unicos.length === 1 ? 'otra fila' : `${unicos.length} pasos de otras filas`}: ${unicos.slice(0, 4).map(cambioEnPalabras).join('; ')}${unicos.length > 4 ? `; y ${unicos.length - 4} más` : ''}. Para cambiarlo, diga por qué (un motivo de ${MOTIVO_MINIMO} caracteres o más).` }
  }
  // Retirar lo que dijo una persona (también uno mismo, en otra fila) siempre lleva motivo: queda con el retiro.
  const retira = porClave.flatMap(x => [...x.retirados.keys()])
  if (retira.length && !conMotivoValido)
    return { error: `Falta el motivo: esto retira ${[...new Set(retira)].map(x => `«${PASO_CAMPO[x]}»`).join(', ')}, que ya había dicho una persona (vuelve a lo que propone TRIM).` }
  const m = conMotivoValido && cambios.length ? motivo!.trim() : undefined
  const n = contadorDe(sesion().clasificacionesAnh)
  const escritos: Escritos = {}
  for (const { o, nuevos, retirados } of porClave) {
    const e: Record<string, unknown> = {}
    for (const x of PASOS) {
      const d = nuevos.get(x)
      if (d) e[x] = { ...(m ? conMotivo(d, x, m) : d), n: n() }
      else if (retirados.has(x)) e[x] = { valor: retirados.get(x), procedencia: 'retirado', por: yo.nombre, porId: yo.id, rol, hora, ...(m ? { porque: m } : {}), n: n() }
    }
    if (Object.keys(e).length) escritos[o.clave] = e as BorradorClasificacion
  }
  return { escritos }
}

/** `POST /api/anh/paradas/:id/clasificacion { pasos, motivo?, aplicarAlEvento?,
 *  aplicarALaCascada?, ids?, cadena? }` → la fila como quedó y lo guardado. Un
 *  paso que faltaba queda `declarado`; uno que TRIM proponía distinto,
 *  `corregido` (con lo propuesto al lado); el mismo, `confirmado` (`declararPaso`).
 *  Se guardan SOLO los pasos de esta petición (D1), en la fila, en el evento o en
 *  cada evento de la cascada que mostró la pantalla. La coherencia planeada /
 *  causa no se rompe: una causa de la otra planeación se rechaza en palabras,
 *  un detalle arrastra su causa, y la causa de una persona que una planeación
 *  nueva deja incoherente queda `retirada`, con motivo (C-05). «En el
 *  yacimiento» va por `…/yacimiento`. */
export async function clasificarParada(q: Credencial, id: string, c: CuerpoClasificacion): Promise<Resultado<{ parada: ParadaAnh }>> {
  const cuerpoDe = (): CuerpoClasificacion => ({ pasos: c.pasos, ...(c.motivo !== undefined ? { motivo: c.motivo } : {}),
    ...(c.aplicarAlEvento ? { aplicarAlEvento: true } : {}), ...(c.aplicarALaCascada ? { aplicarALaCascada: true, ids: c.ids ?? [] } : {}), ...(c.cadena !== undefined ? { cadena: c.cadena } : {}) })
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', `/anh/paradas/${encodeURIComponent(id)}/clasificacion`, cuerpoDe(), R_CLASIFICACION)
    if (!r.ok) return r
    anotarClasificaciones(r.datos.guardadas)
    return { ok: true, parada: r.datos.parada }
  }
  // El servidor: la forma del cuerpo antes que las reglas (400, C-11).
  const forma = revisarForma(c, { pasos: 'objeto', motivo: 'texto?', aplicarAlEvento: 'bool?', aplicarALaCascada: 'bool?', ids: 'textos?', cadena: 'texto?' })
  if (forma) return { ok: false, error: forma }
  const cuerpo = cuerpoDe()
  const { ctx, usuarios, clasificacionesAnh } = sesion()
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!puedeHacer(rol.puede, 'anh:clasificar')) return { ok: false, error: 'Su rol no clasifica paradas para la ANH.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  const parada = filaDe(id, camposAsignados(rol, usuarios).map(x => x.id), ctx, clasificacionesAnh)
  if (!parada) return { ok: false, error: NO_ESTA }
  const valores = Object.fromEntries(Object.entries(c.pasos as Record<string, unknown>)) as Partial<Record<PasoAnh, string>>
  const pasos = PASOS.filter(p => Object.hasOwn(valores, p))
  const ajeno = pasosAjenos(q.rolId, pasos, PASOS_QUE_DECLARA, 'dice')
  if (ajeno) return { ok: false, error: ajeno }
  if (c.cadena !== undefined && c.cadena !== cadenaVista(parada.clasificacion)) return { ok: false, error: CAMBIO_LA_PARADA }
  const extra = Object.keys(valores).filter(k => !PASOS.includes(k as PasoAnh))
  if (extra.length) return { ok: false, error: `${extra.map(k => `«${k}»`).join(', ')} no ${extra.length === 1 ? 'es un paso' : 'son pasos'} de la clasificación.` }
  if (!pasos.length) return { ok: false, error: 'No llegó ningún paso que guardar.' }
  for (const p of pasos) { const m = valorInvalido(p, valores[p]); if (m) return { ok: false, error: m } }
  if (valores.choke === 'reservorio') return { ok: false, error: '«En el yacimiento» lo pone producción o confiabilidad diciendo qué lo muestra (la prueba del pozo, el corte de agua o la presión de fondo).' }
  const tope = revisarTopes(c as unknown as Record<string, unknown>, ['motivo'])
  if (tope) return { ok: false, error: tope }
  const alcance = objetivosDe(parada, cuerpo, ctx, clasificacionesAnh)
  if ('error' in alcance) return { ok: false, error: alcance.error }
  const hora = horaDelPlc(), quien = { id: yo.id, nombre: yo.nombre }
  const decir = (b: BorradorClasificacion) => pasos.reduce((x, p) => declararPaso(x, p, valores[p] as ValoresPasos[PasoAnh], quien, q.rolId, hora), b)
  const r = escribirPasos(parada, alcance.objetivos, decir, c.motivo, quien, q.rolId, hora, 'Falta el motivo: cambia algo que ya había dicho una persona.')
  if ('error' in r) return { ok: false, error: r.error }
  atender(r.escritos, alcance.objetivos.flatMap(o => o.filas), clasificacionesAnh, quien, q.rolId, hora)
  return { ok: true, parada: guardar(parada.id, r.escritos, ctx).parada }
}

/** `POST /api/anh/paradas/:id/yacimiento { evidencia, motivo?, aplicarAlEvento?,
 *  cadena? }` → la fila con «En el yacimiento» en el paso 2. Solo producción y
 *  confiabilidad (`anh:yacimiento`): necesita la prueba del pozo, el corte de
 *  agua o la presión de fondo, que no se ven desde el campo, y nunca sale de una
 *  señal. Es de cada pozo: el alcance es la fila o su evento, nunca la cascada
 *  (C-17: el alcance sale solo de los campos del cuerpo del contrato). */
export async function declararYacimientoAnh(q: Credencial, id: string, c: CuerpoYacimiento): Promise<Resultado<{ parada: ParadaAnh }>> {
  const cuerpoDe = (): CuerpoYacimiento => ({ evidencia: c.evidencia, ...(c.motivo !== undefined ? { motivo: c.motivo } : {}),
    ...(c.aplicarAlEvento ? { aplicarAlEvento: true } : {}), ...(c.cadena !== undefined ? { cadena: c.cadena } : {}) })
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', `/anh/paradas/${encodeURIComponent(id)}/yacimiento`, cuerpoDe(), R_CLASIFICACION)
    if (!r.ok) return r
    anotarClasificaciones(r.datos.guardadas)
    return { ok: true, parada: r.datos.parada }
  }
  const forma = revisarForma(c, { evidencia: 'texto', motivo: 'texto?', aplicarAlEvento: 'bool?', cadena: 'texto?' })
  if (forma) return { ok: false, error: forma }
  const cuerpo = cuerpoDe()
  const { ctx, usuarios, clasificacionesAnh } = sesion()
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!puedeHacer(rol.puede, 'anh:yacimiento'))
    return { ok: false, error: '«En el yacimiento» lo ponen producción o confiabilidad: necesita la prueba del pozo, el corte de agua o la presión de fondo, que no se ven desde el campo.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  const parada = filaDe(id, camposAsignados(rol, usuarios).map(x => x.id), ctx, clasificacionesAnh)
  if (!parada) return { ok: false, error: NO_ESTA }
  if (c.cadena !== undefined && c.cadena !== cadenaVista(parada.clasificacion)) return { ok: false, error: CAMBIO_LA_PARADA }
  const tope = revisarTopes(c as unknown as Record<string, unknown>, ['evidencia', 'motivo'])
  if (tope) return { ok: false, error: tope }
  // Solo los campos del cuerpo del contrato: «para la cascada» no existe aquí (C-17).
  const alcance = objetivosDe(parada, { ...(cuerpo.aplicarAlEvento ? { aplicarAlEvento: true } : {}) }, ctx, clasificacionesAnh)
  if ('error' in alcance) return { ok: false, error: alcance.error }
  const hora = horaDelPlc(), quien = { id: yo.id, nombre: yo.nombre }
  const r = escribirPasos(parada, alcance.objetivos, b => declararYacimiento(b, c.evidencia, quien, q.rolId, hora), c.motivo, quien, q.rolId, hora,
    'Falta el motivo: cambia dónde se trabó, que ya había dicho una persona.')
  if ('error' in r) return { ok: false, error: r.error }
  atender(r.escritos, alcance.objetivos.flatMap(o => o.filas), clasificacionesAnh, quien, q.rolId, hora)
  return { ok: true, parada: guardar(parada.id, r.escritos, ctx).parada }
}

/** El 409 de una pregunta que se cerró mientras se veía (otra persona ya la contestó). */
const YA_CONTESTADA = 'Mientras la veía, alguien ya contestó esa pregunta: vuelva a abrir la parada para ver cómo quedó.'
/** Las preguntas que existen (las fijas y las que arma el motor: el tramo, la causa y el detalle). */
const PREGUNTAS_QUE_EXISTEN: readonly string[] = [...Object.keys(PREGUNTAS_CAMPO), 'raiz', 'detalle', 'choke']

/** ¿Va el valor que deja una respuesta con lo que dijo una persona en esta fila? (planeación y causa; causa y detalle). */
function vaConLoDicho(b: BorradorClasificacion, paso: PasoAnh, valor: string): boolean {
  const dePersona = (q: PasoAnh) => { const d = b[q]; return d && esDePersona(d.procedencia) ? String(d.valor) : undefined }
  const pl = dePersona('planeacion'), n1 = dePersona('n1'), n2 = dePersona('n2')
  if (paso === 'planeacion') return !n1 || planeacionDeN1(n1 as ClaveN1) === valor
  if (paso === 'n1') return (!pl || planeacionDeN1(valor as ClaveN1) === pl) && (!n2 || n1DeCodigo(n2 as CodigoN2) === valor)
  if (paso === 'n2') return (!n1 || n1DeCodigo(valor as CodigoN2) === n1) && (!pl || planeacionDeN1(n1DeCodigo(valor as CodigoN2)) === pl)
  return true
}

/** `POST /api/anh/paradas/:id/respuesta { pregunta, opcion, aplicarAlEvento?,
 *  aplicarALaCascada?, ids?, cadena? }` → la fila como quedó. Lo que contesta una
 *  persona en el campo a una pregunta abierta de la parada («¿Qué lo paró?»,
 *  «¿De dónde vino el corte?»…), con el texto exacto del botón. Corre
 *  `responder`: la respuesta no corrige ni confirma (D1; B-04): solo el paso que
 *  determina queda `declarado` a nombre de quien contestó (un paso que su rol no
 *  avala, como el tramo que sale de «De este pozo», lo confirma después quien
 *  revisa); lo que ya dijo una persona en una fila del alcance no se toca. La
 *  respuesta queda en la conversación de cada clave y la pregunta que sigue
 *  llega en la vista. «No sé» no fija nada: la pregunta sigue abierta y escala a
 *  quien revisa (y repetirlo no la vuelve a guardar). Orden: forma (400),
 *  capacidad y persona (403), la fila (404), la cadena (409), la pregunta (409 si
 *  otra persona ya la contestó; 422 si no es de esta parada), quién la contesta
 *  (403), la opción (422) y el alcance (422/409). */
export async function responderPreguntaAnh(q: Credencial, id: string, c: CuerpoRespuestaAnh): Promise<Resultado<{ parada: ParadaAnh }>> {
  const cuerpoDe = (): CuerpoRespuestaAnh => ({ pregunta: c.pregunta, opcion: c.opcion,
    ...(c.aplicarAlEvento ? { aplicarAlEvento: true } : {}), ...(c.aplicarALaCascada ? { aplicarALaCascada: true, ids: c.ids ?? [] } : {}), ...(c.cadena !== undefined ? { cadena: c.cadena } : {}) })
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', `/anh/paradas/${encodeURIComponent(id)}/respuesta`, cuerpoDe(), R_CLASIFICACION)
    if (!r.ok) return r
    anotarClasificaciones(r.datos.guardadas)
    return { ok: true, parada: r.datos.parada }
  }
  const forma = revisarForma(c, { pregunta: 'texto', opcion: 'texto', aplicarAlEvento: 'bool?', aplicarALaCascada: 'bool?', ids: 'textos?', cadena: 'texto?' })
  if (forma) return { ok: false, error: forma }
  const cuerpo = cuerpoDe()
  const { ctx, usuarios, clasificacionesAnh } = sesion()
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!puedeHacer(rol.puede, 'anh:clasificar')) return { ok: false, error: 'Su rol no contesta las preguntas de las paradas.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  const parada = filaDe(id, camposAsignados(rol, usuarios).map(x => x.id), ctx, clasificacionesAnh)
  if (!parada) return { ok: false, error: NO_ESTA }
  if (c.cadena !== undefined && c.cadena !== cadenaVista(parada.clasificacion)) return { ok: false, error: CAMBIO_LA_PARADA }
  const pregunta = parada.propuesta.preguntas.find(x => x.id === c.pregunta)
  if (!pregunta) {
    // Otra persona la contestó (409) o no es de esta parada (422, C-18).
    const contestada = (parada.clasificacion.respuestas ?? []).some(r => r.pregunta === c.pregunta && !r.noSe)
    return { ok: false, error: contestada ? YA_CONTESTADA
      : PREGUNTAS_QUE_EXISTEN.includes(c.pregunta) ? 'Esa pregunta no es de esta parada: TRIM no la abrió.' : `«${c.pregunta.slice(0, 40)}» no es una pregunta de TRIM.` }
  }
  if (!ROLES_QUE_CONTESTAN[pregunta.quien].includes(q.rolId)) return { ok: false, error: `«${pregunta.texto}» la contesta ${QUIEN_CONTESTA[pregunta.quien]}.` }
  const i = pregunta.opciones.findIndex(o => o.texto === c.opcion)
  if (i < 0) return { ok: false, error: `«${c.opcion.slice(0, 80)}» no es una de las respuestas de «${pregunta.texto}».` }
  const alcance = objetivosDe(parada, cuerpo, ctx, clasificacionesAnh)
  if ('error' in alcance) return { ok: false, error: alcance.error }
  // «No sé» otra vez, de la misma persona, a la misma pregunta: ya está guardado (C-19).
  const ultima = parada.clasificacion.respuestas?.at(-1)
  if (esNoSe(pregunta.opciones[i]!) && ultima?.noSe && ultima.pregunta === pregunta.id && ultima.porId === yo.id) return { ok: true, parada }
  const hora = horaDelPlc(), quien = { id: yo.id, nombre: yo.nombre }
  let b: BorradorClasificacion
  try { b = responder(parada.propuesta, pregunta.id as IdPregunta, i, quien, q.rolId, hora).borrador }
  catch (e) {
    if (e instanceof ErrorClasificacion) return { ok: false, error: e.message }
    throw e
  }
  // Lo que la respuesta determinó en la fila de la dirección: lo nuevo de una persona.
  const dejados = PASOS.filter(x => { const d = b[x]; return !!d && d !== parada.clasificacion[x] && esDePersona(d.procedencia) })
  const registro = b.respuestas!.at(-1)!
  const n = contadorDe(clasificacionesAnh)
  const escritos: Escritos = {}
  for (const o of alcance.objetivos) {
    const e: Record<string, unknown> = {}
    for (const x of dejados) {
      const d = b[x]!
      // Donde una persona ya dijo ese paso, o donde no iría con lo que dijo, no se deja: la respuesta no corrige.
      if (o.filas.some(f => f.id !== parada.id && ((f.clasificacion[x] && esDePersona(f.clasificacion[x]!.procedencia)) || !vaConLoDicho(f.clasificacion, x, String(d.valor))))) continue
      e[x] = { ...d, n: n() }
    }
    e.respuestas = [{ ...registro, n: n() }]
    escritos[o.clave] = e as BorradorClasificacion
  }
  atender(escritos, alcance.objetivos.flatMap(o => o.filas), clasificacionesAnh, quien, q.rolId, hora)
  return { ok: true, parada: guardar(parada.id, escritos, ctx).parada }
}

/** Los roles a los que se les puede pedir una parada: los que revisan. */
const PIDEN_A = ROLES_QUE_CONTESTAN.revisa

/** Escribe una revisión en las claves de la escritura (no toca ningún paso, D1),
 *  salvo que ya esté la misma sin atender (C-19). */
function escribirRevision(p: ParadaAnh, objetivos: readonly Objetivo[], revision: Omit<RevisionAnh, 'n'>): Escritos {
  const r = p.revision
  if (r && !r.atendida && r.porId === revision.porId && r.motivo === revision.motivo && (r.pedirA ?? '') === (revision.pedirA ?? '')) return {}
  const n = contadorDe(sesion().clasificacionesAnh)
  return Object.fromEntries(objetivos.map(o => [o.clave, { revision: { ...revision, n: n() } }]))
}

/** `POST /api/anh/paradas/:id/revision { motivo, pedirA?, aplicarAlEvento?,
 *  aplicarALaCascada?, ids?, cadena? }` → la fila como quedó, con su `revision`.
 *  «Algo está mal» (sin `pedirA`: a quien revisa) o «Pedir a producción»
 *  (`pedirA: 'prod'`, la pregunta del yacimiento). No toca ningún paso (D1):
 *  pasa la parada a quien corrige, con el motivo, y sale de REVISAR cuando ese rol
 *  dice, corrige, contesta o confirma algo de ella (`atender`). La misma revisión
 *  otra vez, sin atender, no se guarda dos veces. Orden: forma (400), capacidad y
 *  persona (403), la fila (404), la cadena (409), el motivo y a quién (422) y el
 *  alcance (422/409). */
export async function revisarParadaAnh(q: Credencial, id: string, c: CuerpoRevisionAnh): Promise<Resultado<{ parada: ParadaAnh }>> {
  const cuerpoDe = (): CuerpoRevisionAnh => ({ motivo: c.motivo, ...(c.pedirA !== undefined ? { pedirA: c.pedirA } : {}),
    ...(c.aplicarAlEvento ? { aplicarAlEvento: true } : {}), ...(c.aplicarALaCascada ? { aplicarALaCascada: true, ids: c.ids ?? [] } : {}), ...(c.cadena !== undefined ? { cadena: c.cadena } : {}) })
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', `/anh/paradas/${encodeURIComponent(id)}/revision`, cuerpoDe(), R_CLASIFICACION)
    if (!r.ok) return r
    anotarClasificaciones(r.datos.guardadas)
    return { ok: true, parada: r.datos.parada }
  }
  const forma = revisarForma(c, { motivo: 'texto', pedirA: 'texto?', aplicarAlEvento: 'bool?', aplicarALaCascada: 'bool?', ids: 'textos?', cadena: 'texto?' })
  if (forma) return { ok: false, error: forma }
  const cuerpo = cuerpoDe()
  const { ctx, usuarios, clasificacionesAnh } = sesion()
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!puedeHacer(rol.puede, 'anh:clasificar')) return { ok: false, error: 'Su rol no marca paradas para revisar.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  const parada = filaDe(id, camposAsignados(rol, usuarios).map(x => x.id), ctx, clasificacionesAnh)
  if (!parada) return { ok: false, error: NO_ESTA }
  if (c.cadena !== undefined && c.cadena !== cadenaVista(parada.clasificacion)) return { ok: false, error: CAMBIO_LA_PARADA }
  if (!alcanza(c.motivo, MOTIVO_MINIMO)) return { ok: false, error: 'Diga qué está mal (o qué pide): queda con la parada para quien la revisa.' }
  const tope = revisarTopes(c as unknown as Record<string, unknown>, ['motivo'])
  if (tope) return { ok: false, error: tope }
  if (c.pedirA !== undefined && !PIDEN_A.includes(c.pedirA))
    return { ok: false, error: 'Una parada se le pide a quien revisa: supervisión, producción, el jefe de mantenimiento o confiabilidad.' }
  if (c.pedirA === q.rolId) return { ok: false, error: 'Esa revisión le toca a su propio rol: corríjala usted.' }
  const alcance = objetivosDe(parada, cuerpo, ctx, clasificacionesAnh)
  if ('error' in alcance) return { ok: false, error: alcance.error }
  const escritos = escribirRevision(parada, alcance.objetivos, { motivo: c.motivo.trim(), ...(c.pedirA ? { pedirA: c.pedirA } : {}),
    por: yo.nombre, porId: yo.id, rol: q.rolId, hora: horaDelPlc() })
  return { ok: true, parada: guardar(parada.id, escritos, ctx).parada }
}

/** El motivo de «2 Algo está mal» por WhatsApp: estructurado, sin texto libre (D2). */
export const MOTIVO_WHATSAPP = 'Por WhatsApp: «Algo está mal» en lo que contestó'

/** «2 Algo está mal» al cierre de una respuesta por WhatsApp (B-05; U1 §2.6). En
 *  producción la manda el webhook firmado de Meta; en el demo, el teléfono
 *  simulado. Es la misma escritura que el botón de la pantalla (`…/revision`):
 *  no toca ningún paso y deja para revisar las filas de la parada (las de su
 *  evento o, si la parada es de una bomba o de un servicio, las de su cascada),
 *  a nombre de quien recibe las alertas de ese campo en ese número. */
export async function revisarDesdeWhatsapp(c: { evento: string; campoId: string; usuarioId: string }): Promise<Resultado> {
  if (FUENTE === 'http') return { ok: false, error: WHATSAPP_SOLO_WEBHOOK }
  const { ctx, usuarios, clasificacionesAnh } = sesion()
  const u = usuarios.find(x => x.id === c.usuarioId)
  const malEvento = revisarEvento(c.evento, c.campoId)
  if (malEvento) return { ok: false, error: malEvento }
  if (!u || !recibeAlertas(u, c.campoId)) return { ok: false, error: 'Ese número no recibe las alertas de este campo: la respuesta no entra.' }
  const rol = rolExacto(u.rolId)
  if (!rol || !puedeHacer(rol.puede, 'anh:clasificar')) return { ok: false, error: 'Su rol no marca paradas para revisar.' }
  // Las filas de la parada: las de su evento, o las de su cascada si la parada es de una bomba o de un servicio.
  const deLaParada = filasDeEventos(c.campoId, [c.evento], ctx, clasificacionesAnh)
  const filas = (deLaParada.length ? deLaParada : filasDeRaiz(c.campoId, c.evento, ctx, clasificacionesAnh)).filter(f => !f.exceso)
  if (!filas.length) return { ok: false, error: 'Esa parada no tiene filas para la ANH todavía: avísele a su supervisor.' }
  const eventos = [...new Set(filas.map(f => f.eventoId))]
  const objetivos = eventos.map(e => ({ clave: e, filas: filas.filter(f => f.eventoId === e) }))
  const escritos = escribirRevision(filas[0]!, objetivos, { motivo: MOTIVO_WHATSAPP, por: u.nombre, porId: u.id, rol: u.rolId, hora: horaDelPlc() })
  guardar(filas[0]!.id, escritos, ctx)
  return { ok: true }
}

/** La fila confirmada solo en los pasos pedidos: lo demás vuelve a como estaba. */
function soloLosPedidos(antes: ParadaAnh, despues: ParadaAnh, pedidos: readonly PasoAnh[]): ParadaAnh {
  const b: Record<string, unknown> = { ...despues.clasificacion }
  for (const p of PASOS) if (!pedidos.includes(p)) { const d = antes.clasificacion[p]; if (d) b[p] = d; else delete b[p] }
  return conClasificacion(despues, b as BorradorClasificacion)
}

/** `POST /api/anh/paradas/confirmar { ids, cadena, pasos? }` → las filas como
 *  quedaron y, si fueron varias, el lote. Una sola la confirma quien clasifica
 *  (`anh:clasificar`); varias de una vez, quien firma el día (`anh:confirmar`:
 *  supervisión y producción), y tienen que tener la misma cadena completa de 6
 *  pasos (U1 §2.2). `cadena` es obligatoria (C-06): se confirma lo que se vio, y
 *  el lote guarda esa. Sube a confirmado solo los pasos que el rol avala
 *  (`PASOS_QUE_CONFIRMA`) y que nadie había avalado, y lo guarda en cada FILA
 *  (nunca en su evento): la marca del lote no se copia a otra fila. Un lote que
 *  no sube ningún paso no se guarda (409, C-19). Con «una señal apunta», la causa
 *  y el detalle solo los confirma quien abre o analiza el equipo (`confirmarPasos`). */
export async function confirmarParadasAnh(q: Credencial, c: CuerpoConfirmacion): Promise<Resultado<{ lote?: ConfirmacionLote; paradas: ParadaAnh[] }>> {
  if (FUENTE === 'http') {
    const cuerpo: CuerpoConfirmacion = { ids: [...new Set(c.ids ?? [])], cadena: c.cadena, ...(c.pasos ? { pasos: c.pasos } : {}) }
    const r = await escribir(q, 'POST', '/anh/paradas/confirmar', cuerpo, R_CONFIRMACION)
    if (!r.ok) return r
    anotarClasificaciones(Object.fromEntries(r.datos.paradas.map(p => [p.id, soloDePersona(p.clasificacion)])))
    if (r.datos.lote) cambiarSesion({ lotesAnh: [...sesion().lotesAnh, r.datos.lote] })
    return { ok: true, paradas: r.datos.paradas, ...(r.datos.lote ? { lote: r.datos.lote } : {}) }
  }
  // El servidor: la forma del cuerpo antes que las reglas (400, C-11); `cadena` es obligatoria (C-06).
  const forma = revisarForma(c, { ids: 'textos', cadena: 'texto', pasos: 'textos?' })
  if (forma) return { ok: false, error: forma }
  const ids = [...new Set(c.ids)]
  const { ctx, usuarios, clasificacionesAnh, lotesAnh } = sesion()
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  const enLote = ids.length > 1
  if (enLote ? !puedeHacer(rol.puede, 'anh:confirmar') : !(puedeHacer(rol.puede, 'anh:confirmar') || puedeHacer(rol.puede, 'anh:clasificar')))
    return { ok: false, error: enLote ? 'Confirmar varias de una vez lo hacen supervisión o producción, que firman el día: confírmelas una por una.' : 'Su rol no confirma paradas para la ANH.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  if (!ids.length) return { ok: false, error: 'No llegó ninguna parada que confirmar.' }
  if (ids.length > MAXIMO_IDS) return { ok: false, error: `Una petición lleva hasta ${MAXIMO_IDS} filas.` }
  // Primero el campo de cada id (sin armar filas): una de un campo ajeno o que no existe es 404, sin decir cuál (C-20).
  const mios = camposAsignados(rol, usuarios).map(x => x.id)
  const fuera = ids.find(id => id.length > 200 || !mios.includes(campoDeLaFila(id) ?? ''))
  if (fuera) return { ok: false, error: `La parada ${fuera.slice(0, 80)} no está entre las de sus campos: revise el evento y el día.` }
  const paradas: ParadaAnh[] = []
  for (const id of ids) {
    const p = pedirParadaAnh(id, ctx, clasificacionesAnh)
    if (!p) return { ok: false, error: `La parada ${id} no está entre las de sus campos: revise el evento y el día.` }
    paradas.push(p)
  }
  const pedidos = c.pasos ? PASOS.filter(p => c.pasos!.includes(p)) : undefined
  if (pedidos) { const ajeno = pasosAjenos(q.rolId, pedidos, PASOS_QUE_CONFIRMA, 'confirma'); if (ajeno) return { ok: false, error: ajeno } }
  const cambiaron = paradas.filter(p => cadenaVista(p.clasificacion) !== c.cadena)
  if (cambiaron.length) return { ok: false, error: cambiaron.length === paradas.length && paradas.length === 1 ? CAMBIO_LA_PARADA
    : `Mientras las revisaba, alguien cambió ${cambiaron.length === 1 ? 'una de estas paradas' : `${cambiaron.length} de estas paradas`}: vuelva a abrir el grupo.` }
  const desconocidos = (c.pasos ?? []).filter(p => !PASOS.includes(p as PasoAnh))
  if (desconocidos.length) return { ok: false, error: `${desconocidos.map(p => `«${p.slice(0, 40)}»`).join(', ')} no ${desconocidos.length === 1 ? 'es un paso' : 'son pasos'} de la clasificación.` }
  const hora = horaDelPlc(), quien = { id: yo.id, nombre: yo.nombre }
  let lote: ConfirmacionLote | undefined, confirmadas: ParadaAnh[]
  try {
    if (enLote) ({ lote, paradas: confirmadas } = confirmarLote(paradas, q.rolId, quien, hora, `LOTE-${lotesAnh.length + 1}`, c.cadena))
    else confirmadas = [confirmarParada(paradas[0]!, q.rolId, quien, hora)]
  } catch (e) { return { ok: false, error: mensajeDe(e) } }
  if (pedidos) confirmadas = confirmadas.map((p, i) => soloLosPedidos(paradas[i]!, p, pedidos))
  // Lo que se guarda: en cada fila, solo los pasos que esta confirmación subió.
  const n = contadorDe(clasificacionesAnh)
  const escritos: Escritos = {}
  confirmadas.forEach((p, i) => {
    const antes = paradas[i]!.clasificacion, e: Record<string, unknown> = {}
    for (const x of PASOS) { const d = p.clasificacion[x]; if (d && d !== antes[x] && d.procedencia === 'confirmado') e[x] = { ...d, n: n() } }
    if (Object.keys(e).length) escritos[p.id] = e as BorradorClasificacion
  })
  if (lote) {
    const id = lote.id
    const subio = new Set<PasoAnh>()
    for (const e of Object.values(escritos)) for (const x of PASOS) if (e[x]?.lote === id) subio.add(x)
    if (!subio.size) return { ok: false, error: 'Ya estaban confirmadas: este lote no sube ningún paso y no se guardó.' }
    lote = { ...lote, pasos: lote.pasos.filter(x => subio.has(x)) }
  }
  // Confirmar también atiende lo que se le pidió a ese rol («Algo está mal», «Pedir a producción»).
  atender(escritos, paradas, clasificacionesAnh, quien, q.rolId, hora)
  const { clasificacionesAnh: g } = sesion()
  const nuevas = { ...g }
  for (const [k, e] of Object.entries(escritos)) nuevas[k] = fusionarGuardado(g[k], e)
  cambiarSesion({ clasificacionesAnh: nuevas, ...(lote ? { lotesAnh: [...lotesAnh, lote] } : {}) })
  return { ok: true, paradas: confirmadas.map(p => pedirParadaAnh(p.id, ctx, nuevas)!), ...(lote ? { lote } : {}) }
}

/* ─────────────────────────── la topología del choke ─────────────────────────── */

/** `POST /api/configuracion/vista-previa { config }` → lo que cambiaría en cada
 *  campo si se firmara (U2 §8.5): qué limita hoy, qué equipos cambian en «si
 *  falla hoy» y cuántas paradas cambiarían de tramo, con las ya confirmadas
 *  aparte. No guarda nada. Las mismas reglas de la firma: `config:firmar`, los
 *  campos que toca entre los de la persona (403) y `validarConfig` (422). */
export async function previsualizarConfiguracion(q: Credencial, c: CuerpoVistaPrevia): Promise<Resultado<{ impacto: ImpactoConfig }>> {
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', '/configuracion/vista-previa', { config: c.config }, R_VISTA_PREVIA)
    if (!r.ok) return r
    return { ok: true, impacto: r.datos.impacto }
  }
  const { ctx, usuarios, clasificacionesAnh } = sesion()
  const forma = revisarForma(c, { config: 'objeto' }) ?? formaDeConfig(c.config)
  if (forma) return { ok: false, error: forma }
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!rol.puede['config:firmar']) return { ok: false, error: 'La vista previa de la configuración técnica la prepara el administrador de la implementación.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  const config = normalizarConfig(c.config)
  // Las mismas reglas de la firma (C-21): una versión que toca metas también pide metas:firmar.
  if (diferenciasPorGrupo(ctx.config, config).metas.length && !rol.puede['metas:firmar'])
    return { ok: false, error: 'Las metas, el precio y la regla de cierre los firma el gerente de activo: la vista previa es de lo que usted puede firmar.' }
  const mios = camposAsignados(rol, usuarios).map(x => x.id)
  const tocados = camposTocados(ctx.config, config).filter(id => CAMPOS.some(x => x.id === id))
  const ajenos = tocados.filter(id => !mios.includes(id))
  if (ajenos.length) return { ok: false, error: `No tiene asignado ${ajenos.map(id => campoPorId(id).nombre).join(', ')}: lo de ese campo lo firma quien lo tenga.` }
  const errores = validarConfig(config, ctx.config, `${diaIso(AHORA).slice(0, 8)}01`, AHORA.getTime())
  if (errores.length) return { ok: false, error: errores.join(' ') }
  const capacidades = capacidadesQueBloquean(ctx.config, config, ctx, sesion().versiones)
  if (capacidades.length) return { ok: false, error: capacidades.join(' ') }
  return { ok: true, impacto: impactoConfig(ctx, config, tocados, guardadasDe(clasificacionesAnh)) }
}

/** `POST /api/topologia/importar { campo, texto }` → la topología leída de un CSV
 *  o un pegado de Excel, «equipo; pozos a los que sirve», con lo que bloquea
 *  dicho por fila (U2 §8.3). No firma: lo leído va al borrador de la
 *  configuración y se firma con `POST /api/configuracion`. */
export async function importarTopologia(q: Credencial, c: CuerpoTopologiaCsv): Promise<Resultado<TopologiaLeida>> {
  if (FUENTE === 'http') {
    const r = await escribir(q, 'POST', '/topologia/importar', { campo: c.campo, texto: c.texto }, R_TOPOLOGIA_CSV)
    if (!r.ok) return r
    return { ok: true, ...r.datos }
  }
  const { usuarios } = sesion()
  // Un texto que no es texto no es «un archivo vacío» (C-27): es un 400 en palabras (C-11).
  const forma = revisarForma(c, { campo: 'texto', texto: 'texto' })
  if (forma) return { ok: false, error: forma }
  const rol = rolExacto(q.rolId)
  if (!rol) return { ok: false, error: SIN_ROL }
  if (!rol.puede['config:firmar']) return { ok: false, error: 'La topología la carga el administrador de la implementación.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  if (!CAMPOS.some(x => x.id === c.campo)) return { ok: false, error: 'Ese campo no está en el registro de campos.' }
  if (!camposAsignados(rol, usuarios).some(x => x.id === c.campo)) return { ok: false, error: 'Ese campo no lo tiene asignado.' }
  if (!c.texto.trim()) return { ok: false, error: 'El archivo llegó vacío: va una fila por equipo, con «equipo; pozos a los que sirve».' }
  // El fin de línea de un Excel de Mac viejo (solo «\r») también parte las filas (C-24).
  return { ok: true, ...acotarLeida(leerTopologia(c.texto.replace(/\r\n?/g, '\n'), c.campo, locacionDe(c.campo))) }
}

/** Cuántos hallazgos devuelve una carga (C-12): el resto se cuenta, no se repite. */
const MAXIMO_HALLAZGOS = 50
/** Cuántos caracteres de un equipo escrito vuelven en un hallazgo (C-12). */
const MAXIMO_EQUIPO = 64
/** Los caracteres de control y de formato (dirección del texto, ancho cero): pintan una línea al revés o esconden letras. */
const INVISIBLES = /[\p{Cc}\p{Cf}]/gu
/** Lo que vuelve de una carga, acotado: sin caracteres invisibles (C-24), con el
 *  equipo escrito recortado y, pasados los 50 hallazgos, uno solo que dice cuántos
 *  más hay y si alguno bloquea (C-12). Lo leído no cambia. */
function acotarLeida(t: TopologiaLeida): TopologiaLeida {
  const limpio = (x: string) => x.replace(INVISIBLES, '')
  const corto = (x: string) => (x.length > MAXIMO_EQUIPO ? `${x.slice(0, MAXIMO_EQUIPO)}…` : x)
  const hallazgos = t.hallazgos.map(h => {
    const equipo = h.equipo === undefined ? undefined : limpio(h.equipo)
    const texto = h.equipo !== undefined && equipo !== undefined ? limpio(h.texto.split(h.equipo).join(corto(equipo))) : limpio(h.texto)
    return { ...h, ...(equipo !== undefined ? { equipo: corto(equipo) } : {}), texto }
  })
  if (hallazgos.length <= MAXIMO_HALLAZGOS) return { ...t, hallazgos }
  const resto = hallazgos.slice(MAXIMO_HALLAZGOS)
  const bloquean = resto.filter(h => h.bloquea).length
  return { ...t, hallazgos: [...hallazgos.slice(0, MAXIMO_HALLAZGOS), { fila: resto[0]!.fila, bloquea: bloquean > 0,
    texto: `Y ${resto.length} hallazgos más desde la fila ${resto[0]!.fila}${bloquean ? ` (${bloquean} bloquean)` : ''}: corrija los de arriba y vuelva a cargar el archivo.` }] }
}

/** La forma de la configuración que llega a firmarse o a previsualizarse (C-11):
 *  la topología, «Todavía no sé» y las capacidades, lo que se leía sin mirar su
 *  forma (un texto donde va una lista, un elemento que no es objeto, un número
 *  donde va el nombre). Lo demás lo revisa `validarConfig` en palabras. */
function formaDeConfig(x: unknown): string | undefined {
  const c = x as Record<string, unknown>
  const lista = (k: string, cada: (e: Record<string, unknown>, ruta: string) => string | undefined) => {
    const v = c[k]
    if (v === undefined || v === null) return undefined
    if (!Array.isArray(v)) return PETICION(`config.${k}`, 'tiene que ser una lista')
    for (let i = 0; i < v.length; i++) {
      const e = v[i], ruta = `config.${k}[${i}]`
      if (!e || typeof e !== 'object' || Array.isArray(e)) return PETICION(ruta, QUE_ES.objeto!)
      const m = cada(e as Record<string, unknown>, ruta)
      if (m) return m
    }
    return undefined
  }
  const texto = (e: Record<string, unknown>, ruta: string, k: string, opcional = false) =>
    (e[k] === undefined || e[k] === null) && opcional ? undefined : typeof e[k] === 'string' ? undefined : PETICION(`${ruta}.${k}`, QUE_ES.texto!)
  const numero = (e: Record<string, unknown>, ruta: string, k: string) => (typeof e[k] === 'number' && Number.isFinite(e[k]) ? undefined : PETICION(`${ruta}.${k}`, 'tiene que ser un número'))
  const capacidad = (e: Record<string, unknown>, ruta: string) => numero(e, ruta, 'bpd') ?? texto(e, ruta, 'fuente')
  // El alcance y el tramo, de su lista (C-27: uno inventado se decía «(«undefined» → «undefined»)»).
  const unoDe = (e: Record<string, unknown>, ruta: string, k: string, xs: readonly string[]) =>
    texto(e, ruta, k) ?? (xs.includes(e[k] as string) ? undefined : PETICION(`${ruta}.${k}`, `tiene que ser ${xs.slice(0, -1).join(', ')} o ${xs.at(-1)}`))
  return lista('topologia', (e, r) => texto(e, r, 'elemento') ?? unoDe(e, r, 'alcance', ['dedicado', 'compartido', 'frontera', 'tercero'])
    ?? unoDe(e, r, 'choke', ['pozo', 'planta', 'exportacion']) ?? texto(e, r, 'campoId', true)
    ?? (e.pozos === undefined || e.pozos === null || (Array.isArray(e.pozos) && e.pozos.every(p => typeof p === 'string')) ? undefined : PETICION(`${r}.pozos`, QUE_ES.textos!)))
    ?? lista('topologiaPorSaber', (e, r) => texto(e, r, 'elemento') ?? texto(e, r, 'campoId'))
    ?? lista('capacidades', (e, r) => texto(e, r, 'campoId') ?? texto(e, r, 'explicacionEmpate', true)
      ?? (['crudo', 'gas', 'afuera', 'mercado', 'tratamiento', 'admision'] as const).reduce<string | undefined>((m, k) => m ?? (e[k] === undefined || e[k] === null ? undefined
        : typeof e[k] === 'object' && !Array.isArray(e[k]) ? capacidad(e[k] as Record<string, unknown>, `${r}.${k}`) : PETICION(`${r}.${k}`, QUE_ES.objeto!)), undefined)
      ?? (e.bombas === undefined || e.bombas === null ? undefined : !Array.isArray(e.bombas) ? PETICION(`${r}.bombas`, 'tiene que ser una lista')
        : (e.bombas as unknown[]).reduce<string | undefined>((m, b, i) => m ?? (!b || typeof b !== 'object' || Array.isArray(b) ? PETICION(`${r}.bombas[${i}]`, QUE_ES.objeto!)
          : texto(b as Record<string, unknown>, `${r}.bombas[${i}]`, 'equipo') ?? capacidad(b as Record<string, unknown>, `${r}.bombas[${i}]`)), undefined)))
}
