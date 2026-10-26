import { useEffect, useMemo, useRef, useState } from 'react'
import { X, ArrowRight, Check, ChevronRight } from 'lucide-react'
import { useApp, useRol, usePersona, useAmbito } from '@/app/store'
import { useModal } from '@/shared/ui/foco'
import { PANTALLAS, GRUPOS, PUERTAS_DEL_ROL, enElMenu, fueraDePuertas } from '@/app/pantallas'
import { hayEquipo } from '@/app/grupos'
import { perfilDe } from '@/entities/configuracion'
import { pantallaVisible } from '@/shared/config/producto'
import { useSesion } from '@/shared/api/sesion'
import { Boton } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'

/** Para qué sirve cada puerta, en una frase de campo. Es lo que ve alguien la
 *  primera vez que entra con un rol: no un tour, una presentación. */
const PARA_QUE: Record<string, string> = {
  hoy: 'Lo que le toca hacer hoy, en una sola lista: confirmar, contestar y seguir.',
  plantaViva: 'Dónde se trabó el campo ahora y cuánto se deja de producir.',
  equipos: 'Cada equipo por su condición: qué está parado, qué avisa y qué vale más.',
  resultados: 'El período en barriles: diferido, producción, confiabilidad y mantenimiento.',
  reporte: 'El árbol de la circular de cada parada, con lo que va a la ANH.',
  configurar: 'Lo único que se escribe a mano, con firma: metas, tanques y conectores.',
  paradas: 'La línea de tiempo de cada parada, como evidencia.',
}

/** Qué es Trim, en tres renglones: lo mismo para todos los roles. */
const AYUDA_TRIM = 'Reduce paradas con Antes (vigía), Durante (identificar) y Después (no repetir). Al fallar cierran pozos; tanque y orden de cierre dan tiempo. Retorno simulado; libro medido (PLC, causa por barril).'

const AYUDA_MOMENTOS = 'Antes: vigía, riesgo, si falla hoy, aciertos, WhatsApp con ventana. Durante: identificar, MTTR, orden TRIM (simulado). Después: paretos, MTBF, libro publicable.'

/** Dos pasos con el aspecto de B: qué decide este rol (y qué es Trim), y sus
 *  puertas, cada una con su para qué y a un toque. */
export function Onboarding() {
  const rol = useRol()
  // La persona del registro de usuarios, la misma del menú de perfil: si el
  // gerente le pasó el rol a otra, la introducción saluda a la nueva.
  const persona = usePersona()
  const ambito = useAmbito(); const config = useSesion(s => s.ctx.config)
  const cerrarOnboarding = useApp(s => s.cerrarOnboarding), setPantalla = useApp(s => s.setPantalla), setComoSeLee = useApp(s => s.setComoSeLee)
  // Diálogo modal: el foco entra, Escape cierra y al cerrar vuelve a donde estaba.
  const dialogo = useModal<HTMLDivElement>(cerrarOnboarding)
  const [paso, setPaso] = useState(0)
  const total = 2

  // Las puertas del rol con lo que tienen para este campo, en el mismo orden del panel.
  const puertas = useMemo(() => {
    const perfiles = ambito.campos.map(c => perfilDe(config, c.id))
    return (PUERTAS_DEL_ROL[rol.id] ?? []).flatMap(g => {
      const subs = GRUPOS[g]!.miembros.filter(x => rol.pantallas.includes(x) && pantallaVisible(x) && hayEquipo(x, perfiles))
      if (!subs.length) return []
      const destino = rol.pantallas.find(p => subs.includes(p)) ?? subs[0]!
      return [{ id: g, corto: GRUPOS[g]!.corto, icono: GRUPOS[g]!.icono, destino, subs: subs.filter(enElMenu).map(s => PANTALLAS[s]!.corto) }]
    })
  }, [rol, ambito.campos, config])
  const fuera = fueraDePuertas(rol).filter(pantallaVisible)

  const irYCerrar = (id: string) => { setPantalla(id); cerrarOnboarding() }
  // Al pasar a la lista, el foco va a la primera puerta: el botón de abajo
  // cambia de «Siguiente» a «Entrar…», y un segundo Enter se saltaba la lista
  // (y el lector no la oía).
  const primera = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (paso === 1) primera.current?.focus() }, [paso])

  return (
    <div ref={dialogo} tabIndex={-1} className="no-imprimir fixed inset-0 z-[160] flex items-center justify-center p-3 outline-none"
      role="dialog" aria-modal="true" aria-label="Introducción">
      {/* El fondo cierra con el ratón; con teclado, Escape o el botón «Cerrar». No es
          un botón: Tab no debe caer en algo sin nombre y oculto al lector. */}
      <div aria-hidden onClick={cerrarOnboarding} className="aparece absolute inset-0 cursor-default bg-[rgb(10_12_16/.45)]" />
      <div className="relative flex max-h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[20px] bg-[var(--panel)] shadow-[var(--sombra-flota)]">
        {/* La banda índigo de B, con la persona. */}
        <header className="flex shrink-0 items-center gap-3 bg-[var(--marca)] px-5 py-4 text-white">
          <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-[var(--marca-capa)] text-[15px] font-semibold">
            {persona.iniciales}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[17px] font-semibold leading-tight">{persona.nombre}</b>
            <small className="block text-[14px] text-[var(--marca-tenue)]">{rol.nombre}</small>
          </span>
          <button onClick={cerrarOnboarding} aria-label="Cerrar"
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-[var(--marca-tenue)] hover:bg-white/[.10] hover:text-white">
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
          {paso === 0 ? (
            <>
              {/* Lo que decide este rol: por eso ve lo que ve. */}
              <p className="text-[14px] font-medium text-[var(--tinta2)]">Lo que usted decide</p>
              <p className="mt-1 text-[20px] font-medium leading-snug">{rol.foco}</p>
              <p className="mt-4 flex flex-wrap items-center gap-2 text-[15px] text-[var(--tinta2)]">
                Qué es TRIM <Info titulo="Qué es TRIM" texto={AYUDA_TRIM} />
              </p>
              {/* Los tres momentos, sin los números 1, 2 y 3: son de las prioridades (X2 F4). */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-grid grid-flow-col gap-1 rounded-full bg-[var(--panel2)] p-1 shadow-[inset_0_0_0_1px_var(--linea)]">
                  {['Antes', 'Durante', 'Después'].map(m => (
                    <span key={m} className="rounded-full px-3.5 py-1.5 text-[15px] font-semibold">{m}</span>
                  ))}
                </span>
                <Info titulo="Antes · Durante · Después" texto={AYUDA_MOMENTOS} />
              </div>
            </>
          ) : (
            <>
              <p className="pb-2 text-[14px] font-medium text-[var(--tinta2)]">Sus puertas, en el panel de la izquierda</p>
              {/* Cada una lleva a su puerta y cierra la introducción. */}
              <div className="flex flex-col">
                {puertas.map((p, i) => (
                  <button key={p.id} ref={i === 0 ? primera : undefined} onClick={() => irYCerrar(p.destino)}
                    className="flex min-h-16 w-full cursor-pointer items-center gap-3.5 border-t border-[var(--linea2)] py-3 text-left first:border-t-0 hover:bg-[var(--panel2)]/60">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--marca-suave)] text-[var(--tinta)]"><p.icono className="size-[22px]" /></span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-[16px] font-semibold leading-tight">{p.corto}</b>
                      <span className="block text-[14px] leading-snug text-[var(--tinta2)]">{PARA_QUE[p.id]}</span>
                      {p.subs.length > 1 && <span className="mt-0.5 block text-[13px] text-[var(--tinta2)]">Adentro: {p.subs.join(' · ')}</span>}
                    </span>
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--tinta3)]" />
                  </button>
                ))}
              </div>
              {fuera.length > 0 && (
                <p className="mt-3 text-[14px] text-[var(--tinta2)]">
                  En su menú, abajo a la izquierda: {fuera.map(f => (rol.id === 'ger' && f === 'configuracion' ? 'Metas y accesos' : PANTALLAS[f]!.corto)).join(' · ')}.
                </p>
              )}
            </>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[var(--linea2)] px-5 py-3.5">
          <span className="flex min-w-16 flex-1 gap-1.5" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <i key={i} className={cn('h-1.5 flex-1 rounded-full', i <= paso ? 'bg-[var(--primario)]' : 'bg-[var(--pista)]')} />
            ))}
          </span>
          {paso === total - 1 ? (
            <Boton variante="principal" onClick={() => { setComoSeLee(true); cerrarOnboarding() }}>
              <Check className="size-4" />Entrar con la lectura activada
            </Boton>
          ) : (
            <Boton variante="principal" onClick={() => setPaso(paso + 1)}>
              Siguiente<ArrowRight className="size-4" />
            </Boton>
          )}
        </footer>
      </div>
    </div>
  )
}
