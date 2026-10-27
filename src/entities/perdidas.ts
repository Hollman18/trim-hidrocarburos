/** EL REGISTRO DE PÉRDIDAS (A2 · experiencia v3; PLAN-MAESTRO §2, punto 5; CHOKE-COMPLETO §6).
 *
 *  La pérdida es lo que ya salió del subsuelo y no se vende: una pitera, un
 *  derrame, el gas a la tea o al aire, el crudo que el cliente rechazó por
 *  especificación. Edinson [T 26:48]: «la pérdida es cuando ya estando en
 *  subsuelo hay un derramamiento de fluidos… o hay una ruptura de una línea»;
 *  [T 31:08]: «¿qué pasa si hay una pitera? Eso es una pérdida».
 *
 *  Reglas:
 *  - **Diferido no es pérdida.** El diferido sale del libro (lo que no se
 *    produjo); la pérdida sale de ESTE registro, aparte, y NUNCA se suma al
 *    diferido. Ningún barril diferido se pasa aquí.
 *  - **Nada inventado.** TRIM no calcula una pérdida: la registra una persona
 *    (oper, sup o prod: `perdidas:registrar`) con su volumen y cómo lo estimó.
 *    Sin registros en el período, la vista dice «sin registro» (`bbl: null`),
 *    nunca un 0: que nadie haya registrado no prueba que no se perdió nada.
 *  - **Solo por inserción (D1).** Corregir es otra inserción que nombra la que
 *    corrige (`corrige`) con su motivo; retirar un registro equivocado también
 *    (`retirar: true`, con motivo). Nada se borra: la historia de cada pérdida
 *    queda con quién dijo qué y cuándo. Rige la última versión de cada cadena.
 *  - **El período:** una pérdida cuenta ENTERA en el período donde empezó
 *    (`inicio`). Su volumen es una sola estimación: no se reparte por hora.
 *  - **El gas** (tea, venteo) va en KPC, aparte del crudo, y no entra en los
 *    barriles: hasta entender la «tolerancia diferente» del gas [T 31:08;
 *    PLAN-MAESTRO §3, «Gas»] el balance es de crudo.
 *  - **Lo escrito a mano** (`volumen.como`, `motivo`) se queda en TRIM: no va a
 *    la ANH ni a ningún informe (D2).
 *  - **Los barriles enteros**, con la regla de redondeo (`redondeo.ts`): el
 *    entero de cada campo una vez; cada registro, su parte por mayor residuo; el
 *    tipo y el tramo, la suma de sus registros.
 *
 *  Contrato: `POST /api/perdidas` (`aceptarPerdida`) y `GET /api/vistas/perdidas?campos&desde&hasta`
 *  (`vistaPerdidas`). */
import { ORDEN_CHOKE, type ChokeAnh } from './choke'
import { enteroDe, enterosPorId } from './redondeo'
import { MOTIVO_MINIMO, TEXTO_MAXIMO, TOPE_BPD, alcanza } from './reglas'
import { AHORA } from './reloj'

/* ───────────────────────────── las palabras ───────────────────────────── */

/** Los cinco tipos de pérdida (PLAN-MAESTRO §2, punto 5; el pedido de Edinson [T 30:10]). */
export type TipoPerdida = 'pitera' | 'derrame' | 'tea' | 'venteo' | 'rechazo'
export const TIPOS_PERDIDA: readonly TipoPerdida[] = ['pitera', 'derrame', 'tea', 'venteo', 'rechazo']
/** El botón del operador. */
export const NOMBRE_TIPO_PERDIDA: Record<TipoPerdida, string> = {
  pitera: 'Pitera', derrame: 'Derrame', tea: 'Tea', venteo: 'Venteo', rechazo: 'Rechazo',
}
/** La línea debajo del botón. */
export const EXPLICA_TIPO_PERDIDA: Record<TipoPerdida, string> = {
  pitera: 'Una fuga por un poro o una grieta de una línea o de un equipo',
  derrame: 'Crudo regado en tierra o en agua',
  tea: 'Gas quemado en la tea',
  venteo: 'Gas soltado al aire, sin quemar',
  rechazo: 'Crudo que el oleoducto o el cliente no recibió por especificación',
}
/** Cómo se sabe el volumen. */
export type FuenteVolumen = 'medido' | 'estimado'
export const FUENTES_VOLUMEN: readonly FuenteVolumen[] = ['medido', 'estimado']
export const NOMBRE_FUENTE_VOLUMEN: Record<FuenteVolumen, string> = { medido: 'Medido', estimado: 'Estimado' }

/** Lo que dice la pantalla sin registros: nunca un 0. */
export const SIN_REGISTRO = 'sin registro'
/** La ⓘ de la pérdida, en todas las vistas. */
export const EXPLICA_PERDIDA = 'La pérdida es lo que ya salió y no se vendió: pitera, derrame, tea, venteo o rechazo. La registra una persona con su volumen y cómo lo estimó. Va aparte y nunca se suma a lo diferido (lo que se dejó de producir). Sin registros, TRIM dice «sin registro»: que nadie la haya registrado no prueba que no se perdió nada.'

/** La versión de la regla con que se cuenta. */
export const REGLA_PERDIDAS = 'perdidas@1'

/* ───────────────────────────── el registro ───────────────────────────── */

export interface VolumenPerdida {
  /** Crudo perdido, bbl (0 si solo fue gas). */
  bbl: number
  /** Gas, KPC (mil pies cúbicos), si aplica. Nunca entra en los barriles. */
  gasKpc?: number
  fuente: FuenteVolumen
  /** Cómo se estimó o midió, en palabras de quien registra (5 a 500 caracteres). Se queda en TRIM (D2). */
  como: string
}

/** Una pérdida como la guarda el servidor: una inserción, nunca se edita. */
export interface RegistroPerdida {
  /** `PER-<campo>-<n>`. */
  id: string
  /** El consecutivo del servidor: el orden en que se registró. */
  n: number
  campoId: string
  tipo: TipoPerdida
  /** El tramo del choke donde ocurrió (CHOKE-COMPLETO §6: «con su propio choke, como dónde ocurrió»). */
  tramo: ChokeAnh
  /** El equipo o el punto: «LC-07», «Línea de flujo de LC-07», «TK-AG-CE». */
  donde: string
  /** La parada que la acompañó, si la hubo (el `EventoPozo.id`): su trazabilidad. */
  evento?: string
  /** Cuándo empezó y cuándo terminó, hora de Colombia con su zona; `fin` null = sigue. */
  inicio: string
  fin: string | null
  volumen: VolumenPerdida
  /** Quién y cuándo (los pone el servidor). */
  por: string
  porId: string
  rol: string
  hora: string
  /** La versión que corrige (o retira), y por qué. */
  corrige?: string
  motivo?: string
  /** Se retiró con motivo: queda en la historia y deja de contar. */
  retirada?: true
}

/** `POST /api/perdidas`: lo que manda la persona. `por`, `porId`, `rol`, `hora`,
 *  `id` y `n` los pone el servidor. */
export interface CuerpoPerdida {
  campoId: string
  tipo: TipoPerdida
  tramo: ChokeAnh
  donde: string
  evento?: string
  inicio: string
  fin?: string | null
  volumen: VolumenPerdida
  /** Corregir: el id de la versión que se corrige (la que rige) y el motivo. */
  corrige?: string
  motivo?: string
  /** Retirar un registro equivocado: con `corrige` y `motivo`. */
  retirar?: boolean
}

/** Un rechazo con su HTTP y su código del contrato. */
export interface RechazoPerdida { ok: false; estado: 400 | 403 | 404 | 409 | 422; codigo: string; error: string }
export type ResultadoPerdida = { ok: true; perdida: RegistroPerdida } | RechazoPerdida

/** Lo que el servidor sabe de quien escribe. */
export interface QuienRegistra {
  /** El rol (de `roles.ts`, sin respaldo); undefined si no es un rol del producto. */
  rol?: { id: string; nombre: string; puede: Readonly<Record<string, boolean>> }
  /** La persona con acceso activo con ese rol; undefined si no hay. */
  persona?: { id: string; nombre: string }
  /** Los campos que tiene asignados. */
  campos: readonly string[]
}

/** Lo máximo que se escribe en `donde` (un código de equipo o el nombre de un punto). */
export const MAXIMO_DONDE = 80
/** Un volumen de pérdida por encima de esto es un error de dedo. */
export const TOPE_PERDIDA = TOPE_BPD

const rechazo = (estado: RechazoPerdida['estado'], codigo: string, error: string): RechazoPerdida => ({ ok: false, estado, codigo, error })
const forma = (k: string, que: string) => rechazo(400, 'peticion-invalida', `La petición no tiene la forma del contrato: «${k}» ${que}.`)
const esTexto = (x: unknown): x is string => typeof x === 'string'
/** Una hora con su zona: sin zona cada servidor la leería en la suya. */
const conZona = (x: string) => /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(x) && Number.isFinite(Date.parse(x))
/** Hora de Colombia con su zona: «2026-10-02T09:10:00-05:00». */
export const isoCo = (t: number) => `${new Date(t - 5 * 3_600_000).toISOString().slice(0, 19)}-05:00`

/** Las versiones que rigen: las que nadie corrigió. */
export function vigentes(registros: readonly RegistroPerdida[]): RegistroPerdida[] {
  const corregidas = new Set(registros.flatMap(r => (r.corrige ? [r.corrige] : [])))
  return registros.filter(r => !corregidas.has(r.id))
}

/** La historia de una versión: de la primera a ella, siguiendo `corrige`. */
export function historiaDe(registros: readonly RegistroPerdida[], id: string): RegistroPerdida[] {
  const porId = new Map(registros.map(r => [r.id, r]))
  const out: RegistroPerdida[] = []
  const vistos = new Set<string>()
  for (let r = porId.get(id); r && !vistos.has(r.id); r = r.corrige ? porId.get(r.corrige) : undefined) { vistos.add(r.id); out.unshift(r) }
  return out
}

/** `POST /api/perdidas`: las reglas del servidor, en este orden (400 primero, C-12):
 *  la forma (400); el rol (403 `rol-desconocido`), la capacidad (403
 *  `sin-capacidad`) y la persona (403 `sin-persona`); el campo (404
 *  `campo-desconocido`, 403 `campo-ajeno`); los valores (422); la versión que se
 *  corrige (404 `perdida-desconocida`, 409 `ya-corregida`). Aceptada, devuelve
 *  el registro nuevo: nunca cambia uno que ya estaba. */
export function aceptarPerdida(c: unknown, quien: QuienRegistra, registros: readonly RegistroPerdida[], campos: readonly string[],
  hora: string, ahora: number = AHORA.getTime()): ResultadoPerdida {
  // 1. La forma (400): lo que no la tiene se dice en palabras, nunca revienta.
  if (!c || typeof c !== 'object' || Array.isArray(c)) return rechazo(400, 'peticion-invalida', 'La petición no tiene la forma del contrato: el cuerpo tiene que ser un objeto.')
  const b = c as Record<string, unknown>
  for (const k of ['campoId', 'tipo', 'tramo', 'donde', 'inicio'] as const) if (!esTexto(b[k])) return forma(k, b[k] == null ? 'falta' : 'tiene que ser un texto')
  for (const k of ['evento', 'corrige', 'motivo'] as const) if (b[k] != null && !esTexto(b[k])) return forma(k, 'tiene que ser un texto')
  if (b.fin != null && !esTexto(b.fin)) return forma('fin', 'tiene que ser un texto o null')
  if (b.retirar != null && typeof b.retirar !== 'boolean') return forma('retirar', 'tiene que ser sí o no (true o false)')
  const v = b.volumen as Record<string, unknown> | undefined
  if (!v || typeof v !== 'object' || Array.isArray(v)) return forma('volumen', v == null ? 'falta' : 'tiene que ser un objeto')
  if (typeof v.bbl !== 'number') return forma('volumen.bbl', v.bbl == null ? 'falta' : 'tiene que ser un número')
  if (v.gasKpc != null && typeof v.gasKpc !== 'number') return forma('volumen.gasKpc', 'tiene que ser un número')
  if (!esTexto(v.fuente)) return forma('volumen.fuente', v.fuente == null ? 'falta' : 'tiene que ser un texto')
  if (!esTexto(v.como)) return forma('volumen.como', v.como == null ? 'falta' : 'tiene que ser un texto')
  const x = b as unknown as CuerpoPerdida
  // 2. Quién (403).
  if (!quien.rol) return rechazo(403, 'rol-desconocido', 'Su rol no está entre los del producto: no escribe nada.')
  if (!quien.rol.puede['perdidas:registrar']) return rechazo(403, 'sin-capacidad', 'Las pérdidas las registra operación o producción: su rol no las registra.')
  if (!quien.persona) return rechazo(403, 'sin-persona', 'Nadie con acceso activo tiene este rol: registra una persona con acceso, no un rol.')
  // 3. El campo (404 si no existe; 403 si no es suyo).
  if (!campos.includes(x.campoId)) return rechazo(404, 'campo-desconocido', `«${x.campoId}» no es un campo registrado.`)
  if (!quien.campos.includes(x.campoId)) return rechazo(403, 'campo-ajeno', 'Ese campo no lo tiene asignado: no se registró nada.')
  // 4. Los valores (422).
  if (!(TIPOS_PERDIDA as readonly string[]).includes(x.tipo)) return rechazo(422, 'tipo-desconocido', `El tipo de pérdida es ${TIPOS_PERDIDA.join(', ')}.`)
  if (!(ORDEN_CHOKE as readonly string[]).includes(x.tramo)) return rechazo(422, 'tramo-desconocido', `El tramo es ${ORDEN_CHOKE.join(', ')}.`)
  const donde = x.donde.trim()
  if (!donde) return rechazo(422, 'sin-donde', 'Falta dónde: el equipo o el punto de la pérdida.')
  if (donde.length > MAXIMO_DONDE) return rechazo(422, 'texto-largo', `«donde» es de ${MAXIMO_DONDE} caracteres o menos: el código del equipo o el nombre del punto.`)
  if (!conZona(x.inicio)) return rechazo(422, 'hora-invalida', '«inicio» tiene que ser una hora con su zona («2026-10-02T09:10:00-05:00»).')
  if (x.fin != null && !conZona(x.fin)) return rechazo(422, 'hora-invalida', '«fin» tiene que ser una hora con su zona, o null si sigue.')
  const t0 = Date.parse(x.inicio), t1 = x.fin == null ? undefined : Date.parse(x.fin)
  if (t0 > ahora) return rechazo(422, 'en-el-futuro', 'La pérdida no puede empezar después de ahora.')
  if (t1 !== undefined && t1 < t0) return rechazo(422, 'fin-antes-de-inicio', 'El fin tiene que ser después del inicio.')
  if (t1 !== undefined && t1 > ahora) return rechazo(422, 'en-el-futuro', 'El fin no puede ser después de ahora: si sigue, mande «fin»: null.')
  const vol = x.volumen
  const gas = vol.gasKpc
  if (!(Number.isFinite(vol.bbl) && vol.bbl >= 0 && vol.bbl <= TOPE_PERDIDA)) return rechazo(422, 'volumen-invalido', 'El volumen de crudo va de 0 bbl en adelante (0 si solo fue gas).')
  if (gas !== undefined && !(Number.isFinite(gas) && gas >= 0 && gas <= TOPE_PERDIDA)) return rechazo(422, 'volumen-invalido', 'El gas va de 0 KPC en adelante.')
  if (!(vol.bbl > 0 || (gas ?? 0) > 0)) return rechazo(422, 'sin-volumen', 'Falta el volumen: los barriles de crudo o los KPC de gas que se perdieron.')
  if (!(FUENTES_VOLUMEN as readonly string[]).includes(vol.fuente)) return rechazo(422, 'fuente-desconocida', 'El volumen es medido o estimado.')
  if (!alcanza(vol.como, MOTIVO_MINIMO)) return rechazo(422, 'sin-como', 'Falta cómo se estimó o midió el volumen (por ejemplo, «aforo del tanque» o «charco de 3 × 2 m»).')
  for (const [k, t] of [['volumen.como', vol.como], ['motivo', x.motivo], ['evento', x.evento]] as const)
    if (t !== undefined && t.length > TEXTO_MAXIMO) return rechazo(422, 'texto-largo', `«${k}» es de ${TEXTO_MAXIMO} caracteres o menos: escriba lo esencial.`)
  if (x.retirar && x.corrige === undefined) return rechazo(422, 'retirar-sin-corrige', 'Para retirar un registro, diga cuál («corrige») y por qué.')
  // 5. La versión que se corrige: existe, es del campo y todavía rige (D1).
  let antes: RegistroPerdida | undefined
  if (x.corrige !== undefined) {
    antes = registros.find(r => r.id === x.corrige && r.campoId === x.campoId)
    if (!antes) return rechazo(404, 'perdida-desconocida', 'Esa pérdida no está entre las registradas de ese campo.')
    if (!alcanza(x.motivo, MOTIVO_MINIMO)) return rechazo(422, 'falta-motivo', 'Falta el motivo: diga por qué se corrige o se retira.')
    if (registros.some(r => r.corrige === antes!.id)) return rechazo(409, 'ya-corregida', 'Mientras la corregía, alguien ya corrigió esta pérdida: vuelva a abrirla para ver cómo quedó.')
  }
  // Aceptada: un registro nuevo, con lo que el servidor aceptó campo por campo.
  const n = registros.reduce((a, r) => Math.max(a, r.n), 0) + 1
  const como = vol.como.trim()
  const motivo = x.motivo?.trim()
  const perdida: RegistroPerdida = {
    id: `PER-${x.campoId}-${String(n).padStart(4, '0')}`, n, campoId: x.campoId, tipo: x.tipo, tramo: x.tramo, donde,
    ...(x.evento?.trim() ? { evento: x.evento.trim() } : {}),
    inicio: isoCo(t0), fin: t1 === undefined ? null : isoCo(t1),
    volumen: { bbl: vol.bbl, ...(gas !== undefined ? { gasKpc: gas } : {}), fuente: vol.fuente, como },
    por: `${quien.persona.nombre} · ${quien.rol.nombre.toLowerCase()}`, porId: quien.persona.id, rol: quien.rol.id, hora,
    ...(antes ? { corrige: antes.id } : {}), ...(motivo && antes ? { motivo } : {}), ...(x.retirar ? { retirada: true as const } : {}),
  }
  return { ok: true, perdida }
}

/* ───────────────────────────── la vista ───────────────────────────── */

/** Una pérdida que rige, con su historia y su entero. */
export interface PerdidaVigente extends RegistroPerdida {
  /** Las versiones anteriores, de la primera a la que esta corrigió (quién dijo qué y cuándo). */
  historia: RegistroPerdida[]
  /** Sus barriles enteros (la regla de redondeo: Σ = el entero del campo). */
  bblEntero: number
}

/** Lo perdido de un grupo: los barriles (exactos y enteros), el gas y cuántos eventos. */
export interface CifraPerdida { bbl: number; bblEntero: number; gasKpc: number; eventos: number }

export interface VistaPerdidas {
  campos: string[]
  desde: Date
  hasta: Date
  /** `sin-registro`: ninguna pérdida registrada en el período; las cifras van en null. */
  estado: 'sin-registro' | 'con-registro'
  /** Σ de los barriles del período; null = sin registro (nunca un 0 inventado). */
  bbl: number | null
  /** El entero: Σ de los enteros de cada campo. */
  bblEntero: number | null
  /** El gas, KPC; null = sin registro de gas. */
  gasKpc: number | null
  /** Por campo (null = sin registro en ese campo). */
  porCampo: Array<{ campoId: string; bbl: number | null; bblEntero: number | null; gasKpc: number | null }>
  /** Por tipo, de más a menos barriles (solo los que tienen registros). */
  porTipo: Array<CifraPerdida & { tipo: TipoPerdida; nombre: string }>
  /** Por tramo del choke, en el orden de la tubería (solo los que tienen registros). */
  porTramo: Array<CifraPerdida & { tramo: ChokeAnh }>
  /** Las que rigen en el período, de la más reciente a la más vieja (sin las retiradas). */
  filas: PerdidaVigente[]
  /** Las retiradas con motivo en el período: no cuentan, pero se ven. */
  retiradas: PerdidaVigente[]
  /** «Sin registro de pérdidas en el período» o «12 bbl perdidos en 2 eventos». */
  texto: string
  explica: string
  regla: typeof REGLA_PERDIDAS
}

/** ¿Cuenta en el período? Entera, donde empezó. */
const enPeriodo = (r: RegistroPerdida, d0: number, h0: number) => { const t = Date.parse(r.inicio); return t >= d0 && t < h0 }

/** Las pérdidas que rigen en el período, por campo, con el entero de cada una
 *  (la regla de redondeo). Lo usan la vista y el balance. */
export function perdidasDelPeriodo(campos: readonly string[], desde: Date, hasta: Date, registros: readonly RegistroPerdida[]): {
  filas: PerdidaVigente[]; retiradas: PerdidaVigente[]; porCampo: Map<string, { exacto: number; entero: number; gasKpc: number; filas: PerdidaVigente[] }>
} {
  const d0 = desde.getTime(), h0 = Math.min(hasta.getTime(), AHORA.getTime() + 1)
  const rigen = vigentes(registros).filter(r => campos.includes(r.campoId) && enPeriodo(r, d0, h0))
  const conHistoria = (r: RegistroPerdida, bblEntero: number): PerdidaVigente => ({ ...r, historia: historiaDe(registros, r.id).slice(0, -1), bblEntero })
  const porCampo = new Map<string, { exacto: number; entero: number; gasKpc: number; filas: PerdidaVigente[] }>()
  const filas: PerdidaVigente[] = []
  for (const c of campos) {
    const xs = rigen.filter(r => r.campoId === c && !r.retirada)
    if (!xs.length) continue
    const exacto = xs.reduce((a, r) => a + r.volumen.bbl, 0)
    const entero = enteroDe(exacto)
    const enteros = enterosPorId(entero, xs.map(r => ({ id: r.id, valor: r.volumen.bbl })))
    const fs = xs.map(r => conHistoria(r, enteros[r.id] ?? 0))
    porCampo.set(c, { exacto, entero, gasKpc: xs.reduce((a, r) => a + (r.volumen.gasKpc ?? 0), 0), filas: fs })
    filas.push(...fs)
  }
  const recientes = (a: RegistroPerdida, b: RegistroPerdida) => Date.parse(b.inicio) - Date.parse(a.inicio) || b.n - a.n
  const retiradas = rigen.filter(r => r.retirada).map(r => conHistoria(r, 0)).sort(recientes)
  return { filas: filas.sort(recientes), retiradas, porCampo }
}

/** Suma un grupo de pérdidas que ya tienen su entero. */
export const cifraDe = (fs: readonly PerdidaVigente[]): CifraPerdida => ({
  bbl: fs.reduce((a, f) => a + f.volumen.bbl, 0), bblEntero: fs.reduce((a, f) => a + f.bblEntero, 0),
  gasKpc: fs.reduce((a, f) => a + (f.volumen.gasKpc ?? 0), 0), eventos: fs.length,
})

const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** `GET /api/vistas/perdidas?campos&desde&hasta`. */
export function vistaPerdidas(q: { campos: string[]; desde: Date; hasta: Date }, registros: readonly RegistroPerdida[]): VistaPerdidas {
  const { filas, retiradas, porCampo } = perdidasDelPeriodo(q.campos, q.desde, q.hasta, registros)
  const hay = filas.length > 0
  const total = hay ? cifraDe(filas) : undefined
  const porTipo = TIPOS_PERDIDA.flatMap(tipo => { const fs = filas.filter(f => f.tipo === tipo); return fs.length ? [{ tipo, nombre: NOMBRE_TIPO_PERDIDA[tipo], ...cifraDe(fs) }] : [] })
    .sort((a, b) => b.bbl - a.bbl || b.gasKpc - a.gasKpc)
  const porTramo = ORDEN_CHOKE.flatMap(tramo => { const fs = filas.filter(f => f.tramo === tramo); return fs.length ? [{ tramo, ...cifraDe(fs) }] : [] })
  const gas = total && filas.some(f => f.volumen.gasKpc !== undefined) ? total.gasKpc : null
  const eventos = (n: number) => `${n} ${n === 1 ? 'evento' : 'eventos'}`
  const texto = !total ? 'Sin registro de pérdidas en el período'
    : `${FMT_N0.format(total.bblEntero)} bbl perdidos en ${eventos(total.eventos)}${gas ? ` y ${FMT_N0.format(gas)} KPC de gas` : ''}`
  return {
    campos: [...q.campos], desde: q.desde, hasta: q.hasta, estado: hay ? 'con-registro' : 'sin-registro',
    bbl: total ? total.bbl : null, bblEntero: total ? total.bblEntero : null, gasKpc: gas,
    porCampo: q.campos.map(c => {
      const x = porCampo.get(c)
      return { campoId: c, bbl: x ? x.exacto : null, bblEntero: x ? x.entero : null, gasKpc: x && x.filas.some(f => f.volumen.gasKpc !== undefined) ? x.gasKpc : null }
    }),
    porTipo, porTramo, filas, retiradas, texto, explica: EXPLICA_PERDIDA, regla: REGLA_PERDIDAS,
  }
}
