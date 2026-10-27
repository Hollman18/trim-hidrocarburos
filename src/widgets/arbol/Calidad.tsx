import { useState } from 'react'
import { useRol } from '@/app/store'
import { useCalidadAnh, nombreDeRegla, type CalidadPaso, type PasoAnh } from '@/shared/api/arbol'
import { NOMBRE_CHOKE, type ChokeAnh } from '@/shared/api/choke'
import { campoPorId } from '@/entities/campos'
import { Panel, Boton } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { VISIBLES } from '@/shared/ui/listaCorta'
import { n0, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { ROTULO, INFO_METODO, valorEnPalabras } from './palabras'
import { periodoEnFrase } from '@/widgets/choke/palabras'

const TITULO = 'text-[15px] font-semibold text-[var(--tinta)]'
const pct = (v: number | null) => (v === null ? '—' : `${n0(v)} %`)
/** «1 parada (2 filas)»: el motor cuenta las filas del reporte y las paradas detrás (B-47). */
const paradasYFilasDe = (e: { paradas: number; eventos: number }) =>
  `${plural(e.eventos, 'parada', 'paradas')}${e.paradas !== e.eventos ? ` (${plural(e.paradas, 'fila', 'filas')})` : ''}`

/** Una barra de 0 a 100 %, gris (no es una alarma), con la cifra al lado y en su nombre accesible. */
function Barra({ valor, nombre, grande }: { valor: number | null; nombre: string; grande?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span role="img" aria-label={`${nombre}: ${valor === null ? 'sin dato' : `${n0(valor)} %`}`}
        className={cn('block min-w-0 flex-1 overflow-hidden rounded-sm bg-[var(--panel2)] ring-1 ring-inset ring-[var(--linea2)]', grande ? 'h-2.5' : 'h-1.5')}>
        {valor !== null && <i className="block h-full bg-[var(--dato-1)]" style={{ width: `${Math.max(0, Math.min(100, valor))}%` }} />}
      </span>
      <b className={cn('tabular shrink-0 text-right', grande ? 'w-14 text-[18px] leading-none' : 'w-10 text-[14px]')}>{pct(valor)}</b>
    </span>
  )
}

/** A qué lo cambiaron las personas, en palabras: «En el pozo · 7». */
const cambios = (paso: PasoAnh, a: Partial<Record<string, number>>) =>
  Object.entries(a).sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0)).map(([v, k]) => `${paso === 'choke' ? NOMBRE_CHOKE[v as ChokeAnh] ?? v : valorEnPalabras(paso, v)} · ${k}`).join(', ')

/** «Calidad de la clasificación» en Confiabilidad (U2 §4.6; P1 §2.1, el
 *  tablero de «correcciones por regla»): cuánto miró una persona y cuánto se
 *  equivocan las reglas de TRIM, paso por paso, con el paso 2 («¿Dónde se
 *  trabó?») aparte. Es la señal para ajustar la topología o la regla: las que
 *  más se corrigen van primero, y los equipos sin topología se le piden al
 *  administrador. Todo lo cuenta el motor (`GET /vistas/anh/calidad`). */
export function CalidadClasificacion({ campos, desde, hasta, periodo, global }: {
  campos: string[]; desde: Date; hasta: Date; periodo: string; global: boolean
}) {
  const c = useCalidadAnh({ campos, desde, hasta })
  // «modelo choke» es un rótulo secundario solo para confiabilidad (U2 §1.3).
  const conRotulo = useRol().id === 'conf'
  const [verReglas, setVerReglas] = useState(false)
  const [verEquipos, setVerEquipos] = useState(false)
  const paso2 = c.porPaso.find(x => x.paso === 'choke')
  const otros = c.porPaso.filter(x => x.paso !== 'choke')
  const corregidas = c.porRegla.filter(r => r.corregidas > 0)
  const equipos = c.chokePorEquipo.filter(e => e.paradas > 0)
  const donde = (campoId: string) => (global ? ` · ${campoPorId(campoId).nombre}` : '')
  const reglas = verReglas ? corregidas : corregidas.slice(0, VISIBLES)
  const restoReglas = verReglas ? [] : corregidas.slice(VISIBLES)
  const eqs = verEquipos ? equipos : equipos.slice(0, VISIBLES)
  const restoEq = verEquipos ? [] : equipos.slice(VISIBLES)

  const filaPaso = (x: CalidadPaso) => (
    <div key={x.paso} className="grid gap-x-3 gap-y-0.5 border-b border-dashed border-[var(--linea2)] py-1.5 text-[14px] last:border-0 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_6.5rem] sm:items-center">
      <span className="font-semibold text-[var(--tinta2)]">{ROTULO[x.paso]}</span>
      <span className="grid gap-0.5"><small className="text-[12px] text-[var(--tinta3)] sm:hidden">confirmado</small><Barra valor={x.pctConfirmado} nombre={`${ROTULO[x.paso]}, confirmado por una persona`} /></span>
      <span className="grid gap-0.5"><small className="text-[12px] text-[var(--tinta3)] sm:hidden">corregido</small><Barra valor={x.pctCorregido} nombre={`${ROTULO[x.paso]}, corregido por una persona`} /></span>
      <small className="tabular text-[13px] text-[var(--tinta2)]">{x.enFalta ? `${x.enFalta} en falta` : 'nada en falta'}</small>
    </div>
  )
  const filaRegla = (r: (typeof corregidas)[number]) => (
    <li key={`${r.paso}|${r.regla}`} className="grid gap-x-3 gap-y-0.5 border-b border-dashed border-[var(--linea2)] py-1.5 last:border-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-baseline">
      <span className="flex min-w-0 flex-wrap items-center gap-x-1">
        <b className="font-semibold">{nombreDeRegla(r.regla)}</b>
        <span className="text-[13px] text-[var(--tinta3)]">· {ROTULO[r.paso]}</span>
        <Info titulo="La regla" texto={`${r.regla}: la regla de TRIM que propuso el paso «${ROTULO[r.paso]}».`} />
      </span>
      <span className="tabular" aria-label={`${r.corregidas} de ${r.propuestas} propuestas corregidas, ${n0(r.pctCorregido)} %`}>
        <b>{r.corregidas}</b> de {r.propuestas} corregidas · {n0(r.pctCorregido)} %
      </span>
      <span className="text-[13px] text-[var(--tinta2)]">a: {cambios(r.paso, r.cambiadoA)}</span>
    </li>
  )
  const filaEquipo = (e: (typeof equipos)[number]) => (
    <li key={`${e.campoId}|${e.equipo}`} className="flex flex-wrap items-baseline gap-x-2 border-b border-dashed border-[var(--linea2)] py-1 last:border-0">
      <b className="font-cond font-bold tracking-[.02em]">{e.equipo}</b>
      <span className="text-[13px] text-[var(--tinta3)]">{donde(e.campoId).replace(/^ · /, '')}</span>
      <span className="tabular" data-paradas={e.eventos} data-filas={e.paradas}>{paradasYFilasDe(e)} · {e.corregidas} {e.corregidas === 1 ? 'corregida' : 'corregidas'}{e.paradas ? ` · ${n0(e.pctCorregido)} %` : ''}</span>
      {e.corregidas > 0 && <span className="text-[13px] text-[var(--tinta2)]">a: {cambios('choke', e.cambiadoA)}</span>}
    </li>
  )

  return (
    <Panel className="mt-2.5" titulo="Calidad de la clasificación" extra={`${plural(c.paradas, 'fila', 'filas')} · ${periodo}`}>
      <Lectura>
        Cuánto de lo que propone TRIM miró una persona (confirmado) y cuánto cambió (corregido), paso por
        paso. El paso 2, dónde se trabó, va aparte: si se corrige mucho, la topología o la regla está mal.
        Las reglas que más se corrigen van primero; los equipos sin topología se le piden al administrador.
      </Lectura>
      {paso2 && (
        // El paso 2 destacado: contorno más grueso, sin color (no es una alarma).
        <section aria-label="¿Dónde se trabó?: calidad" className="mb-2.5 rounded border-2 border-[var(--tinta3)] p-2.5">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
            {/* Sin número (T-10) y sin el rótulo «modelo choke» (T-11; X4 §6.1.4): la ⓘ va junto al título. */}
            <span className="flex items-center gap-1.5"><h3 className="text-[15px] font-semibold">¿Dónde se trabó?</h3>
              <Info titulo={conRotulo ? 'Modelo choke' : '¿Qué método es?'} texto={INFO_METODO} /></span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <span className="grid gap-0.5">
              <small className="text-[13px] text-[var(--tinta3)]">confirmado por una persona</small>
              <Barra grande valor={paso2.pctConfirmado} nombre="¿Dónde se trabó?, confirmado por una persona" />
              <small className="tabular text-[13px] text-[var(--tinta2)]">{paso2.avaladas} de {paso2.paradas} filas</small>
            </span>
            <span className="grid gap-0.5">
              <small className="text-[13px] text-[var(--tinta3)]">corregido: cuánto se equivoca la regla</small>
              <Barra grande valor={paso2.pctCorregido} nombre="¿Dónde se trabó?, corregido por una persona" />
              <small className="tabular text-[13px] text-[var(--tinta2)]">{paso2.corregidas} de {paso2.propuestas} propuestas{paso2.enFalta ? ` · ${paso2.enFalta} en falta` : ''}{paso2.declaradas ? ` · ${paso2.declaradas} las dijo una persona sin propuesta` : ''}</small>
            </span>
          </div>
        </section>
      )}
      <h3 className={TITULO}>Los demás pasos</h3>
      <div className="mb-1 hidden gap-x-3 text-[12px] text-[var(--tinta3)] sm:grid sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_6.5rem]" aria-hidden>
        <span /><span>confirmado</span><span>corregido</span><span />
      </div>
      <div className="mb-2.5">{otros.map(filaPaso)}</div>

      <h3 className={TITULO}>Las reglas que más se corrigen</h3>
      {corregidas.length === 0
        ? <p className="mb-2.5 text-[14px] text-[var(--tinta2)]">Nadie corrigió una propuesta de TRIM en {periodoEnFrase(periodo)}{c.porPaso.some(x => x.avaladas > 0) ? '' : ': todavía nadie ha revisado estas paradas'}.</p>
        : (
          <>
            <ul className="mb-1 text-[14px]">{reglas.map(filaRegla)}</ul>
            {restoReglas.length > 0 && <ul className="solo-impresion text-[14px]">{restoReglas.map(filaRegla)}</ul>}
            {(restoReglas.length > 0 || verReglas) && <Boton variante="chico" className="mb-2.5 min-h-10 sm:min-h-6" aria-expanded={verReglas} onClick={() => setVerReglas(v => !v)}>{verReglas ? 'ver menos' : `ver las otras ${restoReglas.length}`}</Boton>}
          </>
        )}

      <h3 className={`${TITULO} mt-1.5`}>Dónde se trabó, por equipo</h3>
      {equipos.length === 0
        ? <p className="mb-2.5 text-[14px] text-[var(--tinta2)]">Ninguna parada con «dónde se trabó» propuesto en {periodoEnFrase(periodo)}.</p>
        : (
          <>
            <ul className="mb-1 text-[14px]">{eqs.map(filaEquipo)}</ul>
            {restoEq.length > 0 && <ul className="solo-impresion text-[14px]">{restoEq.map(filaEquipo)}</ul>}
            {(restoEq.length > 0 || verEquipos) && <Boton variante="chico" className="mb-2.5 min-h-10 sm:min-h-6" aria-expanded={verEquipos} onClick={() => setVerEquipos(v => !v)}>{verEquipos ? 'ver menos' : `ver los otros ${restoEq.length}`}</Boton>}
          </>
        )}

      <h3 className={`${TITULO} mt-1.5`}>Equipos sin topología</h3>
      {c.sinTopologia.length === 0
        ? <p className="text-[14px] text-[var(--tinta2)]">Todos los equipos de estas paradas dicen a qué pozos sirven.</p>
        : (
          <>
            <p className="mb-1 text-[13px] text-[var(--tinta2)]">Sus paradas tomaron el tramo de la regla por tipo de causa: pídale al administrador que diga a qué pozos sirven (Configuración).</p>
            <ul className="text-[14px]">
              {c.sinTopologia.map(e => (
                <li key={`${e.campoId}|${e.equipo}`} className="flex flex-wrap gap-x-2 border-b border-dashed border-[var(--linea2)] py-1 last:border-0">
                  <b className="font-cond font-bold tracking-[.02em]">{e.equipo}</b><span className="text-[13px] text-[var(--tinta3)]">{donde(e.campoId).replace(/^ · /, '')}</span>
                  <span className="tabular">{paradasYFilasDe(e)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
    </Panel>
  )
}
