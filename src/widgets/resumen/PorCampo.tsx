import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Libro, FilaEquipo, EquipoSinCosto } from '@/entities/libro'
import type { EquipoVivo } from '@/entities/equipo-vivo'
import { TIPO_CAUSA, type TipoCausa } from '@/entities/causa-senal'
import { campoPorId } from '@/entities/campos'
import { SIN_META } from '@/entities/configuracion'
import { useEquiposDeHoy } from '@/shared/api/equipos'
import { BarraMeta } from '@/shared/ui/BarraMeta'
import { Boton, Chip } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas, VISIBLES } from '@/shared/ui/listaCorta'
import { NOMBRE_PRIORIDAD } from '@/shared/lib/prioridad'
import { n0, plural, pctParte } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { marcaDeFila } from '@/widgets/diferidos/marca'
import { LeyendaTramos } from '@/widgets/diferidos/tramos'
import { DondeSeTraboCampo, LineaPerdida } from './DondeSeTrabo'

type FilaCampo = Libro['porCampo'][number]

/** Cuántas veces paró el equipo en el período. Bombas de la línea y
 *  electrosumergibles: las fallas y los disparos que trae el libro en su fila
 *  (las de su historia que caen en el período, también la abierta y las que el
 *  tanque absorbió; un disparo no es una falla). Lo demás (servicios, lo
 *  programado, lo declarado, lo sin identificar): las paradas con barriles. */
type Veces = { fallas: number; disparos: number } | { paradas: number }
const vecesDe = (f: FilaEquipo): Veces =>
  f.fallas !== undefined ? { fallas: f.fallas, disparos: f.disparos ?? 0 } : { paradas: f.eventos }
const textoVeces = (v: Veces) => 'paradas' in v ? plural(v.paradas, 'parada', 'paradas')
  : [v.fallas ? plural(v.fallas, 'falla', 'fallas') : 'sin fallas', ...(v.disparos ? [plural(v.disparos, 'disparo', 'disparos')] : [])].join(' · ')

/** Un renglón de la lista de un campo: un equipo con barriles (`porEquipo`)
 *  o, al final, uno que falló sin costar crudo (`sinCosto`: sin barriles). */
interface Renglon { campoId: string; equipo: string; tipo: TipoCausa; veces: string; bbl?: number }

/** «POR CAMPO» del Resumen del gerente: de qué campo viene el diferido y, con
 *  un toque, qué equipos de ese campo lo cargaron (equipo, lo que es, cuántas
 *  veces falló, barriles y su parte del campo) y, al final, los que fallaron
 *  sin costar crudo (`Libro.sinCosto`, sin barriles). Sin señales, tags ni
 *  tolerancias. En el papel sale desplegado. Un toque en un equipo abre su
 *  ficha ejecutiva, como en «Por equipo».
 *
 *  Debajo de las barras de cada campo, siempre a la vista: dónde se trabó en
 *  el período (U2 §9.2), con la frase del motor. Al final, la leyenda de los
 *  tramos y la pérdida, aparte. */
export function PorCampo({ lb, campos, desde, hasta, onAbrir, onCampo }: {
  lb: Libro; campos: string[]
  /** El período del libro: el mismo con que se pide dónde se trabó cada campo. */
  desde: Date; hasta: Date
  onAbrir: (campoId: string, equipo: string) => void
  onCampo: (campoId: string) => void
}) {
  // El estado de hoy de los equipos (para la marca), un pedido por lote.
  const equipoHoy = useEquiposDeHoy(campos)
  const dias = Math.max(1 / 24, lb.meta.dias)
  const titulo = 'font-cond text-[12px] font-semibold tracking-[.11em] text-[var(--tinta3)]'
  // Las cuatro columnas: en el teléfono, nombre y total arriba y las dos barras debajo;
  // en uno angosto (menos de 380 px) cada barra en su renglón: lado a lado no cabían sus cifras.
  const rejilla = 'grid grid-cols-2 items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(110px,1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_64px]'
  const angosto = { prod: 'max-[379px]:col-span-2', dif: 'max-[379px]:col-span-2 max-[379px]:col-start-1 max-[379px]:row-start-3' }

  return (
    <section className="rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
      <h3 className={`${titulo} mb-1`}>POR CAMPO</h3>
      <Lectura>
        Toque un campo para ver sus equipos, de más a menos barriles: cuántas veces fallaron (un
        disparo no es falla) y su parte del diferido del campo; al final, los que fallaron sin costar
        crudo. Toque un equipo para abrir su ficha. «Dónde se trabó» reparte los barriles diferidos
        del campo entre el yacimiento, los pozos, la planta o estación y afuera; lo que nadie ha
        identificado va aparte, rayado. Suma lo mismo que la cifra del campo.
      </Lectura>
      <div className={`${rejilla} pb-1 text-[12px] text-[var(--tinta3)]`} aria-hidden>
        <span className={`col-start-1 row-start-2 sm:col-start-2 sm:row-start-1 ${angosto.prod}`}>producción / meta · bbl/d</span>
        <span className={`col-start-2 row-start-2 sm:col-start-3 sm:row-start-1 ${angosto.dif}`}>diferido / máx. · bbl/d</span>
        <span className="col-start-2 row-start-1 justify-self-end sm:col-start-4">bbl diferidos</span>
      </div>
      {lb.porCampo.map(c => (
        <Campo key={c.campoId} c={c} dias={dias} rejilla={rejilla} angosto={angosto} desde={desde} hasta={hasta}
          filas={lb.porEquipo.filter(f => f.campoId === c.campoId)}
          sinCosto={lb.sinCosto.filter(x => x.campoId === c.campoId)}
          hoy={equipoHoy} onAbrir={onAbrir} onCampo={onCampo} />
      ))}
      {lb.diferido >= 0.5 && <LeyendaTramos className="mt-2" />}
      <LineaPerdida className="mt-2.5 border-t border-[var(--linea2)] pt-2" />
    </section>
  )
}

function Campo({ c, dias, rejilla, angosto, desde, hasta, filas, sinCosto, hoy, onAbrir, onCampo }: {
  c: FilaCampo; dias: number; rejilla: string; angosto: { prod: string; dif: string }; desde: Date; hasta: Date; filas: FilaEquipo[]; sinCosto: EquipoSinCosto[]
  hoy: (equipo: string, campo: string) => EquipoVivo | undefined
  onAbrir: (campoId: string, equipo: string) => void
  onCampo: (campoId: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const nombre = campoPorId(c.campoId).nombre
  const r = c.real / dias, d = c.brecha / dias, mp = c.metaProduccion / dias, md = c.metaDiferido / dias
  // Los de barriles, de más a menos; al final, los que fallaron sin costar crudo (sin barriles).
  const renglones: Renglon[] = [
    ...filas.map(f => ({ campoId: f.campoId, equipo: f.equipo, tipo: f.tipo, veces: textoVeces(vecesDe(f)), bbl: f.bbl })),
    ...sinCosto.map(x => ({ campoId: x.campoId, equipo: x.equipo, tipo: x.tipo, veces: textoVeces({ fallas: x.fallas, disparos: x.disparos }) })),
  ]
  // La marca de cada equipo: la de hoy, solo en sus filas de falla (marca.ts). Nunca se esconde una P1.
  const marca = (f: Renglon) => marcaDeFila(f, hoy(f.equipo, f.campoId)?.severidad)
  const lista = useVerMas(renglones, { n: renglones.length === VISIBLES + 1 ? renglones.length : VISIBLES, prioridad: marca })

  return (
    // En el papel, un campo desplegado se parte entre sus filas (index.css: `data-partible`):
    // entero saltaba de hoja (47 equipos de Morichal en 12 meses no caben en una).
    <div data-partible className="border-b border-[var(--linea2)] last:border-0">
      <button aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(v => !v)}
        className={`${rejilla} w-full cursor-pointer py-1.5 text-left text-[15px] hover:bg-[var(--panel2)] print:break-after-avoid`}>
        <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-1.5">
          <ChevronRight aria-hidden size={14} className={cn('no-imprimir shrink-0 text-[var(--tinta3)] transition-transform', abierto && 'rotate-90')} />
          <span className="truncate">{nombre}</span>
          {c.sinMeta && <Chip>{SIN_META}</Chip>}
        </span>
        <span className={`col-start-1 row-start-2 min-w-0 sm:col-start-2 sm:row-start-1 ${angosto.prod}`}>
          <BarraMeta tamano="chica" ocultarRotulo rotulo="producción" valor={r} unidad="bbl/d" meta={c.sinMeta ? undefined : mp}
            rotuloMeta={c.sinMeta ? undefined : n0(mp)} fuera={!c.sinMeta && r < mp} />
        </span>
        <span className={`col-start-2 row-start-2 min-w-0 sm:col-start-3 sm:row-start-1 ${angosto.dif}`}>
          <BarraMeta tamano="chica" ocultarRotulo tipoMeta="máximo" rotulo="diferido" valor={d} unidad="bbl/d" meta={c.sinMeta ? undefined : md}
            rotuloMeta={c.sinMeta ? undefined : n0(md)} fuera={!c.sinMeta && d > md} />
        </span>
        <b className="tabular col-start-2 row-start-1 justify-self-end sm:col-start-4" data-bbl-campo={c.campoId}>{n0(c.brecha)}<span className="sr-only"> bbl diferidos</span></b>
      </button>
      {/* Dónde se trabó: siempre a la vista, debajo de las barras del campo y en sus mismas columnas. */}
      <div className={cn(rejilla, 'items-start pb-2')}>
        <small className="col-start-1 row-start-1 text-[13px] text-[var(--tinta3)] sm:pl-5">dónde se trabó</small>
        <DondeSeTraboCampo campoId={c.campoId} desde={desde} hasta={hasta}
          className="col-span-2 col-start-1 row-start-2 sm:col-span-2 sm:col-start-2 sm:row-start-1" />
      </div>
      {/* Plegado en la pantalla; en el papel, desplegado. */}
      <div id={id} className={cn('pb-2 pl-5', !abierto && 'hidden print:block')}>
        {renglones.length === 0
          ? <p className="py-1 text-[14px] text-[var(--tinta2)]">Ningún equipo con diferido.</p>
          : (
            <ul aria-label={`Equipos de ${nombre}`}>
              {renglones.map(f => {
                const s = marca(f)
                const tipo = TIPO_CAUSA[f.tipo].toLowerCase()
                const pct = f.bbl !== undefined && c.diferido > 0 ? (f.bbl / c.diferido) * 100 : 0
                const cuanto = f.bbl !== undefined ? `${n0(f.bbl)} bbl, ${pctParte(pct, true)} del diferido de ${nombre}` : 'no costó crudo'
                return (
                  <li key={`${f.equipo}:${f.tipo}`} className={cn('border-b border-[var(--linea2)] last:border-0', lista.resto.includes(f) && 'solo-impresion')}>
                    <button onClick={() => onAbrir(f.campoId, f.equipo)}
                      aria-label={`${s ? `${NOMBRE_PRIORIDAD[s]}. ` : ''}${f.equipo}, ${tipo}, ${f.veces}: ${cuanto}`}
                      className="flex w-full cursor-pointer items-center gap-2.5 py-1.5 text-left hover:bg-[var(--panel2)]">
                      <MarcaPrioridad s={s} tamano={12} decorativa />
                      <span className="min-w-0 flex-1">
                        <b className="block text-[15px] leading-tight">{f.equipo}</b>
                        <small className="block text-[13px] text-[var(--tinta2)]">{tipo} · {f.veces}{f.bbl === undefined && ' · no costó crudo'}</small>
                      </span>
                      {f.bbl !== undefined && (
                        <span className="tabular shrink-0 text-right">
                          <b className="block text-[15px] leading-tight">{n0(f.bbl)}</b>
                          <small className="text-[12px] text-[var(--tinta3)]">bbl · {pctParte(pct)}</small>
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        <div className="flex flex-wrap items-center gap-2">
          <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
          <Boton variante="chico" className="mt-1.5 min-h-6" onClick={() => onCampo(c.campoId)}>Ir a {nombre}</Boton>
        </div>
      </div>
    </div>
  )
}
