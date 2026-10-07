import type { Procedencia } from '@/shared/api/procedencia'
import type { LimiteTag } from './limites'

/** Traductor. Toma los hechos que devuelve el servidor y los pone en el
 *  lenguaje del campo. Aquí no se inventa nada: si un dato no viene en la
 *  respuesta, el paso correspondiente no se muestra. */

export interface Paso {
  titulo: string
  valor: string
  detalle: string
  /** El paso donde se decide el número, no donde solo se transporta. */
  calculo?: boolean
}

export interface Garantia {
  titulo: string
  valor: string
}

const COMO_SE_LEE: Record<string, string> = {
  'pi-web-api': 'Medición en línea, del historiador de planta',
  'opc-ua': 'Medición en línea, directa del controlador',
  'modbus-tcp': 'Medición en línea, directa del controlador',
  'roc-plus': 'Medición fiscal, del computador de flujo',
  'atg': 'Medición en línea, del medidor de tanque',
  'calculado': 'Derivado de otro tag del mismo equipo',
  'sis': 'Estado de un lazo de seguridad cableado e independiente',
  'laboratorio': 'Ensayo de laboratorio · no hay señal continua',
  'ruta-manual': 'Ruta de medición manual con equipo portátil',
}
const SIN_SENAL_CONTINUA = new Set(['laboratorio', 'ruta-manual'])

export const esEnLinea = (protocolo: string) => !SIN_SENAL_CONTINUA.has(protocolo)

/** 47 → «47 s» · 900 → «15 min» · 7 776 000 → «90 d» */
export function cadencia(segundos: number | null): string {
  if (segundos === null) return 'sin cadencia declarada'
  const n = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',')
  if (segundos < 90) return `${n(segundos)} s`
  if (segundos < 5400) return `${n(segundos / 60)} min`
  if (segundos < 172800) return `${n(segundos / 3600)} h`
  return `${n(segundos / 86400)} d`
}

const cifra = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 2 })

/** Lo que dice el límite del tag (`limites.ts`, la única fuente de la banda y
 *  la alarma) junto a lo que cita la procedencia. Si no cuadran no se escoge
 *  en silencio: se dicen los dos y cuál usa el vigía. */
function frasesDelLimite(p: Procedencia, l: Pick<LimiteTag, 'texto' | 'alarma'> | undefined): string {
  const u = p.instrumento.unidad ? ` ${p.instrumento.unidad}` : ''
  const partes: string[] = []
  if (l?.alarma) {
    const a = l.alarma
    const punto = [a.alta !== undefined ? `alta en ${cifra(a.alta)}${u}` : '', a.baja !== undefined ? `baja en ${cifra(a.baja)}${u}` : ''].filter(Boolean).join(' y ')
    partes.push(`Alarma ${punto} (${a.fuente}).`)
  }
  if (l && p.instrumento.limite && l.texto !== p.instrumento.limite.texto)
    partes.push(`El límite del tag dice ${l.texto}${u} y el registro de la cadena ${p.instrumento.limite.texto}${u}: no cuadran; el vigía usa el del límite del tag.`)
  return partes.length ? ` ${partes.join(' ')}` : ''
}

export function pasos(p: Procedencia, sinSenal: boolean, limite?: Pick<LimiteTag, 'texto' | 'alarma'>): Paso[] {
  const frec = cadencia(p.lectura.cadenciaS)
  const enLinea = esEnLinea(p.lectura.protocolo)
  const lista: Paso[] = [
    {
      titulo: 'Instrumento',
      valor: `${p.instrumento.tag}${p.instrumento.tipo ? ` · ${p.instrumento.tipo}` : ''}`,
      detalle: p.instrumento.limite
        ? `En ${p.instrumento.equipo ?? 'el equipo'}. Banda normal declarada ${p.instrumento.limite.texto}${p.instrumento.unidad ? ` ${p.instrumento.unidad}` : ''}.${frasesDelLimite(p, limite)}`
        : `En ${p.instrumento.equipo ?? 'el equipo'}. No tiene banda de alarma: mide volumen, no condición.`,
    },
    {
      titulo: 'Cómo se lee',
      valor: COMO_SE_LEE[p.lectura.protocolo] ?? 'Origen sin declarar',
      detalle: enLinea ? `Cada ${frec}.` : `Cada ${frec}. Entre una toma y la siguiente el valor no cambia.`,
    },
  ]
  if (p.calculo) lista.push({
    titulo: 'Cálculo',
    valor: p.calculo.expresion,
    calculo: true,
    detalle: `Versión ${p.calculo.version} de la librería${p.calculo.ventanaMin ? ` · ventana de ${p.calculo.ventanaMin} min` : ''}. Misma fórmula en todos los campos.`,
  })
  lista.push({
    titulo: '¿Es de ahora o es viejo?',
    valor: sinSenal ? 'Sin señal · el último valor es de la ruta anterior'
      : enLinea ? `Lectura viva · entra cada ${frec}`
      : `Valor de la última toma · se repite cada ${frec}`,
    detalle: '',
  })
  return lista
}

export function garantias(p: Procedencia): Garantia[] {
  const g: Garantia[] = [
    { titulo: 'Marca de tiempo', valor: `La pone ${p.lectura.reloj}. Se conserva la del origen aunque el dato llegue tarde.` },
  ]
  if (!p.custodia.editable) g.push({ titulo: 'Registro', valor: 'No editable una vez guardado.' })
  if (p.lectura.modo === 'solo-lectura') g.push({ titulo: 'Conexión', valor: 'Solo lectura. No se escribe al equipo.' })
  if (p.custodia.calibracion?.detalle) g.push({ titulo: 'Calibración', valor: p.custodia.calibracion.detalle })
  return g
}

/** Nombre propio de cada adquisición. El servidor manda el protocolo; el
 *  nombre del componente y lo que implica se ponen aquí. */
const ADQUISICION: Record<string, [string, string]> = {
  'pi-web-api': ['PLC de la batería → servidor de interfaz PI',
    'AVEVA PI Data Archive · lectura por PI Web API, en modo solo lectura.'],
  'opc-ua': ['PLC de la batería · servidor OPC UA',
    'Suscripción OPC UA contra el servidor del PLC, en modo solo lectura.'],
  'modbus-tcp': ['PLC o variador · registros Modbus',
    'EtherNet/IP o Modbus TCP contra el equipo, en modo solo lectura.'],
  'roc-plus': ['Computador de flujo del punto de medición',
    'Archivo EFM por ROC Plus o Totalflow: horarios, diarios y eventos. Modbus plano no sirve, no trae el registro de eventos.'],
  'atg': ['Medidor de nivel de tanque (ATG) · consola de tanques',
    'Protocolo del fabricante contra la consola, solo lectura.'],
  'calculado': ['Sin instrumento propio · cálculo en el borde',
    'Se calcula sobre la serie del tag padre, con su misma marca de tiempo.'],
  'sis': ['Sistema instrumentado de seguridad · lazo cableado',
    'Solo se lee el estado del lazo. Trim no participa de la función de seguridad.'],
  'laboratorio': ['Toma de muestra y ensayo de laboratorio',
    'Entra por carga o por archivo del laboratorio. No pasa por el borde.'],
  'ruta-manual': ['Ruta de medición manual con equipo portátil',
    'Se carga al cerrar la ruta. No pasa por el borde.'],
}

const TRANSPORTE: Record<string, string> = {
  'mqtt-sparkplug-b/tls': 'MQTT Sparkplug B sobre TLS',
}
const ENLACE: Record<string, string> = {
  starlink: 'Starlink Business', fibra: 'fibra', lte: 'LTE',
}
const ALMACENAMIENTO: Record<string, string> = {
  'postgresql+timescaledb · tabla lectura particionada por mes': 'PostgreSQL + TimescaleDB · tabla lectura',
}

export function tecnico(p: Procedencia): Paso[] {
  const t = p.tecnico
  if (!t) return []
  const [nombre, detalle] = ADQUISICION[p.lectura.protocolo] ?? [p.lectura.protocolo, `En modo ${p.lectura.modo}.`]
  const pasos: Paso[] = [
    { titulo: 'Adquisición', valor: nombre,
      detalle: t.endpoint ? `${detalle} Contra ${t.endpoint}.` : detalle },
  ]
  if (esEnLinea(p.lectura.protocolo)) {
    pasos.push(
      { titulo: 'Gateway de borde', valor: `Opto 22 groov EPIC · ${t.gateway.modelo}`,
        detalle: `Serie ${t.gateway.serie}, firmware ${t.gateway.firmware}. Escribe en cola local antes de intentar enviar. Buffer de ${t.bufferH} h: al reconectar envía con la marca de tiempo original, no con la de llegada.` },
      { titulo: 'Transporte', valor: `${TRANSPORTE[t.transporte] ?? t.transporte} · enlace ${ENLACE[t.enlace] ?? t.enlace}`,
        detalle: 'El borde publica hacia afuera. Starlink está detrás de CGNAT, así que la nube no puede consultar al equipo: por diseño el flujo es de empuje.' },
    )
  } else {
    pasos.push({ titulo: 'Gateway de borde', valor: 'No aplica',
      detalle: 'Este dato no viene de una señal continua, así que no pasa por el borde ni por el buffer satelital. Entra por carga.' })
  }
  pasos.push(
    { titulo: 'Ingesta', valor: 'Normalización y control de calidad',
      detalle: 'Conversión de unidad una sola vez, bandera de calidad, y deduplicación por (equipo, tag, marca de tiempo).' },
    { titulo: 'Almacenamiento', valor: ALMACENAMIENTO[t.almacenamiento] ?? t.almacenamiento,
      detalle: 'Particionada por mes y denormalizada con campo_id para no cruzar el catálogo en cada consulta.' },
  )
  return pasos
}
