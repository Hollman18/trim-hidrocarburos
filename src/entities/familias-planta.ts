/** LAS FAMILIAS DE ENERGÍA Y AIRE DE LA PLANTA (Fase 4 de facilidades; investigación
 *  ~/TRIM-petroleras/investigacion/19, §2.2 y §5.2, y 03, §2.7 a §2.9).
 *
 *  Como `partes.ts` para las bombas: por familia, las partes que fallan (el ítem mantenible de
 *  ISO 14224), las variables que se leen de cada una, su límite y de dónde sale. Es librería del
 *  producto, no del cliente. Donde la investigación no trae una fuente, el límite dice `[SUPUESTO]`
 *  y se reemplaza con la hoja de datos del equipo o la norma del cliente: nunca se presenta como dato.
 *
 *  Lo que TRIM hace con ellas es lo mismo que con las bombas: lee lo que esos equipos ya registran
 *  (cada 47 s o el evento fechado) y lo traduce a barriles y avisos. Nunca opera un interruptor, un
 *  generador ni el deslastre de carga: eso es del relé y del PMS (19 §5.3). */
import type { PapelVariable } from './partes'

export type FamiliaPlanta = 'generador' | 'transformador' | 'ups' | 'compresor-aire'
  // Fase 5 de facilidades: los demás equipos de la planta (19 §1.2 y §2.2).
  | 'bomba-transferencia' | 'tratador' | 'torre-enfriamiento' | 'separador' | 'bomba-diluyente'

/** El tren de la planta de cada familia (los de `equipos-tecnico.ts`). */
export type TrenDeFamilia = 'crudo' | 'agua' | 'gas' | 'servicios'

export interface VariablePlanta {
  /** Letras ISA del tag («TI», «EI»). */
  isa: string
  nombre: string
  unidad: string
  papel: PapelVariable
  /** La banda o el punto, como se escribe en el instrumento. */
  limite: string
  fuente: string
}

export interface PartePlanta {
  id: string
  nombre: string
  /** Ítem mantenible de ISO 14224 contra el que se registra la falla. */
  itemIso: string
  variables: VariablePlanta[]
  /** Modos de falla de ISO 14224 (Annex B) que produce. */
  modos: string[]
  /** Lo que se hace cuando la parte avisa. */
  accion?: string
}

export interface DefinicionFamilia {
  id: FamiliaPlanta
  nombre: string
  /** Clase de equipo de ISO 14224. */
  claseIso: string
  /** Qué para si falla, y cuánto aguanta la planta (19 §2.2). */
  siFalla: string
  /** Tasa de falla y reparación de referencia, con su fuente. */
  referencia: { texto: string; fuente: string }
  partes: PartePlanta[]
  /** Lo que TRIM avisa con esta familia. */
  avisa: string
  /** El tren de la planta donde va en las listas. */
  tren: TrenDeFamilia
}

const IEEE_493 = 'IEEE Std 493-2007 (Gold Book), tablas de confiabilidad de equipos; investigación 03 §2.7 y §2.8'
const SUPUESTO = (que: string) => `[SUPUESTO] ${que}: se reemplaza con la hoja de datos del equipo o la norma del cliente`

type DeEnergia = 'generador' | 'transformador' | 'ups' | 'compresor-aire'
const ENERGIA_Y_AIRE: Readonly<Record<DeEnergia, DefinicionFamilia>> = {
  generador: {
    id: 'generador', nombre: 'Motogenerador o turbogenerador', claseIso: 'Generadores eléctricos accionados por motor o turbina',
    siFalla: 'En un sistema aislado, el disparo de la unidad más cargada puede tumbar todo si la reserva rápida no alcanza (19 §3.2)',
    referencia: { texto: 'Motogenerador diésel continuo: 1,8 fallas al año, 25 h para reparar; turbina: 1,7 al año, 27 h', fuente: IEEE_493 },
    partes: [
      { id: 'motor-primo', nombre: 'Motor o turbina', itemIso: 'Unidad de potencia (máquina motriz)', modos: ['FTS', 'UST', 'OHE', 'BRD'],
        variables: [
          { isa: 'TI', nombre: 'Temperatura de escape por cilindro', unidad: '°C', papel: 'avisa', limite: 'desviación < 50 entre cilindros', fuente: SUPUESTO('Desviación entre cilindros') },
          { isa: 'PI', nombre: 'Presión de aceite', unidad: 'psi', papel: 'causa', limite: '> 40', fuente: SUPUESTO('Presión mínima de aceite') },
          { isa: 'TI', nombre: 'Temperatura del agua de chaqueta', unidad: '°C', papel: 'avisa', limite: '< 95', fuente: SUPUESTO('Temperatura del agua de chaqueta') },
        ] },
      { id: 'combustible', nombre: 'Suministro de gas combustible', itemIso: 'Sistema de combustible', modos: ['FTS', 'UST'],
        variables: [{ isa: 'PI', nombre: 'Presión de gas combustible', unidad: 'psi', papel: 'causa', limite: 'según el fabricante del motor', fuente: 'La caída del gas combustible está entre los eventos que tumban sistemas aislados (19 §5.2); el umbral es del fabricante' }] },
      { id: 'alternador', nombre: 'Alternador y su regulador', itemIso: 'Generador eléctrico', modos: ['ELP', 'OHE'],
        variables: [
          { isa: 'JI', nombre: 'Potencia entregada', unidad: 'kW', papel: 'avisa', limite: '< capacidad de la unidad', fuente: 'Para el margen N-1: si se cae la unidad más cargada, ¿alcanza la reserva rápida? (19 §5.2, ⭐ A1)' },
          { isa: 'EI', nombre: 'Tensión de salida', unidad: 'kV', papel: 'confirma', limite: '± 5 % de la nominal', fuente: SUPUESTO('Banda de tensión') },
        ] },
    ],
    avisa: 'La unidad que se va a caer o que no va a arrancar cuando se necesite, y el margen de reserva en barriles', tren: 'servicios',
  },
  transformador: {
    id: 'transformador', nombre: 'Transformador de potencia', claseIso: 'Transformadores de potencia',
    siFalla: 'Corte largo: con repuesto, 3,3 a 3,5 días; sin repuesto, 12 a 15 días (19 §3.2)',
    referencia: { texto: 'Reemplazo con repuesto 3,3–3,5 días; sin repuesto 12–15 días', fuente: IEEE_493 },
    partes: [
      { id: 'aislamiento', nombre: 'Devanados y aislamiento', itemIso: 'Devanado', modos: ['ELP', 'OHE', 'BRD'],
        variables: [
          { isa: 'TI', nombre: 'Temperatura de devanado', unidad: '°C', papel: 'avisa', limite: '< 110', fuente: SUPUESTO('Punto caliente del devanado (guías de carga IEEE C57.91 / IEC 60076-7, sin revisar en la investigación)') },
          { isa: 'JI', nombre: 'Carga', unidad: '%', papel: 'causa', limite: '< 100', fuente: SUPUESTO('Carga nominal') },
        ] },
      { id: 'aceite', nombre: 'Aceite y enfriamiento', itemIso: 'Sistema de enfriamiento', modos: ['OHE', 'ELU'],
        variables: [{ isa: 'TI', nombre: 'Temperatura de aceite superior', unidad: '°C', papel: 'avisa', limite: '< 95', fuente: SUPUESTO('Temperatura de aceite superior (guías de carga IEEE C57.91 / IEC 60076-7)') }] },
    ],
    avisa: 'Sobrecarga sostenida o enfriamiento que falla, antes de que dispare la protección', tren: 'servicios',
  },
  ups: {
    id: 'ups', nombre: 'UPS y baterías', claseIso: 'Sistemas de alimentación ininterrumpida',
    siFalla: 'Cuando se agotan las baterías, la planta queda a ciegas: se apagan el control, el SCADA y las comunicaciones (19 §3.3)',
    referencia: { texto: 'La autonomía de cada planta no tiene fuente pública: se mide', fuente: 'Investigación 19 §2.2 (🔴 por planta)' },
    partes: [
      { id: 'baterias', nombre: 'Banco de baterías', itemIso: 'Batería', modos: ['FTS', 'LOO'],
        variables: [
          { isa: 'EI', nombre: 'Carga de la batería', unidad: '%', papel: 'avisa', limite: '> 80', fuente: SUPUESTO('Carga mínima en flotación') },
          { isa: 'ZI', nombre: 'En batería', unidad: '', papel: 'confirma', limite: '—', fuente: 'Estado de la UPS por SNMP: si está en batería, se fue la red' },
        ] },
      { id: 'inversor', nombre: 'Rectificador e inversor', itemIso: 'Convertidor de potencia', modos: ['FTS', 'ELP'],
        variables: [{ isa: 'TI', nombre: 'Temperatura interna', unidad: '°C', papel: 'causa', limite: '< 40', fuente: SUPUESTO('Temperatura de operación') }] },
    ],
    avisa: 'Cuánto le queda de vista a la planta si se va la energía', tren: 'servicios',
  },
  'compresor-aire': {
    id: 'compresor-aire', nombre: 'Aire de instrumentos', claseIso: 'Compresores',
    siFalla: 'Las válvulas van a posición segura cuando se agota el recibidor: puede parar la planta entera (19 §2.2)',
    referencia: { texto: 'El recibidor tiene que dar de 5 a 30 min de autonomía', fuente: 'Investigación 03 §2.9; ISA-7.0.01' },
    partes: [
      { id: 'compresion', nombre: 'Unidades compresoras', itemIso: 'Unidad compresora', modos: ['FTS', 'UST', 'LOO'],
        variables: [
          { isa: 'PT', nombre: 'Presión de cabezal', unidad: 'psi', papel: 'avisa', limite: '115 – 130', fuente: 'Banda del cabezal de aire de instrumentos (la ficha de K-101)' },
          { isa: 'ZI', nombre: 'Unidades en servicio', unidad: '', papel: 'confirma', limite: 'N+1', fuente: 'Redundancia N+1 por capacidad (03 §2.9)' },
        ] },
      { id: 'secado', nombre: 'Secador', itemIso: 'Secador', modos: ['PDE'],
        variables: [{ isa: 'AIT', nombre: 'Punto de rocío', unidad: '°C', papel: 'avisa', limite: '< -30', fuente: 'Aire de instrumentos seco: la ficha de K-101' }] },
    ],
    avisa: 'Los minutos de aire que quedan: con el apagón, el reloj del recibidor', tren: 'servicios',
  },
}

const API_610 = 'API 610, Tabla 8: 3,0 mm/s RMS en la región preferida y 3,9 en la permitida'

/** Fase 5 de facilidades: los demás equipos de la planta. Van aparte para que el orden de las de
 *  energía no cambie. */
const RESTO_PLANTA: Readonly<Record<Exclude<FamiliaPlanta, DeEnergia>, DefinicionFamilia>> = {
  'bomba-transferencia': {
    id: 'bomba-transferencia', nombre: 'Bomba de transferencia o de despacho', claseIso: 'Bombas', tren: 'crudo',
    siFalla: 'El crudo en especificación se acumula en el almacenamiento hasta que se llena; después hay que cerrar pozos (19 §2.2)',
    referencia: { texto: 'En Castilla 2, seis bombas de despacho en paralelo y 28.800 bbl de almacenamiento', fuente: 'Investigación 19 §2.2, [5]' },
    partes: [
      { id: 'rodamientos', nombre: 'Rodamientos', itemIso: 'Rodamiento', modos: ['VIB', 'OHE'],
        accion: 'Programar la revisión de rodamientos y lubricación antes de que pase la alarma; confirmar con análisis de vibración.',
        variables: [{ isa: 'VI', nombre: 'Vibración', unidad: 'mm/s', papel: 'avisa', limite: '< 3,9', fuente: API_610 }] },
      { id: 'hidraulica', nombre: 'Hidráulica', itemIso: 'Impulsor', modos: ['PDE', 'LOO'],
        variables: [{ isa: 'FI', nombre: 'Caudal', unidad: 'bbl/d', papel: 'confirma', limite: 'según la curva', fuente: SUPUESTO('Caudal de diseño') }] },
    ],
    avisa: 'La bomba de despacho que se va a dañar antes de que el almacenamiento se llene',
  },
  tratador: {
    id: 'tratador', nombre: 'Tratador térmico o electrostático', claseIso: 'Separadores (tratadores)', tren: 'crudo',
    siFalla: 'El crudo sale fuera de especificación (corte de agua alto); el tiempo de residencia da horas (19 §2.2: 23 h en lavado)',
    referencia: { texto: 'Tiempo de residencia de 23 h en el lavado de Castilla 2', fuente: 'Investigación 19 §2.2, [5]' },
    partes: [
      { id: 'rejilla', nombre: 'Rejilla electrostática y su transformador', itemIso: 'Electrodo', modos: ['ELP', 'PDE'],
        accion: 'Revisar la interfase y el corte de agua de entrada: una tensión que cae es agua que llega a la rejilla.',
        variables: [{ isa: 'EI', nombre: 'Tensión de rejilla', unidad: 'kV', papel: 'avisa', limite: '> 18', fuente: SUPUESTO('Tensión mínima de la rejilla') }] },
      { id: 'calentamiento', nombre: 'Calentamiento', itemIso: 'Quemador', modos: ['OHE', 'FTS'],
        variables: [{ isa: 'TI', nombre: 'Temperatura de tratamiento', unidad: '°C', papel: 'confirma', limite: '70 – 90', fuente: SUPUESTO('Temperatura de tratamiento') }] },
    ],
    avisa: 'El tratador que va a sacar crudo fuera de especificación',
  },
  'torre-enfriamiento': {
    id: 'torre-enfriamiento', nombre: 'Torre de enfriamiento de agua', claseIso: 'Intercambiadores de calor (torres)', tren: 'agua',
    siFalla: 'El agua no se puede verter caliente (más de 40 °C): limita el tren de agua y con él los pozos (19 §2.2)',
    referencia: { texto: 'En Castilla 2, los 5 elementos más críticos son del tratamiento de agua', fuente: 'Investigación 19 §2.2, [5, Tabla 8.15]' },
    partes: [
      { id: 'transferencia', nombre: 'Relleno y transferencia de calor', itemIso: 'Relleno', modos: ['PDE', 'PLU'],
        accion: 'Revisar el relleno y los ventiladores antes de que el agua de salida pase de 40 °C: arriba de eso no se puede verter.',
        variables: [{ isa: 'TI', nombre: 'Temperatura del agua de salida', unidad: '°C', papel: 'avisa', limite: '< 40', fuente: 'El agua no puede verterse a más de 40 °C (investigación 19 §2.2)' }] },
      { id: 'ventilador', nombre: 'Ventilador', itemIso: 'Ventilador', modos: ['VIB', 'BRD'],
        variables: [{ isa: 'VI', nombre: 'Vibración del ventilador', unidad: 'mm/s', papel: 'avisa', limite: '< 7', fuente: SUPUESTO('Vibración del ventilador') }] },
    ],
    avisa: 'La torre que va a dejar el agua demasiado caliente para verterla',
  },
  separador: {
    id: 'separador', nombre: 'Separador o FWKO (separador de agua libre)', claseIso: 'Separadores', tren: 'crudo',
    siFalla: 'Si el agua libre no se separa, pasa al tratador y al tanque; si se llena, cierra la entrada y frena los pozos',
    referencia: { texto: 'El primer equipo que recibe lo de los pozos: si cierra, frena todo lo que entra', fuente: 'Investigación 19 §1.2' },
    partes: [
      { id: 'interfase', nombre: 'Control de interfase', itemIso: 'Instrumentación de nivel', modos: ['PDE', 'ERO'],
        accion: 'Revisar la válvula de descarga de agua y el transmisor de interfase antes de que el nivel llegue al alto.',
        variables: [{ isa: 'LI', nombre: 'Nivel de interfase', unidad: '%', papel: 'avisa', limite: '35 – 65', fuente: 'La misma banda del separador trifásico V-101 (la ficha de V-101)' }] },
    ],
    avisa: 'El separador que va a dejar pasar agua o cerrar la entrada',
  },
  'bomba-diluyente': {
    id: 'bomba-diluyente', nombre: 'Bomba de diluyente', claseIso: 'Bombas (dosificadoras)', tren: 'crudo',
    siFalla: 'Sin nafta el crudo pesado no se puede bombear: se cierran pozos (investigación 20, §3; la causa «Falta de diluyente»)',
    referencia: { texto: 'Castilla necesita ≈18 % de nafta para llegar a ≈290 cSt', fuente: 'Investigación 19 §2.2, [6]' },
    partes: [
      { id: 'dosificacion', nombre: 'Dosificación', itemIso: 'Bomba dosificadora', modos: ['LOO', 'FTS'],
        accion: 'Revisar la succión y las válvulas de la dosificadora antes de que la nafta no alcance: sin ella se cierran pozos.',
        variables: [{ isa: 'FI', nombre: 'Caudal de nafta', unidad: 'bbl/d', papel: 'avisa', limite: '> 2.000', fuente: SUPUESTO('Caudal mínimo de nafta para la viscosidad de despacho') }] },
    ],
    avisa: 'La dosificadora que se va a quedar corta de nafta',
  },
}

export const FAMILIAS_PLANTA: Readonly<Record<FamiliaPlanta, DefinicionFamilia>> = { ...ENERGIA_Y_AIRE, ...RESTO_PLANTA }

/** La familia de un equipo de la planta por su clase de ISO 14224 (la del registro de ingeniería). */
export const FAMILIA_DE_CLASE: Readonly<Record<string, FamiliaPlanta>> = {
  'compresor-aire': 'compresor-aire', ups: 'ups', generador: 'generador', transformador: 'transformador',
  'bomba-transferencia': 'bomba-transferencia', 'tratador-electrostatico': 'tratador', 'torre-enfriamiento': 'torre-enfriamiento',
  'separador-agua-libre': 'separador', 'bomba-diluyente': 'bomba-diluyente',
}
