/** C1 · La franja de condiciones (X2 §3.5, X5 §5.6): el resumen de alarmas que
 *  va arriba de toda vista, igual en los niveles 1, 2 y 3. Una cuenta por
 *  condición, de la más grave a la más leve, y «sin comunicación» al final.
 *
 *  La regla es del motor, no de la pantalla:
 *   · UNA condición por equipo (X2 F2: la misma marca para el mismo equipo en
 *     todas partes). Un equipo sale con la más grave de lo que el motor ya dice
 *     de él: su estado de hoy (`EquipoVivo.severidad`, la marca de Planta y de
 *     la ficha) y su fila de «qué se pierde y qué está en riesgo» (`Riesgo.prioridad`,
 *     la marca de Riesgo). MPP-301 de Morichal es aviso en su estado y atención
 *     en Riesgo: cuenta una vez, en atención.
 *   · El orden para escoger es el de X2 §4.4 (P1 §2.9): sin comunicación →
 *     interlock → 1 → 2 → 3. Lo normal no se cuenta.
 *   · «Sin comunicación» es lo que el motor sabe que no llega: el computador de
 *     flujo del punto de medición oficial sin el dato del último día completo
 *     (`equipoVivo` lo trae en «sin señal»). La vigencia de cada tag del PLC es
 *     un pedido al motor (X2 §7): hasta que exista, ningún otro equipo se cuenta
 *     aquí. Una lectura por campaña sin dato (la termografía) es gris, no morado;
 *     las señales de un equipo parado van en gris y sin marca propia (X2 B9).
 *   · «Interlock» pide saber que la protección paró el equipo (`Config.protecciones`
 *     o el lazo de seguridad, X2 §4.2). El motor todavía no lo registra: TRIM no
 *     inventa un interlock, y la cuenta queda en cero hasta que lo traiga.
 *  Cada cuenta es el largo de su lista: la pantalla abre la lista desde la cuenta. */
import type { Contexto } from './causa-senal'
import type { Severidad } from './tipos'
import { EQUIPOS } from './equipos'
import { pozosDe } from './pozos'
import { equipoVivo, type EquipoVivo } from './equipo-vivo'
import { riesgoAhora, type Riesgo } from './diferido'

export type CondicionFranja = 'interlock' | 'alarma' | 'atencion' | 'aviso' | 'sin-comunicacion'

/** De la más grave a la más leve; «sin comunicación» al final y aparte (no es una prioridad). */
export const ORDEN_FRANJA: readonly CondicionFranja[] = ['interlock', 'alarma', 'atencion', 'aviso', 'sin-comunicacion']

export interface EquipoEnFranja {
  campoId: string
  equipo: string
  /** «Bomba multietapa de transferencia de agua», «Pozo LC-21 · electrosumergible». */
  nombre: string
  condicion: CondicionFranja
  /** Cómo está, dicho por el motor: «detenido», «en marcha · degradado». */
  estado: string
  /** Lo que ya deja de producir, bbl/d, si el motor lo calcula (Riesgo, «perdiendo»). */
  bblDia?: number
}

export interface Franja {
  cuentas: Record<CondicionFranja, number>
  /** Un renglón por equipo, en el orden de la franja y, dentro de cada
   *  condición, primero lo que más deja de producir. */
  equipos: EquipoEnFranja[]
}

/** Lo que entra por campo: sus equipos de hoy (catálogo y pozos) y sus filas de Riesgo. */
export interface EntradaFranja { campoId: string; equipos: readonly EquipoVivo[]; riesgo: readonly Riesgo[] }

const DE_PRIORIDAD: Record<Exclude<Severidad, 0>, CondicionFranja> = { 1: 'alarma', 2: 'atencion', 3: 'aviso' }

/** La prioridad más urgente de dos (1 > 2 > 3 > normal). */
const peor = (a: Severidad, b: Severidad): Severidad => (a === 0 ? b : b === 0 ? a : (Math.min(a, b) as Severidad))

/** ¿El equipo es el punto de medición oficial y su computador de flujo no trae el dato? */
const sinComunicacion = (e: EquipoVivo) =>
  !!e.fiscal && e.instrumentado && e.dispositivos.some(d => d.tag === e.fiscal && d.estado === 'sin señal')

/** La franja con lo que ya llegó de los campos: la misma regla en el servidor y en la costura. */
export function franjaDe(entradas: readonly EntradaFranja[]): Franja {
  const equipos: EquipoEnFranja[] = []
  for (const { campoId, equipos: vivos, riesgo } of entradas) {
    const porId = new Map(vivos.map(e => [e.id, e]))
    const ids = [...new Set([...vivos.map(e => e.id), ...riesgo.map(r => r.equipo)])]
    for (const id of ids) {
      const e = porId.get(id)
      const filas = riesgo.filter(r => r.equipo === id)
      const perdiendo = filas.filter(r => r.estado === 'perdiendo').reduce((a, r) => a + r.bblDia, 0)
      let condicion: CondicionFranja | undefined
      if (e && sinComunicacion(e)) condicion = 'sin-comunicacion'
      else {
        const s = filas.reduce<Severidad>((a, r) => peor(a, r.prioridad), e?.instrumentado ? e.severidad : 0)
        if (s !== 0) condicion = DE_PRIORIDAD[s]
      }
      if (!condicion) continue
      equipos.push({
        campoId, equipo: id, nombre: e?.nombre ?? id, condicion,
        estado: condicion === 'sin-comunicacion' ? 'sin el dato del último día completo' : e?.estado ?? filas[0]?.motivo ?? '',
        ...(perdiendo > 0 ? { bblDia: perdiendo } : {}),
      })
    }
  }
  const orden = new Map(entradas.map((x, i) => [x.campoId, i]))
  equipos.sort((a, b) => ORDEN_FRANJA.indexOf(a.condicion) - ORDEN_FRANJA.indexOf(b.condicion)
    || (b.bblDia ?? 0) - (a.bblDia ?? 0) || (orden.get(a.campoId) ?? 0) - (orden.get(b.campoId) ?? 0) || a.equipo.localeCompare(b.equipo))
  const cuentas = Object.fromEntries(ORDEN_FRANJA.map(c => [c, equipos.filter(e => e.condicion === c).length])) as Record<CondicionFranja, number>
  return { cuentas, equipos }
}

/** Caché por contexto y campo: el riel, la cabecera y cada pantalla piden la misma. */
const CACHE = new WeakMap<Contexto, Map<string, EntradaFranja>>()
function entradaDe(campoId: string, ctx: Contexto): EntradaFranja {
  let m = CACHE.get(ctx)
  if (!m) CACHE.set(ctx, m = new Map())
  let x = m.get(campoId)
  if (!x) {
    const ids = [...Object.keys(EQUIPOS), ...pozosDe(campoId).map(p => p.id)]
    x = { campoId, equipos: ids.flatMap(id => { const e = equipoVivo(id, campoId, ctx); return e ? [e] : [] }), riesgo: riesgoAhora([campoId], ctx) }
    m.set(campoId, x)
  }
  return x
}

/** La franja de uno o varios campos, ahora. Con varios («Todos mis campos»),
 *  cada equipo cuenta en su campo: la P-201B de La Ceiba y la de Morichal son dos. */
export const franja = (campoIds: readonly string[], ctx: Contexto): Franja =>
  franjaDe(campoIds.map(c => entradaDe(c, ctx)))
