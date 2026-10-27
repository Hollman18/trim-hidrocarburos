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

  // Ninguna pantalla lo usa todavía (lo monta la tanda B), pero no puede traer colores propios.
  const fuentes = readdirSync(`${RAIZ}src/shared/ui/scada`).filter(n => /\.tsx?$/.test(n) && !/Muestra|entrada/.test(n)).map(n => sinComentarios(leer(`src/shared/ui/scada/${n}`))).join('\n')
  comprobar(!/#[0-9a-f]{3,6}\b/i.test(fuentes.replace(/'#'|`#/g, '')) && !/animate|animation|drop-shadow|linearGradient|radialGradient/.test(fuentes), 'el kit usa solo tokens: ningún color propio, ni animación, sombra o degradado')
} finally {
  await v.close()
}

console.log(`\n${pruebas - fallos} de ${pruebas} comprobaciones en verde`)
process.exit(fallos ? 1 : 0)
