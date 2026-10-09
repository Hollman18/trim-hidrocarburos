import { useApp, useAmbito, useRol, useRango, useNivel } from '@/app/store'
import { Tendencia } from '@/widgets/resumen/ResumenDirectivo'
import { campoPorId } from '@/entities/campos'
import { SIN_META } from '@/entities/configuracion'
import { useLibro, useSerie, useBase } from '@/shared/api/diferidos'
import { Encabezado } from '@/widgets/diferidos/Encabezado'
import { MesAMes } from '@/widgets/diferidos/MesAMes'
import { Cuadre } from '@/widgets/diferidos/Cuadre'
import { Factor } from '@/widgets/diferidos/Factor'
import { campoPublicable } from '@/widgets/diferidos/publicacion'
import { ParetoEquipos, ParetoPartes, ParetoTipos, Palancas } from '@/widgets/diferidos/Paretos'
import { Panel } from '@/shared/ui/primitivas'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { n0, n1, diaIso as dia } from '@/shared/lib/formato'

/** El libro de diferidos: lo que no se produjo en el período, si cuadra con
 *  la medición oficial, a qué equipo y a qué parte se le carga, y dónde se
 *  puede bajar. */
export function Diferidos() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol(); const nivel = useNivel()
  const abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla), setCampo = useApp(s => s.setCampo), setRango = useApp(s => s.setRango), campoId = useApp(s => s.campoId)
  const ids = ambito.campos.map(c => c.id)
  const q = { campos: ids, desde: rango.desde, hasta: rango.hasta }
  const lb = useLibro(q)
  const serie = useSerie(ids)
  const base = useBase(q)

  const abrir = (c: string, eq: string) => {
    if (c !== campoId || ambito.global) setCampo(c)
    abrirEquipo(eq)
  }
  const irA = (p: string) => (rol.pantallas.includes(p) ? () => setPantalla(p) : undefined)

  // El directivo ve el mismo libro sin el cuadre técnico: la tendencia de lo
  // de alto impacto contra el máximo firmado, si se puede publicar (el sello
  // del encabezado), dónde se puede bajar y quién se lo lleva. El diferido por
  // día contra el máximo va en el encabezado: «Dónde bajarlo» no lo repite.
  if (nivel === 'decision') return (
    <>
      <Encabezado lb={lb} base={base} nombrePeriodo={rango.nombre} ambito={ambito.titulo} simple />
      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        <Panel titulo="MES A MES">
          <Tendencia serie={serie} desde={rango.desde} hasta={rango.hasta}
            onMes={m => setRango(dia(m.desde), dia(new Date(m.hasta.getTime() - 1)))} />
          <Lectura>
            Diferido por día de cada mes: lo de alto impacto, oscuro; la raya, el máximo que usted firmó
            para ese mes. Toque o pase el cursor por un mes para ver sus cifras; un clic lo abre.
          </Lectura>
        </Panel>
        <Palancas lb={lb} base={base} />
      </div>
      <div className="grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
        <ParetoEquipos lb={lb} global={ambito.global} simple onAbrir={abrir} />
        <ParetoTipos lb={lb} />
      </div>
    </>
  )

  return (
    <>
      <Encabezado lb={lb} base={base} nombrePeriodo={rango.nombre} ambito={ambito.titulo} />

      <Panel className="mb-2.5" titulo="MES A MES">
        <MesAMes serie={serie} desde={rango.desde} hasta={rango.hasta}
          onMes={m => setRango(dia(m.desde), dia(new Date(m.hasta.getTime() - 1)))} />
      </Panel>

      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <Cuadre lb={lb} onIdentificar={irA('causa')} />
        {ambito.global ? (
          <Panel titulo="POR CAMPO" extra="bbl">
            <Lectura>
              Cada campo con su diferido, el máximo que firmó el gerente para el período y cuánto tiene
              causa probada (la barra: por señal, declarado y, rayado, sin identificar). El cuadrado junto
              a «máx.» marca el que lo pasó; junto a la cifra, el que no se puede publicar (el sello dice
              por qué). Un clic abre el campo.
            </Lectura>
            {lb.porCampo.map(f => {
              const c = campoPorId(f.campoId)
              const sobreMax = !f.sinMeta && f.brecha > f.metaDiferido
              // Los motivos del libro de ese campo (todos menos «en curso»): la regla del sello, no una propia.
              const bloqueado = !campoPublicable(lb, f.campoId)
              const maximo = f.sinMeta ? SIN_META : `${n0(f.metaDiferido)} bbl`
              const w = (v: number) => `${lb.brecha ? (Math.max(0, v) / lb.brecha) * 100 : 0}%`
              return (
                <Tip key={f.campoId} as="button" onClick={() => setCampo(f.campoId)} titulo={c.nombre} pista={c.nota}
                  filas={[['Diferidos', `${n0(f.brecha)} bbl`], ['Del total', `${n1(lb.brecha ? (f.brecha / lb.brecha) * 100 : 0)} %`],
                    ['Por señal', `${n0(f.identificado)} bbl`], ['Declarado', `${n0(f.declarado)} bbl`], ['Sin identificar', `${n0(f.pendiente)} bbl`],
                    ['Alto impacto', `${n0(f.altoImpacto)} bbl`], ['Máximo firmado', maximo], ['Publicable', bloqueado ? 'no' : 'sí']]}
                  className="mb-2 block w-full cursor-pointer text-left">
                  <div className="flex justify-between gap-2 text-[11.5px]">
                    <span className="min-w-0 truncate">{c.nombre} <span className="text-[var(--tinta3)]">· <FueraDeMeta si={sobreMax} tamano={11} />{f.sinMeta ? SIN_META : `máx. ${n0(f.metaDiferido)} bbl`}</span></span>
                    <span className="tabular shrink-0"><FueraDeMeta si={bloqueado} tamano={10} />{n0(f.brecha)}<span className="sr-only"> bbl diferidos</span></span>
                  </div>
                  <div className="mt-1 flex h-2 overflow-hidden rounded-sm bg-[var(--panel2)]">
                    <i className="block h-full bg-[var(--dato-1)]" style={{ width: w(f.identificado) }} />
                    <i className="block h-full bg-[var(--dato-3)]" style={{ width: w(f.declarado) }} />
                    <i className="block h-full" style={{ width: w(f.pendiente), background: 'repeating-linear-gradient(45deg, var(--tinta3), var(--tinta3) 2px, transparent 2px, transparent 4px)' }} />
                  </div>
                </Tip>
              )
            })}
          </Panel>
        ) : (
          <Panel titulo="FACTOR DE ASIGNACIÓN" extra="contra su banda">
            <Factor serie={serie} campoId={ids[0]!} desde={rango.desde} hasta={rango.hasta} />
          </Panel>
        )}
      </div>

      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <Palancas lb={lb} base={base} />
        <ParetoTipos lb={lb} />
      </div>

      <div className="grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        <ParetoEquipos lb={lb} global={ambito.global} onAbrir={abrir} />
        <ParetoPartes lb={lb} onIr={irA('bombas')} />
      </div>
    </>
  )
}
