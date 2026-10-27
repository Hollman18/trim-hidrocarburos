/** LA PLANTA VIVA (X4 §4; X5 §5.1, §5.3, §5.4, §5.9 y §5.10).
 *
 *  El dibujo del proceso de cada campo, vivo: el crudo va del yacimiento a los
 *  pozos, a la planta, afuera y a la venta; el agua baja de la planta al tanque
 *  y a las bombas y vuelve al yacimiento por los inyectores. Sobre el mismo
 *  dibujo, tres momentos:
 *  - Antes (lo que viene): los equipos que avisan y lo que costaría que fallaran hoy;
 *  - Durante (ahora): lo que se deja de producir, en el tramo donde se trabó;
 *  - Después (lo que pasó): lo que no se produjo en el período, por tramo.
 *
 *  No calcula nada nuevo: junta lo que el motor ya da, con el lenguaje del gerente.
 *  - la tubería y su frase del período (`tuberiaCampo`, choke-reparto.ts);
 *  - lo que se pierde ahora y lo que avisa (`riesgoAhora`, `estadoCampo`);
 *  - «si falla hoy» y para producir más (`criticidadDelCampo`);
 *  - la rama del agua (`tuberiaAgua`, con `TREN_AGUA`);
 *  - el libro del período, su serie de 13 meses y su línea base por tramo;
 *  - el árbol de la circular por tramo (`arbolDelChoke`, orden de gestión);
 *  - el ciclo simulado (`cicloValor`).
 *
 *  REGLAS QUE NO SE ROMPEN (verificar-libro.mjs y verificar-contrato.mjs las prueban):
 *  - Durante: Σ de los tramos + sin identificar = la cifra grande (La Ceiba, 1.665 + 301 = 1.966).
 *  - Después: Σ de los tramos + sin identificar = el diferido del libro (118 + 573 + 355 = 1.046).
 *  - Un nombre, una cifra (X4 §3.1, regla 4): «se dejan de producir ahora» es SIEMPRE
 *    el total del campo (o de los campos), nunca lo de un equipo.
 *  - Diferido no es pérdida: la pérdida va aparte y nunca se suma.
 *  - Lo simulado nunca es la cifra grande.
 *  - D7: menos de 300 ms; se guarda en memoria por contexto, historial, lo
 *    guardado por las personas, campos y período. */
import type { Severidad } from './tipos'
import type { Contexto, TipoCausa } from './causa-senal'
import { riesgoAhora, estadoCampo, caudalesAhora, type Riesgo, type EstadoCampo } from './diferido'
import { libro, serieMensual, conMeta, calendario, type Libro } from './libro'
import { tuberiaCampo, lineaBasePorTramo, type OpcionesReparto } from './choke-reparto'
import type { ChokeAnh, TuberiaCampo, Historial, LineaBasePorTramo } from './choke'
import { tuberiaAgua, type TuberiaAgua } from './choke-agua'
import { criticidadDelCampo, type CriticidadDelCampo, type FilaCriticidad } from './criticidad'
import { cicloValor, type CicloValor, type DecisionPlan } from './escenarios'
import { arbolDelChoke, type NodoArbol } from './choke-arbol'
import { enterosDelPeriodo, enterosDeAhora, enteroDe, enterosPorId, porcentajesEnteros, type EnterosDelPeriodo, type EnterosDeAhora } from './redondeo'
import { campoPorId } from './campos'
import { PUESTA_EN_MARCHA } from './configuracion'
import { AHORA, fechaCorta } from './reloj'
import { formatoFecha } from '@/shared/lib/fecha'

/* ───────────────────────────── las palabras ───────────────────────────── */

export type Momento = 'antes' | 'durante' | 'despues'
export const MOMENTOS: readonly Momento[] = ['antes', 'durante', 'despues']
export const NOMBRE_MOMENTO: Record<Momento, string> = { antes: 'Antes', durante: 'Durante', despues: 'Después' }
/** La aclaración corta: «Antes» es antes de la falla, no «el pasado» (X4 §4.4). */
export const LEMA_MOMENTO: Record<Momento, string> = { antes: 'lo que viene', durante: 'ahora', despues: 'lo que pasó' }
export const esMomento = (x: unknown): x is Momento => typeof x === 'string' && (MOMENTOS as readonly string[]).includes(x)

/** Los tramos del dibujo, en el orden de la tubería. */
export const TRAMOS_VIVOS: readonly ChokeAnh[] = ['reservorio', 'pozo', 'planta', 'exportacion']
/** El nombre corto de cada tramo en el dibujo (X5 §5.3). */
export const NOMBRE_TRAMO_VIVO: Record<ChokeAnh, string> = { reservorio: 'Yacimiento', pozo: 'Pozos', planta: 'Planta', exportacion: 'Salida' }
/** «en la planta», dentro de una frase. */
const EN_TRAMO: Record<ChokeAnh, string> = { reservorio: 'en el yacimiento', pozo: 'en los pozos', planta: 'en la planta', exportacion: 'afuera' }
const DEL_TRAMO: Record<ChokeAnh, string> = { reservorio: 'el yacimiento', pozo: 'los pozos', planta: 'la planta', exportacion: 'afuera' }

/** La familia en palabras de campo (X5 §5.5): «bomba de agua», no «bomba de reinyección». */
export const FAMILIA: Record<TipoCausa, string> = {
  reinyeccion: 'bomba de agua',
  transporte: 'bomba multifásica',
  electrosumergible: 'electrosumergible',
  levantamiento: 'bombeo mecánico',
  energia: 'energía eléctrica',
  aire: 'aire de instrumentos',
  compresion: 'compresión de gas',
  evacuacion: 'evacuación del crudo',
  proceso: 'separación',
  tratamiento: 'tratamiento de crudo',
  programada: 'parada programada',
  declarada: 'según el operario',
  pendiente: 'sin identificar',
}
/** La palabra de cada prioridad, al lado de su marca. */
export const PALABRA_PRIORIDAD: Record<Severidad, string> = { 0: '', 1: 'alarma', 2: 'atención', 3: 'aviso' }

/** Los roles que ven La planta viva con la lente técnica (X4 §3.4 y §5.1, N1): su
 *  cifra es lo que sale hoy, con lo que limita y lo que le sobra a cada tramo, y
 *  los 3 primeros de «Si falla hoy». El gerente ve la de negocio (X4 §4, sin
 *  capacidades ni «le sobran»). Producción abre aquí en su respuesta (P-01). */
export const LENTE_TECNICA: readonly string[] = ['prod']
export const conLenteTecnica = (rol: string) => LENTE_TECNICA.includes(rol)

/** Un pedazo de un rótulo: texto, o la cifra que va en negrita. JSON puro. */
export type PedazoRotulo = string | { b: string }

/* ───────────────────────────── la forma ───────────────────────────── */

/** La consulta: `GET /api/vistas/planta-viva?campos&momento&desde&hasta`. */
export interface ConsultaPlantaViva { campos: string[]; momento: Momento; desde: Date; hasta: Date }

/** Un equipo dentro de un tramo, con su marca (una sola por equipo) y lo del momento. */
export interface EquipoDelTramo {
  campoId: string
  equipo: string
  familia: string
  /** La marca de prioridad del equipo (la misma de Riesgo y de la ficha); 0 sin marca. */
  prioridad: Severidad
  /** Sin instrumento: TRIM no ve venir su falla (corchetes, gris). */
  sinInstrumento: boolean
  /** «parada», «ya pasó el límite», «llega al límite en 3,8 h», «sin instrumento», «se trabó en el período». */
  condicion: string
  /** Barriles del momento: bbl/d (Antes y Durante) o bbl (Después), exactos. Null: sin cifra. */
  valor: number | null
  /** Lo que se muestra: el entero del nodo, repartido de arriba abajo (`redondeo.ts`). */
  entero: number | null
  /** Un techo («si para, hasta 9.394»): supone que se cierra todo lo que depende de él. */
  techo: boolean
  /** La cifra en palabras: «1.665 bbl/d», «si para, hasta 9.394 bbl/d», «573 bbl», «sin instrumento». */
  texto: string
}

/** Una rama del «¿por qué?» del tramo: el árbol de la circular en el orden de gestión, en palabras. */
export interface RamaPorque {
  /** «No planeada», «Planeada», «Sin saber si fue planeada». */
  texto: string
  bbl: number
  /** El entero de la rama dentro de su tramo (lo que se muestra). */
  entero: number
  /** Lo de abajo, en palabras de campo y sin códigos: «falla de la planta (P-201B, bomba de agua) → cerró pozos · 573 bbl». */
  detalle: string[]
}

/** «Desde que entró TRIM»: lo no planeado por día del tramo, antes y con TRIM. */
export interface FlechaTrim { antesBpd: number; ahoraBpd: number; cambio: number | null; texto: string }

/** Un tramo del dibujo en el momento escogido. */
export interface TramoVivo {
  tramo: ChokeAnh
  nombre: string
  /** El rótulo de arriba: «Pozos · ◄ limita», «Planta». */
  titulo: PedazoRotulo[]
  /** En el tramo marcado, la palabra que lo señala: «aquí se trabó» (Durante y Después) o «aquí avisa» (Antes). */
  marca: string | null
  /** El rótulo de abajo: «15 de 18 en marcha», «no pasan 1.665 bbl/d». */
  linea: PedazoRotulo[]
  /** Lo del momento, exacto: bbl/d que no pasan (Durante), bbl/d en juego si falla hoy (Antes, el mayor), bbl (Después). */
  valor: number
  /** Lo que se muestra: el entero del tramo (Durante y Después, repartido de la cifra del campo). */
  entero: number
  /** Lo que cabe en el tramo: una capacidad firmada, una sin firmar (la del demo) o ninguna (los pozos van por sus pruebas). */
  capacidad: 'firmada' | 'sin firmar' | null
  /** Lo que cabe, bbl/d de crudo (el contorno). Null: el yacimiento, sin dato o un campo de gas. */
  cabeBpd: number | null
  sinDato: boolean
  limita: boolean
  /** El tramo de más barriles del momento: ahí va el rayado y la marca. Uno por momento. */
  marcado: boolean
  /** Durante, en el tramo marcado con un equipo parado: lo que hoy puede pasar (la pared se angosta hasta aquí). */
  angostoBpd?: number
  /** La frase del tramo en el momento: va en la hoja y en el nombre accesible. */
  frase: string
  /** Durante, en el tramo que se angostó: por qué, en dos renglones cortos (el teléfono los pone bajo el rótulo). */
  nota?: string[]
  equipos: EquipoDelTramo[]
  porque: RamaPorque[]
  desdeTrim?: FlechaTrim
}

/** La rama del agua: baja de la planta, pasa el tanque y las bombas y vuelve al yacimiento. */
export interface RamalAgua {
  /** Sin el tren de agua del campo: la rama va en gris discontinuo, «sin dato». */
  hay: boolean
  entraBpd: number | null
  tanque: { id: string; nivelPct: number | null; altoAltoPct: number | null } | null
  bombas: Array<{ id: string; estado: 'parada' | 'en-marcha' | 'sin-instrumento'; prioridad: Severidad }>
  /** «P-201B parada desde 03:52 · las otras dos, sin instrumento». */
  texto: PedazoRotulo[]
  /** Para el teléfono: «2 de 3 en marcha · P-201B parada». */
  resumen: string
}

/** «Sin identificar»: no es un tramo, es lo que todavía no se sabe (caja aparte). */
export interface SinIdentificarVivo {
  valor: number
  /** Lo que se muestra: el entero de «sin identificar» dentro de la cifra del campo. */
  entero: number
  equipos: string[]
  /** «LC-21 · 301 bbl/d». */
  titulo: string
  /** «sin identificar», «desde el 1 de oct, 18:20». */
  linea: string
  primerEquipo: string | null
}

/** La venta al final de la tubería: cada momento cierra con la meta (X4 §4.6). */
export interface VentaViva {
  titulo: string
  valor: number
  unidad: 'bbl/d' | 'bbl'
  metaTexto: string | null
  bajoMeta: boolean
  /** «Al cierre» es lo que pasaría si todo sigue como ahora: proyectado (la palabra y el trazo discontinuo). */
  calidad?: 'proyectado'
}

/** La planta de UN campo (alcance campo). */
export interface PlantaDelCampo {
  campoId: string
  nombre: string
  campoDeGas: boolean
  /** «La Zarza es un campo de gas: su tubería todavía no está.» */
  textoGas?: string
  tramos: TramoVivo[]
  /** Lo que pasa ahora (el núcleo), bbl/d. */
  pasaBpd: number
  /** La escala del dibujo: lo que cabe en el tramo más ancho. */
  escalaBpd: number
  ramal: RamalAgua
  sinIdentificar: SinIdentificarVivo | null
  venta: VentaViva
  /** El nombre accesible del dibujo: la frase (U2 §2.8; X4 §4.9). */
  ariaLabel: string
  /** «En La Ceiba, otra bomba de agua no sube la producción…» (`desembotellar`). */
  paraProducirMas?: string
  pozos: { total: number; enMarcha: number }
  /** El medidor del punto oficial, si no comunica (la marca morada y «---»). */
  sinComunicacion?: string
  /** La ⓘ junto a «limita» (X4 §4.10): el tramo que limita se decidió con una capacidad sin firmar. */
  limitaSinFirmar?: string
}

/** Una fila de «Todos mis campos»: la tubería en chico y el primer equipo. */
export interface FilaCampoViva {
  campoId: string
  nombre: string
  valor: number
  /** Lo que se muestra: el entero del campo (la raíz de su reparto). */
  entero: number
  unidad: string
  /** El tramo donde se trabó (o donde avisa), para angostar la tubería en chico; null: nada. */
  tramo: ChokeAnh | null
  primerEquipo: EquipoDelTramo | null
  /** «alarma · en la planta, P-201B (bomba de agua)». */
  linea: string
  campoDeGas: boolean
}

/** La cifra grande de un momento, con su frase (X5 §5.1). */
export interface CifraMomento {
  momento: Momento
  /** «Ahora mismo», «Ahora mismo, en sus 5 campos», «Lo que viene», «Lo que pasó · octubre, en curso». */
  previo: string
  /** Exacta (el contrato y los `data-*`). */
  valor: number
  /** Lo que se muestra: el entero de la raíz (un campo) o la suma de las raíces (todos). */
  entero: number
  /** «barriles por día», «equipo avisa», «barriles». */
  unidad: string
  /** «se dejan de producir en La Ceiba.» */
  frase: string
  /** Como mucho dos renglones, con el equipo por su nombre y su familia. */
  explica: string
  /** La frase de 20 palabras o menos: va en el nombre accesible y se lee en 10 s (X4 §4.9). */
  fraseCorta: string
  /** El tramo marcado del momento. */
  tramo: ChokeAnh | 'sin-asignar' | null
  /** Lo que abre «Ver qué se está haciendo»: la ficha de este equipo. */
  primerEquipo: { campoId: string; equipo: string } | null
  /** Lo que todavía se puede mover en este momento (simulado; nunca la cifra grande). */
  simulado: { bbl: number; texto: string; plan: { campoId: string; equipo: string } | null }
}

export interface FilaEquipoDiferido {
  campoId: string
  equipo: string
  familia: string
  prioridad: Severidad
  /** «alarma», «atención»… o vacío. */
  palabra: string
  /** Exactos. */
  bbl: number
  pct: number
  /** Lo que se muestra: el entero del equipo con su causa y su parte entera del total (Σ = 100). */
  bblEntero: number
  pctEntero: number
}

/** La lente técnica de un campo (X4 §3.4 y §5.4, N1): lo que sale hoy, lo que limita y lo que le sobra a cada tramo. */
export interface LenteTecnica {
  /** «9.394 barriles por día salen hoy de La Ceiba.» con «Limitan los pozos: a la planta le sobran 1.143 bbl/d.». */
  cifra: CifraMomento
  /** Lo que cabe y lo que le sobra a cada tramo, en el orden de la tubería (sin el yacimiento). */
  tramos: Array<{ tramo: ChokeAnh; nombre: string; cabeBpd: number | null; sobraBpd: number | null; limita: boolean; capacidad: 'firmada' | 'sin firmar' | null; texto: string
    /** K1 · P-16: de dónde sale lo que cabe (la de la tubería: «la suma de lo que dan los pozos con su prueba
     *  vigente × el factor de medición firmado…»), lo que decía la tubería de antes; va en la tabla. */
    fuente: string | null }>
  /** «Si falla hoy», los 3 primeros (bbl/d, D-2), con su marca: lo medido primero. */
  siFallaHoy: Array<{ campoId: string; equipo: string; familia: string; prioridad: Severidad; sinInstrumento: boolean; bpd: number | null; entero: number | null
    /** «después de 2 min» (el colchón), «sin colchón» o vacío; «hasta» si es un techo. */
    cuando: string
    texto: string }>
}

export interface MesDiferido {
  mes: string
  /** «OCT 2025», «ENE 2026», «ABR»: se rotulan de tres en tres. */
  rotulo: string
  nombre: string
  totalBpd: number
  altoBpd: number
  /** El máximo firmado de ese mes, bbl/d; null sin meta firmada. */
  maximoBpd: number | null
  /** Pasó el máximo (un mes cerrado): lleva el cuadrado «3». */
  sobre: boolean
  enCurso: boolean
}

export interface VistaPlantaViva {
  campos: string[]
  alcance: 'campo' | 'portafolio'
  momento: Momento
  desde: Date
  hasta: Date
  /** La hora de los datos: «datos de las 14:00». */
  ahora: Date
  /** «octubre, en curso», «septiembre», «1 de jul a 30 de sept». */
  periodo: string
  /** Las tres cifras, una por momento: la escogida manda; las otras van en el control. */
  cifras: Record<Momento, CifraMomento>
  /** Un campo: su planta. Todos los campos: null. */
  planta: PlantaDelCampo | null
  /** Todos los campos: una fila por campo, de la que más pesa en el momento a la que menos. */
  filas: FilaCampoViva[]
  /** «Este mes»: el diferido del período, su valor y su rango (calculado). */
  esteMes: {
    titulo: string
    bbl: number
    rango: [number, number]
    valorUsd: number | null
    /** «P-201B, más de la mitad · 355 sin causa». */
    nota: string
    /** Lo que se muestra: la raíz del campo o la suma de las raíces. */
    bblEntero: number
    /** Comienzo de mes (menos de 7 días): el mes anterior cerrado. */
    anterior: { nombre: string; bbl: number } | null
    /** El mes cerrado antes del período (lo que dice «Este mes» en Después: la cifra grande ya es la del período). */
    mesAnterior: { nombre: string; bbl: number; bblEntero: number } | null
  }
  /** La producción por día del período contra la meta firmada. */
  produccion: { realBpd: number; metaBpd: number | null; bajoMeta: boolean; texto: string }
  /** Lo que todavía se puede mover, simulado (el ciclo). */
  mover: { totalBbl: number; porMomento: Record<Momento, number> }
  porEquipo: FilaEquipoDiferido[]
  mesAMes: { meses: MesDiferido[]; actualBpd: number | null; nombreActual: string; maximoBpd: number | null
    /** El nombre del dibujo, con las unidades en palabras (A16). */
    aria: string }
  /** «¿Está bajando? Desde que entró TRIM», por tramo. Null sin tres meses de historia. */
  bajando: { desde: Date; base: string; filas: Array<FlechaTrim & { tramo: ChokeAnh; nombre: string }>; nota: string } | null
  /** La pérdida va aparte y nunca se suma: «Pérdida: nada registrado en octubre» (X5 §5.10, en la leyenda). */
  perdida: string
  /** La ⓘ de la pérdida: qué es y por qué no se suma. */
  perdidaExplica: string
  /** La lente técnica de un campo (`LENTE_TECNICA`); null con todos los campos o en un campo de gas. */
  tecnica: LenteTecnica | null
  /** «3 de 11 planes en marcha» (X4 §3.7): los planes del ciclo que mueven crudo, aceptados o ya hechos. Null sin planes. */
  planes: { enMarcha: number; total: number; texto: string } | null
}

/** Lo que entra además de lo guardado de la clasificación: las decisiones sobre los planes del ciclo (`POST /api/planes/:id`). */
export interface OpcionesPlantaViva extends OpcionesReparto {
  decisiones?: Record<string, DecisionPlan>
}

/* ───────────────────────────── utilidades ───────────────────────────── */

const FMT_N0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const n0 = (v: number) => FMT_N0.format(Math.round(v) === 0 ? 0 : v)
const HORA = formatoFecha({ hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })
const DIA = formatoFecha({ day: 'numeric', month: 'short', timeZone: 'America/Bogota' })
const D = 86_400_000
const ahora = AHORA.getTime()
const NOMBRE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const PALABRA_NUM = ['ningún', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']
const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
/** Los primeros tres de una lista larga: «GU-07, MN-07, MN-18 y otros». */
const algunos = (xs: readonly string[]) => (xs.length > 3 ? `${xs.slice(0, 3).join(', ')} y otros` : lista(xs))
const mayus = (s: string) => (s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : s)
/** El día de un instante en Colombia (sin horario de verano). */
const diaCo = (t: number) => Math.floor((t - 5 * 3_600_000) / D)
/** «a las 03:52» si fue hoy; «el 25 de sept a las 06:40» si no. */
const cuando = (d: Date) => (diaCo(d.getTime()) === diaCo(ahora) ? `a las ${HORA.format(d)}` : `el ${DIA.format(d)} a las ${HORA.format(d)}`)
/** «desde las 03:52» / «desde el 1 de oct, 18:20». */
const desdeCuando = (d: Date) => (diaCo(d.getTime()) === diaCo(ahora) ? `desde las ${HORA.format(d)}` : `desde el ${DIA.format(d)}, ${HORA.format(d)}`)
/** «1,8 h» bajo 10 h; «2 min» bajo una hora; «19 h»; «3,2 d» (la de criticidad.ts). */
const textoH = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 10 ? `${h.toLocaleString('es-CO', { maximumFractionDigits: 1 })} h` : h < 48 ? `${Math.round(h)} h` : `${(h / 24).toLocaleString('es-CO', { maximumFractionDigits: 1 })} d`)
const pozosEnPalabras = (n: number) => (n === 1 ? 'un pozo' : n <= 10 ? `${PALABRA_NUM[n]} pozos` : `${n0(n)} pozos`)
const palabras = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
/** Las unidades en palabras, para el lector de pantalla (A16): «1.966 barriles por día», no «1.966 bbl/d». */
export const enPalabras = (s: string) => s.replace(/\bbbl\/d\b/g, 'barriles por día').replace(/\bbbl\b/g, 'barriles')
/** Un equipo que es el pozo mismo (su electrosumergible): «MN-41», no «la electrosumergible MN-41 cerró MN-41». */
const esElPozo = (equipo: string, pozos: readonly string[]) => pozos.length === 1 && pozos[0] === equipo

/** El nombre del período: «octubre» (y si va en curso), «septiembre» o «1 de jul a 30 de sept». */
function nombreDelPeriodo(desde: Date, hasta: Date): { nombre: string; etiqueta: string; mesEnCurso: boolean; dias: number; mesAnterior?: string } {
  const cal = calendario()
  const i = cal.findIndex(m => new Date(m.desde).getTime() === desde.getTime())
  const m = i >= 0 ? cal[i] : undefined
  const dias = (Math.min(hasta.getTime(), ahora) - desde.getTime()) / D
  if (m && Math.abs(new Date(m.hasta).getTime() - Math.min(hasta.getTime(), ahora)) < 60_000) {
    const nombre = NOMBRE_MES[Number(m.mes.slice(5)) - 1]!
    const enCurso = new Date(m.hasta).getTime() >= ahora - 60_000
    const anterior = i > 0 ? cal[i - 1]!.mes : undefined
    return { nombre, etiqueta: enCurso ? `${nombre}, en curso` : nombre, mesEnCurso: enCurso, dias, ...(anterior ? { mesAnterior: anterior } : {}) }
  }
  const nombre = `${fechaCorta(desde)} a ${fechaCorta(new Date(Math.min(hasta.getTime(), ahora) - 1))}`
  return { nombre, etiqueta: nombre, mesEnCurso: false, dias }
}
const nombreMesDe = (mes: string) => NOMBRE_MES[Number(mes.slice(5)) - 1]!

/* ───────────────────────────── lo de cada campo ───────────────────────────── */

/** Todo lo que el motor ya calcula de un campo, una vez por contexto y período. */
interface BaseCampo {
  campoId: string
  tuberia: TuberiaCampo
  agua: TuberiaAgua
  riesgo: Riesgo[]
  estado: EstadoCampo
  crit: CriticidadDelCampo
  /** El entero de cada nodo del diferido del período (la regla de redondeo). */
  enteros: EnterosDelPeriodo
  /** El entero de cada nodo de lo que se deja de producir ahora. */
  ahoraEnteros: EnterosDeAhora
}

function baseCampo(campoId: string, desde: Date, hasta: Date, ctx: Contexto, versiones: Historial | undefined, op: OpcionesReparto): BaseCampo {
  const riesgo = riesgoAhora([campoId], ctx)
  const tuberia = tuberiaCampo(campoId, desde, hasta, ctx, versiones, op)
  return { campoId, tuberia, agua: tuberiaAgua(campoId, ctx, versiones), riesgo, estado: estadoCampo(campoId, ctx), crit: criticidadDelCampo(campoId, ctx),
    enteros: enterosDelPeriodo(campoId, desde, hasta, ctx, op), ahoraEnteros: enterosDeAhora(tuberia.perdiendoAhora) }
}
/** El entero de lo que no pasa ahora por un equipo (dentro de su tramo y de la cifra del campo). */
const enteroAhora = (b: BaseCampo, equipo: string) => b.ahoraEnteros.porEquipo[equipo] ?? 0

const prioridadDe = (b: BaseCampo, equipo: string): Severidad => b.riesgo.find(r => r.equipo === equipo)?.prioridad ?? 0
/** El tramo de un equipo que avisa: el de la topología («si falla hoy»); sin él, por su familia. */
function tramoDeRiesgo(b: BaseCampo, r: Riesgo): ChokeAnh {
  const f = b.crit.ranking.find(x => x.equipo === r.equipo) ?? b.crit.parados.find(x => x.equipo === r.equipo)
  if (f) return f.tramo
  return r.tipo === 'electrosumergible' || r.tipo === 'levantamiento' ? 'pozo' : 'planta'
}
/** Las bombas de agua sin instrumento del campo, con lo que costaría que fallaran hoy. */
function sinInstrumento(b: BaseCampo): Array<{ equipo: string; fila?: FilaCriticidad }> {
  const bombas = b.agua.tramos.find(t => t.tramo === 'bombas')?.bombas ?? []
  return bombas.filter(x => !x.instrumentada && !x.reserva).map(x => ({ equipo: x.id, fila: b.crit.ranking.find(f => f.equipo === x.id) }))
}

/** Lo que avisa en el campo: los equipos en riesgo (con su marca), de lo más cercano a lo más lejano. */
function queAvisa(b: BaseCampo): Riesgo[] {
  return b.riesgo.filter(r => r.estado === 'en-riesgo').sort((x, y) =>
    (x.horas === undefined ? -1 : x.horas) - (y.horas === undefined ? -1 : y.horas)
    || (x.prioridad || 9) - (y.prioridad || 9) || y.bblDia - x.bblDia)
}
const condicionDeAviso = (r: Riesgo) => (r.horas === undefined ? 'ya pasó el límite' : `llega al límite en ${textoH(r.horas)}`)
const textoDeAviso = (r: Riesgo) => (r.techo ? `si para, hasta ${n0(r.bblDia)} bbl/d` : `si para, ${n0(r.bblDia)} bbl/d`)

/** Lo que se pierde ahora, de mayor a menor, con su tipo, su marca y desde cuándo paró la causa. */
function perdiendo(b: BaseCampo) {
  return [...b.tuberia.perdiendoAhora].sort((x, y) => y.bpd - x.bpd).map(p => {
    const r = b.riesgo.find(x => x.estado === 'perdiendo' && x.equipo === p.equipo)
    return { ...p, tipo: r?.tipo ?? (p.tramo === null ? 'pendiente' as const : undefined), prioridad: r?.prioridad ?? 0 as Severidad, inicio: r?.desde ?? p.desde }
  })
}

/* ───────────────────────────── las tres cifras ───────────────────────────── */

/** La línea simulada de cada momento (X4 §4.4, columna «lo que todavía se puede mover»). */
function simuladoDe(c: CicloValor, m: Momento, unCampo: boolean): CifraMomento['simulado'] {
  const t = c[m]
  const planes = [...t.planes].sort((a, b) => b.bbl - a.bbl)
  const primero = planes.find(p => p.bbl > 0)
  const plan = primero ? { campoId: primero.campoId, equipo: primero.equipo } : null
  if (t.bbl <= 0.5) return { bbl: 0, texto: m === 'antes' ? 'Nada que intervenir antes de que falle · simulado' : 'Nada que mover · simulado', plan }
  if (m === 'antes') return { bbl: t.bbl, texto: `Si se interviene a tiempo en ${t.equipos === 1 ? 'el equipo' : `los ${n0(t.equipos)}`} de alto impacto, se evitan ≈ ${n0(t.bbl)} bbl · simulado`, plan }
  if (m === 'durante') {
    const volver = planes.find(p => /^Volver/.test(p.titulo)), orden = planes.find(p => /orden TRIM/.test(p.titulo))
    const partes: string[] = []
    if (volver) partes.push(`si ${volver.equipo} ${volver.titulo.replace(/^Volver/, 'vuelve')}, ≈ ${n0(volver.bbl)} bbl`)
    if (orden) partes.push(`cerrando en el orden de TRIM, ${n0(orden.bbl)} más`)
    const texto = partes.length ? `${mayus(partes.join('; '))} · simulado` : `≈ ${n0(t.bbl)} bbl si se actúa ahora · simulado`
    return { bbl: t.bbl, texto, plan }
  }
  return { bbl: t.bbl, texto: `No repetir la parte que más costó: ≈ ${n0(t.bbl)} bbl${unCampo ? '' : ' en todos'} · simulado`, plan }
}

/** La frase del momento Durante de un campo: la cifra, el equipo que más pesa y el resto. */
function duranteDeCampo(b: BaseCampo, nombre: string): Pick<CifraMomento, 'valor' | 'entero' | 'unidad' | 'frase' | 'explica' | 'fraseCorta' | 'tramo' | 'primerEquipo'> {
  const total = b.tuberia.perdiendoAhoraBpd
  const entero = b.ahoraEnteros.raiz
  const ps = perdiendo(b)
  // Un campo de gas: la cifra es la del crudo de sus pozos; lo del gas todavía no se mide (X4 §4.10). Nunca «produce sin paradas».
  if (b.tuberia.campoDeGas && (total < 0.5 || !ps.length)) {
    return { valor: 0, entero: 0, unidad: 'barriles por día de crudo', frase: 'se dejan de producir.', explica: 'Es lo del crudo: la tubería del gas todavía no está.',
      fraseCorta: `${nombre} es un campo de gas. La tubería del gas todavía no está.`, tramo: null, primerEquipo: null }
  }
  if (total < 0.5 || !ps.length) {
    return { valor: 0, entero: 0, unidad: 'barriles por día', frase: 'se dejan de producir.', explica: `${nombre} produce sin paradas ahora.`, fraseCorta: `${nombre} produce sin paradas ahora.`, tramo: null, primerEquipo: null }
  }
  const [p] = ps as [ReturnType<typeof perdiendo>[number]]
  const familia = FAMILIA[p.tipo ?? 'pendiente']
  const conTramo = ps.filter(x => x.tramo !== null), sinTramo = ps.filter(x => x.tramo === null)
  // Las partes con el entero de cada equipo: suman la cifra grande a la vista (1.665 + 301 = 1.966).
  const de = (xs: typeof ps) => xs.reduce((a, x) => a + enteroAhora(b, x.equipo), 0)
  let explica: string, corta: string
  if (p.tramo === null) {
    explica = `${lista(sinTramo.map(x => x.equipo))} ${sinTramo.length === 1 ? 'paró y todavía no tiene' : 'pararon y todavía no tienen'} causa.`
    corta = `Se dejan de producir ${n0(entero)} bbl/d: ${lista(sinTramo.map(x => x.equipo))}, sin causa todavía.`
  } else if (esElPozo(p.equipo, p.listaPozos)) {
    explica = `La ${familia} de ${p.equipo} paró ${cuando(p.inicio)}${ps.length > 1 ? `: ${n0(enteroAhora(b, p.equipo))} de esos barriles` : ''}.`
    corta = `Se dejan de producir ${n0(entero)} bbl/d: ${p.equipo} (${familia}) paró ${cuando(p.inicio)}.`
  } else {
    explica = `La ${familia} ${p.equipo} paró ${cuando(p.inicio)} y obligó a cerrar ${pozosEnPalabras(p.pozos)}${ps.length > 1 ? `: ${n0(enteroAhora(b, p.equipo))} de esos barriles` : ''}.`
    corta = `Se dejan de producir ${n0(entero)} bbl/d: ${p.equipo} (${familia}) paró ${cuando(p.inicio)} y cerró ${lista(p.listaPozos)}.`
  }
  // Lo demás: lo de otros tramos y lo que todavía no tiene causa.
  const otrosConTramo = conTramo.filter(x => x !== p)
  if (otrosConTramo.length) explica += ` Otros ${n0(de(otrosConTramo))} son de ${lista(otrosConTramo.map(x => x.equipo))}.`
  if (p.tramo !== null && sinTramo.length) {
    explica += ` ${otrosConTramo.length ? 'Y' : 'Los otros'} ${n0(de(sinTramo))} son de ${lista(sinTramo.map(x => x.equipo))}, que todavía no ${sinTramo.length === 1 ? 'tiene' : 'tienen'} causa.`
  }
  // 20 palabras o menos (X4 §4.9): si se pasa, sin los pozos.
  if (palabras(corta) > 20) corta = `Se dejan de producir ${n0(entero)} bbl/d: ${p.equipo} (${familia}) paró ${cuando(p.inicio)}.`
  const unidad = b.tuberia.campoDeGas ? 'barriles por día de crudo' : 'barriles por día'
  return { valor: total, entero, unidad, frase: `se dejan de producir en ${nombre}.`, explica, fraseCorta: corta, tramo: p.tramo ?? 'sin-asignar', primerEquipo: { campoId: b.campoId, equipo: p.equipo } }
}

/** La frase del momento Antes de un campo (X4 §4.4: un conteo y un nombre, nunca una suma de techos). */
function antesDeCampo(b: BaseCampo, nombre: string): Pick<CifraMomento, 'valor' | 'entero' | 'frase' | 'explica' | 'fraseCorta' | 'tramo' | 'primerEquipo'> {
  const avisan = queAvisa(b)
  const sin = sinInstrumento(b)
  const textoSin = sin.length
    ? `${sin.length === 1 ? 'La bomba de agua' : 'Las bombas de agua'} ${lista(sin.map(x => x.equipo))} no ${sin.length === 1 ? 'tiene' : 'tienen'} instrumento${sin[0]?.fila?.bpd ? `: si ${sin.length === 1 ? 'falla' : 'una falla'} hoy, ${n0(sin[0].fila.bpd)} bbl/d${sin[0].fila.colchonH !== undefined ? ` después de ${textoH(sin[0].fila.colchonH)} de colchón` : ''}` : ': TRIM no ve venir su falla'}.`
    : ''
  if (!avisan.length) {
    return { valor: 0, entero: 0, frase: `avisan en ${nombre}.`, explica: [`Ningún equipo avisa ahora.`, textoSin].filter(Boolean).join(' '), fraseCorta: `Nada avisa en ${nombre}.`, tramo: null, primerEquipo: null }
  }
  const [r] = avisan as [Riesgo]
  const fam = FAMILIA[r.tipo]
  const fila = b.crit.ranking.find(f => f.equipo === r.equipo)
  const si = r.techo
    ? `Si para, se frenan hasta ${n0(r.bblDia)} bbl/d${fila?.porque?.includes('desde el primer minuto') ? ' desde el primer minuto' : ''}.`
    : `Si para, ${n0(r.bblDia)} bbl/d.`
  const otros = avisan.length > 1 ? ` Avisan también ${algunos(avisan.slice(1).map(x => x.equipo))}.` : ''
  return {
    valor: avisan.length, entero: avisan.length,
    frase: `${r.equipo} (${fam}) ${condicionDeAviso(r)}.`,
    explica: `${si}${otros}${textoSin ? ` ${textoSin}` : ''}`,
    fraseCorta: `${avisan.length === 1 ? '1 equipo avisa' : `${avisan.length} equipos avisan`} en ${nombre}: ${r.equipo} ${condicionDeAviso(r)}.`,
    tramo: tramoDeRiesgo(b, r),
    primerEquipo: { campoId: b.campoId, equipo: r.equipo },
  }
}

/* ───────────────────────────── el dibujo de un campo ───────────────────────────── */

function tramosDelCampo(b: BaseCampo, m: Momento, periodo: string, porque: Map<ChokeAnh, RamaPorque[]>, base: LineaBasePorTramo | undefined): TramoVivo[] {
  const t = b.tuberia
  const ps = perdiendo(b)
  const avisan = queAvisa(b)
  const sin = sinInstrumento(b)
  const marca = (eq: string) => prioridadDe(b, eq)

  // Los equipos de cada tramo, de los tres momentos (la hoja los lista todos, ordenados por el escogido).
  const equiposDe = (k: ChokeAnh): EquipoDelTramo[] => {
    const por = new Map<string, EquipoDelTramo>()
    const poner = (e: EquipoDelTramo) => { if (!por.has(e.equipo)) por.set(e.equipo, e) }
    const durante = ps.filter(p => p.tramo === k).map((p): EquipoDelTramo => ({ campoId: b.campoId, equipo: p.equipo, familia: FAMILIA[p.tipo ?? 'pendiente'],
      prioridad: p.prioridad, sinInstrumento: false, condicion: 'parada', valor: p.bpd, entero: enteroAhora(b, p.equipo), techo: false, texto: `${n0(enteroAhora(b, p.equipo))} bbl/d` }))
    const antes = [
      ...avisan.filter(r => tramoDeRiesgo(b, r) === k).map((r): EquipoDelTramo => ({ campoId: b.campoId, equipo: r.equipo, familia: FAMILIA[r.tipo], prioridad: r.prioridad,
        sinInstrumento: false, condicion: condicionDeAviso(r), valor: r.bblDia, entero: enteroDe(r.bblDia), techo: !!r.techo, texto: textoDeAviso(r) })),
      ...(k === 'planta' ? sin.map((s): EquipoDelTramo => ({ campoId: b.campoId, equipo: s.equipo, familia: 'bomba de agua', prioridad: marca(s.equipo), sinInstrumento: true,
        condicion: 'sin instrumento', valor: s.fila?.bpd ?? null, entero: s.fila?.bpd ? enteroDe(s.fila.bpd) : null, techo: false, texto: s.fila?.bpd ? `si falla hoy, ${n0(s.fila.bpd)} bbl/d` : 'sin instrumento' })) : []),
    ]
    // Lo del período: el entero de cada elemento dentro de su tramo (LC-08 = 108, el mismo en todas las vistas).
    const periodoEq = (t.perdidoPeriodo.find(x => x.tramo === k)?.equiposTop ?? []).map((e): EquipoDelTramo => {
      const n = b.enteros.porElemento[k][e.equipo] ?? enteroDe(e.bbl)
      return { campoId: b.campoId, equipo: e.equipo, familia: FAMILIA[e.tipo], prioridad: marca(e.equipo), sinInstrumento: false, condicion: `se trabó en ${periodo}`,
        valor: e.bbl, entero: n, techo: false, texto: `${n0(n)} bbl` }
    })
    const orden = m === 'durante' ? [durante, antes, periodoEq] : m === 'antes' ? [antes, durante, periodoEq] : [periodoEq, durante, antes]
    for (const grupo of orden) for (const e of grupo) poner(e)
    return [...por.values()]
  }

  const valorDe = (k: ChokeAnh): number => {
    const x = t.tramos.find(y => y.tramo === k)
    if (m === 'durante') return x?.perdiendoAhoraBpd ?? 0
    if (m === 'despues') return x?.perdidoBbl ?? 0
    // Antes: el mayor «si falla hoy» del tramo (un techo no se suma: X4 §4.4, regla 3).
    const vs = equiposDe(k).filter(e => e.condicion !== 'parada' && !/^se trabó/.test(e.condicion)).map(e => e.valor ?? 0)
    return vs.length ? Math.max(...vs) : 0
  }
  const valores = new Map(TRAMOS_VIVOS.map(k => [k, valorDe(k)]))
  // Lo que se muestra: Durante y Después, el entero del tramo repartido de la cifra del campo; Antes, el mayor «si falla hoy».
  const enteroDeTramo = (k: ChokeAnh) => (m === 'durante' ? b.ahoraEnteros.porTramo[k] : m === 'despues' ? b.enteros.porTramo[k] : enteroDe(valores.get(k) ?? 0))
  const max = Math.max(0, ...valores.values())
  const marcado = max > 0.5 ? TRAMOS_VIVOS.find(k => valores.get(k) === max) ?? null : null
  const parados = b.estado.parados, total = b.estado.pozos

  return TRAMOS_VIVOS.map((k): TramoVivo => {
    const x = t.tramos.find(y => y.tramo === k)
    const valor = valores.get(k) ?? 0
    const entero = enteroDeTramo(k)
    const esMarcado = k === marcado
    const equipos = equiposDe(k)
    const delMomento = equipos[0]
    const titulo: PedazoRotulo[] = [NOMBRE_TRAMO_VIVO[k]]
    // «Limita» con una capacidad sin firmar lleva su ⓘ (X4 §4.10; P-12): el contorno se queda como en la imagen 1.
    if (x?.limita) titulo.push(' · ', { b: '◄ limita' }, ...(t.capacidades.estado !== 'firmadas' ? [' ⓘ'] : []))
    const marca = esMarcado ? (m === 'antes' ? 'aquí avisa' : 'aquí se trabó') : null
    let linea: PedazoRotulo[]
    if (k === 'reservorio') linea = ['la roca']
    else if (m === 'durante' && esMarcado) linea = ['no pasan ', { b: `${n0(entero)} bbl/d` }]
    // Después, la cifra va al lado de su barra: corta, para que quepa debajo de su tramo.
    else if (m === 'despues') linea = entero > 0 ? [{ b: `${n0(entero)} bbl` }] : ['0 bbl']
    else if (m === 'antes' && esMarcado && delMomento) linea = [`${delMomento.equipo} · ${delMomento.techo ? 'hasta ' : ''}${n0(delMomento.valor ?? 0)} bbl/d`]
    else if (k === 'pozo') linea = [`${n0(total - parados)} de ${n0(total)} en marcha`]
    else if (k === 'exportacion') linea = [x?.potencialBpd === null || !x ? 'sin dato' : 'el oleoducto recibe']
    else if (x?.potencialBpd === null || !x) linea = ['sin dato']
    else linea = [m === 'antes' ? 'nada avisa' : 'pasa lo que llega']

    // La frase del tramo en el momento (la hoja del tramo, X4 §4.5).
    const nom = DEL_TRAMO[k]
    let frase: string
    if (m === 'durante') {
      const p = ps.find(y => y.tramo === k)
      frase = !p ? `Ahora no se deja de producir nada por ${nom}.`
        : esElPozo(p.equipo, p.listaPozos) ? `${p.equipo} (${FAMILIA[p.tipo ?? 'pendiente']}) está parado ${desdeCuando(p.inicio)}: no pasan ${n0(entero)} bbl/d.`
          : `${p.equipo} (${FAMILIA[p.tipo ?? 'pendiente']}) está parada ${desdeCuando(p.inicio)} y obligó a cerrar ${lista(p.listaPozos)}.`
    } else if (m === 'antes') {
      const e = equipos.find(y => y.condicion !== 'parada' && !/^se trabó/.test(y.condicion))
      frase = !e ? `Nada avisa en ${nom}.`
        : e.sinInstrumento ? `${e.equipo} (${e.familia}) no tiene instrumento: TRIM no ve venir su falla.`
          : `${e.equipo} (${e.familia}) ${e.condicion}: ${e.texto}.`
    } else {
      const top = equipos.filter(y => /^se trabó/.test(y.condicion))
      frase = valor < 0.5 ? `Nada se trabó ${EN_TRAMO[k]} en ${periodo}.`
        : `En ${periodo} no se produjeron ${n0(entero)} bbl ${EN_TRAMO[k]}${top.length ? `: ${lista(top.map(y => `${y.equipo} (${y.familia})`))}` : ''}.`
    }
    const np = base?.noPlaneado[k]
    const desdeTrim = np && (np.baseDia > 0.5 || np.periodoDia > 0.5) ? flecha(np.baseDia, np.periodoDia, np.cambio, k) : undefined
    return {
      tramo: k, nombre: NOMBRE_TRAMO_VIVO[k], titulo, marca, linea, valor, entero, cabeBpd: x?.potencialBpd ?? null, sinDato: !x || x.estado === 'sin-dato',
      capacidad: capacidadDe(x), limita: !!x?.limita, marcado: esMarcado,
      ...(m === 'durante' && esMarcado && x?.disponibleHoy ? { angostoBpd: x.disponibleHoy.valor }
        : m === 'durante' && esMarcado && x?.potencialBpd ? { angostoBpd: Math.max(t.pasaHoyBpd, x.potencialBpd - valor) } : {}),
      frase, ...(m === 'durante' && esMarcado && x?.disponibleHoy ? { nota: notaAngosto(x.disponibleHoy) } : {}),
      equipos, porque: porque.get(k) ?? ramasVacias(), ...(desdeTrim ? { desdeTrim } : {}),
    }
  })
}

/** Lo que cabe en un tramo: una capacidad firmada, una del demo sin firmar, o ninguna (los pozos van por sus pruebas; sin dato). */
function capacidadDe(x: TuberiaCampo['tramos'][number] | undefined): TramoVivo['capacidad'] {
  if (!x || x.potencialBpd === null || x.estado === 'sin-dato' || x.estado === 'pruebas') return null
  return x.estado === 'firmado' ? 'firmada' : 'sin firmar'
}

/** Por qué se angostó la planta hoy, con lo que deja pasar el agua (`disponibleHoy` de la tubería).
 *  «solo deja pasar»: «da para N más» se leía como que sobra (P-14). En renglones cortos: van bajo el rótulo, de pie. */
function notaAngosto(d: NonNullable<TuberiaCampo['tramos'][number]['disponibleHoy']>): string[] {
  return d.cabeBpd < 1 ? [`se angostó: con ${d.equipo} parada`, 'el agua no da para más crudo']
    : [`se angostó: con ${d.equipo} parada`, 'el agua solo deja pasar', `${n0(d.cabeBpd)} bbl/d más de crudo`]
}
/** Lo mismo en una frase (la lente técnica). */
const fraseAngosto = (d: NonNullable<TuberiaCampo['tramos'][number]['disponibleHoy']>) =>
  d.cabeBpd < 1 ? `Con ${d.equipo} parada, el agua no da para más crudo.` : `Con ${d.equipo} parada, el agua solo deja pasar ${n0(d.cabeBpd)} bbl/d más de crudo.`

function flecha(antesBpd: number, ahoraBpd: number, cambio: number | null, k: ChokeAnh): FlechaTrim {
  const pct = cambio === null ? '' : ` · ${cambio < 0 ? 'baja' : 'sube'} ${n0(Math.abs(cambio) * 100)} %`
  const verbo = cambio === null ? 'cambió' : cambio < 0 ? 'bajó' : 'subió'
  return { antesBpd, ahoraBpd, cambio, texto: `Desde que entró TRIM, lo que se trabó ${EN_TRAMO[k]} ${verbo}: ${n0(antesBpd)} → ${n0(ahoraBpd)} bbl/d${pct}` }
}

/** Las tres ramas de planeación, aunque estén en cero (X4 §4.5). */
const RAMAS: Array<[string, string]> = [['no-planeada', 'No planeada'], ['planeada', 'Planeada'], ['falta', 'Sin saber si fue planeada']]
const ramasVacias = (): RamaPorque[] => RAMAS.map(([, texto]) => ({ texto, bbl: 0, entero: 0, detalle: [] }))

/** La causa de la circular (N1) en palabras del gerente (X4 §4.5, punto 3; P-19): «falla de la planta», no
 *  «No planeada - Proceso / Facilidades». Sin códigos de la ANH: esos son de Regulatorio. */
export const CAUSA_EN_PALABRAS: Record<string, string> = {
  P_MANT_ELE: 'mantenimiento eléctrico', P_MANT_MEC: 'mantenimiento mecánico', P_MANT_INS: 'mantenimiento de instrumentos',
  P_MANT_INT: 'mantenimiento de líneas y válvulas', P_WO: 'trabajo en el pozo', P_PRUEBAS: 'pruebas', P_PES: 'puesta en marcha',
  P_OP: 'decisión de operación', NP_CLIMA: 'el clima', NP_OPUB: 'orden público', NP_ENEXT: 'falla de la energía de afuera',
  NP_ENINT: 'falla eléctrica del campo', NP_INS: 'falla de un instrumento', NP_CTRL: 'falla de control o comunicaciones',
  NP_SUB: 'falla dentro del pozo', NP_SUP: 'falla del equipo del pozo en superficie', NP_INTEG: 'falla de líneas o válvulas',
  NP_PROC: 'falla de la planta', NP_TRANSP: 'afuera no recibieron', NP_AUT: 'orden de una autoridad',
}
/** El detalle (N2) en palabras de campo, cuando el del catálogo es jerga; los demás, como los dice el catálogo, en minúscula. */
const DETALLE_EN_PALABRAS: Record<string, string> = {
  'NP_PROC/parada-estacion-bombeo-afecta-pozos': 'afectó a varios pozos',
  'NP_PROC/tanques-llenos-capacidad-limitada': 'tanques llenos',
  'NP_PROC/capacidad-tratamiento-agua-crudo-limitada': 'no daba el tratamiento',
  'NP_SUB/falla-esp': 'falló la electrosumergible',
  'NP_SUB/alto-bsw-corte-de-agua': 'subió el agua del pozo',
  'NP_ENINT/falla-vsd': 'falló el variador',
  'NP_TRANSP/restriccion-nominacion-entrega': 'sin cupo en el oleoducto',
  'NP_TRANSP/terminal-cliente-no-recibe': 'el cliente no recibió',
}
const detalleEnPalabras = (n2: NodoArbol) => DETALLE_EN_PALABRAS[n2.valor] ?? n2.texto.toLowerCase().replace(/\s*\/\s*/g, ' o ')
/** Los equipos que cuelgan de un nodo, con su familia en palabras de campo: «P-201B, bomba de agua». */
function equiposDeNodo(n: NodoArbol): string[] {
  if (n.dimension === 'equipo') {
    const [tag, fam] = n.texto.split(' · ')
    return [`${tag}${fam && !/sin identificar|declarad/.test(fam) ? `, ${fam.replace('bomba de reinyección', 'bomba de agua')}` : ''}`]
  }
  return n.hijos.filter(h => h.valor !== 'falta' || h.hijos.length).flatMap(equiposDeNodo)
}
/** Lo de abajo de una rama, en palabras de campo (P-19): «falla de la planta (P-201B, bomba de agua) → afectó a varios pozos · 573 bbl».
 *  Los barriles, con el entero de cada causa dentro de su rama. */
function detalleDe(n: NodoArbol, enteroRama: number): string[] {
  const enteros = enterosPorId(enteroRama, n.hijos.map((h, i) => ({ id: `${i}`, valor: h.bbl })))
  return n.hijos.map((n1, i) => {
    const bbl = `${n0(enteros[`${i}`] ?? 0)} bbl`
    if (n1.valor === 'falta') return `falta la causa · ${bbl}`
    const causa = CAUSA_EN_PALABRAS[n1.valor] ?? n1.texto.replace(/^(No planeada|Planeada)\s*-\s*/i, '').toLowerCase()
    const eqs = [...new Set(equiposDeNodo(n1))]
    const n2 = n1.hijos.filter(x => x.valor !== 'falta').map(detalleEnPalabras)
    return `${causa}${eqs.length ? ` (${eqs.slice(0, 2).join('; ')}${eqs.length > 2 ? ' y otros' : ''})` : ''}${n2.length ? ` → ${n2.join(', ')}` : ''} · ${bbl}`
  })
}
function porqueDelArbol(raiz: NodoArbol, enteros: EnterosDelPeriodo): Map<ChokeAnh, RamaPorque[]> {
  const out = new Map<ChokeAnh, RamaPorque[]>()
  for (const tramo of raiz.hijos) {
    if (!(TRAMOS_VIVOS as readonly string[]).includes(tramo.valor)) continue
    const k = tramo.valor as ChokeAnh
    const nodos = RAMAS.map(([v]) => tramo.hijos.find(h => h.valor === v))
    const enteroRama = repartirRamas(enteros.porTramo[k], nodos.map(n => n?.bbl ?? 0))
    out.set(k, RAMAS.map(([, texto], i) => {
      const n = nodos[i]
      return { texto, bbl: n?.bbl ?? 0, entero: enteroRama[i] ?? 0, detalle: n ? detalleDe(n, enteroRama[i] ?? 0) : [] }
    }))
  }
  return out
}
const repartirRamas = (total: number, bbls: number[]) => { const e = enterosPorId(total, bbls.map((valor, i) => ({ id: `${i}`, valor }))); return bbls.map((_, i) => e[`${i}`] ?? 0) }

function ramalDe(b: BaseCampo): RamalAgua {
  const a = b.agua
  const bombasT = a.tramos.find(t => t.tramo === 'bombas')?.bombas ?? []
  const tk = a.tramos.find(t => t.tramo === 'tanques')?.tanques?.[0]
  const entra = b.tuberia.tramos.find(t => t.tramo === 'planta')?.disponibleHoy?.entraBpd ?? a.siParaOtra?.entraBpd ?? (a.campoDeGas ? null : caudalesAhora(b.campoId).agua)
  const bombas = bombasT.filter(x => !x.reserva).map(x => ({
    id: x.id, prioridad: prioridadDe(b, x.id),
    estado: x.marcha === 'parada' ? 'parada' as const : !x.instrumentada ? 'sin-instrumento' as const : 'en-marcha' as const,
  }))
  const parada = bombas.find(x => x.estado === 'parada')
  const sinInst = bombas.filter(x => x.estado === 'sin-instrumento')
  const r = parada ? b.riesgo.find(x => x.equipo === parada.id) : undefined
  const texto: PedazoRotulo[] = []
  // La que manda el texto: la parada o, sin parada, la que tiene instrumento y está en marcha.
  const conInst = parada ?? (bombas.length > 1 ? bombas.find(x => x.estado === 'en-marcha') : undefined)
  const otras = (n: number) => (n === 1 ? 'la otra' : `las otras ${n <= 10 ? PALABRA_NUM[n] : n0(n)}`)
  if (parada) texto.push({ b: `${parada.id} parada` }, r?.desde ? ` ${desdeCuando(r.desde).replace(/^desde las /, 'desde ')}` : '')
  else if (conInst && sinInst.length) texto.push(`${conInst.id} en marcha`)
  if (sinInst.length) texto.push(`${texto.length ? ' · ' : ''}${conInst && sinInst.length === bombas.length - 1 ? otras(sinInst.length) : lista(sinInst.map(x => x.id))}, sin instrumento`)
  if (!texto.length && bombas.length) texto.push(`${bombas.length === 1 ? 'la bomba de agua' : `las ${n0(bombas.length)} bombas de agua`} en marcha`)
  const enMarcha = bombas.filter(x => x.estado !== 'parada').length
  const tanque = tk ? { id: tk.id, nivelPct: tk.nivelPct ?? null, altoAltoPct: tk.altoAlto !== undefined ? tk.altoAlto * 100 : null } : null
  return {
    hay: !!tanque && bombas.length > 0, entraBpd: entra, tanque, bombas, texto,
    resumen: bombas.length ? `${n0(enMarcha)} de ${n0(bombas.length)} en marcha${parada ? ` · ${parada.id} parada` : ''}` : 'sin dato',
  }
}

function plantaDelCampo(b: BaseCampo, m: Momento, periodo: string, porque: Map<ChokeAnh, RamaPorque[]>, base: LineaBasePorTramo | undefined, lb: Libro, cifra: CifraMomento): PlantaDelCampo {
  const t = b.tuberia
  const nombre = campoPorId(b.campoId).nombre
  const tramos = tramosDelCampo(b, m, periodo, porque, base)
  const caben = tramos.map(x => x.cabeBpd ?? 0)
  // Sin identificar: lo de ahora (Durante) o lo del período (Después); en Antes no se dibuja.
  const ps = perdiendo(b).filter(p => p.tramo === null)
  let sinIdentificar: SinIdentificarVivo | null = null
  if (m === 'durante' && ps.length) {
    const v = ps.reduce((a, p) => a + p.bpd, 0), n = b.ahoraEnteros.porTramo['sin-asignar']
    sinIdentificar = { valor: v, entero: n, equipos: ps.map(p => p.equipo), titulo: `${lista(ps.map(p => p.equipo))} · ${n0(n)} bbl/d`, linea: `sin identificar · ${desdeCuando(ps[0]!.inicio)}`, primerEquipo: ps[0]!.equipo }
  } else if (m === 'despues' && t.sinTramoBbl > 0.5) {
    const n = b.enteros.porTramo['sin-asignar']
    sinIdentificar = { valor: t.sinTramoBbl, entero: n, equipos: t.sinTramoEquipos.map(e => e.equipo), titulo: `${n0(n)} bbl sin identificar`,
      linea: lista(t.sinTramoEquipos.map(e => e.equipo)), primerEquipo: t.sinTramoEquipos[0]?.equipo ?? null }
  }
  // La venta: cada momento cierra con su meta (X4 §4.6).
  const hayMeta = conMeta(lb.meta)
  const restantes = Math.max(0, lb.meta.diasTotal - lb.meta.dias)
  const venta: VentaViva = m === 'durante'
    ? { titulo: 'Sale hoy', valor: t.pasaHoyBpd, unidad: 'bbl/d', metaTexto: hayMeta ? `meta ${n0(lb.meta.produccionDia)}` : null, bajoMeta: hayMeta && t.pasaHoyBpd < lb.meta.produccionDia }
    : m === 'antes'
      ? (() => {
        const cierre = lb.real + (b.estado.potencialBpd - b.estado.perdiendoBpd) * restantes
        // «Al cierre»: si todo sigue como está ahora, lo que va del mes más el ritmo de hoy hasta el último día.
        return { titulo: 'Al cierre', valor: cierre, unidad: 'bbl' as const, metaTexto: hayMeta ? `meta ${n0(lb.meta.produccionTotal)}` : null, bajoMeta: hayMeta && cierre < lb.meta.produccionTotal,
          calidad: 'proyectado' as const }
      })()
      // «Producido» a la fecha, contra la meta a la fecha.
      : { titulo: 'Producido', valor: lb.real, unidad: 'bbl', metaTexto: hayMeta ? `meta ${n0(lb.meta.produccion)}` : null, bajoMeta: hayMeta && lb.real < lb.meta.produccion }
  const lim = tramos.find(x => x.limita)
  const marc = tramos.find(x => x.marcado)
  const aria = t.campoDeGas ? `${nombre} es un campo de gas: su tubería todavía no está.`
    // El nombre accesible es la frase, con las unidades en palabras (A16: el lector no dice «bbl/d»).
    : `${enPalabras(cifra.fraseCorta)}${marc ? ` Se marca ${EN_TRAMO[marc.tramo]}.` : ''}${lim ? ` Limitan ${DEL_TRAMO[lim.tramo]}.` : ''}`
  const med = t.medidor?.estado === 'sin-comunicacion' ? t.medidor.texto : undefined
  // Después es «lo que pasó»: el estado de ahora del ramal (la bomba parada, el tanque) va dicho como de ahora (H28).
  const ramal = ramalDe(b)
  const ramalDelMomento = m === 'despues' && ramal.texto.length ? { ...ramal, texto: ['ahora: ', ...ramal.texto] } : ramal
  // «Limita» se decidió comparando con capacidades: si alguna de las que se usaron no está firmada, se dice (X4 §4.10, P-12).
  const sinFirmar = lim && t.capacidades.estado !== 'firmadas' ? `con una capacidad sin firmar (${t.capacidades.texto})` : undefined
  return {
    campoId: b.campoId, nombre, campoDeGas: t.campoDeGas, ...(t.campoDeGas ? { textoGas: `${nombre} es un campo de gas: su tubería todavía no está.` } : {}),
    tramos, pasaBpd: t.pasaHoyBpd, escalaBpd: Math.max(1, t.pasaHoyBpd, ...caben), ramal: ramalDelMomento, sinIdentificar, venta, ariaLabel: aria,
    ...(sinFirmar ? { limitaSinFirmar: sinFirmar } : {}),
    ...(b.crit.desembotellar ? { paraProducirMas: b.crit.desembotellar } : {}),
    pozos: { total: b.estado.pozos, enMarcha: b.estado.pozos - b.estado.parados },
    ...(med ? { sinComunicacion: med } : {}),
  }
}

/* ───────────────────────────── la vista ───────────────────────────── */

/** Lo que no depende del momento: una vez por contexto, historial, guardadas, campos y período. */
interface Base {
  campos: string[]
  bases: BaseCampo[]
  lb: Libro
  ciclo: CicloValor
  serie: ReturnType<typeof serieMensual>
  bajando: LineaBasePorTramo | undefined
  porque: Map<ChokeAnh, RamaPorque[]>
  periodo: ReturnType<typeof nombreDelPeriodo>
}

const SIN = {}
const BASES = new WeakMap<Contexto, WeakMap<object, WeakMap<object, Map<string, Base>>>>()
const VISTAS = new WeakMap<Base, Map<Momento, VistaPlantaViva>>()
/** La serie de 13 meses no depende del período: una vez por contexto y campos. */
const SERIES = new WeakMap<Contexto, Map<string, ReturnType<typeof serieMensual>>>()

function baseDe(campos: string[], desde: Date, hasta: Date, ctx: Contexto, versiones: Historial | undefined, op: OpcionesReparto): Base {
  let porV = BASES.get(ctx)
  if (!porV) BASES.set(ctx, porV = new WeakMap())
  const kv = (versiones ?? SIN) as object
  let porG = porV.get(kv)
  if (!porG) porV.set(kv, porG = new WeakMap())
  const kg = (op.guardadas ?? SIN) as object
  let m = porG.get(kg)
  if (!m) porG.set(kg, m = new Map())
  const clave = `${campos.join(',')}|${desde.getTime()}|${hasta.getTime()}`
  const ya = m.get(clave)
  if (ya) return ya
  let series = SERIES.get(ctx)
  if (!series) SERIES.set(ctx, series = new Map())
  let serie = series.get(campos.join(','))
  if (!serie) series.set(campos.join(','), serie = serieMensual(campos, ctx))
  const inicio = new Date(`${PUESTA_EN_MARCHA}T00:00:00-05:00`)
  const unCampo = campos.length === 1
  const bases = campos.map(c => baseCampo(c, desde, hasta, ctx, versiones, op))
  const nueva: Base = {
    campos,
    bases,
    lb: libro(campos, desde, hasta, ctx),
    ciclo: cicloValor(campos, desde, hasta, ctx, versiones),
    serie,
    bajando: lineaBasePorTramo(campos, inicio, AHORA, ctx, versiones, op),
    porque: unCampo ? porqueDelArbol(arbolDelChoke(campos, desde, hasta, ctx, { orden: 'gestion', ...(op.guardadas ? { guardadas: op.guardadas } : {}) }).raiz, bases[0]!.enteros) : new Map(),
    periodo: nombreDelPeriodo(desde, hasta),
  }
  m.set(clave, nueva)
  return nueva
}

function cifrasDe(x: Base): Record<Momento, CifraMomento> {
  const unCampo = x.campos.length === 1
  const nombre = unCampo ? campoPorId(x.campos[0]!).nombre : ''
  const n = x.campos.length
  const sim = (m: Momento) => simuladoDe(x.ciclo, m, unCampo)

  // Durante
  let durante: CifraMomento
  if (unCampo) durante = { momento: 'durante', previo: 'Ahora mismo', ...duranteDeCampo(x.bases[0]!, nombre), simulado: sim('durante') }
  else {
    const total = x.bases.reduce((a, b) => a + b.tuberia.perdiendoAhoraBpd, 0)
    // Encima de la raíz: la suma de los enteros de cada campo (1.966 + 684 = 2.650).
    const entero = x.bases.reduce((a, b) => a + b.ahoraEnteros.raiz, 0)
    const parados = x.bases.reduce((a, b) => a + b.estado.parados, 0), pozos = x.bases.reduce((a, b) => a + b.estado.pozos, 0)
    const top = x.bases.flatMap(b => perdiendo(b).map(p => ({ b, p }))).sort((a, c) => c.p.bpd - a.p.bpd)[0]
    const fam = top ? FAMILIA[top.p.tipo ?? 'pendiente'] : ''
    const enCampo = top ? campoPorId(top.b.campoId).nombre : ''
    durante = {
      momento: 'durante', previo: `Ahora mismo, en sus ${n0(n)} campos`, valor: total, entero, unidad: 'barriles por día',
      frase: 'se dejan de producir.',
      explica: total < 0.5 ? 'Sus campos producen sin paradas ahora.' : `Lo que más pesa: la ${fam} ${top!.p.equipo}, en ${enCampo}. Hay ${n0(parados)} de ${n0(pozos)} pozos parados.`,
      fraseCorta: total < 0.5 ? 'Sus campos producen sin paradas ahora.' : `Se dejan de producir ${n0(entero)} bbl/d. Lo que más pesa: ${top!.p.equipo} (${fam}), en ${enCampo}.`,
      tramo: top ? top.p.tramo ?? 'sin-asignar' : null, primerEquipo: top ? { campoId: top.b.campoId, equipo: top.p.equipo } : null, simulado: sim('durante'),
    }
  }

  // Antes
  let antes: CifraMomento
  if (unCampo) antes = { momento: 'antes', previo: 'Lo que viene', unidad: '', ...antesDeCampo(x.bases[0]!, nombre), simulado: sim('antes') }
  else {
    const todos = x.bases.flatMap(b => queAvisa(b).map(r => ({ b, r }))).sort((a, c) =>
      (a.r.horas === undefined ? -1 : a.r.horas) - (c.r.horas === undefined ? -1 : c.r.horas) || (a.r.prioridad || 9) - (c.r.prioridad || 9) || c.r.bblDia - a.r.bblDia)
    const p = todos[0]
    antes = {
      momento: 'antes', previo: `Lo que viene, en sus ${n0(n)} campos`, valor: todos.length, entero: todos.length, unidad: '',
      frase: p ? `el más cercano, ${p.r.equipo} (${campoPorId(p.b.campoId).nombre}), ${condicionDeAviso(p.r)}.` : 'Nada avisa en sus campos.',
      explica: p ? `${mayus(FAMILIA[p.r.tipo])}: ${textoDeAviso(p.r)}. ${todos.length > 1 ? `Avisan también ${algunos(todos.slice(1).map(y => y.r.equipo))}.` : ''}`.trim() : 'Ningún equipo avisa ahora.',
      fraseCorta: p ? `${todos.length === 1 ? '1 equipo avisa' : `${n0(todos.length)} equipos avisan`}; el más cercano, ${p.r.equipo} (${campoPorId(p.b.campoId).nombre}), ${condicionDeAviso(p.r)}.` : 'Nada avisa en sus campos.',
      tramo: p ? tramoDeRiesgo(p.b, p.r) : null, primerEquipo: p ? { campoId: p.b.campoId, equipo: p.r.equipo } : null, simulado: sim('antes'),
    }
  }
  antes.unidad = antes.valor === 1 ? 'equipo avisa' : 'equipos avisan'

  // Después: un campo, su raíz; todos, la suma de las raíces (2.376 = 1.253 + 1.046 + 77).
  const dif = x.lb.diferido
  const difEntero = x.bases.reduce((a, b) => a + b.enteros.raiz, 0)
  const per = x.periodo
  const comienzo = per.mesEnCurso && per.dias < 7 && per.mesAnterior
  const anterior = comienzo ? x.serie.find(s => s.mes === per.mesAnterior) : undefined
  const topEq = x.lb.porEquipo[0]
  let explicaDespues: string
  if (unCampo) {
    const b0 = x.bases[0]!
    // La frase del período del motor de la tubería, con el entero de lo sin identificar (el mismo de la caja de la tubería).
    explicaDespues = dif < 0.5 ? `Nada se trabó en ${per.nombre}.` : b0.tuberia.fraseGerente.replace(/bomba de reinyección/g, 'bomba de agua')
      .replace(/[\d.]+ bbl todavía sin identificar/, `${n0(b0.enteros.porTramo['sin-asignar'])} bbl todavía sin identificar`)
  } else {
    const raizDe = (c: string) => x.bases.find(b => b.campoId === c)?.enteros.raiz ?? 0
    const porCampo = [...x.lb.porCampo].filter(c => raizDe(c.campoId) > 0).sort((a, c) => c.diferido - a.diferido)
    explicaDespues = difEntero < 1 ? `Nada se trabó en ${per.nombre}.` : `Lo que más pesó: ${lista(porCampo.slice(0, 3).map(c => `${campoPorId(c.campoId).nombre} (${n0(raizDe(c.campoId))})`))}.`
  }
  if (anterior) explicaDespues += ` ${mayus(nombreMesDe(anterior.mes))} cerró en ${n0(anterior.libro.diferido)} bbl.`
  const despues: CifraMomento = {
    momento: 'despues',
    previo: `Lo que pasó · ${per.nombre}${per.mesEnCurso ? ` (${comienzo ? `${n0(Math.ceil(per.dias))} ${Math.ceil(per.dias) === 1 ? 'día' : 'días'}, ` : ''}en curso)` : ''}`,
    valor: dif, entero: difEntero, unidad: 'barriles',
    frase: `no se produjeron${unCampo ? ` en ${nombre}` : ''}.`,
    explica: explicaDespues,
    fraseCorta: dif < 0.5 ? `Nada se trabó${unCampo ? ` en ${nombre}` : ''} en ${per.nombre}.`
      : `En ${per.nombre} no se produjeron ${n0(difEntero)} bbl${unCampo ? ` en ${nombre}` : ''}${topEq ? `: sobre todo ${topEq.equipo} (${FAMILIA[topEq.tipo]})` : ''}.`,
    tramo: unCampo ? (() => {
      const t = x.bases[0]!.tuberia
      const top = [...t.perdidoPeriodo].sort((a, c) => c.bbl - a.bbl)[0]
      return top && top.bbl > 0.5 ? top.tramo : t.sinTramoBbl > 0.5 ? 'sin-asignar' as const : null
    })() : null,
    primerEquipo: topEq ? { campoId: topEq.campoId, equipo: topEq.equipo } : null,
    simulado: sim('despues'),
  }
  return { antes, durante, despues }
}

function filasDe(x: Base, m: Momento): FilaCampoViva[] {
  return x.bases.map((b): FilaCampoViva => {
    const nombre = campoPorId(b.campoId).nombre
    const t = b.tuberia
    if (m === 'durante') {
      const [p] = perdiendo(b)
      const primer: EquipoDelTramo | null = p ? { campoId: b.campoId, equipo: p.equipo, familia: FAMILIA[p.tipo ?? 'pendiente'], prioridad: p.prioridad, sinInstrumento: false,
        condicion: 'parada', valor: p.bpd, entero: enteroAhora(b, p.equipo), techo: false, texto: `${n0(enteroAhora(b, p.equipo))} bbl/d` } : null
      return { campoId: b.campoId, nombre, valor: t.perdiendoAhoraBpd, entero: b.ahoraEnteros.raiz, unidad: 'bbl/d', tramo: p?.tramo ?? null, primerEquipo: primer, campoDeGas: t.campoDeGas,
        linea: t.campoDeGas ? 'campo de gas: su tubería todavía no está'
          : !p ? 'produce sin paradas ahora'
            : `${PALABRA_PRIORIDAD[p.prioridad] ? `${PALABRA_PRIORIDAD[p.prioridad]} · ` : ''}${p.tramo ? EN_TRAMO[p.tramo] : 'sin identificar'}, ${p.equipo} (${FAMILIA[p.tipo ?? 'pendiente']})` }
    }
    if (m === 'antes') {
      const avisan = queAvisa(b)
      const [r] = avisan
      const primer: EquipoDelTramo | null = r ? { campoId: b.campoId, equipo: r.equipo, familia: FAMILIA[r.tipo], prioridad: r.prioridad, sinInstrumento: false,
        condicion: condicionDeAviso(r), valor: r.bblDia, entero: enteroDe(r.bblDia), techo: !!r.techo, texto: textoDeAviso(r) } : null
      return { campoId: b.campoId, nombre, valor: avisan.length, entero: avisan.length, unidad: avisan.length === 1 ? 'avisa' : 'avisan', tramo: r ? tramoDeRiesgo(b, r) : null, primerEquipo: primer,
        campoDeGas: t.campoDeGas,
        linea: t.campoDeGas && !r ? 'campo de gas: su tubería todavía no está'
          : !r ? 'nada avisa' : `${PALABRA_PRIORIDAD[r.prioridad] ? `${PALABRA_PRIORIDAD[r.prioridad]} · ` : ''}${r.equipo} (${FAMILIA[r.tipo]}) ${condicionDeAviso(r)}` }
    }
    const top = [...t.perdidoPeriodo].sort((a, c) => c.bbl - a.bbl)[0]
    const e = top && top.bbl > 0.5 ? top.equiposTop[0] : t.sinTramoEquipos[0]
    const tramo = top && top.bbl > 0.5 ? top.tramo : null
    const nE = e ? b.enteros.porElemento[tramo ?? 'sin-asignar'][e.equipo] ?? enteroDe(e.bbl) : 0
    const primer: EquipoDelTramo | null = e ? { campoId: b.campoId, equipo: e.equipo, familia: FAMILIA[e.tipo], prioridad: prioridadDe(b, e.equipo), sinInstrumento: false,
      condicion: `se trabó en ${x.periodo.nombre}`, valor: e.bbl, entero: nE, techo: false, texto: `${n0(nE)} bbl` } : null
    return { campoId: b.campoId, nombre, valor: t.diferido, entero: b.enteros.raiz, unidad: 'bbl', tramo, primerEquipo: primer, campoDeGas: t.campoDeGas,
      linea: t.campoDeGas && t.diferido < 0.5 ? 'campo de gas: su tubería todavía no está'
        : t.diferido < 0.5 ? `nada se trabó en ${x.periodo.nombre}` : e ? `${tramo ? EN_TRAMO[tramo] : 'sin identificar'}, ${e.equipo} (${FAMILIA[e.tipo]}) · ${n0(nE)} bbl` : '' }
  }).sort((a, b) => b.valor - a.valor)
}

function vistaDe(x: Base, m: Momento, desde: Date, hasta: Date): VistaPlantaViva {
  const unCampo = x.campos.length === 1
  const cifras = cifrasDe(x)
  const lb = x.lb
  const per = x.periodo
  // Este mes: el diferido del libro, su rango (calculado, nunca medido) y su valor.
  const top = lb.porEquipo[0]
  const share = top && lb.diferido > 0 ? top.bbl / lb.diferido : 0
  // Lo que se muestra: los enteros de cada equipo con su causa (Σ = la raíz) y su parte entera del total (Σ = 100).
  const enteroEq = (e: { campoId: string; equipo: string; tipo: TipoCausa; bbl: number }) => x.bases.find(b => b.campoId === e.campoId)?.enteros.porCausa[`${e.equipo}|${e.tipo}`] ?? enteroDe(e.bbl)
  const pcts = porcentajesEnteros(lb.porEquipo.map(e => ({ id: `${e.campoId}:${e.equipo}:${e.tipo}`, valor: e.bbl })))
  const sinCausa = x.bases.reduce((a, b) => a + Object.entries(b.enteros.porCausa).filter(([k]) => k.endsWith('|pendiente')).reduce((s, [, n]) => s + n, 0), 0)
  const nota = [
    top ? `${top.equipo}, ${share > 0.5 ? 'más de la mitad' : `el ${n0(pcts[0] ?? 0)} %`}` : '',
    sinCausa > 0 ? `${n0(sinCausa)} sin causa` : '',
  ].filter(Boolean).join(' · ')
  const anterior = per.mesEnCurso && per.dias < 7 && per.mesAnterior ? x.serie.find(s => s.mes === per.mesAnterior) : undefined
  // El mes cerrado antes del período: lo que «Este mes» dice en Después, donde la cifra grande ya es la del período (H28).
  const iPer = x.serie.findIndex(s => new Date(s.desde).getTime() === desde.getTime())
  const previo = iPer > 0 ? x.serie[iPer - 1] : undefined
  const dias = Math.max(1 / 24, lb.meta.dias)
  const hayMeta = conMeta(lb.meta)
  const realBpd = lb.real / dias
  const bajo = hayMeta && realBpd < lb.meta.produccionDia
  // Mes a mes: 13 barras de diferido por día contra el máximo firmado (A, en estilo B).
  const meses = x.serie.map((s, i, todos): MesDiferido => {
    const d = Math.max(1 / 24, s.libro.meta.dias)
    const max = conMeta(s.libro.meta) ? s.libro.meta.diferidoDia : null
    const total = s.libro.diferido / d
    const nombre = nombreMesDe(s.mes)
    const corto = nombre.slice(0, 3).toUpperCase()
    const conAnio = i === 0 || s.mes.endsWith('-01')
    return { mes: s.mes, rotulo: conAnio && i !== todos.length - 1 ? `${corto} ${s.mes.slice(0, 4)}` : corto, nombre: `${mayus(nombre)} ${s.mes.slice(0, 4)}`,
      totalBpd: total, altoBpd: s.libro.altoImpacto / d, maximoBpd: max, sobre: max !== null && !s.parcial && total > max, enCurso: s.parcial && i === todos.length - 1 }
  })
  const ultimo = meses.at(-1)
  // ¿Está bajando? Lo no planeado por día de cada tramo, antes y con TRIM (las dos flechas).
  const bj = x.bajando
  const bajando = bj ? {
    desde: bj.periodo.desde, base: bj.base.nombre,
    // Las dos flechas: primero lo que bajó, después lo que subió (U2 §7.3).
    filas: TRAMOS_VIVOS.filter(k => bj.noPlaneado[k].baseDia > 0.5 || bj.noPlaneado[k].periodoDia > 0.5)
      .sort((a, c) => (bj.noPlaneado[a].cambio ?? 0) - (bj.noPlaneado[c].cambio ?? 0))
      .map(k => ({ tramo: k, nombre: EN_TRAMO[k], ...flecha(bj.noPlaneado[k].baseDia, bj.noPlaneado[k].periodoDia, bj.noPlaneado[k].cambio, k) })),
    nota: `${fechaCorta(bj.periodo.desde)}, frente a ${bj.base.nombre}${(bj.periodo.hasta.getTime() - bj.periodo.desde.getTime()) / D < 60 ? ' · muestra corta' : ''}`,
  } : null
  const planta = unCampo ? plantaDelCampo(x.bases[0]!, m, per.nombre, x.porque, bj, lb, cifras[m]) : null
  return {
    campos: x.campos, alcance: unCampo ? 'campo' : 'portafolio', momento: m, desde, hasta, ahora: AHORA, periodo: per.etiqueta,
    cifras, planta, filas: unCampo ? [] : filasDe(x, m),
    esteMes: {
      titulo: per.mesEnCurso ? 'Este mes' : mayus(per.nombre), bbl: lb.diferido, bblEntero: cifras.despues.entero,
      rango: [Math.max(0, lb.brecha - lb.tolerancia), lb.brecha + lb.tolerancia], valorUsd: lb.valorUsd ?? null, nota,
      anterior: anterior ? { nombre: nombreMesDe(anterior.mes), bbl: anterior.libro.diferido } : null,
      mesAnterior: previo ? { nombre: nombreMesDe(previo.mes), bbl: previo.libro.diferido, bblEntero: enteroDe(previo.libro.diferido) } : null,
    },
    // «Promedio por día»: el mismo nombre de Resultados (G-7); lo que «sale hoy» es otra cifra, la de la tubería.
    produccion: { realBpd, metaBpd: hayMeta ? lb.meta.produccionDia : null, bajoMeta: bajo, texto: bajo ? 'promedio por día, bajo la meta' : 'promedio por día' },
    mover: { totalBbl: x.ciclo.retornoBbl, porMomento: { antes: x.ciclo.antes.bbl, durante: x.ciclo.durante.bbl, despues: x.ciclo.despues.bbl } },
    porEquipo: lb.porEquipo.slice(0, 4).map((e): FilaEquipoDiferido => {
      const b = x.bases.find(y => y.campoId === e.campoId)
      const p = b ? prioridadDe(b, e.equipo) : 0
      return { campoId: e.campoId, equipo: e.equipo, familia: FAMILIA[e.tipo], prioridad: p, palabra: PALABRA_PRIORIDAD[p], bbl: e.bbl, pct: lb.diferido > 0 ? (e.bbl / lb.diferido) * 100 : 0,
        bblEntero: enteroEq(e), pctEntero: pcts[lb.porEquipo.indexOf(e)] ?? 0 }
    }),
    mesAMes: { meses, actualBpd: ultimo ? ultimo.totalBpd : null, nombreActual: ultimo ? nombreMesDe(ultimo.mes) : '', maximoBpd: ultimo?.maximoBpd ?? null, aria: ariaMeses(meses) },
    bajando,
    perdida: `Pérdida: nada registrado en ${per.nombre}`,
    perdidaExplica: 'La pérdida es lo que salió y no se vendió. Va aparte y nunca se suma al diferido (lo que se dejó de producir). Cuando TRIM registre pérdidas, irán como una gota en su tramo.',
    tecnica: unCampo ? tecnicaDe(x.bases[0]!, campoPorId(x.campos[0]!).nombre, cifras.durante) : null,
    planes: planesDe(x.ciclo, undefined),
  }
}

/** «Diferido por día de octubre de 2025 a octubre de 2026 contra el máximo firmado de 800 barriles por día. Lo pasó febrero…». */
function ariaMeses(meses: MesDiferido[]): string {
  const maximo = meses.reduce((a, m) => Math.max(a, m.maximoBpd ?? 0), 0)
  const sobre = meses.filter(m => m.sobre)
  const ult = meses.at(-1)
  return enPalabras(`Diferido por día de ${meses[0]?.nombre ?? ''} a ${ult?.nombre ?? ''}${maximo ? ` contra el máximo firmado de ${n0(maximo)} bbl/d` : ''}. `
    + (sobre.length ? `Lo pasaron ${sobre.map(m => `${m.nombre} (${n0(m.totalBpd)} bbl/d)`).join(', ')}.` : 'Ningún mes cerrado lo pasó.')
    + (ult ? ` ${ult.nombre} va en ${n0(ult.totalBpd)} bbl/d.` : ''))
}

/* ───────────────────────────── la lente técnica ───────────────────────────── */

const TRAMO_DE_CAMPO: Record<'pozos' | 'planta' | 'exportacion', ChokeAnh> = { pozos: 'pozo', planta: 'planta', exportacion: 'exportacion' }

/** La lente técnica de un campo (X4 §3.4, prod; §5.4, N1): lo que sale hoy, lo que limita, lo que le sobra a
 *  cada tramo y los 3 primeros de «Si falla hoy». Todo sale de la tubería y de `criticidadDelCampo`. */
function tecnicaDe(b: BaseCampo, nombre: string, durante: CifraMomento): LenteTecnica | null {
  const t = b.tuberia
  if (t.campoDeGas) return null
  const tr = (k: ChokeAnh) => t.tramos.find(x => x.tramo === k)
  const sobra = (k: ChokeAnh) => tr(k)?.holguraBpd ?? null
  const lim = t.limita
  // «Limitan los pozos: a la planta le sobran 1.143 bbl/d.» (X4 §3.4): el tramo que limita y lo que le sobra al siguiente.
  let limita: string
  if (t.empate || t.casiIguales?.length) limita = t.frase
  else if (lim === 'pozos') {
    const sig = (['planta', 'exportacion'] as const).filter(k => sobra(k) !== null).sort((a, c) => sobra(a)! - sobra(c)!)[0]
    limita = !sig ? 'Limitan los pozos: lo que den de más pasa.'
      : sig === 'planta' ? `Limitan los pozos: a la planta le sobran ${n0(sobra('planta')!)} bbl/d.` : `Limitan los pozos: afuera reciben ${n0(sobra('exportacion')!)} bbl/d más.`
  } else if (lim === 'planta') limita = `Limita la planta: a los pozos les sobran ${n0(sobra('pozo') ?? 0)} bbl/d.`
  else if (lim === 'exportacion') limita = `Limita afuera: a los pozos les sobran ${n0(sobra('pozo') ?? 0)} bbl/d.`
  else limita = t.frase
  const disponible = tr('planta')?.disponibleHoy
  const pasa = enteroDe(t.pasaHoyBpd)
  const cifra: CifraMomento = {
    momento: 'durante', previo: 'Ahora mismo', valor: t.pasaHoyBpd, entero: pasa, unidad: 'barriles por día',
    frase: `salen hoy de ${nombre}.`,
    explica: `${limita}${disponible ? ` ${fraseAngosto(disponible)}` : ''}`,
    fraseCorta: `${limita} Hoy salen ${n0(pasa)}.`,
    tramo: lim ? TRAMO_DE_CAMPO[lim] : null, primerEquipo: durante.primerEquipo, simulado: durante.simulado,
  }
  const tramos = (['pozo', 'planta', 'exportacion'] as const).map(k => {
    const x = tr(k)
    const cabe = x?.potencialBpd ?? null, s = x?.holguraBpd ?? null
    const texto = cabe === null ? 'sin dato'
      : k === 'pozo' ? `dan ${n0(cabe)} bbl/d`
        : `caben ${n0(cabe)} bbl/d${s !== null && !x?.limita ? ` · le sobran ${n0(s)}` : ''}`
    return { tramo: k, nombre: NOMBRE_TRAMO_VIVO[k], cabeBpd: cabe, sobraBpd: s, limita: !!x?.limita, capacidad: capacidadDe(x), texto, fuente: x?.fuente ?? null }
  })
  const bombasDeAgua = new Set((b.agua.tramos.find(x => x.tramo === 'bombas')?.bombas ?? []).map(x => x.id))
  const familiaDe = (f: FilaCriticidad) => f.familia === 'bomba' ? (bombasDeAgua.has(f.equipo) ? 'bomba de agua' : 'bomba multifásica')
    : f.familia === 'bombeo-mecanico' ? 'bombeo mecánico' : f.familia === 'servicio' ? (f.nombre.split(' · ')[1] ?? 'servicio') : f.familia
  const siFallaHoy = b.crit.ranking.slice(0, 3).map(f => {
    // «Si falla hoy» siempre en bbl/d (D-2); el colchón dice cuándo empieza.
    const cuando = f.colchonH !== undefined ? `después de ${textoH(f.colchonH)}` : f.familia === 'electrosumergible' ? 'sin colchón' : ''
    return {
      campoId: b.campoId, equipo: f.equipo, familia: familiaDe(f), prioridad: prioridadDe(b, f.equipo), sinInstrumento: !f.vigilado && f.familia === 'bomba',
      bpd: f.bpd, entero: f.bpd === null ? null : enteroDe(f.bpd), cuando: f.grupo === 'techo' ? `hasta${cuando ? ` · ${cuando}` : ''}` : cuando,
      texto: f.bpd === null ? 'sin dato' : `${f.grupo === 'techo' ? 'hasta ' : ''}${n0(f.bpd)} bbl/d${f.colchonH !== undefined ? ` después de ${textoH(f.colchonH)}` : f.familia === 'electrosumergible' ? ' · sin colchón' : ''}`,
    }
  })
  return { cifra, tramos, siFallaHoy }
}

/** «3 de 11 planes en marcha»: los planes del ciclo que mueven crudo, aceptados o ya hechos (X4 §3.7). */
function planesDe(c: CicloValor, decisiones: Record<string, DecisionPlan> | undefined): VistaPlantaViva['planes'] {
  const todos = [...c.antes.planes, ...c.durante.planes, ...c.despues.planes].filter(p => p.bbl > 0)
  if (!todos.length) return null
  const enMarcha = todos.filter(p => { const d = decisiones && Object.hasOwn(decisiones, p.id) ? decisiones[p.id] : undefined; return d?.estado === 'aceptado' || d?.estado === 'ejecutado' }).length
  return { enMarcha, total: todos.length, texto: `${n0(enMarcha)} de ${n0(todos.length)} ${todos.length === 1 ? 'plan' : 'planes'} en marcha` }
}

/** La vista de «La planta viva» de unos campos en un momento y un período.
 *  Guardada en memoria por contexto, historial, lo guardado, campos, período y
 *  momento: cambiar de momento no recalcula nada (D7). */
export function plantaViva(q: ConsultaPlantaViva, ctx: Contexto, versiones?: Historial, op: OpcionesPlantaViva = {}): VistaPlantaViva {
  if (!esMomento(q.momento)) throw new Error(`«${String(q.momento)}» no es un momento: antes, durante o despues.`)
  if (!q.campos.length) throw new Error('La planta viva necesita al menos un campo.')
  const campos = [...new Set(q.campos)]
  const x = baseDe(campos, q.desde, q.hasta, ctx, versiones, op)
  let porM = VISTAS.get(x)
  if (!porM) VISTAS.set(x, porM = new Map())
  let v = porM.get(q.momento)
  if (!v) porM.set(q.momento, v = vistaDe(x, q.momento, q.desde, q.hasta))
  // Las decisiones sobre los planes solo cambian «N de M planes en marcha»: lo demás queda guardado.
  if (!op.decisiones) return v
  let porD = CON_DECISIONES.get(op.decisiones)
  if (!porD) CON_DECISIONES.set(op.decisiones, porD = new WeakMap())
  let y = porD.get(v)
  if (!y) porD.set(v, y = { ...v, planes: planesDe(x.ciclo, op.decisiones) })
  return y
}
const CON_DECISIONES = new WeakMap<object, WeakMap<VistaPlantaViva, VistaPlantaViva>>()
