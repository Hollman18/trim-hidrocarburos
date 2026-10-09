/** Lo único que se escribe a mano: las metas y la configuración del campo.
 *
 *  Todo lo demás (producido, diferido, predicciones) sale de los equipos. La
 *  configuración se declara una vez, queda firmada y versionada, y se trata
 *  igual que una meta: es la regla contra la que se mide, no una medición.
 *
 *  Contrato: `GET /api/configuracion/historial` (en el arranque; la última
 *  versión es la vigente) y `POST /api/configuracion` con firma (CONTRATO.md).
 *  El servidor guarda cada versión; nunca se sobrescribe.
 */
import { CAMPOS, SEMILLAS } from './campos'
import type { DestinoGas } from './tipos'
import { insumos, perezoso } from './insumos'
import { MOTIVO_MINIMO, alcanza } from './reglas'
import { formatoFecha } from '@/shared/lib/fecha'

/** Un tramo de lo que fija el gerente de activo para un campo: rige desde su
 *  día hasta que empiece el siguiente. Una meta vigente es un tramo; un plan
 *  mes a mes serían doce. Las metas van en barriles por día porque los
 *  barriles se suman entre campos y los porcentajes no: la meta global es la
 *  suma. El precio y la regla de cierre van en el mismo tramo, con la misma
 *  fecha: si no, cambiarlos hoy reescribiría el valor y la publicación de los
 *  meses cerrados (y sus folios dejarían de cuadrar). */
export interface TramoMeta {
  /** Día desde el que rige, AAAA-MM-DD (hora de Colombia). */
  desde: string
  /** Lo que el campo debe producir, bbl/d en el punto de medición oficial. */
  produccionBpd: number
  /** Lo máximo que se acepta dejar de producir, bbl/d. */
  diferidoMaxBpd: number
  /** Precio neto del barril, USD/bbl. Sin él, esos días no se pasan a dinero.
   *  En el JSON del contrato un precio sin configurar viaja como `null`: al
   *  entrar se vuelve ausente (`normalizarConfig`), para que ningún cálculo
   *  lo tome como un precio de 0 USD. */
  netbackUsd?: number
  /** Máximo de barriles sin causa identificada, % del potencial, para poder
   *  publicar el libro del período. */
  criterioSinCausa: number
}

/** Un precio que llega como `null` (convención del contrato para «sin dato») es un precio sin configurar. */
const precio = (t: TramoMeta) => (typeof t.netbackUsd === 'number' ? t.netbackUsd : undefined)

/** Dos tramos dicen lo mismo. */
export const mismoTramo = (a: TramoMeta, b: TramoMeta) =>
  a.produccionBpd === b.produccionBpd && a.diferidoMaxBpd === b.diferidoMaxBpd
  && precio(a) === precio(b) && a.criterioSinCausa === b.criterioSinCausa

export interface TanqueAgua {
  id: string
  nombre: string
  campoId: string
  /** Bomba de reinyección que lo vacía. */
  bomba: string
  capacidadBbl: number
  /** Fracción de la capacidad a la que dispara el nivel muy alto. */
  altoAlto: number
  /** Transmisor de nivel. */
  tagNivel: string
  /** Certificado de la tabla de aforo con que el nivel se vuelve barriles. */
  aforo: string
}

export interface ParadaProgramada {
  id: string
  campoId: string
  equipo: string
  desde: string
  hasta: string
  motivo: string
}

/** Respaldo de una bomba de la línea: cuánta agua (o fluido) libre puede
 *  tomar el equipo en paralelo cuando ella se para. Cambia el colchón y el
 *  orden de cierre: es configuración, no medición. */
export interface RespaldoBomba {
  campoId: string
  equipo: string
  /** Capacidad libre del respaldo, bbl/d. Cero si no hay respaldo. */
  libreBpd: number
  detalle: string
}

/** Lo que el campo maneja y las familias de equipo que tiene. Lo declara el
 *  administrador de la implementación (configuración técnica, con firma) y
 *  decide qué se dibuja en Planta, qué subpantallas aparecen en «Pozos y
 *  equipos» y si se habla de gas. Cada campo es distinto: uno sin gas no
 *  tiene tren de gas, uno de bombeo mecánico no tiene electrosumergibles. */
export interface PerfilCampo {
  gas: DestinoGas
  /** Bombas de la línea: reinyección o transferencia de agua, multifásicas. */
  bombas: boolean
  electrosumergibles: boolean
}

export const NOMBRE_GAS: Record<DestinoGas, string> = {
  no: 'no tiene tren de gas', tea: 'gas a tea', consumo: 'gas para consumo propio', venta: 'gas a venta',
}

export interface ConfigCampo {
  /** Tramos de meta, precio y regla de cierre, del más viejo al más nuevo. */
  metas: TramoMeta[]
  perfil: PerfilCampo
}

export interface Config {
  /** Nombre de la empresa en el membrete de los informes. */
  empresa: string
  campos: Record<string, ConfigCampo>
  tanques: TanqueAgua[]
  respaldos: RespaldoBomba[]
  programa: ParadaProgramada[]
}

/** Cada cambio de configuración es una versión firmada. Nunca se sobrescribe:
 *  el libro de un mes viejo se puede rehacer con la versión que regía. */
export interface Version {
  version: number
  fecha: string
  por: string
  /** Por qué se cambió. Obligatorio: una meta que se mueve sin motivo no es meta. */
  motivo: string
  cambios: string[]
  config: Config
}

/** Primer día con producción fiscal en el historiador: la meta de arranque
 *  rige desde ahí para que todos los meses tengan contra qué medirse. */
export const PRIMER_DIA_METAS = '2025-10-01'

/** Metas y perfil de arranque de cada campo del demo, de su semilla. No
 *  dependen de los insumos: la meta y el perfil de un campo sin firma se leen
 *  sin ellos. Sin precio configurado el tramo no lleva `netbackUsd` (ausente,
 *  nunca 0 ni undefined escrito: así viaja igual por JSON). */
const CAMPOS_INICIALES: Config['campos'] = Object.fromEntries(Object.entries(SEMILLAS).map(([id, s]) => [id, {
  metas: [{ desde: PRIMER_DIA_METAS, ...s.meta, ...(s.economiaConfigurada ? { netbackUsd: 48 } : {}), criterioSinCausa: 2 }],
  perfil: { ...s.perfil },
}]))

/** La configuración de arranque. Es la de la versión 1 que el servidor
 *  devuelve en `GET /api/configuracion/historial` antes de la primera firma;
 *  el programa de paradas viene con los insumos (ver insumos.ts). Perezosa y
 *  siempre el mismo objeto. */
export const configInicial = perezoso((): Config => ({
  empresa: 'Operadora de demostración',
  campos: CAMPOS_INICIALES,
  tanques: [
    { id: 'TK-AG-CE', nombre: 'Tanque de agua de La Ceiba', campoId: 'ceiba', bomba: 'P-201B', capacidadBbl: 30000,
      altoAlto: 0.9, tagNivel: 'LT-2012', aforo: 'Certificado de aforo TK-AG-CE · tabla de 1 cm' },
    { id: 'TK-AG-MN', nombre: 'Tanque de agua de Morichal Norte', campoId: 'morichal', bomba: 'P-201B', capacidadBbl: 60000,
      altoAlto: 0.9, tagNivel: 'LT-2012', aforo: 'Certificado de aforo TK-AG-MN · tabla de 1 cm' },
    { id: 'TK-AG-GU', nombre: 'Tanque de agua de Guacamayo', campoId: 'guacamayo', bomba: 'P-201B', capacidadBbl: 20000,
      altoAlto: 0.9, tagNivel: 'LT-2012', aforo: 'Certificado de aforo TK-AG-GU · tabla de 1 cm' },
  ],
  // Lo que el resto del tren toma de más cuando la bomba para. Lo que limita a
  // las bombas es la presión del cabezal de disposición (la inyectividad de los
  // pozos), no la placa de 90.000: en La Ceiba cada una llega a unos 89.250 y
  // mueve 74.200 (su parte del agua que entra), así que P-201A y P-201C toman
  // 30.100 más entre las dos; en Morichal llegan a 86.500 y mueven 79.900, y
  // las otras seis toman 39.500 entre todas.
  respaldos: [
    { campoId: 'ceiba', equipo: 'P-201B', libreBpd: 30100, detalle: 'P-201A y P-201C en paralelo, con 30.100 bbl/d libres entre las dos: el cabezal de disposición las limita a unos 89.250 cada una' },
    { campoId: 'morichal', equipo: 'P-201B', libreBpd: 39500, detalle: 'Las otras seis bombas del tren, con 39.500 bbl/d libres entre todas: el cabezal de disposición las limita a unos 86.500 cada una' },
    { campoId: 'morichal', equipo: 'MPP-301', libreBpd: 0, detalle: 'Sin bomba en paralelo ni derivación al manifold' },
    { campoId: 'guacamayo', equipo: 'P-201B', libreBpd: 50000, detalle: 'P-201C de reserva (50.000 bbl/d), alineada al pozo de disposición alterno: toma todo su caudal' },
  ],
  programa: insumos().programa,
}))

/** Fecha de la firma de arranque. Es dato de la implementación, no de los insumos. */
const FECHA_ARRANQUE = '2026-09-01T08:00:00-05:00'

/** La versión 1: la firma de arranque. Perezosa como la configuración que lleva. */
export const versionInicial = perezoso((): Version => ({
  version: 1, fecha: FECHA_ARRANQUE, por: 'Hermes Leal · administrador de la implementación',
  motivo: 'Arranque de la implementación',
  cambios: ['Configuración inicial: metas por campo, precio neto, tanques de agua, respaldos de bombas y programa de paradas'],
  config: configInicial(),
}))

/** Día en que TRIM empezó a operar en estos campos (la firma de arranque). Antes
 *  y después de esa fecha es la comparación honesta de lo que cambió. */
export const PUESTA_EN_MARCHA = FECHA_ARRANQUE.slice(0, 10)

/** El tanque que vacía una bomba: el de ESA bomba en ESE campo. Un campo con
 *  dos trenes de agua tiene dos tanques, y cada bomba mide contra el suyo. */
export const tanqueDe = (c: Config, campoId: string, bomba: string) => c.tanques.find(t => t.campoId === campoId && t.bomba === bomba)
export const respaldoDe = (c: Config, campoId: string, equipo: string) =>
  c.respaldos.find(r => r.campoId === campoId && r.equipo === equipo)

/** La configuración que regía en un instante: la de la última versión firmada
 *  hasta entonces (las versiones van de la más vieja a la más nueva). Antes de
 *  la primera rige la de arranque. Es la que califica la historia: firmar hoy
 *  no reescribe cómo se veía un mes viejo. */
export function configEn(versiones: ReadonlyArray<Pick<Version, 'fecha' | 'config'>>, t: number): Config {
  let c = versiones[0]!.config
  for (const v of versiones) if (Date.parse(v.fecha) <= t) c = v.config
  return c
}

/** Lo que llega de afuera (el JSON del servidor, o lo que se va a firmar) con
 *  los huecos como ausentes: un `null` en el precio no es un precio de 0. */
export function normalizarConfig(c: Config): Config {
  const n = structuredClone(c)
  for (const cc of Object.values(n.campos)) for (const t of cc.metas) if (typeof t.netbackUsd !== 'number') delete t.netbackUsd
  return n
}

/** El día (AAAA-MM-DD, hora de Colombia) de un instante. */
export const diaCo = (t: number) => new Date(t - 5 * 3_600_000).toISOString().slice(0, 10)

/** Lo que dicen las pantallas donde un campo no tiene meta firmada: ni la
 *  semilla de demostración ni un 0, que daría «cumplimiento 0 %». */
export const SIN_META = 'sin meta firmada'

/** La meta de un campo en un instante: el tramo más nuevo que ya empezó.
 *  `undefined` si la configuración firmada no trae el campo o no le da ningún
 *  tramo: «sin meta firmada». La semilla (`CAMPOS_INICIALES`) solo arma la
 *  configuración de arranque; caer a ella aquí haría pasar por firmadas las
 *  metas, el precio y la regla de cierre de la demostración cuando el
 *  servidor devuelva una configuración incompleta. */
export function metaEn(c: Config, campoId: string, t: number): TramoMeta | undefined {
  const tramos = Object.hasOwn(c.campos, campoId) ? c.campos[campoId]!.metas : []
  const dia = diaCo(t)
  // El tramo más nuevo que ya empezó. Antes del primero no hay meta firmada:
  // un tramo que todavía no rige no se usa hacia atrás como si se hubiera firmado.
  let m: TramoMeta | undefined
  for (const x of tramos) if (x.desde <= dia) m = x
  return m
}

/** Perfil de un campo que la configuración firmada no trae: no afirma ningún
 *  equipo, así que las subpantallas de bombas y electrosumergibles no se
 *  ofrecen y la aplicación dice que falta el perfil (`tienePerfil`). */
const SIN_PERFIL: PerfilCampo = { gas: 'no', bombas: false, electrosumergibles: false }

/** ¿La configuración firmada trae el perfil del campo? */
export const tienePerfil = (c: Config, campoId: string) => Object.hasOwn(c.campos, campoId)

/** El perfil vigente de un campo. Sin perfil firmado, ninguno: nunca el de la semilla. */
export const perfilDe = (c: Config, campoId: string): PerfilCampo =>
  tienePerfil(c, campoId) ? c.campos[campoId]!.perfil : SIN_PERFIL

/** Precio neto y regla de cierre que regían en un instante; undefined sin meta firmada. */
export const precioEn = (c: Config, campoId: string, t: number) => { const m = metaEn(c, campoId, t); return m && precio(m) }
export const criterioEn = (c: Config, campoId: string, t: number): number | undefined => metaEn(c, campoId, t)?.criterioSinCausa

/** El campo de la configuración donde se pone un tramo. Si la firmada no lo
 *  trae, entra sin metas y sin ningún equipo en su perfil: el historial lo dice
 *  («campo nuevo») y el perfil lo firma después el administrador. */
function campoEditable(n: Config, campoId: string): ConfigCampo {
  if (!Object.hasOwn(n.campos, campoId)) n.campos[campoId] = { metas: [], perfil: { ...SIN_PERFIL } }
  return n.campos[campoId]!
}

/** Pone la cifra de un MES del plan: el tramo empieza el día 1 y reemplaza los
 *  que empezaban dentro de ese mes (si no, uno del día 2 la taparía desde ahí). */
export function conMes(c: Config, campoId: string, t: TramoMeta): Config {
  const mes = t.desde.slice(0, 7)
  const n = structuredClone(c)
  const cc = campoEditable(n, campoId)
  cc.metas = [...cc.metas.filter(x => !x.desde.startsWith(mes)), t].sort((a, b) => a.desde.localeCompare(b.desde))
  return n
}

/** Pone un tramo nuevo en las metas de un campo: si ya había uno que empezaba
 *  ese mismo día, lo reemplaza. Devuelve una configuración nueva. */
export function conTramo(c: Config, campoId: string, t: TramoMeta): Config {
  const n = structuredClone(c)
  const cc = campoEditable(n, campoId)
  cc.metas = [...cc.metas.filter(x => x.desde !== t.desde), t].sort((a, b) => a.desde.localeCompare(b.desde))
  return n
}

/** Una cifra como la lee una persona, con sus decimales si los tiene: va al historial, que no se corrige. */
const cifra = (v: number) => (Number.isNaN(v) ? 'vacío' : !Number.isFinite(v) ? 'fuera de rango' : v.toLocaleString('es-CO', { maximumFractionDigits: 2 }))
const miles = cifra
// En la zona de Colombia: este texto queda en el historial firmado, que no se corrige, y no puede depender del navegador.
const FMT_DIA = formatoFecha({ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })
const fechaDia = (d: string) => FMT_DIA.format(new Date(`${d}T12:00:00-05:00`))
const fechaHoraCo = (iso: string) => {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? `${FMT_DIA.format(new Date(t))} ${new Date(t - 5 * 3_600_000).toISOString().slice(11, 16)}` : 'fecha inválida'
}

/** Lo que cambió entre dos configuraciones, dicho como lo lee una persona y
 *  separado por quién lo firma: las metas (y el precio y la regla de cierre)
 *  el gerente de activo; lo técnico, el administrador de la implementación. */
export function diferenciasPorGrupo(a: Config, b: Config): { metas: string[]; tecnica: string[] } {
  const metas: string[] = [], tecnica: string[] = []
  const nombre = (id: string) => CAMPOS.find(c => c.id === id)?.nombre ?? id
  const num = (v: number | null | undefined, u: string) => (v == null ? 'sin configurar' : Number.isNaN(v) ? 'vacío' : `${cifra(v)}${u}`)
  if (a.empresa !== b.empresa) tecnica.push(`Empresa del membrete: «${a.empresa}» → «${b.empresa}»`)
  for (const id of Object.keys(b.campos)) {
    const x = a.campos[id], y = b.campos[id]!
    if (!x) { metas.push(`${nombre(id)}: campo nuevo`); continue }
    for (const t of y.metas) {
      const v = x.metas.find(m => m.desde === t.desde)
      if (v && mismoTramo(v, t)) continue
      const antes = v ?? [...x.metas].reverse().find(m => m.desde < t.desde)
      const partes: string[] = []
      if (!antes || antes.produccionBpd !== t.produccionBpd) partes.push(`producción ${antes ? `${miles(antes.produccionBpd)} → ` : ''}${miles(t.produccionBpd)} bbl/d`)
      if (!antes || antes.diferidoMaxBpd !== t.diferidoMaxBpd) partes.push(`máximo de diferido ${antes ? `${miles(antes.diferidoMaxBpd)} → ` : ''}${miles(t.diferidoMaxBpd)} bbl/d`)
      if (!antes || precio(antes) !== precio(t)) partes.push(`precio neto ${antes ? `${num(precio(antes), ' USD/bbl')} → ` : ''}${num(precio(t), ' USD/bbl')}`)
      if (!antes || antes.criterioSinCausa !== t.criterioSinCausa) partes.push(`máximo sin causa para publicar ${antes ? `${num(antes.criterioSinCausa, ' %')} → ` : ''}${num(t.criterioSinCausa, ' %')}`)
      metas.push(`${nombre(id)}, desde el ${fechaDia(t.desde)}: ${partes.join('; ') || 'lo mismo que regía'}`)
    }
    for (const t of x.metas) if (!y.metas.some(m => m.desde === t.desde)) metas.push(`${nombre(id)}: se quitó la meta que regía desde el ${fechaDia(t.desde)}`)
    const sn = (v: boolean) => (v ? 'sí' : 'no')
    if (x.perfil.gas !== y.perfil.gas) tecnica.push(`${nombre(id)}: ${NOMBRE_GAS[x.perfil.gas]} → ${NOMBRE_GAS[y.perfil.gas]}`)
    if (x.perfil.bombas !== y.perfil.bombas) tecnica.push(`${nombre(id)}: bombas de la línea ${sn(x.perfil.bombas)} → ${sn(y.perfil.bombas)}`)
    if (x.perfil.electrosumergibles !== y.perfil.electrosumergibles) tecnica.push(`${nombre(id)}: electrosumergibles ${sn(x.perfil.electrosumergibles)} → ${sn(y.perfil.electrosumergibles)}`)
  }
  // Lo que se quita también es un cambio: si no apareciera, se firmaría sin que nadie lo viera.
  for (const id of Object.keys(a.campos)) if (!b.campos[id]) tecnica.push(`${nombre(id)}: se quitó el campo de la configuración (sus metas y su perfil)`)
  for (const t of b.tanques) {
    const v = a.tanques.find(x => x.id === t.id)
    if (!v) { tecnica.push(`${t.id}: tanque nuevo de ${t.bomba} (${nombre(t.campoId)})`); continue }
    if (v.nombre !== t.nombre) tecnica.push(`${t.id}: nombre «${v.nombre}» → «${t.nombre}»`)
    if (v.campoId !== t.campoId) tecnica.push(`${t.id}: campo ${nombre(v.campoId)} → ${nombre(t.campoId)}`)
    if (v.bomba !== t.bomba) tecnica.push(`${t.id}: bomba que lo vacía ${v.bomba} → ${t.bomba}`)
    if (v.capacidadBbl !== t.capacidadBbl) tecnica.push(`${t.id}: capacidad ${num(v.capacidadBbl, ' bbl')} → ${num(t.capacidadBbl, ' bbl')}`)
    if (v.altoAlto !== t.altoAlto) tecnica.push(`${t.id}: alto-alto ${num(v.altoAlto * 100, ' %')} → ${num(t.altoAlto * 100, ' %')}`)
    if (v.tagNivel !== t.tagNivel) tecnica.push(`${t.id}: transmisor ${v.tagNivel} → ${t.tagNivel}`)
    if (v.aforo !== t.aforo) tecnica.push(`${t.id}: certificado de aforo cambiado`)
  }
  for (const t of a.tanques) if (!b.tanques.some(x => x.id === t.id)) tecnica.push(`${t.id}: se quitó el tanque de ${t.bomba} (${nombre(t.campoId)})`)
  for (const r of b.respaldos) {
    const v = a.respaldos.find(x => x.campoId === r.campoId && x.equipo === r.equipo)
    if (!v) tecnica.push(`${r.equipo} de ${nombre(r.campoId)}: respaldo declarado de ${num(r.libreBpd, ' bbl/d')}`)
    else {
      if (v.libreBpd !== r.libreBpd) tecnica.push(`${r.equipo} de ${nombre(r.campoId)}: respaldo libre ${num(v.libreBpd, ' bbl/d')} → ${num(r.libreBpd, ' bbl/d')}`)
      if (v.detalle !== r.detalle) tecnica.push(`${r.equipo} de ${nombre(r.campoId)}: qué es el respaldo, «${v.detalle}» → «${r.detalle}»`)
    }
  }
  for (const r of a.respaldos) if (!b.respaldos.some(x => x.campoId === r.campoId && x.equipo === r.equipo))
    tecnica.push(`${r.equipo} de ${nombre(r.campoId)}: se quitó el respaldo declarado (${num(r.libreBpd, ' bbl/d')})`)
  // El programa se compara entrada por entrada y en TODOS sus datos: cambiarle las
  // fechas o el campo a una parada es tan cambio como agregarla.
  for (const p of b.programa) {
    const v = a.programa.find(x => x.id === p.id)
    if (!v) { tecnica.push(`Programa: se agregó ${p.equipo} (${nombre(p.campoId)}), ${fechaHoraCo(p.desde)} a ${fechaHoraCo(p.hasta)} · ${p.motivo}`); continue }
    const partes: string[] = []
    if (v.campoId !== p.campoId) partes.push(`campo ${nombre(v.campoId)} → ${nombre(p.campoId)}`)
    if (v.equipo !== p.equipo) partes.push(`equipo ${v.equipo} → ${p.equipo}`)
    if (Date.parse(v.desde) !== Date.parse(p.desde)) partes.push(`inicio ${fechaHoraCo(v.desde)} → ${fechaHoraCo(p.desde)}`)
    if (Date.parse(v.hasta) !== Date.parse(p.hasta)) partes.push(`fin ${fechaHoraCo(v.hasta)} → ${fechaHoraCo(p.hasta)}`)
    if (v.motivo !== p.motivo) partes.push(`motivo «${v.motivo}» → «${p.motivo}»`)
    if (partes.length) tecnica.push(`Programa: se cambió ${v.equipo} (${nombre(v.campoId)}): ${partes.join('; ')}`)
  }
  for (const p of a.programa) if (!b.programa.some(x => x.id === p.id)) tecnica.push(`Programa: se quitó ${p.equipo} (${nombre(p.campoId)}) · ${p.motivo}`)
  return { metas, tecnica }
}

/** Lo que cambió, todo junto (metas primero). */
export function diferencias(a: Config, b: Config): string[] {
  const d = diferenciasPorGrupo(a, b)
  return [...d.metas, ...d.tecnica]
}

/** Los campos que toca un cambio de configuración, en orden alfabético: los
 *  de metas y perfil, y los de cada tanque, respaldo o parada del programa que
 *  cambia (el de antes y el de después, si se movió de campo). El membrete es
 *  de la empresa, no de un campo. El servidor responde 403 si quien firma no
 *  tiene asignado alguno: la capacidad dice QUÉ firma; los campos, DÓNDE.
 *  Se compara con `diferencias` sobre la configuración de cada campo, así lo
 *  que cuenta como cambio es exactamente lo que el historial va a decir. */
export function camposTocados(a: Config, b: Config): string[] {
  const de = (c: Config, id: string): Config => ({
    empresa: '', campos: Object.hasOwn(c.campos, id) ? { [id]: c.campos[id]! } : {},
    tanques: c.tanques.filter(t => t.campoId === id), respaldos: c.respaldos.filter(r => r.campoId === id),
    programa: c.programa.filter(p => p.campoId === id),
  })
  const ids = new Set([...Object.keys(a.campos), ...Object.keys(b.campos),
    ...[a, b].flatMap(c => [...c.tanques, ...c.respaldos, ...c.programa].map(x => x.campoId))])
  return [...ids].filter(id => diferencias(de(a, id), de(b, id)).length > 0).sort()
}

/** Tope de sentido común para una cifra en bbl/d: lo que lo pase es un error de dedo. */
export const TOPE_BPD = 10_000_000
/** Tope de sentido común para el precio neto: el barril nunca se ha vendido a
 *  más de ~150 USD. Lo que pase de 500 es un error de dedo o de lectura
 *  («48,125» leído como 48.125 USD/bbl). */
export const TOPE_PRECIO_USD = 500

/** «AAAA-MM-DD» que además es un día del calendario (no «2026-02-30»). */
const diaValido = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d

/** Reglas que la configuración tiene que cumplir para poder firmarse. Las
 *  mismas que el servidor responde con 422 (CONTRATO.md). `desdeMinimo` es el
 *  primer día del mes en curso: lo de un mes cerrado no se reescribe. `ahora`
 *  es la hora de la firma, obligatoria: la pantalla y la firma validan con la
 *  misma hora. El programa, como las metas, es inmutable hacia atrás: una
 *  parada solo entra, sale o se mueve antes de empezar (si no, una falla de un
 *  mes cerrado se volvería «programada» y los folios ya emitidos dejarían de
 *  cuadrar). */
export function validarConfig(c: Config, antes: Config, desdeMinimo: string, ahora: number): string[] {
  const e: string[] = []
  const nombre = (id: string) => CAMPOS.find(x => x.id === id)?.nombre ?? id
  const conocido = (id: string) => CAMPOS.some(x => x.id === id)
  if (!c.empresa.trim()) e.push('Falta el nombre de la empresa para el membrete.')
  // Un campo no se quita si alguna de sus metas midió un mes cerrado.
  for (const [cid, x] of Object.entries(antes.campos))
    if (!c.campos[cid] && x.metas.some(t => t.desde < desdeMinimo)) e.push(`${nombre(cid)}: no se puede quitar el campo: sus metas midieron meses que ya cerraron.`)
  for (const [cid, x] of Object.entries(c.campos)) {
    const id = nombre(cid)
    if (!conocido(cid)) e.push(`«${cid}» no es un campo registrado.`)
    // Sin un tramo, el campo no tendría contra qué medirse ni regla de cierre.
    if (!x.metas.length) e.push(`${id}: no tiene meta firmada; necesita al menos un tramo.`)
    const dias = new Set<string>()
    for (const t of x.metas) {
      if (!diaValido(t.desde)) { e.push(`${id}: «${t.desde}» no es un día (AAAA-MM-DD).`); continue }
      if (dias.has(t.desde)) e.push(`${id}: hay dos tramos que empiezan el ${fechaDia(t.desde)}.`)
      dias.add(t.desde)
      if (!(t.produccionBpd > 0 && t.produccionBpd <= TOPE_BPD)) e.push(`${id}: la meta de producción tiene que ser mayor que cero (y menor de ${cifra(TOPE_BPD)} bbl/d).`)
      if (!(t.diferidoMaxBpd >= 0 && t.diferidoMaxBpd <= TOPE_BPD)) e.push(`${id}: el máximo de diferido no puede ser negativo ni quedar vacío.`)
      if (!(t.criterioSinCausa >= 0 && t.criterioSinCausa <= 20)) e.push(`${id}: el máximo sin causa para publicar va entre 0 y 20 %.`)
      // Un precio presente tiene que ser un número entre 0 y el tope (Infinity y NaN no pasan).
      if (t.netbackUsd != null && !(t.netbackUsd >= 0 && t.netbackUsd <= TOPE_PRECIO_USD)) e.push(`${id}: el precio neto va entre 0 y ${cifra(TOPE_PRECIO_USD)} USD/bbl.`)
      const v = antes.campos[cid]?.metas.find(m => m.desde === t.desde)
      if ((!v || !mismoTramo(v, t)) && t.desde < desdeMinimo) e.push(`${id}: lo de un mes que ya cerró no se cambia (tiene que regir desde el ${fechaDia(desdeMinimo)} o después).`)
    }
    for (const t of antes.campos[cid]?.metas ?? [])
      if (t.desde < desdeMinimo && !x.metas.some(m => m.desde === t.desde)) e.push(`${id}: no se puede quitar la meta que regía desde el ${fechaDia(t.desde)}: es de un mes cerrado.`)
  }
  const idsTanque = new Set<string>(), bombasConTanque = new Set<string>()
  for (const t of c.tanques) {
    if (idsTanque.has(t.id)) e.push(`${t.id}: hay dos tanques con ese código.`)
    idsTanque.add(t.id)
    if (!conocido(t.campoId)) e.push(`${t.id}: «${t.campoId}» no es un campo registrado.`)
    if (!t.bomba.trim()) e.push(`${t.id}: falta la bomba que lo vacía.`)
    // Una bomba mide contra un solo tanque: con dos, el colchón no sabría cuál.
    else if (bombasConTanque.has(`${t.campoId}|${t.bomba}`)) e.push(`${t.bomba} de ${nombre(t.campoId)}: tiene más de un tanque declarado.`)
    bombasConTanque.add(`${t.campoId}|${t.bomba}`)
    if (!(t.capacidadBbl > 0 && Number.isFinite(t.capacidadBbl))) e.push(`${t.id}: la capacidad tiene que ser mayor que cero.`)
    if (!(t.altoAlto >= 0.5 && t.altoAlto <= 0.98)) e.push(`${t.id}: el alto-alto va entre 50 y 98 %.`)
    if (!t.tagNivel.trim()) e.push(`${t.id}: falta el transmisor de nivel.`)
  }
  const respaldos = new Set<string>()
  for (const r of c.respaldos) {
    if (respaldos.has(`${r.campoId}|${r.equipo}`)) e.push(`${r.equipo} de ${nombre(r.campoId)}: tiene dos respaldos declarados.`)
    respaldos.add(`${r.campoId}|${r.equipo}`)
    if (!(r.libreBpd >= 0 && r.libreBpd <= TOPE_BPD)) e.push(`${r.equipo} de ${nombre(r.campoId)}: la capacidad libre del respaldo no puede ser negativa ni quedar vacía.`)
  }
  const idsPrograma = new Set<string>()
  for (const p of c.programa) {
    // El id identifica la parada: dos con el mismo id harían pasar una nueva por «existente».
    if (idsPrograma.has(p.id)) e.push(`Programa ${p.equipo}: hay dos paradas con el código ${p.id}.`)
    idsPrograma.add(p.id)
    if (!conocido(p.campoId)) e.push(`Programa ${p.equipo}: «${p.campoId}» no es un campo registrado.`)
    const ini = Date.parse(p.desde), fin = Date.parse(p.hasta)
    if (!(Number.isFinite(ini) && Number.isFinite(fin) && ini < fin)) e.push(`Programa ${p.equipo}: el fin tiene que ser después del inicio.`)
    if (!alcanza(p.motivo, MOTIVO_MINIMO)) e.push(`Programa ${p.equipo}: falta el motivo.`)
    const v = antes.programa.find(x => x.id === p.id)
    const igual = v && v.campoId === p.campoId && v.equipo === p.equipo && Date.parse(v.desde) === ini && Date.parse(v.hasta) === fin
    // Lo que ya empezó pasó como programado o como falla: no se le cambian el equipo, el campo ni las fechas.
    if (v && Date.parse(v.desde) < ahora && !igual)
      e.push(`Programa ${v.equipo}: la parada ya empezó (${fechaHoraCo(v.desde)}); su equipo, su campo y sus fechas no se cambian.`)
    // Lo nuevo (o lo que se mueve) tiene que estar por venir: lo que ya pasó fue falla o restricción.
    else if (!igual && ini < ahora)
      e.push(`Programa ${p.equipo}: una parada solo se programa antes de que empiece; la que ya empezó no se vuelve programada.`)
  }
  for (const p of antes.programa)
    if (!c.programa.some(x => x.id === p.id) && Date.parse(p.desde) < ahora)
      e.push(`Programa ${p.equipo}: no se puede quitar una parada que ya empezó (${fechaDia(p.desde.slice(0, 10))}): pasó como programada.`)
  return e
}
