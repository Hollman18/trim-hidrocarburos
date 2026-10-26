import { useState } from 'react'
import { useApp, useAmbito, useRango, useRol, usePeriodo } from '@/app/store'
import { traerLibro } from '@/shared/api/diferidos'
import { csvDeLibro, formaCanonica, type Informe } from '@/entities/informe'
import { PANTALLAS } from '@/app/pantallas'
import { campoPorId } from '@/entities/campos'
import { fechaHoraLarga, AHORA } from '@/entities/reloj'
import { NOTA_DE_CALCULO } from '@/widgets/diferidos/Rango'
import { publicacion } from '@/widgets/diferidos/publicacion'
import { useVersiones, useCtx, useInformes } from '@/shared/api/sesion'
import { periodoDelInforme } from './periodo'

/** La lógica de exportar, aparte de dónde está el botón: el menú de la
 *  cabecera exporta la pantalla y la ficha de un equipo se exporta desde su
 *  propio panel, porque el panel tapa la cabecera mientras está abierto. */
export function useExportar() {
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
