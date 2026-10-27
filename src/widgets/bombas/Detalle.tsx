import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { plantillaDe, NO_DA, PAPEL_NOMBRE, TECNOLOGIA_NOMBRE } from '@/entities/bombas'
import { FUENTE_METODO } from '@/entities/metrologia'
import { MECANISMOS_ESTADO } from '@/entities/iso14224'
import { COMO, rolDeQuien } from '@/entities/causa-senal'
import { fechaHora } from '@/entities/reloj'
import type { ParadaMedida, Prediccion } from '@/entities/diferido'
import { useParadas } from '@/shared/api/diferidos'
import { useCiclo, planesDeEquipo } from '@/shared/api/ciclo'
import { PlanesDe } from '@/widgets/ciclo/Ciclo'
import { useApp, useRol, useRango } from '@/app/store'
import { Panel, Chip, Hueco, Boton } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { useNivelEquipo, type SenalNivel3 } from '@/shared/api/equiposTecnico'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { DichoEnPapel } from '@/shared/ui/DichoEnPapel'
import { causaEnPapel } from '@/shared/ui/papel'
import { causaParaSalir } from '@/shared/api/arbol'
import { Tip } from '@/shared/ui/Tip'
import { BarraMeta } from '@/shared/ui/BarraMeta'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, n1, n3, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Proyeccion } from './Proyeccion'
import { fmtBbl, fmtRango, fmtTol, fmtComponente, fmtHoras, textoPronostico, pronosticoCorto, tanqueAbierto, fraseParteCorta, respaldoAbsorbe } from './comun'
import { NOMBRE_PARTE } from '@/entities/partes'
import { BloqueParte } from './BloqueParte'
import type { SaludParte } from '@/entities/salud'
import { porTag, type BombaVista } from './vista'
import { SenalFija } from './SenalFija'
import type { NivelDetalle } from '@/entities/tipos'
import { ESTADO_PARTE } from '@/entities/salud'
import { desplazable } from '@/shared/ui/alFinal'

/** Clases de la nota impresa de una fila de lista con raya: la raya va debajo de la nota. */
const NOTA_FILA = 'border-b border-[var(--linea2)] pb-1.5 last:border-0'

/** C4 · El diagnóstico de una bomba de la línea (nivel 4 de ISA-101; X4 §5.1 y
 *  §3.7, «Bombas · detalle»): la salud por parte, las variables con su banda, el
 *  vigía, las paradas del PLC con su cadena, los planes y los puntos ciegos. Lo de
 *  ahora (la cifra, el bloqueo, las señales, el agua y el orden de cierre) está en
 *  el nivel 3 (`widgets/equipos/Nivel3.tsx`). Antes era el detalle de la pantalla
 *  Bombas, con su «volver»: ninguna de sus partes se perdió. */
export function DiagnosticoBomba({ b, nivel = 'ingenieria' }: { b: BombaVista; nivel?: NivelDetalle }) {
  const { eq, perfil, senales, veredicto: ve, abierta, partes } = b
  // Operación ve lo que necesita para decidir en campo; ingeniería, todo.
  const ing = nivel === 'ingenieria'
  const rol = useRol(); const setPantalla = useApp(s => s.setPantalla)
  const rango = useRango()
  const campoId = b.campo.id
  const paradas = useParadas(campoId, eq.id)
  const ciclo = useCiclo([campoId], rango.desde, rango.hasta)
  const planes = planesDeEquipo(ciclo, campoId, eq.id)
  // Cinco y «ver N más»: nunca se esconde la parada abierta ni una que espera que se identifique.
  const listaParadas = useVerMas(paradas, { prioridad: m => (m.abierto || (m.pide && !m.arrancoSinIdentificar) ? 1 : 3) })
  // F3 · Cada variable con la escala fija del motor, la misma del nivel 3 (H5, H12): ni la escala ni la marca se deciden aquí.
  const delMotor = porTag(useNivelEquipo(campoId, eq.id))

  if (!perfil || !ve) {
    return (
      <Panel titulo={`${eq.id} · ${b.campo.nombre}`}>
        <Hueco>
          <span className="flex flex-wrap items-center gap-x-1">
            Sin perfil en {b.campo.nombre}: falta declarar papel, capacidad y respaldo.
            <Info titulo="Sin perfil" texto={`Esta bomba no tiene perfil en ${b.campo.nombre}. Hay que declarar qué hace con su fluido (transporte, disposición o recobro), su capacidad y su respaldo. Lo firma el administrador de la implementación; sin eso, el crudo en riesgo no se calcula.`} />
          </span>
        </Hueco>
      </Panel>
    )
  }

  const h = ve.historial
  const plantilla = plantillaDe(perfil.subtipo)
  const faltan = plantilla.filter(pl => !perfil.tags[pl.id])
  const vigia = senales.filter(s => s.mecanismo)
    .sort((x, y) => (x.pronostico.tipo === 'cruza' ? x.pronostico.horas : Infinity)
      - (y.pronostico.tipo === 'cruza' ? y.pronostico.horas : Infinity))

  return (
    <div className="grid gap-3 sm:gap-4" data-diagnostico-bomba={eq.id}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-[var(--tinta2)]">
        <span>{TECNOLOGIA_NOMBRE[perfil.tecnologia]} · {PAPEL_NOMBRE[perfil.papel]} · {ve.prediccion.respaldoLibreBpd > 0 ? `respaldo ${n0(ve.prediccion.respaldoLibreBpd)} bbl/d` : 'sin respaldo'}</span>
        {ing && <Info rotulo="norma" titulo="Norma" texto={perfil.norma} />}
      </p>

      {planes.length > 0 && (
        <div className="rounded-[20px] bg-[var(--panel)] p-4">
          {/* A15: en el diagnóstico va antes del primer h2 de la vista: su título también es h2. */}
          <PlanesDe planes={planes} titulo="h2" />
        </div>
      )}

      {abierta?.pide && rol.pantallas.includes('causa') && (
        <div className="flex flex-wrap items-center gap-3 rounded-[20px] bg-[var(--panel)] px-4 py-3">
          <span className="min-w-0 flex-1 text-[15px]">La parada abierta espera que alguien diga qué se dañó.</span>
          <Boton variante="principal" onClick={() => setPantalla('causa')}>Identificar</Boton>
        </div>
      )}

      {!ing && <PartesOperacion partes={partes} senales={senales} delMotor={delMotor} />}

      {ing && <Panel titulo="Salud por parte">
        <Lectura>
          El vigía agrupado por lo que falla, de la parte que más preocupa a la que menos. Cada parte
          junta las variables que la <b>anuncian</b>, las que la <b>dañan</b> y las que solo
          <b> confirman</b> que la falla empezó. A la derecha, lo que esa parte ya le costó a esta bomba;
          al abrirla, cada cuánto falla y, en sus ⓘ, qué hacer, con cuánto avisa y cuánto pesa.
        </Lectura>
        {partes.map(sp => (
          <BloqueParte key={sp.parte.id} sp={sp} h={h.porParte.find(x => x.parte === sp.parte.id)} />
        ))}
      </Panel>}

      {ing && <div className="grid items-start gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
        <Panel titulo="Variables" extra={`${plantilla.length - faltan.length} de ${plantilla.length} instrumentadas`}>
          {plantilla.filter(pl => perfil.tags[pl.id]).map(pl => {
            const s = senales.find(x => x.plantilla.id === pl.id)
            const m = s ? delMotor.get(s.tag) : undefined
            return (
              <div key={pl.id} className="border-b border-[var(--linea2)] py-2 last:border-0">
                {/* Con la bomba detenida, una sola marca (la de la bomba) y sus variables en gris (X2 B9): lo dice el motor. */}
                {s && m ? <SenalFija s={m} nombre={pl.nombre} sub={`${perfil.tags[pl.id]} · ${s.origen}`} detalle /> : (
                  <div className="flex items-baseline justify-between gap-2 text-[14px]">
                    <span>{pl.nombre}</span>
                    <span className="text-[13px] text-[var(--tinta2)]">{s ? `${s.valor === null ? '---' : s.valor.toLocaleString('es-CO')} ${s.unidad}` : 'sin lectura numérica'}</span>
                  </div>
                )}
              </div>
            )
          })}
          {faltan.length > 0 && (
            <>
              <div className="mb-1 mt-3 flex flex-wrap items-center gap-x-1">
                <h3 className="text-[13px] font-semibold text-[var(--tinta2)]">Falta instrumentar</h3>
                <Info titulo="Falta instrumentar" texto="Lo que pide la norma y esta bomba no tiene. Toque o pase el cursor por cada una para ver dónde iría." />
              </div>
              {faltan.map(pl => (
                <Tip key={pl.id} titulo={`${pl.isa} · ${pl.nombre}`} filas={[['Dónde', pl.donde]]} imprimir="todo" claseImpresion={NOTA_FILA}
                  className="flex items-center gap-2 border-b border-dashed border-[var(--linea2)] py-1 text-[13px] last:border-0 print:border-b-0">
                  <span className="font-cond w-[38px] shrink-0 text-[14px] font-semibold tracking-[.02em] text-[var(--tinta2)]">{pl.isa}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--tinta2)]">{pl.nombre}</span>
                </Tip>
              ))}
            </>
          )}
        </Panel>

        <Panel titulo="Vigía" extra={vigia.length ? plural(vigia.length, 'señal', 'señales') : 'sin señales'}>
          {vigia.length === 0 && <Hueco>Ninguna variable instrumentada anuncia degradación.</Hueco>}
          {vigia.map(s => (
            <div key={s.tag} className="border-b border-[var(--linea2)] py-2 last:border-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <b className="text-[14px]">{s.plantilla.nombre}</b>
                <span className="text-[13px] text-[var(--tinta2)]">
                  ISO 14224 {s.mecanismo!.codigo} · {s.mecanismo!.nombre}
                </span>
              </div>
              <p className={cn('flex flex-wrap items-center gap-x-1 text-[14px]', s.pronostico.tipo === 'cruza' ? 'text-[var(--tinta)]' : 'text-[var(--tinta3)]')}>
                {s.limite && s.pronostico.tipo === 'cruza'
                  ? <span>Llega a <b className="tabular">{s.limite.valor.toLocaleString('es-CO')} {s.unidad}</b> {pronosticoCorto(s.pronostico)}</span>
                  : <span>{s.limite && <>Límite <b className="tabular">{s.limite.valor.toLocaleString('es-CO')} {s.unidad}</b> · </>}
                    {s.pronostico.tipo === 'sin-tendencia' || s.pronostico.tipo === 'no-atribuible' ? 'sin fecha' : textoPronostico(s.pronostico)}</span>}
                {(s.pronostico.tipo === 'sin-tendencia' || s.pronostico.tipo === 'no-atribuible') && <Info titulo="Sin fecha" texto={textoPronostico(s.pronostico)} />}
                {s.plantilla.anuncia?.por && <Info rotulo="anuncia" titulo={`Qué anuncia · ${s.plantilla.nombre}`} texto={s.plantilla.anuncia.por} />}
              </p>
              {s.pronostico.tipo !== 'sin-tendencia' && <div className="mt-1"><Proyeccion s={s} /></div>}
            </div>
          ))}
          <Lectura>
            La línea continua y gruesa es lo medido; la punteada que sale de hoy, la tendencia
            prolongada; la raya discontinua con su valor, el límite; la barra sobre el límite,
            el rango de días en que lo cruzaría («en 43 h · 41–45 h»: la cifra y su rango). El rango
            sale de la pendiente más o menos dos errores estándar. Si la pendiente no los supera, el
            vigía no da fecha («sin fecha»): sería inventarla. La ⓘ de cada señal dice qué anuncia.
          </Lectura>
        </Panel>
      </div>}

      <Panel titulo={ing ? 'Paradas del PLC' : 'Últimas paradas'} extra={plural(paradas.length, 'parada', 'paradas')}>
        {paradas.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Sin paradas registradas.</p>}
        {listaParadas.visibles.map((m, i) => <Parada key={m.evento.id} m={m} equipo={eq.id} simple={!ing} abiertaDeInicio={i === 0} />)}
        {listaParadas.resto.length > 0 && (
          <div className="solo-impresion">
            {listaParadas.resto.map(m => <Parada key={m.evento.id} m={m} equipo={eq.id} simple={!ing} abiertaDeInicio={false} />)}
          </div>
        )}
        <VerMas ocultas={listaParadas.ocultas} abierto={listaParadas.abierto} onAlternar={listaParadas.alternar} />
        {ing && <p className="mt-2 flex flex-wrap items-center text-[12px] text-[var(--tinta3)]"><Info rotulo="tolerancia" titulo="Método de la tolerancia" texto={FUENTE_METODO} /></p>}
      </Panel>

      {ing && <Panel titulo="Puntos ciegos">
        <Lectura>Lo que esta bomba no dice de sí misma, y de dónde sale. La ⓘ dice por qué.</Lectura>
        {NO_DA[perfil.subtipo].map(x => (
          <div key={x.que} className="grid grid-cols-[minmax(0,140px)_1fr] gap-3 border-b border-[var(--linea2)] py-1.5 text-[14px] last:border-0">
            <b>{x.que}</b>
            <span className="flex flex-wrap items-center gap-x-1 text-[var(--tinta2)]">
              <span>sale de {x.deDonde.charAt(0).toLowerCase() + x.deDonde.slice(1)}</span>
              <Info titulo={x.que} texto={`${x.porque}. Sale de: ${x.deDonde}.`} />
            </span>
          </div>
        ))}
        <p className="mt-2 flex flex-wrap items-center text-[12px] text-[var(--tinta3)]"><Info rotulo="mecanismos" titulo="Mecanismos" texto={MECANISMOS_ESTADO} /></p>
      </Panel>}
    </div>
  )
}

/** Un título de bloque dentro de una tarjeta: en frase, sin letra condensada (X5 §3.4; UI-04, UI-15). */
const H5 = ({ children }: { children: React.ReactNode }) =>
  <h3 className="mb-1 mt-2 text-[14px] font-semibold text-[var(--tinta2)] first:mt-0">{children}</h3>

/** Un título de bloque con su ⓘ al lado (nunca adentro: el lector oiría la frase como nombre). */
const H5Info = ({ children, info }: { children: React.ReactNode; info: React.ReactNode }) => (
  <div className="mb-1 mt-2 flex flex-wrap items-center gap-x-1 first:mt-0">
    <h3 className="text-[14px] font-semibold text-[var(--tinta2)]">{children}</h3>
    {info}
  </div>
)

/** Si falla hoy (o, si ya está parada, mientras esté parada): cuánto aguanta el
 *  tanque, qué pozos cerrar y en qué orden, y cuánto se gana cerrando bien. F3 · El
 *  nombre es el mismo en todo el producto, «Si falla hoy», en bbl/d (D-2, G-16), y
 *  lo diferido «se deja de producir» (T-8). */
export function SiSePara({ pr, simple = false }: { pr: Prediccion; simple?: boolean }) {
  const o = pr.orden
  const pasos = useVerMas(o?.pasos.slice(0, 12) ?? [])
  const cerrados = useVerMas(pr.perdiendo?.pozos ?? [])
  // Las filas que esconde «ver N más» salen igual en el papel.
  const fila = (x: NonNullable<typeof o>['pasos'][number], i: number, papel = false) => (
    <tr key={x.pozo.id} className={cn('border-t border-[var(--linea2)]', papel && 'hidden print:table-row')}>
      <td className="py-1 text-[var(--tinta3)]">{i + 1}</td>
      <td className="font-cond font-semibold tracking-[.02em]">{x.pozo.id}</td>
      <td className="text-right">{n0(x.crudoBpd)}</td>
      <td className="text-right">{n0(x.aguaBpd)}</td>
      {/* Con 95-98 % de agua el crudo por barril de agua va de 0,01 a 0,05: dos decimales no separan los pozos. */}
      <td className="text-right">{n3(x.crudoPorAgua)}</td>
      <td className="text-right">{x.fraccion >= 0.999 ? 'entero' : `${n0(x.fraccion * 100)} %`}</td>
    </tr>
  )
  return (
    <Panel className="mt-3 sm:mt-4" titulo={pr.parada ? 'Mientras esté parada' : 'Si falla hoy'}
      extra={pr.colchon ? `${pr.colchon.tanque.id} · ${pr.colchon.nivel.tag} ${n1(pr.colchon.nivel.pct)} %` : undefined}>
      {pr.parada && <p className="mb-2 text-[14px] text-[var(--tinta2)]">Parada desde {fechaHora(new Date(pr.parada.inicio))}</p>}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
        {pr.colchon && !pr.parada && (
          <div className="text-[14px]">
            <H5>Colchón del tanque</H5>
            <BarraMeta tamano="chica" rotulo={`nivel ${pr.colchon.nivel.tag}`} valor={pr.colchon.nivel.pct} unidad="%"
              formato={v => `${n1(v)} %`} meta={pr.colchon.tanque.altoAlto * 100} tipoMeta="máximo"
              rotuloMeta={`alto-alto ${n0(pr.colchon.tanque.altoAlto * 100)} %`} />
            <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3">
              <dt className="py-0.5 text-[var(--tinta2)]">Capacidad</dt><dd className="tabular py-0.5 text-right">{n0(pr.colchon.tanque.capacidadBbl)} bbl</dd>
              <dt className="py-0.5 text-[var(--tinta2)]">Volumen libre</dt><dd className="tabular py-0.5 text-right">{n0(pr.colchon.libreBbl)} bbl</dd>
              <dt className="py-0.5 text-[var(--tinta2)]">Agua sin salida</dt><dd className="tabular py-0.5 text-right">{n0(pr.colchon.aguaSinSalidaBpd)} bbl/d</dd>
              <dt className="flex flex-wrap items-center gap-x-1 border-t border-[var(--linea2)] py-0.5 font-semibold">
                Aguanta
                {!simple && <Info titulo="Tolerancia del colchón" texto={pr.colchon.componentes.map(c => `${c.nombre} ${fmtComponente(c.valor)}: ${c.fuente}`).join(' · ')} />}
              </dt>
              {/* Colchón infinito: el tanque no se llena, no hay horas ni rango que dar. */}
              <dd className="tabular border-t border-[var(--linea2)] py-0.5 text-right font-semibold">{respaldoAbsorbe(pr) ? 'no se llena' : <>{fmtHoras(pr.colchon.horas, true)}{!simple && <small className="font-normal text-[var(--tinta3)]"> ({fmtHoras(pr.colchon.rango[0], true)} a {fmtHoras(pr.colchon.rango[1], true)})</small>}</>}</dd>
            </dl>
          </div>
        )}
        {pr.perdiendo && pr.perdiendo.pozos.length > 0 && (
          <div className="min-w-0 text-[13px]">
            <H5Info info={<Info titulo="Al arrancar" texto={`Se dejan de producir ${n0(pr.perdiendo.bblDia)} bbl/d mientras siga parada. Al arrancar, los pozos vuelven a producir a medida que el tanque baja.`} />}>
              Pozos que cerró · {pr.perdiendo.pozos.length}
            </H5Info>
            <p className="text-[14px] text-[var(--tinta2)]">
              {cerrados.visibles.map(w => w.id).join(', ')}
              {cerrados.resto.length > 0 && <span className="hidden print:inline">, {cerrados.resto.map(w => w.id).join(', ')}</span>}
            </p>
            <VerMas ocultas={cerrados.ocultas} abierto={cerrados.abierto} onAlternar={cerrados.alternar} />
          </div>
        )}
        {!pr.parada && o && o.pasos.length > 0 && (
          <div className="min-w-0 text-[13px]">
            <H5Info info={<Info titulo="Orden de cierre" texto="Menos crudo por barril de agua primero." />}>Orden de cierre</H5Info>
            <div {...desplazable('En qué orden cerrar los pozos')} className="overflow-x-auto">
              <table className="tabular w-full min-w-[360px] text-left">
                <thead className="text-[12px] text-[var(--tinta3)]">
                  <tr><th className="py-1 font-normal">#</th><th className="font-normal">Pozo</th><th className="text-right font-normal">Crudo bbl/d</th>
                    <th className="text-right font-normal">Agua bbl/d</th><th className="text-right font-normal">Crudo/agua</th><th className="text-right font-normal">Cierre</th></tr>
                </thead>
                <tbody>
                  {pasos.visibles.map((x, i) => fila(x, i))}
                  {pasos.resto.map((x, i) => fila(x, pasos.visibles.length + i, true))}
                </tbody>
              </table>
            </div>
            <VerMas ocultas={pasos.ocultas} abierto={pasos.abierto} onAlternar={pasos.alternar} />
            {o.pasos.length > 12 && <small className="block text-[12px] text-[var(--tinta3)]">y {o.pasos.length - 12} pozos más: se cierra todo el campo.</small>}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[14px]">
              <span>deja de producir <b>{n0(o.crudoBpd)} bbl/d</b> en este orden{o.ahorroBpd > 1 && <> · <b>{n0(o.ahorroBpd)} bbl/d menos</b> que parejo</>}</span>
              {o.ahorroBpd > 1 && <Info titulo="Parejo" texto={`Cerrando parejo (la misma fracción a todos) serían ${n0(o.crudoParejoBpd)} bbl/d.`} />}
            </p>
          </div>
        )}
        {!o && pr.perfil.papel === 'transporte' && (
          <div className="text-[13px]">
            <H5>Pozos que pasan por ella</H5>
            <ul className="list-disc pl-4 text-[var(--tinta2)]">{pr.supuestos.slice(0, -1).map(s => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
      </div>
      {/* Parada, el método solo repite «Parada desde…» y «Pozos que cerró»: no va. */}
      {(!pr.parada || !simple) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[13px]">
          {!pr.parada && <Info rotulo="método" titulo="Cómo se calcula" texto={`${pr.metodo}.`} />}
          {!simple && <Info rotulo="supuestos" titulo="Supuestos" texto={pr.supuestos.join(' · ')} />}
        </p>
      )}
    </Panel>
  )
}

/** Una parada: por qué fue, con qué se probó, qué pozos cerró, lo que costó y
 *  si el tanque aguantó lo que debía. */
function Parada({ m, equipo, abiertaDeInicio, simple = false }: { m: ParadaMedida; equipo: string; abiertaDeInicio: boolean; simple?: boolean }) {
  const [abierta, setAbierta] = useState(abiertaDeInicio)
  const c = m.causa
  const propia = m.cargadoA === equipo
  const pozos = [...m.tramos.reduce((acc, t) => {
    const x = acc.get(t.pozo.id) ?? { pozo: t.pozo.id, horas: 0, bbl: 0, aprox: false }
    x.horas += t.horas; x.bbl += t.bbl; x.aprox ||= t.aproximado
    return acc.set(t.pozo.id, x)
  }, new Map<string, { pozo: string; horas: number; bbl: number; aprox: boolean }>()).values()].sort((a, b) => b.bbl - a.bbl)
  const lista = useVerMas(pozos)
  const filaPozo = (x: typeof pozos[number]) => (
    <div key={x.pozo} className="tabular flex justify-between gap-2 border-b border-[var(--linea2)] py-0.5 last:border-0">
      <span className="font-cond font-semibold tracking-[.02em]">{x.pozo}</span>
      <span className="text-[var(--tinta2)]">{fmtHoras(x.horas, true)}{x.aprox ? ' · frecuencia reducida' : ''}</span>
      <b>{n0(x.bbl)}</b>
    </div>
  )
  // El colchón en corto: lo previsto y lo que aguantó. La frase entera va abierta, en «El tanque».
  const colchon = m.colchon && `colchón ${fmtHoras(m.colchon.previsto.horas, true)}${m.colchon.observadoH !== undefined ? ` · aguantó ${fmtHoras(m.colchon.observadoH, true)}`
    : m.abierto ? (m.colchon.previsto.horas > m.horasParada ? ` · faltan ${fmtHoras(m.colchon.previsto.horas - m.horasParada, true)}` : ' · ya pasó, sin cerrar pozos') : ' · sin cerrar pozos'}`
  return (
    <div className="border-b border-[var(--linea2)] last:border-0">
      <button onClick={() => setAbierta(v => !v)} aria-expanded={abierta}
        className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-3 py-2 text-left hover:bg-[var(--panel2)] sm:grid-cols-[150px_1fr_auto_auto]">
        <span className="tabular text-[14px]">
          <b className="block">{fechaHora(m.inicio)}</b>
          {/* De la parada de la bomba a su arranque. La ficha cuenta otra duración
              (hasta que reabrió el último pozo): por eso cada una dice cuál es. */}
          <small className="text-[12px] text-[var(--tinta3)]">{m.abierto ? 'abierta' : `hasta ${fechaHora(m.fin)}`} · bomba parada {fmtHoras(m.horasParada, true)}</small>
        </span>
        <span className="hidden min-w-0 text-[13px] text-[var(--tinta2)] sm:block">
          {/* Sin identificar, la causa la dice su marca («por identificar», «arrancó sin identificar»); la frase, abierta. */}
          {c.parte ? <b className="text-[var(--tinta)]">{NOMBRE_PARTE[c.parte]}</b> : !m.pide ? <span>{c.texto}</span> : null}
          {/* Cada pieza lleva su « · » delante, salvo la primera que se ve. */}
          {[
            // «Mantenimiento preventivo programado…» ya dice «por el programa aprobado».
            !m.pide && !(c.como === 'programa' && !c.parte) && <span key="como" className="text-[13px] text-[var(--tinta3)]">{COMO[c.como]}</span>,
            !propia && <span key="carga" className="text-[13px] text-[var(--tinta)]">se carga a {m.cargadoA}</span>,
            c.tipo === 'programada' && c.como !== 'programa' && <span key="prog" className="text-[13px] text-[var(--tinta3)]">programada</span>,
            colchon && <span key="colchon" className="text-[13px]">{colchon}</span>,
          ].filter(Boolean).map((x, i) => <span key={i}>{i > 0 || c.parte || !m.pide ? ' · ' : ''}{x}</span>)}
          {m.arrancoSinIdentificar && <span className="ml-1 inline-flex items-center gap-1 text-[13px] text-[var(--tinta)]"><MarcaPrioridad s={3} tamano={10} />arrancó sin identificar</span>}
          {m.pide && !m.arrancoSinIdentificar && <span className="ml-1 inline-flex items-center gap-1 text-[13px] text-[var(--tinta)]"><MarcaPrioridad s={2} tamano={10} />por identificar</span>}
        </span>
        <span className="tabular text-right">
          {/* La parada abierta ya lleva su forma en la bomba y en «se deja de producir ahora»: la cifra, en tinta. */}
          <b className="block text-[15px]">{fmtBbl(m.bbl)}</b>
          <small className="text-[12px] text-[var(--tinta3)]">{m.bbl <= 0 ? 'no costó crudo' : simple ? plural(m.pozos, 'pozo cerrado', 'pozos cerrados') : `${fmtRango(m.rango)} · ${fmtTol(m.tolerancia)}`}</small>
        </span>
        <ChevronDown className={cn('size-4 text-[var(--tinta3)] transition-transform', abierta && 'rotate-180')} />
      </button>
      {abierta && (
        <div className="grid gap-3 pb-3 pl-1 text-[13px] [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
          <div>
            {/* Sin identificar, la frase repite lo que ya dicen el título y su marca: va en la ⓘ. */}
            {m.pide
              ? <H5Info info={<Info titulo="Por qué paró" texto={c.texto} textoEnPapel={causaEnPapel(c)} />}>Por qué paró · {COMO[c.como]}</H5Info>
              : <><H5>Por qué paró · {COMO[c.como]}</H5><p className="text-[var(--tinta)]"><DichoEnPapel papel={causaEnPapel(c)}>{c.texto}</DichoEnPapel></p></>}
            <ul className="mt-1 list-disc pl-4 text-[var(--tinta2)]">
              {c.evidencia.map((e, i) => <li key={e} className="text-[13px]"><DichoEnPapel papel={causaParaSalir(c).evidencia[i] ?? e}>{e}</DichoEnPapel></li>)}
            </ul>
            {c.declarado && <p className="mt-1 text-[13px] text-[var(--tinta3)]">Declarado por <DichoEnPapel papel={rolDeQuien(c.declarado.por)}>{c.declarado.por}</DichoEnPapel> · {fechaHora(new Date(c.declarado.hora))}</p>}
            {m.colchon && (
              <>
                <H5>El tanque</H5>
                <dl className="tabular grid grid-cols-[1fr_auto] gap-x-3 text-[var(--tinta2)]">
                  <dt>Al parar · {m.colchon.previsto.nivel.tag}</dt><dd className="text-right">{n1(m.colchon.previsto.nivel.pct)} %</dd>
                  <dt>Libre hasta el alto-alto</dt><dd className="text-right">{n0(m.colchon.previsto.libreBbl)} bbl</dd>
                  <dt>Agua sin salida</dt><dd className="text-right">{n0(m.colchon.previsto.aguaSinSalidaBpd)} bbl/d</dd>
                  <dt>Debía aguantar</dt><dd className="text-right">{fmtHoras(m.colchon.previsto.horas, true)}</dd>
                  {m.colchon.observadoH !== undefined
                    ? <><dt className="font-semibold text-[var(--tinta)]">Primer pozo cerrado</dt><dd className="text-right font-semibold text-[var(--tinta)]">a las {fmtHoras(m.colchon.observadoH, true)}</dd></>
                    : <dd className="col-span-2 font-semibold text-[var(--tinta)]">{m.abierto ? tanqueAbierto(m.colchon.previsto.horas, m.horasParada) : 'lo absorbió sin cerrar pozos'}</dd>}
                </dl>
              </>
            )}
          </div>
          <div>
            <H5>Pozos que cerró · {pozos.length}</H5>
            {pozos.length === 0 && <p className="text-[var(--tinta2)]">Ninguno.</p>}
            {lista.visibles.map(filaPozo)}
            {lista.resto.length > 0 && <div className="solo-impresion">{lista.resto.map(filaPozo)}</div>}
            <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
            {m.evitable > 0 && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[var(--tinta2)]">
                <span>evitable en orden: <b className="text-[var(--tinta)]">{n0(m.evitable)} bbl</b></span>
                <Info titulo="Evitable" texto={`Cerrando primero los de menos crudo por barril de agua se habrían dejado de producir ${n0(m.evitable)} bbl menos.`} />
              </p>
            )}
            {m.aproximado > 0 && (
              <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta3)]">
                <span>{n0(m.aproximado)} bbl aproximados</span>
                <Info titulo="Aproximados" texto={`${n0(m.aproximado)} bbl de pozos a frecuencia reducida: aproximados por ley de afinidad, fuera de la tolerancia.`} />
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Las partes para quien opera: solo las que avisan, con lo que hay que hacer,
 *  y lo que está fuera de banda ahora. Sin tendencias ni proyecciones. */
function PartesOperacion({ partes, senales, delMotor }: { partes: SaludParte[]; senales: BombaVista['senales']; delMotor: ReadonlyMap<string, SenalNivel3> }) {
  const avisan = partes.filter(p => p.estado === 'fallo' || p.estado === 'fuera' || p.estado === 'avisa')
  const fuera = senales.filter(x => x.estado !== 'normal' && x.valor !== null)
  return (
    <div className="grid items-start gap-3 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
      <Panel titulo="Partes que avisan" extra={avisan.length ? `${avisan.length}` : undefined}>
        {avisan.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Ninguna avisa.</p>}
        {avisan.map(sp => (
          <div key={sp.parte.id} className="border-b border-[var(--linea2)] py-2 text-[14px] last:border-0">
            <span className="flex flex-wrap items-center gap-2">
              <MarcaPrioridad s={sp.prioridad} tamano={12} />
              <b>{sp.parte.nombre}</b>
              <Chip tono={sp.estado === 'avisa' ? 'neutro' : 'fuerte'}>{ESTADO_PARTE[sp.estado]}</Chip>
            </span>
            <small className="tabular mt-0.5 block text-[13px] text-[var(--tinta2)]">{fraseParteCorta(sp)}</small>
            {/* Operación ejecuta la acción: va escrita, no detrás de un ⓘ. */}
            <small className="mt-0.5 block text-[13px] text-[var(--tinta)]"><b>Qué hacer:</b> {sp.parte.accion}</small>
          </div>
        ))}
      </Panel>
      <Panel titulo="Fuera de banda" extra={fuera.length ? `${fuera.length}` : undefined}>
        {fuera.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Todo en banda.</p>}
        {fuera.map(x => {
          const m = delMotor.get(x.tag)
          return (
            <div key={x.tag} className="border-b border-[var(--linea2)] py-2 last:border-0">
              {m ? <SenalFija s={m} nombre={x.plantilla.nombre} sub={x.tag} detalle /> : (
                <div className="flex items-baseline justify-between gap-2 text-[14px]">
                  <span>{x.plantilla.nombre}</span>
                  <b className="tabular font-semibold">{x.valor === null ? '---' : x.valor.toLocaleString('es-CO')} <small className="font-normal text-[var(--tinta2)]">{x.unidad}</small></b>
                </div>
              )}
            </div>
          )
        })}
      </Panel>
    </div>
  )
}

