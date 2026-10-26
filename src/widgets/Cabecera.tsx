import { useId, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useApp, useCampo, usePeriodo, useAmbito, useRango, useRol, useCampos, portafolioPermitido } from '@/app/store'
import { PERIODOS } from '@/entities/campos'
import type { Periodo } from '@/entities/tipos'
import { PANTALLAS, GRUPOS, grupoDe } from '@/app/pantallas'
import { Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'
import { diaIso } from '@/shared/lib/formato'
import { formatoFecha } from '@/shared/lib/fecha'
import { AHORA, fechaCorta } from '@/entities/reloj'
import { Exportar } from '@/widgets/informe/Exportar'
import { PRIMER_DIA, ULTIMO_DIA } from '@/app/url'
import { useDesplegable } from '@/shared/ui/foco'
import { useUsuarios } from '@/shared/api/usuarios'
import { Franja } from './Franja'

/** El último día con datos, en la zona del campo (no la hora UTC del navegador). */
const hoyISO = () => diaIso(AHORA)
/** La hora de los datos, en la zona del campo: «14:00». */
const HORA = formatoFecha({ hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })

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
  return conMarca.replace(/en curso/i, m => m.replace(' ', ' '))
}

/** La píldora del período, donde la pantalla lo usa (X4 §3.5). */
function SelectorPeriodo() {
  const periodoId = useApp(s => s.periodoId), rango = useApp(s => s.rango), setPeriodo = useApp(s => s.setPeriodo), setRango = useApp(s => s.setRango)
  const periodo = usePeriodo(); const intervalo = useRango()
  // El período es un desplegable, no un menú ARIA: adentro hay fechas y un aviso.
  const { abierto, setAbierto, contenedor, id: idPanel, propsBoton } = useDesplegable()
  const idError = useId()
  const [desde, setDesde] = useState('2026-09-01')
  const [hasta, setHasta] = useState(hoyISO())
  // Un rango sin días con datos no se aplica: se dice, en vez de cerrar el menú como si nada.
  const [errorRango, setErrorRango] = useState<string | null>(null)
  const enVista = textoPeriodo(periodo, intervalo.nombre)
  const caja = 'tabular min-h-9 min-w-0 flex-1 rounded-[10px] border border-[var(--linea)] bg-[var(--panel2)] px-2 py-1 text-[14px] outline-none focus:border-[var(--foco)]'

  return (
    <div ref={contenedor} className="relative max-lg:static">
      <button {...propsBoton} aria-label={`Período: ${enVista}`}
        className="inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-[var(--panel)] px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1px_var(--linea)] hover:bg-[var(--panel2)]">
        <CalendarDays aria-hidden className="size-4 text-[var(--tinta2)]" />
        {/* También en el teléfono, entero: un ícono solo no dice qué período se mira. */}
        <span>{enVista}</span>
        <ChevronDown aria-hidden className="size-4 text-[var(--tinta2)]" />
      </button>

      {abierto && (
        <div id={idPanel} role="group" aria-label="Período de seguimiento"
          className="absolute right-0 top-[calc(100%+6px)] z-[90] w-[310px] max-w-[calc(100vw-24px)] rounded-[16px] bg-[var(--elevado)] p-1.5 shadow-[var(--sombra-flota)] max-lg:left-0 max-lg:right-auto">
          <p className="px-2.5 pb-1 pt-1.5 text-[13px] font-semibold text-[var(--tinta2)]">Período</p>
          {PERIODOS.map(o => (
            <button key={o.id} onClick={() => { setPeriodo(o.id); setAbierto(false) }} aria-current={!rango && o.id === periodoId}
              className="flex min-h-11 w-full cursor-pointer items-start gap-2 rounded-[12px] px-2.5 py-1.5 text-left text-[15px] hover:bg-[var(--panel2)]">
              <span className="flex-1">
                {o.nombre}
                <span className="block text-[13px] text-[var(--tinta2)]">{o.detalle}</span>
              </span>
              {/* «Mes en curso» ya lo dice en el nombre: la marca va solo donde el nombre no lo dice. */}
              {o.parcial && !/en curso/i.test(o.nombre) && <Chip>EN CURSO</Chip>}
              {!rango && o.id === periodoId && <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--foco)]" />}
            </button>
          ))}
          <hr className="my-1 border-[var(--linea2)]" />
          <div className="p-2">
            <p className="flex flex-wrap items-center gap-1 pb-1.5 text-[13px] font-semibold text-[var(--tinta2)]">
              Otro rango
              <Info titulo="Rango a la medida" texto="Si el rango llega hasta hoy, el período queda en curso y las cifras son parciales. El volumen se acumula; la tasa en BPDC no." />
            </p>
            <div className="flex items-center gap-1.5">
              <input type="date" value={desde} min={PRIMER_DIA} max={hasta || ULTIMO_DIA} onChange={e => { setDesde(e.target.value); setErrorRango(null) }}
                aria-label="Desde" aria-invalid={!!errorRango} aria-describedby={errorRango ? idError : undefined} className={caja} />
              <span className="text-[13px] text-[var(--tinta2)]">a</span>
              <input type="date" value={hasta} min={desde || PRIMER_DIA} max={ULTIMO_DIA} onChange={e => { setHasta(e.target.value); setErrorRango(null) }}
                aria-label="Hasta" aria-invalid={!!errorRango} aria-describedby={errorRango ? idError : undefined} className={caja} />
            </div>
            <button onClick={() => { const r = setRango(desde, hasta); if (r.ok) { setErrorRango(null); setAbierto(false) } else setErrorRango(r.error) }}
              aria-label="Aplicar el rango"
              className="mt-2 min-h-10 w-full cursor-pointer rounded-full bg-[var(--primario)] px-3 py-2 text-[15px] font-semibold text-[var(--primario-sobre)] hover:opacity-90">
              Aplicar
            </button>
            {errorRango && <p id={idError} role="alert" className="mt-1.5 text-[13px] font-semibold text-[var(--tinta)]">{errorRango}</p>}
            {rango && (
              <p className="mt-1.5 rounded-[10px] bg-[var(--panel2)] px-2.5 py-1.5 text-[13px] text-[var(--tinta2)]">
                Activo: {periodo.detalle}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Una sola marca para toda la aplicación: los campos son ficticios (calibrados con fuentes
 *  publicadas) y SAP y WhatsApp se muestran como conectados. Cada pantalla, sin notas de demo.
 *  Solo en el demo (X4 §3.5). */
function MarcaDemo() {
  const [abierto, setAbierto] = useState(false)
  return (
    <span>
      <button type="button" onClick={() => setAbierto(v => !v)} aria-expanded={abierto}
        className="inline-flex h-6 cursor-pointer items-center whitespace-nowrap rounded-full border-[1.5px] border-dashed border-[var(--tinta3)] px-2 text-[12px] font-semibold tracking-[.03em] text-[var(--tinta2)] hover:bg-[var(--panel2)]">
        <span className="max-sm:hidden">DATOS DE DEMOSTRACIÓN</span><span className="sm:hidden" aria-hidden>DEMO</span>
      </button>
      {abierto && (
        <span role="note" className="absolute right-0 top-[calc(100%+6px)] z-[90] w-[260px] max-lg:left-0 max-lg:right-auto max-w-[calc(100vw-24px)] rounded-[16px] bg-[var(--elevado)] p-3 text-[14px] text-[var(--tinta2)] shadow-[var(--sombra-flota)]">
          <span className="block">Cinco campos ficticios, calibrados con fuentes publicadas.</span>
          <span className="mt-1 block">SAP y WhatsApp, simulados: ver el contrato con el backend.</span>
        </span>
      )}
    </span>
  )
}

/** La cabecera de cada vista, como en las imágenes de B (X5 §4.1): las migas
 *  («Todos mis campos › La Ceiba»), el título con la hora de los datos y, a la
 *  derecha, la franja de condiciones. El período y Exportar se quedan donde la
 *  pantalla los usa (X4 §3.5). La navegación ya no vive aquí: es el panel
 *  lateral (y en el teléfono, la banda índigo con el ☰). */
export function Cabecera() {
  const pantalla = useApp(s => s.pantalla), setAlcance = useApp(s => s.setAlcance)
  const campo = useCampo(); const ambito = useAmbito(); const rol = useRol(); const campos = useCampos(); const usuarios = useUsuarios()
  const p = PANTALLAS[pantalla]
  const puerta = grupoDe(pantalla)
  const varios = campos.length > 1 && portafolioPermitido(rol, usuarios)
  // La puerta va en las migas cuando la pantalla no es la primera de ella: «La Ceiba › Equipos».
  const conPuerta = puerta && GRUPOS[puerta]!.miembros[0] !== pantalla ? GRUPOS[puerta]!.corto : null
  const hora = `hoy, ${fechaCorta(AHORA)} · datos de las ${HORA.format(AHORA)}`

  return (
    <header data-cabecera className="no-imprimir mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-5">
      <div className="min-w-0">
        <nav aria-label="Dónde está" className="relative flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] font-medium text-[var(--tinta2)]">
          {varios && (ambito.global
            ? <b className="font-semibold text-[var(--tinta)]">Todos mis campos</b>
            : <button onClick={() => setAlcance('portafolio')} className="cursor-pointer hover:text-[var(--tinta)] hover:underline">Todos mis campos</button>)}
          {!ambito.global && (<>
            {varios && <ChevronRight aria-hidden className="size-3.5" />}
            <b className={cn('font-semibold', conPuerta ? 'font-medium text-[var(--tinta2)]' : 'text-[var(--tinta)]')}>{campo.nombre}</b>
          </>)}
          {conPuerta && (<>
            <ChevronRight aria-hidden className="size-3.5" />
            <b className="font-semibold text-[var(--tinta)]">{conPuerta}</b>
          </>)}
          {/* Solo en el demo (X4 §3.5): junto a las migas, para no sumarle alto a la cabecera. */}
          <span className="ml-2"><MarcaDemo /></span>
        </nav>
        <h1 className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[26px] font-bold leading-[1.15] tracking-[-.01em] max-sm:text-[21px]">
          {p?.titulo ?? '—'}
          <small className="text-[15px] font-normal tracking-normal text-[var(--tinta2)] max-sm:text-[13px]">{hora}</small>
        </h1>
      </div>
      {/* A la derecha, arriba lo que la pantalla usa (el período, exportar) y abajo la franja,
          a la altura del título. En el teléfono baja entera, debajo del título. */}
      <div className="flex min-w-0 flex-col items-end gap-2.5 max-lg:w-full max-lg:items-start">
        {p && (!p.ahora || !p.sinExportar) && (
          <div className="relative flex flex-wrap items-center gap-2 max-lg:order-2">
            {!p.ahora && <SelectorPeriodo />}
            {!p.sinExportar && <Exportar />}
          </div>
        )}
        <Franja className="justify-end max-lg:justify-start" />
      </div>
    </header>
  )
}
