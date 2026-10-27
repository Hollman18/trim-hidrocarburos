import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { cn } from '@/shared/lib/cn'
import { PALABRA_MARCA, type MarcaKitTipo } from './tipos'

/* 5 · La marca de estado del kit (kit-scada.md §5). Las formas son las de X2 §4.2, SIN
   CAMBIOS: el kit no dibuja otras, usa el punto de entrada único (`MarcaCondicion`). Lo que
   agrega es la regla de la palabra: en listas y fichas va SIEMPRE al lado; en un esquema, si
   no hay espacio, va en el nombre accesible. Mide 14 en su cuadro, nunca menos de 12 en el
   escritorio ni de 16 en el teléfono. */

export function Marca({ tipo, palabra, soloMarca = false, tamano = 14, className }: {
  tipo: MarcaKitTipo
  /** La palabra al lado, si dice más que el nombre de la marca («Alarma · P-201B parada»). */
  palabra?: string
  /** En un esquema denso: la marca sola, y la palabra en el nombre accesible. */
  soloMarca?: boolean
  tamano?: number
  className?: string
}) {
  const texto = palabra ?? PALABRA_MARCA[tipo]
  if (soloMarca) return <MarcaCondicion c={tipo} tamano={tamano} etiqueta={texto} className={className} />
  return (
    <span data-kit-marca={tipo} className={cn('inline-flex items-center gap-1.5 text-[14px] text-[var(--tinta)]', className)}>
      <MarcaCondicion c={tipo} tamano={tamano} decorativa />
      <span>{texto}</span>
    </span>
  )
}
