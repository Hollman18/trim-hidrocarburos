import { BadgeCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/app/store'
import type { Pregunta } from '@/entities/libro'
import { telefonoLegible, type PersonaVisible } from '@/entities/usuarios'
import { CAUSAS_POZO, NO_FUE_ESP, OTRA, OTRA_PARTE, type Mensaje, type Opcion } from '@/entities/mensajes'
import { modosDeParte, nombreModo, MODO_OTRO } from '@/entities/catalogo'
import { pedirCatalogoDeDanos } from '@/shared/api/equipos'
import { campoPorId } from '@/entities/campos'
import { AHORA } from '@/entities/reloj'
import { cn } from '@/shared/lib/cn'

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })

type Paso =
  | { tipo: 'opciones' }
  | { tipo: 'partes' }
  | { tipo: 'modo'; opcion: Opcion }
  | { tipo: 'pozo' }
  /** Escribir: «0» (otra cosa) o, con `opcion`, lo que vio en esa parte cuando no está en la lista. */
  | { tipo: 'texto'; opcion?: Opcion }

interface Burbuja { de: 'trim' | 'persona'; texto: string; hora: string }

/** El chat de WhatsApp de quien recibió la pregunta, como lo ve en su
 *  teléfono: lo que TRIM le mandó y las respuestas rápidas. Responder aquí es
 *  responder por WhatsApp: escoge la parte y después qué vio, en dos toques. */
export function Telefono({ p, hilo, persona }: { p: Pregunta; hilo: Mensaje[]; persona: PersonaVisible }) {
  const recibirWhatsapp = useApp(s => s.recibirWhatsapp)
  const [paso, setPaso] = useState<Paso>({ tipo: 'opciones' })
  const [locales, setLocales] = useState<Burbuja[]>([])
  const [escrito, setEscrito] = useState('')
  /** El cierre de la conversación (U1 §2.6, corregido por S1 U1-2): el operador
   *  avala solo lo que contestó; lo técnico lo revisa su supervisor. */
  const [cierre, setCierre] = useState<'bien' | 'mal' | null>(null)
  const chat = useRef<HTMLDivElement>(null)
  const botones = useRef<HTMLDivElement>(null)
  // Cada toque cambia las respuestas rápidas: el botón que tenía el foco
  // desaparece. Si el foco estaba ahí, pasa a la primera respuesta nueva (o
  // al chat, si ya no hay), en vez de caer en <body> y obligar a recorrer
  // toda la página otra vez.
  const focoEnRapidas = useRef(false)
  const r = p.causa.declarado
  // En el teléfono solo está lo que de verdad le llegó: lo que no se envió se dice en el hilo de la pantalla.
  const suyos = hilo.filter((m): m is Mensaje & { texto: string } => m.para === persona.id && m.texto !== undefined).sort((a, b) => a.hora.localeCompare(b.hora))
  const pregunta = suyos.find(m => m.regla === 'causa' && !m.insistencia)
  const cat = pedirCatalogoDeDanos(p.campoId, p.equipo)
  const ahora = AHORA.toISOString()

  // ¿La respuesta es de quien mira este chat? Por el id de la persona, no por el texto de `por`.
  const suya = !!r && r.canal === 'whatsapp' && r.porId === persona.id
  const nombre = persona.nombre.split(' ')[0] ?? persona.nombre
  const burbujas: Burbuja[] = [
    ...suyos.map(m => ({ de: 'trim' as const, texto: m.texto, hora: m.hora })),
    ...(r ? (suya
      ? [{ de: 'persona' as const, texto: r.texto, hora: r.hora },
        // Lo que se le muestra para avalar es SOLO lo que contestó: la parte y lo que vio.
        // Dónde se trabó, la causa y el detalle no van: los confirma su supervisor (S1 U1-2; P1 §1.3).
        { de: 'trim' as const, texto: `TRIM · Así queda lo que usted contestó: ${p.equipo}, ${r.texto.charAt(0).toLowerCase()}${r.texto.slice(1)}. El resto del reporte lo revisa su supervisor.\n1) Está bien · 2) Algo está mal`, hora: r.hora },
        ...(cierre ? [{ de: 'persona' as const, texto: cierre === 'bien' ? '1' : '2', hora: r.hora },
          { de: 'trim' as const, hora: r.hora, texto: cierre === 'bien'
            ? `TRIM · Listo. Gracias, ${nombre}. Su respuesta queda guardada a las ${hora(r.hora)}.`
            // «Algo está mal» todavía no se guarda en la parada (no hay escritura para eso): se dice qué hacer.
            : 'TRIM · Entendido. Avísele a su supervisor qué está mal: él lo corrige en la pantalla de Identificar.' }] : [])]
      : [{ de: 'trim' as const, texto: `TRIM · Ya respondió ${r.por}: «${r.texto}». Gracias.`, hora: r.hora }])
      : locales),
  ]
  useEffect(() => { chat.current?.scrollTo({ top: chat.current.scrollHeight }) }, [burbujas.length])
  useEffect(() => {
    if (!focoEnRapidas.current) return
    focoEnRapidas.current = false
    ;(botones.current?.querySelector('button') ?? chat.current)?.focus()
  }, [paso, burbujas.length])

  const decir = (yo: string, trim?: string) =>
    setLocales(x => [...x, { de: 'persona', texto: yo, hora: ahora }, ...(trim ? [{ de: 'trim' as const, texto: trim, hora: ahora }] : [])])
  // La escritura nunca rechaza: lo que el servidor no acepte vuelve como `{ ok: false }` y se dice en el chat.
  const cerrar = async (opcion: Opcion, extra: { texto?: string; modo?: string } = {}) => {
    const res = await recibirWhatsapp({ evento: p.id, campoId: p.campoId, equipo: p.equipo, usuarioId: persona.id, opcion, ...extra })
    if (res.ok) { setLocales([]); setPaso({ tipo: 'opciones' }) }
    else setLocales(x => [...x, { de: 'trim', texto: `TRIM · ${res.error}`, hora: ahora }])
  }
  const preguntarModo = (o: Opcion) => {
    const parte = cat?.partes.find(x => x.id === o.parte)
    if (!parte) return
    decir(o.clave, `TRIM · ¿Qué vio en ${o.texto.toLowerCase()}? Responda con un número.\n${modosDeParte(parte).map((m, i) => `${i + 1}) ${nombreModo(m.codigo, parte.id)}`).join('\n')}`)
    setPaso({ tipo: 'modo', opcion: o })
  }
  const tocar = (o: Opcion) => {
    if (o.clave === OTRA.clave) { decir('0', 'TRIM · Escriba qué encontró.'); return setPaso({ tipo: 'texto' }) }
    if (o.texto === NO_FUE_ESP) {
      decir(o.clave, `TRIM · ¿Qué fue? Responda con un número.\n${CAUSAS_POZO.map((c, i) => `${i + 1}) ${c}`).join('\n')}`)
      return setPaso({ tipo: 'pozo' })
    }
    if (o.texto === OTRA_PARTE && cat) {
      decir(o.clave, `TRIM · ¿Qué parte? Responda con un número.\n${cat.partes.map((x, i) => `${i + 1}) ${x.nombre}`).join('\n')}`)
      return setPaso({ tipo: 'partes' })
    }
    if (o.parte) return preguntarModo(o)
    decir(o.clave); void cerrar(o)
  }
  const volver = { clave: '↩', texto: 'Escoger otra parte', hacer: () => setPaso({ tipo: 'opciones' }) }

  // Las respuestas rápidas del paso en que va la conversación. Ya respondida,
  // a quien respondió le queda avalar lo que contestó (o decir que algo está mal).
  const rapidas: Array<{ clave: string; texto: string; hacer: () => void }> = r
    ? (suya && !cierre ? [{ clave: '1', texto: 'Está bien', hacer: () => setCierre('bien') }, { clave: '2', texto: 'Algo está mal', hacer: () => setCierre('mal') }] : [])
    : !pregunta ? [] :
    paso.tipo === 'opciones' ? (pregunta.opciones ?? []).filter(o => o.clave !== OTRA.clave).map(o => ({ clave: o.clave, texto: o.texto, hacer: () => tocar(o) }))
      .concat([{ clave: '0', texto: 'Otra cosa', hacer: () => tocar(OTRA) }])
    : paso.tipo === 'partes' ? (cat?.partes ?? []).map((x, i) => ({ clave: String(i + 1), texto: x.nombre, hacer: () => preguntarModo({ clave: String(i + 1), texto: x.nombre, parte: x.id }) }))
      .concat([volver])
    : paso.tipo === 'modo' ? (() => {
      const parte = cat?.partes.find(x => x.id === paso.opcion.parte)
      return (parte ? modosDeParte(parte).map((m, i) => ({ clave: String(i + 1), texto: nombreModo(m.codigo, parte.id), hacer: () => {
        if (m.codigo === MODO_OTRO) { decir(String(i + 1), 'TRIM · Escriba qué vio.'); return setPaso({ tipo: 'texto', opcion: paso.opcion }) }
        decir(String(i + 1)); void cerrar(paso.opcion, { modo: m.codigo })
      } })) : []).concat([volver])
    })()
    : paso.tipo === 'pozo' ? CAUSAS_POZO.map((c, i) => ({ clave: String(i + 1), texto: c, hacer: () => { decir(String(i + 1)); void cerrar({ clave: String(i + 1), texto: c }) } }))
    // Escribiendo, todavía se puede volver a escoger de la lista.
    : [{ clave: '↩', texto: 'Volver a las opciones', hacer: () => setPaso({ tipo: 'opciones' }) }]
  const escribir = (t: string) => {
    decir(t)
    if (paso.tipo === 'texto' && paso.opcion) void cerrar(paso.opcion, { modo: MODO_OTRO, texto: t })
    else void cerrar(OTRA, { texto: t })
  }

  return (
    <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[26px] border-[6px] border-[var(--tinta)] bg-[var(--panel)] shadow-[var(--sombra)]" role="group"
      aria-label={`Chat de WhatsApp de ${persona.nombre}`}>
      <div className="flex items-center gap-2 border-b border-[var(--linea)] bg-[var(--panel2)] px-3 py-2">
        <span className="grid size-7 place-items-center rounded-full border border-[var(--linea)] bg-[var(--panel)] text-[11px] font-semibold">T</span>
        {/* Como en WhatsApp: «verificada» es la insignia junto al nombre (el lector la oye
            escrita). Así el segundo renglón alcanza para el número, que antes se cortaba. */}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex min-w-0 items-center gap-1">
            <b className="truncate text-[12px]">TRIM · {campoPorId(p.campoId).nombre}</b>
            <span title="cuenta de empresa verificada" className="inline-flex shrink-0"><BadgeCheck className="size-3 text-[var(--tinta3)]" aria-hidden /></span>
            <span className="sr-only">cuenta de empresa verificada</span>
          </span>
          <small className="block truncate text-[10px] text-[var(--tinta3)]">a {persona.nombre} · {persona.telefono ? telefonoLegible(persona.telefono) : 'sin número'}</small>
        </span>
      </div>
      {/* Enfocable: el historial se desplaza y con teclado tiene que poder recorrerse. */}
      <div ref={chat} tabIndex={0} role="log" aria-live="polite" aria-label="Conversación" className="grid max-h-[380px] content-start gap-1.5 overflow-y-auto bg-[var(--panel2)] px-2.5 py-2.5">
        {burbujas.map((b, i) => (
          <div key={i} className={cn('max-w-[85%] whitespace-pre-line rounded-lg border px-2 py-1.5 text-[11px] leading-snug',
            b.de === 'trim' ? 'justify-self-start rounded-tl-sm border-[var(--linea)] bg-[var(--panel)]' : 'justify-self-end rounded-tr-sm border-[var(--linea)] bg-[var(--elevado)] text-[var(--tinta)]')}>
            {b.texto}
            <small className="mt-0.5 block text-right text-[10px] text-[var(--tinta3)]">{hora(b.hora)}</small>
          </div>
        ))}
      </div>
      {rapidas.length > 0 && (
        <div ref={botones} className="grid gap-1 border-t border-[var(--linea)] bg-[var(--panel)] p-2">
          {rapidas.map(x => (
            <button key={x.clave + x.texto} type="button"
              onClick={e => { focoEnRapidas.current = e.currentTarget === document.activeElement; x.hacer() }}
              className="min-h-10 cursor-pointer rounded-md border border-[var(--linea)] px-2 py-1.5 text-left text-[11.5px] hover:bg-[var(--panel2)] focus-visible:border-acento sm:min-h-8">
              <b className="tabular mr-1.5">{x.clave}</b>{x.texto}
            </button>
          ))}
        </div>
      )}
      {!r && paso.tipo === 'texto' && (
        <form className="flex gap-1 border-t border-[var(--linea)] bg-[var(--panel)] p-2"
          onSubmit={e => { e.preventDefault(); if (escrito.trim()) { escribir(escrito.trim()); setEscrito('') } }}>
          <input value={escrito} onChange={e => setEscrito(e.target.value)} aria-label="Escribir la respuesta" placeholder="Escriba qué encontró"
            className="min-h-10 min-w-0 flex-1 rounded-full border border-[var(--linea)] bg-[var(--panel2)] px-3 text-[11.5px] sm:min-h-8" />
          <button type="submit" className="min-h-10 cursor-pointer rounded-full border border-[var(--linea)] px-3 text-[11.5px] hover:bg-[var(--panel2)] sm:min-h-8">Enviar</button>
        </form>
      )}
    </div>
  )
}
