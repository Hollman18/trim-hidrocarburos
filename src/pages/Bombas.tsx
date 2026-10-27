import { useApp, useAmbito, useRango, useNivel } from '@/app/store'
import { useTuberiaAgua, useCriticidad } from '@/shared/api/choke'
import { Boton, Chip } from '@/shared/ui/primitivas'
import { campoPorId } from '@/entities/campos'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, plural } from '@/shared/lib/formato'
import { useBombas } from '@/shared/api/equipos'
import { Placa } from '@/widgets/bombas/Placa'
import { CondicionEquipo } from '@/widgets/bombas/SenalFija'
import { useCondiciones } from '@/widgets/pozos/estado'
import { fmtBbl, fmtRango, fmtHoras, pronosticoCorto } from '@/widgets/bombas/comun'

/** La estación de bombas: el nivel 2 de ISA-101. Las bombas multifásicas y
 *  de inyección son las que deciden la producción de la planta; aquí se ve
 *  cuáles están costando crudo ahora, cuánto, y cuál va a ser la próxima. */
export function Bombas() {
  const ambito = useAmbito()
  const rango = useRango(); const nivel = useNivel()
  const setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo)

  const bombas = useBombas(ambito.campos.map(c => c.id), rango.desde, rango.hasta)
  // F3 · La marca de cada bomba es la de la franja (una por equipo, la misma en todas partes: H3).
  const condicionDe = useCondiciones(ambito.campos.map(c => c.id))
  // C4 · Una placa abre el nivel 3 de su bomba (X4 §5.3): la vista entera, con su
  // diagnóstico (el nivel 4) detrás de «Ver el diagnóstico». Antes era un detalle aquí mismo.
  const abrir = (campoId: string, equipo: string) => { setCampo(campoId); abrirEquipo(equipo) }

  // Lo que se deja de producir AHORA: pozos cerrados por bombas detenidas.
  const costando = bombas.filter(b => b.veredicto?.prediccion.perdiendo?.bblDia)
  const porHora = costando.reduce((a, b) => a + b.veredicto!.prediccion.perdiendo!.bblDia / 24, 0)
  // Sumar en línea los rangos es conservador: no supone que los sesgos de
  // campos distintos se compensen.
  const medido = bombas.reduce((a, b) => a + (b.periodo?.bbl ?? 0), 0)
  const medidoRango = bombas.reduce<[number, number]>((a, b) =>
    b.periodo ? [a[0] + b.periodo.rango[0], a[1] + b.periodo.rango[1]] : a, [0, 0])
  // La próxima: de todas las partes de las bombas en marcha, la que antes llega
  // a su límite de falla, con el mismo criterio que el riesgo y el vigía: una
  // parte con su variable ya en alarma también cuenta (a igual tiempo, va primero).
  const proxima = bombas.filter(b => !b.abierta).flatMap(b =>
    b.partes.filter(p => p.primera && (p.estado === 'fuera' || p.estado === 'avisa')).map(p => ({ b, p })))
    .sort((x, y) => x.p.primera!.senal.pronostico.horas - y.p.primera!.senal.pronostico.horas)[0]
  const sinPerfil = bombas.filter(b => !b.perfil).length

  return (
    <div className="grid gap-3 sm:gap-4">
      <div className="grid gap-x-6 gap-y-3 rounded-[20px] bg-[var(--panel)] p-4 sm:px-6 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <span>
          <small className="block text-[13px] text-[var(--tinta2)]">Se deja de producir ahora, por bombas paradas</small>
          {/* Un total no es una alarma: va en tinta y la marca va en la bomba que lo causa (B-40; U1 §9.3). */}
          <b className="tabular block text-[30px] leading-none">
            {n0(porHora * 24)}<span className="ml-1 text-[14px] font-normal text-[var(--tinta3)]">bbl/d</span>
          </b>
          {/* P-bombas-1: los pozos cerrados una vez; el ritmo va en la ⓘ de cada placa y la hora la dice la cabecera. */}
          <small className="block text-[14px] text-[var(--tinta2)]" data-bombas-detenidas>
            {costando.length ? `${plural(costando.length, 'bomba detenida', 'bombas detenidas')} · ${plural(costando.reduce((a, b) => a + b.veredicto!.prediccion.perdiendo!.pozos.length, 0), 'pozo cerrado', 'pozos cerrados')}` : 'ningún pozo cerrado por una bomba'}
          </small>
          {costando.length > 0 && (
            // La marca de cada una es la del equipo, con su palabra (H3, H16); el total no lleva marca: no es una alarma.
            <small className="flex flex-wrap items-center gap-x-3 text-[14px] text-[var(--tinta2)]">
              {costando.map(b => <span key={b.clave} className="inline-flex items-center gap-1.5"><b className="font-cond text-[15px] tracking-[.02em] text-[var(--tinta)]">{b.eq.id}</b><CondicionEquipo c={condicionDe(b.campo.id, b.eq.id)} tamano={12} /></span>)}
            </small>
          )}
        </span>
        <span>
          <small className="block text-[13px] text-[var(--tinta3)]">Diferido que causaron</small>
          <b className="tabular block text-[22px] leading-tight">{fmtBbl(medido)}</b>
          <small className="tabular block text-[13px] text-[var(--tinta2)]">
            {medido <= 0 ? 'sin paradas con costo' : nivel === 'ingenieria' ? `${fmtRango(medidoRango)} · calculado` : 'calculado'}
          </small>
        </span>
        <span>
          <small className="block text-[13px] text-[var(--tinta3)]">Próxima en fallar</small>
          {proxima ? (
            <>
              <b className="block truncate text-[14px] leading-tight">{proxima.b.eq.id} · {proxima.p.parte.nombre}</b>
              <small className="tabular block text-[13px] text-[var(--tinta2)]">
                {ambito.global ? `${proxima.b.campo.nombre} · ` : ''}{proxima.p.primera!.senal.plantilla.nombre.toLowerCase()} · {pronosticoCorto(proxima.p.primera!.senal.pronostico)}
              </small>
            </>
          ) : <b className="block text-[14px] text-[var(--tinta3)]">ninguna</b>}
          {/* Las que no tienen instrumento no se pueden predecir: se dice de cuáles es la cuenta. */}
          <small className="block text-[13px] text-[var(--tinta3)]">de las que tienen instrumento</small>
        </span>
        <span className="text-right">
          {/* El ámbito ya lo dice la cabecera: aquí, cuántas son y cuántas no tienen perfil. */}
          <b className="tabular block text-[22px] leading-none">{bombas.length}</b>
          <small className="text-[13px] text-[var(--tinta3)]">
            {bombas.length === 1 ? 'bomba con instrumento' : 'bombas con instrumento'}{sinPerfil ? ` · ${sinPerfil} sin perfil` : ''}
          </small>
        </span>
      </div>

      <Lectura>
        <b>Se deja de producir ahora</b> es el crudo de los pozos que están cerrados porque una bomba de
        la línea está detenida, pozo por pozo con su prueba, a la hora de referencia. <b>Diferido que
        causaron</b> es lo que ya se dejó de producir en el período por paradas de estas bombas (se le
        carga a la bomba que paró), con su rango de tolerancia: es calculado, no medido. <b>Próxima en
        fallar</b> es, de las bombas en marcha, la parte que antes llega a su límite. Cada placa trae
        las cuatro variables que más dicen de esa bomba, con su banda normal y una escala que sale de
        sus límites firmados (provisional: falta el rango de cada instrumento), las partes que avisan (las estables van juntas en un renglón: toque o pase el
        cursor para ver cuáles) y <b>si falla hoy</b>: cuánto aguanta el tanque y cuánto crudo se deja
        de producir después, cerrando los pozos en el orden que menos cuesta. Las ⓘ dicen el porqué.
      </Lectura>

      <div className="grid items-stretch gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr))]">
        {bombas.map(b => (
          <Placa key={b.clave} b={b} global={ambito.global} nivel={nivel} onAbrir={() => abrir(b.campo.id, b.eq.id)} />
        ))}
      </div>

      {bombas.length === 0 && (
        <p className="text-[14px] text-[var(--tinta2)]">
          Sin bombas multifásicas ni de inyección instrumentadas.
        </p>
      )}

      {/* Las bombas del tren de agua sin instrumento también están (B-01): hoy pueden ser las que sacan toda el agua. */}
      {ambito.campos.map(c => <SinInstrumento key={c.id} campoId={c.id} global={ambito.global} />)}
      {/* La leyenda de las prioridades ya no va: cada marca lleva su palabra al lado (H16). */}
    </div>
  )
}

/** El colchón como lo dice «Si falla hoy»: bajo una hora, en minutos. */
const colchon = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : fmtHoras(h, true))

/** Las bombas del tren de agua sin instrumento de un campo (P-201A y P-201C de
 *  La Ceiba): TRIM no las ve, pero existen y hoy pueden ser las que sacan toda
 *  el agua (B-01). Lo que se sabe: su capacidad, que se suponen en marcha y lo
 *  que costaría que fallaran hoy (el motor: `useTuberiaAgua`, `useCriticidad`). */
function SinInstrumento({ campoId, global }: { campoId: string; global: boolean }) {
  const a = useTuberiaAgua(campoId)
  const crit = useCriticidad([campoId])
  const setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo)
  const sin = (a.tramos.find(x => x.tramo === 'bombas')?.bombas ?? []).filter(b => !b.instrumentada && !b.reserva)
  if (!sin.length) return null
  return (
    <section className="rounded-[20px] bg-[var(--panel)]" data-sin-instrumento={campoId} aria-label="Bombas sin instrumento">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pt-4 sm:px-6">
        <h2 className="text-[16px] font-semibold">Sin instrumento{global ? ` · ${campoPorId(campoId).nombre}` : ''}</h2>
        <span className="text-[13px] text-[var(--tinta2)]">{sin.length === 1 ? '1 bomba' : `${sin.length} bombas`}</span>
      </header>
      <div className="grid gap-0 px-4 pb-3 pt-1 sm:px-6">
        {sin.map(b => {
          const f = crit.ranking.find(x => x.equipo === b.id && x.campoId === campoId)
          return (
            <div key={b.id} data-bomba-sin-instrumento={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--linea2)] py-2 text-[14px] last:border-0">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-1.5">
                  <i aria-hidden className="inline-block h-2.5 w-3.5 rounded-[1px] border border-dashed border-[var(--tinta3)]" />
                  <b className="font-cond text-[15px] tracking-[.02em]">{b.id}</b><span className="text-[14px] text-[var(--tinta2)]">· bomba de agua</span>
                  <Chip>┄ sin instrumento</Chip>
                </span>
                <small className="block text-[14px] text-[var(--tinta2)]">Se supone en marcha · {b.papel === 'recobro' ? 'recobro' : 'reinyección'} · {n0(b.capacidadBpd)} bbl/d de agua</small>
                {f && f.bpd !== null && (
                  <small className="block text-[14px]">Si falla hoy: <b className="tabular">{n0(f.bpd)} bbl/d</b>{f.colchonH !== undefined ? ` después de ${colchon(f.colchonH)} de colchón` : ''}{f.subio ? ` · sube porque ${f.subio.otro} está parada` : ''}</small>
                )}
              </span>
              <Boton variante="chico" className="min-h-12 sm:min-h-0" onClick={() => { setCampo(campoId); abrirEquipo(b.id, false) }} aria-label={`Abrir ${b.id}`}>Abrir</Boton>
            </div>
          )
        })}
      </div>
    </section>
  )
}
