import { useState } from 'react'
import { useApp, useAmbito, useRango } from '@/app/store'
import type { VistaEquipos } from '@/shared/api/equiposTecnico'
import { useCriticidad, DONDE_CHOKE } from '@/shared/api/choke'
import { useConfiabilidad } from '@/shared/api/equipos'
import { useCalidadAnh } from '@/shared/api/arbol'
import { NOMBRE_FAMILIA, type Familia } from '@/entities/flota'

/** La familia de la flota como la dice la fila de Equipos (la misma de Confiabilidad). */
const FAMILIA_EN_FILA: Record<Familia, string> = { inyeccion: 'bomba de agua', multifasica: 'bomba multifásica', electrosumergible: 'electrosumergible' }
import { Boton } from '@/shared/ui/primitivas'
import { n0 } from '@/shared/lib/formato'
import { Aciertos } from '@/widgets/confiabilidad/Aciertos'
import { Cifras } from '@/widgets/hoy/Cifras'
import { useFiltrosEquipos } from './filtros'
import { useIrA } from './navegar'

const y = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

/** Confiabilidad (necesario-por-rol §6 y §14): «Si falla hoy 3.059 bbl/d · el primero», con el
 *  equipo, si TRIM lo vigila y el tramo del choke donde se trabaría; ¿le creo al vigía?, los
 *  equipos sin instrumento, el tiempo entre fallas de su familia y las clasificaciones que
 *  confirmó una persona. «Abrir P-201A» en un toque; los 12 filtros, detrás de «Filtrar». */
export function CabezaConf({ v }: { v: VistaEquipos }) {
  const ambito = useAmbito(); const rango = useRango()
  const setPantalla = useApp(s => s.setPantalla)
  const campos = ambito.campos.map(c => c.id)
  const irA = useIrA()
  const poner = useFiltrosEquipos(s => s.poner)
  const ranking = useCriticidad(campos).ranking
  const equipos = useConfiabilidad(campos)
  const calidad = useCalidadAnh({ campos, desde: rango.desde, hasta: rango.hasta })
  const [vigia, setVigia] = useState(false)
  const p = v.primero
  if (!p) return null
  const fila = p.filas[0]
  const uno = p.equipos[0]!
  const tramo = ranking.find(r => r.campoId === uno.campoId && r.equipo === uno.equipo)?.tramo
  // El tiempo entre fallas de la familia del primero (MTBF de la flota: días de historia por equipo ÷ fallas,
  // la misma regla que Confiabilidad). Sin dos fallas no se calcula.
  const fam = equipos.find(e => e.campoId === uno.campoId && e.equipo === uno.equipo)?.familia
    ?? (Object.keys(FAMILIA_EN_FILA) as Familia[]).find(k => FAMILIA_EN_FILA[k] === fila?.familia)
  const flota = equipos.filter(e => e.familia === fam)
  const fallas = flota.reduce((a, e) => a + e.h.fallas, 0)
  const mtbf = fam && fallas >= 2 ? (flota[0]!.h.dias * flota.length) / fallas : undefined
  const plan = calidad.porPaso.find(x => x.paso === 'planeacion')
  return (
    <>
      <Cifras titulo="Si falla hoy, lo primero" principal={{ id: 'si-falla-hoy', rotulo: 'Si falla hoy', cifra: n0(p.valor), unidad: 'bbl/d',
        detalle: <>{y(p.equipos.map(e => e.equipo))}{fila && !fila.vigila ? ' · sin instrumento' : ''}{tramo ? ` · se trabaría ${DONDE_CHOKE[tramo]}` : ''}</> }}
        apoyo={[
          { id: 'vigia', rotulo: 'Vigía', cifra: `${v.vigia.aciertos} de ${v.vigia.juzgadas}`, detalle: 'aciertos', onAbrir: () => setVigia(x => !x), abrir: `¿Le creo al vigía? ${v.vigia.aciertos} de ${v.vigia.juzgadas} aciertos. Ver lo que anunció` },
          { id: 'sin-instrumento', rotulo: 'Sin instrumento', cifra: n0(v.cuentas.estado['sin-instrumento']), unidad: 'equipos', onAbrir: () => poner({ estado: 'sin-instrumento' }), abrir: 'Ver los equipos sin instrumento' },
          { id: 'entre-fallas', rotulo: 'Entre fallas', cifra: mtbf ? `${n0(mtbf)} d` : 'sin dato', sinDato: !mtbf, detalle: fam ? NOMBRE_FAMILIA[fam].toLowerCase() : undefined,
            onAbrir: () => setPantalla('confiabilidad'), abrir: 'Ver la confiabilidad' },
          plan && { id: 'clasificacion', rotulo: 'Clasificación confirmada', cifra: `${plan.avaladas} de ${plan.paradas}`, unidad: 'filas', detalle: 'planeada o no' },
        ]}>
        <Boton variante="principal" onClick={() => irA({ campoId: uno.campoId, equipo: uno.equipo })} className="min-h-12 px-6 text-[16px]" data-abrir-primero>Abrir {uno.equipo}</Boton>
      </Cifras>
      {vigia && (
        <section aria-label="¿Le creo al vigía?" className="rounded-[10px] bg-[var(--panel)] px-5 py-4 sm:px-7" data-vigia-abierto>
          <Aciertos onAbrir={(c, eq) => irA({ campoId: c, equipo: eq })} />
        </section>
      )}
    </>
  )
}
