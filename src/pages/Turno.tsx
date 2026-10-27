import { useApp, useAmbito, useRol } from '@/app/store'
import { useLibro, useRiesgo, usePreguntas, contarPorIdentificar } from '@/shared/api/diferidos'
import { useCifrasDeUnNombre, NOMBRE_CIFRA } from '@/shared/api/resultados'
import { useMensajes } from '@/shared/api/mensajes'
import { PASO_CORTO, ORDEN_PASO } from '@/entities/mensajes'
import { NoEnviado } from '@/widgets/whatsapp/NoEnviado'
import { COMO, rolDeQuien } from '@/entities/causa-senal'
import { DichoEnPapel } from '@/shared/ui/DichoEnPapel'
import { causaEnPapel } from '@/shared/ui/papel'
import { NOMBRE_PARTE } from '@/entities/partes'
import { ESTADO_PARTE } from '@/entities/salud'
import { campoPorId } from '@/entities/campos'
import { AHORA, fechaHora } from '@/entities/reloj'
import { Panel, Boton, Chip, Hueco, Tarjeta } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, plural } from '@/shared/lib/formato'
import { ArrowRight } from 'lucide-react'
import { useCondiciones } from '@/shared/api/condiciones'
import { FAMILIA } from '@/shared/api/plantaViva'
import { MarcaDeEquipo } from '@/widgets/hoy/comun'
import { ApoyoPorIdentificar } from '@/shared/ui/PorIdentificar'
import { fmtHoras } from '@/widgets/bombas/comun'
import { useUsuarios } from '@/shared/api/usuarios'
import { esServicio } from '@/shared/api/equipos'
import { siPara, siParaLargo } from '@/shared/ui/costoHoy'
import { HoyLimita, DondeSeTrabo } from '@/widgets/arbol/HoyLimita'
import { CierreDeHoy } from '@/widgets/arbol/CierreDeHoy'

/** Turno de 12 horas (rotación 7×7 sobre una operación 24/7). */
const TURNO_H = 12

/** Un paso de un hilo de WhatsApp: a quién llegó y a quién no (con el porqué). */
type Paso = { hora: string; rango: number; que: string; para: string[]; fallas: Array<{ para: string; motivo: string }> }

/** Lo que se entrega al turno que entra: lo que pasó en el que sale, lo que
 *  está costando ahora, lo que falta identificar y lo que hay que vigilar.
 *  Todo sale de los controladores y del vigía; nada se escribe aquí. */
export function Turno() {
  const ambito = useAmbito(); const rol = useRol()
  const abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla), setCampo = useApp(s => s.setCampo)
  const usuarios = useUsuarios()
  const ids = ambito.campos.map(c => c.id)
  const inicioTurno = new Date(AHORA.getTime() - TURNO_H * 3_600_000)
  const lb = useLibro({ campos: ids, desde: inicioTurno, hasta: AHORA })
  const riesgo = useRiesgo(ids)
  // «Se deja de producir ahora» es siempre el total del campo (X4 §1.3.3): la regla del motor.
  const uno = useCifrasDeUnNombre(ids)
  const todas = usePreguntas(ids)
  const preguntas = todas.filter(p => p.pide)
  // La cuenta única de «por identificar» (Turno, Mi trabajo, Identificar, Mantenimiento).
  const pi = contarPorIdentificar(todas)
  // H3 (X2 F2): la marca de un equipo es la de la franja, la misma en todas partes; la
  // urgencia (cruzar el límite dentro del turno) va en el texto, no en otra marca (H17).
  const condicion = useCondiciones(ids)
  const enviados = useMensajes(ids).filter(m => new Date(m.hora).getTime() >= inicioTurno.getTime())
  const nombre = (id: string) => usuarios.find(x => x.id === id)?.nombre ?? id
  // Todo lo de este panel y del de paradas nuevas es de las últimas 12 h: basta la hora.
  const hora = (d: Date) => fechaHora(d).replace(/^.*?, /, '')
  const corta = (iso: string) => hora(new Date(iso))
  // Un hilo por evento (la parada, su pregunta y lo que siguió) o por orden;
  // cada paso, con todos los que lo recibieron; al final, si respondieron.
  const hilos = [...enviados.reduce((mapa, m) => {
    const clave = `${m.campoId}|${m.evento ?? m.orden ?? `${m.regla}|${m.equipo}`}`
    const h = mapa.get(clave) ?? { clave, campoId: m.campoId, equipo: m.equipo, evento: m.evento, pasos: [] as Paso[] }
    const que = PASO_CORTO[m.insistencia ?? m.regla]
    const paso = h.pasos.find(x => x.hora === m.hora && x.que === que) ?? (h.pasos.push({ hora: m.hora, rango: ORDEN_PASO[m.insistencia ?? m.regla], que, para: [], fallas: [] }), h.pasos.at(-1)!)
    // Lo que no salió no cuenta como avisado: va aparte, con su motivo.
    if (m.noEnviado) paso.fallas.push({ para: nombre(m.para), motivo: m.noEnviado })
    else if (!paso.para.includes(nombre(m.para))) paso.para.push(nombre(m.para))
    return mapa.set(clave, h)
  }, new Map<string, { clave: string; campoId: string; equipo: string; evento?: string; pasos: Paso[] }>()).values()]
    .map(h => {
      const p = h.evento ? todas.find(x => x.id === h.evento) : undefined
      const r = p?.causa.declarado
      const estado = !p ? undefined : r ? `respondió ${r.por}${r.canal === 'whatsapp' ? ' por WhatsApp' : ''}: «${r.texto}»` : 'sin respuesta'
      // En el papel, quien respondió por su rol y sin su texto (D2).
      const estadoPapel = r ? `respondió ${rolDeQuien(r.por)}${r.canal === 'whatsapp' ? ' por WhatsApp' : ''}` : estado
      return { ...h, pasos: [...h.pasos].sort((a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime() || a.rango - b.rango), estado, estadoPapel }
    })
    .sort((a, b) => b.pasos.at(-1)!.hora.localeCompare(a.pasos.at(-1)!.hora))
  const perdiendo = riesgo.filter(r => r.estado === 'perdiendo')
  // Lo que ya está fuera de límite (sin horas) va primero, como en Riesgo y Mantenimiento.
  const vigilar = riesgo.filter(r => r.estado === 'en-riesgo').sort((a, b) => (a.horas ?? -1) - (b.horas ?? -1))
  const porDia = uno.ahoraBpd
  // El equipo que más pesa en lo que se pierde ahora: lleva la marca que el total no lleva (B-40).
  const causaMayor = [...perdiendo].sort((a, b) => Number(b.altoImpacto) - Number(a.altoImpacto) || b.bblDia - a.bblDia)[0]
  const abrir = (c: string, eq: string) => { setCampo(c); abrirEquipo(eq, false) }
  // El operador no ve el modelo del tramo (U2 §3.1): contesta lo que vio.
  const veTramo = rol.id !== 'oper' && rol.id !== 'tec'
  const donde = (c: string) => (ambito.global ? ` · ${campoPorId(c).nombre}` : '')
  // Nuevos son los eventos que EMPEZARON en el turno; lo que venía de antes
  // sigue en «pasando ahora», no se cuenta otra vez.
  const nuevos = lb.tramos.filter(t => new Date(t.evento.inicio).getTime() >= inicioTurno.getTime())
    .sort((a, b) => b.evento.inicio.localeCompare(a.evento.inicio))
  // Un evento con muchos pozos (paró la bomba) es una sola línea, no una por pozo.
  // Con push y no copiando la lista en cada tramo: copiar la volvía cuadrática.
  const porEvento = new Map<string, typeof nuevos>()
  for (const t of nuevos) {
    const k = t.causa.evento ?? t.evento.id, g = porEvento.get(k)
    if (g) g.push(t); else porEvento.set(k, [t])
  }
  const grupos = [...porEvento.values()]

  // El orden de «ver más» sigue la urgencia; la MARCA es la del equipo (H3).
  const prioridadVigilar = (r: (typeof vigilar)[number]) => (r.horas !== undefined && r.horas < TURNO_H ? Math.min(r.prioridad || 3, 2) as 1 | 2 : r.prioridad)
  const listaPerdiendo = useVerMas(perdiendo, { prioridad: r => (r.altoImpacto ? 1 : 2) })
  // «No arrancar» es una instrucción de seguridad: esas filas nunca quedan detrás de «ver más».
  const listaPreguntas = useVerMas(preguntas, { prioridad: p => (!p.fin ? 1 : 3) })
  const listaVigilar = useVerMas(vigilar, { prioridad: prioridadVigilar })
  /** La marca del equipo con su palabra (H16), o nada si el equipo no tiene condición. */
  const marca = (campoId: string, equipo: string) => <MarcaDeEquipo c={condicion(campoId, equipo)} tamano={13} />
  const listaGrupos = useVerMas(grupos)
  const listaHilos = useVerMas(hilos)
  const sinEnviar = enviados.filter(m => m.noEnviado).length

  const filaPerdiendo = (r: (typeof perdiendo)[number]) => (
    <Tip key={`${r.campoId}${r.equipo}${r.tipo}`} as="button" onClick={() => abrir(r.campoId, r.equipo)}
      titulo={`${r.equipo} · ${FAMILIA[r.tipo]}`} pista={r.motivo}
      // Lo que escribió una persona va en la pantalla; en el papel, quién lo contestó, por su rol (D2).
      pistaEnPapel={r.declaradoPor ? `Lo contestó ${r.declaradoPor}` : undefined}
      filas={[['Pozos parados', String(r.pozos)], [`Por ${r.equipo} se dejan de producir`, `${n0(r.bblDia)} bbl/d`],
        ['En el turno', `${n0(r.bblDia * TURNO_H / 24)} bbl`], ...(r.desde ? [['Desde', fechaHora(r.desde)] as [string, string]] : []),
        ...(r.cierreDesde && r.desde && r.cierreDesde.getTime() - r.desde.getTime() > 60_000 ? [['Pozos cerrados desde', fechaHora(r.cierreDesde)] as [string, string]] : [])]}
      imprimir="todo" claseImpresion="border-b border-[var(--linea2)] pb-1.5 last:border-0"
      className="flex w-full cursor-pointer items-center gap-2.5 border-b border-[var(--linea2)] py-2.5 text-left last:border-0 hover:bg-[var(--panel2)] print:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          {marca(r.campoId, r.equipo)}
          <b className="text-[15px] leading-tight">{r.equipo}{donde(r.campoId)}</b>
          <span className="text-[14px] text-[var(--tinta2)]">{FAMILIA[r.tipo]}</span>
          {veTramo && <DondeSeTrabo campoId={r.campoId} equipo={r.equipo} desde={inicioTurno} hasta={AHORA} />}
          {r.parte && <span className="text-[13px] text-[var(--tinta2)]">{NOMBRE_PARTE[r.parte].toLowerCase()}</span>}
        </span>
        <small className="block truncate text-[13px] text-[var(--tinta3)]">{plural(r.pozos, 'pozo', 'pozos')}{r.desde ? ` · desde ${fechaHora(r.desde)}` : ''}</small>
      </span>
      <span className="tabular text-right">
        <b className="block text-[14px] leading-tight">{n0(r.bblDia)}</b>
        <small className="text-[12px] text-[var(--tinta3)]">bbl/d</small>
      </span>
    </Tip>
  )

  const filaPregunta = (p: (typeof preguntas)[number]) => (
    <div key={p.id} className="flex items-center gap-2.5 border-b border-[var(--linea2)] py-2 text-[14px] last:border-0">
      <span className="min-w-0 flex-1">
        {marca(p.campoId, p.equipo)} <b>{p.equipo}</b><span className="text-[var(--tinta3)]">{donde(p.campoId)} · {fechaHora(p.inicio)}</span>
      </span>
      {!p.fin ? <Chip tono="fuerte">no arrancar</Chip> : <Chip>arrancó sin identificar</Chip>}
    </div>
  )

  const filaVigilar = (r: (typeof vigilar)[number]) => (
    <Tip key={`${r.campoId}${r.equipo}`} as="button" onClick={() => abrir(r.campoId, r.equipo)}
      titulo={r.equipo} pista={r.motivo} imprimir="pista" claseImpresion="border-b border-[var(--linea2)] pb-1.5 last:border-0"
      filas={[['Parte', r.parte ? NOMBRE_PARTE[r.parte] : '—'], ['Cruza su límite', r.horas !== undefined ? `en ${fmtHoras(r.horas)}` : 'ya pasó el límite'],
        ['Si para', siParaLargo(r, esServicio(r))]]}
      className="flex w-full cursor-pointer items-center gap-2.5 border-b border-[var(--linea2)] py-2 text-left last:border-0 hover:bg-[var(--panel2)] print:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">{marca(r.campoId, r.equipo)}<b className="truncate text-[14px]">{r.equipo}{donde(r.campoId)}</b></span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--tinta2)]">
          {r.parte
            ? <>{NOMBRE_PARTE[r.parte].toLowerCase()}{r.estadoParte && <Chip tono={r.estadoParte === 'fuera' ? 'fuerte' : 'neutro'}>{ESTADO_PARTE[r.estadoParte]}</Chip>}</>
            : <Chip>{FAMILIA[r.tipo]}</Chip>}
        </span>
      </span>
      <span className="tabular text-right text-[13px]">
        <b className="block">{r.horas !== undefined ? fmtHoras(r.horas) : 'ya pasó el límite'}</b>
        {/* Un techo (K-101: si cierran todos sus pozos) se dice «hasta», como en Riesgo y «Si falla hoy». */}
        <small className="text-[12px] text-[var(--tinta3)]" data-si-para>{siPara(r, esServicio(r))}</small>
      </span>
    </Tip>
  )

  const filaGrupo = (g: (typeof grupos)[number]) => {
    const t = g[0]!
    const ini = g.map(x => new Date(x.evento.inicio))
    const porOtro = t.causa.equipo !== t.pozo.id
    const como = porOtro && t.causa.como === 'ninguno' ? 'parte por identificar' : COMO[t.causa.como]
    const bbl = g.reduce((a, x) => a + x.bbl, 0)
    const linea = g.length > 1
      ? `${plural(g.length, 'pozo cerrado', 'pozos cerrados')} por ${t.causa.equipo}`
      : `${hora(ini[0]!)} · ${t.pozo.id}${porOtro ? ` · por ${t.causa.equipo}` : ''}`
    return (
      <Tip key={t.causa.evento ?? t.evento.id} titulo={linea} pista={t.causa.texto} pistaEnPapel={causaEnPapel(t.causa)} imprimir="pista" claseImpresion="border-b border-[var(--linea2)] pb-1.5 last:border-0"
        filas={[...(porOtro ? [['Lo cerró', t.causa.equipo] as [string, string]] : []), ['Barriles', `${n0(bbl)} bbl`], ['Cómo se identificó', como]]}
        className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--linea2)] py-1.5 text-[14px] last:border-0 print:border-b-0">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2">
          {g.length > 1 ? (
            <span><b>{plural(g.length, 'pozo cerrado', 'pozos cerrados')}</b> por <b>{t.causa.equipo}</b>{donde(t.pozo.campoId)}
              <span className="tabular text-[var(--tinta3)]"> · {hora(new Date(Math.min(...ini.map(x => x.getTime()))))}–{hora(new Date(Math.max(...ini.map(x => x.getTime()))))}</span></span>
          ) : (
            <span><b className="tabular">{hora(ini[0]!)}</b> · <b className="font-cond font-bold tracking-[.02em]">{t.pozo.id}</b>{donde(t.pozo.campoId)}{porOtro && <> · por <b>{t.causa.equipo}</b></>}</span>
          )}
          <Chip>{como}</Chip>
        </span>
        <span className="tabular text-right">{n0(bbl)} bbl{g.some(x => x.abierto) ? <small className="text-[var(--tinta3)]"> · sigue</small> : ''}</span>
      </Tip>
    )
  }

  const filaHilo = (h: (typeof hilos)[number]) => (
    <Tip key={h.clave} titulo={h.equipo} filas={h.pasos.map(x => [`${corta(x.hora)} ${x.que}`, x.para.join(', ') || '—'] as [string, string])}
      imprimir="todo" claseImpresion="border-b border-[var(--linea2)] pb-1.5 last:border-0"
      className="border-b border-[var(--linea2)] py-1.5 text-[14px] last:border-0 print:border-b-0">
      <span className="flex flex-wrap items-center justify-between gap-x-3">
        <span><b>{h.equipo}</b>{donde(h.campoId)}</span>
        {h.estado && (h.estado === 'sin respuesta' ? <Chip tono="fuerte">sin respuesta</Chip> : <small className="text-[var(--tinta2)]"><DichoEnPapel papel={h.estadoPapel}>{h.estado}</DichoEnPapel></small>)}
      </span>
      <span className="block text-[var(--tinta2)]">
        {h.pasos.map((x, i) => <span key={`${x.hora}${x.que}`}>{i > 0 && ' → '}<span className="tabular">{corta(x.hora)}</span> {x.que}<NoEnviado fallas={x.fallas} /></span>)}
      </span>
    </Tip>
  )


  return (
    <>
      {/* P-05 (regla 5: lo medido manda y lo simulado acompaña): la cifra grande es lo que se
          deja de producir AHORA, medido; la proyección del turno que entra va debajo, chica, con su
          palabra y en trazo discontinuo. Lo demás que traía el bloque (por identificar, el diferido
          del turno) va en una línea, sin cifras grandes (UI-15). */}
      <Tarjeta className="mb-2.5" data-turno-cifras>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* Un total no es una alarma: la marca va en el equipo que lo causa (B-40; U2 §0, principio 4). */}
          <b className="tabular text-[30px] font-bold leading-none tracking-[-.01em]" data-medida>{n0(porDia)}</b>
          <span className="text-[16px] text-[var(--tinta2)]">bbl/d se dejan de producir ahora</span>
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] text-[var(--tinta2)]">
          {plural(perdiendo.reduce((a, r) => a + r.pozos, 0), 'pozo parado', 'pozos parados')}
          {causaMayor && <> · {marca(causaMayor.campoId, causaMayor.equipo)}<b className="text-[var(--tinta)]">{causaMayor.equipo}</b></>}
          <span> · {pi.porIdentificar} por identificar</span><ApoyoPorIdentificar pi={pi} />
          <span> · {n0(lb.diferido)} bbl diferidos en {TURNO_H} h</span>
        </p>
        <Tip titulo="Turno que entra" pista={`Lo que se deja de producir ahora, sostenido las ${TURNO_H} horas del turno, si nada cambia.`}
          filas={[[NOMBRE_CIFRA.ahora, `${n0(porDia)} bbl/d`], ['Turno', `${TURNO_H} h`]]}
          className="mt-2.5 inline-flex rounded-full border-[1.5px] border-dashed border-[var(--tinta3)] px-2.5 text-[14px] leading-[1.6] text-[var(--tinta2)]"
          data-proyectado="">
          ≈ {n0(porDia * TURNO_H / 24)} bbl en el turno que entra si nada cambia · proyectado
        </Tip>
      </Tarjeta>

      <Lectura>
        Lo que deja el turno que sale y lo que recibe el que entra. Las cifras salen de los
        controladores de los pozos y del vigía; para entregar no hay que escribir nada, salvo
        responder las paradas que ninguna señal explica. «Proyectado»: lo que se deja de producir ahora,
        sostenido las {TURNO_H} horas del turno que entra, si nada cambia. Toque o pase el cursor por un hilo
        de WhatsApp para ver a quién le llegó cada mensaje; lo que no se envió se marca en la fila.
      </Lectura>

      {/* «Hoy limita» separa lo que limita, lo más frágil y lo que más cuesta si falla (U2 §3.1, §12 punto 1). */}
      {veTramo && <div className="mt-2.5"><HoyLimita campos={ids} desde={inicioTurno} hasta={AHORA} /></div>}
      <div className={veTramo ? '' : 'mt-2.5'}><CierreDeHoy key={rol.id} campos={ids} global={ambito.global} /></div>

      <div className="grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <Panel titulo="Parado ahora" extra={perdiendo.length ? plural(perdiendo.length, 'causa', 'causas') : 'nada parado'}>
          {perdiendo.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Todos los pozos produciendo.</p>}
          {listaPerdiendo.visibles.map(filaPerdiendo)}
          {listaPerdiendo.resto.length > 0 && <div className="solo-impresion">{listaPerdiendo.resto.map(filaPerdiendo)}</div>}
          <VerMas ocultas={listaPerdiendo.ocultas} abierto={listaPerdiendo.abierto} onAlternar={listaPerdiendo.alternar} />
        </Panel>

        <Panel titulo="Por identificar" extra={`${pi.porIdentificar}`}>
          {preguntas.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Todas las paradas tienen causa.</p>}
          {listaPreguntas.visibles.map(filaPregunta)}
          {listaPreguntas.resto.length > 0 && <div className="solo-impresion">{listaPreguntas.resto.map(filaPregunta)}</div>}
          <VerMas ocultas={listaPreguntas.ocultas} abierto={listaPreguntas.abierto} onAlternar={listaPreguntas.alternar} />
          {rol.pantallas.includes('causa') ? (
            preguntas.length > 0 && (
              <Boton variante="principal" className="mt-2.5 w-full" onClick={() => setPantalla('causa')}>
                Identificar antes de entregar<ArrowRight className="ml-1 inline size-3" />
              </Boton>
            )
          ) : preguntas.length > 0 && <Hueco>Lo responde quien estuvo en el equipo.</Hueco>}
        </Panel>

        <Panel titulo="Por vigilar" extra={plural(vigilar.length, 'equipo', 'equipos')}>
          {vigilar.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Ninguna parte va hacia su límite.</p>}
          {listaVigilar.visibles.map(filaVigilar)}
          {listaVigilar.resto.length > 0 && <div className="solo-impresion">{listaVigilar.resto.map(filaVigilar)}</div>}
          <VerMas ocultas={listaVigilar.ocultas} abierto={listaVigilar.abierto} onAlternar={listaVigilar.alternar} />
        </Panel>
      </div>

      <Panel className="mt-2.5" titulo="Paradas nuevas" extra={`${TURNO_H} h · ${plural(grupos.length, 'causa', 'causas')}`}>
        {grupos.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Ningún pozo paró.</p>}
        {listaGrupos.visibles.map(filaGrupo)}
        {listaGrupos.resto.length > 0 && <div className="solo-impresion">{listaGrupos.resto.map(filaGrupo)}</div>}
        <VerMas ocultas={listaGrupos.ocultas} abierto={listaGrupos.abierto} onAlternar={listaGrupos.alternar} />
      </Panel>
      <Panel className="mt-2.5" titulo="WhatsApp del turno"
        extra={`${plural(enviados.length - sinEnviar, 'mensaje', 'mensajes')}${sinEnviar ? ` · ${plural(sinEnviar, 'sin enviar', 'sin enviar')}` : ''}`}>
        <Lectura>
          A quién le avisó TRIM y cuándo, con las reglas fijas del producto: parada de un equipo de
          alto impacto al supervisor y al operador; «¿qué se dañó?» al operador, recordatorio a los
          30 min y al supervisor a las 2 h; parte por cruzar su límite a confiabilidad y mantenimiento;
          orden liberada en SAP al técnico.
        </Lectura>
        {hilos.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">TRIM no mandó nada.</p>}
        {listaHilos.visibles.map(filaHilo)}
        {listaHilos.resto.length > 0 && <div className="solo-impresion">{listaHilos.resto.map(filaHilo)}</div>}
        <VerMas ocultas={listaHilos.ocultas} abierto={listaHilos.abierto} onAlternar={listaHilos.alternar} />
      </Panel>
    </>
  )
}
