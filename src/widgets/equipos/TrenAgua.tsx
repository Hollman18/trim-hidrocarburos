import type { EsquemaAgua, VistaNivel3 } from '@/shared/api/equiposTecnico'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { Bomba, Esquema, Tanque, type EstadoKit, type CondicionKit } from '@/shared/ui/scada'
import { MARCA } from './filtros'
import { n0, n1 } from '@/shared/lib/formato'
import { TarjetaN3, Marca } from './piezas'

const lista = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
const valor = (i: EsquemaAgua['instrumentos'][number]) =>
  i.valor === null ? '---' : i.valor.toLocaleString('es-CO', { minimumFractionDigits: i.decimales, maximumFractionDigits: i.decimales })

/** El estado de una bomba en el kit: la que se mira con su condición (anormal), parada, sin
 *  instrumento (sin dato: no se sabe si corre) o en marcha. */
const estadoBomba = (b: EsquemaAgua['bombas'][number], condicion: VistaNivel3['condicion']): { estado: EstadoKit; condicion?: CondicionKit; corre?: boolean } =>
  condicion && condicion !== 'sin-comunicacion' ? { estado: 'anormal', condicion, corre: b.marcha !== 'parada' }
    : condicion === 'sin-comunicacion' ? { estado: 'sin-comunicacion' }
      : b.marcha === 'parada' ? { estado: 'parado' } : !b.instrumentada ? { estado: 'sin-dato' } : { estado: 'normal' }

/** El esquema del tren de agua de la bomba (nivel 3: «aquí sí puede parecerse a un
 *  P&ID», X2 §3.1; la imagen 4, `trenAgua` de `indicadores.js`): el tanque con su
 *  nivel y la raya del alto-alto, las bombas en paralelo por su brillo (en marcha,
 *  clara; parada, oscura con contorno de 2 px; sin instrumento, sin relleno y
 *  discontinua, X5 §6.5), las burbujas de los instrumentos de la que se mira y la
 *  dirección del agua con flechas fijas (nada se mueve, X2 §5.5). Letra de 14 en el
 *  dibujo: se pinta solo donde cabe a 12 px o más; más angosto, en renglones. Del kit SCADA, la bomba y el
 *  tanque (sin texto propio); las burbujas, a 14 px, para que encogidas no bajen de 12. */
function Dibujo({ e, v }: { e: EsquemaAgua; v: VistaNivel3 }) {
  const n = e.bombas.length
  const paso = n <= 3 ? 84 : 52
  const y0 = 52
  const ys = e.bombas.map((_, i) => y0 + i * paso)
  const yUlt = ys.at(-1)!, yMid = (y0 + yUlt) / 2
  const iSel = e.bombas.findIndex(b => b.esta)
  const ySel = ys[iSel] ?? yMid
  // Debajo de todas: el valor del medidor va bajo su burbuja (kit SCADA) y no pisa el rótulo de la bomba de abajo.
  const yBur = yUlt + 46
  const alto = Math.max(yBur + 34, yUlt + 30) + 48
  const tanqueH = 112, tanqueY = Math.max(36, yMid - tanqueH * 0.79)
  const nivel = e.tanque?.nivelPct ?? null
  const L = { stroke: 'var(--agua)', strokeWidth: 4, fill: 'none', strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  const parada = e.bombas[iSel]?.marcha === 'parada'
  // Las burbujas como la imagen: la succión y la descarga sobre la línea de la bomba; el caudal, en la salida.
  const xs = { succion: 124, descarga: 210, caudal: 306 }
  const aria = `${e.tanque ? `El tanque de agua${nivel !== null ? ` al ${n1(nivel)} por ciento` : ''} alimenta ` : ''}${n === 1 ? 'una bomba' : `${n} bombas en paralelo`}: ${e.bombas.map(b => `${b.id} ${b.marcha === 'parada' ? 'parada' : !b.instrumentada ? 'sin instrumento' : 'en marcha'}`).join(', ')}.${e.instrumentos.length ? ` ${e.instrumentos.map(i => `${i.letras} ${valor(i)}`).join(', ')}.` : ''}`
  return (
    // El <svg> es el esquema del kit (K3): su nombre accesible y `data-kit`.
    <Esquema ancho={360} alto={alto} etiqueta={aria} className="mt-2.5 overflow-hidden" data-esquema-agua="">
      <defs>
        <marker id="flecha-agua" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill="var(--agua)" />
        </marker>
      </defs>
      {e.tanque && (
        <g data-tanque>
          <text x={6} y={tanqueY - 14} fontSize={14} fontWeight={600} fill="var(--tinta)">Tanque</text>
          {/* El tanque del kit SCADA (§3): el nivel en gris y la raya del alto-alto en el costado. */}
          <Tanque x={6} y={tanqueY} ancho={44} alto={tanqueH} nivel={nivel} estado={nivel === null ? 'sin-dato' : 'normal'} />
          <line x1={0} x2={58} y1={tanqueY + tanqueH * (1 - e.tanque.altoAltoPct / 100)} y2={tanqueY + tanqueH * (1 - e.tanque.altoAltoPct / 100)} stroke="var(--tinta2)" strokeWidth={2} data-alto-alto />
          <text x={6} y={tanqueY + tanqueH + 22} fontSize={14} fontWeight={700} fill="var(--tinta)" className="tabular">{nivel !== null ? `${n1(nivel)} %` : 'sin dato'}</text>
          {/* A 22 del nivel: Firefox mide la caja del texto con todo el alto de la letra y a 18 el alto-alto pisaba el nivel (B4). */}
          <text x={6} y={tanqueY + tanqueH + 44} fontSize={14} fill="var(--tinta2)">alto-alto {n0(e.tanque.altoAltoPct)} %</text>
          <path d={`M56 ${yMid} L100 ${yMid}`} {...L} />
        </g>
      )}
      {/* Los cabezales: de succión (izquierda) y de descarga (derecha), y la salida a los inyectores. */}
      <path d={`M100 ${y0} L100 ${yUlt}`} {...L} />
      <path d={`M250 ${y0} L250 ${yUlt} M250 ${yMid} L352 ${yMid}`} {...L} />
      <line x1={344} y1={yMid} x2={356} y2={yMid} stroke="var(--agua)" strokeWidth={4} markerEnd="url(#flecha-agua)" />
      <text x={354} y={yMid - 12} fontSize={14} textAnchor="end" fill="var(--tinta2)">a los inyectores</text>
      {e.bombas.map((b, i) => {
        const y = ys[i]!
        const sinInst = !b.instrumentada
        const esParada = b.marcha === 'parada'
        return (
          <g key={b.id} data-bomba-esquema={b.id} data-marcha={b.marcha}>
            <path d={`M100 ${y} L134 ${y}`} {...L} />
            <path d={`M166 ${y} L250 ${y}`} {...L} {...(esParada ? { strokeDasharray: '6 5' } : {})} />
            {/* La bomba del kit SCADA (§3): por brillo si corre; la que se mira, con su marca y su anillo. */}
            {/* Sin el anillo de color del kit: la marca va aparte, con su forma (el color nunca solo, ISA-101). */}
            <Bomba x={150} y={y} {...(({ condicion: _c, ...k }) => k)(estadoBomba(b, b.esta ? v.condicion : undefined))} />
            {b.esta && v.condicion && <g transform={`translate(116,${y - 28})`}><MarcaCondicion c={MARCA[v.condicion]} tamano={16} decorativa /></g>}
            <text x={176} y={y - 10} fontSize={15} fontWeight={700} className="font-cond" fill="var(--tinta)">{b.id}</text>
            {sinInst && <g transform={`translate(${176 + b.id.length * 8 + 6},${y - 22})`}><MarcaCondicion c="sin-instrumento" tamano={14} decorativa /></g>}
          </g>
        )
      })}
      {e.instrumentos.map(ins => {
        const x = xs[ins.donde]
        const desde = ins.donde === 'caudal' ? yMid : ySel
        return (
          <g key={ins.tag} data-burbuja={ins.letras}>
            <line x1={x} y1={desde} x2={x} y2={yBur - 20} stroke="var(--tinta2)" strokeWidth={1} strokeDasharray="2 2" />
            {/* La burbuja de ISA-5.1, como el medidor del kit (letras arriba, valor abajo), a 14 px. */}
            <circle cx={x} cy={yBur} r={21} fill="var(--panel)" stroke="var(--tinta2)" strokeWidth={1.5} data-kit="medidor" data-estado={ins.valor === null ? 'sin-dato' : parada ? 'parado' : 'normal'} />
            <line x1={x - 21} x2={x + 21} y1={yBur} y2={yBur} stroke="var(--tinta3)" strokeWidth={1} />
            <text x={x} y={yBur - 5} fontSize={14} fontWeight={700} textAnchor="middle" fill="var(--tinta2)">{ins.letras}</text>
            <text x={x} y={yBur + 14} fontSize={14} textAnchor="middle" fill={parada || ins.valor === null ? 'var(--tinta2)' : 'var(--tinta)'} className="tabular">{ins.valor === null ? '—' : valor(ins)}</text>
          </g>
        )
      })}
      {e.entraBpd !== undefined && (
        <>
          <text x={354} y={alto - 26} fontSize={14} textAnchor="end" fill="var(--tinta2)"><tspan fontWeight={700} fill="var(--tinta)">{n0(e.entraBpd)}</tspan> bbl/d entran:</text>
          <text x={354} y={alto - 8} fontSize={14} textAnchor="end" fill="var(--tinta2)">{e.toman.length ? `${e.toman.length === 1 ? 'la toma' : 'las toman'} ${lista(e.toman)}` : 'ninguna bomba las toma'}</text>
        </>
      )}
    </Esquema>
  )
}

/** El mismo tren en renglones, para donde el dibujo no cabe con letra de 12 px. */
function Renglones({ e, v }: { e: EsquemaAgua; v: VistaNivel3 }) {
  return (
    <ul className="mt-2 grid gap-1.5 text-[15px]" data-tren-renglones>
      {e.tanque && <li><b className="font-semibold">Tanque</b> · {e.tanque.nivelPct !== null ? `${n1(e.tanque.nivelPct)} %` : 'sin dato'} · alto-alto {n0(e.tanque.altoAltoPct)} %</li>}
      {e.bombas.map(b => (
        <li key={b.id} className="flex flex-wrap items-center gap-x-1.5">
          {b.esta && v.condicion ? <Marca c={v.condicion} tamano={15} decorativa /> : !b.instrumentada ? <MarcaCondicion c="sin-instrumento" tamano={14} decorativa /> : null}
          <b className="font-cond font-bold">{b.id}</b>
          <span className="text-[var(--tinta2)]">· {b.marcha === 'parada' ? 'parada' : !b.instrumentada ? 'sin instrumento' : 'en marcha'}</span>
          {b.esta && e.instrumentos.map(i => <span key={i.tag} className="tabular text-[var(--tinta2)]">· {i.letras} {valor(i)}</span>)}
        </li>
      ))}
      {e.entraBpd !== undefined && <li className="text-[var(--tinta2)]"><b className="tabular text-[var(--tinta)]">{n0(e.entraBpd)}</b> bbl/d entran{e.toman.length ? `: ${e.toman.length === 1 ? 'la toma' : 'las toman'} ${lista(e.toman)}` : ''}</li>}
    </ul>
  )
}

/** «En su tren de agua» (la imagen 4). */
export function EnSuTrenDeAgua({ v }: { v: VistaNivel3 }) {
  const e = v.esquemaAgua
  if (!e) return null
  const hayDiscontinuas = e.bombas.some(b => !b.instrumentada)
  return (
    <TarjetaN3 titulo="En su tren de agua" extra={hayDiscontinuas ? 'discontinuo: sin instrumento' : undefined} className="@container" data-tren-agua>
      <div className="hidden @min-[312px]:block"><Dibujo e={e} v={v} /></div>
      <div className="@min-[312px]:hidden"><Renglones e={e} v={v} /></div>
    </TarjetaN3>
  )
}
