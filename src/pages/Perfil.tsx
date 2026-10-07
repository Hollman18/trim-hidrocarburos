import { Monitor, Sun, Moon, Check, X } from 'lucide-react'
import { useApp, useRol, usePersona, useCampos } from '@/app/store'
import { CAMPOS } from '@/entities/campos'
import { CAPACIDAD_NOMBRE, AREAS, permisosDelRol } from '@/entities/tipos'
import { personaDelRol, recibeAlertas, ROLES_CON_ALERTAS, ALERTAS_DEL_ROL, telefonoLegible } from '@/entities/usuarios'
import { useUsuarios } from '@/shared/api/usuarios'
import { Panel, Chip, Cita, Hueco } from '@/shared/ui/primitivas'
import { cn } from '@/shared/lib/cn'

const TEMAS = [
  { id: 'system', nombre: 'Sistema', Icono: Monitor },
  { id: 'light', nombre: 'Claro', Icono: Sun },
  { id: 'dark', nombre: 'Oscuro', Icono: Moon },
] as const

const Fila = ({ etiqueta, children, pie, Icono }: {
  etiqueta: string; children: React.ReactNode; pie?: string
  Icono?: React.ComponentType<{ className?: string }>
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--linea2)] py-2.5 last:border-0">
    {Icono && <Icono className="size-[15px] shrink-0 text-[var(--tinta3)]" />}
    <span className="min-w-[8.5rem] flex-1">
      <b className="block text-[12.5px] font-medium">{etiqueta}</b>
      {pie && <small className="block text-[10.5px] text-[var(--tinta3)]">{pie}</small>}
    </span>
    {children}
  </div>
)

/** Mi perfil vive DENTRO del perfil, no como módulo del riel.
 *  Teléfono y alertas se leen del registro de usuarios (el mismo que usa la
 *  regla de WhatsApp) y los cambia el gerente de activo en Accesos: aquí no se
 *  escribe nada que nadie lea. Lo único personal que se cambia es la apariencia. */
export function Perfil() {
  const tema = useApp(s => s.tema), setTema = useApp(s => s.setTema), campoId = useApp(s => s.campoId)
  const rol = useRol(); const persona = usePersona(); const mios = useCampos()
  const yo = personaDelRol(useUsuarios(), rol.id)
  const conAlertas = ROLES_CON_ALERTAS.includes(rol.id)
  // Como negado va solo lo que no puede hacer: con «completar el análisis»
  // también responde qué se dañó, y negárselo aparte sería falso.
  const { concedidas, negadas } = permisosDelRol(rol.puede)

  return (
    <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(310px,1fr))] items-start">
      <Panel titulo="IDENTIDAD" className="lg:col-span-1">
        <div className="flex items-center gap-3">
          <span className="font-cond grid size-12 shrink-0 place-items-center rounded bg-marca-1 text-lg font-semibold text-white">
            {persona.iniciales}
          </span>
          <span className="min-w-0">
            <b className="block text-[15px] leading-tight">{persona.nombre}</b>
            <small className="block text-[11.5px] text-[var(--tinta2)]">{rol.nombre}</small>
            <small className="block font-mono text-[10.5px] text-[var(--tinta3)]">
              {persona.correo ?? 'sin correo registrado'}
            </small>
          </span>
        </div>
        <div className="mt-3">
          <Fila etiqueta="WhatsApp para avisos" pie="del registro de usuarios · lo cambia el gerente de activo en Accesos">
            {yo?.telefono?.trim()
              ? <span className="tabular font-mono text-[11.5px]">{telefonoLegible(yo.telefono)}</span>
              : <span className="text-[11.5px] text-[var(--tinta3)]">sin número registrado</span>}
          </Fila>
          <Fila etiqueta="Rol activo" pie="se cambia desde el menú de perfil, abajo a la izquierda">
            <Chip tono="fuerte">{rol.nombre}</Chip>
          </Fila>
          <Fila etiqueta="Área" pie="cómo cuelga en el organigrama">
            <Chip>{AREAS.find(a => a.id === rol.area)?.nombre}</Chip>
          </Fila>
          <Fila etiqueta="Campos a los que tiene acceso" pie={`${mios.length} de ${CAMPOS.length} · los asigna el gerente de activo`}>
            <span className="flex flex-wrap justify-end gap-1">
              {mios.map(c => <Chip key={c.id} tono={c.id === campoId ? 'fuerte' : 'neutro'}>{c.nombre}</Chip>)}
            </span>
          </Fila>
        </div>
        <Cita>Tu foco: {rol.foco}</Cita>
      </Panel>

      {/* Lo que de verdad le llega: la regla de mensajes del rol y el registro de
          la persona. No hay otros canales ni otros avisos que encender. */}
      <Panel titulo="AVISOS" extra="los decide la regla de su rol">
        {!conAlertas ? (
          <Hueco>Su rol no recibe alertas por WhatsApp: la regla de mensajes solo avisa a quien actúa sobre el equipo.</Hueco>
        ) : (
          <Fila etiqueta="Alertas por WhatsApp" pie={ALERTAS_DEL_ROL[rol.id]}>
            <Chip tono={yo && recibeAlertas(yo) ? 'fuerte' : 'neutro'}>
              {!yo ? 'sin persona con acceso' : recibeAlertas(yo) ? 'le llegan' : !yo.telefono?.trim() ? 'no le llegan: sin número' : 'apagadas'}
            </Chip>
          </Fila>
        )}
        <p className="mt-2 text-[10.5px] text-[var(--tinta3)]">Encenderlas, apagarlas o cambiar el número lo hace el gerente de activo en Accesos, con su motivo.</p>
      </Panel>

      <Panel titulo="APARIENCIA">
        <div className="flex gap-1.5">
          {TEMAS.map(({ id, nombre, Icono }) => (
            <button key={id} onClick={() => setTema(id)} aria-pressed={tema === id}
              className={cn('flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded border px-2 py-3 text-[11px]',
                tema === id ? 'border-[var(--tinta)] bg-[var(--panel)] font-semibold text-[var(--tinta)]'
                  : 'border-[var(--linea2)] hover:bg-[var(--panel2)]')}>
              <Icono className="size-4" /> {nombre}
            </button>
          ))}
        </div>
      </Panel>

      <Panel titulo="PERMISOS" extra="los otorga el servidor">
        {concedidas.map(k => (
          <div key={k} className="flex items-center gap-2 border-b border-[var(--linea2)] py-[7px] text-[12px] last:border-0">
            <Check className="size-3.5 shrink-0 text-[var(--tinta2)]" /> {CAPACIDAD_NOMBRE[k]}
          </div>
        ))}
        {negadas.map(k => (
          <div key={k} className="flex items-center gap-2 border-b border-[var(--linea2)] py-[7px] text-[12px] text-[var(--tinta3)] last:border-0">
            <X className="size-3.5 shrink-0" /> {CAPACIDAD_NOMBRE[k]}
          </div>
        ))}
      </Panel>

      {/* Sesiones y contraseña son del servicio de identidad del cliente (OIDC / SSO,
          CONTRATO «Sesión y autenticación»): TRIM no guarda contraseñas y solo lee
          quién es la persona con GET /api/sesion. Mientras el front no se conecte a
          ese servicio se dice el hueco en vez de pintar sesiones de demostración. */}
      <Panel titulo="SESIONES Y CONTRASEÑA">
        <Hueco>Las sesiones abiertas y el cambio de contraseña los da el servicio de identidad de la empresa; esta versión todavía no se conecta a él.</Hueco>
      </Panel>
    </div>
  )
}
