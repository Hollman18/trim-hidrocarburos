import { useApp, useAmbito, useRango, useRol } from '@/app/store'
import { useLibro, useBase, useRiesgo, usePreguntas, useCtx } from '@/shared/api/diferidos'
import { NOMBRE_PARTE } from '@/entities/partes'
import { TIPO_CAUSA } from '@/entities/causa-senal'
import { campoPorId } from '@/entities/campos'
import { conMeta, textoSinMeta } from '@/entities/libro'
import { fechaHora, AHORA } from '@/entities/reloj'
import { Panel, Boton } from '@/shared/ui/primitivas'
import { PanelSapMantenimiento } from '@/widgets/sap/PanelSapMantenimiento'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n1, plural } from '@/shared/lib/formato'
import { FueraDeMeta, MarcaPrioridad } from '@/shared/ui/Prioridad'
import { ParetoPartes, Palancas } from '@/widgets/diferidos/Paretos'
import { fmtHoras } from '@/widgets/bombas/comun'

/** Quien responde por que los barriles diferidos BAJEN. Su balanza aquí es en
 *  barriles y la mide el PLC: lo que se perdió en paradas programadas (estaban
 *  en el programa aprobado) contra lo que se perdió en fallas. Si la parte de
 *  fallas no baja, el número de arriba tampoco. */
export function Mantenimiento() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol(); const ctx = useCtx()
  const abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla), setCampo = useApp(s => s.setCampo)
  const ids = ambito.campos.map(c => c.id)
  const q = { campos: ids, desde: rango.desde, hasta: rango.hasta }
  const lb = useLibro(q)
  const base = useBase(q)
  const riesgo = useRiesgo(ids).filter(r => r.estado === 'en-riesgo').sort((a, b) => (a.horas ?? -1) - (b.horas ?? -1))
  const preguntas = usePreguntas(ids)
  const pendientes = preguntas.filter(p => p.pide && !p.arrancoSinIdentificar)
  const noConformes = preguntas.filter(p => p.arrancoSinIdentificar)
  // El panel de abajo es de lo que TODAVÍA no tiene causa. Una parada que arrancó
  // sin identificar y se respondió después sigue contando como no conforme
  // arriba, pero ya no es «que nadie ha identificado»: se dice aparte.
  const sinIdentificar = [...pendientes, ...noConformes.filter(p => p.pide)]
  const respondidasTarde = noConformes.filter(p => !p.pide)
  // Lo de alto impacto ya excluye lo programado: es su propio tipo de causa.
  const fallasAlto = lb.altoImpacto
  const planPct = lb.diferido > 0 ? (lb.planeado / lb.diferido) * 100 : 0
  const proximas = ctx.config.programa
    .filter(p => ids.includes(p.campoId) && new Date(p.hasta) >= AHORA)
    .sort((a, b) => a.desde.localeCompare(b.desde))
  const irA = (p: string) => (rol.pantallas.includes(p) ? () => setPantalla(p) : undefined)
  const difDia = lb.brecha / Math.max(1 / 24, lb.meta.dias)

  return (
    <>
      <Tip titulo="La balanza del mantenimiento, en barriles"
        pista="Lo programado estaba en el programa de paradas aprobado; lo demás son fallas o restricciones. La mide el PLC."
        filas={[['Programado', `${n0(lb.planeado)} bbl`], ['No programado', `${n0(lb.noPlaneado)} bbl`],
          ['De alto impacto', `${n0(lb.altoImpacto)} bbl`], ['Con la parte vigilada', `${n0(lb.anticipable)} bbl`],
          ['Período', rango.nombre]]}
        className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <span>
          <b className="tabular block text-[36px] leading-none">{n0(fallasAlto)}</b>
          <small className="block text-[11px] text-[var(--tinta3)]">bbl de fallas de equipos de alto impacto · {rango.nombre}</small>
          {/* El desglose también a la vista: en el recuadro flotante solo lo alcanzaba el ratón. */}
          <small className="block text-[10.5px] text-[var(--tinta2)]">{n0(lb.anticipable)} bbl con la parte vigilada</small>
        </span>
        <span>
          {/* Sin meta firmada en algún campo no hay máximo: se dice, sin marca ni «/ 0». */}
          <b className="tabular block text-[20px] leading-none"><FueraDeMeta si={conMeta(lb.meta) && difDia > lb.meta.diferidoDia} tamano={12} />{n0(difDia)}{conMeta(lb.meta) ? ` / ${n0(lb.meta.diferidoDia)}` : ''}</b>
          <small className="text-[10.5px] text-[var(--tinta3)]">bbl/d de diferido {conMeta(lb.meta) ? 'contra el máximo firmado' : `· ${textoSinMeta(lb.meta, ids.length > 1)}`}{base ? ` · antes ${n0(base.baseDia)} bbl/d (${base.nombre})` : ''}</small>
        </span>
        <span>
          <b className="tabular block text-[20px] leading-none">{n1(planPct)} %</b>
          <small className="text-[10.5px] text-[var(--tinta3)]">del diferido fue programado · {n0(lb.planeado)} bbl · {n0(lb.noPlaneado)} bbl no programado</small>
        </span>
        <span>
          <b className="tabular flex items-center gap-1.5 text-[20px] leading-none">{noConformes.length > 0 && <MarcaPrioridad s={3} tamano={13} />}{pendientes.length} · {noConformes.length}</b>
          <small className="text-[10.5px] text-[var(--tinta3)]">paradas por identificar · arrancaron sin identificar</small>
        </span>
      </Tip>

      <Lectura>
        El indicador de mantenimiento se mueve antes que el diferido: si las fallas de alto impacto se
        anticipan (la parte avisó y se intervino a tiempo), pasan a ser paradas programadas, más
        cortas y en la ventana que uno escoge. Abajo, lo que hay que atacar ahora y de qué se están
        dañando los equipos.
      </Lectura>

      <div className="mt-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <Panel titulo="LO QUE HAY QUE ATACAR AHORA" extra={`${plural(riesgo.length, 'equipo avisando', 'equipos avisando')}`}>
          {riesgo.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna parte va hacia su límite.</p>}
          {riesgo.slice(0, 8).map(r => (
            <div key={`${r.campoId}${r.equipo}`} className="border-b border-[var(--linea2)] py-2 last:border-0">
              <button onClick={() => { setCampo(r.campoId); abrirEquipo(r.equipo, false) }} className="flex w-full cursor-pointer items-start gap-2.5 text-left hover:bg-[var(--panel2)]">
                <MarcaPrioridad s={r.prioridad} tamano={12} className="mt-[2px]" />
                <span className="min-w-0 flex-1">
                  <b className="text-[12.5px]">{r.equipo}</b>
                  <span className="text-[10.5px] text-[var(--tinta3)]">{ambito.global ? ` · ${campoPorId(r.campoId).nombre}` : ''} · {TIPO_CAUSA[r.tipo].toLowerCase()}</span>
                  <small className="block text-[11px] text-[var(--tinta2)]">{r.parte ? `${NOMBRE_PARTE[r.parte]}: ` : ''}{r.horas !== undefined ? `cruza en ${fmtHoras(r.horas)}` : `${r.parte ? 'ya' : 'Ya'} fuera de límite`}{!r.parte && r.tag ? ` · ${r.tag}` : ''}</small>
                </span>
                <span className="tabular text-right text-[11px]">
                  <b className="block">{r.costoFalla !== undefined ? `≈ ${n0(r.costoFalla)} bbl` : `${n0(r.bblDia)} bbl/d`}</b>
                  <small className="text-[9.5px] text-[var(--tinta3)]">{r.costoFalla !== undefined ? 'si falla' : 'si para'}</small>
                </span>
              </button>
              {r.accion && <p className="mt-0.5 pl-[22px] text-[10.5px] text-[var(--tinta2)]">{r.accion}</p>}
            </div>
          ))}
          {irA('riesgo') && riesgo.length > 8 && <Boton className="mt-2 w-full" onClick={irA('riesgo')}>Ver los {riesgo.length}</Boton>}
        </Panel>

        <Palancas lb={lb} base={base} />
      </div>

      <div className="mt-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <ParetoPartes lb={lb} onIr={irA('confiabilidad') ?? irA('bombas')} />

        <Panel titulo="PROGRAMA DE PARADAS APROBADO" extra="de la configuración firmada">
          <Lectura>
            Lo que está aquí cuenta como programado, no como falla. Se cambia en la configuración, con
            firma: así una falla no se puede volver programada después.
          </Lectura>
          {proximas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">No hay paradas programadas de aquí en adelante.</p>}
          {proximas.map(p => (
            <div key={p.id} className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
              <span className="min-w-0"><b>{p.equipo}</b>{ambito.global ? <span className="text-[var(--tinta3)]"> · {campoPorId(p.campoId).nombre}</span> : ''}
                <small className="block text-[10.5px] text-[var(--tinta2)]">{p.motivo}</small></span>
              <span className="tabular text-right text-[10.5px] text-[var(--tinta2)]">{fechaHora(new Date(p.desde))}<br />a {fechaHora(new Date(p.hasta))}</span>
            </div>
          ))}
        </Panel>
      </div>

      <PanelSapMantenimiento />

      {(sinIdentificar.length > 0 || respondidasTarde.length > 0) && (
        <Panel className="mt-2.5" titulo="PARADAS QUE NADIE HA IDENTIFICADO" extra="sin la parte, no hay de qué aprender">
          {sinIdentificar.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Todas las paradas tienen causa.</p>}
          {sinIdentificar.slice(0, 8).map(p => (
            <div key={p.id} className="flex items-center gap-2.5 border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
              <MarcaPrioridad s={p.arrancoSinIdentificar ? 3 : !p.fin ? 2 : 3} tamano={11} />
              <span className="min-w-0 flex-1"><b>{p.equipo}</b><span className="text-[var(--tinta3)]">{ambito.global ? ` · ${campoPorId(p.campoId).nombre}` : ''} · {fechaHora(p.inicio)} · {p.arrancoSinIdentificar ? 'arrancó sin identificar' : !p.fin ? 'sigue parado' : 'por identificar'}</span></span>
              <span className="tabular">{n0(p.bbl)} bbl</span>
            </div>
          ))}
          {respondidasTarde.length > 0 && <p className="mt-1.5 text-[10.5px] text-[var(--tinta3)]">
            {plural(respondidasTarde.length, 'parada más arrancó', 'paradas más arrancaron')} sin identificar y se {respondidasTarde.length === 1 ? 'respondió' : 'respondieron'} después
            de arrancar: ya {respondidasTarde.length === 1 ? 'tiene' : 'tienen'} causa, pero cuentan como no conformes arriba.
          </p>}
          {irA('causa') && sinIdentificar.length > 0 && <Boton variante="principal" className="mt-2 w-full" onClick={irA('causa')}>Ir a identificar</Boton>}
        </Panel>
      )}
    </>
  )
}
