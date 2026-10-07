import { useApp, useAmbito, useRol, useRango, useNivel } from '@/app/store'
import { Tendencia } from '@/widgets/resumen/ResumenDirectivo'
import { campoPorId } from '@/entities/campos'
import { criterioEn, SIN_META } from '@/entities/configuracion'
import { AHORA } from '@/entities/reloj'
import { useLibro, useSerie, useBase, useCtx } from '@/shared/api/diferidos'
import { Encabezado } from '@/widgets/diferidos/Encabezado'
import { MesAMes } from '@/widgets/diferidos/MesAMes'
import { Cuadre } from '@/widgets/diferidos/Cuadre'
import { Factor } from '@/widgets/diferidos/Factor'
import { ParetoEquipos, ParetoPartes, ParetoTipos, Palancas } from '@/widgets/diferidos/Paretos'
import { Panel } from '@/shared/ui/primitivas'
import { FueraDeMeta } from '@/shared/ui/Prioridad'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { n0, n1, diaIso as dia } from '@/shared/lib/formato'
import { publicacion } from '@/widgets/diferidos/publicacion'

/** El libro de diferidos: lo que no se produjo en el período, si cuadra con
 *  la medición oficial, a qué equipo y a qué parte se le carga, y dónde se
 *  puede bajar. */
export function Diferidos() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol(); const ctx = useCtx(); const nivel = useNivel()
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
  // de alto impacto contra el máximo firmado, si se puede publicar, dónde se puede
  // bajar y quién se lo lleva.
  if (nivel === 'decision') return (
    <>
      <Encabezado lb={lb} base={base} nombrePeriodo={rango.nombre} ambito={ambito.titulo} simple />
      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        <Panel titulo="MES A MES" extra="bbl/día · clic en un mes para verlo">
          <Tendencia serie={serie} desde={rango.desde} hasta={rango.hasta}
            onMes={m => setRango(dia(m.desde), dia(new Date(m.hasta.getTime() - 1)))} />
          <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[var(--tinta2)]">
            {publicacion(lb).estado === 'bloqueado' && <FueraDeMeta si tamano={11} />}
            <span>{publicacion(lb).texto}</span>
          </p>
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

      <Panel className="mb-2.5" titulo="MES A MES" extra="clic en un mes para verlo">
        <MesAMes serie={serie} desde={rango.desde} hasta={rango.hasta}
          onMes={m => setRango(dia(m.desde), dia(new Date(m.hasta.getTime() - 1)))} />
      </Panel>

      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <Cuadre lb={lb} onIdentificar={irA('causa')} />
        {ambito.global ? (
          <Panel titulo="DIFERIDO POR CAMPO" extra="clic para abrirlo">
            <Lectura>
              Cada campo con su diferido, el máximo que firmó el gerente y cuánto tiene causa probada.
              El cuadrado junto a la cifra marca el que no puede publicar: factor fuera de banda o
              demasiado sin identificar.
            </Lectura>
            {lb.porCampo.map(f => {
              const c = campoPorId(f.campoId)
              const crit = criterioEn(ctx.config, f.campoId, Math.min(rango.hasta.getTime(), AHORA.getTime()) - 1)
              // Sin meta firmada no hay máximo contra qué marcar ni regla de cierre: no se publica (motivo «sin-meta»).
              const sobreMax = !f.sinMeta && f.brecha > f.metaDiferido
              const bloqueado = f.sinMeta || lb.fa.some(x => x.campoId === f.campoId && !x.dentro) || (crit !== undefined && f.potencial > 0 && (f.pendiente / f.potencial) * 100 > crit)
              const maximo = f.sinMeta ? SIN_META : `${n0(f.metaDiferido)} bbl`
              const w = (v: number) => `${lb.brecha ? (Math.max(0, v) / lb.brecha) * 100 : 0}%`
              return (
                <Tip key={f.campoId} as="button" onClick={() => setCampo(f.campoId)} titulo={c.nombre} pista={c.nota}
                  filas={[['Diferidos', `${n0(f.brecha)} bbl`], ['Del total', `${n1(lb.brecha ? (f.brecha / lb.brecha) * 100 : 0)} %`],
                    ['Por señal', `${n0(f.identificado)} bbl`], ['Declarado', `${n0(f.declarado)} bbl`], ['Sin identificar', `${n0(f.pendiente)} bbl`],
                    ['Alto impacto', `${n0(f.altoImpacto)} bbl`], ['Máximo firmado', maximo], ['Publicable', bloqueado ? 'no' : 'sí']]}
                  className="mb-2 block w-full cursor-pointer text-left">
                  <div className="flex justify-between gap-2 text-[11.5px]">
                    <span className="min-w-0 truncate">{c.nombre} <span className="text-[var(--tinta3)]">· <FueraDeMeta si={sobreMax} tamano={11} />{f.sinMeta ? SIN_META : `máx. ${maximo} en el período`}</span></span>
                    <span className="tabular shrink-0"><FueraDeMeta si={bloqueado} tamano={10} />{n0(f.brecha)}</span>
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
          <Panel titulo="FACTOR DE ASIGNACIÓN" extra="mes a mes, contra su banda">
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
