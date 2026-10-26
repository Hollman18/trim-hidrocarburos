import { ChevronRight } from 'lucide-react'
import { useNivel } from '@/app/store'
import { useListaEquipos, NOMBRE_TREN, type VistaNivel3, type TendenciaNivel3 } from '@/shared/api/equiposTecnico'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { TendenciaFija } from '@/shared/ui/Sparkline'
import { fechaCorta } from '@/entities/reloj'
import { n0, n1 } from '@/shared/lib/formato'
import { TarjetaN3, Marca, Tag, IrA } from './piezas'
import { useIrA } from './navegar'

/** «Mientras esté parada» (la imagen 4; X4 §3.7, «Bombas · detalle»): lo que entra,
 *  lo que caben las que siguen, el tanque y si su nivel sube; y si para otra bomba
 *  ahora, en qué orden cerrar (primero los más acuatosos) y lo que se deja de
 *  producir, cerrando así y parejo. Lo calcula el motor (`tuberiaAgua`). */
export function MientrasParada({ v }: { v: VistaNivel3 }) {
  const m = v.mientras
  if (!m) return null
  const dato = (rotulo: string, valor: string, pie: string) => (
    <div className="min-w-0 text-[14px] text-[var(--tinta2)]">{rotulo}<b className="tabular block text-[19px] font-bold leading-tight text-[var(--tinta)]">{valor}</b>{pie}</div>
  )
  return (
    <TarjetaN3 titulo={m.titulo} data-mientras>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {dato('Entra', n0(m.entraBpd), 'bbl/d de agua')}
        {dato('Caben', n0(m.cabenBpd), m.enMarcha.join(' + '))}
        {m.tanquePct !== undefined && m.altoAltoPct !== undefined && dato('Tanque', `${n1(m.tanquePct)} %`, `alto-alto ${n0(m.altoAltoPct)} %`)}
      </div>
      <p className="mt-2.5 text-[15px] text-[var(--tinta2)]">{m.frase}</p>
      {m.pasos.length > 0 && (
        <p className="mt-2.5 border-t border-[var(--linea2)] pt-2.5 text-[15px] leading-normal text-[var(--tinta2)]" data-orden-si-para-otra>
          <b className="font-semibold text-[var(--tinta)]">Si para otra bomba ahora</b>, cierre primero los más acuatosos:{' '}
          {m.pasos.map((p, i) => <span key={p.pozo}>{i > 0 ? ' · ' : ''}<span className="tabular whitespace-nowrap">{p.pozo}{p.fraccion < 0.999 ? ` al ${n0(p.fraccion * 100)} %` : ''}</span></span>)}.
          {' '}Dejan de producirse <b className="tabular font-semibold text-[var(--tinta)]">{n0(m.crudoBpd)} bbl/d</b>{m.colchon ? ` después de ${m.colchon} de colchón` : ''} (parejo, {n0(m.parejoBpd)}).
        </p>
      )}
    </TarjetaN3>
  )
}

/** Una tendencia grande (X5 §5.4): el nombre con su unidad, el dibujo con la banda,
 *  la alarma en discontinuo y la escala fija, y la ventana escrita. Los rótulos van
 *  en HTML, a 12 px o más. Se rotula el cero y el límite firmado (no el extremo de
 *  la escala: el rango del instrumento todavía no lo trae el motor). */
function Grafica({ s, desde, hasta }: { s: TendenciaNivel3; desde: string; hasta: string }) {
  const ALTO = 64
  const y = (x: number) => ALTO - 3 - ((x - s.escala[0]) / (s.escala[1] - s.escala[0] || 1)) * (ALTO - 8)
  const limites: number[] = [...s.alarmas, ...[s.banda?.[0], s.banda?.[1]].filter((b): b is number => typeof b === 'number')]
  const tope = limites.length ? Math.max(...limites) : undefined
  return (
    <figure className="mt-2.5" data-tendencia={s.tag}>
      <figcaption className="text-[15px] font-semibold">{s.nombre} · {s.unidad}</figcaption>
      <div className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        <div className="tabular relative w-[44px] text-right text-[13px] text-[var(--tinta2)]" style={{ height: ALTO }} aria-hidden>
          {tope !== undefined && <span className="absolute right-0" style={{ top: Math.max(0, y(tope) - 9) }}>{n0(tope)}</span>}
          <span className="absolute bottom-0 right-0 leading-none">{n0(s.escala[0])}</span>
        </div>
        <TendenciaFija serie={s.serie} escala={s.escala} banda={s.banda} alarmas={s.alarmas} alto={ALTO} />
        <span />
        <div className="mt-0.5 flex justify-between text-[13px] text-[var(--tinta2)]">
          <span>{fechaCorta(new Date(desde))}</span>
          <span className="font-semibold">hoy, {fechaCorta(new Date(hasta))}</span>
        </div>
      </div>
    </figure>
  )
}

/** «Los 12 días antes de parar» (o «los últimos 12 días»): las señales que se
 *  movieron, en gráficas chicas iguales, como mucho tres (X2 §5.3). */
export function DiasAntes({ v }: { v: VistaNivel3 }) {
  // El modo de falla es de ingeniería (como en la ficha de antes): a operación, la regla y la tendencia.
  const ing = useNivel() === 'ingenieria'
  const t = v.tendencias
  if (!t) return null
  return (
    <TarjetaN3 titulo={t.titulo} data-dias-antes>
      {t.series.map(s => <Grafica key={s.tag} s={s} desde={t.desde} hasta={t.hasta} />)}
      <p className="mt-2.5 text-[15px] leading-snug text-[var(--tinta2)]">
        {t.modoFalla && ing ? `Modo de falla registrado: ${t.modoFalla.charAt(0).toLowerCase()}${t.modoFalla.slice(1)}. ` : ''}
        Una señal apunta, no prueba: la causa la confirma quien abre {v.tipo === 'bomba' ? 'la bomba' : 'el equipo'}.
      </p>
    </TarjetaN3>
  )
}

/** «Su historia» (la imagen 4): cuántas fallas, cada cuánto, cuánto tiempo fuera y
 *  lo que le ha costado cada una; las dos últimas; y los repuestos que faltan. Al
 *  pie, el diagnóstico (nivel 4). */
export function SuHistoria({ v, onDiagnostico }: { v: VistaNivel3; onDiagnostico?: () => void }) {
  const h = v.historia
  if (!h && !v.repuestos.length && !onDiagnostico) return null
  const unoCada = h?.cadaDias !== undefined ? `, ${h.que === 'fallas' ? 'una' : 'uno'} cada ${n0(h.cadaDias)} d` : ''
  return (
    <TarjetaN3 titulo="Su historia" extra={h ? `${n0(h.meses)} meses` : undefined} data-su-historia>
      {h && (
        <>
          <p className="mt-1.5 text-[15px] leading-snug text-[var(--tinta2)]">
            <b className="font-semibold text-[var(--tinta)]">{h.fallas === 1 ? `1 ${h.que === 'fallas' ? 'falla' : 'evento con pozos cerrados'}` : `${h.fallas} ${h.que === 'fallas' ? 'fallas' : 'eventos con pozos cerrados'}`}</b>
            {unoCada}{h.fueraH !== undefined ? `, ${n1(h.fueraH)} h fuera cada vez` : ''}.
            {h.bblPorFalla !== undefined && <> Le ha costado <b className="tabular font-semibold text-[var(--tinta)]">{n0(h.bblPorFalla)} bbl</b> por falla.</>}
            {h.porParte.length > 0 && <> {h.porParte.map((p, i) => `${i ? p.parte.toLowerCase() : p.parte} ${p.fallas}`).join(' · ')}.</>}
          </p>
          {h.ultimas.length > 0 && (
            <div className="mt-1.5">
              {h.ultimas.map(u => (
                <div key={`${u.dia}${u.que}`} className="grid grid-cols-[minmax(0,104px)_minmax(0,1fr)_auto] gap-2 border-t border-[var(--linea2)] py-1.5 text-[14px] text-[var(--tinta2)]" data-ultima>
                  <span>{u.dia}</span><span className="min-w-0">{u.que}</span><b className="tabular font-semibold text-[var(--tinta)]">{n0(u.bbl)} bbl</b>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {v.repuestos.length > 0 && (
        <ul className="mt-2 grid gap-1 text-[14px] leading-snug text-[var(--tinta2)]" data-repuestos>
          {v.repuestos.map(r => (
            <li key={r.descripcion} className="flex items-start gap-1.5">
              {r.aviso && <MarcaCondicion c="aviso" tamano={14} className="mt-0.5" decorativa />}
              <span>
                {r.aviso && 'Aviso · '}<b className="font-semibold text-[var(--tinta)]">{r.descripcion}</b> {r.stock} en bodega
                {r.llega ? ` · ${r.llega}` : ` · pedirlo: ${n0(r.plazoDias)} días`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {onDiagnostico && (
        <IrA className="mt-2" onClick={onDiagnostico} data-ver-diagnostico>Ver el diagnóstico: salud por parte e historia del PLC</IrA>
      )}
    </TarjetaN3>
  )
}

/** «En su tren»: los equipos del mismo tren del campo, para pasar de uno a otro
 *  (X4 §5.3, «de lado, sin subir»). Para lo que no es el tren de agua: ese tiene su esquema. */
export function EnSuTren({ v }: { v: VistaNivel3 }) {
  const lista = useListaEquipos([v.campoId])
  const irA = useIrA()
  if (v.esquemaAgua || v.tren === 'pozos') return null
  const filas = lista.filas.filter(f => f.tren === v.tren)
  if (filas.length < 2) return null
  return (
    <TarjetaN3 titulo={`En su tren: ${NOMBRE_TREN[v.tren].toLowerCase()}`} data-en-su-tren>
      <div className="mt-1.5">
        {filas.map(f => (
          <button key={f.equipo} type="button" disabled={f.equipo === v.equipo} onClick={() => irA({ equipo: f.equipo })}
            className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 border-t border-[var(--linea2)] py-2 text-left first:border-t-0 hover:bg-[var(--panel2)]/60 disabled:cursor-default disabled:hover:bg-transparent">
            <span className="w-4 shrink-0">{f.condicion ? <Marca c={f.condicion} tamano={15} decorativa /> : !f.vigila ? <MarcaCondicion c="sin-instrumento" tamano={14} decorativa /> : null}</span>
            <span className="min-w-0 flex-1 text-[15px] leading-snug">
              <Tag>{f.equipo}</Tag> <span className="text-[var(--tinta2)]">· {f.familia} · {f.palabra}</span>
            </span>
            {f.equipo === v.equipo ? <span className="text-[13px] text-[var(--tinta2)]">este</span> : <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--tinta3)]" />}
          </button>
        ))}
      </div>
    </TarjetaN3>
  )
}
