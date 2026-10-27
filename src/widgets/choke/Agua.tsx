import { useId, useState } from 'react'
import { useApp, useRol } from '@/app/store'
import { useTuberiaAgua, NOMBRE_TRAMO_AGUA, type TuberiaAgua, type TramoTuberiaAgua, type BombaDelTren } from '@/shared/api/choke'
import { useEstadoCampos, usePrediccion, useParadas, useBarrilesDeEquipos } from '@/shared/api/diferidos'
import { useEquiposDeHoy, useHistoriaEquipo, pedirPerfilesBomba } from '@/shared/api/equipos'
import { useCampoAhora } from '@/shared/api/medicion'
import type { PerfilBomba } from '@/entities/bombas'
import { NOMBRE_PARTE } from '@/entities/partes'
import { campoPorId } from '@/entities/campos'
import { AHORA, fechaHora } from '@/entities/reloj'
import type { Severidad } from '@/entities/tipos'
import { Panel, Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { Lectura } from '@/shared/ui/Lectura'
import { MarcaPrioridad, DatoInvalido } from '@/shared/ui/Prioridad'
import { formatoFecha } from '@/shared/lib/fecha'
import { n0, n1, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { fmtHoras, textoColchon } from '@/widgets/bombas/comun'
import { TEXTO, ESTADO_TRAMO, sinFirma, mayuscula, lista } from './palabras'

const HORA = formatoFecha({ hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' })
const PALABRA = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']
const cuantas = (n: number) => PALABRA[n] ?? n0(n)

const AYUDA_TUBERIA = 'Es el modelo choke del agua: el agua de los pozos pasa por el tratamiento, el tanque y las bombas de agua hasta los pozos inyectores. El tramo más angosto dice «limita»; el tanque no tiene caudal: es el colchón que da tiempo cuando para una bomba. Cada capacidad se dice también en crudo, con el crudo que trae cada barril de agua según las pruebas.'
/** T-8: cerrar un pozo deja de producir su crudo; no es una pérdida. */
export const AYUDA_ACUATOSOS = '«Hay que parar los pozos acuatosos, los que más producen agua»: es la regla de operación del campo. TRIM los ordena por el crudo que dan por cada barril de agua: primero los que menos crudo dan, para dejar de producir lo menos posible.'

/** La frase de arriba (P-agua-1; X4 §6.1, tabla «Antes y después», fila de Agua):
 *  «Con las tres bombas, al agua le sobra espacio. Si para una, hay que cerrar
 *  pozos.» Las cifras van en la ⓘ de cada caja y en «Ver la cuenta» (las frases
 *  del motor). Con el agua que limita o sin capacidades, la primera frase del motor. */
function fraseCortaAgua(a: TuberiaAgua): string {
  const enServicio = (a.tramos.find(x => x.tramo === 'bombas')?.bombas ?? []).filter(b => !b.reserva).length
  if (a.campoDeGas || a.limita || !a.angosto || a.sobraBpd <= 0 || !enServicio) return a.frases[0] ?? ''
  const con = enServicio === 1 ? 'Con su bomba' : `Con las ${cuantas(enServicio)} bombas`
  const si = !a.sinUna ? ''
    : a.sinUna.papel === 'recobro' ? ` Si para ${a.sinUna.bomba}, no cierra pozos: el agua tiene otra salida.`
      : a.sinUna.aguaSinSalidaBpd > 0 ? ' Si para una, hay que cerrar pozos.' : ' Si para una, el respaldo toma su agua.'
  return `${con}, al agua le sobra espacio.${si}`
}

/** «LA TUBERÍA DEL AGUA» (U2 §5 y §9.6): ¿cuánta agua entra, cuánta se puede
 *  sacar, cuánto aguanta el tanque y qué pasa si para una bomba? Cinco tramos
 *  de izquierda a derecha (agua de los pozos → tratamiento → tanque → bombas de
 *  reinyección → inyectores), el colchón en tres frases sin teoría y, con la
 *  bomba de la línea, lo que pasa hoy, el orden de cierre y por qué es crítica.
 *  Lo que el demo no tiene va «sin dato», en gris discontinuo. Todo llega hecho
 *  del motor (`useTuberiaAgua`, la predicción y la historia de la bomba). */
export function TuberiaDelAgua({ campoId, desde, hasta, periodo }: { campoId: string; desde: Date; hasta: Date; periodo: string }) {
  const a = useTuberiaAgua(campoId)
  const { caudales, niveles } = useCampoAhora(campoId)
  const estado = useEstadoCampos([campoId])[0]
  const hoy = useEquiposDeHoy([campoId])
  const nombre = campoPorId(campoId).nombre
  const marca = (equipo: string): Severidad => hoy(equipo, campoId)?.severidad ?? 0
  const linea = a.sinUna ? pedirPerfilesBomba(campoId).find(p => p.equipo === a.sinUna!.bomba) : undefined
  const corte = caudales.agua + caudales.crudo > 0 ? (caudales.agua / (caudales.agua + caudales.crudo)) * 100 : 0
  const [cuenta, setCuenta] = useState(false)
  const idCuenta = useId()

  return (
    <Panel className="mb-3 sm:mb-4 print:break-inside-avoid" titulo="La tubería del agua"
      extra={<span className="inline-flex items-center gap-1 print:[&_.solo-impresion]:hidden!">hoy, {fechaHora(AHORA)}<Info titulo="La tubería del agua" texto={AYUDA_TUBERIA} /></span>}>
      <div data-tuberia-agua={campoId}>
        <small className="mb-1.5 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta3)]">
          <span className="solo-impresion">{nombre} · {periodo} · </span>
          agua de las pruebas vigentes<Info titulo="Las capacidades" texto={`Cada capacidad dice de dónde sale: firmada o sin firmar. ${TEXTO.sinFirmar}`} />
        </small>
        <Lectura>
          De izquierda a derecha, el camino del agua. Cada tramo dice cuánta agua deja pasar por día y,
          debajo, cuánto crudo es eso. Si la salida no alcanza para el agua que entra, el tramo más
          angosto dice «limita»; si alcanza, cada tramo dice cuánta agua más cabe. El tanque no deja
          pasar: guarda, y su nivel dice cuánto aguanta si para una bomba. Gris es normal; el color solo
          sale en una bomba con alarma. Lo discontinuo falta: no está en el esquema o no tiene instrumento.
        </Lectura>

        <div role="group" aria-label={resumenAgua(a, nombre, caudales.agua)} data-dibujo="agua"
          className="grid gap-x-5 gap-y-2 md:[grid-template-columns:minmax(0,1fr)_minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] print:[grid-template-columns:minmax(0,1fr)_minmax(0,.8fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] print:[&_.solo-impresion]:hidden!">
          {a.tramos.map((x, i) => (
            <Tramo key={x.tramo} x={x} primero={i === 0} angosto={a.limita && a.angosto === x.tramo}>
              {x.tramo === 'producida' && (
                <small className="block text-[13px] leading-snug text-[var(--tinta2)]">
                  con todos los pozos produciendo
                  <span className="block">hoy <b className="tabular font-semibold text-[var(--tinta)]">{n0(caudales.agua)}</b>{estado && estado.parados > 0 ? ` · ${plural(estado.parados, 'pozo parado', 'pozos parados')}` : ''}</span>
                  <span className="block">corte de agua hoy <span className="tabular">{n1(corte)} %</span></span>
                </small>
              )}
              {x.tramo === 'tanques' && <Tanques x={x} niveles={niveles} />}
              {x.tramo === 'bombas' && <Bombas x={x} marca={marca} />}
            </Tramo>
          ))}
        </div>

        {/* P-agua-1: una frase arriba (X4 §6.1); las frases del motor con sus cuentas (U2 §5.3), detrás de «Ver la cuenta» y en el papel. */}
        <div className="mt-3 border-t border-[var(--linea2)] pt-2">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-medium leading-snug" data-frase-agua="">
            <span>{fraseCortaAgua(a)}</span>
            <button type="button" aria-expanded={cuenta} aria-controls={idCuenta} onClick={() => setCuenta(v => !v)}
              className="no-imprimir cursor-pointer text-[14px] font-semibold text-[var(--tinta)] underline decoration-dotted underline-offset-2 hover:decoration-solid">
              {cuenta ? 'Ocultar la cuenta' : 'Ver la cuenta'}
            </button>
          </p>
          <ul id={idCuenta} className={cn('mt-1 list-disc space-y-0.5 pl-5 text-[14px] leading-snug text-[var(--tinta2)]', !cuenta && 'hidden print:block')} data-frases-agua>
            {a.frases.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>

        {linea && a.sinUna && <LoDeLaBomba perfil={linea} a={a} marca={marca} desde={desde} hasta={hasta} periodo={periodo} />}
        {/* En el papel no hay globos: lo que dicen los ⓘ del dibujo va una vez, al final. */}
        <dl className="solo-impresion mt-2 text-[9pt] text-[var(--tinta2)]">
          <div><dt className="inline font-semibold">La tubería del agua: </dt><dd className="inline">{AYUDA_TUBERIA}</dd></div>
          {a.tramos.filter(x => x.sinDato).map(x => <div key={x.tramo}><dt className="inline font-semibold">{NOMBRE_TRAMO_AGUA[x.tramo]}: </dt><dd className="inline">{x.sinDato}</dd></div>)}
          {a.limita && <div><dt className="inline font-semibold">Limita: </dt><dd className="inline">{TEXTO.limita}</dd></div>}
        </dl>
      </div>
    </Panel>
  )
}

/** Lo que el lector oye del dibujo, en una frase. */
function resumenAgua(a: TuberiaAgua, nombre: string, entraHoy: number): string {
  const de = (k: TramoTuberiaAgua['tramo']) => a.tramos.find(x => x.tramo === k)
  const tk = de('tanques')?.tanques?.[0]
  const bombas = de('bombas')
  return [
    `Tubería del agua de ${nombre}.`,
    `Entran ${n0(a.aguaBpd)} barriles de agua por día con todos los pozos produciendo; hoy, ${n0(entraHoy)}.`,
    ...a.tramos.filter(x => x.tramo !== 'producida' && x.tramo !== 'tanques').map(x => `${NOMBRE_TRAMO_AGUA[x.tramo]}: ${x.potencialBpd === null ? 'sin dato' : `${n0(x.potencialBpd)}`}${a.limita && a.angosto === x.tramo ? ', limita' : x.casiIgual ? ', casi igual a otro tramo' : ''}.`),
    tk ? `${tk.nombre}: ${tk.nivelPct === undefined ? 'sin nivel' : `al ${n1(tk.nivelPct)} %`}, alto-alto ${n0(tk.altoAlto * 100)} %.` : '',
    bombas?.disponibleHoy ? `${mayuscula(bombas.disponibleHoy.texto)}.` : '',
  ].filter(Boolean).join(' ')
}

/** Un tramo del agua: su rótulo, su número (o «sin dato», discontinuo), lo que es en crudo y cuánta agua más cabe.
 *  «◄ limita» solo si la salida no alcanza para lo que entra (`TuberiaAgua.limita`, B-18); dos tramos
 *  casi iguales llevan el contorno doble discontinuo (U2 §2.3, B-16). */
function Tramo({ x, primero, angosto, children }: { x: TramoTuberiaAgua; primero: boolean; angosto: boolean; children?: React.ReactNode }) {
  const conNumero = x.potencialBpd !== null
  // Cada tramo dice de dónde sale su número (el motor: `estado` y `fuente`); un número sin firmar lleva la advertencia en él mismo.
  const sinFirmar = sinFirma(x.estado)
  const esTanque = x.tramo === 'tanques'
  // Lo que falta (sin capacidad, o el tanque sin firmar) va en gris discontinuo.
  const sinDato = esTanque ? !x.tanques?.length : !conNumero
  return (
    // La flecha va fuera de la tarjeta del tramo: entre un tramo y el siguiente.
    <div className="relative min-w-0">
    {!primero && <span aria-hidden className="absolute -left-[15px] top-1/2 hidden -translate-y-1/2 text-[14px] text-[var(--tinta3)] md:block print:block">→</span>}
    <section aria-label={NOMBRE_TRAMO_AGUA[x.tramo]} data-tramo-agua={x.tramo} data-limita={angosto ? '' : undefined}
      data-casi-igual={x.casiIgual ? '' : undefined}
      className={cn('h-full min-w-0 rounded-[14px] px-3 py-2.5',
        sinDato ? 'border border-dashed border-[var(--tinta3)]'
          : angosto ? 'border-[4px] border-double border-[var(--tinta)] bg-[var(--panel2)]'
            : x.casiIgual ? 'border-[3px] border-dashed border-[var(--tinta)] bg-[var(--panel2)]'
              : 'border border-[var(--linea)] bg-[var(--panel2)]')}>
      <h3 className="text-[15px] font-semibold text-[var(--tinta)]">{NOMBRE_TRAMO_AGUA[x.tramo]}</h3>
      {!esTanque && (
        conNumero ? (
          <>
            <b className={cn('tabular block text-[16px] leading-tight', sinFirmar && 'underline decoration-dashed decoration-[var(--tinta3)] underline-offset-[3px]')}>
              {n0(x.potencialBpd!)}<small className="ml-0.5 text-[13px] font-normal text-[var(--tinta3)]">bbl/d</small>
            </b>
            {x.crudoBpd !== null && <small className="block text-[13px] text-[var(--tinta3)]">≈ <span className="tabular">{n0(x.crudoBpd)}</span> de crudo</small>}
            {/* En el agua se mide contra lo que entra: «cabe más», no «le sobran», que en la tubería del campo es contra lo que limita (B-16). */}
            {x.holguraBpd !== null && <small className="block text-[13px] text-[var(--tinta2)]">{x.holguraBpd >= 0 ? <>cabe más: <span className="tabular">{n0(x.holguraBpd)}</span></> : <>le faltan <span className="tabular">{n0(-x.holguraBpd)}</span></>}</small>}
            {/* P-agua-2: «sin firmar» una vez por caja; de dónde sale, en su ⓘ. */}
            <small className="flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta3)]" data-estado={x.estado}>
              {sinFirmar ? '┄ ' : ''}{ESTADO_TRAMO[x.estado]}<Info titulo={NOMBRE_TRAMO_AGUA[x.tramo]} texto={sinFirmar ? `${x.fuente}. ${TEXTO.sinFirmar}` : x.fuente} />
            </small>
          </>
        ) : (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta3)]">
            sin dato<Info titulo={NOMBRE_TRAMO_AGUA[x.tramo]} texto={x.sinDato ?? 'El demo no trae esta capacidad.'} />
          </span>
        )
      )}
      {(angosto || x.casiIgual) && (
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] font-semibold" data-limita-marca={angosto ? '' : undefined}>
          {angosto && <span className="font-semibold">◄ limita</span>}
          {x.casiIgual && <span className="font-normal text-[var(--tinta2)]" data-casi-igual>casi iguales</span>}
          {angosto && <Info titulo="Lo que limita el agua" texto={TEXTO.limita} />}
        </span>
      )}
      {children}
      {x.disponibleHoy && (
        <small className="mt-1 flex items-center gap-1 text-[13px] text-[var(--tinta2)]" data-hoy>
          <i aria-hidden className="inline-block h-0 w-3 shrink-0 border-t border-dotted border-[var(--tinta2)]" />{x.disponibleHoy.texto}
        </small>
      )}
    </section>
    </div>
  )
}

/** El tanque como recipiente: su nivel, la raya del alto-alto y su colchón. Un
 *  tanque firmado sin lectura es un dato que no se puede creer: morado y «---». */
function Tanques({ x, niveles }: { x: TramoTuberiaAgua; niveles: Record<string, { tag: string; pct: number; hora?: string }> }) {
  if (!x.tanques?.length) return <span className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[13px] text-[var(--tinta3)]">sin tanque firmado<Info titulo="Tanque de agua" texto={x.sinDato ?? 'El campo no tiene tanque de agua firmado en la configuración.'} /></span>
  return (
    <>
      {x.tanques.map(t => {
        const nivel = Object.hasOwn(niveles, t.id) ? niveles[t.id] : undefined
        const pct = nivel?.pct ?? t.nivelPct
        const alto = t.altoAlto * 100
        return (
          <div key={t.id} className="mt-0.5" data-tanque={t.id}>
            <small className="block text-[13px] text-[var(--tinta2)]">{t.id} · <span className="tabular">{n0(t.capacidadBbl)}</span> bbl</small>
            <div className="mt-1 flex items-end gap-2">
              <span aria-hidden className="relative block h-[72px] w-14 shrink-0 overflow-hidden rounded-b-[6px] rounded-t-[2px] border-2 border-[var(--tinta3)] bg-[var(--panel)]">
                {pct !== undefined && <i className="absolute inset-x-0 bottom-0 block bg-[var(--dato-3)]" style={{ height: `${Math.min(100, pct)}%` }} />}
                <i className="absolute inset-x-0 block border-t-2 border-dashed border-[var(--tinta)]" style={{ bottom: `${alto}%` }} />
              </span>
              <span className="min-w-0 text-[13px] leading-snug">
                {pct === undefined
                  ? <span className="flex items-center gap-1 text-[var(--tinta2)]"><DatoInvalido etiqueta="Sin comunicación con el nivel" />Sin comunicación · ---</span>
                  : <b className="tabular block text-[15px] leading-tight">{n1(pct)} %</b>}
                <span className="block text-[var(--tinta2)]">alto-alto <span className="tabular">{n0(alto)} %</span></span>
                {nivel && <span className="block text-[var(--tinta3)]">{nivel.tag}{nivel.hora ? ` · ${HORA.format(new Date(nivel.hora))}` : ''}</span>}
              </span>
            </div>
            {t.colchon ? (
              <small className="mt-1 block text-[13px] leading-snug text-[var(--tinta2)]">
                {t.colchon.cuando === 'al-parar'
                  ? <>al parar {t.colchon.bomba} estaba al <span className="tabular">{n1(t.colchon.nivelPct)} %</span>: aguantaba <b className="tabular font-semibold text-[var(--tinta)]">{fmtHoras(t.colchon.horas, true)}</b></>
                  : <>si para {t.colchon.bomba} ahora, aguanta <b className="tabular font-semibold text-[var(--tinta)]">{fmtHoras(t.colchon.horas, true)}</b></>}
                <span className="text-[var(--tinta3)]"> ({fmtHoras(t.colchon.rango[0], true)} a {fmtHoras(t.colchon.rango[1], true)})</span>
              </small>
            ) : t.sinColchon && <small className="mt-1 block text-[13px] leading-snug text-[var(--tinta2)]">{t.sinColchon}</small>}
          </div>
        )
      })}
    </>
  )
}

/** Las bombas en paralelo: la parada lleva su marca de alarma; la que no tiene instrumento, gris discontinuo. */
function Bombas({ x, marca }: { x: TramoTuberiaAgua; marca: (equipo: string) => Severidad }) {
  const bs = x.bombas ?? []
  if (!bs.length) return null
  const enServicio = bs.filter(b => !b.reserva)
  const placa = new Set(enServicio.map(b => b.placaBpd)), cap = new Set(enServicio.map(b => b.capacidadBpd))
  return (
    <>
      <ul className="mt-1 space-y-0.5 text-[13px]" aria-label="Las bombas del tren">
        {bs.map(b => <Bomba key={b.id} b={b} s={marca(b.id)} />)}
      </ul>
      {enServicio.length > 1 && placa.size === 1 && cap.size === 1 && (
        <small className="mt-1 block text-[13px] leading-snug text-[var(--tinta3)]">
          {n0(enServicio.length)} × {n0(enServicio[0]!.placaBpd)} de placa{enServicio[0]!.capacidadBpd !== enServicio[0]!.placaBpd ? ` · el cabezal las deja en ${n0(enServicio[0]!.capacidadBpd)}` : ''}
        </small>
      )}
    </>
  )
}

/** Parada sin alarma (U1 §9.3): el relleno oscuro de lo detenido, sin color de prioridad. */
const Parada = () => <i aria-hidden className="inline-block size-2.5 rounded-[2px] bg-[var(--eq-off)] ring-1 ring-[var(--tinta3)]" />

function Bomba({ b, s }: { b: BombaDelTren; s: Severidad }) {
  return (
    <li className="flex flex-wrap items-center gap-x-1.5" data-bomba={b.id} data-marcha={b.marcha}>
      {b.marcha === 'parada' ? (s > 0 ? <MarcaPrioridad s={s} tamano={12} /> : <Parada />)
        // Sin instrumento es un dato que falta: el hueco discontinuo de «falta», no el círculo de «sin comunicación» (B-44).
        : b.marcha === 'sin-lectura' ? <i aria-hidden className="inline-block h-2.5 w-3.5 rounded-[1px] border border-dashed border-[var(--tinta3)]" />
          : <MarcaPrioridad s={s} tamano={12} />}
      <b className="text-[13px]">{b.id}</b>
      {b.marcha === 'parada'
        ? <b className="text-[13px]">parada</b>
        : <span className="tabular text-[var(--tinta2)]">{n0(b.capacidadBpd)}</span>}
      {b.marcha === 'sin-lectura' && <span className="text-[13px] text-[var(--tinta3)]">┄ sin instrumento</span>}
      {b.reserva && <span className="text-[13px] text-[var(--tinta3)]">· de reserva</span>}
      {b.papel === 'recobro' && <span className="text-[13px] text-[var(--tinta3)]">· recobro</span>}
    </li>
  )
}

/* ───────────── con la bomba de la línea: hoy, lo que pasó, el orden y por qué es crítica ───────────── */

function LoDeLaBomba({ perfil, a, marca, desde, hasta, periodo }: {
  perfil: PerfilBomba; a: TuberiaAgua; marca: (equipo: string) => Severidad; desde: Date; hasta: Date; periodo: string
}) {
  const pr = usePrediccion(perfil)
  const paradas = useParadas(perfil.campoId, perfil.equipo)
  const historia = useHistoriaEquipo(perfil.campoId, perfil.equipo)?.bomba
  const bblDe = useBarrilesDeEquipos({ campos: [perfil.campoId], desde, hasta })
  const rol = useRol()
  const abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla)
  const sinUna = a.sinUna!
  const bombas = a.tramos.find(x => x.tramo === 'bombas')
  const tk = a.tramos.find(x => x.tramo === 'tanques')?.tanques?.find(t => t.colchon?.bomba === perfil.equipo)
  const abierta = paradas.find(m => m.abierto)
  const hermanas = (bombas?.bombas ?? []).filter(b => b.id !== perfil.equipo && !b.reserva).map(b => b.id)
  const enServicio = (bombas?.bombas ?? []).filter(b => !b.reserva)
  const reserva = (bombas?.bombas ?? []).some(b => b.reserva)
  const rotulo = 'w-full shrink-0 text-[15px] font-semibold text-[var(--tinta)] sm:w-[150px]'
  const fila = 'flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t border-[var(--linea2)] py-1.5 text-[14px] leading-snug'
  const s = marca(perfil.equipo)
  const llenado = pr?.llenado
  const disposicion = sinUna.papel === 'disposicion' && sinUna.aguaSinSalidaBpd > 0
  const orden = disposicion ? pr?.orden : undefined
  const partes = historia?.porParte.filter(p => p.fallas > 0) ?? []

  return (
    <div className="mt-2" data-bomba-linea={perfil.equipo}>
      {sinUna.parada && (
        <div className={fila} data-hoy-agua>
          <span className={rotulo}>Hoy</span>
          <span className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 font-semibold">{s > 0 ? <MarcaPrioridad s={s} tamano={12} /> : <Parada />}{perfil.equipo} parada</span>
            {llenado && bombas?.disponibleHoy && <>: {hermanas.length ? `${lista(hermanas)} toman` : 'quedan'} lo que entra (<span className="tabular">{n0(llenado.aguaEntraBpd)}</span> de <span className="tabular">{n0(bombas.disponibleHoy.valor)}</span> bbl/d de agua).</>}
            {llenado && (Number.isFinite(llenado.colchon.horas)
              ? <> El tanque llega al alto-alto en {fmtHoras(llenado.colchon.horas, true)}.</>
              : <> El nivel no sube.</>)}
            {sinUna.perdiendoBpd !== undefined && <> Por {perfil.equipo} se dejan de producir ahora <b className="tabular">{n0(sinUna.perdiendoBpd)}</b> bbl/d de crudo.</>}
          </span>
        </div>
      )}

      {abierta && abierta.colchon && (
        <div className={fila} data-lo-que-paso>
          <span className={rotulo}>Lo que pasó</span>
          <ol className="min-w-0 flex-1 space-y-0.5">
            <li><span className="tabular">{fechaHora(abierta.inicio)}</span> · {perfil.equipo} paró con el tanque al <span className="tabular">{n1(abierta.colchon.previsto.nivel.pct)} %</span>: TRIM previó <span className="tabular">{fmtHoras(abierta.colchon.previsto.horas, true)}</span> de colchón</li>
            {abierta.colchon.observadoH !== undefined && (
              <li>el tanque se llenó en <span className="tabular">{fmtHoras(abierta.colchon.observadoH, true)}</span>{pr?.perdiendo?.pozos.length ? <> · cerraron {lista(pr.perdiendo.pozos.map(w => w.id))} · <span className="tabular">{n0(pr.perdiendo.bblDia)}</span> bbl/d</> : ''}</li>
            )}
            <li>«evitable cerrando en orden»: <span className="tabular">{n0(abierta.evitable)}</span> bbl hasta ahora · diferido de {perfil.equipo} en {periodo.toLowerCase()}: <span className="tabular">{n0(bblDe(perfil.equipo, perfil.campoId))}</span> bbl</li>
          </ol>
        </div>
      )}

      {/* Con una bomba ya parada, el orden que importa es el de la que sigue en riesgo: si para OTRA (B-01). */}
      {a.siParaOtra && a.siParaOtra.pasos.length > 0 && (
        <div className={fila} data-orden data-orden-si-para-otra>
          <span className={rotulo}>Si para otra bomba</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-1">
              con {lista(a.siParaOtra.enMarcha)} solas, cerrar primero los más acuatosos para quitar <b className="tabular">{n0(a.siParaOtra.aguaSinSalidaBpd)}</b> bbl/d de agua:<Info titulo="Los más acuatosos" texto={AYUDA_ACUATOSOS} />
            </span>
            <span className="block">
              {a.siParaOtra.pasos.map((p, i) => (
                <span key={p.pozo}>{i > 0 ? ' · ' : ''}<b>{p.pozo}</b>{p.fraccion >= 0.999
                  ? <> (<span className="tabular">{n0(p.crudoPorAgua * 1000)}</span>{i === 0 ? ' de crudo por cada 1.000 de agua' : ''})</>
                  : <> al <span className="tabular">{n0(p.fraccion * 100)} %</span></>}</span>
              ))}
            </span>
            <span className="block text-[var(--tinta2)]">→ se dejan de producir <b className="tabular text-[var(--tinta)]">{n0(a.siParaOtra.crudoBpd)}</b> bbl/d de crudo; parejo, <span className="tabular">{n0(a.siParaOtra.crudoParejoBpd)}</span>{a.siParaOtra.colchonH !== undefined ? <> · después de {textoColchon(a.siParaOtra.colchonH)} de colchón</> : ''}</span>
          </span>
        </div>
      )}

      {!a.siParaOtra && orden && orden.pasos.length > 0 && (
        <div className={fila} data-orden>
          <span className={rotulo}>Si para una bomba</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-1">
              cerrar primero los más acuatosos para quitar <b className="tabular">{n0(orden.aguaAQuitarBpd)}</b> bbl/d de agua:<Info titulo="Los más acuatosos" texto={AYUDA_ACUATOSOS} />
            </span>
            <span className="block">
              {orden.pasos.map((p, i) => (
                <span key={p.pozo.id}>{i > 0 ? ' · ' : ''}<b>{p.pozo.id}</b>{p.fraccion >= 0.999
                  ? <> (<span className="tabular">{n0(p.crudoPorAgua * 1000)}</span>{i === 0 ? ' de crudo por cada 1.000 de agua' : ''})</>
                  : <> al <span className="tabular">{n0(p.fraccion * 100)} %</span></>}</span>
              ))}
            </span>
            <span className="block text-[var(--tinta2)]">→ se dejan de producir <b className="tabular text-[var(--tinta)]">{n0(orden.crudoBpd)}</b> bbl/d de crudo; parejo, <span className="tabular">{n0(orden.crudoParejoBpd)}</span></span>
          </span>
        </div>
      )}

      {/* P-agua-1: «Por qué es crítica» en tres líneas cortas; lo demás, en la ⓘ de cada una. H32: viñetas, no números (los números son de las prioridades). */}
      {disposicion && historia && (
        <div className={fila} data-por-que>
          <span className={rotulo}>Por qué es crítica</span>
          <ul className="min-w-0 flex-1 list-disc space-y-0.5 pl-4">
            <li>
              <span className="inline-flex flex-wrap items-center gap-x-1">
                <b>{reserva ? 'Tiene bomba de reserva.' : 'No hay bomba de sobra.'}</b>
                <Info titulo="Las bombas" texto={`${mayuscula(`con ${enServicio.length === 1 ? 'su bomba' : `las ${cuantas(enServicio.length)}`}`)} cabe más agua: ${n0(a.sobraBpd)} bbl/d; si para una, faltan ${n0(sinUna.aguaSinSalidaBpd)}.`} />
              </span>
            </li>
            {tk?.colchon && historia.mdtH !== undefined && (
              <li>
                <span className="inline-flex flex-wrap items-center gap-x-1">
                  <b>{tk.colchon.horas < historia.mdtH ? 'El tanque aguanta horas; la reparación, días.' : 'El tanque aguanta más que una reparación.'}</b>
                  <Info titulo="El tanque y la reparación" texto={`El tanque ${tk.colchon.cuando === 'al-parar' ? 'aguantó' : 'aguanta'} ${fmtHoras(tk.colchon.horas, true)} y una falla de ${perfil.equipo} dura en promedio ${fmtHoras(historia.mdtH, true)} fuera de servicio.`} />
                </span>
              </li>
            )}
            {historia.fallas > 0 && (
              <li>
                <span className="inline-flex flex-wrap items-center gap-x-1">
                  <b>{historia.fallas > 1 && historia.mtbfDias !== undefined ? `Para seguido: una falla cada ${n0(historia.mtbfDias)} días.` : `Lleva ${plural(historia.fallas, 'falla', 'fallas')} en ${n0(historia.dias)} días.`}</b>
                  <Info titulo={`Las fallas de ${perfil.equipo}`} texto={`Lleva ${plural(historia.fallas, 'falla', 'fallas')} en ${n0(historia.dias)} días${historia.mtbfDias !== undefined ? `, una cada ${n0(historia.mtbfDias)} días` : ''}, y ${n0(historia.bbl)} bbl.${partes.length > 0 ? ` Las partes: ${lista(partes.slice(0, 3).map((p, i) => `${NOMBRE_PARTE[p.parte].toLowerCase()} ${i === 0 ? plural(p.fallas, 'vez', 'veces') : n0(p.fallas)}`))}.` : ''}`} />
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <Boton onClick={() => abrirEquipo(perfil.equipo, false)}>Abrir {perfil.equipo}</Boton>
        {/* B3 · A-15: Bombas es un filtro de Equipos; el orden de cierre va en la ficha de la bomba. */}
        {rol.pantallas.includes('equipos') && <Boton onClick={() => setPantalla('equipos')}>Ver los equipos</Boton>}
      </div>
    </div>
  )
}
