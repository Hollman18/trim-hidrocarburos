import { useApp, useAmbito } from '@/app/store'
import { useConfiabilidad, type EquipoConfiable as Equipo } from '@/shared/api/equipos'
import { pedirCalendario, pedirInicioDeHistoria } from '@/shared/api/calendario'
import { NOMBRE_FAMILIA as FAMILIA, type Familia } from '@/entities/flota'
import { partesDe, NOMBRE_PARTE, type ParteId } from '@/entities/partes'
import { COMO, type ComoSeIdentifico } from '@/entities/causa-senal'
import { campoPorId } from '@/entities/campos'
import { Panel, Chip } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Lectura } from '@/shared/ui/Lectura'
import { n0, n1, plural } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { Aciertos } from '@/widgets/confiabilidad/Aciertos'
import { TresRelojes } from '@/widgets/sap/TresRelojes'
import { useRelojes } from '@/shared/api/sap'
import { AHORA } from '@/entities/reloj'
import { desplazable } from '@/shared/ui/alFinal'

/** Confiabilidad de los equipos de alto impacto con la historia que dejó el
 *  PLC: cada cuánto fallan, cuánto tardan, de qué parte, y qué tan bien está
 *  registrada cada falla. Nada sale de un formulario. */
export function Confiabilidad() {
  const ambito = useAmbito()
  const abrirEquipo = useApp(s => s.abrirEquipo), setCampo = useApp(s => s.setCampo)
  const clave = ambito.campos.map(c => c.id).join(',')

  const equipos = useConfiabilidad(clave.split(',').filter(Boolean))

  // Su foco es la reparación activa, no la espera del repuesto: los tres relojes,
  // en toda la historia (como el tiempo entre fallas de esta pantalla).
  const reloj = useRelojes(clave.split(',').filter(Boolean), pedirInicioDeHistoria(), AHORA)

  if (!equipos.length) return <Panel titulo="CONFIABILIDAD"><p className="text-[12px] text-[var(--tinta2)]">{ambito.titulo} no tiene equipos de alto impacto.</p></Panel>

  const dias = equipos[0]!.h.dias
  const flota = (f: Familia) => {
    const es = equipos.filter(e => e.familia === f)
    const fallas = es.reduce((a, e) => a + e.h.fallas, 0)
    const ev = es.flatMap(e => e.h.eventos.filter(x => !x.disparo && x.fin))
    return { n: es.length, fallas, disparos: es.reduce((a, e) => a + e.h.disparos, 0),
      mtbf: fallas ? (dias * es.length) / fallas : undefined,
      mdt: ev.length ? ev.reduce((a, x) => a + x.horas, 0) / ev.length : undefined,
      bbl: es.reduce((a, e) => a + e.h.bbl, 0) }
  }
  const familias = (['inyeccion', 'electrosumergible', 'multifasica'] as Familia[]).filter(f => equipos.some(e => e.familia === f))
  const malos = equipos.filter(e => e.h.fallas > 0).sort((a, b) => b.h.bbl - a.h.bbl || b.h.fallas - a.h.fallas).slice(0, 12)

  // Calidad del registro: cómo se identificó la parte de cada falla.
  const fallas = equipos.flatMap(e => e.h.eventos.filter(x => !x.disparo))
  const porComo = (['senal', 'firma', 'declarado', 'ninguno'] as ComoSeIdentifico[]).map(c => [c, fallas.filter(x => x.como === c).length] as const)

  // Fallas por mes, por familia.
  const meses = pedirCalendario().map(m => ({ m, porFam: Object.fromEntries(familias.map(f => [f,
    equipos.filter(e => e.familia === f).reduce((a, e) => a + e.h.eventos.filter(x => !x.disparo && x.inicio.getTime() >= m.desde && x.inicio.getTime() < m.hasta).length, 0)])) as Record<Familia, number> }))
  const topeMes = Math.max(1, ...meses.map(x => familias.reduce((a, f) => a + (x.porFam[f] ?? 0), 0)))
  // Se abre la ficha del equipo escogido, también si es una electrosumergible:
  // llevar a la pantalla de la flota la dejaba en la lista, sin el pozo.
  const abrir = (e: Equipo) => { setCampo(e.campoId); abrirEquipo(e.equipo, false) }

  return (
    <>
      <div className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        {familias.map(f => {
          const x = flota(f)
          return (
            <Tip key={f} titulo={FAMILIA[f]} pista="MTBF de la flota: días de historia por equipo ÷ fallas, sin contar disparos ni paradas que causó otro equipo."
              filas={[['Equipos', String(x.n)], ['Fallas', String(x.fallas)], ['Disparos', String(x.disparos)],
                ['Tiempo fuera promedio', x.mdt ? fmtHoras(x.mdt, true) : '—'], ['Barriles', `${n0(x.bbl)} bbl`]]}>
              <small className="block text-[10.5px] text-[var(--tinta3)]">{FAMILIA[f]} · {x.n}</small>
              <b className="tabular block text-[26px] leading-none">{x.mtbf ? `${n0(x.mtbf)} d` : '—'}</b>
              <small className="block text-[10.5px] text-[var(--tinta2)]">entre fallas · {plural(x.fallas, 'falla', 'fallas')}{x.mdt ? ` · ${fmtHoras(x.mdt, true)} fuera` : ''}</small>
              {/* Disparos y barriles también a la vista: en el recuadro flotante solo
                  los alcanzaba quien usa ratón. */}
              <small className="block text-[10.5px] text-[var(--tinta3)]">{plural(x.disparos, 'disparo', 'disparos')} · {n0(x.bbl)} bbl en la historia</small>
            </Tip>
          )
        })}
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">Historia</small>
          <b className="tabular block text-[26px] leading-none">{n0(dias / 30.4)} meses</b>
          <small className="block text-[10.5px] text-[var(--tinta2)]">del registro de eventos del PLC</small>
        </span>
      </div>

      <Lectura>
        Una falla es una parada propia del equipo: la que causó otro equipo (se cayó la energía, paró
        la bomba de la línea) o la que estaba en el programa no cuenta. En la electrosumergible, un
        disparo que vuelve a arrancar en menos de un día tampoco: la falla es la que obliga a sacarla
        del pozo. Con menos de dos fallas no se calcula el tiempo entre fallas.
      </Lectura>

      <Aciertos onAbrir={(c, eq) => {
        const e = equipos.find(x => x.campoId === c && x.equipo === eq)
        if (e) abrir(e)
      }} />

      <Panel className="mt-2.5" titulo="REPARACIÓN ACTIVA Y ESPERA" extra={reloj ? `promedio de ${plural(reloj.fallas, 'falla cerrada', 'fallas cerradas')} · toda la historia` : 'toda la historia'}>
        {reloj ? <TresRelojes reloj={reloj} /> : <p className="text-[12px] text-[var(--tinta2)]">No hay fallas cerradas con orden en SAP en estos campos.</p>}
      </Panel>

      <div className="mt-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        <Panel titulo="LOS QUE MÁS CUESTAN" extra="por barriles en la historia · clic para abrir">
          <div className="overflow-x-auto">
            <table className="tabular w-full text-left text-[11.5px]">
              <thead className="text-[9.5px] text-[var(--tinta3)]">
                <tr><th className="py-1 font-normal">Equipo</th><th className="text-right font-normal">Fallas</th><th className="hidden text-right font-normal sm:table-cell">Entre fallas</th>
                  <th className="hidden text-right font-normal sm:table-cell">Fuera</th><th className="pl-3 font-normal">Parte</th><th className="text-right font-normal">bbl</th></tr>
              </thead>
              <tbody>
                {malos.map(e => (
                  <tr key={`${e.campoId}${e.equipo}`} onClick={() => abrir(e)} className="cursor-pointer border-t border-[var(--linea2)] hover:bg-[var(--panel2)]">
                    {/* El botón da el foco y el Enter al teclado; su clic sube a la fila,
                        que es la que abre (así el ratón abre desde cualquier celda). */}
                    <td className="py-1.5"><button type="button" aria-label={`Abrir ${e.equipo}`} className="cursor-pointer rounded-sm font-mono font-bold">{e.equipo}</button><small className="block text-[10px] text-[var(--tinta3)]">{FAMILIA[e.familia].toLowerCase()}{ambito.global ? ` · ${campoPorId(e.campoId).nombre}` : ''}</small></td>
                    <td className="text-right">{e.h.fallas}{e.h.disparos ? <small className="text-[var(--tinta3)]"> +{e.h.disparos}</small> : ''}</td>
                    <td className="hidden text-right sm:table-cell">{e.h.mtbfDias ? `${n0(e.h.mtbfDias)} d` : '—'}</td>
                    <td className="hidden text-right sm:table-cell">{e.h.mdtH ? fmtHoras(e.h.mdtH, true) : '—'}</td>
                    <td className="pl-3">{e.h.porParte[0] ? NOMBRE_PARTE[e.h.porParte[0].parte].split(' ')[0] : '—'}</td>
                    <td className="text-right"><b>{n0(e.h.bbl)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel titulo="DE QUÉ FALLAN" extra="contra la referencia publicada">
          {familias.map(f => {
            const es = equipos.filter(e => e.familia === f)
            const cuenta = new Map<ParteId, number>()
            for (const e of es) for (const x of e.h.eventos) if (!x.disparo && x.parte) cuenta.set(x.parte, (cuenta.get(x.parte) ?? 0) + 1)
            const total = [...cuenta.values()].reduce((a, b) => a + b, 0)
            const partes = partesDe(f === 'electrosumergible' ? 'electrosumergible' : f)
            return (
              <div key={f} className="mb-3 last:mb-0">
                <h4 className="font-cond mb-1 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">{FAMILIA[f].toUpperCase()} · {plural(total, 'FALLA', 'FALLAS')} CON PARTE</h4>
                {partes.filter(p => cuenta.get(p.id)).sort((a, b) => (cuenta.get(b.id) ?? 0) - (cuenta.get(a.id) ?? 0)).map(p => (
                  <Tip key={p.id} titulo={p.nombre} pista={`Referencia: ${p.peso.texto}. ${p.peso.fuente}.`}
                    filas={[['Fallas aquí', String(cuenta.get(p.id))], ['De las fallas con parte', `${n1(((cuenta.get(p.id) ?? 0) / total) * 100)} %`]]}
                    className="mb-1.5 block">
                    <div className="flex justify-between text-[11.5px]"><span>{p.nombre}</span><span className="tabular">{cuenta.get(p.id)} · {n0(((cuenta.get(p.id) ?? 0) / total) * 100)} %</span></div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-sm bg-[var(--panel2)]"><i className="block h-full bg-[var(--dato-1)]" style={{ width: `${((cuenta.get(p.id) ?? 0) / total) * 100}%` }} /></div>
                    <small className="block text-[10px] text-[var(--tinta3)]">Referencia: {p.peso.texto}</small>
                  </Tip>
                ))}
                {total === 0 && <p className="text-[11.5px] text-[var(--tinta2)]">Ninguna falla con la parte identificada.</p>}
              </div>
            )
          })}
        </Panel>
      </div>

      <div className="mt-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        <Panel titulo="FALLAS POR MES" extra="sin disparos">
          <div {...desplazable('Fallas por mes')} className="overflow-x-auto">
            <svg viewBox="0 0 520 150" className="block h-auto w-full min-w-[420px]" role="img" aria-label="Fallas de equipos de alto impacto por mes">
              {meses.map((x, i) => {
                const w = 500 / meses.length, xx = 14 + i * w
                let y = 120
                return (
                  <g key={x.m.mes}>
                    {familias.map((f, j) => {
                      const v = x.porFam[f] ?? 0
                      const hgt = (v / topeMes) * 100
                      y -= hgt
                      return v > 0 ? <rect key={f} x={xx + w * 0.2} y={y} width={w * 0.6} height={hgt} fill={`var(--dato-${j + 1})`}><title>{`${x.m.mes} · ${FAMILIA[f]}: ${v}`}</title></rect> : null
                    })}
                    <text x={xx + w / 2} y={136} fontSize={9} textAnchor="middle" fill="var(--tinta3)" className="font-cond">{x.m.mes.slice(5)}</text>
                  </g>
                )
              })}
              <line x1={10} x2={514} y1={120} y2={120} stroke="var(--linea)" />
            </svg>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-[10.5px] text-[var(--tinta2)]">
            {familias.map((f, j) => <span key={f} className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5" style={{ background: `var(--dato-${j + 1})` }} />{FAMILIA[f].toLowerCase()}</span>)}
          </div>
        </Panel>

        <Panel titulo="CALIDAD DEL REGISTRO DE FALLAS" extra="ISO 14224 pide la parte de cada falla">
          <Lectura>
            Cómo se supo qué parte falló. Lo que dice una señal (primera alarma, código del variador) o
            la firma de las señales es evidencia; lo declarado depende de quien respondió; lo que no
            tiene parte no le enseña nada al vigía.
          </Lectura>
          {porComo.map(([c, n]) => (
            <div key={c} className="mb-1.5">
              <div className="flex justify-between text-[11.5px]"><span>{COMO[c]}</span><span className="tabular">{n} · {n0(fallas.length ? (n / fallas.length) * 100 : 0)} %</span></div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-sm bg-[var(--panel2)]">
                <i className="block h-full" style={{ width: `${fallas.length ? (n / fallas.length) * 100 : 0}%`, background: c === 'ninguno' ? 'repeating-linear-gradient(45deg, var(--tinta3), var(--tinta3) 2px, transparent 2px, transparent 4px)' : c === 'declarado' ? 'var(--dato-3)' : 'var(--dato-1)' }} />
              </div>
            </div>
          ))}
          <p className="mt-2 flex flex-wrap gap-1"><Chip>{plural(fallas.length, 'falla', 'fallas')}</Chip><Chip>{plural(equipos.length, 'equipo', 'equipos')}</Chip></p>
        </Panel>
      </div>
    </>
  )
}
