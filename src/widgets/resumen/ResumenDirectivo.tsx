import { useId, useState } from 'react'
import { useApp, useAmbito, useRango, useRol } from '@/app/store'
import { useLibro, useSerie, useBase, useRiesgo, useEstadoCampos } from '@/shared/api/diferidos'
import { useRepartoMensual, CHOKES_Y_SIN_ASIGNAR, type MesPorTramo } from '@/shared/api/choke'
import { useHorasMantenimiento } from '@/shared/api/sap'
import type { MesResumen } from '@/shared/api/diferidos'
import { TIPO_CAUSA } from '@/entities/causa-senal'
import { NOMBRE_PARTE } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { AHORA, fechaCorta } from '@/entities/reloj'
import { PUESTA_EN_MARCHA } from '@/entities/configuracion'
import { conMeta, textoSinMeta } from '@/entities/libro'
import { sumarMeses } from '@/entities/plan'
import { Tip } from '@/shared/ui/Tip'
import { Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { BarraMeta } from '@/shared/ui/BarraMeta'
import { Lectura } from '@/shared/ui/Lectura'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { n0, n1, usd, diaIso, plural } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { Rango } from '@/widgets/diferidos/Rango'
import { SelloPublicacion } from '@/widgets/diferidos/Sello'
import { alFinal } from '@/shared/ui/alFinal'
import { useAnchoDibujo } from '@/widgets/resultados/ancho'
import { cn } from '@/shared/lib/cn'
import { Muestra, PatronesTramo } from '@/widgets/diferidos/tramos'
import { LARGO_TRAMO, mayuscula, rellenoSvg } from '@/widgets/diferidos/reparto'
import { formatoFecha } from '@/shared/lib/fecha'
import { otrosEnAlarma } from './enAlarma'
import { PorCampo } from './PorCampo'
import { PanelDondeSeTrabo, AntesConTrimPorTramo } from './DondeSeTrabo'

const D = 86_400_000
/** Un cambio en %: con signo, salvo que redondee a cero («0 %», nunca «−0 %»). */
const MES_CORTO = formatoFecha({ month: 'short', timeZone: 'America/Bogota' })
/** «jun a ago»: los tres meses antes de que entrara TRIM, como los escribe la base por tramo (B-50). */
const mesesAntes = (inicio: Date) => {
  const co = new Date(inicio.getTime() - 5 * 3_600_000)
  const mes = (k: number) => MES_CORTO.format(new Date(Date.UTC(co.getUTCFullYear(), co.getUTCMonth() + k, 15, 12)))
  return `${mes(-3)} a ${mes(-1)}`
}
const signo = (v: number) => { const r = Math.round(v * 100); return `${r > 0 ? '+' : r < 0 ? '−' : ''}${n0(Math.abs(r))} %` }

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
  const porTramo = useRepartoMensual(ids)
  const base = useBase(q)
  const riesgo = useRiesgo(ids)
  const perdiendo = riesgo.filter(r => r.estado === 'perdiendo')
  const enRiesgo = riesgo.filter(r => r.estado === 'en-riesgo' && r.altoImpacto)
  // Lo demás en alarma, por lo que es: un servicio (la regla de Riesgo) no es la multifásica.
  const otros = otrosEnAlarma(riesgo)
  const estados = useEstadoCampos(ids)
  const parados = estados.reduce((a, e) => a + e.parados, 0), pozos = estados.reduce((a, e) => a + e.pozos, 0)
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

  const otrosTip: Array<[string, string]> = (otros?.filas ?? []).map(r => [`${r.equipo}${ambito.global ? ` · ${campoPorId(r.campoId).nombre}` : ''}`, TIPO_CAUSA[r.tipo]])
  const pieRiesgo = proxima ? `primero ${proxima.equipo} en ${fmtHoras(proxima.horas!)}` : enRiesgo[0] ? `${enRiesgo[0].equipo} ya pasó el límite`
    : perdiendo.some(r => r.altoImpacto) ? 'ninguna otra bomba ni electrosumergible avisa' : 'ninguna bomba ni electrosumergible avisa'
  // Sin `truncate`: a 1.280 px con un campo se cortaba y el número de servicios no se veía.
  // Lo que no es de alto impacto va en su renglón, que no se corta.
  const enRiesgoCelda = (
    <>
      <small className="block text-[13px] text-[var(--tinta3)]">En riesgo · alto impacto</small>
      <b className="tabular block text-[15px] leading-tight">{enRiesgo.length ? plural(enRiesgo.length, 'equipo', 'equipos') : 'ninguno'}</b>
      <small className="block text-[13px] text-[var(--tinta2)]">{pieRiesgo}</small>
      {otros && <small className="block text-[13px] text-[var(--tinta2)]">+ {otros.texto}</small>}
    </>
  )
  const titulo = 'text-[15px] font-semibold text-[var(--tinta)]'

  return (
    <>
      {/* C5: el ciclo ya no es la cifra de arriba (X4 §3.6). Este resumen ya no se ofrece: lo suyo está en La planta viva y en Resultados. */}

      <section className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
        <h3 className={`${titulo} mb-2 flex flex-wrap items-center gap-x-1`}>
          Lo medido en el período
          <Info titulo="Medido vs simulado" texto="Arriba: retorno posible (simulado, no entra al libro). Aquí: barriles diferidos del período (custodia medida y calculada)." />
        </h3>
        <div className="flex flex-wrap items-start justify-between gap-2">
          {/* El período lo dice la cabecera (también en el teléfono y en el papel). La
              publicación, como en el libro de diferidos: si no se puede, se ve por qué. */}
          <SelloPublicacion lb={lb} className="ml-auto" />
        </div>
        <div className="mt-1.5 flex flex-wrap items-end gap-x-8 gap-y-2">
          <span>
            <b className="tabular block text-[44px] leading-none">{n0(lb.brecha)}</b>
            <small className="text-[14px] text-[var(--tinta2)]">barriles diferidos</small>
            <Rango lb={lb} corto />
          </span>
          <span className="pb-1">
            <b className="tabular block text-[22px] leading-none">{dinero ? `${dinero.valor} ${dinero.unidad}` : 'sin precio'}</b>
            <small className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta3)]">
              {dinero && sinPrecio.length ? `valor · falta precio en ${sinPrecio.join(', ')}` : 'valor'}
              {!dinero && <Info titulo="Sin precio" texto="Falta el precio neto en la configuración." />}
              {dinero && sinPrecio.length > 0 && <Info titulo="Valor" texto={`Sin contar los días sin precio de ${sinPrecio.join(', ')}.`} />}
            </small>
          </span>
        </div>
        <div className="mt-3 grid gap-x-8 gap-y-3 border-t border-[var(--linea2)] pt-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
          <div className="grid content-start gap-2.5">
            <h3 className={titulo}>Promedio diario</h3>
            <BarraMeta rotulo="producción" valor={realDia} unidad="bbl/d" meta={hayMeta ? lb.meta.produccionDia : undefined}
              rotuloMeta={hayMeta ? `meta ${n0(lb.meta.produccionDia)}` : sinMeta} fuera={bajoMeta}
              tip={{ titulo: 'Producción', filas: [[enCurso ? 'A la fecha' : 'Del período', hayMeta ? `${n0(lb.real)} de ${n0(lb.meta.produccion)} bbl` : `${n0(lb.real)} bbl`],
                ['Meta del período', hayMeta ? `${n0(lb.meta.produccionTotal)} bbl · ${n0(lb.meta.diasTotal)} días` : sinMeta]] }} />
            <BarraMeta rotulo="diferido" valor={difDia} unidad="bbl/d" meta={hayMeta ? lb.meta.diferidoDia : undefined}
              rotuloMeta={hayMeta ? `máx. ${n0(lb.meta.diferidoDia)}` : sinMeta} fuera={sobreMax}
              apoyo={base ? `${signo(base.cambio)} frente a ${base.nombre}` : 'sin base de comparación'}
              tip={{ titulo: 'Diferido', filas: [[enCurso ? 'A la fecha' : 'Del período', hayMeta ? `${n0(lb.brecha)} de un máximo de ${n0(lb.meta.diferido)} bbl` : `${n0(lb.brecha)} bbl`],
                ['Máximo del período', hayMeta ? `${n0(lb.meta.diferidoTotal)} bbl · ${n0(lb.meta.diasTotal)} días` : sinMeta]] }} />
          </div>
          <div className="grid content-start gap-2.5">
            <div className="flex flex-wrap items-center gap-x-1">
              <h3 className={titulo}>{enCurso ? 'Cierre proyectado' : 'Total del período'}</h3>
              {enCurso && <Info titulo="Cierre proyectado" texto={`Si todo sigue como está ahora: lo que va del mes más el ritmo de hoy hasta el último día (${n0(lb.meta.diasTotal)} días).`} />}
            </div>
            {enCurso ? (
              <>
                <BarraMeta rotulo="producción" valor={cierreProd} unidad="bbl" meta={hayMeta ? lb.meta.produccionTotal : undefined}
                  rotuloMeta={hayMeta ? `meta ${n0(lb.meta.produccionTotal)}` : sinMeta} fuera={hayMeta && cierreProd < lb.meta.produccionTotal} />
                <BarraMeta rotulo="diferido" valor={cierreDif} unidad="bbl" meta={hayMeta ? lb.meta.diferidoTotal : undefined}
                  rotuloMeta={hayMeta ? `máx. ${n0(lb.meta.diferidoTotal)}` : sinMeta} fuera={hayMeta && cierreDif > lb.meta.diferidoTotal} />
              </>
            ) : (
              <>
                <BarraMeta rotulo="producción" valor={lb.real} unidad="bbl" meta={hayMeta ? lb.meta.produccion : undefined}
                  rotuloMeta={hayMeta ? `meta ${n0(lb.meta.produccion)}` : sinMeta} fuera={hayMeta && lb.real < lb.meta.produccion}
                  tip={{ titulo: 'Producción del período', filas: [['Meta del período', hayMeta ? `${n0(lb.meta.produccionTotal)} bbl · ${n0(lb.meta.diasTotal)} días` : sinMeta]] }} />
                <BarraMeta rotulo="diferido" valor={lb.brecha} unidad="bbl" meta={hayMeta ? lb.meta.diferido : undefined}
                  rotuloMeta={hayMeta ? `máx. ${n0(lb.meta.diferido)}` : sinMeta} fuera={hayMeta && lb.brecha > lb.meta.diferido} />
              </>
            )}
          </div>
        </div>
        <Lectura>
          Diferido: los barriles que no se produjeron, pudiendo. Lo producido se mide; lo diferido se
          calcula, y la cifra real está dentro del rango. Cada barra va contra la meta que usted firmó
          (la raya): la producción debe pasarla y el diferido quedarse antes. El cuadrado marca lo que
          está fuera de meta. Cierre proyectado: lo que va del mes más el ritmo de hoy hasta el último día.
        </Lectura>
      </section>

      <section className="mb-2.5 grid items-center gap-x-6 gap-y-2 rounded border border-[var(--linea)] bg-[var(--panel)] px-4 py-3 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
        <span className="min-w-0">
          <small className="block text-[13px] text-[var(--tinta3)]">Durante · crudo en vivo</small>
          {/* Un total no lleva marca de alarma: la lleva el equipo que lo causa, en «Causa mayor» (B-40). */}
          <b className="tabular block text-[18px] leading-tight">{porDia > 0 ? `${n0(porDia)} bbl/d` : 'nada'}</b>
          <small className="block text-[13px] text-[var(--tinta2)]">{porDia > 0 ? `${parados} de ${pozos} pozos parados` : 'todos los pozos produciendo'}</small>
        </span>
        {porDia > 0 && (
          <span className="min-w-0">
            <small className="block text-[13px] text-[var(--tinta3)]">Causa mayor</small>
            <b className="flex min-w-0 items-center gap-1.5 text-[15px] leading-tight">
              <MarcaPrioridad s={perdiendo[0]!.altoImpacto ? 1 : 2} tamano={14} />
              <span className="truncate">{perdiendo[0]!.equipo}{ambito.global ? ` · ${campoPorId(perdiendo[0]!.campoId).nombre}` : ''}</span>
            </b>
            <small className="block truncate text-[13px] text-[var(--tinta2)]">{TIPO_CAUSA[perdiendo[0]!.tipo].toLowerCase()}</small>
          </span>
        )}
        {otros
          ? <Tip as="span" titulo="También en alarma" filas={otrosTip} imprimir="todo" className="block min-w-0">{enRiesgoCelda}</Tip>
          : <span className="min-w-0">{enRiesgoCelda}</span>}
        {rol.pantallas.includes('riesgo') && <Boton className="justify-self-start" onClick={() => setPantalla('riesgo')}>Ver riesgo</Boton>}
      </section>

      <div className="mb-2.5 grid items-stretch gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        <section className="rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
          <b className="tabular block text-[26px] leading-none">{n0(altoPct)} %</b>
          <small className="block text-[14px] text-[var(--tinta2)]">del diferido · reinyección y electrosumergibles</small>
          <p className="mt-2 text-[13px] text-[var(--tinta2)]">
            {/* La misma base escrita igual que «Por dónde se trabó» (B-50). */}
            <span className="flex flex-wrap items-center gap-x-1">Alto impacto · tendencia ({mesesAntes(inicio)} → con TRIM, desde el {fechaCorta(inicio)})
              <Info titulo="Tendencia histórica" texto={`Alto impacto por día desde que entró TRIM (${fechaCorta(inicio)}) contra los tres meses antes. Es una comparación histórica, no la fase Antes del retorno posible.`} />
            </span>
            <b className="tabular block text-[15px] text-[var(--tinta)]">{n0(altoAntes)} → {n0(altoDespues)} bbl/d · {altoAntes > 0 ? signo((altoDespues - altoAntes) / altoAntes) : '—'}</b>
          </p>
          {/* La misma comparación abierta por tramo, con las dos flechas (U2 §7.3). */}
          <AntesConTrimPorTramo campos={ids} desde={inicio} hasta={AHORA} />
          <div className="mt-2">
            {/* Sin órdenes no hay porcentaje: se dice, no se borra el bloque. */}
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <b className="tabular text-[18px] leading-none">{horas.porcentaje !== undefined ? `${n0(horas.porcentaje)} %` : 'sin dato'}</b>
              <span className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">mantenimiento proactivo
                <Info titulo="Mantenimiento proactivo" texto={`Horas preventivas o predictivas en SAP desde que entró TRIM (${fechaCorta(inicio)}). Si no sube, las fallas no bajan.`} />
              </span>
            </p>
            {horas.porcentaje !== undefined ? (
              <>
                <div className="mt-1 flex h-2 overflow-hidden rounded-sm border border-[var(--linea2)] bg-[var(--panel2)]" aria-hidden>
                  <i className="block h-full bg-[var(--dato-1)]" style={{ width: `${horas.porcentaje}%` }} />
                </div>
                <small className="tabular mt-0.5 block text-[13px] text-[var(--tinta2)]">{n1(horas.proactivo)} h proactivas · {n1(horas.correctivo)} h correctivas</small>
              </>
            ) : <small className="mt-0.5 block text-[13px] text-[var(--tinta2)]">sin órdenes en SAP desde {fechaCorta(inicio)}</small>}
          </div>
          <Tendencia serie={serie} porTramo={porTramo} desde={rango.desde} hasta={rango.hasta}
            onMes={m => setRango(diaIso(m.desde), diaIso(new Date(m.hasta.getTime() - 1)))} />
          <Lectura>
            Alto impacto: bombas de reinyección y electrosumergibles. La tendencia «3 meses previos → con TRIM»
            no es la fase Antes del retorno. «Por dónde se trabó» la abre por tramo, con lo que bajó y lo que
            subió. Mantenimiento proactivo: horas preventivas o predictivas en SAP; si no sube, las fallas no
            bajan. El mes a mes se puede ver por equipo o por dónde se trabó.
          </Lectura>
        </section>

        <section className="rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
          <h3 className={`${titulo} mb-2`}>Por equipo</h3>
          {top.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Nada diferido.</p>}
          {top.map(f => (
            <button key={`${f.campoId}${f.equipo}${f.tipo}`} onClick={() => abrir(f.campoId, f.equipo)}
              className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-baseline gap-3 border-b border-[var(--linea2)] py-2 text-left last:border-0 hover:bg-[var(--panel2)]">
              <span className="min-w-0">
                <b className="text-[15px]">{f.equipo}</b>
                <span className="text-[14px] text-[var(--tinta3)]">{ambito.global ? ` · ${campoPorId(f.campoId).nombre}` : ''}</span>
                <small className="block text-[13px] text-[var(--tinta2)]">{f.partes[0] ? NOMBRE_PARTE[f.partes[0].parte].toLowerCase() : TIPO_CAUSA[f.tipo].toLowerCase()}</small>
              </span>
              <span className="tabular text-right">
                <b className="block text-[15px] leading-tight">{n0(f.bbl)}</b>
                <small className="text-[12px] text-[var(--tinta3)]">bbl · {n0(lb.diferido ? (f.bbl / lb.diferido) * 100 : 0)} %</small>
              </span>
            </button>
          ))}
        </section>
      </div>

      {ambito.global
        ? <PorCampo lb={lb} campos={ids} desde={rango.desde} hasta={rango.hasta} onAbrir={abrir} onCampo={setCampo} />
        : <PanelDondeSeTrabo campos={ids} desde={rango.desde} hasta={rango.hasta} conPerdida />}
    </>
  )
}

/** Diferido por día de cada mes: lo de alto impacto oscuro, el resto claro,
 *  y sobre cada mes la raya de su máximo firmado (la meta puede cambiar de un
 *  mes a otro). Un clic en un mes lo abre. Con `porTramo`, la misma gráfica se
 *  puede ver «Por dónde se trabó» (U2 §7.4): cada barra apilada en los cuatro
 *  tramos, en grises, más lo sin identificar, rayado; la raya del máximo no cambia. */
export function Tendencia({ serie, desde, hasta, onMes, porTramo }: {
  serie: MesResumen[]; desde: Date; hasta: Date; onMes: (m: MesResumen) => void
  /** Lo perdido por tramo de cada mes (`useRepartoMensual`): los mismos meses y el mismo total del libro. */
  porTramo?: MesPorTramo[]
}) {
  const [vista, setVista] = useState<'equipo' | 'tramo'>('equipo')
  const idp = useId().replace(/:/g, '')
  const deMes = new Map((porTramo ?? []).map(t => [t.mes, t]))
  const porDonde = vista === 'tramo' && porTramo !== undefined
  // C5 · Se dibuja al ancho de verdad (una unidad = un px): sus rótulos no bajan de 12 px (X3 §5.5).
  const [medir, W] = useAnchoDibujo(420, 520)
  const G = { x0: 8, x1: W - 8, y0: 18, y1: 96 }
  const pts = serie.map(m => {
    const d = Math.max(1 / 24, (Math.min(m.hasta.getTime(), AHORA.getTime()) - m.desde.getTime()) / D)
    // Un mes con algún campo sin meta firmada no tiene máximo: sin raya ni marca.
    const max = conMeta(m.libro.meta) ? m.libro.meta.diferidoDia : undefined
    const t = deMes.get(m.mes)
    const tramos = CHOKES_Y_SIN_ASIGNAR.map(k => [k, (t?.porTramo[k] ?? 0) / d] as const)
    return { m, total: m.libro.diferido / d, alto: m.libro.altoImpacto / d, max, sobre: max !== undefined && !m.parcial && m.libro.diferido / d > max, tramos }
  })
  const techo = Math.max(1, ...pts.map(p => Math.max(p.total, p.max ?? 0))) * 1.1
  const Y = (v: number) => G.y1 - (v / techo) * (G.y1 - G.y0)
  const paso = (G.x1 - G.x0) / Math.max(1, pts.length)
  const ancho = paso * 0.6
  // La cifra de cada mes del período: con un mes, grande; con varios (doce meses, el año), lo que
  // quepa en su columna, para que dos vecinas no se monten (auditor, Firefox).
  const activos = pts.filter(p => p.m.desde < hasta && p.m.hasta > desde).length
  const letraCifra = activos > 1 ? Math.max(12, Math.min(14, paso / 3.5)) : 14
  return (
    <>
    {porTramo && (
      <div role="group" aria-label="Cómo se parte cada mes" className="no-imprimir mt-2 flex flex-wrap gap-1">
        {([['equipo', 'Por equipo'], ['tramo', 'Por dónde se trabó']] as const).map(([v, t]) => (
          <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista(v)}
            className={cn('min-h-6 cursor-pointer rounded-full border px-2.5 py-[2px] text-[13px]',
              vista === v ? 'border-[var(--primario)] bg-[var(--primario)] font-semibold text-[var(--primario-sobre)]' : 'border-[var(--linea2)] text-[var(--tinta2)] hover:bg-[var(--panel2)]')}>
            {t}
          </button>
        ))}
      </div>
    )}
    <div ref={medir} className="mt-2"><div ref={alFinal} className="overflow-x-auto">
      <svg width={W} height={118} viewBox={`0 0 ${W} 118`} className="block" role="group"
        aria-label={porDonde ? 'Diferido por día de cada mes, por dónde se trabó, contra su máximo firmado' : 'Diferido por día de cada mes contra su máximo firmado'}>
        <defs><PatronesTramo id={idp} /></defs>
        {pts.map((p, i) => {
          const x = G.x0 + paso * i + (paso - ancho) / 2
          const activo = p.m.desde < hasta && p.m.hasta > desde
          let base = 0
          const maximo: [string, string] = ['Máximo firmado', p.max === undefined ? textoSinMeta(p.m.libro.meta, p.m.libro.porCampo.length > 1) : `${n0(p.max)} bbl/d`]
          return (
            <Tip key={p.m.mes} as="g" titulo={p.m.nombre} pista="Clic para ver este mes"
              filas={porDonde
                ? [['Diferido', `${n0(p.total)} bbl/d`], ...p.tramos.filter(([, v]) => v >= 0.5).map(([k, v]) => [mayuscula(LARGO_TRAMO[k]), `${n0(v)} bbl/d`] as [string, string]), maximo]
                : [['Diferido', `${n0(p.total)} bbl/d`], ['De alto impacto', `${n0(p.alto)} bbl/d`], maximo]}
              onClick={() => onMes(p.m)}>
              <g className="cursor-pointer">
                <rect x={x - (paso - ancho) / 2} y={G.y0 - 16} width={paso} height={G.y1 - G.y0 + 36} fill="transparent" />
                {porDonde
                  // De abajo arriba en el orden de la tubería; lo sin identificar, rayado y encima.
                  ? p.tramos.map(([k, v]) => {
                    if (v <= 0) return null
                    const y1 = Y(base), y0 = Y(base + v)
                    base += v
                    const sin = k === 'sin-asignar'
                    return <rect key={k} x={x} y={y0} width={ancho} height={Math.max(0.5, y1 - y0)} fill={rellenoSvg(k, idp)}
                      stroke={sin ? 'var(--tinta3)' : 'var(--panel)'} strokeWidth={sin ? 0.8 : 0.6} strokeDasharray={sin ? '2 1.5' : undefined} />
                  })
                  : (
                    <>
                      <rect x={x} y={Y(p.total)} width={ancho} height={Math.max(0.5, G.y1 - Y(p.total))} fill="var(--dato-5)" />
                      <rect x={x} y={Y(p.alto)} width={ancho} height={Math.max(0.5, G.y1 - Y(p.alto))} fill="var(--dato-1)" />
                    </>
                  )}
                {/* El mes que se mira se marca con un borde y su cifra, no apagando a los demás. */}
                {activo && <rect x={x - 2} y={Y(p.total) - 2} width={ancho + 4} height={G.y1 - Y(p.total) + 2} fill="none" stroke="var(--tinta)" strokeWidth={1.2} />}
                {p.max !== undefined && <line x1={x - 3} x2={x + ancho + 3} y1={Y(p.max)} y2={Y(p.max)} stroke="var(--tinta)" strokeWidth={1.3} strokeDasharray="3 2" />}
                {p.sobre && <rect x={x + ancho / 2 - 3.5} y={Math.min(Y(p.total), Y(p.max ?? 0)) - 12} width={7} height={7} rx={0.8} fill="var(--p3)" stroke="var(--marca-trazo)" strokeWidth={1}><title>Pasó el máximo de diferido firmado</title></rect>}
                {activo && <text x={x + ancho / 2} y={Math.min(Y(p.total), Y(p.max ?? 0)) - (p.sobre ? 16 : 5)} fontSize={letraCifra} textAnchor="middle" fill="var(--tinta)" className="tabular">{n0(p.total)}</text>}
                <text x={x + ancho / 2} y={G.y1 + 14} fontSize={14.5} textAnchor="middle" fill={activo ? 'var(--tinta)' : 'var(--tinta2)'} fontWeight={activo ? 600 : 400} className="font-cond">{p.m.corto.toUpperCase()}</text>
              </g>
            </Tip>
          )
        })}
        <line x1={G.x0} x2={G.x1} y1={G.y1} y2={G.y1} stroke="var(--linea)" />
      </svg>
    </div></div>
      {/* La leyenda va fuera del desplazable: en el teléfono la gráfica arranca al final y la cortaba.
          La unidad va aquí y no en el dibujo: arriba a la izquierda la pisaba la cifra de la barra más alta. */}
      <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--tinta2)]">
        <span className="text-[var(--tinta3)]">bbl/d</span>
        {porDonde
          ? CHOKES_Y_SIN_ASIGNAR.map(k => <span key={k} className="inline-flex items-center gap-1.5"><Muestra k={k} />{LARGO_TRAMO[k]}</span>)
          : (
            <>
              <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-[var(--dato-1)]" />alto impacto</span>
              <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 bg-[var(--dato-5)]" />lo demás</span>
            </>
          )}
        <span className="inline-flex items-center gap-1.5"><svg width="16" height="6" aria-hidden><line x1="0" x2="16" y1="3" y2="3" stroke="var(--tinta)" strokeWidth="1.3" strokeDasharray="3 2" /></svg>máximo firmado</span>
        <span className="inline-flex items-center gap-1.5"><svg width="8" height="8" aria-hidden><rect x="0.5" y="0.5" width="7" height="7" rx="0.8" fill="var(--p3)" stroke="var(--marca-trazo)" strokeWidth={1} /></svg>pasó el máximo</span>
      </div>
    </>
  )
}
