import { useMemo } from 'react'
import { Check, LayoutGrid, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useApp, useCampo, useRol, useCampos, useAmbito, portafolioPermitido } from '@/app/store'
import { perfilDe } from '@/entities/configuracion'
import { hayEquipo, ultimaSub } from '@/app/grupos'
import { Wordmark, Isotipo } from '@/shared/brand/Logo'
import { n0 } from '@/shared/lib/formato'
import { useEstadoCampos } from '@/shared/api/diferidos'
import { cn } from '@/shared/lib/cn'
import { PANTALLAS, GRUPOS, grupoDe, nombreGrupo } from '@/app/pantallas'
import { pantallaVisible } from '@/shared/config/producto'
import { MenuPerfil } from './MenuPerfil'
import { peorSeveridad } from '@/shared/lib/prioridad'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { useDesplegable } from '@/shared/ui/foco'
import { useUsuarios } from '@/shared/api/usuarios'
import { useSesion } from '@/shared/api/sesion'


export function Riel({ colapsado = false, onColapsar }: { colapsado?: boolean; onColapsar?: () => void }) {
  const pantalla = useApp(s => s.pantalla), setPantalla = useApp(s => s.setPantalla), campoId = useApp(s => s.campoId), setCampo = useApp(s => s.setCampo), alcance = useApp(s => s.alcance), setAlcance = useApp(s => s.setAlcance)
  const campo = useCampo(); const rol = useRol(); const usuarios = useUsuarios()
  const campos = useCampos()
  const varios = campos.length > 1
  // El estado de cada campo sale de sus equipos: un equipo de alto impacto
  // frenándolo es prioridad 1; otra causa, 2; algo en riesgo, 3.
  const estados = useEstadoCampos(campos.map(c => c.id))
  const severidadDe = (c: { id: string }) => estados.find(e => e.campoId === c.id)?.severidad ?? 0
  // El selector de campo es un desplegable: cierra con Escape y con un clic afuera.
  const { abierto: menuCampo, setAbierto: setMenuCampo, contenedor, id: idMenu, propsBoton } = useDesplegable()
  const ambito = useAmbito(); const config = useSesion(s => s.ctx.config)
  // Pozos, bombas y electrosumergibles van en UNA entrada: «Pozos y equipos».
  // Lleva a la última subpantalla que el rol abrió, si este campo la tiene.
  const entradas = useMemo(() => {
    const perfiles = ambito.campos.map(c => perfilDe(config, c.id))
    const vistos = new Set<string>()
    const out: Array<{ id: string; corto: string; icono: typeof PANTALLAS[string]['icono']; activo: boolean; ir: () => void }> = []
    for (const id of rol.pantallas.filter(pantallaVisible)) {
      const p = PANTALLAS[id]; if (!p) continue
      const g = grupoDe(id)
      if (!g) { out.push({ id, corto: p.corto, icono: p.icono, activo: pantalla === id, ir: () => setPantalla(id) }); continue }
      if (vistos.has(g)) continue
      vistos.add(g)
      const subs = rol.pantallas.filter(x => pantallaVisible(x) && GRUPOS[g]!.miembros.includes(x) && hayEquipo(x, perfiles))
      // Sin ninguna subpantalla en este campo, la entrada no se ofrece.
      if (!subs.length) continue
      const activo = grupoDe(pantalla) === g
      const ultima = ultimaSub(rol.id, g)
      const destino = activo ? pantalla : ultima && subs.includes(ultima) ? ultima : subs[0]!
      out.push({ id: g, corto: nombreGrupo(g, rol.pantallas), icono: GRUPOS[g]!.icono, activo, ir: () => setPantalla(destino) })
    }
    return out
  }, [rol, pantalla, ambito.campos, config, setPantalla])
  // Si ninguna pantalla del rol suma campos, ofrecer el portafolio sería
  // llevar a un callejón: el reporte al regulador es por campo.
  // La misma regla que aplica el store (`portafolioPermitido`): el riel no ofrece lo que el estado no acepta.
  const ofrecePortafolio = portafolioPermitido(rol, usuarios)
  // La marca del selector es la de lo que se está mirando. En el portafolio,
  // la del campo más grave (1 > 2 > 3 > normal): un P1 de otro campo no puede
  // salir «Normal» porque el último campo escogido está bien (ISA-101).
  const enPortafolio = alcance === 'portafolio' && ofrecePortafolio
  const estadoVista = enPortafolio ? peorSeveridad(campos.map(severidadDe)) : severidadDe(campo)

  if (colapsado) return (
    <nav className="flex h-full flex-col items-center overflow-hidden border-r border-[var(--linea)] bg-[var(--superficie)] py-3">
      <Isotipo className="size-6" />
      <button onClick={onColapsar} aria-label="Expandir la navegación"
        className="mt-3 cursor-pointer rounded border border-[var(--linea)] bg-[var(--panel)] p-1.5 hover:bg-[var(--elevado)]">
        <PanelLeftOpen className="size-4" />
      </button>
      <span className="mt-3" title={enPortafolio ? 'Portafolio completo' : campo.nombre}>
        <MarcaPrioridad s={estadoVista} tamano={12} />
      </span>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        {entradas.map(e => (
          <button key={e.id} onClick={e.ir} aria-current={e.activo} title={e.corto}
            className={cn('grid size-9 cursor-pointer place-items-center rounded',
              e.activo ? 'bg-[var(--panel)] text-[var(--tinta)] shadow-[inset_2px_0_0_var(--acento)]'
                : 'text-[var(--tinta3)] hover:bg-[var(--panel2)]')}>
            <e.icono className="size-[17px]" />
          </button>
        ))}
      </div>
      <MenuPerfil colapsado />
    </nav>
  )

  return (
    <nav className="flex h-full flex-col overflow-hidden border-r border-[var(--linea)] bg-[var(--superficie)]">
      <div ref={contenedor} className="relative border-b border-[var(--linea)] px-3 pb-2.5 pt-3">
        <div className="flex items-center justify-between">
          <Wordmark className="h-[18px]" />
          {onColapsar && (
            <button onClick={onColapsar} aria-label="Contraer la navegación"
              className="cursor-pointer rounded p-1 text-[var(--tinta3)] hover:bg-[var(--panel2)] hover:text-[var(--tinta)]">
              <PanelLeftClose className="size-4" />
            </button>
          )}
        </div>
        <button {...propsBoton} onClick={() => varios && setMenuCampo(v => !v)} disabled={!varios}
          aria-expanded={varios ? menuCampo : undefined} aria-controls={varios ? idMenu : undefined}
          className={cn('mt-2.5 flex w-full items-center gap-2 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-[5px] text-left text-xs font-semibold shadow-[var(--sombra)]',
            varios ? 'cursor-pointer hover:bg-[var(--elevado)]' : 'cursor-default')}>
          <MarcaPrioridad s={estadoVista} tamano={11} />
          {enPortafolio ? 'Portafolio completo' : campo.nombre}
          {varios && <span className="ml-auto text-[10px] text-[var(--tinta3)]">▾</span>}
        </button>
        <p className="mt-1 font-mono text-[10px] text-[var(--tinta3)]">
          {enPortafolio
            ? `${campos.length} campos asignados`
            : `${campo.cuenca} · ${varios ? `1 de ${campos.length} asignados` : 'único campo asignado'}`}
        </p>
        {menuCampo && (
          <div id={idMenu} role="group" aria-label="Escoger campo" className="absolute inset-x-3 top-[calc(100%-4px)] z-50 rounded border border-[var(--linea)] bg-[var(--elevado)] p-1 shadow-[var(--sombra2)]">
            {ofrecePortafolio && (<>
            <button onClick={() => { setAlcance('portafolio'); setMenuCampo(false) }}
              className={cn('flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-semibold hover:bg-[var(--panel2)]',
                alcance === 'portafolio' && 'shadow-[inset_2px_0_0_var(--acento)]')}>
              <LayoutGrid className="size-3.5 shrink-0 opacity-70" />
              <span className="flex-1">Portafolio completo
                <span className="block text-[10px] font-normal text-[var(--tinta3)]">
                  los {campos.length} campos sumados, sin salir de esta pantalla
                </span>
              </span>
              {alcance === 'portafolio' && <Check className="size-3 text-acento" />}
            </button>
            <hr className="my-1 border-[var(--linea2)]" />
            </>)}
            <p className="font-cond px-2 pb-1 pt-1 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
              CAMPOS ASIGNADOS · {campos.length}
            </p>
            {campos.map(c => (
              <button key={c.id} onClick={() => { setCampo(c.id); setMenuCampo(false) }}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--panel2)]">
                <MarcaPrioridad s={estados.find(e => e.campoId === c.id)?.severidad ?? 0} tamano={11} />
                <span className="flex-1">{c.nombre}
                  <span className="block text-[10px] text-[var(--tinta3)]">{c.cuenca} · {((b?: number | null) => b === null || b === undefined ? 'sin fiscal' : `${n0(b)} bbl`)(estados.find(e => e.campoId === c.id)?.ayer.bbl)} el último día</span>
                </span>
                {c.id === campoId && alcance === 'campo' && <Check className="size-3 text-acento" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        <p className="font-cond px-2 pb-1 pt-2.5 text-[10px] font-semibold tracking-[.12em] text-[var(--tinta3)]">PANTALLAS</p>
        {entradas.map(e => (
          <button key={e.id} onClick={e.ir} aria-current={e.activo}
            className={cn('flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px]',
              e.activo
                ? 'bg-[var(--panel)] font-medium text-[var(--tinta)] shadow-[inset_2px_0_0_var(--acento)]'
                : 'text-[var(--tinta2)] hover:bg-[var(--panel2)]')}>
            <e.icono className="size-[14px] shrink-0 opacity-70" />
            {e.corto}
          </button>
        ))}

      </div>

      <MenuPerfil />
    </nav>
  )
}
