/** Wordmark oficial de Trim. Dos variantes según el tema; el isotipo
 *  solo cuando el riel está colapsado. */
export const Wordmark = ({ className = 'h-5' }: { className?: string }) => (
  <>
    <img src="/brand/logo_trim_dark.png" alt="Trim" className={`${className} w-auto dark-hide`} />
    <img src="/brand/logo_trim_light.png" alt="Trim" className={`${className} w-auto dark-show`} />
  </>
)
export const Isotipo = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <img src="/brand/logo_256.png" alt="" className={className} />
)
