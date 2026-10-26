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
      <p className="text-[15px]">
        <b>{p?.titulo}</b>: validada en el prototipo, falta portarla.
      </p>
      <Cita>Mientras tanto: Riesgo y Diferidos.</Cita>
    </Panel>
  )
}
