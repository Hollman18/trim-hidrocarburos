/** El equipo como se ve hoy en un campo, venga de donde venga: del catálogo
 *  de equipos de superficie (bombas, servicios, medición) o de un pozo, que
 *  no está en el catálogo porque su estado lo da su propio controlador.
 *
 *  Así el panel del equipo, el esquema de planta y los Pareto entienden un
 *  pozo igual que una bomba, sin casos especiales en cada pantalla.
 */
import { equipoEnCampo, conRespaldoFirmado, type EquipoEnCampo } from './equipos'
import { pozoDe, estadoAhora, CODIGO, LEVANTAMIENTO_NOMBRE } from './pozos'
import { senalesEsp, saludDeEsp } from './esp'
import { causaDeEvento, ALTO_IMPACTO, type Contexto } from './causa-senal'
import { fiscalUltimosDias, fiscalDeAyer } from './libro'
import { serieHasta } from './serie'
import type { Dispositivo, Severidad } from './tipos'

export type ClaseEquipo = 'catalogo' | 'pozo'
export type EquipoVivo = EquipoEnCampo & { clase: ClaseEquipo }

const fmt = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 })

/** El equipo como se ve hoy, con el contexto de la sesión: la causa de un
 *  pozo parado toma las respuestas que ya se dieron y el programa firmado, y
 *  el respaldo de una bomba es el que firmó el administrador. Igual que el
 *  libro: el panel no puede decir otra cosa que la tabla de al lado. */
export function equipoVivo(id: string, campoId: string, ctx: Contexto): EquipoVivo | undefined {
  const eq0 = equipoEnCampo(id, campoId)
  if (eq0) {
    const eq = conRespaldoFirmado(eq0, campoId, ctx.config)
    // El computador de flujo del punto de medición oficial dice lo mismo que
    // el libro: la serie es la del fiscal de cada día. Un día sin dato del
    // computador no se pinta como cero ni se salta: queda como hueco (null) en
    // su día, así la curva se corta ahí y el eje no se comprime. Cuál es ese
    // equipo y cuál su tag lo dice el registro (`fiscal`), no un id fijo.
    // Sin dato del último día, el valor es `null` (CONTRATO.md: un instrumento
    // sin lectura viaja con `valor: null`), nunca un texto como «—».
    if (eq.fiscal && eq.instrumentado) {
      const fiscal = fiscalUltimosDias(campoId, 12)
      const ultimo = fiscal.at(-1)
      // Un valor por día, el último es el del último día completo.
      const serie = serieHasta(fiscal, 24, fiscalDeAyer(campoId).fecha.getTime())
      return { ...eq, clase: 'catalogo', dispositivos: eq.dispositivos.map(d => d.tag === eq.fiscal
        ? { ...d, unidad: 'bbl/d', serie, origen: 'computador de flujo · fiscal del día',
          ...(ultimo === null || ultimo === undefined ? { valor: null, estado: 'sin señal' as const } : { valor: ultimo }) } : d) }
    }
    return { ...eq, clase: 'catalogo' }
  }
  const p = pozoDe(campoId, id)
  if (!p) return undefined

  const e = estadoAhora(p)
  const causa = e.evento ? causaDeEvento(e.evento, ctx) : undefined
  const salud = p.levantamiento === 'electrosumergible' ? saludDeEsp(p, ctx) : []
  const peor = salud.find(s => s.estado === 'fuera' || s.estado === 'avisa')
  // Solo la causa lleva prioridad: cerrado por otro equipo es consecuencia.
  const porOtro = !!causa && causa.equipo !== p.id
  const severidad: Severidad = !e.produce ? (porOtro ? 0 : causa && ALTO_IMPACTO.includes(causa.tipo) ? 1 : 2)
    : e.hz && !porOtro ? 3 : peor ? (peor.prioridad || 3) : 0

  const controlador: Dispositivo = {
    tag: p.controlador, tipo: 'Estado del controlador', unidad: '',
    valor: !e.produce ? `parado · ${e.evento!.codigo}` : e.hz ? `a ${fmt(e.hz)} Hz` : 'en marcha',
    estado: !e.produce ? 'alarma' : e.hz ? 'aviso' : 'normal',
    origen: `${p.levantamiento === 'electrosumergible' ? 'variador' : p.levantamiento === 'bombeo-mecanico' ? 'controlador de bombeo' : 'válvula de cabeza'} · evento`,
    limite: '—',
  }
  // Una señal sin lectura viaja con `valor: null` (CONTRATO.md), nunca como
  // cero ni como un texto: la pantalla la dice «sin señal» (`sinLectura`).
  const senales: Dispositivo[] = senalesEsp(p).map(s => ({
    tag: s.tag, tipo: s.plantilla.nombre, valor: s.valor, unidad: s.valor === null ? '' : s.unidad,
    estado: s.estado, origen: s.origen, serie: s.serie,
    limite: s.alarma?.alta !== undefined ? `< ${fmt(s.alarma.alta)}` : s.alarma?.baja !== undefined ? `> ${fmt(s.alarma.baja)}`
      : s.normal ? `${fmt(s.normal[0])} – ${fmt(s.normal[1])}` : '—',
  }))

  return {
    id: p.id, nombre: `Pozo ${p.id} · ${LEVANTAMIENTO_NOMBRE[p.levantamiento].toLowerCase()}`,
    sistema: 'Pozos productores', severidad,
    marcha: !e.produce ? (porOtro ? 'cerrado-por-otro' : 'detenido') : 'en-marcha',
    estado: !e.produce ? (porOtro ? `cerrado por ${causa!.equipo}` : `detenido · ${CODIGO[e.evento!.codigo]}`) : e.hz ? `produciendo a ${fmt(e.hz)} Hz` : 'produciendo',
    criticidad: 3, aguasAbajo: '1 pozo', redundancia: 'sin respaldo',
    modoFalla: peor ? peor.parte.nombre : p.levantamiento === 'electrosumergible' ? 'Aislamiento, bomba de fondo, admisión' : '—',
    norma: p.levantamiento === 'electrosumergible'
      ? 'Electrosumergible: corriente y desbalance del variador, presión de entrada y temperatura del sensor de fondo. Los límites son los ajustes de protección del variador.'
      : p.levantamiento === 'bombeo-mecanico' ? 'Bombeo mecánico: el controlador de bombeo reporta carga y paradas.' : 'Flujo natural: la válvula de cabeza reporta apertura y cierre.',
    lectura: causa ? `${causa.texto}. Se le carga a ${causa.equipo}.` : peor ? `${peor.parte.nombre}: avisa.` : 'Produciendo dentro de banda.',
    dispositivos: [controlador, ...senales],
    instrumentado: true, clase: 'pozo',
  }
}
