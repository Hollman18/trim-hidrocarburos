/** A3 · LA CONVERSIÓN DEL ÁRBOL DE LA OPERADORA AL DE LA ANH, solo lo necesario
 *  (necesario-por-rol.md: adm, «TIENE»; CAMBIOS-CONTRATO.md §9, M4; P1 §1.10 y §2.3).
 *
 *  El pedido central de Edinson: «cómo adoptan su árbol de fallas… al árbol… de la
 *  ANH» [T 22:34]. Lo necesario es la TABLA DE EQUIVALENCIAS: cada código de la
 *  operadora → la causa (N1) y el detalle (N2) de la circular. Se importa de un CSV o
 *  de un pegado de Excel (`POST /api/anh/conversion/importar`, no firma), se firma con
 *  la configuración (`Config.conversionAnh`, `POST /api/configuracion`, capacidad
 *  `config:firmar`) y se ve con lo que queda sin equivalencia (`GET
 *  /api/vistas/anh/conversion`).
 *
 *  - Una fila sin N1 o sin N2 es un código SIN EQUIVALENCIA: se firma así y se ve
 *    aparte; nunca se le pone una por defecto.
 *  - La planeación sale del prefijo de la N1 (`planeacionDeN1`); el choke y el
 *    impacto nunca salen de esta tabla (P1 §1.10).
 *  - `descripcion` es el texto del árbol de la operadora: se queda en TRIM y no viaja
 *    a la ANH (D2).
 *  - Aplicarla a una parada (la procedencia `conversion` de `anh-clasificacion.ts`)
 *    espera que el evento traiga el código de la operadora: por decidir (P1 §2.3).
 *    Lo que queda fuera de «lo necesario»: el árbol con padres y la herencia por
 *    subárbol, `segun-programa`, `precisar` y las versiones de la tabla. */
import {
  N1_CIRCULAR, esClaveN1, n2EnN1, esCodigoN2Conocido, n1DeCodigo, planeacionDeN1, textoN1, textoN2, slugN2,
  type ClaveN1, type CodigoN2, type Planeacion,
} from './anh-catalogo'

/** Una equivalencia firmada: el código de la operadora de un campo → N1 y N2. */
export interface FilaConversionAnh {
  campoId: string
  codigo: string
  descripcion: string
  /** Ausentes: el código no tiene equivalencia todavía. */
  n1?: ClaveN1
  n2?: CodigoN2
}

/** Lo que vuelve de una carga (no firma). */
export interface ConversionLeida {
  campoId: string
  conversion: FilaConversionAnh[]
  hallazgos: Array<{ fila: number; codigo?: string; texto: string; bloquea: boolean }>
  /** Las filas de datos que traía el archivo. */
  filas: number
}

/** `GET /api/vistas/anh/conversion?campo=`. */
export interface VistaConversionAnh {
  campoId: string
  /** La tabla firmada del campo, por código. Vacía: no hay ninguna firmada. */
  vigente: Array<FilaConversionAnh & { planeacion?: Planeacion; textoN1?: string; textoN2?: string }>
  /** Los códigos que quedan sin equivalencia, con lo que les falta. */
  sinEquivalencia: Array<{ codigo: string; descripcion: string; falta: 'n1' | 'n2' }>
  total: number
  conEquivalencia: number
  /** La versión firmada que la trajo (o la cambió por última vez), quién y cuándo. Ausente sin tabla. */
  firma?: { version: number; por: string; fecha: string }
}

/** Topes (C-12): un código no es una frase y una tabla no es una base de datos. */
export const MAXIMO_CODIGO = 64
export const MAXIMO_DESCRIPCION = 200
export const MAXIMO_FILAS_CONVERSION = 5000

/** Sin tildes, sin mayúsculas y sin espacios de más: para comparar lo que escribe una persona. */
const plano = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** La N1 de lo escrito: su clave («NP_SUB») o su texto («No planeada - Mecánica subsuelo»). */
export function n1DeTexto(x: string): ClaveN1 | undefined {
  const t = x.trim()
  if (esClaveN1(t)) return t
  const p = plano(t)
  return N1_CIRCULAR.find(n => plano(n.texto) === p || plano(n.clave) === p)?.clave
}

/** La N2 de lo escrito, dentro de su N1: su código («NP_SUB/falla-esp»), el final del
 *  código («falla-esp») o su texto («Falla ESP»). */
export function n2DeTexto(x: string, n1: ClaveN1): CodigoN2 | undefined {
  const t = x.trim()
  // El código entero, o el slug de lo escrito (el texto de la Tabla 1 y el final del código dan el mismo).
  for (const c of [t, `${n1}/${slugN2(t)}`]) if (esCodigoN2Conocido(c) && n1DeCodigo(c) === n1) return c
  return undefined
}

/** Lee la tabla de un CSV o de un pegado de Excel: «código; descripción; N1; N2»,
 *  separado por punto y coma, coma o tabulador. Una primera fila de títulos se salta.
 *  Lo que bloquea la firma va en `hallazgos` con `bloquea: true`. */
export function leerConversion(texto: string, campoId: string): ConversionLeida {
  const lineas = texto.replace(/\r\n?/g, '\n').split('\n')
  const conversion: FilaConversionAnh[] = [], hallazgos: ConversionLeida['hallazgos'] = []
  const vistos = new Map<string, number>()
  let filas = 0
  for (const [i, linea] of lineas.entries()) {
    if (!linea.trim()) continue
    const sep = linea.includes('\t') ? '\t' : linea.includes(';') ? ';' : ','
    const [codigoC = '', descripcionC = '', n1C = '', n2C = ''] = linea.split(sep).map(x => x.trim().replace(/^"(.*)"$/, '$1').trim())
    // La fila de títulos: la primera, si su N1 no es una N1 y dice «código».
    if (!filas && !conversion.length && !hallazgos.length && /c[oó]digo/i.test(codigoC) && !n1DeTexto(n1C)) continue
    filas++
    const fila = i + 1
    if (!codigoC) { hallazgos.push({ fila, texto: 'La fila no trae el código de la operadora.', bloquea: true }); continue }
    const codigo = codigoC.slice(0, MAXIMO_CODIGO)
    if (codigoC.length > MAXIMO_CODIGO) hallazgos.push({ fila, codigo, texto: `El código tiene más de ${MAXIMO_CODIGO} caracteres.`, bloquea: true })
    if (vistos.has(codigo)) { hallazgos.push({ fila, codigo, texto: `El código ${codigo} ya venía en la fila ${vistos.get(codigo)}.`, bloquea: true }); continue }
    vistos.set(codigo, fila)
    const descripcion = descripcionC.slice(0, MAXIMO_DESCRIPCION)
    if (!n1C && !n2C) {
      conversion.push({ campoId, codigo, descripcion })
      hallazgos.push({ fila, codigo, texto: `${codigo} queda sin equivalencia: no trae causa ni detalle de la ANH.`, bloquea: false })
      continue
    }
    const n1 = n1DeTexto(n1C)
    if (!n1) { hallazgos.push({ fila, codigo, texto: `${codigo}: «${n1C.slice(0, MAXIMO_CODIGO)}» no es una de las 20 causas de la circular.`, bloquea: true }); continue }
    if (!n2C) {
      conversion.push({ campoId, codigo, descripcion, n1 })
      hallazgos.push({ fila, codigo, texto: `${codigo} queda sin detalle (N2): tiene causa, pero no equivalencia completa.`, bloquea: false })
      continue
    }
    const n2 = n2DeTexto(n2C, n1)
    if (!n2) { hallazgos.push({ fila, codigo, texto: `${codigo}: «${n2C.slice(0, MAXIMO_CODIGO)}» no es un detalle de «${textoN1(n1)}».`, bloquea: true }); continue }
    conversion.push({ campoId, codigo, descripcion, n1, n2 })
    // Los comodines de la circular se avisan (P1 §2.3: «sin comodines sin justificar»).
    if (n2 === 'NP_OPUB/orden-publico-pendiente-detalle' || n2 === 'NP_CLIMA/otro-evento-natural')
      hallazgos.push({ fila, codigo, texto: `${codigo} va a «${textoN2(n2)}», que es un comodín: revise si hay un detalle mejor.`, bloquea: false })
  }
  if (filas > MAXIMO_FILAS_CONVERSION) hallazgos.push({ fila: lineas.length, texto: `La tabla trae ${filas} filas: hasta ${MAXIMO_FILAS_CONVERSION} por carga.`, bloquea: true })
  return { campoId, conversion, hallazgos, filas }
}

/** Lo que no deja firmar la tabla (las palabras de `validarConfig`). */
export function validarConversion(filas: readonly FilaConversionAnh[] | undefined, conocido: (campo: string) => boolean, nombre: (campo: string) => string): string[] {
  const e: string[] = []
  const vistos = new Set<string>()
  for (const f of filas ?? []) {
    const donde = `Conversión ${typeof f.codigo === 'string' ? f.codigo : '?'}`
    if (!conocido(f.campoId)) { e.push(`${donde}: «${f.campoId}» no es un campo registrado.`); continue }
    if (typeof f.codigo !== 'string' || !f.codigo.trim()) { e.push(`Conversión de ${nombre(f.campoId)}: una fila no trae el código de la operadora.`); continue }
    if (f.codigo.length > MAXIMO_CODIGO) e.push(`${donde}: el código tiene más de ${MAXIMO_CODIGO} caracteres.`)
    if (typeof f.descripcion !== 'string' || f.descripcion.length > MAXIMO_DESCRIPCION) e.push(`${donde}: la descripción va en texto, hasta ${MAXIMO_DESCRIPCION} caracteres.`)
    const k = `${f.campoId}|${f.codigo}`
    if (vistos.has(k)) e.push(`${donde} (${nombre(f.campoId)}): el código está dos veces.`)
    vistos.add(k)
    if (f.n1 !== undefined && !esClaveN1(f.n1)) e.push(`${donde}: «${f.n1}» no es una de las 20 causas de la circular.`)
    if (f.n2 !== undefined && f.n1 === undefined) e.push(`${donde}: un detalle (N2) va con su causa (N1).`)
    if (f.n2 !== undefined && f.n1 !== undefined && esClaveN1(f.n1) && !n2EnN1(f.n2, f.n1)) e.push(`${donde}: «${f.n2}» no es un detalle de «${textoN1(f.n1)}».`)
  }
  if ((filas?.length ?? 0) > MAXIMO_FILAS_CONVERSION) e.push(`Conversión: hasta ${MAXIMO_FILAS_CONVERSION} códigos.`)
  return e
}

/** La tabla de un campo, con lo vacío como ausente (lo que se firma y lo que viaja). */
export function normalizarConversion(filas: readonly FilaConversionAnh[] | undefined): FilaConversionAnh[] | undefined {
  if (!filas?.length) return undefined
  return filas.map(f => ({ campoId: f.campoId, codigo: f.codigo, descripcion: f.descripcion ?? '',
    ...(f.n1 != null ? { n1: f.n1 } : {}), ...(f.n2 != null ? { n2: f.n2 } : {}) }))
}

const igual = (a: FilaConversionAnh, b: FilaConversionAnh) => a.descripcion === b.descripcion && a.n1 === b.n1 && a.n2 === b.n2

/** Lo que cambia de la tabla, en palabras del historial (técnico: lo firma el administrador). */
export function diferenciasConversion(a: readonly FilaConversionAnh[] | undefined, b: readonly FilaConversionAnh[] | undefined, nombre: (campo: string) => string): string[] {
  const out: string[] = []
  const porCampo = (xs: readonly FilaConversionAnh[] | undefined) => {
    const m = new Map<string, Map<string, FilaConversionAnh>>()
    for (const f of xs ?? []) { if (!m.has(f.campoId)) m.set(f.campoId, new Map()); m.get(f.campoId)!.set(f.codigo, f) }
    return m
  }
  const A = porCampo(a), B = porCampo(b)
  const destino = (f: FilaConversionAnh) => (f.n2 ? `${f.n1} · ${f.n2}` : f.n1 ? `${f.n1} (sin detalle)` : 'sin equivalencia')
  for (const c of [...new Set([...A.keys(), ...B.keys()])].sort()) {
    const ea = A.get(c) ?? new Map<string, FilaConversionAnh>(), eb = B.get(c) ?? new Map<string, FilaConversionAnh>()
    const sin = [...eb.values()].filter(f => !f.n2).length
    if (!ea.size) { out.push(`Conversión del árbol de ${nombre(c)}: se firma con ${eb.size} ${eb.size === 1 ? 'código' : 'códigos'}${sin ? ` (${sin} sin equivalencia)` : ''}`); continue }
    if (!eb.size) { out.push(`Conversión del árbol de ${nombre(c)}: se quitó la tabla firmada (${ea.size} ${ea.size === 1 ? 'código' : 'códigos'})`); continue }
    for (const [k, f] of eb) {
      const v = ea.get(k)
      if (!v) out.push(`Conversión de ${nombre(c)}: ${k} → ${destino(f)}`)
      else if (!igual(v, f)) out.push(`Conversión de ${nombre(c)}: ${k}: ${destino(v)} → ${destino(f)}${v.descripcion !== f.descripcion ? ' (cambió la descripción)' : ''}`)
    }
    for (const k of ea.keys()) if (!eb.has(k)) out.push(`Conversión de ${nombre(c)}: se quitó ${k}`)
  }
  return out
}

/** La vista de un campo: la tabla firmada y lo que queda sin equivalencia. */
export function vistaConversion(filas: readonly FilaConversionAnh[] | undefined, campoId: string,
  firma?: VistaConversionAnh['firma']): VistaConversionAnh {
  const del = (filas ?? []).filter(f => f.campoId === campoId).sort((a, b) => a.codigo.localeCompare(b.codigo))
  const vigente = del.map(f => ({ ...f, ...(f.n1 ? { planeacion: planeacionDeN1(f.n1), textoN1: textoN1(f.n1) } : {}), ...(f.n2 ? { textoN2: textoN2(f.n2) } : {}) }))
  const sinEquivalencia = del.filter(f => !f.n1 || !f.n2).map(f => ({ codigo: f.codigo, descripcion: f.descripcion, falta: (f.n1 ? 'n2' : 'n1') as 'n1' | 'n2' }))
  return { campoId, vigente, sinEquivalencia, total: del.length, conEquivalencia: del.length - sinEquivalencia.length, ...(del.length && firma ? { firma } : {}) }
}

/** La versión que trajo (o cambió por última vez) la tabla de un campo. */
export function firmaDeConversion<V extends { version: number; por: string; fecha: string; config: { conversionAnh?: FilaConversionAnh[] } }>(
  versiones: readonly V[], campoId: string): VistaConversionAnh['firma'] {
  const de = (v: V) => JSON.stringify((v.config.conversionAnh ?? []).filter(f => f.campoId === campoId))
  for (let i = versiones.length - 1; i >= 0; i--) {
    const v = versiones[i]!
    const antes = i > 0 ? de(versiones[i - 1]!) : '[]'
    if (de(v) !== antes) return de(v) === '[]' ? undefined : { version: v.version, por: v.por, fecha: v.fecha }
  }
  return undefined
}
