import { useEffect, useRef, useState } from 'react'
import { X, ArrowRight, Check } from 'lucide-react'
import { useApp, useRol, usePersona } from '@/app/store'
import { useModal } from '@/shared/ui/foco'
import { PANTALLAS } from '@/app/pantallas'
import { pantallaVisible } from '@/shared/config/producto'
import { Boton, Chip } from '@/shared/ui/primitivas'
import { Info } from '@/shared/ui/Info'
import { cn } from '@/shared/lib/cn'

/** Para qué sirve cada pantalla, en unas ocho palabras. Es lo que ve
 *  alguien la primera vez que entra con un rol: no un tour, una presentación. */
const PARA_QUE: Record<string, string> = {
  bombas: 'Antes: vigía y partes que avisan. Durante: orden de cierre y tanque.',
  esp: 'Antes: qué ESP va a fallar y cuánto crudo arriesga.',
  trabajo: 'Qué está parado o avisa, y qué revisar.',
  mantenimiento: 'Antes: intervenir a tiempo. Después: palancas y partes que más costaron.',
  confiabilidad: 'Antes: aciertos del vigía. Después: MTBF, costo por falla, no repetir.',
  equipo: 'Por condición y barriles, con su historia del PLC.',
  produccion: 'Después: lo medido cada día, custodia y libro publicable.',
  pozos: 'Caudal de cada pozo, su origen y qué lo para.',
  turno: 'Durante: turno en curso e identificar. Antes: qué vigilar.',
  resumen: 'Retorno posible (tres palancas) y libro medido del período.',
  diferidos: 'Después: por qué, parte, palancas y si el mes se publica.',
  riesgo: 'Antes y Durante: a qué equipo ir hoy, en bbl y si falla hoy.',
  causa: 'Durante: identificar antes de arrancar (causa → SAP/ISO).',
  planta: 'Dónde está el problema. Gris es normal; color, anormal.',
  configuracion: 'Lo único que se escribe a mano, con firma.',
  conectores: 'Bordes conectados y tags sin equipo resuelto.',
  perfil: 'Avisos, apariencia y permisos.',
}

/** Lo mismo dicho para quien decide: lo que ve en su nivel, sin lo técnico. */
const PARA_QUE_DECISION: Record<string, string> = {
  resumen: 'Lo perdido, el retorno posible y a qué equipo ir.',
  diferidos: 'Mes a mes: a qué equipo y dónde bajar.',
  produccion: 'Cada día, contra lo posible y la meta.',
  riesgo: 'Qué se pierde ahora y qué va a fallar.',
  configuracion: 'Metas por campo (la global es la suma) y accesos.',
}

/** Qué es Trim, en tres renglones: lo mismo para todos los roles. */
const AYUDA_TRIM = 'Reduce paradas con Antes (vigía), Durante (identificar) y Después (no repetir). Al fallar cierran pozos; tanque y orden de cierre dan tiempo. Retorno simulado; libro medido (PLC, causa por barril).'

const AYUDA_PALANCAS = '1 Antes: vigía, riesgo, si falla hoy, aciertos, WhatsApp con ventana. 2 Durante: identificar, MTTR, orden TRIM (simulado). 3 Después: paretos, MTBF, libro publicable.'

/** Dos pasos: qué decide este rol (y qué es Trim), y sus pantallas, cada una
 *  con su para qué y a un toque. */
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
  const total = 2

  const irYCerrar = (id: string) => { setPantalla(id); cerrarOnboarding() }
  // Al pasar a la lista, el foco va a la primera pantalla: el botón de abajo
  // cambia de «Siguiente» a «Entrar…», y un segundo Enter se saltaba la lista
  // (y el lector no la oía).
  const primera = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (paso === 1) primera.current?.focus() }, [paso])

  return (
    <div ref={dialogo} tabIndex={-1} className="no-imprimir fixed inset-0 z-[160] flex items-center justify-center p-3 outline-none"
      role="dialog" aria-modal="true" aria-label="Introducción">
      {/* El fondo cierra con el ratón; con teclado, Escape o el botón «Cerrar». No es
          un botón: Tab no debe caer en algo sin nombre y oculto al lector. */}
      <div aria-hidden onClick={cerrarOnboarding} className="absolute inset-0 cursor-default bg-black/45" />
      <div className="relative flex max-h-full w-full max-w-[480px] flex-col overflow-hidden rounded border border-[var(--linea)] bg-[var(--superficie)] shadow-[var(--sombra2)]">
        <header className="flex shrink-0 items-start gap-2 border-b border-[var(--linea)] bg-[var(--panel)] px-3.5 py-3">
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

        <div className="min-h-0 overflow-y-auto p-4">
          {paso === 0 ? (
            <>
              {/* Lo que decide este rol: por eso ve lo que ve. */}
              <b className="block text-[16px] leading-snug">{rol.foco}</b>
              <p className="mt-3 flex flex-wrap items-center gap-2">
                <Info titulo="Qué es TRIM" texto={AYUDA_TRIM} />
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2">
                <Chip>1 Antes</Chip><Chip>2 Durante</Chip><Chip>3 Después</Chip>
                <Info titulo="Tres palancas" texto={AYUDA_PALANCAS} />
              </p>
            </>
          ) : (
            <>
              <p className="font-cond pb-1.5 text-[10px] font-semibold tracking-[.11em] text-[var(--tinta3)]">SUS PANTALLAS</p>
              {/* Cada una lleva a su pantalla y cierra la introducción. */}
              <div className="grid gap-1">
                {pantallas.map((id, i) => {
                  const p = PANTALLAS[id]!
                  return (
                    <button key={id} ref={i === 0 ? primera : undefined} onClick={() => irYCerrar(id)}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded border border-[var(--linea2)] bg-[var(--panel)] px-2.5 py-2 text-left hover:bg-[var(--elevado)]">
                      <p.icono className="size-4 shrink-0 opacity-70" />
                      <span className="min-w-0 flex-1">
                        <b className="block text-[12.5px] font-semibold leading-tight">{p.corto}</b>
                        <span className="block text-[11.5px] leading-snug text-[var(--tinta2)]">{(rol.nivel === 'decision' && PARA_QUE_DECISION[id]) || PARA_QUE[id]}</span>
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 text-[var(--tinta3)]" />
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-[var(--linea)] bg-[var(--panel)] px-3.5 py-2.5">
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
            <Boton variante="principal" onClick={() => setPaso(paso + 1)}>
              Siguiente<ArrowRight className="ml-1 inline size-3" />
            </Boton>
          )}
        </footer>
      </div>
    </div>
  )
}
