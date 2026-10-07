import { useId } from 'react'
import { plantillaDe, PAPEL_NOMBRE } from '@/entities/bombas'
import { fechaHora, AHORA } from '@/entities/reloj'
import { NOMBRE_PARTE } from '@/entities/partes'
import { Chip, Hueco } from '@/shared/ui/primitivas'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { DE_ESTADO } from '@/shared/lib/prioridad'
import { Analogico } from '@/shared/ui/Analogico'
import { n0, n1, decimalesDe } from '@/shared/lib/formato'
import { CLAVE, fmtBbl, fmtRango, fmtHoras, estadoCorto, fraseParte } from './comun'
import { tipoNombre, type BombaVista } from './vista'
import type { NivelDetalle } from '@/entities/tipos'

/** Placa de una bomba: el nivel 2 de ISA-101. Cuatro variables con su banda,
 *  sus partes, y abajo la frase que importa: cuánto está costando o cuánto
 *  costaría si se para ahora. */
export function Placa({ b, global, nivel = 'ingenieria', onAbrir }: { b: BombaVista; global: boolean; nivel?: NivelDetalle; onAbrir: () => void }) {
  const { eq, perfil, senales, veredicto: ve, abierta, partes } = b
  const idNombre = useId()
  if (nivel === 'decision') return <PlacaDirectiva b={b} global={global} onAbrir={onAbrir} />
  const peor = partes.find(p => p.estado === 'fallo' || p.estado === 'fuera' || p.estado === 'avisa')
  const pr = ve?.prediccion
  const plantilla = perfil ? plantillaDe(perfil.subtipo) : []
  const filas = perfil ? (nivel === 'operacion'
    // En operación: solo lo que está fuera de banda, de cualquier variable.
    ? senales.filter(x => x.estado !== 'normal' && x.valor !== null).map(x => ({ pl: x.plantilla, s: x as typeof x | undefined }))
    : CLAVE[perfil.subtipo].map(id => ({
      pl: plantilla.find(p => p.id === id)!,
      s: senales.find(x => x.plantilla.id === id),
    }))) : []
  const partesVisibles = nivel === 'operacion' ? partes.filter(p => p.estado === 'fallo' || p.estado === 'fuera' || p.estado === 'avisa') : partes
  return (
    // Una tarjeta que se lee (barriles, partes, «si se para ahora») y un botón
    // que la abre. Como role=button entera, su aria-label tapaba todo lo de
    // adentro: el lector anunciaba solo el nombre. El botón cubre la tarjeta
    // para el ratón y el dedo; el anillo de foco se pinta en la tarjeta.
    <article aria-labelledby={idNombre}
      className="relative flex flex-col rounded border border-[var(--linea)] bg-[var(--panel)] p-3 text-left shadow-[var(--sombra)] transition-colors hover:bg-[var(--elevado)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--acento)]">
      <div className="flex items-start gap-2">
        <MarcaPrioridad s={eq.severidad} tamano={16} className="mt-[1px]" />
        <span className="min-w-0 flex-1">
          <b id={idNombre} className="line-clamp-2 block text-[13px] leading-tight">{eq.nombre}</b>
          <small className="font-mono block truncate text-[10px] text-[var(--tinta3)]">
            {eq.id}{global ? ` · ${b.campo.nombre}` : ''}
          </small>
        </span>
        <Chip>{tipoNombre(perfil)}</Chip>
      </div>
      <p className="mt-1 text-[11px] text-[var(--tinta2)]">
        {eq.estado}{perfil ? ` · ${PAPEL_NOMBRE[perfil.papel].toLowerCase()}` : ''}
      </p>

      {perfil && nivel === 'operacion' && filas.length === 0 && (
        <p className="mt-2.5 text-[11px] text-[var(--tinta3)]">Instrumentos dentro de banda.</p>
      )}
      {perfil ? (
        <div className="mt-2.5 grid gap-2.5">
          {filas.map(({ pl, s }) => s ? (
            <Analogico key={pl.id} nombre={pl.nombre} valor={s.valor} unidad={s.unidad} normal={s.normal}
              alarma={s.alarma} decimales={decimalesDe(s.serie?.valores, s.valor)} estado={DE_ESTADO[s.estado] ?? undefined} />
          ) : (
            <div key={pl.id} className="flex items-baseline justify-between gap-2 border-b border-dashed border-[var(--linea2)] pb-1.5 text-[11px]">
              <span className="text-[var(--tinta2)]">{pl.nombre}</span>
              <span className="shrink-0 text-[10px] text-[var(--tinta3)]">no instrumentada</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2.5">
          <Hueco>Falta declarar su papel, capacidad y respaldo en este campo. Sin eso no se puede calcular el crudo en riesgo.</Hueco>
        </div>
      )}

      {perfil && partesVisibles.length > 0 && (
        <div className="mt-2.5">
          <h4 className="font-cond mb-0.5 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">{nivel === 'operacion' ? 'PARTES QUE AVISAN' : 'PARTES'}</h4>
          {partesVisibles.map(sp => (
            <div key={sp.parte.id} className="flex items-center justify-between gap-2 py-[3px] text-[11px]">
              <span className="flex min-w-0 items-center gap-1.5">
                <MarcaPrioridad s={sp.prioridad} tamano={11} />
                <span className="truncate">{sp.parte.nombre}</span>
              </span>
              <span className="tabular shrink-0 text-[10.5px] text-[var(--tinta2)]">{estadoCorto(sp)}</span>
            </div>
          ))}
        </div>
      )}

      {perfil && (
        <div className="mt-auto border-t border-[var(--linea2)] pt-2 text-[11px]">
          {abierta ? (
            <>
              <span className="block text-[10.5px] text-[var(--tinta3)]">
                Detenida desde {fechaHora(abierta.inicio)} · {abierta.causa.parte ? NOMBRE_PARTE[abierta.causa.parte].toLowerCase() : abierta.causa.texto.toLowerCase()}
              </span>
              {abierta.cargadoA !== eq.id ? (
                <span className="block text-[var(--tinta2)]">La paró {abierta.cargadoA}: los barriles se le cargan a ese equipo.</span>
              ) : (
                <span className="flex flex-wrap items-baseline gap-x-2">
                  {/* La prioridad la dice la forma de la tarjeta: la cifra va en tinta (ISA-101). */}
                  <b className="tabular text-[17px]">{fmtBbl(abierta.bbl)}</b>
                  <span className="tabular text-[10.5px] text-[var(--tinta2)]">
                    {abierta.bbl > 0 ? `entre ${fmtRango(abierta.rango)} · ` : ''}{pr?.perdiendo ? `${n0(pr.perdiendo.bblDia / 24)} bbl/h ahora · ${pr.perdiendo.pozos.length} pozos cerrados` : 'el tanque todavía absorbe'}
                  </span>
                </span>
              )}
              {abierta.pide && (
                <span className="mt-1 flex items-start gap-1.5 text-[10.5px] text-[var(--tinta)]">
                  <MarcaPrioridad s={2} tamano={11} className="mt-[1px]" />
                  <span>Sin identificar qué se dañó: <b>no arrancar</b> hasta que quien la revise lo registre.</span>
                </span>
              )}
            </>
          ) : peor ? (
            <span className="block"><b>{peor.parte.nombre}</b>: {fraseParte(peor)}</span>
          ) : (
            <span className="block text-[var(--tinta3)]">Ninguna parte va hacia su límite.</span>
          )}
          {pr && !abierta && (
            <p className="mt-1 text-[10.5px] text-[var(--tinta3)]">
              {!pr.inmediato ? 'Si se para: no cierra pozos hoy. Baja el soporte de presión.'
                : pr.colchon ? <>Si se para ahora: el tanque aguanta <b className="tabular text-[var(--tinta)]">{fmtHoras(pr.colchon.horas, true)}</b>, luego <b className="tabular text-[var(--tinta)]">{n0(pr.crudoBpd)} bbl/d</b>{pr.crudoParejoBpd > pr.crudoBpd + 1 ? ` cerrando en orden (${n0(pr.crudoParejoBpd)} parejo)` : ''}</>
                  : <>Si se para ahora: <b className="tabular text-[var(--tinta)]">{n0(pr.crudoBpd)} bbl/d</b> de inmediato</>}
            </p>
          )}
          {ve && nivel === 'ingenieria' && ve.historial.fallas > 0 && (
            <p className="mt-0.5 text-[10.5px] text-[var(--tinta3)]">
              {ve.historial.fallas} fallas en {n0(ve.historial.dias / 30.4)} meses{ve.historial.mtbfDias ? ` · una cada ${n0(ve.historial.mtbfDias)} días` : ''}
              {ve.porFalla !== undefined ? ` · ${n0(ve.porFalla)} bbl por falla` : ''}{ve.historial.mdtH ? ` · ${n1(ve.historial.mdtH)} h fuera` : ''}
            </p>
          )}
        </div>
      )}
      <span className="sr-only">Hora de referencia {fechaHora(AHORA)}</span>
      <button onClick={onAbrir} aria-label={`Abrir el detalle de ${eq.nombre}`}
        className="absolute inset-0 cursor-pointer rounded outline-none" />
    </article>
  )
}

/** La bomba para quien decide: si está parada o en marcha, lo que está
 *  costando o costaría, lo que le ha costado y de qué falla. Sin variables. */
function PlacaDirectiva({ b, global, onAbrir }: { b: BombaVista; global: boolean; onAbrir: () => void }) {
  const idNombre = useId(), idEstado = useId(), idDetalle = useId()
  const { eq, perfil, veredicto: ve, abierta, partes, periodo } = b
  const pr = ve?.prediccion
  const avisa = partes.find(p => p.estado === 'fuera' || p.estado === 'avisa')
  const parte = ve?.historial.porParte[0]
  return (
    // El nombre del botón es la bomba y la descripción, lo que dice la tarjeta:
    // un aria-label con solo el nombre dejaba mudos los barriles y la falla.
    <button onClick={onAbrir} aria-labelledby={idNombre} aria-describedby={`${idEstado} ${idDetalle}`}
      className="flex cursor-pointer flex-col rounded border border-[var(--linea)] bg-[var(--panel)] p-3 text-left shadow-[var(--sombra)] transition-colors hover:bg-[var(--elevado)] focus-visible:ring-2 focus-visible:ring-[var(--acento)]">
      <span className="flex items-start gap-2">
        <MarcaPrioridad s={eq.severidad} tamano={16} className="mt-[1px]" />
        <span className="min-w-0 flex-1">
          <b id={idNombre} className="block text-[13px] leading-tight">{eq.id}{global ? ` · ${b.campo.nombre}` : ''}</b>
          <small id={idEstado} className="block text-[11px] text-[var(--tinta2)]">
            {!perfil ? 'sin datos de la bomba en este campo' : abierta ? `Parada desde ${fechaHora(abierta.inicio)}` : avisa ? `En marcha · ${avisa.parte.nombre.toLowerCase()} avisa` : 'En marcha'}
          </small>
        </span>
      </span>
      {perfil && (
        <span id={idDetalle} className="mt-2 grid gap-1 text-[12px]">
          {pr?.perdiendo ? <span><b className="tabular">{n0(pr.perdiendo.bblDia)} bbl/d</b> perdiéndose · {pr.perdiendo.pozos.length} pozos cerrados</span>
            : pr && !pr.inmediato ? <span className="text-[var(--tinta2)]">Si se para, no cierra pozos hoy</span>
              : pr ? <span className="text-[var(--tinta2)]">Si se para: <b className="tabular text-[var(--tinta)]">{n0(pr.crudoBpd)} bbl/d</b></span> : null}
          {abierta?.pide && <span className="text-[11px] text-[var(--tinta2)]">Esperando que se identifique el daño</span>}
          <span className="text-[var(--tinta2)]">Le ha costado <b className="tabular text-[var(--tinta)]">{n0(periodo?.bbl ?? 0)} bbl</b> en el período</span>
          {parte && <span className="text-[11px] text-[var(--tinta3)]">Falla más por {NOMBRE_PARTE[parte.parte].toLowerCase()}{ve?.historial.mtbfDias ? ` · una falla cada ${n0(ve.historial.mtbfDias)} días` : ''}</span>}
        </span>
      )}
    </button>
  )
}
