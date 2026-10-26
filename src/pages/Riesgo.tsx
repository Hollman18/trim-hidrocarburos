import { useMemo } from 'react'
import { useApp, useAmbito, useRol, useRango } from '@/app/store'
import { esServicio } from '@/shared/api/equipos'
import { useRiesgo, useEstadoCampos } from '@/shared/api/diferidos'
import { useCriticidad, DONDE_CHOKE } from '@/shared/api/choke'
import { useCiclo } from '@/shared/api/ciclo'
import { CicloCifras } from '@/widgets/ciclo/Ciclo'
import { SiFallaHoy } from '@/widgets/riesgo/SiFallaHoy'
import { TIPO_CAUSA, type TipoCausa } from '@/entities/causa-senal'
import { NOMBRE_PARTE } from '@/entities/partes'
import { ESTADO_PARTE } from '@/entities/salud'
import { campoPorId } from '@/entities/campos'
import { fechaHora } from '@/entities/reloj'
import type { Riesgo as FilaRiesgo } from '@/entities/diferido'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, n1, plural } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { costoHoy, colchonCorto, detalleCostoHoy, deFlota, siPara as siParaDe, siParaLargo, sumaSiPara } from '@/shared/ui/costoHoy'

/** Qué está en riesgo: lo que se está perdiendo ahora y lo que se va a perder
 *  si no se actúa, por equipo, con su horizonte y lo que cuesta. Nada sale de
 *  una tabla: los eventos abiertos de los controladores, el vigía de cada
 *  bomba y de cada electrosumergible, y su historia de fallas.
 *
 *  Para el jefe de mantenimiento y confiabilidad, además, «Si falla hoy»
 *  (U2 §6): todos los equipos del campo por lo que le quitarían si fallaran
 *  hoy, y en cada fila de «En riesgo», dónde se trabaría. El gerente no ve la
 *  lista (U2 §3.1): ve los equipos en riesgo. */
export function Riesgo() {
  const ambito = useAmbito(); const rol = useRol(); const rango = useRango()
  const abrirEquipo = useApp(s => s.abrirEquipo), setCampo = useApp(s => s.setCampo), setPantalla = useApp(s => s.setPantalla)
  const ids = ambito.campos.map(c => c.id)
  const riesgo = useRiesgo(ids)
  const ciclo = useCiclo(ids, rango.desde, rango.hasta)
  const estados = useEstadoCampos(ids)
  const ingenieria = rol.nivel === 'ingenieria'
  // Dónde se trabaría cada equipo si falla: el tramo de la topología, el mismo de «Si falla hoy».
  const crit = useCriticidad(ingenieria ? ids : [])
  const tramoDe = useMemo(() => new Map([...crit.ranking, ...crit.campos.flatMap(c => c.parados)].map(f => [`${f.campoId}|${f.equipo}`, f.tramo])), [crit])
  const perdiendo = riesgo.filter(r => r.estado === 'perdiendo')
  const enRiesgo = riesgo.filter(r => r.estado === 'en-riesgo').sort((a, b) => (a.horas ?? -1) - (b.horas ?? -1))
  const porDia = perdiendo.reduce((a, r) => a + r.bblDia, 0)
  // Si alguna fila es un techo (K-101: «si cierran todos sus pozos»), la suma también: «hasta» (QA-R, vecino 1).
  const enJuego = sumaSiPara(enRiesgo)
  // La exposición: la suma de lo que costaría cada equipo si fallara HOY
  // (`costoFalla`, una sola cuenta para todas las familias: se puede sumar).
  // Es exactamente la suma de lo que dicen las filas. No es que fallen todos
  // a la vez: es cuánto hay expuesto, equipo por equipo.
  const conCosto = enRiesgo.filter(r => r.costoFalla !== undefined)
  const costo = conCosto.reduce((a, r) => a + r.costoFalla!, 0)
  // Por qué falta la cifra, con su motivo real: nada en riesgo, servicios (lo
  // que cuesta su caída depende de cuánto dure) o equipos sin historia de
  // fallas con que estimarla.
  const servicios = enRiesgo.filter(r => r.costoFalla === undefined && esServicio(r))
  const sinHistoria = enRiesgo.filter(r => r.costoFalla === undefined && !esServicio(r))
  const aparte = [
    ...(sinHistoria.length ? [`${plural(sinHistoria.length, 'equipo', 'equipos')} sin historia para estimar`] : []),
    ...(servicios.length ? [`sin contar ${plural(servicios.length, 'servicio del campo', 'servicios del campo')}`] : []),
  ]
  const pieCosto = !enRiesgo.length ? 'nada en riesgo'
    : conCosto.length ? ['suma de lo que costaría cada equipo si fallara hoy, uno por uno', ...aparte]
      .map(t => t.charAt(0).toUpperCase() + t.slice(1)).join('. ') + '.'
    : !sinHistoria.length ? 'Son servicios del campo: lo que cuesta su caída depende de cuánto dure.'
    : 'Sin historia de fallas para estimar lo que costaría una.'
  // Lo que se ve debajo de la cifra: la exposición y sus salvedades, en corto.
  // La frase completa (pieCosto) queda en el ⓘ y en el papel.
  const pieCorto = !enRiesgo.length ? 'nada en riesgo'
    : conCosto.length ? [`≈ ${n0(costo)} bbl de exposición`, ...(sinHistoria.length ? [`${sinHistoria.length} sin historia`] : []),
      ...(servicios.length ? [`sin ${plural(servicios.length, 'servicio', 'servicios')}`] : [])].join(' · ')
    : !sinHistoria.length ? 'solo servicios del campo'
    : 'sin historia para estimar'
  const potencial = estados.reduce((a, e) => a + e.potencialBpd, 0)
  // Se abre la ficha del equipo que se escogió, también si es una
  // electrosumergible: llevar a la pantalla de la flota la dejaba en la lista
  // completa, sin el pozo (cambiar de pantalla cierra lo abierto).
  const abrir = (r: FilaRiesgo) => { setCampo(r.campoId); abrirEquipo(r.equipo, false) }
  const donde = (c: string) => (ambito.global ? ` · ${campoPorId(c).nombre}` : '')
  const directivo = rol.nivel === 'decision'

  const listaPerdiendo = useVerMas(perdiendo, { prioridad: r => (r.altoImpacto ? 1 : 2) })
  const listaRiesgo = useVerMas(enRiesgo, { prioridad: r => r.prioridad })
  // En el teléfono las dos columnas ceden ancho: con la letra de B, la píldora del tipo no cabía al lado (390 px).
  const columna = 'tabular w-[78px] shrink-0 text-right sm:w-[96px]'

  const filaPerdiendo = (r: FilaRiesgo) => (
    <Tip key={`${r.campoId}${r.equipo}${r.tipo}`} as="button" onClick={() => abrir(r)}
      titulo={`${r.equipo} · ${TIPO_CAUSA[r.tipo]}`} pista={r.motivo}
      // Lo que escribió una persona va en la pantalla; en el papel, quién lo contestó, por su rol (D2).
      pistaEnPapel={r.declaradoPor ? `Lo contestó ${r.declaradoPor}` : undefined}
      filas={[['Pozos parados', String(r.pozos)], ['Perdiéndose', `${n0(r.bblDia)} bbl/d`], ['Por hora', `${n0(r.bblDia / 24)} bbl/h`],
        ...(r.desde ? [['Desde', fechaHora(r.desde)] as [string, string]] : []),
        ...(r.cierreDesde && r.desde && r.cierreDesde.getTime() - r.desde.getTime() > 60_000 ? [['Pozos cerrados desde', fechaHora(r.cierreDesde)] as [string, string]] : []),
        ...(directivo && potencial ? [['Del potencial', `${n1((r.bblDia / potencial) * 100)} %`] as [string, string]] : [])]}
      imprimir="todo" claseImpresion="border-b border-[var(--linea2)] pb-1.5 last:border-0"
      className="flex w-full cursor-pointer items-center gap-3 border-b border-[var(--linea2)] py-2.5 text-left last:border-0 hover:bg-[var(--panel2)] print:border-b-0">
      <MarcaPrioridad s={r.altoImpacto ? 1 : 2} tamano={13} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <b className="text-[15px]">{r.equipo}{donde(r.campoId)}</b>
          <Chip tono={r.altoImpacto ? 'fuerte' : 'neutro'}>{etiqueta(r.tipo)}</Chip>
          {r.parte && <span className="text-[13px] text-[var(--tinta2)]">{NOMBRE_PARTE[r.parte].toLowerCase()}</span>}
        </span>
        {r.desde && <small className="block truncate text-[13px] text-[var(--tinta3)]">desde {fechaHora(r.desde)}</small>}
      </span>
      <span className="tabular w-[88px] shrink-0 text-right">
        <b className="block text-[15px] leading-tight">{n0(r.bblDia)}</b>
        <small className="text-[12px] text-[var(--tinta3)]">bbl/d · {plural(r.pozos, 'pozo', 'pozos')}</small>
      </span>
    </Tip>
  )

  const filaRiesgo = (r: FilaRiesgo) => {
    const servicio = esServicio(r)
    const tramo = ingenieria ? tramoDe.get(`${r.campoId}|${r.equipo}`) : undefined
    const siPara = siParaDe(r, servicio)
    const detalle = detalleCostoHoy(r)
    return (
      <div key={`${r.campoId}${r.equipo}`} className="border-b border-[var(--linea2)] py-2.5 last:border-0">
        <Tip as="button" onClick={() => abrir(r)} titulo={`${r.equipo} · ${TIPO_CAUSA[r.tipo]}`}
          pista={r.motivo} imprimir="pista"
          filas={[...(r.parte ? [['Parte', NOMBRE_PARTE[r.parte]] as [string, string]] : []),
            ['Cruza su límite', r.horas !== undefined ? `en ${fmtHoras(r.horas)}${r.rango && entre(r.rango) ? ` (${entre(r.rango)})` : ''}` : 'ya pasó el límite'],
            ['Si para', siParaLargo(r, servicio)],
            ...(r.costoFalla !== undefined ? [['Si falla hoy', `≈ ${n0(r.costoFalla)} bbl`] as [string, string]] : [])]}
          className="flex w-full cursor-pointer items-center gap-2 text-left hover:bg-[var(--panel2)] sm:gap-3">
          <MarcaPrioridad s={r.prioridad} tamano={14} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <b className="text-[15px]">{r.equipo}{donde(r.campoId)}</b>
              <Chip>{etiqueta(r.tipo)}</Chip>
            </span>
            {r.parte && (
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--tinta2)]">
                {NOMBRE_PARTE[r.parte].toLowerCase()}
                {r.estadoParte && <Chip tono={r.estadoParte === 'fuera' ? 'fuerte' : 'neutro'}>{ESTADO_PARTE[r.estadoParte]}</Chip>}
              </span>
            )}
            {tramo && <small className="block text-[13px] text-[var(--tinta3)]" data-se-trabaria={tramo}>se trabaría {DONDE_CHOKE[tramo]}</small>}
          </span>
          <span className={columna}>
            <b className="block text-[15px] leading-tight"><span className="sr-only">cruza en </span>{r.horas !== undefined ? fmtHoras(r.horas) : 'ya pasó el límite'}</b>
            {r.rango && <small className="text-[12px] text-[var(--tinta3)]">{entre(r.rango)}</small>}
          </span>
          <span className={columna}>
            {/* Se decide por lo que es el equipo, no por si es de alto impacto: la
                multifásica no es de alto impacto, pero cierra solo sus pozos y
                lleva su «si falla hoy», que también entra en la exposición. */}
            <b className="block text-[15px] leading-tight"><span className="sr-only">si para </span>{siPara}</b>
            <small className="block text-[12px] leading-snug text-[var(--tinta3)]">
              {costoHoy(r) ?? (servicio ? '' : 'sin historia')}
              {/* Con tanque: una reparación más corta que el colchón de hoy no cuesta crudo. */}
              {colchonCorto(r) && <span className="block">{colchonCorto(r)}</span>}
              {/* Estimado con el promedio de su flota (el equipo nunca ha fallado): vale menos que la historia propia. */}
              {deFlota(r, rol.nivel) && <span className="block">flota</span>}
            </small>
          </span>
        </Tip>
        {((!directivo && r.accion) || detalle) && (
          <div className="mt-1 flex flex-wrap gap-x-3 pl-[25px]">
            {!directivo && r.accion && <Info rotulo="qué hacer" titulo={`Qué hacer · ${r.equipo}`} texto={r.accion} />}
            {detalle && <Info rotulo="si falla hoy" titulo={`Si falla hoy · ${r.equipo}`} texto={detalle} />}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <CicloCifras ciclo={ciclo} onIr={p => setPantalla(p)} />
      <div className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <span>
          <small className="block text-[13px] text-[var(--tinta3)]">2 · Durante</small>
          {/* Un total no lleva marca de alarma: la lleva el equipo que lo causa (B-40). */}
          <b className="tabular flex items-center gap-1.5 text-[30px] leading-none">
            {n0(porDia)}<small className="text-[14px] font-normal text-[var(--tinta3)]">bbl/d</small>
          </b>
          <small className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">
            {n1(potencial ? (porDia / potencial) * 100 : 0)} % del potencial · {plural(perdiendo.reduce((a, r) => a + r.pozos, 0), 'pozo parado', 'pozos parados')}
            {perdiendo[0] && <span className="inline-flex items-center gap-1"> · <MarcaPrioridad s={perdiendo[0].altoImpacto ? 1 : 2} tamano={11} />{perdiendo[0].equipo}</span>}
          </small>
        </span>
        <span>
          <small className="block text-[13px] text-[var(--tinta3)]">1 · Antes · {plural(enRiesgo.length, 'equipo', 'equipos')}</small>
          <b className="tabular block text-[22px] leading-tight" data-en-juego>{enJuego.techo && <small className="text-[15px] font-normal">hasta </small>}{n0(enJuego.bblDia)} <small className="text-[13px] font-normal text-[var(--tinta3)]">bbl/d en juego</small></b>
          <small className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">
            {pieCorto}{enRiesgo.length > 0 && <Info titulo="Exposición" texto={pieCosto} />}
          </small>
        </span>
        <span>
          <small className="block text-[13px] text-[var(--tinta3)]">El más cercano</small>
          {enRiesgo[0] ? (
            <>
              <b className="block truncate text-[15px] leading-tight">{enRiesgo[0].equipo}{donde(enRiesgo[0].campoId)}</b>
              <small className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--tinta2)]">
                {enRiesgo[0].parte && <span>{NOMBRE_PARTE[enRiesgo[0].parte]}</span>}
                {enRiesgo[0].horas !== undefined ? <span>cruza en {fmtHoras(enRiesgo[0].horas)}</span> : <Chip tono="fuerte">ya pasó el límite</Chip>}
              </small>
            </>
          ) : <b className="block text-[15px] text-[var(--tinta3)]">ninguno</b>}
        </span>
      </div>

      <Lectura>
        <b>Perdiéndose ahora</b> es el crudo de los pozos que están apagados en este momento, cada
        uno cargado al equipo que lo apagó. <b>En riesgo</b> son las bombas de la línea y las
        electrosumergibles que producen pero tienen una parte que avisa: lo que se perdería por día si
        paran, y lo que costaría que fallaran hoy con el tiempo fuera que suelen tener (la exposición lo suma).
        {directivo && ' En puntos del potencial: lo perdido sobre el potencial del campo.'}
        {' '}La lista va ordenada por cuándo cruza su límite: primero lo que ya está fuera. El ⓘ «si falla
        hoy» de cada fila dice de dónde sale la cifra («flota»: el equipo nunca ha fallado y se estimó
        con su flota en el campo). Un servicio del campo no lleva esa cifra: lo que cuesta su caída
        depende de cuánto dure.
      </Lectura>

      <Panel className="mt-2.5" titulo="PERDIÉNDOSE AHORA" extra={perdiendo.length ? plural(perdiendo.length, 'causa', 'causas') : 'nada'}>
        {perdiendo.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Todos los pozos produciendo.</p>}
        {listaPerdiendo.visibles.map(filaPerdiendo)}
        {listaPerdiendo.resto.length > 0 && <div className="solo-impresion">{listaPerdiendo.resto.map(filaPerdiendo)}</div>}
        <VerMas ocultas={listaPerdiendo.ocultas} abierto={listaPerdiendo.abierto} onAlternar={listaPerdiendo.alternar} />
      </Panel>

      <Panel className="mt-2.5" titulo="EN RIESGO"
        extra={ingenieria && (
          // Al lado, en la misma pantalla: lleva a la lista completa y le pasa el foco.
          <button type="button" className="no-imprimir min-h-6 cursor-pointer tracking-normal underline decoration-dotted underline-offset-2 hover:text-[var(--tinta)]"
            onClick={() => { const e = document.getElementById('si-falla-hoy'); e?.scrollIntoView({ behavior: 'smooth', block: 'start' }); e?.focus({ preventScroll: true }) }}>
            ver «Si falla hoy»
          </button>
        )}>
        {enRiesgo.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Ningún equipo avisa.</p>}
        {enRiesgo.length > 0 && (
          <div className="flex gap-2 pb-1 text-[12px] text-[var(--tinta3)] sm:gap-3" aria-hidden>
            <span className="flex-1" /><span className={columna}>cruza en</span><span className={columna}>si para</span>
          </div>
        )}
        {listaRiesgo.visibles.map(filaRiesgo)}
        {listaRiesgo.resto.length > 0 && <div className="solo-impresion">{listaRiesgo.resto.map(filaRiesgo)}</div>}
        <VerMas ocultas={listaRiesgo.ocultas} abierto={listaRiesgo.abierto} onAlternar={listaRiesgo.alternar} />
      </Panel>

      {ingenieria && (
        <SiFallaHoy campos={ids} global={ambito.global} rol={rol.id === 'conf' ? 'conf' : rol.id === 'jefe' ? 'jefe' : 'otro'}
          onAbrir={(c, eq) => { setCampo(c); abrirEquipo(eq, false) }} />
      )}
    </>
  )
}

/** «41–45 h»: el rango del pronóstico en corto (si los dos extremos se escriben
 *  igual, ya lo dice la cifra de arriba). */
function entre([a, b]: [number, number]) {
  const x = fmtHoras(a), y = fmtHoras(b)
  if (x === y) return ''
  const unidad = (t: string) => t.split(' ').at(-1)
  return unidad(x) === unidad(y) ? `${x.replace(/ \S+$/, '')}–${y}` : `${x}–${y}`
}

const etiqueta = (t: TipoCausa) => TIPO_CAUSA[t].toLowerCase()

