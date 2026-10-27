import { useId, useMemo, useState } from 'react'
import { Lock, Plus, Trash2, PenLine, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp, useCampo, useCampos, useRol, usePersona } from '@/app/store'
import { useCtx, usePotencialReciente } from '@/shared/api/diferidos'
import { diferenciasPorGrupo, validarConfig, conTramo, conMes, metaEn, mismoTramo, diaCo, perfilDe, NOMBRE_GAS, SIN_META, type Config, type ParadaProgramada, type PerfilCampo } from '@/entities/configuracion'
import type { DestinoGas } from '@/entities/tipos'
import { MOTIVO_MINIMO, alcanza } from '@/entities/reglas'
import { PAPEL_NOMBRE } from '@/entities/bombas'
import { pedirPerfilesBomba, pedirPerfilBomba, pedirMaquinasBomba, pedirRegistroDeEquipos } from '@/shared/api/equipos'
import { pedirPozosDelCampo, pedirMedicionOficial, textoBanda, useCampoAhora } from '@/shared/api/medicion'
import { fechaHora, AHORA } from '@/entities/reloj'
import { Panel, Boton, Chip, Hueco, Enlace } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { n0, n1, plural, diaIso } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Esquema } from '@/widgets/configuracion/Esquema'
import { MetasCampos, type EdicionMeta } from '@/widgets/configuracion/Metas'
import { PlanMensual } from '@/widgets/configuracion/PlanMensual'
import type { FilaPlan } from '@/entities/plan'
import { cajaNumero, cajaMala, fechaDia, edicionDe } from '@/widgets/configuracion/comun'
import { Accesos } from '@/widgets/configuracion/Accesos'
import { FilosofiaOperacional, type PasoFilosofia } from '@/widgets/configuracion/Filosofia'
import { MarcaEstado, MarcaFalta } from '@/widgets/configuracion/marcas'
import {
  conTopologia, faltanParaFirmar, capacidadesQueBloquean, estadoConfiguracion,
  type TopologiaVigente, type RespuestaEquipo, type TopologiaEnBorrador, type CapacidadesCampo,
  type EstadoConfiguracion, type PasoConfiguracion,
} from '@/shared/api/choke'
import { useSesion, useVersiones, usePlantas } from '@/shared/api/sesion'

const campoInput = 'w-full rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[5px] text-[14px] outline-none focus:border-acento disabled:opacity-70'

/** Las partes de Configurar (UI-01: ninguna pestaña horizontal). Cada una con su
 *  título (I-adm-3). El administrador abre en «Estado» (X4 §3.4): lo que falta en
 *  el campo, y cada paso lleva a la parte donde se hace. */
type Pestana = 'metas' | 'accesos' | 'tecnica' | 'filosofia'
type Parte = 'estado' | Pestana
const PESTANA: Record<Pestana, string> = {
  metas: 'Metas de los campos', accesos: 'Usuarios y accesos', tecnica: 'Configuración técnica', filosofia: 'Filosofía operacional',
}
/** Dónde se hace cada paso del estado: la parte y, en la filosofía, su paso. */
const DONDE_PASO: Record<PasoConfiguracion, { parte: Pestana; paso?: PasoFilosofia }> = {
  perfil: { parte: 'tecnica' }, tanques: { parte: 'tecnica' }, topologia: { parte: 'filosofia', paso: 1 },
  capacidades: { parte: 'filosofia', paso: 2 }, factor: { parte: 'filosofia', paso: 2 }, metas: { parte: 'metas' },
}

/** Lo único que se escribe a mano en TRIM: las metas, los accesos y la
 *  configuración técnica del campo. Las metas (con el precio y la regla de
 *  cierre) y los accesos son del gerente de activo; tanques, respaldos,
 *  programa y membrete, del administrador de la implementación, como la
 *  filosofía operacional (a qué pozos sirve cada equipo: U2 §8). Todo se edita
 *  en un borrador y rige solo cuando quien puede lo FIRMA con un motivo; cada
 *  firma es una versión y ninguna se sobrescribe. Lo demás (producido,
 *  diferido, causas, salud) sale de los equipos y no se configura aquí. */
export function Configuracion() {
  // Cada rol arranca en su primera parte: la del administrador (el estado) no es la del gerente.
  return <ConPartes key={useRol().id} />
}

function ConPartes() {
  const versiones = useVersiones()
  const rol = useRol()
  const pantalla = useApp(s => s.pantalla), setPantalla = useApp(s => s.setPantalla)
  // La filosofía operacional la prepara y la firma el administrador; producción y
  // confiabilidad abren Configuración en solo lectura (la filosofía, lo técnico y
  // las metas); el gerente no entra a la filosofía (U2 §8.1).
  const conEstado = !!rol.puede['config:firmar']
  const pestanas: Pestana[] = conEstado ? ['tecnica', 'filosofia', 'metas', 'accesos']
    : rol.nivel === 'ingenieria' ? ['filosofia', 'tecnica', 'metas'] : ['metas', 'accesos']
  // La filosofía operacional tiene dirección propia (#/…/filosofia/…): su parte
  // es esa pantalla. Las demás son partes de Configuración.
  const otras: Pestana[] = pestanas.filter(p => p !== 'filosofia')
  const inicio: Parte = conEstado ? 'estado' : otras[0]!
  const [parte, setParte] = useState<Parte>(inicio)
  const actual: Parte = pantalla === 'filosofia' && pestanas.includes('filosofia') ? 'filosofia'
    : parte === 'estado' || otras.includes(parte as Pestana) ? parte : inicio
  // El paso de la filosofía vive aquí, como el modo de las metas: al firmar, el editor se rehace y no lo pierde.
  const [pasoFilosofia, setPasoFilosofia] = useState<PasoFilosofia>(1)
  const irA = (p: Parte, paso?: PasoFilosofia) => {
    if (paso) setPasoFilosofia(paso)
    if (p === 'filosofia') return setPantalla('filosofia')
    setParte(p)
    if (pantalla !== 'configuracion') setPantalla('configuracion')
    // Arriba de la vista, con el foco en el título de la parte: quien usa teclado o lector sabe dónde quedó.
    requestAnimationFrame(() => { document.querySelector('.vista')?.scrollTo({ top: 0 }); document.getElementById(idTitulo)?.focus({ preventScroll: true }) })
  }
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
  const idTitulo = `${useId()}-parte`
  return (
    <div className="grid gap-3 sm:gap-4" data-configurar={actual}>
      {firmada && (
        <p role="status" className="flex flex-wrap items-center gap-1.5 rounded-[14px] bg-[var(--panel)] px-4 py-2.5 text-[15px]">
          <Check className="size-4 shrink-0" />
          <span>Firmada la <b>versión {firmada.version}</b> · «{firmada.motivo}»</span>
          <Info titulo="Desde cuándo rige" texto="Cada cambio rige desde la fecha que lleva; desde ahí las pantallas se miden contra él." />
        </p>
      )}
      {/* Ninguna pestaña (UI-01): el administrador vuelve al estado; los demás tienen sus partes en una lista. */}
      {actual !== 'estado' && (conEstado
        ? <button type="button" onClick={() => irA('estado')} data-volver-estado
            className="no-imprimir inline-flex min-h-11 cursor-pointer items-center gap-0.5 justify-self-start text-[15px] font-semibold text-[var(--tinta)] hover:underline">
            <ChevronLeft aria-hidden className="size-4 text-[var(--tinta2)]" />Estado de la configuración
          </button>
        : pestanas.length > 1 && <ListaPartes partes={pestanas} actual={actual} onIr={irA} />)}
      {/* Un título por parte (I-adm-3); la filosofía trae el suyo. */}
      {actual !== 'filosofia' && (
        <h2 id={idTitulo} tabIndex={-1} className={cn('text-[20px] font-semibold leading-tight outline-none', actual === 'estado' && 'sr-only')}>
          {actual === 'estado' ? 'Estado de la configuración' : PESTANA[actual]}
        </h2>
      )}
      {/* Al firmar cambia la versión vigente: el editor arranca de nuevo sobre ella. El borrador sobrevive al cambiar de parte. */}
      <div className="grid gap-3 sm:gap-4">
        <Editor key={versiones.length} pestana={actual} modo={modo} setModo={setModo} partes={pestanas}
          pasoFilosofia={pasoFilosofia} setPasoFilosofia={setPasoFilosofia} onPestana={irA} />
      </div>
    </div>
  )
}

/** Las partes de la configuración en una lista (no en pestañas): la que se ve,
 *  marcada; las demás, con «›». */
function ListaPartes({ partes, actual, onIr }: { partes: Pestana[]; actual: Parte; onIr: (p: Pestana) => void }) {
  return (
    <nav aria-label="Partes de la configuración" className="no-imprimir rounded-[20px] bg-[var(--panel)] px-4 py-1 sm:px-6" data-partes>
      <ul>
        {partes.map(p => (
          <li key={p} className="border-t border-[var(--linea2)] first:border-t-0">
            <button type="button" aria-current={actual === p ? 'page' : undefined} onClick={() => onIr(p)}
              className={cn('flex min-h-11 w-full cursor-pointer items-center gap-2 py-1.5 text-left text-[15px] hover:underline',
                actual === p ? 'font-semibold text-[var(--tinta)]' : 'text-[var(--tinta2)]')}>
              <span className="min-w-0 flex-1">{PESTANA[p]}</span>
              {actual === p ? <Check aria-hidden className="size-4 shrink-0" /> : <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--tinta3)]" />}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** El estado de la configuración del campo (P-04; X4 §3.4, adm): la cifra «N de M
 *  pasos listos», lo que falta y una fila por paso que lleva a donde se hace. Lo
 *  arma el motor (`estadoConfiguracion`): aquí solo se pinta. */
function EstadoDelCampo({ estado, otros, partes, cambios, onPaso, onParte, onCampo }: {
  estado: EstadoConfiguracion
  /** Los demás campos del rol, con su cuenta. */
  otros: Array<{ id: string; nombre: string; listos: number; total: number }>
  partes: Pestana[]
  /** Cambios del borrador sin firmar, y dónde se firman. */
  cambios: { n: number; parte: Pestana }
  onPaso: (p: PasoConfiguracion) => void
  onParte: (p: Pestana) => void
  onCampo: (id: string) => void
}) {
  const campo = useCampo()
  // K2 · En el teléfono, los otros campos detrás de un toque: cada uno trae su «N de M» y la primera
  // pantalla es la de este campo (el campo se cambia también en la píldora de la banda).
  const [verOtros, setVerOtros] = useState(false)
  return (
    <>
      <section aria-label={estado.frase} data-estado-config={campo.id} className="rounded-[20px] bg-[var(--panel)] px-5 pb-2 pt-4 sm:px-7 sm:pt-5">
        {/* K2 · En el teléfono el campo ya está en la píldora de la banda (como I-sup-1). */}
        <p className="text-[15px] font-medium text-[var(--tinta2)] max-sm:sr-only">{campo.nombre}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <b className="tabular text-[48px] font-bold leading-[.95] tracking-[-.03em] sm:text-[60px]" data-cifra>{estado.listos} de {estado.total}</b>
          <span className="text-[22px] font-medium text-[var(--tinta2)]">pasos listos</span>
        </p>
        <p className="mt-2.5 text-[19px] font-medium leading-snug sm:text-[21px]" data-falta>{estado.falta ?? 'Todo firmado.'}</p>
        {cambios.n > 0 && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[16px] text-[var(--tinta2)]" data-borrador>
            {plural(cambios.n, 'cambio sin firmar', 'cambios sin firmar')} en el borrador.
            <Enlace onClick={() => onParte(cambios.parte)}>Firmar la versión</Enlace>
          </p>
        )}
        <ul className="mt-3" aria-label="Pasos del campo">
          {estado.pasos.map(p => (
            <li key={p.paso} className="border-t border-[var(--linea2)]">
              <button type="button" onClick={() => onPaso(p.paso)} data-paso={p.paso} data-listo={p.listo ? 'si' : 'no'}
                aria-label={`${p.nombre}: ${p.listo ? 'listo' : 'falta'}. ${p.detalle}.${p.firma === 'gerente' ? ' Lo firma el gerente de activo.' : ''}`}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 py-2.5 text-left hover:bg-[var(--panel2)]/60">
                <span className="grid size-5 shrink-0 place-items-center">{p.listo ? <MarcaEstado estado="firmado" /> : <MarcaFalta decorativa />}</span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[16px] font-semibold leading-snug">{p.nombre}</b>
                  {/* K2 · En el teléfono, el estado en una o dos palabras (el motor da `corto`); el detalle, en el paso. */}
                  <span className="block text-[14px] leading-snug text-[var(--tinta2)] max-sm:hidden">{p.detalle}{p.firma === 'gerente' ? ' · la firma el gerente de activo' : ''}</span>
                  <span className="block text-[14px] leading-snug text-[var(--tinta2)] sm:hidden" data-corto>{p.corto}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--tinta3)]" />
              </button>
            </li>
          ))}
        </ul>
      </section>
      {otros.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[15px] text-[var(--tinta2)]" data-otros-campos>
          <button type="button" aria-expanded={verOtros} onClick={() => setVerOtros(x => !x)} data-ver-otros
            className="toque inline-flex min-h-11 cursor-pointer items-center gap-1 font-semibold text-[var(--tinta)] sm:hidden">
            Sus otros campos<ChevronDown aria-hidden className={cn('size-4 text-[var(--tinta2)] transition-transform duration-[120ms]', verOtros && 'rotate-180')} />
          </button>
          <span className="max-sm:hidden">Sus otros campos:</span>
          {otros.map(o => <Enlace key={o.id} onClick={() => onCampo(o.id)} className={verOtros ? undefined : 'max-sm:hidden'}>{o.nombre} · {o.listos} de {o.total}</Enlace>)}
        </p>
      )}
      <ListaPartes partes={partes} actual="estado" onIr={onParte} />
    </>
  )
}

function Editor({ pestana, partes, modo, setModo, pasoFilosofia, setPasoFilosofia, onPestana }: {
  pestana: Parte; partes: Pestana[]; modo: 'vigente' | 'plan'; setModo: (m: 'vigente' | 'plan') => void
  pasoFilosofia: PasoFilosofia; setPasoFilosofia: (p: PasoFilosofia) => void; onPestana: (p: Parte, paso?: PasoFilosofia) => void
}) {
  const campo = useCampo(); const rol = useRol(); const persona = usePersona(); const ctx = useCtx()
  const campos = useCampos()
  const campoId = useApp(s => s.campoId), versiones = useVersiones(), firmarConfig = useApp(s => s.firmarConfig), setPantalla = useApp(s => s.setPantalla)
  const setCampo = useApp(s => s.setCampo)
  const puedeMetas = rol.puede['metas:firmar'], puedeTecnica = rol.puede['config:firmar']
  const desdeMin = `${diaIso(AHORA).slice(0, 8)}01`
  const [borrador, setBorrador] = useState<Config>(() => structuredClone(ctx.config))
  // La versión sobre la que se abrió el borrador: va con la firma, y si
  // mientras tanto alguien firmó otra, el store lo rechaza (el 409 del contrato).
  const [versionBase, setVersionBase] = useState(() => versiones.at(-1)!.version)
  const [ediciones, setEdiciones] = useState<Record<string, EdicionMeta>>({})
  const [desde, setDesde] = useState(() => diaCo(AHORA.getTime()))
  const [motivo, setMotivo] = useState('')
  // Ids de la caja de la fecha y del motivo, y de sus errores: el lector oye por qué una caja está mal.
  const idBase = useId(), idFechaMala = `${idBase}-fecha`, idMotivo = `${idBase}-motivo`, idMensaje = `${idBase}-mensaje`
  const [mensaje, setMensaje] = useState<string | null>(null)
  const potencial = usePotencialReciente(campos.map(c => c.id))
  // La última lectura de cada tanque del campo: sin lectura es un hueco, no un nivel supuesto.
  const { niveles } = useCampoAhora(campoId)
  // Lo que se firmaría: el borrador con lo editado puesto como tramos desde el día escogido.
  // El plan mes a mes: lo editado por campo y mes («campo|AAAA-MM»), cada uno un tramo desde su día 1.
  const [plan, setPlan] = useState<Record<string, EdicionMeta>>({})
  const mesActual = desdeMin.slice(0, 7)
  // La filosofía operacional: lo contestado por campo y equipo, sobre la topología que regía.
  const [topologia, setTopologia] = useState<Record<string, TopologiaEnBorrador>>({})
  const conVigente = useMemo(() => Object.entries(ediciones).reduce((c, [id, e]) => conTramo(c, id, { desde, ...e }), borrador), [borrador, ediciones, desde])
  const conPlan = useMemo(() => Object.entries(plan).reduce((c, [k, e]) => {
    const [id, mes] = k.split('|') as [string, string]
    return conMes(c, id, { desde: `${mes}-01`, ...e })
  }, conVigente), [conVigente, plan])
  const propuesta = useMemo(() => conTopologia(conPlan, topologia), [conPlan, topologia])
  /** Las capacidades de un campo en el borrador (U2 §8.4); undefined quita las firmadas (rigen las del demo). */
  const cambiarCapacidades = (id: string, c: CapacidadesCampo | undefined) => cambiar(cfg => {
    const todas = [...(cfg.capacidades ?? []).filter(x => x.campoId !== id), ...(c ? [c] : [])]
    if (todas.length) cfg.capacidades = todas
    else delete cfg.capacidades
  })
  /** Lo contestado de uno o varios equipos de un campo; null quita lo contestado. */
  const responderTopologia = (id: string, vigente: TopologiaVigente, cambios: Record<string, RespuestaEquipo | null>) => {
    setTopologia(x => {
      const ya = x[id] ?? { base: vigente.elementos, firmada: vigente.firmada, respuestas: {} }
      const respuestas = { ...ya.respuestas }
      for (const [k, r] of Object.entries(cambios)) { if (r) respuestas[k] = r; else delete respuestas[k] }
      return { ...x, [id]: { ...ya, respuestas } }
    })
    setMensaje(null)
  }
  // TRIM propone, pero no firma nada solo (U2 §8.3): un campo que estrena su
  // topología la firma entera, así que cada equipo tiene que tener respuesta (la regla es del motor).
  const faltanTopologia = faltanParaFirmar(topologia)
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
  // Lo que no deja firmar: las reglas de la configuración (las mismas del servidor) y lo que falta contestar de la topología.
  const validacion = validarConfig(propuesta, ctx.config, desdeMin, AHORA.getTime())
  // Las capacidades que cambian pasan por la revisión de la firma (U2 §8.4), la misma del servidor.
  const bloqueanCapacidades = useMemo(() => capacidadesQueBloquean(ctx.config, propuesta, ctx, versiones), [ctx, propuesta, versiones])
  const errores = [...validacion, ...(validacion.length ? [] : bloqueanCapacidades), ...faltanTopologia]
  const cfgCampo = borrador.campos[campoId]
  const firmaVisible = pestana === 'metas' ? puedeMetas : puedeTecnica

  const cambiar = (f: (c: Config) => void) => { setBorrador(b => { const n = structuredClone(b); f(n); return n }); setMensaje(null) }
  const descartar = () => { setBorrador(structuredClone(ctx.config)); setVersionBase(versiones.at(-1)!.version); setEdiciones({}); setPlan({}); setTopologia({}); setDesde(diaCo(AHORA.getTime())); setMensaje(null) }
  const firmar = async () => {
    // La filosofía operacional cambia dónde se trabó cada parada: sin motivo no hay cómo auditarla después.
    // (La misma regla del servidor; aquí con palabras de la topología y no de las metas.)
    if (pestana === 'filosofia' && !alcanza(motivo, MOTIVO_MINIMO)) {
      setMensaje('Falta el motivo: diga por qué cambia la filosofía operacional. Queda en el historial de versiones, con su firma.')
      document.getElementById(idMotivo)?.focus()
      return
    }
    // Quién firma no lo manda la pantalla: lo pone el store (en producción, el token).
    const r = await firmarConfig(propuesta, motivo, versionBase)
    if (r.ok) setVersionBase(r.version)
    setMensaje(r.ok ? null : r.error)
    // Sin motivo, el foco va a su caja (como en Accesos): el error se oye al llegar.
    if (!r.ok && !alcanza(motivo, MOTIVO_MINIMO)) document.getElementById(idMotivo)?.focus()
  }

  // El estado del campo (P-04): lo arma el motor con lo firmado y lo contestado en el borrador.
  if (pestana === 'estado') {
    const estado = estadoConfiguracion(campoId, ctx, topologia)
    const otros = campos.filter(c => c.id !== campoId).map(c => { const e = estadoConfiguracion(c.id, ctx, topologia); return { id: c.id, nombre: c.nombre, listos: e.listos, total: e.total } })
    const irPaso = (p: PasoConfiguracion) => { const d = DONDE_PASO[p]; onPestana(partes.includes(d.parte) ? d.parte : 'tecnica', d.paso) }
    return (
      <EstadoDelCampo estado={estado} otros={otros} partes={partes} cambios={{ n: cambios.length, parte: grupos.tecnica.length ? 'tecnica' : 'metas' }}
        onPaso={irPaso} onParte={p => onPestana(p)} onCampo={setCampo} />
    )
  }

  if (pestana === 'accesos') return <Accesos puede={rol.puede['usuarios:administrar']} />

  const firma = (
    <Panel titulo="Firmar la versión" extra={cambios.length ? `${plural(cambios.length, 'cambio', 'cambios')} en el borrador` : 'sin cambios'}>
      {cambios.length === 0 ? <p className="text-[14px] text-[var(--tinta2)]">No hay nada que firmar.</p> : (
        <>
          {/* La lista la arma el motor (diferenciasPorGrupo): cada cambio con su fecha. */}
          {grupos.metas.length > 0 && <Grupo titulo="Metas, precio y publicación · firma el gerente de activo" lista={grupos.metas} />}
          {grupos.tecnica.length > 0 && <Grupo titulo="Técnica · firma el administrador" lista={grupos.tecnica} />}
        </>
      )}
      {errores.length > 0 && (
        <div role="alert" className="mb-2 rounded border-2 border-[var(--tinta)] px-2.5 py-1.5">
          <p className="text-[15px] font-semibold">Corrija antes de firmar</p>
          <ul className="list-disc pl-4 text-[14px] text-[var(--tinta)]">{errores.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {cambios.length > 0 && (puedeMetas || puedeTecnica) && persona.sinAcceso && (
        <Hueco>
          <span className="flex flex-wrap items-center gap-x-1">
            Nadie con acceso activo tiene este rol.
            <Info titulo="No hay quién firme" texto="Firma una persona con acceso, no un rol. Los accesos los da el gerente de activo." />
          </span>
        </Hueco>
      )}
      {cambios.length > 0 && (puedeMetas || puedeTecnica) && !persona.sinAcceso && (
        <form className="grid gap-1.5" onSubmit={e => { e.preventDefault(); void firmar() }}>
          <label className="grid gap-0.5">
            <span className="text-[13px] text-[var(--tinta2)]">Motivo · obligatorio</span>
            <input id={idMotivo} value={motivo} onChange={e => { setMotivo(e.target.value); setMensaje(null) }} className={campoInput}
              aria-invalid={!!mensaje && !alcanza(motivo, MOTIVO_MINIMO)} aria-describedby={mensaje ? idMensaje : undefined}
              placeholder={pestana === 'filosofia' ? 'Ej.: topología revisada en campo con el jefe de planta'
                : Object.keys(plan).length ? 'Ej.: presupuesto 2027 aprobado por la junta' : grupos.metas.length ? 'Ej.: metas acordadas en el comité de producción de octubre' : 'Ej.: nuevo certificado de aforo del tanque'} />
          </label>
          {mensaje && <p id={idMensaje} className="text-[14px] text-[var(--tinta)]" role="alert">{mensaje}</p>}
          <span className="flex flex-wrap gap-1.5">
            <Boton variante="principal" type="submit" disabled={errores.length > 0}><PenLine className="mr-1 inline size-3.5" />Firmar como {persona.nombre}</Boton>
            <Boton type="button" onClick={descartar}>Descartar</Boton>
          </span>
        </form>
      )}
    </Panel>
  )

  const historial = <Historial versiones={versiones} />

  if (pestana === 'filosofia') return (
    <FilosofiaOperacional campoId={campoId} topologia={topologia} onResponder={responderTopologia} propuesta={propuesta}
      onCapacidades={cambiarCapacidades} puede={puedeTecnica} cambios={cambios.length} firma={firmaVisible && firma} historial={historial}
      paso={pasoFilosofia} onPaso={setPasoFilosofia} onTecnica={() => onPestana('tecnica')} />
  )

  const selectorModo = (
    // Es un modo de la misma pestaña, no otra pestaña: botones que dicen cuál está puesto.
    <div role="group" aria-label="Cómo se fijan las metas" className="flex flex-wrap items-center gap-1">
      {([['vigente', 'Meta vigente'], ['plan', 'Plan mes a mes']] as const).map(([m, t]) => (
        <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)}
          className={cn('cursor-pointer rounded-full border px-3 py-1 text-[14px]',
            modo === m ? 'border-[var(--primario)] bg-[var(--primario)] font-semibold text-[var(--primario-sobre)]' : 'border-[var(--linea2)] text-[var(--tinta2)] hover:bg-[var(--panel2)]')}>
          {t}
        </button>
      ))}
      <Info className="ml-1" titulo="Dos formas de fijar la meta"
        texto="Meta vigente: una cifra por campo, desde el día que se escoja. Plan mes a mes: una cifra por mes, cargada del presupuesto." />
    </div>
  )

  // Quien no firma ve lo que rige, sin poder cambiarlo: lo dice una vez, arriba.
  const soloLectura = !puedeMetas && (
    <div><Hueco><Lock className="mr-1 inline size-3.5" />Solo lectura: los fija y firma el gerente de activo.</Hueco></div>
  )

  if (pestana === 'metas' && modo === 'plan') return (
    <>
      {soloLectura}
      {selectorModo}
      <PlanMensual propuesta={propuesta} campos={campos} campoInicial={campoId} mesActual={mesActual} puede={puedeMetas}
        valor={valorMes} propio={propioMes} onEditar={editarMes} onCargar={cargarPlan} />
      {firmaVisible && firma}
      {historial}
    </>
  )

  if (pestana === 'metas') return (
    <>
      {soloLectura}
      {selectorModo}
      {puedeMetas && (
        <Panel titulo="Desde cuándo rige">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
            <label className="flex items-center gap-2">
              <span>Desde el</span>
              <input type="date" value={desde} min={desdeMin} onChange={e => { if (e.target.value) { setDesde(e.target.value); setMensaje(null) } }}
                aria-label="Día desde el que rigen los cambios"
                aria-invalid={desde < desdeMin} aria-describedby={desde < desdeMin ? idFechaMala : undefined}
                className="rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[4px] text-[14px] outline-none focus:border-acento" />
            </label>
            <b>{fechaDia(desde)}</b>
            {/* Lo que pasa con el día escogido: los días ya corridos se vuelven a medir con lo nuevo. */}
            {desde >= desdeMin && (
              <span className="text-[13px] text-[var(--tinta2)]">
                {desde <= hoy
                  ? <>Incluye {diasEntre(desde, hoy) + 1} {diasEntre(desde, hoy) === 0 ? 'día ya corrido (hoy)' : 'días ya corridos'}</>
                  : <>Empieza en {diasEntre(hoy, desde)} {diasEntre(hoy, desde) === 1 ? 'día' : 'días'}</>}
              </span>
            )}
            <Info titulo="Desde cuándo rige"
              texto={`${desde < desdeMin ? '' : desde <= hoy ? 'Lo que va del mes se medirá con lo nuevo. ' : 'Hasta entonces rige lo que está firmado. '}Una sola fecha para toda la firma. No puede ser antes del ${fechaDia(desdeMin)}: lo de un mes cerrado no se reescribe.`} />
            {desde < desdeMin && <b id={idFechaMala} role="alert" className="basis-full text-[13px]">Esa fecha es de un mes cerrado: escoja el {fechaDia(desdeMin)} o después.</b>}
          </div>
        </Panel>
      )}
      <div>
        <MetasCampos vigente={ctx.config} propuesta={propuesta} campos={campos} desde={desde}
          puede={puedeMetas} potencial={potencial} valor={valor} base={base}
          onEditar={editar} />
      </div>
      <Panel titulo="Precio y publicación" extra={puedeMetas ? `desde el ${fechaDia(desde)}` : 'vigentes hoy'}>
        <Lectura>
          El precio neto pasa barriles a dinero; sin él, ese campo no muestra dinero. La regla para publicar
          dice cuánto puede quedar sin causa identificada para cerrar el libro del mes. Los dos llevan fecha,
          como las metas: cambiarlos no toca los meses cerrados.
        </Lectura>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(76px,108px)_minmax(76px,108px)] items-end gap-x-2 border-b border-[var(--linea)] pb-1 text-[12px] text-[var(--tinta3)]">
          <span>Campo</span><span className="text-right">Precio neto, USD/bbl</span><span className="text-right">Máx. % sin causa</span>
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
                <b className="block break-words text-[14px]" data-nombre-campo>{c.nombre}</b>
                {cambiado && <small className="block text-[12px] text-[var(--tinta3)]">antes {sinMeta ? SIN_META : <>{b.netbackUsd ?? 'sin precio'}{b.netbackUsd !== undefined ? ' USD/bbl' : ''} · {b.criterioSinCausa} %</>}</small>}
                {!cambiado && sinMeta && <small className="block text-[12px] text-[var(--tinta3)]">{SIN_META}</small>}
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
      {historial}
    </>
  )

  return (
    <>
      {!puedeTecnica && (
        <div><Hueco><Lock className="mr-1 inline size-3.5" />Solo lectura: lo prepara y lo firma el administrador de la implementación.</Hueco></div>
      )}
      {/* Lo que la pestaña reúne y quién es dueño de qué: lo dicen los paneles de abajo
          y la pestaña de metas; aquí queda para quien lo pida con «¿cómo se lee?». */}
      <div className="empty:hidden">
        <Lectura>
          Aquí va el perfil del campo, los tanques, el respaldo de las bombas, el programa de paradas y el
          membrete de los informes. Las metas y los accesos son del gerente de activo; producción, diferido,
          causas y salud salen de los equipos. Los cambios quedan en un borrador hasta que se firman con un
          motivo. Cada firma es una versión nueva: así nadie puede mover una regla después de ver el resultado
          sin que quede escrito. Los tanques de agua dan el colchón antes de cerrar pozos; el respaldo de las
          bombas cambia ese colchón y el orden de cierre.
        </Lectura>
      </div>

      <PerfilDelCampo campoId={campoId} perfil={perfilDe(borrador, campoId)} puede={puedeTecnica}
        onCambio={p => cambiar(c => { c.campos[campoId]!.perfil = { ...perfilDe(c, campoId), ...p } })} />

      <Panel titulo="Membrete del informe" extra="todos los campos">
        <Texto rotulo="Nombre de la empresa" valor={borrador.empresa} disabled={!puedeTecnica}
          onCambio={v => cambiar(c => { c.empresa = v })} />
      </Panel>

      <div className="grid items-start gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        <Panel titulo="Tanques de agua">
          {borrador.tanques.filter(t => t.campoId === campoId).map(t => (
            <div key={t.id} className="mb-2 border-b border-[var(--linea2)] pb-2 last:mb-0 last:border-0">
              <b className="block text-[14px]">{t.nombre}</b>
              <small className="block text-[13px] text-[var(--tinta2)]">{t.id} · lo vacía {t.bomba} · nivel ahora {(nv => (nv ? `${n1(nv.pct)} %` : 'sin lectura'))(Object.hasOwn(niveles, t.id) ? niveles[t.id] : undefined)}</small>
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
          {!borrador.tanques.some(t => t.campoId === campoId) && (
            <p className="flex flex-wrap items-center gap-x-1 text-[14px] text-[var(--tinta2)]">
              Sin tanque de agua configurado.
              <Info titulo="Sin tanque de agua" texto={`${campo.nombre} no tiene tanque de agua configurado: su bomba no cierra pozos por nivel.`} />
            </p>
          )}
        </Panel>

        <Panel titulo="Respaldo de bombas">
          {!pedirPerfilesBomba(campoId).length && (
            // «con perfil»: Perfil del campo también cuenta las bombas registradas sin perfil; sin esa palabra, la pantalla se contradice.
            <p className="text-[14px] text-[var(--tinta2)]">Ninguna bomba con perfil: no hay respaldo que declarar.</p>
          )}
          {pedirPerfilesBomba(campoId).map(p => {
            const id = p.equipo
            const r = borrador.respaldos.find(x => x.campoId === campoId && x.equipo === id)
            return (
              <div key={id} className="mb-2 border-b border-[var(--linea2)] pb-2 last:mb-0 last:border-0">
                <b className="block text-[14px]">{pedirRegistroDeEquipos(campoId).find(e => e.id === id)?.nombre ?? id}</b>
                <small className="block text-[13px] text-[var(--tinta3)]">{id} · {PAPEL_NOMBRE[p.papel]} · capacidad {n0(p.capacidadBpd)} bbl/d{p.pozos ? ` · pozos ${p.pozos.join(', ')}` : ''}</small>
                <div className="mt-1.5 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                  <Numero rotulo="Capacidad libre" sufijo="bbl/d" valor={r?.libreBpd ?? 0} paso={100} min={0} max={p.capacidadBpd * 2} disabled={!puedeTecnica}
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

      <div><Programa borrador={borrador} campoId={campoId} puede={puedeTecnica} onCambio={cambiar} /></div>

      {firmaVisible && firma}

      <div className="grid items-start gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        {historial}
        <Fuentes campoId={campoId} niveles={borrador.tanques.filter(t => t.campoId === campoId).map(t => `${t.id} · ${t.tagNivel}`)}
          onConectores={rol.pantallas.includes('conectores') ? () => setPantalla('conectores') : undefined} />
      </div>

      <details className="group">
        <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-x-2 rounded-[20px] bg-[var(--panel)] px-4 py-3 text-[15px] hover:bg-[var(--panel2)] sm:px-6">
          <b className="flex-1">Esquema de planta</b>
          {/* Con el modelo choke el esquema sí cambia algo: de él sale a qué pozos sirve cada equipo (U2 §8.5 y §12, punto 7). */}
          <span className="text-[13px] text-[var(--tinta3)]">de él TRIM deduce a qué pozos sirve cada equipo</span>
          <span aria-hidden className="text-[13px] text-[var(--tinta2)] group-open:rotate-180">▾</span>
        </summary>
        <div className="mt-3 grid gap-3 sm:gap-4"><Esquema puede={rol.puede['conector:configurar']} conGas={perfilDe(borrador, campoId).gas !== 'no'} /></div>
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
  const queda = 'No saldrán sus avisos ni sus predicciones; lo que dejen de producir se sigue contando en el libro.'
  const vacia = 'La subpantalla saldrá vacía hasta que se registren.'
  // Lo que pasa si se firma así: el hecho a la vista y su consecuencia en el ⓘ (y en el papel).
  const avisos = ([
    perfil.gas === 'no' && enGas > 0 && [`${plural(enGas, 'elemento', 'elementos')} del tren de gas no se ${enGas === 1 ? 'dibuja' : 'dibujan'}`, 'El esquema los tiene, pero no se dibujan mientras el campo diga que no tiene gas.'],
    perfil.gas !== 'no' && enGas === 0 && ['Sin elementos en el tren de gas del esquema', 'Regístrelos en «Esquema de planta», al final de esta pestaña.'],
    !perfil.electrosumergibles && esp > 0 && [`${esp === 1 ? 'El pozo con electrosumergible deja' : `Los ${n0(esp)} pozos con electrosumergible dejan`} de vigilarse`, queda],
    perfil.electrosumergibles && esp === 0 && ['No hay pozos con electrosumergible registrados', vacia],
    !perfil.bombas && bombas > 0 && [`${idsBombas.join(', ')} ${bombas === 1 ? 'deja' : 'dejan'} de vigilarse`, queda],
    perfil.bombas && bombas === 0 && ['No hay bombas de la línea registradas', vacia],
  ] as Array<false | [string, string]>).filter((x): x is [string, string] => !!x)
  const casilla = (k: 'bombas' | 'electrosumergibles', rotulo: string, cuantos: string) => (
    <label className="flex items-start gap-2 py-1 text-[14px]">
      <input type="checkbox" className="mt-0.5" checked={perfil[k]} disabled={!puede} onChange={e => onCambio({ [k]: e.target.checked })} />
      <span>{rotulo}<small className="block text-[13px] text-[var(--tinta3)]">{cuantos}</small></span>
    </label>
  )
  return (
    <Panel titulo="Perfil del campo">
      <Lectura>
        Cada campo es distinto: uno sin gas no tiene tren de gas, uno de bombeo mecánico no tiene
        electrosumergibles. Lo que se marque aquí decide lo que se dibuja en Planta y las subpantallas
        de «Pozos y equipos». Al lado de cada casilla va lo que el registro del campo tiene. Las bombas
        de la línea son las de reinyección, transferencia y multifásicas.
      </Lectura>
      <div className="grid max-w-[340px] gap-0.5">
        <label className="grid gap-0.5">
          <span className="text-[13px] text-[var(--tinta2)]">Destino principal del gas</span>
          <select value={perfil.gas} disabled={!puede} onChange={e => onCambio({ gas: e.target.value as DestinoGas })} className={campoInput}>
            {(Object.keys(NOMBRE_GAS) as DestinoGas[]).map(g => <option key={g} value={g}>{NOMBRE_GAS[g][0]!.toUpperCase() + NOMBRE_GAS[g].slice(1)}</option>)}
          </select>
        </label>
        {/* Fuera de la etiqueta: el ⓘ no entra en el nombre de la lista. */}
        <small className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta3)]">
          {enGas ? `${plural(enGas, 'elemento', 'elementos')} en el tren de gas` : 'sin elementos en el tren de gas'}
          <Info titulo="Gas" texto="El tren de gas es el del esquema de planta. El gas no se mide en esta fase." />
        </small>
      </div>
      <div className="mt-2 grid gap-x-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
        {casilla('bombas', 'Bombas de la línea', plural(bombas, 'bomba registrada', 'bombas registradas'))}
        {casilla('electrosumergibles', 'Electrosumergibles', plural(esp, 'pozo registrado', 'pozos registrados'))}
      </div>
      {avisos.length > 0 && (
        <ul className="mt-2 grid gap-1 text-[14px] text-[var(--tinta)]">
          {avisos.map(([a, porque]) => (
            <li key={a} className="flex items-start gap-1.5"><FueraDeMeta si tamano={11} /><span>{a}<Info className="ml-1" titulo="Qué pasa" texto={porque} /></span></li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function Grupo({ titulo, lista }: { titulo: string; lista: string[] }) {
  return (
    <div className="mb-2">
      <p className="mb-0.5 text-[14px] font-semibold text-[var(--tinta2)]">{titulo}</p>
      <ul className="list-disc pl-4 text-[14px] text-[var(--tinta2)]">{lista.map(c => <li key={c}>{c}</li>)}</ul>
    </div>
  )
}

/** Las versiones firmadas, la vigente primero: cinco a la vista y «ver N más».
 *  En el papel salen todas (el informe es la pantalla impresa). */
function Historial({ versiones }: { versiones: ReturnType<typeof useVersiones> }) {
  const lista = [...versiones].reverse()
  const corta = useVerMas(lista)
  const fila = (v: typeof lista[number]) => (
    <div key={v.version} className="border-b border-[var(--linea2)] py-2 text-[14px] last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <b>Versión {v.version}</b>{v === lista[0] && <Chip tono="fuerte">vigente</Chip>}
        <span className="text-[13px] text-[var(--tinta3)]">{fechaHora(new Date(v.fecha))} · {v.por}</span>
      </div>
      <p className="text-[var(--tinta2)]">«{v.motivo}»</p>
      <ul className="list-disc pl-4 text-[13px] text-[var(--tinta3)]">{v.cambios.map(c => <li key={c}>{c}</li>)}</ul>
    </div>
  )
  return (
    <Panel titulo="Versiones firmadas" extra={`${versiones.length}`}>
      {corta.visibles.map(fila)}
      {corta.resto.length > 0 && <div className="solo-impresion">{corta.resto.map(fila)}</div>}
      <VerMas ocultas={corta.ocultas} abierto={corta.abierto} onAlternar={corta.alternar} />
    </Panel>
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
  // Cinco a la vista y «ver N más»; en el papel salen todas. Las que no han empezado
  // (las que todavía se pueden quitar, también las recién agregadas) nunca se esconden.
  const corta = useVerMas(lista, { prioridad: p => (empezo(p) ? 2 : 1) })
  const fila = (p: ParadaProgramada) => (
    <div key={p.id} className="flex items-start gap-2 border-b border-[var(--linea2)] py-1.5 text-[14px] last:border-0">
      <span className="min-w-0 flex-1"><b>{p.equipo}</b> <span className="text-[13px] text-[var(--tinta3)]">{fechaHora(new Date(p.desde))} a {fechaHora(new Date(p.hasta))}</span>
        <small className="block text-[13px] text-[var(--tinta2)]">{p.motivo}</small></span>
      {puede && (
        <button onClick={() => onCambio(c => { c.programa = c.programa.filter(x => x.id !== p.id) })} aria-label={`Quitar la parada de ${p.equipo}${empezo(p) ? ': ya empezó, no se puede quitar del programa' : ''}`}
          disabled={empezo(p)} title={empezo(p) ? 'Ya empezó: no se puede quitar del programa' : undefined}
          className="no-imprimir cursor-pointer rounded border border-[var(--linea2)] p-1 text-[var(--tinta3)] hover:border-[var(--tinta)] hover:text-[var(--tinta)] disabled:cursor-not-allowed disabled:opacity-35">
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  )
  return (
    <Panel titulo="Paradas programadas" extra={`${lista.length}`}>
      <Lectura>Es el programa de paradas aprobado. Una parada que esté aquí cuenta como programada, no como falla. Por eso se aprueba con firma y antes de que empiece: una falla no se puede volver programada después, ni una parada programada quitarse cuando ya pasó.</Lectura>
      {corta.visibles.map(fila)}
      {corta.resto.length > 0 && <div className="solo-impresion">{corta.resto.map(fila)}</div>}
      <VerMas ocultas={corta.ocultas} abierto={corta.abierto} onAlternar={corta.alternar} />
      {puede && (
        <div className="mt-2 grid gap-1.5 border-t border-[var(--linea2)] pt-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))]">
          <label className="grid gap-0.5"><span className="text-[13px] text-[var(--tinta2)]">Equipo</span>
            <select value={nuevo.equipo} onChange={e => setNuevo(n => ({ ...n, equipo: e.target.value }))} className={campoInput}>
              {opciones.map(o => <option key={o} value={o}>{o}</option>)}
            </select></label>
          <label className="grid min-w-0 gap-0.5"><span className="text-[13px] text-[var(--tinta2)]">Desde</span>
            <input type="datetime-local" value={nuevo.desde} min={ahoraLocal} onChange={e => setNuevo(n => ({ ...n, desde: e.target.value }))} className={cn(campoInput, 'min-w-0')} /></label>
          <label className="grid min-w-0 gap-0.5"><span className="text-[13px] text-[var(--tinta2)]">Hasta</span>
            <input type="datetime-local" value={nuevo.hasta} min={nuevo.desde || ahoraLocal} onChange={e => setNuevo(n => ({ ...n, hasta: e.target.value }))} className={cn(campoInput, 'min-w-0')} /></label>
          <label className="grid gap-0.5 [grid-column:1/-1]"><span className="text-[13px] text-[var(--tinta2)]">Motivo</span>
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
    ['Producción', `${origen?.fuente ?? 'sin punto de medición'} · corte de agua: ${origen?.bsw ?? '—'}`],
    ['Estado de pozos', `${cuenta(p => p.levantamiento === 'electrosumergible')} variadores · ${cuenta(p => p.levantamiento === 'bombeo-mecanico')} controladores de bombeo · ${cuenta(p => p.levantamiento === 'flujo-natural')} válvulas de cabeza`],
    ['Pruebas de pozo', `${cuenta(p => p.origen === 'instrumento')} con separador · ${cuenta(p => p.origen === 'estimado')} estimadas desde la electrosumergible · ${cuenta(p => !p.pruebas.length)} sin prueba`],
    ['Nivel de tanques', niveles.join(' · ') || 'sin tanque de agua'],
    ['Paradas de bombas', 'PLC · primera alarma (first-out)'],
    ...(conEsp ? [['Límites de electrosumergibles', 'Protecciones del variador de cada pozo'] as [string, string]] : []),
    ['Banda de asignación', textoBanda(medicion)],
  ]
  return (
    <Panel titulo="No se configura" extra="sale de los equipos">
      <Lectura>Esto no se escribe en ningún formulario: lo entrega cada equipo con su tag. Si una fuente falta, la pantalla lo dice como hueco de custodia.</Lectura>
      {filas.map(([k, v]) => (
        <div key={k} className={cn('grid grid-cols-[minmax(0,150px)_1fr] gap-3 border-b border-[var(--linea2)] py-1.5 text-[14px] last:border-0')}>
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
      <span className="text-[13px] text-[var(--tinta2)]">{rotulo}</span>
      <span className="flex items-center gap-1.5">
        <input type="number" step={paso} min={min} max={max} disabled={disabled} value={valor === undefined || Number.isNaN(valor) ? '' : valor}
          placeholder={vacio ? 'sin configurar' : undefined}
          aria-invalid={malo} onChange={e => onCambio(e.target.value === '' ? NaN : Number(e.target.value))} className={cn(campoInput, 'tabular max-w-[140px]', malo && cajaMala)} />
        <span className="text-[13px] text-[var(--tinta3)]">{sufijo}</span>
      </span>
      {ayuda && <small className="text-[12px] leading-snug text-[var(--tinta3)]">{ayuda}</small>}
    </label>
  )
}

function Texto({ rotulo, valor, disabled, onCambio }: { rotulo: string; valor: string; disabled?: boolean; onCambio: (v: string) => void }) {
  return (
    <label className="mt-1.5 grid gap-0.5">
      <span className="text-[13px] text-[var(--tinta2)]">{rotulo}</span>
      <input value={valor} disabled={disabled} onChange={e => onCambio(e.target.value)} className={campoInput} />
    </label>
  )
}
