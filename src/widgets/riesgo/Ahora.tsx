import { useRiesgo, usePreguntas, contarPorIdentificar } from '@/shared/api/diferidos'
import { TIPO_CAUSA } from '@/entities/causa-senal'
import { NOMBRE_PARTE } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { fechaHora, AHORA } from '@/entities/reloj'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { n0 } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { otrosEnAlarma } from '@/widgets/resumen/enAlarma'

/** Nivel 1 de ISA-101: lo que pasa AHORA en una franja, para quien responde
 *  por los barriles. Qué se está perdiendo, qué equipo de alto impacto está
 *  por fallar y qué paradas esperan a que alguien diga qué se dañó. */
export function Ahora({ campos, global, onRiesgo, onIdentificar }: {
  campos: string[]; global: boolean; onRiesgo?: () => void; onIdentificar?: () => void
}) {
  const riesgo = useRiesgo(campos)
  // «Por identificar» con la cuenta única (la de Turno, Mi trabajo, Identificar y Mantenimiento).
  const pi = contarPorIdentificar(usePreguntas(campos))
  const sinArrancar = pi.porIdentificar - pi.arrancaronSinIdentificar
  const perd = riesgo.filter(r => r.estado === 'perdiendo')
  // «De alto impacto» es lo que dice la fila (`altoImpacto`), no todo lo que está
  // en riesgo: un servicio (K-101) o la multifásica (MPP-301) van aparte, por lo que son.
  const enRiesgo = riesgo.filter(r => r.estado === 'en-riesgo' && r.altoImpacto)
  const otros = otrosEnAlarma(riesgo)
  const porDia = perd.reduce((a, r) => a + r.bblDia, 0)
  const alto = perd.filter(r => r.altoImpacto).reduce((a, r) => a + r.bblDia, 0)
  const proxima = [...enRiesgo].filter(r => r.horas !== undefined).sort((a, b) => a.horas! - b.horas!)[0]
  const donde = (c: string) => (global ? ` · ${campoPorId(c).nombre}` : '')

  const clase = 'grid w-full items-center gap-x-6 gap-y-2 rounded border border-[var(--linea)] bg-[var(--panel)] px-4 py-3 text-left shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]'
  return (
    <div className="mb-2.5">
      <div className={clase}>
        <Bloque onClick={onRiesgo} s={alto > 0 ? 1 : porDia > 0 ? 2 : 0}
          rotulo={`Perdiéndose ahora · ${fechaHora(AHORA)}`}
          valor={porDia > 0 ? `${n0(porDia)} bbl/d` : 'nada'}
          pie={perd[0] ? `${perd[0].equipo}${donde(perd[0].campoId)} · ${TIPO_CAUSA[perd[0].tipo].toLowerCase()} · ${n0(perd[0].bblDia)} bbl/d${alto > 0 ? ` · ${n0(alto)} de alto impacto` : ''}` : 'todos los pozos produciendo'} />
        <Bloque onClick={onRiesgo} s={enRiesgo.length ? 3 : 0}
          rotulo={`En riesgo · ${enRiesgo.length} ${enRiesgo.length === 1 ? 'equipo' : 'equipos'} de alto impacto`}
          valor={enRiesgo.length ? `${n0(enRiesgo.reduce((a, r) => a + r.bblDia, 0))} bbl/d` : 'ninguno'}
          // Sin nada en riesgo, la frase del Resumen del gerente para lo mismo.
          pie={proxima ? `primero ${proxima.equipo}${donde(proxima.campoId)} · ${proxima.parte ? NOMBRE_PARTE[proxima.parte].toLowerCase() : ''} en ${fmtHoras(proxima.horas!)}` : enRiesgo[0] ? `${enRiesgo[0].equipo}: ${enRiesgo[0].motivo}`
            : perd.some(r => r.altoImpacto) ? 'ninguna otra bomba ni electrosumergible avisa' : 'ninguna bomba ni electrosumergible avisa'}
          aparte={otros && `+ ${otros.texto}`} />
        <Bloque onClick={onIdentificar} s={sinArrancar ? 2 : pi.porIdentificar ? 3 : 0}
          rotulo="Paradas por identificar"
          valor={pi.porIdentificar ? String(pi.porIdentificar) : 'ninguna'}
          pie={sinArrancar ? `${sinArrancar} ${sinArrancar === 1 ? 'equipo detenido' : 'equipos detenidos'}: no arrancar hasta identificar el daño` : pi.porIdentificar ? 'arrancaron sin identificar: no conformidad' : 'todas las paradas tienen causa'} />
      </div>
      <Lectura>
        Perdiéndose ahora es el crudo que no sale de los pozos apagados en este momento, cada uno
        cargado a lo que lo apagó. En riesgo son las bombas de reinyección y electrosumergibles que
        producen pero tienen una parte avisando: lo que se perdería por día si paran. Las paradas
        por identificar son las que ninguna señal explica: el equipo no se arranca hasta que quien lo revise
        diga qué se dañó.
      </Lectura>
    </div>
  )
}

function Bloque({ s, rotulo, valor, pie, aparte, onClick }: {
  s: 0 | 1 | 2 | 3; rotulo: string; valor: string; pie: string
  /** Un renglón propio que no se corta (lo que no entra en la cifra). */
  aparte?: string
  onClick?: () => void
}) {
  const cuerpo = (
    <>
      <small className="block text-[10.5px] text-[var(--tinta3)]">{rotulo}</small>
      <b className="tabular flex items-center gap-1.5 text-[18px] leading-tight">
        {s > 0 && <MarcaPrioridad s={s} tamano={14} />}{valor}
      </b>
      <small className="block truncate text-[10.5px] text-[var(--tinta2)]">{pie}</small>
      {aparte && <small className="block text-[10.5px] text-[var(--tinta2)]">{aparte}</small>}
    </>
  )
  return onClick
    ? <button onClick={onClick} className="min-w-0 cursor-pointer rounded px-1 py-0.5 text-left hover:bg-[var(--elevado)]">{cuerpo}</button>
    : <span className="min-w-0 px-1 py-0.5">{cuerpo}</span>
}
