import { useState } from 'react'
import type { ChokeAnh } from '@/entities/choke'
import { useApp, useAmbito, useRango, useRol } from '@/app/store'
import { PERIODOS } from '@/entities/campos'
import { usePlantaViva, conLenteTecnica, type Momento, type VistaPlantaViva, type CifraMomento } from '@/shared/api/plantaViva'
import { useTelefono } from '@/shared/ui/telefono'
import { Info } from '@/shared/ui/Info'
import { CifraGrande, Botones } from '@/widgets/plantaviva/Heroe'
import { Momentos } from '@/widgets/plantaviva/Momentos'
import { TuberiaAcostada, TuberiaDePie } from '@/widgets/plantaviva/Tuberia'
import { Campos } from '@/widgets/plantaviva/Campos'
import { Filas } from '@/widgets/plantaviva/Filas'
import { Mover, PorEquipo, MesAMesYBajando } from '@/widgets/plantaviva/Lateral'
import { HojaTramo } from '@/widgets/plantaviva/HojaTramo'
import { useAcciones } from '@/widgets/plantaviva/acciones'
import { Calidad } from '@/widgets/plantaviva/piezas'
import { n0 } from '@/widgets/plantaviva/cifras'
import { Capacidades, SiFallaHoy, TablaTramos } from '@/widgets/plantaviva/Tecnica'

/** LA PLANTA VIVA (X4 §4; X5 §5; imágenes 1, 2 y 6 de experiencia-v2).
 *
 *  El inicio del gerente y de producción: el proceso del campo, vivo, en la
 *  tarjeta principal de B. Arriba, la cifra con su frase; debajo, «Dónde se
 *  trabó» con Antes · Durante · Después y la tubería de C (acostada en el
 *  escritorio, de pie en el teléfono). Con todos los campos, una fila por campo
 *  con su tubería en chico. A la derecha, los gráficos de A en el estilo de B.
 *  Abre en Durante: lo que pasa ahora, como el saldo en Nubank (X4 §4.4).
 *
 *  El motor calcula y la pantalla pinta: todo sale de `usePlantaViva`
 *  (`GET /api/vistas/planta-viva`). Un tramo (Tab y Enter, o un toque) abre su
 *  hoja; un equipo, su ficha ejecutiva. */
export function PlantaViva() {
  const ambito = useAmbito(); const rango = useRango(); const telefono = useTelefono(); const rol = useRol()
  // El momento vive en el estado y en la dirección (P-18): «#/ger/planta-viva/ceiba/antes» abre en Antes y atrás vuelve.
  const momento: Momento = useApp(s => s.momento), setMomento = useApp(s => s.setMomento)
  const [abierto, setAbierto] = useState<ChokeAnh | null>(null)
  const campos = ambito.campos.map(c => c.id)
  const v = usePlantaViva({ campos, momento, desde: rango.desde, hasta: rango.hasta })
  // La lente técnica (P-01; X4 §3.4): producción abre en SU respuesta, lo que sale hoy y lo que limita.
  const tecnica = conLenteTecnica(rol.id) ? v.tecnica : null
  const c: CifraMomento = tecnica && momento === 'durante' ? tecnica.cifra : v.cifras[momento]
  const { pedirCausa, ir } = useAcciones()
  const verHoy = tecnica ? ir('hoy') : undefined
  const segundo = verHoy ? { texto: 'Ver Hoy', onClick: verHoy } : undefined
  const p = v.planta
  const tramo = p && abierto ? p.tramos.find(t => t.tramo === abierto) : undefined
  const sinIdentificar = p?.sinIdentificar?.primerEquipo ? pedirCausa({ campoId: p.campoId, equipo: p.sinIdentificar.primerEquipo }) : undefined

  const dibujo = p
    ? p.campoDeGas
      ? <p className="flex min-h-[180px] items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-[var(--tinta3)] px-4 text-center text-[16px] text-[var(--tinta2)]" data-gas="">{p.textoGas}</p>
      : telefono
        // K2: con la lente técnica la cifra grande ya es lo que sale hoy; el dibujo no la repite.
        ? <TuberiaDePie planta={p} momento={momento} onTramo={setAbierto} onSinIdentificar={sinIdentificar}
          ventaEnLaCifra={!!tecnica && momento === 'durante' && Math.round(p.venta.valor) === c.entero} />
        : <TuberiaAcostada planta={p} momento={momento} onTramo={setAbierto} onSinIdentificar={sinIdentificar} />
    : <Campos v={v} momento={momento} />

  return (
    <div data-planta-viva={v.alcance} data-momento={momento} data-valor={c.valor} data-entero={c.entero} data-lente={tecnica ? 'tecnica' : 'gerente'} className="mx-auto max-w-[1600px]">
      {telefono
        ? <Telefono v={v} c={c} momento={momento} setMomento={setMomento} dibujo={dibujo} tecnica={!!tecnica} segundo={segundo} />
        : (
          // Desde 1400 px, la columna de la derecha (352 px): la vista cabe en 1440 × 900 (H14; X2 N1). A 1280 no:
          // la tubería se encogería a 0,82 y sus rótulos bajarían de 12 px (§8.4), que manda sobre el alto.
          <div className="flex flex-col gap-4 min-[1400px]:grid min-[1400px]:grid-cols-[minmax(0,1fr)_352px] min-[1400px]:gap-5">
            <div className="flex min-w-0 flex-col gap-4">
              <section aria-label={v.alcance === 'campo' ? `La planta viva de ${p?.nombre}` : 'La planta viva de sus campos'}
                className="min-w-0 rounded-[20px] bg-[var(--panel)] px-5 pb-[18px] pt-6 sm:px-7">
                <CifraGrande c={c} telefono={false} periodo={<PeriodoDespues actual={v.periodo} />} />
                <Botones c={c} className="mt-3.5" segundo={segundo} />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--linea2)] pt-3.5">
                  {/* La pérdida va aparte y nunca se suma: en la ⓘ del título, no en un renglón (H14; X5 §5.10). */}
                  <h2 className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-[var(--tinta)]" data-perdida={v.perdida}>
                    Dónde se trabó<Info titulo={v.perdida} texto={v.perdidaExplica} />
                  </h2>
                  <Momentos valor={momento} onCambio={setMomento} />
                </div>
                <div className="mt-3">{dibujo}</div>
                {tecnica && <Capacidades t={tecnica} planta={p} />}
                {p && !p.campoDeGas && <TablaTramos planta={p} momento={momento} />}
                {!p && <LineaMover v={v} momento={momento} />}
              </section>
              <Filas v={v} momento={momento} />
            </div>
            <div className="grid min-w-0 gap-4 md:grid-cols-2 min-[1400px]:flex min-[1400px]:flex-col">
              {tecnica && <SiFallaHoy t={tecnica} />}
              <Mover v={v} momento={momento} />
              <PorEquipo v={v} />
              <MesAMesYBajando v={v} className="md:col-span-2 min-[1400px]:flex-1" />
            </div>
          </div>
        )}
      {p && tramo && <HojaTramo planta={p} tramo={tramo} momento={momento} periodo={v.periodo} telefono={telefono} onCerrar={() => setAbierto(null)} />}
    </div>
  )
}

/** En el teléfono (X4 §4.7, imagen 2): una columna; la tubería de pie dentro
 *  de la tarjeta de la cifra; «Todos mis campos» con una fila por campo. */
function Telefono({ v, c, momento, setMomento, dibujo, tecnica, segundo }: {
  v: VistaPlantaViva; c: CifraMomento; momento: Momento; setMomento: (m: Momento) => void; dibujo: React.ReactNode
  tecnica: boolean; segundo?: { texto: string; onClick: () => void }
}) {
  const p = v.planta
  return (
    <div className="flex flex-col gap-3">
      {p ? (
        <>
          <section aria-label={`La planta viva de ${p.nombre}`} className="min-w-0 rounded-[18px] bg-[var(--panel)] px-[18px] pb-3.5 pt-4">
            <CifraGrande c={c} telefono conExplica={false} periodo={<PeriodoDespues actual={v.periodo} />} />
            <Momentos valor={momento} onCambio={setMomento} corto className="mt-3.5" />
            <div className="mt-3.5">{dibujo}</div>
          </section>
          <section aria-label="Qué pasa" className="min-w-0 rounded-[18px] bg-[var(--panel)] px-[18px] py-4">
            <p className="text-[16px] leading-[1.5] text-[var(--tinta2)]" data-explica="">{c.explica}</p>
            <Botones c={c} className="mt-3" segundo={segundo} />
          </section>
          {tecnica && v.tecnica && <SiFallaHoy t={v.tecnica} className="rounded-[18px] px-[18px]" />}
        </>
      ) : (
        <>
          <section aria-label="La planta viva de sus campos" className="min-w-0 rounded-[18px] bg-[var(--panel)] px-[18px] py-4">
            <CifraGrande c={c} telefono periodo={<PeriodoDespues actual={v.periodo} />} />
          </section>
          <Momentos valor={momento} onCambio={setMomento} corto />
          <section aria-label="Sus campos" className="min-w-0 rounded-[18px] bg-[var(--panel)] px-4 py-1">{dibujo}</section>
          <LineaMover v={v} momento={momento} telefono />
        </>
      )}
      <Filas v={v} momento={momento} />
      {p && <Mover v={v} momento={momento} />}
      <PorEquipo v={v} />
      <MesAMesYBajando v={v} />
      <p className="flex flex-wrap items-center gap-1.5 px-1 text-[13px] text-[var(--tinta2)]" data-perdida={v.perdida}>{v.perdida}<Info titulo="Pérdida" texto={v.perdidaExplica} /></p>
    </div>
  )
}

/** «Lo que todavía se puede mover ahora: ≈ 2.102 bbl · simulado · Ver el plan ›» (X4 §4.6 a): en todos los campos. */
function LineaMover({ v, momento, telefono }: { v: VistaPlantaViva; momento: Momento; telefono?: boolean }) {
  const { abrir } = useAcciones()
  const s = v.cifras[momento].simulado
  return (
    <p className={telefono ? 'rounded-[14px] border-[1.5px] border-dashed border-[var(--tinta3)] px-3.5 py-2.5 text-[14px] leading-[1.5] text-[var(--tinta2)]' : 'mt-3 text-[15px] leading-[1.5] text-[var(--tinta2)]'}
      data-linea-simulada="">
      Lo que todavía se puede mover {momento === 'durante' ? 'ahora' : momento === 'antes' ? 'antes de que falle' : 'para que no se repita'}: <b className="text-[var(--tinta)]">≈ {n0(s.bbl)} bbl</b>{' '}
      <Calidad>simulado</Calidad>
      {s.plan && <> · <button type="button" onClick={() => abrir(s.plan)} className="cursor-pointer font-semibold text-[var(--tinta)] hover:underline">Ver el plan ›</button></>}
    </p>
  )
}

/** El período de «Después» va en su propia ficha («octubre ▾», X4 §3.1 regla 8):
 *  La planta viva es «ahora» y no lleva el selector de la cabecera. */
function PeriodoDespues({ actual }: { actual: string }) {
  const periodoId = useApp(s => s.periodoId), setPeriodo = useApp(s => s.setPeriodo)
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Período de «Después»</span>
      <select value={periodoId === 'medida' ? '' : periodoId} onChange={e => { if (e.target.value) setPeriodo(e.target.value as typeof PERIODOS[number]['id']) }}
        data-periodo-despues=""
        className="min-h-[32px] cursor-pointer appearance-none rounded-full bg-[var(--panel2)] py-1 pl-3 pr-7 text-[15px] font-medium text-[var(--tinta)] shadow-[inset_0_0_0_1px_var(--linea)]">
        {periodoId === 'medida' && <option value="">{actual}</option>}
        {PERIODOS.map(o => <option key={o.id} value={o.id}>{o.id === periodoId ? actual : o.nombre}</option>)}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-[12px] text-[var(--tinta2)]">▾</span>
    </label>
  )
}
