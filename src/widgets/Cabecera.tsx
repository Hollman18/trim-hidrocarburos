import { useId, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp, useCampo, usePeriodo, useAmbito, useRango, useRol, useCampos, portafolioPermitido } from '@/app/store'
import { PERIODOS } from '@/entities/campos'
import type { Periodo } from '@/entities/tipos'
import { PANTALLAS, GRUPOS, grupoDe, tituloDe } from '@/app/pantallas'
import { Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'
import { diaIso } from '@/shared/lib/formato'
import { formatoFecha } from '@/shared/lib/fecha'
import { AHORA, fechaCorta } from '@/entities/reloj'
import { Exportar } from '@/widgets/informe/Exportar'
import { PRIMER_DIA, ULTIMO_DIA, abreNivel3 } from '@/app/url'
import { useDesplegable } from '@/shared/ui/foco'
import { useTelefono } from '@/shared/ui/telefono'
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
        className="toque inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[8px] bg-[var(--panel)] px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1px_var(--linea)] hover:bg-[var(--panel2)]">
        <CalendarDays aria-hidden className="size-4 text-[var(--tinta2)]" />
        {/* También en el teléfono, entero: un ícono solo no dice qué período se mira. */}
        <span>{enVista}</span>
        <ChevronDown aria-hidden className="size-4 text-[var(--tinta2)]" />
      </button>

      {abierto && (
        <div id={idPanel} role="group" aria-label="Período de seguimiento"
          className="absolute right-0 top-[calc(100%+6px)] z-[90] w-[310px] max-w-[calc(100vw-24px)] rounded-[10px] bg-[var(--elevado)] p-1.5 shadow-[var(--sombra-flota)] max-lg:left-0 max-lg:right-auto">
          <p className="px-2.5 pb-1 pt-1.5 text-[13px] font-semibold text-[var(--tinta2)]">Período</p>
          {PERIODOS.map(o => (
            <button key={o.id} onClick={() => { setPeriodo(o.id); setAbierto(false) }} aria-current={!rango && o.id === periodoId}
              className="flex min-h-11 w-full cursor-pointer items-start gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[15px] hover:bg-[var(--panel2)]">
              <span className="flex-1">
                {o.nombre}
                <span className="block text-[13px] text-[var(--tinta2)]">{o.detalle}</span>
              </span>
              {/* «Mes en curso» ya lo dice en el nombre: la marca va solo donde el nombre no lo dice. */}
              {o.parcial && !/en curso/i.test(o.nombre) && <Chip>en curso</Chip>}
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
              className="mt-2 min-h-10 w-full cursor-pointer rounded-[8px] bg-[var(--primario)] px-3 py-2 text-[15px] font-semibold text-[var(--primario-sobre)] hover:opacity-90">
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
 *  publicadas) y SAP se muestra como conectado. Cada pantalla, sin notas de demo.
 *  Solo en el demo (X4 §3.5). En frase, a 13 px y sin espaciado (UI-22; X5 §3.4), en la
 *  línea de las migas sin agrandarla (H14). En el teléfono dice «Demo», con su nombre
 *  entero para el lector (A11). Es un desplegable: Escape y un toque afuera lo cierran. */
export function MarcaDemo() {
  const { abierto, contenedor, id, propsBoton } = useDesplegable()
  return (
    <span ref={contenedor} className="max-lg:relative">
      <button type="button" {...propsBoton} aria-label="Datos de demostración" data-demo
        className="toque inline-flex h-5 cursor-pointer items-center whitespace-nowrap rounded-full border-[1.5px] border-dashed border-[var(--tinta3)] px-2 text-[13px] font-medium leading-none text-[var(--tinta2)] hover:bg-[var(--panel2)]">
        <span aria-hidden className="max-sm:hidden">Datos de demostración</span><span aria-hidden className="sm:hidden">Demo</span>
      </button>
      {abierto && (
        <span id={id} role="note" className="absolute left-0 top-[calc(100%+6px)] z-[90] w-[260px] max-w-[calc(100vw-24px)] rounded-[10px] bg-[var(--elevado)] p-3 text-[14px] font-normal text-[var(--tinta2)] shadow-[var(--sombra-flota)]">
          <span className="block">Cinco campos ficticios, calibrados con fuentes publicadas.</span>
          <span className="mt-1 block">SAP, simulado: ver el contrato con el backend.</span>
        </span>
      )}
    </span>
  )
}

/** La cabecera de cada vista, con la estructura de D1 (v3): las migas
 *  («Todos mis campos › La Ceiba»), el título con la hora de los datos y, a la
 *  derecha, la franja de condiciones. El período y Exportar se quedan donde la
 *  pantalla los usa (X4 §3.5). La navegación ya no vive aquí: es el panel
 *  lateral (y en el teléfono, la banda clara con el ☰).
 *
 *  H6 (X2 N2; X5 §6.10): la franja va SIEMPRE en el mismo lugar —la primera
 *  fila, a la derecha, a la altura de las migas— en el nivel 1, el 2 y el 3
 *  (el nivel 3 trae su cabecera, `widgets/equipos/Nivel3.tsx`, con la misma
 *  regla). El período y Exportar van debajo de ella: nunca la empujan.
 *
 *  T-1 (imágenes 2 y 3b): en el teléfono no van migas si la persona tiene un
 *  solo campo; con varios, «‹ Todos mis campos». En Hoy, sin la fecha («datos
 *  de las 14:00»), como la imagen 3b. */
export function Cabecera() {
  const pantalla = useApp(s => s.pantalla), setAlcance = useApp(s => s.setAlcance)
  const campo = useCampo(); const ambito = useAmbito(); const rol = useRol(); const campos = useCampos(); const usuarios = useUsuarios()
  const telefono = useTelefono()
  const p = PANTALLAS[pantalla]
  const puerta = grupoDe(pantalla)
  const varios = campos.length > 1 && portafolioPermitido(rol, usuarios)
  // La puerta va en las migas cuando la pantalla no es la primera de ella: «La Ceiba › Equipos».
  const conPuerta = puerta && GRUPOS[puerta]!.miembros[0] !== pantalla ? GRUPOS[puerta]!.corto : null
  const hora = telefono && pantalla === 'hoy' ? `datos de las ${HORA.format(AHORA)}` : `hoy, ${fechaCorta(AHORA)} · datos de las ${HORA.format(AHORA)}`
  // K1 (pedido de K2; T-1, imagen 2 al medio): en el teléfono, La planta viva de UN campo de varios va solo con
  // «‹ Todos mis campos» y la franja: sin el título ni la fecha. El título queda para el lector y para el foco (A14).
  // Solo ahí: es lo que dibuja la imagen; en las demás vistas el título dice en cuál subpantalla se está.
  const sinTitulo = telefono && pantalla === 'plantaViva' && varios && !ambito.global
  // C4 · El nivel 3 técnico trae su propia cabecera (las migas hasta el equipo, sus
  // vecinos, el tag y la franja; X4 §5.3): esta no se pinta encima.
  const equipoAbierto = useApp(s => s.equipoAbierto)
  if (pantalla === 'equipos' && equipoAbierto && abreNivel3(rol)) return null
  const conSalida = !!p && (!p.ahora || !p.sinExportar)

  return (
    <header data-cabecera className="no-imprimir mb-4 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:mb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-y-2">
      <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        {telefono ? (
          // En el teléfono: «‹ Todos mis campos» solo si hay varios (imagen 2); con uno, sin migas (imagen 3b).
          varios && !ambito.global && (
            <nav aria-label="Dónde está" className="flex items-center gap-x-1.5 text-[14px] font-medium text-[var(--tinta2)]">
              <button onClick={() => setAlcance('portafolio')} className="toque -ml-0.5 inline-flex cursor-pointer items-center gap-0.5 hover:text-[var(--tinta)]">
                <ChevronLeft aria-hidden className="size-4" />Todos mis campos
              </button>
            </nav>
          )
        ) : (
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
            {/* Solo en el demo (X4 §3.5): en la línea de las migas, sin agrandarla. */}
            <span className="ml-2"><MarcaDemo /></span>
          </nav>
        )}
        {/* En el teléfono, la marca del demo va a la derecha del título: sin migas no suma un renglón. */}
        {telefono && <span className="float-right mt-1.5 ml-2"><MarcaDemo /></span>}
        {/* tabIndex -1: al cerrar la introducción el foco vuelve aquí y no a <body> (A14). */}
        {sinTitulo
          // Sin verse, en un solo texto: el lector lo oye y el foco (A14) llega aquí.
          ? <h1 tabIndex={-1} data-titulo-vista className="sr-only">{`${tituloDe(pantalla, rol.id) ?? '—'} · ${hora}`}</h1>
          : (
            <h1 tabIndex={-1} data-titulo-vista className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[26px] font-bold leading-[1.15] tracking-[-.01em] outline-none max-sm:text-[21px]">
              {tituloDe(pantalla, rol.id) ?? '—'}
              <small className="text-[15px] font-normal tracking-normal text-[var(--tinta2)] max-sm:text-[13px]">{hora}</small>
            </h1>
          )}
      </div>
      {/* La franja: arriba a la derecha, a la altura de las migas (H6). En el teléfono, debajo del título. */}
      <Franja className="justify-end max-lg:order-3 max-lg:justify-start lg:col-start-2 lg:row-start-1 lg:justify-self-end" />
      {/* Lo que la pantalla usa (el período, exportar): debajo de la franja, nunca antes. */}
      {conSalida && (
        <div className="relative flex flex-wrap items-center gap-2 max-lg:order-2 lg:col-start-2 lg:row-start-2 lg:justify-self-end">
          {!p.ahora && <SelectorPeriodo />}
          {!p.sinExportar && <Exportar />}
        </div>
      )}
    </header>
  )
}
