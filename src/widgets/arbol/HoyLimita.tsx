import { useTuberia, useTuberiaAgua, useCriticidad, NOMBRE_CHOKE_CAMPO, DONDE_CHOKE, type FilaCriticidad } from '@/shared/api/choke'
import { campoPorId } from '@/entities/campos'
import { Info } from '@/shared/ui/Info'
import { n0 } from '@/shared/lib/formato'
import { Falta } from './Cadena'
import { lista } from './palabras'

const ROTULO = 'text-[10.5px] text-[var(--tinta3)]'

/** «Hoy limita»: la línea del supervisor en Turno (U2 §3.1 y §12, punto 1).
 *  Separa tres preguntas que en el demo no tienen la misma respuesta (U2 §0,
 *  principio 2): qué limita hoy al campo (el tramo más angosto, estructural),
 *  lo más frágil (el agua: sin bomba de sobra, una falla la vuelve el tramo
 *  más angosto) y lo que más cuesta si falla hoy. Mezclarlas manda el vigía y
 *  el repuesto al lugar equivocado. «Limita» va en gris con doble contorno:
 *  no es una alarma, todo campo tiene uno (principio 4). Todo lo dice el motor. */
export function HoyLimita({ campos, desde, hasta }: { campos: string[]; desde: Date; hasta: Date }) {
  const k = useCriticidad(campos)
  return (
    <section aria-label="Hoy limita" className="mb-2.5 grid gap-2 rounded border border-[var(--linea)] bg-[var(--panel)] p-3 shadow-[var(--sombra)]">
      {campos.map(c => (
        <HoyLimitaCampo key={c} campoId={c} desde={desde} hasta={hasta} conNombre={campos.length > 1}
          ranking={k.ranking.filter(x => x.campoId === c)} cambioHoy={k.campos.find(x => x.campoId === c)?.cambioHoy} />
      ))}
    </section>
  )
}

function HoyLimitaCampo({ campoId, desde, hasta, conNombre, ranking, cambioHoy }: {
  campoId: string; desde: Date; hasta: Date; conNombre: boolean; ranking: FilaCriticidad[]; cambioHoy: string | undefined
}) {
  const t = useTuberia(campoId, desde, hasta)
  const a = useTuberiaAgua(campoId)
  const limita = t.tramos.find(x => x.limita)
  // Lo más frágil: lo que una sola falla vuelve el tramo más angosto. Con una bomba
  // ya parada, lo dice la línea «Cambió hoy» de «Si falla hoy» (sus hermanas suben);
  // con todas en marcha, la frase del agua «si para una» (U2 §5.3-5.4).
  const una = a.sinUna
  const fragil = cambioHoy
    ?? (una && una.papel === 'disposicion' && !una.parada && una.aguaSinSalidaBpd > 0 ? a.frases.find(f => f.startsWith(`Si para ${una.bomba}`)) : undefined)
  // Lo que más cuesta si falla hoy: el primero de la lista, con los que empatan con él.
  const primero = ranking[0]
  const empatados = primero && primero.bpd !== null ? ranking.filter(x => x.bpd === primero.bpd) : []
  const fila = 'grid gap-x-3 gap-y-0.5 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:items-baseline'

  return (
    <div className="grid gap-1.5 text-[11.5px]" data-hoy-limita={campoId}>
      {conNombre && <b className="text-[12px]">{campoPorId(campoId).nombre}</b>}
      <div className={fila}>
        <span className={ROTULO}>Qué limita hoy al campo</span>
        {t.limita && limita?.potencialBpd != null ? (
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span aria-label={`Limita: ${NOMBRE_CHOKE_CAMPO[t.limita].toLowerCase()}, ${n0(limita.potencialBpd)} bbl por día`}
              className="inline-flex items-center gap-1 rounded-sm border-[3px] border-double border-[var(--tinta2)] px-1.5 font-semibold">
              <span aria-hidden>◄</span> limita · {NOMBRE_CHOKE_CAMPO[t.limita].toLowerCase()} · <span className="tabular">{n0(limita.potencialBpd)} bbl/d</span>
            </span>
            <small className="text-[10.5px] text-[var(--tinta2)]">{t.frase}</small>
            <Info titulo="Limita" texto="El tramo más angosto. No es una alarma: todo campo tiene uno. TRIM lo calcula con las pruebas de los pozos y las capacidades firmadas; nadie lo escribe a mano." />
          </span>
        ) : <span className="flex flex-wrap items-center gap-1.5"><Falta>sin dato</Falta><small className="text-[10.5px] text-[var(--tinta2)]">{t.textoCorto}</small></span>}
      </div>
      {fragil && (
        <div className={fila}>
          <span className={ROTULO}>Lo más frágil</span>
          <span>
            <b className="font-semibold">el agua</b> <span className="text-[var(--tinta2)]">· {fragil}</span>
          </span>
        </div>
      )}
      {primero && primero.bpd !== null && (
        <div className={fila}>
          <span className={ROTULO}>Lo que más cuesta si falla hoy</span>
          <span className="flex flex-wrap items-center gap-x-1.5">
            <b className="font-semibold">{empatados.length > 3 ? `${empatados.slice(0, 3).map(x => x.equipo).join(', ')} y ${empatados.length - 3} más` : lista(empatados.map(x => x.equipo))}</b>
            <span className="text-[var(--tinta2)]">
              · {n0(primero.bpd)} bbl/d{empatados.length > 1 ? ' cada uno' : ''}, se trabaría {DONDE_CHOKE[primero.tramo]}
              {primero.colchonH !== undefined ? ' después del colchón del tanque' : ''}{primero.estimacion ? ' · estimación: supone que se cierran todos sus pozos' : ''}
            </span>
            <Info titulo="Si falla hoy" texto={`${empatados.length > 3 ? `Empatan ${lista(empatados.map(x => x.equipo))}. ` : ''}${primero.porque.replace(/\.$/, '')}.${primero.sinDato ? ` ${primero.sinDato.replace(/\.$/, '')}.` : ''} Cuánto dejaría de sacar el campo por día si este equipo para hoy, después de lo que aguanta el tanque y de lo que toma el respaldo. Cambia con lo que esté parado.`} />
          </span>
        </div>
      )}
    </div>
  )
}

/** El chip «en la planta» o «en el pozo» de una fila de «Pasando ahora» (U2
 *  §3.1): dónde se trabó lo que se está perdiendo ahora, según el motor del
 *  tramo (`TuberiaCampo.perdiendoAhora`). Lo que todavía no tiene causa va en
 *  gris discontinuo. */
export function DondeSeTrabo({ campoId, equipo, desde, hasta }: { campoId: string; equipo: string; desde: Date; hasta: Date }) {
  const t = useTuberia(campoId, desde, hasta)
  const x = t.perdiendoAhora.find(y => y.equipo === equipo)
  if (!x) return null
  return x.tramo
    ? <span className="font-cond inline-flex items-center rounded-sm border border-[var(--linea2)] bg-[var(--panel2)] px-1.5 text-[10px] font-semibold tracking-[.05em] text-[var(--tinta3)]">{DONDE_CHOKE[x.tramo]}</span>
    : <Falta className="text-[10px]">dónde: {DONDE_CHOKE['sin-asignar']}</Falta>
}
