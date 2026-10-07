import { useState } from 'react'
import { useApp, useAmbito, useRango, useNivel } from '@/app/store'
import { fechaHora, AHORA } from '@/entities/reloj'
import { Lectura } from '@/shared/ui/Lectura'
import { MarcaPrioridad } from '@/shared/ui/Prioridad'
import { n0, plural } from '@/shared/lib/formato'
import { useBombas } from '@/shared/api/equipos'
import { Placa } from '@/widgets/bombas/Placa'
import { Detalle } from '@/widgets/bombas/Detalle'
import { fmtBbl, fmtRango, fmtHoras, textoPronostico } from '@/widgets/bombas/comun'

/** La estación de bombas: el nivel 2 de ISA-101. Las bombas multifásicas y
 *  de inyección son las que deciden la producción de la planta; aquí se ve
 *  cuáles están costando crudo ahora, cuánto, y cuál va a ser la próxima. */
export function Bombas() {
  const ambito = useAmbito()
  const rango = useRango(); const nivel = useNivel()
  const setCampo = useApp(s => s.setCampo), abrirEquipo = useApp(s => s.abrirEquipo)
  const [abierta, setAbierta] = useState<string | null>(null)

  const bombas = useBombas(ambito.campos.map(c => c.id), rango.desde, rango.hasta)

  const sel = bombas.find(b => b.clave === abierta)
  if (sel) return <Detalle b={sel} nivel={nivel} nombrePeriodo={rango.nombre} onVolver={() => setAbierta(null)} />
  // El directivo no entra al detalle técnico: abre la ficha del equipo.
  const abrir = (clave: string) => {
    if (nivel !== 'decision') return setAbierta(clave)
    const [c, eq] = clave.split(':')
    setCampo(c!); abrirEquipo(eq!, false)
  }

  // Lo que se está perdiendo AHORA: pozos cerrados por bombas detenidas.
  const costando = bombas.filter(b => b.veredicto?.prediccion.perdiendo?.bblDia)
  const porHora = costando.reduce((a, b) => a + b.veredicto!.prediccion.perdiendo!.bblDia / 24, 0)
  // La marca sale de quién está detenida, como en Riesgo: una de reinyección es
  // de alto impacto (1); la multifásica cierra solo sus pozos y no lo es (2).
  const sevPerdida = !costando.length ? 0 : costando.some(b => b.perfil?.subtipo !== 'multifasica') ? 1 : 2
  // Sumar en línea los rangos es conservador: no supone que los sesgos de
  // campos distintos se compensen.
  const medido = bombas.reduce((a, b) => a + (b.periodo?.bbl ?? 0), 0)
  const medidoRango = bombas.reduce<[number, number]>((a, b) =>
    b.periodo ? [a[0] + b.periodo.rango[0], a[1] + b.periodo.rango[1]] : a, [0, 0])
  // La próxima: de todas las partes de las bombas en marcha, la que antes llega
  // a su límite de falla, con el mismo criterio que el riesgo y el vigía: una
  // parte con su variable ya en alarma también cuenta (a igual tiempo, va primero).
  const proxima = bombas.filter(b => !b.abierta).flatMap(b =>
    b.partes.filter(p => p.primera && (p.estado === 'fuera' || p.estado === 'avisa')).map(p => ({ b, p })))
    .sort((x, y) => x.p.primera!.senal.pronostico.horas - y.p.primera!.senal.pronostico.horas)[0]
  const sinPerfil = bombas.filter(b => !b.perfil).length

  return (
    <>
      <div className="mb-2.5 grid gap-x-6 gap-y-3 rounded border border-[var(--linea)] bg-[var(--panel)] p-4 shadow-[var(--sombra)] [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">Perdiéndose ahora</small>
          <b className={`tabular block text-[30px] leading-none ${porHora > 0 && sevPerdida === 1 ? 'text-[var(--p1)]' : ''}`}>
            {porHora > 0 && sevPerdida > 0 && <MarcaPrioridad s={sevPerdida} tamano={20} className="mr-2 inline-block align-[-1px]" />}{n0(porHora * 24)}<span className="ml-1 text-[12px] font-normal text-[var(--tinta3)]">bbl/d</span>
          </b>
          <small className="block text-[10.5px] text-[var(--tinta2)]">
            {costando.length ? `${plural(costando.length, 'bomba detenida', 'bombas detenidas')} · ${plural(costando.reduce((a, b) => a + b.veredicto!.prediccion.perdiendo!.pozos.length, 0), 'pozo cerrado', 'pozos cerrados')}${nivel === 'operacion' ? ` · ${n0(porHora)} bbl/h` : ''} · ${fechaHora(AHORA)}` : 'ningún pozo cerrado por una bomba'}
          </small>
        </span>
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">Diferido que se les carga · {rango.nombre}</small>
          <b className="tabular block text-[22px] leading-tight">{fmtBbl(medido)}</b>
          <small className="block text-[10.5px] text-[var(--tinta2)]">
            {medido <= 0 ? 'sin paradas en el período' : nivel === 'ingenieria' ? `entre ${fmtRango(medidoRango)}` : 'por paradas de estas bombas'}
          </small>
        </span>
        <span>
          <small className="block text-[10.5px] text-[var(--tinta3)]">La próxima parte en fallar</small>
          {proxima ? (
            <>
              <b className="block truncate text-[14px] leading-tight">{proxima.b.eq.id} · {proxima.p.parte.nombre}</b>
              {nivel === 'decision' ? (
                <small className="block text-[11px] text-[var(--tinta2)]">{proxima.b.campo.nombre} · en {fmtHoras(proxima.p.primera!.senal.pronostico.horas)}</small>
              ) : (
                <>
                  <small className="block truncate text-[11px] text-[var(--tinta)]">{proxima.b.campo.nombre} · {proxima.p.primera!.senal.plantilla.nombre}</small>
                  <small className="block text-[10.5px] text-[var(--tinta2)]">{textoPronostico(proxima.p.primera!.senal.pronostico)}</small>
                </>
              )}
            </>
          ) : <b className="block text-[14px] text-[var(--tinta3)]">ninguna</b>}
        </span>
        <span className="text-right">
          <b className="block text-[16px] leading-none">{ambito.titulo}</b>
          <small className="text-[10.5px] text-[var(--tinta3)]">
            {plural(bombas.length, 'bomba', 'bombas')}{sinPerfil ? ` · ${sinPerfil} sin ${nivel === 'decision' ? 'datos de la bomba' : 'perfil'}` : ''}
          </small>
        </span>
      </div>

      {nivel === 'decision' ? (
        <Lectura>
          Arriba, lo que las bombas detenidas están costando ahora y lo que ya costaron en el período.
          Cada tarjeta dice si la bomba está parada o en marcha, cuánto le ha costado y de qué falla
          más. Un clic abre su ficha.
        </Lectura>
      ) : (
        <Lectura>
        <b>Perdiéndose ahora</b> es el crudo de los pozos que están cerrados porque una bomba de
        la línea está detenida, pozo por pozo con su prueba. <b>Diferido que se les carga</b> es lo
        que ya se perdió en el período por paradas de estas bombas, con su rango de tolerancia.
        Cada placa trae las cuatro variables que más dicen de esa bomba, sus partes (la que avisa
        dice en cuántos días) y qué pasaría si se para ahora: cuánto aguanta el tanque y cuánto
        crudo se pierde después, cerrando los pozos en el orden que menos cuesta.
      </Lectura>
      )}

      <div className="mt-2.5 grid items-stretch gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
        {bombas.map(b => (
          <Placa key={b.clave} b={b} global={ambito.global} nivel={nivel} onAbrir={() => abrir(b.clave)} />
        ))}
      </div>

      {bombas.length === 0 && (
        <p className="mt-3 text-[12px] text-[var(--tinta2)]">
          {ambito.titulo} no tiene bombas multifásicas ni de inyección instrumentadas.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-[var(--tinta3)]" aria-label="Prioridades">
        {([1, 2, 3, 0] as const).map(s => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <MarcaPrioridad s={s} tamano={12} />
            {s === 0 ? 'normal' : s === 1 ? 'alarma' : s === 2 ? 'atención' : 'aviso'}
          </span>
        ))}
      </div>
    </>
  )
}
