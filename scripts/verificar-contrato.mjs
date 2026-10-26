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
  const PVA = await cargar('/src/shared/api/plantaViva.ts') // C2 · La planta viva
  const HOYA = await cargar('/src/shared/api/hoy.ts') // C3 · Hoy
  const ROLES_HOY = (await cargar('/src/entities/roles.ts')).ROLES_VISIBLES.map(r => r.id) // C3 · Hoy
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
    // Las cinco vistas que reparten por tramo o por planeación leen lo que dijeron las personas (QA-A-01; QA-R, vecino 9).
    TUBERIA: p => CHK.pedirTuberia(p.campo, p.desde, p.hasta, s.ctx, s.versiones, s.clasificacionesAnh ?? {}),
    SERIE_CHOKE: p => CHK.pedirSerieChoke(p.campo, p.desde, p.hasta, s.ctx, s.versiones, s.clasificacionesAnh ?? {}),
    TUBERIA_AGUA: p => CHK.pedirTuberiaAgua(p.campo, s.ctx, s.versiones),
    CAPACIDADES: p => CHK.pedirCapacidades(p.campo, s.ctx, s.versiones),
    CRITICIDAD: p => CHK.pedirCriticidad(p.campos, s.ctx),
    REPARTO_CHOKE: p => CHK.pedirRepartoChoke(p, s.ctx, s.versiones, s.clasificacionesAnh ?? {}),
    REPARTO_CHOKE_MENSUAL: p => CHK.pedirRepartoMensual(p.campos, s.ctx, s.versiones, s.clasificacionesAnh ?? {}),
    BASE_CHOKE: p => CHK.pedirBaseChoke(p, s.ctx, s.versiones, s.clasificacionesAnh ?? {}),
    ARBOL_CHOKE: p => CHK.pedirArbolChoke(p, s.ctx, s.clasificacionesAnh ?? {}),
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
    // C2 · La planta viva: lee lo que dijeron las personas (el tramo vigente de cada parada), como la tubería.
    PLANTA_VIVA: p => PVA.pedirPlantaViva(p, s.ctx, s.versiones, s.clasificacionesAnh ?? {}),
    // C3 · Hoy: las tareas de un rol, con lo que dijeron las personas encima (el árbol, las respuestas, los planes).
    HOY: p => HOYA.pedirHoy(p, s),
  })
  const ENDPOINTS = Object.entries(C).filter(([, x]) => x && typeof x === 'object' && x.metodo === 'GET')

  if (HTTP) await probarHttp()
  else await probarDemo()

  /* ═══════════════════════════ en el demo ═══════════════════════════ */
  async function probarDemo() {
    const SES = await cargar('/src/shared/api/sesion.ts')
    const E = await cargar('/src/shared/api/escrituras.ts')
    // La sesión del arranque, sin nada escrito: la de un backend recién cargado (sección 15).
    const fotoArranque = { ...SES.sesion() }

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
      TUBERIA_AGUA: TODOS.map(campo => ({ campo })), CAPACIDADES: TODOS.map(campo => ({ campo })), CRITICIDAD: porCampos(),
      REPARTO_CHOKE: conPeriodo(), REPARTO_CHOKE_MENSUAL: porCampos(), BASE_CHOKE: conPeriodo(),
      ARBOL_CHOKE: conPeriodo().flatMap(q => ['gestion', 'circular', 'responsable'].map(orden => ({ ...q, orden }))),
      TOPOLOGIA: TODOS.map(campo => ({ campo })), PROPUESTAS_TOPOLOGIA: TODOS.map(campo => ({ campo })),
      PARADAS_ANH: conPeriodo(), CALIDAD_ANH: conPeriodo(),
      MENSAJES: porCampos(), SAP_AVISOS: porCampos(), SAP_ORDENES: porCampos(),
      SAP_EQUIPOS: TODOS.map(campo => ({ campo })), SAP_EQUIPO: bombas,
      LISTA_CAMPOS: [{}], CATALOGO: [{}], CONFIGURACION_HISTORIAL: [{}], RESPUESTAS: [{}], USUARIOS: [{}], ACCESOS: [{}], INFORMES: [{}],
      ASIGNACION_OFICIAL: [{}], ANALISIS: [{}], CAMBIOS_PLANTA: [{}],
      // C2 · La planta viva: cada campo y todos, en los tres períodos y los tres momentos.
      PLANTA_VIVA: conPeriodo().flatMap(q => ['antes', 'durante', 'despues'].map(momento => ({ ...q, momento }))),
      // C3 · Hoy: cada rol del producto, en cada campo y en todos.
      HOY: ROLES_HOY.flatMap(rol => grupos.map(campos => ({ rol, campos }))),
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
    // QA-R, vecino 9: el servidor de prueba aplica lo guardado en las cinco vistas que reparten por tramo o por
    // planeación, como la costura. La sesión trae la corrección del paso 2 de la sección 1 (el supervisor pone
    // una parada de septiembre de La Ceiba en la planta): cada vista servida es la que se calcula con lo guardado,
    // y lo guardado la mueve (sin él daría la de «nadie dijo nada»).
    {
      const g = s.clasificacionesAnh, sep = periodos[0], oct = periodos[1]
      const qm = { campos: ['ceiba'], desde: sep.desde, hasta: sep.hasta }, qt = { campo: 'ceiba', desde: sep.desde, hasta: sep.hasta }
      const qb = { campos: ['ceiba'], desde: oct.desde, hasta: oct.hasta }
      const vistas = [
        ['la tubería', R.TUBERIA(qt), x => CHK.pedirTuberia('ceiba', qt.desde, qt.hasta, s.ctx, s.versiones, x)],
        ['la serie', R.SERIE_CHOKE(qt), x => CHK.pedirSerieChoke('ceiba', qt.desde, qt.hasta, s.ctx, s.versiones, x)],
        ['el reparto', R.REPARTO_CHOKE(qm), x => CHK.pedirRepartoChoke(qm, s.ctx, s.versiones, x)],
        ['el mes a mes', R.REPARTO_CHOKE_MENSUAL({ campos: ['ceiba'] }), x => CHK.pedirRepartoMensual(['ceiba'], s.ctx, s.versiones, x)],
        ['la línea base (octubre, con septiembre en la base)', R.BASE_CHOKE(qb), x => CHK.pedirBaseChoke(qb, s.ctx, s.versiones, x)],
      ]
      const malas = vistas.flatMap(([nombre, servida, calcular]) => {
        const con = calcular(g), sin = calcular({})
        return diferencia(servida, con) ? [`${nombre} no es la de lo guardado`] : !diferencia(con, sin) ? [`${nombre}: lo guardado no la mueve`] : []
      })
      comprobar(Object.keys(g).length > 0 && !malas.length,
        `el servidor de prueba aplica lo guardado en la tubería, la serie, el reparto, el mes a mes y la línea base: cada una es la de la costura con lo que dijeron las personas, y la corrección del paso 2 la mueve${malas.length ? ` (${malas.join('; ')})` : ''}`)
    }

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
      'POST /anh/paradas/:id/respuesta', 'POST /anh/paradas/:id/revision',
      'POST /configuracion/vista-previa', 'POST /topologia/importar',
      'POST /anh/paradas/deshacer'] // C3 · Hoy: «Deshacer»
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
    // 5E·H33: una vista de SQL que cita un comentario de src/ existe en esquema.sql (`rigeEnFila` citaba
    // `v_clasificacion_rige`, que no existe: es `v_clasificacion_fuente`).
    const esquemaSql = leerTexto('docs/backend/sql/esquema.sql')
    const vistasSql = new Set([...esquemaSql.matchAll(/create (?:or replace )?view (v_\w+)/g)].map(m => m[1]))
    const vistasCitadas = readdirSync(`${RAIZ}src`, { recursive: true }).filter(f => /\.tsx?$/.test(f))
      .flatMap(f => [...leerTexto(`src/${f}`).matchAll(/`(v_\w+)`/g)].map(m => ({ f, vista: m[1] })))
    const sinVista = vistasCitadas.filter(x => !vistasSql.has(x.vista))
    comprobar(vistasSql.size > 5 && vistasCitadas.length > 0 && sinVista.length === 0,
      `las ${vistasCitadas.length} vistas de SQL que citan los comentarios de src/ existen en esquema.sql${sinVista.map(x => `; ${x.f}: ${x.vista}`).join('')}`)
    // 5E·H35: lo que CONTRATO.md dice del tren de crudo de Guacamayo es lo que trae el demo (8.000, con 7.500 empataba con afuera).
    const PT = await cargar('/src/entities/planta.ts')
    const crudoGu = /Guacamayo 6\.800 → 7\.500 afuera y 7\.400 → ([\d.]+) en el tren de crudo/.exec(contratoMd)?.[1]
    comprobar(crudoGu !== undefined && Number(crudoGu.replace(/\./g, '')) === PT.CAMPO_PLANTA.guacamayo.caudales.crudoCap,
      `CONTRATO.md dice el tren de crudo de Guacamayo que trae el demo: ${crudoGu ?? 'no lo dice'} (el demo, ${PT.CAMPO_PLANTA.guacamayo.caudales.crudoCap.toLocaleString('es-CO')})`)

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
      confirmaTramo: await E.confirmarParadasAnh({ rolId: 'oper' }, { ids: [libre.id], pasos: ['choke'], cadena: ARB.cadenaVista(libre.clasificacion) }),
      loteOperador: await E.confirmarParadasAnh({ rolId: 'oper' }, { ids: [libre.id, aYacimientoId()], cadena: ARB.cadenaVista(libre.clasificacion) }),
    }
    function aYacimientoId() { return escritas.yacimiento.parada.id }
    const esperado = {
      incoherente: /es una causa no planeada: cambie primero «¿Planeada\?»/, operadorTramo: /^Su rol no dice «Dónde se trabó»: lo dice supervisión, producción/,
      yacimientoPorPaso: /«En el yacimiento» lo pone producción o confiabilidad/, yacimientoSupervisor: /lo ponen producción o confiabilidad/,
      yacimientoSinEvidencia: /diga qué lo muestra/, otraCadena: /alguien cambió esta parada/, gerente: /Su rol no clasifica paradas/,
      noExiste: /no está entre las de sus campos/, n2Inventado: /no es una causa del catálogo de la ANH/, sinPasos: /No llegó ningún paso/,
      confirmaTramo: /^Su rol no confirma «Dónde se trabó»/, loteOperador: /lo hacen supervisión o producción/,
    }
    const noRechazadas = Object.entries(rech).filter(([k, r]) => r.ok || !esperado[k].test(r.error))
    comprobar(noRechazadas.length === 0 && SES.sesion().clasificacionesAnh === sa.clasificacionesAnh,
      `se rechazan en palabras y no guardan nada: la clasificación incoherente («${rech.incoherente.error}»), el tramo dicho por el operador, el yacimiento fuera de producción y confiabilidad o sin evidencia, una cadena que cambió (409), una confirmación de pasos ajenos al rol («${rech.confirmaTramo.error}») y un lote del operador${noRechazadas.map(([k, r]) => `; ${k}: ${r.ok ? 'pasó' : r.error}`).join('')}`)
    // c. El toque del operador confirma solo lo suyo (¿planeada?, qué pasó): el paso 2 sigue siendo de TRIM.
    const delOperador = await E.confirmarParadasAnh({ rolId: 'oper' }, { ids: [libre.id], cadena: ARB.cadenaVista(libre.clasificacion) })
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
    const conRaiz = ARB.pedirParadasAnh(historia, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    const deCascada = conRaiz.find(p => p.raiz !== p.eventoId && p.causa.tipo === 'aire')
    const enCascada = await E.clasificarParada({ rolId: 'sup' }, deCascada.id, { pasos: { responsable: 'op-mantenimiento' }, aplicarALaCascada: true,
      ids: conRaiz.filter(p => p.raiz === deCascada.raiz).map(p => p.id) })
    const hermanas = ARB.pedirParadasAnh(historia, SES.sesion().ctx, SES.sesion().clasificacionesAnh).filter(p => p.raiz === deCascada.raiz)
    comprobar(enCascada.ok && hermanas.length > 5 && hermanas.every(p => p.clasificacion.responsable?.procedencia !== 'regla' && p.clasificacion.responsable?.porId === 'sup')
      && new Set(hermanas.map(p => p.eventoId)).size === hermanas.filter(p => p.tramo.n === 1).length,
      `una corrección con «aplicarALaCascada» vale para las ${hermanas.length} filas de la raíz ${deCascada.raiz} (${new Set(hermanas.map(p => p.pozo)).size} pozos)`)
    // e2. Lo guardado en el tramo de exceso del programa es otra decisión: lo que se
    //     dice del evento entero no lo borra (objetivosDe en escrituras.ts; v_clasificacion_fuente).
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
    const csv = await E.importarTopologia({ rolId: 'adm' }, { campo: 'ceiba', texto: 'equipo,pozos\nSE-2,todos\nNO-EXISTE,LC-01\nP-201B,"LC-16, LC-07"\np-201b,LC-01\nK-101,LC-99\nV-101,\nLC-11,LC-11 LC-12\nLC-12,LC-12\n' })
    const bloquean = csv.hallazgos?.filter(h => h.bloquea).map(h => h.fila).join()
    const mpp = escritas.importar.hallazgos.find(h => h.equipo === 'MPP-301')
    const pozoAjeno = csv.hallazgos?.find(h => h.fila === 8)
    comprobar(csv.ok && bloquean === '3,5,6,7,8' && csv.topologia.map(e => `${e.elemento}:${e.alcance}:${e.pozos.length}`).join() === `SE-2:compartido:${MED.pedirPozosDelCampo('ceiba').length},P-201B:compartido:2,LC-12:dedicado:1`
      && /LC-11 es un pozo: solo se sirve a sí mismo/.test(pozoAjeno?.texto ?? '') && csv.filas === 8 && escritas.importar.topologia.find(e => e.elemento === 'MPP-301')?.casoBorde === 'misma-locacion' && mpp && !mpp.bloquea
      && !(await E.importarTopologia({ rolId: 'sup' }, { campo: 'ceiba', texto: 'SE-2;todos' })).ok,
      `el CSV dice por fila lo que bloquea (filas ${bloquean}: equipo que no existe, repetido, pozo ajeno, sin pozos, un pozo que sirve a otro: C-13) y el caso de borde de MPP-301 avisa sin bloquear («${mpp?.texto.slice(0, 70)}…»); solo el administrador la carga`)
    // j. Las rutas nuevas están en CONTRATO.md.
    const nuevas = ['TUBERIA', 'SERIE_CHOKE', 'TUBERIA_AGUA', 'CAPACIDADES', 'CRITICIDAD', 'REPARTO_CHOKE', 'REPARTO_CHOKE_MENSUAL', 'BASE_CHOKE', 'ARBOL_CHOKE', 'TOPOLOGIA', 'PROPUESTAS_TOPOLOGIA', 'PARADAS_ANH', 'CALIDAD_ANH']
      .map(n => `\`${C[n].ruta}`)
    const posts = ['POST /api/anh/paradas/:id/clasificacion', 'POST /api/anh/paradas/:id/yacimiento', 'POST /api/anh/paradas/confirmar',
      'POST /api/anh/paradas/:id/respuesta', 'POST /api/anh/paradas/:id/revision', 'POST /api/configuracion/vista-previa', 'POST /api/topologia/importar']
    const sinDoc = [...nuevas, ...posts].filter(r => !contratoMd.includes(r))
    const capacidades = ['anh:clasificar', 'anh:confirmar', 'anh:yacimiento'].filter(k => !contratoMd.includes(`\`${k}\``))
    comprobar(sinDoc.length === 0 && capacidades.length === 0, `las ${nuevas.length} vistas y ${posts.length} escrituras nuevas, y sus tres capacidades, están en CONTRATO.md${[...sinDoc, ...capacidades].map(r => `; falta ${r}`).join('')}`)

    console.log('\n=== 11. La respuesta de campo, «Algo está mal» y las capacidades firmadas (tanda 4) ===')
    // a. El operador contesta en el campo: lo que TRIM deduce queda dicho por él, y la pregunta que sigue llega con la vista.
    const s11 = SES.sesion()
    const todas11 = ARB.pedirParadasAnh(historia, s11.ctx, s11.clasificacionesAnh)
    const conCorte = todas11.find(p => p.propuesta.preguntas.some(x => x.id === 'corte') && !Object.keys(s11.clasificacionesAnh).some(k => k === p.id || k === p.eventoId))
    const conQue = todas11.find(p => p.propuesta.preguntas.some(x => x.id === 'que-lo-paro') && p.eventoId !== conCorte?.eventoId)
    const deEstePozo = 'De este pozo: su transformador, su variador o su cable'
    const r11 = await E.responderPreguntaAnh({ rolId: 'oper' }, conCorte.id, { pregunta: 'corte', opcion: deEstePozo, aplicarAlEvento: true, cadena: ARB.cadenaVista(conCorte.clasificacion) })
    const ch11 = r11.parada?.clasificacion.choke
    const guardada11 = SES.sesion().clasificacionesAnh[conCorte.eventoId]
    const leida11 = ARB.pedirParadaAnh(conCorte.id, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    comprobar(r11.ok && ch11?.valor === 'pozo' && ch11.procedencia === 'declarado' && ch11.porId === 'oper' && /contestó Jairo Peña en el campo/.test(ch11.porque?.texto ?? '')
      && guardada11?.respuestas?.at(-1)?.opcion === deEstePozo && !leida11.propuesta.preguntas.some(x => x.id === 'corte') && leida11.estado !== 'confirmada',
      `«¿De dónde vino el corte?» lo contesta el operador en el campo (POST …/respuesta): «${deEstePozo}» deja el tramo «${ch11?.valor}» dicho por él (${ch11?.procedencia}), la respuesta queda en la conversación y la fila sigue ${leida11?.estado}: lo avala quien revisa`)
    const r11b = await E.responderPreguntaAnh({ rolId: 'oper' }, conQue.id, { pregunta: 'que-lo-paro', opcion: 'Se fue la energía', aplicarAlEvento: true })
    const sigue11 = ARB.pedirParadaAnh(conQue.id, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    comprobar(r11b.ok && sigue11.propuesta.preguntas.some(x => x.id === 'corte') && !sigue11.propuesta.preguntas.some(x => x.id === 'que-lo-paro'),
      `«¿Qué lo paró?» → «Se fue la energía»: al leer la fila otra vez llega «¿De dónde vino el corte?» (${sigue11.propuesta.preguntas.map(x => x.id).join(', ')})`)
    const rech11 = {
      cerrada: await E.responderPreguntaAnh({ rolId: 'oper' }, conCorte.id, { pregunta: 'corte', opcion: deEstePozo }),
      opcion: await E.responderPreguntaAnh({ rolId: 'oper' }, conQue.id, { pregunta: 'corte', opcion: 'De la luna' }),
      gerente: await E.responderPreguntaAnh({ rolId: 'ger' }, conQue.id, { pregunta: 'corte', opcion: deEstePozo }),
      cadena: await E.responderPreguntaAnh({ rolId: 'oper' }, conQue.id, { pregunta: 'corte', opcion: deEstePozo, cadena: 'otra' }),
    }
    comprobar(!rech11.cerrada.ok && /ya contestó esa pregunta/.test(rech11.cerrada.error) && !rech11.opcion.ok && /no es una de las respuestas/.test(rech11.opcion.error)
      && !rech11.gerente.ok && /no contesta las preguntas/.test(rech11.gerente.error) && !rech11.cadena.ok && /alguien cambió esta parada/.test(rech11.cadena.error),
      'se rechazan en palabras: una pregunta que ya se cerró (409), una opción que no es de la pregunta (422), un rol que no contesta (403) y una cadena que cambió (409)')
    // «Todavía no sé» firmado: el tramo de sus paradas queda en falta con su pregunta, que contesta quien revisa (nunca el operador).
    // La topología de La Ceiba ya está firmada (arriba): «Todavía no sé» saca a K-101 de ella y lo firma por saber (`conTopologia`, el motor).
    const vig11 = CHK.pedirTopologia('ceiba', SES.sesion().ctx)
    const conNoSe = CHK.conTopologia(SES.sesion().ctx.config, { ceiba: { base: vig11.elementos, firmada: vig11.firmada, respuestas: { 'K-101': { r: 'no-se', elemento: null } } } })
    const noSe11 = await E.firmarConfiguracion({ rolId: 'adm' }, { config: conNoSe, motivo: 'el aire de instrumentos: todavía no se sabe a qué pozos sirve', base: SES.sesion().versiones.at(-1).version })
    const delAire = ARB.pedirParadasAnh(historia, SES.sesion().ctx, SES.sesion().clasificacionesAnh).find(p => p.causa.equipo === 'K-101' && !p.clasificacion.choke)
    const qTramo = delAire?.propuesta.preguntas.find(x => x.id === 'choke')
    const enPlanta = qTramo?.opciones.find(o => o.deja.choke === 'planta')
    const operTramo = delAire && await E.responderPreguntaAnh({ rolId: 'oper' }, delAire.id, { pregunta: 'choke', opcion: enPlanta.texto })
    const supTramo = delAire && await E.responderPreguntaAnh({ rolId: 'sup' }, delAire.id, { pregunta: 'choke', opcion: enPlanta.texto })
    comprobar(noSe11.ok && vig11.firmada && !conNoSe.topologia.some(e => e.elemento === 'K-101' && e.campoId === 'ceiba') && CHK.pedirTopologia('ceiba', SES.sesion().ctx).porSaber.some(e => e.elemento === 'K-101')
      && SES.sesion().versiones.at(-1).cambios.some(x => /K-101 \(La Ceiba\): todavía no se sabe a qué pozos sirve/.test(x))
      && !!delAire && delAire.faltan.includes('choke') && qTramo?.quien === 'revisa' && qTramo.texto === CHO.PREGUNTA_ORIGEN
      && !operTramo.ok && /la contesta supervisión, producción/.test(operTramo.error) && supTramo.ok && supTramo.parada.clasificacion.choke?.valor === 'planta' && supTramo.parada.clasificacion.choke.porId === 'sup',
      `«Todavía no sé» firmado para K-101: sus paradas quedan sin tramo con «${qTramo?.texto}», que el operador no contesta («${operTramo?.error}») y el supervisor sí`)
    // a2. Lo confirmado por fila y lo dicho después para todo el evento: la vista trae lo último (lo guardado no se cambia
    //     después de leído: es la clave de la caché de las vistas, y un objeto cambiado dejaba la fila vieja).
    const sola = ARB.pedirParadasAnh(historia, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
      .find(p => p.propuesta.preguntas.some(x => x.id === 'corte') && !Object.keys(SES.sesion().clasificacionesAnh).some(k => k === p.id || k === p.eventoId))
    const conf11 = await E.confirmarParadasAnh({ rolId: 'oper' }, { ids: [sola.id], pasos: ['planeacion', 'impacto'], cadena: ARB.cadenaVista(sola.clasificacion) })
    const resp11 = await E.responderPreguntaAnh({ rolId: 'oper' }, sola.id, { pregunta: 'corte', opcion: deEstePozo, aplicarAlEvento: true })
    const vista11 = ARB.pedirParadasAnh(historia, SES.sesion().ctx, SES.sesion().clasificacionesAnh).find(p => p.id === sola.id)
    const g11 = SES.sesion().clasificacionesAnh
    comprobar(conf11.ok && resp11.ok && vista11.clasificacion.choke?.procedencia === 'declarado' && vista11.clasificacion.planeacion?.procedencia === 'confirmado'
      && !vista11.propuesta.preguntas.some(x => x.id === 'corte') && g11[sola.id]?.planeacion?.procedencia === 'confirmado' && g11[sola.eventoId]?.choke?.procedencia === 'declarado'
      && !g11[sola.eventoId]?.planeacion,
      `confirmado por fila y contestado después para el evento (${sola.id}): la vista trae las dos cosas, paso por paso (D1); lo de la fila se queda en la fila y el evento guarda solo lo que la respuesta determinó`)
    // b. «Algo está mal» y «Pedir a producción»: no corrigen; quien revisa la atiende al decir algo de ella.
    const aRev = todas11.find(p => p.estado === 'propuesta' && p.eventoId !== conCorte.eventoId && p.eventoId !== conQue.eventoId && !Object.keys(SES.sesion().clasificacionesAnh).some(k => k === p.id || k === p.eventoId))
    const rv11 = await E.revisarParadaAnh({ rolId: 'oper' }, aRev.id, { motivo: 'No paró por la energía: lo cerraron para una prueba', aplicarAlEvento: true })
    const revAbierta = ARB.pedirParadaAnh(aRev.id, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    const atiende = await E.clasificarParada({ rolId: 'sup' }, aRev.id, { pasos: { impacto: 'diferida' }, aplicarAlEvento: true })
    const revAtendida = ARB.pedirParadaAnh(aRev.id, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    const pide = await E.revisarParadaAnh({ rolId: 'sup' }, aRev.id, { motivo: '¿Fue el yacimiento? Revise la prueba del pozo', pedirA: 'prod', aplicarAlEvento: true })
    const supOtraVez = await E.clasificarParada({ rolId: 'sup' }, aRev.id, { pasos: { impacto: 'diferida' }, aplicarAlEvento: true })
    const sigueParaProd = ARB.pedirParadaAnh(aRev.id, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    const prodConfirma = await E.confirmarParadasAnh({ rolId: 'prod' }, { ids: [aRev.id], cadena: ARB.cadenaVista(ARB.pedirParadaAnh(aRev.id, SES.sesion().ctx, SES.sesion().clasificacionesAnh).clasificacion) })
    const yaProd = ARB.pedirParadaAnh(aRev.id, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    comprobar(rv11.ok && revAbierta.revision?.motivo.startsWith('No paró') && !revAbierta.revision.atendida && ARB.esperaRevision(revAbierta.revision, 'sup') && !ARB.esperaRevision(revAbierta.revision, 'oper')
      && atiende.ok && revAtendida.revision?.atendida?.porId === 'sup'
      && pide.ok && supOtraVez.ok && sigueParaProd.revision?.pedirA === 'prod' && !sigueParaProd.revision.atendida && ARB.esperaRevision(sigueParaProd.revision, 'prod')
      && prodConfirma.ok && yaProd.revision?.atendida?.porId === 'prod',
      '«Algo está mal» (POST …/revision) deja la parada para quien revisa y la atiende el supervisor al corregirla; «Pedir a producción» solo la atiende producción, aunque el supervisor vuelva a tocarla')
    const rechRev = {
      corto: await E.revisarParadaAnh({ rolId: 'oper' }, aRev.id, { motivo: 'mal' }),
      aQuien: await E.revisarParadaAnh({ rolId: 'sup' }, aRev.id, { motivo: 'revise esto por favor', pedirA: 'ger' }),
      propio: await E.revisarParadaAnh({ rolId: 'prod' }, aRev.id, { motivo: 'revise esto por favor', pedirA: 'prod' }),
      gerente: await E.revisarParadaAnh({ rolId: 'ger' }, aRev.id, { motivo: 'revise esto por favor' }),
    }
    comprobar(!rechRev.corto.ok && /Diga qué está mal/.test(rechRev.corto.error) && !rechRev.aQuien.ok && /se le pide a quien revisa/.test(rechRev.aQuien.error)
      && !rechRev.propio.ok && /corríjala usted/.test(rechRev.propio.error) && !rechRev.gerente.ok && /no marca paradas/.test(rechRev.gerente.error),
      `la revisión se rechaza en palabras: sin motivo (422), pedida a quien no revisa (422) o al propio rol (422), y desde un rol que no clasifica (403)`)
    // c. Las capacidades se firman con la configuración y pasan por la revisión de la firma (U2 §8.4).
    const CAPV = CHK.pedirCapacidades('ceiba', SES.sesion().ctx, SES.sesion().versiones)
    const base11 = () => ({ config: SES.sesion().ctx.config, base: SES.sesion().versiones.at(-1).version })
    const conCap = cap => ({ ...base11().config, capacidades: [cap] })
    const menos = await E.firmarConfiguracion({ rolId: 'adm' }, { config: conCap({ campoId: 'ceiba', crudo: { bpd: 5000, fuente: 'placa' } }), motivo: 'prueba de capacidades', base: base11().base })
    const empata = await E.firmarConfiguracion({ rolId: 'adm' }, { config: conCap({ campoId: 'ceiba', afuera: { bpd: 13000, fuente: 'contrato' } }), motivo: 'prueba de capacidades', base: base11().base })
    const previa = await E.previsualizarConfiguracion({ rolId: 'adm' }, { config: conCap({ campoId: 'ceiba', crudo: { bpd: 12000, fuente: 'prueba' } }) })
    // B-53: con errores, la vista previa dice el impacto igual si se pide `aunConErrores`; sin pedirlo, 422 como la firma.
    const previaMala = await E.previsualizarConfiguracion({ rolId: 'adm' }, { config: conCap({ campoId: 'ceiba', crudo: { bpd: 5000, fuente: 'placa' } }) })
    const previaAun = await E.previsualizarConfiguracion({ rolId: 'adm' }, { config: conCap({ campoId: 'ceiba', crudo: { bpd: 5000, fuente: 'placa' } }), aunConErrores: true })
    comprobar(!previaMala.ok && /menos de lo que ya pasó/.test(previaMala.error) && previaAun.ok && previaAun.impacto.campos[0]?.campoId === 'ceiba'
      && previaAun.errores?.some(x => /menos de lo que ya pasó/.test(x)) && !(previa.ok && previa.errores),
      `la vista previa de un borrador con errores: sin «aunConErrores», 422 como la firma; con él, el impacto y los errores al lado («${previaAun.errores?.[0]?.slice(0, 60)}…»), y sin errores no trae la lista`)
    const firma11 = await E.firmarConfiguracion({ rolId: 'adm' }, { config: conCap({ campoId: 'ceiba', crudo: { bpd: 12000, fuente: 'prueba' } }), motivo: 'capacidades de La Ceiba de prueba', base: base11().base })
    const despues11 = CHK.pedirCapacidades('ceiba', SES.sesion().ctx, SES.sesion().versiones)
    const tub11 = CHK.pedirTuberia('ceiba', new Date(cal.at(-1).desde), AHORA, SES.sesion().ctx, SES.sesion().versiones)
    comprobar(CAPV.vigentes.crudo.estado === 'demo' && !CAPV.firma && !menos.ok && /no puede dejar pasar menos de lo que ya pasó/.test(menos.error)
      && !empata.ok && /explicar un empate/.test(empata.error) && previa.ok && previa.impacto.campos[0]?.campoId === 'ceiba'
      && firma11.ok && SES.sesion().versiones.at(-1).cambios.some(x => /^Capacidades de La Ceiba \(se firman por primera vez\): tren de crudo 12\.000/.test(x))
      && despues11.vigentes.crudo.estado === 'firmado' && despues11.firma?.version === firma11.version && tub11.capacidades.estado === 'parte' && /firmadas el/.test(tub11.capacidades.texto),
      `las capacidades se firman con la configuración: menos de lo que ya pasó o un empate sin explicar no se firman (422: «${menos.error?.slice(0, 70)}…»), con las mismas reglas en la vista previa; firmadas, la vista y la tubería dicen quién y cuándo («${tub11.capacidades.texto}»)`)
    // d. El factor de medición se firma con las capacidades (D3; 5E·H9), con su porqué: fuera de 0,5–1,5, sin porqué o en
    // un campo de gas no se firma (422); con otra forma, 400. Firmado, la vista dice quién y cuándo, y un mes cerrado no
    // cambia: cada día se mide con la configuración de su medianoche. Lo firmado aquí no se queda para lo que sigue.
    const fotoF = { ...SES.sesion() }
    const propGu = CHK.pedirCapacidades('guacamayo', SES.sesion().ctx, SES.sesion().versiones).factorMedicionPropuesto
    const conFactor = (campoId, factorMedicion) => ({ ...base11().config, capacidades: [...(base11().config.capacidades ?? []).filter(x => x.campoId !== campoId), { campoId, factorMedicion }] })
    const firmarF = (campoId, fm) => E.firmarConfiguracion({ rolId: 'adm' }, { config: conFactor(campoId, fm), motivo: 'factor de medición de prueba', base: base11().base })
    const fFuera = await firmarF('guacamayo', { valor: 2, porque: propGu.texto }), fSinPorque = await firmarF('guacamayo', { valor: 1.004, porque: '' })
    const fGas = await firmarF('zarza', { valor: 1.01, porque: 'Medido con el separador de prueba' }), fForma = await firmarF('guacamayo', { valor: '1,004', porque: propGu.texto })
    const fPrevia = await E.previsualizarConfiguracion({ rolId: 'adm' }, { config: conFactor('guacamayo', { valor: 2, porque: propGu.texto }) })
    const fBien = await firmarF('guacamayo', { valor: propGu.valor, porque: propGu.texto })
    const capGu = CHK.pedirCapacidades('guacamayo', SES.sesion().ctx, SES.sesion().versiones)
    const septiembre = { campos: ['guacamayo'], desde: new Date(cal.at(-2).desde), hasta: new Date(cal.at(-2).hasta) }
    const repGu = CHK.pedirRepartoChoke(septiembre, SES.sesion().ctx, SES.sesion().versiones, SES.sesion().clasificacionesAnh)
    const tubGu = CHK.pedirTuberia('guacamayo', septiembre.desde, septiembre.hasta, SES.sesion().ctx, SES.sesion().versiones, SES.sesion().clasificacionesAnh)
    comprobar(propGu.valor === 1.004 && !fFuera.ok && /Factor de medición de Guacamayo: escriba un número entre 0,5 y 1,5/.test(fFuera.error) && !fSinPorque.ok && /diga por qué/.test(fSinPorque.error)
      && !fGas.ok && /Factor de medición de La Zarza: en un campo de gas/.test(fGas.error) && !fForma.ok && /forma del contrato.*factorMedicion\.valor.*tiene que ser un número/.test(fForma.error)
      && !fPrevia.ok && /entre 0,5 y 1,5/.test(fPrevia.error)
      && fBien.ok && SES.sesion().versiones.at(-1).cambios.some(x => x.startsWith('Capacidades de Guacamayo (se firman por primera vez): factor de medición 1,004 («La mediana de lo que midió'))
      && capGu.vigentes.factorMedicion.estado === 'firmado' && capGu.vigentes.factorMedicion.valor === 1.004 && capGu.firmaFactor?.version === fBien.version
      && /× el factor de medición firmado \(1,004\)/.test(tubGu.tramos.find(x => x.tramo === 'pozo').fuente)
      && !repGu.peCreible && /El firmado \(1,004\) rige desde el 3 de oct\.$/.test(repGu.textoPe ?? ''),
      `el factor de medición se firma con las capacidades: fuera de 0,5–1,5 («${fFuera.error?.slice(0, 70)}…»), sin porqué o en un campo de gas no se firma, y con otra forma es la forma del contrato; firmado, la vista dice quién y cuándo, los pozos de hoy se leen con él y septiembre, cerrado, sigue sin poderse creer: «${repGu.textoPe}»`)
    SES.cambiarSesion(fotoF)

    console.log('\n=== 12. El árbol de pérdidas del choke (GET /api/vistas/choke/arbol) ===')
    // a. Lo que guardaron las personas en esta sesión (la corrección, el lote y el yacimiento de la sección 1) llega al árbol.
    const s12 = SES.sesion()
    const qa12 = { campos: ['ceiba'], desde: new Date(cerrado.desde), hasta: new Date(cerrado.hasta) }
    const filas12 = ARB.pedirParadasAnh(qa12, s12.ctx, s12.clasificacionesAnh)
    const arboles12 = ['gestion', 'circular', 'responsable'].map(orden => CHK.pedirArbolChoke({ ...qa12, orden }, s12.ctx, s12.clasificacionesAnh))
    const confirmadas12 = filas12.filter(p => p.estado === 'confirmada').reduce((a, p) => a + p.diferidaTrimBbl, 0)
    const libro12 = DIF.pedirLibro(qa12, s12.ctx)
    const cerca12 = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
    comprobar(confirmadas12 > 0 && arboles12.every(a => cerca12(a.raiz.confirmadoBbl, confirmadas12) && cerca12(a.raiz.bbl, libro12.diferido) && a.raiz.filas === filas12.length),
      `lo que dijeron las personas en la sesión llega al árbol: ${Math.round(confirmadas12)} bbl con los 6 pasos confirmados en La Ceiba, ${cerrado.mes}, en los tres órdenes; la raíz sigue siendo el diferido del libro (${Math.round(libro12.diferido)} bbl)`)
    // a2. QA-A-01 / C-09: el reparto por tramo lee LAS MISMAS filas que el árbol, con lo que corrigen las
    //     personas: corregir «Dónde se trabó» mueve igual las dos vistas. La sesión vuelve a como estaba.
    const foto12 = { ...SES.sesion() }
    const deTramo12 = filas12.find(p => p.clasificacion.choke?.valor === 'planta' && p.estado !== 'confirmada')
    const corr12 = deTramo12 && await E.clasificarParada({ rolId: 'jefe' }, deTramo12.id, { pasos: { choke: 'pozo' }, motivo: 'Se revisó en campo: solo afectó a ese pozo', cadena: ARB.cadenaVista(deTramo12.clasificacion) })
    const s12b = SES.sesion()
    const rep12 = CHK.pedirRepartoChoke(qa12, s12b.ctx, undefined, s12b.clasificacionesAnh)
    const arb12b = CHK.pedirArbolChoke({ ...qa12, orden: 'gestion' }, s12b.ctx, s12b.clasificacionesAnh)
    const nivel12 = Object.fromEntries(arb12b.raiz.hijos.map(h => [h.valor, h.bbl]))
    const tramos12 = [...new Set([...Object.keys(rep12.porChoke), ...Object.keys(nivel12)])]
    const movio12 = deTramo12 && ARB.pedirParadaAnh(deTramo12.id, s12b.ctx, s12b.clasificacionesAnh)?.clasificacion.choke?.valor === 'pozo'
    comprobar(!!corr12?.ok && !!movio12 && tramos12.every(k => cerca12(rep12.porChoke[k] ?? 0, nivel12[k] ?? 0)),
      `corregir «Dónde se trabó» de ${deTramo12?.pozo ?? '(no hay una fila de planta sin confirmar)'} a «En el pozo» mueve igual el reparto por tramo y el árbol: ${tramos12.filter(k => (nivel12[k] ?? 0) > 0).map(k => `${k} ${Math.round(nivel12[k])}`).join(' · ')}${corr12 && !corr12.ok ? ` (no se pudo corregir: ${corr12.error})` : ''}`)
    SES.cambiarSesion(foto12)
    // b. El códec revisa el árbol al entrar: un nodo que no suma, unas hermanas fuera de orden o un orden que no existe no entran, y dice dónde.
    const j12 = JSON.parse(JSON.stringify(K.aRespuesta(C.ARBOL_CHOKE.codec, arboles12[0])))
    const revivir12 = j => { try { K.deRespuesta(C.ARBOL_CHOKE.codec, j); return '' } catch (e) { return e instanceof K.ErrorDeContrato ? e.message : `otro error: ${e.message}` } }
    const noSuma = structuredClone(j12); noSuma.datos.raiz.hijos[0].hijos[0].bbl += 10
    const desordenado = structuredClone(j12); desordenado.datos.raiz.hijos.reverse()
    const otroOrden = structuredClone(j12); otroOrden.datos.orden = 'por-capricho'
    const mNoSuma = revivir12(noSuma), mDesorden = revivir12(desordenado), mOrden = revivir12(otroOrden)
    comprobar(revivir12(j12) === '' && /^raiz\.hijos\[0\]: el árbol no se puede creer: no suma sus ramas/.test(mNoSuma) && /fuera de orden/.test(mDesorden) && /no es un orden del árbol/.test(mOrden)
      && !diferencia(K.deRespuesta(C.ARBOL_CHOKE.codec, j12), arboles12[0]),
      `un árbol que no suma sus ramas no entra y dice dónde («${mNoSuma.slice(0, 90)}…»); tampoco unas hermanas fuera de orden ni un orden que no existe`)
    // c. La ruta lleva el orden en la consulta.
    comprobar(C.urlDe(C.ARBOL_CHOKE, { ...qa12, orden: 'circular' }).startsWith('/vistas/choke/arbol?campos=ceiba&desde=') && /&orden=circular$/.test(C.urlDe(C.ARBOL_CHOKE, { ...qa12, orden: 'circular' })),
      `el orden va en la consulta: ${C.urlDe(C.ARBOL_CHOKE, { ...qa12, orden: 'circular' }).replace(/desde=[^&]+&hasta=[^&]+/, 'desde=…&hasta=…')}`)

    console.log('\n=== 13. Lo que dicen las personas se guarda paso por paso (D1: C-01, C-02, C-03, C-05, C-06; B-04) ===')
    // Cada caso vuelve a la misma foto de la sesión y corre aparte: si algo lanza,
    // la comprobación falla con la excepción y las demás siguen.
    const foto13 = { ...SES.sesion() }
    const volver13 = () => SES.cambiarSesion(foto13)
    const fila13 = id => ARB.pedirParadaAnh(id, SES.sesion().ctx, SES.sesion().clasificacionesAnh)
    const caso = async (msg, f) => {
      volver13()
      let r
      try { r = await f() } catch (e) { r = { bien: false, dice: `excepción: ${e?.message ?? e}` } }
      comprobar(r.bien, `${msg}${r.dice ? ` (${r.dice})` : ''}`)
    }
    const hist13 = ARB.pedirParadasAnh(historia, foto13.ctx, foto13.clasificacionesAnh)
    const sinGuardar = p => !Object.keys(foto13.clasificacionesAnh).some(k => k === p.id || k === p.eventoId)
    const porRaiz13 = new Map()
    for (const p of hist13) if (p.raiz !== p.eventoId && !p.exceso) (porRaiz13.get(p.raiz) ?? porRaiz13.set(p.raiz, []).get(p.raiz)).push(p)
    // Una cascada de varios eventos con la cadena completa, sin nada guardado todavía.
    const [raiz13, filasC] = [...porRaiz13.entries()].find(([, fs]) => new Set(fs.map(f => f.eventoId)).size >= 3 && fs.every(sinGuardar)
      && fs.every(f => f.clasificacion.n1 && f.clasificacion.n2 && f.clasificacion.responsable))
    const idsC = hist13.filter(p => p.raiz === raiz13).map(p => p.id)
    const A13 = filasC[0], B13 = filasC.find(f => f.eventoId !== A13.eventoId)
    const otroDetalle = f => ANC.N2_CIRCULAR.find(n => n.n1 === f.clasificacion.n1.valor && n.codigo !== f.clasificacion.n2.valor)?.codigo
    const otroResp = v => (v === 'op-operacion' ? 'op-mantenimiento' : 'op-operacion')
    /** El jefe corrige el detalle de B para su evento, con motivo: lo que tiene que sobrevivir. */
    const jefeEnB = async () => {
      const r = await E.clasificarParada({ rolId: 'jefe' }, B13.id, { pasos: { n2: otroDetalle(B13) }, motivo: 'Se abrió el equipo: fue otra cosa', aplicarAlEvento: true, cadena: ARB.cadenaVista(B13.clasificacion) })
      if (!r.ok) throw new Error(`el jefe no pudo corregir B: ${r.error}`)
      return fila13(B13.id).clasificacion.n2
    }

    await caso(`C-01 · «Algo está mal» del operador en ${A13.pozo} para la cascada de ${raiz13} (con las filas que vio) no toca ningún paso: el detalle que corrigió el jefe en ${B13.pozo} sigue suyo`, async () => {
      const n2 = await jefeEnB()
      const rv = await E.revisarParadaAnh({ rolId: 'oper' }, A13.id, { motivo: 'No paró por la energía: lo cerraron para una prueba', aplicarALaCascada: true, ids: idsC, cadena: ARB.cadenaVista(fila13(A13.id).clasificacion) })
      const b = fila13(B13.id)
      return { bien: rv.ok && b.clasificacion.n2?.porId === 'jefe' && b.clasificacion.n2?.valor === n2.valor && b.revision?.porId === 'oper' && b.estado === fila13(B13.id).estado,
        dice: rv.ok ? `${B13.pozo}: detalle ${b.clasificacion.n2?.valor} · ${b.clasificacion.n2?.porId ?? 'TRIM'}` : rv.error }
    })
    await caso('C-01 · una respuesta de campo del operador para la cascada no cambia lo que dijo el jefe en otro pozo: queda en la conversación de cada evento', async () => {
      // Una cascada cuya fila trae una pregunta de campo que deja «Quién» (la del programa: «¿Qué trabajo era?»).
      const [r, fs] = [...porRaiz13.entries()].find(([, x]) => new Set(x.map(f => f.eventoId)).size >= 2 && x.every(sinGuardar)
        && x[0].propuesta.preguntas.some(q => q.quien === 'campo' && q.opciones.some(o => o.deja.responsable))) ?? []
      if (!r) return { bien: false, dice: 'el demo no trae una cascada con una pregunta de campo abierta' }
      const a = fs[0], b = fs.find(f => f.eventoId !== a.eventoId)
      const q = a.propuesta.preguntas.find(x => x.quien === 'campo' && x.opciones.some(o => o.deja.responsable))
      const op = q.opciones.find(o => o.deja.responsable)
      const delJefe = otroResp(op.deja.responsable)
      const j = await E.clasificarParada({ rolId: 'jefe' }, b.id, { pasos: { responsable: delJefe }, motivo: 'Ese trabajo lo hizo operación', aplicarAlEvento: true, cadena: ARB.cadenaVista(b.clasificacion) })
      if (!j.ok) throw new Error(`el jefe no pudo decir «Quién» en ${b.pozo}: ${j.error}`)
      const ids = hist13.filter(p => p.raiz === r).map(p => p.id)
      const rr = await E.responderPreguntaAnh({ rolId: 'oper' }, a.id, { pregunta: q.id, opcion: op.texto, aplicarALaCascada: true, ids, cadena: ARB.cadenaVista(fila13(a.id).clasificacion) })
      const fb = fila13(b.id), fa = fila13(a.id)
      return { bien: rr.ok && fb.clasificacion.responsable?.valor === delJefe && fb.clasificacion.responsable.porId === 'jefe' && fb.clasificacion.respuestas?.some(x => x.porId === 'oper' && x.opcion === op.texto)
        && fa.clasificacion.responsable?.porId === 'oper' && fa.clasificacion.responsable.procedencia === 'declarado',
        dice: rr.ok ? `«${op.texto}» en ${r}: «Quién» de ${b.pozo} = ${fb.clasificacion.responsable?.valor} · ${fb.clasificacion.responsable?.porId}` : rr.error }
    })
    await caso(`C-01 · cambiar «Quién» para la cascada cuando el jefe dijo otro en ${B13.pozo}: 409 diciendo cuál, sin motivo; con motivo pasa, como corrección, y el detalle del jefe sigue (paso por paso)`, async () => {
      await jefeEnB()
      const respB = fila13(B13.id).clasificacion.responsable.valor
      const r0 = await E.clasificarParada({ rolId: 'jefe' }, B13.id, { pasos: { responsable: otroResp(respB) }, motivo: 'El equipo es de operación', aplicarAlEvento: true, cadena: ARB.cadenaVista(fila13(B13.id).clasificacion) })
      if (!r0.ok) throw new Error(r0.error)
      const cuerpo = { pasos: { responsable: otroResp(fila13(B13.id).clasificacion.responsable.valor) }, aplicarALaCascada: true, ids: idsC, cadena: ARB.cadenaVista(fila13(A13.id).clasificacion) }
      const sin = await E.clasificarParada({ rolId: 'sup' }, A13.id, cuerpo)
      const con = await E.clasificarParada({ rolId: 'sup' }, A13.id, { ...cuerpo, motivo: 'Lo opera la estación de operación' })
      const b = fila13(B13.id)
      return { bien: !sin.ok && /otra persona/.test(sin.error) && sin.error.includes(B13.pozo) && con.ok
        && b.clasificacion.responsable?.porId === 'sup' && b.clasificacion.responsable?.porque === 'Lo opera la estación de operación' && b.clasificacion.n2?.porId === 'jefe',
        dice: `sin motivo: ${sin.ok ? 'PASÓ' : sin.error.slice(0, 110)}${con.ok ? '' : `; con motivo: ${con.error}`}` }
    })
    await caso(`C-01 · la cascada con una fila que la pantalla no mostró: 409 («la cascada cambió»); una fila de otra raíz: 422`, async () => {
      const otroEv = idsC.filter(id => !id.startsWith(`${B13.eventoId}@`))
      const falta = await E.clasificarParada({ rolId: 'sup' }, A13.id, { pasos: { impacto: 'diferida' }, aplicarALaCascada: true, ids: otroEv })
      const ajena = hist13.find(p => p.raiz !== raiz13)
      const deOtra = await E.clasificarParada({ rolId: 'sup' }, A13.id, { pasos: { impacto: 'diferida' }, aplicarALaCascada: true, ids: [...idsC, ajena.id] })
      const sinIds = await E.clasificarParada({ rolId: 'sup' }, A13.id, { pasos: { impacto: 'diferida' }, aplicarALaCascada: true })
      return { bien: !falta.ok && /cascada de .* cambió/.test(falta.error) && falta.error.includes(B13.pozo) && !deOtra.ok && /no es de la cascada/.test(deOtra.error)
        && !sinIds.ok && /ids/.test(sinIds.error) && SES.sesion().clasificacionesAnh === foto13.clasificacionesAnh,
        dice: `${falta.ok ? 'PASÓ sin ver una fila' : falta.error.slice(0, 90)} · ${deOtra.ok ? 'PASÓ con una fila ajena' : deOtra.error.slice(0, 60)} · ${sinIds.ok ? 'PASÓ sin ids' : 'sin ids: 422'}` }
    })
    await caso(`C-01 · dentro de un evento: «Algo está mal» del operador en una fila no borra la confirmación de producción en otra`, async () => {
      const largos = new Map()
      for (const p of hist13) if (!p.exceso && sinGuardar(p)) (largos.get(p.eventoId) ?? largos.set(p.eventoId, []).get(p.eventoId)).push(p)
      const [, fs] = [...largos.entries()].find(([, x]) => x.length >= 3 && x.every(f => f.estado === 'propuesta'))
      const [R1, R2] = fs
      const c2 = await E.confirmarParadasAnh({ rolId: 'prod' }, { ids: [R2.id], cadena: ARB.cadenaVista(R2.clasificacion) })
      const rv = await E.revisarParadaAnh({ rolId: 'oper' }, R1.id, { motivo: 'Este pozo no paró por esto: revisen', aplicarAlEvento: true, cadena: ARB.cadenaVista(fila13(R1.id).clasificacion) })
      return { bien: c2.ok && rv.ok && fila13(R2.id).estado === 'confirmada' && fila13(R1.id).revision?.porId === 'oper', dice: `${R2.id} queda ${fila13(R2.id).estado}` }
    })
    await caso(`C-02 · el yacimiento que puso producción en ${A13.pozo} no se copia a los otros pozos cuando el supervisor cambia otro paso para la cascada`, async () => {
      const y = await E.declararYacimientoAnh({ rolId: 'prod' }, A13.id, { evidencia: 'corte-agua', motivo: 'El corte de agua subió al 98 %', cadena: ARB.cadenaVista(A13.clasificacion) })
      if (!y.ok) throw new Error(y.error)
      const r = await E.clasificarParada({ rolId: 'sup' }, A13.id, { pasos: { responsable: otroResp(fila13(A13.id).clasificacion.responsable.valor) }, motivo: 'Lo opera la estación',
        aplicarALaCascada: true, ids: idsC, cadena: ARB.cadenaVista(fila13(A13.id).clasificacion) })
      const otras = idsC.filter(id => !id.startsWith(`${A13.eventoId}@`)).map(fila13)
      return { bien: r.ok && fila13(A13.id).clasificacion.choke?.valor === 'reservorio' && otras.every(f => f.clasificacion.choke?.valor !== 'reservorio' && f.clasificacion.choke?.porId !== 'prod')
        && otras.every(f => f.clasificacion.responsable?.porId === 'sup'),
        dice: r.ok ? `${otras.filter(f => f.clasificacion.choke?.valor === 'reservorio').length} de ${otras.length} filas con el yacimiento copiado` : r.error }
    })
    await caso('C-02 · la marca de un lote no se copia a filas que no estuvieron en él cuando el jefe corrige para la cascada', async () => {
      const grupo = [...ARB.gruposPorCadena(filasC.map(f => fila13(f.id))).values()].find(g => g.length >= 2)
      const lote = await E.confirmarParadasAnh({ rolId: 'sup' }, { ids: grupo.slice(0, 2).map(p => p.id), cadena: ARB.cadenaVista(grupo[0].clasificacion) })
      if (!lote.ok) throw new Error(lote.error)
      const r = await E.clasificarParada({ rolId: 'jefe' }, grupo[0].id, { pasos: { n2: otroDetalle(grupo[0]) }, motivo: 'Se abrió el equipo: fue otra cosa', aplicarALaCascada: true, ids: idsC, cadena: ARB.cadenaVista(fila13(grupo[0].id).clasificacion) })
      const fuera = idsC.filter(id => !lote.lote.paradas.includes(id)).map(fila13)
      return { bien: r.ok && fuera.every(f => ANC.PASOS.every(x => f.clasificacion[x]?.lote !== lote.lote.id)),
        dice: r.ok ? `${fuera.filter(f => ANC.PASOS.some(x => f.clasificacion[x]?.lote === lote.lote.id)).length} filas ajenas con la marca del lote` : r.error }
    })
    await caso('C-03 · lo guardado es por paso y con su consecutivo: el evento guarda solo los pasos de esta petición (no el borrador entero de la fila)', async () => {
      await jefeEnB()
      const g = SES.sesion().clasificacionesAnh[B13.eventoId]
      const pasosB = ANC.PASOS.filter(x => g?.[x])
      return { bien: pasosB.every(x => typeof g[x].n === 'number' && g[x].porId === 'jefe') && pasosB.every(x => ['n1', 'n2'].includes(x)) && !g.responsable,
        dice: `en ${B13.eventoId}: ${pasosB.map(x => `${x}·${g[x].procedencia}·n${g[x].n}`).join(', ')}` }
    })
    await caso('C-05 · cambiar «¿Planeada?» sobre la causa del jefe pide motivo; con él, la causa y el detalle quedan «retirados» (con quién y por qué) y vuelve lo de TRIM', async () => {
      const n2 = await jefeEnB()
      const sin = await E.clasificarParada({ rolId: 'sup' }, B13.id, { pasos: { planeacion: 'planeada' }, aplicarAlEvento: true, cadena: ARB.cadenaVista(fila13(B13.id).clasificacion) })
      const con = await E.clasificarParada({ rolId: 'sup' }, B13.id, { pasos: { planeacion: 'planeada' }, motivo: 'Estaba en el programa del mes', aplicarAlEvento: true, cadena: ARB.cadenaVista(fila13(B13.id).clasificacion) })
      const g = SES.sesion().clasificacionesAnh[B13.eventoId], b = fila13(B13.id)
      return { bien: !sin.ok && /Falta el motivo/.test(sin.error) && con.ok && g.n2?.procedencia === 'retirado' && g.n2.valor === n2.valor && g.n2.porId === 'sup' && g.n2.porque === 'Estaba en el programa del mes'
        && !g.n1 && g.planeacion?.procedencia === 'corregido' && !b.clasificacion.n1 && !ARB.esDePersona(b.clasificacion.n2?.procedencia ?? 'regla') && b.clasificacion.planeacion?.valor === 'planeada',
        dice: `sin motivo: ${sin.ok ? 'PASÓ y borró la causa del jefe' : 'pide motivo'}; guardado: ${ANC.PASOS.filter(x => g?.[x]).map(x => `${x}·${g[x].procedencia}`).join(', ')}` }
    })
    await caso('QA-R vecino 8 · el retiro se ve en la fila: el paso que la persona retiró, quién, cuándo y por qué («antes: …, retirado por … porque …»)', async () => {
      const n2 = await jefeEnB()
      const con = await E.clasificarParada({ rolId: 'sup' }, B13.id, { pasos: { planeacion: 'planeada' }, motivo: 'Estaba en el programa del mes', aplicarAlEvento: true, cadena: ARB.cadenaVista(fila13(B13.id).clasificacion) })
      const b = fila13(B13.id), x = b.retiros?.find(y => y.paso === 'n2')
      const otras = filasC.filter(f => f.eventoId !== B13.eventoId).map(f => fila13(f.id))
      return { bien: con.ok && x?.valor === n2.valor && x.porId === 'sup' && x.por === 'Nelson Ortiz' && x.rol === 'sup' && x.motivo === 'Estaba en el programa del mes' && !!x.hora
        && b.clasificacion.n2?.valor !== n2.valor && otras.every(f => !f.retiros),
        dice: con.ok ? `retiros de ${B13.pozo}: ${JSON.stringify(b.retiros ?? null)?.slice(0, 160)}` : con.error }
    })
    await caso('QA-R vecino 6 · «Algo está mal» para la cascada no pisa lo que pidió OTRA persona en otro pozo y nadie atendió: el pedido del jefe a producción sigue', async () => {
      const pide = await E.revisarParadaAnh({ rolId: 'jefe' }, B13.id, { motivo: '¿Fue el yacimiento? Revise la prueba del pozo', pedirA: 'prod', aplicarAlEvento: true, cadena: ARB.cadenaVista(B13.clasificacion) })
      if (!pide.ok) throw new Error(pide.error)
      const rv = await E.revisarParadaAnh({ rolId: 'oper' }, A13.id, { motivo: 'No paró por la energía: lo cerraron para una prueba', aplicarALaCascada: true, ids: idsC, cadena: ARB.cadenaVista(fila13(A13.id).clasificacion) })
      const a = fila13(A13.id), b = fila13(B13.id)
      const otras = filasC.filter(f => f.eventoId !== A13.eventoId && f.eventoId !== B13.eventoId).map(f => fila13(f.id))
      return { bien: rv.ok && b.revision?.porId === 'jefe' && b.revision?.pedirA === 'prod' && /yacimiento/.test(b.revision?.motivo ?? '')
        && a.revision?.porId === 'oper' && otras.length > 0 && otras.every(f => f.revision?.porId === 'oper'),
        dice: rv.ok ? `${B13.pozo}: revisión de ${b.revision?.porId} (pedirA ${b.revision?.pedirA ?? '—'}); ${A13.pozo}: ${a.revision?.porId}` : rv.error }
    })
    await caso('C-06 · confirmar sin «cadena» es 400; el lote guarda la cadena que vio la persona', async () => {
      const grupo = [...ARB.gruposPorCadena(ARB.pedirParadasAnh(mesA, foto13.ctx, foto13.clasificacionesAnh).filter(sinGuardar)).values()].find(g => g.length >= 2)
      const sin = await E.confirmarParadasAnh({ rolId: 'prod' }, { ids: [grupo[0].id] })
      const vista = ARB.cadenaVista(grupo[0].clasificacion)
      const lote = await E.confirmarParadasAnh({ rolId: 'prod' }, { ids: grupo.map(p => p.id), cadena: vista })
      return { bien: !sin.ok && /«cadena» falta/.test(sin.error) && lote.ok && lote.lote?.cadena === vista, dice: sin.ok ? 'confirmó sin ver' : sin.error.slice(0, 70) }
    })
    await caso(`B-07 · el jefe confirma de un toque las filas de UNA parada (la cascada de ${raiz13}), sin lote; con filas de otra parada sigue siendo un lote, que es de quien firma el día`, async () => {
      const vista = ARB.cadenaVista(fila13(idsC[0]).clasificacion)
      const mismas = idsC.map(fila13).filter(f => ARB.cadenaVista(f.clasificacion) === vista).map(f => f.id)
      const una = await E.confirmarParadasAnh({ rolId: 'jefe' }, { ids: mismas, cadena: vista })
      const confirmadas = una.ok ? una.paradas.filter(p => ANC.PASOS.some(x => p.clasificacion[x]?.procedencia === 'confirmado')).length : 0
      volver13()
      const otra = hist13.find(p => p.raiz !== raiz13 && p.campoId === A13.campoId)
      const dos = await E.confirmarParadasAnh({ rolId: 'jefe' }, { ids: [mismas[0], otra.id], cadena: vista })
      return { bien: mismas.length >= 2 && una.ok && !una.lote && una.paradas.length === mismas.length && confirmadas === mismas.length
        && !dos.ok && /lo hacen supervisión o producción/.test(dos.error),
        dice: una.ok ? `${confirmadas} de ${mismas.length} filas confirmadas sin lote; con otra parada: ${dos.ok ? 'PASÓ' : dos.error.slice(0, 60)}` : una.error }
    })
    await caso('B-04 · contestar una pregunta deja «declarado» solo el paso que determina: ningún paso sale «confirmado» por una respuesta', async () => {
      const p = hist13.find(x => sinGuardar(x) && x.propuesta.preguntas.some(q => q.id === 'corte') && x.clasificacion.planeacion?.procedencia === 'regla')
      const q = p.propuesta.preguntas.find(x => x.id === 'corte')
      const op = q.opciones.find(o => o.deja.planeacion === p.clasificacion.planeacion.valor && o.deja.choke && o.deja.choke !== p.clasificacion.choke?.valor) ?? q.opciones[0]
      const r = await E.responderPreguntaAnh({ rolId: 'oper' }, p.id, { pregunta: 'corte', opcion: op.texto, aplicarAlEvento: true, cadena: ARB.cadenaVista(p.clasificacion) })
      const f = fila13(p.id)
      return { bien: r.ok && ANC.PASOS.every(x => f.clasificacion[x]?.procedencia !== 'confirmado') && f.clasificacion.planeacion?.procedencia === 'regla'
        && f.clasificacion.choke?.procedencia === 'declarado' && f.clasificacion.choke.porId === 'oper',
        dice: r.ok ? ANC.PASOS.map(x => `${x}:${f.clasificacion[x]?.procedencia ?? '—'}`).join(' ') : r.error }
    })

    console.log('\n=== 14. Contrato, permisos, formas y topes (C-06, C-10 a C-27; B-05) ===')
    await caso('C-17 · «En el yacimiento» con aplicarALaCascada (que su cuerpo no trae) se queda en su pozo', async () => {
      const r = await E.declararYacimientoAnh({ rolId: 'prod' }, A13.id, { evidencia: 'prueba', aplicarALaCascada: true, ids: idsC, cadena: ARB.cadenaVista(A13.clasificacion) })
      const otras = idsC.filter(id => !id.startsWith(`${A13.eventoId}@`)).map(fila13)
      return { bien: r.ok && otras.every(f => f.clasificacion.choke?.valor !== 'reservorio'), dice: `${otras.filter(f => f.clasificacion.choke?.valor === 'reservorio').length} filas de otros pozos «en el yacimiento»` }
    })
    await caso('C-18 · una pregunta que no es de TRIM o no es de esta parada es 422, no «alguien ya la contestó»', async () => {
      const p = hist13.find(x => sinGuardar(x) && x.propuesta.preguntas.some(q => q.id === 'corte'))
      const inventada = await E.responderPreguntaAnh({ rolId: 'oper' }, p.id, { pregunta: 'no-existe', opcion: 'x' })
      const ajena = await E.responderPreguntaAnh({ rolId: 'oper' }, p.id, { pregunta: 'nominacion', opcion: 'x' })
      const q = p.propuesta.preguntas.find(x => x.id === 'corte')
      await E.responderPreguntaAnh({ rolId: 'oper' }, p.id, { pregunta: 'corte', opcion: q.opciones[0].texto })
      const otraVez = await E.responderPreguntaAnh({ rolId: 'oper' }, p.id, { pregunta: 'corte', opcion: q.opciones[0].texto })
      return { bien: !inventada.ok && /no es una pregunta de TRIM/.test(inventada.error) && !ajena.ok && /no es de esta parada/.test(ajena.error) && !otraVez.ok && /ya contestó/.test(otraVez.error),
        dice: `${inventada.error} · ${ajena.error} · ${otraVez.error?.slice(0, 40)}` }
    })
    await caso('C-19 · el mismo lote dos veces no deja un lote vacío; la misma revisión sin atender y «No sé» repetido no se guardan dos veces', async () => {
      const grupo = [...ARB.gruposPorCadena(ARB.pedirParadasAnh(mesA, foto13.ctx, foto13.clasificacionesAnh).filter(sinGuardar)).values()].find(g => g.length >= 2)
      const cuerpo = { ids: grupo.map(p => p.id), cadena: ARB.cadenaVista(grupo[0].clasificacion) }
      const l1 = await E.confirmarParadasAnh({ rolId: 'sup' }, cuerpo)
      const l2 = await E.confirmarParadasAnh({ rolId: 'sup' }, { ...cuerpo, cadena: ARB.cadenaVista(fila13(grupo[0].id).clasificacion) })
      const lotes = SES.sesion().lotesAnh.length
      const x = hist13.find(p => sinGuardar(p) && p.estado === 'propuesta' && p.eventoId !== grupo[0].eventoId)
      await E.revisarParadaAnh({ rolId: 'oper' }, x.id, { motivo: 'Esto no fue así, revisen' })
      const n1 = fila13(x.id).revision?.n
      await E.revisarParadaAnh({ rolId: 'oper' }, x.id, { motivo: 'Esto no fue así, revisen' })
      const conCorte = hist13.find(p => sinGuardar(p) && p.propuesta.preguntas.some(q => q.id === 'corte'))
      for (let i = 0; i < 3; i++) await E.responderPreguntaAnh({ rolId: 'oper' }, conCorte.id, { pregunta: 'corte', opcion: 'No sé' })
      return { bien: l1.ok && !l2.ok && /Ya estaban confirmadas/.test(l2.error) && lotes === foto13.lotesAnh.length + 1 && fila13(x.id).revision?.n === n1
        && fila13(conCorte.id).clasificacion.respuestas?.length === 1,
        dice: `segundo lote: ${l2.ok ? `PASÓ (${l2.lote?.id}, ${l2.lote?.pasos.length} pasos)` : 'no se guarda'}; respuestas «No sé»: ${fila13(conCorte.id).clasificacion.respuestas?.length}` }
    })
    await caso('C-20 · una fila de un campo que la persona no tiene y una que no existe responden lo mismo (no se dice si existe)', async () => {
      const deMorichal = ARB.pedirParadasAnh({ campos: ['morichal'], desde: mesA.desde, hasta: mesA.hasta }, foto13.ctx, foto13.clasificacionesAnh)[0]
      const existe = await E.clasificarParada({ rolId: 'sup' }, deMorichal.id, { pasos: { impacto: 'diferida' } })
      const noExiste = await E.clasificarParada({ rolId: 'sup' }, deMorichal.id.replace(/#\d+$/, '#99'), { pasos: { impacto: 'diferida' } })
      return { bien: !existe.ok && !noExiste.ok && existe.error === noExiste.error, dice: `${existe.error} | ${noExiste.error}` }
    })
    await caso('C-14 · una persona con un rol oculto (cont) no escribe con las capacidades de producción', async () => {
      SES.cambiarSesion({ usuarios: [...foto13.usuarios, { id: 'u-cont', nombre: 'Paula Gómez', correo: 'paula.gomez@operadora.example', rolId: 'cont', campos: 'todos', estado: 'activo', desde: '2026-09-01', alertas: false }] })
      const x = hist13.find(p => p.estado === 'propuesta')
      const rv = await E.revisarParadaAnh({ rolId: 'cont' }, x.id, { motivo: 'Esto no fue así, revisen' })
      const asig = await E.cargarAsignacion({ rolId: 'cont' }, { filas: [{ mes: '2026-08', campoId: 'ceiba', pozo: 'LC-14', bbl: 1, horas: 1 }], motivo: 'prueba del rol oculto' })
      return { bien: !rv.ok && !asig.ok && /no está entre los del producto/.test(rv.error) && /no está entre los del producto/.test(asig.error), dice: `${rv.ok ? 'marcó la revisión' : rv.error} · ${asig.ok ? 'cargó la asignación' : asig.error}` }
    })
    await caso('C-11 · cuerpos con una forma inesperada: 400 en palabras, nunca una excepción', async () => {
      const x = hist13.find(p => p.estado === 'propuesta')
      const conEl = { ...foto13.ctx.config }
      const formas = await Promise.all([
        E.confirmarParadasAnh({ rolId: 'sup' }, { ids: 5, cadena: 'x' }), E.confirmarParadasAnh({ rolId: 'sup' }, { ids: [x.id], pasos: 'choke', cadena: 'x' }),
        E.clasificarParada({ rolId: 'sup' }, x.id, { pasos: ['choke'] }), E.clasificarParada({ rolId: 'sup' }, x.id, { pasos: { impacto: 1 } }),
        E.clasificarParada({ rolId: 'sup' }, x.id, { pasos: { impacto: 'perdida' }, motivo: 123456 }), E.clasificarParada({ rolId: 'sup' }, x.id, { pasos: { impacto: 'diferida' }, cadena: 7 }),
        E.declararYacimientoAnh({ rolId: 'prod' }, x.id, { evidencia: { x: 1 } }), E.responderPreguntaAnh({ rolId: 'oper' }, x.id, { pregunta: 'corte', opcion: 0 }),
        E.revisarParadaAnh({ rolId: 'oper' }, x.id, { motivo: ['a', 'b', 'c', 'd', 'e'] }), E.revisarParadaAnh({ rolId: 'oper' }, x.id, { motivo: 123456 }),
        E.previsualizarConfiguracion({ rolId: 'adm' }, { config: null }),
        E.firmarConfiguracion({ rolId: 'adm' }, { config: { ...conEl, capacidades: 'texto' }, motivo: 'prueba de formas', base: foto13.versiones.at(-1).version }),
        E.firmarConfiguracion({ rolId: 'adm' }, { config: { ...conEl, topologia: 'texto' }, motivo: 'prueba de formas', base: foto13.versiones.at(-1).version }),
        E.firmarConfiguracion({ rolId: 'adm' }, { config: { ...conEl, topologia: [null] }, motivo: 'prueba de formas', base: foto13.versiones.at(-1).version }),
        E.firmarConfiguracion({ rolId: 'adm' }, { config: { ...conEl, topologia: [{ elemento: 42, choke: 'planta', alcance: 'compartido', pozos: ['LC-01', 'LC-02'], campoId: 'ceiba' }] }, motivo: 'prueba de formas', base: foto13.versiones.at(-1).version }),
        E.firmarConfiguracion({ rolId: 'adm' }, { config: { ...conEl, topologia: [{ elemento: 'K-101', choke: 'planta', alcance: 'compartido', pozos: 'LC-01', campoId: 'ceiba' }] }, motivo: 'prueba de formas', base: foto13.versiones.at(-1).version }),
        E.importarTopologia({ rolId: 'adm' }, { campo: 'ceiba', texto: 42 }),
      ].map(pr => pr.catch(e => ({ ok: false, excepcion: e.message }))))
      const malas = formas.map((r, i) => [i, r]).filter(([, r]) => r.ok || r.excepcion || !/forma del contrato|tiene que ser|Diga qué está mal|Falta el motivo/.test(r.error))
      return { bien: malas.length === 0, dice: malas.length ? malas.map(([i, r]) => `#${i}: ${r.ok ? 'PASÓ' : r.excepcion ?? r.error}`).join(' · ').slice(0, 300) : `${formas.length} cuerpos, todos con palabras` }
    })
    await caso('C-12 · un motivo de más de 500 caracteres no entra; la carga CSV devuelve a lo más 50 hallazgos y recorta el equipo escrito', async () => {
      const x = hist13.find(p => sinGuardar(p) && p.estado === 'propuesta')
      const largo = await E.revisarParadaAnh({ rolId: 'oper' }, x.id, { motivo: 'a'.repeat(600) })
      const csv = await E.importarTopologia({ rolId: 'adm' }, { campo: 'ceiba', texto: `${'X'.repeat(1000)};LC-01\n` + Array.from({ length: 120 }, (_, i) => `NO-EXISTE-${i};LC-01`).join('\n') })
      return { bien: !largo.ok && /500 caracteres/.test(largo.error) && csv.ok && csv.hallazgos.length === 51 && /^Y \d+ hallazgos más/.test(csv.hallazgos.at(-1).texto)
        && csv.hallazgos.every(h => (h.equipo ?? '').length <= 65 && h.texto.length < 400),
        dice: `${largo.ok ? 'el motivo de 600 entró' : 'motivo: 422'} · ${csv.hallazgos?.length} hallazgos` }
    })
    await caso('C-21 · la vista previa de una versión que toca metas también pide metas:firmar', async () => {
      const c0 = foto13.ctx.config
      const ce = c0.campos.ceiba
      // Una meta válida (un tramo que rige desde el mes que viene): lo único que la frena es quién la firma.
      const conMeta = { ...c0, campos: { ...c0.campos, ceiba: { ...ce, metas: [...ce.metas, { ...ce.metas.at(-1), desde: '2026-11-01', produccionBpd: ce.metas.at(-1).produccionBpd + 100 }] } } }
      const r = await E.previsualizarConfiguracion({ rolId: 'adm' }, { config: conMeta })
      return { bien: !r.ok && /firma el gerente/.test(r.error), dice: r.ok ? 'la previsualizó' : r.error }
    })
    await caso('C-10 · un campo repetido cuenta una vez: la dirección no lo repite y las paradas ANH no se duplican', async () => {
      const una = ARB.pedirParadasAnh(mesA, foto13.ctx, foto13.clasificacionesAnh).length
      const dos = ARB.pedirParadasAnh({ ...mesA, campos: ['ceiba', 'ceiba'] }, foto13.ctx, foto13.clasificacionesAnh).length
      const url = C.urlDe(C.PARADAS_ANH, { ...mesA, campos: ['ceiba', 'ceiba'] })
      return { bien: una === dos && /campos=ceiba&/.test(url), dice: `${una} y ${dos} filas · ${url.slice(0, 40)}` }
    })
    await caso('C-13 · la topología no firma un pozo que sirve a otros, un elemento fuera del registro ni un equipo para todos que está «por saber» en un campo', async () => {
      const base = foto13.ctx.config, v = foto13.versiones.at(-1).version
      const topo = CHK.pedirTopologia('ceiba', foto13.ctx).elementos.map(({ nombre: _n, clase: _c, ...e }) => e)
      // Cada firma parte de la misma foto: una que pase no le cambia la versión a la siguiente.
      const firmar = t => { volver13(); return E.firmarConfiguracion({ rolId: 'adm' }, { config: { ...base, ...t }, motivo: 'prueba de la topología', base: v }) }
      const pozo = await firmar({ topologia: topo.map(e => (e.elemento === 'LC-01' ? { ...e, alcance: 'compartido', choke: 'planta', pozos: ['LC-01', 'LC-02'] } : e)) })
      const noExiste = await firmar({ topologia: [...topo, { elemento: 'NO-EXISTE', choke: 'planta', alcance: 'compartido', pozos: ['LC-01', 'LC-02'], campoId: 'ceiba' }] })
      const global = await firmar({ topologia: [...topo.filter(e => e.elemento !== 'K-101'), { elemento: 'K-101', choke: 'planta', alcance: 'compartido', pozos: ['LC-01', 'LC-02'] }], topologiaPorSaber: [{ elemento: 'K-101', campoId: 'ceiba' }] })
      return { bien: !pozo.ok && /es un pozo/.test(pozo.error) && !noExiste.ok && /no está en el registro/.test(noExiste.error) && !global.ok && /a la vez/.test(global.error),
        dice: `${pozo.ok ? 'firmó el pozo compartido' : pozo.error.slice(0, 60)} · ${noExiste.ok ? 'firmó NO-EXISTE' : noExiste.error.slice(0, 60)} · ${global.ok ? 'firmó K-101 global y por saber' : global.error.slice(0, 60)}` }
    })
    await caso('C-27 · sin motivo, la firma técnica dice lo de la configuración técnica, no lo de una meta', async () => {
      const c0 = foto13.ctx.config
      const r = await E.firmarConfiguracion({ rolId: 'adm' }, { config: { ...c0, empresa: 'Otra empresa S.A.' }, motivo: '', base: foto13.versiones.at(-1).version })
      return { bien: !r.ok && /configuración técnica/.test(r.error) && !/meta/.test(r.error), dice: r.error }
    })
    await caso('C-26 · un motivo invisible no alcanza: seis espacios no separables, cinco de ancho cero o solo signos', async () => {
      const { alcanza } = await cargar('/src/entities/reglas.ts')
      const nbsp = String.fromCharCode(0xa0).repeat(6), zw = String.fromCharCode(0x200b).repeat(5)
      return { bien: !alcanza(nbsp, 5) && !alcanza(zw, 5) && !alcanza('.....', 5) && alcanza('Señal', 5) && alcanza(`  Ñandú ${zw}`, 5) && !alcanza(5, 5),
        dice: [alcanza(nbsp, 5), alcanza(zw, 5), alcanza('.....', 5)].join(',') }
    })
    await caso('C-25 · las plantillas de la asignación y del plan neutralizan fórmulas y separadores', async () => {
      const AS = await cargar('/src/entities/asignacion.ts'), PL = await cargar('/src/entities/plan.ts')
      const t = AS.plantillaAsignacion('2026-08', 'ceiba', ['=1+1', 'LC;01'])
      return { bien: t.includes(";'=1+1;") && t.includes(';"LC;01";') && !/;=1\+1;/.test(t) && PL.plantillaPlan([{ mes: '2026-08', campoId: 'ceiba', produccionBpd: 1 }]).includes('2026-08;La Ceiba;1'),
        dice: t.split('\r\n').slice(1).join(' | ') }
    })
    await caso('B-05 · «2 Algo está mal» por WhatsApp deja para revisar las filas de la parada (la misma revisión del botón) y no toca ningún paso', async () => {
      // Una parada de bomba de La Ceiba que cerró pozos: sus filas son las de la cascada de esa bomba.
      const raizBomba = hist13.find(f => f.raiz !== f.eventoId && f.raiz.startsWith('EV-') && !f.exceso && sinGuardar(f))?.raiz
      const antes = hist13.filter(f => f.raiz === raizBomba && !f.exceso)
      const r = await E.revisarDesdeWhatsapp({ evento: raizBomba, campoId: 'ceiba', usuarioId: 'oper' })
      const despues = antes.map(f => fila13(f.id))
      return { bien: r.ok && despues.length > 0 && despues.every(f => f.revision?.porId === 'oper' && f.revision.motivo === E.MOTIVO_WHATSAPP && !f.revision.atendida)
        && despues.every((f, i) => ANC.PASOS.every(x => f.clasificacion[x]?.valor === antes[i].clasificacion[x]?.valor && f.clasificacion[x]?.procedencia === antes[i].clasificacion[x]?.procedencia)),
        dice: r.ok ? `${despues.filter(f => f.revision?.porId === 'oper').length} de ${despues.length} filas para revisar` : r.error }
    })
    volver13()

    console.log('\n=== 15. La referencia de las escrituras rechazadas ve un backend que responde distinto (C-08, punto 3) ===')
    {
      // Un backend de prueba que corre las escrituras del demo (el servidor de verdad: escrituras.ts) desde el
      // arranque, y responde con el HTTP y el código de cada rechazo; con una deriva a la vez. `comparar
      // --escrituras` le manda los pasos de referencia/escrituras/ en orden, sin volver al arranque entre casos.
      const { createServer: servidorHttp } = await import('node:http')
      const fotoAntes = { ...SES.sesion() }
      const despachar = (rol, ruta, cuerpo) => {
        const q = { rolId: rol }
        if (ruta === '/api/anh/paradas/confirmar') return E.confirmarParadasAnh(q, cuerpo)
        const m = /^\/api\/anh\/paradas\/([^/]+)\/(clasificacion|yacimiento|respuesta|revision)$/.exec(ruta)
        if (!m) return Promise.resolve({ ok: false, estado: 404, codigo: 'ruta-no-encontrada', error: ruta })
        return { clasificacion: E.clasificarParada, yacimiento: E.declararYacimientoAnh, respuesta: E.responderPreguntaAnh, revision: E.revisarParadaAnh }[m[2]](q, decodeURIComponent(m[1]), cuerpo)
      }
      const DERIVAS = {
        'ninguna (control)': x => x,
        'acepta lo que el contrato rechaza (200 en vez de 409/422)': x => (x.estado === 409 || x.estado === 422 ? { estado: 200 } : x),
        'responde 400 donde va 422 (la forma por la regla)': x => (x.estado === 422 ? { ...x, estado: 400 } : x),
        'el mismo HTTP con otro código («conflicto» en vez del de C-22)': x => (x.estado === 409 ? { ...x, codigo: 'conflicto' } : x),
        'responde 404 donde va 403 (no le toca: no dice que no existe)': x => (x.estado === 403 ? { estado: 404, codigo: 'no-encontrado' } : x),
      }
      let deriva = DERIVAS['ninguna (control)']
      const srvE = servidorHttp(async (req, res) => {
        let cuerpo = ''
        for await (const t of req) cuerpo += t
        const r = await despachar(req.headers['x-rol'], req.url, JSON.parse(cuerpo || '{}'))
        const x = deriva(r.ok ? { estado: 200 } : { estado: r.estado, codigo: r.codigo })
        res.writeHead(x.estado, { 'content-type': 'application/json' })
        res.end(JSON.stringify(x.estado < 300 ? { datos: {} } : { error: { codigo: x.codigo, mensaje: r.error ?? '' } }))
      })
      await new Promise(r => srvE.listen(0, '127.0.0.1', r))
      const urlE = `http://127.0.0.1:${srvE.address().port}`
      const vistas = {}
      try {
        for (const [nombre, f] of Object.entries(DERIVAS)) {
          deriva = f
          SES.cambiarSesion(fotoArranque)
          // Otro proceso (el que correría quien comprueba un backend): no comparte la sesión de este.
          const { spawn } = await import('node:child_process')
          vistas[nombre] = await new Promise(resolve => {
            const p = spawn(process.execPath, ['scripts/referencia.mjs', 'comparar', `--base-url=${urlE}`, '--escrituras'], { cwd: RAIZ })
            let salida = ''
            p.stdout.on('data', d => { salida += d }); p.stderr.on('data', d => { salida += d })
            p.on('close', estado => resolve({ estado, linea: (salida.match(/\d+ de \d+ escrituras rechazadas[^\n]*/) ?? [salida.trim().split('\n').at(-1)])[0] }))
          })
        }
      } finally { srvE.close(); SES.cambiarSesion(fotoAntes) }
      const control = vistas['ninguna (control)']
      const noVe = Object.entries(vistas).filter(([k, x]) => k !== 'ninguna (control)' && x.estado === 0).map(([k]) => k)
      comprobar(control.estado === 0 && /^(\d+) de \1 escrituras/.test(control.linea) && noVe.length === 0,
        `«comparar --escrituras» pasa con el servidor del demo (${control.linea}) y ve las ${Object.keys(DERIVAS).length - 1} derivas: ${Object.entries(vistas).filter(([k]) => k !== 'ninguna (control)').map(([k, x]) => `${k} → ${x.linea}`).join('; ')}${noVe.length ? `; NO VE: ${noVe.join(', ')}` : ''}`)
    }

    // C2 · La planta viva
    console.log('\n=== C2. La planta viva (GET /api/vistas/planta-viva): una lectura con las mismas cifras de las vistas de donde salen ===')
    {
      const s = SES.sesion(), R = responder(s)
      const { AHORA } = await cargar('/src/entities/reloj.ts'), { PUESTA_EN_MARCHA } = await cargar('/src/entities/configuracion.ts')
      const casi = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))
      const cal = L.calendario(), curso = cal.at(-1)
      const q = { campos: ['ceiba'], desde: new Date(curso.desde), hasta: new Date(curso.hasta) }
      const d = R.PLANTA_VIVA({ ...q, momento: 'durante' }), a = R.PLANTA_VIVA({ ...q, momento: 'antes' }), p = R.PLANTA_VIVA({ ...q, momento: 'despues' })
      const tub = R.TUBERIA({ campo: 'ceiba', desde: q.desde, hasta: q.hasta }), lb = R.DIFERIDOS(q), ci = R.CICLO(q)
      const est = R.ESTADO({ campos: ['ceiba'] })[0], ri = R.RIESGO({ campos: ['ceiba'] }), serie = R.DIFERIDOS_MENSUAL({ campos: ['ceiba'] })
      const base = R.BASE_CHOKE({ campos: ['ceiba'], desde: new Date(`${PUESTA_EN_MARCHA}T00:00:00-05:00`), hasta: AHORA })
      const suma = (v, x) => v.planta.tramos.reduce((t, y) => t + y.valor, 0) + (v.planta.sinIdentificar?.valor ?? 0) - x
      comprobar(casi(suma(d, 0), d.cifras.durante.valor) && casi(d.cifras.durante.valor, tub.perdiendoAhoraBpd) && casi(d.cifras.durante.valor, est.perdiendoBpd)
          && casi(suma(p, 0), lb.diferido) && casi(p.cifras.despues.valor, lb.diferido) && casi(p.esteMes.bbl, lb.diferido)
          && d.planta.tramos.every(t => casi(t.valor, tub.tramos.find(y => y.tramo === t.tramo).perdiendoAhoraBpd))
          && p.planta.tramos.every(t => casi(t.valor, tub.tramos.find(y => y.tramo === t.tramo).perdidoBbl)) && casi(p.planta.sinIdentificar?.valor ?? 0, tub.sinTramoBbl),
        `los cuadres con lo escrito en la sesión: Durante, Σ tramos + sin identificar = ${Math.round(d.cifras.durante.valor)} bbl/d = /vistas/estado y la tubería; Después, = ${Math.round(lb.diferido)} bbl = /vistas/diferidos`)
      comprobar(casi(d.mover.totalBbl, ci.retornoBbl) && ['antes', 'durante', 'despues'].every(m => casi(d.mover.porMomento[m], ci[m].bbl))
          && d.porEquipo.every((x, i) => casi(x.bbl, lb.porEquipo[i].bbl) && x.equipo === lb.porEquipo[i].equipo)
          && d.mesAMes.meses.length === serie.length && d.mesAMes.meses.every((m, i) => m.mes === serie[i].mes && casi(m.totalBpd, serie[i].libro.diferido / Math.max(1 / 24, serie[i].libro.meta.dias)))
          && d.bajando.filas.every(f => casi(f.antesBpd, base.noPlaneado[f.tramo].baseDia) && casi(f.ahoraBpd, base.noPlaneado[f.tramo].periodoDia))
          && a.cifras.antes.valor === ri.filter(r => r.estado === 'en-riesgo').length && d.porEquipo.every(x => x.prioridad === (ri.find(r => r.equipo === x.equipo)?.prioridad ?? 0)),
        'lo que se puede mover es el ciclo (/vistas/ciclo), por equipo el Pareto del libro, mes a mes la serie (/vistas/diferidos/mensual), ¿está bajando? la base por tramo (/vistas/choke/base) y Antes el conteo de /vistas/riesgo')
      // Por el cable: las fechas vuelven fechas y las frases, las mismas.
      const j = JSON.parse(JSON.stringify(K.aRespuesta(C.PLANTA_VIVA.codec, d)))
      const y = K.deRespuesta(C.PLANTA_VIVA.codec, j)
      comprobar(typeof j.datos.desde === 'string' && j.datos.desde.endsWith('-05:00') && y.desde instanceof Date && y.ahora instanceof Date && y.bajando.desde instanceof Date
          && y.cifras.durante.fraseCorta === d.cifras.durante.fraseCorta && !diferencia(d, y),
        `por JSON: «${y.cifras.durante.fraseCorta}» y las fechas con su zona (${j.datos.desde})`)
      const url = C.urlDe(C.PLANTA_VIVA, { ...q, momento: 'durante' })
      let malo = ''
      try { R.PLANTA_VIVA({ ...q, momento: 'ayer' }) } catch (e) { malo = e.message }
      comprobar(url.startsWith('/vistas/planta-viva?campos=ceiba&desde=') && url.includes('&momento=durante') && /«ayer» no es un momento/.test(malo),
        `la ruta es ${url.split('?')[0]}?campos&desde&hasta&momento (${url.slice(0, 60)}…), y un momento que no es antes, durante ni despues se rechaza («${malo}»)`)
      // Todos los campos: la cifra es la suma de las filas (un nombre, una cifra).
      const t = R.PLANTA_VIVA({ campos: TODOS, desde: q.desde, hasta: q.hasta, momento: 'durante' }), estT = R.ESTADO({ campos: TODOS })
      comprobar(t.planta === null && t.filas.length === TODOS.length && casi(t.filas.reduce((x, f) => x + f.valor, 0), t.cifras.durante.valor)
          && casi(t.cifras.durante.valor, estT.reduce((x, e) => x + e.perdiendoBpd, 0)) && t.filas.every((f, i, fs) => i === 0 || fs[i - 1].valor >= f.valor),
        `todos los campos: ${Math.round(t.cifras.durante.valor)} bbl/d = la suma de las filas = Σ /vistas/estado, de la que más pesa a la que menos`)
    }

    // C3 · Hoy
    console.log('\n=== C3. Hoy (GET /api/vistas/hoy) y «Deshacer» (POST /api/anh/paradas/deshacer) ===')
    {
      const fotoAntesC3 = { ...SES.sesion() }
      // Desde la sesión del arranque: lo que escribieron las secciones de arriba no cambia lo que se prueba.
      SES.cambiarSesion(fotoArranque)
      try {
        const { ROLES_VISIBLES } = await cargar('/src/entities/roles.ts')
        const { puedeHacer } = await cargar('/src/entities/tipos.ts')
        const { camposAsignados } = await cargar('/src/entities/usuarios.ts')
        const { CAUSAS_POZO } = await cargar('/src/entities/mensajes.ts')
        const MH = await cargar('/src/entities/hoy.ts')
        const ver = (rol, campos = ['ceiba']) => HOYA.pedirHoy({ rol, campos }, SES.sesion())
        const linea = f => (f ?? []).map(x => (typeof x === 'string' ? x : x.b)).join('')

        // 1. El supervisor de La Ceiba (imagen 3a; X4 §3.4 y §5.5).
        const sup = ver('sup')
        const [tc, tk, to, tf] = sup.tareas
        comprobar(sup.inicio.frase === 'Se dejan de producir 1.966 bbl/d. Le faltan 4 paradas por confirmar: el reporte sale mañana antes de las 07:00.'
          && sup.inicio.cifra === '1.966' && sup.inicio.unidad === 'barriles por día' && sup.inicio.remate === 'se dejan de producir en La Ceiba.',
          `la cifra y la frase del supervisor: «${sup.inicio.frase}»`)
        comprobar(sup.tareas.map(t => t.titulo).join(' | ') === 'Confirmar 2 paradas iguales | Conseguir la causa de 2 paradas | Seguir la orden de K-101 | Lo más frágil: el agua.'
          && sup.tareas.map(t => t.grupo).join() === 'hora,barriles,barriles,aviso' && sup.insignia === 3,
          `el orden: lo que tiene hora, los barriles en juego (lo que se pierde ahora y después lo que se perdería si para) y al final lo que solo informa; la insignia cuenta ${sup.insignia}, sin el aviso (${sup.tareas.map(t => `${t.grupo}: ${t.titulo}`).join(' · ')})`)
        comprobar(sup.bloqueos.length === 1 && sup.bloqueos[0].texto === 'No arrancar P-201B ni LC-21 hasta identificar qué se dañó' && sup.bloqueos[0].sub === 'Si arranca antes, queda como no conformidad.',
          `lo que dice «no» va como franja, no como tarjeta: «${sup.bloqueos[0]?.texto}»`)
        comprobar(tc.donde.equipo === 'P-201B' && tc.donde.marca === 'alarma' && tc.donde.texto === 'cerró LC-07 y LC-16 · 05:43'
          && linea(tc.porque) === 'TRIM las dedujo: en la planta, no planeada. Falta su confirmación.' && tc.accion.tipo === 'confirmar' && tc.accion.texto === 'Confirmar las 2'
          && tc.accion.ids.length === 2 && tc.ver.texto === 'Ver una por una' && tc.capacidad === 'anh:confirmar' && tc.limite === '2026-10-03T07:00:00-05:00',
          'la tarjeta: verbo + qué, P-201B con SU marca (la de la franja), por qué importa, «Confirmar las 2» y «Ver una por una»; la hora límite es el reporte de mañana a las 07:00')
        comprobar(tk.donde.equipo === 'LC-21' && tk.donde.marca === 'atencion' && tk.donde.texto === 'lleva 19,7 h sin causa; se escaló a las 20:20'
          && linea(tk.porque) === 'LC-08 arrancó a la 01:10 sin identificar · 219 bbl hoy, 355 desde que pararon' && tk.accion.texto === 'Responder yo' && tk.preguntas.length === 2,
          `lo igual va junto: «${tk.titulo}» (${tk.donde.equipo} ${tk.donde.texto}; ${linea(tk.porque)})`)
        comprobar(to.donde.texto === 'aire de instrumentos · ya pasó el límite' && linea(to.porque) === 'Si para, hasta 9.394 bbl/d. Orden 40012056, liberada a Óscar Daza a las 09:10.' && to.capacidad === 'sap:aviso',
          `la orden de SAP de lo que ya pasó el límite: «${linea(to.porque)}»`)
        comprobar(!tf.pide && !tf.capacidad && linea(tf.porque) === 'Si para otra bomba, cierre primero LC-02, LC-10 y LC-01: dejan de producirse 3.059 bbl/d después de 2 min.',
          `«Lo más frágil» solo informa: va al final y no suma a la insignia («${linea(tf.porque)}»)`)
        comprobar(sup.whatsapp.mensajes === 8 && sup.whatsapp.hilos.some(h => h.equipo === 'P-201B' && h.pasos === '03:53 parado → 03:53 pregunta → 04:22 recordatorio → 05:44 pozos cerrándose → 05:52 escalado' && linea(h.estado) === 'sin respuesta')
          && sup.turno.horas === 12 && Math.round(sup.turno.diferidoBbl) === 723 && sup.entregarTurno
          && sup.campo.frases.map(linea).join(' ') === 'En la planta no pasan 1.665 bbl/d; limitan los pozos. Tanque de agua 89,6 %: no sube, P-201A y P-201C toman lo que entra.'
          && sup.campo.tramos.map(t => `${t.rotulo}${t.trabado ? '*' : ''}`).join() === 'pozos,planta*,salida',
          'al lado: el turno en WhatsApp (8 mensajes en 12 h), el diferido del turno (723 bbl) y «Su campo, ahora» con el tramo trabado')

        // 2. El operador: una pregunta por pantalla (imagen 5; U1 §2.4).
        const op = ver('oper'), qs = op.tareas.flatMap(t => t.preguntas ?? [])
        const [q1, q2] = qs
        comprobar(op.inicio.frase === 'Tiene 4 preguntas. Empiece por P-201B: está parada y no se puede arrancar.' && op.insignia === 4 && qs.map(q => q.equipo).join() === 'P-201B,LC-21,LC-05,LC-08',
          `el operador: «${op.inicio.frase}» (${qs.map(q => q.equipo).join(', ')})`)
        comprobar(q1.texto === '¿Qué parte se dañó?' && q1.contexto === 'P-201B · bomba de agua · paró hoy a las 03:52, hace 10,1 h' && q1.pista === 'Lo que más le ha fallado a esta bomba:'
          && q1.opciones.map(o => `${o.texto}${o.dato ? ` · ${o.dato}` : ''}`).join(' / ') === 'Sello mecánico · 5 de sus 8 fallas / Rodamientos y cámara de empuje · 3 de sus 8 fallas / Otra parte · escoja de la lista / Todavía no sé · se la vuelven a preguntar en la próxima ronda'
          && q1.opciones[0].modos.length > 0 && q1.tramo.rotulo === 'planta · agua' && q1.marca === 'alarma' && q1.bloqueo.texto === 'No la arranque hasta decir qué se dañó' && q1.libro.evento,
          'la primera: P-201B, «¿Qué parte se dañó?», lo que más le ha fallado (5 y 3 de sus 8 fallas), «Otra parte», «Todavía no sé» y la planta · agua marcada')
        comprobar(q2.texto === '¿Por qué paró?' && q2.contexto === 'LC-21 · pozo · paró el 1 de oct a las 18:20, hace 19,7 h' && q2.tramo.rotulo === 'pozos' && q2.bloqueo.texto === 'No lo arranque hasta decir qué pasó'
          && q2.opciones.slice(0, -1).map(o => o.valor).join() === CAUSAS_POZO.join() && q2.opciones[2].texto === 'Orden de producción' && q2.opciones[2].dato === 'nominación o restricción del comprador',
          'la segunda: LC-21, «¿Por qué paró?», con las causas del pozo del libro')
        comprobar(qs.every(q => q.opciones.at(-1).tipo === 'no-se' && q.opciones.at(-1).texto === 'Todavía no sé') && qs[2].via === 'anh' && qs[2].opciones.at(-1).valor === 'No sé' && qs[2].anh.aplicarAlEvento,
          'siempre «Todavía no sé» (en el árbol se guarda «No sé» y escala a quien revisa); la del árbol lleva su fila, su cadena y su alcance (D1)')

        // 3. El técnico y el jefe de mantenimiento (X4 §3.4).
        const tec = ver('tec'), jefe = ver('jefe')
        comprobar(/^Le tocan \d+ cosas hoy\. Primero P-201B: diga qué encontró\.$/.test(tec.inicio.frase) && tec.tareas.some(t => t.tipo === 'orden' && t.donde.equipo === 'K-101' && linea(t.porque).includes('liberada a su nombre')),
          `el técnico: «${tec.inicio.frase}», con su orden de K-101 una sola vez`)
        comprobar(jefe.inicio.frase === 'De 8,1 días que dura una falla, 7,7 son espera. El vigía anunció 3 de 3 fallas.' && jefe.inicio.cifra === '7,7 de 8,1'
          && jefe.tareas.some(t => t.titulo === 'Ojo: no intervenir hoy.' && !t.pide && linea(t.porque).startsWith('P-201A y P-201C valen más')),
          `el jefe de mantenimiento: «${jefe.inicio.frase}», y «Ojo: no intervenir» como aviso`)
        const vacio = ver('jefe', ['palmar'])
        comprobar(vacio.vacio === 'Nada pendiente. El campo está normal.' && vacio.insignia === 0 && !vacio.bloqueos.length, `el vacío: «${vacio.vacio}»`)

        // 4. Cada rol ve solo lo que su capacidad le deja hacer.
        const malos = []
        let vistasHoy = 0
        for (const r of ROLES_VISIBLES) for (const campos of [...TODOS.map(c => [c]), TODOS]) {
          const h = ver(r.id, campos); vistasHoy++
          const suyos = camposAsignados(r, SES.sesion().usuarios).map(c => c.id)
          for (const t of h.tareas) {
            if (t.capacidad && !puedeHacer(r.puede, t.capacidad)) malos.push(`${r.id}: «${t.titulo}» pide ${t.capacidad}`)
            if (!t.capacidad && t.pide && !(t.tipo === 'orden' && r.id === 'tec')) malos.push(`${r.id}: «${t.titulo}» pide algo sin la capacidad que lo autoriza`)
            if (t.accion?.tipo === 'confirmar' && !puedeHacer(r.puede, 'anh:confirmar')) malos.push(`${r.id}: confirma en lote sin anh:confirmar`)
            if (t.preguntas?.some(q => q.via === 'libro') && !puedeHacer(r.puede, 'causa:declarar')) malos.push(`${r.id}: contesta al libro sin causa:declarar`)
            if (t.preguntas?.some(q => q.via === 'anh') && !puedeHacer(r.puede, 'anh:clasificar')) malos.push(`${r.id}: contesta al árbol sin anh:clasificar`)
            if (!suyos.includes(t.campoId)) malos.push(`${r.id}: una tarea de ${t.campoId}, que no tiene asignado`)
          }
          if (h.bloqueos.length && !puedeHacer(r.puede, 'causa:declarar')) malos.push(`${r.id}: la franja «No arrancar» sin poder decir qué se dañó`)
          if (h.insignia !== h.tareas.filter(t => t.pide).length || h.tareas.some(t => t.grupo === 'aviso' && t.pide)) malos.push(`${r.id}: la insignia no es lo que pide una acción`)
        }
        const ger = ver('ger', TODOS), prodH = ver('prod')
        comprobar(malos.length === 0 && ger.tareas.every(t => t.tipo === 'metas') && !prodH.tareas.some(t => t.tipo === 'conseguir-causa' || t.tipo === 'contestar') && !op.tareas.some(t => t.tipo === 'confirmar'),
          `cada tarea va con la capacidad de roles.ts que la autoriza, solo en los campos de la persona, y la insignia cuenta lo que pide una acción (${vistasHoy} vistas${malos.length ? `; ${malos.slice(0, 5).join('; ')}` : ''})`)

        // 5. El orden, con tareas armadas a mano (falla sin la regla de X4 §3.3).
        const T = (id, grupo, x = {}) => ({ id, tipo: 'aviso', campoId: 'ceiba', pide: grupo !== 'aviso', grupo, titulo: id, ...x })
        const ord = MH.ordenar([T('a', 'aviso'), T('d2', 'demas', { desde: '2026-10-02T05:00:00-05:00' }), T('b-si', 'barriles', { bblSiPara: 9000 }),
          T('d1', 'demas', { desde: '2026-10-01T05:00:00-05:00' }), T('b-ahora', 'barriles', { bblAhora: 300 }), T('h2', 'hora', { limite: '2026-10-04T07:00:00-05:00' }),
          T('h1', 'hora', { limite: '2026-10-03T07:00:00-05:00' })]).map(t => t.id).join()
        comprobar(ord === 'h1,h2,b-ahora,b-si,d1,d2,a', `el orden: hora (la más cercana), barriles (lo de ahora antes que lo que se perdería), lo demás por antigüedad y los avisos al final (${ord})`)

        // 6. D7: menos de 300 ms por rol, en un campo y en todos.
        const tiempos = []
        for (const r of ROLES_HOY) for (const campos of [['ceiba'], TODOS]) { const t0 = performance.now(); ver(r, campos); tiempos.push([`${r}${campos.length > 1 ? ' (todos)' : ''}`, performance.now() - t0]) }
        const lento = tiempos.reduce((a, b) => (b[1] > a[1] ? b : a))
        comprobar(lento[1] < 300, `Hoy se calcula en menos de 300 ms con cada rol (D7; el más lento, ${lento[0]}: ${lento[1].toFixed(0)} ms)`)

        // 7. «Deshacer» (D1): una escritura nueva, por inserción, que devuelve los pasos a lo que propone TRIM.
        const c0 = ver('sup').tareas.find(t => t.tipo === 'confirmar')
        const rc = await E.confirmarParadasAnh({ rolId: 'sup' }, { ids: c0.accion.ids, cadena: c0.accion.cadena })
        const ns = [...new Set(rc.paradas.flatMap(p => ARB.PASOS.map(x => p.clasificacion[x]).filter(d => d?.lote === rc.lote?.id && d.porId === 'sup').map(d => d.n)))]
        const tras = ver('sup')
        comprobar(rc.ok && ns.length === 12 && !tras.tareas.some(t => t.tipo === 'confirmar') && tras.insignia === 2 && tras.hechas.length === 1 && tras.hechas[0].detalle === 'las 2 paradas de P-201B'
          && tras.inicio.frase.includes('Le faltan 2 paradas por confirmar'),
          `«Confirmar las 2» la saca de la lista y pasa a «Hecho hoy (1) · ${tras.hechas[0]?.detalle}»`)
        const ajeno = await E.deshacerAnh({ rolId: 'prod' }, { ids: c0.accion.ids, n: ns })
        const sinCap = await E.deshacerAnh({ rolId: 'ger' }, { ids: c0.accion.ids, n: ns })
        const forma = await E.deshacerAnh({ rolId: 'sup' }, { ids: c0.accion.ids, n: ['x'] })
        const sinIds = await E.deshacerAnh({ rolId: 'sup' }, { n: ns })
        const otroCampo = ARB.pedirParadasAnh({ campos: ['morichal'], desde: new Date('2026-10-01T00:00:00-05:00'), hasta: new Date('2026-10-02T14:00:00-05:00') }, SES.sesion().ctx, SES.sesion().clasificacionesAnh)[0]
        const ajenoCampo = otroCampo ? await E.deshacerAnh({ rolId: 'sup' }, { ids: [otroCampo.id], n: ns }) : { estado: 404 }
        comprobar(ajeno.estado === 403 && ajeno.codigo === 'ajeno' && sinCap.estado === 403 && sinCap.codigo === 'sin-capacidad' && forma.estado === 400 && sinIds.estado === 400 && ajenoCampo.estado === 404,
          `solo deshace quien lo dijo (producción: ${ajeno.estado}), con capacidad (gerente: ${sinCap.estado}), con la forma del contrato (400) y en sus campos (404)`)
        const n0 = Math.max(...ns)
        const rd = await E.deshacerAnh({ rolId: 'sup' }, { ids: c0.accion.ids, n: ns })
        const g = SES.sesion().clasificacionesAnh
        const retirados = c0.accion.ids.flatMap(id => ARB.PASOS.map(x => g[id]?.[x])).filter(Boolean)
        const despues = ver('sup')
        comprobar(rd.ok && rd.paradas.every(p => p.estado === 'propuesta' && p.retiros?.length === 6 && p.retiros.every(x => x.motivo === MH.MOTIVO_DESHACER && x.porId === 'sup'))
          && retirados.length === 12 && retirados.every(d => d.procedencia === 'retirado' && d.n > n0 && d.porque === 'deshecho por quien contestó' && d.valor !== undefined)
          && SES.sesion().lotesAnh.some(l => l.id === rc.lote.id)
          && despues.tareas[0].tipo === 'confirmar' && despues.insignia === 3 && despues.hechas.length === 0,
          'deshacer escribe un paso nuevo «retirado» (con el valor, quién, la hora y «deshecho por quien contestó», con un consecutivo mayor) que rige: la parada vuelve a lo que propone TRIM, el lote queda en la historia y la tarjeta vuelve a Hoy')
        const otraVez = await E.deshacerAnh({ rolId: 'sup' }, { ids: c0.accion.ids, n: ns })
        const rc2 = await E.confirmarParadasAnh({ rolId: 'sup' }, { ids: c0.accion.ids, cadena: c0.accion.cadena })
        comprobar(otraVez.estado === 409 && otraVez.codigo === 'ya-cambio' && rc2.ok && rc2.lote.id !== rc.lote.id,
          `lo ya deshecho no se deshace dos veces (409) y se puede volver a confirmar (${rc2.lote?.id})`)
        const vueltaD = diferencia({ paradas: rd.paradas, guardadas: g }, K.deRespuesta(C.R_DESHACER, JSON.parse(JSON.stringify(K.aRespuesta(C.R_DESHACER, { paradas: rd.paradas, guardadas: g })))))
        comprobar(!vueltaD, `la respuesta de «Deshacer» vuelve igual por JSON${vueltaD ? `: ${vueltaD}` : ''}`)

        // 8. Por el cable: la vista es JSON puro y la ruta lleva rol y campos.
        const url = C.urlDe(C.HOY, { rol: 'sup', campos: ['ceiba'] })
        const vueltaH = diferencia(sup, K.deRespuesta(C.HOY.codec, JSON.parse(JSON.stringify(K.aRespuesta(C.HOY.codec, sup)))))
        comprobar(url === '/vistas/hoy?campos=ceiba&rol=sup' && !vueltaH, `GET ${url} vuelve igual por JSON${vueltaH ? `: ${vueltaH}` : ''}`)
      } finally { SES.cambiarSesion(fotoAntesC3) }
    }
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
      // El HTTP y el código del contrato viajan con el rechazo (C-08) cuando el rechazo es del servidor (el aviso
      // del operador lo frena antes la pantalla, que ya sabe que su rol no envía avisos: no llega a pedirse).
      const delServidor = r.estado !== undefined
      traducidos.push(!r.ok && r.error === error.mensaje && (!delServidor || (r.estado === estado && r.codigo === error.codigo)) && (estado === 403 || delServidor))
    }
    rechazo = { estado: 422, error: { codigo: 'acceso-invalido', mensaje: 'Revise el formulario.', errores: [{ campo: 'correo', texto: 'Ya hay una persona con ese correo.' }] } }
    const acc = await E.invitarUsuario({ rolId: 'ger' }, { invitacion: { nombre: 'X Y Z', correo: 'a@b.co', rolId: 'sup', campos: ['ceiba'], alertas: false }, motivo: 'prueba' })
    rechazo = { estado: 422, error: { codigo: 'descripcion-corta', mensaje: 'Escriba qué pasa.', campo: 'descripcion' } }
    const av = await E.enviarAviso({ rolId: 'sup' }, { tipo: 'M1', campoId: 'ceiba', equipo: 'P-201B', descripcion: 'x', prioridad: 3, parada: false, evidencia: [] })
    rechazo = { estado: 500, error: { codigo: 'interno', mensaje: 'falló la base' } }
    const caida = await E.cargarAsignacion({ rolId: 'prod' }, { filas: [], motivo: 'prueba de caída' })
    rechazo = null
    comprobar(traducidos.every(Boolean) && !acc.ok && acc.errores[0]?.campo === 'correo' && !av.ok && av.campo === 'descripcion' && !caida.ok && /No se guardó: falló la base/.test(caida.error),
      '409, 403 y 422 vuelven como { ok: false, error } con el mensaje, el HTTP y el código del servidor; los errores por caja de un acceso y la caja de un aviso se conservan; un 500 dice que no se guardó')
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
    const arbolH = await consulta.traer(C.ARBOL_CHOKE, { ...qa, orden: 'circular' }, 'h5', noCalcular)
    comprobar(pedidos.length === nH + 4 && pedidos.slice(-4).every(x => x.startsWith('GET /api/vistas/')) && !diferencia(tubH, R.TUBERIA(qt))
      && !diferencia(anhH, R.PARADAS_ANH(qa)) && !diferencia(critH, R.CRITICIDAD({ campos: ['ceiba', 'morichal'] })) && anhH.some(p => p.clasificacion.n1)
      && !diferencia(arbolH, R.ARBOL_CHOKE({ ...qa, orden: 'circular' })) && arbolH.raiz.hijos.every(h => h.dimension === 'responsable') && /orden=circular/.test(pedidos.at(-1)),
      `la tubería, las paradas ANH, «si falla hoy» y el árbol del choke llegan por GET y son lo mismo que calcula el motor (${pedidos.slice(-4).map(x => x.split('?')[0].slice(4)).join(', ')})`)
    const filaH = anhH.find(p => p.estado === 'propuesta')
    const antesH = SES.sesion().clasificacionesAnh, nC = cuerpos.length
    const rc = await E.clasificarParada({ rolId: 'sup' }, filaH.id, { pasos: { impacto: 'diferida' }, por: 'alguien', porId: 'x', hora: '2026-10-02T14:00:00-05:00' })
    const rl = await E.confirmarParadasAnh({ rolId: 'prod' }, { ids: [filaH.id] })
    const ry = await E.declararYacimientoAnh({ rolId: 'prod' }, filaH.id, { evidencia: 'prueba' })
    const rv = await E.previsualizarConfiguracion({ rolId: 'adm' }, { config: s.ctx.config })
    const ri = await E.importarTopologia({ rolId: 'adm' }, { campo: 'ceiba', texto: 'SE-2;todos' })
    const rs = await E.responderPreguntaAnh({ rolId: 'oper' }, filaH.id, { pregunta: 'corte', opcion: 'Del campo: pórtico, red de media o subestación', aplicarAlEvento: true })
    const rm = await E.revisarParadaAnh({ rolId: 'oper' }, filaH.id, { motivo: 'No paró por la energía', aplicarAlEvento: true })
    const caminosH = cuerpos.slice(nC).map(x => x.camino)
    rechazo = { estado: 422, error: { codigo: 'clasificacion-incoherente', mensaje: '«No planeada - Mecánica subsuelo» es una causa no planeada: cambie primero «¿Planeada?».' } }
    const rr = await E.clasificarParada({ rolId: 'sup' }, filaH.id, { pasos: { planeacion: 'planeada', n1: 'NP_SUB' } })
    rechazo = { estado: 403, error: { codigo: 'sin-capacidad', mensaje: 'Su rol no confirma «Dónde se trabó»: lo confirma supervisión, producción, el jefe de mantenimiento o confiabilidad.' } }
    const rp = await E.confirmarParadasAnh({ rolId: 'oper' }, { ids: [filaH.id], pasos: ['choke'] })
    rechazo = null
    const idH = encodeURIComponent(filaH.id)
    comprobar(rc.ok && rl.ok && ry.ok && rv.ok && ri.ok && rs.ok && rm.ok && rc.parada.id === filaH.id && rv.impacto.campos[0]?.campoId === 'ceiba' && ri.topologia.length === 1
      && SES.sesion().clasificacionesAnh !== antesH && Object.hasOwn(SES.sesion().clasificacionesAnh, filaH.id)
      && caminosH.join() === [`/anh/paradas/${idH}/clasificacion`, '/anh/paradas/confirmar', `/anh/paradas/${idH}/yacimiento`, '/configuracion/vista-previa', '/topologia/importar',
        `/anh/paradas/${idH}/respuesta`, `/anh/paradas/${idH}/revision`].join()
      && cuerpos.slice(nC).every(x => !['por', 'porId', 'hora', 'procedencia', 'rol'].some(k => k in x.cuerpo))
      && !rr.ok && /cambie primero/.test(rr.error) && !rp.ok && /no confirma «Dónde se trabó»/.test(rp.error),
      'las escrituras del árbol (también la respuesta de campo y la revisión) y de la topología van a su ruta sin por, hora ni procedencia (las pone el servidor), lo aceptado se copia a la sesión, y el 422 y el 403 llegan con sus palabras')

    // C3 · Hoy: la vista llega por GET y «Deshacer» va a su ruta solo con las filas y los consecutivos.
    {
      const qh = { rol: 'sup', campos: ['ceiba'] }
      const nG = pedidos.length
      const hoyH = await consulta.traer(C.HOY, qh, 'c3', noCalcular)
      const f0 = globalThis.fetch, vistosD = []
      globalThis.fetch = async (url, init = {}) => {
        const u = new URL(url, 'http://servidor')
        if (u.pathname !== '/api/anh/paradas/deshacer') return f0(url, init)
        const cuerpo = JSON.parse(init.body)
        vistosD.push({ cuerpo, rol: init.headers?.['x-rol'] ?? new Headers(init.headers).get('x-rol') })
        const paradas = cuerpo.ids.map(id => ARB.pedirParadaAnh(id, srv.ctx, {}))
        return new Response(JSON.stringify(K.aRespuesta(C.R_DESHACER, { paradas, guardadas: Object.fromEntries(cuerpo.ids.map(id => [id, {}])) })), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      let rdH
      try { rdH = await E.deshacerAnh({ rolId: 'sup' }, { ids: [filaH.id, filaH.id], n: [7, 7, 8] }) } finally { globalThis.fetch = f0 }
      comprobar(pedidos.length === nG + 1 && pedidos.at(-1).startsWith('GET /api/vistas/hoy?campos=ceiba&rol=sup') && !diferencia(hoyH, R.HOY(qh))
        && rdH.ok && rdH.paradas[0].id === filaH.id && vistosD.length === 1 && JSON.stringify(vistosD[0].cuerpo) === JSON.stringify({ ids: [filaH.id], n: [7, 8] }),
        `Hoy llega por GET y es lo que calcula el motor; «Deshacer» va a POST /api/anh/paradas/deshacer sin repetir filas ni consecutivos, sin por, hora ni procedencia (${JSON.stringify(vistosD[0]?.cuerpo ?? {}).slice(0, 80)})`)
    }

    console.log(`\n${pruebas - fallos} de ${pruebas} comprobaciones http bien.`)
  }
} finally { await v.close() }

if (!HTTP) console.log(`\n${pruebas - fallos} de ${pruebas} comprobaciones bien.`)
if (fallos) { console.log(`${fallos} FALLARON.`); process.exit(1) }
