import { useState } from 'react'
import { Download, FileText, Table } from 'lucide-react'
import { useApp, useAmbito, useRango, useRol, usePeriodo } from '@/app/store'
import { traerLibro } from '@/shared/api/diferidos'
import { csvDeLibro, formaCanonica, huellaLegible, type Informe } from '@/entities/informe'
import { PANTALLAS } from '@/app/pantallas'
import { campoPorId } from '@/entities/campos'
import { fechaHoraLarga, AHORA } from '@/entities/reloj'
import { NOTA_DE_CALCULO } from '@/widgets/diferidos/Rango'
import { publicacion } from '@/widgets/diferidos/publicacion'
import { useDesplegable } from '@/shared/ui/foco'
import { Info } from '@/shared/ui/Info'
import { useVersiones, useCtx, useInformes } from '@/shared/api/sesion'
import { periodoDelInforme } from './periodo'

/** La lógica de exportar, aparte de dónde está el botón: el menú de la
 *  cabecera exporta la pantalla y la ficha de un equipo se exporta desde su
 *  propio panel, porque el panel tapa la cabecera mientras está abierto. */
function useExportar() {
  const rol = useRol(); const ambito = useAmbito(); const rango = useRango(); const parcial = usePeriodo().parcial
  const pantalla = useApp(s => s.pantalla), equipoAbierto = useApp(s => s.equipoAbierto), campoId = useApp(s => s.campoId), emitirInforme = useApp(s => s.emitirInforme), setImprimiendo = useApp(s => s.setImprimiendo)
  const ctx = useCtx(); const versiones = useVersiones(); const informes = useInformes()
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const ids = ambito.campos.map(c => c.id)
  // La ficha de un equipo es de su campo, aunque se haya abierto desde el portafolio.
  const campoFicha = campoPorId(campoId)
  const titulo = equipoAbierto ? `Ficha del equipo ${equipoAbierto} · ${campoFicha.nombre}` : PANTALLAS[pantalla]?.titulo ?? pantalla
  // Un período parcial lo dice en el folio, el CSV y el papel («Año a la fecha, en curso»).
  const periodo = periodoDelInforme(rango, parcial)
  /** Registra la exportación: se manda la CONSULTA (campos, período, equipo de
   *  la ficha) y el servidor devuelve el folio con las cifras y su huella. El
   *  front no calcula ni manda la huella: si lo hiciera, el folio certificaría
   *  lo que el navegador quisiera. Cualquier error se muestra y el menú se
   *  libera: nunca queda «ocupado» para siempre. */
  const exportar = async (formato: Informe['formato'], que: string, entregar: (inf: Informe) => void | Promise<void>) => {
    setOcupado(true); setAviso(null)
    try {
      const ficha = formato === 'pdf' && equipoAbierto ? { equipo: equipoAbierto, campoId } : undefined
      const r = await emitirInforme({ formato, titulo: que, alcance: ficha ? campoFicha.nombre : ambito.titulo, periodo,
        campos: ficha ? [campoId] : ids, desde: rango.desde.toISOString(), hasta: rango.hasta.toISOString(), ...(ficha ? { equipo: ficha } : {}) })
      if (!r.ok) { setAviso(r.error); return }
      await entregar(r.informe)
    } catch (e) {
      setAviso(`No se pudo exportar: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setOcupado(false)
    }
  }

  const pdf = (alEntregar?: () => void) => exportar('pdf', titulo, inf => {
    setImprimiendo(inf); alEntregar?.()
    // Se deja pintar el membrete con su folio antes de abrir la ventana de imprimir.
    setTimeout(() => print(), 150)
  })

  const csv = (alEntregar?: () => void) => exportar('csv', 'Barriles no producidos por evento', async inf => {
    // Los eventos del CSV son los del mismo período y campos que el servidor registró.
    const lb = await traerLibro({ campos: inf.campos, desde: new Date(inf.desde), hasta: new Date(inf.hasta) }, ctx)
    const v = versiones.find(x => x.version === inf.version)
    const texto = csvDeLibro(lb, [
      ['Empresa', ctx.config.empresa], ['Informe', inf.titulo], ['Alcance', inf.alcance], ['Período', inf.periodo],
      ['Generado', `${fechaHoraLarga(new Date(inf.fecha))} por ${inf.por}`], ['Datos hasta', `${fechaHoraLarga(AHORA)}, reloj del PLC`],
      ['Estado del período', publicacion(lb).texto],
      ['Configuración', v ? `versión ${v.version}, firmada por ${v.por} el ${fechaHoraLarga(new Date(v.fecha))}` : `versión ${inf.version}`],
      ['Folio', inf.folio], ['Huella SHA-256', inf.huella],
      // Las cifras que protege la huella, en su forma canónica: con ellas cualquiera la recalcula.
      ...formaCanonica(inf.cifras).split('\n').map((l): [string, string] => ['Cifra protegida', l]),
      ['Nota de cálculo', NOTA_DE_CALCULO],
    ])
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }))
    a.download = `TRIM-${inf.folio}-eventos.csv`
    a.click(); URL.revokeObjectURL(a.href)
    alEntregar?.()
  })

  return { puede: !!rol.puede['evidencia:exportar'], titulo, ocupado, aviso, setAviso, pdf, csv, ultimo: informes.at(-1) }
}

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
    <div ref={contenedor} className="no-imprimir relative">
      {/* Al abrir se borra el aviso anterior: uno viejo («nadie con acceso…») ya no dice la verdad. */}
      <button {...propsBoton} onClick={() => { x.setAviso(null); setAbierto(v => !v) }} aria-label="Exportar" title="Exportar: informe en PDF o datos en CSV"
        className="flex cursor-pointer items-center gap-1.5 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-[5px] text-[11.5px] shadow-[var(--sombra)] hover:bg-[var(--elevado)]">
        <Download className="size-3.5 opacity-70" /><span className="hidden sm:inline">Exportar</span>
      </button>
      {abierto && (
        <div id={id} role="group" aria-label={`Exportar ${x.titulo}`} className="absolute right-0 top-[calc(100%+5px)] z-[90] w-[300px] max-w-[calc(100vw-24px)] rounded border border-[var(--linea)] bg-[var(--elevado)] p-1 shadow-[var(--sombra2)]">
          <p className="font-cond px-2 pb-1 pt-1.5 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">EXPORTAR · {x.titulo.toUpperCase()}</p>
          <button disabled={x.ocupado} onClick={() => x.pdf(cerrar)}
            className="flex w-full cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-left text-[11.5px] hover:bg-[var(--panel2)] disabled:opacity-60">
            <FileText className="mt-0.5 size-3.5 shrink-0 opacity-70" />
            <span>Informe en PDF<span className="block text-[10px] text-[var(--tinta3)]">Con membrete y folio; al imprimir, «Guardar como PDF»</span></span>
          </button>
          <button disabled={x.ocupado} onClick={() => x.csv(cerrar)}
            className="flex w-full cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-left text-[11.5px] hover:bg-[var(--panel2)] disabled:opacity-60">
            <Table className="mt-0.5 size-3.5 shrink-0 opacity-70" />
            <span>Datos en CSV<span className="block text-[10px] text-[var(--tinta3)]">Eventos del período, con causa y barriles</span></span>
          </button>
          {x.aviso && <p role="alert" className="border-t border-[var(--linea2)] px-2 py-1.5 text-[11px] text-[var(--tinta)]">{x.aviso}</p>}
          {/* Por qué sirve de respaldo: en el ⓘ. A la vista, el último folio. */}
          <p className="flex flex-wrap items-center gap-x-1.5 border-t border-[var(--linea2)] px-2 py-1.5 text-[10px] leading-relaxed text-[var(--tinta3)]">
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
      {x.aviso && <p role="alert" className="basis-full text-[11px] text-[var(--tinta)]">{x.aviso}</p>}
    </span>
  )
}
