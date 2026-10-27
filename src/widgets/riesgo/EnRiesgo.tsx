import { useMemo } from 'react'
import { useAmbito, useRol } from '@/app/store'
import { esServicio } from '@/shared/api/equipos'
import { useRiesgo, useEstadoCampos } from '@/shared/api/diferidos'
import { useCriticidad, DONDE_CHOKE } from '@/shared/api/choke'
import { useCifrasDeUnNombre, NOMBRE_CIFRA } from '@/shared/api/resultados'
import { useFranja } from '@/shared/api/condiciones'
import { FAMILIA } from '@/shared/api/plantaViva'
import { SiFallaHoy, MarcaConPalabra } from '@/widgets/riesgo/SiFallaHoy'
import { condicionDe } from '@/widgets/riesgo/condicion'
import { ID_EN_RIESGO, irAlAncla } from '@/widgets/riesgo/ancla'
import { useIrA } from '@/widgets/equipos/navegar'
import type { TipoCausa } from '@/entities/causa-senal'
import { NOMBRE_PARTE } from '@/entities/partes'
import { ESTADO_PARTE } from '@/entities/salud'
import { campoPorId } from '@/entities/campos'
import { fechaHora } from '@/entities/reloj'
import type { Riesgo as FilaRiesgo } from '@/entities/diferido'
import { Panel, Chip, Tarjeta } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, n1, plural } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { costoHoy, colchonCorto, detalleCostoHoy, deFlota, siPara as siParaDe, siParaLargo, sumaSiPara } from '@/shared/ui/costoHoy'

/** K1 · P-10 (X4 §3.6, punto 2): lo que era la pantalla Riesgo del jefe de
 *  mantenimiento y de confiabilidad, fundido en Equipos, debajo de la lista. Nada
 *  se pierde (regla 4): lo que se deja de producir ahora y por qué; los equipos que
 *  avisan, con «cruza en», «si para», lo que les costaría la falla, el colchón
 *  («0 si vuelve antes de…»), «flota» y «qué hacer»; la exposición si fallan hoy y lo
 *  que está en juego; y «Si falla hoy» entero (dónde se trabaría, el colchón, una
 *  falla, ¿lo vigila TRIM?). Lo que cada rol decide con «Si falla hoy» (el próximo
 *  instrumento, no intervenir hoy, los trabajos del programa y «Cambió hoy») ya va
 *  arriba de Equipos: aquí no se repite.
 *
 *  Nada sale de una tabla: los eventos abiertos de los controladores, el vigía de
 *  cada bomba y de cada electrosumergible, y su historia de fallas. Cada equipo
 *  lleva UNA marca, la de su condición en la franja (H3; X2 F2), con su palabra al
 *  lado (H16); sin condición, sin marca (H17). */
export function EnRiesgo({ rol }: { rol: 'conf' | 'jefe' }) {
  const ambito = useAmbito(); const rolApp = useRol()
  const irA = useIrA()
  const ids = ambito.campos.map(c => c.id)
  const riesgo = useRiesgo(ids)
  // La marca de cada equipo es la de la franja: una sola condición por equipo en todo el producto (H3).
  const franja = useFranja(ids)
  const condicion = (r: Pick<FilaRiesgo, 'campoId' | 'equipo'>) => condicionDe(franja, r.campoId, r.equipo)
  // «Un nombre, una cifra» (X4 §1.3.3): el total que se deja de producir, los equipos que avisan y la exposición, con la regla del motor.
  const uno = useCifrasDeUnNombre(ids)
  const estados = useEstadoCampos(ids)
  // Dónde se trabaría cada equipo si falla: el tramo de la topología, el mismo de «Si falla hoy».
  const crit = useCriticidad(ids)
  const tramoDe = useMemo(() => new Map([...crit.ranking, ...crit.campos.flatMap(c => c.parados)].map(f => [`${f.campoId}|${f.equipo}`, f.tramo])), [crit])
  const perdiendo = riesgo.filter(r => r.estado === 'perdiendo')
  const enRiesgo = riesgo.filter(r => r.estado === 'en-riesgo').sort((a, b) => (a.horas ?? -1) - (b.horas ?? -1))
  const porDia = uno.ahoraBpd
  // Si alguna fila es un techo (K-101: «si cierran todos sus pozos»), la suma también: «hasta» (QA-R, vecino 1).
  const enJuego = sumaSiPara(enRiesgo)
  // La exposición: la suma de lo que costaría cada equipo si fallara HOY (`costoFalla`,
  // una sola cuenta para todas las familias: se puede sumar). No es que fallen todos a
  // la vez: es cuánto hay expuesto, equipo por equipo.
  const conCosto = enRiesgo.filter(r => r.costoFalla !== undefined)
  const costo = uno.exposicionBbl
  // Por qué falta la cifra, con su motivo real: nada en riesgo, servicios (lo que cuesta
  // su caída depende de cuánto dure) o equipos sin historia de fallas con que estimarla.
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
  // Lo que se ve debajo de la cifra: la exposición y sus salvedades, en corto. La frase completa (pieCosto) queda en el ⓘ y en el papel.
  const pieCorto = !enRiesgo.length ? 'nada en riesgo'
    : conCosto.length ? [`≈ ${n0(costo)} bbl de exposición si fallan hoy`, ...(sinHistoria.length ? [`${sinHistoria.length} sin historia`] : []),
      ...(servicios.length ? [`sin ${plural(servicios.length, 'servicio', 'servicios')}`] : [])].join(' · ')
    : !sinHistoria.length ? 'solo servicios del campo'
    : 'sin historia para estimar'
  const potencial = estados.reduce((a, e) => a + e.potencialBpd, 0)
  // Se abre el nivel 3 del equipo escogido, también si es una electrosumergible (con una entrada en el
  // historial: «atrás» vuelve a la lista de Equipos).
  const abrir = (r: Pick<FilaRiesgo, 'campoId' | 'equipo'>) => irA({ campoId: r.campoId, equipo: r.equipo })
  const donde = (c: string) => (ambito.global ? ` · ${campoPorId(c).nombre}` : '')

  const listaPerdiendo = useVerMas(perdiendo, { prioridad: r => (r.altoImpacto ? 1 : 2) })
  const listaRiesgo = useVerMas(enRiesgo, { prioridad: r => r.prioridad })
  // En el teléfono las dos columnas ceden ancho: con la letra de B, la píldora del tipo no cabía al lado (390 px).
  const columna = 'tabular w-[78px] shrink-0 text-right sm:w-[96px]'

  const filaPerdiendo = (r: FilaRiesgo) => (
    <Tip key={`${r.campoId}${r.equipo}${r.tipo}`} as="button" onClick={() => abrir(r)}
      titulo={`${r.equipo} · ${FAMILIA[r.tipo]}`} pista={r.motivo}
      // Lo que escribió una persona va en la pantalla; en el papel, quién lo contestó, por su rol (D2).
      pistaEnPapel={r.declaradoPor ? `Lo contestó ${r.declaradoPor}` : undefined}
      filas={[['Pozos parados', String(r.pozos)], [`Por ${r.equipo} se dejan de producir`, `${n0(r.bblDia)} bbl/d`], ['Por hora', `${n0(r.bblDia / 24)} bbl/h`],
        ...(r.desde ? [['Desde', fechaHora(r.desde)] as [string, string]] : []),
        ...(r.cierreDesde && r.desde && r.cierreDesde.getTime() - r.desde.getTime() > 60_000 ? [['Pozos cerrados desde', fechaHora(r.cierreDesde)] as [string, string]] : []),
        ]}
      imprimir="todo" claseImpresion="border-b border-[var(--linea2)] pb-1.5 last:border-0"
      className="flex w-full cursor-pointer items-center gap-3 border-b border-[var(--linea2)] py-2.5 text-left last:border-0 hover:bg-[var(--panel2)] print:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2">
          <MarcaConPalabra c={condicion(r)} equipo={r.equipo} />
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
    const tramo = tramoDe.get(`${r.campoId}|${r.equipo}`)
    const siPara = siParaDe(r, servicio)
    const detalle = detalleCostoHoy(r)
    return (
      <div key={`${r.campoId}${r.equipo}`} className="border-b border-[var(--linea2)] py-2.5 last:border-0" data-fila-riesgo={r.equipo}>
        <Tip as="button" onClick={() => abrir(r)} titulo={`${r.equipo} · ${FAMILIA[r.tipo]}`}
          pista={r.motivo} imprimir="pista"
          filas={[...(r.parte ? [['Parte', NOMBRE_PARTE[r.parte]] as [string, string]] : []),
            ['Cruza su límite', r.horas !== undefined ? `en ${fmtHoras(r.horas)}${r.rango && entre(r.rango) ? ` (${entre(r.rango)})` : ''}` : 'ya pasó el límite'],
            ['Si para', siParaLargo(r, servicio)],
            // D-2: «Si falla hoy» es una tasa (bbl/d); el costo de una falla, en bbl, lleva su nombre.
            ...(r.costoFalla !== undefined ? [['Le costaría la falla', `≈ ${n0(r.costoFalla)} bbl`] as [string, string]] : [])]}
          className="flex w-full cursor-pointer items-center gap-2 text-left hover:bg-[var(--panel2)] sm:gap-3">
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2">
              <MarcaConPalabra c={condicion(r)} equipo={r.equipo} />
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
            {/* Se decide por lo que es el equipo, no por si es de alto impacto: la multifásica no es de alto
                impacto, pero cierra solo sus pozos y lleva su «si falla hoy», que también entra en la exposición. */}
            <b className="block text-[15px] leading-tight"><span className="sr-only">si para </span>{siPara}</b>
            <small className="block text-[12px] leading-snug text-[var(--tinta3)]">
              {costoHoy(r) ?? (servicio ? '' : 'sin historia')}
              {/* Con tanque: una reparación más corta que el colchón de hoy no cuesta crudo. */}
              {colchonCorto(r) && <span className="block">{colchonCorto(r)}</span>}
              {/* Estimado con el promedio de su flota (el equipo nunca ha fallado): vale menos que la historia propia. */}
              {deFlota(r, rolApp.nivel) && <span className="block">flota</span>}
            </small>
          </span>
        </Tip>
        {(r.accion || detalle) && (
          <div className="mt-1 flex flex-wrap gap-x-3">
            {r.accion && <Info rotulo="qué hacer" titulo={`Qué hacer · ${r.equipo}`} texto={r.accion} />}
            {detalle && <Info rotulo="la falla" titulo={`Le costaría la falla · ${r.equipo}`} texto={detalle} />}
          </div>
        )}
      </div>
    )
  }

  return (
    <section id={ID_EN_RIESGO} tabIndex={-1} aria-labelledby={`${ID_EN_RIESGO}-titulo`} data-riesgo="" className="grid scroll-mt-4 gap-3 outline-none sm:gap-4">
      {/* Lo que era la cabecera de Riesgo (X4 §3.6): sin el bloque del ciclo arriba; lo simulado vive en La planta viva y en Resultados. */}
      <Tarjeta className="grid gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <h2 id={`${ID_EN_RIESGO}-titulo`} className="text-[16px] font-semibold leading-snug text-[var(--tinta)] [grid-column:1/-1]">Qué está en riesgo</h2>
        <span data-se-deja-de-producir={porDia}>
          <small className="block text-[14px] text-[var(--tinta2)]">{NOMBRE_CIFRA.ahora}</small>
          {/* Un total no lleva marca de alarma: la lleva el equipo que lo causa (B-40). Cifra secundaria: 26 px (X5 §3.4). */}
          <b className="tabular flex items-center gap-1.5 text-[26px] font-bold leading-none">
            {n0(porDia)}<small className="text-[14px] font-normal text-[var(--tinta3)]">bbl/d</small>
          </b>
          <small className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">
            {n1(potencial ? (porDia / potencial) * 100 : 0)} % del potencial · {plural(perdiendo.reduce((a, r) => a + r.pozos, 0), 'pozo parado', 'pozos parados')}
            {perdiendo[0] && <span className="inline-flex items-center gap-1"> · <MarcaConPalabra c={condicion(perdiendo[0])} equipo={perdiendo[0].equipo} conPalabra={false} />{perdiendo[0].equipo}</span>}
          </small>
        </span>
        <span data-avisan={uno.avisan}>
          {/* Antes es un conteo y un nombre (X4 §4.4, regla 3); lo que está en juego y la exposición van debajo, con su nombre. */}
          <small className="block text-[14px] text-[var(--tinta2)]">{NOMBRE_CIFRA.avisan}</small>
          <b className="tabular block text-[26px] font-bold leading-none">{uno.avisan}</b>
          <small className="block text-[13px] text-[var(--tinta2)] tabular-nums" data-en-juego>si paran, {enJuego.techo ? 'hasta ' : ''}{n0(enJuego.bblDia)} bbl/d en juego</small>
          <small className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]" data-exposicion>
            {pieCorto}{enRiesgo.length > 0 && <Info titulo={NOMBRE_CIFRA.exposicion} texto={pieCosto} />}
          </small>
        </span>
        <span data-mas-cercano>
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
      </Tarjeta>

      <Lectura>
        <b>Se deja de producir ahora</b> es el crudo de todos los pozos que están apagados en este momento, cada
        uno cargado al equipo que lo apagó. <b>Los equipos que avisan</b> son las bombas de la línea y las
        electrosumergibles que producen pero tienen una parte que avisa: lo que se dejaría de producir por día si
        paran, y lo que les costaría una falla con el tiempo fuera que suelen tener (la exposición si fallan hoy lo suma: es un estimado, no el retorno simulado del ciclo).
        {' '}La lista va ordenada por cuándo cruza su límite: primero lo que ya está fuera. El ⓘ «la
        falla» de cada fila dice de dónde sale lo que costaría («flota»: el equipo nunca ha fallado y se
        estimó con su flota en el campo). Un servicio del campo no lleva esa cifra: lo que cuesta su caída
        depende de cuánto dure.
      </Lectura>

      {/* P-riesgo-1: el reparto de la cifra de arriba se llama «Por qué» (no repite su rótulo, G-1). */}
      <Panel titulo="Por qué" extra={perdiendo.length ? plural(perdiendo.length, 'causa', 'causas') : 'nada'}>
        {perdiendo.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Todos los pozos produciendo.</p>}
        {listaPerdiendo.visibles.map(filaPerdiendo)}
        {listaPerdiendo.resto.length > 0 && <div className="solo-impresion">{listaPerdiendo.resto.map(filaPerdiendo)}</div>}
        <VerMas ocultas={listaPerdiendo.ocultas} abierto={listaPerdiendo.abierto} onAlternar={listaPerdiendo.alternar} />
      </Panel>

      <Panel titulo="Equipos que avisan"
        extra={
          // Al lado, en la misma vista: lleva a la lista completa de «Si falla hoy» y le pasa el foco.
          <button type="button" className="no-imprimir min-h-6 cursor-pointer tracking-normal underline decoration-dotted underline-offset-2 hover:text-[var(--tinta)]"
            onClick={() => irAlAncla('si-falla-hoy')}>
            ver «Si falla hoy»
          </button>
        }>
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

      {/* Lo que cada rol decide con la lista (el próximo instrumento, no intervenir hoy, los trabajos del
          programa) y «Cambió hoy» ya van arriba de Equipos: aquí no se repiten. Al jefe, «Cambió hoy» va en su
          línea; a confiabilidad se lo dicen su cabeza («hoy valen más») y cada fila («sube porque…»; F3 · P-02). */}
      <SiFallaHoy campos={ids} global={ambito.global} rol={rol} sinDecisiones sinCambioHoy
        onAbrir={(c, eq) => abrir({ campoId: c, equipo: eq })} />
    </section>
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

/** La familia en palabras de campo, la misma en todo el producto (P-09): P-201B es «bomba de agua». */
const etiqueta = (t: TipoCausa) => FAMILIA[t]
