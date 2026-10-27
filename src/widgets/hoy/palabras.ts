import { useApp, useRol } from '@/app/store'
import type { Frase, Destino } from '@/shared/api/hoy'
import type { CondicionFranja } from '@/shared/api/condiciones'
import { useFiltrosEquipos } from '@/widgets/equipos/filtros'

/** La misma frase, en una línea de texto (para el nombre accesible). */
export const enLinea = (f?: Frase) => (f ?? []).map(x => (typeof x === 'string' ? x : x.b)).join('')

/** La palabra de la condición, al lado de su marca (X5 §5.6: siempre con la palabra en listas y fichas). */
export const PALABRA: Record<CondicionFranja, string> = {
  interlock: 'Interlock', alarma: 'Alarma', atencion: 'Atención', aviso: 'Aviso', 'sin-comunicacion': 'Sin comunicación',
}

/** Lleva a un lugar del producto: la pantalla que el rol tiene para eso (la primera
 *  que le toque de la lista), o la ficha del equipo. */
export function useIr() {
  const rol = useRol()
  const setPantalla = useApp(s => s.setPantalla), setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo)
  const ir = (ps: string[]) => setPantalla(ps.find(p => rol.pantallas.includes(p)) ?? ps[0]!)
  return (d: Destino) => {
    switch (d.a) {
      case 'equipo': setCampo(d.campoId); abrirEquipo(d.equipo); return
      case 'paradas': return ir(['causa'])
      case 'planta': return ir(['plantaViva', 'planta'])
      case 'agua': if (!rol.pantallas.includes('agua') && !rol.pantallas.includes('plantaViva')) useFiltrosEquipos.getState().poner({ tren: 'agua' }); return ir(['agua', 'plantaViva', 'equipos'])
      // B3 · A-01: el turno vive en Hoy.
      case 'turno': return ir(['hoy'])
      case 'asignacion': return ir(['produccion'])
      case 'metas': return ir(['configuracion'])
      // FF-3: los planes se abren en su tarjeta de Hoy.
      case 'planes': return ir(['hoy', 'causa'])
      // P-10: la lista de Equipos, con el tren de esos equipos.
      case 'equipos': useFiltrosEquipos.getState().poner({ tren: d.tren ?? 'todos' }); return ir(['equipos'])
    }
  }
}

/** La vibración corta al registrar una respuesta (X5 §3.5: 10 ms, nunca por una alarma). */
export const vibrar = () => { try { navigator.vibrate?.(10) } catch { /* el navegador no la deja */ } }
