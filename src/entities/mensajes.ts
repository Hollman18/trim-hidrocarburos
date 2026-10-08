/** El carril caliente: lo que TRIM le manda por WhatsApp a quien tiene que
 *  actuar, en minutos, por el canal que ya usa. Y la respuesta en el mismo
 *  hilo: un toque para decir qué se dañó, escogiendo entre las causas que la
 *  señal sugiere. Es lo que vuelve una parada «sin identificar» en un dato.
 *
 *  Reglas (las fija el producto, no cada persona):
 *   · parada      Equipo de alto impacto parado → supervisor y operador del campo;
 *                 en una bomba, otro mensaje (cierre) cuando se cierra el primer pozo.
 *   · causa       Parada que ninguna señal explica → operador; recordatorio a
 *                 los 30 min; a las 2 h se escala al supervisor.
 *   · parte       El vigía emite una predicción → confiabilidad y jefe de
 *                 mantenimiento, con su ventana.
 *   · orden       SAP liberó una orden → el técnico asignado.
 *
 *  WhatsApp exige que el mensaje que inicia la empresa sea una plantilla
 *  aprobada por Meta (`PLANTILLAS`). Por eso cada mensaje del registro guarda
 *  su plantilla y sus parámetros, y el texto SALE de ahí (`textoDe`): lo que
 *  el registro dice que se envió es exactamente lo que la plantilla produce.
 *  Ningún parámetro va vacío (Meta lo rechaza): lo que puede faltar (el tag,
 *  la prueba del pozo, el respaldo) tiene su variante de plantilla o su frase
 *  completa. Un parámetro no puede llevar saltos de línea: las opciones van
 *  numeradas en una sola línea; el salto antes de ellas es del cuerpo. Lo que
 *  sigue a la respuesta de la persona (¿qué vio?) ya va dentro de la ventana
 *  de 24 h y puede ser un mensaje libre. Contrato: `/api/mensajes`.
 *
 *  Cada mensaje dice solo lo que se sabía a su hora: nada de lo que pasó
 *  después (pozos cerrados, barriles, respuestas) entra en un texto anterior.
 */
import { historialDeEquipo, tramosEntre, type Pregunta } from './libro'
import type { PrediccionVigia } from './aciertos'
import { NOMBRE_CLASE, type OrdenSap } from './sap'
import { recibeAlertas, type PersonaVisible } from './usuarios'
import type { Contexto } from './causa-senal'
import { perfilBomba } from './bombas'
import { saludDePartes } from './salud'
import { saludDeEsp } from './esp'
import { catalogoDe } from './catalogo'
import { pozoDe, type Pozo } from './pozos'
import { NOMBRE_PARTE, type ParteId } from './partes'
import { flotaDe } from './flota'
import { perfilDe, respaldoDe, configEn, type Version } from './configuracion'
import { campoPorId } from './campos'
import { AHORA, fechaHora } from './reloj'

export type Regla = 'parada' | 'cierre' | 'causa' | 'parte' | 'orden'

export const NOMBRE_REGLA: Record<Regla, string> = {
  parada: 'equipo de alto impacto parado', cierre: 'pozos cerrándose', causa: '¿qué se dañó?',
  parte: 'el vigía anticipa falla', orden: 'orden liberada en SAP',
}

/** Lo que dice un paso de un hilo, en una o dos palabras (Turno y Causa). */
export const PASO_CORTO: Record<Regla | 'recordatorio' | 'escalamiento', string> = {
  parada: 'parado', cierre: 'pozos cerrándose', causa: 'pregunta', parte: 'aviso del vigía',
  orden: 'orden liberada en SAP', recordatorio: 'recordatorio', escalamiento: 'escalado',
}

/** Las causas frecuentes cuando la señal no explica por qué se cerró un pozo.
 *  Las mismas en la pantalla y en WhatsApp: ayudas para responder, sin orden
 *  de probabilidad (no hay señal que lo dé). */
export const CAUSAS_POZO = [
  'Cierre para prueba o intervención del pozo',
  'Fuga o daño en la línea de flujo',
  'Orden de producción: nominación o restricción del comprador',
  'Falla del controlador o de un instrumento del pozo',
] as const

export interface Opcion {
  /** Lo que la persona escribe para escogerla: «1», «2»…; «0» es otra cosa. */
  clave: string
  texto: string
  parte?: ParteId
  /** Por qué se sugiere (vacío si es el catálogo sin orden). */
  porque?: string
  /** De dónde sale la sugerencia: una lectura fuera de límite o la historia del equipo. */
  fuente?: 'senal' | 'historia'
  /** Con `fuente: 'historia'`: cuántas de las fallas anteriores del equipo fueron
   *  de esa parte (`veces`) y cuántas hubo en total. La pantalla escribe de aquí;
   *  `porque` es la misma cifra dicha en una frase. */
  veces?: number
  total?: number
}

interface MensajeBase {
  id: string
  regla: Regla
  /** La plantilla aprobada con que salió, y sus parámetros: el texto es el que ellas producen. */
  plantilla: NombrePlantilla
  parametros: Record<string, string>
  campoId: string
  equipo: string
  /** Id del usuario que lo recibe. */
  para: string
  hora: string
  opciones?: Opcion[]
  /** Evento del PLC del que habla (la parada, y la pregunta sobre ella). */
  evento?: string
  /** Orden de SAP de la que avisa. */
  orden?: string
  /** Recordatorio o escalamiento de una pregunta sin respuesta. */
  insistencia?: 'recordatorio' | 'escalamiento'
}

/** Un mensaje del registro: el que salió trae su `texto` (exactamente lo que
 *  la plantilla produce); el que no se pudo enviar trae `noEnviado`, el porqué
 *  (un parámetro vacío o de varias líneas que Meta rechazaría, como una
 *  descripción de SAP en blanco). Queda en el registro y se muestra: un dato
 *  malo no tumba a los demás mensajes, pero tampoco desaparece en silencio. */
export type Mensaje = MensajeBase & ({ texto: string; noEnviado?: never } | { texto?: never; noEnviado: string })

export type NombrePlantilla = 'parada' | 'paradaEsp' | 'cierre' | 'causa' | 'recordatorio' | 'recordatorioArranco' | 'escalamiento' | 'parte' | 'parteSinTag' | 'orden'

/** Las plantillas de WhatsApp (aprobadas por Meta, categoría «utilidad»). Las
 *  variables van entre llaves y ninguna puede quedar vacía; el «TRIM · » del
 *  comienzo y el salto antes de las opciones son parte del cuerpo aprobado. */
export const PLANTILLAS: Record<NombrePlantilla, { nombre: string; cuerpo: string }> = {
  parada: { nombre: 'trim_equipo_parado', cuerpo: 'TRIM · {equipo} de {campo} paró a las {hora}. {consecuencia}' },
  paradaEsp: { nombre: 'trim_electrosumergible_parada', cuerpo: 'TRIM · {equipo} de {campo} (electrosumergible) paró a las {hora}. {consecuencia}' },
  cierre: { nombre: 'trim_pozos_cerrandose', cuerpo: 'TRIM · Por {equipo} parado se empezaron a cerrar pozos de {campo} a las {hora}.' },
  causa: { nombre: 'trim_que_se_dano', cuerpo: 'TRIM · {equipo} de {campo} paró el {fecha}. Ninguna señal dice qué se dañó. ¿Qué encontró? Responda con un número.\n{opciones}' },
  recordatorio: { nombre: 'trim_recordatorio_causa', cuerpo: 'TRIM · Recordatorio: {equipo} sigue sin causa. Antes de arrancar, diga {pregunta}. Responda con un número.\n{opciones}' },
  recordatorioArranco: { nombre: 'trim_recordatorio_arranco', cuerpo: 'TRIM · Recordatorio: {equipo} arrancó a las {hora} sin causa. Diga {pregunta}. Responda con un número.\n{opciones}' },
  escalamiento: { nombre: 'trim_escalado_causa', cuerpo: 'TRIM · Escalado: {equipo} de {campo} paró hace 2 h y nadie ha dicho qué se dañó.\n{opciones}' },
  parte: { nombre: 'trim_vigia_anticipa', cuerpo: 'TRIM · {equipo} de {campo}: el vigía anticipa falla en {parte}; cruzaría su límite entre el {desde} y el {hasta} ({tag}). {accion}' },
  parteSinTag: { nombre: 'trim_vigia_anticipa_sin_tag', cuerpo: 'TRIM · {equipo} de {campo}: el vigía anticipa falla en {parte}; cruzaría su límite entre el {desde} y el {hasta}. {accion}' },
  orden: { nombre: 'trim_orden_liberada', cuerpo: 'TRIM · SAP liberó la orden {orden} ({clase}, prioridad {prioridad}) para {equipo} de {campo}: {descripcion}' },
}

/** Un mensaje que no se puede armar con su plantilla aprobada: Meta lo
 *  rechazaría. Es un error del dato (o de quien arma el mensaje), con el
 *  porqué en palabras: el registro lo guarda como no enviado. */
export class ErrorDePlantilla extends Error {
  constructor(mensaje: string) { super(mensaje); this.name = 'ErrorDePlantilla' }
}

/** El texto que una plantilla produce con sus parámetros. Un parámetro que
 *  falta, sobra, va vacío o trae un salto de línea es un `ErrorDePlantilla`:
 *  Meta lo rechazaría y el registro diría algo que no salió. */
export function textoDe(plantilla: NombrePlantilla, parametros: Record<string, string>): string {
  const cuerpo = PLANTILLAS[plantilla].cuerpo
  const pide = [...cuerpo.matchAll(/\{(\w+)\}/g)].map(m => m[1]!)
  const sobra = Object.keys(parametros).filter(k => !pide.includes(k))
  if (sobra.length) throw new ErrorDePlantilla(`La plantilla ${PLANTILLAS[plantilla].nombre} no lleva ${sobra.join(', ')}.`)
  return cuerpo.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = parametros[k]
    if (!v?.trim() || /[\n\r]/.test(v)) throw new ErrorDePlantilla(`La plantilla ${PLANTILLAS[plantilla].nombre} necesita «${k}» en una sola línea y no vacío.`)
    return v
  })
}

/** El orden de los pasos de un hilo cuando caen en el mismo minuto: primero que paró, después la pregunta. */
export const ORDEN_PASO: Record<Regla | 'recordatorio' | 'escalamiento', number> = {
  parada: 0, causa: 1, recordatorio: 2, escalamiento: 3, cierre: 4, parte: 5, orden: 6,
}

const MIN = 60_000

/** La última prueba del pozo HASTA ese instante. Sin ninguna anterior no hay
 *  cifra: el mensaje no cita una prueba que todavía no existía. */
const pruebaAntes = (pozo: Pozo, t: number) => {
  let u: Pozo['pruebas'][number] | undefined
  for (const x of pozo.pruebas) if (new Date(x.fecha).getTime() <= t) u = x
  return u
}
// Un solo formateador: armar uno por mensaje era lo más caro de armar el hilo.
const FMT_HORA = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })
const hora = (d: Date) => FMT_HORA.format(d)
const bbl = (n: number) => Math.round(n).toLocaleString('es-CO')

/** La opción abierta: la persona escribe lo que encontró. */
export const OTRA: Opcion = { clave: '0', texto: 'Otra cosa: escríbala' }

const numeradas = (xs: Array<Omit<Opcion, 'clave'>>): Opcion[] => [...xs.map((x, i) => ({ ...x, clave: String(i + 1) })), OTRA]

/** En un pozo con electrosumergible, la salida para decir que el daño no fue de ella. */
/** La opción de un pozo con electrosumergible cuando no fue ella. La pantalla
 *  muestra la parte corta (lo que sigue lo dice el paso siguiente). */
export const NO_FUE_ESP_CORTO = 'No fue la electrosumergible'
export const NO_FUE_ESP = `${NO_FUE_ESP_CORTO}: otra causa del pozo`

/** Cuando se sugieren solo algunas partes: la puerta a todas las del catálogo. */
export const OTRA_PARTE = 'Otra parte del equipo'

/** Las causas que se le sugieren a una parada sin identificar, con su porqué.
 *  Bomba de la línea o pozo con electrosumergible: sus partes (del catálogo de
 *  su clase). De la historia, solo lo que se sabía al parar: las fallas de ese
 *  equipo antes de esta parada, con la parte que ya se conocía entonces. Con
 *  `lecturas` (la pantalla, con la parada abierta) van primero las partes que
 *  hoy están fuera de límite o avisando. Sin historia: todas sus partes, sin
 *  orden. Un pozo sin electrosumergible: el catálogo de causas de pozo. */
export function causasSugeridas(p: Pregunta, ctx: Contexto, lecturas = false): { opciones: Opcion[]; conEvidencia: boolean } {
  const cat = catalogoDe(p.campoId, p.equipo)
  if (!cat) return { conEvidencia: false, opciones: numeradas(CAUSAS_POZO.map(texto => ({ texto }))) }
  const esp = cat.clase === 'bomba-electrosumergible'
  // En un pozo con electrosumergible puede no haber sido ella: esa salida va siempre.
  const otraDelPozo: Array<Omit<Opcion, 'clave'>> = esp ? [{ texto: NO_FUE_ESP }] : []
  const candidatas: Array<Omit<Opcion, 'clave' | 'texto'> & { parte: ParteId }> = []
  const agregar = (c: (typeof candidatas)[number]) => { if (!candidatas.some(x => x.parte === c.parte)) candidatas.push(c) }
  if (lecturas && !p.fin) {
    const bomba = perfilBomba(p.equipo, p.campoId), pozo = pozoDe(p.campoId, p.equipo)
    const salud = bomba ? saludDePartes(bomba) : pozo ? saludDeEsp(pozo) : []
    // La banda normal y la alarma son dos límites: se dice cuál pasó.
    for (const s of salud) if (s.estado === 'fuera') {
      const v = s.fuera[0]?.senal
      agregar({ parte: s.parte.id, fuente: 'senal', porque: `${v?.tag ?? 'una variable'} ${v && (v.estado === 'alarma' || v.pronostico.tipo === 'cruzado') ? 'llegó a su alarma' : 'salió de su banda normal'}` })
    }
    for (const s of salud) if (s.estado === 'avisa') agregar({ parte: s.parte.id, fuente: 'senal', porque: `${s.primera?.senal.tag ?? 'una variable'} venía avisando` })
  }
  // Una parte declarada después de esta parada no se sabía cuando paró.
  const sabida = (id: string) => { const r = ctx.respuestas[id]; return !r || new Date(r.hora) < p.inicio }
  const antes = historialDeEquipo(p.campoId, p.equipo, ctx).eventos.filter(e => !e.disparo && e.id !== p.id && e.inicio < p.inicio)
  const porParte = new Map<ParteId, number>()
  for (const e of antes) if (e.parte && sabida(e.id)) porParte.set(e.parte, (porParte.get(e.parte) ?? 0) + 1)
  for (const [parte, n] of [...porParte].sort((a, b) => b[1] - a[1]))
    agregar({ parte, fuente: 'historia', veces: n, total: antes.length, porque: `${n} de las ${antes.length} fallas anteriores de este equipo` })
  const nombre = (id: ParteId) => cat.partes.find(x => x.id === id)?.nombre ?? NOMBRE_PARTE[id]
  if (candidatas.length) return { conEvidencia: true, opciones: numeradas([...candidatas.slice(0, 3).map(c => ({ ...c, texto: nombre(c.parte) })), { texto: OTRA_PARTE }, ...otraDelPozo]) }
  return { conEvidencia: false, opciones: numeradas([...cat.partes.map(x => ({ texto: x.nombre, parte: x.id })), ...otraDelPozo]) }
}

/** Quién recibe una regla en un campo: personas a las que les llegan las
 *  alertas (activas, con WhatsApp y alertas encendidas), del rol y con ese campo. */
export function destinatarios<U extends PersonaVisible>(usuarios: readonly U[], roles: string[], campoId: string): U[] {
  return usuarios.filter(u => roles.includes(u.rolId) && recibeAlertas(u, campoId))
}

/** Los mensajes que TRIM mandó entre `desde` y ahora, del más reciente al más
 *  viejo. Solo los que salen: la respuesta es la `Respuesta` del evento
 *  (`causa.declarado`), y con ella se dejan de mandar recordatorios.
 *  `versiones` es el historial de la configuración firmada: cada mensaje se
 *  arma con la que regía a su hora (`configEn`), no con la vigente. Un
 *  respaldo o un perfil firmado hoy no reescribe lo que se mandó ayer. */
export function mensajesDe(a: {
  campos: string[]; preguntas: Pregunta[]; predicciones: PrediccionVigia[]; ordenes: OrdenSap[]; usuarios: readonly PersonaVisible[]; ctx: Contexto
  versiones: ReadonlyArray<Pick<Version, 'fecha' | 'config'>>; desde: Date
}): Mensaje[] {
  const out: Mensaje[] = []
  const ahora = AHORA.getTime(), d0 = a.desde.getTime()
  // El texto sale de la plantilla y sus parámetros: así el registro guarda lo
  // que de verdad se envía. Si un parámetro no sirve (vacío, varias líneas),
  // ESE mensaje queda como no enviado con su motivo y los demás siguen; un
  // error de otra clase no es del dato y no se tapa.
  const push = (m: Omit<MensajeBase, 'id'>) => {
    const t = new Date(m.hora).getTime()
    if (!(t >= d0 && t <= ahora)) return
    const id = `${m.regla}-${m.evento ?? m.orden ?? m.equipo}-${m.insistencia ?? ''}-${m.para}-${m.hora}`
    try { out.push({ ...m, id, texto: textoDe(m.plantilla, m.parametros) }) }
    catch (e) {
      if (!(e instanceof ErrorDePlantilla)) throw e
      out.push({ ...m, id, noEnviado: e.message })
    }
  }
  const nombre = (c: string) => campoPorId(c).nombre
  const aLas = (t: number) => new Date(t + MIN).toISOString()

  // Paradas: de los eventos propios de cada equipo de alto impacto, abiertos o
  // cerrados. Con la familia apagada en el perfil, el equipo no se vigila.
  const primerCierre = new Map<string, number>()
  for (const t of tramosEntre(a.campos, a.desde, AHORA, a.ctx)) {
    const k = `${t.pozo.campoId}|${t.causa.evento ?? t.evento.id}`
    primerCierre.set(k, Math.min(primerCierre.get(k) ?? Infinity, t.inicio.getTime()))
  }
  for (const c of a.campos) {
    const para = destinatarios(a.usuarios, ['sup', 'oper'], c)
    for (const { equipo, familia } of flotaDe(c)) {
      const esp = familia === 'electrosumergible'
      const pozo = esp ? pozoDe(c, equipo) : undefined
      const capacidad = esp ? undefined : perfilBomba(equipo, c)?.capacidadBpd
      for (const e of historialDeEquipo(c, equipo, a.ctx).eventos) {
        const t0 = e.inicio.getTime()
        if (t0 < d0 - MIN || t0 > ahora) continue
        // La configuración que regía al parar: con la familia apagada en ESE
        // perfil el equipo no se vigilaba, y la consecuencia es la de ESE respaldo.
        const cfg = configEn(a.versiones, t0)
        const perfil = perfilDe(cfg, c)
        if (esp ? !perfil.electrosumergibles : !perfil.bombas) continue
        // Lo que pasa si una bomba no arranca depende de su respaldo declarado:
        // sin respaldo se cierran pozos; con uno que toma todo su caudal, no.
        const respaldo = esp ? undefined : respaldoDe(cfg, c, equipo)
        const consecuenciaBomba = !respaldo || !(respaldo.libreBpd > 0)
          ? 'Si no arranca a tiempo, hay que cerrar los pozos que dependen de ella.'
          : capacidad !== undefined && respaldo.libreBpd >= capacidad
            ? `Tiene respaldo (${respaldo.detalle}): toma todo su caudal y no hay que cerrar pozos.`
            : `Tiene respaldo (${respaldo.detalle}), pero no para todo su caudal: si no arranca a tiempo, puede haber que cerrar pozos.`
        const prueba = pozo ? pruebaAntes(pozo, t0) : undefined
        const parametros = { equipo, campo: nombre(c), hora: hora(e.inicio),
          consecuencia: !esp ? consecuenciaBomba
            : prueba ? `Según su última prueba, el pozo deja de producir unos ${bbl(prueba.crudoBpd)} bbl/d.`
              : 'Todavía no tiene prueba de pozo: no se sabe cuánto deja de producir.' }
        const cierre = primerCierre.get(`${c}|${e.id}`)
        for (const u of para) {
          push({ regla: 'parada', plantilla: esp ? 'paradaEsp' : 'parada', parametros, campoId: c, equipo, para: u.id, hora: aLas(t0), evento: e.id })
          if (!esp && cierre !== undefined) push({ regla: 'cierre', plantilla: 'cierre', campoId: c, equipo, para: u.id, hora: aLas(cierre), evento: e.id,
            parametros: { equipo, campo: nombre(c), hora: hora(new Date(cierre)) } })
        }
      }
    }
  }

  // Partes: cuando el vigía emite una predicción, con su ventana (lo que se sabía al emitirla).
  for (const pr of a.predicciones) {
    const parte = pr.parte ? NOMBRE_PARTE[pr.parte].toLowerCase() : 'una parte'
    // La acción es la de la parte en el catálogo; sin parte conocida, se remite a la ficha.
    const accion = pr.accion ?? catalogoDe(pr.campoId, pr.equipo)?.partes.find(x => x.id === pr.parte)?.accion ?? `Vea la ficha de ${pr.equipo} en TRIM.`
    const parametros: Record<string, string> = { equipo: pr.equipo, campo: nombre(pr.campoId), parte,
      desde: fechaHora(new Date(pr.desde)), hasta: fechaHora(new Date(pr.hasta)), accion, ...(pr.tag ? { tag: pr.tag } : {}) }
    for (const u of destinatarios(a.usuarios, ['conf', 'jefe'], pr.campoId))
      push({ regla: 'parte', plantilla: pr.tag ? 'parte' : 'parteSinTag', parametros, campoId: pr.campoId, equipo: pr.equipo, para: u.id, hora: pr.emitida, evento: pr.id })
  }

  for (const p of a.preguntas) {
    const { opciones } = causasSugeridas(p, a.ctx)
    const respondida = p.causa.declarado ? new Date(p.causa.declarado.hora).getTime() : Infinity
    // Una sola línea: va como parámetro de la plantilla, y Meta no acepta saltos de línea ahí.
    const ops = opciones.map(o => `${o.clave}) ${o.texto}${o.porque ? ` (${o.porque})` : ''}`).join(' · ')
    const base = { regla: 'causa' as const, campoId: p.campoId, equipo: p.equipo, evento: p.id, opciones }
    const operadores = destinatarios(a.usuarios, ['oper'], p.campoId)
    const supervisores = destinatarios(a.usuarios, ['sup'], p.campoId)
    // Sin operador con WhatsApp en el campo, la pregunta va directo al supervisor.
    const primeros = operadores.length ? operadores : supervisores
    const en = (min: number) => p.inicio.getTime() + min * MIN
    const pregunta = p.sobre === 'pozo' && !catalogoDe(p.campoId, p.equipo) ? 'por qué paró' : 'qué se dañó'
    // A los 30 min el recordatorio dice lo que es cierto a esa hora: si el equipo ya arrancó, no pide «antes de arrancar».
    const arranco = p.fin && p.fin.getTime() <= en(30) ? p.fin : undefined
    for (const u of primeros) {
      push({ ...base, plantilla: 'causa', para: u.id, hora: new Date(en(1)).toISOString(),
        parametros: { equipo: p.equipo, campo: nombre(p.campoId), fecha: fechaHora(p.inicio), opciones: ops } })
      if (en(30) < respondida) push({ ...base, para: u.id, hora: new Date(en(30)).toISOString(), insistencia: 'recordatorio',
        ...(arranco
          ? { plantilla: 'recordatorioArranco' as const, parametros: { equipo: p.equipo, hora: hora(arranco), pregunta, opciones: ops } }
          : { plantilla: 'recordatorio' as const, parametros: { equipo: p.equipo, pregunta, opciones: ops } }) })
    }
    if (operadores.length && en(120) < respondida) for (const u of supervisores)
      push({ ...base, plantilla: 'escalamiento', para: u.id, hora: new Date(en(120)).toISOString(), insistencia: 'escalamiento',
        parametros: { equipo: p.equipo, campo: nombre(p.campoId), opciones: ops } })
  }

  // El aviso sale cuando SAP libera la orden, y queda: que hoy esté cerrada
  // (TECO) no borra lo que se le mandó al técnico cuando se la liberaron.
  for (const o of a.ordenes) {
    if (!o.liberada || !o.tecnico) continue
    const u = a.usuarios.find(x => x.id === o.tecnico)
    if (!u || !recibeAlertas(u, o.campoId)) continue
    push({ regla: 'orden', plantilla: 'orden', campoId: o.campoId, equipo: o.equipo, para: u.id, hora: aLas(new Date(o.liberada).getTime()), orden: o.numero,
      parametros: { orden: o.numero, clase: NOMBRE_CLASE[o.clase].toLowerCase(), prioridad: String(o.prioridad), equipo: o.equipo, campo: nombre(o.campoId), descripcion: o.descripcion } })
  }

  return out.sort((x, y) => y.hora.localeCompare(x.hora))
}
