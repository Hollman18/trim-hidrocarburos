/* Verificación de la conexión según el estado de la planta (Fase 3 de
 * docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md; docs/backend/04-cadena-de-datos.md §4.2).
 *
 * Lo que asegura:
 *   1. Las vías de conexión directa tienen nombre en la cadena del dato: relés por IEC 61850
 *      o DNP3, analizadores de red y controladores de generador o compresor por Modbus RTU,
 *      UPS por SNMP y la entrada digital «hay tensión» del gateway. Cada una dice de dónde
 *      viene y que es solo lectura.
 *   2. El Palmar es el campo del demo SIN historiador: todo lo lee el gateway directo de los
 *      equipos. Ningún tag suyo dice «PI»; los demás campos siguen mezclando.
 *   3. De punta a punta, con el simulador de la API: cada tag de El Palmar nace en la semilla,
 *      su procedencia dice el protocolo directo y «solo lectura». La UPS de la sala de control
 *      (SNMP) es un equipo del catálogo desde la Fase 4 (familia `ups`): su tag nace asociado.
 *
 *   node scripts/verificar-conexion.mjs
 */
import { createServer } from 'vite'
import { createServer as servidorHttp } from 'node:http'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
const INS = await v.ssrLoadModule('/src/entities/insumos.ts')
INS.instalarInsumos((await v.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
const CA = await v.ssrLoadModule('/src/entities/cadena.ts')
const EQ = await v.ssrLoadModule('/src/entities/equipos.ts')
const PT = await v.ssrLoadModule('/src/entities/planta.ts')

let bien = 0, mal = 0
const comprobar = (ok, texto) => { if (ok) { bien++; console.log(`  ✓ ${texto}`) } else { mal++; console.log(`  ✗ ${texto}`) } }

const VIAS = ['iec-61850', 'dnp3', 'modbus-rtu', 'snmp', 'entrada-digital']
const proc = (protocolo, extra = {}) => ({
  instrumento: { tag: 'X-1', tipo: 'Prueba', unidad: null, equipo: 'SE-2', equipoNombre: null, claseEquipo: null, criticidad: null, limite: null, mapeo: 'descubierto' },
  lectura: { clase: 'discreta', cadenciaS: 1, protocolo, modo: 'solo-lectura', reloj: 'el relé' },
  calculo: null, custodia: { editable: false, calibracion: null },
  tecnico: { gateway: { id: 'EPIC-PALMAR-01', modelo: 'GRV-EPIC-PR1', serie: 'S', firmware: '3.6.2' }, enlace: 'starlink', bufferH: 48, ultimoVisto: '', endpoint: 'x', transporte: 'mqtt-sparkplug-b/tls', almacenamiento: 'y' },
  ...extra,
})

console.log('\n1 · Las vías de conexión directa tienen nombre y son de solo lectura')
for (const via of VIAS) {
  const p = proc(via)
  const como = CA.pasos(p, false).find(x => x.titulo === 'Cómo se lee')?.valor ?? ''
  const adq = CA.tecnico(p).find(x => x.titulo === 'Adquisición')
  comprobar(como !== 'Origen sin declarar' && !!adq && adq.valor !== via && /solo lectura/i.test(adq.detalle),
    `${via}: «${como}» · «${adq?.valor}» · ${/solo lectura/i.test(adq?.detalle ?? '') ? 'dice solo lectura' : 'NO dice solo lectura'}`)
  comprobar(CA.garantias(p).some(g => g.valor === 'Solo lectura. No se escribe al equipo.'), `${via}: la garantía «Solo lectura. No se escribe al equipo.»`)
}

console.log('\n2 · El Palmar no tiene historiador; los demás mezclan')
const CX = await v.ssrLoadModule('/src/entities/conexion.ts')
comprobar(CX.conexionDe('palmar') === 'directa' && ['ceiba', 'morichal', 'guacamayo', 'zarza'].every(c => CX.conexionDe(c) === 'mezcla'),
  `palmar: ${CX.conexionDe('palmar')} · los demás: ${['ceiba', 'morichal', 'guacamayo', 'zarza'].map(CX.conexionDe).join(', ')}`)
const disps = campo => {
  const cfg = PT.CAMPO_PLANTA[campo]
  const ids = new Set([...cfg.tronco, ...cfg.gas, ...cfg.crudo, ...cfg.agua, ...cfg.servicios].flatMap(e => [e.equipo, ...(e.miembros ?? []).map(m => m.equipo)]).filter(Boolean))
  return [...ids].flatMap(id => { const e = EQ.equipoEnCampo(id, campo); return e?.instrumentado ? e.dispositivos.map(d => ({ equipo: id, ...d })) : [] })
}
const pal = disps('palmar'), cei = disps('ceiba')
comprobar(pal.length > 0 && !pal.some(d => /^PI\b/.test(d.origen)), `ningún instrumento de El Palmar dice «PI» (${pal.filter(d => /^PI\b/.test(d.origen)).map(d => d.tag).join(', ') || 'ninguno'})`)
comprobar(cei.some(d => /^PI\b/.test(d.origen)), 'La Ceiba sigue leyendo parte del historiador')
const se2 = EQ.equipoEnCampo('SE-2', 'palmar')
comprobar(['52-SE2', 'EI-0020'].every(t => se2?.dispositivos.some(d => d.tag === t)) && !EQ.equipoEnCampo('SE-2', 'ceiba')?.dispositivos.some(d => d.tag === '52-SE2'),
  'SE-2 de El Palmar suma el interruptor por su relé (52-SE2) y la entrada «hay tensión» del gateway (EI-0020); la de La Ceiba no cambia')
const origenDe = t => pal.find(d => d.tag === t)?.origen ?? ''
comprobar(/^PLC/.test(origenDe('PI-2010')) && /Modbus RTU/.test(origenDe('PT-1011')) && /Modbus RTU/.test(origenDe('II-0021')) && /IEC 61850/.test(origenDe('52-SE2')) && /entrada digital/i.test(origenDe('EI-0020')),
  `cada uno de donde está el dato: PI-2010 «${origenDe('PI-2010')}», PT-1011 «${origenDe('PT-1011')}», II-0021 «${origenDe('II-0021')}», 52-SE2 «${origenDe('52-SE2')}», EI-0020 «${origenDe('EI-0020')}»`)

console.log('\n3 · De punta a punta, con el simulador de la API')
const nac = JSON.parse(readFileSync(new URL('../simulador-api/datos/nacimientos.json', import.meta.url), 'utf8'))
const protocolos = c => new Set(nac.filter(n => n.campo === c).flatMap(n => n.dispositivos.map(d => d.fuente.protocolo)))
const pp = protocolos('palmar')
comprobar(!pp.has('pi-web-api') && ['iec-61850', 'modbus-rtu', 'snmp', 'entrada-digital', 'modbus-tcp'].every(x => pp.has(x)), `la semilla de El Palmar: ${[...pp].sort().join(', ')}`)
comprobar(['ceiba', 'morichal', 'guacamayo', 'zarza'].every(c => protocolos(c).has('pi-web-api')), 'los demás campos siguen con el historiador en su semilla')

const tmp = mkdtempSync(join(tmpdir(), 'trim-conexion-'))
process.env.TRIM_DB = join(tmp, 'trim.db')
const SIM = await import(new URL('../simulador-api/api.mjs', import.meta.url).href)
SIM.arrancar()
const srv = servidorHttp((req, res) => { SIM.manejar(req, res).then(h => { if (!h) { res.writeHead(404); res.end() } }) })
await new Promise(ok => srv.listen(0, '127.0.0.1', ok))
const url = `http://127.0.0.1:${srv.address().port}`
const CAP = { 'x-capacidades': 'conector:configurar' }
const pedir = async (ruta, init = {}) => { const r = await fetch(url + ruta, { ...init, headers: { ...CAP, ...(init.headers ?? {}) } }); return { estado: r.status, cuerpo: await r.json() } }
try {
  const malos = []
  for (const d of pal) {
    const r = await pedir(`/api/campos/palmar/tags/${encodeURIComponent(d.tag)}/procedencia`)
    if (r.estado !== 200 || r.cuerpo.instrumento.equipo !== d.equipo || r.cuerpo.lectura.modo !== 'solo-lectura' || r.cuerpo.lectura.protocolo === 'pi-web-api') malos.push(`${d.tag} (${r.estado} ${r.cuerpo?.lectura?.protocolo ?? ''})`)
  }
  comprobar(malos.length === 0, `los ${pal.length} tags de El Palmar tienen procedencia: su equipo, su protocolo directo y solo lectura${malos.length ? ` (mal: ${malos.join(', ')})` : ''}`)
  for (const [tag, via, palabras] of [['52-SE2', 'iec-61850', /IEC 61850/], ['II-0021', 'modbus-rtu', /Modbus RTU/], ['PT-1011', 'modbus-rtu', /Modbus RTU/], ['EI-0020', 'entrada-digital', /entrada digital/i]]) {
    const r = await pedir(`/api/campos/palmar/tags/${tag}/procedencia`)
    const adq = r.estado === 200 ? CA.tecnico(r.cuerpo).find(x => x.titulo === 'Adquisición') : undefined
    comprobar(r.cuerpo?.lectura?.protocolo === via && palabras.test(`${adq?.valor} ${adq?.detalle}`) && CA.garantias(r.cuerpo).some(g => /Solo lectura/.test(g.valor)),
      `${tag}: «${adq?.valor}» · ${adq?.detalle}`)
  }
  const pend = await pedir('/api/campos/palmar/tags/pendientes')
  const ups = (Array.isArray(pend.cuerpo) ? pend.cuerpo : pend.cuerpo?.tags ?? []).find(t => (t.tag ?? t.nombre) === 'EIB-0031')
  comprobar(!ups, 'la UPS de la sala de control ya no está por asociar: desde la Fase 4 es un equipo del catálogo')
  const upsP = await pedir('/api/campos/palmar/tags/EIB-0031/procedencia')
  comprobar(upsP.cuerpo?.lectura?.protocolo === 'snmp' && upsP.cuerpo.lectura.modo === 'solo-lectura' && upsP.cuerpo.instrumento.mapeo === 'descubierto' && upsP.cuerpo.instrumento.equipo === 'UPS-SALA',
    `su procedencia: SNMP, solo lectura, de UPS-SALA (${upsP.cuerpo?.lectura?.protocolo}, ${upsP.cuerpo?.instrumento?.mapeo}, ${upsP.cuerpo?.instrumento?.equipo})`)
  // Fase 4: mandar la notificación push no es una ruta abierta (revisión de seguridad, 4-nov-2026).
  const cuerpoPush = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campoId: 'palmar', eventoId: 'x', avisos: {} }) }
  const sinCap = await fetch(`${url}/api/push/enviar`, cuerpoPush), conCap = await fetch(`${url}/api/push/enviar`, { ...cuerpoPush, headers: { ...cuerpoPush.headers, ...CAP } })
  comprobar(sinCap.status === 403 && conCap.status === 200, `POST /api/push/enviar sin conector:configurar: ${sinCap.status}; con ella: ${conCap.status}`)
} finally {
  srv.close()
  rmSync(tmp, { recursive: true, force: true })
}

await v.close()
console.log(`\n${bien} de ${bien + mal} comprobaciones bien.`)
process.exit(mal ? 1 : 0)
