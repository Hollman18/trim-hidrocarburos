import { useCriticidad, DONDE_CHOKE, type FilaCriticidad, type VistaCriticidad } from '@/shared/api/choke'
import { useEquiposDeHoy } from '@/shared/api/equipos'
import { campoPorId } from '@/entities/campos'
import type { Severidad } from '@/entities/tipos'
import { Chip } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas, VISIBLES } from '@/shared/ui/listaCorta'
import { n0, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { fmtHoras } from '@/widgets/bombas/comun'

/** El ⓘ del título (U2 §6.2, texto exacto). */
const QUE_ES = 'Cuánto dejaría de sacar el campo por día si este equipo para hoy, después de lo que aguanta el tanque y de lo que toma el respaldo. Cambia con lo que esté parado: si para una bomba, sus hermanas valen más.'
/** El ⓘ de «modelo choke» (U2 §1.3, texto exacto): solo lo ve confiabilidad. */
const MODELO_CHOKE = 'Es un método internacional para ubicar dónde se pierde producción: lo publicó BP en 1996 (artículo SPE-36848), lo usa el regulador británico (NSTA) y la ANH lo adoptó en 2026 (Circulares 003 y 024). No es la válvula choke de la cabeza del pozo (Circular 024, p. 4).'

const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
/** El colchón como lo dice la ficha de la bomba («10,1 h»); bajo una hora, en minutos («2 min»). */
const colchon = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : fmtHoras(h, true))
/** «Compresor de gas», «electrosumergible»: el nombre sin repetir el código que ya va en negrita. */
const nombreSinId = (f: FilaCriticidad) =>
  f.nombre === f.equipo ? '' : f.nombre.startsWith(`${f.equipo} · `) ? f.nombre.slice(f.equipo.length + 3) : f.nombre
/** Lo que ya está parado y cierra pozos por sí mismo (una bomba, un servicio) lleva su renglón; un pozo parado, no. */
const esRaiz = (f: FilaCriticidad) => f.familia === 'bomba' || f.familia === 'servicio'

/** «SI FALLA HOY» (U2 §6; CHOKE-COMPLETO §10): TODOS los equipos de cada
 *  campo, de lo que más le quitaría al campo por día si fallara hoy a lo que
 *  menos, con dónde se trabaría, el colchón, lo que costaría una falla y si
 *  TRIM lo vigila. Lo ya parado no entra en la lista (va en «Perdiéndose
 *  ahora»): lleva su renglón arriba, con lo que costaría cuando vuelva. Todo
 *  lo calcula el motor (`useCriticidad`): la cifra de cada bomba es la misma
 *  de su ficha y de «En riesgo», el puesto de cada fila, lo que dice lo ya
 *  parado y la línea de lo que decide cada rol con la lista (§6.4). Es para
 *  confiabilidad y el jefe de mantenimiento. */
export function SiFallaHoy({ campos, global, rol, onAbrir }: {
  campos: string[]; global: boolean
  /** Confiabilidad ve «modelo choke ⓘ» y dónde va el próximo instrumento; el jefe, lo que no debe intervenir hoy. */
  rol: 'conf' | 'jefe' | 'otro'
  onAbrir: (campoId: string, equipo: string) => void
}) {
  const v = useCriticidad(campos)
  const hoy = useEquiposDeHoy(campos)
  const sev = (f: FilaCriticidad): Severidad => hoy(f.equipo, f.campoId)?.severidad ?? 0
  const titulo = 'font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]'
  return (
    <section id="si-falla-hoy" tabIndex={-1} className="mt-2.5 scroll-mt-4 rounded border border-[var(--linea)] bg-[var(--panel)] shadow-[var(--sombra)] outline-none">
      <header className="flex flex-wrap items-center justify-between gap-x-2 border-b border-[var(--linea2)] px-3 py-[7px]">
        <h2 className={titulo}>SI FALLA HOY</h2>
        <span className="font-cond text-[10px] tracking-[.08em] text-[var(--tinta3)]">de lo que más le quita al campo por día a lo que menos</span>
      </header>
      <div className="p-3">
        {rol === 'conf' && (
          <p className="-mt-1 mb-1 flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">
            <span>modelo choke</span><Info titulo="Modelo choke" texto={MODELO_CHOKE} />
          </p>
        )}
        <p className="flex flex-wrap items-center gap-x-1 text-[11px] text-[var(--tinta2)]">
          <span>Lo que el campo deja de sacar por día si el equipo falla hoy</span>
          <Info titulo="Si falla hoy" texto={QUE_ES} />
        </p>
        <Lectura>
          Cada fila es un equipo del campo. «Se trabaría en»: dónde se trabaría la producción si para. «Si
          falla hoy»: lo que el campo dejaría de sacar por día, una vez agotado el colchón del tanque;
          «hasta»: se supone que se cierra todo lo que depende de él. «Una falla ≈»: lo que costaría una
          falla con lo que suelen durar las suyas. Lo que ya está parado va arriba, aparte. Toque una fila
          para abrir el equipo.
        </Lectura>
        {v.campos.map(c => (
          <CampoSiFalla key={c.campoId} c={c} filas={v.ranking.filter(f => f.campoId === c.campoId)}
            global={global} rol={rol} sev={sev} abrible={(f: FilaCriticidad) => !!hoy(f.equipo, f.campoId) || f.familia === 'bomba'} onAbrir={onAbrir} />
        ))}
      </div>
    </section>
  )
}

function CampoSiFalla({ c, filas, global, rol, sev, abrible, onAbrir }: {
  c: VistaCriticidad['campos'][number]; filas: FilaCriticidad[]; global: boolean
  rol: 'conf' | 'jefe' | 'otro'
  sev: (f: FilaCriticidad) => Severidad
  abrible: (f: FilaCriticidad) => boolean
  onAbrir: (campoId: string, equipo: string) => void
}) {
  const nombre = campoPorId(c.campoId).nombre
  // Tres grupos que no se ordenan juntos (D6; B-06): lo medido, con su puesto; los
  // techos («hasta»: suponen que se cierra todo lo que depende del equipo); y lo que
  // no tiene cifra, con lo que falta. Un techo nunca empata con una cifra calculada.
  const medidos = filas.filter(f => f.grupo === 'medido')
  const techos = filas.filter(f => f.grupo === 'techo')
  const sinCifra = filas.filter(f => f.grupo === 'sin-dato')
  // Cinco a la vista, sin partir un empate: si el quinto comparte puesto con los que siguen, van todos.
  const quinto = medidos[VISIBLES - 1]
  const corte = quinto ? medidos.findIndex((f, i) => i >= VISIBLES && f.puesto !== quinto.puesto) : -1
  // Siempre a la vista: lo que subió por otro equipo parado y lo que está en alarma (ISA-18.2: una alarma no se tapa).
  const lista_ = useVerMas(medidos, { n: corte === -1 ? (quinto ? medidos.length : VISIBLES) : corte, prioridad: f => (f.subio || sev(f) === 1 ? 1 : 2) })
  const raices = c.parados.filter(esRaiz), pozosParados = c.parados.filter(f => !esRaiz(f))
  const rejilla = cn('grid items-baseline gap-x-2 gap-y-0.5',
    'grid-cols-[1.75rem_minmax(0,1fr)_auto] [grid-template-areas:"n_e_c"_"._t_t"_"._x_x"]',
    'lg:grid-cols-[1.75rem_minmax(0,1.5fr)_minmax(0,1.15fr)_7.5rem_5.5rem_6.5rem_8rem] lg:[grid-template-areas:"n_e_t_c_d_f_v"]')
  const subtitulo = 'mt-2 border-b border-[var(--linea2)] pb-1 text-[10.5px] font-semibold text-[var(--tinta2)]'

  const fila = (f: FilaCriticidad, oculta: boolean) => {
    const s = sev(f)
    const p = f.puesto
    const otro = nombreSinId(f)
    const donde = `${DONDE_CHOKE[f.tramo]}${f.tramo === 'planta' && f.servidos > 0 ? ` · ${plural(f.servidos, 'pozo', 'pozos')}` : ''}`
    const cifra = f.bpd === null ? 'sin dato' : f.grupo === 'techo' && f.bpd > 0 ? `hasta ${n0(f.bpd)}` : n0(f.bpd)
    const despues = f.colchonH !== undefined ? colchon(f.colchonH)
      : f.bpd === null || f.bpd === 0 ? '—' : f.familia === 'bomba' && f.sinDato ? 'sin dato' : 'sin colchón'
    const leido = `${p === null ? '' : `Puesto ${p}. `}${f.equipo}${otro ? `, ${otro}` : ''}: si falla hoy, ${f.bpd === null ? `sin dato${f.sinDato ? `: ${f.sinDato}` : ''}` : `${cifra} barriles por día`}; se trabaría ${donde}; ${f.colchonH !== undefined ? `después de ${colchon(f.colchonH)} de colchón` : despues === '—' ? (f.bpd === 0 ? 'no cierra pozos' : 'sin dato del colchón') : despues}; ${f.costoFalla !== undefined ? `una falla, unos ${n0(f.costoFalla)} barriles` : 'sin cifra de una falla'}; ${f.vigilado ? 'lo vigila TRIM' : 'sin instrumento'}${s > 0 ? `, con una alarma de prioridad ${s}` : ''}${f.subio ? '. Subió hoy' : ''}`
    const pista = [f.porque, f.sinDato, f.costoFalla !== undefined && f.mdtFuente ? `Una falla: ${f.mdtFuente}` : ''].filter(Boolean).join('. ')
    const cuerpo = (
      <>
        <span className="tabular text-[12px] text-[var(--tinta3)] [grid-area:n]">{p ?? '┄'}</span>
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 [grid-area:e]">
          <b className="text-[12.5px]">{f.equipo}</b>
          {otro && <span className="min-w-0 text-[11px] text-[var(--tinta2)]">{otro}</span>}
          {f.subio && <Chip tono="fuerte">sube</Chip>}
        </span>
        <span className="text-[11px] text-[var(--tinta2)] [grid-area:t]"><span className="lg:hidden">se trabaría </span>{donde}</span>
        <span className="tabular text-right [grid-area:c]">
          {f.bpd === null
            ? <span className="rounded-sm border border-dashed border-[var(--tinta3)] px-1 text-[11px] text-[var(--tinta3)]">sin dato</span>
            : <><b className="text-[13.5px]">{cifra}</b> <small className="text-[10px] text-[var(--tinta3)]">bbl/d</small></>}
        </span>
        {/* En el teléfono, colchón, falla y vigía en una línea con «·»; en el escritorio, cada uno en su columna. */}
        <span className="flex flex-wrap gap-x-1 text-[11px] text-[var(--tinta2)] [grid-area:x] lg:contents">
          {f.bpd === null && f.sinDato
            ? <span className="lg:[grid-area:d] lg:col-span-2">{f.sinDato}</span>
            : <>
              <span className="tabular lg:text-right lg:[grid-area:d]">{despues}{f.colchonH !== undefined && <span className="lg:hidden"> de colchón</span>}</span>
              <span className={cn('tabular lg:text-right lg:[grid-area:f]', f.costoFalla === undefined && 'hidden lg:inline')}>
                {f.costoFalla !== undefined ? <><span aria-hidden className="lg:hidden">· </span><span className="lg:hidden">una falla </span>≈ {n0(f.costoFalla)} bbl{f.costoDe === 'flota' && <small className="block text-[9.5px] text-[var(--tinta3)] max-lg:inline max-lg:pl-1">flota</small>}</> : '—'}
              </span>
            </>}
          {/* La marca de alarma del equipo va en «¿Lo vigila TRIM?» (B-43; U2 §9.5): pegada al puesto se leía como otro puesto. */}
          <span className="inline-flex items-center gap-1 lg:justify-end lg:[grid-area:v]">
            <span aria-hidden className="lg:hidden">· </span>
            {f.vigilado
              ? <><span className="lg:hidden">vigilado</span><span className="hidden lg:inline">sí</span>{s > 0 && <> · <MarcaPrioridad s={s} tamano={11} /></>}</>
              : <span className="whitespace-nowrap rounded-sm border border-dashed border-[var(--tinta3)] px-1 text-[10.5px] text-[var(--tinta3)]">sin instrumento</span>}
          </span>
        </span>
      </>
    )
    const props = { titulo: `${f.equipo}${otro ? ` · ${otro}` : ''}`, pista, 'aria-label': leido,
      filas: [['Si falla hoy', f.bpd === null ? 'sin dato' : `${cifra} bbl/d`], ['Se trabaría', donde], ['Después de', despues],
        ['Una falla', f.costoFalla !== undefined ? `≈ ${n0(f.costoFalla)} bbl` : 'sin cifra'], ['¿Lo vigila TRIM?', f.vigilado ? 'sí' : 'sin instrumento']] as Array<[string, string]>,
      ...(f.subio || f.sinDato ? { imprimir: 'pista' as const } : {}),
      'data-fila-critica': f.equipo, 'data-campo': f.campoId, 'data-bpd': f.bpd ?? '', 'data-costo': f.costoFalla ?? '', 'data-grupo': f.grupo }
    return (
      <div key={`${f.campoId}:${f.equipo}`} className={cn('border-b border-[var(--linea2)] last:border-0', oculta && 'solo-impresion')}>
        {abrible(f)
          ? <Tip as="button" {...props} onClick={() => onAbrir(f.campoId, f.equipo)} className={cn(rejilla, 'w-full cursor-pointer py-1.5 text-left hover:bg-[var(--panel2)]')}>{cuerpo}</Tip>
          : <Tip as="div" role="group" {...props} className={cn(rejilla, 'py-1.5')}>{cuerpo}</Tip>}
      </div>
    )
  }

  return (
    <div data-partible className="mt-2 border-t border-[var(--linea2)] pt-2 first-of-type:border-0 first-of-type:pt-0" data-si-falla={c.campoId}>
      {global && <h3 className="mb-1 text-[12.5px] font-semibold">{nombre}</h3>}
      {raices.map(f => (
        <p key={f.equipo} data-parado={f.equipo} data-perdiendo={f.perdiendoBpd ?? ''} className="mb-1 flex items-start gap-1.5 text-[12px]">
          <MarcaPrioridad s={sev(f)} tamano={13} className="mt-0.5" />
          {/* La frase la hace el motor: la bomba, «está parada… cuando vuelva…»; el servicio, «está caído: se pierden N bbl/d ahora». */}
          <span className="min-w-0">{f.porque}{/[.?!]$/.test(f.porque) ? '' : '.'}</span>
        </p>
      ))}
      {pozosParados.length > 0 && (
        <p className="mb-1 pl-[19px] text-[11px] text-[var(--tinta2)]">
          {raices.length ? 'También parados' : 'Parados'}: {lista(pozosParados.map(f => f.equipo))} · van en «Perdiéndose ahora», no en la lista.
        </p>
      )}
      {c.cambioHoy && <p className="mb-1 text-[12px]" data-cambio-hoy="">{c.cambioHoy}</p>}
      {rol === 'conf' && c.proximoInstrumento && (
        <p className="mb-1 text-[11.5px] text-[var(--tinta2)]" data-decide="conf">
          <b className="font-semibold text-[var(--tinta)]">¿Dónde va el próximo instrumento?</b> {c.proximoInstrumento}
        </p>
      )}
      {rol === 'jefe' && c.noIntervenir && (
        <p className="mb-1 text-[11.5px] text-[var(--tinta2)]" data-decide="jefe">{c.noIntervenir}</p>
      )}
      {/* El cruce con el programa (U2 §6.4): un trabajo sobre lo que hoy vale más. Moverlo es del programa de paradas firmado. */}
      {rol === 'jefe' && c.avisosTrabajo.map(a => (
        <p key={a.tarea} className="mb-1 text-[11.5px] text-[var(--tinta2)]" data-aviso-trabajo={a.tarea}>
          {a.texto} <span className="text-[var(--tinta3)]">El programa lo cambia el administrador en Configuración, con firma.</span>
        </p>
      ))}

      {/* Un campo de gas: lo que cuesta una falla en gas todavía no se calcula, y se dice así (B-18). */}
      {c.campoDeGas ? <p className="text-[11.5px] text-[var(--tinta2)]" data-campo-de-gas>{c.campoDeGas}</p>
        : filas.length === 0
          ? <p className="text-[11.5px] text-[var(--tinta2)]">Ningún equipo de {nombre} tiene con qué medir su falla.</p>
          : (
            <>
              <div aria-hidden className={cn(rejilla, 'hidden border-b border-[var(--linea2)] pb-1 text-[10px] text-[var(--tinta3)] lg:grid')}>
                <span className="[grid-area:n]">#</span><span className="[grid-area:e]">Equipo</span><span className="[grid-area:t]">Se trabaría en</span>
                <span className="text-right [grid-area:c]">Si falla hoy</span><span className="text-right [grid-area:d]">Después de</span>
                <span className="text-right [grid-area:f]">Una falla ≈</span><span className="text-right [grid-area:v]">¿Lo vigila TRIM?</span>
              </div>
              <div data-grupo-si-falla="medido">
                {medidos.map(f => fila(f, lista_.resto.includes(f)))}
                <VerMas ocultas={lista_.ocultas} abierto={lista_.abierto} onAlternar={lista_.alternar} />
              </div>
              {techos.length > 0 && (
                <div data-grupo-si-falla="techo">
                  <h4 className={subtitulo}>Sin cifra todavía · techo si cierran todos sus pozos</h4>
                  {techos.map(f => fila(f, false))}
                  <p className="mt-0.5 text-[10.5px] text-[var(--tinta3)]">«hasta»: supone que se cierran todos los pozos que dependen del equipo; no descuenta respaldo ni tanque. No tiene puesto: no se ordena con las cifras calculadas.</p>
                </div>
              )}
              {sinCifra.length > 0 && (
                <div data-grupo-si-falla="sin-dato">
                  <h4 className={subtitulo}>Sin dato · lo que falta para calcularlos</h4>
                  {sinCifra.map(f => fila(f, false))}
                </div>
              )}
            </>
          )}
      {c.sinCalcular.length > 0 && !c.campoDeGas && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]" data-sin-calcular="">
          <span className="rounded-sm border border-dashed border-[var(--tinta3)] px-1">sin dato</span>
          <span>{lista(c.sinCalcular.map(x => x.nombre))}.</span>
          {/* Un solo motivo se dice; varios, cada uno con su elemento en el ⓘ. */}
          {c.sinCalcular.every(x => x.motivo === c.sinCalcular[0]!.motivo)
            ? <span>{c.sinCalcular[0]!.motivo}.</span>
            : <Info titulo="Sin dato" texto={c.sinCalcular.map(x => `${x.nombre}: ${x.motivo}`).join('. ')} />}
        </p>
      )}
    </div>
  )
}

/** «Si falla hoy» de UN equipo, para su ficha (U2 §1.2 y §1.5; B-37): cuánto
 *  dejaría de sacar el campo, dónde se trabaría, su puesto en la lista y, si
 *  subió porque otro está parado, por qué. Sin puesto si es un techo o no tiene
 *  cifra: no se ordena con lo medido. Lo dice el motor (`useCriticidad`). */
export function SiFallaHoyFicha({ campoId, equipo, className }: { campoId: string; equipo: string; className?: string }) {
  const v = useCriticidad([campoId])
  const c = v.campos.find(x => x.campoId === campoId)
  const f = [...v.ranking, ...(c?.parados ?? [])].find(x => x.equipo === equipo && x.campoId === campoId)
  if (!f) return null
  const donde = `${DONDE_CHOKE[f.tramo]}${f.tramo === 'planta' && f.servidos > 0 ? ` (${plural(f.servidos, 'pozo', 'pozos')})` : ''}`
  const cifra = f.parado ? `ya está parado: se pierden ${n0(f.perdiendoBpd ?? 0)} bbl/d ahora`
    : c?.campoDeGas ? c.campoDeGas
      : f.bpd === null ? `sin dato${f.sinDato ? `: ${f.sinDato.replace(/\.$/, '')}` : ''}`
        : f.grupo === 'techo' ? `hasta ${n0(f.bpd)} bbl/d (un techo: supone que se cierran todos sus pozos)`
          : f.bpd === 0 ? 'no cierra pozos' : `${n0(f.bpd)} bbl/d${f.colchonH !== undefined ? ` después de ${colchon(f.colchonH)} de colchón` : ''}`
  return (
    <p className={cn('text-[11.5px] leading-snug', className)} data-si-falla-ficha={equipo}>
      <b className="font-semibold">Si falla hoy:</b> {cifra}
      {!f.parado && !c?.campoDeGas && <> · se trabaría {donde}{f.puesto !== null ? ` · puesto ${f.puesto} de lo que más cuesta` : ''}</>}
      {f.subio && <span className="block text-[var(--tinta2)]">{f.subio.porque}.</span>}
      {!f.vigilado && <span className="block text-[var(--tinta2)]">Sin instrumento: TRIM no ve venir su falla.</span>}
    </p>
  )
}
