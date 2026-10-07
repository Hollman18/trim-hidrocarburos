import { useApp, useCampo, usePlanta, useRol, useRango } from '@/app/store'
import { useLibro, useSerie } from '@/shared/api/diferidos'
import { useEquiposDeHoy } from '@/shared/api/equipos'
import { pedirMedicionOficial } from '@/shared/api/medicion'
import { CATALOGO, CATEGORIA_DE } from '@/entities/causas'
import { Panel, Boton, Chip } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n1, num } from '@/shared/lib/formato'
import { descargarCsv } from '@/shared/lib/csv'
import { Download, Lock } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { FueraDeMeta } from '@/shared/ui/Prioridad'

/** Lo que el regulador necesita: si el libro del período se puede publicar
 *  (factor de asignación en banda, custodia, sin identificar bajo el
 *  criterio), los puntos de medición y su calibración, y el diferido en las
 *  casillas de PRODML. TRIM lee la medición; nunca escribe sobre ella. */
export function Regulatorio() {
  const campo = useCampo(); const cfg = usePlanta(); const rol = useRol(); const rango = useRango()
  const campoId = useApp(s => s.campoId), abrirEquipo = useApp(s => s.abrirEquipo)
  const lb = useLibro({ campos: [campoId], desde: rango.desde, hasta: rango.hasta })
  const serie = useSerie([campoId])
  const equipoDeHoy = useEquiposDeHoy([campoId])

  // Sin esquema registrado no hay puntos de medición que listar (hueco, nunca los de otro campo).
  const pmos = (cfg ? [...cfg.tronco, ...cfg.gas, ...cfg.crudo, ...cfg.agua] : [])
    .flatMap(e => [e, ...(e.miembros ?? [])])
    .filter(e => e.pmo)
    .map(e => ({ pmo: e.pmo!, etiqueta: e.etiqueta, eq: e.equipo ? equipoDeHoy(e.equipo, campoId) : undefined }))
  const conCalibracion = pmos.flatMap(p => (p.eq?.dispositivos ?? []).filter(d => d.calibracion).map(d => ({ ...p, d })))
  const porCategoria = CATALOGO.map(c => ({ c, bbl: lb.porTipo.filter(t => CATEGORIA_DE[t.tipo] === c.id).reduce((a, t) => a + t.bbl, 0) }))
  const sinCasilla = lb.porTipo.filter(t => !CATEGORIA_DE[t.tipo]).reduce((a, t) => a + t.bbl, 0)
  const medicion = pedirMedicionOficial(campoId), banda = medicion.banda

  const exportar = () => descargarCsv(`libro-${campoId}-mensual`, [
    ['campo', 'mes', 'publicado', 'real bbl', 'potencial bbl', 'diferido bbl', 'factor de asignación', 'banda ±', 'en banda',
      ...CATALOGO.map(c => `${c.nombre} (${c.prodml}) bbl`), 'sin clasificar bbl', 'tolerancia bbl', 'aproximado bbl'],
    ...serie.map(m => {
      const f = m.libro.fa[0]
      return [campo.nombre, m.mes, m.parcial ? 'no' : 'sí', m.libro.real, m.libro.potencial, m.libro.diferido, f?.fa, f?.banda, f?.dentro ? 'sí' : 'no',
        ...CATALOGO.map(c => m.libro.porTipo.filter(t => CATEGORIA_DE[t.tipo] === c.id).reduce((a, t) => a + t.bbl, 0)),
        m.libro.porTipo.filter(t => !CATEGORIA_DE[t.tipo]).reduce((a, t) => a + t.bbl, 0), m.libro.tolerancia, m.libro.aproximado]
    }),
  ])

  return (
    <>
      <Tip titulo="Libro del período" pista="TRIM lee los puntos de medición. Nunca escribe sobre ellos."
        filas={[['Publicable', lb.publicable ? 'sí' : 'no'], ['Puntos de medición', String(pmos.length)],
          ['Instrumentos con calibración', String(conCalibracion.length)], ['Banda de asignación', `±${n0(banda.valor * 100)} %`], ['Período', rango.nombre]]}
        className="mb-2.5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)]">
        <span className="min-w-0 max-w-[520px]">
          <b className="block text-[22px] leading-tight"><FueraDeMeta si={!lb.publicable} tamano={14} />{lb.publicable ? 'Se puede publicar' : 'No se puede publicar todavía'}</b>
          <small className="block text-[11px] text-[var(--tinta2)]">{lb.publicable ? `Factor en banda, custodia completa y lo sin identificar bajo el criterio · ${rango.nombre}` : lb.motivos.map(m => m.texto).join(' ')}</small>
        </span>
        <span className="ml-auto flex items-center gap-2">
          <Chip tono="fuerte"><Lock className="mr-1 inline size-3" />solo lectura</Chip>
          {rol.puede['evidencia:exportar'] && <Boton variante="principal" onClick={exportar}><Download className="mr-1 inline size-3.5" />Exportar CSV</Boton>}
        </span>
      </Tip>

      <div className="grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(310px,1fr))]">
        <Panel titulo="PUNTOS DE MEDICIÓN OFICIAL" extra={`${pmos.length} en ${campo.nombre}`}>
          <p className="mb-1.5 text-[11px] text-[var(--tinta2)]">{medicion.origen?.fuente ?? 'sin punto de medición'} · corte de agua: {medicion.origen?.bsw ?? 'sin dato'}</p>
          {pmos.map(p => (
            <Tip key={p.pmo} as={p.eq ? 'button' : 'div'} onClick={p.eq ? () => abrirEquipo(p.eq!.id, false) : undefined}
              titulo={`${p.pmo} · ${p.etiqueta}`} pista={p.eq ? 'Clic para ver sus instrumentos' : 'Sin instrumento declarado'}
              filas={[['Punto', p.pmo], ['Equipo', p.eq?.id ?? 'sin instrumentar'], ['Estado', p.eq?.estado ?? '—']]}
              className={cn('flex w-full items-center gap-2.5 border-b border-[var(--linea2)] py-2 text-left last:border-0', p.eq && 'cursor-pointer hover:bg-[var(--panel2)]')}>
              <Chip tono="fuerte">{p.pmo}</Chip>
              <span className="min-w-0 flex-1 truncate text-[12px]">{p.etiqueta}</span>
              <span className="font-mono text-[10.5px] text-[var(--tinta3)]">{p.eq?.id ?? 'sin instrumentar'}</span>
            </Tip>
          ))}
          <h4 className="font-cond mb-1 mt-3 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">CALIBRACIÓN DECLARADA</h4>
          {conCalibracion.length === 0 && <p className="text-[11.5px] text-[var(--tinta3)]">Ningún instrumento de custodia tiene calibración declarada en este campo.</p>}
          {conCalibracion.map(c => (
            <Tip key={c.d.tag} titulo={`${c.d.tag} · ${c.d.tipo}`} pista={c.d.calibracion}
              filas={[['Punto', c.pmo], ['Valor', `${num(c.d.valor)} ${c.d.unidad}`.trim()], ['Calibración', c.d.calibracion ?? '—']]}
              className="flex items-center gap-2.5 border-b border-[var(--linea2)] py-1.5 last:border-0">
              <span className="min-w-0 flex-1"><b className="font-mono block text-[11.5px]">{c.d.tag}</b><small className="block truncate text-[10.5px] text-[var(--tinta3)]">{c.d.calibracion}</small></span>
            </Tip>
          ))}
        </Panel>

        <Panel titulo="DIFERIDO EN LAS CASILLAS DE PRODML" extra="ReasonLost · Energistics">
          <Lectura>Cada barril del libro en la casilla del estándar. Lo declarado o sin identificar no tiene casilla hasta que alguien lo clasifique.</Lectura>
          {porCategoria.map(({ c, bbl }) => (
            <div key={c.id} className="flex items-baseline justify-between gap-2 border-b border-[var(--linea2)] py-1.5 text-[11.5px] last:border-0">
              <span className="min-w-0">{c.nombre}<small className="font-mono block text-[9.5px] text-[var(--tinta3)]">{c.prodml}</small></span>
              <b className="tabular shrink-0">{n0(bbl)}</b>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-2 py-1.5 text-[11.5px]">
            <span className="text-[var(--tinta2)]">Sin casilla todavía (declarado o sin identificar)</span>
            <b className="tabular">{n0(sinCasilla)}</b>
          </div>
        </Panel>

        <Panel titulo="PRODUCCIÓN DEL PERÍODO">
          <div className="text-[11.5px]">
            {([['Real (punto de medición oficial)', `${n0(lb.real)} bbl`], ['Potencial (pruebas × factor)', `${n0(lb.potencial)} bbl`],
              ['Diferidos', `${n0(lb.brecha)} bbl ±${n0(lb.tolerancia)}`], ['Eficiencia', `${n1(lb.pe)} %`],
              ['Pozos sin prueba', lb.custodia.sinPrueba.map(p => p.id).join(', ') || 'ninguno'],
              ['Pruebas estimadas', lb.custodia.estimados.map(p => p.id).join(', ') || 'ninguna']] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-[var(--linea2)] py-1.5 last:border-0">
                <span className="text-[var(--tinta3)]">{k}</span><b className="tabular text-right">{v}</b>
              </div>
            ))}
          </div>
          <small className="mt-1.5 block text-[10px] text-[var(--tinta3)]">Condiciones estándar: 14,65 psia y 60 °F. Banda: {banda.fuente}.</small>
        </Panel>
      </div>
    </>
  )
}
