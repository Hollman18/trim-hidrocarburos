import { useEffect } from 'react'
import { useApp, useAmbito, useRol } from '@/app/store'
import { useSubpantallas, recordarSub } from '@/app/grupos'
import { GRUPOS, PANTALLAS, grupoDe, nombreGrupo } from '@/app/pantallas'
import { cn } from '@/shared/lib/cn'

/** Las subpantallas de «Pozos y equipos»: solo las que el rol usa y el campo
 *  tiene configuradas. Lo que el rol usa pero el campo no tiene se dice, y si
 *  se estaba en una que este campo no tiene (uno sin electrosumergibles), se
 *  pasa a la primera que sí y también se dice: nada se mueve en silencio. */
export function Subpantallas() {
  const pantalla = useApp(s => s.pantalla)
  const setPantalla = useApp(s => s.setPantalla)
  const redirigir = useApp(s => s.redirigir)
  const aviso = useApp(s => s.avisoSub)
  const rol = useRol(); const ambito = useAmbito()
  const grupo = grupoDe(pantalla)
  const subs = useSubpantallas(grupo)
  const faltan = grupo ? GRUPOS[grupo]!.miembros.filter(p => rol.pantallas.includes(p) && !subs.includes(p)) : []

  useEffect(() => {
    if (!grupo) return
    if (subs.length && !subs.includes(pantalla)) {
      // Se abre la que el rol prefiere (su orden), no la primera pestaña.
      const destino = rol.pantallas.find(p => subs.includes(p)) ?? subs[0]!
      redirigir(destino, `${ambito.titulo} no tiene ${PANTALLAS[pantalla]!.corto.toLowerCase()} en su perfil: se abrió ${PANTALLAS[destino]!.corto.toLowerCase()}.`)
    }
    // Lo que se abrió por una redirección no cuenta como la elección del rol.
    else if (!aviso) recordarSub(rol.id, pantalla)
  }, [grupo, pantalla, subs, rol.id, rol.pantallas, redirigir, ambito.titulo, aviso])

  if (!grupo || (subs.length < 2 && !faltan.length && !aviso)) return null
  return (
    <div className="no-imprimir mb-2.5">
      {subs.length > 1 && (
        // Cada una lleva a otra pantalla: es navegación, no pestañas ARIA (que
        // prometen flechas y un tabpanel). La activa se dice con aria-current.
        <div role="group" aria-label={nombreGrupo(grupo, rol.pantallas)} data-subpantallas className="flex flex-wrap gap-1">
          {subs.map(id => (
            <button key={id} aria-current={pantalla === id ? 'page' : undefined} onClick={() => setPantalla(id)}
              className={cn('flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 text-[12px]',
                pantalla === id ? 'border-[var(--tinta)] bg-[var(--panel)] font-semibold' : 'border-[var(--linea2)] text-[var(--tinta2)] hover:bg-[var(--panel2)]')}>
              {(() => { const I = PANTALLAS[id]!.icono; return <I className="size-3.5 opacity-70" /> })()}
              {PANTALLAS[id]!.corto}
            </button>
          ))}
        </div>
      )}
      {(aviso || faltan.length > 0) && (
        <p className="mt-1 text-[11px] text-[var(--tinta3)]" role="status">
          {/* Que falte la pestaña ya se ve: basta decir por qué. */}
          {aviso ?? `${ambito.titulo} no tiene ${faltan.map(p => PANTALLAS[p]!.corto.toLowerCase()).join(' ni ')} en su perfil.`}
        </p>
      )}
    </div>
  )
}
