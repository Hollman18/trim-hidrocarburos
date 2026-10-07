import { useState } from 'react'
import { ChevronRight, Monitor, Sun, Moon, UserRound, ArrowLeft, BookOpen } from 'lucide-react'
import { useApp, useRol, usePersona } from '@/app/store'
import { ROLES_VISIBLES } from '@/entities/roles'
import { AREAS } from '@/entities/tipos'
import { personaDelRol } from '@/entities/usuarios'
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

/** Patrón de aplicación normal: el perfil abre MI perfil.
 *  Cambiar de rol es una acción deliberada dentro, no una lista plana. */
export function MenuPerfil({ colapsado = false }: { colapsado?: boolean }) {
  const setRol = useApp(s => s.setRol), setPantalla = useApp(s => s.setPantalla), tema = useApp(s => s.tema), setTema = useApp(s => s.setTema), abrirOnboarding = useApp(s => s.abrirOnboarding)
  const rol = useRol(); const persona = usePersona()
  const usuarios = useUsuarios()
  const empresa = useSesion(s => s.ctx.config.empresa)
  // Un desplegable, no un menú ARIA: adentro hay datos de la persona y botones de tema.
  const { abierto, setAbierto, contenedor, id, propsBoton } = useDesplegable()
  const [vista, setVista] = useState<'menu' | 'roles'>('menu')

  return (
    <div ref={contenedor} className={cn('relative border-t border-[var(--linea)]', colapsado ? 'w-full p-2' : 'p-2')}>
      {/* Cada vez que se abre, empieza en el menú y no en la lista de roles de la vez anterior. */}
      <button {...propsBoton} onClick={() => { setVista('menu'); setAbierto(v => !v) }}
        aria-label={`${persona.nombre} · ${rol.nombre}`}
        title={colapsado ? `${persona.nombre} · ${rol.nombre}` : undefined}
        className={cn('flex w-full cursor-pointer items-center rounded border border-transparent text-left hover:border-[var(--linea2)] hover:bg-[var(--panel2)]',
          colapsado ? 'justify-center p-1' : 'gap-2.5 p-1.5')}>
        <span className="font-cond grid size-7 shrink-0 place-items-center rounded-sm bg-marca-1 text-[11px] font-semibold text-white">
          {persona.iniciales}
        </span>
        {!colapsado && (
          <>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-xs font-semibold leading-tight">{persona.nombre}</b>
              <small className="block truncate text-[10px] text-[var(--tinta3)]">{rol.nombre}{persona.sinAcceso ? ' · sin acceso activo' : ''}</small>
            </span>
            <span className="text-[10px] text-[var(--tinta3)]">▴</span>
          </>
        )}
      </button>

      {abierto && (
        <div id={id} role="group" aria-label="Mi perfil"
          className={cn('absolute bottom-[calc(100%+4px)] z-50 overflow-hidden rounded border border-[var(--linea)] bg-[var(--elevado)] shadow-[var(--sombra2)]',
            colapsado ? 'left-2 w-[228px]' : 'inset-x-2')}>
          {vista === 'menu' ? (
            <>
              <div className="border-b border-[var(--linea2)] px-3 py-2.5">
                <b className="block text-[13px]">{persona.nombre}</b>
                <span className="block text-[11px] text-[var(--tinta3)]">{rol.nombre}{persona.sinAcceso ? ' · nadie con acceso activo tiene este rol' : ''}</span>
                <span className="mt-0.5 block font-mono text-[10px] text-[var(--tinta3)]">
                  {AREAS.find(a => a.id === rol.area)?.nombre} · {empresa}
                </span>
              </div>
              <div className="p-1">
                <button onClick={() => { setPantalla('perfil'); setAbierto(false) }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-left text-xs hover:bg-[var(--panel2)]">
                  <UserRound className="size-[15px] opacity-70" /> Mi perfil
                </button>
                <button onClick={() => { abrirOnboarding(); setAbierto(false) }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-left text-xs hover:bg-[var(--panel2)]">
                  <BookOpen className="size-[15px] opacity-70" /> Ver la introducción
                </button>
                <button onClick={() => setVista('roles')}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-left text-xs hover:bg-[var(--panel2)]">
                  <ArrowLeft className="size-[15px] rotate-180 opacity-70" />
                  <span className="flex-1">Cambiar de rol</span>
                  <ChevronRight className="size-3 text-[var(--tinta3)]" />
                </button>
              </div>
              <div className="border-t border-[var(--linea2)] p-2">
                <p className="font-cond px-1 pb-1.5 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">APARIENCIA</p>
                <div className="flex gap-1">
                  {TEMAS.map(({ id, nombre, Icono }) => (
                    <button key={id} onClick={() => setTema(id)} aria-pressed={tema === id}
                      className={cn('flex flex-1 cursor-pointer flex-col items-center gap-1 rounded border px-1 py-1.5 text-[10px]',
                        tema === id ? 'border-[var(--tinta)] bg-[var(--panel)] font-semibold text-[var(--tinta)]'
                          : 'border-[var(--linea2)] hover:bg-[var(--panel2)]')}>
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
                className="flex w-full cursor-pointer items-center gap-2 border-b border-[var(--linea2)] px-3 py-2 text-left text-xs hover:bg-[var(--panel2)]">
                <ArrowLeft className="size-3.5 opacity-70" /> Cambiar de rol
              </button>
              <div className="max-h-[52vh] overflow-y-auto p-1">
                {ORGANIGRAMA.map(area => (
                  <div key={area.id} className="mb-1.5 last:mb-0">
                    <p className="font-cond px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[.11em] text-[var(--tinta3)]">
                      {area.nombre}
                    </p>
                    <div className={cn(area.id !== 'direccion' && 'ml-2.5 border-l border-[var(--linea2)] pl-1')}>
                      {area.roles.map(r => (
                        <button key={r.id} onClick={() => { setRol(r.id); setAbierto(false) }}
                          className={cn('w-full cursor-pointer rounded px-2.5 py-1.5 text-left text-xs hover:bg-[var(--panel2)]',
                            r.id === rol.id && 'font-semibold shadow-[inset_2px_0_0_var(--acento)]')}>
                          {r.nombre}
                          <span className="block text-[10px] font-normal text-[var(--tinta3)]">
                            {personaDelRol(usuarios, r.id)?.nombre ?? 'nadie con acceso a este rol'} · {r.pantallas.length} pantallas
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="border-t border-[var(--linea2)] px-3 py-2 text-[10px] leading-relaxed text-[var(--tinta3)]">
                Al cambiar de rol no cambian campo, mes ni unidades.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
