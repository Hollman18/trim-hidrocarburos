import { formatoFecha } from '@/shared/lib/fecha'

/** Reloj del demo. El mes en curso va en su día 2 (ver PERIODOS en campos.ts,
 *  que, como los períodos de `rangoDePeriodo`, sale de `calendarioDe(AHORA)`).
 *  En producción la hora de cada evento la pone el PLC y «ahora» lo da el
 *  servidor; aquí se fija para que un evento abierto mida siempre lo mismo. */
export const AHORA = new Date('2026-10-02T14:00:00-05:00')

export const horasEntre = (desde: Date, hasta: Date) =>
  (hasta.getTime() - desde.getTime()) / 3_600_000

/* Un formateador por formato, armado una vez: crear uno en cada llamada era
   la mitad del tiempo de las pantallas. El texto sale igual. Los de mes
   abreviado pasan por `formatoFecha`: el mismo texto en todos los navegadores. */
const ZONA = 'America/Bogota'
// El día, sin cero delante (B-25): con el año, '2-digit' escribía «03 de nov de 2025».
const FMT_FECHA_HORA = formatoFecha({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA })
const FMT_FECHA_HORA_ANIO = formatoFecha({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', hour12: false, timeZone: ZONA })
const FMT_FECHA = formatoFecha({ day: 'numeric', month: 'short', timeZone: ZONA })
const FMT_FECHA_ANIO = formatoFecha({ day: 'numeric', month: 'short', year: 'numeric', timeZone: ZONA })
const FMT_LARGA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA })

/** El año de un instante en Colombia (UTC−5, sin horario de verano). El del
 *  navegador no sirve: el 31-dic a las 21:00 de Bogotá ya es 2026 en Madrid. */
const anioCo = (d: Date) => new Date(d.getTime() - 5 * 3_600_000).getUTCFullYear()

/** «2 de oct, 03:52» en la zona del campo. La hora del PLC no se redondea. Lo
 *  de otro año lleva el año: «6 de oct» del año pasado se leería como futuro. */
export const fechaHora = (d: Date) =>
  (anioCo(d) !== anioCo(AHORA) ? FMT_FECHA_HORA_ANIO : FMT_FECHA_HORA).format(d)

/** «1 de oct» en la zona del campo: para días, no para eventos. */
export const fechaCorta = (d: Date) =>
  (anioCo(d) !== anioCo(AHORA) ? FMT_FECHA_ANIO : FMT_FECHA).format(d)

/** «2 de octubre de 2026, 14:00 (hora de Colombia)»: para documentos, donde
 *  la fecha tiene que valer sola, fuera de la pantalla. */
export const fechaHoraLarga = (d: Date) => `${FMT_LARGA.format(d)} (hora de Colombia)`

/* ─────────────────────────── el calendario ─────────────────────────── */

const MESES_NOMBRE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mayuscula = (t: string) => `${t[0]!.toUpperCase()}${t.slice(1)}`

/** El calendario de los períodos sobre un «ahora» (en Colombia, UTC−5): el
 *  mes en curso, el último cerrado, los tres cerrados antes del en curso, el
 *  año a la fecha y los doce meses cerrados. Todo sale de ese instante: cuando
 *  el servidor dé la hora, los períodos se mueven solos. */
export function calendarioDe(ahora: Date) {
  const co = new Date(ahora.getTime() - 5 * 3_600_000)
  const y = co.getUTCFullYear(), m = co.getUTCMonth()
  const inicio = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 1, 5))
  const mes = (k: number) => { const d = new Date(Date.UTC(y, m + k, 1)); return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() } }
  const nombre = (k: number) => MESES_NOMBRE[mes(k).mes]!
  const desde = (k: number) => inicio(mes(k).anio, mes(k).mes)
  return {
    curso: { desde: desde(0), hasta: ahora, nombre: `${mayuscula(nombre(0))}, en curso` },
    cerrado: { desde: desde(-1), hasta: desde(0), nombre: `${mayuscula(nombre(-1))}, cerrado` },
    trimestre: { desde: desde(-3), hasta: desde(0), nombre: `${mayuscula(nombre(-3))} a ${nombre(-1)}` },
    ytd: { desde: inicio(y, 0), hasta: ahora, nombre: 'Año a la fecha' },
    doce: { desde: desde(-12), hasta: desde(0), nombre: 'Últimos 12 meses' },
    /** Para los rótulos: mes en curso, meses del año ya cerrados, días que
     *  lleva (el de hoy cuenta) y días que tiene. */
    mesEnCurso: { nombre: nombre(0), cerradosDelAnio: m, dia: co.getUTCDate(), diasDelMes: new Date(Date.UTC(y, m + 1, 0)).getUTCDate() },
    nombreMes: nombre,
    anio: (k: number) => mes(k).anio,
  }
}
