import { useApp, useAmbito } from '@/app/store'
import { useFranja, ORDEN_FRANJA, type CondicionFranja, type EquipoEnFranja } from '@/shared/api/condiciones'
import { MarcaCondicion, type Condicion } from '@/shared/ui/Prioridad'
import { useDesplegable } from '@/shared/ui/foco'
import { campoPorId } from '@/entities/campos'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'

/* C1 · La franja de condiciones (X2 §3.5, X5 §5.6): una píldora por
   condición, de la más grave a la más leve, con la forma, la cantidad FUERA
   de la forma (el dígito de adentro es la prioridad, no un conteo) y la
   palabra. «Sin comunicación» va al final. Es la misma en toda vista, y cada
   cuenta abre su lista; cada fila de la lista abre el equipo. La cuenta la
   hace el motor (entities/condiciones.ts), no esta pantalla. */

const MARCA: Record<CondicionFranja, Condicion> = {
  interlock: 'interlock', alarma: 'alarma', atencion: 'atencion', aviso: 'aviso', 'sin-comunicacion': 'sin-comunicacion',
}

/** La palabra de cada cuenta. En el teléfono se acorta («atención») y «sin
 *  comunicación» en cero queda solo con su forma y su número (X5 §5.6). */
const palabra = (c: CondicionFranja, n: number, corta: boolean): string => {
  switch (c) {
    case 'interlock': return 'en interlock'
    case 'alarma': return n === 1 ? 'alarma' : 'alarmas'
    case 'atencion': return corta ? 'atención' : 'en atención'
    case 'aviso': return n === 1 ? 'aviso' : 'avisos'
    case 'sin-comunicacion': return 'sin comunicación'
  }
}

function Cuenta({ c, n, equipos }: { c: CondicionFranja; n: number; equipos: EquipoEnFranja[] }) {
  const { abierto, setAbierto, contenedor, id, propsBoton } = useDesplegable()
  const setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo), campoId = useApp(s => s.campoId)
  const ambito = useAmbito()
  const texto = `${n} ${palabra(c, n, false)}`
  const soloForma = c === 'sin-comunicacion' && n === 0
  const abrir = (e: EquipoEnFranja) => {
    // Desde «Todos mis campos», la ficha es de su campo: se pasa a él y se abre.
    if (e.campoId !== campoId || ambito.global) setCampo(e.campoId)
    abrirEquipo(e.equipo)
    setAbierto(false)
  }
  return (
    <div ref={contenedor} className="relative max-sm:static">
      <button {...propsBoton} disabled={n === 0} aria-label={n ? `${texto}: ver la lista` : texto}
        className={cn('inline-flex h-[34px] items-center gap-2 whitespace-nowrap rounded-full bg-[var(--panel)] pl-[11px] pr-3.5 text-[14px] font-medium shadow-[inset_0_0_0_1px_var(--linea)] max-sm:h-[30px] max-sm:gap-1.5 max-sm:pl-2 max-sm:pr-2.5 max-sm:text-[13px]',
          n ? 'cursor-pointer text-[var(--tinta)] hover:bg-[var(--panel2)]' : 'cursor-default text-[var(--tinta2)]')}>
        <MarcaCondicion c={MARCA[c]} tamano={14} decorativa />
        <b className="font-bold">{n}</b>
        <span className={cn(c === 'atencion' && 'max-sm:hidden', soloForma && 'max-sm:hidden')}>{palabra(c, n, false)}</span>
        {c === 'atencion' && <span className="sm:hidden">{palabra(c, n, true)}</span>}
      </button>
      {abierto && n > 0 && (
        <div id={id} role="group" aria-label={texto}
          className="absolute right-0 top-[calc(100%+6px)] z-[90] w-[340px] max-w-[calc(100vw-24px)] rounded-[16px] bg-[var(--elevado)] p-1.5 shadow-[var(--sombra-flota)] max-sm:left-0 max-sm:right-auto">
          <p className="flex items-center gap-2 px-2.5 pb-1 pt-1.5 text-[13px] font-semibold text-[var(--tinta2)]">
            <MarcaCondicion c={MARCA[c]} tamano={14} decorativa />{texto[0]!.toUpperCase() + texto.slice(1)}
          </p>
          {equipos.map(e => (
            <button key={`${e.campoId}|${e.equipo}`} onClick={() => abrir(e)}
              className="flex min-h-12 w-full cursor-pointer items-start gap-2.5 rounded-[12px] px-2.5 py-2 text-left hover:bg-[var(--panel2)]">
              <MarcaCondicion c={MARCA[c]} tamano={15} className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <b className="font-cond text-[15px] font-bold tracking-[.02em]">{e.equipo}</b>
                {ambito.global && <span className="text-[14px] text-[var(--tinta2)]"> · {campoPorId(e.campoId).nombre}</span>}
                <span className="block text-[14px] leading-snug text-[var(--tinta2)]">{e.estado}</span>
              </span>
              {e.bblDia !== undefined && <span className="tabular shrink-0 text-right text-[14px] font-semibold">{n0(e.bblDia)}<small className="block text-[12px] font-normal text-[var(--tinta2)]">bbl/d</small></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** La franja de lo que se está mirando: un campo o «Todos mis campos». */
export function Franja({ className }: { className?: string }) {
  const ambito = useAmbito()
  const f = useFranja(ambito.campos.map(c => c.id))
  const total = ORDEN_FRANJA.reduce((a, c) => a + f.cuentas[c], 0)
  const titulo = `Condiciones de ${ambito.global ? 'todos sus campos' : ambito.titulo}`
  // Una franja que siempre tiene algo pierde valor: vacía, una píldora gris (X5 §5.10).
  if (!total) return (
    <div role="group" aria-label={titulo} className={cn('flex items-center', className)}>
      <span className="inline-flex h-[34px] items-center rounded-full bg-[var(--panel2)] px-3.5 text-[14px] font-medium text-[var(--tinta2)] shadow-[inset_0_0_0_1px_var(--linea)]">nada anormal</span>
    </div>
  )
  return (
    <div role="group" aria-label={titulo} data-franja className={cn('relative flex flex-wrap items-center gap-2 max-sm:gap-1.5', className)}>
      {ORDEN_FRANJA.filter(c => c !== 'interlock' || f.cuentas.interlock > 0).map(c => (
        <Cuenta key={c} c={c} n={f.cuentas[c]} equipos={f.equipos.filter(e => e.condicion === c)} />
      ))}
    </div>
  )
}
