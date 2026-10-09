import type { Libro, FilaFA } from '@/entities/libro'

export type EstadoPublicacion = 'publicable' | 'provisional' | 'bloqueado'

/** El factor de un mes contra su banda, dicho con los motivos del libro (su
 *  código, nunca su frase). Sin °API la banda no se puede verificar: el mes no
 *  está «fuera» (el factor puede estar bien), y su motivo es otro. `dentro`
 *  sola no lo distingue: vale `false` en los dos casos. */
export function estadoFactor(lb: Pick<Libro, 'motivos'>, f: FilaFA): 'dentro' | 'fuera' | 'sin-verificar' {
  if (lb.motivos.some(m => m.codigo === 'banda-sin-verificar' && m.campoId === f.campoId)) return 'sin-verificar'
  return f.dentro ? 'dentro' : 'fuera'
}

/** ¿Se puede publicar el libro de un campo? Con los motivos del libro de ese
 *  campo, todos menos `en-curso` (el mes que corre no es una anomalía): la
 *  misma regla del sello, no una propia de la pantalla. */
export const campoPublicable = (lb: Pick<Libro, 'motivos'>, campoId: string) =>
  !lb.motivos.some(m => m.campoId === campoId && m.codigo !== 'en-curso')

/** Si el libro del período se puede publicar, dicho igual en todas las
 *  pantallas. El mes en curso no se publica todavía, pero eso no es una
 *  anomalía: va en neutro (ISA-101). Solo lo que de verdad impide publicar
 *  (factor fuera de banda, demasiado sin identificar) lleva su marca. */
export function publicacion(lb: Libro): { estado: EstadoPublicacion; texto: string } {
  if (lb.publicable) return { estado: 'publicable', texto: 'Cuadra con la medición oficial y tiene su cadena de custodia: se puede publicar.' }
  // Se compara el código del motivo, nunca su frase: el texto lo redacta el servidor.
  const otros = lb.motivos.filter(m => m.codigo !== 'en-curso')
  if (!otros.length) return { estado: 'provisional', texto: 'Provisional: el mes está en curso y se publica cuando cierre.' }
  // Cada motivo empieza por el nombre del campo: va tal cual (es nombre propio).
  return { estado: 'bloqueado', texto: `Todavía no se puede publicar. ${otros.map(m => m.texto).join(' ')}` }
}
