import { useState, type ReactNode } from 'react'
import { useApp, useAmbito, useRango, useRol } from '@/app/store'
import { useResultados, type SeccionResultados, type VistaResultados } from '@/shared/api/resultados'
import { useLibro, useBase, useDias } from '@/shared/api/diferidos'
import { useTelefono } from '@/shared/ui/telefono'
import { cn } from '@/shared/lib/cn'
import { Cifra, ProduccionContraMeta } from '@/widgets/resultados/Cifra'
import { MesAMes } from '@/widgets/resultados/MesAMes'
import { PorEquipo, Bajando, Ciclo, Mantenimiento, Confiabilidad, Publicar } from '@/widgets/resultados/Tarjetas'
import { PorCampo } from '@/widgets/resumen/PorCampo'
import { Tarjeta } from '@/widgets/resultados/piezas'
import { PanelDondeSeTrabo } from '@/widgets/resumen/DondeSeTrabo'
import { Palancas, ParetoTipos } from '@/widgets/diferidos/Paretos'
import { Diaria } from '@/widgets/produccion/Diaria'

/** RESULTADOS (C5 · X4 §4.8; X5 §5.1, §5.2 y §5.4): el inicio de la puerta.
 *  «¿Está bajando?».
 *
 *  Arriba, una cifra con su frase: el diferido del período contra el máximo
 *  firmado. En la misma tarjeta, la producción contra la meta y el cierre
 *  proyectado. Debajo, lo de cada rol en el orden de su pregunta (lo dice el
 *  motor: `secciones`): antes → con TRIM por tramo, el mes a mes (por equipo o
 *  por dónde se trabó), por equipo, por campo, el mantenimiento proactivo y el
 *  retorno posible del ciclo, simulado, con su palabra y nunca como cifra
 *  grande. El gerente tiene aquí lo que eran su Resumen, sus Diferidos y su
 *  Producción (X4 §3.6). El período vive aquí: la cabecera lo ofrece, y un
 *  toque en un mes lo abre (X4 §3.1, regla 8).
 *
 *  El motor calcula y la pantalla pinta: todo sale de `useResultados`
 *  (`GET /api/vistas/resultados`). */
export function Resultados() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol(); const telefono = useTelefono()
  const campoId = useApp(s => s.campoId), alcance = useApp(s => s.alcance)
  const setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla), setRango = useApp(s => s.setRango)
  const campos = ambito.campos.map(c => c.id)
  const v = useResultados({ rol: rol.id, campos, desde: rango.desde, hasta: rango.hasta })
  const ir = (p: string) => (rol.pantallas.includes(p) ? () => setPantalla(p) : undefined)
  const abrir = (e: { campoId: string; equipo: string } | null) => {
    if (!e) return
    if (e.campoId !== campoId || alcance !== 'campo') setCampo(e.campoId)
    abrirEquipo(e.equipo, false)
  }

  const pieza: Record<SeccionResultados, () => ReactNode> = {
    // La producción va dentro de la tarjeta de la cifra (abajo): aquí no se repite.
    produccion: () => null,
    publicar: () => <Publicar v={v} onDetalle={rol.id === 'reg' ? ir('regulatorio') : ir('produccion') ?? ir('diferidos')}
      textoDetalle={rol.id === 'reg' ? 'Ver el reporte al regulador' : '¿Cuadra? Ver la medición y el factor'} />,
    bajando: () => <Bajando v={v} />,
    mesAMes: () => <MesAMes v={v} onMes={m => setRango(m.desdeDia, m.hastaDia)} />,
    porEquipo: () => <PorEquipo v={v} onAbrir={abrir} onVerTodo={ir('diferidos')} />,
    porCampo: () => <DelLibro v={v} que="campos" onAbrir={(c, eq) => abrir({ campoId: c, equipo: eq })} onCampo={c => setCampo(c)} />,
    mantenimiento: () => <Mantenimiento v={v} onDetalle={ir('mantenimiento')} />,
    confiabilidad: () => <Confiabilidad v={v} onDetalle={ir('confiabilidad')} />,
    dondeSeTrabo: () => <PanelDondeSeTrabo campos={v.campos} desde={v.desde} hasta={v.hasta} />,
    dondeBajarlo: () => <DelLibro v={v} que="palancas" />,
    tipos: () => <DelLibro v={v} que="tipos" />,
    diaADia: () => <DiaADia v={v} />,
    ciclo: () => <Ciclo v={v} onPlan={abrir} />,
  }
  // En el escritorio, a la derecha va lo corto (¿está bajando?, lo del rol, el ciclo);
  // a la izquierda, lo ancho. En el teléfono, todo en una columna, en el orden del motor.
  const AL_LADO: SeccionResultados[] = ['bajando', 'mantenimiento', 'confiabilidad', 'publicar', 'ciclo']
  const secciones = v.secciones.filter(s => s !== 'produccion')
  const izquierda = secciones.filter(s => !AL_LADO.includes(s)), derecha = secciones.filter(s => AL_LADO.includes(s))
  const detalle = rol.id === 'reg' ? ir('regulatorio') : ir('diferidos')
  // La pérdida va aparte y nunca se suma; con «Por campo» ya va dentro de él (una vez).
  const perdida = v.secciones.includes('porCampo') ? null : v.perdida

  const cabeza = (
    <section aria-label={v.cifra.fraseCorta} className={cn('min-w-0 rounded-[20px] bg-[var(--panel)]', telefono ? 'px-[18px] pb-4 pt-4' : 'px-5 pb-5 pt-6 sm:px-7')}>
      <Cifra v={v} telefono={telefono} />
      <Botones v={v} onVer={() => abrir(v.cifra.primerEquipo)} onDetalle={detalle} textoDetalle={rol.id === 'reg' ? 'Ver el reporte' : 'Ver el libro de diferidos'} />
      {v.secciones.includes('produccion') && (
        <div className="mt-5 border-t border-[var(--linea2)] pt-4"><ProduccionContraMeta v={v} /></div>
      )}
    </section>
  )

  return (
    <div data-resultados={v.rol} data-alcance={v.alcance} data-valor={v.cifra.valor} className="mx-auto max-w-[1600px]">
      {telefono
        ? (
          <div className="flex flex-col gap-3">
            {cabeza}
            {secciones.map(s => <Bloque key={s} s={s}>{pieza[s]()}</Bloque>)}
            {perdida && <p className="px-1 text-[14px] text-[var(--tinta2)]" data-perdida="">{perdida}</p>}
          </div>
        )
        : (
          <div className="flex flex-col gap-4 min-[1280px]:grid min-[1280px]:grid-cols-[minmax(0,1fr)_380px] min-[1280px]:gap-5">
            <div className="flex min-w-0 flex-col gap-4">
              {cabeza}
              {izquierda.map(s => <Bloque key={s} s={s}>{pieza[s]()}</Bloque>)}
            </div>
            <div className="grid min-w-0 content-start gap-4 md:grid-cols-2 min-[1280px]:flex min-[1280px]:flex-col">
              {derecha.map(s => <Bloque key={s} s={s}>{pieza[s]()}</Bloque>)}
              {perdida && <p className="px-1 text-[14px] text-[var(--tinta2)] md:col-span-2" data-perdida="">{perdida}</p>}
            </div>
          </div>
        )}
    </div>
  )
}

const Bloque = ({ s, children }: { s: SeccionResultados; children: ReactNode }) => <div data-seccion={s} className="min-w-0">{children}</div>

/** Los dos botones de la cifra (nunca más de dos): el principal abre la ficha del
 *  equipo que más pesó en el período; el secundario, el detalle de la puerta. */
function Botones({ v, onVer, onDetalle, textoDetalle }: { v: VistaResultados; onVer: () => void; onDetalle?: () => void; textoDetalle: string }) {
  if (!v.cifra.primerEquipo && !onDetalle) return null
  return (
    <div className="no-imprimir mt-4 flex flex-wrap items-center gap-3">
      {v.cifra.primerEquipo && (
        <button type="button" onClick={onVer} data-ver-que-se-hace={v.cifra.primerEquipo.equipo}
          className="min-h-[48px] cursor-pointer whitespace-nowrap rounded-full bg-[var(--primario)] px-[22px] py-3 text-[16px] font-semibold text-[var(--primario-sobre)] transition-opacity duration-[120ms] hover:opacity-90">
          Ver qué se está haciendo
        </button>
      )}
      {onDetalle && (
        <button type="button" onClick={onDetalle}
          className="min-h-[48px] cursor-pointer whitespace-nowrap rounded-full px-[22px] py-3 text-[16px] font-semibold text-[var(--tinta)] shadow-[inset_0_0_0_1.5px_var(--linea)] transition-colors duration-[120ms] hover:bg-[var(--panel2)]">
          {textoDetalle}
        </button>
      )}
    </div>
  )
}

/** Lo del libro que el gerente tenía en su Resumen y sus Diferidos: dónde bajarlo, el
 *  tipo de causa y, con todos los campos, cada campo con su meta y dónde se trabó. */
function DelLibro({ v, que, onAbrir, onCampo }: {
  v: VistaResultados; que: 'palancas' | 'tipos' | 'campos'
  onAbrir?: (campoId: string, equipo: string) => void; onCampo?: (campoId: string) => void
}) {
  const q = { campos: v.campos, desde: v.desde, hasta: v.hasta }
  const lb = useLibro(q)
  const base = useBase(q)
  if (que === 'campos') return <PorCampo lb={lb} campos={v.campos} desde={v.desde} hasta={v.hasta} onAbrir={onAbrir ?? (() => {})} onCampo={onCampo ?? (() => {})} />
  return que === 'palancas' ? <Palancas lb={lb} base={base} /> : <ParetoTipos lb={lb} />
}

/** «Producción día a día» del gerente (X4 §3.6: su pantalla Producción pasa aquí,
 *  detrás de «ver más»). Plegada en la pantalla; en el papel, desplegada. */
function DiaADia({ v }: { v: VistaResultados }) {
  const [abierto, setAbierto] = useState(false)
  const dias = useDias({ campos: v.campos, desde: v.desde, hasta: v.hasta })
  return (
    <Tarjeta titulo="Producción día a día" extra="bbl/d · el punto oficial contra las pruebas y la meta" data-dia-a-dia={abierto ? 'abierto' : 'cerrado'}>
      <button type="button" aria-expanded={abierto} onClick={() => setAbierto(x => !x)}
        className="no-imprimir mt-2 inline-flex min-h-9 cursor-pointer items-center gap-1 text-[15px] font-semibold text-[var(--tinta)] hover:underline">
        {abierto ? 'Ver menos' : 'Ver la producción día a día'} <span aria-hidden>{abierto ? '‹' : '›'}</span>
      </button>
      <div className={cn('mt-2', !abierto && 'hidden print:block')}>
        <Diaria dias={dias} />
      </div>
    </Tarjeta>
  )
}
