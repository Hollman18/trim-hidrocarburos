import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Crosshair, Plug } from 'lucide-react'
import { useApp, useCampo, usePlanta, usePerfil, useRango, useRol, useNivel } from '@/app/store'
import { useBarrilesDeEquipos, useEstadoCampos, useCtx, usePrediccion } from '@/shared/api/diferidos'
import type { EquipoEnCampo } from '@/entities/equipos'
import { useEquiposDeHoy, pedirPerfilesBomba } from '@/shared/api/equipos'
import { useCampoAhora } from '@/shared/api/medicion'
import { NOMBRE_GAS, tanqueDe } from '@/entities/configuracion'
import { armar, NOMBRE_CORRIENTE, type PlantaCampo, type Corriente, type Elemento, type Simbolo } from '@/entities/planta'
import { Glifo } from '@/widgets/planta/Simbolos'
import { Panel, Boton, Chip, Hueco } from '@/shared/ui/primitivas'
import { Lectura } from '@/shared/ui/Lectura'
import { ComoSeLee } from '@/shared/ui/comoSeLee'
import { Tip } from '@/shared/ui/Tip'
import { Info } from '@/shared/ui/Info'
import { BarraMeta } from '@/shared/ui/BarraMeta'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, n1, num, plural, sinLectura } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { cn } from '@/shared/lib/cn'
import type { Severidad } from '@/entities/tipos'
import { MarcaPrioridad, FueraDeMeta } from '@/shared/ui/Prioridad'
import { NOMBRE_PRIORIDAD } from '@/shared/lib/prioridad'
import { pantallaVisible } from '@/shared/config/producto'
import { TuberiaDelCampo } from '@/widgets/choke/Tuberia'

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
/** ISA-18.2: lo que anticipa una alarma no se tapa. El tanque de agua (la restricción
 *  del tren de agua: lleno, se cierran los pozos) sube a la vista desde estos puntos
 *  por debajo de su alto-alto (90 % → 80 %), o en cualquier nivel si la bomba de
 *  reinyección que lo vacía está detenida. Su prioridad no sale de este margen
 *  sino del llenado que calcula el motor (`tanqueSev`). */
const MARGEN_TANQUE = 10
/** Un pie más largo pisa al vecino (las cajas van cada 150 unidades). */
const PIE_MAX = 24
const recortar = (t: string) => (t.length > PIE_MAX ? `${t.slice(0, PIE_MAX - 1)}…` : t)

/** Un equipo captura datos si está instrumentado y al menos un dispositivo
 *  tiene señal. Lo demás está configurado, pero todavía no da datos. */
const captura = (eq: EquipoEnCampo | undefined) => !!eq && eq.instrumentado && eq.dispositivos.some(d => !sinLectura(d))
/** La lectura que resume un equipo: su primera variable con número. */
const lecturaClave = (eq: EquipoEnCampo) => {
  const d = eq.dispositivos.find(x => typeof x.valor === 'number' && !sinLectura(x))
  return d ? `${d.tag} ${num(d.valor)} ${d.unidad}`.trim() : undefined
}

/** Lo que se escribe del estado (ISA-101: lo normal no se escribe). En marcha,
 *  solo lo que acompaña a la marcha («degradado», «succión cayendo»); detenido o
 *  sin lectura, el estado entero. El estado completo queda en el globo y en el lector. */
const estadoCorto = (eq: EquipoEnCampo) =>
  eq.marcha === 'en-marcha' ? eq.estado.split(' · ').slice(1).join(' · ') : eq.estado

/** Una fila de las listas: un equipo con su ficha o el tanque de agua (que se lee por su transmisor). */
interface Fila {
  id: string; etiqueta: string; nodo: string; eq?: EquipoEnCampo; estado: string; lectura?: string; sev: Severidad; abrir?: string
  /** El tanque de agua: su nivel contra el alto-alto, en % (va como barra). */
  nivel?: { pct: number; altoAlto: number }
  /** Con la bomba detenida: cuándo llega al alto-alto con el agua que entra, o que no sube. */
  aviso?: string
}

const angosto = '(max-width: 639px)'
const suscribir = (cb: () => void) => { const m = matchMedia(angosto); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) }

/** La planta del campo: el dibujo de lo que el campo tiene (según su perfil),
 *  y encima de todo, lo que de verdad se está midiendo. Lo que captura datos
 *  va lleno; lo configurado sin datos, tenue y punteado: es lo que falta por
 *  instrumentar. Los pasos de proceso y los límites de batería van sin caja.
 *
 *  Arriba del esquema va «La tubería del campo» (U2 §2.4): el esquema es el
 *  dibujo de los equipos y la tubería, su resumen en cuatro tramos. Los dos se
 *  enlazan, y el tren de agua lleva a «La tubería del agua» (U2 §5.7). */
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
  const verAgua = rol.pantallas.includes('agua') && pantallaVisible('agua')
  // La tubería y el esquema se enlazan (U2 §2.4): sin animación, nada se mueve solo (U2 §2.8).
  const refTuberia = useRef<HTMLDivElement>(null), refEsquema = useRef<HTMLDivElement>(null)
  const verTuberia = () => refTuberia.current?.scrollIntoView({ block: 'start' })
  const verEsquema = () => refEsquema.current?.scrollIntoView({ block: 'start' })

  const [destacado, setDestacado] = useState<string | null>(null)
  const refs = useRef(new Map<string, SVGGElement>())
  // Los conjuntos (pozos, tanques) van cerrados: un bloque cada uno.
  const plano = useMemo(() => armar(cfg, new Set()), [cfg])

  // El tanque de agua se lee por el transmisor que declara la configuración firmada.
  // El esquema dibuja el tren de agua de la bomba de reinyección: su tanque.
  // Cuál es esa bomba lo dice su perfil en el registro, no un id fijo.
  const reinyeccion = pedirPerfilesBomba(campoId).find(p => p.subtipo === 'inyeccion')
  const prReiny = usePrediccion(reinyeccion)
  const tanque = reinyeccion ? tanqueDe(ctx.config, campoId, reinyeccion.equipo) : undefined
  const nivelTanque = tanque && Object.hasOwn(niveles, tanque.id) ? niveles[tanque.id] : undefined

  const equipoDeHoy = useEquiposDeHoy([campoId])
  const equipoReiny = reinyeccion?.equipo
  // La bomba de reinyección vacía el tanque de agua: detenida, el tanque sube con el agua que entra.
  const bombaParada = !!equipoReiny && equipoDeHoy(equipoReiny, campoId)?.marcha === 'detenido'
  // El tren de agua sin la bomba de disposición detenida: las que siguen en
  // marcha son toda la capacidad que queda (La Ceiba: P-201A y P-201C, no las tres).
  const capFuera = bombaParada && reinyeccion?.papel === 'disposicion' ? reinyeccion.capacidadBpd : 0
  // La prioridad del tanque (ISA-18.2: la da el tiempo hasta la consecuencia, no
  // un porcentaje fijo):
  //  - en el alto-alto: P1 (hay que cerrar pozos);
  //  - con la bomba detenida: la del llenado del motor (`Prediccion.llenado`),
  //    con el agua que ENTRA ahora (los pozos que siguen produciendo, menos el
  //    respaldo), no con el colchón de «si parara con todo produciendo». Sin
  //    agua sin salida (campo cerrado, o el respaldo la toma) no sube: gris;
  //  - con la bomba en marcha: gris, por alto que esté.
  const llenado = bombaParada ? prReiny?.llenado : undefined
  const enAltoAlto = !!tanque && !!nivelTanque && nivelTanque.pct >= tanque.altoAlto * 100
  const tanqueSev: Severidad = !tanque || !nivelTanque ? 0 : enAltoAlto ? 1 : llenado?.prioridad ?? 0
  const llegaH = llenado?.colchon.horas ?? Infinity
  const avisoTanque = !llenado || enAltoAlto ? undefined
    : Number.isFinite(llegaH) ? `${equipoReiny} detenida: llega al alto-alto ${llegaH < 1 ? 'en menos de 1 h' : `en ${fmtHoras(llegaH)}`}`
      : `${equipoReiny} detenida: ${llenado.aguaEntraBpd > 0 ? 'el respaldo toma el agua que entra' : 'no entra agua'}, el nivel no sube`
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
          estado: `nivel ${n1(nivelTanque.pct)} % · alto-alto ${n0(tanque.altoAlto * 100)} %`, lectura: `${nivelTanque.tag} ${n1(nivelTanque.pct)} %`,
          nivel: { pct: nivelTanque.pct, altoAlto: tanque.altoAlto * 100 }, aviso: avisoTanque })
        // Configurado y sin lectura: el dibujo lo pinta «sin datos», así que también
        // cuenta y va en la lista de lo que falta por instrumentar, con su tag declarado.
        // «Registrado» ya lo dice el título de la lista (CONFIGURADOS SIN DATOS).
        else if (tanque) sinDatos.push({ id: tanque.id, etiqueta: tanque.nombre, nodo: el.id, sev: 0,
          estado: `sin señal · ${tanque.tagNivel}` })
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
          estado: eq ? 'sin señal' : 'sin instrumento' })
      }
      if (el.miembros?.length) porConjunto.set(el.id, { con, total: items.length })
    }
    capturan.sort((a, b) => (a.sev || 9) - (b.sev || 9) || (b.eq ? bblDe(b.eq.id, campoId) : 0) - (a.eq ? bblDe(a.eq.id, campoId) : 0))
    return { capturan, sinDatos, porConjunto }
  }, [cfg, campoId, bblDe, tanque, nivelTanque, tanqueSev, avisoTanque, equipoDeHoy])

  // Lo que está en alarma, con el tanque en alto-alto (P1 ya calculado arriba: `tanqueSev`).
  const enAlarma = capturan.filter(f => f.sev === 1)
  const tanqueCerca = (f: Fila) => !!f.nivel && (f.nivel.pct >= f.nivel.altoAlto - MARGEN_TANQUE || bombaParada)
  // Cinco a la vista y «ver N más»; una fila en alarma (prioridad 1) nunca se esconde, ni el
  // tanque cerca de su alto-alto. `prioridad` solo decide qué no se esconde: la marca no cambia.
  const listaCapturan = useVerMas(capturan, { prioridad: f => (tanqueCerca(f) ? 1 : f.sev) })
  const listaSinDatos = useVerMas(sinDatos)
  const lee = useContext(ComoSeLee)
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

  // La cifra de cobertura hace de leyenda: un cuadrito por equipo, con el mismo
  // borde que su caja en el dibujo (lleno: captura datos; punteado: sin datos).
  const cobertura = (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <b className="tabular text-[24px] leading-none">{capturan.length} de {total}</b>
      <Casillas con={capturan.length} total={total} />
      <span className="text-[12px] text-[var(--tinta2)]">equipos con datos</span>
      {/* El ⓘ va pegado a su rótulo: en el teléfono no puede quedar al comienzo de otro renglón. */}
      {pozos > 0 && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-[var(--tinta2)] print:flex-wrap print:whitespace-normal">
          + {plural(pozos, 'pozo', 'pozos')}
          <Info titulo="Pozos" texto={`Además de ${total === 1 ? 'el' : 'los'} ${plural(total, 'equipo', 'equipos')}: ${plural(pozos, 'pozo', 'pozos')}, cada uno con su controlador.`} />
        </span>
      )}
      {/* En el teléfono el dibujo va cerrado: el destino del gas (su salvedad, «no tiene tren de gas») se dice aquí. */}
      {estrecho && <span className="text-[12px] text-[var(--tinta2)]">{NOMBRE_GAS[perfil.gas]}</span>}
      {!estrecho && <Boton variante="chico" className="sm:ml-auto" onClick={verTuberia}>Ver la tubería</Boton>}
      <Info className={estrecho ? 'sm:ml-auto' : undefined} rotulo="la planta" titulo="Nota de planta" texto={cfg.nota} />
    </div>
  )

  // La leyenda completa va a «¿cómo se lee?» y al papel (en el papel no hay globos ni interruptor).
  const leyenda = (
    <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-[var(--tinta2)]">
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4 rounded-sm border border-[var(--linea)] bg-[var(--panel)]" />captura datos</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4 rounded-sm border border-dashed border-[var(--tinta3)]" />configurado, sin datos</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4" />sin caja: proceso o límite de batería</span>
      <span className="inline-flex items-center gap-1.5"><MarcaPrioridad s={1} tamano={11} decorativa />forma y color: condición anormal</span>
      <span>solo el código: en marcha, sin nada anormal</span>
      {corrientes.map(c => (
        <span key={c} className="inline-flex items-center gap-1.5">
          <svg width={22} height={6} aria-hidden><line x1={1} x2={21} y1={3} y2={3} stroke={COLOR[c]} strokeWidth={TRAZO[c].ancho} strokeDasharray={TRAZO[c].patron} /></svg>
          {NOMBRE_CORRIENTE[c]}
        </span>
      ))}
    </span>
  )

  const dibujo = (
    <Panel className="mb-2.5 min-w-0" titulo="ESQUEMA DE PLANTA" extra={NOMBRE_GAS[perfil.gas]}>
      {!estrecho && cobertura}
      <Lectura>
        Gris es normal; el color aparece solo donde hay condición anormal, siempre con su forma. Lo que captura
        datos va lleno; lo configurado que todavía no da datos va punteado: es lo que falta por instrumentar.
        Un equipo en marcha y sin nada anormal lleva solo su código; toque o pase el cursor por un equipo o
        una tubería para ver su estado y su caudal. Los caudales son los de ahora.
        {' '}{perfil.gas === 'no' ? 'Este campo no tiene tren de gas.' : 'El gas no se mide en esta fase.'}
        {leyenda}
      </Lectura>
      {!lee && <div className="solo-impresion mb-2">{leyenda}</div>}

      {/* overflow-x (no overflow): en el papel la regla de impresión lo libera y el dibujo cabe en la hoja. */}
      <div className="overflow-x-auto rounded-sm border border-[var(--linea2)] bg-[var(--panel2)]">
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
            // Bajo la caja: lo anormal y lo que falta. En marcha y sin nada anormal, solo el
            // código (el estado entero va en el globo y en el lector); el pie de un paso de
            // proceso («cabezal común», «límite de batería») pasa al globo y sale en el papel.
            // Un conjunto (P-201A/B/C) con el equipo instrumentado detenido dice cuál, no solo cuántos tienen datos.
            const conjuntoParcial = !!conjunto && conjunto.con < conjunto.total
            const detenidoEnConjunto = conjuntoParcial && vivo && eq?.marcha === 'detenido'
            const pie = esPozos ? `${plural(pozos, 'pozo', 'pozos')} · ${plural(parados, 'parado', 'parados')}`
              : esTanqueAgua ? `${nivelTanque!.tag} · ${n1(nivelTanque!.pct)} %`
                : conjuntoParcial && !detenidoEnConjunto ? `${conjunto!.con} de ${conjunto!.total} con datos`
                  : vivo && eq ? recortar(eq.marcha === 'en-marcha'
                    ? (estadoCorto(eq) ? `${eq.id} · ${estadoCorto(eq)}` : eq.id)
                    : `${eq.id} · ${eq.estado.split(' · ')[0]}`)
                    : proceso ? '' : 'sin datos'
            const pieProceso = proceso && !pie ? n.pie ?? 'proceso' : ''
            const leido = esTanqueAgua ? `${nivelTanque!.tag} · nivel ${n1(nivelTanque!.pct)} %${avisoTanque ? ` · ${avisoTanque}` : ''}`
              : detenidoEnConjunto ? `${eq!.id} · ${eq!.estado} · ${conjunto!.con} de ${conjunto!.total} con datos`
                : !esPozos && vivo && eq && !conjuntoParcial ? `${eq.id} · ${eq.estado}` : pie
            const filas: Array<[string, string]> = esPozos
              ? [['Pozos', `${n0(pozos)} con su controlador`], ['Parados ahora', n0(parados)]]
              : esTanqueAgua ? [['Nivel', `${n1(nivelTanque!.pct)} %`], ['Alto-alto', `${n0(tanque!.altoAlto * 100)} %`], ...(avisoTanque ? [['Sube', avisoTanque] as [string, string]] : []), ['Transmisor', nivelTanque!.tag], ['Capacidad', `${n0(tanque!.capacidadBbl)} bbl`]]
                : vivo && eq
                  ? [['Estado', eq.estado], ['Criticidad', `${eq.criticidad}/5`], ['Aguas abajo', eq.aguasAbajo],
                     ...(clave ? [['Lectura', clave] as [string, string]] : []),
                     ...(conjunto && conjunto.con < conjunto.total ? [['Con datos', `${conjunto.con} de ${conjunto.total}`] as [string, string]] : []),
                     ...(n.pmo ? [['Punto de medición', n.pmo] as [string, string]] : []),
                     [`Diferido · ${rango.nombre.toLowerCase()}`, bblDe(eq.id, campoId) ? `${n0(bblDe(eq.id, campoId))} bbl` : 'no ha diferido']]
                  // «sin instrumentar» (lo monta así el esquema del administrador) no es un tipo.
                  : proceso ? [['Tipo', pieProceso && pieProceso !== 'sin instrumentar' ? pieProceso : 'proceso o límite de batería'], ['Datos', 'no tiene instrumento propio']]
                    : [['Datos', 'configurado, sin datos todavía'], ['Qué falta', n.id === 'tanqueAgua' && tanque ? `que su transmisor de nivel (${tanque.tagNivel}) dé señal` : eq ? 'que su instrumento dé señal' : 'montar el instrumento y declarar su tag']]
            const clicPozos = esPozos && verPozos
            const clicable = clicPozos || (!esPozos && !esTanqueAgua && !!(vivo && eq))
            return (
              <Tip key={n.id} as="g" data-nodo={n.id} titulo={n.etiqueta}
                // El nodo que se abre se anuncia como botón, con el equipo y su estado.
                role={clicable ? 'button' : undefined}
                aria-label={clicable ? `${n.etiqueta}: ${leido}${sev ? ` · ${NOMBRE_PRIORIDAD[sev]}` : ''}. ${clicPozos ? 'Abre los pozos uno por uno' : 'Abre el equipo'}` : undefined}
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
                  {pie && <text y={76} fontSize={12.5} textAnchor="middle" fill="var(--tinta2)" className="font-mono">{pie}</text>}
                  {pieProceso && <text y={76} fontSize={12.5} textAnchor="middle" fill="var(--tinta2)" className="solo-impresion font-mono">{pieProceso}</text>}
                </g>
              </Tip>
            )
          })}
        </svg>
      </div>
    </Panel>
  )

  const ubicarBoton = (f: Fila) => !estrecho && (
    <Boton variante="chico" onClick={() => ubicar(f.nodo)} aria-label={`Ubicar ${f.etiqueta} en el dibujo`} title="Ubicar en el dibujo">
      <Crosshair className="inline size-3.5" aria-hidden />
    </Boton>
  )

  /** Una fila de lo que captura datos: el equipo, lo anormal de su estado, su lectura y lo que ha diferido. */
  const filaCaptura = (f: Fila) => {
    const corto = f.eq ? estadoCorto(f.eq) : ''
    const bbl = f.eq ? bblDe(f.eq.id, campoId) : 0
    const nombre = f.eq && !f.etiqueta.startsWith(f.eq.id) ? `${f.eq.id} · ${f.etiqueta}` : f.etiqueta
    return (
      <div key={f.id} className="flex items-center gap-2 border-b border-[var(--linea2)] py-2 last:border-0">
        <MarcaPrioridad s={f.sev} tamano={12} />
        {f.abrir ? (
          // Lo normal no se escribe («en marcha»): el lector oye el estado entero.
          <button onClick={() => abrir(f.abrir!)} className="min-w-0 flex-1 cursor-pointer text-left hover:underline"
            aria-label={`${nombre}: ${[f.estado, f.lectura, bbl > 0 ? `${n0(bbl)} bbl diferidos` : ''].filter(Boolean).join(' · ')}`}>
            <b className="block truncate text-[12.5px] leading-tight">{nombre}</b>
            <small className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-[var(--tinta3)]">
              {/* Si se escribe es porque es anormal: siempre con el mismo énfasis. */}
              {corto && <Chip tono="fuerte">{corto}</Chip>}
              {f.lectura && <span className="tabular">{f.lectura}</span>}
              {bbl > 0 && <span className="tabular">{f.lectura ? '· ' : ''}{n0(bbl)} bbl diferidos</span>}
            </small>
          </button>
        ) : (
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[12.5px] leading-tight">{f.id} · {f.etiqueta}</b>
            {f.nivel ? (
              <span className="mt-0.5 block max-w-[320px]">
                <BarraMeta tamano="chica" rotulo="nivel" valor={f.nivel.pct} unidad="%" formato={v => `${n1(v)} %`}
                  meta={f.nivel.altoAlto} tipoMeta="máximo" rotuloMeta={`alto-alto ${n0(f.nivel.altoAlto)} %`} />
                {f.aviso && <small className="block text-[10.5px] text-[var(--tinta2)]">{f.aviso}</small>}
              </span>
            ) : <small className="block truncate text-[10.5px] text-[var(--tinta3)]">{f.estado}</small>}
          </span>
        )}
        {ubicarBoton(f)}
      </div>
    )
  }

  /** Una fila de lo configurado sin datos: el equipo y lo que le falta («sin señal», «sin instrumento»). */
  const filaSinDatos = (f: Fila) => (
    <div key={f.id} className="flex items-center gap-2 border-b border-[var(--linea2)] py-2 last:border-0">
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <b className="truncate text-[12.5px] leading-tight text-[var(--tinta2)]">{f.eq && !f.etiqueta.startsWith(f.eq.id) ? `${f.eq.id} · ` : ''}{f.etiqueta}</b>
        <Chip>{f.estado}</Chip>
      </span>
      {ubicarBoton(f)}
    </div>
  )

  const listas = (
    <div className="mb-2.5 grid items-start gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
      <Panel titulo="CAPTURANDO DATOS" extra={plural(capturan.length, 'equipo', 'equipos')}>
        <Lectura>Lo que se está midiendo ahora, lo anormal primero. Un clic abre el equipo; la mira (⌖) lo marca en el dibujo. Lo normal no se escribe: solo la lectura.</Lectura>
        {listaCapturan.visibles.map(filaCaptura)}
        {listaCapturan.resto.length > 0 && <div className="solo-impresion">{listaCapturan.resto.map(filaCaptura)}</div>}
        <VerMas ocultas={listaCapturan.ocultas} abierto={listaCapturan.abierto} onAlternar={listaCapturan.alternar} />
      </Panel>

      <Panel titulo="CONFIGURADOS SIN DATOS" extra={sinDatos.length ? plural(sinDatos.length, 'equipo', 'equipos') : 'ninguno'}>
        <Lectura>Están en el registro del campo, pero todavía no dan datos: es lo que falta por instrumentar. «Sin señal»: su instrumento está declarado y no da señal. «Sin instrumento»: falta montarlo y declarar su tag.</Lectura>
        {sinDatos.length === 0 && <p className="text-[12px] text-[var(--tinta2)]">Todo lo configurado captura datos.</p>}
        {listaSinDatos.visibles.map(filaSinDatos)}
        {listaSinDatos.resto.length > 0 && <div className="solo-impresion">{listaSinDatos.resto.map(filaSinDatos)}</div>}
        <VerMas ocultas={listaSinDatos.ocultas} abierto={listaSinDatos.abierto} onAlternar={listaSinDatos.alternar} />
        {sinDatos.length > 0 && rol.pantallas.includes('conectores') && (
          <Boton className="mt-2 w-full" onClick={() => setPantalla('conectores')}><Plug className="mr-1 inline size-3.5" aria-hidden />Conectores y tags</Boton>
        )}
      </Panel>
    </div>
  )

  const bblAlarma = enAlarma.reduce((a, f) => a + (f.eq ? bblDe(f.eq.id, campoId) : 0), 0)
  const codigo = (f: Fila) => f.eq?.id ?? f.id

  return (
    <>
      {/* Lo anormal arriba, en una línea: cuántos, cuánto han diferido y un botón por equipo
          (el tanque en alto-alto también: se ubica en el dibujo, no tiene ficha). Sus nombres van
          en la lista de abajo (una fila en alarma nunca se esconde) y en el papel. */}
      {enAlarma.length > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded border border-[var(--p1)] bg-[var(--p1-f)] px-3 py-2">
          <MarcaPrioridad s={1} tamano={18} />
          <b className="min-w-0 flex-1 text-[13px] leading-tight text-[var(--p1)]">
            {/* El período lo dicen la cabecera y el membrete del papel. */}
            {enAlarma.length} {enAlarma.length === 1 ? 'detenido o en alarma' : 'detenidos o en alarma'} · <span className="tabular">{n0(bblAlarma)}</span> bbl diferidos
          </b>
          <span className="flex flex-wrap gap-1.5">
            {enAlarma.filter(f => f.abrir || !estrecho).map((f, i) => (
              <Boton key={f.id} variante={i === 0 ? 'principal' : 'normal'} onClick={() => (f.abrir ? abrir(f.abrir) : ubicar(f.nodo))}
                aria-label={f.abrir ? `Abrir ${codigo(f)} · ${f.etiqueta}` : `Ubicar ${f.etiqueta} en el dibujo`} title={f.etiqueta}>{codigo(f)}</Boton>
            ))}
          </span>
          <span className="solo-impresion basis-full text-[9pt] text-[var(--tinta2)]">{enAlarma.map(f => `${codigo(f)} · ${f.etiqueta}`).join(' — ')}</span>
        </div>
      )}

      <div ref={refTuberia}>
        <TuberiaDelCampo campoId={campoId} desde={rango.desde} hasta={rango.hasta} periodo={rango.nombre} onUbicarPlanta={estrecho ? undefined : verEsquema} />
      </div>

      {/* En el teléfono el dibujo no se lee: primero las listas, y el dibujo a un clic. */}
      {estrecho ? (
        <>
          <div className="mb-2.5 rounded border border-[var(--linea)] bg-[var(--panel)] p-3 shadow-[var(--sombra)]">{cobertura}</div>
          {listas}
          <Desplegable titulo="Ver el esquema">{dibujo}</Desplegable>
        </>
      ) : <><div ref={refEsquema}>{dibujo}</div>{listas}</>}

      {nivel === 'ingenieria' && (
        <Desplegable titulo="Capacidad por tren" imprimir>
          <Panel>
            {([['Crudo', cfg.caudales.crudo, cfg.caudales.crudoCap, 0, 'bbl/d', 'crudo'],
               ['Agua', cfg.caudales.agua, cfg.caudales.aguaCap - capFuera, capFuera, 'bbl/d de agua', 'agua']] as const).map(([nombre, v, cap, fuera, u, c]) => {
              const pct = (v / cap) * 100
              return (
                <Tip key={nombre} titulo={`Tren de ${nombre.toLowerCase()}`} className="mb-2.5"
                  pista={pct > 90 ? 'Por encima del 90 % no queda margen para una parada parcial' : undefined}
                  filas={[['Caudal ahora', `${n0(v)} ${u}`],
                    ['Capacidad', fuera > 0 ? `${n0(cap)} ${u} sin ${equipoReiny} (detenida); ${n0(cap + fuera)} con todo el tren` : `${n0(cap)} ${u}`],
                    ['Uso', `${n1(pct)} %`], ['Holgura', `${n0(cap - v)} ${u}`]]}>
                  <div className="flex justify-between text-[11.5px]">
                    <span>{nombre}</span>
                    <span className={cn('tabular', pct > 90 && 'font-semibold')}><FueraDeMeta si={pct > 90} tamano={11} />{n1(pct)} %</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-sm border border-[var(--linea2)] bg-[var(--panel2)]">
                    <i className="block h-full" style={{ width: `${Math.min(pct, 100)}%`, background: COLOR[c] }} />
                  </div>
                  <small className="tabular text-[10px] text-[var(--tinta3)]">{n0(v)} de {n0(cap)} {u}{fuera > 0 ? ` · sin ${equipoReiny}, detenida` : ''}</small>
                </Tip>
              )
            })}
            {verAgua && <Boton variante="chico" onClick={() => setPantalla('agua')}>Ver la tubería del agua</Boton>}
          </Panel>
        </Desplegable>
      )}
    </>
  )
}

/** Un bloque que se abre con un clic. Lo de adentro solo se arma al abrirlo:
 *  cerrado no ocupa nada, ni siquiera para el navegador. El botón no se imprime
 *  (en el papel es un control muerto); con `imprimir`, el papel trae el título y
 *  lo de adentro aunque esté cerrado (el informe es la pantalla impresa). */
function Desplegable({ titulo, imprimir, children }: { titulo: string; imprimir?: boolean; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="mb-2.5">
      <button onClick={() => setAbierto(v => !v)} aria-expanded={abierto}
        className="no-imprimir mb-2 flex w-full cursor-pointer items-center gap-2 rounded border border-[var(--linea)] bg-[var(--panel)] px-3 py-2 text-left text-[12px] shadow-[var(--sombra)] hover:bg-[var(--elevado)]">
        <b className="flex-1">{titulo}</b>
        <span className={cn('text-[10px] text-[var(--tinta3)]', abierto && 'rotate-180')}>▾</span>
      </button>
      {imprimir && <b className="solo-impresion mb-1 text-[11px]">{titulo}</b>}
      {abierto ? children : imprimir && <div className="solo-impresion">{children}</div>}
    </div>
  )
}

/** Un cuadrito por equipo configurado, con el borde de su caja en el dibujo:
 *  lleno si captura datos, punteado si todavía no. La cifra «9 de 11» se ve
 *  y a la vez enseña cómo se lee el dibujo. El lector oye la cifra. */
function Casillas({ con, total }: { con: number; total: number }) {
  return (
    // Lleno o punteado, en gris (ISA-101: no es una alarma). A este tamaño, un cuadro
    // blanco con borde no se distingue del punteado: el lleno va relleno.
    <span aria-hidden className="inline-flex flex-wrap gap-[3px]">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={cn('inline-block h-3.5 w-2.5 rounded-[2px] border',
          i < con ? 'border-[var(--tinta3)] bg-[var(--tinta3)]' : 'border-dashed border-[var(--tinta3)]')} />
      ))}
    </span>
  )
}
