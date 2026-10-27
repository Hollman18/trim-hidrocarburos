import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useApp, useCampo, usePlanta, useRango, useRol } from '@/app/store'
import { useLibro } from '@/shared/api/diferidos'
import { useEquiposDeHoy } from '@/shared/api/equipos'
import { pedirMedicionOficial } from '@/shared/api/medicion'
import { useReporteAnh, type FaltaDeParada } from '@/shared/api/regulatorio'
import { NOMBRE_CIFRA } from '@/shared/api/resultados'
import { CATALOGO, CATEGORIA_DE } from '@/entities/causas'
import { Tarjeta } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { useTelefono } from '@/shared/ui/telefono'
import { n0, n1, num, sinLectura } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { ArbolCircular } from '@/widgets/choke/ArbolCircular'

/** REPORTE AL REGULADOR, el inicio de regulatorio (X4 §2 y §3.4; P-03).
 *  «¿El reporte pasa? Si no, ¿qué falta, quién lo debe y cuánto tiempo queda?»
 *
 *  Arriba, la cifra con su frase (X5 §5.1): las paradas del período que todavía
 *  no tienen causa, si se puede publicar, quién lo debe y la hora límite; una
 *  fila por parada con «›». Debajo, el árbol de causas como la circular, con sus
 *  códigos detrás de «Ver los códigos ANH». La medición oficial (los puntos, su
 *  calibración y la producción del período) y las casillas de PRODML, detrás de
 *  «ver más» y en el papel. El CSV para la ANH sale de «Exportar», en la cabecera.
 *  TRIM lee la medición; nunca escribe sobre ella.
 *
 *  El motor calcula y la pantalla pinta: todo sale de `useReporteAnh`
 *  (`GET /api/vistas/anh/reporte`), del libro y del árbol. */
export function Regulatorio() {
  const rango = useRango(); const rol = useRol(); const telefono = useTelefono()
  const campoId = useApp(s => s.campoId), abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla)
  const r = useReporteAnh({ campos: [campoId], desde: rango.desde, hasta: rango.hasta })
  // Una parada abre Identificar si el rol la tiene; si no, la ficha del pozo (dice a quién se le pidió).
  const abrir = (p: FaltaDeParada) => (rol.pantallas.includes('causa') ? setPantalla('causa') : abrirEquipo(p.equipo, false))
  // K2 · Si todas las debe la misma persona para la misma hora, ya lo dice la explicación: la fila no lo repite
  // (queda para el lector de pantalla). Si cambian, cada fila dice la suya.
  const mismoDebe = r.paradas.every(p => p.debe.rol === r.paradas[0]?.debe.rol && p.cuando === r.paradas[0]?.cuando)
  // Lo mismo con lo que falta: si a todas les falta lo mismo («faltan todos los pasos»), la cifra ya lo dice («sin causa»).
  const mismaFalta = r.paradas.length > 1 && r.paradas.every(p => p.falta === r.paradas[0]?.falta)
  const solo = <Info titulo="Solo lectura" texto={`TRIM lee los puntos de medición; nunca escribe sobre ellos.${r.motivos.length ? ` ${r.motivos.join(' ')}` : ''}`} />

  return (
    <div data-regulatorio={campoId} className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:gap-4">
      <Tarjeta aria-label={`${n0(r.cifra.valor)} ${r.cifra.unidad}. ${r.cifra.frase}`} data-reporte-anh={r.estado} data-valor={r.cifra.valor} data-bbl={r.bblSinCausa}
        className={telefono ? 'px-[18px] pb-4 pt-4' : 'px-5 pb-5 pt-6 sm:px-7'}>
        <div data-cifra-grande="">
          <p className={cn('flex flex-wrap items-center gap-x-1.5 font-medium text-[var(--tinta2)]', telefono ? 'text-[14px]' : 'text-[15px]')}>
            {r.estado === 'bloqueado' && <MarcaPrioridad s={3} tamano={15} decorativa />}
            {/* K2 · En el teléfono el título («Reporte al regulador») y el período ya lo dicen: la ⓘ va junto a la cifra. */}
            <span className="max-sm:sr-only">Reporte a la ANH · {r.periodo}</span>
            <span className="max-sm:hidden">{solo}</span>
          </p>
          <p className={cn('mt-1 flex flex-wrap items-baseline font-bold tracking-[-.03em] text-[var(--tinta)] tabular-nums',
            telefono ? 'gap-x-2.5 text-[48px] leading-[.95]' : 'gap-x-3.5 text-[64px] leading-[.95]')}>
            <span data-cifra="">{n0(r.cifra.valor)}</span>
            <small className={cn('font-medium tracking-normal text-[var(--tinta2)]', telefono ? 'text-[18px]' : 'text-[24px]')}>{r.cifra.unidad}</small>
            {telefono && <span className="self-center">{solo}</span>}
          </p>
          <p data-frase="" className={cn('max-w-[760px] font-medium text-[var(--tinta)]', telefono ? 'mt-1.5 text-[19px] leading-[1.35]' : 'mt-2 text-[22px] leading-[1.35]')}>{r.cifra.frase}</p>
          <p data-explica="" className={cn('max-w-[760px] text-[var(--tinta2)]', telefono ? 'mt-1.5 text-[16px] leading-[1.5]' : 'mt-1.5 text-[17px] leading-[1.5]')}>{r.cifra.explica}</p>
        </div>
        {r.paradas.length > 0 && (
          <ul className="mt-3 max-w-[760px]" aria-label="Lo que falta">
            {r.paradas.map(p => (
              <li key={`${p.campoId}|${p.eventoId}`}>
                <button type="button" onClick={() => abrir(p)} data-parada-sin-causa={p.equipo} data-bbl={p.bbl}
                  className="grid min-h-[56px] w-full cursor-pointer grid-cols-[1fr_auto_20px] items-center gap-x-3 border-t border-[var(--linea2)] py-2 text-left transition-colors duration-[120ms] hover:bg-[var(--panel2)]">
                  <span className="min-w-0 text-[15px]">
                    <b className="font-semibold text-[var(--tinta)]">{p.equipo}</b>
                    <span className={mismaFalta ? 'sr-only' : 'text-[var(--tinta2)]'}> · {p.falta}</span>
                    <span className={mismoDebe ? 'sr-only' : 'block text-[14px] text-[var(--tinta2)]'} data-debe="">{mismoDebe ? '. ' : ''}Lo debe el {p.debe.nombre} · {p.cuando}</span>
                  </span>
                  <b className="whitespace-nowrap text-right text-[16px] font-bold tabular-nums text-[var(--tinta)]">{n0(p.bbl)} <small className="text-[14px] font-normal text-[var(--tinta2)]">bbl</small></b>
                  <ChevronRight aria-hidden className="size-5 text-[var(--tinta3)]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <ArbolCircular campoId={campoId} desde={rango.desde} hasta={rango.hasta} periodo={rango.nombre} plegadoEnTelefono />

      <MedicionOficial campoId={campoId} />
    </div>
  )
}

/** La medición oficial y las casillas de PRODML: detrás de «ver más» en la pantalla
 *  (X4 §3.6 y §3.7) y enteras en el papel. Las calibraciones, en dos renglones y sin
 *  cortar (UI-17). */
function MedicionOficial({ campoId }: { campoId: string }) {
  const campo = useCampo(); const cfg = usePlanta(); const rango = useRango()
  const abrirEquipo = useApp(s => s.abrirEquipo)
  const lb = useLibro({ campos: [campoId], desde: rango.desde, hasta: rango.hasta })
  const equipoDeHoy = useEquiposDeHoy([campoId])
  const [abierto, setAbierto] = useState(false)
  // Sin esquema registrado no hay puntos de medición que listar (hueco, nunca los de otro campo).
  const pmos = (cfg ? [...cfg.tronco, ...cfg.gas, ...cfg.crudo, ...cfg.agua] : [])
    .flatMap(e => [e, ...(e.miembros ?? [])])
    .filter(e => e.pmo)
    .map(e => ({ pmo: e.pmo!, etiqueta: e.etiqueta, eq: e.equipo ? equipoDeHoy(e.equipo, campoId) : undefined }))
  const conCalibracion = pmos.flatMap(p => (p.eq?.dispositivos ?? []).filter(d => d.calibracion).map(d => ({ ...p, d })))
  const porCategoria = CATALOGO.map(c => ({ c, bbl: lb.porTipo.filter(t => CATEGORIA_DE[t.tipo] === c.id).reduce((a, t) => a + t.bbl, 0) }))
  const sinCasilla = lb.porTipo.filter(t => !CATEGORIA_DE[t.tipo]).reduce((a, t) => a + t.bbl, 0)
  const medicion = pedirMedicionOficial(campoId), banda = medicion.banda
  const oculto = !abierto && 'hidden print:block'

  return (
    <>
      <Tarjeta aria-labelledby="medicion-oficial" data-medicion-oficial={abierto ? 'abierta' : 'cerrada'}>
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 id="medicion-oficial" className="text-[16px] font-semibold leading-snug text-[var(--tinta)]">Medición oficial</h2>
          <button type="button" aria-expanded={abierto} aria-controls="medicion-oficial-detalle" onClick={() => setAbierto(x => !x)}
            className="no-imprimir inline-flex min-h-11 cursor-pointer items-center gap-1 text-[15px] font-semibold text-[var(--tinta)] hover:underline sm:min-h-9">
            {/* K2 · En el teléfono, la cuenta de puntos va adentro: es lo primero que se ve al abrir. */}
            {abierto ? 'Ver menos' : <>Ver más<span className="max-sm:hidden"> · {pmos.length} {pmos.length === 1 ? 'punto' : 'puntos'}</span></>}<ChevronRight aria-hidden className={cn('size-4 text-[var(--tinta2)] transition-transform', abierto && 'rotate-90')} />
          </button>
        </header>
        <div id="medicion-oficial-detalle" className={cn('mt-3 grid items-start gap-x-8 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr))]', oculto)}>
          <section aria-label="Puntos de medición oficial" className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[var(--tinta)]">Puntos de medición oficial <span className="font-normal text-[var(--tinta2)]">· {pmos.length} en {campo.nombre}</span></h3>
            <p className="mt-1 text-[14px] text-[var(--tinta2)]">{medicion.origen?.fuente ?? 'sin punto de medición'} · corte de agua: {medicion.origen?.bsw ?? 'sin dato'}</p>
            {pmos.map(p => (
              <button key={p.pmo} type="button" disabled={!p.eq} onClick={p.eq ? () => abrirEquipo(p.eq!.id, false) : undefined} data-pmo={p.pmo}
                className={cn('grid w-full grid-cols-[auto_1fr_auto] items-baseline gap-x-2.5 border-b border-[var(--linea2)] py-2 text-left text-[14px] last:border-0', p.eq && 'cursor-pointer hover:bg-[var(--panel2)]')}>
                <b className="font-semibold text-[var(--tinta)]">{p.pmo}</b>
                <span className="min-w-0 break-words text-[var(--tinta)]">{p.etiqueta}</span>
                <span className="text-[var(--tinta2)]">{p.eq?.id ?? 'sin instrumentar'}</span>
              </button>
            ))}
            <h3 className="mb-1 mt-3 text-[15px] font-semibold text-[var(--tinta)]">Calibración declarada</h3>
            {conCalibracion.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Ningún instrumento de custodia tiene calibración declarada en este campo.</p>}
            {conCalibracion.map(c => (
              <p key={c.d.tag} className="border-b border-[var(--linea2)] py-1.5 text-[14px] last:border-0" data-calibracion={c.d.tag}>
                <b className="font-semibold text-[var(--tinta)]">{c.d.tag}</b>
                <span className="text-[var(--tinta2)]"> · {c.pmo} · {sinLectura(c.d) ? 'sin señal' : `${num(c.d.valor)} ${c.d.unidad}`.trim()}</span>
                <span className="block break-words text-[var(--tinta2)]">{c.d.calibracion}</span>
              </p>
            ))}
          </section>
          <section aria-label="Producción del período" className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[var(--tinta)]">Producción del período</h3>
            <div className="mt-1 text-[14px]">
              {([['Real (punto de medición oficial)', `${n0(lb.real)} bbl`], [NOMBRE_CIFRA.potencial, `${n0(lb.potencial)} bbl`],
                ['Diferidos', `${n0(lb.brecha)} bbl ±${n0(lb.tolerancia)}`], ['Del potencial', `${n1(lb.pe)} %`],
                ['Pozos sin prueba', lb.custodia.sinPrueba.map(p => p.id).join(', ') || 'ninguno'],
                ['Pruebas estimadas', lb.custodia.estimados.map(p => p.id).join(', ') || 'ninguna']] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-[var(--linea2)] py-1.5 last:border-0">
                  <span className="text-[var(--tinta2)]">{k}</span><b className="tabular-nums text-right text-[var(--tinta)]">{v}</b>
                </div>
              ))}
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">
              Banda ±{n0(banda.valor * 100)} %<Info titulo="Condiciones y banda" texto={`${NOMBRE_CIFRA.potencial}: las pruebas de los pozos por el factor de asignación del mes. Condiciones estándar: 14,65 psia y 60 °F. Banda: ${banda.fuente}.`} />
            </p>
          </section>
        </div>
      </Tarjeta>

      <Tarjeta aria-labelledby="prodml" className={cn(oculto)} data-prodml="">
        <h2 id="prodml" className="text-[16px] font-semibold leading-snug text-[var(--tinta)]">También en PRODML</h2>
        <Lectura>El mismo diferido del árbol de arriba, en las casillas del estándar PRODML. Lo declarado o sin identificar no tiene casilla hasta que alguien lo clasifique.</Lectura>
        <div className="mt-1 max-w-[760px]">
          {porCategoria.map(({ c, bbl }) => (
            <div key={c.id} className="flex items-baseline justify-between gap-2 border-b border-[var(--linea2)] py-1.5 text-[14px] last:border-0">
              <span className="min-w-0">{c.nombre}<small className="block text-[13px] text-[var(--tinta2)]">{c.prodml}</small></span>
              <b className="shrink-0 tabular-nums">{n0(bbl)}</b>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-2 py-1.5 text-[14px]">
            <span className="text-[var(--tinta2)]">Sin casilla todavía (declarado o sin identificar)</span>
            <b className="tabular-nums">{n0(sinCasilla)}</b>
          </div>
        </div>
      </Tarjeta>
    </>
  )
}
