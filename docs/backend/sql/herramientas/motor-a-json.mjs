/* Vuelca a JSON lo que el motor del demo sabe y que no está en referencia/
   (librerías, usuarios, mensajes, SAP, libro por mes y tramos por día), para
   cargar filas REALES en el esquema. Los imports «bare» solo resuelven dentro
   del proyecto: validar.sh lo copia a scripts/.doc-E-filas.mjs, lo corre y lo
   borra. Uso (desde la raíz del proyecto): node scripts/.doc-E-filas.mjs <salida.json> */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SALIDA = process.argv[2]
if (!SALIDA) throw new Error('falta la ruta de salida')
const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
try {
  const INS = await v.ssrLoadModule('/src/entities/insumos.ts')
  INS.instalarInsumos((await v.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
  const L = await v.ssrLoadModule('/src/entities/libro.ts')
  const T = await v.ssrLoadModule('/src/entities/tipos.ts')
  const R = await v.ssrLoadModule('/src/entities/roles.ts')
  const U = await v.ssrLoadModule('/src/entities/usuarios.ts')
  const M = await v.ssrLoadModule('/src/entities/mensajes.ts')
  const ISO = await v.ssrLoadModule('/src/entities/iso14224.ts')
  const CAT = await v.ssrLoadModule('/src/entities/catalogo.ts')
  const PA = await v.ssrLoadModule('/src/entities/partes.ts')
  const ME = await v.ssrLoadModule('/src/entities/metrologia.ts')
  const PL = await v.ssrLoadModule('/src/entities/planta.ts')
  const SAP = await v.ssrLoadModule('/src/entities/sap.ts')
  const FL = await v.ssrLoadModule('/src/entities/flota.ts')
  const I = await v.ssrLoadModule('/src/entities/informe.ts')
  const P = await v.ssrLoadModule('/src/entities/pozos.ts')
  const MS = await v.ssrLoadModule('/src/shared/api/mensajes.ts')
  const ANC = await v.ssrLoadModule('/src/entities/anh-catalogo.ts')
  const ANH = await v.ssrLoadModule('/src/entities/anh-clasificacion.ts')
  const CHO = await v.ssrLoadModule('/src/entities/choke.ts')

  const CAMPOS = ['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza']
  const ctx = L.contextoInicial()
  const sha = s => createHash('sha256').update(s, 'utf8').digest('hex')

  const flota = Object.fromEntries(CAMPOS.map(c => [c, FL.flotaDe(c)]))
  const roles = R.ROLES.map(r => ({ id: r.id, nombre: r.nombre, nivel: r.nivel, area: r.area, inicio: r.inicio, pantallas: r.pantallas,
    campos: r.campos, capacidades: Object.entries(r.puede).filter(([, b]) => b).map(([k]) => k), visible: R.ROLES_VISIBLES.some(x => x.id === r.id) }))
  const partes = Object.fromEntries(['inyeccion', 'multifasica', 'electrosumergible'].map(f => [f, PA.partesDe(f)]))

  const meses = L.calendario().filter(m => L.mesCerrado(m))
  const libros = []
  for (const c of CAMPOS) for (const m of meses) {
    const lb = L.libro([c], new Date(m.desde), new Date(m.hasta), ctx)
    const cifras = I.cifrasDe(lb, [c], 1)
    const canon = I.formaCanonica(cifras)
    const { tramos, porPozo, preguntas, custodia, ...resto } = lb
    libros.push({ campoId: c, mes: m.mes, eventos: tramos.length, huella: sha(canon), canonica: canon,
      custodia: { sinPrueba: custodia.sinPrueba.map(p => `${p.campoId}/${p.id}`), estimados: custodia.estimados.map(p => `${p.campoId}/${p.id}`), bswLaboratorio: custodia.bswLaboratorio },
      libro: resto })
  }
  const D = 86_400_000
  const sep = meses.find(m => m.mes === '2026-09')
  const tramosDia = []
  for (let d = sep.desde; d < sep.hasta; d += D) {
    for (const t of L.tramosEntre(['ceiba'], new Date(d), new Date(d + D), ctx)) {
      if (t.horas <= 0) continue
      tramosDia.push({ evento: t.evento.id, dia: new Date(d - 5 * 3_600_000).toISOString().slice(0, 10), campoId: t.pozo.campoId, pozo: t.pozo.id,
        inicio: t.inicio.toISOString(), fin: t.fin.toISOString(), horas: t.horas, factor: t.factor, bbl: t.bbl, aproximado: t.aproximado,
        sinCustodia: t.sinCustodia, sinFactor: t.sinFactor, sesgo: t.sesgo,
        crudo: P.pruebaEn(t.pozo, d)?.crudoBpd ?? 0,
        causa: { tipo: t.causa.tipo, equipo: t.causa.equipo, parte: t.causa.parte, como: t.causa.como, evento: t.causa.evento } })
    }
  }
  const faSep = Object.fromEntries(CAMPOS.map(c => [c, L.faDe(c, sep.desde)]))

  const identidad = [], repuestos = []
  for (const c of CAMPOS) {
    for (const p of P.pozosDe(c)) identidad.push({ campoId: c, equipo: p.id, ...SAP.identidadSap(c, p.id) })
    for (const id of ['P-201B', 'MPP-301', 'K-101', 'H-302', 'V-101', 'TK-102', 'LACT-01', 'C-401', 'SE-2']) identidad.push({ campoId: c, equipo: id, ...SAP.identidadSap(c, id) })
    const esp = P.pozosDe(c).find(p => p.levantamiento === 'electrosumergible')
    for (const e of [...flota[c].filter(f => f.familia !== 'electrosumergible').map(f => f.equipo), ...(esp ? [esp.id] : [])])
      for (const r of SAP.repuestosDe(c, e)) repuestos.push(r)
  }

  const mensajes = MS.pedirMensajes(CAMPOS)

  // El catálogo de la clasificación ANH que cierra lo que se escribe (C-07):
  // las causas de cada versión, las 18 generales, qué paso dice o confirma cada
  // rol y las preguntas de campo con quién las contesta y todos sus botones (los
  // de las que arma el motor por fila: las 20 causas en palabras de campo, los
  // detalles de la circular y los tramos, cada una con «No sé»).
  const fijas = Object.values(ANH.PREGUNTAS_CAMPO), NO_SE = 'No sé'
  const anh = {
    n1: ANC.CLAVES_N1.map(k => ({ clave: k, planeacion: ANC.planeacionDeN1(k), texto: ANC.textoN1(k) })),
    n2: Object.values(ANC.VERSIONES_CATALOGO).flatMap(ver => ver.arbol.flatMap(n => n.n2.map(c => ({ version: ver.id, codigo: c, n1: n.clave, texto: ver.forma.n2[c] })))),
    causasGenerales: ANC.CAUSAS_GENERALES.map((id, i) => ({ id, texto: ANC.CAUSAS_GENERALES_0651[i] })),
    pasosPorRol: [
      ...Object.entries(ANH.PASOS_QUE_DECLARA).flatMap(([rol, ps]) => ps.map(paso => ({ rol, paso, accion: 'declara' }))),
      ...Object.entries(ANH.PASOS_QUE_CONFIRMA).flatMap(([rol, ps]) => ps.map(paso => ({ rol, paso, accion: 'confirma' }))),
    ],
    preguntas: [...fijas.map(q => ({ id: q.id, quien: q.quien, texto: q.texto })),
      { id: 'raiz', quien: 'causa', texto: '¿Qué falló primero?' }, { id: 'detalle', quien: 'causa', texto: '¿Qué fue, exactamente?' },
      { id: 'choke', quien: 'revisa', texto: CHO.PREGUNTA_ORIGEN }],
    contestan: Object.entries(ANH.ROLES_QUE_CONTESTAN).flatMap(([quien, roles]) => roles.map(rol => ({ quien, rol }))),
    opciones: [...fijas.flatMap(q => q.opciones.map(o => ({ pregunta: q.id, texto: o.texto }))),
      ...ANC.CLAVES_N1.map(k => ({ pregunta: 'raiz', texto: ANH.N1_EN_CAMPO[k] })), { pregunta: 'raiz', texto: NO_SE },
      ...ANC.N2_CIRCULAR.map(n => ({ pregunta: 'detalle', texto: ANC.textoN2(n.codigo) })), { pregunta: 'detalle', texto: NO_SE },
      ...['pozo', 'planta', 'exportacion'].map(c => ({ pregunta: 'choke', texto: ANC.ETIQUETA_CHOKE[c] })), { pregunta: 'choke', texto: NO_SE }],
  }

  writeFileSync(SALIDA, JSON.stringify({
    flota, roles, capacidadNombre: T.CAPACIDAD_NOMBRE, usuarios: U.USUARIOS_INICIALES, rolesConAlertas: U.ROLES_CON_ALERTAS,
    plantillas: M.PLANTILLAS, modos: ISO.MODOS, mecanismos: ISO.MECANISMOS, causasRaiz: ISO.CAUSAS_RAIZ, modosPorClase: ISO.MODOS_POR_CLASE,
    modoEnCampo: CAT.MODO_EN_CAMPO, mecanismoSugerido: CAT.MECANISMO_SUGERIDO, nombreClase: CAT.NOMBRE_CLASE_EQUIPO, partes,
    metrologia: ME.METROLOGIA_CAMPO, planta: PL.CAMPO_PLANTA, identidad, repuestos, mensajes, libros, tramosDia, faSep, anh,
  }, null, 1))
  console.log(`libros ${libros.length} · tramos por día ${tramosDia.length} · mensajes ${mensajes.length} · identidades ${identidad.length} · repuestos ${repuestos.length}`)
} finally { await v.close() }
