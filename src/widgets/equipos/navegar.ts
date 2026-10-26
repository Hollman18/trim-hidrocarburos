import { useApp } from '@/app/store'
import { DIAGNOSTICO } from '@/app/url'

/** El equipo abierto y su nivel: «P-201B» es el nivel 3; «P-201B/diagnostico», el 4
 *  (X4 §5.1: el diagnóstico tiene dirección propia). */
export const partirEquipo = (abierto: string): { equipo: string; diagnostico: boolean } => {
  const [equipo = abierto, nivel] = abierto.split('/')
  return { equipo, diagnostico: nivel === DIAGNOSTICO }
}

/** Bajar y subir de nivel dejando una entrada en el historial: «atrás» vuelve al
 *  nivel de antes (la lista, el nivel 3), no a la pantalla anterior. El estado solo
 *  reemplaza la dirección al abrir un equipo; aquí se guarda antes la de ahora. */
export function useIrA() {
  const setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo), campoId = useApp(s => s.campoId), alcance = useApp(s => s.alcance)
  return (destino: { campoId?: string; equipo: string | null; diagnostico?: boolean }) => {
    // Cambiar de campo ya deja su entrada (el estado la agrega): no se repite.
    if (!destino.campoId || (destino.campoId === campoId && alcance === 'campo')) {
      try { history.pushState(null, '', location.hash) } catch { /* sin historial: no pasa nada */ }
    } else setCampo(destino.campoId)
    abrirEquipo(destino.equipo === null ? null : destino.diagnostico ? `${destino.equipo}/${DIAGNOSTICO}` : destino.equipo)
  }
}
