import { useEffect, useId, useState } from 'react'
import { X, Maximize2, Minimize2 } from 'lucide-react'
import { useApp, useCampo, useRol, useRango, useNivel } from '@/app/store'
import { FichaEjecutiva } from '@/widgets/equipo/FichaEjecutiva'
import { useBarrilesDeEquipos, usePreguntas } from '@/shared/api/diferidos'
import { useEquipo, useHistoriaEquipo } from '@/shared/api/equipos'
import { NOMBRE_PARTE } from '@/entities/partes'
import { COMO } from '@/entities/causa-senal'
import { fechaHora, horasEntre, AHORA } from '@/entities/reloj'
import { DetallePozo } from '@/widgets/pozos/DetallePozo'
import { fmtHoras } from '@/widgets/bombas/comun'
import { CadenaDato } from './CadenaDato'
import { Severidad_, Chip, Boton, Cita, Hueco } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Sparkline } from '@/shared/ui/Sparkline'
import { lecturasDe } from '@/entities/serie'
import { n0, num, banda } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { MarcaEstado } from '@/shared/ui/Prioridad'
import { DE_ESTADO } from '@/shared/lib/prioridad'
import { pedirPozosDelCampo } from '@/shared/api/medicion'
import { BloqueSap } from '@/widgets/sap/BloqueSap'
import { ExportarFicha } from '@/widgets/informe/Exportar'
import { useModal } from '@/shared/ui/foco'
import { puedeHacer } from '@/entities/tipos'


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

  useEffect(() => { setCadenaTag(null) }, [equipoAbierto])

  if (!eq) return null
  const disp = eq.dispositivos
  // En operación solo se muestra lo que está fuera de banda: lo demás no pide nada.
  const visibles = nivel === 'operacion' ? disp.filter(d => d.estado !== 'normal') : disp
  // «Fuera de banda» cuenta solo lo que el instrumento reporta fuera; un
  // instrumento sin señal es un dato inválido, no un valor fuera, y se cuenta aparte.
  const sinSenalN = visibles.filter(d => d.estado === 'sin señal').length, fueraN = visibles.length - sinSenalN
  const activo = cadenaTag ? disp.find(d => d.tag === cadenaTag) : undefined

  return (
    <div ref={dialogo} tabIndex={-1} className="fixed inset-0 z-[120] flex outline-none" role="dialog" aria-modal="true" aria-labelledby={idTitulo} data-panel-equipo>
      {/* El fondo cierra con el ratón o el dedo; con teclado se cierra con Escape o con «Cerrar» de la cabecera. */}
      <button aria-hidden tabIndex={-1} onClick={() => abrirEquipo(null)}
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
            <h2 id={idTitulo} className="block truncate text-[14px] font-bold leading-tight">{eq.nombre}</h2>
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
            <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
              <section>
                <div className="flex flex-wrap gap-1">
                  <Chip>criticidad {eq.criticidad}/5</Chip>
                  <Chip tono={eq.redundancia === 'sin respaldo' ? 'fuerte' : 'neutro'}>{eq.redundancia}</Chip>
                  <Chip>aguas abajo: {eq.aguasAbajo}</Chip>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed">{eq.lectura}</p>
                <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11.5px]">
                  {nivel === 'ingenieria' && <><dt className="text-[var(--tinta3)]">Modo de falla típico de la familia</dt><dd className="m-0">{eq.modoFalla}</dd></>}
                  <dt className="text-[var(--tinta3)]">Diferido · {rango.nombre.toLowerCase()}</dt>
                  <dd className="tabular m-0">{bblDe(eq.id, campoId) ? `${n0(bblDe(eq.id, campoId))} bbl` : 'no ha diferido barriles'}</dd>
                </dl>
              </section>
              {nivel === 'ingenieria' && <Cita>{eq.norma}</Cita>}
            </div>

            <BloqueSap campoId={campoId} equipo={eq.id} nivel={nivel} />

            <h3 className="font-cond mb-1.5 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
              {nivel === 'operacion' ? `FUERA DE BANDA · ${fueraN} DE ${disp.length}${sinSenalN ? ` · ${sinSenalN} SIN SEÑAL` : ''}` : `DISPOSITIVOS · ${disp.length}`}
            </h3>
            {!eq.instrumentado && (
              <Hueco>
                <b>{campo.nombre} todavía no tiene conectada su instancia de este equipo.</b><br />
                Existe en la topología, pero no hay lecturas propias. No se muestran aquí las de otro
                campo: serían el número de otra máquina.
              </Hueco>
            )}
            <div className="grid gap-1.5">
              {nivel === 'operacion' && visibles.length === 0 && (
                <p className="text-[11.5px] text-[var(--tinta2)]">Todos sus instrumentos están dentro de banda.</p>
              )}
              {visibles.map(d => (
                <Tip key={d.tag} as="button" onClick={() => setCadenaTag(d.tag)}
                  titulo={`${d.tag} · ${d.tipo}`} pista="Clic para ver la cadena técnica de este dato"
                  filas={[['Valor', `${num(d.valor)} ${d.unidad}`.trim()], ['Límite', d.limite],
                    ['Estado', d.estado], ['Origen', d.origen],
                    ['Minigráfica', d.serie ? lecturasDe(d.serie)
                      : d.estado === 'sin señal' ? 'sin lecturas en línea: no hay serie que graficar'
                      : 'variable discreta: no lleva gráfica']]}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded border border-[var(--linea2)] bg-[var(--panel)] px-2.5 py-2 text-left hover:bg-[var(--elevado)]">
                  <MarcaEstado e={d.estado} tamano={11} />
                  <span className="min-w-0 flex-1">
                    <small className="block font-mono text-[10px] text-[var(--tinta3)]">{d.tag}</small>
                    <b className="block truncate text-[11.5px] font-medium">{d.tipo}</b>
                    <small className="block text-[10px] text-[var(--tinta3)]">{d.origen} · límite {d.limite}</small>
                  </span>
                  {nivel === 'operacion' ? null : d.serie
                    ? <Sparkline serie={d.serie.valores} limite={banda(d.limite)} ancho={96} alto={26} prioridad={DE_ESTADO[d.estado] ?? undefined} />
                    : <span className="font-cond w-[96px] text-center text-[9.5px] leading-tight text-[var(--tinta3)]">
                        {d.estado === 'sin señal' ? <>SIN LECTURA<br />EN LÍNEA</> : <>VARIABLE DISCRETA<br />SIN GRÁFICA</>}
                      </span>}
                  <span className="tabular w-[84px] shrink-0 text-right">
                    {/* El estado lo lleva la forma al inicio de la fila: el valor, en tinta. */}
                    <b className={cn('block text-[14px] leading-tight', d.estado === 'sin señal' && 'text-[var(--tinta3)]')}>
                      {d.estado === 'sin señal' ? '—' : num(d.valor)}
                    </b>
                    <small className="text-[9.5px] text-[var(--tinta3)]">{d.unidad || d.estado}</small>
                  </span>
                </Tip>
              ))}
            </div>

            {disp.some(d => d.estado === 'sin señal') && (
              <div className="mt-2">
                <Hueco>
                  Hay dispositivos <b>sin señal</b>: su último valor es de una ruta manual, no de una
                  lectura en línea. No se estima el valor faltante.
                </Hueco>
              </div>
            )}

            {historia && nivel === 'operacion' && historia.eventos[0] && (
              <p className="mt-3 text-[11.5px] text-[var(--tinta2)]">
                La última vez paró el {fechaHora(historia.eventos[0].inicio)}: {historia.eventos[0].causa.parte ? NOMBRE_PARTE[historia.eventos[0].causa.parte].toLowerCase() : historia.eventos[0].causa.texto.toLowerCase()}.
              </p>
            )}
            {historia && nivel === 'ingenieria' && (
              <>
                <h3 className="font-cond mb-1.5 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
                  HISTORIA DEL PLC · LO QUE SE LE CARGÓ
                </h3>
                {historia.bomba && (
                  <p className="mb-1.5 text-[11.5px] text-[var(--tinta2)]">
                    <b className="text-[var(--tinta)]">{historia.bomba.fallas} fallas</b> en {n0(historia.bomba.dias / 30.4)} meses
                    {historia.bomba.mtbfDias ? `, una cada ${n0(historia.bomba.mtbfDias)} días` : ''}
                    {historia.bomba.mdtH ? `, ${fmtHoras(historia.bomba.mdtH, true)} fuera en promedio` : ''}.
                    {historia.bomba.porParte.length > 0 && ` Por parte: ${historia.bomba.porParte.map(x => `${NOMBRE_PARTE[x.parte].toLowerCase()} ${x.fallas}`).join(', ')}.`}
                  </p>
                )}
                {historia.eventos.length === 0 ? (
                  <p className="text-[11.5px] text-[var(--tinta2)]">Ningún pozo se ha cerrado por este equipo en la historia que hay.</p>
                ) : (
                  <>
                    <p className="mb-1 text-[11.5px] text-[var(--tinta2)]">
                      {historia.eventos.length} {historia.eventos.length === 1 ? 'evento' : 'eventos'} con pozos cerrados ·{' '}
                      <b className="tabular text-[var(--tinta)]">{n0(historia.eventos.reduce((a, x) => a + x.bbl, 0))} bbl</b> en total
                    </p>
                    {historia.eventos.slice(0, 6).map(x => (
                      <div key={x.id} className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--linea2)] py-1 text-[11px] last:border-0">
                        <span className="min-w-0">
                          <b className="tabular">{fechaHora(x.inicio)}</b>
                          <span className="text-[var(--tinta3)]"> · {x.fin ? fmtHoras(horasEntre(x.inicio, x.fin), true) : `sigue · ${fmtHoras(horasEntre(x.inicio, AHORA), true)}`} · {x.pozos} {x.pozos === 1 ? 'pozo' : 'pozos'}</span>
                          <small className="block truncate text-[10.5px] text-[var(--tinta2)]">{x.causa.parte ? `${NOMBRE_PARTE[x.causa.parte]} · ` : ''}{x.causa.texto} ({COMO[x.causa.como]})</small>
                        </span>
                        <b className="tabular">{n0(x.bbl)} bbl</b>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {puedeHacer(rol.puede, 'causa:declarar') && rol.pantallas.includes('causa')
                && preguntas.some(p => p.pide && p.equipo === eq.id) && (
                <Boton variante="principal" onClick={() => { abrirEquipo(null); setPantalla('causa') }}>
                  Identificar qué se dañó
                </Boton>
              )}
              {nivel === 'ingenieria' && disp[0] && <Boton onClick={() => setCadenaTag(disp[0]!.tag)}>Ver la cadena del dato</Boton>}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
