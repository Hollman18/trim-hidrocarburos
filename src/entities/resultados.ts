/** RESULTADOS (C5 · X4 §4.8, §3.6, §3.7 y §4.4 regla 2; X5 §5.1, §5.2 y §5.4).
 *
 *  El inicio de la puerta Resultados: «¿Está bajando?». Arriba, una cifra con su
 *  frase: el diferido del período contra el máximo firmado. Debajo, la producción
 *  contra la meta y el cierre proyectado; antes → con TRIM por tramo; el diferido
 *  mes a mes (por equipo o por dónde se trabó); el mantenimiento proactivo; y el
 *  retorno posible del ciclo, simulado, con su palabra y nunca como cifra grande.
 *  El período vive aquí (X4 §3.1, regla 8).
 *
 *  No calcula nada nuevo: junta lo que el motor ya da.
 *  - La planta viva (`plantaViva`, momento «después»): el diferido del período, su
 *    rango y su nota, la producción por día contra la meta, los 13 meses contra el
 *    máximo, el diferido por equipo, «¿está bajando?» por tramo y lo que se puede
 *    mover por momento. Las mismas cifras que el gerente ve en La planta viva.
 *  - El libro (`libro`, `serieMensual`) y lo perdido por tramo cada mes (`repartoPorMes`).
 *  - El estado de cada campo ahora (`estadoCampo`), para el cierre proyectado.
 *  - Las órdenes de SAP (`horasPorClase`), para el mantenimiento proactivo.
 *  - Los tres relojes y el registro del vigía, que la costura ya calcula para
 *    Confiabilidad (`pedirRelojes`, `pedirPredicciones`) y entran hechos.
 *
 *  UN NOMBRE, UNA CIFRA (X4 §1.3.3 y §3.1 regla 4; pedido 3 de §4.11). Cada rótulo
 *  tiene una definición en todo el producto (`NOMBRE_CIFRA`, `cifrasDeUnNombre`):
 *  - «Se deja de producir ahora» es siempre el total del campo (o de los campos);
 *    lo de las bombas de la línea se llama «por bombas paradas».
 *  - «Lo que dan los pozos» es lo de sus pruebas (la tubería); con el factor de
 *    asignación del mes es el «potencial del libro». Dos preguntas, dos nombres.
 *  - «Antes» es un conteo: los equipos que avisan (todos, uno por equipo).
 *  - «Exposición si fallan hoy» es la suma de lo que costaría cada uno de esos
 *    equipos si fallara hoy; el retorno del ciclo es otra cifra, simulada, con otro nombre.
 *
 *  REGLAS QUE NO SE ROMPEN (verificar-libro.mjs, sección C5):
 *  - La cifra grande = el diferido del libro = «Este mes» y «Después» de La planta viva.
 *  - Lo simulado nunca es la cifra grande; diferido no es pérdida y nunca se suman.
 *  - Cada rol ve lo suyo (`secciones`), en el orden de su pregunta.
 *  - D7: menos de 300 ms; se guarda en memoria por contexto, historial, lo guardado,
 *    rol, campos y período. */
import type { Severidad } from './tipos'
import type { Contexto, TipoCausa } from './causa-senal'
import type { ChokeAnh, ChokeOSinAsignar, Historial } from './choke'
import { CHOKES_Y_SIN_ASIGNAR } from './choke'
import { libro, conMeta, textoSinMeta, calendario, type Libro } from './libro'
import { riesgoAhora, estadoCampo, type Riesgo } from './diferido'
import { repartoPorMes, type OpcionesReparto } from './choke-reparto'
import { horasPorClase, type OrdenSap } from './sap'
import { plantaViva, FAMILIA, PALABRA_PRIORIDAD, MOMENTOS, NOMBRE_MOMENTO, LEMA_MOMENTO, type Momento, type MesDiferido, type FlechaTrim, type FilaEquipoDiferido } from './planta-viva'
import { campoPorId } from './campos'
import { PUESTA_EN_MARCHA } from './configuracion'
import { sumarMeses } from './plan'
import { AHORA, fechaCorta } from './reloj'
import { diaIso } from '@/shared/lib/formato'

/* ───────────────────────── un nombre, una cifra ───────────────────────── */

/** Los rótulos que tienen UNA definición en todo el producto (X4 §1.3.3). Si cambia
 *  el alcance, cambia el rótulo: nunca dos cifras con el mismo nombre. */
export const NOMBRE_CIFRA = {
  /** El total del campo (o de los campos), bbl/d: todas las causas, también lo sin identificar. */
  ahora: 'Se deja de producir ahora',
  /** Solo lo que cierran las bombas de la línea paradas (reinyección y multifásicas), bbl/d. */
  porBombas: 'por bombas paradas',
  /** Lo que dan los pozos según sus pruebas, bbl/d (la tubería, el tramo de los pozos). */
  pozos: 'Lo que dan los pozos',
  /** Las pruebas por el factor de asignación del mes, bbl/d: lo que usa el libro para valorar. */
  potencial: 'Potencial del libro',
  /** Antes: cuántos equipos avisan (todos los que están en riesgo, uno por equipo). */
  avisan: 'Equipos que avisan',
  /** La suma de lo que costaría cada equipo que avisa si fallara hoy, bbl (estimado). */
  exposicion: 'Exposición si fallan hoy',
  /** Antes + Durante + Después, simulado: solo en Resultados. */
  retorno: 'Retorno posible del ciclo',
} as const

/** Las bombas de la línea: las que «por bombas paradas» cuenta (las de la pantalla Bombas). */
const BOMBAS_DE_LA_LINEA: readonly TipoCausa[] = ['reinyeccion', 'transporte']

export interface CifrasDeUnNombre {
  /** «Se deja de producir ahora», bbl/d: el total de los campos (Σ de `estadoCampo`). */
  ahoraBpd: number
  /** «por bombas paradas», bbl/d: la parte de las bombas de la línea. */
  porBombasBpd: number
  /** «Equipos que avisan»: el conteo de Antes. */
  avisan: number
  /** El que avisa más cerca (ya pasó el límite primero, luego el que menos horas tiene). */
  primero: { campoId: string; equipo: string; horas: number | null } | null
  /** «Exposición si fallan hoy», bbl: Σ `costoFalla` de los que avisan y la tienen. */
  exposicionBbl: number
  /** Cuántos de los que avisan no tienen esa cifra (servicios del campo o sin historia). */
  sinExposicion: number
}

/** Las cifras que llevan un nombre único, con UNA regla para todas las pantallas: el
 *  riesgo de ahora (`riesgoAhora`) y el estado de cada campo (`estadoCampo`). */
export function cifrasDeUnNombre(riesgo: readonly Riesgo[], estados: ReadonlyArray<{ perdiendoBpd: number }>): CifrasDeUnNombre {
  const perdiendo = riesgo.filter(r => r.estado === 'perdiendo')
  const avisan = riesgo.filter(r => r.estado === 'en-riesgo')
    .sort((a, b) => (a.horas === undefined ? -1 : a.horas) - (b.horas === undefined ? -1 : b.horas))
  const p = avisan[0]
  return {
    ahoraBpd: estados.reduce((a, e) => a + e.perdiendoBpd, 0),
    porBombasBpd: perdiendo.filter(r => BOMBAS_DE_LA_LINEA.includes(r.tipo)).reduce((a, r) => a + r.bblDia, 0),
    avisan: avisan.length,
    primero: p ? { campoId: p.campoId, equipo: p.equipo, horas: p.horas ?? null } : null,
    exposicionBbl: avisan.reduce((a, r) => a + (r.costoFalla ?? 0), 0),
    sinExposicion: avisan.filter(r => r.costoFalla === undefined).length,
  }
}

/* ───────────────────────────── la forma ───────────────────────────── */

/** `GET /api/vistas/resultados?rol=&campos=&desde=&hasta=`. */
export interface ConsultaResultados { rol: string; campos: string[]; desde: Date; hasta: Date }

/** Lo que entra hecho desde la costura: lo mismo que ya calcula para Confiabilidad y Hoy. */
export interface OpcionesResultados extends OpcionesReparto {
  /** Las órdenes de SAP de los campos (el mantenimiento proactivo). */
  ordenes?: OrdenSap[]
  /** Los tres relojes de las fallas cerradas, en toda la historia (`pedirRelojes`). */
  relojes?: { fallas: number; totalH?: number; activaH?: number; esperaH?: number }
  /** El registro del vigía desde que entró TRIM (`pedirPredicciones`). */
  vigia?: { aciertos: number; falsas: number; intervenidas: number; seguimiento: number; anticipoDias: number | null; anunciadas: number; vigiladas: number }
}

/** Las partes de la pantalla. El motor dice cuáles ve cada rol y en qué orden. */
export type SeccionResultados =
  | 'produccion' | 'bajando' | 'mesAMes' | 'porEquipo' | 'porCampo' | 'publicar'
  | 'mantenimiento' | 'confiabilidad' | 'dondeSeTrabo' | 'dondeBajarlo' | 'tipos' | 'diaADia' | 'ciclo'

/** Un mes del diferido: el de La planta viva, con su parte por dónde se trabó y si cae en el período. */
export interface MesResultados extends MesDiferido {
  /** El mes toca el período que se mira: lleva su contorno y su cifra. */
  enPeriodo: boolean
  /** Su primer y su último día («2026-10-01», «2026-10-31»): un toque lo abre como período. */
  desdeDia: string
  hastaDia: string
  /** Lo que se trabó en cada tramo, bbl/d (Σ = `totalBpd`). */
  porTramo: Record<ChokeOSinAsignar, number>
}

export interface VistaResultados {
  rol: string
  campos: string[]
  alcance: 'campo' | 'portafolio'
  desde: Date
  hasta: Date
  /** La hora de los datos. */
  ahora: Date
  /** «octubre, en curso», «septiembre», «1 de jul a 30 de sept». */
  periodo: string
  enCurso: boolean
  secciones: SeccionResultados[]
  /** La cifra grande con su frase (X5 §5.1): el diferido del período contra el máximo firmado. */
  cifra: {
    previo: string
    valor: number
    unidad: string
    frase: string
    /** Como mucho dos renglones: contra el máximo, quién se lo lleva, lo sin causa. */
    explica: string
    /** La frase de 20 palabras o menos (el nombre accesible). */
    fraseCorta: string
    /** El máximo firmado para lo que va del período, bbl; null sin meta. */
    maximo: number | null
    /** Lo pasó: la marca de aviso va antes del previo (nunca la cifra en color). */
    sobreMaximo: boolean
    /** Calculado, no medido: el rango del cálculo. */
    rango: [number, number]
    valorUsd: number | null
    /** Los campos con días sin precio: ese valor no los cuenta. */
    sinPrecio: string[]
    /** El equipo que más pesó en el período: «Ver qué se está haciendo» abre su ficha. */
    primerEquipo: { campoId: string; equipo: string } | null
  }
  /** ¿Se puede publicar? Junta el cuadre y la custodia (X4 §3.7). */
  publicar: { estado: 'publicable' | 'provisional' | 'bloqueado'; texto: string; motivos: string[] }
  /** La producción por día contra la meta, y el cierre proyectado (o el total del período cerrado). */
  produccion: {
    realBpd: number
    metaBpd: number | null
    bajoMeta: boolean
    diferidoBpd: number
    maximoBpd: number | null
    sobreMaximo: boolean
    /** Sin meta firmada en algún campo: lo que se dice en su lugar. */
    sinMeta: string | null
    /** Los totales que protege el folio (el ⓘ de «Promedio por día», escrito en el papel). */
    totales: { titulo: string; texto: string }
    cierre: {
      /** «Cierre proyectado» (mes en curso) o «Total del período». */
      titulo: string
      proyectado: boolean
      produccion: number
      metaProduccion: number | null
      bajoMeta: boolean
      diferido: number
      maximoDiferido: number | null
      sobreMaximo: boolean
      /** El ⓘ: de dónde sale el cierre. */
      explica: string
    }
  }
  /** «¿Está bajando? Desde que entró TRIM»: por tramo (las dos flechas) y lo de alto impacto. */
  bajando: {
    desde: Date
    base: string
    filas: Array<FlechaTrim & { tramo: ChokeAnh; nombre: string }>
    nota: string
    /** Lo de alto impacto por día: los tres meses antes de TRIM → desde que entró. */
    altoImpacto: { antesBpd: number; ahoraBpd: number; cambio: number | null; texto: string }
  } | null
  /** Horas preventivas o predictivas en SAP desde que entró TRIM: si no sube, las fallas no bajan. */
  proactivo: { porcentaje: number | null; proactivoH: number; correctivoH: number; texto: string }
  mesAMes: { meses: MesResultados[]; actualBpd: number | null; nombreActual: string; maximoBpd: number | null; aria: string }
  /** El diferido del período por equipo: la marca, la familia, los barriles y su parte. */
  porEquipo: { filas: Array<FilaEquipoDiferido & { campo: string }>; total: number }
  /** Lo que todavía se podía mover en el período, por momento: simulado, nunca la cifra grande. */
  ciclo: {
    totalBbl: number
    momentos: Array<{ momento: Momento; nombre: string; lema: string; bbl: number; texto: string; plan: { campoId: string; equipo: string } | null }>
  }
  /** Jefe de mantenimiento (y planeación): lo que dura una falla, programado contra no programado. */
  mantenimiento: {
    frase: string
    fallas: number
    totalH: number | null
    activaH: number | null
    esperaH: number | null
    programadoBbl: number
    noProgramadoBbl: number
    altoImpactoBbl: number
  } | null
  /** Confiabilidad: ¿le creo al vigía? */
  confiabilidad: {
    frase: string
    aciertos: number
    falsas: number
    intervenidas: number
    seguimiento: number
    /** De lo que se puede juzgar (falló o no), cuánto fue verdad; null sin nada que juzgar. */
    tasa: number | null
    anticipoDias: number | null
    anunciadas: number
    vigiladas: number
  } | null
  /** La pérdida (lo que salió y no se vendió) va aparte y nunca se suma. */
  perdida: string
}

/* ───────────────────────────── utilidades ───────────────────────────── */

const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const n0 = (v: number) => FMT_N0.format(Math.round(v) === 0 ? 0 : v)
const FMT_N1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const n1 = (v: number) => FMT_N1.format(v)
const mayus = (s: string) => (s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s)
const plural = (n: number, uno: string, varios: string) => `${n0(n)} ${n === 1 ? uno : varios}`
/** «−18 %», «+76 %», «0 %»: el cambio con su signo. */
const signo = (c: number) => { const r = Math.round(c * 100); return `${r > 0 ? '+' : r < 0 ? '−' : ''}${n0(Math.abs(r))} %` }

/** Qué ve cada rol, en el orden de su pregunta (X4 §2 y §4.8). El gerente tiene
 *  aquí lo que eran su Resumen, sus Diferidos y su Producción (X4 §3.6, puntos 4 y 5). */
function seccionesDe(rol: string, portafolio: boolean): SeccionResultados[] {
  const campos = portafolio ? ['porCampo' as const] : []
  switch (rol) {
    // Con un campo, «Dónde se trabó» va en su panel; con todos, dentro de «Por campo» (una vez).
    case 'ger': return ['produccion', 'bajando', 'mesAMes', 'porEquipo', ...(portafolio ? ['porCampo' as const] : ['dondeSeTrabo' as const]), 'dondeBajarlo', 'tipos', 'diaADia', 'ciclo']
    case 'prod': return ['produccion', 'publicar', 'bajando', 'mesAMes', 'porEquipo', ...campos, 'ciclo']
    case 'jefe': case 'plan': return ['mantenimiento', 'bajando', 'mesAMes', 'porEquipo', 'confiabilidad', ...campos, 'ciclo']
    case 'conf': return ['confiabilidad', 'bajando', 'mesAMes', 'porEquipo', 'mantenimiento', ...campos, 'ciclo']
    case 'reg': return ['publicar', 'produccion', 'mesAMes', 'porEquipo', ...campos]
    default: return ['produccion', 'bajando', 'mesAMes', 'porEquipo', ...campos, 'ciclo']
  }
}

/** ¿Se puede publicar?, con la regla de siempre (`publicacion`, widgets/diferidos): el
 *  mes en curso no es una anomalía; lo demás, sí. Los motivos, por su código. */
function publicarDe(lb: Libro): VistaResultados['publicar'] {
  const otros = lb.motivos.filter(m => m.codigo !== 'en-curso')
  if (lb.publicable) return { estado: 'publicable', texto: 'Cuadra con la medición oficial y tiene su cadena de custodia: se puede publicar.', motivos: [] }
  if (!otros.length) return { estado: 'provisional', texto: 'Provisional: el mes está en curso y se publica cuando cierre.', motivos: [] }
  return { estado: 'bloqueado', texto: `Todavía no se puede publicar. ${otros.map(m => m.texto).join(' ')}`, motivos: [...new Set(otros.map(m => m.texto))] }
}

/* ───────────────────────────── la vista ───────────────────────────── */

const SIN = {}
const GUARDADO = new WeakMap<Contexto, WeakMap<object, WeakMap<object, Map<string, VistaResultados>>>>()

/** Resultados de un rol en unos campos y un período. */
export function resultados(q: ConsultaResultados, ctx: Contexto, versiones?: Historial, op: OpcionesResultados = {}): VistaResultados {
  if (!q.campos.length) throw new Error('Resultados necesita al menos un campo.')
  const campos = [...new Set(q.campos)]
  // Guardado por contexto, historial, lo guardado por las personas y lo que entra hecho.
  let porV = GUARDADO.get(ctx)
  if (!porV) GUARDADO.set(ctx, porV = new WeakMap())
  const kv = (versiones ?? SIN) as object
  let porG = porV.get(kv)
  if (!porG) porV.set(kv, porG = new WeakMap())
  const kg = (op.guardadas ?? SIN) as object
  let m = porG.get(kg)
  if (!m) porG.set(kg, m = new Map())
  const clave = [q.rol, campos.join(','), q.desde.getTime(), q.hasta.getTime(), op.ordenes?.length ?? '-', JSON.stringify(op.relojes ?? null), JSON.stringify(op.vigia ?? null)].join('|')
  const ya = m.get(clave)
  if (ya) return ya
  const v = calcular({ ...q, campos }, ctx, versiones, op)
  m.set(clave, v)
  return v
}

function calcular(q: ConsultaResultados, ctx: Contexto, versiones: Historial | undefined, op: OpcionesResultados): VistaResultados {
  const { campos, desde, hasta } = q
  const unCampo = campos.length === 1
  const nombre = unCampo ? campoPorId(campos[0]!).nombre : ''
  const opReparto: OpcionesReparto = op.guardadas ? { guardadas: op.guardadas } : {}
  // Lo de La planta viva, con el momento «después» (el período): las mismas cifras.
  const pv = plantaViva({ campos, momento: 'despues', desde, hasta }, ctx, versiones, opReparto)
  const lb = libro(campos, desde, hasta, ctx)
  const meta = lb.meta, hayMeta = conMeta(meta)
  const sinMeta = hayMeta ? null : textoSinMeta(meta, campos.length > 1)
  const enCurso = meta.diasTotal > meta.dias + 0.01
  const periodoCorto = pv.periodo.replace(', en curso', '')

  /* La cifra grande: el diferido del período contra el máximo firmado. */
  const maximo = hayMeta ? meta.diferido : null
  const sobreMaximo = maximo !== null && lb.diferido > maximo
  const contraMax = maximo === null
    ? `Sin máximo firmado (${sinMeta}): no hay contra qué compararlo.`
    : sobreMaximo
      ? `Pasó el máximo firmado para ${enCurso ? `lo que va de ${periodoCorto}` : periodoCorto} (${n0(maximo)} bbl) en ${n0(lb.diferido - maximo)}.`
      : `El máximo firmado para ${enCurso ? `lo que va de ${periodoCorto}` : periodoCorto} es ${n0(maximo)} bbl: va ${n0(maximo - lb.diferido)} por debajo.`
  const anterior = pv.esteMes.anterior
  const explica = [contraMax, pv.esteMes.nota ? `${mayus(pv.esteMes.nota)}.` : '', anterior ? `${mayus(anterior.nombre)} cerró en ${n0(anterior.bbl)} bbl.` : '']
    .filter(Boolean).join(' ')
  const donde = unCampo ? ` en ${nombre}` : ` en sus ${n0(campos.length)} campos`
  const fraseCorta = lb.diferido < 0.5
    ? `Nada se trabó${donde} en ${pv.periodo}.`
    : `En ${periodoCorto} no se produjeron ${n0(lb.diferido)} bbl${donde}${maximo === null ? '' : sobreMaximo ? ', sobre el máximo firmado' : ', bajo el máximo firmado'}.`
  const cifra: VistaResultados['cifra'] = {
    previo: `Lo que pasó · ${pv.periodo}`,
    valor: lb.diferido, unidad: 'barriles',
    frase: lb.diferido < 0.5 ? `Nada se trabó${donde}.` : `no se produjeron${donde}.`,
    explica, fraseCorta, maximo, sobreMaximo,
    rango: pv.esteMes.rango, valorUsd: pv.esteMes.valorUsd,
    sinPrecio: lb.sinPrecio.map(c => campoPorId(c).nombre),
    primerEquipo: pv.cifras.despues.primerEquipo,
  }

  /* La producción contra la meta y el cierre. */
  const dias = Math.max(1 / 24, meta.dias)
  const realBpd = lb.real / dias, diferidoBpd = lb.diferido / dias
  const estados = campos.map(c => estadoCampo(c, ctx))
  const ritmoAhora = estados.reduce((a, e) => a + e.potencialBpd - e.perdiendoBpd, 0)
  const ahoraBpd = estados.reduce((a, e) => a + e.perdiendoBpd, 0)
  const restantes = Math.max(0, meta.diasTotal - meta.dias)
  const cierreProd = enCurso ? lb.real + ritmoAhora * restantes : lb.real
  const cierreDif = enCurso ? lb.diferido + ahoraBpd * restantes : lb.diferido
  const metaProdCierre = hayMeta ? (enCurso ? meta.produccionTotal : meta.produccion) : null
  const maxDifCierre = hayMeta ? (enCurso ? meta.diferidoTotal : meta.diferido) : null
  const produccion: VistaResultados['produccion'] = {
    realBpd, metaBpd: hayMeta ? meta.produccionDia : null, bajoMeta: hayMeta && realBpd < meta.produccionDia,
    diferidoBpd, maximoBpd: hayMeta ? meta.diferidoDia : null, sobreMaximo: hayMeta && diferidoBpd > meta.diferidoDia,
    sinMeta,
    totales: {
      titulo: enCurso ? 'A la fecha' : 'Del período',
      texto: hayMeta
        ? `${n0(lb.real)} de ${n0(meta.produccion)} bbl producidos y ${n0(lb.diferido)} de un máximo de ${n0(meta.diferido)} bbl diferidos, en ${n1(meta.dias)} de ${n0(meta.diasTotal)} días.`
        : `${n0(lb.real)} bbl producidos y ${n0(lb.diferido)} bbl diferidos, en ${n1(meta.dias)} de ${n0(meta.diasTotal)} días (${sinMeta}).`,
    },
    cierre: {
      titulo: enCurso ? 'Cierre proyectado' : 'Total del período', proyectado: enCurso,
      produccion: cierreProd, metaProduccion: metaProdCierre, bajoMeta: metaProdCierre !== null && cierreProd < metaProdCierre,
      diferido: cierreDif, maximoDiferido: maxDifCierre, sobreMaximo: maxDifCierre !== null && cierreDif > maxDifCierre,
      explica: enCurso
        ? `Si todo sigue como está ahora: lo que va del mes más el ritmo de hoy hasta el último día (${n0(meta.diasTotal)} días).`
        : `Lo del período completo (${n0(meta.diasTotal)} días), contra las metas firmadas.`,
    },
  }

  /* ¿Está bajando? Por tramo (las dos flechas, de La planta viva) y lo de alto impacto. */
  const inicio = new Date(`${PUESTA_EN_MARCHA}T00:00:00-05:00`)
  const antesTrim = libro(campos, new Date(`${sumarMeses(PUESTA_EN_MARCHA.slice(0, 7), -3)}-01T00:00:00-05:00`), inicio, ctx)
  const conTrim = libro(campos, inicio, AHORA, ctx)
  const altoAntes = antesTrim.altoImpacto / Math.max(1 / 24, antesTrim.meta.dias), altoAhora = conTrim.altoImpacto / Math.max(1 / 24, conTrim.meta.dias)
  const cambioAlto = altoAntes > 0 ? (altoAhora - altoAntes) / altoAntes : null
  const bajando: VistaResultados['bajando'] = pv.bajando ? {
    ...pv.bajando,
    altoImpacto: { antesBpd: altoAntes, ahoraBpd: altoAhora, cambio: cambioAlto,
      texto: `Lo de alto impacto (bombas de agua y electrosumergibles): ${n0(altoAntes)} → ${n0(altoAhora)} bbl/d${cambioAlto === null ? '' : ` · ${signo(cambioAlto)}`}` },
  } : null

  /* El mantenimiento proactivo: horas preventivas o predictivas en SAP desde que entró TRIM. */
  const h = horasPorClase((op.ordenes ?? []).filter(o => campos.includes(o.campoId)), inicio, AHORA)
  const proactivo: VistaResultados['proactivo'] = {
    porcentaje: h.porcentaje ?? null, proactivoH: h.proactivo, correctivoH: h.correctivo,
    texto: h.porcentaje === undefined ? `Sin órdenes en SAP desde el ${fechaCorta(inicio)}.`
      : `${n1(h.proactivo)} h proactivas · ${n1(h.correctivo)} h correctivas, desde el ${fechaCorta(inicio)}`,
  }

  /* Mes a mes: los 13 meses de La planta viva, con lo que se trabó en cada tramo. */
  const porMes = new Map(repartoPorMes(campos, ctx, versiones, opReparto).map(t => [t.mes, t]))
  const cal = new Map(calendario().map(c => [c.mes, c]))
  const meses: MesResultados[] = pv.mesAMes.meses.map(x => {
    const c = cal.get(x.mes)
    const d0 = c ? c.desde : desde.getTime(), d1 = c ? c.hasta : hasta.getTime()
    const t = porMes.get(x.mes)
    // Por día con los mismos días del libro del mes: Σ por tramo = el diferido por día de la barra.
    const aDia = t && t.diferido > 0 ? x.totalBpd / t.diferido : 0
    return { ...x, enPeriodo: d0 < hasta.getTime() && d1 > desde.getTime(), desdeDia: diaIso(new Date(d0)), hastaDia: diaIso(new Date(d1 - 1)),
      porTramo: Object.fromEntries(CHOKES_Y_SIN_ASIGNAR.map(k => [k, (t?.porTramo[k] ?? 0) * aDia])) as Record<ChokeOSinAsignar, number> }
  })
  const sobre = meses.filter(x => x.sobre)
  const mx = pv.mesAMes.maximoBpd
  const aria = `Diferido por día de ${meses[0]?.nombre ?? ''} a ${meses.at(-1)?.nombre ?? ''}${mx !== null ? ` contra el máximo firmado (${n0(mx)} bbl/d este mes)` : ''}. `
    + (sobre.length ? `Lo pasaron ${sobre.map(x => `${x.nombre} (${n0(x.totalBpd)})`).join(', ')}.` : 'Ningún mes cerrado lo pasó.')

  /* El diferido por equipo: hasta seis, con la marca de hoy de cada uno. */
  const riesgo = riesgoAhora(campos, ctx)
  const marca = (c: string, e: string): Severidad => riesgo.find(r => r.campoId === c && r.equipo === e)?.prioridad ?? 0
  const filasEq = lb.porEquipo.slice(0, 6).map((e): FilaEquipoDiferido & { campo: string } => {
    const p = marca(e.campoId, e.equipo)
    return { campoId: e.campoId, campo: campoPorId(e.campoId).nombre, equipo: e.equipo, familia: FAMILIA[e.tipo], prioridad: p, palabra: PALABRA_PRIORIDAD[p], bbl: e.bbl, pct: lb.diferido > 0 ? (e.bbl / lb.diferido) * 100 : 0 }
  })

  /* El ciclo, simulado: una línea por momento (X4 §4.4, regla 2). */
  const ciclo: VistaResultados['ciclo'] = {
    totalBbl: pv.mover.totalBbl,
    momentos: MOMENTOS.map(mo => ({ momento: mo, nombre: NOMBRE_MOMENTO[mo], lema: LEMA_MOMENTO[mo], bbl: pv.mover.porMomento[mo],
      texto: pv.cifras[mo].simulado.texto, plan: pv.cifras[mo].simulado.plan })),
  }

  /* Mantenimiento y confiabilidad (jefe, planeación y confiabilidad). */
  const secciones = seccionesDe(q.rol, !unCampo)
  const rl = op.relojes
  const mantenimiento: VistaResultados['mantenimiento'] = secciones.includes('mantenimiento') ? {
    frase: rl?.totalH && rl.esperaH !== undefined
      ? `De ${n1(rl.totalH / 24)} días que dura una falla, ${n1(rl.esperaH / 24)} son espera (repuesto, permisos, cuadrilla).`
      : 'Sin fallas cerradas con su orden en SAP: no se sabe cuánto es espera.',
    fallas: rl?.fallas ?? 0, totalH: rl?.totalH ?? null, activaH: rl?.activaH ?? null, esperaH: rl?.esperaH ?? null,
    programadoBbl: lb.planeado, noProgramadoBbl: lb.noPlaneado, altoImpactoBbl: lb.altoImpacto,
  } : null
  const vg = op.vigia
  const juzgables = vg ? vg.aciertos + vg.falsas : 0
  const confiabilidad: VistaResultados['confiabilidad'] = secciones.includes('confiabilidad') && vg ? {
    frase: !juzgables ? `El vigía no tiene todavía un aviso vencido que juzgar desde el ${fechaCorta(inicio)}.`
      : `El vigía acertó ${plural(vg.aciertos, 'vez', 'veces')} de ${n0(juzgables)}${vg.anticipoDias !== null ? `, con ${n1(vg.anticipoDias)} días de anticipo en promedio` : ''}; anunció ${n0(vg.anunciadas)} de las ${plural(vg.vigiladas, 'falla que podía ver', 'fallas que podía ver')}.`,
    aciertos: vg.aciertos, falsas: vg.falsas, intervenidas: vg.intervenidas, seguimiento: vg.seguimiento,
    tasa: juzgables ? (vg.aciertos / juzgables) * 100 : null, anticipoDias: vg.anticipoDias, anunciadas: vg.anunciadas, vigiladas: vg.vigiladas,
  } : null

  return {
    rol: q.rol, campos, alcance: unCampo ? 'campo' : 'portafolio', desde, hasta, ahora: AHORA, periodo: pv.periodo, enCurso, secciones,
    cifra, publicar: publicarDe(lb), produccion, bajando, proactivo,
    mesAMes: { meses, actualBpd: pv.mesAMes.actualBpd, nombreActual: pv.mesAMes.nombreActual, maximoBpd: pv.mesAMes.maximoBpd, aria },
    porEquipo: { filas: filasEq, total: lb.porEquipo.length },
    ciclo, mantenimiento, confiabilidad,
    perdida: pv.perdida,
  }
}
