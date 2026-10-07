/** Las dos familias de bomba que deciden la producción de una planta.
 *
 *  - MULTIFÁSICA: lleva la mezcla de aceite, agua y gas de un grupo de pozos
 *    hasta la planta sin separarla. Si se para, esos pozos dejan de fluir.
 *  - INYECCIÓN: saca el agua producida. Si se para y el agua no tiene otra
 *    salida, los tanques se llenan y hay que cerrar pozos.
 *
 *  Con cortes de agua de 92 % a 98 % (Ecopetrol), por cada barril de crudo hay
 *  que mover de 12 a 40 de agua: la bomba que la mueve es el cuello de botella.
 *  Investigación completa: TRIM-petroleras/investigacion/18.
 */

import { insumos, perezoso } from './insumos'
import type { ParteId } from './partes'

export type Subtipo = 'multifasica' | 'inyeccion'

export type Tecnologia = 'doble-tornillo' | 'helico-axial' | 'centrifuga-hps' | 'centrifuga-api610' | 'reciprocante'

/** Qué hace con su fluido. Decide si una parada es diferido de hoy. */
export type Papel =
  /** Multifásica: lleva la producción de los pozos a la planta. */
  | 'transporte'
  /** El agua no tiene otra salida: parar es cerrar pozos. */
  | 'disposicion'
  /** Mantiene la presión del yacimiento y hay otra salida para el agua: parar
   *  no cierra pozos hoy, baja el soporte de presión en semanas. */
  | 'recobro'

export type VariableId =
  | 'p_succion' | 't_succion' | 'dp_filtro' | 'p_descarga' | 't_descarga'
  | 't_rod_bomba' | 'v_bomba' | 't_devanado' | 't_rod_motor' | 'v_motor'
  | 'velocidad' | 'corriente' | 'p_barrera' | 'nivel_barrera' | 'p_aceite' | 't_aceite'
  | 'nivel_tanque' | 'caudal' | 'energia' | 't_empuje' | 'nivel_aceite_empuje'
  | 'fuga_sello' | 'p_cabezal'
  // electrosumergible: variador y sensor de fondo
  | 'frecuencia' | 'pip' | 't_motor' | 'desbalance'

/** Una variable del P&ID típico de la familia. */
export interface Plantilla {
  id: VariableId
  /** Letras de ISA-5.1. */
  isa: string
  nombre: string
  donde: string
  /** Si la tendencia de esta variable anuncia un mecanismo de ISO 14224. */
  anuncia?: { mecanismo: string; sentido: 'sube' | 'baja'; por: string }
}

/** API 676, 4.ª ed. (2022), Anexo G · Typical P&D for MPP Pumps. Diez puntos
 *  de medida más variador, sistema de sello (API 682) y lubricación (API 614). */
export const PLANTILLA_MULTIFASICA: Plantilla[] = [
  { id: 'p_succion', isa: 'PT', nombre: 'Presión de succión', donde: 'Succión' },
  { id: 't_succion', isa: 'TE', nombre: 'Temperatura de succión', donde: 'Succión' },
  { id: 'dp_filtro', isa: 'DPT', nombre: 'Caída de presión del filtro', donde: 'Filtro canasta doble',
    anuncia: { mecanismo: '5.1', sentido: 'sube',
      por: 'Entra arena o sólidos. API 676 B.2.1.4 pide alarma de presión diferencial en el filtro de entrada.' } },
  { id: 'p_descarga', isa: 'PT', nombre: 'Presión de descarga', donde: 'Descarga' },
  { id: 't_descarga', isa: 'TE', nombre: 'Temperatura de descarga', donde: 'Descarga',
    anuncia: { mecanismo: '2.7', sentido: 'sube',
      por: 'Con fracción de gas alta, el gas comprimido calienta la bomba si falta líquido de recirculación (SPE 146784).' } },
  { id: 't_rod_bomba', isa: 'TE', nombre: 'Temperatura de rodamiento', donde: 'Bomba · nota 1 del Anexo G',
    anuncia: { mecanismo: '2.4', sentido: 'sube', por: 'Desgaste o falta de lubricación del rodamiento.' } },
  { id: 'v_bomba', isa: 'VT', nombre: 'Vibración', donde: 'Caja de rodamientos de la bomba',
    anuncia: { mecanismo: '1.2', sentido: 'sube', por: 'Desbalance, holguras o rodamiento. Límite de campo: API 676 6.11.2.' } },
  { id: 't_devanado', isa: 'TE', nombre: 'Temperatura de devanado', donde: 'Motor · nota 2 del Anexo G' },
  { id: 't_rod_motor', isa: 'TE', nombre: 'Temperatura de rodamiento del motor', donde: 'Motor · nota 2 del Anexo G' },
  { id: 'v_motor', isa: 'VT', nombre: 'Vibración del motor', donde: 'Motor' },
  { id: 'velocidad', isa: 'SI', nombre: 'Velocidad', donde: 'Variador',
    anuncia: { mecanismo: '2.3', sentido: 'sube',
      por: 'A presión diferencial constante, necesitar más velocidad es perder eficiencia volumétrica: la arena abrió las holguras de tornillos y camisa (API 676 B.2.1.2).' } },
  { id: 'corriente', isa: 'II', nombre: 'Corriente', donde: 'Variador' },
  { id: 'p_barrera', isa: 'PT', nombre: 'Presión de barrera del sello', donde: 'Sistema de sello · API 682' },
  { id: 'nivel_barrera', isa: 'LT', nombre: 'Nivel del depósito de barrera', donde: 'Sistema de sello · API 682',
    anuncia: { mecanismo: '1.1', sentido: 'baja',
      por: 'El sello mecánico pierde fluido de barrera. Es el componente que más pesa en el MTBF de esta familia.' } },
  { id: 'p_aceite', isa: 'PT', nombre: 'Presión de aceite', donde: 'Lubricación · API 614' },
  { id: 't_aceite', isa: 'TE', nombre: 'Temperatura de aceite', donde: 'Lubricación · API 614' },
]

/** Inyección y disposición: API 610 para centrífugas de proceso; la HPS
 *  hereda su diseño de la electrosumergible y cumple varios rasgos de API 610.
 *  A diferencia de la multifásica, mueve un solo fluido y su caudal SÍ se mide.
 *  Con un medidor de potencia se podría leer la mejor señal de desgaste, la
 *  energía por barril; en esta fase no se instala, y queda como hueco. */
export const PLANTILLA_INYECCION: Plantilla[] = [
  { id: 'p_succion', isa: 'PT', nombre: 'Presión de succión', donde: 'Succión',
    anuncia: { mecanismo: '2.1', sentido: 'baja',
      por: 'Si cae por debajo de lo que exige el NPSH de la bomba, el agua hierve en el ojo del impulsor: cavitación.' } },
  { id: 'nivel_tanque', isa: 'LT', nombre: 'Nivel del tanque de succión', donde: 'Tanque de agua',
    anuncia: { mecanismo: '2.1', sentido: 'baja', por: 'Es lo que sostiene la presión de succión.' } },
  { id: 'p_descarga', isa: 'PT', nombre: 'Presión de descarga', donde: 'Descarga' },
  { id: 'caudal', isa: 'FT', nombre: 'Caudal', donde: 'Descarga' },
  { id: 'energia', isa: 'JI', nombre: 'Energía por barril', donde: 'Calculada: potencia sobre caudal',
    anuncia: { mecanismo: '2.4', sentido: 'sube',
      por: 'Mover el mismo caudal cuesta más energía: desgaste de impulsores, difusores o rodamientos.' } },
  { id: 't_empuje', isa: 'TE', nombre: 'Temperatura de la cámara de empuje', donde: 'Cámara de empuje',
    anuncia: { mecanismo: '2.4', sentido: 'sube',
      por: 'El rodamiento de empuje se calienta antes de fallar; con aceite contaminado hay que cambiar la cámara entera.' } },
  { id: 'nivel_aceite_empuje', isa: 'LT', nombre: 'Nivel de aceite de la cámara', donde: 'Cámara de empuje' },
  { id: 'v_bomba', isa: 'VT', nombre: 'Vibración', donde: 'Caja de rodamientos',
    anuncia: { mecanismo: '1.2', sentido: 'sube', por: 'Desbalance o rodamiento. Límites: API 610, Tabla 8.' } },
  { id: 'fuga_sello', isa: 'LSH', nombre: 'Fuga del sello', donde: 'Plan de sello API 65',
    anuncia: { mecanismo: '1.1', sentido: 'sube', por: 'Detección de fuga de líquido del sello mecánico.' } },
  { id: 'corriente', isa: 'II', nombre: 'Corriente', donde: 'Motor' },
  { id: 't_devanado', isa: 'TE', nombre: 'Temperatura de devanado', donde: 'Motor' },
  { id: 'velocidad', isa: 'SI', nombre: 'Velocidad', donde: 'Variador' },
  { id: 'p_cabezal', isa: 'PT', nombre: 'Presión del cabezal de inyección', donde: 'Aguas abajo' },
]

export const plantillaDe = (s: Subtipo) => s === 'multifasica' ? PLANTILLA_MULTIFASICA : PLANTILLA_INYECCION

/** Lo que la bomba no puede decir de sí misma. Los barriles tienen que venir
 *  de otro sistema, y el producto declara de cuál. */
export const NO_DA: Record<Subtipo, Array<{ que: string; porque: string; deDonde: string }>> = {
  multifasica: [
    { que: 'Caudal real', porque: 'En desplazamiento positivo el caudal depende de la eficiencia volumétrica, que es justo lo que se desgasta',
      deDonde: 'Medidor multifásico o pruebas de pozo' },
    { que: 'Fracción de gas (GVF)', porque: 'No está en el P&ID típico de API 676', deDonde: 'Medidor multifásico o separador de prueba' },
    { que: 'Corte de agua', porque: 'La bomba mueve la mezcla sin separarla', deDonde: 'Pruebas de pozo' },
    { que: 'Crudo que pasa', porque: 'Es el número que se reporta y la bomba no lo mide', deDonde: 'Pruebas de pozo y asignación' },
  ],
  inyeccion: [
    { que: 'Crudo en riesgo', porque: 'La bomba mueve agua; el crudo depende de qué pozos se cierren', deDonde: 'Caudales del campo y pruebas de pozo' },
  ],
}

/** Punto de alarma de una variable y de dónde sale. Vive en el límite de cada
 *  tag (`limites.ts`), no en el perfil de la bomba: una sola fuente. */
export interface Alarma { alta?: number; baja?: number; fuente: string }

/** Lo que no cambia de un campo a otro: qué máquina es y qué tags tiene. */
interface Maquina {
  subtipo: Subtipo
  tecnologia: Tecnologia
  norma: string
  /** Tag del PLC para cada variable de la plantilla que esté instrumentada.
   *  Las de la plantilla que falten son el hueco a instalar. */
  tags: Partial<Record<VariableId, string>>
  /** Interruptores de disparo que congela el PLC como primera alarma
   *  (first-out) y la parte que cada uno protege. Son de ESTA máquina, como
   *  sus tags: un tag de otra bomba no le dice nada a esta. Un tag que no está
   *  aquí no identifica la parte (la parada sigue a la firma o a la respuesta). */
  primerasAlarmas: Record<string, ParteId>
}

const MAQUINAS: Record<string, Maquina> = {
  'P-201B': {
    subtipo: 'inyeccion', tecnologia: 'centrifuga-hps',
    norma: 'Centrífuga multietapa horizontal · API 610 (Tabla 8)',
    tags: {
      // Juego mínimo de esta fase: lo que da el PLC (succión, descarga,
      // caudal, marcha/paro y primera alarma) más vibración en línea,
      // temperatura de empuje, fuga de sello, corriente y nivel del tanque.
      p_succion: 'PI-2010', p_descarga: 'PDI-2011', caudal: 'FI-2011', v_bomba: 'VI-2011',
      t_empuje: 'TI-2011', fuga_sello: 'LSH-2013', corriente: 'II-2011', nivel_tanque: 'LT-2012',
    },
    primerasAlarmas: {
      'LSH-2013': 'sello',
      'PSL-2010': 'succion', 'PDSH-2010': 'succion',
      'TSH-2011': 'rodamientos', 'VSH-2011': 'rodamientos',
      'TSH-2014': 'motor', 'ISH-2011': 'motor',
    },
  },
  'MPP-301': {
    subtipo: 'multifasica', tecnologia: 'doble-tornillo',
    norma: 'Doble tornillo · API 676, 4.ª ed. 2022 (Anexos B y G)',
    tags: {
      p_succion: 'PT-3011', t_succion: 'TE-3011', dp_filtro: 'PDT-3011', p_descarga: 'PT-3012',
      t_descarga: 'TE-3012', t_rod_bomba: 'TE-3013', v_bomba: 'VT-3013', t_devanado: 'TE-3014',
      t_rod_motor: 'TE-3015', v_motor: 'VT-3015', velocidad: 'SI-3016', corriente: 'II-3016',
      p_barrera: 'PT-3017', nivel_barrera: 'LT-3017', p_aceite: 'PT-3018', t_aceite: 'TE-3018',
    },
    // Los del lazo 30xx: el sello avisa por el nivel del depósito de barrera
    // (API 682), no por un interruptor de fuga como la centrífuga.
    primerasAlarmas: {
      'LSL-3017': 'sello',
      'PDSH-3011': 'filtro',
      'TSH-3013': 'rodamientos', 'VSH-3013': 'rodamientos',
      'TSH-3014': 'motor', 'ISH-3016': 'motor',
      'TSH-3018': 'lubricacion',
    },
  },
}

/* Los catálogos se buscan solo por claves propias: un id que llega de un
   enlace («constructor», «__proto__», «toString») no puede devolver una
   función del prototipo y tumbar la pantalla. */
const propio = <T,>(o: Record<string, T> | undefined, k: string): T | undefined =>
  o && Object.hasOwn(o, k) ? o[k] : undefined

export const esBomba = (equipoId: string) => Object.hasOwn(MAQUINAS, equipoId)

/** Lo que es de cada campo. El respaldo y el tanque de agua NO van aquí: son
 *  configuración firmada (`respaldoDe` y `tanqueDe` en configuracion.ts) y
 *  cambian con la firma del administrador; aquí quedarían viejos. */
interface PerfilCampo {
  papel: Papel
  /** Capacidad nominal en el fluido que mueve, bbl/d. */
  capacidadBpd: number
  /** Multifásica: los pozos cuyo crudo pasa por ella. */
  pozos?: string[]
  /** Fracción de lo servido que NO fluye sin la bomba. 1 si no hay derivación. */
  sinBomba: { fraccion: number; fuente: string }
}

const PERFILES: Record<string, Record<string, PerfilCampo>> = {
  ceiba: {
    'P-201B': {
      papel: 'disposicion', capacidadBpd: 20400,
      sinBomba: { fraccion: 1, fuente: 'El agua no tiene otra salida: los pozos de disposición son su único destino' },
    },
  },
  morichal: {
    'P-201B': {
      papel: 'disposicion', capacidadBpd: 24000,
      sinBomba: { fraccion: 1, fuente: 'Lo que P-201A no absorbe no tiene otra salida' },
    },
    'MPP-301': {
      papel: 'transporte', capacidadBpd: 22000,
      pozos: ['MN-07', 'MN-18', 'MN-33'],
      sinBomba: { fraccion: 1, fuente: 'Declarado por ingeniería: sin la bomba, la contrapresión de la línea no deja fluir el clúster' },
    },
  },
  guacamayo: {
    'P-201B': {
      papel: 'recobro', capacidadBpd: 13000,
      sinBomba: { fraccion: 0, fuente: 'El agua tiene salida alterna: la parada no cierra pozos' },
    },
  },
}

export type PerfilBomba = Maquina & PerfilCampo & { equipo: string; campoId: string }

/** La bomba en ese campo, o undefined si no es bomba o no está configurada.
 *  Una bomba sin perfil se muestra como hueco de configuración, nunca con el
 *  perfil de otro campo. */
export function perfilBomba(equipo: string, campoId: string): PerfilBomba | undefined {
  const m = propio(MAQUINAS, equipo), p = propio(propio(PERFILES, campoId), equipo)
  return m && p ? { ...m, ...p, equipo, campoId } : undefined
}

export const maquina = (equipo: string) => propio(MAQUINAS, equipo)

export const PAPEL_NOMBRE: Record<Papel, string> = {
  transporte: 'Lleva la producción a planta',
  disposicion: 'Disposición de agua',
  recobro: 'Inyección para recobro',
}

/** La clase ISO 14224 de cada tecnología: la misma que trae el registro de
 *  ingeniería (`clase` en `GET …/tags/:tag/procedencia`). Es de ella, con el
 *  papel de la bomba, de donde sale el catálogo de daños (`claseDeCatalogo`):
 *  el catálogo no se adivina por el id de la máquina. */
export const CLASE_ISO: Record<Tecnologia, string> = {
  'doble-tornillo': 'bomba-multifasica',
  'helico-axial': 'bomba-multifasica',
  'centrifuga-hps': 'bomba-centrifuga',
  'centrifuga-api610': 'bomba-centrifuga',
  reciprocante: 'bomba-reciprocante',
}

export const TECNOLOGIA_NOMBRE: Record<Tecnologia, string> = {
  'doble-tornillo': 'Doble tornillo',
  'helico-axial': 'Hélico-axial',
  'centrifuga-hps': 'Centrífuga horizontal multietapa',
  'centrifuga-api610': 'Centrífuga de proceso API 610',
  reciprocante: 'Reciprocante de émbolo',
}

/* ─────────────────────────── Eventos del PLC ─────────────────────────── */

/** Una parada o reducción de la bomba, como la registra su PLC. Nada de esto
 *  lo escribe una persona: la causa se deduce de la primera alarma y de la
 *  firma de las señales (`causa-senal.ts`). */
export interface EventoBomba {
  id: string
  campoId: string
  equipo: string
  /** ISO 8601 con zona. La pone el PLC. */
  inicio: string
  /** null mientras siga abierto. */
  fin: string | null
  /** Fracción de la capacidad que se perdió: 1 es parada total. */
  perdida: number
  /** Señal del PLC que marca el evento. */
  senal: string
  /** Primera alarma que congeló el PLC al disparar (first-out). Sin ella, la
   *  parte se busca en la firma de las señales. */
  primeraAlarma?: { tag: string; texto: string }
  /** La parte que la firma de las señales señalaba EN EL INSTANTE DE PARAR,
   *  con el instrumento que la delató. La decide quien registra la parada (el
   *  backend, con las lecturas de ese instante) y se guarda con el evento: no
   *  cambia cuando la parada se cierra ni cuando las lecturas vuelven a banda. */
  firma?: { parte: ParteId; tag?: string; texto: string }
  /** Nivel del tanque de agua al parar, del transmisor. Con la tabla de aforo
   *  da el colchón. */
  nivelAlParar?: { tag: string; pct: number }
}

/** Las paradas vienen del registro del PLC (`GET …/bombas/:equipo/paradas`),
 *  de todas las bombas. En el demo, de `datos/paradas-bombas.ts` (ver insumos.ts). */
export const eventosBomba = (): readonly EventoBomba[] => insumos().paradasBombas

/* Por campo y equipo, una vez: la vista de bombas y la causa de cada evento
   las piden en bucle. */
const PARADAS_POR_EQUIPO = perezoso(() => {
  const m = new Map<string, EventoBomba[]>()
  for (const e of insumos().paradasBombas) {
    const k = `${e.campoId}|${e.equipo}`, g = m.get(k)
    if (g) g.push(e); else m.set(k, [e])
  }
  return m
})
const PARADAS_POR_CAMPO = perezoso(() => {
  const m = new Map<string, EventoBomba[]>()
  for (const e of insumos().paradasBombas) { const g = m.get(e.campoId); if (g) g.push(e); else m.set(e.campoId, [e]) }
  return m
})
/** Las paradas de todas las bombas de un campo. */
export const paradasDeCampo = (campoId: string): readonly EventoBomba[] => PARADAS_POR_CAMPO().get(campoId) ?? []
const PARADA_POR_ID = perezoso(() => new Map(insumos().paradasBombas.map(e => [e.id, e])))
/** Las paradas de una bomba en un campo. La lista es compartida: no se cambia en el sitio. */
export const paradasDe = (equipo: string, campoId: string): readonly EventoBomba[] =>
  PARADAS_POR_EQUIPO().get(`${campoId}|${equipo}`) ?? []
/** Una parada de bomba por su id. */
export const paradaPorId = (id: string): EventoBomba | undefined => PARADA_POR_ID().get(id)
