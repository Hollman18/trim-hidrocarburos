import { useRango } from '@/app/store'
import { useRiesgo, usePreguntas } from '@/shared/api/diferidos'
import { useFichaEquipo } from '@/shared/api/equipos'
import { NOMBRE_PARTE, type ParteId } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { fechaHora, fechaCorta, horasEntre, AHORA } from '@/entities/reloj'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { n0, usd, plural } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'

/** Lo que un directivo necesita de un equipo: cómo está, cuánto le ha
 *  costado, por qué parte falla y qué se está haciendo. Sin tags, sin
 *  señales, sin tolerancias: eso es de quien lo opera o lo repara. Los
 *  números son los mismos del libro. */
export function FichaEjecutiva({ campoId, equipo }: { campoId: string; equipo: string }) {
  const rango = useRango()
  const riesgo = useRiesgo([campoId]).filter(r => r.equipo === equipo)
  const pregunta = usePreguntas([campoId]).find(p => p.equipo === equipo && p.pide && !p.fin)
  // La ficha y su historia: toda la que hay, del libro (la misma cuenta que el Pareto).
  const ficha = useFichaEquipo(campoId, equipo, rango.desde, rango.hasta)
  if (!ficha) return <p className="text-[12px] text-[var(--tinta2)]">Este equipo no está en {campoPorId(campoId).nombre}.</p>
  const { eq, periodo, historia, hist, veces, prediccion: pr, cerradoPor, desdeCierre } = ficha

  const perdiendo = riesgo.find(r => r.estado === 'perdiendo')
  const enRiesgo = riesgo.find(r => r.estado === 'en-riesgo')
  // Cada tramo con el precio que regía cuando pasó (lo calcula el servidor).
  const vPeriodo = periodo.usd !== undefined ? usd(periodo.usd) : undefined, vHistoria = historia.usd !== undefined ? usd(historia.usd) : undefined
  const desdeHistoria = fechaCorta(ficha.desdeHistoria)
  // De qué falla: solo fallas (un disparo que arrancó solo no es falla).
  const fallas = hist?.eventos.filter(x => !x.disparo) ?? []
  const porParte = new Map<ParteId, number>()
  for (const x of fallas) if (x.parte) porParte.set(x.parte, (porParte.get(x.parte) ?? 0) + x.bbl)
  const totalPartes = [...porParte.values()].reduce((a, b) => a + b, 0)
  const partes = [...porParte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
  const abierta = fallas.find(x => !x.fin)

  // Cómo está, en una línea, con las dos horas cuando son distintas.
  const estado = perdiendo
    ? `${perdiendo.desde ? `Parada desde ${fechaHora(perdiendo.desde)}` : 'Parada'}${perdiendo.cierreDesde && perdiendo.desde && perdiendo.cierreDesde.getTime() - perdiendo.desde.getTime() > 60_000 ? ` · pozos cerrados desde ${fechaHora(perdiendo.cierreDesde)}` : ''} · ${n0(perdiendo.bblDia)} bbl/d perdiéndose`
    : cerradoPor ? `Cerrado por ${cerradoPor.equipo}${desdeCierre ? ` desde ${fechaHora(desdeCierre)}` : ''}`
      : enRiesgo ? `En marcha · si falla, ${n0(enRiesgo.bblDia)} bbl/d` : eq.estado.charAt(0).toUpperCase() + eq.estado.slice(1)

  // Qué se está haciendo, en una frase, con lo que dicen los equipos.
  let haciendo: string
  if (pregunta) haciendo = `Espera hace ${fmtHoras(horasEntre(pregunta.inicio, AHORA), true)} que quien la revise registre qué se dañó: por regla no se arranca hasta identificarlo.`
  else if (cerradoPor) haciendo = `Su pozo está bien: lo cerró ${cerradoPor.equipo}. Vuelve a producir cuando esa causa se resuelva.`
  else if (abierta) haciendo = `Parada por ${abierta.parte ? NOMBRE_PARTE[abierta.parte].toLowerCase() : 'una falla'}. Lleva ${fmtHoras(horasEntre(abierta.inicio, AHORA), true)}${hist?.mdtH ? `; sus fallas suelen durar ${fmtHoras(hist.mdtH, true)}` : ''}.`
  else if (perdiendo) haciendo = `${perdiendo.motivo}.`
  else if (enRiesgo) haciendo = `${enRiesgo.parte ? NOMBRE_PARTE[enRiesgo.parte] : 'Una parte'} avisa${enRiesgo.horas !== undefined ? `: llega a su límite en ${fmtHoras(enRiesgo.horas)}` : ''}. Mantenimiento tiene la acción en su pantalla.`
  else haciendo = 'En marcha, sin ninguna parte que avise.'

  return (
    <div className="grid gap-3 text-[12.5px]">
      <div className="flex items-start gap-2.5">
        <MarcaPrioridad s={eq.severidad} tamano={16} className="mt-[2px]" />
        <span className="min-w-0">
          <b className="block text-[15px] leading-tight">{eq.nombre}</b>
          <span className="text-[11.5px] text-[var(--tinta2)]">{estado}</span>
        </span>
      </div>

      {eq.clase === 'catalogo' && (
        <Renglon k="Qué es" v={`${eq.redundancia === 'sin respaldo' ? 'Sin respaldo' : eq.redundancia} · si para, afecta a ${eq.aguasAbajo}`} />
      )}
      <Renglon k="Le ha costado"
        v={`${n0(periodo.bbl)} bbl en ${rango.nombre.toLowerCase()}${vPeriodo ? ` (${vPeriodo.valor} ${vPeriodo.unidad})` : ''}`}
        pie={`${n0(historia.bbl)} bbl desde ${desdeHistoria}${vHistoria ? ` · ${vHistoria.valor} ${vHistoria.unidad}` : ''}`} />
      {hist && (
        <Renglon k="Cada cuánto falla"
          v={hist.fallas ? `${plural(hist.fallas, 'falla', 'fallas')}${hist.mtbfDias ? `, una cada ${n0(hist.mtbfDias)} días` : ''}`
            : hist.disparos ? `No ha fallado · ${plural(hist.disparos, 'disparo', 'disparos')} que volvieron a arrancar` : 'No ha fallado'}
          pie={hist.bblPorFalla !== undefined ? `cada falla cuesta en promedio ${n0(hist.bblPorFalla)} bbl` : undefined} />
      )}
      {partes.length > 0 && totalPartes > 0 && (
        <Renglon k="Por qué parte" v={partes.map(([p, b]) => `${NOMBRE_PARTE[p].toLowerCase()} ${n0((b / totalPartes) * 100)} %`).join(' · ')}
          pie="de los barriles de sus fallas" />
      )}
      {veces !== undefined && <Renglon k="Cuántas veces cerró pozos" v={plural(veces, 'vez', 'veces')} />}
      {pr && !pr.parada && pr.inmediato && pr.colchon && (
        <Renglon k="Si para ahora" v={`El tanque aguanta unas ${fmtHoras(pr.colchon.horas)}; después se pierden ${n0(pr.crudoBpd)} bbl/d`} />
      )}
      <Renglon k="Qué se está haciendo" v={haciendo} />
    </div>
  )
}

function Renglon({ k, v, pie }: { k: string; v: string; pie?: string }) {
  return (
    <div className="border-t border-[var(--linea2)] pt-2">
      <small className="block text-[10.5px] text-[var(--tinta3)]">{k}</small>
      <span className="block">{v}</span>
      {pie && <small className="block text-[10.5px] text-[var(--tinta2)]">{pie}</small>}
    </div>
  )
}
