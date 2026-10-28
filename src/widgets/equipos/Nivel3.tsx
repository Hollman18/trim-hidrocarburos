import { fondoTono, tonoDeEquipo, atributoTono } from '@/shared/ui/tono'
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useApp, useRol, useRango, useNivel } from '@/app/store'
import { useNivelEquipo, NOMBRE_TREN, PALABRA_CONDICION, type VistaNivel3, type TrenEquipo } from '@/shared/api/equiposTecnico'
import { useBombas } from '@/shared/api/equipos'
import { useSapDeEquipo } from '@/shared/api/sap'
import { puedeHacer } from '@/entities/tipos'
import { AHORA } from '@/entities/reloj'
import { Boton, Hueco } from '@/shared/ui/primitivas'
import { pantallaVisible } from '@/shared/config/producto'
import { formatoFecha } from '@/shared/lib/fecha'
import { n0 } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Franja } from '@/widgets/Franja'
import { MarcaDemo } from '@/widgets/Cabecera'
import { useExportar } from '@/widgets/informe/useExportar'
import { Bloqueo } from '@/widgets/hoy/piezas'
import { BloqueSap } from '@/widgets/sap/BloqueSap'
import { DetallePozo } from '@/widgets/pozos/DetallePozo'
import { SiSePara } from '@/widgets/bombas/Detalle'
import { SiFallaHoyFicha } from '@/widgets/riesgo/SiFallaHoy'
import { useFiltrosEquipos } from './filtros'
import { partirEquipo, useIrA } from './navegar'
import { Marca, IrA } from './piezas'
import { SusSenales } from './Senales'
import { EnSuTrenDeAgua } from './TrenAgua'
import { MientrasParada, DiasAntes, SuHistoria, EnSuTren } from './Tarjetas'
import { Diagnostico } from './Nivel4'

const HORA = formatoFecha({ hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })

/** Exportar la ficha (UI-08): la misma píldora de la cabecera, con su palabra
 *  también en el teléfono. El mismo informe con folio; el papel lleva la ficha. */
function ExportarFichaN3() {
  const x = useExportar()
  if (!x.puede) return null
  return (
    <span className="no-imprimir contents">
      <button type="button" onClick={() => x.pdf()} disabled={x.ocupado} aria-label="Exportar la ficha en PDF" title="Exportar la ficha: informe en PDF con membrete, fecha y folio" data-exportar-ficha
        className="toque inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-[var(--panel)] px-3.5 text-[14px] font-semibold shadow-[inset_0_0_0_1px_var(--linea)] hover:bg-[var(--panel2)] disabled:opacity-60">
        <Download aria-hidden className="size-4 text-[var(--tinta2)]" /><span>Exportar</span>
      </button>
      {x.aviso && <p role="alert" className="basis-full text-[13px] text-[var(--tinta)]">{x.aviso}</p>}
    </span>
  )
}

/** La cabecera del nivel 3 y del 4 (X4 §5.3; la imagen 4): las migas «La Ceiba ›
 *  Agua › P-201B» (subir es tocar una miga), los vecinos del mismo tren (‹ ›, de
 *  lado sin subir), el tag con su familia, su sistema y su criticidad, la hora de
 *  los datos y, a la derecha, la franja de condiciones: la misma de todo nivel.
 *
 *  H6 (X2 N2; X5 §6.10): la franja va en el MISMO lugar que en la cabecera de los
 *  niveles 1 y 2 (`widgets/Cabecera.tsx`): la primera fila, a la derecha, a la
 *  altura de las migas; Exportar debajo de ella, nunca la empuja. En el teléfono,
 *  debajo del título, como allí. */
function CabezaEquipo({ v, diagnostico }: { v: VistaNivel3; diagnostico: boolean }) {
  const poner = useFiltrosEquipos(s => s.poner)
  const irA = useIrA()
  const subir = (tren: TrenEquipo | 'todos') => { poner({ estado: 'todos', tipo: 'todos', busca: '', tren }); irA({ equipo: null }) }
  const miga = 'toque cursor-pointer rounded-sm hover:text-[var(--tinta)] hover:underline'
  const vecino = 'inline-flex min-h-8 cursor-pointer items-center gap-0.5 rounded-full px-2.5 text-[14px] font-medium text-[var(--tinta2)] shadow-[inset_0_0_0_1px_var(--linea)] hover:bg-[var(--panel)] hover:text-[var(--tinta)] max-sm:min-h-11'
  return (
    <header data-cabecera-equipo className="no-imprimir mb-4 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:mb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-y-2">
      <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <nav aria-label="Dónde está" className="relative flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] font-medium text-[var(--tinta2)]">
          <button type="button" className={miga} onClick={() => subir('todos')}>{v.campoNombre}</button>
          <ChevronRight aria-hidden className="size-3.5" />
          <button type="button" className={miga} onClick={() => subir(v.tren)}>{NOMBRE_TREN[v.tren]}</button>
          <ChevronRight aria-hidden className="size-3.5" />
          {diagnostico
            ? <><button type="button" className={miga} onClick={() => irA({ equipo: v.equipo })}>{v.equipo}</button>
              <ChevronRight aria-hidden className="size-3.5" /><b aria-current="page" className="font-semibold text-[var(--tinta)]">Diagnóstico</b></>
            : <b aria-current="page" className="font-semibold text-[var(--tinta)]">{v.equipo}</b>}
          {/* Solo en el demo: en la línea de las migas, junto a ellas (UI-13). */}
          <span className="ml-2"><MarcaDemo /></span>
          {!diagnostico && (v.vecinos.anterior || v.vecinos.siguiente) && (
            <span className="ml-2 inline-flex gap-2" data-vecinos>
              {v.vecinos.anterior && <button type="button" className={vecino} onClick={() => irA({ equipo: v.vecinos.anterior! })} aria-label={`El anterior del tren: ${v.vecinos.anterior}`}>
                <ChevronLeft aria-hidden className="size-4" />{v.vecinos.anterior}</button>}
              {v.vecinos.siguiente && <button type="button" className={vecino} onClick={() => irA({ equipo: v.vecinos.siguiente! })} aria-label={`El siguiente del tren: ${v.vecinos.siguiente}`}>
                {v.vecinos.siguiente}<ChevronRight aria-hidden className="size-4" /></button>}
            </span>
          )}
        </nav>
        <h1 tabIndex={-1} data-titulo-vista className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[30px] font-bold leading-[1.15] tracking-[-.01em] outline-none max-sm:text-[24px]">
          {v.equipo}{diagnostico && <span className="font-semibold"> · diagnóstico</span>}
          <small className="text-[16px] font-normal tracking-normal text-[var(--tinta2)] max-sm:text-[14px]">{v.subtitulo} · datos de las {HORA.format(AHORA)}</small>
        </h1>
      </div>
      {/* La franja: arriba a la derecha, a la altura de las migas (H6), como en la cabecera de los demás niveles. */}
      <Franja className="justify-end max-lg:order-3 max-lg:justify-start lg:col-start-2 lg:row-start-1 lg:justify-self-end" />
      {!diagnostico && v.registrado && (
        <div className="relative flex flex-wrap items-center gap-2 max-lg:order-2 lg:col-start-2 lg:row-start-2 lg:justify-self-end"><ExportarFichaN3 /></div>
      )}
    </header>
  )
}

/** La cifra con su frase (X5 §5.1; la imagen 4): la marca antes del previo («◆1
 *  Alarma · parada desde hoy, 03:52 · hace 10,1 h»), la cifra (lo que se deja de
 *  producir por él, medido; nunca en color) y su frase. A la derecha, el bloqueo
 *  en tinta con ⊘ (nunca amarillo) y las dos acciones: «Crear aviso en SAP» y
 *  «Diga qué se dañó». En marcha, «Si falla hoy» en una línea. */
function Heroe({ v, sap, onSap, sapAbierto }: { v: VistaNivel3; sap?: string; onSap: () => void; sapAbierto: boolean }) {
  const rol = useRol(); const setPantalla = useApp(s => s.setPantalla)
  const id = useId()
  const destino = rol.pantallas.includes('causa') && pantallaVisible('causa') ? 'causa' : rol.pantallas.includes('hoy') ? 'hoy' : null
  const decir = v.pregunta && destino && puedeHacer(rol.puede, 'causa:declarar')
  return (
    // 28-oct · Qué atacar: parado o en alarma, la cabeza del equipo en rojo pálido; en marcha con atención o aviso, en amarillo pálido.
    <section aria-label={`${v.equipo}: ${v.previo}`} data-heroe-equipo {...atributoTono(tonoDeEquipo(v.condicion, v.parado))}
      className={cn('grid items-center gap-x-7 gap-y-4 rounded-[10px] bg-[var(--panel)] px-5 py-4 sm:px-7 sm:py-5 lg:grid-cols-[minmax(0,1fr)_auto]', fondoTono(tonoDeEquipo(v.condicion, v.parado)))}>
      <div className="min-w-0">
        {/* La marca va pegada a la primera palabra: nunca sola en su renglón (UI-13). */}
        <p className="text-[17px] text-[var(--tinta2)]">
          {v.condicion && <span className="mr-2 inline-flex align-[-3px]"><Marca c={v.condicion} tamano={18} decorativa /></span>}<span data-previo>{v.previo}</span>
        </p>
        {v.cifra && (
          // La cifra y su frase se anuncian juntas (A6; prompt §9).
          <div role="group" aria-labelledby={`${id}-cifra ${id}-unidad ${id}-frase`} data-cifra-grupo>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
              <b id={`${id}-cifra`} className="tabular text-[48px] font-bold leading-[1] tracking-[-.03em] sm:text-[54px]" data-cifra>{n0(v.cifra.valor)}</b>
              <span id={`${id}-unidad`} className="text-[20px] text-[var(--tinta2)]">barriles por día</span>
            </p>
            <p id={`${id}-frase`} className="mt-2 text-[19px] font-medium leading-snug" data-frase>{v.cifra.frase}</p>
          </div>
        )}
        {!v.parado && <SiFallaHoyFicha campoId={v.campoId} equipo={v.equipo} className="mt-2 text-[16px]" />}
      </div>
      {(v.bloqueo || sap || decir) && (
        <div className="flex min-w-0 flex-col gap-2.5 lg:max-w-[430px]">
          {v.bloqueo && <Bloqueo b={v.bloqueo} />}
          {/* En el teléfono, la acción principal primero (UI-13); en el escritorio, a la derecha (la imagen 4). */}
          <div className="flex flex-wrap gap-2.5 lg:justify-end">
            {decir && <Boton variante="principal" onClick={() => setPantalla(destino!)} className="min-h-12 px-6 text-[16px] lg:order-2" data-diga>
              {v.pregunta!.sobre === 'bomba' ? 'Diga qué se dañó' : 'Diga por qué paró'}</Boton>}
            {sap && <Boton onClick={onSap} aria-expanded={sapAbierto} className="min-h-12 px-6 text-[16px] lg:order-1">{sap}</Boton>}
          </div>
        </div>
      )}
    </section>
  )
}

/** El texto del botón de SAP según lo que SAP ya tiene del equipo. */
function useBotonSap(v: VistaNivel3): string | undefined {
  const rol = useRol()
  const { avisos, ordenes } = useSapDeEquipo(v.campoId, v.equipo)
  if (!v.registrado) return undefined
  if (ordenes.some(o => o.estado !== 'TECO')) return 'Ver la orden en SAP'
  if (avisos.some(a => !a.cerrado)) return 'Ver el aviso en SAP'
  return rol.puede['sap:aviso'] ? 'Crear aviso en SAP' : undefined
}

/** Lo de ahora de un equipo: el nivel 3 (la imagen 4). */
function Ahora({ v }: { v: VistaNivel3 }) {
  const rango = useRango(); const irA = useIrA(); const nivel = useNivel()
  const [sapAbierto, setSapAbierto] = useState(false)
  const sap = useBotonSap(v)
  // Una bomba de la línea en marcha: «Si se para ahora» (el colchón y el orden de cierre).
  const bomba = useBombas([v.campoId], rango.desde, rango.hasta).find(b => b.eq.id === v.equipo)
  const pr = bomba?.veredicto?.prediccion
  const esPozo = v.tipo === 'pozo' || v.tipo === 'electrosumergible'
  return (
    <div className="grid gap-3 sm:gap-4" data-nivel3={v.equipo}>
      <Heroe v={v} sap={sap} sapAbierto={sapAbierto} onSap={() => setSapAbierto(x => !x)} />
      {sapAbierto && (
        <section aria-label="SAP" className="rounded-[10px] bg-[var(--panel)] px-5 pb-4 pt-1 sm:px-7" data-sap-equipo>
          <BloqueSap campoId={v.campoId} equipo={v.equipo} nivel={nivel} />
        </section>
      )}
      <div className="@container">
        <div className="grid items-start gap-3 sm:gap-4 @min-[760px]:grid-cols-2 @min-[1100px]:grid-cols-[minmax(0,500fr)_minmax(0,410fr)_minmax(0,330fr)]">
          <div className="grid min-w-0 gap-3 sm:gap-4"><SusSenales v={v} /></div>
          <div className="grid min-w-0 gap-3 sm:gap-4">
            <EnSuTrenDeAgua v={v} />
            <MientrasParada v={v} />
            {pr && !v.parado && pr.inmediato && <SiSePara pr={pr} />}
            <EnSuTren v={v} />
          </div>
          <div className="grid min-w-0 gap-3 sm:gap-4">
            <DiasAntes v={v} />
            <SuHistoria v={v} onDiagnostico={v.diagnostico ? () => irA({ equipo: v.equipo, diagnostico: true }) : undefined} />
          </div>
        </div>
      </div>
      {esPozo && v.registrado && (
        <DetallePozo campoId={v.campoId} pozoId={v.equipo} desde={rango.desde} hasta={rango.hasta} nombrePeriodo={rango.nombre} />
      )}
    </div>
  )
}

/** El nivel 3 técnico de un equipo, como una vista entera (X4 §5; la imagen 4), y
 *  su nivel 4 (diagnóstico) detrás de «Ver el diagnóstico». Lo arma el motor
 *  (`/vistas/equipos/:campo/:equipo/tecnico`). Un equipo que el campo no tiene se dice. */
export function NivelTecnico({ abierto }: { abierto: string }) {
  const campoId = useApp(s => s.campoId)
  const { equipo, diagnostico } = partirEquipo(abierto)
  const v = useNivelEquipo(campoId, equipo)
  const irA = useIrA()
  const raiz = useRef<HTMLDivElement>(null)
  // Al bajar, subir o pasar al vecino, la vista arranca arriba: lo primero es la cifra.
  useEffect(() => { raiz.current?.closest('.vista')?.scrollTo?.({ top: 0 }) }, [abierto, campoId])
  if (!v) return (
    <div ref={raiz} className="grid gap-3">
      <Hueco>No hay un equipo {equipo} en este campo.</Hueco>
      <IrA onClick={() => irA({ equipo: null })}>Ver todos los equipos</IrA>
    </div>
  )
  const n4 = diagnostico && v.diagnostico
  return (
    <div ref={raiz} className={cn('min-w-0')} data-equipo-abierto={v.equipo} data-nivel={n4 ? 4 : 3}
      aria-label={`${v.equipo}${v.condicion ? `, ${PALABRA_CONDICION[v.condicion]}` : ''}`}>
      <CabezaEquipo v={v} diagnostico={n4} />
      {n4 ? <Diagnostico v={v} /> : <Ahora v={v} />}
    </div>
  )
}
