import type { ReactNode } from 'react'
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
import { MarcaPrioridad, MarcaCondicion } from '@/shared/ui/Prioridad'
import { DE_ESTADO } from '@/shared/lib/prioridad'
import { Analogico } from '@/shared/ui/Analogico'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { causaEnPapel } from '@/shared/ui/papel'
import { Tip } from '@/shared/ui/Tip'
import { n0, n1, decimalesDe, plural } from '@/shared/lib/formato'
import { BloqueParte } from '@/widgets/bombas/BloqueParte'
import { fmtHoras, fraseParte, fraseParteCorta } from '@/widgets/bombas/comun'
import { ESTADO_PARTE } from '@/entities/salud'
import { sevPozo, cerradoPorOtro, senalesParaOperar } from './estado'
import { desplazable } from '@/shared/ui/alFinal'

/** Un pozo de punta a punta: cómo está ahora y por qué, de dónde sale su
 *  caudal (cadena de custodia), qué le costó cada evento y, si tiene
 *  electrosumergible, la salud de cada parte y su historia de fallas. */
export function DetallePozo({ campoId, pozoId, desde, hasta, nombrePeriodo, volverA, onVolver }: {
  campoId: string; pozoId: string; desde: Date; hasta: Date; nombrePeriodo: string
  /** Sin él, no hay «volver»: en el nivel 3 se sube por las migas (C4). */
  volverA?: string; onVolver?: () => void
}) {
  const rol = useRol(); const setPantalla = useApp(s => s.setPantalla), abrirEquipo = useApp(s => s.abrirEquipo)
  // Operación: estado, causa, partes que avisan y eventos. Ingeniería: además
  // las pruebas (custodia), todas las señales y la historia de fallas.
  const ing = useNivel() === 'ingenieria'
  const det = usePozo(campoId, pozoId, desde, hasta)

  const volver = volverA && onVolver && (
    <button onClick={onVolver} className="mb-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-[14px] text-[var(--tinta2)] hover:text-[var(--tinta)]">
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
  // Lo que falta identificar, como etiqueta, con la regla del motor
  // (estadoIdentificacion): el pozo que cerró otro equipo sí sabe por qué
  // paró; lo que falta es la parte de ese equipo.
  const porIdentificar = (c: NonNullable<typeof f.causa>, fin: string | null, otro: boolean) =>
    estadoIdentificacion(c, fin).pide ? (otro ? 'parte por identificar' : 'sin identificar') : undefined
  // El período, corto: en la ficha el panel tapa el selector de la cabecera.
  const periodo = nombrePeriodo.toLowerCase()
  const sinPunto = (t: string) => t.replace(/\.\s*$/, '')
  const anormal = (e: string) => e === 'fallo' || e === 'fuera' || e === 'avisa'

  return (
    <>
      {volver}
      <div className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
          <MarcaPrioridad s={sev} tamano={18} className="mt-0.5" />
          <span className="min-w-0 flex-1">
            <b className="block text-[16px] leading-tight">Pozo {p.id}</b>
            <small className="font-mono text-[13px] text-[var(--tinta3)]">
              {campoPorId(campoId).nombre} · {LEVANTAMIENTO_NOMBRE[p.levantamiento]} · {p.controlador} · alimentador {p.alimentador}
            </small>
          </span>
          <span className="flex flex-wrap gap-1">
            <Chip tono={f.produce ? 'neutro' : 'fuerte'}>{!f.produce ? 'parado' : f.hz ? `a ${n1(f.hz)} Hz` : 'produciendo'}</Chip>
            {ing && p.origen !== 'instrumento' && <Chip tono={p.origen === 'estimado' ? 'neutro' : 'fuerte'}>{p.origen === 'estimado' ? 'prueba estimada' : 'sin prueba'}</Chip>}
          </span>
        </div>
        {/* Desde cuándo, quién y qué falta, a la vista; la frase de la señal, el código y a quién se carga, en el ⓘ. */}
        {f.evento && f.causa && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[14px] text-[var(--tinta2)]">
            <span>desde {fechaHora(new Date(f.evento.inicio))} ·</span>
            {/* Quién, qué falta y el ⓘ van juntos: en el teléfono el ⓘ no queda solo en su renglón. */}
            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {f.causa.tipo !== 'pendiente' && <b className="text-[var(--tinta)]">{porOtro ? `${f.produce ? '' : 'cerrado '}por ${f.causa.equipo}` : TIPO_CAUSA[f.causa.tipo].toLowerCase()}</b>}
              {f.causa.parte && <span>{NOMBRE_PARTE[f.causa.parte].toLowerCase()}</span>}
              {porIdentificar(f.causa, f.evento.fin, porOtro) && <Chip>{porIdentificar(f.causa, f.evento.fin, porOtro)}</Chip>}
              <Info titulo={f.produce ? 'Por qué está frenado' : 'Por qué paró'}
                texto={`${sinPunto(f.causa.texto)}. Código ${f.evento.codigo} (${CODIGO[f.evento.codigo]}). Se le carga a ${f.causa.equipo} (${COMO[f.causa.como]}).`}
                textoEnPapel={`${sinPunto(causaEnPapel(f.causa))}. Código ${f.evento.codigo} (${CODIGO[f.evento.codigo]}). Se le carga a ${f.causa.equipo} (${COMO[f.causa.como]}).`} />
            </span>
          </p>
        )}
        <div className="mt-3 grid gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
          <Cifra rotulo="Crudo asignado" valor={p.pruebas.length ? `${n0(f.crudoBpd)} bbl/d` : 'sin prueba'}
            info={p.pruebas.length ? { titulo: 'Crudo asignado', texto: 'Prueba vigente × factor de asignación del mes.' }
              : { titulo: 'Sin prueba', texto: 'No se le inventa caudal: sin prueba no hay de dónde sacarlo.' }} />
          {ing && <Cifra rotulo="Agua" valor={p.pruebas.length ? `${n0(f.aguaBpd)} bbl/d` : '—'}
            pie={f.crudoBpd + f.aguaBpd > 0 ? `corte ${n0((f.aguaBpd / (f.aguaBpd + (f.prueba?.crudoBpd ?? 0))) * 100)} %` : ''} />}
          <Cifra rotulo={`Diferido · ${periodo}`} valor={`${n0(f.diferido)} bbl`}
            pie={`${f.eventos} ${f.eventos === 1 ? 'evento' : 'eventos'} · ${fmtHoras(f.horasParado, true)} equivalentes parado`} />
          {historial && ing && (
            <Cifra rotulo={`Electrosumergible · ${n0(historial.dias / 30.4)} meses`}
              valor={plural(historial.fallas, 'falla', 'fallas')}
              pie={`${plural(historial.disparos, 'disparo', 'disparos')}${historial.mtbfDias ? ` · 1 falla cada ${n0(historial.mtbfDias)} d` : ''}`}
              info={{ titulo: 'Fallas y disparos', texto: `Un disparo es una parada que vuelve a arrancar en menos de ${DISPARO_MAX_H} h: no es una falla. La falla es la que obliga a sacar el equipo del pozo.` }} />
          )}
        </div>
      </div>

      {ident?.pide && !f.evento?.fin && !porOtro && volverA && (
        // «No arrancar» es un bloqueo de procedimiento: franja en tinta con ⊘, nunca amarilla (X5 §5.6).
        <div className="mb-2.5 flex flex-wrap items-center gap-3 rounded-[16px] bg-[var(--panel)] p-3 shadow-[inset_0_0_0_2px_var(--tinta)]" data-bloqueo>
          <MarcaCondicion c="bloqueo" tamano={20} decorativa />
          {/* «Ninguna señal lo explica» lo dice la etiqueta «sin identificar» de arriba. */}
          <span className="min-w-0 flex-1 text-[16px]"><b>No arrancar hasta identificar por qué paró.</b></span>
          {rol.pantallas.includes('causa') && <Boton variante="principal" onClick={() => setPantalla('causa')}>Identificar</Boton>}
        </div>
      )}
      {/* Por qué paró ESTE pozo sí se sabe (lo dice la línea de arriba, con
          «parte por identificar»): lo que falta es la parte del equipo que lo
          cerró, y eso se identifica allá. */}
      {ident?.pide && !f.evento?.fin && porOtro && f.causa && (
        <div className="mb-2.5 flex flex-wrap items-center gap-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-3 text-[14px] shadow-[var(--sombra)]">
          <span className="min-w-0 flex-1">Vuelve cuando <b>{f.causa.equipo}</b> arranque.</span>
          <Boton onClick={() => abrirEquipo(f.causa!.equipo)}>Ver {f.causa.equipo}</Boton>
        </div>
      )}

      {partes.length > 0 && !ing && (
        <Panel className="mb-2.5" titulo="PARTES QUE AVISAN">
          {partes.filter(sp => anormal(sp.estado)).map(sp => (
            <div key={sp.parte.id} className="border-b border-[var(--linea2)] py-2 text-[14px] last:border-0">
              <span className="flex flex-wrap items-center gap-x-2"><MarcaPrioridad s={sp.prioridad} tamano={12} /><b>{sp.parte.nombre}</b><Chip tono={sp.estado === 'avisa' ? 'neutro' : 'fuerte'}>{ESTADO_PARTE[sp.estado]}</Chip></span>
              {/* Qué señal y cuándo, en corto; la frase entera (rango, señales que coinciden) en el globo y en el papel. */}
              {fraseParteCorta(sp) && <Tip as="span" titulo={sp.parte.nombre} filas={[]} pista={fraseParte(sp)} imprimir="pista"
                className="mt-0.5 flex min-h-6 items-center text-[13px] text-[var(--tinta2)] sm:min-h-0">{fraseParteCorta(sp)}</Tip>}
              <span className="mt-0.5 flex flex-wrap"><Info rotulo="qué hacer" titulo={`Qué hacer · ${sp.parte.nombre}`} texto={sp.parte.accion} /></span>
            </div>
          ))}
          {!partes.some(sp => anormal(sp.estado)) && <p className="text-[14px] text-[var(--tinta2)]">Ninguna parte avisa.</p>}
        </Panel>
      )}

      {partes.length > 0 && ing && (
        <Panel className="mb-2.5" titulo="SALUD POR PARTE">
          <Lectura>
            Las partes de la electrosumergible con lo que las anuncia en el variador y en el sensor de
            fondo. Los límites son los ajustes de protección del variador del pozo: configuración del
            pozo, no un número de TRIM.
          </Lectura>
          {partes.map(sp => <BloqueParte key={sp.parte.id} sp={sp} h={historial?.porParte.find(x => x.parte === sp.parte.id)} />)}
        </Panel>
      )}

      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        {/* Ingeniería ve todas las señales; operación, solo lo anormal y con su
            nombre: fuera de banda por un lado, sin señal (con el pozo produciendo)
            por otro. Sin señal con el pozo parado es lo esperado y no se repite. */}
        {[
          // Con el pozo parado, la falta de lectura es lo esperado (senalesParaOperar): se dice una vez, arriba.
          { titulo: 'SEÑALES DEL POZO', extra: !f.produce && senales.some(s => s.valor === null) ? 'sin lectura: motor parado' : undefined, lista: ing ? senales : [] },
          { titulo: 'FUERA DE BANDA', extra: undefined, lista: ing ? [] : paraOperar.fuera },
          { titulo: 'SIN SEÑAL', extra: 'con el pozo produciendo', lista: ing ? [] : paraOperar.sinSenal },
        ].filter(g => g.lista.length > 0).map(g => (
          <Panel key={g.titulo} titulo={g.titulo} extra={g.extra}>
            {g.lista.map(s => (
              <div key={s.tag} className="border-b border-[var(--linea2)] py-2 last:border-0">
                {/* El tag sin la variable (ya es el nombre): «PIT-LC14 · sensor de fondo». Sin lectura con
                    el pozo parado, el porqué ya va en el título del panel; produciendo, va entero en la fila. */}
                <Analogico detalle nombre={s.plantilla.nombre} sub={`${s.tag.split(' · ')[0]} · ${!f.produce && s.valor === null ? s.origen.split(' · ')[0] : s.origen}`} valor={s.valor} unidad={s.unidad}
                  normal={s.normal} alarma={s.alarma} decimales={decimalesDe(s.serie?.valores, s.valor)} estado={DE_ESTADO[s.estado] ?? undefined} />
              </div>
            ))}
          </Panel>
        ))}
        {ing && <Panel titulo="PRUEBAS" extra={p.pruebas.length || 'sin custodia'}>
          <Lectura>
            De dónde sale su caudal: la prueba vigente (del separador de prueba o estimada desde la
            electrosumergible) por el factor de asignación del mes. «vigente · N d» es su edad.
          </Lectura>
          {p.pruebas.length === 0 ? (
            <Hueco>
              <span className="flex flex-wrap items-center gap-x-1">
                <b>Sin prueba:</b> hay que probarlo.
                <Info titulo="Sin prueba" texto="Su crudo llega al punto de medición oficial pero nadie lo asigna: sube el factor del campo y su diferido no se puede calcular." />
              </span>
            </Hueco>
          ) : (
            <>
              {/* De dónde sale la prueba, en corto; los instrumentos (o cómo se estima), en el ⓘ. */}
              {p.fuentePrueba && <p className="mb-1.5 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta2)]">
                {p.fuentePrueba.split(/ · |: /)[0]}
                {p.fuentePrueba.split(/ · |: /).length > 1 && <Info titulo="De dónde sale la prueba" texto={p.fuentePrueba} />}
              </p>}
              <div {...desplazable(`Pruebas del pozo ${p.id}`)} className="overflow-x-auto">
                <table className="tabular w-full min-w-[320px] text-left text-[13px]">
                  <thead className="text-[12px] text-[var(--tinta3)]">
                    <tr><th className="py-1 font-normal">Fecha</th><th className="text-right font-normal">Crudo bbl/d</th>
                      <th className="text-right font-normal">Agua bbl/d</th><th className="text-right font-normal">Corte</th>{p.levantamiento === 'electrosumergible' && <th className="text-right font-normal">Hz</th>}</tr>
                  </thead>
                  <tbody>
                    {[...p.pruebas].reverse().map(x => (
                      <tr key={x.fecha} className="border-t border-[var(--linea2)]">
                        <td className="py-1">{fechaCorta(new Date(x.fecha))}{x === f.prueba && <span className="ml-1"><Chip>vigente{f.diasDesdePrueba !== undefined ? ` · ${n0(f.diasDesdePrueba)} d` : ''}</Chip></span>}</td>
                        <td className="text-right">{n0(x.crudoBpd)}</td>
                        <td className="text-right">{n0(x.aguaBpd)}</td>
                        <td className="text-right">{n0((x.aguaBpd / (x.aguaBpd + x.crudoBpd)) * 100)} %</td>
                        {p.levantamiento === 'electrosumergible' && <td className="text-right">{x.hz !== undefined ? n1(x.hz) : '—'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>}
      </div>

      <Panel titulo="EVENTOS" extra={tramos.length ? `${tramos.length} · ${periodo}` : periodo}>
        <Lectura>
          Cada vez que el controlador del pozo lo apagó o le bajó la frecuencia, con la hora del PLC, la
          causa que dijeron las señales y lo que costó: prueba × factor del mes × horas. Toque o pase el
          cursor por un evento para ver la frase de la señal, cómo se identificó y el código.
        </Lectura>
        {tramos.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Ningún evento.</p>}
        {tramos.map(t => {
          // La hora es la del PLC (el evento), no la del tramo: si el evento empezó
          // antes del período (o sigue después), el tramo se recorta y se dice.
          const plc = new Date(t.evento.inicio)
          const recortado = t.inicio.getTime() > plc.getTime() || (!!t.evento.fin && t.fin.getTime() < Date.parse(t.evento.fin))
          return (
          <Tip key={t.evento.id} titulo={`${fechaHora(plc)} · ${TIPO_CAUSA[t.causa.tipo]}`} pista={t.causa.texto} pistaEnPapel={causaEnPapel(t.causa)} imprimir="todo"
            filas={[['Se le carga a', t.causa.equipo], ['Cómo se identificó', COMO[t.causa.como]], ['Código', `${t.evento.codigo} (${CODIGO[t.evento.codigo]})`],
              ...(recortado ? [['En el período', `${fechaHora(t.inicio)} · ${fmtHoras(t.horas, true)}`] as [string, string]] : [])]}
            claseImpresion="border-b border-[var(--linea2)] pb-1.5 last:border-0"
            className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--linea2)] py-2 text-[14px] last:border-0 print:border-b-0 [&:has(+.solo-impresion:last-child)]:border-0">
            <span className="min-w-0">
              <b className="tabular">{fechaHora(plc)}</b>
              <span className="text-[var(--tinta3)]"> · {t.abierto ? 'sigue' : recortado ? '' : fmtHoras(t.horas, true)}{recortado ? `${t.abierto ? ' · ' : ''}${fmtHoras(t.horas, true)} en el período` : ''} · </span>
              <span className="font-mono text-[13px]">{t.evento.codigo}</span>
              {t.evento.hz !== undefined && <span className="text-[var(--tinta3)]"> a {n1(t.evento.hz)} Hz</span>}
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[var(--tinta2)]">
                {t.causa.tipo !== 'pendiente' && <b className="text-[var(--tinta)]">{t.causa.equipo !== p.id ? `por ${t.causa.equipo}` : TIPO_CAUSA[t.causa.tipo]}</b>}
                {t.causa.parte && <span>{NOMBRE_PARTE[t.causa.parte].toLowerCase()}</span>}
                {porIdentificar(t.causa, t.evento.fin, t.causa.equipo !== p.id) && <Chip>{porIdentificar(t.causa, t.evento.fin, t.causa.equipo !== p.id)}</Chip>}
              </span>
            </span>
            <span className="tabular text-right">
              <b className="block">{n0(t.bbl)} bbl</b>
              <small className="text-[12px] text-[var(--tinta3)]">{t.aproximado ? 'aproximado' : t.sinCustodia ? 'sin custodia' : ing ? `±${n0(t.sesgo * 100)} %` : ''}</small>
            </span>
          </Tip>
          )
        })}
      </Panel>
    </>
  )
}

function Cifra({ rotulo, valor, pie, info }: { rotulo: ReactNode; valor: string; pie?: string; info?: { titulo: string; texto: string } }) {
  return (
    <span className="min-w-0">
      {/* El ⓘ va junto al rótulo, nunca dentro de un título; en el papel su nota ocupa su renglón. */}
      <small className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta3)]">{rotulo}{info && <Info titulo={info.titulo} texto={info.texto} />}</small>
      <b className="tabular block text-[19px] leading-tight">{valor}</b>
      {pie && <small className="block text-[13px] leading-snug text-[var(--tinta2)]">{pie}</small>}
    </span>
  )
}
