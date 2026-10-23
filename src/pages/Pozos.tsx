import { useState } from 'react'
import { useAmbito, useRango, useNivel } from '@/app/store'
import { perfilDe } from '@/entities/configuracion'
import { usePozos } from '@/shared/api/diferidos'
import { LEVANTAMIENTO_NOMBRE } from '@/entities/pozos'
import { TIPO_CAUSA, ALTO_IMPACTO } from '@/entities/causa-senal'
import type { Severidad } from '@/entities/tipos'
import { ESTADO_PARTE } from '@/entities/salud'
import { campoPorId } from '@/entities/campos'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { causaEnPapel } from '@/shared/ui/papel'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, n1, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { DetallePozo } from '@/widgets/pozos/DetallePozo'
import { sevPozo, sevOrden, cerradoPorOtro } from '@/widgets/pozos/estado'
import type { FilaPozo } from '@/shared/api/diferidos'
import { useSesion } from '@/shared/api/sesion'

type Filtro = 'todos' | 'parados' | 'aviso' | 'custodia'
const FILTROS: Array<[Filtro, string]> = [['todos', 'Todos'], ['parados', 'Parados o frenados'], ['aviso', 'Electrosumergible con aviso'], ['custodia', 'Sin custodia completa']]

/** Los pozos del campo: qué produce cada uno ahora, qué lo tiene parado, de
 *  dónde sale su caudal y cuánto diferido acumuló en el período. */
export function Pozos() {
  const ambito = useAmbito(); const rango = useRango()
  // Sin electrosumergibles en el alcance (perfil firmado), no se habla de ellas.
  const config = useSesion(s => s.ctx.config)
  const conEsp = ambito.campos.some(c => perfilDe(config, c.id).electrosumergibles)
  // La custodia (de dónde sale el caudal) es trabajo de producción; operación
  // ve qué produce cada pozo y qué lo tiene parado.
  const ing = useNivel() === 'ingenieria'
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [abierto, setAbierto] = useState<{ campo: string; pozo: string } | null>(null)
  const ids = ambito.campos.map(c => c.id).join(',')
  const filas = usePozos(ambito.campos.map(c => c.id), rango.desde, rango.hasta)
  // La pantalla no se vuelve a montar al cambiar de campo: el pozo abierto se
  // cierra aquí, al dibujar, para no pintar un pozo de otro campo bajo la
  // cabecera del nuevo (el patrón de React para ajustar estado cuando cambia una prop).
  const [ambitoDelAbierto, setAmbitoDelAbierto] = useState(ids)
  if (ambitoDelAbierto !== ids) { setAmbitoDelAbierto(ids); setAbierto(null) }

  const parados = filas.filter(f => !f.produce)
  const frenados = filas.filter(f => f.produce && f.hz)
  const potencial = filas.reduce((a, f) => a + f.crudoBpd, 0)
  const perdiendo = parados.reduce((a, f) => a + f.crudoBpd, 0)
  const sinPrueba = filas.filter(f => !f.pozo.pruebas.length)
  const estimados = filas.filter(f => f.pozo.origen === 'estimado')
  const aviso = filas.filter(f => f.produce && f.salud && (f.salud.estado === 'fuera' || f.salud.estado === 'avisa'))

  // Un filtro que ya no se ofrece no se queda puesto ni escondido: el de
  // electrosumergibles en un campo sin ellas, o el de custodia para un rol de
  // operación (la pantalla no se vuelve a montar al cambiar de rol).
  const efectivo: Filtro = (filtro === 'aviso' && !conEsp) || (filtro === 'custodia' && !ing) ? 'todos' : filtro
  // La marca de lo que se pierde ahora sale de sus causas, como en Riesgo y en
  // Turno: 1 si alguna es de alto impacto (la reinyección, una electrosumergible),
  // 2 si no (una parada sin identificar, un servicio, la multifásica).
  // Las salvedades de la fila: sin prueba (hueco de custodia: el crudo va «—»),
  // la prueba estimada (lo ve producción) y una electrosumergible produciendo sin dato.
  const salvedad = (f: FilaPozo) => !f.pozo.pruebas.length || (ing && f.pozo.origen !== 'instrumento')
    || (conEsp && f.produce && f.salud?.estado === 'sin-dato')
  const sevPerdida: Severidad = !parados.length ? 0 : parados.some(f => f.causa && ALTO_IMPACTO.includes(f.causa.tipo)) ? 1 : 2
  const ordenadas = filas.filter(f =>
    efectivo === 'parados' ? !f.produce || !!f.hz
      : efectivo === 'aviso' ? aviso.includes(f)
        : efectivo === 'custodia' ? f.pozo.origen !== 'instrumento'
          : true)
    .sort((a, b) => sevOrden(a) - sevOrden(b) || +salvedad(b) - +salvedad(a) || b.diferido - a.diferido)
  // Cinco y «ver N más», pero ningún pozo con marca ni con salvedad queda
  // escondido (ISA-18.2): lo que se esconde es lo normal y lo que cerró otro
  // equipo (gris). Lo que queda va primero también en el papel.
  const lista = useVerMas(ordenadas, { prioridad: f => (sevPozo(f) > 0 || salvedad(f) ? 1 : 9) })

  if (abierto) return (
    <DetallePozo campoId={abierto.campo} pozoId={abierto.pozo} desde={rango.desde} hasta={rango.hasta}
      nombrePeriodo={rango.nombre} volverA="Pozos" onVolver={() => setAbierto(null)} />
  )

  const completos = filas.length - sinPrueba.length - estimados.length
  const pieCustodia = [...(estimados.length ? [plural(estimados.length, 'estimada', 'estimadas')] : []),
    ...(sinPrueba.length ? [`${sinPrueba.length} sin prueba`] : [])].join(' · ') || 'todos con separador'
  // Por qué no produce, en corto. Lo que cerró otro equipo dice quién; el tipo
  // de ese equipo va al globo y, en el papel, escrito.
  const ahora = (f: FilaPozo) => cerradoPorOtro(f)
    ? <>{f.produce ? '' : 'cerrado '}por {f.causa!.equipo}<span className="hidden print:inline"> · {TIPO_CAUSA[f.causa!.tipo].toLowerCase()}</span></>
    : f.causa?.tipo === 'pendiente' ? <Chip>sin identificar</Chip>
      : f.causa ? TIPO_CAUSA[f.causa.tipo].toLowerCase() : 'parado'
  // El levantamiento: el de una electrosumergible ya lo dice su columna.
  const sub = (f: FilaPozo) => [conEsp && f.salud ? '' : LEVANTAMIENTO_NOMBRE[f.pozo.levantamiento], ambito.global ? campoPorId(f.pozo.campoId).nombre : ''].filter(Boolean).join(' · ')
  const anormal = (e: string) => e === 'fuera' || e === 'avisa' || e === 'fallo'

  const filaTabla = (f: FilaPozo) => (
    <tr key={`${f.pozo.campoId}${f.pozo.id}`} onClick={() => setAbierto({ campo: f.pozo.campoId, pozo: f.pozo.id })}
      className="cursor-pointer border-t border-[var(--linea2)] hover:bg-[var(--panel2)]">
      <td className="py-1.5">
        {/* El botón da el foco y el Enter al teclado; su clic sube a la fila, que es la que abre. */}
        <span className="flex items-center gap-1.5">
          <MarcaPrioridad s={sevPozo(f)} tamano={11} />
          <button type="button" aria-label={`Abrir ${f.pozo.id}`} className="cursor-pointer rounded-sm font-mono font-bold">{f.pozo.id}</button>
        </span>
        {sub(f) && <small className="block text-[10px] text-[var(--tinta3)]">{sub(f)}</small>}
      </td>
      <td className="max-w-[240px]">
        {f.produce && !f.hz ? <span className="text-[var(--tinta3)]">produciendo</span> : (
          <Tip titulo={f.causa ? TIPO_CAUSA[f.causa.tipo] : 'Evento abierto'} pista={f.causa?.texto} pistaEnPapel={f.causa ? causaEnPapel(f.causa) : undefined}
            filas={f.causa ? [['Se le carga a', f.causa.equipo], ['Código', f.evento?.codigo ?? '—'], ...f.causa.evidencia.slice(0, 2).map((e, i) => [i ? 'Otra señal' : 'Señal', e] as [string, string])] : []}>
            <span className="block truncate">{f.hz ? `a ${n1(f.hz)} Hz · ` : ''}{ahora(f)}</span>
          </Tip>
        )}
      </td>
      <td className="text-right">{f.pozo.pruebas.length ? n0(f.crudoBpd) : '—'}</td>
      <td className="text-right">{f.pozo.pruebas.length ? n0(f.aguaBpd) : '—'}</td>
      {/* Sin prueba vigente no hay edad que mostrar: un «0 d» afirmaría una prueba de hoy.
          La del separador es lo normal: solo su edad; lo que no, con su etiqueta. */}
      {ing && <td className="whitespace-nowrap">
        {f.diasDesdePrueba === undefined ? <Chip tono="fuerte">sin prueba</Chip>
          : f.pozo.origen === 'instrumento' ? <span className="text-[var(--tinta2)]"><span className="sr-only">separador · </span>{n0(f.diasDesdePrueba)} d</span>
            : f.pozo.origen === 'estimado' ? <Chip>estimada · {n0(f.diasDesdePrueba)} d</Chip>
              : <Chip tono="fuerte">sin prueba</Chip>}
      </td>}
      {conEsp && <td className="max-w-[220px]">{f.salud ? (anormal(f.salud.estado)
        ? <span className="flex min-w-0 items-center gap-1.5"><span className="truncate">{f.salud.parte.nombre.toLowerCase()}</span><Chip tono={f.salud.estado === 'avisa' ? 'neutro' : 'fuerte'}>{ESTADO_PARTE[f.salud.estado]}</Chip></span>
        : <span className="text-[var(--tinta3)]">{ESTADO_PARTE[f.salud.estado]}</span>) : <span className="text-[var(--tinta3)]">—</span>}</td>}
      <td className="text-right"><b>{n0(f.diferido)}</b><small className="block text-[9.5px] text-[var(--tinta3)]">{plural(f.eventos, 'evento', 'eventos')}</small></td>
    </tr>
  )

  return (
    <>
      <div className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <Cifra rotulo="Pozos" valor={`${filas.length - parados.length} de ${filas.length}`} pie={`produciendo · ${plural(frenados.length, 'frenado', 'frenados')}`} />
        <Cifra rotulo="Potencial ahora" valor={`${n0(potencial)} bbl/d`}
          info={{ titulo: 'Potencial ahora', texto: 'La prueba vigente de cada pozo por el factor de asignación del mes.' }} />
        <Cifra rotulo="Perdiéndose ahora" valor={`${n0(perdiendo)} bbl/d`} prioridad={perdiendo > 0 ? sevPerdida : 0}
          pie={parados.length ? plural(parados.length, 'pozo parado', 'pozos parados') : 'ninguno parado'} />
        {ing && <Cifra rotulo="Custodia completa" valor={`${completos} de ${filas.length}`} pie={pieCustodia}
          info={{ titulo: 'Custodia completa', texto: 'Pozos con prueba del separador de prueba. Una estimada sale de la electrosumergible, no de un separador. Un pozo sin prueba no tiene a quién asignarle su crudo: sube el factor del campo y su diferido no se puede calcular.' }} />}
      </div>

      <Lectura>
        El estado de cada pozo lo dice su controlador (variador, controlador de bombeo o válvula de
        cabeza). El crudo sale de su prueba vigente por el factor de asignación del mes; «Prueba» es
        la edad de la vigente, y sin etiqueta es del separador de prueba. «Frenado»: a frecuencia
        reducida. El diferido de cada evento se le carga al equipo que lo causó: un pozo cerrado porque
        paró la reinyección aparece aquí, pero cuenta en la bomba. Primero van los pozos con marca, que
        nunca quedan detrás de «ver más»; toque o haga clic en un pozo para abrirlo.
      </Lectura>

      {/* Son filtros de una misma lista, no pestañas con paneles: botones que dicen si están puestos. */}
      <div className="mb-2 mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar pozos">
        {FILTROS.filter(([id]) => (ing || id !== 'custodia') && (conEsp || id !== 'aviso')).map(([id, nombre]) => (
          <button key={id} type="button" aria-pressed={efectivo === id} onClick={() => setFiltro(id)}
            className={cn('cursor-pointer rounded border px-2.5 py-1 text-[11.5px]', efectivo === id
              ? 'border-[var(--tinta)] bg-[var(--tinta)] text-[var(--superficie)]' : 'border-[var(--linea)] bg-[var(--panel)] hover:bg-[var(--elevado)]')}>
            {nombre}{id === 'parados' ? ` · ${parados.length + frenados.length}` : id === 'aviso' ? ` · ${aviso.length}` : id === 'custodia' ? ` · ${sinPrueba.length + estimados.length}` : ''}
          </button>
        ))}
      </div>

      <Panel titulo="POZOS" extra={ordenadas.length}>
        {/* En el teléfono, una tarjeta por pozo. */}
        <div className="grid gap-1.5 sm:hidden">
          {lista.visibles.map(f => (
            <button key={`m${f.pozo.campoId}${f.pozo.id}`} onClick={() => setAbierto({ campo: f.pozo.campoId, pozo: f.pozo.id })}
              className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-[var(--linea2)] py-2 text-left text-[12px] last:border-0">
              <MarcaPrioridad s={sevPozo(f)} tamano={11} />
              <span className="min-w-0">
                <b className="font-mono">{f.pozo.id}</b>{ambito.global ? <span className="text-[var(--tinta3)]"> · {campoPorId(f.pozo.campoId).nombre}</span> : ''}
                <small className="block truncate text-[11px] text-[var(--tinta2)]">
                  {f.produce && !f.hz ? 'produciendo' : <>{f.hz ? `a ${n1(f.hz)} Hz · ` : ''}{ahora(f)}</>}
                </small>
              </span>
              <span className="tabular text-right">
                <b className="block">{f.pozo.pruebas.length ? n0(f.crudoBpd) : '—'} <small className="font-normal text-[var(--tinta3)]">bbl/d</small></b>
                <small className="text-[10px] text-[var(--tinta3)]">{n0(f.diferido)} bbl diferidos</small>
              </span>
            </button>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="tabular w-full min-w-[760px] text-left text-[11.5px] [&_td]:px-2 [&_th]:px-2">
            <thead className="text-[9.5px] text-[var(--tinta3)]">
              <tr>
                <th className="py-1.5 font-normal">Pozo</th>
                <th className="font-normal">Ahora</th>
                <th className="text-right font-normal">Crudo bbl/d</th>
                <th className="text-right font-normal">Agua bbl/d</th>
                {ing && <th className="font-normal">Prueba</th>}
                {conEsp && <th className="font-normal">Electrosumergible</th>}
                <th className="text-right font-normal">Diferido bbl</th>
              </tr>
            </thead>
            <tbody>{lista.visibles.map(filaTabla)}</tbody>
            {/* Lo que «ver más» esconde sale en el papel: una lista cortada en silencio engaña. */}
            {lista.resto.length > 0 && <tbody className="hidden print:table-row-group">{lista.resto.map(filaTabla)}</tbody>}
          </table>
        </div>
        <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
      </Panel>
    </>
  )
}

function Cifra({ rotulo, valor, pie, prioridad = 0, info }: { rotulo: string; valor: string; pie?: string; prioridad?: Severidad; info?: { titulo: string; texto: string } }) {
  return (
    <span className="min-w-0">
      {/* El ⓘ va junto al rótulo, nunca dentro de un título; en el papel su nota ocupa su renglón. */}
      <small className="flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">{rotulo}{info && <Info titulo={info.titulo} texto={info.texto} />}</small>
      {/* ISA-101: el color de alarma va siempre con su forma, y solo en prioridad 1. */}
      <b className={cn('tabular flex items-center gap-1.5 text-[20px] leading-tight', prioridad === 1 && 'text-[var(--p1)]')}>{prioridad > 0 && <MarcaPrioridad s={prioridad} tamano={14} />}{valor}</b>
      {pie && <small className="block text-[10.5px] leading-snug text-[var(--tinta2)]">{pie}</small>}
    </span>
  )
}
