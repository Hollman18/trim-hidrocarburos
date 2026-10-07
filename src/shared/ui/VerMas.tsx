import { Boton } from './primitivas'

/** «ver N más» / «ver menos», con lo que da `useVerMas` (listaCorta.ts). */
export function VerMas({ ocultas, abierto, onAlternar }: { ocultas: number; abierto: boolean; onAlternar: () => void }) {
  if (ocultas === 0) return null
  return (
    <Boton variante="chico" className="mt-1.5" aria-expanded={abierto} onClick={onAlternar}>
      {abierto ? 'ver menos' : `ver ${ocultas} más`}
    </Boton>
  )
}
