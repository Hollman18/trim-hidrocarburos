import { Download, FileText, Table } from 'lucide-react'
import { huellaLegible } from '@/entities/informe'
import { useDesplegable } from '@/shared/ui/foco'
import { Info } from '@/shared/ui/Info'
import { useExportar } from './useExportar'

/* La lógica de exportar vive en `useExportar.ts` (`useExportar`): la usan este
   botón, la ficha del equipo y «Compartir el informe» de La planta viva. */


/** Exportar lo que se está viendo: en PDF (la pantalla con membrete, fecha y
 *  folio, por la ventana de imprimir del navegador) o los eventos del período
 *  en CSV. Cada exportación queda registrada con su folio y la huella de sus
 *  cifras: es lo que la vuelve respaldo documental. */
export function Exportar() {
  const x = useExportar()
  const { abierto, setAbierto, contenedor, id, propsBoton } = useDesplegable()
  if (!x.puede) return null
  const cerrar = () => setAbierto(false)

  return (
    <div ref={contenedor} className="no-imprimir relative max-lg:static">
      {/* Al abrir se borra el aviso anterior: uno viejo («nadie con acceso…») ya no dice la verdad. */}
      <button {...propsBoton} onClick={() => { x.setAviso(null); setAbierto(v => !v) }} aria-label="Exportar" title="Exportar: informe en PDF o datos en CSV"
        className="inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-[var(--panel)] px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1px_var(--linea)] hover:bg-[var(--panel2)]">
        <Download aria-hidden className="size-4 text-[var(--tinta2)]" /><span className="hidden sm:inline">Exportar</span>
      </button>
      {abierto && (
        <div id={id} role="group" aria-label={`Exportar ${x.titulo}`} className="absolute right-0 top-[calc(100%+6px)] z-[90] w-[310px] max-w-[calc(100vw-24px)] rounded-[16px] bg-[var(--elevado)] p-1.5 shadow-[var(--sombra-flota)] max-lg:left-0 max-lg:right-auto">
          <p className="font-cond px-2 pb-1 pt-1.5 text-[12px] font-semibold tracking-[.11em] text-[var(--tinta3)]">EXPORTAR · {x.titulo.toUpperCase()}</p>
          <button disabled={x.ocupado} onClick={() => x.pdf(cerrar)}
            className="flex w-full cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-left text-[14px] hover:bg-[var(--panel2)] disabled:opacity-60">
            <FileText className="mt-0.5 size-3.5 shrink-0 opacity-70" />
            <span>Informe en PDF<span className="block text-[12px] text-[var(--tinta3)]">Con membrete y folio; al imprimir, «Guardar como PDF»</span></span>
          </button>
          <button disabled={x.ocupado} onClick={() => x.csv(cerrar)}
            className="flex w-full cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-left text-[14px] hover:bg-[var(--panel2)] disabled:opacity-60">
            <Table className="mt-0.5 size-3.5 shrink-0 opacity-70" />
            <span>Datos en CSV<span className="block text-[12px] text-[var(--tinta3)]">Eventos del período, con causa y barriles</span></span>
          </button>
          {x.aviso && <p role="alert" className="border-t border-[var(--linea2)] px-2 py-1.5 text-[13px] text-[var(--tinta)]">{x.aviso}</p>}
          {/* Por qué sirve de respaldo: en el ⓘ. A la vista, el último folio. */}
          <p className="flex flex-wrap items-center gap-x-1.5 border-t border-[var(--linea2)] px-2 py-1.5 text-[12px] leading-relaxed text-[var(--tinta3)]">
            <span>Queda registrada con folio y huella</span>
            <Info titulo="Folio y huella" texto="Cada exportación queda registrada con su folio y la huella de sus cifras: así se puede comprobar que no se modificó." />
            {x.ultimo && <span className="basis-full">Último: <b className="text-[var(--tinta2)]">{x.ultimo.folio}</b> · {huellaLegible(x.ultimo.huella).slice(0, 14)}…</span>}
          </p>
        </div>
      )}
    </div>
  )
}

/** La ficha de un equipo se exporta desde su panel: mientras está abierto,
 *  el panel tapa la cabecera y lo de atrás queda inerte. Es el mismo informe
 *  con folio; el papel lleva la ficha en vez de la pantalla. */
export function ExportarFicha() {
  const x = useExportar()
  if (!x.puede) return null
  return (
    <span className="no-imprimir contents">
      <button onClick={() => x.pdf()} disabled={x.ocupado} aria-label="Exportar la ficha en PDF" title="Exportar la ficha: informe en PDF con membrete, fecha y folio"
        className="cursor-pointer rounded border border-[var(--linea)] bg-[var(--panel)] p-1.5 hover:bg-[var(--elevado)] disabled:opacity-60">
        <Download className="size-3.5" />
      </button>
      {x.aviso && <p role="alert" className="basis-full text-[13px] text-[var(--tinta)]">{x.aviso}</p>}
    </span>
  )
}
