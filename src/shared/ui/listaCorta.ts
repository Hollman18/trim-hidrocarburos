import { useState } from 'react'

export const VISIBLES = 5

/** Una lista larga muestra cinco y dice cuántas faltan (`VerMas`). Nunca
 *  esconde una fila de prioridad 1 (ISA-18.2: una alarma no se tapa): si queda
 *  después de la quinta, se muestra igual. Lo que no se ve en la pantalla sí
 *  sale en el papel: quien llama dibuja `resto` dentro de un `.solo-impresion`,
 *  porque el informe es la pantalla impresa y una lista cortada en silencio engaña. */
export function useVerMas<T>(lista: readonly T[], opciones?: { n?: number; prioridad?: (x: T) => number }) {
  const [abierto, setAbierto] = useState(false)
  const n = opciones?.n ?? VISIBLES
  const prioridad = opciones?.prioridad
  const queda = (x: T, i: number) => i < n || (prioridad !== undefined && prioridad(x) === 1)
  const cerrado = lista.filter(queda)
  const resto = lista.filter((x, i) => !queda(x, i))
  return {
    visibles: abierto ? lista : cerrado,
    /** Lo que la pantalla no muestra: va al papel. */
    resto: abierto ? [] : resto,
    ocultas: resto.length,
    abierto,
    alternar: () => setAbierto(v => !v),
  }
}
