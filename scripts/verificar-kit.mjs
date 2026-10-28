// B1 · Experiencia v3: la identidad cálida (decisión 5), el kit SCADA y WhatsApp fuera del front.
// Cada comprobación falla sin su cambio. Uso: node scripts/verificar-kit.mjs (sale con 1 si algo falla).
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
let pruebas = 0, fallos = 0
const comprobar = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('  ✗ FALLA:', msg) } else console.log('  ✓', msg) }
const leer = rel => readFileSync(`${RAIZ}${rel}`, 'utf8')
const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

console.log('\n=== 1. La paleta cálida (decisión 5), medida desde src/index.css ===')
{
  const r = spawnSync(process.execPath, [`${RAIZ}docs/experiencia-v3/herramientas/medir-final.mjs`], { encoding: 'utf8' })
  const peor = [...r.stdout.matchAll(/peor caso del acento: ([\d,]+)/g)].map(m => m[1])
  comprobar(r.status === 0 && /Fallas: 0/.test(r.stdout), `WCAG 2.2 en los 5 fondos y los dos temas, y el acento a 10 o más de cada estado con las 4 visiones (peor caso ${peor.join(' · ')})`)
  const css = sinComentarios(leer('src/index.css'))
  comprobar(!/#142d88/i.test(css), 'el índigo #142d88 salió de los tokens')
  const bloque = sel => { const i = css.indexOf(`${sel}{`); return css.slice(i, css.indexOf('}', i)) }
  const claro = bloque(':root'), noche = bloque(':root[data-theme="dark"]')
  const hex = (b, k) => b.match(new RegExp(`--${k}:(#[0-9a-f]{6})`, 'i'))?.[1]
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(q => q <= 0.04045 ? q / 12.92 : ((q + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  // Sin la barra negra: el panel lateral es claro en el tema claro (como la v1), y en la noche no es negro.
  comprobar(!!hex(claro, 'nav') && lum(hex(claro, 'nav')) > 0.6 && !!hex(noche, 'nav') && lum(hex(noche, 'nav')) > 0.012,
    `el panel lateral es claro en el claro (${hex(claro, 'nav')}) y gris, no negro, en la noche (${hex(noche, 'nav')})`)
  // Cálidos: el rojo pesa más que el azul en los fondos (la familia de la v1), sin llegar a crema.
  const calido = h => { const [r, , b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return r - b >= 2 && r - b <= 10 }
  const fondos = ['suelo', 'superficie', 'panel', 'panel2', 'elevado']
  comprobar(fondos.every(f => calido(hex(claro, f)) && calido(hex(noche, f))), `los 5 fondos son grises cálidos en los dos temas, sin ser crema (${fondos.map(f => hex(claro, f)).join(' ')})`)
}

console.log('\n=== 2. IBM Plex Sans (OFL) en lugar de Air ===')
{
  const css = sinComentarios(leer('src/index.css')), html = leer('index.html')
  const caras = [...css.matchAll(/url\((\/fonts\/[^)]+)\)/g)].map(m => m[1])
  comprobar(caras.length > 0 && caras.every(c => /IBMPlex/.test(c) && existsSync(`${RAIZ}public${c}`)), `las ${caras.length} caras declaradas son de Plex y existen en public/fonts`)
  comprobar(!/font-family:\s*Air|"Air Condensed"|\bAir,/.test(css) && /--font-sans:\s*"IBM Plex Sans"/.test(css) && /--font-cond:\s*"IBM Plex Sans Condensed"/.test(css) && /--font-mono:\s*"IBM Plex Mono"/.test(css),
    'la letra de la aplicación es Plex Sans, Plex Sans Condensed y Plex Mono; Air ya no se declara')
  comprobar(!/Air-|AirCondensed/.test(html) && /IBMPlexSans-Regular-Latin1\.woff2/.test(html), 'index.html precarga Plex, no Air')
  comprobar(/SIL Open Font License, Version 1\.1/.test(leer('public/fonts/IBM-Plex-OFL.txt')), 'la licencia OFL 1.1 va con las fuentes')
  comprobar(!/fontFamily="Air/.test(leer('src/shared/ui/Prioridad.tsx')), 'el número de las marcas va en Plex')
}

console.log('\n=== 3. El panel lateral claro y el teléfono con el mismo panel ===')
{
  const riel = sinComentarios(leer('src/widgets/Riel.tsx')), app = sinComentarios(leer('src/App.tsx')), menu = sinComentarios(leer('src/widgets/MenuPerfil.tsx'))
  comprobar(/bg-\[var\(--nav\)\]/.test(riel) && !/bg-\[var\(--marca\)\]|text-white|bg-white/.test(riel), 'el panel va en --nav, sin el bloque de color ni la letra blanca')
  comprobar(/shadow-\[inset_3px_0_0_var\(--acento\)\]/.test(riel) && /bg-\[var\(--nav-activo\)\]/.test(riel) && /font-semibold/.test(riel), 'lo seleccionado: el fondo claro, la raya de 3 px del acento a la izquierda y el peso (nunca solo color)')
  comprobar(!/text-white|marca-capa|marca-tenue/.test(menu), 'la persona, al pie del panel, en tinta')
  const banda = app.slice(app.indexOf('function BandaTelefono'), app.indexOf('function PanelTelefono'))
  comprobar(/bg-\[var\(--nav\)\]/.test(banda) && !/bg-\[var\(--marca\)\]/.test(banda) && /Abrir la navegación/.test(banda), 'la banda del teléfono es clara y lleva el ☰ que abre el mismo panel')
}

console.log('\n=== 4. WhatsApp fuera del front ===')
{
  const archivos = []
  const recorrer = d => { for (const n of readdirSync(`${RAIZ}${d}`)) { const r = `${d}/${n}`; statSync(`${RAIZ}${r}`).isDirectory() ? recorrer(r) : /\.tsx?$/.test(n) && archivos.push(r) } }
  for (const d of ['src/pages', 'src/widgets', 'src/app']) recorrer(d)
  archivos.push('src/App.tsx')
  const con = archivos.filter(a => /whatsapp/i.test(sinComentarios(leer(a))))
  comprobar(!existsSync(`${RAIZ}src/widgets/whatsapp`) && con.length === 0, `ninguna pantalla ni widget muestra WhatsApp${con.length ? `: ${con.join(', ')}` : ''}`)
}

console.log('\n=== 5. El kit SCADA en sus 5 estados (src/shared/ui/scada) ===')
const v = await createServer({ root: RAIZ, configFile: false, resolve: { alias: { '@': `${RAIZ}src` } }, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' })
try {
  const { createElement: h } = await import('react')
  const { renderToStaticMarkup: r } = await import('react-dom/server')
  const K = await v.ssrLoadModule('/src/shared/ui/scada/index.ts')
  const ESTADOS = K.ESTADOS_KIT
  comprobar(ESTADOS.join(',') === 'normal,anormal,sin-dato,sin-comunicacion,parado', 'los 5 estados del kit')
  const esc = { min: 0, max: 30, firmada: false }
  const barra = p => r(h(K.Barra, { nombre: 'Presión de succión', unidad: 'psi', escala: esc, banda: [10, null], alarmas: [8], decimales: 1, ...p }))

  // Barra
  const bN = barra({ valor: 12 }), bA = barra({ valor: 7.6, estado: 'anormal', condicion: 'alarma', cruzo: 8 })
  const bD = barra({ valor: null, estado: 'sin-dato' }), bC = barra({ valor: 12, estado: 'sin-comunicacion', desde: '14:07' }), bP = barra({ valor: 18.2, estado: 'parado' })
  comprobar(/role="img"/.test(bN) && /aria-label="Presión de succión, 12,0 psi; normal sobre 10,0; alarma en 8,0; escala provisional"/.test(bN),
    'barra · normal: su nombre accesible con el valor, la banda, la alarma y «escala provisional»')
  comprobar(!/var\(--p1\)|var\(--interlock\)|var\(--sincom\)/.test(bN) && /data-puntero/.test(bN) && /data-banda/.test(bN), 'barra · normal: gris y tinta, sin marca ni color de estado')
  comprobar(/stroke="var\(--p1\)"/.test(bA) && /<path d="M7 0\.5[^"]*" fill="var\(--p1\)"/.test(bA) && /alarma en 8,0; en alarma/.test(bA) && /font-bold/.test(bA) && !/fill="var\(--p1\)"[^>]*data-puntero/.test(bA),
    'barra · anormal: el límite cruzado en el naranja, la marca y el valor en negrita; el puntero no se pinta')
  comprobar(/—/.test(bD) && !/data-puntero/.test(bD) && /sin lectura/.test(bD) && !/>0</.test(bD), 'barra · sin dato: «—», sin puntero y con la palabra; nunca un cero')
  comprobar(/---/.test(bC) && !/12,0|>12</.test(bC) && /stroke="var\(--sincom\)"/.test(bC) && /sin comunicación desde las 14:07/.test(bC),
    'barra · sin comunicación: «---» (no el 12 viejo), contorno morado y «desde las 14:07»')
  comprobar(/fill="var\(--tinta3\)"/.test(bP) && !/var\(--p1\)|var\(--p2\)|var\(--interlock\)/.test(bP), 'barra · parado: el puntero en gris y ninguna marca propia')
  const xBanda = s => s.match(/<g data-banda=""><rect x="([\d.]+)"/)?.[1]
  comprobar(new Set([5, 18, 29].map(valor => xBanda(barra({ valor })))).size === 1, 'barra · I1: con 3 valores la banda queda en la misma x (la escala no se mueve con la lectura)')
  comprobar(/sin escala firmada/.test(r(h(K.Barra, { nombre: 'X', unidad: 'psi', valor: 3 }))) && !/escala provisional/.test(barra({ valor: 12, escala: { ...esc, firmada: true } })),
    'barra: sin escala no se inventa una; con la escala firmada no dice «provisional»')

  // Tendencia
  const tend = p => r(h(K.Tendencia, { titulo: 'Cojinete', ventana: '12 d', unidad: '°C', escala: { min: 0, max: 100, firmada: false }, banda: [0, 85], alarmas: [85], series: [{ nombre: 'TI', valores: [70, 72, 74, 76, 78, 80] }], ejeX: ['21 sept', 'hoy'], ...p }))
  const tN = tend({}), tA = tend({ estado: 'anormal', condicion: 'alarma', cruzo: 85, series: [{ nombre: 'TI', valores: [70, 75, 80, 84, 86, 88] }] })
  const tD = tend({ estado: 'sin-dato', series: [{ nombre: 'TI', valores: [70, 71, null, null, 72, 73] }] })
  const tC = tend({ estado: 'sin-comunicacion', desde: '14:07', series: [{ nombre: 'TI', valores: [70, 71, 72, null, null, null] }] })
  const tP = tend({ estado: 'parado', paradaDesde: 3 })
  comprobar(/12 d/.test(tN) && /hoy/.test(tN) && /stroke="var\(--dato1\)"/.test(tN) && /stroke-dasharray="5 3"/.test(tN), 'tendencia · normal: la ventana escrita, «hoy», la línea en --dato1 y la alarma discontinua')
  comprobar(/stroke="var\(--p1\)"[^>]*data-alarma|data-alarma[^>]*stroke="var\(--p1\)"/.test(tA) && /stroke="var\(--dato1\)"/.test(tA), 'tendencia · anormal: la raya de la alarma en naranja y la línea sigue en tinta')
  const caminos = s => (s.match(/<path d="([^"]*)" fill="none" stroke="var\(--d/)?.[1] ?? '').split('M').length - 1
  comprobar(caminos(tD) === 2 && !/ 0\.0 |L[\d.]+ 64\.0/.test(tD), 'tendencia · sin dato: el hueco corta la línea (dos tramos), no se une ni se pinta en cero')
  comprobar(/stroke="var\(--sincom\)"/.test(tC) && /sin comunicación desde las 14:07/.test(tC), 'tendencia · sin comunicación: la línea termina y lleva el círculo punteado')
  comprobar(/data-parado/.test(tP) && /stroke="var\(--dato3\)"/.test(tP) && !/stroke="var\(--dato1\)"/.test(tP), 'tendencia · parado: el tramo parado rayado y la línea en gris')
  comprobar(/stroke-dasharray="6 3"/.test(tend({ series: [{ nombre: 'm', valores: [1, 2] }, { nombre: 'p', valores: [2, 3], proyectado: true }] })), 'tendencia: lo proyectado va discontinuo')
  comprobar(tend({ alarmas: [], series: [{ nombre: 'x', valores: [1, 2, 3] }] }).match(/>100</) !== null, 'tendencia: la escala es la de la señal (rotula 100 aunque la lectura sea 3): no autoescala')

  // Símbolos
  const enSvg = el => r(h('svg', null, el))
  for (const [nombre, C, extra] of [['bomba', K.Bomba, {}], ['tanque', K.Tanque, { nivel: 60 }], ['válvula', K.Valvula, {}], ['separador', K.Separador, {}], ['pozo', K.Pozo, {}], ['medidor', K.Medidor, { letras: 'FI', lazo: '2011', valor: 74200 }]]) {
    const s = Object.fromEntries(ESTADOS.map(e => [e, enSvg(h(C, { x: 50, y: 50, estado: e, condicion: e === 'anormal' ? 'alarma' : undefined, ...extra }))]))
    const ok = ESTADOS.every(e => s[e].includes(`data-estado="${e}"`))
      && /stroke="var\(--sincom\)"/.test(s['sin-comunicacion']) && /stroke-dasharray/.test(s['sin-dato'])
      && /data-marca="alarma"/.test(s.anormal) && !/data-marca/.test(s.parado) && !/data-marca/.test(s.normal)
      && (nombre === 'medidor' || nombre === 'tanque' || /var\(--eq-parado\)/.test(s.parado))
    comprobar(ok, `${nombre}: los 5 estados (sin dato discontinuo, sin comunicación en morado, la marca solo en lo anormal, parado sin marca)`)
  }
  const bombaA = enSvg(h(K.Bomba, { x: 50, y: 50, estado: 'anormal', condicion: 'alarma' })), bombaAv = enSvg(h(K.Bomba, { x: 50, y: 50, estado: 'anormal', condicion: 'aviso' }))
  comprobar(/data-anillo/.test(bombaA) && !/data-anillo/.test(bombaAv) && /stroke-width="2"/.test(bombaA), 'el anillo de 2 px solo con ◆1 y el interlock; lo anormal, con contorno de 2 px')
  comprobar(/---/.test(enSvg(h(K.Medidor, { x: 50, y: 50, estado: 'sin-comunicacion', letras: 'FI', lazo: '2011', valor: 74200 }))) && !/74\.200/.test(enSvg(h(K.Medidor, { x: 50, y: 50, estado: 'sin-comunicacion', letras: 'FI', lazo: '2011', valor: 74200 }))),
    'medidor sin comunicación: «---», nunca el último valor')
  comprobar(!/data-nivel/.test(enSvg(h(K.Tanque, { x: 0, y: 0, estado: 'sin-dato', nivel: 50 }))), 'tanque sin dato: sin nivel dibujado (nunca un nivel inventado)')
  const lineas = Object.keys(K.TRAZO_FLUIDO).map(f => enSvg(h(K.Linea, { puntos: [[0, 0], [40, 0]], fluido: f })))
  comprobar(lineas.every(l => /stroke="var\(--dato1\)"/.test(l)) && new Set(Object.values(K.TRAZO_FLUIDO).map(t => `${t.ancho}|${t.dash ?? ''}`)).size === 6,
    'una línea por fluido: todas en --dato1; cada fluido con su trazo, nunca por el color')
  comprobar(/opacity="0.55"/.test(enSvg(h(K.Linea, { puntos: [[0, 0], [40, 0]], fluido: 'agua', sinFlujo: true }))), 'sin flujo: el mismo trazo, tenue')

  // Marca
  const marcas = ['interlock', 'alarma', 'atencion', 'aviso', 'sin-comunicacion', 'invalido', 'falta', 'sin-instrumento', 'bloqueo', 'normal'].map(t => r(h(K.Marca, { tipo: t })))
  comprobar(marcas.every((m, i) => m.includes(Object.values(K.PALABRA_MARCA)[i])) && /aria-label="Alarma"/.test(r(h(K.Marca, { tipo: 'alarma', soloMarca: true }))),
    'marca: las 10 de X2 con su palabra al lado; sola, con la palabra en el nombre accesible')

  // Cifra
  const cifra = p => r(h(K.Cifra, { rotulo: 'Se deja de producir', valor: 2650, unidad: 'bbl/d', ...p }))
  comprobar(/2\.650/.test(cifra({ tamano: 'principal' })) && /data-tamano="principal"/.test(cifra({ tamano: 'principal' })) && /text-\[60px\]/.test(cifra({ tamano: 'principal' })), 'cifra · normal: el número principal, tabular, a 60 px')
  comprobar(/data-tamano="apoyo"/.test(cifra({ tamano: 'principal', calidad: 'proyectado' })) && /proyectado/.test(cifra({ tamano: 'principal', calidad: 'proyectado' })), 'cifra: lo proyectado nunca es la cifra grande y lleva su palabra')
  comprobar(/aria-label="Se deja de producir: 2\.650 bbl\/d, en aviso"/.test(cifra({ estado: 'anormal', condicion: 'aviso' })) && !/text-\[var\(--p/.test(cifra({ estado: 'anormal', condicion: 'aviso' })), 'cifra · anormal: la marca a su izquierda y nunca en color')
  comprobar(/—/.test(cifra({ valor: null, estado: 'sin-dato' })) && !/>0</.test(cifra({ valor: null, estado: 'sin-dato' })), 'cifra · sin dato: «—», nunca 0')
  comprobar(/---/.test(cifra({ estado: 'sin-comunicacion', desde: '14:07' })) && !/2\.650/.test(cifra({ estado: 'sin-comunicacion', desde: '14:07' })), 'cifra · sin comunicación: «---» y desde cuándo')
  comprobar(/text-\[var\(--tinta2\)\][^"]*"[^>]*>0</.test(cifra({ valor: 0, estado: 'parado' })) || /data-cifra-numero=""[^>]*text-\[var\(--tinta2\)\]/.test(cifra({ valor: 0, estado: 'parado' })), 'cifra · parado: el 0 medido, en gris')

  // K3 · La barra contra la meta y las columnas por período (antes BarraMeta y la gráfica a mano de Confiabilidad).
  const cm = p => r(h(K.ContraMeta, { rotulo: 'diferido', valor: 0, unidad: 'bbl/d', meta: 800, rotuloMeta: 'máx. 800', tipoMeta: 'máximo', ocultarRotulo: true, ...p }))
  comprobar(/data-kit="contra-meta"/.test(cm({})) && /width="0%"[^>]*data-relleno/.test(cm({})) && /x1="80%"[^>]*stroke-width="2"[^>]*data-raya/.test(cm({}))
      && /aria-label="diferido: 0 bbl\/d, máximo 800"/.test(cm({})) && !/data-barra/.test(cm({ meta: undefined })),
    'contra la meta: en 0 no llena la pista, la raya de 2 px al 80 %, «máximo» sin abreviar y sin meta no hay barra')
  comprobar(/width="100%"[^>]*data-relleno/.test(cm({ valor: 5000 })) && !/var\(--p[123]\)"/.test(cm({ valor: 5000, fuera: true }).replace(/<svg[^>]*viewBox="0 0 14 14"[\s\S]*?<\/svg>/g, '')),
    'contra la meta: lo que se pasa llega al tope (1,25 veces) y la barra nunca se pinta del estado (la marca va aparte)')
  const col = r(h(K.Columnas, { 'aria-label': 'Fallas por mes', partes: ['a', 'b'], titulo: () => '', periodos: [{ clave: '2026-01', rotulo: 'ene', segundo: '2026', valores: [2, 1], total: 4 }, { clave: '2026-02', rotulo: 'feb', valores: [0, 0] }] }))
  comprobar(/data-kit="columnas"/.test(col) && />4</.test(col) && !/>0</.test(col) && (col.match(/stroke="var\(--panel\)"/g) ?? []).length === 2 && !/var\(--p[123]|var\(--interlock/.test(col),
    'columnas: el total del motor arriba, un período sin nada sin cifra ni cero, 1 px de --panel entre partes y ningún color de estado')

  // D2 · Los gráficos profesionales: ejes, cuadrícula, unidad, leyenda, el cursor y la ficha.
  const E = await v.ssrLoadModule('/src/shared/ui/scada/ejes.ts')
  comprobar(E.marcasRedondas(0, 1600, 4).join() === '0,500,1000,1500' && E.marcasRedondas(0, 7, 3).join() === '0,5' && E.marcasRedondas(0.8, 1.2, 4, 2).join() === '0.8,0.9,1,1.1,1.2' && E.marcasRedondas(0, 3, 8, 0).every(x => Number.isInteger(x)),
    'D2 · las marcas del eje son redondas (1, 2 o 5 por una potencia de 10) y, sin decimales, enteras')
  const dias = E.etiquetasDeTiempo({ desde: '2026-09-21T00:00:00-05:00', pasoH: 24 }, 12), horas = E.etiquetasDeTiempo({ desde: '2026-10-02T12:00:00-05:00', pasoH: 1 }, 3)
  comprobar(dias.length === 12 && /^21 de sept$/.test(dias[0]) && /^2 de oct$/.test(dias[11]) && /14:00$/.test(horas[2]) && E.etiquetasDeTiempo({ desde: 'no', pasoH: 24 }, 3).length === 0,
    `D2 · el cuándo de cada punto sale del comienzo y el paso de la serie («${dias[0]}» … «${dias[11]}», «${horas[2]}»); sin fecha válida, ninguna (nunca inventada)`)
  const tGrande = tend({ alto: 150, ancho: 480, etiquetas: ['21 sept', '22 sept', '23 sept', '24 sept', '25 sept', '26 sept'], ejeX: undefined })
  const rotY = [...tGrande.matchAll(/<text x="[\d.]+" y="([\d.]+)" text-anchor="end"[^>]*>([^<]+)</g)].map(m => [Number(m[1]) - 4, m[2]])
  const rejilla = [...(tGrande.match(/<g data-rejilla="">([\s\S]*?)<\/g>/)?.[1] ?? '').matchAll(/y1="([\d.]+)"/g)].map(m => Number(m[1]))
  comprobar(rejilla.length > 0 && rejilla.every(y => rotY.some(([ry]) => Math.abs(ry - y) < 1)) && !/<path[^>]*stroke="var\(--linea2\)"/.test(tGrande),
    `D2 · tendencia: la cuadrícula fina (--linea2, 1 px) solo donde hay rótulo en el eje y (${rejilla.length} rayas, rótulos ${rotY.map(r => r[1]).join(' ')})`)
  comprobar(/data-unidad="">°C</.test(tGrande) && !/data-unidad/.test(tend({ alto: 64 })) && (tGrande.match(/<g data-eje-x="">[\s\S]*?<\/g>/)?.[0].match(/<text/g) ?? []).length > 2 && /21 sept/.test(tGrande),
    'D2 · tendencia: la unidad en el eje (no en la de 64 px, que la lleva en el título) y marcas intermedias del tiempo con su rótulo')
  comprobar(/<svg[^>]*tabindex="0"[^>]*role="img"|<svg[^>]*role="img"[^>]*tabindex="0"/.test(tN) && /data-zona=""/.test(tN) && !/tabindex/.test(tend({ compacta: true, ancho: 120, alto: 30 })) && /aria-live="polite"/.test(tN),
    'D2 · tendencia: la gráfica es una parada del teclado con su región viva; la compacta responde al puntero pero no es parada de Tab')
  const dosSeries = tend({ series: [{ nombre: 'Real', valores: [1, 2, 3] }, { nombre: 'Meta', valores: [2, 2, 2], trazo: 'discontinuo', esMeta: true }, { nombre: 'Sim', valores: [3, 3, 3], simulado: true }] })
  comprobar((dosSeries.match(/data-leyenda-serie=/g) ?? []).length === 3 && (dosSeries.match(/aria-pressed="true"/g) ?? []).length === 3 && (dosSeries.match(/data-serie=/g) ?? []).length === 3
      && !/data-leyenda-kit/.test(tN) && /· simulado/.test(dosSeries) && /data-serie="Sim" data-trazo="discontinuo"/.test(dosSeries),
    'D2 · tendencia: con 2 series o más, la leyenda (un botón por serie, que aísla o apaga); con una, no. Lo simulado va discontinuo y con su palabra')
  const det = r(h(K.Tendencia, { titulo: 'Cojinete', ventana: '12 d', unidad: '°C', detalle: true, escala: { min: 0, max: 100, firmada: true }, banda: [0, 85], alarmas: [85], series: [{ nombre: 'TI', valores: [70, 72, 74, 76, 78, 80] }, { nombre: 'P', valores: [71, 71, 72, 72, 73, 73] }], tiempo: { desde: '2026-09-27T00:00:00-05:00', pasoH: 24 } }))
  comprobar(/data-detalle=""/.test(det) && /de 27 de sept a 2 de oct/.test(det) && /width="640" height="240"/.test(det) && /mín 70 · máx 80/.test(det)
      && (det.match(/<g data-rejilla="">[\s\S]*?<\/g>/)?.[0].match(/<line/g) ?? []).length > (tN.match(/<g data-rejilla="">[\s\S]*?<\/g>/)?.[0].match(/<line/g) ?? []).length,
    'D2 · tendencia en detalle (el modal): 640 × 240 si no se dice, el rango escrito, mínimo y máximo en la leyenda y más marcas')
  const colD = r(h(K.Columnas, { 'aria-label': 'Fallas', partes: ['a'], periodos: [{ clave: '1', rotulo: 'ene', valores: [7] }, { clave: '2', rotulo: 'feb', valores: [0] }] }))
  comprobar(/tabindex="0"/.test(colD) && /data-rejilla/.test(colD) && !/<title>/.test(colD) && !/>0</.test(colD) && !/data-zona/.test(colD),
    'D2 · columnas: parada del teclado, la cuadrícula con sus cifras (nunca el 0: el piso ya lo dice) y la ficha en lugar del globo del navegador (sin un <rect> que no sea una parte: el <svg> entero recibe el puntero)')
  comprobar(/tabindex="0"/.test(barra({ valor: 12 })) && /tabindex="0"/.test(cm({})) && !/tabindex/.test(barra({ valor: 12, interactiva: false })),
    'D2 · la barra y la barra contra la meta abren su ficha al pasar el cursor, al tocarlas o con Tab (y se puede apagar)')
  const fuentesD2 = ['Ficha.tsx', 'cursor.ts', 'ejes.ts'].map(n => sinComentarios(leer(`src/shared/ui/scada/${n}`))).join('\n')
  comprobar(/requestAnimationFrame/.test(fuentesD2) && /createPortal/.test(fuentesD2) && /aria-hidden data-kit="ficha"/.test(fuentesD2) && !/shadow|sombra-flota/.test(fuentesD2)
      && !/@\/entities|@\/shared\/api/.test(fuentesD2 + sinComentarios(leer('src/shared/ui/scada/Tendencia.tsx'))),
    'D2 · la ficha: un cuadro por cuadro de animación (requestAnimationFrame), en <body> (no la recorta la tarjeta ni el modal), sin sombra; el cursor no llama al motor')

  // K3 · Ninguna pantalla dibuja un <svg> propio: lo dibuja el kit (el auditor lo mira en vivo, «kit»).
  const enPantallas = []
  const recorrerK3 = d => { for (const n of readdirSync(`${RAIZ}${d}`)) { const x = `${d}/${n}`; statSync(`${RAIZ}${x}`).isDirectory() ? recorrerK3(x) : /\.tsx$/.test(n) && enPantallas.push(x) } }
  for (const d of ['src/pages', 'src/widgets']) recorrerK3(d)
  // La única excepción es un ícono: la marca de la configuración (12 × 12, `widgets/configuracion/marcas.tsx`).
  const conSvg = enPantallas.filter(a => /<svg\b/.test(sinComentarios(leer(a))) && a !== 'src/widgets/configuracion/marcas.tsx')
  comprobar(conSvg.length === 0 && !existsSync(`${RAIZ}src/shared/ui/Sparkline.tsx`) && !existsSync(`${RAIZ}src/shared/ui/BarraMeta.tsx`) && !existsSync(`${RAIZ}src/shared/ui/Analogico.tsx`),
    `ningún <svg> a mano en pages/ ni widgets/, y Sparkline, BarraMeta e IndicadorFijo se borraron${conSvg.length ? `: ${conSvg.join(', ')}` : ''}`)

  // El kit no puede traer colores propios.
  const fuentes = readdirSync(`${RAIZ}src/shared/ui/scada`).filter(n => /\.tsx?$/.test(n) && !/Muestra|entrada/.test(n)).map(n => sinComentarios(leer(`src/shared/ui/scada/${n}`))).join('\n')
  comprobar(!/#[0-9a-f]{3,6}\b/i.test(fuentes.replace(/'#'|`#/g, '')) && !/animate|animation|drop-shadow|linearGradient|radialGradient/.test(fuentes), 'el kit usa solo tokens: ningún color propio, ni animación, sombra o degradado')
} finally {
  await v.close()
}

console.log(`\n${pruebas - fallos} de ${pruebas} comprobaciones en verde`)
process.exit(fallos ? 1 : 0)
