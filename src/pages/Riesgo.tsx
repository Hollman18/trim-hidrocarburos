import { useApp, useAmbito, useRol } from '@/app/store'
import { useRiesgo, useEstadoCampos } from '@/shared/api/diferidos'
import { TIPO_CAUSA, type TipoCausa } from '@/entities/causa-senal'
import { NOMBRE_PARTE } from '@/entities/partes'
import { ESTADO_PARTE } from '@/entities/salud'
import { campoPorId } from '@/entities/campos'
import { esBombaDeLinea } from '@/shared/api/equipos'
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

/** Qué está en riesgo: lo que se está perdiendo ahora y lo que se va a perder
 *  si no se actúa, por equipo, con su horizonte y lo que cuesta. Nada sale de
 *  una tabla: los eventos abiertos de los controladores, el vigía de cada
 *  bomba y de cada electrosumergible, y su historia de fallas. */
export function Riesgo() {
  const ambito = useAmbito(); const rol = useRol()
  const abrirEquipo = useApp(s => s.abrirEquipo), setCampo = useApp(s => s.setCampo)
  const ids = ambito.campos.map(c => c.id)
  const riesgo = useRiesgo(ids)
  const estados = useEstadoCampos(ids)
  const perdiendo = riesgo.filter(r => r.estado === 'perdiendo')
  const enRiesgo = riesgo.filter(r => r.estado === 'en-riesgo').sort((a, b) => (a.horas ?? -1) - (b.horas ?? -1))
  const porDia = perdiendo.reduce((a, r) => a + r.bblDia, 0)
  const enJuego = enRiesgo.reduce((a, r) => a + r.bblDia, 0)
  // El costo por falla de la cabecera es exactamente la suma de lo que dicen
  // las filas: cada fila con `costoFalla` lo muestra, sea o no de alto impacto.
  const costo = enRiesgo.reduce((a, r) => a + (r.costoFalla ?? 0), 0)
  // Por qué falta la cifra, con su motivo real: nada en riesgo, servicios (no
  // llevan costo por falla: lo que cuesta su caída depende de cuánto dure) o
  // equipos sin historia de fallas con que estimarla.
  const servicios = enRiesgo.filter(r => r.costoFalla === undefined && esServicio(r))
  const sinHistoria = enRiesgo.filter(r => r.costoFalla === undefined && !esServicio(r))
  const aparte = [
    ...(sinHistoria.length ? [`${plural(sinHistoria.length, 'equipo', 'equipos')} sin historia para estimar`] : []),
    ...(servicios.length ? [`sin contar ${plural(servicios.length, 'servicio del campo', 'servicios del campo')}`] : []),
  ]
  const pieCosto = !enRiesgo.length ? 'nada en riesgo'
    : costo > 0 ? [`${n0(costo)} bbl si fallan con su tiempo fuera de siempre`, ...aparte].join(' · ')
    : !sinHistoria.length ? 'son servicios del campo: lo que cuesta su caída depende de cuánto dure'
    : '— sin historia para estimar una falla'
  // Lo que se ve debajo de la cifra: el costo y sus salvedades, en corto. La
  // frase completa (pieCosto) queda en el ⓘ y en el papel.
  const pieCorto = !enRiesgo.length ? 'nada en riesgo'
    : costo > 0 ? [`≈ ${n0(costo)} bbl si fallan`, ...(sinHistoria.length ? [`${sinHistoria.length} sin historia`] : []),
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
  const columna = 'tabular w-[96px] shrink-0 text-right'

  const filaPerdiendo = (r: FilaRiesgo) => (
    <Tip key={`${r.campoId}${r.equipo}${r.tipo}`} as="button" onClick={() => abrir(r)}
      titulo={`${r.equipo} · ${TIPO_CAUSA[r.tipo]}`} pista={r.motivo}
      filas={[['Pozos parados', String(r.pozos)], ['Perdiéndose', `${n0(r.bblDia)} bbl/d`], ['Por hora', `${n0(r.bblDia / 24)} bbl/h`],
        ...(r.desde ? [['Desde', fechaHora(r.desde)] as [string, string]] : []),
        ...(r.cierreDesde && r.desde && r.cierreDesde.getTime() - r.desde.getTime() > 60_000 ? [['Pozos cerrados desde', fechaHora(r.cierreDesde)] as [string, string]] : []),
        ...(directivo && potencial ? [['Del potencial', `${n1((r.bblDia / potencial) * 100)} %`] as [string, string]] : [])]}
      imprimir="todo" claseImpresion="border-b border-[var(--linea2)] pb-1.5 last:border-0"
      className="flex w-full cursor-pointer items-center gap-3 border-b border-[var(--linea2)] py-2.5 text-left last:border-0 hover:bg-[var(--panel2)] print:border-b-0">
      <MarcaPrioridad s={r.altoImpacto ? 1 : 2} tamano={13} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <b className="text-[12.5px]">{r.equipo}{donde(r.campoId)}</b>
          <Chip tono={r.altoImpacto ? 'fuerte' : 'neutro'}>{etiqueta(r.tipo)}</Chip>
          {r.parte && <span className="text-[10.5px] text-[var(--tinta2)]">{NOMBRE_PARTE[r.parte].toLowerCase()}</span>}
        </span>
        {r.desde && <small className="block truncate text-[10.5px] text-[var(--tinta3)]">desde {fechaHora(r.desde)}</small>}
      </span>
      <span className="tabular w-[88px] shrink-0 text-right">
        <b className="block text-[15px] leading-tight">{n0(r.bblDia)}</b>
        <small className="text-[9.5px] text-[var(--tinta3)]">bbl/d · {plural(r.pozos, 'pozo', 'pozos')}</small>
      </span>
    </Tip>
  )

  const filaRiesgo = (r: FilaRiesgo) => {
    const servicio = esServicio(r)
    const siFalla = servicio && r.bblDia === 0 ? 'todo el campo' : `${n0(r.bblDia)} bbl/d`
    const origen = rol.nivel === 'ingenieria' && r.mdtFuente ? `Costo por falla: ${r.mdtFuente}.` : ''
    return (
      <div key={`${r.campoId}${r.equipo}`} className="border-b border-[var(--linea2)] py-2.5 last:border-0">
        <Tip as="button" onClick={() => abrir(r)} titulo={`${r.equipo} · ${TIPO_CAUSA[r.tipo]}`}
          pista={[r.motivo, origen].filter(Boolean).join(' ')} imprimir="pista"
          filas={[...(r.parte ? [['Parte', NOMBRE_PARTE[r.parte]] as [string, string]] : []),
            ['Cruza su límite', r.horas !== undefined ? `en ${fmtHoras(r.horas)}${r.rango && entre(r.rango) ? ` (${entre(r.rango)})` : ''}` : 'ya fuera'],
            ['Si falla', servicio && r.bblDia === 0 ? 'cierra lo que esté produciendo en el campo' : `${n0(r.bblDia)} bbl/d`],
            ...(r.costoFalla !== undefined ? [['Por falla', `≈ ${n0(r.costoFalla)} bbl`] as [string, string]] : [])]}
          className="flex w-full cursor-pointer items-center gap-3 text-left hover:bg-[var(--panel2)]">
          <MarcaPrioridad s={r.prioridad} tamano={13} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <b className="text-[12.5px]">{r.equipo}{donde(r.campoId)}</b>
              <Chip>{etiqueta(r.tipo)}</Chip>
            </span>
            {r.parte && (
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-[var(--tinta2)]">
                {NOMBRE_PARTE[r.parte].toLowerCase()}
                {r.estadoParte && <Chip tono={r.estadoParte === 'fuera' ? 'fuerte' : 'neutro'}>{ESTADO_PARTE[r.estadoParte]}</Chip>}
              </span>
            )}
          </span>
          <span className={columna}>
            <b className="block text-[13px] leading-tight"><span className="sr-only">cruza en </span>{r.horas !== undefined ? fmtHoras(r.horas) : 'ya fuera'}</b>
            {r.rango && <small className="text-[9.5px] text-[var(--tinta3)]">{entre(r.rango)}</small>}
          </span>
          <span className={columna}>
            {/* Se decide por lo que es el equipo, no por si es de alto impacto: la
                multifásica no es de alto impacto, pero cierra solo sus pozos y
                tiene su costo por falla, que también entra en la cabecera. */}
            <b className="block text-[13px] leading-tight"><span className="sr-only">si falla </span>{siFalla}</b>
            <small className="text-[9.5px] text-[var(--tinta3)]">
              {r.costoFalla !== undefined ? `≈ ${n0(r.costoFalla)} bbl por falla` : servicio ? '' : 'sin historia'}
              {/* Estimado con el promedio de su flota (el equipo nunca ha fallado): vale menos que la historia propia. */}
              {rol.nivel === 'ingenieria' && r.costoDe === 'flota' && <span className="block">flota</span>}
            </small>
          </span>
        </Tip>
        {!directivo && r.accion && <div className="mt-1 pl-[25px]"><Info rotulo="qué hacer" titulo={`Qué hacer · ${r.equipo}`} texto={r.accion} /></div>}
      </div>
    )
  }

  return (
    <>
      <div className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">Perdiéndose ahora</small>
          <b className="tabular flex items-center gap-1.5 text-[30px] leading-none">
            {perdiendo.some(r => r.altoImpacto) && <MarcaPrioridad s={1} tamano={18} />}{n0(porDia)}<small className="text-[12px] font-normal text-[var(--tinta3)]">bbl/d</small>
          </b>
          <small className="block text-[10.5px] text-[var(--tinta2)]">{n1(potencial ? (porDia / potencial) * 100 : 0)} % del potencial · {plural(perdiendo.reduce((a, r) => a + r.pozos, 0), 'pozo parado', 'pozos parados')}</small>
        </span>
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">En riesgo · {plural(enRiesgo.length, 'equipo', 'equipos')}</small>
          <b className="tabular block text-[22px] leading-tight">{n0(enJuego)} <small className="text-[11px] font-normal text-[var(--tinta3)]">bbl/d si fallan</small></b>
          <small className="flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta2)]">
            {pieCorto}{enRiesgo.length > 0 && <Info titulo="Costo si fallan" texto={pieCosto} />}
          </small>
        </span>
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">El más cercano</small>
          {enRiesgo[0] ? (
            <>
              <b className="block truncate text-[15px] leading-tight">{enRiesgo[0].equipo}{donde(enRiesgo[0].campoId)}</b>
              <small className="flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-[var(--tinta2)]">
                {enRiesgo[0].parte && <span>{NOMBRE_PARTE[enRiesgo[0].parte]}</span>}
                {enRiesgo[0].horas !== undefined ? <span>cruza en {fmtHoras(enRiesgo[0].horas)}</span> : <Chip tono="fuerte">ya fuera</Chip>}
              </small>
            </>
          ) : <b className="block text-[15px] text-[var(--tinta3)]">ninguno</b>}
        </span>
      </div>

      <Lectura>
        <b>Perdiéndose ahora</b> es el crudo de los pozos que están apagados en este momento, cada
        uno cargado al equipo que lo apagó. <b>En riesgo</b> son las bombas de la línea y las
        electrosumergibles que producen pero tienen una parte que avisa: lo que se perdería por día si
        fallan, y lo que costaría una falla con el tiempo fuera que esos equipos suelen tener.
        {directivo && ' En puntos de eficiencia: lo perdido sobre el potencial del campo.'}
        {' '}La lista va ordenada por cuándo cruza su límite: primero lo que ya está fuera. Toque o pase
        el cursor por una fila para ver el porqué y de dónde sale el costo por falla («flota»: el equipo
        nunca ha fallado y se estimó con el promedio de su flota en el campo). Un servicio del campo
        no lleva costo por falla: si falla, cierra lo que esté produciendo, y lo que cuesta depende de
        cuánto dure.
      </Lectura>

      <Panel className="mt-2.5" titulo="PERDIÉNDOSE AHORA" extra={perdiendo.length ? plural(perdiendo.length, 'causa', 'causas') : 'nada'}>
        {perdiendo.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Todos los pozos produciendo.</p>}
        {listaPerdiendo.visibles.map(filaPerdiendo)}
        {listaPerdiendo.resto.length > 0 && <div className="solo-impresion">{listaPerdiendo.resto.map(filaPerdiendo)}</div>}
        <VerMas ocultas={listaPerdiendo.ocultas} abierto={listaPerdiendo.abierto} onAlternar={listaPerdiendo.alternar} />
      </Panel>

      <Panel className="mt-2.5" titulo="EN RIESGO">
        {enRiesgo.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna parte avisa.</p>}
        {enRiesgo.length > 0 && (
          <div className="flex gap-3 pb-1 text-[10px] text-[var(--tinta3)]" aria-hidden>
            <span className="flex-1" /><span className={columna}>cruza en</span><span className={columna}>si falla</span>
          </div>
        )}
        {listaRiesgo.visibles.map(filaRiesgo)}
        {listaRiesgo.resto.length > 0 && <div className="solo-impresion">{listaRiesgo.resto.map(filaRiesgo)}</div>}
        <VerMas ocultas={listaRiesgo.ocultas} abierto={listaRiesgo.abierto} onAlternar={listaRiesgo.alternar} />
      </Panel>
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
/** Un servicio o equipo de proceso que cuelga de todo el campo (aire, energía,
 *  compresión…): ni bomba de la línea ni electrosumergible. */
const esServicio = (r: FilaRiesgo) => r.tipo !== 'electrosumergible' && !esBombaDeLinea(r.equipo)
