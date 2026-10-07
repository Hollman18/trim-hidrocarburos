import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { Lock, Plus, Trash2, PenLine, Check } from 'lucide-react'
import { useApp, useCampo, useCampos, useRol, usePersona } from '@/app/store'
import { useCtx, usePotencialReciente } from '@/shared/api/diferidos'
import { diferenciasPorGrupo, validarConfig, conTramo, conMes, metaEn, mismoTramo, diaCo, perfilDe, NOMBRE_GAS, SIN_META, type Config, type ParadaProgramada, type PerfilCampo } from '@/entities/configuracion'
import type { DestinoGas } from '@/entities/tipos'
import { MOTIVO_MINIMO, alcanza } from '@/entities/reglas'
import { PAPEL_NOMBRE } from '@/entities/bombas'
import { pedirPerfilesBomba, pedirPerfilBomba, pedirMaquinasBomba, pedirRegistroDeEquipos } from '@/shared/api/equipos'
import { pedirPozosDelCampo, pedirMedicionOficial, textoBanda, useCampoAhora } from '@/shared/api/medicion'
import { fechaHora, AHORA } from '@/entities/reloj'
import { Panel, Boton, Chip, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { n0, n1, plural, diaIso } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Esquema } from '@/widgets/configuracion/Esquema'
import { MetasCampos, type EdicionMeta } from '@/widgets/configuracion/Metas'
import { PlanMensual } from '@/widgets/configuracion/PlanMensual'
import type { FilaPlan } from '@/entities/plan'
import { cajaNumero, cajaMala, fechaDia, edicionDe } from '@/widgets/configuracion/comun'
import { Accesos } from '@/widgets/configuracion/Accesos'
import { useSesion, useVersiones, usePlantas } from '@/shared/api/sesion'

const campoInput = 'w-full rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[5px] text-[12px] outline-none focus:border-acento disabled:opacity-70'

type Pestana = 'metas' | 'accesos' | 'tecnica'
const PESTANA: Record<Pestana, string> = { metas: 'Metas de los campos', accesos: 'Usuarios y accesos', tecnica: 'Configuración técnica' }

/** Lo único que se escribe a mano en TRIM: las metas, los accesos y la
 *  configuración técnica del campo. Las metas (con el precio y la regla de
 *  cierre) y los accesos son del gerente de activo; tanques, respaldos,
 *  programa y membrete, del administrador de la implementación. Todo se edita
 *  en un borrador y rige solo cuando quien puede lo FIRMA con un motivo; cada
 *  firma es una versión y ninguna se sobrescribe. Lo demás (producido,
 *  diferido, causas, salud) sale de los equipos y no se configura aquí. */
export function Configuracion() {
  // Cada rol arranca en su primera pestaña: la del administrador no es la del gerente.
  return <ConPestanas key={useRol().id} />
}

function ConPestanas() {
  const versiones = useVersiones()
  const rol = useRol()
  const pestanas: Pestana[] = rol.puede['config:firmar'] ? ['tecnica', 'metas', 'accesos'] : ['metas', 'accesos']
  const [pestana, setPestana] = useState<Pestana>(pestanas[0]!)
  const actual = pestanas.includes(pestana) ? pestana : pestanas[0]!
  // Si ya hay un plan cargado (meses con cifra propia del mes en curso en adelante), se abre en
  // el plan. El modo vive aquí y no en el editor: al firmar, el editor se rehace y no lo pierde.
  const config = useSesion(s => s.ctx.config)
  const [modo, setModo] = useState<'vigente' | 'plan'>(() => {
    const desde = `${diaIso(AHORA).slice(0, 8)}01`
    return Object.values(config.campos).some(c => c.metas.filter(t => t.desde >= desde && t.desde.endsWith('-01')).length >= 2) ? 'plan' : 'vigente'
  })
  // Cuántas versiones había al entrar: si hay más, se acaba de firmar y se dice.
  const [alEntrar] = useState(versiones.length)
  const firmada = versiones.length > alEntrar ? versiones.at(-1)! : null
  // Pestañas de verdad (ARIA): cada una controla el panel, solo la activa entra
  // en el orden del Tab y las flechas, Inicio y Fin se mueven entre ellas.
  const idBase = useId()
  const idPestana = (p: Pestana) => `${idBase}-pestana-${p}`, idPanel = `${idBase}-panel`
  const moverCon = (e: KeyboardEvent, i: number) => {
    const n = pestanas.length
    const sig = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null
    if (sig === null) return
    e.preventDefault()
    const p = pestanas[(sig + n) % n]!
    setPestana(p)
    document.getElementById(idPestana(p))?.focus()
  }
  return (
    <>
      {firmada && (
        <p role="status" className="mb-2.5 flex items-start gap-1.5 rounded border border-[var(--linea)] bg-[var(--panel)] px-3 py-2 text-[12px]">
          <Check className="mt-0.5 size-3.5 shrink-0" />
          <span>Firmada la <b>versión {firmada.version}</b> · «{firmada.motivo}». Cada cambio rige desde la fecha que lleva; desde ahí las pantallas se miden contra él.</span>
        </p>
      )}
      <div role="tablist" aria-label="Partes de la configuración" className="mb-2.5 flex flex-wrap gap-1">
        {pestanas.map((p, i) => (
          <button key={p} id={idPestana(p)} role="tab" aria-selected={actual === p} aria-controls={idPanel}
            tabIndex={actual === p ? 0 : -1} onKeyDown={e => moverCon(e, i)} onClick={() => setPestana(p)}
            className={cn('cursor-pointer rounded border px-3 py-1.5 text-[12px]',
              actual === p ? 'border-[var(--tinta)] bg-[var(--panel)] font-semibold' : 'border-[var(--linea2)] text-[var(--tinta2)] hover:bg-[var(--panel2)]')}>
            {PESTANA[p]}
          </button>
        ))}
      </div>
      {/* Al firmar cambia la versión vigente: el editor arranca de nuevo sobre ella. El borrador sobrevive al cambiar de pestaña. */}
      <div role="tabpanel" id={idPanel} aria-labelledby={idPestana(actual)}>
        <Editor key={versiones.length} pestana={actual} modo={modo} setModo={setModo} />
      </div>
    </>
  )
}

function Editor({ pestana, modo, setModo }: { pestana: Pestana; modo: 'vigente' | 'plan'; setModo: (m: 'vigente' | 'plan') => void }) {
  const campo = useCampo(); const rol = useRol(); const persona = usePersona(); const ctx = useCtx()
  const campos = useCampos()
  const campoId = useApp(s => s.campoId), versiones = useVersiones(), firmarConfig = useApp(s => s.firmarConfig), setPantalla = useApp(s => s.setPantalla)
  const puedeMetas = rol.puede['metas:firmar'], puedeTecnica = rol.puede['config:firmar']
  const desdeMin = `${diaIso(AHORA).slice(0, 8)}01`
  const [borrador, setBorrador] = useState<Config>(() => structuredClone(ctx.config))
  // La versión sobre la que se abrió el borrador: va con la firma, y si
  // mientras tanto alguien firmó otra, el store lo rechaza (el 409 del contrato).
  const [versionBase, setVersionBase] = useState(() => versiones.at(-1)!.version)
  const [ediciones, setEdiciones] = useState<Record<string, EdicionMeta>>({})
  const [desde, setDesde] = useState(() => diaCo(AHORA.getTime()))
  const [motivo, setMotivo] = useState('')
  const [mensaje, setMensaje] = useState<string | null>(null)
  const potencial = usePotencialReciente(campos.map(c => c.id))
  // La última lectura de cada tanque del campo: sin lectura es un hueco, no un nivel supuesto.
  const { niveles } = useCampoAhora(campoId)
  // Lo que se firmaría: el borrador con lo editado puesto como tramos desde el día escogido.
  // El plan mes a mes: lo editado por campo y mes («campo|AAAA-MM»), cada uno un tramo desde su día 1.
  const [plan, setPlan] = useState<Record<string, EdicionMeta>>({})
  const mesActual = desdeMin.slice(0, 7)
  const conVigente = useMemo(() => Object.entries(ediciones).reduce((c, [id, e]) => conTramo(c, id, { desde, ...e }), borrador), [borrador, ediciones, desde])
  const propuesta = useMemo(() => Object.entries(plan).reduce((c, [k, e]) => {
    const [id, mes] = k.split('|') as [string, string]
    return conMes(c, id, { desde: `${mes}-01`, ...e })
  }, conVigente), [conVigente, plan])
  // Lo que un mes heredaría sin cifra propia: lo firmado (o editado como meta vigente), o el
  // último mes anterior del plan en el borrador si empieza después.
  const baseMes = (id: string, mes: string): EdicionMeta => {
    const m = metaEn(conVigente, id, new Date(`${mes}-01T00:00:00-05:00`).getTime())
    const previo = Object.keys(plan).filter(k => k.startsWith(`${id}|`) && k.slice(id.length + 1) < mes).sort().at(-1)
    if (previo && (!m || `${previo.slice(id.length + 1)}-01` > m.desde)) return plan[previo]!
    return edicionDe(m)
  }
  const valorMes = (id: string, mes: string): EdicionMeta => plan[`${id}|${mes}`] ?? baseMes(id, mes)
  const propioMes = (id: string, mes: string) => !!plan[`${id}|${mes}`] || (propuesta.campos[id]?.metas ?? []).some(t => t.desde === `${mes}-01`)
  const editarMes = (id: string, mes: string, cambio: Partial<EdicionMeta>) => {
    setPlan(x => {
      const k = `${id}|${mes}`, e = { ...(x[k] ?? baseMes(id, mes)), ...cambio }, n = { ...x }
      if (mismoTramo({ desde: '', ...e }, { desde: '', ...baseMes(id, mes) })) delete n[k]; else n[k] = e
      return n
    })
    setMensaje(null)
  }
  const cargarPlan = (filas: FilaPlan[]) => {
    setPlan(x => {
      const n = { ...x }
      for (const f of filas) {
        const b = baseMes(f.campoId, f.mes)
        n[`${f.campoId}|${f.mes}`] = { ...b, produccionBpd: f.produccionBpd, diferidoMaxBpd: f.diferidoMaxBpd ?? b.diferidoMaxBpd, netbackUsd: f.netbackUsd ?? b.netbackUsd }
      }
      return n
    })
    setMensaje(null)
  }
  // Quien no firma ve lo que rige hoy; quien firma, lo que regiría el día escogido.
  const tDesde = puedeMetas ? new Date(`${desde}T00:00:00-05:00`).getTime() : AHORA.getTime()
  // Lo que regiría ese día si no se cambia nada, y lo que muestra cada fila.
  const base = (id: string): EdicionMeta => {
    return edicionDe(metaEn(ctx.config, id, tDesde))
  }
  const valor = (id: string): EdicionMeta => ediciones[id] ?? base(id)
  const editar = (id: string, cambio: Partial<EdicionMeta>) => {
    setEdiciones(x => {
      const e = { ...(x[id] ?? base(id)), ...cambio }, n = { ...x }
      // Si vuelve a lo que ya rige, no es un cambio.
      if (mismoTramo({ desde, ...e }, { desde, ...base(id) })) delete n[id]; else n[id] = e
      return n
    })
    setMensaje(null)
  }
  const hoy = diaCo(AHORA.getTime())
  const diasEntre = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00-05:00`).getTime() - new Date(`${a}T00:00:00-05:00`).getTime()) / 86_400_000)
  const grupos = useMemo(() => diferenciasPorGrupo(ctx.config, propuesta), [ctx.config, propuesta])
  const cambios = [...grupos.metas, ...grupos.tecnica]
  // Con la hora de la firma, igual que el store: lo que la pantalla da por bueno es lo que se firma.
  const errores = validarConfig(propuesta, ctx.config, desdeMin, AHORA.getTime())
  const cfgCampo = borrador.campos[campoId]
  const firmaVisible = pestana === 'metas' ? puedeMetas : puedeTecnica

  const cambiar = (f: (c: Config) => void) => { setBorrador(b => { const n = structuredClone(b); f(n); return n }); setMensaje(null) }
  const descartar = () => { setBorrador(structuredClone(ctx.config)); setVersionBase(versiones.at(-1)!.version); setEdiciones({}); setPlan({}); setDesde(diaCo(AHORA.getTime())); setMensaje(null) }
  const firmar = async () => {
    // Quién firma no lo manda la pantalla: lo pone el store (en producción, el token).
    const r = await firmarConfig(propuesta, motivo, versionBase)
    if (r.ok) setVersionBase(r.version)
    setMensaje(r.ok ? null : r.error)
  }

  if (pestana === 'accesos') return <Accesos puede={rol.puede['usuarios:administrar']} />

  const firma = (
    <Panel className="mb-2.5" titulo="FIRMAR LA VERSIÓN" extra={cambios.length ? `${plural(cambios.length, 'cambio', 'cambios')} en el borrador` : 'el borrador es igual a la versión vigente'}>
      {cambios.length === 0 ? <p className="text-[12px] text-[var(--tinta2)]">No hay nada que firmar.</p> : (
        <>
          {grupos.metas.length > 0 && <Grupo titulo={`Metas, precio y regla de cierre · firma el gerente de activo`} lista={grupos.metas} />}
          {grupos.tecnica.length > 0 && <Grupo titulo={`Configuración técnica · firma el administrador de la implementación`} lista={grupos.tecnica} />}
        </>
      )}
      {errores.length > 0 && (
        <div role="alert" className="mb-2 rounded border-2 border-[var(--tinta)] px-2.5 py-1.5">
          <p className="font-cond text-[10px] font-semibold tracking-[.11em]">CORRIJA ANTES DE FIRMAR</p>
          <ul className="list-disc pl-4 text-[11.5px] text-[var(--tinta)]">{errores.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {cambios.length > 0 && (puedeMetas || puedeTecnica) && persona.sinAcceso && (
        <Hueco>Nadie con acceso activo tiene este rol: firma una persona con acceso, no un rol. Los accesos los da el gerente de activo.</Hueco>
      )}
      {cambios.length > 0 && (puedeMetas || puedeTecnica) && !persona.sinAcceso && (
        <form className="grid gap-1.5" onSubmit={e => { e.preventDefault(); void firmar() }}>
          <label className="grid gap-0.5">
            <span className="text-[10.5px] text-[var(--tinta2)]">Motivo del cambio · obligatorio</span>
            <input value={motivo} onChange={e => { setMotivo(e.target.value); setMensaje(null) }} className={campoInput}
              placeholder={Object.keys(plan).length ? 'Ej.: presupuesto 2027 aprobado por la junta' : grupos.metas.length ? 'Ej.: metas acordadas en el comité de producción de octubre' : 'Ej.: nuevo certificado de aforo del tanque'} />
          </label>
          {mensaje && <p className="text-[11.5px] text-[var(--tinta)]" role="alert">{mensaje}</p>}
          <span className="flex flex-wrap gap-1.5">
            <Boton variante="principal" type="submit" disabled={errores.length > 0}><PenLine className="mr-1 inline size-3.5" />Firmar como {persona.nombre}</Boton>
            <Boton type="button" onClick={descartar}>Descartar el borrador</Boton>
          </span>
        </form>
      )}
    </Panel>
  )

  const historial = (
    <Panel titulo="VERSIONES FIRMADAS" extra={`${versiones.length}`}>
      {[...versiones].reverse().map((v, i) => (
        <div key={v.version} className="border-b border-[var(--linea2)] py-2 text-[11.5px] last:border-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <b>Versión {v.version}</b>{i === 0 && <Chip tono="fuerte">vigente</Chip>}
            <span className="text-[10.5px] text-[var(--tinta3)]">{fechaHora(new Date(v.fecha))} · {v.por}</span>
          </div>
          <p className="text-[var(--tinta2)]">«{v.motivo}»</p>
          <ul className="list-disc pl-4 text-[10.5px] text-[var(--tinta3)]">{v.cambios.map(c => <li key={c}>{c}</li>)}</ul>
        </div>
      ))}
    </Panel>
  )

  const selectorModo = (
    // Es un modo de la misma pestaña, no otra pestaña: botones que dicen cuál está puesto.
    <div role="group" aria-label="Cómo se fijan las metas" className="mb-2.5 flex flex-wrap items-center gap-1">
      {([['vigente', 'Meta vigente'], ['plan', 'Plan mes a mes']] as const).map(([m, t]) => (
        <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)}
          className={cn('cursor-pointer rounded border px-3 py-1 text-[11.5px]',
            modo === m ? 'border-[var(--tinta)] bg-[var(--panel)] font-semibold' : 'border-[var(--linea2)] text-[var(--tinta2)] hover:bg-[var(--panel2)]')}>
          {t}
        </button>
      ))}
      <small className="ml-1 text-[10.5px] text-[var(--tinta3)]">
        {modo === 'plan' ? 'una cifra por mes, cargada del presupuesto' : 'una cifra por campo, desde el día que se escoja'}
      </small>
    </div>
  )

  if (pestana === 'metas' && modo === 'plan') return (
    <>
      {!puedeMetas && <div className="mb-2.5"><Hueco><Lock className="mr-1 inline size-3.5" />Las metas y el plan los fija y firma el gerente de activo. Aquí se ven los que rigen.</Hueco></div>}
      {selectorModo}
      <PlanMensual propuesta={propuesta} campos={campos} campoInicial={campoId} mesActual={mesActual} puede={puedeMetas}
        valor={valorMes} propio={propioMes} onEditar={editarMes} onCargar={cargarPlan} />
      {firmaVisible && firma}
      <div className="mb-2.5">{historial}</div>
    </>
  )

  if (pestana === 'metas') return (
    <>
      {!puedeMetas && <div className="mb-2.5"><Hueco><Lock className="mr-1 inline size-3.5" />Las metas, el precio y la regla de cierre los fija y firma el gerente de activo. Aquí se ven los que rigen hoy.</Hueco></div>}
      {selectorModo}
      {puedeMetas && (
        <Panel className="mb-2.5" titulo="DESDE CUÁNDO RIGEN LOS CAMBIOS" extra="una fecha para toda la firma">
          <label className="flex flex-wrap items-center gap-2 text-[12px]">
            <span>Lo que cambie en esta firma rige desde el</span>
            <input type="date" value={desde} min={desdeMin} onChange={e => { if (e.target.value) { setDesde(e.target.value); setMensaje(null) } }}
              aria-label="Día desde el que rigen los cambios"
              className="rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[4px] text-[12px] outline-none focus:border-acento" />
            <b>{fechaDia(desde)}</b>
          </label>
          <p className="mt-1 text-[11px] text-[var(--tinta2)]">
            {desde < desdeMin ? <b>Esa fecha es de un mes cerrado: escoja el {fechaDia(desdeMin)} o después.</b> : desde <= hoy
              ? <>Incluye {diasEntre(desde, hoy) + 1} {diasEntre(desde, hoy) === 0 ? 'día ya corrido (hoy)' : 'días ya corridos'}: lo que va del mes se medirá con lo nuevo.</>
              : <>Empieza dentro de {diasEntre(hoy, desde)} {diasEntre(hoy, desde) === 1 ? 'día' : 'días'}; hasta entonces rige lo que está firmado.</>}
            {desde >= desdeMin && <>{' '}No puede ser antes del {fechaDia(desdeMin)}: lo de un mes cerrado no se reescribe.</>}
          </p>
        </Panel>
      )}
      <div className="mb-2.5">
        <MetasCampos vigente={ctx.config} propuesta={propuesta} campos={campos} desde={desde}
          puede={puedeMetas} potencial={potencial} valor={valor} base={base}
          onEditar={editar} />
      </div>
      <Panel className="mb-2.5" titulo="PRECIO NETO Y REGLA PARA PUBLICAR" extra={puedeMetas ? `rigen desde el ${fechaDia(desde)}` : 'los que rigen hoy'}>
        <Lectura>
          El precio neto pasa barriles a dinero; sin él, ese campo no muestra dinero. La regla para publicar
          dice cuánto puede quedar sin causa identificada para cerrar el libro del mes. Los dos llevan fecha,
          como las metas: cambiarlos no toca los meses cerrados.
        </Lectura>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(76px,108px)_minmax(76px,108px)] items-end gap-x-2 border-b border-[var(--linea)] pb-1 text-[10px] text-[var(--tinta3)]">
          <span>Campo</span><span className="text-right">Precio neto, USD/bbl</span><span className="text-right">Para publicar: máx. % sin causa</span>
        </div>
        {campos.map(c => {
          const v = puedeMetas ? valor(c.id) : base(c.id), b = base(c.id)
          // Sin meta firmada no hay precio ni regla que mostrar: casillas vacías y el hueco dicho.
          const sinMeta = !metaEn(ctx.config, c.id, tDesde)
          const critMala = puedeMetas && !(v.criterioSinCausa >= 0 && v.criterioSinCausa <= 20), precioMalo = v.netbackUsd !== undefined && !(v.netbackUsd >= 0)
          const cambiado = !Object.is(v.netbackUsd, b.netbackUsd) || !Object.is(v.criterioSinCausa, b.criterioSinCausa)
          return (
            <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_minmax(76px,108px)_minmax(76px,108px)] items-center gap-x-2 border-b border-[var(--linea2)] py-1.5 last:border-0">
              <span className="min-w-0">
                <b className="block truncate text-[12px]">{c.nombre}</b>
                {cambiado && <small className="block text-[10px] text-[var(--tinta3)]">antes {sinMeta ? SIN_META : <>{b.netbackUsd ?? 'sin precio'}{b.netbackUsd !== undefined ? ' USD/bbl' : ''} · {b.criterioSinCausa} %</>}</small>}
                {!cambiado && sinMeta && <small className="block text-[10px] text-[var(--tinta3)]">{SIN_META}: sin precio ni regla para publicar</small>}
              </span>
              <input type="number" step={0.5} min={0} disabled={!puedeMetas} aria-label={`Precio neto de ${c.nombre}, USD/bbl`} placeholder="sin precio"
                aria-invalid={precioMalo} value={v.netbackUsd ?? ''} className={cn(cajaNumero, precioMalo && cajaMala)}
                onChange={e => editar(c.id, { netbackUsd: e.target.value === '' ? undefined : Number(e.target.value) })} />
              <input type="number" step={0.5} min={0} max={20} disabled={!puedeMetas} aria-label={`Máximo sin causa para publicar de ${c.nombre}, %`}
                aria-invalid={critMala} value={Number.isNaN(v.criterioSinCausa) ? '' : v.criterioSinCausa} className={cn(cajaNumero, critMala && cajaMala)}
                onChange={e => editar(c.id, { criterioSinCausa: e.target.value === '' ? NaN : Number(e.target.value) })} />
            </div>
          )
        })}
      </Panel>
      {firmaVisible && firma}
      <div className="mb-2.5">{historial}</div>
    </>
  )

  return (
    <>
      <Panel className="mb-2.5" titulo="CONFIGURACIÓN TÉCNICA DEL CAMPO" extra={`${campo.nombre} · versión ${versiones.at(-1)!.version} vigente`}>
        <p className="text-[12.5px]">
          El perfil del campo (gas y familias de equipo), tanques, respaldos de las bombas, programa de paradas
          y membrete de los informes. Las metas y los accesos son del gerente de activo; producción, diferido,
          causas y salud salen de los equipos.
        </p>
        <Lectura>
          Los cambios quedan en un borrador hasta que se firman con un motivo. Cada firma es una versión
          nueva: así nadie puede mover una regla después de ver el resultado sin que quede escrito.
        </Lectura>
      </Panel>

      <PerfilDelCampo campoId={campoId} perfil={perfilDe(borrador, campoId)} puede={puedeTecnica}
        onCambio={p => cambiar(c => { c.campos[campoId]!.perfil = { ...perfilDe(c, campoId), ...p } })} />

      <Panel className="mb-2.5" titulo="MEMBRETE DE LOS INFORMES" extra="vale para todos los campos">
        <Texto rotulo="Nombre de la empresa, como va en el membrete de cada informe exportado" valor={borrador.empresa} disabled={!puedeTecnica}
          onCambio={v => cambiar(c => { c.empresa = v })} />
      </Panel>

      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <Panel titulo="TANQUES DE AGUA" extra="dan el colchón antes de cerrar pozos">
          {borrador.tanques.filter(t => t.campoId === campoId).map(t => (
            <div key={t.id} className="mb-2 border-b border-[var(--linea2)] pb-2 last:mb-0 last:border-0">
              <b className="block text-[12px]">{t.nombre}</b>
              <small className="font-mono block text-[10px] text-[var(--tinta3)]">{t.id} · lo vacía {t.bomba} · nivel ahora {(nv => (nv ? `${n1(nv.pct)} %` : 'sin lectura'))(Object.hasOwn(niveles, t.id) ? niveles[t.id] : undefined)}</small>
              <div className="mt-1.5 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
                <Numero rotulo="Capacidad" sufijo="bbl" valor={t.capacidadBbl} paso={100} min={100} max={500000} disabled={!puedeTecnica}
                  onCambio={v => cambiar(c => { c.tanques.find(x => x.id === t.id)!.capacidadBbl = v })} />
                <Numero rotulo="Alto-alto" sufijo="%" valor={Math.round(t.altoAlto * 1000) / 10} paso={0.5} min={50} max={98} disabled={!puedeTecnica}
                  onCambio={v => cambiar(c => { c.tanques.find(x => x.id === t.id)!.altoAlto = v / 100 })} />
                <Texto rotulo="Transmisor de nivel" valor={t.tagNivel} disabled={!puedeTecnica}
                  onCambio={v => cambiar(c => { c.tanques.find(x => x.id === t.id)!.tagNivel = v })} />
              </div>
              <Texto rotulo="Certificado de aforo" valor={t.aforo} disabled={!puedeTecnica}
                onCambio={v => cambiar(c => { c.tanques.find(x => x.id === t.id)!.aforo = v })} />
            </div>
          ))}
          {!borrador.tanques.some(t => t.campoId === campoId) && <p className="text-[12px] text-[var(--tinta2)]">{campo.nombre} no tiene tanque de agua configurado: su bomba no cierra pozos por nivel.</p>}
        </Panel>

        <Panel titulo="BOMBAS DE LA LÍNEA · RESPALDO" extra="cambia el colchón y el orden de cierre">
          {!pedirPerfilesBomba(campoId).length && (
            <p className="text-[12px] text-[var(--tinta2)]">{campo.nombre} no tiene bombas de la línea con perfil en el registro de ingeniería: no hay respaldo que declarar.</p>
          )}
          {pedirPerfilesBomba(campoId).map(p => {
            const id = p.equipo
            const r = borrador.respaldos.find(x => x.campoId === campoId && x.equipo === id)
            return (
              <div key={id} className="mb-2 border-b border-[var(--linea2)] pb-2 last:mb-0 last:border-0">
                <b className="block text-[12px]">{pedirRegistroDeEquipos(campoId).find(e => e.id === id)?.nombre ?? id}</b>
                <small className="block text-[10.5px] text-[var(--tinta3)]">{id} · {PAPEL_NOMBRE[p.papel]} · capacidad {n0(p.capacidadBpd)} bbl/d{p.pozos ? ` · pozos ${p.pozos.join(', ')}` : ''}</small>
                <div className="mt-1.5 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                  <Numero rotulo="Capacidad libre del respaldo" sufijo="bbl/d" valor={r?.libreBpd ?? 0} paso={100} min={0} max={p.capacidadBpd * 2} disabled={!puedeTecnica}
                    onCambio={v => cambiar(c => {
                      const x = c.respaldos.find(y => y.campoId === campoId && y.equipo === id)
                      if (x) x.libreBpd = v; else c.respaldos.push({ campoId, equipo: id, libreBpd: v, detalle: 'Declarado en la configuración' })
                    })} />
                  <Texto rotulo="Qué es el respaldo" valor={r?.detalle ?? ''} disabled={!puedeTecnica}
                    onCambio={v => cambiar(c => { const x = c.respaldos.find(y => y.campoId === campoId && y.equipo === id); if (x) x.detalle = v })} />
                </div>
              </div>
            )
          })}
        </Panel>
      </div>

      <div className="mb-2.5"><Programa borrador={borrador} campoId={campoId} puede={puedeTecnica} onCambio={cambiar} /></div>

      {firmaVisible && firma}

      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        {historial}
        <Fuentes campoId={campoId} niveles={borrador.tanques.filter(t => t.campoId === campoId).map(t => `${t.id} · ${t.tagNivel}`)}
          onConectores={rol.pantallas.includes('conectores') ? () => setPantalla('conectores') : undefined} />
      </div>

      <details className="group">
        <summary className="mb-2 flex cursor-pointer list-none items-center gap-2 rounded border border-[var(--linea)] bg-[var(--panel)] px-3 py-2 text-[12px] shadow-[var(--sombra)] hover:bg-[var(--elevado)]">
          <b className="flex-1">Esquema de planta de {campo.nombre}</b>
          <span className="text-[10.5px] text-[var(--tinta3)]">topología del dibujo · no cambia ningún cálculo</span>
          <span className="text-[10px] text-[var(--tinta3)] group-open:rotate-180">▾</span>
        </summary>
        <Esquema puede={rol.puede['conector:configurar']} conGas={perfilDe(borrador, campoId).gas !== 'no'} />
      </details>
      {cfgCampo === undefined && <Hueco>{campo.nombre} no tiene configuración.</Hueco>}
    </>
  )
}

/** Lo que el campo maneja y las familias de equipo que tiene. Decide qué se
 *  dibuja en Planta y qué subpantallas aparecen en «Pozos y equipos». Al lado
 *  va lo que el registro del campo tiene de verdad: si no cuadra, se dice. */
function PerfilDelCampo({ campoId, perfil, puede, onCambio }: {
  campoId: string; perfil: PerfilCampo; puede: boolean; onCambio: (p: Partial<PerfilCampo>) => void
}) {
  const plantas = usePlantas(), planta = Object.hasOwn(plantas, campoId) ? plantas[campoId] : undefined
  const esp = pedirPozosDelCampo(campoId).filter(p => p.levantamiento === 'electrosumergible').length
  const registrados = new Set(pedirRegistroDeEquipos(campoId).map(e => e.id))
  const idsBombas = pedirMaquinasBomba().filter(id => pedirPerfilBomba(campoId, id) || registrados.has(id))
  const bombas = idsBombas.length
  const enGas = planta?.gas.length ?? 0
  const queda = 'no saldrán sus avisos ni sus predicciones; lo que pierdan se sigue contando en el libro'
  const avisos = [
    perfil.gas === 'no' && enGas > 0 && `El esquema tiene ${plural(enGas, 'elemento', 'elementos')} en el tren de gas: no se dibujan mientras el campo diga que no tiene gas.`,
    perfil.gas !== 'no' && enGas === 0 && 'El esquema no tiene elementos en el tren de gas: regístrelos en «Esquema de planta», al final de esta pestaña.',
    !perfil.electrosumergibles && esp > 0 && `${esp === 1 ? 'El pozo con electrosumergible deja' : `Los ${n0(esp)} pozos con electrosumergible dejan`} de vigilarse: ${queda}.`,
    perfil.electrosumergibles && esp === 0 && 'No hay pozos con electrosumergible registrados: la subpantalla saldrá vacía hasta que se registren.',
    !perfil.bombas && bombas > 0 && `${idsBombas.join(', ')} ${bombas === 1 ? 'deja' : 'dejan'} de vigilarse: ${queda}.`,
    perfil.bombas && bombas === 0 && 'No hay bombas de la línea registradas: la subpantalla saldrá vacía hasta que se registren.',
  ].filter((x): x is string => !!x)
  const casilla = (k: 'bombas' | 'electrosumergibles', rotulo: string, cuantos: string) => (
    <label className="flex items-start gap-2 py-1 text-[12px]">
      <input type="checkbox" className="mt-0.5" checked={perfil[k]} disabled={!puede} onChange={e => onCambio({ [k]: e.target.checked })} />
      <span>{rotulo}<small className="block text-[10.5px] text-[var(--tinta3)]">{cuantos}</small></span>
    </label>
  )
  return (
    <Panel className="mb-2.5" titulo="PERFIL DEL CAMPO" extra="decide qué se dibuja y qué subpantallas aparecen">
      <Lectura>
        Cada campo es distinto: uno sin gas no tiene tren de gas, uno de bombeo mecánico no tiene
        electrosumergibles. Lo que se marque aquí decide lo que se dibuja en Planta y las subpantallas
        de «Pozos y equipos». Al lado de cada casilla va lo que el registro del campo tiene.
      </Lectura>
      <label className="grid max-w-[340px] gap-0.5">
        <span className="text-[10.5px] text-[var(--tinta2)]">Destino principal del gas</span>
        <select value={perfil.gas} disabled={!puede} onChange={e => onCambio({ gas: e.target.value as DestinoGas })} className={campoInput}>
          {(Object.keys(NOMBRE_GAS) as DestinoGas[]).map(g => <option key={g} value={g}>{NOMBRE_GAS[g][0]!.toUpperCase() + NOMBRE_GAS[g].slice(1)}</option>)}
        </select>
        <small className="text-[10.5px] text-[var(--tinta3)]">{enGas ? `${plural(enGas, 'elemento', 'elementos')} en el tren de gas del esquema` : 'sin elementos en el tren de gas del esquema'} · el gas no se mide en esta fase</small>
      </label>
      <div className="mt-2 grid gap-x-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
        {casilla('bombas', 'Bombas de la línea (reinyección, transferencia, multifásicas)', `${plural(bombas, 'bomba registrada', 'bombas registradas')} en el campo`)}
        {casilla('electrosumergibles', 'Electrosumergibles', `${plural(esp, 'pozo', 'pozos')} con electrosumergible en el registro`)}
      </div>
      {avisos.length > 0 && (
        <ul className="mt-2 grid gap-1 text-[11.5px] text-[var(--tinta)]">
          {avisos.map(a => <li key={a} className="flex items-start gap-1.5"><FueraDeMeta si tamano={11} /><span>{a}</span></li>)}
        </ul>
      )}
    </Panel>
  )
}

function Grupo({ titulo, lista }: { titulo: string; lista: string[] }) {
  return (
    <div className="mb-2">
      <p className="font-cond mb-0.5 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">{titulo.toUpperCase()}</p>
      <ul className="list-disc pl-4 text-[11.5px] text-[var(--tinta2)]">{lista.map(c => <li key={c}>{c}</li>)}</ul>
    </div>
  )
}

/** El programa de paradas aprobado del campo: lo que está aquí cuenta como
 *  programado, no como falla. */
function Programa({ borrador, campoId, puede, onCambio }: {
  borrador: Config; campoId: string; puede: boolean; onCambio: (f: (c: Config) => void) => void
}) {
  const opciones = [
    ...pedirRegistroDeEquipos(campoId).filter(e => e.instrumentado).map(e => e.id),
    ...pedirPozosDelCampo(campoId).map(p => p.id),
  ]
  const [nuevo, setNuevo] = useState<Omit<ParadaProgramada, 'id' | 'campoId'>>({ equipo: opciones[0] ?? '', desde: '', hasta: '', motivo: '' })
  const lista = borrador.programa.filter(p => p.campoId === campoId).sort((a, b) => b.desde.localeCompare(a.desde))
  // Lo que ya empezó pasó como programado o como falla: no se agrega ni se quita después.
  const ahoraLocal = new Date(AHORA.getTime() - 5 * 3_600_000).toISOString().slice(0, 16)
  const empezo = (p: ParadaProgramada) => Date.parse(p.desde) < AHORA.getTime()
  const iso = (local: string) => (local ? `${local}:00-05:00` : '')
  // El código lleva el campo: P-201B existe en varios campos y dos paradas no pueden compartirlo.
  const agregar = () => {
    if (!nuevo.equipo || !nuevo.desde || !nuevo.hasta || !alcanza(nuevo.motivo, MOTIVO_MINIMO)) return
    onCambio(c => { c.programa.push({ ...nuevo, desde: iso(nuevo.desde), hasta: iso(nuevo.hasta), campoId, id: `PR-${campoId}-${nuevo.equipo}-${nuevo.desde.replace(/\D/g, '')}` }) })
    setNuevo(n => ({ ...n, desde: '', hasta: '', motivo: '' }))
  }
  return (
    <Panel titulo="PROGRAMA DE PARADAS APROBADO" extra={`${lista.length} en este campo`}>
      <Lectura>Una parada que esté aquí cuenta como programada, no como falla. Por eso se aprueba con firma y antes de que empiece: una falla no se puede volver programada después, ni una parada programada quitarse cuando ya pasó.</Lectura>
      <div className="max-h-[260px] overflow-y-auto">
        {lista.map(p => (
          <div key={p.id} className="flex items-start gap-2 border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
            <span className="min-w-0 flex-1"><b>{p.equipo}</b> <span className="text-[10.5px] text-[var(--tinta3)]">{fechaHora(new Date(p.desde))} a {fechaHora(new Date(p.hasta))}</span>
              <small className="block text-[10.5px] text-[var(--tinta2)]">{p.motivo}</small></span>
            {puede && (
              <button onClick={() => onCambio(c => { c.programa = c.programa.filter(x => x.id !== p.id) })} aria-label={`Quitar la parada de ${p.equipo}`}
                disabled={empezo(p)} title={empezo(p) ? 'Ya empezó: no se puede quitar del programa' : undefined}
                className="cursor-pointer rounded border border-[var(--linea2)] p-1 text-[var(--tinta3)] hover:border-[var(--tinta)] hover:text-[var(--tinta)] disabled:cursor-not-allowed disabled:opacity-35">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {puede && (
        <div className="mt-2 grid gap-1.5 border-t border-[var(--linea2)] pt-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))]">
          <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Equipo</span>
            <select value={nuevo.equipo} onChange={e => setNuevo(n => ({ ...n, equipo: e.target.value }))} className={campoInput}>
              {opciones.map(o => <option key={o} value={o}>{o}</option>)}
            </select></label>
          <label className="grid min-w-0 gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Desde</span>
            <input type="datetime-local" value={nuevo.desde} min={ahoraLocal} onChange={e => setNuevo(n => ({ ...n, desde: e.target.value }))} className={cn(campoInput, 'min-w-0')} /></label>
          <label className="grid min-w-0 gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Hasta</span>
            <input type="datetime-local" value={nuevo.hasta} min={nuevo.desde || ahoraLocal} onChange={e => setNuevo(n => ({ ...n, hasta: e.target.value }))} className={cn(campoInput, 'min-w-0')} /></label>
          <label className="grid gap-0.5 [grid-column:1/-1]"><span className="text-[10.5px] text-[var(--tinta2)]">Motivo</span>
            <input value={nuevo.motivo} onChange={e => setNuevo(n => ({ ...n, motivo: e.target.value }))} className={campoInput} placeholder="Ej.: cambio de sello programado" /></label>
          <Boton variante="principal" className="[grid-column:1/-1]" onClick={agregar}
            disabled={!nuevo.equipo || !nuevo.desde || !nuevo.hasta || !alcanza(nuevo.motivo, MOTIVO_MINIMO)}><Plus className="mr-1 inline size-3" />Agregar al borrador</Boton>
        </div>
      )}
    </Panel>
  )
}

/** Lo que NO se configura: sale de los equipos, con su cadena de custodia. */
function Fuentes({ campoId, niveles, onConectores }: { campoId: string; niveles: string[]; onConectores?: () => void }) {
  const conEsp = perfilDe(useSesion(s => s.ctx.config), campoId).electrosumergibles
  const pozos = pedirPozosDelCampo(campoId)
  const cuenta = (f: (p: typeof pozos[number]) => boolean) => pozos.filter(f).length
  const medicion = pedirMedicionOficial(campoId), origen = medicion.origen
  const filas: Array<[string, string]> = [
    ['Producción real', `${origen?.fuente ?? 'sin punto de medición'} · corte de agua: ${origen?.bsw ?? '—'}`],
    ['Estado de cada pozo', `${cuenta(p => p.levantamiento === 'electrosumergible')} variadores · ${cuenta(p => p.levantamiento === 'bombeo-mecanico')} controladores de bombeo · ${cuenta(p => p.levantamiento === 'flujo-natural')} válvulas de cabeza`],
    ['Pruebas de pozo', `${cuenta(p => p.origen === 'instrumento')} con separador automatizado · ${cuenta(p => p.origen === 'estimado')} estimadas desde la electrosumergible · ${cuenta(p => !p.pruebas.length)} sin prueba`],
    ['Nivel de los tanques de agua', niveles.join(' · ') || 'sin tanque de agua'],
    ['Paradas de las bombas y su primera alarma', 'Registro de eventos del PLC (first-out)'],
    ...(conEsp ? [['Límites de las electrosumergibles', 'Ajustes de protección del variador de cada pozo'] as [string, string]] : []),
    ['Banda de asignación', textoBanda(medicion)],
  ]
  return (
    <Panel titulo="LO QUE NO SE CONFIGURA" extra="sale de los equipos">
      <Lectura>Esto no se escribe en ningún formulario: lo entrega cada equipo con su tag. Si una fuente falta, la pantalla lo dice como hueco de custodia.</Lectura>
      {filas.map(([k, v]) => (
        <div key={k} className={cn('grid grid-cols-[minmax(0,150px)_1fr] gap-3 border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0')}>
          <b>{k}</b><span className="text-[var(--tinta2)]">{v}</span>
        </div>
      ))}
      {onConectores && <Boton className="mt-2 w-full" onClick={onConectores}>Ver conectores y tags</Boton>}
    </Panel>
  )
}

function Numero({ rotulo, sufijo, valor, paso, min, max, ayuda, disabled, vacio, onCambio }: {
  rotulo: string; sufijo: string; valor: number | undefined; paso: number; min: number; max: number
  ayuda?: string; disabled?: boolean; vacio?: boolean; onCambio: (v: number) => void
}) {
  const malo = valor !== undefined && !(valor >= min && valor <= max)
  return (
    <label className="mb-2 grid gap-0.5 last:mb-0">
      <span className="text-[10.5px] text-[var(--tinta2)]">{rotulo}</span>
      <span className="flex items-center gap-1.5">
        <input type="number" step={paso} min={min} max={max} disabled={disabled} value={valor === undefined || Number.isNaN(valor) ? '' : valor}
          placeholder={vacio ? 'sin configurar' : undefined}
          aria-invalid={malo} onChange={e => onCambio(e.target.value === '' ? NaN : Number(e.target.value))} className={cn(campoInput, 'tabular max-w-[140px]', malo && cajaMala)} />
        <span className="text-[10.5px] text-[var(--tinta3)]">{sufijo}</span>
      </span>
      {ayuda && <small className="text-[10px] leading-snug text-[var(--tinta3)]">{ayuda}</small>}
    </label>
  )
}

function Texto({ rotulo, valor, disabled, onCambio }: { rotulo: string; valor: string; disabled?: boolean; onCambio: (v: string) => void }) {
  return (
    <label className="mt-1.5 grid gap-0.5">
      <span className="text-[10.5px] text-[var(--tinta2)]">{rotulo}</span>
      <input value={valor} disabled={disabled} onChange={e => onCambio(e.target.value)} className={campoInput} />
    </label>
  )
}
