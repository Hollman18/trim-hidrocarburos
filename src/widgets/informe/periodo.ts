import { AHORA } from '@/entities/reloj'
import { formatoFecha } from '@/shared/lib/fecha'

const FMT_DIA = formatoFecha({ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })
const dia = (d: Date) => FMT_DIA.format(d)

/** El período como va en el membrete: su nombre y sus días («Octubre, en
 *  curso · 1 de oct de 2026 a 2 de oct de 2026»). El último día es el de
 *  antes del límite, que nunca pasa de la hora del PLC. Si es parcial y el
 *  nombre no lo dice («Año a la fecha», un rango), dice que está en curso.
 *  Lo usan el informe con folio (Exportar: el folio y el CSV) y la impresión
 *  sin folio (Ctrl+P), que también dice de qué período es. */
export function periodoDelInforme(rango: { desde: Date; hasta: Date; nombre: string }, parcial = false) {
  const hastaDia = new Date(Math.min(rango.hasta.getTime(), AHORA.getTime()) - 1)
  const nombre = parcial && !/en curso/i.test(rango.nombre) ? `${rango.nombre}, en curso` : rango.nombre
  return `${nombre} · ${dia(rango.desde)} a ${dia(hastaDia)}`
}
