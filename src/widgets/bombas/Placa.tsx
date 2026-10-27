import { useId } from 'react'
import { plantillaDe, PAPEL_NOMBRE } from '@/entities/bombas'
import { fechaHora } from '@/entities/reloj'
import { NOMBRE_PARTE } from '@/entities/partes'
import { Chip, Hueco } from '@/shared/ui/primitivas'
import { MarcaPrioridad, MarcaCondicion } from '@/shared/ui/Prioridad'
import { useNivelEquipo, PALABRA_CONDICION } from '@/shared/api/equiposTecnico'
import { Info } from '@/shared/ui/Info'
import { DichoEnPapel } from '@/shared/ui/DichoEnPapel'
import { causaEnPapel } from '@/shared/ui/papel'
import { Tip } from '@/shared/ui/Tip'
import { n0, plural } from '@/shared/lib/formato'
import { CLAVE, fmtBbl, fmtRango, fmtHoras, textoColchon, estadoCorto, fraseParteCorta, respaldoAbsorbe } from './comun'
import { tipoNombre, porTag, type BombaVista } from './vista'
import { SenalFija } from './SenalFija'
import type { NivelDetalle } from '@/entities/tipos'

/** Placa de una bomba: el nivel 2 de ISA-101. Cuatro variables con su banda,
 *  sus partes, y abajo la frase que importa: cuánto está costando o cuánto
 *  costaría si falla hoy.
 *
 *  F3 · La marca es la del equipo (la de la franja, con su palabra: H3 y H16),
 *  no la severidad de su estado; y cada variable va con la escala FIJA del
 *  motor, su banda, su alarma y su minitendencia (`nivelEquipo`, la misma del
 *  nivel 3: H5 y H12). «Si falla hoy» siempre en bbl/d (D-2, G-16) y lo
 *  diferido «se deja de producir» (T-8). */
export function Placa({ b, global, nivel = 'ingenieria', onAbrir }: { b: BombaVista; global: boolean; nivel?: NivelDetalle; onAbrir: () => void }) {
  const { eq, perfil, senales, veredicto: ve, abierta, partes } = b
  const idNombre = useId()
  const nivel3 = useNivelEquipo(b.campo.id, eq.id)
  const delMotor = porTag(nivel3)
  const condicion = nivel3?.condicion
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
  // Cada parte que avisa va en su renglón con su estado; las que no piden nada
  // (estables, o todas con la bomba detenida) van juntas en uno, gris (ISA-101):
  // sus nombres y estados quedan en el globo y en el papel. Una parte sin
  // instrumentos es un hueco: va en su renglón, a la vista.
  const avisan = partes.filter(p => p.estado === 'fallo' || p.estado === 'fuera' || p.estado === 'avisa' || (nivel !== 'operacion' && p.estado === 'sin-dato'))
  const resto = nivel === 'operacion' ? [] : partes.filter(p => !avisan.includes(p))
  const restoDetenidas = resto.length > 0 && resto.every(p => p.estado === 'detenida')
  // Lo que está encima del botón que cubre la tarjeta (un ⓘ, un globo) se levanta para recibir el toque.
  const encima = 'relative z-[1]'
  return (
    // Una tarjeta que se lee (barriles, partes, «si se para») y un botón que la
    // abre. Como role=button entera, su aria-label tapaba todo lo de adentro: el
    // lector anunciaba solo el nombre. El botón cubre la tarjeta para el ratón y
    // el dedo; el anillo de foco se pinta en la tarjeta.
    <article aria-labelledby={idNombre} data-placa={eq.id} data-condicion={condicion ?? ''}
      className="relative flex flex-col rounded-[20px] bg-[var(--panel)] p-4 text-left transition-colors hover:bg-[var(--elevado)] has-[>button:focus-visible]:ring-2 has-[>button:focus-visible]:ring-[var(--foco)]">
      <div className="flex items-start gap-2">
        {/* La marca del equipo, la de la franja: una por equipo, la misma en todas partes (H3). */}
        {condicion && <MarcaCondicion c={condicion} tamano={16} className="mt-[1px]" etiqueta={PALABRA_CONDICION[condicion]} />}
        <span className="min-w-0 flex-1">
          <b id={idNombre} className="line-clamp-2 block text-[15px] leading-tight">{eq.nombre}</b>
          <small className="font-cond block truncate text-[14px] font-bold tracking-[.02em] text-[var(--tinta2)]">
            {eq.id}{global ? <span className="font-sans font-normal tracking-normal"> · {b.campo.nombre}</span> : ''}
          </small>
        </span>
        <Chip>{tipoNombre(perfil)}</Chip>
      </div>
      <p className="mt-1 text-[14px] leading-snug text-[var(--tinta2)]">
        {condicion && <b className="font-semibold text-[var(--tinta)]">{PALABRA_CONDICION[condicion]} · </b>}
        {eq.estado}{perfil ? ` · ${PAPEL_NOMBRE[perfil.papel].toLowerCase()}` : ''}
      </p>

      {perfil && nivel === 'operacion' && filas.length === 0 && (
        <p className="mt-2.5 text-[14px] text-[var(--tinta2)]">Instrumentos en banda.</p>
      )}
      {perfil ? (
        <div className="mt-2.5 grid gap-2.5">
          {filas.map(({ pl, s }) => {
            // La escala, la banda, el gris y la marca de cada señal los da el motor (la misma del nivel 3).
            const m = s ? delMotor.get(s.tag) : undefined
            return m ? (
              // Con la bomba detenida, una sola marca (la de la bomba) y sus variables en gris (X2 B9).
              <SenalFija key={pl.id} s={m} nombre={pl.nombre} />
            ) : s ? (
              // Mientras llega la vista del motor, el valor y nada más: sin escala no se dibuja indicador.
              <div key={pl.id} className="flex items-baseline justify-between gap-2 border-b border-[var(--linea2)] pb-1.5 text-[14px]">
                <span className="text-[var(--tinta2)]">{pl.nombre}</span>
                <b className="tabular shrink-0 font-semibold">{s.valor === null ? '---' : s.valor.toLocaleString('es-CO')} <small className="font-normal text-[var(--tinta2)]">{s.unidad}</small></b>
              </div>
            ) : (
              <div key={pl.id} className="flex items-baseline justify-between gap-2 border-b border-dashed border-[var(--linea2)] pb-1.5 text-[14px]">
                <span className="text-[var(--tinta2)]">{pl.nombre}</span>
                <span className="shrink-0 text-[13px] text-[var(--tinta2)]">no instrumentada</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-2.5">
          <Hueco>
            <span className="flex flex-wrap items-center gap-x-1">
              Falta declarar papel, capacidad y respaldo.
              <Info className={encima} titulo="Sin perfil" texto="Falta declarar su papel, capacidad y respaldo en este campo. Sin eso no se puede calcular el crudo en riesgo." />
            </span>
          </Hueco>
        </div>
      )}

      {perfil && (avisan.length > 0 || resto.length > 0) && (
        <div className="mt-2.5">
          <h4 className="mb-0.5 text-[14px] font-semibold text-[var(--tinta2)]">{nivel === 'operacion' ? 'Partes que avisan' : 'Partes'}</h4>
          {avisan.map(sp => (
            <div key={sp.parte.id} className="py-[3px] text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <MarcaPrioridad s={sp.prioridad} tamano={11} />
                  {sp === peor && !abierta ? <b className="truncate">{sp.parte.nombre}</b> : <span className="truncate">{sp.parte.nombre}</span>}
                </span>
                <span className="tabular shrink-0 text-[13px] text-[var(--tinta2)]">{estadoCorto(sp)}</span>
              </div>
              {/* La que más preocupa dice qué variable lo anuncia y cuándo (antes iba repetida al pie). */}
              {sp === peor && !abierta && fraseParteCorta(sp) && (
                <small className="tabular block pl-[17px] text-[13px] text-[var(--tinta2)]">{fraseParteCorta(sp)}</small>
              )}
            </div>
          ))}
          {resto.length > 0 && (
            <Tip titulo={restoDetenidas ? 'Partes · bomba detenida' : 'Partes estables'} filas={resto.map(sp => [sp.parte.nombre, estadoCorto(sp)])}
              imprimir="todo" className={`${encima} flex min-h-6 w-fit items-center gap-1.5 py-[3px] text-[13px] text-[var(--tinta3)] sm:min-h-0`}>
              <MarcaPrioridad s={0} tamano={11} />
              {plural(resto.length, 'parte', 'partes')} {restoDetenidas ? 'con la bomba detenida' : resto.length === 1 ? 'estable' : 'estables'}
            </Tip>
          )}
        </div>
      )}

      {perfil && (
        <div className="mt-auto border-t border-[var(--linea2)] pt-2 text-[13px]">
          {abierta ? (
            <>
              <span className="block text-[13px] text-[var(--tinta3)]">
                Detenida desde {fechaHora(abierta.inicio)}
                {/* Sin identificar, la causa la dice «no arrancar» de abajo (y su ⓘ). */}
                {abierta.causa.parte ? ` · ${NOMBRE_PARTE[abierta.causa.parte].toLowerCase()}` : abierta.pide ? '' : <DichoEnPapel papel={` · ${causaEnPapel(abierta.causa).toLowerCase()}`}>{` · ${abierta.causa.texto.toLowerCase()}`}</DichoEnPapel>}
              </span>
              {abierta.cargadoA !== eq.id ? (
                <span className="flex flex-wrap items-center gap-x-1 text-[var(--tinta2)]">
                  La paró {abierta.cargadoA}
                  <Info className={encima} titulo={`La paró ${abierta.cargadoA}`} texto={`Los barriles se le cargan a ${abierta.cargadoA}, no a esta bomba.`} />
                </span>
              ) : (
                <span className="flex flex-wrap items-center gap-x-1.5" data-diferido-placa>
                  {/* La prioridad la dice la forma de la tarjeta: la cifra va en tinta (ISA-101). */}
                  <b className="tabular text-[17px]">{fmtBbl(abierta.bbl)}</b>
                  {/* P-bombas-1: «573 bbl · calculado ⓘ»; el rango y el ritmo, en la ⓘ (y en el papel). Los pozos
                      cerrados y la hora ya los dice la cifra de arriba de la pantalla. */}
                  <span className="text-[14px] text-[var(--tinta2)]">{abierta.bbl > 0 ? 'calculado' : pr?.perdiendo ? '' : 'el tanque todavía absorbe'}</span>
                  {(abierta.bbl > 0 || pr?.perdiendo) && (
                    <Info className={encima} titulo={`${fmtBbl(abierta.bbl)} · calculado`}
                      texto={[abierta.bbl > 0 ? `Entre ${fmtRango(abierta.rango)} bbl, con su tolerancia.` : '',
                        pr?.perdiendo ? `Ahora se dejan de producir ${n0(pr.perdiendo.bblDia / 24)} bbl/h: ${plural(pr.perdiendo.pozos.length, 'pozo cerrado', 'pozos cerrados')}.` : ''].filter(Boolean).join(' ')} />
                  )}
                </span>
              )}
              {abierta.pide && (
                // «No arrancar» es un bloqueo de procedimiento, no una prioridad: franja en tinta con ⊘ (X5 §5.6).
                <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 rounded-[10px] px-2 py-1 text-[14px] text-[var(--tinta)] shadow-[inset_0_0_0_2px_var(--tinta)]" data-bloqueo>
                  <MarcaCondicion c="bloqueo" tamano={14} decorativa />
                  <span><b>No arrancar</b> hasta identificar</span>
                  <Info className={encima} titulo="No arrancar"
                    texto={`${abierta.causa.texto}. Sin identificar qué se dañó: no arrancar hasta que quien la revise lo registre.`}
                    textoEnPapel={`${causaEnPapel(abierta.causa)}. Sin identificar qué se dañó: no arrancar hasta que quien la revise lo registre.`} />
                </span>
              )}
            </>
          ) : peor ? null : nivel === 'operacion' || resto.length === 0 ? (
            // En ingeniería ya lo dice el renglón «N partes estables».
            <span className="block text-[var(--tinta3)]">Ninguna parte avisa.</span>
          ) : null}
          {pr && !abierta && (
            // «Si falla hoy» es una tasa: bbl/d, el mismo nombre y la misma cifra que Equipos y el nivel 3 (D-2, G-16).
            <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[14px] text-[var(--tinta2)]" data-si-falla-hoy>
              {!pr.inmediato ? <>
                  <span>Si falla hoy: no cierra pozos</span>
                  <Info className={encima} titulo="Si falla hoy" texto="No cierra pozos hoy. Baja el soporte de presión." />
                </>
                // Colchón infinito: no hay «después del colchón» que contar.
                : respaldoAbsorbe(pr) ? <>
                  <span>Si falla hoy: no cierra pozos</span>
                  <Info className={encima} titulo="Si falla hoy" texto="El respaldo absorbe toda el agua: una falla no cierra pozos." />
                </>
                : pr.colchon ? <>
                  <span>Si falla hoy: <b className="tabular text-[var(--tinta)]">{n0(pr.crudoBpd)} bbl/d</b> después de {textoColchon(pr.colchon.horas)} de colchón</span>
                  {pr.crudoParejoBpd > pr.crudoBpd + 1 && (
                    <Info className={encima} titulo="Si falla hoy"
                      texto={`El tanque aguanta ${fmtHoras(pr.colchon.horas, true)}; luego se dejan de producir ${n0(pr.crudoBpd)} bbl/d cerrando los pozos en orden (${n0(pr.crudoParejoBpd)} bbl/d cerrando parejo).`} />
                  )}
                </>
                : <span>Si falla hoy: <b className="tabular text-[var(--tinta)]">{n0(pr.crudoBpd)} bbl/d</b> de inmediato</span>}
            </p>
          )}
          {ve && nivel === 'ingenieria' && ve.historial.fallas > 0 && (
            <p className="tabular mt-0.5 text-[14px] text-[var(--tinta2)]">
              {plural(ve.historial.fallas, 'falla', 'fallas')} en {n0(ve.historial.dias / 30.4)} meses{ve.historial.mtbfDias ? ` · cada ${n0(ve.historial.mtbfDias)} d` : ''}
              {ve.historial.mdtH ? ` · ${fmtHoras(ve.historial.mdtH, true)} fuera` : ''}
              {/* Lo que YA costó (histórico); «si falla hoy» es la cifra de Riesgo. */}
              {ve.porFalla !== undefined ? ` · le ha costado ${n0(ve.porFalla)} bbl por falla` : ''}
            </p>
          )}
        </div>
      )}
      <button onClick={onAbrir} aria-label={`Abrir el detalle de ${eq.nombre}`}
        className="absolute inset-0 cursor-pointer rounded outline-none" />
    </article>
  )
}
