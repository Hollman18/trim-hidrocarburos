import { useEffect, useState } from 'react'
import { pedirJson, ErrorApi, cancelado, mensajeDe } from './fuente'

/** Contrato con el servidor. El backend devuelve HECHOS; las palabras en
 *  español las pone el front (`entities/cadena.ts`). */
export interface Procedencia {
  instrumento: {
    tag: string; tipo: string | null; unidad: string | null
    equipo: string | null; equipoNombre: string | null
    claseEquipo: string | null; criticidad: number | null
    limite: { texto: string; bajo: number | null; alto: number | null } | null
    mapeo: 'descubierto' | 'regla' | 'manual' | 'pendiente'
  }
  lectura: {
    clase: 'continua' | 'discreta'
    cadenciaS: number | null
    protocolo: string
    modo: string
    reloj: string
  }
  calculo: { id: string; expresion: string; version: number; ventanaMin: number | null } | null
  custodia: {
    editable: boolean
    calibracion: { vigenteHasta: string | null; detalle: string | null } | null
  }
  /** Solo llega si el servidor concede la capacidad. No es un filtro de pantalla. */
  tecnico?: {
    gateway: { id: string; modelo: string; serie: string; firmware: string }
    enlace: string; bufferH: number; ultimoVisto: string
    endpoint: string | null; transporte: string; almacenamiento: string
  }
}

export type EstadoCadena =
  | { estado: 'cargando' }
  | { estado: 'ok'; datos: Procedencia }
  | { estado: 'sin-registro' }
  | { estado: 'error'; mensaje: string }

/** Pide la procedencia de un tag. Las capacidades viajan en una cabecera
 *  porque este prototipo no tiene sesión; en producción van en el token y el
 *  servidor las saca de ahí, nunca del cliente.
 *
 *  «No está en el registro» solo lo dice el servidor, con `codigo:
 *  'tag-no-registrado'` en el 404: un 404 de una ruta que todavía no existe,
 *  o una página en vez de JSON, es «no hay servicio», no una afirmación
 *  sobre el tag. */
export function useProcedencia(campo: string, tag: string | null, capacidades: string[]): EstadoCadena {
  const [r, setR] = useState<{ clave: string; valor: EstadoCadena }>({ clave: '', valor: { estado: 'cargando' } })
  const llaves = capacidades.join(',')
  const clave = `${campo}|${tag}|${llaves}`

  useEffect(() => {
    if (!tag) return
    const corte = new AbortController()
    pedirJson<Procedencia>(`/campos/${encodeURIComponent(campo)}/tags/${encodeURIComponent(tag)}/procedencia`,
      undefined, { signal: corte.signal, cabeceras: { 'x-capacidades': llaves } })
      // La vigencia se revisa DESPUÉS de leer el cuerpo: antes se revisaba
      // antes, y la procedencia de un tag anterior podía pisar la del actual.
      .then(datos => { if (!corte.signal.aborted) setR({ clave, valor: { estado: 'ok', datos } }) })
      .catch(e => {
        if (corte.signal.aborted || cancelado(e)) return
        if (e instanceof ErrorApi && e.estado === 404 && e.codigo === 'tag-no-registrado') setR({ clave, valor: { estado: 'sin-registro' } })
        else setR({ clave, valor: { estado: 'error', mensaje: mensajeDe(e) } })
      })
    return () => corte.abort()
  }, [campo, tag, llaves, clave])

  // Lo que se guardó para otro tag no sale: mientras llega el nuevo, «cargando».
  return r.clave === clave ? r.valor : { estado: 'cargando' }
}
