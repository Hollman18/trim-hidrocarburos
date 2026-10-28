import { useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ChevronRight, Plug } from 'lucide-react'
import { useApp, useCampo, usePlanta, usePerfil, useRango, useRol } from '@/app/store'
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
import { Barra, Esquema, Linea, MuestraFluido, type Fluido } from '@/shared/ui/scada'
import { VerMas } from '@/shared/ui/VerMas'
import { useVerMas } from '@/shared/ui/listaCorta'
import { n0, n1, num, plural, sinLectura } from '@/shared/lib/formato'
import { fmtHoras } from '@/widgets/bombas/comun'
import { cn } from '@/shared/lib/cn'
import type { Severidad } from '@/entities/tipos'
import { MarcaCondicion } from '@/shared/ui/Prioridad'
import { PALABRA_CONDICION, type CondicionFranja } from '@/shared/api/equiposTecnico'
import { useCondiciones, rangoCondicion } from '@/widgets/pozos/estado'

/** K3 · Cada corriente es una línea por fluido del kit SCADA (kit-scada.md §4, `TRAZO_FLUIDO`): el
 *  fluido se distingue por el trazo, no por el color (ISA-101): la línea principal es más gruesa, el
 *  gas va a trazos, el agua punteada; todas en --dato1 y, sin flujo, tenues. */
const FLUIDO: Record<Corriente, Fluido> = {
  multi: 'multifasico', crudo: 'crudo', gas: 'gas', agua: 'agua', elec: 'electrica', aire: 'aire',
}
/** El color del borde de una caja con condición: el de su marca (X2 §4; el rojo, solo el interlock). */
const COLOR_CONDICION: Record<CondicionFranja, string> = {
  interlock: 'var(--interlock)', alarma: 'var(--p1)', atencion: 'var(--p2)', aviso: 'var(--p3)', 'sin-comunicacion': 'var(--sincom)',
}
/** La prioridad del llenado del tanque (la da el motor: `Prediccion.llenado`), dicha como condición. */
const DE_SEVERIDAD: Record<Severidad, CondicionFranja | undefined> = { 0: undefined, 1: 'alarma', 2: 'atencion', 3: 'aviso' }
/** A18 · El desplazamiento suave solo si quien mira no pidió menos movimiento (WCAG 2.3.3; X2 M1). */
const comportamiento = (): ScrollBehavior => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')
/** Lo que es límite de batería o paso de proceso sin máquina propia: se
 *  dibuja sin caja y no cuenta como equipo que debería capturar datos. */
const SOLO_PROCESO: Simbolo[] = ['salida', 'manifold', 'tea', 'inyeccion', 'pozos']
/** El dibujo nunca se encoge más que esto: por debajo, la letra no se lee. */
const ESCALA_MINIMA = 0.7
/** C4 · La letra del esquema, en unidades del dibujo: como el dibujo nunca baja de
 *  `ESCALA_MINIMA`, 17,5 unidades nunca son menos de 12 px (X5 §3.4; antes iba de 9 a 10,5 px a 1440). */
const LETRA = 17.5, LETRA_NOMBRE = 18
/** El nombre de un equipo del esquema en renglones de 18 caracteres o menos; dos como mucho. */
const partirNombre = (t: string): string[] => {
  if (t.length <= 18) return [t]
  const palabras = t.split(' ')
  let a = ''
  while (palabras.length && (a ? `${a} ${palabras[0]}` : palabras[0]!).length <= 18) a = a ? `${a} ${palabras.shift()}` : palabras.shift()!
  if (!a) return [`${t.slice(0, 17)}…`]
  const b = palabras.join(' ')
  return b ? [a, b.length > 18 ? `${b.slice(0, 17)}…` : b] : [a]
}
/** ISA-18.2: lo que anticipa una alarma no se tapa. El tanque de agua (la restricción
 *  del tren de agua: lleno, se cierran los pozos) sube a la vista desde estos puntos
 *  por debajo de su alto-alto (90 % → 80 %), o en cualquier nivel si la bomba de
 *  reinyección que lo vacía está detenida. Su prioridad no sale de este margen
 *  sino del llenado que calcula el motor (`tanqueSev`). */
const MARGEN_TANQUE = 10
/** Un pie más largo pisa al vecino (las cajas van cada 150 unidades). */
// C4 · Con la letra de 12 px, 20 caracteres de pie caben entre dos equipos y dentro del dibujo.
const PIE_MAX = 20
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
  id: string; etiqueta: string; nodo: string; eq?: EquipoEnCampo; estado: string; lectura?: string
  /** La condición del equipo: la de la franja, una por equipo y la misma en todas partes (H3). */
  cond?: CondicionFranja
  abrir?: string
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
  if (!plantaCfg) return <Panel titulo={`Planta de ${campo.nombre}`}><Hueco>{campo.nombre} no tiene esquema de planta registrado.</Hueco></Panel>
  return <PlantaDelCampo plantaCfg={plantaCfg} />
}

function PlantaDelCampo({ plantaCfg }: { plantaCfg: PlantaCampo }) {
  const campo = useCampo(); const rol = useRol(); const perfil = usePerfil(); const ctx = useCtx()
  const campoId = useApp(s => s.campoId), abrirEquipo = useApp(s => s.abrirEquipo), setPantalla = useApp(s => s.setPantalla)
  const rango = useRango()
  const estrecho = useSyncExternalStore(suscribir, () => matchMedia(angosto).matches)
  const bblDe = useBarrilesDeEquipos({ campos: [campoId], desde: rango.desde, hasta: rango.hasta })
  const estadoCampo = useEstadoCampos([campoId])[0]
  // Crudo y agua: lo que producen los pozos ahora. El gas no se mide en esta fase.
  const { caudales, niveles } = useCampoAhora(campoId)
  const cfg = useMemo(() => ({ ...plantaCfg, caudales: { ...plantaCfg.caudales, ...caudales } }), [plantaCfg, caudales])
  const verPozos = rol.pantallas.includes('pozos')
  const refEsquema = useRef<HTMLDivElement>(null)

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
  // F3 · La condición de cada equipo es la de la franja (H3): la caja, la fila y la tubería dicen la misma.
  const condicionDe = useCondiciones([campoId])
  const equipoReiny = reinyeccion?.equipo
  // La bomba de reinyección vacía el tanque de agua: detenida, el tanque sube con el agua que entra.
  const bombaParada = !!equipoReiny && equipoDeHoy(equipoReiny, campoId)?.marcha === 'detenido'
  // El tren de agua sin la bomba de disposición detenida: las que siguen en
  // marcha son toda la capacidad que queda (La Ceiba: P-201A y P-201C, no las tres).
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
        if (tanque && nivelTanque) capturan.push({ id: tanque.id, etiqueta: tanque.nombre, nodo: el.id, cond: DE_SEVERIDAD[tanqueSev],
          estado: `nivel ${n1(nivelTanque.pct)} % · alto-alto ${n0(tanque.altoAlto * 100)} %`, lectura: `${nivelTanque.tag} ${n1(nivelTanque.pct)} %`,
          nivel: { pct: nivelTanque.pct, altoAlto: tanque.altoAlto * 100 }, aviso: avisoTanque })
        // Configurado y sin lectura: el dibujo lo pinta «sin datos», así que también
        // cuenta y va en la lista de lo que falta por instrumentar, con su tag declarado.
        // «Registrado» ya lo dice el título de la lista (CONFIGURADOS SIN DATOS).
        else if (tanque) sinDatos.push({ id: tanque.id, etiqueta: tanque.nombre, nodo: el.id,
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
          capturan.push({ id: it.id, etiqueta: it.etiqueta, nodo: el.id, eq, cond: condicionDe(campoId, eq!.id), abrir: eq!.id,
            estado: eq!.estado, lectura: lecturaClave(eq!) })
        } else sinDatos.push({ id: it.id, etiqueta: it.etiqueta, nodo: el.id, eq,
          estado: eq ? 'sin señal' : 'sin instrumento' })
      }
      if (el.miembros?.length) porConjunto.set(el.id, { con, total: items.length })
    }
    capturan.sort((a, b) => rangoCondicion(a.cond) - rangoCondicion(b.cond) || (b.eq ? bblDe(b.eq.id, campoId) : 0) - (a.eq ? bblDe(a.eq.id, campoId) : 0))
    return { capturan, sinDatos, porConjunto }
  }, [cfg, campoId, bblDe, tanque, nivelTanque, tanqueSev, avisoTanque, equipoDeHoy, condicionDe])

  // Lo que está en alarma, con el tanque en alto-alto (P1 ya calculado arriba: `tanqueSev`).
  const urgente = (c?: CondicionFranja) => c === 'alarma' || c === 'interlock'
  const tanqueCerca = (f: Fila) => !!f.nivel && (f.nivel.pct >= f.nivel.altoAlto - MARGEN_TANQUE || bombaParada)
  // Cinco a la vista y «ver N más»; una fila en alarma (prioridad 1) nunca se esconde, ni el
  // tanque cerca de su alto-alto. `prioridad` solo decide qué no se esconde: la marca no cambia.
  const listaCapturan = useVerMas(capturan, { prioridad: f => (tanqueCerca(f) || urgente(f.cond) ? 1 : 9) })
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
    refs.current.get(id)?.scrollIntoView({ behavior: comportamiento(), block: 'nearest', inline: 'center' })
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
  // C4 · El caudal de cada corriente va en un renglón sobre el dibujo, con la muestra
  // de su trazo: dentro del dibujo, con la letra de 12 px, el rótulo era más ancho que
  // el hueco entre dos equipos y los tapaba. Una tubería que sale de un equipo
  // detenido sigue diciendo «sin flujo» en su lugar.
  const corrientes = (['multi', 'crudo', 'gas', 'agua'] as Corriente[]).filter(c => plano.lineas.some(l => l.corriente === c))
  const total = capturan.length + sinDatos.length

  // La cifra de cobertura hace de leyenda: un cuadrito por equipo, con el mismo
  // borde que su caja en el dibujo (lleno: captura datos; punteado: sin datos).
  const cobertura = (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <b className="tabular text-[24px] leading-none">{capturan.length} de {total}</b>
      <Casillas con={capturan.length} total={total} />
      <span className="text-[14px] text-[var(--tinta2)]">equipos con datos</span>
      {/* El ⓘ va pegado a su rótulo: en el teléfono no puede quedar al comienzo de otro renglón. */}
      {pozos > 0 && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[14px] text-[var(--tinta2)] print:flex-wrap print:whitespace-normal">
          + {plural(pozos, 'pozo', 'pozos')}
          <Info titulo="Pozos" texto={`Además de ${total === 1 ? 'el' : 'los'} ${plural(total, 'equipo', 'equipos')}: ${plural(pozos, 'pozo', 'pozos')}, cada uno con su controlador.`} />
        </span>
      )}
      {/* En el teléfono el dibujo va cerrado: el destino del gas (su salvedad, «no tiene tren de gas») se dice aquí. */}
      {estrecho && <span className="text-[14px] text-[var(--tinta2)]">{NOMBRE_GAS[perfil.gas]}</span>}
      {!estrecho && rol.pantallas.includes('plantaViva') && <Boton variante="chico" className="sm:ml-auto" onClick={() => setPantalla('plantaViva')}>Ver la tubería</Boton>}
      <Info className={estrecho ? 'sm:ml-auto' : undefined} rotulo="la planta" titulo="Nota de planta" texto={cfg.nota} />
    </div>
  )

  // La leyenda completa va a «¿cómo se lee?» y al papel (en el papel no hay globos ni interruptor).
  const leyenda = (
    <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--tinta2)]">
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4 rounded-sm border border-[var(--linea)] bg-[var(--panel)]" />captura datos</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4 rounded-sm border border-dashed border-[var(--tinta3)]" />configurado, sin datos</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-4" />sin caja: proceso o límite de batería</span>
      <span className="inline-flex items-center gap-1.5"><MarcaCondicion c="alarma" tamano={12} decorativa />forma y color: condición anormal</span>
      <span>solo el código: en marcha, sin nada anormal</span>
      {corrientes.map(c => (
        <span key={c} className="inline-flex items-center gap-1.5">
          <MuestraFluido fluido={FLUIDO[c]} />
          {NOMBRE_CORRIENTE[c]}
        </span>
      ))}
    </span>
  )

  const dibujo = (
    <Panel className="mb-3 min-w-0 sm:mb-4" titulo="Esquema de planta" extra={NOMBRE_GAS[perfil.gas]}>
      {!estrecho && cobertura}
      <p className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-[var(--tinta2)]" data-caudales>
        <span className="font-semibold text-[var(--tinta)]">Ahora:</span>
        {corrientes.map(c => (
          <span key={c} className="inline-flex items-center gap-1.5 tabular">
            <MuestraFluido fluido={FLUIDO[c]} />
            {caudal[c]}
          </span>
        ))}
      </p>
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
        {/* 12 de más abajo: el pie de los servicios (a 28 del nombre, ver `yPie`) no se sale del dibujo. */}
        {/* El esquema del kit SCADA (K3). Un grupo, no una imagen: adentro hay equipos que se abren con el
            teclado, y un role="img" los volvía mudos para el lector aunque recibieran el foco. */}
        <Esquema ancho={plano.ancho} alto={plano.alto + 12} ajuste="xMinYMin meet" grupo
          style={{ width: '100%', minWidth: Math.round(plano.ancho * ESCALA_MINIMA), height: 'auto' }} className="max-w-none overflow-hidden"
          etiqueta={`Planta de ${campo.nombre}: ${capturan.length} de ${plural(total, 'equipo', 'equipos')} capturando datos.`}>

          {plano.bandas.map(b => (
            <g key={b.titulo}>
              <rect x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} rx={10} fill="var(--dato3)" opacity={0.07} />
              {/* C4 · Toda letra del esquema mide 12 px o más a 1440 (el dibujo nunca baja de 0,7: 17,5 unidades). */}
              <text x={b.x0 + 12} y={b.y0 + 24} fontSize={LETRA} fontWeight={600} fill="var(--tinta2)">{b.titulo}</text>
            </g>
          ))}

          {plano.lineas.map(l => {
            const quieta = detenido(l.deId) || detenido(l.aId)
            const sinSalida = detenido(l.deId)
            const deSalida = sinSalida ? estado.get(l.deId) : undefined
            const condSalida = deSalida ? condicionDe(campoId, deSalida.id) : undefined
            const [sx, sy] = l.inicio
            return (
              // Lo que dice el tooltip de una tubería ya está dibujado (la línea, el
              // rótulo del caudal de su corriente, el «SIN FLUJO»): no es parada de Tab.
              <Tip key={l.id} as="g" aLaVista data-linea={l.id} titulo={`${NOMBRE_CORRIENTE[l.corriente]} · ${l.de} → ${l.a}`}
                pista={quieta ? 'Sin flujo: el equipo de aguas arriba está detenido.' : undefined}
                filas={[['Corriente', NOMBRE_CORRIENTE[l.corriente]], ['Viene de', l.de], ['Va a', l.a],
                  ['Caudal ahora', caudal[l.corriente] ?? 'sin medidor en línea'], ['Estado', quieta ? 'sin flujo' : 'corriendo']]}>
                <path d={l.d} fill="none" stroke="transparent" strokeWidth={16} strokeLinejoin="round" />
                <Linea d={l.d} fluido={FLUIDO[l.corriente]} sinFlujo={quieta} />
                {sinSalida && (
                  // ISA-101: el texto en tinta (en rojo oscuro no llegaba a 4,5:1 a 13 px)
                  // y el color solo en la forma, con la prioridad del equipo que paró.
                  <>
                    <rect x={sx - 64} y={sy - 15} width={128} height={30} rx={6} fill="var(--panel)"
                      stroke={condSalida ? COLOR_CONDICION[condSalida] : 'var(--linea)'} strokeWidth={0.9} />
                    {condSalida && <g transform={`translate(${sx - 58},${sy - 8})`}><MarcaCondicion c={condSalida} tamano={16} decorativa /></g>}
                    <text x={condSalida ? sx + 10 : sx} y={sy + 6} fontSize={LETRA} fontWeight={600} textAnchor="middle" fill="var(--tinta)">sin flujo</text>
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
            // La condición de la caja es la del equipo (la de la franja: H3); la del tanque, la de su llenado (el motor).
            const cond = esTanqueAgua ? DE_SEVERIDAD[tanqueSev] : vivo && eq ? condicionDe(campoId, eq.id) : undefined
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
            // El nombre en uno o dos renglones de 18 caracteres: con la letra de 12 px, uno de 26 pisaba al vecino.
            const renglones = partirNombre(n.etiqueta)
            // El pie, a 28 de la línea del nombre: Firefox mide cada texto con todo el alto de su letra (≈ 1,5 veces) y a
            // 20 el pie pisaba 5 px al nombre («Tratador térmico» sobre «H-302», B4: el auditor a 1280 px en Firefox).
            const yPie = renglones.length > 1 ? 111 : 90
            const clicPozos = esPozos && verPozos
            const clicable = clicPozos || (!esPozos && !esTanqueAgua && !!(vivo && eq))
            return (
              <Tip key={n.id} as="g" data-nodo={n.id} titulo={n.etiqueta}
                // El nodo que se abre se anuncia como botón, con el equipo y su estado.
                role={clicable ? 'button' : undefined}
                aria-label={clicable ? `${n.etiqueta}: ${leido}${cond ? ` · ${PALABRA_CONDICION[cond]}` : ''}. ${clicPozos ? 'Abre los pozos uno por uno' : 'Abre el equipo'}` : undefined}
                pista={clicPozos ? 'Clic para ver los pozos uno por uno' : clicable ? 'Clic para abrir el equipo y sus dispositivos' : undefined}
                filas={filas} className={clicable ? 'nodo' : undefined}
                onClick={clicPozos ? () => setPantalla('pozos') : clicable ? () => abrir(eq!.id) : undefined}>
                <g transform={`translate(${n.x},${n.y})`} ref={(el: SVGGElement | null) => { if (el) refs.current.set(n.id, el) }}>
                  {cond === 'alarma' && <circle cx={0} cy={0} r={46} fill="none" stroke="var(--p1)" strokeWidth={2} data-anillo-alarma />}
                  {destacado === n.id && <rect x={-64} y={-48} width={128} height={96} rx={11} fill="none" stroke="var(--acento)" strokeWidth={2.4} strokeDasharray="7 5" />}
                  {!proceso && (
                    // C4 · ISA-101 (X5 §6.5; X2 §5.4): la caja no se tiñe y no lleva sombra. El equipo se ve por
                    // su brillo: en marcha, claro; detenido, más oscuro y con contorno de 2 px; sin datos, sin
                    // relleno y discontinuo. La condición va en la marca, el borde y (prioridad 1) el anillo.
                    <rect className="marco" x={-58} y={-42} width={116} height={84} rx={8} data-marcha={vivo && eq ? eq.marcha : 'sin-dato'} data-condicion={cond ?? ''}
                      fill={!vivo ? 'none' : eq?.marcha === 'detenido' ? 'var(--banda)' : 'var(--eq-marcha)'}
                      stroke={cond ? COLOR_CONDICION[cond] : eq?.marcha === 'detenido' && vivo ? 'var(--tinta)' : vivo ? 'var(--linea)' : 'var(--tinta3)'}
                      strokeWidth={cond || (vivo && eq?.marcha === 'detenido') ? 2 : vivo ? 1.2 : 1.1}
                      strokeDasharray={vivo ? undefined : '5 4'} />
                  )}
                  <g opacity={vivo ? 1 : proceso ? 0.5 : 0.45}><Glifo simbolo={n.simbolo} nivel={nivelV} fluido={n.fluido} /></g>
                  {cond && <g transform="translate(-54,-38)"><MarcaCondicion c={cond} tamano={16} etiqueta={PALABRA_CONDICION[cond]} /></g>}
                  {n.pmo && (
                    <g transform="translate(34,-32)">
                      <rect x={-34} y={-14} width={68} height={26} rx={4} fill="var(--panel2)" stroke="var(--linea)" strokeWidth={0.8} />
                      <text y={5} fontSize={LETRA} textAnchor="middle" fill="var(--tinta2)" className="font-cond">{n.pmo}</text>
                    </g>
                  )}
                  {/* El texto va a contraste completo aunque el equipo no dé datos: eso es lo que hay que leer. */}
                  <text y={62} fontSize={LETRA_NOMBRE} textAnchor="middle" fill={proceso ? 'var(--tinta2)' : 'var(--tinta)'} fontWeight={proceso ? 400 : 600}>
                    {renglones.map((r, i) => <tspan key={i} x={0} dy={i ? 21 : 0}>{r}</tspan>)}
                  </text>
                  {pie && <text y={yPie} fontSize={LETRA} textAnchor="middle" fill="var(--tinta2)">{pie}</text>}
                  {pieProceso && <text y={yPie} fontSize={LETRA} textAnchor="middle" fill="var(--tinta2)" className="solo-impresion">{pieProceso}</text>}
                </g>
              </Tip>
            )
          })}
        </Esquema>
      </div>
    </Panel>
  )

  /** UI-19 · Una fila de B (X5 §5.2): toda la fila es el blanco del toque, con «›», y una sola acción. La que tiene
   *  ficha abre el equipo; pasar el cursor o el foco por ella lo marca en el dibujo (antes, un botón «Ubicar» por
   *  fila). La que no tiene ficha (el tanque, lo que no da datos) lo ubica en el dibujo; en el teléfono, donde el
   *  dibujo va cerrado, no tiene acción. */
  const fila = (f: Fila, accion: 'abrir' | 'ubicar' | undefined, etiqueta: string, contenido: React.ReactNode, marca?: React.ReactNode) => {
    const marcar = !estrecho ? { onMouseEnter: () => setDestacado(f.nodo), onMouseLeave: () => setDestacado(null), onFocus: () => setDestacado(f.nodo), onBlur: () => setDestacado(null) } : {}
    const clase = 'flex min-h-14 w-full items-center gap-2.5 border-b border-[var(--linea2)] py-2 text-left last:border-0'
    return accion ? (
      <button key={f.id} type="button" onClick={() => (accion === 'abrir' && f.abrir ? abrir(f.abrir) : ubicar(f.nodo))} aria-label={etiqueta} data-fila-planta={f.id} {...marcar}
        className={cn(clase, 'cursor-pointer hover:bg-[var(--panel2)]/60')}>
        {marca}<span className="min-w-0 flex-1">{contenido}</span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--tinta3)]" />
      </button>
    ) : <div key={f.id} className={clase} data-fila-planta={f.id}>{marca}<span className="min-w-0 flex-1">{contenido}</span></div>
  }
  const marcaDe = (f: Fila) => (f.cond ? <MarcaCondicion c={f.cond} tamano={12} decorativa /> : <i aria-hidden className="inline-block w-3 shrink-0" />)

  /** Una fila de lo que captura datos: el equipo, su condición, lo anormal de su estado, su lectura y lo que ha diferido. */
  const filaCaptura = (f: Fila) => {
    const corto = f.eq ? estadoCorto(f.eq) : ''
    const bbl = f.eq ? bblDe(f.eq.id, campoId) : 0
    const nombre = f.eq && !f.etiqueta.startsWith(f.eq.id) ? `${f.eq.id} · ${f.etiqueta}` : f.etiqueta
    const palabra = f.cond ? PALABRA_CONDICION[f.cond] : ''
    if (f.abrir) return fila(f, 'abrir',
      // Lo normal no se escribe («en marcha»): el lector oye el estado entero.
      `${nombre}: ${[palabra, f.estado, f.lectura, bbl > 0 ? `${n0(bbl)} bbl diferidos` : ''].filter(Boolean).join(' · ')}`,
      <>
        <b className="block truncate text-[15px] leading-tight">{nombre}</b>
        <small className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[14px] text-[var(--tinta2)]">
          {palabra && <b className="font-semibold text-[var(--tinta)]">{palabra}</b>}
          {/* Si se escribe es porque es anormal: siempre con el mismo énfasis. */}
          {corto && <Chip tono="fuerte">{corto}</Chip>}
          {f.lectura && <span className="tabular">{f.lectura}</span>}
          {bbl > 0 && <span className="tabular">{f.lectura ? '· ' : ''}{n0(bbl)} bbl diferidos</span>}
        </small>
      </>, marcaDe(f))
    return fila(f, estrecho ? undefined : 'ubicar', `Ubicar ${f.etiqueta} en el dibujo`,
      <>
        <b className="block truncate text-[15px] leading-tight">{f.id} · {f.etiqueta}</b>
        {palabra && <small className="block text-[14px] font-semibold">{palabra}</small>}
        {f.nivel ? (
          <span className="mt-0.5 block max-w-[320px]">
            {/* El nivel con la barra del kit SCADA (§1): la escala del instrumento (0 a 100 %) y el alto-alto como su
                límite. La condición del tanque la lleva la fila (su marca y su palabra), una sola vez. */}
            <Barra nombre={`Nivel de ${f.etiqueta}`} valor={f.nivel.pct} unidad="%" decimales={1}
              escala={{ min: 0, max: 100, firmada: true }} alarmas={[f.nivel.altoAlto]} ancho={168} />
            <small className="tabular block text-[13px] text-[var(--tinta2)]">alto-alto {n0(f.nivel.altoAlto)} %</small>
            {f.aviso && <small className="block text-[14px] text-[var(--tinta2)]">{f.aviso}</small>}
          </span>
        ) : <small className="block truncate text-[14px] text-[var(--tinta2)]">{f.estado}</small>}
      </>, marcaDe(f))
  }

  /** Una fila de lo configurado sin datos: el equipo y lo que le falta («sin señal», «sin instrumento»). */
  const filaSinDatos = (f: Fila) => fila(f, estrecho ? undefined : 'ubicar', `Ubicar ${f.etiqueta} en el dibujo: ${f.estado}`,
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <b className="truncate text-[15px] leading-tight text-[var(--tinta2)]">{f.eq && !f.etiqueta.startsWith(f.eq.id) ? `${f.eq.id} · ` : ''}{f.etiqueta}</b>
      <Chip>{f.estado}</Chip>
    </span>)

  const listas = (
    <div className="mb-3 grid items-start gap-3 sm:mb-4 sm:gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
      <Panel titulo="Capturando datos" extra={plural(capturan.length, 'equipo', 'equipos')}>
        <Lectura>Lo que se está midiendo ahora, lo anormal primero. Un clic abre el equipo; con el cursor o el foco encima, se marca en el dibujo. Lo normal no se escribe: solo la lectura.</Lectura>
        {listaCapturan.visibles.map(filaCaptura)}
        {listaCapturan.resto.length > 0 && <div className="solo-impresion">{listaCapturan.resto.map(filaCaptura)}</div>}
        <VerMas ocultas={listaCapturan.ocultas} abierto={listaCapturan.abierto} onAlternar={listaCapturan.alternar} />
      </Panel>

      <Panel titulo="Configurados sin datos" extra={sinDatos.length ? plural(sinDatos.length, 'equipo', 'equipos') : 'ninguno'}>
        <Lectura>Están en el registro del campo, pero todavía no dan datos: es lo que falta por instrumentar. «Sin señal»: su instrumento está declarado y no da señal. «Sin instrumento»: falta montarlo y declarar su tag. Un clic lo ubica en el dibujo.</Lectura>
        {sinDatos.length === 0 && <p className="text-[14px] text-[var(--tinta2)]">Todo lo configurado captura datos.</p>}
        {listaSinDatos.visibles.map(filaSinDatos)}
        {listaSinDatos.resto.length > 0 && <div className="solo-impresion">{listaSinDatos.resto.map(filaSinDatos)}</div>}
        <VerMas ocultas={listaSinDatos.ocultas} abierto={listaSinDatos.abierto} onAlternar={listaSinDatos.alternar} />
        {sinDatos.length > 0 && rol.pantallas.includes('conectores') && (
          <Boton className="mt-2 w-full max-sm:min-h-11" onClick={() => setPantalla('conectores')}><Plug className="mr-1 inline size-3.5" aria-hidden />Conectores y tags</Boton>
        )}
      </Panel>
    </div>
  )


  return (
    <>
      {/* A-10 y A-11 (borrado.md): la tubería del campo va una vez, en el inicio de producción, y el aviso
          «Alarma · N detenidos» repetía la marca del campo. Aquí queda el nivel 2: el esquema y lo que captura datos. */}
      {/* En el teléfono el dibujo no se lee: primero las listas, y el dibujo a un clic. */}
      {estrecho ? (
        <>
          <div className="mb-3 rounded-[20px] bg-[var(--panel)] p-4">{cobertura}</div>
          {listas}
          <Desplegable titulo="Ver el esquema">{dibujo}</Desplegable>
        </>
      ) : <><div ref={refEsquema}>{dibujo}</div>{listas}</>}

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
    <div className="mb-3 sm:mb-4">
      <button onClick={() => setAbierto(v => !v)} aria-expanded={abierto}
        className="no-imprimir mb-2 flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[16px] bg-[var(--panel)] px-4 py-2 text-left text-[15px] hover:bg-[var(--panel2)]">
        <b className="flex-1 font-semibold">{titulo}</b>
        <span aria-hidden className={cn('text-[14px] text-[var(--tinta2)]', abierto && 'rotate-180')}>▾</span>
      </button>
      {imprimir && <b className="solo-impresion mb-1 text-[13px]">{titulo}</b>}
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
