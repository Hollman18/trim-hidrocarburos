/** Las partes que fallan, por familia de bomba.
 *
 *  El vigía no habla de variables sueltas: habla de PARTES. Tres variables
 *  que se mueven juntas (la barrera del sello pierde nivel, la presión de
 *  barrera baja, la descarga se calienta) dicen una sola cosa: el sello.
 *  Agruparlas da una alerta con nombre y fecha, que es lo que un técnico
 *  convierte en una orden de trabajo y un planeador en un pedido de repuesto.
 *
 *  La parte es el «ítem mantenible» de ISO 14224 (nivel 8 de la taxonomía):
 *  contra ella se registra la falla en el CMMS. El peso de cada parte sale de
 *  datos de mantenimiento publicados, y cada una dice de dónde.
 *
 *  Es librería del producto, versionada por familia, igual que las fórmulas:
 *  no se escribe por cliente. Investigación: TRIM-petroleras/investigacion/03 y 18.
 */
import type { Subtipo, VariableId } from './bombas'

export type ParteId =
  | 'sello' | 'succion' | 'rodamientos' | 'hidraulica' | 'motor'
  | 'tornillos' | 'filtro' | 'lubricacion'
  // electrosumergible
  | 'aislamiento' | 'protector' | 'bomba' | 'admision'

/** Familia de equipo a la que pertenece un catálogo de partes. */
export type Familia = 'inyeccion' | 'multifasica' | 'electrosumergible'

/** Qué dice la variable de la parte. */
export type PapelVariable =
  /** Su tendencia anticipa la falla de la parte. */
  | 'avisa'
  /** Es lo que daña a la parte: vigilarla es vigilar la causa. */
  | 'causa'
  /** Cambia cuando la falla ya empezó: confirma, no anticipa. */
  | 'confirma'

export interface Parte {
  id: ParteId
  nombre: string
  /** Ítem mantenible de ISO 14224 contra el que se registra la falla. */
  itemIso: string
  /** Cuánto pesa entre las fallas, con su fuente. */
  peso: { texto: string; fuente: string }
  variables: Array<{ id: VariableId; papel: PapelVariable }>
  /** Modos de falla de ISO 14224 (Annex B) que produce. */
  modos: string[]
  /** Qué anticipación se puede prometer, y con qué respaldo. */
  anticipacion: string
  /** Lo que se hace cuando avisa. */
  accion: string
}

const ESA = 'European Sealing Association, ESA-MSD-2025-01 (28-oct-2025): 3.500 fallas de bombas en 18 usuarios'
const MOTORES = 'Encuestas de confiabilidad de motores de EPRI (≈4.800 motores) y del IEEE (1.141 motores)'
const ABS_PF = 'ABS, Guidance Notes on RCM (2004): la tendencia de desempeño «varía mucho»; se mide en el piloto'

const MOTOR = (vars: Parte['variables']): Parte => ({
  id: 'motor', nombre: 'Motor eléctrico', itemIso: 'Motor de accionamiento',
  peso: { texto: 'En motores grandes fallan más los rodamientos (41–44 %) que los devanados (26–36 %)', fuente: MOTORES },
  variables: vars,
  modos: ['OHE', 'UST', 'FTS', 'VIB'],
  anticipacion: 'La temperatura de devanado sube días antes. El aislamiento se prueba fuera de línea: eso no se anticipa con el PLC.',
  accion: 'Revisar ventilación y carga del motor; programar la prueba de aislamiento.',
})

/** Inyección y disposición (API 610 / HPS). Mueve un solo fluido y mide su
 *  caudal: por eso tiene la mejor señal de desgaste, la energía por barril. */
export const PARTES_INYECCION: Parte[] = [
  {
    id: 'sello', nombre: 'Sello mecánico', itemIso: 'Sello del eje',
    peso: { texto: '60 % de las fallas de bombas: el componente que más falla', fuente: ESA },
    variables: [
      { id: 'p_succion', papel: 'causa' },
      { id: 'v_bomba', papel: 'causa' },
      { id: 'fuga_sello', papel: 'confirma' },
    ],
    modos: ['ELP', 'INL'],
    anticipacion: 'La fuga avisa cuando ya empezó. Lo que se anticipa es lo que lo daña: el 49 % de los sellos que fallan antes de tiempo los daña la operación (cavitación, marcha en seco, válvulas cerradas), y eso se ve en la succión y la vibración.',
    accion: 'Corregir la succión y revisar el plan de sello; tener el cartucho de repuesto en sitio antes de que la fuga crezca.',
  },
  {
    id: 'succion', nombre: 'Succión y filtro de entrada', itemIso: 'Tubería y filtro de entrada',
    peso: { texto: 'En Palo Azul (Ecuador), la orden de trabajo más frecuente: filtros de succión tapados que apagaban la bomba por baja succión', fuente: 'Análisis CMD del sistema de reinyección de Palo Azul, Petroamazonas EP (Redalyc)' },
    variables: [
      { id: 'p_succion', papel: 'avisa' },
      { id: 'nivel_tanque', papel: 'causa' },
    ],
    modos: ['UST', 'PLU', 'LOO'],
    anticipacion: 'De horas a días: la presión de succión baja a medida que el filtro se tapa o el tanque pierde nivel.',
    accion: 'Limpiar el filtro o recuperar nivel en el tanque antes de que la bomba dispare por baja succión.',
  },
  {
    id: 'rodamientos', nombre: 'Rodamientos y cámara de empuje', itemIso: 'Rodamiento axial y radial',
    peso: { texto: '10 % de las fallas de bombas', fuente: ESA },
    variables: [
      { id: 't_empuje', papel: 'avisa' },
      { id: 'v_bomba', papel: 'avisa' },
      { id: 'nivel_aceite_empuje', papel: 'causa' },
    ],
    modos: ['OHE', 'VIB', 'NOI'],
    anticipacion: 'De días a semanas: la temperatura de la cámara y la vibración global suben antes de la falla. Leyendo cada minuto se ve la tendencia, no el defecto del rodamiento.',
    accion: 'Revisar aceite de la cámara de empuje y alineación; programar el cambio con el repuesto en mano.',
  },
  {
    id: 'hidraulica', nombre: 'Impulsores y desgaste interno', itemIso: 'Impulsor y anillos de desgaste',
    peso: { texto: 'No para la bomba: le baja la eficiencia y la empuja a fallar por otra parte', fuente: ABS_PF },
    variables: [
      { id: 'energia', papel: 'avisa' },
      { id: 'caudal', papel: 'confirma' },
      { id: 'p_descarga', papel: 'confirma' },
    ],
    modos: ['LOO', 'PDE'],
    anticipacion: 'Semanas a meses. La norma dice que la tendencia de desempeño varía mucho: el plazo real se mide en el piloto.',
    accion: 'Programar el overhaul en la próxima ventana, comparando contra la curva de fábrica.',
  },
  MOTOR([
    { id: 't_devanado', papel: 'avisa' },
    { id: 'corriente', papel: 'confirma' },
    { id: 'velocidad', papel: 'confirma' },
  ]),
]

/** Multifásica de doble tornillo (API 676). Cuatro sellos, y la arena es la
 *  que se come los tornillos. */
export const PARTES_MULTIFASICA: Parte[] = [
  {
    id: 'sello', nombre: 'Sellos mecánicos (cuatro)', itemIso: 'Sello del eje',
    peso: { texto: 'Cuatro sellos por bomba, dos por eje. El sello es el componente que más falla en bombas: 60 %', fuente: `Pumps & Systems, sellado en bombeo multifásico; ${ESA}` },
    variables: [
      { id: 'nivel_barrera', papel: 'avisa' },
      { id: 'p_barrera', papel: 'avisa' },
      { id: 't_descarga', papel: 'causa' },
    ],
    modos: ['ELP', 'ELU', 'INL'],
    anticipacion: 'Días: el depósito de barrera pierde nivel antes de que la fuga se vea afuera.',
    accion: 'Reponer y vigilar la barrera; cambiar el sello en una ventana programada.',
  },
  {
    id: 'tornillos', nombre: 'Tornillos y holguras', itemIso: 'Rotor de tornillos y camisa',
    peso: { texto: 'La arena abre las holguras: la bomba sube la velocidad para sostener el caudal, y la erosión crece con la velocidad', fuente: 'API 676, 4.ª ed. 2022, Anexo B' },
    variables: [
      { id: 'velocidad', papel: 'avisa' },
      { id: 't_descarga', papel: 'confirma' },
    ],
    modos: ['LOO', 'INL', 'PDE'],
    anticipacion: 'Semanas: la velocidad sube a caudal constante. Solo cuenta si la presión diferencial no cambió; si cambió, la subida puede ser del proceso.',
    accion: 'Revisar el manejo de arena aguas arriba; programar el cambio de tornillos o camisa.',
  },
  {
    id: 'filtro', nombre: 'Filtro de entrada', itemIso: 'Filtro de succión',
    peso: { texto: 'API 676 pide alarma de presión diferencial en el filtro de entrada', fuente: 'API 676, 4.ª ed. 2022, B.2.1.4' },
    variables: [
      { id: 'dp_filtro', papel: 'avisa' },
      { id: 'p_succion', papel: 'confirma' },
    ],
    modos: ['PLU', 'LOO'],
    anticipacion: 'De horas a días: la caída de presión crece a medida que se tapa.',
    accion: 'Limpiar o cambiar la canasta del filtro antes del disparo.',
  },
  {
    id: 'rodamientos', nombre: 'Rodamientos', itemIso: 'Rodamientos de la bomba',
    peso: { texto: '10 % de las fallas de bombas', fuente: ESA },
    variables: [
      { id: 't_rod_bomba', papel: 'avisa' },
      { id: 'v_bomba', papel: 'avisa' },
    ],
    modos: ['OHE', 'VIB', 'NOI'],
    anticipacion: 'De días a semanas: temperatura y vibración global suben antes de la falla.',
    accion: 'Revisar lubricación y alineación; programar el cambio con el repuesto en mano.',
  },
  {
    id: 'lubricacion', nombre: 'Lubricación', itemIso: 'Sistema de lubricación (API 614)',
    peso: { texto: 'Sin peso publicado: es la causa más común de que fallen los rodamientos', fuente: 'API 614; doc. 03 de la investigación' },
    variables: [
      { id: 'p_aceite', papel: 'avisa' },
      { id: 't_aceite', papel: 'avisa' },
    ],
    modos: ['OHE', 'PDE'],
    anticipacion: 'Horas a días.',
    accion: 'Revisar nivel, filtro y enfriador del aceite.',
  },
  MOTOR([
    { id: 't_devanado', papel: 'avisa' },
    { id: 't_rod_motor', papel: 'avisa' },
    { id: 'v_motor', papel: 'avisa' },
    { id: 'corriente', papel: 'confirma' },
  ]),
]

const LIBIA = 'Mahmud, Journal of Energy and Power Technology (2026): 673 fallas de electrosumergibles en 47 pozos de Libia'
const AVISA_CORRIENTE = 'La corriente del variador avisa antes que la presión y las temperaturas (Camilleri, SPE 219556); en un piloto de 30 bombas, 12 días antes (JPT, 2019)'

/** Electrosumergible: lo que se ve desde el variador y el sensor de fondo.
 *  El peso es el de las fallas desarmadas en 47 pozos (sobre 673). */
export const PARTES_ESP: Parte[] = [
  {
    id: 'aislamiento', nombre: 'Aislamiento del motor y del cable', itemIso: 'Cable de potencia y devanado del motor',
    peso: { texto: 'Corto a tierra en el fondo: la falla individual más común, 120 de 673 (18 %)', fuente: LIBIA },
    variables: [
      { id: 'desbalance', papel: 'avisa' },
      { id: 'corriente', papel: 'confirma' },
    ],
    modos: ['UST', 'BRD'],
    anticipacion: `El desbalance de fases crece a medida que el aislamiento se degrada. ${AVISA_CORRIENTE}.`,
    accion: 'Programar la prueba de aislamiento desde superficie y tener listo el equipo de reemplazo y el taladro.',
  },
  {
    id: 'protector', nombre: 'Protector (sello del motor)', itemIso: 'Sección sellante',
    peso: { texto: 'Protector inundado: 90 de 673 (13 %). Deja entrar fluido al motor y termina en corto', fuente: LIBIA },
    variables: [
      { id: 't_motor', papel: 'avisa' },
      { id: 'desbalance', papel: 'confirma' },
    ],
    modos: ['INL', 'OHE'],
    anticipacion: 'La temperatura del motor sube cuando el fluido del pozo empieza a entrar. Días a semanas.',
    accion: 'Revisar la tendencia de temperatura y planear el cambio antes de que el motor se aterrice.',
  },
  {
    id: 'bomba', nombre: 'Bomba de fondo (eje y etapas)', itemIso: 'Etapas y eje de la bomba',
    peso: { texto: 'Eje pegado 75 de 673 (11 %) y taponamiento por sólidos 45 (7 %)', fuente: LIBIA },
    variables: [
      { id: 'corriente', papel: 'avisa' },
      { id: 'pip', papel: 'confirma' },
    ],
    modos: ['UST', 'LOO', 'PLU'],
    anticipacion: `A frecuencia fija, la corriente sube cuando la bomba se frena por sólidos o roce. ${AVISA_CORRIENTE}.`,
    accion: 'Revisar sólidos y escala; programar tratamiento químico o el cambio de la bomba.',
  },
  {
    id: 'admision', nombre: 'Admisión y separador de gas', itemIso: 'Admisión y separador de gas',
    peso: { texto: 'Separador de gas y admisión: 45 de 673 (7 %). Bombear gas o en vacío dispara por baja carga', fuente: LIBIA },
    variables: [
      { id: 'pip', papel: 'avisa' },
      { id: 'corriente', papel: 'confirma' },
    ],
    modos: ['UST', 'LOO'],
    anticipacion: 'La presión de entrada baja hacia el punto de burbuja o de bombeo en vacío. Horas a días.',
    accion: 'Bajar la frecuencia o revisar el nivel de fluido antes de que dispare por baja carga.',
  },
  {
    id: 'motor', nombre: 'Motor de fondo', itemIso: 'Motor eléctrico de fondo',
    peso: { texto: 'Las fallas eléctricas son 187 de 673 (28 %); la temperatura del motor es la que las anuncia', fuente: LIBIA },
    variables: [
      { id: 't_motor', papel: 'avisa' },
      { id: 'corriente', papel: 'causa' },
    ],
    modos: ['OHE', 'UST'],
    anticipacion: 'La temperatura del motor sube días antes; la sobrecarga la causa.',
    accion: 'Revisar el enfriamiento (caudal por el motor) y la carga.',
  },
]

export const partesDe = (s: Subtipo | 'electrosumergible'): Parte[] =>
  s === 'multifasica' ? PARTES_MULTIFASICA : s === 'electrosumergible' ? PARTES_ESP : PARTES_INYECCION

/** Nombre corto de la parte cuando se juntan bombas de distinta familia
 *  (un Pareto de todo el campo): el sello de una multifásica y el de una de
 *  inyección son el mismo ítem mantenible. */
export const NOMBRE_PARTE: Record<ParteId, string> = {
  sello: 'Sello mecánico',
  succion: 'Succión y filtro de entrada',
  rodamientos: 'Rodamientos',
  hidraulica: 'Desgaste interno',
  motor: 'Motor eléctrico',
  tornillos: 'Tornillos y holguras',
  filtro: 'Filtro de entrada',
  lubricacion: 'Lubricación',
  aislamiento: 'Aislamiento del motor y del cable',
  protector: 'Protector del motor',
  bomba: 'Bomba de fondo',
  admision: 'Admisión y gas',
}
