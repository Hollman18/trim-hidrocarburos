import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useApp, useCampo, usePlanta, useRango } from '@/app/store'
import { useLibro } from '@/shared/api/diferidos'
import { useEquiposDeHoy } from '@/shared/api/equipos'
import { pedirMedicionOficial } from '@/shared/api/medicion'
import { useReporteAnh } from '@/shared/api/regulatorio'
import { NOMBRE_CIFRA } from '@/shared/api/resultados'
import { CATALOGO, CATEGORIA_DE } from '@/entities/causas'
import { Tarjeta } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { useTelefono } from '@/shared/ui/telefono'
import { n0, n1, num, sinLectura } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { formatoFecha } from '@/shared/lib/fecha'

const HORA = formatoFecha({ hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })
import { ArbolCircular } from '@/widgets/choke/ArbolCircular'
import { Balance } from '@/widgets/choke/Balance'
import { RespuestaAnh } from '@/widgets/informe/RespuestaAnh'
import { ExportarReporte } from '@/widgets/informe/ExportarReporte'
import { Cifra } from '@/shared/ui/scada'

/** REPORTE A LA ANH, el inicio de regulatorio (experiencia v3; necesario-por-rol §10 y §14; imagen
 *  d1-grafito-reg). Una sola pantalla y sin menú. «¿El reporte pasa? Si no, ¿qué falta, quién lo
 *  debe y cuánto tiempo queda?»
 *
 *  - A la izquierda, los números: las paradas sin causa (lo que impide publicar), sus barriles, la
 *    hora límite y la respuesta de la ANH con lo que queda de la hora para corregir (registrada a
 *    mano por regulatorio).
 *  - A la derecha, qué falta y quién lo debe, una fila por parada, y «Exportar el reporte» (uno solo).
 *  - Debajo, el balance producido · diferido · perdido con su trazabilidad, el árbol de 6 pasos
 *    como la circular (los códigos ANH, a un toque) y la medición oficial con PRODML (a un toque).
 *  TRIM lee la medición; nunca escribe sobre ella. El motor calcula (`useReporteAnh`). */
export function Regulatorio() {
  const rango = useRango(); const telefono = useTelefono()
  const campoId = useApp(s => s.campoId), abrirEquipo = useApp(s => s.abrirEquipo)
  const r = useReporteAnh({ campos: [campoId], desde: rango.desde, hasta: rango.hasta })
  const limite = r.paradas.reduce<(typeof r.paradas)[number] | undefined>((a, p) => (!a || p.limite < a.limite ? p : a), undefined)
  const solo = <Info titulo="Solo lectura" texto={`TRIM lee los puntos de medición; nunca escribe sobre ellos.${r.motivos.length ? ` ${r.motivos.join(' ')}` : ''}`} />
  // En el teléfono, una sola ⓘ: la frase del motor, el plazo de la Circular 024 y lo de solo lectura.
  const porQue = <Info titulo={r.titulo} texto={`${r.cifra.frase} El límite es el de la Circular 024. Solo lectura: TRIM lee los puntos de medición; nunca escribe sobre ellos.${r.motivos.length ? ` ${r.motivos.join(' ')}` : ''}`} />

  const numeros = (
    <Tarjeta aria-label={`${n0(r.cifra.valor)} ${r.cifra.unidad}. ${r.cifra.frase}`} data-reporte-anh={r.estado} data-valor={r.cifra.valor} data-bbl={r.bblSinCausa}
      className="flex flex-col gap-4">
      <div data-cifra-grande="">
        <Cifra rotulo="Paradas sin causa" valor={r.cifra.valor} unidad={r.cifra.valor === 1 ? 'parada' : 'paradas'} tamano="principal" mayusculas={false}
          estado={r.estado === 'bloqueado' ? 'anormal' : 'normal'} condicion={r.estado === 'bloqueado' ? 'aviso' : undefined}
          // B4 · En el teléfono (necesario-por-rol §14: «Sin causa 2 paradas · no se puede publicar»), el porqué entero, en su ⓘ.
          nota={telefono
            ? <span data-frase=""><b className="font-semibold text-[var(--tinta)]">{r.titulo}</b> {porQue}</span>
            : <span data-frase=""><b className="font-semibold text-[var(--tinta)]">{r.titulo}</b>{r.cifra.frase.replace(r.titulo, '')} {solo}</span>} />
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-[var(--linea2)] pt-4">
        <Cifra rotulo="Sin causa" valor={r.bblSinCausa} unidad="bbl" mayusculas={false} nota={telefono ? undefined : 'no se puede reportar'} />
        <div className="min-w-0" data-limite={limite?.limite ?? ''}>
          <p className="font-cond text-[13px] font-semibold leading-tight text-[var(--tinta2)]">Límite</p>
          {limite
            ? <p className="mt-1 flex flex-wrap items-baseline gap-x-2"><b className="tabular text-[26px] font-bold leading-none tracking-[-.01em] text-[var(--tinta)]">{HORA.format(new Date(limite.limite))}</b>
              <span className="text-[15px] text-[var(--tinta2)]">{limite.cuando.replace(/ antes de las \d\d:\d\d$/, '')}{limite.vencido ? ' · venció' : ''}</span></p>
            : <p className="mt-1 text-[15px] text-[var(--tinta2)]">nada pendiente</p>}
          {!telefono && <p className="mt-1.5 text-[14px] text-[var(--tinta2)]">Circular 024</p>}
        </div>
      </div>
      {!telefono && <RespuestaAnh r={r} campoId={campoId} className="border-t border-[var(--linea2)] pt-4" />}
    </Tarjeta>
  )

  const quien = (
    <Tarjeta aria-labelledby="que-falta" className="flex flex-col">
      <h2 id="que-falta" className="text-[16px] font-semibold text-[var(--tinta)]">Qué falta y quién lo debe</h2>
      {r.paradas.length === 0 && <p className="mt-2 text-[15px] text-[var(--tinta2)]">Nada: todas las paradas del período tienen su causa.</p>}
      {r.paradas.length > 0 && (
        <ul className="mt-2" aria-label="Lo que falta">
          {r.paradas.map(p => (
            <li key={`${p.campoId}|${p.eventoId}`}>
              <button type="button" onClick={() => abrirEquipo(p.equipo, false)} data-parada-sin-causa={p.equipo} data-bbl={p.bbl}
                className="grid min-h-[56px] w-full cursor-pointer grid-cols-[1fr_auto_20px] items-center gap-x-3 border-t border-[var(--linea2)] py-2 text-left transition-colors duration-[120ms] hover:bg-[var(--panel2)]">
                <span className="min-w-0 text-[15px]">
                  <b className="font-semibold text-[var(--tinta)]">{p.equipo}</b>
                  {!telefono && <span className="text-[var(--tinta2)]"> · {p.falta}</span>}
                  {/* En el teléfono (§14: «LC-21 · 247 bbl · lo debe el operador»), la hora va una vez, en «Límite», si es la misma. */}
                  <span className="block text-[14px] text-[var(--tinta2)]" data-debe="">Lo debe el {p.debe.nombre}{telefono && p.limite === limite?.limite ? '' : ` · ${p.cuando}`}</span>
                </span>
                <b className="whitespace-nowrap text-right text-[16px] font-bold tabular-nums text-[var(--tinta)]">{n0(p.bbl)} <small className="text-[14px] font-normal text-[var(--tinta2)]">bbl</small></b>
                <ChevronRight aria-hidden className="size-5 text-[var(--tinta3)]" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ExportarReporte className="mt-4" telefono={telefono} />
    </Tarjeta>
  )

  return (
    <div data-regulatorio={campoId} className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:gap-4">
      {telefono
        // En el teléfono, primero lo que falta y quién lo debe; la respuesta de la ANH, en su tarjeta debajo.
        ? <>{numeros}{quien}<Tarjeta aria-label="Respuesta de la ANH"><RespuestaAnh r={r} campoId={campoId} /></Tarjeta></>
        : <div className="grid items-start gap-4 min-[1100px]:grid-cols-[minmax(0,420px)_1fr]">{numeros}{quien}</div>}
      <Balance q={{ campos: [campoId], desde: rango.desde, hasta: rango.hasta }} />
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
