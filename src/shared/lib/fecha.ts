/* Fechas con el mismo texto en todos los navegadores.

   Con el mes abreviado, Safari (WebKit) escribe «3 de sep. de 2026» y Chrome,
   Firefox y Node (el servidor) «3 de sept de 2026». El texto de una fecha no
   puede depender del navegador de quien mira: el mismo informe impreso desde
   dos navegadores diría dos cosas, y la vista previa de una firma no
   coincidiría con el registro que guarda el servidor. Aquí la abreviatura del
   mes es fija (la de Node); el resto del formato (el orden, « de », la hora)
   es igual en los tres motores y lo sigue poniendo Intl. */

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'] as const

/** Un formato de fecha es-CO, como `new Intl.DateTimeFormat('es-CO', opciones)`,
 *  que da el mismo texto en Safari, Chrome, Firefox y Node. Toda fecha con el
 *  mes abreviado pasa por aquí (verificar-libro lo revisa). */
export function formatoFecha(opciones: Intl.DateTimeFormatOptions): Pick<Intl.DateTimeFormat, 'format'> {
  const fmt = new Intl.DateTimeFormat('es-CO', opciones)
  if (opciones.month !== 'short') return fmt
  // El número del mes en la misma zona que el formato: cerca de la medianoche
  // el día, y con él el mes, cambia con la zona.
  const numero = new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: opciones.timeZone })
  return {
    format: (d?: Date | number) => fmt.formatToParts(d).map(p =>
      p.type === 'month' ? (MESES_CORTOS[Number(numero.format(d)) - 1] ?? p.value) : p.value).join(''),
  }
}
