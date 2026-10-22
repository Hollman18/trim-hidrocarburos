import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useApp, useRol } from '@/app/store'
import { useTuberia, type TuberiaCampo, type TramoTuberia, type TrenTuberia, type ChokeAnh } from '@/shared/api/choke'
import { useEstadoCampos } from '@/shared/api/diferidos'
import { useEquiposDeHoy } from '@/shared/api/equipos'
import { campoPorId } from '@/entities/campos'
import { AHORA, fechaCorta, fechaHora } from '@/entities/reloj'
import { puedeHacer } from '@/entities/tipos'
import type { Severidad } from '@/entities/tipos'
import { pantallaVisible } from '@/shared/config/producto'
import { Panel, Boton, Hueco } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { desplazable } from '@/shared/ui/alFinal'
import { n0, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { CAJA, DONDE, SUJETO, VERBO, TONO, ESTADO_TRAMO, TEXTO, FALTA_CAPACIDAD, sinFirma, mayuscula, lista } from './palabras'

/** «LA TUBERÍA DEL CAMPO» (U2 §2): ¿dónde está hoy el tope del campo, cuánto
 *  está pasando y qué se perdió en cada tramo? Cuatro tramos en serie
 *  (yacimiento → pozos → planta o estación → afuera), cada uno tan alto como lo
 *  que puede dejar pasar; lo oscuro es lo que pasa ahora y debajo va lo que se
 *  perdió ahí en el período, con el MISMO total del libro.
 *
 *  ISA-101: todo en gris. Lo que limita lleva doble contorno y la palabra
 *  «limita», nunca rojo: todo campo tiene un tramo que limita, y si fuera rojo
 *  habría rojo todo el día. El único color es la marca de un equipo con alarma.
 *  Lo que no se sabe va en gris discontinuo («sin identificar», «sin dato»).
 *
 *  El motor calcula y la pantalla pinta (`useTuberia`): aquí solo se escala el
 *  dibujo y se arman las frases con las cifras que llegan hechas. En el
 *  escritorio la tubería va acostada; en el teléfono, de pie (barras cuyo largo
 *  es lo que deja pasar). En el papel sale el dibujo y la tabla con los mismos
 *  números. */
export function TuberiaDelCampo({ campoId, desde, hasta, periodo, onUbicarPlanta, className }: {
  campoId: string; desde: Date; hasta: Date
  /** El nombre del período de la cabecera («Octubre, en curso»). */
  periodo: string
  /** En Planta: lleva al esquema, donde está la planta por dentro. */
  onUbicarPlanta?: () => void
  className?: string
}) {
  const t = useTuberia(campoId, desde, hasta)
  const estado = useEstadoCampos([campoId])[0]
  const hoy = useEquiposDeHoy([campoId])
  const rol = useRol()
  const abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla)
  const [abierto, setAbierto] = useState<ChokeAnh | null>(null)
  const [tabla, setTabla] = useState(false)
  const nombre = campoPorId(campoId).nombre
  const tiene = (p: string) => rol.pantallas.includes(p) && pantallaVisible(p)
  const ir = (p: string) => (tiene(p) ? () => setPantalla(p) : undefined)
  // La marca de un equipo es la de hoy (su prioridad), nunca la del tramo.
  const marca = (equipo: string): Severidad => hoy(equipo, campoId)?.severidad ?? 0
  const sinTuberia = t.campoDeGas || t.limita === null
  const pozos = estado?.pozos ?? 0

  return (
    <Panel className={cn('mb-2.5 print:break-inside-avoid', className)} titulo="LA TUBERÍA DEL CAMPO"
      extra={<span className="inline-flex items-center gap-1 print:[&_.solo-impresion]:hidden!">qué limita hoy al campo<Info titulo="Lo que limita" texto={TEXTO.limita} /></span>}>
      <div data-tuberia={campoId}>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <small className="text-[10.5px] text-[var(--tinta3)]">
            <span className="solo-impresion">{nombre} · {periodo} · </span>
            potenciales con las pruebas vigentes al {fechaCorta(AHORA)} · {sinTuberia ? 'sin tubería de crudo' : t.capacidades.texto}
            {t.medidor && <span className="block" data-medidor={t.medidor.estado}>{t.medidor.texto}</span>}
          </small>
          {!sinTuberia && (
            <Boton variante="chico" aria-expanded={tabla} onClick={() => setTabla(v => !v)}>{tabla ? 'Ocultar la tabla' : 'Ver como tabla'}</Boton>
          )}
        </div>
        <Lectura>{TEXTO.lectura}</Lectura>

        {sinTuberia ? (
          <Hueco>
            <span className="block">{t.frase}</span>
            {!t.campoDeGas && puedeHacer(rol.puede, 'config:firmar') && tiene('configuracion') && (
              <Boton variante="chico" className="mt-2" onClick={() => setPantalla('configuracion')}>Configurar</Boton>
            )}
          </Hueco>
        ) : (
          <>
            <Acostada t={t} pozos={pozos} marca={marca} abierto={abierto} onTramo={k => setAbierto(a => (a === k ? null : k))}
              onIdentificar={ir('causa')} onAgua={ir('agua')} nombre={nombre} />
            <DePie t={t} pozos={pozos} marca={marca} abierto={abierto} onTramo={k => setAbierto(a => (a === k ? null : k))}
              onAgua={ir('agua')} nombre={nombre} />
            {abierto && (
              <div className="no-imprimir">
                <Detalle x={t.tramos.find(x => x.tramo === abierto)!} t={t} pozos={pozos} onCerrar={() => setAbierto(null)}
                  onAgua={abierto === 'planta' ? ir('agua') : undefined} onUbicar={abierto === 'planta' ? onUbicarPlanta : undefined} />
              </div>
            )}
            {/* En el papel lo plegado sale desplegado: el detalle de cada tramo, de a dos por renglón. */}
            <div className="solo-impresion mt-2 print:grid! print:grid-cols-2 print:gap-x-2">
              {t.tramos.map(x => <Detalle key={x.tramo} x={x} t={t} pozos={pozos} />)}
            </div>
            <FaltaCapacidad t={t} />
            <p className="mt-3 text-[13px] font-medium leading-snug" data-frase>{t.frase}</p>
          </>
        )}

        <Abajo t={t} marca={marca} sinTuberia={sinTuberia} periodo={periodo}
          onAbrir={e => abrirEquipo(e, false)} onIdentificar={ir('causa')} onPorTramo={ir('diferidos')} />

        {!sinTuberia && (tabla
          ? <div className="mt-2.5"><Tabla t={t} pozos={pozos} periodo={periodo} /></div>
          : <div className="solo-impresion mt-2.5"><Tabla t={t} pozos={pozos} periodo={periodo} /></div>)}
        {/* En el papel no hay globos: lo que dicen los ⓘ del dibujo va una vez, al final. */}
        {!sinTuberia && (
          <dl className="solo-impresion mt-2 text-[9pt] text-[var(--tinta2)]">
            {([['Limita', TEXTO.limita], ['Le sobran', TEXTO.sobran], ['El yacimiento', TEXTO.yacimiento], ['Sin identificar', TEXTO.sinIdentificar], ['Gas sin medir', TEXTO.gasSinMedir]] as const)
              .map(([k, v]) => <div key={k}><dt className="inline font-semibold">{k}: </dt><dd className="inline">{v}</dd></div>)}
          </dl>
        )}
      </div>
    </Panel>
  )
}

/* ───────────────────────── lo que comparten los dos dibujos ───────────────────────── */

type Marca = (equipo: string) => Severidad

/** El tramo que limita y su «casi iguales», como se escribe debajo del número. */
function Limita({ x, conInfo = true }: { x: TramoTuberia; conInfo?: boolean }) {
  if (!x.limita && !x.casiIgual) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-[var(--tinta)]" data-limita-marca={x.limita ? '' : undefined}>
      {x.limita && <span className="font-cond tracking-[.08em]">◄ LIMITA</span>}
      {x.casiIgual && <span className="font-cond font-normal tracking-[.06em] text-[var(--tinta2)]">casi iguales</span>}
      {conInfo && x.limita && <Info titulo="Lo que limita" texto={TEXTO.limita} />}
    </span>
  )
}

/** El número de un tramo: si nadie lo firmó, la advertencia va en el número (subrayado discontinuo). */
function Numero({ x, grande = true }: { x: TramoTuberia; grande?: boolean }) {
  if (x.potencialBpd === null) return <span className="text-[11px] text-[var(--tinta3)]">sin dato</span>
  return (
    <b className={cn('tabular leading-tight', grande ? 'text-[15px]' : 'text-[12.5px]', sinFirma(x.estado) && 'underline decoration-dashed decoration-[var(--tinta3)] underline-offset-[3px]')}>
      {n0(x.potencialBpd)}<small className="ml-0.5 text-[10.5px] font-normal text-[var(--tinta3)]">bbl/d</small>
    </b>
  )
}

/** El carril que manda dentro de la planta: lo dice el motor (`trenQueLimita`, el menor de los medidos). */
const esElMenor = (x: TramoTuberia, tr: TrenTuberia) => x.trenQueLimita === tr.tren

/** Los carriles de la planta, en renglones: su capacidad en crudo y, entre paréntesis, en su unidad (U2 §2.3). */
function Carriles({ x, onAgua }: { x: TramoTuberia; onAgua?: () => void }) {
  if (!x.trenes?.length) return null
  return (
    <ul className="mt-1 space-y-0.5 text-[10.5px] leading-snug text-[var(--tinta2)]" aria-label="La planta por dentro">
      {x.trenes.map(tr => (
        <li key={tr.tren} className="flex flex-wrap items-center gap-x-1">
          {!tr.medido ? (
            <>
              <i aria-hidden className="inline-block h-0 w-3 border-t border-dashed border-[var(--tinta3)]" />
              <span>{tr.tren} · sin medir</span>
              <Info titulo="Gas sin medir" texto={TEXTO.gasSinMedir} />
            </>
          ) : tr.tren === 'crudo' ? (
            <span>crudo <span className="tabular">{n0(tr.capacidad)}</span>{esElMenor(x, tr) && <b className="font-semibold text-[var(--tinta)]"> · el menor</b>}</span>
          ) : (
            <span>
              {tr.tren} ≈ <span className="tabular">{tr.enCrudo === null ? '—' : n0(tr.enCrudo)}</span>
              <span className="text-[var(--tinta3)]"> ({n0(tr.capacidad)} {tr.unidad})</span>
              {esElMenor(x, tr) && <b className="font-semibold text-[var(--tinta)]"> · el menor</b>}
            </span>
          )}
          {tr.tren === 'agua' && onAgua && (
            <button onClick={onAgua} className="no-imprimir cursor-pointer text-[10.5px] text-[var(--tinta)] underline decoration-dotted underline-offset-2 hover:decoration-solid">
              Ver la tubería del agua
            </button>
          )}
        </li>
      ))}
      {x.disponibleHoy && (
        <li className="flex items-center gap-1" data-hoy>
          <i aria-hidden className="inline-block h-0 w-3 border-t border-dotted border-[var(--tinta2)]" />
          <span>{x.disponibleHoy.texto}</span>
        </li>
      )}
    </ul>
  )
}

/** Las marcas de los equipos con alarma que están frenando el tramo ahora (◆1 P-201B). */
function EquiposEnAlarma({ t, k, marca }: { t: TuberiaCampo; k: ChokeAnh; marca: Marca }) {
  const eqs = t.perdiendoAhora.filter(p => p.tramo === k && marca(p.equipo) > 0)
  if (!eqs.length) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      {eqs.map(p => (
        <span key={p.equipo} className="inline-flex items-center gap-1 font-sans normal-case tracking-normal text-[var(--tinta)]">
          <MarcaPrioridad s={marca(p.equipo)} tamano={12} /><b className="text-[11px]">{p.equipo}</b>
        </span>
      ))}
    </span>
  )
}

/** Lo que el lector oye del dibujo entero, en una frase (U2 §2.8). */
function resumenDe(t: TuberiaCampo, nombre: string): string {
  const lim = t.tramos.find(x => x.limita)
  const k = t.limita!
  const otros = t.tramos.filter(x => x.tramo !== 'reservorio' && !x.limita)
  const perdiendo = t.perdiendoAhoraBpd
  return [
    `Tubería de ${nombre}.`,
    lim ? `${mayuscula(VERBO[k])} ${SUJETO[k]}: ${n0(lim.potencialBpd ?? 0)} barriles por día.` : '',
    t.casiIguales ? `${mayuscula(lista(t.casiIguales.map(c => SUJETO[c])))} están casi iguales.` : '',
    ...otros.map(x => x.potencialBpd === null ? `${CAJA[x.tramo]}: sin dato.`
      : `${CAJA[x.tramo]}: ${n0(x.potencialBpd)}${x.holguraBpd !== null ? `, le sobran ${n0(x.holguraBpd)}` : ''}${sinFirma(x.estado) ? ', sin firmar' : ''}.`),
    `Pasa hoy: ${n0(t.pasaHoyBpd)}.`,
    `Perdiéndose ahora: ${n0(perdiendo)}${t.perdiendoAhora.length ? `, de ellos ${lista(t.perdiendoAhora.map(p => p.tramo
      ? `${n0(p.bpd)} ${DONDE[p.tramo]} por ${p.equipo}` : `${n0(p.bpd)} sin identificar, ${p.equipo}`))}` : ''}.`,
  ].filter(Boolean).join(' ')
}

/** Las flechas pasan de un tramo a otro; Enter (el botón) abre su detalle (U2 §2.8). */
function useFlechas() {
  const botones = useRef<Array<HTMLButtonElement | null>>([])
  const alPulsar = (e: KeyboardEvent, i: number) => {
    const n = botones.current.length
    const destino = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1
      : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null
    if (destino === null) return
    e.preventDefault()
    botones.current[Math.max(0, Math.min(n - 1, destino))]?.focus()
  }
  return { botones, alPulsar }
}

/** El nombre de un tramo para el lector: el tramo, su número, si limita y lo que se pierde ahí. */
const leidoDe = (x: TramoTuberia, pozos: number) => [
  `${CAJA[x.tramo]}${x.tramo === 'pozo' && pozos ? `, ${plural(pozos, 'pozo', 'pozos')}` : ''}`,
  x.tramo === 'reservorio' ? 'va con los pozos' : x.potencialBpd === null ? 'sin dato' : `${n0(x.potencialBpd)} barriles por día${sinFirma(x.estado) ? ', sin firmar' : ''}`,
  x.limita ? 'limita' : '', x.casiIgual ? 'casi iguales' : '',
  x.holguraBpd !== null && !x.limita && x.tramo !== 'reservorio' ? `le sobran ${n0(x.holguraBpd)}` : '',
  x.perdiendoAhoraBpd > 0 ? `perdiéndose ahora ${n0(x.perdiendoAhoraBpd)}` : '',
  `se trabó en el período ${n0(x.perdidoBbl)} barriles`,
].filter(Boolean).join(', ') + '. Abre su detalle.'

/* ───────────────────────── escritorio: la tubería acostada ───────────────────────── */

/** El tubo más ancho mide esto; los demás, en proporción. El eje empieza en
 *  cero: una escala que exagerara la diferencia mentiría (U2 §2.3). */
const ALTO = 150
/** El grosor del borde de abajo de cada caja: la parte oscura se mide desde el
 *  borde de afuera para que «lo que pasa hoy» sea una sola línea recta. */
const BORDE = { normal: 1, limita: 4, casi: 3, sinDato: 1 }

function Acostada({ t, pozos, marca, abierto, onTramo, onIdentificar, onAgua, nombre }: {
  t: TuberiaCampo; pozos: number; marca: Marca; abierto: ChokeAnh | null; onTramo: (k: ChokeAnh) => void
  onIdentificar?: () => void; onAgua?: () => void; nombre: string
}) {
  const { botones, alPulsar } = useFlechas()
  const numeros = t.tramos.flatMap(x => (x.potencialBpd === null ? [] : [x.potencialBpd]))
  const tope = Math.max(1, ...numeros, t.pasaHoyBpd)
  const px = (v: number) => Math.max(2, Math.round((v / tope) * ALTO))
  const pozo = t.tramos.find(x => x.tramo === 'pozo')
  const sinTramoAhora = t.sinTramoAhoraBpd
  const rejilla = 'grid gap-x-4 [grid-template-columns:minmax(64px,.5fr)_repeat(3,minmax(0,1fr))_minmax(104px,.72fr)]'
  const titulo = 'font-cond flex min-h-[28px] flex-wrap items-end gap-x-2 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]'

  return (
    <div className="hidden md:block print:block print:[&_.solo-impresion]:hidden!">
      <div role="group" aria-label={resumenDe(t, nombre)} className={rejilla} data-dibujo="acostada">
        {/* Los rótulos */}
        {t.tramos.map(x => (
          <span key={`r-${x.tramo}`} className={titulo}>
            <span>{CAJA[x.tramo].toUpperCase()}{x.tramo === 'pozo' && pozos ? ` · ${pozos}` : ''}</span>
            <EquiposEnAlarma t={t} k={x.tramo} marca={marca} />
          </span>
        ))}
        <span className={cn(titulo, 'border-l border-dashed border-[var(--tinta3)] pl-3')}>SIN IDENTIFICAR</span>

        {/* El tubo: cada caja tan alta como lo que deja pasar; lo oscuro, lo que pasa hoy. */}
        {t.tramos.map((x, i) => {
          const conNumero = x.potencialBpd !== null
          const tipo = x.tramo === 'reservorio' ? 'normal' : !conNumero ? 'sinDato' : x.casiIgual ? 'casi' : x.limita ? 'limita' : 'normal'
          const alto = x.tramo === 'reservorio' ? px(pozo?.potencialBpd ?? tope) : conNumero ? px(x.potencialBpd!) : ALTO
          const oscuro = conNumero ? Math.max(0, Math.min(alto, px(t.pasaHoyBpd)) - BORDE[tipo]) : 0
          return (
            <span key={`t-${x.tramo}`} className="relative flex items-end" style={{ height: ALTO + 6 }}>
              {i > 0 && <span aria-hidden className="absolute -left-3.5 text-[11px] leading-none text-[var(--tinta3)]" style={{ bottom: Math.max(2, px(t.pasaHoyBpd) / 2 - 6) }}>→</span>}
              <button ref={el => { botones.current[i] = el }} onKeyDown={e => alPulsar(e, i)} onClick={() => onTramo(x.tramo)}
                aria-expanded={abierto === x.tramo} aria-label={leidoDe(x, pozos)} data-tramo={x.tramo}
                data-limita={x.limita ? '' : undefined} data-casi={x.casiIgual ? '' : undefined}
                className={cn('relative block min-w-0 flex-1 cursor-pointer overflow-hidden rounded-[3px] text-left',
                  x.tramo === 'reservorio' ? 'border-0'
                    : tipo === 'sinDato' ? 'border border-dashed border-[var(--tinta3)] bg-transparent'
                      : tipo === 'limita' ? 'border-[4px] border-double border-[var(--tinta)] bg-[var(--panel2)]'
                        : tipo === 'casi' ? 'border-[3px] border-dashed border-[var(--tinta)] bg-[var(--panel2)]'
                          : 'border border-[var(--tinta3)] bg-[var(--panel2)]',
                  abierto === x.tramo && 'outline outline-2 outline-offset-2 outline-[var(--acento)]')}
                style={{ height: alto, ...(x.tramo === 'reservorio' ? { background: 'repeating-linear-gradient(135deg, var(--panel2) 0 5px, var(--linea2) 5px 7px)' } : {}) }}>
                {oscuro > 0 && <span aria-hidden data-pasa className="absolute inset-x-0 bottom-0 bg-[var(--dato-2)]" style={{ height: oscuro }} />}
                {tipo === 'sinDato' && <span className="absolute inset-0 grid place-items-center text-[11px] text-[var(--tinta3)]">sin dato</span>}
              </button>
              {x.tramo === 'exportacion' && (
                <span aria-hidden className="ml-1 shrink-0 whitespace-nowrap text-[10.5px] text-[var(--tinta3)]" style={{ marginBottom: Math.max(0, px(t.pasaHoyBpd) / 2 - 7) }}>→ venta</span>
              )}
            </span>
          )
        })}
        {/* «Sin identificar» no es un tramo: es lo que todavía no se sabe. Va aparte y no se reparte. */}
        <span className="flex items-end border-l border-dashed border-[var(--tinta3)] pl-3" style={{ height: ALTO + 6 }}>
          <span className="block w-full rounded-[3px] border border-dashed border-[var(--tinta3)] px-2 py-1.5 text-[10.5px] leading-snug text-[var(--tinta2)]" data-sin-identificar>
            <span className="flex flex-wrap items-center gap-x-1"><b className="tabular text-[13px] text-[var(--tinta)]">{n0(t.sinTramoBbl)}</b> bbl en el período<Info titulo="Sin identificar" texto={TEXTO.sinIdentificar} /></span>
            {sinTramoAhora > 0 && <span className="block"><span className="tabular">{n0(sinTramoAhora)}</span> bbl/d perdiéndose ahora</span>}
            {t.sinTramoEquipos.length > 0 && <span className="block truncate">{t.sinTramoEquipos.slice(0, 3).map(e => e.equipo).join(' · ')}</span>}
            {onIdentificar && t.sinTramoBbl + sinTramoAhora > 0 && <Boton variante="chico" className="mt-1" onClick={onIdentificar}>Identificar</Boton>}
          </span>
        </span>

        {/* Debajo de cada caja: su número, si limita, lo que le sobra y la planta por dentro. */}
        {t.tramos.map(x => (
          <span key={`n-${x.tramo}`} className="min-w-0 pt-1.5 text-[11px] leading-snug">
            {x.tramo === 'reservorio' ? (
              <span className="flex flex-wrap items-center gap-x-1 text-[var(--tinta2)]">va con los pozos<Info titulo="El yacimiento" texto={TEXTO.yacimiento} /></span>
            ) : (
              <>
                <Limita x={x} />
                <span className="block"><Numero x={x} /></span>
                {x.holguraBpd !== null && !x.limita && (
                  <span className="flex flex-wrap items-center gap-x-1 text-[var(--tinta2)]">le sobran <span className="tabular">{n0(x.holguraBpd)}</span><Info titulo="Le sobran" texto={TEXTO.sobran} /></span>
                )}
                <small className="block text-[10.5px] text-[var(--tinta3)]">{x.tramo === 'pozo' ? ESTADO_TRAMO[x.estado] : sinFirma(x.estado) ? <span className="inline-flex items-center gap-1"><i aria-hidden className="inline-block h-0 w-3 border-t border-dashed border-[var(--tinta3)]" />{ESTADO_TRAMO[x.estado]}</span> : ESTADO_TRAMO[x.estado]}</small>
                {x.tramo === 'planta' && <Carriles x={x} onAgua={onAgua} />}
                {x.tramo === 'exportacion' && x.subniveles && (
                  <ul className="mt-1 text-[10.5px] text-[var(--tinta2)]">
                    {x.subniveles.map(s => <li key={s.nombre}>{s.nombre}: <span className="tabular">{n0(s.potencialBpd)}</span></li>)}
                  </ul>
                )}
              </>
            )}
          </span>
        ))}
        <span />
      </div>
    </div>
  )
}

/* ───────────────────────── teléfono: la tubería de pie ───────────────────────── */

function DePie({ t, pozos, marca, abierto, onTramo, onAgua, nombre }: {
  t: TuberiaCampo; pozos: number; marca: Marca; abierto: ChokeAnh | null; onTramo: (k: ChokeAnh) => void
  onAgua?: () => void; nombre: string
}) {
  const { botones, alPulsar } = useFlechas()
  const numeros = t.tramos.flatMap(x => (x.potencialBpd === null ? [] : [x.potencialBpd]))
  const tope = Math.max(1, ...numeros, t.pasaHoyBpd)
  const pct = (v: number) => `${Math.max(1, Math.min(100, (v / tope) * 100))}%`
  const pozo = t.tramos.find(x => x.tramo === 'pozo')
  return (
    <div role="group" aria-label={resumenDe(t, nombre)} className="md:hidden print:hidden" data-dibujo="de-pie">
      {t.tramos.map((x, i) => {
        const conNumero = x.potencialBpd !== null
        const largo = x.tramo === 'reservorio' ? pct(pozo?.potencialBpd ?? tope) : conNumero ? pct(x.potencialBpd!) : '100%'
        const oscuro = conNumero && x.potencialBpd! > 0 ? `${Math.min(100, (t.pasaHoyBpd / x.potencialBpd!) * 100)}%` : '0%'
        return (
          <div key={x.tramo} className="border-b border-[var(--linea2)] py-1.5 last:border-0">
            {/* La barra va sola en su renglón (sin ⓘ al lado): así todas miden contra el mismo ancho. */}
            <button ref={el => { botones.current[i] = el }} onKeyDown={e => alPulsar(e, i)} onClick={() => onTramo(x.tramo)}
              aria-expanded={abierto === x.tramo} aria-label={leidoDe(x, pozos)} data-tramo={x.tramo} data-limita={x.limita ? '' : undefined}
              className="block w-full cursor-pointer text-left">
              <span className="font-cond flex flex-wrap items-center gap-x-2 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
                <span>{CAJA[x.tramo].toUpperCase()}{x.tramo === 'pozo' && pozos ? ` · ${pozos}` : ''}</span>
                <EquiposEnAlarma t={t} k={x.tramo} marca={marca} />
                {(x.limita || x.casiIgual) && <span className="ml-auto text-[var(--tinta)]">{x.limita ? '◄ LIMITA' : ''}{x.casiIgual ? `${x.limita ? ' · ' : ''}casi iguales` : ''}</span>}
              </span>
              <span className="mt-1 flex items-center gap-2">
                <span className="relative h-4 flex-1">
                  <span aria-hidden className={cn('absolute inset-y-0 left-0 overflow-hidden rounded-[2px]',
                    x.tramo === 'reservorio' ? '' : !conNumero ? 'border border-dashed border-[var(--tinta3)]'
                      : x.casiIgual ? 'border-2 border-dashed border-[var(--tinta)] bg-[var(--panel2)]'
                        : x.limita ? 'border-[4px] border-double border-[var(--tinta)] bg-[var(--panel2)]' : 'border border-[var(--tinta3)] bg-[var(--panel2)]')}
                    style={{ width: largo, ...(x.tramo === 'reservorio' ? { background: 'repeating-linear-gradient(135deg, var(--panel2) 0 5px, var(--linea2) 5px 7px)' } : {}) }}>
                    {conNumero && x.tramo !== 'reservorio' && <span className="block h-full bg-[var(--dato-2)]" style={{ width: oscuro }} />}
                  </span>
                </span>
                <span className="w-[70px] shrink-0 text-right">{x.tramo === 'reservorio' ? '' : <Numero x={x} grande={false} />}</span>
              </span>
            </button>
            {x.tramo === 'reservorio' && (
              <small className="flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta2)]">va con los pozos<Info titulo="El yacimiento" texto={TEXTO.yacimiento} /></small>
            )}
            {x.tramo !== 'reservorio' && conNumero && (
              <small className="flex flex-wrap items-center gap-x-1 text-[10.5px] leading-snug text-[var(--tinta2)]">
                {[x.holguraBpd !== null && !x.limita ? `le sobran ${n0(x.holguraBpd)}` : '', x.tramo === 'pozo' ? ESTADO_TRAMO[x.estado] : sinFirma(x.estado) ? `┄ ${ESTADO_TRAMO[x.estado]}` : ESTADO_TRAMO[x.estado]].filter(Boolean).join(' · ')}
                {x.limita && <Info titulo="Lo que limita" texto={TEXTO.limita} />}
              </small>
            )}
            {x.tramo === 'planta' && <Carriles x={x} onAgua={onAgua} />}
            {x.tramo === 'exportacion' && x.subniveles && (
              <small className="block text-[10.5px] text-[var(--tinta2)]">{x.subniveles.map(s => `${s.nombre}: ${n0(s.potencialBpd)}`).join(' · ')}</small>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ───────────────────────── el detalle de un tramo ───────────────────────── */

function Detalle({ x, t, pozos, onCerrar, onAgua, onUbicar }: {
  x: TramoTuberia; t: TuberiaCampo; pozos: number; onCerrar?: () => void; onAgua?: () => void; onUbicar?: () => void
}) {
  const ahora = t.perdiendoAhora.filter(p => p.tramo === x.tramo)
  return (
    <section aria-label={`Detalle: ${CAJA[x.tramo]}`} className="mt-2 rounded-sm border border-[var(--linea)] bg-[var(--panel2)] px-3 py-2 text-[11.5px] print:mt-1.5 print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <b className="text-[12.5px]">{CAJA[x.tramo]}{x.tramo === 'pozo' && pozos ? ` · ${plural(pozos, 'pozo', 'pozos')}` : ''}</b>
        {onCerrar && <Boton variante="chico" onClick={onCerrar}>Cerrar</Boton>}
      </div>
      <p className="text-[var(--tinta2)]">{x.explica}</p>
      <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
        <dt className="text-[var(--tinta3)]">Lo que puede dejar pasar</dt>
        <dd className="tabular">{x.tramo === 'reservorio' ? 'va con los pozos' : x.potencialBpd === null ? 'sin dato' : `${n0(x.potencialBpd)} bbl/d · ${ESTADO_TRAMO[x.estado]}`}</dd>
        <dt className="text-[var(--tinta3)]">De dónde sale</dt><dd>{x.fuente}</dd>
        {x.pruebaMasVieja && <><dt className="text-[var(--tinta3)]">Las pruebas</dt><dd>{x.pruebaMasVieja.texto}</dd></>}
        {x.holguraBpd !== null && !x.limita && x.tramo !== 'reservorio' && <><dt className="text-[var(--tinta3)]">Le sobran</dt><dd className="tabular">{n0(x.holguraBpd)} bbl/d</dd></>}
        {x.limita && <><dt className="text-[var(--tinta3)]">Lo que limita</dt><dd>es el tramo más angosto hoy: el tope del campo</dd></>}
        <dt className="text-[var(--tinta3)]">Perdiéndose ahora</dt>
        <dd className="tabular">{ahora.length ? ahora.map(p => `${p.equipo} ${n0(p.bpd)} bbl/d (${p.listaPozos.length <= 3 ? lista(p.listaPozos) : plural(p.pozos, 'pozo', 'pozos')}, desde ${fechaHora(p.desde)})`).join(' · ') : 'nada'}</dd>
        <dt className="text-[var(--tinta3)]">Se trabó en el período</dt>
        <dd className="tabular">{n0(x.perdidoBbl)} bbl{x.equiposTop.length ? ` · ${x.equiposTop.map(e => `${e.equipo} ${n0(e.bbl)}`).join(' · ')}` : ''}</dd>
      </dl>
      {(onAgua || onUbicar) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {onAgua && <Boton variante="chico" onClick={onAgua}>Ver la tubería del agua</Boton>}
          {onUbicar && <Boton variante="chico" onClick={onUbicar}>Ver la planta en el esquema</Boton>}
        </div>
      )}
    </section>
  )
}

/** Falta una capacidad: no se puede decir qué limita sin ella (U2 §1.5). */
function FaltaCapacidad({ t }: { t: TuberiaCampo }) {
  const faltan = t.tramos.filter(x => x.estado === 'sin-dato' && FALTA_CAPACIDAD[x.tramo]).map(x => FALTA_CAPACIDAD[x.tramo]!)
  if (!faltan.length) return null
  return <p className="mt-2 text-[11.5px] text-[var(--tinta2)]">No se puede decir qué limita: falta la capacidad de {lista(faltan)}. La firma el administrador.</p>
}

/* ───────────────────────── las tres filas de abajo ───────────────────────── */

function Abajo({ t, marca, sinTuberia, periodo, onAbrir, onIdentificar, onPorTramo }: {
  t: TuberiaCampo; marca: Marca; sinTuberia: boolean; periodo: string
  onAbrir: (equipo: string) => void; onIdentificar?: () => void; onPorTramo?: () => void
}) {
  const perdiendo = t.perdiendoAhoraBpd
  const rotulo = 'font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]'
  const fila = 'flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--linea2)] py-1.5 text-[12px]'
  return (
    <div className="mt-2">
      {!sinTuberia && (
        <div className={fila}>
          <span className="inline-flex items-center gap-1.5"><i aria-hidden className="inline-block size-2.5 bg-[var(--dato-2)]" /><span className={rotulo}>PASA HOY</span></span>
          <b className="tabular ml-auto">{n0(t.pasaHoyBpd)} <small className="font-normal text-[var(--tinta3)]">bbl/d</small></b>
        </div>
      )}
      {!sinTuberia && (
        <div className="border-t border-[var(--linea2)] py-1.5" data-perdiendo>
          <div className="flex flex-wrap items-center gap-x-2 text-[12px]">
            <span className={rotulo}>PERDIÉNDOSE AHORA</span>
            <b className="tabular ml-auto">{n0(perdiendo)} <small className="font-normal text-[var(--tinta3)]">bbl/d</small></b>
          </div>
          {t.perdiendoAhora.length === 0 && <p className="text-[11.5px] text-[var(--tinta2)]">Nada: todos los pozos con prueba están produciendo.</p>}
          <ul>
            {t.perdiendoAhora.map(p => {
              const s = p.tramo ? marca(p.equipo) : 0
              return (
                <li key={`${p.tramo}|${p.equipo}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-0.5 pl-3 text-[11.5px]">
                  {p.tramo === null
                    ? <i aria-hidden className="inline-block h-2.5 w-3 rounded-[1px] border border-dashed border-[var(--tinta3)]" />
                    : <i aria-hidden className="inline-block h-2.5 w-3 rounded-[1px]" style={{ background: TONO[p.tramo] }} />}
                  <span className="w-[104px] shrink-0 text-[var(--tinta2)]">{p.tramo ? DONDE[p.tramo] : 'sin identificar'}</span>
                  <b className="tabular w-[52px] shrink-0 text-right">{n0(p.bpd)}</b>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    {s > 0 && <MarcaPrioridad s={s} tamano={12} />}
                    <span>{p.equipo} · {p.tramo ? `cerró ${p.listaPozos.length <= 3 ? lista(p.listaPozos) : plural(p.pozos, 'pozo', 'pozos')}` : 'todavía sin causa'} · desde {fechaHora(p.desde)}</span>
                  </span>
                  <span className="ml-auto">
                    {p.tramo === null
                      ? onIdentificar && <Boton variante="chico" onClick={onIdentificar}>Identificar</Boton>
                      : <Boton variante="chico" onClick={() => onAbrir(p.equipo)} aria-label={`Abrir ${p.equipo}`}>Abrir</Boton>}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <SeTrabo t={t} periodo={periodo} onPorTramo={onPorTramo} />
    </div>
  )
}

/** «Se trabó en el período», por tramo, con los equipos que más pesan y «sin
 *  identificar» aparte. El total es el diferido del libro (U2 §0, principio 6). */
export function SeTrabo({ t, periodo, onPorTramo, encabezado = true }: { t: TuberiaCampo; periodo: string; onPorTramo?: () => void; encabezado?: boolean }) {
  const rotulo = 'font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]'
  const equipos = (xs: Array<{ equipo: string; bbl: number }>, conBbl: boolean) => xs.length
    ? ` (${xs.slice(0, 3).map(e => (conBbl ? `${e.equipo} ${n0(e.bbl)}` : e.equipo)).join(' · ')})` : ''
  const renglon = (clave: string, dondeTxt: string, bbl: number, eqs: string, discontinuo: boolean, tono?: string): ReactNode => (
    <li key={clave} className="flex items-baseline gap-x-2 py-0.5 text-[11.5px]" data-tramo-periodo={clave} data-bbl={bbl}>
      <i aria-hidden className={cn('inline-block h-2.5 w-3 shrink-0 translate-y-[1px] rounded-[1px]', discontinuo && 'border border-dashed border-[var(--tinta3)]')}
        style={discontinuo ? undefined : { background: tono }} />
      <span className="w-[104px] shrink-0 text-[var(--tinta2)]">{dondeTxt}</span>
      <b className="tabular w-[52px] shrink-0 text-right">{n0(bbl)}</b>
      <span className="min-w-0 text-[var(--tinta2)]">{eqs}</span>
    </li>
  )
  return (
    <div className="border-t border-[var(--linea2)] py-1.5" data-se-trabo data-total={t.diferido}>
      {encabezado && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
          <span className={rotulo}>SE TRABÓ EN EL PERÍODO</span>
          <span className="text-[11px] text-[var(--tinta3)]">{periodo}</span>
          <b className="tabular ml-auto">{n0(t.diferido)} <small className="font-normal text-[var(--tinta3)]">bbl</small></b>
          {onPorTramo && t.diferido > 0 && <Boton variante="chico" onClick={onPorTramo}>Ver por dónde se trabó</Boton>}
        </div>
      )}
      {t.diferido <= 0 ? <p className="text-[11.5px] text-[var(--tinta2)]">Nada se trabó en el período ({periodo.toLowerCase()}).</p> : (
        <ul className="pl-3">
          {t.perdidoPeriodo.map(p => renglon(p.tramo, DONDE[p.tramo], p.bbl, equipos(p.equiposTop, false), false, TONO[p.tramo]))}
          {renglon('sin-asignar', 'sin identificar', t.sinTramoBbl, equipos(t.sinTramoEquipos, true), true)}
        </ul>
      )}
    </div>
  )
}

/* ───────────────────────── la tabla equivalente ───────────────────────── */

/** «Ver como tabla»: los mismos números del dibujo (U2 §2.2). Es la que se imprime. */
function Tabla({ t, pozos, periodo }: { t: TuberiaCampo; pozos: number; periodo: string }) {
  const sinTramoAhora = t.sinTramoAhoraBpd, perdiendo = t.perdiendoAhoraBpd
  const th = 'py-1 pr-2 text-left font-normal'
  return (
    <div className="overflow-x-auto" {...desplazable('La tubería del campo como tabla')}>
      <table className="tabular w-full min-w-[640px] text-[11px]">
        <caption className="pb-1 text-left text-[10.5px] text-[var(--tinta3)]">La tubería del campo, en números · se trabó: {periodo.toLowerCase()}</caption>
        <thead className="text-[9.5px] text-[var(--tinta3)]">
          <tr>
            <th className={th}>Tramo</th><th className={cn(th, 'text-right')}>Lo que puede dejar pasar · bbl/d</th><th className={th}>De dónde sale</th>
            <th className={cn(th, 'text-right')}>Le sobran · bbl/d</th><th className={cn(th, 'text-right')}>Perdiéndose ahora · bbl/d</th><th className={cn(th, 'text-right')}>Se trabó · bbl</th>
          </tr>
        </thead>
        <tbody>
          {t.tramos.map(x => (
            <tr key={x.tramo} className="border-t border-[var(--linea2)] align-top">
              <td className="py-1 pr-2">{CAJA[x.tramo]}{x.tramo === 'pozo' && pozos ? ` (${pozos})` : ''}{x.limita ? ' ◄ limita' : ''}{x.casiIgual ? ' · casi iguales' : ''}</td>
              <td className="py-1 pr-2 text-right">{x.tramo === 'reservorio' ? 'va con los pozos' : x.potencialBpd === null ? 'sin dato' : `${n0(x.potencialBpd)}${sinFirma(x.estado) ? ' · sin firmar' : ''}`}</td>
              <td className="max-w-[260px] py-1 pr-2 text-[10.5px] text-[var(--tinta2)]">{x.fuente}</td>
              <td className="py-1 pr-2 text-right">{x.holguraBpd === null || x.limita ? '—' : n0(x.holguraBpd)}</td>
              <td className="py-1 pr-2 text-right">{n0(x.perdiendoAhoraBpd)}</td>
              <td className="py-1 text-right">{n0(x.perdidoBbl)}</td>
            </tr>
          ))}
          <tr className="border-t border-[var(--linea2)]">
            <td className="py-1 pr-2">┄ Sin identificar</td><td className="py-1 pr-2 text-right">—</td><td className="py-1 pr-2 text-[10.5px] text-[var(--tinta2)]">no es un tramo: lo que todavía no tiene causa</td>
            <td className="py-1 pr-2 text-right">—</td><td className="py-1 pr-2 text-right">{n0(sinTramoAhora)}</td><td className="py-1 text-right">{n0(t.sinTramoBbl)}</td>
          </tr>
          <tr className="border-t-2 border-[var(--linea)] font-semibold">
            <td className="py-1 pr-2">Total</td><td className="py-1 pr-2 text-right">pasa hoy {n0(t.pasaHoyBpd)}</td><td className="py-1 pr-2" /><td className="py-1 pr-2" />
            <td className="py-1 pr-2 text-right">{n0(perdiendo)}</td><td className="py-1 text-right">{n0(t.diferido)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
