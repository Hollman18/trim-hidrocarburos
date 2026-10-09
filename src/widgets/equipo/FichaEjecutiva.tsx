import { useRango } from '@/app/store'
import { useRiesgo, usePreguntas } from '@/shared/api/diferidos'
import { useFichaEquipo } from '@/shared/api/equipos'
import { NOMBRE_PARTE, type ParteId } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { fechaHora, fechaCorta, horasEntre, AHORA } from '@/entities/reloj'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { n0, usd, plural } from '@/shared/lib/formato'
import { fmtHoras, respaldoAbsorbe } from '@/widgets/bombas/comun'

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

  // Cómo está: lo que se pierde (la cifra) y, debajo, las dos horas cuando son distintas.
  const cifra = perdiendo ? `${n0(perdiendo.bblDia)} bbl/d` : undefined
  const estado = perdiendo
    ? `${perdiendo.desde ? `Parada desde ${fechaHora(perdiendo.desde)}` : 'Parada'}${perdiendo.cierreDesde && perdiendo.desde && perdiendo.cierreDesde.getTime() - perdiendo.desde.getTime() > 60_000 ? ` · pozos cerrados desde ${fechaHora(perdiendo.cierreDesde)}` : ''}`
    : cerradoPor ? `Cerrado por ${cerradoPor.equipo}${desdeCierre ? ` desde ${fechaHora(desdeCierre)}` : ''}`
      // Sin nada de eso, el estado ya va en la cabecera de la ficha («… · en servicio»): no se repite.
      : enRiesgo ? `En marcha · si para, ${n0(enRiesgo.bblDia)} bbl/d` : undefined

  // Qué se está haciendo, en corto; el porqué, en su ⓘ (y en el papel).
  let haciendo: string, porque: string | undefined, noArrancar = false
  if (pregunta) {
    haciendo = `Espera que se identifique el daño · hace ${fmtHoras(horasEntre(pregunta.inicio, AHORA), true)}`
    porque = 'Quien la revise tiene que registrar qué se dañó: por regla no se arranca hasta identificarlo.'
    noArrancar = true
  } else if (cerradoPor) {
    haciendo = `Su pozo está bien · espera a ${cerradoPor.equipo}`
    porque = `Lo cerró ${cerradoPor.equipo}. Vuelve a producir cuando esa causa se resuelva.`
  } else if (abierta) haciendo = `Parada por ${abierta.parte ? NOMBRE_PARTE[abierta.parte].toLowerCase() : 'una falla'} · lleva ${fmtHoras(horasEntre(abierta.inicio, AHORA), true)}${hist?.mdtH ? ` · suele durar ${fmtHoras(hist.mdtH, true)}` : ''}`
  else if (perdiendo) haciendo = perdiendo.motivo
  else if (enRiesgo?.parte) {
    haciendo = `${NOMBRE_PARTE[enRiesgo.parte]} avisa${enRiesgo.horas !== undefined ? ` · límite en ${fmtHoras(enRiesgo.horas)}` : ''}`
    porque = 'Mantenimiento tiene la acción en su pantalla.'
  } else if (enRiesgo) {
    // Un servicio en alarma no tiene partes: se dice su estado y su lectura.
    haciendo = mayuscula(eq.estado)
    porque = eq.lectura
  } else if (hist) haciendo = 'En marcha · ninguna parte avisa'
  else if (eq.clase === 'pozo') haciendo = mayuscula(eq.estado)
  else {
    // Un servicio (o un equipo sin partes vigiladas) que no está en riesgo ni
    // cerrando pozos: su estado y que hoy no le quita producción. Si está en
    // aviso (SE-2: P3), la lectura dice por qué.
    haciendo = `${mayuscula(eq.estado)} · sin efecto en la producción hoy`
    porque = eq.severidad ? eq.lectura : undefined
  }

  return (
    // El nombre del equipo ya va en la cabecera de la ficha.
    <div className="grid gap-3 text-[12.5px]">
      {(cifra || estado) && <div className="flex items-start gap-2.5">
        <MarcaPrioridad s={eq.severidad} tamano={16} className="mt-[3px]" />
        <span className="min-w-0">
          {cifra && <b className="tabular block text-[18px] leading-tight">{cifra} <small className="text-[11px] font-normal text-[var(--tinta3)]">perdiéndose</small></b>}
          {estado && <span className="block text-[11.5px] text-[var(--tinta2)]">{estado}</span>}
        </span>
      </div>}

      {eq.clase === 'catalogo' && (
        <div className="flex flex-wrap gap-1">
          <Chip tono={eq.redundancia === 'sin respaldo' ? 'fuerte' : 'neutro'}>{eq.redundancia}</Chip>
          <Chip>si para: {eq.aguasAbajo}</Chip>
        </div>
      )}
      <Renglon k="Le ha costado"
        v={`${n0(periodo.bbl)} bbl en ${rango.nombre.toLowerCase()}${vPeriodo ? ` · ${vPeriodo.valor} ${vPeriodo.unidad}` : ''}`}
        pie={`${n0(historia.bbl)} bbl desde ${desdeHistoria}${vHistoria ? ` · ${vHistoria.valor} ${vHistoria.unidad}` : ''}`} />
      {hist && (
        <Renglon k="Cada cuánto falla"
          v={hist.fallas ? `${plural(hist.fallas, 'falla', 'fallas')}${hist.mtbfDias ? ` · una cada ${n0(hist.mtbfDias)} días` : ''}`
            : hist.disparos ? `No ha fallado · ${plural(hist.disparos, 'disparo', 'disparos')} que volvieron a arrancar` : 'No ha fallado'}
          pie={hist.bblPorFalla !== undefined ? `le ha costado ${n0(hist.bblPorFalla)} bbl por falla, en promedio` : undefined} />
      )}
      {partes.length > 0 && totalPartes > 0 && (
        <Renglon k="Por qué parte · % de bbl" info="Porcentaje de los barriles de sus fallas."
          v={partes.map(([p, b]) => `${NOMBRE_PARTE[p].toLowerCase()} ${n0((b / totalPartes) * 100)} %`).join(' · ')} />
      )}
      {veces !== undefined && <Renglon k="Veces que cerró pozos" v={plural(veces, 'vez', 'veces')} />}
      {pr && !pr.parada && pr.inmediato && pr.colchon && (
        <Renglon k="Si para ahora" v={respaldoAbsorbe(pr) ? 'no cierra pozos: el respaldo absorbe toda el agua'
          : `el tanque aguanta ${fmtHoras(pr.colchon.horas)} · luego se pierden ${n0(pr.crudoBpd)} bbl/d`} />
      )}
      <Renglon k="Qué se está haciendo" v={haciendo} info={porque} chip={noArrancar ? 'no arrancar' : undefined} />
    </div>
  )
}

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

function Renglon({ k, v, pie, info, chip }: { k: string; v: string; pie?: string; info?: string; chip?: string }) {
  return (
    <div className="border-t border-[var(--linea2)] pt-2">
      <small className="block text-[10.5px] text-[var(--tinta3)]">{k}</small>
      <span className="flex flex-wrap items-center gap-x-1.5">
        <span>{v}</span>
        {chip && <Chip tono="fuerte">{chip}</Chip>}
        {info && <Info titulo={k} texto={info} />}
      </span>
      {pie && <small className="block text-[10.5px] text-[var(--tinta2)]">{pie}</small>}
    </div>
  )
}
