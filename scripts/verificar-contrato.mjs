/* El contrato sobrevive al paso por la red.
 *
 * Para cada endpoint de src/shared/api/contrato.ts, con los datos del demo:
 *   revivir(JSON.parse(JSON.stringify(aDTO(x))))  es igual a  x
 * Si una fecha queda sin códec vuelve como texto, un Infinity vuelve como
 * null, un undefined dentro de una lista vuelve como null, una entidad por
 * clave que no viene en refs revienta: cada caso falla aquí diciendo dónde.
 *
 * Además: ninguna ruta choca con otra (una ruta por recurso, sin un tramo
 * literal al nivel de un :parámetro), las respuestas pesan lo que deben (las
 * entidades viajan una vez), y la costura con la fuente http hace de punta a
 * punta lo mismo que el demo: un servidor de prueba responde cada GET con el
 * JSON del contrato, la pantalla recibe lo mismo que en el demo, y las
 * escrituras traducen 403/409/422 al mismo { ok: false, error }.
 *
 *   node scripts/verificar-contrato.mjs        (npm run verificar:contrato)
 *
 * Sale con código 1 si algo no coincide.
 */
import { createServer, loadConfigFromFile } from 'vite'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const HTTP = process.argv.includes('--http')
// Estas comprobaciones son del demo: un .env.local que apunte a un backend
// (VITE_FUENTE=http, como pide CONTRATO.md al comprobar uno) no las cambia de
// fuente. Vite respeta lo que ya trae el proceso antes que los archivos .env.
if (!HTTP) process.env.VITE_FUENTE = 'demo'

let fallos = 0, pruebas = 0
const comprobar = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('  ✗ FALLA:', msg) } else console.log('  ✓', msg) }

/** La primera diferencia entre dos valores del dominio, o null si son
 *  iguales. Con las reglas de JSON: una propiedad undefined es lo mismo que
 *  una que no está; una fecha se compara por instante. */
function diferencia(a, b, ruta = '$') {
  if (a instanceof Date || b instanceof Date)
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime() ? null : `${ruta}: ${fmt(a)} ≠ ${fmt(b)}`
  if (typeof a === 'number' && typeof b === 'number') return Object.is(a, b) || a === b ? null : `${ruta}: ${a} ≠ ${b}`
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return `${ruta}: lista de ${a?.length} ≠ ${fmt(b)}`
    for (let i = 0; i < a.length; i++) { const d = diferencia(a[i], b[i], `${ruta}[${i}]`); if (d) return d }
    return null
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).filter(k => a[k] !== undefined).sort(), kb = Object.keys(b).filter(k => b[k] !== undefined).sort()
    if (ka.join() !== kb.join()) return `${ruta}: claves [${ka.filter(k => !kb.includes(k))}] de más, [${kb.filter(k => !ka.includes(k))}] de menos`
    for (const k of ka) { const d = diferencia(a[k], b[k], `${ruta}.${k}`); if (d) return d }
    return null
  }
  return a === b ? null : `${ruta}: ${fmt(a)} ≠ ${fmt(b)}`
}
const fmt = x => (x instanceof Date ? `Date(${x.toISOString()})` : JSON.stringify(x)?.slice(0, 80) ?? String(x))

const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
const cargar = n => v.ssrLoadModule(n)
try {
  // Los insumos del motor: el demo los calcula y el servidor de prueba (--http) también.
  ;(await cargar('/src/entities/insumos.ts')).instalarInsumos((await cargar('/src/entities/datos/index.ts')).INSUMOS_DEMO)
  const F = await cargar('/src/shared/api/fuente.ts')
  const C = await cargar('/src/shared/api/contrato.ts')
  const K = await cargar('/src/shared/api/cable.ts')
  const DIF = await cargar('/src/shared/api/diferidos.ts')
  const EQ = await cargar('/src/shared/api/equipos.ts')
  const SAP = await cargar('/src/shared/api/sap.ts')
  const MED = await cargar('/src/shared/api/medicion.ts')
  const MSJ = await cargar('/src/shared/api/mensajes.ts')
  const PRE = await cargar('/src/shared/api/predicciones.ts')
  const CAT = await cargar('/src/shared/api/catalogo.ts')
  const CIC = await cargar('/src/shared/api/ciclo.ts')
  const CHK = await cargar('/src/shared/api/choke.ts')
  const ARB = await cargar('/src/shared/api/arbol.ts')
  // La locación de los pozos del demo (el caso de borde del choke) entra por fuente.ts, como en el navegador.
  F.instalarLocaciones((await cargar('/src/entities/datos/topologia.ts')).locacionDemo)
  const L = await cargar('/src/entities/libro.ts')
  const { CAMPOS } = await cargar('/src/entities/campos.ts')
  const TODOS = CAMPOS.map(c => c.id)

  /** El servidor del demo: lo que responde cada GET del contrato. `ctx` y lo
   *  demás de la sesión los pone quien llama (el servidor los tiene). */
  const responder = (s) => ({
    DIFERIDOS: p => DIF.pedirLibro(p, s.ctx),
    DIFERIDOS_MENSUAL: p => DIF.pedirSerie(p.campos, s.ctx),
    DIFERIDOS_BASE: p => DIF.pedirBase(p, s.ctx),
    PRODUCCION_DIARIA: p => DIF.pedirDias(p, s.ctx),
    POTENCIAL_RECIENTE: p => DIF.pedirPotencialesRecientes(p.campos, s.ctx),
    PREGUNTAS: p => DIF.pedirPreguntas(p.campos, s.ctx),
    OPCIONES_RESPUESTA: p => DIF.pedirOpcionesRespuesta(DIF.pedirPreguntas(TODOS, s.ctx).find(q => q.id === p.evento), s.ctx),
    PREDICCION: p => DIF.pedirPrediccion(EQ.pedirPerfilBomba(p.campo, p.equipo), s.ctx),
    PARADAS_BOMBA: p => DIF.pedirParadas(p.campo, p.equipo, s.ctx),
    PARADAS_EN_PERIODO: p => DIF.pedirParadasDeBombas(p.campos, p.desde, p.hasta, s.ctx),
    RIESGO: p => DIF.pedirRiesgo(p.campos, s.ctx),
    ESTADO: p => DIF.pedirEstadoCampos(p.campos, s.ctx),
    POZOS: p => DIF.pedirFilasPozos(p.campos, p.desde, p.hasta, s.ctx),
    POZO: p => DIF.pedirPozo(p.campo, p.pozo, p.desde, p.hasta, s.ctx),
    ELECTROSUMERGIBLES: p => DIF.pedirFlotaEsp(p.campos, p.desde, p.hasta, s.ctx),
    ASIGNACION: p => L.asignacionPorPozo(p.campo, p.mes, s.ctx),
    PREDICCIONES: p => PRE.pedirPredicciones(p.campos, s.ctx, s.versiones),
    RELOJES: p => SAP.pedirRelojes(p.campos, p.desde, p.hasta, s.ctx),
    CAMPO_AHORA: p => MED.pedirCampoAhora(p.campo, s.ctx),
    EQUIPO_HOY: p => EQ.pedirEquipo(p.campo, p.equipo, s.ctx),
    EQUIPOS_HOY: p => EQ.pedirEquiposDeHoy(p.campos, s.ctx),
    HISTORIA_EQUIPO: p => EQ.pedirHistoriaEquipo(p.campo, p.equipo, s.ctx),
    FICHA_EQUIPO: p => EQ.pedirFichaEquipo(p.campo, p.equipo, p.desde, p.hasta, s.ctx),
    FILAS_EQUIPOS: p => EQ.pedirFilasEquipos(p.campos, s.ctx),
    CONFIABILIDAD: p => EQ.pedirConfiabilidad(p.campos, s.ctx),
    BOMBAS: p => EQ.pedirBombas(p.campos, p.desde, p.hasta, s.ctx),
    CICLO: p => CIC.pedirCiclo(p.campos, p.desde, p.hasta, s.ctx, s.versiones, s.planes ?? {}),
    TUBERIA: p => CHK.pedirTuberia(p.campo, p.desde, p.hasta, s.ctx),
    SERIE_CHOKE: p => CHK.pedirSerieChoke(p.campo, p.desde, p.hasta, s.ctx),
    TUBERIA_AGUA: p => CHK.pedirTuberiaAgua(p.campo, s.ctx, s.versiones),
    CRITICIDAD: p => CHK.pedirCriticidad(p.campos, s.ctx),
    REPARTO_CHOKE: p => CHK.pedirRepartoChoke(p, s.ctx),
    REPARTO_CHOKE_MENSUAL: p => CHK.pedirRepartoMensual(p.campos, s.ctx),
    BASE_CHOKE: p => CHK.pedirBaseChoke(p, s.ctx),
    TOPOLOGIA: p => CHK.pedirTopologia(p.campo, s.ctx),
    PROPUESTAS_TOPOLOGIA: p => CHK.pedirPropuestasTopologia(p.campo, s.ctx),
    PARADAS_ANH: p => ARB.pedirParadasAnh(p, s.ctx, s.clasificacionesAnh ?? {}),
    CALIDAD_ANH: p => ARB.pedirCalidadAnh(p, s.ctx, s.clasificacionesAnh ?? {}),
    MENSAJES: p => MSJ.pedirMensajes(p.campos),
    SAP_AVISOS: p => SAP.pedirAvisosSap(p.campos, s.ctx, s.avisosEnviados),
    SAP_ORDENES: p => SAP.pedirOrdenesSap(p.campos, s.ctx),
    SAP_EQUIPOS: p => SAP.pedirEquiposSap(p.campo),
    SAP_EQUIPO: p => SAP.pedirEquipoSap(p.campo, p.equipo),
    LISTA_CAMPOS: () => s.campos ?? CAMPOS,
    CATALOGO: () => CAT.pedirCatalogo(TODOS),
    CONFIGURACION_HISTORIAL: () => s.versiones,
    RESPUESTAS: () => s.ctx.respuestas,
    USUARIOS: () => s.usuarios,
    ACCESOS: () => s.accesos,
    INFORMES: () => s.informes,
    ASIGNACION_OFICIAL: () => ({ filas: s.asignacionOficial, cargas: s.cargasAsignacion }),
    ANALISIS: () => ({ vigentes: s.analisis, anteriores: s.analisisAnteriores }),
    CAMBIOS_PLANTA: () => s.cambiosPlanta,
  })
  const ENDPOINTS = Object.entries(C).filter(([, x]) => x && typeof x === 'object' && x.metodo === 'GET')

  if (HTTP) await probarHttp()
  else await probarDemo()

  /* ═══════════════════════════ en el demo ═══════════════════════════ */
  async function probarDemo() {
    const SES = await cargar('/src/shared/api/sesion.ts')
    const E = await cargar('/src/shared/api/escrituras.ts')

    console.log('\n=== 1. La sesión con algo escrito (para que cada endpoint traiga datos) ===')
    // Escrituras del demo, cada una con el rol que la puede hacer: así los
    // endpoints del arranque (informes, análisis…) no se prueban vacíos.
    const s0 = SES.sesion()
    const bomba = DIF.pedirPreguntas(TODOS, s0.ctx).find(p => p.pide && p.sobre === 'bomba' && p.campoId === 'ceiba')
    const cat = EQ.pedirCatalogoDeDanos(bomba.campoId, bomba.equipo), parte = cat.partes[0]
    const { modosDeParte } = await cargar('/src/entities/catalogo.ts')
    const escritas = {
      firma: await E.firmarConfiguracion({ rolId: 'adm' }, { config: { ...s0.ctx.config, empresa: 'Operadora de demostración S.A.' }, motivo: 'membrete de prueba del contrato', base: s0.versiones.at(-1).version }),
      respuesta: await E.responderParada({ rolId: 'oper' }, { evento: bomba.id, campoId: bomba.campoId, equipo: bomba.equipo, texto: '', parte: parte.id, modo: modosDeParte(parte)[0].codigo }),
      analisis: await E.completarAnalisis({ rolId: 'jefe' }, { evento: bomba.id, mecanismo: '1.1', causaRaiz: '3', nota: 'prueba del contrato' }),
      asignacion: await E.cargarAsignacion({ rolId: 'prod' }, { filas: [{ mes: '2026-08', campoId: 'ceiba', pozo: 'LC-14', bbl: 1234.5, horas: 700 }], motivo: 'prueba del contrato' }),
      // El número llega como lo escribe una persona y se guarda en E.164 (CONTRATO.md · Usuarios).
      invitacion: await E.invitarUsuario({ rolId: 'ger' }, { invitacion: { nombre: 'Persona de Prueba', correo: 'prueba.contrato@operadora.example', rolId: 'sup', campos: ['ceiba'], telefono: '300 555 0199', alertas: false }, motivo: 'prueba del contrato' }),
      informe: await E.emitirInforme({ rolId: 'ger' }, { formato: 'csv', titulo: 'Prueba', alcance: 'La Ceiba', periodo: 'septiembre', campos: ['ceiba'], desde: '2026-09-01T00:00:00-05:00', hasta: '2026-10-01T00:00:00-05:00' }),
    }
    // El aviso, a un equipo del supervisor que no tenga ya uno abierto en SAP.
    const { camposAsignados } = await cargar('/src/entities/usuarios.ts'), { rolPorId } = await cargar('/src/entities/roles.ts')
    for (const c of camposAsignados(rolPorId('sup'), SES.sesion().usuarios)) for (const p of EQ.pedirPerfilesBomba(c.id)) {
      if (escritas.aviso?.ok) break
      escritas.aviso = await E.enviarAviso({ rolId: 'sup' }, { tipo: 'M1', campoId: c.id, equipo: p.equipo, descripcion: 'Vibración alta en el cojinete', prioridad: 2, parada: false, evidencia: ['prueba'] })
    }
    const grupo = ['tronco', 'gas', 'crudo', 'agua', 'servicios'].flatMap(t => SES.sesion().plantas.ceiba[t]).find(e => e.miembros?.length)
    escritas.planta = await E.cambiarPlanta({ rolId: 'adm' }, 'ceiba', { tipo: 'agregar-miembro', grupo: grupo.id, miembro: { id: 'LC-PRUEBA', etiqueta: 'LC-PRUEBA' } })
    const cal0 = L.calendario()
    const ciclo0 = CIC.pedirCiclo(TODOS, new Date(cal0[0].desde), new Date(cal0.at(-1).hasta), SES.sesion().ctx, SES.sesion().versiones, SES.sesion().planes)
    const unPlan = [...ciclo0.antes.planes, ...ciclo0.durante.planes, ...ciclo0.despues.planes].find(p => p.bbl > 0)
    escritas.plan = unPlan
      ? await E.decidirPlan({ rolId: 'jefe' }, { id: unPlan.id, estado: 'aceptado', motivo: 'prueba del contrato' })
      : { ok: false, error: 'el ciclo no trajo ningún plan con barriles' }
    // El árbol de paradas (Circular 024): el supervisor corrige el paso 2 de una
    // parada, producción confirma un grupo de la misma cadena y pone el yacimiento.
    const cerrado0 = cal0.filter(L.mesCerrado).at(-1)
    const mesCe = { campos: ['ceiba'], desde: new Date(cerrado0.desde), hasta: new Date(cerrado0.hasta) }
    const filas0 = ARB.pedirParadasAnh(mesCe, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    const aCorregir = filas0.find(p => p.estado === 'propuesta' && p.clasificacion.choke?.valor === 'pozo')
    escritas.clasificacion = aCorregir
      ? await E.clasificarParada({ rolId: 'sup' }, aCorregir.id, { pasos: { choke: 'planta' }, motivo: 'prueba del contrato', cadena: ARB.cadenaVista(aCorregir.clasificacion) })
      : { ok: false, error: 'no hay una parada propuesta en el pozo en La Ceiba' }
    const grupo0 = [...ARB.gruposPorCadena(ARB.pedirParadasAnh(mesCe, SES.sesion().ctx, SES.sesion().clasificacionesAnh)).values()].find(g => g.length >= 2)
    escritas.confirmacion = grupo0
      ? await E.confirmarParadasAnh({ rolId: 'prod' }, { ids: grupo0.map(p => p.id), cadena: ARB.cadenaVista(grupo0[0].clasificacion) })
      : { ok: false, error: 'no hay dos paradas con la misma cadena en La Ceiba' }
    const aYacimiento = ARB.pedirParadasAnh(mesCe, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
      .find(p => p.causa.tipo === 'electrosumergible' && p.id !== aCorregir?.id && !grupo0?.some(g => g.id === p.id))
    escritas.yacimiento = aYacimiento ? await E.declararYacimientoAnh({ rolId: 'prod' }, aYacimiento.id, { evidencia: 'corte-agua' }) : { ok: false, error: 'no hay una parada de electrosumergible en La Ceiba' }
    // La topología del choke: la vista previa, la carga por CSV y la firma (el
    // administrador). La de prueba: la derivada de La Ceiba con P-201B al servicio de un solo pozo.
    const topoCe = CHK.pedirTopologia('ceiba', SES.sesion().ctx).elementos.map(({ nombre: _n, clase: _c, ...e }) => e)
    const topoPrueba = topoCe.map(e => (e.elemento === 'P-201B' ? { ...e, alcance: 'dedicado', choke: 'pozo', pozos: ['LC-16'] } : e))
    escritas.vistaPrevia = await E.previsualizarConfiguracion({ rolId: 'adm' }, { config: { ...SES.sesion().ctx.config, topologia: topoPrueba } })
    escritas.importar = await E.importarTopologia({ rolId: 'adm' }, { campo: 'morichal', texto: 'Equipo;Pozos a los que sirve\nSE-2;todos\nMPP-301;MN-07 MN-18 MN-33\n' })
    escritas.topologia = await E.firmarConfiguracion({ rolId: 'adm' }, { config: { ...SES.sesion().ctx.config, topologia: topoPrueba },
      motivo: 'topología de La Ceiba de prueba del contrato', base: SES.sesion().versiones.at(-1).version })
    const malas = Object.entries(escritas).filter(([, r]) => !r.ok)
    comprobar(malas.length === 0, `las ${Object.keys(escritas).length} escrituras del contrato pasan en el demo con el rol que las puede hacer (${malas.map(([k, r]) => `${k}: ${r.error ?? JSON.stringify(r.errores)}`).join('; ') || 'todas'})`)
    const invitada = SES.sesion().usuarios.find(u => u.id === escritas.invitacion.id)
    comprobar(invitada?.telefono === '+573005550199' && SES.sesion().accesos.at(-1).cambios.includes('WhatsApp: +57 300 555 0199'),
      `el WhatsApp invitado como «300 555 0199» se guarda en E.164 (${invitada?.telefono}) y el historial lo escribe como se lee (+57 300 555 0199)`)

    console.log('\n=== 2. Ida y vuelta por JSON, endpoint por endpoint ===')
    const s = SES.sesion()
    const R = responder(s)
    const cal = L.calendario(), cerrado = cal.filter(L.mesCerrado).at(-1), curso = cal.at(-1)
    const periodos = [
      { nombre: 'mes cerrado', desde: new Date(cerrado.desde), hasta: new Date(cerrado.hasta) },
      { nombre: 'mes en curso', desde: new Date(curso.desde), hasta: new Date(curso.hasta) },
      { nombre: 'toda la historia', desde: new Date(cal[0].desde), hasta: new Date(curso.hasta) },
    ]
    const grupos = [...TODOS.map(c => [c]), TODOS]
    const conPeriodo = () => grupos.flatMap(campos => periodos.map(p => ({ campos, desde: p.desde, hasta: p.hasta })))
    const porCampos = () => grupos.map(campos => ({ campos }))
    const bombas = TODOS.flatMap(campo => EQ.pedirPerfilesBomba(campo).map(p => ({ campo, equipo: p.equipo })))
    const equipos = TODOS.flatMap(campo => [...EQ.pedirRegistroDeEquipos(campo).map(e => e.id), ...MED.pedirPozosDelCampo(campo).map(p => p.id)].map(equipo => ({ campo, equipo })))
    const pozos = TODOS.flatMap(campo => MED.pedirPozosDelCampo(campo).map(p => ({ campo, pozo: p.id })))
    const casos = {
      DIFERIDOS: conPeriodo(), DIFERIDOS_MENSUAL: porCampos(), DIFERIDOS_BASE: conPeriodo(), PRODUCCION_DIARIA: conPeriodo(),
      POTENCIAL_RECIENTE: porCampos(), PREGUNTAS: porCampos(),
      OPCIONES_RESPUESTA: DIF.pedirPreguntas(TODOS, s.ctx).map(p => ({ evento: p.id })),
      PREDICCION: bombas, PARADAS_BOMBA: bombas,
      PARADAS_EN_PERIODO: conPeriodo(), RIESGO: porCampos(), ESTADO: porCampos(), POZOS: conPeriodo(),
      POZO: [...pozos.flatMap(p => periodos.slice(0, 2).map(r => ({ ...p, desde: r.desde, hasta: r.hasta }))), { campo: 'ceiba', pozo: 'NO-EXISTE', ...periodos[0] }],
      ELECTROSUMERGIBLES: conPeriodo(),
      ASIGNACION: TODOS.flatMap(campo => cal.filter(L.mesCerrado).map(m => ({ campo, mes: m.mes }))),
      PREDICCIONES: porCampos(), RELOJES: conPeriodo(), CAMPO_AHORA: TODOS.map(campo => ({ campo })),
      EQUIPO_HOY: [...equipos, { campo: 'ceiba', equipo: 'NO-EXISTE' }], EQUIPOS_HOY: porCampos(),
      HISTORIA_EQUIPO: equipos.filter(e => !pozos.some(p => p.campo === e.campo && p.pozo === e.equipo)),
      FICHA_EQUIPO: [...equipos.map(e => ({ ...e, ...periodos[0] })), { campo: 'ceiba', equipo: 'NO-EXISTE', ...periodos[0] }],
      FILAS_EQUIPOS: porCampos(), CONFIABILIDAD: porCampos(), BOMBAS: conPeriodo(), CICLO: conPeriodo(),
      TUBERIA: TODOS.flatMap(campo => periodos.map(r => ({ campo, desde: r.desde, hasta: r.hasta }))),
      SERIE_CHOKE: TODOS.flatMap(campo => periodos.map(r => ({ campo, desde: r.desde, hasta: r.hasta }))),
      TUBERIA_AGUA: TODOS.map(campo => ({ campo })), CRITICIDAD: porCampos(),
      REPARTO_CHOKE: conPeriodo(), REPARTO_CHOKE_MENSUAL: porCampos(), BASE_CHOKE: conPeriodo(),
      TOPOLOGIA: TODOS.map(campo => ({ campo })), PROPUESTAS_TOPOLOGIA: TODOS.map(campo => ({ campo })),
      PARADAS_ANH: conPeriodo(), CALIDAD_ANH: conPeriodo(),
      MENSAJES: porCampos(), SAP_AVISOS: porCampos(), SAP_ORDENES: porCampos(),
      SAP_EQUIPOS: TODOS.map(campo => ({ campo })), SAP_EQUIPO: bombas,
      LISTA_CAMPOS: [{}], CATALOGO: [{}], CONFIGURACION_HISTORIAL: [{}], RESPUESTAS: [{}], USUARIOS: [{}], ACCESOS: [{}], INFORMES: [{}],
      ASIGNACION_OFICIAL: [{}], ANALISIS: [{}], CAMBIOS_PLANTA: [{}],
    }
    const sinCasos = ENDPOINTS.map(([n]) => n).filter(n => !casos[n]?.length || !R[n])
    comprobar(sinCasos.length === 0, `cada endpoint de contrato.ts tiene su respuesta del demo y sus casos (${ENDPOINTS.length} endpoints${sinCasos.length ? `; faltan: ${sinCasos.join(', ')}` : ''})`)

    const tam = {}
    for (const [nombre, ep] of ENDPOINTS) {
      let malos = [], n = 0, bytes = 0, crudo = 0
      for (const p of casos[nombre] ?? []) {
        n++
        const x = R[nombre](p)
        let texto
        try { texto = JSON.stringify(K.aRespuesta(ep.codec, x)) } catch (e) { malos.push(`${C.urlDe(ep, p)}: aDTO revienta (${e.message})`); continue }
        bytes += texto.length
        crudo += JSON.stringify(x)?.length ?? 0
        let y
        try { y = K.deRespuesta(ep.codec, JSON.parse(texto)) } catch (e) { malos.push(`${C.urlDe(ep, p)}: revivir revienta (${e.message})`); continue }
        const d = diferencia(x, y)
        if (d) malos.push(`${C.urlDe(ep, p)} → ${d}`)
        // Ninguna fecha sin zona en el JSON: un instante sin zona lo leería cada navegador en la suya.
        const sinZona = texto.match(/"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?"/)
        if (sinZona) malos.push(`${C.urlDe(ep, p)}: fecha sin zona en el JSON (${sinZona[0]})`)
      }
      tam[nombre] = { bytes, crudo, n }
      comprobar(malos.length === 0, `${ep.ruta} · ${n} casos: revivir(JSON(aDTO(x))) = x${malos.length ? `\n      ${malos.slice(0, 4).join('\n      ')}` : ''}`)
    }

    // La serie del historiador trae su paso (CONTRATO.md · «Forma de las series»): una sin
    // `pasoH`, o con paso cero, se rechaza al entrar diciendo dónde, en vez de que el vigía
    // suponga un punto por día. Una por hora y con un hueco (null) entra tal cual.
    const conSerie = JSON.parse(JSON.stringify(K.aRespuesta(C.EQUIPO_HOY.codec, R.EQUIPO_HOY({ campo: 'morichal', equipo: 'P-201B' }))))
    const iSerie = conSerie.datos.dispositivos.findIndex(d => d.serie)
    const conPaso = (pasoH, valores) => { const j = structuredClone(conSerie); Object.assign(j.datos.dispositivos[iSerie].serie, { pasoH, valores: valores ?? j.datos.dispositivos[iSerie].serie.valores }); if (pasoH === undefined) delete j.datos.dispositivos[iSerie].serie.pasoH; return j }
    const rechazo = j => { try { K.deRespuesta(C.EQUIPO_HOY.codec, j); return '' } catch (e) { return e instanceof K.ErrorDeContrato ? e.message : `otro error: ${e.message}` } }
    const sinPaso = rechazo(conPaso(undefined)), pasoCero = rechazo(conPaso(0))
    const porHora = K.deRespuesta(C.EQUIPO_HOY.codec, conPaso(1, [1, null, 3])).dispositivos[iSerie].serie
    comprobar(iSerie >= 0 && /dispositivos\[\d+\]\.serie: pasoH/.test(sinPaso) && /pasoH/.test(pasoCero) && porHora.pasoH === 1 && porHora.valores[1] === null,
      `una serie sin paso o con paso cero no entra (${sinPaso || 'entró'}); una por hora con un hueco sí, con el hueco en su lugar`)

    // R7 (#104): lo que llega en null del servidor se vuelve ausente EN EL BORDE: un precio
    // sin configurar no se valora en 0 USD y un lado de alarma en null no es una alarma en 0.
    const conNulos = JSON.parse(JSON.stringify(K.aRespuesta(C.CONFIGURACION_HISTORIAL.codec, s.versiones)))
    for (const v of conNulos.datos) for (const c of Object.values(v.config.campos)) for (const t of c.metas) if (!('netbackUsd' in t)) t.netbackUsd = null
    const vivas = K.deRespuesta(C.CONFIGURACION_HISTORIAL.codec, conNulos)
    const sinPrecio = Object.entries(vivas.at(-1).config.campos).flatMap(([id, c]) => c.metas.filter(t => !('netbackUsd' in t)).map(() => id))
    const { precioEn } = await cargar('/src/entities/configuracion.ts')
    comprobar(conNulos.datos.some(v => Object.values(v.config.campos).some(c => c.metas.some(t => t.netbackUsd === null))) && sinPrecio.includes('zarza')
      && precioEn(vivas.at(-1).config, 'zarza', Date.now()) === undefined && !diferencia(vivas, s.versiones),
      `un precio en null en GET /configuracion/historial entra como «sin precio» (${sinPrecio.join(', ')}), no como 0 USD/bbl`)
    const bombasJ = JSON.parse(JSON.stringify(K.aRespuesta(C.BOMBAS.codec, R.BOMBAS({ campos: ['ceiba'], desde: periodos[0].desde, hasta: periodos[0].hasta }))))
    let ladosNulos = 0
    for (const b of bombasJ.datos) for (const x of b.senales) if (x.alarma) for (const k of ['alta', 'baja']) if (!(k in x.alarma)) { x.alarma[k] = null; ladosNulos++ }
    const catJ = JSON.parse(JSON.stringify(K.aRespuesta(C.CATALOGO.codec, R.CATALOGO())))
    for (const l of Object.values(catJ.datos.campos.ceiba.limites)) if (l.alarma) for (const k of ['alta', 'baja']) if (!(k in l.alarma)) { l.alarma[k] = null; ladosNulos++ }
    const bombasV = K.deRespuesta(C.BOMBAS.codec, bombasJ), catV = K.deRespuesta(C.CATALOGO.codec, catJ)
    const conNulo = [...bombasV.flatMap(b => b.senales.map(x => x.alarma)), ...Object.values(catV.campos.ceiba.limites).map(l => l.alarma)].filter(a => a && (a.alta === null || a.baja === null))
    comprobar(ladosNulos > 0 && conNulo.length === 0 && !diferencia(catV, R.CATALOGO()),
      `${ladosNulos} lados de alarma en null (señales de las bombas y límites del catálogo) entran como ausentes: ninguna pantalla compara contra null`)
    // R8 (#108): el registro de campos se revisa al entrar: un id repetido o vacío no pasa callado.
    const revivirCampos = lista => { try { K.deRespuesta(C.LISTA_CAMPOS.codec, { datos: lista }); return '' } catch (e) { return e instanceof K.ErrorDeContrato ? e.message : `otro error: ${e.message}` } }
    const repetido = revivirCampos([...CAMPOS, { ...CAMPOS[0] }]), sinNombre = revivirCampos([{ ...CAMPOS[0], nombre: '' }])
    comprobar(/viene dos veces/.test(repetido) && /no trae «nombre»/.test(sinNombre) && revivirCampos(CAMPOS) === '',
      `GET /api/campos se revisa al entrar (${repetido}; ${sinNombre})`)

    console.log('\n=== 3. Escrituras: cuerpos y respuestas por JSON ===')
    const s2 = SES.sesion()
    const vuelta = (cod, x) => diferencia(x, K.deRespuesta(cod, JSON.parse(JSON.stringify(K.aRespuesta(cod, x)))))
    const resp = [
      ['R_FIRMA', C.R_FIRMA, { version: s2.versiones.at(-1) }],
      ['R_USUARIO', C.R_USUARIO, { usuario: s2.usuarios.at(-1), acceso: s2.accesos.at(-1) }],
      ['R_AVISO', C.R_AVISO, { aviso: escritas.aviso.aviso }],
      ['R_INFORME', C.R_INFORME, { informe: escritas.informe.informe }],
      ['R_ASIGNACION', C.R_ASIGNACION, { filas: s2.asignacionOficial, carga: s2.cargasAsignacion.at(-1) }],
      ['R_RESPUESTA', C.R_RESPUESTA, { respuesta: s2.ctx.respuestas[bomba.id] }],
      ['R_ANALISIS', C.R_ANALISIS, { analisis: s2.analisis[bomba.id] }],
      ['R_PLANTA', C.R_PLANTA, { planta: s2.plantas.ceiba, cambio: s2.cambiosPlanta.at(-1) }],
      ['R_PLAN', C.R_PLAN, { decision: Object.values(s2.planes)[0] }],
      ['R_CLASIFICACION', C.R_CLASIFICACION, { parada: escritas.clasificacion.parada, guardadas: s2.clasificacionesAnh }],
      ['R_CLASIFICACION (yacimiento)', C.R_CLASIFICACION, { parada: escritas.yacimiento.parada, guardadas: {} }],
      ['R_CONFIRMACION', C.R_CONFIRMACION, { lote: escritas.confirmacion.lote, paradas: escritas.confirmacion.paradas }],
      ['R_VISTA_PREVIA', C.R_VISTA_PREVIA, { impacto: escritas.vistaPrevia.impacto }],
      ['R_TOPOLOGIA_CSV', C.R_TOPOLOGIA_CSV, (({ ok: _ok, ...x }) => x)(escritas.importar)],
    ].map(([n, cod, x]) => [n, vuelta(cod, x)])
    comprobar(resp.every(([, d]) => !d), `las respuestas de las ${resp.length} escrituras vuelven iguales por JSON${resp.filter(([, d]) => d).map(([n, d]) => `; ${n}: ${d}`).join('')}`)
    // El cuerpo de una firma lleva la configuración entera: tiene que ser JSON puro.
    const cuerpoFirma = { config: s2.ctx.config, motivo: 'x', base: 1 }
    comprobar(!diferencia(cuerpoFirma, JSON.parse(JSON.stringify(cuerpoFirma))), 'el cuerpo de POST /configuracion (la configuración entera) es JSON puro: vuelve igual')

    console.log('\n=== 4. Rutas: una por recurso, sin choques ===')
    const rutas = [...ENDPOINTS.map(([, e]) => `GET ${e.ruta}`),
      'POST /configuracion', 'PATCH /usuarios/:id', 'POST /usuarios', 'POST /sap/avisos', 'POST /informes', 'POST /asignacion-oficial',
      'POST /paradas/:evento/respuesta', 'POST /analisis/:evento', 'POST /planta/cambios', 'POST /planes/:id',
      'POST /anh/paradas/:id/clasificacion', 'POST /anh/paradas/:id/yacimiento', 'POST /anh/paradas/confirmar',
      'POST /configuracion/vista-previa', 'POST /topologia/importar']
    const repetidas = rutas.filter((r, i) => rutas.indexOf(r) !== i)
    // Dos rutas chocan si un mismo camino puede caer en las dos: mismo método,
    // mismo número de tramos y en cada tramo el mismo literal o un :parámetro.
    const choques = []
    for (let i = 0; i < rutas.length; i++) for (let j = i + 1; j < rutas.length; j++) {
      const [ma, ra] = rutas[i].split(' '), [mb, rb] = rutas[j].split(' ')
      const a = ra.split('/'), b = rb.split('/')
      if (ma !== mb || a.length !== b.length) continue
      if (a.every((x, k) => x === b[k] || x.startsWith(':') || b[k].startsWith(':'))) choques.push(`${rutas[i]} ↔ ${rutas[j]}`)
    }
    comprobar(repetidas.length === 0 && choques.length === 0, `${rutas.length} rutas sin repetir y sin dos que atiendan el mismo camino${[...repetidas, ...choques].map(x => `; ${x}`).join('')}`)
    const vistas = ENDPOINTS.filter(([n]) => !['MENSAJES', 'SAP_AVISOS', 'SAP_ORDENES', 'SAP_EQUIPOS', 'SAP_EQUIPO', 'LISTA_CAMPOS', 'CATALOGO', 'CONFIGURACION_HISTORIAL', 'RESPUESTAS', 'USUARIOS', 'ACCESOS', 'INFORMES', 'ASIGNACION_OFICIAL', 'ANALISIS', 'CAMBIOS_PLANTA'].includes(n))
    comprobar(vistas.every(([, e]) => e.ruta.startsWith('/vistas/')) && ENDPOINTS.every(([, e]) => !e.ruta.startsWith('/campos/')),
      'lo calculado vive bajo /vistas/ y ninguna consulta de pantalla usa /campos/… (los insumos del borde): la misma ruta no sirve el insumo y la vista')

    console.log('\n=== 5. Lo que pesa cada respuesta ===')
    const kb = n => `${(n / 1024).toFixed(0)} KB`
    const lib = tam.DIFERIDOS, men = tam.DIFERIDOS_MENSUAL
    console.log(`    /vistas/diferidos: ${kb(lib.bytes)} en ${lib.n} casos (con el pozo y el evento en cada tramo eran ${kb(lib.crudo)})`)
    console.log(`    /vistas/diferidos/mensual: ${kb(men.bytes)} en ${men.n} casos (sin los tramos, el detalle por pozo, las preguntas ni la custodia de cada mes)`)
    comprobar(lib.bytes < lib.crudo * 0.7, `el libro con las entidades por clave pesa menos de 70 % que con ellas anidadas (${kb(lib.bytes)} contra ${kb(lib.crudo)})`)
    const cuerpoMensual = JSON.stringify(K.aRespuesta(C.DIFERIDOS_MENSUAL.codec, R.DIFERIDOS_MENSUAL({ campos: TODOS })))
    const mensualPortafolio = cuerpoMensual.length
    const mensualViejo = JSON.stringify(L.serieMensual(TODOS, s.ctx)).length
    const conDetalle = JSON.parse(cuerpoMensual).datos.filter(m => ['tramos', 'porPozo', 'preguntas', 'custodia'].some(k => k in m.libro)).length
    // Con el agua nueva (9-oct-2026) La Ceiba ya no cierra los 18 pozos en cada parada de
    // P-201B: hay menos tramos, los libros enteros pesan menos y la proporción pasó de
    // menos de 10 % a 10,2 %. Lo que se prueba es que ningún mes lleva su detalle.
    comprobar(conDetalle === 0 && mensualPortafolio < mensualViejo * 0.12, `la serie mensual del portafolio va sin los tramos, el detalle por pozo, las preguntas ni la custodia de cada mes: ${kb(mensualPortafolio)} contra ${kb(mensualViejo)} con trece libros enteros`)

    console.log('\n=== 6. La costura con la fuente http, de punta a punta ===')
    let salida = '', error = ''
    try { salida = execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--http'], { cwd: RAIZ, encoding: 'utf8', env: { ...process.env, VITE_FUENTE: 'http' } }) }
    catch (e) { salida = String(e.stdout ?? ''); error = String(e.stderr ?? e.message).slice(0, 600) }
    process.stdout.write(salida)
    const m = salida.match(/(\d+) de (\d+) comprobaciones http bien/)
    comprobar(!!m && m[1] === m[2] && !error, `con VITE_FUENTE=http todas las comprobaciones de la costura pasan${error ? ` (${error})` : ''}`)

    console.log('\n=== 7. VITE_API_URL relativa o absoluta: la configuración arranca y la política deja hablar con la API ===')
    // R26: con una raíz relativa (`/api`, la que .env.example permite) el
    // `new URL(...)` de vite.config.ts tumbaba el build y el desarrollo. Se
    // carga la configuración REAL, como la cargan `vite build` y `npm run dev`,
    // y se corre su plugin de la política sobre un HTML.
    const conEnv = async (vars, hacer) => {
      const antes = { VITE_FUENTE: process.env.VITE_FUENTE, VITE_API_URL: process.env.VITE_API_URL }
      for (const [k, x] of Object.entries(vars)) if (x === undefined) delete process.env[k]; else process.env[k] = x
      try { return await hacer() }
      finally { for (const [k, x] of Object.entries(antes)) if (x === undefined) delete process.env[k]; else process.env[k] = x }
    }
    const configCon = (vars, command) => conEnv(vars, async () => {
      try { return { config: (await loadConfigFromFile({ command, mode: 'production', isSsrBuild: false, isPreview: false }, `${RAIZ}vite.config.ts`, RAIZ, 'silent')).config } }
      catch (e) { return { error: e.message } }
    })
    const politicaCon = async vars => {
      const r = await configCon(vars, 'build')
      if (r.error) return { error: r.error }
      const csp = r.config.plugins.flat(Infinity).find(p => p?.name === 'trim-csp')
      const html = await csp.transformIndexHtml.handler('<html><head><meta charset="UTF-8" /></head><body><script>1</script></body></html>')
      return { connect: html.match(/connect-src ([^;"]*)/)?.[1], simulador: r.config.plugins.flat(Infinity).some(p => p?.name === 'trim-simulador-api') }
    }
    // El demo se FIJA, no se borra: sin la variable en el proceso, `loadEnv`
    // cae a la de un .env.local del desarrollador y la prueba medía su backend.
    const demo = await politicaCon({ VITE_FUENTE: 'demo', VITE_API_URL: '' })
    const relativa = await politicaCon({ VITE_FUENTE: 'http', VITE_API_URL: '/api' })
    const absoluta = await politicaCon({ VITE_FUENTE: 'http', VITE_API_URL: 'https://api.operadora.co:8443/trim/api/' })
    comprobar(demo.connect === "'self'" && relativa.connect === "'self'" && absoluta.connect === "'self' https://api.operadora.co:8443",
      `la política del build: demo «${demo.connect ?? demo.error}», relativa /api «${relativa.connect ?? relativa.error}» (el mismo dominio ya es 'self'), absoluta «${absoluta.connect ?? absoluta.error}» (su origen, sin camino)`)
    const devRel = await configCon({ VITE_FUENTE: 'http', VITE_API_URL: '/api' }, 'serve')
    const devAbs = await configCon({ VITE_FUENTE: 'http', VITE_API_URL: 'http://servidor:8080/v2/api' }, 'serve')
    const proxy = devAbs.config?.server?.proxy?.['/api']
    comprobar(!devRel.error && !devRel.config.server.proxy && proxy?.target === 'http://servidor:8080' && proxy.rewrite('/api/vistas/diferidos?campos=ceiba') === '/v2/api/vistas/diferidos?campos=ceiba'
      && !absoluta.simulador && relativa.simulador,
      `en desarrollo, la relativa no arma proxy (no hay otro origen) y la absoluta manda /api a su servidor con su camino (${proxy ? proxy.rewrite('/api/x') : devAbs.error ?? devRel.error}); el simulador solo se monta sin backend absoluto`)
    const sinEsquema = await politicaCon({ VITE_FUENTE: 'http', VITE_API_URL: 'servidor:8080/api' })
    comprobar(/VITE_API_URL=«servidor:8080\/api» no sirve: va absoluta con http\(s\)/.test(sinEsquema.error ?? ''),
      `una raíz que no es ni absoluta ni relativa se rechaza diciendo qué se esperaba (${(sinEsquema.error ?? 'no se rechazó').slice(0, 90)})`)
    const otroDominio = await politicaCon({ VITE_FUENTE: 'http', VITE_API_URL: '//api.otro.co/api' })
    comprobar(/VITE_API_URL=«\/\/api\.otro\.co\/api» no sirve: le falta el esquema/.test(otroDominio.error ?? ''),
      `«//api.otro.co/api» (otro dominio sin esquema) se rechaza en vez de construir con connect-src 'self' (${(otroDominio.error ?? 'no se rechazó').slice(0, 90)})`)
    // fuente.ts: la raíz relativa se respeta también en desarrollo; la absoluta va por el proxy.
    const raizEnDesarrollo = vars => conEnv(vars, async () => {
      const w = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
      try { return (await w.ssrLoadModule('/src/shared/api/fuente.ts')).API_URL } finally { await w.close() }
    })
    const raices = [await raizEnDesarrollo({ VITE_API_URL: '/backend/' }), await raizEnDesarrollo({ VITE_API_URL: 'http://servidor:8080/api' }), await raizEnDesarrollo({ VITE_API_URL: undefined })]
    comprobar(raices.join() === '/backend,/api,/api',
      `en desarrollo el front pide a la raíz relativa tal cual y a /api (el proxy) cuando es absoluta o no está (${raices.join(', ')})`)

    console.log('\n=== 8. GET /api/usuarios sin usuarios:administrar: la forma mínima de cada persona ===')
    // R32 (#171): quien no administra no recibe el correo, el día del acceso
    // ni el WhatsApp de quien no recibe alertas. Lo que sí recibe tiene que
    // bastarle a cada regla que corre en sus pantallas.
    const U = await cargar('/src/entities/usuarios.ts')
    const { destinatarios } = await cargar('/src/entities/mensajes.ts')
    // Un registro con alguien de otro campo, un gerente sin alertas con número y un suspendido.
    const registro = [...U.USUARIOS_INICIALES,
      { id: 'u90', nombre: 'Persona de Zarza', correo: 'zarza@operadora.example', rolId: 'oper', campos: ['zarza'], estado: 'activo', desde: '2026-09-10', telefono: '+573005550190', alertas: true },
      { id: 'u91', nombre: 'Supervisor Suspendido', correo: 'susp@operadora.example', rolId: 'sup', campos: ['ceiba'], estado: 'suspendido', desde: '2026-09-02', telefono: '+573005550191', alertas: true, antesDeSuspender: 'activo' }]
    const quien = 'oper', yoR = registro.find(u => u.id === quien)
    const vista = U.registroVisible(registro, quien, false)
    const otros = vista.filter(u => u.id !== quien)
    const PERMITIDAS = ['id', 'nombre', 'rolId', 'campos', 'estado', 'alertas', 'telefono']
    const deMas = otros.flatMap(u => Object.keys(u).filter(k => !PERMITIDAS.includes(k)).map(k => `${u.id}.${k}`))
    const comparte = u => yoR.campos === 'todos' || u.campos === 'todos' || u.campos.some(c => yoR.campos.includes(c))
    comprobar(U.esCompleta(vista.find(u => u.id === quien)) && deMas.length === 0 && otros.every(u => !U.esCompleta(u))
      && vista.length === registro.filter(comparte).length && !vista.some(u => u.id === 'u90'),
      `quien pregunta se ve completo; de los demás (${otros.length}) solo llegan ${PERMITIDAS.join(', ')}${deMas.length ? ` (de más: ${deMas.join(', ')})` : ''}, y solo de quien comparte un campo con él`)
    const conNumero = otros.filter(u => 'telefono' in u)
    comprobar(conNumero.every(u => U.recibeAlertas(u)) && conNumero.length === registro.filter(u => u.id !== quien && comparte(u) && U.recibeAlertas(u)).length
      && !otros.find(u => u.id === 'ger')?.telefono && !otros.find(u => u.id === 'u91')?.telefono,
      `el WhatsApp solo de quien recibe alertas (${conNumero.length}): ni el del gerente ni el de un suspendido`)
    const ids = xs => xs.map(u => u.id).join()
    const enSusCampos = (yoR.campos === 'todos' ? CAMPOS.map(c => c.id) : yoR.campos)
    comprobar(enSusCampos.every(c => ids(destinatarios(vista, ['sup', 'oper'], c)) === ids(destinatarios(registro, ['sup', 'oper'], c)))
      && ids(U.camposAsignados(rolPorId(quien), vista)) === ids(U.camposAsignados(rolPorId(quien), registro))
      && ['sup', 'oper', 'tec'].every(r => U.personaDelRol(vista, r)?.id === U.personaDelRol(registro, r)?.id),
      'con la forma mínima dan lo mismo que con el registro entero: a quién le llega cada alerta en sus campos, sus campos asignados y la persona de cada rol')
    let aMedias = ''
    try { U.registroCompleto(vista) } catch (e) { aMedias = e.message }
    comprobar(/sin correo ni día de acceso: con usuarios:administrar el registro llega completo/.test(aMedias) && U.registroCompleto(U.registroVisible(registro, 'ger', true)).length === registro.length,
      'con la capacidad llega el registro entero; si a Accesos le llegara la forma mínima, lo dice en vez de editar sin correo')
    const jVista = JSON.parse(JSON.stringify(K.aRespuesta(C.USUARIOS.codec, vista)))
    comprobar(!diferencia(K.deRespuesta(C.USUARIOS.codec, jVista), vista), 'la forma mínima sobrevive al paso por JSON como la completa')

    console.log('\n=== 9. Lo que los documentos y los comentarios nombran existe ===')
    // R29 (#117) y R27: un comentario que cita una ruta que el contrato no tiene
    // (o que dice expresamente que ya no hay) manda al backend a construir lo
    // que el front no pide; un documento que nombra un script que no existe da
    // «Missing script» a quien lo sigue.
    const { readFileSync, readdirSync, existsSync } = await import('node:fs')
    const leerTexto = f => readFileSync(`${RAIZ}${f}`, 'utf8')
    const normaliza = r => r.replace(/[?#].*$/, '').replace(/[.:,;)]+$/, '').replace(/\/$/, '').split('/').map(t => (t.startsWith(':') || t.includes('${') ? ':' : t)).join('/')
    const CITA = /\b(GET|POST|PATCH|PUT|DELETE) (\/api\/[\w\-/:{}$.]*)/g
    const contratoMd = leerTexto('CONTRATO.md')
    const documentadas = new Set([...contratoMd.matchAll(CITA)].map(m => `${m[1]} ${normaliza(m[2])}`))
    for (const [, ep] of ENDPOINTS) documentadas.add(`GET ${normaliza(`/api${ep.ruta}`)}`)
    const citas = readdirSync(`${RAIZ}src`, { recursive: true }).filter(f => /\.tsx?$/.test(f) && !f.startsWith('entities/datos'))
      .flatMap(f => [...leerTexto(`src/${f}`).matchAll(CITA)].map(m => ({ f, ruta: `${m[1]} ${normaliza(m[2])}` })))
    const sinContrato = citas.filter(c => !documentadas.has(c.ruta))
    comprobar(citas.length > 100 && sinContrato.length === 0,
      `las ${citas.length} rutas que citan los comentarios de src/ están en CONTRATO.md o en contrato.ts${sinContrato.map(c => `; ${c.f}: ${c.ruta}`).join('')}`)
    const yaNoHay = [...contratoMd.matchAll(/ya no hay `([^`]+)`/g)].map(m => normaliza(m[1].startsWith('/api') ? m[1] : `/api${m[1]}`))
    const muertas = citas.filter(c => yaNoHay.includes(c.ruta.split(' ')[1]))
    comprobar(yaNoHay.length > 0 && muertas.length === 0,
      `ningún comentario cita una ruta que el contrato dice que ya no hay (${yaNoHay.join(', ')})${muertas.map(c => `; ${c.f}: ${c.ruta}`).join('')}`)
    const { scripts } = JSON.parse(leerTexto('package.json'))
    const docs = ['README.md', 'CONTRATO.md', '.env.example']
    const nombrados = docs.flatMap(d => [...leerTexto(d).matchAll(/npm run ([\w:-]+)/g)].map(m => ({ d, s: m[1] })))
    const faltan = nombrados.filter(n => !(n.s in scripts))
    const archivos = docs.flatMap(d => [...leerTexto(d).matchAll(/node ((?:scripts|e2e|simulador-api|demo)\/[\w.-]+\.mjs)/g)].map(m => ({ d, s: m[1] })))
    const sinArchivo = archivos.filter(a => !existsSync(`${RAIZ}${a.s}`))
    comprobar(nombrados.length > 5 && faltan.length === 0 && sinArchivo.length === 0 && 'test' in scripts && 'e2e' in scripts,
      `los ${nombrados.length} «npm run …» y ${archivos.length} «node …» de README, CONTRATO y .env.example existen${[...faltan, ...sinArchivo].map(n => `; ${n.d}: ${n.s}`).join('')}`)

    console.log('\n=== 10. El choke y el árbol de paradas: lo que el contrato rechaza y lo que calcula ===')
    const CONF = await cargar('/src/entities/configuracion.ts'), CHO = await cargar('/src/entities/choke.ts'), ANC = await cargar('/src/entities/anh-catalogo.ts')
    const { AHORA } = await cargar('/src/entities/reloj.ts')
    const mesA = { campos: ['ceiba'], desde: new Date(cerrado.desde), hasta: new Date(cerrado.hasta) }
    // a. El códec de la clasificación rechaza lo incoherente al entrar, diciendo dónde y qué (P1 §2.2 y §5.4).
    const sa = SES.sesion()
    const jAnh = JSON.parse(JSON.stringify(K.aRespuesta(C.PARADAS_ANH.codec, ARB.pedirParadasAnh(mesA, sa.ctx, sa.clasificacionesAnh))))
    const iNp = jAnh.datos.findIndex(p => p.clasificacion.planeacion?.valor === 'no-planeada' && p.clasificacion.n1 && p.clasificacion.n2)
    const revivirAnh = j => { try { K.deRespuesta(C.PARADAS_ANH.codec, j); return '' } catch (e) { return e instanceof K.ErrorDeContrato ? e.message : `otro error: ${e.message}` } }
    const cruzada = structuredClone(jAnh); cruzada.datos[iNp].clasificacion.planeacion.valor = 'planeada'
    const otroN2 = ANC.N2_CIRCULAR.find(n => n.n1 !== jAnh.datos[iNp].clasificacion.n1.valor && n.n1.startsWith('NP_')).codigo
    const ajenoN2 = structuredClone(jAnh); ajenoN2.datos[iNp].clasificacion.n2.valor = otroN2
    const sinQuien = structuredClone(jAnh); Object.assign(sinQuien.datos[iNp].clasificacion.responsable, { procedencia: 'confirmado' })
    const mCruzada = revivirAnh(cruzada), mAjeno = revivirAnh(ajenoN2), mQuien = revivirAnh(sinQuien)
    comprobar(iNp >= 0 && revivirAnh(jAnh) === '' && new RegExp(`^\\[${iNp}\\]\\.clasificacion: la clasificación no es coherente: .*no va con`).test(mCruzada)
      && /no es una causa de/.test(mAjeno) && /tiene que decir quién lo hizo y a qué hora/.test(mQuien),
      `una parada que llega planeada con una causa no planeada, con un detalle de otra causa o confirmada sin quién no entra (${mCruzada.slice(0, 110)}…)`)
    // La forma ligera: lo que repite la clasificación de la fila no viaja; lo que difiere, sí, y vuelve igual.
    const ligeras = jAnh.datos.filter(p => !('borrador' in p.propuesta) && !('clasificacion' in p.propuesta)).length
    const conClasif = ARB.pedirParadasAnh(mesA, sa.ctx, sa.clasificacionesAnh).find(p => p.propuesta.clasificacion)
    const distinta = { ...conClasif, propuesta: { ...conClasif.propuesta, borrador: { ...conClasif.propuesta.borrador, cauGral: { valor: 'otra causa general', procedencia: 'regla' } } } }
    const jDistinta = JSON.parse(JSON.stringify(K.aRespuesta(C.PARADAS_ANH.codec, [distinta])))
    comprobar(ligeras === jAnh.datos.length && 'borrador' in jDistinta.datos[0].propuesta && !('clasificacion' in jDistinta.datos[0].propuesta)
      && !diferencia(K.deRespuesta(C.PARADAS_ANH.codec, jDistinta), [distinta]),
      `propuesta.borrador y propuesta.clasificacion no viajan cuando son la clasificación de la fila (${ligeras} de ${jAnh.datos.length} filas) y se reponen al entrar; uno distinto viaja y vuelve igual`)
    // b. Las escrituras rechazan en palabras, en el orden del contrato.
    const libre = ARB.pedirParadasAnh(mesA, sa.ctx, sa.clasificacionesAnh).find(p => p.estado === 'propuesta' && p.clasificacion.planeacion?.valor === 'no-planeada'
      && !Object.keys(sa.clasificacionesAnh).some(k => k === p.id || k === p.eventoId))
    const rech = {
      incoherente: await E.clasificarParada({ rolId: 'sup' }, libre.id, { pasos: { planeacion: 'planeada', n1: 'NP_SUB' } }),
      operadorTramo: await E.clasificarParada({ rolId: 'oper' }, libre.id, { pasos: { choke: 'planta' } }),
      yacimientoPorPaso: await E.clasificarParada({ rolId: 'sup' }, libre.id, { pasos: { choke: 'reservorio' } }),
      yacimientoSupervisor: await E.declararYacimientoAnh({ rolId: 'sup' }, libre.id, { evidencia: 'prueba' }),
      yacimientoSinEvidencia: await E.declararYacimientoAnh({ rolId: 'conf' }, libre.id, { evidencia: '   ' }),
      otraCadena: await E.clasificarParada({ rolId: 'sup' }, libre.id, { pasos: { impacto: 'diferida' }, cadena: 'lo que vio otra persona' }),
      gerente: await E.clasificarParada({ rolId: 'ger' }, libre.id, { pasos: { impacto: 'diferida' } }),
      noExiste: await E.clasificarParada({ rolId: 'sup' }, 'EP-NO-EXISTE@2026-09-01#1', { pasos: { impacto: 'diferida' } }),
      n2Inventado: await E.clasificarParada({ rolId: 'sup' }, libre.id, { pasos: { n2: 'NP_SUB/no-existe' } }),
      sinPasos: await E.clasificarParada({ rolId: 'sup' }, libre.id, { pasos: {} }),
      confirmaTramo: await E.confirmarParadasAnh({ rolId: 'oper' }, { ids: [libre.id], pasos: ['choke'] }),
      loteOperador: await E.confirmarParadasAnh({ rolId: 'oper' }, { ids: [libre.id, aYacimientoId()] }),
    }
    function aYacimientoId() { return escritas.yacimiento.parada.id }
    const esperado = {
      incoherente: /es una causa no planeada: cambie primero «¿Planeada\?»/, operadorTramo: /^Su rol no dice «Dónde se trabó»: lo dice supervisión, producción/,
      yacimientoPorPaso: /«En el yacimiento» lo pone producción o confiabilidad/, yacimientoSupervisor: /lo ponen producción o confiabilidad/,
      yacimientoSinEvidencia: /diga qué lo muestra/, otraCadena: /alguien cambió esta parada/, gerente: /Su rol no clasifica paradas/,
      noExiste: /no está entre las de la ANH/, n2Inventado: /no es una causa del catálogo de la ANH/, sinPasos: /No llegó ningún paso/,
      confirmaTramo: /^Su rol no confirma «Dónde se trabó»/, loteOperador: /lo hacen supervisión o producción/,
    }
    const noRechazadas = Object.entries(rech).filter(([k, r]) => r.ok || !esperado[k].test(r.error))
    comprobar(noRechazadas.length === 0 && SES.sesion().clasificacionesAnh === sa.clasificacionesAnh,
      `se rechazan en palabras y no guardan nada: la clasificación incoherente («${rech.incoherente.error}»), el tramo dicho por el operador, el yacimiento fuera de producción y confiabilidad o sin evidencia, una cadena que cambió (409), una confirmación de pasos ajenos al rol («${rech.confirmaTramo.error}») y un lote del operador${noRechazadas.map(([k, r]) => `; ${k}: ${r.ok ? 'pasó' : r.error}`).join('')}`)
    // c. El toque del operador confirma solo lo suyo (¿planeada?, qué pasó): el paso 2 sigue siendo de TRIM.
    const delOperador = await E.confirmarParadasAnh({ rolId: 'oper' }, { ids: [libre.id] })
    const fo = delOperador.paradas?.[0]
    comprobar(delOperador.ok && fo.clasificacion.planeacion.procedencia === 'confirmado' && fo.clasificacion.impacto.procedencia === 'confirmado'
      && fo.clasificacion.choke.procedencia === 'regla' && fo.estado === 'propuesta' && !delOperador.lote,
      `el operador confirma «¿Planeada?» y «Qué pasó»; «Dónde se trabó» queda como propuesta de TRIM y la fila sigue ${fo?.estado} (P1 §1.3)`)
    // d. Cambiar lo que dijo una persona pide motivo, y el motivo queda en el porqué.
    const sinMotivo = await E.clasificarParada({ rolId: 'sup' }, libre.id, { pasos: { impacto: 'perdida' } })
    const conMotivo = await E.clasificarParada({ rolId: 'sup' }, libre.id, { pasos: { impacto: 'perdida' }, motivo: 'Se regó crudo en la locación' })
    const im = conMotivo.parada?.clasificacion.impacto
    comprobar(!sinMotivo.ok && /Falta el motivo/.test(sinMotivo.error) && conMotivo.ok && im.valor === 'perdida' && im.procedencia === 'corregido' && im.porque === 'Se regó crudo en la locación' && im.porId === 'sup',
      `corregir lo que ya dijo una persona pide motivo («${sinMotivo.error}»); con él queda corregido, con quién y por qué`)
    // e. Una corrección para toda la cascada: las filas de la misma raíz cambian juntas (Unicidad, C24 p.5).
    const historia = { campos: ['ceiba'], desde: new Date(cal[0].desde), hasta: AHORA }
    const deCascada = ARB.pedirParadasAnh(historia, SES.sesion().ctx, SES.sesion().clasificacionesAnh).find(p => p.raiz !== p.eventoId && p.causa.tipo === 'aire')
    const enCascada = await E.clasificarParada({ rolId: 'sup' }, deCascada.id, { pasos: { responsable: 'op-mantenimiento' }, aplicarALaCascada: true })
    const hermanas = ARB.pedirParadasAnh(historia, SES.sesion().ctx, SES.sesion().clasificacionesAnh).filter(p => p.raiz === deCascada.raiz)
    comprobar(enCascada.ok && hermanas.length > 5 && hermanas.every(p => p.clasificacion.responsable?.procedencia !== 'regla' && p.clasificacion.responsable?.porId === 'sup')
      && new Set(hermanas.map(p => p.eventoId)).size === hermanas.filter(p => p.tramo.n === 1).length,
      `una corrección con «aplicarALaCascada» vale para las ${hermanas.length} filas de la raíz ${deCascada.raiz} (${new Set(hermanas.map(p => p.pozo)).size} pozos)`)
    // e2. Lo guardado en el tramo de exceso del programa es otra decisión: lo que se
    //     dice del evento entero no lo borra (guardarClasificacion; v_clasificacion_fuente).
    const historiaTodos = { campos: ['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza'], desde: new Date(cal[0].desde), hasta: AHORA }
    const todas = ARB.pedirParadasAnh(historiaTodos, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    const exc = todas.find(p => p.exceso && todas.some(q => q.eventoId === p.eventoId && !q.exceso))
    const hermanaExc = exc && todas.find(q => q.eventoId === exc.eventoId && !q.exceso)
    const enExceso = exc && await E.clasificarParada({ rolId: 'jefe' }, exc.id, { pasos: { impacto: exc.clasificacion.impacto.valor } })
    const enEvento = hermanaExc && await E.clasificarParada({ rolId: 'jefe' }, hermanaExc.id, { pasos: { responsable: 'op-mantenimiento' }, aplicarAlEvento: true })
    const excDespues = exc && ARB.pedirParadaAnh(exc.id, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    comprobar(!!exc && enExceso?.ok && enEvento?.ok && Object.hasOwn(SES.sesion().clasificacionesAnh, exc.id)
      && excDespues?.clasificacion.impacto.porId === 'jefe' && excDespues?.clasificacion.impacto.procedencia !== 'regla',
      `guardar en el evento ${exc?.eventoId ?? '(no hay un tramo de exceso en el demo)'} no borra lo que se guardó en su tramo de exceso ${exc?.id ?? ''}: sigue con lo que dijo el jefe de mantenimiento${enExceso?.ok === false ? ` (en el exceso: ${enExceso.error})` : ''}${enEvento?.ok === false ? ` (en el evento: ${enEvento.error})` : ''}${exc && !Object.hasOwn(SES.sesion().clasificacionesAnh, exc.id) ? ' (se borró lo guardado del exceso)' : ''}${excDespues ? ` [impacto: ${excDespues.clasificacion.impacto.procedencia}, ${excDespues.clasificacion.impacto.porId ?? 'sin persona'}]` : ''}`)
    // f. La calidad de la clasificación cuadra por paso, por regla y por equipo.
    const cal10 = ARB.pedirCalidadAnh(historia, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    const choke10 = cal10.porPaso.find(x => x.paso === 'choke')
    comprobar(cal10.porPaso.every(x => x.propuestas + x.declaradas + x.enFalta === x.paradas && x.paradas === cal10.paradas)
      && choke10.corregidas >= 1 && choke10.corregidas === cal10.porRegla.filter(r => r.paso === 'choke').reduce((a, r) => a + r.corregidas, 0)
      && choke10.corregidas === cal10.chokePorEquipo.reduce((a, e) => a + e.corregidas, 0) && cal10.porPaso.find(x => x.paso === 'responsable').avaladas >= hermanas.length,
      `la calidad de La Ceiba en 13 meses: ${cal10.paradas} filas; «Dónde se trabó»: ${choke10.avaladas} avaladas, ${choke10.corregidas} corregidas de ${choke10.propuestas} propuestas; ${cal10.sinTopologia.length} equipos sin topología`)
    // g. La vista previa: P-201B al servicio de un solo pozo cambia el tramo de sus paradas, no lo que limita ni el libro.
    const vp = escritas.vistaPrevia.impacto.campos[0]
    comprobar(escritas.vistaPrevia.impacto.campos.length === 1 && vp.campoId === 'ceiba' && vp.limitaAntes === 'pozos' && vp.limitaDespues === 'pozos'
      && vp.paradasQueCambian.total > 0 && vp.paradasQueCambian.porTramo.every(x => x.de === 'planta' && x.a === 'pozo')
      && vp.criticidad.length === 1 && vp.criticidad[0].equipo === 'P-201B' && vp.criticidad[0].tramoAntes === 'planta' && vp.criticidad[0].tramoDespues === 'pozo'
      && /no cambia/.test(vp.texto[0]) && /El libro no cambia/.test(vp.texto.at(-1)),
      `si P-201B sirviera a un solo pozo: ${vp.texto.slice(0, 3).join(' · ')}`)
    // h. Config.topologia se firma como la demás configuración técnica y entra en
    //    diferenciasPorGrupo, validarConfig, camposTocados y normalizarConfig.
    const firmaTopo = SES.sesion().versiones.at(-1), base10 = SES.sesion().ctx.config
    const lineasTopo = firmaTopo.cambios.filter(x => x.startsWith('Topología'))
    const otraVez = CONF.diferenciasPorGrupo(base10, { ...base10, topologia: base10.topologia.map(e => (e.elemento === 'P-201B' ? { ...e, alcance: 'compartido', choke: 'planta', pozos: ['LC-16', 'LC-07'] } : e)) })
    comprobar(lineasTopo.length === 1 && /^Topología de La Ceiba: se firma con \d+ elementos; antes regía la que TRIM deriva del registro$/.test(lineasTopo[0])
      && otraVez.metas.length === 0 && otraVez.tecnica.length === 1
      && /^Topología: P-201B \(La Ceiba\): le sirve a un solo pozo \(LC-16\) → le sirve a varios pozos \(LC-16, LC-07\); se traba en el pozo → en la planta$/.test(otraVez.tecnica[0])
      && CHO.topologiaFirmada('ceiba', SES.sesion().ctx) && CHO.elementoDe('ceiba', 'P-201B', SES.sesion().ctx)?.choke === 'pozo' && !CHO.topologiaFirmada('morichal', SES.sesion().ctx),
      `la topología se firma como la demás configuración técnica (técnica, config:firmar) y el historial lo dice en palabras: «${lineasTopo[0]}»; después, elemento por elemento: «${otraVez.tecnica[0]}»`)
    const mala = { ...base10, topologia: [{ elemento: 'P-201B', choke: 'pozo', alcance: 'dedicado', pozos: ['LC-16', 'LC-07'], campoId: 'ceiba' },
      { elemento: 'X-1', choke: 'planta', alcance: 'compartido', pozos: ['A', 'B'], campoId: 'no-es-campo' }, { elemento: 'K-101', choke: 'pozo', alcance: 'compartido', pozos: ['LC-01', 'LC-99'], campoId: 'ceiba' }] }
    const errs = CONF.validarConfig(mala, base10, '2026-10-01', AHORA.getTime())
    const sinPozos = CONF.validarConfig(mala, base10, '2026-10-01', AHORA.getTime(), () => undefined)
    const global = { ...base10, topologia: [...(base10.topologia ?? []), { elemento: 'SE-2', choke: 'planta', alcance: 'compartido', pozos: ['LC-01', 'LC-02'] }] }
    const normal = CONF.normalizarConfig({ ...base10, topologia: [{ elemento: 'SE-2', choke: 'planta', alcance: 'compartido', pozos: ['LC-01', 'LC-02'], campoId: null, casoBorde: null, nombre: 'Subestación 13,8 kV', clase: 'servicio' }] })
    comprobar(errs.some(x => /P-201B \(ceiba\): es dedicado, así que le sirve a un solo pozo \(tiene 2\)/.test(x)) && errs.some(x => /«no-es-campo» no es un campo registrado/.test(x))
      && errs.some(x => /K-101 \(ceiba\): el choke guardado/.test(x)) && errs.some(x => /el pozo LC-99 no es de ese campo/.test(x)) && !sinPozos.some(x => /LC-99/.test(x))
      && CONF.camposTocados(base10, global).length === Object.keys(base10.campos).length && CONF.camposTocados(base10, mala).join() === 'ceiba,no-es-campo'
      && !('topologia' in CONF.normalizarConfig({ ...base10, topologia: [] })) && Object.keys(normal.topologia[0]).sort().join() === 'alcance,choke,elemento,pozos',
      `una topología con un dedicado de dos pozos, un campo sin registrar, un tramo que no sale del alcance o un pozo ajeno no se firma (${errs.length} reglas); un elemento sin campo toca todos los campos; vacía, con null o con lo que trae la vista (nombre, clase) se normaliza a la forma firmada`)
    // i. La carga por CSV: lo que bloquea, por fila; el caso de borde avisa sin bloquear.
    const csv = await E.importarTopologia({ rolId: 'adm' }, { campo: 'ceiba', texto: 'equipo,pozos\nSE-2,todos\nNO-EXISTE,LC-01\nP-201B,"LC-16, LC-07"\np-201b,LC-01\nK-101,LC-99\nV-101,\n' })
    const bloquean = csv.hallazgos?.filter(h => h.bloquea).map(h => h.fila).join()
    const mpp = escritas.importar.hallazgos.find(h => h.equipo === 'MPP-301')
    comprobar(csv.ok && bloquean === '3,5,6,7' && csv.topologia.map(e => `${e.elemento}:${e.alcance}:${e.pozos.length}`).join() === `SE-2:compartido:${MED.pedirPozosDelCampo('ceiba').length},P-201B:compartido:2`
      && csv.filas === 6 && escritas.importar.topologia.find(e => e.elemento === 'MPP-301')?.casoBorde === 'misma-locacion' && mpp && !mpp.bloquea
      && !(await E.importarTopologia({ rolId: 'sup' }, { campo: 'ceiba', texto: 'SE-2;todos' })).ok,
      `el CSV dice por fila lo que bloquea (filas ${bloquean}: equipo que no existe, repetido, pozo ajeno, sin pozos) y el caso de borde de MPP-301 avisa sin bloquear («${mpp?.texto.slice(0, 70)}…»); solo el administrador la carga`)
    // j. Las rutas nuevas están en CONTRATO.md.
    const nuevas = ['TUBERIA', 'SERIE_CHOKE', 'TUBERIA_AGUA', 'CRITICIDAD', 'REPARTO_CHOKE', 'REPARTO_CHOKE_MENSUAL', 'BASE_CHOKE', 'TOPOLOGIA', 'PROPUESTAS_TOPOLOGIA', 'PARADAS_ANH', 'CALIDAD_ANH']
      .map(n => `\`${C[n].ruta}`)
    const posts = ['POST /api/anh/paradas/:id/clasificacion', 'POST /api/anh/paradas/:id/yacimiento', 'POST /api/anh/paradas/confirmar', 'POST /api/configuracion/vista-previa', 'POST /api/topologia/importar']
    const sinDoc = [...nuevas, ...posts].filter(r => !contratoMd.includes(r))
    const capacidades = ['anh:clasificar', 'anh:confirmar', 'anh:yacimiento'].filter(k => !contratoMd.includes(`\`${k}\``))
    comprobar(sinDoc.length === 0 && capacidades.length === 0, `las ${nuevas.length} vistas y ${posts.length} escrituras nuevas, y sus tres capacidades, están en CONTRATO.md${[...sinDoc, ...capacidades].map(r => `; falta ${r}`).join('')}`)
  }

  /* ═══════════════════════════ con la fuente http ═══════════════════════════ */
  async function probarHttp() {
    comprobar(F.FUENTE === 'http' && F.API_URL === '/api', `el build lee VITE_FUENTE=http y en desarrollo pide a /api (${F.FUENTE}, ${F.API_URL})`)
    // El servidor de prueba: su propia sesión (la del demo, armada a mano con
    // el motor) y el contrato de contrato.ts. Responde lo que el backend debe.
    const { configInicial, versionInicial } = await cargar('/src/entities/configuracion.ts')
    const { USUARIOS_INICIALES } = await cargar('/src/entities/usuarios.ts')
    const v1 = versionInicial()
    // El registro del servidor trae un campo que este front no tiene escrito: un cliente nuevo son filas, no código.
    const RUBIALES = { id: 'rubiales', nombre: 'Rubiales', cuenca: 'Llanos', choke: 'Pozos', nota: 'Campo nuevo del cliente' }
    const srv = { ctx: { config: configInicial(), respuestas: {} }, versiones: [v1], usuarios: USUARIOS_INICIALES, accesos: [], avisosEnviados: [],
      informes: [], asignacionOficial: [], cargasAsignacion: [], analisis: {}, analisisAnteriores: {}, cambiosPlanta: [], campos: [...CAMPOS, RUBIALES] }
    const R = responder(srv)
    const IMP = await cargar('/src/entities/choke-config.ts')
    const pedidos = [], cuerpos = []
    /** Los parámetros de un camino según la ruta del endpoint, o null si no es suyo. */
    const leer = (ep, camino, consulta) => {
      const a = ep.ruta.split('/'), b = camino.split('/')
      if (a.length !== b.length) return null
      const p = {}
      for (let i = 0; i < a.length; i++) {
        if (a[i].startsWith(':')) p[a[i].slice(1)] = decodeURIComponent(b[i])
        else if (a[i] !== b[i]) return null
      }
      for (const [k, x] of consulta) p[k] = k === 'campos' ? x.split(',').filter(Boolean) : k === 'desde' || k === 'hasta' ? new Date(x) : x
      return p
    }
    const json = (estado, cuerpo) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'content-type': 'application/json' } })
    let rechazo = null
    globalThis.fetch = async (url, init = {}) => {
      const u = new URL(url, 'http://servidor'), metodo = init.method ?? 'GET'
      pedidos.push(`${metodo} ${u.pathname}${u.search}`)
      if (!u.pathname.startsWith('/api/')) return json(404, { error: { codigo: 'ruta-no-encontrada', mensaje: 'ruta no encontrada' } })
      const camino = u.pathname.slice(4)
      if (metodo !== 'GET') {
        if (rechazo) return json(rechazo.estado, { error: rechazo.error })
        // Una escritura aceptada: el servidor devuelve lo que guardó.
        const cuerpo = JSON.parse(init.body)
        cuerpos.push({ camino, cuerpo })
        if (camino.startsWith('/paradas/')) {
          const r = { texto: cuerpo.texto, por: 'Persona del servidor · operador', porId: 'oper', canal: 'pantalla', hora: '2026-10-02T14:00:00-05:00', ...(cuerpo.parte ? { parte: cuerpo.parte, modo: cuerpo.modo } : {}) }
          return json(200, K.aRespuesta(C.R_RESPUESTA, { respuesta: r }))
        }
        if (camino.startsWith('/planes/')) {
          const d = { id: decodeURIComponent(camino.slice('/planes/'.length)), estado: cuerpo.estado, por: 'Persona del servidor · jefe de mantenimiento', porId: 'jefe', fecha: '2026-10-02T14:00:00-05:00', motivo: cuerpo.motivo }
          return json(200, K.aRespuesta(C.R_PLAN, { decision: d }))
        }
        // El árbol de paradas: el servidor busca la fila por su id y responde cómo quedó.
        if (camino.startsWith('/anh/paradas/') && camino !== '/anh/paradas/confirmar') {
          const fila = ARB.pedirParadaAnh(decodeURIComponent(camino.split('/')[3]), srv.ctx, {})
          if (!fila) return json(404, { error: { codigo: 'no-encontrado', mensaje: 'Esa parada no está entre las de la ANH.' } })
          return json(200, K.aRespuesta(C.R_CLASIFICACION, { parada: fila, guardadas: { [fila.id]: {} } }))
        }
        if (camino === '/anh/paradas/confirmar') return json(200, K.aRespuesta(C.R_CONFIRMACION, { paradas: cuerpo.ids.map(id => ARB.pedirParadaAnh(id, srv.ctx, {})) }))
        if (camino === '/configuracion/vista-previa') return json(200, K.aRespuesta(C.R_VISTA_PREVIA, { impacto: IMP.impactoConfig(srv.ctx, cuerpo.config, ['ceiba']) }))
        if (camino === '/topologia/importar') return json(200, K.aRespuesta(C.R_TOPOLOGIA_CSV, IMP.leerTopologia(cuerpo.texto, cuerpo.campo)))
        return json(500, { error: { codigo: 'interno', mensaje: 'el servidor de prueba no conoce esa escritura' } })
      }
      for (const [nombre, ep] of ENDPOINTS) {
        const p = leer(ep, camino, u.searchParams)
        if (!p) continue
        // Una copia: el JSON de un códec «tal cual» comparte objetos con la sesión del servidor de prueba.
        const j = JSON.parse(JSON.stringify(K.aRespuesta(ep.codec, R[nombre](p))))
        // Como lo daría PostgreSQL: lo que no hay va en null (el precio sin configurar, el lado de la alarma que no existe).
        if (nombre === 'CONFIGURACION_HISTORIAL') for (const v of j.datos) for (const c of Object.values(v.config.campos)) for (const t of c.metas) if (!('netbackUsd' in t)) t.netbackUsd = null
        if (nombre === 'CATALOGO') for (const c of Object.values(j.datos.campos)) for (const l of Object.values(c.limites)) if (l.alarma) for (const k of ['alta', 'baja']) if (!(k in l.alarma)) l.alarma[k] = null
        return json(200, j)
      }
      return json(404, { error: { codigo: 'ruta-no-encontrada', mensaje: `ruta no encontrada: ${camino}` } })
    }

    console.log('\n=== H1. El arranque trae el catálogo y la sesión del servidor ===')
    await F.prepararFuente()
    const SES = await cargar('/src/shared/api/sesion.ts')
    const s = SES.sesion()
    const arranque = pedidos.filter(x => x.startsWith('GET /api/')).map(x => x.split('?')[0].slice('GET /api'.length)).sort()
    comprobar(arranque.join() === ['/analisis', '/asignacion-oficial', '/campos', '/catalogo', '/configuracion/historial', '/informes', '/paradas/respuestas', '/planta/cambios', '/usuarios', '/usuarios/historial'].join(),
      `el arranque hace los diez GET del contrato, uno cada uno (${arranque.join(', ')})`)
    comprobar(!diferencia(s.ctx.config, srv.ctx.config) && s.versiones.length === 1 && s.usuarios.length === USUARIOS_INICIALES.length
      && !Object.hasOwn(s.ctx.config.campos.zarza.metas[0], 'netbackUsd') && !Object.hasOwn(s.versiones[0].config.campos.zarza.metas[0], 'netbackUsd'),
      'la sesión queda con la configuración vigente, el historial y los usuarios que mandó el servidor; el precio que llegó en null queda como «sin precio» (R7), no como un null que se compare')
    // R8: el registro de campos es el del servidor, y un campo nuevo se firma sin tocar el código.
    const CAMP = await cargar('/src/entities/campos.ts'), CONF = await cargar('/src/entities/configuracion.ts'), SRV = await cargar('/src/shared/api/servidor.ts')
    const conRubiales = CONF.conTramo(s.ctx.config, 'rubiales', { desde: '2026-10-01', produccionBpd: 5000, diferidoMaxBpd: 200, criterioSinCausa: 2 })
    comprobar(CAMP.CAMPOS.some(c => c.id === 'rubiales') && CAMP.campoPorId('rubiales').nombre === 'Rubiales' && !CAMP.campoPorId('rubiales').desconocido
      && !CONF.validarConfig(conRubiales, s.ctx.config, '2026-10-01', Date.parse('2026-10-02T14:00:00-05:00')).some(e => /no es un campo registrado/.test(e))
      && CAMP.campoPorId('otro').desconocido === true && SRV.camposSinRegistro(CAMPOS, { campos: { ceiba: {}, rubiales: {} } }).join() === 'rubiales',
      'GET /api/campos instala el registro: «rubiales» (que el front no trae escrito) tiene su nombre y su meta se firma; un id que ni el servidor registra se dice «sin registrar»; un catálogo con un campo fuera del registro no arranca')
    const delServidor = R.CATALOGO()
    comprobar(TODOS.every(c => !diferencia(CAT.catalogoDelCampo(c), delServidor.campos[c])) && !diferencia(CAT.calendarioDelCatalogo(), L.calendario())
      && !diferencia(CAT.maquinasDelCatalogo(), delServidor.maquinasBomba),
      'el catálogo instalado (calendario, perfiles, registro, medición, pozos, planta) es el del servidor')

    console.log('\n=== H2. Las consultas van al servidor y llegan como en el demo ===')
    const consulta = await cargar('/src/shared/api/consulta.ts')
    const cal = L.calendario(), cerrado = cal.filter(L.mesCerrado).at(-1)
    const q = { campos: ['ceiba', 'morichal'], desde: new Date(cerrado.desde), hasta: new Date(cerrado.hasta) }
    const antes = pedidos.length
    const lb = await DIF.traerLibro(q, s.ctx)
    const local = DIF.pedirLibro(q, s.ctx)
    comprobar(pedidos.length === antes + 1 && /^GET \/api\/vistas\/diferidos\?campos=ceiba%2Cmorichal&desde=.*-05%3A00&hasta=/.test(pedidos.at(-1)) && !diferencia(lb, local),
      `el libro llega por GET /api/vistas/diferidos con las fechas en hora de Colombia y es el mismo que calcula el motor (${pedidos.at(-1)?.slice(0, 70)}…)`)
    comprobar(lb.tramos.every(t => t.inicio instanceof Date) && lb.tramos.length > 1 && lb.tramos.filter(t => t.pozo.id === lb.tramos[0].pozo.id).every(t => t.pozo === lb.tramos[0].pozo),
      'revivido, cada tramo trae fechas de verdad y los tramos del mismo pozo comparten el mismo objeto (como en el motor)')
    const otra = await DIF.traerLibro(q, s.ctx)
    comprobar(otra === lb && pedidos.length === antes + 1, 'la misma consulta con el mismo contexto sale de la caché: no se pide dos veces')
    const ctx2 = { ...s.ctx }
    await DIF.traerLibro(q, ctx2)
    comprobar(pedidos.length === antes + 2, 'con un contexto nuevo (alguien firmó o respondió) la misma consulta se pide de nuevo')

    console.log('\n=== H3. Un error del servidor llega al límite de la pantalla y se reintenta ===')
    const real = globalThis.fetch
    let caido = true
    globalThis.fetch = async (u, i) => (caido ? json(503, { error: { codigo: 'mantenimiento', mensaje: 'el servidor está en mantenimiento' } }) : real(u, i))
    const qx = { campos: ['zarza'], desde: q.desde, hasta: q.hasta }
    let e1
    try { await DIF.traerLibro(qx, s.ctx) } catch (e) { e1 = e }
    caido = false
    let e2
    try { await DIF.traerLibro(qx, s.ctx) } catch (e) { e2 = e }
    consulta.reintentarConsultas()
    const ok = await DIF.traerLibro(qx, s.ctx)
    globalThis.fetch = real
    comprobar(e1 instanceof F.ErrorApi && e1.estado === 503 && e1.codigo === 'mantenimiento' && e2 === e1 && !diferencia(ok, DIF.pedirLibro(qx, s.ctx)),
      'un 503 llega como ErrorApi con el código y el mensaje del servidor; el error queda en la caché (no se martilla al servidor) hasta «Reintentar», que lo vuelve a pedir')

    console.log('\n=== H4. Las escrituras: el rechazo del servidor llega con sus palabras ===')
    const E = await cargar('/src/shared/api/escrituras.ts')
    const casos = [
      [409, { codigo: 'version-cambio', mensaje: 'Mientras editaba se firmó la versión 2.' }, () => E.firmarConfiguracion({ rolId: 'ger' }, { config: s.ctx.config, motivo: 'prueba de rechazo', base: 1 })],
      [403, { codigo: 'sin-capacidad', mensaje: 'Su rol no envía avisos a SAP.' }, () => E.enviarAviso({ rolId: 'oper' }, { tipo: 'M1', campoId: 'ceiba', equipo: 'P-201B', descripcion: 'algo pasa en la bomba', prioridad: 3, parada: false, evidencia: [] })],
      [422, { codigo: 'texto-corto', mensaje: 'Escriba qué encontró, con al menos una frase corta.' }, () => E.responderParada({ rolId: 'oper' }, { evento: 'EV-X', campoId: 'ceiba', equipo: 'LC-14', texto: 'ok' })],
    ]
    const traducidos = []
    for (const [estado, error, hacer] of casos) {
      rechazo = { estado, error }
      const r = await hacer()
      traducidos.push(!r.ok && r.error === error.mensaje)
    }
    rechazo = { estado: 422, error: { codigo: 'acceso-invalido', mensaje: 'Revise el formulario.', errores: [{ campo: 'correo', texto: 'Ya hay una persona con ese correo.' }] } }
    const acc = await E.invitarUsuario({ rolId: 'ger' }, { invitacion: { nombre: 'X Y Z', correo: 'a@b.co', rolId: 'sup', campos: ['ceiba'], alertas: false }, motivo: 'prueba' })
    rechazo = { estado: 422, error: { codigo: 'descripcion-corta', mensaje: 'Escriba qué pasa.', campo: 'descripcion' } }
    const av = await E.enviarAviso({ rolId: 'sup' }, { tipo: 'M1', campoId: 'ceiba', equipo: 'P-201B', descripcion: 'x', prioridad: 3, parada: false, evidencia: [] })
    rechazo = { estado: 500, error: { codigo: 'interno', mensaje: 'falló la base' } }
    const caida = await E.cargarAsignacion({ rolId: 'prod' }, { filas: [], motivo: 'prueba de caída' })
    rechazo = null
    comprobar(traducidos.every(Boolean) && !acc.ok && acc.errores[0]?.campo === 'correo' && !av.ok && av.campo === 'descripcion' && !caida.ok && /No se guardó: falló la base/.test(caida.error),
      '409, 403 y 422 vuelven como { ok: false, error } con el mensaje del servidor; los errores por caja de un acceso y la caja de un aviso se conservan; un 500 dice que no se guardó')
    const vAntes = SES.sesion().ctx
    const r = await E.responderParada({ rolId: 'oper' }, { evento: 'EV-PRUEBA-HTTP', campoId: 'ceiba', equipo: 'LC-14', texto: 'Se quemó el variador del pozo' })
    const despues = SES.sesion().ctx
    comprobar(r.ok && pedidos.at(-1) === 'POST /api/paradas/EV-PRUEBA-HTTP/respuesta' && despues !== vAntes && despues.respuestas['EV-PRUEBA-HTTP']?.por === 'Persona del servidor · operador',
      'una respuesta aceptada se copia a la sesión como la guardó el servidor (con su «por»), y el contexto nuevo hace que las consultas se pidan de nuevo')
    // R20 (#90): ningún cuerpo lleva canal ni por (los pone el servidor), aunque la pantalla los traiga de más.
    const nPedidos = pedidos.length
    await E.responderParada({ rolId: 'oper' }, { evento: 'EV-PRUEBA-HTTP-2', campoId: 'ceiba', equipo: 'LC-14', texto: 'Se quemó el variador del pozo', canal: 'whatsapp', por: 'alguien' })
    const wa = await E.recibirWhatsapp({ evento: 'EV-PRUEBA-HTTP-3', campoId: 'ceiba', equipo: 'LC-14', usuarioId: 'oper', opcion: { clave: '1', texto: 'x' } })
    const conCanal = cuerpos.filter(x => 'canal' in x.cuerpo || 'por' in x.cuerpo || 'porId' in x.cuerpo)
    comprobar(conCanal.length === 0 && cuerpos.at(-1)?.camino === '/paradas/EV-PRUEBA-HTTP-2/respuesta' && pedidos.length === nPedidos + 1 && !wa.ok && wa.error === E.WHATSAPP_SOLO_WEBHOOK,
      `con la fuente http ningún POST lleva canal ni por (${cuerpos.length} cuerpos revisados), y el teléfono simulado no manda nada: lo dice (${wa.ok ? 'mandó' : wa.error.slice(0, 50)}…)`)

    console.log('\n=== H5. El choke y el árbol de paradas por el servidor ===')
    const qa = { campos: ['ceiba'], desde: q.desde, hasta: q.hasta }, qt = { campo: 'ceiba', desde: q.desde, hasta: q.hasta }
    const nH = pedidos.length
    const noCalcular = () => { throw new Error('con la fuente http no se calcula en el navegador') }
    const tubH = await consulta.traer(C.TUBERIA, qt, 'h5', noCalcular)
    const anhH = await consulta.traer(C.PARADAS_ANH, qa, 'h5', noCalcular)
    const critH = await consulta.traer(C.CRITICIDAD, { campos: ['ceiba', 'morichal'] }, 'h5', noCalcular)
    comprobar(pedidos.length === nH + 3 && pedidos.slice(-3).every(x => x.startsWith('GET /api/vistas/')) && !diferencia(tubH, R.TUBERIA(qt))
      && !diferencia(anhH, R.PARADAS_ANH(qa)) && !diferencia(critH, R.CRITICIDAD({ campos: ['ceiba', 'morichal'] })) && anhH.some(p => p.clasificacion.n1),
      `la tubería, las paradas ANH y «si falla hoy» llegan por GET y son lo mismo que calcula el motor (${pedidos.slice(-3).map(x => x.split('?')[0].slice(4)).join(', ')})`)
    const filaH = anhH.find(p => p.estado === 'propuesta')
    const antesH = SES.sesion().clasificacionesAnh, nC = cuerpos.length
    const rc = await E.clasificarParada({ rolId: 'sup' }, filaH.id, { pasos: { impacto: 'diferida' }, por: 'alguien', porId: 'x', hora: '2026-10-02T14:00:00-05:00' })
    const rl = await E.confirmarParadasAnh({ rolId: 'prod' }, { ids: [filaH.id] })
    const ry = await E.declararYacimientoAnh({ rolId: 'prod' }, filaH.id, { evidencia: 'prueba' })
    const rv = await E.previsualizarConfiguracion({ rolId: 'adm' }, { config: s.ctx.config })
    const ri = await E.importarTopologia({ rolId: 'adm' }, { campo: 'ceiba', texto: 'SE-2;todos' })
    const caminosH = cuerpos.slice(nC).map(x => x.camino)
    rechazo = { estado: 422, error: { codigo: 'clasificacion-incoherente', mensaje: '«No planeada - Mecánica subsuelo» es una causa no planeada: cambie primero «¿Planeada?».' } }
    const rr = await E.clasificarParada({ rolId: 'sup' }, filaH.id, { pasos: { planeacion: 'planeada', n1: 'NP_SUB' } })
    rechazo = { estado: 403, error: { codigo: 'sin-capacidad', mensaje: 'Su rol no confirma «Dónde se trabó»: lo confirma supervisión, producción, el jefe de mantenimiento o confiabilidad.' } }
    const rp = await E.confirmarParadasAnh({ rolId: 'oper' }, { ids: [filaH.id], pasos: ['choke'] })
    rechazo = null
    const idH = encodeURIComponent(filaH.id)
    comprobar(rc.ok && rl.ok && ry.ok && rv.ok && ri.ok && rc.parada.id === filaH.id && rv.impacto.campos[0]?.campoId === 'ceiba' && ri.topologia.length === 1
      && SES.sesion().clasificacionesAnh !== antesH && Object.hasOwn(SES.sesion().clasificacionesAnh, filaH.id)
      && caminosH.join() === [`/anh/paradas/${idH}/clasificacion`, '/anh/paradas/confirmar', `/anh/paradas/${idH}/yacimiento`, '/configuracion/vista-previa', '/topologia/importar'].join()
      && cuerpos.slice(nC).every(x => !['por', 'porId', 'hora', 'procedencia', 'rol'].some(k => k in x.cuerpo))
      && !rr.ok && /cambie primero/.test(rr.error) && !rp.ok && /no confirma «Dónde se trabó»/.test(rp.error),
      'las escrituras del árbol y de la topología van a su ruta sin por, hora ni procedencia (las pone el servidor), lo aceptado se copia a la sesión, y el 422 y el 403 llegan con sus palabras')

    console.log(`\n${pruebas - fallos} de ${pruebas} comprobaciones http bien.`)
  }
} finally { await v.close() }

if (!HTTP) console.log(`\n${pruebas - fallos} de ${pruebas} comprobaciones bien.`)
if (fallos) { console.log(`${fallos} FALLARON.`); process.exit(1) }
