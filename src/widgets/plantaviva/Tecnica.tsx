import { useState, type ReactNode } from 'react'
import type { ChokeAnh } from '@/entities/choke'
import { useAmbito, useRango } from '@/app/store'
import { usePlantaViva, type LenteTecnica, type Momento, type PlantaDelCampo } from '@/shared/api/plantaViva'
import { MarcaPrioridad, MarcaCondicion } from '@/shared/ui/Prioridad'
import { Info } from '@/shared/ui/Info'
import { useTelefono } from '@/shared/ui/telefono'
import { cn } from '@/shared/lib/cn'
import { Chevron } from './piezas'
import { n0 } from './cifras'
import { useAcciones } from './acciones'
import { TuberiaAcostada, TuberiaDePie } from './Tuberia'
import { HojaTramo } from './HojaTramo'

/* LA LENTE TÉCNICA (X4 §3.4 y §5.4, N1; P-01): lo que la tubería de La planta viva
   le suma a producción. Lo que cabe y lo que le sobra a cada tramo, debajo del
   dibujo; los 3 primeros de «Si falla hoy» a la derecha; y la tabla por tramo
   («Ver como tabla», H29), que en el papel sale siempre. */

/** Lo que cabe y lo que le sobra a cada tramo, en el orden de la tubería. «Limita» en tinta, nunca en color. */
export function Capacidades({ t, planta }: { t: LenteTecnica; planta?: PlantaDelCampo | null }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-[var(--linea2)] pt-3 text-[14px] text-[var(--tinta2)] sm:grid-cols-3" data-capacidades="">
      {t.tramos.map(x => (
        <p key={x.tramo} data-capacidad={x.tramo} className="flex flex-wrap items-center gap-x-1.5">
          <b className="font-semibold text-[var(--tinta)]">{x.nombre}</b>
          <span>{x.texto}</span>
          {x.limita && <b className="font-semibold text-[var(--tinta)]">· ◄ limita</b>}
          {x.limita && planta?.limitaSinFirmar && <Info titulo="Limita" texto={`Se decidió ${planta.limitaSinFirmar}.`} />}
          {x.capacidad === 'sin firmar' && <span className="text-[13px] text-[var(--tinta3)]">· sin firmar</span>}
        </p>
      ))}
    </div>
  )
}

/** «Si falla hoy», los 3 primeros (X4 §3.4, prod): la marca, el tag, la familia y lo que dejaría de
 *  producirse, en bbl/d (D-2). Cada fila abre la ficha del equipo; «Ver todos» lleva a Equipos. */
export function SiFallaHoy({ t, className }: { t: LenteTecnica; className?: string }) {
  const { abrir, ir } = useAcciones()
  const verTodos = ir('equipos')
  return (
    <section aria-label="Si falla hoy" data-si-falla-hoy="" className={cn('min-w-0 rounded-[20px] bg-[var(--panel)] px-[22px] py-4', className)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[var(--tinta)]">Si falla hoy</h2>
        <span className="text-[14px] text-[var(--tinta2)]">los 3 primeros · bbl/d</span>
      </header>
      {t.siFallaHoy.length === 0 && <p className="mt-2 text-[15px] text-[var(--tinta2)]">Ningún equipo en marcha con cifra.</p>}
      <div className="mt-1.5">
        {t.siFallaHoy.map(e => (
          <button key={e.equipo} type="button" onClick={() => abrir(e)} data-si-falla={e.equipo}
            className="grid min-h-14 w-full cursor-pointer grid-cols-[18px_1fr_auto_16px] items-center gap-x-2 border-t border-[var(--linea2)] py-2 text-left first:border-t-0 hover:bg-[var(--panel2)]">
            <span className="flex">{e.prioridad ? <MarcaPrioridad s={e.prioridad} tamano={15} /> : e.sinInstrumento ? <MarcaCondicion c="sin-instrumento" tamano={15} /> : null}</span>
            <span className="min-w-0">
              <span className="block font-cond text-[15px] font-bold tracking-[.02em] text-[var(--tinta)]">{e.equipo}</span>
              <span className="block text-[13px] text-[var(--tinta2)]">{e.familia}{e.sinInstrumento ? ' · sin instrumento' : ''}</span>
            </span>
            {/* La cifra en bbl/d (D-2) y, debajo, cuándo empieza (el colchón). */}
            <span className="text-right tabular-nums">
              <b className="block text-[15px] font-bold text-[var(--tinta)]">{e.entero === null ? 'sin dato' : n0(e.entero)}</b>
              <span className="block text-[13px] text-[var(--tinta2)]">{e.cuando || 'bbl/d'}</span>
            </span>
            <Chevron t={16} />
          </button>
        ))}
      </div>
      {verTodos && (
        <button type="button" onClick={verTodos} className="no-imprimir mt-1 inline-flex min-h-11 cursor-pointer items-center text-[15px] font-semibold text-[var(--tinta)] hover:underline sm:min-h-8">
          Ver todos los equipos ›
        </button>
      )}
    </section>
  )
}

const COLUMNA: Record<Momento, string> = { durante: 'No pasa ahora (bbl/d)', antes: 'Si falla hoy, el mayor (bbl/d)', despues: 'No se produjo (bbl)' }

/** «Ver como tabla» (§8.8; H29): lo mismo del dibujo por tramo. Plegada en la pantalla; en el papel, siempre. */
export function TablaTramos({ planta: p, momento, fuentes }: {
  planta: PlantaDelCampo; momento: Momento
  /** K1 · P-16: de dónde sale lo que cabe en cada tramo (la lente técnica). Con ellas, la tabla lleva esa columna,
   *  como la tubería de antes en Producción y Planta; La planta viva no la pasa. */
  fuentes?: Partial<Record<ChokeAnh, string>>
}) {
  const [abierta, setAbierta] = useState(false)
  return (
    <div className="mt-2" data-tabla-tramos={abierta ? 'abierta' : 'cerrada'}>
      <button type="button" aria-expanded={abierta} onClick={() => setAbierta(x => !x)}
        className="no-imprimir inline-flex min-h-11 cursor-pointer items-center text-[14px] font-semibold text-[var(--tinta)] hover:underline sm:min-h-8">
        {abierta ? 'Ocultar la tabla' : 'Ver como tabla'}
      </button>
      <div className={cn('overflow-x-auto', !abierta && 'hidden print:block')}>
        <table className="w-full min-w-[420px] text-left text-[14px] tabular-nums">
          <caption className="sr-only">La tubería de {p.nombre}, por tramo</caption>
          <thead className="text-[13px] text-[var(--tinta2)]">
            <tr><th className="py-1.5 font-medium">Tramo</th><th className="font-medium">Cabe (bbl/d)</th><th className="font-medium">{COLUMNA[momento]}</th><th className="font-medium">Equipos</th>
              {fuentes && <th className="font-medium">De dónde sale</th>}</tr>
          </thead>
          <tbody>
            {p.tramos.map(t => (
              <tr key={t.tramo} className="border-t border-[var(--linea2)]" data-fila-tramo={t.tramo}>
                <td className="py-1.5 font-semibold text-[var(--tinta)]">{t.nombre}{t.limita ? ' · limita' : ''}</td>
                <td>{t.cabeBpd === null ? 'sin dato' : n0(t.cabeBpd)}</td>
                <td>{n0(t.entero)}</td>
                <td className="text-[var(--tinta2)]">{t.equipos.slice(0, 3).map(e => e.equipo).join(', ') || '—'}</td>
                {fuentes && <td className="min-w-[240px] py-1.5 text-[13px] leading-snug text-[var(--tinta2)]" data-fuente-tramo={t.tramo}>{fuentes[t.tramo] ?? '—'}</td>}
              </tr>
            ))}
            {p.sinIdentificar && (
              <tr className="border-t border-[var(--linea2)]" data-fila-tramo="sin-asignar">
                <td className="py-1.5 font-semibold text-[var(--tinta)]">Sin identificar</td><td>—</td><td>{n0(p.sinIdentificar.entero)}</td>
                <td className="text-[var(--tinta2)]">{p.sinIdentificar.equipos.slice(0, 3).join(', ')}</td>
                {fuentes && <td className="text-[13px] text-[var(--tinta2)]">no es un tramo: lo que todavía no tiene causa</td>}
              </tr>
            )}
            <tr className="border-t border-[var(--linea2)]"><td className="py-1.5 font-semibold text-[var(--tinta)]">Sale hoy</td><td colSpan={fuentes ? 4 : 3}>{n0(p.pasaBpd)} bbl/d</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** La tubería de La planta viva con la lente técnica, para las pantallas que tenían la de antes
 *  (Producción y Planta; P-16 / H8): el mismo dibujo de B, con el rayado donde se trabó, lo que
 *  cabe y lo que le sobra a cada tramo, y la tabla. Lee lo suyo: el campo y el período de la cabecera, «ahora». */
export function TuberiaTecnica({ className, accionesDe }: {
  className?: string
  /** Lo que la pantalla que la monta agrega a la hoja de un tramo (Planta: «Ver la planta en el esquema»,
   *  lo que hacía la tubería de antes; K1 · P-16). La hoja se cierra antes de hacerlo. */
  accionesDe?: (tramo: ChokeAnh) => ReadonlyArray<{ texto: string; hacer: () => void }>
}) {
  const ambito = useAmbito(), rango = useRango(), telefono = useTelefono()
  const [abierto, setAbierto] = useState<ChokeAnh | null>(null)
  const v = usePlantaViva({ campos: ambito.campos.map(c => c.id), momento: 'durante', desde: rango.desde, hasta: rango.hasta })
  const { pedirCausa, ir } = useAcciones()
  // K1 · P-16: la hoja de la planta lleva a la tubería del agua, como la tubería de antes (a quien tiene Agua).
  const verAgua = ir('agua')
  const accionesTramo = (k: ChokeAnh): ReactNode => {
    const xs = [...(k === 'planta' && verAgua ? [{ texto: 'Ver la tubería del agua', hacer: verAgua }] : []), ...(accionesDe?.(k) ?? [])]
    return xs.length ? xs.map(x => (
      <button key={x.texto} type="button" onClick={() => { setAbierto(null); x.hacer() }}
        className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-3.5 text-[15px] font-semibold text-[var(--tinta)] shadow-[inset_0_0_0_1px_var(--linea)] hover:bg-[var(--panel2)] sm:min-h-9">
        {x.texto} ›
      </button>
    )) : undefined
  }
  const p = v.planta, t = v.tecnica
  // Un campo de gas no tiene la tubería del crudo todavía: se dice, con la frase del motor (lo que decía la
  // tubería de antes en Planta y Producción; K1 · P-16), en vez de dejar el lugar vacío.
  if (p && !t && p.textoGas) return (
    <section aria-label="La tubería del campo" data-tuberia-tecnica="" className={cn('min-w-0 rounded-[20px] bg-[var(--panel)] px-5 py-5 sm:px-7', className)}>
      <h2 className="text-[16px] font-semibold text-[var(--tinta)]">La tubería del campo</h2>
      <p className="mt-1 text-[16px] leading-[1.5] text-[var(--tinta2)]" data-campo-de-gas="">{p.textoGas}</p>
    </section>
  )
  if (!p || !t) return null
  const tramo = abierto ? p.tramos.find(x => x.tramo === abierto) : undefined
  const sinIdentificar = p.sinIdentificar?.primerEquipo ? pedirCausa({ campoId: p.campoId, equipo: p.sinIdentificar.primerEquipo }) : undefined
  return (
    <section aria-label="La tubería del campo" data-tuberia-tecnica="" className={cn('min-w-0 rounded-[20px] bg-[var(--panel)] px-5 py-5 sm:px-7', className)}>
      <h2 className="text-[16px] font-semibold text-[var(--tinta)]">La tubería del campo</h2>
      <p className="mt-1 text-[16px] leading-[1.5] text-[var(--tinta)]" data-frase-tecnica="">{t.cifra.explica}</p>
      <div className="mt-3">
        {telefono
          ? <TuberiaDePie planta={p} momento="durante" onTramo={setAbierto} onSinIdentificar={sinIdentificar} />
          : <TuberiaAcostada planta={p} momento="durante" onTramo={setAbierto} onSinIdentificar={sinIdentificar} />}
      </div>
      <Capacidades t={t} planta={p} />
      <TablaTramos planta={p} momento="durante" fuentes={Object.fromEntries(t.tramos.flatMap(x => (x.fuente ? [[x.tramo, x.fuente]] : [])))} />
      {tramo && <HojaTramo planta={p} tramo={tramo} momento="durante" periodo={v.periodo} telefono={telefono} onCerrar={() => setAbierto(null)}
        acciones={accionesTramo(tramo.tramo)} />}
    </section>
  )
}
