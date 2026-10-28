import { fondoTono, tonoDeMeta, atributoTono } from '@/shared/ui/tono'
import { useState } from 'react'
import type { ChokeAnh } from '@/entities/choke'
import { useApp, useRango, useRol } from '@/app/store'
import type { VistaPlantaViva } from '@/shared/api/plantaViva'
import { useResultados } from '@/shared/api/resultados'
import { useHoy } from '@/shared/api/hoy'
import { Barra, Cifra, Marca } from '@/shared/ui/scada'
import { Boton } from '@/shared/ui/primitivas'
import { useTelefono } from '@/shared/ui/telefono'
import { Info } from '@/shared/ui/Info'
import { n0, usd } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Balance } from '@/widgets/choke/Balance'
import { Funcionando } from '@/widgets/resultados/Funcionando'
import { HojaTramo } from './HojaTramo'
import { TuberiaKit, type TramoKit } from './TuberiaKit'
import { condicionDe } from './condicion'
import { Partes } from './piezas'
import { useAcciones, useCompartir } from './acciones'

/** EL INICIO DEL GERENTE (necesario-por-rol §1 y §14; imagen d1-grafito-ger, opción A: sin el
 *  control Antes · Durante · Después).
 *
 *  - El número: los bbl/d que se dejan de producir ahora, con el equipo que más pesa, y la
 *    acción principal a 1 toque: abrir ese equipo («Ver P-201B»). Al lado, «Compartir el
 *    informe» y las metas (la tarjeta «Firmar las metas» sale sola cuando toca).
 *  - De apoyo: la producción por día contra la meta y el cierre proyectado (con su palabra).
 *  - El choke: producido · diferido · perdido del mes, por tramo, con la trazabilidad a un
 *    toque; el diferido con su valor y el máximo que él firmó.
 *  - «¿Está funcionando?» (antes, ahora contra la meta y lo ganado).
 *  - Lo que explica el número: una fila por campo o, con un campo, la tubería de 4 tramos.
 *  Todo sale del motor (`usePlantaViva`, `useResultados`, `useBalance`, `useEfectividad`). */
export function Gerente({ v }: { v: VistaPlantaViva }) {
  const telefono = useTelefono(); const rango = useRango(); const rol = useRol()
  const setPantalla = useApp(s => s.setPantalla)
  const [abierto, setAbierto] = useState<ChokeAnh | null>(null)
  const r = useResultados({ rol: rol.id, campos: v.campos, desde: rango.desde, hasta: rango.hasta })
  const hoy = useHoy(rol.id, v.campos)
  const metas = hoy.tareas.filter(t => t.tipo === 'metas')
  const c = v.cifras.durante
  const { abrir } = useAcciones()
  const informe = useCompartir()
  const p = v.planta
  const tramo = p && abierto ? p.tramos.find(t => t.tramo === abierto) : undefined
  const verMetas = rol.pantallas.includes('configuracion') ? () => setPantalla('configuracion') : undefined
  const dinero = r.cifra.valorUsd !== null ? usd(r.cifra.valorUsd) : null
  const cierre = r.produccion.cierre

  const principal = (
    <section aria-label="Se deja de producir ahora" data-gerente-cifra={c.entero} data-valor={c.valor}
      className={cn('min-w-0 rounded-[10px] bg-[var(--panel)]', telefono ? 'px-4 py-4' : 'px-6 py-5')}>
      <Cifra rotulo="Se deja de producir ahora" valor={c.entero} unidad="bbl/d" tamano="principal" mayusculas={false}
        // B4 · En el teléfono (necesario-por-rol §14: la cifra, el equipo que más pesa y «Ver P-201B»), el equipo lo nombra
        // el botón y la tubería dice dónde se trabó; la frase entera, en su ⓘ, como en el inicio de producción.
        nota={telefono ? <span data-explica-telefono=""><Info titulo="Lo que más pesa" texto={c.explica} rotulo="por qué" /></span> : <span data-explica="">{c.explica}</span>} />
      <div className="no-imprimir mt-4 flex flex-wrap items-center gap-3">
        {c.primerEquipo && (
          <Boton variante="principal" onClick={() => abrir(c.primerEquipo)} data-ver-que-se-hace={c.primerEquipo.equipo} className="min-h-12 px-6 text-[16px]">
            Ver {c.primerEquipo.equipo}
          </Boton>
        )}
        {informe.puede && <Boton onClick={() => void informe.compartir()} disabled={informe.ocupado} className="min-h-12" data-compartir="">Compartir el informe</Boton>}
        {verMetas && <button type="button" onClick={verMetas} data-metas="" className="toque min-h-11 cursor-pointer px-1 text-[15px] font-semibold text-[var(--tinta)] underline underline-offset-4">Metas</button>}
        {informe.aviso && <p role="alert" className="basis-full text-[14px] text-[var(--tinta)]">{informe.aviso}</p>}
      </div>
    </section>
  )

  const firmar = metas.length > 0 && verMetas && (
    <section aria-label="Para usted" data-firmar-metas={metas.map(m => m.campoId).join(',')} className="min-w-0 rounded-[10px] bg-[var(--panel)] px-4 py-3 sm:px-6">
      <p className="text-[13px] font-medium text-[var(--tinta2)]">Para usted</p>
      <p className="mt-0.5 text-[16px] font-semibold text-[var(--tinta)]">{metas.length === 1 ? metas[0]!.titulo : `Firmar las metas de ${metas.length} campos`}</p>
      <Boton variante="principal" onClick={verMetas} className="mt-2">Firmar…</Boton>
    </section>
  )

  const prod = v.produccion
  // 28-oct · Contra la meta: alcanzada en verde pálido, por debajo en amarillo pálido; sin meta firmada, sin tono.
  const tonoProd = prod.metaBpd !== null ? (prod.bajoMeta ? 'riesgo' as const : 'bien' as const) : undefined
  const tonoCierre = cierre && cierre.metaProduccion !== null ? tonoDeMeta(cierre.produccion, cierre.metaProduccion) : undefined
  const escala = prod.metaBpd !== null ? { min: 0, max: Math.max(prod.metaBpd * 1.25, 1), firmada: true } : undefined
  const apoyo = (
    <div className="grid min-w-0 grid-cols-2 gap-3">
      <section aria-label="Producción por día" data-produccion={prod.realBpd} {...atributoTono(tonoProd)} className={cn('min-w-0 rounded-[10px] bg-[var(--panel)] px-4 py-4 sm:px-6', fondoTono(tonoProd))}>
        <Cifra rotulo="Producción por día" valor={Math.round(prod.realBpd)} unidad="bbl/d" mayusculas={false}
          estado={prod.bajoMeta ? 'anormal' : 'normal'} condicion={prod.bajoMeta ? 'aviso' : undefined}
          nota={prod.metaBpd !== null ? `meta ${n0(prod.metaBpd)}` : 'sin meta firmada'} />
        {escala && prod.metaBpd !== null && (
          <Barra nombre="Producción por día contra la meta" valor={prod.realBpd} unidad="bbl/d" escala={escala} banda={[prod.metaBpd, null]}
            estado={prod.bajoMeta ? 'anormal' : 'normal'} condicion={prod.bajoMeta ? 'aviso' : undefined} ancho={telefono ? 150 : 200} className="mt-2 [&>span:nth-child(2)]:hidden" />
        )}
      </section>
      <section aria-label="Cierre del mes" data-cierre={cierre?.produccion ?? ''} {...atributoTono(tonoCierre)} className={cn('min-w-0 rounded-[10px] bg-[var(--panel)] px-4 py-4 sm:px-6', fondoTono(tonoCierre))}>
        {cierre
          ? <Cifra rotulo="Cierre del mes" valor={Math.round(cierre.produccion)} unidad="bbl" calidad="proyectado" mayusculas={false}
            nota={cierre.metaProduccion !== null ? `meta ${n0(cierre.metaProduccion)}` : 'sin meta firmada'} />
          : <Cifra rotulo="Cierre del mes" valor={null} unidad="bbl" estado="sin-dato" mayusculas={false} nota="el mes ya cerró" />}
      </section>
    </div>
  )

  const balance = (
    <Balance q={{ campos: v.campos, desde: rango.desde, hasta: rango.hasta }}
      diferido={{ nota: <>{dinero ? `${dinero.valor} ${dinero.unidad}` : 'sin precio'}{r.cifra.maximo !== null ? ` · máximo ${n0(r.cifra.maximo)}` : ''}</>, fuera: r.cifra.sobreMaximo }} />
  )

  const explica = p
    ? (
      <section aria-label={`La tubería de ${p.nombre}`} className={cn('min-w-0 rounded-[10px] bg-[var(--panel)]', telefono ? 'px-4 py-4' : 'px-6 py-5')}>
        <h2 className="text-[16px] font-semibold text-[var(--tinta)]">Dónde se trabó · {p.nombre}</h2>
        {p.campoDeGas
          ? <p className="mt-2 text-[15px] text-[var(--tinta2)]" data-gas="">{p.textoGas}</p>
          : <TuberiaKit className="mt-2" telefono={telefono} etiqueta={p.ariaLabel} onTramo={t => setAbierto(t as ChokeAnh)} tramos={tramosGerente(v)} />}
      </section>
    )
    : <PorCampo v={v} />

  return (
    <div data-inicio-gerente={v.alcance} className="flex flex-col gap-3 sm:gap-4">
      {telefono
        ? (<>{principal}{firmar}{explica}{apoyo}{balance}<Funcionando campos={v.campos} /></>)
        : (
          <div className="grid gap-4 min-[1280px]:grid-cols-[minmax(0,1fr)_400px]">
            <div className="flex min-w-0 flex-col gap-4">{principal}{firmar}{apoyo}{balance}<Funcionando campos={v.campos} /></div>
            <div className="min-w-0">{explica}</div>
          </div>
        )}
      {p && tramo && <HojaTramo planta={p} tramo={tramo} momento="durante" periodo={v.periodo} telefono={telefono} onCerrar={() => setAbierto(null)} />}
    </div>
  )
}

/** Los 4 tramos de la tubería del gerente: lo que no pasa en cada uno ahora, con la marca del equipo que más pesa. */
function tramosGerente(v: VistaPlantaViva): TramoKit[] {
  return (v.planta?.tramos ?? []).map(t => {
    const eq = t.marcado ? t.equipos[0] : undefined
    const cond = condicionDe(eq?.prioridad)
    return {
      tramo: t.tramo, nombre: t.nombre, limita: t.limita,
      cifra: t.entero > 0 ? n0(t.entero) : null,
      palabra: t.entero > 0 ? 'bbl/d no pasan' : <Partes partes={t.linea} />,
      nota: eq ? `${eq.equipo} · ${eq.familia}` : undefined,
      estado: cond ? 'anormal' : 'normal', condicion: cond,
    }
  })
}

/** Todos los campos (imagen ger): una fila por campo con lo que se deja de producir y su primer
 *  equipo con su marca; los que producen sin paradas, en una línea. */
function PorCampo({ v }: { v: VistaPlantaViva }) {
  const { abrir, verCampo } = useAcciones()
  const con = v.filas.filter(f => f.entero > 0 || f.primerEquipo)
  const sin = v.filas.filter(f => !con.includes(f))
  return (
    <section aria-label="Por campo" data-por-campo="" className="min-w-0 rounded-[10px] bg-[var(--panel)] px-4 py-3 sm:px-6 sm:py-4">
      <h2 className="flex items-baseline justify-between gap-2 text-[16px] font-semibold text-[var(--tinta)]">Por campo <span className="text-[13px] font-normal text-[var(--tinta2)]">ahora · bbl/d</span></h2>
      <ul className="mt-1">
        {con.map(f => (
          <li key={f.campoId} data-campo={f.campoId} data-valor={f.valor} className="border-t border-[var(--linea2)] py-2.5 first:border-t-0">
            <button type="button" onClick={() => verCampo(f.campoId)} aria-label={`${f.nombre}: ${n0(f.entero)} bbl/d. Abrir el campo`}
              className="flex min-h-11 w-full cursor-pointer items-baseline justify-between gap-2 text-left hover:underline">
              <span className="text-[16px] font-semibold text-[var(--tinta)]">{f.nombre}</span>
              <b className="tabular-nums text-[18px] text-[var(--tinta)]">{n0(f.entero)} <small className="text-[13px] font-normal text-[var(--tinta2)]">bbl/d</small></b>
            </button>
            {f.primerEquipo && (
              <button type="button" onClick={() => abrir(f.primerEquipo)} data-primer-equipo={f.primerEquipo.equipo}
                className="toque flex cursor-pointer items-center gap-1 text-left text-[14px] text-[var(--tinta2)] hover:underline">
                {condicionDe(f.primerEquipo.prioridad)
                  ? <Marca tipo={condicionDe(f.primerEquipo.prioridad)!} palabra={`${f.primerEquipo.equipo} · ${f.primerEquipo.familia}`} />
                  : <span>{f.primerEquipo.equipo} · {f.primerEquipo.familia}</span>}
              </button>
            )}
          </li>
        ))}
      </ul>
      {sin.length > 0 && (
        <p className="border-t border-[var(--linea2)] pt-2 text-[14px] text-[var(--tinta2)]" data-sin-paradas={sin.length}>
          {sin.map((f, i) => (
            <span key={f.campoId}>{i > 0 ? ', ' : ''}<button type="button" onClick={() => verCampo(f.campoId)} className="toque cursor-pointer font-medium text-[var(--tinta)] hover:underline">{f.nombre}</button>{f.campoDeGas ? ' (gas: sin tubería)' : ''}</span>
          ))}
          : sin paradas ahora.
        </p>
      )}
    </section>
  )
}
