import { useState } from 'react'
import { ChevronRight, Monitor, Sun, Moon, UserRound, ArrowLeft, BookOpen, PanelLeftClose } from 'lucide-react'
import { useApp, useRol, usePersona } from '@/app/store'
import { ROLES_VISIBLES } from '@/entities/roles'
import { AREAS } from '@/entities/tipos'
import { personaDelRol } from '@/entities/usuarios'
import { PANTALLAS, fueraDePuertas } from '@/app/pantallas'
import { pantallaVisible } from '@/shared/config/producto'
import { cn } from '@/shared/lib/cn'
import { useDesplegable } from '@/shared/ui/foco'
import { useUsuarios } from '@/shared/api/usuarios'
import { useSesion } from '@/shared/api/sesion'

/** El menú de roles se lee como un organigrama: la dirección arriba
 *  y cada área debajo con sus cargos. Las áreas sin cargos visibles no salen. */
const ORGANIGRAMA = AREAS
  .map(a => ({ ...a, roles: ROLES_VISIBLES.filter(r => r.area === a.id) }))
  .filter(a => a.roles.length > 0)

const TEMAS = [
  { id: 'system', nombre: 'Sistema', Icono: Monitor },
  { id: 'light', nombre: 'Claro', Icono: Sun },
  { id: 'dark', nombre: 'Oscuro', Icono: Moon },
] as const

/** Lo que se lista en el menú de la persona por fuera de sus puertas: para el
 *  gerente, «Metas y accesos» (X4 §3.2); la configuración en solo lectura de
 *  producción y confiabilidad. Nada de lo que el rol tenía se pierde. */
const nombreFuera = (rolId: string, id: string) =>
  rolId === 'ger' && id === 'configuracion' ? 'Metas y accesos' : PANTALLAS[id]!.corto

/** La persona, al pie del panel (X5 §4.1): sus iniciales, su nombre y su rol.
 *  Abre su menú: Mi perfil, la introducción, cambiar de rol y la apariencia.
 *  Cambiar de rol es una acción deliberada dentro, no una lista plana. */
export function MenuPerfil({ variante = 'panel', onPlegar }: {
  /** panel: el pie del panel desplegado; plegado: solo las iniciales; banda: las iniciales en la banda del teléfono. */
  variante?: 'panel' | 'plegado' | 'banda'
  /** Plegar el panel (el botón del pie, junto a la persona). */
  onPlegar?: () => void
}) {
  const setRol = useApp(s => s.setRol), setPantalla = useApp(s => s.setPantalla), tema = useApp(s => s.tema), setTema = useApp(s => s.setTema), abrirOnboarding = useApp(s => s.abrirOnboarding), pantalla = useApp(s => s.pantalla)
  const rol = useRol(); const persona = usePersona()
  const usuarios = useUsuarios()
  const empresa = useSesion(s => s.ctx.config.empresa)
  // Un desplegable, no un menú ARIA: adentro hay datos de la persona y botones de tema.
  const { abierto, setAbierto, contenedor, id, propsBoton } = useDesplegable()
  const [vista, setVista] = useState<'menu' | 'roles'>('menu')
  const fuera = fueraDePuertas(rol).filter(pantallaVisible)
  const quien = `${persona.nombre} · ${rol.nombre}`

  const avatar = (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-[var(--marca-capa)] font-semibold text-white',
      variante === 'banda' ? 'size-[34px] text-[13px]' : 'size-[38px] text-[14px]')}>{persona.iniciales}</span>
  )

  return (
    <div ref={contenedor} className={cn('relative', variante === 'panel' && 'flex items-center gap-1')}>
      {/* Cada vez que se abre, empieza en el menú y no en la lista de roles de la vez anterior. */}
      <button {...propsBoton} onClick={() => { setVista('menu'); setAbierto(v => !v) }}
        aria-label={quien} title={variante === 'panel' ? undefined : quien}
        className={cn('flex cursor-pointer items-center rounded-[14px] text-left text-white',
          variante === 'panel' ? 'min-w-0 flex-1 gap-3 px-1.5 py-1.5 hover:bg-white/[.08]' : 'toque rounded-full p-0.5 hover:bg-white/[.10]')}>
        {avatar}
        {variante === 'panel' && (
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[15px] font-semibold leading-tight">{persona.nombre}</b>
            <small className="block text-[13px] leading-snug text-[var(--marca-tenue)]">{rol.nombre}{persona.sinAcceso ? ' · sin acceso activo' : ''}</small>
          </span>
        )}
      </button>
      {variante === 'panel' && onPlegar && (
        <button onClick={onPlegar} aria-label="Plegar el panel" title="Plegar el panel ( [ )"
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--marca-tenue)] hover:bg-white/[.08] hover:text-white">
          <PanelLeftClose className="size-5" />
        </button>
      )}

      {abierto && (
        <div id={id} role="group" aria-label="Mi perfil"
          className={cn('absolute z-[130] w-[284px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[16px] bg-[var(--elevado)] text-[var(--tinta)] shadow-[var(--sombra-flota)]',
            variante === 'panel' && 'bottom-[calc(100%+8px)] left-0',
            variante === 'plegado' && 'bottom-0 left-[calc(100%+14px)]',
            variante === 'banda' && 'right-0 top-[calc(100%+10px)]')}>
          {vista === 'menu' ? (
            <>
              <div className="border-b border-[var(--linea2)] px-4 py-3">
                <b className="block text-[15px]">{persona.nombre}</b>
                <span className="block text-[14px] text-[var(--tinta2)]">{rol.nombre}{persona.sinAcceso ? ' · sin acceso activo' : ''}</span>
                <span className="mt-0.5 block text-[13px] text-[var(--tinta2)]">
                  {AREAS.find(a => a.id === rol.area)?.nombre} · {empresa}
                </span>
              </div>
              <div className="p-1.5">
                <button onClick={() => { setPantalla('perfil'); setAbierto(false) }} aria-current={pantalla === 'perfil' ? 'page' : undefined}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2 text-left text-[15px] hover:bg-[var(--panel2)]">
                  <UserRound className="size-[18px] text-[var(--tinta2)]" /> Mi perfil
                </button>
                {fuera.map(p => {
                  const I = PANTALLAS[p]!.icono
                  return (
                    <button key={p} onClick={() => { setPantalla(p); setAbierto(false) }} aria-current={pantalla === p ? 'page' : undefined}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2 text-left text-[15px] hover:bg-[var(--panel2)]">
                      <I className="size-[18px] text-[var(--tinta2)]" /> {nombreFuera(rol.id, p)}
                    </button>
                  )
                })}
                {/* Las señas van sobre el inicio de verdad del rol (X4 §6.2): se pasa a él y se abren. */}
                <button onClick={() => { setPantalla(rol.inicio); abrirOnboarding(); setAbierto(false) }}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2 text-left text-[15px] hover:bg-[var(--panel2)]">
                  <BookOpen className="size-[18px] text-[var(--tinta2)]" /> Introducción
                </button>
                <button onClick={() => setVista('roles')}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2 text-left text-[15px] hover:bg-[var(--panel2)]">
                  <ArrowLeft className="size-[18px] rotate-180 text-[var(--tinta2)]" />
                  <span className="flex-1">Cambiar de rol</span>
                  <ChevronRight className="size-4 text-[var(--tinta3)]" />
                </button>
              </div>
              <div className="border-t border-[var(--linea2)] p-3">
                <p className="px-0.5 pb-2 text-[13px] font-semibold text-[var(--tinta2)]">Apariencia</p>
                {/* El escogido va como lo seleccionado de B: el aro y el tono de la mano. */}
                <div className="grid grid-cols-3 gap-1 rounded-full bg-[var(--panel2)] p-1 shadow-[inset_0_0_0_1px_var(--linea)]">
                  {TEMAS.map(({ id, nombre, Icono }) => (
                    <button key={id} onClick={() => setTema(id)} aria-pressed={tema === id}
                      className={cn('flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-1 py-1.5 text-[13px]',
                        tema === id ? 'bg-[var(--primario)] font-semibold text-[var(--primario-sobre)]' : 'text-[var(--tinta)] hover:bg-[var(--panel)]')}>
                      <Icono className="size-3.5" /> {nombre}
                    </button>
                  ))}
                </div>
              </div>
              {/* «Cerrar sesión» vuelve cuando exista la sesión del servidor (CONTRATO.md):
                  un botón que no hace nada promete algo que el front no puede cumplir. */}
            </>
          ) : (
            <>
              <button onClick={() => setVista('menu')}
                className="flex min-h-11 w-full cursor-pointer items-center gap-2 border-b border-[var(--linea2)] px-4 py-2 text-left text-[15px] font-semibold hover:bg-[var(--panel2)]">
                <ArrowLeft className="size-4 text-[var(--tinta2)]" /> Cambiar de rol
              </button>
              <div className="max-h-[52vh] overflow-y-auto p-1.5">
                {ORGANIGRAMA.map(area => (
                  <div key={area.id} className="mb-1.5 last:mb-0">
                    <p className="px-3 pb-1 pt-1.5 text-[13px] font-semibold text-[var(--tinta2)]">
                      {area.nombre}
                    </p>
                    <div className={cn(area.id !== 'direccion' && 'ml-3 border-l border-[var(--linea2)] pl-1')}>
                      {area.roles.map(r => (
                        <button key={r.id} onClick={() => { setRol(r.id); setAbierto(false) }} aria-current={r.id === rol.id ? 'true' : undefined}
                          className={cn('w-full cursor-pointer rounded-[12px] px-3 py-2 text-left text-[15px] hover:bg-[var(--panel2)]',
                            r.id === rol.id && 'bg-[var(--marca-suave)] font-semibold')}>
                          {r.nombre}
                          <span className="block text-[13px] font-normal text-[var(--tinta2)]">
                            {personaDelRol(usuarios, r.id)?.nombre ?? 'nadie asignado'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="border-t border-[var(--linea2)] px-4 py-2.5 text-[13px] leading-relaxed text-[var(--tinta2)]">
                Período y unidades se mantienen; el campo, si está asignado.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
