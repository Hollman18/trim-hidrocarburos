import { useMemo } from 'react'
import { useAmbito } from '@/app/store'
import { useSap } from '@/shared/api/sap'
import { usePredicciones } from '@/shared/api/predicciones'
import { NOMBRE_VISIBILIDAD, type Calificacion, type Visibilidad } from '@/entities/aciertos'
import { PUESTA_EN_MARCHA } from '@/entities/configuracion'
import { NOMBRE_PARTE } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { fechaHora, fechaCorta } from '@/entities/reloj'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n1, plural } from '@/shared/lib/formato'

const VISIBILIDADES: Visibilidad[] = ['sin-instrumento', 'sin-parte', 'fuera-de-perfil']
const RESULTADO: Record<Exclude<Calificacion, 'seguimiento'>, string> = { acierto: 'acierto', intervenida: 'intervenida antes', 'falsa-alarma': 'falsa alarma' }
const D = 86_400_000

/** ¿Acierta el vigía? Lo que anunció y en qué quedó, cuánto antes avisó, y las
 *  fallas que nadie anunció: las que podía ver y se le escaparon, y las que no
 *  podía ver (sin instrumento, sin parte). */
export function Aciertos({ onAbrir }: { onAbrir: (campoId: string, equipo: string) => void }) {
  const ambito = useAmbito()
  const ids = ambito.campos.map(c => c.id)
  const { ordenes } = useSap(ids)
  // Lo que anunció y las fallas; cada falla se juzga con el perfil firmado que regía cuando pasó.
  const { registro, fallas: vistas } = usePredicciones(ids)
  const inicio = useMemo(() => new Date(`${PUESTA_EN_MARCHA}T00:00:00-05:00`), [])
  const seguimiento = registro.filter(p => p.calificacion === 'seguimiento').sort((a, b) => a.hasta.localeCompare(b.hasta))
  const vencidas = registro.filter(p => p.calificacion !== 'seguimiento')
  const aciertos = vencidas.filter(p => p.calificacion === 'acierto'), falsas = vencidas.filter(p => p.calificacion === 'falsa-alarma')
  const intervenidas = vencidas.filter(p => p.calificacion === 'intervenida')
  const vigiladas = vistas.filter(f => f.visibilidad === 'vigilada')
  const escapadas = vigiladas.filter(f => !aciertos.some(p => p.falla?.id === f.falla.id))
  const anticipo = aciertos.map(p => (new Date(p.falla!.inicio).getTime() - new Date(p.emitida).getTime()) / D)
  const promedio = anticipo.length ? anticipo.reduce((a, b) => a + b, 0) / anticipo.length : undefined
  // De lo que se puede juzgar (falló o no falló), cuánto fue verdad; lo intervenido no se sabe.
  const tasa = aciertos.length + falsas.length ? (aciertos.length / (aciertos.length + falsas.length)) * 100 : undefined
  const donde = (c: string) => (ambito.global ? ` · ${campoPorId(c).nombre}` : '')
  const parte = (id?: string) => (id ? NOMBRE_PARTE[id as keyof typeof NOMBRE_PARTE].toLowerCase() : 'parte sin identificar')
  const ventana = (a: string, b: string) => {
    const [dx, hx] = fechaHora(new Date(a)).split(', '), [dy, hy] = fechaHora(new Date(b)).split(', ')
    return dx === dy ? `${dx}, ${hx}–${hy}` : `${fechaHora(new Date(a))} – ${fechaHora(new Date(b))}`
  }
  const ordenDe = (equipo: string, cierre?: string) => ordenes.find(o => o.clase === 'PM03' && o.equipo === equipo && o.cierreTecnico === cierre)

  return (
    <Panel className="mt-2.5" titulo="¿ACIERTA EL VIGÍA?" extra={`desde que entró TRIM · ${fechaCorta(inicio)}`}>
      <Lectura>
        Cada predicción se califica al vencer su ventana: acierto si esa parte falló; intervenida si
        se le hizo mantenimiento antes (es lo que se busca, pero no prueba que iba a fallar y no
        cuenta como acierto); falsa alarma si no pasó nada. Y la otra cara: las fallas que nadie
        anunció.
      </Lectura>

      <div className="mt-2 grid gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <Cifra rotulo="Acertó" valor={tasa !== undefined ? `${aciertos.length} de ${aciertos.length + falsas.length}` : '—'}
          pie={`${tasa !== undefined ? `${n0(tasa)} % · ` : ''}${plural(falsas.length, 'falsa alarma', 'falsas alarmas')} · ${plural(intervenidas.length, 'intervenida', 'intervenidas')} antes (no se califican)`} />
        <Cifra rotulo="Fallas anticipadas" valor={`${aciertos.length} de ${vigiladas.length}`}
          pie="de las fallas en partes con instrumento" />
        <Cifra rotulo="Anticipación" valor={promedio !== undefined ? `${n1(promedio)} d` : '—'}
          pie={anticipo.length ? `en promedio · entre ${n1(Math.min(...anticipo))} y ${n1(Math.max(...anticipo))} días antes` : 'sin aciertos todavía'} />
        <Cifra rotulo="En seguimiento" valor={String(seguimiento.length)}
          pie={seguimiento[0] ? `la primera vence ${fechaHora(new Date(seguimiento[0].hasta))}` : 'ninguna parte va hacia su límite'} />
      </div>

      <div className="mt-3 grid items-start gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        <div>
          <h5 className="font-cond mb-1 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">LO QUE ANUNCIÓ Y EN QUÉ QUEDÓ · {vencidas.length}</h5>
          {vencidas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna predicción ha vencido todavía.</p>}
          {vencidas.map(p => {
            const o = p.calificacion === 'intervenida' ? ordenDe(p.equipo, p.intervencion) : undefined
            return (
              <button key={p.id} onClick={() => onAbrir(p.campoId, p.equipo)}
                className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-start gap-x-3 border-b border-[var(--linea2)] py-1.5 text-left text-[11.5px] last:border-0 hover:bg-[var(--panel2)]">
                <span className="min-w-0">
                  <b>{p.equipo}</b><span className="text-[var(--tinta3)]">{donde(p.campoId)}</span> · {parte(p.parte)}
                  <small className="block text-[10.5px] text-[var(--tinta2)]">
                    Avisó el {fechaHora(new Date(p.emitida))} · {p.calificacion === 'acierto'
                      ? `falló el ${fechaHora(new Date(p.falla!.inicio))}, ${n1((new Date(p.falla!.inicio).getTime() - new Date(p.emitida).getTime()) / D)} días después`
                      : p.calificacion === 'intervenida' ? `orden ${o?.numero ?? 'predictiva'} cerrada el ${fechaHora(new Date(p.intervencion!))}, antes de fallar`
                      : `venció el ${fechaHora(new Date(p.hasta))} sin falla`}
                  </small>
                </span>
                <Chip>{RESULTADO[p.calificacion as Exclude<Calificacion, 'seguimiento'>]}</Chip>
              </button>
            )
          })}
          <h5 className="font-cond mb-1 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">LO QUE NO ANUNCIÓ · {escapadas.length + vistas.filter(f => f.visibilidad !== 'vigilada').length} FALLAS</h5>
          {escapadas.length > 0 && (
            <div className="border-b border-[var(--linea2)] py-1.5 text-[11.5px]">
              <span className="flex justify-between gap-3"><span>Se le escaparon: tenían instrumento</span><b className="tabular">{escapadas.length}</b></span>
              <ul className="mt-0.5 grid gap-0.5 text-[10.5px] text-[var(--tinta2)]">
                {escapadas.map(f => (
                  <li key={f.falla.id}>
                    <button onClick={() => onAbrir(f.campoId, f.equipo)} className="min-h-10 cursor-pointer py-1 text-left hover:underline sm:min-h-8">
                      <b>{f.equipo}</b>{donde(f.campoId)} · {fechaHora(f.falla.inicio)} · {parte(f.falla.parte)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {VISIBILIDADES.map(v => {
            const fs = vistas.filter(f => f.visibilidad === v)
            if (!fs.length) return null
            return (
              <div key={v} className="border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
                <span className="flex justify-between gap-3"><span>{NOMBRE_VISIBILIDAD[v]}</span><b className="tabular">{fs.length}</b></span>
                <ul className="mt-0.5 grid gap-0.5 text-[10.5px] text-[var(--tinta2)]">
                  {fs.map(f => (
                    <li key={f.falla.id}>
                      <button onClick={() => onAbrir(f.campoId, f.equipo)} className="min-h-10 cursor-pointer py-1 text-left hover:underline sm:min-h-8">
                        <b>{f.equipo}</b>{donde(f.campoId)} · {fechaHora(f.falla.inicio)}{f.falla.parte ? ` · ${parte(f.falla.parte)}` : ''}
                      </button>
                      {f.faltan.length > 0 && <span className="block text-[var(--tinta3)]">para verla haría falta: {f.faltan.join(', ').toLowerCase()}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {escapadas.length + vistas.filter(f => f.visibilidad !== 'vigilada').length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna falla sin anunciar desde la puesta en marcha.</p>}
        </div>

        <div>
          <h5 className="font-cond mb-1 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">EN SEGUIMIENTO · LA QUE VENCE PRIMERO ARRIBA</h5>
          {seguimiento.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Nada en seguimiento.</p>}
          {seguimiento.map(p => (
            <button key={p.id} onClick={() => onAbrir(p.campoId, p.equipo)}
              className="grid w-full cursor-pointer grid-cols-[1fr_auto] gap-x-3 border-b border-[var(--linea2)] py-1.5 text-left text-[11.5px] last:border-0 hover:bg-[var(--panel2)]">
              <span className="min-w-0">
                <b>{p.equipo}</b><span className="text-[var(--tinta3)]">{donde(p.campoId)}</span> · {parte(p.parte)}
                {p.tag && <small className="block font-mono text-[10px] text-[var(--tinta3)]">{p.tag}</small>}
              </span>
              <small className="tabular text-right text-[10.5px] text-[var(--tinta2)]"><span className="block text-[var(--tinta3)]">cruzaría el límite</span>{ventana(p.desde, p.hasta)}</small>
            </button>
          ))}

        </div>
      </div>
    </Panel>
  )
}

function Cifra({ rotulo, valor, pie }: { rotulo: string; valor: string; pie: string }) {
  return (
    <span>
      <small className="block text-[10.5px] text-[var(--tinta3)]">{rotulo}</small>
      <b className="tabular block text-[24px] leading-none">{valor}</b>
      <small className="block text-[10.5px] text-[var(--tinta2)]">{pie}</small>
    </span>
  )
}
