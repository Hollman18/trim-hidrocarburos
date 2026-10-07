import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Crosshair, Plug } from 'lucide-react'
import { useApp, useCampo, usePlanta, usePerfil, useRango, useRol, useNivel } from '@/app/store'
import { useBarrilesDeEquipos, useEstadoCampos, useCtx } from '@/shared/api/diferidos'
import type { EquipoEnCampo } from '@/entities/equipos'
import { useEquiposDeHoy, pedirPerfilesBomba } from '@/shared/api/equipos'
import { useCampoAhora } from '@/shared/api/medicion'
import { NOMBRE_GAS, tanqueDe } from '@/entities/configuracion'
import { armar, NOMBRE_CORRIENTE, type PlantaCampo, type Corriente, type Elemento, type Simbolo } from '@/entities/planta'
import { Glifo } from '@/widgets/planta/Simbolos'
import { Panel, Boton, Cita, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { Tip } from '@/shared/ui/Tip'
import { n0, n1, num, plural } from '@/shared/lib/formato'
import { cn } from '@/shared/lib/cn'
import type { Severidad } from '@/entities/tipos'
import { MarcaPrioridad, FueraDeMeta } from '@/shared/ui/Prioridad'
import { NOMBRE_PRIORIDAD } from '@/shared/lib/prioridad'

const COLOR: Record<Corriente, string> = {
  multi: 'var(--f-multi)', crudo: 'var(--f-crudo)', gas: 'var(--f-gas)',
  agua: 'var(--f-agua)', elec: 'var(--f-elec)', aire: 'var(--f-aire)',
}
/** El fluido se distingue por el trazo, no por el color (ISA-101): la línea
 *  principal es más gruesa, el gas va a trazos, el agua punteada. */
const TRAZO: Record<Corriente, { ancho: number; patron?: string }> = {
  multi: { ancho: 3 }, crudo: { ancho: 2.4 }, gas: { ancho: 2, patron: '8 4' },
  agua: { ancho: 2, patron: '2 3' }, elec: { ancho: 2 }, aire: { ancho: 2, patron: '6 4' },
}
const SEV_COLOR = ['transparent', 'var(--p1)', 'var(--p2)', 'var(--p3)']
/** Lo que es límite de batería o paso de proceso sin máquina propia: se
 *  dibuja sin caja y no cuenta como equipo que debería capturar datos. */
const SOLO_PROCESO: Simbolo[] = ['salida', 'manifold', 'tea', 'inyeccion', 'pozos']
/** El dibujo nunca se encoge más que esto: por debajo, la letra no se lee. */
const ESCALA_MINIMA = 0.7

/** Un equipo captura datos si está instrumentado y al menos un dispositivo
 *  tiene señal. Lo demás está configurado, pero todavía no da datos. */
const captura = (eq: EquipoEnCampo | undefined) => !!eq && eq.instrumentado && eq.dispositivos.some(d => d.estado !== 'sin señal')
/** La lectura que resume un equipo: su primera variable con número. */
const lecturaClave = (eq: EquipoEnCampo) => {
  const d = eq.dispositivos.find(x => typeof x.valor === 'number' && x.estado !== 'sin señal')
  return d ? `${d.tag} ${num(d.valor)} ${d.unidad}`.trim() : undefined
}

/** Una fila de las listas: un equipo con su ficha o el tanque de agua (que se lee por su transmisor). */
interface Fila { id: string; etiqueta: string; nodo: string; eq?: EquipoEnCampo; estado: string; lectura?: string; sev: Severidad; abrir?: string }

const angosto = '(max-width: 639px)'
const suscribir = (cb: () => void) => { const m = matchMedia(angosto); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) }

/** La planta del campo: el dibujo de lo que el campo tiene (según su perfil),
 *  y encima de todo, lo que de verdad se está midiendo. Lo que captura datos
 *  va lleno; lo configurado sin datos, tenue y punteado: es lo que falta por
 *  instrumentar. Los pasos de proceso y los límites de batería van sin caja. */
export function Planta() {
  const plantaCfg = usePlanta()
  const campo = useCampo()
  // Un campo sin esquema registrado muestra el hueco: nunca la planta de otro campo.
  if (!plantaCfg) return <Panel titulo={`PLANTA · ${campo.nombre.toUpperCase()}`}><Hueco>{campo.nombre} no tiene esquema de planta registrado.</Hueco></Panel>
  return <PlantaDelCampo plantaCfg={plantaCfg} />
}

function PlantaDelCampo({ plantaCfg }: { plantaCfg: PlantaCampo }) {
  const campo = useCampo(); const rol = useRol(); const nivel = useNivel(); const perfil = usePerfil(); const ctx = useCtx()
  const campoId = useApp(s => s.campoId), abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla)
  const rango = useRango()
  const estrecho = useSyncExternalStore(suscribir, () => matchMedia(angosto).matches)
  const bblDe = useBarrilesDeEquipos({ campos: [campoId], desde: rango.desde, hasta: rango.hasta })
  const estadoCampo = useEstadoCampos([campoId])[0]
  // Crudo y agua: lo que producen los pozos ahora. El gas no se mide en esta fase.
  const { caudales, niveles } = useCampoAhora(campoId)
  const cfg = useMemo(() => ({ ...plantaCfg, caudales: { ...plantaCfg.caudales, ...caudales } }), [plantaCfg, caudales])
  const verPozos = rol.pantallas.includes('pozos')

  const [destacado, setDestacado] = useState<string | null>(null)
  const refs = useRef(new Map<string, SVGGElement>())
  // Los conjuntos (pozos, tanques) van cerrados: un bloque cada uno.
  const plano = useMemo(() => armar(cfg, new Set()), [cfg])

  // El tanque de agua se lee por el transmisor que declara la configuración firmada.
  // El esquema dibuja el tren de agua de la bomba de reinyección: su tanque.
  // Cuál es esa bomba lo dice su perfil en el registro, no un id fijo.
  const reinyeccion = pedirPerfilesBomba(campoId).find(p => p.subtipo === 'inyeccion')
  const tanque = reinyeccion ? tanqueDe(ctx.config, campoId, reinyeccion.equipo) : undefined
  const nivelTanque = tanque && Object.hasOwn(niveles, tanque.id) ? niveles[tanque.id] : undefined
  const tanqueSev: Severidad = tanque && nivelTanque && nivelTanque.pct >= tanque.altoAlto * 100 ? 1 : 0

  const equipoDeHoy = useEquiposDeHoy([campoId])
  const estado = useMemo(() => {
    const m = new Map<string, EquipoEnCampo | undefined>()
    for (const n of plano.nodos) if (n.equipo) m.set(n.id, equipoDeHoy(n.equipo, campoId))
    return m
  }, [plano, campoId, equipoDeHoy])

  // Las dos listas salen de lo configurado, uno por uno (también lo que va dentro de un conjunto).
  const { capturan, sinDatos, porConjunto } = useMemo(() => {
    const capturan: Fila[] = [], sinDatos: Fila[] = []
    const porConjunto = new Map<string, { con: number; total: number }>()
    const trenes: Elemento[] = [...cfg.tronco, ...cfg.gas, ...cfg.crudo, ...cfg.agua, ...cfg.servicios]
    for (const el of trenes) {
      if (el.simbolo === 'pozos') continue
      if (el.id === 'tanqueAgua') {
        if (tanque && nivelTanque) capturan.push({ id: tanque.id, etiqueta: tanque.nombre, nodo: el.id, sev: tanqueSev,
          estado: `nivel ${n1(nivelTanque.pct)} % · alto-alto ${n0(tanque.altoAlto * 100)} %`, lectura: `${nivelTanque.tag} ${n1(nivelTanque.pct)} %` })
        // Configurado y sin lectura: el dibujo lo pinta «sin datos», así que también
        // cuenta y va en la lista de lo que falta por instrumentar, con su tag declarado.
        else if (tanque) sinDatos.push({ id: tanque.id, etiqueta: tanque.nombre, nodo: el.id, sev: 0,
          estado: `registrado, su transmisor de nivel (${tanque.tagNivel}) todavía no da señal` })
        continue
      }
      const items = el.miembros?.length ? el.miembros.map(m => ({ ...m, simbolo: el.simbolo })) : [el]
      let con = 0
      for (const it of items) {
        if (SOLO_PROCESO.includes(it.simbolo)) continue
        const eq = it.equipo ? equipoDeHoy(it.equipo, campoId) : undefined
        if (captura(eq)) {
          con++
          capturan.push({ id: it.id, etiqueta: it.etiqueta, nodo: el.id, eq, sev: eq!.severidad, abrir: eq!.id,
            estado: eq!.estado, lectura: lecturaClave(eq!) })
        } else sinDatos.push({ id: it.id, etiqueta: it.etiqueta, nodo: el.id, eq, sev: 0,
          estado: eq ? 'registrado, su instrumento todavía no da señal' : 'sin instrumento declarado' })
      }
      if (el.miembros?.length) porConjunto.set(el.id, { con, total: items.length })
    }
    capturan.sort((a, b) => (a.sev || 9) - (b.sev || 9) || (b.eq ? bblDe(b.eq.id, campoId) : 0) - (a.eq ? bblDe(a.eq.id, campoId) : 0))
    return { capturan, sinDatos, porConjunto }
  }, [cfg, campoId, bblDe, tanque, nivelTanque, tanqueSev, equipoDeHoy])

  const enAlarma = capturan.filter(f => f.sev === 1 && f.eq)
  const pozos = estadoCampo?.pozos ?? 0, parados = estadoCampo?.parados ?? 0
  const detenido = (id: string) => {
    const n = plano.nodos.find(p => p.id === id)
    if (n?.cluster) return false
    return estado.get(id)?.marcha === 'detenido'
  }

  useEffect(() => {
    if (!destacado) return
    const t = setTimeout(() => setDestacado(null), 3200)
    return () => clearTimeout(t)
  }, [destacado])

  const ubicar = (id: string) => {
    setDestacado(id)
    refs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }
  /** Sin el blur, el anillo de foco se queda pintado después del clic. */
  const abrir = (equipo: string) => {
    (document.activeElement as HTMLElement | null)?.blur?.()
    abrirEquipo(equipo, false)
  }

  /** Caudal de cada corriente ahora, en bbl/d como en el resto del producto. */
  const caudal: Partial<Record<Corriente, string>> = {
    multi: `${n0(cfg.caudales.crudo + cfg.caudales.agua)} bbl/d de fluido`,
    crudo: `${n0(cfg.caudales.crudo)} bbl/d de crudo`,
    gas: 'gas sin medición',
    agua: `${n0(cfg.caudales.agua)} bbl/d de agua`,
  }
  // El caudal de cada corriente se rotula en su tubería más a la derecha que
  // sigue con flujo: una que sale de un equipo detenido lleva «SIN FLUJO» en
  // vez del rótulo, y el caudal de la corriente no puede quedar solo en el
  // tooltip (las tuberías no reciben el foco: lo suyo tiene que verse).
  const rotulada = new Set<string>()
  for (const c of ['multi', 'crudo', 'gas', 'agua'] as Corriente[]) {
    const dela = plano.lineas.filter(l => l.corriente === c && !detenido(l.deId))
    const borde = dela.reduce<typeof dela[number] | undefined>((mejor, l) => (!mejor || l.medio[0] > mejor.medio[0] ? l : mejor), undefined)
    if (borde) rotulada.add(borde.id)
  }
  const corrientes = (['multi', 'crudo', 'gas', 'agua'] as Corriente[]).filter(c => plano.lineas.some(l => l.corriente === c))
  const total = capturan.length + sinDatos.length

  const cobertura = (
    <p className="mb-2 flex flex-wrap items-baseline gap-x-2">
      <b className="tabular text-[24px] leading-none">{capturan.length} de {total}</b>
      <span className="text-[12px] text-[var(--tinta2)]">equipos capturando datos · más {plural(pozos, 'pozo', 'pozos')} con su controlador{estrecho ? ` · ${NOMBRE_GAS[perfil.gas]}` : ''}</span>
    </p>
  )

  const dibujo = (
    <Panel className="mb-2.5 min-w-0" titulo={`PLANTA · ${campo.nombre.toUpperCase()}`} extra={NOMBRE_GAS[perfil.gas]}>
      {!estrecho && cobertura}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-[var(--tinta2)]">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4 rounded-sm border border-[var(--linea)] bg-[var(--panel)]" />captura datos</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4 rounded-sm border border-dashed border-[var(--tinta3)]" />configurado, sin datos</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4" />sin caja: proceso o límite de batería</span>
        <span className="inline-flex items-center gap-1.5"><MarcaPrioridad s={1} tamano={11} />forma y color: condición anormal</span>
        <span className="mx-1 h-3 w-px bg-[var(--linea)]" />
        {corrientes.map(c => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <svg width={22} height={6} aria-hidden><line x1={1} x2={21} y1={3} y2={3} stroke={COLOR[c]} strokeWidth={TRAZO[c].ancho} strokeDasharray={TRAZO[c].patron} /></svg>
            {NOMBRE_CORRIENTE[c]}
          </span>
        ))}
      </div>
      <Lectura>
        Gris es normal; el color aparece solo donde hay condición anormal, siempre con su forma. Lo que captura
        datos va lleno; lo configurado que todavía no da datos va punteado: es lo que falta por instrumentar.
        Los caudales son los de ahora. {perfil.gas === 'no' ? 'Este campo no tiene tren de gas.' : 'El gas no se mide en esta fase.'}
      </Lectura>

      <div className="overflow-auto rounded-sm border border-[var(--linea2)] bg-[var(--panel2)]">
        <svg viewBox={`0 0 ${plano.ancho} ${plano.alto}`} preserveAspectRatio="xMinYMin meet"
          style={{ width: '100%', minWidth: Math.round(plano.ancho * ESCALA_MINIMA), height: 'auto' }} className="block"
          // Un grupo, no una imagen: adentro hay equipos que se abren con el teclado, y un
          // role="img" los volvía mudos para el lector aunque recibieran el foco.
          role="group" aria-label={`Planta de ${campo.nombre}: ${capturan.length} de ${plural(total, 'equipo', 'equipos')} capturando datos.`}>
          <defs>
            <filter id="sombraNodo" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.4" floodOpacity="0.16" />
            </filter>
          </defs>

          {plano.bandas.map(b => (
            <g key={b.titulo}>
              <rect x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} rx={10} fill={COLOR[b.corriente]} opacity={0.07} />
              <text x={b.x0 + 12} y={b.y0 + 18} fontSize={13} className="font-cond" fill="var(--tinta2)" letterSpacing=".12em">{b.titulo.toUpperCase()}</text>
            </g>
          ))}

          {plano.lineas.map(l => {
            const quieta = detenido(l.deId) || detenido(l.aId)
            const sinSalida = detenido(l.deId)
            const sevSalida: Severidad = sinSalida ? estado.get(l.deId)?.severidad ?? 0 : 0
            const rot = rotulada.has(l.id) ? caudal[l.corriente] : undefined
            const [mx, my] = l.medio
            const [sx, sy] = l.inicio
            const anchoRot = rot ? rot.length * 7.6 + 18 : 0
            return (
              // Lo que dice el tooltip de una tubería ya está dibujado (la línea, el
              // rótulo del caudal de su corriente, el «SIN FLUJO»): no es parada de Tab.
              <Tip key={l.id} as="g" aLaVista data-linea={l.id} titulo={`${NOMBRE_CORRIENTE[l.corriente]} · ${l.de} → ${l.a}`}
                pista={quieta ? 'Sin flujo: el equipo de aguas arriba está detenido.' : undefined}
                filas={[['Corriente', NOMBRE_CORRIENTE[l.corriente]], ['Viene de', l.de], ['Va a', l.a],
                  ['Caudal ahora', caudal[l.corriente] ?? 'sin medidor en línea'], ['Estado', quieta ? 'sin flujo' : 'corriendo']]}>
                <path d={l.d} fill="none" stroke="transparent" strokeWidth={16} strokeLinejoin="round" />
                <path d={l.d} fill="none" stroke={COLOR[l.corriente]} strokeWidth={5} opacity={quieta ? 0.12 : 0.22} strokeLinejoin="round" />
                <path d={l.d} fill="none" stroke={COLOR[l.corriente]} strokeWidth={TRAZO[l.corriente].ancho}
                  strokeDasharray={TRAZO[l.corriente].patron} strokeLinejoin="round" className={cn(quieta && 'detenido')} />
                {rot && !sinSalida && (
                  <>
                    <rect x={mx - anchoRot / 2} y={my - 12} width={anchoRot} height={23} rx={4} fill="var(--panel)" stroke="var(--linea2)" strokeWidth={0.9} />
                    <text x={mx} y={my + 4.5} fontSize={13} textAnchor="middle" fill="var(--tinta2)" className="tabular">{rot}</text>
                  </>
                )}
                {sinSalida && (
                  // ISA-101: el texto en tinta (en rojo oscuro no llegaba a 4,5:1 a 13 px)
                  // y el color solo en la forma, con la prioridad del equipo que paró.
                  <>
                    <rect x={sx - 48} y={sy - 11} width={96} height={21} rx={4} fill="var(--panel)"
                      stroke={sevSalida ? `var(--p${sevSalida})` : 'var(--linea)'} strokeWidth={0.9} />
                    {sevSalida > 0 && <g transform={`translate(${sx - 43},${sy - 6.5})`}><MarcaPrioridad s={sevSalida} tamano={13} decorativa /></g>}
                    <text x={sevSalida ? sx + 8 : sx} y={sy + 4} fontSize={13} textAnchor="middle" fill="var(--tinta)" className="font-cond" letterSpacing=".06em">SIN FLUJO</text>
                  </>
                )}
              </Tip>
            )
          })}

          {plano.nodos.map(n => {
            const eq = estado.get(n.id)
            const esPozos = n.simbolo === 'pozos'
            const esTanqueAgua = n.id === 'tanqueAgua' && !!nivelTanque
            const conjunto = porConjunto.get(n.id)
            const vivo = esPozos || esTanqueAgua || (conjunto ? conjunto.con > 0 : captura(eq))
            const proceso = !eq && !esTanqueAgua && (SOLO_PROCESO.includes(n.simbolo) || (n.id === 'tanqueAgua' && !tanque))
            const sev = esTanqueAgua ? tanqueSev : vivo && eq ? eq.severidad : 0
            const nivelD = n.nivelDe ? eq?.dispositivos.find(d => d.tag === n.nivelDe!.tag) : undefined
            const nivelV = esTanqueAgua ? nivelTanque!.pct / 100 : nivelD && typeof nivelD.valor === 'number' ? nivelD.valor / n.nivelDe!.tope : undefined
            const clave = vivo && eq ? lecturaClave(eq) : undefined
            const pie = esPozos ? `${plural(pozos, 'pozo', 'pozos')} · ${plural(parados, 'parado', 'parados')}`
              : esTanqueAgua ? `${nivelTanque!.tag} · nivel ${n1(nivelTanque!.pct)} %`
                : conjunto && conjunto.con < conjunto.total ? `${conjunto.con} de ${conjunto.total} con datos`
                  : vivo && eq ? `${eq.id} · ${eq.estado.split(' · ')[0]}`
                    : proceso ? n.pie ?? 'proceso' : 'sin datos'
            const filas: Array<[string, string]> = esPozos
              ? [['Pozos', `${n0(pozos)} con su controlador`], ['Parados ahora', n0(parados)]]
              : esTanqueAgua ? [['Nivel', `${n1(nivelTanque!.pct)} %`], ['Alto-alto', `${n0(tanque!.altoAlto * 100)} %`], ['Transmisor', nivelTanque!.tag], ['Capacidad', `${n0(tanque!.capacidadBbl)} bbl`]]
                : vivo && eq
                  ? [['Estado', eq.estado], ['Criticidad', `${eq.criticidad}/5`], ['Aguas abajo', eq.aguasAbajo],
                     ...(clave ? [['Lectura', clave] as [string, string]] : []),
                     ...(conjunto && conjunto.con < conjunto.total ? [['Con datos', `${conjunto.con} de ${conjunto.total}`] as [string, string]] : []),
                     ...(n.pmo ? [['Punto de medición', n.pmo] as [string, string]] : []),
                     [`Diferido · ${rango.nombre.toLowerCase()}`, bblDe(eq.id, campoId) ? `${n0(bblDe(eq.id, campoId))} bbl` : 'no ha diferido']]
                  : proceso ? [['Tipo', 'Proceso o límite de batería'], ['Datos', 'no tiene instrumento propio']]
                    : [['Datos', 'configurado, sin datos todavía'], ['Qué falta', n.id === 'tanqueAgua' && tanque ? `que su transmisor de nivel (${tanque.tagNivel}) dé señal` : eq ? 'que su instrumento dé señal' : 'montar el instrumento y declarar su tag']]
            const clicPozos = esPozos && verPozos
            const clicable = clicPozos || (!esPozos && !esTanqueAgua && !!(vivo && eq))
            return (
              <Tip key={n.id} as="g" data-nodo={n.id} titulo={n.etiqueta}
                // El nodo que se abre se anuncia como botón, con el equipo y su estado.
                role={clicable ? 'button' : undefined}
                aria-label={clicable ? `${n.etiqueta}: ${pie}${sev ? ` · ${NOMBRE_PRIORIDAD[sev]}` : ''}. ${clicPozos ? 'Abre los pozos uno por uno' : 'Abre el equipo'}` : undefined}
                pista={clicPozos ? 'Clic para ver los pozos uno por uno' : clicable ? 'Clic para abrir el equipo y sus dispositivos' : undefined}
                filas={filas} className={clicable ? 'nodo' : undefined}
                onClick={clicPozos ? () => setPantalla('pozos') : clicable ? () => abrir(eq!.id) : undefined}>
                <g transform={`translate(${n.x},${n.y})`} ref={(el: SVGGElement | null) => { if (el) refs.current.set(n.id, el) }}>
                  {sev === 1 && <circle cx={0} cy={0} r={46} fill="none" stroke="var(--p1)" strokeWidth={2} className="latido" />}
                  {destacado === n.id && <rect x={-64} y={-48} width={128} height={96} rx={11} fill="none" stroke="var(--acento)" strokeWidth={2.4} strokeDasharray="7 5" />}
                  {!proceso && (
                    <rect className="marco" x={-58} y={-42} width={116} height={84} rx={8}
                      fill={sev ? `var(--p${sev}-f)` : 'var(--panel)'} opacity={vivo ? 1 : 0.7}
                      stroke={sev ? SEV_COLOR[sev] : vivo ? 'var(--linea)' : 'var(--tinta3)'} strokeWidth={sev ? 2 : vivo ? 1.2 : 1.1}
                      strokeDasharray={vivo ? undefined : '5 4'} filter={vivo ? 'url(#sombraNodo)' : undefined} />
                  )}
                  <g opacity={vivo ? 1 : proceso ? 0.5 : 0.45}><Glifo simbolo={n.simbolo} nivel={nivelV} fluido={n.fluido} /></g>
                  {sev > 0 && <g transform="translate(-54,-38)"><MarcaPrioridad s={sev} tamano={16} /></g>}
                  {n.pmo && (
                    <g transform="translate(34,-32)">
                      <rect x={-22} y={-9} width={44} height={16} rx={3} fill="var(--panel2)" stroke="var(--linea)" strokeWidth={0.8} />
                      <text y={3} fontSize={10} textAnchor="middle" fill="var(--tinta2)" className="font-cond">{n.pmo}</text>
                    </g>
                  )}
                  {/* El texto va a contraste completo aunque el equipo no dé datos: eso es lo que hay que leer. */}
                  <text y={60} fontSize={15} textAnchor="middle" fill={proceso ? 'var(--tinta2)' : 'var(--tinta)'} fontWeight={proceso ? 400 : 600}>
                    {n.etiqueta.length > 26 ? `${n.etiqueta.slice(0, 25)}…` : n.etiqueta}
                  </text>
                  <text y={76} fontSize={12.5} textAnchor="middle" fill="var(--tinta2)" className="font-mono">{pie}</text>
                </g>
              </Tip>
            )
          })}
        </svg>
      </div>
      <Cita>{cfg.nota}</Cita>
    </Panel>
  )

  const listas = (
    <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
      <Panel titulo="CAPTURANDO DATOS" extra={`${plural(capturan.length, 'equipo', 'equipos')} · más ${plural(pozos, 'pozo', 'pozos')} con su controlador`}>
        <Lectura>Lo que se está midiendo ahora, lo anormal primero. Un clic abre el equipo; «Ubicar» lo marca en el dibujo.</Lectura>
        {capturan.map(f => (
          <div key={f.id} className="flex items-center gap-2 border-b border-[var(--linea2)] py-2 last:border-0">
            <MarcaPrioridad s={f.sev} tamano={12} />
            {f.abrir ? (
              <button onClick={() => abrir(f.abrir!)} className="min-w-0 flex-1 cursor-pointer text-left hover:underline">
                <b className="block truncate text-[12.5px] leading-tight">{f.etiqueta.startsWith(f.eq!.id) ? f.etiqueta : `${f.eq!.id} · ${f.etiqueta}`}</b>
                <small className="block truncate text-[10.5px] text-[var(--tinta3)]">
                  {f.estado}{f.lectura ? ` · ${f.lectura}` : ''}{f.eq && bblDe(f.eq.id, campoId) ? ` · ${n0(bblDe(f.eq.id, campoId))} bbl diferidos` : ''}
                </small>
              </button>
            ) : (
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[12.5px] leading-tight">{f.id} · {f.etiqueta}</b>
                <small className="block truncate text-[10.5px] text-[var(--tinta3)]">{f.estado}</small>
              </span>
            )}
            {!estrecho && <Boton variante="chico" onClick={() => ubicar(f.nodo)} aria-label={`Ubicar ${f.etiqueta} en el dibujo`}><Crosshair className="mr-1 inline size-3" />Ubicar</Boton>}
          </div>
        ))}
      </Panel>

      <Panel titulo="CONFIGURADOS SIN DATOS" extra={sinDatos.length ? plural(sinDatos.length, 'equipo por instrumentar', 'equipos por instrumentar') : 'ninguno'}>
        <Lectura>Están en el registro del campo, pero todavía no dan datos. Es lo que falta para verlos.</Lectura>
        {sinDatos.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Todo lo configurado en {campo.nombre} está capturando datos.</p>}
        {sinDatos.map(f => (
          <div key={f.id} className="flex items-center gap-2 border-b border-[var(--linea2)] py-2 last:border-0">
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[12.5px] leading-tight text-[var(--tinta2)]">{f.eq && !f.etiqueta.startsWith(f.eq.id) ? `${f.eq.id} · ` : ''}{f.etiqueta}</b>
              <small className="block text-[10.5px] text-[var(--tinta3)]">{f.estado}</small>
            </span>
            {!estrecho && <Boton variante="chico" onClick={() => ubicar(f.nodo)} aria-label={`Ubicar ${f.etiqueta} en el dibujo`}><Crosshair className="mr-1 inline size-3" />Ubicar</Boton>}
          </div>
        ))}
        {sinDatos.length > 0 && rol.pantallas.includes('conectores') && (
          <Boton className="mt-2 w-full" onClick={() => setPantalla('conectores')}><Plug className="mr-1 inline size-3.5" />Ir a conectores y tags</Boton>
        )}
      </Panel>
    </div>
  )

  return (
    <>
      {enAlarma.length > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-3 rounded border border-[var(--p1)] bg-[var(--p1-f)] px-3 py-2.5">
          <MarcaPrioridad s={1} tamano={18} />
          <div className="min-w-0 flex-1">
            <b className="block text-[13px] leading-tight text-[var(--p1)]">
              {enAlarma.length === 1 ? 'Hay un equipo detenido o en alarma' : `Hay ${enAlarma.length} equipos detenidos o en alarma`}
              {' · '}{n0(enAlarma.reduce((a, f) => a + bblDe(f.eq!.id, campoId), 0))} bbl diferidos · {rango.nombre.toLowerCase()}
            </b>
            <span className="block text-[11.5px] text-[var(--tinta2)]">{enAlarma.map(f => `${f.eq!.id} · ${f.etiqueta}`).join(' — ')}</span>
          </div>
          <Boton variante="principal" onClick={() => abrir(enAlarma[0]!.eq!.id)}>Abrir {enAlarma[0]!.eq!.id}</Boton>
        </div>
      )}

      {/* En el teléfono el dibujo no se lee: primero las listas, y el dibujo a un clic. */}
      {estrecho ? (
        <>
          <div className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-3 shadow-[var(--sombra)]">{cobertura}</div>
          {listas}
          <Desplegable titulo="Ver el dibujo de la planta">{dibujo}</Desplegable>
        </>
      ) : <>{dibujo}{listas}</>}

      {nivel === 'ingenieria' && (
        <Desplegable titulo="Capacidad por tren" pie="uso de cada tren contra su capacidad">
          <Panel titulo="CAPACIDAD POR TREN">
            {([['Crudo', cfg.caudales.crudo, cfg.caudales.crudoCap, 'bbl/d', 'crudo'],
               ['Agua', cfg.caudales.agua, cfg.caudales.aguaCap, 'bbl/d de agua', 'agua']] as const).map(([nombre, v, cap, u, c]) => {
              const pct = (v / cap) * 100
              return (
                <Tip key={nombre} titulo={`Tren de ${nombre.toLowerCase()}`} className="mb-2.5"
                  pista={pct > 90 ? 'Por encima del 90 % no queda margen para una parada parcial' : undefined}
                  filas={[['Caudal ahora', `${n0(v)} ${u}`], ['Capacidad', `${n0(cap)} ${u}`], ['Uso', `${n1(pct)} %`], ['Holgura', `${n0(cap - v)} ${u}`]]}>
                  <div className="flex justify-between text-[11.5px]">
                    <span>{nombre}</span>
                    <span className={cn('tabular', pct > 90 && 'font-semibold')}><FueraDeMeta si={pct > 90} tamano={11} />{n1(pct)} %</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-sm border border-[var(--linea2)] bg-[var(--panel2)]">
                    <i className="block h-full" style={{ width: `${Math.min(pct, 100)}%`, background: COLOR[c] }} />
                  </div>
                  <small className="tabular text-[10px] text-[var(--tinta3)]">{n0(v)} de {n0(cap)} {u}</small>
                </Tip>
              )
            })}
          </Panel>
        </Desplegable>
      )}
    </>
  )
}

/** Un bloque que se abre con un clic. Lo de adentro solo se arma al abrirlo:
 *  cerrado no ocupa nada, ni siquiera para el navegador. */
function Desplegable({ titulo, pie, children }: { titulo: string; pie?: string; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="mb-2.5">
      <button onClick={() => setAbierto(v => !v)} aria-expanded={abierto}
        className="mb-2 flex w-full cursor-pointer items-center gap-2 rounded border border-[var(--linea)] bg-[var(--panel)] px-3 py-2 text-left text-[12px] shadow-[var(--sombra)] hover:bg-[var(--elevado)]">
        <b className="flex-1">{titulo}</b>
        {pie && <span className="text-[10.5px] text-[var(--tinta3)]">{pie}</span>}
        <span className={cn('text-[10px] text-[var(--tinta3)]', abierto && 'rotate-180')}>▾</span>
      </button>
      {abierto && children}
    </div>
  )
}
