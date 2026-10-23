/** Plan mes a mes cargado del presupuesto de la empresa. Cada mes del plan es
 *  un tramo de meta que empieza el día 1 (`TramoMeta`): el libro ya mide cada
 *  día contra el tramo que regía, así que el plan no necesita otro cálculo.
 *
 *  El presupuesto llega pegado desde Excel o en un CSV con la plantilla que la
 *  misma pantalla descarga: una fila por mes y campo. Se lee aquí, con las
 *  mismas reglas que el servidor aplica al firmar.
 */
import { CAMPOS } from './campos'
import { textoCsv } from '@/shared/lib/csv'
import { TOPE_PRECIO_USD } from './configuracion'

export interface FilaPlan {
  /** AAAA-MM */
  mes: string
  campoId: string
  produccionBpd: number
  diferidoMaxBpd?: number
  netbackUsd?: number
}

const MESES_NOMBRE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** «AAAA-MM» del mes siguiente (o de n meses después). */
export const sumarMeses = (mes: string, n: number) => {
  const [y, m] = mes.split('-').map(Number) as [number, number]
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
export const diasDelMes = (mes: string) => {
  const [y, m] = mes.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
export const nombreMes = (mes: string) => `${MESES_NOMBRE[Number(mes.slice(5)) - 1]} de ${mes.slice(0, 4)}`

/** El mes de una celda, en las formas en que lo escribe una persona o lo
 *  devuelve Excel en español: «2026-11», «2026-11-01», «11/2026»,
 *  «1/11/2026» (día/mes/año), «nov 2026», «nov-26», «noviembre de 2026» y el
 *  número de serie de fecha de Excel (46327). */
export function leerMes(celda: string): string | undefined {
  // «2026-11-01 00:00:00» (lo que devuelve una celda de fecha): la hora sobra.
  const s = sinTildes(celda).replace(/^"|"$/g, '').replace(/\s+de\s+/g, ' ').replace(/[ t]\d{1,2}:\d{2}(:\d{2})?$/, '')
  let m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/)
  if (m) return mesValido(Number(m[1]), Number(m[2]))
  m = s.match(/^(\d{1,2})[/.-](\d{4})$/)
  if (m) return mesValido(Number(m[2]), Number(m[1]))
  m = s.match(/^\d{1,2}[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return mesValido(Number(m[2]), Number(m[1]))
  m = s.match(/^([a-z]+)\.?[\s.-]*(\d{2}|\d{4})$/)
  if (m) {
    // El nombre tiene que ser el comienzo del mes («nov», «sept», «noviembre»): «junk» no es junio.
    const nombre = m[1]! === 'set' ? 'sept' : m[1]!
    const i = nombre.length >= 3 ? MESES_NOMBRE.findIndex(n => n.startsWith(nombre)) : -1
    const y = m[2]!.length === 2 ? 2000 + Number(m[2]) : Number(m[2])
    if (i >= 0) return mesValido(y, i + 1)
  }
  // Número de serie de Excel: días desde el 30 de diciembre de 1899.
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86_400_000)
    return mesValido(d.getUTCFullYear(), d.getUTCMonth() + 1)
  }
  return undefined
}
const mesValido = (y: number, m: number) => (m >= 1 && m <= 12 && y >= 2000 && y <= 2100 ? `${y}-${String(m).padStart(2, '0')}` : undefined)

/** Un número como lo escribe una hoja en español o en inglés: «10.900»,
 *  «10900», «10,900» (miles) o «48,5» (decimal). Vacío = sin dato. Con
 *  `miles: false` (el precio, que nunca pasa de unos cientos) un solo punto o
 *  una sola coma es SIEMPRE el decimal: «48,125» es 48,125 USD/bbl y no 48.125. */
export function leerNumero(celda: string, opciones: { miles?: boolean } = {}): number | undefined | 'malo' {
  const s = celda.replace(/\s/g, '').replace(/^"|"$/g, '')
  if (!s) return undefined
  let t: string
  // Con punto y coma a la vez, el ÚLTIMO es el decimal: «1.234,5» (español) o «11,200.5» (inglés).
  if (s.includes('.') && s.includes(',')) t = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  // Solo separadores de miles: «10.900», «10,900», «1.234.567». Un cero adelante («0,125») es decimal.
  else if (opciones.miles !== false && /^-?[1-9]\d{0,2}([.,]\d{3})+$/.test(s)) t = s.replace(/[.,]/g, '')
  else t = s.replace(',', '.')
  const v = Number(t)
  return Number.isFinite(v) ? v : 'malo'
}

/** Parte una línea en celdas respetando las comillas: «"11,200"» es una sola
 *  celda. Cada celda dice si venía entre comillas. */
function celdasConComillas(linea: string, sep: string): Array<{ texto: string; comillas: boolean }> {
  const out: Array<{ texto: string; comillas: boolean }> = []
  let actual = '', comillas = false, citada = false
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i]!
    if (ch === '"') { if (comillas && linea[i + 1] === '"') { actual += '"'; i++ } else { comillas = !comillas; citada = true } }
    else if (ch === sep && !comillas) { out.push({ texto: actual.trim(), comillas: citada }); actual = ''; citada = false }
    else actual += ch
  }
  out.push({ texto: actual.trim(), comillas: citada })
  return out
}
export const celdas = (linea: string, sep: string): string[] => celdasConComillas(linea, sep).map(c => c.texto)

/** Con coma como separador, «11,200» sin comillas puede ser un número con
 *  miles partido en dos columnas (11 y 200) o dos cifras de verdad. El par
 *  sospechoso es una celda de 1 a 3 dígitos seguida de una de exactamente 3,
 *  las dos sin comillas y en las columnas de cifras (desde `desde`: el mes, el
 *  campo y el pozo no cuentan). Pero el par solo es ambiguo si la fila no dice
 *  cómo escribe sus números: una fila que trae una cifra de 4 dígitos o más
 *  SIN separador («9000») muestra que quien la escribió no agrupa los miles,
 *  y entonces «500,100» son dos columnas (diferido 500 y precio 100, una fila
 *  legítima que antes se rechazaba). Sin esa prueba («11,200,700») no se
 *  adivina: se pide escribirlo sin ambigüedad. */
export function comaAmbigua(linea: string, sep: string, desde: number): string | undefined {
  // Sin comillas, una celda no puede llevar coma: «9000» o «9000.5» son cifras escritas sin
  // agrupar, y en esa fila un par «5,200» se lee como dos columnas (lo dice parSospechoso).
  const cs = celdasConComillas(linea, sep).slice(desde)
  if (sep !== ',' || cs.some(c => !c.comillas && /^-?\d{4,}(\.\d+)?$/.test(c.texto))) return undefined
  return parSospechoso(linea, sep, desde)
}

/** El primer par de celdas «1 a 3 dígitos, 3 dígitos» sin comillas: con coma
 *  como separador puede ser un número con miles («1,200») o dos columnas. */
export function parSospechoso(linea: string, sep: string, desde: number): string | undefined {
  if (sep !== ',') return undefined
  const cs = celdasConComillas(linea, sep).slice(desde)
  for (let i = 1; i < cs.length; i++) {
    const a = cs[i - 1]!, b = cs[i]!
    if (!a.comillas && !b.comillas && /^-?\d{1,3}$/.test(a.texto) && /^\d{3}$/.test(b.texto)) return `${a.texto},${b.texto}`
  }
  return undefined
}
const AVISO_COMA = (n: number, x: string) =>
  `Fila ${n}: «${x}» puede ser un número con miles o dos columnas. Escriba el número entre comillas ("${x}"), sin separador de miles, o separe las columnas con punto y coma.`

/** Las líneas de un texto pegado o subido y su separador: tabulador (lo que
 *  copia Excel), punto y coma o coma. */
export function partirTexto(texto: string): { lineas: string[]; sep: string } {
  const lineas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trimEnd())
  const llenas = lineas.filter(l => l.trim())
  return { lineas, sep: llenas.some(l => l.includes('\t')) ? '\t' : llenas.some(l => l.includes(';')) ? ';' : ',' }
}

/** El campo de una celda, por su nombre o su código, sin importar tildes ni mayúsculas. */
export const leerCampo = (celda: string) => {
  const s = sinTildes(celda)
  return CAMPOS.find(c => sinTildes(c.nombre) === s || c.id === s)?.id
}

/** Lee las filas pegadas o subidas. Acepta tabulador (lo que copia Excel),
 *  punto y coma o coma como separador; la primera fila se salta si es la
 *  cabecera. `enBblMes` convierte un total del mes en bbl/d. `desdeMes` es el
 *  mes en curso: los meses cerrados no se reescriben. `permitidos` son los
 *  campos de quien carga. */
export function leerPlan(texto: string, opciones: { enBblMes: boolean; desdeMes: string; permitidos: string[] }): { filas: FilaPlan[]; errores: string[]; avisos: string[] } {
  // El número de fila es el de la línea pegada (las vacías cuentan), para que se encuentre.
  const { lineas, sep } = partirTexto(texto)
  const filas: FilaPlan[] = [], errores: string[] = [], avisos: string[] = []
  const vistos = new Map<string, number>()
  const tope = sumarMeses(opciones.desdeMes, 24)
  let primera = true
  lineas.forEach((linea, i) => {
    if (!linea.trim()) return
    const c = celdas(linea, sep)
    const n = i + 1
    const esPrimera = primera; primera = false
    const mes = leerMes(c[0] ?? '')
    if (!mes) {
      // Se salta como cabecera solo si de verdad lo parece: la producción no es un número.
      const cabecera = esPrimera && typeof leerNumero(c[2] ?? '') !== 'number'
      if (!cabecera) errores.push(`Fila ${n}: «${c[0] ?? ''}» no es un mes (use 2026-11, 11/2026 o noviembre 2026).`)
      return
    }
    if (c.length > 5) { errores.push(`Fila ${n}: trae ${c.length} columnas y se esperan 5. Si usa coma decimal, separe las columnas con punto y coma o péguelas desde Excel.`); return }
    // Las cifras empiezan en la tercera columna: mes y campo no son números.
    const ambigua = comaAmbigua(linea, sep, 2)
    if (ambigua) { errores.push(AVISO_COMA(n, ambigua)); return }
    // La fila mezcla cifras sin agrupar con un par sospechoso: se lee como dos columnas, y
    // se dice antes de firmar (no se rechaza: «9000,500,100» es una fila legítima).
    const par = parSospechoso(linea, sep, 2)
    if (par) avisos.push(`Fila ${n}: «${par}» se leyó como dos columnas. Si era un solo número con miles, escríbalo entre comillas ("${par}") o separe las columnas con punto y coma.`)
    if (mes > tope) { errores.push(`Fila ${n}: ${nombreMes(mes)} está a más de dos años; revise el año.`); return }
    const campoId = leerCampo(c[1] ?? '')
    if (!campoId) { errores.push(`Fila ${n}: «${c[1] ?? ''}» no es un campo.`); return }
    if (!opciones.permitidos.includes(campoId)) { errores.push(`Fila ${n}: no tiene asignado ese campo.`); return }
    if (mes < opciones.desdeMes) { errores.push(`Fila ${n}: ${nombreMes(mes)} ya cerró; su meta no se reescribe.`); return }
    const conv = (v: number | undefined) => (v === undefined ? undefined : opciones.enBblMes ? v / diasDelMes(mes) : v)
    // El precio no lleva miles: «48,125» es un decimal, no 48.125 USD/bbl.
    const prod = leerNumero(c[2] ?? ''), dif = leerNumero(c[3] ?? ''), precio = leerNumero(c[4] ?? '', { miles: false })
    const noEsNumero = (k: number) => `Fila ${n}: «${c[k]}» no es un número.`
    if (prod === 'malo') { errores.push(noEsNumero(2)); return }
    if (prod === undefined || !(prod > 0)) { errores.push(`Fila ${n}: la producción tiene que ser mayor que cero.`); return }
    if (dif === 'malo') { errores.push(noEsNumero(3)); return }
    if (dif !== undefined && dif < 0) { errores.push(`Fila ${n}: el máximo de diferido no puede ser negativo.`); return }
    if (precio === 'malo') { errores.push(noEsNumero(4)); return }
    if (precio !== undefined && !(precio >= 0 && precio <= TOPE_PRECIO_USD)) { errores.push(`Fila ${n}: el precio neto va entre 0 y ${TOPE_PRECIO_USD} USD/bbl («${c[4]}»).`); return }
    const clave = `${mes}|${campoId}`
    if (vistos.has(clave)) errores.push(`Fila ${n}: repite ${nombreMes(mes)} de ${CAMPOS.find(x => x.id === campoId)!.nombre} (fila ${vistos.get(clave)}); vale la última.`)
    vistos.set(clave, n)
    const fila: FilaPlan = { mes, campoId, produccionBpd: Math.round(conv(prod)! * 100) / 100 }
    if (dif !== undefined) fila.diferidoMaxBpd = Math.round(conv(dif)! * 100) / 100
    if (precio !== undefined) fila.netbackUsd = precio
    const j = filas.findIndex(f => f.mes === mes && f.campoId === campoId)
    if (j >= 0) filas[j] = fila; else filas.push(fila)
  })
  return { filas, errores, avisos }
}

/** La plantilla para llenar: una fila por mes y campo, con lo que rige hoy. */
export function plantillaPlan(filas: FilaPlan[]): string {
  const cab = 'Mes;Campo;Producción bbl/d;Máximo de diferido bbl/d;Precio neto USD/bbl (opcional)'
  const n = (v: number | undefined) => (v === undefined ? '' : v.toLocaleString('es-CO', { useGrouping: false, maximumFractionDigits: 2 }))
  // Los textos por `textoCsv` (C-25), como todo CSV del producto; las cifras no.
  return '\uFEFF' + [cab, ...filas.map(f => [textoCsv(f.mes), textoCsv(CAMPOS.find(c => c.id === f.campoId)!.nombre), n(f.produccionBpd), n(f.diferidoMaxBpd), n(f.netbackUsd)].join(';'))].join('\r\n')
}
