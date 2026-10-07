import type { Libro } from '@/entities/libro'

export type EstadoPublicacion = 'publicable' | 'provisional' | 'bloqueado'

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
