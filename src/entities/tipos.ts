import type { TipoServicio } from './pozos'

/** Severidad según la práctica de alarmas industriales.
 *  0 = normal. El color se reserva para lo anormal. */
export type Severidad = 0 | 1 | 2 | 3

export type EstadoDispositivo = 'normal' | 'aviso' | 'atencion' | 'alarma' | 'sin señal'

/** Una serie del historiador (`GET …/tags/:tag/serie`, CONTRATO.md): el
 *  instante del primer valor, el paso y los valores a ese paso. El valor `i`
 *  es el de `desde + i × pasoH`; un hueco del historiador va como `null` en su
 *  lugar, nunca se salta. Así el tiempo de cada punto es el real: el vigía mide
 *  pendientes por hora con la cadencia que traiga la serie (un día, una hora,
 *  un minuto) y un hueco no le comprime el eje. */
export interface SerieTag {
  /** ISO 8601 con zona: el instante del primer valor. */
  desde: string
  /** Horas entre un valor y el siguiente (mayor que cero). */
  pasoH: number
  valores: Array<number | null>
}

export interface Dispositivo {
  tag: string
  tipo: string
  valor: number | string
  unidad: string
  estado: EstadoDispositivo
  origen: string
  limite: string
  /** Serie del historiador para la minigráfica y el vigía. Solo en variables continuas. */
  serie?: SerieTag
  /** Solo donde de verdad la hay: instrumentos de medición en custodia. */
  calibracion?: string
}

/** En marcha, detenido por su propia causa, cerrado porque otro equipo lo
 *  paró (un pozo que cerró la bomba: es consecuencia, no su falla) o sin
 *  lectura en ese campo. */
export type Marcha = 'en-marcha' | 'detenido' | 'cerrado-por-otro' | 'sin-lectura'

export interface Equipo {
  id: string
  nombre: string
  sistema: string
  severidad: Severidad
  /** Cómo está la máquina, para decidir (si está parada, el vigía no
   *  proyecta y SAP recibe un aviso de avería). Es un código: el texto de
   *  `estado` es para leer y puede venir redactado de cualquier forma. */
  marcha: Marcha
  /** El estado dicho para la pantalla («en marcha · succión cayendo»). */
  estado: string
  /* Los barriles que difiere un equipo NO viven en el catálogo: salen del
     libro de diferidos para el período que se mire. */
  criticidad: 1 | 2 | 3 | 4 | 5
  aguasAbajo: string
  redundancia: string
  modoFalla: string
  norma: string
  lectura: string
  dispositivos: Dispositivo[]
  /** Si la máquina solo existe en algunos campos. Sin esto, el catálogo
   *  (que describe La Ceiba) la pondría en todos. */
  soloEn?: string[]
  /** Servicio o equipo de proceso que, al caer, apaga pozos: qué tipo de causa
   *  se le carga. Es del registro del equipo (su clase), no de su id: un
   *  cliente con otro compresor de aire lo declara igual y la regla no cambia. */
  servicio?: TipoServicio
  /** Computador de flujo del punto de medición oficial: el tag cuyo valor es
   *  el fiscal del día (lo que dice el libro). Del registro, no de un id fijo. */
  fiscal?: string

  /* ── Lo que cada rol necesita para actuar. Lo que no esté declarado sale
        como hueco con su origen; no se estima. ── */

  /** Para ir al equipo. */
  intervencion?: {
    ubicacion: string
    accionInmediata: string
    avisarA: string
  }
  /** Reparto de modos de falla de la familia, con su fuente (literatura). La
   *  historia de fallas de ESTE equipo no vive aquí: sale del PLC. */
  distribucionFalla?: { reparto: Array<[string, number]>; fuente: string }
}

/** Qué se hace con el gas del campo. «no» = el campo no tiene tren de gas. */
export type DestinoGas = 'no' | 'tea' | 'consumo' | 'venta'

/** Un campo del registro de la empresa (`GET /api/campos`): quién es y
 *  dónde está. Las metas, el perfil y el precio NO viven aquí: son de la
 *  configuración firmada (`configuracion.ts`); producción, potencial y
 *  diferido salen de los equipos (`libro.ts`, `diferido.ts`). */
export interface Campo {
  id: string
  nombre: string
  cuenca: string
  /** Qué limita al campo, dicho por la operación. Descriptivo. */
  choke: 'Pozos' | 'Planta' | 'Evacuación' | 'Mercado'
  nota: string
  /** Un id que el registro de campos no conoce (`campoPorId`): se muestra como hueco, nunca como otro campo. */
  desconocido?: true
}

/** Con qué arranca la configuración de un campo en el DEMO (la semilla). En
 *  producción la configuración de arranque la firma el servidor; esto no viaja. */
export interface SemillaCampo {
  /** Metas de arranque, en bbl/d. Las que rigen son las de la configuración firmada. */
  meta: { produccionBpd: number; diferidoMaxBpd: number }
  /** Qué maneja el campo y qué familias de equipo tiene, al arrancar. */
  perfil: { gas: DestinoGas; bombas: boolean; electrosumergibles: boolean }
  /** Si arranca con precio neto configurado. */
  economiaConfigurada: boolean
}

export interface Rol {
  id: string
  nombre: string
  persona: string
  iniciales: string
  pantallas: string[]
  inicio: string
  foco: string
  /** Capacidades, no roles. El servidor es la fuente de verdad. */
  puede: Record<Capacidad, boolean>
  /** Proyección del árbol de activos. null = este rol no navega por activo. */
  topologia: 'proceso' | 'produccion' | 'medicion' | null
  /** Dónde cuelga en el organigrama. */
  area: AreaRol
  /** Campos asignados. Un operador suele tener uno; un gerente de activo,
   *  todos. El portafolio solo existe para quien tiene más de uno. */
  campos: 'todos' | string[]
  /** Cuánto detalle ve en cada pantalla. Los números son los mismos; cambia
   *  lo que se muestra. */
  nivel: NivelDetalle
}

/** decision: barriles, valor, tendencia, quién se los lleva y si está parado
 *  o en riesgo · operacion: qué está parado, qué se pierde, qué hacer, solo la
 *  variable que está fuera · ingenieria: todo (señales, partes, vigía,
 *  tolerancias, custodia). */
export type NivelDetalle = 'decision' | 'operacion' | 'ingenieria'

export type AreaRol = 'direccion' | 'produccion' | 'mantenimiento' | 'soporte' | 'plataforma'

export const AREAS: Array<{ id: AreaRol; nombre: string }> = [
  { id: 'direccion', nombre: 'Dirección' },
  { id: 'produccion', nombre: 'Producción y operaciones' },
  { id: 'mantenimiento', nombre: 'Mantenimiento y confiabilidad' },
  { id: 'soporte', nombre: 'Soporte y cumplimiento' },
  { id: 'plataforma', nombre: 'Plataforma' },
]

/** Permisos que el servidor revisa, cada uno en su endpoint (`roles.ts`). */
export type Capacidad =
  | 'causa:declarar'
  | 'causa:completar'
  | 'evidencia:exportar'
  | 'conector:configurar'
  /** Firmar la configuración técnica: tanques, respaldos, programa, perfil de los campos y membrete. */
  | 'config:firmar'
  /** Firmar las metas de producción y de diferidos de cada campo, su precio neto y su regla de cierre. */
  | 'metas:firmar'
  /** Dar acceso a otras personas: invitar, cambiar rol o campos, suspender. */
  | 'usuarios:administrar'
  /** Enviarle a SAP un aviso de mantenimiento con la evidencia de TRIM. */
  | 'sap:aviso'
  /** Cargar (o reemplazar) la asignación oficial que reportó la operadora, para cotejarla. */
  | 'asignacion:cargar'

export const CAPACIDAD_NOMBRE: Record<Capacidad, string> = {
  'causa:declarar': 'Responder qué se dañó cuando la señal no lo explica',
  'causa:completar': 'Completar el análisis de la falla: mecanismo y causa raíz',
  'evidencia:exportar': 'Exportar evidencia con folio',
  'conector:configurar': 'Configurar conectores y tags',
  'config:firmar': 'Firmar la configuración técnica: tanques, respaldos de bombas, programa de paradas, perfil de los campos y membrete',
  'metas:firmar': 'Fijar y firmar las metas de producción y de diferidos de cada campo, con su precio neto y su regla de cierre',
  'usuarios:administrar': 'Dar acceso a las demás personas: invitar, cambiar rol o campos, suspender',
  'sap:aviso': 'Enviarle a SAP el aviso de mantenimiento de un equipo (la orden la crea el planeador en SAP)',
  'asignacion:cargar': 'Cargar la asignación oficial que reportó la operadora, pozo por pozo, para cotejarla con la de TRIM',
}

/** Lo que una capacidad ya trae de otra. Con `causa:completar` también se
 *  responde qué se dañó: el contrato le abre `POST /api/paradas/:evento/respuesta`
 *  a las dos (el jefe de mantenimiento y confiabilidad abren el equipo y lo
 *  ven). La regla vive aquí, una vez: la revisan la escritura, la pantalla de
 *  causa, la ficha y Mi perfil, que así no niega lo que el sistema deja hacer. */
const INCLUYE: Partial<Record<Capacidad, Capacidad[]>> = { 'causa:completar': ['causa:declarar'] }

/** Si un rol puede hacer lo que pide la capacidad: por sí misma o porque otra
 *  que tiene la incluye. */
export function puedeHacer(puede: Record<Capacidad, boolean>, k: Capacidad): boolean {
  return puede[k] || (Object.entries(INCLUYE) as Array<[Capacidad, Capacidad[]]>).some(([otra, ks]) => puede[otra] && ks.includes(k))
}

/** Los permisos como los muestra Mi perfil: concedido todo lo que puede hacer
 *  (también lo que ya trae otra capacidad suya) y negado solo lo que no. Cada
 *  nombre dice lo que la capacidad agrega, para que una línea negada no
 *  vuelva a negar algo que el rol sí hace. */
export function permisosDelRol(puede: Record<Capacidad, boolean>): { concedidas: Capacidad[]; negadas: Capacidad[] } {
  const todas = Object.keys(puede) as Capacidad[]
  return { concedidas: todas.filter(k => puedeHacer(puede, k)), negadas: todas.filter(k => !puedeHacer(puede, k)) }
}

/** Los períodos de la cabecera. Un id que no es uno de estos no es un
 *  período: se valida en el borde (la dirección) y no se cambia por otro. */
export type IdPeriodo = 'curso' | 'cerrado' | 'trimestre' | 'ytd' | 'doce'

export interface Periodo {
  /** Uno de la cabecera, o «medida» para un rango escogido a mano. */
  id: IdPeriodo | 'medida'
  nombre: string
  detalle: string
  parcial: boolean
}
