import { useId, useState } from 'react'
import { CalendarDays, BookOpen, Menu, Check } from 'lucide-react'
import { useApp, useCampo, usePeriodo, useAmbito, useRango } from '@/app/store'
import { PERIODOS } from '@/entities/campos'
import type { Periodo } from '@/entities/tipos'
import { PANTALLAS } from '@/app/pantallas'
import { Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'
import { n0, diaIso } from '@/shared/lib/formato'
import { AHORA } from '@/entities/reloj'
import { useEstadoCampos } from '@/shared/api/diferidos'
import { Exportar } from '@/widgets/informe/Exportar'
import { PRIMER_DIA, ULTIMO_DIA } from '@/app/url'
import { useDesplegable } from '@/shared/ui/foco'

/** El último día con datos, en la zona del campo (no la hora UTC del navegador). */
const hoyISO = () => diaIso(AHORA)

/** Lo que dice el período a la vista: el mes en curso con su nombre
 *  («Octubre, en curso»: «Mes en curso» no dice cuál) y un rango escogido a
 *  mano con sus fechas («Rango escogido» no dice cuáles; un solo día, una
 *  sola fecha). Todo período parcial lo dice en el texto («Año a la fecha,
 *  en curso»): no hace falta otra marca al lado. «en curso» no se parte. */
function textoPeriodo(periodo: Periodo, nombreRango: string) {
  let base = periodo.id === 'curso' ? nombreRango : periodo.nombre
  if (periodo.id === 'medida') {
    const fechas = periodo.detalle.split(' · ').at(-1) ?? periodo.detalle
    const [d, h] = fechas.split(' a ')
    base = d && d === h ? d : fechas
  }
  const conMarca = periodo.parcial && !/en curso/i.test(base) ? `${base}, en curso` : base
  return conMarca.replace(/en curso/i, m => m.replace(' ', '\u00a0'))
}

/** Arriba va el período, exportar lo que se está viendo (con membrete y
 *  folio) y la guía. El perfil va abajo. */
export function Cabecera({ onMenu }: { onMenu: () => void }) {
  const periodoId = useApp(s => s.periodoId), rango = useApp(s => s.rango), setPeriodo = useApp(s => s.setPeriodo), setRango = useApp(s => s.setRango), pantalla = useApp(s => s.pantalla), comoSeLee = useApp(s => s.comoSeLee), setComoSeLee = useApp(s => s.setComoSeLee)
  const periodo = usePeriodo(); const intervalo = useRango(); const campo = useCampo(); const ambito = useAmbito()
  // El período es un desplegable, no un menú ARIA: adentro hay fechas y un aviso.
  const { abierto, setAbierto, contenedor, id: idPanel, propsBoton } = useDesplegable()
  const idError = useId()
  const [demo, setDemo] = useState(false)
  const [desde, setDesde] = useState('2026-09-01')
  const [hasta, setHasta] = useState(hoyISO())
  // Un rango sin días con datos no se aplica: se dice, en vez de cerrar el menú como si nada.
  const [errorRango, setErrorRango] = useState<string | null>(null)
  const p = PANTALLAS[pantalla]
  const estados = useEstadoCampos(ambito.campos.map(c => c.id))
  // Si un campo no tiene el fiscal del último día, la suma no está completa: hueco, no cero.
  // El último día completo es ayer (fiscalDeAyer): la cifra es lo producido, no lo diferido.
  const ayer = estados.some(e => e.ayer.bbl === null) ? null : estados.reduce((a, e) => a + (e.ayer.bbl ?? 0), 0)
  const ayerTxt = ayer === null ? 'ayer sin fiscal' : `${n0(ayer)} bbl producidos ayer`
  const cuantos = ambito.global ? `${ambito.campos.length} campos` : null
  const nombre = ambito.global ? 'Portafolio' : campo.nombre
  const enVista = textoPeriodo(periodo, intervalo.nombre)

  return (
    <header className="no-imprimir flex shrink-0 items-center gap-2 border-b border-[var(--linea)] bg-[var(--panel)] px-2.5 py-2 sm:px-3">
      <button onClick={onMenu} aria-label="Abrir la navegación"
        className="cursor-pointer rounded border border-[var(--linea)] bg-[var(--panel)] p-1.5 hover:bg-[var(--elevado)] lg:hidden">
        <Menu className="size-4" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[13.5px] font-semibold leading-tight">{p?.titulo ?? '—'}</h1>
        {/* En el teléfono el botón del período es solo el ícono: el período va en su
            propio renglón, que nunca se corta (si no cabe, baja de renglón); el campo
            y la cifra de ayer van en el segundo, que sí se puede cortar, pero no antes
            de la cifra («5 campos» queda en el riel del cajón). */}
        <p className="text-[10.5px] leading-snug text-[var(--tinta3)] sm:hidden">
          <span aria-hidden>Demo</span><span className="sr-only">Datos de demostración</span> · {enVista}
        </p>
        <p className="truncate text-[10.5px] leading-snug text-[var(--tinta3)] sm:hidden">{nombre} · {ayerTxt}</p>
        <p className="hidden truncate text-[10.5px] text-[var(--tinta3)] sm:block">{nombre}{cuantos && ` · ${cuantos}`} · {ayerTxt}</p>
      </div>

      {/* Una sola marca para toda la aplicación: los campos son ficticios (calibrados con fuentes
          publicadas) y SAP y WhatsApp se muestran como conectados. Cada pantalla, sin notas de demo. */}
      <span className="relative hidden sm:block">
        <button type="button" onClick={() => setDemo(v => !v)} aria-expanded={demo}
          className="font-cond cursor-pointer rounded-sm border border-dashed border-[var(--tinta3)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[.05em] text-[var(--tinta2)] hover:bg-[var(--panel2)]">
          DATOS DE DEMOSTRACIÓN
        </button>
        {demo && (
          <span role="note" className="absolute right-0 top-[calc(100%+5px)] z-[90] w-[240px] rounded border border-[var(--linea)] bg-[var(--elevado)] p-2 text-[11px] text-[var(--tinta2)] shadow-[var(--sombra2)]">
            <span className="block">Cinco campos ficticios, calibrados con fuentes publicadas.</span>
            <span className="block">SAP y WhatsApp, simulados: ver el contrato con el backend.</span>
          </span>
        )}
      </span>

      <div ref={contenedor} className="relative">
        <button {...propsBoton} aria-label={`Período: ${enVista}`}
          className="flex cursor-pointer items-center gap-1.5 rounded border border-[var(--linea)] bg-[var(--panel)] px-2 py-[5px] text-[11.5px] shadow-[var(--sombra)] hover:bg-[var(--elevado)]">
          <CalendarDays className="size-3.5 opacity-70" />
          {/* En el teléfono, solo el ícono: el período va en el subtítulo. */}
          <span className="hidden sm:inline">{enVista}</span>
          <span className="text-[10px] text-[var(--tinta3)]">▾</span>
        </button>

        {abierto && (
          <div id={idPanel} role="group" aria-label="Período de seguimiento"
            className="absolute right-0 top-[calc(100%+5px)] z-[90] w-[290px] max-w-[calc(100vw-24px)] rounded border border-[var(--linea)] bg-[var(--elevado)] p-1 shadow-[var(--sombra2)]">
            <p className="font-cond px-2 pb-1 pt-1.5 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">PERÍODO</p>
            {PERIODOS.map(o => (
              <button key={o.id} onClick={() => { setPeriodo(o.id); setAbierto(false) }} aria-current={!rango && o.id === periodoId}
                className="flex w-full cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-left text-[11.5px] hover:bg-[var(--panel2)]">
                <span className="flex-1">
                  {o.nombre}
                  <span className="block text-[10px] text-[var(--tinta3)]">{o.detalle}</span>
                </span>
                {/* «Mes en curso» ya lo dice en el nombre: la marca va solo donde el nombre no lo dice. */}
                {o.parcial && !/en curso/i.test(o.nombre) && <Chip>EN CURSO</Chip>}
                {!rango && o.id === periodoId && <Check className="mt-0.5 size-3 shrink-0 text-acento" />}
              </button>
            ))}
            <hr className="my-1 border-[var(--linea2)]" />
            <div className="p-1.5">
              <p className="font-cond flex flex-wrap items-center gap-1 pb-1.5 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
                OTRO RANGO
                <Info titulo="Rango a la medida" texto="Si el rango llega hasta hoy, el período queda en curso y las cifras son parciales. El volumen se acumula; la tasa en BPDC no." />
              </p>
              <div className="flex items-center gap-1.5">
                <input type="date" value={desde} min={PRIMER_DIA} max={hasta || ULTIMO_DIA} onChange={e => { setDesde(e.target.value); setErrorRango(null) }}
                  aria-label="Desde" aria-invalid={!!errorRango} aria-describedby={errorRango ? idError : undefined}
                  className="tabular min-w-0 flex-1 rounded border border-[var(--linea)] bg-[var(--panel2)] px-1.5 py-[3px] text-[11px] outline-none focus:border-acento" />
                <span className="text-[10px] text-[var(--tinta3)]">a</span>
                <input type="date" value={hasta} min={desde || PRIMER_DIA} max={ULTIMO_DIA} onChange={e => { setHasta(e.target.value); setErrorRango(null) }}
                  aria-label="Hasta" aria-invalid={!!errorRango} aria-describedby={errorRango ? idError : undefined}
                  className="tabular min-w-0 flex-1 rounded border border-[var(--linea)] bg-[var(--panel2)] px-1.5 py-[3px] text-[11px] outline-none focus:border-acento" />
              </div>
              <button onClick={() => { const r = setRango(desde, hasta); if (r.ok) { setErrorRango(null); setAbierto(false) } else setErrorRango(r.error) }}
                aria-label="Aplicar el rango"
                className={cn('mt-1.5 w-full cursor-pointer rounded border border-[var(--tinta)] bg-[var(--tinta)] px-2 py-[5px] text-[11.5px] text-[var(--superficie)] hover:opacity-90')}>
                Aplicar
              </button>
              {errorRango && <p id={idError} role="alert" className="mt-1.5 text-[10.5px] font-semibold text-[var(--tinta)]">{errorRango}</p>}
              {rango && (
                <p className="mt-1.5 rounded-sm border border-[var(--linea)] bg-[var(--panel2)] px-2 py-1 text-[10.5px] text-[var(--tinta2)]">
                  Activo: {periodo.detalle}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <Exportar />

      {/* En el teléfono el texto se esconde y queda el ícono: el nombre va en aria-label. */}
      <button onClick={() => setComoSeLee(!comoSeLee)} aria-pressed={comoSeLee} aria-label="¿Cómo se lee?" title="¿Cómo se lee?"
        className={cn('flex cursor-pointer items-center gap-1.5 rounded border px-2 py-[5px] text-[11.5px] shadow-[var(--sombra)]',
          comoSeLee ? 'border-[var(--tinta)] bg-[var(--panel)] font-semibold text-[var(--tinta)]' : 'border-[var(--linea)] bg-[var(--panel)] hover:bg-[var(--elevado)]')}>
        <BookOpen className="size-3.5 opacity-70" />
        <span className="hidden sm:inline">¿cómo se lee?</span>
      </button>
    </header>
  )
}
