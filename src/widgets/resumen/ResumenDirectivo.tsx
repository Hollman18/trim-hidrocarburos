import { useApp, useAmbito, useRango, useRol } from '@/app/store'
import { useLibro, useSerie, useBase, useRiesgo, useEstadoCampos } from '@/shared/api/diferidos'
import { useHorasMantenimiento } from '@/shared/api/sap'
import type { MesResumen } from '@/shared/api/diferidos'
import { TIPO_CAUSA } from '@/entities/causa-senal'
import { NOMBRE_PARTE } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { AHORA, fechaCorta } from '@/entities/reloj'
import { PUESTA_EN_MARCHA, SIN_META } from '@/entities/configuracion'
import { conMeta, textoSinMeta } from '@/entities/libro'
import { sumarMeses } from '@/entities/plan'
import { Tip } from '@/shared/ui/Tip'
import { Boton } from '@/shared/ui/primitivas'
import { MarcaPrioridad, FueraDeMeta } from '@/shared/ui/Prioridad'
import { n0, usd, diaIso, plural } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { Rango } from '@/widgets/diferidos/Rango'
import { publicacion } from '@/widgets/diferidos/publicacion'
import { alFinal } from '@/shared/ui/alFinal'

const D = 86_400_000
const signo = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${n0(Math.abs(v * 100))} %`

/** El resumen del directivo: cinco respuestas y nada más. Cuánto no se
 *  produjo y cuánto vale; si va bien o mal contra las metas que él firmó (en
 *  barriles por día, y el total del mes); cuánto es de los equipos de alto
 *  impacto; quién se lo lleva; y qué pasa ahora. Los números son los del
 *  libro: el detalle está a un clic, no en la pantalla. */
export function ResumenDirectivo() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol()
  const setRango = useApp(s => s.setRango), setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla)
  const ids = ambito.campos.map(c => c.id)
  const q = { campos: ids, desde: rango.desde, hasta: rango.hasta }
  const lb = useLibro(q)
  const serie = useSerie(ids)
  const base = useBase(q)
  const riesgo = useRiesgo(ids)
  const perdiendo = riesgo.filter(r => r.estado === 'perdiendo')
  const enRiesgo = riesgo.filter(r => r.estado === 'en-riesgo' && r.altoImpacto)
  const servicios = riesgo.filter(r => r.estado === 'en-riesgo' && !r.altoImpacto)
  const estados = useEstadoCampos(ids)
  const parados = estados.reduce((a, e) => a + e.parados, 0), pozos = estados.reduce((a, e) => a + e.pozos, 0)
  // Un mes en curso nunca se puede publicar: eso se dice en neutro. El
  // cuadrado se reserva para lo que de verdad impide publicar.
  const pub = publicacion(lb)
  const sinPrecio = lb.sinPrecio.map(c => campoPorId(c).nombre)
  const dias = Math.max(1 / 24, lb.meta.dias)
  const realDia = lb.real / dias, difDia = lb.brecha / dias
  // Sin meta firmada en algún campo, la meta del total no existe: se dice cuál
  // falta y no se marca nada contra la suma de los demás.
  const hayMeta = conMeta(lb.meta), sinMeta = textoSinMeta(lb.meta, ids.length > 1)
  const bajoMeta = hayMeta && realDia < lb.meta.produccionDia, sobreMax = hayMeta && difDia > lb.meta.diferidoDia
  const enCurso = lb.meta.diasTotal > lb.meta.dias + 0.01
  const altoPct = lb.diferido > 0 ? (lb.altoImpacto / lb.diferido) * 100 : 0
  // Si todo sigue como está ahora: lo que va del mes más el ritmo de hoy hasta el último día.
  const ritmoAhora = estados.reduce((a, e) => a + e.potencialBpd - e.perdiendoBpd, 0)
  const perdiendoAhora = estados.reduce((a, e) => a + e.perdiendoBpd, 0)
  const restantes = Math.max(0, lb.meta.diasTotal - lb.meta.dias)
  const cierreProd = lb.real + ritmoAhora * restantes, cierreDif = lb.brecha + perdiendoAhora * restantes
  // Antes y después de TRIM: el diferido de alto impacto por día, con la misma cuenta.
  const inicio = new Date(`${PUESTA_EN_MARCHA}T00:00:00-05:00`)
  const antes = useLibro({ campos: ids, desde: new Date(`${sumarMeses(PUESTA_EN_MARCHA.slice(0, 7), -3)}-01T00:00:00-05:00`), hasta: inicio })
  const despues = useLibro({ campos: ids, desde: inicio, hasta: AHORA })
  // El indicador de mantenimiento que mira la gerencia: horas proactivas contra correctivas (SAP).
  const horas = useHorasMantenimiento(ids, inicio, AHORA)
  const altoAntes = antes.altoImpacto / Math.max(1 / 24, antes.meta.dias), altoDespues = despues.altoImpacto / Math.max(1 / 24, despues.meta.dias)
  const dinero = lb.valorUsd !== undefined ? usd(lb.valorUsd) : undefined
  const top = lb.porEquipo.slice(0, 3)
  const porDia = perdiendo.reduce((a, r) => a + r.bblDia, 0)
  const proxima = [...enRiesgo].filter(r => r.horas !== undefined).sort((a, b) => a.horas! - b.horas!)[0]
  const abrir = (c: string, eq: string) => { setCampo(c); abrirEquipo(eq, false) }

  return (
    <>
      <section className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <small className="text-[11px] tracking-[.04em] text-[var(--tinta3)]">{rango.nombre.toUpperCase()} · {ambito.titulo.toUpperCase()}</small>
          <Tip titulo={pub.estado === 'publicable' ? 'Se puede publicar' : pub.estado === 'provisional' ? 'Provisional' : 'Todavía no se puede publicar'}
            pista={pub.texto} filas={[]}
            className="inline-flex items-center gap-1.5 text-[11.5px]">
            {pub.estado === 'publicable' ? <span className="text-[var(--tinta2)]">✓ se puede publicar</span>
              : pub.estado === 'provisional' ? <span className="text-[var(--tinta2)]">provisional: el mes está en curso</span>
                : <><FueraDeMeta si tamano={11} /><span>todavía no se puede publicar</span></>}
          </Tip>
        </div>
        <div className="mt-1.5 flex flex-wrap items-end gap-x-8 gap-y-2">
          <span>
            <b className="tabular block text-[44px] leading-none">{n0(lb.brecha)}</b>
            <small className="text-[12px] text-[var(--tinta2)]">barriles diferidos: no se produjeron, pudiendo</small>
            <Rango lb={lb} />
          </span>
          <span className="pb-1">
            <b className="tabular block text-[22px] leading-none">{dinero ? `${dinero.valor} ${dinero.unidad}` : 'sin precio'}</b>
            <small className="text-[11px] text-[var(--tinta3)]">{!dinero ? 'falta el precio neto en la configuración'
              : sinPrecio.length ? `sin contar los días sin precio de ${sinPrecio.join(', ')}` : 'valor'}</small>
          </span>
          <span className="pb-1">
            <b className="tabular flex items-center gap-1.5 text-[22px] leading-none"><FueraDeMeta si={bajoMeta} tamano={12} />{n0(realDia)} <small className="text-[11px] font-normal text-[var(--tinta3)]">bbl/d</small></b>
            <small className="text-[11px] text-[var(--tinta3)]">producción · {hayMeta ? `meta ${n0(lb.meta.produccionDia)} bbl/d` : sinMeta}</small>
          </span>
          <span className="pb-1">
            <b className="tabular flex items-center gap-1.5 text-[22px] leading-none"><FueraDeMeta si={sobreMax} tamano={12} />{n0(difDia)} <small className="text-[11px] font-normal text-[var(--tinta3)]">bbl/d</small></b>
            <small className="text-[11px] text-[var(--tinta3)]">
              diferido · {hayMeta ? `máximo ${n0(lb.meta.diferidoDia)} bbl/d` : sinMeta}{base ? ` · ${signo(base.cambio)} frente a ${base.nombre}` : ''}
            </small>
          </span>
        </div>
        <div className="mt-3 grid gap-0.5 border-t border-[var(--linea2)] pt-2 text-[11.5px] text-[var(--tinta2)]">
          {enCurso && (
            <p className="mb-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-[var(--tinta)]">
              <span>Si todo sigue como está ahora, el mes cierra con</span>
              <span className="inline-flex items-center gap-1"><FueraDeMeta si={hayMeta && cierreProd < lb.meta.produccionTotal} tamano={11} /><b className="tabular">{n0(cierreProd)} bbl</b> producidos</span>
              <span>{hayMeta ? `(meta ${n0(lb.meta.produccionTotal)})` : `(${sinMeta})`} y</span>
              <span className="inline-flex items-center gap-1"><FueraDeMeta si={hayMeta && cierreDif > lb.meta.diferidoTotal} tamano={11} /><b className="tabular">{n0(cierreDif)} bbl</b> diferidos</span>
              <span>{hayMeta ? `(máximo ${n0(lb.meta.diferidoTotal)})` : ''}.{perdiendoAhora > 0 ? ` Cada día así cuesta ${n0(perdiendoAhora)} bbl.` : ''}</span>
            </p>
          )}
          <p>
            {enCurso ? <>Meta del mes completo ({n0(lb.meta.diasTotal)} días)</> : <>Meta del período ({n0(lb.meta.diasTotal)} días)</>}:{' '}
            {hayMeta ? <>producción <b className="tabular text-[var(--tinta)]">{n0(lb.meta.produccionTotal)} bbl</b> · diferido máximo{' '}
              <b className="tabular text-[var(--tinta)]">{n0(lb.meta.diferidoTotal)} bbl</b></> : <b className="text-[var(--tinta)]">{sinMeta}</b>}
          </p>
          <p className="flex flex-wrap items-center gap-x-2">
            <span>{enCurso ? 'A la fecha:' : 'Resultado:'}</span>
            <span className="inline-flex items-center gap-1"><FueraDeMeta si={hayMeta && lb.real < lb.meta.produccion} tamano={11} />producido <b className="tabular text-[var(--tinta)]">{n0(lb.real)} bbl</b>{hayMeta ? ` de ${n0(lb.meta.produccion)} bbl` : ''}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><FueraDeMeta si={hayMeta && lb.brecha > lb.meta.diferido} tamano={11} />diferido <b className="tabular text-[var(--tinta)]">{n0(lb.brecha)} bbl</b>{hayMeta ? ` de un máximo de ${n0(lb.meta.diferido)} bbl` : ''}</span>
          </p>
        </div>
      </section>

      <section className="mb-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded border border-[var(--linea)] bg-[var(--panel)] px-4 py-3 shadow-[var(--sombra)]">
        <span className="flex min-w-[min(100%,260px)] flex-1 items-start gap-2">
          {porDia > 0 && <MarcaPrioridad s={perdiendo.some(r => r.altoImpacto) ? 1 : 2} tamano={14} className="mt-[2px]" />}
          <span className="min-w-0 text-[12.5px]">
            <b>Ahora:</b>{' '}
            {porDia > 0 ? <>{n0(porDia)} bbl/d perdiéndose · {parados} de {pozos} pozos parados · la causa mayor, {perdiendo[0]!.equipo}{ambito.global ? ` de ${campoPorId(perdiendo[0]!.campoId).nombre}` : ''} ({TIPO_CAUSA[perdiendo[0]!.tipo].toLowerCase()})</> : 'todos los pozos produciendo'}
            <small className="block text-[11px] text-[var(--tinta2)]">
              {enRiesgo.length ? `${plural(enRiesgo.length, 'bomba o electrosumergible', 'bombas o electrosumergibles')} con una parte avisando${proxima ? `; la primera, ${proxima.equipo}, en ${fmtHoras(proxima.horas!)}` : ''}`
                : perdiendo.some(r => r.altoImpacto) ? 'ninguna otra bomba ni electrosumergible avisa' : 'ninguna bomba ni electrosumergible avisa'}
              {servicios.length > 0 && ` · ${plural(servicios.length, 'servicio', 'servicios')} en alarma: ${servicios.map(r => r.equipo).join(', ')}`}
            </small>
          </span>
        </span>
        {rol.pantallas.includes('riesgo') && <Boton onClick={() => setPantalla('riesgo')}>Ver qué está en riesgo</Boton>}
      </section>

      <div className="mb-2.5 grid items-stretch gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        <section className="rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
          <b className="tabular block text-[26px] leading-none">{n0(altoPct)} %</b>
          <small className="block text-[11.5px] text-[var(--tinta2)]">viene de bombas de reinyección y electrosumergibles</small>
          <small className="mt-1 block text-[11px] text-[var(--tinta2)]">
            Desde que entró TRIM ({fechaCorta(inicio)}): <b className="tabular text-[var(--tinta)]">{n0(altoDespues)} bbl/d</b> de alto impacto;
            los tres meses antes, {n0(altoAntes)} bbl/d ({altoAntes > 0 ? signo((altoDespues - altoAntes) / altoAntes) : '—'}). Es una comparación, no la prueba de que lo bajó TRIM.
          </small>
          {horas.porcentaje !== undefined && (
            <small className="mt-1 block text-[11px] text-[var(--tinta2)]">
              Mantenimiento proactivo en el mismo lapso: <b className="tabular text-[var(--tinta)]">{n0(horas.porcentaje)} %</b> de las horas fue
              preventivo o predictivo ({n0(horas.proactivo)} h contra {n0(horas.correctivo)} h correctivas, en SAP). Si no sube, las fallas no bajan.
            </small>
          )}
          <Tendencia serie={serie} desde={rango.desde} hasta={rango.hasta}
            onMes={m => setRango(diaIso(m.desde), diaIso(new Date(m.hasta.getTime() - 1)))} />
        </section>

        <section className="rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
          <h3 className="font-cond mb-2 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">QUIÉN SE LOS LLEVA</h3>
          {top.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Nada diferido en el período.</p>}
          {top.map(f => (
            <button key={`${f.campoId}${f.equipo}${f.tipo}`} onClick={() => abrir(f.campoId, f.equipo)}
              className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-baseline gap-3 border-b border-[var(--linea2)] py-2 text-left last:border-0 hover:bg-[var(--panel2)]">
              <span className="min-w-0">
                <b className="text-[13px]">{f.equipo}</b>
                <span className="text-[11.5px] text-[var(--tinta3)]">{ambito.global ? ` · ${campoPorId(f.campoId).nombre}` : ''}</span>
                <small className="block text-[11px] text-[var(--tinta2)]">{f.partes[0] ? NOMBRE_PARTE[f.partes[0].parte].toLowerCase() : TIPO_CAUSA[f.tipo].toLowerCase()}</small>
              </span>
              <span className="tabular text-right">
                <b className="block text-[15px] leading-tight">{n0(f.bbl)}</b>
                <small className="text-[10px] text-[var(--tinta3)]">bbl · {n0(lb.diferido ? (f.bbl / lb.diferido) * 100 : 0)} %</small>
              </span>
            </button>
          ))}
        </section>
      </div>

      {ambito.global && (
        <section className="rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
          <h3 className="font-cond mb-1 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">POR CAMPO</h3>
          {lb.porCampo.map(c => {
            const r = c.real / dias, d = c.brecha / dias, mp = c.metaProduccion / dias, md = c.metaDiferido / dias
            return (
              <button key={c.campoId} onClick={() => { setCampo(c.campoId) }}
                className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-[var(--linea2)] py-1.5 text-left text-[12.5px] last:border-0 hover:bg-[var(--panel2)]">
                <span className="min-w-0">
                  <span className="block truncate">{campoPorId(c.campoId).nombre}</span>
                  <small className="tabular flex flex-wrap items-center gap-x-1.5 text-[11px] text-[var(--tinta2)]">
                    {c.sinMeta
                      ? <span>produce {n0(r)} bbl/d · diferido {n0(d)} bbl/d · {SIN_META}</span>
                      : <><span className="inline-flex items-center gap-1"><FueraDeMeta si={r < mp} tamano={11} />produce {n0(r)} de {n0(mp)} bbl/d</span>·
                        <span className="inline-flex items-center gap-1"><FueraDeMeta si={d > md} tamano={11} />diferido {n0(d)} de máx. {n0(md)} bbl/d</span></>}
                  </small>
                </span>
                <span className="tabular text-right"><b className="block">{n0(c.brecha)}</b><small className="text-[10px] text-[var(--tinta3)]">bbl diferidos en el período</small></span>
              </button>
            )
          })}
        </section>
      )}
    </>
  )
}

/** Diferido por día de cada mes: lo de alto impacto oscuro, el resto claro,
 *  y sobre cada mes la raya de su máximo firmado (la meta puede cambiar de un
 *  mes a otro). Un clic en un mes lo abre. */
export function Tendencia({ serie, desde, hasta, onMes }: {
  serie: MesResumen[]; desde: Date; hasta: Date; onMes: (m: MesResumen) => void
}) {
  const W = 520, G = { x0: 8, x1: 512, y0: 18, y1: 96 }
  const pts = serie.map(m => {
    const d = Math.max(1 / 24, (Math.min(m.hasta.getTime(), AHORA.getTime()) - m.desde.getTime()) / D)
    // Un mes con algún campo sin meta firmada no tiene máximo: sin raya ni marca.
    const max = conMeta(m.libro.meta) ? m.libro.meta.diferidoDia : undefined
    return { m, total: m.libro.diferido / d, alto: m.libro.altoImpacto / d, max, sobre: max !== undefined && !m.parcial && m.libro.diferido / d > max }
  })
  const techo = Math.max(1, ...pts.map(p => Math.max(p.total, p.max ?? 0))) * 1.1
  const Y = (v: number) => G.y1 - (v / techo) * (G.y1 - G.y0)
  const paso = (G.x1 - G.x0) / Math.max(1, pts.length)
  const ancho = paso * 0.6
  return (
    <div ref={alFinal} className="mt-2 overflow-x-auto">
      <svg viewBox={`0 0 ${W} 118`} className="block h-auto w-full min-w-[420px]" role="group" aria-label="Diferido por día de cada mes contra su máximo firmado">
        <text x={G.x0} y={10} fontSize={10} fill="var(--tinta3)">bbl/d</text>
        {pts.map((p, i) => {
          const x = G.x0 + paso * i + (paso - ancho) / 2
          const activo = p.m.desde < hasta && p.m.hasta > desde
          return (
            <Tip key={p.m.mes} as="g" titulo={p.m.nombre} pista="Clic para ver este mes"
              filas={[['Diferido', `${n0(p.total)} bbl/d`], ['De alto impacto', `${n0(p.alto)} bbl/d`], ['Máximo firmado', p.max === undefined ? textoSinMeta(p.m.libro.meta, p.m.libro.porCampo.length > 1) : `${n0(p.max)} bbl/d`]]}
              onClick={() => onMes(p.m)}>
              <g className="cursor-pointer">
                <rect x={x - (paso - ancho) / 2} y={G.y0 - 16} width={paso} height={G.y1 - G.y0 + 36} fill="transparent" />
                <rect x={x} y={Y(p.total)} width={ancho} height={Math.max(0.5, G.y1 - Y(p.total))} fill="var(--dato-5)" />
                <rect x={x} y={Y(p.alto)} width={ancho} height={Math.max(0.5, G.y1 - Y(p.alto))} fill="var(--dato-1)" />
                {/* El mes que se mira se marca con un borde y su cifra, no apagando a los demás. */}
                {activo && <rect x={x - 2} y={Y(p.total) - 2} width={ancho + 4} height={G.y1 - Y(p.total) + 2} fill="none" stroke="var(--tinta)" strokeWidth={1.2} />}
                {p.max !== undefined && <line x1={x - 3} x2={x + ancho + 3} y1={Y(p.max)} y2={Y(p.max)} stroke="var(--tinta)" strokeWidth={1.3} strokeDasharray="3 2" />}
                {p.sobre && <rect x={x + ancho / 2 - 3.5} y={Math.min(Y(p.total), Y(p.max ?? 0)) - 12} width={7} height={7} rx={0.8} fill="var(--p3)" stroke="var(--marca-trazo)" strokeWidth={1}><title>Pasó el máximo de diferido firmado</title></rect>}
                {activo && <text x={x + ancho / 2} y={Math.min(Y(p.total), Y(p.max ?? 0)) - (p.sobre ? 16 : 5)} fontSize={10.5} textAnchor="middle" fill="var(--tinta)" className="tabular">{n0(p.total)}</text>}
                <text x={x + ancho / 2} y={G.y1 + 14} fontSize={11} textAnchor="middle" fill={activo ? 'var(--tinta)' : 'var(--tinta2)'} fontWeight={activo ? 600 : 400} className="font-cond">{p.m.corto.toUpperCase()}</text>
              </g>
            </Tip>
          )
        })}
        <line x1={G.x0} x2={G.x1} y1={G.y1} y2={G.y1} stroke="var(--linea)" />
      </svg>
      <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-[var(--tinta2)]">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-[var(--dato-1)]" />alto impacto</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-[var(--dato-5)]" />lo demás</span>
        <span className="inline-flex items-center gap-1.5"><svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--tinta)" strokeWidth="1.3" strokeDasharray="3 2" /></svg>máximo de diferido firmado</span>
        <span className="inline-flex items-center gap-1.5"><svg width="8" height="8" aria-hidden><rect x="0.5" y="0.5" width="7" height="7" rx="0.8" fill="var(--p3)" stroke="var(--marca-trazo)" strokeWidth={1} /></svg>mes que lo pasó</span>
      </div>
    </div>
  )
}
