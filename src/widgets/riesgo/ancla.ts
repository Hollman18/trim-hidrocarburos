/** El ancla de «Qué está en riesgo» dentro de Equipos (K1 · P-10): el enlace de la lista lleva aquí. */
export const ID_EN_RIESGO = 'en-riesgo'

/** Salta a una parte de la misma vista y le pasa el foco. Se desplaza solo la vista (`.vista`), no la página:
 *  con `scrollIntoView` el teléfono también corría la página entera y la banda del ☰ quedaba fuera de la
 *  pantalla. A18: con «reducir movimiento», salta sin animar (X2 M1; WCAG 2.3.3). */
export function irAlAncla(id: string) {
  const quieto = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const e = document.getElementById(id)
  if (!e) return
  const behavior: ScrollBehavior = quieto ? 'auto' : 'smooth'
  const vista = e.closest<HTMLElement>('.vista')
  // El margen de arriba es el `scroll-mt-4` de la parte (16 px).
  if (vista) vista.scrollTo({ top: vista.scrollTop + e.getBoundingClientRect().top - vista.getBoundingClientRect().top - 16, behavior })
  else e.scrollIntoView({ behavior, block: 'start' })
  e.focus({ preventScroll: true })
}
