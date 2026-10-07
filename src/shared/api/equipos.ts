import { useMemo } from 'react'
import { useCtx } from './sesion'
import { useDato, useDatoSi, versionDe } from './consulta'
import { EQUIPO_HOY, EQUIPOS_HOY, HISTORIA_EQUIPO, FILAS_EQUIPOS, CONFIABILIDAD, FICHA_EQUIPO, BOMBAS } from './contrato'
import { pedirPrediccion } from './diferidos'
import { catalogoDelCampo, equiposDelCatalogo, maquinasDelCatalogo } from './catalogo'
import type { Campo } from '@/entities/tipos'
import { campoPorId } from '@/entities/campos'
import { EQUIPOS, equipoEnCampo, type EquipoEnCampo } from '@/entities/equipos'
import { equipoVivo, type EquipoVivo } from '@/entities/equipo-vivo'
import { esBomba, perfilBomba, paradasDe, type PerfilBomba } from '@/entities/bombas'
import { paradaMedida, veredicto, type ParadaMedida, type Veredicto, type Prediccion } from '@/entities/diferido'
import {
  diferidoDeEquipo, historialDeEquipo, eventosCargadosA, valorDeTramos, calendario,
  type HistorialEquipo, type EventoCargado,
} from '@/entities/libro'
import { pozoDe, pozosDe, estadoAhora } from '@/entities/pozos'
import { causaDeEvento, type Causa } from '@/entities/causa-senal'
import { senalesDe, type Senal } from '@/entities/vigia'
import { saludDePartes, type SaludParte } from '@/entities/salud'
import { flotaDe, type Familia } from '@/entities/flota'
import type { Catalogo } from '@/entities/catalogo'
import { perfilDe } from '@/entities/configuracion'
import { AHORA } from '@/entities/reloj'
import type { PlantaCampo } from '@/entities/planta'
import type { Contexto } from '@/entities/causa-senal'

const v = (ctx: Contexto) => String(versionDe(ctx))

/** Los equipos de superficie de cada campo y su historia. Cada función es un
 *  endpoint (ver la regla en diferidos.ts). Las listas van por LOTE (todos los
 *  equipos de los campos pedidos en una respuesta), nunca un pedido por equipo. */

/* ───────────────────────────── catálogo ───────────────────────────── */

/* El catálogo de máquinas de bombeo (modelo, tags, alarmas, primeras alarmas)
   y el perfil de cada bomba en cada campo son DATOS DE CATÁLOGO que entrega el
   backend: en el demo viven en `entities/bombas.ts` y `entities/equipos.ts`. La
   regla del motor no depende del id de una máquina: lo que cuenta es lo que
   el catálogo dice de ella. */

/** Los ids del catálogo de equipos de superficie (`GET /api/catalogo` → `equipos`). */
export const pedirCatalogoEquipos = (): string[] => equiposDelCatalogo()

/** Los ids de las máquinas de bombeo de la línea (`GET /api/catalogo` → `maquinasBomba`). */
export const pedirMaquinasBomba = (): string[] => maquinasDelCatalogo()
/** ¿Es una máquina de bombeo de la línea? Del mismo catálogo. */
export const esBombaDeLinea = (equipo: string): boolean => maquinasDelCatalogo().includes(equipo)

/** El perfil de cada bomba de la línea en el campo (papel, capacidad, pozos
 *  que mueve, tags), de `GET /api/catalogo` → `campos[campo].perfilesBomba`.
 *  Sin perfil, la bomba no está declarada en ese campo: no sale (hueco, nunca
 *  el perfil de otro campo). */
export const pedirPerfilesBomba = (campo: string): PerfilBomba[] => catalogoDelCampo(campo).perfilesBomba
/** El perfil de una bomba en un campo, de la misma respuesta. */
export const pedirPerfilBomba = (campo: string, equipo: string): PerfilBomba | undefined =>
  catalogoDelCampo(campo).perfilesBomba.find(p => p.equipo === equipo)

/** El catálogo de daños (partes y modos de ISO 14224) de ese equipo, de
 *  `GET /api/catalogo` → `campos[campo].catalogosDanos`; undefined si no tiene. */
export const pedirCatalogoDeDanos = (campo: string, equipo: string): Catalogo | undefined => {
  const c = catalogoDelCampo(campo).catalogosDanos
  return Object.hasOwn(c, equipo) ? c[equipo] : undefined
}

/** Cada equipo del catálogo en el campo, como lo registró ese campo
 *  (instrumentado o no), de `GET /api/catalogo` → `campos[campo].registroEquipos`.
 *  Sin estado de hoy: es para configurar, no para vigilar. */
export const pedirRegistroDeEquipos = (campo: string): EquipoEnCampo[] => catalogoDelCampo(campo).registroEquipos

/* ───────────────────────────── estado de hoy ───────────────────────────── */

/* El equipo de hoy se pide desde muchas filas (Paretos, planta, ficha): el
   motor lo calcula una vez por contexto y equipo. Un contexto nuevo es otra
   entrada; el viejo se libera solo. */
const HOY = new WeakMap<Contexto, Map<string, EquipoVivo | undefined>>()

/** El equipo como se ve hoy (del catálogo o un pozo), con el contexto de la
 *  sesión; undefined si no está en el campo. */
export function pedirEquipo(campo: string, equipo: string, ctx: Contexto): EquipoVivo | undefined {
  let m = HOY.get(ctx)
  if (!m) HOY.set(ctx, m = new Map())
  const k = `${campo}|${equipo}`
  if (!m.has(k)) m.set(k, equipoVivo(equipo, campo, ctx))
  return m.get(k)
}

/** `GET /api/vistas/equipos/:campo/:equipo` */
export function useEquipo(campo: string, equipo: string | null): EquipoVivo | undefined {
  const ctx = useCtx()
  return useDatoSi(EQUIPO_HOY, equipo === null ? null : { campo, equipo }, v(ctx), q => pedirEquipo(q.campo, q.equipo, ctx))
}

/** `GET /api/vistas/equipos-hoy?campos=` → todos los equipos de hoy de los
 *  campos (los del catálogo y los pozos), por campo. Un pedido por lote. */
export const pedirEquiposDeHoy = (campos: string[], ctx: Contexto): Record<string, EquipoVivo[]> =>
  Object.fromEntries(campos.map(c => [c, [...Object.keys(EQUIPOS), ...pozosDe(c).map(p => p.id)]
    .flatMap(id => { const e = pedirEquipo(c, id, ctx); return e ? [e] : [] })]))

/** Varios equipos de hoy sin un pedido por cada uno: se busca en la
 *  respuesta del lote de los campos. */
export function useEquiposDeHoy(campos: string[]): (equipo: string, campo: string) => EquipoVivo | undefined {
  const ctx = useCtx()
  const porCampo = useDato(EQUIPOS_HOY, { campos }, v(ctx), () => pedirEquiposDeHoy(campos, ctx))
  return useMemo(() => {
    const m = new Map(Object.entries(porCampo).flatMap(([c, es]) => es.map(e => [`${c}|${e.id}`, e] as const)))
    return (equipo: string, campo: string) => m.get(`${campo}|${equipo}`)
  }, [porCampo])
}

/* ───────────────────────────── historia ───────────────────────────── */

export interface HistoriaEquipo {
  /** Lo que se le cargó en toda la historia, evento por evento. */
  eventos: EventoCargado[]
  /** En una bomba de la línea: sus fallas por parte. */
  bomba?: HistorialEquipo
}

/** `GET /api/vistas/equipos/:campo/:equipo/historia` */
export const pedirHistoriaEquipo = (campo: string, equipo: string, ctx: Contexto): HistoriaEquipo => ({
  eventos: eventosCargadosA(campo, equipo, ctx),
  bomba: perfilBomba(equipo, campo) ? historialDeEquipo(campo, equipo, ctx) : undefined,
})
/** La historia de un equipo del catálogo; null: no se pide (un pozo, o nada abierto). */
export function useHistoriaEquipo(campo: string, equipo: string | null): HistoriaEquipo | undefined {
  const ctx = useCtx()
  return useDatoSi(HISTORIA_EQUIPO, equipo === null ? null : { campo, equipo }, v(ctx), q => pedirHistoriaEquipo(q.campo, q.equipo, ctx))
}

export interface FilaEquipo {
  eq: EquipoVivo
  campoId: string
  /** Máquina de bombeo de la línea: el foco del producto. */
  bomba: boolean
  /** Eventos que se le cargaron en toda la historia (pozos que paró, en eventos distintos). */
  eventos: number
  bblHistoria: number
  /** Bombas: fallas propias (las paradas que causó otro equipo no cuentan). */
  fallas?: number
  mtbfDias?: number
}

/** `GET /api/vistas/equipos?campos=` → los equipos de superficie instrumentados de
 *  los campos, con su historia. Una respuesta por lote, no una por equipo. */
export function pedirFilasEquipos(campos: string[], ctx: Contexto): FilaEquipo[] {
  const dias = (AHORA.getTime() - calendario()[0]!.desde) / 86_400_000
  return campos.flatMap(c => Object.keys(EQUIPOS).flatMap((id): FilaEquipo[] => {
    const eq = equipoVivo(id, c, ctx)
    if (!eq || !eq.instrumentado) return []
    const ev = eventosCargadosA(c, id, ctx)
    const h = perfilBomba(id, c) ? historialDeEquipo(c, id, ctx) : undefined
    const n = h ? h.fallas : ev.length
    return [{ eq, campoId: c, bomba: esBomba(id), eventos: ev.length, bblHistoria: ev.reduce((a, x) => a + x.bbl, 0),
      fallas: h?.fallas, mtbfDias: h ? h.mtbfDias : n >= 2 ? dias / n : undefined }]
  }))
}
export function useFilasEquipos(campos: string[]): FilaEquipo[] {
  const ctx = useCtx()
  return useDato(FILAS_EQUIPOS, { campos }, v(ctx), () => pedirFilasEquipos(campos, ctx))
}

export interface EquipoConfiable { campoId: string; equipo: string; familia: Familia; h: HistorialEquipo }

/** `GET /api/vistas/confiabilidad?campos=` → la flota de alto impacto de los campos
 *  (bombas con perfil y electrosumergibles) con la historia de fallas de cada
 *  equipo. Un pedido para todos: antes era uno por equipo. */
export const pedirConfiabilidad = (campos: string[], ctx: Contexto): EquipoConfiable[] =>
  campos.flatMap(c => flotaDe(c).map(({ equipo, familia }) => ({ campoId: c, equipo, familia, h: historialDeEquipo(c, equipo, ctx) })))
export function useConfiabilidad(campos: string[]): EquipoConfiable[] {
  const ctx = useCtx()
  return useDato(CONFIABILIDAD, { campos }, v(ctx), () => pedirConfiabilidad(campos, ctx))
}

/** Lo que el libro le carga a un equipo, sin los tramos: la respuesta lleva
 *  las cifras, no la historia evento por evento (esa es otro endpoint). */
const sinTramos = (x: { bbl: number; tolerancia: number; rango: [number, number]; eventos: number }) =>
  ({ bbl: x.bbl, tolerancia: x.tolerancia, rango: x.rango, eventos: x.eventos })

/* ───────────────────────────── ficha ejecutiva ───────────────────────────── */

export interface Barriles { bbl: number; tolerancia: number; rango: [number, number]; eventos: number
  /** Cada tramo con el precio que regía cuando pasó; undefined sin precio configurado. */
  usd?: number }

export interface FichaEquipo {
  eq: EquipoVivo
  /** Lo que se le carga en el período pedido, del libro. */
  periodo: Barriles
  /** Lo que se le carga en toda la historia, del libro: la misma cuenta que el Pareto. */
  historia: Barriles
  /** Desde cuándo hay historia. */
  desdeHistoria: Date
  /** Bomba o electrosumergible: sus fallas. */
  hist?: HistorialEquipo
  /** Los demás: cuántas veces se le cargó algo. */
  veces?: number
  prediccion?: Prediccion
  /** Un pozo que cerró otro equipo: quién y desde cuándo. */
  cerradoPor?: Causa
  desdeCierre?: Date
}

/** `GET /api/vistas/equipos/:campo/:equipo/ficha?desde=&hasta=` → lo que un
 *  directivo necesita de un equipo, con los mismos números del libro. */
export function pedirFichaEquipo(campo: string, equipo: string, desde: Date, hasta: Date, ctx: Contexto): FichaEquipo | undefined {
  const eq = equipoVivo(equipo, campo, ctx)
  if (!eq) return undefined
  const desdeHistoria = new Date(calendario()[0]!.desde)
  const barriles = (d: Date, h: Date): Barriles => {
    const x = diferidoDeEquipo(campo, equipo, d, h, ctx)
    return { ...sinTramos(x), usd: valorDeTramos(x.tramos, ctx) }
  }
  const perfil = perfilBomba(equipo, campo)
  const pozo = pozoDe(campo, equipo)
  const conHistoria = !!perfil || pozo?.levantamiento === 'electrosumergible'
  const hist = conHistoria ? historialDeEquipo(campo, equipo, ctx) : undefined
  const e = pozo ? estadoAhora(pozo) : undefined
  const cerradoPor = e?.evento ? causaDeEvento(e.evento, ctx) : undefined
  return {
    eq, periodo: barriles(desde, hasta), historia: barriles(desdeHistoria, AHORA), desdeHistoria, hist,
    veces: hist ? undefined : eventosCargadosA(campo, equipo, ctx).length,
    prediccion: perfil ? pedirPrediccion(perfil, ctx) : undefined,
    cerradoPor: cerradoPor && cerradoPor.equipo !== equipo ? cerradoPor : undefined,
    desdeCierre: e?.evento ? new Date(e.evento.inicio) : undefined,
  }
}
export function useFichaEquipo(campo: string, equipo: string, desde: Date, hasta: Date): FichaEquipo | undefined {
  const ctx = useCtx()
  return useDato(FICHA_EQUIPO, { campo, equipo, desde, hasta }, v(ctx), () => pedirFichaEquipo(campo, equipo, desde, hasta, ctx))
}

/* ───────────────────────────── bombas ───────────────────────────── */

/** Todo lo que la placa y el detalle necesitan de una bomba en un campo. */
export interface BombaVista {
  clave: string
  campo: Campo
  eq: EquipoEnCampo
  /** undefined: la bomba existe pero su papel en este campo no está declarado. */
  perfil?: PerfilBomba
  senales: Senal[]
  /** Si se para ahora, su historia de fallas y lo que cuesta cada una. */
  veredicto?: Veredicto
  /** La parada que sigue abierta, medida. */
  abierta?: ParadaMedida
  /** Lo que se le carga en el período, del libro. */
  periodo?: { bbl: number; tolerancia: number; rango: [number, number]; eventos: number }
  /** Salud por parte; con una parada abierta, la parte que la causó aparece como «falló». */
  partes: SaludParte[]
}

/** `GET /api/vistas/bombas?campos=&desde=&hasta=` → las bombas de la línea
 *  instrumentadas de los campos cuyo perfil firmado tiene bombas, de la más
 *  urgente a la menos. Un pedido por lote. */
export function pedirBombas(campos: string[], desde: Date, hasta: Date, ctx: Contexto): BombaVista[] {
  const out: BombaVista[] = []
  // Solo los campos cuyo perfil firmado tiene bombas de la línea: las demás no se vigilan.
  for (const campo of campos.filter(c => perfilDe(ctx.config, c).bombas).map(campoPorId)) {
    for (const id of Object.keys(EQUIPOS).filter(esBomba)) {
      const eq = equipoEnCampo(id, campo.id)
      if (!eq || !eq.instrumentado) continue
      const perfil = perfilBomba(id, campo.id)
      const ab = paradasDe(id, campo.id).find(e => !e.fin)
      const abierta = ab ? paradaMedida(ab, ctx) : undefined
      const senales = perfil ? senalesDe(perfil) : []
      const parteFallo = abierta && abierta.causa.equipo === id ? abierta.causa.parte : undefined
      out.push({
        clave: `${campo.id}:${id}`, campo, eq, perfil, senales,
        veredicto: perfil ? veredicto(perfil, ctx) : undefined,
        abierta,
        periodo: perfil ? sinTramos(diferidoDeEquipo(campo.id, id, desde, hasta, ctx)) : undefined,
        partes: perfil ? saludDePartes(perfil, senales, parteFallo) : [],
      })
    }
  }
  // Lo detenido primero, luego por prioridad (1 es la más alta), luego por lo
  // que se viene: la señal que antes cruza su límite.
  const atencion = (b: BombaVista) => (b.eq.severidad === 0 ? 9 : b.eq.severidad)
  return out.sort((a, b) =>
    Number(!!b.abierta) - Number(!!a.abierta)
    || atencion(a) - atencion(b)
    || (a.veredicto?.primera?.pronostico.horas ?? Infinity) - (b.veredicto?.primera?.pronostico.horas ?? Infinity))
}

export function useBombas(campos: string[], desde: Date, hasta: Date): BombaVista[] {
  const ctx = useCtx()
  return useDato(BOMBAS, { campos, desde, hasta }, v(ctx), () => pedirBombas(campos, desde, hasta, ctx))
}

/* ───────────────────────────── topología ───────────────────────────── */

/** El esquema de planta registrado de cada campo (trenes, conjuntos, puntos
 *  de medición), de `GET /api/catalogo` → `campos[campo].planta`. Es dato de
 *  CATÁLOGO del campo: lo edita el administrador (`POST /api/planta/cambios`,
 *  escrituras.ts). Un campo que no lo trae no tiene esquema: la pantalla
 *  muestra el hueco. */
export const pedirPlantas = (campos: string[]): Record<string, PlantaCampo> =>
  Object.fromEntries(campos.flatMap(c => { const pl = catalogoDelCampo(c).planta; return pl ? [[c, pl]] : [] }))
