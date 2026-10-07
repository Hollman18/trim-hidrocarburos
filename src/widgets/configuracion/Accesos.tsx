import { useId, useState } from 'react'
import { Lock, UserPlus } from 'lucide-react'
import { ROLES_VISIBLES, rolPorId } from '@/entities/roles'
import { CAMPOS } from '@/entities/campos'
import { ESTADO_NOMBRE, nombreCampos, personaDelRol, ROLES_CON_ALERTAS, ALERTAS_DEL_ROL, telefonoLegible, type Usuario, type ErrorAcceso, type CampoAcceso } from '@/entities/usuarios'
import { useApp } from '@/app/store'
import { fechaHora } from '@/entities/reloj'
import { useUsuarios, useRegistroDeAccesos, useAccesos, esCompleta } from '@/shared/api/usuarios'
import { Panel, Boton, Chip, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'

const campoInput = 'w-full rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[5px] text-[12px] outline-none focus:border-acento'
/** Marca del formulario de invitación abierto: no es un id de persona. */
const INVITAR = 'invitar'
/** El orden del formulario: al fallar, el foco va al primer campo con error. */
const ORDEN: CampoAcceso[] = ['nombre', 'correo', 'rol', 'campos', 'whatsapp', 'alertas', 'motivo', 'general']
const NIVEL = { decision: 'resumen para decidir', operacion: 'lo de operar', ingenieria: 'todo el detalle' } as const

/** Quién entra, con qué rol y a qué campos. Lo administra el gerente de
 *  activo; los demás lo ven sin poder cambiarlo. Nada se borra: se suspende. */
export function Accesos({ puede }: { puede: boolean }) {
  const rolId = useApp(s => s.rolId)
  // Quien administra trabaja con el registro entero (el formulario lo necesita);
  // quien solo mira recibe la forma mínima del contrato y la lista se arma con ella.
  const quien = personaDelRol(useUsuarios(), rolId)?.id
  const usuarios = useRegistroDeAccesos(quien, puede)
  const accesos = useAccesos()
  const [abierto, setAbierto] = useState<string | null>(null)
  const firmante = personaDelRol(usuarios, rolId), yo = firmante?.id
  // Lo que quien firma puede dar: sus propios campos (nadie otorga lo que no tiene).
  const alcance = firmante?.campos ?? []
  const cuenta = (e: Usuario['estado']) => usuarios.filter(u => u.estado === e).length
  // Sin rol ni campos escogidos de antemano: invitar con el rol equivocado es fácil si ya viene puesto.
  // El id, el día y el estado no los pone el front: los da el servidor al invitar (`POST /api/usuarios`).
  const nuevo: Usuario = { id: INVITAR, nombre: '', correo: '', rolId: '', campos: [], estado: 'invitado', desde: '', telefono: '', alertas: false }

  return (
    <>
      <Panel className="mb-2.5" titulo="USUARIOS Y ACCESOS"
        extra={`${plural(cuenta('activo'), 'con acceso', 'con acceso')} · ${plural(cuenta('invitado'), 'invitado', 'invitados')} · ${plural(cuenta('suspendido'), 'suspendido', 'suspendidos')}`}>
        <Lectura>
          {puede ? 'Usted' : 'El gerente de activo'} decide quién entra, con qué rol y a qué campos. Lo que cada rol ve
          y puede hacer lo fija el producto, no se cambia por persona. Nadie se borra: quien ya no debe
          entrar queda suspendido, y lo que firmó o respondió sigue a su nombre.
        </Lectura>
        {!puede && <Hueco><Lock className="mr-1 inline size-3.5" />Los accesos los da el gerente de activo. Aquí se ven; no se cambian.</Hueco>}

        <ul className="grid">
          {usuarios.map(u => (
            <li key={u.id} className="border-b border-[var(--linea2)] py-2 last:border-0">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                <span className="min-w-0 flex-1">
                  <b className={cn('block text-[12.5px]', u.estado === 'suspendido' && 'text-[var(--tinta3)] line-through')}>{u.nombre}{u.id === yo && <span className="font-normal text-[var(--tinta3)]"> · usted</span>}</b>
                  {esCompleta(u) && <small className="block truncate font-mono text-[10px] text-[var(--tinta3)]">{u.correo}</small>}
                  <small className="block text-[11px] text-[var(--tinta2)]">{rolPorId(u.rolId).nombre} · {nombreCampos(u.campos)}</small>
                  <small className="block text-[10.5px] text-[var(--tinta3)]">{u.telefono ? `WhatsApp ${telefonoLegible(u.telefono)}` : 'sin WhatsApp'}{u.alertas ? ' · recibe alertas' : ''}</small>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {u.estado !== 'activo' && <Chip tono={u.estado === 'suspendido' ? 'fuerte' : 'neutro'}>{ESTADO_NOMBRE[u.estado]}</Chip>}
                  {puede && abierto !== u.id && <Boton onClick={() => setAbierto(u.id)} aria-label={`Cambiar el acceso de ${u.nombre}`}>Cambiar</Boton>}
                </span>
              </div>
              {abierto === u.id && esCompleta(u) && <Formulario base={u} propio={u.id === yo} alcance={alcance} onListo={() => setAbierto(null)} />}
            </li>
          ))}
        </ul>

        {puede && (abierto === nuevo.id
          ? <div className="mt-2 border-t border-[var(--linea)] pt-2"><b className="text-[12px]">Invitar a una persona</b><Formulario base={nuevo} nuevo alcance={alcance} onListo={() => setAbierto(null)} /></div>
          : <Boton variante="principal" className="mt-2 w-full" onClick={() => setAbierto(nuevo.id)}><UserPlus className="mr-1 inline size-3.5" />Invitar a una persona</Boton>)}
      </Panel>

      <Panel className="mb-2.5" titulo="HISTORIAL DE ACCESOS" extra={plural(accesos.length, 'cambio', 'cambios')}>
        <Lectura>Todo cambio de acceso queda escrito con quién lo hizo, cuándo y por qué. No se edita ni se borra.</Lectura>
        <ul className="max-h-[320px] overflow-y-auto">
          {[...accesos].reverse().map(a => (
            <li key={a.id} className="border-b border-[var(--linea2)] py-2 text-[11.5px] last:border-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <b>{a.usuario}</b>
                <span className="text-[10.5px] text-[var(--tinta3)]">{fechaHora(new Date(a.fecha))} · {a.por}</span>
              </div>
              <p className="text-[var(--tinta2)]">«{a.motivo}»</p>
              <ul className="list-disc pl-4 text-[10.5px] text-[var(--tinta3)]">{a.cambios.map(c => <li key={c}>{c}</li>)}</ul>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}

/** Invitar o cambiar a una persona. Los mismos campos, el mismo motivo
 *  obligatorio y las mismas reglas que el servidor. */
function Formulario({ base, nuevo, propio, alcance, onListo }: { base: Usuario; nuevo?: boolean
  /** Es la fila de quien firma: su rol y su acceso los cambia otro gerente. */
  propio?: boolean
  /** Los campos de quien firma: solo esos (y los que la persona ya tenía) se pueden marcar. */
  alcance: Usuario['campos']; onListo: () => void }) {
  // Las escrituras son acciones del estado: esperan la respuesta del servidor (o del demo, con sus mismas reglas).
  const guardar = useApp(s => s.guardarUsuario); const invitar = useApp(s => s.invitarUsuario)
  // El número se edita como se lee («+57 300 123 4567»); al guardar vuelve a E.164 (escrituras.ts), así no cuenta como cambio.
  const [u, setU] = useState<Usuario>(() => (base.telefono ? { ...base, telefono: telefonoLegible(base.telefono) } : base))
  const [motivo, setMotivo] = useState('')
  const [errores, setErrores] = useState<ErrorAcceso[]>([])
  // Cada error va junto a su caja: la caja queda inválida y lo describe (WCAG 3.3.1).
  const idBase = useId()
  const idCaja = (c: CampoAcceso) => `${idBase}-caja-${c}`
  const idError = (c: CampoAcceso) => `${idBase}-error-${c}`
  const de = (c: CampoAcceso) => errores.filter(e => e.campo === c)
  const invalido = (c: CampoAcceso) => de(c).length ? { 'aria-invalid': true, 'aria-describedby': idError(c) } : {}
  const mensaje = (c: CampoAcceso) => de(c).length > 0 && (
    <ul id={idError(c)} className="list-disc pl-4 text-[11.5px] text-[var(--tinta)]">{de(c).map(e => <li key={e.texto}>{e.texto}</li>)}</ul>
  )
  const todos = u.campos === 'todos'
  const marcados = todos ? [] : (u.campos as string[])
  // «Todos» solo lo da quien los tiene todos (o queda si la persona ya lo tenía).
  const puedeTodos = alcance === 'todos' || base.campos === 'todos'
  const visibles = CAMPOS.filter(c => alcance === 'todos' || alcance.includes(c.id) || (base.campos !== 'todos' && base.campos.includes(c.id)))
  const cambiar = (p: Partial<Usuario>) => { setU(x => ({ ...x, ...p })); setErrores([]) }
  const conAlertas = ROLES_CON_ALERTAS.includes(u.rolId)

  return (
    <form className="mt-2 grid gap-2 rounded border border-[var(--linea2)] bg-[var(--panel2)] p-2.5"
      onSubmit={async e => {
        e.preventDefault()
        const r = await (nuevo
          ? invitar({ nombre: u.nombre, correo: u.correo, rolId: u.rolId, campos: u.campos, telefono: u.telefono, alertas: u.alertas }, motivo)
          : guardar(u, motivo))
        if (r.ok) return onListo()
        setErrores(r.errores)
        // El foco va al primer campo con error: su mensaje se lee al llegar.
        const primero = ORDEN.find(c => r.errores.some(x => x.campo === c))
        if (primero && primero !== 'general') document.getElementById(idCaja(primero))?.focus()
      }}>
      {nuevo && (
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
          <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Nombre completo</span>
            <input id={idCaja('nombre')} {...invalido('nombre')} value={u.nombre} onChange={e => cambiar({ nombre: e.target.value })} className={campoInput} autoComplete="off" />
            {mensaje('nombre')}</label>
          <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Correo de la empresa</span>
            <input id={idCaja('correo')} {...invalido('correo')} type="email" value={u.correo} onChange={e => cambiar({ correo: e.target.value })} className={campoInput} autoComplete="off" />
            {mensaje('correo')}</label>
        </div>
      )}
      <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Rol</span>
        <select id={idCaja('rol')} {...invalido('rol')} value={u.rolId} disabled={propio} onChange={e => cambiar({ rolId: e.target.value, alertas: ROLES_CON_ALERTAS.includes(e.target.value) && u.alertas, ...(nuevo && e.target.value ? { campos: rolPorId(e.target.value).campos } : {}) })} className={cn(campoInput, 'disabled:opacity-70')}>
          {nuevo && <option value="">Escoja un rol</option>}
          {ROLES_VISIBLES.map(r => <option key={r.id} value={r.id}>{r.nombre} · {NIVEL[r.nivel]}</option>)}
        </select>
        {propio && <small className="text-[10px] text-[var(--tinta3)]">Su propio rol y su acceso los cambia otro gerente de activo.</small>}
        {mensaje('rol')}
      </label>
      {/* Sus propios campos también los cambia otro gerente: en su fila no se tocan. */}
      <fieldset className="grid gap-1 disabled:opacity-70" disabled={propio} {...(de('campos').length ? { 'aria-describedby': idError('campos') } : {})}>
        <legend className="mb-0.5 text-[10.5px] text-[var(--tinta2)]">Campos que ve</legend>
        {puedeTodos && (
          <label className="flex min-h-8 items-center gap-1.5 text-[12px]">
            <input id={idCaja('campos')} type="checkbox" className="size-4" checked={todos} onChange={e => cambiar({ campos: e.target.checked ? 'todos' : visibles.map(c => c.id) })} />
            Todos los campos (también los que se agreguen después)
          </label>
        )}
        {!todos && (
          <span className={cn('flex flex-wrap gap-x-3 gap-y-1', puedeTodos && 'pl-5')}>
            {visibles.map((c, i) => (
              <label key={c.id} className="flex min-h-8 items-center gap-1.5 text-[12px]">
                <input type="checkbox" className="size-4" checked={marcados.includes(c.id)} {...(!puedeTodos && i === 0 ? { id: idCaja('campos') } : {})}
                  onChange={e => cambiar({ campos: e.target.checked ? [...marcados, c.id] : marcados.filter(x => x !== c.id) })} />
                {c.nombre}
              </label>
            ))}
          </span>
        )}
        {mensaje('campos')}
      </fieldset>
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
        <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">WhatsApp para alertas</span>
          <input id={idCaja('whatsapp')} {...invalido('whatsapp')} value={u.telefono ?? ''} onChange={e => cambiar({ telefono: e.target.value })} className={campoInput} placeholder="300 123 4567 o +57 300 123 4567" inputMode="tel" autoComplete="off" />
          {mensaje('whatsapp')}</label>
        <label className={cn('flex min-h-8 items-start gap-1.5 self-end pb-1.5 text-[12px]', !conAlertas && 'text-[var(--tinta3)]')}>
          <input id={idCaja('alertas')} {...invalido('alertas')} type="checkbox" className="mt-0.5 size-4 shrink-0" checked={u.alertas} disabled={!conAlertas} onChange={e => cambiar({ alertas: e.target.checked })} />
          <span>{conAlertas ? <>Recibe por WhatsApp: {ALERTAS_DEL_ROL[u.rolId]}</> : u.rolId ? 'Este rol no recibe alertas por WhatsApp' : 'Escoja el rol para ver qué alertas recibe'}
            {mensaje('alertas')}</span>
        </label>
      </div>
      {!nuevo && !propio && (
        <label className="flex items-center gap-1.5 text-[12px]">
          <input type="checkbox" className="size-4" checked={u.estado === 'suspendido'}
            // Solo se dice si queda suspendida: al quitar la suspensión, el servidor la devuelve al estado de antes (quien nunca entró sigue invitado).
            onChange={e => cambiar({ estado: e.target.checked ? 'suspendido' : base.estado === 'suspendido' ? (base.antesDeSuspender ?? 'activo') : base.estado })} />
          Suspender el acceso (no podrá entrar; lo que firmó sigue a su nombre)
        </label>
      )}
      <label className="grid gap-0.5"><span className="text-[10.5px] text-[var(--tinta2)]">Motivo · obligatorio</span>
        <input id={idCaja('motivo')} {...invalido('motivo')} value={motivo} onChange={e => { setMotivo(e.target.value); setErrores([]) }} className={campoInput}
          placeholder={nuevo ? 'Ej.: nuevo supervisor de La Ceiba desde octubre' : 'Ej.: pasa a cubrir también Morichal Norte'} />
        {mensaje('motivo')}</label>
      {/* Lo que no es de una caja (dejaría la operación sin gerente, sin cambios…) se anuncia al aparecer. */}
      {de('general').length > 0 && <ul id={idError('general')} className="list-disc pl-4 text-[11.5px] text-[var(--tinta)]" role="alert">{de('general').map(e => <li key={e.texto}>{e.texto}</li>)}</ul>}
      <span className="flex flex-wrap gap-1.5">
        <Boton variante="principal" type="submit">{nuevo ? 'Enviar la invitación' : 'Guardar el cambio'}</Boton>
        <Boton type="button" onClick={onListo}>Cancelar</Boton>
      </span>
    </form>
  )
}
