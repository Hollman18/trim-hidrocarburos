import type { Campo, SemillaCampo, Periodo, IdPeriodo } from './tipos'
import { AHORA, calendarioDe } from './reloj'

/** El registro de campos del demo: lo que en producción entrega el servidor
 *  en `GET /api/campos`. */
const CAMPOS_DEMO: Campo[] = [
  { id: 'ceiba', nombre: 'La Ceiba', cuenca: 'Llanos', choke: 'Planta',
    nota: 'Tres bombas de agua en paralelo, sin reserva: si para una, se cierran pozos.' },
  { id: 'morichal', nombre: 'Morichal Norte', cuenca: 'Llanos', choke: 'Pozos',
    nota: 'Todos sus pozos con electrosumergible; la reinyección tiene respaldo parcial.' },
  { id: 'guacamayo', nombre: 'Guacamayo', cuenca: 'Putumayo', choke: 'Evacuación',
    nota: 'La reinyección es para recobro: el agua tiene salida alterna.' },
  { id: 'palmar', nombre: 'El Palmar', cuenca: 'Magdalena Medio', choke: 'Planta',
    nota: 'Campo chico de bombeo mecánico.' },
  { id: 'zarza', nombre: 'La Zarza', cuenca: 'Llanos', choke: 'Mercado',
    nota: 'Gas con condensado: lo limita la nominación del comprador.' },
]

/** El registro de campos de la empresa. En el demo es `CAMPOS_DEMO`; con la
 *  fuente http, el de `GET /api/campos`, que el arranque instala antes de
 *  pintar (`instalarCampos`). Por eso un cliente nuevo son filas del servidor
 *  y no código: la validación de la configuración, los permisos, la lectura
 *  del plan y los nombres leen de aquí. Se lee siempre al usarlo (nadie lo
 *  copia al cargar un módulo), así que lo instalado rige en todas partes. */
export let CAMPOS: Campo[] = CAMPOS_DEMO

/** Lo instala el arranque con la fuente http, con lo que respondió el servidor
 *  (ya revisado por el códec de `GET /api/campos`). */
export function instalarCampos(lista: Campo[]): void { CAMPOS = lista }

/** Las semillas de la configuración de arranque del DEMO. Salen de los datos
 *  de julio a septiembre de 2026: el máximo de diferido es el de esos tres
 *  meses menos 20 % (al menos 50 bbl/d), y la meta de producción, el potencial
 *  de esos meses menos ese máximo, redondeada a 50 bbl/d hacia abajo. Son
 *  configuración de arranque, no mediciones; en producción la primera versión
 *  la firma el servidor.
 *  El perfil semilla sale de lo que el registro de cada campo tiene: pozos con
 *  electrosumergible (La Ceiba, Morichal, Guacamayo), bomba de agua (todos),
 *  y tren de gas según su planta: compresor y venta en La Ceiba, Morichal y La
 *  Zarza (hay paradas del compresor en su historia), consumo propio con el
 *  excedente a tea en Guacamayo, y ninguno en El Palmar. `verificar-libro.mjs`
 *  comprueba que no se contradigan. */
export const SEMILLAS: Record<string, SemillaCampo> = {
  ceiba: { meta: { produccionBpd: 10900, diferidoMaxBpd: 800 }, perfil: { gas: 'venta', bombas: true, electrosumergibles: true }, economiaConfigurada: true },
  morichal: { meta: { produccionBpd: 16700, diferidoMaxBpd: 950 }, perfil: { gas: 'venta', bombas: true, electrosumergibles: true }, economiaConfigurada: true },
  guacamayo: { meta: { produccionBpd: 6300, diferidoMaxBpd: 450 }, perfil: { gas: 'consumo', bombas: true, electrosumergibles: true }, economiaConfigurada: true },
  palmar: { meta: { produccionBpd: 3250, diferidoMaxBpd: 50 }, perfil: { gas: 'no', bombas: true, electrosumergibles: false }, economiaConfigurada: true },
  zarza: { meta: { produccionBpd: 3050, diferidoMaxBpd: 50 }, perfil: { gas: 'venta', bombas: true, electrosumergibles: false }, economiaConfigurada: false },
}

/** El campo de un id. Un id que el registro no conoce (un campo que el
 *  servidor no trajo en `GET /api/campos`) NO se vuelve La Ceiba: sale con su
 *  propio id como nombre y marcado `desconocido`, para que la evidencia (CSV
 *  con folio, mensajes, títulos) muestre el hueco y no lo atribuya a otro
 *  campo. El valor por defecto de la interfaz (el campo con que se abre) es
 *  `CAMPOS[0]` y se pide aparte. */
export const campoPorId = (id: string): Campo =>
  CAMPOS.find(c => c.id === id) ?? {
    id, nombre: `${id} (campo sin registrar)`, cuenca: 'sin dato', desconocido: true,
    choke: 'Pozos', nota: 'Campo que el registro de campos no trae.',
  }

/** El mes en curso es parcial y hay que decirlo. Los rótulos salen del mismo
 *  calendario que los límites exactos de cada período (`rangoDePeriodo`,
 *  diferido.ts): cuando «ahora» lo dé el servidor, se mueven con él. */
const CAL = calendarioDe(AHORA)
const corto = (k: number) => CAL.nombreMes(k).slice(0, 3)
const { dia, diasDelMes, cerradosDelAnio, nombre: mesActual } = CAL.mesEnCurso
export const PERIODOS: Array<Periodo & { id: IdPeriodo }> = [
  { id: 'curso', nombre: 'Mes en curso', detalle: `${dia} de ${diasDelMes} días de ${mesActual}`, parcial: true },
  { id: 'cerrado', nombre: `${CAL.nombreMes(-1)[0]!.toUpperCase()}${CAL.nombreMes(-1).slice(1)} · cerrado`, detalle: 'mes completo, publicado', parcial: false },
  { id: 'trimestre', nombre: `Trimestre ${corto(-3)}–${corto(-1)}`, detalle: '3 meses cerrados', parcial: false },
  { id: 'ytd', nombre: 'Año a la fecha', detalle: `ene a ${corto(0)} · ${cerradosDelAnio} cerrados + ${dia} días`, parcial: true },
  { id: 'doce', nombre: 'Últimos 12 meses', detalle: `${corto(-12)}-${CAL.anio(-12)} a ${corto(-1)}-${CAL.anio(-1)}`, parcial: false },
]
/** ¿Es un período de la cabecera? La dirección lo pregunta antes de aceptarlo. */
export const esIdPeriodo = (id: string): id is IdPeriodo => PERIODOS.some(p => p.id === id)
/** El período de un id. El tipo ya dice que es uno de la cabecera: si aun así
 *  no está (un id que se coló sin pasar por `esIdPeriodo`), se dice con un
 *  error, no se muestra otro período como si fuera ese. */
export function periodoPorId(id: IdPeriodo): Periodo {
  const p = PERIODOS.find(x => x.id === id)
  if (!p) throw new Error(`«${String(id)}» no es un período de la cabecera.`)
  return p
}
