import { useEffect } from 'react'
import { useApp, useAmbito, useRol } from '@/app/store'
import { useSubpantallas, recordarSub } from '@/app/grupos'
import { GRUPOS, PANTALLAS, grupoDe } from '@/app/pantallas'

/** Las subpantallas de cada puerta ya no van en pestañas arriba: se listan en
 *  el panel lateral, debajo de su puerta (X5 §4.1). Aquí queda lo que no se
 *  ve en el panel: solo se ofrecen las que el rol usa y el campo tiene
 *  configuradas; lo que el rol usa pero el campo no tiene se dice, y si se
 *  estaba en una que este campo no tiene (uno sin electrosumergibles), se pasa
 *  a la que el rol prefiere y también se dice: nada se mueve en silencio. */
export function Subpantallas() {
  const pantalla = useApp(s => s.pantalla)
  const redirigir = useApp(s => s.redirigir)
  const aviso = useApp(s => s.avisoSub)
  const rol = useRol(); const ambito = useAmbito()
  const grupo = grupoDe(pantalla)
  const subs = useSubpantallas(grupo)
  const faltan = grupo ? GRUPOS[grupo]!.miembros.filter(p => rol.pantallas.includes(p) && !subs.includes(p)) : []

  useEffect(() => {
    if (!grupo) return
    if (subs.length && !subs.includes(pantalla)) {
      // Se abre la que el rol prefiere (su orden), no la primera de la puerta.
      const destino = rol.pantallas.find(p => subs.includes(p)) ?? subs[0]!
      redirigir(destino, `${ambito.titulo} no tiene ${PANTALLAS[pantalla]!.corto.toLowerCase()} en su perfil: se abrió ${PANTALLAS[destino]!.corto.toLowerCase()}.`)
    }
    // Lo que se abrió por una redirección no cuenta como la elección del rol.
    else if (!aviso) recordarSub(rol.id, pantalla)
  }, [grupo, pantalla, subs, rol.id, rol.pantallas, redirigir, ambito.titulo, aviso])

  if (!grupo || (!faltan.length && !aviso)) return null
  return (
    <p className="no-imprimir mb-3 text-[14px] text-[var(--tinta2)]" role="status">
      {/* Que falte en el panel ya se ve: basta decir por qué. */}
      {aviso ?? `${ambito.titulo} no tiene ${faltan.map(p => PANTALLAS[p]!.corto.toLowerCase()).join(' ni ')} en su perfil.`}
    </p>
  )
}
