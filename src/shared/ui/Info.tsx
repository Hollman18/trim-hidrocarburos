import { Info as IconoInfo } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Tip, type Fila } from './Tip'

/** ⓘ: lo que explica una cifra (de dónde sale, cómo se calcula, su salvedad)
 *  queda a un toque y no escrito en la pantalla. El ícono se ve siempre: una
 *  salvedad se esconde detrás de él, nunca se borra. En el papel sale escrita,
 *  porque el informe es la pantalla impresa y los globos no se imprimen.
 *
 *  Gris siempre: no es una alarma (ISA-101). Nunca va dentro de un <button>
 *  (sería un control dentro de otro) ni de un título (el lector oiría la frase
 *  entera como nombre del título). Quien lo contiene en una fila flexible le da
 *  `flex-wrap`: en el papel la nota ocupa su propio renglón (`basis-full`). */
export function Info({ titulo, texto, textoEnPapel, filas, rotulo, className, imprimir = true }: {
  /** Título del globo: «Cierre proyectado». */
  titulo: string
  /** La frase completa que salió de la pantalla. */
  texto: string
  /** Lo que va en el papel en lugar del texto, cuando el texto es lo que una persona
   *  escribió con sus palabras: en el papel va quién, por su rol (D2). */
  textoEnPapel?: string
  /** Cifras de apoyo: solo las que la pantalla ya calcula. */
  filas?: Fila[]
  /** Texto visible antes del ícono, dos palabras como mucho («qué hacer»). Sin él, solo el ícono. */
  rotulo?: string
  className?: string
  /** false: la nota no se imprime aquí porque quien la contiene la escribe UNA vez al final
   *  (un ⓘ que se repite en cada rama, o uno en una cabecera angosta; B-10). */
  imprimir?: boolean
}) {
  return (
    <>
      <Tip as="span" role="img" aria-label={`${titulo}: ${texto}`} titulo={titulo} filas={filas ?? []} pista={texto}
        // En el teléfono, 24 px a la vista y 44 de blanco de toque (`toque`, A5); en la pantalla grande, del tamaño del ícono.
        className={cn('toque no-imprimir inline-flex min-h-6 min-w-6 cursor-help items-center justify-center gap-0.5 align-[-2px] sm:min-h-0 sm:min-w-0', className)}>
        {rotulo && <span className="text-[13px] text-[var(--tinta2)] underline decoration-dotted underline-offset-2">{rotulo}</span>}
        <IconoInfo className="size-3 text-[var(--tinta3)]" aria-hidden />
      </Tip>
      {imprimir && <small className="solo-impresion basis-full font-sans text-[9pt] font-normal normal-case tracking-normal text-[var(--tinta2)]">{titulo}: {textoEnPapel ?? texto}</small>}
    </>
  )
}
