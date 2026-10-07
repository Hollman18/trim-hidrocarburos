/** Los insumos del motor: lo que el backend entrega de los equipos
 *  (CONTRATO.md · «Insumos que el backend entrega») más el programa de paradas
 *  de la configuración de arranque. El motor no los importa: los lee de aquí,
 *  y aquí los pone quien arranca.
 *
 *  Por qué: si el motor importara `datos/*`, cada pantalla que importa un
 *  nombre del motor (NOMBRE_PARTE, TIPO_CAUSA…) arrastraría la historia de
 *  demostración al paquete, y un build conectado al servidor seguiría
 *  mandándola a cada navegador. Así, el demo la instala al arrancar
 *  (`shared/api/fuente.ts`, con import dinámico) y un build de producto ni
 *  siquiera la genera.
 *
 *  Leer antes de instalar falla con un error que lo dice: nunca se calcula con
 *  listas vacías, que darían ceros donde no hay dato. */
import type { Pozo, EventoPozo, EventoServicio, ProduccionMes } from './pozos'
import type { EventoBomba } from './bombas'
import type { ParadaProgramada } from './configuracion'

/** Cómo se mide la producción fiscal de un campo: el computador de flujo y
 *  de dónde sale el corte de agua. Es del registro del punto de medición. */
export interface OrigenPmo { fuente: string; bsw: 'analizador' | 'laboratorio' }

export interface Insumos {
  /** `GET /api/campos/:campo/pozos` de todos los campos. */
  pozos: Pozo[]
  /** `GET /api/campos/:campo/pozos/eventos`. */
  eventosPozos: EventoPozo[]
  /** `GET /api/campos/:campo/servicios/eventos`. */
  eventosServicios: EventoServicio[]
  /** `GET /api/campos/:campo/produccion-diaria`. */
  produccionDiaria: ProduccionMes[]
  /** Del registro del punto de medición oficial de cada campo. */
  origenPmo: Record<string, OrigenPmo>
  /** `GET /api/campos/:campo/bombas/:equipo/paradas` de todas las bombas. */
  paradasBombas: EventoBomba[]
  /** El programa de paradas de la configuración de arranque (`config.programa`
   *  de la versión vigente de `GET /api/configuracion/historial`). */
  programa: ParadaProgramada[]
}

let instalados: Insumos | undefined

/** Pone los insumos. Una sola vez: los valores derivados (índices, calendario,
 *  configuración de arranque) se calculan la primera vez que se piden, y con
 *  otros insumos debajo quedarían viejos sin que nadie lo notara. */
export function instalarInsumos(i: Insumos): void {
  if (instalados && instalados !== i) throw new Error('Los insumos del motor ya están instalados: cambiarlos dejaría viejos los cálculos que ya se hicieron con ellos.')
  instalados = i
}

/** ¿Ya hay insumos? Para decidir sin provocar el error. */
export const hayInsumos = () => instalados !== undefined

/** Los insumos instalados. */
export function insumos(): Insumos {
  if (!instalados) throw new Error('El motor no tiene insumos: se instalan con instalarInsumos() antes de calcular (en el navegador lo hace main.tsx; en los scripts, al arrancar).')
  return instalados
}

/** Un valor que sale de los insumos, calculado la primera vez que se pide y
 *  el mismo objeto de ahí en adelante (las cachés del motor van por identidad). */
export function perezoso<T>(calcular: () => T): () => T {
  let listo = false, valor: T
  return () => {
    if (!listo) { valor = calcular(); listo = true }
    return valor
  }
}
