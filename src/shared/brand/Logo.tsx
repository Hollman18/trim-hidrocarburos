/** Wordmark oficial de Trim. Dos variantes según el tema; el isotipo
 *  solo cuando el riel está colapsado. */
export const Wordmark = ({ className = 'h-5' }: { className?: string }) => (
  <>
    <img src="/brand/logo_trim_dark.png" alt="Trim" className={`${className} w-auto dark-hide`} />
    <img src="/brand/logo_trim_light.png" alt="Trim" className={`${className} w-auto dark-show`} />
  </>
)

/** El wordmark en blanco, sobre el índigo del panel y de la banda del
 *  teléfono (X5 §4): el mismo en los dos temas, porque el índigo no cambia. */
export const WordmarkBlanco = ({ className = 'h-5' }: { className?: string }) => (
  <img src="/brand/logo_trim_light.png" alt="Trim" className={`${className} w-auto`} />
)

export const Isotipo = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <img src="/brand/logo_256.png" alt="" className={className} />
)

/** El ícono de «La planta viva»: un tubo que se angosta (X5 §4.1, `marcas.js`).
 *  Propio, con el trazo de los de lucide (24 × 24, 1,75) para que vaya junto a ellos. */
export const IconoPlanta = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden className={className}>
    <path d="M2 8h6c1.5 0 2 2.5 3.5 2.5h1C14 10.5 14.5 8 16 8h6" />
    <path d="M2 16h6c1.5 0 2-2.5 3.5-2.5h1c1.5 0 2 2.5 3.5 2.5h6" />
  </svg>
)
