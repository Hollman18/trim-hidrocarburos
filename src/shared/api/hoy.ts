import { useCtx, useSesion, type Sesion } from './sesion'
import { useDato, versionDe } from './consulta'
import { HOY, type ConsultaHoy } from './contrato'
import { pedirPreguntas, pedirOpcionesRespuesta, pedirRiesgo, pedirLibro } from './diferidos'
import { pedirParadasAnh } from './arbol'
import { pedirMensajes } from './mensajes'
import { pedirOrdenesSap, pedirAvisosSap, pedirRelojes } from './sap'
import { pedirCiclo } from './ciclo'
import { pedirTuberia, pedirTuberiaAgua, pedirCriticidad } from './choke'
import { pedirPredicciones } from './predicciones'
import { pedirMesesCerrados, pedirInicioDeHistoria } from './calendario'
import { hoy, type VistaHoy, type EntradaHoy } from '@/entities/hoy'
import { franja } from '@/entities/condiciones'
import { rolExacto } from '@/entities/roles'
import { camposAsignados, personaDelRol } from '@/entities/usuarios'
import { rangoDePeriodo } from '@/entities/diferido'
import { metaEn } from '@/entities/configuracion'
import { nombreMes } from '@/entities/plan'
import { AHORA } from '@/entities/reloj'

/** C3 · Hoy en la costura: `GET /api/vistas/hoy?rol=&campos=` (CONTRATO.md · «Hoy»).
 *
 *  El servidor junta lo que ya calcula para las demás vistas (el libro, el árbol
 *  de la ANH, el riesgo, la tubería y el agua, «si falla hoy», SAP, WhatsApp, el
 *  ciclo y lo que entra a mano) y el motor (`hoy`, entities/hoy.ts) lo cruza en
 *  las tareas del rol, con su orden, su cifra y su frase. Ninguna cifra nueva:
 *  todas son de esos endpoints. La pantalla lee `useHoy`; nadie en pages/widgets
 *  llama `pedirHoy`.
 *
 *  `rol` es el de la persona: el servidor lo toma del token (un `rol` que no es
 *  el suyo es 403). `campos` se recorta a los que la persona tiene asignados. */

export type { VistaHoy, TareaHoy, PreguntaHoy, OpcionHoy, ModoHoy, BloqueoHoy, HechaHoy, InicioHoy, Frase, Trozo, Destino, AccionHoy, CampoAhoraHoy, WhatsappHoy } from '@/entities/hoy'
export { DESHACER_MS, MOTIVO_DESHACER, TURNO_H } from '@/entities/hoy'

/** Lo que el servidor tiene de la sesión (lo que entra a mano). Lo que falta vale vacío. */
export type SesionHoy = Pick<Sesion, 'ctx' | 'versiones' | 'usuarios'> & Partial<Pick<Sesion,
  'clasificacionesAnh' | 'planes' | 'avisosEnviados' | 'asignacionOficial' | 'analisis'>>

/** `GET /api/vistas/hoy?rol=&campos=` · la respuesta del demo: la misma fórmula que el backend. */
export function pedirHoy(q: ConsultaHoy, s: SesionHoy): VistaHoy {
  const rol = rolExacto(q.rol)
  if (!rol) throw new Error(`«${q.rol}» no es un rol del producto: no tiene Hoy.`)
  const { ctx, versiones, usuarios } = s
  const guardadas = s.clasificacionesAnh ?? {}
  const asignados = new Set(camposAsignados(rol, usuarios).map(c => c.id))
  const campos = [...new Set(q.campos)].filter(c => asignados.has(c))
  const yo = personaDelRol(usuarios, rol.id)
  const curso = rangoDePeriodo('curso')
  const preguntas = pedirPreguntas(campos, ctx)
  const cerrados = pedirMesesCerrados()
  const ultimoCerrado = cerrados.at(-1)
  const ciclo = pedirCiclo(campos, curso.desde, curso.hasta, ctx, versiones, s.planes ?? {})
  const jefe = rol.id === 'jefe'
  const relojes = jefe ? pedirRelojes(campos, pedirInicioDeHistoria(), AHORA, ctx) : undefined
  const predicciones = jefe ? pedirPredicciones(campos, ctx, versiones) : undefined
  const aciertos = predicciones?.registro.filter(p => p.calificacion === 'acierto') ?? []
  const vigiladas = predicciones?.fallas.filter(f => f.visibilidad === 'vigilada') ?? []
  const entrada: EntradaHoy = {
    rol: { id: rol.id, puede: rol.puede },
    ...(yo ? { persona: { id: yo.id, nombre: yo.nombre } } : {}),
    campos, ahora: AHORA.getTime(),
    preguntas,
    opciones: Object.fromEntries(preguntas.filter(p => p.pide).map(p => {
      const o = pedirOpcionesRespuesta(p, ctx)
      return [p.id, { ...(o.catalogo ? { catalogo: o.catalogo } : {}), ...(o.sugeridas ? { sugeridas: o.sugeridas } : {}) }]
    })),
    paradas: pedirParadasAnh({ campos, desde: curso.desde, hasta: AHORA }, ctx, guardadas),
    riesgo: pedirRiesgo(campos, ctx),
    condiciones: Object.fromEntries(franja(campos, ctx).equipos.map(x => [`${x.campoId}|${x.equipo}`, x.condicion])),
    // El registro de WhatsApp: el hilo del turno (supervisión y operación) y cuándo se escaló una pregunta (quien revisa).
    mensajes: ['sup', 'oper', 'jefe', 'conf'].includes(rol.id) ? pedirMensajes(campos) : [],
    ordenes: pedirOrdenesSap(campos, ctx),
    avisosSap: pedirAvisosSap(campos, ctx, s.avisosEnviados ?? []),
    planes: [...ciclo.antes.planes, ...ciclo.durante.planes, ...ciclo.despues.planes],
    tuberias: Object.fromEntries(campos.map(c => [c, pedirTuberia(c, curso.desde, curso.hasta, ctx, versiones, guardadas)])),
    aguas: Object.fromEntries(campos.map(c => [c, pedirTuberiaAgua(c, ctx, versiones)])),
    criticidad: pedirCriticidad(campos, ctx).campos,
    ...(relojes?.totalH !== undefined ? { relojes: { totalH: relojes.totalH, ...(relojes.esperaH !== undefined ? { esperaH: relojes.esperaH } : {}) } } : {}),
    ...(predicciones ? { vigia: { anunciadas: vigiladas.filter(f => aciertos.some(p => p.falla?.id === f.falla.id)).length, vigiladas: vigiladas.length } } : {}),
    asignacionSinCargar: ultimoCerrado ? campos.filter(c => !(s.asignacionOficial ?? []).some(f => f.mes === ultimoCerrado && f.campoId === c))
      .map(c => ({ campoId: c, mes: ultimoCerrado, nombreMes: nombreMes(ultimoCerrado).split(' de ')[0]! })) : [],
    sinMeta: campos.filter(c => !metaEn(ctx.config, c, AHORA.getTime())),
    sinAnalisis: preguntas.filter(p => !p.pide && p.causa.declarado && p.causa.parte && !Object.hasOwn(s.analisis ?? {}, p.id)),
    programa: ctx.config.programa.filter(p => campos.includes(p.campoId)).map(p => ({ id: p.id, campoId: p.campoId, equipo: p.equipo, desde: p.desde, hasta: p.hasta, motivo: p.motivo })),
    nombres: Object.fromEntries(usuarios.map(u => [u.id, u.nombre])),
    diferidoTurnoBbl: pedirLibro({ campos, desde: new Date(AHORA.getTime() - 12 * 3_600_000), hasta: AHORA }, ctx).diferido,
  }
  return hoy(entrada)
}

/** Hoy del rol que se está viendo, en los campos de la vista. */
export function useHoy(rol: string, campos: string[]): VistaHoy {
  const ctx = useCtx()
  const versiones = useSesion(x => x.versiones), usuarios = useSesion(x => x.usuarios)
  const clasificacionesAnh = useSesion(x => x.clasificacionesAnh), planes = useSesion(x => x.planes)
  const avisosEnviados = useSesion(x => x.avisosEnviados), asignacionOficial = useSesion(x => x.asignacionOficial), analisis = useSesion(x => x.analisis)
  const version = [ctx, versiones, usuarios, clasificacionesAnh, planes, avisosEnviados, asignacionOficial, analisis].map(versionDe).join('.')
  return useDato(HOY, { rol, campos }, version, () => pedirHoy({ rol, campos }, { ctx, versiones, usuarios, clasificacionesAnh, planes, avisosEnviados, asignacionOficial, analisis }))
}

/** La insignia de Hoy para el panel y el ☰ (X5 §4.1-4.2): las tarjetas que piden una acción. */
export const useInsigniaDeHoy = (rol: string, campos: string[]): number => useHoy(rol, campos).insignia
