/* La regla con que se compara una respuesta contra lo esperado de referencia/
 * (scripts/referencia.mjs, en `comprobar` y en `comparar`), aparte para que
 * verificar-libro pruebe que ve lo que el contrato prohíbe (C-08):
 *
 *  - la respuesta tiene que CONTENER lo esperado: puede traer más campos, salvo
 *    los que el contrato dice que van AUSENTES cuando no aplican (`colchonH`
 *    ausente = sin colchón, `null` = no se llena; `costoFalla` y `costoFallaHoy` ausentes, no 0;
 *    `cadena` solo en los pasos con valor; la revisión y la evidencia del
 *    yacimiento solo cuando las hay; `AUSENTES`, abajo): si lo esperado no los
 *    trae, no pueden venir;
 *  - un `null` esperado exige `null` (ni ausente ni 0);
 *  - los registros cerrados (por tramo, por escalón, por tren…) traen
 *    exactamente las claves esperadas: un tramo de más es una deriva;
 *  - los números valen iguales con una diferencia de hasta 1e-6 relativo o
 *    0,005 absoluto;
 *  - las fechas se comparan como instante y tienen que traer su zona («Z» o
 *    «-05:00»): sin zona, el front la rechaza;
 *  - el orden de las listas importa. */

export const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
const CON_ZONA = /(?:Z|[+-]\d{2}:\d{2})$/
export const TOL_REL = 1e-6, TOL_ABS = 0.005

/** Las claves que, si lo esperado no las trae, la respuesta tampoco puede traer (CONTRATO.md: «ausente» dice algo):
 *  con ellas la pantalla pinta algo que no es cierto. Las de QA-C y F2-B, y las que faltaban (QA-R, C-08):
 *  - `siParaOtra` (agua): «SI PARA OTRA BOMBA» en lugar del orden de cierre; `sinUna`: «si para una…»;
 *  - `hz` (filas ANH, pruebas): «parcial: X de Y Hz»;
 *  - `subio`, `cambioHoy`, `noIntervenir`, `proximoInstrumento`, `sinDato` («Si falla hoy»): una marca o una frase;
 *  - `techo` (riesgo): «hasta»; `declaradoPor` (riesgo): que el motivo lo escribió una persona;
 *  - `retiros` (filas ANH): «antes: …, retirado por …»; `declarado` (la causa): la respuesta de una persona;
 *  - `apunta` («una señal apunta»: quién puede confirmar), `perdida` (proponer una pérdida), `escalada` («No sé»). */
export const AUSENTES = new Set(['colchonH', 'costoFalla', 'costoFallaHoy', 'cadena', 'revision', 'evidenciaYacimiento', 'fraseHoy', 'porTipo', 'campoDeGas', 'disponibleHoy', 'textoEstructural',
  'siParaOtra', 'sinUna', 'hz', 'subio', 'cambioHoy', 'noIntervenir', 'proximoInstrumento', 'sinDato', 'techo', 'declaradoPor', 'retiros', 'declarado', 'apunta', 'perdida', 'escalada'])
/** Los registros cerrados: un objeto con estas claves trae exactamente las claves esperadas. */
export const CERRADOS = new Set(['porChoke', 'porEscalon', 'porChokeEscalon', 'porChokeEquipo', 'estructuralPorChoke', 'horasPorDominante', 'noPlaneado', 'porTramo', 'holgura', 'potenciales', 'dominante', 'casiIguales', 'superado'])
/** Los cerrados cuyos valores también son registros cerrados (cada tramo con sus escalones). */
const CERRADOS_HONDOS = new Set(['porChokeEscalon'])

const esObjeto = x => x !== null && typeof x === 'object' && !Array.isArray(x)

/** Diferencias entre lo esperado y lo recibido, con la ruta de cada una (hasta 20). */
export function diferencias(esperado, real, ruta = '$', salida = [], cerrado = false, hondo = false) {
  if (salida.length >= 20) return salida
  if (typeof esperado === 'number') {
    if (typeof real !== 'number' || !(Math.abs(esperado - real) <= Math.max(TOL_ABS, TOL_REL * Math.abs(esperado))))
      salida.push(`${ruta}: se esperaba ${esperado}, llegó ${JSON.stringify(real)}`)
  } else if (typeof esperado === 'string' && ISO.test(esperado)) {
    if (typeof real !== 'string' || Date.parse(esperado) !== Date.parse(real))
      salida.push(`${ruta}: se esperaba el instante ${esperado}, llegó ${JSON.stringify(real)}`)
    else if (!CON_ZONA.test(real)) salida.push(`${ruta}: la fecha ${JSON.stringify(real)} llegó sin zona (se espera «Z» o «-05:00»)`)
  } else if (Array.isArray(esperado)) {
    if (!Array.isArray(real) || real.length !== esperado.length)
      salida.push(`${ruta}: se esperaba una lista de ${esperado.length}, llegó ${Array.isArray(real) ? `una de ${real.length}` : JSON.stringify(real)?.slice(0, 60)}`)
    else esperado.forEach((e, i) => diferencias(e, real[i], `${ruta}[${i}]`, salida))
  } else if (esObjeto(esperado)) {
    if (!esObjeto(real)) { salida.push(`${ruta}: se esperaba un objeto, llegó ${JSON.stringify(real)?.slice(0, 60)}`); return salida }
    for (const k of Object.keys(esperado)) {
      if (!(k in real)) salida.push(`${ruta}.${k}: falta`)
      else diferencias(esperado[k], real[k], `${ruta}.${k}`, salida, CERRADOS.has(k) || hondo, CERRADOS_HONDOS.has(k))
    }
    for (const k of Object.keys(real)) {
      if (k in esperado) continue
      if (cerrado) salida.push(`${ruta}.${k}: sobra (es un registro cerrado: trae solo ${Object.keys(esperado).join(', ') || 'nada'})`)
      else if (AUSENTES.has(k)) salida.push(`${ruta}.${k}: tiene que venir ausente (llegó ${JSON.stringify(real[k])?.slice(0, 60)})`)
    }
  } else if (esperado !== real) salida.push(`${ruta}: se esperaba ${JSON.stringify(esperado)}, llegó ${JSON.stringify(real)?.slice(0, 60)}`)
  return salida
}
