import type { Simbolo } from '@/entities/planta'
import { Area, Bomba, Linea, Pozo, Separador, Tanque, Valvula } from '@/shared/ui/scada'

/** Los símbolos del esquema de planta con el kit SCADA (kit-scada.md §3; v3: nada hecho a mano fuera
 *  del kit). Cada uno va centrado en (0,0), dentro de la caja de su nodo (unos 84 × 56), y la etiqueta
 *  del nodo va debajo (la pone el esquema). Lo que el kit dibuja como equipo (pozo, bomba, separador,
 *  tanque, válvula) va con su símbolo de ISA-5.1 simplificada; lo que es un área de proceso (el
 *  múltiple, la medición, la tea, la subestación, el aire, la salida), con el `Area` del kit y su
 *  palabra en la etiqueta del nodo (el esquema se encoge con el ancho: dentro de la caja, la letra bajaría de 12 px). El estado (la marca y el contorno) lo pinta el esquema en la caja del nodo: aquí, normal. */
export function Glifo({ simbolo, nivel }: { simbolo: Simbolo; nivel?: number; fluido?: string }) {
  switch (simbolo) {
    case 'pozos': return <g>{[-28, 0, 28].map(dx => <Pozo key={dx} x={dx} y={22} />)}</g>
    case 'manifold': return <g><Valvula x={-20} y={-14} /><Valvula x={20} y={-14} /><Area x={-42} y={-2} ancho={84} alto={22} texto="" /></g>
    case 'separador': return <Separador x={-46} y={-18} ancho={92} alto={36} />
    case 'depurador': return <Separador x={-36} y={-16} ancho={72} alto={32} />
    case 'tratador': return <Separador x={-46} y={-20} ancho={92} alto={40} />
    case 'tanque': return <Tanque x={-20} y={-28} ancho={40} alto={56} nivel={nivel ?? null} />
    case 'medicion': return <Area x={-42} y={-14} ancho={84} alto={28} texto="" />
    case 'compresor': return <Bomba x={0} y={0} />
    case 'bomba': return <Bomba x={0} y={0} />
    case 'inyeccion': return <g><Bomba x={-14} y={0} /><Linea puntos={[[8, 0], [40, 0]]} fluido="agua" /></g>
    case 'tea': return <Area x={-30} y={-14} ancho={60} alto={28} texto="" />
    case 'subestacion': return <Area x={-42} y={-14} ancho={84} alto={28} texto="" />
    case 'aire': return <Area x={-30} y={-14} ancho={60} alto={28} texto="" />
    case 'salida': return <Linea puntos={[[-26, 0], [26, 0]]} fluido="crudo" />
  }
}
