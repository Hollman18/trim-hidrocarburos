import { useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useApp, usePlanta, type Tren, type ResultadoPlanta } from '@/app/store'
import { useCambiosPlanta } from '@/shared/api/sesion'
import { pedirCatalogoEquipos } from '@/shared/api/equipos'
import type { Elemento, Miembro, Simbolo } from '@/entities/planta'
import { Panel, Boton, Chip, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'
import { fechaHora } from '@/entities/reloj'

/** Tipos de elemento que se pueden montar en un tren. El símbolo decide
 *  cómo se dibuja; la posición la calcula el esquema solo. */
const CATALOGO: Record<Exclude<Tren, 'tronco'>, Array<[Simbolo, string]>> = {
  gas: [['depurador', 'Depurador de gas'], ['compresor', 'Compresor de gas'],
        ['tea', 'Tea / quemador'], ['salida', 'Gas a venta']],
  crudo: [['tratador', 'Tratador térmico'], ['tanque', 'Tanque'],
          ['medicion', 'Unidad LACT'], ['salida', 'Oleoducto']],
  agua: [['bomba', 'Bomba de reinyección'], ['tanque', 'Tanque de agua'],
         ['inyeccion', 'Pozos inyectores']],
  servicios: [['subestacion', 'Subestación eléctrica'], ['aire', 'Sistema de aire']],
}
const TRENES: Array<[Exclude<Tren, 'tronco'>, string]> = [
  ['gas', 'Tren de gas'], ['crudo', 'Tren de crudo'],
  ['agua', 'Tren de agua'], ['servicios', 'Servicios industriales'],
]

/** El id sale del primer tramo del nombre: «LC-22 · ESP» → «LC-22». */
const idLimpio = (s: string) =>
  s.split('·')[0]!.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '').slice(0, 14)

/** El esquema de planta del campo: lo que se registra aquí lo dibuja la
 *  pantalla de planta, sin dibujar nada a mano. Es topología, no medición. */
export function Esquema({ puede, conGas = true }: { puede: boolean
  /** Si el perfil del campo dice que no tiene gas, no se ofrece el tren de gas. */
  conGas?: boolean }) {
  const cfg = usePlanta()
  const campoId = useApp(s => s.campoId), agregarMiembro = useApp(s => s.agregarMiembro), quitarMiembro = useApp(s => s.quitarMiembro), agregarElemento = useApp(s => s.agregarElemento), quitarElemento = useApp(s => s.quitarElemento), cambiosPlanta = useCambiosPlanta()
  // Quién cambió el esquema y qué: quitar un pozo del dibujo no puede quedar sin rastro.
  const cambios = cambiosPlanta.filter(c => c.campo === campoId)
  // Lo que el store rechace al quitar (sin permiso) se dice arriba. Al agregar,
  // el error va junto a la caja de cada formulario, que no se borra.
  const [error, setError] = useState<string | null>(null)
  const hecho = async (r: Promise<ResultadoPlanta>) => { const x = await r; setError(x.ok ? null : x.error); return x }
  // Sin esquema registrado no hay qué editar: se dice, no se muestra el de otro campo.
  if (!cfg) return <Hueco>Este campo no tiene esquema de planta registrado.</Hueco>
  const grupos = [...cfg.tronco, ...cfg.gas, ...cfg.crudo, ...cfg.agua].filter(e => e.miembros)
  return (
    <>
      <Lectura>
        Cada pozo, tanque o máquina que se registre aparece en su tren del esquema de planta y queda
        conectado a lo que sigue. Es la topología: no cambia ningún cálculo de barriles.
      </Lectura>
      {error && <p role="alert" className="mt-2 rounded border-2 border-[var(--tinta)] px-2.5 py-1.5 text-[12px] font-semibold">{error}</p>}
      <div className="mb-2.5 mt-2 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        {grupos.map(g => (
          <Conjunto key={g.id} grupo={g} puede={puede}
            onAgregar={m => agregarMiembro(campoId, g.id, m)}
            onQuitar={id => void hecho(quitarMiembro(campoId, g.id, id))} />
        ))}
      </div>
      <div className="grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        {TRENES.filter(([tren]) => conGas || tren !== 'gas').map(([tren, titulo]) => (
          <Panel key={tren} titulo={titulo.toUpperCase()} extra={`${cfg[tren].length} elementos`}>
            {cfg[tren].map(el => (
              <div key={el.id} className="flex items-center gap-2 border-b border-[var(--linea2)] py-2 last:border-0">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[12px]">{el.etiqueta}</b>
                  <small className="font-mono text-[10px] text-[var(--tinta3)]">
                    {el.equipo ? `${el.equipo} · instrumentado` : 'sin instrumentar'}
                    {el.miembros ? ` · ${el.miembros.length} en el conjunto` : ''}
                  </small>
                </span>
                {el.rama && <Chip>rama</Chip>}
                {puede && (
                  <button onClick={() => void hecho(quitarElemento(campoId, tren, el.id))} aria-label={`Quitar ${el.etiqueta}`}
                    className="cursor-pointer rounded border border-[var(--linea2)] p-1 text-[var(--tinta3)] hover:border-[var(--tinta)] hover:text-[var(--tinta)]">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            {puede && <AgregarElemento tren={tren} onAgregar={el => agregarElemento(campoId, tren, el)} />}
          </Panel>
        ))}
      </div>
      {cambios.length > 0 && (
        <Panel titulo="CAMBIOS DEL ESQUEMA" extra={`${cambios.length}`}>
          {[...cambios].reverse().map(c => (
            <p key={c.id} className="border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
              {c.por} {c.cambio} <small className="font-mono text-[10px] text-[var(--tinta3)]">· {fechaHora(new Date(c.fecha))}</small>
            </p>
          ))}
        </Panel>
      )}
    </>
  )
}

function Conjunto({ grupo, puede, onAgregar, onQuitar }: {
  grupo: Elemento; puede: boolean
  onAgregar: (m: Miembro) => Promise<ResultadoPlanta>; onQuitar: (id: string) => void
}) {
  const [nombre, setNombre] = useState('')
  const [tag, setTag] = useState('')
  const [error, setError] = useState<string | null>(null)
  const idError = useId()

  const agregar = async () => {
    // Las reglas son del servidor (un id vacío o repetido en el campo se
    // rechaza): aquí no se calla nada, lo que diga va junto a la caja.
    const r = await onAgregar({
      id: idLimpio(nombre), etiqueta: nombre.trim(), equipo: tag || undefined,
      pie: tag ? undefined : 'sin instrumentar',
      fluido: grupo.fluido, nivelDe: tag ? grupo.nivelDe : undefined,
    })
    // Si se rechaza, lo escrito se queda para corregirlo.
    if (r.ok) { setNombre(''); setTag(''); setError(null) } else setError(r.error)
  }

  return (
    <Panel titulo={grupo.etiqueta.toUpperCase()}
      extra={`${(grupo.miembros?.length ?? 0) + (grupo.restantes?.cuantos ?? 0)} configurados`}>
      {grupo.miembros?.map(m => (
        <div key={m.id} className="flex items-center gap-2 border-b border-[var(--linea2)] py-2 last:border-0">
          <span className={cn('size-[7px] shrink-0 rounded-full',
            m.equipo ? 'bg-[var(--tinta3)]' : 'border border-dashed border-[var(--tinta3)]')} />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[12px]">{m.etiqueta}</b>
            <small className="font-mono text-[10px] text-[var(--tinta3)]">
              {m.id}{m.equipo ? ` · ${m.equipo}` : ' · sin instrumentar'}{m.pmo ? ` · ${m.pmo}` : ''}
            </small>
          </span>
          {puede && (
            <button onClick={() => onQuitar(m.id)} aria-label={`Quitar ${m.etiqueta}`}
              className="cursor-pointer rounded border border-[var(--linea2)] p-1 text-[var(--tinta3)] hover:border-[var(--tinta)] hover:text-[var(--tinta)]">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      ))}
      {grupo.restantes && (
        <p className="flex flex-wrap items-center gap-x-1 pt-2 text-[11px] text-[var(--tinta3)]">
          + {grupo.restantes.cuantos} {grupo.restantes.etiqueta} sin detallar
          <Info titulo="Sin detallar" texto="En el esquema salen agrupados en un solo nodo." />
        </p>
      )}
      {puede && (
        // Un formulario: Enter agrega, igual que el botón.
        <form className="mt-2 flex flex-wrap gap-1.5 border-t border-[var(--linea2)] pt-2.5" onSubmit={e => { e.preventDefault(); void agregar() }}>
          <input value={nombre} onChange={e => { setNombre(e.target.value); setError(null) }}
            placeholder="Nombre · p. ej. LC-22 · ESP" aria-label="Nombre del elemento"
            aria-invalid={!!error} aria-describedby={error ? idError : undefined}
            className="min-w-0 flex-1 basis-[11rem] rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[4px] text-[11.5px] outline-none focus:border-acento" />
          <select value={tag} onChange={e => setTag(e.target.value)} aria-label="Equipo instrumentado"
            className="rounded border border-[var(--linea)] bg-[var(--panel2)] px-1.5 py-[4px] text-[11.5px] outline-none focus:border-acento">
            <option value="">sin instrumentar</option>
            {pedirCatalogoEquipos().map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Boton variante="principal" type="submit"><Plus className="mr-1 inline size-3" />Agregar</Boton>
          {error && <p id={idError} role="alert" className="basis-full text-[11.5px] font-semibold">{error}</p>}
        </form>
      )}
    </Panel>
  )
}

function AgregarElemento({ tren, onAgregar }: {
  tren: Exclude<Tren, 'tronco'>; onAgregar: (el: Elemento) => Promise<ResultadoPlanta>
}) {
  const [tipo, setTipo] = useState(0)
  const [nombre, setNombre] = useState('')
  const [tag, setTag] = useState('')
  const opcion = CATALOGO[tren][tipo] ?? CATALOGO[tren][0]!
  const [error, setError] = useState<string | null>(null)
  const idError = useId()

  const agregar = async () => {
    const etiqueta = nombre.trim() || opcion[1]
    const r = await onAgregar({
      id: `${opcion[0]}-${Date.now().toString(36)}`,
      etiqueta, simbolo: opcion[0], equipo: tag || undefined,
      pie: tag ? undefined : 'sin instrumentar',
      rama: opcion[0] === 'tea' || undefined,
      fluido: opcion[0] === 'tanque' ? (tren === 'agua' ? 'agua' : 'crudo') : undefined,
    })
    if (r.ok) { setNombre(''); setTag(''); setError(null) } else setError(r.error)
  }

  return (
    <form className="mt-2 flex flex-wrap gap-1.5 border-t border-[var(--linea2)] pt-2.5" onSubmit={e => { e.preventDefault(); void agregar() }}>
      <select value={tipo} onChange={e => setTipo(Number(e.target.value))} aria-label="Tipo de elemento"
        className="rounded border border-[var(--linea)] bg-[var(--panel2)] px-1.5 py-[4px] text-[11.5px] outline-none focus:border-acento">
        {CATALOGO[tren].map(([, n], i) => <option key={n} value={i}>{n}</option>)}
      </select>
      <input value={nombre} onChange={e => { setNombre(e.target.value); setError(null) }} placeholder="Nombre (opcional)"
        aria-label="Nombre del elemento" aria-invalid={!!error} aria-describedby={error ? idError : undefined}
        className="min-w-0 flex-1 rounded border border-[var(--linea)] bg-[var(--panel2)] px-2 py-[4px] text-[11.5px] outline-none focus:border-acento" />
      <select value={tag} onChange={e => setTag(e.target.value)} aria-label="Equipo instrumentado"
        className="rounded border border-[var(--linea)] bg-[var(--panel2)] px-1.5 py-[4px] text-[11.5px] outline-none focus:border-acento">
        <option value="">sin instrumentar</option>
        {pedirCatalogoEquipos().map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <Boton variante="principal" type="submit"><Plus className="mr-1 inline size-3" />Montar</Boton>
      {error && <p id={idError} role="alert" className="basis-full text-[11.5px] font-semibold">{error}</p>}
    </form>
  )
}
