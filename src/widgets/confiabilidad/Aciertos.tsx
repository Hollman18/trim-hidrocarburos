import { useMemo, type ReactNode } from 'react'
import { useAmbito } from '@/app/store'
import { useSap } from '@/shared/api/sap'
import { usePredicciones } from '@/shared/api/predicciones'
import { NOMBRE_VISIBILIDAD, type Calificacion, type Visibilidad } from '@/entities/aciertos'
import { PUESTA_EN_MARCHA } from '@/entities/configuracion'
import { NOMBRE_PARTE } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { fechaHora, fechaCorta } from '@/entities/reloj'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
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
  const fh = (iso: string | Date) => fechaHora(new Date(iso))
  // Cinco a la vista y «ver N más»; lo que se esconde sale en el papel. Una falsa alarma
  // nunca queda escondida: un historial que a la vista solo muestra aciertos maquilla al vigía.
  const listaVencidas = useVerMas(vencidas, { prioridad: p => (p.calificacion === 'falsa-alarma' ? 1 : 3) })
  const columna = 'tabular text-right text-[10.5px] text-[var(--tinta2)]'

  /** Una predicción vencida en una línea: cuándo avisó → en qué quedó. Las dos
   *  fechas a la vista; el «antes de fallar» / «sin falla» lo dice la etiqueta. */
  const filaVencida = (p: (typeof vencidas)[number], oculta = false) => {
    const o = p.calificacion === 'intervenida' ? ordenDe(p.equipo, p.intervencion) : undefined
    const dias = p.calificacion === 'acierto' ? (new Date(p.falla!.inicio).getTime() - new Date(p.emitida).getTime()) / D : undefined
    return (
      <button key={p.id} onClick={() => onAbrir(p.campoId, p.equipo)}
        className={`${oculta ? 'hidden print:grid' : 'grid'} w-full cursor-pointer grid-cols-[1fr_auto] items-start gap-x-3 border-b border-[var(--linea2)] py-1.5 text-left text-[11.5px] last:border-0 hover:bg-[var(--panel2)]`}>
        <span className="min-w-0">
          <b>{p.equipo}</b><span className="text-[var(--tinta3)]">{donde(p.campoId)}</span> · {parte(p.parte)}
          <small className="block text-[10.5px] text-[var(--tinta2)]">
            avisó {fh(p.emitida)} → {p.calificacion === 'acierto'
              ? `falló ${fh(p.falla!.inicio)}`
              : p.calificacion === 'intervenida' ? `orden ${o?.numero ?? 'predictiva'} cerrada ${fh(p.intervencion!)}`
              : `venció ${fh(p.hasta)}`}
          </small>
        </span>
        <span className="grid justify-items-end gap-0.5">
          <Chip>{RESULTADO[p.calificacion as Exclude<Calificacion, 'seguimiento'>]}</Chip>
          {dias !== undefined && <small className={columna}>{n1(dias)} d antes</small>}
        </span>
      </button>
    )
  }

  return (
    <Panel className="mt-2.5" titulo="¿ACIERTA EL VIGÍA?" extra={`desde que entró TRIM · ${fechaCorta(inicio)}`}>
      <Lectura>
        Cada predicción se califica al vencer su ventana: acierto si esa parte falló; intervenida si
        se le hizo mantenimiento antes (es lo que se busca, pero no prueba que iba a fallar y no
        cuenta como acierto); falsa alarma si no pasó nada. Y la otra cara: las fallas que nadie
        anunció. «Fallas anticipadas» cuenta solo las de partes con instrumento: las demás el vigía
        no las podía ver. En seguimiento, la que vence primero va arriba.
      </Lectura>

      <div className="mt-2 grid gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <Cifra rotulo="Acertó" valor={tasa !== undefined ? `${aciertos.length} de ${aciertos.length + falsas.length}` : '—'}
          parte={tasa !== undefined ? tasa / 100 : undefined}
          pie={`${tasa !== undefined ? `${n0(tasa)} % · ` : ''}${plural(falsas.length, 'falsa alarma', 'falsas alarmas')}`}
          nota={intervenidas.length > 0 ? <>
            {plural(intervenidas.length, 'intervenida', 'intervenidas')}, sin calificar
            <Info titulo="Intervenidas antes" texto="Se le hizo mantenimiento a la parte antes de que fallara: es lo que se busca, pero no prueba que iba a fallar. No cuenta como acierto ni como falsa alarma." />
          </> : undefined} />
        <Cifra rotulo="Fallas anticipadas" valor={`${aciertos.length} de ${vigiladas.length}`}
          parte={vigiladas.length ? aciertos.length / vigiladas.length : undefined}
          pie="en partes con instrumento" />
        <Cifra rotulo="Anticipación" valor={promedio !== undefined ? `${n1(promedio)} d` : '—'}
          pie={anticipo.length ? `promedio · de ${n1(Math.min(...anticipo))} a ${n1(Math.max(...anticipo))} d` : 'sin aciertos todavía'} />
        <Cifra rotulo="En seguimiento" valor={String(seguimiento.length)}
          pie={seguimiento[0] ? `la primera vence ${fh(seguimiento[0].hasta)}` : 'nada en seguimiento'} />
      </div>

      <div className="mt-3 grid items-start gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        <div>
          <h5 className="font-cond mb-1 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">LO QUE ANUNCIÓ Y EN QUÉ QUEDÓ · {vencidas.length}</h5>
          {vencidas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna predicción ha vencido todavía.</p>}
          {/* Todas en su orden de fecha: las que «ver N más» esconde, solo en el papel (y ahí, en su lugar). */}
          {vencidas.map(p => filaVencida(p, listaVencidas.resto.includes(p)))}
          <VerMas ocultas={listaVencidas.ocultas} abierto={listaVencidas.abierto} onAlternar={listaVencidas.alternar} />
          <h5 className="font-cond mb-1 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">LO QUE NO ANUNCIÓ · {plural(escapadas.length + vistas.filter(f => f.visibilidad !== 'vigilada').length, 'FALLA', 'FALLAS')}</h5>
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
                      {f.faltan.length > 0 && <span className="block text-[var(--tinta3)]">falta: {f.faltan.join(', ').toLowerCase()}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {escapadas.length + vistas.filter(f => f.visibilidad !== 'vigilada').length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna falla sin anunciar desde la puesta en marcha.</p>}
        </div>

        <div>
          <h5 className="font-cond mb-1 flex justify-between gap-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
            <span>EN SEGUIMIENTO · {seguimiento.length}</span>
            {seguimiento.length > 0 && <span aria-hidden className="font-sans font-normal normal-case tracking-normal">cruzaría el límite</span>}
          </h5>
          {seguimiento.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Nada en seguimiento.</p>}
          {seguimiento.map(p => (
            // La columna se rotula una vez arriba (aria-hidden); el lector oye el rótulo en cada fila.
            <button key={p.id} onClick={() => onAbrir(p.campoId, p.equipo)}
              aria-label={`${p.equipo}${donde(p.campoId)} · ${parte(p.parte)}${p.tag ? ` · ${p.tag}` : ''} · cruzaría el límite ${ventana(p.desde, p.hasta)}`}
              className="grid w-full cursor-pointer grid-cols-[1fr_auto] gap-x-3 border-b border-[var(--linea2)] py-1.5 text-left text-[11.5px] last:border-0 hover:bg-[var(--panel2)]">
              <span className="min-w-0">
                <b>{p.equipo}</b><span className="text-[var(--tinta3)]">{donde(p.campoId)}</span> · {parte(p.parte)}
                {p.tag && <small className="block font-mono text-[10px] text-[var(--tinta3)]">{p.tag}</small>}
              </span>
              <small className={columna}>{ventana(p.desde, p.hasta)}</small>
            </button>
          ))}

        </div>
      </div>
    </Panel>
  )
}

/** Una cifra del historial: rótulo, valor y una línea de apoyo. Con `parte`
 *  (una proporción de 0 a 1 que la pantalla ya calcula), una barra gris debajo:
 *  «5 de 9» se ve de un golpe. No es real contra meta: no lleva raya. */
function Cifra({ rotulo, valor, pie, parte, nota }: { rotulo: string; valor: string; pie: string; parte?: number; nota?: ReactNode }) {
  return (
    <span className="min-w-0">
      <small className="block text-[10.5px] text-[var(--tinta3)]">{rotulo}</small>
      <b className="tabular block text-[24px] leading-none">{valor}</b>
      {parte !== undefined && (
        <span aria-hidden className="mt-1 block h-1.5 max-w-[140px] overflow-hidden rounded-sm bg-[var(--panel2)]">
          <i className="block h-full bg-[var(--dato-2)]" style={{ width: `${Math.min(1, parte) * 100}%` }} />
        </span>
      )}
      <small className="block text-[10.5px] text-[var(--tinta2)]">{pie}</small>
      {nota && <small className="flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta2)]">{nota}</small>}
    </span>
  )
}
