import { useEffect, useId, useState, type ReactNode } from 'react'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { useApp, useCampo, useRol, useRango, useNivel } from '@/app/store'
import { FichaEjecutiva } from '@/widgets/equipo/FichaEjecutiva'
import { useBarrilesDeEquipos, usePreguntas } from '@/shared/api/diferidos'
import { useEquipo, useHistoriaEquipo, type HistoriaEquipo } from '@/shared/api/equipos'
import { NOMBRE_PARTE } from '@/entities/partes'
import { COMO } from '@/entities/causa-senal'
import { fechaHora, horasEntre, AHORA } from '@/entities/reloj'
import { DetallePozo } from '@/widgets/pozos/DetallePozo'
import { fmtHoras } from '@/widgets/bombas/comun'
import { CadenaDato } from './CadenaDato'
import { Severidad_, Chip, Boton, Hueco } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { DichoEnPapel } from '@/shared/ui/DichoEnPapel'
import { causaEnPapel } from '@/shared/ui/papel'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { Sparkline } from '@/shared/ui/Sparkline'
import { lecturasDe } from '@/entities/serie'
import { n0, num, banda, plural, sinLectura, NOMBRE_ESTADO } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { MarcaEstado } from '@/shared/ui/Prioridad'
import { DE_ESTADO } from '@/shared/lib/prioridad'
import { pedirPozosDelCampo } from '@/shared/api/medicion'
import { BloqueSap } from '@/widgets/sap/BloqueSap'
import { ExportarFicha } from '@/widgets/informe/Exportar'
import { useModal } from '@/shared/ui/foco'
import { puedeHacer, type Dispositivo } from '@/entities/tipos'
import { useTuberiaAgua, useCriticidad } from '@/shared/api/choke'
import { AguaHoy } from '@/widgets/choke/AguaHoy'
import { SiFallaHoyFicha } from '@/widgets/riesgo/SiFallaHoy'


/** La ficha de un equipo flota sobre la pantalla. Siempre está montada (App),
 *  pero el libro del período y el de toda la historia del campo solo se
 *  calculan con una ficha abierta: cerrada, no cuesta nada. */
export function PanelEquipo() {
  const equipoAbierto = useApp(s => s.equipoAbierto)
  return equipoAbierto ? <PanelAbierto equipoAbierto={equipoAbierto} /> : null
}

function PanelAbierto({ equipoAbierto }: { equipoAbierto: string }) {
  const equipoExpandido = useApp(s => s.equipoExpandido), abrirEquipo = useApp(s => s.abrirEquipo), campoId = useApp(s => s.campoId), setPantalla = useApp(s => s.setPantalla)
  const campo = useCampo()
  const rol = useRol()
  const rango = useRango()
  const nivel = useNivel()
  const bblDe = useBarrilesDeEquipos({ campos: [campoId], desde: rango.desde, hasta: rango.hasta })
  const [cadenaTag, setCadenaTag] = useState<string | null>(null)
  const preguntas = usePreguntas([campoId])
  const pendiente = preguntas.some(p => p.pide && !p.fin && p.equipo === equipoAbierto)
  const eq = useEquipo(campoId, equipoAbierto)
  // Diálogo modal: el foco entra, lo de atrás queda inerte y al cerrar vuelve
  // a quien lo abrió. Escape primero cierra la cadena del dato y después la
  // ficha; si encima está la introducción, Escape es de ella. Pasar a otro
  // equipo o abrir y cerrar la cadena cambia lo de adentro sin cerrar: el
  // foco no se queda en un botón que ya no está.
  const dialogo = useModal<HTMLDivElement>(
    () => { if (cadenaTag) setCadenaTag(null); else abrirEquipo(null) },
    `${equipoAbierto}|${cadenaTag ?? ''}`)
  const idTitulo = useId()
  // La historia que dejó el PLC: lo que se le cargó y, en una bomba, sus fallas por parte.
  const historia = useHistoriaEquipo(campoId, eq && eq.clase !== 'pozo' ? eq.id : null)
  // Una bomba de reinyección parada: lo que pasa hoy lo dice el motor (B-17), no la frase fija del registro.
  const agua = useTuberiaAgua(campoId)
  const delTren = agua.tramos.find(x => x.tramo === 'bombas')?.bombas?.find(b => b.id === equipoAbierto)
  const paradaDelTren = delTren?.papel === 'disposicion' && delTren.marcha === 'parada'

  useEffect(() => { setCadenaTag(null) }, [equipoAbierto])

  const disp = eq?.dispositivos ?? []
  // En operación solo se muestra lo que está fuera de banda: lo demás no pide nada.
  // Un instrumento sin lectura (`valor: null`) tampoco es normal: es un dato inválido.
  const visibles = nivel === 'operacion' ? disp.filter(d => d.estado !== 'normal' || d.valor === null) : disp
  // Un equipo sin registro propio (P-201A y P-201C, sin instrumento): una ficha mínima con lo que sí se sabe (B-37).
  if (!eq) return delTren ? <FichaMinima campoId={campoId} equipo={equipoAbierto} /> : null
  // «Fuera de banda» cuenta solo lo que el instrumento reporta fuera; un
  // instrumento sin señal es un dato inválido, no un valor fuera, y se cuenta aparte.
  const sinSenalN = visibles.filter(sinLectura).length, fueraN = visibles.length - sinSenalN
  const activo = cadenaTag ? disp.find(d => d.tag === cadenaTag) : undefined

  // Una fila por dispositivo. El origen de la lectura (PI, PLC…) va en el globo y en el papel;
  // a la vista, solo cuando el dato es de una ruta manual (sin señal).
  // Sin lectura (lo dice su estado o llega con `valor: null`) es un dato
  // inválido (ISA-101): se marca y se dice «sin señal», nunca «—» a secas.
  const fila = (d: (typeof disp)[number]) => {
    const ss = sinLectura(d), e = ss ? 'sin señal' as const : d.estado
    return (
    <Tip key={d.tag} as="button" onClick={() => setCadenaTag(d.tag)}
      titulo={`${d.tag} · ${d.tipo}`} pista="Clic para ver la cadena técnica de este dato"
      filas={[['Valor', ss ? 'sin señal' : `${num(d.valor)} ${d.unidad}`.trim()], ['Límite', d.limite],
        ['Estado', NOMBRE_ESTADO[e]], ['Origen', d.origen],
        ['Minigráfica', d.serie ? lecturasDe(d.serie)
          : ss ? 'sin lecturas en línea: no hay serie que graficar'
          : 'variable discreta: no lleva gráfica']]}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded border border-[var(--linea2)] bg-[var(--panel)] px-2.5 py-2 text-left hover:bg-[var(--elevado)]">
      <MarcaEstado e={e} tamano={11} />
      <span className="min-w-0 flex-1">
        <small className="block font-mono text-[10px] text-[var(--tinta3)]">{d.tag}</small>
        <b className="block truncate text-[11.5px] font-medium">{d.tipo}</b>
        <small className="block text-[10px] text-[var(--tinta3)]">
          {ss ? `${d.origen} · ` : <span className="hidden print:inline">{d.origen} · </span>}límite {d.limite}
        </small>
      </span>
      {nivel === 'operacion' ? null : d.serie
        ? <Sparkline serie={d.serie.valores} limite={banda(d.limite)} ancho={96} alto={26} prioridad={DE_ESTADO[e] ?? undefined} />
        // Sin serie: el dato inválido se dice (ISA-101, magenta); la discreta, en gris.
        : <span className={cn('font-cond w-[96px] text-center text-[9.5px] leading-tight', ss ? 'text-[var(--invalido)]' : 'text-[var(--tinta3)]')}>
            {ss ? 'SIN SEÑAL' : 'DISCRETA'}
          </span>}
      <span className="tabular w-[84px] shrink-0 text-right">
        {/* El estado lo lleva la forma al inicio de la fila: el valor, en tinta. */}
        <b className={cn('block text-[14px] leading-tight', ss && 'text-[var(--tinta3)]')}>
          {ss ? '—' : num(d.valor)}
        </b>
        {/* Sin unidad (un interruptor) se escribe su estado, con su nombre para leer: «atención», no la clave. */}
        <small className={cn('text-[9.5px]', ss ? 'text-[var(--invalido)]' : 'text-[var(--tinta3)]')}>{ss ? 'sin señal' : d.unidad || NOMBRE_ESTADO[e]}</small>
      </span>
    </Tip>
    )
  }

  return (
    <div ref={dialogo} tabIndex={-1} className="fixed inset-0 z-[120] flex outline-none" role="dialog" aria-modal="true" aria-labelledby={idTitulo} data-panel-equipo>
      {/* El fondo cierra con el ratón o el dedo; con teclado se cierra con Escape o con «Cerrar» de la cabecera. */}
      {/* Un <div>, no un botón: no entra en el ciclo de Tab de la ficha (un control escondido del lector). */}
      <div aria-hidden onClick={() => abrirEquipo(null)}
        className="no-imprimir flex-1 cursor-default bg-black/35" />
      <aside className={cn('flex flex-col overflow-hidden border-l border-[var(--linea)] bg-[var(--superficie)] shadow-[var(--sombra2)]',
        equipoExpandido
          ? 'absolute inset-2 rounded border sm:inset-4 lg:inset-x-[6vw] lg:inset-y-[4vh]'
          : 'w-full sm:w-[min(560px,80vw)]')}>

        <header className="flex flex-wrap items-start gap-2 border-b border-[var(--linea)] bg-[var(--panel)] px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-[var(--tinta3)]">{eq.id}</span>
              <Severidad_ s={eq.severidad} />
            </div>
            {/* Entero, sin cortar: la ficha del gerente ya no lo repite debajo. */}
            <h2 id={idTitulo} className="block text-[14px] font-bold leading-tight [text-wrap:balance]">{eq.nombre}</h2>
            <small className="block text-[10.5px] text-[var(--tinta3)]">{eq.sistema} · {campo.nombre} · {eq.estado}</small>
          </div>
          <ExportarFicha />
          <button onClick={() => abrirEquipo(eq.id, !equipoExpandido)}
            aria-label={equipoExpandido ? 'Contraer' : 'Expandir'}
            className="no-imprimir cursor-pointer rounded border border-[var(--linea)] bg-[var(--panel)] p-1.5 hover:bg-[var(--elevado)]">
            {equipoExpandido ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
          <button onClick={() => abrirEquipo(null)} aria-label="Cerrar"
            className="no-imprimir cursor-pointer rounded border border-[var(--linea)] bg-[var(--panel)] p-1.5 hover:bg-[var(--elevado)]">
            <X className="size-3.5" />
          </button>
        </header>

        {nivel === 'decision' ? (
          <div className="flex-1 overflow-y-auto p-3">
            <FichaEjecutiva campoId={campoId} equipo={eq.id} />
            <div className="mt-3 border-t border-[var(--linea2)] pt-2"><BloqueSap campoId={campoId} equipo={eq.id} nivel="decision" /></div>
          </div>
        ) : eq.clase === 'pozo' ? (
          <div className="flex-1 overflow-y-auto p-3">
            <DetallePozo campoId={campoId} pozoId={eq.id} desde={rango.desde} hasta={rango.hasta}
              nombrePeriodo={rango.nombre} volverA="Cerrar" onVolver={() => abrirEquipo(null)} />
            {pedirPozosDelCampo(campoId).some(p => p.id === eq.id && p.levantamiento === 'electrosumergible') && <BloqueSap campoId={campoId} equipo={eq.id} nivel={nivel} />}
          </div>
        ) : activo ? (
          <CadenaDato campoId={campoId} disp={activo} equipoNombre={eq.nombre}
            norma={eq.norma} onVolver={() => setCadenaTag(null)} />
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            {nivel === 'operacion' && pendiente && (
              <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded border border-[var(--linea)] bg-[var(--panel)] p-2.5 text-[12px]">
                <span className="min-w-0 flex-1"><b>No arrancar hasta identificar qué se dañó.</b></span>
                {rol.pantallas.includes('causa') && <Boton variante="principal" onClick={() => { abrirEquipo(null); setPantalla('causa') }}>Identificar</Boton>}
              </div>
            )}
            <section>
              <div className="flex flex-wrap items-center gap-1">
                <Chip>criticidad {eq.criticidad}/5</Chip>
                <Chip tono={eq.redundancia === 'sin respaldo' ? 'fuerte' : 'neutro'}>{eq.redundancia}</Chip>
                <Chip>aguas abajo: {eq.aguasAbajo}</Chip>
                {nivel === 'ingenieria' && <Info rotulo="norma" titulo="Norma" texto={eq.norma} />}
              </div>
              {/* El diagnóstico del equipo, en una frase: es lo que dice por qué está como está. Una bomba de
                  reinyección parada lo dice con la tubería del agua de hoy, que arma el motor (B-17). */}
              {!paradaDelTren && <p className="mt-2 text-[12px] leading-relaxed">{eq.lectura}</p>}
              {nivel === 'ingenieria' && <SiFallaHoyFicha campoId={campoId} equipo={eq.id} className="mt-2" />}
              <AguaHoy campoId={campoId} bomba={eq.id} className="mt-2.5" />
              <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11.5px]">
                {nivel === 'ingenieria' && <><dt className="text-[var(--tinta3)]">Modo de falla</dt><dd className="m-0">{eq.modoFalla}</dd></>}
                <dt className="text-[var(--tinta3)]">Diferido · {rango.nombre.toLowerCase()}</dt>
                <dd className="tabular m-0">{n0(bblDe(eq.id, campoId) ?? 0)} bbl</dd>
              </dl>
            </section>

            <BloqueSap key={`${campoId}|${eq.id}`} campoId={campoId} equipo={eq.id} nivel={nivel} />

            <h3 className="font-cond mb-1.5 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
              {nivel === 'operacion' ? `FUERA DE BANDA · ${fueraN} DE ${disp.length}${sinSenalN ? ` · ${sinSenalN} SIN SEÑAL` : ''}` : `DISPOSITIVOS · ${disp.length}`}
            </h3>
            {!eq.instrumentado && (
              <Hueco>
                <span className="flex flex-wrap items-center gap-x-1">
                  <b>Sin conectar en {campo.nombre}</b>
                  <Info titulo="Sin conectar" texto={`${campo.nombre} todavía no tiene conectada su instancia de este equipo. Existe en la topología, pero no hay lecturas propias. No se muestran aquí las de otro campo: serían el número de otra máquina.`} />
                </span>
              </Hueco>
            )}
            <div className="grid gap-1.5">
              {nivel === 'operacion' && visibles.length === 0 && (
                <p className="text-[11.5px] text-[var(--tinta2)]">Todo dentro de banda.</p>
              )}
              {/* Con `key`: al pasar a otro equipo, la lista vuelve a abrir cerrada. */}
              <ListaDispositivos key={eq.id} visibles={visibles} fila={fila} />
            </div>

            {disp.some(sinLectura) && (
              <div className="mt-2">
                <Hueco>
                  <span className="flex flex-wrap items-center gap-x-1">
                    <span><b>Sin señal</b>: valor de ruta manual</span>
                    <Info titulo="Sin señal" texto="Hay dispositivos sin señal en línea: lo que se vea de ellos es de una ruta manual. No se estima el valor faltante." />
                  </span>
                </Hueco>
              </div>
            )}

            {historia && nivel === 'operacion' && historia.eventos[0] && (
              <p className="mt-3 flex flex-wrap items-center gap-x-1 text-[11.5px] text-[var(--tinta2)]">
                <span>Última parada: <b className="tabular text-[var(--tinta)]">{fechaHora(historia.eventos[0].inicio)}</b>{historia.eventos[0].causa.parte ? ` · ${NOMBRE_PARTE[historia.eventos[0].causa.parte].toLowerCase()}` : ''}</span>
                <Info titulo="Por qué paró" texto={historia.eventos[0].causa.texto} textoEnPapel={causaEnPapel(historia.eventos[0].causa)} />
              </p>
            )}
            {historia && nivel === 'ingenieria' && <Historia key={eq.id} historia={historia} />}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {puedeHacer(rol.puede, 'causa:declarar') && rol.pantallas.includes('causa')
                && preguntas.some(p => p.pide && p.equipo === eq.id) && (
                <Boton variante="principal" onClick={() => { abrirEquipo(null); setPantalla('causa') }}>
                  Identificar qué se dañó
                </Boton>
              )}
              {nivel === 'ingenieria' && disp[0] && <Boton onClick={() => setCadenaTag(disp[0]!.tag)}>Cadena del dato</Boton>}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

/** Cinco y «ver N más»; lo que no está normal (fuera de banda, sin señal) nunca
 *  se esconde. Lo que no se ve en la pantalla sale en el papel. */
function ListaDispositivos({ visibles, fila }: { visibles: Dispositivo[]; fila: (d: Dispositivo) => ReactNode }) {
  const lista = useVerMas(visibles, { prioridad: d => (d.estado !== 'normal' || d.valor === null ? 1 : 3) })
  return (
    <>
      {lista.visibles.map(fila)}
      {lista.resto.length > 0 && <div className="solo-impresion grid gap-1.5">{lista.resto.map(fila)}</div>}
      {/* Dentro de la rejilla: el botón no se estira a todo el ancho. */}
      {lista.ocultas > 0 && <div><VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} /></div>}
    </>
  )
}

/** Seis palabras o menos: la causa de un servicio («Presión baja del aire de instrumentos») cabe en la fila. */
const corto = (t: string) => t.trim().split(/\s+/).length <= 6

/** Lo que el PLC dejó de este equipo: sus fallas (en una bomba) y cada evento
 *  que cerró pozos. Cinco y «ver N más»; la causa de cada evento, en su globo
 *  y en el papel (se repite de un evento a otro: la misma frase del pozo). */
function Historia({ historia }: { historia: HistoriaEquipo }) {
  const lista = useVerMas(historia.eventos)
  const total = historia.eventos.reduce((a, x) => a + x.bbl, 0)
  // Esta duración va de la parada hasta que reabrió el último pozo: no es la de
  // la bomba parada (la de «Paradas» en Bombas). Se dice cuál es.
  const cerrados = (x: HistoriaEquipo['eventos'][number]) => x.fin
    ? `${plural(x.pozos, 'pozo cerrado', 'pozos cerrados')} hasta ${fmtHoras(horasEntre(x.inicio, x.fin), true)}`
    : `${plural(x.pozos, 'pozo cerrado', 'pozos cerrados')} · sigue · ${fmtHoras(horasEntre(x.inicio, AHORA), true)}`
  const fila = (x: HistoriaEquipo['eventos'][number]) => (
    <Tip key={x.id} titulo={`${fechaHora(x.inicio)} · ${plural(x.pozos, 'pozo', 'pozos')}`}
      filas={[[x.fin ? 'Hasta que reabrió el último pozo' : 'Pozos cerrados, sigue', fmtHoras(horasEntre(x.inicio, x.fin ?? AHORA), true)],
        ['Barriles', `${n0(x.bbl)} bbl`], ['Cómo se identificó', COMO[x.causa.como]]]}
      pista={x.causa.texto} pistaEnPapel={causaEnPapel(x.causa)} imprimir="pista" claseImpresion="border-b border-[var(--linea2)] pb-1.5 last:border-0"
      className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--linea2)] py-1 text-[11px] last:border-0 print:border-b-0">
      <span className="min-w-0">
        <b className="tabular">{fechaHora(x.inicio)}</b>
        <span className="text-[var(--tinta3)]"> · {cerrados(x)}</span>
        <small className="block truncate text-[10.5px] text-[var(--tinta2)]">{x.causa.parte ? `${NOMBRE_PARTE[x.causa.parte]} · ${COMO[x.causa.como]}`
          // «Mantenimiento preventivo programado» ya dice «por el programa aprobado».
          : corto(x.causa.texto) ? <DichoEnPapel papel={`${causaEnPapel(x.causa)} · ${COMO[x.causa.como]}`}>{`${x.causa.texto}${x.causa.como === 'programa' ? '' : ` · ${COMO[x.causa.como]}`}`}</DichoEnPapel> : COMO[x.causa.como]}</small>
      </span>
      <b className="tabular">{n0(x.bbl)} bbl</b>
    </Tip>
  )
  return (
    <>
      <h3 className="font-cond mb-1.5 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">HISTORIA DEL PLC</h3>
      {historia.bomba && (
        <p className="tabular mb-1.5 text-[11.5px] text-[var(--tinta2)]">
          <b className="text-[var(--tinta)]">{plural(historia.bomba.fallas, 'falla', 'fallas')}</b> en {n0(historia.bomba.dias / 30.4)} meses
          {historia.bomba.mtbfDias ? ` · cada ${n0(historia.bomba.mtbfDias)} d` : ''}
          {historia.bomba.mdtH ? ` · ${fmtHoras(historia.bomba.mdtH, true)} fuera` : ''}
          {/* Lo que YA costó (histórico); «si falla hoy» es otra cifra, la de Riesgo. */}
          {historia.bomba.bblPorFalla !== undefined ? ` · le ha costado ${n0(historia.bomba.bblPorFalla)} bbl por falla` : ''}
          {historia.bomba.porParte.length > 0 && <span className="block text-[11px]">{historia.bomba.porParte.map(x => `${NOMBRE_PARTE[x.parte].toLowerCase()} ${x.fallas}`).join(' · ')}</span>}
        </p>
      )}
      {historia.eventos.length === 0 ? (
        <p className="text-[11.5px] text-[var(--tinta2)]">Ningún pozo cerrado por este equipo en la historia.</p>
      ) : (
        <>
          <p className="tabular mb-1 text-[11.5px] text-[var(--tinta2)]">
            {plural(historia.eventos.length, 'evento', 'eventos')} con pozos cerrados · <b className="text-[var(--tinta)]">{n0(total)} bbl</b>
          </p>
          {lista.visibles.map(fila)}
          {lista.resto.length > 0 && <div className="solo-impresion">{lista.resto.map(fila)}</div>}
          <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
        </>
      )}
    </>
  )
}

/** La ficha de un equipo que no tiene registro propio en TRIM (P-201A y P-201C:
 *  bombas del tren de agua sin instrumento). No se inventa lo que no hay: se
 *  dice que no tiene instrumento, cuánto costaría si falla hoy y la tubería del
 *  agua de hoy (B-37, B-01). */
function FichaMinima({ campoId, equipo }: { campoId: string; equipo: string }) {
  const abrirEquipo = useApp(s => s.abrirEquipo)
  const campo = useCampo()
  const nivel = useNivel()
  const crit = useCriticidad([campoId])
  const fila = crit.ranking.find(f => f.equipo === equipo && f.campoId === campoId)
  const dialogo = useModal<HTMLDivElement>(() => abrirEquipo(null), equipo)
  const idTitulo = useId()
  return (
    <div ref={dialogo} tabIndex={-1} className="fixed inset-0 z-[120] flex outline-none" role="dialog" aria-modal="true" aria-labelledby={idTitulo} data-panel-equipo data-ficha-minima={equipo}>
      <div aria-hidden onClick={() => abrirEquipo(null)} className="no-imprimir flex-1 cursor-default bg-black/35" />
      <aside className="flex w-full flex-col overflow-hidden border-l border-[var(--linea)] bg-[var(--superficie)] shadow-[var(--sombra2)] sm:w-[min(560px,80vw)]">
        <header className="flex items-start gap-2 border-b border-[var(--linea)] bg-[var(--panel)] px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[11px] text-[var(--tinta3)]">{equipo}</span>
            <h2 id={idTitulo} className="block text-[14px] font-bold leading-tight">{fila?.nombre ?? equipo}</h2>
            <small className="block text-[10.5px] text-[var(--tinta3)]">Tren de agua · {campo.nombre}</small>
          </div>
          <button onClick={() => abrirEquipo(null)} aria-label="Cerrar"
            className="no-imprimir min-h-12 cursor-pointer rounded border border-[var(--linea)] bg-[var(--panel)] p-1.5 hover:bg-[var(--elevado)] sm:min-h-0">
            <X className="size-3.5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3 text-[12px]">
          <Hueco>
            <span className="flex flex-wrap items-center gap-x-1">
              <b>Sin instrumento</b>: TRIM no ve si está en marcha; se supone que sí. No tiene historia propia de fallas.
            </span>
          </Hueco>
          {nivel !== 'decision' && <SiFallaHoyFicha campoId={campoId} equipo={equipo} className="mt-2.5" />}
          <AguaHoy campoId={campoId} bomba={equipo} className="mt-2.5" />
        </div>
      </aside>
    </div>
  )
}
