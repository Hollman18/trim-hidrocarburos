import { useApp, useCampos, useRango, useRol } from '@/app/store'
import { campoPorId } from '@/entities/campos'
import { SIN_META } from '@/entities/configuracion'
import { fechaCorta } from '@/entities/reloj'
import { useLibro, useSerie, useBase, useEstadoCampos } from '@/shared/api/diferidos'
import { Encabezado } from '@/widgets/diferidos/Encabezado'
import { MesAMes } from '@/widgets/diferidos/MesAMes'
import { ParetoEquipos, ParetoPartes, ParetoTipos, Palancas } from '@/widgets/diferidos/Paretos'
import { Ahora } from '@/widgets/riesgo/Ahora'
import { Panel, Chip, Hueco } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n1, diaIso as dia } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { MarcaPrioridad, FueraDeMeta } from '@/shared/ui/Prioridad'
import { publicacion } from '@/widgets/diferidos/publicacion'

/** El portafolio para el directivo: lo que no se produjo en todos sus campos,
 *  mes a mes, y de ahí hacia abajo, a qué campo, a qué equipo y a qué parte. */
export function Portafolio() {
  const setCampo = useApp(s => s.setCampo), setPantalla = useApp(s => s.setPantalla), setRango = useApp(s => s.setRango), campoId = useApp(s => s.campoId), abrirEquipo = useApp(s => s.abrirEquipo)
  const rango = useRango(); const rol = useRol()
  const CAMPOS = useCampos()
  const ids = CAMPOS.map(c => c.id)
  const q = { campos: ids, desde: rango.desde, hasta: rango.hasta }
  const lb = useLibro(q)
  const serie = useSerie(ids)
  const base = useBase(q)
  const estados = useEstadoCampos(ids)
  const irA = (p: string) => (rol.pantallas.includes(p) ? () => setPantalla(p) : undefined)

  const abrir = (id: string) => { setCampo(id); setPantalla('resumen') }

  return (
    <>
      <Encabezado lb={lb} base={base} nombrePeriodo={rango.nombre} ambito={`${CAMPOS.length} campos`} />

      <Ahora campos={ids} global onRiesgo={irA('riesgo')} onIdentificar={irA('causa')} />

      {publicacion(lb).estado === 'bloqueado' && (
        <div className="mb-2.5">
          <Hueco>{publicacion(lb).texto}</Hueco>
        </div>
      )}

      <Panel className="mb-2.5" titulo="MES A MES · TODOS LOS CAMPOS" extra="clic en un mes para verlo">
        <MesAMes serie={serie} desde={rango.desde} hasta={rango.hasta}
          onMes={m => setRango(dia(m.desde), dia(new Date(m.hasta.getTime() - 1)))} />
      </Panel>

      <Panel className="mb-2.5" titulo="CAMPOS" extra="ordenados por diferido · clic para abrir">
        <Lectura>
          El diferido manda el orden: un campo chico lejos de su meta puede pesar menos que uno grande
          cerca de la suya. La barra es lo producido por día y la raya, la meta de producción que firmó
          el gerente. Lo de ayer es el punto de medición oficial del último día completo.
        </Lectura>
        {lb.porCampo.map((f, i) => {
          const c = campoPorId(f.campoId)
          const e = estados.find(x => x.campoId === f.campoId)
          const dias = Math.max(1 / 24, lb.meta.dias)
          const real = f.real / dias, meta = f.metaProduccion / dias
          // La raya de la meta va al 80 % del ancho: así cabe ver cuánto se pasa.
          const ancho = meta > 0 ? Math.min(1.25, real / meta) / 1.25 : 0
          // Sin meta firmada: ni raya ni «de 0 bbl/d» ni marca de fuera de meta.
          const sinMeta = f.sinMeta
          return (
            <Tip key={c.id} as="button" onClick={() => abrir(c.id)}
              titulo={c.nombre} pista={c.nota}
              filas={[['Producción del último día', e ? `${e.ayer.bbl === null ? 'sin fiscal' : `${n0(e.ayer.bbl)} bbl`} · ${fechaCorta(e.ayer.fecha)}` : '—'],
                ['Potencial ahora', e ? `${n0(e.potencialBpd)} bbl/d` : '—'],
                ['Perdiéndose ahora', e ? `${n0(e.perdiendoBpd)} bbl/d` : '—'],
                ['Pozos parados', e ? `${e.parados} de ${e.pozos}` : '—'],
                ['Producción del período', `${n0(real)} bbl/d`], ['Meta de producción', sinMeta ? SIN_META : `${n0(meta)} bbl/d`],
                ['Máximo de diferido', sinMeta ? SIN_META : `${n0(f.metaDiferido / dias)} bbl/d`], ['Del potencial', `${n1(f.pe)} %`],
                ['Diferidos', `${n0(f.brecha)} bbl`], ['Alto impacto', `${n0(f.altoImpacto)} bbl`],
                ['Sin identificar', `${n0(f.pendiente)} bbl`]]}
              className={cn('flex w-full cursor-pointer items-center gap-3 border-b border-[var(--linea2)] py-2.5 text-left last:border-0 hover:bg-[var(--panel2)]',
                c.id === campoId && 'bg-[var(--panel2)]')}>
              <MarcaPrioridad s={e?.severidad ?? 0} tamano={13} />
              <span className="min-w-0 flex-[2]">
                <b className="block truncate text-[15px] leading-tight">
                  {c.nombre}{i === 0 && <> <Chip tono="fuerte">más diferido</Chip></>}
                </b>
                <small className="block text-[13px] text-[var(--tinta3)]">
                  {c.cuenca}{e ? ` · ${e.ayer.bbl === null ? 'sin fiscal' : `${n0(e.ayer.bbl)} bbl`} el último día · ${e.parados} de ${e.pozos} pozos parados` : ''}
                </small>
              </span>
              {/* En el teléfono se esconde la barra, no la cifra contra la meta. */}
              <span className="min-w-[96px] flex-1">
                <span className="relative hidden h-2 overflow-hidden rounded-sm border border-[var(--linea2)] bg-[var(--panel2)] sm:block">
                  {!sinMeta && <i className="block h-full bg-[var(--dato-2)]" style={{ width: `${ancho * 100}%` }} />}
                  {!sinMeta && <i className="absolute -inset-y-[2px] left-[80%] w-[2px] bg-[var(--tinta)]" />}
                </span>
                <small className="tabular mt-0.5 block text-[12px] text-[var(--tinta3)]">
                  {sinMeta ? <>{n0(real)} bbl/d · {SIN_META}</> : <><FueraDeMeta si={real < meta} tamano={11} />{n0(real)} de {n0(meta)} bbl/d</>}
                </small>
              </span>
              <span className="tabular w-[84px] shrink-0 text-right">
                <b className="block text-[16px] leading-tight">{n0(f.brecha)}</b>
                <small className="text-[12px] text-[var(--tinta3)]">bbl · {n0(lb.brecha ? (f.brecha / lb.brecha) * 100 : 0)} %</small>
              </span>
              <span className="tabular hidden w-[70px] shrink-0 text-right md:block">
                <b className="block text-[15px] leading-tight">{n0(f.diferido ? (f.altoImpacto / f.diferido) * 100 : 0)} %</b>
                <small className="text-[12px] text-[var(--tinta3)]">alto impacto</small>
              </span>
            </Tip>
          )
        })}
      </Panel>

      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        <Palancas lb={lb} base={base} />
        <ParetoTipos lb={lb} />
      </div>

      <div className="grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
        <ParetoEquipos lb={lb} global max={8} onAbrir={(c, eq) => { setCampo(c); abrirEquipo(eq) }} onVerTodo={irA('diferidos')} />
        <ParetoPartes lb={lb} onIr={irA('bombas')} />
      </div>
    </>
  )
}
