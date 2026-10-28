import { Historial } from '@/widgets/resultados/Historial'
import { useEffect, useRef, useState } from 'react'
import { useAmbito, useRol, usePersona, useRango } from '@/app/store'
import { useHoy, type TareaHoy, type VistaHoy } from '@/shared/api/hoy'
import { useJornada } from '@/shared/api/balance'
import { Boton } from '@/shared/ui/primitivas'
import { Tarjeta } from '@/widgets/hoy/Tarjeta'
import { Inicio, Bloqueo, Hechas, AvisoDeshacer } from '@/widgets/hoy/piezas'
import { Operador, OrdenDeCierre } from '@/widgets/hoy/Operador'
import { ordenDeCierre } from '@/widgets/hoy/vista'
import { Entrega } from '@/widgets/hoy/Entrega'
import { Cifras } from '@/widgets/hoy/Cifras'
import { MiTurno } from '@/widgets/hoy/MiTurno'
import { Balance } from '@/widgets/choke/Balance'
import { InicioJefe, NoIntervenir } from '@/widgets/hoy/Jefe'
import { LoQueVio, type Vio } from '@/widgets/hoy/LoQueVio'
import { RegistrarPerdida } from '@/widgets/hoy/Perdida'
import { SuOrden } from '@/widgets/sap/CerrarOrden'
import { AvisarSap } from '@/widgets/sap/AvisarSap'
import { useListaEquipos } from '@/shared/api/equiposTecnico'
import { useEnvio, type Envio } from '@/widgets/hoy/envio'
import { useResponder, useConfirmar, useEscribir } from '@/widgets/hoy/acciones'
import { useIr } from '@/widgets/hoy/palabras'
import { Texto } from '@/widgets/hoy/comun'
import { AHORA } from '@/entities/reloj'

const y = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
/** «mañana antes de las 07:00»: la hora límite del reporte, en palabras de campo. */
const antesDe = (limite: string) => {
  const dia = (d: Date) => new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 10)
  const l = new Date(limite), hoy = dia(AHORA), manana = dia(new Date(AHORA.getTime() + 86_400_000))
  return `${dia(l) === hoy ? 'hoy ' : dia(l) === manana ? 'mañana ' : ''}antes de las ${limite.slice(11, 16)}`
}
/** Lo que no arranca y lo que nadie ha contestado, de la vista del motor. */
const noArrancan = (v: VistaHoy) => [...new Set(v.bloqueos.flatMap(b => b.equipos))]
const sinCausa = (v: VistaHoy) => [...new Set(v.tareas.filter(t => t.tipo === 'conseguir-causa').flatMap(t => (t.preguntas ?? []).map(q => q.equipo)))]
/** Las bombas paradas por las que alguien pregunta: a ellas les sale «SAP no lo sabe · Avisar» (FF-5). */
const bombasParadas = (v: VistaHoy) => {
  const vistas = new Map<string, { campoId: string; equipo: string; evento?: string; contexto: string }>()
  for (const q of v.tareas.flatMap(t => t.preguntas ?? [])) if (q.sobre === 'bomba' && q.libro && !vistas.has(q.equipo))
    vistas.set(q.equipo, { campoId: q.campoId, equipo: q.equipo, evento: q.libro.evento, contexto: q.contexto })
  return [...vistas.values()]
}

/** C1 (QA v3) · FF-5 para el supervisor: su Hoy no trae la pregunta de la bomba (la debe quien la abre), así que
 *  «SAP no lo sabe · Avisar» no le salía y tenía que ir a Equipos → la ficha. Le sale por cada bomba PARADA que da
 *  el motor (`GET /vistas/lista-equipos`, `parado`), además de las que tienen pregunta. Un toque, como al jefe. */
function AvisarParadas({ campos, desdePreguntas }: { campos: string[]; desdePreguntas: ReturnType<typeof bombasParadas> }) {
  const lista = useListaEquipos(campos)
  const ya = new Set(desdePreguntas.map(b => b.equipo))
  const paradas = lista.filas.filter(f => f.tipo === 'bomba' && f.parado && !ya.has(f.equipo))
    .map(f => ({ campoId: f.campoId, equipo: f.equipo, contexto: `${f.familia} · ${f.palabra}` }))
  return <>{[...desdePreguntas, ...paradas].map(b => <AvisarSap key={`${b.campoId}|${b.equipo}`} {...b} />)}</>
}

/** El número de orden que nombra una tarjeta de orden del motor («…orden 40012056…» o su id). */
const ordenesDe = (t: TareaHoy) => [...new Set(`${t.id} ${t.titulo} ${(t.porque ?? []).map(x => (typeof x === 'string' ? x : x.b)).join('')}`.match(/\b\d{8}\b/g) ?? [])]

/** Hoy (experiencia v3): un solo lugar para lo que a cada rol le toca, con su número arriba «tipo
 *  número» (necesario-por-rol §14) y el choke en cada parada. Todo lo dice el motor
 *  (`GET /api/vistas/hoy`, `/vistas/jornada`, `/vistas/lista-equipos`…); aquí se pinta.
 *  - sup: «Por confirmar 4», «Mi turno» (las paradas de su jornada con su hora y su cadena),
 *    «Entregar turno» (en pantalla y en PDF) y «Registrar una pérdida»;
 *  - oper: «Pregunta 1 de 4», contestar con un toque, una sola pantalla (`Operador`);
 *  - tec: «5 cosas hoy», la primera pregunta abierta y su orden para cerrar en el teléfono;
 *  - jefe: «1 equipo avisa», las fallas del mes y la espera en 5 tramos (`InicioJefe`).
 *  Contestar o confirmar deja un aviso con «Deshacer». Cuando una tarjeta se va, el foco pasa
 *  a la que quedó en su lugar y no se pierde (A2). */
export function Hoy() {
  const rol = useRol(); const ambito = useAmbito(); const persona = usePersona(); const rango = useRango()
  const ir = useIr()
  const v = useHoy(rol.id, ambito.campos.map(c => c.id))
  const envio = useEnvio(useEscribir(), rol.id)
  const [vio, setVio] = useState<Vio | null>(null)
  const responder = useResponder(envio, setVio)
  const confirmar = useConfirmar(envio)
  const quien = persona.sinAcceso ? undefined : persona.nombre
  const [entrega, setEntrega] = useState(false)

  // Lo que se acaba de hacer no se vuelve a pintar mientras dura su «Deshacer».
  const visible = (t: TareaHoy) => !envio.ocultas.has(t.id) && (!t.preguntas?.length || t.preguntas.some(q => !envio.ocultas.has(q.id)))
  const orden = ordenDeCierre(v)
  const tareas = v.tareas.filter(visible).filter(t => t !== orden
    // A-24 y FF-6: la orden de K-101 no es del supervisor; la del técnico va en «Su orden» (la cierra él); la
    // del jefe, en su número («Ver la orden»).
    && !(t.tipo === 'orden' && (rol.id === 'sup' || rol.id === 'tec' || rol.id === 'jefe'))
    // C-06: «Ojo: no intervenir hoy» va una vez, en el número del jefe.
    && !(rol.id === 'jefe' && t.grupo === 'aviso' && t.ver?.destino.a === 'equipos'))

  // A2: la tarjeta que tenía el foco se fue (se confirmó): el foco va al título de la que quedó en su lugar.
  const lista = useRef<HTMLDivElement>(null)
  const conFoco = useRef(-1)
  useEffect(() => {
    const cont = lista.current
    if (!cont) return
    const marcar = () => { conFoco.current = [...cont.querySelectorAll('[data-tarea]')].findIndex(t => t.contains(document.activeElement)) }
    cont.addEventListener('focusin', marcar)
    return () => cont.removeEventListener('focusin', marcar)
  }, [])
  const ids = tareas.map(t => t.id).join('|')
  useEffect(() => {
    const cont = lista.current, i = conFoco.current
    if (!cont || i < 0) return
    const activo = document.activeElement
    if (activo && activo !== document.body && activo.isConnected) return
    const ts = cont.querySelectorAll<HTMLElement>('[data-tarea]')
    ts[Math.min(i, ts.length - 1)]?.querySelector<HTMLElement>('[data-titulo-tarea]')?.focus()
  }, [ids])

  if (rol.id === 'oper') return (
    <>
      <div data-hoy={rol.id} data-insignia={v.insignia}><Operador v={v} ocultas={envio.ocultas} onResponder={responder} quien={quien} envio={envio} vio={vio} onVio={setVio} /></div>
      <AvisoDeshacer envio={envio} />
    </>
  )

  // FF-2: a quien la debe (el técnico) la primera pregunta le llega abierta.
  const primeraAbierta = rol.id === 'tec' ? tareas.find(t => t.accion?.tipo === 'responder')?.id : undefined
  const corregir = rol.pantallas.includes('causa') ? () => ir({ a: 'paradas' }) : undefined
  const campo = ambito.campos.length === 1 ? ambito.campos[0]!.id : undefined
  const tarjetas = (
    <div ref={lista} className="grid gap-3" data-tareas>
      {tareas.map(t => <Tarjeta key={t.id} t={t} global={ambito.global} ocultas={envio.ocultas} quien={quien}
        abiertaDeEntrada={t.id === primeraAbierta} compacta={rol.id === 'sup' || rol.id === 'jefe'} onConfirmar={confirmar} onResponder={responder} />)}
    </div>
  )
  const avisar = rol.id === 'jefe' ? bombasParadas(v).map(b => <AvisarSap key={b.equipo} {...b} />)
    : rol.id === 'sup' ? <AvisarParadas campos={ambito.campos.map(c => c.id)} desdePreguntas={bombasParadas(v)} /> : null
  const loQueVio = vio && <LoQueVio v={vio} envio={envio} onListo={() => setVio(null)} />

  return (
    <>
      <div data-hoy={rol.id} data-insignia={v.insignia} className="grid max-w-[1280px] content-start items-start gap-3 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] lg:gap-4">
        {/* En el escritorio, el número a la izquierda y lo que le toca a la derecha (d1-grafito-sup). */}
        <div className="grid content-start gap-3 lg:sticky lg:top-0">
        {rol.id === 'sup' ? <InicioSup v={v} envio={envio} entrega={entrega} onEntregar={() => setEntrega(x => !x)} />
          : rol.id === 'tec' ? <InicioTec v={v} />
          : rol.id === 'jefe' ? <InicioJefe v={v} />
          : <>
            {!(v.vacio && !v.inicio.previo) && <Inicio i={v.inicio} />}
            {v.bloqueos.map(b => <Bloqueo key={b.campoId} b={b} subEnInfo />)}
          </>}
        </div>
        <div className="grid min-w-0 content-start gap-3">
        {entrega && v.entrega && <EntregaConJornada v={v} campo={campo} onCerrar={() => setEntrega(false)} />}
        {loQueVio}
        {v.vacio && !tareas.some(t => t.pide) && (
          <section data-vacio className="rounded-[10px] bg-[var(--panel)] px-6 py-5"><p className="text-[18px] font-medium">{v.vacio}</p></section>
        )}
        {tarjetas}
        {rol.id === 'tec' && <SuOrden campos={ambito.campos.map(c => c.id)} onVerEquipo={(c, e) => ir({ a: 'equipo', campoId: c, equipo: e })}
          queHacer={Object.fromEntries(v.tareas.filter(t => t.tipo === 'orden' && t.ver?.destino.a === 'equipo').flatMap(t => ordenesDe(t).map(n => [n, <Texto key={n} f={t.porque} />])))} />}
        {avisar}
        {rol.id === 'jefe' && <NoIntervenir />}
        {orden && (rol.id === 'sup' || rol.id === 'tec') && <OrdenDeCierre t={orden} />}
        {rol.id === 'sup' && campo && <MiTurno campoId={campo} onUnaPorUna={corregir} />}
        {/* 28-oct · El historial del supervisor: sus últimas 14 jornadas, con el diferido por tramo y el perdido aparte. */}
        {rol.id === 'sup' && campo && <Historial campos={[campo]} por="turno" />}
        {/* C1 (QA v3) · El balance del choke del período para el supervisor (CONSTRUCCION.md): «Mi turno» trae lo diferido
            y lo perdido de la jornada; aquí, lo producido, lo diferido y lo perdido del mes, por tramo, con su árbol a un toque. */}
        {rol.id === 'sup' && campo && <Balance q={{ campos: [campo], desde: rango.desde, hasta: rango.hasta }} />}
        <Hechas hs={v.hechas} onCorregir={corregir} />
        </div>
      </div>
      <AvisoDeshacer envio={envio} />
    </>
  )
}

/** El supervisor (§3 y §14): «Por confirmar 4 · antes de las 07:00», lo que se deja de producir,
 *  lo que no arranca y lo que nadie ha contestado; «Entregar turno» fijo arriba (FF-4) y
 *  «Registrar una pérdida». */
function InicioSup({ v, envio, entrega, onEntregar }: { v: VistaHoy; envio: Envio; entrega: boolean; onEntregar: () => void }) {
  const na = noArrancan(v), sc = sinCausa(v)
  const pc = v.porConfirmar
  return (
    <Cifras titulo="Su turno" principal={{ id: 'por-confirmar', rotulo: 'Paradas por confirmar', cifra: pc ? String(pc.n) : '0', detalle: pc ? `el reporte sale ${antesDe(pc.limite)}` : undefined }}
      apoyo={[
        { id: 'ahora', rotulo: 'Ahora', cifra: v.inicio.cifra, unidad: 'bbl/d', detalle: 'se dejan de producir' },
        na.length > 0 && { id: 'no-arrancar', rotulo: 'No arrancar', cifra: String(na.length), detalle: y(na) },
        sc.length > 0 && { id: 'sin-causa', rotulo: 'Sin causa', cifra: String(sc.length), detalle: y(sc) },
      ]}>
      {v.entrega && <Boton onClick={onEntregar} aria-expanded={entrega} className="min-h-12 px-5 text-[16px]" data-entregar-turno>Entregar turno</Boton>}
      <RegistrarPerdida envio={envio} />
    </Cifras>
  )
}

/** El técnico (§8 y §14): «Hoy 5 cosas · primero P-201B», y lo que no arranca. */
function InicioTec({ v }: { v: VistaHoy }) {
  const na = noArrancan(v)
  return (
    <Cifras titulo="Lo de hoy" principal={{ id: 'cosas', rotulo: 'Hoy', cifra: v.inicio.cifra, unidad: Number(v.inicio.cifra) === 1 ? 'cosa' : 'cosas', detalle: v.inicio.remate }}
      apoyo={[na.length > 0 && { id: 'no-arrancar', rotulo: 'No arrancar', cifra: String(na.length), detalle: y(na) }]} />
  )
}

/** «Entregar turno» con la jornada (§0c): lo que paró con su hora de inicio y fin y su cadena. */
function EntregaConJornada({ v, campo, onCerrar }: { v: VistaHoy; campo?: string; onCerrar: () => void }) {
  return campo ? <ConJornada v={v} campo={campo} onCerrar={onCerrar} /> : <Entrega e={v.entrega!} onCerrar={onCerrar} />
}
function ConJornada({ v, campo, onCerrar }: { v: VistaHoy; campo: string; onCerrar: () => void }) {
  const j = useJornada({ campo, jornada: 'actual' })
  return <Entrega e={v.entrega!} jornada={j} onCerrar={onCerrar} />
}

