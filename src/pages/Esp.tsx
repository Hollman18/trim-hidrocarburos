import { useState } from 'react'
import { useApp, useAmbito, useRango, useNivel } from '@/app/store'
import { useFlotaEsp, useLibro } from '@/shared/api/diferidos'
import { TIPO_CAUSA } from '@/entities/causa-senal'
import { ESTADO_PARTE } from '@/entities/salud'
import { NOMBRE_PARTE } from '@/entities/partes'
import { DISPARO_MAX_H } from '@/entities/libro'
import { campoPorId } from '@/entities/campos'
import { Panel } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n1, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { DetallePozo } from '@/widgets/pozos/DetallePozo'
import { sevPozo, cerradoPorOtro } from '@/widgets/pozos/estado'
import { fraseParte, fmtHoras } from '@/widgets/bombas/comun'

/** La flota de electrosumergibles: el otro equipo de alto impacto. Cuál está
 *  por fallar y qué parte, cuánto crudo pone en juego, y cada cuánto falla
 *  cada una. Todo sale del variador y del sensor de fondo de cada pozo. */
export function Esp() {
  const ambito = useAmbito(); const rango = useRango(); const nivel = useNivel()
  const setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo)
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

  const primera = (x: typeof flota[number]) => x.partes.find(p => p.primera)?.primera?.senal.pronostico.horas ?? Infinity
  // Primero lo que falló por sí mismo; lo cerrado por otro equipo es
  // consecuencia y va después de lo que avisa.
  const orden = (x: typeof flota[number]) => {
    if (!x.fila.produce) return cerradoPorOtro(x.fila) ? 3 : 0
    const peor = x.partes[0]
    return peor?.estado === 'fuera' ? 1 : peor?.estado === 'avisa' ? 2 : 4
  }
  const abrirFila = (campo: string, pozo: string) => nivel === 'decision'
    ? (setCampo(campo), abrirEquipo(pozo, false))
    : setAbierto({ campo, pozo })
  const filas = [...flota].sort((a, b) => orden(a) - orden(b) || primera(a) - primera(b) || b.fila.crudoBpd - a.fila.crudoBpd)

  return (
    <>
      <div className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <Cifra rotulo="En falla ahora" valor={`${enFalla.length} de ${flota.length}`} alerta={enFalla.length > 0}
          pie={enFalla.length ? `${n0(perdiendo)} bbl/d perdiéndose` : 'todas produciendo o paradas por otra causa'} />
        <Cifra rotulo="Con una parte avisando" valor={String(avisan.length)}
          pie={avisan.length ? `${n0(enJuego)} bbl/d en juego si fallan` : 'ninguna parte va hacia su límite'} />
        <Cifra rotulo={`Diferido por fallas de las electrosumergibles · ${rango.nombre}`} valor={`${n0(diferidoEsp)} bbl`}
          pie={partesEsp[0] ? `${NOMBRE_PARTE[partesEsp[0].parte].toLowerCase()} se lleva ${n0(diferidoEsp ? (partesEsp[0].bbl / diferidoEsp) * 100 : 0)} %` : 'sin fallas en el período'} />
        {ing ? (
          <Cifra rotulo={`Flota · ${n0(dias / 30.4)} meses`} valor={mtbfFlota ? `${n0(mtbfFlota)} d` : '—'}
            pie={`entre fallas · ${plural(fallas, 'falla', 'fallas')} y ${plural(disparos, 'disparo', 'disparos')} de menos de ${DISPARO_MAX_H} h`} />
        ) : nivel === 'decision' ? (
          <Cifra rotulo={`Fallas en ${n0(dias / 30.4)} meses`} valor={String(fallas)} pie={`de ${flota.length} electrosumergibles`} />
        ) : null}
      </div>

      {nivel === 'decision' ? (
        <Lectura>
          Cada electrosumergible con lo que le pasa ahora y lo que su propia falla costó en el período.
          Las que están cerradas por otro equipo van en gris: la causa es ese equipo. Un clic abre la ficha.
        </Lectura>
      ) : (
        <Lectura>
        Cada electrosumergible avisa por su variador (corriente, desbalance entre fases) y por su
        sensor de fondo (presión de entrada, temperatura del motor). Una parte avisa cuando una de
        esas variables va hacia el ajuste de protección del variador con tendencia real. Un disparo
        que vuelve a arrancar en menos de un día no es una falla: la falla es la que obliga a sacar
        el equipo del pozo.
      </Lectura>
      )}

      <Panel className="mt-2.5" titulo="FLOTA" extra="primero lo que falló, luego lo que está más cerca · clic para abrir">
        {/* En el teléfono, una tarjeta por pozo: los barriles a la vista, sin desplazar. */}
        <div className="grid gap-1.5 sm:hidden">
          {filas.map(x => {
            const f = x.fila
            const peor = x.partes[0]
            const texto = !f.produce ? (cerradoPorOtro(f) ? `cerrado por ${f.causa!.equipo}` : f.causa ? `parado · ${f.causa.parte ? NOMBRE_PARTE[f.causa.parte].toLowerCase() : TIPO_CAUSA[f.causa.tipo].toLowerCase()}` : 'parado')
              : peor && (peor.estado === 'fuera' || peor.estado === 'avisa') ? `${peor.parte.nombre.toLowerCase()} avisa` : 'en marcha'
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
                <th className="font-normal">La parte que preocupa</th>
                <th className="text-right font-normal">Crudo bbl/d</th>
                <th className="text-right font-normal">Por su ESP bbl</th>
                {ing && <th className="text-right font-normal">Fallas</th>}
                {ing && <th className="text-right font-normal">Entre fallas</th>}
              </tr>
            </thead>
            <tbody>
              {filas.map(x => {
                const f = x.fila
                const peor = x.partes[0]
                const parado = !f.produce
                return (
                  <tr key={`${f.pozo.campoId}${f.pozo.id}`} onClick={() => abrirFila(f.pozo.campoId, f.pozo.id)}
                    className="cursor-pointer border-t border-[var(--linea2)] hover:bg-[var(--panel2)]">
                    <td className="py-1.5">
                      {/* El botón da el foco y el Enter al teclado; su clic sube a la fila, que es la que abre. */}
                      <span className="flex items-center gap-1.5"><MarcaPrioridad s={sevPozo(f)} tamano={11} /><button type="button" aria-label={`Abrir ${f.pozo.id}`} className="cursor-pointer rounded-sm font-mono font-bold">{f.pozo.id}</button></span>
                      <small className="block text-[10px] text-[var(--tinta3)]">{ambito.global ? `${campoPorId(f.pozo.campoId).nombre}` : ''}{nivel !== 'decision' && f.prueba?.hz ? `${ambito.global ? ' · ' : ''}${n1(f.hz ?? f.prueba.hz)} Hz` : ''}</small>
                    </td>
                    <td className="max-w-[320px]">
                      {parado && cerradoPorOtro(f) ? (
                        <span className="block truncate text-[var(--tinta3)]">cerrado por {f.causa!.equipo}</span>
                      ) : parado ? (
                        <span className="block truncate">{f.causa ? `parado · ${TIPO_CAUSA[f.causa.tipo].toLowerCase()}${f.causa.parte ? `: ${NOMBRE_PARTE[f.causa.parte].toLowerCase()}` : ''}` : 'parado'}</span>
                      ) : peor && (peor.estado === 'fuera' || peor.estado === 'avisa') ? (
                        <span className="block truncate text-[var(--tinta)]"><b>{peor.parte.nombre}</b>{nivel === 'decision' ? ' avisa' : ` · ${fraseParte(peor)}`}</span>
                      ) : <span className="text-[var(--tinta3)]">{peor ? ESTADO_PARTE[peor.estado] : '—'}</span>}
                    </td>
                    <td className="text-right">{n0(f.crudoBpd)}</td>
                    <td className="text-right">{n0(f.diferidoEsp)}</td>
                    {ing && <td className="text-right">{x.historial.fallas}{x.historial.disparos ? <small className="text-[var(--tinta3)]"> +{x.historial.disparos}</small> : ''}</td>}
                    {ing && <td className="text-right">{x.historial.mtbfDias ? `${n0(x.historial.mtbfDias)} d` : <span className="text-[var(--tinta3)]">—</span>}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {ing && <p className="mt-1.5 text-[10px] text-[var(--tinta3)]">
          «+n» son disparos. «Entre fallas» se calcula con dos fallas o más en la historia que hay; con
          menos, no se inventa. {fmtHoras(DISPARO_MAX_H)} es el corte entre disparo y falla.
        </p>}
      </Panel>
    </>
  )
}

function Cifra({ rotulo, valor, pie, alerta }: { rotulo: string; valor: string; pie: string; alerta?: boolean }) {
  return (
    <span className="min-w-0">
      <small className="block text-[10.5px] text-[var(--tinta3)]">{rotulo}</small>
      <b className={cn('tabular flex items-center gap-1.5 text-[20px] leading-tight')}>{alerta && <MarcaPrioridad s={1} tamano={14} />}{valor}</b>
      <small className="block text-[10.5px] leading-snug text-[var(--tinta2)]">{pie}</small>
    </span>
  )
}
