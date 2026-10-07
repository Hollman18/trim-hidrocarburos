/** El catálogo de daños: con qué palabras se registra una falla, por clase de
 *  equipo. Son los niveles de ISO 14224 y su lugar en los catálogos de SAP PM
 *  (el perfil de catálogo de la clase de equipo):
 *
 *   · parte       ítem mantenible (ISO 14224, nivel 8)   SAP: parte del objeto (catálogo B)
 *   · modo        modo de falla (Table B.6)               SAP: daño (catálogo C)
 *   · mecanismo   mecanismo de falla (Table B.2)          SAP: daño o causa, según el perfil
 *   · causa raíz  causa de la falla (Table B.3)           SAP: causa (catálogo 5)
 *
 *  La parte y el modo («qué vio») los dice quien abrió el equipo, en dos
 *  toques; el mecanismo y la causa raíz los completa confiabilidad, que es
 *  quien hace el análisis. Es librería del producto: no se escribe por cliente.
 *  Los códigos de SAP del cliente se asocian a estos en la implementación.
 */
import { MECANISMOS, modo as modoIso, type Modo, type Mecanismo } from './iso14224'
import { partesDe, type Parte, type ParteId } from './partes'
import { perfilBomba, CLASE_ISO, type Papel } from './bombas'
import { pozoDe } from './pozos'

/** La clase del catálogo de daños. No es la clase ISO 14224 del registro de
 *  ingeniería (`bomba-centrifuga`, `bomba-electrosumergible`…): esa dice cómo
 *  es la máquina; esta, qué partes y modos se ofrecen. `claseDeCatalogo` hace
 *  el paso de una a otra. */
export type ClaseCatalogo = 'bomba-inyeccion' | 'bomba-multifasica' | 'bomba-electrosumergible'

export const NOMBRE_CLASE_EQUIPO: Record<ClaseCatalogo, string> = {
  'bomba-inyeccion': 'Bomba de reinyección', 'bomba-multifasica': 'Bomba multifásica', 'bomba-electrosumergible': 'Electrosumergible',
}

export interface Catalogo {
  clase: ClaseCatalogo
  partes: Parte[]
}

/** Las partes de cada clase del catálogo. */
const PARTES_DE_CLASE: Record<ClaseCatalogo, Parte[]> = {
  'bomba-inyeccion': partesDe('inyeccion'), 'bomba-multifasica': partesDe('multifasica'), 'bomba-electrosumergible': partesDe('electrosumergible'),
}

/** El catálogo del equipo: bomba de la línea (por su clase ISO 14224 y su
 *  papel, con la misma tabla que usa el backend: `claseDeCatalogo`) o pozo con
 *  electrosumergible. Una bomba de una clase sin catálogo (reciprocante) o un
 *  pozo sin electrosumergible no tienen partes que registrar: su parada se
 *  explica con las causas de pozo o queda sin parte. */
export function catalogoDe(campoId: string, equipo: string): Catalogo | undefined {
  const bomba = perfilBomba(equipo, campoId)
  const clase = bomba ? claseDeCatalogo(CLASE_ISO[bomba.tecnologia], bomba.papel)
    : pozoDe(campoId, equipo)?.levantamiento === 'electrosumergible' ? claseDeCatalogo('bomba-electrosumergible') : undefined
  return clase && { clase, partes: PARTES_DE_CLASE[clase] }
}

/** De la clase ISO 14224 del registro (`GET …/tags/:tag/procedencia` →
 *  `claseEquipo`) y el papel de la bomba en la línea, al catálogo de daños. Es
 *  la tabla que el backend usa para escoger catálogo sin la lista fija de
 *  máquinas del front:
 *   · bomba-centrifuga de disposición, reinyección o recobro → bomba-inyeccion
 *   · bomba-centrifuga de transporte, bomba-tornillo o bomba-multifasica → bomba-multifasica
 *   · bomba-electrosumergible → bomba-electrosumergible
 *  Otra clase no tiene catálogo de partes: undefined (se explica con las causas de pozo o queda sin parte). */
export function claseDeCatalogo(claseIso: string, papel?: Papel): ClaseCatalogo | undefined {
  if (claseIso === 'bomba-electrosumergible') return 'bomba-electrosumergible'
  if (claseIso === 'bomba-tornillo' || claseIso === 'bomba-multifasica') return 'bomba-multifasica'
  if (claseIso === 'bomba-centrifuga') return papel === 'transporte' ? 'bomba-multifasica' : 'bomba-inyeccion'
  return undefined
}

/** El modo «Otro» de la norma: siempre al final, para lo que no encaja. */
const OTRO = modoIso('OTH')!

/** Lo que se puede ver de una parte: sus modos de falla y «otro». */
export function modosDeParte(p: Parte): Modo[] {
  return [...p.modos.map(c => modoIso(c)).filter((m): m is Modo => !!m && m.codigo !== 'OTH'), OTRO]
}

/** Cómo lo dice quien lo vio: el modo de la norma en palabras de campo. */
export const MODO_EN_CAMPO: Record<string, string> = {
  UST: 'Se disparó sin daño a la vista', FTS: 'No arrancó', ELP: 'Fuga hacia afuera', ELU: 'Fuga de aceite o agua de servicio',
  INL: 'Fuga interna', VIB: 'Vibración', OHE: 'Recalentada', LOO: 'Bajó el caudal', HIO: 'Entregó de más',
  NOI: 'Ruido', PDE: 'Presión o corriente fuera de rango', PLU: 'Tapada', BRD: 'Algo se rompió',
  AIR: 'Un instrumento leía mal', ERO: 'Salida errática', SER: 'Problema menor', STD: 'Daño en la estructura',
  STP: 'No paró cuando se pidió', OTH: 'Otra cosa',
}

/** Donde la parte cambia cómo se dice: en el aislamiento, romperse es quemarse o dar a tierra. */
const MODO_DE_PARTE: Partial<Record<ParteId, Record<string, string>>> = {
  aislamiento: { BRD: 'Se quemó o dio a tierra' },
}

export const nombreModo = (codigo: string, parte?: ParteId) =>
  (parte && MODO_DE_PARTE[parte]?.[codigo]) ?? MODO_EN_CAMPO[codigo] ?? modoIso(codigo)?.nombre ?? codigo

/** «Otro»: lo que vio no está en la lista y hay que escribirlo. */
export const MODO_OTRO = 'OTH'

/** El mecanismo con que suele empezar el análisis de lo que se vio. Es un punto
 *  de partida en el formulario, no una respuesta: confiabilidad lo cambia. */
export const MECANISMO_SUGERIDO: Record<string, string> = {
  ELP: '1.1', ELU: '1.1', INL: '1.1', VIB: '1.2', NOI: '1.3', OHE: '2.7', LOO: '2.4', BRD: '2.5', PLU: '5.1', PDE: '3.4', AIR: '3.3', STD: '1.4',
}

/** Los mecanismos de la norma, por familia (para el análisis de confiabilidad). */
export const MECANISMOS_POR_FAMILIA: Array<{ familia: string; mecanismos: Mecanismo[] }> = [
  ['1', 'Mecánico'], ['2', 'Material'], ['3', 'Instrumento'], ['4', 'Eléctrico'], ['5', 'Influencia externa'], ['6', 'Misceláneo'],
].map(([n, familia]) => ({ familia: familia!, mecanismos: MECANISMOS.filter(m => m.codigo.startsWith(`${n}.`)) }))

/** El análisis que completa confiabilidad sobre una falla declarada. */
export interface Analisis {
  /** Código de ISO 14224 Table B.2. */
  mecanismo: string
  /** Código de ISO 14224 Table B.3 (primer nivel). */
  causaRaiz: string
  nota?: string
  por: string
  hora: string
}
