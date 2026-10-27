import { useState } from 'react'
import { useApp, usePersona, useRango, useRol } from '@/app/store'
import type { VistaPlantaViva } from '@/shared/api/plantaViva'
import { useHoy, type TareaHoy } from '@/shared/api/hoy'
import { PASOS, ETIQUETA_IMPACTO, ETIQUETA_PLANEACION, textoN1, textoN2, type ClaveN1, type CodigoN2, type Impacto, type Planeacion } from '@/shared/api/arbol'
import { NOMBRE_TRAMO_BALANCE } from '@/shared/api/balance'
import { deshacerAnh } from '@/shared/api/escrituras'
import type { ChokeAnh } from '@/entities/choke'
import { Cifra, Marca } from '@/shared/ui/scada'
import { Boton, Enlace } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { useTelefono } from '@/shared/ui/telefono'
import { n0, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Balance } from '@/widgets/choke/Balance'
import { RegistrarPerdida } from '@/widgets/choke/RegistrarPerdida'
import { Funcionando } from '@/widgets/resultados/Funcionando'
import { HojaTramo } from '@/widgets/plantaviva/HojaTramo'
import { TuberiaKit, type TramoKit } from '@/widgets/plantaviva/TuberiaKit'
import { condicionDe } from '@/widgets/plantaviva/condicion'
import { useAcciones } from '@/widgets/plantaviva/acciones'

/** EL INICIO DE PRODUCCIÓN (necesario-por-rol §2 y §14; imagen d1-grafito-prod).
 *
 *  - El número ES el choke: los bbl/d que salen hoy contra lo que dan los pozos, con el tramo
 *    que limita, y la tubería del campo una sola vez (Pozos → Planta → Salida, con el kit).
 *  - Las paradas por confirmar antes de las 07:00, cada grupo con su cadena (tramo, diferida o
 *    pérdida, planeada, causa) y «Confirmar las N» en 1 toque, con Deshacer. Las que esperan su
 *    causa se dicen aparte: no se pueden confirmar todavía. «Ver una por una», a un toque.
 *  - El balance producido · diferido · perdido con su trazabilidad; «¿Está funcionando?».
 *  - El primero de «Si falla hoy».
 *  - A fin de mes: la asignación oficial (sale cuando vence) y la medición y el factor, a un toque.
 *  - Registrar una pérdida.
 *  El motor calcula (`usePlantaViva` con la lente técnica, `useHoy`, `useBalance`, `useEfectividad`). */
export function InicioProduccion({ v }: { v: VistaPlantaViva }) {
  const telefono = useTelefono(); const rango = useRango(); const rol = useRol()
  const setPantalla = useApp(s => s.setPantalla)
  const { abrir } = useAcciones()
  const [abierto, setAbierto] = useState<ChokeAnh | null>(null)
  const [perdida, setPerdida] = useState(false)
  const hoy = useHoy(rol.id, v.campos)
  const lote = useConfirmarLote()
  const t = v.tecnica, p = v.planta
  if (!t || !p) return null
  const limita = t.tramos.find(x => x.limita)
  const confirmar = hoy.tareas.filter((x): x is Confirmable => x.tipo === 'confirmar' && x.accion?.tipo === 'confirmar')
  const asignacion = hoy.tareas.find(x => x.tipo === 'asignacion')
  const porConfirmar = hoy.porConfirmar?.n ?? 0
  const enLote = new Set(confirmar.flatMap(x => x.accion.ids.map(id => id.split('@')[0]))).size
  const esperan = Math.max(0, porConfirmar - enLote)
  const primero = t.siFallaHoy[0]
  const tramo = abierto ? p.tramos.find(x => x.tramo === abierto) : undefined
  const ir = (s: string) => (rol.pantallas.includes(s) ? () => setPantalla(s) : undefined)
  const puedePerdida = rol.puede['perdidas:registrar']

  const principal = (
    <section aria-label="Salen hoy" data-produccion-cifra={t.cifra.entero} data-valor={t.cifra.valor}
      className={cn('min-w-0 rounded-[10px] bg-[var(--panel)]', telefono ? 'px-4 py-4' : 'px-6 py-5')}>
      <div className={cn(!telefono && 'grid grid-cols-[minmax(0,320px)_1fr] items-start gap-8')}>
        <div className="min-w-0">
          <Cifra rotulo="Salen hoy" valor={t.cifra.entero} unidad={limita?.cabeBpd != null ? `de ${n0(limita.cabeBpd)} bbl/d` : 'bbl/d'} tamano="principal" mayusculas={false}
            // B4 · En el teléfono (necesario-por-rol §14: «Limitan los pozos. Planta: sobran 1.143.»), lo que limita y lo que
            // le sobra a la planta lo dice la tubería de abajo, una vez; la frase entera (y lo que deja pasar el agua), en su ⓘ.
            nota={telefono ? <span data-explica-telefono=""><Info titulo="Lo que limita" texto={t.cifra.explica} rotulo="por qué" /></span> : <span data-explica="">{t.cifra.explica}</span>} />
          <Hecho lote={lote} className="mt-4" />
          {confirmar[0] && <BotonConfirmar t={confirmar[0]} lote={lote} principal className="mt-4" />}
        </div>
        <TuberiaKit className={telefono ? 'mt-4' : ''} telefono={telefono} etiqueta={t.cifra.fraseCorta} onTramo={x => setAbierto(x as ChokeAnh)} tramos={tramosProduccion(v)} />
      </div>
    </section>
  )

  const porConfirmarBloque = (
    <section aria-label="Por confirmar" data-por-confirmar={porConfirmar} className="min-w-0 rounded-[10px] bg-[var(--panel)] px-4 py-4 sm:px-6">
      <Cifra rotulo="Por confirmar" valor={porConfirmar} unidad={porConfirmar === 1 ? 'parada' : 'paradas'} mayusculas={false}
        nota={porConfirmar ? 'antes de las 07:00, para el reporte' : 'todo confirmado para el reporte'} />
      {confirmar.map((x, i) => (
        <div key={x.id} className="mt-3 border-t border-[var(--linea2)] pt-2.5" data-grupo-confirmar={x.accion.pozos.join(',')}>
          <p className="text-[15px] font-semibold text-[var(--tinta)]">{x.accion.pozos.join(', ')}</p>
          <p className="text-[14px] text-[var(--tinta2)]" data-cadena="">{cadenaEnPalabras(x.accion.cadena)}</p>
          {i > 0 && <BotonConfirmar t={x} lote={lote} className="mt-2" />}
        </div>
      ))}
      {esperan > 0 && (
        <p className="mt-3 border-t border-[var(--linea2)] pt-2.5 text-[14px] text-[var(--tinta2)]" data-esperan-causa={esperan}>
          {plural(esperan, 'espera', 'esperan')} la causa: se confirman cuando alguien conteste.
        </p>
      )}
      {ir('causa') && <Enlace onClick={ir('causa')} className="mt-2" data-ver-una-por-una="">Ver una por una</Enlace>}
    </section>
  )

  const siFalla = primero && (
    <section aria-label="Si falla hoy" data-si-falla-hoy={primero.entero ?? ''} className="min-w-0 rounded-[10px] bg-[var(--panel)] px-4 py-4 sm:px-6">
      <Cifra rotulo="Si falla hoy" valor={primero.entero} unidad="bbl/d" mayusculas={false} estado={primero.entero === null ? 'sin-dato' : 'normal'}
        nota={`${primero.equipo}${primero.sinInstrumento ? ' · sin instrumento' : ''}${primero.cuando ? ` · ${primero.cuando}` : ''}`} />
      <Enlace onClick={() => abrir(primero)} className="mt-2">Ver {primero.equipo}</Enlace>
    </section>
  )

  const finDeMes = (
    <section aria-label="Fin de mes" data-fin-de-mes={asignacion ? 'asignacion' : ''} className="min-w-0 rounded-[10px] bg-[var(--panel)] px-4 py-4 sm:px-6">
      <h2 className="text-[16px] font-semibold text-[var(--tinta)]">Fin de mes</h2>
      {asignacion && (
        <div className="mt-2" data-asignacion="">
          <p className="text-[15px] font-semibold text-[var(--tinta)]">{asignacion.titulo}</p>
          {ir('produccion') && <Boton variante="principal" className="mt-2" onClick={ir('produccion')}>Cargarla</Boton>}
        </div>
      )}
      {ir('produccion') && <Enlace onClick={ir('produccion')} className="mt-2" data-medicion="">¿Cuadra? Medición oficial y factor</Enlace>}
    </section>
  )

  const perdidaBoton = puedePerdida && (
    <Boton onClick={() => setPerdida(true)} className="min-h-12 self-start" data-registrar-una-perdida="">Registrar una pérdida</Boton>
  )

  const balance = <Balance q={{ campos: v.campos, desde: rango.desde, hasta: rango.hasta }} />

  return (
    <div data-inicio-produccion={p.campoId} className="flex flex-col gap-3 sm:gap-4">
      {principal}
      {telefono
        ? <>{porConfirmarBloque}{siFalla}{balance}<Funcionando campos={v.campos} />{finDeMes}{perdidaBoton}</>
        : (
          <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-4">{balance}<Funcionando campos={v.campos} /></div>
            <div className="flex min-w-0 flex-col gap-4">{porConfirmarBloque}{siFalla}{finDeMes}{perdidaBoton}</div>
          </div>
        )}
      {/* B-04: el nivel 2 de la planta (el esquema y la tubería del agua), a un toque desde la hoja de su tramo. */}
      {tramo && <HojaTramo planta={p} tramo={tramo} momento="durante" periodo={v.periodo} telefono={telefono} onCerrar={() => setAbierto(null)}
        acciones={tramo.tramo === 'planta' && (ir('planta') || ir('agua')) ? <>
          {ir('planta') && <Boton onClick={ir('planta')}>Ver la planta en el esquema</Boton>}
          {ir('agua') && <Boton onClick={ir('agua')}>Ver la tubería del agua</Boton>}
        </> : undefined} />}
      {perdida && <RegistrarPerdida campoId={p.campoId} ahora={v.ahora} onCerrar={() => setPerdida(false)} />}
    </div>
  )
}

/** Pozos → Planta → Salida (imagen prod): lo que dan, lo que cabe y lo que sale hoy, con el que limita. */
function tramosProduccion(v: VistaPlantaViva): TramoKit[] {
  const t = v.tecnica!, p = v.planta!
  return t.tramos.map(x => {
    const vivo = p.tramos.find(y => y.tramo === x.tramo)
    const eq = vivo?.marcado ? vivo.equipos[0] : undefined
    const cond = condicionDe(eq?.prioridad)
    const salida = x.tramo === 'exportacion'
    return {
      tramo: x.tramo, nombre: x.nombre, limita: x.limita, ...(x.fuente ? { fuente: x.fuente } : {}),
      cifra: salida ? n0(p.venta.valor) : x.cabeBpd !== null ? n0(x.cabeBpd) : null,
      palabra: salida ? 'salen hoy' : x.tramo === 'pozo' ? 'dan, bbl/d' : `caben${x.sobraBpd ? ` · sobran ${n0(x.sobraBpd)}` : ''}`,
      nota: [eq ? `${eq.equipo} parada` : '', x.capacidad === 'sin firmar' ? 'capacidad sin firmar' : ''].filter(Boolean).join(' · ') || undefined,
      estado: cond ? 'anormal' : 'normal', condicion: cond,
    }
  })
}

/** La cadena de un grupo en palabras: «Planta · diferida · no planeada · Proceso / Facilidades · Parada estación/bombeo…». */
function cadenaEnPalabras(cadena: string): string {
  const [, choke, impacto, plan, n1, n2] = cadena.split(' · ')
  const seguro = (f: () => string) => { try { return f() } catch { return '' } }
  return [
    choke ? NOMBRE_TRAMO_BALANCE[choke as ChokeAnh] ?? choke : '',
    impacto ? (ETIQUETA_IMPACTO[impacto as Impacto] ?? impacto).toLowerCase() : '',
    plan ? (ETIQUETA_PLANEACION[plan as Planeacion] ?? plan).toLowerCase() : '',
    n1 ? seguro(() => textoN1(n1 as ClaveN1)).replace(/^(No planeada|Planeada) - /, '') : '',
    n2 ? seguro(() => textoN2(n2 as CodigoN2)) : '',
  ].filter(Boolean).join(' · ')
}

type Confirmable = TareaHoy & { accion: { tipo: 'confirmar' } }

/** «Confirmar las 2» (`POST /api/anh/paradas/confirmar`) y, hecho, «Deshacer» con los consecutivos de lo que
 *  subió (D1). Lo hecho vive aquí y no en el botón: al confirmar, la tarea sale de la lista y el «Deshacer» sigue. */
function useConfirmarLote() {
  const confirmarAnh = useApp(s => s.confirmarAnh), rolId = useApp(s => s.rolId)
  const persona = usePersona()
  const [hecho, setHecho] = useState<{ texto: string; deshacer?: () => Promise<void> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const confirmar = async (t: Confirmable) => {
    const c = t.accion
    setOcupado(true); setError(null)
    const r = await confirmarAnh({ ids: c.ids, cadena: c.cadena })
    setOcupado(false)
    if (!r.ok) { setError(r.error); return }
    const ns = [...new Set(r.paradas.flatMap(p => PASOS.map(x => p.clasificacion[x])
      .filter(d => d?.procedencia === 'confirmado' && d.porId === persona.id && (!r.lote || d.lote === r.lote.id) && d.n !== undefined)
      .map(d => d!.n!)))]
    setHecho({
      texto: `Confirmadas ${c.pozos.join(' y ')}`,
      ...(ns.length ? { deshacer: async () => { const x = await deshacerAnh({ rolId }, { ids: c.ids, n: ns }); if (x.ok) setHecho(null); else setError(x.error) } } : {}),
    })
  }
  return { confirmar, hecho, error, ocupado }
}

function BotonConfirmar({ t, lote, principal, className }: { t: Confirmable; lote: ReturnType<typeof useConfirmarLote>; principal?: boolean; className?: string }) {
  return (
    <Boton variante={principal ? 'principal' : 'normal'} onClick={() => void lote.confirmar(t)} disabled={lote.ocupado} data-confirmar-lote={t.accion.pozos.join(',')}
      className={cn(principal && 'min-h-12 px-6 text-[16px]', className)}>
      {t.accion.texto}
    </Boton>
  )
}

function Hecho({ lote, className }: { lote: ReturnType<typeof useConfirmarLote>; className?: string }) {
  if (!lote.hecho && !lote.error) return null
  return (
    <div className={className}>
      {lote.hecho && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 text-[15px] text-[var(--tinta)]" data-confirmadas="">
          <Marca tipo="normal" palabra={lote.hecho.texto} />
          {lote.hecho.deshacer && <button type="button" onClick={() => void lote.hecho!.deshacer!()} className="toque min-h-11 cursor-pointer font-semibold underline underline-offset-4">Deshacer</button>}
        </p>
      )}
      {lote.error && <p role="alert" className="text-[14px] text-[var(--tinta)]">{lote.error}</p>}
    </div>
  )
}
