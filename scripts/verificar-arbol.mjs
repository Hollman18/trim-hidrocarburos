/* Verificación del árbol de paradas de la Circular ANH 024: el catálogo
 * regulatorio, la clasificación de 6 pasos y el tramo reportable (P1 §1-§2,
 * Anexo A; U1 §2; U2 §4).
 *
 * Corre sobre el demo, con los mismos insumos que verificar-libro. Sale con
 * código 1 si alguna comprobación falla: nunca se da por bueno un resultado
 * sin mirarlo. Donde el demo no trae un caso de una fila de REGLAS_ANH, la
 * prueba usa un evento real con la entrada que todavía no existe en la
 * configuración (protecciones, pareja del programa, topología de frontera) y
 * lo dice en la línea.
 *
 *   node scripts/verificar-arbol.mjs
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
// Estas comprobaciones son del demo: un .env.local que apunte a un backend
// (VITE_FUENTE=http) no las cambia de fuente.
process.env.VITE_FUENTE = 'demo'
// fileURLToPath y no `.pathname`: con espacios o tildes en la carpeta la ruta
// sale en %20/%C3%B3 y Vite no la encuentra.
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
// Sin la configuración del proyecto: no levanta el simulador de la API.
const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
// Los insumos del motor se instalan antes de calcular, como lo hace main.tsx.
const INS = await v.ssrLoadModule('/src/entities/insumos.ts')
INS.instalarInsumos((await v.ssrLoadModule('/src/entities/datos/index.ts')).INSUMOS_DEMO)
const L = await v.ssrLoadModule('/src/entities/libro.ts')
const K = await v.ssrLoadModule('/src/entities/anh-catalogo.ts')
// Las cadenas de las fuentes (Tabla 1 y Diccionario) viven en el mismo módulo del catálogo.
const X = K
const A = await v.ssrLoadModule('/src/entities/anh-clasificacion.ts')
const P = await v.ssrLoadModule('/src/entities/anh-paradas.ts')
const CH = await v.ssrLoadModule('/src/entities/choke.ts')
const RO = await v.ssrLoadModule('/src/entities/roles.ts')
const RL = await v.ssrLoadModule('/src/entities/reloj.ts')

let fallos = 0, pruebas = 0
const comprobar = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('  ✗ FALLA:', msg) } else console.log('  ✓', msg) }
const cerca = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b))
/** El error que lanza una función, o undefined si no lanza. */
const lanza = f => { try { f(); return undefined } catch (e) { return e } }
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const f0 = n => Math.round(n).toLocaleString('es-CO')

const ctx0 = L.contextoInicial()
const TODOS = ['ceiba', 'morichal', 'guacamayo', 'palmar', 'zarza']
const D = 86_400_000
// Todo el historial, hasta el final del día de hoy (el reloj del demo es el 2-oct, 14:00).
const DESDE = new Date(L.calendario()[0].desde)
const HASTA = new Date(P.inicioDiaCo(RL.AHORA.getTime()) + D)
const TRAMOS = L.tramosEntre(TODOS, DESDE, HASTA, ctx0)
const tramo = (id, tr = TRAMOS) => tr.find(t => t.evento.id === id)
const proponer = (t, ctx = ctx0, op) => A.proponerClasificacion(t.causa, t.pozo.campoId, ctx, op)
const HORA = '2026-10-02T14:30:00-05:00'
const NELSON = { id: 'u-sup', nombre: 'Nelson Ortiz' }, JAIRO = { id: 'u-oper', nombre: 'Jairo Peña' }
const MARCELA = { id: 'u-prod', nombre: 'Marcela Ríos' }, EDWIN = { id: 'u-conf', nombre: 'Edwin Maestre' }
const OSCAR = { id: 'u-tec', nombre: 'Óscar Daza' }
const valores = b => Object.fromEntries(K.PASOS.filter(p => b[p]).map(p => [p, b[p].valor]))
const ESTADO = { propuesta: 'falta confirmar', 'por-precisar': 'falta un dato', confirmada: 'completa', pendiente: 'sin causa' }

/** Los 117 códigos del Anexo A de P1 con su cadena de la Tabla 1, copiados del plan
 *  (docs/plan-circular-24/P1-producto.md, Anexo A): la prueba no los genera, los compara. */
const ANEXO_A = 
[
  ["P_MANT_ELE/transformador", "Transformador"],
  ["P_MANT_ELE/acometida-electrica", "Acometida eléctrica"],
  ["P_MANT_ELE/ups-fuente", "UPS / Fuente"],
  ["P_MANT_ELE/generador", "Generador"],
  ["P_MANT_ELE/protecciones-electricas", "Protecciones eléctricas"],
  ["P_MANT_ELE/cableado-electrico", "Cableado eléctrico"],
  ["P_MANT_ELE/mcc-switchgear", "MCC / Switchgear"],
  ["P_MANT_ELE/vsd", "VSD"],
  ["P_MANT_ELE/red-interna-bt-mt-at", "Red interna BT/MT/AT"],
  ["P_MANT_MEC/unidad-de-bombeo-superficie", "Unidad de bombeo superficie"],
  ["P_MANT_MEC/caja-reductora", "Caja reductora"],
  ["P_MANT_MEC/correas-poleas", "Correas / Poleas"],
  ["P_MANT_MEC/bomba-superficie", "Bomba (superficie)"],
  ["P_MANT_MEC/compresor", "Compresor"],
  ["P_MANT_MEC/lubricacion", "Lubricación"],
  ["P_MANT_MEC/sistema-de-levantamiento-artificial", "Sistema de Levantamiento Artificial"],
  ["P_MANT_INS/calibracion-instrumentos-presion", "Calibración instrumentos presión"],
  ["P_MANT_INS/calibracion-instrumentos-nivel", "Calibración instrumentos nivel"],
  ["P_MANT_INS/sensores-fondo", "Sensores fondo"],
  ["P_MANT_INS/instrumentacion-superficie", "Instrumentación superficie"],
  ["P_MANT_INS/verificacion-lazos-de-control", "Verificación lazos de control"],
  ["P_MANT_INS/valvulas-de-control", "Válvulas de control"],
  ["P_MANT_INT/inspeccion-lineas-internas", "Inspección líneas internas"],
  ["P_MANT_INT/inspeccion-valvulas", "Inspección válvulas"],
  ["P_MANT_INT/inspeccion-tubing-casing", "Inspección tubing / casing"],
  ["P_MANT_INT/cambio-de-tramo-de-linea", "Cambio de tramo de línea"],
  ["P_MANT_INT/reparacion-por-corrosion", "Reparación por corrosión"],
  ["P_MANT_INT/reemplazo-de-valvulas", "Reemplazo de válvulas"],
  ["P_WO/workover-recompletacion", "Workover / recompletación"],
  ["P_WO/cambio-zona-productora", "Cambio zona productora"],
  ["P_WO/canoneo-fractura-estimulacion", "Cañoneo / fractura / estimulación"],
  ["P_WO/servicio-contratado-equipo", "Servicio contratado (equipo)"],
  ["P_PRUEBAS/prueba-de-pozo-presion-transiente-produccion-potencial-plt-ilt-otros", "Prueba de pozo (presión transiente, producción, potencial, PLT, ILT, otros)"],
  ["P_PRUEBAS/prueba-de-integridad", "Prueba de integridad"],
  ["P_PRUEBAS/verificacion-calibracion-metrologia", "Verificación/calibración (metrología)"],
  ["P_PRUEBAS/hazop-verificacion-de-seguridad", "HAZOP / verificación de seguridad"],
  ["P_PES/comisionamiento", "Comisionamiento"],
  ["P_PES/reintegro-tras-overhaul", "Reintegro tras overhaul"],
  ["P_PES/hook-up-puesta-en-marcha", "Hook-up / puesta en marcha"],
  ["P_OP/curtailed-por-decision-operativa", "Curtailed por decisión operativa"],
  ["P_OP/optimizacion-ramp-up-controlado", "Optimización / ramp-up controlado"],
  ["P_OP/operacion-por-balance-de-inventarios", "Operación por balance de inventarios"],
  ["NP_CLIMA/tormenta-electrica-descargas", "Tormenta eléctrica / descargas"],
  ["NP_CLIMA/deslizamiento-derrumbe", "Deslizamiento / derrumbe"],
  ["NP_CLIMA/incendio-natural", "Incendio (natural)"],
  ["NP_CLIMA/otro-evento-natural", "Otro evento natural"],
  ["NP_CLIMA/inundacion-desborde-de-rio", "Inundación / Desborde de río"],
  ["NP_CLIMA/fuertes-lluvias-vias-intransitables", "Fuertes lluvias / vías intransitables"],
  ["NP_OPUB/paro-gremios-transportadores", "Paro gremios / transportadores"],
  ["NP_OPUB/grupo-armado-amenaza-seguridad", "Grupo armado / amenaza seguridad"],
  ["NP_OPUB/hurto", "Hurto"],
  ["NP_OPUB/sabotaje-atentado", "Sabotaje / atentado"],
  ["NP_OPUB/vandalismo-dano-intencional", "Vandalismo / daño intencional"],
  ["NP_OPUB/orden-publico-pendiente-detalle", "Orden público - Pendiente detalle"],
  ["NP_OPUB/bloqueo-comunidad-ingreso-a-locacion", "Bloqueo comunidad / ingreso a locación"],
  ["NP_OPUB/bloqueo-indigena-ingreso-a-locacion", "Bloqueo indígena / ingreso a locación"],
  ["NP_ENEXT/corte-energia-proveedor", "Corte energía proveedor"],
  ["NP_ENEXT/baja-alta-tension-del-proveedor", "Baja/alta tensión del proveedor"],
  ["NP_ENEXT/falla-subestacion-externa", "Falla subestación externa"],
  ["NP_ENEXT/acometida-externa-afectada-poste-red-externa", "Acometida externa afectada (poste/red externa)"],
  ["NP_ENINT/falla-transformador", "Falla transformador"],
  ["NP_ENINT/falla-mcc-switchgear", "Falla MCC/Switchgear"],
  ["NP_ENINT/falla-ups-fuente", "Falla UPS/Fuente"],
  ["NP_ENINT/falla-generador-local", "Falla generador local"],
  ["NP_ENINT/falla-cableado-interno-empalmes", "Falla cableado interno/empalmes"],
  ["NP_ENINT/falla-protecciones-breaker-fusible-rele", "Falla protecciones (breaker/fusible/relé)"],
  ["NP_ENINT/punto-caliente", "Punto Caliente"],
  ["NP_ENINT/falla-sistema-a-tierra", "Falla Sistema a Tierra"],
  ["NP_ENINT/falla-por-fauna", "Falla por Fauna"],
  ["NP_ENINT/falla-por-flora", "Falla por Flora"],
  ["NP_ENINT/falla-por-falta-de-mantenimiento", "Falla por falta de Mantenimiento"],
  ["NP_ENINT/falla-vsd", "Falla VSD"],
  ["NP_ENINT/falla-red-interna-bt-mt-at", "Falla red interna BT/MT/AT"],
  ["NP_INS/falla-transmisor-de-presion", "Falla transmisor de presión"],
  ["NP_INS/falla-transmisor-de-nivel", "Falla transmisor de nivel"],
  ["NP_INS/falla-sensor-fondo", "Falla sensor fondo"],
  ["NP_INS/instrumento-fuera-de-rango", "Instrumento fuera de rango"],
  ["NP_INS/instrumento-sin-senal", "Instrumento sin señal"],
  ["NP_INS/dano-por-humedad-inundacion", "Daño por humedad / inundación"],
  ["NP_INS/dano-por-tormenta-electrica", "Daño por tormenta eléctrica"],
  ["NP_INS/hurto-de-instrumentacion", "Hurto de instrumentación"],
  ["NP_INS/instrumentacion-manipulada-por-terceros", "Instrumentación manipulada por terceros"],
  ["NP_INS/falla-por-falta-de-mantenimiento", "Falla por falta de Mantenimiento"],
  ["NP_INS/error-de-calibracion", "Error de calibración"],
  ["NP_CTRL/falla-plc-cpu", "Falla PLC/CPU"],
  ["NP_CTRL/falla-scada-red-comunicaciones", "Falla SCADA/red/comunicaciones"],
  ["NP_CTRL/falla-hmi-servidor", "Falla HMI/Servidor"],
  ["NP_CTRL/falla-instrumento-sensor", "Falla Instrumento/sensor"],
  ["NP_CTRL/perdida-linea-de-vista-flora", "Perdida Línea de Vista (Flora)"],
  ["NP_CTRL/falla-configuracion-parametrizacion", "Falla configuración/parametrización"],
  ["NP_SUB/falla-esp", "Falla ESP"],
  ["NP_SUB/falla-pcp", "Falla PCP"],
  ["NP_SUB/falla-gas-lift", "Falla Gas Lift"],
  ["NP_SUB/arenamiento-obstruccion", "Arenamiento / obstrucción"],
  ["NP_SUB/integridad-de-pozo-packer-tubing-casing", "Integridad de pozo (packer/tubing/casing)"],
  ["NP_SUB/alto-bsw-corte-de-agua", "Alto BSW / corte de agua"],
  ["NP_SUP/falla-unidad-de-bombeo-superficie-componentes", "Falla unidad de bombeo superficie (Componentes)"],
  ["NP_SUP/falla-rodamiento-cojinete-bearing-box", "Falla rodamiento/cojinete (bearing box)"],
  ["NP_SUP/falla-caja-reductora-lubricacion", "Falla caja reductora / lubricación"],
  ["NP_SUP/falla-correas-poleas", "Falla Correas / Poleas"],
  ["NP_SUP/falla-motor-superficie", "Falla motor superficie"],
  ["NP_SUP/falla-sistema-de-levantamiento-artificial", "Falla Sistema de Levantamiento Artificial"],
  ["NP_INTEG/pitting-corrosion", "Pitting / corrosión"],
  ["NP_INTEG/fuga-dano-en-linea-interna", "Fuga / daño en línea interna"],
  ["NP_INTEG/dano-valvula-acople-union", "Daño válvula/acople/unión"],
  ["NP_INTEG/cambio-de-tramo-valvuleria-correctivo", "Cambio de tramo/valvulería (correctivo)"],
  ["NP_PROC/tanques-llenos-capacidad-limitada", "Tanques llenos / capacidad limitada"],
  ["NP_PROC/capacidad-tratamiento-agua-crudo-limitada", "Capacidad tratamiento agua/crudo limitada"],
  ["NP_PROC/capacidad-compresion-transferencia-gas-limitada", "Capacidad compresión/transferencia gas limitada"],
  ["NP_PROC/parada-estacion-bombeo-afecta-pozos", "Parada estación/bombeo afecta pozos"],
  ["NP_TRANSP/oleoducto-externo-fuera-de-servicio", "Oleoducto externo fuera de servicio"],
  ["NP_TRANSP/atentado-sabotaje-oleoducto-externo", "Atentado/sabotaje oleoducto externo"],
  ["NP_TRANSP/restriccion-nominacion-entrega", "Restricción nominación/entrega"],
  ["NP_TRANSP/terminal-cliente-no-recibe", "Terminal/cliente no recibe"],
  ["NP_AUT/restriccion-autoridad", "Restricción autoridad"],
  ["NP_AUT/restriccion-ambiental", "Restricción ambiental"],
  ["NP_AUT/suspension-orden-autoridad", "Suspensión/orden autoridad"],
]

console.log('\n=== 1. La regla del slug reproduce los 117 códigos del Anexo A ===')
const generados = K.N2_CIRCULAR.map(n => n.codigo)
comprobar(generados.length === 117 && new Set(generados).size === 117, `117 códigos N2 en la versión C024-2026, ninguno repetido (${generados.length}, ${new Set(generados).size} distintos)`)
comprobar(igual(generados, ANEXO_A.map(x => x[0])), 'la regla del slug reproduce uno a uno, y en su orden, los 117 códigos del Anexo A de P1')
comprobar(ANEXO_A.every(([c, s]) => K.N2_CIRCULAR.find(n => n.codigo === c)?.texto === s), 'cada código lleva la cadena de la Tabla 1 que da el Anexo A, byte a byte')
comprobar(K.slugN2('Cañoneo / fractura / estimulación') === 'canoneo-fractura-estimulacion' && K.slugN2('Falla protecciones (breaker/fusible/relé)') === 'falla-protecciones-breaker-fusible-rele'
  && K.slugN2('  --Instrumento sin señal--  ') === 'instrumento-sin-senal',
  'slug: sin tildes, la ñ pasa a n, cada racha de caracteres que no son letra ni número es un solo guion, sin guiones en los extremos')
for (const ver of ['C024-2026', 'DICC-V3.2']) {
  const V = K.VERSIONES_CATALOGO[ver]
  comprobar(V.parejas.length === 117 && new Set(V.parejas).size === 117 && V.parejas.every(c => K.esCodigoN2(c, ver)) && Object.keys(V.forma.n2).length === 117,
    `${ver}: 117 parejas distintas, todas con su cadena de salida`)
}
comprobar(K.esCodigoN2('NP_INS/falla-instrumento-sensor', 'DICC-V3.2') && !K.esCodigoN2('NP_INS/falla-instrumento-sensor', 'C024-2026')
  && K.esCodigoN2('NP_CTRL/falla-instrumento-sensor', 'C024-2026') && !K.esCodigoN2('NP_CTRL/falla-instrumento-sensor', 'DICC-V3.2')
  && K.equivalente('NP_CTRL/falla-instrumento-sensor', 'DICC-V3.2') === 'NP_INS/falla-instrumento-sensor'
  && K.equivalente('NP_INS/falla-instrumento-sensor', 'C024-2026') === 'NP_CTRL/falla-instrumento-sensor',
  '«Falla Instrumento/sensor» es NP_CTRL en la circular y NP_INS en el Diccionario: una equivalencia entre versiones, sin reescribir lo guardado')

console.log('\n=== 2. Cada N2 pertenece a su N1 ===')
const N1 = K.N1_CIRCULAR
const planeadas = N1.filter(n => n.planeacion === 'planeada'), noPlaneadas = N1.filter(n => n.planeacion === 'no-planeada')
comprobar(N1.length === 20 && planeadas.length === 8 && noPlaneadas.length === 12
  && planeadas.reduce((a, n) => a + n.n2.length, 0) === 42 && noPlaneadas.reduce((a, n) => a + n.n2.length, 0) === 75,
  '20 claves N1: 8 planeadas con 42 N2 y 12 no planeadas con 75 N2 (R1 §1.5)')
comprobar(igual(N1.map(n => n.n2.length), [9, 7, 6, 6, 4, 4, 3, 3, 6, 8, 4, 13, 11, 6, 6, 6, 4, 4, 4, 3]), 'los N2 de cada N1, en el orden de la Tabla 1, son los del Anexo A (9, 7, 6, 6, 4, 4, 3, 3, 6, 8, 4, 13, 11, 6, 6, 6, 4, 4, 4, 3)')
comprobar(N1.every(n => (n.planeacion === 'planeada') === n.clave.startsWith('P_') && (n.planeacion === 'no-planeada') === n.clave.startsWith('NP_')),
  'la condición de la Tabla 1 coincide con el prefijo: planeada ⇔ P_, no planeada ⇔ NP_')
comprobar(K.N2_CIRCULAR.every(n => K.n1DeCodigo(n.codigo) === n.n1 && K.n2DeN1(n.n1).includes(n.codigo) && K.n2EnN1(n.codigo, n.n1)),
  'los 117 N2 de la circular están dentro de su N1, y solo de ella')
comprobar(K.VERSIONES_CATALOGO['DICC-V3.2'].arbol.every(n => n.n2.every(c => K.n1DeCodigo(c) === n.clave)),
  'en el Diccionario también: cada N2 está bajo la N1 de su prefijo (con la pareja que se mudó a NP_INS)')
comprobar(K.esCodigoN2('NP_ENINT/falla-por-falta-de-mantenimiento') && K.esCodigoN2('NP_INS/falla-por-falta-de-mantenimiento')
  && K.textoN2('NP_ENINT/falla-por-falta-de-mantenimiento') === K.textoN2('NP_INS/falla-por-falta-de-mantenimiento'),
  '«Falla por falta de Mantenimiento» es la misma cadena en NP_ENINT y en NP_INS, y son dos códigos: la clave es la pareja')
const citados = [
  ...A.REGLAS_ANH.filas.flatMap(f => [f.propone.n2, f.sugiere?.n2, ...(f.opciones.n2 ?? []), ...(f.alternativas ?? [])]),
  ...Object.values(A.CHIPS_ANH).flatMap(c => [c.propone.n2, ...(c.opciones.n2 ?? [])]),
  ...Object.values(A.PREGUNTAS_CAMPO).flatMap(q => q.opciones.flatMap(o => [o.deja.n2, ...(o.acota?.n2 ?? [])])),
].filter(Boolean)
comprobar(citados.length > 100 && citados.every(c => K.esCodigoN2Conocido(c)), `las ${citados.length} parejas que citan REGLAS_ANH, los motivos cerrados y las preguntas existen en el catálogo`)
const filasCoherentes = A.REGLAS_ANH.filas.every(f => {
  const n1 = f.propone.n1, n2 = f.propone.n2, pl = f.propone.planeacion
  return (!n1 || !n2 || K.n1DeCodigo(n2) === n1) && (!n1 || !pl || K.planeacionDeN1(n1) === pl)
    && (!pl || (f.opciones.n1 ?? []).every(k => K.planeacionDeN1(k) === pl))
})
comprobar(filasCoherentes, 'ninguna fila de REGLAS_ANH v1 propone una pareja fuera de su N1 ni una N1 de la otra planeación')

console.log('\n=== 3. La coherencia planeada / N1 está bloqueada ===')
const dato = (valor, procedencia = 'regla') => ({ valor, procedencia, regla: 'prueba' })
const base = { responsable: dato('op-mantenimiento'), choke: dato('pozo'), impacto: dato('diferida') }
const e1 = lanza(() => A.clasificar({ ...base, planeacion: dato('planeada'), n1: dato('NP_SUB'), n2: dato('NP_SUB/falla-esp') }))
comprobar(e1 instanceof A.ErrorClasificacion && /no va con/.test(e1.message) && /rechaza/.test(e1.message),
  `planeada con NP_SUB es imposible: «${e1?.problemas?.[0]?.slice(0, 110)}…»`)
const e2 = lanza(() => A.clasificar({ ...base, planeacion: dato('no-planeada'), n1: dato('P_WO'), n2: dato('P_WO/workover-recompletacion') }))
comprobar(e2 instanceof A.ErrorClasificacion && /no va con/.test(e2.message), 'no planeada con P_WO es imposible: el ejemplo de rechazo de la circular (C24 p.7)')
const e3 = lanza(() => A.clasificar({ ...base, planeacion: dato('no-planeada'), n1: dato('NP_ENINT'), n2: dato('NP_SUB/falla-esp') }))
comprobar(e3 instanceof A.ErrorClasificacion && /no es una causa de/.test(e3.message), `un N2 fuera de su N1 es imposible: «${e3?.problemas?.[0]}»`)
const e4 = lanza(() => A.clasificar({ ...base, planeacion: dato('no-planeada'), n1: dato('NP_XX'), n2: dato('NP_SUB/falla-esp') }))
comprobar(e4 instanceof A.ErrorClasificacion && /20 claves/.test(e4.message), 'una N1 fuera de las 20 de la circular es imposible')
const e5 = lanza(() => A.clasificar({ ...base, planeacion: dato('no-planeada') }))
comprobar(e5 instanceof A.ErrorClasificacion && e5.problemas.length === 2, 'sin N1 ni N2 no hay clasificación: es un borrador, y dice qué falta')
const e6 = lanza(() => A.clasificar({ ...base, planeacion: dato('no-planeada', 'confirmado'), n1: dato('NP_SUB'), n2: dato('NP_SUB/falla-esp') }))
comprobar(e6 instanceof A.ErrorClasificacion && /quién/.test(e6.message), 'un paso con marca de persona sin quién ni hora se rechaza')
const ok = A.clasificar({ ...base, planeacion: dato('no-planeada'), n1: dato('NP_SUB'), n2: dato('NP_SUB/falla-esp') })
comprobar(ok.n2.valor === 'NP_SUB/falla-esp' && ok.cauGral.valor === 'mecanico' && ok.cauGral.regla === 'CAU_GRAL_DE_N1@1', 'la combinación coherente se clasifica, con la causa general provisional de CAU_GRAL_DE_N1@1')
const espOL = proponer(tramo('EP-LC06-251001-96'))
const cambio = A.reevaluar(espOL, A.declararPaso(espOL.borrador, 'planeacion', 'planeada', NELSON, 'sup', HORA))
comprobar(!cambio.borrador.n1 && !cambio.borrador.n2 && igual(cambio.faltan, ['n1', 'n2']) && cambio.opciones.n1.length === 8 && cambio.opciones.n1.every(k => k.startsWith('P_')),
  'cambiar a «Planeada» borra la causa de las no planeadas (no se convierte) y solo ofrece las 8 P_ (U1 §2.5)')
const e7 = lanza(() => A.declararPaso(espOL.borrador, 'n1', 'P_WO', NELSON, 'sup', HORA))
comprobar(e7 instanceof A.ErrorClasificacion && /cambie primero/.test(e7.message), 'escoger una N1 de la otra planeación se rechaza: hay que cambiar primero «¿Planeada?»')

console.log('\n=== 4. REGLAS_ANH v1: una comprobación por fila, con un caso del demo ===')
/** El evento real LC-21 (sin causa) contestado con un motivo cerrado, como lo guarda la pantalla o WhatsApp. */
const ctxChip = texto => ({ config: ctx0.config, respuestas: { 'EP-LC21-261001-01': { texto, por: 'Jairo Peña · operador de campo', porId: 'u-oper', hora: '2026-10-02T14:00:00-05:00' } } })
const ctxFrontera = { config: { ...ctx0.config, topologia: [{ elemento: 'SE-2', choke: 'exportacion', alcance: 'frontera', campoId: 'morichal' }] }, respuestas: {} }
const CASOS = [
  { fila: 'esp-falla', id: 'EP-LC06-251001-96', como: 'real', espera: { responsable: 'op-mantenimiento', impacto: 'diferida', planeacion: 'no-planeada', n1: 'NP_SUB', n2: 'NP_SUB/falla-esp' }, faltan: [] },
  { fila: 'esp-admision', id: 'EP-LC12-251005-53', como: 'real', espera: { responsable: 'op-mantenimiento', n1: 'NP_SUB' }, faltan: ['n2'],
    extra: p => igual(p.opciones.n2, ['NP_SUB/falla-esp', 'NP_SUB/arenamiento-obstruccion', 'NP_SUB/alto-bsw-corte-de-agua']) && p.preguntas.some(q => q.id === 'aporte' && q.quien === 'yacimiento') },
  { fila: 'bombeo-mecanico', id: 'EP-PA06-251231-63', como: 'real', espera: { responsable: 'op-mantenimiento', n1: 'NP_SUP' }, faltan: ['n2'],
    extra: p => p.opciones.n2.length === 6 && p.sugerido.n2 === 'NP_SUP/falla-sistema-de-levantamiento-artificial' && !!p.hueco },
  { fila: 'linea-rodamientos', id: 'EP-LC16-251219-60', como: 'real', espera: { responsable: 'op-mantenimiento', n1: 'NP_SUP', n2: 'NP_SUP/falla-rodamiento-cojinete-bearing-box' }, faltan: [] },
  { fila: 'linea-motor', id: 'EP-MN32-251207-16', como: 'real', espera: { n1: 'NP_SUP', n2: 'NP_SUP/falla-motor-superficie' }, faltan: [] },
  { fila: 'linea-lubricacion', id: 'EP-MN07-260627-09', como: 'real', espera: { n1: 'NP_SUP', n2: 'NP_SUP/falla-caja-reductora-lubricacion' }, faltan: [] },
  { fila: 'linea-variador', id: 'EP-LC16-251219-60', como: 'evento real; Config.protecciones no existe: la prueba declara el first-out TSH-2011 de P-201B como del variador',
    op: { protecciones: { 'P-201B': { 'TSH-2011': 'variador' } } }, espera: { responsable: 'op-mantenimiento', n1: 'NP_ENINT', n2: 'NP_ENINT/falla-vsd' }, faltan: [], extra: p => !!p.apunta },
  { fila: 'linea-sin-n2', id: 'EP-LC16-251019-10', como: 'real', espera: { n1: 'NP_PROC', n2: 'NP_PROC/parada-estacion-bombeo-afecta-pozos' }, faltan: [],
    extra: p => /Parte: Sello mecánico/.test(p.borrador.descEvid.valor) },
  { fila: 'linea-capacidad', id: 'EP-LC16-251019-10', como: 'evento real; la marca de capacidad sin falla la pone una persona (TRIM no tiene esa señal)',
    op: { capacidadSinFalla: true }, espera: { responsable: 'op-operacion', n1: 'NP_PROC', n2: 'NP_PROC/tanques-llenos-capacidad-limitada' }, faltan: [] },
  { fila: 'energia-uv-o-dedicado', id: 'EP-LC07-251006-04', como: 'real', espera: { responsable: 'op-mantenimiento', n1: 'NP_ENINT' }, faltan: ['n2'],
    extra: p => p.preguntas.some(q => q.id === 'corte') && p.opciones.n2.length === 13 && !!p.apunta },
  { fila: 'energia-compartido', id: 'EP-MN01-251015-78', como: 'real', espera: { responsable: 'op-mantenimiento', n1: 'NP_ENINT' }, faltan: ['n2'], extra: p => p.opciones.n2.length === 13 },
  { fila: 'energia-frontera', id: 'EP-MN01-251015-78', como: 'evento real; la topología de la prueba firma SE-2 de Morichal como frontera', ctx: ctxFrontera, campos: ['morichal'],
    espera: { impacto: 'diferida', planeacion: 'no-planeada' }, faltan: ['responsable', 'n1', 'n2'],
    extra: p => igual(p.opciones.responsable, ['ext-energia', 'op-mantenimiento']) && igual(p.opciones.n1, ['NP_ENEXT', 'NP_ENINT']) && p.preguntas.some(q => q.id === 'corte') },
  { fila: 'aire', id: 'EP-LC12-251115-22', como: 'real', espera: { responsable: 'op-mantenimiento' }, faltan: ['n1', 'n2'],
    extra: p => igual(p.opciones.n1, ['NP_SUP', 'NP_ENINT', 'NP_INS', 'NP_CTRL']) && p.preguntas.some(q => q.id === 'raiz' && q.opciones.length === 5) && !!p.hueco },
  { fila: 'compresion', id: 'EP-MN07-260214-32', como: 'real', espera: { n1: 'NP_PROC', n2: 'NP_PROC/capacidad-compresion-transferencia-gas-limitada' }, faltan: [], extra: p => p.perdida === 'tea' },
  { fila: 'evacuacion', id: 'EP-GU03-251017-59', como: 'real', espera: { impacto: 'diferida', planeacion: 'no-planeada' }, faltan: ['responsable', 'choke', 'n1', 'n2'],
    extra: p => p.sugerido.choke === 'planta' && igual(p.opciones.choke, ['planta', 'exportacion']) && p.preguntas[0]?.id === 'tanques' },
  { fila: 'proceso', id: 'EP-PA04-251120-97', como: 'real', espera: { responsable: 'op-operacion', n2: 'NP_PROC/capacidad-tratamiento-agua-crudo-limitada' }, faltan: [],
    extra: p => igual(p.alternativas, ['NP_INS/falla-transmisor-de-nivel']) },
  { fila: 'tratamiento', id: 'EP-LC08-251007-36', como: 'real', espera: { responsable: 'op-operacion', n2: 'NP_PROC/capacidad-tratamiento-agua-crudo-limitada' }, faltan: [], extra: p => p.perdida === 'rechazo' },
  { fila: 'programada-con-pareja', id: 'EP-LC19-260123-67', como: 'evento real; la pareja la traerá la tarea del programa (P1 §1.12): la prueba se la da a PR-LC19-260123',
    op: { parejaDelPrograma: { 'PR-LC19-260123': 'P_MANT_MEC/sistema-de-levantamiento-artificial' } },
    espera: { responsable: 'op-mantenimiento', planeacion: 'planeada', n1: 'P_MANT_MEC', n2: 'P_MANT_MEC/sistema-de-levantamiento-artificial' }, faltan: [],
    extra: p => p.borrador.planeacion.procedencia === 'programa' && p.borrador.planeacion.regla === 'programa:PR-LC19-260123' },
  { fila: 'programada-sin-pareja', id: 'EP-LC19-260123-67', como: 'real', espera: { impacto: 'diferida', planeacion: 'planeada' }, faltan: ['responsable', 'n1', 'n2'],
    extra: p => p.preguntas.some(q => q.id === 'trabajo' && q.opciones.length === 9) && p.opciones.n1.length === 8 && p.borrador.planeacion.procedencia === 'programa' },
  { fila: 'declarada-chip', id: 'EP-LC21-261001-01', como: 'evento real sin causa, contestado con el motivo «Fuga o daño en la línea de flujo»', ctx: ctxChip('Fuga o daño en la línea de flujo'),
    espera: { responsable: 'op-mantenimiento', planeacion: 'no-planeada', n1: 'NP_INTEG', n2: 'NP_INTEG/fuga-dano-en-linea-interna' }, faltan: [], extra: p => p.perdida === 'derrame' },
  { fila: 'declarada-libre', id: 'EP-LC06-260814-04', como: 'real', espera: { impacto: 'diferida' }, faltan: ['responsable', 'planeacion', 'n1', 'n2'],
    extra: p => p.preguntas.some(q => q.id === 'que-lo-paro') && p.preguntas.some(q => q.id === 'programado') },
]
for (const c of CASOS) {
  const ctx = c.ctx ?? ctx0
  const t = c.ctx ? tramo(c.id, L.tramosEntre(c.campos ?? ['ceiba'], DESDE, HASTA, ctx)) : tramo(c.id)
  const p = t && proponer(t, ctx, c.op)
  const fila = A.REGLAS_ANH.filas.find(f => f.id === c.fila)
  const vs = p ? valores(p.borrador) : {}
  const ch = t && CH.chokeDeCausa(t.causa, t.pozo.campoId, ctx)
  // El choke lo decide el motor del choke. Cuando no pregunta nada, tiene que
  // ser el que espera la tabla de P1: es el cruce entre los dos motores.
  const chokeOk = !fila?.chokeEsperado || !ch || !!ch.pregunta || !!fila.chokeEnFalta || p.borrador.choke?.valor === fila.chokeEsperado
  const ok = !!p && p.fila === c.fila && Object.entries(c.espera).every(([k, x]) => vs[k] === x) && igual(p.faltan, c.faltan)
    && p.estado === (c.faltan.length ? 'por-precisar' : 'propuesta') && chokeOk && (!c.extra || c.extra(p))
  comprobar(ok, `${c.fila}: ${c.id} (${c.como}) → ${ESTADO[p?.estado] ?? '?'}${p?.faltan.length ? `, falta ${p.faltan.join(', ')}` : ''}${p?.borrador.choke ? ` · choke ${p.borrador.choke.valor}` : ''}`)
  if (!ok) console.log('      ', JSON.stringify({ fila: p?.fila, vs, faltan: p?.faltan, estado: p?.estado, chokeOk }))
}
comprobar(igual(CASOS.map(c => c.fila), A.REGLAS_ANH.filas.map(f => f.id)),
  `las ${A.REGLAS_ANH.filas.length} filas de REGLAS_ANH v1 tienen su caso: ${CASOS.filter(c => c.como === 'real').length} tal cual del demo y ${CASOS.filter(c => c.como !== 'real').length} con un evento real y la entrada que todavía no existe`)
const pend = proponer(tramo('EP-LC21-261001-01'))
comprobar(pend.estado === 'pendiente' && igual(pend.faltan, K.PASOS) && K.PASOS.every(x => !pend.borrador[x]) && igual(pend.preguntas.map(q => q.id), ['que-lo-paro', 'programado', 'se-perdio']),
  'causa sin identificar (LC-21, 1-oct): «sin causa», los 6 pasos en falta, nada propuesto, y las preguntas 1, 3 y 4 de U1 (P1 §2.1 punto 1)')
const conChip = texto => { const ctx = ctxChip(texto); return proponer(tramo('EP-LC21-261001-01', L.tramosEntre(['ceiba'], DESDE, HASTA, ctx)), ctx) }
const prueba = conChip('Cierre para prueba o intervención del pozo')
comprobar(prueba.borrador.planeacion?.valor === 'planeada' && igual(prueba.opciones.n1, ['P_PRUEBAS', 'P_WO']) && prueba.preguntas.some(q => q.id === 'trabajo' && q.opciones.length === 3),
  'motivo «Cierre para prueba o intervención»: planeada, con la causa entre workover y pruebas, preguntada con «¿Qué trabajo era?»')
const nominacion = conChip('Orden de producción: nominación o restricción del comprador')
comprobar(igual(nominacion.faltan, ['responsable', 'planeacion', 'n1', 'n2']) && nominacion.preguntas[0]?.id === 'nominacion' && nominacion.borrador.choke?.valor === 'exportacion',
  'motivo «Orden de producción»: el comprador (no planeada) o la operación (planeada) lo dice una persona; el choke es afuera')

console.log('\n=== 5. Una señal apunta, no prueba ===')
const gf = proponer(tramo('EP-LC05-251024-86'))
comprobar(gf.estado === 'propuesta' && !!gf.apunta && /GF/.test(gf.apunta.porque), 'ESP con GF (LC-05, 24-oct-2025): la propuesta sale completa, marcada «las señales apuntan»')
const c1 = A.confirmarPasos(gf.clasificacion, 'oper', JAIRO, HORA)
comprobar(A.estadoDe(c1) === 'propuesta' && c1.planeacion.procedencia === 'confirmado' && c1.impacto.procedencia === 'confirmado'
  && ['responsable', 'choke', 'n1', 'n2'].every(x => c1[x].procedencia === 'regla'),
  'un toque del operador sube solo «¿Planeada?» y «Qué pasó»: la ESP con GF NO pasa a confirmada')
const o1 = A.origenesDe(c1)
comprobar(o1.planeacion === 'M' && o1.impacto === 'M' && ['responsable', 'choke', 'n1', 'n2'].every(x => o1[x] === 'C'), 'lo demás sigue viajando con origen C: ninguna M se fabrica con su toque')
const c2 = A.confirmarPasos(c1, 'sup', NELSON, HORA)
comprobar(A.estadoDe(c2) === 'propuesta' && c2.responsable.procedencia === 'confirmado' && c2.choke.procedencia === 'confirmado' && c2.n1.procedencia === 'regla' && c2.n2.procedencia === 'regla',
  'el supervisor sube quién y dónde se trabó; la causa que la señal solo apunta no')
const c3 = A.confirmarPasos(c2, 'conf', EDWIN, HORA)
comprobar(A.estadoDe(c3) === 'confirmada' && c3.n2.por === 'Edwin Maestre' && c3.n2.rol === 'conf', 'confiabilidad confirma la causa: la parada queda completa')
const vsd = A.declararPaso(c1, 'n2', 'NP_ENINT/falla-vsd', OSCAR, 'tec', HORA)
comprobar(vsd.n1.valor === 'NP_ENINT' && vsd.n2.procedencia === 'corregido' && vsd.n2.propuesto === 'NP_SUB/falla-esp' && A.avalado(vsd, 'n2')
  && A.estadoDe(A.confirmarPasos(vsd, 'sup', NELSON, HORA)) === 'confirmada',
  'si el técnico que abrió el equipo dice que fue el variador, la pareja cambia (con lo propuesto al lado) y el supervisor completa el resto')
const ol = proponer(tramo('EP-LC06-251001-96'))
comprobar(!ol.apunta && A.estadoDe(A.confirmarPasos(ol.clasificacion, 'sup', NELSON, HORA)) === 'confirmada', 'sin señal que solo apunte (OL, sobrecarga), un toque del supervisor confirma los 6 pasos')
comprobar(!!proponer(tramo('EP-MN18-260310-87')).apunta && !!proponer(tramo('EP-LC07-251006-04')).apunta, 'también apuntan la firma de las señales (tornillos de MPP-301) y la baja tensión UV')
comprobar(A.origenDe('senal') === 'A' && A.origenDe('registro') === 'A' && A.origenDe('regla') === 'C' && A.origenDe('programa') === 'C' && A.origenDe('conversion') === 'C'
  && ['declarado', 'confirmado', 'corregido'].every(x => A.origenDe(x) === 'M'), 'origen A/M/C desde la procedencia: señal y registro A; regla, conversión y programa C; persona M (P1 §1.3)')

console.log('\n=== 6. El día operacional y la medianoche ===')
const PS = P.paradasAnh(TODOS, DESDE, HASTA, ctx0)
const gu02 = PS.filter(p => p.eventoId === 'EP-GU02-251017-58')
const [t1, t2] = gu02
comprobar(t1.fin === '2025-10-17T23:59:59-05:00' && P.horaAnh(t1.fin) === '2025-10-18T04:59:59Z' && t1.abiertaAlCorte,
  `el tramo que cruza la medianoche termina a las 23:59:59 COT, que en el JSON son las ${P.horaAnh(t1.fin)}`)
comprobar(t2.inicio === '2025-10-18T00:00:00-05:00' && P.horaAnh(t2.inicio) === '2025-10-18T05:00:00Z' && t2.diaOperacional === '2025-10-18' && t2.tramo.n === 2 && t2.tramo.m === gu02.length,
  `el siguiente empieza a las 00:00:00 COT, con el mismo evento: tramo 2 de ${gu02.length}`)
comprobar(/^Continúa al corte del día\. Tramo 1 de 3 del evento EP-GU02-251017-58\. Parcial: 39,5 Hz de 52,5 Hz de la prueba/.test(t1.clasificacion.descEvid.valor),
  `la descripción lo dice: «${t1.clasificacion.descEvid.valor.slice(0, 118)}…»`)
comprobar(P.horaAnh(t1.fin, 'cot-offset') === '2025-10-17T23:59:59-05:00', 'con la zona de Colombia, si la ANH la pide, la misma hora sale con −05:00')
const horasLibro = new Map(), horasFilas = new Map()
for (const t of TRAMOS) horasLibro.set(t.evento.id, (horasLibro.get(t.evento.id) ?? 0) + t.horas)
for (const p of PS) horasFilas.set(p.eventoId, (horasFilas.get(p.eventoId) ?? 0) + p.horas)
comprobar([...horasLibro].every(([id, h]) => cerca(h, horasFilas.get(id) ?? 0, 1e-9)), `las filas de cada uno de los ${f0(horasLibro.size)} eventos suman las horas que cobra el libro: parten donde el libro cobra`)
comprobar(PS.every(p => P.diaOperacional(Date.parse(p.inicio)) === p.diaOperacional && P.diaOperacional(Date.parse(p.fin)) === p.diaOperacional && Date.parse(p.fin) >= Date.parse(p.inicio)),
  `las ${f0(PS.length)} filas empiezan y terminan dentro de su día operacional (V-08)`)
const porPozo = new Map()
for (const p of PS) { const k = `${p.campoId}|${p.pozo}`; (porPozo.get(k) ?? porPozo.set(k, []).get(k)).push(p) }
const sinSolape = [...porPozo.values()].every(xs => xs.every((p, i) => i === 0 || Date.parse(xs[i - 1].fin) <= Date.parse(p.inicio)))
comprobar(sinSolape, 'dos filas del mismo pozo nunca se pisan (V-13): una hora del pozo, una fila')
const hoy = PS.find(p => p.id === 'EP-LC21-261001-01@2026-10-02#2')
comprobar(!!hoy && hoy.abiertaAlCorte && hoy.diaEnCurso && hoy.fin === '2026-10-02T23:59:59-05:00' && hoy.tramo.m === null && /que sigue abierto/.test(hoy.clasificacion.descEvid.valor),
  'LC-21 sigue parado hoy: su fila termina en el corte de hoy (23:59:59), dice que sigue abierto y el día todavía no corta')
const parciales = PS.filter(p => p.parcial)
comprobar(parciales.length > 0 && parciales.every(p => p.fraccion <= 1 && p.clasificacion.descEvid.valor.includes('Parcial: ')) && PS.filter(p => !p.parcial).every(p => p.fraccion === 1),
  `${f0(parciales.length)} filas son paradas parciales (frecuencia reducida): con su fracción y «Parcial: X Hz de Y Hz de la prueba»`)
const sinParciales = P.paradasAnh(TODOS, DESDE, HASTA, ctx0, { reportarParciales: false })
comprobar(sinParciales.every(p => !p.parcial) && cerca(P.conciliarAnh(sinParciales).total, P.conciliarAnh(PS).total - parciales.reduce((a, p) => a + p.diferidaTrimBbl, 0), 1e-9),
  'apagar las parciales (Config.anh.reportarParciales) las quita sin tocar las demás filas')
const disparos = PS.filter(p => p.disparo)
const espCortas = TRAMOS.filter(t => L.esDisparo(t))
comprobar(disparos.length > 0 && disparos.every(p => p.causa.tipo === 'electrosumergible') && espCortas.every(t => PS.some(p => p.eventoId === t.evento.id && p.disparo)),
  `los ${f0(espCortas.length)} disparos de electrosumergible (< 24 h) son filas (${f0(disparos.length)}), aunque no cuenten como falla para el MTBF`)
const lc16 = PS.filter(p => p.eventoId === 'EP-LC16-260819-24'), dentro = lc16.filter(p => !p.exceso), exceso = lc16.filter(p => p.exceso)
comprobar(exceso.length === 1 && exceso[0].inicio === '2026-08-20T09:34:04-05:00' && dentro.at(-1)?.fin === '2026-08-20T09:34:04-05:00'
  && exceso[0].clasificacion.planeacion?.valor === 'no-planeada' && exceso[0].estado === 'por-precisar' && igual(exceso[0].faltan, ['responsable', 'n1', 'n2'])
  && dentro.every(p => p.clasificacion.planeacion?.valor === 'planeada') && /Se pasó de la ventana del programa PR-2011-260819/.test(exceso[0].clasificacion.descEvid.valor),
  'el exceso de la ventana del programa (LC-16 con P-201B en preventivo, 20-ago después de las 09:34) es otra fila: no planeada y con la causa por precisar')

console.log('\n=== 7. Una cascada de N pozos son N filas con la misma raíz ===')
const dia18 = [new Date('2026-05-18T00:00:00-05:00'), new Date('2026-05-19T00:00:00-05:00')]
const pozosSE2 = new Set(L.tramosEntre(['morichal'], ...dia18, ctx0).filter(t => t.causa.evento === 'SV-SE-2-260518').map(t => t.pozo.id))
const filasSE2 = P.paradasAnh(['morichal'], ...dia18, ctx0).filter(p => p.raiz === 'SV-SE-2-260518')
comprobar(pozosSE2.size === 41 && filasSE2.length === 41 && new Set(filasSE2.map(p => p.pozo)).size === 41,
  `SE-2 de Morichal, 18-may-2026: cerraron ${pozosSE2.size} pozos y son ${filasSE2.length} filas del día, una por pozo, con la misma raíz`)
comprobar(filasSE2.every(p => igual(valores(p.clasificacion), valores(filasSE2[0].clasificacion)) && igual(p.faltan, filasSE2[0].faltan)),
  'las 41 llevan la clasificación de su raíz (Unicidad, C24 p.5): una sola decisión')
const caidaSE2 = Date.parse('2026-05-18T19:38:00-05:00')
comprobar(filasSE2.every(p => p.minutosDesdeRaiz === Math.round((Date.parse(tramo(p.eventoId).evento.inicio) - caidaSE2) / 60_000)
  && igual(p.clasificacion.choke?.porque?.cascada, { raiz: 'SV-SE-2-260518', minutos: p.minutosDesdeRaiz })),
  'el porqué del choke de cada fila guarda la raíz y los minutos desde que cayó SE-2')
const raices = new Map(), causas = new Map()
for (const p of PS) (raices.get(p.raiz) ?? raices.set(p.raiz, new Set()).get(p.raiz)).add(p.eventoId)
for (const t of TRAMOS) { const k = t.causa.evento ?? t.evento.id; (causas.get(k) ?? causas.set(k, new Set()).get(k)).add(t.evento.id) }
comprobar(raices.size === causas.size && [...raices].every(([k, s]) => igual([...s].sort(), [...(causas.get(k) ?? [])].sort())),
  `ParadaAnh.raiz agrupa sin volver a calcular: ${f0(raices.size)} raíces, las mismas cascadas que la causa de cada tramo`)
const h302 = P.paradasAnh(['ceiba'], new Date('2025-10-07T00:00:00-05:00'), new Date('2025-10-08T00:00:00-05:00'), ctx0).filter(p => p.raiz === 'SV-H-302-251007')
const grupos = P.gruposPorCadena(h302)
const lote = P.confirmarLote(h302, 'sup', NELSON, HORA, 'LOTE-H302')
comprobar(h302.length > 1 && grupos.size === 1 && lote.paradas.every(p => p.estado === 'confirmada' && K.PASOS.every(x => p.clasificacion[x].lote === 'LOTE-H302'))
  && igual(lote.lote.pasos, K.PASOS) && lote.lote.paradas.length === h302.length,
  `la cascada del tratador H-302 (7-oct-2025, ${h302.length} pozos) se confirma de una vez: un toque del supervisor, ${h302.length} filas completas con la marca del lote`)
comprobar(/lote/.test(lanza(() => P.confirmarLote(h302, 'oper', JAIRO, HORA, 'LOTE-X'))?.message ?? ''), 'el operador no confirma en lote: lo hace supervisión o producción')

console.log('\n=== 8. La conciliación: Σ por N1 = Σ por TipoCausa ===')
for (const [nombre, d, h, ps] of [['todo el historial', DESDE, HASTA, PS],
  ['septiembre de 2026', new Date('2026-09-01T00:00:00-05:00'), new Date('2026-10-01T00:00:00-05:00'), undefined]]) {
  const filas = ps ?? P.paradasAnh(TODOS, d, h, ctx0)
  const lb = L.libro(TODOS, d, h, ctx0)
  const c = P.conciliarAnh(filas)
  const sN1 = Object.values(c.porN1).reduce((a, b) => a + b, 0), sTipo = Object.values(c.porTipo).reduce((a, b) => a + b, 0)
  comprobar(c.cuadra && cerca(sN1, sTipo, 1e-9) && cerca(sTipo, lb.diferido, 1e-9),
    `${nombre}: Σ por N1 = Σ por TipoCausa = diferido del libro (${f0(sN1)} = ${f0(sTipo)} = ${f0(lb.diferido)} bbl; sin N1 todavía: ${f0(c.porN1['sin-causa'] ?? 0)})`)
  comprobar(lb.porTipo.every(x => cerca(c.porTipo[x.tipo] ?? 0, x.bbl, 1e-9)), `${nombre}: cada TipoCausa suma lo mismo que en el libro`)
}

console.log('\n=== 9. Las dos formas de salida ===')
const vals = { ...valores(ol.clasificacion), cauGral: ol.clasificacion.cauGral.valor }
comprobar(igual(K.cadenasAnh(vals, 'C024-2026'), { resp_par: 'Operador-Mantenimiento', choke_mod: 'POZO', dif_perd: 'DIFERIDA', pla_no_plan: 'NO PLANEADA', cau_niv1: 'NP_SUB', cau_niv2: 'Falla ESP', cau_gral_paro: 'mecánico' }),
  'circular (por defecto): «Operador-Mantenimiento», la clave NP_SUB en cau_niv1 y «Falla ESP» tal cual')
comprobar(igual(K.cadenasAnh(vals, 'DICC-V3.2'), { resp_par: 'OPERADOR - MANTENIMIENTO', choke_mod: 'POZO', dif_perd: 'DIFERIDA', pla_no_plan: 'NO PLANEADA', cau_niv1: 'NO PLANEADA - MECÁNICA SUBSUELO', cau_niv2: 'FALLA ESP', cau_gral_paro: 'MECÁNICO' }),
  'Diccionario: «OPERADOR - MANTENIMIENTO» y el texto de la N1 en mayúsculas en cau_niv1')
const C024 = K.VERSIONES_CATALOGO['C024-2026'], DIC = K.VERSIONES_CATALOGO['DICC-V3.2']
comprobar(C024.forma.choke.exportacion === 'EXPORTACION' && DIC.forma.choke.exportacion === 'EXPORTACIÓN', '«EXPORTACION» sin tilde en la circular (C24 p.8) y «EXPORTACIÓN» en el Diccionario (G139)')
const DISTINTAS = [
  ['P_PRUEBAS/prueba-de-pozo-presion-transiente-produccion-potencial-plt-ilt-otros', 'P_PRUEBAS', 'PLANEADA - PRUEBAS / VERIFICACIONES', 'PRUEBA DE POZO (POTENCIAL/PLT)'],
  ['P_OP/operacion-por-balance-de-inventarios', 'P_OP', 'PLANEADA - OPERACIÓN (CURTAILMENT)', 'OPERACIÓN POR BALANCE DE INVENTARIOS (PLANIFICADO)'],
  ['NP_CTRL/falla-configuracion-parametrizacion', 'NP_CTRL', 'NO PLANEADA - CONTROL / COMUNICACIONES', 'FALLA CONFIGURACIÓN/PARAMETRIZACIÓN (PLC/VSD/CONTROL)'],
  ['NP_CTRL/perdida-linea-de-vista-flora', 'NP_CTRL', 'NO PLANEADA - CONTROL / COMUNICACIONES', 'PERDIDA LINEA DE VISTA (FLORA)'],
  ['NP_CTRL/falla-instrumento-sensor', 'NP_CTRL', 'NO PLANEADA - INSTRUMENTACIÓN', 'FALLA INSTRUMENTO/SENSOR'],
]
for (const [n2, n1, dn1, dn2] of DISTINTAS) {
  const v2 = { responsable: 'op-mantenimiento', choke: 'planta', impacto: 'diferida', planeacion: K.planeacionDeN1(n1), n1, n2, cauGral: K.causaGeneralDe(n2) }
  const c = K.cadenasAnh(v2, 'C024-2026'), d = K.cadenasAnh(v2, 'DICC-V3.2')
  comprobar(c.cau_niv1 === n1 && c.cau_niv2 === K.textoN2(n2) && d.cau_niv1 === dn1 && d.cau_niv2 === dn2,
    `«${c.cau_niv2}»: circular ${c.cau_niv1} · Diccionario «${d.cau_niv1}» / «${d.cau_niv2}»`)
}
comprobar(K.N2_CIRCULAR.every(n => C024.forma.n2[n.codigo] === n.texto && K.cadenasAnh({ ...vals, planeacion: K.planeacionDeN1(n.n1), n1: n.n1, n2: n.codigo }, 'C024-2026').cau_niv2 === n.texto),
  'circular: los 117 N2 salen con la cadena de la Tabla 1, byte a byte')
comprobar(DIC.arbol.every(n => igual(n.n2.map(c => DIC.forma.n2[c]), [...X.N2_DICC_V32[n.clave]])),
  'Diccionario: los 117 salen con sus cadenas, N1 por N1 y en el orden de la celda G141')
const norm = s => s.replace(/\s+/g, '').replace(/\(-/g, '(')
comprobar(norm(X.LISTAS_DICC_V32.n1.map((t, i) => `${t} (${X.N2_DICC_V32[X.TABLA_1[i].clave].join(' - ')})`).join('')) === norm(X.CELDA_G141_DICC_V32),
  'las cadenas del Diccionario reproducen la celda G141: solo se limpiaron los artefactos de edición (saltos, espacios y «( -»)')
comprobar(igual(K.RESPONSABLES.map(r => C024.forma.responsable[r]), [...X.RESPONSABLES_C024]) && igual(K.RESPONSABLES.map(r => DIC.forma.responsable[r]), [...X.LISTAS_DICC_V32.responsable])
  && igual(K.CLAVES_N1.map(k => DIC.forma.n1Texto[k]), [...X.LISTAS_DICC_V32.n1]),
  'los 9 responsables y las 20 N1 de cada forma, en su orden (C24 p.5; Dicc. G138 y G140)')
comprobar(C024.forma.unidad.h_ini_paro === 'ISO 8601 DateTime' && C024.forma.unidad.h_fin_paro === 'ISO 8601 DateTime' && K.CAMPOS_PARADA.filter(x => !x.startsWith('h_')).every(x => C024.forma.unidad[x] === 'string')
  && C024.forma.cauNiv1 === 'clave' && DIC.forma.cauNiv1 === 'texto',
  'la tercera posición de la tupla: «ISO 8601 DateTime» en las horas y «string» en lo demás (plantilla V3.1)')
comprobar(K.causaGeneralDe('NP_SUB/alto-bsw-corte-de-agua') === 'alto-sw' && K.causaGeneralDe('NP_AUT/suspension-orden-autoridad') === 'cerrado-temporalmente'
  && K.CLAVES_N1.every(k => K.CAUSAS_GENERALES.includes(K.CAU_GRAL_DE_N1.porN1[k])) && C024.forma.cauGral['alto-sw'] === 'alto S&W',
  'cau_gral_paro (provisional): una de las 18 causas de la Res. 0651 para cada N1, con sus dos excepciones por pareja')

console.log('\n=== 10. El porqué del choke se guarda con la clasificación (U2 §11.1) ===')
const mismo = (a, b) => igual(Object.keys(a ?? {}).sort().map(k => [k, a[k]]), Object.keys(b ?? {}).sort().map(k => [k, b[k]]))
const rod = tramo('EP-LC16-251219-60'), pRod = proponer(rod), chRod = CH.chokeDeCausa(rod.causa, rod.pozo.campoId, ctx0)
comprobar(mismo(pRod.clasificacion.choke.porque, { regla: chRod.regla, texto: chRod.porque, elemento: chRod.elemento, pozosServidos: chRod.servidos }),
  `copiado de chokeDeCausa: regla, frase, elemento y pozos servidos («${chRod.porque}»)`)
const filaRod = PS.find(p => p.eventoId === 'EP-LC16-251219-60')
comprobar(filaRod.clasificacion.choke.porque.cascada?.raiz === 'EV-2011-251219' && filaRod.minutosDesdeRaiz === Math.round((Date.parse(rod.evento.inicio) - Date.parse('2025-12-19T20:13:17-05:00')) / 60_000),
  `en el tramo lleva además la cascada: LC-16 cerró ${filaRod.minutosDesdeRaiz} min después de que paró P-201B`)
const ul = tramo('EP-LC12-251005-53'), pUl = proponer(ul), chUl = CH.chokeDeCausa(ul.causa, ul.pozo.campoId, ctx0)
comprobar(!!chUl.pregunta && pUl.borrador.choke.porque.pregunta === chUl.pregunta && pUl.preguntaChoke === chUl.pregunta,
  'la pregunta del motor del choke viaja con la propuesta (baja carga UL), sin frenar la cadena')
const evq = tramo('EP-GU03-251017-59'), pEv = proponer(evq), chEv = CH.chokeDeCausa(evq.causa, evq.pozo.campoId, ctx0)
comprobar(!pEv.borrador.choke && pEv.sugerido.choke === chEv.choke && pEv.porqueChoke?.pregunta === chEv.pregunta && pEv.porqueChoke?.elemento === 'LACT-01'
  && igual(pEv.preguntas[0].opciones.slice(0, 2).map(o => o.texto), ['La planta no recibe (agua o proceso)', 'El tanque de crudo está lleno']),
  'tanques llenos: el choke queda en falta, con lo del motor del choke como sugerencia y las dos opciones cerradas de U2 §4.4')
const corr = A.declararPaso(pRod.borrador, 'choke', 'pozo', NELSON, 'sup', HORA)
comprobar(corr.choke.procedencia === 'corregido' && corr.choke.propuesto === 'planta' && corr.choke.porque.persona === 'Nelson Ortiz' && corr.choke.porque.elemento === 'P-201B',
  'si una persona lo corrige, el porqué guarda quién fue y el elemento, con lo propuesto al lado')

console.log('\n=== 11. «En el yacimiento»: solo producción o confiabilidad, con evidencia ===')
const todas = TRAMOS.map(t => proponer(t))
comprobar(todas.every(p => p.borrador.choke?.valor !== 'reservorio' && p.sugerido.choke !== 'reservorio'),
  `en los ${f0(todas.length)} tramos del demo TRIM nunca propone ni sugiere el yacimiento: no sale de una señal`)
comprobar(lanza(() => A.declararPaso(pUl.borrador, 'choke', 'reservorio', MARCELA, 'prod', HORA)) instanceof A.ErrorClasificacion,
  'tampoco entra como un paso cualquiera: sin su evidencia se rechaza')
const e9 = lanza(() => A.declararYacimiento(pUl.borrador, 'prueba', NELSON, 'sup', HORA))
comprobar(e9 instanceof A.ErrorClasificacion && /producción o confiabilidad/.test(e9.message), 'el supervisor no lo pone: es de producción o confiabilidad (U2 §4.3)')
const e10 = lanza(() => A.declararYacimiento(pUl.borrador, '  ', MARCELA, 'prod', HORA))
comprobar(e10 instanceof A.ErrorClasificacion && /qué lo muestra/.test(e10.message), 'producción tampoco sin decir qué lo muestra')
const yac = A.declararYacimiento(pUl.borrador, 'prueba', MARCELA, 'prod', HORA)
comprobar(yac.choke.valor === 'reservorio' && yac.choke.procedencia === 'corregido' && yac.choke.propuesto === 'pozo' && yac.choke.porque.evidencia === 'prueba'
  && yac.choke.porque.persona === 'Marcela Ríos' && A.avalado(yac, 'choke') && !A.problemasDeClasificacion(yac).some(x => /yacimiento/.test(x)),
  `producción lo pone con la prueba del pozo: «${yac.choke.porque.texto}», con lo que proponía TRIM al lado`)
const filaUl = PS.find(p => p.eventoId === 'EP-LC12-251005-53')
const filaYac = P.conClasificacion(filaUl, A.declararYacimiento(filaUl.clasificacion, 'corte-agua', EDWIN, 'conf', HORA))
comprobar(filaYac.evidenciaYacimiento === 'corte-agua' && filaYac.clasificacion.choke.valor === 'reservorio', 'la fila lleva la evidencia a la vista (ParadaAnh.evidenciaYacimiento)')
comprobar(A.problemasDeClasificacion({ ...pUl.borrador, choke: { valor: 'reservorio', procedencia: 'regla', regla: 'x' } }).some(x => /nunca sale de una señal/.test(x)),
  'un yacimiento que no puso producción o confiabilidad con evidencia no pasa la validación')
const eOper = lanza(() => A.responder(pUl, 'aporte', 0, JAIRO, 'oper', HORA))
comprobar(pUl.preguntas.find(q => q.id === 'aporte')?.quien === 'yacimiento' && eOper instanceof A.ErrorClasificacion, '«¿Fue el yacimiento?» no la contesta el operador')
const r1 = A.responder(pUl, 'aporte', 0, EDWIN, 'conf', HORA)
const r2 = A.responder(r1, 'evidencia-yacimiento', 1, EDWIN, 'conf', HORA)
comprobar(r1.preguntas.some(q => q.id === 'evidencia-yacimiento') && r2.borrador.choke.valor === 'reservorio' && r2.borrador.choke.porque.evidencia === 'corte-agua'
  && !r2.preguntas.some(q => q.id === 'aporte' || q.id === 'evidencia-yacimiento'),
  'confiabilidad: «Sí, fue el yacimiento» → «¿Qué lo muestra?» → «El corte de agua»: queda puesto, con su evidencia')

console.log('\n=== 12. Al operador nunca se le pide dónde se trabó ===')
const prohibidas = /dónde se trabó|en la planta|afuera|yacimiento/i
const deCampo = todas.flatMap(p => p.preguntas).filter(q => q.quien === 'campo')
comprobar(deCampo.length > 0 && deCampo.every(q => !prohibidas.test(q.texto) && q.opciones.every(o => !prohibidas.test(o.texto))),
  `las ${f0(deCampo.length)} preguntas de campo del demo no dicen «¿Dónde se trabó?», «en la planta», «afuera» ni «yacimiento» (U2 §4.5)`)
comprobar(todas.flatMap(p => p.preguntas).filter(q => q.id === 'choke').every(q => q.quien === 'revisa' && q.opciones.every(o => o.deja.choke !== 'reservorio')),
  'la pregunta del choke es de quien revisa y nunca ofrece el yacimiento')
const r3 = A.responder(pEv, 'tanques', 1, JAIRO, 'oper', HORA), r4 = A.responder(r3, 'oleoducto', 1, JAIRO, 'oper', HORA)
comprobar(r4.borrador.choke.valor === 'exportacion' && r4.borrador.choke.procedencia === 'regla' && r4.borrador.responsable.valor === 'ext-transportador'
  && r4.borrador.n1.valor === 'NP_TRANSP' && A.origenesDe(r4.borrador).choke === 'C' && r4.borrador.planeacion.procedencia === 'confirmado'
  && igual(r4.faltan, ['n2']) && r4.preguntas.some(q => q.id === 'detalle' && q.opciones.length === 5),
  'el operador contesta hechos («el tanque de crudo está lleno», «no recibía»): afuera queda como propuesta de TRIM (origen C) y solo «¿Planeada?» es suyo')
const uv = proponer(tramo('EP-LC07-251006-04')), rUv = A.responder(uv, 'corte', 1, JAIRO, 'oper', HORA)
comprobar(rUv.borrador.choke.valor === 'planta' && rUv.borrador.choke.procedencia === 'regla' && !rUv.borrador.choke.porque.pregunta
  && rUv.borrador.choke.porque.persona === 'Jairo Peña' && !rUv.preguntas.some(q => q.pasos.includes('choke')) && rUv.preguntas.some(q => q.id === 'detalle'),
  'baja tensión: el operador dice «Del campo…» y la pregunta del motor del choke queda contestada; el tramo sigue siendo propuesta de TRIM y queda el detalle')
const nombres = RO.ROLES.map(r => r.persona)
comprobar(PS.every(p => nombres.every(n => !p.clasificacion.descEvid.valor.includes(n))) && PS.some(p => /Declarado por el supervisor/.test(p.clasificacion.descEvid.valor)),
  'ninguna descripción lleva el nombre de una persona: va su rol («Declarado por el supervisor»; S1 R-D)')

await v.close()
console.log(`\n${pruebas - fallos} de ${pruebas} comprobaciones bien.`)
if (fallos) { console.log(`${fallos} FALLARON.`); process.exit(1) }
