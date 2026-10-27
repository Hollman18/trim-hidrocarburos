import { formatoFecha } from '@/shared/lib/fecha'

/* Las horas de la trazabilidad, en hora de Colombia: «2 oct, 03:52». */
const DIA = formatoFecha({ day: 'numeric', month: 'short', timeZone: 'America/Bogota' })
const HORA = formatoFecha({ hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })

/** «2 oct, 03:52» de una hora ISO con su zona; el texto tal cual si no se puede leer. */
export const cuandoCorto = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : `${DIA.format(d).replace('.', '')}, ${HORA.format(d)}`
}
