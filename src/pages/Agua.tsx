import { useApp, useCampo, useRango } from '@/app/store'
import { useCtx, useBarrilesDeEquipos, usePrediccion } from '@/shared/api/diferidos'
import { pedirPerfilesBomba } from '@/shared/api/equipos'
import { tanqueDe } from '@/entities/configuracion'
import { useCampoAhora } from '@/shared/api/medicion'
import { Panel, Boton, Hueco } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { n0, n1, plural } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'

/** El tren de agua de un campo: cuánta agua llega, cuánta saca la bomba de
 *  reinyección, cuánto aguanta el tanque y cuánto crudo depende de eso. Todo
 *  de los instrumentos (transmisor de nivel, medidor de la bomba, pruebas) y
 *  del tanque configurado. */
export function Agua() {
  const campo = useCampo(); const rango = useRango(); const ctx = useCtx()
  const campoId = useApp(s => s.campoId), abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla)
  const bblDe = useBarrilesDeEquipos({ campos: [campoId], desde: rango.desde, hasta: rango.hasta })
  // La bomba de reinyección del campo la dice su perfil en el registro, no un
  // id fijo: un cliente con otra numeración la ve igual.
  const perfil = pedirPerfilesBomba(campoId).find(p => p.subtipo === 'inyeccion')
  const pr = usePrediccion(perfil)
  // El tanque que vacía ESTA bomba: con dos trenes de agua, cada bomba tiene el suyo.
  const tanque = perfil ? tanqueDe(ctx.config, campoId, perfil.equipo) : undefined
  const { caudales: q, niveles } = useCampoAhora(campoId)
  const nivel = tanque && Object.hasOwn(niveles, tanque.id) ? niveles[tanque.id] : undefined
  const corte = q.agua + q.crudo > 0 ? (q.agua / (q.agua + q.crudo)) * 100 : 0

  if (!perfil || !pr) return (
    <Panel titulo={`TREN DE AGUA · ${campo.nombre.toUpperCase()}`}>
      <Hueco>{campo.nombre} no tiene bomba de reinyección configurada.</Hueco>
    </Panel>
  )

  return (
    <>
      <Tip titulo="Tren de agua" pista="Agua de los pozos que producen (pruebas), la que saca la bomba (su medidor) y el tanque configurado."
        filas={[['Agua de los pozos', `${n0(q.agua)} bbl/d`], ['Corte de agua', `${n1(corte)} %`],
          ['La bomba mueve', pr.mueve ? `${n0(pr.mueve.bpd)} bbl/d` : '—'], ['Respaldo libre', `${n0(pr.respaldoLibreBpd)} bbl/d`],
          ...(nivel && tanque ? [['Nivel del tanque', `${n1(nivel.pct)} % · ${nivel.tag}`] as [string, string]] : [])]}
        className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">Agua de los pozos que producen</small>
          <b className="tabular block text-[30px] leading-none">{n0(q.agua)}<small className="ml-1 text-[12px] font-normal text-[var(--tinta3)]">bbl/d</small></b>
          <small className="block text-[10.5px] text-[var(--tinta2)]">corte de agua {n1(corte)} %</small>
        </span>
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">{tanque?.nombre ?? 'Tanque de agua'}</small>
          <b className="tabular block text-[22px] leading-tight">{nivel ? `${n1(nivel.pct)} %` : 'sin nivel'}</b>
          <small className="block text-[10.5px] text-[var(--tinta2)]">{tanque ? `alto-alto ${n0(tanque.altoAlto * 100)} % de ${n0(tanque.capacidadBbl)} bbl` : 'sin tanque configurado'}</small>
        </span>
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">{pr.parada ? 'La bomba está parada' : 'Si la bomba se para'}</small>
          <b className="tabular flex items-center gap-1.5 text-[22px] leading-tight">
            {pr.parada && <MarcaPrioridad s={1} tamano={14} />}
            {pr.parada ? `${n0(pr.perdiendo?.bblDia ?? 0)} bbl/d` : pr.colchon ? fmtHoras(pr.colchon.horas, true) : '—'}
          </b>
          <small className="block text-[10.5px] text-[var(--tinta2)]">
            {pr.parada ? `${plural(pr.perdiendo?.pozos.length ?? 0, 'pozo cerrado', 'pozos cerrados')} por ella` : pr.colchon ? `de colchón, luego ${n0(pr.crudoBpd)} bbl/d de crudo` : pr.metodo}
          </small>
        </span>
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">Diferido de la bomba · {rango.nombre}</small>
          <b className="tabular block text-[22px] leading-tight">{n0(bblDe(perfil.equipo, campoId))} bbl</b>
        </span>
      </Tip>

      <Lectura>
        El agua no se mide en cada pozo: sale de sus pruebas. La que saca la bomba sí se mide, en su
        medidor de caudal. Lo que la bomba (y su respaldo) no saca llena el tanque; cuando llega al
        alto-alto, hay que cerrar pozos. Por eso esta bomba es de alto impacto.
      </Lectura>

      <Panel className="mt-2.5" titulo="LA BOMBA DE REINYECCIÓN" extra={pr.metodo}>
        <ul className="list-disc pl-4 text-[11.5px] text-[var(--tinta2)]">{pr.supuestos.map(s => <li key={s}>{s}</li>)}</ul>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Boton variante="principal" onClick={() => setPantalla('bombas')}>Ver la bomba y el orden de cierre</Boton>
          <Boton onClick={() => abrirEquipo(perfil.equipo, false)}>Abrir el equipo</Boton>
        </div>
      </Panel>
    </>
  )
}
