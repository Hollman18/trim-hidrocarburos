import { Monitor, Sun, Moon, Check, X } from 'lucide-react'
import { useApp, useRol, usePersona, useCampos } from '@/app/store'
import { CAMPOS } from '@/entities/campos'
import { CAPACIDAD_NOMBRE, AREAS, permisosDelRol, type Capacidad } from '@/entities/tipos'
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
  'anh:clasificar': 'Clasificar paradas en el árbol de causas',
  'anh:confirmar': 'Confirmar las paradas del día',
  'anh:yacimiento': 'Decir que fue el yacimiento',
  'perdidas:registrar': 'Registrar pérdidas',
  'orden:cerrar': 'Cerrar órdenes en el teléfono', // A3
  'anh:enviar': 'Registrar la respuesta de la ANH', // A3
}

const Fila = ({ etiqueta, children, pie, info }: {
  etiqueta: string; children: React.ReactNode; pie?: string
  /** Lo que explica la fila (de dónde sale, quién la cambia): en el ⓘ y en el papel. */
  info?: string
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--linea2)] py-2.5 last:border-0">
    <span className="min-w-[8.5rem] flex-1">
      <span className="flex flex-wrap items-center gap-x-1">
        <b className="text-[15px] font-medium">{etiqueta}</b>
        {info && <Info titulo={etiqueta} texto={info} />}
      </span>
      {pie && <small className="block text-[13px] text-[var(--tinta3)]">{pie}</small>}
    </span>
    {children}
  </div>
)

/** Mi perfil vive DENTRO del perfil, no como módulo del riel.
 *  Lo único personal que se cambia es la apariencia: los campos los asigna el
 *  gerente de activo en Accesos. */
export function Perfil() {
  const tema = useApp(s => s.tema), setTema = useApp(s => s.setTema), campoId = useApp(s => s.campoId)
  const rol = useRol(); const persona = usePersona(); const mios = useCampos()
  // Como negado va solo lo que no puede hacer: con «completar el análisis»
  // también responde qué se dañó, y negárselo aparte sería falso.
  // B3 · A-20: solo lo que PUEDE hacer; los «No puede» no habilitan ninguna acción.
  const { concedidas } = permisosDelRol(rol.puede)

  return (
    <div className="grid items-start gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(310px,100%),1fr))]">
      <Panel titulo="Identidad" className="lg:col-span-1">
        <div className="flex items-center gap-3">
          <span data-avatar className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--marca)] text-[18px] font-semibold text-[var(--marca-sobre)]">
            {persona.iniciales}
          </span>
          <span className="min-w-0">
            <b className="block text-[15px] leading-tight">{persona.nombre}</b>
            <small className="flex flex-wrap items-center gap-x-1 text-[14px] text-[var(--tinta2)]">
              {rol.nombre}
              <Info titulo="Rol activo" texto="Se cambia desde el menú de perfil, abajo a la izquierda." />
            </small>
            <small className="block break-all text-[14px] text-[var(--tinta2)]">
              {persona.correo ?? 'sin correo registrado'}
            </small>
          </span>
        </div>
        <div className="mt-3">
          <Fila etiqueta="Área" info="Cómo cuelga en el organigrama.">
            <Chip>{AREAS.find(a => a.id === rol.area)?.nombre}</Chip>
          </Fila>
          <Fila etiqueta="Campos" pie={`${mios.length} de ${CAMPOS.length}`} info="Los campos a los que tiene acceso. Los asigna el gerente de activo.">
            <span className="flex flex-wrap justify-end gap-1">
              {mios.map(c => <Chip key={c.id} tono={c.id === campoId ? 'fuerte' : 'neutro'}>{c.nombre}</Chip>)}
            </span>
          </Fila>
        </div>
      </Panel>

      <Panel titulo="Apariencia">
        <div className="flex gap-1.5">
          {TEMAS.map(({ id, nombre, Icono }) => (
            <button key={id} onClick={() => setTema(id)} aria-pressed={tema === id}
              className={cn('flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-[14px] border px-2 py-3 text-[13px]',
                tema === id ? 'border-[var(--primario)] bg-[var(--primario)] font-semibold text-[var(--primario-sobre)]'
                  : 'border-[var(--linea2)] hover:bg-[var(--panel2)]')}>
              <Icono className="size-4" /> {nombre}
            </button>
          ))}
        </div>
      </Panel>

      <Panel titulo="Lo que puede hacer" extra="lo otorga el servidor">
        {concedidas.map(k => <Permiso key={k} k={k} si />)}
      </Panel>

      {/* Sesiones y contraseña son del servicio de identidad del cliente (OIDC / SSO,
          CONTRATO «Sesión y autenticación»): TRIM no guarda contraseñas y solo lee
          quién es la persona con GET /api/sesion. Mientras el front no se conecte a
          ese servicio se dice el hueco en vez de pintar sesiones de demostración. */}
      <Panel titulo="Sesiones y contraseña">
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
  const clase = cn('flex items-center gap-2 py-[7px] text-[14px]', !si && 'text-[var(--tinta3)]')
  // La raya va en la envoltura: así queda debajo de la nota impresa y no entre la fila y su nota.
  return (
    <div className="border-b border-[var(--linea2)] last:border-0">
      {corto === completo
        ? <div className={clase}>{contenido}</div>
        : <Tip titulo={corto} filas={[]} pista={completo} className={clase}>{contenido}</Tip>}
    </div>
  )
}
