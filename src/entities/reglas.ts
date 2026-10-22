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
 *  parada sin parte (o con «otro» modo, o con «0» en WhatsApp) y la
 *  descripción de un aviso a SAP. Una frase corta, no «ok». */
export const TEXTO_LIBRE_MINIMO = 8

/** Tope de sentido común para una cifra en bbl/d (o KPC/d): lo que lo pase es
 *  un error de dedo. Lo usan las metas, los respaldos y las capacidades. */
export const TOPE_BPD = 10_000_000

/** ¿Alcanza el texto (sin los espacios de los bordes)? */
export const alcanza = (texto: string | undefined, minimo: number) => (texto ?? '').trim().length >= minimo
