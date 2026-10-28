import type { PedazoRotulo } from '@/shared/api/plantaViva'

/* Lo que comparten los textos de La planta viva (X5 §5.3). K3: los dibujos a mano que vivían aquí
   (la marca dentro de un SVG, el rayado, la roca, el texto en SVG y el «›» dibujado) se borraron: los
   dibujos son del kit SCADA (`shared/ui/scada`) y el «›» es el ícono de lucide. */

/** Un rótulo en partes: el texto y, en negrita y tinta, la cifra (HTML). */
export function Partes({ partes }: { partes: PedazoRotulo[] }) {
  return <>{partes.map((p, i) => (typeof p === 'string' ? <span key={i}>{p}</span> : <b key={i} className="font-bold text-[var(--tinta)]">{p.b}</b>))}</>
}
