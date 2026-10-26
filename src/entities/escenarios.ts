/** El ciclo con el que TRIM reduce paradas: ANTES, DURANTE y DESPUÉS.
 *
 *  No es otro simulador. Reusa el motor que ya existe (riesgo, colchón, orden
 *  de cierre, costo si falla hoy, evitable, historia de fallas) y lo empaqueta
 *  en **planes de acción** con barriles. Cada cifra lleva `simulado: true`:
 *  no entra al libro ni a un informe firmado. El LLM no produce estos números.
 *
 *  Contrato: `GET /api/vistas/ciclo?campos=&desde=&hasta=` y
 *  `POST /api/planes/:id` (aceptar / marcar ejecutado).
 */
import { riesgoAhora, prediccion, paradaMedida, type Versiones } from './diferido'
import { perfilBomba, esBomba, paradasDe } from './bombas'
import { historialDeEquipo, libro } from './libro'
import { precioEn } from './configuracion'
import { AHORA, horasEntre } from './reloj'
import { textoHoras } from './salud'
import type { ParteId } from './partes'
import type { Contexto } from './causa-senal'

export type FaseCiclo = 'antes' | 'durante' | 'despues'
export type EstadoPlan = 'propuesto' | 'aceptado' | 'ejecutado'

export const NOMBRE_FASE: Record<FaseCiclo, string> = {
  antes: 'Antes',
  durante: 'Durante',
  despues: 'Después',
}

export const LEMA_FASE: Record<FaseCiclo, string> = {
  antes: 'Intervenir antes de que pare: el tanque todavía aguanta.',
  durante: 'Recuperar más rápido: cada hora de parada son barriles.',
  despues: 'No repetir la misma falla: atacar la parte que más costó.',
}

/** Qué hay en el producto detrás de cada palanca (pitch comercial). */
export const PALANCA_PRODUCTO: Record<FaseCiclo, string> = {
  antes: 'Vigía, riesgo, si falla hoy, colchón del tanque, aciertos del vigía y WhatsApp con ventana.',
  durante: 'Identificar el daño, MTTR vs reparación, orden TRIM — motor TRIM, etiquetado simulado.',
  despues: 'Paretos por parte, MTBF y costo por falla, libro publicable — no repetir.',
}

export const ESTADO_PLAN: Record<EstadoPlan, string> = {
  propuesto: 'Propuesto',
  aceptado: 'Aceptado',
  ejecutado: 'Ejecutado',
}

export interface PlanAccion {
  id: string
  fase: FaseCiclo
  campoId: string
  equipo: string
  parte?: ParteId
  titulo: string
  /** Qué hacer, en una frase. Del catálogo de partes o de la regla del motor. */
  accion: string
  /** Barriles que se evitan o recuperan SI se ejecuta. Cero si el plan no
   *  ahorra crudo (identificar el daño) y entonces no entra al retorno. */
  bbl: number
  /** Valor de esos barriles con el precio neto que rige hoy en el campo.
   *  Ausente si ese campo no tiene precio firmado. */
  valorUsd?: number
  /** Ventana en horas (cruce de alarma, colchón, o horas que aún puede ahorrar
   *  contra su MTTR). Omitido si no aplica o si nunca llega (Infinity). */
  horas?: number
  supuestos: string[]
  simulado: true
  /** Lo pone la costura con lo guardado (`POST /api/planes/:id`). Ausente = propuesto. */
  estado?: EstadoPlan
}

export interface TramoCiclo {
  bbl: number
  valorUsd?: number
  equipos: number
  planes: PlanAccion[]
}

export interface CicloValor {
  campos: string[]
  desde: Date
  hasta: Date
  antes: TramoCiclo
  durante: TramoCiclo & { bblDia: number }
  despues: TramoCiclo
  /** Suma de los tres tramos: el retorno que se puede perseguir hoy. */
  retornoBbl: number
  valorUsd?: number
}

export interface DecisionPlan {
  id: string
  estado: EstadoPlan
  por: string
  porId: string
  fecha: string
  motivo: string
}

const finito = (h: number | undefined): h is number => h !== undefined && Number.isFinite(h) && h >= 0

function valorDe(bbl: number, campoId: string, ctx: Contexto): number | undefined {
  if (bbl <= 0) return undefined
  const p = precioEn(ctx.config, campoId, AHORA.getTime())
  return p !== undefined ? bbl * p : undefined
}

function plan(p: Omit<PlanAccion, 'simulado' | 'valorUsd'> & { ctx: Contexto }): PlanAccion {
  const { ctx, ...resto } = p
  const valorUsd = valorDe(resto.bbl, resto.campoId, ctx)
  return { ...resto, simulado: true, ...(valorUsd !== undefined ? { valorUsd } : {}) }
}

function tramoDe(planes: PlanAccion[]): TramoCiclo {
  const conBbl = planes.filter(p => p.bbl > 0)
  const bbl = conBbl.reduce((a, p) => a + p.bbl, 0)
  const usd = conBbl.reduce((a, p) => a + (p.valorUsd ?? 0), 0)
  const conPrecio = conBbl.some(p => p.valorUsd !== undefined)
  const equipos = new Set(planes.map(p => `${p.campoId}/${p.equipo}`)).size
  return { bbl, equipos, planes, ...(conPrecio ? { valorUsd: usd } : {}) }
}

/** ANTES: cada equipo de alto impacto que produce y tiene una parte que avisa.
 *  El barril del plan es lo que costaría que fallara HOY (`costoFalla`). */
function planesAntes(campoIds: string[], ctx: Contexto): PlanAccion[] {
  const out: PlanAccion[] = []
  for (const r of riesgoAhora(campoIds, ctx)) {
    if (r.estado !== 'en-riesgo' || !r.altoImpacto) continue
    const bbl = r.costoFalla ?? 0
    const horas = finito(r.horas) ? r.horas : undefined
    out.push(plan({
      ctx, id: `antes:${r.campoId}:${r.equipo}:${r.parte ?? '_'}`, fase: 'antes',
      campoId: r.campoId, equipo: r.equipo, parte: r.parte,
      titulo: r.parte ? `Intervenir ${r.parte} antes de que pare` : `Intervenir ${r.equipo} antes de que pare`,
      accion: r.accion ?? 'Programar la intervención de la parte que avisa; no esperar a que pare.',
      bbl, horas,
      supuestos: [
        bbl > 0
          ? `Si falla hoy costaría ${Math.round(bbl)} bbl (${r.mdtFuente ?? 'historia de fallas'}).`
          : 'Sin historia de fallas para estimar lo que costaría: el plan sigue, sin cifra.',
        ...(horas !== undefined ? [`La variable cruza su alarma en ${textoHoras(horas)}.`] : ['La variable ya está fuera de banda.']),
        ...(finito(r.colchonH) ? [`Si vuelve antes de ${textoHoras(r.colchonH, true)}, el tanque absorbe la parada y no cuesta crudo.`] : []),
        'Cifra simulada: no entra al libro.',
      ],
    }))
  }
  return out.sort((a, b) => b.bbl - a.bbl || (a.horas ?? Infinity) - (b.horas ?? Infinity))
}

/** DURANTE: cada equipo de alto impacto que YA está costando. Tres planes
 *  posibles, siempre con la misma cuenta:
 *   · mttr — volver antes de lo que suelen durar sus fallas: Q/24 × max(0, mdt − horas ya parada);
 *   · orden — cerrar el agua que falta en el orden TRIM: `evitable` de la parada abierta;
 *   · identificar — si ninguna señal explica la parte: no ahorra barriles, desbloquea el arranque. */
function planesDurante(campoIds: string[], ctx: Contexto, versiones: Versiones): PlanAccion[] {
  const out: PlanAccion[] = []
  for (const r of riesgoAhora(campoIds, ctx)) {
    if (r.estado !== 'perdiendo' || !r.altoImpacto) continue
    const horasParada = r.desde ? horasEntre(r.desde, AHORA) : 0
    const h = historialDeEquipo(r.campoId, r.equipo, ctx)
    const mdt = h.mdtH
    if (mdt !== undefined && r.bblDia > 0) {
      const ahorroH = Math.max(0, mdt - horasParada)
      const bbl = r.bblDia * ahorroH / 24
      out.push(plan({
        ctx, id: `durante:${r.campoId}:${r.equipo}:mttr`, fase: 'durante',
        campoId: r.campoId, equipo: r.equipo, parte: r.parte,
        titulo: `Volver antes de ${textoHoras(mdt, true)}`,
        accion: `Reparar y arrancar: cada hora que sigue parada cuesta ${Math.round(r.bblDia / 24)} bbl. Su promedio fuera es ${textoHoras(mdt, true)}.`,
        bbl, horas: ahorroH > 0 ? ahorroH : undefined,
        supuestos: [
          // C5 · Un nombre, una cifra (X4 §1.3.3): lo de un equipo lleva su nombre, nunca el del total del campo.
          `Por ${r.equipo} se dejan de producir ahora ${Math.round(r.bblDia)} bbl/d.`,
          `Lleva ${textoHoras(horasParada, true)} parado.`,
          `Sus fallas cerradas duran ${textoHoras(mdt, true)} en promedio (${h.fallasCerradas} ${h.fallasCerradas === 1 ? 'falla' : 'fallas'}).`,
          ahorroH > 0
            ? `Si arranca ahora contra ese promedio, evita ${Math.round(bbl)} bbl.`
            : 'Ya lleva más que su promedio fuera: el plan no inventa un ahorro.',
          'Cifra simulada: no entra al libro.',
        ],
      }))
    }
    if (esBomba(r.equipo)) {
      const abierta = paradasDe(r.equipo, r.campoId).find(e => !e.fin)
      const medida = abierta ? paradaMedida(abierta, ctx, versiones) : undefined
      if (medida && medida.evitable > 0) {
        out.push(plan({
          ctx, id: `durante:${r.campoId}:${r.equipo}:orden`, fase: 'durante',
          campoId: r.campoId, equipo: r.equipo, parte: r.parte,
          titulo: 'Cerrar el resto del agua en el orden TRIM',
          accion: 'Quitar el agua sin salida cerrando primero los pozos con menos crudo por barril de agua.',
          bbl: medida.evitable,
          supuestos: [
            `Con el orden de operación se habrían evitado ${Math.round(medida.evitable)} bbl en esta parada (misma agua, menos crudo).`,
            'Cifra simulada sobre lo ya ocurrido de la parada abierta; el resto se evita al aplicar el orden ahora.',
          ],
        }))
      }
      const p = perfilBomba(r.equipo, r.campoId)
      if (p && medida?.pide) {
        const pr = prediccion(p, ctx)
        const colchonH = pr.llenado && finito(pr.llenado.colchon.horas) ? pr.llenado.colchon.horas : undefined
        out.push(plan({
          ctx, id: `durante:${r.campoId}:${r.equipo}:identificar`, fase: 'durante',
          campoId: r.campoId, equipo: r.equipo, parte: r.parte,
          titulo: 'Identificar el daño: no arrancar hasta entonces',
          accion: 'Registrar la parte dañada (pantalla Identificar o WhatsApp). TRIM no escribe en el PLC; arrancar sin identificar queda como no conformidad.',
          bbl: 0, horas: colchonH,
          supuestos: [
            'Ninguna señal explica la parte: el libro no puede cargar el barril a un ítem mantenible.',
            ...(colchonH !== undefined ? [`El tanque aún aguanta ${textoHoras(colchonH, true)} con el agua que entra ahora.`] : []),
            'Este plan no ahorra barriles por sí: desbloquea el arranque.',
          ],
        }))
      }
    }
  }
  return out.sort((a, b) => b.bbl - a.bbl)
}

/** DESPUÉS: del período del libro. Un plan por el evitable de cada campo y
 *  uno por la parte que más costó (la palanca de mantenimiento). */
function planesDespues(campoIds: string[], desde: Date, hasta: Date, ctx: Contexto): PlanAccion[] {
  const out: PlanAccion[] = []
  for (const id of campoIds) {
    const lb = libro([id], desde, hasta, ctx)
    if (lb.evitablePorOrden > 0) {
      const bomba = lb.porEquipo.find(f => f.tipo === 'reinyeccion')
      out.push(plan({
        ctx, id: `despues:${id}:orden`, fase: 'despues',
        campoId: id, equipo: bomba?.equipo ?? 'reinyeccion',
        titulo: 'La próxima parada: cerrar en el orden TRIM',
        accion: 'Dejar el orden de cierre (menos crudo por barril de agua primero) como regla de turno, no como consejo.',
        bbl: lb.evitablePorOrden,
        supuestos: [
          `En este período se habrían evitado ${Math.round(lb.evitablePorOrden)} bbl cerrando la misma agua en el orden TRIM.`,
          'Cifra del libro (`evitablePorOrden`): simulada como plan para la próxima vez, no se resta de lo ya perdido.',
        ],
      }))
    }
    const palanca = lb.porParte.find(f => f.bbl > 0)
    if (palanca) {
      const eq = palanca.equipos[0]
      out.push(plan({
        ctx, id: `despues:${id}:${palanca.parte}:palanca`, fase: 'despues',
        campoId: id, equipo: eq?.equipo ?? palanca.parte, parte: palanca.parte,
        titulo: `Atacar ${palanca.parte}: es la parte que más costó`,
        accion: `Programar intervención de ${palanca.parte} (${palanca.fallas} ${palanca.fallas === 1 ? 'falla' : 'fallas'} · ${Math.round(palanca.bbl)} bbl en el período).`,
        bbl: palanca.bbl,
        supuestos: [
          `Pareto por parte del período: ${palanca.parte} lleva ${Math.round(palanca.bbl)} bbl.`,
          'No es un pronóstico: es lo que ya costó, para no repetirlo.',
        ],
      }))
    }
  }
  return out.sort((a, b) => b.bbl - a.bbl)
}

const versionesDe = (ctx: Contexto, versiones?: Versiones): Versiones =>
  versiones && versiones.length ? versiones : [{ fecha: '2000-01-01T00:00:00.000-05:00', config: ctx.config }]

/** El ciclo de valor del ámbito y período. `versiones` son las de la
 *  configuración firmada (el tanque y el respaldo de una parada abierta). */
export function cicloValor(
  campoIds: string[],
  desde: Date,
  hasta: Date,
  ctx: Contexto,
  versiones?: Versiones,
): CicloValor {
  const v = versionesDe(ctx, versiones)
  const antesP = planesAntes(campoIds, ctx)
  const duranteP = planesDurante(campoIds, ctx, v)
  const despuesP = planesDespues(campoIds, desde, hasta, ctx)
  const antes = tramoDe(antesP)
  const duranteBase = tramoDe(duranteP)
  const bblDia = riesgoAhora(campoIds, ctx).filter(r => r.estado === 'perdiendo' && r.altoImpacto)
    .reduce((a, r) => a + r.bblDia, 0)
  const durante = { ...duranteBase, bblDia }
  const despues = tramoDe(despuesP)
  const retornoBbl = antes.bbl + durante.bbl + despues.bbl
  const usd = [antes, durante, despues].some(t => t.valorUsd !== undefined)
    ? (antes.valorUsd ?? 0) + (durante.valorUsd ?? 0) + (despues.valorUsd ?? 0)
    : undefined
  return {
    campos: campoIds, desde, hasta, antes, durante, despues, retornoBbl,
    ...(usd !== undefined ? { valorUsd: usd } : {}),
  }
}

/** Aplica las decisiones guardadas sobre los planes del ciclo (la costura). */
export function conDecisiones(c: CicloValor, decisiones: Record<string, DecisionPlan>): CicloValor {
  const pone = (t: TramoCiclo): TramoCiclo => ({
    ...t,
    planes: t.planes.map(p => {
      const d = Object.hasOwn(decisiones, p.id) ? decisiones[p.id] : undefined
      return d ? { ...p, estado: d.estado } : p
    }),
  })
  const durante = pone(c.durante)
  return {
    ...c,
    antes: pone(c.antes),
    durante: { ...durante, bblDia: c.durante.bblDia },
    despues: pone(c.despues),
  }
}

/** Busca un plan por id en el ciclo (para la escritura: 404 si no está). */
export const planPorId = (c: CicloValor, id: string): PlanAccion | undefined =>
  [...c.antes.planes, ...c.durante.planes, ...c.despues.planes].find(p => p.id === id)
