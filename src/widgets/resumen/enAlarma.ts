import type { Riesgo } from '@/entities/diferido'
import { esServicio } from '@/shared/api/equipos'
import { plural } from '@/shared/lib/formato'

/** Lo que está en riesgo sin ser de alto impacto (`altoImpacto` de la fila),
 *  dicho por lo que es: «1 servicio y 1 bomba multifásica en alarma». Lo que no
 *  es servicio ni de alto impacto es una bomba de la línea que no cierra pozos
 *  si para (hoy, solo la multifásica). */
export function otrosEnAlarma(riesgo: Riesgo[]): { texto: string; filas: Riesgo[] } | undefined {
  const filas = riesgo.filter(r => r.estado === 'en-riesgo' && !r.altoImpacto)
  if (!filas.length) return undefined
  const servicios = filas.filter(esServicio).length, bombas = filas.length - servicios
  const multifasicas = filas.every(r => esServicio(r) || r.tipo === 'transporte')
  const partes = [
    ...(servicios ? [plural(servicios, 'servicio', 'servicios')] : []),
    ...(bombas ? [multifasicas ? plural(bombas, 'bomba multifásica', 'bombas multifásicas') : plural(bombas, 'otra bomba', 'otras bombas')] : []),
  ]
  return { texto: `${partes.join(' y ')} en alarma`, filas }
}
