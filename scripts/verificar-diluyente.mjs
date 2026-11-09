/* Verificación de los barriles con diluyente (Fase 2 de
 * docs/experiencia-v3/PROMPT-FACILIDADES-POR-FASES.md).
 *
 * Usa el «Campo X» de ~/TRIM-petroleras/investigacion/20-mezcla-de-crudos-encogimiento.md §8.3
 * (cálculo propio, hipotético, no es del demo): tres pozos de 600, 400 y 200 bbl/d,
 * nafta a 0,22 bbl por bbl de crudo y encogimiento de la mezcla de 0,458 %. P3 para
 * 12 h el 10 de septiembre: con el fiscal de la mezcla sin descontar la nafta, ese
 * evento se cobraba 121,4 bbl; el crudo neto da 100.
 *
 * Lo que asegura:
 *   1. Nafta en planta, descontada: factor 1,000 y el evento de 100 bbl da 100, no 121.
 *   2. El mismo campo sin el dato de nafta de un día: ese día es «no publicable»
 *      (motivo `sin-nafta`), no una cifra, y no entra en lo real ni en el potencial.
 *   3. Un campo sin diluyente da los mismos números que el campo con nafta descontada.
 *      (Que el demo, sin diluyente, no cambió lo asegura `referencia.mjs comprobar`.)
 *   4. Nafta en fondo de pozo: la prueba mide crudo + nafta; el neto también da 100.
 *      Una prueba sin el diluyente inyectado deja el libro «no publicable».
 *   5. Nafta en el oleoducto: el punto de medición oficial mide crudo solo; nada cambia.
 *   6. La falta de diluyente es una causa de parada: los pozos que cierran en la
 *      cascada del sistema de dilución llevan la causa «Falta de diluyente».
 *   7. La identidad del libro sigue exacta: potencial − real = Σ diferidos.
 *   8. Evaporación y fondos de tanque son tipos de pérdida, aparte del diferido.
 *   9. D1 (4-nov-2026): el factor de asignación es diario (Res. 40236, art. 21). Cada
 *      barril se valora con el factor de su día; el del mes es su promedio pesado y la
 *      identidad del libro sale exacta también día por día.
 *
 *   node scripts/verificar-diluyente.mjs
 */
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
process.env.VITE_FUENTE = 'demo'
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })

let bien = 0, mal = 0
const comprobar = (ok, texto) => { if (ok) { bien++; console.log(`  ✓ ${texto}`) } else { mal++; console.log(`  ✗ ${texto}`) } }
const cerca = (a, b, tol = 1e-6) => typeof a === 'number' && Math.abs(a - b) <= tol
const n1 = x => (typeof x === 'number' ? x.toLocaleString('es-CO', { maximumFractionDigits: 1 }) : String(x))

/* ───────────────────────── el Campo X, en seis variantes ───────────────────────── */

const H = 3_600_000, D = 86_400_000
const SEP1 = new Date('2026-09-01T00:00:00-05:00').getTime()
const DIAS = 30
const S = 0.00458, NAFTA = 0.22
const CRUDO = { P1: 600, P2: 400, P3: 200 }
const iso = t => new Date(t).toISOString()
/** P3 para 12 h el 10-sep; P1 cierra 5 min después de que para la dosificadora de nafta, el 20-sep. */
const PARO_P3 = [SEP1 + 9 * D + 6 * H, SEP1 + 9 * D + 18 * H]
const NAFTA_CAE = [SEP1 + 19 * D + 8 * H, SEP1 + 19 * D + 14 * H]
const PARO_P1 = [NAFTA_CAE[0] + 5 * 60_000, NAFTA_CAE[1]]

/** Crudo que produjo el campo en un día, con los paros. */
function crudoDelDia(d) {
  const fuera = (p, [a, b]) => CRUDO[p] * Math.max(0, Math.min(b, d + D) - Math.max(a, d)) / D
  return CRUDO.P1 + CRUDO.P2 + CRUDO.P3 - fuera('P3', PARO_P3) - fuera('P1', PARO_P1)
}
const dias = Array.from({ length: DIAS }, (_, i) => SEP1 + i * D)
const crudoDia = dias.map(crudoDelDia)
const naftaDia = crudoDia.map(c => c * NAFTA)
const mezclaDia = crudoDia.map((c, i) => (c + naftaDia[i]) * (1 - S))

/** Cada variante es un campo propio: así caben todas en una sola instalación de insumos. */
const VARIANTES = {
  x1: { nombre: 'Campo X · nafta en planta', diluyente: 'planta', fiscal: mezclaDia, nafta: naftaDia },
  x2: { nombre: 'Campo X · sin el dato de nafta del 15-sep', diluyente: 'planta', fiscal: mezclaDia, nafta: naftaDia.map((x, i) => (i === 14 ? null : x)) },
  x3: { nombre: 'Campo X · sin diluyente', fiscal: crudoDia },
  x4: { nombre: 'Campo X · nafta en fondo de pozo', diluyente: 'fondo', fiscal: mezclaDia, nafta: naftaDia, fondo: true },
  x5: { nombre: 'Campo X · nafta en el oleoducto', diluyente: 'oleoducto', fiscal: crudoDia },
  x6: { nombre: 'Campo X · prueba de fondo sin el diluyente', diluyente: 'fondo', fiscal: mezclaDia, nafta: naftaDia, fondo: true, sinDiluyenteEn: 'P2' },
  // D1: sin diluyente, con el fiscal un 5 % sobre las pruebas solo el 10-sep (el día que para P3).
  x7: { nombre: 'Campo X · un día con el fiscal 5 % arriba', fiscal: crudoDia.map((c, i) => (i === 9 ? c * 1.05 : c)) },
}

const pozos = [], eventosPozos = [], eventosServicios = [], produccionDiaria = [], origenPmo = {}
for (const [c, x] of Object.entries(VARIANTES)) {
  for (const [p, q] of Object.entries(CRUDO)) {
    // En fondo de pozo, el separador de prueba mide el crudo con la nafta que se le inyecta.
    const prueba = x.fondo
      ? { fecha: '2026-08-15T10:00:00-05:00', crudoBpd: q * (1 + NAFTA), aguaBpd: q, ...(x.sinDiluyenteEn === p ? {} : { diluyenteBpd: q * NAFTA }) }
      : { fecha: '2026-08-15T10:00:00-05:00', crudoBpd: q, aguaBpd: q }
    pozos.push({ id: `${c}-${p}`, campoId: c, levantamiento: 'electrosumergible', controlador: `VSD-${c}-${p}`, alimentador: 'SE-1',
      origen: 'instrumento', fuentePrueba: 'Separador de prueba del Campo X', pruebas: [prueba] })
  }
  eventosPozos.push(
    { id: `EP-${c}-P3`, campoId: c, pozo: `${c}-P3`, inicio: iso(PARO_P3[0]), fin: iso(PARO_P3[1]), codigo: 'CMD', senal: `VSD-${c}-P3 · código CMD` },
    { id: `EP-${c}-P1`, campoId: c, pozo: `${c}-P1`, inicio: iso(PARO_P1[0]), fin: iso(PARO_P1[1]), codigo: 'CMD', senal: `VSD-${c}-P1 · código CMD` })
  eventosServicios.push({ id: `SV-${c}-NAF`, campoId: c, equipo: 'P-NAF-01', tipo: 'diluyente', inicio: iso(NAFTA_CAE[0]), fin: iso(NAFTA_CAE[1]),
    tag: 'FT-NAF-01', texto: 'dosificadora de nafta parada: caudal de diluyente en cero' })
  produccionDiaria.push({ campoId: c, mes: '2026-09', publicado: true, dias: x.fiscal, ...(x.nafta ? { nafta: x.nafta } : {}) })
  origenPmo[c] = { fuente: 'FQI-X · computador de flujo del Campo X', bsw: 'analizador',
    ...(x.diluyente ? { diluyente: { esquema: x.diluyente, encogimiento: S, fuente: 'Fórmula de encogimiento validada en laboratorio (Res. 40236, art. 25) [SUPUESTO: Campo X]', medidor: 'FT-NAF-01' } } : {}) }
}

const INS = await v.ssrLoadModule('/src/entities/insumos.ts')
INS.instalarInsumos({ pozos, eventosPozos, eventosServicios, produccionDiaria, origenPmo, paradasBombas: [], programa: [] })
const CA = await v.ssrLoadModule('/src/entities/campos.ts')
CA.instalarCampos(Object.entries(VARIANTES).map(([id, x]) => ({ id, nombre: x.nombre, cuenca: 'Llanos', choke: 'Planta', nota: 'Campo hipotético de la investigación 20, §8.3.' })))
const L = await v.ssrLoadModule('/src/entities/libro.ts')
const CS = await v.ssrLoadModule('/src/entities/causa-senal.ts')
const PE = await v.ssrLoadModule('/src/entities/perdidas.ts')
const AN = await v.ssrLoadModule('/src/entities/anh-clasificacion.ts')

const ctx = L.contextoInicial()
const desde = new Date(SEP1), hasta = new Date(SEP1 + DIAS * D)
const lb = c => L.libro([c], desde, hasta, ctx)
const fa = c => lb(c).fa.find(f => f.mes === '2026-09')?.fa
const tramo = (c, p) => lb(c).tramos.find(t => t.evento.id === `EP-${c}-${p}`)
const codigos = c => lb(c).motivos.map(m => m.codigo)
const neto = crudoDia.reduce((a, x) => a + x, 0)

console.log('\n1 · Nafta en planta: el fiscal es crudo neto de nafta')
comprobar(cerca(fa('x1'), 1, 1e-9), `factor de asignación ${n1(fa('x1'))} (sin descontar la nafta daba 1,214)`)
comprobar(cerca(tramo('x1', 'P3')?.bbl, 100, 1e-6), `P3 parado 12 h: ${n1(tramo('x1', 'P3')?.bbl)} bbl diferidos, no 121,4`)
comprobar(cerca(lb('x1').real, neto, 1e-6), `lo real del mes es el crudo neto: ${n1(lb('x1').real)} bbl, no los ${n1(mezclaDia.reduce((a, x) => a + x, 0))} de la mezcla`)
comprobar(!codigos('x1').includes('sin-nafta'), 'con la nafta de todos los días, ningún motivo de diluyente')

console.log('\n2 · Sin el dato de nafta de un día: ese día no es una cifra')
const x2 = lb('x2')
comprobar(codigos('x2').includes('sin-nafta'), `motivo «sin-nafta»: ${x2.motivos.find(m => m.codigo === 'sin-nafta')?.texto ?? 'no está'}`)
comprobar(!x2.publicable, 'el libro no se puede publicar')
comprobar(x2.sinNafta?.length === 1 && x2.sinNafta[0].dias.length === 1 && x2.sinNafta[0].dias[0].getTime() === dias[14], 'el día sin nafta es el 15-sep, y solo ese')
comprobar(cerca(x2.real, neto - crudoDia[14], 1e-6), `el 15-sep no entra en lo real: ${n1(x2.real)} bbl`)
comprobar(!x2.sinFiscal.length, 'no se confunde con un día sin fiscal: el computador de flujo sí reportó')
comprobar(cerca(tramo('x2', 'P3')?.bbl, 100, 1e-6), 'los días con dato siguen bien contados: P3 sigue en 100 bbl')

const C = await v.ssrLoadModule('/src/shared/api/contrato.ts')
const K = await v.ssrLoadModule('/src/shared/api/cable.ts')
const dto = K.aRespuesta(C.DIFERIDOS.codec, x2)
const vuelta = K.deRespuesta(C.DIFERIDOS.codec, JSON.parse(JSON.stringify(dto)))
comprobar(vuelta.sinNafta[0]?.dias[0] instanceof Date && vuelta.sinNafta[0].dias[0].getTime() === dias[14], 'por la red (GET /vistas/diferidos), el día sin nafta vuelve como fecha')
const viejo = JSON.parse(JSON.stringify(dto)); delete viejo.datos.sinNafta
comprobar(Array.isArray(K.deRespuesta(C.DIFERIDOS.codec, viejo).sinNafta) && K.deRespuesta(C.DIFERIDOS.codec, viejo).sinNafta.length === 0, 'un backend de antes del diluyente, que no manda «sinNafta», se lee como ningún campo sin nafta')

console.log('\n3 · Sin diluyente, los mismos números')
const x1 = lb('x1'), x3 = lb('x3')
comprobar(cerca(fa('x3'), 1, 1e-9) && cerca(tramo('x3', 'P3')?.bbl, 100, 1e-6), 'factor 1,000 y P3 en 100 bbl')
for (const k of ['real', 'potencial', 'diferido', 'brecha']) comprobar(cerca(x1[k], x3[k], 1e-6), `${k}: ${n1(x3[k])} sin diluyente = ${n1(x1[k])} con la nafta descontada`)
comprobar(!codigos('x3').includes('sin-nafta'), 'sin diluyente no se pide dato de nafta')

console.log('\n4 · Nafta en fondo de pozo: la prueba también va neta')
comprobar(cerca(fa('x4'), 1, 1e-9), `factor ${n1(fa('x4'))}`)
comprobar(cerca(tramo('x4', 'P3')?.bbl, 100, 1e-6), `P3 parado 12 h: ${n1(tramo('x4', 'P3')?.bbl)} bbl (sin descontar la nafta de la prueba ni la del fiscal: 122)`)
comprobar(cerca(lb('x4').potencial, x3.potencial, 1e-6), `el potencial es el de crudo neto: ${n1(lb('x4').potencial)} bbl, el mismo del campo sin diluyente`)
const x6 = lb('x6')
comprobar(codigos('x6').includes('sin-nafta') && !x6.publicable, `una prueba de fondo sin el diluyente: no publicable (${x6.motivos.find(m => m.codigo === 'sin-nafta')?.texto ?? 'sin motivo'})`)

console.log('\n5 · Nafta en el oleoducto: el punto de medición oficial mide crudo solo')
const x5 = lb('x5')
comprobar(cerca(x5.real, x3.real, 1e-6) && cerca(x5.diferido, x3.diferido, 1e-6), 'mismos números que sin diluyente')
comprobar(!codigos('x5').includes('sin-nafta'), 'no se pide dato de nafta: se mezcla después del punto de medición')

console.log('\n6 · La falta de diluyente es una causa')
const t1 = tramo('x1', 'P1')
comprobar(t1?.causa.tipo === 'diluyente', `P1, cerrado cuando paró la dosificadora: causa «${t1 ? CS.TIPO_CAUSA[t1.causa.tipo] : 'sin tramo'}»`)
comprobar(CS.TIPO_CAUSA.diluyente === 'Falta de diluyente', 'se llama «Falta de diluyente»')
comprobar(cerca(t1?.bbl, 600 * (5 + 55 / 60) / 24, 1e-6), `${n1(t1?.bbl)} bbl: 600 bbl/d × 5 h 55 min`)
comprobar(x1.porTipo.some(t => t.tipo === 'diluyente' && cerca(t.bbl, t1.bbl, 1e-9)), 'y suma en «por tipo» del libro')
const anh = AN.proponerClasificacion(t1.causa, 'x1', ctx)
comprobar(anh.fila === 'evacuacion' && /diluyente/i.test(anh.borrador.descEvid?.valor ?? ''), `en la ANH entra por la fila de evacuación del crudo; la descripción dice «${anh.borrador.descEvid?.valor ?? 'nada'}»`)

console.log('\n7 · La identidad del libro')
for (const c of Object.keys(VARIANTES)) {
  const l = lb(c)
  comprobar(Math.abs(l.potencial - l.real - l.diferido) < 1e-6, `${VARIANTES[c].nombre}: potencial − real − Σ diferidos = ${(l.potencial - l.real - l.diferido).toExponential(1)}`)
}

console.log('\n8 · Evaporación y fondos de tanque: pérdidas, no diferido')
comprobar(PE.TIPOS_PERDIDA.includes('evaporacion') && PE.TIPOS_PERDIDA.includes('fondos'), 'son tipos de pérdida')
comprobar(PE.NOMBRE_TIPO_PERDIDA.evaporacion === 'Evaporación' && PE.NOMBRE_TIPO_PERDIDA.fondos === 'Fondos de tanque', 'con su nombre: «Evaporación» y «Fondos de tanque»')
comprobar(/evaporaci[oó]n/i.test(PE.EXPLICA_PERDIDA) && /fondos de tanque/i.test(PE.EXPLICA_PERDIDA), 'la ⓘ de la pérdida los nombra')

console.log('\n9 · El factor de asignación es diario (D1)')
const x7 = lb('x7')
comprobar(cerca(tramo('x7', 'P3')?.bbl, 105, 1e-6), `P3 parado el 10-sep, el día del fiscal 5 % arriba: ${n1(tramo('x7', 'P3')?.bbl)} bbl, con el factor de ese día (con el del mes serían ${n1(100 * fa('x7'))})`)
comprobar(cerca(tramo('x7', 'P1')?.bbl, t1.bbl, 1e-6), `P1, parado el 20-sep con el fiscal igual a las pruebas: ${n1(tramo('x7', 'P1')?.bbl)} bbl, como sin el sesgo`)
const t7 = crudoDia.reduce((a, x) => a + x, 0), r7 = VARIANTES.x7.fiscal.reduce((a, x) => a + x, 0)
comprobar(cerca(fa('x7'), r7 / t7, 1e-12), `el factor del mes (el de la banda y la gráfica) es lo real ÷ lo teórico del mes: ${fa('x7').toFixed(4)}`)
const dd = L.porDia(['x7'], desde, hasta, ctx)
comprobar(dd.length === DIAS && dd.every(d => Math.abs(d.residuo) < 1e-6), `día por día, potencial − real − diferido = 0 (el mayor: ${Math.max(...dd.map(d => Math.abs(d.residuo))).toExponential(1)})`)
comprobar(cerca(x7.potencial - x7.real, x7.diferido, 1e-6), 'en el mes, potencial − real = Σ diferidos')

await v.close()
console.log(`\n${bien} de ${bien + mal} comprobaciones bien.`)
process.exit(mal ? 1 : 0)
