import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useRol, usePersona } from '@/app/store'
import { CONFIRMAN_EN_LOTE, ROLES_QUE_CONTESTAN, esDePersona, type ParadaAnh, type PasoAnh } from '@/shared/api/arbol'
import { TIPO_CAUSA } from '@/entities/causa-senal'
import { campoPorId } from '@/entities/campos'
import { puedeHacer } from '@/entities/tipos'
import { Boton, Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { n0, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Cadena, Falta } from './Cadena'
import { Preguntas } from './Preguntas'
import { Editor } from './Editor'
import { confirmar } from './escribir'
import { ABREN_EL_EQUIPO, esperaAQuienAbre, type Grupo } from './grupos'
import { marcaDelPaso } from './marcas'
import { ESTADO, horaCorta, lista, valorEnPalabras, sinReferencias } from './palabras'

/** Los roles que abren el equipo o estuvieron en el pozo: contestan lo suyo y
 *  confirman solo eso (P1 §1.3). Ven la cadena técnica plegada (U1 §10.1). */
const DE_CAMPO = ['oper', 'tec']
/** Lo que es de su terreno: «¿estaba programado?» y «¿se perdió algo?». */
const SUYO: readonly PasoAnh[] = ['planeacion', 'impacto']
const RESPUESTA_CAMPO: Partial<Record<PasoAnh, Record<string, string>>> = {
  planeacion: { planeada: 'Sí, estaba en el programa', 'no-planeada': 'No, fue de repente' },
  impacto: { diferida: 'No, solo dejó de producir', perdida: 'Sí, se perdió crudo o gas' },
}
const PREGUNTA_CAMPO: Partial<Record<PasoAnh, string>> = { planeacion: '¿Estaba programado?', impacto: '¿Se perdió algo?' }

/** «Confirmar los 2», «Confirmar los 3 días»: lo que confirma el toque. */
const etiquetaConfirmar = (g: Grupo) =>
  g.pozos.length > 1 ? `Confirmar los ${g.pozos.length}` : g.filas.length > 1 ? `Confirmar los ${g.filas.length} días` : 'Confirmar'

/** Una parada (o una cascada: una raíz, varios pozos) en Identificar, con su
 *  cadena de 6 pasos, lo que falta preguntar y la confirmación por paso según
 *  el rol (U1 §2; U2 §4 y §9.3).
 *  - Supervisión, producción, el jefe y confiabilidad ven los 6 pasos abiertos
 *    y confirman con un toque (o uno por grupo en lote: supervisión y producción).
 *  - El operador y el técnico ven y confirman lo suyo; la cadena técnica va
 *    plegada con «lo propone TRIM; lo confirma su supervisor». */
export function TarjetaParada({ g, global, onHecho }: { g: Grupo; global: boolean; onHecho: (texto: string) => void }) {
  const rol = useRol(); const persona = usePersona()
  const id = useId()
  const p = g.primera
  const deCampo = DE_CAMPO.includes(rol.id)
  const revisa = ROLES_QUE_CONTESTAN.revisa.includes(rol.id)
  // Los códigos de la ANH (NP_PROC…) solo a un toque y solo para confiabilidad (U1 §1.0, punto 7).
  const codigos = rol.id === 'conf'
  const puede = puedeHacer(rol.puede, 'anh:clasificar') && !persona.sinAcceso
  const enLote = CONFIRMAN_EN_LOTE.includes(rol.id)
  const [editor, setEditor] = useState<null | 'choke' | 'otros' | 'faltan'>(null)
  const [verTecnico, setVerTecnico] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const inicio = g.filas.reduce((a, f) => (f.inicio < a ? f.inicio : a), p.inicio)
  const dias = new Set(g.filas.map(f => f.diaOperacional)).size
  const sigue = g.filas.some(f => f.abiertaAlCorte && f.diaEnCurso)
  const pozos = g.pozos.length <= 3 ? lista(g.pozos) : plural(g.pozos.length, 'pozo', 'pozos')
  const que = g.cascada ? `por ${p.causa.equipo}` : TIPO_CAUSA[p.causa.tipo].toLowerCase()
  const verbo = g.pozos.length > 1 ? 'cerraron' : 'cerró'
  // Lo que el operador puede confirmar: lo suyo que todavía no dijo una persona.
  const suyoPorConfirmar = SUYO.filter(x => { const d = p.clasificacion[x]; return !!d && !esDePersona(d.procedencia) })
  // Supervisión no confirma la causa que una señal solo apunta: la confirma quien abre el equipo (P1 §2.1).
  const confirmable = g.estado === 'propuesta' && (!esperaAQuienAbre(p) || ABREN_EL_EQUIPO.includes(rol.id))
  // Varias filas que este rol no confirma de una vez (solo supervisión y producción lo hacen en lote): una por una.
  const porFila = puede && g.filas.length > 1 && (deCampo ? suyoPorConfirmar.length > 0 : confirmable && !enLote)
  const [verFilas, setVerFilas] = useState(porFila)

  const enviar = async (ids: string[], pasos?: PasoAnh[]) => {
    setOcupado(true); setError('')
    const r = await confirmar({ ids, cadena: g.cadena, ...(pasos ? { pasos } : {}) })
    setOcupado(false)
    if (!r.ok) return setError(r.error)
    const filas = r.paradas
    const completas = filas.filter(f => f.estado === 'confirmada').length
    const quienes = [...new Set(filas.map(f => f.pozo))]
    onHecho(deCampo
      ? `Listo. Su respuesta en ${lista(quienes)} queda guardada; el supervisor revisa el resto.`
      : completas === filas.length
        ? `Listo. ${lista(quienes)} ${filas.length === 1 ? 'queda completa' : `quedan completas (${filas.length} filas)`}${r.lote ? `, en un lote (${r.lote.id})` : ''}.`
        : `Listo: quedó confirmado lo que su rol avala en ${lista(quienes)}. La causa y el detalle los confirma quien abra el equipo: el jefe de mantenimiento o confiabilidad.`)
  }

  const chips = (
    <span className="flex flex-wrap items-center gap-1">
      {g.estado === 'confirmada' || g.estado === 'propuesta' ? <Chip>{ESTADO[g.estado]}</Chip> : <Falta>{ESTADO[g.estado]}</Falta>}
      {sigue && <Chip tono="fuerte">sigue parado</Chip>}
      {p.parcial && <Chip>parcial · {n0(p.fraccion * 100)} % del caudal</Chip>}
      {p.disparo && <Chip>disparo</Chip>}
      {p.exceso && <Chip>se pasó de la ventana del programa</Chip>}
      {dias > 1 && <Chip>{dias} días</Chip>}
    </span>
  )

  return (
    // Una cascada larga se parte entre hojas en el papel, entre sus filas (index.css: `data-partible`).
    <article data-parada-anh={p.id} data-estado={g.estado} aria-labelledby={`${id}-t`} data-partible={g.filas.length > 8 || undefined}
      className="border-b border-[var(--linea2)] py-3 first:pt-1 last:border-0 last:pb-1">
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <span className="min-w-0">
          <b id={`${id}-t`} className="text-[13px]">{pozos}</b>
          <span className="text-[11px] text-[var(--tinta3)]"> · {verbo} {horaCorta(inicio)} · {que}{global ? ` · ${campoPorId(p.campoId).nombre}` : ''}</span>
          <small className="block text-[10.5px] text-[var(--tinta2)]">
            {n0(g.bbl)} bbl diferidos{g.filas.length > 1 ? ` · ${plural(g.filas.length, 'fila', 'filas')} (una por pozo y día)` : ''}
            {p.tramo.m !== 1 && g.filas.length === 1 ? ` · tramo ${p.tramo.n}${p.tramo.m ? ` de ${p.tramo.m}` : ''}` : ''}
          </small>
        </span>
        {chips}
      </header>

      {g.cascada && (
        <p className="mt-1 text-[11px] text-[var(--tinta2)]">
          {g.pozos.length > 4
            ? <>{g.pozos.length} pozos · una sola raíz: <b className="text-[var(--tinta)]">{p.causa.equipo}</b></>
            : <>Una sola raíz, <b className="text-[var(--tinta)]">{p.causa.equipo}</b>: {g.filas.filter((f, i, xs) => xs.findIndex(y => y.pozo === f.pozo) === i).map(f => `${f.pozo} cerró a los ${f.minutosDesdeRaiz ?? 0} min`).join(' · ')}</>}
        </p>
      )}

      {deCampo ? (
        <div className="mt-2 grid gap-1.5 text-[11.5px]">
          {SUYO.map(x => {
            const d = p.clasificacion[x]
            return (
              <div key={x} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-[var(--tinta2)]">{PREGUNTA_CAMPO[x]}</span>
                {d ? <b>{RESPUESTA_CAMPO[x]?.[String(d.valor)] ?? valorEnPalabras(x, String(d.valor))}</b> : <Falta />}
                {d && <small className="text-[10.5px] text-[var(--tinta2)]">{marcaDelPaso(p, x)}</small>}
              </div>
            )
          })}
          <button type="button" aria-expanded={verTecnico} aria-controls={`${id}-tec`} onClick={() => setVerTecnico(v => !v)}
            className="no-imprimir flex min-h-10 cursor-pointer items-center gap-1 text-left text-[11px] text-[var(--tinta2)] sm:min-h-0">
            <ChevronRight aria-hidden size={14} className={cn('shrink-0 transition-transform', verTecnico && 'rotate-90')} />
            Lo técnico (dónde se trabó, la causa y el detalle) lo propone TRIM; lo confirma su supervisor
          </button>
          <div id={`${id}-tec`} className={cn('pl-5', !verTecnico && 'hidden print:block')}>
            <Cadena p={p} pasos={['responsable', 'choke', 'n1', 'n2']} grupo={g.pozos.length > 1} />
          </div>
        </div>
      ) : (
        g.estado === 'pendiente' && p.faltan.length === 6
          // Sin causa faltan los 6: se dice en una línea, sin seis huecos iguales (U2 §4.2).
          ? <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-[var(--tinta2)]"><Falta>faltan los 6 pasos</Falta>Hasta que alguien diga qué pasó, no se sabe quién, dónde se trabó ni la causa.</p>
          : <div className="mt-2"><Cadena p={p} codigos={codigos} grupo={g.pozos.length > 1} /></div>
      )}
      {g.estado === 'pendiente' && (
        // Sin causa, la cadena no se puede proponer: la dice quien estuvo en el pozo (U2 §4.2).
        <p className="mt-1.5 text-[10.5px] text-[var(--tinta2)]">
          Lo que encontró se registra en «Por identificar» (o en «No conformidades», si ya arrancó): con eso TRIM propone los 6 pasos.
        </p>
      )}

      {revisa && g.estado !== 'confirmada' && p.clasificacion.apunta && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta2)]">
          Las señales apuntan a la causa, no la prueban: la causa y el detalle los confirma quien abra el equipo.
          <Info titulo="Una señal apunta, no prueba" texto={sinReferencias(p.clasificacion.apunta.porque)} />
        </p>
      )}
      {revisa && p.propuesta.hueco && (
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta2)]">
          <Chip>sin causa exacta en la ANH</Chip><Info titulo="Sin causa exacta en la ANH" texto={sinReferencias(p.propuesta.hueco)} />
        </p>
      )}

      {puede && <Preguntas g={g} rolId={rol.id} deCampo={deCampo} onHecho={onHecho} />}

      {puede && (
        <div className="no-imprimir mt-2.5 flex flex-wrap items-center gap-1.5">
          {deCampo ? (
            suyoPorConfirmar.length > 0 && g.filas.length === 1 && (
              <Boton variante="principal" disabled={ocupado} className="min-h-10 sm:min-h-0" onClick={() => void enviar([p.id], suyoPorConfirmar)}>Confirmar lo que contesté</Boton>
            )
          ) : (
            <>
              {confirmable && (g.filas.length === 1 || enLote) && (
                <Boton variante="principal" disabled={ocupado} className="min-h-10 sm:min-h-0" onClick={() => void enviar(g.filas.map(f => f.id))}>{etiquetaConfirmar(g)}</Boton>
              )}
              {g.estado !== 'pendiente' && <Boton disabled={ocupado} className="min-h-10 sm:min-h-0" aria-expanded={editor === 'choke'} onClick={() => setEditor(editor === 'choke' ? null : 'choke')}>Corregir dónde se trabó</Boton>}
              {p.faltan.length > 0 && <Boton disabled={ocupado} className="min-h-10 sm:min-h-0" aria-expanded={editor === 'faltan'} onClick={() => setEditor(editor === 'faltan' ? null : 'faltan')}>{p.faltan.length === 6 ? 'Completar los 6 pasos' : 'Completar lo que falta'}</Boton>}
              {g.estado !== 'pendiente' && <Boton disabled={ocupado} className="min-h-10 sm:min-h-0" aria-expanded={editor === 'otros'} onClick={() => setEditor(editor === 'otros' ? null : 'otros')}>Corregir otro paso</Boton>}
            </>
          )}
          {(deCampo ? suyoPorConfirmar.length > 0 : confirmable) && (
            <small className="basis-full text-[10px] text-[var(--tinta3)]">
              {porFila ? `${deCampo ? 'Confirme lo suyo' : 'Varias de una vez las confirman supervisión o producción, que firman el día: confírmelas'} una por una, en las filas de abajo.${deCampo ? ' El resto lo revisa su supervisor.' : ''}`
                : deCampo ? 'El resto lo revisa su supervisor.' : `Queda confirmado por ${persona.nombre} · hora del sistema.`}
            </small>
          )}
        </div>
      )}
      {!puede && revisa && persona.sinAcceso && <p className="mt-2 text-[10.5px] text-[var(--tinta2)]">Nadie con acceso activo tiene este rol: confirma una persona, no un rol.</p>}

      {editor && (
        <Editor g={g} rolId={rol.id}
          pasos={editor === 'choke' ? ['choke'] : editor === 'faltan' ? p.faltan : ['responsable', 'impacto', 'planeacion', 'n1', 'n2']}
          titulo={editor === 'choke' ? `¿Dónde se trabó? · ${pozos}` : editor === 'faltan' ? `Lo que falta · ${pozos}` : `Corregir un paso · ${pozos}`}
          onCerrar={() => setEditor(null)} onHecho={onHecho} />
      )}
      {error && <p role="alert" className="mt-1.5 text-[11px] text-[var(--tinta)]">{error}</p>}

      {g.filas.length > 1 && (
        <div className="mt-2">
          <button type="button" aria-expanded={verFilas} aria-controls={`${id}-filas`} onClick={() => setVerFilas(v => !v)}
            className="no-imprimir flex min-h-10 cursor-pointer items-center gap-1 text-[11px] text-[var(--tinta2)] sm:min-h-0">
            <ChevronRight aria-hidden size={14} className={cn('shrink-0 transition-transform', verFilas && 'rotate-90')} />
            Ver las {g.filas.length} filas del reporte
          </button>
          <ul id={`${id}-filas`} data-partible className={cn('mt-1 grid gap-0.5 pl-5 text-[11px]', !verFilas && 'hidden print:grid')} aria-label={`Filas de ${pozos}`}>
            {g.filas.map(f => {
              const suyo = SUYO.filter(x => { const d = f.clasificacion[x]; return !!d && !esDePersona(d.procedencia) })
              return <Fila key={f.id} f={f} confirmable={porFila && (!deCampo || suyo.length > 0)}
                ocupado={ocupado} onConfirmar={() => void enviar([f.id], deCampo ? suyo : undefined)} />
            })}
          </ul>
        </div>
      )}
    </article>
  )
}

/** Una fila del reporte: pozo × día, con sus horas y barriles. */
function Fila({ f, confirmable, ocupado, onConfirmar }: { f: ParadaAnh; confirmable: boolean; ocupado: boolean; onConfirmar: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-dashed border-[var(--linea2)] py-1 last:border-0">
      <b className="font-mono">{f.pozo}</b>
      <span className="tabular text-[var(--tinta2)]">{f.diaOperacional} · {horaCorta(f.inicio)}–{horaCorta(f.fin)}{f.abiertaAlCorte ? ' (sigue al corte)' : ''} · {n0(f.diferidaTrimBbl)} bbl</span>
      {confirmable && <Boton variante="chico" disabled={ocupado} className="no-imprimir min-h-10 sm:min-h-0" onClick={onConfirmar}>Confirmar {f.pozo}</Boton>}
    </li>
  )
}
