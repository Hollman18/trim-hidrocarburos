import { useCallback, useEffect, useState } from 'react'
import { pedirJson, cancelado, mensajeDe, type OpcionesPedido } from './fuente'

/** Cliente del registro de la cadena de datos. El front consume el contrato;
 *  quién lo implementa del otro lado es indiferente. */

export interface GatewayRegistrado {
  id: string; campo_id: string; modelo: string; serie: string; firmware: string
  enlace: string; buffer_h: number; primer_visto: string; ultimo_visto: string; tags: number
}
export interface EquipoRegistrado {
  codigo: string; nombre: string; clase: string; criticidad: number | null; tags: string | null
}
export interface Inventario {
  gateways: GatewayRegistrado[]
  tags: { total: number; pendientes: number }
  equipos: EquipoRegistrado[]
}
export interface TagPendiente {
  tag: string; tipo: string | null; unidad: string | null
  limite_texto: string | null; cadencia_s: number | null
  protocolo: string; gateway_id: string
}

/** Las capacidades viajan en una cabecera porque este prototipo no tiene
 *  sesión; en producción van en el token y el servidor las saca de ahí. Las
 *  respuestas del registro son el objeto tal cual (sin `{ datos, refs }`):
 *  no comparten entidades que valga la pena llevar aparte. */
const pedir = <T,>(ruta: string, capacidades: string[], o: OpcionesPedido = {}) =>
  pedirJson<T>(ruta, undefined, { ...o, cabeceras: { 'x-capacidades': capacidades.join(',') } })

export const inscribirBorde = (campo: string, caps: string[]) =>
  pedir<{ codigo: string; expiraEn: string; instruccion: string }>(
    '/inscripcion', caps, { metodo: 'POST', cuerpo: { campo } })

export const asociarTag = (campo: string, tag: string, equipo: string, origen: string, caps: string[]) =>
  pedir<{ tag: string }>(`/campos/${encodeURIComponent(campo)}/tags/${encodeURIComponent(tag)}/equipo`, caps,
    { metodo: 'POST', cuerpo: { equipo, origen } })

/** Lo que el registro dijo de UN campo: el campo va con los datos, para que
 *  nadie asocie un tag de un campo usando el id de otro. */
export interface DatosRegistro { campo: string; inv: Inventario; pend: TagPendiente[] }

/** Carga con estado y recarga a mano. Al cambiar de campo se cancela lo que
 *  estaba en camino: sin esto, si la respuesta del campo anterior llegaba
 *  después, se pintaba bajo el nombre del nuevo. */
export function useRegistro(campo: string, capacidades: string[]) {
  const [datos, setDatos] = useState<DatosRegistro | null>(null)
  const [error, setError] = useState<{ campo: string; texto: string } | null>(null)
  const [vuelta, setVuelta] = useState(0)
  const llaves = capacidades.join(',')

  useEffect(() => {
    const corte = new AbortController()
    // No se borra nada aquí: lo de otro campo ya no sale (ver el return), y al
    // recargar el mismo campo se deja lo que hay mientras llega lo nuevo.
    const caps = llaves.split(','), init = { signal: corte.signal }
    Promise.all([
      pedir<Inventario>(`/campos/${encodeURIComponent(campo)}/inventario`, caps, init),
      pedir<TagPendiente[]>(`/campos/${encodeURIComponent(campo)}/tags/pendientes`, caps, init),
    ])
      // La marca de vigencia va DESPUÉS de la espera: lo que llegue de un pedido cancelado no se pinta.
      .then(([inv, pend]) => { if (!corte.signal.aborted) { setDatos({ campo, inv, pend }); setError(null) } })
      .catch(e => { if (!corte.signal.aborted && !cancelado(e)) setError({ campo, texto: mensajeDe(e) }) })
    return () => corte.abort()
  }, [campo, llaves, vuelta])

  const recargar = useCallback(() => { setError(null); setVuelta(v => v + 1) }, [])
  // Y si aun así queda algo de otro campo en el estado, no sale.
  return { datos: datos?.campo === campo ? datos : null, error: error?.campo === campo ? error.texto : null, recargar }
}

/** Sugerencia de a qué equipo pertenece un tag recién descubierto.
 *  Se apoya en lo que ya está resuelto: casi toda operadora codifica la unidad
 *  en el número del tag, así que un bloque de dígitos compartido con un tag ya
 *  asociado es la mejor pista disponible. */
export function sugerir(tag: string, equipos: EquipoRegistrado[]) {
  const digitos = (s: string) => s.match(/\d+/g) ?? []
  const propios = digitos(tag)
  let mejor: { codigo: string; comun: number; contra: string } | null = null
  for (const e of equipos) {
    for (const t of (e.tags ?? '').split(',').filter(Boolean)) {
      for (const a of propios) for (const b of digitos(t)) {
        let i = 0
        while (i < a.length && i < b.length && a[i] === b[i]) i++
        if (!mejor || i > mejor.comun) mejor = { codigo: e.codigo, comun: i, contra: t }
      }
    }
  }
  if (!mejor || mejor.comun < 3) return null
  return {
    codigo: mejor.codigo,
    razon: `comparte el bloque ${propios[0]?.slice(0, mejor.comun)} con ${mejor.contra}`,
    confianza: mejor.comun >= 4 ? 'alta' : 'media',
  } as const
}
