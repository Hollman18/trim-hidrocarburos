import { CATALOGO, CATEGORIA_DE } from '@/entities/causas'
import type { MesResumen } from '@/shared/api/diferidos'
import type { Celda } from '@/shared/lib/csv'

/** El CSV para la ANH de Regulatorio (I-reg-2: antes, el botón «Exportar CSV» de su
 *  tarjeta; ahora, una opción de «Exportar» en la cabecera): el libro mes a mes del
 *  campo, con el factor de asignación contra su banda y el diferido en las casillas
 *  de PRODML. Las cifras van sin redondear: son las del libro. */
export function filasCsvAnh(nombreCampo: string, serie: readonly MesResumen[]): Celda[][] {
  return [
    ['campo', 'mes', 'publicado', 'real bbl', 'potencial bbl', 'diferido bbl', 'factor de asignación', 'banda ±', 'en banda',
      ...CATALOGO.map(c => `${c.nombre} (${c.prodml}) bbl`), 'sin clasificar bbl', 'tolerancia bbl', 'aproximado bbl'],
    ...serie.map(m => {
      const f = m.libro.fa[0]
      return [nombreCampo, m.mes, m.parcial ? 'no' : 'sí', m.libro.real, m.libro.potencial, m.libro.diferido, f?.fa, f?.banda, f?.dentro ? 'sí' : 'no',
        ...CATALOGO.map(c => m.libro.porTipo.filter(t => CATEGORIA_DE[t.tipo] === c.id).reduce((a, t) => a + t.bbl, 0)),
        m.libro.porTipo.filter(t => !CATEGORIA_DE[t.tipo]).reduce((a, t) => a + t.bbl, 0), m.libro.tolerancia, m.libro.aproximado]
    }),
  ]
}
