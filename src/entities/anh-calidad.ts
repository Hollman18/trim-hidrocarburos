/** La calidad de la clasificación ANH de un período: cuánto miró una persona y
 *  cuánto se equivocan las reglas de TRIM, paso por paso (P1 §2.1, el tablero
 *  de «correcciones por regla»; U2 §4.6, «Calidad de dónde se trabó»).
 *
 *  No clasifica nada: lee las filas (`ParadaAnh`, con lo que ya dijeron las
 *  personas encima) y cuenta. Con esto confiabilidad ajusta `REGLAS_ANH`, la
 *  topología o la tabla de conversión, y el administrador ve los equipos cuyas
 *  paradas cayeron a la regla por tipo de causa porque no tienen topología.
 *  - avalada: un rol que puede avalar ese paso lo dijo o lo confirmó
 *    (`avalado`, anh-clasificacion.ts); es lo que pide «confirmada» (P1 §1.5);
 *  - corregida: una persona cambió lo que TRIM proponía (procedencia
 *    `corregido`, con `propuesto` al lado);
 *  - declarada: una persona lo dijo donde TRIM no proponía nada;
 *  - en falta: todavía sin valor.
 *  % confirmado = avaladas ÷ filas; % corregido = corregidas ÷ propuestas (las
 *  filas donde TRIM propuso algo): cuánto se equivoca la regla. */
import { PASOS, type PasoAnh, type ChokeAnh } from './anh-catalogo'
import { avalado } from './anh-clasificacion'
import { chokeDeCausa, REGLA_CHOKE } from './choke'
import type { ParadaAnh } from './anh-paradas'
import type { Contexto } from './causa-senal'

/** Un paso de la clasificación en el período. */
export interface CalidadPaso {
  paso: PasoAnh
  /** Filas del período (pozo × día operacional). */
  paradas: number
  /** Filas donde TRIM propuso el paso (una regla, el programa o la topología). */
  propuestas: number
  /** Avaladas por una persona de un rol que puede avalar el paso. */
  avaladas: number
  /** Una persona cambió lo que TRIM propuso. */
  corregidas: number
  /** Lo dijo una persona donde TRIM no proponía nada. */
  declaradas: number
  /** Sin valor todavía: espera a una persona. */
  enFalta: number
  /** avaladas ÷ paradas, %. Null sin filas. */
  pctConfirmado: number | null
  /** corregidas ÷ propuestas, %. Null sin propuestas. */
  pctCorregido: number | null
}

/** Lo que una regla propuso en un paso y cuánto se le corrigió. */
export interface CalidadRegla {
  paso: PasoAnh
  /** La regla que propuso: la fila de `REGLAS_ANH` (`REGLAS_ANH@2#esp-falla`)
   *  o, en el paso 2, la del motor del choke (`choke.topologia@3`). */
  regla: string
  propuestas: number
  corregidas: number
  pctCorregido: number
  /** A qué lo cambiaron las personas: valor (código interno) → filas. */
  cambiadoA: Record<string, number>
}

/** El paso 2 de un equipo: cuántas de sus paradas propuso TRIM y cuántas se corrigieron. */
export interface CalidadEquipoChoke {
  campoId: string
  /** El elemento donde se originó la parada (la raíz de la cascada). */
  equipo: string
  paradas: number
  corregidas: number
  pctCorregido: number
  cambiadoA: Partial<Record<ChokeAnh, number>>
}

export interface CalidadClasificacion {
  paradas: number
  porPaso: CalidadPaso[]
  /** Las reglas que propusieron algo, de la que más corrigen a la que menos. */
  porRegla: CalidadRegla[]
  /** El paso 2 por equipo, del que más se corrige al que menos (U2 §4.6). */
  chokePorEquipo: CalidadEquipoChoke[]
  /** Equipos sin topología: su parada tomó el tramo de la regla por tipo de
   *  causa (`ChokeDeParada.fuente === 'regla'`). Se le mandan al administrador. */
  sinTopologia: Array<{ campoId: string; equipo: string; paradas: number }>
}

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null)

/** La regla que propuso un paso de una fila. Lo que dijo una persona encima
 *  borra la regla del dato, así que se toma de la propuesta de la fila, que no
 *  cambia: la fila de `REGLAS_ANH` (o la del exceso del programa) y, en el paso
 *  2, la del motor del choke. */
const reglaQuePropuso = (p: ParadaAnh, paso: PasoAnh): string =>
  paso === 'choke' ? p.propuesta.porqueChoke?.regla ?? REGLA_CHOKE : p.propuesta.regla

/** La calidad de la clasificación de unas filas (P1 §2.1; U2 §4.6). `ctx` es el
 *  de la configuración firmada vigente: con él se sabe qué equipos no tienen topología. */
export function calidadClasificacion(ps: readonly ParadaAnh[], ctx: Contexto): CalidadClasificacion {
  const porPaso: CalidadPaso[] = PASOS.map(paso => {
    let propuestas = 0, avaladas = 0, corregidas = 0, declaradas = 0, enFalta = 0
    for (const p of ps) {
      const d = p.clasificacion[paso]
      if (!d) { enFalta++; continue }
      if (d.procedencia === 'declarado') declaradas++
      else propuestas++
      if (d.procedencia === 'corregido') corregidas++
      if (avalado(p.clasificacion, paso)) avaladas++
    }
    return { paso, paradas: ps.length, propuestas, avaladas, corregidas, declaradas, enFalta,
      pctConfirmado: pct(avaladas, ps.length), pctCorregido: pct(corregidas, propuestas) }
  })

  const reglas = new Map<string, CalidadRegla>()
  const equipos = new Map<string, CalidadEquipoChoke>()
  const sinTopo = new Map<string, { campoId: string; equipo: string; paradas: number }>()
  for (const p of ps) {
    for (const paso of PASOS) {
      const d = p.clasificacion[paso]
      if (!d || d.procedencia === 'declarado') continue
      const regla = reglaQuePropuso(p, paso), k = `${paso}|${regla}`
      const r = reglas.get(k) ?? { paso, regla, propuestas: 0, corregidas: 0, pctCorregido: 0, cambiadoA: {} }
      r.propuestas++
      if (d.procedencia === 'corregido') { r.corregidas++; r.cambiadoA[String(d.valor)] = (r.cambiadoA[String(d.valor)] ?? 0) + 1 }
      reglas.set(k, r)
    }
    const ch = p.clasificacion.choke
    if (ch && ch.procedencia !== 'declarado') {
      const equipo = ch.porque?.elemento ?? p.causa.equipo, k = `${p.campoId}|${equipo}`
      const e = equipos.get(k) ?? { campoId: p.campoId, equipo, paradas: 0, corregidas: 0, pctCorregido: 0, cambiadoA: {} }
      e.paradas++
      if (ch.procedencia === 'corregido') { e.corregidas++; e.cambiadoA[ch.valor] = (e.cambiadoA[ch.valor] ?? 0) + 1 }
      equipos.set(k, e)
    }
    // Sin topología: el motor del choke no encontró el elemento y usó la regla por tipo de causa.
    if (p.causa.tipo !== 'pendiente') {
      const x = chokeDeCausa(p.causa, p.campoId, ctx)
      if (x?.fuente === 'regla') {
        const equipo = x.elemento ?? p.causa.equipo, k = `${p.campoId}|${equipo}`
        const s = sinTopo.get(k) ?? { campoId: p.campoId, equipo, paradas: 0 }
        s.paradas++
        sinTopo.set(k, s)
      }
    }
  }
  const porRegla = [...reglas.values()].map(r => ({ ...r, pctCorregido: (r.corregidas / r.propuestas) * 100 }))
    .sort((a, b) => b.corregidas - a.corregidas || b.pctCorregido - a.pctCorregido || a.paso.localeCompare(b.paso) || a.regla.localeCompare(b.regla))
  const chokePorEquipo = [...equipos.values()].map(e => ({ ...e, pctCorregido: (e.corregidas / e.paradas) * 100 }))
    .sort((a, b) => b.corregidas - a.corregidas || b.paradas - a.paradas || a.campoId.localeCompare(b.campoId) || a.equipo.localeCompare(b.equipo))
  const sinTopologia = [...sinTopo.values()].sort((a, b) => b.paradas - a.paradas || a.campoId.localeCompare(b.campoId) || a.equipo.localeCompare(b.equipo))
  return { paradas: ps.length, porPaso, porRegla, chokePorEquipo, sinTopologia }
}
