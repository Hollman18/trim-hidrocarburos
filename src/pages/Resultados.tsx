import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { useApp, useAmbito, useRango, useRol } from '@/app/store'
import { useResultados, type SeccionResultados, type VistaResultados } from '@/shared/api/resultados'
import { useLibro, useDias } from '@/shared/api/diferidos'
import { useTelefono } from '@/shared/ui/telefono'
import { cn } from '@/shared/lib/cn'
import { Cifra, ProduccionContraMeta } from '@/widgets/resultados/Cifra'
import { MesAMes } from '@/widgets/resultados/MesAMes'
import { PorEquipo, Ciclo, Mantenimiento, Confiabilidad, Publicar } from '@/widgets/resultados/Tarjetas'
import { Funcionando } from '@/widgets/resultados/Funcionando'
import { PorCampo } from '@/widgets/resumen/PorCampo'
import { Tarjeta } from '@/widgets/resultados/piezas'
import { Balance } from '@/widgets/choke/Balance'
import { Diaria } from '@/widgets/produccion/Diaria'

/** RESULTADOS (experiencia v3): el período de cada rol. «¿Está bajando?»
 *
 *  Arriba, la cifra con su frase: el diferido del período contra el máximo firmado, con la
 *  producción contra la meta y el cierre proyectado (kit SCADA). Debajo, lo de cada rol en el
 *  orden de su pregunta (`secciones`, del motor), con dos cambios de la v3:
 *  - el balance del choke (producido · diferido · perdido por tramo, con su trazabilidad) va
 *    siempre, y reemplaza «Dónde se trabó» en barras (borrado.md A-07, A-08: «Dónde bajarlo» y
 *    «Tipo de causa» salen; repetían «por equipo» con otra cuenta);
 *  - «¿Está funcionando?» (§0d) reemplaza «¿Está bajando?».
 *  Lo simulado («Lo que todavía se puede mover») sale de la primera capa (A-30): a un toque para
 *  el gerente y producción. El período vive aquí: la cabecera lo ofrece.
 *
 *  El motor calcula y la pantalla pinta (`useResultados`, `useBalance`, `useEfectividad`). */
const FUERA: readonly SeccionResultados[] = ['dondeSeTrabo', 'dondeBajarlo', 'tipos', 'bajando']

export function Resultados() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol(); const telefono = useTelefono()
  const campoId = useApp(s => s.campoId), alcance = useApp(s => s.alcance)
  const setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla)
  const campos = ambito.campos.map(c => c.id)
  const v = useResultados({ rol: rol.id, campos, desde: rango.desde, hasta: rango.hasta })
  const ir = (p: string) => (rol.pantallas.includes(p) ? () => setPantalla(p) : undefined)
  const abrir = (e: { campoId: string; equipo: string } | null) => {
    if (!e) return
    if (e.campoId !== campoId || alcance !== 'campo') setCampo(e.campoId)
    abrirEquipo(e.equipo, false)
  }
  const q = { campos, desde: rango.desde, hasta: rango.hasta }

  const pieza: Record<SeccionResultados, () => ReactNode> = {
    // La producción va dentro de la tarjeta de la cifra (abajo): aquí no se repite.
    produccion: () => null,
    publicar: () => <Publicar v={v} onDetalle={rol.id === 'reg' ? ir('regulatorio') : ir('produccion')}
      textoDetalle={rol.id === 'reg' ? 'Ver el reporte al regulador' : '¿Cuadra? Ver la medición y el factor'} />,
    mesAMes: () => <MesAMes v={v} />,
    porEquipo: () => <PorEquipo v={v} onAbrir={abrir} />,
    porCampo: () => <DelLibro v={v} onAbrir={(c, eq) => abrir({ campoId: c, equipo: eq })} onCampo={c => setCampo(c)} />,
    // A-12: lo que hay que atacar vive en el Hoy del jefe.
    mantenimiento: () => <Mantenimiento v={v} onDetalle={ir('hoy')} />,
    confiabilidad: () => <Confiabilidad v={v} onDetalle={ir('confiabilidad')} />,
    diaADia: () => <DiaADia v={v} />,
    // A-30: lo simulado, a un toque y solo para quien decide planes desde aquí (gerente y producción).
    ciclo: () => (rol.id === 'ger' || rol.id === 'prod' ? <Simulado v={v} onPlan={abrir} /> : null),
    dondeSeTrabo: () => null, dondeBajarlo: () => null, tipos: () => null, bajando: () => null,
  }
  const AL_LADO: SeccionResultados[] = ['mantenimiento', 'confiabilidad', 'publicar', 'ciclo']
  const secciones = v.secciones.filter(s => s !== 'produccion' && !FUERA.includes(s))
  const izquierda = secciones.filter(s => !AL_LADO.includes(s)), derecha = secciones.filter(s => AL_LADO.includes(s))
  const detalle = rol.id === 'reg' ? ir('regulatorio') : undefined
  // R5 · De md a 1279 px lo de la derecha va en dos columnas: «¿Está funcionando?» las toma las dos (sola, en una, quedaba apretada).
  const funciona = v.secciones.includes('bajando') ? <Funcionando campos={campos} className="md:col-span-2" /> : null

  const cabeza = (
    <section aria-label={v.cifra.fraseCorta} className={cn('min-w-0 rounded-[10px] bg-[var(--panel)]', telefono ? 'px-4 pb-4 pt-4' : 'px-5 pb-5 pt-6 sm:px-7')}>
      <Cifra v={v} telefono={telefono} />
      <Botones v={v} onVer={() => abrir(v.cifra.primerEquipo)} onDetalle={detalle} textoDetalle="Ver el reporte" />
      {v.secciones.includes('produccion') && (
        <div className="mt-5 border-t border-[var(--linea2)] pt-4"><ProduccionContraMeta v={v} /></div>
      )}
    </section>
  )
  const balance = <Balance q={q} />

  return (
    <div data-resultados={v.rol} data-alcance={v.alcance} data-valor={v.cifra.valor} className="mx-auto max-w-[1600px]">
      {telefono
        ? (
          <div className="flex flex-col gap-3">
            {cabeza}{balance}{funciona}
            {secciones.map(s => <Bloque key={s} s={s}>{pieza[s]()}</Bloque>)}
          </div>
        )
        : (
          <div className="flex flex-col gap-4 min-[1280px]:grid min-[1280px]:grid-cols-[minmax(0,1fr)_400px] min-[1280px]:gap-5">
            <div className="flex min-w-0 flex-col gap-4">
              {cabeza}{balance}
              {izquierda.map(s => <Bloque key={s} s={s}>{pieza[s]()}</Bloque>)}
            </div>
            <div className="grid min-w-0 content-start gap-4 md:grid-cols-2 min-[1280px]:flex min-[1280px]:flex-col">
              {funciona}
              {derecha.map(s => <Bloque key={s} s={s}>{pieza[s]()}</Bloque>)}
            </div>
          </div>
        )}
    </div>
  )
}

const Bloque = ({ s, children }: { s: SeccionResultados; children: ReactNode }) => (children ? <div data-seccion={s} className="min-w-0">{children}</div> : null)

/** Los dos botones de la cifra (nunca más de dos): el principal abre la ficha del
 *  equipo que más pesó en el período; el secundario, el reporte (regulatorio). */
function Botones({ v, onVer, onDetalle, textoDetalle }: { v: VistaResultados; onVer: () => void; onDetalle?: () => void; textoDetalle: string }) {
  if (!v.cifra.primerEquipo && !onDetalle) return null
  return (
    <div className="no-imprimir mt-4 flex flex-wrap items-center gap-3">
      {v.cifra.primerEquipo && (
        <button type="button" onClick={onVer} data-ver-que-se-hace={v.cifra.primerEquipo.equipo}
          className="min-h-12 cursor-pointer whitespace-nowrap rounded-[8px] bg-[var(--primario)] px-[22px] py-3 text-[16px] font-semibold text-[var(--primario-sobre)] transition-opacity duration-[120ms] hover:opacity-90">
          Ver {v.cifra.primerEquipo.equipo}
        </button>
      )}
      {onDetalle && (
        <button type="button" onClick={onDetalle}
          className="min-h-12 cursor-pointer whitespace-nowrap rounded-[8px] px-[22px] py-3 text-[16px] font-semibold text-[var(--tinta)] shadow-[inset_0_0_0_1.5px_var(--linea)] transition-colors duration-[120ms] hover:bg-[var(--panel2)]">
          {textoDetalle}
        </button>
      )}
    </div>
  )
}

/** Con todos los campos, cada campo con su meta y dónde se trabó (lo que el gerente tenía en su Resumen). */
function DelLibro({ v, onAbrir, onCampo }: { v: VistaResultados; onAbrir: (campoId: string, equipo: string) => void; onCampo: (campoId: string) => void }) {
  const lb = useLibro({ campos: v.campos, desde: v.desde, hasta: v.hasta })
  return <PorCampo lb={lb} campos={v.campos} desde={v.desde} hasta={v.hasta} onAbrir={onAbrir} onCampo={onCampo} />
}

/** «Producción día a día» del gerente: plegada en la pantalla; en el papel, desplegada. */
function DiaADia({ v }: { v: VistaResultados }) {
  const [abierto, setAbierto] = useState(false)
  const dias = useDias({ campos: v.campos, desde: v.desde, hasta: v.hasta })
  return (
    <Tarjeta titulo="Producción día a día" extra="bbl/d · el punto oficial contra las pruebas y la meta" data-dia-a-dia={abierto ? 'abierto' : 'cerrado'}>
      <Plegar abierto={abierto} onAlternar={() => setAbierto(x => !x)}>{abierto ? 'Ver menos' : 'Ver la producción día a día'}</Plegar>
      <div className={cn('mt-2', !abierto && 'hidden print:block')}><Diaria dias={dias} /></div>
    </Tarjeta>
  )
}

/** A-30 · «Lo que todavía se puede mover» (el ciclo, simulado), a un toque: nunca en la primera capa. */
function Simulado({ v, onPlan }: { v: VistaResultados; onPlan: (e: { campoId: string; equipo: string }) => void }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div data-simulado={abierto ? 'abierto' : 'cerrado'}>
      <Plegar abierto={abierto} onAlternar={() => setAbierto(x => !x)}>{abierto ? 'Ocultar lo simulado' : 'Lo que todavía se puede mover'}</Plegar>
      {abierto && <Ciclo v={v} onPlan={onPlan} />}
    </div>
  )
}

function Plegar({ abierto, onAlternar, children }: { abierto: boolean; onAlternar: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-expanded={abierto} onClick={onAlternar}
      className="no-imprimir mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1 text-[15px] font-semibold text-[var(--tinta)] hover:underline sm:min-h-9">
      {children}<ChevronRight aria-hidden className={cn('size-4 text-[var(--tinta2)] transition-transform', abierto && 'rotate-90')} />
    </button>
  )
}
