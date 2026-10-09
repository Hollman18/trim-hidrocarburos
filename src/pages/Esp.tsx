import { useState } from 'react'
import { useAmbito, useRango, useNivel } from '@/app/store'
import { useFlotaEsp, useLibro } from '@/shared/api/diferidos'
import { TIPO_CAUSA } from '@/entities/causa-senal'
import { ESTADO_PARTE } from '@/entities/salud'
import { NOMBRE_PARTE } from '@/entities/partes'
import { DISPARO_MAX_H } from '@/entities/libro'
import { campoPorId } from '@/entities/campos'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, n1, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { DetallePozo } from '@/widgets/pozos/DetallePozo'
import { sevPozo, cerradoPorOtro } from '@/widgets/pozos/estado'
import { fraseParte, fraseParteCorta, fmtHoras } from '@/widgets/bombas/comun'
import type { FilaEsp } from '@/shared/api/diferidos'

/** La flota de electrosumergibles: el otro equipo de alto impacto. Cuál está
 *  por fallar y qué parte, cuánto crudo pone en juego, y cada cuánto falla
 *  cada una. Todo sale del variador y del sensor de fondo de cada pozo. */
export function Esp() {
  const ambito = useAmbito(); const rango = useRango(); const nivel = useNivel()
  const ing = nivel === 'ingenieria'
  const ids = ambito.campos.map(c => c.id)
  const flota = useFlotaEsp(ids, rango.desde, rango.hasta)
  const lb = useLibro({ campos: ids, desde: rango.desde, hasta: rango.hasta })
  const [abierto, setAbierto] = useState<{ campo: string; pozo: string } | null>(null)
  // La pantalla no se vuelve a montar al cambiar de campo: el pozo abierto se
  // cierra aquí, al dibujar, para no pintar un pozo de otro campo bajo la
  // cabecera del nuevo (el patrón de React para ajustar estado cuando cambia una prop).
  const claveAmbito = ids.join(',')
  const [ambitoDelAbierto, setAmbitoDelAbierto] = useState(claveAmbito)
  if (ambitoDelAbierto !== claveAmbito) { setAmbitoDelAbierto(claveAmbito); setAbierto(null) }

  const primera = (x: FilaEsp) => x.partes.find(p => p.primera)?.primera?.senal.pronostico.horas ?? Infinity
  // Primero lo que falló por sí mismo; lo cerrado por otro equipo es
  // consecuencia y va después de lo que avisa.
  const orden = (x: FilaEsp) => {
    if (!x.fila.produce) return cerradoPorOtro(x.fila) ? 3 : 0
    const peor = x.partes[0]
    return peor?.estado === 'fuera' ? 1 : peor?.estado === 'avisa' ? 2 : 4
  }
  // Cinco y «ver N más»; ninguna con marca queda escondida (ISA-18.2), ni una
  // que produce sin dato de sus partes (dato inválido). Las que quedan van
  // primero, para que la pantalla y el papel tengan el mismo orden.
  const queda = (x: FilaEsp) => sevPozo(x.fila) > 0 || (x.fila.produce && x.partes[0]?.estado === 'sin-dato')
  const filas = [...flota].sort((a, b) => +queda(b) - +queda(a) || orden(a) - orden(b) || primera(a) - primera(b) || b.fila.crudoBpd - a.fila.crudoBpd)
  const lista = useVerMas(filas, { prioridad: x => (queda(x) ? 1 : 9) })

  if (abierto) return (
    <DetallePozo campoId={abierto.campo} pozoId={abierto.pozo} desde={rango.desde} hasta={rango.hasta}
      nombrePeriodo={rango.nombre} volverA="Electrosumergibles" onVolver={() => setAbierto(null)} />
  )

  if (!flota.length) return (
    <Panel titulo="ELECTROSUMERGIBLES"><p className="text-[12px] text-[var(--tinta2)]">{ambito.titulo} no tiene pozos con electrosumergible.</p></Panel>
  )

  const enFalla = flota.filter(x => !x.fila.produce && x.fila.causa?.tipo === 'electrosumergible')
  const avisan = flota.filter(x => x.fila.produce && x.partes.some(p => p.estado === 'fuera' || p.estado === 'avisa'))
  const enJuego = avisan.reduce((a, x) => a + x.fila.crudoBpd, 0)
  const perdiendo = enFalla.reduce((a, x) => a + x.fila.crudoBpd, 0)
  const fallas = flota.reduce((a, x) => a + x.historial.fallas, 0)
  const disparos = flota.reduce((a, x) => a + x.historial.disparos, 0)
  const dias = flota[0]!.historial.dias
  const mtbfFlota = fallas ? (dias * flota.length) / fallas : undefined
  const diferidoEsp = lb.porTipo.find(t => t.tipo === 'electrosumergible')?.bbl ?? 0
  const partesEsp = lb.porParte.filter(p => p.familia === 'electrosumergible')

  const abrirFila = (campo: string, pozo: string) => setAbierto({ campo, pozo })
  const algunaParada = flota.some(x => !x.fila.produce)
  const avisa = (e?: string) => e === 'fuera' || e === 'avisa'

  const filaTabla = (x: FilaEsp) => {
    const f = x.fila
    const peor = x.partes[0]
    const parado = !f.produce
    return (
      <tr key={`${f.pozo.campoId}${f.pozo.id}`} onClick={() => abrirFila(f.pozo.campoId, f.pozo.id)}
        className="cursor-pointer border-t border-[var(--linea2)] hover:bg-[var(--panel2)]">
        <td className="py-1.5">
          {/* El botón da el foco y el Enter al teclado; su clic sube a la fila, que es la que abre. */}
          <span className="flex items-center gap-1.5"><MarcaPrioridad s={sevPozo(f)} tamano={11} /><button type="button" aria-label={`Abrir ${f.pozo.id}`} className="cursor-pointer rounded-sm font-mono font-bold">{f.pozo.id}</button></span>
          <small className="block text-[10px] text-[var(--tinta3)]">{ambito.global ? `${campoPorId(f.pozo.campoId).nombre}` : ''}{f.prueba?.hz ? `${ambito.global ? ' · ' : ''}${n1(f.hz ?? f.prueba.hz)} Hz` : ''}</small>
        </td>
        <td className="max-w-[340px]">
          {parado && cerradoPorOtro(f) ? (
            <span className="block truncate text-[var(--tinta3)]">cerrado por {f.causa!.equipo}</span>
          ) : parado ? (
            <span className="block truncate">{f.causa?.tipo === 'pendiente' ? <Chip>sin identificar</Chip>
              : f.causa ? `parado · ${f.causa.parte ? NOMBRE_PARTE[f.causa.parte].toLowerCase() : TIPO_CAUSA[f.causa.tipo].toLowerCase()}` : 'parado'}</span>
          ) : peor && avisa(peor.estado) ? (
            // La parte y su estado a la vista; qué señal y cuándo, en corto; la frase entera, en el globo y en el papel.
            <Tip as="span" titulo={`${f.pozo.id} · ${peor.parte.nombre}`} filas={[['Estado', ESTADO_PARTE[peor.estado]]]} pista={fraseParte(peor)} imprimir="pista"
              className="flex min-w-0 items-center gap-1.5 text-[var(--tinta)]">
              <b className="shrink-0">{peor.parte.nombre}</b>
              <span className="shrink-0 whitespace-nowrap"><Chip tono={peor.estado === 'fuera' ? 'fuerte' : 'neutro'}>{ESTADO_PARTE[peor.estado]}</Chip></span>
              {/* En el papel ya va la frase entera debajo: la corta, recortada, sobraría. */}
              <span className="truncate text-[var(--tinta2)] print:hidden">{fraseParteCorta(peor)}</span>
            </Tip>
          ) : <span className="text-[var(--tinta3)]">{peor ? ESTADO_PARTE[peor.estado] : '—'}</span>}
        </td>
        <td className="text-right">{n0(f.crudoBpd)}</td>
        <td className="text-right">{n0(f.diferidoEsp)}</td>
        {ing && <td className="text-right">{x.historial.fallas}</td>}
        {ing && <td className="text-right text-[var(--tinta3)]">{x.historial.disparos}</td>}
        {ing && <td className="text-right">{x.historial.mtbfDias ? `${n0(x.historial.mtbfDias)} d` : <span className="text-[var(--tinta3)]">—</span>}</td>}
      </tr>
    )
  }

  return (
    <>
      <div className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <Cifra rotulo="En falla ahora" valor={`${enFalla.length} de ${flota.length}`} alerta={enFalla.length > 0}
          pie={enFalla.length ? `${n0(perdiendo)} bbl/d perdiéndose` : algunaParada ? 'las paradas, por otra causa' : 'todas produciendo'} />
        <Cifra rotulo="Con aviso" valor={String(avisan.length)}
          pie={avisan.length ? `${n0(enJuego)} bbl/d en juego` : 'ninguna parte avisa'} />
        {/* Todo lo que se les carga a ellas en el período: fallas y disparos (el
            disparo no es falla, pero también difiere). La columna «Por su ESP»
            de la tabla cuenta igual: las dos suman lo mismo. */}
        <Cifra rotulo="Diferido de sus electrosumergibles" valor={`${n0(diferidoEsp)} bbl`}
          pie={partesEsp[0] ? `${n0(diferidoEsp ? (partesEsp[0].bbl / diferidoEsp) * 100 : 0)} % por ${NOMBRE_PARTE[partesEsp[0].parte].toLowerCase()}` : diferidoEsp > 0 ? 'parte sin identificar' : 'ninguna parada propia'}
          info={{ titulo: 'Diferido de sus electrosumergibles', texto: 'Lo que se les cargó en el período por su propia electrosumergible: fallas y disparos. Un disparo no es una falla, pero también difiere.' }} />
        {ing && (
          <Cifra rotulo={`Entre fallas · ${n0(dias / 30.4)} meses`} valor={mtbfFlota ? `${n0(mtbfFlota)} d` : '—'}
            pie={`${plural(fallas, 'falla', 'fallas')} · ${plural(disparos, 'disparo', 'disparos')}`}
            info={{ titulo: 'Fallas y disparos', texto: `Un disparo es una parada que vuelve a arrancar en menos de ${fmtHoras(DISPARO_MAX_H)}: no es una falla. La falla es la que obliga a sacar el equipo del pozo. «Entre fallas» se calcula con dos fallas o más en la historia que hay (${n0(dias / 30.4)} meses); con menos, no se inventa.` }} />
        )}
      </div>

      <Lectura>
        Cada electrosumergible avisa por su variador (corriente, desbalance entre fases) y por su
        sensor de fondo (presión de entrada, temperatura del motor). Una parte avisa cuando una de
        esas variables va hacia el ajuste de protección del variador con tendencia real: «alarma en»
        es cuándo llega a su alarma la que ya salió de su banda; «cruza en», cuándo cruza su límite
        la que va hacia él. Primero lo que falló, luego lo que está más cerca. Un disparo que vuelve
        a arrancar en menos de un día no es una falla: la falla es la que obliga a sacar el equipo
        del pozo. Toque o haga clic en un pozo para abrirlo.
      </Lectura>

      <Panel className="mt-2.5" titulo="FLOTA" extra={flota.length}>
        {/* En el teléfono, una tarjeta por pozo: los barriles a la vista, sin desplazar. */}
        <div className="grid gap-1.5 sm:hidden">
          {lista.visibles.map(x => {
            const f = x.fila
            const peor = x.partes[0]
            const texto = !f.produce ? (cerradoPorOtro(f) ? `cerrado por ${f.causa!.equipo}` : f.causa ? `parado · ${f.causa.parte ? NOMBRE_PARTE[f.causa.parte].toLowerCase() : TIPO_CAUSA[f.causa.tipo].toLowerCase()}` : 'parado')
              : peor && (peor.estado === 'fuera' || peor.estado === 'avisa') ? `${peor.parte.nombre.toLowerCase()} · ${ESTADO_PARTE[peor.estado]}` : 'en marcha'
            return (
              <button key={`m${f.pozo.campoId}${f.pozo.id}`} onClick={() => abrirFila(f.pozo.campoId, f.pozo.id)}
                className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-[var(--linea2)] py-2 text-left text-[12px] last:border-0">
                <MarcaPrioridad s={sevPozo(f)} tamano={11} />
                <span className="min-w-0">
                  <b className="font-mono">{f.pozo.id}</b>{ambito.global ? <span className="text-[var(--tinta3)]"> · {campoPorId(f.pozo.campoId).nombre}</span> : ''}
                  <small className="block truncate text-[11px] text-[var(--tinta2)]">{texto}</small>
                </span>
                <span className="tabular text-right">
                  <b className="block">{n0(f.crudoBpd)} <small className="font-normal text-[var(--tinta3)]">bbl/d</small></b>
                  <small className="text-[10px] text-[var(--tinta3)]">{n0(f.diferidoEsp)} bbl por su ESP</small>
                </span>
              </button>
            )
          })}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className={cn('tabular w-full text-left text-[11.5px]', ing ? 'min-w-[760px]' : 'min-w-[520px]')}>
            <thead className="text-[9.5px] text-[var(--tinta3)]">
              <tr>
                <th className="py-1.5 font-normal">Pozo</th>
                <th className="font-normal">Ahora</th>
                <th className="text-right font-normal">Crudo bbl/d</th>
                <th className="text-right font-normal">Por su ESP bbl</th>
                {ing && <th className="text-right font-normal">Fallas</th>}
                {ing && <th className="text-right font-normal">Disparos</th>}
                {ing && <th className="text-right font-normal">Entre fallas</th>}
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

function Cifra({ rotulo, valor, pie, alerta, info }: { rotulo: string; valor: string; pie: string; alerta?: boolean; info?: { titulo: string; texto: string } }) {
  return (
    <span className="min-w-0">
      {/* El ⓘ va junto al rótulo, nunca dentro de un título; en el papel su nota ocupa su renglón. */}
      <small className="flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">{rotulo}{info && <Info titulo={info.titulo} texto={info.texto} />}</small>
      <b className={cn('tabular flex items-center gap-1.5 text-[20px] leading-tight')}>{alerta && <MarcaPrioridad s={1} tamano={14} />}{valor}</b>
      <small className="block text-[10.5px] leading-snug text-[var(--tinta2)]">{pie}</small>
    </span>
  )
}
