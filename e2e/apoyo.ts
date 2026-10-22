/* Lo que comparten los flujos de punta a punta: una página con la
   introducción de cada rol ya vista y las mismas acciones que haría quien la
   usa (escribir, escoger, hacer clic, cambiar de pantalla).

   Las acciones son de Playwright de verdad: un clic espera a que el botón se
   vea y reciba el puntero, y escribir pasa por los eventos del teclado. Antes
   se llamaba `.click()` y se asignaba `value` desde el DOM, que pasa aunque el
   botón esté tapado por otro o fuera de la pantalla. */
import { expect, test as base, type ElementHandle, type Page } from '@playwright/test'

/** Los roles de src/entities/roles.ts: con su introducción marcada como vista,
 *  la pantalla que se prueba no queda detrás de ella. */
const ROLES = ['ger', 'prod', 'sup', 'oper', 'jefe', 'conf', 'tec', 'reg', 'adm']

export class Flujo {
  /** Las excepciones sin atrapar de la página (las que antes se oían por
   *  Runtime.exceptionThrown): cada flujo termina comprobando que no hubo. */
  readonly errores: string[] = []
  /** Comprobaciones hechas y falladas, para el resumen «n de n bien». */
  n = 0
  fallos = 0

  readonly page: Page

  constructor(page: Page) {
    this.page = page
    page.on('pageerror', e => this.errores.push(e.message.split('\n')[0] ?? e.message))
  }

  /** Una comprobación del flujo. Es blanda: si falla, el flujo sigue y al
   *  final se ven todas las que fallaron, no solo la primera. */
  ok(cumple: boolean, mensaje: string) {
    this.n++
    if (!cumple) this.fallos++
    expect.soft(cumple, mensaje).toBe(true)
  }

  /** Cierra el flujo: la comprobación de errores de la página que llevaba
   *  cada flujo al final, y el resumen como anotación del informe. */
  cerrar() {
    this.ok(this.errores.length === 0, `sin errores de la página${this.errores.length ? ': ' + this.errores.join(' | ') : ''}`)
    test.info().annotations.push({ type: 'comprobaciones', description: `${this.n - this.fallos} de ${this.n} bien` })
  }

  esperar(ms: number) { return this.page.waitForTimeout(ms) }

  /** Abre la aplicación en una ruta y espera a que la pantalla tenga
   *  contenido (las pantallas se cargan al abrirse) y a que la red se calme. */
  async abrir(ruta: string) {
    await this.page.goto(ruta)
    await this.page.waitForFunction(() => (document.querySelector('main')?.innerText ?? '').length > 80)
    await this.page.waitForLoadState('networkidle')
    await this.cargada()
  }

  /** Cambia de pantalla como lo hace el menú: por el hash. */
  async ir(hash: string) {
    await this.page.evaluate(h => { location.hash = h }, hash)
    await this.esperar(900)
    await this.cargada()
  }

  /** Espera a que no quede nada «Cargando…» (App.tsx, `data-cargando`): la
   *  primera visita a una pantalla trae su código aparte, y en Safari y
   *  Firefox con el servidor de desarrollo tarda más que los 900 ms fijos.
   *  Si a los 15 s sigue cargando, el flujo lo registra como falla y sigue. */
  private async cargada() {
    const listo = await this.aparece(() => !document.querySelector('[data-cargando]'), '', 15_000)
    this.ok(listo, `la pantalla terminó de cargar (${await this.hash()})`)
  }

  hash() { return this.page.evaluate(() => location.hash) }

  /** El texto de la pantalla (sin la cabecera ni el menú). */
  texto() { return this.page.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText) }

  /** El texto de toda la página: los paneles que se abren encima viven fuera de <main>. */
  textoPagina() { return this.page.evaluate(() => document.body.innerText) }

  /** Espera (5 s si no se dice otra cosa) a que algo aparezca en la página. Devuelve false si no
   *  aparece (quien llama lo comprueba con ok()); cualquier otro error sube. */
  private async aparece(fn: (x: string) => boolean, x: string, timeout = 5_000) {
    try { await this.page.waitForFunction(fn, x, { timeout }); return true }
    catch (e) { if (e instanceof Error && e.name === 'TimeoutError') return false; throw e }
  }

  /** Espera hasta que la pantalla diga algo; si no llega a decirlo, el flujo falla aquí. */
  async esperarTexto(t: string) {
    await this.page.waitForFunction(x => (document.querySelector('main')?.innerText ?? document.body.innerText).includes(x), t)
  }

  /** Escribe en un campo o escoge en una lista, como lo haría quien la usa.
   *  Devuelve false si el selector no encuentra nada. */
  async escribir(selector: string, valor: string | number) {
    const campo = this.page.locator(selector).first()
    if (await campo.count() === 0) return false
    if (await campo.evaluate(e => e.tagName === 'SELECT')) await campo.selectOption(String(valor))
    else await campo.fill(String(valor))
    return true
  }

  /** Escoge un valor en una lista hallada con una función sobre la página. */
  async escoger(lista: ElementHandle<HTMLSelectElement> | null, valor: string) {
    if (!lista) return false
    await lista.selectOption(valor)
    return true
  }

  /** La primera lista (select) que tiene la opción `opcion`, que vale `valor`
   *  o que no pasa de `maxOpciones` opciones (lo que se pida, a la vez). */
  async lista(criterio: { opcion?: string; valor?: string; maxOpciones?: number }) {
    const h = await this.page.evaluateHandle(c => [...document.querySelectorAll('select')].find(s =>
      (c.opcion === undefined || [...s.options].some(o => o.value === c.opcion))
      && (c.valor === undefined || s.value === c.valor)
      && (c.maxOpciones === undefined || s.options.length <= c.maxOpciones)) ?? null, criterio)
    return h.asElement() as ElementHandle<HTMLSelectElement> | null
  }

  /** Hace clic en el botón cuyo texto empieza por `t` o cuya etiqueta
   *  accesible es `t`. Si hay varios, el primero que se ve (en el teléfono y
   *  en el escritorio la misma acción puede estar dos veces, una oculta).
   *  Devuelve false si no hay ninguno; un botón deshabilitado no se pulsa,
   *  igual que no lo pulsaría la persona. */
  async clic(t: string) {
    // La pantalla puede estar todavía dibujándose (o cargando su archivo): se
    // espera a que el botón exista, en vez de darlo por ausente al primer vistazo.
    if (!await this.aparece(x => [...document.querySelectorAll('button')].some(b => b.textContent.trim().startsWith(x) || b.getAttribute('aria-label') === x), t)) return false
    const h = await this.page.evaluateHandle(x => {
      const todos = [...document.querySelectorAll('button')].filter(b => b.textContent.trim().startsWith(x) || b.getAttribute('aria-label') === x)
      return todos.find(b => b.checkVisibility()) ?? todos[0] ?? null
    }, t)
    const boton = h.asElement() as ElementHandle<HTMLButtonElement> | null
    if (!boton) return false
    if (await boton.evaluate(b => b.disabled)) return true
    await boton.click()
    return true
  }

  /** Hace clic en el primer botón que contenga `t` en su texto. */
  async clicQueContenga(t: string) {
    if (!await this.aparece(x => [...document.querySelectorAll('button')].some(b => b.textContent.includes(x)), t)) return false
    const h = await this.page.evaluateHandle(x => [...document.querySelectorAll('button')].find(b => b.textContent.includes(x)) ?? null, t)
    const boton = h.asElement() as ElementHandle<HTMLButtonElement> | null
    if (!boton) return false
    await boton.click()
    return true
  }

  /** Marca o desmarca la casilla de la etiqueta que empieza por `t`, con un
   *  clic sobre ella. Devuelve false si no hay esa casilla; si está cerrada
   *  (deshabilitada) no cambia, igual que para la persona. */
  async marcar(t: string) {
    const h = await this.page.evaluateHandle(x => {
      const l = [...document.querySelectorAll('label')].find(e => e.textContent.trim().startsWith(x))
      return l?.querySelector('input[type=checkbox]') ?? null
    }, t)
    const casilla = h.asElement() as ElementHandle<HTMLInputElement> | null
    if (!casilla) return false
    if (await casilla.evaluate(i => i.disabled)) return true
    await casilla.click()
    return true
  }

  /** Envía el formulario que contiene el elemento, sin pasar por un botón
   *  (como «Intro» en un campo). */
  async enviar(elemento: ElementHandle<Element> | null) {
    if (!elemento) throw new Error('no hay elemento cuyo formulario enviar')
    await elemento.evaluate(e => {
      const f = e.closest('form')
      if (!f) throw new Error('el elemento no está en un formulario')
      f.requestSubmit()
    })
  }
}

/** `test` con un `flujo` listo: contexto nuevo (nada queda de otra prueba) y
 *  la introducción de cada rol ya vista. */
export const test = base.extend<{ flujo: Flujo }>({
  flujo: async ({ page }, usar) => {
    await page.addInitScript(roles => { for (const r of roles) localStorage.setItem(`trim.intro.${r}`, '1') }, ROLES)
    await usar(new Flujo(page))
  },
})
