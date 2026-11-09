import { useState } from 'react'
import { useRol, useCampos } from '@/app/store'
import {
  usePanel, useCatalogoIndicadores, useSenalesDelPanel, guardarPanel, MAX_ELEMENTOS,
  type ElementoVista, type ElementoPanel, type IdIndicador,
} from '@/shared/api/panel'
import { Tarjeta, Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { desplazable } from '@/shared/ui/alFinal'
import { Cifra, Columnas, LeyendaColumnas, Tendencia } from '@/shared/ui/scada'
import { fechaCorta } from '@/entities/reloj'

/** MI PANEL (Fase 7 de facilidades, pieza Núcleo): el gerente, producción y confiabilidad arman el suyo con
 *  indicadores del catálogo (cada uno con su fórmula y su fuente en la ⓘ) y con cualquier señal ya conectada.
 *  Todo se dibuja con el kit SCADA: la cifra, las columnas por mes y la tendencia con la escala de sus
 *  límites. Lo que no tiene dato dice «Sin dato» y por qué. Sin panel guardado, el de ejemplo de su rol. */
export function Panel() {
  const rol = useRol()
  const campos = useCampos()
  const ids = campos.map(c => c.id)
  const vista = usePanel(rol.id, ids)
  const [editando, setEditando] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const actuales = vista.elementos.map(e => e.elemento)
  const guardar = async (elementos: ElementoPanel[]) => {
    setOcupado(true); setError('')
    const r = await guardarPanel(rol.id, elementos)
    setOcupado(false)
    if (!r.ok) setError(r.error)
  }
  return (
    <div className="grid max-w-[1280px] gap-3 sm:gap-4" data-panel={rol.id}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 text-[15px] text-[var(--tinta2)]" data-panel-estado>
          {vista.ejemplo ? 'Panel de ejemplo de su rol: cámbielo con «Editar el panel».' : `${vista.elementos.length} de ${MAX_ELEMENTOS} elementos.`}
        </p>
        <Boton variante={editando ? 'principal' : 'normal'} onClick={() => setEditando(x => !x)} aria-pressed={editando} data-editar-panel>
          {editando ? 'Listo' : 'Editar el panel'}
        </Boton>
      </div>
      {editando && <Agregar actuales={actuales} campos={campos} ocupado={ocupado} onGuardar={guardar} />}
      {error && <p role="alert" className="text-[15px]">{error}</p>}
      {vista.elementos.length ? (
        <div className="grid items-start gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(380px,100%),1fr))]" data-elementos>
          {vista.elementos.map(e => (
            <Elemento key={e.elemento.id} e={e} editando={editando} ocupado={ocupado}
              onQuitar={() => void guardar(actuales.filter(x => x.id !== e.elemento.id))} />
          ))}
        </div>
      ) : <Tarjeta><p className="text-[16px]">El panel está vacío. Agregue un indicador o una señal con «Editar el panel».</p></Tarjeta>}
    </div>
  )
}

const n0 = (v: number) => Math.round(v).toLocaleString('es-CO')
/** El rótulo de la cifra (2 a 4 palabras, kit §6): lo que es el número, no el campo (ya va debajo del título). */
const ROTULO: Readonly<Record<string, string>> = { mtbf: 'Entre fallas', mttr: 'Reparación activa', 'horas-proactivas': 'Proactivo', 'margen-n1': 'Margen' }

function Elemento({ e, editando, ocupado, onQuitar }: { e: ElementoVista; editando: boolean; ocupado: boolean; onQuitar: () => void }) {
  const v = e.valor
  const ayuda = e.indicador
    ? `${e.indicador.pregunta} Fórmula: ${e.indicador.formula}. Fuente: ${e.indicador.fuente}. Ventana: ${e.indicador.ventana}.`
    : e.elemento.tipo === 'senal' ? `La señal ${e.elemento.tag} de ${e.elemento.equipo}, como llega del campo. La escala sale de sus límites firmados, nunca de las lecturas.` : ''
  return (
    <Tarjeta as="article" className="grid gap-3" data-elemento={e.elemento.tipo === 'indicador' ? e.elemento.indicador : e.elemento.tag} data-forma={v.forma}>
      <header className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <h2 className="flex flex-wrap items-center gap-x-1 text-[16px] font-semibold leading-snug">{e.titulo}<Info titulo={e.titulo} texto={ayuda} /></h2>
          <p className="text-[13px] text-[var(--tinta2)]">{e.campo}{e.indicador ? ` · ${e.indicador.ventana}` : ''}</p>
        </div>
        {editando && <Boton variante="chico" disabled={ocupado} onClick={onQuitar} data-quitar={e.elemento.id} aria-label={`Quitar ${e.titulo} (${e.campo})`}>Quitar</Boton>}
      </header>
      {v.forma === 'sin-dato' && (
        <p className="text-[15px] leading-snug text-[var(--tinta2)]" data-sin-dato><b className="font-semibold text-[var(--tinta)]">Sin dato.</b> {v.motivo}</p>
      )}
      {v.forma === 'cifra' && <Cifra rotulo={e.elemento.tipo === 'indicador' ? ROTULO[e.elemento.indicador] ?? e.titulo : 'Ahora'} valor={v.valor} unidad={v.unidad} decimales={v.decimales} nota={v.nota} calidad="calculado" />}
      {v.forma === 'columnas' && (
        <div className="grid gap-1.5">
          <div {...desplazable(e.titulo)} className="overflow-x-auto">
            <Columnas periodos={v.periodos} partes={v.partes} unidad={v.unidad} formato={n0} minimo={300}
              aria-label={`${e.titulo}, ${e.campo}: ${v.periodos.map(p => `${p.rotulo} ${n0(p.total)}`).join(', ')} ${v.unidad}.`}
              titulo={(p, parte, x) => `${p.rotulo} · ${parte}: ${n0(x)} ${v.unidad}`} />
          </div>
          {v.partes.length > 1 && <LeyendaColumnas partes={v.partes} />}
          <p className="text-[14px] text-[var(--tinta2)]">{v.nota}</p>
        </div>
      )}
      {v.forma === 'tendencia' && (
        <div className="grid gap-1.5">
          <Tendencia titulo={`${v.senal.nombre} · ${v.senal.unidad}`} ventana={`${v.senal.serie.length} lecturas`} series={[{ nombre: v.senal.nombre, valores: v.senal.serie }]}
            escala={{ min: v.senal.escala[0], max: v.senal.escala[1], firmada: false }} unidad={v.senal.unidad} banda={v.senal.banda ?? undefined} alarmas={v.senal.alarmas}
            decimales={v.senal.decimales} ejeX={[fechaCorta(new Date(v.desde)), fechaCorta(new Date(v.hasta))]} alto={96} ajustar
            tiempo={{ desde: v.desde, pasoH: v.senal.serie.length > 1 ? (Date.parse(v.hasta) - Date.parse(v.desde)) / 3_600_000 / (v.senal.serie.length - 1) : 24 }} origen={v.senal.tag} />
          {v.nota && <p className="text-[14px] text-[var(--tinta2)]">{v.nota}</p>}
        </div>
      )}
    </Tarjeta>
  )
}

const SENAL = 'senal'

function Agregar({ actuales, campos, ocupado, onGuardar }: {
  actuales: ElementoPanel[]; campos: ReadonlyArray<{ id: string; nombre: string }>; ocupado: boolean; onGuardar: (es: ElementoPanel[]) => Promise<void>
}) {
  const catalogo = useCatalogoIndicadores()
  const [que, setQue] = useState<string>(catalogo[0]!.id)
  const [campo, setCampo] = useState(campos[0]!.id)
  const senales = useSenalesDelPanel([campo])
  const [senal, setSenal] = useState('')
  const elegida = senales.find(s => `${s.equipo}|${s.tag}` === senal) ?? senales[0]
  const lleno = actuales.length >= MAX_ELEMENTOS
  const equipos = [...new Set(senales.map(s => s.equipo))]
  const agregar = () => {
    const id = `e${Math.max(0, ...actuales.map(x => Number(x.id.replace(/\D/g, '')) || 0)) + 1}`
    const nuevo: ElementoPanel | undefined = que === SENAL
      ? elegida && { id, tipo: 'senal', campoId: campo, equipo: elegida.equipo, tag: elegida.tag }
      : { id, tipo: 'indicador', indicador: que as IdIndicador, campoId: campo }
    if (nuevo) void onGuardar([...actuales, nuevo])
  }
  const caja = 'min-h-11 w-full min-w-0 rounded-[8px] bg-[var(--panel)] px-3 text-[15px] text-[var(--tinta)] shadow-[inset_0_0_0_1.5px_var(--linea)]'
  return (
    <Tarjeta className="grid gap-3" data-agregar>
      <h2 className="text-[16px] font-semibold">Agregar al panel</h2>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="grid gap-1 text-[14px]">Qué
          <select className={caja} value={que} onChange={e => setQue(e.target.value)} data-que>
            {catalogo.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            <option value={SENAL}>Una señal conectada</option>
          </select>
        </label>
        <label className="grid gap-1 text-[14px]">Campo
          <select className={caja} value={campo} onChange={e => { setCampo(e.target.value); setSenal('') }} data-campo-panel>
            {campos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
      </div>
      {que === SENAL && (
        <label className="grid gap-1 text-[14px]">Señal
          <select className={caja} value={elegida ? `${elegida.equipo}|${elegida.tag}` : ''} onChange={e => setSenal(e.target.value)} data-senal-panel>
            {equipos.map(eq => (
              <optgroup key={eq} label={`${eq} · ${senales.find(s => s.equipo === eq)!.nombreEquipo}`}>
                {senales.filter(s => s.equipo === eq).map(s => <option key={s.tag} value={`${s.equipo}|${s.tag}`}>{s.tag} · {s.nombre}{s.unidad ? ` (${s.unidad})` : ''}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      )}
      {que !== SENAL && <p className="text-[14px] text-[var(--tinta2)]">{catalogo.find(i => i.id === que)?.pregunta}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Boton variante="principal" disabled={ocupado || lleno || (que === SENAL && !elegida)} onClick={agregar} data-agregar-elemento>Agregar</Boton>
        {lleno && <span className="text-[14px] text-[var(--tinta2)]">El panel lleva como mucho {MAX_ELEMENTOS}: quite uno antes.</span>}
      </div>
    </Tarjeta>
  )
}
