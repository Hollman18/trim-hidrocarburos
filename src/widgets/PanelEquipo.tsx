import { useEffect, useState, type ReactNode } from 'react'
import { useApp, useCampo, useRol, useRango, useNivel } from '@/app/store'
import { abreNivel3 } from '@/app/url'
import { FichaEjecutiva } from '@/widgets/equipo/FichaEjecutiva'
import { useBarrilesDeEquipos, usePreguntas } from '@/shared/api/diferidos'
import { useEquipo, useHistoriaEquipo, type HistoriaEquipo } from '@/shared/api/equipos'
import { NOMBRE_PARTE } from '@/entities/partes'
import { COMO } from '@/entities/causa-senal'
import { fechaHora, horasEntre, AHORA } from '@/entities/reloj'
import { DetallePozo } from '@/widgets/pozos/DetallePozo'
import { fmtHoras } from '@/widgets/bombas/comun'
import { CadenaDato } from './CadenaDato'
import { Chip, Boton, Hueco } from '@/shared/ui/primitivas'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { DichoEnPapel } from '@/shared/ui/DichoEnPapel'
import { causaEnPapel } from '@/shared/ui/papel'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { Tendencia } from '@/shared/ui/scada'
import { estadoKit } from '@/widgets/equipos/estadoKit'
import { lecturasDe } from '@/entities/serie'
import { n0, num, plural, sinLectura, NOMBRE_ESTADO } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import { MarcaEstado, MarcaCondicion } from '@/shared/ui/Prioridad'
import { pedirPozosDelCampo } from '@/shared/api/medicion'
import { BloqueSap } from '@/widgets/sap/BloqueSap'
import { ExportarFicha } from '@/widgets/informe/Exportar'
import { Modal } from '@/shared/ui/Modal'
import { useNivelEquipo, type SenalNivel3, type VistaNivel3 } from '@/shared/api/equiposTecnico'
import { useCondiciones } from '@/shared/api/condiciones'
import { CondicionEquipo } from '@/widgets/bombas/SenalFija'
import { puedeHacer, type Dispositivo, type NivelDetalle } from '@/entities/tipos'
import { useTuberiaAgua, useCriticidad } from '@/shared/api/choke'
import { AguaHoy } from '@/widgets/choke/AguaHoy'
import { SiFallaHoyFicha } from '@/widgets/riesgo/SiFallaHoy'


/** La ficha de un equipo flota sobre la pantalla. Siempre está montada (App),
 *  pero el libro del período y el de toda la historia del campo solo se
 *  calculan con una ficha abierta: cerrada, no cuesta nada. */
export function PanelEquipo() {
  const equipoAbierto = useApp(s => s.equipoAbierto)
  const pantalla = useApp(s => s.pantalla)
  const rol = useRol()
  // C4 · A un rol técnico el equipo se le abre en su nivel 3, una vista entera
  // (X4 §5; la imagen 4), no en este panel: el panel queda para la ficha ejecutiva
  // del gerente y para quien no tiene Equipos. Venga de donde venga (la franja, Hoy,
  // una lista, el esquema), se pasa a Equipos con el equipo abierto. Antes se quita
  // el equipo de la dirección de donde se venía: así «atrás» vuelve a esa pantalla
  // y no lo vuelve a abrir.
  const tecnico = !!equipoAbierto && abreNivel3(rol)
  useEffect(() => {
    if (!tecnico || pantalla === 'equipos' || !equipoAbierto) return
    const s = useApp.getState()
    s.abrirEquipo(null)
    if (s.alcance === 'portafolio') s.setAlcance('campo')
    s.setPantalla('equipos')
    useApp.getState().abrirEquipo(equipoAbierto)
  }, [tecnico, pantalla, equipoAbierto])
  // Con `key`: al pasar a otro equipo la ficha arranca de nuevo (sin la cadena del dato del anterior).
  return equipoAbierto && !tecnico ? <PanelAbierto key={equipoAbierto} equipoAbierto={equipoAbierto} /> : null
}

function PanelAbierto({ equipoAbierto }: { equipoAbierto: string }) {
  const equipoExpandido = useApp(s => s.equipoExpandido), abrirEquipo = useApp(s => s.abrirEquipo), campoId = useApp(s => s.campoId), setPantalla = useApp(s => s.setPantalla)
  const campo = useCampo()
  const rol = useRol()
  const rango = useRango()
  const nivel = useNivel()
  const bblDe = useBarrilesDeEquipos({ campos: [campoId], desde: rango.desde, hasta: rango.hasta })
  const [cadenaTag, setCadenaTag] = useState<string | null>(null)
  const preguntas = usePreguntas([campoId])
  const pendiente = preguntas.some(p => p.pide && !p.fin && p.equipo === equipoAbierto)
  const eq = useEquipo(campoId, equipoAbierto)
  // Diálogo modal: el foco entra, lo de atrás queda inerte y al cerrar vuelve
  // a quien lo abrió. Escape primero cierra la cadena del dato y después la
  // ficha; si encima está la introducción, Escape es de ella. Pasar a otro
  // equipo o abrir y cerrar la cadena cambia lo de adentro sin cerrar: el
  // foco no se queda en un botón que ya no está.
  const alEscape = () => { if (cadenaTag) setCadenaTag(null); else abrirEquipo(null) }
  // Con el equipo parado, sus señales van en gris y sin marca propia (X2 B9; UI-07, H4); la marca del equipo, la de la franja (H3).
  const nivelEq = useNivelEquipo(campoId, equipoAbierto)
  const condicion = useCondiciones([campoId])(campoId, equipoAbierto)
  // La historia que dejó el PLC: lo que se le cargó y, en una bomba, sus fallas por parte.
  const historia = useHistoriaEquipo(campoId, eq && eq.clase !== 'pozo' ? eq.id : null)
  // Una bomba de reinyección parada: lo que pasa hoy lo dice el motor (B-17), no la frase fija del registro.
  const agua = useTuberiaAgua(campoId)
  const delTren = agua.tramos.find(x => x.tramo === 'bombas')?.bombas?.find(b => b.id === equipoAbierto)
  const paradaDelTren = delTren?.papel === 'disposicion' && delTren.marcha === 'parada'

  const disp = eq?.dispositivos ?? []
  // En operación solo se muestra lo que está fuera de banda: lo demás no pide nada.
  // Un instrumento sin lectura (`valor: null`) tampoco es normal: es un dato inválido.
  const visibles = nivel === 'operacion' ? disp.filter(d => d.estado !== 'normal' || d.valor === null) : disp
  // Un equipo sin registro propio (P-201A y P-201C, sin instrumento): una ficha mínima con lo que sí se sabe (B-37).
  if (!eq) return delTren ? <FichaMinima campoId={campoId} equipo={equipoAbierto} /> : null
  // «Fuera de banda» cuenta solo lo que el instrumento reporta fuera; un
  // instrumento sin señal es un dato inválido, no un valor fuera, y se cuenta aparte.
  const sinSenalN = visibles.filter(sinLectura).length, fueraN = visibles.length - sinSenalN
  const activo = cadenaTag ? disp.find(d => d.tag === cadenaTag) : undefined

  const fila = (d: Dispositivo) => <FilaDispositivo key={d.tag} d={d} senal={senalDe(nivelEq, d.tag)} nivel={nivel} gris={!!nivelEq?.parado} onCadena={setCadenaTag} />

  return (
    // D1 · El detalle como modal (el dueño, 27-oct): centrado en el escritorio, hoja casi completa en el teléfono.
    <Modal enSitio ancho="amplio" data-panel-equipo="" onCerrar={() => abrirEquipo(null)} alEscape={alEscape} contenido={`${equipoAbierto}|${cadenaTag ?? ''}`}
      ampliado={equipoExpandido} onAmpliar={() => abrirEquipo(eq.id, !equipoExpandido)} sinRelleno={!!activo && nivel !== 'decision' && eq.clase !== 'pozo'}
      antetitulo={<>
        <b className="font-cond text-[15px] font-bold tracking-[.02em] text-[var(--tinta)]">{eq.id}</b>
        {/* La marca del equipo es la de la franja, con su palabra (H3; X2 F1): la misma en todas partes. */}
        <CondicionEquipo c={condicion} />
      </>}
      // Entero, sin cortar: la ficha del gerente ya no lo repite debajo.
      titulo={eq.nombre}
      // La familia, la misma de todas las pantallas («bomba de agua»; P-09).
      subtitulo={`${nivelEq?.familia ?? eq.sistema.toLowerCase()} · ${campo.nombre} · ${eq.estado}`}
      acciones={<span className={ACCION_EXPORTAR}><ExportarFicha /></span>}>
        {nivel === 'decision' ? (
          <div>
            <FichaEjecutiva campoId={campoId} equipo={eq.id} />
            <div className="mt-4 border-t border-[var(--linea2)] pt-3"><BloqueSap campoId={campoId} equipo={eq.id} nivel="decision" /></div>
          </div>
        ) : eq.clase === 'pozo' ? (
          <div>
            <DetallePozo campoId={campoId} pozoId={eq.id} desde={rango.desde} hasta={rango.hasta}
              nombrePeriodo={rango.nombre} volverA="Cerrar" onVolver={() => abrirEquipo(null)} />
            {pedirPozosDelCampo(campoId).some(p => p.id === eq.id && p.levantamiento === 'electrosumergible') && <BloqueSap campoId={campoId} equipo={eq.id} nivel={nivel} />}
          </div>
        ) : activo ? (
          <CadenaDato campoId={campoId} disp={activo} equipoNombre={eq.nombre}
            norma={eq.norma} onVolver={() => setCadenaTag(null)} />
        ) : (
          <div>
            {nivel === 'operacion' && pendiente && (
              // «No arrancar» es un bloqueo de procedimiento: franja en tinta con ⊘ (X5 §5.6), nunca un color.
              <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-[16px] bg-[var(--panel)] p-2.5 text-[15px] shadow-[inset_0_0_0_2px_var(--tinta)]" data-bloqueo>
                <MarcaCondicion c="bloqueo" tamano={18} decorativa />
                <span className="min-w-0 flex-1"><b>No arrancar hasta identificar qué se dañó.</b></span>
                {rol.pantallas.includes('causa') && <Boton variante="principal" onClick={() => { abrirEquipo(null); setPantalla('causa') }}>Identificar</Boton>}
              </div>
            )}
            <section>
              <div className="flex flex-wrap items-center gap-1">
                <Chip>criticidad {eq.criticidad}/5</Chip>
                <Chip tono={eq.redundancia === 'sin respaldo' ? 'fuerte' : 'neutro'}>{eq.redundancia}</Chip>
                <Chip>aguas abajo: {eq.aguasAbajo}</Chip>
                {nivel === 'ingenieria' && <Info rotulo="norma" titulo="Norma" texto={eq.norma} />}
              </div>
              {/* El diagnóstico del equipo, en una frase: es lo que dice por qué está como está. Una bomba de
                  reinyección parada lo dice con la tubería del agua de hoy, que arma el motor (B-17). */}
              {!paradaDelTren && <p className="mt-2 text-[14px] leading-relaxed">{eq.lectura}</p>}
              {nivel === 'ingenieria' && <SiFallaHoyFicha campoId={campoId} equipo={eq.id} className="mt-2" />}
              <AguaHoy campoId={campoId} bomba={eq.id} className="mt-2.5" />
              <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[14px]">
                {nivel === 'ingenieria' && <><dt className="text-[var(--tinta3)]">Modo de falla</dt><dd className="m-0">{eq.modoFalla}</dd></>}
                <dt className="text-[var(--tinta3)]">Diferido · {rango.nombre.toLowerCase()}</dt>
                <dd className="tabular m-0">{n0(bblDe(eq.id, campoId) ?? 0)} bbl</dd>
              </dl>
            </section>

            <BloqueSap key={`${campoId}|${eq.id}`} campoId={campoId} equipo={eq.id} nivel={nivel} />

            <h3 className="mb-1.5 mt-3 text-[15px] font-semibold text-[var(--tinta)]">
              {nivel === 'operacion' ? `Fuera de banda · ${fueraN} de ${disp.length}${sinSenalN ? ` · ${sinSenalN} sin señal` : ''}` : `Dispositivos · ${disp.length}`}
            </h3>
            {!eq.instrumentado && (
              <Hueco>
                <span className="flex flex-wrap items-center gap-x-1">
                  <b>Sin conectar en {campo.nombre}</b>
                  <Info titulo="Sin conectar" texto={`${campo.nombre} todavía no tiene conectada su instancia de este equipo. Existe en la topología, pero no hay lecturas propias. No se muestran aquí las de otro campo: serían el número de otra máquina.`} />
                </span>
              </Hueco>
            )}
            <div className="grid gap-1.5">
              {nivel === 'operacion' && visibles.length === 0 && (
                <p className="text-[14px] text-[var(--tinta2)]">Todo dentro de banda.</p>
              )}
              {/* Con `key`: al pasar a otro equipo, la lista vuelve a abrir cerrada. */}
              <ListaDispositivos key={eq.id} visibles={visibles} fila={fila} />
            </div>

            {disp.some(sinLectura) && (
              <div className="mt-2">
                <Hueco>
                  <span className="flex flex-wrap items-center gap-x-1">
                    <span><b>Sin señal</b>: valor de ruta manual</span>
                    <Info titulo="Sin señal" texto="Hay dispositivos sin señal en línea: lo que se vea de ellos es de una ruta manual. No se estima el valor faltante." />
                  </span>
                </Hueco>
              </div>
            )}

            {historia && nivel === 'operacion' && historia.eventos[0] && (
              <p className="mt-3 flex flex-wrap items-center gap-x-1 text-[14px] text-[var(--tinta2)]">
                <span>Última parada: <b className="tabular text-[var(--tinta)]">{fechaHora(historia.eventos[0].inicio)}</b>{historia.eventos[0].causa.parte ? ` · ${NOMBRE_PARTE[historia.eventos[0].causa.parte].toLowerCase()}` : ''}</span>
                <Info titulo="Por qué paró" texto={historia.eventos[0].causa.texto} textoEnPapel={causaEnPapel(historia.eventos[0].causa)} />
              </p>
            )}
            {historia && nivel === 'ingenieria' && <Historia key={eq.id} historia={historia} />}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {puedeHacer(rol.puede, 'causa:declarar') && rol.pantallas.includes('causa')
                && preguntas.some(p => p.pide && p.equipo === eq.id) && (
                <Boton variante="principal" onClick={() => { abrirEquipo(null); setPantalla('causa') }}>
                  Identificar qué se dañó
                </Boton>
              )}
              {nivel === 'ingenieria' && disp[0] && <Boton onClick={() => setCadenaTag(disp[0]!.tag)}>Cadena del dato</Boton>}
            </div>
          </div>
        )}
    </Modal>
  )
}

/** El botón de exportar de la ficha (`ExportarFicha`, de informe) con la forma de los de la cabecera del modal. */
const ACCION_EXPORTAR = 'contents [&_button]:grid [&_button]:size-10 [&_button]:place-items-center [&_button]:rounded-full [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0 [&_button]:text-[var(--tinta2)] [&_button:hover]:bg-[var(--panel2)] [&_button:hover]:text-[var(--tinta)] [&_svg]:size-[18px]'


/** Una fila por dispositivo (X5 §5.5: una fila de B, sin caja). El origen de la
 *  lectura (PI, PLC…) va en el globo y en el papel; a la vista, solo cuando el dato
 *  es de una ruta manual (sin señal).
 *  - Sin lectura (lo dice su estado o llega con `valor: null`) es un dato inválido
 *    (ISA-101): «---» en tinta suave con la marca morada al lado; el texto no se
 *    pinta (X2 B5, C1; H13).
 *  - Con el equipo parado (`gris`), sus señales van en gris y sin marca propia: la
 *    marca la lleva el equipo, una vez (X2 B9; UI-07, H4). Sin lectura con el equipo
 *    parado es lo esperado: «sin lectura», no «sin señal».
 *  - En el teléfono, el nombre arriba y la minitendencia y el valor debajo: nada se
 *    sale de la tarjeta (UI-03, A7; WCAG 1.4.10); por debajo de 400 px, sin la
 *    minitendencia (está en el nivel 3). */
function FilaDispositivo({ d, senal, nivel, gris = false, onCadena }: { d: Dispositivo; senal?: SenalNivel3; nivel: NivelDetalle; gris?: boolean; onCadena: (tag: string) => void }) {
  const ss = sinLectura(d), e = ss ? 'sin señal' as const : d.estado
  const marca = !gris && (ss || e !== 'normal')
  // K3 · La minigráfica es la tendencia compacta del kit, con la escala de su señal (la del nivel 3: de
  // sus límites, nunca de las lecturas). Sin ningún límite declarado no hay escala: no se dibuja.
  const escala = senal?.escala ? { min: senal.escala[0], max: senal.escala[1], firmada: false } : undefined
  const k = senal ? estadoKit(senal) : { estado: gris ? 'parado' as const : 'normal' as const }
  return (
    <Tip as="button" onClick={() => onCadena(d.tag)}
      titulo={`${d.tag} · ${d.tipo}`} pista="Toque para ver la cadena técnica de este dato"
      filas={[['Valor', ss ? (gris ? 'sin lectura: el equipo está parado' : 'sin señal') : `${num(d.valor)} ${d.unidad}`.trim()], ['Límite', d.limite],
        ['Estado', gris ? 'equipo parado' : NOMBRE_ESTADO[e]], ['Origen', d.origen],
        ['Minigráfica', d.serie ? lecturasDe(d.serie)
          : ss ? 'sin lecturas en línea: no hay serie que graficar'
          : 'variable discreta: no lleva gráfica']]}
      data-dispositivo={d.tag} data-gris={gris ? 'si' : 'no'}
      className="grid min-h-14 w-full cursor-pointer grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 border-t border-[var(--linea2)] py-2 text-left first:border-t-0 hover:bg-[var(--panel2)]/60 sm:grid-cols-[14px_minmax(0,1fr)_96px_84px]">
      <span className="col-start-1 row-start-1 flex self-start pt-0.5">{marca ? <MarcaEstado e={e} tamano={14} /> : null}</span>
      <span className="col-span-2 col-start-2 row-start-1 min-w-0 sm:col-span-1">
        <b className="font-cond block text-[13px] font-bold tracking-[.02em] text-[var(--tinta2)]">{d.tag}</b>
        <b className="block text-[15px] font-medium leading-snug">{d.tipo}</b>
        <small className="block text-[13px] leading-snug text-[var(--tinta2)]">
          {ss && !gris ? `${d.origen} · ` : <span className="hidden print:inline">{d.origen} · </span>}límite {d.limite}
        </small>
      </span>
      <span className="col-start-2 row-start-2 justify-self-end max-[399px]:hidden sm:col-start-3 sm:row-start-1">
        {nivel === 'operacion' ? null : d.serie && escala
          ? <Tendencia titulo={d.tipo} ventana={lecturasDe(d.serie)} series={[{ nombre: d.tipo, valores: d.serie.valores }]} escala={escala} unidad={d.unidad}
              banda={senal?.banda ?? undefined} alarmas={senal?.alarmas ?? []} estado={k.estado} {...(k.condicion ? { condicion: k.condicion } : {})}
              decimales={senal?.decimales ?? 0} compacta ancho={96} alto={26} />
          : d.serie ? <span className="block w-[96px] text-center text-[13px] leading-tight text-[var(--tinta2)]">sin límite: sin gráfica</span>
          // Sin serie: lo que es, en palabras y en tinta suave (sin pintar el texto).
          : <span className="block w-[96px] text-center text-[13px] leading-tight text-[var(--tinta2)]">{ss ? (gris ? 'sin lectura' : 'sin señal') : 'interruptor'}</span>}
      </span>
      <span className="tabular col-start-3 row-start-2 w-[84px] text-right sm:col-start-4 sm:row-start-1">
        {/* El estado lo lleva la forma al inicio de la fila: el valor, en tinta. */}
        <b className={cn('block text-[15px] leading-tight', (ss || gris) && 'font-semibold text-[var(--tinta2)]')} data-valor>
          {ss ? '---' : num(d.valor)}
        </b>
        {/* Sin unidad (un interruptor) se escribe su estado, con su nombre para leer: «atención», no la clave. */}
        <small className="text-[13px] text-[var(--tinta2)]">{ss ? (gris ? 'sin lectura' : 'sin señal') : d.unidad || (gris ? 'parado' : NOMBRE_ESTADO[e])}</small>
      </span>
    </Tip>
  )
}

/** C4 · Los instrumentos de un equipo, en el diagnóstico (nivel 4; X4 §5.1: «el
 *  instrumento: tag, calibración, sin comunicación»): cada dispositivo con su
 *  lectura, y al tocarlo, la cadena del dato (de dónde sale ese número). Con el
 *  equipo parado, en gris y sin marca propia: lo dice el motor (`nivelEquipo`,
 *  `parado`), el mismo de «Sus señales» del nivel 3 (UI-07, H4). */
export function Instrumentos({ campoId, equipo }: { campoId: string; equipo: string }) {
  const nivel = useNivel()
  const eq = useEquipo(campoId, equipo)
  const n = useNivelEquipo(campoId, equipo)
  const [cadenaTag, setCadenaTag] = useState<string | null>(null)
  if (!eq) return null
  const activo = cadenaTag ? eq.dispositivos.find(d => d.tag === cadenaTag) : undefined
  if (activo) return <CadenaDato campoId={campoId} disp={activo} equipoNombre={eq.nombre} norma={eq.norma} onVolver={() => setCadenaTag(null)} />
  return (
    <div className="grid" data-instrumentos={equipo} data-parado={n?.parado ? 'si' : 'no'}>
      {eq.dispositivos.map(d => <FilaDispositivo key={d.tag} d={d} senal={senalDe(n, d.tag)} nivel={nivel} gris={!!n?.parado} onCadena={setCadenaTag} />)}
      {!eq.dispositivos.length && <p className="text-[14px] text-[var(--tinta2)]">Sin instrumentos registrados.</p>}
    </div>
  )
}

/** La señal del nivel 3 de un dispositivo (su escala, banda y alarma), si el motor la trae. */
const senalDe = (v: VistaNivel3 | null | undefined, tag: string) => v ? [...v.senales, ...v.plegadas].find(s => s.tag === tag) : undefined

/** Cinco y «ver N más»; lo que no está normal (fuera de banda, sin señal) nunca
 *  se esconde. Lo que no se ve en la pantalla sale en el papel. */
function ListaDispositivos({ visibles, fila }: { visibles: Dispositivo[]; fila: (d: Dispositivo) => ReactNode }) {
  const lista = useVerMas(visibles, { prioridad: d => (d.estado !== 'normal' || d.valor === null ? 1 : 3) })
  return (
    <>
      {lista.visibles.map(fila)}
      {lista.resto.length > 0 && <div className="solo-impresion grid gap-1.5">{lista.resto.map(fila)}</div>}
      {/* Dentro de la rejilla: el botón no se estira a todo el ancho. */}
      {lista.ocultas > 0 && <div><VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} /></div>}
    </>
  )
}

/** Seis palabras o menos: la causa de un servicio («Presión baja del aire de instrumentos») cabe en la fila. */
const corto = (t: string) => t.trim().split(/\s+/).length <= 6

/** Lo que el PLC dejó de este equipo: sus fallas (en una bomba) y cada evento
 *  que cerró pozos. Cinco y «ver N más»; la causa de cada evento, en su globo
 *  y en el papel (se repite de un evento a otro: la misma frase del pozo). */
export function Historia({ historia, sinTitulo = false }: { historia: HistoriaEquipo; sinTitulo?: boolean }) {
  const lista = useVerMas(historia.eventos)
  const total = historia.eventos.reduce((a, x) => a + x.bbl, 0)
  // Esta duración va de la parada hasta que reabrió el último pozo: no es la de
  // la bomba parada (la de «Paradas» en Bombas). Se dice cuál es.
  const cerrados = (x: HistoriaEquipo['eventos'][number]) => x.fin
    ? `${plural(x.pozos, 'pozo cerrado', 'pozos cerrados')} hasta ${fmtHoras(horasEntre(x.inicio, x.fin), true)}`
    : `${plural(x.pozos, 'pozo cerrado', 'pozos cerrados')} · sigue · ${fmtHoras(horasEntre(x.inicio, AHORA), true)}`
  const fila = (x: HistoriaEquipo['eventos'][number]) => (
    <Tip key={x.id} titulo={`${fechaHora(x.inicio)} · ${plural(x.pozos, 'pozo', 'pozos')}`}
      filas={[[x.fin ? 'Hasta que reabrió el último pozo' : 'Pozos cerrados, sigue', fmtHoras(horasEntre(x.inicio, x.fin ?? AHORA), true)],
        ['Barriles', `${n0(x.bbl)} bbl`], ['Cómo se identificó', COMO[x.causa.como]]]}
      pista={x.causa.texto} pistaEnPapel={causaEnPapel(x.causa)} imprimir="pista" claseImpresion="border-b border-[var(--linea2)] pb-1.5 last:border-0"
      className="grid grid-cols-[1fr_auto] gap-2 border-b border-[var(--linea2)] py-1 text-[13px] last:border-0 print:border-b-0">
      <span className="min-w-0">
        <b className="tabular">{fechaHora(x.inicio)}</b>
        <span className="text-[var(--tinta3)]"> · {cerrados(x)}</span>
        <small className="block text-[13px] leading-snug text-[var(--tinta2)]">{x.causa.parte ? `${NOMBRE_PARTE[x.causa.parte]} · ${COMO[x.causa.como]}`
          // «Mantenimiento preventivo programado» ya dice «por el programa aprobado».
          : corto(x.causa.texto) ? <DichoEnPapel papel={`${causaEnPapel(x.causa)} · ${COMO[x.causa.como]}`}>{`${x.causa.texto}${x.causa.como === 'programa' ? '' : ` · ${COMO[x.causa.como]}`}`}</DichoEnPapel> : COMO[x.causa.como]}</small>
      </span>
      <b className="tabular">{n0(x.bbl)} bbl</b>
    </Tip>
  )
  return (
    <>
      {!sinTitulo && <h3 className="mb-1.5 mt-3 text-[15px] font-semibold text-[var(--tinta)]">Historia del PLC</h3>}
      {historia.bomba && (
        <p className="tabular mb-1.5 text-[14px] text-[var(--tinta2)]">
          <b className="text-[var(--tinta)]">{plural(historia.bomba.fallas, 'falla', 'fallas')}</b> en {n0(historia.bomba.dias / 30.4)} meses
          {historia.bomba.mtbfDias ? ` · cada ${n0(historia.bomba.mtbfDias)} d` : ''}
          {historia.bomba.mdtH ? ` · ${fmtHoras(historia.bomba.mdtH, true)} fuera` : ''}
          {/* Lo que YA costó (histórico); «si falla hoy» es otra cifra, la de Riesgo. */}
          {historia.bomba.bblPorFalla !== undefined ? ` · le ha costado ${n0(historia.bomba.bblPorFalla)} bbl por falla` : ''}
          {historia.bomba.porParte.length > 0 && <span className="block text-[13px]">{historia.bomba.porParte.map(x => `${NOMBRE_PARTE[x.parte].toLowerCase()} ${x.fallas}`).join(' · ')}</span>}
        </p>
      )}
      {historia.eventos.length === 0 ? (
        <p className="text-[14px] text-[var(--tinta2)]">Ningún pozo cerrado por este equipo en la historia.</p>
      ) : (
        <>
          <p className="tabular mb-1 text-[14px] text-[var(--tinta2)]">
            {plural(historia.eventos.length, 'evento', 'eventos')} con pozos cerrados · <b className="text-[var(--tinta)]">{n0(total)} bbl</b>
          </p>
          {lista.visibles.map(fila)}
          {lista.resto.length > 0 && <div className="solo-impresion">{lista.resto.map(fila)}</div>}
          <VerMas ocultas={lista.ocultas} abierto={lista.abierto} onAlternar={lista.alternar} />
        </>
      )}
    </>
  )
}

/** La ficha de un equipo que no tiene registro propio en TRIM (P-201A y P-201C:
 *  bombas del tren de agua sin instrumento). No se inventa lo que no hay: se
 *  dice que no tiene instrumento, cuánto costaría si falla hoy y la tubería del
 *  agua de hoy (B-37, B-01). */
function FichaMinima({ campoId, equipo }: { campoId: string; equipo: string }) {
  const abrirEquipo = useApp(s => s.abrirEquipo)
  const campo = useCampo()
  const nivel = useNivel()
  const crit = useCriticidad([campoId])
  const fila = crit.ranking.find(f => f.equipo === equipo && f.campoId === campoId)
  return (
    <Modal enSitio ancho="amplio" data-panel-equipo="" data-ficha-minima={equipo} onCerrar={() => abrirEquipo(null)} contenido={equipo}
      antetitulo={<b className="font-cond text-[15px] font-bold tracking-[.02em] text-[var(--tinta)]">{equipo}</b>}
      titulo={fila?.nombre ?? equipo} subtitulo={`Tren de agua · ${campo.nombre}`}>
        <div className="text-[14px]">
          <Hueco>
            <span className="flex flex-wrap items-center gap-x-1">
              <b>Sin instrumento</b>: TRIM no ve si está en marcha; se supone que sí. No tiene historia propia de fallas.
            </span>
          </Hueco>
          {nivel !== 'decision' && <SiFallaHoyFicha campoId={campoId} equipo={equipo} className="mt-2.5" />}
          <AguaHoy campoId={campoId} bomba={equipo} className="mt-2.5" />
        </div>
    </Modal>
  )
}
