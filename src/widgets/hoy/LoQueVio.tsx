import { useEffect, useId, useRef, useState } from 'react'
import { useApp } from '@/app/store'
import type { ModoHoy } from '@/shared/api/hoy'
import { TEXTO_LIBRE_MINIMO, alcanza } from '@/entities/reglas'
import { Boton } from '@/shared/ui/primitivas'
import { cn } from '@/shared/lib/cn'
import type { Envio } from './envio'
import { vibrar } from './palabras'

/** Una parte ya dicha, de la que falta (si quiere) lo que vio. */
export interface Vio {
  /** La pregunta de la que salió (`libro:${evento}`). */
  id: string
  evento: string
  equipo: string
  /** «Sello mecánico». */
  parte: string
  /** «Sello mecánico: ¿qué vio?». */
  pregunta: string
  modos: ModoHoy[]
}

/** «¿Qué vio?», la pregunta siguiente y OPCIONAL de «Contestar» en un toque (A3; flujos.md
 *  FF-2): la parte ya quedó (con su «Deshacer»); lo que vio se manda con
 *  `POST /api/paradas/:evento/vio` también con «Deshacer», o se deja así. «Otra cosa» pide una
 *  frase, que no sale de TRIM (D2). */
export function LoQueVio({ v, envio, onListo, grande = false }: { v: Vio; envio: Envio; onListo: () => void; grande?: boolean }) {
  const rolId = useApp(s => s.rolId)
  const [otro, setOtro] = useState<ModoHoy | null>(null)
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const id = useId()
  const titulo = useRef<HTMLParagraphElement>(null)
  useEffect(() => { titulo.current?.focus() }, [v.id])

  const decir = (m: ModoHoy) => {
    const texto = nota.trim()
    if (m.escribe && !alcanza(texto, TEXTO_LIBRE_MINIMO)) { setOtro(m); return setError('Escriba qué vio, con al menos una frase corta.') }
    vibrar()
    const dicho = `${m.texto.toLowerCase()} en ${v.equipo}`
    envio.registrar({ id: `vio:${v.id}`, texto: `Se registra en 5 s: ${dicho}`, escrito: `Registrado: ${dicho}`,
      pendiente: { via: 'vio', rolId, dicho, evento: v.evento, cuerpo: { modo: m.codigo, ...(m.escribe ? { texto } : {}) } } })
    onListo()
  }
  const boton = cn('flex w-full cursor-pointer items-center rounded-[8px] bg-[var(--panel)] text-left font-semibold shadow-[inset_0_0_0_1.5px_var(--linea)] hover:bg-[var(--panel2)]',
    grande ? 'min-h-16 px-[18px] text-[18px]' : 'min-h-12 px-4 text-[16px]')
  return (
    <section aria-label={v.pregunta} data-lo-que-vio={v.id} className="grid gap-2.5 rounded-[10px] bg-[var(--panel)] px-5 py-4 shadow-[inset_0_0_0_1.5px_var(--linea)] sm:px-6">
      <p ref={titulo} tabIndex={-1} className="text-[17px] font-semibold outline-none">
        <b className="font-cond font-bold tracking-[.02em]">{v.equipo}</b> · {v.pregunta} <span className="font-normal text-[var(--tinta2)]">(si quiere)</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {v.modos.map(m => <button key={m.codigo} type="button" data-opcion={m.texto} onClick={() => decir(m)} className={boton}>{m.texto}</button>)}
      </div>
      {otro && (
        <label htmlFor={id} className="grid gap-1 text-[15px] font-semibold">Qué vio
          <textarea id={id} rows={2} value={nota} onChange={e => { setNota(e.target.value); setError('') }}
            className="resize-y rounded-[8px] bg-[var(--panel)] px-3 py-2 text-[16px] font-normal shadow-[inset_0_0_0_1.5px_var(--linea)] outline-none focus:shadow-[inset_0_0_0_2px_var(--foco)]" />
        </label>
      )}
      {error && <p role="alert" className="text-[15px]">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {otro && <Boton variante="principal" onClick={() => decir(otro)}>Contestar</Boton>}
        <Boton onClick={onListo} data-dejar-asi>Dejarlo así</Boton>
      </div>
    </section>
  )
}
