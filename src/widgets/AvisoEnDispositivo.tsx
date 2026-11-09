import { useRol, useCampos } from '@/app/store'
import { usePush, type EstadoPush } from '@/shared/api/push'
import { rolesQueSeAvisan } from '@/shared/api/eventoPlanta'
import { usePiezas } from '@/shared/api/piezas'
import { Panel, Boton, Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'

const DICE: Record<EstadoPush, string> = {
  cargando: 'Revisando…',
  'no-soportado': 'Este navegador no recibe notificaciones.',
  'sin-servidor': 'En este demo no hay servidor que mande las notificaciones.',
  bloqueado: 'El navegador tiene bloqueadas las notificaciones de TRIM: se cambia en la configuración del sitio.',
  apagado: 'Desactivado en este dispositivo.',
  activo: 'Activo en este dispositivo.',
}

/** «Aviso de apagón en este dispositivo» (Fase 4 de facilidades, D2): la notificación push, en el
 *  celular o el escritorio, para los roles a los que se les avisa el apagón. Solo ese aviso: lo demás
 *  sigue dentro de TRIM. Sin la pieza Energía no sale. */
export function AvisoEnDispositivo() {
  const rol = useRol(); const campos = useCampos().map(c => c.id)
  const piezas = usePiezas(campos)
  const p = usePush(rol.id, campos)
  if (!piezas.has('energia') || !rolesQueSeAvisan().includes(rol.id)) return null
  return (
    <Panel titulo="Aviso de apagón en este dispositivo">
      <div className="grid gap-2.5" data-push={p.estado}>
        <p className="flex flex-wrap items-center gap-x-1 text-[15px]">
          {p.estado === 'activo' ? <Chip tono="fuerte">activo</Chip> : null} {DICE[p.estado]}
          <Info titulo="Aviso de apagón" texto="Si se va la energía en uno de sus campos, le llega una notificación aunque no tenga TRIM abierto, con lo que le toca a su rol. Es solo para el apagón. En un iPhone llega si TRIM está agregado a la pantalla de inicio (iOS 16.4 o más nuevo); en Android y en el escritorio basta con aceptar el permiso." />
        </p>
        {p.estado === 'apagado' && <div><Boton variante="principal" onClick={() => void p.activar()} data-activar-push>Activar</Boton></div>}
        {p.estado === 'activo' && <div><Boton onClick={() => void p.desactivar()} data-desactivar-push>Desactivar</Boton></div>}
        {p.error && <p role="alert" className="text-[14px] text-[var(--tinta2)]">{p.error}</p>}
      </div>
    </Panel>
  )
}
