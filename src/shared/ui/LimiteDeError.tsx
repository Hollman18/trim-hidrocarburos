import { Component, type ReactNode } from 'react'
import { ErrorDeCarga, reintentarCargas } from '@/shared/lib/carga'
import { ErrorApi } from '@/shared/api/fuente'
import { ErrorDeContrato } from '@/shared/api/cable'
import { reintentarConsultas } from '@/shared/api/consulta'
import { cn } from '@/shared/lib/cn'

type Props = {
  children: ReactNode
  /** Al cambiar, se vuelve a intentar: pantalla, alcance, campo y rol. */
  clave: string
  /** Qué falló, para el título: «Esta pantalla», «La ficha del equipo». */
  que?: string
  /** La salida sin recargar (recargar borra lo hecho en la sesión): volver al
   *  inicio del rol, cerrar la ficha… */
  salida: { texto: string; accion: () => void }
  /** Dónde se pinta la caja (la ficha del equipo flota sobre la vista). */
  className?: string
}
type Estado = { error: Error | null; clave: string }

const CAJA = 'rounded border border-dashed border-[var(--linea)] bg-[var(--panel2)] p-4 text-[12.5px] text-[var(--tinta2)]'
const BOTON = 'mt-2 mr-1.5 min-h-10 cursor-pointer rounded border border-[var(--linea)] bg-[var(--panel)] px-2.5 py-1 text-[12px] hover:bg-[var(--elevado)] sm:min-h-0'

/** Si una pantalla falla al dibujarse, se dice y se ofrece volver, en vez de
 *  dejar la aplicación en blanco. El error queda en la consola para quien lo
 *  depure; no se esconde. */
export class LimiteDeError extends Component<Props, Estado> {
  override state: Estado = { error: null, clave: this.props.clave }

  static getDerivedStateFromError(error: Error) { return { error } }

  /** Al cambiar de pantalla o de contexto se vuelve a intentar, sin desmontar
   *  la vista (un `key` borraría el estado local de cada pantalla). */
  static getDerivedStateFromProps(props: Props, estado: Estado): Partial<Estado> | null {
    return props.clave !== estado.clave ? { error: null, clave: props.clave } : null
  }

  override componentDidCatch(error: Error) { console.error(`${this.props.que ?? 'La pantalla'} no se pudo dibujar:`, error) }

  override render() {
    const { error } = this.state
    if (!error) return this.props.children
    const { que = 'Esta pantalla', salida, className } = this.props
    // Que no haya cargado no es lo mismo que algo roto: se reintenta sin
    // recargar, así no se pierde la ruta ni lo respondido en la sesión.
    if (error instanceof ErrorDeCarga) return (
      <div className={cn(CAJA, className)} role="alert">
        <b className="block text-[var(--tinta)]">{que} no se pudo cargar.</b>
        <span className="block">Revise la señal y toque «Reintentar». Lo que ya respondió en esta sesión sigue guardado.</span>
        {error.intentos > 1 && (
          // Si sigue fallando con señal, lo más probable es que se publicó una
          // versión nueva y el archivo viejo ya no existe: solo recargar lo trae.
          <span className="mt-1 block">
            Si ya tiene señal y sigue sin cargar, puede que haya una versión nueva de la aplicación: recárguela.
            Al recargar se pierde lo que hizo en esta sesión.
          </span>
        )}
        <button onClick={() => { reintentarCargas(); this.setState({ error: null }) }} className={BOTON}>Reintentar</button>
        {error.intentos > 1 && <button onClick={() => location.reload()} className={BOTON}>Recargar la aplicación</button>}
      </div>
    )
    // Un pedido al servidor que falló (sin red, un 500, una respuesta que no
    // tiene la forma del contrato): se dice qué pasó y se ofrece pedirlo otra vez.
    if (error instanceof ErrorApi || error instanceof ErrorDeContrato) return (
      <div className={cn(CAJA, className)} role="alert">
        <b className="block text-[var(--tinta)]">{que} no pudo traer sus datos.</b>
        <span className="block">{error instanceof ErrorApi && error.estado === 0
          ? 'No hubo respuesta del servidor. Revise la señal y toque «Reintentar».'
          : `El servidor respondió con un error: ${error.message}.`} Lo que ya respondió en esta sesión sigue guardado.</span>
        <button onClick={() => { reintentarConsultas(); this.setState({ error: null }) }} className={BOTON}>Reintentar</button>
        <button onClick={() => { this.setState({ error: null }); salida.accion() }} className={BOTON}>{salida.texto}</button>
      </div>
    )
    return (
      <div className={cn(CAJA, className)} role="alert">
        <b className="block text-[var(--tinta)]">{que} no se pudo mostrar.</b>
        <span className="block">Algo falló al dibujarla; puede ser una dirección escrita a mano con un dato que no existe. El detalle quedó en la consola del navegador.</span>
        {/* Sin recargar: recargar borra lo hecho en la sesión y entra con otro rol.
            Lo que falló no se queda guardado: al volver se calcula de nuevo. */}
        <button onClick={() => { reintentarConsultas(); this.setState({ error: null }); salida.accion() }} className={BOTON}>{salida.texto}</button>
      </div>
    )
  }
}
