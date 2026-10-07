/** Genera la semilla del registro a partir del catálogo del front.
 *
 *  En producción estos dos archivos NO se generan: el registro de ingeniería
 *  lo carga el cliente una vez y los nacimientos los publica el borde al
 *  conectarse. Aquí se fabrican para poder arrancar con datos.
 *
 *  Uso:  npm run semilla
 */
import { writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = join(aqui, '..')

// El catálogo se lee con Vite, que ya es dependencia del proyecto (antes era
// `npx esbuild`, sin declarar: sin red o en otra máquina fallaba, o bajaba la
// versión que hubiera). Sin la configuración del proyecto: no levanta el
// simulador ni abre la base que este script va a invalidar.
const vite = await createServer({ root: raiz, configFile: false, resolve: { alias: { '@': join(raiz, 'src') } },
  server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
let equipoEnCampo, CAMPOS, CAMPO_PLANTA
try {
  ({ equipoEnCampo } = await vite.ssrLoadModule('/src/entities/equipos.ts'))
  ;({ CAMPOS } = await vite.ssrLoadModule('/src/entities/campos.ts'))
  ;({ CAMPO_PLANTA } = await vite.ssrLoadModule('/src/entities/planta.ts'))
} finally { await vite.close() }

/** Clase del equipo según la taxonomía de ISO 14224. Un equipo del catálogo
 *  sin clase aquí detiene la semilla: antes quedaba «sin-clasificar» callado. */
const CLASE = {
  'P-201B': 'bomba-centrifuga', 'MPP-301': 'bomba-multifasica', 'K-101': 'compresor-aire',
  'H-302': 'tratador-termico', 'V-101': 'separador-trifasico', 'TK-102': 'tanque-atmosferico',
  'LACT-01': 'unidad-lact', 'C-401': 'compresor-gas', 'SE-2': 'switchgear',
}

/** Librería de fórmulas del producto, versionada. Una fórmula produce UNA
 *  variable de una clase de equipo (la clave es «clase|tipo del tag») y solo
 *  aparece en el tag que ES ese cálculo (origen «calculado»). Lo que mide un
 *  instrumento no tiene fórmula. La energía por barril (JI) ya no se mide en
 *  esta fase y su fórmula salió de la librería. */
const FORMULAS = {
  'compresor-aire|Derivada de presión': ['pendiente de la presión de cabezal (PT-1011) en la ventana, en psi/h', 2, 15],
}

/** De cómo se lee el tag salen el protocolo y quién estampa la hora. */
const PROTOCOLO = [
  [/^PI/, { protocolo: 'pi-web-api', endpoint: 'https://pi.{campo}.local/piwebapi', reloj: 'el PLC de la batería' }],
  [/^PLC/, { protocolo: 'modbus-tcp', endpoint: 'plc-{campo}.ot.local:502', reloj: 'el PLC de la batería' }],
  [/^variador/, { protocolo: 'modbus-tcp', endpoint: 'vfd-{campo}.ot.local:502', reloj: 'el variador' }],
  [/^calculado/, { protocolo: 'calculado', endpoint: null, reloj: 'el tag del que se deriva' }],
  [/^computador de flujo/, { protocolo: 'roc-plus', endpoint: 'fc-{campo}.ot.local:4000', reloj: 'el computador de flujo' }],
  [/^ATG/, { protocolo: 'atg', endpoint: 'atg-{campo}.ot.local:10001', reloj: 'la consola de tanques' }],
  [/^analizador|^densitómetro/, { protocolo: 'modbus-tcp', endpoint: 'plc-{campo}.ot.local:502', reloj: 'el PLC de la batería' }],
  [/^SIS/, { protocolo: 'sis', endpoint: null, reloj: 'el sistema instrumentado de seguridad' }],
  [/^laboratorio/, { protocolo: 'laboratorio', endpoint: null, reloj: 'la hora de la toma de muestra' }],
  [/^portátil|^campaña/, { protocolo: 'ruta-manual', endpoint: null, reloj: 'la hora en que se cerró la ruta' }],
]

const UNIDAD_T = { s: 1, min: 60, h: 3600, d: 86400 }
const cadencia = origen => {
  const t = (origen.split('·')[1] ?? '').trim().replace(/^cada\s+/i, '')
  const m = t.match(/^([\d.,]+)\s*(s|min|h|d)$/)
  return m ? Number(m[1].replace(',', '.')) * UNIDAD_T[m[2]] : null
}
const aNumero = s => {
  const n = Number(String(s).trim().replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const banda = limite => {
  const r = limite.match(/^(-?[\d.,]+)\s*[–-]\s*(-?[\d.,]+)$/)
  if (r) return [aNumero(r[1]), aNumero(r[2])]
  const techo = limite.match(/^<\s*(-?[\d.,]+)$/)
  if (techo) return [null, aNumero(techo[1])]
  const piso = limite.match(/^>\s*(-?[\d.,]+)$/)
  if (piso) return [aNumero(piso[1]), null]
  return [null, null]
}

/* ───── Registro de ingeniería ───── */
const idsDe = cfg => [...new Set([...cfg.tronco, ...cfg.gas, ...cfg.crudo, ...cfg.agua, ...cfg.servicios]
  .flatMap(e => [e.equipo, ...(e.miembros ?? []).map(m => m.equipo)])
  .filter(Boolean))]
const equipos = []
for (const [campoId, cfg] of Object.entries(CAMPO_PLANTA)) {
  // Los miembros sin ficha en el catálogo (pozos) no son equipos del registro.
  for (const id of idsDe(cfg)) {
    const eq = equipoEnCampo(id, campoId)
    if (!eq) continue
    if (!CLASE[id]) throw new Error(`${id} no tiene clase ISO 14224 en CLASE (generar-semilla.mjs)`)
    equipos.push({ id, campoId, nombre: eq.nombre, clase: CLASE[id], criticidad: eq.criticidad })
  }
}
const formulasUsadas = new Map()
const registro = {
  campos: CAMPOS.map(c => ({ id: c.id, nombre: c.nombre })),
  equipos,
  formulas: [],
}

/* ───── Certificados de nacimiento, uno por campo ───── */
const nacimientos = []
for (const [campoId, cfg] of Object.entries(CAMPO_PLANTA)) {
  const dispositivos = []
  for (const id of idsDe(cfg)) {
    // Lo que ESE campo tiene conectado: un equipo sin instancia en el campo
    // no publica tags (nunca los de otro campo).
    const eq = equipoEnCampo(id, campoId)
    if (!eq?.instrumentado) continue
    const porFuente = new Map()
    for (const d of eq.dispositivos) {
      const p = PROTOCOLO.find(([re]) => re.test(d.origen))?.[1]
      if (!p) throw new Error(`${campoId} · ${id} · ${d.tag}: no se sabe de qué protocolo es el origen «${d.origen}» (PROTOCOLO)`)
      if (p.protocolo === 'calculado') {
        const clave = `${CLASE[id]}|${d.tipo}`
        if (!FORMULAS[clave]) throw new Error(`${campoId} · ${d.tag} es calculado y la librería no tiene fórmula para ${clave}`)
        formulasUsadas.set(clave, FORMULAS[clave])
      }
      const clave = p.protocolo
      if (!porFuente.has(clave)) porFuente.set(clave, {
        nombre: id,
        fuente: { protocolo: p.protocolo, endpoint: p.endpoint?.replace('{campo}', campoId) ?? null, reloj: p.reloj },
        metricas: [],
      })
      const [bajo, alto] = banda(d.limite ?? '')
      const cal = d.calibracion
      porFuente.get(clave).metricas.push({
        nombre: d.tag, tipo: d.tipo, unidad: d.unidad || null,
        limite: d.limite && d.limite !== '—' ? d.limite : null, bajo, alto,
        cadenciaS: cadencia(d.origen),
        clase: d.serie ? 'continua' : 'discreta',
        ...(cal ? { calibracion: { vigenteHasta: (cal.match(/vigente hasta ([^·]+)/i)?.[1] ?? '').trim() || null, detalle: cal } } : {}),
      })
    }
    dispositivos.push(...porFuente.values())
  }
  // Un segundo borde que llega con nomenclatura propia: sus tags NO se
  // resuelven solos y quedan pendientes de asociar. Es el caso real de una
  // ampliación instalada por un integrador que nombró a su manera.
  const base = dispositivos.flatMap(d => d.metricas).filter(m => /\d{3,}/.test(m.nombre)).slice(0, 3)
  if (base.length) nacimientos.push({
    campo: campoId,
    gateway: {
      id: `EPIC-${campoId.toUpperCase()}-02`, modelo: 'GRV-EPIC-PR1',
      serie: `GRV${campoId.toUpperCase().slice(0, 3)}9${String(base.length).padStart(3, '0')}`,
      firmware: '3.6.0', enlace: 'starlink', bufferH: 48,
    },
    dispositivos: [{
      nombre: 'SKID-AMPLIACION',
      fuente: { protocolo: 'opc-ua', endpoint: `opc.tcp://skid-${campoId}.ot.local:4840`, reloj: 'el PLC del skid' },
      metricas: base.map((m, i) => ({
        nombre: `${['XI', 'XT', 'XP'][i]}-${String(Number(m.nombre.match(/\d+/)[0]) + 5)}`,
        tipo: m.tipo, unidad: m.unidad, limite: m.limite, bajo: m.bajo, alto: m.alto,
        cadenciaS: 5, clase: 'continua',
      })),
    }],
  })

  nacimientos.push({
    campo: campoId,
    gateway: {
      id: `EPIC-${campoId.toUpperCase()}-01`, modelo: 'GRV-EPIC-PR1',
      serie: `GRV${campoId.toUpperCase().slice(0, 3)}${String(dispositivos.length).padStart(4, '0')}`,
      firmware: '3.6.2', enlace: 'starlink', bufferH: 48,
    },
    dispositivos,
  })
}

registro.formulas = [...formulasUsadas].map(([clave, [expresion, version, ventanaMin]], i) => {
  const [claseEquipo, tipoTag] = clave.split('|')
  return { id: `f${i + 1}-${claseEquipo}`, claseEquipo, tipoTag, expresion, version, ventanaMin }
})

writeFileSync(join(aqui, 'datos', 'registro-ingenieria.json'), JSON.stringify(registro, null, 2))
writeFileSync(join(aqui, 'datos', 'nacimientos.json'), JSON.stringify(nacimientos, null, 2))
console.log(`registro: ${registro.campos.length} campos · ${registro.equipos.length} equipos · ${registro.formulas.length} fórmulas`)
console.log(`nacimientos: ${nacimientos.length} · ${nacimientos.reduce((a, n) => a + n.dispositivos.reduce((b, d) => b + d.metricas.length, 0), 0)} tags`)

// La base del simulador se llenó con la semilla anterior: se borra para que el
// próximo arranque cargue esta. (Si queda, el arranque también lo detecta por
// la huella y la reconstruye; borrarla aquí lo hace explícito.)
const RUTA = process.env.TRIM_DB ?? join(aqui, 'datos', 'trim.db')
for (const f of [RUTA, `${RUTA}-wal`, `${RUTA}-shm`]) rmSync(f, { force: true })
console.log(`base del simulador borrada (${RUTA}): el próximo arranque carga esta semilla`)
