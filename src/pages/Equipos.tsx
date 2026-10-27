import { useEffect } from 'react'
import { useApp, useRol } from '@/app/store'
import { abreNivel3 } from '@/app/url'
import { ListaEquipos } from '@/widgets/equipos/Lista'
import { NivelTecnico } from '@/widgets/equipos/Nivel3'
import { useFiltrosEquipos } from '@/widgets/equipos/filtros'

/** Equipos (experiencia v2, C4; X4 §3.6, §3.7 y §5): Bombas, Electrosumergibles,
 *  Pozos y Superficie en una sola lista, y al abrir un equipo, su nivel 3 técnico
 *  (y su diagnóstico, el 4) como una vista entera. B3 · A-15: las pantallas Bombas y
 *  Electrosumergibles se borraron; sus direcciones abren esta lista con el filtro puesto. */
export function Equipos() {
  const equipoAbierto = useApp(s => s.equipoAbierto)
  const tomar = useApp(s => s.tomarFiltroEquipos), filtro = useApp(s => s.filtroEquipos)
  const poner = useFiltrosEquipos(s => s.poner)
  const rol = useRol()
  useEffect(() => {
    const f = tomar()
    if (f) poner({ estado: 'todos', tipo: f.tipo ?? 'todos', tren: f.tren ?? 'todos', busca: '' })
  }, [filtro, tomar, poner])
  if (equipoAbierto && abreNivel3(rol)) return <NivelTecnico abierto={equipoAbierto} />
  return <ListaEquipos />
}
