/** El límite de cada tag: UNA fuente para la banda normal y para la alarma.
 *
 *  Antes la banda normal salía del texto del instrumento (`equipos.ts`), la
 *  alarma de otra tabla (el perfil de la bomba) y «De dónde sale este número»
 *  del registro de la cadena: tres fuentes que podían decir tres cosas
 *  (VI-2011 llegó a decir 3,9 en el panel y 4,5 en la procedencia). Aquí se
 *  juntan en un registro por tag, que es lo que el servidor entrega en
 *  `GET /api/catalogo` (`campos[campo].limites`, CONTRATO.md · «Límite de
 *  cada tag») y lo único que leen el vigía y la salud de las partes.
 *
 *  - Banda normal: la que declara el instrumento al conectarse (DBIRTH:
 *    `limite`, `bajo`, `alto`) y queda en el registro de tags; la procedencia
 *    la cita, no la define. Fuera de ella es atención (ISA-18.2).
 *  - Alarma: el punto de la base maestra de alarmas (ISA-18.2) de la máquina,
 *    con la norma o la hoja de datos de donde sale. Es contra lo que el vigía
 *    proyecta el cruce.
 */
import { EQUIPOS, equipoEnCampo } from './equipos'
import type { Alarma } from './bombas'
import { banda } from '@/shared/lib/formato'

export interface LimiteTag {
  tag: string
  /** El equipo al que pertenece el tag en ese campo. */
  equipo: string
  /** Como lo declara el instrumento: «< 3,9», «180 – 240». */
  texto: string
  /** Banda normal: [baja, alta], con ±Infinity del lado abierto. Undefined si
   *  el texto no es una banda (un estado discreto, «—»). */
  normal?: [number, number]
  /** Punto de alarma; undefined si la base de alarmas no lo tiene para ese tag. */
  alarma?: Alarma
  /** Quién firma cada número. */
  firma: { normal: string; alarma?: string }
}

/** Quién firma la banda normal: el registro de tags que ingeniería aprueba. */
export const FIRMA_NORMAL = 'Registro de tags: la declara el instrumento al conectarse (DBIRTH) y la aprueba ingeniería del cliente'
/** Quién firma la alarma: la base maestra de alarmas. */
export const FIRMA_ALARMA = 'Base maestra de alarmas (ISA-18.2): la firma ingeniería de confiabilidad del cliente'

const API_676_VIB: Alarma = {
  alta: 5.5, fuente: 'API 676, 4.ª ed. 2022, 6.11.2: < 5,5 mm/s RMS en campo, en caja de rodamientos',
}
const API_610_VIB: Alarma = {
  alta: 3.9, fuente: 'API 610, Tabla 8: 3,0 mm/s RMS en la región preferida y 3,9 en la permitida (hasta 3.600 rpm y 300 kW por etapa)',
}

/** La base maestra de alarmas de cada máquina, por tag. Es de la máquina (su
 *  norma y su hoja de datos), así que rige en cada campo donde está instalada;
 *  un tag que no está aquí no tiene alarma declarada (el vigía dice «sin
 *  límite», no proyecta contra la banda normal). */
const ALARMAS: Record<string, Record<string, Alarma>> = {
  'P-201B': {
    'VI-2011': API_610_VIB,
    'PI-2010': { baja: 8, fuente: 'Hoja de datos del fabricante: NPSH requerido más margen' },
    'TI-2011': { alta: 85, fuente: 'Hoja de datos del fabricante' },
    'LT-2012': { baja: 15, fuente: 'Hoja de datos del fabricante: nivel mínimo de succión' },
  },
  'MPP-301': {
    'VT-3013': API_676_VIB,
    'PDT-3011': { alta: 12, fuente: 'Hoja de datos del fabricante · API 676 B.2.1.4 pide la alarma' },
    'LT-3017': { baja: 50, fuente: 'Hoja de datos del sistema de sello (API 682)' },
    'SI-3016': { alta: 1650, fuente: 'Velocidad máxima continua de la hoja de datos (API 676 Anexo A)' },
    'TE-3013': { alta: 85, fuente: 'Hoja de datos del fabricante' },
    'TE-3012': { alta: 90, fuente: 'Hoja de datos del fabricante' },
  },
}

const propio = <T,>(o: Record<string, T> | undefined, k: string): T | undefined =>
  o && Object.hasOwn(o, k) ? o[k] : undefined

/* Por campo, una vez: el vigía lo consulta por cada señal de cada bomba. */
const POR_CAMPO = new Map<string, Record<string, LimiteTag>>()

/** El límite de cada tag instrumentado del campo, por tag. Un tag es único en
 *  su campo (el registro lo identifica como «campo:tag»); si dos equipos
 *  declararan el mismo, el registro está mal y se dice. */
export function limitesDe(campoId: string): Record<string, LimiteTag> {
  const ya = POR_CAMPO.get(campoId)
  if (ya) return ya
  const out: Record<string, LimiteTag> = {}
  for (const id of Object.keys(EQUIPOS)) {
    const eq = equipoEnCampo(id, campoId)
    if (!eq?.instrumentado) continue
    for (const d of eq.dispositivos) {
      if (Object.hasOwn(out, d.tag)) throw new Error(`El tag ${d.tag} de ${campoId} lo declaran ${out[d.tag]!.equipo} y ${id}: en un campo cada tag es de un solo equipo.`)
      const alarma = propio(propio(ALARMAS, id), d.tag)
      out[d.tag] = {
        tag: d.tag, equipo: id, texto: d.limite, normal: banda(d.limite), alarma,
        firma: { normal: FIRMA_NORMAL, ...(alarma ? { alarma: FIRMA_ALARMA } : {}) },
      }
    }
  }
  POR_CAMPO.set(campoId, out)
  return out
}

/** El límite de un tag en un campo; undefined si el tag no está registrado ahí. */
export const limiteDe = (campoId: string, tag: string): LimiteTag | undefined => propio(limitesDe(campoId), tag)
