// Uso: node docs/experiencia-v3/herramientas/flujos-recorrer.mjs ./flujos-tareas.mjs [filtro] [--ancho=1440,390] [--shots] [--json=salida.json] [--dir=carpeta]
// Necesita Vite en 5182 (npx vite --port 5182 --strictPort). OJO: «Aplicar las N» de Conectores escribe en simulador-api/datos/trim.db; las tareas no lo tocan.
import { chromium } from '/Users/hollman/trim-hidrocarburos/node_modules/@playwright/test/index.mjs'
import fs from 'node:fs'
const args = process.argv.slice(2)
const mod = await import(args[0])
const filtro = args.find((a, i) => i > 0 && !a.startsWith('--'))
const anchos = (args.find(a => a.startsWith('--ancho='))?.slice(8) ?? '1440,390').split(',')
const shots = args.includes('--shots')
const DIR = args.find(a => a.startsWith('--dir='))?.slice(6) ?? '/Users/hollman/trim-hidrocarburos/docs/experiencia-v3/capturas/flujos'
const b = await chromium.launch()
const salida = []
for (const ancho of anchos) {
  const tel = ancho === '390'
  for (const f of mod.flujos.filter(f => !filtro || f.id.includes(filtro))) {
    if (f.solo && f.solo !== ancho) continue
    const ctx = await b.newContext(tel ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } })
    await ctx.addInitScript(() => { try { for (const r of ['ger','prod','sup','oper','jefe','conf','tec','reg','adm','plan','cont']) localStorage.setItem('trim.intro.'+r,'1') } catch {} })
    const p = await ctx.newPage()
    const errores = []; p.on('pageerror', e => errores.push(String(e)))
    const pasos = []; let toques = 0, desplaz = 0, n = 0, escrituras = 0, pantallas = 1, ultimaVista = ''
    const estado = async () => p.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight }
      const h = [...document.querySelectorAll('h1,h2,h3,[role=dialog] h2')].filter(vis).map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 80))
      const st = [...document.querySelectorAll('[role=status],[role=alert],[aria-live]')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).map(t => t.slice(0, 120))
      const dlg = [...document.querySelectorAll('[role=dialog]')].filter(vis).map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 300))
      const txt = (document.querySelector('main') ?? document.body).innerText
      const palabras = [...document.querySelectorAll('main *')].length ? undefined : undefined
      return { hash: location.hash, h, st, dlg, scrollY: Math.round(scrollY), main: txt.replace(/\s+/g, ' ').slice(0, 400) }
    })
    const foto = async (tag) => { if (!shots) return null; const nombre = `${f.id}-${ancho}-${String(n).padStart(2, '0')}-${tag}.jpg`; await p.screenshot({ path: `${DIR}/${nombre}`, type: 'jpeg', quality: 62 }); return nombre }
    const t0 = Date.now()
    for (const s0 of f.pasos) {
      const s = { ...s0 }
      if (tel && s.solo1440) continue
      if (!tel && s.solo390) continue
      if (tel && s.telClick) { s.click = s.telClick; delete s.css }
      if (tel && s.telMirarCss) { s.mirarCss = s.telMirarCss; delete s.mirar }
      try {
        if (tel && s.tel === 'nav') { await p.getByRole('button', { name: /Abrir la navegación/ }).first().click(); toques++; await p.waitForTimeout(500) }
        if (s.go) { await p.goto('http://localhost:5182/' + s.go); await p.waitForTimeout(1600) }
        else if (s.click || s.css || s.texto) {
          let loc
          if (s.css) loc = p.locator(s.css)
          else if (s.texto) loc = p.getByText(s.texto, { exact: !!s.exacto })
          else loc = p.getByRole(s.rol ?? 'button', { name: s.click, exact: !!s.exacto })
          loc = s.ultimo ? loc.last() : loc.nth(s.nth ?? 0)
          await loc.waitFor({ state: 'attached', timeout: 4000 })
          const box = await loc.boundingBox()
          const fuera = !box || box.y < 0 || box.y + Math.min(box.height, 44) > (tel ? 844 : 900)
          if (fuera || s.desplazo) { desplaz++; s._fuera = box ? Math.round(box.y) : 'oculto' }
          await loc.scrollIntoViewIfNeeded({ timeout: 4000 })
          // ¿estaba fuera de la primera vista antes de scrollIntoView? medimos la posición absoluta
          const abs = await loc.evaluate(e => Math.round(e.getBoundingClientRect().top + scrollY))
          await loc.click({ timeout: 4000 }); toques++
          await p.waitForTimeout(s.espera ?? 900)
          s._abs = abs
        }
        else if (s.mirar || s.mirarCss) {
          const loc = s.mirarCss ? p.locator(s.mirarCss).first() : p.getByText(s.mirar, { exact: !!s.exacto }).nth(s.nth ?? 0)
          if (s.toque) toques++
          await loc.waitFor({ state: 'attached', timeout: 4000 })
          const box = await loc.boundingBox()
          if (!box || box.y < 0 || box.y + 30 > (tel ? 844 : 900)) { desplaz += Math.max(1, Math.round(((box?.y ?? 0) - (tel ? 844 : 900) * 0.5) / ((tel ? 844 : 900) * 0.8))); s._fuera = box ? Math.round(box.y) : 'oculto' }
          await loc.scrollIntoViewIfNeeded({ timeout: 4000 }); await p.waitForTimeout(400)
        }
        else if (s.escribir) { const loc = p.locator(s.css2).nth(0); await loc.scrollIntoViewIfNeeded(); await loc.fill(s.escribir); toques++; escrituras++; await p.waitForTimeout(300) }
        else if (s.tecla) { await p.keyboard.press(s.tecla); toques++; await p.waitForTimeout(700) }
        else if (s.scroll) { await p.mouse.wheel(0, s.scroll); desplaz++; await p.waitForTimeout(500) }
        else if (s.atras) { await p.goBack(); toques++; await p.waitForTimeout(900) }
        n++
        const e = await estado()
        const vista = e.hash.replace(/\/(curso|cerrado)$/, '') + (e.dlg.length ? '#dlg' : '')
        if (ultimaVista && vista !== ultimaVista && !s.go) pantallas++
        ultimaVista = vista
        const shot = await foto(s.tag ?? (s.click ?? s.texto ?? s.go ?? 'paso').toString().replace(/[^a-z0-9]+/gi, '-').slice(0, 30).toLowerCase())
        pasos.push({ paso: s.click ?? s.texto ?? s.css ?? s.go ?? s.tecla ?? (s.scroll ? 'desplazar' : (s.mirar || s.mirarCss) ? 'mirar: ' + (s.mirar ?? s.mirarCss) : s.escribir ? 'escribir' : 'atrás'), y: s._abs, ...e, shot })
        console.log(`[${f.id} ${ancho}] ${n}. ${s.click ?? s.texto ?? s.css ?? s.go ?? s.tecla ?? ((s.mirar || s.mirarCss) ? 'mirar «' + (s.mirar ?? s.mirarCss) + '»' : s.escribir ? 'escribir' : 'scroll')}${s._abs != null ? ' (y=' + s._abs + ')' : ''}${s._fuera != null ? ' [DESPLAZAR: estaba en y=' + s._fuera + ']' : ''} → ${e.hash} | h: ${e.h.slice(0, 6).join(' / ')}${e.st.length ? ' | estado: ' + e.st.join(' ; ') : ''}${e.dlg.length ? ' | diálogo: ' + e.dlg.join(' ; ') : ''}`)
        if (s.ver) console.log('     main: ' + e.main)
      } catch (err) { console.log(`[${f.id} ${ancho}] ${n}. FALLA ${JSON.stringify(s)}: ${String(err).split('\n')[0]}`); pasos.push({ falla: String(err).split('\n')[0], s }); break }
    }
    const segundos = Math.round(2 + 1.2 * toques + 3 * (pantallas - 1) + 1.5 * desplaz + 10 * escrituras)
    salida.push({ id: f.id, rol: f.rol, tarea: f.tarea, ancho, toques, desplaz, pantallas, escrituras, segundos, termina: f.termina, pasos, errores })
    console.log(`[${f.id} ${ancho}] = ${toques} toques, ${desplaz} desplazamientos, ${pantallas} pantallas, ~${Math.round(2 + 1.2 * toques + 3 * (pantallas - 1) + 1.5 * desplaz + 10 * escrituras)} s${errores.length ? ' · errores: ' + errores.join(' | ') : ''}`)
    await ctx.close()
  }
}
fs.writeFileSync(args.find(a => a.startsWith('--json='))?.slice(7) ?? './ultimo.json', JSON.stringify(salida, null, 1))
await b.close()
