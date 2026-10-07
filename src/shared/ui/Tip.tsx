import { useId, useState, type ReactNode, type ElementType } from 'react'
import { createPortal } from 'react-dom'

export type Fila = [string, string]

/** Metadata al pasar el cursor o al llegar con el teclado: la información
 *  al pasar el cursor tiene que ser alcanzable sin ratón (WCAG 2.1.1 y
 *  1.4.13). Por eso el disparador recibe el foco, el tooltip queda enlazado
 *  con aria-describedby mientras se ve y Escape lo cierra.
 *
 *  La excepción es `aLaVista`: lo que dice el tooltip ya se lee en la
 *  pantalla sin él (una tubería del dibujo: de dónde viene y a dónde va lo
 *  dibuja la línea, el caudal lo rotula la corriente y el «sin flujo» va
 *  escrito). Entonces, si además no hace nada al tocarlo, no es una parada
 *  de Tab: treinta paradas que no dicen nada nuevo solo alargan el camino
 *  para pasar el dibujo. El lector lo sigue leyendo (rol y nombre quedan).
 *
 *  Dentro de un dibujo (`as="g"`), el <g> no tiene nombre propio: se le da
 *  uno con el título y las cifras, y el rol de botón si hace algo (si no,
 *  de imagen). El <svg> que los contiene va como `role="group"`, no «img»:
 *  una imagen vuelve mudo todo lo que tiene adentro. */
export function Tip({ titulo, filas, pista, children, as, tabIndex, aLaVista = false, onTecla, ...rest }: {
  titulo: string; filas: Fila[]; pista?: string; children: ReactNode
  as?: ElementType; className?: string; onClick?: () => void
  /** Rol y nombre para el lector cuando la etiqueta no los da sola (un <g> clicable de un dibujo). */
  role?: string; 'aria-label'?: string
  /** En una serie larga (un año de días) no puede ser una parada de Tab por
   *  punto: quien la usa lleva un índice móvil (`tabIndex` 0 en uno, −1 en los
   *  demás) y mueve el foco con las flechas en `onTecla`. */
  tabIndex?: number; onTecla?: (e: React.KeyboardEvent) => void
  /** Todo lo del tooltip ya está a la vista: sin `onClick`, no recibe el foco. */
  aLaVista?: boolean
  /** Atributos de datos: sirven para apuntar al elemento desde las pruebas. */
  [dato: `data-${string}`]: unknown
}) {
  const Tag = (as ?? 'div') as ElementType
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const id = useId()
  const dibujo = as === 'g'
  const resumen = [titulo, ...filas.map(([k, v]) => `${k}: ${v}`)].join('; ')

  return (
    <>
      <Tag {...rest}
        role={rest.role ?? (dibujo ? (rest.onClick ? 'button' : 'img') : undefined)}
        aria-label={rest['aria-label'] ?? (dibujo ? (rest.onClick && pista ? `${resumen}. ${pista}` : resumen) : undefined)}
        aria-describedby={pos ? id : undefined}
        tabIndex={tabIndex ?? (rest.onClick || !aLaVista ? 0 : undefined)}
        onMouseMove={(e: React.MouseEvent) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setPos(null)}
        onFocus={(e: React.FocusEvent) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          setPos({ x: r.left, y: r.bottom })
        }}
        onBlur={() => setPos(null)}
        onKeyDown={(e: React.KeyboardEvent) => {
          // Escape cierra el tooltip sin cerrar lo de afuera (la ficha del equipo).
          if (e.key === 'Escape' && pos) { e.stopPropagation(); setPos(null); return }
          onTecla?.(e)
          // Un <button> ya responde a Enter y Espacio por sí mismo: se repetiría el clic.
          if (as !== 'button' && rest.onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); rest.onClick() }
        }}>
        {children}
      </Tag>
      {pos && createPortal(
        <div role="tooltip" id={id}
          className="pointer-events-none fixed z-[200] max-w-[280px] rounded border border-[var(--linea)] bg-[var(--elevado)] px-3 py-2.5 text-[11.5px] leading-relaxed shadow-[var(--sombra2)]"
          style={{ left: Math.min(pos.x + 14, innerWidth - 300), top: Math.min(pos.y + 14, innerHeight - 190) }}>
          <b className="mb-1 block text-[12.5px]">{titulo}</b>
          <dl className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5">
            {filas.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[10.5px] text-[var(--tinta3)]">{k}</dt>
                <dd className="tabular m-0 text-right text-[11px]">{v}</dd>
              </div>
            ))}
          </dl>
          {pista && <p className="mt-1.5 border-t border-[var(--linea2)] pt-1.5 text-[10px] text-[var(--tinta3)]">{pista}</p>}
        </div>, document.body)}
    </>
  )
}
