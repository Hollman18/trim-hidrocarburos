/** EL DILUYENTE (Fase 2 de docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md).
 *
 *  Los crudos pesados de Llanos se diluyen con nafta para poder bombearlos. Si el
 *  punto de medición oficial mide la MEZCLA y el libro la toma como crudo, el
 *  factor de asignación sube por la nafta y el potencial y cada diferido quedan
 *  inflados en la misma proporción, con la identidad del libro cuadrando: con 22 %
 *  de nafta, un evento de 100 bbl se cobra 121 (investigación 20, §8.3). Con ≈10 %
 *  el factor queda dentro de la banda de ±15 % y nadie lo ve.
 *
 *  Por eso, en un campo que diluye, el fiscal se lleva a **crudo neto de nafta**
 *  (Res. MME 40236/2022, art. 25: el diluyente se cuantifica en cada adición y se
 *  descuenta con el encogimiento de la mezcla de API MPMS 12.3):
 *
 *    crudo neto = mezcla ÷ (1 − encogimiento) − nafta
 *
 *  Es la convención proporcional (cada componente se encoge lo mismo). El
 *  encogimiento es el que el operador validó en laboratorio, una cifra por campo:
 *  el que cambia porque para un pozo liviano vale centésimas de barril (20, §8.3,
 *  paso 7) y no se modela.
 *
 *  Dónde se inyecta cambia qué se descuenta (20, §6.3):
 *  - **en planta**: la prueba de pozo mide crudo solo; el fiscal, la mezcla.
 *  - **en fondo de pozo**: la prueba mide crudo + la nafta de ese pozo, y el
 *    fiscal la mezcla: se descuentan las dos.
 *  - **en el oleoducto**: la mezcla ocurre después del punto de medición oficial:
 *    nada cambia.
 *
 *  Sin el dato de nafta de un día, ese día no es una cifra: el libro lo marca «no
 *  publicable» con su motivo (`sin-nafta`). Nada de esto toca a un campo que no
 *  diluye: sus números son los de antes.
 *
 *  El encogimiento no es diferido ni perdido: es un ajuste de volumen (20, §8.4).
 *
 *  Contrato: `origen.diluyente` y `meses[].nafta` de `GET /api/campos/:campo/produccion-diaria`;
 *  `pruebas[].diluyenteBpd` de `GET /api/campos/:campo/pozos` (CONTRATO.md). */
import { origenPmo, type Prueba } from './pozos'

export type EsquemaDiluyente = 'planta' | 'fondo' | 'oleoducto'
export const NOMBRE_ESQUEMA: Record<EsquemaDiluyente, string> = {
  planta: 'en planta', fondo: 'en fondo de pozo', oleoducto: 'en el oleoducto',
}

/** Cómo diluye un campo: del registro del punto de medición oficial. */
export interface Diluyente {
  esquema: EsquemaDiluyente
  /** Encogimiento de la mezcla crudo–nafta, fracción (0,00458 es 0,458 %): el de
   *  la fórmula que el operador validó en laboratorio (art. 25). */
  encogimiento: number
  /** De dónde sale el encogimiento. */
  fuente: string
  /** El medidor de la nafta (el tag del caudal de diluyente). */
  medidor: string
}

/* Del registro del punto de medición, que no cambia en la sesión: una vez por
   campo (el libro lo pide por pozo y por día). */
const DILUYENTE = new Map<string, Diluyente | undefined>()
/** Cómo diluye un campo; `undefined` si no diluye. */
export function diluyenteDe(campoId: string): Diluyente | undefined {
  if (!DILUYENTE.has(campoId)) DILUYENTE.set(campoId, origenPmo(campoId)?.diluyente)
  return DILUYENTE.get(campoId)
}

/** ¿El punto de medición oficial mide la mezcla? En planta y en fondo de pozo, sí;
 *  sin diluyente o diluido en el oleoducto, mide crudo solo. */
export const mideMezcla = (d: Diluyente | undefined): d is Diluyente => d?.esquema === 'planta' || d?.esquema === 'fondo'

/** El crudo neto de nafta de un día: la mezcla que midió el punto de medición
 *  oficial, sin el encogimiento, menos la nafta que se le agregó. */
export const crudoNeto = (mezcla: number, nafta: number, d: Diluyente): number => mezcla / (1 - d.encogimiento) - nafta

/** El crudo de una prueba de pozo, neto de nafta. En fondo de pozo, el separador
 *  midió el crudo con la nafta que se le inyectaba; `undefined` si la prueba no
 *  trae esa nafta (no se sabe cuánto es crudo). En los demás esquemas, la prueba
 *  es de crudo solo. */
export function crudoDePrueba(p: Prueba, d: Diluyente | undefined): number | undefined {
  if (d?.esquema !== 'fondo') return p.crudoBpd
  return typeof p.diluyenteBpd === 'number' && Number.isFinite(p.diluyenteBpd) ? Math.max(0, p.crudoBpd - p.diluyenteBpd) : undefined
}
