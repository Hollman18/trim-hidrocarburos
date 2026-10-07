import { useState } from 'react'
import { X, ArrowRight, Check } from 'lucide-react'
import { useApp, useRol, usePersona } from '@/app/store'
import { useModal } from '@/shared/ui/foco'
import { PANTALLAS } from '@/app/pantallas'
import { pantallaVisible } from '@/shared/config/producto'
import { Boton } from '@/shared/ui/primitivas'
import { cn } from '@/shared/lib/cn'

/** Para qué sirve cada pantalla, en una línea. Es lo que ve alguien la
 *  primera vez que entra con un rol: no un tour, una presentación. */
const PARA_QUE: Record<string, string> = {
  bombas: 'Las bombas de reinyección: cuáles están costando crudo, cuánto aguanta el tanque si una se para y en qué orden cerrar los pozos.',
  esp: 'Las electrosumergibles: cuál está por fallar, qué parte, y cuánto crudo pone en juego.',
  trabajo: 'Lo que está parado y qué se dañó, lo que avisa y qué revisar.',
  mantenimiento: 'Lo que hay que atacar para que el diferido de los equipos de alto impacto baje.',
  confiabilidad: 'Cada cuánto fallan las bombas y las electrosumergibles, de qué parte, y qué tan bien está registrada cada falla.',
  equipo: 'Los equipos de superficie ordenados por condición y por barriles, con su historia del PLC.',
  produccion: 'Cuánto salió cada día por el punto de medición oficial, contra el potencial de las pruebas y la meta.',
  pozos: 'Qué produce cada pozo, qué lo tiene parado y de dónde sale su caudal.',
  turno: 'Lo que deja el turno anterior y lo que usted entrega al siguiente.',
  resumen: 'Cuántos barriles no se produjeron, cuánto es de los equipos de alto impacto y si baja contra la meta.',
  diferidos: 'Por qué no se produjeron, a qué equipo y a qué parte se le cargan, y si el libro se puede publicar.',
  riesgo: 'A qué equipo ir hoy, ordenado por los barriles que cuesta cada uno.',
  causa: 'Las paradas que ninguna señal explica: qué se dañó, antes de arrancar.',
  planta: 'Dónde está el problema dentro del proceso. Gris es normal; el color es lo anormal.',
  configuracion: 'Lo único que se escribe a mano, con firma: metas y accesos (gerente), tanques, respaldos y programa de paradas (administrador).',
  conectores: 'Los bordes conectados y los tags que llegaron sin equipo resuelto.',
  perfil: 'Avisos, apariencia y permisos.',
}

/** Lo mismo dicho para quien decide: lo que ve en su nivel, sin lo técnico. */
const PARA_QUE_DECISION: Record<string, string> = {
  resumen: 'Cuántos barriles no se produjeron y cuánto valen, si va bien contra la meta, y quién se los lleva.',
  diferidos: 'Mes a mes, quién se lleva los barriles y dónde se puede bajar.',
  produccion: 'Cuánto salió cada día contra lo que se podía y contra la meta.',
  riesgo: 'Qué se está perdiendo ahora y qué equipo está por fallar.',
  bombas: 'Las bombas de reinyección: cuáles están paradas, cuánto cuestan y de qué fallan.',
  esp: 'Las electrosumergibles: cuáles fallaron, cuáles avisan y cuánto cuestan.',
  configuracion: 'Las metas de cada campo en barriles por día (la global es la suma) y quién tiene acceso a qué.',
}

const PROMESA = [
  ['Lo que hace Trim', 'Dice cuántos barriles se perdieron por cada bomba de reinyección y cada electrosumergible, por qué parte, y lo prueba.'],
  ['Por qué importa', 'Son los equipos que, cuando fallan, cierran pozos. Vigilar la parte que se daña es lo que deja intervenir antes.'],
  ['Cómo lo prueba', 'La hora la pone el sistema de control de cada equipo, cada barril trae su evento y su causa, y la conexión es de solo lectura.'],
] as const

export function Onboarding() {
  const rol = useRol()
  // La persona del registro de usuarios, la misma del menú de perfil: si el
  // gerente le pasó el rol a otra, la introducción saluda a la nueva.
  const persona = usePersona()
  const cerrarOnboarding = useApp(s => s.cerrarOnboarding), setPantalla = useApp(s => s.setPantalla), setComoSeLee = useApp(s => s.setComoSeLee)
  // Diálogo modal: el foco entra, Escape cierra y al cerrar vuelve a donde estaba.
  const dialogo = useModal<HTMLDivElement>(cerrarOnboarding)
  const [paso, setPaso] = useState(0)
  const pantallas = rol.pantallas.filter(pantallaVisible)
  const total = pantallas.length + 1

  const siguiente = () => (paso < total - 1 ? setPaso(paso + 1) : cerrarOnboarding())
  const irYCerrar = (id: string) => { setPantalla(id); cerrarOnboarding() }

  return (
    <div ref={dialogo} tabIndex={-1} className="no-imprimir fixed inset-0 z-[160] flex items-center justify-center p-3 outline-none"
      role="dialog" aria-modal="true" aria-label="Introducción">
      {/* El fondo cierra con el ratón; con teclado, Escape o el botón «Cerrar». */}
      <button aria-hidden tabIndex={-1} onClick={cerrarOnboarding} className="absolute inset-0 cursor-default bg-black/45" />
      <div className="relative flex w-full max-w-[520px] flex-col overflow-hidden rounded border border-[var(--linea)] bg-[var(--superficie)] shadow-[var(--sombra2)]">
        <header className="flex items-start gap-2 border-b border-[var(--linea)] bg-[var(--panel)] px-3.5 py-3">
          <span className="font-cond grid size-9 shrink-0 place-items-center rounded bg-marca-1 text-[13px] font-semibold text-white">
            {persona.iniciales}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[14px] leading-tight">{persona.nombre}</b>
            <small className="block text-[11px] text-[var(--tinta3)]">{rol.nombre}</small>
          </span>
          <button onClick={cerrarOnboarding} aria-label="Cerrar"
            className="cursor-pointer rounded border border-[var(--linea)] bg-[var(--panel)] p-1.5 hover:bg-[var(--elevado)]">
            <X className="size-3.5" />
          </button>
        </header>

        <div className="min-h-[190px] p-4">
          {paso === 0 ? (
            <>
              <b className="block text-[17px] leading-tight">{rol.foco}</b>
              <div className="mt-3 grid gap-2.5">
                {PROMESA.map(([q, v]) => (
                  <div key={q}>
                    <small className="font-cond block text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">
                      {q.toUpperCase()}
                    </small>
                    <span className="block text-[12.5px] leading-relaxed text-[var(--tinta2)]">{v}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (() => {
            const id = pantallas[paso - 1]!
            const p = PANTALLAS[id]!
            return (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded border border-[var(--linea)] bg-[var(--panel)]">
                    <p.icono className="size-5 opacity-80" />
                  </span>
                  <b className="text-[17px] leading-tight">{p.titulo}</b>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--tinta2)]">{(rol.nivel === 'decision' && PARA_QUE_DECISION[id]) || PARA_QUE[id]}</p>
                <Boton className="mt-3" onClick={() => irYCerrar(id)}>Ir a {p.corto}</Boton>
              </>
            )
          })()}
        </div>

        <footer className="flex items-center gap-2 border-t border-[var(--linea)] bg-[var(--panel)] px-3.5 py-2.5">
          <span className="flex flex-1 gap-1">
            {Array.from({ length: total }, (_, i) => (
              <i key={i} className={cn('h-1 flex-1 rounded-full',
                i <= paso ? 'bg-acento' : 'bg-[var(--linea)]')} />
            ))}
          </span>
          {paso === total - 1 ? (
            <Boton variante="principal" onClick={() => { setComoSeLee(true); cerrarOnboarding() }}>
              <Check className="mr-1 inline size-3" />Entrar con la lectura activada
            </Boton>
          ) : (
            <Boton variante="principal" onClick={siguiente}>
              Siguiente<ArrowRight className="ml-1 inline size-3" />
            </Boton>
          )}
        </footer>
      </div>
    </div>
  )
}
