import type { EntregaTurno, Frase } from '@/shared/api/hoy'
import { HojaInferior } from '@/shared/ui/HojaInferior'
import { Boton } from '@/shared/ui/primitivas'
import { useExportar } from '@/widgets/informe/useExportar'
import { Texto } from './comun'

/** Un bloque de la entrega: su título y un renglón por cosa. Vacío, lo dice. */
function Bloque({ titulo, filas, vacio }: { titulo: string; filas: readonly Frase[]; vacio: string }) {
  return (
    <section className="border-t border-[var(--linea2)] pt-3 first:border-t-0 first:pt-0" data-sin-partir>
      <h3 className="text-[16px] font-semibold">{titulo}</h3>
      {filas.length
        ? <ul className="mt-1.5 grid gap-1 text-[15px] leading-snug text-[var(--tinta2)]">{filas.map((f, i) => <li key={i}><Texto f={f} /></li>)}</ul>
        : <p className="mt-1 text-[15px] text-[var(--tinta2)]">{vacio}</p>}
    </section>
  )
}

/** F1 · P-06 · «Entregar turno» (X4 §5.5; imagen 3a): el resumen que el supervisor
 *  le deja al turno que entra —lo que paró, lo que queda por hacer y lo hecho hoy—, armado por el motor (`entregaDelTurno`), y
 *  «Compartir en PDF» con el membrete, el folio y la huella de siempre. En el
 *  escritorio va en su lugar, arriba de las tarjetas; en el teléfono, como una hoja
 *  que sube. La firma de la entrega espera su contrato (una escritura que todavía no
 *  existe): hasta entonces se dice, sin fingirla. */
export function Entrega({ e, onCerrar }: { e: EntregaTurno; onCerrar: () => void }) {
  const x = useExportar()
  return (
    <HojaInferior titulo="Entrega de turno" onCerrar={onCerrar}>
      <section data-entrega aria-label={e.titulo} className="grid gap-3.5 rounded-[20px] bg-[var(--panel)] px-5 py-4 sm:px-7 sm:py-5">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[19px] font-semibold">{e.titulo}</h2>
          <span className="text-[14px] text-[var(--tinta2)]">últimas {e.horas} h</span>
        </header>
        <Bloque titulo="Lo que paró" filas={e.paro} vacio="Nada parado en el turno." />
        <Bloque titulo="Lo que queda por hacer" filas={e.pendiente} vacio="Nada pendiente." />
        <Bloque titulo="Hecho hoy" filas={e.hecho} vacio="Nada confirmado ni contestado todavía." />
        {e.diferido && <p className="text-[15px] text-[var(--tinta2)]"><Texto f={e.diferido} /></p>}
        <p className="text-[14px] text-[var(--tinta2)]">La entrega todavía no se firma en TRIM: se comparte en PDF, con su folio.</p>
        <div className="no-imprimir flex flex-wrap items-center gap-3">
          {x.puede && <Boton variante="principal" disabled={x.ocupado} onClick={() => x.pdf()}>Compartir en PDF</Boton>}
          <Boton onClick={onCerrar}>Cerrar</Boton>
          {x.aviso && <p role="alert" className="basis-full text-[15px] text-[var(--tinta)]">{x.aviso}</p>}
        </div>
      </section>
    </HojaInferior>
  )
}
