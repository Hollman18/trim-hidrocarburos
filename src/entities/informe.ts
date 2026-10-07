/** Informes exportados: lo que sale de TRIM como respaldo documental (a un
 *  correo, a una orden de trabajo, a un expediente) lleva membrete, fecha,
 *  quién lo generó, hasta qué hora llegan los datos y un FOLIO registrado con
 *  la huella SHA-256 de sus cifras. Con el folio y la huella impresos, un
 *  tercero comprueba después que el documento no se modificó, sin ver el registro.
 *
 *  La huella la calcula el SERVIDOR con su propio libro y su versión de la
 *  configuración: el front solo manda la consulta (qué campos, qué período,
 *  qué equipo si es una ficha). Si la mandara el navegador, el folio
 *  certificaría cualquier cifra que alguien decidiera hashear.
 *
 *  Contrato: `POST /api/informes` registra la consulta y devuelve el registro
 *  con folio, cifras y huella. El registro completo (`GET /api/informes/:folio`)
 *  pide sesión y acceso a los campos del informe; la comprobación de terceros es
 *  `GET /api/informes/:folio/verificacion?huella=`, que solo dice si coincide y
 *  la fecha (CONTRATO.md). En el demo responde `registrarCifras`, que es la
 *  costura: el backend la reproduce con la forma canónica de abajo.
 */
import { libro, type Libro } from './libro'
import type { Contexto } from './causa-senal'
import { CAMPOS, campoPorId } from './campos'
import { COMO, TIPO_CAUSA } from './causa-senal'
import { NOMBRE_PARTE } from './partes'
import { textoCsv } from '@/shared/lib/csv'

export type FormatoInforme = 'pdf' | 'csv'
export type EstadoInforme = 'publicable' | 'provisional' | 'bloqueado'

/** Lo que el front pide registrar: la consulta, no las cifras. `titulo`,
 *  `alcance` y `periodo` son los rótulos del papel; las cifras salen de
 *  `campos`, `desde`, `hasta` y `equipo`. */
export interface ConsultaInforme {
  formato: FormatoInforme
  titulo: string
  alcance: string
  periodo: string
  /** Ids de los campos del informe. En una ficha, solo el campo del equipo. */
  campos: string[]
  /** Límites del período, ISO 8601 (el «hasta» no se incluye). */
  desde: string
  hasta: string
  /** Si es la ficha de un equipo: cuál, y de qué campo (P-201B existe en varios). */
  equipo?: { equipo: string; campoId: string }
}

/** Las cifras que el folio protege, ya redondeadas como van al papel y a la
 *  huella. Las claves y su orden son los de `CLAVES_HUELLA`. */
export interface CifrasInforme {
  campos: string[]
  desde: string
  hasta: string
  version: number
  real: number
  potencial: number
  noProducido: number
  diferido: number
  tolerancia: number
  metaProduccion: number
  metaDiferido: number
  /** Tramos (evento × pozo) del período: un evento quitado cambia la huella aunque pese 0 bbl. */
  eventos: number
  /** Solo en la ficha de un equipo. */
  equipo?: string
  campoEquipo?: string
  bblEquipo?: number
}

/** El registro de un informe, como lo guarda y lo devuelve el servidor. */
export interface Informe extends ConsultaInforme {
  folio: string
  fecha: string
  por: string
  /** Versión de la configuración con que se calcularon las cifras. */
  version: number
  /** Si el libro del período ya se podía publicar cuando se exportó. */
  estado: EstadoInforme
  cifras: CifrasInforme
  /** SHA-256 de `formaCanonica(cifras)`, en hexadecimal. */
  huella: string
}

/* ─────────────────────── la forma canónica de la huella ───────────────────────
 *
 *  Lo que se hashea es un TEXTO con una línea por cifra, `clave=valor`, en el
 *  orden de `CLAVES_HUELLA`, separadas por LF (\n), sin salto al final,
 *  codificado en UTF-8 sin BOM. SHA-256 en hexadecimal en minúsculas.
 *   · campos       ids en orden alfabético, separados por coma («ceiba,morichal»).
 *   · desde/hasta  ISO 8601 en UTC, truncado al segundo y sin milisegundos
 *                  («2026-09-01T05:00:00Z»).
 *   · version      entero.
 *   · eventos      entero.
 *   · barriles     (real … metaDiferido, bblEquipo) bbl con DOS decimales y
 *                  punto: el entero k = floor(v × 100 + 0,5) calculado en doble
 *                  precisión IEEE-754, escrito como k/100 («10900.00», «-1.50»).
 *   · equipo, campoEquipo, bblEquipo  solo en la ficha de un equipo, al final.
 *  Es texto y no JSON a propósito: el JSON de cada lenguaje escribe distinto
 *  los números («10900» en JS, «10900.0» en Python) y la huella no cuadraría. */
export const CLAVES_HUELLA = ['campos', 'desde', 'hasta', 'version', 'real', 'potencial', 'noProducido', 'diferido',
  'tolerancia', 'metaProduccion', 'metaDiferido', 'eventos', 'equipo', 'campoEquipo', 'bblEquipo'] as const

/** El entero de centésimas con que se redondea una cifra (ver la forma canónica). */
const centesimas = (v: number) => Math.floor(v * 100 + 0.5)
/** Una cifra redondeada a dos decimales, como va al papel. */
const r2 = (v: number) => centesimas(v) / 100
/** «10900.00»: escrito desde el entero, sin pasar por el formato de números del lenguaje. */
const dosDecimales = (v: number) => {
  const k = centesimas(v), a = Math.abs(k)
  return `${k < 0 ? '-' : ''}${Math.trunc(a / 100)}.${String(a % 100).padStart(2, '0')}`
}
/** ISO 8601 en UTC truncado al segundo. */
const isoUtc = (d: Date) => `${new Date(Math.floor(d.getTime() / 1000) * 1000).toISOString().slice(0, 19)}Z`

const ENTEROS = new Set(['version', 'eventos'])
const TEXTOS = new Set(['desde', 'hasta', 'equipo', 'campoEquipo'])

/** El texto que se hashea. Lo mismo que el backend tiene que producir byte a byte. */
export function formaCanonica(c: CifrasInforme): string {
  const lineas: string[] = []
  for (const k of CLAVES_HUELLA) {
    const v = c[k]
    if (v === undefined) continue
    const texto = k === 'campos' ? [...(v as string[])].sort().join(',')
      : TEXTOS.has(k) ? String(v)
        : ENTEROS.has(k) ? String(Math.trunc(v as number))
          : dosDecimales(v as number)
    lineas.push(`${k}=${texto}`)
  }
  return lineas.join('\n')
}

/** Las cifras que el folio protege: las del libro del período y la versión
 *  de la configuración con que se calcularon. */
export function cifrasDe(lb: Libro, alcance: string[], version: number, equipo?: { equipo: string; campoId: string }): CifrasInforme {
  // Si el informe es la ficha de un equipo, su cifra también queda protegida:
  // la de ESE equipo en SU campo (P-201B de La Ceiba no es la de Morichal).
  const eq = equipo ? lb.porEquipo.filter(f => f.equipo === equipo.equipo && f.campoId === equipo.campoId).reduce((a, f) => a + f.bbl, 0) : undefined
  return {
    campos: [...alcance].sort(), desde: isoUtc(lb.desde), hasta: isoUtc(lb.hasta), version,
    real: r2(lb.real), potencial: r2(lb.potencial), noProducido: r2(lb.brecha), diferido: r2(lb.diferido),
    tolerancia: r2(lb.tolerancia), metaProduccion: r2(lb.meta.produccion), metaDiferido: r2(lb.meta.diferido),
    eventos: lb.tramos.length,
    ...(equipo ? { equipo: equipo.equipo, campoEquipo: equipo.campoId, bblEquipo: r2(eq ?? 0) } : {}),
  }
}

/** Huella SHA-256 de las cifras, en hexadecimal. `crypto.subtle` solo existe
 *  en un contexto seguro (HTTPS o localhost): fuera de él se dice, en vez de
 *  dejar la exportación colgada. */
export async function huellaDe(c: CifrasInforme): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('Este navegador no calcula la huella SHA-256 fuera de una conexión segura (HTTPS o localhost): abra TRIM por HTTPS para exportar.')
  const h = await subtle.digest('SHA-256', new TextEncoder().encode(formaCanonica(c)))
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Si el libro del período se puede publicar, con la misma regla que la
 *  pantalla (`widgets/diferidos/publicacion.ts`): con días sin cierre como
 *  único motivo es provisional; con cualquier otro, bloqueado. */
export function estadoDelLibro(lb: Libro): EstadoInforme {
  if (lb.publicable) return 'publicable'
  return lb.motivos.every(m => m.codigo === 'en-curso') ? 'provisional' : 'bloqueado'
}

/** Lo que el servidor hace al registrar un informe: valida la consulta (lo
 *  que responde con 422), arma el libro con SU contexto y SU versión de la
 *  configuración, y devuelve las cifras, su huella y el estado del período.
 *  El folio, la fecha y quién lo emitió los pone después el registro. */
export async function registrarCifras(q: ConsultaInforme, ctx: Contexto, version: number): Promise<Pick<Informe, 'cifras' | 'huella' | 'estado' | 'version'>> {
  const desde = new Date(q.desde), hasta = new Date(q.hasta)
  if (!q.campos.length) throw new Error('El informe no tiene campos.')
  const ajeno = q.campos.find(c => !CAMPOS.some(x => x.id === c))
  if (ajeno) throw new Error(`«${ajeno}» no es un campo.`)
  if (!(desde.getTime() < hasta.getTime())) throw new Error('El período del informe no es válido: el fin tiene que ser después del inicio.')
  if (q.equipo && !q.campos.includes(q.equipo.campoId)) throw new Error('La ficha de un equipo va con el campo del equipo.')
  const lb = libro(q.campos, desde, hasta, ctx)
  const cifras = cifrasDe(lb, q.campos, version, q.equipo)
  return { cifras, huella: await huellaDe(cifras), estado: estadoDelLibro(lb), version }
}

/** La huella completa partida en grupos de cuatro, para leerla en voz alta o en papel. */
export const huellaLegible = (h: string) => h.match(/.{1,4}/g)!.join(' ')

// Los textos pasan por la misma regla de todo CSV del producto (neutraliza fórmulas); los números, no.
const celda = (v: string | number) =>
  typeof v === 'number' ? v.toLocaleString('es-CO', { useGrouping: false, maximumFractionDigits: 2 }) : textoCsv(v)
const fila = (xs: Array<string | number>) => xs.map(celda).join(';')
const hora = (d: Date) => new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 16).replace('T', ' ')

/** Los eventos del período, uno por fila, con el membrete arriba. Separado
 *  por punto y coma y con coma decimal: lo que abre bien una hoja de cálculo
 *  en español. */
export function csvDeLibro(lb: Libro, membrete: Array<[string, string]>): string {
  const cab = ['Campo', 'Pozo', 'Evento', 'Inicio del evento (hora Colombia)', 'Fin del evento (hora Colombia)', 'Horas dentro del período',
    'Causa', 'Equipo', 'Parte', 'Cómo se identificó', 'Barriles no producidos', 'Aproximado (frecuencia reducida)']
  const filas = [...lb.tramos].sort((a, b) => a.inicio.getTime() - b.inicio.getTime()).map(t => fila([
    // Las horas del evento son las del PLC, aunque el evento empiece antes del período o siga después.
    campoPorId(t.pozo.campoId).nombre, t.pozo.id, t.evento.id, hora(new Date(t.evento.inicio)), t.evento.fin ? hora(new Date(t.evento.fin)) : 'sigue abierto',
    Math.round(t.horas * 100) / 100, TIPO_CAUSA[t.causa.tipo], t.causa.equipo, t.causa.parte ? NOMBRE_PARTE[t.causa.parte] : '',
    COMO[t.causa.como], Math.round(t.bbl * 100) / 100, t.aproximado ? 'sí' : 'no',
  ]))
  const total = lb.tramos.reduce((a, t) => a + t.bbl, 0)
  const pie = [
    fila(['Total', '', '', '', '', '', '', '', '', '', Math.round(total * 100) / 100, '']),
    fila(['Rango de tolerancia', `${Math.round(Math.max(0, total - lb.tolerancia))} a ${Math.round(total + lb.tolerancia)} bbl`]),
  ]
  // La marca de orden de bytes (BOM) hace que la hoja de cálculo lea las tildes en UTF-8.
  return '﻿' + [...membrete.map(([k, v]) => fila([k, v])), '', fila(cab), ...filas, '', ...pie].join('\r\n')
}
