import { FUENTE } from './fuente'
import { perezoso } from '@/entities/insumos'
import { calendario, bandaDe, type Mes, type Banda } from '@/entities/libro'
import { origenPmo, pozosDe, type Pozo } from '@/entities/pozos'
import { METROLOGIA_CAMPO } from '@/entities/metrologia'
import { EQUIPOS, equipoEnCampo, type EquipoEnCampo } from '@/entities/equipos'
import { esBomba, perfilBomba, type PerfilBomba } from '@/entities/bombas'
import { catalogoDe, type Catalogo } from '@/entities/catalogo'
import { CAMPO_PLANTA, type PlantaCampo } from '@/entities/planta'
import { limitesDe, type LimiteTag } from '@/entities/limites'
import type { OrigenPmo } from '@/entities/insumos'

/** El CATÁLOGO: lo que el servidor sabe de cada campo y casi nunca cambia
 *  (el calendario de meses, los equipos registrados, el perfil de cada bomba,
 *  los catálogos de daños, cómo se mide la producción oficial, el registro de
 *  pozos y el esquema de planta). Es `GET /api/catalogo`, un solo pedido al
 *  arrancar: las pantallas lo leen sin esperar, en el demo y con el servidor.
 *
 *  En el demo lo arma el motor la primera vez que se pide cada campo; con la
 *  fuente http lo instala `servidor.ts` antes de pintar. Lo que cambia hora a
 *  hora (caudales, niveles, el estado de los equipos) NO está aquí: son
 *  consultas (`useCampoAhora`, `useEquipo`…). */

export interface MedicionOficial {
  /** Computador de flujo y origen del corte de agua; undefined si el registro no lo trae (hueco). */
  origen?: OrigenPmo
  /** Banda de la Res. 40236 (Fig. 10.2) o la demostrada por el operador. */
  banda: Banda
  /** °API del crudo y de dónde sale; undefined si el campo no tiene registro
   *  de metrología y `api: null` si lo tiene sin análisis: las dos son hueco,
   *  nunca 0 °API. */
  metrologia?: { api: number | null; apiFuente: string }
}

export interface CatalogoDeCampo {
  /** El perfil de cada bomba de la línea declarada en el campo. */
  perfilesBomba: PerfilBomba[]
  /** Cada equipo del catálogo como lo registró el campo (instrumentado o no). */
  registroEquipos: EquipoEnCampo[]
  /** El límite de cada tag del campo, por tag: banda normal y alarma con
   *  quién firma cada una. La única fuente de los dos números: el vigía y la
   *  salud los leen de aquí, y la procedencia del tag cita la misma banda. */
  limites: Record<string, LimiteTag>
  medicion: MedicionOficial
  /** El registro de pozos: levantamiento, controlador, alimentador y pruebas. */
  pozos: Pozo[]
  /** El catálogo de daños (ISO 14224) de cada equipo que lo tiene, por id. */
  catalogosDanos: Record<string, Catalogo>
  /** El esquema de planta registrado; undefined si el campo no tiene (hueco). */
  planta?: PlantaCampo
}

export interface DatosDeCatalogo {
  /** Los meses con producción fiscal en algún campo, del más viejo al más nuevo. */
  calendario: Mes[]
  /** Los ids del catálogo de equipos de superficie. */
  equipos: string[]
  /** Los que son máquinas de bombeo de la línea. */
  maquinasBomba: string[]
  /** Por id de campo. */
  campos: Record<string, CatalogoDeCampo>
}

/* ───────────── el demo: lo arma el motor, campo por campo ───────────── */

function campoDelMotor(campo: string): CatalogoDeCampo {
  const m = Object.hasOwn(METROLOGIA_CAMPO, campo) ? METROLOGIA_CAMPO[campo] : undefined
  const pozos = [...pozosDe(campo)]
  const catalogosDanos: Record<string, Catalogo> = {}
  for (const id of [...Object.keys(EQUIPOS), ...pozos.map(p => p.id)]) {
    const c = catalogoDe(campo, id)
    if (c) catalogosDanos[id] = c
  }
  return {
    perfilesBomba: Object.keys(EQUIPOS).filter(esBomba).flatMap(id => { const p = perfilBomba(id, campo); return p ? [p] : [] }),
    registroEquipos: Object.keys(EQUIPOS).flatMap(id => { const e = equipoEnCampo(id, campo); return e ? [e] : [] }),
    limites: limitesDe(campo),
    medicion: { origen: origenPmo(campo), banda: bandaDe(campo), metrologia: m ? { api: m.api, apiFuente: m.apiFuente } : undefined },
    pozos, catalogosDanos,
    planta: Object.hasOwn(CAMPO_PLANTA, campo) ? CAMPO_PLANTA[campo] : undefined,
  }
}

/* El motor arma el catálogo general una vez y el de cada campo la primera vez
   que se pide: es la respuesta del demo a `GET /api/catalogo`. */
const generalDelMotor = perezoso((): Omit<DatosDeCatalogo, 'campos'> =>
  ({ calendario: calendario(), equipos: Object.keys(EQUIPOS), maquinasBomba: Object.keys(EQUIPOS).filter(esBomba) }))
const camposDelMotor = new Map<string, CatalogoDeCampo>()
function campoDelMotorUnaVez(campo: string): CatalogoDeCampo {
  let c = camposDelMotor.get(campo)
  if (!c) camposDelMotor.set(campo, c = campoDelMotor(campo))
  return c
}

/** `GET /api/catalogo` (la respuesta del demo, con el motor): el catálogo
 *  general y el de cada campo pedido. */
export const pedirCatalogo = (campos: string[]): DatosDeCatalogo =>
  ({ ...generalDelMotor(), campos: Object.fromEntries(campos.map(c => [c, campoDelMotorUnaVez(c)])) })

let instalado: DatosDeCatalogo | undefined
/** Lo instala la fuente http con la respuesta de `GET /api/catalogo`. */
export function instalarCatalogo(c: DatosDeCatalogo): void { instalado = c }

const SIN_CATALOGO = 'El catálogo no está instalado: la fuente http lo trae al arrancar (servidor.ts).'

/** El catálogo general (sin los campos): el del servidor, o en el demo el del motor. */
function general(): Omit<DatosDeCatalogo, 'campos'> {
  if (instalado) return instalado
  if (FUENTE === 'http') throw new Error(SIN_CATALOGO)
  return generalDelMotor()
}

/** El catálogo de un campo. Un campo que el catálogo del servidor no trae es
 *  un error que se dice, no un campo vacío: vacío diría «no tiene bombas ni pozos». */
export function catalogoDelCampo(campo: string): CatalogoDeCampo {
  if (instalado) {
    if (!Object.hasOwn(instalado.campos, campo)) throw new Error(`El catálogo del servidor no trae el campo «${campo}».`)
    return instalado.campos[campo]!
  }
  if (FUENTE === 'http') throw new Error(SIN_CATALOGO)
  return campoDelMotorUnaVez(campo)
}

export const calendarioDelCatalogo = (): Mes[] => general().calendario
export const equiposDelCatalogo = (): string[] => general().equipos
export const maquinasDelCatalogo = (): string[] => general().maquinasBomba

/** El límite de un tag en su campo (banda normal y alarma), del catálogo; undefined si no está. */
export function limiteDelTag(campo: string, tag: string): LimiteTag | undefined {
  const l = catalogoDelCampo(campo).limites
  return Object.hasOwn(l, tag) ? l[tag] : undefined
}
