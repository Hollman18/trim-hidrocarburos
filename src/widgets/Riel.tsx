import { Suspense, useMemo } from 'react'
import { Check, ChevronDown, CircleHelp, PanelLeftOpen, X } from 'lucide-react'
import { useApp, useCampo, useRol, useCampos, useAmbito, portafolioPermitido } from '@/app/store'
import { perfilDe } from '@/entities/configuracion'
import { hayEquipo, ultimaSub } from '@/app/grupos'
import { useInsigniaDeHoy } from '@/shared/api/hoy'
import { Wordmark, Isotipo } from '@/shared/brand/Logo'
import { n0 } from '@/shared/lib/formato'
import { useEstadoCampos } from '@/shared/api/diferidos'
import { cn } from '@/shared/lib/cn'
import { PANTALLAS, GRUPOS, PUERTAS_DEL_ROL, grupoDe, enElMenu, entradaDe } from '@/app/pantallas'
import { pantallaVisible } from '@/shared/config/producto'
import { MenuPerfil } from './MenuPerfil'
import { peorSeveridad } from '@/shared/lib/prioridad'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { useDesplegable } from '@/shared/ui/foco'
import { useUsuarios } from '@/shared/api/usuarios'
import { useSesion } from '@/shared/api/sesion'

/* El panel lateral (v3, decisión 5): CLARO, en el gris cálido de la v1, con su
   borde de 1 px; la entrada activa en --nav-activo con la raya de 3 px del acento a
   la izquierda y el peso 600 (nunca solo color: WCAG 1.4.1). Sin barra negra.
   Desplegado mide 240 px y plegado 88; en el teléfono es el mismo panel, que abre
   el ☰ desde la izquierda (X5 §4.2). Arriba no queda ninguna pestaña: las
   subpantallas de la puerta abierta se listan aquí, debajo de su puerta. */

/** Lo seleccionado en el panel: el fondo claro, la raya del acento y el peso. */
const ACTIVO = 'bg-[var(--nav-activo)] font-semibold text-[var(--nav-tinta)] shadow-[inset_3px_0_0_var(--acento)]'
const INACTIVO = 'font-medium text-[var(--nav-tinta2)] hover:bg-[var(--nav-hover)] hover:text-[var(--nav-tinta)]'

/** Las iniciales de un campo para la píldora plegada: «La Ceiba» → «LC». */
const sigla = (nombre: string) => {
  const p = nombre.split(/\s+/).filter(Boolean)
  return (p.length > 1 ? p.map(x => x[0]).join('') : nombre.slice(0, 2)).slice(0, 2).toUpperCase()
}

/** El campo que se mira, con la marca de su peor condición, y la lista para
 *  cambiarlo: «Todos mis campos» y cada campo con lo que produjo ayer. En el
 *  panel va en una caja con su rótulo («Campo», como D1); plegado y en la banda
 *  del teléfono, en una píldora. */
export function SelectorCampo({ variante = 'panel' }: { variante?: 'panel' | 'plegado' | 'banda' }) {
  const campoId = useApp(s => s.campoId), setCampo = useApp(s => s.setCampo), alcance = useApp(s => s.alcance), setAlcance = useApp(s => s.setAlcance)
  const campo = useCampo(); const rol = useRol(); const usuarios = useUsuarios()
  const campos = useCampos()
  const varios = campos.length > 1
  // El estado de cada campo sale de sus equipos: un equipo de alto impacto
  // frenándolo es prioridad 1; otra causa, 2; algo en riesgo, 3.
  const estados = useEstadoCampos(campos.map(c => c.id))
  const severidadDe = (c: { id: string }) => estados.find(e => e.campoId === c.id)?.severidad ?? 0
  const { abierto, setAbierto, contenedor, id: idMenu, propsBoton } = useDesplegable()
  // La misma regla que aplica el store (`portafolioPermitido`): no se ofrece lo que el estado no acepta.
  const ofrecePortafolio = portafolioPermitido(rol, usuarios)
  const enPortafolio = alcance === 'portafolio' && ofrecePortafolio
  // En el portafolio, la marca del campo más grave (1 > 2 > 3 > normal): un P1
  // de otro campo no puede salir «normal» porque el último escogido está bien.
  const estadoVista = enPortafolio ? peorSeveridad(campos.map(severidadDe)) : severidadDe(campo)
  const nombre = enPortafolio ? 'Todos mis campos' : campo.nombre
  // La condición en palabras: plegada, la píldora solo lleva la marca y la sigla (X5 §4.1),
  // así que la palabra va en su nombre y en su ayuda (ISA-101: color con forma y palabra).
  const condicion = ({ 1: 'alarma', 2: 'atención', 3: 'aviso' } as Record<number, string>)[estadoVista]
  const conCondicion = condicion ? `${nombre}, con ${condicion}` : nombre

  return (
    <div ref={contenedor} className={cn('relative', variante === 'panel' && 'w-full', variante === 'banda' && 'min-w-0')}>
      <button {...propsBoton} onClick={() => varios && setAbierto(v => !v)} disabled={!varios}
        aria-expanded={varios ? abierto : undefined} aria-controls={varios && abierto ? idMenu : undefined}
        aria-label={`Campo: ${conCondicion}${varios ? '. Cambiar de campo' : ''}`} title={variante === 'plegado' ? conCondicion : undefined}
        data-compacto={variante === 'plegado' ? '' : undefined}
        className={cn('flex items-center bg-[var(--panel)] font-semibold text-[var(--tinta)] shadow-[inset_0_0_0_1px_var(--nav-linea)]',
          varios ? 'cursor-pointer hover:bg-[var(--elevado)]' : 'cursor-default',
          variante === 'panel' && 'w-full gap-2.5 rounded-[10px] px-3 py-2 text-left text-[15px]',
          variante === 'plegado' && 'h-10 w-[60px] justify-center gap-1 rounded-full text-[13px]',
          variante === 'banda' && 'toque min-w-0 max-w-full gap-2 rounded-full px-3 py-1.5 text-[14px]')}>
        <MarcaPrioridad s={estadoVista} tamano={variante === 'panel' ? 16 : 14} />
        {variante === 'plegado'
          ? <span aria-hidden>{enPortafolio ? 'Todos' : sigla(campo.nombre)}</span>
          : variante === 'panel'
            ? <span className="min-w-0 flex-1"><small aria-hidden className="block text-[13px] font-normal leading-tight text-[var(--tinta2)]">Campo</small><span className="block truncate leading-snug">{nombre}</span></span>
            : <span className="min-w-0 truncate">{nombre}</span>}
        {varios && variante !== 'plegado' && <ChevronDown aria-hidden className={cn('ml-auto shrink-0 text-[var(--tinta2)]', variante === 'panel' ? 'size-[18px]' : 'size-4')} />}
      </button>
      {abierto && (
        <div id={idMenu} role="group" aria-label="Escoger campo"
          className={cn('absolute z-[130] w-[300px] max-w-[calc(100vw-24px)] rounded-[10px] bg-[var(--elevado)] p-1.5 text-[var(--tinta)] shadow-[var(--sombra-flota)]',
            variante === 'banda' ? 'left-1/2 top-[calc(100%+8px)] -translate-x-1/2' : variante === 'plegado' ? 'left-[calc(100%+12px)] top-0' : 'inset-x-0 top-[calc(100%+6px)] w-auto')}>
          {ofrecePortafolio && (<>
            <button onClick={() => { setAlcance('portafolio'); setAbierto(false) }} aria-current={alcance === 'portafolio'}
              className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[15px] font-semibold hover:bg-[var(--panel2)]">
              <MarcaPrioridad s={peorSeveridad(campos.map(severidadDe))} tamano={14} />
              <span className="flex-1">Todos mis campos
                <span className="block text-[13px] font-normal text-[var(--tinta2)]">{campos.length} campos sumados</span>
              </span>
              {alcance === 'portafolio' && <Check aria-hidden className="size-4 text-[var(--foco)]" />}
            </button>
            <hr className="my-1 border-[var(--linea2)]" />
          </>)}
          {/* Lo producido ayer va en una columna con su rótulo arriba: la cifra se compara de un vistazo. */}
          <p className="flex justify-between gap-2 px-2.5 pb-1 pt-1 text-[13px] font-semibold text-[var(--tinta2)]">
            <span>Campos · {campos.length}</span><span aria-hidden className="pr-6">producido ayer</span>
          </p>
          {campos.map(c => {
            const b = estados.find(e => e.campoId === c.id)?.ayer.bbl
            const es = c.id === campoId && alcance === 'campo'
            return (
              <button key={c.id} onClick={() => { setCampo(c.id); setAbierto(false) }} aria-current={es}
                className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-left text-[15px] hover:bg-[var(--panel2)]">
                <MarcaPrioridad s={severidadDe(c)} tamano={14} />
                <span className="min-w-0 flex-1 font-medium">{c.nombre}
                  <span className="block text-[13px] font-normal text-[var(--tinta2)]">{c.cuenca}</span>
                </span>
                <span className="tabular shrink-0 text-right text-[14px] text-[var(--tinta2)]">
                  {b === null || b === undefined
                    ? <>sin fiscal<span className="sr-only"> ayer</span></>
                    : <>{`${n0(b)} bbl`}<span className="sr-only"> producidos ayer</span></>}
                </span>
                <span className="grid w-4 shrink-0 place-items-center">{es && <Check aria-hidden className="size-4 text-[var(--foco)]" />}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Las puertas del rol, en su orden, con sus subpantallas. Una puerta sin
 *  ninguna pantalla para este campo no se ofrece. Lleva a la última
 *  subpantalla que el rol abrió en ella, si este campo la tiene. */
function usePuertas() {
  const pantalla = useApp(s => s.pantalla), setPantalla = useApp(s => s.setPantalla)
  const rol = useRol(); const ambito = useAmbito(); const config = useSesion(s => s.ctx.config)
  return useMemo(() => {
    const perfiles = ambito.campos.map(c => perfilDe(config, c.id))
    return (PUERTAS_DEL_ROL[rol.id] ?? []).flatMap(g => {
      const subs = GRUPOS[g]!.miembros.filter(x => rol.pantallas.includes(x) && pantallaVisible(x) && hayEquipo(x, perfiles))
      if (!subs.length) return []
      const activo = grupoDe(pantalla) === g
      const ultima = ultimaSub(rol.id, g)
      // Se abre la que el rol prefiere (su orden), no la primera de la puerta.
      const preferida = rol.pantallas.find(p => subs.includes(p)) ?? subs[0]!
      // UI-23 (prompt §4.8): la primera subpantalla que repite el nombre de su puerta
      // («Hoy › Hoy») no se lista: la abre la puerta. Desde adentro, la puerta abre
      // esa primera; desde afuera, la última que el rol abrió en ella.
      const repite = PANTALLAS[preferida]!.corto === GRUPOS[g]!.corto
      const destino = activo ? preferida : ultima && subs.includes(ultima) ? ultima : preferida
      return [{
        id: g, corto: GRUPOS[g]!.corto, icono: GRUPOS[g]!.icono, activo, ir: () => setPantalla(destino),
        subs: subs.filter(id => enElMenu(id) && !(repite && id === preferida))
          .map(id => ({ id, corto: PANTALLAS[id]!.corto, icono: PANTALLAS[id]!.icono, activo: entradaDe(pantalla) === id, ir: () => setPantalla(id) })),
      }]
    })
  }, [rol, pantalla, ambito.campos, config, setPantalla])
}

/** La insignia de Hoy (X4 §3.3, X5 §4.1): cuántas tarjetas piden una acción,
 *  contadas por Hoy (`useInsigniaDeHoy`). Una píldora en tinta con el número
 *  claro, nunca un color de estado. En cero no se pinta. */
function CuentaHoy({ variante }: { variante: 'panel' | 'plegado' | 'menu' }) {
  const rol = useRol(); const ambito = useAmbito()
  const n = useInsigniaDeHoy(rol.id, ambito.campos.map(c => c.id))
  if (!n) return null
  return (
    <span className={cn('grid place-items-center rounded-full bg-[var(--tinta)] font-bold text-[var(--panel)]',
      variante === 'panel' && 'ml-auto h-6 min-w-6 px-[7px] text-[13px]',
      variante === 'plegado' && 'absolute right-1.5 top-[3px] h-5 min-w-5 px-[5px] text-[12px]',
      variante === 'menu' && 'absolute -right-0.5 top-0.5 h-[18px] min-w-[18px] px-1 text-[12px]')}>
      {n}<span className="sr-only"> por hacer en Hoy</span>
    </span>
  )
}
/** La insignia no detiene el panel mientras Hoy llega (con el servidor). */
export const InsigniaHoy = ({ variante }: { variante: 'panel' | 'plegado' | 'menu' }) => (
  <Suspense fallback={null}><CuentaHoy variante={variante} /></Suspense>
)

export function Riel({ plegado = false, onPlegar, onCerrar }: {
  plegado?: boolean
  /** Plegar o desplegar (escritorio). */
  onPlegar?: () => void
  /** En el teléfono, el panel abierto se cierra con la X o al escoger. */
  onCerrar?: () => void
}) {
  const comoSeLee = useApp(s => s.comoSeLee), setComoSeLee = useApp(s => s.setComoSeLee)
  const todas = usePuertas()
  // B3 · Con una sola puerta (oper, tec, reg, adm) no hay menú (flujos.md §2): sin la puerta; si su puerta
  // tiene más de una pantalla (adm: Configuración y Conectores), van ellas, como entradas.
  const unaSola = todas.length === 1
  const puertas = !unaSola ? todas : todas[0]!.subs.length > 1 ? todas[0]!.subs.map(x => ({ ...x, subs: [] as typeof x[] })) : []

  if (plegado) return (
    <nav aria-label="Navegación" className="flex h-full flex-col items-center overflow-y-auto border-r border-[var(--nav-linea)] bg-[var(--nav)] px-[10px] pb-[18px] pt-5 text-[var(--nav-tinta)]">
      <span className="mb-4 grid size-11 shrink-0 place-items-center"><Isotipo className="size-[30px]" /></span>
      <div className="mb-4"><SelectorCampo variante="plegado" /></div>
      <div role="group" aria-label="Puertas" className="flex flex-col items-center gap-1">
        {puertas.map(p => (
          <div key={p.id} className="flex flex-col items-center">
            <button onClick={p.ir} aria-current={p.activo ? 'page' : undefined}
              className={cn('relative flex w-[66px] cursor-pointer flex-col items-center gap-1 rounded-[10px] px-0.5 pb-2 pt-2.5 text-center text-[12px] leading-tight transition-colors duration-[120ms]',
                p.activo ? ACTIVO : INACTIVO)}>
              <p.icono className="size-[22px]" />
              {p.corto}
              {p.id === 'hoy' && <InsigniaHoy variante="plegado" />}
            </button>
            {/* Plegado, las subpantallas de la puerta abierta van debajo de ella: el ícono
                con su nombre corto a 12 px, en hasta dos renglones (UI-06: en la navegación
                el ícono va siempre con su palabra). */}
            {p.activo && p.subs.length > 0 && (
              <div role="group" aria-label={p.corto} data-subpantallas className="mt-1 flex flex-col items-center gap-0.5">
                {p.subs.map(s => (
                  <button key={s.id} onClick={s.ir} aria-current={s.activo ? 'page' : undefined}
                    className={cn('flex w-[66px] cursor-pointer flex-col items-center gap-0.5 rounded-[10px] px-0.5 pb-1.5 pt-1.5 text-center text-[12px] leading-[1.15] hyphens-auto [overflow-wrap:anywhere]',
                      s.activo ? ACTIVO : INACTIVO)}>
                    <s.icono className="size-[18px] shrink-0" />
                    <span className="line-clamp-2">{s.corto}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-col items-center gap-1 pt-4">
        <button onClick={() => setComoSeLee(!comoSeLee)} aria-pressed={comoSeLee} aria-label="¿Cómo se lee?" title="¿Cómo se lee?"
          className={cn('grid size-11 cursor-pointer place-items-center rounded-full', comoSeLee ? 'bg-[var(--nav-activo)] text-[var(--nav-tinta)] shadow-[inset_0_0_0_1.5px_var(--acento)]' : 'text-[var(--nav-tinta2)] hover:bg-[var(--nav-hover)] hover:text-[var(--nav-tinta)]')}>
          <CircleHelp className="size-[22px]" />
        </button>
        <div className="mt-1.5 w-full border-t border-[var(--nav-linea)] pt-3.5"><MenuPerfil variante="plegado" /></div>
        {onPlegar && (
          <button onClick={onPlegar} aria-label="Desplegar el panel" title="Desplegar el panel ( [ )"
            className="mt-1.5 grid size-10 cursor-pointer place-items-center rounded-full text-[var(--nav-tinta2)] hover:bg-[var(--nav-hover)] hover:text-[var(--nav-tinta)]">
            <PanelLeftOpen className="size-5" />
          </button>
        )}
      </div>
    </nav>
  )

  return (
    <nav aria-label="Navegación" className="flex h-full flex-col overflow-y-auto border-r border-[var(--nav-linea)] bg-[var(--nav)] px-4 pb-[18px] pt-6 text-[var(--nav-tinta)]">
      <div className="relative mb-[22px] flex items-center">
        <span className="ml-2 mt-0.5 block"><Wordmark className="h-[19px]" /></span>
        {onCerrar && (
          <button onClick={onCerrar} aria-label="Cerrar la navegación"
            className="toque absolute -top-1.5 right-0 grid size-10 cursor-pointer place-items-center rounded-full text-[var(--nav-tinta2)] hover:bg-[var(--nav-hover)] hover:text-[var(--nav-tinta)]">
            <X className="size-6" />
          </button>
        )}
      </div>
      <div className="mb-[18px]"><SelectorCampo /></div>

      {/* Las puertas se reconocen solas: sin rótulo encima; el nombre va al lector. */}
      <div role="group" aria-label="Puertas" className="flex flex-col gap-1">
        {puertas.map(p => (
          <div key={p.id}>
            <button onClick={() => { p.ir(); onCerrar?.() }} aria-current={p.activo ? 'page' : undefined}
              className={cn('flex min-h-[46px] w-full cursor-pointer items-center gap-3.5 rounded-[10px] px-3.5 py-[11px] text-left text-[16px] transition-colors duration-[120ms]',
                p.activo ? ACTIVO : INACTIVO)}>
              <p.icono className="size-[22px] shrink-0" />
              {p.corto}
              {p.id === 'hoy' && <InsigniaHoy variante="panel" />}
            </button>
            {/* Las subpantallas de la puerta abierta, dentro del panel y debajo de su puerta. */}
            {p.activo && p.subs.length > 0 && (
              <div role="group" aria-label={p.corto} data-subpantallas className="mb-1 ml-[23px] mt-1 flex flex-col gap-0.5 border-l border-[var(--nav-linea)] pl-3">
                {p.subs.map(s => (
                  <button key={s.id} onClick={() => { s.ir(); onCerrar?.() }} aria-current={s.activo ? 'page' : undefined}
                    className={cn('min-h-9 w-full cursor-pointer rounded-[8px] px-2.5 py-1.5 text-left text-[15px] leading-snug transition-colors duration-[120ms] max-sm:min-h-11',
                      s.activo ? ACTIVO : INACTIVO)}>
                    {s.corto}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1 pt-6">
        <button onClick={() => setComoSeLee(!comoSeLee)} aria-pressed={comoSeLee} aria-label="¿Cómo se lee?"
          className={cn('flex min-h-11 cursor-pointer items-center gap-3.5 rounded-[10px] px-3.5 py-2.5 text-left text-[15px] transition-colors duration-[120ms]',
            comoSeLee ? ACTIVO : INACTIVO)}>
          <CircleHelp className="size-5 shrink-0" />¿Cómo se lee?
          {comoSeLee && <span className="ml-auto text-[13px] font-normal">activo</span>}
        </button>
        <div className="mt-1.5 border-t border-[var(--nav-linea)] pt-3.5"><MenuPerfil variante="panel" onPlegar={onPlegar} /></div>
      </div>
    </nav>
  )
}
