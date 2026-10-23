import { useApp, useAmbito, useRango, useRol, useNivel } from '@/app/store'
import { ResumenDirectivo } from '@/widgets/resumen/ResumenDirectivo'
import { Portafolio } from './Portafolio'
import { useLibro, useSerie, useBase } from '@/shared/api/diferidos'
import { conMeta, textoSinMeta } from '@/entities/libro'
import { Encabezado } from '@/widgets/diferidos/Encabezado'
import { MesAMes } from '@/widgets/diferidos/MesAMes'
import { ParetoEquipos, Palancas } from '@/widgets/diferidos/Paretos'
import { Ahora } from '@/widgets/riesgo/Ahora'
import { Panel, Boton } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { n0, n1, diaIso as dia } from '@/shared/lib/formato'
import { FueraDeMeta } from '@/shared/ui/Prioridad'

/** Cifra secundaria: número grande, rótulo corto, el resto en el tooltip. */
const Cifra = ({ q, v, u, filas, pista, alerta, lectura }: {
  q: string; v: string; u?: string
  filas: Array<[string, string]>; pista?: string; alerta?: boolean; lectura?: string
}) => (
  <Tip titulo={q} filas={filas} pista={pista}
    className="rounded border border-[var(--linea)] bg-[var(--panel)] px-3 py-2.5 shadow-[var(--sombra)]">
    <b className="tabular block text-[22px] leading-none">
      <FueraDeMeta si={alerta} />{v}{u && <span className="ml-1 text-[11px] font-medium text-[var(--tinta3)]">{u}</span>}
    </b>
    <small className="mt-0.5 block text-[10.5px] text-[var(--tinta3)]">{q}</small>
    {lectura && <Lectura>{lectura}</Lectura>}
  </Tip>
)

export function Resumen() {
  const ambito = useAmbito(); const nivel = useNivel()
  // El directivo ve cinco respuestas; el detalle es de quien lo trabaja.
  if (nivel === 'decision') return <ResumenDirectivo />
  if (ambito.global) return <Portafolio />
  return <ResumenCampo />
}

function ResumenCampo() {
  const ambito = useAmbito(); const rango = useRango(); const rol = useRol()
  const campoId = useApp(s => s.campoId), abrirEquipo = useApp(s => s.abrirEquipo), setAlcance = useApp(s => s.setAlcance), setPantalla = useApp(s => s.setPantalla), setRango = useApp(s => s.setRango)
  const q = { campos: [campoId], desde: rango.desde, hasta: rango.hasta }
  const lb = useLibro(q)
  const serie = useSerie([campoId])
  const base = useBase(q)
  const irA = (p: string) => (rol.pantallas.includes(p) ? () => setPantalla(p) : undefined)

  const dias = Math.max(1 / 24, lb.meta.dias)
  // Sin meta firmada no hay cumplimiento: ni 0 % ni la marca de «fuera de meta».
  const hayMeta = conMeta(lb.meta)
  const cumple = hayMeta && lb.meta.produccion > 0 ? (lb.real / lb.meta.produccion) * 100 : undefined
  // Si solo contaran las fallas: lo programado se descuenta; lo sin
  // identificar se cuenta como falla hasta que alguien diga lo contrario.
  const peNoPlan = lb.potencial > 0 ? 100 - (lb.noPlaneado / lb.potencial) * 100 : 0
  const pendPct = lb.potencial > 0 ? (lb.pendiente / lb.potencial) * 100 : 0

  return (
    <>
      {/* Un número manda la pantalla: los barriles que se dejaron de producir. */}
      <Encabezado lb={lb} base={base} nombrePeriodo={rango.nombre} ambito={ambito.titulo} />

      <Ahora campos={[campoId]} global={false} onRiesgo={irA('riesgo') ?? irA('bombas')} onIdentificar={irA('causa')} />

      <div className="mb-2.5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <Cifra q="producción contra su meta" v={n0(lb.real / dias)} u={hayMeta ? `de ${n0(lb.meta.produccionDia)} bbl/d` : `bbl/d · ${textoSinMeta(lb.meta)}`} alerta={cumple !== undefined && cumple < 100}
          lectura="Lo que midió el punto de medición oficial por día, contra la meta que firmó el gerente. Con la marca cuando está por debajo."
          pista="La meta de producción es la firmada para el campo; la eficiencia (real sobre potencial) va aparte."
          filas={[['Real', `${n0(lb.real)} bbl`], ...(hayMeta ? [['Meta a la fecha', `${n0(lb.meta.produccion)} bbl`], ['Meta del período completo', `${n0(lb.meta.produccionTotal)} bbl`]] as Array<[string, string]> : [['Meta', textoSinMeta(lb.meta)] as [string, string]]),
            ['Cumplimiento', cumple === undefined ? '—' : `${n1(cumple)} %`], ['Eficiencia', `${n1(lb.pe)} %`]]} />
        <Cifra q="sin paradas programadas" v={n1(peNoPlan)} u="%"
          lectura="La eficiencia si solo contaran las fallas. Es la parte que mantenimiento puede mover."
          pista="Descuenta lo que estaba en el programa aprobado del libro; lo sin identificar cuenta como falla. Es la cuenta del libro, no la de lo no planeado del árbol de causas (que no cuenta lo sin identificar)."
          filas={[['Eficiencia sin programadas', `${n1(peNoPlan)} %`], ['Programado', `${n0(lb.planeado)} bbl`], ['No programado (libro)', `${n0(lb.noPlaneado)} bbl`]]} />
        <Cifra q="sin identificar" v={n0(lb.pendiente)} u="bbl" alerta={!lb.publicable && lb.pendiente > 0}
          lectura="Barriles de paradas que ninguna señal explica y nadie ha respondido."
          pista={lb.publicable ? 'El libro del período se puede publicar.' : lb.motivos.map(m => m.texto).join(' ')}
          filas={[['Sin identificar', `${n0(lb.pendiente)} bbl`], ['Del potencial', `${n1(pendPct)} %`], ['Publicable', lb.publicable ? 'sí' : 'no']]} />
        <Cifra q="evitable cerrando en orden" v={n0(lb.evitablePorOrden)} u="bbl"
          lectura="Lo que se habría perdido de menos al parar la reinyección cerrando primero los pozos con menos crudo por barril de agua."
          filas={[['Evitable', `${n0(lb.evitablePorOrden)} bbl`], ['Del diferido', `${n1(lb.diferido ? (lb.evitablePorOrden / lb.diferido) * 100 : 0)} %`]]} />
      </div>

      <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <Panel titulo="DIFERIDO MES A MES" extra="clic en un mes para verlo">
          <MesAMes serie={serie} desde={rango.desde} hasta={rango.hasta}
            onMes={m => setRango(dia(m.desde), dia(new Date(m.hasta.getTime() - 1)))} />
        </Panel>
        <Palancas lb={lb} base={base} />
      </div>

      <ParetoEquipos lb={lb} global={false} max={5} onAbrir={(_, eq) => abrirEquipo(eq)} onVerTodo={irA('diferidos')} />
      <Boton className="mt-2 w-full" onClick={() => setAlcance('portafolio')}>Ver todos los campos</Boton>
    </>
  )
}
