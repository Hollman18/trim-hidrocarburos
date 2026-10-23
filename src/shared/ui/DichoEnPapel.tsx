import type { ReactNode } from 'react'

/* D2 en el papel (QA-R, vecino 3): lo que una persona escribió con sus palabras
   (la respuesta de una parada, el motivo de una corrección o de un retiro,
   «Algo está mal», la nota de un análisis) se queda en TRIM. En la pantalla, para
   quien tiene permiso de verlo, sale tal cual; en el papel y en el PDF de
   «Exportar» (que queda registrado como informe con folio) va solo quién, por su
   rol («Lo contestó el operador de campo»): ni el texto libre ni el nombre. Las
   palabras del papel están en `papel.ts`. */

/** Lo de la pantalla y, en su lugar, lo del papel. */
export function DichoEnPapel({ children, papel }: { children: ReactNode; papel: ReactNode }) {
  return (
    <>
      <span className="print:hidden">{children}</span>
      <span className="hidden print:inline" data-en-papel>{papel}</span>
    </>
  )
}
