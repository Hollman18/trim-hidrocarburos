import { useId, useMemo, useState } from 'react'
import { Plug, KeyRound, Check, Lock, ChevronRight } from 'lucide-react'
import { useApp, useRol } from '@/app/store'
import { useRegistro, sugerir, asociarTag, inscribirBorde, type TagPendiente } from '@/shared/api/registro'
import type { Capacidad } from '@/entities/tipos'
import { Panel, Metrica, Chip, Boton, Hueco, Enlace } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { cadencia } from '@/entities/cadena'
import { cn } from '@/shared/lib/cn'
import { Integraciones } from '@/widgets/conectores/Integraciones'
import { AHORA } from '@/entities/reloj'
import { campoPorId } from '@/entities/campos'

// Contra el reloj de los datos (AHORA), no el del computador: si no, «hace 3 d» crece cada día.
const hace = (iso: string) => {
  const min = Math.max(0, Math.round((AHORA.getTime() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'hace instantes'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`
}

export function Conectores() {
  const rol = useRol()
  const campoId = useApp(s => s.campoId), setPantalla = useApp(s => s.setPantalla)
  const caps = useMemo(() => (Object.entries(rol.puede) as Array<[Capacidad, boolean]>)
    .filter(([, v]) => v).map(([k]) => k), [rol])
  const puede = rol.puede['conector:configurar']
  const { datos, error, sinServicio, recargar } = useRegistro(campoId, caps)
  // El código de inscripción es del campo para el que se pidió: al cambiar de
  // campo no se sigue pintando (un gateway inscrito con él quedaría en el otro
  // campo y sus barriles se atribuirían mal), y dice de qué campo es.
  const [codigoDe, setCodigoDe] = useState<{ campo: string; codigo: string; expiraEn: string; instruccion: string } | null>(null)
  const codigo = codigoDe?.campo === campoId ? codigoDe : null
  // El aviso es del campo en que se produjo: al cambiar de campo no se arrastra.
  const [avisoDe, setAvisoDe] = useState<{ campo: string; texto: string } | null>(null)
  const aviso = avisoDe?.campo === campoId ? avisoDe.texto : null
  // Mientras corre una escritura no se puede lanzar otra: un doble clic en
  // «Aplicar las N» mandaba cada asociación dos veces.
  const [ocupado, setOcupado] = useState(false)

  // Se asocia en el campo de los DATOS, no en el de la vista: un tag es de
  // donde lo reportó el registro.
  const asociar = async (tag: string, equipo: string, origen: string) => {
    if (!datos || ocupado) return
    setOcupado(true); setAvisoDe(null)
    try { await asociarTag(datos.campo, tag, equipo, origen, caps); recargar() }
    catch (e) { setAvisoDe({ campo: datos.campo, texto: `${tag} no se asoció: ${(e as Error).message}` }) }
    finally { setOcupado(false) }
  }

  // Cada rechazo del servidor (403, 404, 409) se cuenta y se dice: aceptar en
  // bloque no puede dejar tags pendientes sin explicación.
  const aplicarTodas = async (pend: TagPendiente[]) => {
    if (!datos || ocupado) return
    const { campo, inv } = datos
    setOcupado(true); setAvisoDe(null)
    const fallos: string[] = []
    let intentados = 0
    try {
      for (const t of pend) {
        const s = sugerir(t.tag, inv.equipos)
        if (!s) continue
        intentados++
        try { await asociarTag(campo, t.tag, s.codigo, 'regla', caps) }
        catch (e) { fallos.push(`${t.tag} → ${(e as Error).message}`) }
      }
    } finally { setOcupado(false) }
    // Cada fallo con su tag y el motivo del servidor, sin recortar: el que quedó
    // pendiente tiene que poder saber por qué.
    if (fallos.length) setAvisoDe({ campo, texto: `Se ${intentados - fallos.length === 1 ? 'asoció' : 'asociaron'} ${intentados - fallos.length} de ${intentados}; no se ${fallos.length === 1 ? 'pudo asociar' : 'pudieron asociar'}: ${fallos.join(' · ')}.` })
    recargar()
  }

  const inscribir = async () => {
    if (ocupado) return
    // Se guarda con el campo para el que se pidió, no el que esté a la vista cuando llegue.
    const pedidoPara = campoId
    setOcupado(true); setAvisoDe(null)
    try { setCodigoDe({ campo: pedidoPara, ...await inscribirBorde(pedidoPara, caps) }) }
    catch (e) { setAvisoDe({ campo: pedidoPara, texto: `No se pudo emitir el código: ${(e as Error).message}` }) }
    finally { setOcupado(false) }
  }

  // SAP y WhatsApp no dependen del registro de los bordes: se muestran aunque este no responda.
  const sistemas = <Integraciones campoId={campoId} />
  // En el demo construido no hay quién sirva el registro: se dice qué es y adónde ir, sin inventar bordes ni tags (A24).
  if (sinServicio) return (
    <div className="grid gap-3 sm:gap-4">{sistemas}<Panel titulo="Registro de bordes"><div data-registro-sin-servicio><Hueco>
      En el demo no hay bordes conectados: el registro lo sirve el backend.{' '}
      {rol.pantallas.includes('configuracion') && <Enlace onClick={() => setPantalla('configuracion')}>Ver la configuración</Enlace>}
    </Hueco></div></Panel></div>
  )
  if (error) return <div className="grid gap-3 sm:gap-4">{sistemas}<Panel titulo="Registro de bordes"><Hueco>No se pudo consultar el registro: {error}.</Hueco></Panel></div>
  if (!datos) return <div className="grid gap-3 sm:gap-4">{sistemas}<Panel titulo="Registro de bordes"><p className="text-[14px] text-[var(--tinta3)]">Consultando…</p></Panel></div>

  const { inv, pend } = datos
  const conSugerencia = pend.filter(t => sugerir(t.tag, inv.equipos))
  const fila = (t: TagPendiente) => (
    <FilaPendiente key={t.tag} t={t} equipos={inv.equipos} puede={puede} ocupado={ocupado}
      onAsociar={(equipo, origen) => asociar(t.tag, equipo, origen)} />
  )

  return (
    <div className="grid gap-3 sm:gap-4">
      {sistemas}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <Metrica titulo="Bordes conectados" valor={String(inv.gateways.length)} />
        <Metrica titulo="Tags registrados" valor={String(inv.tags.total)}
          pie={`${inv.tags.total - inv.tags.pendientes} asociados`} />
        <Metrica titulo="Por asociar" valor={String(inv.tags.pendientes)}
          pie={inv.tags.pendientes ? 'sin equipo resuelto' : undefined} />
        <Metrica titulo="Equipos del campo" valor={String(inv.equipos.length)}
          pie="del registro de ingeniería" />
      </div>

      <Lectura>
        Un <b>borde</b> es el equipo que está en campo leyendo los PLC y enviando los datos. Un
        <b> tag</b> es cada señal que llega. Un tag <b>por asociar</b> llegó bien pero todavía no se
        sabe de qué equipo es: hasta que se asocie, sus barriles no se pueden atribuir a nadie.
      </Lectura>

      {aviso && <div role="status"><Hueco>{aviso}</Hueco></div>}

      <Panel titulo="Bordes">
        {inv.gateways.map(g => (
          <div key={g.id} className="flex flex-wrap items-center gap-2 border-b border-[var(--linea2)] py-2.5 last:border-0">
            <Plug className="size-4 shrink-0 text-[var(--tinta3)]" />
            <span className="min-w-[200px] flex-1">
              <b className="font-cond block text-[15px] font-bold tracking-[.02em]">{g.id}</b>
              <small className="block text-[13px] text-[var(--tinta3)]">
                {g.modelo} · serie {g.serie} · firmware {g.firmware} · enlace {g.enlace} · buffer {g.buffer_h} h
              </small>
            </span>
            <Chip>{g.tags} tags</Chip>
            <span className="tabular text-right text-[13px] text-[var(--tinta2)]">
              reportó {hace(g.ultimo_visto)}
            </span>
          </div>
        ))}
        {puede ? (
          <div className="mt-3 border-t border-[var(--linea2)] pt-3">
            <Boton variante="principal" disabled={ocupado} onClick={inscribir}>
              <KeyRound className="mr-1 inline size-3.5" />Inscribir un borde nuevo
            </Boton>
            {codigo && (
              <div className="mt-3 rounded-[16px] bg-[var(--panel2)] p-4">
                <small className="block text-[13px] text-[var(--tinta3)]">Código para {campoPorId(codigo.campo).nombre}</small>
                <b className="tabular text-[20px] font-bold tracking-[.12em] text-[var(--tinta)]">{codigo.codigo}</b>
                <p className="mt-1 text-[14px] text-[var(--tinta2)]">
                  {codigo.instruccion} Vence en {codigo.expiraEn}.
                </p>
              </div>
            )}
          </div>
        ) : (
          <Hueco>
            <Lock className="mr-1 inline size-3.5" />
            Su rol no inscribe bordes: lo hace el administrador.
          </Hueco>
        )}
      </Panel>

      <Panel titulo="Tags por asociar">
        {pend.length === 0 ? (
          <p className="text-[14px] text-[var(--tinta2)]">
            Los {inv.tags.total} tags tienen equipo.
          </p>
        ) : (
          <>
            {puede && conSugerencia.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[14px] bg-[var(--panel2)] px-3.5 py-2.5">
                <span className="flex-1 text-[14px]">
                  {conSugerencia.length} de {pend.length} con sugerencia
                </span>
                <Boton variante="principal" disabled={ocupado} onClick={() => aplicarTodas(conSugerencia)}>
                  <Check className="mr-1 inline size-3" />{ocupado ? 'Asociando…' : `Aplicar las ${conSugerencia.length}`}
                </Boton>
              </div>
            )}
            {/* Es una cola de trabajo y «Aplicar las N» asocia todas: se ven todas, sin «ver N más». Cada
                fila abre su asociación a mano: una sola acción principal en la tarjeta (UI-19). */}
            <ul>{pend.map(fila)}</ul>
          </>
        )}
      </Panel>
    </div>
  )
}

function FilaPendiente({ t, equipos, puede, ocupado, onAsociar }: {
  t: TagPendiente
  equipos: Array<{ codigo: string; nombre: string }>
  puede: boolean
  ocupado: boolean
  onAsociar: (equipo: string, origen: string) => void
}) {
  const s = sugerir(t.tag, equipos as never)
  const [elegido, setElegido] = useState(s?.codigo ?? '')
  const [abierta, setAbierta] = useState(false)
  const idAsociar = useId()
  const detalle = <>
    <b className="font-cond block text-[15px] font-bold tracking-[.02em]">{t.tag}</b>
    <small className="block text-[13px] text-[var(--tinta2)]">
      {t.tipo}{t.unidad ? ` · ${t.unidad}` : ''} · {t.protocolo} · cada {cadencia(t.cadencia_s)} · {t.gateway_id}
    </small>
  </>

  return (
    <li className="border-t border-[var(--linea2)] first:border-t-0" data-tag-pendiente={t.tag}>
      <div className="flex min-h-14 items-center gap-x-1.5 py-2">
        {/* La fila entera abre la asociación (con «›» al final); el porqué de la sugerencia va en su ⓘ y en el papel. */}
        {puede
          ? <button type="button" aria-expanded={abierta} aria-controls={idAsociar} onClick={() => setAbierta(v => !v)}
              className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-left hover:[&_b]:underline">
              <span className="min-w-[170px] flex-1">{detalle}</span>
              {s && <Chip tono={s.confianza === 'alta' ? 'fuerte' : 'neutro'}>sugerido {s.codigo}</Chip>}
              <ChevronRight aria-hidden className={cn('size-5 shrink-0 text-[var(--tinta3)] transition-transform duration-[120ms]', abierta && 'rotate-90')} />
            </button>
          : <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-[170px] flex-1">{detalle}</span>
              {s && <Chip tono={s.confianza === 'alta' ? 'fuerte' : 'neutro'}>sugerido {s.codigo}</Chip>}
            </span>}
        {s && <Info titulo={`Sugerido ${s.codigo}`} texto={`Por nomenclatura: ${s.razon}.`} />}
      </div>
      {puede && abierta && (
        <div id={idAsociar} className="flex min-w-0 max-w-full flex-wrap items-center gap-2 pb-3">
          {/* Un select toma el ancho de su opción más larga: en el teléfono se recorta, no se sale. */}
          <select value={elegido} onChange={e => setElegido(e.target.value)} aria-label={`Equipo de ${t.tag}`}
            className={cn('min-h-10 min-w-0 max-w-[260px] rounded-[10px] border bg-[var(--panel2)] px-2 text-[15px] outline-none focus:border-acento',
              elegido ? 'border-[var(--linea)]' : 'border-dashed border-[var(--linea)]')}>
            <option value="">sin asociar</option>
            {equipos.map(e => <option key={e.codigo} value={e.codigo}>{e.codigo} · {e.nombre}</option>)}
          </select>
          <Boton disabled={ocupado || !elegido} onClick={() => elegido && onAsociar(elegido, elegido === s?.codigo ? 'regla' : 'manual')}>
            Asociar {t.tag}
          </Boton>
        </div>
      )}
    </li>
  )
}
