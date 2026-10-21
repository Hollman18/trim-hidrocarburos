import { useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { plantillaDe, NO_DA, PAPEL_NOMBRE, TECNOLOGIA_NOMBRE } from '@/entities/bombas'
import { FUENTE_METODO } from '@/entities/metrologia'
import { MECANISMOS_ESTADO } from '@/entities/iso14224'
import { COMO } from '@/entities/causa-senal'
import { fechaHora } from '@/entities/reloj'
import type { ParadaMedida, Prediccion } from '@/entities/diferido'
import { useParadas } from '@/shared/api/diferidos'
import { useCiclo, planesDeEquipo } from '@/shared/api/ciclo'
import { PlanesDe } from '@/widgets/ciclo/Ciclo'
import { useApp, useRol, useRango } from '@/app/store'
import { Panel, Chip, Hueco, Boton } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { DE_ESTADO } from '@/shared/lib/prioridad'
import { Analogico } from '@/shared/ui/Analogico'
import { Lectura } from '@/shared/ui/Lectura'
import { Info } from '@/shared/ui/Info'
import { Tip } from '@/shared/ui/Tip'
import { BarraMeta } from '@/shared/ui/BarraMeta'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, n1, n3, decimalesDe, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { Proyeccion } from './Proyeccion'
import { fmtBbl, fmtRango, fmtTol, fmtComponente, fmtHoras, textoPronostico, pronosticoCorto, tanqueAbierto, fraseParteCorta, respaldoAbsorbe } from './comun'
import { NOMBRE_PARTE } from '@/entities/partes'
import { BloqueParte } from './BloqueParte'
import type { SaludParte } from '@/entities/salud'
import type { BombaVista } from './vista'
import type { NivelDetalle, Severidad } from '@/entities/tipos'
import { ESTADO_PARTE } from '@/entities/salud'
import { desplazable } from '@/shared/ui/alFinal'

/** Clases de la nota impresa de una fila de lista con raya: la raya va debajo de la nota. */
const NOTA_FILA = 'border-b border-[var(--linea2)] pb-1.5 last:border-0'

export function Detalle({ b, nivel = 'ingenieria', onVolver }: {
  b: BombaVista; nivel?: NivelDetalle; onVolver: () => void
}) {
  const { eq, perfil, senales, veredicto: ve, periodo, abierta, partes } = b
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

  const volver = (
    <button onClick={onVolver}
      className="mb-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-[12px] text-[var(--tinta2)] hover:text-[var(--tinta)]">
      <ArrowLeft className="size-3.5" /> Estación de bombas
    </button>
  )

  if (!perfil || !ve) {
    return (
      <>
        {volver}
        <Panel titulo={`${eq.id} · ${b.campo.nombre}`}>
          <Hueco>
            <span className="flex flex-wrap items-center gap-x-1">
              Sin perfil en {b.campo.nombre}: falta declarar papel, capacidad y respaldo.
              <Info titulo="Sin perfil" texto={`Esta bomba no tiene perfil en ${b.campo.nombre}. Hay que declarar qué hace con su fluido (transporte, disposición o recobro), su capacidad y su respaldo. Lo firma el administrador de la implementación; sin eso, el crudo en riesgo no se calcula.`} />
            </span>
          </Hueco>
        </Panel>
      </>
    )
  }

  const pr = ve.prediccion
  const h = ve.historial
  const plantilla = plantillaDe(perfil.subtipo)
  const faltan = plantilla.filter(pl => !perfil.tags[pl.id])
  const vigia = senales.filter(s => s.mecanismo)
    .sort((x, y) => (x.pronostico.tipo === 'cruza' ? x.pronostico.horas : Infinity)
      - (y.pronostico.tipo === 'cruza' ? y.pronostico.horas : Infinity))
  const meses = n0(h.dias / 30.4)

  return (
    <>
      {volver}
      <div className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
          <MarcaPrioridad s={eq.severidad} tamano={18} className="mt-0.5" />
          <span className="min-w-0 flex-1">
            <b className="block text-[16px] leading-tight [text-wrap:balance]">{eq.nombre}</b>
            <small className="font-mono text-[10.5px] text-[var(--tinta3)]">
              {eq.id} · {b.campo.nombre} · {TECNOLOGIA_NOMBRE[perfil.tecnologia]}
            </small>
          </span>
          <span className="flex flex-wrap gap-1">
            <Chip>{PAPEL_NOMBRE[perfil.papel]}</Chip>
            <Chip>{pr.respaldoLibreBpd > 0 ? `respaldo ${n0(pr.respaldoLibreBpd)} bbl/d` : 'sin respaldo'}</Chip>
          </span>
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-[var(--tinta2)]">
          {eq.estado}
          {ing && <Info rotulo="norma" titulo="Norma" texto={perfil.norma} />}
        </p>

        <div className="mt-3 grid gap-x-6 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <Cifra rotulo="Diferido que causó"
            valor={periodo && periodo.bbl > 0 ? fmtBbl(periodo.bbl) : '0 bbl'}
            pie={periodo && periodo.bbl > 0
              ? `${ing ? `${fmtRango(periodo.rango)} · calculado · ${fmtTol(periodo.tolerancia)} · ` : ''}${plural(periodo.eventos, 'parada', 'paradas')}`
              : 'ninguna parada con costo'} />
          {pr.perdiendo ? (
            <Cifra rotulo="Perdiéndose ahora" valor={`${n0(pr.perdiendo.bblDia)} bbl/d`} prioridad={eq.severidad}
              pie={`${n0(pr.perdiendo.bblDia / 24)} bbl/h · ${plural(pr.perdiendo.pozos.length, 'pozo cerrado', 'pozos cerrados')}`} />
          ) : (
            <Cifra rotulo="Si se para ahora"
              valor={!pr.inmediato || respaldoAbsorbe(pr) ? 'no cierra pozos' : `${n0(pr.crudoBpd)} bbl/d`}
              pie={!pr.inmediato ? 'recobro: el efecto llega en semanas' : respaldoAbsorbe(pr) ? 'el respaldo absorbe toda el agua'
                : pr.colchon ? `tras ${fmtHoras(pr.colchon.horas, true)} de colchón${ing ? ` · ${fmtTol(pr.tolerancia)}` : ''}` : `de inmediato${ing ? ` · ${fmtTol(pr.tolerancia)}` : ''}`} />
          )}
          {ing && (
            // Lo que YA costó cada falla (histórico). Lo que costaría si falla hoy es la cifra de Riesgo.
            <Cifra rotulo="Le ha costado por falla"
              valor={ve.porFalla !== undefined ? fmtBbl(ve.porFalla) : 'sin fallas'}
              pie={h.fallas ? `${plural(h.fallas, 'falla', 'fallas')} en ${meses} meses${h.mtbfDias ? ` · cada ${n0(h.mtbfDias)} d` : ''}${h.mdtH ? ` · ${fmtHoras(h.mdtH, true)} fuera` : ''}` : 'sin fallas en la historia que hay'} />
          )}
        </div>
      </div>

      {planes.length > 0 && (
        <div className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-3 shadow-[var(--sombra)]">
          <PlanesDe planes={planes} />
        </div>
      )}

      {abierta?.pide && (
        <div className="mb-2.5 flex flex-wrap items-center gap-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-3 shadow-[var(--sombra)]">
          <MarcaPrioridad s={2} tamano={16} />
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-[12px]">
            <b>No arrancar hasta identificar el daño</b>
            <Info titulo="No arrancar"
              texto="La parada no dejó primera alarma ni una firma clara en las señales. Quien la revise tiene que decir qué parte se dañó. TRIM no bloquea el PLC: es la regla de operación, y si arranca sin identificar queda como no conformidad." />
          </span>
          {rol.pantallas.includes('causa') && <Boton variante="principal" onClick={() => setPantalla('causa')}>Identificar</Boton>}
        </div>
      )}

      <Lectura>
        <b>Diferido que causó</b> es crudo que no se produjo porque esta bomba paró: los pozos
        que se cerraron, cada uno con su prueba y el factor del mes, por las horas que el controlador
        los tuvo apagados (se le carga a ella). <b>Si se para ahora</b> sale del nivel del tanque, del
        caudal que mueve la bomba y de las pruebas de los pozos. Nada de esto lo escribe una persona.
        Las ⓘ dicen el porqué; toque o pase el cursor.
      </Lectura>

      {pr.inmediato && <SiSePara pr={pr} simple={!ing} />}

      {!ing && <PartesOperacion partes={partes} senales={senales} />}

      {ing && <Panel className="mt-2.5" titulo="SALUD POR PARTE">
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

      {ing && <div className="mt-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        <Panel titulo="VARIABLES" extra={`${plantilla.length - faltan.length} de ${plantilla.length} instrumentadas`}>
          {plantilla.filter(pl => perfil.tags[pl.id]).map(pl => {
            const s = senales.find(x => x.plantilla.id === pl.id)
            return (
              <div key={pl.id} className="border-b border-[var(--linea2)] py-2 last:border-0">
                {s ? (
                  <Analogico detalle nombre={pl.nombre} sub={`${perfil.tags[pl.id]} · ${s.origen}`}
                    valor={s.valor} unidad={s.unidad} normal={s.normal} alarma={s.alarma}
                    decimales={decimalesDe(s.serie?.valores, s.valor)} estado={DE_ESTADO[s.estado] ?? undefined} />
                ) : (
                  <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                    <span>{pl.nombre}</span>
                    <span className="text-[10.5px] text-[var(--tinta3)]">sin lectura numérica</span>
                  </div>
                )}
              </div>
            )
          })}
          {faltan.length > 0 && (
            <>
              <div className="mb-1 mt-3 flex flex-wrap items-center gap-x-1">
                <h4 className="font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">FALTA INSTRUMENTAR</h4>
                <Info titulo="Falta instrumentar" texto="Lo que pide la norma y esta bomba no tiene. Toque o pase el cursor por cada una para ver dónde iría." />
              </div>
              {faltan.map(pl => (
                <Tip key={pl.id} titulo={`${pl.isa} · ${pl.nombre}`} filas={[['Dónde', pl.donde]]} imprimir="todo" claseImpresion={NOTA_FILA}
                  className="flex items-center gap-2 border-b border-dashed border-[var(--linea2)] py-1 text-[11px] last:border-0 print:border-b-0">
                  <span className="font-mono w-[34px] shrink-0 text-[10px] text-[var(--tinta3)]">{pl.isa}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--tinta2)]">{pl.nombre}</span>
                </Tip>
              ))}
            </>
          )}
          <Lectura>
            La raya gris clara es la banda normal; las marcas verticales son los límites de alarma;
            el triángulo es el valor de ahora. Todo gris quiere decir normal. El color aparece solo
            cuando algo sale de banda, y siempre con su forma: rombo 1, triángulo 2, cuadrado 3.
          </Lectura>
        </Panel>

        <Panel titulo="VIGÍA" extra={vigia.length ? plural(vigia.length, 'señal', 'señales') : 'sin señales'}>
          {vigia.length === 0 && <Hueco>Ninguna variable instrumentada anuncia degradación.</Hueco>}
          {vigia.map(s => (
            <div key={s.tag} className="border-b border-[var(--linea2)] py-2 last:border-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <b className="text-[12px]">{s.plantilla.nombre}</b>
                <span className="font-mono text-[10px] text-[var(--tinta3)]">
                  ISO 14224 {s.mecanismo!.codigo} · {s.mecanismo!.nombre}
                </span>
              </div>
              <p className={cn('flex flex-wrap items-center gap-x-1 text-[11.5px]', s.pronostico.tipo === 'cruza' ? 'text-[var(--tinta)]' : 'text-[var(--tinta3)]')}>
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

      <Panel className="mt-2.5" titulo={ing ? 'PARADAS DEL PLC' : 'ÚLTIMAS PARADAS'} extra={plural(paradas.length, 'parada', 'paradas')}>
        {paradas.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Sin paradas registradas.</p>}
        {listaParadas.visibles.map((m, i) => <Parada key={m.evento.id} m={m} equipo={eq.id} simple={!ing} abiertaDeInicio={i === 0} />)}
        {listaParadas.resto.length > 0 && (
          <div className="solo-impresion">
            {listaParadas.resto.map(m => <Parada key={m.evento.id} m={m} equipo={eq.id} simple={!ing} abiertaDeInicio={false} />)}
          </div>
        )}
        <VerMas ocultas={listaParadas.ocultas} abierto={listaParadas.abierto} onAlternar={listaParadas.alternar} />
        {ing && <p className="mt-2 flex flex-wrap items-center text-[10px] text-[var(--tinta3)]"><Info rotulo="tolerancia" titulo="Método de la tolerancia" texto={FUENTE_METODO} /></p>}
      </Panel>

      {ing && <Panel className="mt-2.5" titulo="PUNTOS CIEGOS">
        <Lectura>Lo que esta bomba no dice de sí misma, y de dónde sale. La ⓘ dice por qué.</Lectura>
        {NO_DA[perfil.subtipo].map(x => (
          <div key={x.que} className="grid grid-cols-[minmax(0,140px)_1fr] gap-3 border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
            <b>{x.que}</b>
            <span className="flex flex-wrap items-center gap-x-1 text-[var(--tinta2)]">
              <span>sale de {x.deDonde.charAt(0).toLowerCase() + x.deDonde.slice(1)}</span>
              <Info titulo={x.que} texto={`${x.porque}. Sale de: ${x.deDonde}.`} />
            </span>
          </div>
        ))}
        <p className="mt-2 flex flex-wrap items-center text-[10px] text-[var(--tinta3)]"><Info rotulo="mecanismos" titulo="Mecanismos" texto={MECANISMOS_ESTADO} /></p>
      </Panel>}
    </>
  )
}

/** ISA-101: la cifra va en tinta y la forma lleva el color de la prioridad
 *  (la misma de la bomba en la lista): un número rojo sin forma no se lee al
 *  sol ni en blanco y negro, y en oscuro daba 2,5:1. */
function Cifra({ rotulo, valor, pie, prioridad = 0 }: { rotulo: string; valor: string; pie: string; prioridad?: Severidad }) {
  return (
    <span className="min-w-0">
      <small className="block text-[10.5px] text-[var(--tinta3)]">{rotulo}</small>
      <b className="tabular flex items-center gap-1.5 text-[20px] leading-tight">{prioridad > 0 && <MarcaPrioridad s={prioridad} tamano={14} />}{valor}</b>
      <small className="tabular block text-[10.5px] leading-snug text-[var(--tinta2)]">{pie}</small>
    </span>
  )
}

const H5 = ({ children }: { children: React.ReactNode }) =>
  <h5 className="font-cond mb-1 mt-2 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)] first:mt-0">{children}</h5>

/** Un título de bloque con su ⓘ al lado (nunca adentro: el lector oiría la frase como nombre). */
const H5Info = ({ children, info }: { children: React.ReactNode; info: React.ReactNode }) => (
  <div className="mb-1 mt-2 flex flex-wrap items-center gap-x-1 first:mt-0">
    <h5 className="font-cond text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">{children}</h5>
    {info}
  </div>
)

/** Si la bomba se para ahora: cuánto aguanta el tanque, qué pozos cerrar y en
 *  qué orden, y cuánto se gana cerrando bien. */
function SiSePara({ pr, simple = false }: { pr: Prediccion; simple?: boolean }) {
  const o = pr.orden
  const pasos = useVerMas(o?.pasos.slice(0, 12) ?? [])
  const cerrados = useVerMas(pr.perdiendo?.pozos ?? [])
  // Las filas que esconde «ver N más» salen igual en el papel.
  const fila = (x: NonNullable<typeof o>['pasos'][number], i: number, papel = false) => (
    <tr key={x.pozo.id} className={cn('border-t border-[var(--linea2)]', papel && 'hidden print:table-row')}>
      <td className="py-1 text-[var(--tinta3)]">{i + 1}</td>
      <td className="font-mono">{x.pozo.id}</td>
      <td className="text-right">{n0(x.crudoBpd)}</td>
      <td className="text-right">{n0(x.aguaBpd)}</td>
      {/* Con 95-98 % de agua el crudo por barril de agua va de 0,01 a 0,05: dos decimales no separan los pozos. */}
      <td className="text-right">{n3(x.crudoPorAgua)}</td>
      <td className="text-right">{x.fraccion >= 0.999 ? 'entero' : `${n0(x.fraccion * 100)} %`}</td>
    </tr>
  )
  return (
    <Panel className="mt-2.5" titulo={pr.parada ? 'MIENTRAS ESTÉ PARADA' : 'SI SE PARA AHORA'}
      extra={pr.colchon ? `${pr.colchon.tanque.id} · ${pr.colchon.nivel.tag} ${n1(pr.colchon.nivel.pct)} %` : undefined}>
      {pr.parada && <p className="mb-2 text-[12px] text-[var(--tinta2)]">Parada desde {fechaHora(new Date(pr.parada.inicio))}</p>}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {pr.colchon && !pr.parada && (
          <div className="text-[11.5px]">
            <H5>COLCHÓN DEL TANQUE</H5>
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
          <div className="min-w-0 text-[11px]">
            <H5Info info={<Info titulo="Al arrancar" texto={`Se pierden ${n0(pr.perdiendo.bblDia)} bbl/d mientras siga parada. Al arrancar, los pozos vuelven a producir a medida que el tanque baja.`} />}>
              POZOS QUE CERRÓ · {pr.perdiendo.pozos.length}
            </H5Info>
            <p className="text-[11.5px] text-[var(--tinta2)]">
              {cerrados.visibles.map(w => w.id).join(', ')}
              {cerrados.resto.length > 0 && <span className="hidden print:inline">, {cerrados.resto.map(w => w.id).join(', ')}</span>}
            </p>
            <VerMas ocultas={cerrados.ocultas} abierto={cerrados.abierto} onAlternar={cerrados.alternar} />
          </div>
        )}
        {!pr.parada && o && o.pasos.length > 0 && (
          <div className="min-w-0 text-[11px]">
            <H5Info info={<Info titulo="Orden de cierre" texto="Menos crudo por barril de agua primero." />}>ORDEN DE CIERRE</H5Info>
            <div {...desplazable('En qué orden cerrar los pozos')} className="overflow-x-auto">
              <table className="tabular w-full min-w-[360px] text-left">
                <thead className="text-[9.5px] text-[var(--tinta3)]">
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
            {o.pasos.length > 12 && <small className="block text-[10px] text-[var(--tinta3)]">y {o.pasos.length - 12} pozos más: se cierra todo el campo.</small>}
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[11.5px]">
              <span>pierde <b>{n0(o.crudoBpd)} bbl/d</b> en este orden{o.ahorroBpd > 1 && <> · <b>{n0(o.ahorroBpd)} bbl/d menos</b> que parejo</>}</span>
              {o.ahorroBpd > 1 && <Info titulo="Parejo" texto={`Cerrando parejo (la misma fracción a todos) serían ${n0(o.crudoParejoBpd)} bbl/d.`} />}
            </p>
          </div>
        )}
        {!o && pr.perfil.papel === 'transporte' && (
          <div className="text-[11px]">
            <H5>POZOS QUE PASAN POR ELLA</H5>
            <ul className="list-disc pl-4 text-[var(--tinta2)]">{pr.supuestos.slice(0, -1).map(s => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
      </div>
      {/* Parada, el método solo repite «Parada desde…» y «POZOS QUE CERRÓ»: no va. */}
      {(!pr.parada || !simple) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[10.5px]">
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
      <span className="font-mono">{x.pozo}</span>
      <span className="text-[var(--tinta2)]">{fmtHoras(x.horas, true)}{x.aprox ? ' · frecuencia reducida' : ''}</span>
      <b>{n0(x.bbl)}</b>
    </div>
  )
  // El colchón en corto: lo previsto y lo que aguantó. La frase entera va abierta, en «EL TANQUE».
  const colchon = m.colchon && `colchón ${fmtHoras(m.colchon.previsto.horas, true)}${m.colchon.observadoH !== undefined ? ` · aguantó ${fmtHoras(m.colchon.observadoH, true)}`
    : m.abierto ? (m.colchon.previsto.horas > m.horasParada ? ` · faltan ${fmtHoras(m.colchon.previsto.horas - m.horasParada, true)}` : ' · ya pasó, sin cerrar pozos') : ' · sin cerrar pozos'}`
  return (
    <div className="border-b border-[var(--linea2)] last:border-0">
      <button onClick={() => setAbierta(v => !v)} aria-expanded={abierta}
        className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-3 py-2 text-left hover:bg-[var(--panel2)] sm:grid-cols-[150px_1fr_auto_auto]">
        <span className="tabular text-[11.5px]">
          <b className="block">{fechaHora(m.inicio)}</b>
          {/* De la parada de la bomba a su arranque. La ficha cuenta otra duración
              (hasta que reabrió el último pozo): por eso cada una dice cuál es. */}
          <small className="text-[10px] text-[var(--tinta3)]">{m.abierto ? 'abierta' : `hasta ${fechaHora(m.fin)}`} · bomba parada {fmtHoras(m.horasParada, true)}</small>
        </span>
        <span className="hidden min-w-0 text-[11px] text-[var(--tinta2)] sm:block">
          {/* Sin identificar, la causa la dice su marca («por identificar», «arrancó sin identificar»); la frase, abierta. */}
          {c.parte ? <b className="text-[var(--tinta)]">{NOMBRE_PARTE[c.parte]}</b> : !m.pide ? <span>{c.texto}</span> : null}
          {/* Cada pieza lleva su « · » delante, salvo la primera que se ve. */}
          {[
            // «Mantenimiento preventivo programado…» ya dice «por el programa aprobado».
            !m.pide && !(c.como === 'programa' && !c.parte) && <span key="como" className="text-[10.5px] text-[var(--tinta3)]">{COMO[c.como]}</span>,
            !propia && <span key="carga" className="text-[10.5px] text-[var(--tinta)]">se carga a {m.cargadoA}</span>,
            c.tipo === 'programada' && c.como !== 'programa' && <span key="prog" className="text-[10.5px] text-[var(--tinta3)]">programada</span>,
            colchon && <span key="colchon" className="text-[10.5px]">{colchon}</span>,
          ].filter(Boolean).map((x, i) => <span key={i}>{i > 0 || c.parte || !m.pide ? ' · ' : ''}{x}</span>)}
          {m.arrancoSinIdentificar && <span className="ml-1 inline-flex items-center gap-1 text-[10.5px] text-[var(--tinta)]"><MarcaPrioridad s={3} tamano={10} />arrancó sin identificar</span>}
          {m.pide && !m.arrancoSinIdentificar && <span className="ml-1 inline-flex items-center gap-1 text-[10.5px] text-[var(--tinta)]"><MarcaPrioridad s={2} tamano={10} />por identificar</span>}
        </span>
        <span className="tabular text-right">
          {/* La parada abierta ya lleva su forma en la bomba y en «Perdiéndose ahora»: la cifra, en tinta. */}
          <b className="block text-[15px]">{fmtBbl(m.bbl)}</b>
          <small className="text-[10px] text-[var(--tinta3)]">{m.bbl <= 0 ? 'no costó crudo' : simple ? plural(m.pozos, 'pozo cerrado', 'pozos cerrados') : `${fmtRango(m.rango)} · ${fmtTol(m.tolerancia)}`}</small>
        </span>
        <ChevronDown className={cn('size-4 text-[var(--tinta3)] transition-transform', abierta && 'rotate-180')} />
      </button>
      {abierta && (
        <div className="grid gap-3 pb-3 pl-1 text-[11px] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          <div>
            {/* Sin identificar, la frase repite lo que ya dicen el título y su marca: va en la ⓘ. */}
            {m.pide
              ? <H5Info info={<Info titulo="Por qué paró" texto={c.texto} />}>POR QUÉ PARÓ · {COMO[c.como].toUpperCase()}</H5Info>
              : <><H5>POR QUÉ PARÓ · {COMO[c.como].toUpperCase()}</H5><p className="text-[var(--tinta)]">{c.texto}</p></>}
            <ul className="mt-1 list-disc pl-4 text-[var(--tinta2)]">
              {c.evidencia.map(e => <li key={e} className="font-mono text-[10.5px]">{e}</li>)}
            </ul>
            {c.declarado && <p className="mt-1 text-[10.5px] text-[var(--tinta3)]">Declarado por {c.declarado.por} · {fechaHora(new Date(c.declarado.hora))}</p>}
            {m.colchon && (
              <>
                <H5>EL TANQUE</H5>
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
            <H5>POZOS QUE CERRÓ · {pozos.length}</H5>
            {pozos.length === 0 && <p className="text-[var(--tinta2)]">Ninguno.</p>}
            {lista.visibles.map(filaPozo)}
            {lista.resto.length > 0 && <div className="solo-impresion">{lista.resto.map(filaPozo)}</div>}
            <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
            {m.evitable > 0 && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[var(--tinta2)]">
                <span>evitable en orden: <b className="text-[var(--tinta)]">{n0(m.evitable)} bbl</b></span>
                <Info titulo="Evitable" texto={`Cerrando primero los de menos crudo por barril de agua se habrían perdido ${n0(m.evitable)} bbl menos.`} />
              </p>
            )}
            {m.aproximado > 0 && (
              <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[10.5px] text-[var(--tinta3)]">
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
function PartesOperacion({ partes, senales }: { partes: SaludParte[]; senales: BombaVista['senales'] }) {
  const avisan = partes.filter(p => p.estado === 'fallo' || p.estado === 'fuera' || p.estado === 'avisa')
  const fuera = senales.filter(x => x.estado !== 'normal' && x.valor !== null)
  return (
    <div className="mt-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
      <Panel titulo="PARTES QUE AVISAN" extra={avisan.length ? `${avisan.length}` : undefined}>
        {avisan.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Ninguna avisa.</p>}
        {avisan.map(sp => (
          <div key={sp.parte.id} className="border-b border-[var(--linea2)] py-2 text-[12px] last:border-0">
            <span className="flex flex-wrap items-center gap-2">
              <MarcaPrioridad s={sp.prioridad} tamano={12} />
              <b>{sp.parte.nombre}</b>
              <Chip tono={sp.estado === 'avisa' ? 'neutro' : 'fuerte'}>{ESTADO_PARTE[sp.estado]}</Chip>
            </span>
            <small className="tabular mt-0.5 block text-[11px] text-[var(--tinta2)]">{fraseParteCorta(sp)}</small>
            {/* Operación ejecuta la acción: va escrita, no detrás de un ⓘ. */}
            <small className="mt-0.5 block text-[11px] text-[var(--tinta)]"><b>Qué hacer:</b> {sp.parte.accion}</small>
          </div>
        ))}
      </Panel>
      <Panel titulo="FUERA DE BANDA" extra={fuera.length ? `${fuera.length}` : undefined}>
        {fuera.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Todo en banda.</p>}
        {fuera.map(x => (
          <div key={x.tag} className="border-b border-[var(--linea2)] py-2 last:border-0">
            <Analogico detalle nombre={x.plantilla.nombre} sub={x.tag} valor={x.valor} unidad={x.unidad} normal={x.normal}
              alarma={x.alarma} decimales={decimalesDe(x.serie?.valores, x.valor)} estado={DE_ESTADO[x.estado] ?? undefined} />
          </div>
        ))}
      </Panel>
    </div>
  )
}

