import { useAmbito, useRango, useNivel } from '@/app/store'
import { useMemo, type ReactNode } from 'react'
import { useLibro, useLibros, useSerie, useDias, useEstadoCampos } from '@/shared/api/diferidos'
import { pedirMedicionOficial } from '@/shared/api/medicion'
import { campoPorId } from '@/entities/campos'
import { conMeta, textoSinMeta } from '@/entities/libro'
import { SIN_META } from '@/entities/configuracion'
import { fechaCorta } from '@/entities/reloj'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { BarraMeta } from '@/shared/ui/BarraMeta'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas, VISIBLES } from '@/shared/ui/listaCorta'
import { n0, n1, n3 } from '@/shared/lib/formato'
import { Diaria } from '@/widgets/produccion/Diaria'
import { Factor } from '@/widgets/diferidos/Factor'
import { Cuadre } from '@/widgets/diferidos/Cuadre'
import { SelloPublicacion } from '@/widgets/diferidos/Sello'
import { AsignacionOficial } from '@/widgets/produccion/AsignacionOficial'
import { desplazable } from '@/shared/ui/alFinal'

/** La curva es el hecho; el diferido es la consecuencia. Producción entra por
 *  aquí: cuánto salió por el punto de medición oficial, contra lo que daban
 *  las pruebas y contra la meta firmada, día por día. Lo real contra la meta
 *  va en barra; si el libro se puede publicar, en el sello de arriba. */
export function Produccion() {
  const ambito = useAmbito(); const rango = useRango()
  // El directivo ve la curva y si el número se puede publicar; la custodia,
  // el factor y el cuadre diario son de producción.
  const ing = useNivel() !== 'decision'
  const ids = ambito.campos.map(c => c.id)
  const q = { campos: ids, desde: rango.desde, hasta: rango.hasta }
  const lb = useLibro(q)
  const dias = useDias(q)
  const serie = useSerie(ids)
  const estados = useEstadoCampos(ids)
  const horas = dias.reduce((a, d) => a + d.horas, 0)
  const porDia = (v: number) => (horas > 0 ? (v * 24) / horas : 0)
  // Si un campo no tiene el fiscal del último día, la suma no está completa: hueco, no cero.
  const ayer = estados.some(e => e.ayer.bbl === null) ? null : estados.reduce((a, e) => a + (e.ayer.bbl ?? 0), 0)
  const fechaAyer = estados[0]?.ayer.fecha
  const largo = dias.length > 62
  // Cada mes se recorta al rango escogido: un rango que empieza o termina a
  // mitad de mes metía en la tabla días que no son del período y no cuadraba
  // con las cifras de arriba. El mes recortado se pide al libro por su tramo y
  // dice qué días trae.
  const d0 = rango.desde.getTime(), d1 = rango.hasta.getTime()
  const tocados = useMemo(() => serie.filter(m => m.desde.getTime() < d1 && m.hasta.getTime() > d0).map(m => {
    const desde = Math.max(m.desde.getTime(), d0), hasta = Math.min(m.hasta.getTime(), d1)
    return { m, desde: new Date(desde), hasta: new Date(hasta), recortado: desde > m.desde.getTime() || hasta < m.hasta.getTime() }
  }), [serie, d0, d1])
  // Los meses recortados (a lo sumo el primero y el último) se piden al libro
  // por su tramo, cada uno en su consulta de la caché.
  const recortes = useLibros(tocados.filter(t => t.recortado).map(t => ({ campos: ids, desde: t.desde, hasta: t.hasta })))
  const meses = useMemo(() => {
    let i = 0
    return tocados.map(t => ({ ...t.m, desde: t.desde, hasta: t.hasta, recortado: t.recortado, libro: t.recortado ? recortes[i++]! : t.m.libro }))
  }, [tocados, recortes])
  // El cuadre día por día, del más reciente al más viejo: cinco a la vista; el resto, a un toque y en el papel.
  // Un día sin fiscal (hueco del dato) o bajo la meta (marcado) nunca queda detrás de «ver más»:
  // la condición es la misma del cuadrado de la tabla.
  const recientes = useMemo(() => [...dias].reverse(), [dias])
  const listaDias = useVerMas(recientes, { n: recientes.length === VISIBLES + 1 ? recientes.length : VISIBLES,
    prioridad: d => (d.real === null || (d.meta !== null && d.real < d.meta) ? 1 : 2) })
  const hayMeta = conMeta(lb.meta)
  const enCurso = lb.meta.diasTotal > lb.meta.dias + 0.01

  return (
    <>
      <section className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          {/* El ámbito y el período ya los dice la cabecera (también en el teléfono); la cabecera no sale en el papel, y aquí quedan para el papel. */}
          <small className="text-[11px] tracking-[.04em] text-[var(--tinta3)] hidden print:block">{ambito.titulo.toUpperCase()} · {rango.nombre.toUpperCase()}</small>
          <SelloPublicacion lb={lb} className="ml-auto" />
        </div>
        <div className="mt-1 grid items-start gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))]">
          <BarraMeta rotulo="producción real" valor={lb.real} unidad="bbl" meta={hayMeta ? lb.meta.produccion : undefined}
            rotuloMeta={hayMeta ? `meta${enCurso ? ' a la fecha' : ''} ${n0(lb.meta.produccion)}` : textoSinMeta(lb.meta, ambito.global)} fuera={hayMeta && lb.real < lb.meta.produccion}
            apoyo={`${n0(porDia(lb.real))} bbl/d · eficiencia ${n1(lb.pe)} %`}
            tip={{ titulo: 'Real contra la meta', filas: [['Real por día', `${n0(porDia(lb.real))} bbl/d`],
              ...(hayMeta ? [['Meta por día', `${n0(porDia(lb.meta.produccion))} bbl/d`], ['Meta a la fecha', `${n0(lb.meta.produccion)} bbl`],
                [enCurso ? 'Meta del mes completo' : 'Meta del período', `${n0(lb.meta.produccionTotal)} bbl`]] as Array<[string, string]> : [['Meta', SIN_META] as [string, string]])] }} />
          <Cifra rotulo="potencial" valor={n0(lb.potencial)} unidad="bbl"
            pie={<>{n0(porDia(lb.potencial))} bbl/d<Info titulo="Potencial" texto={ing ? 'Pruebas de los pozos × factor de asignación.' : 'Lo que los pozos podían dar.'} /></>} />
          <Cifra rotulo={`real · ${fechaAyer ? fechaCorta(fechaAyer) : 'último día'}`} valor={ayer === null ? '—' : n0(ayer)} unidad={ayer === null ? undefined : 'bbl'}
            pie={ayer === null ? <>sin fiscal<Info titulo="Último día completo" texto="Falta el fiscal del último día en algún campo: la suma no está completa." /></> : undefined} />
        </div>
      </section>

      <Panel className="mb-2.5" titulo="DÍA A DÍA" extra="bbl/d">
        <Diaria dias={dias} />
        <Lectura>
          La curva sólida es lo que midió el punto de medición oficial cada día; la discontinua, lo
          que daban las pruebas de los pozos con el factor de asignación del mes; la punteada, la meta
          firmada. Lo sombreado entre la discontinua y la sólida es lo que no se produjo. El día de
          hoy va como tasa y con el punto hueco: está a medias. Toque o pase el cursor por un día para
          ver sus cifras; con el teclado, las flechas pasan de un día a otro.
        </Lectura>
      </Panel>

      {ing && <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <Panel titulo="MEDICIÓN OFICIAL">
          <Lectura>
            De dónde sale lo real. Lo real no lo escribe nadie: lo entrega el computador de flujo (o los
            medidores automáticos de tanque) del punto de medición oficial. El corte de agua puede venir de un analizador en
            línea o del laboratorio; el del laboratorio es manual en origen y se dice.
          </Lectura>
          {ids.map(c => {
            const medicion = pedirMedicionOficial(c), o = medicion.origen
            const mesActual = lb.fa.filter(f => f.campoId === c).at(-1)
            return (
              <div key={c} className="border-b border-[var(--linea2)] py-2 text-[11.5px] last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <b>{campoPorId(c).nombre}</b>
                  <span className="flex flex-wrap gap-1">
                    <Chip tono={o?.bsw === 'laboratorio' ? 'fuerte' : 'neutro'}>corte de agua: {o?.bsw ?? 'sin dato'}</Chip>
                    {mesActual && <Chip>factor {n3(mesActual.fa)} · banda ±{n0(medicion.banda.valor * 100)} %</Chip>}
                  </span>
                </div>
                <small className="font-mono block text-[10.5px] text-[var(--tinta2)]">{o?.fuente ?? 'Sin punto de medición configurado'}</small>
              </div>
            )
          })}
        </Panel>
        {ambito.global ? <Cuadre lb={lb} /> : (
          <Panel titulo="FACTOR DE ASIGNACIÓN" extra="contra su banda">
            <Factor serie={serie} campoId={ids[0]!} desde={rango.desde} hasta={rango.hasta} />
          </Panel>
        )}
      </div>}

      {ing && <Panel titulo={largo ? 'CUADRE MENSUAL' : 'CUADRE DIARIO'}>
        <div {...desplazable('Cuadre del período')} className="overflow-x-auto">
          <table className="tabular w-full min-w-[620px] text-right text-[11.5px]">
            <thead className="text-[9.5px] text-[var(--tinta3)]">
              <tr><th className="py-1.5 text-left font-normal">{largo ? 'Mes' : 'Día'}</th><th className="font-normal">Real</th><th className="font-normal">Potencial</th>
                <th className="font-normal">Diferido</th><th className="font-normal">Inventario</th><th className="font-normal">Eficiencia</th><th className="font-normal">Meta</th></tr>
            </thead>
            <tbody>
              {largo ? meses.map(m => (
                <tr key={m.mes} className="border-t border-[var(--linea2)]">
                  <td className="py-1 text-left">{m.nombre}{m.recortado ? ` · ${fechaCorta(m.desde)} a ${fechaCorta(new Date(m.hasta.getTime() - 1))}` : m.parcial ? ' · en curso' : ''}</td>
                  <td><FueraDeMeta si={conMeta(m.libro.meta) && m.libro.real < m.libro.meta.produccion} tamano={9} />{n0(m.libro.real)}</td><td>{n0(m.libro.potencial)}</td><td>{n0(m.libro.diferido)}</td>
                  <td className="text-[var(--tinta3)]">{n0(m.libro.residuo)}</td>
                  <td>{n1(m.libro.pe)} %</td>
                  <td className="text-[var(--tinta3)]">{conMeta(m.libro.meta) ? n0(m.libro.meta.produccion) : SIN_META}</td>
                </tr>
              )) : recientes.map(d => ({ d, oculta: listaDias.resto.includes(d) })).map(({ d, oculta }) => {
                // Un día sin fiscal es un hueco: se dice, no se pinta en cero.
                const pe = d.potencial && d.real !== null ? (d.real / d.potencial) * 100 : undefined
                // Los días que esconde «ver más» salen en el papel: una tabla cortada en silencio engaña.
                return (
                  <tr key={d.dia.getTime()} className={`border-t border-[var(--linea2)] ${oculta ? 'hidden print:table-row' : ''}`}>
                    <td className="py-1 text-left">{fechaCorta(d.dia)}{d.horas < 23.99 ? ` · ${n1(d.horas)} h` : ''}</td>
                    <td>{d.real === null ? 'sin fiscal' : <><FueraDeMeta si={d.meta !== null && d.real < d.meta} tamano={9} />{n0(d.real)}</>}</td><td>{n0(d.potencial)}</td><td>{n0(d.diferido)}</td>
                    <td className="text-[var(--tinta3)]">{d.residuo === null ? '—' : n0(d.residuo)}</td>
                    <td>{pe === undefined ? '—' : `${n1(pe)} %`}</td>
                    <td className="text-[var(--tinta3)]">{d.meta === null ? SIN_META : n0(d.meta)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!largo && <VerMas ocultas={listaDias.ocultas} abierto={listaDias.abierto} onAlternar={listaDias.alternar} />}
        <Lectura>
          Real + diferido de los eventos + inventario = potencial. El inventario es lo que el tanque de
          venta guardó o entregó de un día para otro: por eso un día suelto no cuadra exacto y el mes
          entero sí.{largo ? '' : ' Se ven los cinco días más recientes; «ver más» abre el resto.'}
        </Lectura>
      </Panel>}

      {ing && <AsignacionOficial campos={ids} />}
    </>
  )
}

/** Cifra de la cabecera, con la misma forma que la barra de al lado: rótulo,
 *  número con su unidad y, si hace falta, una línea de apoyo. */
function Cifra({ rotulo, valor, unidad, pie }: { rotulo: string; valor: string; unidad?: string; pie?: ReactNode }) {
  return (
    <span className="min-w-0">
      <small className="block text-[10.5px] text-[var(--tinta3)]">{rotulo}</small>
      <b className="tabular block text-[20px] leading-none">
        {valor}{unidad && <small className="ml-1 text-[11px] font-normal text-[var(--tinta3)]">{unidad}</small>}
      </b>
      {pie && <small className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10.5px] leading-snug text-[var(--tinta2)]">{pie}</small>}
    </span>
  )
}
