import { FUENTE, pedirJson, ErrorApi, mensajeDe } from './fuente'
import { deRespuesta } from './cable'
import {
  R_FIRMA, R_USUARIO, R_AVISO, R_INFORME, R_ASIGNACION, R_RESPUESTA, R_ANALISIS, R_PLANTA, R_PLAN,
  type CuerpoFirma, type CuerpoUsuario, type CuerpoInvitacion, type CuerpoAviso, type CuerpoRespuesta, type CuerpoWhatsapp, type CuerpoAnalisis, type CuerpoAsignacion,
} from './contrato'
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
import { rolPorId } from '@/entities/roles'
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
import { MOTIVO_MINIMO, TEXTO_LIBRE_MINIMO, alcanza } from '@/entities/reglas'
import { AHORA } from '@/entities/reloj'
import { region } from '@/shared/config/region'
import { diaIso } from '@/shared/lib/formato'
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
  const grupos = diferenciasPorGrupo(ctx.config, config), puede = rolPorId(q.rolId).puede
  if (grupos.metas.length && !puede['metas:firmar']) return { ok: false, error: 'Las metas, el precio y la regla de cierre los firma el gerente de activo.' }
  if (grupos.tecnica.length && !puede['config:firmar']) return { ok: false, error: 'Tanques, respaldos, programa y membrete los firma el administrador de la implementación.' }
  // También 403: la capacidad dice qué firma; los campos asignados, dónde. Un
  // id que no es campo no se cuenta aquí: lo rechaza validarConfig (422).
  const mios = camposAsignados(rolPorId(q.rolId), usuarios).map(x => x.id)
  const ajenos = camposTocados(ctx.config, config).filter(id => CAMPOS.some(x => x.id === id) && !mios.includes(id))
  if (ajenos.length) return { ok: false, error: `No tiene asignado ${ajenos.map(id => campoPorId(id).nombre).join(', ')}: lo de ese campo lo firma quien lo tenga.` }
  const errores = validarConfig(config, ctx.config, `${diaIso(AHORA).slice(0, 8)}01`, AHORA.getTime())
  if (errores.length) return { ok: false, error: errores.join(' ') }
  if (!alcanza(c.motivo, MOTIVO_MINIMO)) return { ok: false, error: 'Falta el motivo: una meta que se mueve sin motivo no es meta.' }
  const v: Version = { version: vigente.version + 1, fecha: horaDelPlc(), por: `${yo.nombre} · ${rolPorId(q.rolId).nombre.toLowerCase()}`, motivo: c.motivo.trim(), cambios, config }
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
  if (!rolPorId(q.rolId).puede['usuarios:administrar']) return { ok: false, errores: [{ campo: 'general', texto: 'Los accesos los da el gerente de activo.' }] }
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
  anotarAcceso(limpio, { id: accesos.length + 1, fecha: horaDelPlc(), por: `${yo.nombre} · ${rolPorId(q.rolId).nombre.toLowerCase()}`,
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
  if (!rolPorId(q.rolId).puede['usuarios:administrar']) return { ok: false, errores: [{ campo: 'general', texto: 'Los accesos los da el gerente de activo.' }] }
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
  anotarAcceso(limpio, { id: accesos.length + 1, fecha: hora, por: `${yo.nombre} · ${rolPorId(q.rolId).nombre.toLowerCase()}`,
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
  if (!rolPorId(q.rolId).puede['sap:aviso']) return { ok: false, error: 'Su rol no envía avisos a SAP.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  // Como en el resto del contrato: nadie actúa sobre un campo que no tiene asignado.
  if (!camposAsignados(rolPorId(q.rolId), usuarios).some(c => c.id === a.campoId)) return { ok: false, error: 'Ese campo no lo tiene asignado: el aviso no se envía.' }
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
  const rol = rolPorId(q.rolId)
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
  const rol = rolPorId(q.rolId)
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
  const rol = rolPorId(q.rolId)
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
    por: `${u.nombre} · ${rolPorId(u.rolId).nombre.toLowerCase()}`, porId: u.id,
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
  if (!rolPorId(q.rolId).puede['causa:completar']) return { ok: false, error: 'El análisis lo completa confiabilidad o el jefe de mantenimiento.' }
  const yo = personaDelRol(usuarios, q.rolId)
  if (!yo) return { ok: false, error: SIN_PERSONA }
  // El campo sale del evento (el cuerpo no lo trae): nadie analiza una falla de un campo que no tiene.
  const malEvento = revisarEvento(c.evento, undefined, camposAsignados(rolPorId(q.rolId), usuarios).map(x => x.id))
  if (malEvento) return { ok: false, error: malEvento }
  if (!ctx.respuestas[c.evento]?.parte) return { ok: false, error: 'Solo se analiza una falla declarada con su parte.' }
  if (!mecanismoIso(c.mecanismo)) return { ok: false, error: 'Escoja el mecanismo de falla.' }
  if (!CAUSAS_RAIZ.some(x => x.codigo === c.causaRaiz)) return { ok: false, error: 'Escoja la causa raíz.' }
  const nota = c.nota?.trim()
  anotarAnalisis(c.evento, { mecanismo: c.mecanismo, causaRaiz: c.causaRaiz, ...(nota ? { nota } : {}),
    por: `${yo.nombre} · ${rolPorId(q.rolId).nombre.toLowerCase()}`, hora: horaDelPlc() })
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
  const rol = rolPorId(q.rolId)
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
  const rol = rolPorId(q.rolId)
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
