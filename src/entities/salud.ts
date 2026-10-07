/** La salud de cada parte de un equipo: el vigía, agrupado por lo que falla.
 *
 *  Un solo evaluador para la bomba de reinyección y para cada
 *  electrosumergible. Una parte avisa cuando una variable que la ANUNCIA o
 *  que la DAÑA va hacia su límite con tendencia real (pendiente mayor a dos
 *  errores estándar). Las variables que solo CONFIRMAN no dan fecha: cambian
 *  cuando la falla ya empezó.
 *
 *  La parte que causó una parada abierta NO se lee de un campo escrito a
 *  mano: la resuelve `causa-senal.ts` desde la primera alarma o la firma, y
 *  llega aquí como `parteFallo`.
 *
 *  Contrato: no tiene ruta propia. La de una bomba llega en `partes` de
 *  `GET /api/vistas/bombas` y en `sospechosa` de
 *  `GET /api/vistas/paradas/:evento/opciones`; la de una electrosumergible, en
 *  las filas de `GET /api/vistas/pozos` (`salud`) y en el detalle
 *  `GET /api/vistas/pozos/:campo/:pozo` (`partes`). Formas en
 *  shared/api/contrato.ts.
 */
import { senalesDe, proyectable, type Senal } from './vigia'
import { partesDe, type Parte, type PapelVariable, type ParteId } from './partes'
import { plantillaDe, paradasDe, type PerfilBomba, type Plantilla, type VariableId } from './bombas'
import { equipoEnCampo } from './equipos'
import type { EstadoDispositivo, Severidad } from './tipos'

export type EstadoParte =
  /** La parada abierta se le atribuye a esta parte. */
  | 'fallo'
  /** Una variable suya ya cruzó su límite o el instrumento reporta alarma. */
  | 'fuera'
  /** Una variable que la anuncia o la daña va hacia su límite. */
  | 'avisa'
  /** Instrumentada y sin tendencia hacia el límite. */
  | 'estable'
  /** El equipo está parado: no hay tendencia que leer. */
  | 'detenida'
  /** Nada de lo que la anuncia está instrumentado o con señal. */
  | 'sin-dato'

export const ESTADO_PARTE: Record<EstadoParte, string> = {
  fallo: 'falló',
  fuera: 'fuera de banda',
  avisa: 'avisa',
  estable: 'estable',
  detenida: 'equipo detenido',
  'sin-dato': 'sin dato',
}

const RANGO: Record<EstadoParte, number> = { fallo: 0, fuera: 1, avisa: 2, detenida: 3, estable: 4, 'sin-dato': 5 }

/** Más allá de esto una recta no se sostiene: se dice «tendencia lenta» en
 *  vez de avisar con una fecha que nadie puede defender. */
export const HORIZONTE_H = 90 * 24

export interface SenalDeParte { senal: Senal; papel: PapelVariable }
export type SenalQueCruza = SenalDeParte & {
  senal: Senal & { pronostico: { tipo: 'cruza'; horas: number; rango: [number, number] } }
}

/** Una variable discreta (un interruptor de fuga): no da tendencia, solo estado. */
export interface Discreta { plantilla: Plantilla; tag: string; estado: EstadoDispositivo; papel: PapelVariable }

export interface SaludParte {
  parte: Parte
  estado: EstadoParte
  /** Prioridad ISA-18.2 para la marca: solo lo anormal lleva color. */
  prioridad: Severidad
  /** De las que avisan o dañan, la que antes cruza su límite. */
  primera?: SenalQueCruza
  /** Cuántas de sus señales van hacia el límite a la vez. */
  coinciden: number
  /** Va hacia el límite, pero en más de tres meses. */
  lenta?: SenalQueCruza
  /** Lo que daña a la parte ya está fuera de banda: riesgo activo. */
  causaActiva: SenalDeParte[]
  fuera: SenalDeParte[]
  medidas: SenalDeParte[]
  discretas: Discreta[]
  sinSenal: SenalDeParte[]
  /** Variables de la parte que no están instrumentadas. */
  faltan: Plantilla[]
}

const SEV: Record<EstadoDispositivo, Severidad | null> = { normal: 0, aviso: 3, atencion: 2, alarma: 1, 'sin señal': null }
const enAlarma = (e: EstadoDispositivo) => { const s = SEV[e]; return s === 1 || s === 2 }

export interface EntradaSalud {
  partes: Parte[]
  plantilla: Plantilla[]
  senales: Senal[]
  /** ¿La variable tiene instrumento en este equipo? */
  instrumentada: (id: VariableId) => boolean
  /** Lecturas discretas por variable (interruptores), si las hay. */
  discreta?: (id: VariableId) => { tag: string; estado: EstadoDispositivo } | undefined
  detenido: boolean
  /** La parte a la que las señales le atribuyen la parada abierta. */
  parteFallo?: ParteId
}

/** El evaluador: las partes con su estado, de la que más preocupa a la que menos. */
export function evaluarPartes(e: EntradaSalud): SaludParte[] {
  const out = e.partes.map((parte): SaludParte => {
    const medidas: SenalDeParte[] = [], sinSenal: SenalDeParte[] = [], discretas: Discreta[] = [], faltan: Plantilla[] = []
    for (const v of parte.variables) {
      const pl = e.plantilla.find(x => x.id === v.id)
      if (!pl) continue
      if (!e.instrumentada(v.id)) { faltan.push(pl); continue }
      const s = e.senales.find(x => x.plantilla.id === v.id)
      if (s) (s.valor === null ? sinSenal : medidas).push({ senal: s, papel: v.papel })
      else {
        const d = e.discreta?.(v.id)
        if (d) discretas.push({ plantilla: pl, tag: d.tag, estado: d.estado, papel: v.papel })
      }
    }
    // Con el equipo parado, lo que solo confirma (caudal, corriente, descarga)
    // lee la parada misma: no es pista de nada y no cuenta.
    const consideradas = e.detenido ? medidas.filter(m => m.papel !== 'confirma') : medidas
    const anormal = (m: SenalDeParte) => m.senal.pronostico.tipo === 'cruzado' || enAlarma(m.senal.estado)
    const fuera = consideradas.filter(m => m.papel !== 'causa' && anormal(m))
    const causaActiva = consideradas.filter(m => m.papel === 'causa' && anormal(m))
    const discretaFuera = discretas.some(d => d.papel !== 'causa' && !(e.detenido && d.papel === 'confirma') && enAlarma(d.estado))
    // Solo se proyecta lo que se degrada (la misma regla del veredicto): lo
    // súbito no da aviso aunque la recta diga una fecha.
    const tendencias = medidas.filter(m => m.papel !== 'confirma' && proyectable(m.senal))
      .filter((m): m is SenalQueCruza => m.senal.pronostico.tipo === 'cruza')
      .sort((a, b) => a.senal.pronostico.horas - b.senal.pronostico.horas)
    const cruzan = tendencias.filter(m => m.senal.pronostico.horas <= HORIZONTE_H)
    const lenta = cruzan.length ? undefined : tendencias[0]

    let estado: EstadoParte
    if (e.parteFallo === parte.id) estado = 'fallo'
    else if (fuera.length || discretaFuera) estado = 'fuera'
    else if (e.detenido) estado = 'detenida'
    else if (cruzan.length || causaActiva.length) estado = 'avisa'
    else if (!medidas.length && !discretas.length) estado = 'sin-dato'
    else estado = 'estable'

    const sevFuera = Math.min(...fuera.map(m => SEV[m.senal.estado] || 2), discretaFuera ? 2 : 3) as Severidad
    const prioridad: Severidad = estado === 'fallo' ? 1 : estado === 'fuera' ? sevFuera
      // Prioridad por consecuencia y tiempo para responder (ISA-18.2): lo que
      // llega a su límite en menos de un día pide atención ya.
      : estado === 'avisa' ? (causaActiva.length || (cruzan[0] && cruzan[0].senal.pronostico.horas < 24) ? 2 : 3) : 0

    return {
      parte, estado, prioridad, primera: cruzan[0], coinciden: cruzan.length, lenta, causaActiva,
      fuera, medidas, discretas, sinSenal, faltan,
    }
  })

  return out.sort((a, b) => RANGO[a.estado] - RANGO[b.estado]
    || (a.primera?.senal.pronostico.horas ?? Infinity) - (b.primera?.senal.pronostico.horas ?? Infinity))
}

/** Lo que se dice de una parte que está fuera o avisa. La banda normal y la
 *  alarma son dos límites distintos y se nombran por separado: una lectura
 *  que salió de su banda todavía no llegó a su alarma, y si va hacia ella se
 *  dice cuándo llega. */
export function motivoDeParte(sp: SaludParte): string {
  if (sp.estado === 'fuera') {
    const s = sp.fuera[0]?.senal
    if (!s) return `${sp.parte.nombre}: un instrumento suyo reporta alarma`
    const nombre = s.plantilla.nombre.toLowerCase()
    if (s.estado === 'alarma' || s.pronostico.tipo === 'cruzado') return `${sp.parte.nombre}: ${nombre} ya llegó a su alarma`
    const llega = sp.primera ? `; llega a su alarma en ${Math.round(sp.primera.senal.pronostico.horas)} h` : ''
    return `${sp.parte.nombre}: ${nombre} salió de su banda normal${llega}`
  }
  return `${sp.parte.nombre}: ${sp.primera?.senal.plantilla.nombre.toLowerCase() ?? 'avisa'}`
}

/** Las partes de una bomba de la línea (reinyección o multifásica). */
export function saludDePartes(p: PerfilBomba, senales: Senal[] = senalesDe(p), parteFallo?: ParteId): SaludParte[] {
  const eq = equipoEnCampo(p.equipo, p.campoId)
  const abierta = paradasDe(p.equipo, p.campoId).some(e => !e.fin)
  return evaluarPartes({
    partes: partesDe(p.subtipo), plantilla: plantillaDe(p.subtipo), senales,
    instrumentada: id => !!p.tags[id],
    discreta: id => {
      const tag = p.tags[id]
      const d = tag ? eq?.dispositivos.find(x => x.tag === tag) : undefined
      return d ? { tag: d.tag, estado: d.estado } : undefined
    },
    detenido: abierta || eq?.marcha === 'detenido',
    parteFallo,
  })
}
