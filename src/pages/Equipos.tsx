import { useEffect } from 'react'
import { useApp, useRol } from '@/app/store'
import { abreNivel3 } from '@/app/url'
import { ListaEquipos } from '@/widgets/equipos/Lista'
import { EquiposGerente } from '@/widgets/equipos/Gerente'
import { NivelTecnico } from '@/widgets/equipos/Nivel3'
import { useFiltrosEquipos } from '@/widgets/equipos/filtros'

/** Equipos (experiencia v2, C4; X4 §3.6, §3.7 y §5): Bombas, Electrosumergibles,
 *  Pozos y Superficie en una sola lista, y al abrir un equipo, su nivel 3 técnico
 *  (y su diagnóstico, el 4) como una vista entera. Al gerente, su versión
 *  ejecutiva: lo que pesa, y cada equipo abre su ficha ejecutiva (el panel). */
export function Equipos() {
  const equipoAbierto = useApp(s => s.equipoAbierto)
  const rol = useRol()
  if (equipoAbierto && abreNivel3(rol)) return <NivelTecnico abierto={equipoAbierto} />
  if (rol.nivel === 'decision') return <EquiposGerente />
  return <ListaEquipos />
}

/** La dirección de la pantalla «Superficie», que se fundió en Equipos (X4 §3.6):
 *  abre la lista con el filtro de servicios y proceso. */
export function EquiposDeSuperficie() {
  const poner = useFiltrosEquipos(s => s.poner), limpiar = useFiltrosEquipos(s => s.limpiar)
  // El filtro es de esta dirección: al salir de ella no se queda puesto en la lista de Equipos.
  useEffect(() => { poner({ tipo: 'superficie', estado: 'todos', tren: 'todos', busca: '' }); return limpiar }, [poner, limpiar])
  return <Equipos />
}
