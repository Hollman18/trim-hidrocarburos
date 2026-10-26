/** Piezas compartidas de la pantalla de configuración. */
import type { TramoMeta } from '@/entities/configuracion'
import { formatoFecha } from '@/shared/lib/fecha'

export const cajaNumero = 'tabular w-full min-w-0 rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[5px] text-right text-[14px] outline-none focus:border-acento disabled:opacity-70'
/** Una casilla con un valor que no se puede firmar se marca donde está, no solo abajo. */
export const cajaMala = 'border-2 border-[var(--tinta)]'
/** «1 oct 2026» de un día AAAA-MM-DD, en hora de Colombia. */
const FMT_DIA = formatoFecha({ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })
export const fechaDia = (d: string) => FMT_DIA.format(new Date(`${d}T12:00:00-05:00`))

/** Lo que pide cada casilla de meta, dicho junto a la casilla cuando no se
 *  cumple: el borde grueso dice que algo está mal; esto dice qué (y el lector
 *  de pantalla lo lee con aria-describedby). */
export const REGLA_CAJA = {
  produccionBpd: 'Tiene que ser mayor que 0.',
  diferidoMaxBpd: 'Tiene que ser 0 o más.',
  netbackUsd: 'Tiene que ser 0 o más, o quedar vacío.',
} as const

/** Lo que muestra la casilla de un tramo: sus cifras, o vacías (NaN) si el
 *  campo no tiene meta firmada. Vacías y no la semilla ni 0: la firma no las
 *  acepta hasta que el gerente las llene (`validarConfig`). */
export const edicionDe = (m: TramoMeta | undefined): Omit<TramoMeta, 'desde'> => m
  ? { produccionBpd: m.produccionBpd, diferidoMaxBpd: m.diferidoMaxBpd, netbackUsd: m.netbackUsd, criterioSinCausa: m.criterioSinCausa }
  : { produccionBpd: NaN, diferidoMaxBpd: NaN, criterioSinCausa: NaN }
