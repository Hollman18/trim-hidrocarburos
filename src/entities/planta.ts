/** Modelo de planta.
 *
 *  Aquí NO hay coordenadas a mano. Cada campo declara QUÉ tiene —su tronco,
 *  sus tres trenes y sus servicios industriales— y `armar()` calcula dónde va
 *  cada cosa. Agregar un pozo, un tanque o una máquina en la configuración
 *  cambia el esquema solo, sin tocar el dibujo.
 */

export type Corriente = 'multi' | 'crudo' | 'gas' | 'agua' | 'elec' | 'aire'

export type Simbolo =
  | 'pozos' | 'manifold' | 'separador' | 'depurador' | 'tratador' | 'tanque'
  | 'medicion' | 'compresor' | 'bomba' | 'inyeccion' | 'tea' | 'subestacion'
  | 'aire' | 'salida'

export interface Miembro {
  id: string
  etiqueta: string
  /** Equipo del catálogo. Sin esto, está configurado pero sin instrumentar. */
  equipo?: string
  pie?: string
  nivelDe?: { tag: string; tope: number }
  fluido?: Corriente
  /** Punto de medición oficial: se marca porque cambia quién lo puede tocar. */
  pmo?: string
}

export interface Elemento extends Miembro {
  simbolo: Simbolo
  /** Cuelga del anterior y no continúa la cadena (la tea, por ejemplo). */
  rama?: boolean
  /** Varios del mismo tipo: pozos, tanques en especificación… */
  miembros?: Miembro[]
  /** Configurados pero no dibujados uno a uno, para no llenar la pantalla. */
  restantes?: { cuantos: number; etiqueta: string }
}

export interface Caudales {
  crudo: number; crudoCap: number
  agua: number; aguaCap: number
  gas: number; gasCap: number
}

/** Los cuatro cuellos de botella del modelo de NSTA/SPE. El potencial del
 *  campo es el MENOR de los cuatro; el de planta, a su vez, es el menor de
 *  los tres trenes. Son valores por campo, no una tabla fija. */
export interface Chokes { pozos: number; planta: number; evacuacion: number; mercado: number }

/** La topología de planta de un campo (trenes, caudales, cuellos). Se llama
 *  así y no `ConfigCampo`: ese nombre es el de las metas y el perfil firmados
 *  (configuracion.ts), y dos tipos con el mismo nombre y distinto significado
 *  compilaban con el del módulo equivocado mientras los campos coincidieran. */
export interface PlantaCampo {
  tronco: Elemento[]
  gas: Elemento[]
  crudo: Elemento[]
  agua: Elemento[]
  servicios: Elemento[]
  caudales: Caudales
  chokes: Chokes
  nota: string
}

/** Capacidad de cada tren expresada en barriles de crudo, que es la única
 *  forma de compararlos. El que menos deja pasar es el que manda en planta. */
export const trenesEnCrudo = (c: Caudales) => [
  { tren: 'Crudo', cap: c.crudoCap, uso: (c.crudo / c.crudoCap) * 100 },
  { tren: 'Agua', cap: Math.round(c.aguaCap * (c.crudo / c.agua)), uso: (c.agua / c.aguaCap) * 100 },
  // Un campo sin tren de gas no tiene ese cuello de botella.
  ...(c.gasCap > 0 ? [{ tren: 'Gas', cap: Math.round(c.gasCap * (c.crudo / c.gas)), uso: (c.gas / c.gasCap) * 100 }] : []),
]

export const NOMBRE_CORRIENTE: Record<Corriente, string> = {
  multi: 'Multifásico', crudo: 'Crudo', gas: 'Gas', agua: 'Agua producida',
  elec: 'Energía eléctrica', aire: 'Aire de instrumentos',
}

/* ───────────────────────── Configuración por campo ───────────────────────── */

/** Cada pozo tiene su controlador: su estado lo da él mismo (equipo-vivo.ts). */
const pozo = (id: string, etiqueta: string): Miembro => ({ id, etiqueta, equipo: id })

const tanque = (id: string, etiqueta: string, equipo?: string, pmo?: string): Miembro =>
  ({ id, etiqueta, equipo, pmo, fluido: 'crudo',
     nivelDe: equipo ? { tag: 'LI-1102', tope: 18.5 } : undefined,
     pie: equipo ? undefined : 'sin instrumentar' })

const SERVICIOS: Elemento[] = [
  { id: 'subestacion', etiqueta: 'Subestación 13,8 kV', simbolo: 'subestacion', equipo: 'SE-2' },
  { id: 'aire', etiqueta: 'Aire de instrumentos', simbolo: 'aire', equipo: 'K-101' },
]

export const CAMPO_PLANTA: Record<string, PlantaCampo> = {
  ceiba: {
    tronco: [
      { id: 'pozos', etiqueta: 'Pozos productores', simbolo: 'pozos',
        miembros: [
          pozo('LC-14', 'LC-14 · ESP'),
          pozo('LC-09', 'LC-09 · ESP'),
          pozo('LC-21', 'LC-21 · bombeo mecánico'),
        ],
        restantes: { cuantos: 15, etiqueta: 'en la pantalla de pozos' } },
      { id: 'manifold', etiqueta: 'Manifold de producción', simbolo: 'manifold', pie: 'cabezal común' },
      { id: 'separador', etiqueta: 'Separador trifásico', simbolo: 'separador', equipo: 'V-101' },
    ],
    gas: [
      { id: 'depurador', etiqueta: 'Depurador de gas', simbolo: 'depurador', pie: 'proceso' },
      { id: 'tea', etiqueta: 'Tea / quemador', simbolo: 'tea', pie: 'alivio', rama: true },
      { id: 'compresor', etiqueta: 'Compresor de gas', simbolo: 'compresor', equipo: 'C-401' },
      { id: 'gasventa', etiqueta: 'Gas a venta', simbolo: 'salida', pie: 'límite de batería' },
    ],
    crudo: [
      { id: 'tratador', etiqueta: 'Tratador térmico', simbolo: 'tratador', equipo: 'H-302' },
      { id: 'tanques', etiqueta: 'Tanques en especificación', simbolo: 'tanque', equipo: 'TK-102',
        fluido: 'crudo', nivelDe: { tag: 'LI-1102', tope: 18.5 },
        miembros: [
          tanque('TK-102', 'TK-102 · PMO-02', 'TK-102', 'PMO-02'),
          tanque('TK-101', 'TK-101 · respaldo'),
        ] },
      { id: 'lact', etiqueta: 'Unidad LACT', simbolo: 'medicion', equipo: 'LACT-01', pmo: 'PMO-01' },
      { id: 'oleoducto', etiqueta: 'Oleoducto', simbolo: 'salida', pie: 'límite de batería' },
    ],
    agua: [
      { id: 'bomba', etiqueta: 'Bomba de reinyección', simbolo: 'bomba', equipo: 'P-201B' },
      { id: 'tanqueAgua', etiqueta: 'Tanque de agua', simbolo: 'tanque', pie: 'proceso', fluido: 'agua' },
      { id: 'inyeccion', etiqueta: 'Pozos inyectores', simbolo: 'inyeccion', pie: 'disposición' },
    ],
    servicios: SERVICIOS,
    chokes: { pozos: 12500, planta: 11800, evacuacion: 14000, mercado: 15000 },
    caudales: { crudo: 10450, crudoCap: 12000, agua: 19180, aguaCap: 20400, gas: 3850, gasCap: 4200 },
    nota: 'La bomba que mueve el agua no tiene respaldo: si para, el tanque se llena y se cierran los pozos. Es el cuello de botella del campo.',
  },

  morichal: {
    tronco: [
      { id: 'pozos', etiqueta: 'Pozos productores', simbolo: 'pozos',
        miembros: [
          pozo('MN-41', 'MN-41 · ESP'),
          pozo('MN-07', 'MN-07 · ESP'),
          pozo('MN-18', 'MN-18 · ESP'),
          pozo('MN-33', 'MN-33 · ESP'),
        ],
        restantes: { cuantos: 37, etiqueta: 'en la pantalla de pozos' } },
      { id: 'mpp', etiqueta: 'Bomba multifásica · clúster norte', simbolo: 'bomba', equipo: 'MPP-301' },
      { id: 'manifold', etiqueta: 'Manifold de producción', simbolo: 'manifold', pie: 'cabezal común' },
      { id: 'separador', etiqueta: 'Separador trifásico', simbolo: 'separador', equipo: 'V-101' },
    ],
    gas: [
      { id: 'depurador', etiqueta: 'Depurador de gas', simbolo: 'depurador', pie: 'proceso' },
      { id: 'tea', etiqueta: 'Tea / quemador', simbolo: 'tea', pie: 'alivio', rama: true },
      { id: 'compresor', etiqueta: 'Compresor de gas', simbolo: 'compresor', equipo: 'C-401' },
      { id: 'gasventa', etiqueta: 'Gas a venta', simbolo: 'salida', pie: 'límite de batería' },
    ],
    crudo: [
      { id: 'tratador', etiqueta: 'Tratador térmico', simbolo: 'tratador', equipo: 'H-302' },
      { id: 'tanques', etiqueta: 'Tanques en especificación', simbolo: 'tanque', equipo: 'TK-102',
        fluido: 'crudo', nivelDe: { tag: 'LI-1102', tope: 18.5 },
        miembros: [
          tanque('TK-102', 'TK-102 · PMO-02', 'TK-102', 'PMO-02'),
          tanque('TK-101', 'TK-101 · respaldo'),
          tanque('TK-103', 'TK-103 · PMO-03', undefined, 'PMO-03'),
        ] },
      { id: 'lact', etiqueta: 'Unidad LACT', simbolo: 'medicion', equipo: 'LACT-01', pmo: 'PMO-01' },
      { id: 'oleoducto', etiqueta: 'Oleoducto', simbolo: 'salida', pie: 'límite de batería' },
    ],
    agua: [
      { id: 'bomba', etiqueta: 'Bomba de reinyección', simbolo: 'bomba', equipo: 'P-201B' },
      { id: 'tanqueAgua', etiqueta: 'Tanque de agua', simbolo: 'tanque', pie: 'proceso', fluido: 'agua' },
      { id: 'inyeccion', etiqueta: 'Pozos inyectores', simbolo: 'inyeccion', pie: 'disposición' },
    ],
    servicios: SERVICIOS,
    chokes: { pozos: 17950, planta: 19500, evacuacion: 21000, mercado: 24000 },
    caudales: { crudo: 14800, crudoCap: 19500, agua: 36400, aguaCap: 44000, gas: 9100, gasCap: 11000 },
    nota: 'Manda el levantamiento: 41 pozos con bomba electrosumergible. El compresor de gas, sin respaldo, ya cerró pozos cuando paró.',
  },

  guacamayo: {
    tronco: [
      { id: 'pozos', etiqueta: 'Pozos productores', simbolo: 'pozos',
        miembros: [pozo('GU-03', 'GU-03 · ESP'), pozo('GU-07', 'GU-07 · ESP')],
        restantes: { cuantos: 10, etiqueta: 'en la pantalla de pozos' } },
      { id: 'manifold', etiqueta: 'Manifold de producción', simbolo: 'manifold', pie: 'cabezal común' },
      { id: 'separador', etiqueta: 'Separador trifásico', simbolo: 'separador', equipo: 'V-101' },
    ],
    gas: [
      { id: 'depurador', etiqueta: 'Depurador de gas', simbolo: 'depurador', pie: 'proceso' },
      { id: 'tea', etiqueta: 'Tea / quemador', simbolo: 'tea', pie: 'alivio', rama: true },
    ],
    crudo: [
      { id: 'tratador', etiqueta: 'Tratador térmico', simbolo: 'tratador', equipo: 'H-302' },
      { id: 'tanques', etiqueta: 'Tanque en especificación', simbolo: 'tanque', equipo: 'TK-102',
        fluido: 'crudo', nivelDe: { tag: 'LI-1102', tope: 18.5 },
        miembros: [tanque('TK-102', 'TK-102 · PMO-02', 'TK-102', 'PMO-02')] },
      { id: 'lact', etiqueta: 'Unidad LACT', simbolo: 'medicion', equipo: 'LACT-01', pmo: 'PMO-01' },
      { id: 'oleoducto', etiqueta: 'Oleoducto · nominación restringida', simbolo: 'salida', pie: 'límite de batería' },
    ],
    agua: [
      { id: 'bomba', etiqueta: 'Bomba de reinyección', simbolo: 'bomba', equipo: 'P-201B' },
      { id: 'tanqueAgua', etiqueta: 'Tanque de agua', simbolo: 'tanque', pie: 'proceso', fluido: 'agua' },
      { id: 'inyeccion', etiqueta: 'Pozos inyectores', simbolo: 'inyeccion', pie: 'disposición' },
    ],
    servicios: SERVICIOS,
    chokes: { pozos: 7200, planta: 7400, evacuacion: 6800, mercado: 9000 },
    caudales: { crudo: 6200, crudoCap: 7400, agua: 7600, aguaCap: 13000, gas: 2100, gasCap: 2600 },
    nota: 'Sin compresión: el gas va a consumo propio y el excedente a tea. La restricción está aguas abajo del LACT, en la nominación del oleoducto.',
  },

  palmar: {
    tronco: [
      { id: 'pozos', etiqueta: 'Pozos productores', simbolo: 'pozos',
        miembros: [pozo('PA-01', 'PA-01 · bombeo mecánico'), pozo('PA-02', 'PA-02 · bombeo mecánico')],
        restantes: { cuantos: 5, etiqueta: 'en la pantalla de pozos' } },
      { id: 'manifold', etiqueta: 'Manifold de producción', simbolo: 'manifold', pie: 'cabezal común' },
      // Sin gas que manejar: el separador solo divide crudo y agua.
      { id: 'separador', etiqueta: 'Separador de agua libre', simbolo: 'separador', equipo: 'V-101' },
    ],
    gas: [],
    crudo: [
      { id: 'tratador', etiqueta: 'Tratador térmico', simbolo: 'tratador', equipo: 'H-302' },
      { id: 'tanques', etiqueta: 'Tanque en especificación', simbolo: 'tanque', equipo: 'TK-102',
        fluido: 'crudo', nivelDe: { tag: 'LI-1102', tope: 18.5 },
        miembros: [tanque('TK-102', 'TK-102 · PMO-02', 'TK-102', 'PMO-02')] },
      { id: 'lact', etiqueta: 'Unidad LACT', simbolo: 'medicion', equipo: 'LACT-01', pmo: 'PMO-01' },
      { id: 'oleoducto', etiqueta: 'Oleoducto', simbolo: 'salida', pie: 'límite de batería' },
    ],
    agua: [
      { id: 'bomba', etiqueta: 'Bomba de reinyección', simbolo: 'bomba', equipo: 'P-201B' },
      { id: 'tanqueAgua', etiqueta: 'Tanque de agua', simbolo: 'tanque', pie: 'proceso', fluido: 'agua' },
      { id: 'inyeccion', etiqueta: 'Pozos inyectores', simbolo: 'inyeccion', pie: 'disposición' },
    ],
    servicios: SERVICIOS,
    chokes: { pozos: 3500, planta: 3295, evacuacion: 4200, mercado: 5000 },
    caudales: { crudo: 3100, crudoCap: 3600, agua: 2400, aguaCap: 5500, gas: 0, gasCap: 0 },
    nota: 'Campo chico de bombeo mecánico, sin tren de gas, con holgura en crudo y agua.',
  },

  zarza: {
    tronco: [
      { id: 'pozos', etiqueta: 'Pozos de gas', simbolo: 'pozos',
        miembros: [pozo('ZA-02', 'ZA-02 · gas'), pozo('ZA-05', 'ZA-05 · gas')],
        restantes: { cuantos: 7, etiqueta: 'en la pantalla de pozos' } },
      { id: 'manifold', etiqueta: 'Manifold de producción', simbolo: 'manifold', pie: 'cabezal común' },
      { id: 'separador', etiqueta: 'Separador trifásico', simbolo: 'separador', equipo: 'V-101' },
    ],
    gas: [
      { id: 'depurador', etiqueta: 'Depurador de gas', simbolo: 'depurador', pie: 'proceso' },
      { id: 'tea', etiqueta: 'Tea / quemador', simbolo: 'tea', pie: 'alivio', rama: true },
      { id: 'compresor', etiqueta: 'Compresor de gas', simbolo: 'compresor', equipo: 'C-401' },
      { id: 'gasventa', etiqueta: 'Gas a venta · nominación por debajo', simbolo: 'salida', pie: 'límite de batería' },
    ],
    crudo: [
      { id: 'tanques', etiqueta: 'Tanque de condensado', simbolo: 'tanque', equipo: 'TK-102',
        fluido: 'crudo', nivelDe: { tag: 'LI-1102', tope: 18.5 },
        miembros: [tanque('TK-102', 'TK-102 · PMO-02', 'TK-102', 'PMO-02')] },
      { id: 'lact', etiqueta: 'Unidad LACT', simbolo: 'medicion', equipo: 'LACT-01', pmo: 'PMO-01' },
      { id: 'oleoducto', etiqueta: 'Oleoducto', simbolo: 'salida', pie: 'límite de batería' },
    ],
    agua: [
      { id: 'bomba', etiqueta: 'Bomba de reinyección', simbolo: 'bomba', equipo: 'P-201B' },
      { id: 'tanqueAgua', etiqueta: 'Tanque de agua', simbolo: 'tanque', pie: 'proceso', fluido: 'agua' },
      { id: 'inyeccion', etiqueta: 'Pozos inyectores', simbolo: 'inyeccion', pie: 'disposición' },
    ],
    servicios: SERVICIOS,
    chokes: { pozos: 3900, planta: 3400, evacuacion: 4100, mercado: 3372 },
    caudales: { crudo: 2900, crudoCap: 3400, agua: 1100, aguaCap: 4000, gas: 12400, gasCap: 16800 },
    nota: 'Campo de gas: el producto principal sale por arriba. Su restricción típica es comercial (la nominación del comprador), no técnica.',
  },
}

/* ──────────────────────────── Trazado automático ─────────────────────────── */

export const COL = 216
export const X0 = 120
export const HX = 52, HY = 34
/** Los carriles NO son fijos: se separan lo que haga falta según lo que cada
 *  tren tenga desplegado. Si se abren tres tanques, el tren de crudo se hace
 *  más alto y los de arriba y abajo se corren solos. */
const SEPARACION = 44

export interface Puesto {
  id: string
  etiqueta: string
  simbolo: Simbolo
  x: number
  y: number
  equipo?: string
  pie?: string
  pmo?: string
  fluido?: Corriente
  nivelDe?: { tag: string; tope: number }
  /** Pertenece a un grupo desplegado. */
  grupo?: string
  /** Es un grupo plegado: al abrirlo se ven sus miembros. */
  plegado?: { cuantos: number }
  /** Nodo de relleno: configurado y sin dibujar uno a uno. */
  resto?: number
  /** Un conjunto no se detiene porque falle un miembro. */
  cluster?: boolean
}

export interface LineaArmada {
  id: string
  d: string
  corriente: Corriente
  deId: string
  aId: string
  de: string
  a: string
  /** Punto donde va el rótulo de caudal, sobre el tramo más largo. */
  medio: [number, number]
  /** Arranque de la línea: ahí va el aviso de «sin flujo», pegado al equipo
   *  que se detuvo y no en medio de un colector compartido. */
  inicio: [number, number]
}

const ESPACIO_MIEMBRO = 136

const rutaOrto = (
  a: [number, number], b: [number, number], codos: Array<[number, number]> = [],
): string => {
  const pts: Array<[number, number]> = [a, ...codos, b]
  const recorta = (p: [number, number], q: [number, number]): [number, number] => {
    const dx = q[0] - p[0], dy = q[1] - p[1]
    return Math.abs(dx) > Math.abs(dy)
      ? [p[0] + Math.sign(dx) * HX, p[1]]
      : [p[0], p[1] + Math.sign(dy) * HY]
  }
  pts[0] = recorta(pts[0]!, pts[1]!)
  pts[pts.length - 1] = recorta(pts[pts.length - 1]!, pts[pts.length - 2]!)
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
}

const puntosDe = (d: string) =>
  d.slice(1).split('L').map(t => t.split(',').map(Number) as [number, number])

/** Un punto sobre el recorrido a `avance` del arranque: así el aviso queda
 *  al lado del equipo que se detuvo y no encima de su propio marco. */
export const inicioDe = (d: string, avance = 62): [number, number] => {
  const p = puntosDe(d)
  let resta = avance
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i]!, b = p[i + 1]!
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (len >= resta) {
      const t = resta / len
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    }
    resta -= len
  }
  return p.at(-1)!
}

export const medioDe = (d: string): [number, number] => {
  const pts = puntosDe(d)
  let mejor = 0, largo = -1
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1]![0] - pts[i]![0], pts[i + 1]![1] - pts[i]![1])
    if (l > largo) { largo = l; mejor = i }
  }
  const a = pts[mejor]!, b = pts[mejor + 1]!
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

interface Bloque { ancla: Puesto; salidas: Puesto[]; entradas: Puesto[] }

/** Calcula el esquema completo a partir de la configuración del campo. */
export function armar(cfg: PlantaCampo, abiertos: Set<string>) {
  const nodos: Puesto[] = []
  const lineas: LineaArmada[] = []
  const bloques = new Map<string, Bloque>()

  const colocar = (el: Elemento, col: number, carril: number): Bloque => {
    const x = X0 + col * COL
    const abierto = !!el.miembros && abiertos.has(el.id)
    if (!abierto) {
      const p: Puesto = {
        id: el.id, etiqueta: el.etiqueta, simbolo: el.simbolo, x, y: carril,
        equipo: el.equipo, pie: el.pie, pmo: el.pmo, fluido: el.fluido, nivelDe: el.nivelDe,
        cluster: !!el.miembros,
        plegado: el.miembros
          ? { cuantos: el.miembros.length + (el.restantes?.cuantos ?? 0) }
          : undefined,
      }
      nodos.push(p)
      const b = { ancla: p, salidas: [p], entradas: [p] }
      bloques.set(el.id, b)
      return b
    }
    const lista = el.miembros!
    const total = lista.length + (el.restantes ? 1 : 0)
    const y0 = carril - ((total - 1) * ESPACIO_MIEMBRO) / 2
    const puestos: Puesto[] = lista.map((m, i) => ({
      id: m.id, etiqueta: m.etiqueta, simbolo: el.simbolo, x, y: y0 + i * ESPACIO_MIEMBRO,
      equipo: m.equipo, pie: m.pie, pmo: m.pmo, fluido: m.fluido ?? el.fluido,
      nivelDe: m.nivelDe ?? (m.equipo ? el.nivelDe : undefined), grupo: el.id,
    }))
    if (el.restantes) {
      puestos.push({
        id: `${el.id}-resto`, etiqueta: `+${el.restantes.cuantos} pozos más`,
        simbolo: el.simbolo, x, y: y0 + lista.length * ESPACIO_MIEMBRO,
        pie: el.restantes.etiqueta, grupo: el.id, resto: el.restantes.cuantos,
      })
    }
    nodos.push(...puestos)
    const b = { ancla: puestos[0]!, salidas: puestos, entradas: puestos }
    bloques.set(el.id, b)
    return b
  }

  const unir = (a: Bloque, b: Bloque, corriente: Corriente, etA: string, etB: string) => {
    const uno = a.salidas.length === 1 && b.entradas.length === 1
    if (uno) {
      const p = a.salidas[0]!, q = b.entradas[0]!
      const codos: Array<[number, number]> = p.y === q.y ? [] : [[(p.x + q.x) / 2, p.y], [(p.x + q.x) / 2, q.y]]
      const d = rutaOrto([p.x, p.y], [q.x, q.y], codos)
      lineas.push({ id: `${p.id}>${q.id}`, d, corriente, deId: p.id, aId: q.id, de: etA, a: etB,
        medio: medioDe(d), inicio: inicioDe(d) })
      return
    }
    // Varios a uno (o uno a varios): colector vertical, como un cabezal real.
    const muchos = a.salidas.length > 1 ? a.salidas : b.entradas
    const solo = a.salidas.length > 1 ? b.entradas[0]! : a.salidas[0]!
    const xc = (muchos[0]!.x + solo.x) / 2
    for (const m of muchos) {
      const d = a.salidas.length > 1
        ? rutaOrto([m.x, m.y], [solo.x, solo.y], [[xc, m.y], [xc, solo.y]])
        : rutaOrto([solo.x, solo.y], [m.x, m.y], [[xc, solo.y], [xc, m.y]])
      const deId = a.salidas.length > 1 ? m.id : solo.id
      const aId = a.salidas.length > 1 ? solo.id : m.id
      lineas.push({
        id: `${deId}>${aId}`, d, corriente, deId, aId,
        de: a.salidas.length > 1 ? m.etiqueta : etA,
        a: a.salidas.length > 1 ? etB : m.etiqueta,
        medio: medioDe(d), inicio: inicioDe(d),
      })
    }
  }

  /** Coloca una cadena y la encadena. Devuelve la última columna usada. */
  const cadena = (serie: Elemento[], carril: number, colIni: number, corriente: Corriente, previo?: Bloque) => {
    let col = colIni
    let anterior = previo
    let etiquetaAnterior = previo ? nodos.find(n => n.id === previo.ancla.id)?.etiqueta ?? '' : ''
    for (const el of serie) {
      if (el.rama) {
        if (!anterior) continue
        const b = colocar(el, col - 1, carril - 172)
        unir(anterior, b, corriente, etiquetaAnterior, el.etiqueta)
        continue
      }
      const b = colocar(el, col, carril)
      if (anterior) unir(anterior, b, corriente, etiquetaAnterior, el.etiqueta)
      anterior = b
      etiquetaAnterior = el.etiqueta
      col++
    }
    return col
  }

  /** Medio alto que necesita un tren, según lo que tenga desplegado. */
  const medioAlto = (serie: Elemento[]) => 34 + Math.max(42, ...serie.map(e => {
    const n = e.miembros && abiertos.has(e.id) ? e.miembros.length + (e.restantes ? 1 : 0) : 1
    return ((n - 1) / 2) * ESPACIO_MIEMBRO + 42
  }))
  const conGas = cfg.gas.length > 0
  const hGas = conGas ? medioAlto(cfg.gas) : 0, hCrudo = medioAlto(cfg.crudo), hAgua = medioAlto(cfg.agua)
  const hayRama = cfg.gas.some(e => e.rama)
  const carril = {
    gas: conGas ? Math.max(hayRama ? 248 : 60 + hGas, 60 + hGas) : 0,
    crudo: 0, agua: 0,
  }
  // Un campo sin tren de gas no reserva su carril: el crudo sube arriba.
  carril.crudo = conGas ? carril.gas + hGas + SEPARACION + hCrudo : 40 + hCrudo
  carril.agua = carril.crudo + hCrudo + SEPARACION + hAgua

  const colTronco = cadena(cfg.tronco, carril.crudo, 0, 'multi')
  const sep = bloques.get(cfg.tronco.at(-1)!.id)
  const cols = [
    cadena(cfg.gas, carril.gas, colTronco, 'gas', sep),
    cadena(cfg.crudo, carril.crudo, colTronco, 'crudo', sep),
    cadena(cfg.agua, carril.agua, colTronco, 'agua', sep),
  ]

  // El tratador también manda agua a la bomba, cuando ambos existen.
  const tratador = bloques.get('tratador'), bomba = bloques.get('bomba')
  if (tratador && bomba && tratador.salidas.length === 1 && bomba.entradas.length === 1) {
    const p = tratador.salidas[0]!, q = bomba.entradas[0]!
    const d = rutaOrto([p.x, p.y], [q.x, q.y], [[p.x, (p.y + q.y) / 2], [q.x, (p.y + q.y) / 2]])
    lineas.push({ id: `${p.id}>${q.id}`, d, corriente: 'agua', deId: p.id, aId: q.id,
      de: 'Tratador térmico', a: 'Bomba de reinyección', medio: medioDe(d), inicio: inicioDe(d) })
  }

  const maxCol = Math.max(...cols)
  const bordeInferior = Math.max(...nodos.map(n => n.y)) + 42 + 40
  const carrilServicios = Math.max(carril.agua + hAgua + 120, bordeInferior + 106)
  cfg.servicios.forEach((el, i) => colocar(el, i, carrilServicios))

  const barraElec = carrilServicios - 62
  const barraAire = carrilServicios - 94
  const consumidoresElec = ['pozos', 'compresor', 'bomba', 'lact']
  const consumidoresAire = ['separador', 'tratador', 'tanques', 'lact']
  const ancla = (id: string) => bloques.get(id)?.ancla
  const columnaDe = (id: string) => {
    const b = bloques.get(id)
    return b ? b.ancla.x : undefined
  }

  /** Banda de cada tren: sale de dónde quedaron sus equipos, no de números
   *  escritos a mano, así que sigue cuadrando si se agrega un equipo. */
  const banda = (titulo: string, serie: Elemento[], eje: number, alto: number, corriente: Corriente) => {
    const ids = new Set(serie.flatMap(e => [e.id, ...(e.miembros?.map(m => m.id) ?? []), `${e.id}-resto`]))
    const propios = nodos.filter(n => ids.has(n.id) && Math.abs(n.y - eje) <= alto)
    if (!propios.length) return null
    // La banda marca el CARRIL, no el alto del grupo desplegado: si abarcara
    // la pila de tanques se comería los carriles de arriba y de abajo.
    return {
      titulo, corriente,
      x0: Math.min(...propios.map(n => n.x)) - 76,
      x1: Math.max(...propios.map(n => n.x)) + 76,
      y0: eje - alto,
      y1: eje + alto + 24,
    }
  }

  return {
    nodos,
    lineas,
    bandas: [
      banda('Tren de gas', cfg.gas, carril.gas, hGas, 'gas'),
      banda('Tren de crudo', cfg.crudo, carril.crudo, hCrudo, 'crudo'),
      banda('Tren de agua', cfg.agua, carril.agua, hAgua, 'agua'),
    ].filter(b => b !== null),
    ancho: X0 + maxCol * COL + 60,
    alto: carrilServicios + 110,
    servicios: {
      elec: {
        y: barraElec,
        desde: X0,
        hasta: Math.max(...consumidoresElec.map(c => columnaDe(c) ?? X0)),
        fuente: ancla('subestacion'),
        consumidores: consumidoresElec
          .map(id => ({ id, x: columnaDe(id), etiqueta: bloques.get(id)?.ancla.etiqueta }))
          .filter((c): c is { id: string; x: number; etiqueta: string } => c.x !== undefined),
      },
      aire: {
        y: barraAire,
        desde: X0 + COL,
        hasta: Math.max(...consumidoresAire.map(c => columnaDe(c) ?? X0)),
        fuente: ancla('aire'),
        consumidores: consumidoresAire
          .map(id => ({ id, x: columnaDe(id), etiqueta: bloques.get(id)?.ancla.etiqueta }))
          .filter((c): c is { id: string; x: number; etiqueta: string } => c.x !== undefined),
      },
    },
    /** Grupos que se pueden abrir o cerrar desde la pantalla. */
    grupos: [...cfg.tronco, ...cfg.gas, ...cfg.crudo, ...cfg.agua]
      .filter(e => e.miembros?.length)
      .map(e => ({ id: e.id, etiqueta: e.etiqueta, cuantos: (e.miembros?.length ?? 0) + (e.restantes?.cuantos ?? 0) })),
  }
}

/* ─────────────────────── cambios al esquema de planta ─────────────────────── */

/** Los trenes de un esquema de planta. */
export type Tren = 'tronco' | 'gas' | 'crudo' | 'agua' | 'servicios'
const TRENES: Tren[] = ['tronco', 'gas', 'crudo', 'agua', 'servicios']

/** Un cambio al esquema, como lo manda el administrador
 *  (`POST /api/planta/cambios { campo, cambio }`): la operación, no la planta
 *  entera, para que el servidor la aplique con estas mismas reglas sobre la
 *  planta que él tiene. */
export type CambioDePlanta =
  | { tipo: 'agregar-miembro'; grupo: string; miembro: Miembro }
  | { tipo: 'quitar-miembro'; grupo: string; miembro: string }
  | { tipo: 'agregar-elemento'; tren: Tren; elemento: Elemento }
  | { tipo: 'quitar-elemento'; tren: Tren; id: string }

/** Un cambio ya hecho, en el historial del esquema. */
export interface CambioPlanta { id: number; fecha: string; por: string; campo: string; cambio: string }

/** Todos los ids de un campo, de elementos y de miembros: un id identifica una sola cosa. */
const idsDe = (c: PlantaCampo) => new Set(TRENES.flatMap(t => c[t].flatMap(e => [e.id, ...(e.miembros ?? []).map(m => m.id)])))

/** Aplica un cambio a todos los trenes de un campo, sin mutar nada. */
const recorrer = (c: PlantaCampo, f: (e: Elemento) => Elemento): PlantaCampo => ({
  ...c,
  tronco: c.tronco.map(f), gas: c.gas.map(f), crudo: c.crudo.map(f),
  agua: c.agua.map(f), servicios: c.servicios.map(f),
})

/** Aplica un cambio al esquema con las reglas del servidor. Devuelve la
 *  planta nueva y cómo se lee el cambio en el historial, o el motivo del
 *  rechazo (un 422). */
export function aplicarCambioPlanta(cfg: PlantaCampo, c: CambioDePlanta): { planta: PlantaCampo; texto: string } | { error: string } {
  switch (c.tipo) {
    case 'agregar-miembro': {
      const m = c.miembro
      if (!m.id.trim()) return { error: 'Escriba el nombre: de él sale el identificador.' }
      if (idsDe(cfg).has(m.id)) return { error: `Ya hay un elemento ${m.id} en este campo: use otro nombre.` }
      if (!TRENES.some(t => cfg[t].some(e => e.id === c.grupo && e.miembros))) return { error: 'Ese conjunto no existe en este campo.' }
      return { planta: recorrer(cfg, e => (e.id === c.grupo ? { ...e, miembros: [...(e.miembros ?? []), m] } : e)), texto: `agregó ${m.etiqueta} (${m.id}) a ${c.grupo}` }
    }
    case 'quitar-miembro':
      if (!TRENES.some(t => cfg[t].some(e => e.id === c.grupo && e.miembros?.some(x => x.id === c.miembro)))) return { error: `${c.miembro} no está en ese conjunto.` }
      return { planta: recorrer(cfg, e => (e.id === c.grupo ? { ...e, miembros: (e.miembros ?? []).filter(x => x.id !== c.miembro) } : e)), texto: `quitó ${c.miembro} de ${c.grupo}` }
    case 'agregar-elemento':
      if (idsDe(cfg).has(c.elemento.id)) return { error: `Ya hay un elemento ${c.elemento.id} en este campo.` }
      return { planta: { ...cfg, [c.tren]: [...cfg[c.tren], c.elemento] }, texto: `montó ${c.elemento.etiqueta} (${c.elemento.id}) en el tren ${c.tren}` }
    case 'quitar-elemento':
      if (!cfg[c.tren].some(e => e.id === c.id)) return { error: `${c.id} no está en ese tren.` }
      return { planta: { ...cfg, [c.tren]: cfg[c.tren].filter(e => e.id !== c.id) }, texto: `quitó ${c.id} del tren ${c.tren}` }
  }
}
