import { Monitor, Sun, Moon, Check, X } from 'lucide-react'
import { useApp, useRol, usePersona, useCampos } from '@/app/store'
import { CAMPOS } from '@/entities/campos'
import { CAPACIDAD_NOMBRE, AREAS, permisosDelRol, type Capacidad } from '@/entities/tipos'
import { personaDelRol, recibeAlertas, ROLES_CON_ALERTAS, ALERTAS_DEL_ROL, telefonoLegible } from '@/entities/usuarios'
import { useUsuarios } from '@/shared/api/usuarios'
import { Panel, Chip, Hueco } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { Tip } from '@/shared/ui/Tip'
import { cn } from '@/shared/lib/cn'

const TEMAS = [
  { id: 'system', nombre: 'Sistema', Icono: Monitor },
  { id: 'light', nombre: 'Claro', Icono: Sun },
  { id: 'dark', nombre: 'Oscuro', Icono: Moon },
] as const

/** El nombre corto de cada permiso, para la lista; el completo (CAPACIDAD_NOMBRE)
 *  va en el globo de la fila y en el papel. Cada uno sigue diciendo lo que la
 *  capacidad agrega («Responder qué se dañó» no es «Completar el análisis»):
 *  una línea negada no niega lo que el rol sí hace. Si se agrega una capacidad,
 *  el tipo obliga a darle su nombre corto aquí. */
const PERMISO_CORTO: Record<Capacidad, string> = {
  'causa:declarar': 'Responder qué se dañó',
  'causa:completar': 'Completar el análisis de la falla',
  'evidencia:exportar': 'Exportar evidencia con folio',
  'conector:configurar': 'Configurar conectores y tags',
  'config:firmar': 'Firmar la configuración técnica',
  'metas:firmar': 'Firmar metas y precio',
  'usuarios:administrar': 'Dar acceso a otras personas',
  'sap:aviso': 'Enviar avisos a SAP',
  'asignacion:cargar': 'Cargar la asignación oficial',
  'planes:decidir': 'Aceptar planes de acción',
}

const Fila = ({ etiqueta, children, pie, info }: {
  etiqueta: string; children: React.ReactNode; pie?: string
  /** Lo que explica la fila (de dónde sale, quién la cambia): en el ⓘ y en el papel. */
  info?: string
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--linea2)] py-2.5 last:border-0">
    <span className="min-w-[8.5rem] flex-1">
      <span className="flex flex-wrap items-center gap-x-1">
        <b className="text-[12.5px] font-medium">{etiqueta}</b>
        {info && <Info titulo={etiqueta} texto={info} />}
      </span>
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
            <small className="flex flex-wrap items-center gap-x-1 text-[11.5px] text-[var(--tinta2)]">
              {rol.nombre}
              <Info titulo="Rol activo" texto="Se cambia desde el menú de perfil, abajo a la izquierda." />
            </small>
            <small className="block font-mono text-[10.5px] text-[var(--tinta3)]">
              {persona.correo ?? 'sin correo registrado'}
            </small>
          </span>
        </div>
        <div className="mt-3">
          <Fila etiqueta="WhatsApp" info="Del registro de usuarios: lo cambia el gerente de activo en Accesos.">
            {yo?.telefono?.trim()
              ? <span className="tabular font-mono text-[11.5px]">{telefonoLegible(yo.telefono)}</span>
              : <span className="text-[11.5px] text-[var(--tinta3)]">sin número registrado</span>}
          </Fila>
          <Fila etiqueta="Área" info="Cómo cuelga en el organigrama.">
            <Chip>{AREAS.find(a => a.id === rol.area)?.nombre}</Chip>
          </Fila>
          <Fila etiqueta="Campos" pie={`${mios.length} de ${CAMPOS.length}`} info="Los campos a los que tiene acceso. Los asigna el gerente de activo.">
            <span className="flex flex-wrap justify-end gap-1">
              {mios.map(c => <Chip key={c.id} tono={c.id === campoId ? 'fuerte' : 'neutro'}>{c.nombre}</Chip>)}
            </span>
          </Fila>
        </div>
        <p className="mt-2 text-[11px]"><Info rotulo="tu foco" titulo="Tu foco" texto={rol.foco} /></p>
      </Panel>

      {/* Lo que de verdad le llega: la regla de mensajes del rol y el registro de
          la persona. No hay otros canales ni otros avisos que encender. */}
      <Panel titulo="AVISOS">
        {!conAlertas ? (
          <Hueco>
            <span className="flex flex-wrap items-center gap-x-1">
              Su rol no recibe alertas por WhatsApp.
              <Info titulo="Sin alertas" texto="Los avisos los decide la regla de su rol: la regla de mensajes solo avisa a quien actúa sobre el equipo." />
            </span>
          </Hueco>
        ) : (
          <Fila etiqueta="Alertas por WhatsApp" info={`Las decide la regla de su rol: ${ALERTAS_DEL_ROL[rol.id]}.`}>
            <Chip tono={yo && recibeAlertas(yo) ? 'fuerte' : 'neutro'}>
              {!yo ? 'sin persona con acceso' : recibeAlertas(yo) ? 'le llegan' : !yo.telefono?.trim() ? 'no le llegan: sin número' : 'apagadas'}
            </Chip>
          </Fila>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">
          Las cambia el gerente de activo
          <Info titulo="Quién las cambia" texto="Encenderlas, apagarlas o cambiar el número lo hace el gerente de activo en Accesos, con su motivo." />
        </p>
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
        {concedidas.map(k => <Permiso key={k} k={k} si />)}
        {negadas.map(k => <Permiso key={k} k={k} si={false} />)}
      </Panel>

      {/* Sesiones y contraseña son del servicio de identidad del cliente (OIDC / SSO,
          CONTRATO «Sesión y autenticación»): TRIM no guarda contraseñas y solo lee
          quién es la persona con GET /api/sesion. Mientras el front no se conecte a
          ese servicio se dice el hueco en vez de pintar sesiones de demostración. */}
      <Panel titulo="SESIONES Y CONTRASEÑA">
        <Hueco>
          <span className="flex flex-wrap items-center gap-x-1">
            Servicio de identidad de la empresa · sin conectar
            <Info titulo="Sesiones y contraseña" texto="Las sesiones abiertas y el cambio de contraseña los da el servicio de identidad de la empresa; esta versión todavía no se conecta a él." />
          </span>
        </Hueco>
      </Panel>
    </div>
  )
}

/** Un permiso: concedido (✓) o negado (✕, tenue), con su nombre corto. El
 *  completo, si dice más, en el globo de la fila; en el papel va el completo
 *  en lugar del corto (una sola línea por permiso, con su ✓ o ✕). */
function Permiso({ k, si }: { k: Capacidad; si: boolean }) {
  const corto = PERMISO_CORTO[k], completo = CAPACIDAD_NOMBRE[k]
  const Icono = si ? Check : X
  const contenido = <>
    <Icono className={cn('size-3.5 shrink-0', si && 'text-[var(--tinta2)]')} aria-hidden />
    <span><span className="sr-only">{si ? 'Puede: ' : 'No puede: '}</span>
      {corto === completo ? corto : <><span className="print:hidden">{corto}</span><span className="hidden print:inline">{completo}</span></>}</span>
  </>
  const clase = cn('flex items-center gap-2 py-[7px] text-[12px]', !si && 'text-[var(--tinta3)]')
  // La raya va en la envoltura: así queda debajo de la nota impresa y no entre la fila y su nota.
  return (
    <div className="border-b border-[var(--linea2)] last:border-0">
      {corto === completo
        ? <div className={clase}>{contenido}</div>
        : <Tip titulo={corto} filas={[]} pista={completo} className={clase}>{contenido}</Tip>}
    </div>
  )
}
