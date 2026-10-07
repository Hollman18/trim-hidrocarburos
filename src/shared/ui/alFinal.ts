/** Ref para un contenedor que se desplaza de lado (gráficas de meses o días):
 *  al montarse muestra el final, que es lo más reciente. Es una función fija,
 *  así React la llama solo al montar y no le pelea el desplazamiento a quien
 *  lo mueva después. */
export const alFinal = (el: HTMLElement | null) => {
  if (el) el.scrollLeft = el.scrollWidth
}

/** Atributos para un contenedor que se desplaza de lado y no tiene nada
 *  enfocable adentro (una tabla, una gráfica sin puntos): en el teléfono,
 *  quien usa teclado no podría ver lo que queda cortado (WCAG 2.1.1). Con
 *  tabIndex entra el foco y las flechas lo desplazan; el nombre dice qué es. */
export const desplazable = (etiqueta: string) => ({ tabIndex: 0, role: 'region', 'aria-label': `${etiqueta} (se desplaza de lado)` }) as const
