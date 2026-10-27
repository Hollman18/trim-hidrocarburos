/** Los umbrales de lo que entra a mano: el front los usa para avisar antes de
 *  enviar y el servidor los vuelve a aplicar (sus 422 mandan). Escritos aquí,
 *  una vez, para que la pantalla, el servidor del demo (shared/api/escrituras.ts)
 *  y el contrato digan lo mismo: «motivo obligatorio» se leía como «no vacío»
 *  y un motivo «ok» habría entrado por otro cliente. */

/** Caracteres mínimos del motivo de una firma de configuración, de un cambio
 *  de acceso y de una parada del programa. */
export const MOTIVO_MINIMO = 5
/** Caracteres mínimos del nombre de una persona. */
export const NOMBRE_MINIMO = 3
/** Caracteres mínimos de un texto libre: lo que encontró quien responde una
 *  parada sin parte (o con «otro» modo) y la
 *  descripción de un aviso a SAP. Una frase corta, no «ok». */
export const TEXTO_LIBRE_MINIMO = 8
/** Caracteres máximos de lo que se escribe a mano en una parada (el motivo de
 *  una corrección o de una revisión, la nota del yacimiento): es una frase, no un
 *  documento (C-12). Un motivo de 1 MB para una cascada eran 18 MB guardados. */
export const TEXTO_MAXIMO = 500

/** Tope de sentido común para una cifra en bbl/d (o KPC/d): lo que lo pase es
 *  un error de dedo. Lo usan las metas, los respaldos y las capacidades. */
export const TOPE_BPD = 10_000_000

/** Los caracteres que no se ven en los bordes de un texto: los espacios (también
 *  el no separable y los de Unicode) y los de ancho cero. La MISMA lista que
 *  `alcanza` de esquema.sql (C-26): `\s` no es igual en JavaScript y en PostgreSQL. */
const BORDES_INVISIBLES = /^[ \t\n\r\f\v\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f\u3000\ufeff]+|[ \t\n\r\f\v\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f\u3000\ufeff]+$/g
/** Una letra (también con tilde o eñe) o un número: un motivo de solo signos no dice nada. */
const LETRA_O_NUMERO = /[0-9A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff]/

/** ¿Alcanza el texto? Sin lo que no se ve en los bordes, tiene `minimo`
 *  caracteres o más y al menos una letra o un número (C-26: cinco espacios de
 *  ancho cero eran un motivo invisible). Lo que no es texto no alcanza: un
 *  motivo que llega como número o como lista es un 422, no un error del servidor (C-11). */
export const alcanza = (texto: unknown, minimo: number): boolean => {
  if (typeof texto !== 'string') return texto === undefined || texto === null ? minimo <= 0 : false
  const t = texto.replace(BORDES_INVISIBLES, '')
  return t.length >= minimo && (minimo <= 0 || LETRA_O_NUMERO.test(t))
}
