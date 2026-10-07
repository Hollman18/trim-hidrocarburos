import { DatabaseSync } from 'node:sqlite'
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
export const RUTA = process.env.TRIM_DB ?? join(aqui, 'datos', 'trim.db')

let db

/** Error con el código HTTP que le corresponde: lo que pide el cliente mal
 *  (400), lo que no existe (404) o lo que choca con lo registrado (403/409).
 *  api.mjs lo convierte en respuesta; nada de esto es un 500. */
export class ErrorDeRegistro extends Error {
  constructor(estado, mensaje, extra = {}) { super(mensaje); this.estado = estado; this.extra = extra }
}

/** Huella de la semilla con la que se llenó la base, o null si la base es de
 *  antes de que se guardara (o no existe). Se lee ANTES de aplicar el
 *  esquema: un esquema nuevo sobre una base vieja puede fallar a medias. */
function huellaGuardada(d) {
  const hay = d.prepare("select 1 from sqlite_master where type = 'table' and name = 'semilla'").get()
  return hay ? d.prepare('select huella from semilla').get()?.huella ?? null : null
}

/** Abre la base y aplica el esquema. Idempotente.
 *
 *  Con `huella` (la de esquema.sql + semilla), una base que se llenó con otra
 *  semilla o con otro esquema se BORRA y se reconstruye, y se dice en la
 *  consola: antes se seguía sirviendo el registro viejo sin ningún aviso
 *  después de `npm run semilla`. Lo que alguien asoció a mano en esa base se
 *  pierde, y por eso el aviso dice dónde estaba. */
export function base(huella) {
  if (db) return db
  mkdirSync(dirname(RUTA), { recursive: true })
  if (huella && existsSync(RUTA)) {
    const vieja = new DatabaseSync(RUTA)
    const guardada = huellaGuardada(vieja)
    vieja.close()
    if (guardada !== huella) {
      console.warn(`[simulador] la base ${RUTA} se llenó con otra semilla u otro esquema` +
        `${guardada ? '' : ' (sin huella: es anterior a este aviso)'}: se borra y se vuelve a cargar.`)
      for (const f of [RUTA, `${RUTA}-wal`, `${RUTA}-shm`]) rmSync(f, { force: true })
    }
  }
  db = new DatabaseSync(RUTA)
  db.exec('pragma journal_mode = wal')
  db.exec('pragma foreign_keys = on')
  db.exec(readFileSync(join(aqui, 'esquema.sql'), 'utf8'))
  return db
}

export const vacia = () =>
  base().prepare('select count(*) as n from tag').get().n === 0

/** Todo o nada: si algo falla a mitad, no queda nada escrito. */
function enTransaccion(d, fn) {
  d.exec('begin immediate')
  try { const r = fn(); d.exec('commit'); return r }
  catch (e) { d.exec('rollback'); throw e }
}

/** Registro de ingeniería: campos, equipos y fórmulas. Lo declara una
 *  persona una vez; no sale del borde porque el borde no sabe de criticidad.
 *  `huella` queda guardada para saber, al arrancar, si la semilla cambió. */
export function cargarIngenieria(registro, huella) {
  const d = base()
  enTransaccion(d, () => {
    const campo = d.prepare('insert or replace into campo (id, nombre) values (?, ?)')
    const equipo = d.prepare(
      'insert or replace into equipo (id, campo_id, codigo, nombre, clase, criticidad) values (?, ?, ?, ?, ?, ?)')
    const formula = d.prepare(`insert or replace into formula (id, clase_equipo, tipo_tag, expresion, version, ventana_min, activa)
      values (?, ?, ?, ?, ?, ?, 1)`)
    for (const c of registro.campos) campo.run(c.id, c.nombre)
    for (const e of registro.equipos)
      equipo.run(`${e.campoId}:${e.id}`, e.campoId, e.id, e.nombre, e.clase, e.criticidad)
    for (const f of registro.formulas)
      formula.run(f.id, f.claseEquipo, f.tipoTag, f.expresion, f.version, f.ventanaMin ?? null)
    if (huella) { d.exec('delete from semilla'); d.prepare('insert into semilla (huella) values (?)').run(huella) }
  })
}

/* ───── Validación del nacimiento ─────
   Se valida la forma ANTES de escribir, con el nombre del campo que falta:
   antes llegaba al cliente el error crudo de SQLite («cannot be bound to
   parameter 5») y lo escrito hasta ahí quedaba guardado. */
const esObjeto = v => typeof v === 'object' && v !== null && !Array.isArray(v)
const esTexto = v => typeof v === 'string' && v.trim() !== ''
const esNumeroONulo = v => v == null || (typeof v === 'number' && Number.isFinite(v))
const esTextoONulo = v => v == null || typeof v === 'string'

export function validarNacimiento(nac) {
  const faltas = []
  const exigir = (cond, ruta, que) => { if (!cond) faltas.push(`${ruta} ${que}`) }
  if (!esObjeto(nac)) return ['el cuerpo tiene que ser un objeto']
  exigir(esTexto(nac.campo), 'campo', 'es obligatorio')
  exigir(esObjeto(nac.gateway), 'gateway', 'es obligatorio')
  if (esObjeto(nac.gateway)) {
    exigir(esTexto(nac.gateway.id), 'gateway.id', 'es obligatorio')
    for (const k of ['modelo', 'serie', 'firmware', 'enlace'])
      exigir(esTextoONulo(nac.gateway[k]), `gateway.${k}`, 'tiene que ser texto')
    exigir(esNumeroONulo(nac.gateway.bufferH), 'gateway.bufferH', 'tiene que ser un número')
  }
  exigir(Array.isArray(nac.dispositivos) && nac.dispositivos.length > 0, 'dispositivos', 'tiene que traer al menos uno')
  if (!Array.isArray(nac.dispositivos)) return faltas
  const vistos = new Set()
  nac.dispositivos.forEach((disp, i) => {
    const r = `dispositivos[${i}]`
    if (!esObjeto(disp)) { faltas.push(`${r} tiene que ser un objeto`); return }
    exigir(esTexto(disp.nombre), `${r}.nombre`, 'es obligatorio')
    exigir(esObjeto(disp.fuente), `${r}.fuente`, 'es obligatoria')
    if (esObjeto(disp.fuente)) {
      exigir(esTexto(disp.fuente.protocolo), `${r}.fuente.protocolo`, 'es obligatorio')
      exigir(esTexto(disp.fuente.reloj), `${r}.fuente.reloj`, 'es obligatorio')
      exigir(esTextoONulo(disp.fuente.endpoint), `${r}.fuente.endpoint`, 'tiene que ser texto')
    }
    exigir(Array.isArray(disp.metricas) && disp.metricas.length > 0, `${r}.metricas`, 'tiene que traer al menos una')
    if (!Array.isArray(disp.metricas)) return
    disp.metricas.forEach((m, j) => {
      const rm = `${r}.metricas[${j}]`
      if (!esObjeto(m)) { faltas.push(`${rm} tiene que ser un objeto`); return }
      exigir(esTexto(m.nombre), `${rm}.nombre`, 'es obligatorio')
      // Un mismo tag dos veces en un nacimiento: ¿cuál de los dos vale?
      if (esTexto(m.nombre)) { exigir(!vistos.has(m.nombre), `${rm}.nombre`, `repite ${m.nombre}`); vistos.add(m.nombre) }
      for (const k of ['tipo', 'unidad', 'limite']) exigir(esTextoONulo(m[k]), `${rm}.${k}`, 'tiene que ser texto')
      for (const k of ['bajo', 'alto', 'cadenciaS']) exigir(esNumeroONulo(m[k]), `${rm}.${k}`, 'tiene que ser un número')
      exigir(m.clase == null || m.clase === 'continua' || m.clase === 'discreta', `${rm}.clase`, 'es continua o discreta')
      if (m.calibracion != null) {
        exigir(esObjeto(m.calibracion), `${rm}.calibracion`, 'tiene que ser un objeto')
        if (esObjeto(m.calibracion)) for (const k of ['vigenteHasta', 'detalle'])
          exigir(esTextoONulo(m.calibracion[k]), `${rm}.calibracion.${k}`, 'tiene que ser texto')
      }
    })
  })
  return faltas
}

/** Lo que se rechaza queda registrado: un borde que intenta declarar tags de
 *  otro gateway o de otro campo es un hecho de seguridad, no un error que se
 *  tira. Se escribe FUERA de la transacción del nacimiento, que se deshizo. */
function registrarRechazo(d, gatewayId, campoId, motivo, ahora) {
  d.prepare('insert into rechazo (cuando, gateway_id, campo_id, motivo) values (?, ?, ?, ?)')
    .run(ahora, gatewayId ?? null, campoId ?? null, motivo)
}

/** Lo que el borde publica al conectarse. Aquí es donde la cadena se llena
 *  sola: de un certificado de nacimiento salen gateway, fuentes y tags.
 *
 *  Reglas (las mismas que debe cumplir el backend, CONTRATO.md):
 *  - Un gateway pertenece al campo donde se inscribió. Si se presenta con otro
 *    campo, se rechaza (403). En producción el campo y el id del gateway
 *    salen de su certificado, nunca del cuerpo.
 *  - Un tag que ya existe solo lo actualiza su propio gateway. Si otro lo
 *    declara, se rechaza el nacimiento entero (409): antes un borde de
 *    Morichal podía reescribir límite, calibración y fuente de un tag de
 *    custodia de La Ceiba.
 *  - Un re-nacimiento (cada reconexión de Sparkplug) nunca deshace un mapeo
 *    que hizo una persona o una regla: antes lo devolvía a «pendiente».
 *  - Si cambian límite, unidad, cadencia o calibración, lo anterior queda en
 *    `historial_tag` en vez de perderse.
 *  - Todo o nada: si algo falla, no queda nada escrito. */
export function registrarNacimiento(nac, ahora = new Date().toISOString()) {
  const d = base()
  const faltas = validarNacimiento(nac)
  if (faltas.length) throw new ErrorDeRegistro(400, `nacimiento mal formado: ${faltas.join('; ')}`, { faltas })
  const campoId = nac.campo, gw = nac.gateway
  if (!d.prepare('select 1 from campo where id = ?').get(campoId))
    throw new ErrorDeRegistro(404, `campo desconocido: ${campoId}`, { codigo: 'campo-desconocido' })

  const inscrito = d.prepare('select campo_id from gateway where id = ?').get(gw.id)
  if (inscrito && inscrito.campo_id !== campoId) {
    const motivo = `el gateway ${gw.id} está inscrito en ${inscrito.campo_id} y se presentó como de ${campoId}`
    registrarRechazo(d, gw.id, campoId, motivo, ahora)
    throw new ErrorDeRegistro(403, motivo, { codigo: 'gateway-de-otro-campo' })
  }

  // Tags que ya tienen dueño y no es este gateway: se rechaza el nacimiento entero.
  const dueno = d.prepare('select f.gateway_id from tag t join fuente f on f.id = t.fuente_id where t.id = ?')
  const ajenos = nac.dispositivos.flatMap(disp => disp.metricas
    .map(m => ({ tag: m.nombre, de: dueno.get(`${campoId}:${m.nombre}`)?.gateway_id }))
    .filter(x => x.de && x.de !== gw.id))
  if (ajenos.length) {
    const motivo = `el gateway ${gw.id} declaró tags que ya publica otro gateway: ${ajenos.map(x => `${x.tag} (${x.de})`).join(', ')}`
    registrarRechazo(d, gw.id, campoId, motivo, ahora)
    throw new ErrorDeRegistro(409, motivo, { codigo: 'tag-de-otro-gateway', tags: ajenos.map(x => x.tag) })
  }

  return enTransaccion(d, () => {
    d.prepare(`insert into gateway (id, campo_id, modelo, serie, firmware, enlace, buffer_h, primer_visto, ultimo_visto)
               values (?, ?, ?, ?, ?, ?, ?, ?, ?)
               on conflict(id) do update set
                 modelo = excluded.modelo, firmware = excluded.firmware,
                 enlace = excluded.enlace, buffer_h = excluded.buffer_h,
                 ultimo_visto = excluded.ultimo_visto`)
      .run(gw.id, campoId, gw.modelo ?? null, gw.serie ?? null, gw.firmware ?? null,
        gw.enlace ?? null, gw.bufferH ?? null, ahora, ahora)

    const ponerFuente = d.prepare(`insert into fuente (id, gateway_id, protocolo, endpoint, modo, reloj)
      values (?, ?, ?, ?, 'solo-lectura', ?)
      on conflict(id) do update set endpoint = excluded.endpoint, reloj = excluded.reloj`)
    const anterior = d.prepare(`select t.tipo, t.unidad, t.limite_texto, t.limite_bajo, t.limite_alto, t.cadencia_s, t.clase,
        c.vigente_hasta, c.detalle from tag t left join calibracion c on c.tag_id = t.id where t.id = ?`)
    const guardarAnterior = d.prepare(`insert into historial_tag (tag_id, reemplazado, gateway_id, tipo, unidad, limite_texto,
        limite_bajo, limite_alto, cadencia_s, clase, calibracion_hasta, calibracion_detalle)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    // El mapeo que hizo una persona o una regla no lo deshace el borde.
    const ponerTag = d.prepare(`insert into tag (id, campo_id, fuente_id, equipo_id, nombre, tipo, unidad, limite_texto,
        limite_bajo, limite_alto, cadencia_s, clase, origen_mapeo) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        fuente_id = excluded.fuente_id, tipo = excluded.tipo, unidad = excluded.unidad,
        limite_texto = excluded.limite_texto, limite_bajo = excluded.limite_bajo, limite_alto = excluded.limite_alto,
        cadencia_s = excluded.cadencia_s, clase = excluded.clase,
        equipo_id = case when tag.origen_mapeo in ('manual', 'regla') then tag.equipo_id else excluded.equipo_id end,
        origen_mapeo = case when tag.origen_mapeo in ('manual', 'regla') then tag.origen_mapeo else excluded.origen_mapeo end`)
    const ponerCal = d.prepare(`insert into calibracion (tag_id, vigente_hasta, detalle) values (?, ?, ?)
      on conflict(tag_id) do update set vigente_hasta = excluded.vigente_hasta, detalle = excluded.detalle`)
    const quitarCal = d.prepare('delete from calibracion where tag_id = ?')
    const hayEquipo = d.prepare('select id from equipo where codigo = ? and campo_id = ?')
    const origenDe = d.prepare('select origen_mapeo from tag where id = ?')

    let tags = 0, pendientes = 0
    for (const disp of nac.dispositivos) {
      const fuenteId = `${gw.id}:${disp.fuente.protocolo}:${disp.nombre}`
      ponerFuente.run(fuenteId, gw.id, disp.fuente.protocolo, disp.fuente.endpoint ?? null, disp.fuente.reloj)
      // El borde nombra el dispositivo con el activo: si ese equipo existe en
      // el campo, el mapeo queda resuelto sin que nadie lo escriba.
      const equipoId = hayEquipo.get(disp.nombre, campoId)?.id ?? null
      for (const m of disp.metricas) {
        const id = `${campoId}:${m.nombre}`
        const nuevo = { tipo: m.tipo ?? null, unidad: m.unidad ?? null, limite_texto: m.limite ?? null,
          limite_bajo: m.bajo ?? null, limite_alto: m.alto ?? null, cadencia_s: m.cadenciaS ?? null,
          clase: m.clase ?? 'continua', vigente_hasta: m.calibracion?.vigenteHasta ?? null, detalle: m.calibracion?.detalle ?? null }
        const antes = anterior.get(id)
        if (antes && Object.keys(nuevo).some(k => antes[k] !== nuevo[k]))
          guardarAnterior.run(id, ahora, gw.id, antes.tipo, antes.unidad, antes.limite_texto, antes.limite_bajo,
            antes.limite_alto, antes.cadencia_s, antes.clase, antes.vigente_hasta, antes.detalle)
        ponerTag.run(id, campoId, fuenteId, equipoId, m.nombre, nuevo.tipo, nuevo.unidad, nuevo.limite_texto,
          nuevo.limite_bajo, nuevo.limite_alto, nuevo.cadencia_s, nuevo.clase, equipoId ? 'descubierto' : 'pendiente')
        // Lo que el borde ya no declara de calibración tampoco se queda pegado.
        if (m.calibracion) ponerCal.run(id, nuevo.vigente_hasta, nuevo.detalle)
        else quitarCal.run(id)
        tags++
        if (origenDe.get(id).origen_mapeo === 'pendiente') pendientes++
      }
    }
    return { gateway: gw.id, tags, pendientes }
  })
}

const campoExiste = campoId => !!base().prepare('select 1 from campo where id = ?').get(campoId)

export const procedencia = (campoId, tagNombre) =>
  base().prepare('select * from v_procedencia where campo_id = ? and tag = ?').get(campoId, tagNombre)

/** null si el campo no existe: un campo desconocido es un 404, no un
 *  inventario vacío que se pinta como si el campo no tuviera nada. */
export const inventario = campoId => !campoExiste(campoId) ? null : ({
  gateways: base().prepare(`select g.*, (select count(*) from tag t join fuente f on f.id = t.fuente_id
      where f.gateway_id = g.id) as tags
    from gateway g where g.campo_id = ?`).all(campoId),
  // total() da 0.0 y no NULL sin filas: un campo cuyo borde todavía no se
  // presentó tiene 0 por asociar, no «null» (que la pantalla pintaba).
  tags: base().prepare(`select count(*) as total,
      cast(total(case when origen_mapeo = 'pendiente' then 1 else 0 end) as integer) as pendientes
    from tag where campo_id = ?`).get(campoId),
  equipos: base().prepare(`select e.codigo, e.nombre, e.clase, e.criticidad,
      (select group_concat(t.nombre) from tag t where t.equipo_id = e.id) as tags
    from equipo e where e.campo_id = ? order by e.codigo`).all(campoId),
})

export const pendientes = campoId => !campoExiste(campoId) ? null :
  base().prepare(`select t.nombre as tag, t.tipo, t.unidad, t.limite_texto, t.cadencia_s,
      f.protocolo, f.gateway_id
    from tag t join fuente f on f.id = t.fuente_id
    where t.campo_id = ? and t.origen_mapeo = 'pendiente' order by t.nombre`).all(campoId)

/** Asociar un tag a un equipo: el único paso que a veces necesita a una persona. */
export function asociar(campoId, tagNombre, codigoEquipo, origen = 'manual') {
  const d = base()
  if (!esTexto(codigoEquipo)) throw new ErrorDeRegistro(400, 'equipo es obligatorio')
  if (origen !== 'manual' && origen !== 'regla') throw new ErrorDeRegistro(400, 'origen es manual o regla')
  const eq = d.prepare('select id from equipo where campo_id = ? and codigo = ?').get(campoId, codigoEquipo)
  if (!eq) throw new ErrorDeRegistro(404, `equipo desconocido en ${campoId}: ${codigoEquipo}`, { codigo: 'equipo-desconocido' })
  const r = d.prepare('update tag set equipo_id = ?, origen_mapeo = ? where campo_id = ? and nombre = ?')
    .run(eq.id, origen, campoId, tagNombre)
  if (!r.changes) throw new ErrorDeRegistro(404, 'tag no registrado en la cadena de datos', { codigo: 'tag-no-registrado' })
  return { tag: tagNombre, equipo: codigoEquipo, origen }
}
