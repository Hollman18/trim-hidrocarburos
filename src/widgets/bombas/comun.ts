import type { Pronostico } from '@/entities/vigia'
import type { VariableId, Subtipo } from '@/entities/bombas'
import { HORIZONTE_H, type SaludParte } from '@/entities/salud'

const n0 = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 0 })
const n1 = (v: number) => v.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** El horizonte (90 días) es el mismo que usa la salud por parte: más allá,
 *  una proyección lineal ya no se sostiene y se dice «más de tres meses».
 *  «precisa» para el registro de paradas, donde cada décima de hora son
 *  barriles; sin ella, para pronósticos, donde un decimal sería fingir. */
export const fmtHoras = (h: number, precisa = false) =>
  h > HORIZONTE_H ? 'más de 3 meses'
    : h < 48 ? `${precisa ? n1(h) : n0(h)} h` : `${n1(h / 24)} d`

/** Una parada abierta que todavía no cierra pozos no «lo absorbió todo»: el
 *  tanque sigue llenándose y lo que se dice es cuánto falta del colchón. Si el
 *  previsto ya pasó sin cierres, se dice así, sin inventar cuándo llegará. */
export const tanqueAbierto = (previstoH: number, llevaH: number) => previstoH > llevaH
  ? `el tanque todavía absorbe: faltan ${fmtHoras(previstoH - llevaH, true)} del colchón`
  : 'ya pasó el colchón previsto y todavía no se ha cerrado ningún pozo'

export function textoPronostico(p: Pronostico): string {
  switch (p.tipo) {
    case 'cruza':
      return p.horas > HORIZONTE_H ? 'en más de 3 meses'
        : fmtHoras(p.rango[0]) === fmtHoras(p.rango[1]) ? `en ${fmtHoras(p.horas)}`
          : `en ${fmtHoras(p.horas)} (${fmtHoras(p.rango[0])} a ${fmtHoras(p.rango[1])})`
    case 'cruzado': return 'ya cruzó el límite'
    case 'sin-limite': return 'sin límite declarado'
    case 'sin-tendencia': return p.motivo
    case 'no-atribuible': return p.motivo
  }
}

export const fmtBbl = (v: number) => `${n0(v)} bbl`
export const fmtRango = ([a, b]: [number, number]) => `${n0(Math.max(0, a))} – ${n0(b)}`
export const fmtTol = (t: number) => `±${n1(t * 100)} %`
/** Un componente despreciable se dice como tal, no como «0,0 %». */
export const fmtComponente = (t: number) => t < 0.0005 ? '< 0,1 %' : `±${n1(t * 100)} %`

/** Las cuatro variables que caben en la placa de cada familia: las que más
 *  dicen de su estado y de lo que viene. */
export const CLAVE: Record<Subtipo, VariableId[]> = {
  multifasica: ['dp_filtro', 'v_bomba', 'velocidad', 'nivel_barrera'],
  inyeccion: ['p_succion', 'p_descarga', 'caudal', 'v_bomba'],
}

/** Estado de una parte en dos o tres palabras, para la placa. */
export function estadoCorto(sp: SaludParte): string {
  switch (sp.estado) {
    case 'fallo': return 'causa de la parada'
    case 'fuera': return 'fuera de banda'
    case 'avisa': return sp.primera ? `cruza ${sp.primera.senal.pronostico.horas > HORIZONTE_H ? 'en más de 3 meses' : `en ${fmtHoras(sp.primera.senal.pronostico.horas)}`}` : 'lo que la daña, fuera de banda'
    case 'detenida': return 'bomba detenida'
    case 'estable': return sp.lenta ? 'tendencia lenta' : 'estable'
    case 'sin-dato': return 'sin instrumentos'
  }
}

/** «41–45 h»: el rango de un pronóstico en corto. Vacío si los dos extremos
 *  se escriben igual (ya lo dice la cifra de al lado). */
export function rangoCorto([a, b]: [number, number]): string {
  const x = fmtHoras(a), y = fmtHoras(b)
  if (x === y) return ''
  const unidad = (t: string) => t.split(' ').at(-1)
  return unidad(x) === unidad(y) ? `${x.replace(/ \S+$/, '')}–${y}` : `${x}–${y}`
}

/** El pronóstico en corto: «en 43 h · 41–45 h». Las mismas cifras que
 *  `textoPronostico`; solo cambia cómo se escribe el rango. */
export function pronosticoCorto(p: Pronostico): string {
  if (p.tipo !== 'cruza' || p.horas > HORIZONTE_H) return textoPronostico(p)
  const r = rangoCorto(p.rango)
  return `en ${fmtHoras(p.horas)}${r ? ` · ${r}` : ''}`
}

/** La frase de una parte en corto, para donde su estado ya va escrito en una
 *  etiqueta («fuera de banda», «avisa»): qué variable lo dice y cuándo, sin
 *  repetir el estado. La frase completa sigue siendo `fraseParte`. */
export function fraseParteCorta(sp: SaludParte): string {
  const v = (s: { plantilla: { nombre: string } }) => s.plantilla.nombre.toLowerCase()
  if (sp.estado === 'fuera') {
    const s = sp.fuera[0]?.senal
    if (!s) return 'un instrumento suyo reporta alarma'
    if (s.estado === 'alarma' || s.pronostico.tipo === 'cruzado') return `${v(s)} · ya en alarma`
    return s.pronostico.tipo === 'cruza' ? `${v(s)} · alarma ${pronosticoCorto(s.pronostico)}` : v(s)
  }
  if (sp.primera) {
    const mas = sp.coinciden > 1 ? ` · +${sp.coinciden - 1} ${sp.coinciden === 2 ? 'señal' : 'señales'}` : ''
    return `${v(sp.primera.senal)} · cruza ${pronosticoCorto(sp.primera.senal.pronostico)}${mas}`
  }
  if (sp.causaActiva.length) return `la daña: ${v(sp.causaActiva[0]!.senal)}`
  if (sp.lenta) return `${v(sp.lenta.senal)} · más de 3 meses`
  return sp.estado === 'fallo' ? 'causa de la parada' : sp.estado === 'sin-dato' ? 'sin instrumentos' : ''
}

/** La frase de una parte: qué variable lo dice y cuándo. */
export function fraseParte(sp: SaludParte): string {
  if (sp.estado === 'fuera') {
    const s = sp.fuera[0]?.senal
    if (!s) return 'un instrumento suyo reporta alarma'
    // Dos límites distintos: la banda normal y la alarma. Se dicen por su nombre.
    if (s.estado === 'alarma' || s.pronostico.tipo === 'cruzado') return `${s.plantilla.nombre.toLowerCase()} ya llegó a su alarma`
    const llega = s.pronostico.tipo === 'cruza' ? `; llega a su alarma ${textoPronostico(s.pronostico)}` : ''
    return `${s.plantilla.nombre.toLowerCase()} salió de su banda normal${llega}`
  }
  if (sp.primera) {
    const otra = sp.coinciden > 1 ? ` (y ${sp.coinciden - 1} ${sp.coinciden === 2 ? 'señal más' : 'señales más'} en el mismo sentido)` : ''
    return `${sp.primera.senal.plantilla.nombre.toLowerCase()} cruza su límite ${textoPronostico(sp.primera.senal.pronostico)}${otra}`
  }
  if (sp.causaActiva.length) return `lo que la daña ya está fuera de banda: ${sp.causaActiva[0]!.senal.plantilla.nombre.toLowerCase()}`
  if (sp.lenta) return `${sp.lenta.senal.plantilla.nombre.toLowerCase()} va hacia su límite, pero en más de 3 meses`
  return estadoCorto(sp)
}
