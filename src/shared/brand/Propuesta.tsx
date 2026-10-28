import { useContext } from 'react'
import { ComoSeLee } from '@/shared/ui/comoSeLee'

/* LA PROPUESTA DE VALOR (el dueño, 28-oct): una frase corta que se entienda en la industria, y una segunda línea
 * con lo que la hace verdad. La misma frase va en la presentación de venta y en el documento técnico
 * (docs/backend/01-propuesta-de-valor.md): si se cambia, se cambia en los tres. */
export const PROPUESTA = 'Anticipamos la falla de sus equipos críticos para que produzca más, con inteligencia artificial.'
export const PROPUESTA_DETALLE = 'Electrosumergibles, multifásicas y bombas de reinyección, conectadas a sus variables: entendemos por qué se difiere y se pierde cada barril.'

/** Arriba de cada pantalla, solo con «¿Cómo se lee?» encendido: quien pide la explicación ve primero para qué sirve
 *  TRIM. Apagado, nada: la pantalla de trabajo no suma texto. */
export function PropuestaDeValor() {
  const activo = useContext(ComoSeLee)
  if (!activo) return null
  return (
    <section aria-label="Para qué sirve TRIM" data-propuesta-valor="" className="mb-4 rounded-[10px] bg-[var(--acento-suave)] px-4 py-3 sm:px-6">
      <p className="text-[17px] font-semibold leading-snug text-[var(--tinta)]">{PROPUESTA}</p>
      <p className="mt-0.5 text-[14px] leading-snug text-[var(--tinta2)]">{PROPUESTA_DETALLE}</p>
    </section>
  )
}
