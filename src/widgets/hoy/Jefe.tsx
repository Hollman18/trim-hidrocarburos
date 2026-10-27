import { useState } from 'react'
import { useAmbito } from '@/app/store'
import type { VistaHoy } from '@/shared/api/hoy'
import { useListaEquipos } from '@/shared/api/equiposTecnico'
import { useCriticidad, DONDE_CHOKE } from '@/shared/api/choke'
import { useFallasMensual, NOMBRE_TRAMO_BALANCE } from '@/shared/api/balance'
import { useSap, useRelojes } from '@/shared/api/sap'
import { NOMBRE_TRAMO_TIEMPO_FUERA, TRAMOS_TIEMPO_FUERA } from '@/shared/api/acciones'
import { pedirInicioDeHistoria } from '@/shared/api/calendario'
import { useUsuarios } from '@/shared/api/usuarios'
import { AHORA, fechaHora } from '@/entities/reloj'
import { NOMBRE_ESTADO_ORDEN } from '@/entities/sap'
import { HojaInferior } from '@/shared/ui/HojaInferior'
import { Boton } from '@/shared/ui/primitivas'
import { n0, n1 } from '@/shared/lib/formato'
import { AvisarSap } from '@/widgets/sap/AvisarSap'
import { Cifras } from './Cifras'

/** Las horas de un tramo del tiempo fuera, o «sin dato» (nunca un 0 inventado). */
const horas = (h: number | null | undefined) => (h === null || h === undefined ? 'sin dato' : `${n1(h)} h`)
const y = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

/** El jefe de mantenimiento (necesario-por-rol §5; la imagen d1-grafito-jefe): «1 equipo avisa»
 *  con el más cercano y en qué tramo del choke frenaría, y su orden a un toque (ver o crear);
 *  las paradas por identificar; las fallas de los equipos críticos del mes (`/vistas/fallas/mensual`);
 *  «7,7 de 8,1 días son espera», que abre el tiempo fuera en sus 5 tramos (`tramos` de
 *  `/vistas/relojes`); y «No intervenir hoy», solo cuando aplica. Todo lo calcula el motor. */
export function InicioJefe({ v }: { v: VistaHoy }) {
  const ambito = useAmbito()
  const campos = ambito.campos.map(c => c.id)
  const lista = useListaEquipos(campos)
  const ranking = useCriticidad(campos).ranking
  const meses = useFallasMensual(campos)
  const { ordenes } = useSap(campos)
  const usuarios = useUsuarios()
  const [verOrden, setVerOrden] = useState(false)
  const [espera, setEspera] = useState(false)

  const avisan = lista.filas.filter(f => f.filtros.includes('avisan'))
  const primero = avisan[0]
  const tramo = primero ? ranking.find(r => r.campoId === primero.campoId && r.equipo === primero.equipo)?.tramo : undefined
  const orden = primero ? ordenes.find(o => o.campoId === primero.campoId && o.equipo === primero.equipo && o.estado !== 'TECO') : undefined
  const sinCausa = [...new Set(v.tareas.filter(t => t.tipo === 'conseguir-causa').flatMap(t => (t.preguntas ?? []).map(q => q.equipo)))]
  const mes = meses.at(-1)
  const conFalla = mes?.porEquipo.filter(e => e.fallas > 0) ?? []

  return (
    <>
      <Cifras titulo="Lo de hoy" principal={{
        id: 'avisan', rotulo: 'Avisan', cifra: n0(lista.cuentas.estado.avisan),
        detalle: primero ? <><b className="font-cond font-bold">{primero.equipo}</b> {primero.palabra}{tramo ? ` · frenaría ${DONDE_CHOKE[tramo]}` : ''}</> : 'ninguno',
      }} apoyo={[
        { id: 'por-identificar', rotulo: 'Por identificar', cifra: n0(sinCausa.length), detalle: sinCausa.length ? y(sinCausa) : undefined },
        mes && { id: 'fallas-mes', rotulo: `Fallas críticas · ${mes.nombre.split(' ')[0]}`, cifra: n0(mes.fallas),
          detalle: conFalla.length ? y(conFalla.map(e => `${e.equipo} (${NOMBRE_TRAMO_BALANCE[e.tramo].toLowerCase()})`)) : undefined },
        { id: 'espera', rotulo: 'Espera', cifra: v.inicio.cifra, unidad: 'días por falla', onAbrir: () => setEspera(true), abrir: `Espera: ${v.inicio.cifra} días por falla. Ver el tiempo fuera en 5 tramos` },
      ]}>
        {primero && (orden
          ? <Boton variante="principal" aria-expanded={verOrden} onClick={() => setVerOrden(x => !x)} className="min-h-12 px-6 text-[16px]" data-ver-orden>{verOrden ? 'Ocultar la orden' : 'Ver la orden'}</Boton>
          : null)}
      </Cifras>
      {primero && !orden && <AvisarSap campoId={primero.campoId} equipo={primero.equipo} contexto={`${primero.familia} · ${primero.palabra}`} />}
      {verOrden && orden && (
        <section aria-label={`Orden ${orden.numero}`} data-orden-abierta={orden.numero} className="grid gap-1 rounded-[10px] bg-[var(--panel)] px-5 py-3.5 text-[15px] sm:px-7">
          <p><b className="font-semibold">Orden {orden.numero}</b> · {primero!.equipo} · {NOMBRE_ESTADO_ORDEN[orden.estado]}
            {orden.liberada ? ` · liberada ${fechaHora(new Date(orden.liberada))}` : ''}{orden.tecnico ? ` a ${usuarios.find(u => u.id === orden.tecnico)?.nombre ?? orden.puesto}` : ''}</p>
          <p className="text-[var(--tinta2)]">{orden.descripcion}</p>
        </section>
      )}
      {espera && <TiempoFuera campos={campos} onCerrar={() => setEspera(false)} />}
    </>
  )
}

/** «El tiempo fuera en sus 5 tramos» (U1 §7.5; A3): detección, administrativo, logística,
 *  reparación y arranque, promedio por falla; lo que ninguna marca explica va aparte, sin repartir. */
function TiempoFuera({ campos, onCerrar }: { campos: string[]; onCerrar: () => void }) {
  const r = useRelojes(campos, pedirInicioDeHistoria(), AHORA)
  const t = r?.tramos
  return (
    <HojaInferior titulo="El tiempo fuera en 5 tramos" onCerrar={onCerrar}>
      <section aria-label="El tiempo fuera en 5 tramos" data-tiempo-fuera className="grid gap-2.5 rounded-[10px] bg-[var(--panel)] px-5 py-4 sm:px-7">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold">El tiempo fuera en 5 tramos</h2>
          <span className="text-[14px] text-[var(--tinta2)]">{r ? `promedio de ${r.fallas} fallas · ${horas(r.totalH)} cada una` : 'sin fallas cerradas'}</span>
        </header>
        {t ? (
          <ul className="grid" data-tramos-tiempo-fuera>
            {TRAMOS_TIEMPO_FUERA.map(k => (
              <li key={k} className="flex items-baseline justify-between border-t border-[var(--linea2)] py-2 text-[15px] first:border-t-0" data-tramo-tiempo={k}>
                <span>{NOMBRE_TRAMO_TIEMPO_FUERA[k]}</span><b className="tabular font-semibold">{horas(t[`${k}H` as const])}</b>
              </li>
            ))}
            <li className="flex items-baseline justify-between border-t border-[var(--linea2)] py-2 text-[15px] text-[var(--tinta2)]" data-tramo-tiempo="sin-dato">
              <span>Sin marca que lo explique</span><b className="tabular font-semibold">{horas(t.sinDatoH)}</b>
            </li>
          </ul>
        ) : <p className="text-[15px] text-[var(--tinta2)]">Sin dato: ninguna falla cerrada tiene sus marcas todavía.</p>}
        <small className="text-[13px] text-[var(--tinta2)]">La reparación sale del cierre de la orden en el teléfono o de SAP; lo que no tiene marca no se reparte.</small>
        <Boton onClick={onCerrar} className="justify-self-start">Cerrar</Boton>
      </section>
    </HojaInferior>
  )
}

/** «No intervenir hoy», solo cuando aplica (C-06: una vez, en el inicio del jefe; `listaEquipos().noIntervenir`).
 *  Informa, no pide nada: va después de lo que le toca hacer. */
export function NoIntervenir() {
  const ambito = useAmbito()
  const lista = useListaEquipos(ambito.campos.map(c => c.id))
  return <>{lista.noIntervenir.map(t => (
    <p key={t} className="rounded-[10px] bg-[var(--panel)] px-5 py-3 text-[15px] leading-snug shadow-[inset_3px_0_0_var(--tinta)] sm:px-7" data-no-intervenir>
      {t.startsWith('Ojo:') ? <><b className="font-semibold">Ojo:</b>{t.slice(4)}</> : t}
    </p>
  ))}</>
}
