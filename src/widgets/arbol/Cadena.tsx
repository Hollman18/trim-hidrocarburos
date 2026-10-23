import { PASOS, esDePersona, type ParadaAnh, type PasoAnh } from '@/shared/api/arbol'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'
import { ROTULO, PASO_EN_LA_CIRCULAR, INFO_PASO_2, valorEnPalabras, enElReporte } from './palabras'
import { marcaDelPaso } from './marcas'

/** El hueco de lo que falta: gris, contorno discontinuo y la palabra (U1 §2.1).
 *  Nunca morado: no es un dato malo, es una respuesta que falta (S1 U1-3). */
export function Falta({ children = 'falta', className }: { children?: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-sm border border-dashed border-[var(--tinta3)] px-1.5 text-[10.5px] leading-[1.5] text-[var(--tinta2)]', className)}>{children}</span>
}

/** Los 6 pasos de una parada en el orden de la circular (U1 §2.1; U2 §4.1):
 *  el valor en palabras de campo y, al lado, de dónde salió. Lo que falta va
 *  como hueco gris discontinuo, con lo que TRIM sugiere si sugiere algo (una
 *  preselección, no un dato). `codigos`: el ⓘ de cada paso dice además lo que
 *  va en el reporte (solo ingeniería: el supervisor y el operador no ven códigos). */
export function Cadena({ p, pasos = PASOS, codigos = false, grupo = false }: {
  p: ParadaAnh; pasos?: readonly PasoAnh[]; codigos?: boolean
  /** La tarjeta es de varios pozos: la cascada de cada uno ya va arriba. */
  grupo?: boolean
}) {
  // Un mismo porqué no se repite paso a paso: la regla de la bomba de la línea
  // explica a la vez quién, la causa y el detalle. Se dice una vez y los demás
  // pasos remiten a ese.
  const marcas = pasos.map(paso => marcaDelPaso(p, paso, !grupo))
  return (
    <dl className="grid gap-y-1.5 text-[11.5px]">
      {pasos.map((paso, i) => {
        const n = PASOS.indexOf(paso) + 1
        const d = p.clasificacion[paso]
        const sugerido = p.propuesta.sugerido[paso]
        const valor = d ? valorEnPalabras(paso, String(d.valor)) : undefined
        const antes = marcas.findIndex(m => m === marcas[i])
        const marca = antes < i && marcas[i] && d && !esDePersona(d.procedencia)
          ? `${marcas[i]!.slice(0, marcas[i]!.indexOf(':') > 0 ? marcas[i]!.indexOf(':') : undefined)} por la misma razón del paso ${PASOS.indexOf(pasos[antes]!) + 1}`
          : marcas[i]
        // La bomba de la línea sin su parte: el detalle de la ANH sale igual, pero
        // falta lo que solo dice quien la abre, y se ve (B-11; U2 §9.3).
        const faltaParte = paso === 'n2' && p.propuesta.fila === 'linea-sin-n2' && !p.causa.parte && !!d && !esDePersona(d.procedencia)
        const info = `${PASO_EN_LA_CIRCULAR[paso]}.${codigos && d ? ` En el reporte: ${enElReporte(paso, String(d.valor))}.` : ''}`
        return (
          <div key={paso} data-paso={paso}
            className="grid gap-x-3 gap-y-0.5 border-b border-dashed border-[var(--linea2)] pb-1.5 last:border-0 last:pb-0 md:grid-cols-[minmax(9.5rem,auto)_minmax(0,1fr)_minmax(0,1.2fr)] md:items-baseline">
            <dt className="flex flex-wrap items-center gap-x-1 font-semibold text-[var(--tinta2)]">
              <span className="tabular inline-block w-3.5 text-[var(--tinta3)]">{n}</span>{ROTULO[paso]}
              {paso === 'choke'
                ? <Info titulo="¿Dónde se trabó?" texto={`${INFO_PASO_2}${codigos && d ? ` En el reporte: ${enElReporte(paso, String(d.valor))}.` : ''}`} />
                : <Info titulo={ROTULO[paso]} texto={info} />}
            </dt>
            <dd className="min-w-0 pl-[1.125rem] md:pl-0">
              {valor !== undefined
                ? <b className="font-semibold text-[var(--tinta)]">{valor}</b>
                : <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5"><Falta />{sugerido !== undefined && <span className="text-[10.5px] text-[var(--tinta2)]">TRIM sugiere: {valorEnPalabras(paso, String(sugerido))}</span>}</span>}
            </dd>
            <dd className={cn('min-w-0 break-words pl-[1.125rem] text-[10.5px] md:pl-0', d && esDePersona(d.procedencia) ? 'text-[var(--tinta)]' : 'text-[var(--tinta2)]')}>
              {marca}
              {faltaParte && <span className="mt-0.5 flex flex-wrap items-center gap-x-1"><Falta>falta la parte de {p.causa.equipo}</Falta>la dice quien la abra</span>}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
