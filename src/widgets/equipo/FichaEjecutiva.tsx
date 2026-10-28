import { cn } from '@/shared/lib/cn'
import { fondoTono, atributoTono, type Tono } from '@/shared/ui/tono'
import { useRango } from '@/app/store'
import { useRiesgo, usePreguntas } from '@/shared/api/diferidos'
import { useCiclo, planesDeEquipo } from '@/shared/api/ciclo'
import { PlanesDe } from '@/widgets/ciclo/Ciclo'
import { useFichaEquipo } from '@/shared/api/equipos'
import { NOMBRE_PARTE, type ParteId } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { fechaHora, fechaCorta, horasEntre, AHORA } from '@/entities/reloj'
import { Bloque, Cifras, Cifra, Reparto } from '@/shared/ui/Cifras'
import { n0, usd, plural } from '@/shared/lib/formato'
import { siPara } from '@/shared/ui/costoHoy'
import { fmtHoras, textoColchon, respaldoAbsorbe } from '@/widgets/bombas/comun'
import { useCondiciones } from '@/widgets/pozos/estado'
import { Bloqueo } from '@/widgets/hoy/piezas'

/** Lo que un directivo necesita de un equipo, en el orden en que lo pregunta: cómo está ahora,
 *  cuánto le ha costado, por qué falla, qué se está haciendo y qué se puede mover. Sin tags, sin
 *  señales, sin tolerancias: eso es de quien lo opera o lo repara. Los números son los mismos del libro.
 *
 *  28-oct (el dueño: «poco texto, números, que se entienda»): cada pregunta es un `Bloque` con la cifra
 *  primero (`Cifra`), el reparto por parte dibujado (`Reparto`) y el porqué en la ⓘ. La marca del
 *  equipo va en la cabecera del modal (H3); «No arrancar» es el bloqueo en tinta con ⊘ (H34; X5 §5.6). */
export function FichaEjecutiva({ campoId, equipo }: { campoId: string; equipo: string }) {
  const rango = useRango()
  const riesgo = useRiesgo([campoId]).filter(r => r.equipo === equipo)
  const ciclo = useCiclo([campoId], rango.desde, rango.hasta)
  const planes = planesDeEquipo(ciclo, campoId, equipo)
  const pregunta = usePreguntas([campoId]).find(p => p.equipo === equipo && p.pide && !p.fin)
  // La ficha y su historia: toda la que hay, del libro (la misma cuenta que el Pareto).
  const ficha = useFichaEquipo(campoId, equipo, rango.desde, rango.hasta)
  const condicion = useCondiciones([campoId])(campoId, equipo)
  if (!ficha) return <p className="text-[14px] text-[var(--tinta2)]">Este equipo no está en {campoPorId(campoId).nombre}.</p>
  const { eq, periodo, historia, hist, veces, prediccion: pr, cerradoPor, desdeCierre } = ficha

  const perdiendo = riesgo.find(r => r.estado === 'perdiendo')
  const enRiesgo = riesgo.find(r => r.estado === 'en-riesgo')
  // Cada tramo con el precio que regía cuando pasó (lo calcula el servidor).
  const vPeriodo = periodo.usd !== undefined ? usd(periodo.usd) : undefined, vHistoria = historia.usd !== undefined ? usd(historia.usd) : undefined
  // De qué falla: solo fallas (un disparo que arrancó solo no es falla). Todas las partes, para que la barra sume 100.
  const fallas = hist?.eventos.filter(x => !x.disparo) ?? []
  const porParte = new Map<ParteId, number>()
  for (const x of fallas) if (x.parte) porParte.set(x.parte, (porParte.get(x.parte) ?? 0) + x.bbl)
  const totalPartes = [...porParte.values()].reduce((a, b) => a + b, 0)
  const partes = [...porParte.entries()].sort((a, b) => b[1] - a[1])
    .map(([p, b]) => ({ nombre: NOMBRE_PARTE[p].toLowerCase(), pct: Math.round((b / totalPartes) * 100) }))
  const abierta = fallas.find(x => !x.fin)

  const tonoAhora: Tono | undefined = perdiendo || cerradoPor ? 'frenado' : enRiesgo ? 'riesgo' : undefined
  // Ahora, sin pérdida en curso: una frase de estado (lo que se pierde va en cifras).
  const estado = cerradoPor ? `Cerrado por ${cerradoPor.equipo}${desdeCierre ? ` desde ${fechaHora(desdeCierre)}` : ''}`
    // Sin nada de eso, el estado ya va en la cabecera del modal («… · en servicio»): no se repite.
    : enRiesgo ? `En marcha · si falla hoy, ${siPara(enRiesgo)}` : undefined

  // Qué se está haciendo, en corto; el porqué, en su ⓘ (y en el papel).
  let haciendo: string, porque: string | undefined
  if (pregunta) {
    haciendo = `Espera que se identifique el daño · hace ${fmtHoras(horasEntre(pregunta.inicio, AHORA), true)}`
    porque = 'Quien la revise tiene que registrar qué se dañó: por regla no se arranca hasta identificarlo.'
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

  // El respaldo, en corto: lo que va antes de «:» se ve; el detalle y a quién deja sin agua, en la ⓘ.
  const [respaldo, ...detalleRespaldo] = eq.redundancia.split(': ')
  const infoRespaldo = [detalleRespaldo.join(': '), eq.aguasAbajo && `Si falla: ${eq.aguasAbajo}.`].filter(Boolean).join(' · ')

  return (
    // El nombre del equipo ya va en la cabecera de la ficha.
    <div className="grid gap-4 text-[15px]" data-ficha-ejecutiva={equipo}>
      {(perdiendo || estado || pregunta) && (
        // 28-oct · Qué atacar: parado y cerrando pozos, en rojo pálido; en marcha con una parte que avisa, en amarillo pálido.
        <Bloque titulo="Ahora" sinLinea className={cn('rounded-[10px] bg-[var(--panel2)] p-4', fondoTono(tonoAhora))} data-condicion={condicion ?? ''} {...atributoTono(tonoAhora)}>
          {perdiendo ? (
            <Cifras>
              <Cifra grande valor={n0(perdiendo.bblDia)} unidad="bbl/d" rotulo="se dejan de producir" />
              {perdiendo.desde && <Cifra valor={fmtHoras(horasEntre(perdiendo.desde, AHORA), true)} rotulo="parada" pie={`desde ${fechaHora(perdiendo.desde)}`} />}
              {perdiendo.pozos > 0 && <Cifra valor={n0(perdiendo.pozos)} rotulo={perdiendo.pozos === 1 ? 'pozo cerrado' : 'pozos cerrados'}
                pie={perdiendo.cierreDesde ? `desde ${fechaHora(perdiendo.cierreDesde)}` : undefined} />}
            </Cifras>
          ) : estado && <p className="text-[16px] font-semibold leading-snug">{estado}</p>}
          {/* «No arrancar» es un bloqueo de procedimiento: la franja en tinta con ⊘, no un chip (H34). */}
          {pregunta && <div className="mt-3"><Bloqueo b={{ texto: `No arrancar hasta identificar ${pregunta.sobre === 'pozo' ? 'por qué paró' : 'qué se dañó'}` }} /></div>}
        </Bloque>
      )}

      <Bloque titulo="Le ha costado">
        <Cifras>
          <Cifra valor={n0(periodo.bbl)} unidad="bbl" rotulo={rango.nombre} pie={vPeriodo && `${vPeriodo.valor} ${vPeriodo.unidad}`} />
          <Cifra valor={n0(historia.bbl)} unidad="bbl" rotulo={`desde ${fechaCorta(ficha.desdeHistoria)}`} pie={vHistoria && `${vHistoria.valor} ${vHistoria.unidad}`} />
        </Cifras>
      </Bloque>

      {hist && (
        <Bloque titulo="Por qué falla" data-por-que-falla=""
          derecha={hist.fallas ? `${plural(hist.fallas, 'falla', 'fallas')}${hist.mtbfDias ? ` · una cada ${n0(hist.mtbfDias)} días` : ''}` : undefined}
          info={partes.length ? 'El porcentaje es de los barriles que costaron sus fallas, no del número de fallas.' : undefined}>
          {partes.length > 0 && totalPartes > 0 && <Reparto partes={partes} />}
          <p className="mt-1.5 text-[14px] text-[var(--tinta2)]">
            {hist.fallas
              ? [hist.bblPorFalla !== undefined && `${n0(hist.bblPorFalla)} bbl por falla, en promedio`, veces !== undefined && `cerró pozos ${plural(veces, 'vez', 'veces')}`].filter(Boolean).join(' · ')
              : hist.disparos ? `No ha fallado · ${plural(hist.disparos, 'disparo', 'disparos')} que volvieron a arrancar` : 'No ha fallado'}
          </p>
        </Bloque>
      )}

      {eq.clase === 'catalogo' && (
        <Bloque titulo="Respaldo" info={infoRespaldo || undefined}>
          <p className="text-[15px] leading-snug">{respaldo}</p>
        </Bloque>
      )}

      {pr && !pr.parada && pr.inmediato && pr.colchon && (
        // «Si falla hoy» en bbl/d, el mismo nombre y la misma cifra que Equipos y Bombas (D-2, G-16).
        <Bloque titulo="Si falla hoy">
          {respaldoAbsorbe(pr) ? <p className="text-[15px]">No cierra pozos: el respaldo absorbe toda el agua.</p>
            : <Cifra valor={n0(pr.crudoBpd)} unidad="bbl/d" rotulo="se dejan de producir" pie={`después de ${textoColchon(pr.colchon.horas)} de colchón`} />}
        </Bloque>
      )}

      <Bloque titulo="Qué se está haciendo" info={porque}>
        <p className="text-[15px] leading-snug">{haciendo}</p>
      </Bloque>

      {planes.length > 0 && <div className="border-t border-[var(--linea2)] pt-3"><PlanesDe planes={planes} primeros={1} /></div>}
    </div>
  )
}

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
