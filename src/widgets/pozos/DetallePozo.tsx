import { ArrowLeft } from 'lucide-react'
import { useApp, useRol, useNivel } from '@/app/store'
import { usePozo } from '@/shared/api/diferidos'
import { LEVANTAMIENTO_NOMBRE, CODIGO } from '@/entities/pozos'
import { COMO, TIPO_CAUSA } from '@/entities/causa-senal'
import { estadoIdentificacion } from '@/entities/causa-senal'
import { campoPorId } from '@/entities/campos'
import { NOMBRE_PARTE } from '@/entities/partes'
import { DISPARO_MAX_H } from '@/entities/libro'
import { fechaHora, fechaCorta } from '@/entities/reloj'
import { Panel, Chip, Hueco, Boton } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { DE_ESTADO } from '@/shared/lib/prioridad'
import { Analogico } from '@/shared/ui/Analogico'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n1, decimalesDe, plural } from '@/shared/lib/formato'
import { BloqueParte } from '@/widgets/bombas/BloqueParte'
import { fmtHoras, fraseParte } from '@/widgets/bombas/comun'
import { ESTADO_PARTE } from '@/entities/salud'
import { sevPozo, cerradoPorOtro, senalesParaOperar } from './estado'
import { desplazable } from '@/shared/ui/alFinal'

/** Un pozo de punta a punta: cómo está ahora y por qué, de dónde sale su
 *  caudal (cadena de custodia), qué le costó cada evento y, si tiene
 *  electrosumergible, la salud de cada parte y su historia de fallas. */
export function DetallePozo({ campoId, pozoId, desde, hasta, nombrePeriodo, volverA, onVolver }: {
  campoId: string; pozoId: string; desde: Date; hasta: Date; nombrePeriodo: string; volverA: string; onVolver: () => void
}) {
  const rol = useRol(); const setPantalla = useApp(s => s.setPantalla), abrirEquipo = useApp(s => s.abrirEquipo)
  // Operación: estado, causa, partes que avisan y eventos. Ingeniería: además
  // las pruebas (custodia), todas las señales y la historia de fallas.
  const ing = useNivel() === 'ingenieria'
  const det = usePozo(campoId, pozoId, desde, hasta)

  const volver = (
    <button onClick={onVolver} className="mb-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-[12px] text-[var(--tinta2)] hover:text-[var(--tinta)]">
      <ArrowLeft className="size-3.5" /> {volverA}
    </button>
  )
  if (!det) return <>{volver}<Hueco>No hay un pozo {pozoId} en {campoPorId(campoId).nombre}.</Hueco></>

  const { fila: f, tramos, partes, senales, historial } = det
  const p = f.pozo
  const ident = f.causa && f.evento ? estadoIdentificacion(f.causa, f.evento.fin) : undefined
  // La misma regla que la lista (ISA-18.2): un pozo que cerró otro equipo es
  // consecuencia y va en gris; la alarma es de quien lo cerró.
  const sev = sevPozo(f)
  const porOtro = cerradoPorOtro(f)
  const paraOperar = senalesParaOperar(senales, f.produce)

  return (
    <>
      {volver}
      <div className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
          <MarcaPrioridad s={sev} tamano={18} className="mt-0.5" />
          <span className="min-w-0 flex-1">
            <b className="block text-[16px] leading-tight">Pozo {p.id}</b>
            <small className="font-mono text-[10.5px] text-[var(--tinta3)]">
              {campoPorId(campoId).nombre} · {LEVANTAMIENTO_NOMBRE[p.levantamiento]} · {p.controlador} · alimentador {p.alimentador}
            </small>
          </span>
          <span className="flex flex-wrap gap-1">
            <Chip tono={f.produce ? 'neutro' : 'fuerte'}>{!f.produce ? 'parado' : f.hz ? `a ${n1(f.hz)} Hz` : 'produciendo'}</Chip>
            {ing && <Chip>{p.origen === 'instrumento' ? 'prueba instrumentada' : p.origen === 'estimado' ? 'prueba estimada' : 'sin prueba'}</Chip>}
          </span>
        </div>
        {f.evento && f.causa && (
          <p className="mt-1.5 text-[12px] text-[var(--tinta2)]">
            Desde {fechaHora(new Date(f.evento.inicio))} · código <span className="font-mono">{f.evento.codigo}</span> ({CODIGO[f.evento.codigo]}) ·{' '}
            <b className="text-[var(--tinta)]">{f.causa.texto}</b> · se le carga a <b className="text-[var(--tinta)]">{f.causa.equipo}</b> ({COMO[f.causa.como]})
          </p>
        )}
        <div className="mt-3 grid gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
          <Cifra rotulo="Crudo asignado" valor={p.pruebas.length ? `${n0(f.crudoBpd)} bbl/d` : 'sin prueba'}
            pie={p.pruebas.length ? 'prueba vigente × factor de asignación del mes' : 'no se le inventa caudal'} />
          {ing && <Cifra rotulo="Agua" valor={p.pruebas.length ? `${n0(f.aguaBpd)} bbl/d` : '—'}
            pie={f.crudoBpd + f.aguaBpd > 0 ? `corte de agua ${n0((f.aguaBpd / (f.aguaBpd + (f.prueba?.crudoBpd ?? 0))) * 100)} %` : ''} />}
          <Cifra rotulo={`Diferido · ${nombrePeriodo}`} valor={`${n0(f.diferido)} bbl`}
            pie={`${f.eventos} ${f.eventos === 1 ? 'evento' : 'eventos'} · ${fmtHoras(f.horasParado, true)} equivalentes parado`} />
          {historial && ing && (
            <Cifra rotulo={`Electrosumergible · ${n0(historial.dias / 30.4)} meses`}
              valor={plural(historial.fallas, 'falla', 'fallas')}
              pie={`${plural(historial.disparos, 'disparo', 'disparos')} de menos de ${DISPARO_MAX_H} h${historial.mtbfDias ? ` · una falla cada ${n0(historial.mtbfDias)} días` : ''}`} />
          )}
        </div>
      </div>

      {ident?.pide && !f.evento?.fin && !porOtro && (
        <div className="mb-2.5 flex flex-wrap items-center gap-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-3 shadow-[var(--sombra)]">
          <MarcaPrioridad s={2} tamano={16} />
          <span className="min-w-0 flex-1 text-[12px]"><b>No arrancar hasta identificar por qué paró.</b> Ninguna señal lo explica.</span>
          {rol.pantallas.includes('causa') && <Boton variante="principal" onClick={() => setPantalla('causa')}>Identificar</Boton>}
        </div>
      )}
      {/* Por qué paró ESTE pozo sí se sabe (lo dice la línea de arriba): lo que
          falta es la parte del equipo que lo cerró, y eso se identifica allá. */}
      {ident?.pide && !f.evento?.fin && porOtro && f.causa && (
        <div className="mb-2.5 flex flex-wrap items-center gap-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-3 text-[12px] shadow-[var(--sombra)]">
          <span className="min-w-0 flex-1">La parte que falló en <b>{f.causa.equipo}</b> está por identificar. Este pozo vuelve cuando ese equipo arranque.</span>
          <Boton onClick={() => abrirEquipo(f.causa!.equipo)}>Ver {f.causa.equipo}</Boton>
        </div>
      )}

      {partes.length > 0 && !ing && (
        <Panel className="mb-2.5" titulo="ELECTROSUMERGIBLE · PARTES QUE AVISAN">
          {partes.filter(sp => sp.estado === 'fallo' || sp.estado === 'fuera' || sp.estado === 'avisa').map(sp => (
            <div key={sp.parte.id} className="border-b border-[var(--linea2)] py-2 text-[12px] last:border-0">
              <span className="flex items-center gap-2"><MarcaPrioridad s={sp.prioridad} tamano={12} /><b>{sp.parte.nombre}</b><Chip>{ESTADO_PARTE[sp.estado]}</Chip></span>
              <small className="mt-0.5 block text-[11px] text-[var(--tinta2)]">{fraseParte(sp)}</small>
              <small className="block text-[11px]"><b>Qué hacer:</b> {sp.parte.accion}</small>
            </div>
          ))}
          {!partes.some(sp => sp.estado === 'fallo' || sp.estado === 'fuera' || sp.estado === 'avisa') && <p className="text-[12px] text-[var(--tinta2)]">Ninguna parte va hacia su límite.</p>}
        </Panel>
      )}

      {partes.length > 0 && ing && (
        <Panel className="mb-2.5" titulo="ELECTROSUMERGIBLE · SALUD POR PARTE" extra="del variador y del sensor de fondo">
          <Lectura>
            Las partes de la electrosumergible con lo que las anuncia en el variador y en el sensor de
            fondo. Los límites son los ajustes de protección del variador del pozo: configuración del
            pozo, no un número de TRIM.
          </Lectura>
          {partes.map(sp => <BloqueParte key={sp.parte.id} sp={sp} h={historial?.porParte.find(x => x.parte === sp.parte.id)} />)}
        </Panel>
      )}

      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        {/* Ingeniería ve todas las señales; operación, solo lo anormal y con su
            nombre: fuera de banda por un lado, sin señal (con el pozo produciendo)
            por otro. Sin señal con el pozo parado es lo esperado y no se repite. */}
        {[
          { titulo: 'SEÑALES DEL VARIADOR Y DEL SENSOR DE FONDO', extra: undefined, lista: ing ? senales : [] },
          { titulo: 'FUERA DE BANDA AHORA', extra: undefined, lista: ing ? [] : paraOperar.fuera },
          { titulo: 'SIN SEÑAL EN LÍNEA', extra: 'el pozo produce y el instrumento no reporta', lista: ing ? [] : paraOperar.sinSenal },
        ].filter(g => g.lista.length > 0).map(g => (
          <Panel key={g.titulo} titulo={g.titulo} extra={g.extra}>
            {g.lista.map(s => (
              <div key={s.tag} className="border-b border-[var(--linea2)] py-2 last:border-0">
                <Analogico detalle nombre={s.plantilla.nombre} sub={`${s.tag} · ${s.origen}`} valor={s.valor} unidad={s.unidad}
                  normal={s.normal} alarma={s.alarma} decimales={decimalesDe(s.serie?.valores, s.valor)} estado={DE_ESTADO[s.estado] ?? undefined} />
              </div>
            ))}
          </Panel>
        ))}
        {ing && <Panel titulo="PRUEBAS · DE DÓNDE SALE SU CAUDAL" extra={p.pruebas.length ? `${p.pruebas.length} pruebas` : 'sin custodia'}>
          {p.pruebas.length === 0 ? (
            <Hueco>
              Este pozo no tiene prueba. Su crudo llega al punto de medición oficial pero nadie lo asigna:
              sube el factor del campo y su diferido no se puede calcular. Hay que probarlo.
            </Hueco>
          ) : (
            <>
              <p className="mb-1.5 text-[11px] text-[var(--tinta2)]">{p.fuentePrueba}</p>
              <div {...desplazable(`Pruebas del pozo ${p.id}`)} className="overflow-x-auto">
                <table className="tabular w-full min-w-[320px] text-left text-[11px]">
                  <thead className="text-[9.5px] text-[var(--tinta3)]">
                    <tr><th className="py-1 font-normal">Fecha</th><th className="text-right font-normal">Crudo bbl/d</th>
                      <th className="text-right font-normal">Agua bbl/d</th><th className="text-right font-normal">Corte</th>{p.levantamiento === 'electrosumergible' && <th className="text-right font-normal">Hz</th>}</tr>
                  </thead>
                  <tbody>
                    {[...p.pruebas].reverse().map(x => (
                      <tr key={x.fecha} className="border-t border-[var(--linea2)]">
                        <td className="py-1">{fechaCorta(new Date(x.fecha))}{x === f.prueba ? <Chip>vigente</Chip> : null}</td>
                        <td className="text-right">{n0(x.crudoBpd)}</td>
                        <td className="text-right">{n0(x.aguaBpd)}</td>
                        <td className="text-right">{n0((x.aguaBpd / (x.aguaBpd + x.crudoBpd)) * 100)} %</td>
                        {p.levantamiento === 'electrosumergible' && <td className="text-right">{x.hz !== undefined ? n1(x.hz) : '—'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {f.diasDesdePrueba !== undefined && <small className="mt-1 block text-[10px] text-[var(--tinta3)]">La vigente tiene {n0(f.diasDesdePrueba)} días.</small>}
            </>
          )}
        </Panel>}
      </div>

      <Panel titulo={`EVENTOS · ${nombrePeriodo.toUpperCase()}`} extra={`${tramos.length} · del controlador del pozo`}>
        <Lectura>
          Cada vez que el controlador apagó el pozo o le bajó la frecuencia, con la hora del PLC, la
          causa que dijeron las señales y lo que costó: prueba × factor del mes × horas.
        </Lectura>
        {tramos.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ningún evento en el período.</p>}
        {tramos.map(t => (
          <div key={t.evento.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--linea2)] py-2 text-[11.5px] last:border-0">
            <span className="min-w-0">
              <b className="tabular">{fechaHora(t.inicio)}</b>
              <span className="text-[var(--tinta3)]"> · {t.abierto ? 'sigue' : fmtHoras(t.horas, true)} · </span>
              <span className="font-mono text-[10.5px]">{t.evento.codigo}</span>
              {t.evento.hz !== undefined && <span className="text-[var(--tinta3)]"> a {n1(t.evento.hz)} Hz</span>}
              <span className="block text-[var(--tinta2)]">
                {t.causa.texto} · <b className="text-[var(--tinta)]">{TIPO_CAUSA[t.causa.tipo]}{t.causa.equipo !== p.id ? ` ${t.causa.equipo}` : ''}</b>
                {t.causa.parte ? ` · ${NOMBRE_PARTE[t.causa.parte].toLowerCase()}` : ''} <span className="text-[var(--tinta3)]">({COMO[t.causa.como]})</span>
              </span>
            </span>
            <span className="tabular text-right">
              <b className="block">{n0(t.bbl)} bbl</b>
              <small className="text-[10px] text-[var(--tinta3)]">{t.aproximado ? 'aproximado' : t.sinCustodia ? 'sin custodia' : ing ? `±${n0(t.sesgo * 100)} %` : ''}</small>
            </span>
          </div>
        ))}
      </Panel>
    </>
  )
}

function Cifra({ rotulo, valor, pie }: { rotulo: string; valor: string; pie: string }) {
  return (
    <span className="min-w-0">
      <small className="block text-[10.5px] text-[var(--tinta3)]">{rotulo}</small>
      <b className="tabular block text-[19px] leading-tight">{valor}</b>
      <small className="block text-[10.5px] leading-snug text-[var(--tinta2)]">{pie}</small>
    </span>
  )
}
