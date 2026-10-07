import { useMemo } from 'react'
import { useAmbito, useRol } from './store'
import { perfilDe, tienePerfil, type PerfilCampo } from '@/entities/configuracion'
import { GRUPOS, grupoDe } from '@/app/pantallas'
import { pantallaVisible } from '@/shared/config/producto'
import { useSesion } from '@/shared/api/sesion'

/** ¿Hay en el alcance algún campo con ese tipo de equipo? Los pozos siempre. */
export const hayEquipo = (pantalla: string, perfiles: PerfilCampo[]) =>
  pantalla === 'bombas' ? perfiles.some(p => p.bombas)
    : pantalla === 'esp' ? perfiles.some(p => p.electrosumergibles)
      : true

/** Las subpantallas de un grupo que se ofrecen ahora: las que el rol tiene y
 *  el campo (o alguno del portafolio) tiene configuradas, en el orden del rol. */
export function useSubpantallas(grupo: string | undefined): string[] {
  const rol = useRol(); const ambito = useAmbito()
  const config = useSesion(s => s.ctx.config)
  const campos = ambito.campos.map(c => c.id).join(',')
  // Memorizado con dependencias primitivas: el mismo arreglo mientras nada cambie.
  return useMemo(() => {
    if (!grupo) return []
    const perfiles = campos.split(',').map(id => perfilDe(config, id))
    return GRUPOS[grupo]!.miembros.filter(p => rol.pantallas.includes(p) && pantallaVisible(p) && hayEquipo(p, perfiles))
  }, [grupo, rol, campos, config])
}

/** Los campos del alcance sin perfil firmado en la configuración: de ellos no
 *  se sabe qué equipos tienen (`perfilDe` no les inventa ninguno), y la
 *  pantalla lo dice en vez de «no tiene esos equipos». */
export function useSinPerfil(): string[] {
  const ambito = useAmbito()
  const config = useSesion(s => s.ctx.config)
  return ambito.campos.filter(c => !tienePerfil(config, c.id)).map(c => c.nombre)
}

/** La última subpantalla que este rol abrió en cada grupo. Es una comodidad
 *  de quien la usa: vive en su navegador y, si no se puede leer, no pasa nada. */
const clave = (rolId: string, grupo: string) => `trim.sub.${rolId}.${grupo}`
export const recordarSub = (rolId: string, pantalla: string) => {
  const g = grupoDe(pantalla)
  if (!g) return
  try { localStorage.setItem(clave(rolId, g), pantalla) } catch { /* modo privado */ }
}
export const ultimaSub = (rolId: string, grupo: string): string | null => {
  try { return localStorage.getItem(clave(rolId, grupo)) } catch { return null }
}
