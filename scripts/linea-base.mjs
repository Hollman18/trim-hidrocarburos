/* La línea base del contrato: la versión 1 (`cde8214`, «front para entregar al
 * backend», 7-oct-2026), la que tomó el desarrollador del backend.
 *
 * «Al lado, nunca encima» (docs/experiencia-v3/PROMPT-SIMPLIFICACION.md §3.1):
 * lo que existe en el contrato no se renombra, no se borra y no cambia de
 * significado; lo nuevo se agrega al lado y lo que sale se marca RETIRADO. Esta
 * prueba lo asegura: todo lo de v1 sigue igual o está en el registro
 * (docs/backend/cambios-contrato.json) como CAMBIADO o RETIRADO, con su fecha,
 * su motivo y su reemplazo. Si alguien rompe el contrato sin registrarlo, falla
 * y dice qué rompió (docs/backend/CAMBIOS-CONTRATO.md §8).
 *
 *   node scripts/linea-base.mjs generar --desde=cde8214
 *       escribe la foto de v1 (docs/backend/linea-base/v1.json) y la referencia
 *       de v1 tal cual (docs/backend/linea-base/v1/referencia/), leídas con
 *       `git show`. Se corre UNA vez: la prueba no depende del historial de git.
 *
 * La comprobación (`comprobarLineaBase`) la corre scripts/verificar-contrato.mjs
 * («La línea base v1»), con sus mutaciones: quitar una clave, cambiar un texto y
 * borrar una ruta tienen que FALLAR sin su entrada en el registro, y pasar con ella.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const RAIZ = fileURLToPath(new URL('..', import.meta.url))
export const DIR_LINEA = join(RAIZ, 'docs/backend/linea-base')
export const ARCHIVO_V1 = join(DIR_LINEA, 'v1.json')
export const DIR_REFERENCIA_V1 = join(DIR_LINEA, 'v1/referencia')
export const ARCHIVO_REGISTRO = join(RAIZ, 'docs/backend/cambios-contrato.json')

/* ───────────────────────────── lectores ───────────────────────────── */

/** Una ruta con sus parámetros como `:_`: `/usuarios/:id` y `/usuarios/:usuario` son la misma. */
export const clave = (metodo, ruta) => `${metodo} ${ruta.replace(/:\w+/g, ':_')}`

/** Los GET de contrato.ts: `export const X = get<…>()('/ruta', …)`. */
export function rutasDeContratoTs(texto) {
  return [...texto.matchAll(/export const (\w+) = get<.*?>\(\)\(\s*'([^']+)'/g)].map(m => ({ metodo: 'GET', ruta: m[2], constante: m[1], origen: 'contrato.ts' }))
}
/** Las escrituras de escrituras.ts: `escribir(q, 'POST', '/ruta…'` (un `${encodeURIComponent(x.y)}` es `:y`). */
export function rutasDeEscrituras(texto) {
  const out = new Map()
  for (const m of texto.matchAll(/'(POST|PATCH|PUT|DELETE)', *[`']([^`']+)[`']/g)) {
    const ruta = m[2].replace(/\$\{encodeURIComponent\(([\w.]+)\)\}/g, (_, x) => `:${x.split('.').at(-1)}`)
    out.set(clave(m[1], ruta), { metodo: m[1], ruta, origen: 'escrituras.ts' })
  }
  return [...out.values()]
}
/** Las rutas que nombra CONTRATO.md: «GET /api/…», sin la consulta. `/api/vistas/…` (el comodín) no cuenta. */
export function rutasDeContratoMd(texto) {
  const out = new Map()
  for (const m of texto.matchAll(/\b(GET|POST|PATCH|PUT|DELETE) `?\/api(\/[^\s`|),?…]*)/g)) {
    const ruta = m[2].replace(/[.:;]+$/, '')
    if (!ruta || ruta === '/vistas/' || ruta.endsWith('/')) continue
    out.set(clave(m[1], ruta), { metodo: m[1], ruta, origen: 'CONTRATO.md' })
  }
  return [...out.values()]
}

/** La tabla «Error único» de CONTRATO.md: cada código con su HTTP. */
export function codigosDeContratoMd(texto) {
  const i = texto.indexOf('### Error único')
  if (i < 0) return []
  const fin = texto.indexOf('\n### ', i + 5)
  const out = []
  for (const linea of texto.slice(i, fin < 0 ? undefined : fin).split('\n')) {
    const m = linea.match(/^\| *(\d{3}|5xx) *\|[^|]*\|(.*)\|\s*$/)
    if (!m) continue
    for (const c of m[2].matchAll(/`([a-z][a-z0-9-]*)`/g)) out.push({ http: m[1], codigo: c[1] })
  }
  return out
}

/** Las capacidades (`export type Capacidad = 'a' | 'b'…`) y las de cada rol (`id: 'x' … puede: con(…)`). */
export function capacidadesDe(tiposTs, rolesTs) {
  const tipo = tiposTs.match(/export type Capacidad =([\s\S]*?)\n\n/)?.[1] ?? ''
  const lista = [...tipo.matchAll(/'([a-z]+:[a-z]+)'/g)].map(m => m[1])
  const porRol = {}
  for (const m of rolesTs.matchAll(/\{ id: '(\w+)'[\s\S]*?puede: con\(([^)]*)\)/g)) porRol[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1])
  return { lista, porRol }
}

/** Las tablas y la vista `v_procedencia` del SQL de la cadena (simulador-api/esquema.sql). */
export function sqlDe(texto) {
  const tablas = {}
  for (const m of texto.matchAll(/create table if not exists (\w+) \(([\s\S]*?)\n\);/g)) {
    tablas[m[1]] = m[2].split('\n').map(l => l.replace(/--.*$/, '').trim()).filter(l => l && !/^(unique|primary|foreign|check|constraint)\b/i.test(l))
      .map(l => { const [col, tipo] = l.split(/\s+/); return { columna: col, tipo: tipo.replace(/,$/, '') } })
  }
  const v = texto.match(/create view if not exists v_procedencia as\s+select([\s\S]*?)\nfrom /)?.[1] ?? ''
  return { tablas, v_procedencia: [...v.matchAll(/ as (\w+)/g)].map(m => m[1]) }
}

/** Las interfaces exportadas de un archivo de TypeScript: sus campos de primer nivel y si son opcionales. */
export function interfacesDe(src) {
  const out = {}
  const re = /export interface (\w+)(?:<[^>{]*>)?(?: extends [^{]+)?\s*\{/g
  let m
  while ((m = re.exec(src))) {
    let i = re.lastIndex, d = 1, cuerpo = ''
    while (d > 0 && i < src.length) { const c = src[i]; if (c === '{') d++; else if (c === '}') d--; if (d > 0) cuerpo += c; i++ }
    cuerpo = cuerpo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    let hondo = 0, plano = ''
    for (const c of cuerpo) { if ('{(['.includes(c)) hondo++; if (hondo === 0) plano += c; if ('})]'.includes(c)) hondo-- }
    const campos = {}
    for (const x of plano.matchAll(/(?:^|[\n;])\s*(?:readonly\s+)?(\w+)(\??):/g)) campos[x[1]] = { opcional: x[2] === '?' }
    out[m[1]] = campos
  }
  return out
}

/* ───────── la forma y los textos de la referencia, por endpoint ───────── */

const CAMPOS_DEMO = new Set(['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza'])
/** Una clave de diccionario (un id, un campo, un día) no es parte de la forma: se escribe `{k}`. */
const normal = (ruta, k) => (/^\$\.refs\.[a-zA-Z]+$/.test(ruta) || /[/@#:]/.test(k) || /^[A-Z]{1,4}-?\d/.test(k) || /^\d{4}-\d{2}/.test(k) || CAMPOS_DEMO.has(k) ? '{k}' : k)
const tipoJson = x => (x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x)
/** Un texto que arma el motor, sin lo que es dato: los ids de equipo y los números. */
export const plantilla = s => s.replace(/\b[A-Z]{1,4}-\d+[A-Z]?\b/g, 'ID').replace(/\d[\d.,]*/g, '#')
const esFrase = s => /[a-záéíóúñ]{3,} [a-záéíóúñ]{2,}/i.test(s) && !/^\d{4}-\d{2}-\d{2}T/.test(s)

function recorrer(x, ruta, formas, textos) {
  const t = tipoJson(x)
  ;(formas[ruta] ??= new Set()).add(t)
  if (t === 'string' && esFrase(x)) (textos[ruta] ??= new Set()).add(plantilla(x))
  if (t === 'array') for (const y of x) recorrer(y, `${ruta}[]`, formas, textos)
  else if (t === 'object') for (const [k, y] of Object.entries(x)) recorrer(y, `${ruta}.${normal(ruta, k)}`, formas, textos)
}

/** Por endpoint (sin la consulta): cada ruta de clave con sus tipos JSON, y los textos del motor con su plantilla. */
export function formasDeReferencia(dir) {
  const formas = {}, textos = {}
  for (const f of readdirSync(dir, { recursive: true })) {
    if (!String(f).endsWith('.json') || /^(insumos|escrituras)\b/.test(f) || f === 'indice.json') continue
    const c = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    if (!c.endpoint) continue
    const ep = c.endpoint.split('?')[0].replace(/^\/api/, '')
    recorrer(c.esperado, '$', (formas[ep] ??= {}), (textos[ep] ??= {}))
  }
  const lista = o => Object.fromEntries(Object.entries(o).map(([ep, rs]) => [ep, Object.fromEntries(Object.entries(rs).map(([r, s]) => [r, [...s].sort()]))]))
  return { formas: lista(formas), textos: lista(textos) }
}

/* ───────────────────────────── generar ───────────────────────────── */

function generar(desde) {
  const git = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 28 })
  const leer = f => git('show', `${desde}:${f}`)
  // La referencia de v1, tal cual (C18: los datos del demo cambiaron después).
  rmSync(join(DIR_LINEA, 'v1'), { recursive: true, force: true })
  mkdirSync(join(DIR_LINEA, 'v1'), { recursive: true })
  execFileSync('sh', ['-c', `git archive ${desde} referencia | tar -x -C "${join(DIR_LINEA, 'v1')}"`], { cwd: RAIZ })
  const contratoTs = leer('src/shared/api/contrato.ts'), escriturasTs = leer('src/shared/api/escrituras.ts'), contratoMd = leer('CONTRATO.md')
  const archivos = git('ls-tree', '-r', '--name-only', desde, 'src/entities', 'src/shared/api').split('\n').filter(f => f.endsWith('.ts'))
  // Los tipos que viajan: los que nombran contrato.ts o escrituras.ts, con su archivo (`Respuesta` es
  // de cable.ts y de pozos.ts: dos tipos distintos).
  const tipos = {}
  for (const f of archivos) for (const [n, campos] of Object.entries(interfacesDe(leer(f)))) tipos[`${f.replace(/^src\//, '')}:${n}`] = campos
  const viajan = Object.keys(tipos).filter(k => new RegExp(`\\b${k.split(':')[1]}\\b`).test(contratoTs + escriturasTs)).sort()
  const { formas, textos } = formasDeReferencia(DIR_REFERENCIA_V1)
  const v1 = {
    generado: `node scripts/linea-base.mjs generar --desde=${desde}`,
    commit: git('rev-parse', '--short', desde).trim(),
    fecha: git('show', '-s', '--format=%cs', desde).trim(),
    titulo: git('show', '-s', '--format=%s', desde).trim(),
    rutas: [...rutasDeContratoTs(contratoTs), ...rutasDeEscrituras(escriturasTs), ...rutasDeContratoMd(contratoMd)],
    formas, textos,
    campos: Object.fromEntries(viajan.map(n => [n, tipos[n]])),
    codigos: codigosDeContratoMd(contratoMd),
    capacidades: capacidadesDe(leer('src/entities/tipos.ts'), leer('src/entities/roles.ts')),
    sql: sqlDe(leer('simulador-api/esquema.sql')),
  }
  writeFileSync(ARCHIVO_V1, JSON.stringify(v1, null, 1) + '\n')
  const n = o => Object.values(o).reduce((a, x) => a + Object.keys(x).length, 0)
  console.log(`${ARCHIVO_V1}: ${v1.rutas.length} rutas, ${n(formas)} claves de forma en ${Object.keys(formas).length} endpoints, ${Object.values(textos).reduce((a, x) => a + Object.values(x).flat().length, 0)} textos, ${viajan.length} tipos que viajan, ${v1.codigos.length} códigos, ${v1.capacidades.lista.length} capacidades, ${Object.keys(v1.sql.tablas).length} tablas`)
}

/* ───────────────────────────── lo de hoy ───────────────────────────── */

const leerHoy = f => readFileSync(join(RAIZ, f), 'utf8')
const archivosDe = (dir, ext) => readdirSync(join(RAIZ, dir), { recursive: true }).map(String).filter(f => ext.test(f)).map(f => `${dir}/${f}`)

/** Lo que hay hoy, leído de los archivos (las capacidades y los roles visibles los da quien llama, del motor). */
export function estadoDeHoy({ visibles, capacidades }) {
  const contratoTs = leerHoy('src/shared/api/contrato.ts'), escriturasTs = leerHoy('src/shared/api/escrituras.ts'), contratoMd = leerHoy('CONTRATO.md')
  const tipos = {}
  for (const f of [...archivosDe('src/entities', /\.ts$/), ...archivosDe('src/shared/api', /\.ts$/)])
    for (const [n, campos] of Object.entries(interfacesDe(leerHoy(f)))) tipos[`${f.replace(/^src\//, '')}:${n}`] = campos
  const { formas, textos } = formasDeReferencia(join(RAIZ, 'referencia'))
  const conWhatsapp = dir => archivosDe(dir, /\.(tsx?|mjs|js|css|html)$/).flatMap(f => leerHoy(f).split('\n').map((l, i) => ({ f, i: i + 1, l })).filter(x => /whatsapp/i.test(x.l)))
  return {
    rutas: [...rutasDeContratoTs(contratoTs), ...rutasDeEscrituras(escriturasTs), ...rutasDeContratoMd(contratoMd)],
    formas, textos, tipos,
    codigos: codigosDeContratoMd(contratoMd),
    capacidades, visibles,
    sql: sqlDe(leerHoy('simulador-api/esquema.sql')),
    v1Cadena: existsSync(join(RAIZ, 'docs/backend/sql/v1-cadena.sql')) ? leerHoy('docs/backend/sql/v1-cadena.sql') : '',
    contratoMd,
    sqlNuevo: Object.fromEntries(['esquema.sql', 'ejemplos.sql', 'pruebas.sql', 'tablas.json'].map(f => [f, leerHoy(`docs/backend/sql/${f}`)])),
    retiradasTs: contratoTs,
    src: conWhatsapp('src'), e2e: conWhatsapp('e2e'),
    srcTexto: archivosDe('src', /\.tsx?$/).map(f => leerHoy(f)).join('\n'),
  }
}

/* ───────────────────────────── comprobar ───────────────────────────── */

const TIPOS = new Set(['AGREGADO', 'CAMBIADO', 'RETIRADO', 'VERSION'])
/** Una línea de e2e que nombra el canal solo para asegurar que NO vuelve (una guarda de ausencia). */
const esGuarda = ({ f, l }) => /!t\.includes\(['"]WhatsApp|toHaveCount\(0\)/.test(l) || (f === 'e2e/auditoria/rutas.ts' && /\bno: \[|^\s+'[^']*',/.test(l))
/** Una línea del SQL nuevo marcada (la regla de docs/backend/sql: cada línea con el canal dice RETIRADO). */
const marcada = l => /RETIRADO/.test(l)

/** Las comprobaciones de CAMBIOS-CONTRATO.md §8.2. Devuelve las fallas: `{ n, texto }`. */
export function comprobarLineaBase(v1, registro, hoy) {
  const fallas = [], falla = (n, texto) => fallas.push({ n, texto })
  const entradas = registro.entradas ?? []
  const de = (objeto, k, tipos = ['CAMBIADO', 'RETIRADO', 'VERSION']) => entradas.find(e => e.objeto === objeto && e.clave === k && tipos.includes(e.tipo))

  // 1. Cada ruta de v1 existe hoy en su mismo origen, o está RETIRADA o en VERSIÓN nueva (que exista).
  const hoyPor = new Map()
  for (const r of hoy.rutas) (hoyPor.get(r.origen) ?? hoyPor.set(r.origen, new Set()).get(r.origen)).add(clave(r.metodo, r.ruta))
  const todasHoy = new Set(hoy.rutas.map(r => clave(r.metodo, r.ruta)))
  for (const r of v1.rutas) {
    const k = clave(r.metodo, r.ruta)
    if (hoyPor.get(r.origen)?.has(k)) continue
    const e = de('ruta', `${r.metodo} ${r.ruta}`, ['RETIRADO', 'VERSION'])
    if (!e) falla(1, `${r.metodo} ${r.ruta} (${r.origen}${r.constante ? `, ${r.constante}` : ''}) ya no está y no hay entrada RETIRADO ni VERSION`)
    else if (e.tipo === 'VERSION' && !todasHoy.has(clave(r.metodo, e.reemplazo))) falla(1, `${r.metodo} ${r.ruta}: la versión nueva ${e.reemplazo} no existe`)
  }

  // 2. La forma: cada clave de v1 existe hoy con su tipo, en algún caso de su endpoint.
  for (const [ep, rutas] of Object.entries(v1.formas)) for (const [ruta, tipos] of Object.entries(rutas)) {
    const h = hoy.formas[ep]?.[ruta]
    const k = `${ep} ${ruta}`
    if (!h) { if (!de('campo', k)) falla(2, `${k} ya no viene en la referencia y no está registrado`) }
    else for (const t of tipos) if (!h.includes(t) && !de('campo', k)) falla(2, `${k} era ${t} y hoy es ${h.join(' | ')}, sin registro`)
  }

  // 3. Los textos del motor que la referencia exige: cada plantilla de v1 sigue, o su cambio está registrado.
  for (const [ep, rutas] of Object.entries(v1.textos)) for (const [ruta, ps] of Object.entries(rutas)) for (const p of ps) {
    if (hoy.textos[ep]?.[ruta]?.includes(p)) continue
    const k = `${ep} ${ruta} «${p}»`
    if (!de('texto', k, ['CAMBIADO', 'RETIRADO'])) falla(3, `el texto ${k} cambió sin entrada CAMBIADO`)
  }

  // 3b. Los campos de los tipos que viajan: cada uno sigue; uno opcional en v1 no se vuelve obligatorio.
  for (const [t, campos] of Object.entries(v1.campos)) {
    // El mismo archivo; si el tipo se mudó, el único de ese nombre.
    const mismos = Object.keys(hoy.tipos).filter(k => k.split(':')[1] === t.split(':')[1])
    const h = hoy.tipos[t] ?? (mismos.length === 1 ? hoy.tipos[mismos[0]] : undefined)
    if (!h) { if (!de('tipo', t)) falla(3, `el tipo ${t} ya no existe y no está registrado`); continue }
    for (const [c, x] of Object.entries(campos)) {
      if (!h[c]) { if (!de('campo', `${t}.${c}`)) falla(3, `${t}.${c} ya no existe y no está registrado`) }
      else if (x.opcional && !h[c].opcional && !de('campo', `${t}.${c}`)) falla(3, `${t}.${c} era opcional y hoy es obligatorio, sin registro`)
    }
  }

  // 5. Los códigos de error de v1 siguen en la tabla «Error único» con su HTTP.
  const codHoy = new Set(hoy.codigos.map(c => `${c.http} ${c.codigo}`))
  for (const c of v1.codigos) if (!codHoy.has(`${c.http} ${c.codigo}`) && !de('codigo', `${c.http} ${c.codigo}`)) falla(5, `el código ${c.codigo} (${c.http}) ya no está en «Error único» de CONTRATO.md, sin registro`)

  // 6. Las capacidades de v1 siguen, y ningún rol visible hoy pierde una de las que tenía.
  for (const k of v1.capacidades.lista) if (!hoy.capacidades.lista.includes(k) && !de('capacidad', k)) falla(6, `la capacidad ${k} ya no existe, sin registro`)
  for (const [rol, ks] of Object.entries(v1.capacidades.porRol)) {
    if (!hoy.visibles.includes(rol)) continue
    for (const k of ks) if (!(hoy.capacidades.porRol[rol] ?? []).includes(k) && !de('capacidad', `${rol}:${k}`)) falla(6, `${rol} perdió ${k}, sin registro`)
  }

  // 7. El SQL de v1 rige: cada tabla y columna sigue en simulador-api/esquema.sql con su tipo, y el
  //    esquema `v1` de docs/backend/sql/v1-cadena.sql las da desde el modelo nuevo (el orden exacto
  //    lo prueba validar.sh en PostgreSQL: herramientas/comprobar-v1.mjs).
  for (const [t, cols] of Object.entries(v1.sql.tablas)) {
    const h = hoy.sql.tablas[t]
    if (!h) { if (!de('sql', t)) falla(7, `la tabla ${t} de v1 ya no está en simulador-api/esquema.sql`); continue }
    for (const c of cols) {
      const x = h.find(y => y.columna === c.columna)
      if (!x || x.tipo !== c.tipo) if (!de('sql', `${t}.${c.columna}`)) falla(7, `${t}.${c.columna} (${c.tipo}) cambió en simulador-api/esquema.sql: ${x ? x.tipo : 'no está'}`)
    }
    const dadas = columnasDeVista(hoy.v1Cadena, t)
    if (!dadas) falla(7, `v1-cadena.sql no tiene la vista v1.${t}`)
    else if (dadas.join() !== cols.map(c => c.columna).join()) falla(7, `v1.${t} da ${dadas.join(', ')} y v1 tiene ${cols.map(c => c.columna).join(', ')}`)
  }
  for (const c of v1.sql.v_procedencia) if (!hoy.sql.v_procedencia.includes(c)) falla(7, `v_procedencia de simulador-api/esquema.sql perdió ${c}`)
  const vp = columnasDeVista(hoy.v1Cadena, 'v_procedencia')
  if (vp?.join() !== v1.sql.v_procedencia.join()) falla(7, `v1.v_procedencia no da las ${v1.sql.v_procedencia.length} columnas de v1 en su orden (da ${vp?.length ?? 0})`)

  // 8. Lo RETIRADO sigue escrito, con su marca, y el front no lo usa.
  const lineasMd = hoy.contratoMd.split('\n')
  for (const e of entradas.filter(x => x.tipo === 'RETIRADO')) {
    if (e.objeto === 'ruta') {
      const [metodo, ruta] = e.clave.split(' ')
      const rx = new RegExp(`${metodo} \`?/api${ruta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
      const lineas = lineasMd.filter(l => rx.test(l))
      if (!lineas.length) falla(8, `${e.clave} se borró de CONTRATO.md: lo RETIRADO se queda escrito`)
      else if (!lineas.some(l => /RETIRADO/.test(l)) && !seccionRetirada(lineasMd, rx)) falla(8, `${e.clave} está en CONTRATO.md sin la marca «RETIRADO (fecha)»`)
      const r = v1.rutas.find(x => `${x.metodo} ${x.ruta}` === e.clave && x.constante)
      if (r && new RegExp(`\\b${r.constante}\\b`).test(hoy.srcTexto)) falla(8, `${e.clave}: el front todavía usa ${r.constante}`)
    }
    // Lo que v1 declaraba en contrato.ts o en los tipos que viajan queda en `RETIRADAS` de contrato.ts, con su id.
    if (e.enContratoTs && !new RegExp(`id: '${e.id}', clave: '${e.enContratoTs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).test(hoy.retiradasTs)) falla(8, `${e.enContratoTs} (${e.id}) no está en RETIRADAS de contrato.ts`)
  }

  // 9. El canal se fue del producto (§6.5): 0 en src; en e2e solo guardas de que no vuelve; en
  //    CONTRATO.md y en el SQL nuevo, solo junto a la marca RETIRADO.
  for (const x of hoy.src) falla(9, `src: ${x.f}:${x.i} nombra el canal retirado`)
  for (const x of hoy.e2e.filter(y => !esGuarda(y))) falla(9, `e2e: ${x.f}:${x.i} nombra el canal retirado y no es una guarda de ausencia`)
  lineasMd.forEach((l, i) => { if (/whatsapp/i.test(l) && !/RETIRADO/.test(l) && !seccionRetirada(lineasMd, null, i)) falla(9, `CONTRATO.md:${i + 1} nombra el canal sin la marca RETIRADO`) })
  for (const [f, t] of Object.entries(hoy.sqlNuevo)) t.split('\n').forEach((l, i) => { if (/whatsapp/i.test(l) && !marcada(l)) falla(9, `docs/backend/sql/${f}:${i + 1} nombra el canal sin la marca RETIRADO`) })

  // 10. El registro está sano.
  const vistas = new Set()
  for (const e of entradas) {
    const k = `${e.objeto} ${e.clave}`
    if (!TIPOS.has(e.tipo)) falla(10, `${e.id}: tipo «${e.tipo}» no es AGREGADO, CAMBIADO, RETIRADO ni VERSION`)
    if (!e.id || !e.objeto || !e.clave || !/^\d{4}-\d{2}-\d{2}$/.test(e.fecha ?? '') || !e.commit || !e.motivo || (e.tipo !== 'AGREGADO' && !e.reemplazo))
      falla(10, `${e.id ?? '?'} (${k}): le falta id, objeto, clave, fecha, commit, motivo o reemplazo`)
    if (vistas.has(k)) falla(10, `dos entradas con la misma clave: ${k}`)
    vistas.add(k)
  }
  return fallas
}

/** Las columnas que da una vista del esquema `v1`, en orden: el alias (`… as x`) o el último nombre (`p.x`). */
export function columnasDeVista(sql, nombre) {
  const m = sql.match(new RegExp(`create or replace view v1\\.${nombre} as\\s+select\\s+([\\s\\S]*?)(?:\\n(?:from|where)\\b|;)`))
  if (!m) return null
  const items = [], partes = [...m[1]]
  let hondo = 0, actual = ''
  for (const c of partes) {
    if (c === '(') hondo++
    if (c === ')') hondo--
    if (c === ',' && hondo === 0) { items.push(actual); actual = '' } else actual += c
  }
  items.push(actual)
  return items.map(x => x.trim()).filter(Boolean).map(x => x.match(/\bas (\w+)$/)?.[1] ?? x.match(/(\w+)$/)?.[1])
}

/** ¿La línea (o la que nombra `rx`) está dentro de una sección de CONTRATO.md cuyo título dice RETIRADO? */
function seccionRetirada(lineas, rx, i0) {
  const idxs = i0 !== undefined ? [i0] : lineas.flatMap((l, i) => (rx.test(l) ? [i] : []))
  return idxs.length > 0 && idxs.every(i => {
    for (let j = i; j >= 0; j--) if (/^#{1,6} /.test(lineas[j])) return /RETIRADO/.test(lineas[j])
    return false
  })
}

/* ───────────────────────────── línea de órdenes ───────────────────────────── */

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [modo, ...resto] = process.argv.slice(2)
  const desde = resto.find(a => a.startsWith('--desde='))?.slice('--desde='.length)
  if (modo !== 'generar' || !desde) {
    console.error('uso: node scripts/linea-base.mjs generar --desde=cde8214   (la comprobación la corre verificar-contrato.mjs)')
    process.exit(2)
  }
  generar(desde)
}
