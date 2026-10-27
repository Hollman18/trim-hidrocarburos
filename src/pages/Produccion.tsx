import { useAmbito, useRango } from '@/app/store'
import { useMemo } from 'react'
import { useLibro, useLibros, useSerie, useDias, useEstadoCampos } from '@/shared/api/diferidos'
import { pedirMedicionOficial } from '@/shared/api/medicion'
import { campoPorId } from '@/entities/campos'
import { conMeta, textoSinMeta } from '@/entities/libro'
import { SIN_META } from '@/entities/configuracion'
import { fechaCorta } from '@/entities/reloj'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { BarraMeta } from '@/shared/ui/BarraMeta'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas, VISIBLES } from '@/shared/ui/listaCorta'
import { n0, n1, n3 } from '@/shared/lib/formato'
import { Diaria } from '@/widgets/produccion/Diaria'
import { Factor } from '@/widgets/diferidos/Factor'
import { SelloPublicacion } from '@/widgets/diferidos/Sello'
import { AsignacionOficial } from '@/widgets/produccion/AsignacionOficial'
import { desplazable } from '@/shared/ui/alFinal'
import { TuberiaTecnica } from '@/widgets/plantaviva/Tecnica'
import { TuberiaDeCadaCampo } from '@/widgets/choke/Campos'
import { SerieLimita } from '@/widgets/choke/Serie'
import { Escalera } from '@/widgets/choke/Escalera'
import { useRepartoChoke } from '@/shared/api/choke'

/** La curva es el hecho; el diferido es la consecuencia. Producción entra por
 *  aquí: cuánto salió por el punto de medición oficial, contra lo que daban
 *  las pruebas y contra la meta firmada, día por día. Arriba, dos líneas (P-produccion-1):
 *  la producción medida contra la meta, en barra, y el potencial del libro; si el
 *  libro se puede publicar, en el sello.
 *
 *  Para producción, entre el bloque de arriba y «Día a día», va «La tubería
 *  del campo»: la MISMA de La planta viva con la lente técnica (P-16, H8): el
 *  rayado donde se trabó, lo que cabe y lo que le sobra a cada tramo, y la tabla;
 *  debajo, qué limitó cada día.
 *  Con todos los campos, una fila por campo. Después de «Día a día», lo que no
 *  se produjo escalón por escalón con la eficiencia, y lo perdido por tramo mes
 *  a mes. El gerente no ve nada de esto: es detalle técnico (U2 §3.2). */
export function Produccion() {
  const ambito = useAmbito(); const rango = useRango()
  // P-21: ningún rol de decisión tiene Producción (la del gerente vive en Resultados): sin rama «decision».
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
      <section className="mb-3 rounded-[20px] bg-[var(--panel)] px-5 py-5 sm:mb-4 sm:px-7" data-produccion-cabeza="">
        <div className="flex flex-wrap items-start justify-between gap-2">
          {/* El ámbito y el período ya los dice la cabecera (también en el teléfono); la cabecera no sale en el papel, y aquí quedan para el papel. */}
          <small className="hidden text-[13px] text-[var(--tinta3)] print:block">{ambito.titulo} · {rango.nombre}</small>
          <SelloPublicacion lb={lb} className="ml-auto" />
        </div>
        {/* Dos líneas (P-produccion-1): lo medido contra la meta y el potencial del libro (G-5). El resto, en sus ⓘ. */}
        <div className="mt-1 max-w-[560px]">
          <BarraMeta rotulo="producción medida" valor={lb.real} unidad="bbl" meta={hayMeta ? lb.meta.produccion : undefined}
            rotuloMeta={hayMeta ? `meta${enCurso ? ' a la fecha' : ''} ${n0(lb.meta.produccion)}` : textoSinMeta(lb.meta, ambito.global)} fuera={hayMeta && lb.real < lb.meta.produccion}
            apoyo={<span className="inline-flex flex-wrap items-center gap-x-1">{n0(porDia(lb.real))} bbl/d
              <Info titulo="Real contra la meta" texto={`Lo que midió el punto de medición oficial.${ayer === null ? ' Falta el fiscal del último día en algún campo: la suma del último día no está completa.' : ` El último día completo${fechaAyer ? ` (${fechaCorta(fechaAyer)})` : ''}: ${n0(ayer)} bbl.`}${hayMeta ? ` Meta por día ${n0(porDia(lb.meta.produccion))} bbl/d; ${enCurso ? 'del mes completo' : 'del período'}, ${n0(lb.meta.produccionTotal)} bbl.` : ` ${SIN_META}.`}`} /></span>} />
        </div>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 border-t border-[var(--linea2)] pt-2.5 text-[15px] text-[var(--tinta2)]" data-del-potencial="">
          Potencial del libro: <b className="text-[var(--tinta)] tabular-nums">{n0(lb.potencial)} bbl</b> · {n0(porDia(lb.potencial))} bbl/d · lo medido es el {n1(lb.pe)} %
          {/* Lo real sobre el potencial del libro: NO es la eficiencia de producción (esa va en la escalera, D3). */}
          <InfoDelPotencial q={q} />
        </p>
      </section>

      {(ambito.global
        ? <TuberiaDeCadaCampo campos={ids} desde={rango.desde} hasta={rango.hasta} />
        : (
          <>
            <TuberiaTecnica className="mb-3 sm:mb-4" />
            <SerieLimita campoId={ids[0]!} desde={rango.desde} hasta={rango.hasta} periodo={rango.nombre} />
          </>
        ))}

      <Panel className="mb-2.5" titulo="Día a día" extra="bbl/d">
        <Diaria dias={dias} />
        <Lectura>
          La curva oscura es lo que midió el punto de medición oficial cada día; la clara, lo que
          daban las pruebas de los pozos con el factor de asignación del mes (el potencial del libro); la
          punteada, la meta firmada. Lo sombreado entre las dos es lo que no se produjo. El día de hoy
          va como tasa y con el punto hueco: está a medias. Toque o pase el cursor por un día para ver
          sus cifras; con el teclado, las flechas pasan de un día a otro.
        </Lectura>
      </Panel>

      {<Escalera campos={ids} desde={rango.desde} hasta={rango.hasta} periodo={rango.nombre} />}
      {/* C5 · «Lo perdido por tramo, mes a mes» vive una sola vez: en Resultados (mes a mes, «Por dónde se trabó») y en Diferidos (X4 §3.7). */}

      {<div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        <Panel titulo="Medición oficial">
          <Lectura>
            De dónde sale lo real. Lo real no lo escribe nadie: lo entrega el computador de flujo (o los
            medidores automáticos de tanque) del punto de medición oficial. El corte de agua puede venir de un analizador en
            línea o del laboratorio; el del laboratorio es manual en origen y se dice.
          </Lectura>
          {ids.map(c => {
            const medicion = pedirMedicionOficial(c), o = medicion.origen
            const mesActual = lb.fa.filter(f => f.campoId === c).at(-1)
            return (
              <div key={c} className="border-b border-[var(--linea2)] py-2 text-[14px] last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <b>{campoPorId(c).nombre}</b>
                  <span className="flex flex-wrap gap-1">
                    <Chip tono={o?.bsw === 'laboratorio' ? 'fuerte' : 'neutro'}>corte de agua: {o?.bsw ?? 'sin dato'}</Chip>
                    {mesActual && <Chip>factor {n3(mesActual.fa)} · banda ±{n0(medicion.banda.valor * 100)} %</Chip>}
                  </span>
                </div>
                <small className="font-mono block text-[13px] text-[var(--tinta2)]">{o?.fuente ?? 'Sin punto de medición configurado'}</small>
              </div>
            )
          })}
        </Panel>
        {/* C5 · El cuadre del libro y la custodia viven en Diferidos («¿Se puede publicar?»): aquí, una vez, la medición y el factor. */}
        {!ambito.global && (
          <Panel titulo="Factor de asignación" extra="contra su banda">
            <Factor serie={serie} campoId={ids[0]!} desde={rango.desde} hasta={rango.hasta} />
          </Panel>
        )}
      </div>}

      {<Panel titulo={largo ? '¿Cuadra? Mes por mes' : '¿Cuadra? Día por día'}>
        <div {...desplazable('Cuadre del período')} className="overflow-x-auto">
          <table className="tabular w-full min-w-[620px] text-right text-[14px]">
            <thead className="text-[12px] text-[var(--tinta3)]">
              <tr><th className="py-1.5 text-left font-normal">{largo ? 'Mes' : 'Día'}</th><th className="font-normal">Real</th><th className="font-normal">Potencial</th>
                <th className="font-normal">Diferido</th><th className="font-normal">Inventario</th><th className="font-normal">Del potencial</th><th className="font-normal">Meta</th></tr>
            </thead>
            <tbody>
              {largo ? meses.map(m => (
                <tr key={m.mes} className="border-t border-[var(--linea2)]">
                  <td className="py-1 text-left">{m.nombre}{m.recortado ? ` · ${fechaCorta(m.desde)} a ${fechaCorta(new Date(m.hasta.getTime() - 1))}` : m.parcial ? ' · en curso' : ''}</td>
                  <td><BajoLaMeta si={conMeta(m.libro.meta) && m.libro.real < m.libro.meta.produccion} />{n0(m.libro.real)}</td><td>{n0(m.libro.potencial)}</td><td>{n0(m.libro.diferido)}</td>
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
                    <td>{d.real === null ? 'sin fiscal' : <><BajoLaMeta si={d.meta !== null && d.real < d.meta} />{n0(d.real)}</>}</td><td>{n0(d.potencial)}</td><td>{n0(d.diferido)}</td>
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

      <AsignacionOficial campos={ids} />
    </>
  )
}

/** Lo real sobre el potencial del libro (las pruebas × el factor de asignación del
 *  mes): solo descuenta lo que no se produjo por paradas. NO es la eficiencia de
 *  producción, que tiene otro nombre y otra cuenta (D3; QA-R, vecino 2). */
const DEL_POTENCIAL = 'Lo real ÷ el potencial de al lado: lo que daban las pruebas de los pozos con el factor de asignación del mes, que las deja medidas como el punto de medición oficial. Por eso solo descuenta lo que no se produjo por paradas.'

/** Para producción, el mismo ⓘ con la diferencia de verdad contra la eficiencia de
 *  producción de la escalera, con las cifras del período. */
function InfoDelPotencial({ q }: { q: { campos: string[]; desde: Date; hasta: Date } }) {
  const b = useRepartoChoke(q)
  const brecha = Math.round(b.brechaPruebas)
  const libro = b.potencial > 0 ? (b.real / b.potencial) * 100 : 0
  const porque = brecha === 0 ? 'en este período las pruebas y el medidor oficial dan lo mismo'
    : brecha > 0 ? `descuenta además lo que las pruebas dan de más que el medidor oficial (${n0(brecha)} bbl en el período)`
      : `suma además lo que el medidor oficial da de más que las pruebas (${n0(-brecha)} bbl en el período)`
  // La eficiencia que no se puede creer no se dice en número, tampoco aquí (D3; 5E·H30).
  const aqui = b.peCreible ? `Aquí, ${n1(libro)} % del potencial y ${n1(b.pe)} % de eficiencia de producción.`
    : `Aquí, ${n1(libro)} % del potencial; la eficiencia de producción del período no se puede creer: ${b.textoPe ?? ''}`
  return <Info titulo="% del potencial" texto={`${DEL_POTENCIAL} No es la eficiencia de producción («Lo que no se produjo, por tipo»): esa parte de las pruebas sin el factor y ${porque}. ${aqui}`} />
}

/** K1 (color sin forma, X2 §4): la marca de aviso de la celda «Real» lleva su palabra en la misma celda.
 *  Lo que avisa es que el día (o el mes) quedó bajo la meta firmada; sin meta, ninguna marca. */
function BajoLaMeta({ si }: { si: boolean }) {
  if (!si) return null
  return (
    <span className="mr-1.5 inline-flex items-center gap-1 whitespace-nowrap align-[-2px] text-[12px] text-[var(--tinta2)]" data-bajo-meta="">
      <MarcaCondicion c="aviso" tamano={12} decorativa />bajo la meta
    </span>
  )
}
