import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { useApp, useCampo } from '@/app/store'
import { pendientesDe, type TopologiaVigente, type RespuestaEquipo, type TopologiaEnBorrador, type CapacidadesCampo } from '@/shared/api/choke'
import type { Config } from '@/entities/configuracion'
import { Boton, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { TopologiaPaso } from './TopologiaPaso'
import { CapacidadesPaso } from './CapacidadesPaso'
import { ImpactoPaso } from './ImpactoPaso'

/** El ⓘ de la filosofía operacional: qué es el modelo choke (U2 §1.3). Diferido no es pérdida: lo que no se produce «se deja de producir». */
const EXPLICA_MODELO_CHOKE = 'Es un método internacional para ubicar dónde se deja de producir: lo publicó BP en 1996 (artículo SPE-36848), lo usa el regulador británico (NSTA) y la ANH lo adoptó en 2026 (Circulares 003 y 024). No es la válvula choke de la cabeza del pozo (Circular 024, p. 4).'

export type PasoFilosofia = 1 | 2 | 3
const PASOS: ReadonlyArray<[PasoFilosofia, string]> = [[1, 'Equipos y pozos'], [2, 'Capacidades'], [3, 'Ver el impacto y firmar']]

/** En el teléfono, una pregunta por pantalla (U2 §8.7). */
const ANGOSTO = '(max-width: 767px)'
const suscribir = (cb: () => void) => { const m = matchMedia(ANGOSTO); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) }
const esAngosto = () => matchMedia(ANGOSTO).matches

/** «Filosofía operacional» (la palabra de Edinson, transcript [22:34]): cómo
 *  está armado el campo, en tres pasos (U2 §8):
 *   1. Equipos y pozos: una sola pregunta por equipo, «¿A qué pozos sirve?»;
 *      TRIM deduce el tramo y propone lo que ya sabe, con su porqué.
 *   2. Capacidades: lo que deja pasar cada tramo, escrito con su fuente y
 *      revisado con las reglas de la firma (`Config.capacidades`), y el factor
 *      de medición de los pozos, prellenado con lo que propone TRIM (D3).
 *   3. Ver el impacto y firmar: la vista previa y la firma de la versión.
 *  La prepara y la firma el administrador (`config:firmar`); producción y
 *  confiabilidad la leen. Lo contestado y lo escrito viven en el borrador de la
 *  configuración hasta que se firma. */
export function FilosofiaOperacional({ campoId, topologia, onResponder, onCapacidades, propuesta, puede, cambios, firma, historial, paso, onPaso, onTecnica }: {
  campoId: string
  /** La topología del borrador, por campo. */
  topologia: Readonly<Record<string, TopologiaEnBorrador>>
  /** La prepara y la firma quien tiene `config:firmar`; los demás la leen. */
  puede: boolean
  onResponder: (campoId: string, vigente: TopologiaVigente, cambios: Record<string, RespuestaEquipo | null>) => void
  /** Las capacidades de un campo en el borrador; undefined quita las firmadas. */
  onCapacidades: (campoId: string, c: CapacidadesCampo | undefined) => void
  /** Lo que se firmaría: todo el borrador de la configuración. */
  propuesta: Config
  /** Cuántos cambios lleva el borrador (de todas las pestañas). */
  cambios: number
  firma: ReactNode
  historial: ReactNode
  paso: PasoFilosofia
  onPaso: (p: PasoFilosofia) => void
  onTecnica: () => void
}) {
  const campo = useCampo(), setCampo = useApp(s => s.setCampo)
  const estrecho = useSyncExternalStore(suscribir, esAngosto, () => false)
  const arriba = useRef<HTMLDivElement>(null)
  // «Ver lo que falta» abre el paso 1 en «Sin responder»; el resto de las veces, en «Todos».
  const [soloFalta, setSoloFalta] = useState(false)
  const ir = (p: PasoFilosofia, faltan = false) => {
    setSoloFalta(faltan)
    onPaso(p)
    // El foco va al título del paso: quien usa lector o teclado sabe dónde quedó.
    requestAnimationFrame(() => { arriba.current?.scrollIntoView({ block: 'start' }); document.getElementById(`paso-filosofia-${p}`)?.focus() })
  }
  const resumen = Object.entries(topologia).map(([id, t]) => ({ campoId: id, contestados: Object.keys(t.respuestas).length, faltan: pendientesDe(t).length }))
  const nombrePaso = PASOS.find(([n]) => n === paso)![1]

  return (
    <div ref={arriba} className="scroll-mt-2">
      <header className="mb-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          {/* Sin el rótulo «modelo choke» (T-11; X4 §6.1.4): la palabra queda solo en la ⓘ, pegada al título. */}
          <div className="flex flex-wrap items-center gap-x-1.5">
            <h2 className="text-[20px] font-semibold leading-tight">Filosofía operacional · {campo.nombre}</h2>
            <Info titulo="Modelo choke" texto={EXPLICA_MODELO_CHOKE} />
          </div>
        </div>
        <p className="text-[13px] text-[var(--tinta2)]">borrador · {cambios ? plural(cambios, 'cambio sin firmar', 'cambios sin firmar') : 'sin cambios'}</p>
      </header>
      {/* Los pasos, en una lista (no en una barra de pestañas: UI-01); el que se ve, marcado. */}
      <nav aria-label="Pasos de la filosofía operacional" className="no-imprimir mb-3 rounded-[20px] bg-[var(--panel)] px-4 py-1 sm:mb-4 sm:px-6" data-pasos-filosofia>
        <ol>
          {PASOS.map(([n, t]) => (
            <li key={n} className="border-t border-[var(--linea2)] first:border-t-0">
              <button type="button" aria-current={paso === n ? 'step' : undefined} onClick={() => ir(n)}
                className={cn('flex min-h-11 w-full cursor-pointer items-center gap-2.5 py-1.5 text-left text-[15px] hover:underline',
                  paso === n ? 'font-semibold text-[var(--tinta)]' : 'text-[var(--tinta2)]')}>
                <span className={cn('tabular grid size-6 shrink-0 place-items-center rounded-full text-[13px] font-semibold',
                  paso === n ? 'bg-[var(--primario)] text-[var(--primario-sobre)]' : 'shadow-[inset_0_0_0_1.5px_var(--linea)]')}>{n}</span>
                <span className="min-w-0 flex-1">{t}</span>
                {paso !== n && <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--tinta3)]" />}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <Lectura>
        Aquí se dice cómo está armado el campo: a qué pozos sirve cada equipo y cuánto deja pasar cada tramo. No se
        escoge «pozo» o «planta»: se contesta a qué pozos sirve cada equipo y TRIM deduce dónde se traba cuando para
        (lo de un solo pozo, en el pozo; lo de varios, en la planta o estación; lo de otro dueño, afuera). Si todavía
        no se sabe, se dice: TRIM no lo adivina. TRIM propone lo que ya sabe y usted lo confirma. Nada rige hasta que
        se firma.
      </Lectura>
      <h3 id={`paso-filosofia-${paso}`} tabIndex={-1} className="mb-1.5 mt-1 text-[15px] font-semibold outline-none">
        Paso {paso} · {nombrePaso}
      </h3>
      {!puede && (
        <div className="mb-3 sm:mb-4"><Hueco><Lock className="mr-1 inline size-3.5" />Solo lectura: la prepara y la firma el administrador de la implementación.</Hueco></div>
      )}

      {paso === 1 && (
        <TopologiaPaso key={campoId} campoId={campoId} campoNombre={campo.nombre} borrador={topologia[campoId]} estrecho={estrecho} puede={puede}
          filtroInicial={soloFalta ? 'sin-responder' : 'todos'} onResponder={(v, c) => onResponder(campoId, v, c)} />
      )}
      {paso === 2 && (
        <CapacidadesPaso key={campoId} campoId={campoId} campoNombre={campo.nombre} puede={puede}
          propuesta={propuesta.capacidades?.find(x => x.campoId === campoId)} onCambio={c => onCapacidades(campoId, c)}
          onTecnica={puede ? onTecnica : undefined} />
      )}
      {paso === 3 && (
        <ImpactoPaso propuesta={propuesta} puede={puede} hayCambios={cambios > 0} resumen={resumen} firma={firma} historial={historial}
          estrecho={estrecho} onFaltan={id => { if (id !== campoId) setCampo(id); ir(1, true) }} />
      )}

      <div className="mt-3 sm:mt-4 flex flex-wrap justify-between gap-1.5">
        {paso > 1
          ? <Boton type="button" onClick={() => ir((paso - 1) as PasoFilosofia)}><ChevronLeft className="mr-0.5 inline size-3.5" />Volver a {PASOS[paso - 2]![1].toLowerCase()}</Boton>
          : <span />}
        {paso < 3 && <Boton type="button" variante="principal" onClick={() => ir((paso + 1) as PasoFilosofia)}>
          Siguiente: {PASOS[paso]![1].toLowerCase()}<ChevronRight className="ml-0.5 inline size-3.5" /></Boton>}
      </div>
    </div>
  )
}
