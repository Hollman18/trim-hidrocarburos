import { useApp } from '@/app/store'
import { Panel, Cita } from '@/shared/ui/primitivas'
import { PANTALLAS } from '@/app/pantallas'

/** Marcador honesto: la pantalla existe en el diseño validado y está
 *  pendiente de portar desde el prototipo. No es un error. */
export const Pendiente = () => {
  const pantalla = useApp(s => s.pantalla)
  const p = PANTALLAS[pantalla]
  return (
    <Panel titulo="PENDIENTE DE PORTAR">
      <p className="text-[13px]">
        <b>{p?.titulo}</b> está diseñada y validada en el prototipo, y aún no se ha portado a este proyecto.
      </p>
      <Cita>
        Mientras tanto, el diferido y la condición de los equipos de esta área se consultan desde
        las pantallas de riesgo y de diferidos.
      </Cita>
    </Panel>
  )
}
