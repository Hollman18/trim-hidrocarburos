import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
import { ExportarFicha } from '@/widgets/informe/Exportar'
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

/** La cabecera del nivel 3 y del 4 (X4 §5.3; la imagen 4): las migas «La Ceiba ›
 *  Agua › P-201B» (subir es tocar una miga), los vecinos del mismo tren (‹ ›, de
 *  lado sin subir), el tag con su familia, su sistema y su criticidad, la hora de
 *  los datos y, a la derecha, la franja de condiciones: la misma de todo nivel. */
function CabezaEquipo({ v, diagnostico }: { v: VistaNivel3; diagnostico: boolean }) {
  const poner = useFiltrosEquipos(s => s.poner)
  const irA = useIrA()
  const subir = (tren: TrenEquipo | 'todos') => { poner({ estado: 'todos', tipo: 'todos', busca: '', tren }); irA({ equipo: null }) }
  const miga = 'cursor-pointer rounded-sm hover:text-[var(--tinta)] hover:underline'
  const vecino = 'inline-flex min-h-8 cursor-pointer items-center gap-0.5 rounded-full px-2.5 text-[14px] font-medium text-[var(--tinta2)] shadow-[inset_0_0_0_1px_var(--linea)] hover:bg-[var(--panel)] hover:text-[var(--tinta)]'
  return (
    <header data-cabecera-equipo className="no-imprimir mb-4 grid gap-x-6 gap-y-3 sm:mb-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div className="min-w-0">
        <nav aria-label="Dónde está" className="relative flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[15px] font-medium text-[var(--tinta2)]">
          <button type="button" className={miga} onClick={() => subir('todos')}>{v.campoNombre}</button>
          <ChevronRight aria-hidden className="size-3.5" />
          <button type="button" className={miga} onClick={() => subir(v.tren)}>{NOMBRE_TREN[v.tren]}</button>
          <ChevronRight aria-hidden className="size-3.5" />
          {diagnostico
            ? <><button type="button" className={miga} onClick={() => irA({ equipo: v.equipo })}>{v.equipo}</button>
              <ChevronRight aria-hidden className="size-3.5" /><b aria-current="page" className="font-semibold text-[var(--tinta)]">Diagnóstico</b></>
            : <b aria-current="page" className="font-semibold text-[var(--tinta)]">{v.equipo}</b>}
          {!diagnostico && (v.vecinos.anterior || v.vecinos.siguiente) && (
            <span className="ml-2 inline-flex gap-2" data-vecinos>
              {v.vecinos.anterior && <button type="button" className={vecino} onClick={() => irA({ equipo: v.vecinos.anterior! })} aria-label={`El anterior del tren: ${v.vecinos.anterior}`}>
                <ChevronLeft aria-hidden className="size-4" />{v.vecinos.anterior}</button>}
              {v.vecinos.siguiente && <button type="button" className={vecino} onClick={() => irA({ equipo: v.vecinos.siguiente! })} aria-label={`El siguiente del tren: ${v.vecinos.siguiente}`}>
                {v.vecinos.siguiente}<ChevronRight aria-hidden className="size-4" /></button>}
            </span>
          )}
          <span className="ml-2"><MarcaDemo /></span>
        </nav>
        <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[30px] font-bold leading-[1.15] tracking-[-.01em] max-sm:text-[24px]">
          {v.equipo}{diagnostico && <span className="font-semibold"> · diagnóstico</span>}
          <small className="text-[16px] font-normal tracking-normal text-[var(--tinta2)] max-sm:text-[14px]">{v.subtitulo} · datos de las {HORA.format(AHORA)}</small>
        </h1>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
        {!diagnostico && v.registrado && <ExportarFicha />}
        <Franja className="justify-start xl:justify-end" />
      </div>
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
  const destino = rol.pantallas.includes('causa') && pantallaVisible('causa') ? 'causa' : rol.pantallas.includes('hoy') ? 'hoy' : null
  const decir = v.pregunta && destino && puedeHacer(rol.puede, 'causa:declarar')
  return (
    <section aria-label={`${v.equipo}: ${v.previo}`} data-heroe-equipo
      className="grid items-center gap-x-7 gap-y-4 rounded-[20px] bg-[var(--panel)] px-5 py-4 sm:px-7 sm:py-5 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 text-[17px] text-[var(--tinta2)]">
          <Marca c={v.condicion} tamano={18} decorativa /><span data-previo>{v.previo}</span>
        </p>
        {v.cifra && (
          <>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
              <b className="tabular text-[48px] font-bold leading-[1] tracking-[-.03em] sm:text-[54px]" data-cifra>{n0(v.cifra.valor)}</b>
              <span className="text-[20px] text-[var(--tinta2)]">barriles por día</span>
            </p>
            <p className="mt-2 text-[19px] font-medium leading-snug" data-frase>{v.cifra.frase}</p>
          </>
        )}
        {!v.parado && <SiFallaHoyFicha campoId={v.campoId} equipo={v.equipo} className="mt-2 text-[16px]" />}
      </div>
      {(v.bloqueo || sap || decir) && (
        <div className="flex min-w-0 flex-col gap-2.5 lg:max-w-[430px]">
          {v.bloqueo && <Bloqueo b={v.bloqueo} />}
          <div className="flex flex-wrap gap-2.5 lg:justify-end">
            {sap && <Boton onClick={onSap} aria-expanded={sapAbierto} className="min-h-12 px-6 text-[16px]">{sap}</Boton>}
            {decir && <Boton variante="principal" onClick={() => setPantalla(destino!)} className="min-h-12 px-6 text-[16px]">
              {v.pregunta!.sobre === 'bomba' ? 'Diga qué se dañó' : 'Diga por qué paró'}</Boton>}
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
    <div className="grid gap-4" data-nivel3={v.equipo}>
      <Heroe v={v} sap={sap} sapAbierto={sapAbierto} onSap={() => setSapAbierto(x => !x)} />
      {sapAbierto && (
        <section aria-label="SAP" className="rounded-[20px] bg-[var(--panel)] px-5 pb-4 pt-1 sm:px-7" data-sap-equipo>
          <BloqueSap campoId={v.campoId} equipo={v.equipo} nivel={nivel} />
        </section>
      )}
      <div className="@container">
        <div className="grid items-start gap-4 @min-[760px]:grid-cols-2 @min-[1100px]:grid-cols-[minmax(0,500fr)_minmax(0,410fr)_minmax(0,330fr)]">
          <div className="grid min-w-0 gap-4"><SusSenales v={v} /></div>
          <div className="grid min-w-0 gap-4">
            <EnSuTrenDeAgua v={v} />
            <MientrasParada v={v} />
            {pr && !v.parado && pr.inmediato && <SiSePara pr={pr} />}
            <EnSuTren v={v} />
          </div>
          <div className="grid min-w-0 gap-4">
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
