import { useApp, useAmbito, useRol } from '@/app/store'
import { useLibro, useRiesgo, usePreguntas } from '@/shared/api/diferidos'
import { useMensajes } from '@/shared/api/mensajes'
import { NOMBRE_REGLA, ORDEN_PASO } from '@/entities/mensajes'
import { NoEnviado } from '@/widgets/whatsapp/NoEnviado'
import { TIPO_CAUSA, COMO } from '@/entities/causa-senal'
import { NOMBRE_PARTE } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { AHORA, fechaHora } from '@/entities/reloj'
import { Panel, Boton, Chip, Hueco } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, plural } from '@/shared/lib/formato'
import { ArrowRight } from 'lucide-react'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { fmtHoras } from '@/widgets/bombas/comun'
import { useUsuarios } from '@/shared/api/usuarios'

/** Turno de 12 horas (rotación 7×7 sobre una operación 24/7). */
const TURNO_H = 12

/** Un paso de un hilo de WhatsApp: a quién llegó y a quién no (con el porqué). */
type Paso = { hora: string; rango: number; que: string; para: string[]; fallas: Array<{ para: string; motivo: string }> }

/** Lo que se entrega al turno que entra: lo que pasó en el que sale, lo que
 *  está costando ahora, lo que falta identificar y lo que hay que vigilar.
 *  Todo sale de los controladores y del vigía; nada se escribe aquí. */
export function Turno() {
  const ambito = useAmbito(); const rol = useRol()
  const abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla), setCampo = useApp(s => s.setCampo)
  const usuarios = useUsuarios()
  const ids = ambito.campos.map(c => c.id)
  const inicioTurno = new Date(AHORA.getTime() - TURNO_H * 3_600_000)
  const lb = useLibro({ campos: ids, desde: inicioTurno, hasta: AHORA })
  const riesgo = useRiesgo(ids)
  const todas = usePreguntas(ids)
  const preguntas = todas.filter(p => p.pide)
  const enviados = useMensajes(ids).filter(m => new Date(m.hora).getTime() >= inicioTurno.getTime())
  const nombre = (id: string) => usuarios.find(x => x.id === id)?.nombre ?? id
  const corta = (iso: string) => fechaHora(new Date(iso))
  // Un hilo por evento (la parada, su pregunta y lo que siguió) o por orden;
  // cada paso, con todos los que lo recibieron; al final, si respondieron.
  const hilos = [...enviados.reduce((mapa, m) => {
    const clave = `${m.campoId}|${m.evento ?? m.orden ?? `${m.regla}|${m.equipo}`}`
    const h = mapa.get(clave) ?? { clave, campoId: m.campoId, equipo: m.equipo, evento: m.evento, pasos: [] as Paso[] }
    const que = m.insistencia === 'recordatorio' ? 'recordatorio' : m.insistencia === 'escalamiento' ? 'escalado' : NOMBRE_REGLA[m.regla]
    const paso = h.pasos.find(x => x.hora === m.hora && x.que === que) ?? (h.pasos.push({ hora: m.hora, rango: ORDEN_PASO[m.insistencia ?? m.regla], que, para: [], fallas: [] }), h.pasos.at(-1)!)
    // Lo que no salió no cuenta como avisado: va aparte, con su motivo.
    if (m.noEnviado) paso.fallas.push({ para: nombre(m.para), motivo: m.noEnviado })
    else if (!paso.para.includes(nombre(m.para))) paso.para.push(nombre(m.para))
    return mapa.set(clave, h)
  }, new Map<string, { clave: string; campoId: string; equipo: string; evento?: string; pasos: Paso[] }>()).values()]
    .map(h => {
      const p = h.evento ? todas.find(x => x.id === h.evento) : undefined
      const r = p?.causa.declarado
      const estado = !p ? undefined : r ? `respondió ${r.por}${r.canal === 'whatsapp' ? ' por WhatsApp' : ''}: «${r.texto}»` : 'sin respuesta'
      return { ...h, pasos: [...h.pasos].sort((a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime() || a.rango - b.rango), estado }
    })
    .sort((a, b) => b.pasos.at(-1)!.hora.localeCompare(a.pasos.at(-1)!.hora))
  const perdiendo = riesgo.filter(r => r.estado === 'perdiendo')
  // Lo que ya está fuera de límite (sin horas) va primero, como en Riesgo y Mantenimiento.
  const vigilar = riesgo.filter(r => r.estado === 'en-riesgo').sort((a, b) => (a.horas ?? -1) - (b.horas ?? -1))
  const porDia = perdiendo.reduce((a, r) => a + r.bblDia, 0)
  const abrir = (c: string, eq: string) => { setCampo(c); abrirEquipo(eq, false) }
  const donde = (c: string) => (ambito.global ? ` · ${campoPorId(c).nombre}` : '')
  // Nuevos son los eventos que EMPEZARON en el turno; lo que venía de antes
  // sigue en «pasando ahora», no se cuenta otra vez.
  const nuevos = lb.tramos.filter(t => new Date(t.evento.inicio).getTime() >= inicioTurno.getTime())
    .sort((a, b) => b.evento.inicio.localeCompare(a.evento.inicio))
  // Un evento con muchos pozos (paró la bomba) es una sola línea, no una por pozo.
  // Con push y no copiando la lista en cada tramo: copiar la volvía cuadrática.
  const porEvento = new Map<string, typeof nuevos>()
  for (const t of nuevos) {
    const k = t.causa.evento ?? t.evento.id, g = porEvento.get(k)
    if (g) g.push(t); else porEvento.set(k, [t])
  }
  const grupos = [...porEvento.values()]

  return (
    <>
      <div className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <span>
          <b className="tabular block text-[36px] leading-none">{n0(porDia * TURNO_H / 24)}</b>
          <small className="text-[11px] text-[var(--tinta3)]">bbl que se pierden en el turno que entra si nada cambia · {ambito.titulo}</small>
        </span>
        <span>
          <b className="tabular flex items-center gap-1.5 text-[20px] leading-none">
            {perdiendo.length > 0 && <MarcaPrioridad s={perdiendo.some(r => r.altoImpacto) ? 1 : 2} tamano={14} />}{n0(porDia)}<small className="text-[11px] font-normal text-[var(--tinta3)]">bbl/d</small>
          </b>
          <small className="text-[10.5px] text-[var(--tinta3)]">perdiéndose ahora · {plural(perdiendo.reduce((a, r) => a + r.pozos, 0), 'pozo parado', 'pozos parados')}</small>
        </span>
        <span>
          <b className="tabular flex items-center gap-1.5 text-[20px] leading-none">
            {preguntas.some(p => !p.fin) && <MarcaPrioridad s={2} tamano={14} />}{preguntas.length}
          </b>
          <small className="text-[10.5px] text-[var(--tinta3)]">paradas por identificar · {preguntas.filter(p => !p.fin).length} sin arrancar</small>
        </span>
        <span>
          <b className="tabular block text-[20px] leading-none">{n0(lb.diferido)}</b>
          <small className="text-[10.5px] text-[var(--tinta3)]">bbl diferidos en las últimas {TURNO_H} h · {plural(grupos.length, 'causa nueva', 'causas nuevas')}</small>
        </span>
      </div>

      <Lectura>
        Lo que deja el turno que sale y lo que recibe el que entra. Las cifras salen de los
        controladores de los pozos y del vigía; para entregar no hay que escribir nada, salvo
        responder las paradas que ninguna señal explica.
      </Lectura>

      <div className="mt-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <Panel titulo="PASANDO AHORA" extra={perdiendo.length ? plural(perdiendo.length, 'causa', 'causas') : 'nada parado'}>
          {perdiendo.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Todos los pozos produciendo.</p>}
          {perdiendo.map(r => (
            <Tip key={`${r.campoId}${r.equipo}${r.tipo}`} as="button" onClick={() => abrir(r.campoId, r.equipo)}
              titulo={`${r.equipo} · ${TIPO_CAUSA[r.tipo]}`} pista={r.motivo}
              filas={[['Pozos parados', String(r.pozos)], ['Perdiéndose', `${n0(r.bblDia)} bbl/d`],
                ['En el turno', `${n0(r.bblDia * TURNO_H / 24)} bbl`], ...(r.desde ? [['Desde', fechaHora(r.desde)] as [string, string]] : [])]}
              className="flex w-full cursor-pointer items-center gap-2.5 border-b border-[var(--linea2)] py-2.5 text-left last:border-0 hover:bg-[var(--panel2)]">
              <MarcaPrioridad s={r.altoImpacto ? 1 : 2} tamano={13} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[12.5px] leading-tight">{r.equipo}{donde(r.campoId)}</b>
                <small className="block truncate text-[10.5px] text-[var(--tinta3)]">{TIPO_CAUSA[r.tipo].toLowerCase()}{r.parte ? ` · ${NOMBRE_PARTE[r.parte].toLowerCase()}` : ''} · {plural(r.pozos, 'pozo', 'pozos')}{r.desde ? ` · desde ${fechaHora(r.desde)}` : ''}{r.cierreDesde && r.desde && r.cierreDesde.getTime() - r.desde.getTime() > 60_000 ? ` · pozos cerrados desde ${fechaHora(r.cierreDesde)}` : ''}</small>
              </span>
              <span className="tabular text-right">
                <b className="block text-[14px] leading-tight">{n0(r.bblDia)}</b>
                <small className="text-[9.5px] text-[var(--tinta3)]">bbl/d</small>
              </span>
            </Tip>
          ))}
        </Panel>

        <Panel titulo="POR IDENTIFICAR ANTES DE ENTREGAR" extra={`${preguntas.length}`}>
          {preguntas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Todas las paradas tienen causa.</p>}
          {preguntas.slice(0, 6).map(p => (
            <div key={p.id} className="flex items-center gap-2.5 border-b border-[var(--linea2)] py-2 text-[12px] last:border-0">
              <MarcaPrioridad s={!p.fin ? 2 : 3} tamano={12} />
              <span className="min-w-0 flex-1">
                <b>{p.equipo}</b><span className="text-[var(--tinta3)]">{donde(p.campoId)} · {fechaHora(p.inicio)}</span>
                <small className="block text-[10.5px] text-[var(--tinta2)]">{!p.fin ? 'sigue parado: no arrancar hasta identificar' : 'arrancó sin identificar'}</small>
              </span>
              {!p.fin && <Chip tono="fuerte">no arrancar</Chip>}
            </div>
          ))}
          {rol.pantallas.includes('causa') ? (
            preguntas.length > 0 && (
              <Boton variante="principal" className="mt-2.5 w-full" onClick={() => setPantalla('causa')}>
                Identificar antes de entregar<ArrowRight className="ml-1 inline size-3" />
              </Boton>
            )
          ) : preguntas.length > 0 && <Hueco>Lo responde quien estuvo en el equipo.</Hueco>}
        </Panel>

        <Panel titulo="PARA VIGILAR EN EL TURNO QUE ENTRA" extra={plural(vigilar.length, 'equipo', 'equipos')}>
          {vigilar.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna parte va hacia su límite.</p>}
          {vigilar.map(r => (
            <Tip key={`${r.campoId}${r.equipo}`} as="button" onClick={() => abrir(r.campoId, r.equipo)}
              titulo={r.equipo} pista={r.motivo}
              filas={[['Parte', r.parte ? NOMBRE_PARTE[r.parte] : '—'], ['Cruza su límite', r.horas !== undefined ? `en ${fmtHoras(r.horas)}` : 'ya fuera'],
                ['Si falla', `${n0(r.bblDia)} bbl/d`]]}
              className="flex w-full cursor-pointer items-center gap-2.5 border-b border-[var(--linea2)] py-2 text-left last:border-0 hover:bg-[var(--panel2)]">
              <MarcaPrioridad s={r.horas !== undefined && r.horas < TURNO_H ? Math.min(r.prioridad || 3, 2) as 1 | 2 : r.prioridad} tamano={13} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[12px]">{r.equipo}{donde(r.campoId)}</b>
                <small className="block truncate text-[10.5px] text-[var(--tinta3)]">{r.motivo}</small>
              </span>
              <span className="tabular text-right text-[11px]">
                <b className="block">{r.horas !== undefined ? fmtHoras(r.horas) : 'fuera'}</b>
                <small className="text-[9.5px] text-[var(--tinta3)]">{n0(r.bblDia)} bbl/d</small>
              </span>
            </Tip>
          ))}
        </Panel>
      </div>

      <Panel className="mt-2.5" titulo={`LO QUE EMPEZÓ EN LAS ÚLTIMAS ${TURNO_H} HORAS`} extra={plural(grupos.length, 'causa nueva', 'causas nuevas')}>
        {grupos.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ningún pozo paró en el turno que sale.</p>}
        {grupos.slice(0, 20).map(g => {
          const t = g[0]!
          const ini = g.map(x => new Date(x.evento.inicio))
          const porOtro = t.causa.equipo !== t.pozo.id
          return (
            <div key={t.causa.evento ?? t.evento.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
              <span className="min-w-0">
                {g.length > 1 ? (
                  <><b>{plural(g.length, 'pozo cerrado', 'pozos cerrados')}</b> por <b>{t.causa.equipo}</b>{donde(t.pozo.campoId)}
                    <span className="text-[var(--tinta3)]"> · entre {fechaHora(new Date(Math.min(...ini.map(x => x.getTime()))))} y {fechaHora(new Date(Math.max(...ini.map(x => x.getTime()))))}</span></>
                ) : (
                  <><b className="tabular">{fechaHora(ini[0]!)}</b> · <b className="font-mono">{t.pozo.id}</b>{donde(t.pozo.campoId)}</>
                )}
                <span className="block text-[var(--tinta2)]">{t.causa.texto} <span className="text-[var(--tinta3)]">({porOtro && t.causa.como === 'ninguno' ? `por ${t.causa.equipo}; su parte, por identificar` : COMO[t.causa.como]})</span></span>
              </span>
              <span className="tabular text-right">{n0(g.reduce((a, x) => a + x.bbl, 0))} bbl{g.some(x => x.abierto) ? <small className="text-[var(--tinta3)]"> · sigue</small> : ''}</span>
            </div>
          )
        })}
      </Panel>
      <Panel className="mt-2.5" titulo="WHATSAPP · LO QUE TRIM MANDÓ EN EL TURNO"
        extra={`${plural(hilos.length, 'hilo', 'hilos')} · ${plural(enviados.filter(m => !m.noEnviado).length, 'mensaje', 'mensajes')}${enviados.some(m => m.noEnviado) ? ` · ${plural(enviados.filter(m => m.noEnviado).length, 'sin enviar', 'sin enviar')}` : ''}`}>
        <Lectura>
          A quién le avisó TRIM y cuándo, con las reglas fijas del producto: parada de un equipo de
          alto impacto al supervisor y al operador; «¿qué se dañó?» al operador, recordatorio a los
          30 min y al supervisor a las 2 h; parte por cruzar su límite a confiabilidad y mantenimiento;
          orden liberada en SAP al técnico.
        </Lectura>
        {hilos.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">TRIM no mandó nada en el turno que sale.</p>}
        {hilos.slice(0, 12).map(h => (
          <div key={h.clave} className="border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span><b>{h.equipo}</b>{donde(h.campoId)}</span>
              {h.estado && <small className={h.estado.startsWith('sin') ? 'font-semibold text-[var(--tinta)]' : 'text-[var(--tinta2)]'}>{h.estado}</small>}
            </span>
            <span className="block text-[var(--tinta2)]">
              {h.pasos.map((x, i) => <span key={`${x.hora}${x.que}`}>{i > 0 && ' → '}<span className="tabular">{corta(x.hora)}</span> {x.que}{x.para.length > 0 && ` (${x.para.join(', ')})`}<NoEnviado fallas={x.fallas} /></span>)}
            </span>
          </div>
        ))}
        {hilos.length > 12 && <small className="mt-1 block text-[10.5px] text-[var(--tinta3)]">y {plural(hilos.length - 12, 'hilo más', 'hilos más')}</small>}
      </Panel>
    </>
  )
}
