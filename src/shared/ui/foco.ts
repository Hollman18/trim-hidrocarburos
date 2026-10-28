import { useCallback, useEffect, useId, useRef, useState } from 'react'

/** Manejo del foco para los diálogos y los desplegables. Quien navega con
 *  teclado o con lector de pantalla tiene que poder entrar, moverse adentro
 *  y salir sin perderse (WCAG 2.4.3 y 2.4.11): el foco no se queda detrás de
 *  un panel que tapa la pantalla, ni cae en <body> al cerrar. */

const ENFOCABLES = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Lo que se marca `inert`: todo lo que no es el diálogo. Se sube del
 *  diálogo al <body> y se marcan los hermanos de cada nivel; así ni el ratón,
 *  ni el teclado, ni el lector llegan a lo que está detrás. Devuelve cómo
 *  deshacerlo. Solo hay un aislamiento a la vez (el del diálogo de arriba de
 *  la pila), así que no hace falta contar quién pidió qué. */
function aislar(dialogo: HTMLElement): () => void {
  const tocados: Element[] = []
  for (let nodo: HTMLElement | null = dialogo; nodo && nodo !== document.body; nodo = nodo.parentElement) {
    const padre: HTMLElement | null = nodo.parentElement
    if (!padre) break
    for (const hermano of Array.from<Element>(padre.children)) {
      // Inerte por otra razón: no es nuestro y no se toca al soltar. El velo del
      // diálogo (`data-velo`) tampoco: tocarlo es la forma de cerrar con el dedo
      // (X5 §4.2, UI-02); inerte, el toque caía en él sin hacer nada.
      // Lo que flota sin ser modal (las señas de la introducción, `data-flotante`) tampoco.
      if (hermano === nodo || hermano.tagName === 'SCRIPT' || hermano.hasAttribute('inert') || hermano.hasAttribute('data-velo') || hermano.hasAttribute('data-flotante')) continue
      hermano.setAttribute('inert', '')
      tocados.push(hermano)
    }
  }
  return () => { for (const h of tocados) h.removeAttribute('inert') }
}

/** Los diálogos abiertos, el de más abajo primero. Dos pueden estar abiertos
 *  a la vez: la introducción de un rol nuevo sobre la ficha de un equipo que
 *  llegó en un enlace compartido. Si cada uno aislara al otro, los dos
 *  quedarían inertes y la aplicación no respondería (ni el «Cerrar» de
 *  ninguno). Por eso solo el de ARRIBA aísla al resto, y al cerrarse le
 *  devuelve el control al de abajo, que vuelve a aislar.
 *
 *  «Arriba» es el que se ve encima, no el último que se montó: la ficha se
 *  carga aparte (Suspense) y puede montarse después de la introducción
 *  aunque se dibuje debajo. Se ordena por el z-index de cada diálogo y, a
 *  igual z-index, por orden de apertura. */
type Capa = { el: HTMLElement; z: number; soltar: (() => void) | null }
const pila: Capa[] = []

const cima = (): Capa | undefined => pila.at(-1)

function apilar(el: HTMLElement): Capa {
  const z = Number.parseInt(getComputedStyle(el).zIndex, 10)
  const capa: Capa = { el, z: Number.isFinite(z) ? z : 0, soltar: null }
  const antes = cima()
  let i = pila.length
  while (i > 0 && pila[i - 1]!.z > capa.z) i--
  pila.splice(i, 0, capa)
  if (cima() === capa) {
    // El de abajo deja de aislar antes de que este aísle: si no, cada uno
    // dejaría inerte al otro.
    if (antes) { antes.soltar?.(); antes.soltar = null }
    capa.soltar = aislar(el)
  } else {
    // Entró debajo del de arriba, que lo aisló cuando este aún no existía:
    // se rehace el aislamiento para que el nuevo también quede detrás.
    const arriba = cima()!
    arriba.soltar?.()
    arriba.soltar = aislar(arriba.el)
  }
  return capa
}

/** Saca un diálogo de la pila. Si era el de arriba, el que queda arriba
 *  vuelve a aislar. Devuelve el diálogo que queda arriba, si hay. */
function desapilar(capa: Capa): Capa | undefined {
  const i = pila.indexOf(capa)
  if (i < 0) return cima()
  const eraCima = i === pila.length - 1
  pila.splice(i, 1)
  capa.soltar?.(); capa.soltar = null
  const nueva = cima()
  if (eraCima && nueva && !nueva.soltar) nueva.soltar = aislar(nueva.el)
  return nueva
}

/** Un diálogo modal: al abrir lleva el foco adentro (al contenedor, que
 *  lleva el nombre del diálogo), deja inerte lo de atrás, hace que Tab dé la
 *  vuelta adentro y al cerrar devuelve el foco a quien lo abrió (o al
 *  diálogo de abajo, si queda uno). Teclado y aislamiento son solo del
 *  diálogo de arriba: Escape cierra ese y no el de debajo.
 *
 *  `alEscape` es opcional (la ficha del equipo primero cierra la cadena del
 *  dato). `contenido` es lo que, al cambiar, reemplaza lo de adentro sin
 *  cerrar el diálogo (la ficha pasa de un pozo a su bomba con «Ver P-201B»):
 *  el botón que tenía el foco desaparece y el foco caería en <body>; se
 *  lleva al contenedor, cuyo nombre es el del nuevo contenido.
 *
 *  Devuelve una ref de función: el diálogo puede montarse después que el
 *  componente (tras una carga) o desmontarse sin que el componente se vaya,
 *  y la pila tiene que enterarse de las dos cosas. El contenedor necesita
 *  `tabIndex={-1}`. */
export function useModal<T extends HTMLElement>(alEscape?: () => void, contenido?: unknown) {
  const [el, setEl] = useState<T | null>(null)
  const escape = useRef(alEscape)
  useEffect(() => { escape.current = alEscape }, [alEscape])

  useEffect(() => {
    if (!el) return
    // Un tramo de la tubería es un <g> (SVGElement): también recibe el foco de vuelta (A4).
    const antes = document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement ? document.activeElement : null
    const capa = apilar(el)
    if (cima() === capa && !el.contains(document.activeElement)) el.focus()

    // En el documento y no en el diálogo: si el foco cayó en <body> (un
    // botón que desapareció), Escape y Tab tienen que seguir sirviendo.
    const tecla = (e: KeyboardEvent) => {
      if (cima() !== capa || e.defaultPrevented) return
      if (e.key === 'Escape' && escape.current) { e.preventDefault(); escape.current(); return }
      if (e.key !== 'Tab') return
      // Solo lo que se ve: un botón dentro de algo plegado no cuenta.
      const lista = Array.from(el.querySelectorAll<HTMLElement>(ENFOCABLES)).filter(x => x.getClientRects().length > 0)
      const primero = lista[0], ultimo = lista.at(-1)
      if (!primero || !ultimo) { e.preventDefault(); el.focus(); return }
      const actual = document.activeElement
      if (!el.contains(actual)) { e.preventDefault(); (e.shiftKey ? ultimo : primero).focus() }
      else if (e.shiftKey && (actual === primero || actual === el)) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && actual === ultimo) { e.preventDefault(); primero.focus() }
    }
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('keydown', tecla)
      const eraCima = cima() === capa
      const queda = desapilar(capa)
      // Un diálogo que se cierra debajo de otro no mueve el foco: lo tiene el de arriba.
      if (!eraCima) return
      // Se devuelve el foco a quien abrió si sigue en la página y se puede
      // usar (no quedó detrás del diálogo que sigue abierto); si no, al
      // diálogo que queda.
      if (antes && antes !== document.body && antes.isConnected && !antes.closest('[inert]')) antes.focus()
      else if (queda && !queda.el.contains(document.activeElement)) queda.el.focus()
    }
  }, [el])

  // Lo de adentro cambió sin cerrar: si el foco se perdió, vuelve al diálogo.
  useEffect(() => {
    if (el && cima()?.el === el && !el.contains(document.activeElement)) el.focus()
  }, [el, contenido])

  return setEl
}

/** Un desplegable (período, exportar, perfil, campo): un botón con
 *  `aria-expanded` que muestra un panel. No es un `role="menu"`: adentro hay
 *  fechas, textos y avisos, y un menú ARIA promete flechas y solo ítems.
 *  Cierra con Escape (y el foco vuelve al botón) y con un clic afuera.
 *
 *  `panel` es para el panel que se pinta fuera del contenedor (`Desplegado`, en un portal: los
 *  menús del panel lateral, D1): un clic adentro de él tampoco es «afuera». */
export function useDesplegable() {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node
      if (!contenedor.current?.contains(t) && !panel.current?.contains(t)) setAbierto(false)
    }
    // En captura y marcado como atendido: dentro de un diálogo (exportar la
    // ficha), Escape cierra el desplegable y no también el diálogo.
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      setAbierto(false)
      boton.current?.focus()
    }
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', esc, true)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc, true) }
  }, [abierto])

  const alternar = useCallback(() => setAbierto(v => !v), [])
  /** Lo que lleva el botón que abre: el estado y a qué panel controla. */
  // `aria-controls` solo mientras el panel existe (A10): apuntar a un id que no está no sirve al lector.
  const propsBoton = { ref: boton, onClick: alternar, 'aria-expanded': abierto, 'aria-controls': abierto ? id : undefined }
  return { abierto, setAbierto, contenedor, boton, panel, id, propsBoton }
}
