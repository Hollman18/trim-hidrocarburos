import { useMemo, useState } from 'react'
import { Plug, KeyRound, Check, Lock } from 'lucide-react'
import { useApp, useCampo, useRol } from '@/app/store'
import { useRegistro, sugerir, asociarTag, inscribirBorde, type TagPendiente } from '@/shared/api/registro'
import type { Capacidad } from '@/entities/tipos'
import { Panel, Metrica, Chip, Boton, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
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
  const campo = useCampo()
  const rol = useRol()
  const campoId = useApp(s => s.campoId)
  const caps = useMemo(() => (Object.entries(rol.puede) as Array<[Capacidad, boolean]>)
    .filter(([, v]) => v).map(([k]) => k), [rol])
  const puede = rol.puede['conector:configurar']
  const { datos, error, recargar } = useRegistro(campoId, caps)
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
  if (error) return <>{sistemas}<Panel titulo="REGISTRO DE LOS BORDES"><Hueco>No se pudo consultar el registro: {error}.</Hueco></Panel></>
  if (!datos) return <>{sistemas}<Panel titulo="REGISTRO DE LOS BORDES"><p className="text-[12px] text-[var(--tinta3)]">Consultando…</p></Panel></>

  const { inv, pend } = datos
  const conSugerencia = pend.filter(t => sugerir(t.tag, inv.equipos))

  return (
    <>
      {sistemas}
      <div className="mb-2.5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <Metrica titulo="BORDES CONECTADOS" valor={String(inv.gateways.length)}
          pie={<>en {campo.nombre}</>} />
        <Metrica titulo="TAGS REGISTRADOS" valor={String(inv.tags.total)}
          pie={<>{inv.tags.total - inv.tags.pendientes} ya asociados a un equipo</>} />
        <Metrica titulo="POR ASOCIAR" valor={String(inv.tags.pendientes)}
          pie={inv.tags.pendientes ? 'llegaron del borde sin equipo resuelto' : 'ninguno pendiente'} />
        <Metrica titulo="EQUIPOS DEL CAMPO" valor={String(inv.equipos.length)}
          pie="del registro de ingeniería" />
      </div>

      <Lectura>
        Un <b>borde</b> es el equipo que está en campo leyendo los PLC y enviando los datos. Un
        <b> tag</b> es cada señal que llega. Un tag <b>por asociar</b> llegó bien pero todavía no se
        sabe de qué equipo es: hasta que se asocie, sus barriles no se pueden atribuir a nadie.
      </Lectura>

      {aviso && <div className="mb-2.5"><Hueco>{aviso}</Hueco></div>}

      <Panel className="mb-2.5" titulo="BORDES CONECTADOS" extra={`${inv.gateways.length} en ${campo.nombre}`}>
        {inv.gateways.map(g => (
          <div key={g.id} className="flex flex-wrap items-center gap-2 border-b border-[var(--linea2)] py-2.5 last:border-0">
            <Plug className="size-4 shrink-0 text-[var(--tinta3)]" />
            <span className="min-w-0 flex-1">
              <b className="block font-mono text-[12px]">{g.id}</b>
              <small className="block text-[10.5px] text-[var(--tinta3)]">
                {g.modelo} · serie {g.serie} · firmware {g.firmware} · enlace {g.enlace} · buffer {g.buffer_h} h
              </small>
            </span>
            <Chip>{g.tags} tags</Chip>
            <span className="tabular w-[120px] text-right text-[11px] text-[var(--tinta2)]">
              reportó {hace(g.ultimo_visto)}
            </span>
          </div>
        ))}
        {puede ? (
          <div className="mt-2.5 border-t border-[var(--linea2)] pt-2.5">
            <Boton variante="principal" disabled={ocupado} onClick={inscribir}>
              <KeyRound className="mr-1 inline size-3.5" />Inscribir un borde nuevo
            </Boton>
            {codigo && (
              <div className="mt-2 rounded border border-[var(--tinta2)] bg-[var(--panel)] p-2.5">
                <small className="block text-[10.5px] text-[var(--tinta3)]">Código para {campoPorId(codigo.campo).nombre}</small>
                <b className="font-mono text-[18px] tracking-[.12em] text-[var(--tinta)]">{codigo.codigo}</b>
                <p className="mt-1 text-[11.5px] text-[var(--tinta2)]">
                  {codigo.instruccion} Vence en {codigo.expiraEn}.
                </p>
              </div>
            )}
          </div>
        ) : (
          <Hueco>
            <Lock className="mr-1 inline size-3.5" />
            Su rol no inscribe bordes. Lo hace el administrador de la implementación.
          </Hueco>
        )}
      </Panel>

      <Panel titulo="TAGS POR ASOCIAR" extra={pend.length ? `${pend.length} pendientes` : 'ninguno'}>
        {pend.length === 0 ? (
          <p className="text-[12px] text-[var(--tinta2)]">
            Los {inv.tags.total} tags de {campo.nombre} están asociados a un equipo.
          </p>
        ) : (
          <>
            {puede && conSugerencia.length > 0 && (
              <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-sm border border-[var(--linea2)] bg-[var(--panel2)] px-2.5 py-2">
                <span className="flex-1 text-[11.5px]">
                  {conSugerencia.length} de {pend.length} tienen una sugerencia por nomenclatura.
                </span>
                <Boton variante="principal" disabled={ocupado} onClick={() => aplicarTodas(conSugerencia)}>
                  <Check className="mr-1 inline size-3" />{ocupado ? 'Asociando…' : `Aplicar las ${conSugerencia.length}`}
                </Boton>
              </div>
            )}
            {pend.map(t => (
              <FilaPendiente key={t.tag} t={t} equipos={inv.equipos} puede={puede} ocupado={ocupado}
                onAsociar={(equipo, origen) => asociar(t.tag, equipo, origen)} />
            ))}
          </>
        )}
      </Panel>
    </>
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

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--linea2)] py-2.5 last:border-0">
      <span className="min-w-[190px] flex-1">
        <b className="block font-mono text-[12px]">{t.tag}</b>
        <small className="block text-[10.5px] text-[var(--tinta3)]">
          {t.tipo}{t.unidad ? ` · ${t.unidad}` : ''} · {t.protocolo} · cada {cadencia(t.cadencia_s)} · {t.gateway_id}
        </small>
      </span>
      {s && (
        <span className="min-w-[160px] text-[11px] text-[var(--tinta2)]">
          <Chip tono={s.confianza === 'alta' ? 'fuerte' : 'neutro'}>sugerido {s.codigo}</Chip>
          <span className="mt-0.5 block text-[10.5px] text-[var(--tinta3)]">{s.razon}</span>
        </span>
      )}
      {puede && (
        <span className="flex min-w-0 max-w-full items-center gap-1.5">
          {/* Un select toma el ancho de su opción más larga: en el teléfono se recorta, no se sale. */}
          <select value={elegido} onChange={e => setElegido(e.target.value)} aria-label={`Equipo de ${t.tag}`}
            className={cn('min-w-0 max-w-[240px] rounded border bg-[var(--panel2)] px-1.5 py-[4px] text-[11.5px] outline-none focus:border-acento',
              elegido ? 'border-[var(--linea)]' : 'border-dashed border-[var(--linea)]')}>
            <option value="">sin asociar</option>
            {equipos.map(e => <option key={e.codigo} value={e.codigo}>{e.codigo} · {e.nombre}</option>)}
          </select>
          <Boton variante="chico" disabled={ocupado || !elegido} onClick={() => elegido && onAsociar(elegido, elegido === s?.codigo ? 'regla' : 'manual')}>
            Asociar
          </Boton>
        </span>
      )}
    </div>
  )
}
