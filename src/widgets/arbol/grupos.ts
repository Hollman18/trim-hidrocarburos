import { PASOS, cadenaVista, esDePersona, type ParadaAnh, type EstadoParadaAnh, type PasoAnh } from '@/shared/api/arbol'

/** Una tarjeta de Identificar: las filas de una misma decisión. Son las de una
 *  misma raíz (una cascada de N pozos es N filas y una sola decisión: Unicidad,
 *  C24 p.5; U2 §4.4, caso 1), con la misma cadena y el mismo estado. Lo que una
 *  persona cambia en una fila la saca de su grupo sola: su cadena ya es otra
 *  (P1 §2.1, «cambiar algo de un grupo lo saca del lote»). Agrupar es solo
 *  presentación: cada fila trae su raíz (`ParadaAnh.raiz`, U2 §11.1). */
export interface Grupo {
  clave: string
  estado: EstadoParadaAnh
  /** Las filas, por día y pozo (el orden del servidor). */
  filas: ParadaAnh[]
  /** La que se muestra: todas las del grupo dicen lo mismo. */
  primera: ParadaAnh
  /** Los pozos, sin repetir, en orden. */
  pozos: string[]
  /** La raíz es otro evento (el servicio que cayó o la bomba que paró). */
  cascada: boolean
  /** La diferida del libro del grupo (solo lectura: no viaja a la ANH). */
  bbl: number
  /** La cadena que vio quien confirma: va en el 409 («cambió desde que la vio»). */
  cadena: string
}

export function agrupar(ps: readonly ParadaAnh[]): Grupo[] {
  const m = new Map<string, ParadaAnh[]>()
  for (const p of ps) {
    // Lo marcado «Algo está mal» (sin atender) es otra decisión: no se confirma de un toque con lo demás.
    const revisar = p.revision && !p.revision.atendida ? `revisar:${p.revision.hora}` : ''
    const k = [p.campoId, p.raiz, p.estado, cadenaVista(p.clasificacion), p.exceso ? 'exceso' : '', revisar].join('|')
    const g = m.get(k)
    if (g) g.push(p); else m.set(k, [p])
  }
  return [...m.entries()].map(([clave, filas]): Grupo => {
    const primera = filas[0]!
    return {
      clave, estado: primera.estado, filas, primera,
      pozos: [...new Set(filas.map(f => f.pozo))],
      cascada: filas.some(f => f.raiz !== f.eventoId),
      bbl: filas.reduce((a, f) => a + f.diferidaTrimBbl, 0),
      cadena: cadenaVista(primera.clasificacion),
    }
  }).sort((a, b) => b.bbl - a.bbl || a.primera.inicio.localeCompare(b.primera.inicio))
}

/** Los pasos que ya dijo o confirmó una persona. */
export const deMano = (p: ParadaAnh): PasoAnh[] => PASOS.filter(x => { const d = p.clasificacion[x]; return !!d && esDePersona(d.procedencia) })

