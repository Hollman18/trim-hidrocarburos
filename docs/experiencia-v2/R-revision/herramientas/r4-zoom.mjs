/* R4 · §9 Zoom al 200 % y reflujo. Un escritorio de 1280 × 900 con el zoom del
   navegador al 200 % es una ventana de 640 × 450 px CSS (WCAG 1.4.4 y 1.4.10);
   el reflujo de WCAG 1.4.10 se mide además a 320 px. En cada una de las rutas de
   e2e/auditoria/rutas.ts:
   - ¿la PÁGINA se desplaza de lado? (el documento o el contenedor .vista: con
     overflow-y:auto, su overflow-x también es auto y ahí aparece la barra);
   - qué lo empuja (lo que pasa del borde derecho y no está dentro de un
     contenedor con desplazamiento lateral propio: ese sí se permite);
   - y el detector del auditor (e2e/auditoria/detector.ts, tal cual) en ese ancho.

   node docs/experiencia-v2/R-revision/herramientas/r4-zoom.mjs <url> [ancho] [alto] */
import { lanzar, SIN_INTRO, RUTAS, lista, guardar, esperar, RAIZ } from './r4-comun.mjs'
import { join } from 'node:path'

const { detectar } = await import(join(RAIZ, 'e2e/auditoria/detector.ts'))
const [base = 'http://localhost:5184', anchoTxt = '640', altoTxt = '450'] = process.argv.slice(2)
const ancho = Number(anchoTxt), alto = Number(altoTxt)

const navegador = await lanzar()
// 640 es un escritorio con zoom (sin modo táctil); 320 es el teléfono más angosto.
const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, isMobile: ancho <= 400, hasTouch: ancho <= 400, locale: 'es-CO', timezoneId: 'America/Bogota' })
await ctx.addInitScript(SIN_INTRO)
const page = await ctx.newPage()
await page.goto(`${base}/${RUTAS[0]}`); await lista(page); await esperar(800)

const salida = []
for (const ruta of RUTAS) {
  await page.evaluate(h => { location.hash = h }, ruta.slice(1))
  await esperar(300); await lista(page); await esperar(350)
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const doc = document.documentElement.scrollWidth - vw
    const v = document.querySelector('.vista')
    const vista = v ? v.scrollWidth - v.clientWidth : 0
    // Lo que se sale por la derecha sin un contenedor que se desplace de lado.
    const conScroll = e => { for (let a = e.parentElement; a; a = a.parentElement) { if (a.classList.contains('vista')) return false; const c = getComputedStyle(a).overflowX; if (c === 'auto' || c === 'scroll' || c === 'hidden' || c === 'clip') return true } return false }
    const culpables = []
    if (doc > 1 || vista > 1) for (const e of document.querySelectorAll('#root *')) {
      const q = e.getBoundingClientRect()
      if (q.width && q.right > vw + 1 && !conScroll(e)) {
        const hijoYaEsta = culpables.some(c => c.e.contains(e))
        if (!hijoYaEsta) culpables.push({ e, sale: Math.round(q.right - vw) })
      }
    }
    return { doc, vista, culpables: culpables.slice(0, 5).map(c => `${c.e.tagName.toLowerCase()}.${String(c.e.className).split(' ').slice(0, 4).join('.')} «${(c.e.textContent ?? '').trim().slice(0, 40)}» +${c.sale}px`) }
  })
  const hallazgos = (await page.evaluate(detectar)).filter(h => h[0] !== 'chico')
  salida.push({ ruta, ...r, hallazgos: hallazgos.slice(0, 6).map(h => `[${h[0]}] ${h[1].slice(0, 70)} ${h[2]}${h[3] ? ' ⟶ ' + h[3].slice(0, 50) : ''}`), nHallazgos: hallazgos.length })
}
await navegador.close()
const lateral = salida.filter(x => x.doc > 1 || x.vista > 1)
const conHallazgos = salida.filter(x => x.nHallazgos)
const f = guardar(`zoom-${ancho}x${alto}.json`, { base, ancho, alto, rutas: RUTAS.length, lateral: lateral.length, conHallazgos: conHallazgos.length, salida })
console.log(`${ancho} × ${alto} px CSS: ${RUTAS.length} rutas · la página se desplaza de lado en ${lateral.length} · el detector ve algo en ${conHallazgos.length} → ${f}`)
for (const x of lateral) console.log(`  LATERAL ${x.ruta}: documento +${x.doc} · .vista +${x.vista} · ${x.culpables.join(' | ')}`)
const porHallazgo = new Map()
for (const x of conHallazgos) for (const h of x.hallazgos) porHallazgo.set(h, [...(porHallazgo.get(h) ?? []), x.ruta])
for (const [h, rs] of [...porHallazgo].sort((a, b) => b[1].length - a[1].length).slice(0, 25)) console.log(`  ×${rs.length} ${h}  ← ${rs.slice(0, 3).join(' · ')}`)
