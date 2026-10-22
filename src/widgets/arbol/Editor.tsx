import { useState } from 'react'
import { useApp } from '@/app/store'
import {
  PASOS, RESPONSABLES, IMPACTOS, PLANEACIONES, PONEN_YACIMIENTO, ETIQUETA_PLANEACION, ETIQUETA_RESPONSABLE, cadenaVista, esDePersona,
  type PasoAnh, type ParadaAnh, type Planeacion, type ClaveN1, type CodigoN2,
} from '@/shared/api/arbol'
import { CLAVES_N1, planeacionDeN1, n1DeCodigo, n2DeN1 } from '@/entities/anh-catalogo'
import { MOTIVO_MINIMO, alcanza } from '@/entities/reglas'
import type { ChokeAnh } from '@/shared/api/choke'
import { Boton } from '@/shared/ui/primitivas'
import { cn } from '@/shared/lib/cn'
import { OPCION } from './Preguntas'
import { marcaDelPaso } from './marcas'
import {
  ROTULO, OPCIONES_CHOKE, OPCION_CHOKE, LINEA_CHOKE, MOTIVOS, EVIDENCIAS, valorEnPalabras,
} from './palabras'
import type { Grupo } from './grupos'

const MARCADA = 'border-acento bg-acento-f shadow-[inset_0_0_0_1px_var(--acento)]'
const CAMPO = 'min-h-10 w-full min-w-0 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-1 text-[12px] sm:min-h-8'
/** Lo que se le pide a producción con «Pedir a producción», para que lo lea con la parada. */
const PIDE_YACIMIENTO = '¿Fue el yacimiento? Revise la prueba del pozo, el corte de agua o la presión de fondo.'

type Valores = Partial<Record<PasoAnh, string>>

/** Corregir o completar pasos de una parada (U1 §2.3-2.5; U2 §1.5 y §4.3),
 *  para supervisión, producción, el jefe y confiabilidad.
 *  - El paso 2 con sus opciones en palabras de campo y su línea; «En el
 *    yacimiento» solo para producción y confiabilidad, diciendo qué lo muestra.
 *  - Las causas, filtradas por «¿Planeada?» y el detalle por la causa: la
 *    combinación cruzada no se puede armar (C24 p.7). Si se cambia la
 *    planeación, la causa de la otra se borra y se pide de nuevo.
 *  - Lo que falta empieza en lo que TRIM sugiere (una preselección).
 *  - Si cambia lo que ya dijo una persona, el motivo es obligatorio.
 *  - En una cascada: «¿Aplica a los {n} pozos de esta parada?». */
export function Editor({ g, rolId, pasos, titulo, onCerrar, onHecho }: {
  g: Grupo; rolId: string; pasos: readonly PasoAnh[]; titulo: string
  onCerrar: () => void; onHecho: (texto: string) => void
}) {
  const p = g.primera
  const clasificarAnh = useApp(s => s.clasificarAnh), yacimientoAnh = useApp(s => s.yacimientoAnh), revisarAnh = useApp(s => s.revisarAnh)
  const actual = (x: PasoAnh) => (p.clasificacion[x] ? String(p.clasificacion[x]!.valor) : undefined)
  const faltan = (x: PasoAnh) => p.faltan.includes(x)
  // La planeación arrastra la causa y el detalle: se ven con ella.
  const visibles = PASOS.filter(x => pasos.includes(x) || (x === 'n1' && pasos.includes('planeacion')) || (x === 'n2' && (pasos.includes('n1') || pasos.includes('planeacion'))))
  const [valores, setValores] = useState<Valores>(() => Object.fromEntries(visibles.map(x => [x, actual(x) ?? (p.propuesta.sugerido[x] !== undefined ? String(p.propuesta.sugerido[x]) : '')])))
  const [aviso, setAviso] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [otraEvidencia, setOtraEvidencia] = useState('')
  const [soloA, setSoloA] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [otroMotivo, setOtroMotivo] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const ponerYac = PONEN_YACIMIENTO.includes(rolId)
  const soloChoke = pasos.length === 1 && pasos[0] === 'choke'
  const plan = (valores.planeacion || actual('planeacion')) as Planeacion | undefined
  const n1 = (valores.n1 ?? actual('n1')) as ClaveN1 | undefined

  // Las opciones de cada paso: las cerradas que admite la regla si el paso falta; si no, las del catálogo.
  const opcionesChoke = OPCIONES_CHOKE.filter(c => (c !== 'reservorio' || (ponerYac && soloChoke))
    && (c === 'reservorio' || !faltan('choke') || !p.propuesta.opciones.choke || p.propuesta.opciones.choke.includes(c)))
  const opcionesResp = faltan('responsable') && p.propuesta.opciones.responsable ? p.propuesta.opciones.responsable : RESPONSABLES
  const opcionesImpacto = faltan('impacto') && p.propuesta.opciones.impacto ? p.propuesta.opciones.impacto : IMPACTOS
  const opcionesPlan = faltan('planeacion') && p.propuesta.opciones.planeacion ? p.propuesta.opciones.planeacion : PLANEACIONES
  const deLaPlaneacion = (ks: readonly ClaveN1[]) => ks.filter(k => !plan || planeacionDeN1(k) === plan)
  const n1Regla = faltan('n1') && p.propuesta.opciones.n1 ? deLaPlaneacion(p.propuesta.opciones.n1) : []
  const opcionesN1 = n1Regla.length ? n1Regla : deLaPlaneacion(CLAVES_N1)
  const n2Regla = n1 && faltan('n2') && p.propuesta.opciones.n2 ? p.propuesta.opciones.n2.filter(c => n1DeCodigo(c) === n1) : []
  const opcionesN2: readonly CodigoN2[] = n1 ? (n2Regla.length ? n2Regla : n2DeN1(n1)) : []

  const poner = (x: PasoAnh, v: string) => {
    setError('')
    setValores(antes => {
      const nuevo: Valores = { ...antes, [x]: v }
      if (x === 'planeacion') {
        const causa = nuevo.n1 ?? actual('n1')
        if (causa && planeacionDeN1(causa as ClaveN1) !== v) {
          nuevo.n1 = ''; nuevo.n2 = ''
          setAviso(`Cambió a «${ETIQUETA_PLANEACION[v as Planeacion]}»: la causa que tenía era de las ${v === 'planeada' ? 'no planeadas' : 'planeadas'}. Escoja la causa otra vez.`)
        } else setAviso('')
      }
      if (x === 'n1') {
        const detalle = nuevo.n2 ?? actual('n2')
        if (detalle && n1DeCodigo(detalle as CodigoN2) !== v) nuevo.n2 = ''
      }
      return nuevo
    })
  }

  // Lo que cambió: lo que se manda. Un paso vacío no se manda (la planeación
  // que cambia ya borra en el servidor la causa de la otra planeación).
  const cambios = PASOS.filter(x => !!valores[x] && valores[x] !== actual(x))
  const yac = valores.choke === 'reservorio'
  const evidenciaFinal = evidencia === 'otra' ? otraEvidencia.trim() : evidencia
  const tocaAPersona = cambios.some(x => { const d = p.clasificacion[x]; return !!d && esDePersona(d.procedencia) })
  const motivoFinal = motivo === 'otra' ? otroMotivo.trim() : motivo
  // La coherencia, por si algo llegara armado de otro modo: no se manda nada cruzado (C24 p.7).
  const planFinal = (valores.planeacion || actual('planeacion')) as Planeacion | undefined
  const n1Final = (valores.n1 === '' ? undefined : valores.n1 ?? actual('n1')) as ClaveN1 | undefined
  const n2Final = (valores.n2 === '' ? undefined : valores.n2 ?? actual('n2')) as CodigoN2 | undefined
  const cruzada = !!planFinal && !!n1Final && planeacionDeN1(n1Final) !== planFinal
  const detalleAjeno = !!n1Final && !!n2Final && n1DeCodigo(n2Final) !== n1Final
  const falta = !cambios.length ? 'No ha cambiado nada.'
    : cruzada ? `«${ETIQUETA_PLANEACION[planFinal!]}» no va con esa causa: la ANH rechaza el reporte entero (Circular 024, p. 7). Escoja una causa ${planFinal === 'planeada' ? 'planeada' : 'no planeada'}.`
      : detalleAjeno ? 'Ese detalle no es de la causa escogida.'
        : yac && !evidenciaFinal ? 'Diga qué lo muestra.'
          : tocaAPersona && !alcanza(motivoFinal, MOTIVO_MINIMO) ? 'Diga por qué lo cambia: ya lo había dicho una persona.' : ''

  const cascada = g.cascada && g.pozos.length > 1
  // «En el yacimiento» es de cada pozo (su roca, su fluido): no se extiende a la cascada.
  const soloAEf = yac && cascada ? soloA ?? g.pozos[0]! : soloA
  const filaDe = (pozo: string | null) => (pozo ? g.filas.find(f => f.pozo === pozo) ?? p : p)
  const guardar = async () => {
    if (falta) return setError(falta)
    setOcupado(true); setError('')
    const fila: ParadaAnh = filaDe(soloAEf)
    const alcance = cascada && !soloAEf ? { aplicarALaCascada: true } : { aplicarAlEvento: true }
    const r = yac
      ? await yacimientoAnh(fila.id, { evidencia: evidenciaFinal, ...(tocaAPersona ? { motivo: motivoFinal } : {}), aplicarAlEvento: true, cadena: cadenaVista(fila.clasificacion) })
      : await clasificarAnh(fila.id, { pasos: Object.fromEntries(cambios.map(x => [x, valores[x]!])), ...(tocaAPersona ? { motivo: motivoFinal } : {}), ...alcance, cadena: cadenaVista(fila.clasificacion) })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    const a = cascada && !soloAEf ? `los ${g.pozos.length} pozos` : soloAEf ?? g.pozos.join(', ')
    onHecho(`Guardado en ${a}: ${cambios.map(x => `${ROTULO[x]} → ${valorEnPalabras(x, valores[x]!)}`).join(' · ')}.`)
    onCerrar()
  }
  // «Pedir a producción» (U2 §4.3): quien no pone el yacimiento se lo pide a quien sí, con la parada.
  const [pedido, setPedido] = useState(PIDE_YACIMIENTO)
  const pedir = async () => {
    if (!alcanza(pedido, MOTIVO_MINIMO)) return setError('Diga qué le pide a producción.')
    setOcupado(true); setError('')
    const r = await revisarAnh(p.id, { motivo: pedido.trim(), pedirA: 'prod', ...(cascada ? { aplicarALaCascada: true } : { aplicarAlEvento: true }), cadena: g.cadena })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    onHecho(`Listo: se le pidió a producción que revise ${cascada ? `los ${g.pozos.length} pozos` : g.pozos.join(', ')}. La parada le aparece en «Revisar».`)
    onCerrar()
  }

  const radios = <T extends string>(x: PasoAnh, opciones: readonly T[], texto: (v: T) => string, linea?: (v: T) => string) => (
    <span className="flex flex-wrap gap-1">
      {opciones.map(v => (
        <button key={v} type="button" role="radio" aria-checked={valores[x] === v} onClick={() => poner(x, v)} className={cn(OPCION, valores[x] === v && MARCADA)}>
          {texto(v)}{linea && <small className="block text-[10px] text-[var(--tinta3)]">{linea(v)}</small>}
        </button>
      ))}
    </span>
  )
  const lista = (x: PasoAnh, opciones: readonly string[], texto: (v: string) => string, vacio: string) => (
    <select value={valores[x] ?? ''} onChange={e => poner(x, e.target.value)} className={CAMPO} aria-label={ROTULO[x]} disabled={!opciones.length}>
      <option value="">{vacio}</option>
      {opciones.map(v => <option key={v} value={v}>{texto(v)}</option>)}
    </select>
  )

  return (
    <form className="no-imprimir mt-2 grid gap-2.5 rounded border border-[var(--linea)] bg-[var(--panel2)] p-2.5" aria-label={titulo}
      onSubmit={e => { e.preventDefault(); void guardar() }}>
      <b className="text-[12px]">{titulo}</b>
      {visibles.map(x => (
        <div key={x} className="grid gap-1" data-editar={x}>
          <span className="flex flex-wrap items-baseline gap-x-2 text-[11.5px] font-semibold">
            {ROTULO[x]}
            {actual(x) !== undefined
              ? <small className="font-normal text-[var(--tinta2)]">Ahora: {valorEnPalabras(x, actual(x)!)} · {marcaDelPaso(p, x, g.pozos.length <= 1)}</small>
              : p.propuesta.sugerido[x] !== undefined && <small className="font-normal text-[var(--tinta2)]">falta · TRIM sugiere: {valorEnPalabras(x, String(p.propuesta.sugerido[x]))}</small>}
          </span>
          {x === 'choke' && (
            <div role="radiogroup" aria-label={ROTULO.choke} className="grid gap-1">
              {radios<ChokeAnh>('choke', opcionesChoke, c => OPCION_CHOKE[c], c => LINEA_CHOKE[c])}
              {!ponerYac && (
                <div className="grid gap-1" data-pedir-a="prod">
                  <small className="text-[10.5px] text-[var(--tinta2)]">¿Fue el yacimiento? Lo pone producción o confiabilidad, con lo que lo muestra: la prueba del pozo, el corte de agua o la presión de fondo.</small>
                  <span className="flex flex-wrap items-center gap-1">
                    <input value={pedido} onChange={e => { setPedido(e.target.value); setError('') }} className={cn(CAMPO, 'sm:flex-1')} aria-label="Lo que le pide a producción" />
                    <button type="button" disabled={ocupado} onClick={() => void pedir()} className={OPCION}>Pedir a producción</button>
                  </span>
                </div>
              )}
              {yac && (
                <div role="group" aria-label="¿Qué lo muestra?" className="grid gap-1 border-l-2 border-[var(--linea)] pl-2">
                  <span className="text-[11.5px] font-semibold">¿Qué lo muestra?</span>
                  <span className="flex flex-wrap gap-1">
                    {EVIDENCIAS.map(e => <button key={e.clave} type="button" aria-pressed={evidencia === e.clave} onClick={() => { setEvidencia(e.clave); setError('') }} className={cn(OPCION, evidencia === e.clave && MARCADA)}>{e.texto}</button>)}
                    <button type="button" aria-pressed={evidencia === 'otra'} onClick={() => setEvidencia('otra')} className={cn(OPCION, evidencia === 'otra' && MARCADA)}>Otra…</button>
                  </span>
                  {evidencia === 'otra' && <input value={otraEvidencia} onChange={e => setOtraEvidencia(e.target.value)} className={CAMPO} aria-label="Qué lo muestra" placeholder="Ej.: la prueba de presión del 30-sep" />}
                </div>
              )}
            </div>
          )}
          {x === 'responsable' && (opcionesResp.length <= 4
            ? <div role="radiogroup" aria-label={ROTULO.responsable}>{radios('responsable', opcionesResp, v => ETIQUETA_RESPONSABLE[v])}</div>
            : lista('responsable', opcionesResp, v => valorEnPalabras('responsable', v), 'Escoja quién…'))}
          {x === 'impacto' && <div role="radiogroup" aria-label={ROTULO.impacto}>{radios('impacto', opcionesImpacto, v => valorEnPalabras('impacto', v))}</div>}
          {x === 'planeacion' && <div role="radiogroup" aria-label={ROTULO.planeacion}>{radios('planeacion', opcionesPlan, v => valorEnPalabras('planeacion', v))}</div>}
          {x === 'n1' && lista('n1', opcionesN1, v => valorEnPalabras('n1', v), `Escoja la causa${plan ? ` (${ETIQUETA_PLANEACION[plan].toLowerCase()})` : ''}…`)}
          {x === 'n2' && lista('n2', opcionesN2, v => valorEnPalabras('n2', v), n1 ? 'Escoja el detalle…' : 'Escoja primero la causa')}
        </div>
      ))}
      {aviso && <p role="status" className="text-[11px] text-[var(--tinta)]">{aviso}</p>}
      {visibles.includes('responsable') && valores.responsable === 'ext-transportador' && (valores.choke ?? actual('choke')) !== 'exportacion' && (
        // U2 §1.5: cuando cambia quién, se pregunta; nunca se cambia solo.
        <div role="group" aria-label="¿Cambiamos también dónde se trabó?" className="grid gap-1 text-[11px]">
          <span>Cambió quién: ahora es {ETIQUETA_RESPONSABLE['ext-transportador']}. ¿Cambiamos también dónde se trabó a «Afuera»?</span>
          <span className="flex flex-wrap gap-1">
            <button type="button" className={OPCION} onClick={() => poner('choke', 'exportacion')}>Sí</button>
            <button type="button" className={OPCION} onClick={() => setValores(v => ({ ...v, choke: actual('choke') ?? '' }))}>No, dejar como estaba</button>
          </span>
        </div>
      )}
      {cascada && (
        <div role="group" aria-label={yac ? '¿A qué pozo?' : `¿Aplica a los ${g.pozos.length} pozos de esta parada?`} className="grid gap-1">
          <span className="text-[11.5px] font-semibold">{yac ? '¿A qué pozo? «En el yacimiento» se pone pozo por pozo.' : `¿Aplica a los ${g.pozos.length} pozos de esta parada?`}</span>
          <span className="flex flex-wrap gap-1">
            {!yac && <button type="button" aria-pressed={!soloAEf} onClick={() => setSoloA(null)} className={cn(OPCION, !soloAEf && MARCADA)}>Sí, a los {g.pozos.length}</button>}
            {g.pozos.length <= 3
              ? g.pozos.map(z => <button key={z} type="button" aria-pressed={soloAEf === z} onClick={() => setSoloA(z)} className={cn(OPCION, soloAEf === z && MARCADA)}>Solo a {z}</button>)
              : <select value={soloAEf ?? ''} onChange={e => setSoloA(e.target.value || null)} className={cn(CAMPO, 'sm:w-auto')} aria-label="Solo a un pozo">
                  {!yac && <option value="">Solo a un pozo…</option>}
                  {g.pozos.map(z => <option key={z} value={z}>Solo a {z}</option>)}
                </select>}
          </span>
        </div>
      )}
      {tocaAPersona && (
        <div role="group" aria-label="¿Por qué lo cambia?" className="grid gap-1">
          <span className="text-[11.5px] font-semibold">¿Por qué lo cambia? <small className="font-normal text-[var(--tinta2)]">(ya lo había dicho una persona)</small></span>
          <span className="flex flex-wrap gap-1">
            {MOTIVOS.map(m => <button key={m} type="button" aria-pressed={motivo === m} onClick={() => { setMotivo(m); setError('') }} className={cn(OPCION, motivo === m && MARCADA)}>{m}</button>)}
            <button type="button" aria-pressed={motivo === 'otra'} onClick={() => setMotivo('otra')} className={cn(OPCION, motivo === 'otra' && MARCADA)}>Otra razón…</button>
          </span>
          {motivo === 'otra' && <input value={otroMotivo} onChange={e => setOtroMotivo(e.target.value)} className={CAMPO} aria-label="Otra razón" placeholder="Ej.: el pórtico sí cayó: lo vio el electricista" />}
        </div>
      )}
      {error && <p role="alert" className="text-[11px] text-[var(--tinta)]">{error}</p>}
      <span className="flex flex-wrap gap-1.5">
        <Boton variante="principal" type="submit" disabled={ocupado || !!falta} className="min-h-10 sm:min-h-0">Guardar</Boton>
        <Boton type="button" onClick={onCerrar} className="min-h-10 sm:min-h-0">Cancelar</Boton>
      </span>
      {falta && cambios.length > 0 && <small className="text-[10.5px] text-[var(--tinta2)]">{falta}</small>}
    </form>
  )
}
