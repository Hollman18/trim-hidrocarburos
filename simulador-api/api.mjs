/* Simulador de la API de Trim · NO es el backend de producción.
   Implementa la parte del contrato que toca el REGISTRO DE LA CADENA DE DATOS
   (procedencia, inventario, pendientes, asociar un tag, inscripción y
   nacimiento del borde). El libro, la configuración, los usuarios, SAP, los
   mensajes y lo demás todavía se calculan dentro del front; sus salidas de
   referencia están en referencia/ (scripts/referencia.mjs). El backend real
   reemplaza este módulo sin tocar el front. */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { base, vacia, cargarIngenieria, registrarNacimiento, procedencia, inventario, pendientes, asociar, ErrorDeRegistro, RUTA } from './base.mjs'

const aqui = dirname(fileURLToPath(import.meta.url))
const leerTexto = f => readFileSync(join(aqui, f), 'utf8')

/** Arranque: la base se llena con el registro de ingeniería y los
 *  certificados de nacimiento, que es lo que haría el borde al conectarse por
 *  primera vez. La huella cubre el esquema y los dos archivos de semilla: si
 *  alguno cambió (`npm run semilla`), la base se reconstruye y lo dice, en
 *  vez de seguir sirviendo el registro viejo en silencio. */
export function arrancar() {
  const textos = ['esquema.sql', 'datos/registro-ingenieria.json', 'datos/nacimientos.json'].map(leerTexto)
  const huella = createHash('sha256').update(textos.join('\0')).digest('hex')
  base(huella)
  if (!vacia()) return
  // Los nacimientos de la semilla llevan la hora del reloj de los datos, no la
  // de la máquina: así «visto por última vez» no depende de cuándo se arrancó.
  const AHORA_DE_LOS_DATOS = '2026-10-02T19:00:00.000Z'
  cargarIngenieria(JSON.parse(textos[1]), huella)
  for (const n of JSON.parse(textos[2])) registrarNacimiento(n, AHORA_DE_LOS_DATOS)
  console.log(`[simulador] registro cargado desde la semilla en ${RUTA}`)
}

const json = (res, codigo, cuerpo) => {
  res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(cuerpo))
}

/** El error con la forma única del contrato: `{ error: { codigo, mensaje, … } }`.
 *  El código es lo que el cliente compara; el mensaje, lo que se lee; lo
 *  demás (las faltas de un nacimiento, los tags ajenos) va al lado. */
const fallo = (res, estado, codigo, mensaje, extra = {}) => json(res, estado, { error: { ...extra, codigo, mensaje } })
/** El código de un error del registro: el que trae, o uno por su HTTP. */
const CODIGO_HTTP = { 400: 'peticion-invalida', 403: 'sin-permiso', 404: 'no-encontrado', 409: 'conflicto', 413: 'cuerpo-muy-grande' }

/** El bloque técnico lo decide el servidor, no la pantalla. En producción la
 *  capacidad viene del token; aquí llega en una cabecera para poder probarlo. */
const puede = (req, capacidad) =>
  String(req.headers['x-capacidades'] ?? '').split(',').map(s => s.trim()).includes(capacidad)

/** Arma la respuesta de procedencia desde la vista. El servidor devuelve
 *  HECHOS; las palabras en español las pone el front. */
function armarProcedencia(fila, conTecnico) {
  const r = {
    instrumento: {
      tag: fila.tag, tipo: fila.tipo, unidad: fila.unidad,
      equipo: fila.equipo_codigo, equipoNombre: fila.equipo,
      claseEquipo: fila.clase_equipo, criticidad: fila.criticidad,
      limite: fila.limite_texto
        ? { texto: fila.limite_texto, bajo: fila.limite_bajo, alto: fila.limite_alto }
        : null,
      mapeo: fila.origen_mapeo,
    },
    lectura: {
      clase: fila.clase_tag, cadenciaS: fila.cadencia_s,
      protocolo: fila.protocolo, modo: fila.modo, reloj: fila.reloj,
    },
    calculo: fila.formula_id
      ? { id: fila.formula_id, expresion: fila.formula, version: fila.formula_version, ventanaMin: fila.ventana_min }
      : null,
    custodia: {
      editable: false,
      calibracion: fila.calibracion_hasta || fila.calibracion_detalle
        ? { vigenteHasta: fila.calibracion_hasta, detalle: fila.calibracion_detalle }
        : null,
    },
  }
  if (conTecnico) r.tecnico = {
    gateway: { id: fila.gateway_id, modelo: fila.gateway_modelo, serie: fila.gateway_serie, firmware: fila.gateway_firmware },
    enlace: fila.enlace, bufferH: fila.buffer_h, ultimoVisto: fila.ultimo_visto,
    endpoint: fila.endpoint, transporte: 'mqtt-sparkplug-b/tls',
    almacenamiento: 'postgresql+timescaledb · tabla lectura particionada por mes',
  }
  return r
}

/** El cuerpo como objeto JSON. Un JSON roto, un cuerpo que no es objeto o
 *  uno de más de 2 MB son errores de quien llama (400/413), no del servidor. */
const LIMITE_CUERPO = 2e6
const cuerpo = req => new Promise((ok, falla) => {
  let t = '', pasado = false
  req.on('data', c => {
    if (pasado) return
    t += c
    if (t.length > LIMITE_CUERPO) { pasado = true; falla(new ErrorDeRegistro(413, 'el cuerpo pasa de 2 MB')) }
  })
  req.on('error', falla)
  req.on('end', () => {
    if (pasado) return
    let v
    try { v = t ? JSON.parse(t) : {} } catch { falla(new ErrorDeRegistro(400, 'el cuerpo no es JSON válido')); return }
    if (typeof v !== 'object' || v === null || Array.isArray(v)) falla(new ErrorDeRegistro(400, 'el cuerpo tiene que ser un objeto JSON'))
    else ok(v)
  })
})

/** Un segmento de la ruta decodificado. Un % mal formado («/%E0%A4%A»)
 *  es un 400, no una excepción que tumba el proceso. */
const segmento = s => {
  try { return decodeURIComponent(s) } catch { throw new ErrorDeRegistro(400, 'la ruta trae un código % mal formado') }
}

/** Devuelve true si atendió la petición. Nunca rechaza: cualquier error se
 *  responde aquí, en un solo punto. Antes un JSON roto o un % mal formado
 *  terminaban el proceso de Node, y con él el servidor de Vite y el front. */
export async function manejar(req, res) {
  let url
  try { url = new URL(req.url, 'http://local') } catch { fallo(res, 400, 'url-invalida', 'URL inválida'); return true }
  if (!url.pathname.startsWith('/api/')) return false
  try {
    await atender(req, res, url)
  } catch (e) {
    if (e instanceof ErrorDeRegistro) {
      const { codigo, ...extra } = e.extra
      fallo(res, e.estado, codigo ?? CODIGO_HTTP[e.estado] ?? `http-${e.estado}`, e.message, extra)
    }
    else {
      // Lo inesperado se registra con método y ruta, y el cliente recibe un 500
      // sin el mensaje interno (que puede traer SQL o rutas del servidor).
      console.error(`[simulador] ${req.method} ${url.pathname}:`, e)
      fallo(res, 500, 'interno', 'error interno del simulador')
    }
  }
  return true
}

async function atender(req, res, url) {
  const p = url.pathname.split('/').filter(Boolean).map(segmento)

  if (req.method === 'GET' && url.pathname === '/api/salud') {
    json(res, 200, { ok: true, base: 'sqlite' }); return
  }

  // /api/campos/:campo/tags/:tag/procedencia
  if (req.method === 'GET' && p.length === 6 && p[1] === 'campos' && p[3] === 'tags' && p[5] === 'procedencia') {
    const fila = procedencia(p[2], p[4])
    // El código distingue «el tag no está» de «la ruta no existe»: el front solo afirma lo primero con él.
    if (!fila) { fallo(res, 404, 'tag-no-registrado', 'tag no registrado en la cadena de datos'); return }
    json(res, 200, armarProcedencia(fila, puede(req, 'conector:configurar')))
    return
  }

  // /api/campos/:campo/inventario
  if (req.method === 'GET' && p.length === 4 && p[1] === 'campos' && p[3] === 'inventario') {
    const inv = inventario(p[2])
    if (!inv) { fallo(res, 404, 'campo-desconocido', `campo desconocido: ${p[2]}`); return }
    json(res, 200, inv); return
  }

  // /api/campos/:campo/tags/pendientes
  if (req.method === 'GET' && p.length === 5 && p[1] === 'campos' && p[3] === 'tags' && p[4] === 'pendientes') {
    const pend = pendientes(p[2])
    if (!pend) { fallo(res, 404, 'campo-desconocido', `campo desconocido: ${p[2]}`); return }
    json(res, 200, pend); return
  }

  // /api/campos/:campo/tags/:tag/equipo
  if (req.method === 'POST' && p.length === 6 && p[1] === 'campos' && p[3] === 'tags' && p[5] === 'equipo') {
    if (!puede(req, 'conector:configurar')) { fallo(res, 403, 'sin-capacidad', 'sin la capacidad conector:configurar'); return }
    const b = await cuerpo(req)
    json(res, 200, asociar(p[2], p[4], b.equipo, b.origen ?? 'manual')); return
  }

  // Inscripción de un borde nuevo. En producción esto emite un certificado
  // atado al campo; aquí solo entrega el código de un solo uso que se lleva al campo.
  if (req.method === 'POST' && url.pathname === '/api/inscripcion') {
    if (!puede(req, 'conector:configurar')) { fallo(res, 403, 'sin-capacidad', 'sin la capacidad conector:configurar'); return }
    const b = await cuerpo(req)
    if (typeof b.campo !== 'string' || !inventario(b.campo)) throw new ErrorDeRegistro(404, `campo desconocido: ${b.campo}`, { codigo: 'campo-desconocido' })
    const codigo = [...crypto.getRandomValues(new Uint8Array(10))]
      .map(n => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[n % 31]).join('')
    json(res, 200, {
      campo: b.campo, codigo: codigo.replace(/(.{5})/g, '$1-').replace(/-$/, ''),
      expiraEn: '24 h', instruccion: 'Se pega en el gateway; al primer contacto se canjea por su certificado.',
    })
    return
  }

  // El borde se presenta. Esto es lo que llena la cadena sola.
  if (req.method === 'POST' && url.pathname === '/api/ingesta/nacimiento') {
    json(res, 200, registrarNacimiento(await cuerpo(req))); return
  }

  fallo(res, 404, 'ruta-no-encontrada', 'ruta no encontrada')
}
