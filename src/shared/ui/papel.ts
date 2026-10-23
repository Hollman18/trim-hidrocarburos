import { rolExacto } from '@/entities/roles'
import { rolDeQuien, textoDePersona } from '@/entities/causa-senal'
import type { Causa } from '@/entities/causa-senal'

/* D2 en el papel (QA-R, vecino 3): lo que una persona escribió con sus palabras
   se queda en TRIM. En el papel y en el PDF de «Exportar» va quién, por su rol.
   El componente que pone lo de la pantalla y, en su lugar, lo del papel está en
   `DichoEnPapel.tsx`; aquí, las palabras. */

/** Quien dijo algo, por su rol y sin su nombre: «el supervisor de operaciones».
 *  Con el «por» de una respuesta («Nombre · rol») o con el id del rol de una
 *  clasificación (`DatoClasificado.rol`, `RevisionAnh.rol`). */
export function rolEnPapel(x: { por?: string; rol?: string }): string {
  const r = x.rol ? rolExacto(x.rol) : undefined
  if (r) return rolDeQuien(` · ${r.nombre.toLowerCase()}`)
  return x.por ? rolDeQuien(x.por) : 'una persona del campo'
}

/** El texto de una causa para el papel: si es lo que respondió una persona tal
 *  cual (una parada declarada), «Lo contestó el operador de campo»; si no, el de TRIM. */
export const causaEnPapel = (c: Pick<Causa, 'texto' | 'declarado'>): string =>
  textoDePersona(c) ? `Lo contestó ${rolDeQuien(c.declarado!.por)}` : c.texto
