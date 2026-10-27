import { useApp, useAmbito, useRango, useRol } from '@/app/store'
import { esServicio } from '@/shared/api/equipos'
import { useLibro, useBase, useRiesgo, usePreguntas, useCtx, contarPorIdentificar } from '@/shared/api/diferidos'
import { NOMBRE_PARTE } from '@/entities/partes'
import { TIPO_CAUSA } from '@/entities/causa-senal'
import { campoPorId } from '@/entities/campos'
import { conMeta, textoSinMeta } from '@/entities/libro'
import { fechaHora, AHORA } from '@/entities/reloj'
import type { Riesgo as FilaRiesgo } from '@/entities/diferido'
import { Panel, Boton, Chip } from '@/shared/ui/primitivas'
import { PanelSapMantenimiento } from '@/widgets/sap/PanelSapMantenimiento'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { BarraMeta } from '@/shared/ui/BarraMeta'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, plural } from '@/shared/lib/formato'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { Tarjeta } from '@/shared/ui/primitivas'
import { useCondiciones, type CondicionDeEquipo } from '@/shared/api/condiciones'
import { useCifrasDeUnNombre } from '@/shared/api/resultados'
import { programadoDe } from '@/entities/mantenimiento'
import { ApoyoPorIdentificar } from '@/shared/ui/PorIdentificar'
import { ParetoPartes, Palancas } from '@/widgets/diferidos/Paretos'
import { fmtHoras } from '@/widgets/bombas/comun'
import { costoHoy, colchonCorto, detalleCostoHoy, deFlota, siPara as siParaDe, siParaLargo } from '@/shared/ui/costoHoy'

/** Quien responde por que los barriles diferidos BAJEN. Su balanza aquí es en
 *  barriles y la mide el PLC: lo que se perdió en paradas programadas (estaban
 *  en el programa aprobado) contra lo que se perdió en fallas. Si la parte de
 *  fallas no baja, el número de arriba tampoco. */
export function Mantenimiento() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol(); const ctx = useCtx()
  const abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla), setCampo = useApp(s => s.setCampo)
  const ids = ambito.campos.map(c => c.id)
  const q = { campos: ids, desde: rango.desde, hasta: rango.hasta }
  const lb = useLibro(q)
  const base = useBase(q)
  const riesgo = useRiesgo(ids).filter(r => r.estado === 'en-riesgo').sort((a, b) => (a.horas ?? -1) - (b.horas ?? -1))
  const preguntas = usePreguntas(ids)
  // «Por identificar» con la cuenta única (la misma de Turno, Mi trabajo e
  // Identificar): las que piden respuesta; de esas, las que ya arrancaron.
  const pi = contarPorIdentificar(preguntas)
  const pendientes = preguntas.filter(p => p.pide && !p.arrancoSinIdentificar)
  // El panel de abajo es de lo que TODAVÍA no tiene causa. Una parada que arrancó
  // sin identificar y se respondió después sigue siendo no conforme, pero ya no
  // es «que nadie ha identificado»: se dice aparte.
  const sinIdentificar = [...pendientes, ...preguntas.filter(p => p.pide && p.arrancoSinIdentificar)]
  const respondidasTarde = preguntas.filter(p => !p.pide && p.arrancoSinIdentificar)
  // Lo de alto impacto ya excluye lo programado: es su propio tipo de causa.
  const fallasAlto = lb.altoImpacto
  // P-mant-1: lo programado contra lo que no, en una frase del motor (X4 §6.1), con enteros que suman.
  const programado = programadoDe(lb)
  // G-15: «Equipos que avisan» es UN conteo en todo el producto (NOMBRE_CIFRA): el de La planta viva y Riesgo.
  const avisan = useCifrasDeUnNombre(ids).avisan
  // H3: la marca de cada equipo es la de su condición en la franja, una sola en todas partes (X2 F2; X5 §6.4).
  const condicionDe = useCondiciones(ids)
  const proximas = ctx.config.programa
    .filter(p => ids.includes(p.campoId) && new Date(p.hasta) >= AHORA)
    .sort((a, b) => a.desde.localeCompare(b.desde))
  const irA = (p: string) => (rol.pantallas.includes(p) ? () => setPantalla(p) : undefined)
  const difDia = lb.brecha / Math.max(1 / 24, lb.meta.dias)
  const hayMeta = conMeta(lb.meta)
  const donde = (c: string) => (ambito.global ? ` · ${campoPorId(c).nombre}` : '')

  // Cinco a la vista y «ver N más»; lo de prioridad 1 nunca queda escondido, y
  // una parada que sigue sin identificar («no arrancar») tampoco.
  const listaRiesgo = useVerMas(riesgo, { prioridad: r => r.prioridad })
  const listaSin = useVerMas(sinIdentificar, { prioridad: p => (!p.fin && !p.arrancoSinIdentificar ? 1 : 3) })

  const filaRiesgo = (r: FilaRiesgo) => {
    // Las mismas cifras, en el mismo orden y con los mismos rótulos que la fila
    // de Riesgo: delante lo que se pierde por día si para; debajo, lo que
    // costaría que fallara hoy. Un servicio del campo que ya cayó a 0 bbl/d
    // cierra lo que esté produciendo. La regla de «servicio» es una sola (enAlarma.ts).
    const servicio = esServicio(r)
    // Un techo (K-101) se dice «hasta», como en Riesgo y en «Si falla hoy» (QA-R, vecino 1).
    const siPara = siParaDe(r, servicio)
    const detalle = detalleCostoHoy(r)
    return (
      <div key={`${r.campoId}${r.equipo}`} className="border-b border-[var(--linea2)] py-2 last:border-0">
        <Tip as="button" onClick={() => { setCampo(r.campoId); abrirEquipo(r.equipo, false) }}
          titulo={`${r.equipo} · ${TIPO_CAUSA[r.tipo]}`} pista={r.motivo}
          filas={[...(r.parte ? [['Parte', NOMBRE_PARTE[r.parte]] as [string, string]] : []),
            ['Cruza su límite', r.horas !== undefined ? `en ${fmtHoras(r.horas)}` : 'ya pasó el límite'],
            ...(r.tag ? [['Instrumento', r.tag] as [string, string]] : []),
            ['Si para', siParaLargo(r, servicio)],
            // D-2 · G-16: «Si falla hoy» es una tasa (bbl/d); lo que costaría la falla, en bbl, lleva su nombre.
            ...(r.costoFallaHoy !== undefined ? [['Le costaría la falla', `≈ ${n0(r.costoFallaHoy)} bbl`] as [string, string]] : [])]}
          className="flex w-full cursor-pointer items-start gap-2.5 text-left hover:bg-[var(--panel2)]">
          <MarcaDelEquipo c={condicionDe(r.campoId, r.equipo)} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <b className="text-[15px]">{r.equipo}{donde(r.campoId)}</b>
              <Chip>{TIPO_CAUSA[r.tipo].toLowerCase()}</Chip>
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--tinta2)]">
              {r.horas !== undefined
                ? <span>{r.parte ? `${NOMBRE_PARTE[r.parte].toLowerCase()} · ` : ''}cruza en {fmtHoras(r.horas)}</span>
                : <>{r.parte && <span>{NOMBRE_PARTE[r.parte].toLowerCase()}</span>}<Chip tono="fuerte">ya pasó el límite</Chip></>}
              {!r.parte && r.tag && <span className="font-cond text-[13px]">{r.tag}</span>}
            </span>
          </span>
          <span className={columna}>
            <b className="block text-[15px] leading-tight"><span className="sr-only">si para </span>{siPara}</b>
            <small className="block text-[12px] leading-snug text-[var(--tinta3)]">
              {costoHoy(r) ?? (servicio ? '' : 'sin historia')}
              {colchonCorto(r) && <span className="block">{colchonCorto(r)}</span>}
              {/* La misma marca que en Riesgo: estimado con la flota del campo. */}
              {deFlota(r, rol.nivel) && <span className="block">flota</span>}
            </small>
          </span>
        </Tip>
        {(r.accion || detalle) && (
          <div className="mt-0.5 flex flex-wrap gap-x-3 pl-[22px]">
            {r.accion && <Info rotulo="qué hacer" titulo={`Qué hacer · ${r.equipo}`} texto={r.accion} />}
            {detalle && <Info rotulo="costo de la falla" titulo={`Lo que costaría la falla · ${r.equipo}`} texto={detalle} />}
          </div>
        )}
      </div>
    )
  }

  const filaSin = (p: (typeof sinIdentificar)[number]) => (
    <div key={p.id} className="flex items-center gap-2.5 border-b border-[var(--linea2)] py-1.5 text-[14px] last:border-0" data-por-identificar={p.equipo}>
      {/* La marca es la del equipo (su condición en la franja), no la de la tarea: «sigue parado» o
          «arrancó sin identificar» lo dice la palabra de al lado (X5 §5.7). Sin condición, sin marca. */}
      <MarcaDelEquipo c={condicionDe(p.campoId, p.equipo)} />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
        <span><b>{p.equipo}</b><span className="text-[var(--tinta3)]">{donde(p.campoId)} · {fechaHora(p.inicio)}</span></span>
        <Chip tono={!p.fin && !p.arrancoSinIdentificar ? 'fuerte' : 'neutro'}>{p.arrancoSinIdentificar ? 'arrancó sin identificar' : !p.fin ? 'sigue parado' : 'por identificar'}</Chip>
      </span>
      {/* H2 (K1): el entero de la parada en el reparto del campo, el mismo de Hoy e Identificar (LC-08 = 108). */}
      <span className="tabular">{n0(p.entero ?? p.bbl)} bbl</span>
    </div>
  )

  const rotulo = 'block text-[13px] text-[var(--tinta3)]'
  const columna = 'tabular w-[96px] shrink-0 text-right'

  return (
    <>
      {/* Sin el bloque del ciclo arriba (X4 §3.7): lo simulado va en Resultados y los planes, como tarjetas de Hoy.
          La tarjeta de B (X5 §5.2) y las cifras en la escala de X5 §3.4: secundarias de 20 a 26 px. */}
      <Tarjeta className="mb-3 grid gap-x-6 gap-y-3 sm:mb-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]" data-cabeza-mantenimiento="">
        <span>
          <small className={rotulo}>Fallas de alto impacto</small>
          <b className="tabular block text-[26px] leading-none" data-fallas-alto={fallasAlto}>{n0(fallasAlto)}<small className="ml-1 text-[13px] font-normal text-[var(--tinta3)]">bbl</small></b>
          {/* Su desglose (parte vigilada, sin instrumento, sin identificar) está a la vista en «Dónde bajarlo». */}
        </span>
        {/* Sin meta firmada en algún campo no hay máximo: se dice, sin raya ni marca. G-10: «máximo», sin abreviar. */}
        <BarraMeta rotulo="diferido" valor={difDia} unidad="bbl/d" meta={hayMeta ? lb.meta.diferidoDia : undefined}
          rotuloMeta={hayMeta ? `máximo ${n0(lb.meta.diferidoDia)}` : textoSinMeta(lb.meta, ids.length > 1)} tipoMeta="máximo"
          fuera={hayMeta && difDia > lb.meta.diferidoDia}
          apoyo={base ? `antes ${n0(base.baseDia)} bbl/d (${base.nombre})` : undefined} />
        <span>
          <small className={rotulo}>Por identificar</small>
          {/* Un total no lleva marca de alarma (B-40): la urgencia la dice «no arrancar» en cada equipo. */}
          <b className="tabular flex items-center gap-1.5 text-[20px] leading-none">{pi.porIdentificar}</b>
          <ApoyoPorIdentificar pi={pi} />
        </span>
        {/* P-mant-1 (X4 §6.1): lo programado contra lo que no, en una frase; las cifras sueltas, en el globo y en el papel.
            El <div> deja la nota impresa del globo en la misma celda de la grilla. */}
        <div className="min-w-0 [grid-column:1/-1]"><Tip titulo="Programado y no programado"
          pista="Lo programado estaba en el programa de paradas aprobado; lo demás son fallas o restricciones. La mide el PLC."
          filas={[['Programado', `${n0(programado.programado)} bbl · ${programado.pct} %`], ['No programado (libro)', `${n0(programado.noProgramado)} bbl`],
            ['De alto impacto', `${n0(lb.altoImpacto)} bbl`], ['Con la parte vigilada', `${n0(lb.anticipable)} bbl`]]}
          imprimir="todo" className="block min-w-0">
          <p className="text-[16px] leading-[1.45] text-[var(--tinta)]" data-programado={programado.programado}>{programado.frase}</p>
        </Tip></div>
      </Tarjeta>

      <Lectura>
        El indicador de mantenimiento se mueve antes que el diferido: si las fallas de alto impacto se
        anticipan (la parte avisó y se intervino a tiempo), pasan a ser paradas programadas, más
        cortas y en la ventana que uno escoge. Diferido: el promedio por día contra el máximo firmado
        (la raya). Atacar ahora: primero lo que ya está fuera, luego lo que cruza antes su límite;
        toque o pase el cursor por una fila para ver el porqué.
      </Lectura>

      <div className="mt-3 grid items-start gap-3 sm:mt-4 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        <Panel titulo="Intervenir ya" extra={<span data-avisan={avisan}>{plural(avisan, 'equipo avisa', 'equipos avisan')}</span>}>
          {riesgo.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Ningún equipo avisa.</p>}
          {riesgo.length > 0 && (
            <div className="flex gap-3 pb-1 text-[12px] text-[var(--tinta3)]" aria-hidden>
              <span className="flex-1" /><span className={columna}>si para</span>
            </div>
          )}
          {listaRiesgo.visibles.map(filaRiesgo)}
          {listaRiesgo.resto.length > 0 && <div className="solo-impresion">{listaRiesgo.resto.map(filaRiesgo)}</div>}
          <VerMas ocultas={listaRiesgo.ocultas} abierto={listaRiesgo.abierto} onAlternar={listaRiesgo.alternar} />
        </Panel>

        {/* El diferido contra el máximo ya va en la cabecera: Palancas no lo repite. */}
        <Palancas lb={lb} base={base} conMaximo={false} />
      </div>

      <div className="mt-3 grid items-start gap-3 sm:mt-4 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        <ParetoPartes lb={lb} onIr={irA('confiabilidad') ?? irA('bombas')} />

        <Panel titulo="Programa de paradas" extra="firmado">
          <Lectura>
            Lo que está aquí cuenta como programado, no como falla. Se cambia en la configuración, con
            firma: así una falla no se puede volver programada después.
          </Lectura>
          {proximas.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Nada programado de aquí en adelante.</p>}
          {proximas.map(p => (
            <div key={p.id} className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--linea2)] py-1.5 text-[14px] last:border-0">
              <span className="min-w-0"><b>{p.equipo}</b>{ambito.global ? <span className="text-[var(--tinta3)]"> · {campoPorId(p.campoId).nombre}</span> : ''}
                <small className="block text-[13px] text-[var(--tinta2)]">{p.motivo}</small></span>
              <span className="tabular text-right text-[13px] text-[var(--tinta2)]">{fechaHora(new Date(p.desde))}<br />a {fechaHora(new Date(p.hasta))}</span>
            </div>
          ))}
        </Panel>
      </div>

      <PanelSapMantenimiento />

      {/* Los planes de acción ya no van en un acordeón aquí (X4 §3.6): quien decide los tiene como tarjetas de Hoy, y cada equipo en su ficha. */}

      {(sinIdentificar.length > 0 || respondidasTarde.length > 0) && (
        <Panel className="mt-3 sm:mt-4" titulo="Paradas por identificar">
          <Lectura>Sin la parte que falló no hay de qué aprender: el vigía no sabe qué mirar la próxima vez.</Lectura>
          {sinIdentificar.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Todas las paradas tienen causa.</p>}
          {listaSin.visibles.map(filaSin)}
          {listaSin.resto.length > 0 && <div className="solo-impresion">{listaSin.resto.map(filaSin)}</div>}
          <VerMas ocultas={listaSin.ocultas} abierto={listaSin.abierto} onAlternar={listaSin.alternar} />
          {respondidasTarde.length > 0 && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta3)]">
              {respondidasTarde.length} más, {respondidasTarde.length === 1 ? 'respondida' : 'respondidas'} después de arrancar
              <Info titulo="Respondidas después de arrancar" texto={`${plural(respondidasTarde.length, 'parada más arrancó', 'paradas más arrancaron')} sin identificar y se ${respondidasTarde.length === 1 ? 'respondió' : 'respondieron'} después de arrancar: ya ${respondidasTarde.length === 1 ? 'tiene' : 'tienen'} causa, pero ${respondidasTarde.length === 1 ? 'queda' : 'quedan'} como no ${respondidasTarde.length === 1 ? 'conformidad' : 'conformidades'} (en Identificar).`} />
            </p>
          )}
          {irA('causa') && sinIdentificar.length > 0 && <Boton variante="principal" className="mt-2 w-full" onClick={irA('causa')}>Ir a identificar</Boton>}
        </Panel>
      )}
    </>
  )
}

/** La marca de un equipo en una fila: la de su condición en la franja (rombo, triángulo,
 *  cuadrado, candado o círculo punteado), la misma en todas las pantallas. Sin condición, el
 *  hueco del mismo ancho, para que las filas no salten. */
function MarcaDelEquipo({ c }: { c: CondicionDeEquipo | undefined }) {
  return c ? <MarcaCondicion c={c} tamano={12} className="mt-[2px]" /> : <span aria-hidden className="inline-block w-3 shrink-0" />
}
