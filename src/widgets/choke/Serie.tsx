import { useId, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useSerieChoke, PARAMETROS_CHOKE, ORDEN_CHOKE, ORDEN_CHOKE_CAMPO, type DiaChoke, type ChokeCampo } from '@/shared/api/choke'
import { campoPorId } from '@/entities/campos'
import { fechaCorta } from '@/entities/reloj'
import { Panel } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { alFinal } from '@/shared/ui/alFinal'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, n1, plural } from '@/shared/lib/formato'
import { ABREV, SUJETO, VERBO, DONDE, CAJA, TONO, TRAMO_DE, mayuscula, lista } from './palabras'

const pct = (u: number) => n1(u * 100).replace(/,0$/, '')
const AYUDA_AVISO = `TRIM avisa «Cambió lo que limita» solo si el tramo nuevo gana por más del ${pct(PARAMETROS_CHOKE.umbralCasiIguales)} % y lo sostiene ${PARAMETROS_CHOKE.diasParaCambio} días seguidos. Mientras dos tramos están a menos de esa diferencia, están «casi iguales» y no se avisa: un aviso por cada vuelta sería ruido. El umbral y los días son de producto y se validan con Edinson.`

/** El patrón de cada tramo en la franja: gris de distinta luminancia y un
 *  dibujo propio, para que se lea también en blanco y negro (U2 §7.5). */
const PATRON: Record<ChokeCampo, string> = { pozos: 'liso', planta: 'rayas', exportacion: 'puntos' }
const PASADO: Record<ChokeCampo, string> = { pozos: 'limitaron', planta: 'limitó', exportacion: 'limitó' }

/** «QUÉ LIMITÓ, DÍA POR DÍA» (U2 §7.1–7.2): una celda por día con lo que
 *  limitó (su abreviatura y su patrón), partida en diagonal los días «casi
 *  iguales», y debajo lo que se perdió cada día por tramo, con «sin
 *  identificar» en gris discontinuo. Arriba, el aviso «Cambió lo que limita»
 *  con su umbral y su persistencia, o «sin cambios». Todo del motor
 *  (`useSerieChoke`); la pantalla solo dibuja. */
export function SerieLimita({ campoId, desde, hasta, periodo }: { campoId: string; desde: Date; hasta: Date; periodo: string }) {
  const s = useSerieChoke(campoId, desde, hasta)
  const id = useId().replace(/:/g, '')
  const nombre = campoPorId(campoId).nombre
  const dias = s.dias
  const conDato = dias.filter(d => d.dominante[campoId])
  const tramos = [...new Set(conDato.map(d => d.dominante[campoId]!))]
  const casi = conDato.filter(d => d.casiIguales[campoId]).length
  const vueltas = s.vueltas[campoId] ?? 0

  // El dibujo: la franja de lo que limitó y, debajo, lo perdido por día.
  const W = 720, G = { x0: 44, x1: 712 }, FRANJA = { y0: 8, y1: 40 }, BARRAS = { y0: 54, y1: 150 }
  const paso = dias.length ? (G.x1 - G.x0) / dias.length : 0
  const tope = Math.max(1, ...dias.map(d => Object.values(d.porChoke).reduce((a, v) => a + Math.max(0, v), 0)))
  const Y = (v: number) => BARRAS.y1 - (v / tope) * (BARRAS.y1 - BARRAS.y0)
  const conTexto = paso >= 15
  // Con teclado, la franja es UNA parada de Tab: las flechas pasan de un día a otro.
  const [enFoco, setEnFoco] = useState<number | null>(null)
  const activo = Math.min(enFoco ?? dias.length - 1, dias.length - 1)
  const dibujo = useRef<SVGSVGElement>(null)
  const mover = (e: React.KeyboardEvent, i: number) => {
    const destino = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? dias.length - 1 : null
    if (destino === null) return
    e.preventDefault()
    const n = Math.max(0, Math.min(dias.length - 1, destino))
    setEnFoco(n)
    dibujo.current?.querySelectorAll<SVGGElement>('[data-dia]')[n]?.focus()
  }
  const cada = Math.max(1, Math.ceil(dias.length / 8))

  const sinCambios = tramos.length === 1
    ? `Sin cambios: en el período ${PASADO[tramos[0]!]} ${SUJETO[tramos[0]!]} todos los días${casi ? `, ${casi === 1 ? 'un día' : `${n0(casi)} días`} casi iguales con otro tramo` : ''}.`
    : 'Sin avisos: lo que limita no cambió de forma sostenida en el período.'

  return (
    <Panel className="mb-2.5" titulo="QUÉ LIMITÓ, DÍA POR DÍA" extra={periodo.toLowerCase()}>
      <div data-serie>
        {/* El aviso: no pide nada urgente; va en gris, con su campana y su texto. */}
        <div className="mb-2 flex flex-wrap items-start gap-x-2 gap-y-1 text-[12px]" data-aviso={s.cambios.length ? 'cambio' : 'sin-cambios'}>
          <Bell aria-hidden className="mt-0.5 size-3.5 shrink-0 text-[var(--tinta3)]" />
          <span className="min-w-0 flex-1">
            {s.cambios.length ? (
              <ul>{s.cambios.map(c => <li key={`${c.campoId}${c.dia.getTime()}`} className="leading-snug">{c.texto}</li>)}</ul>
            ) : (
              <>
                <span className="block">{dias.length ? sinCambios : 'Sin días con dato en el período.'}</span>
                {vueltas > 0 && (
                  <small className="block text-[11px] text-[var(--tinta2)]">
                    Lo que limita se turnó {vueltas === 1 ? 'una vez' : `${n0(vueltas)} veces`} entre tramos casi iguales: ninguna vuelta pasó del {pct(PARAMETROS_CHOKE.umbralCasiIguales)} % por {PARAMETROS_CHOKE.diasParaCambio} días seguidos, y por eso no hubo aviso.
                  </small>
                )}
              </>
            )}
          </span>
          <Info titulo="Cambió lo que limita" texto={AYUDA_AVISO} />
        </div>

        {dias.length > 0 && <Semanas dias={dias} campoId={campoId} />}
        {dias.length > 0 && (
          <div ref={alFinal} className="hidden overflow-x-auto md:block print:block">
            <svg ref={dibujo} viewBox={`0 0 ${W} 178`} className="block h-auto w-full min-w-[540px]" role="group"
              aria-label={`Qué limitó cada día en ${nombre}, ${dias.length === 1 ? 'un día' : `${dias.length} días`}: ${tramos.length ? lista(tramos.map(k => SUJETO[k])) : 'sin dato'}. Debajo, lo que se perdió cada día por tramo. Con las flechas se pasa de un día a otro.`}>
              <defs>
                <pattern id={`rayas-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="5" height="5" fill={TONO.planta} /><line x1="0" y1="0" x2="0" y2="5" stroke="var(--panel)" strokeWidth="1.4" />
                </pattern>
                <pattern id={`puntos-${id}`} width="5" height="5" patternUnits="userSpaceOnUse">
                  <rect width="5" height="5" fill={TONO.exportacion} /><circle cx="2.5" cy="2.5" r="1" fill="var(--panel)" />
                </pattern>
                <pattern id={`sin-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="5" height="5" fill="var(--panel)" /><line x1="0" y1="0" x2="0" y2="5" stroke="var(--tinta3)" strokeWidth="1.2" />
                </pattern>
              </defs>
              <text x={G.x0 - 6} y={(FRANJA.y0 + FRANJA.y1) / 2 + 3} fontSize={9} textAnchor="end" fill="var(--tinta3)">limitó</text>
              <text x={G.x0 - 6} y={BARRAS.y0 + 6} fontSize={9} textAnchor="end" fill="var(--tinta3)" className="tabular">{n0(tope)}</text>
              <text x={G.x0 - 6} y={BARRAS.y1} fontSize={9} textAnchor="end" fill="var(--tinta3)">0</text>
              <line x1={G.x0} x2={G.x1} y1={BARRAS.y1} y2={BARRAS.y1} stroke="var(--linea)" />
              {dias.map((d, i) => {
                const x = G.x0 + paso * i
                const k = d.dominante[campoId]
                const casiDe = d.casiIguales[campoId]
                const otro = casiDe?.find(c => c !== k)
                const relleno = (c: ChokeCampo) => (PATRON[c] === 'liso' ? TONO[TRAMO_DE[c]] : `url(#${PATRON[c]}-${id})`)
                let base = 0
                return (
                  <Tip key={d.dia.getTime()} as="g" data-dia={i} tabIndex={i === activo ? 0 : -1} onTecla={e => mover(e, i)}
                    titulo={`${fechaCorta(d.dia)}${d.horas < 23.99 ? ' · día en curso' : ''}`}
                    pista={k ? `${mayuscula(VERBO[k])} ${SUJETO[k]}${casiDe ? ` · casi iguales: ${lista(casiDe.map(c => SUJETO[c]))}` : ''}` : 'Sin dato del día: no se sabe qué limitó'}
                    filas={[
                      ...(d.potenciales[campoId] ? ORDEN_CHOKE_CAMPO.map((c): [string, string] => [CAJA[TRAMO_DE[c]], d.potenciales[campoId]![c] === null ? 'sin dato' : `${n0(d.potenciales[campoId]![c]!)} bbl/d`]) : []),
                      ...ORDEN_CHOKE.filter(t => d.porChoke[t] >= 0.5).map((t): [string, string] => [`Se trabó ${DONDE[t]}`, `${n0(d.porChoke[t])} bbl`]),
                      ...(d.porChoke['sin-asignar'] >= 0.5 ? [['Sin identificar', `${n0(d.porChoke['sin-asignar'])} bbl`] as [string, string]] : []),
                    ]}>
                    <rect x={x} y={FRANJA.y0} width={paso} height={BARRAS.y1 - FRANJA.y0 + 16} fill="transparent" />
                    {k ? (
                      otro ? (
                        // Casi iguales: la celda partida en diagonal, con los dos tramos.
                        <>
                          <path d={`M${x + 0.5},${FRANJA.y0} H${x + paso - 0.5} L${x + 0.5},${FRANJA.y1} Z`} fill={relleno(k)} />
                          <path d={`M${x + paso - 0.5},${FRANJA.y0} V${FRANJA.y1} H${x + 0.5} Z`} fill={relleno(otro)} />
                        </>
                      ) : <rect x={x + 0.5} y={FRANJA.y0} width={Math.max(0.5, paso - 1)} height={FRANJA.y1 - FRANJA.y0} fill={relleno(k)} />
                    ) : (
                      <rect x={x + 1} y={FRANJA.y0 + 0.5} width={Math.max(0.5, paso - 2)} height={FRANJA.y1 - FRANJA.y0 - 1} fill="none" stroke="var(--tinta3)" strokeDasharray="3 2" />
                    )}
                    {k && conTexto && (
                      <g>
                        <rect x={x + paso / 2 - 9} y={(FRANJA.y0 + FRANJA.y1) / 2 - 7} width={18} height={13} rx={2} fill="var(--panel)" />
                        <text x={x + paso / 2} y={(FRANJA.y0 + FRANJA.y1) / 2 + 3.5} fontSize={9.5} textAnchor="middle" fill="var(--tinta)" className="font-cond">
                          {otro ? `${ABREV[k]}·${ABREV[otro]}` : ABREV[k]}
                        </text>
                      </g>
                    )}
                    {/* Lo perdido ese día, apilado por tramo; lo sin identificar arriba, discontinuo. */}
                    {ORDEN_CHOKE.map(t => {
                      const v = d.porChoke[t]
                      if (v < 0.5) return null
                      const y1 = Y(base), y0 = Y(base + v)
                      base += v
                      return <rect key={t} x={x + paso * 0.18} y={y0} width={paso * 0.64} height={Math.max(0.6, y1 - y0)} fill={TONO[t]} />
                    })}
                    {d.porChoke['sin-asignar'] >= 0.5 && (() => {
                      const y1 = Y(base), y0 = Y(base + d.porChoke['sin-asignar'])
                      return <rect x={x + paso * 0.18} y={y0} width={paso * 0.64} height={Math.max(0.6, y1 - y0)} fill={`url(#sin-${id})`} stroke="var(--tinta3)" strokeWidth={0.8} strokeDasharray="2 1.5" />
                    })()}
                    {/* Las marcas regulares le ceden el sitio a la del último día, que va pegada al borde. */}
                    {(i === dias.length - 1 || (i % cada === 0 && dias.length - 1 - i >= Math.ceil(cada * 0.8))) && (
                      <text x={i === dias.length - 1 && dias.length > 1 ? x + paso : x + paso / 2} y={BARRAS.y1 + 13} fontSize={9.5}
                        textAnchor={i === dias.length - 1 && dias.length > 1 ? 'end' : 'middle'} fill="var(--tinta2)">{fechaCorta(d.dia)}</text>
                    )}
                  </Tip>
                )
              })}
            </svg>
          </div>
        )}
        <div className="hidden md:block print:block"><Leyenda id={id} /></div>
        <Lectura>
          Arriba, una celda por día con lo que limitó: «Po» los pozos, «Pl» la planta, «Af» afuera. Un día
          «casi iguales» lleva la celda partida con los dos. Debajo, lo que se perdió cada día por tramo;
          lo rayado y discontinuo todavía no tiene causa. Toque o pase el cursor por un día para ver sus
          cifras; con el teclado, las flechas pasan de un día a otro.
        </Lectura>
        {/* En el papel, debajo de la franja va la tabla, si cabe en una hoja. */}
        {dias.length > 0 && dias.length <= 62 && <div className="solo-impresion mt-2"><TablaDias dias={dias} campoId={campoId} /></div>}
      </div>
    </Panel>
  )
}

/** En el teléfono la franja no se lee: una línea por semana, la más reciente
 *  arriba, con cuántos días limitó cada tramo (U2 §7.5). */
function Semanas({ dias, campoId }: { dias: DiaChoke[]; campoId: string }) {
  const D = 86_400_000
  // La semana empieza el lunes, en la hora de Colombia (UTC−5).
  const lunes = (d: Date) => d.getTime() - ((new Date(d.getTime() - 5 * 3_600_000).getUTCDay() + 6) % 7) * D
  const semanas = new Map<number, DiaChoke[]>()
  for (const d of dias) { const k = lunes(d.dia); semanas.set(k, [...(semanas.get(k) ?? []), d]) }
  const filas = [...semanas].sort((a, b) => b[0] - a[0])
  const lista = useVerMas(filas)
  const texto = (ds: DiaChoke[]) => {
    const cuenta = ORDEN_CHOKE_CAMPO.map(c => [c, ds.filter(d => d.dominante[campoId] === c).length] as const).filter(([, n]) => n > 0)
    const casi = ds.filter(d => d.casiIguales[campoId]).length
    if (!cuenta.length) return 'sin dato'
    const quien = cuenta.length === 1 ? `${PASADO[cuenta[0]![0]]} ${SUJETO[cuenta[0]![0]]} ${cuenta[0]![1]}` : `limitaron ${cuenta.map(([c, n]) => `${SUJETO[c]} ${n}`).join(', ')}`
    return `${quien} de ${plural(ds.length, 'día', 'días')}${casi ? ` · ${n0(casi)} casi iguales` : ''}`
  }
  return (
    <div className="md:hidden print:hidden">
      <ul className="text-[12px]" aria-label="Qué limitó, semana por semana">
        {lista.visibles.map(([k, ds]) => (
          <li key={k} className="border-b border-[var(--linea2)] py-1.5 last:border-0">
            <b className="font-cond block text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">SEMANA DEL {fechaCorta(new Date(k)).toUpperCase()}</b>
            <span>{texto(ds)}</span>
          </li>
        ))}
      </ul>
      <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
    </div>
  )
}

function Leyenda({ id }: { id: string }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-[var(--tinta2)]">
      {ORDEN_CHOKE_CAMPO.map(c => (
        <span key={c} className="inline-flex items-center gap-1.5">
          <svg width="12" height="10" aria-hidden><rect width="12" height="10" fill={PATRON[c] === 'liso' ? TONO[TRAMO_DE[c]] : `url(#${PATRON[c]}-${id})`} /></svg>
          {ABREV[c]} · {SUJETO[c]}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <svg width="12" height="10" aria-hidden><rect x="0.5" y="0.5" width="11" height="9" fill={`url(#sin-${id})`} stroke="var(--tinta3)" strokeDasharray="2 1.5" /></svg>
        sin identificar
      </span>
    </div>
  )
}

function TablaDias({ dias, campoId }: { dias: DiaChoke[]; campoId: string }) {
  return (
    <table className="tabular w-full text-[9pt]">
      <thead className="text-[var(--tinta3)]">
        <tr><th className="text-left font-normal">Día</th><th className="text-left font-normal">Limitó</th>
          {ORDEN_CHOKE.map(t => <th key={t} className="text-right font-normal">{DONDE[t]}</th>)}<th className="text-right font-normal">sin identificar</th></tr>
      </thead>
      <tbody>
        {dias.map(d => {
          const k = d.dominante[campoId], casi = d.casiIguales[campoId]
          return (
            <tr key={d.dia.getTime()} className="border-t border-[var(--linea2)]">
              <td>{fechaCorta(d.dia)}</td>
              <td>{k ? `${ABREV[k]}${casi ? ` (casi iguales: ${casi.map(c => ABREV[c]).join(', ')})` : ''}` : 'sin dato'}</td>
              {ORDEN_CHOKE.map(t => <td key={t} className="text-right">{n0(d.porChoke[t])}</td>)}
              <td className="text-right">{n0(d.porChoke['sin-asignar'])}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
