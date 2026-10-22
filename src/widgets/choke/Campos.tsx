import { ChevronRight } from 'lucide-react'
import { useApp } from '@/app/store'
import { useTuberia } from '@/shared/api/choke'
import { campoPorId } from '@/entities/campos'
import { Panel } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { n0 } from '@/shared/lib/formato'
import { TEXTO } from './palabras'

/** Producción con todos los campos (U2 §2.4): una fila por campo con lo que
 *  lo limita hoy y lo que le sobra al siguiente tramo, en la frase del motor.
 *  Un toque abre la tubería completa de ese campo. */
export function TuberiaDeCadaCampo({ campos, desde, hasta }: { campos: string[]; desde: Date; hasta: Date }) {
  return (
    <Panel className="mb-2.5" titulo="LA TUBERÍA DE CADA CAMPO"
      extra={<span className="inline-flex items-center gap-1 print:[&_.solo-impresion]:hidden!">qué limita hoy<Info titulo="Lo que limita" texto={TEXTO.limita} /></span>}>
      <Lectura>
        Una fila por campo: el tramo más angosto de hoy y cuánto le sobra al siguiente. Lo que se
        trabó en el período suma lo mismo que el diferido del libro. Toque un campo para ver su tubería.
      </Lectura>
      <ul data-tuberias>
        {campos.map(c => <Fila key={c} campoId={c} desde={desde} hasta={hasta} />)}
      </ul>
    </Panel>
  )
}

function Fila({ campoId, desde, hasta }: { campoId: string; desde: Date; hasta: Date }) {
  const t = useTuberia(campoId, desde, hasta)
  const setCampo = useApp(s => s.setCampo)
  const nombre = campoPorId(campoId).nombre
  return (
    <li className="border-b border-[var(--linea2)] last:border-0">
      <button onClick={() => setCampo(campoId)} className="flex w-full cursor-pointer items-start gap-2 py-2 text-left hover:bg-[var(--panel2)]"
        aria-label={`${nombre}: ${t.textoCorto}. ${t.campoDeGas ? '' : t.frase} Se trabaron ${n0(t.diferido)} barriles en el período. Abre su tubería.`}>
        <ChevronRight aria-hidden size={14} className="no-imprimir mt-0.5 shrink-0 text-[var(--tinta3)]" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <b className="text-[12.5px]">{nombre}</b>
            <span className="text-[12px]">{t.textoCorto}</span>
          </span>
          {!t.campoDeGas && t.limita !== null && <small className="block text-[11px] leading-snug text-[var(--tinta2)]">{t.frase}</small>}
        </span>
        <span className="tabular shrink-0 text-right leading-tight">
          <b className="block text-[13px]">{n0(t.diferido)}</b>
          <small className="text-[10px] text-[var(--tinta3)]">bbl se trabaron</small>
        </span>
      </button>
    </li>
  )
}
